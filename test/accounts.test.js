/* M17 家長/小孩帳號流程驗證（取代舊扁平模型）：
 *   家長 Gmail 登入 → 建立小孩（≤4）→ 各自進度隔離 → 登出小孩需回家長 → 家長登出。
 * 不啟動 GUI；用 smoke 同款 DOM stub 跑 index.html，直接呼叫 gate 流程函式。
 * 執行：node test/accounts.test.js
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

const harness = `
const __assert = (c,m)=>{ if(c){ console.log('PASS:', m); __pp(); } else { console.log('FAIL:', m); __pf(); } };

/* 1. 家長以 Gmail 登入 */
document.getElementById('parent-email').value = 'mom@gmail.com';
parentGoogleLogin();
const pid = cloudStore.getSession().parentId;
__assert(pid && auth.currentParent().email==='mom@gmail.com', '家長以 Gmail 登入');

/* 小工具：建立小孩 + 完成覺醒 + 設定金幣 + 登出小孩 */
function makeChild(name, coins){
  gateChildCreate();
  document.getElementById('child-new-name').value = name;
  createChildSubmit();                 // → enterChild（新小孩進覺醒）
  document.getElementById('ob-name').value = name;
  finishOnboarding();                  // 完成角色建立
  state.player.coins = coins; save();  // 給不同金幣以驗證隔離
  exitChild();                         // 存回並回家長首頁
}

/* 2. 建立兩個小孩 */
makeChild('小宇', 111);
makeChild('小美', 222);
__assert(cloudStore.listChildren(pid).length===2, '家長底下建立兩個小孩');

/* 3. 進入各小孩 → 進度互相獨立 */
const kids = cloudStore.listChildren(pid);
const A = kids.find(k=>k.name==='小宇'); const B = kids.find(k=>k.name==='小美');
enterChild(A.id);
__assert(state.player.name==='小宇' && state.player.coins===111, '進入小宇：進度獨立（111）');
exitChild();
enterChild(B.id);
__assert(state.player.name==='小美' && state.player.coins===222, '進入小美：進度獨立（222）');

/* 4. 小孩切換需先登出小孩：exitChild 後無活躍小孩、家長仍在 */
exitChild();
__assert(cloudStore.getSession().parentId===pid && cloudStore.getSession().activeChildId===null, '登出小孩後回家長（家長未登出）');

/* 5. 最多 4 個小孩，第 5 個被阻擋 */
makeChild('小安', 0); makeChild('小樂', 0);
__assert(cloudStore.listChildren(pid).length===4, '可建立 4 個小孩');
gateChildCreate(); document.getElementById('child-new-name').value='第五個'; createChildSubmit();
__assert(cloudStore.listChildren(pid).length===4, '第 5 個小孩被阻擋（max 4）');

/* 6. 家長登出（只在家長頁）→ session 清空 */
parentLogout();
__assert(auth.currentParent()===null && cloudStore.getSession().parentId===null, '家長登出後 session 清空');

console.log('');
console.log(__af()===0 ? '=== 家長/小孩帳號驗證通過（'+__ap()+' 項）===' : '=== 失敗 '+__af()+' 項 ===');
`;
global.__ap = ()=>_p; global.__af = ()=>_f;

try{
  new Function(code + harness)();
}catch(e){
  console.error('RUNTIME ERROR:', e.message);
  process.exit(1);
}
process.exit(_f===0 ? 0 : 1);
