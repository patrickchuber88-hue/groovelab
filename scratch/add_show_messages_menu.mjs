import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  console.log("Adding column show_messages_menu to users table...");

  const sql = `
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS show_messages_menu BOOLEAN DEFAULT true;
  `;

  console.log("Trying 'execute_sql' RPC...");
  try {
    const { error } = await supabase.rpc('execute_sql', { sql_query: sql });
    if (error) {
      console.log("execute_sql failed:", error.message);
    } else {
      console.log("✅ Column show_messages_menu successfully added via execute_sql RPC!");
      return;
    }
  } catch (err) {
    console.log("execute_sql threw:", err.message);
  }

  console.log("Trying 'exec_sql' RPC...");
  try {
    const { error } = await supabase.rpc('exec_sql', { query: sql });
    if (error) {
      console.log("exec_sql failed:", error.message);
    } else {
      console.log("✅ Column show_messages_menu successfully added via exec_sql RPC!");
      return;
    }
  } catch (err) {
    console.log("exec_sql threw:", err.message);
  }
}

run();
