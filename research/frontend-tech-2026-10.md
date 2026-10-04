# 樂譜編輯／渲染的前端技術調查（2026-10）

> 調查日期：2026-10-04
> 問題：主流打譜／樂譜編輯軟體用什麼 UI 與渲染技術？我們（鼓譜優先、開源 Mac 原生編輯器、網頁只能瀏覽）實際可選的路線有哪些？
> 方法：以一手來源為主（官方 GitHub repo 與 LICENSE、官方文件、廠商部落格與下載頁、規格）。授權與版本另以 GitHub API、npm registry、crates.io 交叉確認。bundle 大小是本次從 jsDelivr 下載後，用 `gzip -9` 自行量測。
> 標記：**（次級）**＝只找到第三方報導、沒有一手來源；**未驗證**＝找不到可靠來源；**評估**＝本文的判斷，不是事實陳述。授權相關的解讀屬一般理解，不構成法律意見。

---

## 結論摘要（TL;DR）

- **桌面打譜軟體的主流是「C++ 引擎＋Qt」**：MuseScore Studio 4.7.5 用 C++20、Qt 6（CI 用 6.10.2）、介面用 QML，授權 GPL-3.0-only [1][2][3][4][9]；Dorico 6.2.31 用 C++ 和 Qt，iPad 版另外引入 Qt Quick [10][11][12][13]；Guitar Pro 從 GP6 開始用 Qt 改寫 [19]。Sibelius 用 Qt 只有次級來源 [15]。例外是 StaffPad（C++ 共用核心，iOS 用 Swift、Windows 用 C#／C++/WinRT）[21]，Logic Pro 則沒有公開技術細節 [23]。
- **停產與更替**：MakeMusic 在 2024-08-26 宣布 Finale 停止開發、停止銷售 [18]。PreSonus Notion 6 在 2026-01-13 停售，2027-01-13 停止支援，由跨平台的 Fender Notion 接手 [24]。
- **業界正在往「同一個排版引擎、多個出口」走**：MuseScore 的 repo 裡已經有 Qt for WebAssembly 的 build、web viewer，以及「engraving 不靠 Qt 也能編譯」的 CI 檢查 [5][6][8]。Flat 在 2026-09 把「排版」和「繪製」拆成兩段 [48]。
- **網頁渲染器裡，對鼓譜最現成的是 alphaTab**：MPL-2.0，用 TypeScript 寫，支援打擊樂 articulation、ghost note（括號）、drum tab、鋼琴大譜表，內建 SoundFont2 播放 [37][41][42]。Verovio 是 LGPL-3.0 的 C++ 程式庫，可編成 WASM，也有 Swift Package，排版品質高；但打擊樂還在補洞，circle-x notehead 的修正到 6.3.0 都還沒發行 [29][30][31][32]。VexFlow（MIT）只提供低階元件，5.0.0 之後沒再發版 [25]。OSMD 仍綁 VexFlow 1.2.93，README 把特殊鼓 notehead 列為限制 [27][28]。
- **字型**：SMuFL 1.5 還是草案，採 W3C Community Final Specification Agreement [54]。Bravura、Leland、Petaluma、Leipzig 和 Finale 系列字型都是 SIL OFL 1.1 [55][56][57][58]。Mac 端用 OTF、網頁端用 WOFF2，加上同一份 metadata JSON，兩邊的字形和量測就會一致；但如果自己 subset，依 OFL 要改名 [56]。
- **原生框架的授權**：Qt 是 LGPLv3，部分模組只有 GPL [62][63]；JUCE 9 是 AGPLv3 或付費授權（Starter 方案年營收 ≤ US$20k 免費）[64][65]；Tauri 是 MIT/Apache-2.0，在 macOS 上用 WKWebView [66][67]；Electron 是 MIT，自帶 Chromium [68]；SwiftUI／AppKit 加 Core Text 沒有授權負擔 [71][73]。Mac 的播放可以用 AVAudioEngine＋AVAudioUnitSampler（SF2／DLS）＋AVAudioSequencer，MIDI 輸入用 Core MIDI [74]–[78]。
- **建議**（評估）：採用 **(b) 單一 TypeScript 渲染核心**。網頁直接用；Mac 編輯器只把「譜面」放進 WKWebView，檔案、Git、音訊、MIDI 輸入和選單快捷鍵都走原生 Swift。核心輸出一份和畫布無關的 display list，保留日後改成「JavaScriptCore 執行＋Core Graphics 原生繪製」的退路。引擎先花約兩週 spike，比較 alphaTab 和「自建鼓譜排版（SMuFL，必要時借用 VexFlow 元件）」。(a) Verovio 列為備案；(c) 兩套引擎不建議。

---

## 1. 桌面編輯軟體技術表

