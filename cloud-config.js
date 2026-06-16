/* M23 雲端設定（前端公開安全值）。
 * supabasePublishableKey 與 googleClientId 設計上即可公開（受 RLS / redirect 白名單保護）；
 * 切勿放 service_role key 或 Google Client Secret。
 * supabaseUrl 補上後（https://<ref>.supabase.co），CLOUD_READY 變 true，App 才會啟用雲端；
 * 在此之前自動以純本機運作（與現在完全相同）。 */
window.KQ_CLOUD = {
  supabaseUrl: "",   // ← 待填：Supabase → Project Settings → API → Project URL
  supabasePublishableKey: "sb_publishable_ZrA5VWwZphbPX-Kx2oyrrw_LyLcCaF-",
  googleClientId: "541985626153-q4ifuv6igklms3ldgsm9k3kpncr9q0nn.apps.googleusercontent.com"
};
