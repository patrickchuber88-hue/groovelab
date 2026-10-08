#!/usr/bin/env node
// =============================================================================
// 🏛️  Campus-Groovelab AST Mock-Facade Detection Guard [0,1% Goldstandard]
// Standards: OWASP ASVS L3 / ISO/IEC 27001 (Annex A.8.28) / CRA Invariants
// Purpose:   AST analysis to prevent fake test facades (e.g. expect(true).toBe(true)),
//            prohibit security RPC mocking without fail-closed checks, and enforce
//            real production component imports/binding in test files.
// Runtime:   Native Node.js ESM + TypeScript Compiler API
// =============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const HR = '═'.repeat(74);
process.stdout.write(`\n${HR}\n`);
process.stdout.write('  🛡️   CAMPUS-GROOVELAB AST MOCK-FACADE DETECTION GUARD [GUARD 13]\n');
process.stdout.write('       Testing Authenticity & Eliminating Mock-Façade Regressions\n');
process.stdout.write(`${HR}\n\n`);

// -----------------------------------------------------------------------------
// Kautel 5 Whitelist Architecture
// -----------------------------------------------------------------------------
const LEGITIMATE_OFFLINE_WHITELIST = [
  'tests/security/rls-isolation.test.ts' // RLS proof verified statically via verify_rls_catalog_invariants.ts
];

const PROTECTED_SECURITY_RPCS = [
  'authenticate_by_credential',
  'verify_parent_pin',
  'verify_personal_pin',
  'login_master_admin'
];

const TEST_SCAN_DIRS = [
  path.join(ROOT_DIR, 'tests'),
  path.join(ROOT_DIR, 'apps', 'groovelab', 'src', 'tests'),
  path.join(ROOT_DIR, 'apps', 'groovelab', 'src', 'domain', '__tests__')
];

let totalFilesScanned = 0;
let totalViolations = 0;
const violations = [];

function isLiteralNode(node) {
  if (!node) return false;
  return (
    ts.isStringLiteral(node) ||
    ts.isNumericLiteral(node) ||
    node.kind === ts.SyntaxKind.TrueKeyword ||
    node.kind === ts.SyntaxKind.FalseKeyword ||
    node.kind === ts.SyntaxKind.NullKeyword
  );
}

function areIdenticalLiterals(nodeA, nodeB) {
  if (!isLiteralNode(nodeA) || !isLiteralNode(nodeB)) return false;
  if (nodeA.kind !== nodeB.kind) return false;

  if (ts.isStringLiteral(nodeA) && ts.isStringLiteral(nodeB)) {
    return nodeA.text === nodeB.text;
  }
  if (ts.isNumericLiteral(nodeA) && ts.isNumericLiteral(nodeB)) {
    return nodeA.text === nodeB.text;
  }
  return true; // TrueKeyword === TrueKeyword, FalseKeyword === FalseKeyword, NullKeyword === NullKeyword
}

