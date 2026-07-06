import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function run() {
  const tokenManuel = '897ed2f0-d0e6-47e8-b799-a09efe9e51e5';
  const tokenAdmin = '2e2e7ec2-46b0-4ab6-9805-284e66186ab1';

  const resManuel = await supabase.from('users').select('*').eq('qr_token', tokenManuel).maybeSingle();
  console.log("Manuel full:", resManuel.data, resManuel.error);

  const resAdmin = await supabase.from('users').select('*').eq('qr_token', tokenAdmin).maybeSingle();
  console.log("Admin full:", resAdmin.data, resAdmin.error);
}

run();
