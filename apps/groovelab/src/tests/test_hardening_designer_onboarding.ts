import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, '.env.local') });
dotenv.config({ path: path.resolve(cwd, 'apps/groovelab/.env.local') });


// 🛡️ AIR-GAPPED PRODUCTION PROTECTION GUARD
if (process.env.VITE_SUPABASE_URL?.includes('campus-groovelab.de')) {
  console.error('⛔ SECURITY PROTECTION ERROR: Test scripts are strictly prohibited from executing against the PRODUCTION database!');
  process.exit(1);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Supabase URL or Anon Key is missing.');
  process.exit(1);
}

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const masterClient = createClient(supabaseUrl, serviceKey || "");

async function runTest(num: number, desc: string, fn: () => Promise<void>) {
  try {
    process.stdout.write(`Test [${String(num).padStart(2, '0')}/07] ${desc.padEnd(80, '.')} `);
    await fn();
    console.log('✅ OK');
  } catch (err: any) {
    console.log('❌ FAILED');
    console.error(`Error details in Test ${num}:`, err.message || err);
    throw err;
  }
}

// Recalculate helper matching ScheduleBoard.tsx
function addMinutesToTime(time: string, mins: number): string {
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr);
  let m = parseInt(mStr);
  m += mins;
  h += Math.floor(m / 60);
  m = m % 60;
  h = h % 24;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

