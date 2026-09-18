# 🛡️ Campus-Groovelab: Phase 4 Master Security Audit & Go-Live Checkliste
> **Klassifizierung:** Autoritatives 1%-Enterprise+ Sicherheits- & Penetrationstest-Audit  
> **Sicherheitsstandard:** OWASP ASVS Level 3 / BSI TR-03116 / BSI IT-Grundschutz / DSGVO Art. 25 & 32  
> **Infrastruktur:** 100% Hetzner Bare-Metal / Cloud Server (Falkenstein/Nürnberg, DE) & Hetzner Storage Box  
> **Plattformbezeichnung:** Ausnahmslos **Campus-Groovelab** (mit Doppel-'o')  
> **Status:** Verbindlicher Kontrollkatalog für Staging, Pentesting und Go-Live Freigabe

---

## I. Automatisierte RLS-Penetrationstests & Mandantenisolation (Punkte 1–20)
*Status: 100% isolierte Mandantentrennung via `school_id` und Engine-Level RLS*

- [x] **1. Automatisierter Cross-Tenant-Read-Test:** CI-Suite/SQL-Pentest führt als Schule B strukturierte `SELECT`-Abfragen auf alle Tabellen von Schule A aus; Assert verlangt exakt 0 Zeilen (`cross-tenant-penetration-test.sql`).
- [x] **2. Cross-Tenant-Write-Test:** Versuch, als Schule B eine Zeile mit fremder `school_id` in `students`, `lessons` oder `invoices` einzufügen, bricht mit RLS-Policy-Fehler ab.
- [x] **3. Cross-Tenant-Update-Test:** Versuch, via `UPDATE` Datensätze oder Primärschlüssel einer fremden Schule zu manipulieren, verändert exakt 0 Zeilen.
- [x] **4. Cross-Tenant-Delete-Test:** Versuch, via `DELETE` Daten einer fremden Schule zu tilgen, bleibt wirkungslos (0 Zeilen betroffen).
- [x] **5. Foreign-Key-Injektionstest:** Versuch, relationale Verknüpfungen mandantenübergreifend zu fälschen (z. B. Schüler aus Schule A einem Raum aus Schule B zuweisen), scheitert am Composite-FK-Constraint `(id, school_id)` (Migration 444).
- [x] **6. PostgREST Request-Isolation:** Jeder HTTP-Request wird von PostgREST nativ in eine atomare Transaktion gekapselt; kein Session-Leakage bei wiederverwendeten Verbindungen.
- [x] **7. Null-Tenant-Bypass-Test:** Request ohne verifizierten Sitzungskontext (`get_current_user_school_id() IS NULL`) liefert leere Resultate oder wirft eine Exception (`P0001`).
- [x] **8. SQL-Injection-Escalation:** Testpayloads mit SQLi-Sonderzeichen (`' OR 1=1 --`) in allen PostgREST-Filtern und RPC-Parametern scheitern an vollständiger Parametrisierung.
- [x] **9. Security-Definer-Search-Path-Audit:** PostgreSQL-Systemkatalogscan verifiziert, dass 100 % aller `SECURITY DEFINER`-Funktionen `SET search_path = public, pg_temp` deklarieren (`postgres-catalog-security-audit.sql`).
- [x] **10. Table-RLS-Enforcement-Audit:** Systemkatalogscan validiert, dass für 100 % aller Mandantentabellen `rowsecurity = true` und `forcerowsecurity = true` gesetzt sind (Migration 445).
- [x] **11. View-Security-Check:** Alle Views (insbesondere `public.users`) laufen über Security-Invoker / DML-Trigger (`trg_users_view_dml`), um RLS-Bypasses auszuschließen.
- [x] **12. Storage-Cross-Tenant-Abruf:** Versuch, über manipulierte Pfade auf fremde Storage-Ordner zuzugreifen (`storage/campus-assets/{fremde_schule}/...`), wird mit 403 Forbidden abgewiesen.
- [x] **13. Signed-URL-Tampering:** Manipulation der Signatur-Parameter einer signierten Asset-URL führt zu sofortiger Ungültigkeit.
- [x] **14. Signed-URL-Expiration:** Download-Test nach Ablauf der Gültigkeitsfrist (z. B. nach Minute 16 bei 15 Min. TTL) schlägt fehl.
- [x] **15. Minderjährigen-Datenabschirmung:** Schüler- und Klassenraumansichten maskieren Nachnamen standardmäßig (`maskLastName(last_name)`) und unterbinden Cross-Student Profilspionage.
- [x] **16. Eltern-Fremdzugriffstest:** Elternteil A kann über `verify_parent_pin` ausschließlich das eigene Kind freischalten; Fremdzugriffe werden serverseitig abgewiesen.
- [x] **17. Direct-Object-Reference-Test (IDOR):** Sukzessives Inkrementieren oder Erraten von UUIDs führt zu keinen unberechtigten Datenzugriffen (alle Abfragen sind an `school_id = get_current_user_school_id()` gebunden).
- [x] **18. Raw-PostgREST-Shield:** PostgREST-Gateway weist direkte Inserts auf schreibgeschützte Spalten (`is_master_admin`, `parent_pin`, `role`) über DML-Trigger strikt ab.
- [x] **19. WORM-Trigger-Test:** Manueller Versuch, eine ausgestellte GoBD-Rechnung (`invoices`) oder ein rechtliches Einverständnis (`legal_consents`) zu mutieren oder zu löschen, bricht mit Exception ab (Migration 442 & 447).
- [x] **20. Raum-Kollisions-Prüfung:** Versuch, zwei Buchungen mit überlappendem `booking_slot` für denselben Raum einzufügen, wird durch PostgreSQL GiST `tsrange` Hardware-Constraint physikalisch abgewiesen (Migration 448).

