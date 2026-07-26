# Project Rules

## Platform Naming
- Always refer to the platform as **Campus-Groovelab** in all UI elements, user communications, messages, and document descriptions.
- Ensure the spelling is precisely "Campus-Groovelab" (with a double 'o' in "Groovelab").

## Avatar Display Rules
- **Musician Avatars**: Only allowed for teachers (`teacher`) and students (`student`) in the **Campus-Groovelab** platform when using the `groovelab` module.
- **GrooveLab Module Selection**: Wenn das GrooveLab-Modul (der gelbe Reiter "GrooveLab") ausgewählt ist, gilt der Musiker-Avatar für dieses Modul (in diesem Fall der Geist-Avatar).
- **Administration & Secretariat**: Users belonging to administration/secretariat (roles `admin` and `secretary`) must not have musician/instrument avatars. Their profile picture must always display the briefing board chalkboard image: `/campus_login_hero.png` across all modules.

## Billing & Pricing Rules
- **Software License**: The base software license for **Campus-Groovelab** is always 100% free of charge ("100% kostenlos").
- Only server hosting/service fees, team members, and pupil activation fees are subject to charge.
- **Module Pricing & Bundles**:
  - **Campus Module**: Base price is 7,99 € / Mo. (fixed server-hosting flat rate per music school).
  - **GrooveLab Module**: Base price is 4,99 € / Mo. (fixed server-hosting flat rate per music school).
  - **Kombi-Vorteil Bundle**: If both Campus and GrooveLab are booked together, the bundle price is 9,99 € / Mo. (fixed server-hosting flat rate per music school, saving 2,99 € / Mo. compared to 12,98 € / Mo.).
  - **Service Fee (Lehrer & Verwaltung)**: 0,49 € / Mo. per active administrator/teacher profile.
- **Billing Methods for Student Activations (Schüleraktivierungen)**:
  - Only students who consciously activate their profile/access via the platform are subject to billing (inactive/unregistered profiles in the database are not billed).
  - **Musikschule übernimmt alle Kosten (Sammelzahler)** (Music school covers all fees, making it completely free for students/parents):
    - *Variable monatliche Abrechnung*: Base price remains same; variable billing of 0,49 € / active student / Mo. Wenn ein Schüler länger als 2 Monate nicht eingeloggt war, wird das Profil automatisch wieder inaktiviert, um Kosten nur bei tatsächlicher Nutzung zu gewährleisten.
    - *Jahresbeitrag bei Aktivierung (10% Rabatt)*: Active students billed as an annual fee in a separate monthly bill, offering a 10% discount.
    - *Einmalige Komplett-Aktivierung zum Schuljahresstart (September) (20% Rabatt)*: The school activates all students at the school year start, billed once for the entire school year with a 20% discount.
  - **Direktabrechnung mit Eltern/Schülern (Zahlungsüberwachung)** (Direct billing with parents/students; only available for the Campus module; GrooveLab activations are always covered by the school):
    - *Vollständige Direktabrechnung*: Student/parent pays the full amount of 0,49 € / Mo. (annual fee: 5,88 €). School is relieved of the passive database fee (school pays 0,00 €).
    - *Teilweise Direktabrechnung*: Student/parent pays 0,40 € / Mo. (annual fee: 4,80 €). School covers the passive database fee of 0,09 € / Mo. per student.
    - *Härtefälle & Geschwisterrabatte*: Individual students can be manually marked in the student administration to exempt them from direct billing (costs remain with the school, no contribution is collected).
- **Student Deactivation (Deaktivierung von Schülern)**:
  - *Monatliche Abrechnung*: Bei Deaktivierung eines Schülers entfällt die Aktivierungsgebühr am Ende des laufenden Monats.
  - *Jährliche Abrechnung (vorab bezahlt)*: Wurde der Jahresbeitrag bereits vorab entrichtet, bleiben das Profil und alle Funktionen des Schülers bis zum Ende des Schuljahres aktiv (da bereits bezahlt), und das Profil wird erst zum Schuljahreswechsel inaktiviert.

