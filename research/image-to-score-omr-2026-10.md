# 圖片轉譜（OMR）評估：PDF／照片 → 可編輯鼓譜（2026-10）

> 調查日期：2026-10-06
> 來源：Claude Code 對話 [C12]。調查由一個研究 agent 執行；以下七項由主對話逐一回到原始頁面抽查，內容一致：Flat OMR API 文件 [S36]、Klangio Scan2Notes 說明頁 [S32]、Scoring Notes 的 OMR 評測 [S28]、LEGATO 2 論文數字 [S12]、Audiveris 鼓譜指南 [S3]、Soundslice 支援記號清單 [S22]、MusiXQA 論文數字 [S44]。其餘項目沒有二次查證。
> 標記：**（官方）**＝廠商或專案自述；**（獨立）**＝第三方評測或論文；**（論壇）**＝使用者回報；**評估**＝本文的判斷。查不到的一律寫「查無資料」。

---

## 結論摘要（TL;DR）

- **評估：現在不要自建 OMR，也還不必外購；先做兩件低成本的事**：(1) 把 MusicXML 匯入做紮實，這本來就是接 Klangio 輸出的必要工作，也讓使用者能用別家 OMR 轉好再匯入；(2) 建一份有權利來源的真實鼓譜評測集。等評測和使用數據支持，再把外部 OMR 包成付費功能。
- 有八家工具宣稱支援鼓譜，但**沒有任何一家拿得出鼓組譜的獨立品質數據**。
- 能商用授權、有公開文件的 OMR API **只找到 Flat 一家**。
- 通用多模態 LLM 讀譜很弱，只適合讀圖例、標題、速度這類文字。
- 需求真實但小眾，而且多半是「想聽、想練」，不是「想製譜」。
- 讓使用者把買來的譜上傳到雲端、再推進 GitHub，有著作權上的摩擦。

---

## 1. 現有工具對鼓組譜的支援

唯一的第三方比較是 Scoring Notes 2024-12 的六款 OMR 評測，測試曲目全是古典樂；提到打擊樂只有一句：Soundslice 處理胡桃鉗總譜時「did well displaying percussion notation」（獨立）[S28]。另一篇 Scoring Notes 文章（2023）的作者用 Newzik 把鼓譜 PDF 轉成 MusicXML，評價「works admirably」，同一篇說 MuseScore 的 PDF 匯入「rarely worked」（獨立）[S30]。

| 工具 | 鼓組支援 | 品質證據 | 輸出 | 平台 | 價格 | 授權 |
|---|---|---|---|---|---|---|
| MuseScore NoteVision | 查無資料（頁面需登入） | 自稱約 95%，未分樂器 [S1] | MSCZ | Web | 免費有限額，Pro Plus 無限 | 專有 |
| Soundslice | 有：打擊樂譜號、手順、重音、倚音、一小節反覆、tremolo 和 buzz roll；x 符頭只支援部分；hi-hat 的 o／+ 不支援；兩小節反覆的說法前後矛盾（官方）[S22][S23] | 僅上述一句 [S28] | MusicXML | Web | 免費每月 2 頁；Plus 每月 US$5、100 頁 [S25] | 專有，掃描沒有 API [S26] |
| Flat／Opuscan | 宣稱支援打擊樂譜表、多種符頭、一小節反覆（官方）[S35][S38] | 查無資料 | MusicXML、MIDI | Web、Mac、Win、iOS、Android | 每頁 1 點 | 專有，有 API [S36] |
| Klangio Scan2Notes | 說明頁（2026-07-30）寫「now capable of… drum notations」；但重音、倚音不支援，等於重音和 flam 會遺失（官方）[S32] | 查無資料 | PDF、XML、MIDI | Web | 免費預覽前 12 小節＋Pro | 專有；Klangio API 沒列 OMR [S33] |
| PlayScore 2 | 五線打擊樂譜號 [S16] | 查無資料 | MusicXML、MIDI | iOS、Android、Win | 每月 US$6.99 | 輸出預設僅限非商業 [S18] |
| Newzik Maestria | 官方查無資料 | 一位作者實測鼓譜可用 [S30] | MusicXML、MIDI | iOS、Web | 每年 US$49.99 | 專有 |
| PhotoScore Ultimate | 1／2／3 線打擊譜；五線鼓組查無資料 [S14] | 查無資料 | MusicXML、MIDI | Mac、Win | 查無資料 | 專有 |
| SmartScore 64 | 實心符頭可，x 符頭「most likely be dropped」[S13] | — | MusicXML | Mac、Win | US$399 | 專有 |
| ScanScore | 不支援 [S20] | — | MusicXML | Mac、Win | 每年 US$79 | 專有 |
| DrumShed（鼓專用） | 照片匯入 beta，自述「won't be perfect」[S40] | — | PDF | iOS、Android | 會員制 | 專有 |
| Audiveris | 5.3 起，要手動開啟兩個開關；以「符頭形狀＋線位」對應樂器，可自訂 `drum-set.xml`（官方）[S3] | 兩個相關 issue 未解：無譜號的鼓譜認不出來（2026-09）、hi-hat 的 x 符頭消失（2017）（論壇）[S5][S6] | MusicXML 4 | Java | 免費 | AGPL-3.0 |
| oemer | 不支援，有 issue 回報鼓譜什麼都沒抽出來 [S8] | — | MusicXML | Python | 免費 | MIT |
| SMT++ | 只做鋼琴類樂譜 [S9] | — | bekern | Python | 免費 | MIT |
| LEGATO／LEGATO 2 | 查無資料 | 通用基準最佳 [S12] | ABC | GPU 約 20 GB | 免費 | MIT，但依賴 Llama 3.2 Vision [S11][S66] |

