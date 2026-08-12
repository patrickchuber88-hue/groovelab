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
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is missing.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function applyMigration() {
  console.log('🚀 Führe Migration 259 (Privilege Escalation Prevention) aus...');
  const migrationPath = path.resolve(__dirname, '../supabase/migrations/259_prevent_privilege_escalation.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  // Versuche RPC execute_sql oder exec_sql
  let { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
  if (error) {
    console.warn('⚠️  execute_sql RPC failed, try exec_sql:', error.message);
    const res = await supabase.rpc('exec_sql', { sql_query: sql });
    error = res.error;
    data = res.data;
  }

  if (error) {
    console.error('❌ Migration 259 konnte nicht via RPC ausgeführt werden:', error.message);
    console.log('\n📋 Bitte führe den Inhalt von 259_prevent_privilege_escalation.sql manuell im Supabase SQL-Editor aus.');
  } else {
    console.log('✅ Migration 259 wurde erfolgreich in der Supabase-Datenbank angewendet!');
  }
}

applyMigration();
