# 📋 Gefährdungsbeurteilung psychischer Belastungen für digitale Medien
**Gemäß §§ 5, 6 Arbeitsschutzgesetz (ArbSchG) i. V. m. DGUV Information 211-042**  
**Gegenstand:** Einführung und Nutzung der Cloud-Plattform *Campus-Groovelab* an Musikschulen  
**Geltungsbereich:** Hauptamtliche, nebenamtliche und freie Musikschullehrkräfte sowie Schulleitung & Verwaltung  
**Rechtsgrundlagen:** § 5 Abs. 3 Nr. 6 ArbSchG, § 6 ArbSchG, § 3, § 5 ArbZG, DGUV Vorschrift 1, DIN EN ISO 10075  

---

## 1. Gesetzlicher Hintergrund & Zielsetzung

Gemäß **§ 5 Abs. 3 Nr. 6 ArbSchG** ist der Arbeitgeber verpflichtet, eine Gefährdungsbeurteilung der mit der Arbeit verbundenen psychischen Belastungen durchzuführen. Bei der Einführung digitaler Kommunikations- und Bildungsplattformen treten typischerweise folgende arbeitspsychologische Risikofaktoren auf:
1. **Entgrenzung von Arbeits- und Freizeit** (ständige Erreichbarkeit, „Always-On-Kultur“).
2. **Unterbrechungen und Informationsüberflutung** im laufenden Unterrichtsbetrieb.
3. **Leistungs- und Verhaltenskontrolldruck** durch Transparenz von Reaktionszeiten und Login-Mustern.
4. **Digitale Reizüberflutung** und visuelle Ermüdung durch übermäßige Bildschirmarbeitszeiten.

Die Plattform **Campus-Groovelab** wurde unter der Doktrin **„Health by Architecture“** entwickelt. Nachfolgend werden die ermittelten Gefährdungsfaktoren den integrierten software-architektonischen Schutzmaßnahmen gegenübergestellt.

---

## 2. Strukturierte Gefährdungsanalyse & Schutzmaßnahmen

### Belastungsfaktor 1: Digitaler Erreichbarkeitsdruck & Entgrenzung (§ 5 ArbZG)
* **Gefährdungspotenzial:** Lehrkräfte erhalten abends oder am Wochenende Nachrichten von Schülern oder Eltern und verspüren psychologischen Antwortdruck.
* **Architektonische Schutzmaßnahme von Campus-Groovelab:**
  * **Automatisierte Quiet Hours:** Tägliche Ruhezeiten (standardmäßig 19:00 bis 07:30 Uhr sowie ganztägig an Samstagen und Sonntagen) unterdrücken serverseitig alle Push- und akustischen Benachrichtigungen.
  * **Ambient Status Pill im Chat:** Schülern und Eltern wird transparent angezeigt, dass die Lehrkraft Feierabend hat und Nachrichten erst am nächsten Unterrichtstag zugestellt werden.
  * **Band-Shoutbox Curfew:** In Schüler-Ensemble-Shoutboxen ist das Verfassen neuer Nachrichten am Wochenende und nachts (20:00–07:00 Uhr) für Schüler technisch pausiert.
* **Risikoeinstufung nach Maßnahme:** 🟢 **Sehr gering / Wirksam eliminiert**

---

### Belastungsfaktor 2: Leistungsüberwachung & Kontrolldruck (§ 87 Abs. 1 Nr. 6 BetrVG)
* **Gefährdungspotenzial:** Angst vor Überwachung von Reaktionszeiten, Login-Häufigkeiten, Arbeitszeiten oder didaktischen Methoden durch Schulleitung oder Träger.
* **Architektonische Schutzmaßnahme von Campus-Groovelab:**
  * **Zero-Tracking Doktrin:** Es existieren im Administrations- und Schulleitungsbereich keinerlei Übersichten über Login-Zeiten, Klickraten, Verweildauern oder Chat-Antwortzeiten einzelner Lehrkräfte.
  * **AST-Guard `LEG-21c`:** Verhindert im Quellcode die Anlage jeglicher Performance- oder Ranking-Metriken (`teacherRanking`, `teacherActivityScore`).
  * **Pädagogische Row-Level-Security (RLS):** Private Notizen und individuelle Schülerrückmeldungen unterliegen dem Vertraulichkeitsschutz und sind für die Schulleitung unzugänglich.
* **Risikoeinstufung nach Maßnahme:** 🟢 **Sehr gering / Technisch ausgeschlossen**

---

