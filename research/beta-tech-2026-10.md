# beta 的技術調研：內建 git、GitHub 登入、鼓的音色（2026-10-22）

> 以官方文件、repo 和授權檔為主要來源。查不到的寫「沒有查到」；推論會標明。

## 1. 內建 git（不讓使用者另外安裝）

需要的操作：init、add＋commit、status、log、讀出某一版的檔案、把舊檔還原成新的 commit、設定 remote、用 token push、clone、fetch＋fast-forward。不需要 merge、branch、rebase、SSH、LFS。

### isomorphic-git（選用）

- MIT 授權。最新版 v1.44.3（2026-10-17）。原作者已離開，目前由兩位志工維護，主要做 code review 和回覆 issue。
- 需要的操作都有：`init`、`add`、`commit`、`statusMatrix`／`status`、`log`、`readBlob({oid, filepath})`、`checkout({ref, filepaths, force})`、`addRemote`、`push`＋`onAuth`、`clone`、`fetch`＋`fastForward`（或 `pull({fastForwardOnly:true})`）。
- 可以換成自己的檔案存取（實作 readFile、writeFile、unlink、readdir、mkdir、rmdir、stat、lstat）和自己的網路請求（提供 `request({url,method,headers,body})`，回傳 `{statusCode, headers, body}`）。
- GitHub 不支援 CORS，在瀏覽器裡要設 `corsProxy`。推論（官方沒寫）：網路請求轉給 Swift 的 URLSession（之後 Windows 轉給 C# 的 HttpClient）發出，就不經過 WebView 的網路層，不受 CORS 限制。
- GitHub token：`onAuth` 回傳 `{username: token}`；GitHub App 的 token 用 `x-access-token` 當 username。
- 來源：https://github.com/isomorphic-git/isomorphic-git 、https://isomorphic-git.org/docs/en/http 、https://isomorphic-git.org/docs/en/fs 、https://isomorphic-git.org/docs/en/onAuth 、https://isomorphic-git.org/docs/en/readBlob

### libgit2（沒選）

- GPLv2 加連結例外：連結進閉源或開源 App 都可以，修改 libgit2 本身仍受 GPLv2 約束。最新版 v1.9.7（2026-08-13）。
- C API 涵蓋需要的操作，但沒有 pull，fast-forward 要自己組。HTTPS 在 macOS 用系統的 SecureTransport，不用另外帶 OpenSSL。
- Swift 的封裝套件都不能直接用：SwiftGit2 最後一次 release 是 2019 年，沒有 push；SwiftGitX（MIT，2025-12）有 push，但沒有帶認證，無法用 token push。實際上要直接呼叫 C API。
- C# 的 LibGit2Sharp（MIT）0.32.0（2026-07-23）維護良好。
- 來源：https://github.com/libgit2/libgit2/blob/main/COPYING 、https://github.com/SwiftGit2/SwiftGit2 、https://github.com/ibrahimcetin/SwiftGitX 、https://github.com/libgit2/libgit2sharp

### 其他

- wasm-git（libgit2 編成 WebAssembly）：只有命令列形式的介面，clone 時伺服器必須允許 CORS，沒有查到可以換網路請求的方法。https://github.com/petersalomonsen/wasm-git
- gitoxide（Rust）：還不支援 push。https://github.com/GitoxideLabs/gitoxide

## 2. GitHub 登入

### 事實

