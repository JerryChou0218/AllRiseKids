# Milestone 15: 家長管理強化 + 使用者密碼 + 裝備賣回 + 移除重置鈕

## Context
使用者回饋八點（其中真實獎勵核准/退款於 M12 已具備、家長 PIN 變更於既有 `resetPin` 已具備）。

## 對應需求與處理
1. **家長刪除/改密碼任一帳號** → `deleteAccount(id)`、`setAccountPassword(id)` 改為可操作任一帳號；家長頁每個帳號列出 🔑 改密碼、🗑️ 刪除。刪除登入中帳號後 `activeId=null` 並回登入畫面（無帳號則回單人初始）。
2. **家長 PIN 可更改** → 既有 `resetPin()`（按鈕文字改為「變更家長 PIN 碼」）。
3. **使用者自設密碼** → 新增 `setMyPassword()`，狀態頁顯示「🔑 設定我的密碼」（有登入帳號才出現）。
4. **真實獎勵需核准、否決退款** → 沿用 M12（`rewardRequests` requested→approved/rejected，`rejectReward` 全額退還金幣）。
5. **移除「重置所有資料」按鈕** → 刪除按鈕與 `resetData()` 函式。
6. **家長可編輯真實獎勵名稱與點數** → `openRewardForm(id)` 預填、`saveRewardForm` 支援編輯（同步 `estimatedTwd=round(cost/5)`）；家長獎勵列表加 ✏️ 編輯鈕。
7. **背包/成就移到主選單、移除狀態頁家長鈕** → 主導覽加「🎒 背包」「🏆 成就」；狀態頁移除背包/成就/家長三鈕（家長改由頂部列登入）。
8. **裝備賣回商店、返還半價** → 新增 `sellItem(id)`：返還 `floor(catalog.cost/2)`、移除背包、記錄 `kind:'sell'`；背包卡片加「💰 賣出」鈕。

## Acceptance Criteria
- [x] 家長可刪除/改密碼任一帳號（含登入中）；PIN 可變更。
- [x] 使用者可於狀態頁自設密碼。
- [x] 真實獎勵申請制，否決全額退款。
- [x] 移除重置鈕；家長可編輯獎勵名稱與點數。
- [x] 背包/成就移主選單、移除狀態頁家長鈕；裝備可賣回半價。
- [x] smoke 77/77、desktop-save 4/4、accounts 10/10，exe 重新打包啟動成功。

## Risk Notes
- 刪除登入中帳號採「activeId 先設 null 再回登入畫面」，避免之後把目前存檔誤快照寫回別人帳號。
- 「獎勵賣回」僅適用背包中的虛擬裝備；真實獎勵屬申請制（家長否決即全額退款），非半價賣回。
