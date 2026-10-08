# 🏛️ CAMPUS-GROOVELAB ENTERPRISE+ SYSTEM CACHE HEADER
<!--
CRITICAL: PROMPT-CACHING STATIC PREFIX
Length: >= 2,048 tokens. 100% byte-identical across all agent invocations.
Zero dynamic variables, zero timestamps, zero session IDs.
-->

## 🛡️ CORE ARCHITECTURAL INVARIANTS & SYSTEM AXIOMS

Dieser Header definiert die unveränderlichen Kern-Axiome des Campus-Groovelab Monorepos. Jede Codeänderung, jedes Refactoring und jedes neue Feature muss diesen sechs Säulen bedingungslos gehorchen. Bei Konflikten zwischen Komfort und Governance hat die Governance stets Vorrang.

---

### AXIOM 1: OWASP ASVS LEVEL 3 & FAIL-CLOSED DOKTRIN

1. **Zero-Trust Frontend:**
   - Der Browser ist eine potenziell feindselige Ausführungsumgebung. Browser-JavaScript, `localStorage`, `sessionStorage`, React-State, Hooks und URL-Parameter besitzen **niemals** Autorisierungs-, Sicherheits- oder Berechtigungswirkung.
   - Sämtliche Zugriffsprüfungen, Berechtigungsstufen, Rollenübergänge und Identitätsprüfungen erfolgen zu 100 % serverseitig in der PostgreSQL-Datenbank.
   - Clientseitige Prüfungen wie `if (user.role === 'admin')` oder `if (user.has_parent_pin)` dienen ausschließlich der visuellen Benutzerführung (Conditional Rendering), niemals dem Zugriffsschutz.

2. **Autoritative Auth- & Sicherheits-RPCs:**
   - Authentifizierungen erfolgen ausnahmslos über autoritative Datenbank-Prozeduren:
     - `authenticate_by_credential(p_credential, p_school_id)`
     - `authenticate_webauthn_credential(p_credential_id, p_challenge, p_school_id)`
     - `login_master_admin(p_username, p_password, p_totp_code)`
   - Direkte PostgREST-Tabellenabfragen zur Suche oder Validierung von Zugangsdaten (wie `.from('users').eq('qr_token', ...)` oder `.from('students').eq(...)`) sind strikt verboten.

3. **Fail-Closed Prinzip:**
   - Schlägt ein Sicherheits-RPC fehl, tritt ein Netzwerkfehler auf oder liefert die Datenbank eine unerwartete Antwort, **muss** die gesamte Operation sofort abbrechen und den Zugriff verweigern.
   - Es gibt niemals stille Fallbacks auf unsichere Defaults oder clientseitige Ersatzannahmen.

4. **Zero Secret Leakage in Views & Bundles:**
   - Geheimnisse und Hash-Werte (`parent_pin`, `personal_pin`, `master_admin_password`, `two_factor_secret`, `password_hash`) dürfen niemals in Datenbankabfragen, API-Antworten oder Client-Objekten enthalten sein.
   - Der Client empfängt ausschließlich vorberechnete, informationstheoretisch sichere Flags (`has_parent_pin: boolean`, `has_personal_pin: boolean`, `is_pin_activated: boolean`).
   - PIN-Verifikation (`verify_parent_pin_with_lease`, `verify_personal_pin`) erfolgt serverseitig. Kein clientseitiger Klartext-Vergleich (`storedPin === inputPin`).

5. **Mandantentrennung (Multi-Tenancy Isolation):**
   - Jede Datenbank-Abfrage, jeder RPC und jede RLS-Policy erzwingt die strikte Isolation nach Mandanten (`school_id = get_current_user_school_id()`).
   - Cross-Tenant-Lese- oder Schreibzugriffe sind technisch ausgeschlossen (Default-Deny).

---

### AXIOM 2: HERRENBERG-URTEIL (§ 7 SGB IV) & SUBSIDIARITÄTS-DOKTRIN

