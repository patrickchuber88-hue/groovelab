import { createClient } from '@supabase/supabase-js';

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';
const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabase = createClient(supabaseUrl, SERVICE_KEY);

async function inspect() {
  console.log('--- DATABASE ROLE BREAKDOWN INSPECTION ---');
  
  const { data: schools, error: schoolErr } = await supabase
    .from('schools')
    .select('id, name, city');
  
  if (schoolErr) {
    console.error('Error fetching schools:', schoolErr);
    return;
  }
  
  for (const school of schools) {
    const { data: users, error: userErr } = await supabase
      .from('users')
      .select('role');
      
    if (userErr) {
      console.error(`Error fetching users for school ${school.name}:`, userErr);
      continue;
    }
    
    // Filter users locally for the school
    const schoolUsers = await supabase
      .from('users')
      .select('role')
      .eq('school_id', school.id);
      
    const roles = { student: 0, teacher: 0, admin: 0, other: 0 };
    (schoolUsers.data || []).forEach(u => {
      if (roles[u.role] !== undefined) {
        roles[u.role]++;
      } else {
        roles.other++;
      }
    });
    
    console.log(`- School: "${school.name}" (${school.id})`);
    console.log(`  Students: ${roles.student} | Teachers: ${roles.teacher} | Admins: ${roles.admin} | Others: ${roles.other}`);
  }
}

inspect();
