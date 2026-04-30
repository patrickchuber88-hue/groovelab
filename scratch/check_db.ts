import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking Stations and Sessions...');
  
  const { data: stations } = await supabase.from('stations').select('id, name, school_id');
  console.log('\n--- STATIONS ---');
  stations?.forEach(s => console.log(`ID: ${s.id} | Name: "${s.name}" | School: ${s.school_id}`));

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, user_id, station_id, check_in_time, check_out_time, users(first_name, role)')
    .is('check_out_time', null);
    
  console.log('\n--- ACTIVE SESSIONS ---');
  sessions?.forEach(s => {
    console.log(`Session: ${s.id} | User: ${s.users?.first_name} (${s.users?.role}) | StationID: ${s.station_id}`);
  });
}

check();
