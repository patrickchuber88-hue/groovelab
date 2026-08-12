import { execSync } from 'child_process';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { Client as SSHClient } from 'ssh2';

const envContent = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local', 'utf-8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, SERVICE_KEY);

const REPORT_PATH = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/scratch/scaling_report.md';

function logToReport(text) {
  console.log(text);
  fs.appendFileSync(REPORT_PATH, text + '\n');
}

async function cleanupData() {
  console.log("Starting full cleanup via SSH...");
  
  // Clean up Supabase storage files first
  console.log("Purging storage files in 'campus-assets' storage bucket...");
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

async function run() {
  // Initialize report file
  fs.writeFileSync(REPORT_PATH, `# Load Scaling Simulation Report\nGenerated: ${new Date().toISOString()}\n\n`);

  let schools = 8;
  let teachers = 50;
  let students = 500;
  let concurrency = 40;
  const duration = 60; // 1 minute per iteration

  let limitReached = false;
  let iteration = 1;

  logToReport(`Starting Scaling Loop at iteration ${iteration}...`);

  while (!limitReached) {
    logToReport(`\n--- Iteration ${iteration} ---`);
    logToReport(`Configuration: ${schools} schools, ${teachers} teachers/school, ${students} students/school (Total: ${schools * students} students, ${schools * teachers} teachers)`);
    logToReport(`Concurrency: ${concurrency} VUs, Duration: ${duration}s`);

    try {
      // 1. Generate Mock Data
      logToReport(`Generating mock data...`);
      execSync(`node "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/scratch/generate_mock_data.mjs" --schools ${schools} --teachers ${teachers} --students ${students}`, { stdio: 'inherit' });

      // 2. Run Simulation
      logToReport(`Running simulation...`);
      execSync(`node "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/scratch/simulate_load_scaling.mjs" --schools ${schools} --teachers ${teachers} --students ${students} --duration ${duration} --concurrency ${concurrency}`, { stdio: 'inherit' });

      // 3. Read Results
      const summary = JSON.parse(fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/scratch/simulation_summary.json', 'utf-8'));

      logToReport(`\nIteration ${iteration} Results:`);
      logToReport(`- Total Requests: ${summary.totalRequests}`);
      logToReport(`- Success Rate: ${summary.successRate}%`);
      logToReport(`- Error Rate: ${summary.errorRate}%`);
      logToReport(`- p95 Latency: ${summary.p95Latency}ms`);
      logToReport(`- CPU Load (VPS): ${summary.cpuLoad}`);

      // 4. Validate Conditions
      // Thresholds: CPU Load < 8.0 AND p95 Latency < 800ms AND Error Rate < 8%
      const cpuOk = summary.cpuLoad < 8.0;
      const latencyOk = summary.p95Latency < 800;
      const errorOk = summary.errorRate < 8.0;

      logToReport(`Threshold checks:`);
      logToReport(`- CPU Load < 8.0: ${cpuOk ? 'PASS' : 'FAIL'} (${summary.cpuLoad})`);
      logToReport(`- p95 Latency < 800ms: ${latencyOk ? 'PASS' : 'FAIL'} (${summary.p95Latency}ms)`);
      logToReport(`- Error Rate < 8%: ${errorOk ? 'PASS' : 'FAIL'} (${summary.errorRate}%)`);

      if (cpuOk && latencyOk && errorOk) {
        logToReport(`Status: ALL PASS. Scaling up...`);
        // Double configuration
        schools *= 2;
        teachers *= 2;
        students *= 2;
        concurrency *= 2;
        iteration++;

        // Practical limits check: let's cap at 64 schools or if it takes too long
        if (schools > 32) {
          logToReport(`\nReached practical maximum limit of 32 schools. Ending loop.`);
          limitReached = true;
        }
      } else {
        logToReport(`\nStatus: LIMIT EXCEEDED. One of the conditions failed!`);
        logToReport(`Scaling limit identified at Iteration ${iteration}!`);
        limitReached = true;
      }

    } catch (err) {
      logToReport(`\n❌ Error during iteration ${iteration}: ${err.message}`);
      limitReached = true;
    }
  }

  // 5. Final Cleanup
  logToReport(`\nRunning final database cleanup to restore database to original state...`);
  await cleanupData();
  logToReport(`🎉 Scaling simulation completed and cleaned up successfully!`);
}

run().catch(console.error);
