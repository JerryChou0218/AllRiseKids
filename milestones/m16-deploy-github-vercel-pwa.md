# Milestone 16: 雲端部署上線（GitHub + Vercel）+ PWA 安裝 QR code

## Context
前一個里程碑：15（家長控制與裝備賣回，complete）。M1–M15 除 M9（雲端同步，使用者暫緩）外皆 complete。
使用者需求：把遊戲放上 GitHub 並部署到 Vercel 正式環境，讓孩子用手機掃 QR code 後「假裝安裝在桌面」——即透過既有 PWA 的「加入主畫面」，從主畫面全螢幕開啟，像真正的 App。

## Objective
將單檔網頁遊戲發佈為公開可存取的網站，並提供一個可列印/分享的 QR code 頁面，引導 iOS/Android 把遊戲加入主畫面成為 PWA。瀏覽器版、桌面 Electron 版、本機存檔行為均不受影響。

## Scope
- **版本控管**：`git init` 既有、建立 GitHub repo `JerryChou0218/AllRiseKids`（public）、推送全部歷史。
- **部署**：Vercel 正式環境，正式網址 `https://allrisekids.vercel.app`；連結 GitHub repo，之後 `git push` 自動重新部署。
- **`vercel.json`**：`builds` 由只含 `index.html` 改為 `**/*`，讓 `install.html`、圖示、`manifest`、`sw.js` 等所有靜態檔都被提供（修 404）。
- **`.vercelignore`**：排除 `node_modules`、`dist`、`electron`、`refs`、`supabase`、`test`，避開 Vercel 100MB 上傳上限（node_modules 563MB + dist 268MB）。
- **PWA 圖示**：用 `sharp` 由 `icon.svg` 產出 `icon-192.png` / `icon-512.png`；`manifest.webmanifest` 加入 PNG 圖示（iOS Safari 不支援 SVG 圖示，需 PNG 才能正確顯示主畫面圖示）。
- **安裝頁**：新增 `install.html`——含 QR code（指向 allrisekids.vercel.app）與 iOS（Safari 分享→加入主畫面）/ Android（Chrome 加入主畫面）分步驟說明，含列印樣式。

## Out of Scope
- 自訂網域（沿用 *.vercel.app 子網域）。
- 帳號制雲端同步（M9，仍暫緩）——本里程碑為純前端靜態部署，存檔仍是本機 localStorage / 桌面檔案。
- 桌面 Electron 版打包（dist 不上傳，桌面版照舊在地端打包）。

## Technical Approach
- 用 `gh` CLI（winget 安裝）建 repo 並 `--push`；`gh auth login` 由使用者於終端機完成（瀏覽器授權）。
- Vercel CLI `vercel --yes --prod`；專案名須全小寫（`allrisekids`）。
- `vercel.json` 用 `@vercel/static` builder；`builds: **/*` 確保非 index 檔案一併部署（原本只 build index.html 導致 install.html 等 404）。

## Acceptance Criteria
- [x] 程式碼推送到 GitHub public repo（`JerryChou0218/AllRiseKids`），含 M1–M15 完整 commit 歷史。
- [x] Vercel 正式環境部署成功，`https://allrisekids.vercel.app` 可開啟並正常遊玩。
- [x] `https://allrisekids.vercel.app/install.html` 可開啟，含可掃描 QR code 與 iOS/Android 加入主畫面步驟（修正 builds 設定後不再 404）。
- [x] `manifest.webmanifest` 含 192/512 PNG 圖示（iOS Safari 主畫面圖示相容）。
- [x] 既有行為不受影響：`smoke.js` 77/77、`accounts.test.js` 10/10、`desktop-save.test.js` 4/4 全綠。

## Verification Notes
- 部署過程修正了兩個既有測試回歸（M15 之後 commit 引入、當時未被攔到）：
  1. `accounts.test.js` 的 DOM mock 缺 `focus()` → 補 `focus(){}` stub（產品碼 `setpass-inp` 自動聚焦）。
  2. `setAccountPassword` 在 commit `5ad5ac9`（修 Electron prompt 失效）改為 modal 流程，但測試仍用舊 prompt 假設 → 改為設定 `setpass-inp` 值並呼叫 `submitSetPass()`。產品碼正確，測試過時。
- 修正後 accounts 回到 10/10，與 M15 歷史一致。

## Risk Notes
- **公開 repo**：遊戲為純前端、無祕鑰，可公開。日後若接 M9（Supabase）需注意金鑰不得進 repo。
- **Vercel 100MB 上傳上限**：`node_modules`/`dist` 必須留在 `.vercelignore`，否則部署失敗。
- **PWA「安裝」本質**：iOS/Android 的「加入主畫面」是 PWA 標準行為，非上架 App Store；圖示與全螢幕已透過 manifest（standalone）達成。
