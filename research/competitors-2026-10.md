# 競品調查：寫譜軟體格局、Muse Group 與 AI 轉譜新進者（2026-10）

> 調查日期：2026-10-06
> 來源：Claude Code 對話 [C12]，以網路公開資料為主。
> 標記：**（官方）**＝公司自己公布；**（次級）**＝媒體、百科或第三方；**未驗證**＝找不到可靠來源；**評估**＝本文的判斷，不是事實。使用者人數、準確率這類數字都是廠商自己公布的，沒有第三方查證。

---

## 結論摘要（TL;DR）

- **近五年沒有新的寫譜軟體擠進主流。** 主流仍是 MuseScore Studio、Sibelius、Dorico；Finale 在 2024 年停止開發。新面孔都在相鄰的 AI 轉譜領域：Songscription（2025 年上線）、Klangio。
- **Muse Group 幾乎涵蓋整條產業鏈**：寫譜（MuseScore Studio、StaffPad、Noteflight）、樂譜分享（MuseScore.com）、播放音色（MuseSounds）、發行平台（MuseHub）、音訊（Audacity）、出版與零售（Hal Leonard、Sheet Music Plus）。商業模式就是 open-core：免費開源的桌面軟體吸引使用者，靠內容和服務收費。
- **MuseScore 已經推出免費的 AI 轉譜**：圖片轉譜 NoteVision（2025 年 7 月）、音訊轉譜 Audio-to-Score beta（2026 年 8 月，目前只有鋼琴和木吉他，沒提到鼓）。
- **Klangio 已和 Muse Group 合作**：Klangio 的 Transcription Studio 透過 MuseHub 發行，支援鼓，轉完可以匯出到 MuseScore 編輯。也就是說「上傳音訊 → 鼓譜轉譜 → 編輯」這條流程，我們的轉譜供應商已經和最大的老玩家一起提供了。
- **評估**：我們的差異化必須落在這條流程沒有的地方：鼓譜專屬的修正體驗、語音和 AI 改譜、beat 級 diff、使用者自己的 GitHub 版控。「AI 轉譜全部付費」的決定要面對免費對手的壓力。

---

## 1. 寫譜軟體主流格局

| 軟體 | 推出 | 現況 |
|---|---|---|
| MuseScore Studio | 2000 年代初 | 免費開源（GPL-3.0）。使用者人數遠多於其他三家的總和，但在專業演出、錄音、出版場合較少見（次級）[3] |
| Sibelius | 1990 年代 | 付費寫譜軟體的市場領導者（次級）[5] |
| Dorico | 2016 | 專業採用持續成長。Finale 停產時，MakeMusic 推薦用戶改用 Dorico（次級）[1][2] |
| Finale | 1988 | 1.0（1988）到 27.4（2023-11）；2024-08-26 宣布停止開發（次級）[1][6][7] |

近五年的變化都發生在既有產品身上（次級）[2][3]：

- MuseScore 4（2022-12）整個改寫，2024 年改名 MuseScore Studio；2025-12 的 4.6.4 加入 Cantai 的 AI 人聲。
- Dorico 2021 年推出 iPad 版，2025-04-30 推出 6.0。
- Muse Group 在 2023 年收購 Hal Leonard。

**評估**：新寫譜軟體擠不進來的原因是排版引擎的護城河（Dorico 由約 14 位前 Sibelius 成員花約 4 年做到 1.0，見 `research/frontend-tech-2026-10.md`）、專業用戶被出版社和學校授權綁住，以及免費的 MuseScore 社群太大。新進者都從相鄰的利基切入。

## 2. AI 轉譜新進者

| 產品 | 狀況 |
|---|---|
| **Songscription** | 2025-06 上線，以鋼琴最可靠，可以編輯樂譜，計畫支援吉他譜和整個樂團；TechCrunch 報導為 Reach Capital 領投的 pre-seed，並加入 Stanford StartX（次級）[8]。公司自稱 2025-11 已超過 15 萬名使用者（官方）[9]。另有來源寫 500 萬美元種子輪，和 TechCrunch 不一致，未驗證 |
| **Klangio** | 總部在德國 Karlsruhe。自稱完成 1,000 萬次轉譜、使用者超過 150 萬人（官方）[10]。Transcription Studio 支援鋼琴、吉他、**鼓**、貝斯、人聲、合成器、弦樂、管樂，匯出 PDF、MIDI、MusicXML，並可在 MuseScore 編輯；透過 MuseHub 發行（官方）[11][12] |

