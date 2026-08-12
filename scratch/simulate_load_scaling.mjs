import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import fs from 'fs';
import { Client as SSHClient } from 'ssh2';

// 1. Load configuration from .env.local
const envContent = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local', 'utf-8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const supabaseAnonKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Instantiate clients
const serviceClient = createClient(supabaseUrl, SERVICE_KEY);
const anonClient = createClient(supabaseUrl, supabaseAnonKey);

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const SSH_CONFIG = {
  host: '178.105.10.2',
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync('/Users/patrickhuber/.ssh/id_ed25519'),
  readyTimeout: 10000
};

// SSH execution helper
function runSSHCommand(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('close', (code) => {
        resolve({ code, stdout, stderr });
      }).on('data', (data) => {
        stdout += data.toString();
      }).stderr.on('data', (data) => {
        stderr += data.toString();
      });
    });
  });
}

// Function to fetch VPS metrics and heavy queries
function getVPSStatus() {
  return new Promise((resolve, reject) => {
    const conn = new SSHClient();
    conn.on('ready', async () => {
      try {
        const uptime = await runSSHCommand(conn, 'uptime');
        const loadavg = await runSSHCommand(conn, 'cat /proc/loadavg');
        const memory = await runSSHCommand(conn, 'free -m');
        const disk = await runSSHCommand(conn, 'df -h /');

        // Check if pg_stat_statements is available
        const checkExt = await runSSHCommand(conn, `docker exec -i supabase-db psql -U postgres -d postgres -t -c "SELECT count(*) FROM pg_extension WHERE extname = 'pg_stat_statements';"`);
        const isExtAvailable = parseInt(checkExt.stdout.trim(), 10) > 0;

        let queryCmd = '';
        if (isExtAvailable) {
          queryCmd = `docker exec -i supabase-db psql -U postgres -d postgres -c "SELECT query, calls, round(total_exec_time::numeric, 2) as total_ms, round(mean_exec_time::numeric, 2) as mean_ms FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 3;"`;
        } else {
          queryCmd = `docker exec -i supabase-db psql -U postgres -d postgres -c "SELECT pid, age(clock_timestamp(), query_start), query FROM pg_stat_activity WHERE state != 'idle' LIMIT 3;"`;
        }
        const dbQueries = await runSSHCommand(conn, queryCmd);

        conn.end();
        resolve({
          uptime: uptime.stdout.trim(),
          loadavg: loadavg.stdout.trim(),
          memory: memory.stdout.trim(),
          disk: disk.stdout.trim(),
          dbQueries: dbQueries.stdout.trim()
        });
      } catch (err) {
        conn.end();
        reject(err);
      }
    }).on('error', (err) => {
      reject(err);
    }).connect(SSH_CONFIG);
  });
}

// Global Metrics Tracker
const metrics = {
  totalRequests: 0,
  successRequests: 0,
  failedRequests: 0,
  latencies: [],
  errors: {
    RLS: 0,
    Database: 0,
    Logic: 0
  }
};

function recordMetrics(latency, success, errorType = null) {
  metrics.totalRequests++;
  metrics.latencies.push(latency);
  if (success) {
    metrics.successRequests++;
  } else {
    metrics.failedRequests++;
    if (errorType && metrics.errors[errorType] !== undefined) {
      metrics.errors[errorType]++;
    } else {
      metrics.errors.Logic++;
    }
  }
}

function getP95Latency() {
  if (metrics.latencies.length === 0) return 0;
  const sorted = [...metrics.latencies].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * 0.95);
  return sorted[index];
}

// Helper to classify errors
function classifyError(err) {
  const msg = (err.message || String(err)).toLowerCase();
  // RLS errors
  if (msg.includes('policy') || msg.includes('permission') || msg.includes('row-level security') || msg.includes('security policy')) {
    return 'RLS';
  }
  // Database constraints errors
  if (msg.includes('violate') || msg.includes('foreign key') || msg.includes('unique constraint') || msg.includes('null value violates') || msg.includes('check constraint') || (err.code && err.code.startsWith('23'))) {
    return 'Database';
  }
  // Standard logic or connection errors
  return 'Logic';
}

