const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://msyxlqljswpertszbotf.supabase.co';
const supabaseKey = 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const tables = ['help_requests', 'jam_requests', 'song_requests'];
  for (const t of tables) {
    console.log(`--- Columns for ${t} ---`);
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (data && data.length > 0) {
      console.log(Object.keys(data[0]));
    } else if (error) {
      console.log('Error:', error.message);
    } else {
      console.log('No data to infer columns.');
    }
  }
}

checkColumns();
