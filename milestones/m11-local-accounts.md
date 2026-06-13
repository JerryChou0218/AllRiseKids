# Milestone 11: 本地多帳號登入／登出／切換（密碼）

## Context
前一個里程碑：10（單機桌面版）。使用者要：同一台裝置上多個孩子各自存進度，可登入登出、設密碼、切換帳號，全部存本機。

## Objective
在不影響既有單人流程與測試的前提下，加入本機多帳號系統。

## 資料設計
- **活躍帳號的即時進度**仍存於 `STORAGE_KEY`（`kidquest_data` / 桌面 `kidquest-save.json`）→ `save`/`load`/煙霧測試完全不變。
- **帳號清單與各帳號存檔快照**存於 `ACCOUNTS_KEY`（`kidquest_accounts`）：`{ accounts:[{id,name,pass(雜湊),blob,createdAt}], activeId }`。
- 切換流程：先把目前 `STORAGE_KEY` 快照回 `accounts[active].blob`，再把目標帳號 `blob` 寫回 `STORAGE_KEY` 並 `load()` → 進度互相隔離、不混淆。

## Scope
- 登入閘門畫面（`#account-gate`）：列出帳號、選擇後輸入密碼登入、建立新帳號。
- 帳號函式：`hashPass`（FNV-1a 雜湊，非明文）、`accountsLoad/Save`、`snapshotActive`、`doLogin`、`createAccountSubmit`、`switchAccount`、`setAccountPassword`、`deleteAccount`、`seedAccountFromCurrent`。
- 啟動分流：有帳號→登入閘門；既有單人存檔且無帳號→自動轉成第一個帳號並進遊戲；全新無帳號→沿用原本覺醒引導（煙霧測試走這條）。
- 管理者模式「帳號管理」：設定/變更本帳號密碼、登出/切換、刪除非登入中的帳號。
- 桌面 preload 支援「帶 key」檔案存取（已於前置作業完成）。

## Out of Scope
- 帳號制雲端同步（M9，暫緩）。
- 跨帳號家長總覽。

## Acceptance Criteria
- [x] 啟動時已有帳號 → 顯示登入畫面，可選帳號並用密碼登入。
- [x] 可建立多個帳號，各帳號進度互相獨立。
- [x] 遊戲內可登出並切換帳號，進度不混淆。
- [x] 可設定/變更帳號密碼；空密碼帳號可直接登入；密碼錯誤不得登入。
- [x] 無帳號時沿用原本流程；`smoke.js` 69/69、`desktop-save` 4/4、新增 `accounts.test.js` 10/10。

## Risk Notes
- 密碼為本機雜湊（防手足誤入級別），非強加密；屬本機兒童遊戲合理強度。
- 刪除帳號為破壞性：限制不可刪除登入中帳號，並需確認。
- 切換前一定先快照活躍帳號，避免登入同一帳號時用到舊快照而遺失進度。
