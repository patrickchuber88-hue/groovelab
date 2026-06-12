import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const extractEnv = (key) => {
  const match = envFile.match(new RegExp(`${key}=(.*)`));
  return match ? match[1].trim() : null;
};

const supabaseUrl = extractEnv('VITE_SUPABASE_URL');
const supabaseKey = extractEnv('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL or Anon Key not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  const sqlPath = path.join('supabase', 'migrations', '150_add_room_properties.sql');
  console.log(`Reading migration from ${sqlPath}...`);
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  
  console.log('Executing migration query via exec_sql RPC...');
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  
  if (error) {
    console.error('Migration failed with exec_sql RPC:', error);
    console.log('Retrying with execute_sql RPC...');
    const { data: data2, error: error2 } = await supabase.rpc('execute_sql', { sql_query: sql });
    if (error2) {
      console.error('Migration failed with execute_sql RPC too:', error2);
      process.exit(1);
    } else {
      console.log('Migration completed successfully using execute_sql RPC.', data2);
    }
  } else {
    console.log('Migration completed successfully using exec_sql RPC.', data);
  }
}

runMigration();