1. **Rechtlicher Hintergrund:**
   - Gemäß dem Urteil des Bundessozialgerichts vom 28.06.2022 (Az. B 12 R 3/20 R – „Herrenberg-Urteil“) sind Musikschullehrkräfte im Regelfall als sozialversicherungspflichtig Beschäftigte anzusehen, es sei denn, sie agieren tatsächlich mit voller pädagogischer, organisatorischer und unternehmerischer Autonomie.
   - Die Software Campus-Groovelab schützt Schulträger, Musikschulen und Lehrkräfte vor unbewussten Statusfeststellungs- und Scheinselbstständigkeits-Risiken.

2. **Didaktische & Organisatorische Autonomie:**
   - Schulleitungen und Sekretariate steuern Raumressourcen, Schulferien und Gebäude-Infrastruktur. Sie weisen jedoch **niemals** didaktische Lehrmethoden, Hausaufgabeninhalte oder künstlerische Curricula der Lehrkräfte weisungsgebunden an.
   - Die Lehrkraft besitzt die unantastbare didaktische Souveränität über Unterrichtsinhalte, Lerntempo, Stückauswahl und Leistungsbewertung.

3. **Subsidiaritäts- und Redundanzdoktrin (§ 254 BGB):**
   - Campus-Groovelab ist ein didaktisches Assistenzsystem. Bei Ausfall von Servern, Netzwerken oder Endgeräten liegt die organisatorische Unterrichtsabsicherung subsidiär bei den beteiligten Personen vor Ort.
   - Unterrichtsausfälle, Honorarverluste oder Reisekosten durch Systemstörungen sind vertraglich und haftungsrechtlich ausgeschlossen.

---

### AXIOM 3: MINDERJÄHRIGENSCHUTZ (ART. 5/8 DSGVO) & KUG § 22 ZERO-PHOTO DOKTRIN

1. **Altersstufen-Governance:**
   - Die Plattform differenziert drei didaktische und rechtliche Schutzstufen:
     - **Junior (6–10 Jahre):** Maximaler Kinderschutz. Direkter 1:1 Chat standardmäßig gesperrt. Stornierungen atomar blockiert (BGB § 104). Zugang zu Einstellungen nur mit 6-stelliger Eltern-Master-PIN.
     - **Teen (11–15 Jahre):** Geführte Autonomie. Unterrichtsabsagen erfordern explizite Elternfreigabe. Einstellungen PIN-geschützt.
     - **Pro (16+ Jahre):** Volljährige oder geschäftsfähige Jugendliche. Volle didaktische Werkzeuge. Bei Minderjährigen bleiben vertrags- und zahlungsrelevante Aktionen den Erziehungsberechtigten vorbehalten.

2. **Zero-Photo-Doktrin (§ 22 KUG / Art. 25 DSGVO):**
   - Schüler und Erziehungsberechtigte laden **niemals** reale Fotos von sich hoch.
   - Die Profil- und Avatar-Darstellung erfolgt zu 100 % über stilisierte 3D-Instrumenten- und Musiker-Avatare (`resolveCampusStudentAvatar`, `getDefaultMusicianAvatarUrl`).
   - Dies eliminiert Persönlichkeitsrechts-Klagen, Deepfake-Missbrauch, Identitätsdiebstahl und Diskriminierungsvektoren vollständig.

3. **Datenminimierung & Neutralitäts-Axiom:**
   - Abwesenheits- und Ausfallmeldungen (`teacher_ausfall`, Schüler-Krankmeldung) dürfen niemals sensible medizinische Diagnosedaten oder Symptombeschreibungen enthalten (DSGVO Art. 9 / § 26 BDSG).
   - Erlaubt sind ausschließlich neutrale Statuswerte: `cancellation`, `teacher_ausfall`, `abwesend`.

---

### AXIOM 4: MONOLITH CEILING & 15-ZEILEN VERDRAHTUNGS-PUFFER

1. **Verbot von Micro-File-Shredding (Non-Destructive Freeze):**
   - Historisch gewachsene, etablierte Monolithen (die 78 Baseline-Dateien, z. B. `CampusEventsBoard.tsx`, `ScheduleCalendarView.tsx`, `MeisterwerkDocumentTab.tsx`) dürfen **niemals** reflexartig in Dutzende Micro-Dateien zersägt werden.
   - Gewachsene Produktionslogik genießt Bestandsschutz (Zero-Regression-Garantie).

