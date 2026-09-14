# Campus-Groovelab – Technische Architektur & Sicherheitsstandards

## 1. Technologiestack
* **Frontend**: React 18, TypeScript (Strict Mode, 0 % `any`), Vite als Bundler, Tailwind CSS + Lucide Icons.
* **Backend / Database**: Supabase (PostgreSQL), Supabase Realtime, Edge Functions / PL/pgSQL RPCs.
* **Architektur**: Single Page Application (SPA) mit nativer Progressive Web App (PWA) Unterstützung.
* **Audio-Engine**: Web Audio API mit nativer iOS-AudioContext-Freischaltung und universellem `MediaRecorder` (`audio/mp4` für Safari, `audio/webm` für Chrome).

---

## 2. Enterprise+ Security Governance (OWASP ASVS Level 3 / Fail-Closed)

### Zero-Trust Frontend
* Browser-JavaScript, `localStorage`, `sessionStorage`, React-State und URL-Parameter besitzen **niemals Autorisierungs- oder Sicherheitswirkung**.
* Keine sicherheitsrelevanten Entscheidungen im Client.

### Autoritative Auth-RPCs
Logins und Credential-Prüfungen laufen ausnahmslos über serverseitige PostgreSQL-Funktionen:
* `authenticate_by_credential(p_credential, p_school_id)`
* `authenticate_webauthn_credential(p_credential_id, p_challenge, p_school_id)`
* `login_master_admin(p_username, p_password, p_totp_code)`
* **Streng verboten**: Direkte PostgREST-Tabellenabfragen auf sensible Tabellen (z. B. `.eq('qr_token', ...)`).

### Fail-Closed Doktrin
Schlägt ein Sicherheits-RPC fehl oder ist nicht erreichbar, bricht die Operation sofort ab und wirft einen Fehler. Es gibt keine unsicheren Fallbacks.

### Zero-Secret-Leakage
* Spalten wie `parent_pin`, `personal_pin`, `master_admin_password`, `two_factor_secret`, `password_hash` sind in lesbaren SELECT-Statements oder Client-Objekten **vollständig ausgeschlossen**.
* Der Client empfängt ausschließlich vorberechnete boolesche Flags (`has_parent_pin`, `has_personal_pin`, `is_pin_activated`, `is_2fa_enabled`).

### Server-Side PIN-Verifikation
* PIN-Prüfungen (`verify_personal_pin`, `verify_parent_pin`) und Resets erfolgen zu 100 % in der Datenbank.
* Kein JavaScript-Vergleich (`storedPin === input`) im Browser.

### Mandantentrennung (Multi-Tenancy)
* Jede Abfrage und Row-Level Security (RLS) Policy ist strikt an `school_id = get_current_user_school_id()` gekoppelt.
* Default-Deny-Prinzip auf allen Tabellen.

---

## 3. Mobile- & PWA-Goldstandard
* **Desktop Layout Immunity**: Sämtliche mobilen Optimierungen beschränken sich strikt auf Bildschirme `<= 768px`. Desktop-Grid-Layouts (`>= 769px`) bleiben unberührt.
* **Hardware- & Viewport-Axiome**:
  * Safe-Area-Handling: `env(safe-area-inset-*)` für Notch, Dynamic Island und Home-Bar auf allen Headern und Leisten.
  * Dynamische Viewport-Höhe `100dvh` (mit `100vh` Fallback).
  * **Zero Content Occlusion**: Ausreichend `padding-bottom` (Bottom-Bar + Safe-Area + 32px), damit scrollbare Inhalte niemals durch Menüs verdeckt werden.
* **Ergonomie**:
  * Touch-Trefferzonen von mindestens **44×44px** (Apple HIG / Material 3 Standard).
  * `touch-action: manipulation` (0ms Klick-Delay).
  * Anti-Zoom: Mindestschriftgröße von `16px` in allen Input-Feldern auf iOS Safari.
