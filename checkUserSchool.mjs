import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function checkUserSchool() {
  const userId = '9f4d514c-4eb0-4071-8356-4fdef39b19f2'; // 1 Schüler
  
  const { data, error } = await supabase.from('users').select('*, schools(*)').eq('id', userId).single();
  
  if (error) {
    console.error("USER SCHOOL FETCH ERROR:", error.message, error.details);
  } else {
    console.log("USER SCHOOL FETCH SUCCESS! Data:", JSON.stringify(data, null, 2));
  }
}

checkUserSchool();
