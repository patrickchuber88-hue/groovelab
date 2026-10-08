#!/usr/bin/env tsx
// ==============================================================================
// 🏛️ Campus-Groovelab Monorepo & Workspace ESM Invariants Verifier
// Standards: DIN EN ISO/IEC 27001 (Annex A.8.28 Secure Coding),
//            NIST SP 800-161 (Supply Chain Integrity), Pure ESM Monorepo Architecture
// Runtime:   tsx / native Node.js ESM
// Protocol:  Halts CI / pre-commit with process.exit(1) on ANY invariant violation.
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const HR = '═'.repeat(72);
console.log(`\n${HR}`);
console.log('🛡️  CAMPUS-GROOVELAB WORKSPACE & ESM INVARIANT AUDIT');
console.log('    Verifying pure ESM ("type": "module") across all monorepo workspaces...');
console.log(`${HR}\n`);

interface PackageCheckResult {
  relPath: string;
  name: string;
  type: string | undefined;
  passed: boolean;
  error?: string;
}

const packageFiles: string[] = [];

// 1. Root package.json
const rootPkgPath = path.join(ROOT_DIR, 'package.json');
if (fs.existsSync(rootPkgPath)) {
  packageFiles.push(rootPkgPath);
}

// 2. Discover apps/*/package.json
const appsDir = path.join(ROOT_DIR, 'apps');
if (fs.existsSync(appsDir)) {
  const appEntries = fs.readdirSync(appsDir, { withFileTypes: true });
  for (const entry of appEntries) {
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      const appPkg = path.join(appsDir, entry.name, 'package.json');
      if (fs.existsSync(appPkg)) {
        packageFiles.push(appPkg);
      }
    }
  }
}

// 3. Discover packages/*/package.json
const packagesDir = path.join(ROOT_DIR, 'packages');
if (fs.existsSync(packagesDir)) {
  const pkgEntries = fs.readdirSync(packagesDir, { withFileTypes: true });
  for (const entry of pkgEntries) {
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      const pkgJson = path.join(packagesDir, entry.name, 'package.json');
      if (fs.existsSync(pkgJson)) {
        packageFiles.push(pkgJson);
      }
    }
  }
}

let violationsCount = 0;
const results: PackageCheckResult[] = [];

for (const pkgPath of packageFiles) {
  const relPath = path.relative(ROOT_DIR, pkgPath);
  try {
    const raw = fs.readFileSync(pkgPath, 'utf-8');
    const parsed = JSON.parse(raw);
    const pkgName = parsed.name || '(unnamed)';
    const pkgType = parsed.type;

    if (pkgType === 'module') {
      results.push({
        relPath,
        name: pkgName,
        type: pkgType,
        passed: true
      });
      console.log(`  ✅ [PASS] ${relPath} ("${pkgName}") → "type": "module"`);
    } else {
      violationsCount++;
      const errMsg = pkgType ? `Declared "type": "${pkgType}" (expected "module")` : 'Missing "type": "module" declaration';
      results.push({
        relPath,
        name: pkgName,
        type: pkgType,
        passed: false,
        error: errMsg
      });
      console.error(`  🔴 [FAIL] ${relPath} ("${pkgName}") → ${errMsg}`);
    }
  } catch (err: any) {
    violationsCount++;
    results.push({
      relPath,
      name: '(corrupted)',
      type: undefined,
      passed: false,
      error: `JSON parse error: ${err.message}`
    });
    console.error(`  🔴 [FAIL] ${relPath} → JSON parse error: ${err.message}`);
  }
}

console.log(`\n${HR}`);
console.log('  📊 SUMMARY');
console.log(`     Workspaces audited: ${packageFiles.length}`);
console.log(`     Violations found:   ${violationsCount}`);
console.log(`${HR}\n`);

if (violationsCount === 0) {
  console.log('  🏆 SUCCESS: 100% of monorepo package.json files declare "type": "module".');
  console.log('     Pure ESM Monorepo Architecture Invariant is INTACT.\n');
  process.exit(0);
} else {
  console.error(`  🚨 FAILED: Detected ${violationsCount} workspace invariant violation(s).\n`);
  process.exit(1);
}
