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
  - Only students who consciously activate their profile/access via the platform are subject to billing (inactive/unregistered profiles in the database are 100% free / 0,00 €).
  - Jede Modul-Aktivierung löst eine Aktivierungsgebühr aus (0,49 € / Mo.). Ein Schüler, der sowohl Campus als auch GrooveLab aktiv nutzt, wird für beide Modul-Aktivierungen abgerechnet (z. B. 1× Campus + 1× GrooveLab = 2 × 0,49 € / Mo.).
  - GrooveLab-Aktivierungen werden **immer vollständig von der Musikschule übernommen** (Sammelzahler), auch wenn für das Campus-Modul Direktabrechnung mit den Eltern vereinbart wurde.
  - **Musikschule übernimmt alle Kosten (Sammelzahler)** (Music school covers all fees, making it completely free for students/parents):
    - *Variable monatliche Abrechnung*: Base price remains same; variable billing of 0,49 € / active student activation / Mo. Wenn ein Schüler länger als 2 Monate nicht eingeloggt war, wird das Profil automatisch wieder inaktiviert, um Kosten nur bei tatsächlicher Nutzung zu gewährleisten.
    - *Jahresbeitrag bei Aktivierung (10% Rabatt)*: Active students billed as an annual fee in a separate monthly bill, offering a 10% discount.
    - *Einmalige Komplett-Aktivierung zum Schuljahresstart (September) (20% Rabatt)*: The school activates all students at the school year start, billed once for the entire school year with a 20% discount.
  - **Direktabrechnung mit Eltern/Schülern (Zahlungsüberwachung)** (Direct billing with parents/students; only available for the Campus module; GrooveLab activations are always covered by the school):
    - *Vollständige Direktabrechnung*: Student/parent pays the full amount of 0,49 € / Mo. (annual fee: 5,88 €). School is relieved of the passive database fee (school pays 0,00 €).
    - *Teilweise Direktabrechnung*: Student/parent pays 0,40 € / Mo. (annual fee: 4,80 €). School covers the passive database fee of 0,09 € / Mo. per student.
    - *Härtefälle & Geschwisterrabatte*: Individual students can be manually marked in the student administration to exempt them from direct billing (costs remain with the school, no contribution is collected).
## Canonical Billing Sequence & Legal SaaS Nomenclature (Verbindlicher Standard)
- **Plattformweites Master-Wording**: Für alle Gebührenaufstellungen, Gebühren-Vorschauen, Ratenübersichten, Rechnungs-PDFs, Onboarding-Karten und Modals innerhalb der gesamten Plattform MUSS immer die exakt gleiche kanonische Reihenfolge und das gleiche juristisch wasserdichte Wording verwendet werden:
  1. **`Campus-Groovelab Software-Nutzungslizenz`**: `100% kostenlos (0,00 €)`
  2. **`Cloud- & Datenbank-Hosting: Modul Campus`**: `7,99 € / Mo.` (sofern Modul Campus aktiv)
  3. **`Cloud- & Datenbank-Hosting: Modul GrooveLab`**: `4,99 € / Mo.` (sofern Modul GrooveLab aktiv)
  4. **`Kombi-Vorteilsrabatt (Infrastruktur-Bündel)`**: `-2,99 € / Mo.` (sofern beide Module aktiv)
  5. **`Service- & Administrationspauschale`**: `[X] Lehrkräfte & Verwaltung aktiv × 0,49 € / Mo.`
  6. **`Basis-Bereitstellung`**: `[X] Schüler × 0,09 € / Mo.` (QR-Landingpages, Stundenplan-, Termin-, Raumänderungs- und Hausaufgabenheft-Sync sowie DSGVO-Datensatz-Hosting)
  7. **`Cloud- & Modul-Bereitstellung: Campus`**: `[X] Schüler × 0,49 € / Mo.` (Interaktive App-Nutzung: Übe-Timer, Loopstation, Meisterwerk-Protokoll)
  8. **`Cloud- & Modul-Bereitstellung: GrooveLab`**: `[X] Schüler × 0,49 € / Mo.` (Interaktive Band-Nutzung: Song-Bibliotheken, Band-Rooms, Repertoire)
  9. **`Zusatz-Speichervolumen: Audio-Tresor (+[X] GB)`**: `[X,XX] € / Mo.` (sofern Speicher-Add-on gebucht)
