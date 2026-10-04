# Verovio vs alphaTab：多平台路線下的引擎評估與大型樂譜增量更新（2026-10）

> 調查日期：2026-10-04
> 前一份研究：`research/frontend-tech-2026-10.md` [71]
> 路線（使用者更新）：
> - 編輯器：先做 macOS，之後做 Windows。
> - 唯讀檢視器：Web、iPadOS、iOS；之後可能做 Android。
> - 引擎二選一：Verovio 或 alphaTab。
> - AI 改動以 beat 級「修改前／修改後」呈現 [70]。
>
> 方法：
> - 以一手來源為主：官方文件、API reference、原始碼、CHANGELOG、issue／PR、套件 registry。
> - 另外在本機做了一次小規模 pilot 量測 [67]：兩個引擎的檔案從 jsDelivr 下載到暫存資料夾，用 Node 執行，沒有安裝任何套件，也沒有動到專案檔。
>
> 標記：**（次級）**＝第三方來源；**未驗證**＝找不到可靠來源或沒有實測；**評估**＝本文的判斷。授權的部分全部屬於評估，不是法律意見。

---

## 結論摘要（TL;DR）

- **路線改了以後，「一份 TS 核心＋引擎跑在各平台的 web runtime」反而更站得住**（評估）。現在有五個目標（Mac 編輯器、Windows 編輯器、Web、iPad、iOS），但兩個引擎都沒有一條在五個平台都原生的路：
  - alphaTab 沒有 Apple 原生版本，原生 iOS 計畫在 2023-12 宣布暫停 [2]。
  - Verovio 有原生 C++／Swift，但只輸出 SVG [3]。Apple 和 Windows 的原生端還是得處理 SVG 顯示；Direct2D 的 SVG 不支援 `<text>`、`<style>` [8]。
  - 所以最省工、也最能保證譜面一致的做法是：各平台的殼層（Swift、WebView2 宿主）保持很薄，排版和編輯邏輯都放在 WKWebView、WebView2 或瀏覽器裡的同一份程式。
- **兩個引擎都沒有「改一拍就只重排那一拍」的穩定 API。**
  - alphaTab：model 改動不會被偵測，要呼叫 `render()` 全量重排。官方自己說這是「quite performance intense」[20]。但它有幾個能減輕負擔的機制：
    - lazy partial：只把畫面內的部分放進 DOM [21]
    - worker 渲染 [22]
    - `startBar`／`barCount` 只排一段範圍 [23]
    - `UseModelLayout` 可以固定每一行放幾個小節 [26]
  - Verovio：載入（`loadData`）時就做全量排版 [16][10]。它提供：
    - 以頁為單位的 `renderToSVG(page)` [10]
    - `select` 只排指定的小節範圍 [13]
    - experimental 的 `edit()`：commit 時只重排「焦點頁範圍」[14][15]；官方標示「experimental code not to rely on」[10]
- **本機 pilot（Node 24、Apple M2、合成鼓譜）[67]**：

  | 情境 | alphaTab | Verovio |
  |---|---|---|
  | 500 小節，改一拍後全量重排 | 約 51 ms | 重新 `loadData`＋畫該頁約 440 ms |
  | 500 小節，experimental `edit`＋commit＋畫該頁 | — | 約 128 ms |
  | 16 小節獨立文件 | — | 約 30 ms |
  | 180 小節（約 6 分鐘鼓譜），改一拍後重排 | 約 23 ms | 約 190 ms |

  資料本身（雜湊和 diff）不是瓶頸：500 小節逐小節算雜湊只要 2.6 ms [67]。
- **穩定 ID**：
  - Verovio 會把 MEI 的 `xml:id` 原樣寫成 SVG 的 `id` [6][7]，`getElementsAtTime` 也回傳同一組 ID [67]。所以只要我們自己產生 MEI，`score.json` 的 ID 就能直接拿來做點擊判定、diff 高亮和播放游標。
  - alphaTab 的 Beat／Note `id` 是全域遞增計數器 [32]，SVG 也不帶元素 ID [67]。我們得自己維護「model 物件 ↔ 我們的 ID」對照表，高亮則靠 `boundsLookup` 畫 overlay [27]。
- **鼓譜（2026-10-04 重查）**：
  - alphaTab：
    - 有 GP 系的打擊樂 articulation（每個 articulation 可設 notehead、線位、technique symbol）[34][35]，ghost note 以括號顯示 [33]，也支援倚音和 tuplet [33]。
    - 原始碼裡**沒有 sticking 相關實作**。
    - open hi-hat 預設是 circle-x notehead（GP 慣例）[35]。
    - alphaTex 不能自訂 articulation [36]，但用程式建 model 可以 [34]。
  - Verovio：
    - `head.shape` 可以直接填 SMuFL codepoint [51]，MEI 也有 `<fing>`／`<dir>` 可以放 sticking [55]。
    - 但三角 notehead 還是壞的（#4451 未修）[51]，circle-x 的 MusicXML 修正也還沒發行 [5]。
- **擴充與播放**：
  - 吉他 tab 是 alphaTab 的老本行 [1]；鋼琴和古典排版是 Verovio 的強項 [3]。
  - alphaTab 內建 SF2 合成器、游標，1.6 起還能和外部音訊同步 [1][39]。
  - Verovio 只提供 MIDI 和 timemap，合成器要自己準備 [50]。在 Apple 原生端可以把 MIDI 交給 `AVAudioSequencer` [60]。
- **建議（評估）**：
  - 架構維持「TS 核心＋web runtime 引擎」。
  - 引擎**預設偏向 alphaTab**，理由是重排快、體積小、播放現成、鼓和吉他的資料模型完整、原始碼是 TS 可以自己改。
  - 是否定案，由兩週 spike 的五個關卡決定（見 §9）：sticking、open hi-hat 慣例、diff「修改前」列、500 小節改一拍的延遲、ID 對應。
  - 如果 sticking、open hi-hat 慣例或 diff「修改前」列這三項卡住，就改用 Verovio：以「自己產生帶穩定 ID 的 MEI」為核心，大檔用分塊（chunk）處理。

---

## 1. 平台矩陣

