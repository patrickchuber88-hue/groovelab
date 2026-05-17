import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  const userId = 'c4fa4738-5964-4019-a17a-f94db52ada87'; // Schüler 3
  
  const { data: membershipsRes, error } = await supabase
    .from('band_members')
    .select('instrument, bands(id, name, school_id, song_id, status, photo_url, songs(*), band_songs(*, songs(*), band_song_slots(*)))')
    .eq('user_id', userId);
  
  console.log("Error:", error);
  console.log("Memberships with joined bands, songs and slots:", JSON.stringify(membershipsRes, null, 2));
}
test();
