import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function check() {
  const { data: users } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, teacher_qr_token, qr_token, ausweis_nummer')
    .eq('school_id', '74713df2-6176-4a41-a8cd-9fbebe34e9b8');
  console.log("Users in Musäk Bad Säckingen:", users);
}
check();
