
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://msyxlqljswpertszbotf.supabase.co';
const supabaseKey = 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';

const supabase = createClient(supabaseUrl, supabaseKey);


async function fixColumns() {
  console.log('Attempting to add missing columns to "users" table...');
  
  const sql = `
    -- Add birth_date for students
    ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;
    
    -- Add teacher profile fields
    ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS bands JSONB DEFAULT '[]';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS projects JSONB DEFAULT '[]';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS gear TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS listening TEXT;
  `;
  
  // This requires the 'execute_sql' RPC in Supabase
  const { error } = await supabase.rpc('execute_sql', { sql_query: sql });
  
  if (error) {
    console.error('Error adding columns via RPC:', error.message);
    console.log('\n--- MANUAL FIX ---');
    console.log('If the RPC is missing, please run the following SQL in your Supabase SQL Editor:');
    console.log(sql);
    console.log('------------------\n');
  } else {
    console.log('✅ Columns added successfully!');
  }
}

fixColumns();
