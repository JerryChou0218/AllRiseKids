/* KidQuest 桌面版 preload
 * 提供 window.kqStore：把存檔讀寫到「.exe 同層」的 kidquest-save.json。
 * 因此把整個資料夾搬到別台電腦，存檔跟著走、進度不遺失。
 * index.html 的 kqStorage 會優先使用此物件；純瀏覽器下不存在則退回 localStorage。 */
const { contextBridge } = require('electron');
const fs = require('fs');
const path = require('path');

function saveDir(){
  // electron-builder「portable」單檔執行時，真正的 .exe 所在資料夾在此環境變數。
  if (process.env.PORTABLE_EXECUTABLE_DIR) return process.env.PORTABLE_EXECUTABLE_DIR;
  // 已打包（資料夾版）：execPath 是 .exe，存到它的所在資料夾。
  if (process.defaultApp !== true) return path.dirname(process.execPath);
  // 開發模式（npm start）：存到專案資料夾。
  return process.cwd();
}

const DIR = saveDir();
// 主存檔沿用既有檔名；帳號清單另存一檔；其餘 key 以 key 名成檔。
const FILE_NAMES = {
  kidquest_data: 'kidquest-save.json',
  kidquest_accounts: 'kidquest-accounts.json',
};
function fileFor(key){
  const name = FILE_NAMES[key] || (String(key).replace(/[^a-z0-9_\-]/gi, '_') + '.json');
  return path.join(DIR, name);
}

contextBridge.exposeInMainWorld('kqStore', {
  read(key){
    const f = fileFor(key);
    try { return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null; }
    catch (e) { return null; }
  },
  write(key, str){
    try { fs.writeFileSync(fileFor(key), str, 'utf8'); }
    catch (e) { /* 唯讀媒體等情況靜默失敗，避免中斷遊戲 */ }
  },
  remove(key){
    const f = fileFor(key);
    try { if (fs.existsSync(f)) fs.unlinkSync(f); }
    catch (e) {}
  },
  path(key){ return fileFor(key); },
});
