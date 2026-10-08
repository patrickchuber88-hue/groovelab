# 🏛️ RECHTSGUTACHTEN & 360°-COMPLIANCE-DOSSIER: MUSIKSCHULSOFTWARE (ENTERPRISE+ SAAS)

**Autor:** Senior IT-Volljurist, Fachanwalt für IT-Recht, Zertifizierter behördlicher Datenschutzbeauftragter (bDSB / CIPP/E, CIPM) & Lead Security Systems Architect  
**System:** Campus-Groovelab Multi-Tenant EdTech Platform (Tier-1 SaaS Enterprise+ Platform für Musikschulen)  
**Status:** Autoritatives Kanonisches Dossier (Single Source of Legal Truth)  
**Klassifizierung:** Private Musikschulen, freie Musikakademien, Schulleitung, Lehrkräfte, Schüler & Eltern  
**Rechtsnatur:** Software-as-a-Service (SaaS)-Mietvertrag gemäß § 535 ff. BGB (DE) / §§ 1090 ff. ABGB (AT) / Art. 253 ff. OR (CH)  
**Positionierung & Subsidiaritäts-Doktrin:**  
1. **Pädagogischer Add-On-Charakter & Subsidiaritäts-Grundsatz:** Campus-Groovelab ist ein didaktisches Zusatz-, Erleichterungs- und Übermittlungswerkzeug („Convenience-Tool / Fast-Track-Option“) zur Beschleunigung und Erleichterung des Musikschulalltags. Die Plattform ersetzt ausdrücklich kein behördliches oder amtliches Schulverwaltungssystem (ERP-Software wie iMikel, MSVplus oder Musikschul-Manager) und stellt zu keinem Zeitpunkt den ausschließlichen oder verbindlich vorgeschriebenen Dienst-, Weisungs- oder Kommunikationskanal der Musikschule dar.  
2. **Primärwege, Weisungsautonomie der Schule, Vorbehalt & Wahlfreiheit:** Die offizielle dienstrechtliche Kommunikation, verbindliche Arbeitsanweisungen der Schulleitung sowie die hoheitliche Verwaltung von Schüler- und Honorarstammdaten verbleiben vollumfänglich auf den herkömmlichen Primärkanälen der Musikschule (dienstliche E-Mail, interne Kommunikationssysteme wie MS Teams, Telefon, behördliche ERP-Software oder Aushang). Lehrkräfte und Mitarbeiter sind zu jedem Zeitpunkt berechtigt, Stundenpläne, Raumwünsche und Terminänderungen alternativ auf dem herkömmlichen Weg (per E-Mail oder telefonisch) an das Sekretariat zu übermitteln. Raumbuchungsanfragen, Stundenplanübermittlungen und Terminabstimmungen in der Plattform stellen unverbindliche Voranfragen („unter Vorbehalt“) bzw. technische Botenübermittlungen dar; sie begründen zu keinem Zeitpunkt eine automatische Buchungsgarantie oder rechtsgeschäftliche Bindungswirkung für das Raum- und Stundenkontingent der Musikschule. Die verbindliche Zuteilung und Einpflege in das amtliche Schul-ERP obliegt allein der Schulleitung bzw. dem Schulsekretariat. Die Datenüberführung in das amtliche Verwaltungssystem der Schule obliegt der Musikschule.  
**Normativer Rahmen:** DSGVO, BDSG, TDDDG, SGB IV (§ 7 / Herrenberg Az. B 12 R 3/20 R), SGB VIII (§ 8a), SGB II (§ 28 Abs. 7 BuT), StGB (§§ 176a, 201, 202a–d, 266a), UrhG, UrhDaG, BGB (§§ 305 ff., 312j, 312k, 535 ff., 611 ff., 823, 832), PAngV, UStG (§ 4 Nr. 21 / § 14 / § 19), KSVG, ZAG (Zero Money Transit), BFSG 2025, BITV 2.0 / WCAG 2.2 AA, NIS-2 (Art. 33 DSGVO Proportionalität), CRA, EU AI Act (Deterministische DSP), revDSG (CH), MWSTG (CH), ABGB / UrhG / RKSV (AT).

---

## TEIL 1: DIE 18 DOGMATISCHEN RECHTS- & ARCHITEKTURSÄULEN

