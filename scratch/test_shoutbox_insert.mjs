import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  console.log("Testing insert with band_id = null...");
  const { data, error } = await supabase.from('band_shoutbox').insert({
    band_id: null,
    user_id: '1301a041-92e9-48df-acc7-0d66f1cab400', // a valid user id from sample data
    content: 'TEST_GLOBAL_MESSAGE: Hello World',
    read_by: []
  }).select();

  if (error) {
    console.log("❌ Insert failed with band_id = null:", error.message);
  } else {
    console.log("✅ Insert succeeded! Inserted row:", data);
    // Let's clean up
    await supabase.from('band_shoutbox').delete().eq('id', data[0].id);
    console.log("Cleaned up successfully!");
  }
}

run();
