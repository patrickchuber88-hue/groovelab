const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3Zk5b.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';
// Wait, we need to use the actual new anonKey we generated:
const actualAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const supabase = createClient(supabaseUrl, actualAnonKey);

async function testTeacherLogin() {
  console.log('Fetching teacher Klaus Siebold to check credentials...');
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*, schools(*)')
      .eq('email', 'klaus.siebold768@musaek.de')
      .maybeSingle();
      
    if (error) {
      console.error('Error fetching teacher:', error);
      return;
    }
    
    if (!user) {
      console.log('Teacher not found!');
      return;
    }
    
    console.log('Teacher Details:');
    console.log(`- Name: ${user.first_name} ${user.last_name}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Role: ${user.role}`);
    console.log(`- Ausweis-Nummer (PIN): ${user.ausweis_nummer}`);
    console.log(`- QR Token: ${user.qr_token}`);
    console.log(`- Teacher QR Token: ${user.teacher_qr_token}`);
    console.log(`- GL Active: ${user.is_groovelab_active}, Campus Active: ${user.is_campus_active}`);
    console.log(`- Schools Relation:`, user.schools);
    
  } catch (err) {
    console.error('Execution error:', err);
  }
}

testTeacherLogin();
