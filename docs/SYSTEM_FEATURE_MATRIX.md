# 📖 Campus-Groovelab: Living System Feature Matrix & Product Bible
> **Klassifizierung:** Autoritativer Fähigkeitskatalog, Architektur-Spiegel & Exocortex  
> **Single Source of Truth (SSOT)** für alle Plattformfunktionen, Bounded Contexts und System-Invarianten.  
> **Letzte Aktualisierung:** 2026-09-17 (Post-Monolith Modularization Release)

---

## 🧭 Das 4-Säulen-Architekturmodell & Modulare Topologie

Alle Funktionen von **Campus-Groovelab** sind strikt in vier voneinander isolierte **Bounded Contexts** unterteilt:

```
┌─────────────────────────────────────────────────────────────┐
│                   App.tsx (Root Container, 51 Zeilen)       │
│                                │                            │
│                 useCampusAppOrchestrator.ts                 │
├───────────────────────────────┬─────────────────────────────┤
│ 🟢 CAMPUS (Didaktik & Dialog) │ 🟡 GROOVELAB (Audio & DAW)  │
│    Akzent: Grün (#34a853)     │    Akzent: Gelb (#facc15)   │
│    Fokus: Schüler & Pädagogen │    Fokus: Musiker & Üben    │
├───────────────────────────────┼─────────────────────────────┤
│ 🔴 VERWALTUNG / ADMIN / BILL  │ 🛡️ CORE SECURITY & PLATFORM │
│    Akzent: Rot (#ea4335)      │    Akzent: Slate / Blau     │
│    Fokus: Schulleitung/Sekr.  │    Fokus: Zero-Trust & ASVS │
└───────────────────────────────┴─────────────────────────────┘
```

---

## 🏗️ Topologie der Kern-Orchestrierung

| Modul / Komponente | Dateipfad | Verantwortungsbereich & Bounded Context |
|---|---|---|
| **Root Shell** | [`apps/groovelab/src/App.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/App.tsx) | Ultrakompakter Root-Container (51 Zeilen), bindet `DeviceSimulator`, `LegalConsentGate` und den Master-Orchestrator. |
| **Master Orchestrator** | [`apps/groovelab/src/hooks/useCampusAppOrchestrator.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/hooks/useCampusAppOrchestrator.ts) | Zentrale Koordination aller 18 Sub-Hooks, Realtime-Sync, Metrics und deterministische Prop-Assemblierung. |
| **Visual App Layout** | [`apps/groovelab/src/components/layout/CampusAppLayout.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/layout/CampusAppLayout.tsx) | Desktop-Sidebar, Mobile-Header, Content-Router (`CampusMainContentRouter`), PWA-Bottom-Bar, Toasts. |
| **System Banners** | [`apps/groovelab/src/components/layout/CampusSystemBannersOverlay.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/layout/CampusSystemBannersOverlay.tsx) | Broadcast-Banner, Maintenance-Lockouts, Ghost-Support-Indikatoren, Offline-Sync-Badges, PWA-Toasts. |
| **Modal Dialog Hub** | [`apps/groovelab/src/components/layout/CampusAppModalsHub.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/layout/CampusAppModalsHub.tsx) | Zentraler Orchestrator aller Dialoge (Bandgründung, Profile, Help, Legal, Security Suite, Onboarding). |
| **Startup Gates** | [`apps/groovelab/src/components/layout/CampusStartupGates.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/layout/CampusStartupGates.tsx) | Kiosk-Bootstrapping, Shared Views, Deletion Prompts, Landing- und Login-Screen Resolution. |

---

## 1. 🟢 Bounded Context: CAMPUS (Didaktik, Kommunikation & Organisation)

