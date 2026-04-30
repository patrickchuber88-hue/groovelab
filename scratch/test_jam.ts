import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testJamRequest() {
  const { data: user } = await supabase.from('users').select('id').limit(1).single();
  if (!user) return console.log('No user found');
  
  console.log('Testing jam_requests insert for user:', user.id);
  // Try a minimal insert
  const { error } = await supabase.from('jam_requests').insert({
    user_id: user.id
  });
  
  if (error) {
    console.log('Insert error:', error.message);
  } else {
    console.log('Insert successful! Minimal columns: user_id');
  }
}

testJamRequest();