## Module Feature Inclusions (Leistungsumfang der Module)
- **Verwaltungs- und Sekretariats-Nutzer**: Administrations- und Sekretariats-Benutzer (Rollen `admin` und `secretary`) sind in den Lizenzen für das **Campus-Modul** und das **GrooveLab-Modul** vollständig inklusive und verursachen keine zusätzlichen Lizenzgebühren.
- **Campus-Modul**: Beinhaltet folgende Leistungen und Funktionen:
  - Hausaufgabenheft & Schüler-Protokoll (Hausaufgabenheft-Widget)
  - Meisterwerk-Protokoll / Meisterwerk-Dokumentation
  - Übe-Timer / Fokus-Timer, Übungs-Streaks und XP-Sammeln für selbstständige Übe-Sessions
  - Audio-Loopstation & Audio-Aufnahmefunktionen
  - Zentrale Datenbank & Intelligenter Stundenplan-Designer (Schedule Board)
  - Raum-Engine & Raumbelegungs-Planung (Raumplaner)
  - Interne Schulkommunikation & Direktnachrichten (Chat / Shouts)
- **GrooveLab-Modul**: Beinhaltet folgende Leistungen und Funktionen:
  - Bandgründung & Band-Verwaltung (Bands-Widget, Band-Verwaltung)
  - Songverwaltung & Song-Bibliotheken (Songs meistern)
  - Repertoire-Planer (Song-Repertoire)
  - Band-Kommunikation
  - Live Lab (Echtzeit-Band-Modul)
  - XP-Punkte (spezifisch für Songs und Band-Fortschritte)
  - Skill-Radar (Fortschritts-Visualisierung)
  - Schüler-Avatare (Musiker-Avatare) & Band-Avatare

## Platform Modules Design & Styling
- **Primary Theme Colors**: 
  - In the **Administration and Secretariat modules**, the primary color for buttons, active accents, selectors, and interactive highlights must always be red (e.g., `#ea4335`, `#fce8e6` for backgrounds).
  - In the **Campus module**, the primary color for buttons, active accents, selectors, and interactive highlights must always be green (e.g., `#34a853`, `#e6f4ea`/`#d1fae5` for backgrounds).
  - In the **GrooveLab module**, the primary color for buttons, active accents, selectors, and interactive highlights must always be yellow (e.g., `#eab308`/`#facc15`, `#fefce8`/`#fefce8` for backgrounds).
- **Monochrome Icons & Emojis**: Across all modules (Admin, Secretariat, Campus, and GrooveLab), all icons and emojis must be monochrome/single color ("unifarben") in active UI components to maintain a professional, cohesive, and modern look. Colored or multi-color graphics/emojis must be avoided.

## Quality Control & Auditing Rules
- **Consistent Agent Audit Teams**: Whenever performing a final quality check or audit on any dashboard, module, or board, always utilize the exact same team of specialized subagents/expert roles (UX Designer, Database Specialist, Security Auditor, and Lead QA Engineer) to ensure consistent analysis and coverage.

## Schüler-Protokoll & Hausaufgabenheft Rules
- **Universal Uniformity**: All changes in the Schüler-Protokoll (student protocol) must always be applied for all users. The Schüler-Protokoll/Hausaufgabenheft (homework book) layout, headers, first name display, and design selections must look identical across all modules and user accounts.

## Loopstation Rules
- **Looping Pause**: Es wird eine zwingende 4-Takte-Pause zwischen den Aufnahme-Spuren verwendet (Variante 1), um eine 100% sample-genaue Synchronität (kein Swallowed Attack) sicherzustellen.

## User & Data Protection Shield Rules
- **Absolute User Data Protection**: Echte Benutzerdaten, Schülerprofile, Namen und bestehende Datenbankeinträge dürfen NIEMALS über Codeänderungen, Skripte oder direkte Datenbankbefehle verändert, überschrieben, gefälscht oder gelöscht werden.
- **Data Protection Auditor Subagent**: Vor jeder Änderung am Datenmodell oder an der Benutzerverarbeitung muss der Subagent `user_data_protection_auditor` zur Prüfung herangezogen werden, um sicherzustellen, dass keine echten Userdaten beeinträchtigt werden.

