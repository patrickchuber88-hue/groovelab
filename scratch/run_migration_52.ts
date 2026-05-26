import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: 'apps/groovelab/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://supabase.178.105.10.2.sslip.io';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const migrationPath = path.join(__dirname, '../supabase/migrations/52_rbac_pyramid_onboarding.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  console.log(`Running migration from ${migrationPath}...`);
  
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.warn("exec_sql failed, trying execute_sql fallback...", error);
    const { data: dataFallback, error: errorFallback } = await supabase.rpc('execute_sql', { sql_query: sql });
    console.log("Result:", { data: dataFallback, error: errorFallback });
  } else {
    console.log("Result:", { data, error });
  }
}

run();
