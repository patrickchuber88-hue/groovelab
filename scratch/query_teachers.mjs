import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('../apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey);

async function run() {
  const { data: teachers, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'teacher');
  if (error) console.error(error);
  else console.log(teachers.map(t => ({ id: t.id, name: `${t.first_name} ${t.last_name}`, is_campus_active: t.is_campus_active })));
}

run();
