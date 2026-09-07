# 📁 Verzeichnis von Verarbeitungstätigkeiten (VVT) gem. Art. 30 Abs. 1 DSGVO
**Formular zur Vorlage beim behördlichen Datenschutzbeauftragten (bDSB) des kommunalen Schulträgers**  
**Bezeichnung der Verarbeitungstätigkeit:** Didaktische Unterrichtsorganisation und digitales Lernmanagement mit **Campus-Groovelab**  
**Stand der Dokumentation:** September 2026 / Schuljahr 2026/2027  

---

## 1. Angaben zum Verantwortlichen & Datenschutzbeauftragten (Art. 30 Abs. 1 lit. a DSGVO)

| Rolle | Bezeichnung & Kontaktdaten |
| :--- | :--- |
| **Verantwortliche Stelle (Schulträger)** | [NAME DER MUSIKSCHULE / STÄDTISCHER SCHULTRÄGER]<br>Anschrift: [STRASSE, PLZ, ORT]<br>Vertreten durch: [NAME SCHULLEITUNG / BÜRGERMEISTER]<br>E-Mail: [OFFIZIELLE E-MAIL-ADRESSE DER SCHULE] |
| **Behördlicher Datenschutzbeauftragter (bDSB)** | [NAME DES BEHÖRDLICHEN DATENSCHUTZBEAUFTRAGTEN DER STADTVERWALTUNG]<br>Dienststelle: [STADTVERWALTUNG / AMT FÜR DATENSCHUTZ]<br>E-Mail: [DSB-EMAIL@STADT.DE] |
| **Auftragsverarbeiter (Art. 28 DSGVO)** | **Patrick Huber Softwareentwicklung & Cloud-Dienstleistungen**<br>Plattform: Campus-Groovelab (https://campus-groovelab.de)<br>Karl-Fürstenberg-Str. 59, 79618 Rheinfelden (Baden)<br>E-Mail: `kontakt@campus-groovelab.de` |
| **Rechenzentrums-Subunternehmer** | **Hetzner Online GmbH**, Industriestr. 25, 91710 Gunzenhausen<br>Rechenzentrumsstandort: Falkenstein/Vogtland & Nürnberg (Bundesrepublik Deutschland)<br>Zertifizierung: ISO/IEC 27001 (Informationssicherheits-Managementsystem) |

---

## 2. Zwecke der Datenverarbeitung (Art. 30 Abs. 1 lit. b DSGVO)
1. Pädagogische Dokumentation des Fachunterrichts (digitales Schüler-Hausaufgabenheft, Meisterwerk-Dokumentation, didaktische Audio-Loopstation).
2. Raum- und Stundenplandisposition zur effizienten Auslastung städtischer Schulräumlichkeiten.
3. Asynchrone, geschlossene Schulkommunikation zwischen Lehrkräften, Schülern und Erziehungsberechtigten („Shouts“).
4. Organisation schulischer Ensembles und Bandproben (eine übergeordnete Konzert- und Festival-Ablaufplanung befindet sich derzeit als Roadmap-Erweiterung in Vorbereitung).

---

## 3. Rechtsgrundlagen der Verarbeitung
1. **Art. 6 Abs. 1 lit. e i. V. m. Landesgesetzen (Öffentlicher Bildungsauftrag):** Soweit die Musikschule als kommunale Bildungseinrichtung Aufgaben im öffentlichen Interesse wahrnimmt.
2. **Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung):** Zur Abwicklung des Musikschul-Unterrichtsvertrags und des B2C-Jahreszugangs.
3. **Art. 6 Abs. 1 lit. a i. V. m. Art. 8 DSGVO (Einwilligung bei Minderjährigen):** Für freiwillige didaktische Audioaufnahmen (Loopstation/Hausaufgaben) liegt die ausdrückliche Freigabe der Erziehungsberechtigten vor (`parent_allow_audio: true`).

---

## 4. Kategorien betroffener Personen & Datenkategorien (Art. 30 Abs. 1 lit. c & d DSGVO)

### A. Betroffene Personen:
- Minderjährige Musikschülerinnen und Musikschüler (ab 6 Jahren)
- Erziehungsberechtigte (Eltern)
- Lehrkräfte (Festangestellte nach TVöD und freie Honorarlehrkräfte)
- Schulleitung und Sekretariatsmitarbeiter

