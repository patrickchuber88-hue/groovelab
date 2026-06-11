import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

// Create client with x-user-id header
const supabase = createClient(url, key, {
  global: {
    headers: {
      'x-user-id': '0f984a89-cf47-4405-bdc9-ead2acd0ba7e'
    }
  }
});

async function run() {
  const targetUserId = "03564b1c-e2bb-4ccb-be95-b9fd1ef34829";
  
  console.log("--- fetching target user profile ---");
  const { data: u, error: uErr } = await supabase
    .from('users')
    .select('*')
    .eq('id', targetUserId)
    .maybeSingle();
  console.log("User:", u);
  console.log("Error:", uErr);

  console.log("--- fetching teacher profile ---");
  const { data: teacher, error: tErr } = await supabase
    .from('users')
    .select('*')
    .eq('id', '0f984a89-cf47-4405-bdc9-ead2acd0ba7e')
    .maybeSingle();
  console.log("Teacher:", teacher);
  console.log("Error:", tErr);
}

run();
