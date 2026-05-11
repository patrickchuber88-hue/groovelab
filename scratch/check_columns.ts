import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking band_songs columns...');
  
  const { data, error } = await supabase.from('band_songs').select('*').limit(1);
  if (error) {
    console.error('Error fetching band_songs:', error);
  } else {
    console.log('Columns in band_songs:', data.length > 0 ? Object.keys(data[0]) : 'No data');
  }

  const { data: bands, error: bandErr } = await supabase.from('bands').select('*').limit(1);
  if (bandErr) {
    console.error('Error fetching bands:', bandErr);
  } else {
    console.log('Columns in bands:', bands.length > 0 ? Object.keys(bands[0]) : 'No data');
  }
}

check();
