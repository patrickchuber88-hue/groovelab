import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envPath = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local';
const env = fs.readFileSync(envPath, 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

const { data, error } = await supabase.from('users').select('id, first_name, last_name, role, school_id, is_master_admin');
if (error) {
  console.error(error);
} else {
  data.forEach(u => {
    if (u.role === 'admin' || u.role === 'secretary') {
      console.log(`User: ${u.first_name} ${u.last_name} | Role: ${u.role} | School ID: ${u.school_id} | Is Master Admin: ${u.is_master_admin} | ID: ${u.id}`);
    }
  });
}
