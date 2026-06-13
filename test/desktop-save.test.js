/* 桌面版存檔驗證：證明「存檔寫成資料夾內的檔案、整包搬走仍可接續」。
 * 不啟動 GUI；以真實檔案模擬 Electron preload 的 window.kqStore，
 * 跑 index.html 的 kqStorage 橋接，驗證 save→檔案→（搬移）→load 還原。
 * 執行：node test/desktop-save.test.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];

/* 模擬 Electron preload 的「帶 key」檔案存檔後端（與 electron/preload.js 同邏輯） */
function makeFileStore(dir){
  const NAMES = { kidquest_data:'kidquest-save.json', kidquest_accounts:'kidquest-accounts.json' };
  const fileFor = key => path.join(dir, NAMES[key] || (String(key).replace(/[^a-z0-9_\-]/gi,'_')+'.json'));
  return {
    read(key){ const f=fileFor(key); try { return fs.existsSync(f) ? fs.readFileSync(f,'utf8') : null; } catch(e){ return null; } },
    write(key,str){ fs.writeFileSync(fileFor(key), str, 'utf8'); },
    remove(key){ const f=fileFor(key); if (fs.existsSync(f)) fs.unlinkSync(f); },
    file: fileFor('kidquest_data'),
  };
}

/* 最小 DOM / 環境 stub（與 smoke.js 一致） */
function el(){
  return new Proxy({ style:{ setProperty(){} },
    classList:{ add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    dataset:{}, value:'', innerHTML:'', textContent:'',
    insertAdjacentHTML(){}, appendChild(){}, remove(){}, querySelectorAll(){ return []; } },
    { get(t,k){ return k in t ? t[k] : undefined; }, set(t,k,v){ t[k]=v; return true; } });
}

function runGame(store){
  const els = {};
  global.document = { getElementById:id=>{ els[id]=els[id]||el(); return els[id]; },
    querySelectorAll:()=>[], createElement:()=>el(), body:el() };
  global.window = { innerWidth:400, innerHeight:800, scrollTo(){}, kqStore: store };
  global.localStorage = { _d:{}, getItem(k){ return this._d[k]??null; }, setItem(k,v){ this._d[k]=v; }, removeItem(k){ delete this._d[k]; } };
  global.confirm = ()=>true; global.prompt = ()=>'5678';
  global.setInterval = ()=>{}; global.setTimeout = f=>{ f(); return 0; }; global.clearTimeout = ()=>{};
  Math.random = (()=>{ let s=42; return ()=>{ s=(s*1103515245+12345)%2147483648; return s/2147483648; }; })();

  const api = {};
  const harness = `
    document.getElementById('ob-name').value='小宇';
    pickClass('mage'); finishOnboarding();
    state.player.coins = 1234;
    save();
    __out.name = state.player.name; __out.coins = state.player.coins; __out.cls = state.player.class;
  `;
  global.__out = api;
  new Function('__out', code + harness)(api);
  return api;
}

let pass = 0, fail = 0;
const assert = (c,m)=>{ if(c){ console.log('PASS:', m); pass++; } else { console.log('FAIL:', m); fail++; } };

/* 1) 在「資料夾 A」建立角色並存檔 → 存檔檔案應寫到該資料夾 */
const dirA = fs.mkdtempSync(path.join(os.tmpdir(), 'kq-A-'));
const storeA = makeFileStore(dirA);
const made = runGame(storeA);
assert(made.name === '小宇' && made.coins === 1234, '在資料夾 A 建立角色並存檔');
assert(fs.existsSync(storeA.file), '存檔寫成資料夾內的檔案 kidquest-save.json');
const savedJson = JSON.parse(fs.readFileSync(storeA.file, 'utf8'));
assert(savedJson.player.coins === 1234, '存檔檔案內容正確（coins=1234）');

/* 2) 模擬「整包搬到別處」：把存檔檔案複製到資料夾 B，從 B 載入 → 進度接續 */
const dirB = fs.mkdtempSync(path.join(os.tmpdir(), 'kq-B-'));
fs.copyFileSync(storeA.file, path.join(dirB, 'kidquest-save.json'));
const storeB = makeFileStore(dirB);

global.window = { innerWidth:400, innerHeight:800, scrollTo(){}, kqStore: storeB };
global.localStorage = { _d:{}, getItem(){ return null; }, setItem(){}, removeItem(){} };
let restored = {};
global.__out = restored;
new Function('__out', code + `
  load();
  __out.name = state.player.name; __out.coins = state.player.coins; __out.cls = state.player.class;
`)(restored);
assert(restored.name === '小宇' && restored.coins === 1234 && restored.cls === 'mage',
  '搬到資料夾 B 後載入：等級/金幣/職業接續（小宇 / 1234 / mage）');

/* 清理 */
try { fs.rmSync(dirA, { recursive:true, force:true }); fs.rmSync(dirB, { recursive:true, force:true }); } catch(e){}

console.log('');
console.log(fail === 0 ? `=== 桌面版存檔驗證通過（${pass} 項）===` : `=== 失敗 ${fail} 項 ===`);
process.exit(fail === 0 ? 0 : 1);
