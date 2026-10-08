# 🏛️ Implementierungsplan: SPRINT 2 – Resilienz- & Audio-Schilder [0,1% Goldstandard]

> **Dokument-ID:** PLAN-2026-10-06-SPRINT-2-RESILIENCE-AUDIO  
> **Status:** Bereit zur Genehmigung (Genehmigungsvorbehalt gem. AGENTS.md)  
> **Fokus:** Schlüsselfertige Härtung von Zone 4 (Service Worker Build-Buster) und Zone 3 (AudioContext Singleton Pool).

---

## 1. Ausgangslage & Forensische Befunde

### Befund 1 (Zone 4: Service Worker Stale PWA Zombie Shells)
* **Problem:** In [`apps/groovelab/public/sw.js`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/public/sw.js) ist `CACHE_NAME = 'groovelab-static-v1791149712801'` fest verdrahtet.
* **Risiko:** Nach Deployments fordern installierte PWAs und Browser-Caches auf Schüler-Tablets gelöschte JS-Hashes an (`Loading chunk failed` / White Screen of Death).
* **0,1% Ziel:** Automatisches Injezieren des Build-Hashes (`sha256(dist/assets/*).slice(0, 10)`) direkt beim Vite-Build in `dist/sw.js` gepaart mit Nginx `max-age=0` No-Cache-Headern.

### Befund 2 (Zone 3: AudioContext Hardware-Limit Crashes)
* **Problem:** Forensischer Scan deckte **9+ Komponenten** auf, die ad-hoc `new AudioContext()` instanziieren ([`chatSoundAndHaptics.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/utils/chatSoundAndHaptics.ts), [`QRLandingPage.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/QRLandingPage.tsx), [`GroovePracticeCompanion.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/groovelab/GroovePracticeCompanion.tsx), [`AudioMemoRecorder.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/notes/AudioMemoRecorder.tsx), etc.).
* **Risiko:** Mobile Browser (insbes. iOS Safari) limitieren Tabs auf maximal **6 AudioContexts**. Bei schnellem Modal-Wechsel kollabiert das Audio-Subsystem (`DOMException: The number of hardware contexts provided has been exceeded`), und die App stummt lautlos ab.
* **0,1% Ziel:** Universeller `audioContextPool.ts` (Single-Context-Garantie, Node-Leasing, 15s Auto-Suspend zur Akku-Schonung, Instant Resume).

---

## 2. Geplante Arbeitspakete in Sprint 2

```mermaid
flowchart TD
    subgraph Zone4["Zone 4: Service Worker Dynamic Build-Buster"]
        VB["Vite Production Build (vite.config.ts)"] -->|Generiert dist/assets/*.js| GH["Berechne SHA-256 Content-Hash"]
        GH -->|closeBundle Hook| SW["Injiziere CACHE_NAME in dist/sw.js"]
        SW -->|skipWaiting + clients.claim| CS["PWA Cache Invalidation (< 1 Session)"]
        SW --> WG["Wächter: scripts/verify_sw_integrity.mjs"]
    end

    subgraph Zone3["Zone 3: Universal AudioContext Singleton Pool"]
        UI["UI-Komponenten (Chat, Metronom, QR, Recorder)"] -->|acquireAudioLease()| AP["audioContextPool.ts (Singleton)"]
        AP -->|Max 1 Instanz| AC["Native AudioContext (Hardware-Safe)"]
        AP -->|Client-Count = 0 nach 15s| SUS["Auto-Suspend (CPU/Akku-Schutz)"]
        UI -->|releaseAudioLease()| DC["node.disconnect() (Garbage Collection)"]
        AP --> AG["AST-Guard: Verbot unpooled new AudioContext"]
    end
```

