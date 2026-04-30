import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://msyxlqljswpertszbotf.supabase.co';
const supabaseKey = 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSystem() {
  console.log('--- Detailed System Check ---');
  
  const { data: schools } = await supabase.from('schools').select('*');
  console.log('Schools:', JSON.stringify(schools, null, 2));

  if (schools && schools.length > 0) {
    const sId = schools[0].id;
    const { data: rooms } = await supabase.from('rooms').select('*').eq('school_id', sId);
    console.log(`Rooms for School ${sId}:`, JSON.stringify(rooms, null, 2));
    
    if (rooms && rooms.length > 0) {
      const { data: stations } = await supabase.from('stations').select('*').in('room_id', rooms.map(r => r.id));
      console.log('Stations for these rooms:', JSON.stringify(stations, null, 2));
    }
  }

  // Check users count
  const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
  console.log('Total users in DB:', count);
}

checkSystem();
