# Milestone 12: 經濟系統重整（金錢／真實獎勵換算／RPG 平衡）

## Context
v3 結構大致完成。使用者要求優先完善「金錢系統 / 真實獎勵換算 / RPG 經濟平衡」，並**完全移除連續紀錄保護券**。維持單一 HTML、Vanilla JS、localStorage 離線可玩，不新增建置流程，不破壞能力值/技能樹/任務審核/商店/背包/成就/PIN/每日週重置。

## Objective
把經濟拆成兩套獨立邏輯：真實獎勵以台灣家庭預算定價；虛擬道具/EXP 純 RPG 曲線。並為真實獎勵加上家長核准流程。

## Scope
- **移除保護券**：streakTickets、brokenStreak、useProtection/dismissProtection、sp1 商品、ticket 成就、相關 UI/文字/測試。
- **ECONOMY 設定物件**（coinsPerTwd 5、dailyTargetCoins 150、weeklyTargetCoins 1000、monthlyRealRewardBudgetTwd 900、maxCoin/Xp StreakBonusPct、realRewardPendingApproval）。
- **DIFFS**：E 12/8、C 28/18、B 60/35、S 140/100。每日全完成 +25 金幣 +20% EXP（S 不計門檻）。
- **連續加成拆兩套**：EXP +10%/天（≤+100%）、金幣 +5%/天（≤+50%）。
- **xpNeed(level)**：`level<=5 ? 60+level*25 : floor(80+level*35+pow(level,1.7)*8)`。
- **真實獎勵**：重建 DEFAULT_REWARDS（15 個，小/中/大三級，estimatedTwd、cost=twd×5、tier、status）；兌換改為申請 `requested` → 家長 `approved` / `rejected`（退回退還金幣）。家長頁顯示待處理申請、月度核准台幣估值、預算提醒（僅提醒不限制）。孩子畫面只顯示金幣與約需天數。
- **虛擬道具 RPG 定價**：common 120–250、rare 350–700、epic 900–1600、legendary 2200–4000；power common100/rare300/epic700/legendary1500。卡片顯示稀有度/槽位/戰鬥力/金幣，不顯示台幣。
- **介面**：狀態頁加「今日/本週金幣、本月已核准真實獎勵 NT$」；家長頁加經濟摘要 + 待處理申請核准/退回。
- **資料遷移** v3→v4：清除保護券欄位、重建真實獎勵目錄、加入 rewardRequests。

## Out of Scope
- 套裝實際效果（仍為提示）。
- mythic 稀有度（保留擴充空間，未啟用）。

## Acceptance Criteria
- [x] ECONOMY 設定就緒；DIFFS 改值，每日 3E3C2B 基礎約 148 金幣。
- [x] 連續加成拆 EXP/金幣兩套；今日全完成 +25 金幣 +20% EXP。
- [x] 真實獎勵 requested→approved/rejected，退回退還金幣；家長見台幣與月預算，孩子只見金幣/天數。
- [x] 虛擬道具 RPG 定價、不顯示台幣；xpNeed 新曲線。
- [x] 保護券完全移除；`node test/smoke.js` 69/69、`desktop-save.test.js` 4/4。

## Risk Notes
- 經濟數值微調可能影響既有存檔的「感受」，但不影響資料正確性；v3→v4 遷移保留所有進度。
- 真實獎勵金幣於申請時先扣住，退回才退還——避免「申請後又花掉金幣」造成超發。