| 目標 | Verovio | alphaTab |
|---|---|---|
| **Mac 編輯器** | (1) WASM 跑在 WKWebView 裡，和 Web 是同一份程式。(2) 原生 Swift Package，macOS 11+，透過 C wrapper 接到 Swift [4]；但輸出是 SVG 字串，還是要有 SVG 顯示層 | 只能 JS 跑在 WKWebView 裡。沒有 macOS 原生版本；原生 iOS 計畫已暫停 [2] |
| **Windows 編輯器** | (1) WASM 跑在 WebView2 裡 [9]。(2) 原生 C++：AppVeyor 用 Visual Studio 2022 建置 [46]，PyPI 也有 win_amd64 wheel [47]。**沒有官方 .NET binding**（NuGet 搜不到）[48]。原生顯示 SVG 可以用 WebView2，或 Direct2D 但功能受限（見下方） | (1) JS 跑在 WebView2 裡。(2) 原生 .NET：`AlphaTab`（.NET Standard 2.0）＋`AlphaTab.Windows`（net8.0-windows，WPF／WinForms 控制項，依賴 NAudio 和 AlphaSkia.Native.Windows），1.8.4 [43][44]。走原生 .NET 的話，App 核心就得用 C# 重寫一份（評估） |
| **Web 檢視器** | WASM toolkit，`verovio-toolkit-wasm.js` gzip 後 2.34 MB [68] | JS，`alphaTab.min.js` gzip 後 279 KB，另外加字型和 SF2 [68] |
| **iPadOS／iOS 檢視器** | (1) WASM 在 WKWebView 裡。(2) Swift Package（iOS 16+）[4]。RISM 自家的「Verovio MEI Viewer」已經上架 App Store（iOS 18.5+，1.3 版，2026-03-02）[49] | JS 在 WKWebView 裡。官方 2023-12-31 宣布暫停原生 iOS（Kotlin/Native 路線）[2] |
| **Android（之後）** | 有 Java binding 和官方 Android demo [3] | 原生 Kotlin `AlphaTabView`，Maven `net.alphatab:alphaTab` 1.8.4 [45] |
| **輸出特性** | SVG。glyph 以 `<defs>` 裡的 `<path>` 加上 `<use>` 參照，不依賴字型；小節號等文字用 `<text>` [67] | SVG（或 .NET／Android 的點陣圖）。音樂符號是 `<text>` 搭配 CSS `@font-face` 載入的音樂字型 [30][67] |

**SVG 在各原生平台怎麼顯示**

- **Apple**：
  - WKWebView 是官方路徑 [59]。
  - 沒有找到 Apple 公開的「執行期解析任意 SVG」API（**未驗證**）。
  - 第三方的 SwiftDraw（Zlib 授權，0.29.0，2026-07）可以在 SwiftUI／UIKit／AppKit 原生畫 SVG [58]，但它能不能正確畫出 Verovio 的 SVG **未驗證**。
- **Windows**：
  - WebView2 用 Edge（Chromium）當渲染引擎，支援 Win32 C/C++、.NET、WinUI 2／3 [9]。
  - Direct2D 從 Windows 10 Creators Update 起能畫獨立的 SVG，但只支援表列的元素和屬性。`<use>`、`<path>`、`<g>`、`<defs>` 在表上，`<text>`、`<style>`、`<symbol>` 不在；不支援的元素會被忽略 [8]。所以 Verovio SVG 的小節號這類 `<text>` 會消失（評估，未實測）。
  - alphaTab 在 Windows 可以直接用 .NET 原生 renderer，不需要經過 SVG [43]。

---

## 2. 大型樂譜與增量更新（核心問題）

### 2.1 引擎原生能力對照

| 能力 | Verovio 6.3.0 | alphaTab 1.8.4 |
|---|---|---|
| 載入 | `loadData(string)`：MEI、MusicXML、Humdrum 等 [10]。2014 年論文寫明「layout 在載入時執行」[16] | `ScoreLoader.loadScoreFromBytes`、`AlphaTexImporter`，或用程式建 model 後呼叫 `score.finish()` [29][31] |
| 資料改動後重排 | 一般做法是重新 `loadData`（全量）。`redoLayout()` 也是全量重排，用在頁寬、縮放改變時，可帶 `resetCache` [10]。`redoPagePitchPosLayout()` 只重算「目前頁」音符的垂直位置 [10] | **沒有局部重排**。model 改動不會被偵測，要呼叫 `render()`，等於全量重新排版和繪製 [19][20] |
| 實驗性編輯 API | `edit()`、`editInfo()` 標示「experimental code not to rely on」[10]。動作有 set、delete、insert、drag、insertNote、undo、redo、commit 等 [14]。`commit` 會執行 `PrepareData`＋`RefreshLayout`；設定了 focus 時，只對焦點頁範圍（目前頁，加上跨頁 spanning 元素所在的頁）做 `LayOutAll` [14][15]。這個 focus 機制在 2025-03 加入（commit log）[15] | 無 |
| 只畫看得到的部分 | 以頁為單位：`renderToSVG(pageNo)` [10] | lazy loading（0.9.6 起，預設開啟）：把譜切成 partial，只把畫面內的 partial 加進 DOM [21]。`partialLayoutFinished` 之後再呼叫 `renderResult(id)`，就能延後繪製 [29][30]。每個 partial 預設 10 個小節（`barCountPerPartial`）[24] |
| 只排一段範圍 | `select({measureRange})`：在下一次 load 或 `redoLayout` 時生效，頁數會縮成選取範圍需要的頁數 [10][13] | `display.startBar`、`display.barCount` [23] |
| 固定換行 | `breaks` 可選 none、auto、line、smart、encoded [11]。none＝整份譜排成單一系統，SVG 可能非常大 [12]；encoded＝依 MEI 裡的 `<sb>`／`<pb>` 換行 [11][55] | `barsPerRow` [25]；`systemsLayoutMode` 設成 UseModelLayout 時，照 `track.systemsLayout` 陣列決定每行幾個小節 [26] |
| 背景執行 | WASM 可以放進 Web Worker（評估，未實測）；6.3.0 修了多執行緒環境的 bug [5] | `core.useWorkers` 預設開啟，在 worker 裡渲染 [22]；低階的 `ScoreRenderer` 本身不含 worker，`AlphaTabApi` 才會包一層 [29] |
| 元素 ID | SVG 的 `id`＝MEI 的 `xml:id`，`class`＝MEI 元素名稱，樹狀結構也保留 [6][7]。另有 `xmlIdSeed`、`xmlIdChecksum`（讓自動產生的 ID 可重現）、`svgHtml5`（輸出 `data-id`）[11] | Beat、Note、Bar 的 `id` 都是全域遞增的計數器（`Beat._globalBeatId++`）[32][33]。SVG 沒有元素 ID [67] |
| 點擊判定、幾何 | `svgBoundingBoxes` 選項；`getPageWithElement`、`getElementAttr` [10][11] | `boundsLookup`（1.5.0 起）：staffSystems → masterBars → bars → beats → notes，提供 `getBeatAtPos`、`getNoteAtPos`；音符層級要開 `includeNoteBounds`（預設關閉）[27][28] |
| 高亮、上色 | 直接用 CSS 依 ID 改 SVG，不用重新渲染 [7] | style 物件（1.5.0 起），可設在 score、track、bar、beat、note 各層；但要 `render()` 全量重繪才會生效 [20]。也可以用 `boundsLookup` 的座標自己畫 overlay，不用重排（評估） |
| 播放游標 | `renderToTimemap`、`getElementsAtTime(ms)`、`getTimesForElement` [10] | 內建 player 事件：`playedBeatChanged`、`activeBeatsChanged`、`playerPositionChanged` [41] |

