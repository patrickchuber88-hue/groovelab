import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-user-id': '44444444-4444-4444-4444-444444444441' // admin-1
    }
  }
});

async function runTest() {
  const eventId = '99999999-9999-9999-9999-999999999999';
  
  // Cleanup first
  await supabase.from('campus_events').delete().eq('id', eventId);

  const res = await supabase.from('campus_events').insert({
    id: eventId,
    school_id: '11111111-1111-1111-1111-111111111111',
    title: 'Test Event',
    event_date: '2026-07-01',
    start_time: '14:00',
    category: 'Konzert',
    visibility: 'teachers'
  });

  console.log('Insert response:', JSON.stringify(res));

  const resSelect = await supabase.from('campus_events').insert({
    id: '99999999-9999-9999-9999-999999999998',
    school_id: '11111111-1111-1111-1111-111111111111',
    title: 'Test Event 2',
    event_date: '2026-07-01',
    start_time: '14:00',
    category: 'Konzert',
    visibility: 'teachers'
  }).select();

  console.log('Insert with select response:', JSON.stringify(resSelect));

  // Cleanup
  await supabase.from('campus_events').delete().eq('id', eventId);
  await supabase.from('campus_events').delete().eq('id', '99999999-9999-9999-9999-999999999998');
}

runTest().catch(console.error);
