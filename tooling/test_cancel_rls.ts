import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'apps/groovelab/.env.local' });

// We use the real anonymous key and URL to act as the anonymous user
const SUPABASE_URL = 'https://supabase.campus-groovelab.de';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

// Let's use Elisabeth's bypass token to fetch her profile and try to cancel a virtual or actual occurrence
const STUDENT_QR_TOKEN = 'ab4b4f50-04bd-407b-a48e-f7f532b620fc';

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  // Initialize the anonymous client with customFetch simulating the QR headers for Patrick
  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    global: {
      headers: {
        'x-client-info': `supabase-js/2.39.3;qr_token=${STUDENT_QR_TOKEN}`
      }
    }
  });

  console.log("Fetching student profile to get student_id...");
  const { data: profile, error: profErr } = await supabase
    .from('users')
    .select('id, first_name, last_name, school_id')
    .or(`qr_token.eq.${STUDENT_QR_TOKEN},id.eq.${STUDENT_QR_TOKEN}`)
    .single();

  if (profErr || !profile) {
    console.error("Failed to fetch profile:", profErr);
    return;
  }
  console.log(`Loaded profile: ${profile.first_name} ${profile.last_name} (${profile.id})`);

  // Let's get one actual occurrence for this student
  console.log("Fetching one upcoming actual occurrence...");
  const { data: occurrences, error: occErr } = await supabase
    .from('schedule_occurrences')
    .select('*')
    .eq('student_id', profile.id)
    .limit(1);

  if (occErr) {
    console.error("Failed to fetch occurrences:", occErr);
    return;
  }

  if (occurrences && occurrences.length > 0) {
    const occ = occurrences[0];
    console.log(`Found actual occurrence: ID ${occ.id}, Status ${occ.status}, Date ${occ.date}`);

    // Try to update it to cancelled
    console.log("Testing UPDATE of actual occurrence...");
    const { data: updateData, error: updateErr } = await supabase
      .from('schedule_occurrences')
      .update({ status: 'cancelled', student_acknowledged: true })
      .eq('id', occ.id);

    if (updateErr) {
      console.error("UPDATE FAILED:", updateErr);
    } else {
      console.log("UPDATE SUCCEEDED:", updateData);
    }
  }

  // INSERT test
  console.log("Fetching student schedules to resolve schedule_id...");
  const { data: schedules, error: schErr } = await supabase
    .from('schedules')
    .select('*')
    .eq('student_id', profile.id)
    .limit(1);

  if (schErr || !schedules || schedules.length === 0) {
    console.error("Failed to fetch schedules:", schErr);
    return;
  }
  const sch = schedules[0];

  console.log("Testing INSERT of schedule_occurrences...");
  const { data: insertData, error: insertErr } = await supabase
    .from('schedule_occurrences')
    .insert({
      schedule_id: sch.id,
      student_id: profile.id,
      teacher_id: sch.teacher_id,
      date: '2026-07-26', // A Sunday in the future
      start_time: '14:00:00',
      duration: 45,
      status: 'cancelled',
      student_acknowledged: true
    })
    .select();

  if (insertErr) {
    console.error("INSERT FAILED:", insertErr);
  } else {
    console.log("INSERT SUCCEEDED:", insertData);
    
    // Clean up the created test occurrence
    console.log("Cleaning up inserted test occurrence...");
    const { error: delErr } = await supabase
      .from('schedule_occurrences')
      .delete()
      .eq('id', insertData[0].id);
    if (delErr) {
      console.error("Delete cleanup failed:", delErr);
    } else {
      console.log("Delete cleanup succeeded.");
    }
  }
}

run();
