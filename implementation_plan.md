# 📋 Implementierungsplan (Phase 2): 360° Legal-Text, Dashboard & PDF-Synchronisation (Migrations 600–605)

## 1. Zielsetzung & Technischer Referenz-Maßstab (10/10 IST-Zustand)
Synchronisation sämtlicher Rechtstexte, Datenschutz-Cockpits, Modals, Exocortex-Dossiers und **aller relevanten PDF-Generatoren** der Campus-Groovelab App auf den realen technischen Datenbank-IST-Zustand der **Migrationen 600 bis 605**:

1. **3-Stufen-Identitätsprojektion (`public.users` View, Migration 600):**
   - **Stufe 1 (Schüler / Mitschüler / Ensemble-Peers / Anon):** `last_name` wird auf SQL-View-Ebene technisch hart als **`NULL`** projiziert (`0 %` Nachname, `0 %` Initiale; Mitschüler sehen ausschließlich den Vornamen, z. B. `„Amelia“` -> *relative Anonymisierung* gem. EuGH C-413/23 P).
   - **Stufe 2 (Lehrkraft / Schulleitung / Sekretariat im Regelbetrieb):** `public.users_raw.last_name` speichert physisch ausschließlich das 1-Buchstaben-Initial (`„N.“` -> `„Amelia N.“`; *kanonische Pseudonymisierung* gem. Art. 4 Nr. 5 & Art. 25 DSGVO).
   - **Stufe 3 (On-Demand Step-Up Reveal im Verwaltungs-/Notfall, Migration 603–604):** Temporäre Entschlüsselung über `reveal_student_full_name` / `reveal_class_roster_names` mit striktem **Teacher-Scoping** (Lehrkräfte nur eigene zugewiesene Schüler, Schulleitung/Sekretariat nur eigene Schule), **60-Sekunden Auto-Curtain** (automatischer RAM-Wipe) und unveränderbarem **WORM-Audit-Log** (`REVEAL_STUDENT_FULL_NAME` / `REVEAL_CLASS_ROSTER_NAMES`).
2. **Fremdschlüsselfreier 360° Zero-Knowledge Identity Vault (`private_auth.blind_student_lastname_vault`, Migration 600–605):**
   - Speichert den Nachnamen als `PGP_SYM_ENCRYPT(..., 'cipher-algo=aes256')` Chiffrat **ohne `student_id`-Spalte**, adressiert ausschließlich über den kryptografischen Blind-Index `blind_link_hmac = HMAC-SHA256(student_id || ':' || school_id, school_secret)`.
   - Mandantenspezifische Schlüsselkapselung (`private_auth.school_key_envelopes`) + Fail-Closed Master-Key-Tresor (`private_auth.vault_master_keys`, Migration 605, 0 % Hardcoded-Fallback) -> **Safe-Harbor-Privilegierung nach Art. 34 Abs. 3 lit. a DSGVO**.
3. **Zero-Client-PIN Step-Up Leases (`private_auth.step_up_leases`, Migration 604):**
   - Keine Speicherung der Klartext-PIN im Browser-RAM; das Frontend hält nur ein serverseitig ausgestelltes, auf **300 Sekunden** befristetes UUID-Lease-Token (`p_step_up_token`), das beim Auto-Curtain via `revoke_step_up_lease` widerrufen wird.
4. **Kernel In-Flight Auto-Verschlüsselung (`private_auth.trg_users_raw_zero_knowledge_vault`, Migration 605):**
   - `BEFORE INSERT OR UPDATE ON public.users_raw` fängt jeden eingehenden Klartext-Nachnamen (`length > 2`) eines Schülers noch vor dem Schreiben auf den Datenträger ab, verschlüsselt ihn PGP-AES-256 in den Blind-Vault und überschreibt `NEW.last_name` atomar auf `„X.“`.
5. **Deterministischer Art. 17 DSGVO Kernel-Vault-Purge (`private_auth.trg_users_raw_vault_purge`, Migration 605):**
   - `AFTER DELETE ON public.users_raw` berechnet deterministisch den `blind_link_hmac`, vernichtet das Nachnamens-Chiffrat im `blind_student_lastname_vault` rückstandslos und protokolliert den WORM-Nachweis `PURGE_STUDENT_VAULT_RECORD`.
6. **Physische Vernichtung historischer Quarantäne-Tabellen (Migration 605):**
   - `_deprecated_student_last_names_quarantine` und `_deprecated_student_first_names_quarantine` sind per `DROP TABLE ... CASCADE` physisch gelöscht.

---

## 2. Geplante chirurgische Änderungen nach Dateigruppen

### Gruppe A: Zentrale Rechtstexte & SSOT-Kataloge
1. `apps/groovelab/src/constants/legalMasterWording.ts` (Säule 17 `pseudonymizationAndSoleProprietorProtection`)
2. `apps/groovelab/src/legal/legalContent.ts` (`terms_student_platform`, `avv_standalone`, `school_parent_privacy_notice`, `platform_privacy`, `junior_privacy`)
3. `apps/groovelab/src/constants/complianceRuleCatalog.ts` (`RULE-009`)

### Gruppe B: Dashboards, Boards, Modals & Services
4. `apps/groovelab/src/components/AVVModal.tsx` (§ 2 Abs. 2 & § 5 Nr. 3–4)
5. `apps/groovelab/src/components/DpoAuditPortal.tsx` (Fix `WORM-INIT-1005` Z. 274 + Tab 2 `AVV_TOM` + Tab 3 `RIGHTS` + Tab 4 `MUNICIPAL_DPO` VVT)
6. `apps/groovelab/src/components/secretary/modals/SecretaryPrivacyGovernanceModal.tsx` (Sektion 1 & Sektion 4)
7. `apps/groovelab/src/components/student/settings/ParentConsentSettingsView.tsx` (Eltern-Datenschutz-Box)
8. `apps/groovelab/src/services/gdprDataExportService.ts` (Art. 15/20 JSON-Metadaten)

### Gruppe C: Alle relevanten PDF-Generatoren (11 PDF-Ausgaben in 6 Generator-Modulen)
9. `apps/groovelab/src/utils/b2bContractPdfGenerator.ts` (Anlage 2 AVV & TOMs)
10. `apps/groovelab/src/utils/parentConsentPdfGenerator.ts` (Säule 2 & 4 im Eltern-Merkblatt-PDF)
11. `apps/groovelab/src/utils/gdprDataTakeout.ts` (Art. 15/20 JSON-Manifest & DIN 5008 PDF-Bescheid)
12. `apps/groovelab/src/utils/dpoComplianceDossierGenerator.ts` (4-Seiten Behörden-DSB-Dossier)
13. `apps/groovelab/src/utils/securityWhitepaperGenerator.ts` (2-Seiten TOM-Whitepaper)
14. `apps/groovelab/src/utils/pdfGenerator.ts` (`generateConsentPDF`, `generateDSBCompliancePDF`, `generateTeacherQuickstartPDF`, `generateGdprDataReportPDF`, `generateGdprDeletionCertificatePDF`, `generateB2BContractCertificatePDF`)

### Gruppe D: Exocortex-Dossiers & Automatisierter Legal-Compliance-Guard
15. `docs/VVT_MUSTER_SCHULTRAEGER_ART30.md`, `docs/LEGAL_COMPLIANCE_360_DOSSIER.md` & `scripts/legal_compliance_guard.mjs` (`LEG-37`)
