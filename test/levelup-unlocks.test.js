/* M24 level-up unlock feedback checks
 * 執行：node test/levelup-unlocks.test.js
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

assert(html.includes('id="lv-unlocks"'), 'level-up overlay has unlock panel');
assert(has(/function unlockedFeaturesBetween\(fromLevel, toLevel\)[\s\S]*Object\.entries\(FEATURE_UNLOCKS\)[\s\S]*u\.level > fromLevel && u\.level <= toLevel/), 'unlock helper finds features crossed by this level-up');
assert(has(/function awardXP\(amount\)[\s\S]*fromLevel = p\.level[\s\S]*showLevelUp\(p\.level, fromRank, fromLevel\)/), 'awardXP passes previous level to level-up overlay');
assert(has(/function showLevelUp\(level, fromRank, fromLevel\)[\s\S]*unlockedFeaturesBetween\(fromLevel\|\|level-1, level\)[\s\S]*新功能解鎖[\s\S]*🔓/), 'level-up overlay renders newly unlocked features');
assert(html.includes('Lv3') || html.includes('level:3'), 'unlock milestones include early Lv3 unlock');
assert(html.includes('level:20') && html.includes('高階挑戰'), 'unlock milestones include high-level challenge unlock');

if(fail){
  console.error(`\nLevel-up unlock checks failed: ${fail}`);
  process.exit(1);
}
console.log(`\n=== Level Up 解鎖提示驗證通過（${pass} 項）===`);
