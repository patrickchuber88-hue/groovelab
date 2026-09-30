/**
 * 🏛️ Campus-Groovelab Canonical 360° Compliance & Legal Invariants Catalog
 * Standard: 18 Dogmatische Säulen / 180 Unbestechliche Invarianten
 * Autor: 0,1% Senior IT-Volljurist & Lead Security Systems Architect
 * 
 * Diese Datei fungiert als maschinenlesbare Single Source of Truth (SSOT).
 * Sie wird vom Pre-Commit Compliance Guard (scripts/legal_compliance_guard.mjs)
 * konsumiert, um sicherzustellen, dass 100% aller 180 Regeln dauerhaft aktiv geschützt bleiben.
 */

export type ComplianceSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type ComplianceCheckCategory = 
  | 'AST_NEGATIVE_PATTERN'  // Verbotene Code-Muster (z. B. Foto-Uploads bei Schülern, unverschlüsselte PINs)
  | 'AST_POSITIVE_PATTERN'  // Erforderliche Code-Muster (z. B. allowLeaderboard: false, role="dialog")
  | 'DATABASE_KERNEL'       // Schema, Row-Level-Security, WORM-Trigger, RPC-Definitionen
  | 'CONTRACTUAL_EVIDENCE'  // Juristische Klauseln, AVV-Hashes, Widerrufsbelehrungen
  | 'SECURITY_HEADER';      // HSTS, CSP, Permissions-Policy, CORS-Isolierung

export interface ComplianceRuleDefinition {
  id: string;
  pillar: number;
  pillarName: string;
  norm: string;
  description: string;
  severity: ComplianceSeverity;
  category: ComplianceCheckCategory;
  invariantTarget: string;
  enforcementMechanism: string;
}

export const COMPLIANCE_PILLARS_18: Record<number, string> = {
  1: 'EU-DSGVO & BDSG (Hybride Architektur & Rollentrennung)',
  2: 'TDDDG & Endgeräteschutz (Zero-Tracking & Storage)',
  3: 'Statusrecht & Herrenberg-Compliance (BSG B 12 R 3/20 R / § 7 SGB IV)',
  4: 'Mitbestimmung & Arbeitnehmerschutz (§ 87 BetrVG / ArbZG)',
  5: 'Minderjährigenschutz & Strafrecht (§ 8a SGB VIII / §§ 176a, 201 StGB / KUG § 22)',
  6: 'Urheberrecht, Noten & Streaming (UrhG / UrhDaG / GEMA)',
  7: 'Zivil- & SaaS-Vertragsrecht (BGB §§ 305 ff., 312j, 312k, 535 ff.)',
  8: 'Preisangaben, Steuer- & Kassenrecht (PAngV / UStG / GoBD / KSVG)',
  9: 'Raumausstattungs-Inventar, Zero-Commerce & ERP-Botenstatus (BGB § 130, Ausschluss §§ 535 ff., 598 ff. BGB)',
  10: 'Veranstaltungsrecht, Konzerte & GEMA (UrhG § 15, BGB § 823 Enthaftung)',
  11: 'Privatrechtlicher Unterricht, Kooperationen & BuT-Schutz (BGB §§ 611 ff. / SGB II § 28 Abs. 7)',
  12: 'Gesundheits-, Arbeits- & Lärmschutz-Enthaftung (BGB § 823 / ArbSchG / Quiet Hours)',
  13: 'Digitale Barrierefreiheit (BFSG 2025 / BITV 2.0 / WCAG 2.2 AA)',
  14: 'NIS-2, Cyber Resilience Act & IT-Sicherheit (ISO 27001 / WORM Audit)',
  15: 'Künstliche Intelligenz & Signalverarbeitung (EU AI Act - Deterministische DSP)',
  16: 'Finanzaufsicht & Zahlungsdiensterecht (ZAG / PSD2 / PSD3 - Zero Money Transit)',
  17: 'Schweizer Recht (revDSG / MWSTG Art. 21 / VMS / 5-Rappen-Rundung)',
  18: 'Österreichisches Recht (DSG § 1 / BiDokG 2020 / § 42f UrhG-AT / RKSV)'
};

/**
 * Der vollständige 180-Punkte-Katalog als typisiertes Datenmodell.
 */
