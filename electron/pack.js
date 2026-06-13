/* 打包 KidQuest 桌面版（@electron/packager）
 * 用 ignore 函式精確控制：只把遊戲執行所需的檔案放進 App，
 * 排除框架檔（milestone-state.json、milestones/、docs/…）與開發用 node_modules。
 * 產出：dist/KidQuest-win32-x64/，內含 KidQuest.exe。 */
const { packager } = require('@electron/packager');
const path = require('path');

// App 內只保留這些頂層項目（其餘一律排除）
const ALLOW_TOP = new Set([
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'icon.svg',
  'package.json',
  'electron',
]);

packager({
  dir: path.join(__dirname, '..'),
  name: 'KidQuest',
  platform: 'win32',
  arch: 'x64',
  out: path.join(__dirname, '..', 'dist'),
  overwrite: true,
  prune: true,
  ignore: (p) => {
    if (!p) return false;                 // 根目錄
    const rel = p.replace(/^[\\/]/, '');   // 去掉開頭斜線
    if (!rel) return false;
    const top = rel.split(/[\\/]/)[0];     // 取頂層名稱
    return !ALLOW_TOP.has(top);            // 不在白名單就排除
  },
}).then((paths) => {
  console.log('✅ Packaged to:', paths.join(', '));
}).catch((err) => {
  console.error('❌ Pack failed:', err);
  process.exit(1);
});
