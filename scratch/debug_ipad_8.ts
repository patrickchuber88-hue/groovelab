
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://msyxlqljswpertszbotf.supabase.co';
const supabaseKey = 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIpad8() {
  console.log('--- Checking Stations ---');
  const { data: stations } = await supabase.from('stations').select('id, name');
  const ipad8 = stations?.find(s => s.name.includes('8'));
  
  if (!ipad8) {
    console.log('Station "iPad 8" not found. Available stations:');
    stations?.forEach(s => console.log(`- ${s.name} (${s.id})`));
    return;
  }

  console.log(`Found Station: ${ipad8.name} (${ipad8.id})`);

  console.log('\n--- Active Sessions on this Station ---');
  const { data: activeSessions } = await supabase
    .from('sessions')
    .select('*, users(first_name, last_name)')
    .eq('station_id', ipad8.id)
    .is('check_out_time', null);

  if (activeSessions && activeSessions.length > 0) {
    activeSessions.forEach(s => {
      console.log(`Session ID: ${s.id}`);
      console.log(`User: ${s.users?.first_name} ${s.users?.last_name} (${s.user_id})`);
      console.log(`In: ${s.check_in_time}`);
    });
  } else {
    console.log('No active sessions found on iPad 8.');
  }

  console.log('\n--- Recent Sessions on this Station (last 5) ---');
  const { data: recentSessions } = await supabase
    .from('sessions')
    .select('*, users(first_name, last_name)')
    .eq('station_id', ipad8.id)
    .order('check_in_time', { ascending: false })
    .limit(5);

  recentSessions?.forEach(s => {
    console.log(`[${s.check_in_time}] User: ${s.users?.first_name} ${s.users?.last_name} - Out: ${s.check_out_time || 'STILL IN'}`);
  });
}

checkIpad8();
