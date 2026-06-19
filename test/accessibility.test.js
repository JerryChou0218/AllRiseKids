/* M24 accessibility and keyboard checks
 * 執行：node test/accessibility.test.js
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
function has(pattern){ return pattern.test(html); }

const dialogs = [
  'alloc-modal',
  'gate-modal',
  'pin-modal',
  'buy-modal',
  'taskform-modal',
  'rewardform-modal',
  'levelup-overlay',
  'dayclear-overlay',
  'setpass-modal',
];
for(const id of dialogs){
  const re = new RegExp(`<div id="${id}"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="[^"]+"[^>]*aria-hidden="true"`);
  assert(re.test(html), `${id} has dialog role, modal state, title linkage, and hidden default`);
}

assert(has(/function openModal\(id, focusSelector\)/), 'modal opening is centralized');
assert(has(/function closeModal\(id\)/), 'modal closing is centralized');
assert(has(/document\.addEventListener\('keydown'[\s\S]*ev\.key !== 'Escape'[\s\S]*closeModal/), 'Escape closes active modal or overlay');
assert(has(/setAttribute\('aria-hidden','false'\)/) && has(/setAttribute\('aria-hidden','true'\)/), 'modal aria-hidden is synchronized');
assert(has(/lastFocusBeforeModal/) && has(/lastFocusBeforeModal\.focus/), 'modal close restores previous focus when possible');

const labelledControls = [
  'ob-name','ob-age','ob-gender','ob-pin',
  'pf-dailycount','pf-age','pf-gender',
  'tf-name','tf-emoji','tf-time','tf-cat','tf-diff','tf-schedule','tf-age','tf-why','tf-review',
  'rf-name','rf-emoji','rf-cost','rf-stock','rf-expires','rf-paused','setpass-inp','dbg-level',
  'parent-email','child-new-name',
];
for(const id of labelledControls){
  assert(html.includes(`for="${id}"`), `${id} has an associated label`);
}

assert(has(/id="tb-parent"[^>]*aria-label="進入家長模式，需要 PIN 驗證"/), 'parent entry explains PIN requirement');
assert(has(/id="pin-pad"[^>]*aria-label="PIN 數字鍵盤"/), 'PIN keypad has aria label');
assert(has(/pinPress\('\$\{k\}'\)"[^`]*aria-label="\$\{k==='⌫'\?'刪除一位 PIN':'輸入 PIN 數字 '\+k\}"/), 'dynamic PIN keys have aria labels');
assert(has(/role="button" tabindex="0" aria-label="查看任務 \$\{t\.name\}"[\s\S]*onkeydown="taskCardKey\(event,'\$\{t\.id\}'\)"/), 'mission cards are keyboard focusable');
assert(has(/function taskCardKey\(ev, id\)[\s\S]*ev\.key==='Enter'[\s\S]*ev\.key===' '/), 'mission cards open with Enter or Space');

assert(has(/aria-label="\$\{on\?'停用':'啟用'\}任務 \$\{p\.name\}"/), 'task pool enable toggle has task-specific aria label');
assert(has(/aria-label="設定 \$\{p\.name\} 的排程"/) && has(/aria-label="設定 \$\{p\.name\} 的建議年齡"/), 'task pool dynamic selects have aria labels');

if(fail){
  console.error(`\nAccessibility checks failed: ${fail}`);
  process.exit(1);
}
console.log(`\n=== 無障礙與鍵盤驗證通過（${pass} 項）===`);
