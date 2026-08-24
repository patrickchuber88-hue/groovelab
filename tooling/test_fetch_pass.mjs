import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.campus-groovelab.de';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

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
