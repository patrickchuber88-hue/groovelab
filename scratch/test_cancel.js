import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function testCancel() {
  const { data, error } = await supabase
    .from('schedule_occurrences')
    .update({ status: 'canceled_by_student' })
    .eq('id', '0df608e8-41d0-462a-ba74-595b2d7ff6ff');
  
  console.log("Update to 'canceled_by_student' status:");
  console.log("Error:", error);
  console.log("Data:", data);

  const { data: data2, error: error2 } = await supabase
    .from('schedule_occurrences')
    .update({ status: 'cancelled' })
    .eq('id', '0df608e8-41d0-462a-ba74-595b2d7ff6ff');

  console.log("Update to 'cancelled' status:");
  console.log("Error:", error2);
  console.log("Data:", data2);
}

testCancel();
