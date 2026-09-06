# Project Rules

## 🛡️ Enterprise+ Security Governance (OWASP ASVS Level 3 / Fail-Closed)
- **Zero-Trust Frontend**: Browser-JavaScript, `localStorage`, `sessionStorage`, React-State und URL-Parameter besitzen NIEMALS Autorisierungs- oder Sicherheitswirkung. Keine sicherheitsrelevanten Entscheidungen im Frontend.
- **Autoritative Auth-RPCs**: Logins (Ausweis, QR, PIN, Passkey, Master-Admin) laufen AUSNAHMSLOS über:
  - `authenticate_by_credential(p_credential, p_school_id)`
  - `authenticate_webauthn_credential(p_credential_id, p_challenge, p_school_id)`
  - `login_master_admin(p_username, p_password, p_totp_code)`
  - Es dürfen NIEMALS direkte PostgREST-Abfragen auf `users`, `users_raw` oder `students` zur Credential-Suche ausgeführt werden (z.B. KEIN `.eq('qr_token', ...)`).
- **Fail-Closed Doktrin**: Schlägt ein Sicherheits-RPC fehl oder ist nicht erreichbar, MUSS die Operation abbrechen und einen Fehler werfen. Keine unsicheren Fallbacks auf direkte Tabellenabfragen.
- **Zero-Secret-Leakage in Views & Bundles**: Die Spalten `parent_pin`, `personal_pin`, `master_admin_password`, `two_factor_secret`, `password_hash` dürfen NIEMALS in lesbaren SELECT-Statements oder Client-Objekten enthalten sein. Der Client empfängt ausschließlich vorberechnete Boolesche Flags (`has_parent_pin`, `has_personal_pin`, `is_pin_activated`, `is_2fa_enabled`).
- **Server-Side PIN Verifikation**: PIN-Prüfungen (`verify_personal_pin`, `verify_parent_pin`), PIN-Setups (`set_personal_pin`) und PIN-Resets (`reset_parent_pin_via_recovery_key`) erfolgen zu 100 % serverseitig. Keine JavaScript-Vergleiche (`storedPin === input`).
- **Privilege Escalation Schutz**: Rollenwechsel dürfen NUR über `switch_user_active_role(p_target_role)` erfolgen. Direkte Client-Updates an `role`, `is_master_admin` und `school_id` sind streng verboten und werden serverseitig durch `trg_users_view_dml` neutralisiert.
- **Mandantentrennung (Multi-Tenancy)**: Jede Datenbank-Abfrage und RLS-Policy muss strikt auf `school_id = get_current_user_school_id()` beschränkt sein (Default-Deny).
- **Storage-Scoping**: Löschoperationen auf `storage.objects` (Buckets `campus-assets`, `groovelab-assets`) müssen strikt auf den Ordner des angemeldeten Benutzers beschränkt sein. Anonymes Löschen ist verboten.
- **Revisionssicheres Audit-Logging**: Alle administrativen Aktionen, Ghost-Support-Sitzungen, Notfall-Resets und Master-Logins müssen unveränderbar in `public.audit_logs` oder `master_audit_trail` protokolliert werden.
- **Verifikationspflicht**: Nach jeder Code-Änderung zwingend `npm run security:check`, `npm run security:secrets`, `npx tsc --noEmit` und `npx vite build` ausführen.

## 🌅 Automatischer Guten-Morgen-Sicherheitscheck (Morning Security Routine)
- **Automatischer Trigger**: Wenn der Benutzer eine Nachricht mit einer morgendlichen Begrüßung (z. B. „Guten Morgen“, „Morning Check“, „Moin“, „Morgen-Audit“) sendet, MUSS automatisch und ohne gesonderte Aufforderung der vollständige Sicherheits- und Integritätscheck ausgeführt werden:
  1. `npm run security:check` (Security Drift Guard & Architektur-Invarianten-Scan)
  2. `npm run security:secrets` (Entropie- & Secret-Leak-Scanner)
  3. `npx tsc --noEmit` (TypeScript Typprüfung)
- **Ergebnisbericht**: Die Antwort liefert direkt das strukturierte **Morning Health & Security Briefing**, das den aktuellen Systemstatus, Code-Integrität (0 Verstöße, 0 Leaks) und den Status des Live-Systems transparent zusammenfasst.