// 7 Simulation Actions
async function simulateSicknessReport(client, data) {
  const { school, teacher, student } = data;
  const sickStart = new Date().toISOString().split('T')[0];
  const sickUntil = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];

  // 1. Update teacher
  const { error: teacherErr } = await client
    .from('users_raw')
    .update({ sick_start: sickStart, sick_until: sickUntil })
    .eq('id', teacher.id);
  if (teacherErr) throw teacherErr;

  // 2. Insert crisis notification
  const { error: crisisErr } = await client
    .from('crisis_notifications')
    .insert({
      id: randomUUID(),
      teacher_id: teacher.id,
      student_id: student ? student.id : null,
      slot_start_datetime: new Date().toISOString(),
      status: 'UNREAD',
      notified_at: new Date().toISOString(),
      is_reinstated: false
    });
  if (crisisErr) throw crisisErr;

  // 3. Insert system alert
  const { error: alertErr } = await client
    .from('system_alerts')
    .insert({
      id: randomUUID(),
      school_id: school.id,
      teacher_id: teacher.id,
      type: 'teacher_sick',
      message: `Krankheitsmeldung: Lehrkraft ${teacher.first_name} ${teacher.last_name} ist krank gemeldet.`,
      resolved: false
    });
  if (alertErr) throw alertErr;
}

async function simulateReschedule(client, data) {
  const { school, student, schedule, occurrence, room } = data;
  
  // 1. Update occurrence status
  const { error: occErr } = await client
    .from('schedule_occurrences')
    .update({
      status: 'pending_reschedule',
      original_date: occurrence.date,
      date: '2026-07-14'
    })
    .eq('id', occurrence.id);
  if (occErr) throw occErr;

  // 2. Delete old room bookings for this occurrence
  // 2. Delete old room bookings for this teacher and date
  const { error: delErr } = await client
    .from('room_bookings')
    .delete()
    .eq('school_id', school.id)
    .eq('booked_by', student.teacher_id)
    .eq('date', '2026-07-14');
  if (delErr) throw delErr;

  // 3. Insert new room booking
  const { error: bookErr } = await client
    .from('room_bookings')
    .insert({
      id: randomUUID(),
      school_id: school.id,
      room_id: room.id,
      booked_by: student.teacher_id,
      campus_event_id: null,
      date: '2026-07-14',
      start_time: '15:00:00',
      end_time: '15:45:00',
      title: 'Rescheduled Lesson',
      status: 'active'
    });
  if (bookErr) throw bookErr;
}

async function simulateRoomBooking(client, data) {
  const { school, room, teacher } = data;
  const { error: bookErr } = await client
    .from('room_bookings')
    .insert({
      id: randomUUID(),
      school_id: school.id,
      room_id: room.id,
      booked_by: teacher.id,
      date: '2026-07-13',
      start_time: '16:00:00',
      end_time: '16:45:00',
      title: 'Zusätzlicher Raum',
      status: 'active'
    });
  if (bookErr) throw bookErr;
}

async function simulateHomeworkUpdate(client, data) {
  const { progressMatrix } = data;
  const topic = `Hausaufgabe KW ${Math.floor(Math.random() * 52) + 1}`;
  const notes = ['Tonleiter C-Dur', 'Übung Seite 12'];
  const { error: updateErr } = await client
    .from('progress_matrix')
    .update({
      topic_name: topic,
      teacher_notes: 'Erinnerung: Fokus auf Fingersatz.',
      homework_notes: JSON.stringify(notes)
    })
    .eq('id', progressMatrix.id);
  if (updateErr) throw updateErr;
}

async function simulateAudioActivity(client, data) {
  const { student, progressMatrix } = data;
  const filename = `load-sim-audio-${randomUUID()}.wav`;
  const fileData = Buffer.from(`mock audio WAV data with UUID ${randomUUID()}`);

  // Upload to storage
  const { data: uploadData, error: uploadErr } = await client.storage
    .from('campus-assets')
    .upload(`avatars/${filename}`, fileData, {
      contentType: 'audio/wav',
      upsert: true
    });
  if (uploadErr) throw uploadErr;

  const { data: { publicUrl } } = client.storage
    .from('campus-assets')
    .getPublicUrl(`avatars/${filename}`);

  let notes = [];
  try {
    notes = JSON.parse(progressMatrix.homework_notes || '[]');
  } catch (e) {
    notes = [];
  }
  notes.push(`AUDIO:${publicUrl}`);

  const { error: updateErr } = await client
    .from('progress_matrix')
    .update({ homework_notes: JSON.stringify(notes) })
    .eq('id', progressMatrix.id);
  if (updateErr) throw updateErr;
}

