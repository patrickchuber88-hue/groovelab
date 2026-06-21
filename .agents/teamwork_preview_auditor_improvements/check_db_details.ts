import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'apps/groovelab/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.campus-groovelab.de';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

const supabaseAdmin = createClient(supabaseUrl, SERVICE_KEY);

async function check() {
  console.log("=== Checking DB Operations with INSERT ===");

  const schoolId = '99999999-9999-9999-9999-999999999999';
  const teacherId = '22222222-2222-2222-2222-222222222222';
  const eventId = '33333333-3333-3333-3333-333333333333';
  const ppId1 = '44444444-4444-4444-4444-444444444444';
  const ppId2 = '55555555-5555-5555-5555-555555555555';
  const lessonId = '66666666-6666-6666-6666-666666666666';

  // 1. Clean up first to avoid duplicates
  await supabaseAdmin.from('lessons').delete().eq('id', lessonId);
  await supabaseAdmin.from('campus_event_program_points').delete().eq('event_id', eventId);
  await supabaseAdmin.from('campus_events').delete().eq('id', eventId);
  await supabaseAdmin.from('users_raw').delete().eq('id', teacherId);
  await supabaseAdmin.from('schools').delete().eq('id', schoolId);

  // 2. Perform insertions
  const schoolRes = await supabaseAdmin.from('schools').insert({
    id: schoolId,
    name: 'Test Verification School',
    opening_hours: '{}'
  });
  console.log("School insert:", schoolRes.error ? "Error: " + schoolRes.error.message : "Success");

  const teacherRes = await supabaseAdmin.from('users').insert({
    id: teacherId,
    school_id: schoolId,
    role: 'teacher',
    first_name: 'Conflict',
    last_name: 'Teacher',
    email: 'conflict.teacher@example.com'
  });
  console.log("Teacher insert:", teacherRes.error ? "Error: " + teacherRes.error.message : "Success");

  const eventRes = await supabaseAdmin.from('campus_events').insert({
    id: eventId,
    school_id: schoolId,
    title: 'Conflict Test Event',
    event_date: '2026-06-30',
    start_time: '15:00:00'
  });
  console.log("Event insert:", eventRes.error ? "Error: " + eventRes.error.message : "Success");

  const pp1Res = await supabaseAdmin.from('campus_event_program_points').insert({
    id: ppId1,
    event_id: eventId,
    school_id: schoolId,
    teacher_id: teacherId,
    name: 'Act 1',
    duration: 30,
    stage_number: 1,
    sort_order: 1,
    is_scheduled: true
  });
  console.log("PP1 insert:", pp1Res.error ? "Error: " + pp1Res.error.message : "Success");

  const pp2Res = await supabaseAdmin.from('campus_event_program_points').insert({
    id: ppId2,
    event_id: eventId,
    school_id: schoolId,
    teacher_id: teacherId,
    name: 'Act 2',
    duration: 30,
    stage_number: 2,
    sort_order: 1,
    is_scheduled: true
  });
  console.log("PP2 insert:", pp2Res.error ? "Error: " + pp2Res.error.message : "Success");

  const lessonRes = await supabaseAdmin.from('lessons').insert({
    id: lessonId,
    teacher_id: teacherId,
    school_id: schoolId,
    date: '2026-06-30',
    start_time: '15:15:00',
    duration: 45,
    status: 'scheduled'
  });
  console.log("Lesson insert:", lessonRes.error ? "Error: " + lessonRes.error.message : "Success");

  // Call get_schedule_conflicts
  const conflictsRes = await supabaseAdmin.rpc('get_schedule_conflicts', {
    p_event_id: eventId,
    p_transition_time: 10
  });
  console.log("Conflicts:", conflictsRes.data, "Error:", conflictsRes.error);

  // Let's also check if the tables actually contain the rows
  const { data: usersCount } = await supabaseAdmin.from('users').select('id, first_name').eq('id', teacherId);
  console.log("Teacher in DB:", usersCount);

  const { data: eventsCount } = await supabaseAdmin.from('campus_events').select('id').eq('id', eventId);
  console.log("Events in DB:", eventsCount);

  const { data: ppsCount } = await supabaseAdmin.from('campus_event_program_points').select('id, is_scheduled, stage_number').eq('event_id', eventId);
  console.log("PPs in DB:", ppsCount);

  const { data: lessonsCount } = await supabaseAdmin.from('lessons').select('id').eq('id', lessonId);
  console.log("Lessons in DB:", lessonsCount);

  // Clean up
  console.log("\n--- Cleaning up ---");
  await supabaseAdmin.from('lessons').delete().eq('id', lessonId);
  await supabaseAdmin.from('campus_event_program_points').delete().eq('event_id', eventId);
  await supabaseAdmin.from('campus_events').delete().eq('id', eventId);
  await supabaseAdmin.from('users_raw').delete().eq('id', teacherId);
  await supabaseAdmin.from('schools').delete().eq('id', schoolId);
  console.log("Cleanup complete.");
}

check();