## 🎯 Master Prompt Trigger ("master prompt" / "prompt Agent starten")
- **Kernprinzip**: Rein neutrales, modulares Architektur- und Struktur-Framework basierend auf `.agents/prompts/MASTER_PROMPT_TEMPLATE.md`.
- **Dynamische Rollenableitung**: Die Rolle ist niemals statisch vorgegeben, sondern wird vollkommen dynamisch und hochpräzise anhand des übergebenen Themas und Ziels definiert (z. B. *Senior UI/UX Architect*, *Database Optimization Expert*, *Security Engineer*, *Refactoring Lead*).
- **Trigger "master prompt"**:
  - Wenn der Benutzer „master prompt“ (oder „prompt Agent starten“) schreibt:
    1. *Thema/Ziel mitgegeben*: Leite sofort die spezialisierte Experten-Rolle ab und generiere direkt den schlüsselfertigen, neutralen Master-Prompt im Codeblock (vollständig ausgefüllte Struktur, ohne unnötige Interview-Runden).
    2. *Kein Thema mitgegeben*: Antworte mit einer einzigen, direkten Frage nach dem konkreten Thema/Ziel, um die Experten-Rolle und die Ziel-Parameter unmittelbar passgenau einzusetzen.
  - **Inhaltliche Leitplanken**: Reine Software-Architektur, Bounded Contexts, System-Invarianten, deterministischer 4-Phasen-Ablauf (1. Exploration -> 2. Planung -> 3. Implementierung -> 4. Verifikation) und strukturiertes Status-Reporting. Keine domänenspezifischen Vorab-Festlegungen.

## ⚡ Hermetisches Vibe Coding & Enterprise Quality Gate
- **Hermetischer Master-Prompt**: Bei KI-gestützten Feature-Erweiterungen und Refactorings ist zwingend der Prompt aus `.agents/prompts/VIBE_CODING_MASTER_PROMPT.md` zu verwenden. Der Prompt bindet die KI an strikte Bounded Contexts, verbietet unkontrollierte Dateimodifikationen außerhalb des Scopes und schützt alle OWASP ASVS Level 3 Axiome.
- **Enterprise Quality Gate (`npm run gate`)**: Vor dem Abschluss jeder Arbeitsaufgabe und vor jedem Git-Commit MUSS zwingend das vereinheitlichte Qualitäts-Gate ausgeführt werden:
  ```bash
  npm run gate
  ```
  *(oder `npm run verify:enterprise`)*. Dieses Gate führt synchron den Security Drift Guard (0 Violations), den Secret-Scanner (0 Leaks), den TypeScript Typechecker (`tsc --noEmit`) und die FinOps Invariant Tests (`runBillingInvariantTests.ts`) aus. Ein Task gilt erst als erfolgreich, wenn dieses Gate mit Exit-Code 0 abschließt.

## 🏛️ Monolith Goldstandard Guardian & Positive Intervention Directive
- **Automatische Wächter- & Veredelungsrolle**: Bei jeder Prompt-Ausführung übernimmt der Agent automatisch die Rolle des *Principal Monolith Architecture Guardians*. Alle im Rahmen des Prompts angefassten, erweiterten oder neu erzeugten Dateien werden aktiv auf Konformität mit dem Monolith-Goldstandard von Campus-Groovelab geprüft.
- **Konstruktiv-Positive Intervention**: Werden Architektur-Mängel, fehlende oder unvollständige Typisierungen, Logik-/UI-Verflechtungen, Code-Duplikate oder Bounded-Context-Verletzungen erkannt, greift der Agent konstruktiv ein und hebt den Code chirurgisch, typ-sicher und rückwärtskompatibel auf den Goldstandard an.
- **Chirurgisches Scoping (Legacy-Schutz)**: Die Veredelung konzentriert sich pragmatisch und zielgerichtet auf die im jeweiligen Prompt bearbeiteten Funktionen, Komponenten und Datenflüsse. Unberührter Bestandscode im Rest der Datei bleibt stabil, um unnötigen Code-Churn und Regressionsrisiken zu vermeiden.
- **Unantastbare Goldstandard-Axiome**:
  1. *Bounded Contexts & Modul-Isolation*: Strikte Trennung zwischen Campus (grün), GrooveLab (gelb) und Admin (rot). Keine unkontrollierten Quereffekte.
  2. *Single Source of Truth & Zero Duplication*: Keine Schatten-Zustände, redundanten Hilfsfunktionen oder doppelten Typdefinitionen.
  3. *Strict TypeScript*: 100 % typisiert. Absolutes Verbot von `any`, `@ts-ignore` oder unechten Type-Casts.
  4. *Zero-Trust & Server-RPCs*: Autorisierungs-, PIN- und sensible Datenprüfungen erfolgen ausnahmslos serverseitig über autoritative RPCs.
  5. *Desktop Layout Immunity*: Bestehende Desktop-Grid-Layouts und Navigationselemente sind unantastbar. Responsive Anpassungen bleiben strikt auf Mobile (`<= 768px`) beschränkt.
  6. *Proportions- & Typografie-Harmonie*: UI-Elemente folgen dem etablierten Goldstandard (Apple Squircle Radien, monochrome Icons, Plus Jakarta Sans Typografie).
- **Kompaktes Reporting (Bedarfsgesteuert)**:
  - Wurde aktiv eingegriffen und veredelt: Ausgabe eines kurzen Abschnitts `### 🏛️ Monolith Goldstandard Delta` (Präzise Vorher/Nachher-Stichpunkte).
  - War bereits alles konform: Ein dezenter Vermerk (`🏛️ Monolith Goldstandard: Konform`) genügt.
