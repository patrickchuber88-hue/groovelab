
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://msyxlqljswpertszbotf.supabase.co';
const supabaseKey = 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function closeDaveSession() {
  console.log('--- Closing Dave G. session on iPad 8 ---');
  const { data: stations } = await supabase.from('stations').select('id').eq('name', 'iPad 8').single();
  
  if (stations) {
    const { error } = await supabase
      .from('sessions')
      .update({ check_out_time: new Date().toISOString() })
      .eq('station_id', stations.id)
      .is('check_out_time', null);
      
    if (error) console.error('Error closing session:', error);
    else console.log('Successfully closed session on iPad 8.');
  } else {
    console.log('iPad 8 not found.');
  }
}

closeDaveSession();