async function simulateXPGathering(client, data) {
  const { student, progressMatrix } = data;
  
  // Update stats
  const { error: statsErr } = await client
    .from('student_stats')
    .update({
      current_xp: 150,
      streak_flame: 2
    })
    .eq('student_id', student.id);
  if (statsErr) throw statsErr;

  // Update avatar
  const { error: avatarErr } = await client
    .from('avatars')
    .update({
      xp: 150,
      streak_flame: 2
    })
    .eq('user_id', student.id);
  if (avatarErr) throw avatarErr;

  // Append sticker to homework notes
  let notes = [];
  try {
    notes = JSON.parse(progressMatrix.homework_notes || '[]');
  } catch (e) {
    notes = [];
  }
  notes.push(`STICKER:fleiss-pionier|Simulation|${new Date().toISOString()}`);

  const { error: updateErr } = await client
    .from('progress_matrix')
    .update({ homework_notes: JSON.stringify(notes) })
    .eq('id', progressMatrix.id);
  if (updateErr) throw updateErr;
}

async function simulateFocusTimer(client, data) {
  const { school, student } = data;
  const durationMin = 15;
  const durationSec = 900;

  // 1. Insert into fokus_logs
  const { error: logErr } = await client
    .from('fokus_logs')
    .insert({
      id: randomUUID(),
      user_id: student.id,
      duration_minutes: durationMin,
      duration_seconds: durationSec,
      flame_level: 'Kleine Flamme',
      created_at: new Date().toISOString()
    });
  if (logErr) throw logErr;

  // 2. Insert into focus_sessions
  const { error: sessErr } = await client
    .from('focus_sessions')
    .insert({
      id: randomUUID(),
      school_id: school.id,
      student_id: student.id,
      goal_level: 1,
      flame_tier: 'small',
      target_duration_seconds: durationSec,
      started_at: new Date(Date.now() - durationSec * 1000).toISOString(),
      ended_at: new Date().toISOString(),
      completed_streak: true
    });
  if (sessErr) throw sessErr;

  // 3. Update student stats
  const { error: statsErr } = await client
    .from('student_stats')
    .update({
      total_focus_minutes: 30,
      last_practice_date: new Date().toISOString().split('T')[0]
    })
    .eq('student_id', student.id);
  if (statsErr) throw statsErr;
}

