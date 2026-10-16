# 🏛️ Implementierungsplan: 0,1% Senior-Volljurist Forensik-Patches (7 Kern-Befunde)

## 1. Ausgangslage & Zielsetzung
Nach der erfolgreichen Umsetzung der **3-Zonen-Governance** in `LegalTextModal.tsx` (4-Säulen-Standard ohne horizontalen Scrollbalken) wurden die Rechtstexte (Version 2026.6) einer forensischen Zweitprüfung durch einen externen Rechtsberater und einen IT-Fachanwalt unterzogen.

Hierbei wurden **7 juristische Sollbruchstellen** identifiziert:
1. **Befund 1:** Widerspruch zwischen pauschalem „Zero-Payment-Storage“ und tatsächlicher GoBD-/Bankkontoauszugs-Speicherung (§ 147 AO) bei Schüler-Direktüberweisung.
2. **Befund 2:** Fehlen eines „Zahlungspflichtig bestellen“-Kaufbuttons bei Banküberweisung, Vermeidung von Zahlungsfallen & Bereitstellung der Vertragsbestätigung auf dauerhaftem Datenträger (§ 312f Abs. 2 BGB) via PDF-Freischaltschein (Zero-User-Mail-Axiom).
3. **Befund 3:** Ablauf des gesetzlichen 14-tägigen Widerrufsrechts (§ 356 BGB) VOLLSTÄNDIG innerhalb des kostenfreien Probemonats (September), sodass ab 1. Oktober 0 % Rücküberweisungsrisiko besteht; strikte Trennung des 100 % wortgetreuen amtlichen Gesetzestextes (Anlage 1 EGBGB) von vertraglichen Zusatzgarantien.
4. **Befund 4:** Standalone-Profil-Architektur bei unterjähriger Exmatrikulation: Entkoppeltes Übestudio bis 31. August, Zuweisung einer neutralen Standalone-ID (Schülerzähler der Musikschule = 0 €), absolutes Erlöschen nach dem 31. August (keine Abofalle).
5. **Befund 5:** BSI TR-02102-1 & OWASP ASVS Level 3 Konformität der AVV-TOMs (Argon2id / PBKDF2-HMAC-SHA-512 mit Salt und Server-Pepper statt veraltetem Blowfish).
6. **Befund 6:** Bereinigung des Impressums (Entfernen des unzulässigen Telefon-Platzhalters `(Direktrufnummer in Schaltung)`) und Verankerung des gesetzlichen Kleinstunternehmer-Schutzschilds (§ 3 Abs. 3 BFSG) bei freiwilliger WCAG 2.2 AA Parität.
7. **Befund 7:** § 127 SGB IV (Herrenberg-Übergangsgesetz bis 31.12.2027) und § 72a Abs. 5 SGB VIII (Speicherverbot für Führungszeugnisse) unter **100 % strikter Gleichbehandlung aller Lehrkräfte** (keine Zweiklassengesellschaft im System).

---

## 2. Zu bearbeitende Dateien

| Datei | Betroffene Abschnitte | Relevante Befunde |
| :--- | :--- | :--- |
| `apps/groovelab/src/legal/legalContent.ts` | `platform_privacy` (Ziff. 2 Abs. 1 & Ziff. 9 LK 5) | Befund 1 |
| `apps/groovelab/src/legal/legalContent.ts` | `terms_student_platform` (Ziff. 3 Abs. 5 & Ziff. 3 Abs. 7) | Befund 2, 4 |
| `apps/groovelab/src/legal/legalContent.ts` | `consumer_cancellation_policy` (Ziff. 2 & Ziff. 3) | Befund 3 |
| `apps/groovelab/src/legal/legalContent.ts` | `avv_standalone` (Anlage 1 Ziff. 4 & Anlage 2 Ziff. 1) | Befund 1, 5 |
| `apps/groovelab/src/legal/legalContent.ts` | `impressum` (Ziff. 3 & neue Ziff. 10 BFSG) | Befund 6 |
| `apps/groovelab/src/legal/legalContent.ts` | `terms_b2b_avv` (Ziff. 5 Abs. 2) & `child_protection_code` (Ziff. 8) | Befund 7 |
| `apps/groovelab/src/constants/legalMasterWording.ts` | `fees`, `legalDisclaimers`, `securityStandards`, `din66398Retention` | Befunde 1–7 (SSOT-Harmonisierung) |

