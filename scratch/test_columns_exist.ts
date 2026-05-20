import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  console.log('Checking rooms table columns...');
  const { data: rData, error: rErr } = await supabase.from('rooms').select('room_width, room_height').limit(1);
  if (rErr) {
    console.log('rooms columns room_width/room_height DO NOT exist:', rErr.message);
  } else {
    console.log('rooms columns room_width/room_height EXIST!');
  }

  console.log('Checking stations table columns...');
  const { data: sData, error: sErr } = await supabase.from('stations').select('pos_x, pos_y, instrument').limit(1);
  if (sErr) {
    console.log('stations columns pos_x/pos_y/instrument DO NOT exist:', sErr.message);
  } else {
    console.log('stations columns pos_x/pos_y/instrument EXIST!');
  }
}
run();
