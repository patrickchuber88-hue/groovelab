import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'apps/groovelab/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.campus-groovelab.de';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, SERVICE_KEY);

async function test() {
  console.log("=== VERIFYING IMPROVEMENTS ===");
  
  // 1. Get or create a temporary school
  console.log("\n--- Creating Test School ---");
  const schoolId = '99999999-9999-9999-9999-999999999999';
  const { error: schoolErr } = await supabaseAdmin.from('schools').upsert({
    id: schoolId,
    name: 'Test Verification School',
    opening_hours: '{}'
  });
  if (schoolErr) console.error("School insertion failed:", schoolErr);
  else console.log("Test school created/upserted successfully.");

  // 2. Create an invite token
  console.log("\n--- Creating Test Invite Token ---");
  const testTokenVal = 'TEST_VERIFY_TOKEN_123';
  const { error: tokenErr } = await supabaseAdmin.from('invite_tokens').upsert({
    token: testTokenVal,
    school_id: schoolId,
    is_used: false
  });
  if (tokenErr) console.error("Invite token creation failed:", tokenErr);
  else console.log("Invite token created/upserted successfully.");

  // 3. Test validate_invite_token RPC
  console.log("\n--- Testing validate_invite_token Function ---");
  const { data: valResValid, error: valErrValid } = await supabaseAdmin.rpc('validate_invite_token', {
    p_token: testTokenVal,
    p_school_id: schoolId
  });
  console.log("Validation result for valid token:", valResValid, "Error:", valErrValid);

  const { data: valResInvalid, error: valErrInvalid } = await supabaseAdmin.rpc('validate_invite_token', {
    p_token: 'INVALID_TOKEN',
    p_school_id: schoolId
  });
  console.log("Validation result for invalid token:", valResInvalid, "Error:", valErrInvalid);

  // 4. Test RLS users_insert policy on users view (via raw user trigger)
  console.log("\n--- Testing User Signup and Token Marking as Used ---");
  // We can insert a user using headers by creating a new client with the headers injected
  const tokenSupabase = createClient(supabaseUrl, SERVICE_KEY, {
    global: {
      headers: {
        'x-invite-token': testTokenVal
      }
    }
  });

  const userId = '11111111-1111-1111-1111-111111111111';
  const { error: userInsertErr } = await tokenSupabase.from('users').insert({
    id: userId,
    school_id: schoolId,
    role: 'student',
    first_name: 'Test',
    last_name: 'Student',
    email: 'test.student@example.com'
  });
  if (userInsertErr) {
    console.error("User insertion failed:", userInsertErr);
  } else {
    console.log("User inserted successfully via x-invite-token.");
    
    // Check if the token is now marked as used
    const { data: tokenData } = await supabaseAdmin.from('invite_tokens').select('*').eq('token', testTokenVal).single();
    console.log("Invite token after user signup:", tokenData);
  }

  // 5. Test email encryption/decryption (handle_users_view_dml)
  console.log("\n--- Testing Email Encryption and View trigger ---");
  const { data: userData, error: userGetErr } = await supabaseAdmin.from('users').select('id, email').eq('id', userId).single();
  console.log("Query inserted user from view:", userData, "Error:", userGetErr);

  // 6. Test get_schedule_conflicts
  console.log("\n--- Testing get_schedule_conflicts ---");
  // Let's create a teacher and an event
  const teacherId = '22222222-2222-2222-2222-222222222222';
  await supabaseAdmin.from('users').upsert({
    id: teacherId,
    school_id: schoolId,
    role: 'teacher',
    first_name: 'Conflict',
    last_name: 'Teacher',
    email: 'conflict.teacher@example.com'
  });

  const eventId = '33333333-3333-3333-3333-333333333333';
  await supabaseAdmin.from('campus_events').upsert({
    id: eventId,
    school_id: schoolId,
    title: 'Conflict Test Event',
    event_date: '2026-06-30',
    start_time: '15:00:00'
  });

  // Program point 1 on stage 1 (15:00 - 15:30)
  const ppId1 = '44444444-4444-4444-4444-444444444444';
  await supabaseAdmin.from('campus_event_program_points').upsert({
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

  // Program point 2 on stage 2 (15:00 - 15:30) -> should conflict with stage 1 since teacher is the same and times overlap
  const ppId2 = '55555555-5555-5555-5555-555555555555';
  await supabaseAdmin.from('campus_event_program_points').upsert({
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

  // Lesson for same teacher on the same day (15:15 - 16:00) -> should conflict with both acts
  const lessonId = '66666666-6666-6666-6666-666666666666';
  await supabaseAdmin.from('lessons').upsert({
    id: lessonId,
    teacher_id: teacherId,
    school_id: schoolId,
    date: '2026-06-30',
    start_time: '15:15:00',
    duration: 45,
    status: 'scheduled'
  });

  // Call get_schedule_conflicts
  const { data: conflicts, error: conflictsErr } = await supabaseAdmin.rpc('get_schedule_conflicts', {
    p_event_id: eventId,
    p_transition_time: 10
  });
  console.log("Conflicts found:", conflicts, "Error:", conflictsErr);

  // Clean up
  console.log("\n--- Cleaning up ---");
  await supabaseAdmin.from('lessons').delete().eq('id', lessonId);
  await supabaseAdmin.from('campus_event_program_points').delete().eq('event_id', eventId);
  await supabaseAdmin.from('campus_events').delete().eq('id', eventId);
  await supabaseAdmin.from('users').delete().eq('id', userId);
  await supabaseAdmin.from('users').delete().eq('id', teacherId);
  await supabaseAdmin.from('invite_tokens').delete().eq('token', testTokenVal);
  await supabaseAdmin.from('schools').delete().eq('id', schoolId);
  console.log("Cleanup finished.");
}

test();