| Feature-ID | Feature-Name | Zielgruppe | UI-Einstiegspunkt | Autoritativer Backend-RPC / Tabelle | Golden Invariants & Core Rules |
|---|---|---|---|---|---|
| **CAM-01** | **Adaptive UI-Levels** | Schüler, Eltern | `ParentControlsModal.tsx` | RPC: `save_parent_controls`<br>Table: `users.campus_ui_level` | • 3 didaktische Stufen: `junior`, `teen`, `pro`<br>• DB ist SSOT; Broadcast via Realtime auf alle Instanzen ohne Reload<br>• Änderungen durch Eltern sind revisionssicher in `public.audit_logs` auditiert |
| **CAM-02** | **Hausaufgaben & Meisterwerk-Doku** | Schüler, Lehrer | `MeisterwerkDocumentationModal.tsx`, `MeisterwerkRecordingsTab.tsx` | Table: `assignments`, `student_homework` | • Fortschritts- & Audio-Uploads an Schülerordner gekoppelt<br>• BFSG 2025 / WCAG 2.2 AA Tastatursteuerung (`role="button"`, `tabIndex={0}`, Enter/Space) |
| **CAM-03** | **Campus Messenger & Direct Messages** | Schüler, Lehrer, Eltern | `CampusDirectMessages.tsx`, `MessagesTabContainer.tsx` | Table: `messages`, `channels`<br>Supabase Realtime | • Strikte Mandantentrennung (`school_id`)<br>• DSGVO-konforme Eltern-Kanal-Kopplung bei Minderjährigen<br>• Secretary-Read-Shield gegen unbefugte Einblicke in pädagogische Chats |
| **CAM-04** | **Campus Events & Schwarzes Brett** | Alle Rollen | `CampusEventsBoard.tsx` | Table: `campus_events`, `announcements` | • Rollenbasierte Sichtbarkeit (Schule, Klasse, Öffentlicher Aushang)<br>• Revisionssicherer Audit-Trail bei Löschungen |
| **CAM-05** | **Schüler-Termin- & Slot-Planer** | Schüler | `StudentScheduleSlotsModal.tsx` | Table: `lessons`, `schedules` | • Desktop- und Mobile-optimierte Slot-Auswahl<br>• Schutz vor Überbuchung & Raumkonflikten |
| **CAM-06** | **Elternbereich & PIN-Freigabe** | Eltern | `CampusPinUnlockModal.tsx`, `ParentCampusActivationModal.tsx` | RPC: `verify_parent_pin`<br>RPC: `set_parent_pin` | • 100% serverseitige PIN-Prüfung; niemals JavaScript-Vergleich<br>• Rate-Limiting gegen Brute-Force; SHA-256 Hash |
| **CAM-07** | **Lehrer-Namenskonvention** | Alle Rollen | Plattformweit | Helper: `formatTeacherFullName` | • Strikte Vorname-Nachname-Doktrin ohne Inversion<br>• Maskierung von PII für schulfremde Benutzer |
| **CAM-08** | **Pädagogische Notizen & Mängel-Echtzeit-Kaskade** | Lehrer, Schulsekretariat | `BriefingNotesCard.tsx`, `TeacherTagesplanWidget.tsx`, `SecretaryBriefingView.tsx` | Table: `user_notes`<br>Service: `notesService`<br>Supabase Realtime | • 0ms Same-Window In-Memory Event Bus + Cross-Tab & Supabase Realtime Broadcast<br>• Sofortige reaktive Aktualisierung des Lehrer-Dashboards (Tagesplan-Mängel-Banner mit sanftem Puls)<br>• 1% Goldstandard Raum-Zuordnung: Kontextuelle Live-Slot-Erkennung, interaktiver Raum-Chip vor dem Senden & 1-Tap nachträgliche Raumkorrektur<br>• Revisionssichere Mängel-Behebung (`resolveRoomIssue`) |

---

## 2. 🟡 Bounded Context: GROOVELAB (Audio-Engine, Kreativität & DAW)

