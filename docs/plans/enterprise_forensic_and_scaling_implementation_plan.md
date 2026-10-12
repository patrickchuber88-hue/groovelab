# 🛡️ Implementation Plan: 0,1% Enterprise Forensic & Scalability Shield

**Status:** PENDING HUMAN APPROVAL (STRICT GOVERNANCE: STOP BEFORE EXECUTION)  
**Standard:** OWASP ASVS Level 3 / BSI TR-03103 / ISO 27037 / DSGVO Art. 5(2), 8, 17, 32 / StGB § 202a  
**Target Architecture:** Campus-Groovelab Sovereign Stack (PostgreSQL 15, Node-BFF, Vite PWA, Hetzner FSN1/NBG1)  

---

## 1. Übersicht & Zielsetzung

Umsetzung der 8 unumstößlichen, konsensualen Optimierungen aus der gemeinsamen Analyse des 0,1%-Systemarchitekten, des Senior IT-Forensikers und des Volljuristen.

| # | Handlungsfeld | Komponente | Forensischer & Rechtlicher Nutzen |
|---|---|---|---|
| **1** | **Merkle-Hash-Chaining** | `audit_logs` & `master_audit_trail` (Migration 558) | WORM-Integrität, Prima-facie-Beweiskraft nach § 371a ZPO |
| **2** | **Vier-Augen Support-Token** | `public.school_support_authorizations` (Migration 558) | Schutz vor § 202a StGB, B2B-Governance für Schulträger |
| **3** | **RLS-Verbundindizes** | `assignments`, `student_homework`, `messages`, `audit_logs` | Performance-Skalierung auf 500+ Schulen, Zero-Cross-Leakage |
| **4** | **Audit Crypto-Shredding** | `private_auth.subject_encryption_keys` & RPC (Migration 558) | Löst Konflikt zwischen Art. 17 DSGVO und GoBD (§ 147 AO) |
| **5** | **Container Kernel-Härtung** | `docker-compose.yml` & Production Spec | Anti-RAM-Dump Schutz (`SYS_PTRACE`, `core: 0`), Art. 32 DSGVO |
| **6** | **NTS-Zeitsynchronisation** | Hetzner Host Chrony Config | Unanfechtbare Fristberechnung (§ 312k BGB) via PTB Atomuhr |
| **7** | **Direct S3 Audio-Streaming** | `apps/groovelab/src/utils/audioStorageHelper.ts` & BFF | 80% Server-Entlastung im Peak, HTTP 206 Range Streaming |
| **8** | **Route-Level Bundle Isolation** | `apps/groovelab/vite.config.ts` | 0 Byte Admin-Code im Schüler-PWA-Bundle, $< 180\text{ KB}$ gz |

---

## 2. Detaillierte Arbeitspakete (Work Breakdown)

### Phase 1: Datenbank-Migrationspaket (`supabase/migrations/558_enterprise_forensic_and_scaling_hardening.sql`)
1. **Merkle-Hash-Chaining Trigger:**
   - Hinzufügen von `previous_record_hash TEXT`, `record_hash TEXT` und `sequence_id BIGINT GENERATED ALWAYS AS IDENTITY` zu `public.audit_logs`.
   - Implementierung der Trigger-Funktion `public.trg_enforce_audit_chain_integrity()`.
   - Absolutes Verbot von `UPDATE` und `DELETE` via `RAISE EXCEPTION`.
2. **Vier-Augen-Support-Governance:**
   - Erstellung der Tabelle `public.school_support_authorizations` mit TTL (15 Minuten), One-Time-Code und Status-Tracking.
   - RPC `public.generate_school_support_code(p_school_id UUID, p_duration_minutes INT)` für Schulleiter.
   - Härtung von `public.activate_support_ghost_session(p_school_id, p_support_code, ...)`: Verlangt zwingend den gültigen 4-Augen-Code.
3. **RLS Verbundindizes:**
   - `idx_assignments_tenant_composite` on `assignments(school_id, student_id, status)`
   - `idx_student_homework_tenant_composite` on `student_homework(school_id, student_id, status)`
   - `idx_messages_tenant_channel_created` on `messages(school_id, channel_id, created_at DESC)`
   - `idx_audit_logs_tenant_created` on `audit_logs(school_id, created_at DESC)`
4. **Crypto-Shredding Vault:**
   - Schema `private_auth.subject_encryption_keys` (Schlüsselverwaltung pro Subjekt).
   - RPC `public.shred_subject_audit_key(p_subject_id UUID)`: Atomares Überschreiben und Nullifizieren des Entschlüsselungs-Keys.

### Phase 2: Ingress- & Container-Härtung (Infrastruktur)
1. **Docker Host & Service Härtung:**
   - Hinzufügen der Kernel-Restriktionen (`cap_drop: [SYS_PTRACE]`, `ulimits: core: 0`) in Docker-Konfigurationen.
2. **NTS-Zeitsynchronisations-Script:**
   - Bereitstellung des autoritativen Setup-Skripts `scripts/setup_ptb_nts_time.sh` für Hetzner Hosts (`ptbtime1.ptb.de`, `ptbtime2.ptb.de`).

### Phase 3: Client & Audio-Engine Schärfung
1. **Direct Audio Storage Helper:**
   - Audit und Schärfung von `apps/groovelab/src/utils/audioStorageHelper.ts` für die bevorzugte Nutzung von BFF Presigned URLs und Range-Streaming.
2. **Vite Route-Level Manual Chunks:**
   - Absicherung in `apps/groovelab/vite.config.ts`, sodass Admin-, Personalrats- und Billing-Module physisch in isolierte Chunks ausgelagert werden und niemals vom Schüler-Bundle referenziert werden.

### Phase 4: Validierung & Living Exocortex Sync
1. Aktualisierung der Product Bible [`docs/SYSTEM_FEATURE_MATRIX.md`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/docs/SYSTEM_FEATURE_MATRIX.md) um die neuen Sicherheits-IDs:
   - `SEC-F01`: Merkle-Hash WORM Audit Ledger
   - `SEC-F02`: Vier-Augen Support Token Governance
   - `SEC-F03`: DSGVO Art. 17 Crypto-Shredding Vault
   - `SEC-F04`: NTS PTB Authenticated Time Tracking
2. Bereitstellung eines dedizierten Test-Skripts `tests/security/enterprise-forensic-chain.test.ts`.

---

## 3. Zwingender Stopp-Punkt (Governance)

Gemäß der Projektverfassung (`.agents/AGENTS.md` - *Implementierungsplan-Governance*) hält der Agent an dieser Stelle **vollständig an**. Es werden keine Dateien modifiziert und keine Hintergrund-Befehle ausgeführt, bis die ausdrückliche schriftliche Genehmigung des Benutzers im Chat vorliegt.