* **Säule 1: EU-DSGVO & BDSG (Hybride Mandanten-Architektur & Rollentrennung):** Striktes Trennungsprinzip zwischen schulischen Auftragsverarbeitungsdaten (Art. 28 DSGVO) und eigenverantwortlichen didaktischen Übetools für Eltern/Schüler (Art. 4 Nr. 7 DSGVO). Verbot von unverschlüsselten Schülerstammdaten im Client-State.
* **Säule 2: TDDDG & Endgeräteschutz (§ 25 TDDDG):** Zero-Third-Party-Tracking-Doktrin. Verbot unbefugter Zugriffe auf Endgeräte-Speicher (`localStorage`, Cookies). Beschränkung auf technisch zwingend erforderliche Session- und Sicherheits-Tokens.
* **Säule 3: Statusrecht & Herrenberg-Compliance (BSG Az. B 12 R 3/20 R, § 7 SGB IV, § 266a StGB):** Schutz vor Scheinselbstständigkeit freier Honorarkräfte. Ausschluss hoheitlicher Direktionsrechte und automatisierter Zeiterfassung durch ein zweistufiges Dispositionsmodell (Lehrkraft schlägt vor, Sekretariat weist Raum zu) und volle Übermittlungswahlfreiheit (App, E-Mail oder Papier).
* **Säule 4: Mitbestimmung & Arbeitnehmerschutz (§ 87 BetrVG, ArbZG, ArbSchG):** Verbot technischer Überwachungseinrichtungen für Lehrkräfte. Technische Gewährleistung des Rechts auf Nichterreichbarkeit (Quiet Hours).
* **Säule 5: Minderjährigenschutz & Strafrecht (§ 8a SGB VIII, §§ 176a, 201 StGB, KUG § 22):** Zero-Photo-Axiom für Kinder (3D-Instrumenten-Avatare statt Porträts), Vier-Augen-Prinzip in Chats (elterliche Einsicht), Mikrofon-Freigabesperren (§ 201 StGB) und Notruf-Eskalationsfilter.
* **Säule 6: Urheberrecht, Noten & Streaming (UrhG, UrhDaG, GEMA):** Hermetische Zero-Sheet-Music-Upload-Doktrin gem. § 53 Abs. 4 UrhG / § 1 Abs. 2 UrhDaG (keine Noten-PDFs; reine bibliografische Metadaten). Kurzlebige Pre-Signed Streaming-URLs für didaktische Schüleraufnahmen ($\le 1800\,\text{s}$).
* **Säule 7: Zivil- & SaaS-Vertragsrecht (BGB §§ 305 ff., 312j, 312k, 535 ff., 611 ff.):** B2B-Mietvertragsnatur mit Abbedingung verschuldensunabhängiger Garantiehaftung (§ 536a Abs. 1 BGB). B2C-Button-Lösung, elektronischer Kündigungsbutton mit PDF-Eingangsbeleg und Ausschluss automatischer Vertragsverlängerungen.
* **Säule 8: Preisangaben, Steuer- & Kassenrecht (PAngV, UStG, GoBD, KSVG):** Endpreistransparenz, steuerliche Trennung von befreitem Musikunterricht (§ 4 Nr. 20/21 UStG) und steuerpflichtigem Software-Hosting, Kleinunternehmer-Klauseln (§ 19 UStG), DIN EN 16931 E-Invoicing (ZUGFeRD / XRechnung) und KSK-Dokumentation.
* **Säule 9: Raumausstattungs-Inventar & Zero-Commerce-Doktrin (BGB § 130 Botenstatus, Ausschluss §§ 535 ff., 598 ff. BGB):** Hermetischer Ausschluss von Instrumentenverleih, Vermietung, Raten- oder Verkauf an Schüler/Eltern. Reine didaktische Raum-Equipment-Zuweisung. Rechtsverbindliche Bestands- und Vermögensbuchhaltung verbleibt zu 100 % im Primär-ERP der Musikschule.
* **Säule 10: Veranstaltungsrecht, Konzerte & GEMA (UrhG § 15, BGB § 823 Enthaftung):** Strikte Veranstalter-Enthaftung für Schulkonzerte (GEMA-Meldepflicht & Versammlungsstättenrecht obliegen allein der Schule), UrhG § 53 Notenkopierverbot via Guard `LEG-22` und 100% Zero-Photo-Sphärentrennung.
* **Säule 11: Privates Unterrichtsvertragsrecht, Kooperationen & Verbandsstatistik (BGB §§ 611, 614 / SGB II § 28 / bdfm):** Zivilrechtliche Entgeltabrechnung und Fälligkeit, private Ganztags-Randzeiten und Nachmittags-AGs an Partnerschulen, BuT-Bildungsgutschein-Abrechnung mit absolutem Stigmatisierungsschutz und anonymisierter bdfm-/Verbands-Statistikexport.
* **Säule 12: Gesundheits-, Ergonomie- & Lärmschutz-Enthaftung (BGB § 823 / ArbSchG / BFSG):** Ausschluss messtechnischer Schallschutz- und Lärmüberwachungspflichten (bleiben vor Ort bei Schulleitung/Lehrkräften), rein didaktische Raum-Metadaten ohne DIN 18041 Garantien, Quiet Hours und reflexionsarmer Bühnenmodus ($\ge 44 \times 44\,\text{px}$).
* **Säule 13: Digitale Barrierefreiheit (BFSG 2025, BITV 2.0, DIN EN 301 549, WCAG 2.2 AA):** Vollständige Tastaturbedienbarkeit aller Eltern- und Buchungsprozesse, WAI-ARIA Modal-Contract (`role="dialog"`, `aria-modal="true"`), Mindestkontraste 4,5:1 und rechtssichere Erklärung mit Status „teilweise vereinbar“ unter Berufung auf die gesetzliche Ausnahme für Kleinstunternehmen gem. § 3 Abs. 2 BFSG bei freiwilliger Einhaltung der WCAG 2.2 AA Standards.
* **Säule 14: NIS-2, Cyber Resilience Act & IT-Sicherheit (ISO 27001, ASVS Level 3):** WORM Append-Only Manipulationsschutz für Audit-Trails auf Kernel-Ebene, 24h-Vorfallsmeldewege gem. Art. 33 DSGVO, FIDO2 WebAuthn Passkeys, PBKDF2-HMAC-SHA-512 PIN-Hashing und 100% deutsches Hetzner-Hosting.
* **Säule 15: Künstliche Intelligenz & Signalverarbeitung (EU AI Act - VO (EU) 2024/1689):** Ausschluss von Hochrisiko-Bildungs-KI. Stimmgerät, Metronom und Loopstation basieren auf reiner deterministischer Fast-Fourier-Transformation (FFT) und Autokorrelation ohne neuronale Netze.
* **Säule 16: Finanzaufsicht & Zahlungsdiensterecht (ZAG / PSD2 / PSD3):** Zero Money Transit Doktrin: Verzicht auf Sammelinkasso oder Treuhandkonten zur vollständigen Freizeichnung von BaFin-Erlaubnispflichten gem. § 2 Abs. 1 Nr. 7 ZAG.
* **Säule 17: Schweizer Recht (revDSG, MWSTG, VMS):** Transatlantische Angemessenheit gem. Art. 16 revDSG, MWSTG Art. 21 Bildungsbefreiung und kaufmännische 5-Rappen-Rundung nach Art. 30 MWSTV (`roundToFiveRappen`).
* **Säule 18: Österreichisches Recht (DSG, BiDokG 2020, § 42f UrhG AT, RKSV):** Österreichische Schulzeitmodelle, Verfassungs-Datenschutz gem. § 1 DSG, Unterrichtsausnahmen nach § 42f UrhG AT und Bargeldlosigkeit zur Freistellung von der Registrierkassenpflicht (RKSV).

---

## TEIL 2: DAS LÜCKENLOSE 180-PUNKTE MASTER-INVENTAR

### BEREICH A: EU-DSGVO, BDSG & ADD-ON-DATENSCHUTZRECHT (001 – 040)
* **001 (Art. 28 Abs. 3 DSGVO):** Elektronischer AVV-Abschluss im B2B-Onboarding vor erster Schülerdatenerfassung (`AVVModal.tsx`).
* **002 (Art. 28 Abs. 3 / Art. 5 Abs. 2 DSGVO):** Kryptografischer WebCrypto SHA-256 Digest über Vertragstext, Schulkennung, Signee und Timestamp (`schools.avv_checksum`).
* **003 (Art. 28 Abs. 2 DSGVO):** Transparente Sub-Processor-Liste mit Hetzner Online GmbH und 14-tägiger Benachrichtigungsfrist.
* **004 (Art. 28 Abs. 3 lit. g DSGVO):** Vertragsbeendigungs- & Datenrückgabe-Pipeline mit Datenrückgabe (.ZIP) und WORM-Tombstone.
* **005 (Art. 30 DSGVO):** Bereitstellung eines schlüsselfertigen Muster-VVT für den Musikschulinhaber (`docs/VVT_MUSTER_SCHULTRAEGER_ART30.md`).
* **006 (Art. 35 DSGVO):** Formelles DSFA-Negativattest zum Ausschluss der Kriterien der DSK-Blacklist.
* **007 (Art. 8 Abs. 1 DSGVO):** Parental Consent Gate für Minderjährige unter 16 Jahren (`LegalConsentGate.tsx`).
* **008 (Art. 8 Abs. 2 DSGVO):** Serverseitige Altersverifikation via Server RPC `set_personal_pin` & `verify_parent_pin_with_lease`.
* **009 (Art. 5 Abs. 1 lit. c DSGVO):** Schüler-Roster Nachnamensmaskierung („Max M.“) auf Lehrkraft-Oberflächen.
* **010 (Art. 5 Abs. 1 lit. c DSGVO):** Zero-E-Mail-Axiom: Verbot von E-Mail-Adress-Erfassung bei Minderjährigen.
* **011 (Art. 5 Abs. 1 lit. c DSGVO):** Schüler-Login ausschließlich über QR-Code, Ausweis-ID oder PIN (`authenticate_by_credential`).
* **012 (Art. 25 DSGVO):** Zero-Secret-Leakage: Verbot von Klartext-PINs/Hashes in SELECT-Abfragen (`LEG-03`).
* **013 (Art. 25 DSGVO):** Verbot von Passwörtern und PINs in `localStorage` / `sessionStorage` (`LEG-05`).
* **014 (Art. 17 DSGVO / DIN 66398):** Musikschul-Löschkonzept nach DIN 66398 mit Löschklassen LK 1 bis LK 5.
* **015 (Art. 17 DSGVO):** Dynamischer Audio-Hausaufgaben-Purge am Ende des ersten Monats des individuellen Schuljahres.
* **016 (Art. 17 DSGVO):** Autonomer 1-Klick-Sofortlösch-RPC für Eltern über freiwillige Übungsaufnahmen (`purge_student_recordings_by_parent`).
* **017 (Art. 17 DSGVO):** Shared Device Scrubber bereinigt alle lokalen Caches auf Schul-Tablets beim Logout (`sharedDeviceScrubber.ts`).
* **018 (Art. 15 / 20 DSGVO):** Automatisierter DSGVO-Selbstauskunft-Export mit echtem WebCrypto SHA-256 Signatur-Siegel.
* **019 (Art. 16 DSGVO):** Revisionssichere Korrekturfunktionen für fehlerhafte Schüler- und Vertragsstammdaten.
* **020 (Art. 18 / 21 DSGVO):** Widerspruchs- und selektive Sperrfunktion gegen optionale didaktische Features (Campus-Cup, Leaderboard, Shoutbox).
* **021 (Art. 9 Abs. 1 DSGVO):** Schüler-Absagen-Neutralität: Absage rein als `canceled_by_student` ohne Symptome.
* **022 (Art. 9 Abs. 1 DSGVO):** Dozenten-Ausfall-Neutralität: Absage rein als `teacher_ausfall` ohne ICD-10 oder Atteste.
* **023 (Art. 9 Abs. 1 DSGVO):** Vollständiger Ausschluss biometrischer Stimm- oder Sprecherprofilierung.
* **024 (Art. 9 Abs. 1 DSGVO):** Verbot von Video-Streaming oder Gesichtserkennung im Schülerbereich.
* **025 (Art. 32 DSGVO):** Multi-Tenant Kernel-Isolation via PostgreSQL Row Level Security (`FORCE ROW LEVEL SECURITY`).
* **026 (Art. 32 DSGVO):** Erzwungenes TLS 1.3 mit PFS, HSTS (mind. 1 Jahr) und Preload.
* **027 (Art. 32 DSGVO):** JWE AES-256-GCM verschlüsselte Sessions mit rollierenden Leases und Vorbereitung auf `__Host-` Cookies.
* **028 (Art. 32 DSGVO):** PBKDF2 Zero-Knowledge Hashing mit mind. 100.000 Runden (SHA-512) für PINs und Passwörter.
* **029 (Art. 32 DSGVO):** Stündliche georedundante Backups (RPO $\le$ 60m, RTO $\le$ 45m, Age X25519).
* **030 (Art. 33 / 34 DSGVO):** 24h-Vorfallsmeldeplan an Schulleitung zur Wahrung der 72h-Behördenfrist (`INCIDENT_RESPONSE_RUNBOOK.md`).
* **031 (Art. 44 ff. DSGVO):** 100% deutsches/europäisches Hosting ohne US-Cloud (Hetzner Falkenstein/Nürnberg, Schrems II konform).
* **032 (Art. 12 DSGVO):** Datenschutzerklärung in kindgerechter, leichter Sprache für Minderjährige.
* **033 (Art. 13 / 14 DSGVO):** Transparenz über Rechtsgrundlagen, Zwecke und Speicherdauern beim Login.
* **034 (Art. 25 DSGVO):** Privacy by Default: Streaks, Übezeiten und Leaderboards standardmäßig `false` für alle Minors < 16 J.
* **035 (Art. 25 DSGVO):** Screenless Mode zur Vermeidung digitaler Bildschirmzeit im Grundschulalter.
* **036 (Art. 82 DSGVO):** AVV-Haftungsfreistellung für Datenschutzverstöße der Schule im Innenverhältnis (Hold-Harmless).
* **037 (Art. 7 Abs. 3 DSGVO):** Autoritativer RPC für den Widerruf von Einwilligungen mit WORM-Logging (`revoke_user_legal_consent`).
* **038 (Art. 6 Abs. 1 lit. b & f DSGVO):** Föderale Ferienkalender-Harmonisierung über deklarative Jurisdiktionsmatrix (`jurisdictionRegistry.ts`).
* **039 (Art. 24 / 28 Abs. 3 lit. h DSGVO):** Dediziertes DPO-Audit-Portal mit Live-Anbindung an `public.audit_logs`.
* **040 (Art. 5 Abs. 1 lit. f DSGVO):** Automatische Maskierung von Klarnamen und E-Mails in allen Log-Metadaten (`auditLogService.ts`).

