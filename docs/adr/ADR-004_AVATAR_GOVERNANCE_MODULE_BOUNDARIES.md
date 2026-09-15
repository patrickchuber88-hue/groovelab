# ADR-004: Musiker-Avatar-Beschränkung auf GrooveLab & Chalkboard-Hero für Schulleitung

- **Status:** Akzeptiert (Corporate Identity & Domain Separation)
- **Datum:** 2026-08 / Re-zertifiziert 2026-09
- **Domäne:** Platform / UI Identity & Avatar Governance

---

## Kontext & Problemstellung
In einer Musikschul-Plattform gibt es zwei Welten:
1. Das kreative Musizieren im Überaum (Schüler und Lehrkräfte, Bandmitglieder, Instrumente, Beatmaking).
2. Die professionelle, behördliche und institutionelle Verwaltung (Schulleiter, Sekretariat, Trägervertreter, Verträge, Honorare).

Wenn ein Schulleiter oder Sekretär in offiziellen Abrechnungs-Dashboards oder behördlichen Dokumenten mit einem Cartoon-Geist oder Musiker-Avatar angezeigt wird, wirkt das unprofessionell und untergräbt das Vertrauen gegenüber Kommunen und Schulträgern.
Umgekehrt soll die kreative Musiker-Identität (z. B. Geist-Avatar) das GrooveLab-Erlebnis für Schüler prägen.

---

## Entscheidung
1. **Musiker-Avatare sind modulspezifisch:** Musiker- und Instrumenten-Avatare (inklusive des Geist-Avatars) sind **ausschließlich für Lehrkräfte (`teacher`) und Schüler (`student`)** und **ausschließlich bei aktivem GrooveLab-Modul** zulässig.
2. **Strikte Immunität für Schulleitung & Sekretariat:** Benutzer der Rollen `admin` und `secretary` dürfen niemals Musiker- oder Instrumenten-Avatare erhalten.
3. **Plattformweites Kreidetafel-Hero-Bild:** Das Profilbild der Verwaltung/Schulleitung zeigt über alle Module hinweg ausnahmslos das offizielle Briefing-Board-Kreidetafel-Bild: `/campus_login_hero.png`.

---

## Konsequenzen & Invarianten für den Code
- Avatar-Auswahl-Modals dürfen für Rollen `admin` und `secretary` keine Instrumenten-/Geist-Avatare zur Auswahl anbieten.
- In Avatar-Renderern (`StudioAvatar.tsx`, Header-Profile) erzwingt ein Rollen-Check bei `admin`/`secretary` immer `/campus_login_hero.png`.
