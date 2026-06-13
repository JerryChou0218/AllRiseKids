# Milestone 9: 帳號制雲端同步（Supabase + Google 登入）

## Context
前一個里程碑：8（匯出/匯入輕量轉移，complete）。
使用者決定：**Supabase** 後端、**每位小孩用自己的 Google 帳號登入**、**不同小孩進度各自獨立儲存**。
目前系統狀態：純本機 localStorage（鍵 `kidquest_data`）+ PWA 離線 + 匯出/匯入。

## Objective
讓每個小孩用自己的 Google 帳號登入後，進度自動上雲並跨裝置同步；不同帳號的存檔彼此隔離。未登入時行為與現在完全相同（純本機、可離線）。

## 資料模型
- 一個 Google 帳號 = 一個 Supabase Auth 使用者（`auth.users`）= 一個小孩 = 一筆存檔列。
- 資料表 `saves`：`user_id (uuid, PK, FK→auth.users)`、`data (jsonb)`、`updated_at (timestamptz)`。
- **Row Level Security**：每個使用者只能讀寫 `user_id = auth.uid()` 的那一列 → 進度天然隔離，互看不到。

## Scope
- Supabase 用 Google OAuth provider 登入 / 登出。
- 登入後：拉取雲端存檔；若雲端較新→套用，本機較新→上傳；衝突時以 `updated_at` 較新者為準，並提供「用本機 / 用雲端」選擇。
- 存檔變更時 debounce 上傳（upsert 到 `saves`）。
- 設定缺失（沒填 Supabase URL/anon key）→ 雲端功能停用，純本機，**不可影響 65 項煙霧測試**。
- UI：管理者模式新增「☁️ 雲端存檔」區塊（登入狀態、帳號 email、立即同步、登出）。

## Out of Scope
- 多小孩共用單一裝置的帳號切換 UX 細修（先以「登出再換帳號登入」處理）。
- 即時協作 / 排行榜。
- 家長後台跨帳號總覽（未來里程碑）。

## Technical Approach
- 前端：`@supabase/supabase-js`（CDN，含 `src` 屬性，不影響 smoke 抽取主腳本）。
- 設定：`window.KIDQUEST_CLOUD = { url, anonKey }`（anon key 為公開金鑰，搭配 RLS 安全）。放在 `cloud-config.js`，使用者填入自己的專案值；缺失即停用。
- 所有雲端程式碼以 `if (!cloudEnabled) return;` 與 `typeof` 守衛包住，載入時不觸發網路或瀏覽器 API（保煙霧測試綠燈）。
- 後端：見 `supabase/schema.sql`（建表 + RLS policies）。設定步驟見 `docs/cloud-setup.md`。

## Mockup-First（本里程碑強制）
先交付 `cloud-mockup.html`（可點擊：未登入 → Google 登入 → 已同步 → 衝突選擇 → 登出），人工核准流程後才實作整合。

## Acceptance Criteria
- [ ] 小孩用自己的 Google 帳號登入後，進度自動同步到雲端並可在另一裝置還原。
- [ ] 不同帳號的進度各自獨立、互相看不到（RLS 驗證）。
- [ ] 未登入時遊戲行為與現在完全相同（純本機、可離線）。
- [ ] 雲端設定缺失時自動退回純本機；`node test/smoke.js` 維持 65/65。

## Risk Notes
- **兒童使用自有 Google 帳號**：未滿 13 歲的 Google 帳號通常需家長以 Family Link 管理；請確認你家小孩的帳號狀態與所在地法規。此為使用者明確選擇，於此記錄。
- anon key 可公開，但**務必啟用並驗證 RLS**，否則所有資料外洩。
- 衝突覆蓋造成進度遺失：上傳前以 `updated_at` 比對並可手動選擇。
- 需使用者自行建立 Supabase 專案、啟用 Google provider、執行 schema、填入金鑰——整合才會生效。