### BEREICH B: TDDDG & ENDGERÄTESCHUTZ (041 – 050)
* **041 (§ 25 Abs. 1 TDDDG):** Hermetisches Verbot unbefugter Third-Party-Tracker, Werbe-Pixel und kommerzieller Analyse-SDKs (`LEG-06`).
* **042 (§ 25 Abs. 2 Nr. 2 TDDDG):** Lokale Browser-Speicherung (`localStorage`) strikt auf technisch zwingend erforderliche UI- und Session-Zustände beschränkt.
* **043 (§ 25 Abs. 2 Nr. 2 TDDDG):** Didaktischer PWA-Offline-Tresor (`groovelab_audio_vault` via IndexedDB) ausschließlich für bandbreitenfreies Üben in Proberäumen.
* **044 (§ 25 Abs. 1 TDDDG):** Ausschluss von serverseitigem Session-Tracking über Dritte oder seitenübergreifenden Browser-/Canvas-Fingerabdrücken.
* **045 (§ 25 Abs. 2 Nr. 2 TDDDG):** WebAuthn FIDO2 Passkeys verbleiben kryptografisch isoliert auf der hardwarebasierten Secure Enclave des Schüler-/Dozenten-Geräts.
* **046 (§ 25 Abs. 2 Nr. 2 TDDDG):** Service Worker Cache-Busting (`/sw.js`) erzwingt unverzügliche Sicherheitsupdates auf geteilten Unterrichtsgeräten.
* **047 (§ 25 Abs. 2 Nr. 2 TDDDG):** Autoplay-Schutz: Freischaltung der Audio-Engine (CampusTuner Stimmgerät, Loopstation) erst nach aktiver Nutzerinteraktion (Tap/Klick).
* **048 (§ 25 Abs. 2 Nr. 2 TDDDG):** Ergonomischer Notenständer-Modus: Screen-WakeLock während aktiver Übesessions mit sofortigem Release bei App-Wechsel.
* **049 (§ 25 Abs. 2 Nr. 2 TDDDG):** Schutz der Zwischenablage: Lese- und Schreibzugriffe auf das Clipboard ausschließlich bei explizitem Klick (z. B. PIN-Kopieren).
* **050 (§ 25 Abs. 2 Nr. 2 TDDDG):** Didaktischer Fokus-Timer: Flüchtige lokale Nutzung von Bewegungssensoren (`DeviceOrientation` / `DeviceMotion`) für Display-Down Anti-Cheat ohne Speicherung oder Servertransfer.

### BEREICH C: STATUSRECHT & HERRENBERG-COMPLIANCE (051 – 065)
* **051 (BSG B 12 R 3/20 R / § 106 GewO):** Ausschluss einseitiger arbeitgeberseitiger Direktionsrechte: Dozenten stimmen Unterrichtszeiten autonom mit Schülern ab.
* **052 (BSG B 12 R 3/20 R):** Stundenplan als rein didaktisches Abstimmungsinstrument („unter Vorbehalt“) im `ScheduleBoardDesktop.tsx` (kein rechtsverbindlicher Dienstplan).
* **053 (BSG B 12 R 3/20 R):** Zweistufiges Raum-Dispositionsmodell: Lehrkraft übermittelt pädagogischen Vorschlagsentwurf, Schulsekretariat prüft rein die technische Raumressource.
* **054 (§ 7 SGB IV / § 611a BGB):** Hermetisches Verbot von Direktionsbegriffen („Dienstplanverpflichtung“, „Arbeitsanweisung“, „Stechuhr“) in UI und Benachrichtigungen.
* **055 (§ 7 SGB IV / § 266a StGB):** Zero-Time-Tracking: Keine verpflichtende digitale Zeiterfassung oder Check-in-Stempel für freie Dozenten.
* **056 (§ 7 SGB IV):** Wahrung der didaktischen Methodenfreiheit: Keine Vorgabe starrer Lehrpläne oder Curricula für Honorarkräfte.
* **057 (§ 7 SGB IV / § 611a BGB):** Freiwilligkeit von Unterrichtsvertretungen für Kollegen ohne Sanktionen bei Ablehnung.
* **058 (BSG B 12 R 3/20 R):** Freiwilligkeitspostulat & Wahlfreiheit: Dozenten dürfen Stundenpläne alternativ formfrei per E-Mail, Telefon oder Zettel einreichen.
* **059 (§ 266a StGB / Zero-Payroll):** Strikte ERP-Trennung: Plattform berechnet 0 Honorare oder Gehälter; Abrechnung verbleibt zu 100 % im Primär-ERP der Musikschule.
* **060 (BSG B 12 R 3/20 R):** Freiwillige Teilnahme an Dozenten-Meetings und Teamsitzungen ohne Anwesenheitspflicht in der App.
* **061 (§ 7 SGB IV):** Bring Your Own Device (BYOD): Freie Lehrkräfte nutzen eigene private Endgeräte (Smartphones, Tablets) ohne behördlichen Gerätezwang.
* **062 (BSG B 12 R 3/20 R):** Autonomes Nachhol- und Token-System (Makeup Tokens) direkt zwischen Schüler und Lehrkraft bei Unterrichtsausfällen.
* **063 (BSG B 12 R 3/20 R / § 2 EntgFG):** Ausschluss von Durchbezahlungs- und bezahlten Ferienvergütungsklauseln für freie Honorarkräfte im System.
* **064 (§ 7 SGB IV / Art. 12 GG):** Nebentätigkeits- und Multi-Schul-Freiheit: Dozenten dürfen uneingeschränkt an mehreren Musikschulen oder privat unterrichten.
* **065 (§ 266a StGB / § 7a SGB IV / § 3 RDG):** Pädagogisches Dispositions- & Metadaten-Protokoll für Betriebsprüfungen der Deutschen Rentenversicherung mit explizitem § 3 RDG Disclaimer (`CourtProofExportModal.tsx`).

