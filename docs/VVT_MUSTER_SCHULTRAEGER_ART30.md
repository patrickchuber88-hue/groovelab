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
| **Rechenzentrums-Subunternehmer** | **IONOS SE**, Elgendorfer Str. 57, 56410 Montabaur (Primärer Produktionscluster `85.215.73.216`, Standorte Berlin/Frankfurt, ISO/IEC 27001)<br>**Hetzner Online GmbH**, Industriestr. 25, 91710 Gunzenhausen (Georedundantes Backup & Storage Box, Standorte Falkenstein/Vogtland & Nürnberg, ISO/IEC 27001) |

---

## 2. Zwecke der Datenverarbeitung (Art. 30 Abs. 1 lit. b DSGVO)
1. Pädagogische Dokumentation des Fachunterrichts (digitales Schüler-Hausaufgabenheft, Meisterwerk-Dokumentation, didaktische Audio-Loopstation).
2. Raum- und Stundenplandisposition zur effizienten Auslastung städtischer Schulräumlichkeiten.
3. Asynchrone, geschlossene Schulkommunikation zwischen Lehrkräften, Schülern und Erziehungsberechtigten („Shouts“).
4. Organisation schulischer Ensembles und Bandproben (eine übergeordnete Konzert- und Festival-Ablaufplanung befindet sich derzeit als Roadmap-Erweiterung in Vorbereitung).

---

## 3. Rechtsgrundlagen der Verarbeitung (4-Säulen-Architektur)
1. **Säule 1 (Pädagogischer Kernbetrieb):** **Art. 6 Abs. 1 lit. b DSGVO** (Unterrichtsvertrag mit Eltern/Schülern) sowie für kommunale Musikschulen **Art. 6 Abs. 1 lit. e DSGVO** i. V. m. Landesgesetzen (SchulG/LDSG, Öffentlicher Bildungsauftrag). **Ausschluss von Art. 6 Abs. 1 lit. f DSGVO:** Gemäß Art. 6 Abs. 1 UAbs. 2 DSGVO für Behörden unzulässig; zudem verbietet der Kinderschutz eine Interessenabwägung im pädagogischen Kernbereich.
2. **Säule 2 (Optionale Zusatzfeatures & Gamification):** **Art. 6 Abs. 1 lit. a i. V. m. Art. 8 DSGVO** (Privacy-by-Default; ausdrückliche Einwilligung der Erziehungsberechtigten für didaktische Audioaufnahmen `parent_allow_audio: true`, Leaderboards und Gamification unter Wahrung der vernünftigen Erwartungen gem. ErwGr. 47 DSGVO).
3. **Säule 3 (Defensive IT-Sicherheit & Missbrauchsschutz):** **Art. 6 Abs. 1 lit. c und e DSGVO** (öffentlich) bzw. **Art. 6 Abs. 1 lit. c und f DSGVO** (privat) i. V. m. Art. 32 DSGVO und ErwGr. 49 DSGVO (Netz- und Informationssicherheit als gesetzlich anerkanntes berechtigtes Interesse für DoS-Abwehr, Rate-Limiting und WORM-Audit-Logs).
4. **Säule 4 (Gesetzliche Aufbewahrungspflichten):** **Art. 6 Abs. 1 lit. c DSGVO** i. V. m. § 147 AO und § 257 HGB (10 Jahre Aufbewahrung von Abrechnungsbelegen im WORM-Ledger).

---

## 4. Kategorien betroffener Personen & Datenkategorien (Art. 30 Abs. 1 lit. c & d DSGVO)

### A. Betroffene Personen:
- Minderjährige Musikschülerinnen und Musikschüler (ab 6 Jahren)
- Erziehungsberechtigte (Eltern)
- Lehrkräfte (Festangestellte nach TVöD und freie Honorarlehrkräfte; geschützt durch 2-Phasen Herrenberg-Schutzschild)
- Schulleitung und Sekretariatsmitarbeiter
- Selbstständige Einzelkaufleute, Ein-Personen-GmbHs und Freiberufler (geschützt gem. Art. 4 Nr. 1 DSGVO via `build_safe_school_context`)

