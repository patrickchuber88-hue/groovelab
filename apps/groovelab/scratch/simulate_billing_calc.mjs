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

async function run() {
  const schoolId = '74713df2-6176-4a41-a8cd-9fbebe34e9b8';
  
  // 1. Fetch school
  const { data: school } = await supabase
    .from('schools')
    .select('id, name, subscription_type, has_campus_subscription, has_groovelab_subscription, has_kombi_discount, subscription_bypass, status, is_trial, user_quota, pending_user_quota, contract_start_date, student_billing_option, created_at, street, zip_code, city')
    .eq('id', schoolId)
    .single();

  // 2. Fetch active license metrics
  const { data: metrics } = await supabase
    .from('active_licence_metrics')
    .select('school_id, active_campus_users')
    .eq('school_id', schoolId);
  const activeCampusUsers = metrics?.[0]?.active_campus_users || 0;

  // 3. Fetch users
  const { data: users } = await supabase
    .from('users')
    .select('school_id, role, roles, is_active, is_campus_active, activated_at, created_at')
    .eq('school_id', schoolId);

  // 4. Fetch pending
  const { data: pendingStudents } = await supabase
    .from('pending_students_decrypted')
    .select('school_id, created_at')
    .eq('school_id', schoolId);

  const stats = { 
    totalStudents: 0, 
    activeStudents: 0, 
    premiumStudents: 0,
    totalTeachers: 0,
    activeTeachers: 0,
    studentsList: []
  };

  users?.forEach(u => {
    if (u.role === 'student') {
      stats.studentsList.push(u);
      stats.totalStudents++;
      if (u.is_active) {
        stats.activeStudents++;
      }
      if (u.is_campus_active) {
        stats.premiumStudents++;
      }
    }
  });

  pendingStudents?.forEach(ps => {
    stats.totalStudents++;
    stats.studentsList.push({
      role: 'student',
      is_active: false,
      is_campus_active: false,
      created_at: ps.created_at
    });
  });

  const schoolUsers = users || [];
  const teachersCount = schoolUsers.filter(u => u.role === 'teacher' || (u.roles && u.roles.includes('teacher'))).length;
  const employeesCount = schoolUsers.filter(u => u.role === 'admin' || u.role === 'secretary' || (u.roles && (u.roles.includes('admin') || u.roles.includes('secretary')))).length;
  const activeTeachersCount = schoolUsers.filter(u => (u.role === 'teacher' || (u.roles && u.roles.includes('teacher'))) && u.is_active).length;

  stats.totalTeachers = teachersCount + employeesCount;
  stats.activeTeachers = activeTeachersCount;

  // BillingDashboard Calculations
  const campusCost = school.has_campus_subscription ? 7.99 : 0;
  const groovelabCost = school.has_groovelab_subscription ? 4.99 : 0;
  const baseFee = campusCost + groovelabCost;
  
  const hasKombi = !!(school.has_campus_subscription && school.has_groovelab_subscription);
  const kombiDiscountAmount = hasKombi ? 2.99 : 0.00;
  const moduleCost = hasKombi ? 9.99 : baseFee;

  const billingOpt = school.student_billing_option || 'option2';
  const billingPayer = (billingOpt === 'option2' || billingOpt === 'option3_2' || billingOpt === 'option3_3') ? 'school' : 'student';
  
  const passiveStudents = (billingPayer === 'student' && billingOpt === 'student_partial')
    ? stats.totalStudents
    : Math.max(0, stats.totalStudents - stats.premiumStudents);

  const userFee = (stats.totalTeachers * 0.49) + (passiveStudents * 0.09);
  
  const b2cRevenue = stats.premiumStudents * 9.99;
  const subtotal = moduleCost + userFee;
  const isBypass = school.subscription_bypass || false;
  const total = isBypass ? 0.00 : subtotal;

  console.log("SIMULATED BILLING DASHBOARD VALUES:");
  console.log("totalStudents:", stats.totalStudents);
  console.log("premiumStudents:", stats.premiumStudents);
  console.log("totalTeachers:", stats.totalTeachers);
  console.log("moduleCost:", moduleCost);
  console.log("userFee:", userFee);
  console.log("subtotal:", subtotal);
  console.log("total:", total);
}

run();
