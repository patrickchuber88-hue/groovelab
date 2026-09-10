/**
 * Central Single Source of Truth (SSOT) for all Legal, Pricing, and Business Model Wording
 * Platform: Campus-Groovelab
 * Compliance: § 535 BGB (SaaS), DSGVO Art. 28 (AVV), UWG § 5 (Abmahnschutz), PAngV, § 14 UStG, § 19 UStG
 */

export const LEGAL_MASTER_WORDING = {
  // Plattform-Name
  platformName: 'Campus-Groovelab',

  // 1. Software-Bereitstellung (0,00 € Inklusive)
  softwareProvisioning: {
    title: 'Software-Bereitstellung',
    canonicalLineItem: 'Campus-Groovelab Software-Bereitstellung',
    priceText: '0,00 € (Inklusive)',
    onboardingInfo: 'Software-Bereitstellung: 0,00 € (Inklusive). Keine Einrichtungsgebühr. Modul-Auswahl (Campus & GrooveLab) flexibel im Dashboard wählbar.',
    noLicenseFeeDisclaimer: 'Keine gesonderten Lizenzkaufgebühren. Berechnet wird ausschließlich die gemietete Cloud- und Hosting-Infrastruktur.',
    noLicenseFeeShort: 'Keine Lizenzkaufgebühren (0,00 €)',
    slogan: 'Transparentes Cloud-Hosting statt teurer Software-Lizenzen',
    unifiedSaasContract: 'Software-as-a-Service (SaaS)-Bereitstellung nach § 535 BGB: Bereitstellung der Software ohne Lizenzkaufgebühr (0,00 € Einrichtungsgebühr), Abrechnung erfolgt rein über die modulare Cloud-Infrastruktur.'
  },

  // 2. Modulare Buchung & Cloud-Hosting
  hosting: {
    campus: {
      name: 'Modul Campus',
      canonicalLineItem: 'Cloud- & Datenbank-Hosting: Modul Campus',
      priceText: '14,90 € / Mo. (DE/AT) • CHF 19.90 / Mo. (CH)',
      priceEur: '14,90 € / Mo.',
      priceChf: 'CHF 19.90 / Mo.',
      description: 'Stundenplan, Hausaufgabenheft, Schüler-Protokoll & Raum-Engine'
    },
    groovelab: {
      name: 'Modul GrooveLab',
      canonicalLineItem: 'Cloud- & Datenbank-Hosting: Modul GrooveLab',
      priceText: '9,90 € / Mo. (DE/AT) • CHF 14.90 / Mo. (CH)',
      priceEur: '9,90 € / Mo.',
      priceChf: 'CHF 14.90 / Mo.',
      description: 'Bands, Songs, Repertoire, Live Lab & Skill-Radar'
    },
    bundle: {
      name: 'Kombi-Vorteil Bündel',
      canonicalLineItem: 'Kombi-Vorteilsrabatt (Infrastruktur-Bündel)',
      savingsText: '-4,90 € / Mo. (DE/AT) • -4.90 CHF / Mo. (CH)',
      bundlePriceText: '19,90 € / Mo. (DE/AT) • CHF 29.90 / Mo. (CH)',
      description: 'Campus & GrooveLab gemeinsam gebucht (Sie sparen 4,90 € / CHF 4.90 / Mo.)'
    },
    modularityClaim: 'Campus und GrooveLab sind modular und unabhängig voneinander nach individuellem Bedarf buchbar.'
  },

  // 3. Service- & Betreuungsgebühren
  fees: {
    staffServiceFee: 'Service- & Administrationspauschale: 0,49 € / Mo. (DE/AT) bzw. CHF 1.00 / Mo. (CH) je aktive Lehrkraft (Verwaltung & Schulleitung 0,00 € / CHF 0.00 inklusive)',
    studentBaseFee: 'Basis-Bereitstellung: 0,09 € / Mo. (DE/AT) bzw. CHF 0.20 / Mo. (CH) je Schüler (QR-Landingpage, Stundenplan & DSGVO/nDSG-Hosting)',
    studentCampusFee: 'Cloud- & Modul-Bereitstellung Campus: 0,49 € / Mo. (DE/AT) bzw. CHF 1.00 / Mo. (CH) je aktiver Schüler',
    studentGroovelabFee: 'Cloud- & Modul-Bereitstellung GrooveLab: 0,49 € / Mo. (DE/AT) bzw. CHF 1.00 / Mo. (CH) je aktiver Schüler (immer 100% von der Schule übernommen)',
    directBillingAnnualOnly: 'Schüler-Direktabrechnungen mit Eltern/Schülern erfolgen ausnahmslos als einmaliger Jahresbeitrag (max. 11 × 0,49 € = 5,39 € in DE/AT bzw. 11 × CHF 1.00 = CHF 11.00 in CH pro Schuljahr; 1. Monat 100% kostenfrei) – niemals als monatliche Einzelbuchung.'
  },

  // 4. Rechtshinweise & AGB
  legalDisclaimers: {
    onboardingConsent: 'Mit Klick auf „Kostenfrei freischalten“ akzeptieren Sie unsere AGB für Bildungseinrichtungen sowie die Vereinbarung zur Auftragsverarbeitung (AVV nach Art. 28 DSGVO / Art. 9 nDSG).',
    b2bContractNature: 'Software-as-a-Service (SaaS)-Mietvertrag gemäß § 535 ff. BGB (DE) / §§ 1090 ff. ABGB (AT) / Art. 253 ff. OR (CH) über schlüsselfertige Cloud-Infrastruktur.',
    pedagogicalAddonDisclaimer: 'Campus-Groovelab ist ein didaktisches Zusatzwerkzeug zur Unterstützung des Fachunterrichts und häuslichen Übens. Die Plattform ersetzt kein amtliches Schulverwaltungssystem.',
    subsidiarityAndConvenienceDoctrine: 'Subsidiaritäts- & Convenience-Doktrin (Fast-Track / Beschleunigungswerkzeug): Campus-Groovelab fungiert als rein unterstützendes, optionales Convenience- und Beschleunigungswerkzeug. Es ersetzt weder die primären behördlichen Schulverwaltungssysteme (ERP wie WinSchool, Musikschul-Manager) noch die offiziellen städtischen Kommunikationswege (E-Mail, MS Teams, Telefon, Post). Dienstliche Weisungen und administrative Arbeitsanweisungen verbleiben ausnahmslos auf den herkömmlichen städtischen Dienstwegen.',
    emergencyFallbackDisclaimer: 'Bei technischen Störungen oder Ausfällen läuft der Schulbetrieb uneingeschränkt über herkömmliche Wege (Telefon, E-Mail) weiter (Ausschluss von Unterrichtsausfall-Haftung).',
    kleinunternehmerUStG19: 'In DE gemäß § 19 UStG bzw. in AT gemäß § 6 Abs. 1 Z 27 UStG 1994 umsatzsteuerbefreit (Kleinunternehmerregelung). In der Schweiz gilt Leistungsort Schweiz (nicht im Inland steuerbar gem. Art. 8 Abs. 1 MWSTG).',
    standardVatGrandfathering: 'Alle angegebenen Endpreise verstehen sich inklusive der gesetzlichen Mehrwertsteuer (in Deutschland 19 % MwSt.). Bei Bestandskunden gilt die unbedingte Bruttopreisgarantie (die Mehrwertsteuer ist im vertraglich garantierten Endpreis vollständig enthalten). In der Schweiz gilt Leistungsort Schweiz (nicht im Inland steuerbar gem. Art. 8 Abs. 1 MWSTG).',
    deterministicDspNonAiAct: 'Deterministische Signalverarbeitung & Ausschluss von KI-Systemen (VO (EU) 2024/1689 ErwGr. 12 & Art. 3 Nr. 1): Sämtliche didaktischen Audio-Werkzeuge (CampusTuner Stimmgerät, Metronom, Loopstation) sowie der 15-Stufen-Stundenplan-Solver basieren auf rein deterministischen mathematischen Algorithmen (Fast-Fourier-Transformation, Autokorrelation, Constraint-Satisfaction-Heuristiken). Es kommen keine adaptiven oder probabilistischen maschinellen Lernverfahren (Deep Learning, neuronale Netze) zum Einsatz. Eine automatisierte Entscheidungsfindung oder Profilbildung (§ 22 DSGVO) findet nicht statt; menschliche Lehrkräfte und Schulleitungen behalten die uneingeschränkte Letztentscheidung.',
    screenlessPractice: 'Didaktisches Prinzip des bildschirmfreien Übens (Screenless Practice): Im Modus „Von Eltern geführt“ verbleibt das Endgerät bei den Erziehungsberechtigten. Übezeiten am akustischen Instrument werden per 1-Klick-Quittierung verbucht, um Kinder (insbesondere 6–9 Jahre) vor verfrühter Bildschirmzeit zu schützen (einheitliche elterliche Freigabe bis 16 Jahre in DE, AT und CH).',
    herrenbergCompliance: 'Autonomie von Honorarlehrkräften & Übermittlungsfreiheit (BSG B 12 R 3/20 R): Stundenplan-, Raum- und Terminabstimmungen stellen unverbindliche didaktische Dispositionsvorschläge dar. Lehrkräften (insbesondere freien Honorarkräften) steht es vollkommen frei, Stundenpläne und Terminverschiebungen digital über Campus-Groovelab zu disponieren oder auf herkömmlichem Weg (per E-Mail, Telefon oder Zettel) an die Schulverwaltung zu übermitteln. Die Plattform übt keine Weisungs- oder Kontrollfunktion aus, führt keine automatisierte Leistungs- oder Verhaltenskontrolle (§ 87 BetrVG / BPersVG) durch und wahrt das Recht auf Nichterreichbarkeit (§ 5 ArbSchG).',
    staffCouncilNonSurveillance: 'Ausschluss von Leistungs- und Verhaltenskontrolle (§ 87 Abs. 1 Nr. 6 BetrVG / LPVG): Die Plattform erfasst, vergleicht und aggregiert keine Daten zur Überwachung des Verhaltens oder der Arbeitsleistung von Lehrkräften. Schulleitungen und Administratoren haben keinen Zugriff auf individuelle Frequenz- oder Leistungsauswertungen.',
    b2bMediationAndArbitration: 'Vorgerichtliche Streitbeilegung & Schlichtung (B2B): Bei Streitigkeiten aus oder im Zusammenhang mit diesem Vertrag verpflichten sich die Parteien, vor Beschreitung des ordentlichen Rechtswegs ein strukturiertes Schlichtungsverfahren nach der Schlichtungsordnung der zuständigen Industrie- und Handelskammer (IHK) durchzuführen.',
    privateByDefaultLeaderboards: 'Schutz vor Bloßstellung & Peer-Druck (Private by Default): Übe-Fortschritte, Streaks und XP verbleiben standardmäßig strikt privat beim einzelnen Schüler. Klassen- oder schulweite Vergleiche sind standardmäßig deaktiviert und erfordern die bewusste Freigabe durch die Erziehungsberechtigten.',
    pureMetadataDoctrine: 'Reine Metadaten-Architektur & Schüler-Übungsaufnahmen (§ 53 Abs. 1, § 60a UrhG DE / § 42f UrhG AT / Art. 19 URG CH / Art. 6 & 16 DSA): Die Plattform speichert und hostet keine geschützten Noten-PDFs oder kommerziellen Notensätze, sondern verarbeitet ausschließlich freie bibliografische Metadaten sowie lizenzierte Links zu externen Medien- (Spotify, YouTube) und autorisierten Notenpartnern (Tomplay). Im Rahmen des Unterrichts gehostete Schüler-Übungsaufnahmen (z. B. Cover-Versionen geübter Stücke) dienen ausschließlich der individuellen didaktischen Rückmeldung und dem Teilen im geschlossenen privaten Kreis der Familie (§ 53 Abs. 1 UrhG). Keine öffentliche Wiedergabe und keine eigene Vergütungspflicht gegenüber GEMA, AKM oder SUISA.',
    b2bLiabilityCap: 'B2B-Haftungshöchstgrenze (Liability Cap): Die Haftung des Betreibers für einfache Fahrlässigkeit bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten) ist je Kalenderjahr auf die Summe der in den vorangegangenen 12 Monaten vom Kunden tatsächlich an den Betreiber gezahlten Netto-Vergütung (maximal 10.000,00 € bzw. CHF 10.000,00) begrenzt. Die verschuldensunabhängige Garantiehaftung für anfängliche Mängel (§ 536a Abs. 1 Alt. 1 BGB / § 1096 ABGB / Art. 259a OR) ist vollumfänglich ausgeschlossen.',
    limitationPeriod12Months: '12-monatige Verjährungsverkürzung (B2B): Vertragliche Gewährleistungs- und Schadensersatzansprüche des Kunden verjähren nach 12 Monaten ab gesetzlichem Verjährungsbeginn. Ausgenommen hiervon sind Ansprüche wegen Vorsatz, grober Fahrlässigkeit oder Verletzung von Leben, Körper oder Gesundheit.',
    dataBackupMitverschulden: 'Mitverschuldensklausel & Datenwiederherstellung (§ 254 BGB): Für den Verlust von Daten haftet der Betreiber der Höhe nach nur insoweit, als der Schaden auch bei ordnungsgemäßer und täglicher Datensicherung durch den Kunden bzw. das integrierte Schulausweis- und Noten-Exportmodul eingetreten wäre (beschränkt auf den typischen Wiederherstellungsaufwand).',
    userContentIndemnity: 'Urheberrechts-Freistellungsanspruch (Hold-Harmless für Nutzer-Inhalte): Die Musikschule trägt die alleinige rechtliche Verantwortung für alle von ihren Lehrkräften, Mitarbeitern oder Schülern hochgeladenen, verlinkten oder geteilten Noten, Notizen, Audio-Aufnahmen oder Kommunikationsinhalte und stellt den Betreiber von allen Ansprüchen Dritter (insbesondere von Urhebern, Verlagen und Verwertungsgesellschaften wie GEMA, AKM, SUISA) sowie anfallenden Rechtsverteidigungskosten auf erstes Anfordern frei.',
    pedagogicalNonSuccessDisclaimer: 'Pädagogischer Enthaftungsschild (Keine Erfolgsgarantie): Der Betreiber stellt rein technische Hilfsmittel und didaktische Werkzeuge (Übe-Timer, Loopstation, Gamification, Notenständer-Modus) bereit. Die didaktische Unterrichtsgestaltung, der persönliche Lernerfolg, Noten, Prüfungsergebnisse und die tatsächliche Beherrschung von Instrumenten verbleiben in der ausschließlichen pädagogischen Verantwortung von Musikschule, Lehrkraft und Schüler.',
    avvInternalIndemnity: 'AVV-Freistellung im Innenverhältnis (Art. 82 DSGVO / Art. 54 nDSG): Der Auftraggeber (Musikschule) stellt den Auftragnehmer im Innenverhältnis von sämtlichen Ansprüchen Dritter (insbesondere von Betroffenen, Schülern oder Eltern) sowie von behördlichen Bußgeldern und Rechtsverteidigungskosten frei, die daraus resultieren, dass der Auftraggeber Daten ohne ausreichende Rechtsgrundlage verarbeitet, unzulässige Weisungen erteilt oder elterliche Einwilligungen (Art. 8 DSGVO) nicht ordnungsgemäß eingeholt hat.',
    botenmodellDoctrine: 'Technischer Botenstatus & Subordination unter den Musikschulvertrag: Soweit über die Plattform (insbesondere Terminkalender, Termingekoppelte Shoutbox oder Direktnachrichten) Unterrichtstermine abgesagt, verschoben oder Raumwünsche geäußert werden, agiert die Plattform rein als technischer Übermittlungsbote im Auftrag des jeweiligen Nutzers. Sämtliche vertraglichen Rechte und Pflichten (Honorarpflicht, Nachholansprüche, Entschuldigungsfristen) richten sich ausschließlich nach dem Hauptunterrichtsvertrag zwischen Erziehungsberechtigten bzw. Schülern und der Musikschule. Formelle Kündigungen des Musikschulvertrags können über die Plattform nicht erklärt werden.',
    roomReservationUnderReserve: 'Raumbuchungen unter Vorbehalt & ERP-Subordination: Raumbuchungsanfragen und Belegungswünsche im Raumplaner stellen unverbindliche Voranfragen unter dem ausdrücklichen Vorbehalt der verwaltungsseitigen Freigabe dar. Die Plattform ersetzt kein behördliches Raum- oder ERP-System. Die endgültige Raumzuteilung und rechtsverbindliche Buchung obliegt dem Schulsekretariat durch Einpflege in das amtliche Verwaltungssystem der Musikschule.',
    art9GdprExclusion: 'Ausschluss besonderer Kategorien personenbezogener Daten (Art. 9 DSGVO / Art. 5 lit. c nDSG): Die Erfassung, Speicherung oder Übermittlung von sensiblen Gesundheitsdaten, Attesten oder konkreten medizinischen Diagnosen ist plattformweit untersagt. Mitteilungen über Unterrichtsverhinderungen beschränken sich auf die allgemeine Angabe (z. B. „verhindert“ / „abwesend“) ohne medizinische Detailangaben.'
  },

  // 5. Tier-1 Enterprise+ Sicherheits- & Kryptographie-Standards (Banking Goldstandard)
  securityStandards: {
    bffArchitecture: 'Backend-for-Frontend (BFF) Gateway-Architektur mit strikter Trennung von Client und internen Datenbank-Tokens (Zero-Token-Leakage in LocalStorage / SessionStorage).',
    jweSessionEncryption: 'Vollverschlüsselte JWE-Sessions mit AES-256-GCM (A256GCM) und strikten __Host-session Cookies (HttpOnly, Secure, SameSite=Strict, Path=/).',
    proactiveSilentRefresh: 'Proaktive Token-Rotation (Silent Refresh) mit 60s-Schwellenwert für unterbrechungsfreie, sichere Unterrichtssitzungen ohne Client-Zutun.',
    antiCsrfOriginGuard: 'Fail-Closed Anti-CSRF & Origin-Guard mit browser-nativem Sec-Fetch-Site Filtering, Referer-Fallback und Host-Header-Poisoning-Schutz.',
    clientVaultEncryption: 'Hardware-gebundene AES-256-GCM Verschlüsselung für alle lokalen Gerätedaten & PIN-Caches (Web Crypto API).',
    zeroKnowledgeHashing: 'OWASP- & BSI-konformes PBKDF2 Zero-Knowledge Hashing mit 100.000 Runden (SHA-512 / SHA-256) & kryptografischem Salz.',
    registrationGate: 'Kryptografisch geschützter Schulanmeldungszugang mit PBKDF2-HMAC-SHA-512 (100.000 Runden) und progressivem 3-Strike Rate-Limiting.',
    sessionLeasing: 'Zero-Trust Session-Leasing mit hardware-gebundenem Fingerprinting und 1-Click Remote-Logout.',
    immutableAuditLedger: 'Revisionssicheres, manipulationsgeschütztes Audit-Ledger mit kryptografischer SHA-512 / SHA-256 Merkle-Chain (GoBD & DSGVO konform).',
    fido2HardwareProtection: 'FIDO2 / WebAuthn Hardware Passkeys mit kryptografischem Signatur-Zähler zum Schutz vor Klon-Angriffen.',
    dataMinimization: 'Kompromisslose DSGVO-Datenminimierung: Keine Speicherung von SEPA-, Bank- oder Kreditkartendaten, keine E-Mail-Adressen Minderjähriger, automatische Nachnamensmaskierung.',
    voiceBiometricsExclusion: 'Reines didaktisches Audio-Streaming ohne biometrische Stimm-, Sprecher- oder Verhaltensmusteranalysen (Art. 9 DSGVO / Art. 6 nDSG).',
    hostingInfrastructure: 'Ausschließliches Hosting in ISO 27001-zertifizierten deutschen Rechenzentren (Hetzner Online GmbH, Falkenstein/Vogtland & Nürnberg, Deutschland) mit stündlichen verschlüsselten Backups. 100% frei von US-Cloudservern, vollständige Immunität gegen US CLOUD Act und FISA 702 (Schrems II konform).',
    indexedDbAudioVault: 'Lokaler IndexedDB Audio-Tresor (groovelab_audio_vault) für 0ms Offline-Playback und bandbreitenfreie Proberaumnutzung.'
  },

  // 6. DIN 66398 Löschkonzept & 2-Stufen-Statusarchitektur
  din66398Retention: {
    title: 'Kommunales Löschkonzept nach DIN 66398 & Art. 17 DSGVO',
    stage1Active: 'Aktiv (0,49 € / Mo.): Vollständiges Schüler-Dashboard, Fokus-Timer, Meisterwerk-Protokoll, Audio-Loopstation & Schulkommunikation.',
    stage2Passive: 'Passiv / Basis-Bereitstellung (0,09 € / Mo.): Minimaler Zugriff auf Stundenplan, Raumzuweisung und QR-Landingpage. Identität & Daten bleiben 100% erhalten.',
    fairPlayInactivityRule: 'Bei mehr als 60 Tagen Inaktivität ohne Login wird das Profil fair-play-konform auf Basis-Bereitstellung (0,09 €) umgestellt (automatischer Kostenschutz für Musikschulen).',
    educationalPortfolioRule: 'Didaktische Bildungsbiografie & Meisterwerk-Dokumentation (reine Metadaten gem. Art. 6 Abs. 1 lit. b DSGVO) bleiben über Schuljahre hinweg (mehrjährig) kumulativ erhalten. Physische Datenlöschung erfolgt erst 30 Tage nach formeller Exmatrikulation.',
    audioSchoolYearRetention: 'Didaktische Audio-Aufnahmen (Hausaufgaben, Übe-Studio & Loopstation) dienen der Dokumentation des individuellen Lernfortschritts über das Ausbildungsjahr (pädagogisches Jahres-Portfolio). Sie verbleiben bis zum Ende des jeweiligen Schuljahres (30. September inklusive Karenzzeit) im geschützten deutschen Cloud-Speicher. Eltern und Lehrkräfte besitzen jederzeitige 1-Klick-Selbstlöschautonomie.'
  }
} as const;
