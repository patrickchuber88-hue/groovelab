import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// 1. Load env variables
const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, '.env.local') });
dotenv.config({ path: path.resolve(cwd, 'apps/groovelab/.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Supabase URL or Anon Key is missing in environment variables.');
  process.exit(1);
}

// Check if dry-run is specified
const isDryRun = process.argv.includes('--dry-run');
const SIMULATION_DURATION_MS = isDryRun ? 30000 : 10 * 60 * 1000; // 30s or 10 min
const NUM_USERS_TO_SPAWN = isDryRun ? 5 : 250;

// Log file paths
const logFilePath = path.resolve(cwd, 'apps/groovelab/src/tests/simulation.log');
const summaryFilePath = path.resolve(cwd, 'apps/groovelab/src/tests/simulation_summary.json');

// Clear log file initially
fs.writeFileSync(logFilePath, '');

// Global state/metrics
let running = true;
let activeQueriesCount = 0;
let cleanedUp = false;
const startTimeGlobal = Date.now();

const metrics = {
  totalRequests: 0,
  successCount: 0,
  errorCount: 0,
  latencies: [] as number[],
  databaseExceptions: 0,
  rlsViolations: 0,
  validationFailures: 0,
  logicConflicts: 0,
  errorsByType: {} as Record<string, number>
};

// Log appending function
function appendLog(timestamp: string, role: string, userId: string, actionDescription: string, status: string, latency: number) {
  const line = `${timestamp} [${role}] [${userId}] ${actionDescription} -> ${status} (${latency}ms)\n`;
  fs.appendFileSync(logFilePath, line);
}

// Supabase client creator
function getClient(userId: string, schoolId: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: async (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set('x-user-id', userId);
        headers.set('x-invite-school-id', schoolId);
        return fetch(input, { ...init, headers });
      }
    }
  });
}