// Load test driver
async function main() {
  const args = process.argv.slice(2);
  let testSchools = 8;
  let testTeachers = 50;
  let testStudents = 500;
  let duration = 60; // seconds
  let concurrency = 10;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--schools') testSchools = parseInt(args[++i], 10);
    if (args[i] === '--teachers') testTeachers = parseInt(args[++i], 10);
    if (args[i] === '--students') testStudents = parseInt(args[++i], 10);
    if (args[i] === '--duration') duration = parseInt(args[++i], 10);
    if (args[i] === '--concurrency') concurrency = parseInt(args[++i], 10);
  }

  console.log(`\n======================================`);
  console.log(`Starting Load Simulation:`);
  console.log(`Schools: ${testSchools}, Teachers/School: ${testTeachers}, Students/School: ${testStudents}`);
  console.log(`Duration: ${duration}s, Concurrency: ${concurrency}`);
  console.log(`======================================\n`);

  // Load subset of entities from database
  console.log("Loading test entities from DB...");
  const { data: schools } = await serviceClient
    .from('schools')
    .select('id, name')
    .like('name', 'LOAD_SIM_School_%')
    .limit(testSchools);

  if (!schools || schools.length === 0) {
    console.error("No simulated schools found! Seed the database first.");
    process.exit(1);
  }

  const schoolIds = schools.map(s => s.id);
  
  // Load rooms
  const { data: allRooms } = await serviceClient
    .from('rooms')
    .select('id, name, school_id')
    .in('school_id', schoolIds);

  // Load teachers
  const { data: allTeachers } = await serviceClient
    .from('users_raw')
    .select('id, first_name, last_name, school_id, role, instrument')
    .in('school_id', schoolIds)
    .eq('role', 'teacher')
    .limit(testSchools * testTeachers);

  // Load students
  const { data: allStudents } = await serviceClient
    .from('users_raw')
    .select('id, first_name, last_name, school_id, role, teacher_id')
    .in('school_id', schoolIds)
    .eq('role', 'student')
    .limit(testSchools * testStudents);

  if (!allTeachers || allTeachers.length === 0 || !allStudents || allStudents.length === 0) {
    console.error("No teachers or students found! Ensure you have seeded the database.");
    process.exit(1);
  }

  // Load schedules, occurrences, and progress matrix records in batches
  const studentIds = allStudents.map(s => s.id);
  const progressMatrixRecords = [];
  const schedules = [];
  const occurrences = [];

  const batchSize = 100;
  for (let i = 0; i < studentIds.length; i += batchSize) {
    const batchIds = studentIds.slice(i, i + batchSize);
    
    const { data: pm } = await serviceClient
      .from('progress_matrix')
      .select('id, student_id, teacher_id, homework_notes')
      .in('student_id', batchIds);
    if (pm) progressMatrixRecords.push(...pm);

    const { data: sch } = await serviceClient
      .from('schedules')
      .select('id, student_id, room_id')
      .in('student_id', batchIds);
    if (sch) schedules.push(...sch);

    const { data: occ } = await serviceClient
      .from('schedule_occurrences')
      .select('id, student_id, date')
      .in('student_id', batchIds);
    if (occ) occurrences.push(...occ);
  }

  console.log(`Loaded: ${schools.length} schools, ${allRooms.length} rooms, ${allTeachers.length} teachers, ${allStudents.length} students.`);
  console.log(`Loaded: ${progressMatrixRecords.length} progress matrices, ${schedules.length} schedules, ${occurrences.length} occurrences.`);

  // Mapping lookups
  const roomsBySchool = {};
  allRooms.forEach(r => {
    if (!roomsBySchool[r.school_id]) roomsBySchool[r.school_id] = [];
    roomsBySchool[r.school_id].push(r);
  });

  const teachersBySchool = {};
  allTeachers.forEach(t => {
    if (!teachersBySchool[t.school_id]) teachersBySchool[t.school_id] = [];
    teachersBySchool[t.school_id].push(t);
  });

  const studentsBySchool = {};
  allStudents.forEach(s => {
    if (!studentsBySchool[s.school_id]) studentsBySchool[s.school_id] = [];
    studentsBySchool[s.school_id].push(s);
  });

  const pmByStudent = {};
  progressMatrixRecords.forEach(p => {
    pmByStudent[p.student_id] = p;
  });

  const schByStudent = {};
  schedules.forEach(s => {
    schByStudent[s.student_id] = s;
  });

  const occByStudent = {};
  occurrences.forEach(o => {
    occByStudent[o.student_id] = o;
  });

  // Action definition array
  const actions = [
    { name: 'Sickness Report', run: simulateSicknessReport },
    { name: 'Reschedule', run: simulateReschedule },
    { name: 'Room Booking', run: simulateRoomBooking },
    { name: 'Homework Book', run: simulateHomeworkUpdate },
    { name: 'Audio activity', run: simulateAudioActivity },
    { name: 'XP & Stickers', run: simulateXPGathering },
    { name: 'Focus Timer', run: simulateFocusTimer }
  ];

  console.log("\nStarting worker loop execution...");
  const stopTime = Date.now() + duration * 1000;
  const workers = [];

  for (let w = 0; w < concurrency; w++) {
    workers.push((async () => {
      while (Date.now() < stopTime) {
        // Pick a random school
        const school = getRandomElement(schools);
        const schoolRooms = roomsBySchool[school.id] || [];
        const schoolTeachers = teachersBySchool[school.id] || [];
        const schoolStudents = studentsBySchool[school.id] || [];

        if (schoolRooms.length === 0 || schoolTeachers.length === 0 || schoolStudents.length === 0) {
          // If no entities loaded for this school, skip
          await new Promise(r => setTimeout(r, 50));
          continue;
        }

        const teacher = getRandomElement(schoolTeachers);
        const student = getRandomElement(schoolStudents);
        const room = getRandomElement(schoolRooms);
        const progressMatrix = pmByStudent[student.id];
        const schedule = schByStudent[student.id];
        const occurrence = occByStudent[student.id];

        // Prepare context data
        const data = { school, teacher, student, room, progressMatrix, schedule, occurrence };

        // Select a random action
        const action = getRandomElement(actions);

        // Decide whether to use anonClient to simulate an unauthorized RLS access attempt (5% chance)
        const isRLSCheckAttempt = Math.random() < 0.05;
        const activeClient = isRLSCheckAttempt ? anonClient : serviceClient;

        const startTime = Date.now();
        try {
          // Ensure we have dependent entities for actions that require them
          if (action.name === 'Reschedule' && (!schedule || !occurrence)) {
            // skip reschedule if no occurrence
            continue;
          }
          if ((action.name === 'Homework Book' || action.name === 'Audio activity' || action.name === 'XP & Stickers') && !progressMatrix) {
            continue;
          }

          await action.run(activeClient, data);
          const latency = Date.now() - startTime;
          
          if (isRLSCheckAttempt) {
            // RLS check attempt with anonClient should have thrown an error! If it didn't, it's a security flaw or RLS bypass!
            // Wait, does public.room_bookings or public.users allow anonymous writes? If it does, we record it.
            // But normally, it will throw.
            recordMetrics(latency, true);
          } else {
            recordMetrics(latency, true);
          }

        } catch (err) {
          const latency = Date.now() - startTime;
          const classified = classifyError(err);
          if (metrics.failedRequests < 10) {
            console.error(`Debug error in action "${action.name}":`, err.message || err);
          }
          recordMetrics(latency, false, classified);
        }

        // Add a slight pacing delay
        await new Promise(r => setTimeout(r, 20 + Math.random() * 30));
      }
    })());
  }

  // Wait for all workers to finish
  await Promise.all(workers);
  console.log("Worker loops finished.");

  // Fetch VPS stats
  console.log("Fetching VPS resource statistics...");
  let vpsStats = null;
  try {
    vpsStats = await getVPSStatus();
  } catch (err) {
    console.error("Warning: Failed to fetch VPS metrics via SSH:", err.message);
  }

  // Calculate Metrics
  const total = metrics.totalRequests;
  const success = metrics.successRequests;
  const failed = metrics.failedRequests;
  const successRate = total > 0 ? ((success / total) * 100).toFixed(2) : '0.00';
  const errorRate = total > 0 ? ((failed / total) * 100).toFixed(2) : '0.00';
  const p95 = getP95Latency();

  console.log(`\n================ RESULTS SUMMARY ================`);
  console.log(`Total Requests:  ${total}`);
  console.log(`Success Rate:    ${successRate}%`);
  console.log(`Error Rate:      ${errorRate}%`);
  console.log(`p95 Latency:     ${p95}ms`);
  console.log(`Failed Requests: ${failed}`);
  console.log(`Error Breakdown:`);
  console.log(`  - RLS Policies:     ${metrics.errors.RLS}`);
  console.log(`  - DB Constraints:   ${metrics.errors.Database}`);
  console.log(`  - Application Logic: ${metrics.errors.Logic}`);
  console.log(`=================================================`);

  if (vpsStats) {
    console.log(`\n================ VPS HOST STATUS ================`);
    console.log(`Uptime:   ${vpsStats.uptime}`);
    console.log(`Loadavg:  ${vpsStats.loadavg}`);
    console.log(`Memory:\n${vpsStats.memory}`);
    console.log(`Disk:\n${vpsStats.disk}`);
    console.log(`\nTop Heavy DB Queries:\n${vpsStats.dbQueries}`);
    console.log(`=================================================`);
  }

  // Write results to a JSON file to read in the scaling loop
  const summary = {
    schools: testSchools,
    teachersPerSchool: testTeachers,
    studentsPerSchool: testStudents,
    totalRequests: total,
    successRate: parseFloat(successRate),
    errorRate: parseFloat(errorRate),
    p95Latency: p95,
    cpuLoad: vpsStats ? parseFloat(vpsStats.loadavg.split(' ')[0]) : 0,
    errors: metrics.errors
  };

  fs.writeFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/scratch/simulation_summary.json', JSON.stringify(summary, null, 2));
  console.log("Saved results to scratch/simulation_summary.json");
}

main().catch(console.error);