| Feature-ID | Feature-Name | Zielgruppe | UI-Einstiegspunkt | Autoritativer Backend-RPC / Tabelle | Golden Invariants & Core Rules |
|---|---|---|---|---|---|
| **GRV-01** | **WebAudio Synth & Metronom Engine** | Schüler, Lehrer | `GrooveLoopstation.tsx`, `GroovePracticeCompanion.tsx` | WebAudio API Context | • AudioContext-Unlock beim ersten Klick/Tap<br>• iOS-Stummschaltungs-Bypass & Wakelock (`navigator.wakeLock`) bei aktiver Session |
| **GRV-02** | **Audio-Recorder & Übe-Track-Export** | Schüler | `AudioTrackCarousel.tsx`, `AudioEditorModal.tsx` | Browser MediaRecorder API | • Universelles Audioformat (`audio/mp4` für iOS Safari, `audio/webm` für Chrome)<br>• Automatische Pegelnormalisierung |
| **GRV-03** | **Musiker-Avatar-System (Geist)** | Schüler, Lehrer | `StudioAvatar.tsx`, `StudentAvatarDashboard.tsx` | Table: `users.avatar_url` | • **NUR** im GrooveLab-Modul aktiv!<br>• Verbot von Musiker-Avataren für Verwaltung & Schulleitung |
| **GRV-04** | **GrooveLab Sammelzahler-Garantie** | Schüler, Schulträger | `BillingDashboard.tsx` | Abrechnungs-Engine | • GrooveLab-Aktivierungen werden **ausnahmslos zu 100% von der Musikschule getragen** (Sammelzahler)<br>• Niemals Schüler-Direktabrechnung für GrooveLab |
| **GRV-05** | **Ensemble & Band-Matching Suite** | Schüler, Lehrer | `EnsembleDashboard.tsx`, `StudentBandMatchingSuite.tsx` | Table: `bands`, `band_members` | • Automatische Instrumenten-Zuweisung und Bandgründung<br>• Kollaboratives Üben und Playback-Synchronisation |
| **GRV-06** | **Song-Repertoire & PDF-Reader** | Schüler, Lehrer | `StudentPracticeRepertoireTabs.tsx` | Table: `songs`, `song_skills` | • Zweiteilige Didaktik (Starter vs. Original)<br>• Stage-Ready-Status-Workflow |
| **GRV-07** | **1% Mobile Network Audio & Deferred Sync** | Schüler, Lehrer | `StudentBriefingTab.tsx`, `StudentAvatarDashboard.tsx`, `GrooveLoopstation.tsx` | `NetworkAwarenessService.ts`, `offlineAudioVault.ts` | • Adaptive Bitrate: 320 kbps (WLAN), 128 kbps (Mobilfunk Smart-Audio, -60% Daten), 80 kbps (Saver)<br>• 0ms IndexedDB-Tresor-Sicherung<br>• Deferred Cloud-Upload im Mobilfunk bis WLAN (mit 1-Tap-Override)<br>• LRU Cache-Eviction (Max 250MB / 75 Items) |
| **GRV-08** | **Progressives Song-Batching & DOM-Windowing** | Schüler | `StudentPracticeRepertoireTabs.tsx` | DOM Engine | • Progressive Batched Rendering (12 Üben / 16 Repertoire initial)<br>• IntersectionObserver Sentinel + barrierefreier Tastatur-Load-Button (BFSG/WCAG AA)<br>• Hält DOM-Knotenzahl stabil < 300; 0ms Jank auf mobilen Geräten |
| **GRV-09** | **Pitch-Neutral WSOLA Granular Time-Stretching** | Schüler, Lehrer | `DidacticWsolaEngine.ts` | WebAudio Graph Engine | • Stufenloses Time-Stretching von 0.5x bis 1.5x bei 100% stabiler Tonhöhe (Kammerton A=440Hz)<br>• 60ms Hann-Overlap-Add verhindert Tonhöhensprünge beim Üben im reduzierten Tempo |
| **AUD-02** | **Hardware Feedback Guard & Headphone Awareness** | Schüler, Lehrer | `AudioCaptureEngine.ts` | MediaDevices API | • Dynamische Kopfhörer-Erkennung via `devicechange`<br>• Automatisches Echo-Cancelling & Feedback-Schutz ohne Kopfhörer; 100% Studio-Bypass mit Kopfhörern |

---

## 3. 🔴 Bounded Context: VERWALTUNG, ADMIN & BILLING (Organisation & Finanzen)

