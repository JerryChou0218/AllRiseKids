/* 本機多帳號驗證：建立多帳號、進度各自獨立、登出切換、密碼把關。
 * 不啟動 GUI；用 smoke 同款 DOM stub 跑 index.html，直接呼叫帳號函式並檢查 state。
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
global.window = { innerWidth:400, innerHeight:800, scrollTo(){} };  // 無 kqStore → 走 localStorage
global.localStorage = { _d:{}, getItem(k){ return this._d[k]===undefined?null:this._d[k]; }, setItem(k,v){ this._d[k]=v; }, removeItem(k){ delete this._d[k]; } };
global.confirm = ()=>true; global.prompt = ()=>'7777';
global.setInterval = ()=>{}; global.setTimeout = f=>{ f(); return 0; }; global.clearTimeout = ()=>{};
Math.random = (()=>{ let s=42; return ()=>{ s=(s*1103515245+12345)%2147483648; return s/2147483648; }; })();

let pass=0, fail=0;
const assert=(c,m)=>{ if(c){ console.log('PASS:', m); pass++; } else { console.log('FAIL:', m); fail++; } };

const harness = `
function makeAccount(name, pw, coins){
  document.getElementById('acc-new-name').value = name;
  document.getElementById('acc-new-pass').value = pw;
  createAccountSubmit();                 // 建立帳號 + 進入覺醒引導（已預填 ob-name）
  finishOnboarding();                    // 完成角色建立
  state.player.coins = coins; save();    // 給各帳號不同金幣以驗證隔離
}

/* 1. 建立兩個帳號（各有密碼、各自進度） */
makeAccount('小宇', '1111', 111);
makeAccount('小美', '2222', 222);
let c = accountsLoad();
assert(c.accounts.length===2, '建立兩個本機帳號');
const A = c.accounts.find(a=>a.name==='小宇');
const B = c.accounts.find(a=>a.name==='小美');
assert(A && B, '兩帳號名稱正確（小宇 / 小美）');
assert(A.pass && A.pass===__hash('1111') && A.pass!==A_plain(), '密碼以雜湊儲存（非明文）');
assert(c.activeId===B.id && state.player.coins===222, '剛建立的帳號（小美）為登入中、金幣 222');

/* 2. 登出 → 切換到小宇（正確密碼） */
switchAccount();
gateSel = A.id;
document.getElementById('acc-pass').value = '1111';
loginSubmit();
assert(state.player.name==='小宇' && state.player.coins===111, '切換到小宇：進度獨立（金幣 111）');

/* 3. 密碼錯誤不得登入 */
switchAccount();
gateSel = B.id;
document.getElementById('acc-pass').value = '0000';
loginSubmit();
assert(state.player.name==='小宇', '密碼錯誤 → 維持原帳號（小宇），未切換');

/* 4. 正確密碼登入小美 */
document.getElementById('acc-pass').value = '2222';
loginSubmit();
assert(state.player.name==='小美' && state.player.coins===222, '正確密碼 → 登入小美（金幣 222）');

/* 5. 兩帳號存檔互相隔離 */
c = accountsLoad();
const ab = JSON.parse(c.accounts.find(a=>a.name==='小宇').blob);
const bb = JSON.parse(c.accounts.find(a=>a.name==='小美').blob);
assert(ab.player.coins===111 && bb.player.coins===222, '兩帳號存檔各自獨立（111 / 222）');

/* 6. 家長：變更指定帳號密碼 + 刪除指定帳號 */
setAccountPassword(A.id);                   // 開啟設定密碼 modal（_setpassId = A.id；Electron 相容，不用 prompt）
document.getElementById('setpass-inp').value = '7777';
submitSetPass();                            // 套用新密碼
assert(accountsLoad().accounts.find(a=>a.id===A.id).pass===__hash('7777'), '家長可變更指定帳號密碼');
const cnt0 = accountsLoad().accounts.length;
deleteAccount(A.id);                        // 刪除指定帳號（A 非登入中）
assert(accountsLoad().accounts.length===cnt0-1 && !accountsLoad().accounts.some(a=>a.id===A.id), '家長可刪除指定帳號');

console.log('');
console.log(__afail()===0 ? '=== 多帳號驗證通過（'+__apass()+' 項）===' : '=== 失敗 '+__afail()+' 項 ===');
`;

// 橋接：讓測試字串能取用斷言計數與雜湊
global.__pass = ()=>{}; // 未用
let _p=0,_f=0;
global.__apass = ()=>_p; global.__afail = ()=>_f;
global.__hash = null; // 由遊戲碼內的 hashPass 提供（同作用域），這裡用包裝
const bridge = `
function __hash(s){ return hashPass(s); }
function A_plain(){ return '1111'; }
const __assert = (c,m)=>{ if(c){ console.log('PASS:', m); __pp(); } else { console.log('FAIL:', m); __pf(); } };
`;
global.__pp = ()=>{ _p++; }; global.__pf = ()=>{ _f++; };

try{
  // 在遊戲碼作用域內，把 assert 換成計數版
  const wired = harness.replace(/\bassert\(/g, '__assert(');
  new Function(code + bridge + wired)();
}catch(e){
  console.error('RUNTIME ERROR:', e.message);
  process.exit(1);
}
process.exit(_f===0 ? 0 : 1);