---

## 3. Detaillierte Umsetzungs-Spezifikation je Befund

### 🛡️ Befund 1: Präzise Trennung von In-App-DB und externer Fibu (§ 147 AO)
* **In `legalContent.ts` -> `platform_privacy`:**
  * In `summaryPoints`: Punkt 3 präzisieren auf *"Keine Speicherung von Bank- oder Zahlungsdaten der Familien auf den Plattform-Servern (Zero-In-App-Payment-Storage); strikte Trennung von App-DB und externer Finanzbuchhaltung (§ 147 AO)"*.
  * In Ziffer 2 Abs. 1 den Text ersetzen:
    ```markdown
    (1) Keine Zahlungs- oder Bankdaten auf den Plattform-Servern (Zero-In-App-Payment-Storage):
    Auf den Webservern und in der Cloud-Datenbank von Campus-Groovelab werden zu keinem Zeitpunkt IBAN-, Bankkonto-, SEPA-Lastschrift- oder Kreditkartendaten von Schülern oder Eltern erhoben oder gespeichert. Im Falle der Träger-Sammelabrechnung (Modell A) erfolgt die Abrechnung ausschließlich mit der Musikschule. Entscheidet sich eine Familie im Modell der Schüler-Direktabrechnung (Modell B) nach dem kostenfreien Probemonat aktiv für die Freischaltung per Banküberweisung (Einmalbeitrag), wird in der Plattform-Datenbank lediglich der pseudonyme Freischaltstatus (paid_until) des Schülerprofils hinterlegt; die Zahlungsdaten des Bankkontoauszugs (Überweisender, IBAN, Betrag, Campus-ID im Verwendungszweck) verbleiben ausschließlich in der externen, steuerrechtlichen Finanzbuchhaltung des Betreibers (eigenständige Verantwortlichkeit gem. Art. 6 Abs. 1 lit. b und c DSGVO i. V. m. § 147 AO / § 257 HGB).
    ```
  * In Ziffer 9 bei Löschklasse LK 5 ergänzen:
    ```markdown
    - **📑 LK 5 – B2B-Abrechnungsbelege der Musikschule & steuerrechtliche Bankkontoauszüge:** 10 Jahre gesetzliche Aufbewahrungsfrist gem. § 147 AO / § 257 HGB (B2B-Sammelrechnungen an die Schule ohne Klarnamen Minderjähriger sowie steuerrechtliche Bankkontoauszüge bei Direktüberweisung in der abgetrennten Finanzbuchhaltung des Betreibers).
    ```

---

### 💳 Befund 2: Freischaltprozess & Dauerhafter Datenträger (§ 312f Abs. 2 BGB) via PDF-Freischaltschein
* **In `legalContent.ts` -> `terms_student_platform`:**
  * In `summaryPoints`: Punkt 6 anpassen auf *"Transparenter Freischalt-Prozess (§ 312j BGB) & Vertragsbestätigung auf dauerhaftem Datenträger (§ 312f Abs. 2 BGB) via 1-Klick PDF-Download im Elternbereich"*.
  * Ziffer 3 Abs. 5 neu fassen:
    ```markdown
    (5) Transparenter Freischalt-Prozess (§ 312j BGB) & Vertragsbestätigung auf dauerhaftem Datenträger (§ 312f Abs. 2 BGB):
    Vor Auslösung einer entgeltlichen Schuljahres-Freischaltung werden den Erziehungsberechtigten Gesamtpreis (max. 5,39 € bzw. CHF 11.00), die feste Laufzeit bis zum Schuljahresende (31. August) sowie der Leistungsumfang unmittelbar und hervorgehoben angezeigt. Die Freischaltung wird erst durch die aktive Banküberweisung des Jahresbeitrags unter Angabe der Campus-ID vollzogen; unterbleibt die Überweisung, entsteht keinerlei Zahlungsverpflichtung (automatischer Fallback auf den kostenfreien Basistarif). Zur Wahrung des 100 % Zero-User-Mail-Axioms stellt die Plattform den Erziehungsberechtigten bei Abruf der Überweisungsdaten sowie nach erfolgter Freischaltung die vollständige Vertragsbestätigung einschließlich dieser Nutzungsbedingungen und der Widerrufsbelehrung als unveränderbares, lokal speicherbares PDF-Dokument (dauerhafter Datenträger gem. § 312f Abs. 2 BGB) direkt zum 1-Klick-Download sowie im geschützten Eltern-Dokumententresor bereit.
    ```