- **Verifikations-Abschluss**: Jede Veredelung muss zwingend mit `npm run gate` verifiziert werden (Exit-Code 0).


## Platform Naming
- Always refer to the platform as **Campus-Groovelab** in all UI elements, user communications, messages, and document descriptions.
- Ensure the spelling is precisely "Campus-Groovelab" (with a double 'o' in "Groovelab").

## Avatar Display Rules
- **Musician Avatars**: Only allowed for teachers (`teacher`) and students (`student`) in the **Campus-Groovelab** platform when using the `groovelab` module.
- **GrooveLab Module Selection**: Wenn das GrooveLab-Modul (der gelbe Reiter "GrooveLab") ausgewählt ist, gilt der Musiker-Avatar für dieses Modul (in diesem Fall der Geist-Avatar).
- **Administration & Secretariat**: Users belonging to administration/secretariat (roles `admin` and `secretary`) must not have musician/instrument avatars. Their profile picture must always display the briefing board chalkboard image: `/campus_login_hero.png` across all modules.

## Billing & Pricing Rules
- **Keine Software-Lizenzgebühren**: The base software for **Campus-Groovelab** is provided without license purchase fees (`0,00 € (Inklusive)`).
- Only server hosting/service fees, team members, and pupil activation fees are subject to charge. We exclusively rent and host the required cloud infrastructure for the school/user.
- **Module Pricing & Bundles**:
  - **Campus Module**: Base price is 14,90 € / Mo. (fixed server-hosting flat rate per music school).
  - **GrooveLab Module**: Base price is 9,90 € / Mo. (fixed server-hosting flat rate per music school).
  - **Kombi-Vorteil Bundle**: If both Campus and GrooveLab are booked together, the bundle price is 19,90 € / Mo. (fixed server-hosting flat rate per music school, saving 4,90 € / Mo. compared to 24,80 € / Mo.).
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
    - **Ausschließliche Jahresbeitragszahlung**: Schüler-Direktabrechnungen dürfen **immer nur als Jahresbeitragszahlung (einmalige Schuljahresgebühr)** gebucht und eingezogen werden – **niemals monatlich** (zur Vermeidung von unverhältnismäßigen Banktransaktions- und Buchungsgebühren).
    - *Vollständige Direktabrechnung*: Einmaliger Jahresbeitrag von 5,88 € / Jahr (DE/AT) bzw. CHF 12.00 / Jahr (CH) (umgerechnet 0,49 € / CHF 1.00 / Mo.). Schule wird um die passive Datenbankgebühr komplett entlastet (Schule zahlt 0,00 € / CHF 0.00).
    - *Teilweise Direktabrechnung*: Einmaliger Jahresbeitrag von 4,80 € / Jahr (DE/AT) bzw. CHF 9.60 / Jahr (CH) (umgerechnet 0,40 € / CHF 0.80 / Mo.). Schule deckt den passiven Beitrag (0,09 € / CHF 0.20 / Mo.).
    - *Härtefälle & Geschwisterrabatte*: Individual students can be manually marked in the student administration to exempt them from direct billing (costs remain with the school, no contribution is collected).
## Canonical Billing Sequence & Legal SaaS Nomenclature (Verbindlicher Standard)
- **Plattformweites Master-Wording**: Für alle Gebührenaufstellungen, Gebühren-Vorschauen, Ratenübersichten, Rechnungs-PDFs, Onboarding-Karten und Modals innerhalb der gesamten Plattform MUSS immer die exakt gleiche kanonische Reihenfolge und das gleiche juristisch wasserdichte Wording verwendet werden:
  1. **`Campus-Groovelab Software-Bereitstellung`**: `0,00 € (Inklusive)`
  2. **`Cloud- & Datenbank-Hosting: Modul Campus`**: `14,90 € / Mo.` (sofern Modul Campus aktiv)
  3. **`Cloud- & Datenbank-Hosting: Modul GrooveLab`**: `9,90 € / Mo.` (sofern Modul GrooveLab aktiv)
  4. **`Kombi-Vorteilsrabatt (Infrastruktur-Bündel)`**: `-4,90 € / Mo.` (sofern beide Module aktiv)
  5. **`Service- & Administrationspauschale`**: `[X] Lehrkräfte & Verwaltung aktiv × 0,49 € / Mo.`
  6. **`Basis-Bereitstellung`**: `[X] Schüler × 0,09 € / Mo.` (QR-Landingpages, Stundenplan-, Termin-, Raumänderungs- und Hausaufgabenheft-Sync sowie DSGVO-Datensatz-Hosting)
  7. **`Zusatz-Speichervolumen: Audio-Tresor (+[X] GB)`**: `[X,XX] € / Mo.` (sofern Speicher-Add-on gebucht)
  8. **`Cloud- & Modul-Bereitstellung: GrooveLab`**: `[X] Schüler × 0,49 € / Mo.` (Interaktive Band-Nutzung: Song-Bibliotheken, Band-Rooms, Repertoire; wird verbindlich der B2B-Infrastruktur-Rechnung der Musikschule zugeordnet, da GrooveLab-Aktivierungen immer zu 100% von der Musikschule getragen werden)
  9. **`Cloud- & Modul-Bereitstellung: Campus`**: `[X] Schüler × 0,49 € / Mo.` (Interaktive App-Nutzung: Übe-Timer, Loopstation, Meisterwerk-Protokoll; separate Sammelrechnung Schüleraktivierungen für die Schule; wird bei Betrag 0,00 € automatisch ausgeblendet)
