import dns from 'dns';
const originalLookup = dns.lookup;
dns.lookup = function(hostname, options, callback) {
  let cb = callback;
  let opts = options;
  if (typeof options === 'function') {
    cb = options;
    opts = {};
  }
  if (hostname === 'supabase.campus-groovelab.de') {
    if (opts.all) {
      return cb(null, [{ address: '178.105.10.2', family: 4 }]);
    }
    return cb(null, '178.105.10.2', 4);
  }
  return originalLookup.call(dns, hostname, options, cb);
};

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = 'https://supabase.campus-groovelab.de';
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const supabase = createClient(url, key);

async function run() {
  const studentId = '0f22f0ba-df3c-457e-b600-7c4c2bce745c';
  
  // 1. Get student info
  const { data: student, error: studentError } = await supabase
    .from('users')
    .select('id, first_name, last_name, teacher_id')
    .eq('id', studentId)
    .single();
    
  if (studentError) {
    console.error('Error fetching student:', studentError);
    return;
  }
  
  console.log(`Student: ${student.first_name} ${student.last_name}`);
  console.log(`Teacher ID: ${student.teacher_id}`);
  
  // Get teacher info
  if (student.teacher_id) {
    const { data: teacher, error: teacherError } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('id', student.teacher_id)
      .single();
      
    if (teacherError) {
      console.error('Error fetching teacher:', teacherError);
    } else {
      console.log(`Teacher: ${teacher.first_name} ${teacher.last_name}`);
    }
    
    // Fetch teacher's catalog (songs where teacher_id matches or similar)
    // Wait, let's see songs table structure
    const { data: teacherSongs, error: tsError } = await supabase
      .from('songs')
      .select('id, title, artist, teacher_id')
      .eq('teacher_id', student.teacher_id);
      
    if (tsError) {
      console.error('Error fetching teacher songs:', tsError);
    } else {
      console.log(`Teacher has ${teacherSongs.length} songs in catalog:`);
      teacherSongs.forEach(s => {
        console.log(`- ID: ${s.id}, Title: ${s.title}, Artist: ${s.artist}`);
      });
    }
  }
  
  // 2. Fetch all user_song_skills for this student
  const { data: skills, error: skillsError } = await supabase
    .from('user_song_skills')
    .select('id, song_id, progress_percent, is_stage_ready, songs(id, title, artist, teacher_id)')
    .eq('user_id', studentId);
    
  if (skillsError) {
    console.error('Error fetching skills:', skillsError);
    return;
  }
  
  console.log(`\nCurrent user_song_skills (${skills.length}):`);
  const skillsToDelete = [];
  skills.forEach(s => {
    console.log(`- SkillID: ${s.id}, SongID: ${s.song_id}, Title: ${s.songs?.title}, Artist: ${s.songs?.artist}, Teacher ID: ${s.songs?.teacher_id}`);
    if (s.songs?.title?.toLowerCase() === 'test') {
      skillsToDelete.push(s.id);
    }
  });

  if (skillsToDelete.length > 0) {
    console.log(`\nDeleting ${skillsToDelete.length} test song skill entries...`);
    const { error: deleteError } = await supabase
      .from('user_song_skills')
      .delete()
      .in('id', skillsToDelete);

    if (deleteError) {
      console.error('Error deleting song skills:', deleteError);
    } else {
      console.log('Successfully deleted test song skills!');
    }
  } else {
    console.log('No test song skills found to delete.');
  }
}

run();
