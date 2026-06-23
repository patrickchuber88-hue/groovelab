const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

const supabase = createClient(url, serviceKey);

async function run() {
  try {
    const { data: buildings, error: bErr } = await supabase.from('buildings').select('*');
    if (bErr) {
      console.log('Buildings Table Error:', bErr.message);
    } else {
      console.log('Buildings:', buildings);
    }

    const { data: rooms, error: rErr } = await supabase.from('rooms').select('*');
    if (rErr) {
      console.log('Rooms Table Error:', rErr.message);
    } else {
      console.log('Rooms (id, name, building_id):', rooms.map(r => ({ id: r.id, name: r.name, building_id: r.building_id })));
    }
  } catch (err) {
    console.error(err);
  }
}

run();
