import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local from apps/groovelab
dotenv.config({ path: path.join(__dirname, '../apps/groovelab/.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://supabase.178.105.10.2.sslip.io';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const sql = `
    -- Add is_premium_user to users table
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_premium_user BOOLEAN DEFAULT FALSE;

    -- Add user_quota, pending_user_quota, quota_updated_at to schools table
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS user_quota INTEGER DEFAULT 150;
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS pending_user_quota INTEGER DEFAULT NULL;
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS quota_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

    -- Force schema reload
    NOTIFY pgrst, 'reload schema';
  `;

  console.log("Executing SQL migration for billing...");
  
  // Try exec_sql
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.warn("exec_sql failed, trying execute_sql fallback...", error);
    const { data: dataFallback, error: errorFallback } = await supabase.rpc('execute_sql', { sql_query: sql });
    console.log("Fallback Result:", { data: dataFallback, error: errorFallback });
  } else {
    console.log("Result:", { data, error });
  }
}

run();