---

### ⚖️ Befund 3: September-Aktivierungs-Standard & 100 % amtliches EGBGB-Muster
* **In `legalContent.ts` -> `consumer_cancellation_policy`:**
  * Ziffer 2: Exakt das **amtliche Gesetzesterminologie-Muster** nach Anlage 1 zu Art. 246a § 1 Abs. 2 Satz 2 EGBGB ohne Zwischenüberschriften oder Abweichungen (zur Wahrung der unanfechtbaren Gesetzlichkeitsfiktion):
    ```markdown
    ### 2. Gesetzliche Widerrufsbelehrung (Amtliches Muster gem. Anlage 1 zu Art. 246a § 1 Abs. 2 Satz 2 EGBGB)

    **Widerrufsbelehrung**

    **Widerrufsrecht**  
    Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.  
    Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.

    Um Ihr Widerrufsrecht auszuüben, müssen Sie uns:  
    **Patrick Huber – Campus-Groovelab Plattformbetrieb**  
    Karl-Fürstenberg-Str. 59, 79618 Rheinfelden, Deutschland  
    E-Mail: kontakt@campus-groovelab.de  
    mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder eine E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.

    Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.

    **Folgen des Widerrufs**  
    Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass Sie eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt haben), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.
    ```
  * Ziffer 3: Vertragliche September-Aktivierungs-Architektur & Kulanzgarantien:
    - Abs. 1: Schnuppermonat September (Vertragsabschluss zur Schuljahreseröffnung am 1. September -> 14-tägige Widerrufsfrist läuft vom 1. bis 15. September).
    - Abs. 2: Wertersatz-Ausschluss (0,00 € gem. § 357a Abs. 2 BGB / § 16 FAGG): Bei Widerruf bis 15. September ist kein Geld geflossen und kein Wertersatz geschuldet.
    - Abs. 3: Nach Ablauf der 14 Tage (16. bis 30. September) Überweisung des Jahresbeitrags (5,39 €). Ab 1. Oktober absolute Rechtssicherheit für das gesamte Schuljahr (0 % Rücküberweisungsaufwand).
    - Abs. 4: Zusätzliche elektronische 1-Klick-Widerrufsfunktion im Elternportal & sanfter Fallback auf den Basistarif (0,09 €).

---

### 🎓 Befund 4: Standalone-Profil-Architektur bei Schulabgang (Exmatrikulation)
* **In `legalContent.ts` -> `terms_student_platform`:**
  * Ziffer 3 um Absatz 7 erweitern:
    ```markdown
    (7) Didaktischer Standalone-Übemodus bei unterjährigem Schulaustritt (Exmatrikulation):
    Kündigt ein Schüler oder Erziehungsberechtigter unterjährig den Unterrichtsvertrag mit der Musikschule, für den der Jahresbereitstellungsbeitrag (5,39 € bzw. CHF 11.00) entrichtet wurde, bleibt das persönliche Übestudio (Loopstation, Metronom, Stimmgerät, eigener Audio-Tresor und die bisherige musikalische Audio-Biografie) bis zum regulären Ende des Schuljahres (31. August) im entkoppelten Standalone-Modus uneingeschränkt nutzbar. Schulgebundene Funktionen (schulischer Stundenplan, Raumzuweisungen, Lehrer-Chats und schulische Ensembleräume) werden mit der Austrittsmeldung der Musikschule deaktiviert. Das Profil wird datenschutzkonform aus dem Mandanten der Musikschule entkoppelt und einer neutralen Standalone-ID zugewiesen, sodass die Musikschule mit dem Austrittsdatum von jeglichen weiteren Bereitstellungskosten entlastet wird (Schülerzähler der Schule = 0). Mit Ablauf des 31. August endet die Bereitstellung des Standalone-Übemodus absolut und automatisch ohne Kündigungserfordernis (keine automatische Verlängerung); den Nutzern steht bis zum 30. September das 30-tägige Exportfenster zur Verfügung.
    ```

