import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const teacherId = 'ff30d2e9-43ae-432b-bba7-c4766bd57ca4'; // Boris Stoll
const studentId = 'b0de547c-543a-4fd9-8a2c-441b79ea15d3'; // Paul Mayer

// Create supabase client with custom headers to simulate teacher session
const supabase = createClient(url, key, {
  global: {
    headers: {
      'x-user-id': teacherId
    }
  }
});

async function run() {
  console.log(`Simulating teacher login for: ${teacherId}`);

  // 1. Try to fetch schedules to see if the schedules policy allows it
  const { data: schedData, error: schedErr } = await supabase
    .from('schedules')
    .select('id')
    .eq('student_id', studentId)
    .eq('teacher_id', teacherId)
    .limit(1);

  if (schedErr) {
    console.error("SELECT FROM schedules FAILED:", schedErr);
  } else {
    console.log("SELECT FROM schedules SUCCEEDED:", schedData);
  }

  // 2. Try to insert occurrence
  const testOcc = {
    student_id: studentId,
    teacher_id: teacherId,
    date: '2026-07-30', // Thursday (holiday)
    start_time: '13:00:00',
    duration: 30,
    status: 'pending_reschedule',
    original_date: '2026-07-29',
    schedule_id: (schedData && schedData.length > 0) ? schedData[0].id : null
  };

  console.log("Inserting occurrence:", testOcc);

  const { data: insertResult, error: insertErr } = await supabase
    .from('schedule_occurrences')
    .insert(testOcc)
    .select();

  if (insertErr) {
    console.error("INSERT INTO schedule_occurrences FAILED:", insertErr);
  } else {
    console.log("INSERT INTO schedule_occurrences SUCCEEDED:", insertResult);
    
    // Clean up
    if (insertResult && insertResult.length > 0) {
      const { error: delErr } = await supabase
        .from('schedule_occurrences')
        .delete()
        .eq('id', insertResult[0].id);
      console.log("Cleanup delete status:", delErr ? delErr.message : "Success");
    }
  }
}

run();