### Belastungsfaktor 3: Unterbrechungen & Hektik im Unterricht
* **Gefährdungspotenzial:** Störende Popups, Benachrichtigungstöne oder unübersichtliche Menüs lenken die Lehrkraft während des Instrumental- und Vokalunterrichts ab.
* **Architektonische Schutzmaßnahme von Campus-Groovelab:**
  * **Notenständer- & Fokus-Modus:** Vollbildansicht ohne störende Randelemente, Benachrichtigungen oder visuelle Popups während aktiver Unterrichts- und Übephasen.
  * **1-Tap Workflow:** Häufige Aktionen (z. B. Hausaufgaben-Häkchen, Ausfall-Meldung, Übe-Quittierung) erfolgen mit maximal 1 bis 2 Klicks.
  * **Zero-Latency Audio Engine:** Lokale WebAudio-Signalverarbeitung garantiert unterbrechungsfreien Unterricht auch bei schwankendem WLAN im Proberaum.
* **Risikoeinstufung nach Maßnahme:** 🟢 **Sehr gering / Didaktisch optimiert**

---

### Belastungsfaktor 4: Visuelle Belastung & Bildschirmermüdung
* **Gefährdungspotenzial:** Erhöhte Bildschirmzeit durch ständiges Ablesen von Noten oder Anweisungen vom Smartphone/Tablet.
* **Architektonische Schutzmaßnahme von Campus-Groovelab:**
  * **Screenless Practice Doktrin:** Didaktischer Fokus auf das akustische Musizieren am echten Instrument.
  * **Kaufmännische 1-Klick-Quittierung:** Das Üben findet am physischen Instrument statt; das Endgerät dient lediglich der kurzen Protokollierung.
  * **BFSG 2025 / WCAG 2.2 AA Kontrastoptimierung:** Blendfreie Farbschemata (Slate-900 / High-Contrast) schonen das Sehvermögen.
* **Risikoeinstufung nach Maßnahme:** 🟢 **Sehr gering / Ergonomisch zertifiziert**

---

### Belastungsfaktor 5: Überlange Arbeitszeiten & Überlastung (§ 3 ArbZG)
* **Gefährdungspotenzial:** Fehlende Übersicht über kumulierte Unterrichtszeiten an langen Unterrichtstagen.
* **Architektonische Schutzmaßnahme von Campus-Groovelab:**
  * **Höchstarbeitszeit-Transparenz:** Der Stundenplan-Designer weist bei Tagesplanungen über 8 Stunden dezent auf gesetzliche Ruhe- und Ausgleichszeiten hin.
  * **Dispositionsautonomie (Herrenberg-Schutz):** Lehrkräfte planen Einheiten im direkten Einvernehmen mit den Schülern; keine fremdbestimmte Taktung.
* **Risikoeinstufung nach Maßnahme:** 🟢 **Sehr gering / Präventiv abgefedert**

---

## 3. Zusammenfassendes Prüfergebnis & Wirksamkeitskontrolle

| Prüfkriterium | Gesetzliche Norm | Umsetzungsstatus in Campus-Groovelab |
| :--- | :--- | :--- |
| **Ruhezeiten & Feierabendschutz** | § 5 ArbZG / § 5 ArbSchG | 100 % automatisiert (Quiet Hours, 0 Push-Druck) |
| **Ausschluss von Leistungsüberwachung** | § 87 Abs. 1 Nr. 6 BetrVG | 100 % architektonisch gesperrt (0 Tracking-Dashboards) |
| **Schutz vor Entgrenzung (Wochenende)** | § 5 ArbZG / BAG 5 AZR 349/22 | 100 % asynchron (Ambient Pill & Shoutbox-Curfew) |
| **Unterrichtsunterbrechungen** | DGUV Information 211-042 | Minimiert durch Notenständer-Modus & 1-Tap UI |
| **Freiwilligkeit digitaler Zusatzmodule** | § 611a BGB / § 7 SGB IV | 100 % autonome Nutzung ohne Zwang |

**Gesamtbeurteilung der Fachkraft für Arbeitssicherheit / Schulleitung:**  
Die Nutzung von *Campus-Groovelab* führt zu **keiner unzulässigen Erhöhung der psychischen Belastung** der Beschäftigten. Im Gegenteil reduzieren die automatisierten Quiet Hours, der Wegfall von Zettelwirtschaft und die konsequente Asynchronität den organisatorischen Stress im Musikschulalltag signifikant.

---

**Freigabevermerk & Dokumentation gem. § 6 ArbSchG:**  
Ort, Datum: ____________________________________  
Für die Schulleitung / den Schulträger: ____________________________________  
Für den Personalrat / Betriebsrat: ____________________________________  
Fachkraft für Arbeitssicherheit (Sifa): ____________________________________  
