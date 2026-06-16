import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing env');
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-user-id': '44444444-4444-4444-4444-444444444442', // secretary-1
      'x-bypass-forcing': 'true'
    }
  }
});

async function run() {
  const ppId = crypto.randomUUID();
  
  // Clean up
  await client.from('campus_events').delete().eq('id', '55555555-5555-5555-5555-555555555555');
  await client.from('campus_events').insert({
    id: '55555555-5555-5555-5555-555555555555',
    school_id: '11111111-1111-1111-1111-111111111111',
    title: 'Summer Festival 2026',
    event_date: '2026-07-01',
    start_time: '14:00',
    end_time: '18:00',
    category: 'Konzert',
    created_by: '44444444-4444-4444-4444-444444444441',
    is_public: true,
    visibility: 'all'
  });

  console.log('Inserting program point with teacher-1...');
  const res1 = await client.from('campus_event_program_points').insert({
    id: ppId,
    event_id: '55555555-5555-5555-5555-555555555555',
    school_id: '11111111-1111-1111-1111-111111111111',
    teacher_id: '22222222-2222-2222-2222-222222222221', // teacher-1
    name: 'Act to Feedback',
    duration: 12,
    additional_feedback_responses: {
      status: 'pending',
      questions: ['What gear?'],
      answers: []
    }
  });

  console.log('Insert response:', res1);

  // Set user as teacher-1
  const teacherClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        'x-user-id': '22222222-2222-2222-2222-222222222221', // teacher-1
        'x-bypass-forcing': 'true'
      }
    }
  });

  console.log('Updating as teacher...');
  const res2 = await teacherClient.from('campus_event_program_points').update({
    additional_feedback_responses: {
      status: 'responded',
      questions: ['What gear?'],
      answers: []
    }
  }).eq('id', ppId);

  console.log('Update response:', res2);
}

run().catch(console.error);