- **Verbotene Begriffe & Abmahnschutz (UWG / PAngV)**: Das Wort „Lizenz“, „Lizenzen“ oder „Lizenzgebühr“ darf NIEMALS in Zusammenhang mit unserem Geschäftsmodell und unserem Angebot verwendet werden. Die Software ist ohne gesonderte Lizenzkaufgebühren im Hosting-Paket inklusive (0,00 €); vermietet und abgerechnet wird ausschließlich die Cloud-, Datenbank-, Bereitstellungs- und Hosting-Infrastruktur. Ebenfalls verboten sind irreführende Blickfang-Werbeaussagen wie „100% kostenlos ohne Bedingungen“ auf Landingpages, sowie die Begriffe „Passiv-Lizenz“, „Karteileichen-Gebühr“, „Schüler-Lizenz“ oder „Profilaktivierung“. Stattdessen gilt das Wording: „Transparentes Cloud-Hosting statt teurer Software-Lizenzen“ und „Keine Einrichtungsgebühr, keine Lizenzkaufgebühren“.

## Invoice Numbering Format (Rechnungsnummer-Logik)
- **B2C Student Activations (Direktabrechnung)**: Format `CG-[STUDENT_HASH_8]-[YYMM]` (e.g., `CG-F63B8EDE-2607`). Uses the platform prefix `CG-`, the first 8 uppercase hex characters of the student ID, and 2-digit year + 2-digit month. Ensures 100% GDPR compliance (no plain text names on bank statements), unique idempotency, and exact 1:1 match with the transfer reference (`Verwendungszweck`).
- **B2B School Invoices (Musikschul-Sammelrechnung)**: Format `RE-[SCHOOL_ID]-[YYMM]-01` (e.g., `RE-104-2607-01`). Uses regular invoice prefix `RE-`, numeric school ID, year/month, and monthly sequence number.

## Module Feature Inclusions (Leistungsumfang der Module)
- **Verwaltungs- und Sekretariats-Nutzer**: Administrations- und Sekretariats-Benutzer (Rollen `admin` und `secretary`) sind in der Bereitstellung für das **Campus-Modul** und das **GrooveLab-Modul** vollständig inklusive und verursachen keine zusätzlichen Bereitstellungsgebühren.
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

## Übepfad Board & Junior UI Goldstandard (Briefing-Board Proportions-Harmonie)
- **Briefing-Board Proportions- & Typografie-Harmonie**: Die Schriftgrößen, Abstände, Icon-Boxen und Kartenproportionen des Junior Übepfad-Boards (`studentUiLevel === 'junior'`) müssen sich ausnahmslos an den bewährten, ergonomischen und großzügigen Maßen der Helden-Karten des Briefing-Dashboards orientieren:
  - *Karten-Radien & Paddings*: Hero- und Grid-Karten mit `borderRadius: 32px` und `padding: 28px` (bzw. `32px` im Notenständer-Modus).
  - *Icon-Boxen*: Standard-Badgegröße `56px × 56px` mit `borderRadius: 18px` und Icon-Größe `28px` (bzw. `64px × 64px` / `size=32` im Notenständer-Modus).
  - *Überschriften & Magazin-Typografie*: Kartentitel und Board-Headings immer `1.38rem` bis `1.55rem` (`fontWeight: 950`, `fontFamily: "'Plus Jakarta Sans', sans-serif"`, `letterSpacing: -0.02em`), Begleittexte `0.92rem` bis `1.05rem` (`fontWeight: 650`, `lineHeight: 1.4`).
  - *Pillen & Status-Badges*: `fontSize: 0.84rem` bis `0.92rem`, `borderRadius: 100px`, `padding: 5px 12px` bzw. `6px 14px`, `fontWeight: 900`.
  - *Buttons*: Primäre Aktionsbuttons `minHeight: 48px` bis `56px`, `borderRadius: 20px`, `fontSize: 1.02rem` bis `1.18rem`, `fontWeight: 950`.