| 產品 | 現況（2026-10） | 平台 | 語言／核心 | UI toolkit | 排版／渲染 | 驗證程度 |
|---|---|---|---|---|---|---|
| **MuseScore Studio** | 4.7.5（2026-09-08）[9] | Windows、macOS、Linux（各有 CI build workflow）[6]；另有實驗性 WASM build [5] | C++20 [3]；macOS 有 Swift 元件 [1]；授權 GPL-3.0-only（build script 標 `SPDX-License-Identifier: GPL-3.0-only`，並適用 CLA）[2][8] | Qt 6（`include(SetupQt6)`，CI 用 Qt 6.10.2）[3][4]；介面用 QML（`src/appshell/qml/...` 等數百個 `.qml`）[6] | 自家 `src/engraving`（資料模型＋排版）[6]；繪圖經過 muse_framework 的 `draw` 抽象層，底下有 QPainter provider 和 FreeType 字型引擎 [7] | 一手（原始碼） |
| **Dorico**（Steinberg） | 6.2.31（2026-09-29，為了在 macOS 27 上使用而繞過一個 MIDI 問題；macOS 27 尚未正式支援）[13] | macOS 12–15、26，Windows 10／11 [13]；iPadOS [12] | C++，腳本層用 Lua binding [10] | Qt：2014 年決定採用，理由是跨平台只做一次、成熟的 2D 繪圖和字型排印 [11]。2013 年原本計畫用 Steinberg 自家的 GUI framework [10]，後來改成 Qt [11]。iPad 版引入 Qt Quick，MIDI 編輯器整個重寫 [12] | 自家排版引擎（專有）；開發日誌提到用 Bravura 的 OpenType stylistic alternates 做小譜表的光學尺寸 [10] | 一手（官方部落格與下載頁） |
| **Sibelius**（Avid） | 2026.9（Ultimate／Artist／First）[14] | Windows 11、macOS 14／15／26／27 [14]；行動版有 iOS、iPadOS、Android **（次級）**[17] | C++（2014 年徵才要求「C++ object oriented programming」）**（次級）**[16] | Qt：2011 年的 Sibelius 7 用 Qt 4，2018.11 版改寫到 Qt 5 **（次級）**[15]；目前版本的 Qt 版本**未驗證** | 專有 | 版本與平台是一手；技術只有次級 |
| **Finale**（MakeMusic） | 2024-08-26 宣布停止開發、停止銷售；v27 的技術支援到 2025-08-26；已安裝的可以繼續用（OS 變動除外）[18] | **未驗證**（本次沒取得一手確認） | **未驗證** | **未驗證** | 專有；它的 SMuFL 字型已用 OFL 釋出 [55] | 狀態一手；技術未驗證 |
| **Guitar Pro 8**（Arobas） | 8.x，官方頁面提到 8.1.5 [20] | Windows、macOS，並針對 Apple silicon 最佳化 [20] | **未驗證** | GP6（2010）用 Qt 改寫，主要用 QtCore、QtGui、QtSvg [19]；GP8 是否仍用 Qt **未驗證** | 專有；鼓可以顯示 slash notation 或標準記譜 [20] | GP6 一手；GP8 技術未驗證 |
| **StaffPad** | 2021-05 起屬於 Muse Group [22] | iPad、Windows（筆和觸控）[22] | 共用 C++ core，加上 sqlite3、ohmtech flip；iOS 用 Swift；Windows 用 C#、C++/WinRT、wasabi；server 用 React、Azure、GraphQL、Cloudflare [21] | 各平台原生 [21] | 專有 | 廠商（Muse Group）的 LinkedIn 產品頁，頁面沒有日期 |
| **Logic Pro Score Editor** | Apple 持續提供 | macOS | 未公開 | 未公開 | 未公開；鼓譜靠 mapped instrument 和 staff style，把每個 MIDI 音高對應到 notehead 形狀、譜表位置和鼓組群組 [23] | 功能一手；技術未公開 |
| **Notion → Fender Notion** | Notion 6 桌面版在 2026-01-13 停售，Fender Studio Pro+ 會員可以用到 2027-01-13；之後由 Fender Notion（原 Notion Mobile）接手，`.notion` 檔可以在 Fender Notion 開啟 [24] | Fender Notion：macOS、Windows、iOS、Linux、Android [24] | **未驗證** | **未驗證** | **未驗證** | 狀態一手；技術未驗證 |

**觀察**

- 有完整編輯器的大廠，幾乎都是「C++ 核心＋跨平台 UI 層」。Dorico 選 Qt 的理由是 Windows 和 macOS 只要做一次，加上成熟的 2D 繪圖與排印 [11]。我們只做 Mac，這個理由的分量小很多（評估）。
- **MuseScore 正在把同一個 engraving 引擎帶到網頁上**：`build_wasm.yml` 用 Qt 6.10.2 的 `wasm_singlethread` 編譯，目前 PR 觸發是關閉的 [5]；`src/web/appjs` 底下有 `viewer/viewer.html`、`audio_worklet_processor.js`、`qtloader.js` [6]；`tools/check_build_without_qt` 會在 `MUSE_QT_SUPPORT OFF` 的設定下編譯 engraving [8]。這就是下面 (a) 架構的實例。但它是 GPL-3.0-only，muse_framework 也是 GPLv3 而且適用 CLA [2][7]。採用的話，我們的 Local Editor 和網頁 viewer 都必須是 GPL-3.0（評估）。
- 社群做的 MuseScore WASM 移植 webmscore，最後一次發版是 2023-01 的 v1.2.1，視為停滯 [47]。

---

## 2. 網頁渲染器比較

### 2.1 開源函式庫

| 函式庫 | 授權（依 LICENSE） | 輸入格式 | 鼓／打擊樂支援 | 播放 | 最新版（日期） | 非瀏覽器／原生可用性 | 前端體積（自行量測，raw／gzip） |
|---|---|---|---|---|---|---|---|
| **VexFlow** | MIT [25] | 沒有檔案匯入，要用程式 API 逐一建立；OSMD 的說法是每個小節和符號都得用 JS 手動建立、定位 [27] | 有 percussion clef，x、circle-x、circled 等 notehead 對照表 [26]。鼓譜的排版規則（兩聲部、休止符位置等）要自己寫（評估） | 無 | 5.0.0（2025-03-05）。之後 main 仍有 commit（最近一次 2026-09-16），但沒有發版 [25] | 可在 Node.js 用，輸出 Canvas、SVG [25]；沒有 Swift／原生版本 | `vexflow.js`（CJS，內含字型）1.13 MB／692 KB [53] |
| **OpenSheetMusicDisplay (OSMD)** | BSD-3-Clause [27] | MusicXML（含 `.mxl`）[27] | README 的「Limitations」列出「special drums noteheads/glyphs」不支援 [27] | 開源版沒有；音訊播放器只給 GitHub Sponsors 搶先版 [27] | 2.2.0（2026-10-02）[27]；依賴仍是 `vexflow` 1.2.93 [28] | 可用 Node 做 headless 的 SVG／PNG 輸出 [27]；沒有原生版本 | `opensheetmusicdisplay.min.js` 1.39 MB／351 KB [53] |
| **Verovio** | LGPL-3.0（附 COPYING＋COPYING.LESSER）[29]；npm 標示 `LGPL-3.0-or-later` [36] | 以 MEI 為主；內建轉換器支援 MusicXML、Humdrum、ABC、Plaine & Easie、MuseData、EsAC [29] | MusicXML 的 unpitched 匯入在 2023 年加入 [34]；2026-09 才修好打擊樂譜的 `circle-x`、`triangle` notehead [32]，這個修正在 CHANGELOG 列在 6.3.0 之後的「unreleased」[31]；2026-10-01 修好 unpitched 音符匯出 MIDI 時變成 note 0 的問題 [33]。**可用但還在補洞**（評估） | `renderToMIDI()` 回傳 base64 的 MIDI 檔，另有 timemap；瀏覽器端要自己接 MIDI 播放器，官方教學用 MIDIjs [35] | 6.3.0（2026-08-19）[29] | 本體是 C++20 程式庫，有 JavaScript、Python、Java、Swift、Go binding [29]；`Package.swift` 支援 macOS 11+、iOS 16+ [30]；**只輸出 SVG** [29] | `verovio-toolkit-wasm.js` 7.31 MB／2.34 MB；含 Humdrum 的版本 12.4 MB [53] |
| **alphaTab** | MPL-2.0 [37] | Guitar Pro 3–5、GPX、GP7、GP8、MusicXML、CapXML、alphaTex [38]。相容度：GP8 96%（110／114）[39]；MusicXML 62%（405.5／651）[40] | 功能清單有 drum tabs 和鋼琴大譜表 [37]；GP8 的 percussion tracks 在資料模型、讀取、渲染、音訊各項都標為支援 [39]；`InstrumentArticulation` 可定義 staffLine、依時值的 notehead、technique symbol、MIDI 輸出音 [41]；`Note.isGhost` 用括號顯示，音量也會小一點 [42]。**Sticking 沒有找到文件** | 內建 alphaSynth（MIDI＋SoundFont2，核心來自 TinySoundFont 和 SFZero），瀏覽器走 Web Audio [37]；npm 套件附 `sonivox.sf2`（1.35 MB）[53] | 1.8.4（2026-07-05）[37] | .NET（WPF／WinForms，SVG、GDI+、SkiaSharp）、Android（Kotlin）、Node.js（SVG）[37]；**沒有 Swift／macOS 原生版本** | `alphaTab.min.js` 1.12 MB／279 KB，另外還有 Bravura 字型和 SF2 [53] |
| **abcjs** | MIT [44] | ABC notation [44] | 從 6.0.0-beta.28 起支援 `%%percmap`，可以替每個打擊音色指定 notehead 和發聲；grace note 也會經過 percmap [44] | 有 synth，percmap 有對應的發聲 [44] | 6.7.1（2026-09-21）[44] | 以瀏覽器為主（非瀏覽器用法**未驗證**） | 未量測 |
| **Groove Scribe** | GPL v2；LICENSE 沒寫「or later」[45] | 自己的 URL query 格式，轉成 ABC [45] | 專為鼓手設計：程式常數有 ghost、accent、buzz、flam、drag，以及 sticking 的左右手顏色 [46] | 用 jsmidgen 產生 MIDI，再用 MIDI.js 的 soundfont 播放 [45] | 沒有 release；main 還有 commit（2026-10-03）[45] | 是瀏覽器 app，不是函式庫；渲染用的是內附的 abc2svg 1.3.2（2015，GPL v2），不是 abcjs [45][46] | — |

