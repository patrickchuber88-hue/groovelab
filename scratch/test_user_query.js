const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const actualAnonKeyNew = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

// Let's test with Manuel Wagner's ID
const loggedInUserId = '97e73f5d-b6d6-47d5-bb47-18ad02bae725';

const supabase = createClient(supabaseUrl, actualAnonKeyNew, {
  global: {
    headers: {
      'x-user-id': loggedInUserId
    }
  }
});

async function run() {
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', loggedInUserId)
    .single();
    
  if (error) {
    console.error('Error fetching own role:', error);
  } else {
    console.log('Success own role:', data);
  }
  
  // Let's also test reading another student to make sure we can read them too
  const { data: studentData, error: studentError } = await supabase
    .from('users')
    .select('role')
    .eq('id', '64e54fef-e644-43cc-8071-eac432bb7fee')
    .single();
    
  if (studentError) {
    console.error('Error fetching student role:', studentError);
  } else {
    console.log('Success student role:', studentData);
  }
}

run();
