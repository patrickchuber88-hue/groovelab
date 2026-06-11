import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

// Initialize Supabase with headers just like in lib/supabase.ts
const supabase = createClient(url, key, {
  global: {
    headers: {
      'x-user-id': '03564b1c-e2bb-4ccb-be95-b9fd1ef34829'
    }
  }
});

async function check() {
  const schoolId = '74713df2-6176-4a41-a8cd-9fbebe34e9b8';
  const startDateStr = '2026-06-08';
  const endDateStr = '2026-06-14';

  console.log("--- Querying room_bookings as Patrick Huber ---");
  const { data: dbBookingsData, error } = await supabase
    .from('room_bookings')
    .select(`
      id,
      room_id,
      date,
      start_time,
      end_time,
      title,
      booked_by,
      profiles:users!booked_by (
        first_name,
        last_name
      )
    `)
    .eq('school_id', schoolId)
    .gte('date', startDateStr)
    .lte('date', endDateStr);

  console.log("Error:", error);
  console.log("dbBookingsData:", JSON.stringify(dbBookingsData, null, 2));
}

check();
