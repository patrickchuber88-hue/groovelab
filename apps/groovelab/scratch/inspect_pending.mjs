import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      'x-qr-token': '7b8e1a2c-4d5f-6a7b-8c9d-0e1f2a3b4c5d'
    }
  }
});

async function inspect() {
  const { data: pending, error } = await supabase
    .from('pending_students_decrypted')
    .select('*');

  if (error) {
    console.error("Pending inspect error:", error);
  } else {
    console.log(`Found ${pending.length} pending students:`);
    pending.forEach(p => {
      console.log(`- ${p.first_name} ${p.last_name} (ID: ${p.id}): status=${p.status}`);
    });
  }

  const { data: act, error: actError } = await supabase
    .from('activation_days')
    .select('*');

  if (actError) {
    console.error("Activation days inspect error:", actError);
  } else {
    console.log(`Found ${act.length} activation days entries:`);
    act.forEach(a => {
      console.log(`- student_id: ${a.student_id}, day_of_birth: ${a.day_of_birth}`);
    });
  }
}

inspect();
