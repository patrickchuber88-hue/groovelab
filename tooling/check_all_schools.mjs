import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5NTUzODQzLCJleHAiOjE5MzcyMzM4NDN9.NPFKhuj3WiiJ7pqG7w91QAEy1V696kfTcEunScUAAoI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllSchools() {
  console.log('Fetching all schools...');
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