### 2.2 商業服務（只列公開文件寫到的部分）

| 服務 | 公開可查的渲染方式 |
|---|---|
| **Flat.io** | 目前用 SVG 渲染。2026-09-21 的改版把「每頁放什麼」（排版）和「只畫看得到的部分」（繪製）拆開，PDF 改成直接從譜面資料產生，並在實驗 WebGL [48]。用了哪個函式庫沒有公開。 |
| **Noteflight** | 公開的 Client API 文件說，embed 用 iframe，有 Flash 就用 Flash，沒有就用 HTML5；播放用內部的 wavetable synthesis；可以取出 MusicXML 和 NoteflightXML [49]。這份文件很舊；現在的 HTML5 版是用 SVG 還是 canvas 畫，**未驗證**。 |
| **Soundslice** | 自家的 JavaScript／HTML5 排版引擎，依裝置即時排版；2014 年選 canvas，理由是改用 SVG 會有好幾百個 DOM 元素 [50]。2015 年表示引擎可以讀 MusicXML 等格式，而且「只用 SMuFL」[51]。可以匯入 MusicXML、Guitar Pro（.gp3–.gp）、PowerTab、TuxGuitar、ASCII tab [52]。現在是否還用 canvas，**未驗證**。 |
| **Songsterr** | 找不到官方技術文件，**未驗證**。 |

### 2.3 和鼓譜有關的格式事實

- MusicXML 對打擊樂的寫法：用 `<unpitched>` 加上 `<display-step>`／`<display-octave>` 決定譜表位置；percussion clef 照高音譜號計算位置；`<notehead>` 可以是 `x`、`circle-x` 等；`<midi-unpitched>` 對應 General MIDI 鼓組的音高 [60]。
- `<notehead parentheses="yes">` 可以表示 ghost note；`smufl` 屬性能直接指定任何 SMuFL glyph 名稱 [61]。
- MusicXML 4.0 的打擊樂教學頁**沒有提到 sticking 和 flam 的寫法** [60]。我們的 Canonical Score Model 應該自己定義這些，匯出時再映射到 MusicXML；用哪種映射相容性最好，**未驗證**（評估）。

---

## 3. 音樂字型與授權

**SMuFL 規格**

- 最新文件是 **1.5（draft）**，由 W3C Music Notation Community Group 依 Community Final Specification Agreement（FSA）發布 [54]。GitHub 上最後一個 tag 是 v1.4（2021-03-19）[86]。
- 主要使用 Unicode 私用區（PUA）的 U+E000–U+F3FF。裡面的 glyph 都是「建議」，不是「必須」[54]。
- 規格附帶 `glyphnames.json` 等支援檔。各字型另有自己的 metadata，內容包括 `engravingDefaults`（線寬等，單位是 staff space），以及 `stemUpSE` 這類錨點座標 [54]。
- 鼓譜會用到的 glyph，例如：`noteheadXBlack` U+E0A9、`noteheadCircleX` U+E0B3、`swissRudimentsNoteheadBlackFlam` U+EE70 [54]。

**字型一覽**

| 字型 | 授權 | 最新版 | 可取得的檔案 | 備註 |
|---|---|---|---|---|
| **Bravura** | OFL-1.1，Reserved Font Name「Bravura」[56] | 1.482（2026-08-24）[56] | OTF、WOFF、WOFF2、`Bravura.json`（metadata）[56] | SMuFL 參考字型 [56]；alphaTab 預設使用 [38]；VexFlow 內建 [26] |
| **Leland** | OFL-1.1，Reserved Font Name「Leland」[57] | 0.80（2025-09-17）[57] | OTF、`leland_metadata.json` [57] | 為 MuseScore Studio 開發，3.6 起內建 [57] |
| **Petaluma** | OFL（依 README；GitHub 沒有偵測到 SPDX）[58] | 1.065（2021-01-27）[58] | OTF、WOFF、`petaluma_metadata.json` [58] | 手寫風格 |
| **Leipzig** | OFL [55][59] | — | 隨 Verovio 提供 [59] | Verovio 自家字型 |
| **Gootville** | OFL（Verovio 說它內附的字型都是 OFL）[59] | — | 隨 Verovio 提供 [59] | 原本出自 MuseScore [59] |
| **Finale Ash／Maestro／Broadway／Engraver／Jazz／Legacy** | OFL [55] | — | MakeMusic | — |
| **Sebastian、Eugene** | OFL [55] | — | — | — |
| November 2.0、Norfonts、LS Iris、Music Type Foundry | 商業授權 [55] | — | — | 不建議用在開源專案（評估） |

**授權上要注意的地方**

