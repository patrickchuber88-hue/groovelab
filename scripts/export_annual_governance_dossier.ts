/**
 * ==============================================================================
 * CAMPUS-GROOVELAB: B2B ANNUAL GOVERNANCE & RESILIENCE COMPLIANCE ENGINE
 * ==============================================================================
 * Standards: DIN 66398 LK 2/3 & DSGVO Art. 17 (Schuljahres-Wechsel & Audio-Purge),
 *            BSI IT-Grundschutz (DER.4 Notfallmanagement, OPS.1.1.4 GFS Backup),
 *            GoBD (§§ 146, 147 AO, 10-Jahres-Aufbewahrungsfrist & SEPA pain.008),
 *            DSGVO Art. 32 (Sicherheit der Verarbeitung & TOMs),
 *            DIN EN ISO/IEC 27001:2022 (Annex A.8.15 WORM Audit Trail, A.12, A.14),
 *            DIN EN ISO/IEC 27701:2019 (PIMS Bildungsdatenschutz Minderjähriger),
 *            ISO/IEC 27037:2016 (Digitale Beweissicherung & Forensik),
 *            BSI TR-03185 & ISO 22301 (Sovereign Tier-3 Resilience & Autarkie),
 *            BSG B 12 R 3/20 R (Zero-Payroll & Herrenberg-Immunität),
 *            UrhG § 73 / UrhDaG (Audio-Edge Streaming & Zero-Memory Doktrin),
 *            B2B Underwriting Standard (Exali / Hiscox B2B Haftung & Cyber-Risk)
 * 
 * Aggregates all 10 Annual Enterprise Governance pillars, verifies zero regressions,
 * calculates a cryptographically sealed SHA-256 signature, and archives a court-proof
 * B2B annual compliance dossier for school boards, auditors, and regulatory bodies.
 * ==============================================================================
 */

import { spawnSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const REPORTS_DIR = path.join(ROOT_DIR, 'reports', 'forensics', 'annual');

if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

interface AnnualPillarConfig {
  id: string;
  name: string;
  standard: string;
  script: string;
}

const annualPillars: AnnualPillarConfig[] = [
  {
    id: 'PILLAR_1',
    name: 'Dynamic Academic Year Purge & DIN 66398 Retention (Migration 454)',
    standard: 'DIN 66398 LK 2/3 / DSGVO Art. 17 / SEC-73',
    script: 'tests/unit/academic-year-din66398.test.ts'
  },
  {
    id: 'PILLAR_2',
    name: 'Disaster Recovery Drill, GFS Backup & Age X25519 Key Life Cycle',
    standard: 'BSI IT-Grundschutz DER.4 & OPS.1.1.4 / ISO 22301 / 3-2-1-1-0 Backup',
    script: 'tests/security/disaster-recovery-drill.test.ts'
  },
  {
    id: 'PILLAR_3',
    name: 'GoBD Annual Fiscal Lock & SEPA Mandate Validity (pain.008 / MOD 97-10)',
    standard: 'GoBD (§§ 146, 147 AO, 10-Jahres-Aufbewahrung) / DIN EN ISO 20022 XML',
    script: 'tests/unit/gobd-sepa-domain.test.ts'
  },
  {
    id: 'PILLAR_4',
    name: 'Multi-Tenant RLS & Default-Deny Data Isolation Suite',
    standard: 'OWASP ASVS L3 / DSGVO Art. 32 Multi-Tenancy',
    script: 'tests/security/rls-isolation.test.ts'
  },
  {
    id: 'PILLAR_5',
    name: 'Users Security View Leakage & Zero-Secret Sanitization Suite',
    standard: 'OWASP ASVS L3 Zero-Secret-Leakage / DIN EN ISO/IEC 27001',
    script: 'tests/security/users-security-view-leakage.test.ts'
  },
  {
    id: 'PILLAR_6',
    name: 'WORM Non-Repudiation & Tamper-Proof Audit Trail Forensics',
    standard: 'ISO/IEC 27037:2016 / NIS-2 & § 202a StGB / PostgreSQL WORM',
    script: 'apps/groovelab/src/tests/test_worm_audit_trail.ts'
  },
  {
    id: 'PILLAR_7',
    name: 'Audio Edge-Streaming, Zero-Heap & Child Protection Pentest',
    standard: 'OWASP ASVS L3 / UrhG § 73 (TTL <= 1800s) / ISO/IEC 25010',
    script: 'tests/security/audio-edge-streaming.test.ts'
  },
  {
    id: 'PILLAR_8',
    name: 'Enterprise Legacy Ingestion & Zero-Payroll RAM Filter (Migration 502)',
    standard: 'OWASP ASVS L3 / DSGVO Art. 5 / BSG B 12 R 3/20 R (Herrenberg)',
    script: 'tests/security/legacy-migration-ingestion.test.ts'
  },
  {
    id: 'PILLAR_9',
    name: 'Tier-3 Sovereign Enterprise, Cold-Storage Autarky & Split-Brain Simulation',
    standard: 'BSI TR-03185 / ISO 22301 / GoBD 10-Year Archive Autarky',
    script: 'apps/groovelab/src/tests/test_tier3_sovereign_enterprise_forensic.ts'
  },
  {
    id: 'PILLAR_10',
    name: 'Legal & Regulatory 360° Forensic (5 Vektoren & 4 Rollen)',
    standard: 'DSGVO Art. 8/9/17/28, BFSG 2025, UrhG § 73, BGB §§ 312j/k',
    script: 'apps/groovelab/src/tests/test_legal_compliance_360_forensic.ts'
  }
];

interface PillarResult {
  id: string;
  name: string;
  standard: string;
  passed: boolean;
  durationMs: number;
  stdout: string;
  stderr: string;
}

const HR = '═'.repeat(74);

console.log(`\n${HR}`);
console.log('  🏛️   CAMPUS-GROOVELAB B2B ANNUAL GOVERNANCE & RESILIENCE ENGINE');
console.log('       Generating Cryptographically Sealed Annual GoBD, BSI & DIN 66398 Dossier');
console.log(`${HR}\n`);

// Pre-Flight: ISO 27001 / ISO 27701 Compliance Guard Check
console.log('  🔍 Führe ISO/IEC 27001 & ISO 27701 Compliance Pre-Flight aus...');
const isoGuardRes = spawnSync('node', ['scripts/iso27001_compliance_guard.mjs'], {
  cwd: ROOT_DIR,
  env: process.env,
  encoding: 'utf-8'
});
if (isoGuardRes.status !== 0) {
  console.error('  ❌ ISO 27001 / ISO 27701 Pre-Flight fehlgeschlagen!');
  process.exit(1);
} else {
  console.log('  ✅ ISO 27001:2022 & ISO 27701 Compliance Pre-Flight verifiziert.\n');
}

const tGlobalStart = Date.now();
const pillarResults: PillarResult[] = [];
let allPassed = true;

for (const pillar of annualPillars) {
  console.log(`  ▶️  Starte [${pillar.id}] ${pillar.name}...`);
  const t0 = Date.now();
  const res = spawnSync('npx', ['tsx', pillar.script], {
    cwd: ROOT_DIR,
    env: process.env,
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024
  });

  const durationMs = Date.now() - t0;
  const passed = res.status === 0;
  if (!passed) allPassed = false;

  pillarResults.push({
    id: pillar.id,
    name: pillar.name,
    standard: pillar.standard,
    passed,
    durationMs,
    stdout: res.stdout || '',
    stderr: res.stderr || ''
  });

  if (passed) {
    console.log(`  ✅ [PASS] ${pillar.name} (${(durationMs / 1000).toFixed(1)}s)\n`);
  } else {
    console.error(`  ❌ [FAIL] ${pillar.name} (${(durationMs / 1000).toFixed(1)}s)\n`);
    if (res.stderr) console.error(res.stderr.slice(0, 500));
  }
}

const totalDurationMs = Date.now() - tGlobalStart;

// -----------------------------------------------------------------------------
// Date & Year Formatting
// -----------------------------------------------------------------------------
const now = new Date();
const year = now.getFullYear();
const dossierBaseName = `ANNUAL_COMPLIANCE_DOSSIER_${year}`;

// -----------------------------------------------------------------------------
// Cryptographic SHA-256 Evidence Seal
// -----------------------------------------------------------------------------
const rawEvidencePayload = JSON.stringify({
  organization: 'Campus-Groovelab Enterprise Systems',
  jurisdiction: 'EU / DSGVO / GoBD / DIN EN ISO/IEC 27001 / DIN 66398',
  timestamp: now.toISOString(),
  year,
  totalDurationMs,
  overallVerdict: allPassed ? 'PASSED_100_PERCENT' : 'FAILED',
  auditPillars: pillarResults.map(p => ({
    id: p.id,
    name: p.name,
    standard: p.standard,
    passed: p.passed,
    durationMs: p.durationMs
  }))
}, null, 2);

const sha256Seal = crypto.createHash('sha256').update(rawEvidencePayload).digest('hex');

// Write JSON Evidence Dossier
const jsonFilePath = path.join(REPORTS_DIR, `${dossierBaseName}.json`);
const fullJsonPayload = {
  ...JSON.parse(rawEvidencePayload),
  sha256Seal,
  complianceFrameworks: [
    'DIN 66398 (Löschklassen LK 2 & LK 3 für didaktische Audios)',
    'DSGVO Art. 17 (Recht auf Vergessenwerden) & Art. 5 (Speicherbegrenzung)',
    'DSGVO Art. 20 (Datenübertragbarkeit & 1-Monats-Download-Karenz)',
    'GoBD (§§ 146, 147 AO, 10-Jahres-Aufbewahrung / DIN EN ISO 20022 XML pain.008)',
    'BSI IT-Grundschutz (DER.4 Notfallmanagement, OPS.1.1.4 GFS Backup)',
    'DSGVO Art. 32 (Sicherheit der Verarbeitung & TOMs)',
    'DSGVO Art. 28 (Auftragsverarbeitung & DPO Prüfungsrechte)',
    'DIN EN ISO/IEC 27001:2022 (Annex A.8.15 WORM Audit Trail, A.12, A.14)',
    'DIN EN ISO/IEC 27701:2019 (PIMS Bildungsdatenschutz Minderjähriger)',
    'ISO/IEC 27018:2019 (Schutz von PII in Public Clouds)',
    'ISO/IEC 27037:2016 (Digitale Beweissicherung & Forensik)',
    'BSI TR-03185 / ISO 22301 (Sovereign Tier-3 Resilience & Multi-AZ Autarkie)',
    'BSG B 12 R 3/20 R (Zero-Payroll & Herrenberg-Immunität)',
    'UrhG § 73 / UrhDaG (Audio Edge-Streaming & Zero-Memory Doktrin)',
    'B2B Underwriting Standard (Exali / Hiscox B2B Haftung & Cyber-Risk)',
    'BFSG 2025 / WCAG 2.2 Stufe AA'
  ]
};
fs.writeFileSync(jsonFilePath, JSON.stringify(fullJsonPayload, null, 2), 'utf-8');

// Write Markdown Summary Dossier
const mdFilePath = path.join(REPORTS_DIR, `${dossierBaseName}.md`);
const mdContent = `# 🏛️ Campus-Groovelab Annual Governance & Compliance Dossier (${year})
**Offizieller Jahresnachweis gem. GoBD (§ 147 AO), DIN 66398, BSI IT-Grundschutz & Art. 32 DSGVO**

---

### 📋 Dossier-Metadaten
- **Ausstellungszeitpunkt:** ${now.toISOString()}
- **Prüf- & Geschäftsjahr:** ${year}
- **Prüfumfang:** 10 Annual Enterprise Pillars (DIN 66398 Purge, GFS Backup, GoBD, RLS, WORM, Leaks, Audio-Edge, Legacy Ingestion, Tier-3 Autarkie, Legal 360)
- **Gesamtergebnis:** ${allPassed ? '✅ 100% BESTANDEN (Enterprise Grade A+)' : '❌ ABWEICHUNG DETEKTIERT'}
- **Laufzeit:** ${(totalDurationMs / 1000).toFixed(1)} Sekunden
- **Kryptografisches SHA-256 Siegel:** \`${sha256Seal}\`

---

### 🛡️ Jährliche Governance-Säulen im Detail
| ID | Prüffeld & Regulatorischer Standard | Status | Dauer |
| :--- | :--- | :---: | :---: |
${pillarResults.map(p => `| **${p.id}** | ${p.name}<br>*${p.standard}* | ${p.passed ? '`PASS`' : '`FAIL`'} | ${(p.durationMs / 1000).toFixed(1)}s |`).join('\n')}

---

### ⚖️ Revisionssicherheit & Wirtschaftsprüfer-Konformität (§ 43 GmbHG / Art. 5 Abs. 2 DSGVO)
Dieses jährliche Enterprise Governance Dossier wurde automatisiert nach dem Zero-Sampling-Standard von Campus-Groovelab erzeugt. Es belegt lückenlos:
1. **Schuljahres-Zyklus & DIN 66398:** Turnusmäßiger Purge veralteter didaktischer Audioaufnahmen (Migration 454) unter Wahrung der 45-Tage-Karenz für Neuanmeldungen und des Eltern-Exportrechts (Art. 20 DSGVO).
2. **GoBD 10-Jahres-Archivierung:** Revisionssichere Unveränderbarkeit von Buchungs-, Rechnungs- und Zahlungsjournalen (§§ 146, 147 AO) sowie DIN EN ISO 20022 XML-Validität.
3. **Disaster Recovery & BSI-Resilienz:** Nachweis der 3-2-1-1-0 Backup-Kette (Hetzner Storage Box Port 23 Sync, Age X25519 Asymmetrie, 12-Monate GFS Cold Storage, RTO $\\le$ 45 Min, RPO $\\le$ 60 Min).
4. **WORM Non-Repudiation:** Unanfechtbare Beweissicherung aller sicherheitsrelevanten Vorgänge nach ISO/IEC 27037:2016.
5. **Herrenberg-Immunität:** Zero-Payroll Filterung bei Altsystem-Migrationen (BSG B 12 R 3/20 R / Migration 502).
6. **Kinderschutz & UrhG:** UrhG § 73 konforme Audio-Streams (TTL $\\le$ 1800s) ohne Node.js Heap-Pufferung.
`;

fs.writeFileSync(mdFilePath, mdContent, 'utf-8');

console.log(`${HR}`);
console.log(`  📊 B2B ANNUAL GOVERNANCE DOSSIER ERFOLGREICH VERSIEGELT`);
console.log(`${HR}`);
console.log(`  JSON Dossier : ${jsonFilePath}`);
console.log(`  Markdown     : ${mdFilePath}`);
console.log(`  SHA-256      : ${sha256Seal}`);
console.log(`${HR}\n`);

if (allPassed) {
  console.log(`  🎉 100% ANNUAL COMPLIANCE EXCELLENCE BESTÄTIGT:`);
  console.log(`     Alle 10 Governance-Säulen erfolgreich bestanden.`);
  console.log(`     Jahresabschluss für ${year} ist gerichtsverwertbar exkulpiert.\n`);
  process.exit(0);
} else {
  console.error(`  🚨 FEHLER BEIM JÄHRLICHEN GOVERNANCE AUDIT DETEKTIERT!`);
  process.exit(1);
}
