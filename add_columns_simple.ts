
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_URL'; // I'll replace this with actual ones from .env
const supabaseKey = 'YOUR_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addColumns() {
  const sql = `
    ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER;
  `;
  const { error } = await supabase.rpc('execute_sql', { sql_query: sql });
  if (error) console.error(error);
  else console.log('Column added');
}
addColumns();
