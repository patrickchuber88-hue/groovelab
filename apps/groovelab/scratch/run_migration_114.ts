import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env variables
dotenv.config({ path: 'apps/groovelab/.env.local' });
dotenv.config({ path: 'apps/groovelab/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in env files.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sqlPath = path.resolve('supabase/migrations/114_missions_and_level_gamification.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  console.log("Reading migration SQL from:", sqlPath);
  console.log("Sending SQL script to Supabase RPC...");

  // Try exec_sql
  let { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.warn("exec_sql RPC failed, trying execute_sql fallback...", error);
    const fallbackRes = await supabase.rpc('execute_sql', { sql_query: sql });
    data = fallbackRes.data;
    error = fallbackRes.error;
  }

  if (error) {
    console.error("Migration execution failed:", error);
    process.exit(1);
  } else {
    console.log("Migration executed successfully:", data);
    
    // Notify schema cache reload
    console.log("Triggering schema cache reload...");
    await supabase.rpc('exec_sql', { query: "NOTIFY pgrst, 'reload schema';" });
    console.log("Schema cache reloaded successfully!");
  }
}

run();
