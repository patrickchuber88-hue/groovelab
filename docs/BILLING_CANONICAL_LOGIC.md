# 💶 Campus-Groovelab: Kanonischer Pricing-, Billing- & Rechtsleitfaden
> **Klassifizierung:** Autoritatives Finanz-, Rechts- & Rechnungs-Regelwerk (Single Source of Truth)  
> **Status:** Verbindlich für alle UI-Views, Rechnungs-PDFs, Onboarding-Wizards und Abrechnungs-RPCs  
> **Plattformbezeichnung:** Ausnahmslos **Campus-Groovelab** (mit Doppel-'o')  
> **Letzte Aktualisierung:** 2026-09-17

---

## 1. Das fundamentale Kernprinzip: Keine Software-Lizenzgebühren

> **§ 1 SaaS-Axiom:**  
> Die Kernsoftware für **Campus-Groovelab** wird Musikschulen und Nutzern **vollständig ohne Software-Lizenzgebühren** bereitgestellt (`0,00 € (Inklusive)`).  
> Es fallen ausschließlich Gebühren für das gemietete Cloud-/Server-Hosting, aktive Team-Profile sowie bewusste Schüleraktivierungen an. Wir vermieten und betreiben ausschließlich die hierfür notwendige Hochsicherheits-Infrastruktur.

---

## 2. Modul-Grundpreise & Kombi-Vorteil Bundle

Für das Basishosting der Musikschule (feste Server-Hosting-Pauschale pro Musikschule/Mandant):

| Tarif / Komponente | Monatspreis (Netto) | Leistungsumfang & Bounded Context |
|---|---|---|
| **Campus Modul** | **14,90 € / Mo.** | Didaktik, Messenger, Hausaufgaben, Schwarzes Brett, Stundenplan & Raumverwaltung |
| **GrooveLab Modul** | **9,90 € / Mo.** | WebAudio Synthesizer, Loopstation, Practice Companion, Band-Matching & DAW-Engine |
| **Kombi-Vorteil Bundle** | **19,90 € / Mo.** | Beide Module vollständig gebucht (**4,90 € / Mo. Ersparnis** gegenüber 24,80 € Einzelsumme) |
| **Service Fee (Team)** | **0,49 € / Mo.** | Pro aktivem Administrator-, Schulleiter- oder Lehrer-Profil |

---

## 3. Schüler-Aktivierungen & Gebührenlogik

### Grundsätze der Schülerabrechnung:
1. **Passive/Unregistrierte Profile sind 100% kostenlos:** Schüler-Datensätze, die in der Schülerverwaltung angelegt sind, aber keinen aktiven Zugang freigeschaltet haben, kosten **0,00 €**.
2. **Aktivierungsgebühr:** Jede bewusste Modul-Aktivierung durch einen Schüler löst eine Bereitstellungsgebühr von **0,49 € / Mo.** aus.
   - Nutzt ein Schüler sowohl Campus als auch GrooveLab aktiv, fallen 2 × 0,49 € / Mo. an.
3. **GrooveLab Sammelzahler-Garantie:**  
   > ⚠️ **Unantastbare Invariante:**  
   > GrooveLab-Aktivierungen werden **ausnahmslos und zu 100% von der Musikschule übernommen (Sammelzahler)**.  
   > Es gibt für das GrooveLab-Modul **niemals** eine Direktabrechnung mit Eltern oder Schülern!

---

## 4. Die zwei Abrechnungsmodelle im Detail

### Modell A: Musikschule übernimmt alle Kosten (Sammelzahler)
*Für Eltern und Schüler ist die Nutzung zu 100% kostenfrei.*

1. **Variable monatliche Abrechnung:**
   - Basispauschale (z. B. Kombi 19,90 € / Mo.)
   - + Team-Profile (0,49 € / Lehrer / Mo.)
   - + Aktive Schüleraktivierungen (0,49 € / aktiver Schüler / Mo.)
   - **Kostenairbag:** War ein Schüler länger als **2 Monate nicht eingeloggt**, wird das Profil automatisch inaktiviert, sodass Kosten nur bei tatsächlicher Nutzung anfallen.
2. **Jahresbeitrag bei Aktivierung (10% Rabatt):**
   - Aktive Schüler werden als Jahresbeitrag in einer gesonderten Jahresrechnung mit **10% Rabatt** abgerechnet.
