/* M24 task reward feedback checks
 * 執行：node test/reward-feedback.test.js
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

assert(html.includes('.reward-float'), 'reward feedback CSS exists');
assert(html.includes('.reward-clear') && html.includes('.reward-pill.exp') && html.includes('.reward-pill.coin'), 'CLEAR / EXP / coin visual tokens exist');
assert(has(/function prefersReducedMotion\(\)[\s\S]*matchMedia\('\(prefers-reduced-motion: reduce\)'\)/), 'reduced motion helper checks user preference');
assert(has(/function showMissionRewardFeedback\(task, reward\)[\s\S]*prefersReducedMotion\(\)[\s\S]*reward-clear[\s\S]*\+\$\{reward\.xp\} EXP[\s\S]*\+\$\{reward\.coins\} 金幣/), 'mission reward feedback renders CLEAR, EXP, and coins');
assert(has(/function showMissionRewardFeedback\(task, reward\)[\s\S]*spawnShards\(x, y\)[\s\S]*setTimeout\(\(\)=>box\.remove\(\), 1600\)/), 'mission reward feedback cleans itself up');
assert(has(/function spawnShards\(x, y\)[\s\S]*if\(prefersReducedMotion\(\)\) return/), 'particle shards respect reduced motion');
assert(has(/function approveTask\(id\)[\s\S]*state\.player\.coins \+= r\.coins[\s\S]*save\(\);[\s\S]*showMissionRewardFeedback\(t, r\)[\s\S]*toast\(`已核准/), 'approveTask shows reward feedback after save without changing reward formula');

if(fail){
  console.error(`\nReward feedback checks failed: ${fail}`);
  process.exit(1);
}
console.log(`\n=== 任務回饋動畫驗證通過（${pass} 項）===`);
