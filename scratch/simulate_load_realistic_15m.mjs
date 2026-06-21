import fs from 'fs';
import crypto from 'crypto';

// 1. Parse configuration and load env
const isDryRun = process.argv.includes('--dry-run');

let envContent = '';
try {
  envContent = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
} catch {
  try {
    envContent = fs.readFileSync('.env.local', 'utf-8');
  } catch (err) {
    console.error("Error: Could not read .env.local from apps/groovelab/ or root.", err);
    process.exit(1);
  }
}

const url = envContent.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const anonKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

if (!url || !anonKey) {
  console.error("Error: Supabase URL or Anon Key is missing in .env.local");
  process.exit(1);
}

// 2. Simulation Constants
const SIMULATION_DURATION_MS = isDryRun ? 30000 : 15 * 60 * 1000; // 30s or 15m
const RAMP_UP_MS = isDryRun ? 5000 : 3 * 60 * 1000;             // 5s or 3m
const THINK_TIME_MIN = isDryRun ? 2000 : 30000;                  // 2s or 30s
const THINK_TIME_MAX = isDryRun ? 5000 : 60000;                  // 5s or 60s
const MAX_USERS_TO_SPAWN = isDryRun ? 20 : 7000;                 // Limit to 20 for dry-run, or spawn all loaded (up to 7000)

const logFilePath = isDryRun ? 'simulation_dryrun.log' : 'simulation_realistic_15m.log';

// 3. Logger helper
class BufferedLogger {
  constructor(filePath) {
    this.filePath = filePath;
    this.buffer = [];
    this.timer = null;
    fs.writeFileSync(filePath, ''); // Clear file on start
  }

  log(line) {
    this.buffer.push(line);
    if (this.buffer.length >= 200) {
      this.flush();
    }
  }

  start() {
    this.timer = setInterval(() => this.flush(), 2000);
  }

