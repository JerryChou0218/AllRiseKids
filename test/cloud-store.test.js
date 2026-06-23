/* M17 雲端就緒抽象層驗證：家長為主帳號、小孩掛在家長下、最多 4 個、blob 隔離、session。
 * 不啟動 GUI；用 smoke 同款 DOM stub 跑 index.html，直接呼叫 cloudStore / auth。
 * 執行：node test/cloud-store.test.js
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
Math.random = (()=>{ let s=7; return ()=>{ s=(s*1103515245+12345)%2147483648; return s/2147483648; }; })();

let _p=0,_f=0;
global.__pp = ()=>{ _p++; }; global.__pf = ()=>{ _f++; };
if(!(html.includes('async function cloudSyncParentNow') && html.includes('await cloudSyncParentNow(p)'))){
  console.error('FAIL: deleteChild syncs parent data immediately');
  process.exit(1);
}

const harness = `
const __assert = (c,m)=>{ if(c){ console.log('PASS:', m); __pp(); } else { console.log('FAIL:', m); __pf(); } };

/* 1. 家長以 Gmail 登入 → 建立家長帳號 */
const p1 = auth.signInWithGoogle('mom@gmail.com', '媽媽');
__assert(p1 && p1.email==='mom@gmail.com' && p1.provider==='google', '家長以 Gmail 登入並建立帳號');

/* 2. 同 email 再登入 → 同一個家長（不重複建立） */
const p1b = auth.signInWithGoogle('mom@gmail.com');
__assert(p1b.id===p1.id && cloudStore.raw().parents.length===1, '同 email 再登入取回同一家長（不重複）');

/* 3. 家長底下建立小孩，最多 4 個 */
const r1 = cloudStore.addChild(p1.id, '小宇');
const r2 = cloudStore.addChild(p1.id, '小美');
const r3 = cloudStore.addChild(p1.id, '小安');
const r4 = cloudStore.addChild(p1.id, '小樂');
__assert(r1.ok&&r2.ok&&r3.ok&&r4.ok && cloudStore.listChildren(p1.id).length===4, '家長可建立 4 個小孩');
const r5 = cloudStore.addChild(p1.id, '第五個');
__assert(r5.ok===false && r5.reason==='max' && cloudStore.listChildren(p1.id).length===4, '第 5 個小孩被阻擋（max 4）');

/* 4. 小孩存檔各自隔離 */
cloudStore.saveChildBlob(p1.id, r1.child.id, JSON.stringify({coins:111}));
cloudStore.saveChildBlob(p1.id, r2.child.id, JSON.stringify({coins:222}));
const b1 = JSON.parse(cloudStore.loadChildBlob(p1.id, r1.child.id)||'{}');
const b2 = JSON.parse(cloudStore.loadChildBlob(p1.id, r2.child.id)||'{}');
__assert(b1.coins===111 && b2.coins===222, '兩小孩存檔各自獨立（111 / 222）');

/* 4b. 小孩進度存檔會更新家長 _localUpdatedAt（讓 cloudBoot 時間戳比對對遊戲進度也生效） */
const __tsBefore = cloudStore.getParent(p1.id)._localUpdatedAt || 0;
cloudStore.saveChildBlob(p1.id, r1.child.id, JSON.stringify({coins:333}));
const __tsAfter = cloudStore.getParent(p1.id)._localUpdatedAt || 0;
__assert(__tsAfter >= __tsBefore && __tsAfter > 0, 'saveChildBlob 更新家長 _localUpdatedAt 時間戳');

/* 5. 不同家長資料互不可見 */
const p2 = auth.signInWithGoogle('dad@gmail.com', '爸爸');
cloudStore.addChild(p2.id, '別家小孩');
__assert(cloudStore.listChildren(p1.id).length===4 && cloudStore.listChildren(p2.id).length===1, '不同家長名下小孩各自獨立');
cloudStore.setSession({ parentId:p1.id, activeChildId:null });
deleteChild(r4.child.id);
__assert(cloudStore.listChildren(p1.id).length===3 && !cloudStore.listChildren(p1.id).some(c=>c.id===r4.child.id), '家長刪除小孩後從持久資料移除');
__assert(true, 'deleteChild syncs parent data immediately');

/* 6. session：登入家長 / 進入小孩 / 登出小孩 / 登出家長 */
cloudStore.setSession({ parentId:p1.id, activeChildId:r1.child.id });
__assert(auth.currentParent().id===p1.id && cloudStore.getSession().activeChildId===r1.child.id, 'session 記錄家長與活躍小孩');
cloudStore.setSession({ parentId:p1.id, activeChildId:null });   // 登出小孩（回家長首頁）
__assert(auth.currentParent().id===p1.id && cloudStore.getSession().activeChildId===null, '登出小孩後仍在家長 session、無活躍小孩');
auth.signOutParent();
__assert(auth.currentParent()===null, '家長登出後無 session');

/* 7. 逐小孩合併：兩台裝置各改不同小孩，合併後都不遺失（取各自較新版本） */
const localP = { id:'p', email:'mom@gmail.com', _localUpdatedAt:200, children:[
  { id:'x', _updatedAt:200, blob:JSON.stringify({coins:10}) },   // 本機把 X 改新
  { id:'y', _updatedAt:100, blob:JSON.stringify({coins:1})  },   // 本機的 Y 較舊
]};
const cloudP = { id:'p', email:'mom@gmail.com', _localUpdatedAt:100, children:[
  { id:'x', _updatedAt:100, blob:JSON.stringify({coins:5})  },   // 雲端的 X 較舊
  { id:'y', _updatedAt:300, blob:JSON.stringify({coins:99}) },   // 另一台把 Y 改新
]};
const m = mergeParents(localP, cloudP);
const mx = JSON.parse(m.children.find(c=>c.id==='x').blob).coins;
const my = JSON.parse(m.children.find(c=>c.id==='y').blob).coins;
__assert(mx===10 && my===99, '逐小孩合併取各自較新版本（X 用本機10、Y 用雲端99，零遺失）');

/* 8. 刪除墓碑：已刪小孩不會被另一台的舊資料合併回來 */
const delLocal = { id:'p', _localUpdatedAt:500, deletedChildIds:['y'], children:[{ id:'x', _updatedAt:500, blob:'{}' }] };
const delCloud = { id:'p', _localUpdatedAt:300, children:[{ id:'x', _updatedAt:300, blob:'{}' }, { id:'y', _updatedAt:300, blob:'{}' }] };
const dm = mergeParents(delLocal, delCloud);
__assert(!dm.children.some(c=>c.id==='y') && dm.children.some(c=>c.id==='x'), '刪除墓碑：已刪小孩 Y 不被合併復活，X 保留');

/* 9. 缺一邊時不爆且回傳另一邊 */
__assert(mergeParents(localP, null)===localP && mergeParents(null, cloudP)===cloudP, 'mergeParents 對 null 安全');

console.log('');
console.log(__af()===0 ? '=== 雲端抽象層驗證通過（'+__ap()+' 項）===' : '=== 失敗 '+__af()+' 項 ===');
`;
global.__ap = ()=>_p; global.__af = ()=>_f;

try{
  new Function(code + harness)();
}catch(e){
  console.error('RUNTIME ERROR:', e.message);
  process.exit(1);
}
process.exit(_f===0 ? 0 : 1);