### BEREICH D: MITBESTIMMUNG, ARBEITNEHMERSCHUTZ & ARBEITSZEIT (066 – 075)
* **066 (BetrVG § 87 Abs. 1 Nr. 6):** Ausschluss jeglicher automatisierter Leistungs- und Verhaltenskontrolle von Lehrkräften.
* **067 (BetrVG § 87 / DSGVO Art. 25):** Verbot von Dozenten-Tracking-Dashboards: Schulleitung und Sekretariat erhalten keine Einsicht in Onlinezeiten oder Klickraten.
* **068 (ArbZG § 5 / ArbSchG § 5):** Integrierte Quiet Hours zur Unterdrückung von Push-Nachrichten zur Ruhezeit (`LEG-21`).
* **069 (ArbSchG § 5 / ArbZG):** Asynchronitäts-Garantie: Keine Reaktions- oder Antwortpflicht auf Schüler-Chats an Wochenenden/Feiertagen.
* **070 (ArbZG § 3):** Höchstarbeitszeit-Transparenz: Dezenter Ambient-Hinweis bei geplanter Tagesunterrichtszeit > 8 Std. für Festangestellte.
* **071 (BetrVG § 87 Abs. 1 Nr. 6):** Betriebliche Mitbestimmungskonformität: Transparente Dokumentation bei Einführung digitaler Systeme im Bildungswesen.
* **072 (BetrVG / DSGVO Art. 88):** Ausschluss vergleichender Dozenten-Rankings („Top-Lehrer“-Scores oder Aktivitätsvergleiche architektonisch gesperrt).
* **073 (BetrVG § 80 Abs. 2):** Neutraler statistischer Tätigkeitsbericht: Aggregierte Schulgesamtzahlen ohne individuelles Mitarbeiter-Profiling.
* **074 (ArbSchG §§ 5, 6):** Prävention digitaler Fehlbelastungen: Ausschluss von Lesebestätigungen („Gesehen“) und Schutz der Feierabendruhe.
* **075 (BetrVG § 77 / BGB):** Schlüsselfertige Muster-Betriebsvereinbarung bzw. IT-Nutzungsrichtlinie für private Musikschulen.

### BEREICH E: MINDERJÄHRIGENSCHUTZ, BILDNISRECHT & STRAFRECHT (076 – 090)
* **076 (KUG § 22):** Zero-Photo-Doktrin: Verbot von Klarnamen-Porträtfotos für minderjährige Schüler (`LEG-13`).
* **077 (KUG § 22):** Automatische Bereitstellung kuratierter 3D-Instrumenten-Avatare (`avatarResolutionEngine.ts`).
* **078 (KUG § 22):** Neutraler Fallback-Avatar bei unbekannten Instrumenten.
* **079 (§ 201 StGB):** Hardwaresperre des Mikrofons für Minors bis zur elterlichen Freigabe (Vertraulichkeit des Wortes).
* **080 (§ 8a SGB VIII / § 832 BGB):** Vier-Augen-Transparenz: Eltern haben Einsicht in Chats zwischen Lehrkraft und Kind.
* **081 (§ 176a StGB / DSA Art. 16):** Chat-Respect-Guard filtert Beleidigungen und Missbrauchsmuster (`chatRespectGuard.ts`).
* **082 (§ 8a SGB VIII):** Notruf-Automatik: Sofortige Krisenhelpline (116 111) bei Hinweisen auf Selbstgefährdung.
* **083 (DSA Art. 18):** Meldekette an Strafverfolgungsbehörden bei Verdacht auf schwere Straftaten an Kindern.
* **084 (§ 8a SGB VIII):** Benennung einer Ansprechperson für Kinderschutz im Impressum.
* **085 (BKiSchG § 3):** Unterstützung von Schutzkonzepten gegen Gewalt an Musikschulen.
* **086 (KUG § 23):** Gesonderte Genehmigungspflicht bei Videoaufnahmen von Schüler-Ensembles.
* **087 (StGB § 184i):** Sofortiger temporärer Chat-Sperr-Trigger bei schweren verbalen Grenzüberschreitungen.
* **088 (BGB § 1626):** Paritätischer Zugriff beider Erziehungsberechtigter auf das Schulkonto.
* **089 (Art. 8 DSGVO):** Didaktisches 3-Stufen-Altersmodell (Junior / Teen / Pro) zur Wahrung der digitalen Mündigkeit Minderjähriger.
* **090 (BSI TR-03116 / SEC-07):** Global Camera Kill Switch zur sofortigen Terminierung aller aktiven Kamera-Streams nach QR-Code-Scans (`cameraKillSwitch.ts`).

### BEREICH F: URHEBERRECHT, NOTEN & STREAMING (091 – 105)
* **091 (UrhG § 53 Abs. 4):** Vollständiges Verbot des Uploads und Teilens von Noten-PDFs (Notenkopierverbot, `LEG-22`).
* **092 (UrhDaG § 1 Abs. 2):** Reine Metadaten-Mediathek (Titel, Verlag, ISMN, Regal) ohne Werkdateien.
* **093 (UrhG § 60a):** Gesetzliche Schranken für Unterricht und Lehre strikt auf Metadaten begrenzt.
* **094 (UrhG § 73):** HMAC-signierte Pre-Signed Audio URLs mit Verfall nach maximal 1800s (30m).
* **095 (UrhG § 53 Abs. 1):** PIN-geschützte Freigabelinks ausschließlich für den privaten Familienkreis.
* **096 (UrhG / GEMA):** Didaktische Übe-Coverversionen verbleiben privat; keine öffentliche Wiedergabe.
* **097 (UrhG § 19a):** Ausschluss öffentlicher Links zu Schüler-Performances ohne Authentifizierung.
* **098 (UrhG):** Freistellungsanspruch gegen die Schule bei unzulässigen Uploads von Lehrern.
* **099 (UrhG § 14):** Achtung des Urheberpersönlichkeitsrechts bei didaktischen Arrangement-Notizen.
* **100 (UrhG § 60b):** Lizenzverträge bei Einbindung externer Backing-Tracks / Playalongs.
* **101 (UrhG § 60a / DSA Art. 6):** 1-Tap Bestätigungsdialog für Lehrkräfte vor Playalong- und Audio-Uploads (Störerhaftungsausschluss, `CopyrightUploadConfirmModal.tsx`).
* **102 (UrhG § 53 Abs. 1):** Lokaler Offline-Audio-Tresor (IndexedDB `groovelab_audio_vault`) ausschließlich für privates didaktisches Playback (`offlineAudioVault.ts`).
* **103 (UrhDaG § 2):** Plattform ist kein Diensteanbieter für das Teilen von Online-Inhalten (kein Upload-Filter-Zwang).
* **104 (UrhG § 85):** Didaktische Zweckbindung: Ausschluss kommerzieller Verwertung von im Unterricht erstellten Schüler-Audios.
* **105 (UrhG § 85):** Ausschluss kommerzieller Verwertung von im Unterricht erstellten Master-Audios.

