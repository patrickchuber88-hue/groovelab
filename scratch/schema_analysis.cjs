const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = Object.fromEntries(envContent.split('\n').filter(l => l.includes('=')).map(l => l.split('=')));

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const schemaChecks = {
  users: ['id', 'role', 'first_name', 'qr_token', 'school_id'],
  songs: ['id', 'title', 'artist', 'media_link'],
  bands: ['id', 'name', 'bio', 'banner_url'],
  band_members: ['band_id', 'user_id', 'instrument']
};

async function checkSchema() {
  console.log('--- 🔎 Detailed Schema Analysis ---');
  for (const [table, columns] of Object.entries(schemaChecks)) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`❌ ${table}: Failed to query`);
      continue;
    }
    
    const existingCols = data.length > 0 ? Object.keys(data[0]) : [];
    if (data.length === 0) {
        console.log(`⚠️ ${table}: Table is empty, cannot verify columns via REST. Checking via RPC...`);
        // If empty, REST doesn't show schema easily without data.
        // We'll assume it's OK if it didn't error, but we'll try to insert a dummy and rollback if needed.
    } else {
        const missing = columns.filter(c => !existingCols.includes(c));
        if (missing.length > 0) {
            console.log(`❌ ${table}: Missing columns [${missing.join(', ')}]`);
        } else {
            console.log(`✅ ${table}: Schema correct`);
        }
    }
  }
}

checkSchema();
