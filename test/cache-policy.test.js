/* PWA cache policy checks
 * 執行：node test/cache-policy.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
let pass = 0, fail = 0;
function assert(cond, msg){
  if(cond){ console.log('PASS:', msg); pass++; }
  else { console.log('FAIL:', msg); fail++; }
}

assert(sw.includes("const CACHE_VERSION = 'kidquest-v4'"), 'service worker cache version was bumped');
assert(sw.includes("url.pathname.endsWith('/index.html')"), 'index.html is treated as app shell');
assert(sw.includes("url.pathname.endsWith('/cloud-config.js')"), 'cloud-config.js is treated as app shell');
assert(sw.includes("fetch(req, { cache: 'no-store' })"), 'app shell fetch bypasses HTTP cache');
assert(sw.includes('caches.keys()') && sw.includes('caches.delete(k)'), 'activate removes old cache versions');

if(fail){
  console.error(`\nCache policy checks failed: ${fail}`);
  process.exit(1);
}
console.log(`\n=== PWA 快取策略驗證通過（${pass} 項）===`);
