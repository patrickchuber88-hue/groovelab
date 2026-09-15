# 📖 Campus-Groovelab: Living System Feature Matrix & Product Bible
> **Klassifizierung:** Autoritativer Fähigkeitskatalog & Architektur-Spiegel  
> **Single Source of Truth (SSOT)** für alle Plattformfunktionen, Bounded Contexts und System-Invarianten.  
> **Letzte Aktualisierung:** 2026-09-15

---

## 🧭 Das 4-Säulen-Architekturmodell

Alle Funktionen der Plattform sind strikt in vier voneinander isolierte **Bounded Contexts** unterteilt:

```
┌───────────────────────────────┐   ┌───────────────────────────────┐
│ 🟢 CAMPUS (Didaktik & Dialog) │   │ 🟡 GROOVELAB (Audio & DAW)    │
│    Farbe: Grün (#34a853)      │   │    Farbe: Gelb (#facc15)      │
│    Fokus: Schüler & Pädagogen │   │    Fokus: Musiker & Kreative  │
├───────────────────────────────┤   ├───────────────────────────────┤
│ 🔴 VERWALTUNG / ADMIN / BILL  │   │ 🛡️ CORE SECURITY & PLATFORM   │
│    Farbe: Rot (#ea4335)       │   │    Fokus: Zero-Trust, ASVS L3 │
│    Fokus: Schulleitung/Sekr.  │   │    Multi-Tenancy & Compliance │
└───────────────────────────────┘   └───────────────────────────────┘
```

---

## 1. 🟢 Bounded Context: CAMPUS (Didaktik, Kommunikation & Organisation)

| Feature-ID | Feature-Name | Zielgruppe | UI-Einstiegspunkt | Autoritativer Backend-RPC / Tabelle | Golden Invariants & Core Rules |
|---|---|---|---|---|---|
| **CAM-01** | **Adaptive UI-Levels** | Schüler, Eltern | `ParentControlsModal.tsx` | RPC: `save_parent_controls`<br>Table: `users.campus_ui_level` | • 3 didaktische Stufen: `junior`, `teen`, `pro`<br>• DB ist SSOT; Broadcast via Realtime auf alle Instanzen<br>• Änderungen durch Eltern sind revisionssicher auditiert |
| **CAM-02** | **Hausaufgaben & Meisterwerk-Doku** | Schüler, Lehrer | `MeisterwerkDocumentationModal.tsx` | Table: `assignments`, `student_homework` | • Fortschritts- & Audio-Uploads an Schülerordner gekoppelt<br>• Revisionssichere Aufgabenabgabe |
| **CAM-03** | **Campus Messenger & Direct Messages** | Schüler, Lehrer, Eltern | `CampusDirectMessages.tsx`, `CampusTopicCard.tsx` | Table: `messages`, `channels`<br>Supabase Realtime | • Strikte Mandantentrennung (`school_id`)<br>• DSGVO-konforme Eltern-Kanal-Kopplung bei Minderjährigen |
| **CAM-04** | **Campus Events & Schwarzes Brett** | Alle Rollen | `CampusEventsBoard.tsx` | Table: `campus_events`, `announcements` | • Rollenbasierte Sichtbarkeit (Schule, Klasse, Öffentlicher Aushang)<br>• Revisionssicherer Audit-Trail bei Löschungen |
| **CAM-05** | **Schüler-Termin- & Slot-Planer** | Schüler | `StudentScheduleSlotsModal.tsx`, `StudentMobileScheduleWizard.tsx` | Table: `lessons`, `schedules` | • Desktop- und Mobile-optimierte Slot-Auswahl<br>• Schutz vor Überbuchung & Raumkonflikten |
| **CAM-06** | **Elternbereich & PIN-Freigabe** | Eltern | `CampusPinUnlockModal.tsx`, `ParentCampusActivationModal.tsx` | RPC: `verify_parent_pin`<br>RPC: `set_parent_pin` | • 100% serverseitige PIN-Prüfung; niemals JavaScript-Vergleich<br>• Rate-Limiting gegen Brute-Force |

---