  flush() {
    if (this.buffer.length === 0) return;
    const chunk = this.buffer.join('\n') + '\n';
    this.buffer = [];
    try {
      fs.appendFileSync(this.filePath, chunk);
    } catch (err) {
      console.error("Failed to append to log file:", err);
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.flush();
  }
}

const logger = new BufferedLogger(logFilePath);

// 4. Metrics state
const metrics = {
  totalRequests: 0,
  successCount: 0,
  errorCount: 0,
  rlsViolations: 0,
  databaseExceptions: 0,
  logicConflicts: 0,
  errorsByType: {},
  latencies: []
};

let activeConnections = 0;
let running = true;
let startTimeGlobal = Date.now();

// 5. Query or load users from JSON
const schoolIds = [
  '3bf920b9-49b5-4aca-be79-42359fef3f1f',
  '01329036-22f0-4424-b9e5-9064df450841',
  '46bace52-2d7a-4a87-aae2-5778ded238cb',
  '532b4d91-67c8-4194-9cde-f231ecb12bdd',
  '41c07ebd-1b59-4f75-8359-408d957dd080',
  '109e83b3-a1ff-42f0-95b9-db6562f8e77d',
  'd5838bdd-d779-424b-94d3-878d12c60140',
  '5e0b8364-12dd-43b1-aeb5-17417d53e957',
  '6abb3e70-cd0f-420d-b963-64f977f66a64',
  'ca3c620a-7cde-4281-8522-ae278e137995'
];

let rawUsers = [];
console.log("Attempting to dynamically query users for simulation schools...");
for (const schoolId of schoolIds) {
  try {
    const res = await fetch(`${url}/rest/v1/users?school_id=eq.${schoolId}`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      rawUsers = rawUsers.concat(data);
    }
  } catch (err) {
    console.error(`Fetch failed for school ${schoolId}:`, err.message);
  }
}

// Fallback to JSON if dynamic query returned no users
if (rawUsers.length === 0) {
  console.log("Dynamic query returned 0 users. Falling back to active_users.json...");
  try {
    rawUsers = JSON.parse(fs.readFileSync('scratch/active_users.json', 'utf-8'));
  } catch (err) {
    console.error("Failed to load scratch/active_users.json fallback:", err);
    process.exit(1);
  }
}

if (rawUsers.length === 0) {
  console.error("Error: Loaded user list is empty.");
  process.exit(1);
}

// Classify users by role dynamically
const allUsers = [];
const schoolGroups = {};
for (const u of rawUsers) {
  if (!schoolGroups[u.school_id]) {
    schoolGroups[u.school_id] = [];
  }
  schoolGroups[u.school_id].push(u);
}

for (const schoolId in schoolGroups) {
  const users = schoolGroups[schoolId];
  const dbTeachers = users.filter(u => u.role === 'teacher');
  const dbAdmins = users.filter(u => u.role === 'admin');
  const dbStudents = users.filter(u => u.role === 'student');

  // Dynamic assignment percentages: 1% as admins, 5% as teachers from students
  const numAdminsToAssign = Math.max(1, Math.ceil(dbStudents.length * 0.01));
  const numTeachersToAssign = Math.max(2, Math.ceil(dbStudents.length * 0.05));

  const assignedAdmins = dbStudents.slice(0, numAdminsToAssign);
  const assignedTeachers = dbStudents.slice(numAdminsToAssign, numAdminsToAssign + numTeachersToAssign);
  const remainingStudents = dbStudents.slice(numAdminsToAssign + numTeachersToAssign);

  assignedAdmins.forEach(u => allUsers.push({ ...u, simRole: 'admin' }));
  assignedTeachers.forEach(u => allUsers.push({ ...u, simRole: 'teacher' }));
  remainingStudents.forEach(u => allUsers.push({ ...u, simRole: 'student' }));

  // Preserve existing DB teachers & admins
  dbTeachers.forEach(u => allUsers.push({ ...u, simRole: 'teacher' }));
  dbAdmins.forEach(u => allUsers.push({ ...u, simRole: 'admin' }));
}

// Shuffle users randomly and slice to target count
const shuffled = allUsers.sort(() => 0.5 - Math.random());
const targetUsers = shuffled.slice(0, MAX_USERS_TO_SPAWN);
console.log(`Loaded ${targetUsers.length} users for simulation (Students: ${targetUsers.filter(u => u.simRole === 'student').length}, Teachers: ${targetUsers.filter(u => u.simRole === 'teacher').length}, Admins: ${targetUsers.filter(u => u.simRole === 'admin').length}).`);

// Seed data fetched or created at startup
let songIds = [];
let stationIds = [];
const schoolEvents = {};  // schoolId -> array of eventIds
const schoolBands = {};   // schoolId -> bandId
const schoolLessons = {}; // schoolId -> array of lessonIds
const activeHelpRequests = []; // list of { id, school_id }
const activeProposals = [];    // list of { id, band_id }

function addActiveHelpRequest(req) {
  activeHelpRequests.push(req);
  if (activeHelpRequests.length > 500) activeHelpRequests.shift();
}

function addActiveProposal(prop) {
  activeProposals.push(prop);
  if (activeProposals.length > 500) activeProposals.shift();
}

async function initializeSeedData() {
  console.log("Fetching and preparing database seed records...");
  
  // songs
  try {
    const songRes = await fetch(`${url}/rest/v1/songs?select=id`, {
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
    });
    if (songRes.ok) {
      const data = await songRes.json();
      songIds = data.map(s => s.id);
    }
  } catch (err) {
    console.error("Error fetching songs:", err);
  }
  
  // stations
  try {
    const stationRes = await fetch(`${url}/rest/v1/stations?select=id`, {
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
    });
    if (stationRes.ok) {
      const data = await stationRes.json();
      stationIds = data.map(s => s.id);
    }
  } catch (err) {
    console.error("Error fetching stations:", err);
  }

  // campus events
  try {
    const eventRes = await fetch(`${url}/rest/v1/campus_events?select=id,school_id`, {
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
    });
    if (eventRes.ok) {
      const data = await eventRes.json();
      for (const ev of data) {
        if (!schoolEvents[ev.school_id]) schoolEvents[ev.school_id] = [];
        schoolEvents[ev.school_id].push(ev.id);
      }
    }
  } catch (err) {
    console.error("Error fetching campus events:", err);
  }

  if (songIds.length === 0) {
    songIds = ['1671ec60-13f7-4c55-96a8-9ab339b0e66c', '3f57b518-90db-4d74-acbc-dc895639d673'];
  }
  if (stationIds.length === 0) {
    stationIds = ['53a186ef-5ab9-4420-b08d-f0f7c4384a83', 'd5c40252-09a9-4530-b5cb-75907231a487'];
  }

  // Ensure bands, events, and lessons exist for the dummy schools
  for (const schoolId of schoolIds) {
    // 1. Ensure Band and Band Song
    let bandId = crypto.randomUUID();
    let bandSongId = crypto.randomUUID();
    schoolBands[schoolId] = { bandId, bandSongId };
    try {
      const res = await fetch(`${url}/rest/v1/bands`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`
        },
        body: JSON.stringify({
          id: bandId,
          school_id: schoolId,
          name: `Simulation Band ${schoolId.slice(0, 8)}`,
          status: 'active'
        })
      });
      if (!res.ok) {
        // Fallback: check if a band already exists
        const checkRes = await fetch(`${url}/rest/v1/bands?school_id=eq.${schoolId}&select=id`, {
          headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
        });
        if (checkRes.ok) {
          const bands = await checkRes.json();
          if (bands.length > 0) {
            bandId = bands[0].id;
            // check if there is an existing band_song
            const checkBSRes = await fetch(`${url}/rest/v1/band_songs?band_id=eq.${bandId}&select=id`, {
              headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
            });
            if (checkBSRes.ok) {
              const bandSongs = await checkBSRes.json();
              if (bandSongs.length > 0) {
                bandSongId = bandSongs[0].id;
              } else {
                const songId = songIds[Math.floor(Math.random() * songIds.length)];
                await fetch(`${url}/rest/v1/band_songs`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`
                  },
                  body: JSON.stringify({
                    id: bandSongId,
                    band_id: bandId,
                    song_id: songId,
                    status: 'active'
                  })
                });
              }
            }
            schoolBands[schoolId] = { bandId, bandSongId };
          }
        }
      } else {
        const songId = songIds[Math.floor(Math.random() * songIds.length)];
        await fetch(`${url}/rest/v1/band_songs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`
          },
          body: JSON.stringify({
            id: bandSongId,
            band_id: bandId,
            song_id: songId,
            status: 'active'
          })
        });
      }
    } catch (err) {
      console.error(`Error ensuring band/band_song for ${schoolId}:`, err);
    }

    // 2. Ensure Event
    if (!schoolEvents[schoolId] || schoolEvents[schoolId].length === 0) {
      const eventId = crypto.randomUUID();
      try {
        const res = await fetch(`${url}/rest/v1/campus_events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`
          },
          body: JSON.stringify({
            id: eventId,
            school_id: schoolId,
            title: 'Simulation Event',
            category: 'Konzert',
            event_date: new Date().toISOString().split('T')[0],
            is_planning_active: false,
            is_public: true,
            no_submission_teacher_ids: [],
            stage_count: 1,
            visibility: 'public'
          })
        });
        if (res.ok) {
          schoolEvents[schoolId] = [eventId];
        } else {
          const checkRes = await fetch(`${url}/rest/v1/campus_events?school_id=eq.${schoolId}&select=id`, {
            headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
          });
          if (checkRes.ok) {
            const events = await checkRes.json();
            if (events.length > 0) {
              schoolEvents[schoolId] = events.map(e => e.id);
            }
          }
        }
      } catch (err) {
        console.error(`Error ensuring event for ${schoolId}:`, err);
      }
    }

    // 3. Ensure Lessons
    schoolLessons[schoolId] = [];
    const schoolUsers = targetUsers.filter(u => u.school_id === schoolId);
    const students = schoolUsers.filter(u => u.simRole === 'student');
    const teachers = schoolUsers.filter(u => u.simRole === 'teacher');
    if (students.length > 0 && teachers.length > 0) {
      for (let i = 0; i < Math.min(5, students.length); i++) {
        const lessonId = crypto.randomUUID();
        try {
          const res = await fetch(`${url}/rest/v1/lessons`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': serviceKey,
              'Authorization': `Bearer ${serviceKey}`
            },
            body: JSON.stringify({
              id: lessonId,
              school_id: schoolId,
              student_id: students[i].id,
              teacher_id: teachers[i % teachers.length].id,
              date: new Date().toISOString().split('T')[0],
              duration: 45,
              start_time: '14:00:00',
              status: 'scheduled'
            })
          });
          if (res.ok) {
            schoolLessons[schoolId].push(lessonId);
          }
        } catch (err) {
          console.error(`Error creating lesson for school ${schoolId}:`, err);
        }
      }
    }
  }

  console.log("Database seed initialization completed successfully.");
}

