
import { createClient } from '@supabase/supabase-js';

// Local self-hosted database settings
const supabaseUrl = 'https://supabase.178.105.10.2.sslip.io';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5NTUzODQzLCJleHAiOjE5MzcyMzM4NDN9.NPFKhuj3WiiJ7pqG7w91QAEy1V696kfTcEunScUAAoI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addCoachColumns() {
  console.log('Adding coach and verification columns to database...');
  
  const sql = `
    -- Add coach columns to bands
    ALTER TABLE bands ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES users(id);
    ALTER TABLE bands ADD COLUMN IF NOT EXISTS coach_is_manual BOOLEAN DEFAULT false;
    
    -- Add verification column to user_song_skills
    ALTER TABLE user_song_skills ADD COLUMN IF NOT EXISTS verified_by_id UUID REFERENCES users(id);
    
    -- Refresh schema cache notice (optional but helps)
    COMMENT ON TABLE bands IS 'Updated with coach columns';
  `;
  
  // This requires the 'execute_sql' RPC
  const { error } = await supabase.rpc('execute_sql', { sql_query: sql });
  
  if (error) {
    console.error('Error adding columns via RPC:', error.message);
    console.log('\n--- MANUAL ACTION REQUIRED ---');
    console.log('Please copy and run the following SQL in your Database SQL Editor:');
    console.log(sql);
    console.log('------------------------------\n');
  } else {
    console.log('✅ Columns added successfully!');
  }
}

addCoachColumns();
