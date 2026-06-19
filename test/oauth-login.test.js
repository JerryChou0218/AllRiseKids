/* M24 / M23 Google OAuth UX checks
 * 執行：node test/oauth-login.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0;
function assert(cond, msg){
  if(cond){ console.log('PASS:', msg); pass++; }
  else { console.log('FAIL:', msg); fail++; }
}
function has(pattern){ return pattern.test(html); }

assert(has(/async function cloudSignInGoogle\(options=\{\}\)/), 'Google sign-in accepts options for account switching');
assert(has(/signInWithOAuth\(\{[\s\S]*provider:'google'[\s\S]*queryParams:\{ prompt:/), 'Google OAuth sends prompt query param');
assert(html.includes("prompt: options.forceAccountSelection ? 'select_account' : 'select_account'"), 'OAuth prompt requests account chooser');
assert(has(/async function cloudSwitchGoogleAccount\(\)[\s\S]*await cloudSignOut\(\)[\s\S]*auth\.signOutParent\(\)[\s\S]*cloudSignInGoogle\(\{ forceAccountSelection:true \}\)/), 'switch account clears Supabase/app session before Google sign-in');
assert(html.includes('改用其他 Google 帳號'), 'login screen exposes switch Google account action');
assert(has(/async function parentLogout\(\)[\s\S]*if\(CLOUD_READY\) await cloudSignOut\(\)/), 'parent logout waits for Supabase signOut');

if(fail){
  console.error(`\nOAuth login checks failed: ${fail}`);
  process.exit(1);
}
console.log(`\n=== Google OAuth 登入體驗驗證通過（${pass} 項）===`);
