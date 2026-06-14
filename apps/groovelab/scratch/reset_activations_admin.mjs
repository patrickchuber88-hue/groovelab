import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      'x-user-id': '88888888-8888-8888-8888-888888888888'
    }
  }
});

async function reset() {
  const schoolId = '74713df2-6176-4a41-a8cd-9fbebe34e9b8';
  console.log(`Resetting student activations for school: ${schoolId}...`);
  
  // First let's check how many users there are in the school
  const { data: users, error: fetchError } = await supabase
    .from('users')
    .select('id, role, first_name, last_name, is_campus_active, is_groovelab_active')
    .eq('school_id', schoolId);
    
  if (fetchError) {
    console.error("Error fetching users:", fetchError);
    return;
  }
  
  console.log(`Found ${users.length} users in the school.`);
  
  const students = users.filter(u => u.role === 'student');
  console.log(`Found ${students.length} students to update.`);
  
  if (students.length > 0) {
    const { data, error } = await supabase
      .from('users')
      .update({
        is_campus_active: false,
        is_groovelab_active: false,
        activated_at: null
      })
      .eq('school_id', schoolId)
      .eq('role', 'student');

    if (error) {
      console.error("Reset error:", error);
    } else {
      console.log(`Successfully reset activations for ${students.length} students.`);
    }
  }
  
  // Also reset billing booked
  const { error: schoolError } = await supabase
    .from('schools')
    .update({
      is_billing_booked: false,
      contract_start_date: null,
      contract_ends_at: null
    })
    .eq('id', schoolId);
    
  if (schoolError) {
    console.error("School billing reset error:", schoolError);
  } else {
    console.log("School billing statuses successfully reset.");
  }
}

reset();