## 2. 🟡 Bounded Context: GROOVELAB (Audio-Engine, Kreativität & DAW)

| Feature-ID | Feature-Name | Zielgruppe | UI-Einstiegspunkt | Autoritativer Backend-RPC / Tabelle | Golden Invariants & Core Rules |
|---|---|---|---|---|---|
| **GRV-01** | **WebAudio Synth & Metronom Engine** | Schüler, Lehrer | `apps/groovelab/src/engine/` | WebAudio API Context | • AudioContext-Unlock beim ersten Klick/Tap<br>• iOS-Stummschaltungs-Bypass & Wakelock bei aktiver Session |
| **GRV-02** | **Audio-Recorder & Übe-Track-Export** | Schüler | `AudioTrackCarousel.tsx`, `LiveStageToolboxModal.tsx` | Browser MediaRecorder API | • Universelles Audioformat (`audio/mp4` für iOS Safari, `audio/webm` für Chrome)<br>• Automatische Normalisierung |
| **GRV-03** | **Musiker-Avatar-System (Geist)** | Schüler, Lehrer | `StudioAvatar.tsx`, `StudentAvatarDashboard.tsx` | Table: `users.avatar_url` | • **NUR** im GrooveLab-Modul aktiv!<br>• Verbot von Musiker-Avataren für Verwaltung & Schulleitung |
| **GRV-04** | **GrooveLab Sammelzahler-Garantie** | Schüler, Schulträger | `BillingDashboard.tsx` | Abrechnungs-Engine | • GrooveLab-Aktivierungen werden **ausnahmslos zu 100% von der Musikschule getragen** (Sammelzahler)<br>• Niemals Schüler-Direktabrechnung für GrooveLab |
| **GRV-05** | **Ensemble & Band-Profile** | Schüler, Lehrer | `EnsembleDashboard.tsx`, `BandProfileContent.tsx` | Table: `bands`, `band_members` | • Kollaboratives Üben in Ensembles<br>• Repertoire- und Playback-Synchronisation |

---

## 3. 🔴 Bounded Context: VERWALTUNG, ADMIN & BILLING (Organisation & Finanzen)

| Feature-ID | Feature-Name | Zielgruppe | UI-Einstiegspunkt | Autoritativer Backend-RPC / Tabelle | Golden Invariants & Core Rules |
|---|---|---|---|---|---|
| **ADM-01** | **0,00 € Software-Bereitstellung (Hosting-Only)** | Schulleitung | `BillingDashboard.tsx`, `InvoicePreviewModal.tsx` | SaaS Billing Engine | • Software-Bereitstellung ist immer `0,00 € (Inklusive)`<br>• Berechnet werden nur Server-Hosting & Infrastruktur |
| **ADM-02** | **Schüler-Direktabrechnung (Campus)** | Schulleitung, Eltern | `BillingDashboard.tsx` | Table: `student_billing_plans` | • **Ausschließlich jährlicher Schuljahresbeitrag** (max. 5,39 € / Jahr) – niemals monatlich (Gebührenschutz)<br>• Härtefälle & Geschwisterrabatte manuell ausnehmbar |
| **ADM-03** | **Sammelzahler-Modell & Rabatte** | Schulleitung | `BillingDashboard.tsx` | Table: `school_subscriptions` | • Variable monatlich: 0,49 € / aktiver Schüler (Auto-Inaktivierung nach 2 Monaten Inaktivität)<br>• Jahreszahler: 10% Rabatt; Schuljahresstart (Sep): 20% Rabatt |
| **ADM-04** | **Kombi-Vorteil Bundle** | Schulleitung | `BillingDashboard.tsx` | Subscription Engine | • Campus (14,90 €) + GrooveLab (9,90 €) = 19,90 € / Mo. (4,90 € Ersparnis gegenüber 24,80 €) |
| **ADM-05** | **Smart Room & Stundenplan-Engine** | Schulleitung, Sekretariat | `ScheduleBoardDesktop.tsx`, `ScheduleCalendarView.tsx` | Table: `rooms`, `schedules` | • Kollisionserkennung für Räume und Lehrer<br>• Herrenberg-Compliance & Dienstvereinbarungs-Schutz |
| **ADM-06** | **Schulleitung & Sekretariat Hero-Profil** | Schulleitung, Sekretariat | Header & Dashboard | Asset: `/campus_login_hero.png` | • Schulleitung & Sekretariat (`admin`, `secretary`) nutzen modulübergreifend das Kreidetafel-Hero-Bild |
| **ADM-07** | **Rechtssichere AVV & DPO-Portal** | Schulleitung, DSB | `AVVModal.tsx`, `DpoAuditPortal.tsx` | Table: `dpo_audit_logs`, `legal_consents` | • DSGVO Art. 28 AVV digital zeichnen<br>• Exportfähige Verarbeitungsverzeichnisse (VVT Art. 30) |

