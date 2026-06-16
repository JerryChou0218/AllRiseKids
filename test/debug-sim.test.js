/* M20 除錯模式 + 速通報告驗證：
 *   無限金幣/跳級作用於 live state；simulateProgression 跑 Lv1→100 出階段報告且「不污染正式存檔」。
 * 執行：node test/debug-sim.test.js
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

/* 準備：登入家長 + 進入一個小孩，建立真實存檔 */
document.getElementById('parent-email').value = 'mom@gmail.com';
parentGoogleLogin();
gateChildCreate(); document.getElementById('child-new-name').value='小宇'; createChildSubmit();
document.getElementById('ob-name').value='小宇'; finishOnboarding();
state.player.coins = 50; state.player.level = 3; save();

/* 1. 除錯：跳級 + 加金幣作用於 live state */
debugSetLevel(20);
__assert(state.player.level===20, 'debugSetLevel 設等級 20');
debugAddCoins(1000);
__assert(state.player.coins>=1050, 'debugAddCoins +1000 生效');
debugToggleInfiniteCoins();
__assert(state.player.coins===999999 && debugInfiniteCoins===true, '無限金幣設 999999');

/* 2. 速通報告「不污染正式存檔」：模擬前後 live state 完全相同 */
const before = JSON.stringify(state);
const rep = simulateProgression();
const after = JSON.stringify(state);
__assert(before===after, 'simulateProgression 不污染正式存檔（前後 state 相同）');

/* 3. 報告內容：抵達滿等、9 個檢查點、天數/任務/金幣單調遞增 */
__assert(rep.reachedMax && rep.rows.length===9, '速通報告抵達 Lv100 且含 9 個階段檢查點');
let monoDay=true, monoCoin=true;
for(let i=1;i<rep.rows.length;i++){ if(rep.rows[i].day < rep.rows[i-1].day) monoDay=false; if(rep.rows[i].totalCoins < rep.rows[i-1].totalCoins) monoCoin=false; }
__assert(monoDay && monoCoin, '各階段天數與累計金幣單調遞增（無倒退）');
__assert(rep.days>=180 && rep.days<=720, '到 Lv100 天數合理（'+rep.days+' 天，無速成/卡關）');
const last = rep.rows[rep.rows.length-1];
__assert(last.mainq===10, '滿等時主線 10 章全解鎖');
console.log('   → 速通：'+rep.days+' 天 / '+rep.totalTasks+' 任務 / ~'+last.totalCoins+' 🪙 / 主線 '+last.mainq+'/10');

/* 4. 早期不卡關：Lv5、Lv10 在合理早期天數內 */
const r5 = rep.rows.find(x=>x.level===5), r10 = rep.rows.find(x=>x.level===10);
__assert(r5.day<=10 && r10.day<=40, '早期成長順暢（Lv5≤10天、Lv10≤40天）');

console.log('');
console.log(__af()===0 ? '=== 除錯/速通驗證通過（'+__ap()+' 項）===' : '=== 失敗 '+__af()+' 項 ===');
`;

try{
  new Function(code + harness)();
}catch(e){
  console.error('RUNTIME ERROR:', e.message);
  process.exit(1);
}
process.exit(_f===0 ? 0 : 1);
