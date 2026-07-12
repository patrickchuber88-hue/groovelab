const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://msyxlqljswpertszbotf.supabase.co';
const supabaseAnonKey = 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkActiveSessions() {
  try {
    const { data: sessions, error } = await supabase.from('sessions')
      .select('id, user_id, station_id, check_in_time, stations(*), users(*)');
    if (error) throw error;
    console.log('--- ACTIVE SESSIONS ---');
    console.log(JSON.stringify(sessions, null, 2));
  } catch (err) {
    console.error(err);
  }
}

checkActiveSessions();
