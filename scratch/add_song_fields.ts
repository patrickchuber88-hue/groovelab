import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://msyxlqljswpertszbotf.supabase.co';
const supabaseKey = 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addSongFields() {
  console.log('Adding new columns to songs table...');
  const sql = `
    ALTER TABLE songs ADD COLUMN IF NOT EXISTS pdf_folder_url TEXT;
    ALTER TABLE songs ADD COLUMN IF NOT EXISTS guitar_pro_url TEXT;
    ALTER TABLE songs ADD COLUMN IF NOT EXISTS bypass_wlan_check BOOLEAN DEFAULT FALSE;
  `;
  
  const { error } = await supabase.rpc('execute_sql', { sql_query: sql });
  
  if (error) {
    console.error('Error adding columns via RPC:', error.message);
    console.log('You may need to add the columns manually in the Supabase Dashboard if the RPC is missing or restricted.');
  } else {
    console.log('Columns pdf_folder_url, guitar_pro_url, and bypass_wlan_check added to songs successfully!');
  }
}

addSongFields();