### 2.2 官方公開的效能數字

- **Verovio**：
  - 2014 年論文：一份 120 頁、7 MB 的 MEI，「載入＋顯示第一頁」原生 0.657 s；Firefox 1.054 s、Chrome 1.364 s、Safari 1.811 s（當時是 asm.js）[16]。
  - 2021 年 PR #2351（CLI，輸出全部頁）[17]：

    | 曲目 | 大小 | 時間 |
    |---|---|---|
    | Beethoven | 1.1 MB、10 頁 | 475 ms |
    | Hummel | 5.7 MB、128 頁 | 3.94 s |
    | Holst《The Planets》 | 50.1 MB、403 頁 | 1 分 56 秒 |

  - 2026-07 的 PR #4342：22 份完整總譜輸出全部頁，從 10.91 s 降到 7.95 s（快了 27%）[18]。
- **alphaTab**：沒有找到官方數字。2026-06 的 perf PR #2751 沒有附數據 [57]。

### 2.3 本次 pilot 實測 [67]

**環境**：Apple M2、macOS 27.2、Node v24.15.0；Verovio 6.3.0 WASM（npm 版）、alphaTab 1.8.4 ESM（npm 版），都從 jsDelivr 下載。

**合成譜**：4/4 拍，每小節 8 個八分音符 hi-hat，第 2、4 拍加 snare，第 1、3 拍 kick，每 8 小節在第 4 拍加一組六連音 snare。

- Verovio 用兩個 layer（手、腳），所有 measure、chord、kick 都帶我們指定的 `xml:id`。
- alphaTab 用 alphaTex，單一聲部，以和弦表示同時敲擊。

| 項目 | 180 小節 | 500 小節 | 2000 小節 |
|---|---|---|---|
| **Verovio** 輸入（MEI，含 ID） | 202 KB | 563 KB | 2,268 KB |
| `loadData`（解析＋全量排版） | 216 ms | 482–492 ms | 1,904 ms |
| `renderToSVG` 單頁（scale 40，每頁約 511 KB） | 約 31 ms | 約 31 ms | 約 30 ms |
| 改一拍：重新 `loadData`＋畫該頁 | 189 ms | 440–446 ms | 1,871 ms |
| experimental `edit(set)`＋commit＋畫該頁 | — | 第一次 247–252 ms，之後約 128 ms（set 11 ms＋commit 107 ms＋render 10 ms） | — |
| `redoLayout`（改頁寬） | 147 ms | 380 ms | 1,665 ms |
| `select` 9 小節＋`redoLayout`＋render | — | 98 ms | — |
| 16 小節的獨立文件，load＋render | 約 30 ms | 約 30 ms | 約 31 ms |
| `breaks=none`（單一系統） | 121 ms／1.8 MB SVG | 338–427 ms／4.9 MB | 1,835 ms／19.8 MB |
| timemap／MIDI／`getElementsAtTime` | — | 232 ms／11.5 ms／0.4 ms | — |
| **alphaTab** 輸入（alphaTex） | 30 KB | 84 KB | — |
| alphaTex 解析成 Score | 16 ms | 31–32 ms | 99 ms |
| `renderScore` 全量（排版＋所有 partial 的 SVG） | 53 ms | 93–102 ms（168 個 partial，1.9 MB） | 233 ms |
| 只排版、不繪製（lazy） | — | 42–46 ms | 122 ms |
| 改一拍：直接改 model＋`score.finish()`＋全量 `renderScore` | 23 ms | 51 ms | 232 ms |
| 改一拍：重新 import alphaTex＋全量 | — | 83 ms | 222 ms |
| `startBar`／`barCount` 只排 9 小節 | — | 0.8 ms | — |
| horizontal layout 全量 | — | 121 ms | 2,184 ms（明顯非線性） |

**注意事項**

1. 只量了引擎端的時間，沒有包含 DOM 插入、瀏覽器繪製，也不是在 WKWebView 或 WebView2 裡跑。
2. 兩邊的編碼不完全對等：Verovio 是兩個 layer，alphaTab 是單一聲部。
3. alphaTab 在 Node 裡沒有載入真正的字型量測，瀏覽器裡的數字可能不同。
4. 多數項目只跑了 1–2 次。
5. Verovio 的 `edit` 只試了 set 和 delete，而且這個 API 官方標示為 experimental [10]。

所以這組數字只能看數量級，正式結論要等 §9 的 spike。

### 2.4 對我們的意義（評估）

- **Mac 編輯器的連續輸入**：
  - alphaTab 在 180–500 小節時全量重排只要 20–50 ms，可以簡單地「每次編輯都全量重排」。
  - Verovio 在 500 小節要約 0.45 s，連續打字會明顯卡頓，得另外處理：分塊、`edit` API，或在 worker 裡算、先顯示舊圖。
- **套用 AI patch（一次性動作）**：兩者都可以接受。
- **Web／iPad 檢視器（載入一次，之後只畫看得到的頁）**：
  - Verovio：約 0.2–0.5 s，之後每頁約 31 ms。
  - alphaTab：約 0.1 s。

---

## 3. Canonical Score Model 怎麼餵進引擎

**Verovio：我們寫一個 CSM → MEI 的產生器（TS）**

- **ID 完全可控**：`<measure>`、`<chord>`、`<note>` 的 `xml:id` 直接用 `score.json` 的 ID，SVG 和 `getElementsAtTime` 都會原樣帶出來 [6][67]。
- **MEI 能表達的東西**：
  - 聲部：`layer`
  - 連音：`tuplet`
  - 倚音：grace notes
  - notehead：`@head.shape` 可以直接填 SMuFL codepoint；#4436 就是用 `head.shape="U+E0B3"` 來畫 circle-x [51]。`@head.mod="circle"` 從 2025-04 起支援 [52]
  - 運指／sticking：`<fing>` [55]
  - 文字指示：`<dir>` [55]
  - 空白：`<space>`，預設不顯示，`showHidden` 才會畫出來 [11][55]
  - 換行：`<sb>` [55]
- **成本**：MEI 的巢狀結構（beam、tuplet、layer）很嚴格，產生器屬中等複雜度（評估）。
- **增量更新**：
  - 每次改動重新產生 MEI 字串很快，瓶頸在 `loadData`。
  - 分塊的話，只要重新產生 dirty chunk 的 MEI。
