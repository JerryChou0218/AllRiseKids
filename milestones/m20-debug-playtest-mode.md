# Milestone 20: 測試/除錯模式 — 無限金幣 + 等級 0→100 速通與平衡驗證

## Context
前一里程碑：19（升級曲線到 100 + 主線/支線 + 成長對比，complete）。
需要一個家長隱藏的工具，能無限金幣、跳級，並自動跑完 Lv1→100 輸出收支/節點報告，用來找出卡關/通膨並回饋 M19 微調。

## Objective
在 PIN 保護的家長頁提供除錯工具（無限金幣、跳級、設定等級）與「0→100 速通報告」；報告在暫存 state 上模擬、結束還原（不污染正式存檔）。用報告找出早期過快問題並回饋調整 M19 曲線，再次驗證改善。

## Scope
- **除錯函式（僅家長頁，小孩端無入口）**：`debugToggleInfiniteCoins`（設 999999）、`debugAddCoins(n)`、`debugSetLevel(lv)`/`debugJumpLevel(n)`/`debugSetLevelFromInput`。
- **速通模擬**：`simulateProgression(dailyXp=235, dailyCoins=146)` 在 `defaultData()` 暫存 state 上跑 Lv1→100，於 9 個檢查點（5/10/20/31/46/61/76/91/100）記錄累計天數/任務數/任務金幣/主線金幣/總金幣/主線章數；`finally` 還原正式存檔。
- **UI**：家長頁新增「除錯 / 平衡測試」區塊（`#parent-debug`，由 `renderDebugPanel()` 填入，`renderParent()` 末呼叫）；「🏃 跑 0→100 速通報告」按鈕 `runDebugSimulation()` 顯示分階段報告。
- **平衡回饋（criterion 3）**：速通報告顯示原曲線早期過快（Lv5 第 1 天、Lv10 第 3 天，一天衝 4 級），回饋 M19 把 `xpNeeded` 樓地板調高為 `round(80+8L+1.15·L^1.5)`；再驗證後 Lv5≈第 2 天、Lv10≈第 6 天（早期約一天一級），滿等約 396 天、~66k 金幣，仍在健康區間。

## Out of Scope
- 排行榜（M21）、交易（M22）、真雲端（M23）。

## Acceptance Criteria
- [x] 除錯模式提供無限金幣與跳級，僅家長（PIN 家長頁）可進入，小孩端無入口。
- [x] 可自動模擬 Lv0→100 並輸出每階段天數/任務數/金幣收支/解鎖節點（主線章數）報告。
- [x] 依報告找出問題（早期過快）並回饋 M19 調整曲線，再次驗證改善（Lv10 由第 3 天 → 第 6 天）。
- [x] 速通模擬不污染正式存檔（`test/debug-sim.test.js` 斷言模擬前後 state 完全相同）。
- [x] `test/debug-sim.test.js` 9/9；progression 10/10；smoke 77、cloud-store 9、accounts 8、parent-queue 7、desktop-save 4 全綠。

## Risk Notes
- 除錯的無限金幣/跳級會改到「目前小孩」的正式存檔（家長測試用，UI 已標註）；只有速通「報告」保證不污染。
- 模擬以固定每日 XP/金幣估算（235/146），為平衡趨勢參考，非逐任務精算。