## 2. 可商用的 OMR API

- **Flat OMR API**（官方）[S36]：每頁 1 點，先扣訂閱額度再扣點數包（點數價格沒公開）；每個 job 最多 50 頁、25 MiB，每帳號 10 個並行，單頁約 30 秒；檔案預設保留 30 天；明言不拿使用者上傳的檔案和輸出訓練模型；可處理「customers who hold the necessary rights」上傳的樂譜，不需標示出處；輸出 MusicXML 或 MIDI。API 文件本身沒提到打擊樂。Flat 的模型完全用自家排版引擎產生的合成樂譜訓練 [S37]。
- **Soundslice**：掃描功能沒有 API [S26]。
- **PlayScore**：輸出預設非商業，商用要洽談 [S18]。
- **Musitek、Newzik、NoteVision、Klangio**：OMR API 查無資料。

## 3. 研究文獻與鼓譜特有難點

- 常見的 OMR 資料集清單裡沒有鼓或打擊樂資料集（獨立）[S49]。唯一找到的鼓譜研究 SWARA 在付費牆後 [S50]。
- **合成資料是主流**：Transcoda 用 Verovio 渲染加上影像劣化，31 萬筆樣本，59M 參數的模型在單張 GPU 上訓練 6 小時（獨立）[S47]；LEGATO 用 21.4 萬筆合成樂譜 [S10]。
- **照片比數位檔難很多**：LEGATO 2 在弦樂四重奏上，渲染圖的 OMR-NED 是 17.1，相機照片是 31.6，錯誤率將近翻倍（獨立）[S12]。
- **鼓譜特有的難點**：
  1. 圖例沒有標準，每份鼓譜都要附 legend 說明線位和符頭代表哪個鼓件 [S51]；Audiveris 文件也說「There seems to be no universal specification for drum set mapping」[S3]。
  2. 樂器身分要「線位＋符頭」一起決定，MusicXML 規格也說只看線位不夠 [S52]。
  3. x 符頭容易遺失、沒有譜號的鼓譜認不出來 [S5][S6][S13]。
  4. 反覆記號、手順、hi-hat 開合、ghost note、flam 的支援各家參差 [S22][S32]。

## 4. 通用多模態 LLM

- LEGATO 2 論文（2026-07）：Gemini 3.1 Pro 的 OMR-NED 在渲染圖是 93.5、相機照片是 94.1，專用模型 LEGATO 2 是 17.1 和 31.6（數字越低越好）（獨立）[S12]。
- MusiXQA（2025）：GPT-4o 零樣本的 OMR 語意正確率只有 4.0%，微調後的 Phi-3-MusiX 是 68.4%（獨立）[S44]。
- 鼓譜專屬的 LLM 基準查無資料。
- **評估**：LLM 適合讀圖例文字、標題、速度、「3x」、D.S. 這類文字層，不適合讀符號本身。

## 5. 需求訊號