// Wrapper for tracking database query metrics
async function runDbQuery(
  client: any,
  role: string,
  userId: string,
  actionDescription: string,
  queryPromise: any
): Promise<any> {
  metrics.totalRequests++;
  activeQueriesCount++;
  const startTime = Date.now();
  let status = 'success';
  let latency = 0;
  let result: any = null;

  try {
    const { data, error } = await queryPromise;
    latency = Date.now() - startTime;
    metrics.latencies.push(latency);

    if (error) {
      status = `error: ${error.code || error.message}`;
      metrics.errorCount++;
      
      const errorMsg = (error.message || '').toLowerCase();
      const errorCode = error.code || '';
      
      // Categorize errors
      if (
        errorCode === '42501' || 
        errorMsg.includes('unauthorized') || 
        errorMsg.includes('policy') || 
        errorMsg.includes('permission') || 
        errorMsg.includes('nicht berechtigt')
      ) {
        metrics.rlsViolations++;
      } else if (
        errorCode === '23514' || 
        errorMsg.includes('check_') || 
        errorMsg.includes('constraint') || 
        errorMsg.includes('cannot modify') || 
        errorMsg.includes('cannot respond') || 
        errorMsg.includes('must match') || 
        errorMsg.includes('cannot request')
      ) {
        metrics.validationFailures++;
      } else {
        metrics.databaseExceptions++;
      }
      
      metrics.errorsByType[errorCode || 'UNKNOWN'] = (metrics.errorsByType[errorCode || 'UNKNOWN'] || 0) + 1;
    } else {
      metrics.successCount++;
      result = data;
    }
  } catch (err: any) {
    latency = Date.now() - startTime;
    metrics.latencies.push(latency);
    status = `exception: ${err.message || String(err)}`;
    metrics.errorCount++;
    metrics.databaseExceptions++;
    metrics.errorsByType['EXCEPTION'] = (metrics.errorsByType['EXCEPTION'] || 0) + 1;
  } finally {
    activeQueriesCount--;
    appendLog(new Date().toISOString(), role, userId, actionDescription, status, latency);
  }

  return result;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Temporary school variables
const tempSchoolId = crypto.randomUUID();
const masterClient = getClient('99999999-9999-9999-9999-999999999999', tempSchoolId);

const adminUsers: any[] = [];
const teacherUsers: any[] = [];
const studentUsers: any[] = [];

// Seed song IDs
const songIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
const activeEventId = crypto.randomUUID();

// Generate all users
console.log('Generating 250 temporary users profiles...');
for (let i = 0; i < 10; i++) {
  const role = i < 5 ? 'admin' : 'secretary';
  const id = crypto.randomUUID();
  adminUsers.push({
    id,
    school_id: tempSchoolId,
    role,
    first_name: `Admin_${i}`,
    last_name: `Test`,
    roles: [role],
    is_active: true,
    is_campus_active: true,
    is_groovelab_active: true
  });
}

for (let i = 0; i < 40; i++) {
  const id = crypto.randomUUID();
  teacherUsers.push({
    id,
    school_id: tempSchoolId,
    role: 'teacher',
    first_name: `Teacher_${i}`,
    last_name: `Test`,
    roles: ['teacher'],
    is_active: true,
    is_campus_active: true,
    is_groovelab_active: true
  });
}

for (let i = 0; i < 200; i++) {
  const id = crypto.randomUUID();
  studentUsers.push({
    id,
    school_id: tempSchoolId,
    role: 'student',
    first_name: `Student_${i}`,
    last_name: `Test`,
    roles: ['student'],
    is_active: true,
    is_campus_active: true,
    is_groovelab_active: true
  });
}

const allUsers = [...adminUsers, ...teacherUsers, ...studentUsers];

// User routine function
async function runUserRoutine(user: any) {
  const client = getClient(user.id, tempSchoolId);
  const role = user.role;
  const userId = user.id;

  while (running) {
    // Choose random sleep interval with jitter
    const minSleep = isDryRun ? 2000 : 10000;
    const maxSleep = isDryRun ? 5000 : 30000;
    const sleepTime = minSleep + Math.random() * (maxSleep - minSleep);
    await sleep(sleepTime);

    if (!running) break;

    try {
      if (role === 'student') {
        const choice = Math.floor(Math.random() * 4);
        if (choice === 0) {
          await runDbQuery(client, role, userId, 'Fetch profile', client.from('users').select('*').eq('id', userId));
        } else if (choice === 1) {
          await runDbQuery(client, role, userId, 'Fetch lessons', client.from('lessons').select('*').eq('student_id', userId));
        } else if (choice === 2) {
          await runDbQuery(client, role, userId, 'Fetch public campus events', client.from('campus_events').select('*').eq('school_id', tempSchoolId).eq('is_public', true));
        } else if (choice === 3) {
          const randomSongId = songIds[Math.floor(Math.random() * songIds.length)];
          const instruments = ['Guitar', 'Bass', 'Drums', 'Keys', 'Vocals'];
          const randomInstrument = instruments[Math.floor(Math.random() * instruments.length)];
          const progressPercent = Math.floor(Math.random() * 101);
          await runDbQuery(client, role, userId, 'Insert song skill', client.from('user_song_skills').insert({
            user_id: userId,
            song_id: randomSongId,
            instrument: randomInstrument,
            progress_percent: progressPercent,
            is_stage_ready: progressPercent >= 80
          }));
        }
      } else if (role === 'teacher') {
        const choice = Math.floor(Math.random() * 7);
        if (choice === 0) {
          await runDbQuery(client, role, userId, 'Fetch profile', client.from('users').select('*').eq('id', userId));
        } else if (choice === 1) {
          await runDbQuery(client, role, userId, 'Fetch lessons', client.from('lessons').select('*').eq('teacher_id', userId));
        } else if (choice === 2) {
          await runDbQuery(client, role, userId, 'Submit program point', client.from('campus_event_program_points').insert({
            event_id: activeEventId,
            school_id: tempSchoolId,
            teacher_id: userId,
            name: `Performance by Teacher ${userId.slice(0, 8)}`,
            duration: 15,
            instrument: 'Guitar'
          }));
        } else if (choice === 3) {
          const pps = await runDbQuery(client, role, userId, 'Fetch own program points for update', client.from('campus_event_program_points').select('id, name, duration, status').eq('teacher_id', userId));
          if (pps && pps.length > 0) {
            const pp = pps[Math.floor(Math.random() * pps.length)];
            if (pp.status !== 'approved') {
              await runDbQuery(client, role, userId, `Update program point name for ${pp.id.slice(0, 8)}`, client.from('campus_event_program_points').update({
                name: `Revised performance by Teacher ${userId.slice(0, 8)}`
              }).eq('id', pp.id));
            } else if (pp.status !== 'rejected') {
              await runDbQuery(client, role, userId, `Update program point duration for ${pp.id.slice(0, 8)}`, client.from('campus_event_program_points').update({
                duration: 20
              }).eq('id', pp.id));
            }
          }
        } else if (choice === 4) {
          await runDbQuery(client, role, userId, 'Query program points list', client.from('campus_event_program_points').select('*').eq('school_id', tempSchoolId));
        } else if (choice === 5) {
          const pps = await runDbQuery(client, role, userId, 'Fetch program points for feedback check', client.from('campus_event_program_points').select('id, additional_feedback_responses').eq('teacher_id', userId));
          if (pps) {
            const pendingPp = pps.find((p: any) => p.additional_feedback_responses?.status === 'pending' || p.additional_feedback_responses?.status === 'pending_response');
            if (pendingPp) {
              const questions = pendingPp.additional_feedback_responses.questions || [];
              const answers = questions.map(() => 'Simulated teacher feedback response');
              await runDbQuery(client, role, userId, `Respond to feedback request for ${pendingPp.id.slice(0, 8)}`, client.from('campus_event_program_points').update({
                additional_feedback_responses: {
                  ...pendingPp.additional_feedback_responses,
                  status: 'responded',
                  answers
                }
              }).eq('id', pendingPp.id));
            }
          }
        } else if (choice === 6) {
          const bandId = crypto.randomUUID();
          const bandName = `Band of Teacher ${userId.slice(0, 8)}`;
          const createdBand = await runDbQuery(client, role, userId, 'Create band', client.from('bands').insert({
            id: bandId,
            name: bandName,
            school_id: tempSchoolId,
            song_id: songIds[Math.floor(Math.random() * songIds.length)]
          }).select('id'));

          if (createdBand && createdBand.length > 0) {
            const randStudent1 = studentUsers[Math.floor(Math.random() * studentUsers.length)];
            const randStudent2 = studentUsers[Math.floor(Math.random() * studentUsers.length)];
            
            await runDbQuery(client, role, userId, `Add student 1 to band ${bandId.slice(0, 8)}`, client.from('band_members').insert({
              band_id: bandId,
              user_id: randStudent1.id,
              instrument: 'Drums'
            }));
            await runDbQuery(client, role, userId, `Add student 2 to band ${bandId.slice(0, 8)}`, client.from('band_members').insert({
              band_id: bandId,
              user_id: randStudent2.id,
              instrument: 'Bass'
            }));
          }
        }
      } else if (role === 'admin' || role === 'secretary') {
        const choice = Math.floor(Math.random() * 6);
        if (choice === 0) {
          await runDbQuery(client, role, userId, 'Fetch profile', client.from('users').select('*').eq('id', userId));
        } else if (choice === 1) {
          await runDbQuery(client, role, userId, 'List all program points', client.from('campus_event_program_points').select('*').eq('school_id', tempSchoolId));
        } else if (choice === 2) {
          const pps = await runDbQuery(client, role, userId, 'Fetch program points for approval/rejection', client.from('campus_event_program_points').select('id, status').eq('school_id', tempSchoolId).eq('status', 'submitted'));
          if (pps && pps.length > 0) {
            const pp = pps[Math.floor(Math.random() * pps.length)];
            const status = Math.random() > 0.3 ? 'approved' : 'rejected';
            await runDbQuery(client, role, userId, `Transition program point ${pp.id.slice(0, 8)} status to ${status}`, client.from('campus_event_program_points').update({
              status
            }).eq('id', pp.id));
          }
        } else if (choice === 3) {
          const newStageCount = Math.floor(Math.random() * 3) + 2;
          await runDbQuery(client, role, userId, `Configure event settings (stages: ${newStageCount})`, client.from('campus_events').update({
            stage_count: newStageCount,
            total_duration: 240
          }).eq('id', activeEventId));
        } else if (choice === 4) {
          const pps = await runDbQuery(client, role, userId, 'Fetch approved, unscheduled program points', client.from('campus_event_program_points').select('id, status, is_scheduled, teacher_id').eq('school_id', tempSchoolId).eq('status', 'approved').eq('is_scheduled', false));
          if (pps && pps.length > 0) {
            const pp = pps[Math.floor(Math.random() * pps.length)];
            const teacherId = pp.teacher_id;

            // --- LOCAL CHECK FOR LOGIC CONFLICT (R2) ---
            let conflictDetected = false;
            
            // Check if already scheduled at that time on a different stage
            const scheduledPps = await runDbQuery(client, role, userId, 'Fetch scheduled program points for conflict check', client.from('campus_event_program_points').select('id, teacher_id, stage_number, is_scheduled').eq('school_id', tempSchoolId).eq('is_scheduled', true));
            if (scheduledPps) {
              const alreadyScheduledOnDiffStage = scheduledPps.some((s: any) => s.teacher_id === teacherId);
              if (alreadyScheduledOnDiffStage) {
                conflictDetected = true;
              }
            }

            // Check if they have a lesson conflict (represented by any lesson exist for teacher)
            const teacherLessons = await runDbQuery(client, role, userId, 'Fetch lessons for conflict check', client.from('lessons').select('id, date, teacher_id').eq('teacher_id', teacherId));
            if (teacherLessons && teacherLessons.length > 0) {
              conflictDetected = true;
            }

            if (conflictDetected) {
              metrics.logicConflicts++;
              appendLog(new Date().toISOString(), role, userId, `Local check: conflict detected for scheduling teacher ${teacherId?.slice(0, 8)}`, 'conflict_incremented', 0);
            }
            // --------------------------------------------

            // Schedule approved program point
            const targetStage = Math.floor(Math.random() * 3) + 1;
            const targetSortOrder = Math.floor(Math.random() * 10) + 1;
            await runDbQuery(client, role, userId, `Schedule program point ${pp.id.slice(0, 8)} to stage ${targetStage}`, client.from('campus_event_program_points').update({
              is_scheduled: true,
              stage_number: targetStage,
              sort_order: targetSortOrder
            }).eq('id', pp.id));
          }
        } else if (choice === 5) {
          const pps = await runDbQuery(client, role, userId, 'Fetch approved program points to request feedback', client.from('campus_event_program_points').select('id, status').eq('school_id', tempSchoolId).eq('status', 'approved'));
          if (pps && pps.length > 0) {
            const pp = pps[Math.floor(Math.random() * pps.length)];
            await runDbQuery(client, role, userId, `Request feedback on program point ${pp.id.slice(0, 8)}`, client.from('campus_event_program_points').update({
              additional_feedback_responses: {
                status: 'pending',
                questions: ['How was the sound?', 'Was the duration appropriate?']
              }
            }).eq('id', pp.id));
          }
        }
      }
    } catch (err) {
      console.error(`Exception in user routine for ${userId} (${role}):`, err);
    }
  }
}

// Reusable cleanup helper to delete users first to satisfy audit_logs school_id foreign key constraint, then delete the school.
async function deleteSchoolAndData(client: any, schoolId: string) {
  console.log(`Deleting temporary users for school: ${schoolId}...`);
  const { error: usersDeleteErr } = await client.from('users').delete().eq('school_id', schoolId);
  if (usersDeleteErr) {
    console.error('Failed to delete temporary users:', usersDeleteErr);
  } else {
    console.log('Temporary users deleted successfully.');
  }

  console.log(`Deleting temporary school UUID: ${schoolId}...`);
  const { error: deleteErr } = await client.from('schools').delete().eq('id', schoolId);
  if (deleteErr) {
    console.error('Failed to delete temporary school:', deleteErr);
    return false;
  } else {
    console.log('Temporary school and all cascaded data successfully deleted.');
    return true;
  }
}

// Cleanup execution helper
async function runCleanup() {
  if (cleanedUp) return;
  cleanedUp = true;

  console.log('\n======================================');
  console.log('Initiating Simulation Cleanup Phase...');
  console.log('======================================');

  running = false;

  console.log(`Waiting for ${activeQueriesCount} active queries to finish...`);
  while (activeQueriesCount > 0) {
    await sleep(200);
  }

  await deleteSchoolAndData(masterClient, tempSchoolId);

  const durationSeconds = (Date.now() - startTimeGlobal) / 1000;
  const throughput = metrics.totalRequests / (durationSeconds || 1);

  const sortedLatencies = [...metrics.latencies].sort((a, b) => a - b);
  const averageLatency = metrics.latencies.reduce((sum, val) => sum + val, 0) / (metrics.latencies.length || 1);
  const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)] || 0;
  const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0;
  const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] || 0;

  const summary = {
    totalRequests: metrics.totalRequests,
    successCount: metrics.successCount,
    errorCount: metrics.errorCount,
    throughput: parseFloat(throughput.toFixed(2)),
    averageLatencyMs: parseFloat(averageLatency.toFixed(2)),
    p50LatencyMs: p50,
    p95LatencyMs: p95,
    p99LatencyMs: p99,
    errorBreakdown: {
      databaseExceptions: metrics.databaseExceptions,
      rlsViolations: metrics.rlsViolations,
      validationFailures: metrics.validationFailures
    },
    logicConflicts: metrics.logicConflicts,
    errorsByType: metrics.errorsByType
  };

  fs.writeFileSync(summaryFilePath, JSON.stringify(summary, null, 2));
  console.log(`Summary JSON written to: ${summaryFilePath}`);

  console.log('\nSimulation Summary:');
  console.log('-------------------');
  console.log(`Total Requests:    ${summary.totalRequests}`);
  console.log(`Success Count:     ${summary.successCount}`);
  console.log(`Error Count:       ${summary.errorCount}`);
  console.log(`Throughput (req/s): ${summary.throughput}`);
  console.log(`Average Latency:   ${summary.averageLatencyMs}ms`);
  console.log(`p50 Latency:       ${summary.p50LatencyMs}ms`);
  console.log(`p95 Latency:       ${summary.p95LatencyMs}ms`);
  console.log(`p99 Latency:       ${summary.p99LatencyMs}ms`);
  console.log(`Logic Conflicts:   ${summary.logicConflicts}`);
  console.log('Error Breakdown:');
  console.log(`  RLS Violations:      ${summary.errorBreakdown.rlsViolations}`);
  console.log(`  Validation Failures: ${summary.errorBreakdown.validationFailures}`);
  console.log(`  DB Exceptions:       ${summary.errorBreakdown.databaseExceptions}`);
  console.log('======================================\n');

  process.exit(0);
}