- **Verbotene Begriffe**: Niemals dürfen die Begriffe „Passiv-Lizenz“, „Karteileichen-Gebühr“, „Schüler-Lizenz“ oder „Profilaktivierung“ verwendet werden. Die Software-Lizenz ist immer 100% kostenlos; Kosten entstehen ausschließlich für Cloud-, Datenbank-, Bereitstellungs- und Service-Infrastruktur.

## Invoice Numbering Format (Rechnungsnummer-Logik)
- **B2C Student Activations (Direktabrechnung)**: Format `CG-[STUDENT_HASH_8]-[YYMM]` (e.g., `CG-F63B8EDE-2607`). Uses the platform prefix `CG-`, the first 8 uppercase hex characters of the student ID, and 2-digit year + 2-digit month. Ensures 100% GDPR compliance (no plain text names on bank statements), unique idempotency, and exact 1:1 match with the transfer reference (`Verwendungszweck`).
- **B2B School Invoices (Musikschul-Sammelrechnung)**: Format `RE-[SCHOOL_ID]-[YYMM]-01` (e.g., `RE-104-2607-01`). Uses regular invoice prefix `RE-`, numeric school ID, year/month, and monthly sequence number.

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

## Briefing Dashboard & Terminänderungen Rules
- **Dynamische Sichtbarkeit des Terminänderungen-Widgets**: Das `Terminänderungen`-Widget auf allen Briefing-Dashboards (sowohl `TeacherDashboard.tsx` als auch `StudentAvatarDashboard.tsx`) wird nur noch gerendert, wenn aktiv kommende Terminänderungen vorliegen. Wenn keine Terminänderungen vorhanden sind (`changes.length === 0`), wird das Widget dynamisch ausgeblendet (`return null`).

## Schüler-Protokoll & Hausaufgabenheft Rules
- **Universal Uniformity**: All changes in the Schüler-Protokoll (student protocol) must always be applied for all users. The Schüler-Protokoll/Hausaufgabenheft (homework book) layout, headers, first name display, and design selections must look identical across all modules and user accounts.

## Loopstation Rules
- **Looping Pause**: Es wird eine zwingende 4-Takte-Pause zwischen den Aufnahme-Spuren verwendet (Variante 1), um eine 100% sample-genaue Synchronität (kein Swallowed Attack) sicherzustellen.

## Datenschutz & Kindersicherheits-Audit Rules
- **Datenschutz-Standard**: Bei jeder Code-Änderung oder Funktions-Implementierung muss geprüft werden, ob der absolute Datenschutzstandard für Schulsoftware (Minimierung von personenbezogenen Daten von Minderjährigen nach DSGVO/COPPA) gewährleistet wird.
- **Datenminimierung**: Da wir auf absolute Datenkomprimierung bei Usern setzen, um den Datenschutz bestmöglich zu erfüllen, werden keine SEPA-, Zahlungs-, Vertragsdaten und auch keine E-Mail-Adressen von Schülern gespeichert.
- **Namens-Anonymisierung**: Schülernamen müssen im Lehrer-Dashboard auf "Vorname + Anfangsbuchstabe Nachname" (z. B. "Max M.") gekürzt werden. Im Schüler-Dashboard werden keine persönlichen Namen in UI-Titeln oder Begrüßungen angezeigt; stattdessen werden dort ausschließlich generische Bezeichnungen (z. B. "Mein Hausaufgabenheft" oder "Hausaufgabenheft" statt "Hausaufgabenheft von Max") verwendet.
- **Hardware-Sicherheit**: Alle Audio- und Mikrofonzugriffe müssen beim Verlassen der Oberfläche oder Schließen von Modulen sofort gestoppt werden (kein unbemerktes Weiterleuchten der Aufnahmelampe).
- **Dateien & Fallbacks**: Zu große Base64-Audio-Daten dürfen nicht in Textspalten der Datenbank abgelegt werden. Alle gelöschten Audio-Einträge müssen physisch und vollständig aus dem Cloud-Speicher (Supabase Storage) entfernt werden.
## Campus & GrooveLab Isolation Rules
- **Cross-Module Side Effects**: Any code modification, feature addition, or configuration change in the Campus module must never affect the visual styling, code structures, or backend logic of the GrooveLab module, and vice versa.
- **Strict Verification**: Before finalizing any code edits, verify that no unintended side effects have been introduced to the sibling module. Any shared components or database changes that bridge both modules must be explicitly reviewed and highlighted to the user.