- **為什麼不直接用 MusicXML**：雖然 commit 時本來就會產生 `score.musicxml`，但 Verovio 的 MusicXML 匯入器在 2026 年仍持續修正 [5]，ID 對應也沒有 MEI 直接（評估）。

**alphaTab：兩條路**

- **(a) 用程式建 Score**：JS 和 .NET 用的是同一套 model；建完要呼叫 `score.finish()` [31][33]。官方提醒「Direct modification of this data model is usually not easily possible」[31]。
- **(b) 產生 alphaTex 字串**，再交給 `AlphaTexImporter` [29]。但 alphaTex 不能自訂 articulation [36]。
- **ID**：我們建 model 的同時，自己維護 `Map<Beat|Note, ourId>`，因為原生 id 是全域計數器 [32]。
- **增量更新**：可以直接改 model，然後 `finish()`＋`render()`。pilot 在 500 小節約 51 ms [67]，但每次都是全量排版。

---

## 4. 鼓譜準備度（2026-10-04 重查）

| 項目 | Verovio | alphaTab |
|---|---|---|
| x、circle-x 等 notehead | x：支援。circle-x：MEI 用 `head.shape="U+E0B3"` 或 `head.mod="circle"` [51][52]；MusicXML 的 circle-x 映射修正列在 6.3.0 之後的 unreleased [5] | 每個 articulation 都能依時值指定 notehead [34]；預設表裡有 XBlack、CircleX、CircleSlash 等 [35] |
| 三角（cowbell） | `isotriangle`／`rtriangle` 仍畫成一般 notehead（#4451，2026-09-24 開，尚未修）；預設字型 Leipzig 也沒有三角 glyph [51] | 預設表裡有 `NoteheadTriangleUp` 系列 [35] |
| hi-hat 開／關 | 可以用 SMuFL glyph 或指示記號表達，實際呈現**未驗證** | closed＝`NoteheadXBlack`、half＝`NoteheadCircleSlash`、open＝`NoteheadCircleX`（GP 慣例）[35]。要改成「x＋上方 o」得自訂 articulation（technique symbol）[34]，只能用程式建 model，alphaTex 做不到 [36]；字型 enum 裡有沒有需要的 glyph **未驗證** |
| ghost note（括號） | MEI 的 notehead 修飾（`head.mod`）能不能畫括號**未驗證** | `Note.isGhost`：以括號顯示，音量也會小一點 [33] |
| flam、drag | grace notes；MIDI 也會輸出 grace [5] | `GraceType` 有 BeforeBeat、OnBeat [33] |
| 六連音等 tuplet | 支援（官方 SVG 結構範例裡就有 tuplet）[6]；pilot 的六連音正常產出 [67] | 支援 `tupletNumerator` 等屬性 [33]；pilot 的 `{tu 6}` 正常產出 [67] |
| 兩聲部（手上腳下） | 多個 `layer` [6]；休止符位置的品質**未實測** | 多聲部支援；「讓使用者控制休止符位置」在 1.9.0 milestone 已完成（#2572，2026-07-03 關閉），但 1.9 還沒正式發行 [38][44] |
| sticking（R／L） | 可以用 MEI `<fing>` 或 `<dir>` 表達 [55]，Verovio 有處理 fingering 的排版 [5]；鼓譜上的實際效果**未實測** | **沒有對應功能**（原始碼搜尋「sticking」是 0 筆）；可以用 `Beat.text` 文字註記權充 [33]（評估） |
| 打擊樂的 MIDI | unpitched 用 `midi-unpitched` 對應 MIDI 鍵的修正在 2026-10-01 才合併，尚未發行 [53] | articulation 的 `outputMidiNumber` [34] |
| 吉他 tab | MEI 5.1 tablature，2026 年持續修正（例如 `tab.staff-like`）[5] | 核心功能；GP8 相容 96% [1][37] |
| 鋼琴大譜表 | 核心（MEI／CMN 起家）[3] | 支援 [1] |

---

## 5. 播放與游標同步

| 平台 | Verovio | alphaTab |
|---|---|---|
| Web | `renderToMIDI()`（base64 MIDI）＋自己準備 SF2 合成器（官方教學用 MIDIjs）[50]；游標用 `getElementsAtTime(ms)` 或 timemap [10] | 內建 alphaSynth（MIDI＋SoundFont2，走 Web Audio）[1]、player 事件與游標 [41]；1.6 起能和外部音訊或影片同步（sync points）[39][40] |
| Mac／iOS（WKWebView） | 同 Web；也可以改走原生：`AVAudioSequencer.load(from: Data)` 吃 Verovio 的 MIDI，搭配 `AVAudioUnitSampler`（SF2／DLS），用 `currentPositionInSeconds` 對照 timemap 找出目前的元素 ID [60][61][10] | 同 Web（WKWebView 裡的 Web Audio）；也可以用低階的 `MidiFileGenerator` 產生 MIDI 交給原生端 [29]（評估） |
| Windows | WebView2 同 Web；原生 C++ 要自己接 MIDI 合成（**未驗證**） | WebView2 同 Web；.NET 原生走 NAudio [44] |
| Android（之後） | 自己接 | Kotlin 原生（AudioTrack）[1] |

alphaTab 的外部音訊同步（sync points）[39]，剛好可以拿來對齊使用者自己的錄音和 Klangio 轉出來的譜（評估）。

---

## 6. 依散布管道看授權（全部是評估，不是法律意見）

| 散布管道 | Verovio（LGPL-3.0） | alphaTab（MPL-2.0） |
|---|---|---|
| Web：JS／WASM 檔傳到瀏覽器 | 屬於散布 object code。WASM 是獨立檔案，使用者可以自行替換，接近 §4(d)(1)「共用函式庫機制」的精神；另外附上授權文字並提供原始碼 [62] | 要告知使用者如何取得 Covered Software 的原始碼；Executable 可以用其他條款散布 [64] |
| Mac／iOS App，JS／WASM 打包在 bundle 裡、由 WKWebView 載入 | 同上（仍是獨立檔案） | 同上 |
| iOS／Mac App，原生靜態連結 Swift Package | 適用 §4(d)(0)：提供 Minimal Corresponding Source 和可重新連結的 Application Code [62]。整個 App 都開源的話就自然滿足。§4(e) 的 Installation Information 只在 GPL §6 的「User Product」交易情境（連同裝置一起轉移）才需要 [62][63]；一般 App Store 下載不屬於這種情況 | 只要公開 MPL 檔案本身；我們自己的檔案可以用任何授權（Larger Work，§3.3）[64] |
| 將來如果 iOS 檢視器閉源 | 還是可行，但要提供可重新連結的 object files，實務上麻煩 | 比較省事：只有改到 alphaTab 檔案時，那些檔案要開源 [64] |
| App Store 條款 | Apple 的 Standard EULA 對「開源元件的授權條款」有例外，開發者也可以改用自訂 EULA [65]。Verovio 作者自家的 App 已經上架 [49]，但他們是著作權人，不能代表第三方的情況 | 同左（Standard EULA 的例外條款）[65] |
| Microsoft Store 或直接下載安裝 | 直接下載沒有額外問題；Microsoft Store 的政策**未查證** | 同左 |

