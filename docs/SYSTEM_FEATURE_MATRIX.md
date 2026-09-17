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

---

## 🔍 Der 1%-Entwickler-Workflow mit dieser Matrix

1. **Vor jedem Feature oder Refactoring:**  
   Suche die Feature-ID in dieser Matrix. Identifiziere den zuständigen Bounded Context, die autoritative SSOT und die zwingenden Invarianten.
2. **Bei Code-Reviews oder Tests:**  
   Gleiche Änderungen an Komponenten mit Spalte 6 ab. Verletzungen lösen einen Stopp aus.
3. **Bei Erweiterungen:**  
   Trage neue Features zuerst in diese Matrix ein, bevor eine Zeile Code geschrieben wird. Damit bleibt die Dokumentation lebendig und der mentale Arbeitsspeicher entlastet.
