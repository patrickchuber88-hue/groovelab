import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function runTest() {
  console.log("Testing anonymous PIN query after RLS patch...");
  
  // Connect as master first to get a valid ausweis_nummer
  const masterSupabase = createClient(url, key, {
    global: { headers: { 'x-user-id': '88888888-8888-8888-8888-888888888888' } }
  });
  
  const { data: teacher } = await masterSupabase
    .from('users')
    .select('first_name, ausweis_nummer')
    .eq('role', 'teacher')
    .eq('first_name', 'Patrick')
    .single();

  console.log("Teacher for test:", teacher);

  if (teacher) {
    // Attempt to query teacher anonymously by sending their ausweis_nummer as the x-qr-token header
    const anonTeacherSupabase = createClient(url, key, {
      global: { headers: { 'x-qr-token': teacher.ausweis_nummer } }
    });
    
    const { data, error } = await anonTeacherSupabase
      .from('users')
      .select('id, first_name, last_name, role, ausweis_nummer')
      .eq('ausweis_nummer', teacher.ausweis_nummer)
      .maybeSingle();

    console.log("Anonymous Teacher PIN Query Result:", data, error);
  }
}

runTest();
