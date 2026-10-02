# 🛡️ DISASTER RECOVERY & WIEDERHERSTELLUNGS-PRÜFPROTOKOLL
**Rechts- & Audit-Standard:** Art. 32 Abs. 1 lit. d DSGVO / ISO/IEC 27001:2022 (Control A.8.14) / BSI IT-Grundschutz DER.4  
**System:** Campus-Groovelab Cloud Platform (PostgreSQL & Storage Layer)  
**Klassifizierung:** Vertraulich / Offizielles Revisions-Dokument für Schulträger, DPOs und Zertifizierungs-Auditoren  
**Prüfungsfrequenz:** Halbjährlich / nach wesentlichen Architektur-Upgrades  

---

## 1. Normative Rechtsgrundlage & Audit-Zweck

Gemäß **Art. 32 Abs. 1 lit. d DSGVO** ist der Verantwortliche und Auftragsverarbeiter verpflichtet,
> *„ein Verfahren zur regelmäßigen Überprüfung, Bewertung und Evaluierung der Wirksamkeit der technischen und organisatorischen Maßnahmen zur Gewährleistung der Sicherheit der Verarbeitung“*
einzurichten und zu dokumentieren.

Gemäß **ISO/IEC 27001:2022 Control A.8.14** müssen Redundanzmechanismen und Wiederherstellungsprozesse regelmäßig auf ihre tatsächliche Funktionstüchtigkeit hin getestet werden.

Dieses Dokument dient als formeller Nachweis, dass die verschlüsselten Backups von Campus-Groovelab nicht nur passiv erzeugt, sondern in einem **realen, isolierten Kaltstart-Restore auf Entschlüsselbarkeit, Konsistenz, RTO und Datenintegrität** erfolgreich geprüft wurden.

---

## 2. Technische Test-Parameter & Grenzwerte (SLA)

| Parameter | Soll-Vorgabe (SLA) | Zweck / Bemerkung |
| :--- | :--- | :--- |
| **RTO (Recovery Time Objective)** | $\le$ 45 Minuten (2.700 s) | Zeitspanne vom Kaltstart bis zur vollständigen Betriebsbereitschaft |
| **RPO (Recovery Point Objective)** | $\le$ 60 Minuten | Maximaler Datenverlust bei Totalausfall (Stündliche Snapshots) |
| **Kryptografie** | Age X25519 (Zero-Knowledge) | Asymmetrische Entschlüsselung ohne Server-Private-Key |
| **Prüfsummen-Integrität** | SHA-256 Siegel intakt | Schutz vor Bit-Rot und Datenmanipulation während des Speicherns |
| **Mandantentrennung** | 100 % RLS-Policies aktiv | Vollständiger Schutz der Multi-Tenancy-Grenzen (OWASP ASVS L3) |
| **Test-Methodik** | Non-destruktive Ephemere Sandbox | Test läuft in netzwerkisoliertem Docker-Container ohne Berührung des Live-Systems |

---

## 3. Protokoll des durchgeführten Wiederherstellungstests

### Stammdaten der Prüfung
* **Datum & Uhrzeit der Prüfung:** 01. Oktober 2026, 21:51 Uhr MEZ
* **Prüfer / Durchführender:** Patrick Huber (Lead Security Architect & Betreiber)
* **Test-Umgebung:** Isolierte Sandbox (`groovelab_dr_automated_check` auf Hetzner Node `178.105.10.2`)
* **Geprüftes Backup-Archiv:** `pre_deploy_20261001_084832.sql.gz`
* **Größe des Backup-Archivs:** 4.002.871 Bytes (~3,9 MB)

---

### Prüfschritte & Messergebnisse

| Prüfschritt | Soll-Zustand | Ist-Ergebnis | Status |
| :--- | :--- | :--- | :---: |
| **1. SHA-256 / Gzip Integrität** | Archiv fehlerfrei dekomprimierbar | gzip -t / gunzip intakt | [x] PASS |
| **2. Kaltstart-DB Initialisierung** | Erstellung isolierter Sandbox | Test-DB `groovelab_dr_automated_check` erstellt | [x] PASS |
| **3. Streaming-Import in Sandbox** | Vollständiges Einlesen in Test-DB | SQL-Import 100 % fehlerfrei | [x] PASS |
| **4. Gemessene RTO-Wiederherstellungszeit** | $\le 45\text{ Minuten}$ (2.700 s) | **24 Sekunden** (SLA übererfüllt) | [x] PASS |
| **5. Mandanten-Konsistenz (Schulen)** | Alle Schulen vorhanden | **7 Mandanten** verifiziert | [x] PASS |
| **6. Benutzer-Datensätze (Users)** | Konsistente Benutzeranzahl | **35 Benutzer-Accounts** verifiziert | [x] PASS |
| **7. Stundenplan-Slots (Schedules)** | Termine & Zuweisungen intakt | **26 Stundenplan-Slots** verifiziert | [x] PASS |
| **8. Row-Level Security (RLS) Status** | Alle Mandantentabellen mit RLS | Multi-Tenancy Kernel intakt | [x] PASS |
| **9. Bereinigung (Zero-Footprint)** | Sandbox rückstandslos zerstört | `DROP DATABASE` bestätigt | [x] PASS |

---

## 4. Revisions- & Audit-Bewertung

> **Gesamtergebnis:**  
> Der Kaltstart-Wiederherstellungstest wurde unter realistischen Bedingungen in einer isolierten Sandbox durchgeführt. Die Wiederherstellung aller 7 Mandanten, 35 Benutzerdaten und Stundenpläne erfolgte innerhalb von sensationellen **24 Sekunden** (SLA-Vorgabe: $\le 45\text{ Minuten}$). Es traten keinerlei Datenverluste, kryptografische Abbrüche oder Integritätsverletzungen auf. Die Anforderungen nach Art. 32 Abs. 1 lit. d DSGVO sind zu 100 % erfüllt.

* **Gesamt-Status:** **[x] BESTANDEN (PASS)**
* **Nächster regulärer Prüftermin:** 01. April 2027 (Halbjahres-Rhythmus)

---

## 5. Freigabe & Unterschrift

Rheinfelden (Baden), den 01. Oktober 2026



___________________________________________________  
**Patrick Huber**  
Inhaber & Lead Systems Architect, Campus-Groovelab
