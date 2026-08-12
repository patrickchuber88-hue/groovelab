import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('../apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey);

async function run() {
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('first_name', 'Felix');
  if (error) console.error(error);
  else console.log(users.map(u => ({ id: u.id, name: `${u.first_name} ${u.last_name}`, role: u.role, teacher_id: u.teacher_id })));
}

run();
