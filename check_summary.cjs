const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://msyxlqljswpertszbotf.supabase.co';
const supabaseAnonKey = 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkActiveSessions() {
  try {
    const { data: sessions, error } = await supabase.from('sessions')
      .select('id, user_id, station_id, check_in_time, stations(id, name, pos_x, pos_y, instrument), users(first_name, last_name)');
    if (error) throw error;
    console.log('--- ACTIVE SESSIONS SUMMARY ---');
    sessions.forEach(s => {
      console.log(`Session: ${s.id}`);
      console.log(`  User: ${s.users?.first_name} ${s.users?.last_name}`);
      console.log(`  Station: ${s.stations?.name} (${s.stations?.instrument})`);
      console.log(`  Pos: X=${s.stations?.pos_x}, Y=${s.stations?.pos_y}`);
      console.log(`  Room: ${s.stations?.room_id}`);
    });
  } catch (err) {
    console.error(err);
  }
}

checkActiveSessions();
