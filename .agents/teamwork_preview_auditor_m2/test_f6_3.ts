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
  const eventId = crypto.randomUUID();
  
  await client.from('campus_events').insert({
    id: eventId,
    school_id: '11111111-1111-1111-1111-111111111111',
    title: 'Timeline Concert 3',
    event_date: '2026-07-10',
    start_time: '15:00',
    category: 'Konzert'
  });

  const resInsert = await client.from('campus_event_program_points').insert([
    { event_id: eventId, school_id: '11111111-1111-1111-1111-111111111111', name: 'Act 1', duration: 10, stage_number: 1, sort_order: 1, status: 'approved' },
    { event_id: eventId, school_id: '11111111-1111-1111-1111-111111111111', name: 'Pause 1', duration: 5, stage_number: 1, sort_order: 2, is_pause: true, status: 'approved' },
    { event_id: eventId, school_id: '11111111-1111-1111-1111-111111111111', name: 'Act 2', duration: 15, stage_number: 1, sort_order: 3, status: 'approved' }
  ]);
  
  console.log('Insert response:', resInsert);

  const { data, error } = await client.from('campus_event_program_points').select('*').eq('event_id', eventId).eq('stage_number', 1).order('sort_order', { ascending: true });
  console.log('Select results:', data, 'Error:', error);

  // Cleanup
  await client.from('campus_events').delete().eq('id', eventId);
}

run().catch(console.error);
