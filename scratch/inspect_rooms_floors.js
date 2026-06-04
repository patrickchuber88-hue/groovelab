import { createClient } from '@supabase/supabase-js';

const url = "https://supabase.campus-groovelab.de";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc";
const supabase = createClient(url, key);

async function run() {
  const { data: rooms, error } = await supabase
    .from('rooms')
    .select('id, name, floor, is_campus_active, is_groovelab_active');

  if (error) {
    console.error("Error fetching rooms:", error);
    return;
  }

  console.log(`=== ROOMS & FLOORS (${rooms.length}) ===`);
  for (const r of rooms) {
    console.log(`- Room: "${r.name}" | Floor: "${r.floor}" | Campus: ${r.is_campus_active} | GrooveLab: ${r.is_groovelab_active}`);
  }
}

run();
