---
name: campus-dpo-dossier
description: >-
  Kommunales B2B-Compliance-Dossier für Schulträger, Kulturämter und behördliche
  Datenschutzbeauftragte (bDSB). Enthält VVT nach Art. 30 DSGVO, DSFA-Schwellwertprüfung
  nach Art. 35 DSGVO, TOMs nach Art. 32 DSGVO, DIN 66398 Löschkonzept und Personalrats-Freigabeerklärung (§ 87 BetrVG).
---

# 🏛️ Campus-Groovelab DPO & Municipal Compliance Engine

Verwende diesen Skill bei Verhandlungen mit Schulträgern, IT-Sicherheitsprüfungen durch städtische Behörden oder Datenschutz-Audits.

## 1. Die 4 Vertrauens-Säulen für den bDSB
1. **100% Rechenzentren in Deutschland (0% US-Cloud):**  
   IONOS SE (Montabaur, Primär-Cluster) & Hetzner Online GmbH (Falkenstein/Nürnberg, Georedundantes Backup & Storage Box), ISO/IEC 27001 zertifiziert. Stufe-2 Mutterkonzern-Garantie (100% deutsche Gesellschaften ohne US-Mutterkonzern) und Stufe-3 Zero-Support-Backdoor (0% Drittland-Support -> 0% TIA-Pflicht). Volle Immunität gegen US FISA 702 und den US CLOUD Act.
2. **Radikale Datenminimierung für Minderjährige & Kanonische Pseudonymisierung:**  
   Keine E-Mail-Adressen, keine Passwörter, keine Kontodaten von Kindern. Login ausschließlich über QR-Tokens und Schüler-PINs. Kanonische Schülernamen-Pseudonymisierung (Vorname + Initiale gem. Art. 4 Nr. 5 DSGVO) und Schutz von Einzelkaufleuten gem. Art. 4 Nr. 1 DSGVO via `build_safe_school_context`. Duale Kryptografie (Server Bcrypt Cost >= 10 in `private_auth` + Client PBKDF2 100.000 Runden).
3. **Strikte PostgreSQL Row-Level-Security (RLS):**  
   Kernel-Ebene Mandantentrennung auf allen Datenbanktabellen mit `security_barrier = true`. Physischer Airgap auf `users_raw`.
4. **Formelle DSFA-Negativattestierung & DIN 66398:**  
   Keines der Blacklist-Kriterien der DSK ist erfüllt; Voll-DSFA entbehrlich. Automatisiertes Löschkonzept mit Inaktivitäts-Pruner und WORM-Audit-Logging. EU AI Act: 100% deterministische DSP/FFT (0 Pflicht zu KI-Beauftragten oder FRIA). StGB § 201: Zero-Meeting-Bots vs. aktive Push-to-Talk Diktierfunktion.

## 2. Personalrats- & 2-Phasen Herrenberg-Zukunftsschutz (§ 87 BetrVG / § 7 & § 127 SGB IV)
* **Verbot der Leistungskontrolle:** Keine Erfassung von Online-Zeiten, Klickzahlen oder Reaktionsgeschwindigkeiten von Lehrkräften.
* **Kein ERP-System:** Reines didaktisches Add-On. Keine Zeiterfassung, keine Stundensätze, keine Honorarabrechnung im System (Zero-Payroll gem. § 266a StGB).
* **2-Phasen Zukunftsschutzschild:** Phase 1 schützt Bestandsverträge im Rahmen des gesetzlichen Moratoriums gem. § 127 SGB IV befristet bis zum 31.12.2027; Phase 2 garantiert ab 01.01.2028 nach Auslaufen des § 127 SGB IV dauerhafte strukturelle Weisungs- und Indizienfreiheit nach § 7 Abs. 1 SGB IV & BSG B 12 R 3/20 R.

## 3. PDF-Generierung im Code
Die Erzeugung des 5-seitigen druck- und siegelfähigen Behörden-Dossiers erfolgt direkt im Browser via `generateDpoComplianceDossierPDF(options)` in `apps/groovelab/src/utils/dpoComplianceDossierGenerator.ts`.
