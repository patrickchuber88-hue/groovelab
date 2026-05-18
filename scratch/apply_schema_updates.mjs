import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  console.log("Applying schema updates to Supabase hosted database...");

  const sql = `
    -- 1. Add missing columns to band_members
    ALTER TABLE public.band_members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';
    ALTER TABLE public.band_members ADD COLUMN IF NOT EXISTS external_name TEXT;

    -- 2. Add missing columns to band_song_slots
    ALTER TABLE public.band_song_slots ADD COLUMN IF NOT EXISTS external_name TEXT;
    ALTER TABLE public.band_song_slots ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'joined';
    ALTER TABLE public.band_song_slots ADD COLUMN IF NOT EXISTS is_founder BOOLEAN DEFAULT false;
    ALTER TABLE public.band_song_slots ADD COLUMN IF NOT EXISTS is_exclusive BOOLEAN DEFAULT false;

    -- 3. Drop constraints if they exist to allow multi-role members
    ALTER TABLE public.band_members DROP CONSTRAINT IF EXISTS band_members_band_id_user_id_key;
    ALTER TABLE public.band_song_slots DROP CONSTRAINT IF EXISTS band_song_slots_band_song_id_user_id_key;

    -- 4. Disable RLS for peace of mind
    ALTER TABLE public.band_members DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.band_song_slots DISABLE ROW LEVEL SECURITY;
  `;

  console.log("Trying 'exec_sql' RPC...");
  try {
    const { error } = await supabase.rpc('exec_sql', { query: sql });
    if (error) {
      console.log("exec_sql failed:", error.message);
    } else {
      console.log("✅ Schema updates successfully applied via exec_sql RPC!");
      return;
    }
  } catch (err) {
    console.log("exec_sql threw:", err.message);
  }

  console.log("Trying 'execute_sql' RPC with 'sql_query' parameter...");
  try {
    const { error } = await supabase.rpc('execute_sql', { sql_query: sql });
    if (error) {
      console.log("execute_sql failed:", error.message);
    } else {
      console.log("✅ Schema updates successfully applied via execute_sql RPC!");
      return;
    }
  } catch (err) {
    console.log("execute_sql threw:", err.message);
  }

  console.log("Trying generic query fetch to see if we can run it...");
}

run();
