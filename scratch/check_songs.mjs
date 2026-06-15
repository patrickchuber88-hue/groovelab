import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSongs() {
  const { count, error } = await supabase
    .from('songs')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error("Error fetching songs:", error);
    return;
  }
  console.log("Total songs count:", count);

  const { data: sample } = await supabase
    .from('songs')
    .select('*')
    .limit(5);
  console.log("Sample songs:", sample);
}
checkSongs();
