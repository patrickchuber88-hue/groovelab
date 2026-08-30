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
    staffServiceFee: 'Service- & Administrationspauschale: 0,49 € / Mo. (DE/AT) bzw. CHF 0.80 / Mo. (CH) je aktive Lehrkraft (Verwaltung & Schulleitung 0,00 € / CHF 0.00 inklusive)',
    studentBaseFee: 'Basis-Bereitstellung: 0,09 € / Mo. (DE/AT) bzw. CHF 0.20 / Mo. (CH) je Schüler (QR-Landingpage, Stundenplan & DSGVO/nDSG-Hosting)',
    studentCampusFee: 'Cloud- & Modul-Bereitstellung Campus: 0,49 € / Mo. (DE/AT) bzw. CHF 1.00 / Mo. (CH) je aktiver Schüler',
    studentGroovelabFee: 'Cloud- & Modul-Bereitstellung GrooveLab: 0,49 € / Mo. (DE/AT) bzw. CHF 1.00 / Mo. (CH) je aktiver Schüler (immer 100% von der Schule übernommen)',
    directBillingAnnualOnly: 'Schüler-Direktabrechnungen mit Eltern/Schülern erfolgen ausnahmslos als einmaliger Jahresbeitrag (5,88 € in DE/AT bzw. CHF 12.00 in CH pro Schuljahr) – niemals als monatliche Einzelbuchung.'
  },

  // 4. Rechtshinweise & AGB
  legalDisclaimers: {
    onboardingConsent: 'Mit Klick auf „Kostenfrei freischalten“ akzeptieren Sie unsere AGB für Bildungseinrichtungen sowie die Vereinbarung zur Auftragsverarbeitung (AVV nach Art. 28 DSGVO / Art. 9 nDSG).',
    b2bContractNature: 'Software-as-a-Service (SaaS)-Mietvertrag gemäß § 535 ff. BGB / Art. 253 ff. OR über schlüsselfertige Cloud-Infrastruktur.',
    kleinunternehmerUStG19: 'In DE/AT gemäß § 19 UStG umsatzsteuerbefreit (Kleinunternehmerregelung). In der Schweiz gilt Leistungsort Schweiz (nicht im Inland steuerbar gem. Art. 8 Abs. 1 MWSTG).'
  },

  // 5. Tier-1 Enterprise+ Sicherheits- & Kryptographie-Standards
  securityStandards: {
    clientVaultEncryption: 'Hardware-gebundene AES-256-GCM Verschlüsselung für alle lokalen Gerätedaten & PIN-Caches (Web Crypto API).',
    zeroKnowledgeHashing: 'OWASP- & BSI-konformes PBKDF2 Zero-Knowledge Hashing mit 100.000 Runden (SHA-512 / SHA-256) & kryptografischem Salz.',
    registrationGate: 'Kryptografisch geschützter Schulanmeldungszugang mit PBKDF2-HMAC-SHA-512 (100.000 Runden) und progressivem 3-Strike Rate-Limiting.',
    sessionLeasing: 'Zero-Trust Session-Leasing mit hardware-gebundenem Fingerprinting und 1-Click Remote-Logout.',
    immutableAuditLedger: 'Revisionssicheres, manipulationsgeschütztes Audit-Ledger mit kryptografischer SHA-512 / SHA-256 Merkle-Chain (GoBD & DSGVO konform).',
    fido2HardwareProtection: 'FIDO2 / WebAuthn Hardware Passkeys mit kryptografischem Signatur-Zähler zum Schutz vor Klon-Angriffen.',
    dataMinimization: '100% DSGVO-konforme Datenminimierung: Keine Speicherung von SEPA-, Bank- oder Kreditkartendaten, keine E-Mail-Adressen Minderjähriger, automatische Nachnamensmaskierung.',
    hostingInfrastructure: '100% Hosting in ISO 27001-zertifizierten deutschen Rechenzentren (Hetzner Falkenstein & Supabase Frankfurt).'
  }
} as const;
