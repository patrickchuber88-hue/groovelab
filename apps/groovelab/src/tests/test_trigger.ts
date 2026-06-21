import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, '.env.local') });
dotenv.config({ path: path.resolve(cwd, 'apps/groovelab/.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

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
  'lesson-1': '66666666-6666-6666-6666-666666666661',
  'lesson-2': '66666666-6666-6666-6666-666666666662',
  'lesson-3': '66666666-6666-6666-6666-666666666663',
  'pp-tie-a': '77777777-7777-7777-7777-777777777771',
  'pp-tie-b': '77777777-7777-7777-7777-777777777772',
};

function getClient(userId: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: async (input, init) => {
        let url = typeof input === 'string' ? input : (input as any).url;
        for (const [mockId, uuidVal] of Object.entries(idMap)) {
          url = url.split(mockId).join(uuidVal);
        }

        const headers = new Headers(init?.headers);
        headers.set('x-user-id', idMap[userId] || userId);

        let body = init?.body;
        if (body && typeof body === 'string') {
          for (const [mockId, uuidVal] of Object.entries(idMap)) {
            body = body.split(mockId).join(uuidVal);
          }
        }

        const response = await fetch(url, { ...init, headers, body });
        return response;
      }
    }
  });
}

async function main() {
  const adminClient = getClient('admin-1');
  const teacherClient = getClient('teacher-1');

  // Let's delete existing event and recreate it
  console.log('Cleaning up...');
  await adminClient.from('campus_events').delete().eq('id', 'event-1');
  const { error: eventErr } = await adminClient.from('campus_events').insert({
    id: 'event-1',
    school_id: 'school-1',
    title: 'Summer Festival 2026',
    event_date: '2026-07-01',
    start_time: '14:00',
    end_time: '18:00',
    category: 'Konzert',
    created_by: 'admin-1',
    is_public: true,
    visibility: 'all'
  });
  if (eventErr) console.error('Event insert error:', eventErr);

  console.log('Inserting program point as teacher-1...');
  const ppId = '77777777-7777-7777-7777-777777777773';
  const { data: insData, error: insErr } = await teacherClient.from('campus_event_program_points').insert({
    id: ppId,
    event_id: 'event-1',
    school_id: 'school-1',
    name: 'Teacher Act 1',
    duration: 10
  }).select();

  console.log('Insert response:', insData, insErr);

  console.log('Selecting program point as teacher-1...');
  const { data: selData, error: selErr } = await teacherClient.from('campus_event_program_points').select('*').eq('id', ppId);
  console.log('Select response:', selData, selErr);

  console.log('Updating is_scheduled as teacher-1...');
  const { data: updData, error: updErr } = await teacherClient.from('campus_event_program_points').update({
    is_scheduled: true
  }).eq('id', ppId).select();

  console.log('Update response:', updData, updErr);
}

main().catch(console.error);
