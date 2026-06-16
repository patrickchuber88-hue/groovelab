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

const adminClient = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-user-id': '44444444-4444-4444-4444-444444444441' // admin-1 (school-1)
    }
  }
});

async function run() {
  const eventId = '99999999-9999-9999-9999-999999999996';
  
  // Create school-2 and user-2 (from school-2) in database if needed, or check if we can query as user-2
  // Wait, does user-2 exist in school-1 or school-2?
  // Let's check users_raw to see if there is any user from another school.
  const { data: users, error: usersErr } = await adminClient
    .from('users_raw')
    .select('id, school_id, role');
  console.log('All users in users_raw:', users);

  // Insert event in school-1
  await adminClient.from('campus_events').delete().eq('id', eventId);
  await adminClient.from('campus_events').insert({
    id: eventId,
    school_id: '11111111-1111-1111-1111-111111111111', // school-1
    title: 'School 1 Event',
    event_date: '2026-05-12',
    start_time: '17:00',
    category: 'Konzert',
    visibility: 'teachers'
  });

  // Query as student-1 (school-1)
  const student1Client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        'x-user-id': '33333333-3333-3333-3333-333333333331' // student-1 (school-1)
      }
    }
  });
  const { data: s1Data } = await student1Client.from('campus_events').select('id').eq('id', eventId);
  console.log('S1 (same school) can see event:', s1Data?.length > 0);

  // Query as anonymous (no headers)
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: anonData } = await anonClient.from('campus_events').select('id').eq('id', eventId);
  console.log('Anon can see event:', anonData?.length > 0);

  // Cleanup
  await adminClient.from('campus_events').delete().eq('id', eventId);
}

run().catch(console.error);