3. **Einmalige Komplett-Aktivierung zum Schuljahresstart (September) (20% Rabatt):**
   - Die Musikschule aktiviert zum Schuljahresbeginn im September alle Schüler für das gesamte Schuljahr mit **20% Rabatt** auf den Schülerbeitrag.

---

### Modell B: Direktabrechnung mit Eltern/Schülern (Zahlungsüberwachung)
*Gilt AUSSCHLIESSLICH für das Campus-Modul. GrooveLab bleibt immer bei der Schule.*

> ⚖️ **Juristisches & Ökonomisches Gebot:**  
> Schüler-Direktabrechnungen dürfen **IMMER NUR als Jahresbeitragszahlung (einmalige Schuljahresgebühr)** gebucht und eingezogen werden – **NIEMALS monatlich**!  
> *Begründung:* Ein monatlicher Einzug von 0,49 € würde unverhältnismäßig hohe Banktransaktions-, Stripe- und Buchungsgebühren erzeugen.

1. **Vollständige Direktabrechnung:**
   - Einmaliger Jahresbeitrag von **maximal 5,39 € / Schuljahr** (DE/AT in EUR: 1 Monat kostenlos/Schnupperphase + bis zu 11 Monate × 0,49 €) bzw. **maximal CHF 11.00 / Schuljahr** (CH: 1 Monat kostenlos + bis zu 11 Monate × CHF 1.00).
   - Die Schule wird für alle aktivierten Campus-Schüler vollständig entlastet (**Schule zahlt 0,00 € / CHF 0.00**).
2. **Teilweise Direktabrechnung (Schule bezuschusst):**
   - Einmaliger Jahresbeitrag von **maximal 4,40 € / Schuljahr** (DE/AT: 1 Monat kostenlos + bis zu 11 Monate × 0,40 €) bzw. **maximal CHF 8.80 / Schuljahr** (CH: 1 Monat kostenlos + bis zu 11 Monate × CHF 0.80).
   - Die Schule deckt den verbleibenden Beitrag (0,09 € / CHF 0.20 / Mo.).
3. **Härtefall- & Geschwisterausnahmen:**
   - Einzelne Schüler können in der Schülerverwaltung jederzeit manuell als Härtefall oder Geschwisterkind markiert werden. In diesem Fall verbleiben die Kosten bei der Musikschule, und von den Eltern wird kein Beitrag erhoben.

---

## 5. Verbindliche kanonische Abrechnungsreihenfolge (Master-Wording)

Für alle Gebührenaufstellungen, Vorschau-Modals, PDF-Rechnungen und Onboarding-Dialoge auf der gesamten Plattform gilt verbindlich exakt folgende Reihenfolge:

```
1. Campus-Groovelab Software-Bereitstellung:  0,00 € (Inklusive)
2. Cloud- & Datenbank-Hosting (Basispauschale):
   - Campus Modul:                            14,90 € / Mo.
   - GrooveLab Modul:                          9,90 € / Mo.
   - Kombi-Vorteil Bundle:                    19,90 € / Mo.
3. Pädagogen- & Verwaltungslizenzen:          0,49 € / aktives Team-Profil / Mo.
4. Schüler-Aktivierungen:
   - Campus Schüleraktivierung:               0,49 € / Mo. (oder Jahresbeitrag via Eltern)
   - GrooveLab Schüleraktivierung:            0,49 € / Mo. (100% Sammelzahler durch Schule)
```

---

## 6. Währungs- & Ländermatrix

| Land / Region | Währung | Schülerbeitrag monatlich | Max. Jahresbeitrag Direktabrechnung |
|---|---|---|---|
| **Deutschland (DE)** | **EUR (€)** | 0,49 € / Mo. | **5,39 € / Schuljahr** (11 × 0,49 €) |
| **Österreich (AT)** | **EUR (€)** | 0,49 € / Mo. | **5,39 € / Schuljahr** (11 × 0,49 €) |
| **Schweiz (CH)** | **CHF** | CHF 1.00 / Mo. | **CHF 11.00 / Schuljahr** (11 × CHF 1.00) |

---

## 7. Audit- & Compliance-Klausel (DSGVO & FinTech)

- Alle Rechnungsgenerierungen, Zahlungsstatus-Änderungen und Tarifwechsel müssen unveränderlich in `public.audit_logs` mit Zeitstempel und Schul-ID protokolliert werden.
- Bei Schüler-Direktabrechnung werden Zahlungsdaten niemals auf eigenen Servern gespeichert, sondern ausschließlich über zertifizierte PCI-DSS Level 1 Zahlungsdienstleister abgewickelt.
