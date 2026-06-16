# Milestone 22: 跨家庭虛擬物品交換（交易系統，雲端就緒）

## Context
前一里程碑：21（世界排行榜，complete）。要讓不同家庭的小孩交換虛擬物品，含家長可選的核可開關防止不當交易。先本機（兩個本機家長即「兩個家庭」）+ 抽象層，介面對齊未來 Supabase 交易表。

## Objective
實作交易狀態機（proposed→accepted/declined/cancelled，家長核可開時 accept→pending_parent→核准→accepted），確保物品守恆（不憑空增減），並提供家長核可開關。資料走 cloudStore 抽象層。

## Scope
- **cloudStore（抽象層）**：`tradesAll/saveTrade`（交易存於 cloud root.trades）、`childInventory(parentId,childId)`、`moveItem(parentId,childId,itemId,dir,item)`（對某小孩 blob 背包原子增/刪；add 會擋重複 id）。M23 改用 Supabase 交易表 + RLS。
- **交易引擎（產品）**：`proposeTrade`（活躍小孩提案，驗證 offer 在自己背包、request 在對方背包）、`respondTrade`（收件小孩接受/拒絕；接受時若任一方家長核可開→pending_parent，否則直接成交）、`cancelTrade`、`parentApproveTrade`、`executeTrade`（守恆交換：offer from→to、request to→from，任一步失敗即中止）、`reconcileActiveInventory`（成交後同步活躍小孩 live state 背包）。
- **家長核可**：`tradeApprovalOn/setTradeApproval`（旗標存家長物件 `tradeApproval`）。
- **UI**：背包頁「📨 交換邀請」區（收到的提案 接受/拒絕、送出/待核可 取消）；家長頁「🔁 物品交換管理」（核可開關 + 待核可交換 核准/擋下）。

## Out of Scope
- 真正的跨裝置交易（M23，Supabase 交易表 + Realtime）。本機以「兩個本機家庭」示範。
- 向排行榜遠端對手提案（雲端上線後開放）。

## Acceptance Criteria
- [x] 小孩可對另一家庭小孩提出物品交換，對方接受後雙方背包正確更新（狀態機 proposed→accepted/declined/cancelled）。
- [x] 家長可開啟交易核可開關，需家長同意才成交（accept→pending_parent→parentApproveTrade→accepted）。
- [x] 以 cloudStore 抽象層實作，本機以兩個本機家庭運作，介面對齊未來交易表。
- [x] 交易不會憑空增減物品（守恆）；`test/trade.test.js` 10/10；其餘 8 套件全綠。

## Risk Notes
- 守恆關鍵：`executeTrade` 先 remove 再 add，remove 失敗即中止不發；`moveItem` add 擋重複 id 防複製。
- 非活躍小孩的背包改在其 blob 上原子操作；活躍小孩成交後 `reconcileActiveInventory` 從 blob 回填 live state 再 save，確保畫面與存檔一致。
