import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: schools } = await supabase.from('schools').select('*');
  console.log('Schools:', schools);

  const { data: rooms } = await supabase.from('rooms').select('*');
  console.log('Rooms:', rooms);

  const { data: stations } = await supabase.from('stations').select('*');
  console.log('Stations:', stations);
}

check();