## Schüler-Protokoll & Hausaufgabenheft Rules
- **Universal Uniformity**: All changes in the Schüler-Protokoll (student protocol) must always be applied for all users. The Schüler-Protokoll/Hausaufgabenheft (homework book) layout, headers, first name display, and design selections must look identical across all modules and user accounts.
- **Master Blueprint for Student Homework Representation (Verbindliche Blaupause für Hausaufgaben-Darstellung)**:
  - **Hero-Card & Pure White Stage**: Die Schülervorschau / das Hausaufgabenheft muss immer als reinweiße (`#ffffff`), erhabene Karte mit 20px Apple Squircle-Radius und sanftem 3D-Diffusionsschatten (`0 8px 24px -4px rgba(0,0,0,0.06)`) auf einem ruhigen Hellgrau-Canvas (`#f8fafc`) schweben.
  - **Editorial Flow (Keine Querstreifen-Balken)**: Innerhalb der Schülervorschau dürfen Notizen und Fahrpläne NIEMALS in vollflächig farbigen Hintergrundbalken (wie Rosa-, Blau- oder Grün-Streifen) oder doppelten Kasten-in-Kasten-Rahmen gerendert werden. Sie fließen immer als offene, saubere Magazin-Typografie auf dem weißen Grund mit `36px` Einrückung unter dem jeweiligen Titel.
  - **Farbige Badges & Icons**: Buchcover-Gradienten und Song-Icons bleiben lebendig und farbenfroh. Seitenzahlen werden als grüne Pillen (`S. 1`, `S. 2`) dargestellt.
  - **Stage & Toolbox Separation**: Eingabe-Werkzeuge für Lehrkräfte (*Play-Along Studio*, *Zusätzliche Hausaufgaben-Bemerkungen*, *Interne Notiz*) müssen immer in der zusammenhängenden, matten Werkzeugbank (`#f1f5f9` / `rgba(241, 245, 249, 0.8)`) dezent unterhalb der Hero-Card angeordnet sein.
- **Herkunft von Unterrichts- und Schüler-Aufnahmen (Strikte Zuordnungsregel)**:
  - Aufnahmen, die einer Hausaufgabe angehängt wurden bzw. in der Schülervorschau als Unterrichtsaufnahmen erscheinen (`AUDIO:` in `homeworkNotesList`, `progressItems.homework_notes`, `campus_homework_notes_${student.id}`), wurden **immer von der Lehrkraft erstellt** und müssen **immer auf der linken Seite** im Hausaufgabenheft / Aufnahmen-Tab (*Aufnahmen von deiner Lehrkraft*) dargestellt werden.
  - Aufnahmen, die der Schüler selbst über das Aufnahmegerät / Übe-Studio aufnimmt (`campus_junior_recordings_${student.id}`), gehören **immer auf die rechte Seite** (*Deine eigenen Aufnahmen / Dein Übe-Studio*).
- **Menü-Synchronisation (Aufgaben-Reiter)**: Wenn im Schüler-Dashboard das Aufgabenheft geladen oder geöffnet wird (z. B. via `activeTab === 'homework_book'`), MUSS auch immer der Hauptmenü-Punkt "Aufgaben" (`activeStudentTab === 'homework_book'`) synchron aktiviert sein.

## Loopstation Rules
- **Looping Pause**: Es wird eine zwingende 4-Takte-Pause zwischen den Aufnahme-Spuren verwendet (Variante 1), um eine 100% sample-genaue Synchronität (kein Swallowed Attack) sicherzustellen.

## Datenschutz & Kindersicherheits-Audit Rules
- **Datenschutz-Standard**: Bei jeder Code-Änderung oder Funktions-Implementierung muss geprüft werden, ob der absolute Datenschutzstandard für Schulsoftware (Minimierung von personenbezogenen Daten von Minderjährigen nach DSGVO/COPPA) gewährleistet wird.
- **Datenminimierung**: Da wir auf absolute Datenkomprimierung bei Usern setzen, um den Datenschutz bestmöglich zu erfüllen, werden keine SEPA-, Zahlungs-, Vertragsdaten und auch keine E-Mail-Adressen von Schülern gespeichert.
- **Namens-Anonymisierung & Lehrkräfte-Namensanzeige**:
  - **Schülernamen**: Werden im Lehrer-Dashboard zum Schutz von Minderjährigen auf "Vorname + Anfangsbuchstabe Nachname" (z. B. "Max M.") gekürzt. Im Schüler-Dashboard werden keine persönlichen Namen in UI-Titeln oder Begrüßungen angezeigt (ausschließlich generische Bezeichnungen).
  - **Lehrkräftenamen (Vollständiger Name)**: Lehrkräfte werden auf allen Oberflächen, Dashboards, Landingpages und Übersichten für Schüler und Eltern immer einheitlich mit ihrem **vollständigen Namen** (Vorname + Nachname, z. B. "Severin Landenberger") angezeigt. Lehrkräftenamen dürfen NIEMALS auf "Vorname + Anfangsbuchstabe" gekürzt werden, da Schüler ihre Lehrkraft teils nur beim Nachnamen oder Vornamen kennen und eine Namenskürzung zu Irritationen führen würde.
