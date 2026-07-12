import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5NTUzODQzLCJleHAiOjE5MzcyMzM4NDN9.NPFKhuj3WiiJ7pqG7w91QAEy1V696kfTcEunScUAAoI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
  const token = 'dfea617f-ecfa-4f41-89ea-e3d170a053d8'; // Sebastian Ambs
  console.log('Fetching user with qr_token:', token);
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, email, instrument, qr_token, photo_url, ausweis_id, ausweis_nummer')
    .eq('qr_token', token)
    .single();

  if (error) {
    console.error('Fetch failed with error:', error);
  } else {
    console.log('Fetch succeeded! User data:', data);
  }
}

testFetch();
