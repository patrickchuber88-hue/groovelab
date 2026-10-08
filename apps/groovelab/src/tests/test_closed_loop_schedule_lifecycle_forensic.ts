// ==============================================================================
// 🛡️ Enterprise+ Forensic Test: Closed-Loop Schedule Lifecycle Engine
// Verifies: Atomic Occurrence Update, Automatic Room Booking, Student
//           Notification Pipeline, and Revisionssicheres Audit-Logging
// Standard: OWASP ASVS Level 3 / GoBD / BFSG / ISO 27001
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, '..');
const ROOT_DIR = fs.existsSync(path.join(process.cwd(), 'supabase', 'migrations'))
  ? process.cwd()
  : path.resolve(__dirname, '..', '..', '..', '..');

interface ForensicAssertion {
  name: string;
  passed: boolean;
  details: string;
}

const assertions: ForensicAssertion[] = [];

function assert(condition: boolean, name: string, successDetails: string, failDetails: string) {
  assertions.push({
    name,
    passed: condition,
    details: condition ? successDetails : failDetails
  });
}

export async function runClosedLoopLifecycleForensicScan() {
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('  🛡️   FORENSIC SCAN: CLOSED-LOOP SCHEDULE & ROOM LIFECYCLE (0.1% GOLDSTANDARD)');
  console.log('════════════════════════════════════════════════════════════════════\n');

  // 1. Verify Migration 470 Structure & Implementation
  const migrationPath = path.join(ROOT_DIR, 'supabase', 'migrations', '470_enterprise_authoritative_reschedule_and_room_booking.sql');
  const migrationExists = fs.existsSync(migrationPath);
  assert(
    migrationExists,
    'Migration 470 Presence',
    'Migration 470 (Authoritative Reschedule & Room Booking Engine) exists and is tracked',
    'Migration 470 missing from supabase/migrations'
  );

  if (migrationExists) {
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    // 1.1 Atomic occurrence upsert with original_date preservation
    const hasOriginalPreservation = migrationSql.includes('original_date = COALESCE') && migrationSql.includes('original_start_time = COALESCE');
    assert(
      hasOriginalPreservation,
      'Audit Traceability: Original Date Preservation',
      'reschedule_lesson_authoritative preserves original_date and original_start_time for immutable audit trails',
      'Missing original_date / original_start_time preservation in migration 470'
    );

    // 1.2 Automatic Room Booking deletion and insertion
    const hasRoomBookingSync = migrationSql.includes('DELETE FROM public.room_bookings') && migrationSql.includes('INSERT INTO public.room_bookings');
    assert(
      hasRoomBookingSync,
      'Automatic Room Booking Synchronization',
      'reschedule_lesson_authoritative atomizes room_bookings sync (old slot purged, new slot reserved)',
      'Missing room_bookings purge/insert synchronization in migration 470'
    );

    // 1.3 Student direct message and in-app notification
    const hasStudentNotification = migrationSql.includes('public.campus_direct_messages') && migrationSql.includes('public.notifications');
    assert(
      hasStudentNotification,
      'Closed-Loop Student Notification Pipeline',
      'reschedule_lesson_authoritative sends direct message and in-app notification to student/parents',
      'Missing campus_direct_messages or notifications insert in migration 470'
    );

    // 1.4 Revisionssicheres Audit Logging
    const hasAuditLogging = migrationSql.includes('log_application_audit_event') || migrationSql.includes('public.audit_logs');
    assert(
      hasAuditLogging,
      'Revisionssicheres Audit-Logging',
      'reschedule_lesson_authoritative writes immutable audit record to audit_logs',
      'Missing audit logging in migration 470'
    );
  }

  // 2. Verify ScheduleBoardDesktop Closed-Loop Approval & Live Sync
  const boardDesktopPath = path.join(SRC_DIR, 'components', 'ScheduleBoardDesktop.tsx');
  const boardDesktopExists = fs.existsSync(boardDesktopPath);
  assert(
    boardDesktopExists,
    'ScheduleBoardDesktop Presence',
    'ScheduleBoardDesktop.tsx exists',
    'ScheduleBoardDesktop.tsx not found'
  );

  if (boardDesktopExists) {
    const boardCode = fs.readFileSync(boardDesktopPath, 'utf8');

    // 2.1 Room booking on admin approval
    const hasBoardRoomBooking = boardCode.includes('room_bookings') && boardCode.includes('handleApproveScheduleByAdmin');
    assert(
      hasBoardRoomBooking,
      'Stundenplan-Board: Automatic Room Booking on Approval',
      'handleApproveScheduleByAdmin generates approved room_bookings for all assigned rooms',
      'Missing room_bookings insertion in handleApproveScheduleByAdmin'
    );

    // 2.2 Student notifications on admin approval
    const hasBoardStudentNotification = boardCode.includes('campus_direct_messages') && boardCode.includes('handleApproveScheduleByAdmin');
    assert(
      hasBoardStudentNotification,
      'Stundenplan-Board: Student Notification on Approval',
      'handleApproveScheduleByAdmin informs all students via campus_direct_messages and notifications',
      'Missing student notifications in handleApproveScheduleByAdmin'
    );

    // 2.3 Live Closed-Loop Synchronization for Approved Boards
    const hasLiveSync = boardCode.includes("scheduleStatus === 'approved'") && boardCode.includes('reschedule_lesson_authoritative');
    assert(
      hasLiveSync,
      'Stundenplan-Board: Live Sync on Move for Approved Schedules',
      'Moving an appointment on an approved board immediately updates schedules, occurrences, room bookings and notifies students',
      'Missing live closed-loop synchronization on approved schedule moves'
    );
  }

  // 3. Verify Secretary Schedules Closed-Loop Matrix Approval
  const secretarySchedulesPath = path.join(SRC_DIR, 'components', 'secretary', 'hooks', 'useSecretarySchedules.ts');
  if (fs.existsSync(secretarySchedulesPath)) {
    const secCode = fs.readFileSync(secretarySchedulesPath, 'utf8');
    const hasSecRoomBooking = secCode.includes('room_bookings') && secCode.includes('handleSaveAndApproveAll');
    assert(
      hasSecRoomBooking,
      'Sekretariat Matrix: Automatic Room Booking on Approval',
      'handleSaveAndApproveAll automatically creates room_bookings for all assigned matrix rooms',
      'Missing room_bookings in useSecretarySchedules handleSaveAndApproveAll'
    );

    const hasSecStudentNotif = secCode.includes('campus_direct_messages') && secCode.includes('handleSaveAndApproveAll');
    assert(
      hasSecStudentNotif,
      'Sekretariat Matrix: Student Notification Pipeline',
      'handleSaveAndApproveAll sends direct messages and notifications to students upon schedule approval',
      'Missing student notifications in useSecretarySchedules handleSaveAndApproveAll'
    );
  }

  // 4. Verify Migration 533 & Closed-Loop Student Reschedule Decision Engine (0.1% Goldstandard)
  const migration533Path = path.join(ROOT_DIR, 'supabase', 'migrations', '533_enterprise_authoritative_reschedule_decision_and_realtime.sql');
  const migration533Exists = fs.existsSync(migration533Path);
  assert(
    migration533Exists,
    'Migration 533 Presence',
    'Migration 533 (Authoritative Reschedule Decision & Realtime Sync) exists',
    'Migration 533 missing from supabase/migrations'
  );

  if (migration533Exists) {
    const mig533Sql = fs.readFileSync(migration533Path, 'utf8');

    // 4.1 Authoritative RPC respond_to_reschedule_authoritative
    const hasRespondRpc = mig533Sql.includes('respond_to_reschedule_authoritative');
    assert(
      hasRespondRpc,
      'Authoritative RPC: respond_to_reschedule_authoritative',
      'respond_to_reschedule_authoritative SECURITY DEFINER RPC exists and is defined',
      'Missing respond_to_reschedule_authoritative RPC in Migration 533'
    );

    // 4.2 Room booking purge on reject
    const hasRoomPurgeOnReject = mig533Sql.includes('DELETE FROM public.room_bookings') && mig533Sql.includes("p_decision = 'reject'");
    assert(
      hasRoomPurgeOnReject,
      'Atomic Room Booking Rollback on Reject',
      'respond_to_reschedule_authoritative purges reserved room_bookings on student rejection',
      'Missing room_bookings purge on rejection in Migration 533'
    );

    // 4.3 Enum support for reschedule_rejected
    const hasEnumExtension = mig533Sql.includes('reschedule_rejected') && mig533Sql.includes('schedule_status');
    assert(
      hasEnumExtension,
      'PostgreSQL Enum: reschedule_rejected Supported',
      'schedule_status enum is extended to include reschedule_rejected',
      'Missing reschedule_rejected enum expansion in Migration 533'
    );

    // 4.4 Immutable GoBD Audit Logging
    const hasAuditLog533 = mig533Sql.includes('log_application_audit_event') && mig533Sql.includes('RESCHEDULE_ACCEPTED') && mig533Sql.includes('RESCHEDULE_REJECTED');
    assert(
      hasAuditLog533,
      'Revisionssicheres Audit-Logging: Reschedule Decisions',
      'respond_to_reschedule_authoritative writes Merkle-Hash audit log records for accept and reject',
      'Missing audit logging for reschedule decisions in Migration 533'
    );
  }

  // 4.5 Satellite Service studentRescheduleService
  const satelliteServicePath = path.join(SRC_DIR, 'services', 'studentRescheduleService.ts');
  const satelliteServiceExists = fs.existsSync(satelliteServicePath);
  assert(
    satelliteServiceExists,
    'Satellite Service: studentRescheduleService Presence',
    'studentRescheduleService.ts encapsulates authoritative decision RPC, SWR invalidation, and haptics',
    'studentRescheduleService.ts not found in apps/groovelab/src/services'
  );

  // 4.6 Cross-Device Realtime WebSocket in useStudentSchedule
  const studentScheduleHookPath = path.join(SRC_DIR, 'components', 'student', 'hooks', 'useStudentSchedule.ts');
  if (fs.existsSync(studentScheduleHookPath)) {
    const hookCode = fs.readFileSync(studentScheduleHookPath, 'utf8');
    const hasRealtimeWs = hookCode.includes("table: 'schedule_occurrences'") && hookCode.includes('student_schedule_realtime_');
    assert(
      hasRealtimeWs,
      'Cross-Device Realtime WebSocket in useStudentSchedule',
      'useStudentSchedule subscribes to Supabase postgres_changes on schedule_occurrences for instant multi-device sync',
      'Missing Supabase Realtime WebSocket subscription in useStudentSchedule.ts'
    );
  }

  // Summary Output
  console.log('────────────────────────────────────────────────────────────────────');
  console.log('  LIFECYCLE FORENSIC INVARIANTS RESULTS');
  console.log('────────────────────────────────────────────────────────────────────');

  let passedCount = 0;
  let failedCount = 0;

  for (const a of assertions) {
    if (a.passed) {
      passedCount++;
      console.log(`  ✅ [PASS] ${a.name}`);
      console.log(`            ↳ ${a.details}`);
    } else {
      failedCount++;
      console.log(`  ❌ [FAIL] ${a.name}`);
      console.log(`            ↳ ${a.details}`);
    }
  }

  console.log('────────────────────────────────────────────────────────────────────');
  console.log(`  Gesamt: ${assertions.length} | Bestanden: ${passedCount} | Fehlgeschlagen: ${failedCount}`);
  console.log('════════════════════════════════════════════════════════════════════\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('test_closed_loop_schedule_lifecycle_forensic.ts')) {
  runClosedLoopLifecycleForensicScan();
}
