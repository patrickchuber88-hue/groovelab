import fs from 'fs';
import path from 'path';

// 1. Parse configuration and load env
const isDryRun = process.argv.includes('--dry-run');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const url = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const anonKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey) {
  console.error("Error: Supabase URL or Anon Key is missing in .env.local");
  process.exit(1);
}

// 2. Simulation Constants
const SIMULATION_DURATION_MS = isDryRun ? 30000 : 15 * 60 * 1000; // 30s or 15m
const RAMP_UP_MS = isDryRun ? 5000 : 3 * 60 * 1000;             // 5s or 3m
const THINK_TIME_MIN = isDryRun ? 2000 : 30000;                  // 2s or 30s
const THINK_TIME_MAX = isDryRun ? 5000 : 60000;                  // 5s or 60s
const MAX_USERS_TO_SPAWN = isDryRun ? 20 : 6375;                 // 20 or all 6,375 users

const logFilePath = 'simulation_15m.log';

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
    fs.appendFileSync(this.filePath, chunk);
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

// 5. Load and verify active users from JSON
let allUsers = [];
try {
  allUsers = JSON.parse(fs.readFileSync('scratch/active_users.json', 'utf-8'));
} catch (err) {
  console.error("Failed to load scratch/active_users.json. Please run scratch/extract_users.mjs first.");
  process.exit(1);
}

if (allUsers.length === 0) {
  console.error("Active users list is empty. Run scratch/extract_users.mjs first.");
  process.exit(1);
}

// Slice to maximum allowed users
const targetUsers = allUsers.slice(0, MAX_USERS_TO_SPAWN);
console.log(`Loaded ${targetUsers.length} users for simulation (Dry run: ${isDryRun}).`);

// Seed data fetched from database at startup
let songIds = [];
let stationIds = [];
let roomIds = [
  'bf7d1660-fb03-48a7-a51e-9a6e6a1c48c9', // Raum 4
  'f6b249c4-4587-40d6-b30b-dece81541077', // Groovelab
  '5956fcec-035b-42ca-a07c-55397ae3d8bf', // Musikzimmer
  'fa64c249-5f5b-4e5a-9e27-9afc8d9f128a'  // Raum 3
];

async function initializeSeedData() {
  console.log("Fetching seed song and station records from Supabase using service key...");
  try {
    const songRes = await fetch(`${url}/rest/v1/songs?select=id`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`
      }
    });
    if (songRes.ok) {
      const songs = await songRes.json();
      songIds = songs.map(s => s.id);
    }

    const stationRes = await fetch(`${url}/rest/v1/stations?select=id`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`
      }
    });
    if (stationRes.ok) {
      const stations = await stationRes.json();
      stationIds = stations.map(s => s.id);
    }

    console.log(`Initialized ${songIds.length} songs and ${stationIds.length} stations.`);
  } catch (err) {
    console.error("Warning: Failed to fetch seed records dynamically. Using hardcoded fallbacks.", err);
  }

  // Fallbacks if database queries failed
  if (songIds.length === 0) {
    songIds = ['1671ec60-13f7-4c55-96a8-9ab339b0e66c', '3f57b518-90db-4d74-acbc-dc895639d673'];
  }
  if (stationIds.length === 0) {
    stationIds = ['53a186ef-5ab9-4420-b08d-f0f7c4384a83', 'd5c40252-09a9-4530-b5cb-75907231a487'];
  }
}

// 6. Request wrapper
async function makeRequest(userId, schoolId, opName, method, endpoint, body = null) {
  metrics.totalRequests++;
  activeConnections++;
  const startTime = Date.now();
  let status = 0;
  let errorMsg = '';
  let errorCode = '';

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

    // Log transaction
    const timestamp = new Date().toISOString();
    const errorDetails = errorMsg ? ` | Error: [${errorCode}] ${errorMsg}` : '';
    logger.log(`${timestamp} [${userId}] [${schoolId}] ${method} ${opName} -> status:${status} (${latency}ms)${errorDetails}`);
  }
}

function categorizeError(status, code, message) {
  const errMsg = message.toLowerCase();
  const errCode = code || '';

  // RLS Violations (401, 403, or code 42501, or custom trigger exceptions mentioning Unauthorized)
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
  }
  // Database Triggers, validation rules, or constraints (e.g. check constraints, null values, database trigger exceptions)
  else if (
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
  }
  // Logic Conflicts (e.g. conflicts with bookings, dates, overlaps)
  else if (errMsg.includes('conflict') || errMsg.includes('overlap') || errCode === '23505') {
    metrics.logicConflicts++;
    metrics.errorsByType['LOGIC_CONFLICT'] = (metrics.errorsByType['LOGIC_CONFLICT'] || 0) + 1;
  }
  // Miscellaneous exceptions
  else {
    metrics.databaseExceptions++;
    metrics.errorsByType[`UNKNOWN_ERROR_${status}`] = (metrics.errorsByType[`UNKNOWN_ERROR_${status}`] || 0) + 1;
  }
}