iOS 檢視器另外要注意 App Review Guidelines [66]：

- 4.2：App 不能只是「repackaged website」。
- 2.5.2：App 必須 self-contained，不能下載會改變功能的程式碼。

所以 viewer 的 JS／WASM 要打包進 App，不能從網路載入；也要加上原生功能（離線曲庫、Files 整合、原生播放等）（評估）。

---

## 7. 我們自己的增量更新設計（評估，但以上述事實和量測為基礎）

### 7.1 `score.json`

- **穩定 ID**：小節、聲部、事件各有一個短 ID（例如 base36 或 ULID），一旦產生就不重用。Klangio 的第一個 commit 就配好 ID。
- **格式**：
  - 頂層 key 固定順序。
  - `measures` 陣列一個小節一行（每行是 compact JSON），git diff 就自然以小節為單位，衝突也只會落在單一小節。
  - pilot 以這個格式估算的大小 [67]：

    | 規模 | 事件數 | JSON | gzip |
    |---|---|---|---|
    | 180 小節，八分音符 hi-hat | 2,160 | 163 KB | 8 KB |
    | 180 小節，十六分音符 hi-hat | 3,600 | 273 KB | 14 KB |
    | 500 小節，十六分音符 hi-hat | 10,000 | 759 KB | 39 KB |
    | 1000 小節，十六分音符 hi-hat | 20,000 | 1.5 MB | 77 KB |

  - parse 只要 1–7 ms。
- **檔案大小上限**：GitHub contents API 在 1 MB 以內功能完整；1–100 MB 只能用 raw 或 object media type；超過 100 MB 不支援 [69]。所以單檔最好控制在 1 MB 以下。
- **要不要分檔**：鼓譜一般不需要。鋼琴或總譜可以依段落或聲部拆檔。

### 7.2 用 ID 定址的 Patch

- 操作包括 `insertEvent`、`deleteEvent`、`setEvent`、`insertMeasure`、`deleteMeasure`、`setMeasure` 等。
- 每個操作都回傳受影響的小節 ID（dirty set）。
- AI 產生的 patch 也只能引用 ID，驗證規則就簡單很多。

### 7.3 不靠文字 diff 的版本比較

1. 對每個小節的 canonical JSON 算雜湊（pilot：500 小節算完只要 2.6 ms）[67]。
2. 用 ID 序列對齊兩個版本的小節：新增和刪除用小型 LCS 找出來；同一個 ID 但雜湊不同，就是「有改動」。
3. 有改動的小節裡，把事件依拍分組，對每一拍再算一次雜湊，得到 beat 級的 diff。這和 mockup 的單位一致：「修改前」只出現在被改的拍 [70]。
4. 輸出格式：`{measureId, beat, before[], after[]}`。

### 7.4 重排範圍、快取、虛擬化

- **換行連鎖**：如果換行是自動決定的，某個小節變寬就可能把後面的小節推到下一行，一路影響到譜尾。
- **對策：把換行固定住**。
  - Verovio：`breaks: encoded`，由我們產生 `<sb/>` [11][55]。
  - alphaTab：`systemsLayoutMode = UseModelLayout` 配合 `track.systemsLayout`，或用 `barsPerRow` [26][25]。
  - 平常編輯時不重新換行，等使用者要求或閒置時再整份重排。
- **alphaTab 的做法**：每次都全量排版（快），搭配 lazy partial，只畫看得到的部分 [21]。對照表在重建 model 時一併重建；`render` 之後重新從 `boundsLookup` 算出 overlay 的方框（beat 的 realBounds 正好對應 mockup 的「有改動的拍」淺色底框）[27]。
- **Verovio 的做法**：
  - (i) 中小型譜：在 worker 裡全量重新載入，新圖好了之前先顯示舊圖。
  - (ii) 大型譜：分塊。每塊是 16–32 個小節（數個系統）的獨立 toolkit instance，搭配 encoded breaks，只重畫 dirty 的那一塊（pilot 每塊約 30 ms）[67]。代價是要處理跨塊的 tie、slur、beam，系統寬度要一致，頁碼要接續。
  - (iii) `edit()` 有 focus 局部重排 [15]，但官方標示 experimental [10]，不建議依賴。
- **快取**：每個系統或每一頁的渲染結果，以「（所含小節的雜湊）＋排版選項＋引擎版本」當 key。
- **虛擬化**：Verovio 只 render 看得到的頁 [10]；alphaTab 用 lazy loading [21]。iPad 檢視器用頁為單位翻頁。
- **diff 預覽**（只畫「有改動的小節 ±1」這段，例如 mockup 的第 3–6 小節）：
  - Verovio：另外產生一份兩個 staff 的 MEI。「修改前」staff 在沒改的拍放 `<space>`（預設不會畫出來）[11][55]，時間對齊由引擎處理；再用 CSS 依 ID 把它設成灰色 [7]。
  - alphaTab：用 `startBar`／`barCount`（pilot 9 小節 0.8 ms）[23][67]，把兩個 track 一起排。「修改前」track 沒改的拍放休止符，再把 `BeatSubElement.StandardNotationRests` 設成透明 [20]（Color 支不支援 alpha **未驗證**）。

### 7.5 「大」到底多大

- 6 分鐘、120 BPM、4/4 拍＝180 小節，事件數約 2,000–3,600（評估＋pilot）[67]。
- 鼓譜的「大」：400–1,000 小節（長篇前衛搖滾、現場組曲），JSON 0.75–1.5 MB。
- 鋼琴：常見上萬個音符。
- 總譜：可以到 Holst 那種規模（MEI 50 MB、403 頁）[17]。

---

## 8. 比較表與建議