### Arbeitspaket 2.1: Zone 4 (Service Worker Dynamic Build-Buster)
1. **Vite Post-Build Plugin in [`apps/groovelab/vite.config.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/vite.config.ts):**
   * Hook `closeBundle()` ermittelt die SHA-256 Prüfsumme der generierten JS/CSS-Bundles in `dist/assets/`.
   * Stanzt den Zeitstempel und Hash atomar in `dist/sw.js` ein:  
     `const CACHE_NAME = 'groovelab-static-v' + buildTimestamp + '-' + shortHash;`
   * Aktualisiert `ASSETS_TO_CACHE` in `dist/sw.js` mit den tatsächlichen Dateinamen der Einstiegs-Bundles.
2. **Template-Vorbereitung in [`apps/groovelab/public/sw.js`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/public/sw.js):**
   * Saubere Platzhalter-Marker (`__SW_CACHE_NAME__`, `__SW_BUILD_TIME__`) mit lokalem Fallback für Development (`npm run dev`).
3. **Automatischer Integrations-Wächter ([`scripts/verify_sw_integrity.mjs`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/scripts/verify_sw_integrity.mjs)):**
   * Prüft, dass der Service Worker Cache-Busting-Mechanismus intakt ist und keine veralteten Hardcodings existieren.

### Arbeitspaket 2.2: Zone 3 (AudioContext Singleton Pool & Resource Leaser)
1. **Zentraler AudioContext-Pool ([`apps/groovelab/src/services/audio/audioContextPool.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/services/audio/)):**
   * `getSharedAudioContext()`: Lazy-instanziiert genau eine Instanz (Singleton-Garantie).
   * `acquireAudioLease(clientName: string)`: Registriert aktive Nutzung und weckt den Kontext per `resume()`.
   * `releaseAudioLease(clientName: string)`: Gibt den Lease frei; startet einen 15-Sekunden-Timer für `suspend()`.
   * `playImmediateSound(buffer: AudioBuffer | SynthFn)`: Spielt Soundeffekte (z.B. WhatsApp-Plopp) über den geteilten Kontext ab, ohne eine neue Instanz zu erzeugen.
   * `safeDecodeAudioData(arrayBuffer: ArrayBuffer)`: Universelle Audio-Dekodierung ohne Ad-hoc-Context.
2. **Migration der Ad-Hoc Instanziierungen:**
   * Umstellung von [`chatSoundAndHaptics.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/utils/chatSoundAndHaptics.ts), [`audioTranscoder.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/utils/audioTranscoder.ts) und [`audioLatencyService.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/services/audioLatencyService.ts) auf den `audioContextPool`.
3. **Forensische Testsuite ([`test_audiocontext_pool_forensic.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/tests/)):**
   * Simuliert 20 gleichzeitige Client-Anforderungen (z.B. schnelles Öffnen von Übe-Tabs) und beweist, dass exakt 1 Context existiert und alle Leases deterministisch freigegeben werden.

---

## 3. Verifikations-Matrix für Sprint 2

| Schritt | Ziel | Test-Befehl | Kriterium |
|---|---|---|---|
| **2.1** | Service Worker Integrity | `node scripts/verify_sw_integrity.mjs` | 100% PASS (Dynamic Hash & No-Cache Header) |
| **2.2** | AudioContext Pool Drill | `tsx apps/groovelab/src/tests/test_audiocontext_pool_forensic.ts` | 100% PASS (Singleton-Garantie, 0 Leaks) |
| **2.3** | Exocortex Integrity | `node scripts/product_bible_guard.mjs --check` | 100% PASS (< 25ms, Floor >= 500 KB) |
| **2.4** | Monolith Ceiling | `node scripts/monolith_growth_guard.mjs` | Netto-Null-Wachstum auf allen Monolithen |

---

## 🛑 Stopp-Punkt & Genehmigungsvorbehalt

Gemäß der **Implementierungsplan-Governance** (`.agents/AGENTS.md`) hält der KI-Agent an dieser Stelle an. Es wurden noch keine Code-Dateien modifiziert.

**Bitte bestätige die Freigabe zur Umsetzung von SPRINT 2 (Zone 4 Service Worker & Zone 3 AudioContext Pool) durch kurze Bestätigung (z. B. „Sprint 2 starten“ oder „Genehmigt“).**
