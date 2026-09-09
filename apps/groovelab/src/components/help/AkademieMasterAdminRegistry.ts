import { AkademieBoardGuide } from './AkademieContentRegistry';

/**
 * 🏛️ CAMPUS-GROOVELAB AKADEMIE & LEITFÄDEN - MASTER-ADMIN REGISTRY
 * 
 * OWASP ASVS Level 3 / Fail-Closed Bundle-Isolation:
 * Diese 11 Master-Admin-Guides enthalten vertrauliche Plattform-Interna
 * (Hetzner-Cluster, P95-Telemetrie, B2B Delinquency Engine, PITR-Backups).
 * Sie sind physisch aus dem regulären Mandanten-Bundle ausgelagert und werden
 * ausschließlich bei autorisierter Master-Admin-Sitzung dynamisch nachgeladen.
 */

export const MASTER_ADMIN_GUIDES: AkademieBoardGuide[] = [
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
  }
];
