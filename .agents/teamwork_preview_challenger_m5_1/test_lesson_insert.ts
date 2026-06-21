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
  'student-1': '33333333-3333-3333-3333-333333333331',
  'secretary-1': '44444444-4444-4444-4444-444444444442',
};

const client = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-user-id': idMap['secretary-1']
    }
  }
});

async function run() {
  const lessonId = 'f19f187a-6415-4fa0-86ff-62e5b6fa13ab';
  // Delete first in case it exists
  await client.from('lessons').delete().eq('id', lessonId);

  console.log('Inserting lesson as secretary-1...');
  const res = await client.from('lessons').insert({
    id: lessonId,
    teacher_id: idMap['teacher-1'],
    student_id: idMap['student-1'],
    school_id: idMap['school-1'],
    date: '2026-07-01',
    start_time: '14:15',
    duration: 30,
    status: 'scheduled'
  });
  console.log('Insert result:', res);
}

run().catch(console.error);
