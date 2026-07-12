import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5NTUzODQzLCJleHAiOjE5MzcyMzM4NDN9.NPFKhuj3WiiJ7pqG7w91QAEy1V696kfTcEunScUAAoI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
  const schoolId = '74713df2-6176-4a41-a8cd-9fbebe34e9b8';
  console.log('Fetching school with anon client:', schoolId);
  const { data, error } = await supabase
    .from('schools')
    .select('name, city')
    .eq('id', schoolId)
    .single();

  if (error) {
    console.error('Fetch failed with error:', error);
  } else {
    console.log('Fetch succeeded! School data:', data);
  }
}

testFetch();
