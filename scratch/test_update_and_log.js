const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const actualAnonKeyNew = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const userId = '97e73f5d-b6d6-47d5-bb47-18ad02bae725'; // Manuel Wagner (Admin)
const studentId = '64e54fef-e644-43cc-8071-eac432bb7fee'; // A student

const supabase = createClient(supabaseUrl, actualAnonKeyNew, {
  global: {
    headers: {
      'x-user-id': userId
    }
  }
});

async function runTest() {
  console.log(`1. Updating student ${studentId} lesson_duration to 60 Min...`);
  const { error: updateError } = await supabase
    .from('users')
    .update({ lesson_duration: 60 })
    .eq('id', studentId);
    
  if (updateError) {
    console.error('Update failed:', updateError);
    return;
  }
  console.log('Update succeeded.');
  
  console.log('2. Fetching the latest audit log...');
  const { data: logs, error: logsError } = await supabase
    .from('audit_logs')
    .select(`
      id,
      changed_by,
      table_name,
      action,
      record_id,
      old_data,
      new_data,
      created_at,
      users (
        first_name,
        last_name
      )
    `)
    .order('created_at', { ascending: false })
    .limit(1);
    
  if (logsError) {
    console.error('Fetching logs failed:', logsError);
    return;
  }
  
  console.log(JSON.stringify(logs, null, 2));
  
  // Clean up: set duration back to 45
  console.log('3. Restoring student lesson_duration to 45 Min...');
  await supabase
    .from('users')
    .update({ lesson_duration: 45 })
    .eq('id', studentId);
  console.log('Cleanup succeeded.');
}

runTest();
