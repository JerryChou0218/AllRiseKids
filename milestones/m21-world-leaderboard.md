# Milestone 21: 世界戰績排行榜（跨家庭，雲端就緒）

## Context
前一里程碑：20（除錯/平衡，complete）。M17 的 cloudStore 已能彙整所有本機家長名下小孩。要做一個跨家庭排行榜讓不同家庭小孩互相看到成長，先本機示範、介面對齊未來 Supabase 公開讀取表。

## Objective
新增「世界戰績排行榜」分頁：彙整本機所有小孩（真實）+ 示範對手（其他家庭），依等級/戰績排名，支援總榜/週榜/同齡篩選；只公開非敏感欄位。順手修正 M17 頂部列仍用舊扁平 accountsLoad 導致小孩切換鈕消失的回歸。

## Scope
- **資料層（cloudStore 抽象）**：`cloudStore.publicChildren(wk)` 回傳所有本機小孩的公開項目（id/暱稱/等級/總任務/本週任務/年齡，標 self），不含 email/家長/存檔。M23 改讀 Supabase 公開排行表。
- **示範對手**：`DEMO_RIVALS` 10 個虛構遊戲暱稱（等級/年齡/任務分布），讓榜單看起來有人氣；M23 接真資料後移除或保留為墊底。
- **排行邏輯**：`worldLeaderboard(filter)` 合併真實+示範→依篩選排序→指派名次。總榜＝等級×100000+任務；週榜＝本週任務數；同齡＝self 年齡 ±1 歲。
- **UI**：`screen-leaderboard` 分頁 + 底部導覽「🏅排行」+ 篩選鈕（總榜/週榜/同齡）+ `renderLeaderboard()`（獎牌/階級徽記/暱稱/等級/年齡/戰績，self 高亮標「（我）」）。
- **M17 回歸修正**：`renderTop()` 頂部帳號改讀 `cloudStore` session 顯示遊玩中小孩（點擊＝登出小孩回家長首頁），不再用空的 `accountsLoad()`。

## Out of Scope
- 真正的跨裝置雲端排行（M23）。本機示範資料 + 介面對齊。
- 物品交換（M22）。

## Acceptance Criteria
- [x] 排行榜顯示跨家庭小孩的暱稱/等級/戰績/名次，可篩選（總榜/週榜/同齡）。
- [x] 只公開非敏感資訊；不顯示真實姓名/email/家長資訊（公開項目僅遊戲暱稱/等級/任務/年齡）。
- [x] 以 cloudStore 抽象層讀取，本機以示範資料運作，介面對齊未來公開讀取表。
- [x] `test/leaderboard.test.js` 7/7；smoke 77、cloud-store 9、accounts 8、parent-queue 7、progression 10、debug-sim 9、desktop-save 4 全綠。

## Risk Notes
- 暱稱用遊戲內 `player.name`（覺醒時取的獵人名），非真實姓名欄位；仍提醒家長勿用真名當暱稱（未來雲端上線前可加引導）。
- 示範對手為固定資料，排序穩定；接真雲端後改為動態。
