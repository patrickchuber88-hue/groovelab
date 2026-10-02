# 🏛️ Erklärung zur Anwendbarkeit (Statement of Applicability – SoA)
**Norm:** DIN EN ISO/IEC 27001:2022 (Annex A) & DIN EN ISO/IEC 27701:2019 (PIMS)  
**Organisation:** Campus-Groovelab Enterprise Systems (Patrick Huber Softwareentwicklung & Cloud-Dienstleistungen)  
**Geltungsbereich (Scope):** Betrieb, Wartung, Entwicklung und Bereitstellung der SaaS-Plattform Campus-Groovelab inklusive Datenbanken, Authentifizierung, Storage und Schüler-Portal  
**Klassifizierung:** Öffentlich / Vorlage für kommunale Schulträger, Kulturämter, bDSB und Auditoren  
**Version:** 2026.1 (Gültig ab Oktober 2026)  
**Status:** REVISIONSFEST GESIEGELT (SHA-256)

---

## 1. Einleitung & Methodik

Gemäß Abschnitt 6.1.3 d) der DIN EN ISO/IEC 27001:2022 dokumentiert dieses Dokument die **Erklärung zur Anwendbarkeit (SoA)** für alle 93 Kontrollmaßnahmen des Annex A. Jede Kontrollmaßnahme wird auf ihre Anwendbarkeit im Kontext von Campus-Groovelab bewertet, inklusive Begründung und konkretem Nachweis der technischen Umsetzung im Codebase bzw. in der Tier-1 Infrastruktur.

Zusätzlich integriert dieses SoA die Anforderungen der **ISO/IEC 27701:2019** für den Schutz personenbezogener Daten (PII) von Minderjährigen nach DSGVO Art. 8 und § 8a SGB VIII.

---

## 2. Kontrollkatalog DIN EN ISO/IEC 27001:2022

### A.5 Organisatorische Maßnahmen (37 Controls)