- MuseScore 的 `LICENSE.txt` 說它內附的字型採 GNU FreeFont License 加字型例外條款 [2]，但 Leland 自己的 repo 是 OFL-1.1 [57]。要用 Leland，請直接從 Leland 的 repo 取得。
- 依 OFL FAQ：
  - 把字型嵌入文件（例如 PDF）是允許的，全字或 subset 都可以，而且不會改變文件本身的授權 [56]。
  - **為網頁 subset 字型屬於修改**，修改後通常不能再用保留字型名稱 [56]。
  - 所以網頁端最好直接用上游的 WOFF2，不要改；如果要 subset，就得改名（評估）。
- **兩端一致的做法**（評估）：Mac 用 OTF、網頁用同一個版本的 WOFF2，排版量測一律讀 metadata JSON，不靠 DOM 或 Core Text 的文字量測，並把字型版本鎖死。

---

## 4. macOS 原生編輯器的技術選項

### 4.1 UI 與渲染框架

| 方案 | 授權，以及對「開源 Local Editor」的影響 | 和你的適配度（評估） | 備註 |
|---|---|---|---|
| **SwiftUI／AppKit＋Core Graphics／Core Text 自己畫** | 只用 Apple 的 framework，沒有額外授權限制 | 你做過 Swift App。但排版引擎得用 Swift 寫，網頁就需要第二套引擎（等於 (c)），除非排版核心另外放在共用層 | `CTFontDrawGlyphs` 可以在指定位置畫指定的 glyph，`CTFontCreatePathForGlyph` 可以取得 glyph 的路徑 [71]；Core Graphics 負責 2D 路徑和 PDF [72]；SwiftUI `Canvas` 是 immediate mode 繪圖，macOS 12 起可用 [73] |
| **Qt／QML** | 開源版是 LGPLv3：動態連結時，App 本身可以不開源，但要提供 Qt 原始碼（含修改）、讓使用者能替換並重新連結，還要提供安裝資訊 [63]。**部分模組只有 GPL**，例如 Qt Graphs、Qt Quick 3D、Qt Qml Compiler、Qt Canvas Painter、Qt HTTP Server、Qt Virtual Keyboard，用了 App 就得是 GPL [62][63]。Qt 也提醒，App Store 之類的通路規定可能和 LGPL 衝突 [63]。商業授權涵蓋所有模組 [62] | 這條路有實例（MuseScore、Dorico）[3][11]，但核心得寫 C++。我們只做 Mac，用不到 Qt 最大的好處（跨平台），還要多學 C++ | QML 寫起來像 JS，可是排版引擎和效能關鍵的部分還是 C++ |
| **JUCE 9** | 雙授權：AGPLv3，或 JUCE 商業授權。Starter 方案在年營收 US$20,000 以內免費；Indie 每人每月 US$40，年營收上限 US$300,000；Pro 每人每月 US$175，營收不設上限 [64][65]。最新版 9.0.3（2026-09-28）[64]。走 AGPL 的話，整個 Local Editor 都得用相容 AGPL 的授權 | 強項是音訊和 plugin，不是樂譜 UI。不建議當主框架 | 版本從 8 升到 9，Starter 的營收上限是 US$20k [65] |
| **Swift＋WKWebView（不加其他框架）** | 用的是系統元件，沒有額外授權 | 最適合 (b)：譜面用 web 核心畫，其他都是原生 Swift | `WKWebView` 從 macOS 10.10 起提供，`evaluateJavaScript` 從原生端呼叫 JS [69]；`WKScriptMessageHandler` 接收網頁端 JS 傳來的訊息 [70] |
| **Tauri 2** | MIT 或 Apache-2.0 [66]。穩定版 2.12.1（2026-09-30），v3 還在 alpha [66] | 如果將來編輯器要上 Windows（筆記第 15 節第 21 項），Tauri 可以沿用同一份 web 核心；只做 Mac 的話，加入 Rust 的好處有限 | 在 macOS 上用 WKWebView，在 Windows 上用 WebView2 [67]，和直接用 Swift＋WKWebView 是同一個 WebKit |
| **Electron** | MIT；以 Chromium 為基礎 [68]。最新版 44.5.1（2026-09-30）[68] | 很難說是「原生 App」，體積也大（評估） | Mac 上是 Blink，和 Safari 使用者看到的 WebKit 不同（評估） |
| **從 Swift 嵌入 C++ 引擎（例如 Verovio）** | Verovio 是 LGPL；整個 App 都開源的話，很容易滿足「可替換、可重新連結」的要求（評估） | 可行，但要處理 C++ 工具鏈 | Verovio 的 `Package.swift` 提供 `VerovioToolkit`（macOS 11+），透過 `tools/c_wrapper.cpp` 的 C 介面接到 Swift [30]。但它用了 `.unsafeFlags(["-std=c++23"])` [30]，Apple 文件寫明，含 unsafe flags 的 product 不能被其他 package 當成相依套件 [82]，實務上要 vendor 進來（這個做法**未驗證**）。另一條路是 Swift 5.9 起的 C++ interop，但目前無法 import C++20 modules [81]。Verovio 只輸出 SVG [29]，Mac 端還要另外找 SVG 的顯示方式 |
| **JavaScriptCore（`JSContext`）** | 系統元件 | 可以在 App 行程內直接執行 TS 核心，不需要 WebView | `JSContext` 讓 Swift 執行 JS 並交換物件 [79]。開啟 Hardened Runtime 後，JavaScriptCore 的快速路徑需要 `com.apple.security.cs.allow-jit` entitlement，沒有的話會退回直譯器 [80] |

### 4.2 Mac 上的音訊播放

| 元件 | 用途 | 一手事實 |
|---|---|---|
| `AVAudioEngine` | 音訊節點圖、即時渲染 | 管理音訊節點圖、控制播放、設定即時渲染的限制 [74] |
| `AVAudioUnitSampler` | 用 SoundFont／DLS 播鼓組 | 可以載入 aupreset、DLS 或 SF2 音色庫、EXS24 音色、單一音檔或一組音檔；輸出是一條立體聲 bus [75]。`loadSoundBankInstrument(at:program:bankMSB:bankLSB:)` 的 bankMSB 對旋律樂器和打擊樂器有不同的預設常數；這個方法會讀檔、配置記憶體，**不能在即時執行緒上呼叫** [75] |
| `AVAudioSequencer` | 播放 MIDI | 把 MIDI 事件整理成 music track 來播放 [76]。可以直接播放從譜面轉出來的 MIDI（評估） |
| `AVAudioPlayerNode` | 播放多力度層的鼓取樣 | 排程播放音訊 buffer 或音檔片段 [77]。適合自建「每個鼓件 × 多個力度層」的取樣播放器（評估） |
| Core MIDI | 電子鼓／MIDI 鍵盤輸入 | 和 MIDI 裝置溝通 [78] |
| 系統內建的 GS 音色庫 | 不另外附 SF2 的備案 | 在本機 macOS 27.2 上確認有 `/System/Library/Components/CoreAudio.component/Contents/Resources/gs_instruments.dls` [85]。這不是公開文件記載的資源，**不建議依賴**（評估） |

