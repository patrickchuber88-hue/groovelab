
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://msyxlqljswpertszbotf.supabase.co';
const supabaseKey = 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addColumns() {
  const sql = `
    ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS musical_styles JSONB DEFAULT '[]';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS equipment_list JSONB DEFAULT '[]';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;
  `;
  
  // Note: This requires the 'execute_sql' RPC to be present in Supabase.
  // If not, this will fail.
  const { error } = await supabase.rpc('execute_sql', { sql_query: sql });
  
  if (error) {
    console.error('Error adding columns via RPC:', error.message);
    console.log('Please add the columns manually in the Supabase Dashboard if the RPC is missing.');
  } else {
    console.log('Columns added successfully');
  }
}

addColumns();
