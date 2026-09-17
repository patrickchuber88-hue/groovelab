# ADR-006: Monolith-Entflechtung & Bounded-Context-Orchestrierung

- **Status:** Akzeptiert (Enterprise+ Architektur-Standard)
- **Datum:** 2026-09-17
- **Domäne:** Frontend Architecture & Maintainability

---

## Kontext & Problemstellung
Historisch wuchs `apps/groovelab/src/App.tsx` zu einem Monolithen von **16.128 Zeilen** (> 820 KB) heran. 
Diese Konzentration führte zu signifikanten Risiken und Hemmnissen:
1. **Kognitiver Overload:** Unüberschaubare Mischung aus Audio-Engines, Abrechnung, Chat, Stundenplan, Navigation und Modal-Dialogen in einer einzigen Datei.
2. **IDE-Latenz:** Language Server und TypeScript-Linter benötigten bis zu 10 Sekunden für Autocompletion und Typüberprüfungen.
3. **Rules-of-Hooks-Risiken:** Bedingte Returns vor nachgelagerten Hooks stellten ein latentes Stabilitätsrisiko dar.
4. **Regressionsgefahr:** Jede Modifikation an einem Modal oder Overlay barg das Risiko unerwünschter Quereffekte auf das globale Layout.

---

## Entscheidung
1. **Chirurgische Entflechtung in 43 deterministische Schritte:** Schrittweise Auslagerung aller Teilsysteme ohne Feature-Regressions oder Layout-Drift.
2. **Kompression von `App.tsx` auf 51 Zeilen:** `App.tsx` fungiert ausschließlich als ultra-schlanke Root-Bühne, die den Master-Orchestrator und die drei Layout-Hauptschichten bindet:
   - `CampusSystemBannersOverlay.tsx`: Broadcasts, Maintenance-Lockouts, Ghost-Indikatoren, Offline-Badges.
   - `CampusAppLayout.tsx`: Visuelle Shell, Desktop-Sidebar, Mobile-Header, Content-Router (`CampusMainContentRouter`), PWA-Bottom-Bar.
   - `CampusAppModalsHub.tsx`: Konsolidierter Dialog-Orchestrator für alle Modal-Zustände.
3. **Master-State-Orchestrierung (`useCampusAppOrchestrator.ts`):** 
   - Deterministische Koordination aller 18 Sub-Hooks.
   - Heilung der React Hook Rules: Vollständig bedingungslose, lineare Hook-Ausführung vor der Gate-Auswertung.
4. **Auslagerung globaler Browser-Dienste:** 
   - `cameraKillSwitch.ts`: Globales Kamera-Lifecycle-Management.
   - `appleAlert.ts`: Barrierefreies, gebrandetes `window.alert`-Modal.
   - `kioskBootstrap.ts`: Sicheres URL-Parameter-Bootstrapping und Zero-Trust-History-Scrubbing.

---

## Konsequenzen & Invarianten für den Code
- **Strikte Dateigrößen-Grenze:** `App.tsx` bleibt dauerhaft unter 100 Zeilen. Neue globale Features werden in Sub-Hooks oder Layout-Komponenten integriert.
- **Desktop Layout Immunity:** Sämtliche Grids und Desktop-Header (`>= 769px`) bleiben unberührt.
- **Verifikations-Guard:** Vollständige Typsicherheit (0 TypeScript-Fehler über alle 4 TSConfigs) und Einhaltung aller 20 forensischen Invarianten (`npm run gate`).