// 6. Request wrapper
async function makeRequest(userId, schoolId, opName, method, endpoint, body = null, returnData = false) {
  metrics.totalRequests++;
  activeConnections++;
  const startTime = Date.now();
  let status = 0;
  let errorMsg = '';
  let errorCode = '';
  let data = null;

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
      'x-user-id': userId
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  if (method === 'POST' || method === 'PATCH') {
    options.headers['Prefer'] = 'return=representation';
  }

  try {
    const res = await fetch(`${url}${endpoint}`, options);
    status = res.status;
    const responseText = await res.text();

    if (!res.ok) {
      try {
        const parsed = JSON.parse(responseText);
        errorMsg = parsed.message || responseText;
        errorCode = parsed.code || '';
      } catch {
        errorMsg = responseText;
      }
      metrics.errorCount++;
      categorizeError(status, errorCode, errorMsg);
    } else {
      metrics.successCount++;
      if (returnData && responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          data = responseText;
        }
      }
    }
  } catch (err) {
    status = -1;
    errorMsg = err.message || String(err);
    metrics.errorCount++;
    metrics.databaseExceptions++;
    metrics.errorsByType['NETWORK_EXCEPTION'] = (metrics.errorsByType['NETWORK_EXCEPTION'] || 0) + 1;
  } finally {
    const latency = Date.now() - startTime;
    metrics.latencies.push(latency);
    activeConnections--;

    const timestamp = new Date().toISOString();
    const errorDetails = errorMsg ? ` | Error: [${errorCode}] ${errorMsg}` : '';
    logger.log(`${timestamp} [${userId}] [${schoolId}] ${method} ${opName} -> status:${status} (${latency}ms)${errorDetails}`);
  }

  return { status, data, error: errorMsg };
}

