
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://msyxlqljswpertszbotf.supabase.co';
const supabaseKey = 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addColumns() {
  const sql = `
    ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;
  `;
  const { error } = await supabase.rpc('execute_sql', { sql_query: sql });
  if (error) console.error(error.message);
  else console.log('Column birth_date added');
}
addColumns();
