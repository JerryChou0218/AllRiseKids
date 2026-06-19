/* M21 冒險團戰績驗證：實際孩子資料彙整、排序/名次、隱私（不洩 email/家長）、總榜/週榜/同齡篩選。
 * 執行：node test/leaderboard.test.js
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

function makeChild(name, age, level, tasks){
  gateChildCreate();
  document.getElementById('child-new-name').value = name;
  createChildSubmit();
  document.getElementById('ob-name').value = name;
  document.getElementById('ob-age').value = age;
  finishOnboarding();
  debugSetLevel(level);
  state.counters.total = tasks;
  save();
}

document.getElementById('parent-email').value = 'mom@gmail.com';
parentGoogleLogin();
makeChild('小宇', 12, 40, 300); exitChild();
makeChild('小美', 8, 20, 150);   // 留在小美（state.player.age=8）

/* 1. 冒險團戰績只使用實際孩子資料，不混入示範對手 */
const all = worldLeaderboard('all');
__assert(typeof DEMO_RIVALS === 'undefined', '不再保留 DEMO_RIVALS 假排行榜資料');
__assert(all.length === 2, '冒險團戰績只含 2 個實際小孩（共 '+all.length+'）');
__assert(!all.some(e=>['闇影獵人','星辰法師','白銀騎士'].includes(e.name)), '榜單不含假全球玩家名稱');

/* 2. 名次與排序：依等級/任務遞減，place=1..n */
let sorted=true; const sc = e=>(e.level||1)*100000+(e.tasks||0);
for(let i=1;i<all.length;i++){ if(sc(all[i])>sc(all[i-1])) sorted=false; }
__assert(sorted, '總榜依等級/戰績遞減排序');
__assert(all[0].place===1 && all[all.length-1].place===all.length, '名次 place 連續 1..n');

/* 3. 隱私：只公開非敏感欄位，不含 email/家長/存檔 */
const keysOk = all.every(e=> !('email' in e) && !('parentId' in e) && !('blob' in e) && !('pass' in e));
__assert(keysOk, '排行項目不含 email/家長/存檔/密碼欄位');

/* 4. 本機小孩標記為自己，顯示遊戲暱稱 */
__assert(all.some(e=>e.self && e.name==='小宇') && all.some(e=>e.self && e.name==='小美'), '本機小孩以遊戲暱稱出現且標記為自己');

/* 5. 同齡榜：只含 ±1 歲（self 小美 8 歲 → 7/8/9） */
const ageB = worldLeaderboard('age');
__assert(ageB.length>0 && ageB.every(e=>Math.abs((e.age||10)-8)<=1), '同齡榜只含 ±1 歲（7–9）');

/* 6. 週榜：依本週任務數遞減 */
const wk = worldLeaderboard('week');
let wsorted=true; for(let i=1;i<wk.length;i++){ if((wk[i].weekTasks||0)>(wk[i-1].weekTasks||0)) wsorted=false; }
__assert(wsorted, '週榜依本週任務數遞減排序');

console.log('');
console.log(__af()===0 ? '=== 冒險團戰績驗證通過（'+__ap()+' 項）===' : '=== 失敗 '+__af()+' 項 ===');
`;

try{
  new Function(code + harness)();
}catch(e){
  console.error('RUNTIME ERROR:', e.message);
  process.exit(1);
}
process.exit(_f===0 ? 0 : 1);