function categorizeError(status, code, message) {
  const errMsg = message.toLowerCase();
  const errCode = code || '';

  if (
    status === 401 ||
    status === 403 ||
    errCode === '42501' ||
    errMsg.includes('unauthorized') ||
    errMsg.includes('policy') ||
    errMsg.includes('permission')
  ) {
    metrics.rlsViolations++;
    metrics.errorsByType['RLS_VIOLATION'] = (metrics.errorsByType['RLS_VIOLATION'] || 0) + 1;
  } else if (
    status === 400 ||
    status === 409 ||
    errCode === '23514' ||
    errCode === '23502' ||
    errMsg.includes('trigger') ||
    errMsg.includes('constraint') ||
    errMsg.includes('validation')
  ) {
    metrics.databaseExceptions++;
    metrics.errorsByType[`DB_EXCEPTION_${errCode || 'GENERAL'}`] = (metrics.errorsByType[`DB_EXCEPTION_${errCode || 'GENERAL'}`] || 0) + 1;
  } else if (errMsg.includes('conflict') || errMsg.includes('overlap') || errCode === '23505') {
    metrics.logicConflicts++;
    metrics.errorsByType['LOGIC_CONFLICT'] = (metrics.errorsByType['LOGIC_CONFLICT'] || 0) + 1;
  } else {
    metrics.databaseExceptions++;
    metrics.errorsByType[`UNKNOWN_ERROR_${status}`] = (metrics.errorsByType[`UNKNOWN_ERROR_${status}`] || 0) + 1;
  }
}