- **Hardware-Sicherheit**: Alle Audio- und Mikrofonzugriffe müssen beim Verlassen der Oberfläche oder Schließen von Modulen sofort gestoppt werden (kein unbemerktes Weiterleuchten der Aufnahmelampe).
- **Dateien & Fallbacks**: Zu große Base64-Audio-Daten dürfen nicht in Textspalten der Datenbank abgelegt werden. Alle gelöschten Audio-Einträge müssen physisch und vollständig aus dem Cloud-Speicher (Supabase Storage) entfernt werden.
## Campus & GrooveLab Isolation Rules
- **Cross-Module Side Effects**: Any code modification, feature addition, or configuration change in the Campus module must never affect the visual styling, code structures, or backend logic of the GrooveLab module, and vice versa.
- **Strict Verification**: Before finalizing any code edits, verify that no unintended side effects have been introduced to the sibling module. Any shared components or database changes that bridge both modules must be explicitly reviewed and highlighted to the user.

## Desktop Layout Protection Rule
- **Desktop Version Immunity**: All desktop UI layouts, multi-column grids, desktop header tabs, and desktop navigation components across all modules must remain 100% untouched and preserved. Any responsive layout edits, mobile optimizations, or swipe card additions must be strictly scoped to mobile screen sizes (<= 768px) or device simulator classes (.sim-viewport-mobile, .sim-viewport-portrait), with ZERO side-effects on desktop viewports.

## Future Plans & Notes (Zukünftige Vorhaben)
- **Profilauswahl-Sicherheit im Campus-Modul**: Der Familien-Schnellwechsel (Schnellwahl lokaler Profile ohne PIN-Abfrage) ist für Familien mit mehreren Kindern im Campus-Modul gewollt. Im GrooveLab-Modul wird dies nicht benötigt. Bei zukünftigen Modifikationen des Campus-Moduls soll dieses Prinzip dort verankert und gepflegt werden.
- **Peer-to-Peer Termintausch-Börse (Mastermind-Roadmap)**: Für eine spätere Ausbaustufe ist die automatisierte Peer-to-Peer Termintausch-Börse für Eltern/Schüler vorgesehen. Die Umsetzung folgt strikt den 6 Axiomen:
  1. *Lehrer- und Fach-Invarianz*: Tausch ausschließlich innerhalb desselben Lehrers und Fachs.
  2. *Dauer-Isomorphie*: 30 Min. tauscht nur mit 30 Min.; 45 Min. nur mit 45 Min.
  3. *Double-Opt-In der Eltern*: Tauschanfrage wird erst nach ausdrücklicher Bestätigung durch Elternteil B verbindlich.
  4. *1-Tap Lehrer-Veto / Auto-Approval*: Lehrkraft erhält Benachrichtigungskarte mit Veto-Option.
  5. *Atomarer Datenbank-Swap*: Transaktionale Vertauschung der `schedule_occurrences` in Supabase ohne Raum- oder Zeit-Kollisionen.
  6. *Echtzeit-Synchronisation*: Lautlose Aktualisierung für Lehrkraft, Schüler-Dashboards und Sekretariats-Logbuch.
- **Duo- und Gruppenunterricht (@Schüler-Annotation)**: Schnellauswahl-Buttons (`@Schüler`) im Hausaufgabenheft/Meisterwerk-Protokoll, um innerhalb eines gemeinsamen Gruppenstücks individuelle Bemerkungen gezielt im Heft des jeweiligen Schülers hervorzuheben und bei Mitschülern auszublenden.
- **Schnupperstunden-Portal & Lead-Pipeline (Roadmap)**: Öffentliches Self-Service Schnupperstunden-Buchungsportal für die Musikschul-Website mit automatischer Pausen-Slot-Erkennung der Dozenten und 1-Klick-Wandlung in einen Festvertragsentwurf nach erfolgreicher Probestunde.
- **Herrenberg-Audit & Deputats-Ampel (Roadmap)**: Rechtssichere Dokumentation tatsächlich gehaltener Unterrichte für Honorarkräfte (BSG-Urteil B 12 R 3/20 R) und Soll/Ist-Deputatsabgleich für Festangestellte inkl. monatlichem digitalem Signaturlauf am Monatsletzten.
- **Konzert- & Stage-Manager Suite / Band-Finder (Roadmap)**: Automatisierter Programmheft- und Ablauf-Generator für Schulkonzerte (inkl. Umbau-Pausen, Bühnen-Patchplänen und druckbaren DIN A4/A5 Flyern) sowie intelligenter Band-Matching-Algorithmus basierend auf den Skill-Radar-Levels der Schüler.
- **Instrumenten-Pflege & Ergonomie-Suite (Roadmap)**: Intelligenter Nutzungsdauer-Zähler (nach tatsächlichen Übestunden statt Kalendertagen), instrumentenspezifische Pflege-Karten (Saiten, Reeds, Kolophonium, Felle), Ergonomie-Haltungscheck vor der Session, digitaler Eltern-Einkaufszettel und digitaler Lehrer-„Instrumenten-TÜV“-Stempel.

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

