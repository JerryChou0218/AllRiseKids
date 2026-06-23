# AllRiseKids

AllRiseKids 是給 6-15 歲孩子使用的每日任務 RPG。孩子完成現實生活中的任務後取得 EXP 與金幣，逐步解鎖技能、裝備、傳送門挑戰、成就、排行與物品交換；家長負責帳號管理、任務審核、真實獎勵與安全設定。

## 目前功能

- 家長 Gmail 登入模型：一位家長最多管理 4 個孩子。
- 孩子模式：首頁、任務、冒險、獎勵、角色狀態。
- 家長模式：審核中心、任務管理、獎勵管理、成長紀錄、設定、除錯/平衡工具。
- 家長測試模式：家長可直接查看孩子的全部頁面，包括技能、物品、商店、錢包、成就與排行，不受孩子等級解鎖限制。
- PWA：可部署到 Vercel，支援安裝與 service worker 快取策略。
- 桌面版：Electron 可攜版，存檔隨資料夾移動。
- 雲端同步：Supabase + Google OAuth 設定存在時啟用；未設定時維持純本機模式。

## 執行

```bash
npm install
npm test
npm run test:all
```

本機瀏覽器測試：

```bash
python -m http.server 8000
```

然後開啟 `http://localhost:8000`。

桌面版：

```bash
npm start
npm run pack
```

打包後的輸出目錄為 `dist/AllRiseKids-win32-x64/`。

## 資料與相容性

- 主要孩子進度仍使用既有 key：`kidquest_data`。
- 家長/孩子帳號資料仍使用既有 key：`kidquest_cloud` 與 `kidquest_accounts`。
- 桌面版存檔仍保留 `kidquest-save.json` 檔名，避免破壞既有可攜版存檔。
- 品牌名稱已統一為 AllRiseKids，但舊資料 key 暫不改名。

## 雲端設定

公開安全設定放在 `cloud-config.js`。若 `supabaseUrl` 與 `supabasePublishableKey` 有值，前端會啟用 Supabase + Google OAuth；否則使用本機模式。

資料庫 schema 在：

```text
supabase/schema.sql
```

詳細設定參考：

```text
docs/cloud-setup.md
```

## 測試

完整測試：

```bash
npm run test:all
```

常用單項：

```bash
node test/smoke.js
node test/accounts.test.js
node test/parent-queue.test.js
node test/cloud-store.test.js
node test/browser-responsive.test.js
```

## 部署

Vercel 靜態部署使用：

```text
vercel.json
```

線上入口：

```text
https://allrisekids.vercel.app
```
