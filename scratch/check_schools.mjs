import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function checkSchools() {
  const { data: schools } = await supabase.from('schools').select('*');
  console.log("ALL SCHOOLS ALL FIELDS:");
  schools?.forEach(s => {
    console.log(`Name: ${s.name} | IsPaused: ${s.is_paused} | Status: ${s.status} | IsTrial: ${s.is_trial} | ContractEndsAt: ${s.contract_ends_at}`);
  });
}
checkSchools();
