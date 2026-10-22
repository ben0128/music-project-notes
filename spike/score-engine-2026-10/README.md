# score-engine spike（2026-10）

2026-10-04～05 為了選排版引擎（alphaTab 或 Verovio）做的 spike。這裡只留下值得帶進正式專案的兩個檔。

- 結論與數據：`research/spike-results-2026-10.md`
- 截圖、PDF、數據：`research/spike-2026-10/`
- 結果：排版引擎定案 Verovio，搭配逐行快取（master-notes.md 第 11、13 節）

這是 spike 程式碼，求快、不求好維護。帶進正式專案時要重新整理並補測試。

## 檔案

- `src/csm.ts`：最小版 Canonical Score Model（只有鼓）。每個小節、事件、音都有穩定、不重複使用的 ID。包含逐小節 hash、逐拍 diff，以及用 ID 定位的 patch。patch 是不可變更新，沒改到的小節保留同一個物件，快取用 `===` 就能判斷要不要重畫。
- `src/adapters/verovio.ts`：CSM → MEI。我們的 ID 會變成 `xml:id`，原樣出現在 Verovio 輸出的 SVG 裡。也包含 diff 預覽用的雙行譜：上行是修改前（灰色，只畫改到的拍），下行是修改後。

`verovio.ts` 用 `../csm.js` 匯入 `csm.ts`，所以保留原本的資料夾結構。

## 沒有放進來的

完整的 spike 留在 Mac 本機的 `score-engine-spike` 資料夾，不在這個 repo 裡：Swift＋WKWebView 外殼、G1–G6 測試頁、合成鼓譜產生器、alphaTab adapter。
