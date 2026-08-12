import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';

// 1. Load env variables
const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, '.env.local') });
dotenv.config({ path: path.resolve(cwd, 'apps/groovelab/.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;
const serverIp = '178.105.10.2';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Supabase config missing.');
  process.exit(1);
}

const reportFilePath = path.resolve(cwd, 'simulation_stress_report.md');
fs.writeFileSync(reportFilePath, `# Campus-Groovelab Server Stress-Test Report\n\nDate: ${new Date().toLocaleString()}\n\n`);

function logReport(text: string) {
  fs.appendFileSync(reportFilePath, text + '\n');
  console.log(text);
}

// SSH command helper to fetch server stats
function getServerStats(): { load: string; memUsed: number; memTotal: number; swapUsed: number } {
  try {
    const output = execSync(`ssh root@${serverIp} "uptime && free -m"`, { encoding: 'utf8' });
    const lines = output.split('\n');
    const loadMatch = lines[0].match(/load average:\s+([\d.]+),\s+([\d.]+),\s+([\d.]+)/);
    const load = loadMatch ? loadMatch[1] : 'unknown';

    // Parse memory
    const memLine = lines.find(l => l.startsWith('Mem:'));
    let memTotal = 0, memUsed = 0;
    if (memLine) {
      const parts = memLine.trim().split(/\s+/);
      memTotal = parseInt(parts[1], 10);
      memUsed = parseInt(parts[2], 10);
    }

    const swapLine = lines.find(l => l.startsWith('Swap:'));
    let swapUsed = 0;
    if (swapLine) {
      const parts = swapLine.trim().split(/\s+/);
      swapUsed = parseInt(parts[2], 10);
    }

    return { load, memUsed, memTotal, swapUsed };
  } catch (err: any) {
    console.error('Failed to fetch server stats:', err.message);
    return { load: 'error', memUsed: 0, memTotal: 0, swapUsed: 0 };
  }
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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runStage(numSchools: number, numUsers: number): Promise<{ success: boolean; stats: any }> {
  logReport(`\n--- Starting Test Stage: ${numSchools} Schools, ${numUsers} Users ---`);
  
  const tempSchoolIds: string[] = [];
  const spawnedUsers: { id: string; school_id: string; role: string }[] = [];
  const masterClient = createClient(supabaseUrl, '[REDACTED_SUPABASE_SERVICE_ROLE_KEY]');

  // 1. Provision schools
  logReport(`Provisioning ${numSchools} temporary schools...`);
  for (let s = 0; s < numSchools; s++) {
    const schoolId = crypto.randomUUID();
    tempSchoolIds.push(schoolId);
    await masterClient.from('schools').insert({
      id: schoolId,
      name: `Stress Test Academy ${s + 1} (${schoolId.slice(0, 8)})`,
      primary_color: '#3b82f6'
    });
  }

  // 2. Generate and batch-insert user profiles
  logReport(`Generating and inserting ${numUsers} user profiles...`);
  const usersPerSchool = Math.ceil(numUsers / numSchools);
  const usersToInsert: any[] = [];
  
  for (const schoolId of tempSchoolIds) {
    for (let u = 0; u < usersPerSchool; u++) {
      const id = crypto.randomUUID();
      let role = 'student';
      if (u === 0) role = 'admin';
      else if (u === 1) role = 'secretary';
      else if (u < 5) role = 'teacher';
      usersToInsert.push({
        id,
        school_id: schoolId,
        role,
        first_name: `Stress_${role}_${u}`,
        last_name: `User`,
        roles: [role],
        is_active: true,
        is_campus_active: true,
        is_groovelab_active: true
      });
      spawnedUsers.push({ id, school_id: schoolId, role });
    }
  }

  // Insert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < usersToInsert.length; i += batchSize) {
    const batch = usersToInsert.slice(i, i + batchSize);
    const { error } = await masterClient.from('users').insert(batch);
    if (error) {
      console.error(`Failed to insert user batch:`, error.message);
    }
  }

  logReport('Provisioning completed. Starting load simulation...');

  // 3. Simulating concurrent traffic
  // We want to generate high throughput to simulate the active load of these users.
  // We will run this stage for 30 seconds, generating intense API requests.
  let requestsSent = 0;
  let successCount = 0;
  let errorCount = 0;
  const latencies: number[] = [];
  const stopLoadTime = Date.now() + 30000; // 30 second test run

  const runRequest = async () => {
    if (Date.now() > stopLoadTime) return;
    
    const randomUser = spawnedUsers[Math.floor(Math.random() * spawnedUsers.length)];
    if (!randomUser) return;
    const client = getClient(randomUser.id, randomUser.school_id);
    
    requestsSent++;
    const start = Date.now();
    try {
      let promise;
      const choice = Math.floor(Math.random() * 3);
      if (choice === 0) {
        promise = client.from('users').select('*').eq('id', randomUser.id);
      } else if (choice === 1) {
        promise = client.from('lessons').select('*').eq('student_id', randomUser.id);
      } else {
        promise = client.from('campus_events').select('*').eq('school_id', randomUser.school_id);
      }
      
      const { error } = await promise;
      const latency = Date.now() - start;
      latencies.push(latency);
      
      if (error) {
        errorCount++;
      } else {
        successCount++;
      }
    } catch {
      errorCount++;
      latencies.push(Date.now() - start);
    }
  };

  // Spawn parallel request loops to generate high-concurrency requests
  // For U users, we will execute parallel loops to simulate high rate
  const numConcurrentLoops = Math.min(100, Math.ceil(numUsers / 10)); 
  const workerPromises: Promise<void>[] = [];

  for (let w = 0; w < numConcurrentLoops; w++) {
    const worker = async () => {
      while (Date.now() < stopLoadTime) {
        await runRequest();
        await sleep(10 + Math.random() * 20); // rate jitter
      }
    };
    workerPromises.push(worker());
  }

  // Monitor server stats during the test run
  await sleep(15000); // Wait halfway
  const midStats = getServerStats();
  logReport(`[Mid-test Server Stats] CPU Load Average: ${midStats.load}, Memory Used: ${midStats.memUsed}MB / ${midStats.memTotal}MB, Swap Used: ${midStats.swapUsed}MB`);

  await Promise.all(workerPromises);

  // 4. Cleanup
  logReport('Cleaning up temporary schools and users...');
  for (const schoolId of tempSchoolIds) {
    await masterClient.from('users').delete().eq('school_id', schoolId);
    await masterClient.from('schools').delete().eq('id', schoolId);
  }

  // Calculate statistics
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);
  const sorted = [...latencies].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
  const errorRate = (errorCount / (requestsSent || 1)) * 100;
  const throughput = requestsSent / 30;

  logReport(`[Results] Requests Sent: ${requestsSent}, Throughput: ${throughput.toFixed(1)} req/s`);
  logReport(`[Latency] Avg: ${avgLatency.toFixed(1)}ms, p95: ${p95}ms`);
  logReport(`[Errors] Count: ${errorCount}, Error Rate: ${errorRate.toFixed(2)}%`);

  // Check if system is overloaded
  const loadVal = parseFloat(midStats.load);
  const cpuOverloaded = !isNaN(loadVal) && loadVal > 8.0; // Over 8 load average is overloaded for a 4-core VPS
  const memoryExhausted = midStats.memTotal > 0 && (midStats.memUsed / midStats.memTotal) > 0.95;
  const latencyTooHigh = p95 > 800; // Over 800ms p95 is bad
  const errorsTooHigh = errorRate > 8.0; // Over 8% error rate is failed test

  let stageSuccess = true;
  if (cpuOverloaded || memoryExhausted || latencyTooHigh || errorsTooHigh) {
    stageSuccess = false;
    logReport(`❌ LIMIT DETECTED! Reason(s):`);
    if (cpuOverloaded) logReport(`  - CPU load too high: ${midStats.load}`);
    if (memoryExhausted) logReport(`  - Memory exhaustion: ${midStats.memUsed}MB`);
    if (latencyTooHigh) logReport(`  - Latency too high: p95 = ${p95}ms`);
    if (errorsTooHigh) logReport(`  - Error rate too high: ${errorRate.toFixed(2)}%`);
  } else {
    logReport(`✅ Stage passed successfully!`);
  }

  return {
    success: stageSuccess,
    stats: {
      requestsSent,
      throughput,
      avgLatency,
      p95,
      errorRate,
      serverStats: midStats
    }
  };
}

async function startStressTest() {
  logReport('==================================================');
  logReport('  Campus-Groovelab Platform Limits Stress-Test  ');
  logReport('==================================================');

  let schools = 5;
  let users = 2500;
  let stage = 1;
  const history: any[] = [];

  while (true) {
    logReport(`\n--- STAGE ${stage} ---`);
    const result = await runStage(schools, users);
    history.push({ stage, schools, users, ...result.stats });

    if (!result.success) {
      logReport('\n==================================================');
      logReport(`🛑 STRESS TEST COMPLETED: Limit hit at Stage ${stage}!`);
      logReport(`Max stable configuration was: ${schools / 2} Schools and ${users / 2} Users`);
      logReport('==================================================');
      break;
    }

    // Double the configuration for the next stage
    schools *= 2;
    users *= 2;
    stage++;

    // Safety limit to avoid overloading the Hetzner account or hitting API request volume blocks
    if (users > 500000) {
      logReport('\nReached safety maximum simulation scale (500,000 users). Stopping.');
      break;
    }

    await sleep(5000); // cooling down
  }

  // Write history table to report
  logReport('\n## Stress-Test History Summary\n');
  logReport('| Stage | Schools | Users | Throughput (req/s) | Avg Latency (ms) | p95 Latency (ms) | Error Rate (%) | CPU Load | Memory (Used/Total) |');
  logReport('|---|---|---|---|---|---|---|---|---|');
  for (const h of history) {
    logReport(`| ${h.stage} | ${h.schools} | ${h.users} | ${h.throughput.toFixed(1)} | ${h.avgLatency.toFixed(1)} | ${h.p95} | ${h.errorRate.toFixed(2)}% | ${h.serverStats.load} | ${h.serverStats.memUsed}MB / ${h.serverStats.memTotal}MB |`);
  }
}

startStressTest().catch(console.error);
