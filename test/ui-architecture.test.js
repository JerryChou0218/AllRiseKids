/* M24 UI/IA static checks
 * 執行：node test/ui-architecture.test.js
 * 驗證產品架構重構不被後續修改破壞。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0;
function assert(cond, msg){
  if(cond){ console.log('PASS:', msg); pass++; }
  else { console.log('FAIL:', msg); fail++; }
}
function count(pattern){
  return (html.match(pattern) || []).length;
}

const navs = [...html.matchAll(/data-nav="([^"]+)"/g)].map(m=>m[1]);
assert(navs.length === 5, '孩子模式第一層導航只有 5 個');
assert(['home','quests','adventure','rewards','profile'].every(n=>navs.includes(n)), '孩子導航為首頁/任務/冒險/獎勵/我的角色');
assert(!/data-nav="(skills|map|inventory|leaderboard|shop|parent)"/.test(html), '進階功能與家長頁不在孩子第一層導航');

const parentTabs = [...html.matchAll(/data-ptab="([^"]+)"/g)].map(m=>m[1]);
assert(['overview','review','tasks','rewards','records','settings'].every(t=>parentTabs.includes(t)), '家長模式六分頁存在');
assert(count(/data-parent-panel="/g) >= 9, '家長內容依分頁分組');
assert(html.includes('id="parent-records-dashboard"') && html.includes('function renderParentRecords'), 'parent records dashboard render helper exists');
assert(html.includes('id="rf-stock"') && html.includes('id="rf-expires"') && html.includes('id="rf-paused"') && html.includes('function rewardAvailability'), 'real reward management supports stock, expiry, and paused state');
assert(['每日完成率','任務分類分布','能力成長','獎勵兌換紀錄','最近紀錄'].every(s=>html.includes(s)), 'parent records dashboard covers completion/category/ability/reward/history');
assert(html.includes('function fulfillReward') && html.includes('標示已兌現') && html.includes("status = 'fulfilled'"), '真實獎勵核准後仍需家長標示已兌現');
assert(html.includes('function requireParentMode') && html.includes('if(!requireParentMode()) return'), '家長高風險操作有 PIN guard');

assert(html.includes('id="screen-home"'), '孩子首頁存在');
assert(html.includes('下一個推薦任務') && html.includes('今日任務進度') && html.includes('冒險預告'), '首頁突出今日狀態與下一步');
assert(html.includes('id="ob-progress"') && html.includes('function showOnboardingStep') && count(/data-ob-step="/g) >= 6, '初次使用流程改為分步 onboarding');
assert(['ob-name','ob-age','ob-gender','ob-classes','ob-avatars','ob-pin'].every(id=>html.includes(`id="${id}"`)), 'onboarding 保留角色、年齡、性別、職業、代表圖示與 PIN 欄位');
assert(html.includes('CHARACTER_AVATARS') && html.includes('pickAvatar') && html.includes('state.player.avatar') && html.includes('const base = state.player.avatar || cls.sprite'), 'onboarding 代表圖示會保存並顯示在角色圖框');
assert(html.includes('const FEATURE_UNLOCKS'), '功能解鎖集中設定存在');
assert(html.includes('hasUsedFeature') && html.includes('isFeatureUnlocked'), '解鎖有舊資料相容判斷');

assert(html.includes('今日任務') && html.includes('挑戰任務') && html.includes('任務紀錄'), '任務頁有三個分頁');
assert(html.includes('function missionUiState') && html.includes('function startTask') && ['尚未開始','進行中','等待審核','已完成'].every(s=>html.includes(s)), '任務流程有派生狀態與開始任務導引');
assert(html.includes('開始任務') && html.includes('提交完成，等待家長審核'), '任務詳情先開始再提交完成');
assert(html.includes('id="tf-review"') && html.includes('requiresReview') && html.includes('completeTaskReward'), '任務可設定是否需要家長審核且共用獎勵結算');
assert(html.includes('id="tf-completion"') && html.includes('completion:p.completion') && html.includes('完成條件：'), '任務管理可設定完成條件並顯示在任務詳情');
assert(html.includes('冒險團戰績') && !html.includes('<span class="sys-i">i</span>世界戰績排行榜'), '排行榜弱化為冒險團戰績');
assert(!html.includes('DEMO_RIVALS') && html.includes('不製造假的全球排行榜'), '冒險團戰績不使用假全球玩家資料');
assert(!html.includes('警告：未完成全部每日任務'), '任務頁不使用恐嚇式連續紀錄文案');

assert(html.includes('advanced-box') && html.includes('進階設定 / 除錯'), '除錯和平衡測試收在進階設定');
assert(html.includes('validateImportedSave'), '匯入資料前有格式驗證');
assert(html.includes('resetCurrentChildData') && html.includes("code !== 'RESET'"), '重置資料有二次確認');
assert(html.includes('aria-label="孩子模式主要導覽"') && html.includes('aria-label="家長模式分頁"'), '主要導覽有 aria-label');

if(fail){
  console.error(`\nUI architecture checks failed: ${fail}`);
  process.exit(1);
}
console.log(`\n=== UI 架構驗證通過（${pass} 項）===`);
