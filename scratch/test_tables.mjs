import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function test() {
  console.log("Testing subjects...");
  const { data: sData, error: sError } = await supabase.from('subjects').select('*').limit(1);
  console.log("Subjects result:", { sData, sError });

  console.log("Testing cooperations...");
  const { data: cData, error: cError } = await supabase.from('cooperations').select('*').limit(1);
  console.log("Cooperations result:", { cData, cError });
}

test();
