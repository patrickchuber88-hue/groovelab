# 🏛️ Behörden- & Datenschutz-Dossier (Compliance-Akte)
**Plattform:** Campus-Groovelab (https://campus-groovelab.de)  
**Standard:** DSGVO, BDSG, Schweizer nDSG, DIN 66398 (Löschkonzept)  
**Geltungsbereich:** Zur Vorlage bei Datenschutzaufsichtsbehörden (LfDI / DSK / EDÖB), kommunalen Schulträgern und Rechnungsprüfungsämtern  
**Gültigkeit:** Schuljahr 2026/2027 • Revisions-Stand: September 2026  

---

## 1. Übersicht & Verantwortlichkeiten (Art. 30 DSGVO)

| Gegenstand | Detail / Nachweis |
|---|---|
| **Plattformname** | Campus-Groovelab |
| **Betriebsform** | Software-as-a-Service (SaaS) Cloud-Infrastruktur gem. § 535 BGB |
| **Auftragsverarbeitung** | AVV nach Art. 28 Abs. 3 DSGVO für schulische Kernfunktionen |
| **B2C-Zusatzkonto** | Direkte Vertragsbeziehung mit Eltern bei Schüleraktivierung (Art. 4 Nr. 7 DSGVO) |
| **Serverstandort** | 100 % Bundesrepublik Deutschland (Rechenzentrum Falkenstein/Vogtland) |
| **Rechenzentrumsbetreiber** | Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen |
| **Zertifizierung** | ISO/IEC 27001 (Informationssicherheits-Managementsystem) |
| **Drittlandübermittlung** | **NEIN (0%).** Vollständiger Ausschluss von US-Cloud-Diensten (kein AWS, kein Google Cloud, kein Azure). Volle Immunität gegen US CLOUD Act und FISA 702 (Schrems II konform). |

---

## 2. Datenkategorien & Kompromisslose Datenminimierung (Art. 5 Abs. 1 lit. c DSGVO)

1. **Keine Speicherung sensibler Bezahldaten:**  
   Es werden zu keinem Zeitpunkt Kreditkartendaten, SEPA-Bankverbindungen oder Kontonummern von Schülern oder Eltern auf den Servern gespeichert.
2. **Keine E-Mail-Adressen von Minderjährigen:**  
   Die Authentifizierung von Schülern erfolgt ausschließlich über pseudonyme Ausweis-PINs oder gerätegebundene Passkeys/QR-Tokens.
3. **Automatische Nachnamensmaskierung:**  
   Schülernamen werden auf allen Lehrer- und Übersichts-Oberflächen datenschutzkonform auf „Vorname + 1. Buchstabe des Nachnamens“ abgekürzt.
4. **Keine Verhaltensprofilbildung (Private by Default):**  
   Übe-Zeiten, Streaks und XP-Punkte von Schülern sind standardmäßig strikt privat. Öffentliche Klassen-Rankings sind standardmäßig inaktiviert und erfordern die bewusste Freigabe durch die Erziehungsberechtigten.

---

## 3. Didaktische Audio-Aufnahmen & Kinderschutz (Art. 8 & 9 DSGVO, § 201 StGB)

1. **Ausschluss biometrischer Sprachanalysen (Art. 9 DSGVO):**  
   Die Audio-Engine dient ausschließlich dem didaktischen Vor- und Nachspielen (akustisches Feedback, Play-Along, Loopstation). Es findet **keine biometrische Stimmanalyse**, keine Sprechererkennung, keine Stimmfrequenzprofilierung und keine automatisierte Verhaltensbewertung statt.
2. **Das „Zero-Consent“-Schutzgate:**  
   Die Mikrofon- und Aufnahmefunktion ist für Minderjährige standardmäßig technisch gesperrt. Sie kann erst nach dokumentierter elterlicher Freigabe (`parent_allow_audio: true`) im System aktiviert werden.
3. **Elterliche Löschautonomie (Art. 17 DSGVO):**  
   Erziehungsberechtigte haben im Eltern-Portal jederzeit die Möglichkeit, sämtliche Audioaufnahmen ihres Kindes mit einem Klick eigenhändig und unwiderruflich physisch zu löschen.

---

## 4. Kommunales Löschkonzept nach DIN 66398 & Aufbewahrungsfristen

| Datenart / Objekt | DIN 66398 Löschklasse | Regelspeicherdauer | Löschmechanismus |
|---|---|---|---|
| **Didaktische Audio-Aufnahmen** (Hausaufgaben, Studio) | LK 2 (Ausbildungszyklus) | Bis zum Ende des laufenden Schuljahres (Stichtag: **30. September**) | Automatischer Cron-Purge (`storage_janitor_cron.sh`) und physische Vernichtung aus Supabase Storage |
| **Flüchtige Chat-Memos & Transiente Caches** | LK 1 (Kurzfristig) | Max. 30 Tage | Automatische Tabellen-Rotation |
| **Bildungsbiografie & Meisterwerk-Dokumentation** | LK 4 (Vertragslaufzeit) | Für die Dauer des aktiven Unterrichtsvertrags | Physische Löschung 30 Tage nach formeller Exmatrikulation / Schulabgang |
| **Revisionssichere Audit-Logs** | LK 5 (Gesetzliche Aufbewahrung) | 10 Jahre (§ 147 AO / GoBD) | WORM-geschütztes Merkle-Chain-Ledger |

---

## 5. Ausschluss von Arbeitnehmerüberwachung (§ 87 BetrVG / LPVG)

1. Die Plattform generiert keine Berichte über Verweildauern, Anmeldezeiten oder die Frequenz von Hausaufgabeneinträgen einzelner Lehrkräfte.
2. Schulleitungen und Administratoren haben keinen Zugriff auf pädagogische Notizen im geschützten Schüler-Lehrer-Verhältnis (Row-Level-Security).
3. Für Schulträger liegt ein separates Negativ-Attest ([`STAFF_COUNCIL_COMPLIANCE_DECLARATION.md`](./STAFF_COUNCIL_COMPLIANCE_DECLARATION.md)) vor.

---

## 6. Technisch-Organisatorische Maßnahmen (TOM) nach Art. 32 DSGVO

1. **Zutrittskontrolle:** ISO 27001-zertifiziertes Hochsicherheitsrechenzentrum mit biometrischem Zugangsschutz und 24/7-Überwachung.
2. **Zugangskontrolle:** PBKDF2 Zero-Knowledge-Hashing (100.000 Runden), FIDO2 / WebAuthn-Hardware-Tokens, progressive 3-Strike-Sperren.
3. **Zugriffskontrolle:** PostgreSQL Row-Level-Security (RLS) mit transaktionslokalem Mandanten-Scoping (`school_id`).
4. **Weitergabekontrolle:** End-to-End TLS 1.3 Transportverschlüsselung mit striktem HSTS und __Host-Cookie-Präfixen.
5. **Verfügbarkeitskontrolle:** Stündliche verschlüsselte Backups mit GFS-Rotationszyklus und georedundanter Cold-Storage-Replikation.
6. **Trennungsgebot:** Strikte logische Mandantentrennung auf Datenbank- und Storage-Ebene (Default-Deny RLS).

---

*Dieses Dossier dient als offizielle Bestätigung der Konformität von Campus-Groovelab mit den geltenden Datenschutzbestimmungen im Schul- und Bildungsbereich.*  
*Ausgestellt: September 2026 • Sicherheits- und Datenschutzmanagement Campus-Groovelab*