| Control | Bezeichnung | Status | Begründung & Technischer Nachweis / Evidenz |
| :--- | :--- | :---: | :--- |
| **A.5.1** | Informationssicherheitsrichtlinien | Angewendet | Festgelegt in `FORENSIC_SECURITY_BASELINE.md`, `.agents/AGENTS.md` und `OPERATOR_DAILY_PLAYBOOK.md`. Jährlicher Review. |
| **A.5.2** | Rollen und Verantwortlichkeiten für Informationssicherheit | Angewendet | Betreiberverantwortung dokumentiert in `UNDERWRITING_DOSSIER_EXALI_HISCOX.md`. Klare Funktionstrennung. |
| **A.5.3** | Aufgabentrennung (Segregation of Duties) | Angewendet | Strikte Trennung von Master-Admin, Schulleiter, Lehrkraft, Eltern und Schüler über DB-Enums und RLS. |
| **A.5.4** | Managementverantwortung | Angewendet | Verbindliche Invarianten-Freigabe vor Deployments; Übernahme der Haftung gem. GF-Sorgfaltspflicht. |
| **A.5.5** | Kontakt mit Behörden | Angewendet | Meldekette nach Art. 33 DSGVO (72h) in `INCIDENT_RESPONSE_INSURANCE_RUNBOOK.md` für LfDI BW/BY/HE hinterlegt. |
| **A.5.6** | Kontakt mit Interessengruppen | Angewendet | Einbindung von Schulträgern, VdM-Musikschulen und Personalräten (`MUSTER_DIENSTVEREINBARUNG_PERSONALRAT.md`). |
| **A.5.7** | Bedrohungsinformationen (Threat Intelligence) | Angewendet | Kontinuierliche Überwachung von CVEs via automated `npm audit` und BSI-Sicherheitshinweise. |
| **A.5.8** | Informationssicherheit im Projektmanagement | Angewendet | 4-Phasen-Modell (Exploration $\rightarrow$ Plan $\rightarrow$ Impl $\rightarrow$ Verif) in `.agents/AGENTS.md` kodifiziert. |
| **A.5.9** | Inventar der Informationen und sonstigen zugehörigen Werte | Angewendet | Vollständiges Dateninventar in `VVT_MUSTER_SCHULTRAEGER_ART30.md` und `SYSTEM_FEATURE_MATRIX.md`. |
| **A.5.10** | Zulässige Nutzung von Informationen und Werten | Angewendet | Festgelegt in AGB Teil A & B sowie didaktischer Richtlinie; Verbot privater Cloud-Nutzung. |
| **A.5.11** | Rückgabe von Werten | Angewendet | 1-Klick Export nach Art. 20 DSGVO und Datenlöschung bei Vertragsende gem. AVV Art. 28. |
| **A.5.12** | Klassifizierung von Informationen | Angewendet | 4-Stufen-Modell: Öffentlich, Intern, Vertraulich (Noten), Streng Vertraulich (PINs/Secrets/Auth). |
| **A.5.13** | Kennzeichnung von Informationen | Angewendet | Datenfelder in Postgres-Schemata typisiert (`users_raw`, `private_auth`, Maskierung im View `users`). |
| **A.5.14** | Informationsübertragung | Angewendet | Erzwungenes TLS 1.3 mit HSTS Preload (`max-age=63072000`). Keine unverschlüsselten Übertragungen. |
| **A.5.15** | Zugangskontrolle (Access Control) | Angewendet | Zero-Trust Backend-for-Frontend (BFF), Opaque Session Leases mit Timeout (`session_leases`). |
| **A.5.16** | Identitätsmanagement | Angewendet | Vergabe kryptografischer UUIDs, Schulausweis-Tokens und Passkeys; keine geteilten Accounts. |
| **A.5.17** | Authentifizierungsinformationen | Angewendet | Zero Secret Exposure: PINs/Passwörter niemals im Klartext; PBKDF2-SHA512 und Argon2id. |
| **A.5.18** | Zugangsrechte | Angewendet | Prinzip des geringsten Privilegs (Least Privilege) über PostgreSQL Role Based Access Control (RBAC). |
| **A.5.19** | Informationssicherheit in Lieferantenbeziehungen | Angewendet | Hetzner Online GmbH als Haupt-Lieferant (AVV Art. 28 + ISO 27001 Zertifikat Falkenstein/Nürnberg). |
| **A.5.20** | Behandlung der Sicherheit in Lieferantenvereinbarungen | Angewendet | Strikte Auftragsverarbeitungsverträge mit Verbot von Sub-Auftragsverarbeitern außerhalb der EU. |
| **A.5.21** | Steuerung der Informationssicherheit in der IKT-Lieferkette | Angewendet | Strict Dependency Auditing, Lockfile-Pinning und `license_compliance_guard.mjs`. |
| **A.5.22** | Überwachung und Überprüfung von Lieferantendiensten | Angewendet | Wöchentliche Prüfung von Hetzner Status, SLA-Einhaltung (99,5%) und Monitoring-Metriken. |
| **A.5.23** | Informationssicherheit bei Nutzung von Cloud-Diensten | Angewendet | Verzicht auf US-Hyperscaler (0% AWS/GCP/Azure). Immunität gegen FISA 702 und US CLOUD Act. |
| **A.5.24** | Planung des Managements von Informationssicherheitsvorfällen | Angewendet | 5-Phasen Notfallplan in `INCIDENT_RESPONSE_INSURANCE_RUNBOOK.md`. |
| **A.5.25** | Bewertung von Informationssicherheitsereignissen | Angewendet | Klassifizierungsmatrix (Schweregrade P1 bis P4) mit Eskalationsfristen. |
| **A.5.26** | Reaktion auf Informationssicherheitsvorfälle | Angewendet | Automatisierte Server-Isolierung, Session-Revocation und Backup-Restore-Prozeduren. |
| **A.5.27** | Erkenntnisse aus Informationssicherheitsvorfällen | Angewendet | Verpflichtendes Post-Mortem Dokumentationstemplate in `reports/forensics/`. |
| **A.5.28** | Beweiserhebung (Evidence Collection) | Angewendet | ISO 27037 konforme Protokollierung mit SHA-256 Prüfsummen (`test_worm_audit_trail.ts`). |
| **A.5.29** | Informationssicherheit bei Betriebsstörungen | Angewendet | BCM-Strategie mit RTO $\le$ 45 Min, RPO $\le$ 5 Min (`RUNBOOK_DISASTER_RECOVERY_HETZNER.md`). |
| **A.5.30** | IKT-Bereitschaft für die Business Continuity | Angewendet | Georedundante Hetzner Storage Box Sync (`sync_tombstones_to_storage_box.sh`). |
| **A.5.31** | Gesetzliche, behördliche und vertragliche Anforderungen | Angewendet | DSGVO, BDSG, GoBD, BFSG 2025, UrhG § 60a, BGB §§ 312j/312k lückenlos eingehalten. |
| **A.5.32** | Geistige Eigentumsrechte | Angewendet | Zero Sheet Music Upload Policy; Open-Source Lizenzen über `license_compliance_guard.mjs`. |
| **A.5.33** | Schutz von Aufzeichnungen | Angewendet | GoBD-Verfahrensdokumentation und WORM-Trigger auf Rechnungen und rechtlichen Zustimmungen. |
| **A.5.34** | Schutz der Privatsphäre und von PII | Angewendet | Höchste PIMS-Konformität (ISO 27701), Schüler-Namensmaskierung, Zero-Photo-Doktrin. |
| **A.5.35** | Unabhängige Überprüfung der Informationssicherheit | Angewendet | Master-Runners 1–3 (`export_weekly_resilience_dossier.ts`) mit 25+ automatisierten Suiten. |
| **A.5.36** | Einhaltung von Richtlinien und Standards | Angewendet | Wöchentlicher Operator-Lauf (`npm run operator:weekly`) mit kryptografischem Dossier. |
| **A.5.37** | Dokumentierte Betriebsverfahren | Angewendet | Dokumentiert in `OPERATOR_DAILY_PLAYBOOK.md` und `docs/`. |

