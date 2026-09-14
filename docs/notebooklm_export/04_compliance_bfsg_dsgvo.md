# Campus-Groovelab – Rechtliche Compliance, DSGVO & Barrierefreiheit (BFSG 2025)

## 1. Barrierefreiheit nach BFSG 2025 & WCAG 2.2 Stufe AA
Mit dem Inkrafttreten des Barrierefreiheitsstärkungsgesetzes (BFSG) und der BITV 2.0 erfüllt **Campus-Groovelab** strikte Barrierefreiheitsanforderungen:

### Tastatur-Vollbedienbarkeit (WCAG 2.1.1 & 2.4.7)
* Alle interaktiven Komponenten, Buttons, Menüs, Modals und Karten sind vollständig ohne Maus bedienbar.
* Semantische Elemente oder ARIA-Verträge (`role="button"`, `tabIndex={0}`, `onKeyDown` für Enter/Leertaste).
* Sichtbarer, kontraststarker Fokusring (`boxShadow: '0 0 0 2px #3b82f6'`).

### Kontrast-Parität (WCAG 1.4.3)
* Mindestkontrast von **4,5 : 1** für Normaltext und **3 : 1** für Bedienelemente.
* **Unantastbarkeit von Markenfarben**: Das prägnante GrooveLab-Gelb (`#facc15` / `#eab308`) bleibt im Hintergrund stets 100 % erhalten. Der Kontrast wird durch dunklen Text (Slate-900 `#0f172a`, Kontrastverhältnis > 12:1) garantiert.

### WAI-ARIA Dialog- & Tab-Architektur
* Modals mit `role="dialog"`, `aria-modal="true"` und Escape-Taste.
* Tab-Navigationen mit vollständiger ARIA-Trias (`role="tablist"`, `role="tab"`, `role="tabpanel"`).
* **Juristischer Status**: Erklärung zur digitalen Barrierefreiheit deklariert den Status verbindlich als **„teilweise vereinbar“** gemäß § 12a Abs. 6 BGG / § 16 BFSG (mit deklarierten Ausnahmen für auditive Live-Inhalte und nutzergenerierte Uploads).

---

## 2. DSGVO, DIN 66398 & Schulträger-Compliance
* **Serverstandort**: Deutschland / EU.
* **Datensparsamkeit & Pseudonymisierung**:
  * Schüler-Onboarding kann über Dual-Token-Verfahren ohne Klarnamen-Offenlegung erfolgen.
  * Private Kontaktdaten (private Handynummern von Lehrkräften und Schülern) werden im didaktischen Messenger nicht offengelegt.
* **DIN 66398 Löschkonzept**:
  * Definierte Löschfristen für Chatverläufe, hochgeladene Audio-Hausaufgaben und inaktive Schülerakten.
  * Audit-Logs werden unveränderlich in `public.audit_logs` archiviert.
* **Auftragsverarbeitungsvertrag (AVV / Art. 28 DSGVO)**:
  * Vollständig vorbereitet für Träger, Kommunen und private Musikschulen inklusive technisch-organisatorischer Maßnahmen (TOMs).

---

## 3. Herrenberg-Compliance für Musikschulen
* Nach dem wegweisenden „Herrenberg-Urteil“ des Bundessozialgerichts (BSG) zur Abgrenzung zwischen Scheinselbstständigkeit und echter Honorartätigkeit bietet Campus-Groovelab spezialisierte Funktionen:
  * Getrennte Berechtigungen und Workflows für angestellte Lehrkräfte vs. freie Honorardozenten.
  * Frei wählbare Unterrichtszeiten, freie Raumwahl und dokumentierte Vertretungsregeln.
  * Revisionssichere Nachweise für Prüfungen der Deutschen Rentenversicherung (DRV).