## Datenschutz & Kindersicherheits-Audit Rules
- **Datenschutz-Standard**: Bei jeder Code-Änderung oder Funktions-Implementierung muss geprüft werden, ob der absolute Datenschutzstandard für Schulsoftware (Minimierung von personenbezogenen Daten von Minderjährigen nach DSGVO/COPPA) gewährleistet wird.
- **Datenminimierung**: Da wir auf absolute Datenkomprimierung bei Usern setzen, um den Datenschutz bestmöglich zu erfüllen, werden keine SEPA-, Zahlungs-, Vertragsdaten und auch keine E-Mail-Adressen von Schülern gespeichert.
- **Namens-Anonymisierung**: Schülernamen müssen im Lehrer-Dashboard auf "Vorname + Anfangsbuchstabe Nachname" (z. B. "Max M.") gekürzt werden. Im Schüler-Dashboard werden keine persönlichen Namen in UI-Titeln oder Begrüßungen angezeigt; stattdessen werden dort ausschließlich generische Bezeichnungen (z. B. "Mein Hausaufgabenheft" oder "Hausaufgabenheft" statt "Hausaufgabenheft von Max") verwendet.
- **Hardware-Sicherheit**: Alle Audio- und Mikrofonzugriffe müssen beim Verlassen der Oberfläche oder Schließen von Modulen sofort gestoppt werden (kein unbemerktes Weiterleuchten der Aufnahmelampe).
- **Dateien & Fallbacks**: Zu große Base64-Audio-Daten dürfen nicht in Textspalten der Datenbank abgelegt werden. Alle gelöschten Audio-Einträge müssen physisch und vollständig aus dem Cloud-Speicher (Supabase Storage) entfernt werden.
## Campus & GrooveLab Isolation Rules
- **Cross-Module Side Effects**: Any code modification, feature addition, or configuration change in the Campus module must never affect the visual styling, code structures, or backend logic of the GrooveLab module, and vice versa.
- **Strict Verification**: Before finalizing any code edits, verify that no unintended side effects have been introduced to the sibling module. Any shared components or database changes that bridge both modules must be explicitly reviewed and highlighted to the user.

## Future Plans & Notes (Zukünftige Vorhaben)
- **Profilauswahl-Sicherheit im Campus-Modul**: Das Netflix-Prinzip (Schnellwahl lokaler Profile ohne PIN-Abfrage) ist für Familien mit mehreren Kindern im Campus-Modul gewollt. Im GrooveLab-Modul wird dies nicht benötigt. Bei zukünftigen Modifikationen des Campus-Moduls soll dieses Prinzip dort verankert und gepflegt werden.

## PWA & Deployment Rules
- **PWA Auto-Update Mechanism**: Ensure the automatic Service Worker update checker (`reg.update()`) remains active in `App.tsx` and checks every 5 minutes.
- **Cache-Busting on Deploy**: During deployments, the `CACHE_NAME` version in `sw.js` must be bumped (e.g. from `groovelab-static-v2` to `groovelab-static-v3`) to force client PWA cache invalidation.
- **No Automatic Commits and Deploys**: Do NOT automatically perform git commits, git pushes, or run `./deploy.sh` (or any other deployment script) after making modifications. Changes must only be committed and deployed when explicitly requested by the user, or left for the user to handle manually.
- **Sandboxed Deployments Bypass**: When compiling the production bundle and running `./deploy.sh` (upon explicit user request), run it with `BypassSandbox: true` so the files are successfully copied to the remote Hetzner Server (`178.105.10.2`).
- **Kiosk Map Coupling Token Integrity**: Device coupling directly from the interactive map in `LoginScreen.tsx` must always fetch or create a kiosk record in the `kiosks` table and save its unique `secret_token` in `localStorage`, never the school's general onboarding token. To bypass Row-Level Security (RLS) policies on `kiosks` during this unauthenticated insert/select operation, temporarily set `groovelab_kiosk_token` in `localStorage` to the school's general onboarding token (`schoolData.groovelab_kiosk_token`) right before executing the Supabase query, and overwrite it with the kiosk's unique `secret_token` upon success.
## Gold Standard Solver & Stundenplan-Designer Lock
- **Absoluter Gold-Standard Code-Freeze**: Der Code des Stundenplan-Designers (in `ScheduleBoard.tsx` und `Schedule15StageSolverEngine.ts`) hat den 100/100 Gold-Standard Status erreicht. Jegliche zukünftigen Änderungen an der Zuteilungs-Logik, am 17-Stufen-Solver oder an der UI des Stundenplan-Designer Tabs sind STRENG VERBOTEN und dürfen NUR nach expliziter Freigabe durch den User durchgeführt werden.

