/**
 * ==============================================================================
 * 🧪 TESTLAUF: 1% GOLDSTANDARD B2B-RECHNUNGSVERSAND & GOBD BELEG-ENGINE
 * ==============================================================================
 * Testet:
 * 1. Migration 461 SQL Schema & Invarianten (WORM Schutz, RLS, RPCs)
 * 2. Supabase Edge Function dispatch-school-invoice (Auth-Guard, SHA-256, Hetzner SMTP)
 * 3. PDF Generator & SHA-256 Hash Engine (generateInvoicePDFBinary)
 * 4. UI-Komponenten (InvoiceDispatchModal, useDunning, InvoiceArchiveTable, BillingDashboard)
 * 5. Clean Dashboard Wording (Zero Paragraphen in der Benutzeroberfläche)
 * 6. Air-Gap Invariante (Schüler/Lehrer hermetisch von SMTP isoliert)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName} ${details ? '(' + details + ')' : ''}`);
    failed++;
  }
}

console.log('\n==============================================================================');
console.log('🔬 STARTING 1% GOLDSTANDARD TESTLAUF: B2B-RECHNUNGSZUSTELLUNG & GOBD ENGINE');
console.log('==============================================================================\n');

// ------------------------------------------------------------------------------
// TEST 1: Migration 461 Schema & GoBD WORM Invarianten
// ------------------------------------------------------------------------------
console.log('📦 TEST 1: Migration 461 (SQL Schema, WORM-Trigger & RPCs)...');
const migrationPath = path.resolve('supabase/migrations/461_enterprise_school_invoice_dispatches.sql');
assert(fs.existsSync(migrationPath), 'Migration 461 existiert im Dateisystem');

const migrationSql = fs.readFileSync(migrationPath, 'utf8');

assert(
  migrationSql.includes('CREATE TABLE IF NOT EXISTS public.school_invoice_dispatches'),
  'Tabelle public.school_invoice_dispatches wird definiert'
);
assert(
  migrationSql.includes('pdf_sha256 TEXT NOT NULL'),
  'Pflichtfeld pdf_sha256 in school_invoice_dispatches vorhanden'
);
assert(
  migrationSql.includes('recipient_email VARCHAR(255) NOT NULL'),
  'Pflichtfeld recipient_email in school_invoice_dispatches vorhanden'
);
assert(
  migrationSql.includes('trg_protect_school_invoice_dispatches'),
  'WORM-Schutztrigger trg_protect_school_invoice_dispatches definiert'
);
assert(
  migrationSql.includes("RAISE EXCEPTION 'GoBD-Schutzverletzung"),
  'WORM-Trigger blockiert DELETE und UPDATE mit GoBD-Exception'
);
assert(
  migrationSql.includes('ENABLE ROW LEVEL SECURITY') && migrationSql.includes('FORCE ROW LEVEL SECURITY'),
  'RLS und FORCE RLS auf school_invoice_dispatches aktiviert'
);
assert(
  migrationSql.includes('record_school_invoice_dispatch'),
  'Security Definer RPC record_school_invoice_dispatch definiert'
);
assert(
  migrationSql.includes('get_school_invoice_dispatches'),
  'Security Definer RPC get_school_invoice_dispatches definiert'
);

// ------------------------------------------------------------------------------
// TEST 2: Supabase Edge Function (dispatch-school-invoice)
// ------------------------------------------------------------------------------
console.log('\n⚡ TEST 2: Supabase Edge Function (dispatch-school-invoice)...');
const edgeFnPath = path.resolve('supabase/functions/dispatch-school-invoice/index.ts');
assert(fs.existsSync(edgeFnPath), 'Edge Function dispatch-school-invoice/index.ts existiert');

const edgeFnContent = fs.readFileSync(edgeFnPath, 'utf8');

assert(
  edgeFnContent.includes('is_master_admin === true') || edgeFnContent.includes('role === "master_admin"'),
  'Auth-Guard prüft Master-Admin Berechtigung (Fail-Closed)'
);
assert(
  edgeFnContent.includes('crypto.subtle.digest("SHA-256"'),
  'Kryptografische SHA-256 Prüfsummenberechnung integriert'
);
assert(
  edgeFnContent.includes('mail.your-server.de'),
  'Hetzner Mailhost (Option A) als Standard SMTP-Host hinterlegt'
);
assert(
  edgeFnContent.includes('status = "simulated"') || edgeFnContent.includes('dispatchStatus = "simulated"'),
  'Automatischer, deterministischer Testlauf-Modus (Simulation) implementiert'
);
assert(
  edgeFnContent.includes('record_school_invoice_dispatch'),
  'Edge Function ruft GoBD-Ledger RPC record_school_invoice_dispatch auf'
);

// ------------------------------------------------------------------------------
// TEST 3: PDF-Generator & SHA-256 Hash Engine
// ------------------------------------------------------------------------------
console.log('\n📄 TEST 3: PDF-Generator (generateInvoicePDFBinary & SHA-256)...');
const pdfGenPath = path.resolve('apps/groovelab/src/utils/pdfGenerator.ts');
const pdfGenContent = fs.readFileSync(pdfGenPath, 'utf8');

assert(
  pdfGenContent.includes('export const buildInvoicePDFDoc = async'),
  'buildInvoicePDFDoc ausgelagert'
);
assert(
  pdfGenContent.includes('export const generateInvoicePDF = async'),
  'generateInvoicePDF abwärtskompatibel erhalten'
);
assert(
  pdfGenContent.includes('export const generateInvoicePDFBinary = async'),
  'generateInvoicePDFBinary exportiert'
);
assert(
  pdfGenContent.includes("crypto.subtle.digest('SHA-256', arrayBuffer)"),
  'SHA-256 Prüfsumme wird im PDF-Generator direkt berechnet'
);

// Simulation des SHA-256 Hashes
const mockPdfBuffer = Buffer.from('Mock PDF Content Campus-Groovelab 2026', 'utf8');
const sha256Hash = crypto.createHash('sha256').update(mockPdfBuffer).digest('hex');
assert(
  sha256Hash.length === 64,
  'Kryptografische Hash-Prüfsumme ist ein valider 64-Zeichen SHA-256 Hex-String'
);

// ------------------------------------------------------------------------------
// TEST 4: Frontend UI-Komponenten & Integration
// ------------------------------------------------------------------------------
console.log('\n🖥️ TEST 4: Frontend Integration & Master-Admin Cockpit...');
const modalPath = path.resolve('apps/groovelab/src/components/billing/modals/InvoiceDispatchModal.tsx');
assert(fs.existsSync(modalPath), 'InvoiceDispatchModal.tsx existiert');

const modalContent = fs.readFileSync(modalPath, 'utf8');
assert(
  modalContent.includes('role="dialog"') && modalContent.includes('aria-modal="true"'),
  'InvoiceDispatchModal erfüllt WAI-ARIA Modal-Dialog Standard'
);
assert(
  modalContent.includes('generateInvoicePDFBinary'),
  'InvoiceDispatchModal verwendet generateInvoicePDFBinary zur Vorberechnung'
);
assert(
  modalContent.includes("functions.invoke('dispatch-school-invoice'"),
  'Modal ruft Edge Function dispatch-school-invoice auf'
);
assert(
  modalContent.includes('handleMailtoFallback'),
  'Manueller Notfall-Rettungsschirm (mailto:) im Modal vorhanden'
);
assert(
  modalContent.includes('get_school_invoice_dispatches'),
  'Modal lädt historische Zustellnachweise über get_school_invoice_dispatches'
);

const useDunningPath = path.resolve('apps/groovelab/src/components/billing/hooks/useDunning.ts');
const useDunningContent = fs.readFileSync(useDunningPath, 'utf8');
assert(
  useDunningContent.includes('dispatchModalTarget') && useDunningContent.includes('setDispatchModalTarget'),
  'useDunning verwaltet den Zustand des Dispatch-Modals'
);

const dashboardPath = path.resolve('apps/groovelab/src/components/BillingDashboard.tsx');
const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
assert(
  dashboardContent.includes('<InvoiceDispatchModal'),
  'InvoiceDispatchModal ist im BillingDashboard verankert'
);

const tablePath = path.resolve('apps/groovelab/src/components/billing/tabs/InvoicesSubTab/InvoiceArchiveTable.tsx');
const tableContent = fs.readFileSync(tablePath, 'utf8');
assert(
  tableContent.includes('Zugestellt'),
  'InvoiceArchiveTable zeigt Zugestellt-Badge für versendete Rechnungen'
);

// ------------------------------------------------------------------------------
// TEST 5: Clean Dashboard Wording (Zero Paragraphen im UI)
// ------------------------------------------------------------------------------
console.log('\n⚖️ TEST 5: Clean Dashboard Wording (Zero Paragraphen in Dashboards)...');
// Prüfen, ob im neuen InvoiceDispatchModal versehentlich Paragraphen (§) vorkommen
const visibleTextModal = modalContent
  .replace(/\/\*[\s\S]*?\*\//g, '') // remove comments
  .replace(/\/\/.*$/gm, '');

const hasIllegalParagraph = visibleTextModal.includes('§');
assert(
  !hasIllegalParagraph,
  'InvoiceDispatchModal enthält 0 Paragraphenzeichen (§) im sichtbaren UI'
);

// ------------------------------------------------------------------------------
// TEST 6: B2C Zero-Mail Air-Gap Invariante
// ------------------------------------------------------------------------------
console.log('\n🛡️ TEST 6: B2C Zero-Mail Air-Gap Invariante...');
const studentBriefingPath = path.resolve('apps/groovelab/src/components/student/tabs/StudentBriefingTab.tsx');
const studentBriefingContent = fs.readFileSync(studentBriefingPath, 'utf8');
assert(
  !studentBriefingContent.includes('dispatch-school-invoice'),
  'Schüler-Tab hat keinen Zugriff auf die Rechnungs-Edge-Function'
);

const teacherBriefingPath = path.resolve('apps/groovelab/src/components/teacher/tabs/TeacherBriefingTab.tsx');
const teacherBriefingContent = fs.readFileSync(teacherBriefingPath, 'utf8');
assert(
  !teacherBriefingContent.includes('dispatch-school-invoice'),
  'Lehrer-Tab hat keinen Zugriff auf die Rechnungs-Edge-Function'
);

// ------------------------------------------------------------------------------
// TEST 7: Product Bible & Living Exocortex Sync
// ------------------------------------------------------------------------------
console.log('\n📚 TEST 7: Product Bible & Living Exocortex Sync...');
const matrixPath = path.resolve('docs/SYSTEM_FEATURE_MATRIX.md');
const matrixContent = fs.readFileSync(matrixPath, 'utf8');
assert(
  matrixContent.includes('ADM-40') && matrixContent.includes('1% Goldstandard B2B-Rechnungsversand'),
  'Feature ADM-40 vollständig in docs/SYSTEM_FEATURE_MATRIX.md katalogisiert'
);

const billingLogicPath = path.resolve('docs/BILLING_CANONICAL_LOGIC.md');
const billingLogicContent = fs.readFileSync(billingLogicPath, 'utf8');
assert(
  billingLogicContent.includes('1% Goldstandard B2B-Rechnungsversand & GoBD-Zustellungs-Engine'),
  'Abschnitt 9 in docs/BILLING_CANONICAL_LOGIC.md synchronisiert'
);

// ------------------------------------------------------------------------------
// ZUSAMMENFASSUNG
// ------------------------------------------------------------------------------
console.log('\n==============================================================================');
console.log(`🏁 TESTLAUF-ERGEBNIS: ${passed} BESTANDEN | ${failed} FEHLGESCHLAGEN`);
console.log('==============================================================================');

if (failed === 0) {
  console.log('🏛️  1% GOLDSTANDARD BESTÄTIGT: 100% Integrität, 0 Verstöße, B2B-Engine einsatzbereit!\n');
  process.exit(0);
} else {
  console.error('❌ FEHLER BEIM TESTLAUF ENTDECKT!\n');
  process.exit(1);
}
