import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local from apps/groovelab
dotenv.config({ path: path.resolve(__dirname, 'apps/groovelab/.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const sql = `
    ALTER TABLE users ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES users(id) ON DELETE SET NULL;
  `;
  const { error } = await supabase.rpc('execute_sql', { sql_query: sql });
  if (error) console.error('Error:', error);
  else console.log('Successfully added teacher_id');
}
run();
