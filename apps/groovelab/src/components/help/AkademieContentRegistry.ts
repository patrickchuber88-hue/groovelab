/**
 * 🏛️ CAMPUS-GROOVELAB AKADEMIE & LEITFÄDEN REGISTRY
 * Monolith Goldstandard - 4-Stufen Governance Matrix
 * 
 * 1. Master-Admin Dashboard (Plattform-Betreiber)
 * 2. Musikschulleiter & Sekretariat (Verwaltung vor Ort)
 * 3. Lehrkräfte (Pädagogischer Unterrichts- & Schulalltag)
 * 4. Schüler & Eltern (Campus-Pass, Hausaufgaben & Üben)
 * 
 * Jede Rolle besitzt ein strikt isoliertes, maßgeschneidertes Wissensverzeichnis.
 * Die Menüpunkte entsprechen exakt den realen Boards und Tabs der jeweiligen Rolle.
 */

export type AkademieTier = 'master_admin' | 'school_management' | 'teacher' | 'student';

export interface AkademieStep {
  title: string;
  desc: string;
  actionLabel?: string;
  actionTarget?: string;
}

export interface AkademieBoardGuide {
  id: string;
  tier: AkademieTier;
  boardId: string;
  title: string;
  subtitle: string;
  badge: string;
  category: 'quickstart' | 'core_boards' | 'audio_studio' | 'finops_compliance' | 'faq';
  summary: string;
  steps: AkademieStep[];
  proTips: string[];
  shortcuts?: { key: string; desc: string }[];
  invariants: string[];
  tags: string[];
  pdfDownloadType?: 'parent_quickstart' | 'teacher_quickstart' | 'consent' | 'resilience_audit';
}

export const TIER_CONFIG: Record<AkademieTier, {
  label: string;
  shortName: string;
  color: string;
  bgColor: string;
  badgeColor: string;
  avatarNotice: string;
  description: string;
}> = {
  master_admin: {
    label: '1. Master-Admin Dashboard',
    shortName: 'Plattform-Betreiber',
    color: '#0f172a',
    bgColor: '#f1f5f9',
    badgeColor: '#334155',
    avatarNotice: 'Betreiber-Governance • Hetzner Cluster & Multi-Tenancy',
    description: 'Zentrale Steuerung aller Musikschulen, Server-Infrastruktur, P95-Telemetrie und globale FinOps-Abrechnung.'
  },
  school_management: {
    label: '2. Schulleitung & Sekretariat',
    shortName: 'Musikschul-Verwaltung',
    color: '#ea4335',
    bgColor: '#fef2f2',
    badgeColor: '#dc2626',
    avatarNotice: 'Tafelbild Briefing Board (/campus_login_hero.png) • Keine Musiker-Avatare',
    description: 'Schule, Raum-Engine, Kiosk-Displays, Kollegium, Schüler-Aufnahme, Stundenplaner & B2B-Hosting-Rechnungen.'
  },
  teacher: {
    label: '3. Lehrkräfte',
    shortName: 'Unterricht & Pädagogik',
    color: '#34a853',
    bgColor: '#f0fdf4',
    badgeColor: '#16a34a',
    avatarNotice: 'Campus-Grün & Musiker-Avatare • Zero-Mail Login',
    description: 'Tages-Briefing, Schüler-Protokoll, Play-Along Studio, Audio-Tresor, Meisterwerk-Doku & Band-Repertoire.'
  },
  student: {
    label: '4. Schüler & Eltern',
    shortName: 'Campus-Pass & Üben',
    color: '#34a853',
    bgColor: '#f0fdf4',
    badgeColor: '#16a34a',
    avatarNotice: 'Campus-Pass • Zero-Registration & 100% Datenminimierung',
    description: 'Digitales Hausaufgabenheft, Fokus-Timer, Loopstation, GrooveLab Band-Room, Song-Bibliotheken & Meisterwerk-Tresor.'
  }
};

