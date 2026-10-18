// Minimal Canonical Score Model for the spike: drum-only, notation-level.
// Every measure / event / hit carries a stable ID that never gets reused.

export type Inst =
  | 'kick' | 'snare' | 'hhClosed' | 'hhOpen' | 'hhPedal'
  | 'ride' | 'crash' | 'tomHigh' | 'tomMid' | 'tomFloor';

export type NoteValue = 4 | 8 | 16 | 32;

export interface Hit {
  id: string;
  inst: Inst;
  ghost?: boolean;
  accent?: boolean;
}

export interface Ev {
  id: string;
  value: NoteValue;
  tuplet?: { num: number; den: number };
  rest?: boolean;
  /** Grace notes played just before this event: flam = 1 grace, drag = 2 graces. */
  grace?: 'flam' | 'drag';
  sticking?: 'R' | 'L';
  hits: Hit[];
}

export interface Voice {
  id: string;
  events: Ev[];
}

export interface Measure {
  id: string;
  /** Voice 1: hands, stems up. */
  hands: Voice;
  /** Voice 2: feet, stems down. */
  feet: Voice;
}

export interface Score {
  id: string;
  title: string;
  timeSig: [number, number];
  tempo: number;
  /** Fixed line breaks: number of measures on each system. Sum equals measures.length. */
  systems: number[];
  measures: Measure[];
}

export const TICKS_PER_QUARTER = 960;

export function eventTicks(ev: Ev): number {
  const base = (TICKS_PER_QUARTER * 4) / ev.value;
  return ev.tuplet ? (base * ev.tuplet.den) / ev.tuplet.num : base;
}

export function measureTicks(score: Score): number {
  const [num, den] = score.timeSig;
  return (TICKS_PER_QUARTER * 4 * num) / den;
}

/** Start tick of every event of a voice, relative to the measure start. */
export function eventStarts(voice: Voice): number[] {
  const starts: number[] = [];
  let t = 0;
  for (const ev of voice.events) {
    starts.push(t);
    t += eventTicks(ev);
  }
  return starts;
}

export function voiceIsFull(score: Score, voice: Voice): boolean {
  const total = voice.events.reduce((s, ev) => s + eventTicks(ev), 0);
  return Math.abs(total - measureTicks(score)) < 1e-6;
}

// ---------- systems (fixed line breaks) ----------

export interface SystemRange {
  index: number;
  start: number; // measure index, inclusive
  count: number;
}

export function systemRanges(score: Score): SystemRange[] {
  const out: SystemRange[] = [];
  let start = 0;
  score.systems.forEach((count, index) => {
    out.push({ index, start, count });
    start += count;
  });
  return out;
}

export function systemOfMeasure(score: Score, measureIndex: number): SystemRange {
  for (const r of systemRanges(score)) {
    if (measureIndex >= r.start && measureIndex < r.start + r.count) return r;
  }
  throw new Error(`measure ${measureIndex} is outside every system`);
}

// ---------- hashing ----------

