import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { Client as SSHClient } from 'ssh2';
import fs from 'fs';

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';
const supabase = createClient('https://supabase.campus-groovelab.de', SERVICE_KEY);

const firstNames = ['Mia', 'Ben', 'Emma', 'Jonas', 'Sofia', 'Leon', 'Hannah', 'Finn', 'Lea', 'Noah', 'Paul', 'Emily', 'Luis', 'Lina', 'Lukas', 'Marie', 'Felix', 'Sophia', 'Maximilian', 'Anna'];
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function run() {
  const args = process.argv.slice(2);
  let numSchools = 8;
  let teachersPerSchool = 50;
  let studentsPerSchool = 500;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--schools') numSchools = parseInt(args[++i], 10);
    if (args[i] === '--teachers') teachersPerSchool = parseInt(args[++i], 10);
    if (args[i] === '--students') studentsPerSchool = parseInt(args[++i], 10);
  }

  console.log(`Generating mock data: ${numSchools} schools, ${teachersPerSchool} teachers/school, ${studentsPerSchool} students/school`);

  // First, let's verify if there is any clean up needed or if we should skip school creation if already exists.
  // We identify simulated schools by name starting with 'LOAD_SIM_School_'
  console.log("Checking for existing simulation data...");
  const { data: existingSchools, error: escErr } = await supabase
    .from('schools')
    .select('id, name')
    .like('name', 'LOAD_SIM_School_%');

  if (escErr) {
    console.error("Error checking schools:", escErr.message);
    process.exit(1);
  }

  if (existingSchools && existingSchools.length >= numSchools) {
    const schoolIds = existingSchools.map(s => s.id);
    const { count: teacherCount } = await supabase
      .from('users_raw')
      .select('*', { count: 'exact', head: true })
      .in('school_id', schoolIds)
      .eq('role', 'teacher');

    const { count: studentCount } = await supabase
      .from('users_raw')
      .select('*', { count: 'exact', head: true })
      .in('school_id', schoolIds)
      .eq('role', 'student');

    console.log(`Database already has ${existingSchools.length} simulated schools, ${teacherCount} teachers, ${studentCount} students.`);
    if (existingSchools.length === numSchools && teacherCount === (numSchools * teachersPerSchool) && studentCount === (numSchools * studentsPerSchool)) {
      console.log("Required mock dataset already present. Skipping generation.");
      return;
    }
    console.log("Mock data counts differ. Re-generating...");
  }

  // Purge old simulation data first
  await cleanupOldSimulationData();

  console.log("Generating schools...");
  const schoolsToInsert = [];
  for (let i = 1; i <= numSchools; i++) {
    schoolsToInsert.push({
      id: randomUUID(),
      name: `LOAD_SIM_School_${i}`,
      subdomain: `load-sim-school-${i}`,
      zip_code: '79713',
      city: 'Bad Säckingen',
      street: 'Simulation Street',
      house_number: String(i),
      phone_number: '0151 58568651',
      email: `admin@load-sim-school-${i}.de`,
      has_campus_subscription: true,
      has_groovelab_subscription: true,
      has_kombi_discount: true,
      subscription_type: 'standard',
      status: 'active',
      limits_enabled: false,
      is_billing_booked: true,
      student_billing_option: 'option2',
      extra_billing_option: 'option1',
      contract_start_date: new Date().toISOString(),
      campus_activated_this_month: true,
      groovelab_activated_this_month: true
    });
  }

  const { data: schools, error: schErr } = await supabase
    .from('schools')
    .insert(schoolsToInsert)
    .select();

  if (schErr) {
    console.error("❌ Failed to insert schools:", schErr.message);
    process.exit(1);
  }
  console.log(`Inserted ${schools.length} schools.`);

  for (let sIdx = 0; sIdx < schools.length; sIdx++) {
    const school = schools[sIdx];
    console.log(`\nProcessing school: ${school.name} (ID: ${school.id})`);

    // 1. Generate Rooms (5 per school)
    const roomsToInsert = [];
    for (let r = 1; r <= 5; r++) {
      roomsToInsert.push({
        id: randomUUID(),
        school_id: school.id,
        name: `LOAD_SIM_Room_${r}`,
        is_campus_active: true,
        is_groovelab_active: true,
        floor: 'Ground Floor'
      });
    }
    const { data: rooms, error: roomErr } = await supabase
      .from('rooms')
      .insert(roomsToInsert)
      .select();
    if (roomErr) {
      console.error(`❌ Failed to insert rooms for school ${school.name}:`, roomErr.message);
      process.exit(1);
    }
    console.log(`Inserted ${rooms.length} rooms.`);

    // 2. Generate Teachers
    const teachersToInsert = [];
    const instruments = ['Klavier', 'Gitarre', 'Gesang', 'Schlagzeug', 'Geige', 'Querflöte'];
    for (let t = 1; t <= teachersPerSchool; t++) {
      teachersToInsert.push({
        id: randomUUID(),
        school_id: school.id,
        role: 'teacher',
        first_name: 'LOAD_SIM_Teacher',
        last_name: `${sIdx + 1}_${t}`,
        nickname: 'LOAD_SIM',
        instrument: getRandomElement(instruments),
        is_active: true,
        status: 'active',
        is_campus_active: true,
        is_groovelab_active: true,
        show_campus: true,
        show_groovelab: true,
        roles: ['teacher']
      });
    }
    const { data: teachers, error: teachErr } = await supabase
      .from('users_raw')
      .insert(teachersToInsert)
      .select();
    if (teachErr) {
      console.error(`❌ Failed to insert teachers for school ${school.name}:`, teachErr.message);
      process.exit(1);
    }
    console.log(`Inserted ${teachers.length} teachers.`);

    // 3. Generate Students
    const studentsToInsert = [];
    for (let st = 1; st <= studentsPerSchool; st++) {
      const first = getRandomElement(firstNames);
      const last = `${getRandomElement(alphabet)}.`;
      const assignedTeacher = teachers[(st - 1) % teachers.length];

      studentsToInsert.push({
        id: randomUUID(),
        school_id: school.id,
        role: 'student',
        first_name: first,
        last_name: last,
        nickname: 'LOAD_SIM',
        teacher_id: assignedTeacher.id,
        is_active: true,
        status: 'active',
        is_campus_active: true,
        is_groovelab_active: true,
        show_campus: true,
        show_groovelab: true,
        roles: ['student'],
        app_usage_mode: 'parent_guided'
      });
    }

    const students = [];
    const batchSize = 200;
    for (let i = 0; i < studentsToInsert.length; i += batchSize) {
      const batch = studentsToInsert.slice(i, i + batchSize);
      const { data, error } = await supabase
        .from('users_raw')
        .insert(batch)
        .select();
      if (error) {
        console.error(`❌ Failed to insert students batch for school ${school.name}:`, error.message);
        process.exit(1);
      }
      students.push(...data);
    }
    console.log(`Inserted ${students.length} students.`);

    // 4. Generate Avatars and stats, Schedules, occurrences, and progress_matrix
    console.log("Generating dependent user records...");
    const statsToInsert = [];
    const schedulesToInsert = [];
    const occurrencesToInsert = [];
    const progressToInsert = [];

    students.forEach((student, index) => {
      statsToInsert.push({
        student_id: student.id,
        total_focus_minutes: 0,
        monthly_focus_minutes: 0,
        streak_flame: 0,
        current_xp: 0,
        weekly_target_days: 3,
        weekly_days_completed: 0,
        weekly_bonus_claimed: false
      });


      const room = rooms[index % rooms.length];
      const scheduleId = randomUUID();
      schedulesToInsert.push({
        id: scheduleId,
        school_id: school.id,
        teacher_id: student.teacher_id,
        student_id: student.id,
        day_of_week: (index % 5) + 1,
        time_slot: '14:00',
        status: 'approved',
        room_id: room.id,
        duration: 45,
        instrument: student.instrument || 'Piano'
      });

      occurrencesToInsert.push({
        id: randomUUID(),
        schedule_id: scheduleId,
        student_id: student.id,
        teacher_id: student.teacher_id,
        date: '2026-07-13',
        start_time: '14:00:00',
        duration: 45,
        status: 'scheduled'
      });

      progressToInsert.push({
        id: randomUUID(),
        student_id: student.id,
        teacher_id: student.teacher_id,
        topic_name: 'Hausaufgabe',
        status: 'IN_PROGRESS',
        is_current_homework: true,
        teacher_notes: 'Initial lesson topic notes.',
        homework_notes: '[]'
      });
    });

    await bulkInsertBatch('student_stats', statsToInsert);
    await bulkInsertBatch('schedules', schedulesToInsert);
    await bulkInsertBatch('schedule_occurrences', occurrencesToInsert);
    await bulkInsertBatch('progress_matrix', progressToInsert);
    console.log(`Successfully completed dependent inserts for school ${school.name}.`);
  }

  console.log("\n🎉 Seed process completed successfully!");
}