async function main() {
  const testSchoolId = crypto.randomUUID();
  console.log('================================================================');
  console.log('RUNNING HÄRTETESTS FOR DESIGNER & STUDENT ONBOARDING');
  console.log(`School ID: ${testSchoolId}`);
  console.log('================================================================');

  const teacherId = crypto.randomUUID();
  let studentId = '';

  // Create school and teacher users record
  await masterClient.from('schools').insert({ id: testSchoolId, name: 'Onboarding Test School' });
  await masterClient.from('users_raw').insert([
    { id: teacherId, school_id: testSchoolId, role: 'teacher', first_name: 'Professor', last_name: 'Snape', roles: ['teacher'], is_active: true, is_campus_active: true, is_groovelab_active: true }
  ]);

  try {
    // ─── PART 1: STUDENT ONBOARDING TESTS ───

    await runTest(1, 'Verify new student starts with status ausstehend', async () => {
      const { data, error } = await masterClient.rpc('import_student', {
        first_name: 'Harry',
        last_name: 'Potter',
        birth_date: '31.07.1980',
        instrument: 'Magic Flute',
        school_id: testSchoolId,
        teacher_id: teacherId
      });
      if (error) throw error;
      
      studentId = data;

      const { data: stData, error: fetchErr } = await masterClient.from('students').select('status').eq('id', studentId).single();
      if (fetchErr) throw fetchErr;

      if (stData?.status !== 'ausstehend') {
        throw new Error(`Expected status to be 'ausstehend', got: ${stData?.status}`);
      }
    });

    await runTest(2, 'Harden complete_onboarding transitions student and creates user row', async () => {
      const { data, error } = await masterClient.rpc('complete_onboarding', {
        input_student_id: studentId,
        input_email: 'harry.potter@hogwarts.edu'
      });
      if (error) throw error;

      // Verify user row is created
      const { data: userRow, error: userErr } = await masterClient.from('users_raw').select('id, role').eq('id', studentId).single();
      if (userErr) throw userErr;
      if (userRow.role !== 'student') {
        throw new Error(`Expected role to be student, got: ${userRow.role}`);
      }
    });

    await runTest(3, 'Verify save_schedule_preferences fails on empty or sub-2 hours preferred times', async () => {
      // 1 slot only (30 mins duration)
      const invalidSlots = [
        { day_of_week: 1, start_time: '14:00', end_time: '14:30', preference_type: 'wunsch' }
      ];

      const { data, error } = await masterClient.rpc('save_schedule_preferences', {
        input_student_id: studentId,
        slots: invalidSlots
      });
      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
      if (result.success !== false || (!result.message.includes('Gesamtdauer') && !result.message.includes('Wunschzeit-Slots'))) {
        throw new Error(`Expected validation failure message, got: ${JSON.stringify(result)}`);
      }
    });

    await runTest(4, 'Verify save_schedule_preferences succeeds for valid preferences', async () => {
      // 4 slots of 30 mins each = 2 hours preferred
      const validSlots = [
        { day_of_week: 1, start_time: '14:00', end_time: '14:30', preference_type: 'wunsch' },
        { day_of_week: 1, start_time: '14:30', end_time: '15:00', preference_type: 'wunsch' },
        { day_of_week: 1, start_time: '15:00', end_time: '15:30', preference_type: 'wunsch' },
        { day_of_week: 1, start_time: '15:30', end_time: '16:00', preference_type: 'wunsch' },
        { day_of_week: 2, start_time: '15:00', end_time: '17:00', preference_type: 'gesperrt' } // Wednesday blocked
      ];

      const { data, error } = await masterClient.rpc('save_schedule_preferences', {
        input_student_id: studentId,
        slots: validSlots
      });
      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
      if (result.success !== true) {
        throw new Error(`Expected success, got: ${JSON.stringify(result)}`);
      }

      // Check student status updated to 'in_bearbeitung'
      const { data: studentData, error: stErr } = await masterClient.from('students').select('status').eq('id', studentId).single();
      if (stErr) throw stErr;
      if (studentData.status !== 'in_bearbeitung') {
        throw new Error(`Expected status in_bearbeitung, got: ${studentData.status}`);
      }
    });

    // ─── PART 2: SCHEDULE DESIGNER ALGORITHM TESTS ───

    await runTest(5, 'Verify auto-assignment avoids blocked slots', async () => {
      // Boards: Monday (day 1, 14:00 start) and Tuesday (day 2, 14:00 start)
      const mockBoards = [
        { id: 'board-mon', dayOfWeek: 1, startAnchor: '14:00', students: [] },
        { id: 'board-tue', dayOfWeek: 2, startAnchor: '15:00', students: [] }
      ];

      const mockStudent = {
        id: studentId,
        first_name: 'Harry',
        last_name: 'Potter',
        instrument: 'Magic Flute',
        duration: 60
      };

      // Fetch Harry's preferences from db
      const { data: prefs } = await supabase
        .from('student_schedule_preferences')
        .select('*')
        .eq('student_id', studentId);

      const blockedOnTuesday = prefs?.some(p => p.preference_type === 'gesperrt' && p.day_of_week === 2);
      if (!blockedOnTuesday) throw new Error('Expected tuesday to be blocked based on validSlots insertion');

      // Run auto-assign algorithm simulation for the student
      const currentBoards = [...mockBoards];
      let assignedBoardId: string | null = null;
      let highestScore = -Infinity;

      for (const board of currentBoards) {
        // Appending to board
        const startAnchorTime = board.startAnchor;
        let currentMinutes = 0;
        const [h, m] = startAnchorTime.split(':').map(Number);
        currentMinutes = h * 60 + m;

        const startMin = currentMinutes;
        const endMin = startMin + mockStudent.duration;

        // Check blocked
        const blockedPrefs = (prefs || []).filter(p => p.preference_type === 'gesperrt' && p.day_of_week === board.dayOfWeek);
        let isBlocked = false;
        for (const pref of blockedPrefs) {
          const [psh, psm] = pref.start_time.split(':').map(Number);
          const [peh, pem] = pref.end_time.split(':').map(Number);
          const prefStart = psh * 60 + psm;
          const prefEnd = peh * 60 + pem;
          if (startMin < prefEnd && endMin > prefStart) {
            isBlocked = true;
            break;
          }
        }

        if (isBlocked) continue; // Skip blocked

        // Calculate score
        let score = 1000;
        const preferredPrefs = (prefs || []).filter(p => p.preference_type === 'wunsch' && p.day_of_week === board.dayOfWeek);
        let hasWunschOverlap = false;
        for (const pref of preferredPrefs) {
          const [psh, psm] = pref.start_time.split(':').map(Number);
          const [peh, pem] = pref.end_time.split(':').map(Number);
          const prefStart = psh * 60 + psm;
          const prefEnd = peh * 60 + pem;
          if (startMin < prefEnd && endMin > prefStart) {
            hasWunschOverlap = true;
            break;
          }
        }

        if (hasWunschOverlap) score += 10000;

        if (score > highestScore) {
          highestScore = score;
          assignedBoardId = board.id;
        }
      }

      // Tuesday was blocked between 15:00 and 17:00, and board-tue startAnchor is 15:00.
      // So Harry Potter should have been assigned to board-mon (Monday) where he has wunschzeiten.
      if (assignedBoardId !== 'board-mon') {
        throw new Error(`Expected student to be assigned to Monday board-mon due to Tuesday block, got: ${assignedBoardId}`);
      }
    });

    await runTest(6, 'Verify perfect match green overlap state resolver', async () => {
      // Simulate rendering a student card at Monday 14:00 (which is within his wunsch hours 14:00-16:00)
      const bs = {
        id: studentId,
        assignedTime: '14:00',
        duration: 45
      };

      const board = { dayOfWeek: 1 };
      const { data: prefs } = await supabase
        .from('student_schedule_preferences')
        .select('*')
        .eq('student_id', studentId);

      const [sh, sm] = bs.assignedTime.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = startMin + bs.duration;

      const wunschPrefs = (prefs || []).filter(p => p.preference_type === 'wunsch' && p.day_of_week === board.dayOfWeek);
      let isInsideWunsch = false;
      for (const pref of wunschPrefs) {
        const [psh, psm] = pref.start_time.split(':').map(Number);
        const [peh, pem] = pref.end_time.split(':').map(Number);
        const prefStart = psh * 60 + psm;
        const prefEnd = peh * 60 + pem;

        if (startMin < prefEnd && endMin > prefStart) {
          isInsideWunsch = true;
          break;
        }
      }

      if (!isInsideWunsch) {
        throw new Error('Expected card to be detected as inside preferred time');
      }
    });

    await runTest(7, 'Clean up test database records', async () => {
      await masterClient.from('student_schedule_preferences').delete().eq('student_id', studentId);
      await masterClient.from('students').delete().eq('id', studentId);
      await masterClient.from('users_raw').delete().in('id', [teacherId, studentId]);
      await masterClient.from('schools').delete().eq('id', testSchoolId);
    });

    console.log('================================================================');
    console.log('SUCCESS: ALL SCHEDULER & ONBOARDING HARDENING TESTS COMPLETED SUCCESSFULLY');
    console.log('================================================================');

  } catch (err) {
    // Attempt cleanup anyway
    await masterClient.from('student_schedule_preferences').delete().eq('student_id', studentId);
    await masterClient.from('students').delete().eq('id', studentId);
    await masterClient.from('users_raw').delete().in('id', [teacherId, studentId]);
    await masterClient.from('schools').delete().eq('id', testSchoolId);
    process.exit(1);
  }
}

// Global mock client export resolver
const supabase = masterClient;

main();
