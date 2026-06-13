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

const SAVE_FILE = path.join(saveDir(), 'kidquest-save.json');

contextBridge.exposeInMainWorld('kqStore', {
  read(){
    try { return fs.existsSync(SAVE_FILE) ? fs.readFileSync(SAVE_FILE, 'utf8') : null; }
    catch (e) { return null; }
  },
  write(str){
    try { fs.writeFileSync(SAVE_FILE, str, 'utf8'); }
    catch (e) { /* 唯讀媒體等情況靜默失敗，避免中斷遊戲 */ }
  },
  remove(){
    try { if (fs.existsSync(SAVE_FILE)) fs.unlinkSync(SAVE_FILE); }
    catch (e) {}
  },
  path(){ return SAVE_FILE; },
});
