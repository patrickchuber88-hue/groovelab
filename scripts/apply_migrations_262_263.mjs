import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.campus-groovelab.de';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!serviceKey) {
  console.error('❌ Service role key or anon key is missing.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function runSQL(sql) {
  let { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
  if (error) {
    const res = await supabase.rpc('exec_sql', { sql_query: sql });
    error = res.error;
    data = res.data;
  }
  return { data, error };
}

async function applyMigrations() {
  console.log('🚀 Executing Migrations 262 and 263...');
  
  const m262 = `
    ALTER TABLE public.master_billing_settings 
      ADD COLUMN IF NOT EXISTS price_module_kombi NUMERIC(10, 2) DEFAULT 9.99,
      ADD COLUMN IF NOT EXISTS free_months_per_year INTEGER DEFAULT 0;
  `;

  const m263 = `
    ALTER TABLE public.schools 
      ADD COLUMN IF NOT EXISTS custom_price_campus NUMERIC(10, 2) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS custom_price_groovelab NUMERIC(10, 2) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS custom_price_kombi NUMERIC(10, 2) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS custom_price_teacher NUMERIC(10, 2) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS custom_price_student NUMERIC(10, 2) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS grandfathered_campus_price NUMERIC(10, 2) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS grandfathered_groovelab_price NUMERIC(10, 2) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS grandfathered_kombi_price NUMERIC(10, 2) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS grandfathered_teacher_price NUMERIC(10, 2) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS grandfathered_student_price NUMERIC(10, 2) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS price_grandfathered_at TIMESTAMPTZ DEFAULT NULL;

    ALTER TABLE public.master_billing_settings 
      ADD COLUMN IF NOT EXISTS price_change_scope TEXT DEFAULT 'new_only',
      ADD COLUMN IF NOT EXISTS price_change_announced_at TIMESTAMPTZ DEFAULT NULL;
  `;

  console.log('Applying 262...');
  let res1 = await runSQL(m262);
  console.log('262 result:', res1);

  console.log('Applying 263...');
  let res2 = await runSQL(m263);
  console.log('263 result:', res2);
}

applyMigrations();
