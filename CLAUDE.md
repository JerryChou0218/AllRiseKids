# Project Context

## Goal
KidQuest：給 8–12 歲孩子的每日任務 RPG 網頁遊戲（《我獨自升級》暗黑系統風格）。完成現實生活任務 → 獲得 EXP/金幣 → 升級配點、解鎖技能樹、攻略傳送門、兌換真實獎勵。目前已交付 v3，6 個核心里程碑全部完成並通過 65 項煙霧測試。

## Framework Rules (Milestone-Driven Agent Framework v2.1)
1. **State**: 動作前先讀 `milestone-state.json`，它是唯一事實來源；其中 `mode`（full）與 `is_ui`（true）需一併遵守。
2. **Context**: 只載入「當前里程碑 spec ＋ 前一個里程碑結果摘要 ＋ 本檔規則」，不重播完整歷史。
3. **Budget**: 每個階段結束後累加成本（`budget.cost_estimate_usd` 各階段估值）並更新對應 `*_calls`；達上限即停，≥90% 警告。
4. **Retry**: 每個里程碑最多 3 次，第 3 次失敗 → 設 `blocked` 停下等人工。
5. **Rollback**: 驗證失敗時，**先** `git commit` `milestone-state.json` 與 `milestones/` 保住失敗紀錄，**再**用 `git checkout --` 丟棄本次產品碼變更（本專案產品碼為 `index.html` 等，非 `src/`）。**勿用裸 `git stash`**——會連剛寫入的 history 一起捲走。
6. **Commit**: 里程碑驗證 PASS 後 `git commit` 當還原點。
7. **Approval**: 絕不跳過 `require_human_approval` 關卡。
8. **Dependencies**: `depends_on` 內所有 id 為 `complete` 前不得開始。

## Current Milestone
`current_milestone_id` = 24（`in_progress`）。M1–M23 全部 `complete`（M9 為 `blocked`，已被 M17/M23 取代）。
- **M17** 家長 Gmail 為主帳號 + 小孩子帳號(≤4) + cloudStore 抽象層；**M18** 家長審核佇列 + 即時通知；**M19** 等級 0→100 曲線 + 主線10章；**M20** 家長除錯模式；**M21** 世界排行榜；**M22** 跨家庭物品交換；**M23** Supabase + Google OAuth 雲端同步。
- **M24（進行中）**：UI/UX 重構（孩子五導覽 / 家長六分頁 / Onboarding wizard / 任務啟動流程 / 真實獎勵庫存管理 / 任務完成條件 / RPG icon 系統）+ 雲端同步 bug 修復。
- **雲端**：`cloud-config.js`（公開值）+ `CLOUD_READY` 旗標；缺 URL 自動退回本機。Supabase 專案 `pfswpfdtclnoawmcodht`，schema 見 `supabase/schema.sql`（saves/leaderboard/trades + RLS）。Google 登入經使用者實測成功。
- **測試**：16 套件，`npm run test:all` 全綠（smoke 84 / cloud-store 11 / accounts 13 / parent-queue 12 / progression 10 / debug-sim 9 / leaderboard 9 / trade 10 / desktop-save 4 / ui-architecture 34 / accessibility 48 / oauth-login 6 / cache-policy 5 / reward-feedback 8 / levelup-unlocks 6 / browser-responsive 31）。
- **部署**：`https://allrisekids.vercel.app`，`git push` 自動觸發 Vercel。最新部署 commit `620efca`。

## Architecture Decisions
- **單一 `index.html`**（Vanilla JS ES6+），CSS 發光特效 + emoji，無外部圖片。產品程式碼就是這個檔，不使用 `src/`。
- Tailwind CSS CDN + Google Fonts（Noto Sans TC / Rajdhani）。
- 純前端、完全離線可玩；進度存於 localStorage 鍵 `kidquest_data`，含 v1/v2 → v3 自動遷移。
- 測試：`node test/smoke.js`（65 項斷言），即本專案的自動驗證指令。
- `refs/` 為介面參考圖，非執行所需。

## Known Constraints
- 清除瀏覽器資料會清除進度；換瀏覽器/換電腦不同步（純本機儲存）——里程碑 8（雲端同步）即為解此限制的提案。
- 變更必須維持 65 項煙霧測試全綠；新功能應補對應斷言。
- 介面與文案以繁體中文、8–12 歲孩子可讀為準。

## M24 Handoff For Next Agent (Claude → Codex)

### 最新狀態（2026-06-20）
- Latest master commit: `620efca` (`fix(cloud): prevent stale cloud data from overwriting local on re-login`)
- Production alias: `https://allrisekids.vercel.app`
- M24 `in_progress`；已完成大部分 UI/UX 重構，雲端同步 bug 已修復並部署。

### 本輪（Claude）完成的工作
**雲端同步根本原因修復（commit `620efca`）：**
- 問題：`cloudBoot()` 每次頁面載入都無條件用 Supabase 雲端資料覆蓋本機，導致刪除小孩後重新整理/重新登入小孩復活。
- 修復 A：`cloudStore.saveParent()` 自動設 `p._localUpdatedAt = Date.now()`。
- 修復 B：`cloudBoot()` 比對時間戳——本機較新時不覆蓋，改把本機重試推送到雲端，並在 `.then/.catch` 更新同步狀態 UI。
- 修復 C：`deleteChild()` 檢查 `cloudSyncParentNow` 回傳值，失敗時顯示明確 toast。
- `npm run test:all` 16 套件全綠。

### M24 已實作的完整功能清單（含 Codex 上輪）
1. UI/UX App Shell 重構：孩子五導覽 / 家長六分頁 / Design token CSS
2. 孩子首頁：角色摘要、今日任務進度、推薦任務、成長摘要
3. 任務啟動流程：`startedAt` 狀態機，先「開始任務」再「提交完成」
4. 無障礙補強：ARIA dialog / role / tabindex / keyboard / Escape
5. Onboarding 5 步 wizard
6. 家長「成長紀錄」儀表板
7. 真實獎勵庫存管理：`paused` / `stock` / `expires`，子端防止申請無效獎勵
8. 任務層級 `requiresReview`：免審核任務透過 `completeTaskReward()` 即時結算
9. Onboarding 頭像選擇：`player.avatar` / `CHARACTER_AVATARS`
10. 任務完成條件：`tf-completion` / `completion` 欄位
11. RPG icon SVG 系統（`assets/rpg-icons.svg`）
12. 家長操作保護：`requireParentMode()` guard
13. **雲端同步修復：`_localUpdatedAt` 時間戳 + cloudBoot 比對 + deleteChild 推送失敗提示**

### 已知剩餘風險（給 Codex 的待辦）
- 雲端推送若 Supabase key 或 RLS 有問題，`deleteChild` toast 會顯示「同步失敗」——需用戶打開 F12 Console 確認錯誤訊息，Codex 可協助診斷。
- `index.html` 仍為單檔 Vanilla JS（專案設計如此），無模組化/TypeScript。
- 家長管理介面在小螢幕的 UX polish 仍可繼續改善。
- M24 acceptance criteria 尚未正式審核關閉，Codex 可補足後將 M24 status 設為 `complete`。
