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

async function reset() {
  console.log("Setting all students to inactive (is_campus_active=false, is_groovelab_active=false, activated_at=null)...");
  
  const { error } = await supabase
    .from('users')
    .update({
      is_campus_active: false,
      is_groovelab_active: false,
      activated_at: null
    })
    .eq('role', 'student');

  if (error) {
    console.error("Reset error:", error);
  } else {
    console.log("Student activations successfully reset in the database.");
  }
  
  console.log("Fetching all schools to reset billing status...");
  const { data: schools, error: selectError } = await supabase
    .from('schools')
    .select('id, name');
    
  if (selectError) {
    console.error("Error selecting schools:", selectError);
    return;
  }
  
  for (const school of schools) {
    console.log(`Resetting billing status for school: ${school.name} (ID: ${school.id})`);
    const { error: schoolError } = await supabase
      .from('schools')
      .update({
        is_billing_booked: false,
        contract_start_date: null,
        contract_ends_at: null
      })
      .eq('id', school.id);
      
    if (schoolError) {
      console.error(`Error resetting school ${school.name}:`, schoolError);
    } else {
      console.log(`School ${school.name} successfully reset.`);
    }
  }
}

reset();