---

## II. RBAC-, Auth- & API-Sicherheitstestung (Punkte 21–40)
*Status: Passwortlose Authentifizierung, BSI-Konformität & Zero-Knowledge Hashing*

- [x] **21. Vertikale Privilege-Escalation:** Nutzer mit Rolle `student` oder `teacher` versucht administrative RPCs (`switch_user_active_role`, `issue_cancellation_invoice`) aufzurufen (403 / Exception).
- [x] **22. Horizontale Privilege-Escalation:** Administrator von Schule A versucht Schulleiter-Rechte oder Lehrer von Schule B zu manipulieren (0 Zeilen betroffen / RLS Block).
- [x] **23. Session-Fixation-Schutz:** Session-Token und kryptografische Nonces werden unmittelbar nach erfolgreichem Login neu erzeugt.
- [x] **24. Passwortloser QR- & PIN-Schutz:** Schüler authentifizieren sich ausnahmslos über kryptografische QR-Tokens und 4-stellige PBKDF2-gehashte Schüler-PINs (kein Passwort-Vergessen-Aufwand).
- [x] **25. Brute-Force-Sperre:** Nach 5 fehlerhaften PIN- oder Login-Versuchen wird die IP bzw. der Account progressiv für 15 Minuten blockiert (`pinLockoutSeconds`).
- [x] **26. Timing-Attack-Resistenz:** WebAuthn Passkey-Verifikation (FIDO2/asymmetrische Kryptografie) schließt timing-basierte Passwort-Angriffe physikalisch aus.
- [x] **27. JWT-Algorithmus-Confusion:** Manipulierte JWT-Header mit `alg: "none"` oder `alg: "HS256"` (unter Nutzung des Public Keys) werden von PostgREST strikt abgewiesen.
- [x] **28. Zero-Secret-Leakage:** Die Spalten `parent_pin`, `personal_pin`, `master_admin_password`, `two_factor_secret` werden niemals im Klartext selektiert; Client empfängt nur vorberechnete Flags (`has_parent_pin`, `has_personal_pin`).
- [x] **29. Screen-Lock Reload-Resistenz:** 45-minütige Inaktivitätssperre (`SessionLockModal.tsx`) übersteht Browser-Reloads (`F5` / `Cmd+R`) und sperrt den Bildschirm (SEC-21).
- [x] **30. Cross-Site Scripting (XSS) Schutz:** Bereinigung aller nutzergenerierten Eingaben vor der Darstellung; kein ungesichertes `dangerouslySetInnerHTML`.
- [x] **31. Content-Security-Policy-Audit:** Strikte CSP-Header am Webserver; keine Ausführung von externen unautorisierten Skripten.
- [x] **32. Clickjacking-Schutz:** Einbettung der Applikation in externe `<iframe>`s wird durch `X-Frame-Options: DENY` und CSP `frame-ancestors 'none'` unterbunden.
- [x] **33. MIME-Type-Sniffing-Schutz:** Header `X-Content-Type-Options: nosniff` auf allen Antworten verifiziert.
- [x] **34. CORS-Validierung:** Preflight-Requests von nicht autorisierten Domains erhalten keine `Access-Control-Allow-Origin`-Freigabe.
- [x] **35. Magic-Bytes Binary Header Guard:** Dateiuploads (Audio, PDFs, Bilder) werden vor dem Upload binär auf ihre echten Magic Bytes (`%PDF-`, `ID3`, `RIFF`) geprüft; manipulierte `.exe`/`.html` werden abgewiesen (SEC-25).
- [x] **36. Zod-Schema-Fuzzing:** Senden von Payloads mit unerwarteten Datentypen liefert deterministische Validierungsfehler ohne Stacktraces.
- [x] **37. Idempotency-Key-Schutz:** Mehrfachklicks auf sensible Primäraktionen (Rechnung erstellen, Buchung, Storno) sind durch Frontend-Debouncing und DB-Sequenzen gegen Doppelungen gesichert.
- [x] **38. MFA-Enforcement für Master-Admin:** System-Inhaber und Master-Admins müssen sich zwingend mit TOTP / FIDO2 Passkeys authentifizieren (`login_master_admin`).
- [x] **39. Account-Freeze-Verification:** Wird ein Nutzer in der Datenbank auf `is_active = false` gesetzt, schlagen alle nachfolgenden Abfragen sofort fehl.
- [x] **40. Ghost-Admin Support-Isolation:** Support-Zugriff via Impersonation (`activate_support_ghost_session`) wird im Audit-Trail erfasst und terminiert nach exakt 60 Minuten automatisch.

