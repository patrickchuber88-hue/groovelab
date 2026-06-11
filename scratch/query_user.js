import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function check() {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', '03564b1c-e2bb-4ccb-be95-b9fd1ef34829');
  console.log("User:", user);
  console.log("Error:", error);
}

check();
