import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const extractEnv = (key) => {
  const match = envFile.match(new RegExp(`${key}=(.*)`));
  return match ? match[1] : null;
};

const supabaseUrl = extractEnv('VITE_SUPABASE_URL');
const supabaseKey = extractEnv('VITE_SUPABASE_ANON_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

async function addColorColumn() {
  console.log('Attempting to add color column to stations table...');
  const { data, error } = await supabase.rpc('exec_sql', { query: 'ALTER TABLE stations ADD COLUMN IF NOT EXISTS color TEXT;' });
  
  if (error) {
    console.error('Error executing RPC:', error);
  } else {
    console.log('Successfully altered table or RPC executed.', data);
  }
}

addColorColumn();