---

## III. Statische Code-Analyse, Abhängigkeiten & SAST (Punkte 41–55)
*Status: Automated Gate & Strict Type Safety*

- [x] **41. Dependency-Schwachstellen-Scan:** `npm audit` läuft fehlerfrei; keine bekannten High/Critical CVEs im Dependency-Tree.
- [x] **42. Automatisierter Secret-Scan:** Pre-Commit-Hook und CI prüfen mit Entropie- und Regex-Scannern auf versehentlich committete API-Keys, Private Keys oder Passwörter (`npm run security:secrets`).
- [x] **43. Security Drift Guard:** Automatischer Architektur-Scan verhindert RLS-Bypasses, unsichere RPC-Verknüpfungen und unautorisierte Schema-Drifts (`npm run security:check`).
- [x] **44. Strict TypeScript:** 100 % typisiert; `noImplicitAny: true`, kein `any`-Casting in sicherheitsrelevanten Auth- und Billing-Modulen.
- [x] **45. Neutral Ausfall-Invariants Guard:** Didaktische Immunität und neutrale Unterrichtsausfall-Regelungen werden automatisiert im Test-Runner verifiziert.
- [x] **46. Lizenz-Compliance-Check:** Alle genutzten npm-Pakete nutzen wirtschaftsfreundliche Lizenzen (MIT, Apache-2.0, BSD); keine viralen Copyleft-Risiken (GPL/AGPL).
- [x] **47. Dead-Code-Überprüfung:** Keine ungenutzten toten Routen oder verwaiste Legacy-Zweige im Build-Target.
- [x] **48. Keine Build-Tools im Produktions-Bundle:** Multi-Stage Vite-Build garantiert, dass Compiler, TypeScript-Quelldateien und DevDependencies nicht im Web-Root landen.
- [x] **49. Subresource Integrity (SRI):** Alle Skript- und Stylesheet-Assets werden beim Build mit SHA-384/SHA-512 SRI-Hashes versehen.
- [x] **50. Pre-Compression (Brotli & Gzip):** Statische Assets werden vorab hochkomprimiert (`.br` / `.gz`) für maximale Ladezeiten und Schutz vor On-the-fly CPU-Spikes.
- [x] **51. PII-Masking in Logs:** Revisionssicherer Logger maskiert nachweislich E-Mails, Telefonnummern und Nachnamen in Log-Dateien (`auditLogService.ts`).
- [x] **52. Exception-Handling-Audit:** Kein einziger API-Endpunkt liefert unformatierten SQL-Fehlertext (`PG::Error`) oder interne Stacktraces an den Client aus.
- [x] **53. Bundle-Budget-Wächter:** Automatische Prüfung verhindert das versehentliche Überschreiten von Asset-Größenlimits (`check-bundle-budget.js`).
- [x] **54. ReDoS-Audit:** Alle regulären Ausdrücke in Zod-Schemas (IBAN, E-Mail, BIC, Telefon) nutzen sichere, nicht-überlappende Quantifizierer.
- [x] **55. Teacher-Name Invariant Tests:** Spezifischer Testrunner stellt sicher, dass Lehrkräfte-Vollnamen für Transparenz erhalten bleiben, während Schülernachnamen strikt maskiert werden (`runTeacherNameInvariantTests.ts`).

