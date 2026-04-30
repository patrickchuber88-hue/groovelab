const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = Object.fromEntries(envContent.split('\n').filter(l => l.includes('=')).map(l => l.split('=')));

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const requiredTables = [
  'schools', 'users', 'rooms', 'stations', 'sessions', 'songs', 
  'user_song_skills', 'user_availability', 'jam_requests', 'friendships',
  'bands', 'band_members', 'band_gigs', 'band_media', 'band_song_proposals', 'band_proposal_votes'
];

async function checkTables() {
  console.log('--- 🛡️ Groovelab Database Integrity Check ---');
  const results = [];
  
  for (const table of requiredTables) {
    const { error } = await supabase.from(table).select('*').limit(0);
    if (error) {
      console.log(`❌ ${table}: ${error.message}`);
      results.push({ table, status: 'missing', error: error.message });
    } else {
      console.log(`✅ ${table}: Operational`);
      results.push({ table, status: 'ok' });
    }
  }
  
  fs.writeFileSync(path.join(__dirname, 'db_check_results.json'), JSON.stringify(results, null, 2));
}

checkTables();