- **不能用 API 替使用者建帳號。** 服務條款 B.3：「You must be a human to create an Account」，禁止 bot 或自動化註冊。授權頁的 `allow_signup` 預設為 true，沒有帳號的人會在授權流程裡看到註冊入口。註冊要驗證 email。https://docs.github.com/en/site-policy/github-terms/github-terms-of-service
- **Google、Apple 帳號註冊**：Google 2025-07-15 正式推出，Apple 2025-10-07 推出。https://github.blog/changelog/2025-07-15-social-login-with-google-is-now-generally-available/ 、https://github.blog/changelog/2025-10-07-github-now-supports-social-login-with-apple/
- **PKCE**：2025-07 起 OAuth App 和 GitHub App 都支援（只接受 S256）。但網頁授權換 token 時 client secret 仍然必填，所以要有一個小後端代為換 token。https://github.blog/changelog/2025-07-14-pkce-support-for-oauth-and-github-app-authentication/
- **device flow**：不需要 secret，但使用者要到 `github.com/login/device` 手動輸入代碼。token 頁建議桌面 App 用 device flow；best practices 頁則說 PKCE 比較好，除了命令列、IoT、沒有瀏覽器的環境以外不要開 device flow（有釣魚風險）。採用 best practices 的說法，因為是比較新的安全指引。https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/best-practices-for-creating-a-github-app
- **安裝時一併授權**：GitHub App 可以設定「Request user authorization during installation」，一次往返就完成安裝和授權。限制：不能指定 `redirect_uri`、推論無法加 PKCE、不能設 Setup URL。https://docs.github.com/en/apps/using-github-apps/installing-a-github-app-from-a-third-party
- **App 替使用者建 repo**：`POST /user/repos` 支援 GitHub App 的使用者 token，需要 Administration 寫入，或 2026-10-13 新增的 Repository creation 權限（範圍最小）。App 建立的 repo 會自動取得存取權。https://github.blog/changelog/2026-10-13-github-app-improvements-for-least-privilege-and-management/ 、https://docs.github.com/en/rest/repos/repos#create-a-repository-for-the-authenticated-user
- **最小權限**：Repository access 選「Only select repositories」，Contents 讀寫。https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app
- **token 效期**：access token 8 小時，refresh token 6 個月；refresh 後舊的兩個 token 都失效，要原子性地寫回。用網頁授權取得的 token，refresh 時要 client secret。存在 Keychain。https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens

### 建議流程

GitHub App 設定：Contents 讀寫、Repository creation 寫入、開啟會過期的 token、callback 設為 App 的 custom scheme。token 交換和續期由 Cloudflare Worker 處理。

1. 使用者按「備份到 GitHub」。
2. App 用 `ASWebAuthenticationSession` 開啟授權頁（帶 PKCE、`state`、`allow_signup=true`）。
3. **使用者**：沒有帳號的人點 Sign up，選 Google 或 Apple 或填 email，再輸入 email 驗證碼。
4. **使用者**：按 Authorize，回到 App。
5. App 經由 Worker 換到 token，存進 Keychain；查 `GET /user/installations`，還沒安裝就開啟安裝頁。
6. **使用者**：選個人帳號，按 Install。
7. App 用 `POST /user/repos` 建立私有 repo，完成第一次 push。

使用者要親自做的只有第 3、4、6 步。

### 要實測

- 從安裝頁直接註冊後，能不能回到安裝流程？可以的話，第 2–6 步能合成一次。
- 安裝完之後，會不會再跳出一次授權頁？
- 選「Only select repositories」時，能不能一個 repo 都不選就完成安裝？

## 3. 鼓的音色

要求：可以同時放進開源版和商業版的 App；用 `AVAudioUnitSampler` 播放（可載入 aupreset、DLS/SF2、EXS24 和音訊檔，不含 SFZ）。

| 名稱 | 授權 | 格式／大小 | 力度層 | Hi-hat |
|---|---|---|---|---|
| Big Rusty Drums（Karoryfer，選用） | CC0 1.0 | SFZ＋FLAC，約 600 MB | 小鼓中心 10 層，有 round robin | closed、open 各 6 層，另有 pedal、brush |
| Virtuosity Drums（Versilian Studios＋Karoryfer） | CC0 1.0 | SFZ＋FLAC，6 支麥克風，約 1.2 GB | 小鼓中心每支麥克風 36 層 | closed、half、3/4、open、pedal、splash |
| Naked Drums（Wilkinson Audio） | CC BY 4.0（要署名） | SFZ＋FLAC，約 1.25 GB | 最多 5 層，10 個 round robin | 用 CC4 控制開合 |
| MuseScore_General | MIT（要保留 FluidR3 的版權聲明） | SF2 208 MB／SF3 35.9 MB | 沒有查到 | GS／GM 鼓組 |
| GeneralUser GS v2.0.3 | 自訂授權 | SF2 約 32 MB | 沒有查到 | GS／GM 鼓組 |

- 五套都沒有專門錄 ghost note 的樣本，只能用小力度的樣本代替。
- GeneralUser GS 的作者說無法完全確定所有樣本的來源，商業使用要自行評估。
- SFZ 格式要先轉檔，或用 `loadAudioFiles` 逐一載入。
- 不適用：Salamander Drumkit 是 CC BY-SA 3.0，重新散布要 share-alike。
- 來源：https://github.com/sfzinstruments/karoryfer.big-rusty-drums 、https://github.com/sfzinstruments/virtuosity_drums 、https://github.com/sfzinstruments/WilkinsonAudio.NakedDrums 、https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/ 、https://github.com/mrbumpy409/GeneralUser-GS 、https://github.com/endolith/Salamander-Drumkit 、https://developer.apple.com/documentation/avfaudio/avaudiounitsampler