---

## 4. 🛡️ Bounded Context: CORE SECURITY, MULTI-TENANCY & COMPLIANCE

| Feature-ID | Feature-Name | Zielgruppe | UI-Einstiegspunkt | Autoritativer Backend-RPC / Tabelle | Golden Invariants & Core Rules |
|---|---|---|---|---|---|
| **SEC-01** | **Fail-Closed Authentifizierung** | Alle Benutzer | `LoginScreen.tsx`, `QRLandingPage.tsx` | RPC: `authenticate_by_credential`<br>RPC: `authenticate_webauthn_credential` | • Null PostgREST-Direct-Queries auf `users` oder `students`<br>• Sofortiger Abbruch bei RPC-Ausfall (Fail-Closed) |
| **SEC-02** | **Zero-Secret-Leakage in Frontend-Views** | Entwickler, Browser | View: `users_view` | Supabase RLS & Views | • `parent_pin`, `personal_pin`, `two_factor_secret` dürfen NIEMALS im SELECT auftauchen<br>• Client empfängt nur vorberechnete Booleans (`has_personal_pin` etc.) |
| **SEC-03** | **Strikte Mandantentrennung (Multi-Tenancy)** | Alle Mandanten | Supabase RLS | RLS: `school_id = get_current_user_school_id()` | • Jede Tabelle erzwingt RLS-Isolation auf Schulebene<br>• Default-Deny-Doktrin |
| **SEC-04** | **Revisionssicheres Audit-Logging** | Admins, Forensik | `AdminSecuritySuiteModal.tsx` | Table: `public.audit_logs`, `master_audit_trail` | • Append-Only; keine Updates oder Deletes auf Audit-Logs<br>• Protokollierung aller Logins, PIN-Resets und Rollenwechsel |
| **SEC-05** | **Barrierefreiheit nach BFSG 2025 / WCAG AA** | Alle Benutzer | Plattformweit | CSS & ARIA Attribute | • 44×44px Mindesttrefferzonen auf Mobilgeräten<br>• Vollständige Tastatur-Bedienbarkeit (`role="button"`, `tabIndex={0}`)<br>• Markenfarben unverändert; Textkontrast > 4,5:1 (Slate-900 auf Gelb) |
| **SEC-06** | **PWA Zero Content Occlusion** | Mobile Nutzer | Main Containers | Root CSS Layout | • `padding-bottom: calc(var(--bottom-bar-height, 68px) + env(safe-area-inset-bottom) + 32px)`<br>• Kein Button wird von Bottom-Bar oder Notch verdeckt |

---

## 🔍 Wie du diese Matrix nutzt (Der 1%-Entwickler Workflow)

1. **Vor jedem neuen Feature oder Refactoring:**  
   Suche die Feature-ID in dieser Tabelle. Du weißt sofort: Welcher Bounded Context ist zuständig? Welcher Server-RPC ist die SSOT? Welche Invarianten dürfen nicht verletzt werden?
2. **Bei Code-Reviews oder Tests:**  
   Prüfe, ob deine Änderungen die „Golden Invariants“ der Spalte 6 einhalten.
3. **Wenn ein neues Feature hinzukommt:**  
   Ergänze eine Zeile in dieser Matrix, bevor du mit dem Coden beginnst. Damit bleibt deine Dokumentation lebendig und dein Kopf frei.
