import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.campus-groovelab.de';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.log('ℹ️ SUPABASE_SERVICE_ROLE_KEY is not available in local environment.');
  console.log('Migration 363 is persisted in supabase/migrations/363_tier1_enterprise_sql_identity_caching_and_indexes.sql for deployment.');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function applyMigration() {
  console.log('🚀 Führe Migration 363 (Tier-1 SQL Identity Caching & Performance Indexes) aus...');
  const migrationPath = path.resolve(__dirname, '../supabase/migrations/363_tier1_enterprise_sql_identity_caching_and_indexes.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  let { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
  if (error) {
    console.warn('⚠️  execute_sql RPC failed, try exec_sql:', error.message);
    const res = await supabase.rpc('exec_sql', { sql_query: sql });
    error = res.error;
    data = res.data;
  }

  if (error) {
    console.warn('ℹ️ Remote execution via RPC nicht verfügbar:', error.message);
    console.log('Migration ist in supabase/migrations/363_tier1_enterprise_sql_identity_caching_and_indexes.sql hinterlegt.');
  } else {
    console.log('✅ Migration 363 wurde erfolgreich in der Supabase-Datenbank angewendet!');
  }
}

applyMigration();
