const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const schoolId = '74713df2-6176-4a41-a8cd-9fbebe34e9b8';

async function test() {
  const { data: tStations, error } = await supabase
    .from('stations')
    .select('id, room_id, name, rooms!inner(school_id)')
    .eq('name', 'Lehrer iPad')
    .eq('rooms.school_id', schoolId);

  if (error) {
    console.error('Query error:', error);
  } else {
    console.log('Query success:', tStations);
  }
}

test();
