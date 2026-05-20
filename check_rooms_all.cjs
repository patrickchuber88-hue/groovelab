const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://msyxlqljswpertszbotf.supabase.co';
const supabaseAnonKey = 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRooms() {
  try {
    const { data: rooms, error } = await supabase.from('rooms').select('*');
    if (error) throw error;
    console.log('--- ALL ROOMS ---');
    console.log(JSON.stringify(rooms, null, 2));
  } catch (err) {
    console.error(err);
  }
}

checkRooms();
