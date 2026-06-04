import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: rooms, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('school_id', '74713df2-6176-4a41-a8cd-9fbebe34e9b8');
  console.log('Rooms:', rooms.map(r => r.name));
  console.log('Error:', error);
}

run();