/** cyrb53: fast, non-cryptographic 53-bit string hash. */
export function hashString(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** JSON with sorted keys, so equal content always hashes equally. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

const hashCache = new WeakMap<Measure, string>();

/**
 * Content hash of a measure. IDs are part of the content: a re-created event counts as a change.
 * Measures are treated as immutable (applyPatch clones what it touches), so the hash is memoised per object.
 */
export function measureHash(m: Measure): string {
  let h = hashCache.get(m);
  if (h === undefined) {
    h = hashString(stableStringify(m));
    hashCache.set(m, h);
  }
  return h;
}

// ---------- diff ----------

export interface BeatDiff {
  measureId: string;
  measureIndex: number;
  /** 0-based quarter-note beat inside the measure. */
  beat: number;
  before: Ev[];
  after: Ev[];
}

export interface ScoreDiff {
  added: string[];
  removed: string[];
  changed: string[];
  beats: BeatDiff[];
}

/** Events (both voices) whose onset falls inside each quarter-note beat. */
function eventsByBeat(m: Measure): Map<number, Ev[]> {
  const out = new Map<number, Ev[]>();
  for (const voice of [m.hands, m.feet]) {
    const starts = eventStarts(voice);
    voice.events.forEach((ev, i) => {
      const beat = Math.floor(starts[i] / TICKS_PER_QUARTER + 1e-9);
      const list = out.get(beat) ?? [];
      list.push(ev);
      out.set(beat, list);
    });
  }
  return out;
}

/** Longest common subsequence over measure IDs → pairs of [beforeIndex, afterIndex]. */
function alignIds(a: string[], b: string[]): Array<[number, number]> {
  const n = a.length;
  const m = b.length;
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const pairs: Array<[number, number]> = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return pairs;
}

export function diffScores(before: Score, after: Score): ScoreDiff {
  const aIds = before.measures.map((m) => m.id);
  const bIds = after.measures.map((m) => m.id);
  // Fast path: same measure sequence (the common case for edits) skips the O(n·m) LCS.
  const sameSeq = aIds.length === bIds.length && aIds.every((id, i) => id === bIds[i]);
  const pairs: Array<[number, number]> = sameSeq ? aIds.map((_, i) => [i, i]) : alignIds(aIds, bIds);

  const matchedA = new Set(pairs.map((p) => p[0]));
  const matchedB = new Set(pairs.map((p) => p[1]));
  const diff: ScoreDiff = {
    removed: aIds.filter((_, i) => !matchedA.has(i)),
    added: bIds.filter((_, i) => !matchedB.has(i)),
    changed: [],
    beats: [],
  };

  for (const [ai, bi] of pairs) {
    const ma = before.measures[ai];
    const mb = after.measures[bi];
    // Same object → untouched by the patch (like React's === bail-out); otherwise compare content.
    if (ma === mb || measureHash(ma) === measureHash(mb)) continue;
    diff.changed.push(mb.id);
    const beatsA = eventsByBeat(ma);
    const beatsB = eventsByBeat(mb);
    const beatCount = Math.max(...beatsA.keys(), ...beatsB.keys()) + 1;
    for (let beat = 0; beat < beatCount; beat++) {
      const evA = beatsA.get(beat) ?? [];
      const evB = beatsB.get(beat) ?? [];
      if (hashString(stableStringify(evA)) !== hashString(stableStringify(evB))) {
        diff.beats.push({ measureId: mb.id, measureIndex: bi, beat, before: evA, after: evB });
      }
    }
  }
  return diff;
}

// ---------- ID-addressed patches ----------

export type PatchOp =
  /** Replace every event of `voice` whose onset is inside quarter `beat` with `events`. */
  | { op: 'replaceBeat'; measureId: string; voice: 'hands' | 'feet'; beat: number; events: Ev[] }
  | { op: 'setHit'; hitId: string; hit: Partial<Omit<Hit, 'id'>> };

export interface PatchResult {
  score: Score;
  /** IDs of measures whose content changed. */
  dirty: string[];
}

function cloneMeasure(m: Measure): Measure {
  return structuredClone(m);
}

/** Applies ops immutably: untouched measures keep their object identity (cheap cache checks). */
export function applyPatch(score: Score, ops: PatchOp[]): PatchResult {
  const measures = score.measures.slice();
  const dirty = new Set<string>();
  const indexById = new Map(measures.map((m, i) => [m.id, i] as const));

  for (const op of ops) {
    if (op.op === 'replaceBeat') {
      const idx = indexById.get(op.measureId);
      if (idx === undefined) throw new Error(`unknown measure ${op.measureId}`);
      const m = cloneMeasure(measures[idx]);
      const voice = m[op.voice];
      const starts = eventStarts(voice);
      const lo = op.beat * TICKS_PER_QUARTER;
      const hi = lo + TICKS_PER_QUARTER;
      const first = starts.findIndex((t) => t >= lo - 1e-9);
      let last = first;
      while (last < voice.events.length && starts[last] < hi - 1e-9) last++;
      if (first < 0 || first === last) throw new Error(`no events in beat ${op.beat} of ${op.measureId}`);
      voice.events.splice(first, last - first, ...op.events);
      if (!voiceIsFull(score, voice)) throw new Error(`patch breaks the duration of ${op.measureId}`);
      measures[idx] = m;
      dirty.add(m.id);
    } else {
      let found = false;
      for (let i = 0; i < measures.length && !found; i++) {
        for (const voice of [measures[i].hands, measures[i].feet]) {
          for (const ev of voice.events) {
            const hit = ev.hits.find((h) => h.id === op.hitId);
            if (!hit) continue;
            const m = cloneMeasure(measures[i]);
            const target = [m.hands, m.feet]
              .flatMap((v) => v.events)
              .flatMap((e) => e.hits)
              .find((h) => h.id === op.hitId)!;
            Object.assign(target, op.hit);
            measures[i] = m;
            dirty.add(m.id);
            found = true;
            break;
          }
          if (found) break;
        }
      }
      if (!found) throw new Error(`unknown hit ${op.hitId}`);
    }
  }
  return { score: { ...score, measures }, dirty: [...dirty] };
}
