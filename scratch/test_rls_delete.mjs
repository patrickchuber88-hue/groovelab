import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(...*|.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

// Create client simulating Patrick Huber (teacher)
const supabase = createClient(url, key, {
  global: {
    headers: {
      'x-user-id': '03564b1c-e2bb-4ccb-be95-b9fd1ef34829'
    }
  }
});

async function run() {
  const schoolId = '74713df2-6176-4a41-a8cd-9fbebe34e9b8';
  const roomId = 'bf7d1660-fb03-48a7-a51e-9a6e6a1c48c9';
  const teacherId = '03564b1c-e2bb-4ccb-be95-b9fd1ef34829';
  
  console.log("1. Creating a temporary room booking...");
  const { data: rb, error: rbErr } = await supabase
    .from('room_bookings')
    .insert({
      school_id: schoolId,
      room_id: roomId,
      booked_by: teacherId,
      date: '2026-06-12',
      start_time: '12:00:00',
      end_time: '13:00:00',
      title: 'RLS TEST BOOKING'
    })
    .select()
    .single();
    
  if (rbErr) {
    console.error("Create booking failed:", rbErr);
    return;
  }
  console.log("Created booking:", rb.id);

  console.log("2. Creating a temporary schedule occurrence...");
  const { data: occ, error: occErr } = await supabase
    .from('schedule_occurrences')
    .insert({
      student_id: 'f7f83cc3-6900-4388-8290-a4d99a9fb383', // some student
      teacher_id: teacherId,
      date: '2026-06-12',
      start_time: '12:00:00',
      duration: 60,
      status: 'scheduled'
    })
    .select()
    .single();

  if (occErr) {
    console.error("Create occurrence failed:", occErr);
    // clean up booking
    await supabase.from('room_bookings').delete().eq('id', rb.id);
    return;
  }
  console.log("Created occurrence:", occ.id);

  console.log("3. Testing deletion of schedule occurrence as teacher...");
  const { error: delOccErr } = await supabase
    .from('schedule_occurrences')
    .delete()
    .eq('id', occ.id);
  console.log("Delete occurrence error:", delOccErr);

  console.log("4. Testing deletion of room booking as teacher...");
  const { error: delRbErr } = await supabase
    .from('room_bookings')
    .delete()
    .eq('id', rb.id);
  console.log("Delete room booking error:", delRbErr);
}

run();
