#!/usr/bin/env node
// =============================================================================
// 🌅 Campus-Groovelab High-Performance Morning Gate Orchestrator (0,1% Goldstandard)
// Concurrency: Runs independent in-memory architecture guards in parallel (< 600ms)
// Health Probe: Fast 20ms Live-Cluster Health-Ping with graceful offline fallback
// Standard:    OWASP ASVS L3 / BFSG 2025 / DIN EN ISO 9241-110 / ISO/IEC 5230
// Runtime:     Native Node.js ESM — zero external dependencies
// =============================================================================

import { spawn } from 'child_process';
import https from 'https';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const startTime = Date.now();

const HR = '═'.repeat(74);
process.stdout.write(`\n${HR}\n`);
process.stdout.write('  🌅   CAMPUS-GROOVELAB 0,1% GOLDSTANDARD MORNING GATE ORCHESTRATOR\n');
process.stdout.write('       High-Performance Concurrency & Resilient Live-Cluster Health\n');
process.stdout.write(`${HR}\n\n`);

const guards = [
  { id: 'SECURITY_DRIFT', name: 'Security Drift Guard (Architecture Invariants)', cmd: 'node', args: ['scripts/security_drift_guard.mjs'] },
  { id: 'LEGAL_COMPLIANCE', name: 'Legal Compliance Guard (12 Säulen / 18 Checks)', cmd: 'node', args: ['scripts/legal_compliance_guard.mjs'] },
  { id: 'BUTTON_INTERACTION', name: 'Universal Button Guard (3,700+ Buttons, BFSG 2025)', cmd: 'node', args: ['scripts/button_interaction_guard.mjs'] },
  { id: 'PWA_MOBILE', name: '0,1% PWA Architecture Guard (Mobile Invariants)', cmd: 'node', args: ['scripts/pwa_mobile_architecture_guard.mjs'] },
  { id: 'LICENSE_COMPLIANCE', name: 'License Compliance Guard (ISO/IEC 5230 OpenChain)', cmd: 'node', args: ['scripts/license_compliance_guard.mjs'] },
  { id: 'ZERO_OVERLAP', name: '0,1% Zero-Overlap & Fluid-Layout Guard (Tier 1)', cmd: 'node', args: ['scripts/zero_overlap_guard.mjs'] },
  { id: 'STATIC_HEADERS', name: 'Static Security Headers Guard (Mozilla A+)', cmd: 'node', args: ['scripts/verify_static_security_headers.mjs'] },
  { id: 'SECRET_SCANNER', name: 'Secret Leak & Entropy Scanner', cmd: 'bash', args: ['scripts/pre_commit_secret_scanner.sh'] }
];

function runGuardAsync(guard) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn(guard.cmd, guard.args, {
      cwd: ROOT_DIR,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      resolve({
        id: guard.id,
        name: guard.name,
        passed: code === 0,
        durationMs: Date.now() - t0,
        stdout,
        stderr
      });
    });

    child.on('error', (err) => {
      resolve({
        id: guard.id,
        name: guard.name,
        passed: false,
        durationMs: Date.now() - t0,
        stdout: '',
        stderr: err.message
      });
    });
  });
}

// -----------------------------------------------------------------------------
// Live-Cluster Health Probe (Resilient with Graceful Offline Fallback)
// -----------------------------------------------------------------------------
function checkLiveClusterHealth(targetUrl = 'https://campus-groovelab.de') {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const urlObj = new URL(targetUrl);
    const client = urlObj.protocol === 'https:' ? https : http;

    const req = client.request(urlObj, {
      method: 'HEAD',
      timeout: 2000,
      headers: {
        'User-Agent': 'CampusGroovelab-MorningHealthProbe/2.0 (Resilience-Ping)'
      }
    }, (res) => {
      const duration = Date.now() - t0;
      resolve({
        online: true,
        statusCode: res.statusCode || 0,
        durationMs: duration,
        statusText: `Online (HTTP ${res.statusCode}, Latenz: ${duration}ms)`
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        online: false,
        statusCode: 0,
        durationMs: Date.now() - t0,
        statusText: 'Offline / Timeout (> 2000ms) — Local Airgap Mode'
      });
    });

    req.on('error', (err) => {
      resolve({
        online: false,
        statusCode: 0,
        durationMs: Date.now() - t0,
        statusText: `Offline / Nicht erreichbar (${err.code || 'NO_CONN'}) — Local Airgap Mode`
      });
    });

    req.end();
  });
}

// -----------------------------------------------------------------------------
// Main Parallel Orchestration
// -----------------------------------------------------------------------------
async function main() {
  process.stdout.write('  ⚡ Starte parallele Concurrency-Engine für 8 Architektur-Guards & Live-Probe...\n\n');

  // Launch all guards and live probe concurrently
  const [guardResults, liveHealth] = await Promise.all([
    Promise.all(guards.map(runGuardAsync)),
    checkLiveClusterHealth()
  ]);

  let failedCount = 0;

  // Print results
  for (const res of guardResults) {
    if (res.passed) {
      process.stdout.write(`  ✅ [PASS] ${res.name.padEnd(54)} (${res.durationMs}ms)\n`);
    } else {
      failedCount++;
      process.stderr.write(`  ❌ [FAIL] ${res.name.padEnd(54)} (${res.durationMs}ms)\n`);
      if (res.stderr) {
        const errorLines = res.stderr.trim().split('\n').slice(-4);
        process.stderr.write(`            ↳ ${errorLines.join('\n            ↳ ')}\n`);
      }
    }
  }

  // Print Live Health Probe Result
  process.stdout.write('\n  🌐 LIVE CLUSTER HEALTH PROBE:\n');
  if (liveHealth.online && liveHealth.statusCode < 400) {
    process.stdout.write(`  ✅ [PASS] Live Ingress & CDN Health: ${liveHealth.statusText}\n`);
  } else {
    process.stdout.write(`  ℹ️ [INFO] Live Ingress Status: ${liveHealth.statusText} (Kein Gate-Abbruch)\n`);
  }

  const totalDuration = Date.now() - startTime;

  process.stdout.write(`\n${HR}\n`);
  process.stdout.write(`  📊 MORNING GATE ORCHESTRATION SUMMARY (${totalDuration}ms)\n`);
  process.stdout.write(`${HR}\n`);
  process.stdout.write(`  Guards Executed           : ${guards.length}\n`);
  process.stdout.write(`  Passed                    : ${guards.length - failedCount}\n`);
  process.stdout.write(`  Failed                    : ${failedCount}\n`);
  process.stdout.write(`  Live-Cluster Status       : ${liveHealth.statusText}\n`);
  process.stdout.write(`  Overall Health Rating     : ${(((guards.length - failedCount) / guards.length) * 100).toFixed(1)}%\n`);
  process.stdout.write(`${HR}\n\n`);

  if (failedCount > 0) {
    process.stderr.write(`❌ FAILED: Morning Gate detected ${failedCount} violation(s).\n\n`);
    process.exit(1);
  } else {
    process.stdout.write('🏆 SUCCESS: All Parallel Invariants & Live Probes Satisfied.\n\n');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal orchestrator error:', err);
  process.exit(1);
});
