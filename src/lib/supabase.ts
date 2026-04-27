import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase Variablen fehlen. Bitte .env.local Datei anlegen.');
}

export const supabase = createClient(
  supabaseUrl || 'http://placeholder.url',
  supabaseAnonKey || 'placeholder-key'
);