| 面向 | Verovio | alphaTab | 評估 |
|---|---|---|---|
| Mac 編輯器 | WKWebView＋WASM；或原生 Swift Package，但仍要顯示 SVG [4] | 只能 WKWebView＋JS [2] | 平手（兩者實際上都走 WebView） |
| Windows 編輯器 | WebView2＋WASM；原生 C++ 可行，但沒有 .NET binding [46][48]；Direct2D SVG 支援受限 [8] | WebView2＋JS；或原生 .NET WPF／WinForms [43][44] | alphaTab 略勝（多一條原生路線，但要重寫核心） |
| Web 檢視器 | gzip 2.34 MB [68]；載入 0.2–0.5 s（鼓譜規模）[67] | gzip 279 KB [68]；約 0.1 s [67] | alphaTab |
| iOS／iPad 檢視器 | WKWebView 或 Swift Package [4]；有官方 App 先例 [49] | WKWebView [2] | Verovio 略勝（有原生選項） |
| diff 與增量更新 | 穩定 ID 直通 SVG [6]、diff 預覽可用 `<space>` 對齊；但重排慢，要分塊 [67] | 全量重排快、lazy partial [21][67]；但 ID 和高亮要自己做對照與 overlay [27][32] | 各有一半：ID 和 diff 呈現 Verovio 勝，速度 alphaTab 勝 |
| 鼓譜品質 | notehead 可指定任意 SMuFL codepoint、MEI 能放 sticking [51][55]；但打擊樂修正尚未發行、三角 notehead 壞的 [5][51] | GP 系打擊樂模型、ghost、倚音 [33][34][35]；沒有 sticking、open hi-hat 是 GP 慣例 [35] | 待 spike 決定 |
| 擴充：吉他 | tab 還在改進 [5] | 核心強項 [1][37] | alphaTab |
| 擴充：鋼琴 | 核心強項 [3] | 支援 [1] | Verovio |
| 授權 | LGPL：WebView 散布容易，靜態連結要能重新連結 [62] | MPL：只限檔案層級的 copyleft，任何管道都容易 [64] | alphaTab 略勝 |
| 開發者適配（強 TS、會一點 Swift） | C++ 核心，要修 bug 得寫 C++；TS 型別定義在 2026-09-25 合併，尚未發行 [54] | TS 原始碼，可以讀、改、送 PR [1] | alphaTab |
| 維護活躍度 | 6.3.0（2026-08-19）[3]；近 6 個月 393 個 commit，主要作者 lpugin 242 個，另有多位貢獻者 [56] | 1.8.4（2026-07-05）[1]，1.9.0 alpha 已上 NuGet [44]；近 6 個月 147 個 commit（大量是 bot），人工 commit 幾乎都來自 Danielku15（44／約 49）[56] | Verovio（bus factor 較低風險） |

### 建議（評估）

**1. 架構**

- 維持並強化前一份研究的 (b)：一份 TS 核心，包含 CSM、Patch、Diff、引擎 adapter、diff 預覽、viewer，跑在每個平台的 web runtime 裡 [71]。
- 各平台的殼層：

  | 平台 | 殼層 |
  |---|---|
  | Mac | Swift＋WKWebView（現在） |
  | Windows | 之後再選 WebView2 宿主：WinUI 3、WPF 或 Tauri |
  | iOS／iPad | Swift＋WKWebView；資源打包在 App 裡 [66] |
  | Android | 之後再說 |

- 商業邏輯不要放在 Swift 或 C#，Windows 的殼層才能保持很薄。
- 這個結論在新路線下更強：五個目標裡，兩個引擎都只有 web runtime 是共同的路 [2][8][9]。

**2. 引擎：預設偏向 alphaTab，以 spike 的五個關卡定案**

偏向 alphaTab 的理由：

- 以鼓譜的規模，每次都全量重排也夠快 [67]。
- 檢視器的下載量小 [68]。
- 播放、游標、外部音訊同步都是現成的 [39]。
- 鼓和吉他的資料模型完整 [34][35]。
- 原始碼是 TS，缺的功能可以自己補或回饋上游；MPL 只要求修改過的檔案開源 [64]。

需要我們自己補的：

- ID 對照表和 overlay 高亮（`boundsLookup`）[27]
- sticking 的呈現
- hi-hat 的記譜慣例

**改用 Verovio 的條件**：spike 的關卡 G1（sticking 和 open hi-hat）或 G3（diff「修改前」列）做不到，而且沒辦法用小幅修改 alphaTab 解決。屆時以「CSM → 自己產生帶穩定 ID 的 MEI」為核心，大檔用分塊，播放在 Apple 上走原生 `AVAudioSequencer`，Web 另外接合成器。

**不建議：**

- 兩個引擎混用（例如 diff 預覽用 Verovio、主譜用 alphaTab）：譜面一定會不一致。
- 依賴 Verovio 的 `edit()`：官方標示 experimental [10]。

---

## 9. Spike 計畫（約 2 週，兩個引擎用同一套測試框架）

**第 1–2 天：準備**

- 寫合成 CSM 產生器，產出 180、500、2000 小節三種規模，內容包括：兩聲部鼓組、六連音和 32 分音符、flam、drag、ghost、accent、open／closed hi-hat、choke、R／L sticking。
- 寫兩個 adapter：CSM → MEI、CSM → alphaTab model。兩邊都要維護 ID 對照。

**測試項目**

| # | 測試 | 怎麼量、通過條件（門檻是評估值） |
|---|---|---|
| T1 | **大檔改一拍** | 500 小節，改第 251 小節的一拍。量「patch 套用 → 新畫面畫完」：(a) Mac WKWebView、(b) iPad WKWebView、(c) Chrome（代替 WebView2）。各取 50 次的 p50／p95、主執行緒長任務、記憶體。通過：Mac p95 < 100 ms，iPad p95 < 250 ms |
| T2 | 連續輸入 | 2 秒內連續 20 次編輯，不能出現超過 200 ms 的卡頓 |
| T3 | 換行連鎖 | 讓某個小節變寬，確認固定換行後不會一路推到譜尾 |
| T4 | **diff 預覽**（照 mockup [70]） | 第 3–6 小節；「修改前」列只出現在被改的拍，時間對齊、灰色；淺色底框；「接受／還原這一拍」後重畫的成本 |
| T5 | 鼓譜清單 | 請鼓手看截圖逐項確認：x、circle-x、三角、open hi-hat 的 o、ghost 括號、flam、drag、六連音、兩聲部的休止符、R／L、accent |
| T6 | ID | 點擊能取得我們的 eventId；播放游標回報我們的 eventId；AI patch 能正確高亮 |
| T7 | 播放 | Web 和 WKWebView 用同一個 SF2 鼓組；量延遲，以及 6 分鐘曲子的游標漂移 |
| T8 | iPad 冷啟動 | bundle 大小；180、500 小節的第一頁出現時間 |
| T9 | Windows | 同一份 bundle 放進 WebView2（或先用 Chrome 代替）比對截圖 |
| T10 | 匯入匯出 | MusicXML 匯出後再匯入；Klangio 輸出轉成 CSM 再渲染 |

**決策規則**

| 關卡 | 內容 |
|---|---|
| G1 | sticking 和 open hi-hat 的呈現（T5） |
| G2 | T1 的延遲門檻 |
| G3 | diff 預覽（T4） |
| G4 | ID 對應（T6） |
| G5 | iPad 冷啟動（T8） |