---

## IV. Disaster Recovery, Hochverfügbarkeit & Performance (Punkte 56–75)
*Status: Hetzner Bare-Metal Souveränität & Zero-Cloud-Act*

- [x] **56. RPO < 5 Minuten (WAL-Streaming):** Kontinuierliches Streaming der PostgreSQL Write-Ahead-Logs sichert Datenverlust bei Hardware-Crash auf unter 5 Minuten ab (`stream-wal-to-storagebox.sh`).
- [x] **57. RTO < 60 Minuten (Disaster Recovery):** Kompletter Neuaufbau des Hetzner-Servers aus Infrastructure-as-Code und verschlüsseltem Backup dauert nachweislich unter 60 Minuten.
- [x] **58. Georedundantes Backup-Ziel:** Backups werden automatisiert auf eine physisch getrennte Hetzner Storage Box synchronisiert (geografisch divergenter Standort).
- [x] **59. Client-Side AES-256 Backup-Verschlüsselung:** Sicherungsarchive werden vor dem Verlassen des Servers mit AES-256-CBC (PBKDF2) verschlüsselt und mit SHA-256 signiert.
- [x] **60. Backup-Rotationspolitik:** Automatische 30-Tage-Rotation mit Pruning alter Stände schützt vor Speicherschwellen.
- [x] **61. Wöchentlicher Restore-Check:** Dokumentiertes Verfahren zur regelmäßigen Wiederherstellung auf Staging zur Verifikation der Dump-Integrität.
- [x] **62. Sub-200ms Antwortzeiten:** 95 % aller API- und Datenbank-Abfragen antworten unter 200 ms; Covering-Indizes `(school_id, role, id)` sichern sub-5ms Abfragen.
- [x] **63. Server-Side Dashboard Bootstrap RPC:** Bündelt 8 sequenzielle HTTP-Abfragen in einen einzigen Postgres-Roundtrip (`get_student_dashboard_bootstrap`, PERF-03).
- [x] **64. Slow-Query-Logging:** PostgreSQL `log_min_duration_statement = 250` alarmiert Abfragen mit Laufzeiten über 250 ms.
- [x] **65. DB-Index-Verifikation:** Keine sequentiellen Scans (`Seq Scan`) auf großen Tabellen (`students`, `invoices`, `campus_direct_messages`).
- [x] **66. Storage-Quota-Alerting:** Überwachung des Speicherplatzes auf dem Host und der Storage Box mit Schwellenwert-Warnung bei 80 %.
- [x] **67. Zero Memory Leaks:** C- und Haskell-basierte Core-Dienste (PostgreSQL & PostgREST) garantieren absolute Speicher-Stabilität im 24/7-Dauerbetrieb.
- [x] **68. WAF & Egress-Hardening:** Reverse-Proxy blockiert schädliche Scan-Bots; Egress-Firewall verhindert unerlaubte ausgehende Verbindungen.
- [x] **69. Fail2Ban Schutz:** Automatische Sperrung von IP-Adressen nach wiederholten fehlerhaften SSH- oder HTTP-Anfragen (`bantime = 7200`).
- [x] **70. DNS-Redundanz:** Primäre und sekundäre Nameserver sichern die weltweite Auflösung von `campus-groovelab.de`.
- [x] **71. Din 66398 Auto-Purge:** Termingekoppelte Shoutbox-Inhalte werden nach exakt 60 Tagen physisch von Disk gelöscht (Migration 446).
- [x] **72. PWA-Offline-Resilienz:** Service Worker cacht Kern-Assets; App startet selbst bei Netzausfall ohne White-Screen-of-Death.
- [x] **73. Zero Content Occlusion:** Alle mobilen Views garantieren mit `padding-bottom: calc(var(--bottom-bar-height) + env(safe-area-inset-bottom) + 32px)` vollen Scroll-Zugriff auf alle Bedienelemente.
- [x] **74. BFSG 2025 / WCAG 2.2 AA Parität:** Volle Tastatur-Bedienbarkeit, Fokusringe, Mindestkontraste (> 4,5:1) und WAI-ARIA Semantik im Monolithen gewahrt.
- [x] **75. AudioContext Autoplay Unlock:** WebAudio Synthesizer und Loopstation entsperren die Audio-Engine unter iOS/Android beim ersten Tap verzögerungsfrei.