- r/drums 上「上傳 PDF 讓它播給我聽」的提問在 2022 到 2025 年反覆出現，但互動很低；動機多半是想聽懂節奏、確認自己打得對不對；回覆常是「MuseScore 只能手動重打」，或 Soundslice 官方帳號來推銷（論壇）[S56]。
- 已有鼓專用 app 主打「拍照、修正、聽、練」：DrumShed [S40]。
- **評估**：需求真實但小眾，使用者要完成的是「聽見、練習」，不是「製譜」；和我們「音訊轉譜加修正」的核心價值有距離。

## 6. 法律

- 美國：MPA 的立場是複製前必須取得授權 [S62]；Hachette v. Internet Archive（第二巡迴法院，2024-09-04）認定掃描合法購得的書再出借不構成合理使用 [S59]；2016 年 MPA 代表表示曾對 musescore.com 發出 54 份下架通知、涉及 13,000 多個網址 [S60]。Muse Group 在 2023 年併購 Hal Leonard [S61]。
- 歐盟：InfoSoc 指令第 5(2)(a) 條的影印例外明文排除樂譜；私人重製例外看各國立法 [S58]。
- 台灣：著作權法第 51 條的私人重製限於「非供公眾使用之機器」[S63]；雲端服務是否符合有疑義（評估）。
- 同業做法：Soundslice 規定使用者自負取得權利的責任 [S27]；Flat 限權利人上傳 [S36]；Newzik 禁止對出版商保護的樂譜使用它的 OMR [S31]。
- **評估：如果要做**，服務條款要有權利擔保和下架處理流程；預設私有，推到公開 GitHub repo 前要提示（那就構成散布）；未經同意不拿上傳內容訓練模型；不建立共享的掃描譜庫。以上不是法律意見。

## 7. 建置選項

| 選項 | 內容 | 評估 |
|---|---|---|
| (a) 外購 API | 實際上只有 Flat 可選；整合約 1 到 2 週（上傳、輪詢、取回 MusicXML、轉成 `score.json`） | 鼓譜品質未經查證、點數價格不透明，而且 Flat 本身也是樂譜編輯器的競爭者。也可以問 Klangio 能否透過 API 開放 Scan2Notes |
| (b) 開源加合成資料自訓 | Audiveris 是 AGPL，以網路服務提供可能觸發開源義務；oemer、SMT++ 是 MIT 但不支援鼓譜。範本是 Transcoda 的作法：小模型加上用 Verovio 渲染的合成資料 | 只處理乾淨數位 PDF 的版本約 2 到 4 人月（含真實鼓譜評測集）；支援手機照片大約再加一倍 |
| (c) 通用多模態 LLM | 直接讓 Claude、GPT、Gemini 讀譜 | 證據顯示逐音辨識很弱，只適合文字層 |

我們的優勢（評估）：已經有 `score.json` → MEI → Verovio 的管線，產生合成訓練資料幾乎不花成本；修正介面本來就要做，OMR 有誤差也能讓使用者修。

## 8. 建議路線（評估）

- **Phase 0：現在，約 1 到 2 週**
  1. 把 MusicXML 匯入做紮實：正確處理 unpitched 的 `display-step`／`display-octave`、`instrument`、`notehead` 對應。這本來就是接 Klangio 輸出的必要工作；另一場討論的實測發現，alphaTab 在沒有 `notehead` 標籤時會漏畫一般符頭，正好說明這層要自己處理好。
  2. 讓使用者可以用 Soundslice、Flat、NoteVision 轉好 MusicXML 再匯入，先不收費。
  3. 建立 50 到 100 頁有權利來源的真實鼓譜評測集，用「每小節擊點＋樂器的 F1」比較 Flat API、Klangio Scan2Notes、Audiveris。
- **Phase 1：之後**，條件是評測達標，而且 MusicXML 匯入的使用率夠高
  - 把 Flat 或 Klangio 包成付費功能。
  - MVP 只處理乾淨的數位 PDF、單一五線鼓組譜；支援上下兩聲部、一般／x／帶圈 x 符頭、重音、ghost note、flam、hi-hat 開合、一小節和兩小節反覆、反覆小節線。
  - 每份譜請使用者確認一次 legend 對應，把最難的辨識問題變成一個介面步驟。
  - 不做：手機照片、手寫譜、多聲部總譜。
