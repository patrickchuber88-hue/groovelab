import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key, {
  global: {
    headers: {
      'x-user-id': '88888888-8888-8888-8888-888888888888'
    }
  }
});

async function run() {
  const teacherId = '03564b1c-e2bb-4ccb-be95-b9fd1ef34829'; // Patrick Huber (teacher)

  console.log("Updating teacher_qr_token and ausweis_nummer for teacher Patrick Huber...");

  const { data, error } = await supabase
    .from('users')
    .update({
      teacher_qr_token: 't_test12345678901234567890',
      ausweis_nummer: 'CG-9999'
    })
    .eq('id', teacherId)
    .select();

  console.log("Teacher update response:", data, error);
}

run();
