import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key, {
  global: {
    headers: {
      'x-user-id': '03564b1c-e2bb-4ccb-be95-b9fd1ef34829'
    }
  }
});

async function run() {
  const occId = "6c22036b-ab2c-4724-8e90-84272d9db0ef";
  console.log(`Attempting to delete schedule occurrence ID ${occId} as Patrick Huber...`);
  const { data, error, count } = await supabase
    .from('schedule_occurrences')
    .delete()
    .eq('id', occId);
  console.log("Delete result data:", data);
  console.log("Delete result error:", error);
  console.log("Delete count:", count);
}

run();
