import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testHelpRequest() {
  const { data: user } = await supabase.from('users').select('id').limit(1).single();
  if (!user) return console.log('No user found');
  
  console.log('Testing help_request insert for user:', user.id);
  const { error } = await supabase.from('help_requests').insert({
    user_id: user.id,
    status: 'pending',
    message: 'Test message'
  });
  
  if (error) {
    console.log('Insert error:', error.message);
    if (error.message.includes('message')) {
        console.log('Confirmed: column "message" does not exist.');
    }
  } else {
    console.log('Insert successful! "message" column exists.');
  }
}

testHelpRequest();
