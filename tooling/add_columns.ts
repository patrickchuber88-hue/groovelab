
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function addColumns() {
  const sql = `
    ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS musical_style TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS musical_styles JSONB DEFAULT '[]';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS equipment TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS equipment_list JSONB DEFAULT '[]';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS wish_song TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS teacher_notes TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_id TEXT;
  `;
  
  const { error } = await supabase.rpc('execute_sql', { sql_query: sql });
  
  if (error) console.error('Error adding columns:', error);
  else console.log('Columns added successfully');
}

addColumns();
