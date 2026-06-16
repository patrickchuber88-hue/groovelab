import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing env');
  process.exit(1);
}

// Student client
const studentClient = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-user-id': '33333333-3333-3333-3333-333333333331' // student-1
    }
  }
});

// Admin client
const adminClient = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-user-id': '44444444-4444-4444-4444-444444444441' // admin-1
    }
  }
});

async function run() {
  // Call RPC get_current_user_role
  const { data: studentRole, error: studentRoleErr } = await studentClient.rpc('get_current_user_role');
  console.log('RPC get_current_user_role for student-1:', studentRole, 'Error:', studentRoleErr);

  // Check if student can read the event that has visibility = 'teachers'
  const eventId = '99999999-9999-9999-9999-999999999997';
  
  // Create it as admin
  await adminClient.from('campus_events').delete().eq('id', eventId);
  const { data: insertData, error: insertErr } = await adminClient.from('campus_events').insert({
    id: eventId,
    school_id: '11111111-1111-1111-1111-111111111111',
    title: 'Teacher Only Event',
    event_date: '2026-05-12',
    start_time: '17:00',
    category: 'Konzert',
    visibility: 'teachers'
  }).select();

  console.log('Inserted event:', insertData, 'Error:', insertErr);

  // Now select it as student
  const { data: studentEvents, error: studentEventsErr } = await studentClient
    .from('campus_events')
    .select('*')
    .eq('id', eventId);

  console.log('Select event as student-1:', studentEvents, 'Error:', studentEventsErr);

  // Cleanup
  await adminClient.from('campus_events').delete().eq('id', eventId);
}

run().catch(console.error);
