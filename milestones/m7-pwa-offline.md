# Milestone 7: PWA 安裝與離線快取（提案）

## Context
前一個里程碑：6（UI／視覺與傳送門地圖，complete）。
目前系統狀態：v3 單檔 `index.html` 已可離線開檔遊玩，但無法「安裝」到主畫面，亦無 service worker 快取資源（Tailwind/Fonts 仍走 CDN）。

## Objective
讓 KidQuest 可安裝為 PWA 並在完全離線下穩定執行，不改變既有玩法與存檔格式。

## Scope
- 新增 `manifest.webmanifest`（名稱、圖示、`display: standalone`、主題色）。
- 新增 service worker：快取 `index.html` 與必要靜態資源，offline-first。
- 評估將 Tailwind/字型在地化或快取，確保斷網仍可正常呈現。
- 提供安裝提示（可選）。

## Out of Scope
- 雲端同步（里程碑 8）。
- 推播通知。

## Technical Approach
原生 Service Worker API + Cache Storage；維持單檔為主、新增最少輔助檔。圖示可用 emoji/SVG 產生，避免外部圖片依賴。

## Acceptance Criteria
- [ ] 可從瀏覽器「加入主畫面」安裝為 PWA（有 manifest 與有效圖示）。
- [ ] 完全離線（含首次載入後斷網）仍可開啟並正常遊玩。
- [ ] 既有 `kidquest_data` 存檔不受影響。
- [ ] `node test/smoke.js` 維持 65/65 通過。

## Risk Notes
- CDN 資源離線失效風險：需快取或在地化 Tailwind/字型。
- Service worker 快取版本控管，避免使用者卡在舊版。