// 7. Role Pathways
async function simulateStudent(user) {
  const userId = user.id;
  const schoolId = user.school_id;
  const instrument = user.instrument || 'Gitarre';
  const bandInfo = schoolBands[schoolId] || {};
  const bandId = bandInfo.bandId || crypto.randomUUID();
  const bandSongId = bandInfo.bandSongId || crypto.randomUUID();
  let activeSessionId = null;

  while (running) {
    const roll = Math.random();
    try {
      if (roll < 0.70) {
        // --- 70% Reads ---
        const readRoll = Math.random();
        if (readRoll < 0.20) {
          await makeRequest(userId, schoolId, 'Student_LoadDashboard', 'GET', `/rest/v1/users?id=eq.${userId}`);
        } else if (readRoll < 0.40) {
          await makeRequest(userId, schoolId, 'Student_FetchLessons', 'GET', `/rest/v1/lessons?student_id=eq.${userId}`);
        } else if (readRoll < 0.55) {
          await makeRequest(userId, schoolId, 'Student_FetchEvents', 'GET', `/rest/v1/campus_events?school_id=eq.${schoolId}`);
        } else if (readRoll < 0.70) {
          await makeRequest(userId, schoolId, 'Student_FetchHomework', 'GET', `/rest/v1/lessons?student_id=eq.${userId}&select=coach_notes,homework`);
        } else if (readRoll < 0.85) {
          await makeRequest(userId, schoolId, 'Student_FetchHelpRequests', 'GET', `/rest/v1/help_requests?user_id=eq.${userId}`);
        } else {
          await makeRequest(userId, schoolId, 'Student_FetchBands', 'GET', `/rest/v1/band_members?user_id=eq.${userId}`);
        }
      } else if (roll < 0.90) {
        // --- 20% Session Check-ins/Check-outs ---
        if (activeSessionId) {
          await makeRequest(userId, schoolId, 'Student_CheckOut', 'PATCH', `/rest/v1/sessions?id=eq.${activeSessionId}`, {
            check_out_time: new Date().toISOString()
          });
          activeSessionId = null;
        } else {
          const stationId = stationIds[Math.floor(Math.random() * stationIds.length)];
          const res = await makeRequest(userId, schoolId, 'Student_CheckIn', 'POST', '/rest/v1/sessions', {
            user_id: userId,
            station_id: stationId,
            check_in_time: new Date().toISOString(),
            gps_verified: true
          }, true);
          if (res.status >= 200 && res.status < 300 && res.data?.[0]?.id) {
            activeSessionId = res.data[0].id;
          }
        }
      } else {
        // --- 10% Writes ---
        const writeRoll = Math.random();
        if (writeRoll < 0.20) {
          await makeRequest(userId, schoolId, 'Student_LogSongProgress', 'POST', '/rest/v1/user_progress', {
            user_id: userId,
            progress_percent: Math.floor(Math.random() * 100),
            last_updated: new Date().toISOString()
          });
        } else if (writeRoll < 0.40) {
          const stationId = stationIds[Math.floor(Math.random() * stationIds.length)];
          const res = await makeRequest(userId, schoolId, 'Student_CreateHelpRequest', 'POST', '/rest/v1/help_requests', {
            user_id: userId,
            school_id: schoolId,
            station_id: stationId,
            status: 'pending',
            created_at: new Date().toISOString()
          }, true);
          if (res.status >= 200 && res.status < 300 && res.data?.[0]?.id) {
            addActiveHelpRequest({ id: res.data[0].id, school_id: schoolId });
          }
        } else if (writeRoll < 0.60) {
          if (Math.random() < 0.5) {
            await makeRequest(userId, schoolId, 'Student_JoinBand', 'POST', '/rest/v1/band_members', {
              band_id: bandId,
              user_id: userId,
              instrument: instrument,
              role: 'member'
            });
          } else {
            await makeRequest(userId, schoolId, 'Student_JoinBandSongSlot', 'POST', '/rest/v1/band_song_slots', {
              band_song_id: bandSongId,
              user_id: userId,
              instrument: instrument,
              status: 'joined'
            });
          }
        } else if (writeRoll < 0.75) {
          const res = await makeRequest(userId, schoolId, 'Student_CreateSongProposal', 'POST', '/rest/v1/band_song_proposals', {
            band_id: bandId,
            proposed_by: userId,
            artist: 'Simulation Artist',
            title: `Proposed Song ${Math.floor(Math.random() * 1000)}`,
            status: 'pending'
          }, true);
          if (res.status >= 200 && res.status < 300 && res.data?.[0]?.id) {
            addActiveProposal({ id: res.data[0].id, band_id: bandId });
          }
        } else if (writeRoll < 0.90) {
          const matchingProp = activeProposals.find(p => p.band_id === bandId);
          if (matchingProp) {
            await makeRequest(userId, schoolId, 'Student_VoteOnProposal', 'POST', '/rest/v1/band_proposal_votes', {
              proposal_id: matchingProp.id,
              user_id: userId,
              vote: Math.random() > 0.3 ? 'yes' : 'no'
            });
          } else {
            // Fallback: room preferences
            await makeRequest(userId, schoolId, 'Student_UpdateLabPlanning', 'POST', '/rest/v1/lab_planning', {
              user_id: userId,
              school_id: schoolId,
              day: 'Montag',
              time: '17:00'
            });
          }
        } else {
          await makeRequest(userId, schoolId, 'Student_UpdateLabPlanning', 'POST', '/rest/v1/lab_planning', {
            user_id: userId,
            school_id: schoolId,
            day: 'Montag',
            time: '17:00'
          });
        }
      }
    } catch (err) {
      console.error(`Error in student loop for user ${userId}:`, err);
    }

    const thinkTime = THINK_TIME_MIN + Math.random() * (THINK_TIME_MAX - THINK_TIME_MIN);
    await new Promise(resolve => setTimeout(resolve, thinkTime));
  }
}

