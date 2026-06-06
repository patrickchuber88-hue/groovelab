import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

const teacherId = '0f984a89-cf47-4405-bdc9-ead2acd0ba7e';
const studentId = '0326d56b-28b1-4dd9-8fde-387bb1ac3e49';

async function run() {
  console.log(`Using teacher: ${teacherId}, student: ${studentId}`);

  // Try inserting a schedule occurrence
  const testOcc = {
    student_id: studentId,
    teacher_id: teacherId,
    date: '2026-07-30', // Thursday (holiday)
    start_time: '13:00:00',
    duration: 30,
    status: 'pending_reschedule',
    original_date: '2026-07-29'
  };

  const { data: insertResult, error: insertErr } = await supabase
    .from('schedule_occurrences')
    .insert(testOcc)
    .select();

  if (insertErr) {
    console.error("INSERT FAILED WITH ERROR:", insertErr);
  } else {
    console.log("INSERT SUCCEEDED:", insertResult);
    
    // Clean up
    const { error: delErr } = await supabase
      .from('schedule_occurrences')
      .delete()
      .eq('id', insertResult[0].id);
    console.log("Cleanup delete error:", delErr);
  }
}

run();
