# KidQuest 雲端同步設定指南（M9 / Supabase + Google 登入）

整合程式碼會在你完成以下設定、並由我（Agent）在核准後接上 `index.html` 後生效。
你需要做的是「開好 Supabase 專案、拿到兩個值」。anon key 是公開金鑰，搭配 RLS 是安全的。

## 1. 建立 Supabase 專案
1. 到 https://supabase.com 註冊並 **New project**（免費方案即可）。
2. 記下專案的 **Project URL** 與 **anon public key**：
   - Project Settings → API → `Project URL` 與 `anon` `public` key。

## 2. 啟用 Google 登入
1. Supabase → Authentication → Providers → **Google** → 開啟。
2. 依畫面指示在 Google Cloud Console 建立 OAuth 用戶端：
   - 取得 **Client ID / Client Secret** 填回 Supabase。
   - Authorized redirect URI 填 Supabase 給的 callback（形如 `https://<ref>.supabase.co/auth/v1/callback`）。
3. 在 Supabase → Authentication → URL Configuration 把你部署遊戲的網址（含 `http://localhost:8000` 測試用）加入 **Redirect URLs**。

> 註：未滿 13 歲的孩子請使用家長以 **Google Family Link** 管理的帳號，並確認符合你所在地法規。

## 3. 建立資料表與安全規則
1. Supabase → SQL Editor → 貼上 `supabase/schema.sql` 全文 → **Run**。
2. 確認 `public.saves` 已建立，且 Authentication → Policies 顯示三條 policy、RLS 為 **Enabled**。

## 4. 填入前端設定
編輯專案根目錄的 `cloud-config.js`（核准後我會建立此檔的範本）：
```js
window.KIDQUEST_CLOUD = {
  url: "https://<你的-ref>.supabase.co",
  anonKey: "<你的 anon public key>"
};
```
留空或不存在 → 遊戲自動維持純本機（離線可玩、測試不受影響）。

## 5. 驗證
- 用 http(s) 提供遊戲（PWA/OAuth 不支援 `file://`）：`python -m http.server 8000`。
- 管理者模式 → ☁️ 雲端存檔 → 用 Google 登入 → 進度應上雲。
- 換一台裝置 / 另一個瀏覽器用**同一帳號**登入 → 進度應還原。
- 用**不同帳號**登入 → 看到的是各自獨立的進度（RLS 隔離）。

完成 1–4 後告訴我，並把 `Project URL` 與 `anon key` 給我，我就接上整合並跑驗證。
