import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, '.env.local') });
dotenv.config({ path: path.resolve(cwd, 'apps/groovelab/.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Supabase VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing.');
  process.exit(1);
}

// Master client bypasses RLS using service role key
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';
const masterClient = createClient(supabaseUrl, serviceKey);

async function runTest(num: number, desc: string, fn: () => Promise<void>) {
  try {
    process.stdout.write(`Test [${String(num).padStart(2, '0')}/10] ${desc.padEnd(80, '.')} `);
    await fn();
    console.log('✅ OK');
  } catch (err: any) {
    console.log('❌ FAILED');
    console.error(`Error details in Test ${num}:`, err.message || err);
    throw err;
  }
}

// Replicate SecretaryDashboard math formulas
function calculateBilling({
  hasCampusSub,
  hasGroovelabSub,
  employeeCount,
  teacherCount,
  totalStudents,
  activeStudents,
  studentBillingOption,
  couponApplied,
  couponDiscount
}: {
  hasCampusSub: boolean;
  hasGroovelabSub: boolean;
  employeeCount: number;
  teacherCount: number;
  totalStudents: number;
  activeStudents: number;
  studentBillingOption: string;
  couponApplied: boolean;
  couponDiscount: number;
}) {
  const baseModuleCost = (hasCampusSub && hasGroovelabSub) ? 9.99 : ((hasCampusSub ? 7.99 : 0) + (hasGroovelabSub ? 4.99 : 0));
  const passiveStudents = Math.max(0, totalStudents - activeStudents);

  const adminCost = employeeCount * 0.49;
  const teacherCost = teacherCount * 0.49;
  const passiveStudentCost = passiveStudents * 0.09;

  const totalInvoiceA_monthly = baseModuleCost + adminCost + teacherCost + passiveStudentCost;
  const finalInvoiceA_monthly = couponApplied ? (totalInvoiceA_monthly * (1 - couponDiscount / 100)) : totalInvoiceA_monthly;

  // Invoice B: active student profiles (school payer option2)
  const totalInvoiceB_monthly = studentBillingOption === 'option2' ? (activeStudents * 0.49) : 0;

  return {
    baseModuleCost,
    passiveStudents,
    adminCost,
    teacherCost,
    passiveStudentCost,
    finalInvoiceA_monthly,
    totalInvoiceB_monthly,
    mixedTotal: finalInvoiceA_monthly + totalInvoiceB_monthly
  };
}

async function main() {
  const testSchoolId = crypto.randomUUID();
  console.log('================================================================');
  console.log('RUNNING HÄRTETESTS FOR CAMPUS-GROOVELAB CALENDAR & BILLING');
  console.log(`School ID: ${testSchoolId}`);
  console.log('================================================================');

  // Seed data variables
  const teacherId = crypto.randomUUID();
  const studentId = crypto.randomUUID();
  const eventId = crypto.randomUUID();
  const ppId = crypto.randomUUID();
  const lessonId = crypto.randomUUID();

  // Setup database records
  await masterClient.from('schools').insert({ id: testSchoolId, name: 'Härtest School' });
  
  await masterClient.from('users_raw').insert([
    { id: teacherId, school_id: testSchoolId, role: 'teacher', first_name: 'John', last_name: 'Doe', roles: ['teacher'], is_active: true, is_campus_active: true, is_groovelab_active: true },
    { id: studentId, school_id: testSchoolId, role: 'student', first_name: 'Jane', last_name: 'Doe', roles: ['student'], is_active: true, is_campus_active: true, is_groovelab_active: true }
  ]);

  try {
    // ─── PART 1: CAMPUS CALENDAR CONFLICTS HARDENING (Tests 1-5) ───

    await runTest(1, 'Seed initial Campus Event & program point', async () => {
      // Create campus event starting at 15:00 on 2026-07-01
      const { error: evErr } = await masterClient.from('campus_events').insert({
        id: eventId,
        school_id: testSchoolId,
        title: 'Summer Concert',
        event_date: '2026-07-01',
        start_time: '15:00:00',
        created_by: teacherId,
        visibility: 'all'
      });
      if (evErr) throw evErr;

      // Add a scheduled program point for teacher
      const { error: ppErr } = await masterClient.from('campus_event_program_points').insert({
        id: ppId,
        event_id: eventId,
        school_id: testSchoolId,
        stage_number: 1,
        sort_order: 10,
        duration: 45,
        is_scheduled: true,
        teacher_id: teacherId,
        name: 'Guitar Performance'
      });
      if (ppErr) throw ppErr;
    });

    await runTest(2, 'Seed lesson at the exact same time to trigger conflict', async () => {
      // Insert a lesson for the same teacher, same day, overlapping time slot (15:00 to 15:45)
      const { error: lesErr } = await masterClient.from('lessons').insert({
        id: lessonId,
        teacher_id: teacherId,
        student_id: studentId,
        school_id: testSchoolId,
        date: '2026-07-01',
        start_time: '15:00:00',
        duration: 45,
        status: 'scheduled'
      });
      if (lesErr) throw lesErr;

      // Execute get_schedule_conflicts RPC
      const { data, error } = await masterClient.rpc('get_schedule_conflicts', { p_event_id: eventId });
      if (error) throw error;
      
      // We expect a lesson conflict
      const hasConflict = data?.some((c: any) => c.program_point_id === ppId && c.conflict_type === 'lesson');
      if (!hasConflict) {
        throw new Error('Expected conflict with scheduled lesson, but none was returned: ' + JSON.stringify(data));
      }
    });

    await runTest(3, 'Set lesson status to cancelled and verify conflict disappears', async () => {
      // Update status to 'cancelled' (the value we unified from 'canceled_by_teacher_sick')
      const { error: updErr } = await masterClient.from('lessons').update({ status: 'cancelled' }).eq('id', lessonId);
      if (updErr) throw updErr;

      // Re-run get_schedule_conflicts RPC
      const { data, error } = await masterClient.rpc('get_schedule_conflicts', { p_event_id: eventId });
      if (error) throw error;

      // We expect NO conflict
      const hasConflict = data?.some((c: any) => c.program_point_id === ppId && c.conflict_type === 'lesson');
      if (hasConflict) {
        throw new Error('Conflict should not be reported for a cancelled lesson slot: ' + JSON.stringify(data));
      }
    });

    await runTest(4, 'Restore lesson status to scheduled and verify conflict re-appears', async () => {
      // Restore status to scheduled
      const { error: updErr } = await masterClient.from('lessons').update({ status: 'scheduled' }).eq('id', lessonId);
      if (updErr) throw updErr;

      // Re-run get_schedule_conflicts RPC
      const { data, error } = await masterClient.rpc('get_schedule_conflicts', { p_event_id: eventId });
      if (error) throw error;

      // Conflict should be back
      const hasConflict = data?.some((c: any) => c.program_point_id === ppId && c.conflict_type === 'lesson');
      if (!hasConflict) {
        throw new Error('Conflict should have re-appeared after restoring scheduled status: ' + JSON.stringify(data));
      }
    });

    await runTest(5, 'Verify stage-to-stage collision detection works', async () => {
      const otherPpId = crypto.randomUUID();
      // Add another program point on stage 2 for the same teacher overlapping in time
      const { error: pp2Err } = await masterClient.from('campus_event_program_points').insert({
        id: otherPpId,
        event_id: eventId,
        school_id: testSchoolId,
        stage_number: 2,
        sort_order: 10,
        duration: 30,
        is_scheduled: true,
        teacher_id: teacherId,
        name: 'Stage 2 overlapping speech'
      });
      if (pp2Err) throw pp2Err;

      const { data, error } = await masterClient.rpc('get_schedule_conflicts', { p_event_id: eventId });
      if (error) throw error;

      // We expect a stage conflict
      const hasStageConflict = data?.some((c: any) => c.program_point_id === ppId && c.conflict_type === 'stage');
      if (!hasStageConflict) {
        throw new Error('Expected stage-to-stage conflict but none returned: ' + JSON.stringify(data));
      }

      // Clean up second program point
      await masterClient.from('campus_event_program_points').delete().eq('id', otherPpId);
    });

    // ─── PART 2: LICENSE & BILLING SETUP WIZARD HARDENING (Tests 6-10) ───

    await runTest(6, 'Verify billing math for basic campus subscription without discount', async () => {
      // 1 admin, 3 teachers, 50 total students, 20 active students
      const billing = calculateBilling({
        hasCampusSub: true,
        hasGroovelabSub: false,
        employeeCount: 1,
        teacherCount: 3,
        totalStudents: 50,
        activeStudents: 20,
        studentBillingOption: 'option2',
        couponApplied: false,
        couponDiscount: 0
      });

      // Expected math:
      // baseModuleCost = 7.99
      // adminCost = 1 * 0.49 = 0.49
      // teacherCost = 3 * 0.49 = 1.47
      // passiveStudents = 50 - 20 = 30
      // passiveStudentCost = 30 * 0.09 = 2.70
      // Invoice A total = 7.99 + 0.49 + 1.47 + 2.70 = 12.65
      // Invoice B total = 20 * 0.49 = 9.80
      // Mixed total = 22.45
      if (billing.finalInvoiceA_monthly.toFixed(2) !== '12.65') {
        throw new Error(`Expected Invoice A total to be 12.65, got ${billing.finalInvoiceA_monthly}`);
      }
      if (billing.totalInvoiceB_monthly.toFixed(2) !== '9.80') {
        throw new Error(`Expected Invoice B total to be 9.80, got ${billing.totalInvoiceB_monthly}`);
      }
      if (billing.mixedTotal.toFixed(2) !== '22.45') {
        throw new Error(`Expected Mixed total to be 22.45, got ${billing.mixedTotal}`);
      }
    });

    await runTest(7, 'Verify billing math with bundle discount and coupon applied', async () => {
      // Both modules active (Campus + Groovelab) -> bundle cost is 9.99 instead of 12.98
      // Coupon Groove20 applied (20% off Invoice A)
      // 1 admin, 5 teachers, 100 students (10 active, 90 passive), option1 (self-payer, so Invoice B is 0 for school)
      const billing = calculateBilling({
        hasCampusSub: true,
        hasGroovelabSub: true,
        employeeCount: 1,
        teacherCount: 5,
        totalStudents: 100,
        activeStudents: 10,
        studentBillingOption: 'option1',
        couponApplied: true,
        couponDiscount: 20
      });

      // Expected math:
      // baseModuleCost = 9.99
      // adminCost = 0.49
      // teacherCost = 2.45
      // passiveStudents = 90
      // passiveStudentCost = 90 * 0.09 = 8.10
      // Invoice A pre-discount = 9.99 + 0.49 + 2.45 + 8.10 = 21.03
      // Invoice A post-discount (20% off) = 21.03 * 0.8 = 16.824 (16.82)
      // Invoice B = 0 (self-payer)
      const diff = Math.abs(billing.finalInvoiceA_monthly - 16.824);
      if (diff > 0.001) {
        throw new Error(`Expected discounted Invoice A to be ~16.82, got ${billing.finalInvoiceA_monthly}`);
      }
      if (billing.totalInvoiceB_monthly !== 0) {
        throw new Error(`Expected Invoice B to be 0, got ${billing.totalInvoiceB_monthly}`);
      }
    });

    await runTest(8, 'Submit billing booking to database and verify payload state', async () => {
      // Simulate booking confirmation from checkout wizard
      const updatePayload = {
        is_billing_booked: true,
        has_campus_subscription: true,
        has_groovelab_subscription: true,
        student_billing_option: 'option2',
        contract_start_date: '2026-06-21T12:00:00Z'
      };

      const { error } = await masterClient
        .from('schools')
        .update(updatePayload)
        .eq('id', testSchoolId);
      if (error) throw error;

      // Fetch back from DB to confirm values
      const { data: school, error: getErr } = await masterClient
        .from('schools')
        .select('*')
        .eq('id', testSchoolId)
        .single();
      if (getErr) throw getErr;

      if (!school.is_billing_booked) throw new Error('Expected is_billing_booked to be true');
      if (!school.has_campus_subscription) throw new Error('Expected has_campus_subscription to be true');
      if (!school.has_groovelab_subscription) throw new Error('Expected has_groovelab_subscription to be true');
      if (school.student_billing_option !== 'option2') throw new Error('Expected student_billing_option option2');
    });

    await runTest(9, 'Verify security constraints on editing billing profile (non-admin RLS)', async () => {
      // Create user client for student Jane Doe (who belongs to testSchoolId)
      const studentClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          fetch: async (input, init) => {
            const headers = new Headers(init?.headers);
            headers.set('x-user-id', studentId);
            headers.set('x-invite-school-id', testSchoolId);
            return fetch(input, { ...init, headers });
          }
        }
      });

      // Student tries to modify school billing information
      const { data, error } = await studentClient
        .from('schools')
        .update({ student_billing_option: 'unauthorized_option' })
        .eq('id', testSchoolId)
        .select();

      // Since update silent-fails or is rejected by RLS:
      if (data && data.length > 0) {
        throw new Error('Student was unauthorizedly able to modify school billing properties! RLS failure!');
      }
    });

    await runTest(10, 'Verify calculation remains valid with zero students', async () => {
      const billing = calculateBilling({
        hasCampusSub: true,
        hasGroovelabSub: false,
        employeeCount: 0,
        teacherCount: 0,
        totalStudents: 0,
        activeStudents: 0,
        studentBillingOption: 'option2',
        couponApplied: false,
        couponDiscount: 0
      });

      if (billing.finalInvoiceA_monthly !== 7.99) {
        throw new Error(`Expected Invoice A to be 7.99, got ${billing.finalInvoiceA_monthly}`);
      }
      if (billing.totalInvoiceB_monthly !== 0) {
        throw new Error(`Expected Invoice B to be 0, got ${billing.totalInvoiceB_monthly}`);
      }
    });

    console.log('\n================================================================');
    console.log('🎉 ALL HÄRTETESTS PASSED SUCCESSFULLY! NO ERRORS FOUND.');
    console.log('================================================================');

  } finally {
    // Cleanup temporary school
    console.log('\nCleaning up database, deleting temporary school...');
    await masterClient.from('campus_event_program_points').delete().eq('id', ppId);
    await masterClient.from('campus_events').delete().eq('id', eventId);
    await masterClient.from('lessons').delete().eq('id', lessonId);
    await masterClient.from('users_raw').delete().eq('school_id', testSchoolId);
    await masterClient.from('schools').delete().eq('id', testSchoolId);
    console.log('Database cleanup finished.');
  }
}

main().catch(err => {
  console.error('\n❌ Suite execution failed:', err);
  process.exit(1);
});
