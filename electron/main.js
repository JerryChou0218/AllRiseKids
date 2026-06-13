/* KidQuest 桌面版主程序（Electron）
 * 開一個視窗載入 index.html；存檔由 preload.js 寫到 .exe 同層的檔案。 */
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow(){
  const win = new BrowserWindow({
    width: 480,
    height: 860,
    minWidth: 360,
    minHeight: 620,
    backgroundColor: '#060b18',
    title: 'KidQuest：覺醒 獵人任務系統',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.removeMenu();
  win.loadFile(path.join(__dirname, '..', 'index.html'));

  // 外部連結用系統瀏覽器開，不在 App 內導覽。
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
