const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const userId = '54cd24f7-0b5f-4607-9f8c-9b1c97b2846f';
const finalStationId = 'd5c40252-09a9-4530-b5cb-75907231a487';

async function test() {
  const now = new Date().toISOString();
  console.log('Inserting test session...');
  const { data: sess, error: sessErr } = await supabase
    .from('sessions')
    .insert({
      user_id: userId,
      station_id: finalStationId,
      gps_verified: true,
      check_in_time: now
    })
    .select()
    .single();

  if (sessErr) {
    console.error('Session insert error:', sessErr);
  } else {
    console.log('Session insert success:', sess);
    // clean it up
    await supabase.from('sessions').delete().eq('id', sess.id);
  }
}

test();
