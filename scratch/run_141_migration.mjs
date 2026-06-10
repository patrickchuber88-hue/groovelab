// Run migration 141 against remote Supabase instance
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://supabase.campus-groovelab.de';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const sql = readFileSync(join(__dirname, '..', 'supabase/migrations/141_device_pairing.sql'), 'utf-8');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Split SQL into individual statements
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`Running ${statements.length} SQL statements...`);

for (const stmt of statements) {
  const fullStmt = stmt + ';';
  console.log('\n--- Executing:', fullStmt.substring(0, 60) + '...');
  const { error } = await supabase.rpc('exec_sql', { sql: fullStmt }).catch(() => ({ error: { message: 'RPC not available' } }));
  if (error) {
    // Try direct query approach
    console.log('RPC failed, migration must be run manually in Supabase dashboard');
    console.log('Error:', error.message);
    break;
  }
  console.log('✅ OK');
}