### B. Verarbeitete Datenkategorien:
* **Schülerdaten (3-Stufen-Identität & 360° Zero-Knowledge Identity Vault gem. Art. 4 Nr. 5 & Art. 32 DSGVO, Migrationen 600–605):** Mitschüler sehen über `public.users` technisch hart `last_name = NULL` (relativ anonymisiert gem. EuGH C-413/23 P); im Regelunterricht speichert `public.users_raw` standardmäßig nur die Initiale („Vorname + N.“); bürgerliche Nachnamen werden serverseitig in `private_auth.blind_student_lastname_vault` über HMAC-SHA256 Blind-Links und AES-256 PGP-Verschlüsselung ohne Fremdschlüssel mit Fail-Closed Master-Key-Tresor `vault_master_keys` verwahrt (Safe-Harbor-Freistellung gem. Art. 34 Abs. 3 lit. a DSGVO). Eingehende Nachnamen werden via Kernel-Trigger `trg_users_raw_zero_knowledge_vault` in-flight vor dem Schreiben abgefangen; bei Kontolöschung vernichtet der Kernel-Trigger `trg_users_raw_vault_purge` das Chiffrat im Tresor deterministisch (Art. 17 DSGVO Parität). Anzeige voller Namen erst nach autorisierter Step-Up Lease (`private_auth.step_up_leases`, 300s TTL / Zero-Client-PIN) für maximal 60 Sekunden im flüchtigen Modul-RAM nach NIST SP 800-63B. Schulausweis-Token, Schüler-PIN (Salted Bcrypt Cost >= 10 serverseitig in `private_auth.user_secrets` + clientseitig WebCrypto PBKDF2 100.000 Runden). **Keine privaten E-Mail-Adressen von Minderjährigen (100% Zero-User-Mail)!**
* **Elterndaten:** 4-stellige Eltern-PIN (Bcrypt-gehasht), elterliche Zustimmungs-Flags (`parent_allow_audio`), Notfallschlüssel. **Keine Speicherung von Bankverbindungen, SEPA- oder Kreditkartendaten!**
* **Lehrkräftedaten:** Vorname, Nachname, Fachbereich, Raum- und Terminbelegungen.
* **Didaktische Inhalte:** Hausaufgabennotizen, Übe-Ziele, didaktische Schüler-Audioaufnahmen (didaktische Cover-Versionen von Übestücken zum pädagogischen Feedback mit der Lehrkraft gem. § 60a UrhG und zum privaten Anhören/Teilen im engsten Familienkreis gem. § 53 Abs. 1 UrhG; strikt geschlossener Bereich, keine öffentliche Mediathek, keine Stimmbiometrie!).
* **ReBAC-Kinderschutz & StGB § 201 Safe-Harbor:** Keine verdeckten Meeting-Bots oder Raum-Transkriptionen; aktive Push-to-Talk Diktierfunktion in sichtbare Textfelder & 1-Klick-Sprachmemos mit hardware-seitigem `releaseAudioStream()`. Tonaufnahmen Minderjähriger sind durch Relationship-Based Access Control (ReBAC) streng auf den Schüler und die zugewiesene Lehrkraft beschränkt – Schulleitung und Sekretariat besitzen technisch 0 % Zugriff auf Tonaufnahmen.
* **EU AI Act Art. 4/27:** 100% deterministische DSP/FFT Signalverarbeitung; 0 Pflicht zu KI-Beauftragten oder FRIA.

---

## 5. Empfänger der Daten & Drittlandübermittlung (Art. 30 Abs. 1 lit. e & e DSGVO)