### B. Verarbeitete Datenkategorien:
* **Schülerdaten (Datensparsamkeit):** Vorname, Nachname (auf Lehrer-Oberflächen datenschutzkonform gekürzt auf den 1. Buchstaben: „Vorname + N.“), Schulausweis-Token, pseudonyme Schüler-PIN (PBKDF2-gehasht). **Keine privaten E-Mail-Adressen von Minderjährigen!**
* **Elterndaten:** 4-stellige Eltern-PIN (PBKDF2-gehasht), elterliche Zustimmungs-Flags (`parent_allow_audio`), Notfallschlüssel. **Keine Speicherung von Bankverbindungen, SEPA- oder Kreditkartendaten!**
* **Lehrkräftedaten:** Vorname, Nachname, Fachbereich, Raum- und Terminbelegungen.
* **Didaktische Inhalte:** Hausaufgabennotizen, Übe-Ziele, didaktische Schüler-Audioaufnahmen (didaktische Cover-Versionen von Übestücken zum pädagogischen Feedback mit der Lehrkraft gem. § 60a UrhG und zum privaten Anhören/Teilen im engsten Familienkreis gem. § 53 Abs. 1 UrhG; strikt geschlossener Bereich, keine öffentliche Mediathek, keine Stimmbiometrie!).

---

## 5. Empfänger der Daten & Drittlandübermittlung (Art. 30 Abs. 1 lit. e & e DSGVO)

| Empfänger / Dritte | Zugriffsumfang | Rechtsgrundlage / Vereinbarung |
| :--- | :--- | :--- |
| **Schulleitung & Sekretariat** | Administrativer Zugriff auf Raum-, Stundenplan- und Schülerstammdaten. Kein Zugriff auf vertrauliche pädagogische Notizen (RLS). | Internes Dienstverhältnis / TVöD |
| **Lehrkräfte** | Zugriff ausschließlich auf die eigenen Schülerklassen und Unterrichtsräume (RLS-Scoping). | Pädagogischer Auftrag |
| **Auftragsverarbeiter (Campus-Groovelab)** | Bereitstellung, Backup, Wartung und Betrieb der Cloud-Infrastruktur. | AVV gem. Art. 28 Abs. 3 DSGVO |
| **Drittlandübermittlung (Ausschluss)** | **0 % (NEIN).** Es findet keinerlei Datenübermittlung in ein Drittland außerhalb der EU/EWR statt. Vollständiger Ausschluss von US-Hyperscalern (AWS, Google, Microsoft). Immunität gegen US CLOUD Act und FISA 702 (Schrems II konform). | – |

---

## 6. Kommunales Löschkonzept nach DIN 66398 (Art. 30 Abs. 1 lit. f DSGVO)

| DIN 66398 Löschklasse | Datenart / Objekt | Regelspeicherdauer | Löschroutine |
| :--- | :--- | :--- | :--- |
| **LK 1 (Transiente Daten)** | Session-Cookies, Login-Leases, RAM-Caches | Sofort bei Logout / max. 30 Tage TTL | Automatische Token-Invalidierung |
| **LK 2 (Didaktische Audios)** | Hausaufgaben-Audios, Loopstation-Spuren | Bis Ende des laufenden Schuljahres (30.09.) | Automatischer Cron-Purge (`storage_janitor_cron.sh`) & Eltern-Sofortlöschbutton |
| **LK 3 (Abrechnungsstatus)** | Status Schüleraktivierung | Nach 60 Tagen Inaktivität | Sparmodus-Rückstufung |
| **LK 4 (Bildungsbiografie)** | Gemeisterte Songs, Jahres-Badges | Dauer des aktiven Unterrichtsvertrages | Physische Vernichtung 30 Tage nach Schulabgang |
| **LK 5 (Audit- & Finanzbelege)** | Revisionssichere Audit-Logs, B2B-Rechnungen | 10 Jahre (§ 147 AO / GoBD) | Append-Only WORM-Ledger |

---

## 7. Technisch-Organisatorische Maßnahmen (TOMs gem. Art. 32 DSGVO)
1. **Zutrittskontrolle:** ISO/IEC 27001 zertifiziertes Hetzner-Hochsicherheitsrechenzentrum mit 24/7-Kameraüberwachung und biometrischen Schleusen.
2. **Zugangskontrolle:** Zero-Knowledge PBKDF2-Hashing (100.000 Runden), WebAuthn FIDO2-Hardware-Passkeys, progressive Brute-Force-Sperren.
3. **Zugriffskontrolle:** PostgreSQL Row-Level-Security (RLS) mit transaktionslokalem Mandanten-Scoping (`school_id`).
4. **Weitergabekontrolle:** Durchgehende TLS 1.3 Verschlüsselung mit striktem HSTS und __Host-Cookie-Präfixen.
5. **Verfügbarkeitskontrolle:** Stündliche konsistente PostgreSQL-Dumps mit GFS-Rotation (`backup_supabase_enterprise.sh`).
6. **Trennungsgebot:** Strikte logische Mandantentrennung auf Datenbankebene (Default-Deny RLS).

---

[ORT], den [DATUM]

_________________________________________          _________________________________________  
Unterschrift Schulleitung / Schulträger            Kenntnisnahme behördlicher DSB (bDSB)
