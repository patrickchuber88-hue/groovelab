# 🛡️ Campus-Groovelab Operatives SecOps & Privacy Hardening Runbook

**Klassifizierung:** ENTERPRISE STANDARD / AUDIT RUNBOOK  
**Geltungsbereich:** Hetzner Dedicated VPS Host (`178.105.10.2`) & Domain DNS (`campus-groovelab.de`)  
**Standard:** BSI TR-02102-1, BSI TR-03116, DSGVO Art. 25/32, DIN 66398 (Löschkonzept)  
**Revisionsstand:** September 2026

---

## 1. Übersicht & Zielsetzung

Dieses Runbook definiert die operativen Pflichtmaßnahmen für den Host-Betreiber und Systemadministrator zur vollständigen Absicherung des **Campus-Groovelab** Perimeters. Während die Anwendungs- und Datenbankebene durch Security-Definer RPCs, Row-Level-Security und striktes Zero-Trust abgesichert ist, schließt dieses Dokument die Schnittstellen auf **DNS-, Mail- und Host-Betriebsebene**.

---

## 2. DNS-Perimeter-Härtung (`campus-groovelab.de`)

Zur Abwehr von Spoofing, Phishing-Angriffen auf Schulen, unberechtigten TLS-Zertifikatsausstellungen und zur Gewährleistung von E-Mail-Integrität sind folgende DNS-Resource-Records beim Domain-Registrar zwingend zu setzen:

### A. DMARC Policy (Strikte Abweisung unberechtigter Absender)
* **Name / Host:** `_dmarc.campus-groovelab.de`
* **Typ:** `TXT`
* **TTL:** `3600`
* **Wert:**
  ```text
  v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s; rua=mailto:kontakt@campus-groovelab.de; fo=1;
  ```
* **Forensische Wirkung:** Externe Mailserver verwerfen (`reject`) gefälschte E-Mails im Namen von `campus-groovelab.de` sofort, falls SPF oder DKIM fehlschlagen.

### B. SPF (Sender Policy Framework)
* **Name / Host:** `campus-groovelab.de`
* **Typ:** `TXT`
* **TTL:** `3600`
* **Wert:**
  ```text
  v=spf1 ip4:178.105.10.2 ~all
  ```
* **Forensische Wirkung:** Autorisierte Absender-IP wird strikt auf den Hetzner VPS gebunden.

### C. DNS CAA (Certificate Authority Authorization)
* **Name / Host:** `campus-groovelab.de`
* **Typ:** `CAA`
* **TTL:** `3600`
* **Werte:**
  ```text
  0 issue "letsencrypt.org"
  0 issuewild "letsencrypt.org"
  0 iodef "mailto:kontakt@campus-groovelab.de"
  ```
* **Forensische Wirkung:** Verhindert Man-in-the-Middle-Angriffe durch unberechtigte Zertifikatsausstellung anderer CAs (z. B. DigiCert, Comodo). Nur *Let's Encrypt* darf Zertifikate signieren.

---

## 3. Hetzner Host-Cron- & Automatisierungs-Matrix

Auf dem Hetzner-Server (`/etc/crontab` oder `crontab -e` als Benutzer `root`) sind folgende Bereinigungs- und Prüfskripte einzurichten:

```bash
# ==============================================================================
# 🧹 1. DIN 66398 STORAGE JANITOR (Täglich um 03:30 Uhr UTC)
# Physisches Löschen verwaister Audio-Objekte (> 30 Tage) und Schuljahres-Purge (30.09.)
# ==============================================================================
30 3 * * * /bin/bash /var/www/groovelab/scripts/storage_janitor_cron.sh >> /var/log/campus_storage_janitor.log 2>&1

# ==============================================================================
# 🛡️ 2. NIGHTLY SECOPS AUDIT (Täglich um 04:00 Uhr UTC)
# Unveränderbare Integritätsprüfung aller Docker-Container, Logs und Berechtigungen
# ==============================================================================
0 4 * * * /bin/bash /var/www/groovelab/scripts/nightly_secops_audit.sh >> /var/log/campus_nightly_secops.log 2>&1

# ==============================================================================
# 📦 3. DISASTER RECOVERY RESTORE VERIFICATION (Jeden Sonntag um 02:00 Uhr UTC)
# Testweises Wiederherstellen des letzten verschlüsselten Backups in Test-DB
# ==============================================================================
0 2 * * 0 /bin/bash /var/www/groovelab/scripts/server_automated_dr_verify.sh >> /var/log/campus_dr_verify.log 2>&1

# ==============================================================================
# 🧹 4. INAKTIVITÄTS-ABRECHNUNGS-BEREINIGUNG (Monatlich am 1. um 01:00 Uhr UTC)
# Führt auto_deactivate_inactive_students() nach 60 Tagen Inaktivität aus
# ==============================================================================
0 1 1 * * docker exec -i supabase-db psql -U postgres -d postgres -c "SELECT public.auto_deactivate_inactive_students();" >> /var/log/campus_inactivity_cleanup.log 2>&1
```

---

## 4. Disaster-Recovery & Backup-Integritäts-Protokoll

Zur Erfüllung der BSI IT-Grundschutz-Anforderungen und der Bedingungen der Cyber-Versicherung (Hiscox/Exali):

1. **Verschlüsselte Offsite-Replikation:**
   - Skript: [`scripts/backup_encrypted.sh`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/scripts/backup_encrypted.sh)
   - Backups werden lokal mit AES-256 (GPG) verschlüsselt, bevor sie georedundant auf den sekundären Storage-Host synchronisiert werden.
2. **Restore-Verifikation:**
   - Vor jedem größeren Release oder mindestens quartalsweise ist [`scripts/verify_backup_restore.sh`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/scripts/verify_backup_restore.sh) manuell auszuführen, um die Wiederherstellungszeit (RTO < 30 Minuten, RPO < 1 Stunde) zu auditieren.

---

## 5. Betroffenenrechte & Vorfallsmeldung (Art. 33 DSGVO)

* **48-Stunden-Meldepflicht:**  
  Tritt ein unberechtigter Datenzugriff oder Datenverlust auf, ist unverzüglich das Runbook [`docs/INCIDENT_RESPONSE_INSURANCE_RUNBOOK.md`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/docs/INCIDENT_RESPONSE_INSURANCE_RUNBOOK.md) zu aktivieren.
* **Art. 20 Datenportabilität (Self-Service):**  
  Schüler und Eltern können ihr vollständiges Datenpaket über **Einstellungen > Downloads & Datentresor > Art. 20 Gesamtdaten** jederzeit selbstständig herunterladen.
* **Art. 17 Datenlöschung bei Austritt:**  
  Wird ein Schülerprofil deaktiviert oder gelöscht, triggert die Datenbank automatisch den Sofort-Purge aller Audioaufnahmen über `public.purge_student_audio_assets(p_student_id)` (Migration 372).
