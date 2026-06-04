const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRealRooms() {
  try {
    // 1. Get schools to find "Musik Bad Säckingen"
    const { data: schools, error: schoolErr } = await supabase.from('schools').select('*');
    if (schoolErr) throw schoolErr;
    console.log('--- SCHOOLS ---');
    console.log(schools.map(s => ({ id: s.id, name: s.name })));

    // Find the one containing "Säckingen"
    const sackingen = schools.find(s => s.name.toLowerCase().includes('säckingen'));
    if (!sackingen) {
      console.log('Musik Bad Säckingen not found!');
      return;
    }
    console.log('\nFound School ID:', sackingen.id);

    // 2. Get rooms for this school
    const { data: rooms, error: roomErr } = await supabase
      .from('rooms')
      .select('*')
      .eq('school_id', sackingen.id);
    if (roomErr) throw roomErr;
    console.log('\n--- ROOMS FOR SCHOOL ---');
    console.log(JSON.stringify(rooms.map(r => ({
      id: r.id,
      name: r.name,
      floor: r.floor,
      is_campus_active: r.is_campus_active,
      is_groovelab_active: r.is_groovelab_active
    })), null, 2));

  } catch (err) {
    console.error('Error:', err);
  }
}

checkRealRooms();