| Feature-ID | Feature-Name | Zielgruppe | UI-Einstiegspunkt | Autoritativer Backend-RPC / Tabelle | Golden Invariants & Core Rules |
|---|---|---|---|---|---|
| **ADM-01** | **0,00 € Software-Bereitstellung (Hosting-Only)** | Schulleitung | `BillingDashboard.tsx`, `SecretaryBillingModalsHub.tsx`, `InvoicePreviewModal.tsx` | SaaS Billing Engine | • Software-Bereitstellung ist immer `0,00 € (Inklusive)`<br>• Berechnet werden ausschließlich Cloud-Hosting, Server-Infrastruktur & Service |
| **ADM-02** | **Schüler-Direktabrechnung (Campus)** | Schulleitung, Eltern | `BillingDashboard.tsx`, `SecretaryBillingModalsHub.tsx` | Table: `student_billing_plans` | • **Ausschließlich jährlicher Schuljahresbeitrag** (max. 5,39 € / Jahr DE/AT bzw. CHF 11.00 CH) – niemals monatlich (Gebührenschutz)<br>• Härtefälle & Geschwisterrabatte manuell ausnehmbar |
| **ADM-03** | **Sammelzahler-Modell & Rabatte** | Schulleitung | `BillingDashboard.tsx`, `SecretaryBillingModalsHub.tsx` | Table: `school_subscriptions` | • Variable monatlich: 0,49 € / aktiver Schüler (Auto-Inaktivierung nach 2 Monaten Inaktivität)<br>• Jahreszahler: 10% Rabatt; Schuljahresstart (Sep): 20% Rabatt |
| **ADM-04** | **Kombi-Vorteil Bundle** | Schulleitung | `BillingDashboard.tsx`, `SecretaryBillingModalsHub.tsx` | Subscription Engine | • Campus (14,90 €) + GrooveLab (9,90 €) = 19,90 € / Mo. (4,90 € Ersparnis gegenüber 24,80 €)<br>• 0,49 € / Mo. pro aktivem Lehrer-/Admin-Profil |
| **ADM-05** | **Smart Room & Stundenplan-Engine** | Schulleitung, Sekretariat | `ScheduleBoardDesktop.tsx`, `ScheduleCalendarView.tsx` | Table: `rooms`, `schedules` | • Kollisionserkennung für Räume, Instrumente und Lehrer<br>• Herrenberg-Compliance & Dienstvereinbarungs-Schutz |
| **ADM-06** | **Schulleitung & Sekretariat Hero-Profil** | Schulleitung, Sekretariat | Header & Dashboard | Asset: `/campus_login_hero.png` | • Schulleitung & Sekretariat (`admin`, `secretary`) nutzen modulübergreifend das Kreidetafel-Hero-Bild |
| **ADM-07** | **Rechtssichere AVV & DPO-Portal** | Schulleitung, DSB | `AVVModal.tsx`, `DpoAuditPortal.tsx` | Table: `dpo_audit_logs`, `legal_consents` | • DSGVO Art. 28 AVV digital zeichnen<br>• Exportfähige Verarbeitungsverzeichnisse (VVT Art. 30) |
| **ADM-08** | **Unterrichtsfächer- & Spartenverwaltung** | Schulleitung, Sekretariat | `SecretarySubjectsView.tsx`, `SecretaryDashboard.tsx` | Table: `subjects` | • Vollständiges Fächer-CRUD & CSV-Sammelimport<br>• Sichere Kaskadierung bei Umbenennung & Löschung auf 'ohne Zuweisung'<br>• Spartenzuordnung & Mandantenschutz |
| **ADM-09** | **Abrechnungs- & Lizenz-Modals Hub** | Schulleitung, Sekretariat | `SecretaryBillingModalsHub.tsx`, `SecretaryDashboard.tsx` | RPC: `book_school_tariff_plan`<br>RPC: `upgrade_school_subscription`<br>RPC: `cancel_school_subscription` | • Zentraler Hub für 9 Billing-Modals (Tarifwechsel, Sammelzahler-Switch, Speicher-Upgrades & -Widerruf, Kündigung gem. § 312k BGB, Rechnungs-Vorschau)<br>• Autoritatives Beleg- & Rechnungs-PDF-Generierungs-Handling |
| **ADM-10** | **Compliance, Support & Onboarding Hub** | Schulleitung, Sekretariat, DSB | `SecretaryGeneralModalsHub.tsx`, `SecretaryDashboard.tsx` | Table: `legal_consents`, `dpo_audit_logs` | • Zentraler Hub für 10 Governance-Modals (AGB/Datenschutz, AVV gem. Art. 28 DSGVO, DPO-Ausweis & Audit-Portal Art. 30/38 DSGVO, CSV-Massenimport, Eltern-Infoblatt PDF, EPC-QR Mahnungsausgleich, QR-Ausweis, Feedback-Hub)<br>• 100% DSGVO- & B2B-Governance |
| **ADM-11** | **Mobile PWA Navigation & Slide-Over Drawer** | Schulleitung, Sekretariat | `SecretaryMobileNavigation.tsx`, `SecretaryDashboard.tsx` | UI Context: `activeTab`, `subTab` | • Apple Glass Mobile Bottom Tab Bar (.cg-mobile-bottom-nav) mit safe-area-inset und 44×44px Touch-Targets<br>• 1-Tap Modulwechsel zwischen Verwaltung (rot), Campus (grün) und GrooveLab (gelb)<br>• Kontextsensitive Subtab-Navigation mit Badge-Countern |
| **ADM-12** | **GrooveLab Management & Live Blueprint Board** | Schulleitung, Sekretariat | `SecretaryGroovelabTab.tsx`, `SecretaryDashboard.tsx` | Tables: `stations`, `rooms`, `sessions`, `settings`<br>RPC: `save_school_setting` | • Live Lab Blueprint Board mit 2D-Raum-Kompressionsalgorithmus (`getCompressedRoomCoordinates`), StationNodes und CoachesNodes<br>• Schüler- & Coach-Zuweisung, Band-Limits, Skill-Radar-Dimensionen, Song-Levels & Kiosk-Modus<br>• Modulare Auslagerung (-3.084 LOC) |
| **ADM-13** | **Campus Management & Schedule Hub** | Schulleitung, Sekretariat | `SecretaryCampusTab.tsx`, `SecretaryDashboard.tsx` | Tables: `schedules`, `rooms`, `users`<br>RPC: `approve_teacher_schedule` | • Subtab-Routing (`briefing`, `onboarding`, `subjects`, `students`, `rooms`, `events`, `schedules`, `status`)<br>• Großer Campus-Stundenplan mit Raum-Matrix-Allokation (`matrixAllocations`), Drag & Drop, Plan-Split/Merge & Ad-Hoc-Buchungen<br>• Schüler- & Eltern-Onboarding mit Statusampel und Einladungsversand<br>• Modulare Auslagerung (-4.473 LOC) |
| **ADM-14** | **Secretary Administration & Governance Hub** | Schulleitung, Sekretariat, DSB | `SecretaryVerwaltungTab.tsx`, `SecretaryDashboard.tsx` | Tables: `school_settings`, `crisis_tickets`, `employees`, `school_equipment`, `audit_logs`<br>RPC: `save_school_settings`<br>RPC: `claim_crisis_ticket` | • Kapselt alle Verwaltungs-Subtabs (`briefing`, `crisis`, `employees`, `licenses`, `rooms`, `equipment`, `setup`, `announcements`/`duties`, `audit`)<br>• Vertretungs- & Krisenmanagement, Mitarbeiter- & Personalverwaltung, SaaS-Abrechnung & Lizenzen, Raum-Inventar & Instrumentenausleihe, DSGVO-Audit-Logbuch<br>• Modulare Auslagerung (-1.491 LOC) |
| **ADM-15** | **Verwaltungs-Briefing-Board & Campus-Tagesradar** | Schulleitung, Sekretariat | `SecretaryBriefingView.tsx`, `SecretaryDashboard.tsx` | Tables: `rooms`, `schedules`, `notes` (Room Issues) | • **10/10 Goldstandard Ergonomie** (Zero-Inbox Parity, Management by Exception)<br>• 4 KPI-Karten (`#tour-secretary-kpis`) bleiben zu 100% unberührt<br>• Kondensierte System-Integritätsleiste bei 0 offenen Prüfpunkten (spart 600px leere Boxen)<br>• Operativer Campus-Tagesradar (heutige Raumauslastung & anwesende Lehrkräfte auf einen Blick)<br>• Schnellzugriff-Dock im Sidebar-Bereich bei 0 Ausfällen (Schüler-Stammdaten, Belegungsplan, Lizenzen, Aushänge) |
| **ADM-16** | **Desktop Glass Sidebar & Suite Header Navigation** | Schulleitung, Sekretariat | `SecretarySidebar.tsx`, `SecretaryHeader.tsx`, `SecretaryDashboard.tsx` | Table: `school_invoices`<br>Engine: `schoolDunningEngine` | • Apple Glass Sidebar mit dynamischen Subtabs für Verwaltung, Campus & GrooveLab sowie Unread-Badge-Countern (Ausfall-Cockpit, Stundenpläne)<br>• Schulsekretariat Hero-Avatar (`/campus_login_hero.png`) & Ausweis-Trigger<br>• Suite Header mit 3-Modul-Tabs (`role="tablist"`), Schulpille, Dev-Datumsimulation & Doppelrollen-Umschalter („⇄ Zum Lehrerpult“)<br>• B2B Delinquency Banner mit automatischem EPC-QR Notausgleich |
| **ADM-17** | **Operations, Logbook & Maintenance Modals Hub** | Schulleitung, Sekretariat | `SecretaryOperationsModalsHub.tsx`, `SecretaryDashboard.tsx` | Tables: `room_bookings`, `audit_logs`, `students`<br>RPC: `reset_school_data`<br>Service: `studentDeletionService` | • Raumbuchungs-Logbuch (Einsicht, Ad-Hoc-Genehmigung, Zeiten-Bearbeitung, Löschung)<br>• Probezeit- & Freischaltungs-Logbuch (Audit-Trail über 30-Tage-Testphasen & Entsperrungen)<br>• Destruktives Werkseinstellungen-Zurücksetzen (`reset_school_data`) mit Schulnamensprüfung<br>• 2-stufige Schüler-Sammellöschung mit Sicherheits-PIN (489) & Modul-Deaktivierungskaskade |
| **ADM-18** | **User Detail Modals Hub & Schedule Allocation Engine** | Schulleitung, Sekretariat | `SecretaryUserDetailModalsHub.tsx`, `useSecretarySchedules.ts`, `SecretaryDashboard.tsx` | Tables: `users`, `students`, `schedules`, `schedule_occurrences`<br>RPC: `revoke_user_sessions` | • Detail- & Management-Hub für Schüler & Lehrkräfte (Rollenverwaltung, Starter-PIN-Generierung, QR-Ausweise, Geburtstagstag-Anpassung, PIN-Resets, sichere Voll-Löschung)<br>• Autonomer Monte-Carlo Smart Solver für Raum- & Stundenplanzuweisungen (100 Iterationen, Kontinuitäts-Scoring, Raumtreue-Optimierung)<br>• Automatisches Generieren von Schuljahres-Terminen (`schedule_occurrences`) & Push-Benachrichtigungen |
| **ADM-19** | **Mängel- & Facility-Logbuch (Instandhaltungsnachweis & Retrospektion)** | Schulleitung, Sekretariat, Facility Management | `SecretaryFacilityLogModal.tsx`, `SecretaryBriefingView.tsx`, `SecretaryRoomsView.tsx` | Table: `user_notes`<br>Service: `notesService`<br>IndexedDB + LocalStorage Cache | • Lückenlose Retrospektion aller behobenen & offenen Raum- und Ausstattungsmängel<br>• Filterung nach Status (Offen / Behoben / Alle), Raum und Freitext-Suche<br>• Audit-Chronologie mit Zeitstempel und Erlediger-Rolle (Lehrkraft / Sekretariat)<br>• Reopen-Garantie: Mängel können mit 1-Klick wiedereröffnet werden (`reopenRoomIssue`)<br>• UTF-8 CSV-Export für Versicherungsnachweise, Schulträger und Liegenschaftsamt |
| **ADM-20** | **Staff & Student Operations Engine** | Schulleitung, Sekretariat | `useSecretaryStaff.ts`, `useSecretaryStudents.ts`, `secretaryAuthUtils.ts`, `SecretaryDashboard.tsx` | RPC: `update_employee_roles`<br>RPC: `import_student`<br>RPC: `delete_user_fully`<br>Tables: `users`, `students`, `audit_logs` | • **Modulare Personal- & Schüler-Operations-Engine** (-1.238 LOC im Monolithen)<br>• 100% DSGVO-konforme Rollen- & Personalverwaltung (Dual-Role Management, AVV-Schutzprüfung vor Neuanlage, Starter-PIN-Generierung `GL-xxxx`)<br>• Schüler-Sammel- und Einzelonboarding (CSV-Batch-Import mit Delimiter-Erkennung, 5-Tabellen anonymisiertes Onboarding via `import_student`, Jahresbeitrag-Schutzprüfung bei Modul-Deaktivierung)<br>• Physische Speichersäuberung bei Konto-Löschung (`deleteUserStorageAssets`) und datenschutzkonforme Kaskadierung |

