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
      priceText: '14,90 € / Mo.',
      description: 'Stundenplan, Hausaufgabenheft, Schüler-Protokoll & Raum-Engine'
    },
    groovelab: {
      name: 'Modul GrooveLab',
      canonicalLineItem: 'Cloud- & Datenbank-Hosting: Modul GrooveLab',
      priceText: '9,90 € / Mo.',
      description: 'Bands, Songs, Repertoire, Live Lab & Skill-Radar'
    },
    bundle: {
      name: 'Kombi-Vorteil Bündel',
      canonicalLineItem: 'Kombi-Vorteilsrabatt (Infrastruktur-Bündel)',
      savingsText: '-4,90 € / Mo.',
      bundlePriceText: '19,90 € / Mo.',
      description: 'Campus & GrooveLab gemeinsam gebucht (Sie sparen 4,90 € / Mo.)'
    },
    modularityClaim: 'Campus und GrooveLab sind modular und unabhängig voneinander nach individuellem Bedarf buchbar.'
  },

  // 3. Service- & Betreuungsgebühren
  fees: {
    staffServiceFee: 'Service- & Administrationspauschale: 0,49 € / Mo. je aktive Lehrkraft (Verwaltung & Schulleitung 0,00 € inklusive)',
    studentBaseFee: 'Basis-Bereitstellung: 0,09 € / Mo. je Schüler (QR-Landingpage, Stundenplan & DSGVO-Hosting)',
    studentCampusFee: 'Cloud- & Modul-Bereitstellung Campus: 0,49 € / Mo. je aktiver Schüler',
    studentGroovelabFee: 'Cloud- & Modul-Bereitstellung GrooveLab: 0,49 € / Mo. je aktiver Schüler (immer 100% von der Schule übernommen)'
  },

  // 4. Rechtshinweise & AGB
  legalDisclaimers: {
    onboardingConsent: 'Mit Klick auf „Kostenfrei freischalten“ akzeptieren Sie unsere AGB für Bildungseinrichtungen sowie die Vereinbarung zur Auftragsverarbeitung (AVV nach Art. 28 DSGVO).',
    b2bContractNature: 'Software-as-a-Service (SaaS)-Mietvertrag gemäß § 535 ff. BGB über schlüsselfertige Cloud-Infrastruktur.',
    kleinunternehmerUStG19: 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).'
  }
} as const;
