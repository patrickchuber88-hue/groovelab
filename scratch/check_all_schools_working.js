import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllSchools() {
  console.log('Fetching all schools from production Supabase...');
  const { data, error } = await supabase
    .from('schools')
    .select('*');

  if (error) {
    console.error('Fetch failed:', error);
  } else {
    data.forEach(s => {
      console.log(`- School ID: ${s.id}, Name: "${s.name}", City: "${s.city}"`);
    });
  }
}

checkAllSchools();
