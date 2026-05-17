import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim().replace(/['"]/g, '');
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim().replace(/['"]/g, '');
const supabase = createClient(url, key);

async function main() {
  const { data: users } = await supabase.from('users').select('*');
  users.forEach(u => {
    console.log(`User: ${u.first_name}, QR Token: ${u.qr_token}`);
  });
}

main();