- alphaTab 通過 G1–G5，就採用 alphaTab。
- G1 或 G3 失敗，而且修改 alphaTab 的成本超過 3 天，就改用 Verovio。這時要確認 Verovio 也通過 G1、G3、G4，並以分塊方式達到 G2。

---

## 10. 未能驗證／需要再確認的項目

1. **alphaTab 的鼓譜細節**：
   - sticking 該怎麼呈現（`Beat.text` 能不能放在音符下方、對齊得好不好）
   - MusicFontSymbol 裡有沒有「上方 o」這類 glyph，能不能做出自訂 articulation
   - `Color` 支不支援 alpha（diff 預覽要讓休止符透明）
2. **alphaTab 在瀏覽器、WKWebView 和 iPad 上的實際重排時間**：pilot 是在 Node 裡跑，沒有真正的字型量測，也沒有繪製。
3. **Verovio 的鼓譜細節**：
   - `head.mod` 畫括號（ghost）、`<fing>`／`<dir>` 當 sticking 的實際效果
   - open hi-hat 的記號
   - 兩聲部休止符的位置
   - 三角 notehead 什麼時候修（#4451）
   - circle-x 和 unpitched MIDI 的修正何時正式發行
4. **Verovio WASM 能不能跑在 Web Worker 裡**，以及在 WKWebView 裡的實際時間。
5. **Verovio SVG 在原生端的顯示**：SwiftDraw 的相容度；Direct2D 畫 Verovio SVG 的實際效果。Apple 是否有公開的執行期 SVG API 也未查到。
6. **Verovio 的分塊做法**：跨塊的 tie、slur、beam、系統寬度一致性都沒實測。
7. **Verovio `edit()` 未來是否穩定**：目前官方標示 experimental。
8. **Windows 原生 MIDI 合成方案**（如果 Verovio 走原生 C++）：沒有查。
9. **Microsoft Store 的開源授權政策**：沒有查。
10. **LGPL 在 iOS 靜態連結時的實際合規做法**：屬於評估，需要律師確認。
11. **alphaSynth 能不能直接播放外部的 SMF MIDI 檔**（例如拿來播 Verovio 產生的 MIDI）：沒有查證。
12. **alphaTab 1.9 的正式發行時間和內容**：目前只看到 milestone 和 NuGet 上的 alpha 版。

---

## 11. 來源清單（全部存取於 2026-10-04）