async function bulkInsertBatch(tableName, records) {
  const batchSize = 250;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase.from(tableName).insert(batch);
    if (error) {
      console.error(`❌ Bulk insert failed on ${tableName}:`, error.message);
      process.exit(1);
    }
  }
}

async function cleanupOldSimulationData() {
  console.log("Cleaning up any existing simulated data via SSH...");
  
  // List files in avatars bucket to clean up storage
  console.log("Cleaning up files in 'campus-assets' storage bucket...");
  const { data: fileList, error: listErr } = await supabase.storage.from('campus-assets').list('avatars');
  if (!listErr && fileList && fileList.length > 0) {
    const filesToDelete = fileList.filter(f => f.name.startsWith('load-sim') || f.name.startsWith('test-audio-')).map(f => `avatars/${f.name}`);
    if (filesToDelete.length > 0) {
      const { error: delStorageErr } = await supabase.storage.from('campus-assets').remove(filesToDelete);
      if (delStorageErr) {
        console.warn("Storage deletion warning:", delStorageErr.message);
      } else {
        console.log(`Deleted ${filesToDelete.length} files from storage.`);
      }
    }
  }

  const sql = `
BEGIN;
ALTER TABLE public.schools DISABLE TRIGGER USER;
ALTER TABLE public.users_raw DISABLE TRIGGER USER;
ALTER TABLE public.rooms DISABLE TRIGGER USER;
ALTER TABLE public.avatars DISABLE TRIGGER USER;
ALTER TABLE public.student_stats DISABLE TRIGGER USER;
ALTER TABLE public.progress_matrix DISABLE TRIGGER USER;
ALTER TABLE public.schedules DISABLE TRIGGER USER;
ALTER TABLE public.schedule_occurrences DISABLE TRIGGER USER;
ALTER TABLE public.room_bookings DISABLE TRIGGER USER;
ALTER TABLE public.crisis_notifications DISABLE TRIGGER USER;
ALTER TABLE public.system_alerts DISABLE TRIGGER USER;
ALTER TABLE public.focus_sessions DISABLE TRIGGER USER;
ALTER TABLE public.fokus_logs DISABLE TRIGGER USER;
ALTER TABLE public.audit_logs DISABLE TRIGGER USER;

DELETE FROM public.progress_matrix WHERE student_id IN (SELECT id FROM public.users_raw WHERE nickname = 'LOAD_SIM');
DELETE FROM public.schedule_occurrences WHERE student_id IN (SELECT id FROM public.users_raw WHERE nickname = 'LOAD_SIM');
DELETE FROM public.schedules WHERE student_id IN (SELECT id FROM public.users_raw WHERE nickname = 'LOAD_SIM');
DELETE FROM public.student_stats WHERE student_id IN (SELECT id FROM public.users_raw WHERE nickname = 'LOAD_SIM');
DELETE FROM public.avatars WHERE user_id IN (SELECT id FROM public.users_raw WHERE nickname = 'LOAD_SIM');
DELETE FROM public.fokus_logs WHERE user_id IN (SELECT id FROM public.users_raw WHERE nickname = 'LOAD_SIM');
DELETE FROM public.focus_sessions WHERE student_id IN (SELECT id FROM public.users_raw WHERE nickname = 'LOAD_SIM');
DELETE FROM public.crisis_notifications WHERE student_id IN (SELECT id FROM public.users_raw WHERE nickname = 'LOAD_SIM');
DELETE FROM public.system_alerts WHERE school_id IN (SELECT id FROM public.schools WHERE name LIKE 'LOAD_SIM_%');
DELETE FROM public.room_bookings WHERE school_id IN (SELECT id FROM public.schools WHERE name LIKE 'LOAD_SIM_%');
DELETE FROM public.rooms WHERE school_id IN (SELECT id FROM public.schools WHERE name LIKE 'LOAD_SIM_%');
DELETE FROM public.users_raw WHERE nickname = 'LOAD_SIM';
DELETE FROM public.schools WHERE name LIKE 'LOAD_SIM_%';
DELETE FROM public.audit_logs WHERE school_id NOT IN (SELECT id FROM public.schools) OR (school_id IS NOT NULL AND school_id NOT IN (SELECT id FROM public.schools));

ALTER TABLE public.schools ENABLE TRIGGER USER;
ALTER TABLE public.users_raw ENABLE TRIGGER USER;
ALTER TABLE public.rooms ENABLE TRIGGER USER;
ALTER TABLE public.avatars ENABLE TRIGGER USER;
ALTER TABLE public.student_stats ENABLE TRIGGER USER;
ALTER TABLE public.progress_matrix ENABLE TRIGGER USER;
ALTER TABLE public.schedules ENABLE TRIGGER USER;
ALTER TABLE public.schedule_occurrences ENABLE TRIGGER USER;
ALTER TABLE public.room_bookings ENABLE TRIGGER USER;
ALTER TABLE public.crisis_notifications ENABLE TRIGGER USER;
ALTER TABLE public.system_alerts ENABLE TRIGGER USER;
ALTER TABLE public.focus_sessions ENABLE TRIGGER USER;
ALTER TABLE public.fokus_logs ENABLE TRIGGER USER;
ALTER TABLE public.audit_logs ENABLE TRIGGER USER;
COMMIT;
`;

  return new Promise((resolve, reject) => {
    const conn = new SSHClient();
    conn.on('ready', () => {
      conn.exec('docker exec -i supabase-db psql -U postgres -d postgres', (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        let output = '';
        stream.on('close', () => {
          console.log("SQL Cleanup Output:", output.trim());
          conn.end();
          resolve();
        }).on('data', data => {
          output += data.toString();
        });
        stream.write(sql);
        stream.end();
      });
    }).on('error', err => {
      reject(err);
    }).connect({
      host: '178.105.10.2',
      port: 22,
      username: 'root',
      privateKey: fs.readFileSync('/Users/patrickhuber/.ssh/id_ed25519'),
      readyTimeout: 10000
    });
  });
}

run().catch(console.error);