export const COMPLIANCE_RULES_180: ComplianceRuleDefinition[] = [
  // BEREICH A: EU-DSGVO & BDSG (001 – 040)
  {
    id: 'RULE-001',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 28 Abs. 3',
    description: 'Elektronischer AVV-Abschluss im B2B-Onboarding vor erster Schülerdatenerfassung',
    severity: 'CRITICAL',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/components/AVVModal.tsx',
    enforcementMechanism: 'AVVModal.tsx forciert Zeichnung; DB speichert avv_signed_at'
  },
  {
    id: 'RULE-002',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 28 Abs. 3 / Art. 5 Abs. 2',
    description: 'Gerichtsverwertbarer WebCrypto SHA-256 Digest über AVV-Vertragstext, Signee und Timestamp',
    severity: 'CRITICAL',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/components/AVVModal.tsx',
    enforcementMechanism: 'WebCrypto SHA-256 Digest in public.audit_logs und schools.avv_checksum'
  },
  {
    id: 'RULE-003',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 28 Abs. 2',
    description: 'Transparente Sub-Processor-Liste mit Hetzner Online GmbH und 14-tägiger Benachrichtigungsfrist',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/components/AVVModal.tsx',
    enforcementMechanism: 'AVV § 4 deklariert Subunternehmer und 14-Tage-Widerspruchsklausel'
  },
  {
    id: 'RULE-004',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 28 Abs. 3 lit. g',
    description: 'Vertragsbeendigungs- & Datenrückgabe-Pipeline mit Datenrückgabe (.ZIP) und WORM-Tombstone',
    severity: 'HIGH',
    category: 'DATABASE_KERNEL',
    invariantTarget: 'supabase/migrations/452_enterprise_multitenancy_forensic_killswitch_and_export.sql',
    enforcementMechanism: 'RPC execute_tenant_exmatriculation & storage janitor'
  },
  {
    id: 'RULE-005',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 30',
    description: 'Bereitstellung eines schlüsselfertigen Muster-VVT für den Musikschulinhaber',
    severity: 'MEDIUM',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'docs/VVT_MUSTER_SCHULTRAEGER_ART30.md',
    enforcementMechanism: 'Dokumentation & PDF-Generator in dpoComplianceDossierGenerator.ts'
  },
  {
    id: 'RULE-006',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 35',
    description: 'Formelles DSFA-Negativattest zum Ausschluss der DSK-Blacklist-Kriterien',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'docs/LEGAL_COMPLIANCE_360_DOSSIER.md',
    enforcementMechanism: 'DSFA-Negativattest im DPO-Compliance-Koffer'
  },
  {
    id: 'RULE-007',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 8 Abs. 1',
    description: 'Parental Consent Gate für Minderjährige unter 16 Jahren',
    severity: 'CRITICAL',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/LegalConsentGate.tsx',
    enforcementMechanism: 'Forcierte Zustimmung der Eltern vor Schüler-Aktivierung'
  },
  {
    id: 'RULE-008',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 8 Abs. 2',
    description: 'Serverseitige Altersverifikation via Server RPCs (set_personal_pin, verify_parent_pin_with_lease)',
    severity: 'CRITICAL',
    category: 'DATABASE_KERNEL',
    invariantTarget: 'supabase/migrations/323_enterprise_physical_secret_purge_and_zero_knowledge_auth.sql',
    enforcementMechanism: 'RPC verify_parent_pin_with_lease; 0 JS-Vergleiche im Browser'
  },
  {
    id: 'RULE-009',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 5 Abs. 1 lit. c',
    description: 'Schüler-Roster automatische Nachnamensmaskierung („Max M.“) auf Lehrkraft-Oberflächen',
    severity: 'HIGH',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/services/studentRosterService.ts',
    enforcementMechanism: 'maskLastName() formatiert Nachnamen zu Initialen'
  },
  {
    id: 'RULE-010',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 5 Abs. 1 lit. c',
    description: 'Verbot von E-Mail-Adress-Erfassung bei Minorschülern',
    severity: 'CRITICAL',
    category: 'DATABASE_KERNEL',
    invariantTarget: 'supabase/migrations/302_enterprise_absolute_zero_leak_purge.sql',
    enforcementMechanism: 'Minorschüler besitzen keine email-Spalte in DB'
  },
  {
    id: 'RULE-011',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 5 Abs. 1 lit. c',
    description: 'Schüler-Login ausschließlich über QR-Code, Ausweis-ID oder PIN (authenticate_by_credential)',
    severity: 'CRITICAL',
    category: 'DATABASE_KERNEL',
    invariantTarget: 'supabase/migrations/323_enterprise_physical_secret_purge_and_zero_knowledge_auth.sql',
    enforcementMechanism: 'Autoritativer RPC authenticate_by_credential'
  },
  {
    id: 'RULE-012',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 25',
    description: 'Zero-Secret-Leakage: Verbot von Klartext-PINs/Hashes in SELECT-Abfragen',
    severity: 'CRITICAL',
    category: 'AST_NEGATIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/',
    enforcementMechanism: 'Guard LEG-03 verbietet PostgREST-Select-Statements auf geheime Auth-Spalten'
  },
  {
    id: 'RULE-013',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 25',
    description: 'ISO/IEC 27001 Zero-Client-Secrets: Verbot von Passwörtern und PINs in localStorage/sessionStorage',
    severity: 'CRITICAL',
    category: 'AST_NEGATIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/',
    enforcementMechanism: 'Guard LEG-05 verbietet setItem mit PINs oder Passwörtern'
  },
  {
    id: 'RULE-014',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 17 / DIN 66398',
    description: 'Musikschul-Löschkonzept nach DIN 66398 mit Klassen LK 1 bis LK 5',
    severity: 'HIGH',
    category: 'DATABASE_KERNEL',
    invariantTarget: 'docs/COMPLIANCE_DOSSIER_DSGVO_DIN66398.md',
    enforcementMechanism: 'Löschklassen LK 1–5 in DB & Cronjobs hinterlegt'
  },
  {
    id: 'RULE-015',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 17',
    description: 'Dynamischer Schuljahres-Purge für Übe-Audios am Ende des ersten Monats des individuellen Schuljahres',
    severity: 'HIGH',
    category: 'DATABASE_KERNEL',
    invariantTarget: 'supabase/migrations/454_academic_year_dynamic_purge_and_schema.sql',
    enforcementMechanism: 'pg_cron cron_enforce_academic_year_audio_purge()'
  },
  {
    id: 'RULE-016',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 17',
    description: 'Autonomer 1-Klick-Sofortlösch-RPC für Eltern über freiwillige Schüleraufnahmen',
    severity: 'HIGH',
    category: 'DATABASE_KERNEL',
    invariantTarget: 'supabase/migrations/453_parent_autonomous_audio_purge_rpc.sql',
    enforcementMechanism: 'RPC purge_student_recordings_by_parent()'
  },
  {
    id: 'RULE-017',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 17',
    description: 'Shared Device Scrubber bereinigt alle lokalen Caches auf Schul-Tablets beim Logout',
    severity: 'CRITICAL',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/utils/sharedDeviceScrubber.ts',
    enforcementMechanism: 'Guard LEG-04 sichert scrubSharedDeviceCache() in useAuthSessionActions'
  },
  {
    id: 'RULE-018',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 15 / 20',
    description: 'Automatisierter DSGVO-Selbstauskunft-Export mit echtem WebCrypto SHA-256 Siegel',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/services/gdprDataExportService.ts',
    enforcementMechanism: 'computeSha256(payloadString) signiert JSON-Export'
  },
  {
    id: 'RULE-019',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 16',
    description: 'Revisionssichere Korrekturfunktionen für fehlerhafte Schüler- und Vertragsstammdaten',
    severity: 'MEDIUM',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/secretary/',
    enforcementMechanism: 'Roster- und Profil-Updates via autorisierte API'
  },
  {
    id: 'RULE-020',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 18 / 21',
    description: 'Widerspruchs- und selektive Sperrfunktion gegen optionale didaktische Features (Campus-Cup, Leaderboard, Shoutbox)',
    severity: 'HIGH',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/student/settings/ParentProtectionSettingsView.tsx',
    enforcementMechanism: 'Elterliche Schalter für Leaderboard, Shoutbox und Audio'
  },
  {
    id: 'RULE-021',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 9 Abs. 1',
    description: 'Schüler-Absagen-Neutralität: Absage rein als canceled_by_student ohne Symptome',
    severity: 'CRITICAL',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/student/hooks/useStudentSchedule.ts',
    enforcementMechanism: 'Guard LEG-14 verbietet Erfassung medizinischer Symptome'
  },
  {
    id: 'RULE-022',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 9 Abs. 1',
    description: 'Lehrer-Ausfall-Neutralität: Absage rein als teacher_ausfall ohne ICD-10 oder Atteste',
    severity: 'CRITICAL',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/teacher/hooks/useTeacherAbsence.ts',
    enforcementMechanism: 'Guard LEG-14 verbietet Diagnoseerfassung'
  },
  {
    id: 'RULE-023',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 9 Abs. 1',
    description: 'Vollständiger Ausschluss biometrischer Stimm- oder Sprecherprofilierung',
    severity: 'CRITICAL',
    category: 'AST_NEGATIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'voiceBiometricsExclusion Klausel & Fehlen von Stimm-KI'
  },
  {
    id: 'RULE-024',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 9 Abs. 1',
    description: 'Verbot von Video-Streaming oder Gesichtserkennung im Schülerbereich',
    severity: 'CRITICAL',
    category: 'AST_NEGATIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/',
    enforcementMechanism: 'Vollständiger Ausschluss von Video-Streams im Code'
  },
  {
    id: 'RULE-025',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 32',
    description: 'Multi-Tenant Kernel-Isolation via PostgreSQL Row Level Security (FORCE ROW LEVEL SECURITY)',
    severity: 'CRITICAL',
    category: 'DATABASE_KERNEL',
    invariantTarget: 'supabase/migrations/',
    enforcementMechanism: 'FORCE ROW LEVEL SECURITY auf allen Mandantentabellen'
  },
  {
    id: 'RULE-026',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 32',
    description: 'Erzwungenes TLS 1.3 mit PFS, HSTS (mind. 1 Jahr) und Preload',
    severity: 'CRITICAL',
    category: 'SECURITY_HEADER',
    invariantTarget: 'scripts/verify_perimeter_headers.mjs',
    enforcementMechanism: 'Perimeter-Header-Guard prüft HSTS und TLS'
  },
  {
    id: 'RULE-027',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 32',
    description: 'JWE AES-256-GCM verschlüsselte Sessions mit rollierenden Leases und BFF-Kapselung',
    severity: 'HIGH',
    category: 'SECURITY_HEADER',
    invariantTarget: 'apps/groovelab/src/lib/supabase.ts',
    enforcementMechanism: 'Session-Lease-Architektur mit gl_active_session_lease_id'
  },
  {
    id: 'RULE-028',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 32',
    description: 'PBKDF2 Zero-Knowledge Hashing mit mind. 100.000 Runden (SHA-512) für PINs und Passwörter',
    severity: 'CRITICAL',
    category: 'DATABASE_KERNEL',
    invariantTarget: 'supabase/migrations/323_enterprise_physical_secret_purge_and_zero_knowledge_auth.sql',
    enforcementMechanism: 'PBKDF2 SHA-512 100.000 Runden in Auth RPCs'
  },
  {
    id: 'RULE-029',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 32',
    description: 'Stündliche georedundante Backups (RPO <= 60m, RTO <= 45m, Age X25519)',
    severity: 'CRITICAL',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'docs/RUNBOOK_DISASTER_RECOVERY_HETZNER.md',
    enforcementMechanism: 'Disaster Recovery Runbook & Age X25519 Verschlüsselung'
  },
  {
    id: 'RULE-030',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 33 / 34',
    description: '24h-Vorfallsmeldeplan an Schulleitung zur Wahrung der 72h-Behördenfrist',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'docs/infrastructure/INCIDENT_RESPONSE_RUNBOOK.md',
    enforcementMechanism: 'Incident Response Runbook & AVV § 6 Abs. 2 (24h-Vorwarnung)'
  },
  {
    id: 'RULE-031',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 44 ff.',
    description: '100% deutsches/europäisches Hosting ohne US-Cloud (Hetzner Falkenstein/Nürnberg, Schrems II konform)',
    severity: 'CRITICAL',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'docs/LEGAL_COMPLIANCE_360_DOSSIER.md',
    enforcementMechanism: 'AVV § 3 & Ausschluss von AWS/Azure/GCP Runtimes'
  },
  {
    id: 'RULE-032',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 12',
    description: 'Datenschutzerklärung in kindgerechter, leichter Sprache für Minderjährige',
    severity: 'HIGH',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/constants/legalContent.ts',
    enforcementMechanism: 'Junior Privacy Text in verständlicher Sprache'
  },
  {
    id: 'RULE-033',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 13 / 14',
    description: 'Transparenz über Rechtsgrundlagen, Zwecke und Speicherdauern beim Login',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/components/LegalContentModal.tsx',
    enforcementMechanism: 'Transparenzhinweise im Footer und Login-Modal'
  },
  {
    id: 'RULE-034',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 25',
    description: 'Privacy by Default: Leaderboards standardmäßig false für alle Minderjährigen unter 16 Jahren',
    severity: 'CRITICAL',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/student/studentAgeStandards.ts',
    enforcementMechanism: 'allowLeaderboard: false für Junior & Teen; Opt-in nur durch Eltern'
  },
  {
    id: 'RULE-035',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 25',
    description: 'Screenless Mode zur Vermeidung digitaler Bildschirmzeit im Grundschulalter',
    severity: 'MEDIUM',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/student/settings/ParentScreenTimeSettingsView.tsx',
    enforcementMechanism: 'Screenless Practice & 60-Minuten Plausibilitäts-Cap'
  },
  {
    id: 'RULE-036',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 82',
    description: 'AVV-Haftungsfreistellung für Datenschutzverstöße der Schule im Innenverhältnis (Hold-Harmless)',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/components/AVVModal.tsx',
    enforcementMechanism: 'AVV § 8 Abs. 3 vollständige Freistellung durch Schulträger'
  },
  {
    id: 'RULE-037',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 7 Abs. 3',
    description: 'Autoritativer RPC für den Widerruf von Einwilligungen mit WORM-Logging (revoke_user_legal_consent)',
    severity: 'CRITICAL',
    category: 'DATABASE_KERNEL',
    invariantTarget: 'supabase/migrations/442_enterprise_legal_consents_state_machine_worm.sql',
    enforcementMechanism: 'RPC revoke_user_legal_consent() mit State-Machine-Trigger'
  },
  {
    id: 'RULE-038',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 6 Abs. 1 lit. b & f',
    description: 'Föderale Ferienkalender-Harmonisierung über deklarative Jurisdiktionsmatrix (jurisdictionRegistry.ts)',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/jurisdictionRegistry.ts',
    enforcementMechanism: 'JURISDICTION_REGISTRY parametrisiert 16 BL + CH + AT dynamisch'
  },
  {
    id: 'RULE-039',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 24 / Art. 28 Abs. 3 lit. h',
    description: 'Dediziertes DPO-Audit-Portal mit Live-Anbindung an public.audit_logs',
    severity: 'HIGH',
    category: 'DATABASE_KERNEL',
    invariantTarget: 'apps/groovelab/src/components/DpoAuditPortal.tsx',
    enforcementMechanism: 'RPC get_tenant_dpo_audit_trail() liefert echte WORM-Logs'
  },
  {
    id: 'RULE-040',
    pillar: 1,
    pillarName: COMPLIANCE_PILLARS_18[1],
    norm: 'DSGVO Art. 5 Abs. 1 lit. f',
    description: 'Automatische Maskierung von Klarnamen und E-Mails in allen Log-Metadaten (auditLogService.ts)',
    severity: 'CRITICAL',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/services/auditLogService.ts',
    enforcementMechanism: 'sanitizeMetadata maskiert sensible Felder zu [REDACTED]'
  },

  // BEREICH B: TDDDG & ENDGERÄTESCHUTZ (041 – 050)
  {
    id: 'RULE-041',
    pillar: 2,
    pillarName: COMPLIANCE_PILLARS_18[2],
    norm: 'TDDDG § 25 Abs. 1',
    description: 'Verbot aller unbefugten Third-Party-Tracker, Analyse-Pixel und Werbe-SDKs',
    severity: 'CRITICAL',
    category: 'AST_NEGATIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/',
    enforcementMechanism: 'Guard LEG-06 verbietet Google Analytics, Facebook Pixel, Mixpanel etc.'
  },
  {
    id: 'RULE-042',
    pillar: 2,
    pillarName: COMPLIANCE_PILLARS_18[2],
    norm: 'TDDDG § 25 Abs. 2',
    description: 'Lokale Speicherung strikt auf technisch unbedingt erforderliche Zwecke limitiert',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'TDDDG § 25 Abs. 2 Deklaration in Legal Hub'
  },
  {
    id: 'RULE-043',
    pillar: 2,
    pillarName: COMPLIANCE_PILLARS_18[2],
    norm: 'TDDDG § 25 Abs. 2 Nr. 2',
    description: 'PWA Offline Cache (groovelab_audio_vault) ausschließlich für didaktisches Offline-Playback',
    severity: 'HIGH',
    category: 'SECURITY_HEADER',
    invariantTarget: 'apps/groovelab/src/utils/audioStorageHelper.ts',
    enforcementMechanism: 'IndexedDB Vault speichert Audios rein lokal verschlüsselt'
  },
  {
    id: 'RULE-044',
    pillar: 2,
    pillarName: COMPLIANCE_PILLARS_18[2],
    norm: 'TDDDG § 25 Abs. 1',
    description: 'Verbot von Session-Tracking über Dritte oder seitenübergreifendem Browser-Fingerprinting',
    severity: 'CRITICAL',
    category: 'SECURITY_HEADER',
    invariantTarget: 'scripts/verify_perimeter_headers.mjs',
    enforcementMechanism: 'Permissions-Policy unterbindet Fingerprinting'
  },
  {
    id: 'RULE-045',
    pillar: 2,
    pillarName: COMPLIANCE_PILLARS_18[2],
    norm: 'TDDDG § 25 Abs. 2 Nr. 2',
    description: 'WebAuthn Passkey Credentials verbleiben hermetisch auf der Secure Enclave des Endgeräts',
    severity: 'HIGH',
    category: 'SECURITY_HEADER',
    invariantTarget: 'apps/groovelab/src/services/webAuthnService.ts',
    enforcementMechanism: 'FIDO2 WebAuthn Standard; private Schlüssel verlassen Enclave nie'
  },
  {
    id: 'RULE-046',
    pillar: 2,
    pillarName: COMPLIANCE_PILLARS_18[2],
    norm: 'TDDDG § 25 Abs. 2 Nr. 2',
    description: 'Service Worker Cache-Busting (/sw.js) bei Sicherheitsupdates ohne Verzögerung',
    severity: 'HIGH',
    category: 'SECURITY_HEADER',
    invariantTarget: 'scripts/verify_perimeter_headers.mjs',
    enforcementMechanism: 'Cache-Control: no-cache, no-store auf /sw.js'
  },
  {
    id: 'RULE-047',
    pillar: 2,
    pillarName: COMPLIANCE_PILLARS_18[2],
    norm: 'TDDDG § 25 Abs. 2 Nr. 2',
    description: 'AudioContext-Freischaltung erst nach expliziter Nutzerinteraktion (Tap/Klick)',
    severity: 'MEDIUM',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/utils/audioContextManager.ts',
    enforcementMechanism: 'User-Gesture Trigger vor AudioContext.resume()'
  },
  {
    id: 'RULE-048',
    pillar: 2,
    pillarName: COMPLIANCE_PILLARS_18[2],
    norm: 'TDDDG § 25 Abs. 2 Nr. 2',
    description: 'Screen-WakeLock während Übesessions; automatisches Release bei Tab-Wechsel',
    severity: 'MEDIUM',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/student/hooks/useStudentPracticeSession.ts',
    enforcementMechanism: 'wakeLock.release() bei visibilitychange / unmount'
  },
  {
    id: 'RULE-049',
    pillar: 2,
    pillarName: COMPLIANCE_PILLARS_18[2],
    norm: 'TDDDG § 25 Abs. 2 Nr. 2',
    description: 'Zugriff auf Zwischenablage ausschließlich bei aktiver Nutzeraktion (Kopieren)',
    severity: 'HIGH',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/',
    enforcementMechanism: 'navigator.clipboard.writeText nur in expliziten onClick-Handlern'
  },
  {
    id: 'RULE-050',
    pillar: 2,
    pillarName: COMPLIANCE_PILLARS_18[2],
    norm: 'TDDDG § 25 / Perimeter Sandbox',
    description: 'Ausschluss unbefugter Third-Party-Zugriffe auf Sensoren & Gyroskope via Perimeter-Header (lokaler Anti-Cheat-Timer bleibt zulässig gem. § 25 Abs. 2 Nr. 2 TDDDG)',
    severity: 'CRITICAL',
    category: 'SECURITY_HEADER',
    invariantTarget: 'scripts/verify_perimeter_headers.mjs',
    enforcementMechanism: 'Permissions-Policy: geolocation=(), gyroscope=(), magnetometer=()'
  },

  // BEREICH C: STATUSRECHT & HERRENBERG (051 – 065)
  {
    id: 'RULE-051',
    pillar: 3,
    pillarName: COMPLIANCE_PILLARS_18[3],
    norm: 'BSG B 12 R 3/20 R / § 106 GewO',
    description: 'Ausschluss einseitiger arbeitgeberseitiger Direktionsrechte an freie Dozenten',
    severity: 'CRITICAL',
    category: 'AST_NEGATIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/secretary/SecretaryScheduleView.tsx',
    enforcementMechanism: 'Guard LEG-20 & LEG-24 sichern didaktische Dispositionsautonomie'
  },
  {
    id: 'RULE-052',
    pillar: 3,
    pillarName: COMPLIANCE_PILLARS_18[3],
    norm: 'BSG B 12 R 3/20 R',
    description: 'Stundenplan fungiert als rein didaktisches Abstimmungsinstrument',
    severity: 'CRITICAL',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'twoStageScheduleAndRoomModel Klausel verankert'
  },
  {
    id: 'RULE-053',
    pillar: 3,
    pillarName: COMPLIANCE_PILLARS_18[3],
    norm: 'BSG B 12 R 3/20 R',
    description: 'Zweistufiges Raum-Dispositionsmodell: Lehrkraft schlägt vor, Schulsekretariat prüft technische Verfügbarkeit',
    severity: 'CRITICAL',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/secretary/SecretaryRoomsView.tsx',
    enforcementMechanism: 'Guard LEG-24 verifiziert zweistufiges Raumbuchungs-Modell'
  },
  {
    id: 'RULE-054',
    pillar: 3,
    pillarName: COMPLIANCE_PILLARS_18[3],
    norm: '§ 7 SGB IV / § 611a BGB',
    description: 'Verbot von Direktionsbegriffen (Dienstplanverpflichtung, Weisung, Stechuhr)',
    severity: 'CRITICAL',
    category: 'AST_NEGATIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/',
    enforcementMechanism: 'Guard LEG-19 durchsucht alle UI-Strings auf Weisungsvokabular'
  },
  {
    id: 'RULE-055',
    pillar: 3,
    pillarName: COMPLIANCE_PILLARS_18[3],
    norm: '§ 7 SGB IV / § 266a StGB',
    description: 'Keine verpflichtende digitale Zeiterfassung für Freiberufler',
    severity: 'CRITICAL',
    category: 'AST_NEGATIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/',
    enforcementMechanism: 'Fehlen von Stechuhren oder Arbeitszeitkontroll-Dashboards'
  },
  {
    id: 'RULE-056',
    pillar: 3,
    pillarName: COMPLIANCE_PILLARS_18[3],
    norm: '§ 7 SGB IV / BSG B 12 R 3/20 R',
    description: 'Wahrung der didaktischen Methodenfreiheit; keine erzwungenen Curricula für Honorarkräfte',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'didacticFreedomMethodology schließt Curriculum-Zwang aus'
  },
  {
    id: 'RULE-057',
    pillar: 3,
    pillarName: COMPLIANCE_PILLARS_18[3],
    norm: '§ 7 SGB IV / § 611a BGB',
    description: 'Vertretungsübernahmen für Kollegen sind rein freiwillig und sanktionsfrei',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'voluntarySubstitutionsNotice garantiert Sanktionsfreiheit'
  },
  {
    id: 'RULE-058',
    pillar: 3,
    pillarName: COMPLIANCE_PILLARS_18[3],
    norm: 'BSG B 12 R 3/20 R',
    description: 'Freiwilligkeitspostulat: Honorarkräfte dürfen Termine alternativ per E-Mail/Papier melden',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'herrenbergCompliance garantiert analoge Meldeoption'
  },
  {
    id: 'RULE-059',
    pillar: 3,
    pillarName: COMPLIANCE_PILLARS_18[3],
    norm: '§ 266a StGB / § 7 SGB IV',
    description: 'Software berechnet keine Honorarauszahlungen (strikte ERP-Trennung & Zero-Payroll)',
    severity: 'CRITICAL',
    category: 'AST_NEGATIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/',
    enforcementMechanism: 'Guard LEG-19b verbietet Dozenten-Lohnberechnungs-Engines'
  },
  {
    id: 'RULE-060',
    pillar: 3,
    pillarName: COMPLIANCE_PILLARS_18[3],
    norm: 'BSG B 12 R 3/20 R',
    description: 'Keine Teilnahmepflicht für Honorarkräfte an schulischen Gesamtkonferenzen',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'nonParticipationConferences schließt Konferenzzwang aus'
  },
  {
    id: 'RULE-061',
    pillar: 3,
    pillarName: COMPLIANCE_PILLARS_18[3],
    norm: '§ 7 SGB IV',
    description: 'Nutzung eigener Endgeräte (BYOD) durch freie Lehrkräfte ausdrücklich gestattet',
    severity: 'MEDIUM',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'byodDeviceFreedom garantiert Freiheit von Geräte- und MDM-Zwang'
  },
  {
    id: 'RULE-062',
    pillar: 3,
    pillarName: COMPLIANCE_PILLARS_18[3],
    norm: 'BSG B 12 R 3/20 R',
    description: 'Ausfall- & Nachhol-Architektur schützt Autonomie; keine fremdbestimmte Vertretungszuweisung',
    severity: 'HIGH',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/teacher/TeacherMakeupTokenModal.tsx',
    enforcementMechanism: 'Didaktisches Makeup-Token System für Lehrkraft-Selbstnachholung'
  },
  {
    id: 'RULE-063',
    pillar: 3,
    pillarName: COMPLIANCE_PILLARS_18[3],
    norm: 'BSG B 12 R 3/20 R / § 2 EntgFG',
    description: 'Keine Festlegung bezahlter unterrichtsfreier Zeiten (Ferienvergütung) bei Honorarkräften',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'noPaidHolidayClauses schließt Durchbezahlungsvereinbarungen aus'
  },
  {
    id: 'RULE-064',
    pillar: 3,
    pillarName: COMPLIANCE_PILLARS_18[3],
    norm: '§ 7 SGB IV / Art. 12 GG',
    description: 'Ausschluss von Wettbewerbs- und Nebentätigkeitsverboten für Honorarlehrkräfte',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'nonExclusivityMultiSchoolFreedom sichert Multi-Schul-Tätigkeit'
  },
  {
    id: 'RULE-065',
    pillar: 3,
    pillarName: COMPLIANCE_PILLARS_18[3],
    norm: '§ 266a StGB / § 7a SGB IV',
    description: 'Bereitstellung von Dokumentationsnachweisen für Statusfeststellungsverfahren der DRV',
    severity: 'CRITICAL',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/admin/CourtProofExportModal.tsx',
    enforcementMechanism: 'Court-Proof Export bindet herrenberg_status_attestation mit SHA-256 ein'
  },

  // BEREICH D: MITBESTIMMUNG & ARBEITNEHMERSCHUTZ (066 – 075)
  {
    id: 'RULE-066',
    pillar: 4,
    pillarName: COMPLIANCE_PILLARS_18[4],
    norm: '§ 87 Abs. 1 Nr. 6 BetrVG',
    description: 'Ausschluss jeglicher automatisierter Leistungs- und Verhaltenskontrolle von Lehrkräften',
    severity: 'CRITICAL',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'docs/STAFF_COUNCIL_COMPLIANCE_DECLARATION.md',
    enforcementMechanism: 'Personalrats-Attest bescheinigt Ausschluss von Leistungsmetriken'
  },
  {
    id: 'RULE-067',
    pillar: 4,
    pillarName: COMPLIANCE_PILLARS_18[4],
    norm: '§ 87 Abs. 1 Nr. 6 BetrVG',
    description: 'Ausschluss von Lehrer-Aktivitäts-Dashboards (Verbot von Login-Frequenz-, Antwortzeit- oder Ranking-Auswertungen)',
    severity: 'CRITICAL',
    category: 'AST_NEGATIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/admin/',
    enforcementMechanism: 'Guard LEG-21c verbietet Überwachungs- und Ranking-Metriken im Admin- und Sekretariatsbereich'
  },
  {
    id: 'RULE-068',
    pillar: 4,
    pillarName: COMPLIANCE_PILLARS_18[4],
    norm: 'ArbZG § 5 / ArbSchG § 5',
    description: 'Integrierte Quiet Hours zur Unterdrückung von Push-Nachrichten zur Ruhezeit (19:00–07:30 & Wochenende)',
    severity: 'HIGH',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/teacher/TeacherSettingsView.tsx',
    enforcementMechanism: 'Guard LEG-21 sichert Quiet-Hours-Toggles für Lehrkräfte'
  },
  {
    id: 'RULE-069',
    pillar: 4,
    pillarName: COMPLIANCE_PILLARS_18[4],
    norm: 'ArbZG § 5 / ArbSchG § 5',
    description: 'Asynchronitäts-Garantie: Keine Reaktionspflicht an Wochenenden, Feiertagen und in Ruhezeiten',
    severity: 'HIGH',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/campus/chat/CampusDirectMessages.tsx',
    enforcementMechanism: 'Ambient Feierabend-Pill und Wochenend-Sperre in Band-Shoutbox schützen Lehrkräfte vor Erreichbarkeitsdruck'
  },
  {
    id: 'RULE-070',
    pillar: 4,
    pillarName: COMPLIANCE_PILLARS_18[4],
    norm: 'ArbZG § 3',
    description: 'Höchstarbeitszeit-Transparenz: Dezenter Ambient-Hinweis bei geplanter Tagesunterrichtszeit > 8 Std.',
    severity: 'MEDIUM',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/ScheduleBoardDesktop.tsx',
    enforcementMechanism: 'Stundenplaner weist unverbindlich auf gesetzliche Ruhe- und Ausgleichszeiten hin (ohne Zwang)'
  },
  {
    id: 'RULE-071',
    pillar: 4,
    pillarName: COMPLIANCE_PILLARS_18[4],
    norm: 'BetrVG § 87 Abs. 1 Nr. 6',
    description: 'Betriebliche Mitbestimmungskonformität: Transparente Dokumentation bei Einführung digitaler Systeme im Bildungswesen',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'docs/STAFF_COUNCIL_COMPLIANCE_DECLARATION.md',
    enforcementMechanism: 'Bereitstellung der Compliance-Dokumentation mit Prüfungs-Zusicherung für Betriebsräte'
  },
  {
    id: 'RULE-072',
    pillar: 4,
    pillarName: COMPLIANCE_PILLARS_18[4],
    norm: 'BetrVG / DSGVO Art. 88',
    description: 'Ausschluss vergleichender Dozenten-Rankings („Top-Lehrer“-Scores oder Aktivitätsvergleiche architektonisch gesperrt)',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/components/admin/',
    enforcementMechanism: 'Architektonischer Ausschluss von Mitarbeiter-Scores und Aktivitäts-Rankings'
  },
  {
    id: 'RULE-073',
    pillar: 4,
    pillarName: COMPLIANCE_PILLARS_18[4],
    norm: '§ 80 Abs. 2 BetrVG / DSGVO Art. 25',
    description: 'Neutraler Tätigkeitsbericht: Aggregierte Schulgesamtzahlen im Court-Proof Export ohne individuelles Mitarbeiter-Profiling',
    severity: 'HIGH',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/admin/CourtProofExportModal.tsx',
    enforcementMechanism: 'Court-Proof Export bindet staff_council_compliance-Attest mit SHA-256 Siegel ein'
  },
  {
    id: 'RULE-074',
    pillar: 4,
    pillarName: COMPLIANCE_PILLARS_18[4],
    norm: '§ 5, § 6 ArbSchG',
    description: 'Gefährdungsbeurteilung psychischer Belastungen für digitale Medien nach DGUV Information 211-042',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'docs/GEFAEHRDUNGSBEURTEILUNG_ARBSCHG_DIGITALE_MEDIEN.md',
    enforcementMechanism: 'Schlüsselfertiger Prüfbogen dokumentiert die 7 Schutzfaktoren von Campus-Groovelab'
  },
  {
    id: 'RULE-075',
    pillar: 4,
    pillarName: COMPLIANCE_PILLARS_18[4],
    norm: 'BetrVG § 77 / BGB',
    description: 'Schlüsselfertige Muster-Betriebsvereinbarung bzw. IT-Nutzungsrichtlinie für private Musikschulen',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'docs/MUSTER_DIENSTVEREINBARUNG_PERSONALRAT.md',
    enforcementMechanism: 'Muster-Vereinbarung mit 8 Paragraphen regelt Nichtüberwachung, Quiet Hours & Freiwilligkeit'
  },

  // BEREICH E: MINDERJÄHRIGENSCHUTZ & BILDNISRECHT (076 – 090)
  {
    id: 'RULE-076',
    pillar: 5,
    pillarName: COMPLIANCE_PILLARS_18[5],
    norm: 'KUG § 22',
    description: 'Zero-Photo-Doktrin: Verbot von Klarnamen-Porträtfotos für minderjährige Schüler',
    severity: 'CRITICAL',
    category: 'AST_NEGATIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/student/',
    enforcementMechanism: 'Guard LEG-13 verbietet Foto-Uploads für Schüler'
  },
  {
    id: 'RULE-077',
    pillar: 5,
    pillarName: COMPLIANCE_PILLARS_18[5],
    norm: 'KUG § 22',
    description: 'Automatische Bereitstellung kuratierter 3D-Instrumenten-Avatare (avatarResolutionEngine.ts)',
    severity: 'HIGH',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/utils/avatarResolutionEngine.ts',
    enforcementMechanism: 'Kuratierte 3D-Avatare statt Fotos'
  },
  {
    id: 'RULE-079',
    pillar: 5,
    pillarName: COMPLIANCE_PILLARS_18[5],
    norm: 'StGB § 201',
    description: 'Hardwaresperre des Mikrofons für Minors bis zur elterlichen Freigabe (Vertraulichkeit des Wortes)',
    severity: 'CRITICAL',
    category: 'DATABASE_KERNEL',
    invariantTarget: 'apps/groovelab/src/components/student/hooks/useStudentPractice.ts',
    enforcementMechanism: 'parent_allow_audio forciert Mikrofon-Sperre'
  },
  {
    id: 'RULE-081',
    pillar: 5,
    pillarName: COMPLIANCE_PILLARS_18[5],
    norm: 'StGB § 176a / DSA Art. 16',
    description: 'Chat-Respect-Guard filtert Beleidigungen und Missbrauchsmuster (chatRespectGuard.ts)',
    severity: 'CRITICAL',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/utils/chatRespectGuard.ts',
    enforcementMechanism: 'Guard LEG-17 prüft Beleidigungs- und Missbrauchsfilter'
  },

  // BEREICH F: URHEBERRECHT & NOTEN (091 – 105)
  {
    id: 'RULE-091',
    pillar: 6,
    pillarName: COMPLIANCE_PILLARS_18[6],
    norm: 'UrhG § 53 Abs. 4 / UrhDaG § 1 Abs. 2',
    description: 'Vollständiges Verbot des Uploads und Teilens von Noten-PDFs (Notenkopierverbot)',
    severity: 'CRITICAL',
    category: 'AST_NEGATIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/',
    enforcementMechanism: 'Guard LEG-22 blockiert Noten-PDF-Uploads hermetisch'
  },
  {
    id: 'RULE-094',
    pillar: 6,
    pillarName: COMPLIANCE_PILLARS_18[6],
    norm: 'UrhG § 73',
    description: 'HMAC-signierte Pre-Signed Audio URLs mit Verfall nach maximal 1800s (30m)',
    severity: 'CRITICAL',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/utils/audioStorageHelper.ts',
    enforcementMechanism: 'Guard LEG-11 forciert expiresInSeconds <= 1800'
  },

  // BEREICH G: ZIVILRECHT & VERBRAUCHERSCHUTZ (106 – 120)
  {
    id: 'RULE-107',
    pillar: 7,
    pillarName: COMPLIANCE_PILLARS_18[7],
    norm: 'BGB § 312j Abs. 3',
    description: 'Gesetzliche Button-Lösung: Eindeutige Zahlungsbeschriftung („Kostenpflichtig buchen“)',
    severity: 'CRITICAL',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/billing/',
    enforcementMechanism: 'Guard LEG-07 verbietet mehrdeutige Buttons wie „Weiter“'
  },
  {
    id: 'RULE-108',
    pillar: 7,
    pillarName: COMPLIANCE_PILLARS_18[7],
    norm: 'BGB § 312k',
    description: 'Zweistufiger elektronischer Kündigungsbutton mit Fristbeleg-PDF',
    severity: 'CRITICAL',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/secretary/SecretaryBillingModalsHub.tsx',
    enforcementMechanism: 'Guard LEG-09 prüft zweistufigen Kündigungsworkflow'
  },

  // BEREICH H: PREISANGABEN & STEUER (121 – 135)
  {
    id: 'RULE-121',
    pillar: 8,
    pillarName: COMPLIANCE_PILLARS_18[8],
    norm: 'PAngV § 1 Abs. 1, 2 / BGB § 13',
    description: 'Bruttopreis-Axiom & lückenlose Endpreistransparenz für private Schüler und Eltern (B2C)',
    severity: 'CRITICAL',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/billing/',
    enforcementMechanism: 'Endpreis-Darstellung inklusive aller Preisbestandteile ohne versteckte Zuschläge'
  },
  {
    id: 'RULE-122',
    pillar: 8,
    pillarName: COMPLIANCE_PILLARS_18[8],
    norm: 'UStG § 3a Abs. 5 / § 13b / § 535 BGB',
    description: 'Duale Steuertaxonomie: Steuerbare B2B-SaaS-Hostingmiete (19% / Reverse Charge) vs. B2C-Jahresendpreis 5,39 €',
    severity: 'CRITICAL',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'privateTuitionContractAndInvoicing trennt B2B-SaaS-Hosting (19%) von B2C-Schüler-Bereitstellung (5,39 €)'
  },
  {
    id: 'RULE-123',
    pillar: 8,
    pillarName: COMPLIANCE_PILLARS_18[8],
    norm: 'UStG § 19 / PAngV',
    description: 'Ausweis der gesetzlichen Kleinunternehmer-Klausel auf Rechnungsansichten',
    severity: 'HIGH',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/billing/tabs/InvoicesSubTab/SchoolDetailPane.tsx',
    enforcementMechanism: 'Guard LEG-08 prüft § 19 UStG Ausweis'
  },
  {
    id: 'RULE-124',
    pillar: 8,
    pillarName: COMPLIANCE_PILLARS_18[8],
    norm: 'DIN EN 16931-1 / UStG § 14 Abs. 2 n.F.',
    description: 'Asymmetrische E-Rechnung: ZUGFeRD 2.2 / XRechnung nur für B2G-Kooperationen; B2C verbleibt bei lesbarer PDF-Textform',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'b2cInvoiceForm stellt PDF-Standard für Eltern und E-Rechnung für B2G-Kooperationen klar'
  },
  {
    id: 'RULE-125',
    pillar: 8,
    pillarName: COMPLIANCE_PILLARS_18[8],
    norm: 'GoBD §§ 146, 147 AO',
    description: 'Revisionssichere Immutabilität: Festgeschriebene Rechnungsbelege sind gegen Manipulation gesperrt',
    severity: 'CRITICAL',
    category: 'DATABASE_KERNEL',
    invariantTarget: 'apps/groovelab/src/components/secretary/SecretaryBillingModalsHub.tsx',
    enforcementMechanism: 'Korrekturen erfolgen ausschließlich durch formelle Stornobelege mit Audit-Trail'
  },
  {
    id: 'RULE-126',
    pillar: 8,
    pillarName: COMPLIANCE_PILLARS_18[8],
    norm: 'DIN ISO 7064',
    description: 'Mathematische MOD 97-10 IBAN-Prüfsummenvalidierung vor Lastschrift- und Datensatzerzeugung',
    severity: 'HIGH',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/billing/',
    enforcementMechanism: 'Prüfziffernvalidierung blockiert fehlerhafte IBANs fail-closed'
  },
  {
    id: 'RULE-127',
    pillar: 8,
    pillarName: COMPLIANCE_PILLARS_18[8],
    norm: 'ISO 20022',
    description: 'Valider SEPA-Sammellastschriftexport nach EPC-Schema pain.008.001.08 als unverbindliche Vorbereitungshilfe',
    severity: 'HIGH',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/secretary/SecretaryBillingModalsHub.tsx',
    enforcementMechanism: 'Generierung valider pain.008.001.08 XML-Dateien für das Hausbank-Onlinebanking der Schule'
  },
  {
    id: 'RULE-128',
    pillar: 8,
    pillarName: COMPLIANCE_PILLARS_18[8],
    norm: 'KSVG §§ 24, 25 / BSG Herrenberg',
    description: 'Informatorische KSK-Dokumentationshilfe: Aggregierte Jahresaufstellung ohne stundengenaue Arbeitszeitüberwachung',
    severity: 'HIGH',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/admin/CourtProofExportModal.tsx',
    enforcementMechanism: 'Honorarausweis für KSK-Meldung wahrt Weisungsfreiheit selbstständiger Dozenten'
  },
  {
    id: 'RULE-129',
    pillar: 8,
    pillarName: COMPLIANCE_PILLARS_18[8],
    norm: 'ZAG § 2 Abs. 1 Nr. 9',
    description: 'Hermetisches Zero Money Transit: Vollständige Freistellung von BaFin-Erlaubnispflichten',
    severity: 'CRITICAL',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'zeroMoneyTransitAxiom schließt treuhänderischen Besitz fremder Gelder vollständig aus'
  },
  {
    id: 'RULE-130',
    pillar: 8,
    pillarName: COMPLIANCE_PILLARS_18[8],
    norm: 'AO § 147 Abs. 6',
    description: 'Standardisierter 1-Klick-Datenexport für steuerliche Betriebsprüfungen (IDEA / Beschreibungsstandard)',
    severity: 'HIGH',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/admin/CourtProofExportModal.tsx',
    enforcementMechanism: 'Strukturierter Export von Buchungs- und Abrechnungsjournalen für Finanzprüfer'
  },
  {
    id: 'RULE-131',
    pillar: 8,
    pillarName: COMPLIANCE_PILLARS_18[8],
    norm: 'UStG § 14 Abs. 4',
    description: 'Lückenlose Pre-Flight-Validierung aller gesetzlichen Rechnungspflichtangaben vor Belegabschluss',
    severity: 'HIGH',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/secretary/SecretaryBillingModalsHub.tsx',
    enforcementMechanism: 'Pre-Flight-Prüfung sichert Steuernummer, Leistungsdatum und fortlaufenden Rechnungsnummernkreis'
  },
  {
    id: 'RULE-132',
    pillar: 8,
    pillarName: COMPLIANCE_PILLARS_18[8],
    norm: 'UStG § 13b / Art. 196 MWST-SystRL',
    description: 'Automatischer Steuerschuldübergang (Reverse Charge) bei grenzüberschreitenden B2B-SaaS-Lizenzen (AT/CH)',
    severity: 'HIGH',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/billing/',
    enforcementMechanism: 'Automatischer Netto-Ausweis mit Reverse-Charge-Vermerk bei validierter ausländischer USt-IdNr.'
  },
  {
    id: 'RULE-133',
    pillar: 8,
    pillarName: COMPLIANCE_PILLARS_18[8],
    norm: 'PAngV § 1 Abs. 3 / BGB § 307',
    description: 'Transparenzgebot bei Preisnachlässen: Aufschlüsselung von Grundpreis, Rabatt und Endzahlbetrag',
    severity: 'MEDIUM',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/billing/tabs/InvoicesSubTab/SchoolDetailPane.tsx',
    enforcementMechanism: 'Geschwister- und Kombi-Rabatte werden mit spezifischem Abzugsbetrag transparent ausgewiesen'
  },
  {
    id: 'RULE-134',
    pillar: 8,
    pillarName: COMPLIANCE_PILLARS_18[8],
    norm: 'BGB § 288 Abs. 2 / § 286 Abs. 3',
    description: 'Partnerschaftliches B2B-Mahnwesen: 30 Tage Zahlungsziel netto, 30 Tage Ambient-Schonfrist & Sommer-Moratorium',
    severity: 'MEDIUM',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'schoolDunningEngine sichert 30 Tage Nettoziel, Schonfristen und didaktische Immunität vor Schreibschutz'
  },
  {
    id: 'RULE-135',
    pillar: 8,
    pillarName: COMPLIANCE_PILLARS_18[8],
    norm: 'HGB §§ 238, 257 / AO § 147',
    description: '10 Jahre revisionssichere Langzeitarchivierung aller Belege inklusive signiertem Kündigungs-Exportpaket',
    severity: 'HIGH',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/admin/CourtProofExportModal.tsx',
    enforcementMechanism: 'Exportpaket sichert Nachweispflichten der Musikschule gegenüber der Finanzverwaltung auch nach Vertragsende'
  },

  // BEREICH I: RAUMAUSSTATTUNGS-INVENTAR & ERP-BOTENSTATUS (136 – 145)
  {
    id: 'RULE-136',
    pillar: 9,
    pillarName: COMPLIANCE_PILLARS_18[9],
    norm: 'BGB §§ 535, 598 Ausschluss',
    description: 'Hermetisches Zero-Lending: Vollständiger Ausschluss von Schüler-Leihverträgen und Instrumentenvermietung; keine Verwahr- oder Obhutshaftung',
    severity: 'CRITICAL',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'zeroRentalAndCommerceDoctrine schließt Schüler-Leihverträge und Vermietung hermetisch aus'
  },
  {
    id: 'RULE-137',
    pillar: 9,
    pillarName: COMPLIANCE_PILLARS_18[9],
    norm: 'BGB § 433 / § 506 Ausschluss',
    description: 'Zero-Commerce: Kein Verkauf, kein Ratenkauf, kein Mietkauf; vollständige Freizeichnung vom Verbraucherdarlehensrecht',
    severity: 'CRITICAL',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'zeroRentalAndCommerceDoctrine schließt Verkauf, Kauf und Ratenkauf vollständig aus'
  },
  {
    id: 'RULE-138',
    pillar: 9,
    pillarName: COMPLIANCE_PILLARS_18[9],
    norm: 'BGB § 130 Botenstatus',
    description: 'Didaktisches Raum-Inventar: Plattform ist rein unverbindliches Orientierungswerkzeug; Musikschul-ERP bleibt unangefochtene SSOT',
    severity: 'HIGH',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/secretary/SecretaryEquipmentView.tsx',
    enforcementMechanism: 'Ambient-Disclaimer in SecretaryEquipmentView stellt BGB § 130 Botenstatus und ERP-Subsidiarität klar'
  },
  {
    id: 'RULE-139',
    pillar: 9,
    pillarName: COMPLIANCE_PILLARS_18[9],
    norm: 'BGB §§ 276, 280 Enthaftung',
    description: 'Ausschluss jeglicher Gewährleistung oder Haftung für fehlerhafte, unvollständige oder veraltete Benutzereingaben bei Raum-Equipment',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'userEntryWarrantyExclusion stellt Freizeichnung von Gewährleistung für Benutzereingaben sicher'
  },
  {
    id: 'RULE-140',
    pillar: 9,
    pillarName: COMPLIANCE_PILLARS_18[9],
    norm: 'BGB § 823 Enthaftung',
    description: 'Mängel- und Ausstattungserfassung in SecretaryFacilityLogModal.tsx ist ein internes didaktisches Notizwerkzeug; Ausschluss von CAFM-Verkehrssicherungspflichten',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'facilityManagementExclusion schließt CAFM- und Verkehrssicherungspflichten aus'
  },
  {
    id: 'RULE-141',
    pillar: 9,
    pillarName: COMPLIANCE_PILLARS_18[9],
    norm: 'Raum-Zuordnungs-Axiom',
    description: 'Equipment ist technisch ausschließlich Räumen (roomId) zugeordnet, niemals Personen, Schülern oder Eltern',
    severity: 'CRITICAL',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/secretary/SecretaryEquipmentView.tsx',
    enforcementMechanism: 'EquipmentInstance bindet ausschließlich roomId; keine student_id oder user_id Relation'
  },
  {
    id: 'RULE-142',
    pillar: 9,
    pillarName: COMPLIANCE_PILLARS_18[9],
    norm: 'Mängel-Notiz-Axiom',
    description: 'Schadens- und Zustandserfassungen sind unverbindliche interne Hausmeister-Notizen ohne rechtliche Mängelrügenwirkung',
    severity: 'MEDIUM',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/secretary/SecretaryFacilityLogModal.tsx',
    enforcementMechanism: 'FacilityLogModal fungiert als unverbindliches Notizbuch ohne formelle Mängelrügenwirkung'
  },
  {
    id: 'RULE-143',
    pillar: 9,
    pillarName: COMPLIANCE_PILLARS_18[9],
    norm: 'BGB § 130 Botenstatus',
    description: 'Raum-Ausstattung dient der internen Stundenplanung; rechtsverbindliche Vermögensbuchhaltung verbleibt zu 100 % im Primär-ERP der Musikschule',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'roomEquipmentAndErpSubsidiarity stellt BGB § 130 Botenstatus und ERP-Subsidiarität klar'
  },
  {
    id: 'RULE-144',
    pillar: 9,
    pillarName: COMPLIANCE_PILLARS_18[9],
    norm: 'BGB § 280 Enthaftung',
    description: 'Defekte oder fehlende Instrumente in Räumen begründen keinerlei zivilrechtliche Schadensersatzansprüche gegen den Plattformbetreiber',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'userEntryWarrantyExclusion schließt Schadensersatzansprüche bei Unterrichtsausfall durch Equipmentdefekte aus'
  },
  {
    id: 'RULE-145',
    pillar: 9,
    pillarName: COMPLIANCE_PILLARS_18[9],
    norm: 'BGB § 280 Enthaftung',
    description: 'Ausschluss jeglicher Gewährleistung für fehlerhafte, unvollständige oder veraltete Benutzereingaben bei Raum-Equipment',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'userEntryWarrantyExclusion stellt Freizeichnung von Gewährleistung für Benutzereingaben sicher'
  },

  // BEREICH J: VERANSTALTUNGSRECHT, KONZERTE & GEMA (146 – 150)
  {
    id: 'RULE-146',
    pillar: 10,
    pillarName: COMPLIANCE_PILLARS_18[10],
    norm: 'BGB § 823 Betreiberpflichten',
    description: 'Raumkapazitäten in rooms.capacity dienen rein didaktischer Ensemble-Planung; bau- und versammlungsstättenrechtliche Zulassungen obliegen dem Schulträger',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'generalOperatorLiabilityExclusion stellt Verbleib von Versammlungsstätten- und Betreiberpflichten beim Schulträger klar'
  },
  {
    id: 'RULE-147',
    pillar: 10,
    pillarName: COMPLIANCE_PILLARS_18[10],
    norm: 'UrhG § 15 / GEMA-Enthaftung',
    description: 'Musikschule ist alleinige Veranstalterin von Schulkonzerten und verantwortlich für GEMA-Meldungen; Plattform übernimmt keine Veranstalterhaftung',
    severity: 'CRITICAL',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'generalOperatorLiabilityExclusion stellt Klarstellung der alleinigen GEMA-Meldepflicht der Schule sicher'
  },
  {
    id: 'RULE-148',
    pillar: 10,
    pillarName: COMPLIANCE_PILLARS_18[10],
    norm: 'UrhG § 53 Abs. 4 / UrhDaG',
    description: 'Hermetisches Verbot des Uploads und Teilens von Noten-PDFs an Schüler oder Ensembles (Guard LEG-22)',
    severity: 'CRITICAL',
    category: 'AST_NEGATIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/',
    enforcementMechanism: 'Guard LEG-22 blockiert Noten-PDF-Uploads und Partituren-Sharing hermetisch'
  },
  {
    id: 'RULE-149',
    pillar: 10,
    pillarName: COMPLIANCE_PILLARS_18[10],
    norm: 'KUG § 22 / DSGVO Art. 13 Sphärentrennung',
    description: 'Plattform speichert 0 Bild- und Videodaten von realen Veranstaltungen (Zero-Photo-Doktrin); Bildnisrechte vor Ort verbleiben im analogen Wirkungskreis der Schule',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'zeroPhotoPolicy schließt Speicherung von Veranstaltungsfotos und Bildnissen Minderjähriger aus'
  },
  {
    id: 'RULE-150',
    pillar: 10,
    pillarName: COMPLIANCE_PILLARS_18[10],
    norm: 'BGB § 823 / BImSchG Enthaftung',
    description: 'Zeitliche Eventplanung im Terminkalender entbindet Schulträger nicht von der Einhaltung gesetzlicher Ruhezeiten und kommunaler Sondernutzungserlaubnisse',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'generalOperatorLiabilityExclusion stellt Verbleib immissionsschutzrechtlicher Genehmigungspflichten beim Schulträger klar'
  },

  // BEREICH K: PRIVATRECHTLICHER UNTERRICHT, GANZTAGS-KOOPERATIONEN & BUT-SCHUTZ (151 – 155)
  {
    id: 'RULE-151',
    pillar: 11,
    pillarName: COMPLIANCE_PILLARS_18[11],
    norm: 'BGB §§ 611, 614 / § 286 BGB',
    description: 'Privatrechtliche Entgeltabrechnung & Fälligkeit: Ausschluss von Verwaltungsakten und KAG-Gebührenbescheiden',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'privateTuitionContractAndInvoicing stellt Rechtsnatur als privatrechtlicher Dienstvertrag klar'
  },
  {
    id: 'RULE-152',
    pillar: 11,
    pillarName: COMPLIANCE_PILLARS_18[11],
    norm: 'Didaktische Kooperationsplanung',
    description: 'Randzeiten- und Kooperationsmanagement: Einbettung privater Nachmittags-AGs im Stundenplan ohne GaFöG-Betreuungspflicht',
    severity: 'MEDIUM',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/ScheduleBoardDesktop.tsx',
    enforcementMechanism: 'ScheduleBoardDesktop unterstützt Randzeiten und externe Standorte ohne öffentlich-rechtliche Betreuungsfunktion'
  },
  {
    id: 'RULE-153',
    pillar: 11,
    pillarName: COMPLIANCE_PILLARS_18[11],
    norm: 'SGB II § 28 Abs. 7 / DSGVO Art. 9',
    description: 'Absoluter BuT-Stigmatisierungsschutz: 1-Klick-Freistellungsflag befreit Schüler ohne sichtbaren Sozialhilfe-Status',
    severity: 'CRITICAL',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'butNonStigmatizationDoctrine verbietet Kennzeichnung von BuT- oder Sozialhilfebedarf in Schüleransichten'
  },
  {
    id: 'RULE-154',
    pillar: 11,
    pillarName: COMPLIANCE_PILLARS_18[11],
    norm: 'BGB § 130 Subsidiaritäts-Axiom / DSGVO Art. 89',
    description: 'ERP-Primat & Verbandsstatistik-Enthaftung: Amtliche bdfm/VdM-Statistiken verbleiben zu 100% im Primär-ERP der Schule',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'associationStatisticsSubsidiarity schließt amtliche Verbandsstatistik- und Fördernachweisfunktion haftungsbefreiend aus'
  },
  {
    id: 'RULE-155',
    pillar: 11,
    pillarName: COMPLIANCE_PILLARS_18[11],
    norm: 'DIN EN 16931-1 / UStG § 14 Abs. 2 n.F.',
    description: 'Asymmetrische B2G-E-Rechnung: Strukturierte ZUGFeRD 2.2 / XRechnung XML ausschließlich für kommunales B2B-Plattform-Hosting',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'privateTuitionContractAndInvoicing stellt E-Rechnung für B2G-Plattformkunden und PDF-Textform für Eltern klar'
  },

  // BEREICH L: GESUNDHEIT, ARBEITSSCHUTZ, ERGONOMIE & LÄRMSCHUTZ-ENTHAFTUNG (156 – 160)
  {
    id: 'RULE-156',
    pillar: 12,
    pillarName: COMPLIANCE_PILLARS_18[12],
    norm: 'BGB § 823 / ArbSchG Enthaftung',
    description: 'Ausschluss messtechnischer Schallschutz- und Lärmüberwachungspflichten: Lärmschutz und Raumpegel obliegen allein der Schule vor Ort',
    severity: 'CRITICAL',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'noiseAndAcousticLiabilityExclusion schließt physikalische Schallpegelmessung und Lärmüberwachung aus'
  },
  {
    id: 'RULE-157',
    pillar: 12,
    pillarName: COMPLIANCE_PILLARS_18[12],
    norm: 'Didaktisches Raum-Axiom',
    description: 'Raumstammdaten erfassen rein didaktische Orientierungsmerkmale; Ausschluss bauakustischer Zusicherungen nach DIN 18041',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'roomEquipmentAndErpSubsidiarity und noiseAndAcousticLiabilityExclusion schließen DIN 18041 Garantien aus'
  },
  {
    id: 'RULE-158',
    pillar: 12,
    pillarName: COMPLIANCE_PILLARS_18[12],
    norm: 'ArbSchG §§ 5, 6 / DSGVO',
    description: 'Integrierte Quiet Hours & Recht auf Feierabend: Ambient-Feierabend-Pill und Wochenend-Sperren in Dozenten-Chats',
    severity: 'HIGH',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/campus/chat/CampusDirectMessages.tsx',
    enforcementMechanism: 'CampusDirectMessages schützt Lehrkräfte vor digitalem Erreichbarkeitsdruck'
  },
  {
    id: 'RULE-159',
    pillar: 12,
    pillarName: COMPLIANCE_PILLARS_18[12],
    norm: 'DSGVO Art. 9',
    description: 'Diagnosefreie Absagen-Neutralität: Neutrale Krank- und Ausfallmeldungen ohne medizinische Diagnosedaten oder Attestgründe',
    severity: 'CRITICAL',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/services/auditLogService.ts',
    enforcementMechanism: 'Guard LEG-25 prüft neutrale teacher_ausfall Kennzeichnung ohne ICD-10 oder Krankheitsursachen'
  },
  {
    id: 'RULE-160',
    pillar: 12,
    pillarName: COMPLIANCE_PILLARS_18[12],
    norm: 'BFSG / Apple HIG Ergonomie',
    description: 'Physische Ergonomie & Stage Mode: Reale Trefferzonen >= 44x44px und reflexionsarmer High-Contrast Notenmodus',
    severity: 'HIGH',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/',
    enforcementMechanism: 'Touch-Trefferzonen >= 44x44px und High-Contrast Kontraste sichern Bühnen- und Unterrichtstauglichkeit'
  },

  // BEREICH M: DIGITALE BARRIEREFREIHEIT & INKLUSION (161 – 165)
  {
    id: 'RULE-161',
    pillar: 13,
    pillarName: COMPLIANCE_PILLARS_18[13],
    norm: 'BFSG ab 28.06.2025 / EAA RL (EU) 2019/882',
    description: 'Vollgeltung des BFSG für B2C-Eltern-Checkout (5,39 €) & Registrierung ohne Kleinstunternehmer-Scheinschutz',
    severity: 'CRITICAL',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'bfsgB2cScopeAndTransitionalLaw schließt Kleinstunternehmer-Ausnahmen zum Schutz vor UKlaG-Abmahnungen aus'
  },
  {
    id: 'RULE-162',
    pillar: 13,
    pillarName: COMPLIANCE_PILLARS_18[13],
    norm: 'BITV 2.0 / WCAG 2.2 AA',
    description: 'Tastatur-Vollbedienbarkeit, Focus Not Obscured, 2-Klick Drag-Alternative & Unantastbarkeit von Marken-KPI-Farben',
    severity: 'CRITICAL',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/',
    enforcementMechanism: 'Guard LEG-02 prüft role="dialog", Zero Content Occlusion Clearance & 2-Klick Zuweisung im Stundenplan'
  },
  {
    id: 'RULE-163',
    pillar: 13,
    pillarName: COMPLIANCE_PILLARS_18[13],
    norm: 'BFSG § 14 / § 16 BFSG / UWG § 3a / BITV 2.0 § 7',
    description: 'Erklärung zur Barrierefreiheit mit Status „teilweise vereinbar“, § 16 BFSG Ausnahmen & getrennten B2C/B2B Schlichtungsstellen',
    severity: 'CRITICAL',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/components/LegalTextModal.tsx',
    enforcementMechanism: 'Guard LEG-01 verbietet abmahnfähiges „vollständig barrierefrei“; deklariert BFSG-Marktüberwachung & § 16 BGG'
  },
  {
    id: 'RULE-164',
    pillar: 13,
    pillarName: COMPLIANCE_PILLARS_18[13],
    norm: 'UN-BRK Art. 24 / WCAG 4.1.3',
    description: 'Multi-Sensorische Didaktik: Screenreader-Slider & Einzähler für Sehbehinderte; optisches Metronom & Vibration für Gehörlose',
    severity: 'HIGH',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/groovelab/player/',
    enforcementMechanism: 'WAI-ARIA Slider-Semantik (role="slider", aria-valuetext), navigator.vibrate & aria-live Announcements'
  },
  {
    id: 'RULE-165',
    pillar: 13,
    pillarName: COMPLIANCE_PILLARS_18[13],
    norm: 'BITV § 4 / DSGVO Art. 12',
    description: 'Kognitive Barrierefreiheit & 2-Stufen-Architektur: Volljuristische SSOT vs. didaktische Leichte Sprache (Junior Privacy)',
    severity: 'HIGH',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/student/settings/ParentProtectionSettingsView.tsx',
    enforcementMechanism: 'campus_ui_level koppelt Stufe-1-Vertragstexte an Stufe-2-Leichte-Sprache im Junior- und Teen-Modus'
  },

  // BEREICH N: NIS-2, CYBER RESILIENCE ACT & IT-SICHERHEIT (166 – 170)
  {
    id: 'RULE-166',
    pillar: 14,
    pillarName: COMPLIANCE_PILLARS_18[14],
    norm: 'NIS-2 Art. 23 / DSGVO Art. 33 / AVV § 6',
    description: 'Gestuftes 24h/72h Vorfallsmeldewesen & schlüsselfertiger Art.-33-DSGVO-Muster-Meldebogen für Schulen',
    severity: 'CRITICAL',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'incidentReportingCascade sichert 24h-Vorwarnung, 72h-Behördenmeldebogen und 1-Monats-Abschlussdossier'
  },
  {
    id: 'RULE-167',
    pillar: 14,
    pillarName: COMPLIANCE_PILLARS_18[14],
    norm: 'CRA / VO (EU) 2024/2847',
    description: 'Cyber Resilience Act: Maschinenlesbare SBOM (CycloneDX/SPDX), VEX-Dokumentation & CVSS >= 7.0 Gate-Blocker',
    severity: 'CRITICAL',
    category: 'SECURITY_HEADER',
    invariantTarget: 'package.json',
    enforcementMechanism: 'npm audit --audit-level=high und security:deps blockieren CVSS >= 7.0 Schwachstellen in CI/CD'
  },
  {
    id: 'RULE-168',
    pillar: 14,
    pillarName: COMPLIANCE_PILLARS_18[14],
    norm: 'DIN EN ISO/IEC 27001 / BSI IT-Grundschutz',
    description: '100% Sovereign deutsches Hosting bei Hetzner (DE) & absolute US CLOUD Act Immunität',
    severity: 'CRITICAL',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'iso27001SovereignHosting schließt US-Hyperscaler und US-Third-Party-Services hermetisch aus'
  },
  {
    id: 'RULE-169',
    pillar: 14,
    pillarName: COMPLIANCE_PILLARS_18[14],
    norm: 'DSGVO Art. 32 / § 202a StGB / § 371a ZPO',
    description: 'PostgreSQL Kernel WORM-Immutabilität mit Merkle-Tree Hash-Chain (Beweiskraft nach § 371a ZPO)',
    severity: 'CRITICAL',
    category: 'DATABASE_KERNEL',
    invariantTarget: 'supabase/migrations/442_enterprise_legal_consents_state_machine_worm.sql',
    enforcementMechanism: 'trg_prevent_master_audit_tampering blockiert UPDATE & DELETE; Merkle-Chain sichert Integrität'
  },
  {
    id: 'RULE-170',
    pillar: 14,
    pillarName: COMPLIANCE_PILLARS_18[14],
    norm: 'ISO 22301 / BSI 200-4 / DSGVO Art. 17',
    description: '3-2-1-1-0 Disaster Recovery (RPO <= 60m / RTO <= 45m) & DSGVO Art. 17 Anti-Zombie-Tombstones',
    severity: 'CRITICAL',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'docs/RUNBOOK_DISASTER_RECOVERY_HETZNER.md',
    enforcementMechanism: 'disasterRecoveryAndTombstones sichert Georedundanz, Age X25519 und WORM-Tombstone Reconciliation'
  },

  // BEREICH O: KI, FINANZAUFSICHT (ZAG) & DACH-RECHT (171 – 180)
  {
    id: 'RULE-171',
    pillar: 15,
    pillarName: COMPLIANCE_PILLARS_18[15],
    norm: 'EU AI Act Anhang III',
    description: 'Deterministische DSP (Fast Fourier Transformation / FFT); keine neuronalen Netze',
    severity: 'CRITICAL',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'Guard LEG-23 prüft deterministicDspNonAiAct Klausel'
  },
  {
    id: 'RULE-172',
    pillar: 15,
    pillarName: COMPLIANCE_PILLARS_18[15],
    norm: 'EU AI Act Art. 5 / DSGVO Art. 9',
    description: 'Hermetisches Verbot von Stimm- und Sprecherbiometrie, Sprecheridentifikation oder Emotionsanalyse an Schülern',
    severity: 'CRITICAL',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'voiceBiometricsExclusionClause schließt Stimmabdrücke und biometrische Emotionserkennung aus'
  },
  {
    id: 'RULE-173',
    pillar: 15,
    pillarName: COMPLIANCE_PILLARS_18[15],
    norm: 'DSGVO Art. 22 / EU AI Act Art. 14',
    description: 'Human-in-the-Loop Dispositionskontrolle: Mensch behält zu 100% die Kontrolle über Unterrichtsplanung und Raumbuchung',
    severity: 'HIGH',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/ScheduleBoardDesktop.tsx',
    enforcementMechanism: 'twoStageScheduleAndRoomModel stellt Letztentscheidung von Lehrkraft und Sekretariat sicher'
  },
  {
    id: 'RULE-174',
    pillar: 16,
    pillarName: COMPLIANCE_PILLARS_18[16],
    norm: 'ZAG § 2 Abs. 1 Nr. 9 / PSD3 / § 63 ZAG',
    description: 'Zahlungen zwischen Musikschule und den Eltern laufen NIEMALS über Campus-Groovelab (Hermetischer ZAG-Ausschluss)',
    severity: 'CRITICAL',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'zeroMoneyTransitTuitionExclusion schließt Treuhandkonten, Sammelinkasso und Geldweiterleitungen hermetisch aus'
  },
  {
    id: 'RULE-175',
    pillar: 17,
    pillarName: COMPLIANCE_PILLARS_18[17],
    norm: 'revDSG (Schweiz)',
    description: 'Schweizer Datenschutz: Datentransfer gestützt auf Angemessenheitsbeschluss (Art. 16 revDSG) & Absenzen-Neutralität',
    severity: 'CRITICAL',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'Guard LEG-25 prüft revDsgCompliance Klausel'
  },
  {
    id: 'RULE-176',
    pillar: 17,
    pillarName: COMPLIANCE_PILLARS_18[17],
    norm: 'MWSTG Art. 21 / Art. 30 MWSTV (Schweiz)',
    description: 'Schweizer Bildungsbefreiung & kaufmännische 5-Rappen-Rundung auf CHF 0.05 (roundToFiveRappen)',
    severity: 'HIGH',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/utils/formatters.ts',
    enforcementMechanism: 'Guard LEG-26 prüft roundToFiveRappen & Bildungsbefreiung'
  },
  {
    id: 'RULE-177',
    pillar: 18,
    pillarName: COMPLIANCE_PILLARS_18[18],
    norm: 'DSG § 1 / § 42f UrhG (Österreich)',
    description: 'Österreichischer Verfassungs-Datenschutz, Harmonisierung mit 4 Bildungsstufen & Notenkopierverbot',
    severity: 'CRITICAL',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'austrianDsgAndSchoolLawCompliance garantiert Konformität mit Landesmusikschulgesetzen und § 42f UrhG-AT'
  },
  {
    id: 'RULE-178',
    pillar: 18,
    pillarName: COMPLIANCE_PILLARS_18[18],
    norm: 'RKSV / § 132 BAO (Österreich)',
    description: 'Österreichische RKSV-Bargeldlosigkeit & 7 Jahre gesetzliche Aufbewahrungsfrist gemäss § 132 BAO',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'austrianRksvCashlessExemption sichert Freistellung von Registrierkassensignatur und 7-Jahre-Archivierung'
  },
  {
    id: 'RULE-179',
    pillar: 15,
    pillarName: COMPLIANCE_PILLARS_18[15],
    norm: 'DSA / VO (EU) 2022/2065',
    description: 'Digital Services Act: Notice & Action Meldebutton in Chats und Non-Monetary-Gamification-Schutzschild',
    severity: 'HIGH',
    category: 'AST_POSITIVE_PATTERN',
    invariantTarget: 'apps/groovelab/src/components/campus/chat/CampusDirectMessages.tsx',
    enforcementMechanism: 'chatRespectGuard und digitalServicesActNoticeAndAction sichern Meldeverfahren und Ausschluss von Dark Patterns'
  },
  {
    id: 'RULE-180',
    pillar: 16,
    pillarName: COMPLIANCE_PILLARS_18[16],
    norm: 'GewO § 2 / EStG § 18 / bdfm',
    description: 'Gewerberechtliche Entflechtung: Strikte Trennung von IT-SaaS-Gewerbebetrieb und freiberuflicher Lehrtätigkeit',
    severity: 'HIGH',
    category: 'CONTRACTUAL_EVIDENCE',
    invariantTarget: 'apps/groovelab/src/constants/legalMasterWording.ts',
    enforcementMechanism: 'saasBusinessSeparationFromTeaching stellt Trennung von Software-Miete und freiem Unterricht sicher'
  }
];

export const TOTAL_COMPLIANCE_RULES_COUNT = COMPLIANCE_RULES_180.length;
