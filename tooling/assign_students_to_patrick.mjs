import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const patrickHuberId = '03564b1c-e2bb-4ccb-be95-b9fd1ef34829';

async function assignStudents() {
  console.log('Fetching active students...');
  const { data: students, error: fetchError } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, teacher_id, school_id, is_campus_active')
    .eq('role', 'student')
    .eq('is_campus_active', true);

  if (fetchError) {
    console.error('Error fetching students:', fetchError);
    return;
  }

  console.log(`Found ${students.length} active students in total.`);

  // Let's update all active students to have teacher_id as Patrick Huber's ID
  console.log('Updating all active students to have Patrick Huber as teacher...');
  const { data: updated, error: updateError } = await supabase
    .from('users')
    .update({ teacher_id: patrickHuberId })
    .eq('role', 'student')
    .eq('is_campus_active', true);

  if (updateError) {
    console.error('Error updating students:', updateError);
    return;
  }

  console.log('Successfully updated active students to Patrick Huber.');
  
  // Double check
  const { data: verifyStudents, error: verifyError } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, teacher_id, is_campus_active')
    .eq('role', 'student')
    .eq('is_campus_active', true);
  
  if (!verifyError) {
    console.log('\nVerification of active students:');
    verifyStudents.forEach(student => {
      console.log(`- ${student.first_name} ${student.last_name} (teacher_id: ${student.teacher_id})`);
    });
  }
}

assignStudents();
