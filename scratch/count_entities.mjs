import { createClient } from '@supabase/supabase-js';

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';
const supabase = createClient('https://supabase.campus-groovelab.de', SERVICE_KEY);

async function count() {
  console.log("Checking DB counts with SERVICE KEY...");
  
  const { count: schoolCount, error: err1 } = await supabase
    .from('schools')
    .select('*', { count: 'exact', head: true });
  console.log("Schools count:", schoolCount, err1 || "");

  const { count: studentCount, error: err2 } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student');
  console.log("Students (role = student) count:", studentCount, err2 || "");

  const { count: teacherCount, error: err3 } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'teacher');
  console.log("Teachers (role = teacher) count:", teacherCount, err3 || "");

  const { count: adminCount, error: err4 } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'admin');
  console.log("Admins (role = admin) count:", adminCount, err4 || "");

  const { count: secretaryCount, error: err5 } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'secretary');
  console.log("Secretaries (role = secretary) count:", secretaryCount, err5 || "");

  // Let's get counts per school
  console.log("\nQuerying user counts by school directly:");
  const { data: users, error: userErr } = await supabase
    .from('users')
    .select('school_id, role');

  if (userErr) {
    console.error("Error fetching users for manual grouping:", userErr);
  } else {
    const schoolStats = {};
    users.forEach(u => {
      const sid = u.school_id || 'no_school';
      if (!schoolStats[sid]) {
        schoolStats[sid] = { students: 0, teachers: 0, admins: 0, secretaries: 0 };
      }
      if (u.role === 'student') schoolStats[sid].students++;
      else if (u.role === 'teacher') schoolStats[sid].teachers++;
      else if (u.role === 'admin') schoolStats[sid].admins++;
      else if (u.role === 'secretary') schoolStats[sid].secretaries++;
    });

    console.log("Number of schools with users:", Object.keys(schoolStats).length);
    console.log("Sample schools stats:", Object.entries(schoolStats).slice(0, 10));
  }
}

count().catch(console.error);
