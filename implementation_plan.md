# 🏛️ 0,1% Goldstandard Implementierungsplan: Sovereign 0% US-Cloud Release & Deployment Hardening

> **Axiom & Oberste Doktrin:** **0 % US-Cloud-Abhängigkeit.** Keine Nutzung von US-Cloud-Diensten (AWS, GCP, Azure, Cloudflare, Vercel, Supabase US-Cloud). 100 % der Daten, Rechenkapazität, Backups und Deployments verbleiben in ISO/IEC 27001 zertifizierten deutschen Rechenzentren (Hetzner Falkenstein / Nürnberg).  
> **Ziel:** Vollständige Härtung der Pipeline gemäss IT-Forensiker-Standard:
> 1. Git-Remote auf lokalen Ed25519-SSH-Schlüssel umstellen (Eliminierung interaktiver HTTPS-Prompts ohne US-Vermittlung).
> 2. Kryptografische CycloneDX SBOM (`sbom.cdx.json`) & SHA-256 Release-Siegelung direkt in `deploy.sh` verankern.
> 3. Read-Only Migrations-Paritäts-Preflight in `deploy.sh` integrieren (Schutz gegen Split-Brain ohne DDL-Privilegien für `deployuser`).
> 4. Explizite Verankerung der „0% US Cloud“-Doktrin in den Systemregeln & Deployment-Preflights.

---

## 🔍 1. Forensische Bestandsaufnahme & Architektur-Audit

1. **Git Remote Transport:**  
   - Aktuell steht `origin` auf `https://patrickchuber88-hue@github.com/patrickchuber88-hue/groovelab.git`.  
   - Der lokale Rechner besitzt bereits einen voll autorisierten Ed25519-Schlüssel (`~/.ssh/id_ed25519`), der bei GitHub als `patrickchuber88-hue` hinterlegt und funktionsfähig ist (`Hi patrickchuber88-hue! You've successfully authenticated`).  
   - Ein Wechsel auf `git@github.com:patrickchuber88-hue/groovelab.git` beseitigt alle Passwort-Prompts vollständig, ohne Passwörter im RAM oder in temporären Dateien abzulegen.

2. **SBOM & Supply-Chain-Transparenz (ISO/IEC 5230 & NIST SP 800-161):**  
   - [`scripts/generate_cyclonedx_sbom.mjs`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/scripts/generate_cyclonedx_sbom.mjs) existiert bereits und analysiert alle direkten und transitiven Abhängigkeiten.  
   - Aktuell wird es jedoch in `deploy.sh` noch nicht automatisch aufgerufen.  
   - Durch Einbindung in den Pre-Deploy-Shield von `deploy.sh` wird bei jedem Release atomar eine `sbom.cdx.json` und ein kryptografischer SHA-256 Digest erzeugt und im Release-Ordner `/var/www/groovelab/releases/$RELEASE_ID/` abgelegt.

3. **Read-Only Migrations-Paritäts-Wächter (Anti-Split-Brain):**  
   - Das Frontend setzt auf Tabellen und RPCs auf, die durch Migrationen (z. B. 531, 533, 537) bereitgestellt werden.  
   - Ein versehentliches Frontend-Deployment auf eine veraltete Datenbank führt zu UI-Laufzeitfehlern.  
   - Umgekehrt darf `deployuser` niemals DDL-Rechte (`CREATE`, `ALTER`) besitzen.  
   - Lösung: Ein schneller, rein lesender Preflight-Check in `deploy.sh`, der via SSH prüft, ob die höchste lokale Migrationsnummer in der Datenbank vorliegt, bevor rsync startet.

---

## 🛠️ 2. Geplante Änderungen im Detail

### Schritt 1: Git-Remote auf SSH umstellen
* **Befehl:** `git remote set-url origin git@github.com:patrickchuber88-hue/groovelab.git`
* **Verifikation:** `git push origin main` (überträgt die beiden lokalen Commits `2cfd7895` und `2a5ffa28` nahtlos per Ed25519-Signatur).

### Schritt 2: CycloneDX SBOM Generator veredeln & in `deploy.sh` integrieren
* **Datei:** [`scripts/generate_cyclonedx_sbom.mjs`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/scripts/generate_cyclonedx_sbom.mjs)
  * Ausgabe als kanonisches `dist/sbom.cdx.json` sicherstellen.
  * Erzeugung eines SHA-256 Hash-Siegels `dist/sbom.cdx.json.sha256`.
* **Datei:** [`deploy.sh`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/deploy.sh)
  * In Phase 0 (Pre-Deployment Security Shield) den Aufruf `node scripts/generate_cyclonedx_sbom.mjs` verankern.
  * Die SBOM-Dateien werden automatisch per `rsync` in das neue Release-Verzeichnis übertragen.

### Schritt 3: Read-Only Migrations-Paritäts-Check in `deploy.sh` integrieren
* **Datei:** [`deploy.sh`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/deploy.sh)
  * Vor Phase 1: Ermittlung der höchsten lokalen Migrations-ID in `supabase/migrations/` (z. B. `537`).
  * Ausführung einer schlanken, nicht-invasiven Read-Only-Prüfung über SSH gegen den Supabase-DB-Container:
    Prüft, ob die Tabelle `public.teacher_score_snippets` (aus Migration 537) bzw. die entsprechende Migration existiert.
  * Schlägt die Prüfung fehl, stoppt das Script sofort (Fail-Closed) mit verständlicher Operator-Handlungsanweisung.

### Schritt 4: Verankerung der „0% US-Cloud“-Doktrin
* **Datei:** [`.agents/AGENTS.md`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/.agents/AGENTS.md)
  * Aufnahme des unantastbaren Axioms: *„Absolute 0% US-Cloud-Doktrin: Niemals US-Cloud-Dienste (AWS, GCP, Azure, Cloudflare, Vercel, Supabase US-Cloud) einbinden. Vollständige Daten- und Betriebssouveränität in Deutschland (Hetzner Falkenstein/Nürnberg).“*
* **Datei:** [`docs/SYSTEM_FEATURE_MATRIX.md`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/docs/SYSTEM_FEATURE_MATRIX.md)
  * Aktualisierung der Matrix-Integrität und Exocortex-Eintrag.

---

## 🔒 3. Invarianten & Sicherheits-Schnittstellen

| Invariante | Zielwert / Status | Schutzmechanismus |
| :--- | :---: | :--- |
| **US-Cloud Exposure** | **0,00 %** | Keine US-Server, keine externen CDN-Calls, 100% Hetzner DE |
| **SSH-Privilegien** | **Least Privilege** | `deployuser` führt weiterhin 0 DDL-Befehle aus |
| **Rollback-Garantie** | **< 100 ms** | Unverändert atomarer Symlink-Switch |
| **Audit-Beweiskraft** | **ISO/IEC 27037** | CycloneDX 1.5 SBOM + SHA-256 Siegel pro Release |

---

## 🛑 Zwingender Stopp-Punkt (Genehmigungsvorbehalt)

Gemäß `.agents/AGENTS.md` (Implementierungsplan-Governance):
Der Agent stoppt hier zwingend und führt **keine** Dateimodifikationen oder Git-Befehle aus, bis der Benutzer diesen Plan schriftlich genehmigt hat.