---

### A.6 Personenbezogene Maßnahmen (8 Controls)

| Control | Bezeichnung | Status | Begründung & Technischer Nachweis / Evidenz |
| :--- | :--- | :---: | :--- |
| **A.6.1** | Überprüfung (Screening) | Angewendet | Single-Operator-Modell; bei Teamerweiterung Führungszeugnis und Identitätsprüfung. |
| **A.6.2** | Beschäftigungsbedingungen | Angewendet | Vertraulichkeits- und Sicherheitsklauseln in Arbeits- und Dienstleistungsverträgen. |
| **A.6.3** | Sensibilisierung, Ausbildung und Schulung | Angewendet | Schulungsleitfaden für Schulleiter (`SCHULLEITER_COMPLIANCE_CHECKLISTE.md`). |
| **A.6.4** | Disziplinarverfahren | Angewendet | Gesetzliche und vertragliche Sanktionen bei vorsätzlichen Sicherheitsverstößen. |
| **A.6.5** | Verantwortlichkeiten nach Beendigung des Beschäftigungsverhältnisses | Angewendet | Nachvertragliche Geheimhaltungspflichten gem. § 26 BDSG / Geschäftsgeheimnisgesetz. |
| **A.6.6** | Vertraulichkeits- oder Geheimhaltungsvereinbarungen (NDA) | Angewendet | Standardisiert für alle Partner, Lehrkräfte und Schulträger. |
| **A.6.7** | Fernarbeit (Remote Working) | Angewendet | Gehärtete Endgeräte mit Festplattenverschlüsselung (FileVault), MFA und VPN-Zwang. |
| **A.6.8** | Meldung von Informationssicherheitsereignissen | Angewendet | E-Mail-Kanal `security@campus-groovelab.de` und In-App-Eskalationspfad. |

---

### A.7 Physische Sicherheitsmaßnahmen (14 Controls)

*Hinweis: Physische Kontrollen werden zu 100% über den zertifizierten Rechenzentrumspartner **Hetzner Online GmbH** (Falkenstein/Vogtland & Nürnberg) bereitgestellt.*

| Control | Bezeichnung | Status | Begründung & Technischer Nachweis / Evidenz |
| :--- | :--- | :---: | :--- |
| **A.7.1** | Physische Sicherheitsbereiche | Angewendet | Mehrschaliges Perimeterschutzkonzept der Hetzner RZs (Umzäunung, Vereinzelungsanlagen). |
| **A.7.2** | Physischer Zutritt | Angewendet | Elektronische Transponder, biometrische Handvenenleser, lückenlose Zutrittsprotokolle. |
| **A.7.3** | Sicherung von Büros, Räumen und Einrichtungen | Angewendet | Rack-Schlösser, Videoüberwachung und Bewegungsmelder in allen Serverräumen. |
| **A.7.4** | Physische Sicherheitsüberwachung | Angewendet | 24/7 besetzter Wachdienst, lückenlose Videoaufzeichnung mit 90 Tagen Speicherdauer. |
| **A.7.5** | Schutz vor physischen und umweltbedingten Bedrohungen | Angewendet | Früheste Brandfrüherkennung (VESDA), Inergen-Gaslöschanlagen, Hochwasserschutz. |
| **A.7.6** | Arbeiten in Sicherheitsbereichen | Angewendet | 2-Personen-Regel bei Wartungsarbeiten in Rechenzentrumsmodulen. |
| **A.7.7** | Klare Schreibtische und klare Bildschirme (Clear Desk/Screen) | Angewendet | Client-Sperre nach 45 Minuten Inaktivität (`SessionLockModal.tsx`, SEC-21). |
| **A.7.8** | Platzierung und Schutz von Geräten | Angewendet | Aufstellung in klimatisierten 19-Zoll-Racks mit Kaltgangeinhausung. |
| **A.7.9** | Sicherheit von Werten außerhalb der Geschäftsräume | Angewendet | Server verlassen das Rechenzentrum niemals im ungelöschten Zustand. |
| **A.7.10** | Speichermedien | Angewendet | Verschlüsselte SSDs/NVMe; Entsorgung nach DIN 66399 Schutzklasse 3. |
| **A.7.11** | Versorgungseinrichtungen | Angewendet | Redundante Stromeinspeisung (A+B-Feed), dieselgestützte USV-Systeme (N+1). |
| **A.7.12** | Verkabelungssicherheit | Angewendet | Getrennte Trassenführung für Strom- und Datenkabel; glasfaserbasierte Backbone-Anbindung. |
| **A.7.13** | Instandhaltung von Geräten | Angewendet | Regelmäßige Hersteller-Wartung der Hetzner-Serverinfrastruktur. |
| **A.7.14** | Sichere Entsorgung oder Wiederverwendung von Geräten | Angewendet | Degaussing und physisches Schreddern defekter Datenträger mit Vernichtungszertifikat. |

