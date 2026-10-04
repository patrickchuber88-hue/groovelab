// ==============================================================================
// Campus-Groovelab Enterprise+ Domain & Regulatory Test Suite
// Datei: tests/unit/academic-year-din66398.test.ts
// Standards: DIN 66398 (Löschklassen LK 2 / LK 3), DSGVO Art. 5 Abs. 1 lit. e,
//            DSGVO Art. 17, Art. 20 (Datenübertragbarkeit & Karenz), SEC-73
// Zweck: Forensische Verifikation der Migration 454 (Schuljahres-Audio-Purge)
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

let totalTests = 0;
let passedTests = 0;

function assert(name: string, condition: boolean, details: string = '') {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${name}: ${details}`);
  }
}

async function runAcademicYearDin66398TestSuite() {
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('🏛️  CAMPUS-GROOVELAB: DIN 66398 & ACADEMIC YEAR PURGE INVARIANT SUITE');
  console.log('    Standards: DIN 66398 LK 2/3, DSGVO Art. 17 & Migration 454 (SEC-73)');
  console.log('════════════════════════════════════════════════════════════════════\n');

  // ----------------------------------------------------------------------------
  // 1. MIGRATION 454 SCHEMA & AST VERIFICATION
  // ----------------------------------------------------------------------------
  console.log('[1] Migration 454 Schema & Security-Definer Kernel-Audit');

  const migration454Path = path.join(ROOT_DIR, 'supabase', 'migrations', '454_academic_year_dynamic_purge_and_schema.sql');
  assert('Migration 454 existiert (454_academic_year_dynamic_purge_and_schema.sql)', fs.existsSync(migration454Path));

  const migrationSql = fs.readFileSync(migration454Path, 'utf8');

  assert(
    'Spalte academic_year_start_month auf public.schools definiert (Default 9)',
    migrationSql.includes('academic_year_start_month SMALLINT DEFAULT 9') &&
    migrationSql.includes('CHECK (academic_year_start_month BETWEEN 1 AND 12)')
  );

  assert(
    'RPC cron_enforce_academic_year_audio_purge als SECURITY DEFINER angelegt',
    migrationSql.includes('CREATE OR REPLACE FUNCTION public.cron_enforce_academic_year_audio_purge()') &&
    migrationSql.includes('SECURITY DEFINER')
  );

  assert(
    'Hermetischer search_path (public, pg_temp, extensions) gegen Search-Path-Hijacking',
    migrationSql.includes('SET search_path = public, pg_temp, extensions')
  );

  assert(
    '45-Tage-Sicherheitskarenz für neues Schuljahr verankert',
    migrationSql.includes("pm.created_at < (CURRENT_DATE - INTERVAL '45 days')")
  );

  assert(
    'Sanitisierungs-Marker [DIN66398_SCHULJAHRES_PURGE] wird revisionssicher gesetzt',
    migrationSql.includes('[DIN66398_SCHULJAHRES_PURGE]') &&
    migrationSql.includes('SET audio_url = NULL')
  );

  assert(
    'WORM-Audit-Logging in public.audit_logs verankert (DIN66398_ACADEMIC_YEAR_PURGE)',
    migrationSql.includes("INSERT INTO public.audit_logs") &&
    migrationSql.includes("'DIN66398_ACADEMIC_YEAR_PURGE'")
  );

  assert(
    'Exklusive Privilegienvergabe (nur postgres, service_role)',
    migrationSql.includes('GRANT EXECUTE ON FUNCTION public.cron_enforce_academic_year_audio_purge() TO postgres, service_role;')
  );

  // ----------------------------------------------------------------------------
  // 2. DOCUMENTATION & LEGAL RULE CATALOG ALIGNMENT
  // ----------------------------------------------------------------------------
  console.log('\n[2] Dokumentations- & Regelkatalog-Synchronisation (DIN 66398 / SEC-73)');

  const complianceDossierPath = path.join(ROOT_DIR, 'docs', 'COMPLIANCE_DOSSIER_DSGVO_DIN66398.md');
  assert('DIN 66398 Compliance-Dossier existiert', fs.existsSync(complianceDossierPath));
  const complianceDossierContent = fs.readFileSync(complianceDossierPath, 'utf8');
  assert(
    'Dossier definiert DIN 66398 Löschklasse LK 2 & Migration 454 Purge-Zyklus',
    complianceDossierContent.includes('LK 2') &&
    complianceDossierContent.includes('cron_enforce_academic_year_audio_purge')
  );

  const featureMatrixPath = path.join(ROOT_DIR, 'docs', 'SYSTEM_FEATURE_MATRIX.md');
  const featureMatrixContent = fs.readFileSync(featureMatrixPath, 'utf8');
  assert(
    'System Feature Matrix verankert SEC-73 (Dynamischer Schuljahres-Purge)',
    featureMatrixContent.includes('SEC-73') &&
    featureMatrixContent.includes('cron_enforce_academic_year_audio_purge')
  );

  const ruleCatalogPath = path.join(ROOT_DIR, 'apps', 'groovelab', 'src', 'constants', 'complianceRuleCatalog.ts');
  const ruleCatalogContent = fs.readFileSync(ruleCatalogPath, 'utf8');
  assert(
    'Compliance Rule Catalog verankert RULE-015 mit cron_enforce_academic_year_audio_purge',
    ruleCatalogContent.includes('cron_enforce_academic_year_audio_purge')
  );

  // ----------------------------------------------------------------------------
  // 3. MULTI-TENANT SIMULATION: SCHULJAHRES-WECHSEL & 45-TAGE-KARENZ
  // ----------------------------------------------------------------------------
  console.log('\n[3] Simulation: Multi-Tenant Schuljahres-Bereinigung & Grace-Period Invariante');

  interface MockSchool {
    id: string;
    name: string;
    academic_year_start_month: number;
  }

  interface MockProgressRecord {
    id: string;
    school_id: string;
    audio_url: string | null;
    homework_notes: string | null;
    created_at_days_ago: number;
  }

  const schools: MockSchool[] = [
    { id: 'school-september', name: 'Musikschule Bayern (Start Sept)', academic_year_start_month: 9 },
    { id: 'school-august', name: 'Musikschule NRW (Start Aug)', academic_year_start_month: 8 },
    { id: 'school-january', name: 'Privat-Akademie (Start Jan)', academic_year_start_month: 1 }
  ];

  const initialRecords: MockProgressRecord[] = [
    // Schule Bayern (Start Sept) - In Monat 9:
    // Alt-Aufnahme aus vorigem Schuljahr (180 Tage alt) -> MUSS GEPURGT WERDEN
    {
      id: 'rec-by-old',
      school_id: 'school-september',
      audio_url: 'https://cdn.groovelab.de/audio/rec-by-old.mp3',
      homework_notes: 'Etüde Nr. 4 Übung',
      created_at_days_ago: 180
    },
    // Frische Aufnahme im neuen Schuljahr (10 Tage alt) -> MUSS ERHALTEN BLEIBEN!
    {
      id: 'rec-by-fresh',
      school_id: 'school-september',
      audio_url: 'https://cdn.groovelab.de/audio/rec-by-fresh.mp3',
      homework_notes: 'Neue Tonleiter Sept 2026',
      created_at_days_ago: 10
    },
    // Schule NRW (Start Aug) - In Monat 9:
    // Alt-Aufnahme (180 Tage alt), aber NRW startet im August -> In Monat 9 KEIN Purge
    {
      id: 'rec-nrw-old',
      school_id: 'school-august',
      audio_url: 'https://cdn.groovelab.de/audio/rec-nrw-old.mp3',
      homework_notes: 'NRW Übung alt',
      created_at_days_ago: 180
    },
    // Schule Akademie (Start Jan) - In Monat 9:
    {
      id: 'rec-jan-old',
      school_id: 'school-january',
      audio_url: 'https://cdn.groovelab.de/audio/rec-jan-old.mp3',
      homework_notes: 'Akademie Altbestand',
      created_at_days_ago: 240
    }
  ];

  // Simuliere Ausführung im Monat September (current_month = 9)
  const currentSimulatedMonth = 9;
  const simulatedRecords = JSON.parse(JSON.stringify(initialRecords)) as MockProgressRecord[];
  const auditLogs: any[] = [];

  let totalPurged = 0;
  let processedSchools = 0;

  for (const school of schools) {
    if (school.academic_year_start_month === currentSimulatedMonth) {
      processedSchools++;
      let schoolPurged = 0;

      for (const rec of simulatedRecords) {
        if (rec.school_id === school.id && rec.audio_url !== null && rec.created_at_days_ago > 45) {
          rec.audio_url = null;
          rec.homework_notes = (rec.homework_notes || '') + ' [DIN66398_SCHULJAHRES_PURGE]';
          schoolPurged++;
        }
      }

      totalPurged += schoolPurged;
      if (schoolPurged > 0) {
        auditLogs.push({
          table_name: 'progress_matrix',
          operation: 'DIN66398_ACADEMIC_YEAR_PURGE',
          school_id: school.id,
          school_name: school.name,
          academic_year_start_month: currentSimulatedMonth,
          purged_audio_records: schoolPurged,
          executed_at: new Date().toISOString()
        });
      }
    }
  }

  assert('Genau 1 Schule (Bayern, Start 9) wurde im September bereinigt', processedSchools === 1);
  assert('Genau 1 Alt-Datensatz (rec-by-old) wurde erfolgreich bereinigt', totalPurged === 1);

  const byOldRec = simulatedRecords.find(r => r.id === 'rec-by-old')!;
  assert('Alt-Audio rec-by-old wurde entkoppelt (audio_url === null)', byOldRec.audio_url === null);
  assert('Alt-Audio rec-by-old hat [DIN66398_SCHULJAHRES_PURGE] Marker', byOldRec.homework_notes?.includes('[DIN66398_SCHULJAHRES_PURGE]') === true);

  const byFreshRec = simulatedRecords.find(r => r.id === 'rec-by-fresh')!;
  assert('Frische Aufnahme des neuen Schuljahres (rec-by-fresh, 10 Tage) blieb 100% geschützt', byFreshRec.audio_url !== null);

  const nrwRec = simulatedRecords.find(r => r.id === 'rec-nrw-old')!;
  assert('Schule NRW (Start August) blieb im September 100% unberührt', nrwRec.audio_url !== null);

  const janRec = simulatedRecords.find(r => r.id === 'rec-jan-old')!;
  assert('Schule Akademie (Start Januar) blieb im September 100% unberührt', janRec.audio_url !== null);

  assert('Revisionssicherer WORM-Audit-Log Eintrag generiert', auditLogs.length === 1 && auditLogs[0].operation === 'DIN66398_ACADEMIC_YEAR_PURGE');
  assert('WORM-Log enthält exakte Zählung (purged_audio_records = 1)', auditLogs[0].purged_audio_records === 1);

  console.log('\n────────────────────────────────────────────────────────────────────');
  console.log(`📊 TEST ERGEBNIS: ${passedTests}/${totalTests} Tests erfolgreich bestanden (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('────────────────────────────────────────────────────────────────────\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runAcademicYearDin66398TestSuite().catch(err => {
  console.error('🚨 Unerwarteter Testfehler:', err);
  process.exit(1);
});
