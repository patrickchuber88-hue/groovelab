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
  const { data: users, error } = await supabase
    .from('users')
    .select('id, role, first_name, last_name, school_id');

  if (error) {
    console.error("Inspect error:", error);
    return;
  }

  console.log(`Found ${users.length} total users:`);
  users.forEach((s) => {
    console.log(`- ${s.first_name} ${s.last_name} (ID: ${s.id}): Role=${s.role}, school_id=${s.school_id}`);
  });
}

inspect();