// 7. Simulated actions
async function runUserRoutine(user) {
  const userId = user.id;
  const schoolId = user.school_id;
  const instrument = user.instrument || 'Gitarre';

  // Random staggered startup
  const startDelay = Math.random() * RAMP_UP_MS;
  await new Promise(resolve => setTimeout(resolve, startDelay));

  while (running) {
    if (!running) break;

    const roll = Math.random();

    try {
      if (roll < 0.70) {
        // --- 70% Read operations ---
        const readRoll = Math.random();
        if (readRoll < 0.35) {
          await makeRequest(userId, schoolId, 'FetchProfile', 'GET', `/rest/v1/users?id=eq.${userId}`);
        } else if (readRoll < 0.70) {
          await makeRequest(userId, schoolId, 'FetchLessons', 'GET', `/rest/v1/lessons?student_id=eq.${userId}`);
        } else if (readRoll < 0.85) {
          await makeRequest(userId, schoolId, 'FetchEvents', 'GET', `/rest/v1/campus_events?school_id=eq.${schoolId}&is_public=eq.true`);
        } else {
          await makeRequest(userId, schoolId, 'FetchProgramPoints', 'GET', `/rest/v1/campus_event_program_points?school_id=eq.${schoolId}`);
        }
      } else if (roll < 0.90) {
        // --- 20% Check-ins / Practice sessions ---
        const checkinRoll = Math.random();
        if (checkinRoll < 0.50) {
          // Practice session / fokus log
          const songId = songIds[Math.floor(Math.random() * songIds.length)];
          const duration = Math.floor(Math.random() * 15) + 5; // 5-20 min
          await makeRequest(userId, schoolId, 'InsertFokusLog', 'POST', '/rest/v1/fokus_logs', {
            user_id: userId,
            song_id: songId,
            duration_minutes: duration,
            duration_seconds: duration * 60,
            is_extra: false,
            flame_level: 'flame_1',
            created_at: new Date().toISOString()
          });
        } else {
          // Check-in / session
          const stationId = stationIds[Math.floor(Math.random() * stationIds.length)];
          const presence = Math.floor(Math.random() * 30) + 10; // 10-40 min
          await makeRequest(userId, schoolId, 'InsertSession', 'POST', '/rest/v1/sessions', {
            user_id: userId,
            station_id: stationId,
            check_in_time: new Date().toISOString(),
            gps_verified: true,
            presence_minutes: presence
          });
        }
      } else {
        // --- 10% Writes ---
        const writeRoll = Math.random();
        if (writeRoll < 0.40) {
          // Try creating a program point (Expected RLS failure for student role)
          await makeRequest(userId, schoolId, 'CreateProgramPoint', 'POST', '/rest/v1/campus_event_program_points', {
            school_id: schoolId,
            event_id: '00000000-0000-0000-0000-000000000000',
            name: 'Student Showcase Attempt',
            duration: 10,
            instrument: instrument
          });
        } else if (writeRoll < 0.70) {
          // Update profile room preferences (Allowed)
          const randomRoomId = roomIds[Math.floor(Math.random() * roomIds.length)];
          await makeRequest(userId, schoolId, 'UpdateRoomPreferences', 'PATCH', `/rest/v1/users?id=eq.${userId}`, {
            preferred_room_ids: [randomRoomId]
          });
        } else {
          // Update profile bio (Allowed)
          await makeRequest(userId, schoolId, 'UpdateBio', 'PATCH', `/rest/v1/users?id=eq.${userId}`, {
            bio: `Active student practicing ${instrument}.`
          });
        }
      }
    } catch (err) {
      console.error(`Unexpected exception in user routine loop for ${userId}:`, err);
    }

    // Wait for think time with random jitter
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
    fs.appendFileSync(logFilePath, out);
  }
}

// 9. Shutdown helper
async function shutdown() {
  if (!running) return;
  running = false;
  console.log("\nStopping simulation users. Waiting for active connections to finish...");
  
  // Wait up to 10 seconds for active HTTP requests to settle
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

  // Print progress periodically
  const statusTimer = setInterval(() => printStatsSummary(false), 10000);

  // Set timeout to stop simulation
  setTimeout(() => {
    clearInterval(statusTimer);
    shutdown();
  }, SIMULATION_DURATION_MS);

  // Spawn all virtual users
  targetUsers.forEach(user => {
    runUserRoutine(user);
  });
}

// Signal handlers
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch(async (err) => {
  console.error("Unhandled exception in simulation main loop:", err);
  await shutdown();
});
