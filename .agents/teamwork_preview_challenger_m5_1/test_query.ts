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
  'lesson-1': '66666666-6666-6666-6666-666666666661',
  'lesson-2': '66666666-6666-6666-6666-666666666662',
  'lesson-3': '66666666-6666-6666-6666-666666666663',
  'pp-tie-a': '77777777-7777-7777-7777-777777777771',
  'pp-tie-b': '77777777-7777-7777-7777-777777777772',
};

const reverseIdMap = Object.entries(idMap).reduce((acc, [k, v]) => ({ ...acc, [v]: k }), {} as Record<string, string>);

const client = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: async (input, init) => {
      let url = typeof input === 'string' ? input : (input as any).url;
      for (const [mockId, uuidVal] of Object.entries(idMap)) {
        url = url.split(mockId).join(uuidVal);
      }

      const headers = new Headers(init?.headers);
      // Simulate admin-1
      headers.set('x-user-id', idMap['admin-1']);

      console.log('Fetching URL:', url);
      console.log('Headers x-user-id:', headers.get('x-user-id'));

      const response = await fetch(url, { ...init, headers });
      const text = await response.text();
      console.log('Raw response text:', text);

      let translatedText = text;
      for (const [uuidVal, mockId] of Object.entries(reverseIdMap)) {
        translatedText = translatedText.split(uuidVal).join(mockId);
      }

      return new Response(translatedText, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    }
  }
});

async function run() {
  const { data, error } = await client.from('campus_events').select('*').eq('school_id', 'school-1');
  console.log('Query result:', data, 'Error:', error);
}

run().catch(console.error);
