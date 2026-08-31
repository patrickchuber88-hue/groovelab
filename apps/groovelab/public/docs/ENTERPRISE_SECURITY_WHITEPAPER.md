# 🏰 Campus-Groovelab Enterprise Security & Compliance Whitepaper

**Dokument-Version:** 2026.8-LTS  
**Klassifizierung:** Öffentlich / Schulträger-Zertifizierung  
**Geltungsbereich:** Plattform Campus-Groovelab (https://campus-groovelab.de)  
**Standard:** BSI IT-Grundschutz, ISO/IEC 27001, DSGVO Art. 25 & 32, COPPA, OWASP ASVS Level 3, TDDDG

---

## 1. Management Summary für Musikschulleitungen & Datenschutzbeauftragte

**Campus-Groovelab** wurde von Grund auf nach dem **Zero-Knowledge-**, **Zero-Mail-** und **Banking-Grade BFF-Prinzip** für den kompromisslosen Schutz von Minderjährigen und Bildungseinrichtungen entwickelt. 

### Die 7 Säulen der Enterprise-Sicherheitsarchitektur:
1. **BFF-Gateway & JWE A256GCM Token-Isolation:** Vollständige Entkopplung des Browsers von internen Datenbank-Tokens. Sessions werden serverseitig mit AES-256-GCM verschlüsselt in `__Host-session` HttpOnly-Cookies geführt (Zero-Token-Leakage in LocalStorage / SessionStorage).
2. **Proaktiver Silent Refresh:** Automatischer Token-Austausch 60 Sekunden vor Ablauf im Hintergrund auf dem Server ohne Client-Zutun und ohne Unterrichtsunterbrechungen.
3. **Fail-Closed Anti-CSRF & Origin-Guard:** Schutz aller API-Mutationen über browser-native `Sec-Fetch-Site` Filterung, Host-Header-Poisoning-Prüfung und Fail-Closed-Verifizierung.
4. **100% PostgreSQL FORCE Row-Level Security (RLS):** Kernel-erzwungene Mandantentrennung auf allen Datenbanktabellen mit transaktional isoliertem Mandantenkontext (`is_local = true`) und automatisierter Vitest-Sicherheits-Gate-Testsuite.
5. **Zero-Mail IAM & Biometrische Passkeys:** Vollständiger Verzicht auf E-Mail-Server. Authentifizierung über FIDO2/WebAuthn Hardware-Passkeys mit Klon-Schutz, kryptografische QR-Tokens und PBKDF2/Argon2id-Hashes (100.000 Runden).
6. **Subresource Integrity (SRI) & Immutable WORM-Ledger:** Alle JS/CSS-Bundles sind in `index.html` mit SHA-384 Hashes versiegelt. Audit-Events werden nach dem WORM-Prinzip (Write Once Read Many) manipulationssicher protokolliert.
7. **ISO 27001 Hosting in Deutschland & Stündliche Backups:** Dedizierte Serverinfrastruktur in ISO 27001-zertifizierten deutschen Rechenzentren (Hetzner Online GmbH, Falkenstein/Nürnberg) mit stündlich automatisierten, verschlüsselten Backups.

---

## 2. Technische & Organisatorische Maßnahmen (TOMs nach DSGVO Art. 32)

### A. Vertraulichkeit (Art. 32 Abs. 1 lit. b DSGVO)
* **Zutrittskontrolle:** Gehostet in ISO 27001-zertifizierten Rechenzentren mit Videoüberwachung und biometrischen Schleusen (Hetzner Falkenstein & Supabase Frankfurt).
* **Transportverschlüsselung:** Durchgehend TLS 1.3 mit HSTS Preload, Perfect Forward Secrecy (PFS) und verschlüsselten WebSockets.
* **Session-Verschlüsselung:** AES-256-GCM JWE mit rotierenden Server-Keys.
* **Zugriffskontrolle:** PostgreSQL `FORCE ROW LEVEL SECURITY` auf allen Mandantentabellen.

### B. Integrität (Art. 32 Abs. 1 lit. b DSGVO)
* **Subresource Integrity (SRI):** Alle Frontend-Dateien mit SHA-384 Prüfsummen gegen Supply-Chain-Angriffe versiegelt.
* **Hash-Standards:** OWASP- und BSI-konformes PBKDF2 Zero-Knowledge Hashing mit 100.000 SHA-512 / SHA-256 Runden.
* **Input-Sanitization & Rate Limiting:** Vollständig parametrisierte Queries, 3-Strike Dynamic Rate Limiting auf Authentifizierungsrouten.

### C. Verfügbarkeit & Belastbarkeit (Art. 32 Abs. 1 lit. b DSGVO)
* **Stündliche Datensicherung:** Automatisierte verschlüsselte Datenbank-Dumps auf separaten Block-Volumes.
* **Recovery Time Objective (RTO):** < 15 Minuten im Desaster-Recovery-Fall.
* **Recovery Point Objective (RPO):** < 1 Stunde.
* **Offline-Resilienz:** IndexedDB Audio-Tresor (`groovelab_audio_vault`) für unterbrechungsfreie Musikproben in Proberäumen ohne Internetverbindung.

---

## 3. Kontakt & Datenschutz-Auskunft
Für die Anforderung eines individuellen Auftragsverarbeitungsvertrags (AVV nach DSGVO Art. 28) oder weiterführende Audit-Berichte:  
**Datenschutz-Team Campus-Groovelab** • https://campus-groovelab.de
