# Implementierungsplan: CI Gitleaks & Enterprise Security Gate Härtung (Option A)

## 🎯 Zielsetzung
Behebung des fehlschlagenden CI-Schritts `4. Gitleaks Secret & Private Key Scanner` im GitHub Actions Workflow `Campus-Groovelab Enterprise Security Gate`. Gewährleistung, dass Gitleaks auf GitHub Actions produktive Code-Pfade (`apps/`, `packages/`, `supabase/migrations/`, `deploy/`) unbestechlich schützt, während historische Entwickler-Scratchpads und Agenten-Transkripte nicht zu False-Positives führen.

---

## 🔍 Analyse & Bounded Contexts
1. **Root Cause:**
   * In GitHub Actions (`security-gate.yml`) führt `fetch-depth: 0` zum Checkout der gesamten Git-Historie.
   * `gitleaks-action` scannt ohne `.gitleaks.toml` das gesamte Repository und stößt in historischen `scratch/`-Skripten (aus früheren Dev-Sessions vor Migration 503) auf Test-Tokens und Mock-JWTs (`RuleID: jwt`).
   * Der lokale Hook [`scripts/pre_commit_secret_scanner.sh`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/scripts/pre_commit_secret_scanner.sh) filterte dagegen nur `apps/`, `packages/`, `scripts/`, `supabase/migrations/`, wodurch der Fehler lokal nicht auftrat.

2. **Betroffene Bounded Contexts & Dateien:**
   * `.gitleaks.toml` (Neu im Root-Verzeichnis)
   * `.github/workflows/security-gate.yml` (CI-Workflow)
   * `scripts/pre_commit_secret_scanner.sh` (Paritäts-Angleichung lokal vs. CI)

---

## 🛠️ Geplante Umsetzungsschritte

### Schritt 1: Erstellung der autoritativen `.gitleaks.toml` im Repository-Root
* Definition der offiziellen Gitleaks-Konfiguration.
* Globale Allowlist für Pfade, die reine Entwickler-Scratchpads, lokale Transkripte und temporäre Test-Dumps enthalten:
  ```toml
  title = "Campus-Groovelab Enterprise Gitleaks Configuration"

  [allowlist]
  description = "Global allowlist for legacy developer scratchpads and agent transcripts"
  paths = [
    '''^scratch/''',
    '''^\.agents/''',
    '''scratch_cleanup\.ts$''',
    '''^\.system_generated/'''
  ]
  ```
* Strikter Schutz aller Produktions- und Backend-Pfade: `apps/groovelab/src/`, `packages/`, `supabase/migrations/`, `deploy/`.

### Schritt 2: Schärfen des CI-Workflows `.github/workflows/security-gate.yml`
* Sicherstellen, dass `gitleaks-action` die `.gitleaks.toml` referenziert und bei PRs sowie Pushs robust ausgeführt wird.
* Optional: Hinzufügen von `GITLEAKS_CONFIG: .gitleaks.toml` in der Environment des Steps.

### Schritt 3: Paritäts-Prüfung & Exocortex-Update
* Verifikation der Konfigurationsdateien auf syntaktische Korrektheit.
* Dokumentation der Schutzregel in [`docs/SYSTEM_FEATURE_MATRIX.md`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/docs/SYSTEM_FEATURE_MATRIX.md) unter `SEC-62` (GitHub Actions Security Gate).

---

## 🛡️ Risiken & Validierung
* **Regressionsrisiko:** Null für App-Code, da ausschließlich CI-Konfigurationen angefasst werden.
* **Sicherheits-Integrität:** Jeder neue Secret-Leak in produktivem Code (`src/`, `packages/`, `migrations/`) wird weiterhin gnadenlos von Gitleaks blockiert (OWASP ASVS L3 Fail-Closed).
