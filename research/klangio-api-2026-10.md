# Klangio API 調研（2026-10-22）

> 只讀公開資料，沒有註冊帳號，也沒有呼叫付費端點。官方 OpenAPI 規格：Swagger https://api.klang.io/open_api ，JSON https://api.klang.io/openapi.json （下文簡稱 [OAS]）。查不到的寫「沒有查到」，不猜。

## 結論

- 規格裡有鼓的轉譜（`model=drums`），但 API 介紹頁寫轉譜只支援 piano、guitar、bass、vocal，兩邊矛盾，要向 Klangio 確認。
- 未量化 MIDI 和原始音訊對齊，可以拿來算每一擊、每一拍在錄音裡的時間，不用自己做 onset 對齊。
- 按請求次數計費。免費方案每檔只能 15 秒，所以實測要把錄音切成 15 秒的片段。
- 一般使用條款 §12.5 禁止用輸出訓練轉譜 AI。API 的另行條款沒有公開，將來要訓練自己的模型前要先談。

## 1. 端點

- 送出：`POST /transcription?model=drums`，multipart 上傳 `file`，用 `outputs[]` 指定要哪些輸出；認證用 header `kl-api-key`。[OAS]
- 非同步：回傳 `job_id`、`status_endpoint_url`、`deletion_date`。輪詢 `GET /job/{id}/status`，狀態有 IN_QUEUE、IN_PROGRESS、COMPLETED、FAILED、CANCELLED、TIMED_OUT。也可以帶選填的 `webhook_url`，但 payload 格式沒有文件。[OAS]
- 長度上限：Basic 15 秒、Startup 和 Business 300 秒、Enterprise 600 秒。https://klang.io/api/
- API 的檔案大小上限、支援的輸入格式：沒有查到（規格只寫 octet-stream）。App 的說明頁列了 wav、mp3、aiff、ogg、flac、m4a、mp4，上限 15 分鐘、100 MB，但那是 App 的規則。https://klang.io/help/file-limitations/
- 矛盾：API 介紹頁寫轉譜「僅 piano／guitar／bass／vocal」，但規格的 enum 有 `drums`。

## 2. 輸出

- 可選：`mxml`、`midi`（未量化）、`midi_quant`、`pdf`、`gp5`、`json`。[OAS]
- 逐擊時間：說明頁寫未量化 MIDI 的音符「perfectly in sync with the original audio」，秒數要自己從 MIDI 的 tick 和 tempo 換算。https://klang.io/help/quantized-unquantized-midi-difference/
- JSON 的格式沒有公開；裡面有沒有 onset 秒數、信心分數：沒有查到。
- 轉譜輸出有沒有附 tempo 或拍點：沒有查到。另有 `POST /beat-tracking` 端點，回傳 beat、downbeat、BPM、拍號，每次扣 1 次額度。[OAS]、https://klang.io/api/
- 一次要多種輸出算幾次額度：沒有查到，要實測。

## 3. 可辨識的鼓件

kick、snare、多顆 tom、hi-hat（開、閉）、crash、ride、cowbell。https://klang.io/help/what-music-transcribe/ ghost note 和力度：沒有查到。

## 4. 價格

按請求次數計費，不是按分鐘。https://klang.io/api/

| 方案 | 月費 | 含請求數 | 超額單價 | 單檔上限 |
|---|---|---|---|---|
| Basic | $0 | 50 | 不能超額 | 15 秒（每分鐘 1 次） |
| Startup | $99 | 500 | $0.20 | 300 秒 |
| Business | $499 | 3,000 | $0.17 | 300 秒 |
| Enterprise | 洽詢 | 10,000 | $0.10 | 600 秒 |

一般使用條款 §5.2.3 說 API 屬於「separate business services subject to separate terms」，這份另行條款沒有公開。https://klang.io/terms/

## 5. 使用條款（一般條款，是否同樣適用 API 未確認）

https://klang.io/terms/

- 長期保存輸出：沒有禁止，但 API 的 job 有 `deletion_date`，結果要自己下載保存。
- 顯示給我們的使用者：沒有明文禁止。§12.4「僅限私人非商業用途，原創作品例外」、§7.5 未經書面同意不得把 Software 提供給第三方，這兩條是消費者條款，對 API 是否適用不明。
- 訓練模型：§12.5「They must not be used to train music transcription AI systems or similar technologies」。
- 競品條款：沒有明文禁止；§7.4 禁止逆向工程。

## 6. 準確度與 Muse Group

- 公開的鼓轉譜準確度數字：沒有查到，官方只有免責聲明。https://apps.apple.com/app/id6717586517
- 一般使用條款 §10.2 把 MuseHub 列為付款或發行通路之一；MuseHub 上有 Transcription Studio（第三方資料：https://www.musehub.com/app/music-transcription-studio 、https://www.soundonsound.com/news/klangio-launch-transcription-studio ）。和 API 有關的合作細節：沒有查到。

## 7. Scan2Notes（圖片轉譜）

沒有 API：規格裡沒有影像相關端點，API 頁和申請表也沒有。https://klang.io/scan2notes/

## 要向 Klangio 確認

- API 是否正式支援 drums
- JSON 的格式，有沒有信心分數
- API 的另行條款，特別是 §12.5 的訓練限制
- API 的檔案大小上限和支援格式
- 一次要多種輸出算幾次額度
