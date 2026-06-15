# Milestone 17: 帳號模型重構 — 家長為主帳號（Gmail）+ 小孩子帳號（最多 4）+ 雲端就緒抽象層

## Context
前一個里程碑：16（GitHub + Vercel 部署，complete）。
2026-06-16 使用者把目標升級為「小型多人線上遊戲」。原本的帳號系統（M11）是**扁平**的：`kidquest_accounts` 存一個 `{ accounts:[], activeId }`，每個 account 就是一個小孩，彼此平行、無家長概念，全本機。
新需求要把模型改成**家長為根、小孩為子**，並為雲端（M23）鋪好抽象層。本里程碑取代原 M9。

## Objective
重寫 init/gate 流程與帳號資料模型：安裝後第一畫面只開放家長以 Gmail 註冊/登入；家長底下建立最多 4 個小孩；切換規則符合使用者要求；所有小孩資料掛在家長帳號下，透過 `cloudStore` 抽象層存取（先本機實作，介面對齊 Supabase）。

## Scope
- **資料模型**：新 `kidquest_cloud`（經 `cloudStore`）結構：
  - `parent`: `{ id, email, provider:'google', displayName, createdAt, pin? }`
  - `parent.children[]`: 每個 `{ id, name, avatar, blob(該小孩存檔), createdAt }`，最多 4。
  - `session`: `{ parentId, activeChildId|null }`。
  - 小孩存檔 `blob` 沿用既有 `defaultData()`/`load()`/存讀檔格式（最小破壞）。
- **cloudStore 抽象層**：`cloudStore.getParentByEmail / createParent / saveParent / listChildren / addChild(max4) / saveChildBlob / loadChildBlob`。本機實作走 `kqStorage`；介面簽章對齊未來 Supabase（async-ready，回傳 Promise 或同步皆可，先同步包一層）。雲端設定缺失→本機。
- **Init / Gate 流程重寫**：
  1. 開啟 → 若無家長 session → **家長登入畫面**（只有「以 Google 登入」一顆鈕；OAuth 先用本機 stub：輸入/模擬一個 gmail，建立或取回 parent）。
  2. 家長登入後 → **家長首頁**：顯示名下小孩（≤4）、可「建立小孩」「進入某個小孩」「家長登出」。
  3. 進入某小孩 → 載入該小孩 blob → 進遊戲（沿用既有遊戲畫面）。
  4. 小孩端要切換 → 只能「登出小孩」回到家長首頁，再選另一個小孩。小孩端**沒有**任何登出家長/切換家長的入口。
  5. 家長登出 → 僅家長首頁提供 → 回到家長登入畫面。
- **改寫既有函式**：`boot()`、`showAccountGate()`/`renderAccountGate()`/`loginSubmit()`/`doLogin()`/`switchAccount()`/`createAccountSubmit()`/`seedAccountFromCurrent()` 改接新模型；舊扁平 `kidquest_accounts` 提供一次性遷移（若存在 → 包成「預設家長」名下的小孩們）。

## Out of Scope
- 真正的 Google OAuth / Supabase（M23，human-approval gate）— 本里程碑用本機 stub 模擬登入，但介面與資料形態須對齊。
- 任務審核通知（M18）、排行榜（M21）、交易（M22）。

## Technical Approach
- OAuth stub：一個「以 Google 登入」按鈕 → 跳出輸入 email 的 modal（模擬 Google 帳號選擇）→ `cloudStore.getParentByEmail(email) || createParent(email)`。把 stub 封裝在 `auth.signInWithGoogle()`，M23 只需替換其內部為 supabase.auth。
- 切換小孩＝登出小孩：沿用既有 snapshot 概念，`exitChild()` 先把活躍小孩 blob 存回家長物件，清 `activeChildId`，回家長首頁。
- 最小破壞：遊戲核心（任務/經濟/狀態頁）不動，只換「誰的存檔載入活躍槽」這層。

## Acceptance Criteria
- [ ] 安裝後第一畫面為家長登入/註冊，目前只開放 Gmail（OAuth 本機 stub，介面對齊真實 Google 登入）。
- [ ] 家長可建立最多 4 個小孩；第 5 個被阻擋並提示。
- [ ] 小孩之間切換需先登出目前小孩再選另一個；小孩端無任何可登出家長的入口。
- [ ] 家長登出只在家長頁面提供；登出後回家長登入畫面。
- [ ] 所有小孩進度掛在 `parent.children[]`，透過 `cloudStore` 讀寫；雲端缺失自動走本機。
- [ ] 舊 `kidquest_accounts` 若存在可一次性遷移為預設家長名下小孩；smoke/desktop-save 維持綠燈；accounts 測試更新為新模型並綠燈。

## Risk Notes
- **測試衝擊**：`accounts.test.js` 綁舊扁平模型，需改寫為家長/小孩模型——屬預期工作，不算回歸。
- **遷移**：既有玩家（本機 `kidquest_accounts`）不可遺失進度，遷移須保留每個小孩 blob。
- **雲端對齊**：cloudStore 介面若與 Supabase 落差大，M23 會痛；設計時即以「一個 parent row + children jsonb / 或 children 表」對齊 schema。
