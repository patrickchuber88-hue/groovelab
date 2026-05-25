const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabase.178.105.10.2.sslip.io';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5NTUzODQzLCJleHAiOjE5MzcyMzM4NDN9.NPFKhuj3WiiJ7pqG7w91QAEy1V696kfTcEunScUAAoI';
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-user-id': '553bef93-a006-4aa9-92e6-58f83cff3570' // Patrick Huber teacher ID
    }
  }
});

async function run() {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: '553bef93-a006-4aa9-92e6-58f83cff3570',
      gps_verified: true,
      check_in_time: new Date().toISOString()
    })
    .select();

  console.log('INSERT RESULT:', data, 'Error:', error);
}

run();
