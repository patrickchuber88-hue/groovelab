import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function testLogin() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('is_master_admin', true)
    .eq('master_admin_username', 'patrick.huber88')
    .eq('master_admin_password', 'groovelab2026')
    .maybeSingle();

  console.log("Login query result:", data, error);
}
testLogin();
