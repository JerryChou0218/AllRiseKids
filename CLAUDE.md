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
讀 `milestone-state.json` 的 `current_milestone_id`（目前為 16，已超出最高 id 15）。M1–M15 除 M9（帳號制雲端同步，使用者主動暫緩）外皆 `complete`；M9 維持 `pending`，日後要做雲端可直接續接。

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
