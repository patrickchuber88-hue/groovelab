import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://supabase.campus-groovelab.de';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  const schoolId = '74713df2-6176-4a41-a8cd-9fbebe34e9b8';
  
  const { data: rooms, error: roomsErr } = await supabase
    .from('rooms')
    .select('*')
    .eq('school_id', schoolId);
  console.log("Rooms:", rooms);

  if (rooms) {
    const roomIds = rooms.map(r => r.id);
    const { data: stations, error: stationsErr } = await supabase
      .from('stations')
      .select('*')
      .in('room_id', roomIds);
    console.log("Stations:", stations);
  }
}

run();
