import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const userId = '55555555-5555-5555-5555-555555555555'; // Patrick Huber (Admin)
const schoolId = '11111111-1111-1111-1111-111111111111'; // School ID

async function runTests() {
  console.log('--- RUNNING LIVE LAB QUERIES VERIFICATION ---');

  // Query 1: update users last_seen
  console.log('Testing Q1: Update last_seen...');
  const { error: err1 } = await supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', userId);
  console.log('Q1 Status:', err1 ? `FAILED: ${err1.message}` : 'OK');

  // Query 2: band_members
  console.log('Testing Q2: band_members band_id...');
  const { error: err2 } = await supabase.from('band_members').select('band_id').eq('user_id', userId);
  console.log('Q2 Status:', err2 ? `FAILED: ${err2.message}` : 'OK');

  // Query 3: bands coach_id
  console.log('Testing Q3: bands coach_id...');
  const { error: err3 } = await supabase.from('bands').select('id').eq('coach_id', userId);
  console.log('Q3 Status:', err3 ? `FAILED: ${err3.message}` : 'OK');

  // Query 4: band_shoutbox
  console.log('Testing Q4: band_shoutbox...');
  const { error: err4 } = await supabase.from('band_shoutbox').select('*, users(first_name, photo_url), bands(name)').limit(1);
  console.log('Q4 Status:', err4 ? `FAILED: ${err4.message}` : 'OK');

  // Query 5: users single
  console.log('Testing Q5: users school join...');
  const { error: err5 } = await supabase.from('users').select('*, schools(*)').eq('id', userId).single();
  console.log('Q5 Status:', err5 ? `FAILED: ${err5.message}` : 'OK');

  // Query 6: rooms school_id
  console.log('Testing Q6: rooms school_id...');
  const { error: err6 } = await supabase.from('rooms').select('id').eq('school_id', schoolId);
  console.log('Q6 Status:', err6 ? `FAILED: ${err6.message}` : 'OK');

  // Query 7: stations
  console.log('Testing Q7: stations...');
  const { error: err7 } = await supabase.from('stations').select('*').limit(1);
  console.log('Q7 Status:', err7 ? `FAILED: ${err7.message}` : 'OK');

  // Query 8: sessions
  console.log('Testing Q8: sessions user join...');
  const { error: err8 } = await supabase.from('sessions').select('*, users!inner(*), stations(*)').is('check_out_time', null);
  console.log('Q8 Status:', err8 ? `FAILED: ${err8.message}` : 'OK');

  // Query 9: allCoaches
  console.log('Testing Q9: allCoaches...');
  const { error: err9 } = await supabase.from('users').select('*').in('role', ['teacher', 'admin']).eq('school_id', schoolId);
  console.log('Q9 Status:', err9 ? `FAILED: ${err9.message}` : 'OK');

  // Query 10: user_song_skills pending
  console.log('Testing Q10: user_song_skills users join...');
  const { error: err10 } = await supabase.from('user_song_skills').select('*, users!user_id(*), songs(*)').eq('is_pending_approval', true);
  console.log('Q10 Status:', err10 ? `FAILED: ${err10.message}` : 'OK');

  // Query 11: bands nested members/songs
  console.log('Testing Q11: bands nested members/songs...');
  const { error: err11 } = await supabase.from('bands').select('*, band_members(*, users(*)), band_songs(songs(*))').eq('school_id', schoolId).order('name');
  console.log('Q11 Status:', err11 ? `FAILED: ${err11.message}` : 'OK');

  // Query 12: allStudents
  console.log('Testing Q12: allStudents...');
  const { error: err12 } = await supabase.from('users').select('*').eq('school_id', schoolId).eq('role', 'student').order('first_name');
  console.log('Q12 Status:', err12 ? `FAILED: ${err12.message}` : 'OK');

  // Query 13: helpRequests
  console.log('Testing Q13: helpRequests...');
  const { error: err13 } = await supabase.from('help_requests').select('*, users(*)').eq('school_id', schoolId).eq('status', 'pending');
  console.log('Q13 Status:', err13 ? `FAILED: ${err13.message}` : 'OK');

  // Query 14: songs with band_song_slots
  console.log('Testing Q14: songs with band_song_slots...');
  const { error: err14 } = await supabase
    .from('songs')
    .select(`
      id, title, artist, difficulty_level, instrumentation,
      band_song_slots(
        id, is_locked, instrument, part_number,
        user_id,
        users!band_song_slots_user_id_fkey(
          id, first_name, last_name, photo_url, role, school_id, created_at, birth_date
        )
      )
    `)
    .limit(1);
  console.log('Q14 Status:', err14 ? `FAILED: ${err14.message}` : 'OK');

  // Query 15: band_song_slots users fkey
  console.log('Testing Q15: band_song_slots users fkey...');
  const { error: err15 } = await supabase
    .from('band_song_slots')
    .select(`
      *,
      songs(id, title, artist),
      bands(id, name, school_id),
      users!band_song_slots_user_id_fkey(
        id, first_name, last_name, photo_url, role, school_id, created_at, birth_date
      )
    `)
    .limit(1);
  console.log('Q15 Status:', err15 ? `FAILED: ${err15.message}` : 'OK');
}

runTests();
