import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://msyxlqljswpertszbotf.supabase.co';
const supabaseAnonKey = 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkMatchingState() {
  try {
    const { data: songs, error: songErr } = await supabase
      .from('songs')
      .select('*')
      .ilike('title', 'Over Each Other');
      
    if (songErr) throw songErr;
    console.log('--- SONGS ---');
    console.log(JSON.stringify(songs, null, 2));

    if (!songs || songs.length === 0) {
      console.log('No song found.');
      return;
    }

    const songId = songs[0].id;
    const schoolId = songs[0].school_id;

    // Fetch forming/active bands in this school
    const { data: bands, error: bandsErr } = await supabase
      .from('bands')
      .select('*, band_members(*, profiles:users(id, first_name, last_name, photo_url)), band_songs(*, band_song_slots(*, profiles:users!user_id(id, first_name, photo_url)))')
      .eq('school_id', schoolId);

    if (bandsErr) throw bandsErr;
    console.log('\n--- ALL BANDS IN SCHOOL ---');
    console.log(JSON.stringify((bands || []).map(b => ({
      id: b.id,
      name: b.name,
      status: b.status,
      band_members: (b.band_members || []).map(bm => ({
        user_id: bm.user_id,
        name: bm.profiles?.first_name,
        instrument: bm.instrument
      })),
      band_songs: (b.band_songs || []).map(bs => ({
        id: bs.id,
        song_id: bs.song_id,
        status: bs.status,
        slots: (bs.band_song_slots || []).map(s => ({
          user_id: s.user_id,
          name: s.profiles?.first_name,
          instrument: s.instrument,
          status: s.status
        }))
      }))
    })), null, 2));

    // Fetch user song skills for this song
    const { data: skills, error: skillsErr } = await supabase
      .from('user_song_skills')
      .select('*, profiles:users!user_song_skills_user_id_fkey(*)')
      .eq('song_id', songId);

    if (skillsErr) throw skillsErr;
    console.log('\n--- USER SONG SKILLS for Over Each Other ---');
    const masteredSkills = (skills || []).filter(s => s.is_stage_ready || (s.progress_percent || 0) >= 100);
    console.log(JSON.stringify(masteredSkills.map(s => ({
      id: s.id,
      user_id: s.user_id,
      first_name: s.profiles?.first_name,
      instrument: s.instrument,
      progress: s.progress_percent,
      is_ready: s.is_stage_ready,
      formation_group: s.formation_group
    })), null, 2));

  } catch (err) {
    console.error('Error:', err);
  }
}

checkMatchingState();