---

### 🔐 Befund 5: Krypto-Veralterung in den AVV-TOMs beheben
* **In `legalContent.ts` -> `avv_standalone` Anlage 2 Ziff. 1 (Zugangskontrolle):**
  * Veraltetes „Bcrypt 10 Runden Blowfish“ ersetzen durch:
    ```markdown
    - *Zugangskontrolle:* Authentifizierung über passwortlose FIDO2-Hardware-Passkeys (WebAuthn), kryptografische Schulausweis-Tokens und **kryptografisches Key-Stretching gem. BSI TR-02102-1 und OWASP ASVS Level 3 (Argon2id bzw. PBKDF2-HMAC-SHA-512 mit mindestens 100.000 Runden, hohem Entropie-Salz und serverseitigem Pepper)** im isolierten Datenbankschema \`private_auth.user_secrets\`. Progressive Rate-Limiter (Dual-Key Lockout) gegen Brute-Force.
    ```

---

### 📞 Befund 6: Impressum-Bereinigung & BFSG-Kleinstunternehmer-Schutzschild
* **In `legalContent.ts` -> `impressum`:**
  * In Ziffer 3 den unzulässigen Platzhalter `(Direktrufnummer in Schaltung)` entfernen und durch autoritativen telefonischen Kundenservice während der Servicezeiten mit prioritärem Rückruf ersetzen.
  * Ziffer 10 anfügen:
    ```markdown
    ---

    ### 10. Barrierefreiheit & Gesetzliche Ausnahme für Kleinstunternehmen (§ 3 Abs. 3 BFSG)
    Als Diensteanbieter von reinen Dienstleistungen im Bereich Bildungssoftware mit weniger als zehn Beschäftigten und einem Jahresumsatz von höchstens 2 Millionen Euro fällt der Betreiber unter die **gesetzliche Ausnahme für Kleinstunternehmen gemäß § 3 Abs. 3 BFSG** (zur Umsetzung der Richtlinie (EU) 2019/882 / European Accessibility Act). Ungeachtet dessen setzt Campus-Groovelab die technischen Qualitätsstandards der BITV 2.0 sowie der Web Content Accessibility Guidelines (WCAG) 2.2 auf Konformitätsstufe AA freiwillig und umfassend um. Die vollständige Erklärung zur Barrierefreiheit und der zugehörige Feedback-Mechanismus sind im Tab „Barrierefreiheit“ einsehbar.
    ```

---

### 🤝 Befund 7: § 127 SGB IV & § 72a Abs. 5 SGB VIII bei 100 % Gleichbehandlung aller Lehrkräfte
* **In `legalContent.ts` -> `terms_b2b_avv` Ziff. 5 Abs. 2:**
  * Um § 127 SGB IV (Übergangsregelung bis 31.12.2027) ergänzen, wobei alle Lehrkräfte absolut gleichbehandelt werden (gleiche pädagogische Würde und Weisungsfreiheit).
* **In `legalContent.ts` -> `child_protection_code`:**
  * Ziffer 8 ergänzen: Gesetzliches Speicherverbot für Führungszeugnisse (§ 72a Abs. 5 SGB VIII / § 30a BZRG). Die Plattform speichert für keine Lehrkraft oder Mitarbeiter Führungszeugnisse; die Einsichtnahme verbleibt bei der Schulleitung vor Ort im Primär-ERP.

---

### 🔄 Synchronisation in `legalMasterWording.ts` (Single Source of Truth)
* Aktualisierung von:
  * `fees.directBillingAnnualOnly`: September-Aktivierung, Widerrufsablauf vor Zahlung, Standalone-Modus bei Exmatrikulation.
  * `legalDisclaimers.herrenbergCompliance`: Integration von § 127 SGB IV bei 100 % Gleichbehandlung.
  * `securityStandards.zeroKnowledgeHashing`: BSI TR-02102-1 & OWASP ASVS L3 Key-Stretching (Argon2id / PBKDF2-HMAC-SHA-512 + Pepper).
  * `legalDisclaimers.bfsgAccessibilityDeclaration`: Verweis auf § 3 Abs. 3 BFSG Kleinstunternehmer-Schutzschild.
  * `legalDisclaimers.childProtectionCode8a`: Verweis auf § 72a Abs. 5 SGB VIII Speicherverbot.

