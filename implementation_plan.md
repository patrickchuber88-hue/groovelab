# Implementierungsplan: 360° Legal-to-Code Canonical Parity & DPO Compliance Shield (0,1% Goldstandard)

## 1. Problemstellung & Zieldefinition

### Bisherige Diskrepanz (Compliance-Drift):
Die Plattform hat in den jüngsten technischen Härtungen wesentliche architektonische Schutzmechanismen etabliert:
1. **Migration 600 & 601:** *Zero-Knowledge Identity Vault* (`private_auth.blind_student_lastname_vault`) mit HMAC-SHA256 Blind-Links und AES-256 PGP-Verschlüsselung; Nachnamen existieren nicht mehr unverschlüsselt in der Datenbank.
2. **60-Sekunden Auto-Curtain Engine:** Step-Up Re-Authentication via persönlicher 4-stelliger PIN und autoritativer Batch-RPC `reveal_class_roster_names` (< 25 ms) mit flüchtigem Modul-RAM-Cache und automatischem Vorhang nach 60 Sekunden (Schutz gegen Schulterblicke im Unterricht / Shoulder-Surfing).
3. **ReBAC-Schutz für Tonaufnahmen (§ 201 StGB):** Strikte Isolation auf Fachlehrer und Schüler – Schulleitung und Sekretariat haben keinen Zugriff auf Audioaufnahmen Minderjähriger.
4. **Perimeter-DNS-Souveränität:** Nginx Edge verbietet US-DNS-Resolver (nur Hetzner DE `185.12.64.1` und DNS0.eu `193.110.81.0`) und neutralisiert IP-Spoofing.

Diese Innovationen fehlen derzeit in den vertraglichen Rechtstexten (AGB, AVV Anlage 1 & 2 TOMs, VVT Art. 30, DPO-Audit-Portal und PDF-Zertifikaten). Dadurch entsteht ein **juristisches Risiko**: Der Betreiber und die Schulträger können die gesetzliche Safe-Harbor-Wirkung gem. **Art. 34 Abs. 3 lit. a DSGVO / EuGH C-413/23 P** (Befreiung von Meldepflichten bei Datenpannen) vor Aufsichtsbehörden nicht formell einfordern, solange diese TOMs nicht kanonisch in den Verträgen verankert sind.

### 0,1% Goldstandard Zielzustand:
100 % kanonische Parität zwischen Code, Datenbank-Kernel, AGBs, AVVs, VVTs, DPO-Dashboard und generierten PDF-Zertifikaten.

---

## 2. Geplante Maßnahmen & Klausel-Definitionen

### A. Single Source of Truth (SSOT) – `apps/groovelab/src/constants/legalMasterWording.ts`
1. **Erweiterung von `securityStandards`**:
   - `zeroKnowledgeIdentityVault`: Dokumentation der HMAC-SHA256 Blind-Links und des AES-256 PGP Vaults (`private_auth.blind_student_lastname_vault`). Unverknüpfbarkeit gem. EuGH C-413/23 P und Safe-Harbor gem. Art. 34 Abs. 3 lit. a DSGVO.
   - `autoCurtainEngine`: 60-Sekunden Auto-Curtain und Anti-Shoulder-Surfing Vorhang nach Step-Up PIN (NIST SP 800-63B).
   - `audioRebacPrivacy`: Relationship-Based Access Control auf Schüler-Aufnahmen gem. § 201 StGB (Null Zugriff für Schuladministration).
   - `dnsSovereigntyAndAntiSpoofing`: Verbot von US-DNS-Resolvern, Hetzner DE Resolver `185.12.64.1`, Nginx Edge Anti-IP-Spoofing.

### B. AVV, TOMs & Release-Changelog – `apps/groovelab/src/legal/legalContent.ts`
1. **Release `2026.7`**:
   - Aktivierung der Version `2026.7` mit Titel *"360° Zero-Knowledge Identity Vault, 60s Auto-Curtain & Safe-Harbor Governance"*.
2. **Aktualisierung von `Anlage 2` (Art. 32 DSGVO TOMs)**:
   - *1. Vertraulichkeit (Pseudonymisierung & Verschlüsselung)*: Aufnahme des Zero-Knowledge Vaults, der HMAC-Blind-Links und des 60s-Vorhangs.
   - *3. Unterauftragsverhältnisse*: Bestätigung souveräner EU-DNS-Resolver.
3. **Muster-Datenschutzinformationen (Art. 13 DSGVO)**:
   - Aufnahme des ReBAC-Schutzes für Tonaufnahmen (§ 201 StGB) und der adaptiven Schüler-Namensmaskierung ("Vorname + N.").

### C. Behördliches VVT – `docs/VVT_MUSTER_SCHULTRAEGER_ART30.md`
1. **Abschnitt 4 B (Schülerdaten)**:
   - Präzisierung der Schüler-Nachnamensverarbeitung (Zero-Knowledge Identity Vault, Blind-Link-Verschlüsselung, 60s Auto-Curtain).
2. **Abschnitt 7 (TOMs gem. Art. 32 DSGVO)**:
   - Hinzufügung der Punkte 8 (Zero-Knowledge Vault & Safe Harbor) und 9 (ReBAC-Kinderschutz gem. § 201 StGB).

### D. Dossier & Whitepaper-Generatoren (`apps/groovelab/src/utils/`)
1. **`securityWhitepaperGenerator.ts`**:
   - Aktualisierung von Seite 1 (Feature B: Zero-Knowledge Identity Vault & 60s Auto-Curtain) und Seite 2 (TOM 1: Vertraulichkeit & Safe Harbor Art. 34 Abs. 3 lit. a DSGVO).
2. **`dpoComplianceDossierGenerator.ts`**:
   - Aufnahme der Vault- und Auto-Curtain-Kennzahlen in den behördlichen Audit-Bericht.

### E. DPO-Audit-Portal & Schulleitungs-Governance
1. **`apps/groovelab/src/components/DpoAuditPortal.tsx`**:
   - Synchronisation der Audit-Punkte im Reiter "TOMs (Art. 32)" und "Identitäts-Schutz".
2. **`docs/LEGAL_COMPLIANCE_360_DOSSIER.md`**:
   - Vollständiger Abgleich der kanonischen Nachweise.

---

## 3. Betroffene Dateien

### SSOT & Verträge:
- `apps/groovelab/src/constants/legalMasterWording.ts`
- `apps/groovelab/src/legal/legalContent.ts`

### Dokumentation & Behördenmuster:
- `docs/VVT_MUSTER_SCHULTRAEGER_ART30.md`
- `docs/LEGAL_COMPLIANCE_360_DOSSIER.md`

### PDF-Generatoren & UI-Portale:
- `apps/groovelab/src/utils/securityWhitepaperGenerator.ts`
- `apps/groovelab/src/utils/dpoComplianceDossierGenerator.ts`
- `apps/groovelab/src/components/DpoAuditPortal.tsx`

---

## 4. Verifikationsplan

1. **Statischer AST-Scan**: `npm run legal:check` (14 Säulen & 24 Checks müssen mit Exit-Code 0 bestehen).
2. **BSI 360°-Matrix**: `npm run bsi:matrix` (24/24 Checks bestanden, Score 100/100).
3. **TypeScript Typecheck**: Parallelcheck über Monorepo.
