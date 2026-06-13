# Milestone 13: 任務池擴充 + 年齡性別 + 1080p 桌面

## Context
前一個里程碑：12（經濟重整）。使用者要：擴充更多適合 5–15 歲的任務，不只家事，涵蓋家庭/學校教育、品格、生活能力、情緒、自我管理；依年齡性別提供不同難度；任務進 TASK_POOL 由家長啟用停用、每日抽選系統挑選；桌面改 1080P FHD 視窗。

## Objective
把任務系統從 49 個（偏家事）擴充為 100 個、8 大分類、6 級難度的適齡任務庫，並加入年齡/性別個人化抽選。

## Scope
- **6 級難度**：`easy=E`(3分) / `normal=D`(3–10分) / `medium=C`(10–25分) / `hard=B`(25–60分) / `epic=A`(跨日週挑戰) / `super=S`(大型挑戰)。新增 `CHALLENGE = {epic,super}`，`DIFFS[d].daily` 區分每日/挑戰。
- **8 大分類**：school / family / character / lifeSkill / emotion / health / social / creation（舊分類保留以相容舊存檔）。職業加成改對應 school / health / family。
- **100 個任務**：分布 E20 / D20 / C20 / B15 / A15 / S10。每個任務欄位：`id, name, emoji, category, difficulty, ageRange[min,max], estimatedMinutes, why, repeatRule`（另帶相容欄位 time/schedule）。內容貼近台灣家庭與學校、鼓勵成長、不含危險/羞辱/過度控制/侵犯隱私。
- **年齡 / 性別**：`state.player.age`(5–15)、`state.player.gender`；覺醒引導與管理者模式皆可設定。`ageMatch` 改用 `ageRange` + `gender`（並回退舊 `age` 欄位）。
- **抽選**：每日抽選 E/D/C/B 平均分配（`dailyQuota`），A/S 每週挑戰各 2；家長可啟用/停用任務池項目。任務不全顯示，由抽選系統挑選。
- **桌面**：Electron 視窗改 `1920×1080`、置中、可全螢幕。

## Acceptance Criteria
- [x] TASK_POOL 100 個，分布 E20/D20/C20/B15/A15/S10，涵蓋 8 大分類，內容安全且鼓勵成長。
- [x] 6 級難度；E/D/C/B 每日、A/S 每週。
- [x] 可設定孩子年齡（5–15）與性別並據此抽選。
- [x] 任務由家長啟用停用 + 每日抽選挑選，不全顯示。
- [x] 桌面 1920×1080 視窗；smoke 75/75、desktop-save 4/4、accounts 10/10，exe 重新打包啟動成功。

## Risk Notes
- 難度語義調整（舊 epic=S → 現 epic=A、新增 super=S）：以 `CHALLENGE` 集合與 `daily` 旗標集中處理，避免散落的 `==='epic'` 判斷出錯。
- 舊存檔自訂任務無 `ageRange`：`ageMatch` 回退舊 `age` 欄位，預設全年齡通過。
- 1080p 視窗下版面仍為置中窄欄（行動優先 RWD），屬可接受；若要寬版 PC 佈局可另立里程碑。
