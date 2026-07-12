import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function checkSchoolIds() {
  const { data: users } = await supabase.from('users').select('*');
  console.log("STUDENT SCHOOL IDS:");
  users?.forEach(u => {
    console.log(`User Name: ${u.first_name} | ID: ${u.id} | School ID: ${u.school_id}`);
  });

  const { data: bands } = await supabase.from('bands').select('*');
  console.log("\nBAND SCHOOL IDS:");
  bands?.forEach(b => {
    console.log(`Band Name: ${b.name} | ID: ${b.id} | School ID: ${b.school_id}`);
  });
}
checkSchoolIds();
