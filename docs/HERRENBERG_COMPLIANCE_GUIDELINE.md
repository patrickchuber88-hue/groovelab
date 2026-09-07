# ⚖️ Herrenberg-Compliance: Rechtsgutachten & Dienstanweisung für Musikschulleitungen
**Geltungsbereich:** Öffentliche & kommunale Musikschulen (VdM), private Musikschulträger, Schulleitungen und Verwaltungssekretariate  
**Rechtsbezug:** Grundsatzurteil des Bundessozialgerichts vom 28.06.2022 (Az. B 12 R 3/20 R – „Herrenberg“), § 7 Abs. 1 SGB IV, § 266a StGB  
**Zweck:** Vermeidung von Scheinselbstständigkeit und persönlicher Haftung bei der Einbindung freier Honorarlehrkräfte in die Software **Campus-Groovelab**  
**Stand:** September 2026  

---

## 1. Das existenzielle Risiko: Was das Herrenberg-Urteil für Schulleiter bedeutet

Mit dem Urteil vom 28. Juni 2022 (B 12 R 3/20 R) hat das Bundessozialgericht (BSG) die bis dahin gängige Praxis an deutschen Musikschulen gekippt, Lehrkräfte pauschal als freie Honorarmitarbeiter einzustufen.

### Die Kernkriterien der Rechtsprechung:
1. **Eingliederung in den Schulbetrieb:** Nutzt die Lehrkraft die Räume der Musikschule, deren Infrastruktur und unterrichtet sie Schüler, die einen Vertrag mit der Schule (und nicht mit der Lehrkraft) haben, spricht eine starke tatsächliche Vermutung für eine **abhängige Beschäftigung**.
2. **Weisungsgebundenheit:** Gibt die Schulleitung Unterrichtszeiten vor, teilt Räume hoheitlich zu oder verpflichtet die Lehrkraft zu Vertretungsstunden, Besprechungen oder Berichtspflichten, liegt zwingend ein sozialversicherungspflichtiges Arbeitsverhältnis vor.

### 🚨 Die persönliche Haftungsfalle für Schulleiter & Bürgermeister:
* **Nachzahlungsrisiko:** Die Deutsche Rentenversicherung (DRV) fordert im Rahmen von Betriebsprüfungen Gesamtsozialversicherungsbeiträge (Arbeitgeber- und Arbeitnehmeranteile) für bis zu vier Jahre rückwirkend ein. Für eine Musikschule summiert sich dies schnell auf **200.000 € bis 800.000 €**.
* **Strafrechtliches Risiko (§ 266a StGB):** Schulleitern, Amtsleitern und Bürgermeistern droht bei vorsätzlicher oder bedingt vorsätzlicher Nichtabführung von Beiträgen ein Ermittlungsverfahren wegen **Vorenthaltens und Veruntreuens von Arbeitsentgelt (§ 266a StGB)** mit Geldstrafen oder Freiheitsstrafen bis zu fünf Jahren!

---

## 2. Wie Campus-Groovelab die Herrenberg-Kriterien architektonisch schützt

Die Softwarearchitektur von **Campus-Groovelab** wurde gezielt darauf ausgelegt, die Unabhängigkeit selbstständiger Honorarlehrkräfte technisch zu stützen und Weisungstatbestände zu neutralisieren:

| Kriterium des BSG | Herkömmliche Schulsoftware (Gefahr) | Schutzarchitektur in Campus-Groovelab |
| :--- | :--- | :--- |
| **Raum- & Zeitzuteilung** | Schulleitung teilt Räume und Termine verbindlich von oben zu (hoheitliche Zuweisung). | **Reines Anfragemodell:** Honorarkräfte stellen Raumanfragen (`pending`), die sie selbst wählen. Die Plattform macht unverbindliche Dispositionsvorschläge, übt aber keine Weisung aus. |
| **Unterrichtszeit-Diktat** | Feste Dienstpläne, Zeiterfassung und Anwesenheitskontrollen. | **Keine Zeiterfassung:** Honorarkräfte disponieren ihre Termine direkt und autonom mit Schülern/Eltern. Die App erfasst keine Arbeitszeiten. |
| **Vertretungszwang** | Automatische Verpflichtung zur Übernahme von Vertretungen bei Kollegen. | **Freiwilligkeitsprinzip:** Vertretungsangebote und optionale Projektmitwirkungen sind rein freiwillig ohne Sanktionsmechanismus. |
| **Pädagogische Weisung** | Pflicht zur Nutzung standardisierter Lehrpläne und Eingabe von Noten. | **Didaktische Autonomie:** Das Hausaufgabenheft und die Loopstation sind rein pädagogische Werkzeuge der Lehrkraft; die Schulleitung hat keinen Durchgriff. |

