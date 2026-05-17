import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://msyxlqljswpertszbotf.supabase.co';
const supabaseKey = 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('Migrating database to add instrument-specific PDF columns...');
  
  const sql = `
    -- Add instrument-specific PDF URL columns to songs
    ALTER TABLE songs ADD COLUMN IF NOT EXISTS pdf_drums_url TEXT;
    ALTER TABLE songs ADD COLUMN IF NOT EXISTS pdf_guitar_url TEXT;
    ALTER TABLE songs ADD COLUMN IF NOT EXISTS pdf_bass_url TEXT;
    ALTER TABLE songs ADD COLUMN IF NOT EXISTS pdf_vocals_url TEXT;
    ALTER TABLE songs ADD COLUMN IF NOT EXISTS pdf_keys_url TEXT;
  `;
  
  try {
    const { error } = await supabase.rpc('execute_sql', { sql_query: sql });
    
    if (error) {
      console.error('Error adding columns via RPC:', error.message);
      console.log('\n--- MANUAL ACTION REQUIRED ---');
      console.log('Please copy and run the following SQL in your Supabase SQL Editor (https://supabase.com/dashboard):');
      console.log(sql);
      console.log('------------------------------\n');
    } else {
      console.log('✅ Instrument PDF columns added to the "songs" table successfully!');
    }
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

migrate();
