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
  const { data: schools } = await supabase.from('schools').select('*').eq('name', 'Musäk Bad Säckingen');
  const school = schools[0];

  const { data: users } = await supabase.from('users').select('*').eq('school_id', school.id);
  const { data: pending } = await supabase.from('pending_students_decrypted').select('id').eq('school_id', school.id);
  const pendingCount = pending ? pending.length : 0;

  // Let's do the calculations:
  let totalStudents = 0;
  let activeStudents = 0;
  let premiumStudents = 0;
  let totalTeachers = 0;
  let totalEmployees = 0;

  users.forEach(u => {
    if (u.role === 'student') {
      totalStudents++;
      if (u.is_campus_active) {
        activeStudents++;
        premiumStudents++;
      }
    }
    const isTeacher = u.role === 'teacher' || (u.roles && u.roles.includes('teacher'));
    if (isTeacher) {
      totalTeachers++;
    }
    const isEmployee = u.role === 'admin' || u.role === 'secretary' ||
      (u.roles && (u.roles.includes('admin') || u.roles.includes('secretary')));
    if (isEmployee) {
      totalEmployees++;
    }
  });

  totalStudents += pendingCount;

  const rateCampus = 7.99;
  const rateGroovelab = 4.99;

  let baseFee = 0;
  if (school.has_campus_subscription) baseFee += rateCampus;
  if (school.has_groovelab_subscription) baseFee += rateGroovelab;

  const hasKombi = school.has_kombi_discount || (school.has_campus_subscription && school.has_groovelab_subscription);
  const kombiDiscountAmount = hasKombi ? 2.99 : 0.00;

  const staffFee = (totalTeachers + totalEmployees) * 0.49;
  const passiveStudentsCount = Math.max(0, totalStudents - activeStudents);
  const passiveStudentsFee = passiveStudentsCount * 0.09;

  const userFee = staffFee + passiveStudentsFee;
  const activeStudentFee = (school.student_billing_option === 'option2') ? activeStudents * 0.49 : 0.00;

  const subtotal = (baseFee - kombiDiscountAmount) + userFee + activeStudentFee;
  const total = school.subscription_bypass ? 0.00 : subtotal;

  console.log("Calculated results for Musäk Bad Säckingen:");
  console.log(`- totalStudents: ${totalStudents} (DB: ${totalStudents - pendingCount}, pending: ${pendingCount})`);
  console.log(`- activeStudents: ${activeStudents}`);
  console.log(`- teachersCount: ${totalTeachers}`);
  console.log(`- employeesCount: ${totalEmployees}`);
  console.log(`- baseFee (Server-Grundgebühr): ${baseFee} €`);
  console.log(`- kombiDiscountAmount: ${kombiDiscountAmount} €`);
  console.log(`- userFee (Profile-Levy B2B): ${userFee} €`);
  console.log(`- activeStudentFee: ${activeStudentFee} €`);
  console.log(`- subtotal: ${subtotal} €`);
  console.log(`- total: ${total} €`);
}

run();