---

### A.8 Technologische Maßnahmen (34 Controls)

| Control | Bezeichnung | Status | Begründung & Technischer Nachweis / Evidenz |
| :--- | :--- | :---: | :--- |
| **A.8.1** | Endbenutzergeräte (User Endpoint Devices) | Angewendet | PWA-Sandbox im Browser; Device Trust und PIN-Zwang bei geteilten Geräten. |
| **A.8.2** | Privilegierte Zugriffsrechte | Angewendet | Master-Admin 2FA (TOTP RFC 6238), 15m Session-Lock (`useMasterAdminIdleLock.ts`). |
| **A.8.3** | Zugriffsbeschränkung auf Informationen | Angewendet | PostgreSQL RLS (`school_id = get_current_user_school_id()`). Migration 445. |
| **A.8.4** | Zugriff auf Quellcode | Angewendet | Git-Repository mit branch protection, GPG-signierten Commits und Secret-Scannern. |
| **A.8.5** | Sichere Authentifizierung | Angewendet | WebAuthn FIDO2 Passkeys, PBKDF2-SHA512 (100k Runden), Token-Login via RPC. |
| **A.8.6** | Kapazitätsmanagement | Angewendet | Server-Monitoring, Sub-200ms API-Latenz-Garantie, CPU/RAM-Alerts bei 80%. |
| **A.8.7** | Schutz vor Schadsoftware | Angewendet | Binary Magic-Bytes Header Guard für alle Uploads (`SEC-25`); keine `.exe`/Skripte. |
| **A.8.8** | Verwaltung technischer Schwachstellen | Angewendet | `npm audit`, Pre-Commit Drift Guards (`scripts/security_drift_guard.mjs`). |
| **A.8.9** | Konfigurationsmanagement | Angewendet | Infrastructure-as-Code (IaC), gehärtete Nginx-Konfiguration, UFW-Firewall. |
| **A.8.10** | Löschen von Informationen | Angewendet | Zertifiziertes 5-Klassen-Löschkonzept gem. DIN 66398 (`COMPLIANCE_DOSSIER_DSGVO_DIN66398.md`). |
| **A.8.11** | Datenmaskierung (Data Masking) | Angewendet | Statisches `NULL::text` in Views; Schüler-Namensmaskierung `Felix M.` im Peer-Bereich. |
| **A.8.12** | Datenverlustprävention (Data Leakage Prevention - DLP) | Angewendet | Zero Secrets im Browser-Storage (LEG-05); Verbot von PIN-Speicherung in Cookies/Storage. |
| **A.8.13** | Datensicherung (Information Backup) | Angewendet | Stündliche PostgreSQL Dumps, WAL-Streaming, Client-Side Age X25519 Verschlüsselung. |
| **A.8.14** | Redundanz von Informationsverarbeitungseinrichtungen | Angewendet | Georedundanz Nürnberg $\leftrightarrow$ Falkenstein; PWA Funkloch-Autarkie bei 0 kbps. |
| **A.8.15** | Protokollierung (Logging) | Angewendet | Unveränderbarer WORM-Audit-Trail (`public.audit_logs`, `test_worm_audit_trail.ts`). |
| **A.8.16** | Überwachungsaktivitäten (Monitoring) | Angewendet | Systemmetriken, PostgreSQL Slow-Query-Logging (`log_min_duration_statement = 250`). |
| **A.8.17** | Zeitsynchronisation | Angewendet | Hochpräzise NTP-Zeitsynchronisation (ptbtime1.ptb.de) für gerichtsverwertbare Logs. |
| **A.8.18** | Nutzung privilegierter Hilfsprogramme | Angewendet | Keine interaktiven Superuser-Tools in Produktion; DB-Zugriff nur via Connection Pooler. |
| **A.8.19** | Installation von Software auf Produktivsystemen | Angewendet | Strikt getrenntes Staging; Produktionssysteme erhalten nur immutable Docker-Images/Builds. |
| **A.8.20** | Netzwerksicherheit | Angewendet | Nginx Reverse Proxy, TLS 1.3 only, HSTS Preload (2 Jahre), CSP Level 3, Fail2ban. |
| **A.8.21** | Sicherheit von Netzwerkdiensten | Angewendet | Nur Ports 80, 443 und gehärteter SSH-Port offen; Postgres bindet an `127.0.0.1`. |
| **A.8.22** | Trennung von Netzwerken | Angewendet | Isolierte interne Hetzner vSwitch Netze für Applikation, DB und Backup Storage Box. |
| **A.8.23** | Web-Filterung | Nicht anwendbar | Server fungiert nicht als Client-Gateway für allgemeines Websurfen (SaaS Backend). |
| **A.8.24** | Verwendung von Kryptografie | Angewendet | BSI TR-02102-1 und TR-03116 konform; AES-256-GCM, PBKDF2-SHA512, Ed25519, Argon2id. |
| **A.8.25** | Lebenszyklus der sicheren Entwicklung | Angewendet | Secure SDLC mit 360° Quality Gate (`TEST_SUITE_360_GOLDSTANDARD.md`). |
| **A.8.26** | Sicherheitsanforderungen an Anwendungen | Angewendet | OWASP ASVS Level 3 Konformität; strikte Zod-Validierung aller Payloads. |
| **A.8.27** | Architektur sicherer Systeme und Entwicklungsprinzipien | Angewendet | Zero-Trust Frontend, Defense-in-Depth, Least Privilege, Fail-Closed Doktrin. |
| **A.8.28** | Sichere Programmierung (Secure Coding) | Angewendet | AST-Guard `security_drift_guard.mjs` blockiert unsichere Code-Muster vor dem Commit. |
| **A.8.29** | Sicherheitstests bei Entwicklung und Abnahme | Angewendet | 25+ Testsuiten in 3 Master-Runnern (`test:contracts`, `test:resilience`, `test:sovereign`). |
| **A.8.30** | Ausgelagerte Entwicklung | Nicht anwendbar | 100% In-House-Entwicklung durch Patrick Huber; keine externen Offshore-Dienstleister. |
| **A.8.31** | Trennung von Entwicklungs-, Test- und Betriebsumgebungen | Angewendet | Physisch getrennte Datenbanken und Umgebungen; 0% Testdaten in der Produktionsdatenbank. |
| **A.8.32** | Änderungsmanagement (Change Management) | Angewendet | Git PR Review, automatisiertes Pre-Commit Gate, getaggte Releases (`v2026.x`). |
| **A.8.33** | Testinformationen | Angewendet | Synthetische Mock-Daten für Tests; echtes Schüler-PII wird niemals in Testumgebungen geladen. |
| **A.8.34** | Schutz von Informationssystemen bei Audits | Angewendet | Audits laufen in isolierten Rollback-Transaktionen ohne Beeinträchtigung des Live-Betriebs. |

---

## 3. Begründung nicht anwendbarer Maßnahmen

Folgende 2 Maßnahmen aus dem 93-Punkte-Katalog wurden als **nicht anwendbar** eingestuft:
1. **A.8.23 (Web-Filterung):** Die Campus-Groovelab-Serverarchitektur fungiert als dedizierter SaaS-Bereitsteller und stellt keinen ausgehenden Proxydienst für das freie Websurfen von Endbenutzern dar.
2. **A.8.30 (Ausgelagerte Entwicklung):** Sämtliche Softwarekomponenten werden zu 100% durch den Inhaber intern entwickelt. Es findet kein Outsourcing an Drittfirmen statt.

---

## 4. Siegelung & Bestätigung

Hiermit wird bestätigt, dass alle als „Angewendet“ deklarierten Kontrollen im Live-System von Campus-Groovelab physisch, logisch und organisatorisch implementiert sind und durch die automatisierte Prüfsuite kontinuierlich überwacht werden.

**Rheinfelden (Baden), Oktober 2026**  
*Patrick Huber, Inhaber & Chief Information Security Officer (CISO)*