### BEREICH G: ZIVILRECHT, SAAS & VERBRAUCHERSCHUTZ (106 – 120)
* **106 (BGB § 535):** SaaS-Mietvertragsnatur über pädagogische Add-On-Infrastruktur mit wirksamer Abbedingung verschuldensunabhängiger Garantiehaftung (§ 536a Abs. 1 BGB).
* **107 (BGB § 312j Abs. 3):** Gesetzliche B2C-Button-Lösung: Eindeutige Zahlungsbeschriftung („Kostenpflichtig buchen“, `LEG-07`) im Eltern-Checkout.
* **108 (BGB § 312k):** Zweistufiger elektronischer Kündigungsbutton mit sofortigem digitalem Fristbeleg-PDF (`LEG-09`).
* **109 (BGB § 309 Nr. 9):** Ausschluss automatischer Vertragsverlängerungen (reine befristete Schuljahres-Beiträge; keine Abofalle).
* **110 (BGB §§ 312f, 356 Abs. 5):** Gesetzeskonforme Widerrufsbelehrung mit dauerhafter In-App-Bereitstellung auf dauerhaftem Datenträger (PDF-Download im Elternbereich gem. § 312f BGB) und Erlöschen bei Sofortnutzung digitaler Inhalte mit ausdrücklicher Eltern-Zustimmung.
* **111 (BGB § 305 ff. / § 312f BGB):** Wirksame AGB-Einbeziehung im B2B- und B2C-Checkout mit dauerhafter Download- und Speichermöglichkeit (PDF) im In-App-Dokumentensafe.
* **112 (BGB § 307):** BGH-konforme Haftungshöchstgrenze auf typischerweise vorhersehbare Schäden und Mindestversicherungssumme.
* **113 (BGB § 254):** Mitverschuldensklausel: Pflicht der Schule zur regelmäßigen lokalen Sicherung über die 1-Klick-Export-Schaltfläche.
* **114 (BGB § 130):** Botenstatus-Doktrin: Chat-Nachrichten und Terminabsagen sind unverbindliche Mitteilungen; formelle Kündigungen des Hauptunterrichtsvertrags sind über die Plattform ausgeschlossen.
* **115 (BGB § 823):** Ausschluss von CAFM- & Verkehrssicherungspflichten (bleiben vollumfänglich bei der Musikschule vor Ort).
* **116 (BGB § 314):** Vorbehalt der außerordentlichen Kündigung aus wichtigem Grund in den B2B- und B2C-AGBs.
* **117 (BGB § 328 / § 5 Abs. 6 B2B-AGB):** Strikte Drittwirkungssperre im B2B-SLA: Der Infrastrukturvertrag entfaltet keinerlei drittschützende Wirkung zugunsten von Schülern, Eltern oder Lehrkräften; Hold-Harmless-Freistellung des Betreibers durch die Schule bei schulorganisatorischen Pflichtverletzungen oder Lehrkräfte-Fehlverhalten.
* **118 (BGB § 242):** Vorgerichtliche B2B-Mediationsklausel (IHK-Schlichtung) vor Anrufung der ordentlichen Zivilgerichte.
* **119 (BGB § 675):** Ausschluss von Zahlungsdiensteverträgen: Plattform schuldet keine treuhänderische Zahlungsabwicklung (reiner Zero-Money-Transit).
* **120 (BGB § 145 ff.):** 2-Faktor-Freischaltung für neue Schulen zur Vermeidung unbefugter Fake-Anmeldungen.

### BEREICH H: PREISANGABEN, STEUER- & ABRECHNUNGSRECHT (121 – 135)
* **121 (PAngV § 1 Abs. 1, 2 / BGB § 13):** Bruttopreis-Axiom & lückenlose Endpreistransparenz für private Schüler und Eltern (B2C); Ausweis des tatsächlichen Endpreises inklusive sämtlicher eventueller Nebengebühren ohne versteckte Zuschläge.
* **122 (UStG § 3a Abs. 5 / § 19 UStG):** Entkoppelte Steuertaxonomie: B2C-Schüler-Gutschein (5,39 €) ist strikt an den Betreiberstatus (`OPERATOR_BANKING_CONFIG.isVatStandardTaxed`) gebunden und von der Bildungsbefreiung (§ 4 Nr. 21 UStG) der Musikschule entkoppelt.
* **123 (UStG § 19 / PAngV):** Dynamische Kleinunternehmer-Klausel (`LEG-08`): Automatischer Ausweis des gesetzlichen Hinweises *„Gemäß § 19 UStG wird keine Umsatzsteuer berechnet“* bei kleineren Musikschulen und Solo-Musikpädagogen unterhalb der Umsatzschwelle.
* **124 (DIN EN 16931-1 / UStG § 14 Abs. 2 n.F.):** Asymmetrische E-Rechnungs-Architektur: ZUGFeRD 2.2 & XRechnung XML mit Leitweg-ID ausschließlich für institutionelle Kooperationen (B2G Ganztags- und Schulkooperationen); verbraucherfreundliche PDF-Textform für private Familien (B2C).
* **125 (GoBD §§ 146, 147 AO):** Revisionssichere Immutabilität: Festgeschriebene Rechnungsbelege und Transaktions-Logs sind datenbankseitig gegen nachträgliche Manipulation (`UPDATE`/`DELETE`) gesperrt; Korrekturen erfolgen ausschließlich durch formelle Stornobelege mit Audit-Trail.
* **126 (DIN ISO 7064):** Mathematische MOD 97-10 IBAN-Prüfsummenvalidierung vor Lastschrift- und Datensatzerzeugung zur Eliminierung von Bank-Rücklastschriftgebühren.
* **127 (ISO 20022):** Valider SEPA-Sammellastschriftexport nach aktuellem Schema `pain.008.001.08` als rein unverbindliche technische Vorbereitungshilfe für das Online-Banking der Musikschule (kein direkter Bankzugriff).
* **128 (KSVG §§ 24, 25 / BSG Herrenberg):** Informatorische KSK-Dokumentationshilfe: Aggregierte Jahresaufstellung der an selbstständige Dozenten gezahlten Honorare ohne stundengenaue Arbeitszeitüberwachung zur Vermeidung von Scheinselbstständigkeitsindizien.
* **129 (ZAG § 2 Abs. 1 Nr. 9):** Hermetisches Zero Money Transit: Vollständige Freistellung von der BaFin-Erlaubnispflicht (§ 1 Abs. 1 Satz 2 Nr. 6 ZAG); Plattform berührt niemals Gelder von Eltern oder Schülern; Zahlungsströme laufen direkt über Hausbanken oder BaFin-regulierte Zahlungsdienstleister.
* **130 (AO § 147 Abs. 6):** Standardisierter 1-Klick-Datenexport für steuerliche Betriebsprüfungen (IDEA / Beschreibungsstandard) zur revisionssicheren Vorlage beim Finanzamt.
* **131 (UStG § 14 Abs. 4):** Lückenlose Pre-Flight-Validierung aller gesetzlichen Pflichtangaben (Steuernummer/USt-IdNr., Rechnungsnummernkreis, Leistungszeitraum) vor Rechnungsabschluss.
* **132 (UStG § 13b / Art. 196 MWST-SystRL):** Automatischer Steuerschuldübergang (Reverse Charge) bei grenzüberschreitenden B2B-SaaS-Lizenzen an Musikschulen im DACH-Raum (Österreich / Schweiz).
* **133 (PAngV § 1 Abs. 3 / BGB § 307):** Transparenzgebot bei Preisnachlässen: Aufschlüsselung von Grundpreis, exaktem Rabattbetrag in EUR/CHF und Endzahlbetrag für Geschwister-, Sozial- und Mehrfächer-Ermäßigungen.
* **134 (BGB § 288 Abs. 2 / § 286 Abs. 3):** Partnerschaftliches B2B-Mahnwesen: 30 Tage Zahlungsziel netto gem. gesetzlichem Leitbild des § 286 Abs. 3 BGB; 30 Tage Ambient-Schonfrist und 42 Tage Sommer-Moratorium vor administrativem Schreibschutz im Sekretariat; verbraucherfreundliche Zahlungserinnerungen ohne B2B-Pauschale gegenüber privaten Eltern.
* **135 (HGB §§ 238, 257 / AO § 147):** 10 Jahre revisionssichere Langzeitarchivierung aller Belege im WORM-Archiv inklusive signiertem Kündigungs-Exportpaket bei Vertragsbeendigung.

