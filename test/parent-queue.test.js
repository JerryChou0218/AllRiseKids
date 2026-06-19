/* M18 家長審核佇列 + 通知驗證：
 *   多小孩各送出任務 → 家長層級彙總待審核數 → 進該小孩審核頁核准/退回 → 數字更新。
 * 不啟動 GUI；用 smoke 同款 DOM stub 跑 index.html。
 * 執行：node test/parent-queue.test.js
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

document.getElementById('parent-email').value = 'mom@gmail.com';
parentGoogleLogin();
const pid = cloudStore.getSession().parentId;

function makeChildSubmit(name){
  gateChildCreate();
  document.getElementById('child-new-name').value = name;
  createChildSubmit();
  document.getElementById('ob-name').value = name;
  finishOnboarding();
  const t = state.tasks.find(x=>x.status==='available');
  markDone(t.id);     // → pending；save() 立即鏡射到 blob
  exitChild();
}

makeChildSubmit('小宇');
makeChildSubmit('小美');

__assert(parentPendingCount(pid)===2, '兩小孩各送一筆 → 家長待審核總數 2');
const q = parentQueue(pid);
__assert(q.length===2 && q.every(g=>g.items.length===1), '佇列依小孩分組，各 1 筆');

const blockedPending = state.tasks.find(x=>x.status==='pending');
const blockedCoins = state.player.coins;
approveTask(blockedPending.id);
__assert(blockedPending.status==='pending' && state.player.coins===blockedCoins, '孩子模式不可直接核准待審核任務');

/* 核准小宇那筆 */
const A = cloudStore.listChildren(pid).find(c=>c.name==='小宇');
reviewChild(A.id);
__assert(cloudStore.getSession().activeChildId===A.id && parentUnlocked===true, 'reviewChild 進入該小孩且家長解鎖');
const pt = state.tasks.find(x=>x.status==='pending');
const coinsBefore = state.player.coins;
approveTask(pt.id);
__assert(state.tasks.find(x=>x.id===pt.id).status==='completed' && state.player.coins>coinsBefore, '核准後任務完成並發金幣');
exitChild();
__assert(parentPendingCount(pid)===1, '核准後家長待審核總數降為 1');

/* 退回小美那筆（M18+：退回應記入審核紀錄 kind:'reject'） */
const B = cloudStore.listChildren(pid).find(c=>c.name==='小美');
reviewChild(B.id);
const pt2 = state.tasks.find(x=>x.status==='pending');
rejectTask(pt2.id);
__assert(state.tasks.find(x=>x.id===pt2.id).status==='available', '退回後任務回 available');
__assert(state.history.some(h=>h.kind==='reject'), 'M18+：退回記入審核紀錄（kind:reject）');
exitChild();
__assert(parentPendingCount(pid)===0, '退回後家長待審核總數 0');

/* M18+：一鍵全部核准 + 送出時間 */
reviewChild(B.id);
const avail = state.tasks.filter(t=>t.status==='available' && !['epic','super'].includes(t.difficulty)).slice(0,3);
avail.forEach(t=>markDone(t.id));
__assert(state.tasks.filter(t=>t.status==='pending').length===3, '小美送出 3 筆待審核');
__assert(state.tasks.find(t=>t.status==='pending').submittedAt>0, 'M18+：送出時間 submittedAt 已記錄');
approveAllPending();
__assert(state.tasks.filter(t=>t.status==='pending').length===0, 'M18+：一鍵全部核准 → 待審核清空');
exitChild();

console.log('');
console.log(__af()===0 ? '=== 家長審核佇列驗證通過（'+__ap()+' 項）===' : '=== 失敗 '+__af()+' 項 ===');
`;

try{
  new Function(code + harness)();
}catch(e){
  console.error('RUNTIME ERROR:', e.message);
  process.exit(1);
}
process.exit(_f===0 ? 0 : 1);
