/* M19 進度曲線速通驗證：1→100 升級曲線、滿等、主線解鎖、階級、成長對比。
 * 模擬「每天完成今日任務」直到 Lv100，檢查曲線無卡關/通膨。
 * 執行：node test/progression.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function el(){
  return new Proxy({ style:{ setProperty(){} },
    classList:{ add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    dataset:{}, value:'', innerHTML:'', textContent:'',
    insertAdjacentHTML(){}, appendChild(){}, remove(){}, focus(){}, querySelectorAll(){ return []; } },
    { get(t,k){ return k in t ? t[k] : undefined; }, set(t,k,v){ t[k]=v; return true; } });
}
const els = {};
global.document = { getElementById:id=>{ els[id]=els[id]||el(); return els[id]; },
  querySelectorAll:()=>[], createElement:()=>el(), body:el() };
global.window = { innerWidth:400, innerHeight:800, scrollTo(){} };
global.localStorage = { _d:{}, getItem(k){ return this._d[k]===undefined?null:this._d[k]; }, setItem(k,v){ this._d[k]=v; }, removeItem(k){ delete this._d[k]; } };
global.confirm = ()=>true; global.prompt = ()=>'x';
global.setInterval = ()=>{}; global.setTimeout = f=>{ f(); return 0; }; global.clearTimeout = ()=>{};
Math.random = (()=>{ let s=42; return ()=>{ s=(s*1103515245+12345)%2147483648; return s/2147483648; }; })();

let _p=0,_f=0;
global.__pp = ()=>{ _p++; }; global.__pf = ()=>{ _f++; };
global.__ap = ()=>_p; global.__af = ()=>_f;

const harness = `
const __assert = (c,m)=>{ if(c){ console.log('PASS:', m); __pp(); } else { console.log('FAIL:', m); __pf(); } };

/* 1. 曲線：1..99 為正且單調遞增、前期親民 */
let mono=true, prev=0, totalXp=0;
for(let L=1; L<MAX_LEVEL; L++){ const n=xpNeeded(L); if(n<=0 || n<prev) mono=false; prev=n; totalXp+=n; }
__assert(mono, 'xpNeeded(1..99) 為正且單調遞增');
__assert(xpNeeded(1) <= 110, '前期親民：Lv1→2 所需 '+xpNeeded(1)+' XP ≤ 110');

/* 2. 速通：每日全完成(約 235 XP) → 模擬到 Lv100 */
state = defaultData(); state.player.name='速通'; state.player.level=1; state.player.xp=0;
backfillMainQuest();
const DAILY_XP = 235;
let days=0;
while(state.player.level < MAX_LEVEL && days < 6000){ awardXP(DAILY_XP); days++; }
console.log('   → 滿等總 XP ~'+totalXp+'，每日 '+DAILY_XP+' XP，模擬到 Lv100 約 '+days+' 天');
__assert(state.player.level===MAX_LEVEL, '可達 Lv100（'+days+' 天）');
__assert(days>=180 && days<=720, '到 Lv100 天數落在合理區間 180–720（無速成/無卡關）');
__assert(state.player.xp===0, '滿等後 XP 歸零（不溢出）');

/* 3. 滿等後不再升級 */
const lv0=state.player.level; awardXP(100000);
__assert(state.player.level===lv0 && state.player.xp===0, '滿等後再給大量 XP 不再升級');

/* 4. 主線：10 章全解鎖、金幣前向發放（不回溯補發 mq1） */
__assert(state.player.mainQuestClaimed.length===MAIN_QUEST.length, '主線 '+MAIN_QUEST.length+' 章全解鎖');
const mqCoins = MAIN_QUEST.reduce((a,c)=>a+c.coins,0);
const mqHist = state.history.filter(h=>h.kind==='mainquest').reduce((a,h)=>a+(h.coinsEarned||0),0);
__assert(mqHist===mqCoins, '主線金幣前向發放總額正確（'+mqHist+'）');

/* 5. 階級對應 1→100 */
__assert(hunterRank(1)==='E' && hunterRank(16)==='D' && hunterRank(31)==='C' && hunterRank(46)==='B' && hunterRank(61)==='A' && hunterRank(76)==='S' && hunterRank(91)==='國家', 'hunterRank 階級對應 1→100 正確');

/* 6. 成長對比 today vs yesterday */
state.history.unshift({ date:todayStr(), kind:'task', name:'x', xpEarned:1, coinsEarned:1 });
const g = growthSnapshot();
__assert(g.todayDone>=1 && typeof g.beatYesterday==='boolean' && g.dailyGoal>0, 'growthSnapshot 回傳今日完成/達標/超越昨天');

console.log('');
console.log(__af()===0 ? '=== 進度曲線速通驗證通過（'+__ap()+' 項）===' : '=== 失敗 '+__af()+' 項 ===');
`;

try{
  new Function(code + harness)();
}catch(e){
  console.error('RUNTIME ERROR:', e.message);
  process.exit(1);
}
process.exit(_f===0 ? 0 : 1);