async function simulateTeacher(user) {
  const userId = user.id;
  const schoolId = user.school_id;
  const events = schoolEvents[schoolId] || [];
  const lessons = schoolLessons[schoolId] || [];
  let activeSessionId = null;

  while (running) {
    const roll = Math.random();
    try {
      if (roll < 0.70) {
        // --- 70% Reads ---
        const readRoll = Math.random();
        if (readRoll < 0.40) {
          await makeRequest(userId, schoolId, 'Teacher_LoadStudents', 'GET', `/rest/v1/users?school_id=eq.${schoolId}&role=eq.student`);
        } else if (readRoll < 0.80) {
          await makeRequest(userId, schoolId, 'Teacher_FetchHelpRequests', 'GET', `/rest/v1/help_requests?school_id=eq.${schoolId}`);
        } else {
          const eventId = events.length > 0 ? events[Math.floor(Math.random() * events.length)] : crypto.randomUUID();
          await makeRequest(userId, schoolId, 'Teacher_CheckConflicts', 'POST', '/rest/v1/rpc/get_schedule_conflicts', {
            p_event_id: eventId
          });
        }
      } else if (roll < 0.90) {
        // --- 20% Session Check-ins/Check-outs ---
        const sessionRoll = Math.random();
        if (sessionRoll < 0.50) {
          await makeRequest(userId, schoolId, 'Teacher_FetchSessions', 'GET', `/rest/v1/sessions?user_id=eq.${userId}`);
        } else {
          if (activeSessionId) {
            await makeRequest(userId, schoolId, 'Teacher_CheckOut', 'PATCH', `/rest/v1/sessions?id=eq.${activeSessionId}`, {
              check_out_time: new Date().toISOString()
            });
            activeSessionId = null;
          } else {
            const stationId = stationIds[Math.floor(Math.random() * stationIds.length)];
            const res = await makeRequest(userId, schoolId, 'Teacher_CheckIn', 'POST', '/rest/v1/sessions', {
              user_id: userId,
              station_id: stationId,
              check_in_time: new Date().toISOString(),
              gps_verified: true
            }, true);
            if (res.status >= 200 && res.status < 300 && res.data?.[0]?.id) {
              activeSessionId = res.data[0].id;
            }
          }
        }
      } else {
        // --- 10% Writes ---
        const writeRoll = Math.random();
        if (writeRoll < 0.40) {
          const lessonId = lessons.length > 0 ? lessons[Math.floor(Math.random() * lessons.length)] : crypto.randomUUID();
          await makeRequest(userId, schoolId, 'Teacher_WriteNotes', 'PATCH', `/rest/v1/lessons?id=eq.${lessonId}`, {
            coach_notes: 'Highly motivated during simulation.',
            homework: 'Practice chords for next session.'
          });
        } else if (writeRoll < 0.70) {
          const eventId = events.length > 0 ? events[0] : crypto.randomUUID();
          await makeRequest(userId, schoolId, 'Teacher_CreateProgramPoint', 'POST', '/rest/v1/campus_event_program_points', {
            id: crypto.randomUUID(),
            event_id: eventId,
            school_id: schoolId,
            name: 'Campus Performance Point',
            duration: 15,
            is_pause: false,
            is_scheduled: false,
            chairs_needed: 2,
            music_stands_needed: 2,
            performer_count: 3,
            sort_order: 1,
            stage_number: 1,
            status: 'pending',
            songs: [],
            additional_feedback_responses: {}
          });
        } else {
          const matchingReq = activeHelpRequests.find(r => r.school_id === schoolId);
          if (matchingReq) {
            await makeRequest(userId, schoolId, 'Teacher_ResolveHelpRequest', 'PATCH', `/rest/v1/help_requests?id=eq.${matchingReq.id}`, {
              status: 'resolved',
              resolved_at: new Date().toISOString()
            });
            // remove resolved request from list
            const idx = activeHelpRequests.findIndex(r => r.id === matchingReq.id);
            if (idx !== -1) activeHelpRequests.splice(idx, 1);
          } else {
            // Fallback: write lesson notes
            const lessonId = lessons.length > 0 ? lessons[Math.floor(Math.random() * lessons.length)] : crypto.randomUUID();
            await makeRequest(userId, schoolId, 'Teacher_WriteNotes', 'PATCH', `/rest/v1/lessons?id=eq.${lessonId}`, {
              coach_notes: 'Feedback fallback.',
              homework: 'Scale training.'
            });
          }
        }
      }
    } catch (err) {
      console.error(`Error in teacher loop for user ${userId}:`, err);
    }

    const thinkTime = THINK_TIME_MIN + Math.random() * (THINK_TIME_MAX - THINK_TIME_MIN);
    await new Promise(resolve => setTimeout(resolve, thinkTime));
  }
}

