# Milestone 10: 單機可攜桌面版（Electron，存檔隨資料夾移動）

## Context
前一個里程碑：8（匯出/匯入，complete）。M9（雲端）暫緩。
使用者需求：要一個「資料夾裡有 `.exe`、雙擊就能玩」的單機版；帳號與紀錄都存本地端；把整包遊戲搬到別處，只要存檔在就能接著玩。

## Objective
把現有單檔網頁遊戲包成 Windows 桌面 App，存檔寫成 `.exe` 同層的檔案，達成「整包資料夾可攜、進度不遺失」。瀏覽器版仍可正常使用。

## Scope
- Electron 外殼：`electron/main.js`（開視窗載入 `index.html`）、`electron/preload.js`（提供 `window.kqStore` 檔案式存檔）。
- `index.html` 存讀檔加一層 `kqStorage` 橋接：有 `window.kqStore`（桌面版）→ 寫檔案；否則 → localStorage（瀏覽器/測試）。
- 存檔路徑：`.exe` 同層的 `kidquest-save.json`（portable 用 `PORTABLE_EXECUTABLE_DIR`、資料夾版用 `dirname(execPath)`、開發用 `cwd`）。
- 打包腳本 `electron/pack.js`（@electron/packager），產出 `dist/KidQuest-win32-x64/`。
- 測試：新增 `test/desktop-save.test.js` 驗證檔案式存檔 + 搬移後接續。

## Out of Scope
- 跨裝置自動雲端同步（M9，暫緩）。
- macOS / Linux 打包（先做 Windows）。
- 桌面版完全離線的樣式在地化（樣式仍走 CDN，見 Risk）。

## Technical Approach
- 不用 electron-builder：其打包流程在未開「開發人員模式」的 Windows 會卡 winCodeSign 符號連結。改用 `@electron/packager`，直接複製 Electron + 遊戲成資料夾，較單純且符合「資料夾 + .exe」形態。
- `contextIsolation: true` + `nodeIntegration: false`，檔案存取只透過 preload 的 `contextBridge` 暴露最小 API。

## Acceptance Criteria
- [x] 可從資料夾內的 `.exe` 啟動遊戲（實機啟動成功，4 進程）。
- [x] 帳號與進度存成 `.exe` 同層的存檔檔案；移動整包資料夾後進度可接續（`desktop-save.test.js` 4/4）。
- [x] 純瀏覽器環境仍以 localStorage 正常運作（`smoke.js` 65/65）。
- [x] `node test/smoke.js` 維持 65/65。

## Risk Notes
- **離線樣式**：桌面版 `index.html` 的 Tailwind / 字型仍走 CDN，首次需連網；要在完全離線電腦保持外觀，需把這些資源在地化（建議另立里程碑 M11）。
- **體積**：Electron 應用約 ~270MB（Chromium 執行階段），屬桌面外殼固有成本；若要極小體積可評估 Tauri/Neutralino。
- 存檔為單一 JSON 檔，建議使用者偶爾備份（可用既有「匯出存檔」）。