---

## 4. Verifikations- und Qualitätskriterien

1. **Syntax-Integrität:**
   - Prüfung aller modifizierten TypeScript-Dateien mit `npx esbuild apps/groovelab/src/legal/legalContent.ts --outfile=/dev/null` und `npx esbuild apps/groovelab/src/constants/legalMasterWording.ts --outfile=/dev/null` erfolgreich abgeschlossen (0 Fehler, ⚡ Done in 11ms / 3ms).
2. **Verifikations-Doktrin:**
   - Keine eigenständigen `npm run gate` Läufe im Terminal ohne gesonderte Betreiber-Aufforderung / Codewort „commit“.
3. **Desktop Layout Immunity:**
   - Reine Text- und Content-Ergänzungen; keinerlei Beeinträchtigung von Grids oder Komponentenlayouts.
4. **BFSG- & WCAG 2.2 AA Parität:**
   - Erhalt der vollständigen Barrierefreiheit im Modal.

---

## 5. Status: 100 % Vollständig Umgesetzt ✅

Sämtliche 7 forensischen Befunde des Rechtsberaters und IT-Fachanwalts wurden auf echtem 0,1 % Senior-Volljuristen-Niveau minimal-invasiv und typ-sicher in [`legalContent.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/legal/legalContent.ts) sowie [`legalMasterWording.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/constants/legalMasterWording.ts) implementiert:

1. **Befund 1:** Saubere Trennung von Cloud-DB (`paid_until`) und Betreiber-Fibu (§ 147 AO / GoBD Aufbewahrung von Bankkontoauszügen) in der Datenschutzerklärung und den AVV-Anlagen.
2. **Befund 2:** Transparenter Freischaltprozess (§ 312j BGB) ohne Zahlungsfalle und Bereitstellung der Vertragsbestätigung auf dauerhaftem Datenträger (§ 312f Abs. 2 BGB) als unalterierbares PDF im Eltern-Tresor unter Wahrung des 100 % Zero-User-Mail-Axioms.
3. **Befund 3:** 100 % unverändertes amtliches Muster nach Anlage 1 zu Art. 246a § 1 Abs. 2 Satz 2 EGBGB in Ziffer 2 zur Sicherung der gesetzlichen Schutzwirkung (Gesetzlichkeitsfiktion); Ablauf der 14-tägigen Widerrufsfrist im September-Schnuppermonat (1.–15. Sept.) mit 0,00 € Wertersatz und Fälligkeit zum 30. Sept. -> ab 1. Oktober 0 % Rücküberweisungsrisiko.
4. **Befund 4:** Standalone-Profil-Architektur bei unterjährigem Austritt: Entkoppeltes Übestudio bis 31. August, Zuweisung einer neutralen Standalone-ID (Musikschul-Zähler sofort 0 €), absolutes Erlöschen am 31. August (keine Abofalle).
5. **Befund 5:** BSI TR-02102-1 und OWASP ASVS Level 3 Krypto-Standard (Argon2id bzw. PBKDF2-HMAC-SHA-512 mit 100.000 Runden, Salz und Server-Pepper) in den AVV-TOMs.
6. **Befund 6:** Bereinigung des Impressums (Entfernen des unzulässigen Telefon-Platzhalters) und Verankerung des gesetzlichen Kleinstunternehmer-Schutzschilds (§ 3 Abs. 3 BFSG) bei freiwilliger WCAG 2.2 AA Parität.
7. **Befund 7:** § 127 SGB IV Herrenberg-Übergangsrecht bis 31.12.2027 und § 72a Abs. 5 SGB VIII gesetzliches Speicherverbot für Führungszeugnisse unter 100 % strikter Gleichbehandlung aller Lehrkräfte.
