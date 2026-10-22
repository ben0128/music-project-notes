// CSM → MEI. Our IDs become xml:id, so Verovio's SVG carries them verbatim.
import { TICKS_PER_QUARTER, eventStarts, type Ev, type Hit, type Inst, type Measure, type Score } from '../csm.js';

export type OpenHatStyle = 'o-above' | 'circle-x';

interface Pos {
  pname: string;
  oct: number;
  head?: string;
}

const POS: Record<Inst, Pos> = {
  kick: { pname: 'f', oct: 4 },
  snare: { pname: 'c', oct: 5 },
  hhClosed: { pname: 'g', oct: 5, head: 'x' },
  hhOpen: { pname: 'g', oct: 5, head: 'x' },
  hhPedal: { pname: 'd', oct: 4, head: 'x' },
  ride: { pname: 'f', oct: 5, head: 'x' },
  crash: { pname: 'a', oct: 5, head: 'x' },
  tomHigh: { pname: 'e', oct: 5 },
  tomMid: { pname: 'd', oct: 5 },
  tomFloor: { pname: 'a', oct: 4 },
};

export interface MeiOptions {
  openHat?: OpenHatStyle;
  /** Hide the time signature (systems rendered in isolation after the first). */
  hideMeter?: boolean;
  /** Emit <sb/> between systems (full-score rendering). */
  systemBreaks?: boolean;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function noteXml(hit: Hit, opts: MeiOptions, stem: string, extra = ''): string {
  const p = POS[hit.inst];
  let head = p.head ? ` head.shape="${p.head}"` : '';
  let child = '';
  if (hit.inst === 'hhOpen') {
    if (opts.openHat === 'circle-x') head = ' head.shape="U+E0B3"';
    else child = '<artic artic="open" place="above"/>';
  }
  const ghost = hit.ghost ? ' head.mod="paren"' : '';
  const attrs = `xml:id="${hit.id}" pname="${p.pname}" oct="${p.oct}"${head}${ghost}${stem}${extra}`;
  return child ? `<note ${attrs}>${child}</note>` : `<note ${attrs}/>`;
}

function graceXml(ev: Ev): string {
  if (!ev.grace || ev.hits.length === 0) return '';
  const inst = ev.hits[0].inst;
  const p = POS[inst];
  const head = p.head ? ` head.shape="${p.head}"` : '';
  if (ev.grace === 'flam') {
    return `<note xml:id="${ev.id}g0" grace="acc" dur="8" pname="${p.pname}" oct="${p.oct}"${head} stem.dir="up"/>`;
  }
  const g = (k: number) => `<note xml:id="${ev.id}g${k}" grace="unacc" dur="16" pname="${p.pname}" oct="${p.oct}"${head} stem.dir="up"/>`;
  return `<beam>${g(0)}${g(1)}</beam>`;
}

function eventXml(ev: Ev, opts: MeiOptions, stemDir: 'up' | 'down', color: string): string {
  const col = color ? ` color="${color}"` : '';
  if (ev.rest) return `<rest xml:id="${ev.id}" dur="${ev.value}"${col}/>`;
  const accent = ev.hits.some((h) => h.accent) ? ' artic="acc"' : '';
  const notes = ev.hits.map((h) => noteXml(h, opts, '', col)).join('');
  return `${graceXml(ev)}<chord xml:id="${ev.id}" dur="${ev.value}" stem.dir="${stemDir}"${accent}${col}>${notes}</chord>`;
}

/**
 * One <layer>. Events are grouped per quarter beat: beamable values share a <beam>,
 * tuplets wrap their beam. `hiddenBeats` turns whole beats into invisible <space>.
 */
function layerXml(n: number, events: Ev[], starts: number[], opts: MeiOptions, color: string, hiddenBeats?: Set<number>): string {
  const stem = n === 1 ? 'up' : 'down';
  const byBeat = new Map<number, Ev[]>();
  events.forEach((ev, i) => {
    const beat = Math.floor(starts[i] / TICKS_PER_QUARTER + 1e-9);
    const list = byBeat.get(beat) ?? [];
    list.push(ev);
    byBeat.set(beat, list);
  });
  const beats = [...byBeat.keys()].sort((a, b) => a - b);
  let out = '';
  for (const beat of beats) {
    const group = byBeat.get(beat)!;
    if (hiddenBeats?.has(beat)) {
      out += `<space dur="4"/>`;
      continue;
    }
    // Split the beat into runs: [tuplet-run | beamable-run | single].
    let i = 0;
    while (i < group.length) {
      const ev = group[i];
      const beamable = !ev.rest && ev.value >= 8;
      if (!beamable) {
        out += eventXml(ev, opts, stem, color);
        i++;
        continue;
      }
      let j = i;
      while (j < group.length && !group[j].rest && group[j].value >= 8 && !!group[j].tuplet === !!ev.tuplet) j++;
      const run = group.slice(i, j);
      const lead = graceXml(run[0]);
      const body = run.map((e, k) => (k === 0 ? eventXml({ ...e, grace: undefined }, opts, stem, color) : eventXml(e, opts, stem, color))).join('');
      const beam = run.length > 1 ? `<beam>${body}</beam>` : body;
      out += lead + (ev.tuplet ? `<tuplet num="${ev.tuplet.num}" numbase="${ev.tuplet.den}" bracket.visible="false">${beam}</tuplet>` : beam);
      i = j;
    }
  }
  return `<layer n="${n}">${out}</layer>`;
}

function stickingXml(m: Measure): string {
  return [m.hands, m.feet]
    .flatMap((v) => v.events)
    .filter((ev) => ev.sticking)
    .map((ev) => `<fing staff="1" startid="#${ev.id}" place="below">${ev.sticking}</fing>`)
    .join('');
}

export function measureXml(m: Measure, opts: MeiOptions, staffN = 1, color = '', hiddenBeats?: Set<number>): string {
  const hands = layerXml(1, m.hands.events, eventStarts(m.hands), opts, color, hiddenBeats);
  const feet = layerXml(2, m.feet.events, eventStarts(m.feet), opts, color, hiddenBeats);
  return `<staff n="${staffN}">${hands}${feet}</staff>`;
}

function wrap(scoreDef: string, sectionBody: string, title: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<mei xmlns="http://www.music-encoding.org/ns/mei" meiversion="5.1">` +
    `<meiHead><fileDesc><titleStmt><title>${esc(title)}</title></titleStmt><pubStmt/></fileDesc></meiHead>` +
    `<music><body><mdiv><score>${scoreDef}<section>${sectionBody}</section></score></mdiv></body></music></mei>`
  );
}

function scoreDefXml(score: Score, hideMeter: boolean, staves: Array<{ n: number; label?: string }>): string {
  const [num, den] = score.timeSig;
  const meter = hideMeter ? ' meter.visible="false"' : '';
  const defs = staves
    .map((s) => `<staffDef n="${s.n}" lines="5" clef.shape="perc">${s.label ? `<label>${esc(s.label)}</label>` : ''}</staffDef>`)
    .join('');
  return `<scoreDef meter.count="${num}" meter.unit="${den}"${meter}><staffGrp>${defs}</staffGrp></scoreDef>`;
}

/** MEI for measures [start, start+count). Measure numbers stay global. */
export function toMei(score: Score, start = 0, count = score.measures.length, opts: MeiOptions = {}): string {
  let body = '';
  let systemStart = 0;
  const breaks = new Set<number>();
  for (const len of score.systems) {
    breaks.add(systemStart);
    systemStart += len;
  }
  for (let i = start; i < start + count; i++) {
    const m = score.measures[i];
    if (opts.systemBreaks && i !== start && breaks.has(i)) body += '<sb/>';
    body += `<measure xml:id="${m.id}" n="${i + 1}">${measureXml(m, opts)}${stickingXml(m)}</measure>`;
  }
  return wrap(scoreDefXml(score, !!opts.hideMeter, [{ n: 1 }]), body, score.title);
}

/**
 * Diff preview (mockup): staff 1 = "before" in grey, only the changed beats are drawn;
 * staff 2 = "after". Both staves share measures, so Verovio aligns them in time.
 */
export function toDiffPreviewMei(
  before: Score,
  after: Score,
  start: number,
  count: number,
  changedBeats: Map<string, Set<number>>,
  opts: MeiOptions = {},
): string {
  let body = '';
  for (let i = start; i < start + count; i++) {
    const a = after.measures[i];
    const b = before.measures.find((m) => m.id === a.id) ?? a;
    const changed = changedBeats.get(a.id) ?? new Set<number>();
    const hidden = new Set([0, 1, 2, 3].filter((beat) => !changed.has(beat)));
    // The "before" staff uses its own IDs space: suffix so they never collide with "after".
    const beforeXml = measureXml(suffixIds(b, '_b'), opts, 1, '#9a9a9a', hidden);
    const afterXml = measureXml(a, opts, 2);
    body += `<measure xml:id="${a.id}" n="${i + 1}">${beforeXml}${afterXml}${stickingXml(a).replaceAll('staff="1"', 'staff="2"')}</measure>`;
  }
  return wrap(scoreDefXml(after, false, [{ n: 1, label: '修改前' }, { n: 2, label: '修改後' }]), body, after.title);
}

function suffixIds(m: Measure, suffix: string): Measure {
  const voice = (v: Measure['hands']) => ({
    id: v.id + suffix,
    events: v.events.map((e) => ({ ...e, id: e.id + suffix, hits: e.hits.map((h) => ({ ...h, id: h.id + suffix })) })),
  });
  return { id: m.id + suffix, hands: voice(m.hands), feet: voice(m.feet) };
}
