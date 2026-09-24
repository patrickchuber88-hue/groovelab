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
   Hetzner Online GmbH (Falkenstein/Nürnberg), ISO/IEC 27001 zertifiziert. 0% Drittlandtransfer, volle Immunität gegen US FISA 702 und den US CLOUD Act.
2. **Radikale Datenminimierung für Minderjährige:**  
   Keine E-Mail-Adressen, keine Passwörter, keine Kontodaten von Kindern. Login ausschließlich über QR-Tokens und Schüler-PINs.
3. **Strikte PostgreSQL Row-Level-Security (RLS):**  
   Kernel-Ebene Mandantentrennung auf allen Datenbanktabellen mit `security_barrier = true`. Physischer Airgap auf `users_raw`.
4. **Formelle DSFA-Negativattestierung & DIN 66398:**  
   Keines der Blacklist-Kriterien der DSK ist erfüllt; Voll-DSFA entbehrlich. Automatisiertes Löschkonzept mit Inaktivitäts-Pruner und WORM-Audit-Logging.

## 2. Personalrats- & Herrenberg-Freigabe (§ 87 BetrVG / § 7 SGB IV)
* **Verbot der Leistungskontrolle:** Keine Erfassung von Online-Zeiten, Klickzahlen oder Reaktionsgeschwindigkeiten von Lehrkräften.
* **Kein ERP-System:** Reines didaktisches Add-On. Keine Zeiterfassung, keine Stundensätze, keine Honorarabrechnung im System.
* **Selbstständigkeits-Schutz:** Honorarlehrkräfte und Festangestellte bleiben frei von Weisungsdruck.

## 3. PDF-Generierung im Code
Die Erzeugung des 5-seitigen druck- und siegelfähigen Behörden-Dossiers erfolgt direkt im Browser via `generateDpoComplianceDossierPDF(options)` in `apps/groovelab/src/utils/dpoComplianceDossierGenerator.ts`.