## 3. Muse Group

公司概況（次級）[4]：1998 年以 Ultimate Guitar 創立，2021 年收購 MuseScore、Audacity 後改名 Muse Group；總部在塞浦路斯 Limassol；員工 200 人以上（2024）。

| 類別 | 產品 | 說明 |
|---|---|---|
| 寫譜 | MuseScore Studio | 免費開源的桌面寫譜軟體，2017 年收購 |
| | StaffPad | 用筆和觸控寫譜，2021 年收購 |
| | Noteflight | 網頁寫譜，2023 年隨 Hal Leonard 併入 |
| 樂譜分享 | MuseScore.com | 樂譜分享社群；約 130 萬份樂譜、每日約 30 萬訪客（次級，年份不明）[3] |
| 播放音色 | MuseSounds Core | 免費音色包：管弦、合唱、鍵盤、吉他、打擊樂（官方）[14] |
| | MuseSounds Pro | 2026-01 推出的訂閱，和 Spitfire Audio、Vienna Symphonic Library、Audio Imperia 合作；年費 US$199、月費 US$19.99（官方）[13] |
| 發行平台 | MuseHub | 桌面版的音樂軟體商店，發行外掛、音色和 app（官方）[15] |
| 音訊 | Audacity | 開源音訊編輯器，2021 年收購 |
| | audio.com | 網頁音訊分享平台，2022 年推出 |
| 吉他與學習 | Ultimate Guitar、Tonebridge、AmpKit、SteadyTune、Crescendo、MuseClass | 吉他譜、效果器、調音、音樂教育 |
| 出版與零售 | Hal Leonard、Sheet Music Plus | 樂譜出版商與線上零售，2023 年收購 |

**評估**：商業模式和我們的 open-core 幾乎一樣：開源桌面軟體吸引使用者，收費的是音色訂閱、商店、樂譜販售、雲端。Hal Leonard 的正版樂譜目錄是新進者很難複製的護城河。

### 3.1 開源社群的教訓

2021 年收購 Audacity 後不久，Muse Group 修改隱私政策並計畫加入遙測選項，社群批評為「可能是間諜軟體」，又推出要求貢獻者授予不受限權利的 CLA；最後撤回遙測計畫並發表道歉。期間出現分支 Tenacity，GitHub 上累積超過 4,000 顆星（次級）[27][28][29]。

**評估**：我們的編輯器也要開源，商業化時要先把隱私和貢獻者條款講清楚。

### 3.2 組織與領導層

- 2026-06-03 宣布：Francisco Partners 結束自 2023 年起的少數股權投資，資金改由 J.P. Morgan 的信貸和公司現金補上；創辦人 Eugeny Naidenov 仍持有多數股權（次級）[25]。
- MuseScore Studio 領導層大量離開：軟體負責人 Martin Keary（2026-03）、產品負責人 Bradley Kunda、排版負責人 Simon Smith（2025）、MuseScore.com 產品負責人 Nick Moro（2025-09，去 Yousician）、策略負責人 Daniel Ray（2024 年底）。公司正在招新的產品負責人（次級）[25]。

## 4. MuseScore Studio 的功能

| 類別 | 功能 |
|---|---|
| 寫譜 | 所見即所得、譜表數不限、自動分譜、六線譜、打擊樂譜、跨譜表連桿、自動移調、和弦圖、多段歌詞（次級）[3]。4.7（2026-05）新增和弦括號、箭頭線、吉他 dive 記號、移調夾換算（官方）[16][17] |
| 打擊樂輸入 | 4.5（2025-03）全新打擊樂面板：8 欄打擊墊、標示鼓件名稱、快捷鍵和版面可自訂（官方）[18][19] |
| 播放 | MuseSounds（4.4 加入行進鼓隊音色庫）、VST3、SoundFont、混音台；Cantai AI 人聲（次級）[3][22][30] |
| 格式 | 原生 `.mscz`；MusicXML 4.0 匯入匯出；匯入 MIDI、Guitar Pro、Band-in-a-Box、Capella、Overture；**4.2 起支援 MEI**；匯出 PDF、SVG、PNG、音訊，4.7 可匯出 MP4；點字樂譜（次級）[3] |
| 擴充與分享 | 外掛；存到 MuseScore.com、發佈到 audio.com（次級）[3] |

