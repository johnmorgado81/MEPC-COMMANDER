import { PUBLIC_CONFIG } from '../config/public-config.js';

let _client = null;

export function getSupabaseClient() {
  if (_client) return _client;

  if (!window.supabase?.createClient) {
    throw new Error('Supabase client library not loaded.');
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY, AUTH } = PUBLIC_CONFIG;
  if (!SUPABASE_URL || SUPABASE_URL.includes('REPLACE_WITH_')) {
    throw new Error('PUBLIC_CONFIG.SUPABASE_URL is not configured.');
  }
  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('REPLACE_WITH_')) {
    throw new Error('PUBLIC_CONFIG.SUPABASE_ANON_KEY is not configured.');
  }

  _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: AUTH.persistSession,
      autoRefreshToken: AUTH.autoRefreshToken,
      detectSessionInUrl: AUTH.detectSessionInUrl,
    },
  });

  return _client;
}