## Legal & Business Model Alignment (Single Source of Truth)
- **Kanonisches Legal-Wording Dictionary**: Alle juristischen, preislichen und geschäftsmodellbezogenen Formulierungen müssen zwingend aus `apps/groovelab/src/constants/legalMasterWording.ts` (`LEGAL_MASTER_WORDING`) bezogen werden.
- **Die 5 Unumstößlichen Geschäftsmodell-Axiome**:
  1. **Basis-Software:** `0,00 € (Inklusive)` – Keine Einrichtungsgebühr, keine Lizenzkaufgebühr.
  2. **Absolute Modularität:** Campus (14,90 €), GrooveLab (9,90 €) und Kombi (19,90 €) sind **immer modular wählbar**. Es darf niemals suggeriert werden, dass beide Module zwingend zusammen gebucht werden müssen.
  3. **Zero-Mail-Architektur:** Logins, Ausweise, Notfall-PINs und Gerätewechsel laufen rein clientseitig / per QR-Code / Passkey / AirDrop – niemals mit Mail-Server-Zwang.
  4. **Sammelzahler vs. Direktabrechnung:** GrooveLab wird **immer** vollständig von der Schule getragen. Nur für Campus gibt es optional die Eltern-Direktabrechnung.
  5. **Admin-Identität:** Schulleitung & Sekretariat (`admin`, `secretary`) haben **immer** `/campus_login_hero.png` und niemals Musiker-Avatare.

## Master Blueprint for Onboarding & Digital ID Badges (Verbindliche Blaupause für Onboarding-Erfolg & Digitale Ausweise)
- **Zero-Mail IAM & Sofort-Ausstellung**: Alle Onboarding- und Registrierungs-Flows (Musikschul-Self-Onboarding, Lehrer-Einladung, Schüler-Aktivierung) laufen nach der Zero-Mail-Architektur ab. Nach Abschluss der Registrierung wird dem Benutzer sofort der digitale Master-Ausweis (QR-Token, Ausweis-PIN, Geräte-PIN) live auf dem Bildschirm übergeben, ohne dass Bestätigungs-E-Mails abgewartet werden müssen.
- **2-Spalten-Aktionsleiste für Export-Werkzeuge**: Auf der Onboarding-Erfolgsstufe (`Step 3`) müssen die Download- und Export-Optionen (*QR-Ausweis herunterladen* als JPG und *Apple Wallet Pass* als `.pkpass`) immer kompakt in einem 2-Spalten-Grid (`display: grid; grid-template-columns: 1fr 1fr; gap: 8px;`) nebeneinander gerendert werden. Die biometrische Passkey-Einrichtung (*WebAuthn / Touch ID / Face ID*) steht als primäres Sicherheits-Feature vollflächig darüber. Der Sprung ins Dashboard (*Zum Dashboard fortfahren ➔*) fungiert als unübersehbarer, dominanter Haupt-CTA am Fuß der Karte.
- **Apple Pass Squircle Design & Lichtkante**: Der digitale Ausweis muss immer als erhabene Karte mit 20px Squircle-Radius, transluzenter oberer Lichtkante (`inset 0 1px 0 rgba(255, 255, 255, 0.45)`), dezentem Diffusionsschatten (`0 12px 28px -4px rgba(52, 168, 83, 0.25)`) und scharfem, weiß hinterlegtem QR-Code-Inlay gerendert werden.
- **100% Monochrome Icons & Kopier-Ergonomie**: In Hinweis- und Zugangsdaten-Boxen dürfen NIEMALS mehrfarbige Standard-Emojis (wie ⚠️) verwendet werden. Es müssen ausschließlich monochrome Lucide-Icons (z. B. `<ShieldCheck size={14} />`) zum Einsatz kommen. Zugangsdaten (Ausweis-PIN und Geräte-PIN) müssen ein klares Monospace-Formatting aufweisen und optional per Quick-Tap kopierbar sein.

## Production Dev-Tools & Debug Immunity (Verbot von Entwickler-UI im Produktionsbetrieb)
- **Absolute Live Isolation**: Im produktiven Live-Betrieb (auf `campus-groovelab.de` und allen Produktiv-Domains) dürfen NIEMALS Entwickler-Buttons, Debug-Overlays, Floating Simulator Badges (wie `[ 🛠️ Dev Simulator Shift+D ]`) oder Test-Login-Widgets für reguläre Endnutzer gerendert werden.
- **Environment-Gating Pflicht**: Alle Simulator-, Debug- und Entwickler-Komponenten (z. B. `DeviceSimulator.tsx`) müssen strikt durch `import.meta.env.DEV` und Hostname-Prüfungen (`localhost`, `127.0.0.1`) abgesichert sein. Im Produktionsbetrieb (`!isDev`) rendern diese Komponenten ausschließlich transparenten `{children}` Inhalt ohne DOM-Overhead oder Event-Listener.

