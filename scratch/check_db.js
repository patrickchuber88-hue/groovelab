import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'dummy';

async function run() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log("--- schedules ---");
  const { data: s } = await supabase.from('schedules').select('*');
  console.log(s);

  console.log("\n--- schedule_exceptions ---");
  const { data: se } = await supabase.from('schedule_exceptions').select('*');
  console.log(se);

  console.log("\n--- schedule_occurrences ---");
  const { data: so } = await supabase.from('schedule_occurrences').select('*');
  console.log(so);
}

run();