### BEREICH I: RAUMAUSSTATTUNGS-INVENTAR, HERMETISCHER COMMERCE-AUSSCHLUSS & ERP-BOTENSTATUS (136 – 145)
* **136 (BGB §§ 535, 598 Ausschluss):** Hermetisches Zero-Lending: Vollständiger Ausschluss von Schüler-Leihverträgen und Instrumentenvermietung; keine Verwahr- oder Obhutshaftung.
* **137 (BGB § 433 / § 506 Ausschluss):** Zero-Commerce: Kein Verkauf, kein Ratenkauf, kein Mietkauf; vollständige Freizeichnung vom Verbraucherdarlehensrecht.
* **138 (BGB § 130 Botenstatus-Doktrin):** Raumausstattung ist ein rein unverbindliches didaktisches Orientierungswerkzeug; das Primär-ERP der Musikschule (WinMusik, MBS) bleibt unangefochtene SSOT für Vermögen und Inventur.
* **139 (BGB § 280 / § 823 Enthaftung):** Keine Gewährleistung oder Haftung für fehlerhafte, unvollständige oder veraltete Benutzereingaben bei Raum-Equipment.
* **140 (BGB § 823 Enthaftung):** Mängel- und Ausstattungserfassung in `SecretaryFacilityLogModal.tsx` ist ein internes didaktisches Notizwerkzeug; Ausschluss von CAFM-Verkehrssicherungspflichten.
* **141 (Raum-Zuordnungs-Axiom):** Equipment ist technisch ausschließlich Räumen (`roomId`) zugeordnet, niemals Personen, Schülern oder Eltern (`SecretaryEquipmentView.tsx`).
* **142 (Mängel-Notiz-Axiom):** Schadensmeldungen im Raum (`SecretaryFacilityLogModal.tsx`) sind unverbindliche interne Hausmeister-Notizen ohne rechtliche Mängelrügenwirkung.
* **143 (BGB § 130 Botenstatus):** Raum-Ausstattung dient der internen Stundenplanung; rechtsverbindliche Vermögensbuchhaltung verbleibt zu 100 % im Primär-ERP der Musikschule.
* **144 (Unterrichtsausfall-Enthaftung):** Defekte oder fehlende Instrumente in Räumen begründen keinerlei zivilrechtliche Schadensersatzansprüche gegen den SaaS-Betreiber.
* **145 (BGB § 280 Enthaftung):** Ausschluss jeglicher Gewährleistung für fehlerhafte, unvollständige oder veraltete Benutzereingaben bei Raum-Equipment.

### BEREICH J: VERANSTALTUNGSRECHT, KONZERTE & GEMA (146 – 150)
* **146 (BGB § 823 Betreiberpflichten):** Raumkapazitäten in `rooms.capacity` dienen rein didaktischer Ensemble-Planung; bau- und versammlungsstättenrechtliche Zulassungen obliegen dem Schulträger.
* **147 (UrhG § 15 / GEMA-Enthaftung):** Musikschule ist alleinige Veranstalterin von Schulkonzerten und verantwortlich für GEMA-Meldungen; Plattform übernimmt keine Veranstalterhaftung.
* **148 (UrhG § 53 Abs. 4 / UrhDaG):** Hermetisches Verbot des Uploads und Teilens von Noten-PDFs an Schüler oder Ensembles (Guard `LEG-22`).
* **149 (KUG § 22 / DSGVO Art. 13 Sphärentrennung):** Plattform speichert 0 Bild- und Videodaten von realen Veranstaltungen (Zero-Photo-Doktrin); Bildnisrechte vor Ort verbleiben im analogen Wirkungskreis der Schule.
* **150 (BGB § 823 / BImSchG Enthaftung):** Zeitliche Eventplanung im Terminkalender entbindet Schulträger nicht von der Einhaltung gesetzlicher Ruhezeiten und kommunaler Sondernutzungserlaubnisse.

### BEREICH K: PRIVATRECHTLICHER UNTERRICHT, GANZTAGS-KOOPERATIONEN & BUT-SCHUTZ (151 – 155)
* **151 (BGB §§ 611, 614 / § 286 BGB):** Privatrechtliche Entgeltabrechnung & Fälligkeit: Unterrichtsverhältnisse sind privatrechtliche Dienstverträge; strikter Ausschluss von Verwaltungsakten (§ 35 VwVfG) und hoheitlichen Gebührenbescheiden nach Kommunalabgabengesetzen (KAG).
* **152 (Didaktische Ganztags- & Kooperationsplanung):** Randzeiten- und Kooperationsmanagement: Einbettung privater Nachmittags-AGs und Ensembles an Partnerschulen im Stundenplan (`ScheduleBoardDesktop.tsx`); keine Übernahme hoheitlicher Betreuungspflichten nach dem Ganztagsförderungsgesetz (GaFöG).
* **153 (SGB II § 28 Abs. 7 / DSGVO Art. 9):** Absoluter BuT-Stigmatisierungsschutz: 1-Klick-Freistellungsflag im Schulsekretariat (`exempt_from_direct_billing = true`) schaltet Schüler beitragsfrei; striktes Verbot der Offenlegung von Sozialhilfe- oder Härtefallstatus in Schüler-Apps, Klassenlisten oder Chats.
* **154 (BGB § 130 Subsidiaritäts-Axiom / DSGVO Art. 89):** ERP-Primat & Verbandsstatistik-Enthaftung: Amtliche Verbandsstatistiken (bdfm, VdM) und Fördermittelnachweise verbleiben zu 100 % im Primär-ERP der Schule (iMikel, MSVplus); Plattform liefert rein interne didaktische Übe- und Aktivitätsmetriken ohne förderrechtliche Bindungswirkung.
* **155 (DIN EN 16931-1 / UStG § 14 Abs. 2 n.F.):** Asymmetrische B2G-E-Rechnung: Strukturierte ZUGFeRD 2.2 / XRechnung XML ausschließlich für die Abrechnung des B2B-Plattformbetriebs gegenüber kommunalen Schulträgern; private Familien erhalten formfreie, lesbare PDF-Textform.

### BEREICH L: GESUNDHEIT, ARBEITSSCHUTZ, ERGONOMIE & LÄRMSCHUTZ-ENTHAFTUNG (156 – 160)
* **156 (BGB § 823 / ArbSchG Enthaftung):** Ausschluss messtechnischer Schallschutz- und Lärmüberwachungspflichten: Die Plattform ist eine reine Software und führt keine akustischen Dezibel-Messungen durch; Lärmschutz, Gehörschutz und Raumpegel obliegen vollumfänglich der Schulleitung und den Lehrkräften vor Ort.
* **157 (Didaktisches Raum-Axiom):** Raumstammdaten (`rooms.name`, `rooms.capacity`) erfassen rein didaktische Orientierungsmerkmale; Ausschluss jeglicher bauakustischer Eignungs- oder Nachhallzeit-Garantien nach DIN 18041 oder ArbStättV.
* **158 (ArbSchG §§ 5, 6 / DSGVO):** Integrierte Quiet Hours & Recht auf Feierabend: Ambient-Feierabend-Pill und Wochenend-Sperren in Dozenten-Chats schützen Lehrkräfte vor Erreichbarkeitsdruck und digitalem Stress.
* **159 (DSGVO Art. 9):** Diagnosefreie Absagen-Neutralität: Neutrale Krank- und Ausfallmeldungen (`teacher_ausfall`) ohne jegliche Erfassung von medizinischen Diagnosedaten, ICD-10-Schlüsseln oder Attestgründen.
* **160 (BFSG / Apple HIG Ergonomie):** Physische Ergonomie & Stage Mode: Reale Trefferzonen $\ge 44 \times 44\,\text{px}$, reflexionsarmer High-Contrast Stage Mode (24pt Notenschrift) für Tablets am Instrumentenständer.

