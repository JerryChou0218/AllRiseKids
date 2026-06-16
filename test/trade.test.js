/* M22 跨家庭物品交換驗證：狀態機(proposed→accepted/declined/cancelled)、家長核可、守恆。
 * 兩個本機家庭(媽媽/小宇、爸爸/小美)互相交換。執行：node test/trade.test.js
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

const mom = auth.signInWithGoogle('mom@gmail.com','媽媽');
const dad = auth.signInWithGoogle('dad@gmail.com','爸爸');
const A = cloudStore.addChild(mom.id,'小宇').child;   // 媽媽家
const B = cloudStore.addChild(dad.id,'小美').child;   // 爸爸家

function seed(parent, child, items){
  const d = defaultData(); d.player.name = child.name; d.inventory = items.map(i=>({...i}));
  cloudStore.saveChildBlob(parent.id, child.id, JSON.stringify(d));
}
function activate(parent, child){
  cloudStore.setSession({ parentId:parent.id, activeChildId:child.id });
  state = JSON.parse(cloudStore.loadChildBlob(parent.id, child.id));
}
const invIds = (p,c)=>cloudStore.childInventory(p.id,c.id).map(i=>i.id).sort().join(',');
const totalItems = ()=>cloudStore.childInventory(mom.id,A.id).length + cloudStore.childInventory(dad.id,B.id).length;
const X = { id:'n10', name:'武器A', emoji:'⚔️', type:'weapon', rarity:'rare', equipped:false };
const Y = { id:'n20', name:'帽子B', emoji:'🎩', type:'hat', rarity:'epic', equipped:false };

/* 1. 提案 + 接受 → 守恆交換 */
seed(mom,A,[X]); seed(dad,B,[Y]);
const before = totalItems();
activate(mom,A);
const r1 = proposeTrade(dad.id, B.id, 'n10', 'n20');
__assert(r1.ok && r1.trade.status==='proposed', '小宇提出交換（proposed）');
activate(dad,B);
const resp1 = respondTrade(r1.trade.id, true);
__assert(resp1.status==='accepted', '小美接受 → accepted');
__assert(invIds(mom,A)==='n20' && invIds(dad,B)==='n10', '雙方背包正確交換（A得Y、B得X）');
__assert(totalItems()===before, '物品守恆（交換前後總數不變）');

/* 2. 拒絕 → declined，背包不變 */
seed(mom,A,[X]); seed(dad,B,[Y]);
activate(mom,A);
const r2 = proposeTrade(dad.id, B.id, 'n10', null);   // 贈送
activate(dad,B);
const resp2 = respondTrade(r2.trade.id, false);
__assert(resp2.status==='declined', '小美拒絕 → declined');
__assert(invIds(mom,A)==='n10' && invIds(dad,B)==='n20', '拒絕後雙方背包不變');

/* 3. 取消 → cancelled */
activate(mom,A);
const r3 = proposeTrade(dad.id, B.id, 'n10', null);
const c3 = cancelTrade(r3.trade.id);
__assert(c3.ok && cloudStore.tradesAll().find(t=>t.id===r3.trade.id).status==='cancelled', '提案者取消 → cancelled');

/* 4. 家長核可開關：accept → pending_parent → 家長核准 → accepted */
const dp = cloudStore.getParent(dad.id); dp.tradeApproval = true; cloudStore.saveParent(dp);
seed(mom,A,[X]); seed(dad,B,[Y]);
activate(mom,A);
const r4 = proposeTrade(dad.id, B.id, 'n10', 'n20');
activate(dad,B);
const resp4 = respondTrade(r4.trade.id, true);
__assert(resp4.status==='pending_parent', '核可開：接受後進入 pending_parent（尚未成交）');
__assert(invIds(mom,A)==='n10' && invIds(dad,B)==='n20', 'pending_parent 期間背包尚未變動');
const ap = parentApproveTrade(r4.trade.id, true);
__assert(ap.status==='accepted' && invIds(mom,A)==='n20' && invIds(dad,B)==='n10', '家長核准後才成交（守恆交換）');

console.log('');
console.log(__af()===0 ? '=== 物品交換驗證通過（'+__ap()+' 項）===' : '=== 失敗 '+__af()+' 項 ===');
`;

try{
  new Function(code + harness)();
}catch(e){
  console.error('RUNTIME ERROR:', e.message);
  process.exit(1);
}
process.exit(_f===0 ? 0 : 1);