---

## 3. Verbindliche Dienstanweisung für Schulleitungen & Schulsekretariate

Um das Restrisiko einer sozialversicherungsrechtlichen Nachforderung bei Betriebsprüfungen der DRV auszuschließen, erlässt der Schulträger folgende **verbindliche Dienstanweisung**:

### 🛑 1. Verbot hoheitlicher Termin- und Raumzuweisungen
* Schulleitung und Sekretariat dürfen Honorarlehrkräften über Campus-Groovelab **niemals einseitig Unterrichtstage, Uhrzeiten oder Räume vorschreiben**.
* Der Workflow muss immer von der Honorarkraft ausgehen: Die Lehrkraft wählt im Stundenplaner einen verfügbaren Zeit- und Raumslot; das Sekretariat bestätigt lediglich die raumtechnische Verfügbarkeit.

### 🛑 2. Verbot von Anwesenheits- und Verhaltenskontrollen
* Es ist strikt untersagt, die Login-Aktivität, Chat-Antwortzeiten oder die Häufigkeit von Hausaufgabeneinträgen einer Honorarkraft zu überwachen oder als Kriterium für Honorarzahlungen heranzuziehen.
* Honorare werden ausschließlich auf Basis der vertraglich vereinbarten und tatsächlich durchgeführten Unterrichtseinheiten gem. Honorarabrechnung vergütet.

### 🛑 3. Autonome Terminabstimmung mit Schülern
* Fällt eine Unterrichtsstunde aus oder muss sie verlegt werden, vereinbart die Honorarkraft den Ersatztermin direkt mit den Schülern bzw. den Erziehungsberechtigten. Die Schulleitung greift nicht disziplinarisch ein.

### 🛑 4. Keine Teilnahmepflicht an Ensemble- oder Konferenzfunktionen
* Die Mitwirkung an schulischen Großveranstaltungen oder Konzertprojekten (künftiger *Event Coordinator* auf der Plattform-Roadmap) ist für Honorarkräfte stets rein freiwillig. Eine Pflicht zur Teilnahme an Gesamtlehrerkonferenzen oder schulischen Großveranstaltungen darf über die App nicht fingiert werden.

---

## 4. Textbaustein für Honorarverträge (Sicherheits-Klausel)

Schulträgern wird dringend empfohlen, in alle freien Dienstverträge mit Honorarlehrkräften folgende Schutzklausel aufzunehmen:

> **§ X Bereitstellung digitaler Organisationswerkzeuge (Campus-Groovelab)**  
> (1) Die Musikschule stellt der Lehrkraft für die Dauer des Vertrages einen Zugang zu der cloudbasierten Plattform **Campus-Groovelab** zur Verfügung. Die Nutzung der Plattform dient der unverbindlichen organisatorischen Erleichterung der Raumbelegung, der Terminkoordination mit den Schülern sowie der didaktischen Unterrichtsbegleitung.  
> (2) Die Nutzung der Plattform begründet kein Direktionsrecht oder Weisungsbefugnis der Musikschule hinsichtlich Zeit, Ort, Dauer oder pädagogischer Ausgestaltung des Unterrichts. Die Lehrkraft ist in der Einteilung ihrer Unterrichtszeiten und der didaktischen Unterrichtsgestaltung frei und stimmt Unterrichtstermine eigenverantwortlich mit den Schülern und Erziehungsberechtigten ab.  
> (3) Es besteht keine Pflicht zur ständigen Erreichbarkeit oder zur Nutzung bestimmter didaktischer Softwaremodule.