## Raumbuchungen & Sekretariats-Bestätigung Rule
- **Zwingende Sekretariats-Bestätigung für Lehrkraft-Buchungen**: Wenn eine Lehrkraft einen Raum bucht, muss die Buchung IMMER initial im Status unbestätigt (`status: 'pending'`, `is_confirmed: false`) angelegt werden und zwingend durch das Sekretariat bzw. die Schulleitung bestätigt werden.
- **Doppelrollen-Gültigkeit**: Diese Regel gilt ausnahmslos auch dann, wenn die buchende Lehrkraft eine Doppelrolle als Administrator (`admin`) oder Sekretariat (`secretary`) innehat. Buchungen aus dem Lehrkraft-Kontext/Buchungsformular dürfen sich niemals selbst automatisch freigeben.

## Enterprise Zero-Trust Security & Data Isolation Axioms (Die 7 Unverrückbaren Sicherheits-Axiome)
1. **Absoluter Zero-Knowledge & Datenminimierung (DSGVO/COPPA)**:
   - Schülervornamen sind im PostgreSQL-Kernel mittels PGP verschlüsselt (`student_first_names`).
   - Die Kernel-Funktion `get_encryption_key()` darf NIEMALS an `anon` oder `authenticated` vergeben werden (Zugriff ausschließlich für interne Kernel-Trigger).
   - Schülernamen im Lehrer-Dashboard MÜSSEN immer auf "Vorname + 1. Buchstabe Nachname" (z. B. "Max M.") maskiert sein. Im Schüler-Dashboard werden keine persönlichen Namen in Titeln oder Begrüßungen gerendert.
   - Lehrkräftenamen werden auf allen Dashboards und Landingpages IMMER vollständig angezeigt ("Severin Landenberger").
2. **Keine Login-Abfragen via Datenbank-ID (IDOR / BOLA Schutz)**:
   - Es ist STRENGSTENS VERBOTEN, in Login-, Authentifizierungs- oder Onboarding-Queries nach der primären Datenbank-ID (`id.eq.`) zu suchen.
   - Authentifizierungen dürfen AUSSCHLIESSLICH über dedizierte, unvorhersehbare Secrets (`qr_token`, `teacher_qr_token`, `ausweis_nummer` + PIN) erfolgen.
3. **Lückenlose Row-Level Security (FORCE RLS)**:
   - Jede einzelne Tabelle im `public`-Schema MUSS `rowsecurity = TRUE` besitzen.
   - Alle Mandantenabfragen MÜSSEN serverseitig an `school_id = get_current_user_school_id()` gebunden sein.
   - Anonyme Abfragen an Tabellen müssen immer `0 Zeilen` oder `HTTP 401` zurückgeben.
   - Sensible Auth-Tabellen (`user_secrets`, `school_secrets`) verbleiben im unexponierten Schema `private_auth`.
4. **Verbot von dynamischem SQL & Fuzzy-Matching Backdoors**:
   - Dynamische SQL-Execution-Funktionen (`execute_sql`, `get_sql_json`, `eval`) sind DAUERHAFT VERBOTEN.
   - Registrierungs- und Onboarding-Flows dürfen NIEMALS unscharfe Namensabgleiche nutzen.
   - Schüler-Onboardings laufen ausschließlich über Einmal-Tokens mit 30-Tage-TTL und Single-Use Entwertung (`used_at = NOW()`).
5. **FinTech Client-Shield & Anti-Tampering (Production Isolation)**:
   - In der Produktion (`!isDev`) MÜSSEN `console.log`, `console.info` und `console.debug` stummgeschaltet sein.
   - DevTools-Tastenkombinationen (F12, Strg+Shift+I) werden auf Kiosk- und Schüler-Oberflächen abgefangen.
   - Das `PrivacyShieldOverlay` aktiviert sich automatisch bei Tab-Wechsel oder Minimierung.
   - Beim Logout MUSS `sessionZeroize()` alle Tokens und In-Memory-Daten unwiderruflich überschreiben.
6. **Supply-Chain-Schutz & Subresource Integrity (SRI)**:
   - Jeder Build MUSS kryptografische SHA-384 Hashes für alle JS/CSS-Bundles in `dist/index.html` injizieren.
   - Ein NIST SP 800-161 SBOM muss mit jedem Release generiert werden (`dist/sbom.json`).
   - Die Content Security Policy (CSP) in Nginx verbietet alle unautorisierten Third-Party Script- und Connect-Quellen.
7. **URL- & Adresszeilen-Hygiene (Path Scrubbing)**:
   - Sobald ein Token aus `/qr/:token` oder `/onboarding/:token` in den Speicher übernommen wurde, MUSS die Adresszeile per `scrubSensitiveUrlPath('/')` sofort bereinigt werden, um History- und Referrer-Leaks zu verhindern.

