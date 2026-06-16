import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('../../.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim().replace(/['"]/g, '');
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim().replace(/['"]/g, '');
const supabase = createClient(url, key);

const { data, error } = await supabase
  .from('progress_matrix')
  .select('*, users!student_id(*)')
  .order('updated_at', { ascending: false })
  .limit(50);

if (error) {
  console.error("Error:", error);
} else {
  console.log("Found", data.length, "items:");
  data.forEach(item => {
    console.log(`ID: ${item.id}, Student: ${item.users?.name} (${item.student_id}), Topic: ${item.topic_name}, Status: ${item.status}, Homework: ${item.is_current_homework}, Updated: ${item.updated_at}`);
  });
}