async function simulateAdmin(user) {
  const userId = user.id;
  const schoolId = user.school_id;
  const events = schoolEvents[schoolId] || [];

  while (running) {
    const roll = Math.random();
    try {
      if (roll < 0.70) {
        // --- 70% Reads ---
        await makeRequest(userId, schoolId, 'Admin_LoadStats', 'GET', `/rest/v1/school_user_statistics?school_id=eq.${schoolId}`);
      } else if (roll < 0.90) {
        // --- 20% Session check-ins/outs ---
        await makeRequest(userId, schoolId, 'Admin_FetchSessions', 'GET', `/rest/v1/sessions?select=*,users!inner(*)&users.school_id=eq.${schoolId}`);
      } else {
        // --- 10% Writes ---
        const eventId = events.length > 0 ? events[0] : crypto.randomUUID();
        await makeRequest(userId, schoolId, 'Admin_CreateProgramPoint', 'POST', '/rest/v1/campus_event_program_points', {
          id: crypto.randomUUID(),
          event_id: eventId,
          school_id: schoolId,
          name: 'Admin-Scheduled Program Point',
          duration: 10,
          is_pause: false,
          is_scheduled: true,
          chairs_needed: 1,
          music_stands_needed: 1,
          performer_count: 1,
          sort_order: 2,
          stage_number: 1,
          status: 'confirmed',
          songs: [],
          additional_feedback_responses: {}
        });
      }
    } catch (err) {
      console.error(`Error in admin loop for user ${userId}:`, err);
    }

    const thinkTime = THINK_TIME_MIN + Math.random() * (THINK_TIME_MAX - THINK_TIME_MIN);
    await new Promise(resolve => setTimeout(resolve, thinkTime));
  }
}

