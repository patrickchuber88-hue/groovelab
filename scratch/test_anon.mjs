import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function check() {
  const tables = [
    'schools',
    'users',
    'rooms',
    'stations',
    'sessions',
    'exercises',
    'user_progress',
    'help_requests',
    'songs',
    'user_song_skills',
    'bands',
    'band_members',
    'band_songs',
    'band_song_slots',
    'band_gigs',
    'band_media',
    'band_song_proposals',
    'band_proposal_votes',
    'user_availability',
    'rejection_history',
    'lab_planning',
    'instruments',
    'room_instrument_compatibility',
    'avatars',
    'lehrwerke'
  ];

  console.log('=== Anonymous Access Check ===');
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(5);
    if (error) {
      console.log(`❌ ${table}: Error - ${error.message}`);
    } else {
      console.log(`⚠️ ${table}: SUCCESS - Fetched ${data.length} rows`);
      if (data.length > 0) {
        console.log(`   Sample keys: ${Object.keys(data[0]).join(', ')}`);
      }
    }
  }
}

check().catch(console.error);
