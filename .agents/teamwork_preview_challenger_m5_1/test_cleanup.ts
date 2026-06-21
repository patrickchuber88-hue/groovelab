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

const idMap: Record<string, string> = {
  'school-1': '11111111-1111-1111-1111-111111111111',
  'teacher-1': '22222222-2222-2222-2222-222222222221',
  'teacher-2': '22222222-2222-2222-2222-222222222222',
  'student-1': '33333333-3333-3333-3333-333333333331',
  'student-2': '33333333-3333-3333-3333-333333333332',
  'admin-1': '44444444-4444-4444-4444-444444444441',
  'secretary-1': '44444444-4444-4444-4444-444444444442',
  'master-1': '99999999-9999-9999-9999-999999999999',
  'event-1': '55555555-5555-5555-5555-555555555555',
};

const client = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-user-id': idMap['admin-1']
    }
  }
});

async function run() {
  console.log('Running delete...');
  const deleteResult = await client.from('campus_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Delete result:', deleteResult);

  console.log('Running insert...');
  const insertResult = await client.from('campus_events').insert({
    id: idMap['event-1'],
    school_id: idMap['school-1'],
    title: 'Summer Festival 2026',
    event_date: '2026-07-01',
    start_time: '14:00',
    end_time: '18:00',
    category: 'Konzert',
    created_by: idMap['admin-1'],
    is_public: true,
    visibility: 'all'
  });
  console.log('Insert result:', insertResult);
}

run().catch(console.error);
