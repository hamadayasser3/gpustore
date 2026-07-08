// ============================================================================
// GPU Trades - Supabase connection
// ============================================================================
// NOTE: Credentials should be injected at build/deployment time via environment variables
// For development: Create .env.local in project root with:
// VITE_SUPABASE_URL=...
// VITE_SUPABASE_ANON_KEY=...
// ============================================================================

// Initialize Theme ASAP to prevent white flash
(function() {
  const theme = localStorage.getItem('gpu_theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
})();

const SUPABASE_URL = window.__SUPABASE_URL__ || 'https://cnooizthoiueogxnncgf.supabase.co';
const SUPABASE_ANON_KEY = window.__SUPABASE_ANON_KEY__ || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNub29penRob2l1ZW9neG5uY2dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNTY3ODcsImV4cCI6MjA5ODgzMjc4N30.DKVt3iko_cl9Lv84ixuisll61K_nVljF-j8snqMbx6g';

if (!window.__SUPABASE_URL__ || !window.__SUPABASE_ANON_KEY__) {
  console.warn('⚠️ Supabase credentials not found. Set environment variables for production.');
}

// `supabase` (the UMD global from the CDN script) creates the client here,
// then we expose it as `window.sb` for the rest of the app to use.
window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});
