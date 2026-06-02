import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.178.105.10.2.sslip.io';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5NTUzODQzLCJleHAiOjE5MzcyMzM4NDN9.NPFKhuj3WiiJ7pqG7w91QAEy1V696kfTcEunScUAAoI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyMigration() {
  try {
    // Test: Try to read is_observer from any user
    const { data, error } = await supabase
      .from('users')
      .select('id, first_name, is_observer')
      .in('role', ['teacher', 'admin'])
      .limit(5);

    if (error) {
      if (error.message.includes('is_observer')) {
        console.log('Column is_observer does NOT exist yet. Please run the SQL migration manually in your database:');
        console.log('\nSQL to run:');
        console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_observer BOOLEAN DEFAULT false;');
      } else {
        console.error('Unexpected error:', error);
      }
    } else {
      console.log('✅ Column is_observer already exists!');
      console.log('Teachers:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

applyMigration();
