import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://msyxlqljswpertszbotf.supabase.co';
const supabaseAnonKey = 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';

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
        console.log('Column is_observer does NOT exist yet. Please run the SQL migration manually in Supabase Dashboard:');
        console.log('\nSQL to run:');
        console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_observer BOOLEAN DEFAULT false;');
        console.log('\nGo to: https://supabase.com/dashboard/project/msyxlqljswpertszbotf/sql/new');
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