| Empfänger / Dritte | Zugriffsumfang | Rechtsgrundlage / Vereinbarung |
| :--- | :--- | :--- |
| **Schulleitung & Sekretariat** | Administrativer Zugriff auf Raum-, Stundenplan- und Schülerstammdaten. Kein Zugriff auf vertrauliche pädagogische Notizen (RLS). | Internes Dienstverhältnis / TVöD |
| **Lehrkräfte** | Zugriff ausschließlich auf die eigenen Schülerklassen und Unterrichtsräume (RLS-Scoping). | Pädagogischer Auftrag |
| **Auftragsverarbeiter (Campus-Groovelab)** | Bereitstellung, Backup, Wartung und Betrieb der Cloud-Infrastruktur. | AVV gem. Art. 28 Abs. 3 DSGVO |
| **Sub-Auftragsverarbeiter** | **IONOS SE** (Montabaur, DE; Primär-Cluster) & **Hetzner Online GmbH** (Falkenstein/Nürnberg, DE; Georedundantes Backup & Storage Box) | AVV-Kette nach Art. 28 Abs. 4 DSGVO; Stufe-2 Mutterkonzern-Garantie (100% DE, 0% US CLOUD Act) |
| **Drittlandübermittlung (Ausschluss)** | **0 % (NEIN).** Es findet keinerlei Datenübermittlung in ein Drittland außerhalb der EU/EWR statt. Stufe-3 Zero-Support-Backdoor: Keinerlei Supportzugriffe aus Drittstaaten (0% TIA-Pflicht). Volle Immunität gegen US CLOUD Act und FISA 702 (Schrems II konform). | – |

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
1. **Zutrittskontrolle:** ISO/IEC 27001 zertifizierte deutsche Hochsicherheitsrechenzentren (IONOS SE & Hetzner Online GmbH) mit 24/7-Kameraüberwachung und biometrischen Schleusen; 0% US-Mutterkonzern.
2. **Zugangskontrolle:** Duale Kryptografie: Serverseitig Salted Bcrypt (Cost >= 10 in `private_auth`) + clientseitig WebCrypto PBKDF2 (100.000 Runden SHA-512) & AES-256-GCM, WebAuthn FIDO2-Hardware-Passkeys mit Klon-Schutz, progressive Brute-Force-Sperren.
3. **Zugriffskontrolle & ReBAC-Schutz (§ 201 StGB):** PostgreSQL Row-Level-Security (RLS) mit transaktionslokalem Mandanten-Scoping (`school_id`) und Zero-Trust View-Maskierung. Audioaufnahmen Minderjähriger sind ausschließlich dem Fachlehrer und dem Schüler zugänglich (0 % Schulleitungszugriff).
4. **Weitergabekontrolle & EU-DNS-Souveränität:** Durchgehende TLS 1.3 Verschlüsselung mit striktem HSTS und __Host-Cookie-Präfixen; Zero-Heap HTTP 307 Edge-Streaming. Ausschließliche Nutzung deutscher/europäischer DNS-Resolver (`185.12.64.1` Hetzner DE & `193.110.81.0` DNS0.eu; 0% US-DNS-Resolver) sowie Nginx Edge Anti-IP-Spoofing.
5. **Verfügbarkeitskontrolle:** Stündliche konsistente Dumps mit Age X25519 asymmetrischer Verschlüsselung (umask 077) und Port 23 Sync zur isolierten Hetzner Storage Box.
6. **Trennungsgebot & 360° Zero-Knowledge Identity Vault (Migrationen 600–605):** Strikte logische Mandantentrennung auf Datenbankebene (Default-Deny RLS); 3-Stufen-Identität (Peers: `last_name = NULL`); Nachnamen in `private_auth.blind_student_lastname_vault` mit HMAC-SHA256 Blind-Links, PGP-AES-256 Verschlüsselung und Fail-Closed Tresor `vault_master_keys` (Safe-Harbor gem. Art. 34 Abs. 3 lit. a DSGVO & EuGH C-413/23 P); In-Flight Kernel-Verschlüsselung `trg_users_raw_zero_knowledge_vault` und deterministischer Art. 17 Kernel-Purge `trg_users_raw_vault_purge`; 60-Sekunden Auto-Curtain nach Step-Up-Lease (NIST SP 800-63B) und Schutz von Einzelkaufleuten gem. Art. 4 Nr. 1 DSGVO via `build_safe_school_context`.
7. **Herrenberg-Immunität:** 2-Phasen-Schutzschild: Phase 1 schützt Bestandsverträge nach § 127 SGB IV bis 31.12.2027; Phase 2 garantiert ab 01.01.2028 dauerhafte strukturelle Weisungs- und Indizienfreiheit nach § 7 Abs. 1 SGB IV & BSG B 12 R 3/20 R.

---

[ORT], den [DATUM]

_________________________________________          _________________________________________  
Unterschrift Schulleitung / Schulträger            Kenntnisnahme behördlicher DSB (bDSB)
