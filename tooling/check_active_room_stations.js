const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://msyxlqljswpertszbotf.supabase.co';
const supabaseAnonKey = 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkActiveRoom() {
  try {
    const { data: stations, error } = await supabase.from('stations').select('id, name, pos_x, pos_y, room_id');
    if (error) throw error;
    console.log('--- ALL STATIONS ---');
    console.log(JSON.stringify(stations, null, 2));
  } catch (err) {
    console.error(err);
  }
}

checkActiveRoom();
