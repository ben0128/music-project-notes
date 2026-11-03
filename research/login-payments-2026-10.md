# 登入與收款的調研：Apple 的規定、Sign in with Apple、Supabase（2026-10-27）

> 以 Apple 官方頁面為主要來源；美國區的抽成現況只查到新聞和部落格，Supabase 官網在這個環境連不上（被網路政策擋），兩者都標明是二手資料。查不到的寫「沒有查到」。

## 1. 在網站付款、App Store 導過去可不可以

來源：App Review Guidelines https://developer.apple.com/app-store/review/guidelines/ （頁面沒有標更新日期，2026-10-25 讀取）

- **3.1.1**：要在 App 裡解鎖功能（訂閱、點數、進階內容、完整版）一定要用內購；不能用自己的機制解鎖，例如 license key、QR code。兌換數位商品的禮物卡、優惠券，在 App 裡賣也只能用內購。
- **3.1.1(a)**：特定地區可以申請 StoreKit External Purchase Link Entitlement 放外部購買連結。「In all other storefronts, except for the United States storefront, ... apps and their metadata may not include buttons, external links, or other calls to action that direct customers to purchasing mechanisms other than in-app purchase.」美國區不用申請就可以放。
- **3.1.3**：在 App 以外（例如 email）告訴使用者其他付款方式可以：「Developers can send communications outside of the app to their user base about purchasing methods other than in-app purchase.」
- **3.1.3(a) Reader apps**：限雜誌、報紙、書、音訊、音樂、影片的「已購內容存取」，鼓譜編輯工具不屬於這類。
- **3.1.3(b) Multiplatform Services**：使用者在別的平台或網站買的東西，可以在 App 裡用，「provided those items are also available as in-app purchases within the app」。
- **3.1.3(f) Free Stand-alone Apps**：限 VoIP、雲端儲存、email、網站代管這類付費網頁工具的免費配套 App，App 裡不能有購買，也不能引導到外面買。

推論：
- 從自己網站發行的 Mac App（Developer ID、公證過的 DMG）不經過 App Store，不受這些規定限制，Apple 不抽成。
- 上架 App Store 的版本，台灣區要用內購，App 和商店頁都不能提網站比較便宜或放購買連結；網站版可以比較便宜，在網站、email、社群上告訴使用者沒問題。
- App Store 版的兌換碼不能自己做（3.1.1），要改用 Apple 的 offer code，或讓使用者到網站兌換。

### 美國區的抽成（二手資料）

- 2025 年法院判決後，美國區可以放外部購買連結。Ninth Circuit 2025-12 大致維持原判，但允許 Apple 之後收「必要成本」的費用，抽成多少發回地方法院重審。
- 2026-08 Apple 在重審中提出：外部連結的購買抽 15%，Small Business Program 5%；Epic 表示會反對。還沒定案。
- 來源：https://techcrunch.com/2026/08/14/apple-proposes-to-take-a-15-cut-of-purchases-made-outside-the-app-store/ 、https://appleinsider.com/articles/26/08/13/apples-latest-commission-rates-for-external-app-store-purchases-havent-satisfied-epic

## 2. Sign in with Apple

- **原生登入只開放給上架的 App。** Apple 的「Supported capabilities (macOS)」表格（https://developer.apple.com/help/account/reference/supported-capabilities-macos ，2026-10-25 讀取 HTML）：Sign in with Apple 在「ADP」欄打勾，「Developer ID」欄沒有勾。也就是從自己網站發行的 Mac App 不能用 AuthenticationServices 的原生 Sign in with Apple。舊的 Apple 開發者論壇回覆說法一致：https://developer.apple.com/forums/thread/129263
- **網頁登入流程。** 「Configure Sign in with Apple for the web」（https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web ）：建立 Services ID，綁一個已開啟 Sign in with Apple 的 primary App ID，登記網域和 return URL（個人帳號最多 10 個）。頁面沒有提到 App 的發行方式。推論：DMG 版用 `ASWebAuthenticationSession` 開 Apple 的網頁登入，回到我們的後端換 token。
- **client secret 的效期。** 網頁流程換 token 要用 .p8 金鑰簽一個 JWT 當 client secret，效期最長 6 個月（15,777,000 秒），到期要重新產生。這是依 Apple 文件「Creating a client secret」的已知內容，這次沒有讀到頁面原文。

## 3. Supabase Auth（二手資料）

- 原生 Sign in with Apple（iOS、macOS）和 Google：App 拿到 ID token 後呼叫 `signInWithIdToken`，Supabase 驗證後建立或連結帳號。Google 要另外設定 web client ID。來源（搜尋結果摘要）：https://supabase.com/docs/guides/auth/social-login/auth-apple 、https://supabase.com/docs/reference/swift/auth-signinwithidtoken 、https://supabase.com/blog/native-mobile-auth
- Apple 的網頁 OAuth 流程（Services ID）Supabase 也支援，見上面的 auth-apple 文件。
- 免費方案：專案 7 天內活動很少就會暫停，90 天內可以恢復；付費方案不會暫停。來源：https://supabase.com/docs/guides/platform/free-project-pausing
- 價格和 MAU 上限：這次沒有查到（官網連不上）。

## 要再確認

- Supabase 目前的價格、MAU 上限，beta 用免費方案能不能撐（會不會被暫停）。
- Apple「Creating a client secret」的原文。
- 美國區外部購買的抽成，等重審結果。
