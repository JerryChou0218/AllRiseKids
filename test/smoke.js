/* KidQuest v3 煙霧測試
 * 執行：node test/smoke.js
 * 以最小 DOM stub 在 Node 中載入 index.html 的遊戲腳本，驗證核心流程。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];

/* ── 最小 DOM / 環境 stub ── */
function el(){
  return new Proxy({
    style:{ setProperty(){} },
    classList:{ add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    dataset:{}, value:'', innerHTML:'', textContent:'',
    insertAdjacentHTML(){}, appendChild(){}, remove(){}, querySelectorAll(){ return []; },
  },{
    get(t,k){ if(k in t) return t[k]; return undefined; },
    set(t,k,v){ t[k]=v; return true; },
  });
}
const els = {};
global.document = {
  getElementById: id=>{ els[id] = els[id] || el(); return els[id]; },
  querySelectorAll: ()=>[],
  createElement: ()=>el(),
  body: el(),
};
global.window = { innerWidth:400, innerHeight:800, scrollTo(){} };
global.localStorage = {
  _d:{},
  getItem(k){ return this._d[k]===undefined ? null : this._d[k]; },
  setItem(k,v){ this._d[k]=v; },
  removeItem(k){ delete this._d[k]; },
};
global.confirm = ()=>true;
global.prompt = ()=>'5678';
global.setInterval = ()=>{};
global.setTimeout = f=>{ f(); return 0; };
global.clearTimeout = ()=>{};
Math.random = (()=>{ let s=42; return ()=>{ s=(s*1103515245+12345)%2147483648; return s/2147483648; }; })();

let passed = 0;
const dayStr = offset=>{ const d=new Date(); d.setDate(d.getDate()+offset); return d.toLocaleDateString('sv'); };

/* ── 測試腳本（與遊戲程式同作用域執行）── */
const test = `
const assert = (c,m)=>{ if(!c) throw new Error('FAIL: '+m); console.log('PASS:', m); __pass(); };
const TODAY='${dayStr(0)}', YESTERDAY='${dayStr(-1)}', TWO_AGO='${dayStr(-2)}';

/* 1. 全新開始：今日任務自動生成 */
const todays0 = state.tasks.filter(t=>!CHALLENGE.has(t.difficulty));
assert(todays0.length===8, '今日任務生成 8 個（實際 '+todays0.length+'）');
['easy','normal','medium','hard'].forEach(dk=>
  assert(todays0.filter(t=>t.difficulty===dk).length===2, DIFFS[dk].name+' 2 個（實際 '+todays0.filter(t=>t.difficulty===dk).length+'）'));
assert(state.tasks.filter(t=>CHALLENGE.has(t.difficulty)).length===2, 'A/S 挑戰每週 2 個');
assert(state.taskPool.length===100, '任務池共 100 個（實際 '+state.taskPool.length+'）');
assert(state.taskPool.every(t=>typeof t.why==='string' && Array.isArray(t.ageRange)), '任務池皆有 why 與 ageRange');
assert(['school','family','character','lifeSkill','emotion','health','social','creation'].every(c=>state.taskPool.some(t=>t.category===c)), '8 大新分類皆有任務');

/* 1b. 任務池難度分布（E20/D20/C20/B15/A15/S10）+ 年齡篩選 */
const dist = d=>state.taskPool.filter(t=>t.difficulty===d).length;
assert(dist('easy')===20 && dist('normal')===20 && dist('medium')===20, 'E/D/C 各 20 個');
assert(dist('hard')===15 && dist('epic')===15 && dist('super')===10, 'B/A 各 15、S 10 個');
state.player.age = 5;
assert(state.taskPool.filter(t=>ageMatch(t)).every(t=>t.ageRange[0]<=5 && t.ageRange[1]>=5), '5 歲僅匹配 ageRange 含 5 的任務');
const young5 = state.taskPool.filter(t=>ageMatch(t)).length;
state.player.age = 14;
assert(state.taskPool.filter(t=>ageMatch(t)).length > young5, '14 歲可做的任務比 5 歲多（含跨日大挑戰）');
state.player.age = 10;

/* 2. 建立角色 */
document.getElementById('ob-name').value='小宇';
pickClass('mage');
finishOnboarding();
assert(state.player.name==='小宇' && state.player.class==='mage', '建立角色（魔法師）');

/* 3. PIN 解鎖（預設 1234） */
pinBuffer=''; ['1','2','3','4'].forEach(pinPress);
assert(parentUnlocked, 'PIN 1234 解鎖管理者模式');

/* 4. 任務完成 → 審核 → 發獎勵 */
const first = state.tasks.find(t=>!CHALLENGE.has(t.difficulty) && t.status==='available');
markDone(first.id);
assert(state.tasks.find(t=>t.id===first.id).status==='pending', '任務進入攻略確認中');
const coinsBefore = state.player.coins;
approveTask(first.id);
assert(state.tasks.find(t=>t.id===first.id).status==='completed', '核准後完成');
assert(state.player.coins>coinsBefore, '獲得金幣');
assert(state.history.some(h=>h.kind==='task' && h.name===first.name), '歷史紀錄寫入');
assert(state.achievements.find(a=>a.id==='a1').unlocked, '成就「初次覺醒」解鎖');

/* 5. 完成全部每日任務 → streak=1 + 今日攻略完成獎勵 +20 */
state.tasks.filter(t=>!CHALLENGE.has(t.difficulty) && t.status==='available').forEach(t=>{ markDone(t.id); approveTask(t.id); });
assert(state.player.streak===1, '全部完成 → 連續紀錄 = 1');
assert(state.history.some(h=>h.kind==='bonus' && h.coinsEarned===25), '今日攻略完成獎勵 +25 🪙');
assert(state.history.some(h=>h.kind==='bonus' && h.xpEarned>0), '今日攻略完成額外 EXP（+20%）');

/* 6. 商店：新道具購買與裝備 */
state.player.coins = 5000;
askBuy('n11','virtual');
document.getElementById('buy-confirm').onclick();
assert(state.inventory.some(i=>i.id==='n11'), '購買新道具「雷霆魔劍」');
toggleEquip('n11');
assert(state.inventory.find(i=>i.id==='n11').equipped, '裝備雷霆魔劍');
const pw1 = combatPower();
assert(pw1 >= 700, '裝備史詩武器後戰鬥力含 +700（⚡'+pw1+'）');

/* 6b. 賣回裝備：只返還原價一半 */
const coinsBeforeSell = state.player.coins;
const n11cost = state.shop.find(s=>s.id==='n11').cost;
sellItem('n11');
assert(!state.inventory.some(i=>i.id==='n11'), '賣出後背包移除雷霆魔劍');
assert(state.player.coins===coinsBeforeSell+Math.floor(n11cost/2), '賣出返還原價一半（+'+Math.floor(n11cost/2)+'🪙）');

/* 7. 保護券已移除：商店不應有 consumable / sp1 */
assert(!state.shop.some(s=>s.type==='consumable' || s.id==='sp1'), '商店已無保護券（consumable 已移除）');
assert(state.player.streakTickets===undefined, 'player 不再有 streakTickets 欄位');

/* 8. 真實獎勵兌換 → 申請 → 家長核准 / 退回退款 */
state.player.coins = 5000;
const rCoins = state.player.coins;
askBuy('r15','real');                 // 神秘寶箱：cost 3000、estimatedTwd 600
document.getElementById('buy-confirm').onclick();
assert(state.player.coins===rCoins-3000, '兌換神秘寶箱扣住 3000 金幣（cost = NT$600 × 5）');
const req = state.rewardRequests.find(r=>r.rewardId==='r15' && r.status==='requested');
assert(req && req.estimatedTwd===600, '建立真實獎勵申請（status=requested，NT$600）');
approveReward(req.id);
assert(state.rewardRequests.find(r=>r.id===req.id).status==='approved', '家長核准 → status=approved');
assert(monthlyApprovedTwd()===600, '本月已核准真實獎勵估值 = NT$600');
fulfillReward(req.id);
assert(state.rewardRequests.find(r=>r.id===req.id).status==='fulfilled', '家長標示已兌現 → status=fulfilled');
assert(monthlyApprovedTwd()===600, '已兌現獎勵仍計入本月核准估值 = NT$600');
// 退回會退還金幣
const before = state.player.coins;
askBuy('r1','real');                  // 小型獎勵：cost 150
document.getElementById('buy-confirm').onclick();
const rej = state.rewardRequests.find(r=>r.rewardId==='r1' && r.status==='requested');
assert(state.player.coins===before-150, '再申請一筆 → 扣住 150 金幣');
rejectReward(rej.id);
assert(state.player.coins===before, '家長退回 → 金幣全額退還');
assert(state.rewardRequests.find(r=>r.id===rej.id).status==='rejected', '退回 → status=rejected');

/* 9. 商店篩選 */
setShopFilter('weapon'); renderShop();
assert(state.shop.filter(s=>s.type==='weapon').length===9, '武器篩選：目錄 9 把武器');
setShopFilter('title');
assert(state.shop.filter(s=>s.type==='title').length===9, '稱號篩選：目錄 9 個稱號');
setShopFilter('all');
assert(state.shop.length===58, '商店目錄共 58 項（含擴充裝備）');

/* 10. 能力值 / 技能樹不壞 */
awardXP(1000);
assert(state.player.level>1, '升級成功 Lv.'+state.player.level);
assert(state.player.statPoints===(state.player.level-1)*3, '能力點數 = (Lv-1)*3');
openAlloc(); allocAdj('sen',1); allocAdj('int',1); allocConfirm();
assert(state.player.stats.sen>=1 && state.player.stats.int>=1, '配點成功');
learnSkill('m1');
assert(state.player.skills.includes('m1'), '技能樹：習得 m1');

/* 11. 每日重置：重新抽任務 */
state.meta.lastDay = YESTERDAY;
dailyReset();
const todaysA = state.tasks.filter(t=>!CHALLENGE.has(t.difficulty) && t.pickedDate===TODAY);
assert(todaysA.length===8 && todaysA.every(t=>t.status==='available'), '每日重置後重新抽出 8 個新任務');

/* 12. 重置會保留待審核任務 */
const pend = todaysA[0];
markDone(pend.id);
state.meta.lastDay = YESTERDAY;
dailyReset();
assert(state.tasks.some(t=>t.id===pend.id && t.status==='pending'), '重置後待審核任務保留');
const todays2 = state.tasks.filter(t=>!CHALLENGE.has(t.difficulty) && t.pickedDate===TODAY);
assert(todays2.length===8, '重置後補抽至 8 個今日任務（實際 '+todays2.length+'）');
assert(todays2.filter(t=>t.status==='available').length===7, '其中 7 個為新抽可挑戰任務');

/* 12b. 重新抽選今日任務（家長按鈕） */
const beforeIds = state.tasks.filter(t=>!CHALLENGE.has(t.difficulty) && t.status==='available').map(t=>t.id).sort().join(',');
rerollDaily();
const afterToday = state.tasks.filter(t=>!CHALLENGE.has(t.difficulty) && t.pickedDate===TODAY);
assert(afterToday.length===8, '重抽後今日任務維持 8 個');
assert(state.tasks.some(t=>t.id===pend.id && t.status==='pending'), '重抽不影響待審核任務');
const afterIds = state.tasks.filter(t=>!CHALLENGE.has(t.difficulty) && t.status==='available').map(t=>t.id).sort().join(',');
assert(beforeIds!==afterIds, '重抽後任務組合有變化');

/* 13. 連續紀錄中斷即歸零（保護券已移除，無恢復機制） */
state.player.streak = 4;
state.player.lastAllDoneDate = TWO_AGO;
state.meta.lastDay = YESTERDAY;
dailyReset();
assert(state.player.streak===0, '漏掉一天 → 連續紀錄歸零');
assert(typeof useProtection === 'undefined', '保護券恢復函式已移除');
assert(state.brokenStreak===undefined, '不再寫入 brokenStreak');

/* 14. 每日任務數量設定 */
setDailyCount('10');
assert(state.parentConfig.dailyCount===10, '每日任務數量設為 10');
rerollDaily();
assert(state.tasks.filter(t=>!CHALLENGE.has(t.difficulty) && t.pickedDate===TODAY).length===10, '重抽後為 10 個');
setDailyCount('8');

/* 15. 任務池管理 */
poolToggle('qe1');
assert(state.taskPool.find(t=>t.id==='qe1').enabled===false, '任務池停用 qe1');
poolToggle('qe1');
poolSet('qc6','schedule','weekend');
assert(state.taskPool.find(t=>t.id==='qc6').schedule==='weekend', '任務排程改為週末限定');
poolSet('qc6','schedule','daily');
document.getElementById('tf-name').value='餵狗';
document.getElementById('tf-emoji').value='🐶';
document.getElementById('tf-time').value='5分鐘';
document.getElementById('tf-why').value='毛小孩也是公會成員。';
document.getElementById('tf-cat').value='chore';
document.getElementById('tf-diff').value='easy';
document.getElementById('tf-schedule').value='daily';
document.getElementById('tf-age').value='all';
editingTaskId=null;
saveTaskForm();
assert(state.taskPool.some(t=>t.name==='餵狗' && t.custom), '家長新增自訂任務到任務池');

/* 16. PIN 重設 */
resetPin();
assert(state.parentConfig.pin==='5678', 'PIN 重設為 5678');

/* 17. v2 存檔遷移 → v3 */
localStorage.setItem('kidquest_data', JSON.stringify({
  version: 2,
  player: { name:'老玩家', class:'guardian', level:9, xp:40, coins:333,
    stats:{str:5,agi:2,int:7,vit:3,sen:4}, statPoints:6, skillPoints:3, skills:['g1'],
    streak:3, lastAllDoneDate:YESTERDAY },
  tasks: [
    { id:'t7', name:'完成所有作業', emoji:'✏️', category:'homework', difficulty:'medium', status:'pending', completedDate:TODAY, doneHour:16, custom:false },
    { id:'xcustom1', name:'背唐詩', emoji:'📜', category:'homework', difficulty:'medium', status:'available', completedDate:null, doneHour:null, custom:true },
  ],
  inventory: [ { id:'s7', name:'鐵製短刀', emoji:'🗡️', type:'weapon', rarity:'common', equipped:true } ],
  achievements: [ { id:'a1', unlocked:true }, { id:'a15', unlocked:true } ],
  parentConfig: { pin:'9999', customRewards:[ {id:'r1',name:'螢幕時間 +30 分鐘',emoji:'📺',cost:80}, {id:'xr1',name:'去動物園',emoji:'🦁',cost:600} ] },
  history: [ { date:YESTERDAY, kind:'task', name:'洗澡', xpEarned:25, coinsEarned:15 } ],
  counters: { total:12, readCount:3, coinsEarned:600, purchases:1, bestStreak:3 },
}));
load(); dailyReset(); ensureToday();
assert(state.version===4, 'v2 → v4 遷移：版本升級');
assert(state.player.name==='老玩家' && state.player.level===9 && state.player.coins===333, '等級 / 金幣保留');
assert(state.player.statPoints===6 && state.player.skillPoints===3 && state.player.skills.includes('g1'), '能力點 / 技能點 / 已學技能保留');
assert(state.parentConfig.pin==='9999', '家長 PIN 保留');
assert(state.parentConfig.customRewards.length===26, '真實獎勵 = 25 預設 + 1 自訂（實際 '+state.parentConfig.customRewards.length+'）');
assert(state.parentConfig.customRewards.some(r=>r.name==='去動物園'), '自訂真實獎勵保留');
assert(state.taskPool.some(t=>t.id==='xcustom1' && t.custom), '自訂任務移入任務池');
assert(state.tasks.some(t=>t.id==='t7' && t.status==='pending'), '待審核任務保留為實例');
assert(state.inventory.some(i=>i.id==='s7' && i.equipped), '裝備保留');
assert(state.achievements.find(a=>a.id==='a1').unlocked && state.achievements.find(a=>a.id==='a15').unlocked, '成就保留');
assert(state.history.length>=1, '歷史紀錄保留');
assert(state.tasks.filter(t=>!CHALLENGE.has(t.difficulty) && t.pickedDate===TODAY).length>=8, '遷移後自動抽出今日任務');
approveTask('t7');
assert(state.tasks.find(t=>t.id==='t7').status==='completed', '遷移後的待審核任務可正常核准');

/* 18. v1 存檔遷移鏈 → v3 */
localStorage.setItem('kidquest_data', JSON.stringify({
  player: { name:'元祖玩家', class:'scholar', level:5, xp:20, coins:100,
    stats:{wisdom:6,strength:2,vitality:1,harmony:3}, streak:1 },
  tasks: [], inventory: [], achievements: [], history: [],
  parentConfig: { pin:'1234', customRewards: [] },
}));
load(); dailyReset(); ensureToday();
assert(state.version===4, 'v1 → v2 → v4 遷移鏈');
assert(state.player.class==='mage' && state.player.stats.int===6, 'v1 職業 / 能力值對應（scholar→mage, wisdom→int）');
assert(state.player.statPoints===12 && state.player.skillPoints===4, 'v1 遷移補發點數（Lv5）');

/* 19. 存讀檔一致 */
save();
const snapCoins = state.player.coins;
load();
assert(state.player.coins===snapCoins && state.player.name==='元祖玩家', '存讀檔一致');

console.log('');
console.log('=== 全部通過（' + __count() + ' 項）===');
`;

let count = 0;
global.__pass = ()=>{ count++; };
global.__count = ()=>count;

try{
  new Function(code + test)();
}catch(e){
  console.error('RUNTIME ERROR:', e.message);
  process.exit(1);
}