// 8. Output metrics reporting
function printStatsSummary(final = false) {
  const elapsedSeconds = (Date.now() - startTimeGlobal) / 1000;
  const throughput = metrics.totalRequests / (elapsedSeconds || 1);
  const successRate = metrics.totalRequests > 0 ? (metrics.successCount / metrics.totalRequests) * 100 : 100;

  // Latency percentiles
  const sortedLatencies = [...metrics.latencies].sort((a, b) => a - b);
  const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)] || 0;
  const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0;
  const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] || 0;

  const header = final ? '=== FINAL SIMULATION SUMMARY ===' : '--- SIMULATION STATUS UPDATE ---';
  const out = `
${header}
Elapsed time:      ${elapsedSeconds.toFixed(1)}s / ${(SIMULATION_DURATION_MS / 1000).toFixed(0)}s
Total requests:    ${metrics.totalRequests}
Active requests:   ${activeConnections}
Throughput:        ${throughput.toFixed(2)} req/s
Success rate:      ${successRate.toFixed(2)}%

Latencies (ms):
  p50:             ${p50}
  p95:             ${p95}
  p99:             ${p99}

Error breakdown:
  RLS Violations:  ${metrics.rlsViolations}
  DB Exceptions:   ${metrics.databaseExceptions}
  Logic Conflicts: ${metrics.logicConflicts}
  Errors by type:  ${JSON.stringify(metrics.errorsByType)}
================================
`;
  console.log(out);

  if (final) {
    try {
      fs.appendFileSync(logFilePath, out);
    } catch (err) {
      console.error("Failed to write final stats summary to log:", err);
    }
  }
}

// 9. Shutdown helper
async function shutdown() {
  if (!running) return;
  running = false;
  console.log("\nStopping simulation users. Waiting for active connections to finish...");
  
  const limit = Date.now() + 10000;
  while (activeConnections > 0 && Date.now() < limit) {
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  logger.stop();
  printStatsSummary(true);
  console.log("Cleanup complete. Exiting.");
  process.exit(0);
}

// 10. Main runner
async function main() {
  console.log("====================================================================");
  console.log(`Starting Groovelab Supabase Load Simulation (${isDryRun ? 'DRY RUN' : 'PRODUCTION'})`);
  console.log(`Target users: ${targetUsers.length} | Target Duration: ${SIMULATION_DURATION_MS / 1000}s`);
  console.log("====================================================================");

  logger.start();
  await initializeSeedData();

  const statusTimer = setInterval(() => printStatsSummary(false), isDryRun ? 5000 : 30000);

  setTimeout(() => {
    clearInterval(statusTimer);
    shutdown();
  }, SIMULATION_DURATION_MS);

  // Spawn all virtual users
  targetUsers.forEach(user => {
    // Random staggered startup
    const startDelay = Math.random() * RAMP_UP_MS;
    setTimeout(() => {
      if (user.simRole === 'student') {
        simulateStudent(user);
      } else if (user.simRole === 'teacher') {
        simulateTeacher(user);
      } else if (user.simRole === 'admin') {
        simulateAdmin(user);
      }
    }, startDelay);
  });
}

// Signal handlers
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch(async (err) => {
  console.error("Unhandled exception in simulation main loop:", err);
  await shutdown();
});