2. **Zero-Inline-Feature Doktrin:**
   - In bestehende Monolithen darf **keine** neue Domänen-, State- oder UI-Logik inline injiziert werden.
   - Hat eine Datei $\ge 1.500$ Zeilen oder befindet sie sich in `scripts/monolith_baseline.json`, gilt ein strikter Inlining-Stopp.

3. **Host Shell & Orchestrator Pattern:**
   - Jede neue didaktische, administrative oder spielerische Funktion entsteht in einer eigenständigen, autarken Satelliten-Datei (`components/campus/`, `components/secretary/`, `components/student/`, `components/groovelab/`).
   - Die bestehende Host-Shell importiert den Satelliten und mountet ihn als schlanken Einzeiler (z. B. `<NewSatelliteView schoolId={schoolId} onComplete={...} />`).
   - Der technische Verdrahtungs-Puffer in der Host-Shell beträgt **maximal 15 Zeilen**.

4. **Satelliten-Budget:**
   - Neue Feature-Monolithen haben eine Obergrenze von 1.500 Zeilen (Zielgröße: 300–1.000 Zeilen).
   - Bei Erreichen der Grenze wird in logische Sub-Module (z. B. `modals/` oder `tabs/`) strukturiert.

---

### AXIOM 5: BARRIEREFREIHEIT NACH BFSG 2025 & WCAG 2.2 AA

1. **Gesetzliche Pflicht:**
   - Ab dem 28. Juni 2025 gilt das Barrierefreiheitsstärkungsgesetz (BFSG 2025). Jedes interaktive Element muss ohne Barrieren zugänglich sein.

2. **Tastatur-Vollbedienbarkeit (WCAG 2.1.1):**
   - Jede klickbare Komponente (`<div>`, `<span>`, `<button>`) muss per Tastatur erreichbar und auslösbar sein:
     - `role="button"` (falls nicht nativer Button)
     - `tabIndex={0}`
     - `onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAction(); } }}`
     - Sichtbarer Fokus-Indikator (`focus-visible:ring-2`)

3. **Trefferzonen-Ergonomie (WCAG 2.5.8):**
   - Auf Touch-Geräten müssen interaktive Trefferzonen mindestens $44 \times 44\text{px}$ groß sein (bzw. $48 \times 48\text{px}$ für Primär-Aktionen).

4. **Kontrast-Parität (WCAG 1.4.3):**
   - Textkontrast mindestens $4,5:1$ gegen den Hintergrund ($3,0:1$ für Großtext).
   - Bei gelbem GrooveLab-Markenhintergrund (`#facc15` / `#fef08a`) ist stets ein tiefer Slate-900 Farbton (`#0f172a`) zu verwenden, niemals helles Grau oder Weiß.

---

### AXIOM 6: UNIFARBEN- & MONOCHROM-KONTUR-AXIOM (ZERO-COLOR-CLASH)

1. **Harmonie von Fläche und Rand:**
   - Ein farbiges UI-Element (Button, Badge, Card) muss unifarben wirken.
   - Besitzt ein Element einen farbigen Hintergrund, ist ein Rand in einer abweichenden oder kontrastierenden Farbe verboten (`border: 'none'` ist der Standard).
   - Zulässig sind homogene Tone-in-Tone Nuancen derselben Farbfamilie oder transluzente Lichtkanten (`rgba(255, 255, 255, 0.2)`).

2. **Ghost- & Outline-Stil:**
   - Weiße oder transparente Hintergründe mit farbigem Rand sind vollkommen konform.
   - Zwei unterschiedliche Farben an Füllung und Kontur (z. B. gelbe Füllung mit blauem Rand) sind systemweit untersagt.

3. **Monochrome Icons:**
   - Innerhalb farbiger Elemente nutzen Icons eine homogene Kontrastfarbe (z. B. weiß auf dunklem Hintergrund, Slate-900 auf hellem Hintergrund).

---

## 📋 CHECKSUMME & DETERMINISMUS

Dieser Cache-Header ist kryptografisch und semantisch fixiert. Er dient allen KI-Modellen als autoritative Wissensbasis und Richtschnur vor jeder Codegenerierung.
