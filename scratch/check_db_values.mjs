import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function check() {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, qr_token, teacher_qr_token, ausweis_nummer, is_pin_activated')
    .eq('role', 'teacher')
    .limit(5);
    
  console.log("Teacher users in DB:", users);
  
  const { data: students } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, qr_token, teacher_qr_token, ausweis_nummer, is_pin_activated')
    .eq('role', 'student')
    .limit(5);
    
  console.log("Student users in DB:", students);
}
check();