1. alphaTab repo（README、LICENSE、v1.8.4 release）— https://github.com/CoderLine/alphaTab
2. alphaTab #1333 Announcement: Native iOS Version（2023-12-31）— https://github.com/CoderLine/alphaTab/issues/1333
3. Verovio repo（README、COPYING、COPYING.LESSER、version-6.3.0 release）— https://github.com/rism-digital/verovio
4. Verovio `Package.swift`、`Verovio.podspec` — https://github.com/rism-digital/verovio/blob/develop/Package.swift ；https://github.com/rism-digital/verovio/blob/develop/Verovio.podspec
5. Verovio CHANGELOG — https://github.com/rism-digital/verovio/blob/develop/CHANGELOG.md
6. Verovio Book：Internal structure（SVG structure）— https://book.verovio.org/advanced-topics/internal-structure.html
7. Verovio Book：CSS and SVG — https://book.verovio.org/interactive-notation/css-and-svg.html
8. Microsoft Learn：Direct2D SVG Support — https://learn.microsoft.com/en-us/windows/win32/direct2d/svg-support
9. Microsoft Learn：Introduction to Microsoft Edge WebView2 — https://learn.microsoft.com/en-us/microsoft-edge/webview2/
10. Verovio Book：Toolkit methods — https://book.verovio.org/toolkit-reference/toolkit-methods.html
11. Verovio Book：Toolkit options — https://book.verovio.org/toolkit-reference/toolkit-options.html
12. Verovio Book：Layout options — https://book.verovio.org/advanced-topics/layout-options.html
13. Verovio Book：Score content selection — https://book.verovio.org/interactive-notation/content-selection.html
14. Verovio 原始碼：`src/editortoolkit_shared.cpp`、`src/editortoolkit_cmn.cpp` — https://github.com/rism-digital/verovio/blob/develop/src/editortoolkit_shared.cpp
15. Verovio 原始碼：`Doc::RefreshLayout`／`Doc::SetFocus`（`src/doc.cpp`）、`PageRange::SetAsFocus`（`src/pages.cpp`），以及 2025-03 的「doc focus」commits — https://github.com/rism-digital/verovio/blob/develop/src/doc.cpp ；https://github.com/rism-digital/verovio/blob/develop/src/pages.cpp
16. Pugin, Zitellini, Roland：Verovio: A Library for Engraving MEI Music Notation into SVG（ISMIR 2014）— https://archives.ismir.net/ismir2014/paper/000221.pdf
17. Verovio PR #2351 Improve performance（2021）— https://github.com/rism-digital/verovio/pull/2351
18. Verovio PR #4342 Improve render performance（2026-07）— https://github.com/rism-digital/verovio/pull/4342
19. alphaTab API：render — https://alphatab.net/docs/reference/api/render
20. alphaTab Guide：Coloring Music Sheet — https://alphatab.net/docs/guides/coloring
21. alphaTab Settings：core.enableLazyLoading — https://alphatab.net/docs/reference/settings/core/enablelazyloading
22. alphaTab Settings：core.useWorkers — https://alphatab.net/docs/reference/settings/core/useworkers
23. alphaTab Settings：display.startBar、display.barCount — https://alphatab.net/docs/reference/settings/display/startbar ；https://alphatab.net/docs/reference/settings/display/barcount
24. alphaTab Settings：display.barCountPerPartial — https://alphatab.net/docs/reference/settings/display/barcountperpartial
25. alphaTab Settings：display.barsPerRow — https://alphatab.net/docs/reference/settings/display/barsperrow
26. alphaTab Settings：display.systemsLayoutMode — https://alphatab.net/docs/reference/settings/display/systemslayoutmode
27. alphaTab API：boundsLookup — https://alphatab.net/docs/reference/api/boundslookup
28. alphaTab Settings：core.includeNoteBounds — https://alphatab.net/docs/reference/settings/core/includenotebounds
29. alphaTab Guide：Low Level APIs — https://alphatab.net/docs/guides/lowlevel-apis
30. alphaTab Guide：Node.js — https://alphatab.net/docs/guides/nodejs
31. alphaTab：Data Model — https://alphatab.net/docs/reference/score
32. alphaTab 原始碼：`model/Beat.ts`（`_globalBeatId`）、`model/Note.ts`（`globalNoteId`）— https://github.com/CoderLine/alphaTab/blob/develop/packages/alphatab/src/model/Beat.ts ；https://github.com/CoderLine/alphaTab/blob/develop/packages/alphatab/src/model/Note.ts
33. alphaTab 型別參考：Beat、Note（id、text、graceType、tuplet、isGhost）— https://alphatab.net/docs/reference/types/model/beat ；https://alphatab.net/docs/reference/types/model/note/
34. alphaTab 型別參考：InstrumentArticulation — https://alphatab.net/docs/reference/types/model/instrumentarticulation
35. alphaTab 原始碼：`model/PercussionMapper.ts` — https://github.com/CoderLine/alphaTab/blob/develop/packages/alphatab/src/model/PercussionMapper.ts
36. alphaTex：Staff metadata（`\articulation`）— https://alphatab.net/docs/alphatex/staff-metadata
37. alphaTab 格式相容表：Guitar Pro 8、MusicXML — https://alphatab.net/docs/formats/guitar-pro-8 ；https://alphatab.net/docs/formats/musicxml
38. alphaTab #2572 Allow control of rest positioning（milestone 1.9.0，2026-07-03 關閉）— https://github.com/CoderLine/alphaTab/issues/2572
39. alphaTab Guide：Audio & Video Sync — https://alphatab.net/docs/guides/audio-video-sync
40. alphaTab Settings：player.playerMode — https://alphatab.net/docs/reference/settings/player/playermode
41. alphaTab API Reference 索引（事件列表）— https://alphatab.net/docs/reference/api
42. alphaTab API：postRenderFinished、renderFinished — https://alphatab.net/docs/reference/api/postrenderfinished ；https://alphatab.net/docs/reference/api/renderfinished
43. alphaTab：Installation (.net) — https://alphatab.net/docs/getting-started/installation-net
44. NuGet：AlphaTab 1.8.4、AlphaTab.Windows 1.8.4 nuspec；版本列表含 1.9.0-alpha — https://www.nuget.org/packages/AlphaTab/ ；https://www.nuget.org/packages/AlphaTab.Windows/ ；https://api.nuget.org/v3-flatcontainer/alphatab/index.json
45. alphaTab：Installation (Android)；Maven metadata（latest 1.8.4，2026-07-05）— https://alphatab.net/docs/getting-started/installation-android ；https://repo1.maven.org/maven2/net/alphatab/alphaTab/maven-metadata.xml
46. Verovio `appveyor.yml`（Visual Studio 2022、x64）— https://github.com/rism-digital/verovio/blob/develop/appveyor.yml
47. PyPI：verovio 6.3.0（含 win32、win_amd64、macOS wheels）— https://pypi.org/project/verovio/6.3.0/#files
48. NuGet 搜尋「verovio」（沒有 Verovio 套件）— https://www.nuget.org/packages?q=verovio
49. App Store：Verovio MEI Viewer（RISM Digital Center，1.3，iOS 18.5+）— https://apps.apple.com/app/verovio-mei-viewer/id6747756332
50. Verovio Book：Playing the MIDI output — https://book.verovio.org/interactive-notation/playing-midi.html
51. Verovio #4314、PR #4436（circle-x 改用 `head.shape="U+E0B3"`）、#4451（三角 notehead，未修）— https://github.com/rism-digital/verovio/issues/4314 ；https://github.com/rism-digital/verovio/pull/4436 ；https://github.com/rism-digital/verovio/issues/4451
52. Verovio #3911 note head modifiers circle, slash, backslash — https://github.com/rism-digital/verovio/issues/3911
53. Verovio #4461、#4465（unpitched MIDI）— https://github.com/rism-digital/verovio/issues/4461 ；https://github.com/rism-digital/verovio/pull/4465
54. Verovio PR #4440 Integrate TypeScript type definitions（2026-09-25 合併）— https://github.com/rism-digital/verovio/pull/4440
55. MEI Guidelines v5：`<fing>`、`<space>`、`<dir>`、`<sb>` — https://music-encoding.org/guidelines/v5/elements/fing.html ；https://music-encoding.org/guidelines/v5/elements/space.html ；https://music-encoding.org/guidelines/v5/elements/dir.html ；https://music-encoding.org/guidelines/v5/elements/sb.html
56. GitHub API：兩個 repo 的 contributors，以及 2026-04-04 之後的 commit（作者統計）— https://api.github.com/repos/CoderLine/alphaTab/commits?since=2026-04-04T00:00:00Z ；https://api.github.com/repos/rism-digital/verovio/commits?since=2026-04-04T00:00:00Z
57. alphaTab PR #2751 perf(rendering): improve render performance — https://github.com/CoderLine/alphaTab/pull/2751
58. SwiftDraw repo（Zlib，0.29.0）— https://github.com/swhitty/SwiftDraw
59. Apple Developer：WKWebView — https://developer.apple.com/documentation/webkit/wkwebview
60. Apple Developer：AVAudioSequencer（`load(from: Data, options:)`、`currentPositionInSeconds`）— https://developer.apple.com/documentation/avfaudio/avaudiosequencer
61. Apple Developer：AVAudioUnitSampler — https://developer.apple.com/documentation/avfaudio/avaudiounitsampler
62. GNU LGPL v3（§4 Combined Works）— https://www.gnu.org/licenses/lgpl-3.0.txt
63. GNU GPL v3（§6 User Product、Installation Information）— https://www.gnu.org/licenses/gpl-3.0.txt
64. Mozilla Public License 2.0（§3.2、§3.3）— https://www.mozilla.org/en-US/MPL/2.0/
65. Apple：Licensed Application End User License Agreement — https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
66. Apple：App Review Guidelines（2.5.2、4.2）— https://developer.apple.com/app-store/review/guidelines/
67. 本次自行量測（pilot）：Apple M2、macOS 27.2、Node v24.15.0。引擎檔案取自 https://cdn.jsdelivr.net/npm/verovio@6.3.0/dist/ （`verovio.mjs`、`verovio-module.mjs`）與 https://cdn.jsdelivr.net/npm/@coderline/alphatab@1.8.4/dist/ （`alphaTab.mjs`、`alphaTab.core.mjs`）。合成譜、CSM 大小與雜湊估算的腳本都放在本次 session 的暫存資料夾，沒有放進 repo。
68. 前一份研究中自行量測的 bundle 大小（jsDelivr，gzip -9）— 見 `research/frontend-tech-2026-10.md` 來源 53
69. GitHub REST API：Repository contents（1 MB／100 MB 限制）— https://docs.github.com/en/rest/repos/contents
70. 專案內部：`master-notes.md` §8、`assets/ai-diff-preview-mockup.png`
71. 專案內部：`research/frontend-tech-2026-10.md`
