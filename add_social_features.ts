
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://msyxlqljswpertszbotf.supabase.co';
const supabaseKey = 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function addSocialFeatures() {
  console.log('Adding Social & Planning features to database...');
  
  const sql = `
    -- 1. Ensure previous columns exist
    ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS bands JSONB DEFAULT '[]';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS projects JSONB DEFAULT '[]';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS gear TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS listening TEXT;

    -- 2. Availability Table (Lieblingszeiten)
    CREATE TABLE IF NOT EXISTS user_availability (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
      time_slot TEXT, -- e.g., "16:00"
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, day_of_week, time_slot)
    );

    -- 3. Jam Requests (Strukturierte Kommunikation)
    CREATE TABLE IF NOT EXISTS jam_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
      message TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Disable RLS for MVP
    ALTER TABLE user_availability DISABLE ROW LEVEL SECURITY;
    ALTER TABLE jam_requests DISABLE ROW LEVEL SECURITY;
  `;
  
  const { error } = await supabase.rpc('execute_sql', { sql_query: sql });
  
  if (error) {
    console.error('Error adding social features:', error.message);
    console.log('\n--- MANUAL SQL ---');
    console.log('Please run this in Supabase SQL Editor:');
    console.log(sql);
    console.log('------------------\n');
  } else {
    console.log('✅ Social & Planning features added successfully!');
  }
}

addSocialFeatures();
