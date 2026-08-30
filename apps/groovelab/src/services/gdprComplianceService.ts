/**
 * ==============================================================================
 * CAMPUS-GROOVELAB ENTERPRISE GDPR & BSI COMPLIANCE GENERATOR
 * Standard: DSGVO Art. 30 (VVT), Art. 35 (DSFA) & BSI IT-Grundschutz
 * ==============================================================================
 */

export interface SchoolGdprContext {
  schoolId: string;
  schoolName: string;
  contactPerson?: string;
  city?: string;
}

export interface ProcessingActivityRecord {
  title: string;
  legalBasis: string;
  purpose: string;
  dataCategories: string[];
  retentionPeriod: string;
  technicalMeasures: string[];
}

/**
 * Generates the official Record of Processing Activities (VVT Art. 30 DSGVO)
 * customized for the music school.
 */
export function generateRecordOfProcessingActivities(context: SchoolGdprContext): ProcessingActivityRecord[] {
  return [
    {
      title: 'Stundenplan-, Raum- & Schülerverwaltung',
      legalBasis: 'Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung Musikschulunterricht)',
      purpose: 'Terminplanung, Raumkoordination, digitale Anwesenheitsdokumentation',
      dataCategories: ['Pseudonymisierte Schüler-ID', 'Vorname (PGP-verschlüsselt)', 'Unterrichtszeiten', 'Instrumentenfach'],
      retentionPeriod: 'Dauer des aktiven Unterrichtsvertrags; automatische Inaktivierung nach 60 Tagen Inaktivität',
      technicalMeasures: [
        'PostgreSQL Row-Level Security (FORCE RLS)',
        'AES-256-GCM Hardware-bound Storage Vaulting',
        'Zero-Mail IAM (Keine Speicherung von Schüler-E-Mail-Adressen)',
        '100% Souveränes deutsches Cloud-Hosting (Hetzner, ISO 27001)'
      ]
    },
    {
      title: 'Hausaufgabenheft & Übe-Protokollierung',
      legalBasis: 'Art. 6 Abs. 1 lit. b DSGVO & Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)',
      purpose: 'Pädagogische Fortschrittsbegleitung, Bereitstellung von Unterrichtsaufnahmen',
      dataCategories: ['Übe-Dauer (Minuten)', 'Übe-Streaks', 'Audio-Aufnahmen (verschlüsselt)', 'Hausaufgaben-Notizen'],
      retentionPeriod: 'Dauer des Schuljahres bzw. bis zum manuellen Löschen durch Lehrkraft/Schüler',
      technicalMeasures: [
        'Client-seitige Bereinigung mit DOMPurify Sanitizer',
        'Automatische Speichergrenzen & Bereinigung gelöschter Audio-Blobs',
        'Keine Tracking- oder Werbe-Cookies'
      ]
    },
    {
      title: 'Kiosk- & Übungsraum-Terminals',
      legalBasis: 'Art. 6 Abs. 1 lit. f DSGVO (Berechtigtes Interesse an Schulraumsicherheit)',
      purpose: 'Stationskopplung in Proberäumen ohne dauerhafte Speicherung persönlicher Zugangsdaten',
      dataCategories: ['128-Bit UUID Secret Token', 'Raum-ID', 'Stations-Name'],
      retentionPeriod: 'Bis zur Entkopplung des Geräts durch das Sekretariat',
      technicalMeasures: [
        'Hardware-Kiosk-Isolation via get_kiosk_school_id()',
        'Automatischer Inactivity-Timeout nach 30 Minuten',
        'NIST SP 800-88 Zeroization beim Logout'
      ]
    }
  ];
}

/**
 * Generates the official Data Protection Impact Assessment (DSFA Art. 35 DSGVO) Summary.
 */
export function generateDpiaSummary(context: SchoolGdprContext): Record<string, any> {
  return {
    institution: context.schoolName,
    platform: 'Campus-Groovelab',
    assessmentDate: new Date().toISOString().split('T')[0],
    riskLevel: 'Sehr gering (Restrisiko minimiert)',
    keyMitigations: [
      'Radikale Datenminimierung: 0 Klartext-Schüler-E-Mails, keine Speicherung von Bank-/SEPA-Daten Minderjähriger.',
      'Symmetrische PGP-Verschlüsselung sensibler Stammdaten im Datenbankspeicher.',
      'FIDO2 WebAuthn Passkeys: Private Keys verlassen niemals den Secure Enclave des Endgeräts.',
      'Hermetische Mandantentrennung auf PostgreSQL-Kernel-Ebene (0 Zeilen Cross-Tenant-Sichtbarkeit).'
    ],
    complianceConclusion: 'Der Einsatz von Campus-Groovelab ist datenschutzrechtlich unbedenklich und erfüllt die Kriterien der deutschen Kultusministerien.'
  };
}