// Orchestrator start
async function main() {
  console.log('Starting Load and Logic Simulation...');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'PRODUCTION'}`);
  console.log(`Duration: ${SIMULATION_DURATION_MS / 1000} seconds`);
  console.log(`Spawning users: ${NUM_USERS_TO_SPAWN}`);
  console.log(`Temp School ID: ${tempSchoolId}`);

  // Provisioning
  console.log('Provisioning temporary school...');
  const { error: schoolErr } = await masterClient.from('schools').insert({
    id: tempSchoolId,
    name: `Load Test Academy ${tempSchoolId.slice(0, 8)}`,
    primary_color: '#3b82f6'
  });
  if (schoolErr) {
    console.error('Failed to insert temporary school:', schoolErr);
    process.exit(1);
  }

  console.log(`Inserting ${allUsers.length} users into public.users view...`);
  const batchSize = 50;
  for (let i = 0; i < allUsers.length; i += batchSize) {
    const batch = allUsers.slice(i, i + batchSize);
    const { error: insertErr } = await masterClient.from('users').insert(batch);
    if (insertErr) {
      console.error(`Failed to insert user batch starting at index ${i}:`, insertErr);
      await deleteSchoolAndData(masterClient, tempSchoolId);
      process.exit(1);
    }
  }

  console.log('Inserting seed records...');
  const songsData = songIds.map((id, index) => ({
    id,
    school_id: tempSchoolId,
    artist: `Artist_${index}`,
    title: `Song_${index}`
  }));
  const { error: songsErr } = await masterClient.from('songs').insert(songsData);
  if (songsErr) {
    console.error('Failed to insert seed songs:', songsErr);
    await deleteSchoolAndData(masterClient, tempSchoolId);
    process.exit(1);
  }

  const { error: eventErr } = await masterClient.from('campus_events').insert({
    id: activeEventId,
    school_id: tempSchoolId,
    title: 'Active Load Test Event',
    event_date: '2026-07-01',
    start_time: '14:00:00',
    end_time: '18:00:00',
    category: 'Konzert',
    created_by: adminUsers[0].id,
    is_public: true,
    visibility: 'all',
    stage_count: 3
  });
  if (eventErr) {
    console.error('Failed to insert seed event:', eventErr);
    await deleteSchoolAndData(masterClient, tempSchoolId);
    process.exit(1);
  }

  const lessonsData: any[] = [];
  for (let i = 0; i < 20; i++) {
    const teacher = teacherUsers[i % teacherUsers.length];
    const student = studentUsers[i % studentUsers.length];
    lessonsData.push({
      id: crypto.randomUUID(),
      teacher_id: teacher.id,
      student_id: student.id,
      school_id: tempSchoolId,
      date: '2026-06-25',
      start_time: `10:00:00`,
      duration: 45,
      status: 'scheduled'
    });
  }
  const { error: lessonsErr } = await masterClient.from('lessons').insert(lessonsData);
  if (lessonsErr) {
    console.error('Failed to insert seed lessons:', lessonsErr);
    await deleteSchoolAndData(masterClient, tempSchoolId);
    process.exit(1);
  }
  
  console.log('Provisioning completed successfully.');

  // Trap signals
  process.on('SIGINT', () => {
    console.log('\nSIGINT received.');
    runCleanup().catch(console.error);
  });
  process.on('SIGTERM', () => {
    console.log('\nSIGTERM received.');
    runCleanup().catch(console.error);
  });

  // Set timeout for end of simulation
  setTimeout(() => {
    console.log('\nSimulation duration completed.');
    runCleanup().catch(console.error);
  }, SIMULATION_DURATION_MS);

  // Spawn users routines
  console.log(`Spawning ${NUM_USERS_TO_SPAWN} parallel user routines...`);
  const spawnedUsers = allUsers.slice(0, NUM_USERS_TO_SPAWN);
  for (const user of spawnedUsers) {
    runUserRoutine(user).catch(err => {
      console.error(`Fatal error in routine for user ${user.id}:`, err);
    });
  }
}

main().catch(async (err) => {
  console.error('Fatal error during initialization:', err);
  await deleteSchoolAndData(masterClient, tempSchoolId);
  process.exit(1);
});
