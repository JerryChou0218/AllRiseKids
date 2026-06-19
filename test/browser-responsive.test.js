/* M24 browser responsive checks
 * 執行：node test/browser-responsive.test.js
 * 使用本機獨立 Chrome headless + Chrome DevTools Protocol，不依賴 Playwright/Puppeteer。
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const net = require('net');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

let pass = 0, fail = 0;
function assert(cond, msg){
  if(cond){ console.log('PASS:', msg); pass++; }
  else { console.log('FAIL:', msg); fail++; }
}
function chromePath(){
  return CHROME_CANDIDATES.find(p=>fs.existsSync(p));
}
function freePort(){
  return new Promise((resolve, reject)=>{
    const server = net.createServer();
    server.listen(0, '127.0.0.1', ()=>{
      const port = server.address().port;
      server.close(()=>resolve(port));
    });
    server.on('error', reject);
  });
}
function getJson(url){
  return new Promise((resolve, reject)=>{
    http.get(url, res=>{
      let body='';
      res.setEncoding('utf8');
      res.on('data', d=>body+=d);
      res.on('end', ()=>{
        try{ resolve(JSON.parse(body)); }catch(e){ reject(e); }
      });
    }).on('error', reject);
  });
}
function contentType(file){
  if(file.endsWith('.html')) return 'text/html; charset=utf-8';
  if(file.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if(file.endsWith('.css')) return 'text/css; charset=utf-8';
  if(file.endsWith('.webmanifest')) return 'application/manifest+json; charset=utf-8';
  if(file.endsWith('.svg')) return 'image/svg+xml';
  if(file.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}
function startStaticServer(port){
  const server = http.createServer((req, res)=>{
    const reqUrl = new URL(req.url, `http://127.0.0.1:${port}`);
    let rel = decodeURIComponent(reqUrl.pathname);
    if(rel === '/') rel = '/index.html';
    const file = path.normalize(path.join(ROOT, rel));
    if(!file.startsWith(ROOT)){
      res.writeHead(403); res.end('Forbidden'); return;
    }
    fs.readFile(file, (err, data)=>{
      if(err){ res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'content-type': contentType(file), 'cache-control':'no-store' });
      res.end(data);
    });
  });
  return new Promise((resolve, reject)=>{
    server.listen(port, '127.0.0.1', ()=>resolve(server));
    server.on('error', reject);
  });
}
async function waitForJson(url, timeoutMs){
  const start = Date.now();
  let lastErr;
  while(Date.now()-start < timeoutMs){
    try{ return await getJson(url); }catch(e){ lastErr=e; await new Promise(r=>setTimeout(r, 120)); }
  }
  throw lastErr || new Error('timeout waiting for Chrome');
}
function cdpConnect(wsUrl){
  return new Promise((resolve, reject)=>{
    const ws = new WebSocket(wsUrl);
    let seq = 0;
    const pending = new Map();
    const events = [];
    ws.onopen = ()=>resolve({
      events,
      send(method, params={}){
        const id = ++seq;
        ws.send(JSON.stringify({ id, method, params }));
        return new Promise((res, rej)=>pending.set(id, { res, rej, method }));
      },
      close(){ ws.close(); }
    });
    ws.onerror = err=>reject(err);
    ws.onmessage = evt=>{
      const msg = JSON.parse(evt.data);
      if(msg.id && pending.has(msg.id)){
        const p = pending.get(msg.id); pending.delete(msg.id);
        if(msg.error) p.rej(new Error(`${p.method}: ${msg.error.message}`));
        else p.res(msg.result || {});
      }else if(msg.method){
        events.push(msg);
      }
    };
  });
}
async function evalOnPage(client, expression){
  const r = await client.send('Runtime.evaluate', { expression, awaitPromise:true, returnByValue:true });
  if(r.exceptionDetails) throw new Error(r.exceptionDetails.text || 'Runtime exception');
  return r.result.value;
}
async function setViewport(client, width, height){
  await client.send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: width < 768
  });
}
async function loadApp(client, appUrl, width, height){
  await setViewport(client, width, height);
  const eventStart = client.events.length;
  await client.send('Page.navigate', { url: appUrl });
  await new Promise(resolve=>{
    const start = Date.now();
    const timer = setInterval(()=>{
      if(client.events.slice(eventStart).some(e=>e.method==='Page.loadEventFired') || Date.now()-start>6000){
        clearInterval(timer); resolve();
      }
    }, 80);
  });
  await evalOnPage(client, `(() => {
    localStorage.clear();
    document.getElementById('ob-name').value='測試小勇';
    document.getElementById('ob-age').value='10';
    document.getElementById('ob-gender').value='all';
    pickClass('mage');
    finishOnboarding();
    return true;
  })()`);
}
async function main(){
  const exe = chromePath();
  assert(!!exe, '找到可用的 Chrome/Edge 執行檔');
  if(!exe) process.exit(1);
  if(typeof WebSocket === 'undefined'){
    console.error('FAIL: 目前 Node 版本沒有 WebSocket global，無法執行 CDP 測試');
    process.exit(1);
  }
  const debugPort = await freePort();
  const appPort = await freePort();
  const appServer = await startStaticServer(appPort);
  const appUrl = `http://127.0.0.1:${appPort}/index.html`;
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ark-chrome-'));
  const chrome = spawn(exe, [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    'about:blank',
  ], { stdio:'ignore' });
  try{
    const tabs = await waitForJson(`http://127.0.0.1:${debugPort}/json/list`, 10000);
    const page = tabs.find(t=>t.type==='page') || tabs[0];
    const client = await cdpConnect(page.webSocketDebuggerUrl);
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Log.enable');

    await loadApp(client, appUrl, 390, 844);
    const mobile = await evalOnPage(client, `(() => {
      const root = document.documentElement;
      const navBtns = [...document.querySelectorAll('.nav-btn')].map(b=>b.getBoundingClientRect());
      const nav = document.querySelector('.app-nav').getBoundingClientRect();
      return {
        width: innerWidth,
        activeHome: document.querySelector('#screen-home').classList.contains('active'),
        navCount: navBtns.length,
        minNavHeight: Math.min(...navBtns.map(r=>r.height)),
        minNavWidth: Math.min(...navBtns.map(r=>r.width)),
        navAtBottom: nav.bottom <= innerHeight + 1 && nav.top > innerHeight - 120,
        overflowX: root.scrollWidth - root.clientWidth,
        hasNextTask: !!document.querySelector('#home-next-task'),
        bodyText: document.body.innerText
      };
    })()`);
    assert(mobile.width === 390, '手機 viewport 寬度 390px');
    assert(mobile.activeHome, '手機載入後進入孩子首頁');
    assert(mobile.navCount === 5, '手機底部導航 5 個');
    assert(mobile.minNavHeight >= 44, '手機導航按鈕高度至少 44px');
    assert(mobile.minNavWidth >= 44, '手機導航按鈕寬度至少 44px');
    assert(mobile.navAtBottom, '手機導航固定在底部');
    assert(mobile.overflowX <= 1, `手機沒有橫向捲動（overflow ${mobile.overflowX}px）`);
    assert(mobile.bodyText.includes('下一個推薦任務'), '手機首頁顯示下一個推薦任務');

    const missionDialog = await evalOnPage(client, `(() => {
      goScreen('quests');
      const card = document.querySelector('#task-list [role="button"]');
      if(!card) return { hasCard:false };
      card.focus();
      card.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true }));
      const dialog = document.getElementById('gate-modal');
      return {
        hasCard:true,
        focusedCard: document.activeElement === card,
        dialogOpen: dialog.classList.contains('show'),
        ariaVisible: dialog.getAttribute('aria-hidden') === 'false',
        labelled: !!dialog.getAttribute('aria-labelledby'),
      };
    })()`);
    assert(missionDialog.hasCard, '手機任務頁有可聚焦的任務卡');
    assert(missionDialog.focusedCard, '任務卡可取得鍵盤焦點');
    assert(missionDialog.dialogOpen && missionDialog.ariaVisible && missionDialog.labelled, 'Enter 可開啟任務詳情 dialog 且 aria 狀態正確');

    const escClose = await evalOnPage(client, `(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
      const dialog = document.getElementById('gate-modal');
      return {
        dialogClosed: !dialog.classList.contains('show'),
        ariaHidden: dialog.getAttribute('aria-hidden') === 'true',
      };
    })()`);
    assert(escClose.dialogClosed && escClose.ariaHidden, 'Escape 可關閉任務詳情 dialog');

    await evalOnPage(client, `(() => { tryParent(); ['1','2','3','4'].forEach(pinPress); return true; })()`);
    await new Promise(r=>setTimeout(r, 250));
    const parent = await evalOnPage(client, `(() => {
      const root = document.documentElement;
      setParentTab('settings');
      const activeTabs = [...document.querySelectorAll('[data-ptab].active')].map(b=>b.dataset.ptab);
      return {
        parentActive: document.querySelector('#screen-parent').classList.contains('active'),
        activeTabs,
        overflowX: root.scrollWidth - root.clientWidth,
        hasAdvanced: !!document.querySelector('.advanced-box'),
        advancedClosed: !document.querySelector('.advanced-box').open,
        hasReset: !!document.querySelector('[onclick="resetCurrentChildData()"]')
      };
    })()`);
    assert(parent.parentActive, 'PIN 後進入家長模式');
    assert(parent.activeTabs.includes('settings'), '家長設定分頁可切換');
    assert(parent.overflowX <= 1, `家長手機版沒有全頁橫向捲動（overflow ${parent.overflowX}px）`);
    assert(parent.hasAdvanced && parent.advancedClosed, '除錯與高風險操作預設收在進階設定');
    assert(parent.hasReset, '家長設定提供受保護的重置孩子進度入口');

    await loadApp(client, appUrl, 1280, 900);
    const desktop = await evalOnPage(client, `(() => {
      const root = document.documentElement;
      const nav = document.querySelector('.app-nav').getBoundingClientRect();
      const homeGrid = getComputedStyle(document.querySelector('#screen-home > div')).gridTemplateColumns;
      return {
        width: innerWidth,
        overflowX: root.scrollWidth - root.clientWidth,
        navLeft: nav.left,
        navWidth: nav.width,
        navTall: nav.height > 600,
        homeGrid,
        navCount: document.querySelectorAll('.nav-btn').length
      };
    })()`);
    assert(desktop.width === 1280, '桌機 viewport 寬度 1280px');
    assert(desktop.navCount === 5, '桌機左側導航仍為 5 個');
    assert(desktop.navLeft === 0 && desktop.navWidth >= 200 && desktop.navTall, '桌機使用左側 App Shell');
    assert(desktop.homeGrid.split(' ').length >= 2, '桌機首頁使用雙欄布局');
    assert(desktop.overflowX <= 1, `桌機沒有橫向捲動（overflow ${desktop.overflowX}px）`);

    const problems = client.events.filter(e=>
      e.method === 'Runtime.exceptionThrown' ||
      (e.method === 'Log.entryAdded' && e.params.entry.level === 'error')
    );
    if(problems.length){
      console.error('Browser problems:', JSON.stringify(problems.slice(0, 5), null, 2));
    }
    assert(problems.length === 0, '瀏覽器 console/runtime 沒有 error');
    client.close();
  } finally {
    if(!chrome.killed) chrome.kill();
    await new Promise(resolve=>chrome.once('exit', resolve));
    await new Promise(resolve=>appServer.close(resolve));
    try{ fs.rmSync(userDataDir, { recursive:true, force:true }); }catch(_e){}
  }
  if(fail){
    console.error(`\nBrowser responsive checks failed: ${fail}`);
    process.exit(1);
  }
  console.log(`\n=== 瀏覽器響應式驗證通過（${pass} 項）===`);
}

main().catch(err=>{
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