## 5. Muse Group 的 AI

| 功能 | 狀況 |
|---|---|
| **NoteVision 圖片轉譜** | 2025-07 推出，在 MuseScore.com 上用。官方說是自家的 OMR 引擎，品質約 95%（沒說明怎麼量）；自 2025-07 起每天為網站新增超過 1,000 份樂譜；正在改成免費加付費，不限次數只給 MuseScore Pro Plus（官方）[21] |
| **Audio-to-Score 音訊轉譜** | 2026-08-17 推出 beta，MuseScore.com 網頁版，**免費**。上傳 30 MB 內的 MP3（約 3 分鐘）或 YouTube、audio.com 連結，輸出可在 MuseScore Studio 編輯的 MSCZ。模型「完全由 MuseScore 自行開發與訓練」。目前支援獨奏鋼琴和木吉他，計畫擴充樂器，**沒有提到鼓**（官方）[20] |
| 聽歌找譜 | 手機 app，用 Apple 的 ShazamKit（官方）[20] |
| AI 人聲 | 和 Cantai 合作（次級）[22][30] |

組織線索：

- 曾招聘負責 OMR 系統的機器學習工程師（PyTorch、FastAPI 推論 API、資料管線），職缺已關閉（次級）[24]。
- 官網 62 個職缺中，AI 相關的只有技術長辦公室底下的「AI Engineering Architect」和「Full Stack Producer（Music Notation, Audio ML）」；官網沒有描述獨立的 AI 部門（官方）[23]。
- 公司表示要把 AI 放進樂譜、音訊、轉譜、學習、內容加值和創作；目標是把 PDF、照片、錄音、MIDI、哼唱都轉成可編輯的樂譜（次級）[25]。
- **評估**：AI 人力集中在技術長辦公室和 MuseScore.com 網站側；動機偏向「讓網站有更多樂譜」以帶動訂閱，編輯流程裡的 AI（修正轉譜、語音改譜）短期內未必是重點。

### 5.1 使用者對 AI 的態度（Muse Group 調查，2026-04）

調查 1,200 位美國音樂人（次級）[26]：

| 項目 | 比例 |
|---|---|
| 願意使用 AI 工具 | 78% |
| 已經在用 AI 做音樂 | 70% |
| 願意接受 AI 直接生成整首音樂 | 18%，而且前提是能引導、能完整編輯 |

常見用途：去除雜音 54%、發想點子 46%、分離音軌 38%、修正音準 35%。

**評估**：音樂人歡迎輔助性 AI、在意可編輯性，支持我們「修改既有的譜」的定位。

## 6. 對我們的影響（評估）

1. **轉譜流程已被組合出來**：Klangio（支援鼓）＋ MuseHub 發行＋ MuseScore 編輯。差異化要放在：鼓譜專屬的修正體驗（低信心處給候選並附音訊）、語音和 AI 改譜、beat 級 diff、使用者自己的 GitHub 版控。
2. **收費設計的壓力**：MuseScore 的音訊轉譜和圖片轉譜都有免費方案。若之後免費支援鼓，「AI 轉譜全部付費、沒有免費額度」會直接面對免費對手。收費的價值應該放在修正和 AI 改譜，而不是轉譜本身。
3. **供應商風險**：Klangio 同時在和最大的老玩家合作。轉譜引擎要保留可替換的介面，並盡快確認 Klangio 服務條款（筆記第 15 節第 2 項）。
4. **互通與定位**：MuseScore 支援 MusicXML 4.0 和 MEI，我們每次 commit 產生的 `score.musicxml` 可以直接用 MuseScore 開。定位成和 MuseScore 互補，比取代它合理。
5. **可能的合作管道**：MuseHub 會發行第三方 app（例如 Klangio），我們的 Mac app 理論上也可以走這條路；上架條件未驗證。
6. **版權**：轉譜商業歌曲可能涉及衍生作品，而大量流行歌的樂譜授權在 Hal Leonard 手上。和筆記第 15 節第 16 項（目標客群）直接相關。
7. **授權選擇**：MuseScore 是 GPL-3.0。我們的編輯器開源授權若和 GPL 相容，理論上能參考或沿用它的部分程式碼；這點可以在決定開源授權時一併考慮（筆記第 15 節第 20 項）。

