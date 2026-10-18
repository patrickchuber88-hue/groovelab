# Implementation Plan: 0,1% Goldstandard – Avatar Gallery Performance & Ladezeit-Optimierung

## 1. Ausgangsbefund & Performance-Analyse

Die Avatar-Auswahlmaske ([ProfileBandModalsHub.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/modals/ProfileBandModalsHub.tsx#L780)) ist visuell hochwertig, weist jedoch signifikante Performance-Flaschenhälse auf:
1. **Hohe Netzwerklast:** In der Kategorie *„Alle“* werden 85 unkomprimierte PNG-Bilder geladen. Bei einer durchschnittlichen Dateigröße von ca. 270 KB bis 350 KB entspricht dies einer initialen Download-Last von **ca. 25 Megabyte**.
2. **Fehlende Next-Gen Bildkompression (WebP):** PNGs sind für fotorealistische 3D-Bilder ineffizient. Eine verlustfreie/hochwertige WebP-Kompression (Qualität 85%) reduziert die Dateigröße um **88 %** (von 266 KB auf 32 KB pro Bild).
3. **GPU- & Layout-Last:** Alle 85 DOM-Elemente werden ohne Virtualisierung oder `content-visibility: auto` im Render-Tree berechnet.
4. **Fehlende Bilddimensionen:** Dem `<img>`-Tag fehlen explizite HTML-Attribute (`width`, `height`), was zu unruhigem Layout-Shift (CLS) während des Ladens führen kann.

---

## 2. Zielsetzung nach dem 0,1% Enterprise Goldstandard

- **90 % Payload-Reduktion:** Reduktion des gesamten Bilder-Payloads von ~25 MB auf **~2,5 MB**.
- **Dual-Format Parität (Zero-Risk):** Bestehende PNG-Dateien bleiben als 100%ige Fallbacks vollständig erhalten; WebP-Dateien werden daneben bereitgestellt.
- **Modern Web Standard (`<picture>`):** WebP wird über `<picture><source type="image/webp" ... /><img ... /></picture>` serviert.
- **Butterweiches 120-Hz-Scrolling:** Durch `contentVisibility: 'auto'` und `containIntrinsicSize: '220px 220px'` werden Off-Screen-Kacheln von teuren Paint-Zyklen befreit.
- **Zero Layout Shift (CLS = 0):** Explizite Breiten- und Höhenattribute verhindern Nachrutschen beim Scrollen.

---

## 3. Geplante Schritte im Detail

### Schritt 1: Batch-Kompression der Avatar-Assets nach WebP
- Ausführen eines einmaligen verlustarmen Konvertierungsskripts (`scripts/optimize_avatars_to_webp.py` via PIL/Pillow):
  - Konvertiert alle 176 Avatar-PNGs in `apps/groovelab/public/avatars/` nach `.webp` (Qualität: 85 %, method: 6).
  - Die Original-`.png`-Dateien bleiben für bestehende Datenbank-Referenzen und ältere Browser unberührt erhalten.
  - Erwartete Speicherersparnis: von ~50 MB auf unter 6 MB.

### Schritt 2: Veredelung der Bilder-Pipeline in `ProfileBandModalsHub.tsx`
- In `apps/groovelab/src/components/modals/ProfileBandModalsHub.tsx` (Zeilen 994–1025):
  - Kachel-Styling erweitern um `contentVisibility: 'auto'`, `containIntrinsicSize: '220px 220px'` und dezenten Dark-Shimmer-Hintergrund `rgba(255,255,255,0.05)`.
  - Bild-Tag auf modernes `<picture>` mit WebP-First-Strategie umstellen:
    ```tsx
    <picture>
      <source srcSet={av.url.replace(/\.png$/i, '.webp')} type="image/webp" />
      <img
        src={av.url}
        loading="lazy"
        decoding="async"
        width={220}
        height={220}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        alt=""
      />
    </picture>
    ```

---

## 4. Betroffene Dateien & Bounded Contexts

| Datei / Pfad | Bounded Context | Art der Änderung |
| :--- | :--- | :--- |
| `apps/groovelab/public/avatars/*.webp` | Static Assets / Avatare | **NEU:** WebP-Dateien der bestehenden 3D-Avatare |
| `apps/groovelab/src/components/modals/ProfileBandModalsHub.tsx` | Profile & Band Modals | Veredelung mit `<picture>`, WebP-Support & `content-visibility: auto` |

---

## 5. Verifikation & Qualitätskriterien

- [ ] **Visuelle Parität:** Alle Avatare sehen im Modal gestochen scharf aus, ohne Artefakte oder Farbverschiebungen.
- [ ] **Netzwerk-Payload:** Der Download pro Avatar sinkt von ca. 270 KB auf ca. 30 KB.
- [ ] **Fallback-Sicherheit:** Falls ein WebP-Bild fehlen sollte, greift der Browser automatisch nahtlos auf die `.png`-Version zurück.
- [ ] **Desktop & Mobile Scrolling:** Konstante 60/120 fps beim Durchscrollen aller 85 Avatare.
- [ ] **Desktop Layout Immunity:** Keine visuellen Verschiebungen im Grid.
- [ ] **Strict Invariants:** Keine eigenständigen `npm run`-Befehle außerhalb des Codeworts „commit“.

---

## 6. Zwingender Stopp-Punkt (User Approval Required)

> [!IMPORTANT]
> **Genehmigungsvorbehalt gemäß Projekt-Governance:**  
> Vor der Durchführung der Code- und Asset-Änderungen ist die ausdrückliche Freigabe des Entwicklers erforderlich. Erst nach deiner schriftlichen Freigabe (z. B. „Freigabe erteilt“ oder „Plan ausführen“) werde ich mit der Umsetzung beginnen.
