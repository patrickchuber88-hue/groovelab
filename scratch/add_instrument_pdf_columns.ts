import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function addInstrumentPdfColumns() {
  const sql = `
    ALTER TABLE songs ADD COLUMN IF NOT EXISTS pdf_drums_url TEXT;
    ALTER TABLE songs ADD COLUMN IF NOT EXISTS pdf_guitar_url TEXT;
    ALTER TABLE songs ADD COLUMN IF NOT EXISTS pdf_bass_url TEXT;
    ALTER TABLE songs ADD COLUMN IF NOT EXISTS pdf_vocals_url TEXT;
    ALTER TABLE songs ADD COLUMN IF NOT EXISTS pdf_keys_url TEXT;
  `;
  
  console.log('Sending SQL migration to Supabase...');
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
  
  if (error) {
    console.error('❌ Error executing migration SQL:', error);
  } else {
    console.log('✅ Instrument PDF columns added successfully to songs table!');
  }
}

addInstrumentPdfColumns();