---


## 4. 🛡️ Bounded Context: CORE SECURITY, MULTI-TENANCY & COMPLIANCE

| Feature-ID | Feature-Name | Zielgruppe | UI-Einstiegspunkt | Autoritativer Backend-RPC / Tabelle | Golden Invariants & Core Rules |
|---|---|---|---|---|---|
| **SEC-01** | **Fail-Closed Authentifizierung** | Alle Benutzer | `LoginScreen.tsx`, `QRLandingPage.tsx` | RPC: `authenticate_by_credential`<br>RPC: `authenticate_webauthn_credential`<br>RPC: `login_master_admin` | • Null PostgREST-Direct-Queries auf `users` oder `students`<br>• Sofortiger Abbruch bei RPC-Ausfall (Fail-Closed) |
| **SEC-02** | **Zero-Secret-Leakage & Dynamic SQL Masking** | Entwickler, Browser | View: `users_view`<br>Trigger: `trg_users_view_dml` | Supabase RLS & Dynamic Views | • `parent_pin`, `personal_pin`, `two_factor_secret`, `password_hash` dürfen NIEMALS im SELECT auftauchen<br>• Client empfängt nur vorberechnete Booleans (`has_personal_pin` etc.) |
| **SEC-03** | **Strikte Mandantentrennung (Multi-Tenancy)** | Alle Mandanten | Supabase RLS | RLS: `school_id = get_current_user_school_id()` | • Jede Tabelle erzwingt RLS-Isolation auf Schulebene<br>• Default-Deny-Doktrin |
| **SEC-04** | **Revisionssicheres Audit-Logging** | Admins, Forensik | `AdminSecuritySuiteModal.tsx` | Table: `public.audit_logs`, `master_audit_trail` | • Cryptographic Hash-Chaining (SHA-256); Append-Only<br>• Protokollierung aller Logins, Ghost-Sessions, PIN-Resets und Rollenwechsel |
| **SEC-05** | **Barrierefreiheit nach BFSG 2025 / WCAG 2.2 AA** | Alle Benutzer | Plattformweit | CSS & ARIA Attribute | • 44×44px Mindesttrefferzonen auf Mobilgeräten<br>• Vollständige Tastatur-Bedienbarkeit (`role="button"`, `tabIndex={0}`, Enter/Space)<br>• Markenfarben unverändert; Textkontrast > 4,5:1 (Slate-900 `#0f172a` auf Gelb) |
| **SEC-06** | **PWA Zero Content Occlusion** | Mobile Nutzer | Main Containers | Root CSS Layout | • `padding-bottom: calc(var(--bottom-bar-height, 68px) + env(safe-area-inset-bottom) + 32px)`<br>• Kein Button wird von Bottom-Bar oder Notch verdeckt |
| **SEC-07** | **Global Camera Kill Switch & Anti-Tamper** | Tablet / Kiosk | `cameraKillSwitch.ts`, `antiTamper.ts` | Browser Navigator API | • Automatische Beendigung aller aktiven Kamera-Streams bei Logout und Navigation<br>• Zero-PII Crash Telemetry Sanitizer aktiv |
| **SEC-08** | **DSGVO Art. 20 Autoritativer Datenexport** | Schüler, Eltern | `StudentSettingsTab.tsx`, `ParentDataVaultSettingsView.tsx` | RPC: `request_gdpr_data_export` | • 100% autoritativer Server-Export direkt aus PostgreSQL (Lessons, Matrix, Missions, Audio-Assets)<br>• BOLA-geschützt & mandantenisoliert; standardkonformer JSON-Download |
| **SEC-09** | **PWA Storage Quota Guard** | Mobile Nutzer, Tablets | `storageQuotaGuard.ts`, `audioStorageHelper.ts` | W3C StorageManager API | • Proaktive Quota-Überwachung (< 50 MB / > 80% Belegung)<br>• Schutz vor QuotaExceededError durch automatische Eviction transienter Cache-Fragmente |
| **SEC-10** | **Hermetische Mandantentrennung & Zero-Hardcoded-Schools** | Alle Mandanten | `LoginScreen.tsx`, `useAuthSessionActions.ts`, `useCampusDashboardDataLoader.ts` | Hostname / Subdomain Discovery RPC | • 0 hardcodierte Test-/MuSaEk-UUIDs (`53e83805-1d5a-4ed8-988e-1fb0b8200b9c`) im Produktivcode<br>• Fallback-Closed: Dynamische Subdomain-Auflösung via RPC `get_school_by_subdomain` oder Session |
| **SEC-11** | **FastStorage Zero-I/O Engine** | Alle Clients | `fastStorage.ts` | In-Memory Write-Through Storage | • Eliminiert 1050+ synchrone `localStorage`-I/O-Blocks auf dem Main-Thread<br>• 0ms RAM-Lesezugriff, asynchroner Microtask-Disk-Flush, automatische QuotaExceeded-Pruning-Routine |
| **SEC-12** | **Heartbeat Orchestrator & Screen-Lock Suspension** | Mobile Nutzer, PWA | `heartbeatOrchestrator.ts`, `offlineSyncService.ts` | Page Visibility API | • Bündelt alle Hintergrund-Timer in einen zentralen Takt<br>• Suspendiert Polling bei Tab-Sleep / Screen-Lock (`visibilityState === 'hidden'`) gegen Akku-Drain<br>• Sofortiger Wake-up-Sync bei Vordergrund-Rückkehr |
| **SEC-13** | **Service Worker Precache Shield & Quota Isolation** | PWA, Mobile Nutzer | `sw.js` | Cache API | • Unantastbarer App-Shell-Precache (`CACHE_NAME`); `limitCacheSize` operiert ausschließlich auf flüchtigen Caches (`DYNAMIC_CACHE`)<br>• Eliminiert den White-Screen-of-Death Bug beim Offline-Launch |
| **SEC-14** | **Zentraler Realtime WebSocket Multiplexer** | Alle Clients | `realtimeMultiplexer.ts` | Supabase Realtime | • Poolt Realtime-Kanäle über typsichere Referenzzählung (`refCount`)<br>• Beseitigt Channel-Proliferation (22+ separate WebSockets) und schützt den Supabase-Cluster vor Verbindungserschöpfung |
| **SEC-15** | **Tier-1 Enterprise Legal Consent & Semantic Versioning** | Alle Benutzer | `LegalConsentGate.tsx`, `legalContent.ts` | RPC: `check_user_legal_status`<br>RPC: `record_user_legal_consent`<br>Table: `public.legal_consents` | • Dual-Version Governance (`ACTIVE_LEGAL_VERSION` vs. `MINIMUM_ENFORCED_VERSION`)<br>• Verhindert unberechtigtes Aussperren bei redaktionellen Minor-Updates<br>• BGH- & DSGVO-konformes 3-Zonen-Modell mit Changelog-Lens (Delta-Präsentation statt Textwüste)<br>• Realtime Cross-Tab BroadcastChannel-Sync & Localhost-Dev-Immunität |
| **PERF-03** | **Server-Side Dashboard Bootstrap RPC** | Schüler, Lehrer | `useCampusDashboardDataLoader.ts` | RPC: `get_student_dashboard_bootstrap` | • Bündelt 8 sequenzielle HTTP-Wasserfall-Abfragen in 1 einzigen Postgres-Roundtrip<br>• Berechnet Anwesenheitsminuten serverseitig; senkt Dashboard-Ladezeit von 800ms auf 150ms |

---

## 🔍 Der 1%-Entwickler-Workflow mit dieser Matrix

1. **Vor jedem Feature oder Refactoring:**  
   Suche die Feature-ID in dieser Matrix. Identifiziere den zuständigen Bounded Context, die autoritative SSOT und die zwingenden Invarianten.
2. **Bei Code-Reviews oder Tests:**  
   Gleiche Änderungen an Komponenten mit Spalte 6 ab. Verletzungen lösen einen Stopp aus.
3. **Bei Erweiterungen:**  
   Trage neue Features zuerst in diese Matrix ein, bevor eine Zeile Code geschrieben wird. Damit bleibt die Dokumentation lebendig und der mentale Arbeitsspeicher entlastet.
