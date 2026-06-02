import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  // Magdalena Woldert details
  const student = {
    id: "7ecf29bc-b580-4974-9387-1eae9ac90515",
    school_id: "74713df2-6176-4a41-a8cd-9fbebe34e9b8",
    teacher_id: "03564b1c-e2bb-4ccb-be95-b9fd1ef34829" // Patrick Huber
  };

  console.log(`Verifying queries for student Magdalena Woldert (school_id: ${student.school_id}, teacher_id: ${student.teacher_id})...`);

  // Query 1: Wall Query
  const { data: wallSongs, error: wallError } = await supabase
    .from('songs')
    .select('id, title, artist, teacher_id, is_groovelab_active')
    .eq('school_id', student.school_id)
    .eq('is_groovelab_active', true)
    .eq('teacher_id', student.teacher_id);

  if (wallError) {
    console.error("Wall Query Error:", wallError);
  } else {
    console.log("Wall Query Success! Songs count returned:", wallSongs.length);
    console.log("Returned songs:", wallSongs);
  }

  // Query 2: Songs List Query
  const { data: songsList, error: listError } = await supabase
    .from('songs')
    .select('id, title, artist, teacher_id, is_groovelab_active')
    .eq('school_id', student.school_id)
    .eq('is_groovelab_active', true)
    .eq('teacher_id', student.teacher_id)
    .order('level')
    .order('artist');

  if (listError) {
    console.error("Songs List Query Error:", listError);
  } else {
    console.log("Songs List Query Success! Songs count returned:", songsList.length);
    console.log("Returned songs:", songsList);
  }
}

run();