網頁端：Web Audio API 1.1 目前是 W3C Working Draft（2026-09-22）[84]。alphaTab 內建 SF2 合成器 [37]；Verovio 要另外接 MIDI 播放器 [35]。即使兩端用同一個 SF2，一邊是 TinySoundFont 系的 alphaSynth、一邊是 Apple Sampler，合成引擎不同，聲音不會完全一樣（評估）。

### 4.3 授權總結（開源授權還沒定，筆記第 15 節第 20 項）

評估：

- **想保留 MIT／Apache-2.0 這類寬鬆授權**：要避開 GPL（MuseScore 引擎 [2]）、AGPL（JUCE 開源版 [64]）、GPL v2（Groove Scribe [45]）。
- **LGPL（Verovio、Qt）可以用**，但要遵守「提供原始碼、讓使用者能重新連結」[63]。
- **MPL-2.0（alphaTab）** 只要求「修改過的 MPL 檔案」要開源 [37]。
- **MIT（VexFlow、abcjs）和 OFL 字型**沒有負擔 [25][44][56]。
- **付費的 AI、雲端、同步功能都在伺服器端**，一般不會被 GPL、LGPL、MPL 的「散布」條款涵蓋；AGPL 則有網路互動條款，要另外評估。

---

## 5. 網頁瀏覽版與 Mac 編輯器如何渲染一致：三種架構比較與建議

### 5.1 三種架構

- **(a) 共用一個引擎，原生編譯＋WASM**：例如 Verovio（C++ 編成 Swift Package 和 WASM）[29][30]，或自己用 C++／Rust 寫。MuseScore 正往這個方向走 [5][6][8]。
- **(b) 共用一個 web renderer**：網頁直接用；Mac App 用 WKWebView 承載譜面 [69][70]，其餘是原生 Swift。延伸做法（b2）：同一個 TS 核心改在 `JSContext` 裡執行 [79]，再用 Core Graphics／Core Text 原生繪製 [71][72]。
- **(c) 兩套引擎**：原生 Swift 一套，網頁 TS 一套。

### 5.2 比較

| 面向 | (a) 共用原生＋WASM 引擎 | (b) 共用 web renderer（Mac 用 WKWebView） | (c) 兩套引擎 |
|---|---|---|---|
| 譜面一致性 | 排版程式碼相同，一致性高。但 Verovio 只輸出 SVG [29]，Mac 端的顯示層和網頁不同，或者也得用 WebView（評估） | **最高**：程式碼和字型檔都相同。只剩 WebKit 和 Blink／Gecko 的點陣化差異；量測不靠 DOM 就能避免版面不同（評估） | 最低：每條排版規則都要做兩次，必然會出現差異，只能靠 golden test 逐張比對 SVG（評估） |
| 原生編輯手感 | 好：可以自己畫原生畫布，用 SVG 的元素 ID 做點擊判定（評估） | 中等：鍵盤焦點、輸入延遲、undo（`NSUndoManager`）、無障礙都要靠橋接處理；改用 b2 可以補回來（評估） | **最好** |
| 開發成本（以 TS／Swift 開發者來看） | 高：要碰 C++20／23 工具鏈 [29][30]，`unsafeFlags` 影響 SwiftPM 相依 [82]，還要寫 Canonical Score Model → MEI 或 MusicXML 的轉換（評估） | **最低**：渲染只有一份程式碼。Patch 和 Diff 也能用同一份 TS，同時跑在網頁、Mac 和 Cloudflare Workers（評估） | 最高 |
| 鼓譜品質的掌控 | Verovio 的打擊樂還在補 [31][32][33]；要改得改 C++ 上游 | 看引擎：alphaTab 現成 [39][41][42]；自建則完全可控 | 完全可控，但要做兩次 |
| 授權 | Verovio 是 LGPL [29][36]；MuseScore 引擎會強迫整個專案 GPL-3.0 [2] | alphaTab 是 MPL-2.0 [37]，VexFlow 是 MIT [25] | 都是自己的程式碼 |
| 網頁體積 | Verovio 約 2.34 MB gzip [53] | alphaTab 約 279 KB gzip，另加字型和 SF2 [53] | 看實作 |
| 播放 | MIDI＋timemap [35]；Mac 用 `AVAudioSequencer`＋`AVAudioUnitSampler` [75][76]；網頁要另找合成器 | alphaTab 內建 SF2 播放 [37]；Mac 可以沿用，或改走原生 AVAudioEngine 換取更低延遲 | 各自做 |
| 擴充吉他、鋼琴 | Verovio 有 tablature（MEI 5.1）而且持續修 [31] | alphaTab 原本就是吉他 tab 起家，也支援鋼琴大譜表 [37] | 兩邊各做一次 |
| 將來上 Windows／iPad | 原生要各自包一層 | 最容易：TS 核心可以沿用（Tauri 在 Windows 上用 WebView2 [67]） | 最難 |
| 主要風險 | C++ 學習成本；SVG 怎麼在 Mac 上顯示 | WKWebView 編輯手感；「原生 App」的定位會打折 | 兩邊不一致；一個人做不完 |