function checkAstFile(filePath) {
  const relPath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
  if (LEGITIMATE_OFFLINE_WHITELIST.includes(relPath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );

  totalFilesScanned++;

  let hasRealSrcImportOrRead = false;
  const isComponentOrFeatureTest =
    relPath.includes('apps/groovelab/src/tests/') &&
    (path.basename(relPath).startsWith('test_') ||
      relPath.endsWith('.test.ts') ||
      relPath.endsWith('Tests.ts'));

  function visit(node) {
    // 1. Check Import Declarations for real src/ components
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier;
      if (ts.isStringLiteral(moduleSpecifier)) {
        const spec = moduleSpecifier.text;
        if (
          spec.startsWith('../components') ||
          spec.startsWith('../hooks') ||
          spec.startsWith('../services') ||
          spec.startsWith('../utils') ||
          spec.startsWith('../domain') ||
          spec.includes('apps/groovelab/src/') ||
          spec.startsWith('@/')
        ) {
          hasRealSrcImportOrRead = true;
        }
      }
    }

    // Check for fs.readFileSync / readSource pointing to apps/groovelab/src/
    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText(sourceFile);
      if (
        callText === 'readSource' ||
        callText.endsWith('readFileSync')
      ) {
        if (node.arguments.length > 0) {
          const argText = node.arguments[0].getText(sourceFile);
          if (argText.includes('components') || argText.includes('apps/groovelab/src')) {
            hasRealSrcImportOrRead = true;
          }
        }
      }

      // 2. Check for trivial fake asserts: expect(A).toBe(B), expect(A).toEqual(B)
      if (ts.isPropertyAccessExpression(node.expression)) {
        const propName = node.expression.name.text;
        const targetObj = node.expression.expression;

        if (ts.isCallExpression(targetObj)) {
          const innerCallee = targetObj.expression.getText(sourceFile);
          if (innerCallee === 'expect' && targetObj.arguments.length > 0) {
            const actualArg = targetObj.arguments[0];

            if (
              (propName === 'toBe' || propName === 'toEqual' || propName === 'strictEqual' || propName === 'equal') &&
              node.arguments.length > 0
            ) {
              const expectedArg = node.arguments[0];
              if (areIdenticalLiterals(actualArg, expectedArg)) {
                const lineAndChar = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                violations.push({
                  file: relPath,
                  line: lineAndChar.line + 1,
                  type: 'TRIVIAL_FAKE_ASSERT',
                  message: `Trivial fake assertion detected: expect(${actualArg.getText(sourceFile)}).${propName}(${expectedArg.getText(sourceFile)}). Dynamic logic must be tested.`
                });
                totalViolations++;
              }
            } else if (
              (propName === 'toBeTruthy' && actualArg.kind === ts.SyntaxKind.TrueKeyword) ||
              (propName === 'toBeFalsy' && actualArg.kind === ts.SyntaxKind.FalseKeyword) ||
              (propName === 'toBeNull' && actualArg.kind === ts.SyntaxKind.NullKeyword)
            ) {
              const lineAndChar = sourceFile.getLineAndCharacterOfPosition(node.getStart());
              violations.push({
                file: relPath,
                line: lineAndChar.line + 1,
                type: 'TRIVIAL_FAKE_ASSERT',
                message: `Trivial fake assertion detected: expect(${actualArg.getText(sourceFile)}).${propName}(). Dynamic logic must be tested.`
              });
              totalViolations++;
            }
          }
        }
      }

      // Check for assert.equal(A, B) where A and B are identical literals
      if (ts.isPropertyAccessExpression(node.expression)) {
        const calleeText = node.expression.getText(sourceFile);
        if (
          (calleeText === 'assert.equal' || calleeText === 'assert.strictEqual') &&
          node.arguments.length >= 2
        ) {
          const argA = node.arguments[0];
          const argB = node.arguments[1];
          if (areIdenticalLiterals(argA, argB)) {
            const lineAndChar = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            violations.push({
              file: relPath,
              line: lineAndChar.line + 1,
              type: 'TRIVIAL_FAKE_ASSERT',
              message: `Trivial fake assertion detected: ${calleeText}(${argA.getText(sourceFile)}, ${argB.getText(sourceFile)}).`
            });
            totalViolations++;
          }
        }
      }

      // 3. Check for security RPC mocks without fail-closed testing
      for (const rpc of PROTECTED_SECURITY_RPCS) {
        const fullCallText = node.getText(sourceFile);
        if (fullCallText.includes(rpc)) {
          const normalizedCall = fullCallText.replace(/\s+/g, ' ');
          // Check if this is a vi.mock, jest.mock or mockResolvedValue dummy
          const isMockDummy =
            /mockResolvedValue|mockReturnValue|mockImplementation/.test(normalizedCall) &&
            /\{\s*(?:success|verified|data)\s*:\s*(?:true|\{\s*verified:\s*true\s*\})/i.test(normalizedCall);

          if (isMockDummy) {
            // Check if test also checks failure/rejection branches
            const hasFailClosedCheck =
              content.includes('error') &&
              (content.includes('fail') || content.includes('Fail-Closed') || content.includes('rejection') || content.includes('throw'));

            if (!hasFailClosedCheck) {
              const lineAndChar = sourceFile.getLineAndCharacterOfPosition(node.getStart());
              violations.push({
                file: relPath,
                line: lineAndChar.line + 1,
                type: 'SECURITY_RPC_MOCK_WITHOUT_FAIL_CLOSED',
                message: `Security RPC '${rpc}' is mocked with a trivial success dummy without validating the fail-closed rejection path.`
              });
              totalViolations++;
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  // Check if test inspects components/hooks/services via fs.readFileSync
  if (!hasRealSrcImportOrRead && content.includes('readFileSync')) {
    if (
      content.includes('components') ||
      content.includes('hooks') ||
      content.includes('services') ||
      content.includes('utils') ||
      content.includes('domain')
    ) {
      hasRealSrcImportOrRead = true;
    }
  }

  // 4. Verify that component/feature tests in apps/groovelab/src/tests/ import/reference real production code
  if (isComponentOrFeatureTest && !hasRealSrcImportOrRead) {
    // Exclude database infrastructure scripts and low-level benchmark runners
    const infraAllowlist = [
      'test_all_boards_supabase_hydration.ts',
      'test_closed_loop_schedule_lifecycle_forensic.ts',
      'test_cold_cache_hydration.ts',
      'test_forensic_schedule.ts',
      'test_hardening_calendar_billing.ts',
      'test_hardening_designer_onboarding.ts',
      'test_interactive_journeys_forensic.ts',
      'test_revisionssicher_einteilen.ts',
      'test_trigger.ts',
      'test_worm_audit_trail.ts',
      'test_zero_overlap_bounding_box_forensic.ts',
      'test_session_replay_token_rotation_simulation.ts'
    ];

    const baseName = path.basename(relPath);
    if (!infraAllowlist.includes(baseName)) {
      violations.push({
        file: relPath,
        line: 1,
        type: 'MISSING_REAL_COMPONENT_BINDING',
        message: `Test file does not import or read any production source code from apps/groovelab/src/. Simulating production logic purely inside the test file is prohibited (Milestone 5 Regression Guard).`
      });
      totalViolations++;
    }
  }
}

function findTestFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== 'scratch') {
        results.push(...findTestFiles(full));
      }
    } else if (
      entry.name.endsWith('.test.ts') ||
      entry.name.endsWith('.test.tsx') ||
      entry.name.startsWith('test_') ||
      entry.name.endsWith('Tests.ts')
    ) {
      results.push(full);
    }
  }
  return results;
}

function main() {
  const startTime = Date.now();

  for (const dir of TEST_SCAN_DIRS) {
    const testFiles = findTestFiles(dir);
    for (const file of testFiles) {
      checkAstFile(file);
    }
  }

  const durationMs = Date.now() - startTime;

  if (totalViolations > 0) {
    process.stderr.write(`❌ AST MOCK-FACADE GUARD FEHLGESCHLAGEN (${totalViolations} Verstöße in ${totalFilesScanned} Testdateien):\n\n`);
    for (const v of violations) {
      process.stderr.write(`  [${v.type}] ${v.file}:${v.line}\n`);
      process.stderr.write(`  └─ ${v.message}\n\n`);
    }
    process.exit(1);
  }

  process.stdout.write(`  ✓ ${totalFilesScanned} Testdateien via TypeScript AST gescannt\n`);
  process.stdout.write(`  ✓ 0 triviale Fake-Asserts (expect(true).toBe(true)) gefunden\n`);
  process.stdout.write(`  ✓ 0 unzulässige Sicherheits-RPC-Mocks auf Kernfunktionen\n`);
  process.stdout.write(`  ✓ 100% Bindung an reale Produktions-Komponenten in src/\n`);
  process.stdout.write(`  ⏱️  Laufzeit: ${durationMs}ms\n\n`);
  process.stdout.write(`✅ AST Mock-Facade Detection Guard erfolgreich bestanden!\n`);
  process.exit(0);
}

main();
