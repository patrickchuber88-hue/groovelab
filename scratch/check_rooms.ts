import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data: rooms } = await supabase.from('rooms').select('*');
  console.log('Rooms:', rooms);
  const { data: stations } = await supabase.from('stations').select('*');
  console.log('Stations:', stations);
}
run();
