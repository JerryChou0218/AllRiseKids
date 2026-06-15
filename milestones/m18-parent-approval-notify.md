# Milestone 18: 家長後台 — 任務審核佇列 + 小孩送出即時通知

## Context
前一個里程碑：17（家長為主帳號 + 小孩子 ≤4 + cloudStore，complete）。
現況：既有單一小孩的審核流程已存在——`markDone(id)` 把任務設 `status='pending'`（並 `save()` → 立即鏡射到該小孩 blob）；遊戲內 PIN 保護的「家長」頁 `renderParent()` 用 `approveTask(id)` / `rejectTask(id)` 對**當前活躍小孩**審核發獎。
缺口：家長有多個小孩時，要能在**家長層級**一眼看到「名下所有小孩」的待審核任務與通知，不必逐一登入每個小孩。

## Objective
在家長首頁（parent-home）提供跨小孩的**待審核彙總 + 紅點通知**；家長點任一筆即進入該小孩的審核頁，用既有 `approveTask/rejectTask` 核准/退回。即時性以「`save()` 即時鏡射 blob → 佇列由 blob 推導」達成，雲端 Realtime/推播留待 M23。

## Scope
- **佇列由資料推導（不另存、不會 desync）**：
  - `childPendingTasks(parentId, child)`：活躍小孩讀 live `state.tasks`，非活躍讀 `child.blob` 解析，回傳 `status==='pending'` 的任務。
  - `parentQueue(parentId)`：彙總每個小孩的待審核清單。
  - `parentPendingCount(parentId)`：總筆數（紅點數字）。
- **家長首頁通知 UI**：每個小孩卡片顯示待審核紅點數；卡片下方「🔔 審核」按鈕（pending>0 時）→ `reviewChild(childId)`。
- **`reviewChild(childId)`**：`enterChild(childId)` → `parentUnlocked=true` → `goScreen('parent')`，落在該小孩的既有審核頁；核准/退回沿用 `approveTask/rejectTask`（零重寫）。核可後 `save()` 鏡射回 blob，家長 `切換` 回首頁時數字即更新。

## Out of Scope
- 真正的跨裝置即時推播 / Supabase Realtime（M23）。本地單機以「進入家長首頁即見最新彙總」為即時通知。
- 經濟/獎勵數值重整（M19）。沿用現有 `approveTask` 發獎邏輯，不在此改。

## Technical Approach
- 不新增可能 desync 的佇列儲存；一律由「各小孩 blob + 活躍 live state」推導，與 `save()` 即時鏡射相搭，恆為一致。
- 核准操作不在非活躍 blob 上重算複雜獎勵（避免與 `approveTask` 邏輯分歧）；改為「進入該小孩 → 既有審核頁核准」，重用已驗證邏輯。

## Acceptance Criteria
- [ ] 任一小孩 `markDone` 後，家長首頁該小孩出現未讀紅點與數量，`parentPendingCount` 正確反映跨小孩總數。
- [ ] 家長首頁可看到每個小孩的待審核清單彙總（grouped by child）。
- [ ] 家長點「審核」→ 進入該小孩審核頁，可用既有 `approveTask` 核准（發 EXP/金幣）、`rejectTask` 退回（不發）。
- [ ] 核准後該筆從待審核移除、`parentPendingCount` 下降；退回後任務回 available。
- [ ] 新增 `test/parent-queue.test.js` 驗證上述；smoke/cloud-store/accounts/desktop-save 全綠。

## Risk Notes
- **即時性**：本地單機「即時」＝家長進首頁即見；真正推播待 M23。家長頁推導需讀全部小孩 blob，數量小（≤4）成本可忽略。
- **PIN**：`reviewChild` 來自已通過 Google 驗證的家長首頁，故直接 `parentUnlocked=true` 進審核頁（PIN 為次要鎖，不重複擋）。
