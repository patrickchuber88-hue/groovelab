import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    console.log('--- FETCHING ACTIVE SESSIONS ---');
    const { data: activeSessions, error: activeSessionsErr } = await supabase
      .from('sessions')
      .select('*, users(*), stations(*)')
      .is('check_out_time', null);
    if (activeSessionsErr) console.error(activeSessionsErr);
    else console.log(JSON.stringify(activeSessions, null, 2));

    console.log('--- FETCHING STATIONS ---');
    const { data: stations, error: stationsErr } = await supabase
      .from('stations')
      .select('*, rooms(*)');
    if (stationsErr) console.error(stationsErr);
    else console.log(JSON.stringify(stations, null, 2));
  } catch (err) {
    console.error(err);
  }
}

run();
