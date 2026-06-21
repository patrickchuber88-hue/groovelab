import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function resetClara() {
  const claraId = '9378cab6-068a-4e05-84c8-20411be8e29e';
  console.log(`Resetting Clara Krüger (ID: ${claraId}) to 'ausstehend' status...`);

  // 1. Delete user from public.users if exists
  const { error: userDeleteErr } = await supabase
    .from('users')
    .delete()
    .eq('id', claraId);
  console.log("Deleted user entry:", userDeleteErr || "Success");

  // 2. Reset student status in public.students to 'ausstehend'
  const { error: studentUpdateErr } = await supabase
    .from('students')
    .update({ status: 'ausstehend', parent_notes: null })
    .eq('id', claraId);
  console.log("Reset student status to 'ausstehend':", studentUpdateErr || "Success");
}

resetClara().catch(console.error);