## Desktop Layout Protection Rule
- **Desktop Version Immunity**: All desktop UI layouts, multi-column grids, desktop header tabs, and desktop navigation components across all modules must remain 100% untouched and preserved. Any responsive layout edits, mobile optimizations, or swipe card additions must be strictly scoped to mobile screen sizes (<= 768px) or device simulator classes (.sim-viewport-mobile, .sim-viewport-portrait), with ZERO side-effects on desktop viewports.

## Future Plans & Notes (Zukünftige Vorhaben)
- **Profilauswahl-Sicherheit im Campus-Modul**: Das Netflix-Prinzip (Schnellwahl lokaler Profile ohne PIN-Abfrage) ist für Familien mit mehreren Kindern im Campus-Modul gewollt. Im GrooveLab-Modul wird dies nicht benötigt. Bei zukünftigen Modifikationen des Campus-Moduls soll dieses Prinzip dort verankert und gepflegt werden.

## PWA & Deployment Rules
- **PWA Auto-Update Mechanism**: Ensure the automatic Service Worker update checker (`reg.update()`) remains active in `App.tsx` and checks every 5 minutes.
- **Cache-Busting on Deploy**: During deployments, the `CACHE_NAME` version in `sw.js` must be bumped (e.g. from `groovelab-static-v2` to `groovelab-static-v3`) to force client PWA cache invalidation.
- **No Automatic Commits and Deploys**: Do NOT automatically perform git commits, git pushes, or run `./deploy.sh` (or any other deployment script) after making modifications. Changes must only be committed and deployed when explicitly requested by the user, or left for the user to handle manually.
- **Sandboxed Deployments Bypass**: When compiling the production bundle and running `./deploy.sh` (upon explicit user request), run it with `BypassSandbox: true` so the files are successfully copied to the remote Hetzner Server (`178.105.10.2`).
- **Kiosk Map Coupling Token Integrity**: Device coupling directly from the interactive map in `LoginScreen.tsx` must always fetch or create a kiosk record in the `kiosks` table and save its unique `secret_token` in `localStorage`, never the school's general onboarding token. To bypass Row-Level Security (RLS) policies on `kiosks` during this unauthenticated insert/select operation, temporarily set `groovelab_kiosk_token` in `localStorage` to the school's general onboarding token (`schoolData.groovelab_kiosk_token`) right before executing the Supabase query, and overwrite it with the kiosk's unique `secret_token` upon success.

## Active Module & User Profile State Protection Rule
- **Prompt Isolation**: Das Abschicken eines Prompts darf NIEMALS Einfluss auf die Aktivierung/Deaktivierung von Modulen (z. B. Campus, GrooveLab, Abo-Bypass) oder User-Profilen haben.
- **Live In-App Execution**: Aktivierungen und Deaktivierungen müssen ausschließlich live bei der direkten Verwendung der Web-App durch den Nutzer ausgeführt werden und dürfen niemals durch KI-Prompts oder Agenten-Interaktionen getriggert oder überschrieben werden.
- **Dynamic User Limits**: Quota- und Speicher-Limits (z. B. für den Audio-Tresor) gelten dynamisch für jeden aktiven User und werden nicht über vorgefertigte, starre Inklusiv-GB-Zahlen gesteuert.
- **Database Mutation Immunity (Unantastbarkeit des Datenbank-Zustands)**:
  - Der KI-Agent darf NIEMALS Schreiboperationen, SQL-Mutationen (`.update()`, `.insert()`, `.delete()`) oder Skripte ausführen, die Benutzer-, Modul- oder Abrechnungszustände in Supabase verändern.
  - Alle Agenten-Analysen und Debugging-Skripte MÜSSEN zu 100% read-only (`.select()`) sein.
- **Deterministic State Reflection (Keine UI-Inferenz-Drifts)**:
  - Frontend-Komponenten dürfen niemals heuristische Defaults (wie `?? true`) verwenden, die den tatsächlichen Datenbankzustand verschleiern. Der in der UI angezeigte und abgerechnete Zustand muss immer der exakte, unmanipulierte Boolean-Wert (`Boolean(u.is_campus_active)`) aus der Datenbank sein.



