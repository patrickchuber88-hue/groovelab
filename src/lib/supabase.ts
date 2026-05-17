import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://msyxlqljswpertszbotf.supabase.co';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';

console.log('[Supabase] Initializing with URL:', supabaseUrl ? `${supabaseUrl.substring(0, 15)}...` : 'MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Environment variables missing. Using stable fallback credentials.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

