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
  // Fetch schools
  const { data: schools } = await supabase
    .from('schools')
    .select('*');

  // Fetch users
  const { data: users } = await supabase
    .from('users')
    .select('*');

  // Fetch pending students
  const { data: pendingStudents } = await supabase
    .from('pending_students_decrypted')
    .select('*');

  // Loop through schools
  for (const school of schools) {
    const schoolId = school.id;
    const schoolUsers = users.filter(u => u.school_id === schoolId);
    const schoolPending = pendingStudents.filter(p => p.school_id === schoolId);

    // 1. Calculate like SecretaryDashboard
    const teachers_sec = schoolUsers.filter(u => u.role === 'teacher' || (u.roles && u.roles.includes('teacher')));
    const employees_sec = schoolUsers.filter(u => u.role === 'admin' || u.role === 'secretary' || (u.roles && (u.roles.includes('admin') || u.roles.includes('secretary'))));
    const students_sec_db = schoolUsers.filter(u => u.role === 'student');
    
    // Merge pending
    const students_sec = [...students_sec_db];
    schoolPending.forEach(ps => {
      students_sec.push({
        role: 'student',
        is_active: false,
        is_campus_active: false,
        is_groovelab_active: false,
        created_at: ps.created_at
      });
    });

    const billedCampus_sec = school.has_campus_subscription;
    const billedGroovelab_sec = school.has_groovelab_subscription;
    const moduleCost_sec = (billedCampus_sec && billedGroovelab_sec) ? 9.99 : ((billedCampus_sec ? 7.99 : 0) + (billedGroovelab_sec ? 4.99 : 0));
    const activeStudents_sec = students_sec.filter(s => s.isCampusActive || s.is_campus_active).length;
    const billingOpt_sec = school.student_billing_option || 'option2';
    const billingPayer_sec = (billingOpt_sec === 'option2' || billingOpt_sec === 'option3_2' || billingOpt_sec === 'option3_3') ? 'school' : 'student';

    const baseB2B_sec = school.subscription_bypass ? 0.00 : (
      moduleCost_sec + 
      (teachers_sec.length + employees_sec.length) * 0.49 + 
      ((billingPayer_sec === 'student' && billingOpt_sec === 'student_partial') 
        ? students_sec.length * 0.09 
        : Math.max(0, students_sec.length - activeStudents_sec) * 0.09)
    );

    // 2. Calculate like BillingDashboard
    const stats_bill = { 
      totalStudents: 0, 
      activeStudents: 0, 
      premiumStudents: 0,
      totalTeachers: 0,
      activeTeachers: 0
    };

    schoolUsers.forEach(u => {
      if (u.role === 'student') {
        stats_bill.totalStudents++;
        if (u.is_active) stats_bill.activeStudents++;
        if (u.is_campus_active) stats_bill.premiumStudents++;
      }
    });

    schoolPending.forEach(ps => {
      stats_bill.totalStudents++;
    });

    const teachersCount_bill = schoolUsers.filter(u => u.role === 'teacher' || (u.roles && u.roles.includes('teacher'))).length;
    const employeesCount_bill = schoolUsers.filter(u => u.role === 'admin' || u.role === 'secretary' || (u.roles && (u.roles.includes('admin') || u.roles.includes('secretary')))).length;
    stats_bill.totalTeachers = teachersCount_bill + employeesCount_bill;

    const campusCost_bill = school.has_campus_subscription ? 7.99 : 0;
    const groovelabCost_bill = school.has_groovelab_subscription ? 4.99 : 0;
    const baseFee_bill = campusCost_bill + groovelabCost_bill;
    
    const hasKombi_bill = !!(school.has_campus_subscription && school.has_groovelab_subscription);
    const moduleCost_bill = hasKombi_bill ? 9.99 : baseFee_bill;

    const billingOpt_bill = school.student_billing_option || 'option2';
    const billingPayer_bill = (billingOpt_bill === 'option2' || billingOpt_bill === 'option3_2' || billingOpt_bill === 'option3_3') ? 'school' : 'student';
    
    const passiveStudents_bill = (billingPayer_bill === 'student' && billingOpt_bill === 'student_partial')
      ? stats_bill.totalStudents
      : Math.max(0, stats_bill.totalStudents - stats_bill.premiumStudents);

    const userFee_bill = (stats_bill.totalTeachers * 0.49) + (passiveStudents_bill * 0.09);
    const subtotal_bill = moduleCost_bill + userFee_bill;
    const total_bill = school.subscription_bypass ? 0.00 : subtotal_bill;

    const total_sec_rounded = parseFloat(baseB2B_sec.toFixed(2));
    const total_bill_rounded = parseFloat(total_bill.toFixed(2));

    if (total_sec_rounded !== total_bill_rounded) {
      console.log(`DISCREPANCY DETECTED for school ${school.name} (ID: ${school.id}):`);
      console.log(`  SecretaryDashboard Total: ${total_sec_rounded} €`);
      console.log(`  BillingDashboard Total  : ${total_bill_rounded} €`);
      console.log(`  Diff: ${total_sec_rounded - total_bill_rounded}`);
    } else {
      console.log(`School ${school.name}: Match (${total_sec_rounded} €)`);
    }
  }
}

run();
