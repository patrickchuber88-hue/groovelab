#!/usr/bin/env tsx
// =============================================================================
// 🏛️  Campus-Groovelab Teacher Name Communication Invariant Test Suite
// Standard:  OWASP ASVS Level 3 / DSGVO Art. 25 / Platform Policy
// Invariante: Lehrkräfte-Namen müssen IMMER als "Vorname Nachname" kommuniziert werden.
// =============================================================================

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { formatTeacherFullName, isTeacherFullName, maskLastName } from '../utils/nameHelper';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, '..');

console.log('\n======================================================================');
console.log('  👨‍🏫 Campus-Groovelab: Teacher Name Communication Invariant Tests');
console.log('======================================================================\n');

// -----------------------------------------------------------------------------
// Suite 1: formatTeacherFullName Output Shape Invariants ("Vorname Nachname")
// -----------------------------------------------------------------------------
console.log('▶ [1/4] Testing formatTeacherFullName output formatting...');

// 1.1 Object with snake_case
assert.strictEqual(
  formatTeacherFullName({ first_name: 'Max', last_name: 'Mustermann' }),
  'Max Mustermann',
  'Must format snake_case object to "Vorname Nachname"'
);

// 1.2 Object with camelCase
assert.strictEqual(
  formatTeacherFullName({ firstName: 'Erika', lastName: 'Musterfrau' }),
  'Erika Musterfrau',
  'Must format camelCase object to "Vorname Nachname"'
);

// 1.3 Nested teacher/users object
assert.strictEqual(
  formatTeacherFullName({ teacher: { first_name: 'Anna', last_name: 'Schmidt' } }),
  'Anna Schmidt',
  'Must extract from nested teacher object'
);
assert.strictEqual(
  formatTeacherFullName({ users: { first_name: 'Clara', last_name: 'Schumann' } }),
  'Clara Schumann',
  'Must extract from nested users object'
);

// 1.4 Inverted String & Inverted name field correction ("Nachname, Vorname" -> "Vorname Nachname")
assert.strictEqual(
  formatTeacherFullName('Mustermann, Max'),
  'Max Mustermann',
  'Must correctly reverse inverted "Nachname, Vorname" string'
);
assert.strictEqual(
  formatTeacherFullName({ name: 'Landenberger, Severin' }),
  'Severin Landenberger',
  'Must correctly reverse inverted name in object'
);

// 1.5 Database Normalizations (Severin Landenberger & Peter Pan)
assert.strictEqual(formatTeacherFullName('Severin', 'L.'), 'Severin Landenberger');
assert.strictEqual(formatTeacherFullName({ first_name: 'Severin', last_name: 'L.' }), 'Severin Landenberger');
assert.strictEqual(formatTeacherFullName('Peter', 'P.'), 'Peter Pan');
assert.strictEqual(formatTeacherFullName('Peter', 'Petersen'), 'Peter Pan');
assert.strictEqual(formatTeacherFullName({ first_name: 'Peter', last_name: 'P.' }), 'Peter Pan');

// 1.6 Fallback
assert.strictEqual(formatTeacherFullName(null), 'Lehrkraft');
assert.strictEqual(formatTeacherFullName(undefined), 'Lehrkraft');
assert.strictEqual(formatTeacherFullName({}), 'Lehrkraft');

console.log('  ✔ formatTeacherFullName output shape & inversion correction: PASSED\n');

// -----------------------------------------------------------------------------
// Suite 2: isTeacherFullName Validator Invariants
// -----------------------------------------------------------------------------
console.log('▶ [2/4] Testing isTeacherFullName strict validation...');

assert.strictEqual(isTeacherFullName('Severin Landenberger'), true);
assert.strictEqual(isTeacherFullName('Peter Pan'), true);
assert.strictEqual(isTeacherFullName('Anna Schmidt'), true);

// Rejection of initials (teachers must NEVER be abbreviated)
assert.strictEqual(isTeacherFullName('Max M.'), false, 'Single letter initial must be rejected for teachers');
assert.strictEqual(isTeacherFullName('Severin L.'), false, 'Single letter initial must be rejected for teachers');

// Rejection of placeholders
assert.strictEqual(isTeacherFullName('Lehrkraft'), false);
assert.strictEqual(isTeacherFullName('Deine Lehrkraft'), false);
assert.strictEqual(isTeacherFullName('Admin'), false);
assert.strictEqual(isTeacherFullName(''), false);
assert.strictEqual(isTeacherFullName(null), false);

console.log('  ✔ isTeacherFullName validation & initial rejection: PASSED\n');

// -----------------------------------------------------------------------------
// Suite 3: Masking Exclusion (maskLastName is STRICTLY for students)
// -----------------------------------------------------------------------------
console.log('▶ [3/4] Testing teacher masking exclusion invariants...');

const sampleTeacher = { first_name: 'Wolfgang', last_name: 'Mozart', role: 'teacher' };
const teacherFormatted = formatTeacherFullName(sampleTeacher);
assert.strictEqual(teacherFormatted, 'Wolfgang Mozart');
assert.notStrictEqual(teacherFormatted, 'Wolfgang M.');

console.log('  ✔ Teacher masking exclusion verified: PASSED\n');

// -----------------------------------------------------------------------------
// Suite 4: Static Codebase AST / Regex Invariant Scan (apps/groovelab/src)
// -----------------------------------------------------------------------------
console.log('▶ [4/4] Scanning frontend source files for teacher name violations...');

function walkDir(dir: string, filterExt = ['.ts', '.tsx']): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        results = results.concat(walkDir(filePath, filterExt));
      }
    } else {
      const ext = path.extname(file);
      if (filterExt.includes(ext)) {
        results.push(filePath);
      }
    }
  }
  return results;
}

const allTsFiles = walkDir(SRC_DIR);
let scanViolations = 0;

// Forbidden patterns for teacher communication
const FORBIDDEN_TEACHER_PATTERNS = [
  {
    name: 'Inverted Teacher Name Notation ("${teacher.last_name}, ${teacher.first_name}")',
    regex: /\$\{\s*(?:teacher|assignedTeacher|schedConflict\.teacher)\.last_name[^}]*\}\s*,\s*\$\{\s*(?:teacher|assignedTeacher|schedConflict\.teacher)\.first_name/gi
  },
  {
    name: 'Direct maskLastName call on teacher object',
    regex: /maskLastName\(\s*(?:teacher|assignedTeacher|schedConflict\.teacher)\.last_name/gi
  }
];

for (const filePath of allTsFiles) {
  // Skip test files themselves
  if (filePath.includes('/tests/')) continue;
  
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const rule of FORBIDDEN_TEACHER_PATTERNS) {
    const matches = content.match(rule.regex);
    if (matches && matches.length > 0) {
      console.error(`  🚨 Violation in ${path.relative(SRC_DIR, filePath)}: ${rule.name}`);
      scanViolations++;
    }
  }
}

assert.strictEqual(scanViolations, 0, `Detected ${scanViolations} teacher name pattern violations in codebase!`);
console.log(`  ✔ Scanned ${allTsFiles.length} source files with 0 violations: PASSED\n`);

console.log('======================================================================');
console.log('  🎉 ALL TEACHER NAME INVARIANT TESTS PASSED WITH 100% SUCCESS!');
console.log('======================================================================\n');
process.exit(0);
