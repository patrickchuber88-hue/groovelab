import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSessions() {
  const { data: stations } = await supabase.from('stations').select('id, name');
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, user_id, station_id, check_in_time, check_out_time')
    .is('check_out_time', null);

  console.log('--- Active Sessions ---');
  sessions?.forEach(s => {
    const station = stations?.find(st => st.id === s.station_id);
    console.log(`ID: ${s.id}, User: ${s.user_id}, Station: ${station?.name || s.station_id}, In: ${s.check_in_time}`);
  });
}

checkSessions();