export const AKADEMIE_GUIDES_DATABASE: AkademieBoardGuide[] = [
  // ══════════════════════════════════════════════════════════════════════════════════
  // STUFE 1: MASTER-ADMIN (PLATTFORM-BETREIBER)
  // ══════════════════════════════════════════════════════════════════════════════════
  {
    id: 'master-exec-cockpit',
    tier: 'master_admin',
    boardId: 'executive',
    title: 'Executive Cockpit & Live-FinOps Metriken',
    subtitle: 'Gesamtheitliche Steuerung von MRR, ARR, Schulkontingenten und Kapazitäts-Tiers',
    badge: 'Executive',
    category: 'quickstart',
    summary: 'Echtzeit-Überwachung des Gesamtsystems: Live-Plattform-MRR (68,92 € / Mo.), Live-ARR (827,04 € / Jahr), Schüler-Aktivierungen und Server-Auslastung.',
    steps: [
      {
        title: '1. Multi-Tenant MRR & ARR Invarianten prüfen',
        desc: 'Das Executive Board berechnet den MRR mathematisch deterministisch. Jede Schule wird nach aktiven Lehrern, Schülern und Speicher-Addons aggregiert.',
        actionLabel: 'Zu den Executive Metriken',
        actionTarget: 'executive'
      },
      {
        title: '2. Kapazitäts-Tiers & Hetzner-Serverlast überwachen',
        desc: 'Automatische Klassifizierung in Tier 1 (bis 3 Schulen) bis Tier 5 (bis 500 Schulen). Prüfe CPU-Auslastung und P95-Latenz.',
        actionLabel: 'Hardware-Fit einsehen',
        actionTarget: 'executive'
      },
      {
        title: '3. Master-Passkey & TOTP-Zwei-Faktor-Schutz',
        desc: 'Der Master-Admin Zugang ist kryptografisch durch WebAuthn (Touch ID / YubiKey) und zeitbasierte OTP-Tokens gesichert.',
        actionLabel: 'Sicherheits-Status prüfen',
        actionTarget: 'trust_safety'
      }
    ],
    proTips: [
      'Nutze die Tastenkombination [Cmd + Shift + M], um jederzeit direkt in das Master-Executive-Cockpit zurückzuspringen.',
      'Die ARR-Berechnung erfolgt 100% synchron zum 12-fachen des monatlichen deterministischen Live-MRR.'
    ],
    shortcuts: [
      { key: 'Cmd + Shift + M', desc: 'Master Executive Cockpit öffnen' },
      { key: 'Cmd + K', desc: 'Spotlight Schnellsuche' }
    ],
    invariants: [
      'Zero-Trust: Direkte Client-Updates an `is_master_admin` oder `school_id` sind serverseitig neutralisiert.',
      'Revisionssicheres Audit-Logging: Jeder Master-Admin Login wird in `master_audit_trail` protokolliert.'
    ],
    tags: ['master', 'executive', 'mrr', 'arr', 'finops', 'hetzner', 'passkey', 'totp']
  },
  {
    id: 'master-school-management',
    tier: 'master_admin',
    boardId: 'schools',
    title: 'Mandanten-Verwaltung & Schul-Provisionierung',
    subtitle: 'Schlüsselfertiges Anlegen neuer Musikschulen, Subdomains und Schulträger-Zuweisung',
    badge: 'Mandanten',
    category: 'core_boards',
    summary: 'Verwalte Musikschulen in DE, AT und CH. Provisioniere neue Mandanten mit Subdomains (<schule>.campus-groovelab.de) und Modul-Bundles.',
    steps: [
      {
        title: '1. Neue Musikschule anlegen',
        desc: 'Klicke auf "Neue Musikschule anlegen". Gib den offiziellen Schulnamen, die Stadt, Postleitzahl und das Primär-Modul (Kombi-Bundle, Campus oder GrooveLab) ein.',
        actionLabel: 'Schulen-Board aufrufen',
        actionTarget: 'schools'
      },
      {
        title: '2. Subdomain & DNS-Kopplung',
        desc: 'Das System erzeugt automatisch die saubere Subdomain. Der Schulleitungs-Initial-Token wird für die Übergabe generiert.',
        actionLabel: 'Subdomain prüfen',
        actionTarget: 'schools'
      },
      {
        title: '3. Mandanten-Isolation prüfen',
        desc: 'Jede Schule erhält eine isolierte `school_id`. Cross-Tenant Datenlecks sind durch PostgreSQL Row Level Security (RLS) mathematisch ausgeschlossen.',
        actionLabel: 'Mandanten-Status prüfen',
        actionTarget: 'schools'
      }
    ],
    proTips: [
      'Schulen mit Kombi-Vorteil erhalten automatisch den monatlichen Nachlass von 4,90 € auf das Hosting-Bundle.',
      'Der Initial-Admin-Link kann direkt als druckfertiges Übergabeprotokoll exportiert werden.'
    ],
    invariants: [
      'Multi-Tenancy Doktrin: Jede Abfrage erzwingt `school_id = get_current_user_school_id()`.',
      'Software-Lizenzgebühr ist immer 0,00 € (Inklusive).'
    ],
    tags: ['schulen', 'mandanten', 'provisionierung', 'subdomain', 'rls', 'isolation']
  },
  {
    id: 'master-payment-reconciliation',
    tier: 'master_admin',
    boardId: 'briefing',
    title: 'Zahlungsabgleich & Schüler-Aktivierungsfreigaben',
    subtitle: 'Automatischer Bank-Sync, B2C-Direktzahler-Abgleich und Freischaltung',
    badge: 'Zahlungsabgleich',
    category: 'finops_compliance',
    summary: 'Überwache Banküberweisungen von Eltern für Schüleraktivierungen. 1-Klick-Freischaltung für Schüler-Profile nach Zahlungseingang.',
    steps: [
      {
        title: '1. Eingegangene Banküberweisungen prüfen',
        desc: 'Vergleiche den Bank-Kontoauszug mit den offenen Aktivierungsanfragen. Der Verwendungszweck enthält den kanonischen Hash (CG-[STUDENT_HASH_8]-[YYMM]).',
        actionLabel: 'Zahlungsabgleich öffnen',
        actionTarget: 'briefing'
      },
      {
        title: '2. Schülerprofil freischalten',
        desc: 'Klicke auf den grünen Haken "Zahlung bestätigen". Das Schüler-Profil wird in Millisekunden für das gesamte Schuljahr aktiviert.',
        actionLabel: 'Offene Zahlungen anzeigen',
        actionTarget: 'briefing'
      },
      {
        title: '3. Rechnungsbeleg automatisch archivieren',
        desc: 'Das System generiert die GoBD-konforme B2C-Jahresrechnung und legt sie im Revisions-Tresor der Musikschule ab.',
        actionLabel: 'Archiv einsehen',
        actionTarget: 'billing'
      }
    ],
    proTips: [
      'Nutze die Filterfunktion, um Zahlungen nach Schule oder Betrag (5,88 € bzw. CHF 12.00) zu sortieren.',
      'Sammelüberweisungen für Geschwisterkinder werden anhand des Elternnamens intelligent zusammengeführt.'
    ],
    invariants: [
      'Rechnungsnummer-Standard: B2C-Aktivierungen folgen ausnahmslos dem Format `CG-[STUDENT_HASH_8]-[YYMM]`.',
      'Keine Speicherung von Bank- oder Kontodaten der Eltern (DSGVO-Datenminimierung).'
    ],
    tags: ['zahlung', 'abgleich', 'aktivierung', 'überweisung', 'gobd', 'b2c']
  },
  {
    id: 'master-financial-control',
    tier: 'master_admin',
    boardId: 'billing',
    title: 'Financial Control, B2B-Rechnungen & Delinquency Engine',
    subtitle: 'Monatliche Musikschul-Sammelrechnungen, Mahnwesen und 5-Stufen Eskalation',
    badge: 'Financial Control',
    category: 'finops_compliance',
    summary: 'Zentrale Rechnungsstellung an Musikschulen: Automatische Generierung der monatlichen B2B-Infrastruktur-Rechnungen und 5-Stufen Delinquency Engine.',
    steps: [
      {
        title: '1. Monatsrechnungen zum 1. des Monats erzeugen',
        desc: 'Klicke auf "Monatslauf starten". Das System berechnet für jede Musikschule die exakte Aufstellung aller aktiven Lehrer, Schüler und Module.',
        actionLabel: 'Rechnungslauf starten',
        actionTarget: 'billing'
      },
      {
        title: '2. B2B Delinquency Engine überwachen',
        desc: 'Bei Zahlungsverzug greift die 5-Stufen-Eskalation: Stufe 0 (Nominal) ➔ Stufe 1 (Freundliche Erinnerung nach 28 Tagen) bis Stufe 4 (Soft-Lock mit Notfall-PIN).',
        actionLabel: 'Mahnstufen einsehen',
        actionTarget: 'billing'
      },
      {
        title: '3. Rechnungs-PDFs herunterladen & versenden',
        desc: 'Drucke oder exportiere die Sammelrechnungen mit kanonischer Nomenklatur für die Kämmereien und Schulträger.',
        actionLabel: 'PDFs herunterladen',
        actionTarget: 'billing'
      }
    ],
    proTips: [
      'Härtefall-Schulen können im System mit einer verlängerten Zahlungsfrist (Grace Period) hinterlegt werden.',
      'GrooveLab-Aktivierungen werden verbindlich der Schule als Sammelzahler berechnet.'
    ],
    invariants: [
      'Kanonische Reihenfolge: Software-Bereitstellung (0,00 €) steht immer an Position 1 jeder Rechnung.',
      'Rechnungsnummer: B2B Musikschulrechnungen lauten immer `RE-[SCHOOL_ID]-[YYMM]-01`.'
    ],
    tags: ['b2b', 'rechnungen', 'delinquency', 'mahnwesen', 'finops', 'softlock']
  },
  {
    id: 'master-telemetry-health',
    tier: 'master_admin',
    boardId: 'telemetry',
    title: 'Server-Telemetrie, P95-Latenzen & System-Health',
    subtitle: 'Hetzner NVMe I/O, PostgreSQL Ping, Connection-Pools und Error-Telemetry',
    badge: 'Telemetrie',
    category: 'core_boards',
    summary: 'Echtzeit-Diagnose der Hetzner Cloud-Instanzen: Überwache CPU-Load, RAM-Verbrauch, Supabase Connection-Pools und P95-Endpunkt-Latenzen.',
    steps: [
      {
        title: '1. P95-Endpunkt-Latenz überwachen',
        desc: 'Prüfe, ob die Antwortzeiten aller Kern-RPCs unter der Schwelle von 50 ms liegen. Grüne Ampeln signalisieren nominalen Betrieb.',
        actionLabel: 'Latenz-Graph öffnen',
        actionTarget: 'telemetry'
      },
      {
        title: '2. PostgreSQL Connection Pooling prüfen',
        desc: 'Stelle sicher, dass Supavisor die Verbindungen im Transaction Mode effizient bündelt und keine Verbindungslimits erreicht werden.',
        actionLabel: 'Pool-Status prüfen',
        actionTarget: 'telemetry'
      },
      {
        title: '3. Client-Fehlerprotokolle analysieren',
        desc: 'Erfasse ungefilterte Client-Fehler telemetrisch zur sofortigen Beseitigung von Frontend-Exceptions.',
        actionLabel: 'Error-Log einsehen',
        actionTarget: 'telemetry'
      }
    ],
    proTips: [
      'Ein kontinuierlicher Ping von unter 30 ms garantiert ein butterweiches Benutzererlebnis auch auf mobilen Datenverbindungen.',
      'Nutze den Resilienz-Audit PDF-Export als formalen Nachweis für Schulträger und Datenschutzbeauftragte.'
    ],
    invariants: [
      'Hochverfügbarkeits-SLA: Ausfallzeiten dürfen im Monatsmittel 0,05% nicht überschreiten.'
    ],
    tags: ['telemetrie', 'hetzner', 'latenz', 'p95', 'health', 'postgresql', 'sla'],
    pdfDownloadType: 'resilience_audit'
  },
  {
    id: 'master-pricing-campaigns',
    tier: 'master_admin',
    boardId: 'pricing',
    title: 'Tarife, Kampagnen & Bereitstellungspreise',
    subtitle: 'Verwaltung der globalen Hosting-Pakete, Team-Gebühren und Rabattaktionen',
    badge: 'Preise',
    category: 'finops_compliance',
    summary: 'Pflege die globalen Preistabellen für Campus (14,90 €), GrooveLab (9,90 €), Kombi-Vorteil (19,90 €) und Team-Pauschalen (0,49 €).',
    steps: [
      {
        title: '1. Globale Bereitstellungspreise einsehen',
        desc: 'Überprüfe die festen monatlichen Hosting-Preise und aktiven Schulkontingente.',
        actionLabel: 'Preise aufrufen',
        actionTarget: 'pricing'
      },
      {
        title: '2. Kampagnen & Schulanfangs-Aktionen einrichten',
        desc: 'Konfiguriere Rabatte für Schuljahres-Komplettaktivierungen (z. B. 20% Nachlass bei September-Aktivierung aller Schüler).',
        actionLabel: 'Kampagnen verwalten',
        actionTarget: 'pricing'
      },
      {
        title: '3. Währungsumrechnung (EUR / CHF) verifizieren',
        desc: 'Stelle sicher, dass Schweizer Schulen die festgelegten CHF-Sätze (CHF 12.00 / Jahr bzw. CHF 19.90 / Mo.) erhalten.',
        actionLabel: 'Währungen prüfen',
        actionTarget: 'pricing'
      }
    ],
    proTips: [
      'Die Software ist stets mit 0,00 € (Inklusive) auszuweisen. Wir vermieten ausschließlich Cloud-Infrastruktur.',
      'Änderungen an Preisen wirken sich nur auf zukünftige Abrechnungszeiträume aus.'
    ],
    invariants: [
      'UWG / PAngV Konformität: Das Wort "Lizenz" ist plattformweit strengstens untersagt.'
    ],
    tags: ['preise', 'tarife', 'kampagnen', 'rabatt', 'chf', 'eur', 'infrastruktur']
  },
  {
    id: 'master-trust-safety',
    tier: 'master_admin',
    boardId: 'trust_safety',
    title: 'Trust & Safety, DSGVO-Takedowns & Compliance',
    subtitle: 'Bearbeitung von Löschanfragen nach Art. 17 DSGVO, Takedown-Requests und Prüfprotokolle',
    badge: 'Trust & Safety',
    category: 'finops_compliance',
    summary: 'Zentrales Compliance-Center: Führe vollständige Mandanten-Löschungen nach Vertragsende durch und beantworte Auskunftsersuchen nach DSGVO.',
    steps: [
      {
        title: '1. Art. 17 DSGVO Löschanfrage prüfen',
        desc: 'Prüfe eingegangene Löschanfragen von Schulen oder Nutzern. Das System identifiziert alle verknüpften Datensätze.',
        actionLabel: 'Anfragen prüfen',
        actionTarget: 'trust_safety'
      },
      {
        title: '2. Revisionssichere Löschung ausführen',
        desc: 'Führe die Löschung über den autoritativen RPC durch. Verknüpfte Audio-Tresor-Dateien im Object Storage werden rückstandslos bereinigt.',
        actionLabel: 'Lösch-Protokoll öffnen',
        actionTarget: 'trust_safety'
      },
      {
        title: '3. Löschzertifikat für Datenschutzbeauftragte exportieren',
        desc: 'Generiere das rechtssichere Löschprotokoll mit kryptografischem Zeitstempel für die Schulakten.',
        actionLabel: 'Zertifikat generieren',
        actionTarget: 'trust_safety'
      }
    ],
    proTips: [
      'Löschungen können innerhalb einer 72-Stunden-Sperrfrist bei versehentlicher Auslösung gestoppt werden.',
      'Audit-Trail-Einträge bleiben zur Erfüllung gesetzlicher Aufbewahrungspflichten pseudonymisiert erhalten.'
    ],
    invariants: [
      'DSGVO Art. 17: Vollständige physische Bereinigung aller personenbezogenen Daten aus Tabellen und Buckets.'
    ],
    tags: ['dsgvo', 'löschung', 'compliance', 'takedown', 'art17', 'zertifikat']
  },
  {
    id: 'master-feedback-hub',
    tier: 'master_admin',
    boardId: 'feedback',
    title: 'Community-Ideen, Feedback & Feature-Voting',
    subtitle: 'Wünsche von Musikschulleitern und Lehrkräften sichten, priorisieren und freigeben',
    badge: 'Feedback',
    category: 'core_boards',
    summary: 'Sammelstelle für alle Feature-Wünsche und Verbesserungsvorschläge aus dem Schulbetrieb. Priorisiere Entwicklungs-Roadmaps direkt mit den Nutzern.',
    steps: [
      {
        title: '1. Neue Feedback-Einträge sichten',
        desc: 'Lies die Anregungen der Musikschulen zu neuen Instrumenten, Unterrichtsfunktionen oder Auswertungen.',
        actionLabel: 'Feedback-Board öffnen',
        actionTarget: 'feedback'
      },
      {
        title: '2. Status aktualisieren (Geplant / In Entwicklung / Live)',
        desc: 'Setze den Status der Tickets. Schulen werden im FeedbackHub automatisch über Fortschritte informiert.',
        actionLabel: 'Roadmap verwalten',
        actionTarget: 'feedback'
      },
      {
        title: '3. Duplikate zusammenführen & Voting-Punkte aggregieren',
        desc: 'Führe ähnliche Ideen zusammen, um die am stärksten nachgefragten Features sofort zu erkennen.',
        actionLabel: 'Ideen priorisieren',
        actionTarget: 'feedback'
      }
    ],
    proTips: [
      'Antworte direkt auf konstruktives Feedback – Musikschulleiter schätzen den direkten Draht zu den Entwicklern.',
      'Erfolgreich umgesetzte Wünsche werden mit einem "Live"-Badge im Schulportal markiert.'
    ],
    invariants: [
      'Transparenz-Doktrin: Schulen sehen den Status ihrer eingereichten Vorschläge jederzeit im eigenen Dashboard.'
    ],
    tags: ['feedback', 'ideen', 'community', 'voting', 'roadmap', 'wünsche']
  },
  {
    id: 'master-maintenance-ops',
    tier: 'master_admin',
    boardId: 'maintenance',
    title: 'Wartung, Betrieb & Globaler Wartungsmodus',
    subtitle: 'Schaltungsfreie System-Updates, Cache-Invalidierung und geplante Wartungsfenster',
    badge: 'Wartung',
    category: 'core_boards',
    summary: 'Zentrale Betriebskontrolle: Aktiviere bei größeren Datenbankmigrationen den weltweiten Wartungsmodus mit Countdown-Banner für alle Schulen.',
    steps: [
      {
        title: '1. Wartungsfenster ankündigen',
        desc: 'Lege Startzeit und voraussichtliche Dauer fest. Das System blendet in allen Benutzer-Dashboards ein dezentes Informationsbanner ein.',
        actionLabel: 'Wartungsplaner öffnen',
        actionTarget: 'maintenance'
      },
      {
        title: '2. Globalen Wartungsmodus scharf schalten',
        desc: 'Schalte das System in den Read-Only-Modus. Bestehende Sitzungen bleiben geschützt, Schreiboperationen werden pausiert.',
        actionLabel: 'Wartung aktivieren',
        actionTarget: 'maintenance'
      },
      {
        title: '3. Service Worker Cache-Buster auslösen',
        desc: 'Nach dem Update invalidiert ein Klick auf "Cache leeren" die veralteten Frontend-Assets aller Browser weltweit.',
        actionLabel: 'Cache invalidieren',
        actionTarget: 'maintenance'
      }
    ],
    proTips: [
      'Wartungsarbeiten sollten idealerweise nachts zwischen 02:00 und 05:00 Uhr durchgeführt werden.',
      'Der Notfall-Bypass ermöglicht es Master-Admins, die Plattform auch im Wartungsmodus vollumfänglich zu prüfen.'
    ],
    invariants: [
      'Zero Data Loss: Im Wartungsmodus werden keine ungespeicherten Entwürfe überschrieben.'
    ],
    tags: ['wartung', 'maintenance', 'cache', 'update', 'read only', 'migration']
  },
  {
    id: 'master-backup-disaster-recovery',
    tier: 'master_admin',
    boardId: 'backup',
    title: 'Backup, Disaster Recovery & Notfall-Wiederherstellung',
    subtitle: 'Point-in-Time Recovery, tägliche Hetzner Snapshots und Storage-Backups',
    badge: 'Backup',
    category: 'core_boards',
    summary: 'Katastrophenschutz nach BSI-Grundschutz: Überprüfe die automatischen PostgreSQL WAL-Archive, tägliche Datenbank-Snapshots und Audio-Tresor-Backups.',
    steps: [
      {
        title: '1. Backup-Integrität & Snapshots prüfen',
        desc: 'Kontrolliere das Protokoll der nächtlichen Sicherungsläufe. Alle Tabellen und Schemata werden verschlüsselt gesichert.',
        actionLabel: 'Backups einsehen',
        actionTarget: 'backup'
      },
      {
        title: '2. Point-in-Time Recovery (PITR) testen',
        desc: 'Im Notfall kann der Stand der Datenbank sekundengenau auf einen beliebigen Zeitpunkt der letzten 14 Tage zurückgesetzt werden.',
        actionLabel: 'Recovery-Optionen prüfen',
        actionTarget: 'backup'
      },
      {
        title: '3. Georedundante Storage-Replikation verifizieren',
        desc: 'Die Audio-Dateien des Tresors werden über redundante Hetzner Storage Boxen an getrennten Standorten repliziert.',
        actionLabel: 'Replikation prüfen',
        actionTarget: 'backup'
      }
    ],
    proTips: [
      'Führe vierteljährlich einen unangekündigten Desaster-Recovery-Trockenlauf in einer Testumgebung durch.',
      'Sämtliche Backups sind mit AES-256 at Rest verschlüsselt.'
    ],
    invariants: [
      'RPO < 5 Minuten: Der maximale potenzielle Datenverlust bei Gesamtausfall liegt unter 5 Minuten.',
      'RTO < 60 Minuten: Wiederherstellung der vollen Betriebsbereitschaft in unter einer Stunde.'
    ],
    tags: ['backup', 'disaster recovery', 'pitr', 'hetzner', 'snapshots', 'rpo', 'rto']
  },
  {
    id: 'master-operator-access',
    tier: 'master_admin',
    boardId: 'operator',
    title: 'Betreiber-Sicherheit, WebAuthn-Passkeys & Revisions-Audit-Trail',
    subtitle: 'Hardware-Token Authentifizierung, Ghost-Support-Sitzungen und unveränderbares Audit-Log',
    badge: 'Betreiber',
    category: 'core_boards',
    summary: 'Höchste Sicherheitsstufe nach OWASP ASVS Level 3: Verwalte Master-Passkeys (FIDO2 / Touch ID), initiiere zeitlich befristete Ghost-Support-Sessions und prüfe das unveränderliche Audit-Log.',
    steps: [
      {
        title: '1. FIDO2 / WebAuthn Passkeys registrieren',
        desc: 'Kopple deinen physischen Hardware-Schlüssel (YubiKey oder Apple Touch ID). Der Login ist gegen Phishing immun.',
        actionLabel: 'Passkeys verwalten',
        actionTarget: 'operator'
      },
      {
        title: '2. Zeitlich befristete Ghost-Support-Sitzung starten',
        desc: 'Benötigt eine Musikschule Hilfe, kann eine befristete Support-Sitzung (max. 60 Minuten) gestartet werden. Jede Aktion wird protokolliert.',
        actionLabel: 'Support-Session starten',
        actionTarget: 'operator'
      },
      {
        title: '3. Revisionssicheren Audit-Trail analysieren',
        desc: 'Alle administrativen Aktionen werden mit Zeitstempel, IP-Hash und aufrufendem Operator manipulationssicher im Log festgehalten.',
        actionLabel: 'Audit-Trail aufrufen',
        actionTarget: 'operator'
      }
    ],
    proTips: [
      'Hinterlege stets mindestens zwei voneinander unabhängige Hardware-Passkeys als Notfall-Redundanz.',
      'Ghost-Support-Sitzungen erlöschen nach Ablauf der Frist automatisch ohne verbleibende Berechtigungen.'
    ],
    invariants: [
      'Zero Secret Leakage: Master-Admin Passwörter und TOTP-Secrets verlassen niemals die serverseitige Enklave.',
      'Audit-Unveränderbarkeit: Einträge in `master_audit_trail` können selbst von Master-Admins weder geändert noch gelöscht werden.'
    ],
    tags: ['operator', 'passkey', 'webauthn', 'ghost support', 'audit trail', 'fido2', 'security']
  },

  // ══════════════════════════════════════════════════════════════════════════════════
  // STUFE 2: MUSIKSCHULLEITER & SEKRETARIAT (VERWALTUNG VOR ORT)
  // ══════════════════════════════════════════════════════════════════════════════════
  {
    id: 'school-briefing',
    tier: 'school_management',
    boardId: 'briefing',
    title: 'Schulleitungs-Briefing & Schulübersicht',
    subtitle: 'Tagesbetrieb, Raumbelegungen, anwesendes Kollegium und Notfallmeldungen',
    badge: 'Briefing',
    category: 'quickstart',
    summary: 'Das zentrale Briefing Board der Schulleitung: Sieh auf einen Blick, welche Räume belegt sind, welche Lehrkräfte unterrichten und ob Terminänderungen vorliegen.',
    steps: [
      {
        title: '1. Schulleitungs-Tagesüberblick öffnen',
        desc: 'Das Briefing zeigt dir in Echtzeit alle laufenden und anstehenden Unterrichtseinheiten des heutigen Tages.',
        actionLabel: 'Briefing-Board aufrufen',
        actionTarget: 'briefing'
      },
      {
        title: '2. Raumauslastung prüfen',
        desc: 'Überprüfe freie und belegte Räume. Eventuelle Raumkollisionen werden sofort mit einer Warnung hervorgehoben.',
        actionLabel: 'Räume prüfen',
        actionTarget: 'rooms'
      },
      {
        title: '3. Notfall-Mitteilungen ansehen',
        desc: 'Kurzfristige Krankmeldungen von Lehrkräften oder Schülern erscheinen direkt in der Notfall-Übersicht.',
        actionLabel: 'Termine ansehen',
        actionTarget: 'schedule'
      }
    ],
    proTips: [
      'Schulleitungs- und Sekretariats-Profile nutzen das klassische Tafelbild (/campus_login_hero.png) und besitzen keine Musiker-Avatare.',
      'Das Terminänderungen-Widget blendet sich automatisch aus, wenn für heute keine Änderungen anstehen.'
    ],
    invariants: [
      'Profilbild-Governance: Nutzer der Verwaltung/Sekretariat tragen ausnahmslos das Tafelbild als Profilbild.'
    ],
    tags: ['schulleitung', 'briefing', 'tagesübersicht', 'raumbelegung', 'anwesenheit']
  },
  {
    id: 'school-schedule-designer',
    tier: 'school_management',
    boardId: 'schedule',
    title: 'Intelligenter Stundenplan-Designer & Matrix',
    subtitle: 'Kollisionsfreie Planung, Raumzuweisung und Drag & Drop für das ganze Schuljahr',
    badge: 'Stundenplan',
    category: 'core_boards',
    summary: 'Plane Einzel- und Gruppenunterrichte mit automatischer Raumkollisionsprüfung, Wochenwiederholungen und Kalenderansichten.',
    steps: [
      {
        title: '1. Unterrichtsblöcke per Drag & Drop planen',
        desc: 'Ziehe den Schüler aus der linken Schülerleiste auf den gewünschten Wochentag und die Startuhrzeit.',
        actionLabel: 'Stundenplaner aufrufen',
        actionTarget: 'schedule'
      },
      {
        title: '2. Raumkollisionen in Echtzeit erkennen',
        desc: 'Ist ein Raum zur selben Zeit belegt, meldet der Designer sofort eine Kollisionswarnung und schlägt freie Räume vor.',
        actionLabel: 'Räume prüfen',
        actionTarget: 'schedule'
      },
      {
        title: '3. Wöchentliche Serien duplizieren',
        desc: 'Nutze die Taste [D], um Unterrichtseinheiten schnell auf Folgewochen oder das ganze Schulhalbjahr zu übertragen.',
        actionLabel: 'Stundenplan anzeigen',
        actionTarget: 'schedule'
      }
    ],
    proTips: [
      'Nutze die Matrix-Ansicht, um alle Räume oder Lehrkräfte nebeneinander im Spaltenvergleich zu sehen.',
      'Feiertage und Schulferien des jeweiligen Bundeslands können im Kalender hinterlegt werden.'
    ],
    shortcuts: [
      { key: 'D', desc: 'Terminblock duplizieren' },
      { key: 'Esc', desc: 'Drag-Modus abbrechen' }
    ],
    invariants: [
      'Dynamisches Terminänderungen-Widget: Bei 0 Änderungen blendet sich das Widget auf allen Dashboards vollkommen aus.'
    ],
    tags: ['stundenplan', 'matrix', 'kollision', 'duplizieren', 'räume', 'serientermine']
  },
  {
    id: 'school-rooms-kiosk-engine',
    tier: 'school_management',
    boardId: 'rooms',
    title: 'Raum-Engine & Proberaum Kiosk-Tablets',
    subtitle: 'Räume organisieren, Belegungen prüfen und Kiosk-Displays latenzfrei koppeln',
    badge: 'Raum-Engine',
    category: 'core_boards',
    summary: 'Richte alle Unterrichtsräume deiner Musikschule ein. Tablets vor Ort an den Proberäumen zeigen stets den tagesaktuellen Belegungsplan.',
    steps: [
      {
        title: '1. Gebäude & Räume definieren',
        desc: 'Lege Räume mit Raumbezeichnung, Gebäude und optionaler Ausstattung (z. B. Flügel, Drumset) an.',
        actionLabel: 'Räume verwalten',
        actionTarget: 'rooms'
      },
      {
        title: '2. Kiosk-Display vor Ort koppeln',
        desc: 'Öffne auf dem Tablet an der Proberaumtür die URL campus-groovelab.de und tippe auf "Display koppeln". Gib den 6-stelligen Token ein.',
        actionLabel: 'Kopplungstoken generieren',
        actionTarget: 'rooms'
      },
      {
        title: '3. Echtzeit-Synchronisation bei Raumwechseln',
        desc: 'Verschiebst du im Stundenplaner einen Termin in einen anderen Raum, aktualisiert sich das Display an der Tür in unter 500 ms.',
        actionLabel: 'Stundenplan prüfen',
        actionTarget: 'schedule'
      }
    ],
    proTips: [
      'Kiosk-Displays schalten nach Unterrichtsende automatisch in den abgedunkelten Nachtmodus und sparen Strom.',
      'Sperre den Browser auf dem Kiosk-Tablet mit dem "Geführten Zugriff" (iOS) oder "App anheften" (Android).'
    ],
    invariants: [
      'Kiosk-Sicherheit: Kiosk-Tokens verfallen nach 30 Tagen automatisch und erlauben rein lesenden Zugriff auf den Raumplan.'
    ],
    tags: ['räume', 'kiosk', 'tablet', 'raumwechsel', 'sync', 'hardware']
  },
  {
    id: 'school-teachers-team',
    tier: 'school_management',
    boardId: 'team',
    title: 'Kollegium & Lehrkräfte-Verwaltung',
    subtitle: 'Lehrkräfte anlegen, Fächer zuweisen und Zero-Mail Login-Links bereitstellen',
    badge: 'Kollegium',
    category: 'core_boards',
    summary: 'Verwalte dein Kollegium: Lege Lehrkräfte mit ihren Instrumentalfächern und Stundensätzen an. Drucke Login-Ausweise für den Zero-Mail-Zugang.',
    steps: [
      {
        title: '1. Neue Lehrkraft anlegen',
        desc: 'Gib Vor- und Nachnamen, E-Mail (optional für Gehaltsabrechnung) und Unterrichtsfächer ein.',
        actionLabel: 'Kollegium öffnen',
        actionTarget: 'team'
      },
      {
        title: '2. QR-Ausweis & Zugangs-Link ausgeben',
        desc: 'Drucke den Ausweis mit QR-Code aus oder sende der Lehrkraft den passwortlosen Schnellstart-Link.',
        actionLabel: 'Ausweis drucken',
        actionTarget: 'team'
      },
      {
        title: '3. Unterrichtsstunden zuweisen',
        desc: 'Verknüpfe Schüler im Stundenplan direkt mit der zuständigen Lehrkraft.',
        actionLabel: 'Stundenplan öffnen',
        actionTarget: 'schedule'
      }
    ],
    proTips: [
      'Lehrkräfte benötigen keine Passwörter – der Scan des Ausweises loggt sie in 1 Sekunde ein.',
      'Verwaltungs- und Sekretariats-Nutzer sind in allen Bereitstellungspaketen kostenlos inklusive.'
    ],
    invariants: [
      'Service-Gebühr: Aktive Lehrkräfte und Administratoren werden mit 0,49 € / Mo. berechnet.'
    ],
    tags: ['kollegium', 'lehrer', 'fächer', 'ausweis', 'team', 'stundensatz'],
    pdfDownloadType: 'teacher_quickstart'
  },
  {
    id: 'school-students-onboarding',
    tier: 'school_management',
    boardId: 'students',
    title: 'Schülerverwaltung, Aufnahme & 1-Seiter Elternbrief',
    subtitle: 'DSGVO-konforme Aufnahme, Namensmaskierung und druckfertige Eltern-Infoblätter',
    badge: 'Schüler',
    category: 'core_boards',
    summary: 'Der Leitfaden für Schüleraufnahme und Verwaltung: Schüler anlegen, Smart-CSV importieren, druckfertige Eltern-Infoblätter erzeugen und Krankmeldungen koordinieren.',
    steps: [
      {
        title: '1. Neuer Schüler & Smart-CSV-Import',
        desc: 'Erfasse Neuanmeldungen einzeln oder importiere Klassenlisten per Excel/CSV. Vornamen und Nachnamen werden DSGVO-konform getrennt.',
        actionLabel: 'Schüleraufnahme starten',
        actionTarget: 'students'
      },
      {
        title: '2. 1-Seiter Eltern-Infoblatt drucken',
        desc: 'Klicke auf "Eltern-Infoblatt (PDF)". Der druckfertige DIN-A4-1-Seiter mit Schullogo und QR-Code erklärt Eltern die Nutzung ohne Passwort-Registrierung.',
        actionLabel: 'Elternbrief herunterladen',
        actionTarget: 'students'
      },
      {
        title: '3. Namensmaskierung für Minderjährige prüfen',
        desc: 'Schülernamen werden im Lehrer-Dashboard zum Schutz von Minderjährigen automatisch auf "Vorname + Nachname-Initial" (z. B. "Max M.") gekürzt.',
        actionLabel: 'Schülerliste prüfen',
        actionTarget: 'students'
      }
    ],
    proTips: [
      'Drucke neue Eltern-Infoblätter direkt bei der Anmeldung aus und lege sie der Begrüßungsmappe bei.',
      'Bei Rückfragen verweise auf den QR-Code: Die App benötigt keine Installation aus dem App Store.'
    ],
    invariants: [
      'Zero-Mail: Schüler und Eltern benötigen niemals eine E-Mail-Adresse für den Zugang.',
      'Absolute Datenminimierung: Keine Bank- oder SEPA-Daten von Schülern in der Datenbank.'
    ],
    tags: ['schüler', 'aufnahme', 'elternbrief', 'datenschutz', 'dsgvo', 'namensmaskierung'],
    pdfDownloadType: 'parent_quickstart'
  },
  {
    id: 'school-finops-b2b-billing',
    tier: 'school_management',
    boardId: 'billing',
    title: 'B2B-Infrastruktur-Rechnungen & FinOps-Transparenz',
    subtitle: 'Reine Cloud- und Bereitstellungskosten statt teurer Software-Lizenzen (0,00 € Lizenz)',
    badge: 'FinOps',
    category: 'finops_compliance',
    summary: 'Verstehe deine monatliche Musikschul-Rechnung: Keine Lizenzkaufgebühren, faire Bereitstellungspauschalen und automatische Kostendeckung.',
    steps: [
      {
        title: '1. Kanonische Nomenklatur prüfen',
        desc: 'Rechnungspositionen: 1. Software-Bereitstellung (0,00 €) ➔ 2. Hosting Campus (14,90 €) ➔ 3. Hosting GrooveLab (9,90 €) ➔ 4. Kombi-Vorteil (-4,90 €) ➔ 5. Team (0,49 €) ➔ 6. Schüler (0,49 €).',
        actionLabel: 'Rechnungsübersicht öffnen',
        actionTarget: 'billing'
      },
      {
        title: '2. Kostenlose inaktive Schülerkarteien',
        desc: 'Nur Schüler, die sich aktiv einloggen, werden abgerechnet. Inaktive Schüler in der Kartei kosten 0,00 €.',
        actionLabel: 'Schülerstatus einsehen',
        actionTarget: 'students'
      },
      {
        title: '3. B2C-Jahresgebühren & Eltern-Direktabrechnung',
        desc: 'Wird Direktabrechnung genutzt, zahlen Eltern den Jahresbeitrag von 5,88 € / Jahr (CHF 12.00 / Jahr). Dies entlastet die Schule vollständig.',
        actionLabel: 'Tarif-Optionen prüfen',
        actionTarget: 'billing'
      }
    ],
    proTips: [
      'GrooveLab-Aktivierungen werden verbindlich immer zu 100% von der Musikschule als Sammelzahler übernommen.',
      'Rechnungs-PDFs können jederzeit mit einem Klick für die städtische Buchhaltung heruntergeladen werden.'
    ],
    invariants: [
      'Verbotene Begriffe: Niemals "Lizenz" oder "Lizenzgebühr" verwenden. Es handelt sich um Cloud-Infrastruktur.',
      'Rechnungsnummer: B2B Musikschulrechnungen lauten immer `RE-[SCHOOL_ID]-[YYMM]-01`.'
    ],
    tags: ['rechnung', 'finops', 'kosten', 'infrastruktur', 'b2b', 'elternbeitrag']
  },
  {
    id: 'school-profile-settings',
    tier: 'school_management',
    boardId: 'setup',
    title: 'Musikschulprofil, Standorte & Geofencing',
    subtitle: 'Schulname, Adresse, Öffnungszeiten, Bankverbindung und Branding konfigurieren',
    badge: 'Schulprofil',
    category: 'core_boards',
    summary: 'Richte das Profil deiner Musikschule ein: Hinterlege die offizielle Adresse, passe die Schulfarbe (Brand Color) an und definiere Öffnungszeiten für Kiosk-Terminals.',
    steps: [
      {
        title: '1. Stammdaten & Schullogo hinterlegen',
        desc: 'Lade das Schullogo hoch. Es erscheint automatisch auf allen ausgedruckten Elternbriefen und Schülerausweisen.',
        actionLabel: 'Schulprofil öffnen',
        actionTarget: 'setup'
      },
      {
        title: '2. Geofencing & Öffnungszeiten festlegen',
        desc: 'Definiere den GPS-Radius deiner Standorte und die Betriebszeiten für Schüler-Kioske vor Ort.',
        actionLabel: 'Standorte anpassen',
        actionTarget: 'setup'
      },
      {
        title: '3. Bankverbindung für Eltern-Überweisungen eintragen',
        desc: 'Hinterlege die IBAN deiner Musikschule für Schüler-Jahresbeiträge bei Direktabrechnung.',
        actionLabel: 'Bankdaten prüfen',
        actionTarget: 'setup'
      }
    ],
    proTips: [
      'Wähle eine kontrastreiche Schulfarbe – sie zieht sich als Akzentfarbe durch das gesamte System.',
      'Änderungen an den Öffnungszeiten übertragen sich sofort auf die Kiosk-Displays an den Türen.'
    ],
    invariants: [
      'DSGVO-Datensparsamkeit: Keine Weitergabe von Schuldaten an Dritte.'
    ],
    tags: ['profil', 'logo', 'branding', 'geofencing', 'öffnungszeiten', 'iban']
  },
  {
    id: 'school-groovelab-admin',
    tier: 'school_management',
    boardId: 'bands',
    title: 'GrooveLab Modul-Administration & Band-Netzwerk',
    subtitle: 'Ensembles überwachen, Schul-Repertoire verwalten und Live-Lab Stationen steuern',
    badge: 'GrooveLab',
    category: 'core_boards',
    summary: 'Die Ensemble- und Band-Zentrale für die Schulleitung: Sieh alle aktiven Bands deiner Schule, weise Coaches zu und pflege das Schul-Repertoire an Chords und Play-Alongs.',
    steps: [
      {
        title: '1. Band-Übersicht aufrufen',
        desc: 'Im gelben GrooveLab-Reiter siehst du alle bestehenden Bands mit ihrer Besetzung und den zugewiesenen Lehrkräften.',
        actionLabel: 'Bands verwalten',
        actionTarget: 'bands'
      },
      {
        title: '2. Schul-Song-Bibliothek erweitern',
        desc: 'Pflege Chords, Leadsheets und Backing-Tracks für Ensembles in der zentralen Schul-Bibliothek.',
        actionLabel: 'Songs öffnen',
        actionTarget: 'bands'
      },
      {
        title: '3. Proberaum-Stationen & Kioske zuweisen',
        desc: 'Konfiguriere digitale Instrumenten-Stationen für Live-Bandproben im Proberaum.',
        actionLabel: 'Stationen verwalten',
        actionTarget: 'rooms'
      }
    ],
    proTips: [
      'Im GrooveLab-Modul wechseln Buttons und Akzente auf das leuchtende Gelb (#eab308).',
      'Schulleitung und Sekretariat tragen auch im GrooveLab das Tafelbild – keine Musiker-Avatare.'
    ],
    invariants: [
      'Kosten-Axiom: GrooveLab-Aktivierungen werden verbindlich immer zu 100% von der Musikschule übernommen.'
    ],
    tags: ['groovelab', 'bands', 'repertoire', 'stationen', 'ensemble', 'kiosk']
  },

  // ══════════════════════════════════════════════════════════════════════════════════
  // STUFE 3: LEHRKRÄFTE (UNTERRICHT & PÄDAGOGIK)
  // ══════════════════════════════════════════════════════════════════════════════════
  {
    id: 'teacher-briefing',
    tier: 'teacher',
    boardId: 'briefing',
    title: 'Tages-Briefing & Schüler-Timeline',
    subtitle: 'Chronologischer Tagesplan, Anwesenheit erfassen und Raumwechsel sofort erkennen',
    badge: 'Briefing',
    category: 'quickstart',
    summary: 'Dein Start in den Unterrichtstag: Scanne deinen QR-Ausweis, öffne dein Tages-Briefing und sieh sofort alle Schüler, Raumwechsel und Aufgaben des Tages in chronologischer Reihenfolge.',
    steps: [
      {
        title: '1. Zero-Mail Login per Ausweis-Scan',
        desc: 'Halte die Kamera deines Smartphones oder Tablets auf deinen Lehrkraft-Ausweis. Du bist sofort ohne E-Mail und Passwort eingeloggt.',
        actionLabel: 'Zum Briefing-Dashboard',
        actionTarget: 'briefing'
      },
      {
        title: '2. Tages-Briefing & Schüler-Timeline prüfen',
        desc: 'Dein Briefing-Board zeigt dir die Schüler des Tages chronologisch. Steht ein Raumwechsel an, wird er farblich hervorgehoben.',
        actionLabel: 'Timeline ansehen',
        actionTarget: 'briefing'
      },
      {
        title: '3. Anwesenheit mit 1 Klick dokumentieren',
        desc: 'Tippe beim Termin auf den Status, um Anwesenheit oder entschuldigtes Fehlen festzuhalten.',
        actionLabel: 'Termine prüfen',
        actionTarget: 'briefing'
      }
    ],
    proTips: [
      'Füge die Seite deinem Home-Bildschirm hinzu (PWA), um Campus-Groovelab wie eine native App ohne Browserleiste zu nutzen.',
      'Dein Musiker-Avatar (bzw. Geist-Avatar im GrooveLab) zeigt deinen Schülern sofort deine musikalische Identität.'
    ],
    invariants: [
      'Lehrkraft-Transparenz: Lehrernamen werden datenschutzkonform mit vollem Vor- und Nachnamen geführt.'
    ],
    tags: ['lehrer', 'briefing', 'timeline', 'ausweis', 'anwesenheit', 'unterrichtstag'],
    pdfDownloadType: 'teacher_quickstart'
  },
  {
    id: 'teacher-homework-book',
    tier: 'teacher',
    boardId: 'homework_book',
    title: 'Schüler-Protokoll & Hausaufgabenheft',
    subtitle: 'Lehrbücher auswählen, Notenseiten eintragen und Hausaufgaben nach Goldstandard erfassen',
    badge: 'Protokoll',
    category: 'core_boards',
    summary: 'Dokumentiere den Unterricht nach der ergonomischen Master-Blaupause: Reinweiße Schülervorschau oben, bunte Buchcover-Badges und klare Übe-Ziele in der matten Werkzeugbank darunter.',
    steps: [
      {
        title: '1. Schüler im Briefing anklicken',
        desc: 'Tippe auf den Schüler in deiner Tages-Timeline, um das Schüler-Protokoll zu öffnen.',
        actionLabel: 'Schüler-Protokoll öffnen',
        actionTarget: 'homework_book'
      },
      {
        title: '2. Lehrbuch & Seitenzahlen (z. B. S. 24) festlegen',
        desc: 'Wähle das Notenheft aus der Schulbibliothek und trage die Seitenzahl ein. Die Seitenzahl wird als grüne Pille gerendert.',
        actionLabel: 'Hausaufgabe anlegen',
        actionTarget: 'homework_book'
      },
      {
        title: '3. Hausaufgaben-Notizen in die Werkzeugbank eintragen',
        desc: 'Trage Bemerkungen und Wochenziele in die matte Werkzeugbank unterhalb der Helden-Karte ein. Die Schülervorschau aktualisiert sich live.',
        actionLabel: 'Notizen speichern',
        actionTarget: 'homework_book'
      }
    ],
    proTips: [
      'Keine farbigen Streifenbalken: Das Hausaufgabenheft fließt als saubere Magazin-Typografie auf weißem Grund.',
      'Deine internen Lehrernotizen sind für Eltern und Schüler unsichtbar und dienen deiner eigenen Unterrichtsvorbereitung.'
    ],
    invariants: [
      'Master-Blaupause: Die Schülervorschau sieht auf allen Geräten exakt identisch aus (Universal Uniformity).'
    ],
    tags: ['hausaufgaben', 'protokoll', 'lehrbuch', 'seiten', 'werkzeugbank', 'übeziele']
  },
  {
    id: 'teacher-playalong-studio',
    tier: 'teacher',
    boardId: 'recordings',
    title: 'Play-Along Studio & Audio-Tresor',
    subtitle: '1-Klick-Aufnahmen im Unterricht: Hörbeispiele, Play-Alongs und Notizen aufnehmen',
    badge: 'Audio-Studio',
    category: 'audio_studio',
    summary: 'Nimm mit einem Klick Hörbeispiele, Klavierbegleitungen oder Metronom-Vorzähler auf. Schüler können zu Hause sample-genau mitspielen.',
    steps: [
      {
        title: '1. Play-Along Studio in der Werkzeugbank öffnen',
        desc: 'Klicke im Schüler-Protokoll auf "Play-Along Studio". Dein Mikrofon wird automatisch eingepegelt.',
        actionLabel: 'Studio öffnen',
        actionTarget: 'recordings'
      },
      {
        title: '2. Aufnahme starten & einspielen',
        desc: 'Drücke auf den roten Aufnahme-Button. Spiele das Stück oder die Begleitung ein (bis zu 7 Minuten mit Audio-Tresor).',
        actionLabel: 'Aufnahme testen',
        actionTarget: 'recordings'
      },
      {
        title: '3. Automatische Verknüpfung mit der Hausaufgabe',
        desc: 'Die Aufnahme wird automatisch an die heutige Hausaufgabe angehängt und steht dem Schüler sofort in seiner App zur Verfügung.',
        actionLabel: 'Hausaufgabe prüfen',
        actionTarget: 'homework_book'
      }
    ],
    proTips: [
      'Strikte Audio-Zuordnung: Deine Lehreraufnahmen erscheinen beim Schüler immer LINKS ("Von deiner Lehrkraft").',
      'Nutze Multi-Takes, um getrennte Spuren für Melodie und Begleitung aufzunehmen.'
    ],
    invariants: [
      'Audio-Zuordnungs-Axiom: Lehreraufnahmen links, Schüler-Eigenaufnahmen rechts.',
      'Sample-Genauigkeit: Die Loopstation startet immer mit verbindlicher 4-Takte-Pause.'
    ],
    tags: ['audio', 'playalong', 'tresor', 'aufnahme', 'begleitung', 'mikrofon']
  },
  {
    id: 'teacher-students',
    tier: 'teacher',
    boardId: 'students',
    title: 'Meine Schüler & Pädagogischer Entwicklungsstand',
    subtitle: 'Schülerübersicht, Kontaktdaten der Eltern und didaktische Historie einsehen',
    badge: 'Schüler',
    category: 'core_boards',
    summary: 'Behalte den Lernfortschritt aller deiner Schüler im Blick: Verfolge gemeisterte Stücke, offene Hausaufgaben und den Übe-Verlauf der letzten Wochen.',
    steps: [
      {
        title: '1. Schülerliste aufrufen',
        desc: 'Sieh alle dir zugewiesenen Schüler mit aktuellem Status, Instrument und Unterrichtszeit.',
        actionLabel: 'Schülerübersicht öffnen',
        actionTarget: 'students'
      },
      {
        title: '2. Didaktischen Verlauf & Streaks ansehen',
        desc: 'Prüfe, wie oft der Schüler zu Hause den Fokus-Timer genutzt hat und wie aktiv geübt wurde.',
        actionLabel: 'Übe-Protokoll einsehen',
        actionTarget: 'students'
      },
      {
        title: '3. Meisterwerk-Urkunde verleihen',
        desc: 'Hat ein Schüler ein anspruchsvolles Stück gemeistert, schalte mit 1 Klick die offizielle Meisterwerk-Urkunde frei.',
        actionLabel: 'Urkunde verleihen',
        actionTarget: 'homework_book'
      }
    ],
    proTips: [
      'Schülernamen werden im Lehrer-Dashboard zum Schutz von Minderjährigen auf "Vorname + Nachname-Initial" (z. B. "Max M.") gekürzt.',
      'Lobe lange Flammen-Serien (Streaks) im Unterricht – das motiviert Schüler enorm.'
    ],
    invariants: [
      'Datenschutz: Keine Einsicht in private Bank- oder Vertragsdaten der Eltern.'
    ],
    tags: ['schüler', 'fortschritt', 'übeverlauf', 'streaks', 'meisterwerk', 'urkunde']
  },
  {
    id: 'teacher-schedule',
    tier: 'teacher',
    boardId: 'schedule',
    title: 'Mein Stundenplan & Raumbelegung',
    subtitle: 'Wochenübersicht, Termine abstimmen und Raumzuweisungen prüfen',
    badge: 'Stundenplan',
    category: 'core_boards',
    summary: 'Dein persönlicher Wochenkalender: Sieh alle Unterrichtseinheiten, Raumzuweisungen und Terminkollisionen auf einen Blick.',
    steps: [
      {
        title: '1. Wochenansicht öffnen',
        desc: 'Der Kalender zeigt deine Unterrichtstage, Schülerblöcke und zugewiesenen Räume an.',
        actionLabel: 'Stundenplan aufrufen',
        actionTarget: 'schedule'
      },
      {
        title: '2. Raumwechsel im Blick behalten',
        desc: 'Wurde ein Unterricht in einen anderen Raum verlegt, ist der Raum im Kalender farblich hervorgehoben.',
        actionLabel: 'Räume prüfen',
        actionTarget: 'schedule'
      },
      {
        title: '3. Ersatztermine & Ausweichtermine vorschlagen',
        desc: 'Muss ein Schüler einen Termin verschieben, kannst du direkt über den Kalender einen Alternativtermin anbieten.',
        actionLabel: 'Termine verwalten',
        actionTarget: 'schedule'
      }
    ],
    proTips: [
      'Der Kalender synchronisiert sich in Echtzeit mit den Kiosk-Displays an den Türen der Musikschule.',
      'Nutze den Monatsüberblick für Ferien- und Feiertagsplanung.'
    ],
    invariants: [
      'Echtzeit-Synchronität: Kalenderänderungen aktualisieren Schülerevents sofort.'
    ],
    tags: ['stundenplan', 'wochenansicht', 'raum', 'termine', 'kalender']
  },
  {
    id: 'teacher-shouts',
    tier: 'teacher',
    boardId: 'shouts',
    title: 'Notfall-Chat & Shouts (§ 8a SGB VIII)',
    subtitle: '1:1 Direktnachrichten für kurzfristige Absprachen rechtssicher und datensparsam führen',
    badge: 'Shouts',
    category: 'core_boards',
    summary: 'Sichere Direktkommunikation mit Schülern und Eltern: Sende kurze Notizen zur Unterrichtszeit direkt an den Termin – ohne WhatsApp oder private Handynummern.',
    steps: [
      {
        title: '1. Shoutbox am Termin öffnen',
        desc: 'Klicke in deiner Tages-Timeline auf die Sprechblase des Termins.',
        actionLabel: 'Timeline aufrufen',
        actionTarget: 'briefing'
      },
      {
        title: '2. Kurznachricht eingeben',
        desc: 'Tippe deine Nachricht (z. B. "Bitte Notenheft Band 2 mitbringen" oder "Komme 5 Min. später").',
        actionLabel: 'Nachricht verfassen',
        actionTarget: 'briefing'
      },
      {
        title: '3. Schüler / Eltern erhalten Sofort-Benachrichtigung',
        desc: 'Die Nachricht erscheint sofort am Termin im Schüler-Dashboard.',
        actionLabel: 'Chat prüfen',
        actionTarget: 'briefing'
      }
    ],
    proTips: [
      'Kein privater Nummeraustausch nötig – der Chat läuft vollständig über die Schulplattform.',
      'Shouts dienen kurzen organisatorischen Absprachen und schützen Lehrkräfte vor Anrufen in der Freizeit.'
    ],
    invariants: [
      'Kinderschutz nach § 8a SGB VIII: Alle Nachrichten werden als organisatorische Unterrichtsbote protokolliert.'
    ],
    tags: ['shouts', 'chat', 'nachrichten', 'kinderschutz', 'absprache', 'notfall']
  },
  {
    id: 'teacher-groovelab-bands',
    tier: 'teacher',
    boardId: 'bands',
    title: 'GrooveLab Bands, Repertoire & Skill-Radar',
    subtitle: 'Ensembles coachen, Songs aus der Bibliothek zuweisen und Fertigkeiten visualisieren',
    badge: 'GrooveLab',
    category: 'core_boards',
    summary: 'Das gelbe GrooveLab-Modul für Ensembles und Bands: Teile Songs in Song-Parts, vergebe XP-Punkte und visualisiere Fertigkeiten im Skill-Radar.',
    steps: [
      {
        title: '1. Band gründen & Besetzung zusammenstellen',
        desc: 'Wähle Schüler für die Band aus und weise ihnen Instrumente (E-Gitarre, Bass, Drums, Keys, Vocals) zu.',
        actionLabel: 'Bands verwalten',
        actionTarget: 'bands'
      },
      {
        title: '2. Songs aus der Bibliothek zuweisen',
        desc: 'Wähle Stücke aus dem Repertoire-Katalog aus. Schüler sehen Chords, Leadsheets und Übe-Tracks in ihrem Band-Room.',
        actionLabel: 'Songs öffnen',
        actionTarget: 'bands'
      },
      {
        title: '3. Skill-Radar & Fortschritt bewerten',
        desc: 'Bewerte Timing, Dynamik und Ausdruck. Das Skill-Radar visualisiert den Lernfortschritt der gesamten Band.',
        actionLabel: 'Skill-Radar prüfen',
        actionTarget: 'bands'
      }
    ],
    proTips: [
      'Im GrooveLab-Modul schalten alle Buttons und Highlights auf das charakteristische Gelb (#eab308).',
      'Bands können eigene Band-Avatare (Neon Rock, Acoustic Duo, etc.) wählen.'
    ],
    invariants: [
      'Modul-Isolation: GrooveLab-Aktivierungen werden immer von der Musikschule übernommen (0,00 € für Eltern).'
    ],
    tags: ['groovelab', 'bands', 'repertoire', 'skillradar', 'songs', 'ensemble']
  },

  // ══════════════════════════════════════════════════════════════════════════════════
  // STUFE 4: SCHÜLER & ELTERN (CAMPUS-PASS & ÜBEN)
  // ══════════════════════════════════════════════════════════════════════════════════
  {
    id: 'student-briefing-start',
    tier: 'student',
    boardId: 'briefing',
    title: 'Campus-Pass & Dein Tages-Briefing',
    subtitle: '1-Sekunden-Login ohne Passwort, Stundenplan & wichtige Mitteilungen',
    badge: 'Schüler-Start',
    category: 'quickstart',
    summary: 'Dein Einstieg in Campus-Groovelab: Scanne einfach deinen QR-Code auf dem Campus-Pass oder gib deine 5-stellige PIN ein. Du siehst sofort deine nächste Unterrichtsstunde, den Raum und wichtige Notizen deiner Lehrkraft.',
    steps: [
      {
        title: '1. Campus-Pass bereithalten',
        desc: 'Dein Campus-Pass ist die kleine Karte oder das Blatt, das du von deiner Musikschule bekommen hast.',
        actionLabel: 'Pass bereithalten',
        actionTarget: 'briefing'
      },
      {
        title: '2. QR-Code mit Smartphone scannen',
        desc: 'Öffne die Kamera deines Handys oder Tablets und halte sie auf den QR-Code. Du bist sofort ohne Passwort eingeloggt.',
        actionLabel: 'Zum Briefing',
        actionTarget: 'briefing'
      },
      {
        title: '3. Nächste Stunde & Raum prüfen',
        desc: 'Auf deiner Startseite siehst du genau, wann deine nächste Stunde beginnt und in welchem Raum sie stattfindet.',
        actionLabel: 'Tages-Briefing ansehen',
        actionTarget: 'briefing'
      }
    ],
    proTips: [
      'Tippe im Browser auf "Teilen" ➔ "Zum Home-Bildschirm", dann öffnet sich Campus-Groovelab wie eine echte App.',
      'Solltest du deinen Pass verlegt haben, kann deine Lehrkraft dir in 5 Sekunden einen neuen ausdrucken.'
    ],
    invariants: [
      '100% Datenschutz: Es werden keine E-Mail-Adressen, Kreditkarten oder Telefonnummern von Schülern gespeichert.'
    ],
    tags: ['schüler', 'campus pass', 'login', 'qr code', 'pin', 'ohne passwort', 'briefing'],
    pdfDownloadType: 'parent_quickstart'
  },
  {
    id: 'student-homework-book',
    tier: 'student',
    boardId: 'homework_book',
    title: 'Digitales Aufgabenheft: Notizen & Buchseiten',
    subtitle: 'Alle Hausaufgaben, Buchseiten und Übe-Ziele synchron auf deinem Smartphone',
    badge: 'Aufgaben',
    category: 'core_boards',
    summary: 'Vergiss nie wieder deine Notenhefte oder Hausaufgaben: Im Reiter "Aufgaben" findest du genau die Seiten, die du üben sollst, und die Audio-Aufnahmen deiner Lehrkraft zum Mitspielen.',
    steps: [
      {
        title: '1. Aufgaben-Reiter öffnen',
        desc: 'Tippe im Menü auf "Aufgaben". Hier siehst du die Hausaufgabe deiner letzten Unterrichtsstunde.',
        actionLabel: 'Zu den Aufgaben springen',
        actionTarget: 'homework_book'
      },
      {
        title: '2. Buchseiten & Übe-Ziele nachlesen',
        desc: 'Die grünen Pillen (z. B. "S. 24") zeigen dir genau die Seiten im Notenbuch. Die Notizen erklären, worauf du achten sollst.',
        actionLabel: 'Hausaufgabe lesen',
        actionTarget: 'homework_book'
      },
      {
        title: '3. Lehrer-Aufnahmen auf der linken Seite anhören',
        desc: 'Höre dir das Stück an, wie es klingen soll. Aufnahmen deiner Lehrkraft stehen immer links bereit.',
        actionLabel: 'Aufnahme abspielen',
        actionTarget: 'homework_book'
      }
    ],
    proTips: [
      'Wenn du eine Hausaufgabe fertig geübt hast, kannst du sie als erledigt abhaken.',
      'Über die Shoutbox kannst du deinem Lehrer eine kurze Frage stellen, wenn du bei einer Note unsicher bist.'
    ],
    invariants: [
      'Aufnahmen-Herkunft: Aufnahmen deiner Lehrkraft stehen links, deine eigenen Übe-Aufnahmen rechts.'
    ],
    tags: ['aufgabenheft', 'hausaufgaben', 'noten', 'buchseiten', 'üben', 'notizen']
  },
  {
    id: 'student-practice-studio-timer',
    tier: 'student',
    boardId: 'practice_board',
    title: 'Übe-Studio & Fokus-Timer: XP sammeln & Streaks',
    subtitle: 'Starte den Fokus-Timer, baue deine Flammen-Serie auf und nimm eigene Takes auf',
    badge: 'Übe-Studio',
    category: 'audio_studio',
    summary: 'Mach dein Üben zu einem Erfolgserlebnis: Starte den Timer, sammle Erfahrungspunkte (XP), halte deine Wochen-Serie und nimm dich selbst auf.',
    steps: [
      {
        title: '1. Fokus-Timer vor dem Üben starten',
        desc: 'Gehe in dein Übe-Studio und starte den Timer. Der Timer läuft ruhig im Hintergrund mit.',
        actionLabel: 'Timer starten',
        actionTarget: 'practice_board'
      },
      {
        title: '2. XP-Punkte & Übe-Serie (Streaks) ausbauen',
        desc: 'Für jede geübte Minute sammelst du XP. Übst du mehrere Tage in Folge, entfacht deine Übe-Flamme (Streak).',
        actionLabel: 'Streaks ansehen',
        actionTarget: 'practice_board'
      },
      {
        title: '3. Eigene Aufnahmen im Studio aufnehmen',
        desc: 'Drücke auf den Aufnahmeknopf und nimm dein eigenes Spiel auf. Deine Aufnahmen landen sicher auf der rechten Seite ("Dein Übe-Studio").',
        actionLabel: 'Aufnahme starten',
        actionTarget: 'practice_board'
      }
    ],
    proTips: [
      'Schließe Kopfhörer an, um dein Spiel sauber und ohne Nebengeräusche abzuhören.',
      'Sammle genug XP, um neue Musiker-Avatare und Auszeichnungs-Sticker freizuschalten.'
    ],
    invariants: [
      'Eigene Aufnahmen: Deine Aufnahmen landen ausschließlich in deinem privaten Übe-Studio (rechte Seite).'
    ],
    tags: ['üben', 'timer', 'xp', 'streaks', 'aufnahme', 'studio', 'flamme']
  },
  {
    id: 'student-loopstation-playalong',
    tier: 'student',
    boardId: 'loopstation',
    title: 'Interaktive Audio-Loopstation mit 4-Takte-Pause',
    subtitle: 'Spiele sample-genau zur Aufnahme deiner Lehrkraft mit',
    badge: 'Loopstation',
    category: 'audio_studio',
    summary: 'Die Loopstation spielt die Aufnahme deines Lehrers im Kreis ab. Durch die verbindliche 4-Takte-Pause hast du immer Zeit, dich bereit zu machen.',
    steps: [
      {
        title: '1. Loopstation im Aufgabenheft starten',
        desc: 'Tippe bei der Aufnahme deiner Lehrkraft auf das Loopstation-Symbol.',
        actionLabel: 'Loopstation öffnen',
        actionTarget: 'homework_book'
      },
      {
        title: '2. 4-Takte Vorzähler-Pause abwarten',
        desc: 'Nutze die 4 Takte Pause, um dein Instrument in Anschlagsposition zu bringen.',
        actionLabel: 'Loop abspielen',
        actionTarget: 'homework_book'
      },
      {
        title: '3. Im Kreis mitspielen',
        desc: 'Die Spur wiederholt sich nahtlos, bis du die Passage sicher beherrschst.',
        actionLabel: 'Loopstation testen',
        actionTarget: 'homework_book'
      }
    ],
    proTips: [
      'Konzentriere dich auf gleichmäßiges Timing und die Intonation.',
      'Die 4-Takte-Pause verhindert gehetztes Einsetzen und schont deine Konzentration.'
    ],
    invariants: [
      'Sample-Genauigkeit: Die Loopstation startet immer mit verbindlicher 4-Takte-Pause.'
    ],
    tags: ['loopstation', 'playalong', 'pause', 'timing', 'üben', 'audio']
  },
  {
    id: 'student-meisterwerk-vault',
    tier: 'student',
    boardId: 'hero',
    title: 'Meisterwerk-Tresor & Mein Held',
    subtitle: 'Deine gemeisterten Stücke, offizielle Meisterwerk-Urkunden und Sticker-Album',
    badge: 'Tresor',
    category: 'core_boards',
    summary: 'Deine persönliche musikalische Ruhmeshalle: Jedes Stück, das du mit deiner Lehrkraft fertig lernst, wird im Meisterwerk-Tresor mit einer Urkunde verewigt.',
    steps: [
      {
        title: '1. Stück mit Lehrkraft vollenden',
        desc: 'Wenn du ein Stück flüssig vorspielen kannst, schaltet deine Lehrkraft die Meisterwerk-Urkunde frei.',
        actionLabel: 'Zum Helden-Bereich',
        actionTarget: 'hero'
      },
      {
        title: '2. Offizielle Urkunde ansehen',
        desc: 'Tippe auf die Urkunde in deinem Tresor. Sie trägt deinen Namen, das Musikschul-Siegel und das Abschlussdatum.',
        actionLabel: 'Urkunden ansehen',
        actionTarget: 'hero'
      },
      {
        title: '3. Als PDF herunterladen oder ausdrucken',
        desc: 'Drucke deine Urkunde für dein Zimmer aus oder teile sie digital mit deinen Großeltern.',
        actionLabel: 'PDF exportieren',
        actionTarget: 'hero'
      }
    ],
    proTips: [
      'Je mehr Stücke du meisterst, desto höher steigt dein Level und desto seltenere Sticker schaltest du frei.',
      'Urkunden können jederzeit erneut als hochauflösendes PDF heruntergeladen werden.'
    ],
    invariants: [
      'Revisionssicherheit: Ausgestellte Meisterwerk-Urkunden bleiben dauerhaft in deiner musikalischen Biografie erhalten.'
    ],
    tags: ['meisterwerk', 'urkunde', 'tresor', 'abschluss', 'sticker', 'erfolg']
  },
  {
    id: 'student-groovelab-bandroom',
    tier: 'student',
    boardId: 'songs',
    title: 'GrooveLab Band-Room, Songs & Musiker-Avatare',
    subtitle: 'Gemeinsam mit deiner Band Songs meistern und den Skill-Radar füllen',
    badge: 'GrooveLab',
    category: 'core_boards',
    summary: 'Das gelbe Band-Modul für Schüler: Tritt deiner Band bei, wähle deinen Musiker-Avatar (oder Geist-Avatar), lerne deine Song-Parts und bereite deinen nächsten Band-Auftritt vor.',
    steps: [
      {
        title: '1. In den gelben GrooveLab-Reiter wechseln',
        desc: 'Tippe oben auf "GrooveLab", um in den Band-Modus zu wechseln.',
        actionLabel: 'Zu GrooveLab wechseln',
        actionTarget: 'songs'
      },
      {
        title: '2. Band-Room betreten & Songs ansehen',
        desc: 'Sieh, welche Stücke deine Band gerade probt. Öffne Chords, Songtexte und Play-Alongs.',
        actionLabel: 'Songs öffnen',
        actionTarget: 'songs'
      },
      {
        title: '3. Skill-Radar füllen & Song-XP sammeln',
        desc: 'Jedes gemeisterte Stück bringt deiner Band Punkte und füllt deinen persönlichen Skill-Radar.',
        actionLabel: 'Songs ansehen',
        actionTarget: 'songs'
      }
    ],
    proTips: [
      'Nutze den Band-Chat, um Absprachen für die nächste Bandprobe zu treffen.',
      'Im GrooveLab kannst du deinen persönlichen Musiker-Avatar individuell gestalten.'
    ],
    invariants: [
      'GrooveLab-Aktivierungen sind für Eltern und Schüler immer zu 100% kostenlos.'
    ],
    tags: ['groovelab', 'band', 'songs', 'avatar', 'skillradar', 'ensemble']
  },
  {
    id: 'student-parents-safety',
    tier: 'student',
    boardId: 'profile',
    title: 'Eltern-Bereich: PIN-Schutz, Bildschirmzeit & Daten-Tresor',
    subtitle: 'Persönliche PIN festlegen, Übe-Zeitfenster steuern und DSGVO-Archiv exportieren',
    badge: 'Eltern-Schutz',
    category: 'core_boards',
    summary: 'Sicherheit und Übersicht für Eltern: Schützen Sie das Profil mit einer persönlichen PIN, passen Sie die empfohlene Bildschirmzeit für jüngere Kinder an und laden Sie das vollständige didaktische Archiv herunter.',
    steps: [
      {
        title: '1. Eltern-Bereich im Profil öffnen',
        desc: 'Öffne das Profilmenü und tippe auf "Eltern-Schutz".',
        actionLabel: 'Profil öffnen',
        actionTarget: 'profile'
      },
      {
        title: '2. 4-stellige Eltern-PIN einrichten',
        desc: 'Verhindere ungewollte Änderungen am Profil durch eine persönliche Eltern-PIN.',
        actionLabel: 'PIN einrichten',
        actionTarget: 'profile'
      },
      {
        title: '3. Vollständigen Daten-Export herunterladen',
        desc: 'Lade mit 1 Klick alle Hausaufgabennotizen, Urkunden und Audio-Takes als ZIP-Archiv herunter.',
        actionLabel: 'Archiv exportieren',
        actionTarget: 'profile'
      }
    ],
    proTips: [
      'Die Eltern-PIN schützt Einstellungen vor versehentlichen Änderungen durch jüngere Kinder.',
      'Der Datenexport enthält alle Übungszeiten und Urkunden in einer komprimierten ZIP-Datei.'
    ],
    invariants: [
      'Zero-Knowledge: PIN-Prüfungen erfolgen zu 100% serverseitig über sichere Hash-RPCs.',
      'Absolute Datenminimierung: Keine Speicherung von SEPA-, Bank- oder Kreditkartendaten.'
    ],
    tags: ['eltern', 'pin', 'schutz', 'bildschirmzeit', 'export', 'datenschutz', 'dsgvo']
  }
];
