const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://msyxlqljswpertszbotf.supabase.co';
const supabaseKey = 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const tables = [
    'band_members', 'bands', 'friendships', 'help_requests', 
    'jam_requests', 'rejection_history', 'rooms', 'schools', 
    'sessions', 'song_requests', 'songs', 'stations', 
    'user_availability', 'user_song_skills', 'users'
  ];
  
  console.log('Checking tables...');
  for (const t of tables) {
    const { error } = await supabase.from(t).select('*').limit(0);
    if (error && error.message.includes('relation') && error.message.includes('does not exist')) {
      console.log(`❌ ${t}: MISSING`);
    } else if (error) {
       console.log(`⚠️ ${t}: ERROR (${error.message})`);
    } else {
      console.log(`✅ ${t}: OK`);
    }
  }
}

checkTables();