### BEREICH M: DIGITALE BARRIEREFREIHEIT & INKLUSION (161 – 165)
* **161 (BFSG ab 28.06.2025 / EAA RL (EU) 2019/882 & § 38 Übergangsrecht):** Vollgeltung für B2C-Registrierungs- und Eltern-Checkouts (5,39 € / Schuljahr); Verzicht auf Scheinschutz durch Kleinstunternehmer-Klauseln (§ 3 Abs. 2 BFSG) zum Ausschluss von Verbandsklagen (UKlaG / § 3a UWG); B2B-Harmonisierung nach BITV 2.0 / L-BGG; Bestandsvertrags-Garantie gem. § 38 Abs. 2 BFSG.
* **162 (BITV 2.0 / WCAG 2.2 AA Technische Invarianten):** Tastatur-Vollbedienbarkeit (`tabIndex={0}`, `Enter`/`Space`), WCAG 2.4.11/12 Focus Not Obscured (Bottom-Bar & Player Clearance `padding-bottom: calc(...)`), WCAG 2.5.7 Dragging Movements (2-Klick-Zuweisung als Tastaturalternative im Stundenplan), WCAG 3.3.8 Accessible Authentication (1-Tap QR-Login, WebAuthn Passkeys, Bild/Farb-PINs; Verbot kognitiver CAPTCHAs) & KPI-Kontrast-Immunität (Markenfarben Gelb/Grün/Rot im Hintergrund 100% erhalten, Textfarbe Slate-900 mit >12:1 Kontrast, `role="dialog"`, `Guard LEG-02`).
* **163 (BFSG § 14 / § 16 BFSG / UWG § 3a / BITV 2.0 § 7):** Erklärung zur digitalen Barrierefreiheit mit verbindlichem Status „teilweise vereinbar“ (Schutz vor Abmahnfallen gem. § 3a UWG); materiell-rechtliche Ausnahmen gem. § 16 BFSG / § 12a Abs. 6 BGG für Echtzeit-Audio-DSP und Fremduploads; behördliche Zweiteilung: Gemeinsame Marktüberwachungsbehörde der Länder (BFSG/B2C) vs. Schlichtungsstelle nach § 16 BGG / L-BGG für kommunale Musikschulen (B2B, `Guard LEG-01`).
* **164 (UN-BRK Art. 24 / WCAG 4.1.3 Multi-Sensorische Musik-Inklusion):** Screenreader-kompatibler Audio-Player mit Accessible Slider Semantik (`role="slider"`, `aria-valuetext` in Takten/Sekunden), ARIA-Live-Announcements (`aria-live="polite"`), optisches Metronom & haptische Rhythmus-Rückkopplung (`navigator.vibrate`) für Hörbeeinträchtigte sowie akustischer Vorzähler (Count-In) für Sehbeeinträchtigte.
* **165 (BITV § 4 / DSGVO Art. 12 Kognitive Barrierefreiheit & 2-Stufen-Architektur):** Gekoppelt an didaktische UI-Levels (`campus_ui_level`); Stufe 1 (Autoritative Volljuristische BGB- & DSGVO-Fassung im Footer und Checkout als vertragliche SSOT) vs. Stufe 2 (Junior Privacy & didaktische Leichte Sprache im Schülerbereich `junior` & `teen` gem. Art. 12 Abs. 1 DSGVO / BITV § 4 mit Piktogrammen ohne Paragraphendschungel).

### BEREICH N: NIS-2, CYBER RESILIENCE ACT & IT-SICHERHEIT (166 – 170)
* **166 (NIS-2 Art. 23 / DSGVO Art. 33 Abs. 2 / AVV § 6):** Gestufte 4-Phasen-Meldekaskade: Frühwarnung binnen 24h an Schulleitung/DPO, detaillierter Vorfallsbericht binnen 72h inklusive schlüsselfertigem Art.-33-DSGVO-Muster-Meldebogen für die Landesdatenschutzbehörde (LfDI), laufender Zwischenbericht und 1-Monats-Abschlussdossier mit Root-Cause-Analysis.
* **167 (CRA / VO (EU) 2024/2847):** Cyber Resilience Act & Software Supply Chain Governance: Automatisierte Generierung maschinenlesbarer Software Bill of Materials (CycloneDX v1.6 / SPDX 3.0) mit VEX-Begleitdokumentation (Vulnerability Exploitability eXchange) zum Ausschluss von False-Positives; kryptografisch signierte Lieferkette und CVSS $\ge 7.0$ Pre-Push & CI/CD Fail-Closed Blocker.
* **168 (DIN EN ISO/IEC 27001 / BSI IT-Grundschutz):** 100% Sovereign deutsches Hosting bei der Hetzner Online GmbH (Falkenstein/Vogtland & Nürnberg); vollständige CLOUD Act (18 U.S.C. § 2713) und FISA 702 Immunität durch 0% Abhängigkeit von US-Hyperscalern oder US-Third-Party-Diensten; TLS 1.3 only mit PFS und HSTS in-transit sowie LUKS AES-256-XTS at-rest.
* **169 (DSGVO Art. 32 / § 202a StGB / § 371a ZPO):** PostgreSQL Kernel WORM-Immutabilität: `trg_prevent_master_audit_tampering` blockiert `UPDATE` und `DELETE` unumstößlich auf Kernel-Ebene; Merkle-Tree Hash-Chain (SHA-256 Verkettung von Eintrag $n-1$ zu $n$) garantiert unbestechliche zivilprozessuale Beweiskraft vor Gerichten und Aufsichtsbehörden; strikte DDL-Rechte-Trennung (`NO SUPERUSER`).
* **170 (ISO 22301 / BSI 200-4 / DSGVO Art. 17):** 3-2-1-1-0 Business Continuity & Disaster Recovery (RPO $\le$ 60m / RTO $\le$ 45m): Georedundanz Nürnberg (`nbg1`) $\rightarrow$ Falkenstein (`fsn1`) mit Age X25519 asymmetrischer Zero-Knowledge-Verschlüsselung und WORM-Snapshots auf Hetzner Storage Box; DSGVO Art. 17 Anti-Zombie-Tombstones tilgen gelöschte Nutzer bei Katastrophen-Restores vor Freigabe des Live-Traffics atomar erneut.