- **Phase 2**：只有外部服務的鼓譜品質不夠，或用量大到單頁成本變得重要時，才用 Verovio 渲染自家 MEI 來訓練小模型；LLM 只負責 legend 和文字層。

---

## 9. 來源清單（全部存取於 2026-10-06）

- S1 https://www.mu.se/posts/ai-powered-score-converter
- S3 https://audiveris.github.io/audiveris/_pages/guides/specific/drums/
- S4 https://github.com/Audiveris/audiveris
- S5 https://github.com/Audiveris/audiveris/issues/1061
- S6 https://github.com/Audiveris/audiveris/issues/33
- S7 https://github.com/BreezeWhite/oemer
- S8 https://github.com/BreezeWhite/oemer/issues
- S9 https://github.com/antoniorv6/SMT-plusplus
- S10 https://arxiv.org/abs/2506.19065
- S11 https://huggingface.co/guangyangmusic/legato
- S12 https://arxiv.org/html/2607.05769
- S13 https://www.musitek.com/smartscore-online-help/songbook/drums_and_percussion/note_head_shapes.php
- S14 https://www.neuratron.com/photoscore2.htm
- S16 https://www.playscore.co/blog/faq-items/percussion-and-drums/
- S18 https://www.playscore.co/blog/faq-items/can-i-use-playscore-2-midi-and-musicxml-files-commercially/
- S20 https://scanscore.zendesk.com/hc/en-us/articles/360011864820-Can-ScanScore-be-used-to-read-all-sheet-music
- S22 https://www.soundslice.com/help/en/creating/pdf-import/294/supported-notations/
- S23 https://www.soundslice.com/blog/282/new-features-dec-12/
- S25 https://www.soundslice.com/plans/
- S26 https://www.soundslice.com/help/data-api/
- S27 https://www.soundslice.com/licensing/faq/
- S28 https://www.scoringnotes.com/reviews/scanning-the-current-omr-landscape/
- S30 https://www.scoringnotes.com/opinion/a-newcomers-quest-scoring-apps-for-drum-notation-on-a-budget/
- S31 https://support.newzik.com/en/support/solutions/articles/77000500859-what-am-i-allowed-to-do-with-digital-scores-
- S32 https://klang.io/help/what-kind-sheet-scan2notes/
- S33 https://klang.io/api/
- S35 https://help.flat.io/en/music-notation-software/omr/
- S36 https://flat.io/developers/docs/api/omr/
- S37 https://blog.flat.io/scan-sheet-music-flat-own-model/
- S38 https://www.opuscan.com/omr/
- S40 https://drumshed.studio/practice-drum-sheet-music
- S44 https://arxiv.org/html/2506.23009v1
- S47 https://arxiv.org/html/2605.10835
- S49 https://github.com/apacha/OMR-Datasets
- S50 https://link.springer.com/chapter/10.1007/978-3-032-36033-5_17
- S51 https://en.wikipedia.org/wiki/Percussion_notation
- S52 https://www.w3.org/2021/06/musicxml40/tutorial/percussion/
- S56 https://www.reddit.com/r/drums/comments/1hwly1p/ai_to_scan_and_play_sheet_music/ ；https://www.reddit.com/r/drums/comments/1bin5y1/need_software_that_will_read_and_play_drum_charts/ ；https://www.reddit.com/r/drums/comments/1m9uf01/is_there_a_software_that_i_can_upload_drum/ ；https://www.reddit.com/r/drums/comments/1no4b8f/any_good_drum_apps_that_can_play_my_sheet_music/ ；https://www.reddit.com/r/drums/comments/yut0uz/drum_sheet_pages_scan_software/
- S58 https://www.legislation.gov.uk/eudr/2001/29/article/5
- S59 https://www.authorsalliance.org/2024/09/05/hachette-v-internet-archive-update-second-circuit-court-of-appeals-rules-against-internet-archive/
- S60 https://www.copyright.gov/policy/section512/public-roundtable/transcript_05-02-2016.pdf
- S61 https://www.scoringnotes.com/news/muse-group-acquires-hal-leonard/
- S62 https://www.mpa.org/copying-under-copyright/
- S63 https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=J0070017&flno=51
- S66 https://www.llama.com/llama3_2/use-policy/

查證限制：musescore.com、musescore.org、drumforum.org 擋自動抓取，NoteVision 的鼓譜能力無法查證；Reddit 由瀏覽器取得。
