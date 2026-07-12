import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function addPlayalongColumn() {
  const sql = `
    ALTER TABLE songs ADD COLUMN IF NOT EXISTS playalong_url TEXT;
  `;
  
  const { error } = await supabase.rpc('execute_sql', { sql_query: sql });
  
  if (error) {
    console.error('Error adding playalong_url column:', error);
  } else {
    console.log('playalong_url column added successfully');
  }
}

addPlayalongColumn();
