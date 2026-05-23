import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://msyxlqljswpertszbotf.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const sqlPath = './supabase/migrations/51_kiosk_and_dpa_security.sql';
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  console.log("Executing SQL migration via RPC...");
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.warn("exec_sql failed, trying execute_sql fallback...", error);
    const { data: dataFallback, error: errorFallback } = await supabase.rpc('execute_sql', { sql_query: sql });
    console.log("Result:", { data: dataFallback, error: errorFallback });
    if (errorFallback) {
      process.exit(1);
    }
  } else {
    console.log("Result:", { data, error });
  }
}
run();