---

## 7. 來源清單（全部存取於 2026-10-06）

1. Scoring Notes：MakeMusic ends development and availability of Finale — https://www.scoringnotes.com/news/makemusic-ends-development-and-availability-of-finale/
2. Wikipedia：Dorico — https://en.wikipedia.org/wiki/Dorico
3. Wikipedia：MuseScore — https://en.wikipedia.org/wiki/MuseScore
4. Wikipedia：Muse Group — https://en.wikipedia.org/wiki/Muse_Group
5. Wikipedia：Sibelius (scorewriter) — https://en.wikipedia.org/wiki/Sibelius_(scorewriter)
6. Wikipedia：Finale (scorewriter) — https://en.wikipedia.org/wiki/Finale_(scorewriter)
7. Digital Music News：MakeMusic Is Sunsetting Finale After 35 Years — https://www.digitalmusicnews.com/2024/08/26/makemusic-sunsetting-finale-music-notation-software/
8. TechCrunch：Songscription launches an AI-powered Shazam for sheet music — https://techcrunch.com/2025/06/30/songscription-launches-an-ai-powered-shazam-for-sheet-music
9. Songscription：Best Free Music Transcription Software in 2026 — https://www.songscription.ai/blog/best-free-music-transcription-software-2026
10. Klangio — https://klang.io/
11. MuseHub：Klangio partner page — https://www.musehub.com/partner/klangio
12. MuseHub：Music Transcription Studio — https://www.musehub.com/pt-pt/app/music-transcription-studio
13. Muse Group：Introducing MuseSounds Pro — https://www.mu.se/posts/musesounds-pro-combines-leading-sound-libraries-in-one-subscription
14. MuseHub：MuseSounds Core — https://www.musehub.com/bundle/musesounds-core
15. MuseHub Support：What is MuseHub? — https://support.musehub.com/en/articles/15070583-what-is-musehub
16. MuseScore：MuseScore Studio 4.7 is now available — https://musescore.org/en/4.7
17. Scoring Notes：MuseScore Studio 4.7 — https://www.scoringnotes.com/news/musescore-studio-4-7/
18. MuseScore：MuseScore Studio 4.5 is now available — https://musescore.org/en/4.5
19. Scoring Notes：MuseScore Studio 4.5 — https://www.scoringnotes.com/news/musescore-studio-4-5/
20. Muse Group：MuseScore Introduces New Smart Audio Recognition Features — https://www.mu.se/posts/musescore-audio-score-features
21. Muse Group：MuseScore's AI-Powered Converter — https://www.mu.se/posts/ai-powered-score-converter
22. Sound On Sound：MuseScore Studio gains Cantai integration — https://www.soundonsound.com/news/musescore-studio-gains-cantai-integration
23. Muse Group Careers — https://www.mu.se/vacancies
24. ML Engineer at Muse Group — https://wantapply.com/ml-engineer-at-muse-group?from=company
25. Scoring Notes：Private equity exits Muse Group amidst MuseScore Studio leadership changes — https://www.scoringnotes.com/news/private-equity-exits-muse-group-amidst-musescore-studio-leadership-changes/
26. Music Ally：Muse Group says musicians have 'clear boundaries' on AI usage — https://musically.com/2026/04/08/muse-group-says-musicians-have-clear-boundaries-on-ai-usage/
27. Hackaday：Muse Group Continues Tone Deaf Handling Of Audacity — https://hackaday.com/2021/07/13/muse-group-continues-tone-deaf-handling-of-audacity/
28. gHacks：Audacity publishes updated Privacy Policy and an Apology — https://www.ghacks.net/2021/07/23/audacity-publishes-updated-privacy-policy-and-an-apology/
29. The Register：Tenacity maintainer quits — https://www.theregister.com/2021/07/07/tenacity_maintainer_quits_4chan_harassment/
30. Rekkerd：MuseScore Studio brings lyrics to life with AI vocals powered by Cantai — https://rekkerd.org/musescore-studio-brings-lyrics-to-life-with-ai-vocals-powered-by-cantai/
