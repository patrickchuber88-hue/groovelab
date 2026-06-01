import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function test() {
  // Try inserting a break occurrence
  const mockBreak = {
    teacher_id: '03564b1c-e2bb-4ccb-be95-b9fd1ef34829',
    date: '2026-06-08',
    start_time: '16:00:00',
    duration: 15,
    status: 'cancelled',
    student_id: null,
    schedule_id: null
  };

  const { data, error } = await supabase
    .from('schedule_occurrences')
    .insert(mockBreak)
    .select();

  console.log("Insert result:", data);
  console.log("Insert error:", error);
}

test();