### BEREICH O: EU AI ACT, FINANZAUFSICHT (ZAG) & DACH-RECHT (171 – 180)
* **171 (EU AI Act Anhang III / VO (EU) 2024/1689):** Deterministische DSP statt Hochrisiko-KI: Tuner, Akkorderkennung und Intonationsanalyse basieren zu 100 % auf mathematischer digitaler Signalverarbeitung (FFT, YIN-Autokorrelation, Goertzel-Filter) ohne neuronale Netze oder Machine Learning; vollständige Freistellung von den Hochrisiko-Auflagen des AI Act (`Guard LEG-23`).
* **172 (EU AI Act Art. 5 Abs. 1 lit. c, f / DSGVO Art. 9 Abs. 1):** Hermetisches Verbot von Stimm- und Sprecherbiometrie: Audioaufnahmen von Schülern dienen rein pädagogischem Playback; striktes Verbot von Stimmabdrücken (Voiceprints), Sprecheridentifikation oder Emotions-/Stimmungsanalysen an Minderjährigen (`voiceBiometricsExclusion`).
* **173 (DSGVO Art. 22 / EU AI Act Art. 14):** Human-in-the-Loop Dispositionskontrolle: Stundenplan- und Raumvorschläge im Scheduler (`ScheduleBoardDesktop.tsx`) sind unverbindliche technische Entwürfe; die Letztentscheidungs- und Buchungsdisposition verbleibt ausnahmslos beim Menschen (Lehrkraft / Schulsekretariat).
* **174 (ZAG § 2 Abs. 1 Nr. 9 / PSD3 / § 63 ZAG Strafbarkeits-Schutz):** **Zahlungen zwischen Musikschule und den Eltern laufen NIEMALS über Campus-Groovelab.** Vollständiger Ausschluss von Treuhandinkasso, Sammelkonten und Geldtransit; Unterrichtsentgelte verbleiben zu 100 % im direkten Bankenverkehr zwischen Eltern und Schule (unverbindlicher SEPA-XML `pain.008` Export); Plattform-Zahlungen beschränken sich hermetisch auf die B2B-SaaS-Miete (§ 535 BGB) und den B2C-Software-Jahrespass der Eltern (5,39 € gem. §§ 327 ff. BGB); vollständige Freistellung von BaFin-Erlaubnispflichten.
* **175 (revDSG Schweiz vom 01.09.2023 / VMS-Richtlinien):** Schweizer Bundesrats-Angemessenheitsbeschluss gemäss Art. 16 Abs. 1 revDSG für Datentransfers nach DE; Schutz besonders schützenswerter Personendaten (Art. 5 lit. c revDSG) durch strikte Absenzen-Neutralität ohne Diagnosedaten; Wahrung von Art. 28 ZGB und VMS-Stufen.
* **176 (MWSTG Art. 21 Abs. 2 Ziff. 11 / Art. 30 MWSTV Schweiz):** Schweizer Bildungsbefreiung für Unterrichts- und Ausbildungsleistungen; kaufmännische 5-Rappen-Rundung auf CHF 0.05 via deterministischer `roundToFiveRappen` Engine (`Guard LEG-26`).
* **177 (DSG § 1 / Landesmusikschulgesetze / § 42f UrhG Österreich):** Verfassungsgesetzlicher Datenschutz gem. § 1 DSG Österreich; Kompatibilität mit Landesmusikschulgesetzen und den 4 Bildungsstufen (Elementar-, Unter-, Mittel-, Oberstufe); Wahrung des Verbots digitaler Noten-Uploads nach § 42f UrhG-AT.
* **178 (RKSV / § 132 BAO Österreich):** Vollständige RKSV-Freistellung durch reine Bargeldlosigkeit im System (keine Registrierkassensignatur erforderlich); 7 Jahre gesetzliche Aufbewahrungsfrist von Buchungsjournalen gem. § 132 BAO (Systemstandard: 10 Jahre).
* **179 (DSA / VO (EU) 2022/2065):** Notice & Action Meldebutton (Art. 16 DSA) in Schüler- und Band-Chats (`CampusDirectMessages.tsx`) zur sofortigen Meldung von Mobbing oder Verstößen (`chatRespectGuard.ts`); Non-Monetary-Gamification-Schutzschild gegen manipulative Dark Patterns und Lootboxen.
* **180 (GewO § 2 / EStG § 18 / bdfm & VdM):** Strikte steuerliche und berufsrechtliche Trennung von gewerblichem IT-SaaS-Betrieb (§ 14 GewO / § 15 EStG) und freiberuflicher Lehrtätigkeit (§ 18 EStG); hermetischer Ausschluss von Arbeits- oder Dozentenvermittlung (§ 296 SGB III).

---

## TEIL 3: 360° RISIKOMATRIX & SANCTION IMPACT

| Priorität | Risikofeld | Materiell-rechtliche Normierung | Schadenspotenzial & Sanktion | Technische Schutzmaßnahme im System (SSOT) |
|:---|:---|:---|:---|:---|
| **P1 (Kritisch)** | **Mandanten-Datenleck & US-Transfer** | Art. 83 Abs. 5 DSGVO, Schrems II, § 202a StGB | Bußgelder bis zu 20 Mio. € / 4 % Jahresumsatz, sofortiger Mandantenverlust | PostgreSQL RLS mit `school_id = get_current_user_school_id()`, ausschließliches Hetzner-Hosting in DE. |
| **P1 (Kritisch)** | **Scheinselbstständigkeit Lehrkräfte** | BSG B 12 R 3/20 R (Herrenberg), § 7 SGB IV, § 266a StGB | Nachforderung von Sozialversicherungsbeiträgen für 4 Jahre, Strafbarkeit Schulleitung | Zweistufiges Stundenplan-Modell: Lehrkraft übermittelt unverbindlichen didaktischen Entwurf ohne Raumwahl. |
| **P1 (Kritisch)** | **Illegale Noten-Uploads** | § 1 Abs. 2 UrhDaG, § 53 Abs. 4 UrhG, § 97 UrhG | Schadensersatzforderungen der Musikverlage nach Lizenzanalogie | Vollständiger Ausschluss von Datei-Upload-Endpunkten für Noten; AST-Blockade via `legal_compliance_guard.mjs`. |
| **P2 (Hoch)** | **Verstoß gegen Barrierefreiheit** | §§ 14, 16 BFSG, § 3a UWG | Bußgeld bis zu 100.000 €, behördliche Betriebsuntersagung, Verbandsklagen | 100% WAI-ARIA Dialog-Contract auf allen Modals (`role="dialog"`, `aria-modal="true"`), Status „teilweise vereinbar“. |
| **P2 (Hoch)** | **Unerlaubte Bankgeschäfte (ZAG)** | §§ 1, 10, 63 ZAG, PSD3 | Freiheitsstrafe bis zu 5 Jahren gem. § 63 ZAG, Einschreiten der BaFin | Zero Money Transit: Keine treuhänderische Entgegennahme von Elternbeiträgen zur Weiterleitung an Dritte. |
| **P2 (Hoch)** | **Unzulässige Emotionsbiometrie** | Art. 5 Abs. 1 lit. f EU AI Act, Art. 9 DSGVO | Bußgelder bis zu 35 Mio. € bzw. 7 % Jahresumsatz | Reines Streaming von Standard-PCM/Opus-Audiodateien ohne biometrische Stimm- oder Stimmungsanalysen. |
| **P3 (Mittel)** | **Verbraucherschutz (BGB §§ 312j/k)** | § 312j Abs. 3 BGB, § 312k BGB, § 3a UWG | Unwirksamkeit von Kundenverträgen, massenhafte Abmahnungen | BGB § 312j konforme Beschriftung („Kostenpflichtig buchen“), zweistufiger Kündigungs-Assistent mit PDF-Beleg. |
| **P3 (Mittel)** | **Steuertransparenz & Rundung** | PAngV, § 19 UStG, MWSTG Art. 21 / Art. 30 MWSTV | Nachforderungen der Finanzverwaltung, Abmahnungen | Dynamische USt-Deklaration, Bruttopreisgarantie, deterministische Rundung auf CHF 0.05 via `roundToFiveRappen`. |
| **P4 (Niedrig)** | **Ausfall von Schulstunden / CAFM** | § 823 BGB, § 280 BGB | Zivilrechtliche Schadensersatzklagen von Eltern wegen Unterrichtsausfall | Subsidiaritäts-Doktrin: Plattform ist didaktisches Zusatzwerkzeug; bei Ausfall greift herkömmlicher Schulbetrieb. |

---

## TEIL 4: ZERTIFIZIERUNGS- & QUALITY-GATE ARCHITEKTUR

Das gesamte 180-Punkte-Inventar wird über das automatisierte Quality-Gate in `scripts/legal_compliance_guard.mjs` vor jedem Git-Commit überwacht. Code-Änderungen, die eine der 180 Invarianten verletzen, führen zu einem sofortigen Abbruch des Build-Prozesses mit Exit-Code 1.