**另一個變體 (c')：預先渲染**。由 Mac App 在 commit 時順便把 SVG 頁面放進 repo，網頁直接顯示這些圖。評估：

- 優點：一致性有保證。
- 缺點：別人產生的 MusicXML、或還沒用 Mac App 存過的譜，網頁看不到；repo 會多出大量生成檔；手機上沒辦法重新排版。
- 結論：只適合做縮圖或 OG 圖片這類輔助用途。

### 5.3 建議（評估）

**採用 (b)：單一 TypeScript 渲染核心。** 先用 b1（WKWebView）上線，保留 b2（JavaScriptCore＋原生繪製）的退路。

理由：

1. **一致性靠結構來保證，不靠測試追趕。** 兩端跑同一份排版程式碼、讀同一個字型版本和 metadata [54][56]。相較之下，(c) 一定會出現差異；(a) 用 Verovio 時，因為只輸出 SVG [29]，Mac 端的顯示層還是得另外處理。
2. **符合你的技能組合**：TS／React／Vue 是強項，也做過 Swift App；而 (a) 要你在 C++ 工具鏈上投入大量時間 [29][30][82]。
3. **網頁只能看，所以網頁端只是「核心減掉編輯工具」**，可以在 Cloudflare 上當靜態資源、在瀏覽器端渲染。Workers 免費方案每個 HTTP 請求只有 10 ms CPU，不適合在伺服器端渲染；付費方案最多 5 分鐘。Worker 大小上限 64 MiB（只算未壓縮），每個 isolate 記憶體 128 MB [83]。
4. **開源授權保有彈性**：alphaTab（MPL-2.0）、VexFlow（MIT）、OFL 字型都不會強迫 Local Editor 採用 GPL [25][37][56]。反過來，用 MuseScore 引擎要接受 GPL-3.0 和 CLA [2][7]，JUCE 開源版要接受 AGPL [64]。
5. **Patch 和 Diff 只寫一次**：Canonical Score Model 的 Patch、Diff、驗證用 TS 寫，就能同時在 Workers（驗證 AI 產生的 patch）、網頁（beat 級「修改前／修改後」顯示）和 Mac App 裡跑。

做法上的約束：

- **核心不碰 DOM**：輸入 `score.json`（Canonical Score Model），輸出 display list，內容包括：
  - SMuFL codepoint 和座標（單位是 staff space）
  - 線段與路徑
  - 每個元素的語意 ID（給點擊判定和 diff 高亮用）
- 字形量測只讀 `Bravura.json` 這類 metadata [56]；字型版本鎖死（例如 Bravura 1.482）。
- **Mac App 的分工**：
  - SwiftUI／AppKit：外殼、檔案與 GitHub commit、選單快捷鍵。
  - Core MIDI：電子鼓輸入 [78]。
  - AVAudioEngine＋AVAudioUnitSampler／AVAudioPlayerNode：播放 [74][75][77]。
  - WKWebView：只負責譜面，兩邊透過 `evaluateJavaScript` 和 `WKScriptMessageHandler` 溝通 [69][70]。
- **退路 b2**：如果 WKWebView 的編輯手感不夠好，就把同一個核心改到 `JSContext` 裡執行 [79]，再用 Core Text 把 display list 畫成原生畫面 [71]。記得申請 `allow-jit` entitlement，不然會退回直譯器 [80]。排版程式碼和字型都沒變，所以一致性不受影響。

**引擎選擇：先做約兩週的 spike，比較兩個候選**

測試素材要包含以下內容：

- 16 分和 32 分音符的 hi-hat groove
- 兩聲部鼓組（手在上、腳在下）
- 六連音和巢狀 tuplet
- flam、drag（倚音）
- ghost note（括號）、重音
- hi-hat 開／關記號（o／+）
- 音符下方的 R／L sticking
- 兩聲部的休止符位置
- 反覆記號、跳房子、多小節休止
- beat 級 diff 高亮
- 播放游標同步
- 200 小節的效能
- MusicXML 來回轉換

兩個候選：

1. **alphaTab**（MPL-2.0）
   - 優點：鼓、吉他 tab、鋼琴大譜表和 SF2 播放都是現成的 [37][39]；打擊樂 articulation 的資料模型很完整 [41]；支援 ghost note [42]；可以換成其他 SMuFL 字型，但缺 glyph 時沒有 fallback [43]。
   - 待驗證：
     - sticking 的呈現
     - 能不能細部控制樣式和高亮
     - 能不能接自訂的 render engine 來輸出 display list（README 提到它有 SVG、HTML5 canvas、GDI+、SkiaSharp、Android Canvas 等多種 render engine [37]，但 JS 版能不能註冊自訂 engine **未驗證**）
     - 能不能在 `JSContext` 裡執行
2. **自建鼓譜排版**（以 SMuFL 字型和 metadata 為基礎，必要時借用 VexFlow 的 MIT 元件 [25][26]）
   - 優點：範圍只有鼓，可控度最高，也能成為產品差異化的來源。
   - 代價：要自己累積排版規則，加吉他、鋼琴時工作量會大增。

傾向（評估）：

- spike 結果如果 alphaTab 能滿足鼓譜細節和高亮需求，v1 就用 alphaTab，但要把它包在 `CanonicalScore → 渲染` 的介面後面，避免綁死。
- 如果做不到，v1 就自建鼓譜排版。
- **(a) Verovio 是備案**：等鋼琴或複雜古典譜的排版品質變成主要瓶頸時再評估。屆時要確認它的打擊樂修正已經正式發行 [31]。

**不建議：**

- **(c) 兩套引擎**：排版要做兩次，又注定不一致，一個人維護不來。
- **直接拿 MuseScore 引擎**：會被迫採用 GPL-3.0 和 CLA；而且它的 WASM build 依賴 Qt for WASM，還在實驗階段 [2][5][7]。

---

## 6. 未能驗證／需要再確認的項目

1. **Sibelius 的 UI toolkit**：用 Qt 只有 Scoring Notes 的報導 [15]；Avid 官網頁面回傳 403，徵才頁已下架。目前版本用哪一版 Qt 也不知道。
2. **Guitar Pro 8 是否仍用 Qt**：只有 GP6（2010）有 Qt 官方部落格的一手說法 [19]。GP8 的語言和 UI toolkit 都沒有一手來源。
3. **Finale 的語言、UI toolkit、引擎**：找不到一手來源。
4. **Logic Pro Score Editor 的渲染技術**：Apple 沒有公開。
5. **Notion 6 和 Fender Notion 的技術**：找不到一手來源。
6. **Noteflight 目前 HTML5 版的繪製方式**（SVG 還是 canvas）：只有舊版 API 文件 [49]。
7. **Songsterr 的渲染技術**：沒有公開文件。
8. **Soundslice 現在是否還用 canvas**：一手說法來自 2014 年 [50]。
9. **StaffPad 的技術棧**：來自 Muse Group 的 LinkedIn 產品頁，頁面沒有日期 [21]。
10. **alphaTab 的幾個能力**：
    - 能不能顯示 sticking（R／L）
    - JS 版能不能註冊自訂 render engine 來輸出 display list
    - 能不能在沒有 DOM 的 `JSContext` 裡執行（README 說 Node.js 能用 SVG 渲染 [37]，但 JSC 沒有測過）
    - 樣式與高亮 API 夠不夠做 beat 級 diff
11. **Verovio 的鼓譜細節**：sticking、flam 間距、兩聲部鼓組的品質都沒實測；包含 circle-x 修正的正式版什麼時候發行，也還不確定 [31]。
12. **Verovio 的 `unsafeFlags` 怎麼處理**：Apple 說這種 package 不能當相依套件 [82]，用 vendor 或本地 package 引用是否可行還沒驗證。另外，macOS 能不能不靠 WebKit 直接顯示任意 SVG（例如用 `NSImage`），也沒查證。
13. **Verovio WASM 能不能在 Cloudflare Workers 上做伺服器端 SVG 渲染**：體積在 64 MiB 以內 [83][53]，但 CPU 時間和記憶體都沒測。
14. **MuseScore 的 WASM viewer 是不是正式產品方向**：目前只看到程式碼和停用 PR 觸發的 workflow [5][6]，沒有官方公告。
15. **Dorico 桌面版現在 Qt Widgets 和 Qt Quick 的比例**：只有 2021 年 iPad 版的說法 [12]。
16. **`gs_instruments.dls`**：是本機觀察到的系統檔，沒有官方文件，授權和長期是否存在都不明 [85]。
17. **sticking 和 flam 寫進 MusicXML 的最佳映射**：MusicXML 4.0 教學頁沒有涵蓋 [60]。
18. **Sibelius 2026.5 的「用網頁瀏覽器分享分譜」用了什麼技術**：只在搜尋摘要裡看到，Avid 頁面回傳 403，無法確認。

---

## 7. 來源清單（全部存取於 2026-10-04）

1. MuseScore README — https://github.com/musescore/MuseScore/blob/main/README.md
2. MuseScore LICENSE.txt — https://github.com/musescore/MuseScore/blob/main/LICENSE.txt
3. MuseScore CMakeLists.txt（C++20、SetupQt6）— https://github.com/musescore/MuseScore/blob/main/CMakeLists.txt
4. MuseScore macOS build workflow（Qt 6.10.2）— https://github.com/musescore/MuseScore/blob/main/.github/workflows/build_macos.yml
5. MuseScore WASM build workflow — https://github.com/musescore/MuseScore/blob/main/.github/workflows/build_wasm.yml
6. MuseScore 原始碼樹（`src/engraving`、`src/appshell/qml`、`src/web/appjs`、`.github/workflows`）— https://github.com/musescore/MuseScore/tree/main/src
7. muse_framework（LICENSE.txt、`framework/draw`）— https://github.com/musescore/muse_framework
8. MuseScore no-Qt engraving 檢查 — https://github.com/musescore/MuseScore/tree/main/tools/check_build_without_qt ；https://github.com/musescore/MuseScore/blob/main/buildscripts/ci/withoutqt/build.sh
9. MuseScore Studio 4.7.5 release — https://github.com/musescore/MuseScore/releases/tag/v4.7.5
10. Dorico Development diary, part three（2013-09-09）— https://blog.dorico.com/2013/09/development-diary-part-three/
11. Dorico Development diary, part seven（2014-06-04）— https://blog.dorico.com/2014/06/development-diary-part-seven/
12. How Dorico came to the iPad（2021-07-28）— https://blog.dorico.com/2021/07/how-dorico-came-to-the-ipad-the-behind-the-scenes-story/
13. Steinberg Dorico 6 Downloads（6.2.31）— https://o.steinberg.net/en/support/downloads/dorico_6.html
14. Avid KB：System Requirements for Avid Sibelius Products — https://kb.avid.com/pkb/articles/compatibility/en418691
15. Scoring Notes：Sibelius 2018.11（次級）— https://www.scoringnotes.com/reviews/sibelius-2018-11/
16. Scoring Notes：Avid posts job opening for Sibelius developer（2014，次級）— https://www.scoringnotes.com/news/avid-posts-job-opening-for-sibelius-developer/
17. Scoring Notes：Sibelius 2026.2（次級）— https://www.scoringnotes.com/news/sibelius-2026-2/
18. MakeMusic：MakeMusic Sunsets Finale（2024-08-26）— https://www.makemusic.com/press-room/press-releases-2024/makemusic-sunsets-finale/
19. Qt Blog：How Qt can turn you into a guitar maestro（2010-06-17）— https://www.qt.io/blog/2010/06/17/how-qt-can-turn-you-into-a-guitar-maestro
20. Guitar Pro 8 新功能頁 — https://www.guitar-pro.com/c/10-guitar-pro-new-features
21. StaffPad 產品頁（Muse Group，LinkedIn）— https://www.linkedin.com/products/muse-staffpad/
22. StaffPad：Springing Forward（2021-05-07）— https://www.staffpad.net/springing-forward
23. Apple：Use mapped staff styles for drum notation in Logic Pro for Mac — https://support.apple.com/guide/logicpro/use-mapped-staff-styles-for-drum-notation-lgcp8535bc34/mac
24. PreSonus：PreSonus Notion 6 Announcement（2026-01-12，2026-05-13 更新）— https://support.presonus.com/hc/en-us/articles/42608019438989-PreSonus-Notion-6-Announcement
25. VexFlow repo（README、LICENSE、5.0.0 release、commit 紀錄）— https://github.com/vexflow/vexflow
26. VexFlow 原始碼（`src/tables.ts`、`src/fonts/`）— https://github.com/vexflow/vexflow/blob/main/src/tables.ts ；https://github.com/vexflow/vexflow/tree/main/src/fonts
27. OpenSheetMusicDisplay repo（README、LICENSE、2.2.0 release）— https://github.com/opensheetmusicdisplay/opensheetmusicdisplay
28. npm：opensheetmusicdisplay 2.2.0 metadata — https://registry.npmjs.org/opensheetmusicdisplay/2.2.0
29. Verovio repo（README、COPYING、COPYING.LESSER、6.3.0 release）— https://github.com/rism-digital/verovio
30. Verovio `Package.swift` 與 Swift binding — https://github.com/rism-digital/verovio/blob/develop/Package.swift ；https://github.com/rism-digital/verovio/tree/develop/bindings/swift-toolkit
31. Verovio CHANGELOG — https://github.com/rism-digital/verovio/blob/develop/CHANGELOG.md
32. Verovio issue #4314：MusicXML circle-x／triangle noteheads render incorrectly in percussion — https://github.com/rism-digital/verovio/issues/4314
33. Verovio #4461／#4465：unpitched notes MIDI — https://github.com/rism-digital/verovio/issues/4461 ；https://github.com/rism-digital/verovio/pull/4465
34. Verovio #3481：Add support for unpitched notes in MusicXML import — https://github.com/rism-digital/verovio/pull/3481
35. Verovio Reference Book：Playing the MIDI output — https://book.verovio.org/interactive-notation/playing-midi.html
36. npm：verovio metadata — https://registry.npmjs.org/verovio
37. alphaTab repo（README、LICENSE、v1.8.4 release）— https://github.com/CoderLine/alphaTab
38. alphaTab Docs：Introduction — https://www.alphatab.net/docs/introduction
39. alphaTab Docs：Guitar Pro 8 (.gp) — https://alphatab.net/docs/formats/guitar-pro-8
40. alphaTab Docs：MusicXML — https://alphatab.net/docs/formats/musicxml
41. alphaTab Docs：InstrumentArticulation — https://alphatab.net/docs/reference/types/model/instrumentarticulation
42. alphaTab Docs：Note — https://alphatab.net/docs/reference/types/model/note/
43. alphaTab Docs：SMuFL font customization — https://alphatab.net/docs/guides/smufl
44. abcjs repo（LICENSE.md、RELEASE.md、v6.7.1 release）— https://github.com/paulrosen/abcjs
45. Groove Scribe repo（LICENSE.txt、README.md、SOURCE_CODE_README.md）— https://github.com/montulli/GrooveScribe
46. Groove Scribe 程式碼（`js/constants.js`、`js/abc2svg-1.js`）— https://github.com/montulli/GrooveScribe/blob/master/js/constants.js ；https://github.com/montulli/GrooveScribe/blob/master/js/abc2svg-1.js
47. webmscore repo — https://github.com/LibreScore/webmscore
48. Flat Blog：Lightning-Fast Editor Update（2026-09-21）— https://blog.flat.io/flat-music-notation-software-lightning-fast-editor-update/
49. Noteflight Client API v2 — https://www.noteflight.com/info/api/client_doc_v2
50. Adrian Holovaty：Announcing the Soundslice sheet music player（2014-03-17）— https://www.holovaty.com/writing/soundslice-sheet-music/
51. Adrian Holovaty，W3C public-music-notation-contrib 郵件（2015-09）— https://lists.w3.org/Archives/Public/public-music-notation-contrib/2015Sep/0016.html
52. Soundslice Help：Importing notation files — https://www.soundslice.com/help/en/creating/importing/61/overview/
53. jsDelivr 套件檔案（本次自行量測 raw 與 gzip -9 大小）— https://cdn.jsdelivr.net/npm/verovio@6.3.0/dist/verovio-toolkit-wasm.js ；https://cdn.jsdelivr.net/npm/@coderline/alphatab@1.8.4/dist/alphaTab.min.js ；https://cdn.jsdelivr.net/npm/vexflow@5.0.0/build/cjs/vexflow.js ；https://cdn.jsdelivr.net/npm/opensheetmusicdisplay@2.2.0/build/opensheetmusicdisplay.min.js ；檔案清單：https://data.jsdelivr.com/v1/packages/npm/verovio@6.3.0?structure=flat ；https://data.jsdelivr.com/v1/packages/npm/@coderline/alphatab@1.8.4?structure=flat
54. SMuFL 規格 1.5 draft（含 print 版全文）— https://smufl.formats.music/latest/ ；https://smufl.formats.music/latest/print.html
55. SMuFL 字型列表 — https://www.smufl.org/fonts/
56. Bravura repo（`redist/`、OFL.txt、OFL-FAQ.txt、bravura-1.482 release）— https://github.com/steinbergmedia/bravura
57. Leland repo（README、LICENSE.txt、v0.80 release）— https://github.com/MuseScoreFonts/Leland
58. Petaluma repo（README、`redist/`、petaluma-1.065 release）— https://github.com/steinbergmedia/petaluma
59. Verovio fonts README — https://github.com/rism-digital/verovio/blob/develop/fonts/README.md
60. MusicXML 4.0 Tutorial：Percussion — https://www.w3.org/2021/06/musicxml40/tutorial/percussion
61. MusicXML 4.0 Reference：`<notehead>` — https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/notehead/
62. Qt 6 Documentation：Qt Licensing — https://doc.qt.io/qt-6/licensing.html
63. Qt：Obligations of the GPL and LGPL — https://www.qt.io/licensing/open-source-lgpl-obligations
64. JUCE LICENSE.md 與 9.0.3 release — https://github.com/juce-framework/JUCE/blob/master/LICENSE.md ；https://github.com/juce-framework/JUCE/releases/tag/9.0.3
65. JUCE：Get JUCE（JUCE 9 授權方案）— https://juce.com/get-juce/
66. Tauri repo（LICENSE-MIT、LICENSE-APACHE-2.0、tauri-v2.12.1、tauri-v3.0.0-alpha.4）與 crates.io — https://github.com/tauri-apps/tauri ；https://crates.io/crates/tauri
67. Tauri v2：Webview Versions — https://v2.tauri.app/reference/webview-versions/
68. Electron repo（README、LICENSE、v44.5.1 release）— https://github.com/electron/electron
69. Apple Developer：WKWebView；evaluateJavaScript(_:completionHandler:) — https://developer.apple.com/documentation/webkit/wkwebview ；https://developer.apple.com/documentation/webkit/wkwebview/evaluatejavascript(_:completionhandler:)
70. Apple Developer：WKScriptMessageHandler — https://developer.apple.com/documentation/webkit/wkscriptmessagehandler
71. Apple Developer：Core Text CTFontDrawGlyphs、CTFontCreatePathForGlyph — https://developer.apple.com/documentation/coretext/ctfontdrawglyphs(_:_:_:_:_:) ；https://developer.apple.com/documentation/coretext/ctfontcreatepathforglyph(_:_:_:)
72. Apple Developer：Core Graphics — https://developer.apple.com/documentation/coregraphics
73. Apple Developer：SwiftUI Canvas — https://developer.apple.com/documentation/swiftui/canvas
74. Apple Developer：AVAudioEngine — https://developer.apple.com/documentation/avfaudio/avaudioengine
75. Apple Developer：AVAudioUnitSampler；loadSoundBankInstrument(at:program:bankMSB:bankLSB:) — https://developer.apple.com/documentation/avfaudio/avaudiounitsampler ；https://developer.apple.com/documentation/avfaudio/avaudiounitsampler/loadsoundbankinstrument(at:program:bankmsb:banklsb:)
76. Apple Developer：AVAudioSequencer — https://developer.apple.com/documentation/avfaudio/avaudiosequencer
77. Apple Developer：AVAudioPlayerNode — https://developer.apple.com/documentation/avfaudio/avaudioplayernode
78. Apple Developer：Core MIDI — https://developer.apple.com/documentation/coremidi
79. Apple Developer：JSContext（JavaScriptCore）— https://developer.apple.com/documentation/javascriptcore/jscontext
80. Apple Developer：Allow execution of JIT-compiled code entitlement — https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.cs.allow-jit
81. Swift.org：Mixing Swift and C++ — https://www.swift.org/documentation/cxx-interop/
82. Apple Developer：CXXSetting.unsafeFlags(_:_:) — https://developer.apple.com/documentation/packagedescription/cxxsetting/unsafeflags(_:_:)
83. Cloudflare Workers：Limits — https://developers.cloudflare.com/workers/platform/limits/
84. W3C：Web Audio API 1.1（Working Draft，2026-09-22）— https://www.w3.org/TR/webaudio/
85. 本機觀察：macOS 27.2 上的 `/System/Library/Components/CoreAudio.component/Contents/Resources/gs_instruments.dls`（2026-10-04 以 `ls` 確認存在；非公開文件）
86. SMuFL GitHub repo（releases：v1.4，2021-03-19）— https://github.com/w3c-cg/smufl
