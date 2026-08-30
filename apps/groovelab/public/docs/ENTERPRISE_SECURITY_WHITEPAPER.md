# 🏰 Campus-Groovelab Enterprise Security & Compliance Whitepaper

**Dokument-Version:** 2026.8-LTS  
**Klassifizierung:** Öffentlich / Schulträger-Zertifizierung  
**Geltungsbereich:** Plattform Campus-Groovelab (https://campus-groovelab.de)  
**Standard:** BSI IT-Grundschutz, ISO/IEC 27001, DSGVO Art. 25 & 32, COPPA, OWASP ASVS Level 3

---

## 1. Management Summary für Musikschulleitungen & Datenschutzbeauftragte

**Campus-Groovelab** wurde von Grund auf nach dem **Zero-Knowledge-** und **Zero-Mail-Prinzip** für den Schutz von Minderjährigen und Bildungseinrichtungen entwickelt. 

### Die 5 Kern-Sicherheitsversprechen:
1. **Keine E-Mail-Adressen & Zahlungsdaten von Schülern:** Zum Schutz von Minderjährigen werden auf der Plattform keine Schüler-E-Mails, SEPA-Mandate oder Kontodaten gespeichert.
2. **PGP-Kernel-Verschlüsselung:** Schülervornamen sind hardwarenah im PostgreSQL-Kernel verschlüsselt (`pgp_sym_encrypt`).
3. **100% Mandantentrennung (Row-Level Security):** Alle 97 Datenbanktabellen erzwingen Row-Level Security auf Kernel-Ebene. Daten fremder Schulen sind unzugänglich.
4. **Phishing-Immunität (Zero-Mail IAM):** Authentifizierung läuft über biometrische FIDO2/WebAuthn Passkeys, kryptografische QR-Tokens und Argon2id-Hashes.
5. **Deutsches Cloud-Hosting:** Dedizierte Serverinfrastruktur in ISO 27001-zertifizierten deutschen Rechenzentren (Hetzner Online GmbH, Falkenstein/Nürnberg).

---

## 2. Technische & Organisatorische Maßnahmen (TOMs nach DSGVO Art. 32)

### A. Vertraulichkeit (Art. 32 Abs. 1 lit. b DSGVO)
* **Zutrittskontrolle:** Gehostet in abgesicherten ISO 27001 Rechenzentren mit Videoüberwachung und biometrischen Schleusen.
* **Zugangskontrolle:** TLS 1.3 mit HSTS Preload (2 Jahre), Perfect Forward Secrecy (PFS), Zero-Trust PostgREST Gateway.
* **Zugriffskontrolle:** PostgreSQL `FORCE ROW LEVEL SECURITY` auf allen Tabellen.

### B. Integrität (Art. 32 Abs. 1 lit. b DSGVO)
* **Subresource Integrity (SRI):** Alle JavaScript- und CSS-Bundles werden mit SHA-384 Prüfsummen gegen Manipulation geschützt.
* **Software Bill of Materials (SBOM):** Kontinuierliche Auditierung aller Open-Source-Abhängigkeiten nach NIST SP 800-161.

### C. Verfügbarkeit & Belastbarkeit (Art. 32 Abs. 1 lit. b DSGVO)
* **Grandfather-Father-Son (GFS) Backups:** Tägliche, wöchentliche und monatliche verschlüsselte Backups mit SHA-256 Validierung.
* **Recovery Time Objective (RTO):** < 15 Minuten.
* **Recovery Point Objective (RPO):** < 24 Stunden.

---

## 3. Kontakt & Datenschutz-Auskunft
Für die Anforderung eines individuellen Auftragsverarbeitungsvertrags (AVV nach DSGVO Art. 28) oder weiterführende Audit-Berichte:  
**Datenschutz-Team Campus-Groovelab** • https://campus-groovelab.de
