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
    directBillingAnnualOnly: 'Schüler-Direktabrechnungen mit Eltern/Schülern erfolgen ausnahmslos als einmaliger Jahresbeitrag (5,88 € in DE/AT bzw. CHF 12.00 in CH pro Schuljahr) – niemals als monatliche Einzelbuchung.'
  },

  // 4. Rechtshinweise & AGB
  legalDisclaimers: {
    onboardingConsent: 'Mit Klick auf „Kostenfrei freischalten“ akzeptieren Sie unsere AGB für Bildungseinrichtungen sowie die Vereinbarung zur Auftragsverarbeitung (AVV nach Art. 28 DSGVO / Art. 9 nDSG).',
    b2bContractNature: 'Software-as-a-Service (SaaS)-Mietvertrag gemäß § 535 ff. BGB (DE) / §§ 1090 ff. ABGB (AT) / Art. 253 ff. OR (CH) über schlüsselfertige Cloud-Infrastruktur.',
    pedagogicalAddonDisclaimer: 'Campus-Groovelab ist ein didaktisches Zusatzwerkzeug zur Unterstützung des Fachunterrichts und häuslichen Übens. Die Plattform ersetzt kein amtliches Schulverwaltungssystem.',
    emergencyFallbackDisclaimer: 'Bei technischen Störungen oder Ausfällen läuft der Schulbetrieb uneingeschränkt über herkömmliche Wege (Telefon, E-Mail) weiter (Ausschluss von Unterrichtsausfall-Haftung).',
    kleinunternehmerUStG19: 'In DE gemäß § 19 UStG bzw. in AT gemäß § 6 Abs. 1 Z 27 UStG 1994 umsatzsteuerbefreit (Kleinunternehmerregelung). In der Schweiz gilt Leistungsort Schweiz (nicht im Inland steuerbar gem. Art. 8 Abs. 1 MWSTG).',
    screenlessPractice: 'Didaktisches Prinzip des bildschirmfreien Übens (Screenless Practice): Im Modus „Von Eltern geführt“ verbleibt das Endgerät bei den Erziehungsberechtigten. Übezeiten am akustischen Instrument werden per 1-Klick-Quittierung verbucht, um Kinder (insbesondere 6–9 Jahre) vor verfrühter Bildschirmzeit zu schützen (einheitliche elterliche Freigabe bis 16 Jahre in DE, AT und CH).',
    herrenbergCompliance: 'Autonomie von Honorarlehrkräften (BSG B 12 R 3/20 R): Stundenplan- und Raumfunktionen stellen unverbindliche Dispositionsvorschläge dar. Die Plattform übt keine Weisungs- oder Kontrollfunktion aus, führt keine automatisierte Leistungs- oder Verhaltenskontrolle (§ 87 BetrVG / BPersVG) durch und wahrt das Recht auf Nichterreichbarkeit (§ 5 ArbSchG).',
    pureMetadataDoctrine: 'Reine Metadaten-Architektur, Verwertungsgesellschaften-Klarstellung & Notice-and-Takedown (§ 60a UrhG DE / § 42f UrhG AT / Art. 19 URG CH / Art. 6 & 16 DSA): Die Plattform speichert und hostet keine geschützten Noten-PDFs oder Notensätze, sondern verarbeitet ausschließlich freie bibliografische Metadaten sowie lizenzierte Links zu externen Medien- (Spotify, YouTube) und autorisierten Notenpartnern (Tomplay). Keine eigene Vergütungspflicht gegenüber GEMA, AKM oder SUISA.'
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
    hostingInfrastructure: 'Ausschließliches Hosting in ISO 27001-zertifizierten deutschen Rechenzentren (Hetzner Online GmbH, Falkenstein/Vogtland & Nürnberg, Deutschland) mit stündlichen verschlüsselten Backups.',
    indexedDbAudioVault: 'Lokaler IndexedDB Audio-Tresor (groovelab_audio_vault) für 0ms Offline-Playback und bandbreitenfreie Proberaumnutzung.'
  },

  // 6. DIN 66398 Löschkonzept & 2-Stufen-Statusarchitektur
  din66398Retention: {
    title: 'Kommunales Löschkonzept nach DIN 66398 & Art. 17 DSGVO',
    stage1Active: 'Aktiv (0,49 € / Mo.): Vollständiges Schüler-Dashboard, Fokus-Timer, Meisterwerk-Protokoll, Audio-Loopstation & Schulkommunikation.',
    stage2Passive: 'Passiv / Basis-Bereitstellung (0,09 € / Mo.): Minimaler Zugriff auf Stundenplan, Raumzuweisung und QR-Landingpage. Identität & Daten bleiben 100% erhalten.',
    fairPlayInactivityRule: 'Bei mehr als 60 Tagen Inaktivität ohne Login wird das Profil fair-play-konform auf Basis-Bereitstellung (0,09 €) umgestellt (automatischer Kostenschutz für Musikschulen).',
    educationalPortfolioRule: 'Didaktische Bildungsbiografie & Meisterwerk-Dokumentation (reine Metadaten gem. Art. 6 Abs. 1 lit. b DSGVO) bleiben über Schuljahre hinweg (mehrjährig) kumulativ erhalten. Physische Datenlöschung erfolgt erst 30 Tage nach formeller Exmatrikulation.',
    audioSchoolYearRetention: 'Didaktische Audio-Aufnahmen (Hausaufgaben & Loopstation) bleiben das gesamte Schuljahr (bis 31.08.) erhalten und können vor dem jährlichen Speicher-Janitor als MP3/ZIP exportiert werden.'
  }
} as const;
