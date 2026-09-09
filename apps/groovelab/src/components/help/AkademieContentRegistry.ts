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

/**
 * 🛡️ OWASP ASVS Level 3 Dynamischer Loader für Master-Admin Guides.
 * Verhindert, dass vertrauliche Plattform-Betreiber-Interna in reguläre Mandanten-Bundles leaken.
 */
export async function getMasterAdminGuides(): Promise<AkademieBoardGuide[]> {
  const mod = await import('./AkademieMasterAdminRegistry');
  return mod.MASTER_ADMIN_GUIDES;
}

export const AKADEMIE_GUIDES_DATABASE: AkademieBoardGuide[] = [
  // ══════════════════════════════════════════════════════════════════════════════════
  // STUFE 2: MUSIKSCHULLEITER & SEKRETARIAT (VERWALTUNG VOR ORT)
  // ══════════════════════════════════════════════════════════════════════════════════
  {
    id: 'school-briefing',
    tier: 'school_management',
    boardId: 'briefing',
    title: 'Schulleitungs-Briefing & Live-Betriebs-Cockpit',
    subtitle: 'Tagesbetrieb, Raumauslastung, anwesendes Kollegium und dynamisches Terminänderungs-Radar',
    badge: 'Briefing',
    category: 'quickstart',
    summary: 'Das zentrale Führungs-Cockpit für Schulleitung und Sekretariat: Sieh in Echtzeit den laufenden Unterrichtsbetrieb, prüfe freie Räume und erkenne kurzfristige Ausfälle oder Raumkonflikte sofort.',
    steps: [
      {
        title: '1. Schulleitungs-Tagesüberblick öffnen',
        desc: 'Das Briefing-Board bündelt alle Unterrichtseinheiten des heutigen Tages chronologisch über alle Gebäude und Stockwerke hinweg.',
        actionLabel: 'Briefing öffnen',
        actionTarget: 'briefing'
      },
      {
        title: '2. Raumauslastung & Belegungsstatus prüfen',
        desc: 'Die Raum-Engine visualisiert auf einen Blick, welche Säle belegt sind. Droht eine Doppelbelegung, warnt das rote Konflikt-Radar sofort.',
        actionLabel: 'Räume prüfen',
        actionTarget: 'rooms'
      },
      {
        title: '3. Dynamisches Terminänderungen-Widget überwachen',
        desc: 'Wurden Unterrichtsstunden verschoben oder entfallen sie? Das Terminänderungen-Widget zeigt offene Anpassungen – liegen keine Änderungen vor, blendet es sich automatisch aus.',
        actionLabel: 'Stundenplan ansehen',
        actionTarget: 'schedule'
      }
    ],
    proTips: [
      '🏛️ Tafelbild-Governance: Schulleitung und Sekretariat tragen plattformweit das professionelle Briefing-Board-Tafelbild (/campus_login_hero.png) – keine Musiker-Avatare.',
      '⚡ Zero-Click Latenz: Raum- und Statusänderungen synchronisieren sich in Millisekunden auf alle Lehrer-Tablets und Tür-Kioske.',
      '🛡️ DSGVO-Konformität: Schülerdaten werden auf der Übersichtsebene mit datensparsamer Namensmaskierung angezeigt.'
    ],
    invariants: [
      'Profilbild-Doktrin: Nutzer der Verwaltung (Rollen `admin` und `secretary`) tragen verbindlich das Tafelbild.',
      'Dynamische Sichtbarkeit: Das Terminänderungen-Widget blendet sich bei 0 offenen Änderungen vollständig aus.'
    ],
    tags: ['schulleitung', 'sekretariat', 'briefing', 'betrieb', 'raumauslastung', 'kollegium', 'kollision']
  },
  {
    id: 'school-schedule-designer',
    tier: 'school_management',
    boardId: 'schedule',
    title: 'Intelligenter Stundenplan-Designer & Raum-Matrix',
    subtitle: 'Kollisionsfreie Planung, Raum-Engine, Kiosk-Türschilder-Sync und Drag & Drop für das ganze Schuljahr',
    badge: 'Stundenplan',
    category: 'core_boards',
    summary: 'Plane Einzel- und Gruppenunterrichte für das gesamte Schuljahr mit nativer Raumkollisionsprüfung, Matrix-Ansichten für Räume und Kollegium sowie automatischer Ferien-Berücksichtigung.',
    steps: [
      {
        title: '1. Schülerblock per Drag & Drop platzieren',
        desc: 'Ziehe den Schüler aus der linken Schülerleiste auf den gewünschten Wochentag, die Uhrzeit und die zugewiesene Lehrkraft.',
        actionLabel: 'Stundenplaner aufrufen',
        actionTarget: 'schedule'
      },
      {
        title: '2. Automatische Raumzuweisung & Konfliktprüfung',
        desc: 'Wähle den Unterrichtsraum. Die integrierte Raum-Engine blockiert Doppelbelegungen deterministisch und schlägt freie Ausweichräume vor.',
        actionLabel: 'Räume zuweisen',
        actionTarget: 'schedule'
      },
      {
        title: '3. Wöchentliche Serien duplizieren (Shortcut [D])',
        desc: 'Markiere einen Block und drücke [D], um die Unterrichtseinheit für das gesamte Schulhalbjahr wöchentlich fortlaufend anzulegen.',
        actionLabel: 'Serientermine prüfen',
        actionTarget: 'schedule'
      }
    ],
    proTips: [
      '📊 Raum-Matrix-Ansicht: Schalte auf die Spaltenansicht um, um alle Räume der Musikschule parallel nebeneinander im Zeitverlauf zu vergleichen.',
      '🏖️ Gesetzliche Schulferien: Feiertage und bewegliche Ferientage deines Bundeslands (DE, AT, CH) sind im Kalender hinterlegt – keine Fehlbuchungen in den Ferien.',
      '🚪 Kiosk-Türschilder-Kopplung: Jeder verschobene Block aktualisiert sekundenschnell das digitale Türschild vor Ort am Unterrichtsraum.'
    ],
    shortcuts: [
      { key: 'D', desc: 'Terminblock duplizieren' },
      { key: 'Esc', desc: 'Drag-Modus abbrechen' }
    ],
    invariants: [
      'Multi-Tenancy Doktrin: Jede Kalenderabfrage erzwingt strikt `school_id = get_current_user_school_id()`.',
      'Kollisions-Sperre: Die Datenbank verhindert physische Doppelbelegungen desselben Raumes.'
    ],
    tags: ['stundenplan', 'matrix', 'raumplaner', 'kollision', 'ferien', 'serientermine', 'duplizieren']
  },
  {
    id: 'school-rooms-kiosk-engine',
    tier: 'school_management',
    boardId: 'rooms',
    title: 'Raum-Engine, Ausstattung & Kiosk-Displays',
    subtitle: 'Räume organisieren, Instrumentenausstattung erfassen und digitale Türschilder latenzfrei koppeln',
    badge: 'Raum-Engine',
    category: 'core_boards',
    summary: 'Richte alle Unterrichtsräume deiner Musikschule ein: Erfasse Instrumente (Flügel, Drumset, Verstärker) und kopple kostengünstige Tablets vor Ort an den Türen als digitale Kiosk-Türschilder.',
    steps: [
      {
        title: '1. Räume mit Ausstattung anlegen',
        desc: 'Erstelle Räume mit Raumnummer, Raumname, Gebäude und Ausstattungsmerkmalen (z. B. 2x Flügel, PA-Anlage, Schallschutz).',
        actionLabel: 'Räume verwalten',
        actionTarget: 'rooms'
      },
      {
        title: '2. Kiosk-Display vor Ort an der Tür koppeln',
        desc: 'Öffne auf dem Tablet an der Tür die Plattform und klicke auf "Display koppeln". Gib den 6-stelligen Kopplungstoken ein – das Tablet wird sofort zum Türschild.',
        actionLabel: 'Token generieren',
        actionTarget: 'rooms'
      },
      {
        title: '3. Automatische Raumbelegungsanzeige überwachen',
        desc: 'Das Display zeigt die laufende Unterrichtsstunde, Lehrkraft, Fach und die nächsten Termine. Bei Raumwechseln synchronisiert sich die Anzeige in unter 500 ms.',
        actionLabel: 'Status prüfen',
        actionTarget: 'rooms'
      }
    ],
    proTips: [
      '🌙 Automatischer Nachtmodus: Nach Unterrichtsende schalten die Kiosk-Tablets automatisch in den Stromsparmodus mit abgedunkeltem Display.',
      '🔒 Geführter Zugriff (iOS/Android): Sperre das Tablet im Kiosk-Modus, sodass Schüler oder Besucher die Raumplan-App nicht verlassen können.',
      '🚪 Stationen für Band-Proben: Definiere im Raum spezielle Stationen (z. B. Drum-Station, Keys-Station) für strukturierte Ensemble-Proben.'
    ],
    invariants: [
      'Kiosk-Sicherheit: Kiosk-Tokens gewähren rein lesenden Zugriff auf den Raumplan des spezifischen Raums – keine administrativen Rechte.',
      'Hardware-Unabhängigkeit: Kiosk-Displays laufen auf jedem Standard-Tablet mit modernem Browser.'
    ],
    tags: ['raeume', 'kiosk', 'tuerschild', 'hardware', 'tablet', 'raumwechsel', 'ausstattung']
  },
  {
    id: 'school-teachers-team',
    tier: 'school_management',
    boardId: 'team',
    title: 'Kollegium, Lehrkräfte-Deputate & QR-Ausweise',
    subtitle: 'Lehrkräfte anlegen, Unterrichtsfächer zuweisen, Deputate verwalten und Zero-Mail-Zugänge ausgeben',
    badge: 'Kollegium',
    category: 'core_boards',
    summary: 'Verwalte das gesamte Lehrerkollegium: Lege Lehrkräfte mit Instrumentalfächern und Stundendeputaten an. Drucke QR-Ausweise für den sekundenschnellen Zero-Mail-Login am Unterrichtstag.',
    steps: [
      {
        title: '1. Neue Lehrkraft im Kollegium anlegen',
        desc: 'Gib Vor- und Nachnamen, E-Mail-Adresse und die Unterrichtsfächer (z. B. Klavier, Querflöte, Ensemble) ein.',
        actionLabel: 'Kollegium öffnen',
        actionTarget: 'team'
      },
      {
        title: '2. QR-Lehrerausweis ausdrucken & übergeben',
        desc: 'Drucke den Ausweis mit hochauflösendem QR-Code aus. Die Lehrkraft scannt den Code mit dem Smartphone oder iPad und ist in 1 Sekunde eingeloggt.',
        actionLabel: 'Ausweis drucken',
        actionTarget: 'team'
      },
      {
        title: '3. Schüler zuweisen & Deputat überwachen',
        desc: 'Weise der Lehrkraft Schüler und Unterrichtsstunden im Stundenplan zu. Das System berechnet das wöchentliche Stundendeputat automatisch.',
        actionLabel: 'Stundenplan öffnen',
        actionTarget: 'schedule'
      }
    ],
    proTips: [
      '🪪 Zero-Mail-Doktrin: Lehrkräfte benötigen keine Passwörter – der Scan des Ausweises ermöglicht sofortigen, sicheren Zugang.',
      '👥 Kostenlose Verwaltung: Benutzer mit den Rollen `admin` und `secretary` sind in der Plattform immer zu 100% inklusive (0,00 €).',
      '🎵 Musiker-Avatare: Lehrkräfte wählen ihren individuellen Musiker-Avatar für den Unterricht – die Identität begeistert Schüler ab Minute 1.'
    ],
    invariants: [
      'Service-Pauschale: Aktive Lehrkräfte und Administratoren werden mit transparenten 0,49 € / Mo. berechnet.',
      'DSGVO-Mitarbeiterschutz: Private Kontaktdaten von Lehrkräften werden niemals an Schüler oder Eltern herausgegeben.'
    ],
    tags: ['kollegium', 'lehrer', 'team', 'deputat', 'ausweis', 'passwortlos', 'servicepauschale'],
    pdfDownloadType: 'teacher_quickstart'
  },
  {
    id: 'school-students-onboarding',
    tier: 'school_management',
    boardId: 'students',
    title: 'Schülerverwaltung, Smart-CSV-Import & 1-Seiter Elternbrief',
    subtitle: 'DSGVO-konforme Aufnahme, Namensmaskierung, 1-Klick-Ausweisdruck und Eltern-Infoblätter (PDF)',
    badge: 'Schüler',
    category: 'core_boards',
    summary: 'Effiziente Schülerverwaltung für Musikschulen: Nimm Schüler einzeln auf oder importiere ganze Klassenlisten per Smart-CSV. Drucke 1-Seiter-Elternbriefe und Schülerausweise im Sammeldruck auf DIN-A4-Bögen.',
    steps: [
      {
        title: '1. Schüler einzeln anlegen oder per Smart-CSV importieren',
        desc: 'Lade deine Schülerliste als Excel/CSV hoch. Das System trennt Vornamen und Nachnamen automatisch und prüft auf Dubletten.',
        actionLabel: 'Schülerliste aufrufen',
        actionTarget: 'students'
      },
      {
        title: '2. Druckfertigen 1-Seiter Elternbrief generieren',
        desc: 'Klicke auf "Eltern-Infoblatt (PDF)". Der druckfertige DIN-A4-1-Seiter mit Schullogo und QR-Code erklärt Eltern die Nutzung ohne Passwort-Registrierung.',
        actionLabel: 'Elternbrief herunterladen',
        actionTarget: 'students'
      },
      {
        title: '3. Schülerausweise im Sammeldruck ausgeben',
        desc: 'Drucke ganze Ausweisbögen (8 Ausweise pro A4-Seite) für den Schuljahresstart aus und lege sie den Begrüßungsmappen bei.',
        actionLabel: 'Sammeldruck starten',
        actionTarget: 'students'
      }
    ],
    proTips: [
      '🛡️ Automatische Namensmaskierung: Zum Schutz von Minderjährigen werden Schülernamen im System als "Vorname + Nachname-Initial" (z. B. "Max M.") geführt.',
      '🆓 100% kostenlose Karteileichen: Inaktive Schüler in der Kartei verursachen 0,00 € Kosten – abgerechnet werden nur aktiv genutzte Profile.',
      '📲 Apple Wallet Pass: Schüler und Eltern können den Campus-Pass mit 1 Fingertipp direkt in die Apple/Google Wallet auf dem Smartphone laden.'
    ],
    invariants: [
      'Zero-Registration Doktrin: Schüler und Eltern müssen niemals Passwörter anlegen oder persönliche E-Mail-Adressen registrieren.',
      'Absolute Datenminimierung: Keine Speicherung von Bank- oder SEPA-Daten der Eltern in der Plattform-Datenbank.'
    ],
    tags: ['schueler', 'aufnahme', 'smart csv', 'elternbrief', 'ausweis', 'sammeldruck', 'dsgvo', 'namensmaskierung'],
    pdfDownloadType: 'parent_quickstart'
  },
  {
    id: 'school-finops-b2b-billing',
    tier: 'school_management',
    boardId: 'billing',
    title: 'B2B-Infrastruktur-Rechnungen & FinOps-Transparenz',
    subtitle: 'Reine Cloud- und Bereitstellungskosten statt teurer Software-Lizenzen (0,00 € Lizenzgebühr)',
    badge: 'FinOps',
    category: 'finops_compliance',
    summary: 'Verstehe die monatliche B2B-Infrastruktur-Abrechnung deiner Musikschule: Keine Lizenzkaufgebühren (0,00 € inklusive), transparente Bereitstellungspauschalen und automatische Kostendeckung bei Eltern-Direktabrechnung.',
    steps: [
      {
        title: '1. Kanonische Nomenklatur auf der Monatsrechnung prüfen',
        desc: 'Rechnungspositionen: 1. Software-Bereitstellung (0,00 €) ➔ 2. Hosting Campus (14,90 €) ➔ 3. Hosting GrooveLab (9,90 €) ➔ 4. Kombi-Vorteil (-4,90 €) ➔ 5. Service (0,49 €) ➔ 6. Basis-Bereitstellung (0,09 €).',
        actionLabel: 'Rechnungen einsehen',
        actionTarget: 'billing'
      },
      {
        title: '2. Inaktive Schülerkarteien kostenfrei halten',
        desc: 'Nur Schüler, die sich aktiv einloggen und Hausaufgaben nutzen, lösen eine Aktivierungsgebühr aus. Inaktive Profile in der Datenbank kosten 0,00 €.',
        actionLabel: 'Schülerstatus prüfen',
        actionTarget: 'students'
      },
      {
        title: '3. Eltern-Direktabrechnung zur vollständigen Entlastung',
        desc: 'Wird Direktabrechnung für Campus vereinbart, zahlen Eltern den Jahresbeitrag von maximal 5,39 € / Schuljahr (CHF 11.00 / Schuljahr; 1. Monat 100% kostenfrei). Die Schule zahlt für diese Schüler 0,00 €.',
        actionLabel: 'Tarife einsehen',
        actionTarget: 'billing'
      }
    ],
    proTips: [
      '🎸 GrooveLab-Aktivierungen: Werden immer zu 100% von der Musikschule als Sammelzahler übernommen – Eltern zahlen dafür niemals.',
      '📄 Rechnungs-PDFs für Kämmerei & Schulträger: Lade GoBD-konforme Rechnungs-PDFs mit Rechnungsnummer `RE-[SCHOOL_ID]-[YYMM]-01` mit 1 Klick herunter.',
      '🎁 Kombi-Vorteil: Nutzt deine Schule Campus und GrooveLab, spart das Kombi-Bundle monatlich 4,90 € auf das Grund-Hosting.'
    ],
    invariants: [
      'Verbotene Begriffe: Niemals "Lizenz", "Schüler-Lizenz" oder "Karteileichen-Gebühr" verwenden – es handelt sich um reine Cloud-Infrastruktur.',
      'Rechnungsnummer-Standard: Musikschulrechnungen lauten verbindlich immer `RE-[SCHOOL_ID]-[YYMM]-01`.'
    ],
    tags: ['rechnung', 'finops', 'kosten', 'infrastruktur', 'b2b', 'elternbeitrag', 'kombivorteil', 'gobd']
  },
  {
    id: 'school-profile-settings',
    tier: 'school_management',
    boardId: 'setup',
    title: 'Musikschulprofil, Standorte & Geofencing',
    subtitle: 'Schulname, Adresse, Schulfarbe (Branding), Öffnungszeiten und Bankverbindung konfigurieren',
    badge: 'Schulprofil',
    category: 'core_boards',
    summary: 'Richte das Profil deiner Musikschule ein: Hinterlege offizielle Adressdaten, passe die Schulfarbe (Brand Color) an und lade das Schullogo für alle ausgedruckten Elternbriefe und Schülerausweise hoch.',
    steps: [
      {
        title: '1. Stammdaten & Schullogo hochladen',
        desc: 'Lade dein Musikschul-Wappen oder Schullogo hoch. Es wird automatisch im Briefing, auf Urkunden und auf allen Eltern-PDFs eingebunden.',
        actionLabel: 'Schulprofil öffnen',
        actionTarget: 'setup'
      },
      {
        title: '2. Schulfarbe & Branding-Akzente wählen',
        desc: 'Definiere den primären HEX-Farbwert deiner Musikschule. Das Interface übernimmt diese Farbe für Akzente und Kacheln.',
        actionLabel: 'Design anpassen',
        actionTarget: 'setup'
      },
      {
        title: '3. Bankverbindung & IBAN für Eltern-Überweisungen',
        desc: 'Hinterlege die IBAN der Musikschule für B2C-Schüler-Jahresbeiträge bei vereinbarter Eltern-Direktabrechnung.',
        actionLabel: 'Bankdaten eintragen',
        actionTarget: 'setup'
      }
    ],
    proTips: [
      '📍 Geofencing & Standorte: Trage die Adressen aller Unterrichtsgebäude ein, um Kiosk-Displays und Raum-Engines präzise zuzuordnen.',
      '🕒 Öffnungszeiten-Automatik: Kiosk-Türschilder schalten sich passgenau zu den Öffnungszeiten deiner Gebäude ein und aus.',
      '🧾 Transparenz auf Elternbriefen: Die hinterlegte IBAN und Schuladresse erscheinen automatisch im Fußbereich aller generierten Infoblätter.'
    ],
    invariants: [
      'Zero-Leakage: Bank- und Kontodaten der Musikschule werden verschlüsselt gespeichert und nur auf offiziellen Infoblättern ausgegeben.',
      'Brand-Integrität: Die Kernfarben Grün (#34a853), Gelb (#eab308) und Rot (#ea4335) bleiben für Modul-Logiken geschützt.'
    ],
    tags: ['profil', 'logo', 'branding', 'schulfarbe', 'iban', 'geofencing', 'oeffnungszeiten', 'standorte']
  },
  {
    id: 'school-groovelab-admin',
    tier: 'school_management',
    boardId: 'bands',
    title: 'GrooveLab Modul-Administration & Band-Netzwerk',
    subtitle: 'Ensembles überwachen, Schul-Repertoire verwalten und Live-Lab Stationen steuern',
    badge: 'GrooveLab',
    category: 'core_boards',
    summary: 'Die Ensemble- und Band-Zentrale für Schulleitung und Fachbereichsleiter: Sieh alle aktiven Bands deiner Schule, weise Coaches zu und pflege das Schul-Repertoire an Chords, Leadsheets und Play-Alongs.',
    steps: [
      {
        title: '1. Band-Netzwerk der Musikschule öffnen',
        desc: 'Im gelben GrooveLab-Reiter siehst du alle bestehenden Bands mit ihrer Besetzung und den zuständigen Ensemble-Coaches.',
        actionLabel: 'Bands verwalten',
        actionTarget: 'bands'
      },
      {
        title: '2. Schul-Song-Bibliothek & Repertoire erweitern',
        desc: 'Stelle Songs, Chords und Playalongs in der zentralen Schul-Bibliothek bereit. Alle Bands deiner Schule greifen darauf zu.',
        actionLabel: 'Song-Katalog öffnen',
        actionTarget: 'bands'
      },
      {
        title: '3. Proberaum-Stationen & Kioske konfigurieren',
        desc: 'Richte digitale Instrumenten-Stationen für Live-Bandproben in den Proberäumen deiner Musikschule ein.',
        actionLabel: 'Stationen einrichten',
        actionTarget: 'rooms'
      }
    ],
    proTips: [
      '🟡 Gelbes Marken-Erlebnis: Im GrooveLab-Modul wechseln Buttons und Akzente auf das leuchtende Gelb (#eab308).',
      '🏛️ Neutrales Tafelbild: Schulleitung und Sekretariat tragen auch im GrooveLab das professionelle Tafelbild – keine Musiker-Avatare.',
      '🎤 Konzert-Setlists: Verfolge, welche Songs von wie vielen Ensembles bühnenreif geprobt wurden, um das nächste Schulfestival zu planen.'
    ],
    invariants: [
      'Kosten-Axiom: GrooveLab-Aktivierungen werden verbindlich immer zu 100% von der Musikschule als Sammelzahler übernommen.',
      'Revisionssicherheit: Song-Lizenzen und GEMA-Freigaben können im Dokumenten-Tresor des Moduls hinterlegt werden.'
    ],
    tags: ['groovelab', 'bands', 'repertoire', 'stationen', 'ensemble', 'kiosk', 'proberaum', 'festival']
  },

  // ══════════════════════════════════════════════════════════════════════════════════
  // STUFE 3: LEHRKRÄFTE (UNTERRICHT & PÄDAGOGIK)
  // ══════════════════════════════════════════════════════════════════════════════════
  {
    id: 'teacher-briefing',
    tier: 'teacher',
    boardId: 'briefing',
    title: 'Tages-Briefing & Chronologische Schüler-Timeline',
    subtitle: 'Tagesplan auf einen Blick, Raumwechsel-Radar, Anwesenheit erfassen und Quick-Notizen',
    badge: 'Briefing',
    category: 'quickstart',
    summary: 'Dein reibungsloser Start in den Unterrichtstag: Öffne dein Briefing und sieh sofort alle Unterrichtseinheiten chronologisch sortiert, erkenne Raumverlegungen im Voraus und erfasse Anwesenheiten mit 1 Klick.',
    steps: [
      {
        title: '1. Tages-Timeline überfliegen & Raumwechsel prüfen',
        desc: 'Dein Tagesplan sortiert alle Schüler minutengenau. Bei kurzfristigen Raumkonflikten warnt dich das rote Raum-Radar sofort im Kopfbereich.',
        actionLabel: 'Briefing öffnen',
        actionTarget: 'briefing'
      },
      {
        title: '2. Anwesenheit mit 1 Klick dokumentieren',
        desc: 'Tippe beim Schüler auf den Status-Button: Grün (Anwesend), Gelb (Entschuldigt) oder Rot (Unentschuldigt). Das System speichert die Anwesenheit GoBD-konform.',
        actionLabel: 'Timeline prüfen',
        actionTarget: 'briefing'
      },
      {
        title: '3. Schüler-Akte für den Unterricht aufschlagen',
        desc: 'Klicke direkt auf die Schüler-Kachel, um das Hausaufgabenheft, die Notenbuchseiten der Vorwoche und offene Fragen des Schülers aufzurufen.',
        actionLabel: 'Schüler-Akte öffnen',
        actionTarget: 'homework_book'
      }
    ],
    proTips: [
      '📲 PWA auf iPad/Tablet: Speichere Campus-Groovelab über Safari auf dem Home-Bildschirm. Die App startet im Vollbild ohne störende Browserleisten.',
      '🔔 Offene Schülerfragen: Hat ein Schüler zu Hause eine Frage per Sprach-Diktat gestellt, leuchtet an seinem Termin ein gelbes Frage-Badge auf.',
      '☕ Freistunden-Erkennung: Pausen und Freiblöcke werden automatisch visualisiert, damit du Vorbereitungszeit optimal nutzen kannst.'
    ],
    invariants: [
      'Datenschutz-Transparenz: Lehrkräfte werden mit vollem Vor- und Nachnamen geführt, Schüler im Dashboard kindgerecht anonymisiert.',
      'Echtzeit-Synchronität: Statusänderungen der Anwesenheit sind sofort für das Sekretariat einsehbar.'
    ],
    tags: ['lehrer', 'briefing', 'timeline', 'tagesplan', 'anwesenheit', 'raumwechsel', 'unterricht'],
    pdfDownloadType: 'teacher_quickstart'
  },
  {
    id: 'teacher-homework-book',
    tier: 'teacher',
    boardId: 'homework_book',
    title: 'Schüler-Protokoll & Hausaufgabenheft (Goldstandard-Blaupause)',
    subtitle: 'Notenbücher zuweisen, Seiten eintragen, Schülerfragen auflösen und Notizen diktieren',
    badge: 'Protokoll',
    category: 'core_boards',
    summary: 'Dokumentiere den Unterricht in Sekundenschnelle nach dem Monolith-Goldstandard: Reinweiße Schülervorschau oben, matte Werkzeugbank mit Notenbuch-Katalog darunter und integriertes Schülerfragen-Management.',
    steps: [
      {
        title: '1. Notenbuch & Buchseiten auswählen',
        desc: 'Wähle das Lehrwerk aus der Schulbibliothek und trage die Seitenzahlen (z. B. "S. 14–16") ein. Die App erzeugt automatisch die grüne Buch-Pille für den Schüler.',
        actionLabel: 'Lehrwerk wählen',
        actionTarget: 'homework_book'
      },
      {
        title: '2. Wochenziele & Hausaufgabe eintragen oder diktieren',
        desc: 'Schreibe präzise Takthinweise in die Werkzeugbank oder nutze die Mikrofon-Diktierfunktion. Die Schülervorschau rendert den Text live in Magazin-Typografie.',
        actionLabel: 'Notizen erfassen',
        actionTarget: 'homework_book'
      },
      {
        title: '3. Schülerfragen beantworten & als besprochen markieren',
        desc: 'Sieh die vom Schüler zu Hause notierte Frage („Welchen Fingersatz spielen?“). Klicke nach der Klärung auf "Im Unterricht besprochen", um sie als erledigt abzuhaken.',
        actionLabel: 'Frage prüfen',
        actionTarget: 'homework_book'
      }
    ],
    proTips: [
      '🔄 Fortlaufender Wochenplan: Noch nicht vollendete Aufgaben kannst du mit 1 Klick aus der Vorwoche übernehmen – kein doppeltes Tippen.',
      '🔒 Private Lehrernotizen: Notizen im gelben Reiter "Nur für Lehrkraft" sind für Schüler und Eltern unsichtbar – perfekt für pädagogische Zwischenbemerkungen.',
      '🌙 Nachtruhe-Schutz: Einträge nach 20:00 Uhr werden im Silent-Modus gespeichert und erreichen den Schüler erst morgens ab 07:00 Uhr.'
    ],
    invariants: [
      'Master-Blaupause: Die Schülervorschau im Lehrer-Dashboard ist pixelgenau identisch mit der Live-Schülersicht auf dem Smartphone.',
      'Universal Uniformity: Alle Formatierungen und Buchcover-Badges folgen plattformweit dem gleichen Standard.'
    ],
    tags: ['hausaufgaben', 'protokoll', 'lehrwerk', 'seiten', 'werkzeugbank', 'schuelerfrage', 'notizen', 'diktat']
  },
  {
    id: 'teacher-playalong-studio',
    tier: 'teacher',
    boardId: 'recordings',
    title: 'Play-Along Studio & Audio-Tresor',
    subtitle: 'Kristallklare Unterrichtsaufnahmen bis 7 Min., Vorzähler-Beeps, EBU R128 Mastering und Loop-Bereitstellung',
    badge: 'Audio-Studio',
    category: 'audio_studio',
    summary: 'Nimm im Unterricht Hörbeispiele, Playalongs oder Klavierbegleitungen mit 1 Klick auf. Das System pegelt den Sound automatisch nach Studio-Standard (-14 LUFS) ein und hängt die Aufnahme direkt an die Hausaufgabe an.',
    steps: [
      {
        title: '1. Aufnahme-Modus im Protokoll aufrufen',
        desc: 'Tippe im Schüler-Protokoll auf das Mikrofon-Symbol. Dein Eingangspegel wird visuell kalibriert.',
        actionLabel: 'Studio öffnen',
        actionTarget: 'recordings'
      },
      {
        title: '2. Take mit akustischem 4-Beat Einzähler aufnehmen',
        desc: 'Drücke auf Aufnahme. Der präzise WebAudio-Vorzähler zählt dich ein. Spiele das Stück oder die Begleitung bis zu 7 Minuten lang ein.',
        actionLabel: 'Aufnahme testen',
        actionTarget: 'recordings'
      },
      {
        title: '3. Pädagogischen Typ wählen & bereitstellen',
        desc: 'Tagge die Aufnahme als 🐢 Langsam (Übetempo), 🚀 Original, 🥁 Beat oder 🎸 Playalong. Der Schüler findet sie sofort auf der linken Seite seines Aufgabenhefts.',
        actionLabel: 'Take speichern',
        actionTarget: 'recordings'
      }
    ],
    proTips: [
      '🎛️ EBU R128 Mastering: Jede Aufnahme wird automatisch mit Studio-Peak-Limiter und -14 LUFS gemastert – keine übersteuerten oder zu leisen Aufnahmen mehr.',
      '✂️ Waveform Trim: Schneide die Stille vor dem Einsatz mit den Schnitt-Markern direkt im Browser weg.',
      '🔂 Loop-Kompatibilität: Saubere 4- oder 8-Takt-Takes können vom Schüler zu Hause nahtlos in der Loopstation als Endlos-Schleife abgespielt werden.'
    ],
    invariants: [
      'Symmetrie-Doktrin: Lehreraufnahmen stehen beim Schüler verbindlich auf der linken Seite, eigene Schüler-Takes auf der rechten Seite.',
      'Datensicherheit: Aufnahmen liegen verschlüsselt im schuleigenen Audio-Tresor mit zeitlich signierten Token-URLs.'
    ],
    tags: ['audio', 'tresor', 'playalong', 'aufnahme', 'begleitung', 'mastering', 'lufs', 'waveform', 'trim']
  },
  {
    id: 'teacher-students',
    tier: 'teacher',
    boardId: 'students',
    title: 'Schüler-Roster & Pädagogische Entwicklungs-Historie',
    subtitle: 'Schülerprofile, Streak-Monitoring, Meisterwerk-Urkunden verleihen und QR-Ausweise drucken',
    badge: 'Schüler',
    category: 'core_boards',
    summary: 'Behalte den Lernfortschritt all deiner Schüler im Blick: Sieh, wer fleißig geübt hat, verleihe offizielle Meisterwerk-Urkunden und drucke bei Verlust sofort einen neuen Campus-Pass aus.',
    steps: [
      {
        title: '1. Schüler-Roster filtern & auswählen',
        desc: 'Öffne die Schüler-Verwaltung. Filtere nach Unterrichtstag, Instrument oder Namen. Die Kachel zeigt sofort die aktive Übe-Flamme (Streak).',
        actionLabel: 'Schülerliste aufrufen',
        actionTarget: 'students'
      },
      {
        title: '2. Didaktischen Verlauf & Übe-Protokoll prüfen',
        desc: 'Klicke auf das Schülerprofil. Sieh die Minuten-Historie der letzten Wochen, gemeisterte Stücke und bisherige Lehrwerke.',
        actionLabel: 'Profil einsehen',
        actionTarget: 'students'
      },
      {
        title: '3. Meisterwerk-Urkunde mit 1 Klick verleihen',
        desc: 'Hat der Schüler ein Stück bühnenreif gemeistert? Klicke auf "Meisterwerk bestätigen". Das System generiert sofort die offizielle Musikschul-Urkunde für seinen Tresor.',
        actionLabel: 'Urkunde verleihen',
        actionTarget: 'homework_book'
      }
    ],
    proTips: [
      '🪪 Ersatz-Campus-Pass in 5 Sekunden: Schüler hat den Pass vergessen? Klicke im Profil auf "Ausweis drucken" – der schlüsselfertige QR-Pass druckt sofort auf jedem Standard-Drucker.',
      '🔥 Streaks im Unterricht loben: Schüler mit aktiver Flamme (z. B. 14 Tage) sind nachweislich motivierter – ein kurzes Lob am Stundenbeginn verstärkt den Lerneffekt.',
      '🛡️ DSGVO-Konformität: Im Lehrer-Dashboard werden Schülernachnamen zum Schutz der Privatsphäre standardmäßig als Initiale (z. B. "Linus M.") maskiert.'
    ],
    invariants: [
      'Tenancy-Schutz: Lehrkräfte sehen ausschließlich Schüler, die ihnen durch das Sekretariat oder die Schulleitung aktiv zugewiesen wurden.',
      'Keine Vertragsdaten: Lehrkräfte haben niemals Zugriff auf private Bankverbindungen, SEPA-Mandate oder Rechnungsdaten der Eltern.'
    ],
    tags: ['schueler', 'roster', 'fortschritt', 'streaks', 'ausweis', 'pass', 'urkunde', 'meisterwerk']
  },
  {
    id: 'teacher-schedule',
    tier: 'teacher',
    boardId: 'schedule',
    title: 'Stundenplan-Designer, Raum-Engine & Termine',
    subtitle: 'Wochenkalender, Raumbelegungs-Check, Ferien-Synchronisation und flexible Ausweichtermine',
    badge: 'Stundenplan',
    category: 'core_boards',
    summary: 'Dein intelligenter Wochen-Terminplaner: Sieh all deine Schülerblöcke, Raumzuweisungen und Ferienzeiten. Die Raum-Engine verhindert Doppelbelegungen und warnt dich vor Raumkonflikten.',
    steps: [
      {
        title: '1. Wochenkalender aufrufen',
        desc: 'Der Stundenplan zeigt deine Unterrichtstage übersichtlich in Spalten. Jeder Schülerblock enthält Uhrzeit, Schülername, Fach und Raumnummer.',
        actionLabel: 'Stundenplan öffnen',
        actionTarget: 'schedule'
      },
      {
        title: '2. Raumbelegung & Raumwechsel kontrollieren',
        desc: 'Tippe auf einen Unterrichtsblock, um die Raumdetails einzusehen. Die Raum-Engine prüft im Hintergrund, ob der Raum frei ist.',
        actionLabel: 'Räume prüfen',
        actionTarget: 'schedule'
      },
      {
        title: '3. Ausweichtermine & Nachholstunden ansetzen',
        desc: 'Muss ein Schüler verschieben? Ziehe den Block per Drag & Drop auf einen freien Slot oder wähle einen Ausweichraum.',
        actionLabel: 'Termin bearbeiten',
        actionTarget: 'schedule'
      }
    ],
    proTips: [
      '🚪 Kiosk-Türschilder-Sync: Jede Termin- oder Raumänderung im Stundenplan wird in Echtzeit auf den digitalen Kiosk-Türschildern der Musikschule aktualisiert.',
      '🏖️ Automatische Ferien-Engine: Gesetzliche Schulferien und Feiertage deines Bundeslands (DE, AT, CH) sind fest im Kalender hinterlegt.',
      '⚡ Notenständer-Modus (Vergrößern): Aktiviere "Vergrößern" in der Menüleiste, um deinen Stundenplan auch aus 1–2 Metern Entfernung auf dem Klavierpult lesen zu können.'
    ],
    invariants: [
      'Default-Deny Raum-Engine: Eine Doppelbelegung desselben Raums zur selben Minute wird serverseitig mit einem Konflikt-Fehler blockiert.',
      'Multi-Tenancy: Termine sind strikt auf die eigene Schule (`school_id`) begrenzt.'
    ],
    tags: ['stundenplan', 'kalender', 'raum', 'raumplaner', 'termine', 'ferien', 'nachholstunde']
  },
  {
    id: 'teacher-shouts',
    tier: 'teacher',
    boardId: 'shouts',
    title: 'Notfall-Chat & Shouts (§ 8a SGB VIII Kinderschutz)',
    subtitle: 'Rechtssichere 1:1 Kurzmitteilungen direkt am Termin – ohne WhatsApp und ohne private Telefonnummern',
    badge: 'Shouts',
    category: 'core_boards',
    summary: 'Sichere, DSGVO- und kinderschutzkonforme Kommunikation mit Schülern und Eltern: Sende kurze organisatorische Mitteilungen direkt zum Unterrichtstermin – deine private Handynummer bleibt zu 100% geschützt.',
    steps: [
      {
        title: '1. Shoutbox am Termin öffnen',
        desc: 'Klicke in deiner Tages-Timeline oder im Stundenplan auf die Sprechblase des Termins.',
        actionLabel: 'Timeline öffnen',
        actionTarget: 'briefing'
      },
      {
        title: '2. Kurznachricht verfassen & absenden',
        desc: 'Tippe deine Notiz (z. B. "Bitte Notenheft Band 2 mitbringen" oder "Unterricht beginnt heute 10 Minuten später in Raum 104").',
        actionLabel: 'Nachricht schreiben',
        actionTarget: 'briefing'
      },
      {
        title: '3. Schüler & Eltern erhalten Push-Mitteilung',
        desc: 'Die Nachricht erscheint sofort hervorgehoben auf der Schüler-Startseite und wird bei aktivierten Eltern-Benachrichtigungen zugestellt.',
        actionLabel: 'Status prüfen',
        actionTarget: 'briefing'
      }
    ],
    proTips: [
      '🛡️ Privatsphäre-Garantie: Nie wieder WhatsApp-Nachrichten am Sonntagabend – alle Mitteilungen sind an den Unterrichtskontext gebunden.',
      '🌙 Nachtruhe aktiv: Zwischen 20:00 Uhr und 07:00 Uhr werden keine Push-Töne ausgelöst, um die Nachtruhe von Familien und Lehrkräften zu respektieren.',
      '📋 Lesebestätigung: Du siehst mit einem dezenten Häkchen, ob die Eltern oder der Schüler die Notiz geöffnet haben.'
    ],
    invariants: [
      'Kinderschutz nach § 8a SGB VIII: Alle Nachrichten werden revisionssicher im pädagogischen Kontext der Musikschule archiviert.',
      'Zero-Secret-Leakage: Weder Telefonnummern noch private E-Mail-Adressen werden im Chat-Header übertragen.'
    ],
    tags: ['shouts', 'chat', 'kinderschutz', 'sgb viii', 'nachrichten', 'termine', 'dsgvo', 'notfall']
  },
  {
    id: 'teacher-groovelab-bands',
    tier: 'teacher',
    boardId: 'bands',
    title: 'GrooveLab Bands, Repertoire & Skill-Radar',
    subtitle: 'Ensemble-Coaching, Songs aus der Bibliothek zuweisen, Chords bearbeiten und Skill-Radar bewerten',
    badge: 'GrooveLab',
    category: 'core_boards',
    summary: 'Das gelbe Band- und Ensemble-Modul für Lehrkräfte: Gründe Schülerbands, weise Stücke aus dem Song-Katalog zu, transponiere Akkorde und verfolge den Probenfortschritt im interaktiven 5-Achsen Skill-Radar.',
    steps: [
      {
        title: '1. Band zusammenstellen & Rollen verteilen',
        desc: 'Öffne das gelbe GrooveLab-Modul. Erstelle eine neue Band und teile Schüler für Lead-Gitarre, Bass, Drums, Keys und Gesang ein.',
        actionLabel: 'Bands verwalten',
        actionTarget: 'bands'
      },
      {
        title: '2. Songs aus dem Repertoire-Katalog zuweisen',
        desc: 'Wähle Songs aus der Bibliothek (z. B. Rock, Pop, Jazz). Die Schüler erhalten automatisch Zugriff auf Songtexte, Griffbilder und Playalongs in ihrem Band-Room.',
        actionLabel: 'Song-Katalog öffnen',
        actionTarget: 'bands'
      },
      {
        title: '3. Band-Probe im Skill-Radar bewerten',
        desc: 'Bewerte nach der Probe die 5 Dimensionen (Rhythmus, Timing, Dynamik, Ausdruck, Zusammenspiel). Das Skill-Radar zeigt der Band ihren gemeinsamen Fortschritt.',
        actionLabel: 'Skill-Radar bewerten',
        actionTarget: 'bands'
      }
    ],
    proTips: [
      '🟡 Gelbes Marken-Design: Im GrooveLab-Modul schalten alle Buttons auf Gelb (#eab308) – perfekte visuelle Orientierung.',
      '🎸 Chords & Transposition: Ändere die Tonart eines Songs im Handumdrehen, damit die Tonlage perfekt zur Stimme deines Sängers passt.',
      '🎤 Setlist für Konzerte: Markiere fertige Songs als "Bühnenreif", um die Setlist für das Musikschul-Konzert automatisch zusammenzustellen.'
    ],
    invariants: [
      'Sammelzahler-Doktrin: GrooveLab-Aktivierungen werden ausnahmslos zu 100% von der Musikschule übernommen – Eltern zahlen dafür niemals.',
      'Avatar-Freigabe: Musiker- und Geist-Avatare sind exklusiv für Schüler und Lehrkräfte im GrooveLab-Modul freigeschaltet.'
    ],
    tags: ['groovelab', 'bands', 'repertoire', 'songs', 'skillradar', 'ensemble', 'chords', 'setlist', 'buehne']
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
    summary: 'Dein barrierefreier Einstieg in Campus-Groovelab: Scanne einfach deinen QR-Code auf dem Campus-Pass oder gib deine 5-stellige PIN ein. Du siehst sofort deine nächste Unterrichtsstunde, den Raum, aktuelle Vertretungen und wichtige Notizen deiner Lehrkraft.',
    steps: [
      {
        title: '1. Campus-Pass bereitstellen & in Apple/Google Wallet laden',
        desc: 'Dein Campus-Pass ist deine Eintrittskarte: Drucke ihn aus, lege ihn in den Notenhefter oder speichere ihn mit 1 Klick direkt in deiner Apple Wallet bzw. Google Wallet für blitzschnellen Check-in am Instrument.',
        actionLabel: 'Pass im Wallet speichern',
        actionTarget: 'briefing'
      },
      {
        title: '2. QR-Code mit Smartphone scannen oder PIN eingeben',
        desc: 'Öffne die Kamera deines Handys oder Tablets und halte sie auf den QR-Code. Alternativ reicht dein Geburtstag (Tag 1–31) als kinderleichte 2FA-PIN. Du bist sofort ohne Passwort eingeloggt.',
        actionLabel: 'Zum Briefing',
        actionTarget: 'briefing'
      },
      {
        title: '3. Nächste Stunde, Raum & Mitteilungen prüfen',
        desc: 'Auf deiner Startseite siehst du auf einen Blick: Wann beginnt der Unterricht, in welchem Raum findest du deine Lehrkraft und gibt es aktuelle Terminänderungen oder Vorab-Notizen?',
        actionLabel: 'Tages-Briefing ansehen',
        actionTarget: 'briefing'
      }
    ],
    proTips: [
      '📲 App auf Home-Bildschirm speichern (PWA): Tippe im Safari-Browser auf "Teilen" ➔ "Zum Home-Bildschirm". Campus-Groovelab startet dann im Vollbild ohne störende Browserleisten wie eine native iOS-App.',
      '👨‍👩‍👧‍👦 Familien-Multi-Pass: Geschwister an derselben Musikschule? Die App merkt sich alle Pässe auf einem Gerät – ihr könnt mit 1 Klick oben rechts zwischen den Schülerprofilen wechseln.',
      '🛡️ Offline-Sicherheit & Ersatz-Pass: Der Stundenplan bleibt auch ohne Internetverbindung im Offline-Cache gespeichert. Hast du den Pass vergessen, druckt deine Lehrkraft in 5 Sekunden einen neuen aus.'
    ],
    invariants: [
      'Zero-Knowledge & Kinderschutz: Es werden niemals E-Mail-Adressen, Kreditkarten oder Telefonnummern von Schülern erhoben.',
      'Garantierte Kostenfreiheit: Die QR-Landingpage und das Tages-Briefing sind für Schüler und Eltern zu 100% kostenfrei.'
    ],
    tags: ['schüler', 'campus pass', 'login', 'qr code', 'pin', 'wallet', 'apple wallet', 'ohne passwort', 'briefing', 'pwa'],
    pdfDownloadType: 'parent_quickstart'
  },
  {
    id: 'student-homework-book',
    tier: 'student',
    boardId: 'homework_book',
    title: 'Digitales Aufgabenheft: Wochen-Fahrplan & Playalong',
    subtitle: 'Buchseiten, Lehreraufnahmen, Tempo-Drossel und Sprach-Fragen für den Unterricht',
    badge: 'Aufgaben',
    category: 'core_boards',
    summary: 'Keine verlorenen Zettel mehr: In deinem Aufgabenheft findest du genau die Seiten deines Notenbuchs, kannst dir Notizen mit 1 Fingertipp vorlesen lassen, das Tempo zum Üben drosseln und Fragen direkt per Sprache an deine Lehrkraft einsprechen.',
    steps: [
      {
        title: '1. Noten-Buchseiten & Wochen-Fahrplan erfassen',
        desc: 'Die grünen Pillen (z. B. "S. 1–3") zeigen dir genau die Seiten im Notenbuch. Die Notizen deiner Lehrkraft erklären dir präzise, worauf du bei den Takten und Griffen achten sollst.',
        actionLabel: 'Aufgaben ansehen',
        actionTarget: 'homework_book'
      },
      {
        title: '2. Notizen mit 1 Fingertipp vorlesen lassen',
        desc: 'Tippe oben rechts auf "Vorlesen", wenn du am Instrument sitzt oder noch nicht flüssig liest. Deine Aufgaben werden dir sofort in natürlicher, ruhiger Stimme vorgelesen.',
        actionLabel: 'Vorlesen testen',
        actionTarget: 'homework_book'
      },
      {
        title: '3. Mit Tempo-Drossel (50% / 75%) & 4-Takte-Pause mitspielen',
        desc: 'Tippe auf den grünen Play-Button deiner Lehreraufnahme. Ist der Lauf zu schnell? Schalte die Tempo-Drossel auf 50% oder 75%. Die 4-Takte-Pause gibt dir Zeit, die Hände in Anschlagsposition zu bringen.',
        actionLabel: 'Aufnahme abspielen',
        actionTarget: 'homework_book'
      },
      {
        title: '4. Frage für den Unterricht per Mikrofon einsprechen',
        desc: 'Unsicher beim Fingersatz oder Rhythmus? Tippe auf "Frage an Lehrkraft" und sprich deine Frage einfach über das Mikrofon ein (oder tippe sie ein). Deine Lehrkraft sieht deine Frage automatisch zu Beginn der nächsten Stunde.',
        actionLabel: 'Frage notieren',
        actionTarget: 'homework_book'
      }
    ],
    proTips: [
      '🔄 Fortlaufender Übeplan: Aufgaben, die du noch nicht ganz fehlerfrei beherrschst, wandern automatisch als Übertrag in die Folgewoche mit – kein Druck, nichts geht verloren.',
      '🌙 Gesunde Nachtruhe (Digital Detox): Das Aufgabenheft schützt dich und deine Familie ab 20:00 Uhr vor störenden Benachrichtigungen und Tönen bis 07:00 Uhr morgens.',
      '🎛️ Apple Notenständer-Modus (Vergrößern): Steht dein Tablet weiter weg auf dem Notenständer? Klicke auf "Vergrößern", um extragroße Schrift und Touch-Ziele für 60–90 cm Spielabstand zu aktivieren.'
    ],
    invariants: [
      'Symmetrie der Aufnahmen: Aufnahmen deiner Lehrkraft stehen strikt links im Aufgabenheft, deine privaten Studio-Aufnahmen rechts.',
      'Datensparsamkeit: Gesprochene Schülerfragen werden direkt im Browser transkribiert – keine Speicherung privater Sprachdaten auf Werbeservern.'
    ],
    tags: ['aufgabenheft', 'hausaufgaben', 'buchseiten', 'noten', 'vorlesen', 'tts', 'tempo', 'lehreraufnahme', 'frage', 'diktat', 'nachtruhe', 'vergrößern']
  },
  {
    id: 'student-practice-studio-timer',
    tier: 'student',
    boardId: 'practice_board',
    title: 'Übe-Studio & Zen-Mission: Belohnungs-Sticker & Fokus',
    subtitle: 'Ablenkungsfreie 3-Stufen-Mission, Playalong-Dock, Sound-Chimes und Flammen-Streaks',
    badge: 'Übe-Studio',
    category: 'audio_studio',
    summary: 'Mach dein tägliches Üben zu einer motivierenden Entdeckungsreise: Wähle deine Zen-Mission (5, 10 oder 15 Min.), spiele direkt im Zen-Dock zu den Aufnahmen deiner Lehrkraft mit und feiere das Erreichen mit Sound-Chimes, Konfetti und bunten Belohnungs-Stickern.',
    steps: [
      {
        title: '1. Zen-Mission starten (5, 10 oder 15 Minuten)',
        desc: 'Öffne das Übe-Studio und wähle deine Missions-Dauer. Der Bildschirm wechselt in einen ruhigen, ablenkungsfreien Zen-Modus – keine störenden Menüs, volle Konzentration auf dein Instrument.',
        actionLabel: 'Mission starten',
        actionTarget: 'practice_board'
      },
      {
        title: '2. Mit dem Zen Playalong-Dock mitspielen',
        desc: 'Während die Zen-Uhr läuft, steuerst du deine Lehrer-Aufnahmen und Playalongs direkt im unteren Zen-Dock – mit Start/Pause, Vorzähler und Tempo-Drossel, ohne den Fokus zu verlieren.',
        actionLabel: 'Playalong testen',
        actionTarget: 'practice_board'
      },
      {
        title: '3. Meilenstein erreichen: Sound-Chime, Konfetti & Sticker sammeln',
        desc: 'Hast du deine Übezeit geschafft, ertönt der feierliche Klang-Chime! Virtuelles Konfetti steigt auf und du kannst dir deinen verdienten Belohnungs-Sticker für dein digitales Notenheft aussuchen.',
        actionLabel: 'Sticker ansehen',
        actionTarget: 'practice_board'
      }
    ],
    proTips: [
      '🔥 Flammen-Serie (Streaks): Für jeden Tag, an dem du deine Mission erfüllst, wächst deine Übe-Flamme. Halte die Serie aktiv und schalte seltene Musiker-Avatare frei.',
      '👨‍👩‍👧 Eltern-Begleitung (Üben ohne Tablet): Hast du ganz frei am Klavier, Schlagzeug oder im Garten geübt? Deine Eltern können gemeinsam geübte Minuten mit 1 Klick nachtragen und bestätigen.',
      '🎧 Kopfhörer-Empfehlung: Schließe geschlossene Kopfhörer an, um die Lehrer-Aufnahme im Zen-Dock kristallklar zu hören und dein eigenes Spiel präzise abzugleichen.'
    ],
    invariants: [
      'Intrinsische Motivation: Keine negativen Abzüge oder Strafen bei verpassten Tagen – die Freude am Musizieren steht immer an erster Stelle.',
      'Offline-Resilienz: Die Zen-Mission und der Fokus-Timer laufen dank präziser Web-Worker auch bei instabiler Internetverbindung sekundengenau weiter.'
    ],
    tags: ['üben', 'timer', 'zen mission', 'playalong dock', 'streaks', 'flamme', 'konfetti', 'sticker', 'xp', 'elternbegleitung']
  },
  {
    id: 'student-groove-trainer',
    tier: 'student',
    boardId: 'groove_trainer',
    title: 'Groove-Trainer: Rhythmus-Labor & Pocket-Coach',
    subtitle: 'Bären-Puls bis Shuffle, Call & Response und Live-Timing-Feedback (In the Pocket)',
    badge: 'Groove-Trainer',
    category: 'audio_studio',
    summary: 'Entwickle ein unerschütterliches Taktgefühl: Trainiere mit 4 Tier-Rhythmen (vom Bären-Puls bis zum Pferde-Galopp), wähle dein Lieblings-Drumkit und erhalte sekundengenaues Live-Feedback, ob du genau auf den Punkt spielst.',
    steps: [
      {
        title: '1. Rhythmus-Stufe & Tier-Puls wählen',
        desc: 'Wähle dein Level: 1. Bären-Puls (Viertelnoten / 80 BPM), 2. Häschen-Groove (Achtel / 90 BPM), 3. Off-Beat (Synkopen / 95 BPM) oder 4. Pferde-Galopp (Shuffle / 75 BPM).',
        actionLabel: 'Groove-Trainer öffnen',
        actionTarget: 'groove_trainer'
      },
      {
        title: '2. Trainingsmodus & Sound-Kit aktivieren',
        desc: 'Schalte zwischen "Call & Response" (Zuhören ➔ Nachspielen), "Continuous" (Dauer-Groove) oder dem "Disappearing Beat" (Klick blendet sich aus, um dein inneres Metronom zu testen). Wähle Drums, 808 oder Congas.',
        actionLabel: 'Modus einstellen',
        actionTarget: 'groove_trainer'
      },
      {
        title: '3. Im Rhythmus tappen & Live-Feedback prüfen',
        desc: 'Tappe auf das Rhythmus-Pad oder spiele dein Instrument. Das System bewertet jeden Schlag in Echtzeit: "Pocket" (Perfekt im Takt), "Rush" (Zu schnell) oder "Drag" (Zu langsam).',
        actionLabel: 'Training starten',
        actionTarget: 'groove_trainer'
      }
    ],
    proTips: [
      '🎯 Die Pocket treffen: Versuche 16 Takte am Stück nur "Pocket"-Treffer zu erzielen, um die höchste Rhythmus-XP-Auszeichnung freizuschalten.',
      '👻 Disappearing Beat meistern: Der Klick wird nach 4 Takten leiser und verschwindet ganz – schaffst du es, nach 8 Takten Stille exakt auf der "1" wieder einzusetzen?',
      '🔊 Sound-Kits variieren: Wechsle auf "Body Percussion" für natürliches Klatschen oder "Urban 808" für modernen Beat-Sound.'
    ],
    invariants: [
      'Latenz-Kompensation: Die Rhythmus-Engine nutzt WebAudio Precision Clocks mit Sub-Millisekunden-Genauigkeit.',
      'Sicherer Schutz: Keine Bestrafung bei Fehltritten – Feedback dient rein dem spielerischen Gehör- und Timing-Aufbau.'
    ],
    tags: ['groove trainer', 'rhythmus', 'metronom', 'timing', 'pocket', 'viertel', 'achtel', 'synkopen', 'shuffle', 'call response']
  },
  {
    id: 'student-loopstation-playalong',
    tier: 'student',
    boardId: 'loopstation',
    title: 'Interaktive Audio-Loopstation: Mehrspur-Studio & Overdubbing',
    subtitle: 'Spur 1 bis 4 layern, analoge Lautstärke-Knobs, Solo/Mute und automatisches Studio-Mastering',
    badge: 'Loopstation',
    category: 'audio_studio',
    summary: 'Baue deine eigenen Songs und Begleitungen Spur für Spur auf: Nimm auf Spur 1 einen Beat oder Akkorde auf, loope sie nahtlos mit 4-Takte-Pause und spiele auf Spur 2 dein Solo darüber ein.',
    steps: [
      {
        title: '1. Grundspur auf Track 1 einspielen',
        desc: 'Schalte das Metronom ein, wähle dein Tempo (BPM) und starte die Aufnahme. Der 4-Beat Einzähler zählt dich sauber ein. Spiele dein Grundmuster und stoppe genau am Taktende.',
        actionLabel: 'Loopstation öffnen',
        actionTarget: 'loopstation'
      },
      {
        title: '2. Zweite Spur overdubben (Mehrspur-Aufnahme)',
        desc: 'Track 1 loopt nun automatisch im Kreis. Aktiviere Track 2 für die Aufnahme. Dank der verbindlichen 4-Takte-Pause hast du Zeit, dich am Instrument vorzubereiten, bevor dein Solo startet.',
        actionLabel: 'Overdub starten',
        actionTarget: 'loopstation'
      },
      {
        title: '3. Spuren mit Lautstärke-Knobs & Mute/Solo abmischen',
        desc: 'Drehe an den analogen Lautstärke-Knobs, um Spuren leiser oder lauter zu machen. Schalte einzelne Instrumente stumm oder setze ein Solo-Highlight.',
        actionLabel: 'Mix abmischen',
        actionTarget: 'loopstation'
      }
    ],
    proTips: [
      '🎛️ Audio-Mastering im Hintergrund: Die Loopstation pegelt deine Aufnahme automatisch nach EBU R128 (-14 LUFS) ein – dein Take klingt direkt wie eine fertige Studio-Produktion.',
      '🎧 Kopfhörer bei Mehrspur-Takes: Nutze kabelgebundene Kopfhörer beim Overdubbing, damit die erste Spur nicht ins Mikrofon überspricht.',
      '⚡ Latenz-Ausgleich: Hast du Bluetooth-Lautsprecher? Stelle den Sync-Offset-Regler um einige Millisekunden nach, um Verzögerungen vollständig auszugleichen.'
    ],
    invariants: [
      '4-Takte-Ruhepause: Die Loopstation startet Mehrspur-Takes ausnahmslos mit 4 Takten Pause für stressfreies Einsetzen.',
      'Studio-Mastering: Alle Spuren werden lokal verlustfrei verarbeitet und erst nach Pegelung im Tresor abgelegt.'
    ],
    tags: ['loopstation', 'overdub', 'mehrspur', 'tracks', 'fader', 'mastering', 'playalong', 'knobs', 'lufs', 'timing']
  },
  {
    id: 'student-meisterwerk-vault',
    tier: 'student',
    boardId: 'hero',
    title: 'Meisterwerk-Tresor & Mein Held: Urkunden & Level-Evolution',
    subtitle: 'Gemeisterte Stücke, offizielle Musikschul-Urkunden und Level-Rahmen von Bronze bis Diamant',
    badge: 'Tresor',
    category: 'core_boards',
    summary: 'Deine persönliche musikalische Hall of Fame: Jedes Musikstück, das du flüssig vorspielen kannst, wird von deiner Lehrkraft als offizielles Meisterwerk mit Urkunde im Tresor verewigt.',
    steps: [
      {
        title: '1. Stück im Unterricht meistern & freischalten',
        desc: 'Sobald du ein Werk fehlerfrei beherrschst, aktiviert deine Lehrkraft das Meisterwerk-Siegel. Das Stück wandert aus den offenen Aufgaben direkt in deine Helden-Galerie.',
        actionLabel: 'Helden-Bereich öffnen',
        actionTarget: 'hero'
      },
      {
        title: '2. Offizielle Meisterwerk-Urkunde einsehen & drucken',
        desc: 'Tippe auf das gemeisterte Stück. Deine Urkunde enthält deinen Namen, das Musikschul-Wappen, Abschlussdatum und Notenbuch-Quelle. Lade sie mit 1 Klick als hochauflösendes PDF herunter.',
        actionLabel: 'Urkunden ansehen',
        actionTarget: 'hero'
      },
      {
        title: '3. Level-Evolution & Meister-Krone freischalten',
        desc: 'Mit jedem Meisterwerk und jeder Übe-Minute steigt dein Musiker-Level. Dein Avatar erhält edle Rahmen (Bronze ➔ Silber ➔ Gold ➔ Platin ➔ Diamant) und schließlich die Meister-Krone.',
        actionLabel: 'Avatar ansehen',
        actionTarget: 'hero'
      }
    ],
    proTips: [
      '🖼️ Urkunde für Großeltern & Zimmer: Lade das druckfertige A4-PDF herunter und hänge es über dein Instrument oder teile es digital mit deiner Familie.',
      '👑 Die Meister-Krone: Schüler, die mehr als 10 Stücke gemeistert haben, schalten die legendäre goldene Meisterkrone im Profil frei.',
      '🎨 Eigenes Musiker-Foto: Mit Erlaubnis deiner Eltern (per PIN) kannst du ein echtes Foto von dir am Instrument im Profil hochladen.'
    ],
    invariants: [
      'Revisionssicher & Unveränderbar: Ausgestellte Meisterwerk-Urkunden tragen eine kryptografische Prüfsumme und bleiben dauerhaft in deiner Schulbiografie erhalten.',
      'Datenschutz: Exporte enthalten ausschließlich deinen Vornamen und den ersten Buchstaben des Nachnamens.'
    ],
    tags: ['meisterwerk', 'urkunde', 'tresor', 'held', 'avatar', 'level', 'evolution', 'krone', 'pdf', 'auszeichnung']
  },
  {
    id: 'student-groovelab-bandroom',
    tier: 'student',
    boardId: 'songs',
    title: 'GrooveLab Band-Room: Songs, Chords & Musiker-Avatare',
    subtitle: 'Interaktive Band-Setlists, Songtexte mit Akkorden, Skill-Radar und Ensemble-Proben',
    badge: 'GrooveLab',
    category: 'core_boards',
    summary: 'Das gelbe Band- und Repertoire-Modul: Probt eure gemeinsamen Songs für das nächste Konzert, studiert Songtexte und Akkorde ein und verfolgt euren Band-Fortschritt im interaktiven Skill-Radar.',
    steps: [
      {
        title: '1. In den gelben GrooveLab-Reiter wechseln',
        desc: 'Tippe im Hauptmenü auf den gelben Reiter "GrooveLab". Du siehst sofort die Band, in der du eingeteilt bist, und das anstehende Repertoire.',
        actionLabel: 'Zu GrooveLab wechseln',
        actionTarget: 'songs'
      },
      {
        title: '2. Songs öffnen, Chords & Songtexte einblenden',
        desc: 'Tippe auf ein Song-Cover (z. B. "Linkin Park - Numb"). Du siehst die Akkorde, den Liedtext und die für dein Instrument passenden Griffbilder.',
        actionLabel: 'Song-Mediathek öffnen',
        actionTarget: 'songs'
      },
      {
        title: '3. Skill-Radar füllen & Musiker-Avatar anpassen',
        desc: 'Für jeden geübten Song wachsen deine Werte im 5-Achsen Skill-Radar (Rhythmus, Tonhöhe, Dynamik, Tempo, Ausdruck). Passe deinen Geist- oder Band-Avatar individuell an.',
        actionLabel: 'Skill-Radar ansehen',
        actionTarget: 'songs'
      }
    ],
    proTips: [
      '🎸 Band-Transposition: Ist der Gesang zu hoch oder tief? Nutze die Tonart-Verschiebung im Song-Detail, um die Akkorde für deine Gitarre oder dein Klavier anzupassen.',
      '👻 Musiker-Avatar im Band-Modus: Im GrooveLab-Modul kannst du dir aus Dutzenden coolen Instrumenten- und Geist-Avataren deinen Bühnen-Charakter wählen.',
      '🎵 Repertoire-Status: Lerne erst den "Refrain", dann die "Strophe", bis der Song als "Auftrittsbereit" grün markiert ist.'
    ],
    invariants: [
      '100% Schulübernahme: GrooveLab-Aktivierungen werden ausnahmslos von der Musikschule als Sammelzahler übernommen – für Eltern und Schüler stets 0,00 €.',
      'Kein Chat-Spam: Band-Nachrichten sind rein didaktische Probentermine und Setlist-Hinweise der Lehrkraft.'
    ],
    tags: ['groovelab', 'band', 'bandroom', 'songs', 'repertoire', 'chords', 'akkorde', 'skill radar', 'avatar', 'auftritt']
  },
  {
    id: 'student-parents-safety',
    tier: 'student',
    boardId: 'profile',
    title: 'Eltern-Bereich: Wöchentlicher Übe-Report, Streak-Schilde & PIN',
    subtitle: 'Transparente Übe-Minuten, Schutzschilde bei Krankheit, 4-stellige PIN und DSGVO-Datentresor',
    badge: 'Eltern-Schutz',
    category: 'core_boards',
    summary: 'Sicherheit, Gelassenheit und volle Transparenz für Eltern: Sehen Sie auf einen Blick die wöchentlichen Übe-Minuten Ihres Kindes, schützen Sie die Flammen-Serie mit Schutzschilden und verwalten Sie sensible Einstellungen mit einer persönlichen PIN.',
    steps: [
      {
        title: '1. Eltern-Bereich im Profil aufrufen',
        desc: 'Tippe im Profil auf "Mein Profil" und wähle die Kachel "Eltern-Bereich & Sicherheit".',
        actionLabel: 'Profil öffnen',
        actionTarget: 'profile'
      },
      {
        title: '2. Wöchentlichen Übe-Report einsehen',
        desc: 'Hier sehen Sie die reinen Übe-Minuten der Woche im Vergleich zum empfohlenen Tagesziel (z. B. 15 Min./Tag). Keine Bewertungen, sondern reine Lernzeit am Instrument.',
        actionLabel: 'Report ansehen',
        actionTarget: 'profile'
      },
      {
        title: '3. 4-stellige Eltern-PIN zum Schutz einrichten',
        desc: 'Vergeben Sie eine persönliche 4-stellige Eltern-PIN. Dadurch wird verhindert, dass Kinder versehentlich Profileinstellungen verstellen oder persönliche Daten ändern.',
        actionLabel: 'PIN vergeben',
        actionTarget: 'profile'
      }
    ],
    proTips: [
      '🛡️ Streak-Schutzschilde: Ist Ihr Kind krank, im Urlaub oder hat Schullandheim? Bis zu 3 automatische Schutzschilde verhindern, dass die mühsam aufgebaute Übe-Flamme erlischt.',
      '👨‍👩‍👧 Gemeinsam geübte Minuten bestätigen: Hat Ihr Kind ohne Tablet am echten Klavier geübt? Bestätigen Sie die Minuten mit 1 Fingertipp im Eltern-Report.',
      '📦 Vollständiger DSGVO-Archiv-Download: Sie können jederzeit ein komplettes ZIP-Archiv aller hochgeladenen Hausaufgaben, Urkunden und Übezeiten herunterladen.'
    ],
    invariants: [
      'Zero-Tracking Doktrin: Keine Werbe-Tracker, keine Cookies von Drittanbietern, keine Datenweitergabe an Werbenetzwerke.',
      'Server-Side PIN Verifikation: PIN-Prüfungen erfolgen zu 100% kryptografisch serverseitig – kein Auslesen im Browser möglich.'
    ],
    tags: ['eltern', 'sicherheit', 'pin', 'report', 'uebezeiten', 'streak schild', 'dsgvo', 'datenschutz', 'kinderschutz']
  }
];