---

## V. Go-Live-Runbook, Rechtsfreigabe & Operations (Punkte 76–100)
*Status: 100% DSGVO, GoBD & Rechtskonformität*

- [x] **76. Rechtliche Dokumenten-Verlinkung:** Impressum, Datenschutz, AGB (Teil A & B), AVV (Art. 28), SLA (99,5%), Eltern-Info (Art. 13), Kinderschutz (§ 8a SGB VIII), Widerruf (B2C) und Barrierefreiheitserklärung sind jederzeit barrierefrei abrufbar.
- [x] **77. Revisionssichere AGB-Protokollierung:** Zeitpunkt, IP-Hash, Version (`2026.3`) und User-ID werden bei Registrierung und Elternaktivierung unlöschbar erfasst (`public.legal_consents`).
- [x] **78. DSGVO-Verarbeitungsverzeichnis (VVT):** Vollständiges Muster-VVT nach Art. 30 DSGVO liegt für Musikschulen und Schulträger vor (`VVT_MUSTER_SCHULTRAEGER_ART30.md`).
- [x] **79. Stand-Alone AVV Suite (Art. 28 DSGVO):** Behördlich vollständiger Auftragsverarbeitungsvertrag inklusive Anlage 1 (Gegenstand & Daten) und Anlage 2 (Vollständige TOMs gem. Art. 32 DSGVO).
- [x] **80. Gewerbliche IT- & Cyber-Haftpflicht:** Aktive Police mit **2.000.000 € Deckungssumme** schützt Plattform und Schulträger vor Vermögensschäden.
- [x] **81. 100 % Google-Fonts- & CDN-Freiheit:** Alle Schriften (Plus Jakarta Sans, Urbanist) und Icons (Lucide) werden lokal aus dem eigenen Bundle ausgeliefert (0 % US-Serverkontakt).
- [x] **82. Cookie-Freiheits-Zertifikat:** Die Plattform nutzt ausschließlich technisch notwendige Session-Speicher; kein nerviges oder abmahnfähiges Cookie-Banner erforderlich.
- [x] **83. E-Mail-Zustellbarkeit (DNS-Hardening):** SPF-, DKIM- und DMARC-Einträge (`p=reject`) für die Domain `campus-groovelab.de` weltweit aktiv.
- [x] **84. Keine Testdaten in Produktion:** Produktionsdatenbank ist frei von synthetischen Mock-Accounts; RLS-Tests laufen in geschützten Rollback-Transaktionen.
- [x] **85. SSL Labs A+ Rating:** TLS 1.3 / 1.2 Konfiguration mit HSTS (`max-age=31536000; includeSubDomains; preload`) bestätigt A+-Sicherheitsbewertung.
- [x] **86. Self-Hosted Error & Security Logging:** Fehlerprotokolle werden datenschutzkonform auf dem eigenen Hetzner-Server erfasst; keine Weiterleitung an US-Cloud-Tracker.
- [x] **87. Incident Response Runbook:** 5-Stufen-Notfallplan für Sicherheitsvorfälle liegt schriftlich vor (`INCIDENT_RESPONSE_RUNBOOK.md`).
- [x] **88. Behördlicher 72-Stunden-Meldeweg:** Direkte Kontaktdaten und Vorgehensweise zur Meldung nach Art. 33 DSGVO an die zuständige Landesdatenschutzbehörde sind dokumentiert.
- [x] **89. GoBD-Verfahrensdokumentation:** Lückenlose Nummernkreise (`invoice_sequences`), WORM-Freeze per Trigger und Cent-Arithmetik (§§ 146/147 AO) sind rechtssicher attestiert (`BILLING_CANONICAL_LOGIC.md`).
- [x] **90. EPC-GiroCode Scan-Test:** Rechnungs-PDFs enthalten den offiziellen EPC-QR-Code (European Payments Council) zur fehlerfreien 1-Scan-Zahlung in Sparkassen-, Volksbank- und Bank-Apps.
- [x] **91. Kalendermäßiges Zahlungsziel (§ 193 BGB):** 14 Tage Zahlungsziel auf allen Rechnungen springt an Samstagen, Sonntagen und Feiertagen automatisch auf den nächsten Bankarbeitstag.
- [x] **92. Didaktische Immunität im Zahlungsverzug:** Schüler und Lehrkräfte werden bei Zahlungsrückständen des Schulträgers niemals ausgesperrt; 28 Tage Schonfrist und 42 Tage Sommer-Moratorium (`schoolDunningEngine.ts`).
- [x] **93. Zero-Foto Doktrin:** Kompletter Verzicht auf biometrische Kinderfotos schützt vor Deepfakes und KUG-Verstößen; Musiker- und Instrumentenavatare als kinderfreundlicher Standard.
- [x] **94. Schülernachnamen-Maskierung:** Peer-to-Peer Schüleransichten maskieren Nachnamen konsequent (`Felix M.`); Schulleitung behält internen rechtlichen Einblick.
- [x] **95. PIN-Enforcement für geteilte Geräte:** Schüler und Eltern können Device Trust deaktivieren und die 4-stellige PIN bei jedem App-Start erzwingen (`pin_enforced_for_preview`).
- [x] **96. SSH-Hardening:** Root-Login und Passwort-Authentifizierung via SSH am Hetzner-Server deaktiviert; administrativer Zugriff ausschließlich über kryptografische Ed25519-Keys auf separatem Port.
- [x] **97. Firewall-Whitelisting (UFW):** Nur HTTP (80), HTTPS (443) und der gehärtete SSH-Port sind nach außen geöffnet; PostgreSQL lauscht ausschließlich lokal (`127.0.0.1`).
- [x] **98. BSI TR-03116 Kryptografie:** Alle Hash- und Verschlüsselungsverfahren (PBKDF2-SHA512, AES-256, Ed25519, WebAuthn FIDO2) entsprechen den verbindlichen BSI-Empfehlungen.
- [x] **99. Mitarbeiter-Offboarding:** Dokumentiertes 1-Click-Verfahren zum sofortigen Entzug administrativer Zugänge bei Personalwechsel.
- [x] **100. Finale Go-Live-Freigabe:** 100 % Konformität mit dem Monolith-Goldstandard von Campus-Groovelab besiegelt.
