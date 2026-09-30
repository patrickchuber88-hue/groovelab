/**
 * 🏛️ Campus-Groovelab Canonical DACH Jurisdiction Registry
 * Standard: 16 Deutsche Bundesländer + Schweiz + Österreich
 * Autor: 0,1% Senior IT-Volljurist & Lead Security Systems Architect
 * 
 * Bietet die Single Source of Truth für landesspezifische Schulgesetze,
 * zuständige Datenschutzaufsichtsbehörden und Währungsrundungen.
 */

export type JurisdictionCode =
  | 'DE_BW'
  | 'DE_BY_PUBLIC'
  | 'DE_BY_PRIVATE'
  | 'DE_BE'
  | 'DE_BB'
  | 'DE_HB'
  | 'DE_HH'
  | 'DE_HE'
  | 'DE_MV'
  | 'DE_NI'
  | 'DE_NW'
  | 'DE_RP'
  | 'DE_SL'
  | 'DE_SN'
  | 'DE_ST'
  | 'DE_SH'
  | 'DE_TH'
  | 'CH_DEFAULT'
  | 'AT_DEFAULT';

export interface JurisdictionProfile {
  code: JurisdictionCode;
  country: 'DE' | 'CH' | 'AT';
  regionName: string;
  currency: 'EUR' | 'CHF';
  dpoAuthorityName: string;
  dpoAuthorityCity: string;
  dpoAuthorityUrl: string;
  statutorySchoolLawRef: string;
  staffCouncilLawRef: string;
  legalSystem: 'GDPR_BDSG' | 'SWISS_REVDSG' | 'AUSTRIAN_DSG';
  feeRegimeDefault: 'PUBLIC_LAW_KAG' | 'PRIVATE_LAW_BGB';
  currencyRoundingStep: 0.01 | 0.05;
}

export const JURISDICTION_REGISTRY: Record<JurisdictionCode, JurisdictionProfile> = {
  DE_BW: {
    code: 'DE_BW',
    country: 'DE',
    regionName: 'Baden-Württemberg',
    currency: 'EUR',
    dpoAuthorityName: 'Der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg (LfDI BW)',
    dpoAuthorityCity: 'Stuttgart',
    dpoAuthorityUrl: 'https://www.baden-wuerttemberg.datenschutz.de',
    statutorySchoolLawRef: '§ 83a SchulG BW i. V. m. VOGDS (Kultusministerium)',
    staffCouncilLawRef: '§ 79 Abs. 1 Nr. 5 LPVG BW',
    legalSystem: 'GDPR_BDSG',
    feeRegimeDefault: 'PUBLIC_LAW_KAG',
    currencyRoundingStep: 0.01
  },
  DE_BY_PUBLIC: {
    code: 'DE_BY_PUBLIC',
    country: 'DE',
    regionName: 'Bayern (Kommunal / Öffentlich)',
    currency: 'EUR',
    dpoAuthorityName: 'Der Bayerische Landesbeauftragte für den Datenschutz (BayLfD)',
    dpoAuthorityCity: 'München',
    dpoAuthorityUrl: 'https://www.datenschutz-bayern.de',
    statutorySchoolLawRef: 'Art. 85 BayEUG i. V. m. BayDSG',
    staffCouncilLawRef: 'Art. 75a Abs. 1 Nr. 1 BayPVG',
    legalSystem: 'GDPR_BDSG',
    feeRegimeDefault: 'PUBLIC_LAW_KAG',
    currencyRoundingStep: 0.01
  },
  DE_BY_PRIVATE: {
    code: 'DE_BY_PRIVATE',
    country: 'DE',
    regionName: 'Bayern (Privat / e.V. / gGmbH)',
    currency: 'EUR',
    dpoAuthorityName: 'Bayerisches Landesamt für Datenschutzaufsicht (BayLDA)',
    dpoAuthorityCity: 'Ansbach',
    dpoAuthorityUrl: 'https://www.lda.bayern.de',
    statutorySchoolLawRef: 'BDSG & BGB Dienstvertragsrecht',
    staffCouncilLawRef: '§ 87 Abs. 1 Nr. 6 BetrVG',
    legalSystem: 'GDPR_BDSG',
    feeRegimeDefault: 'PRIVATE_LAW_BGB',
    currencyRoundingStep: 0.01
  },
  DE_BE: {
    code: 'DE_BE',
    country: 'DE',
    regionName: 'Berlin',
    currency: 'EUR',
    dpoAuthorityName: 'Berliner Beauftragte für Datenschutz und Informationsfreiheit',
    dpoAuthorityCity: 'Berlin',
    dpoAuthorityUrl: 'https://www.datenschutz-berlin.de',
    statutorySchoolLawRef: '§ 64 SchulG Berlin i. V. m. BlnDSG',
    staffCouncilLawRef: '§ 85 Abs. 1 Nr. 10 PersVG Berlin',
    legalSystem: 'GDPR_BDSG',
    feeRegimeDefault: 'PUBLIC_LAW_KAG',
    currencyRoundingStep: 0.01
  },
  DE_BB: {
    code: 'DE_BB',
    country: 'DE',
    regionName: 'Brandenburg',
    currency: 'EUR',
    dpoAuthorityName: 'Die Landesbeauftragte für den Datenschutz und für das Recht auf Akteneinsicht Brandenburg (LDA)',
    dpoAuthorityCity: 'Kleinmachnow',
    dpoAuthorityUrl: 'https://www.lda.brandenburg.de',
    statutorySchoolLawRef: '§ 63 BbgSchulG i. V. m. BbgDSG',
    staffCouncilLawRef: '§ 71 Abs. 2 Nr. 4 PersVG Bbg',
    legalSystem: 'GDPR_BDSG',
    feeRegimeDefault: 'PUBLIC_LAW_KAG',
    currencyRoundingStep: 0.01
  },
  DE_HB: {
    code: 'DE_HB',
    country: 'DE',
    regionName: 'Bremen',
    currency: 'EUR',
    dpoAuthorityName: 'Die Landesbeauftragte für Datenschutz und Informationsfreiheit Bremen',
    dpoAuthorityCity: 'Bremen',
    dpoAuthorityUrl: 'https://www.datenschutz.bremen.de',
    statutorySchoolLawRef: '§ 35 BremSchulG i. V. m. BremDSGVOAG',
    staffCouncilLawRef: '§ 62 Abs. 1 Nr. 5 BremPersVG',
    legalSystem: 'GDPR_BDSG',
    feeRegimeDefault: 'PUBLIC_LAW_KAG',
    currencyRoundingStep: 0.01
  },
  DE_HH: {
    code: 'DE_HH',
    country: 'DE',
    regionName: 'Hamburg',
    currency: 'EUR',
    dpoAuthorityName: 'Der Hamburgische Beauftragte für Datenschutz und Informationsfreiheit (HmbBfDI)',
    dpoAuthorityCity: 'Hamburg',
    dpoAuthorityUrl: 'https://www.datenschutz-hamburg.de',
    statutorySchoolLawRef: '§ 98 HmbSG i. V. m. HmbDSG',
    staffCouncilLawRef: '§ 86 Abs. 1 Nr. 9 HmbPersVG',
    legalSystem: 'GDPR_BDSG',
    feeRegimeDefault: 'PUBLIC_LAW_KAG',
    currencyRoundingStep: 0.01
  },
  DE_HE: {
    code: 'DE_HE',
    country: 'DE',
    regionName: 'Hessen',
    currency: 'EUR',
    dpoAuthorityName: 'Der Hessische Beauftragte für Datenschutz und Informationsfreiheit (HBDI)',
    dpoAuthorityCity: 'Wiesbaden',
    dpoAuthorityUrl: 'https://datenschutz.hessen.de',
    statutorySchoolLawRef: '§ 83 Hessisches Schulgesetz (HSG) i. V. m. HDSIG',
    staffCouncilLawRef: '§ 74 Abs. 1 Nr. 16 HPVG',
    legalSystem: 'GDPR_BDSG',
    feeRegimeDefault: 'PUBLIC_LAW_KAG',
    currencyRoundingStep: 0.01
  },
  DE_MV: {
    code: 'DE_MV',
    country: 'DE',
    regionName: 'Mecklenburg-Vorpommern',
    currency: 'EUR',
    dpoAuthorityName: 'Der Landesbeauftragte für Datenschutz und Informationsfreiheit Mecklenburg-Vorpommern',
    dpoAuthorityCity: 'Schwerin',
    dpoAuthorityUrl: 'https://www.datenschutz-mv.de',
    statutorySchoolLawRef: '§ 69 SchulG M-V i. V. m. DSG M-V',
    staffCouncilLawRef: '§ 68 Abs. 2 Nr. 3 PersVG M-V',
    legalSystem: 'GDPR_BDSG',
    feeRegimeDefault: 'PUBLIC_LAW_KAG',
    currencyRoundingStep: 0.01
  },
  DE_NI: {
    code: 'DE_NI',
    country: 'DE',
    regionName: 'Niedersachsen',
    currency: 'EUR',
    dpoAuthorityName: 'Die Landesbeauftragte für den Datenschutz Niedersachsen (LfD)',
    dpoAuthorityCity: 'Hannover',
    dpoAuthorityUrl: 'https://www.lfd.niedersachsen.de',
    statutorySchoolLawRef: '§ 31 NSchG i. V. m. NDSG',
    staffCouncilLawRef: '§ 67 Abs. 1 Nr. 4 NPersVG',
    legalSystem: 'GDPR_BDSG',
    feeRegimeDefault: 'PUBLIC_LAW_KAG',
    currencyRoundingStep: 0.01
  },
  DE_NW: {
    code: 'DE_NW',
    country: 'DE',
    regionName: 'Nordrhein-Westfalen',
    currency: 'EUR',
    dpoAuthorityName: 'Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen (LDI NRW)',
    dpoAuthorityCity: 'Düsseldorf',
    dpoAuthorityUrl: 'https://www.ldi.nrw.de',
    statutorySchoolLawRef: '§§ 120–122 SchulG NRW i. V. m. VO-DV I / VO-DV II',
    staffCouncilLawRef: '§ 72 Abs. 3 Nr. 4 LPVG NRW',
    legalSystem: 'GDPR_BDSG',
    feeRegimeDefault: 'PUBLIC_LAW_KAG',
    currencyRoundingStep: 0.01
  },
  DE_RP: {
    code: 'DE_RP',
    country: 'DE',
    regionName: 'Rheinland-Pfalz',
    currency: 'EUR',
    dpoAuthorityName: 'Der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Rheinland-Pfalz (LfDI RLP)',
    dpoAuthorityCity: 'Mainz',
    dpoAuthorityUrl: 'https://www.datenschutz.rlp.de',
    statutorySchoolLawRef: '§ 67 SchulG RLP i. V. m. LDSG RLP',
    staffCouncilLawRef: '§ 80 Abs. 2 Nr. 3 LPersVG RLP',
    legalSystem: 'GDPR_BDSG',
    feeRegimeDefault: 'PUBLIC_LAW_KAG',
    currencyRoundingStep: 0.01
  },
  DE_SL: {
    code: 'DE_SL',
    country: 'DE',
    regionName: 'Saarland',
    currency: 'EUR',
    dpoAuthorityName: 'Unabhängiges Datenschutzzentrum Saarland (UDZ)',
    dpoAuthorityCity: 'Saarbrücken',
    dpoAuthorityUrl: 'https://www.datenschutz.saarland.de',
    statutorySchoolLawRef: '§ 28 SchoG Saarland i. V. m. SDSG',
    staffCouncilLawRef: '§ 79 Abs. 1 Nr. 4 SPersVG',
    legalSystem: 'GDPR_BDSG',
    feeRegimeDefault: 'PUBLIC_LAW_KAG',
    currencyRoundingStep: 0.01
  },
  DE_SN: {
    code: 'DE_SN',
    country: 'DE',
    regionName: 'Sachsen',
    currency: 'EUR',
    dpoAuthorityName: 'Die Sächsische Datenschutzbeauftragte',
    dpoAuthorityCity: 'Dresden',
    dpoAuthorityUrl: 'https://www.saechsdsb.de',
    statutorySchoolLawRef: '§ 59 SächsSchulG i. V. m. SächsDSDG',
    staffCouncilLawRef: '§ 80 Abs. 2 Nr. 4 SächsPersVG',
    legalSystem: 'GDPR_BDSG',
    feeRegimeDefault: 'PUBLIC_LAW_KAG',
    currencyRoundingStep: 0.01
  },
  DE_ST: {
    code: 'DE_ST',
    country: 'DE',
    regionName: 'Sachsen-Anhalt',
    currency: 'EUR',
    dpoAuthorityName: 'Landesbeauftragter für den Datenschutz Sachsen-Anhalt',
    dpoAuthorityCity: 'Magdeburg',
    dpoAuthorityUrl: 'https://datenschutz.sachsen-anhalt.de',
    statutorySchoolLawRef: '§ 16 SchulG LSA i. V. m. DSG LSA',
    staffCouncilLawRef: '§ 67 Abs. 2 Nr. 4 PersVG LSA',
    legalSystem: 'GDPR_BDSG',
    feeRegimeDefault: 'PUBLIC_LAW_KAG',
    currencyRoundingStep: 0.01
  },
  DE_SH: {
    code: 'DE_SH',
    country: 'DE',
    regionName: 'Schleswig-Holstein',
    currency: 'EUR',
    dpoAuthorityName: 'Unabhängiges Landeszentrum für Datenschutz Schleswig-Holstein (ULD)',
    dpoAuthorityCity: 'Kiel',
    dpoAuthorityUrl: 'https://www.datenschutzzentrum.de',
    statutorySchoolLawRef: '§ 30 SchulG SH i. V. m. LDSG SH',
    staffCouncilLawRef: '§ 51 Abs. 1 Nr. 5 MBG Schl.-H.',
    legalSystem: 'GDPR_BDSG',
    feeRegimeDefault: 'PUBLIC_LAW_KAG',
    currencyRoundingStep: 0.01
  },
  DE_TH: {
    code: 'DE_TH',
    country: 'DE',
    regionName: 'Thüringen',
    currency: 'EUR',
    dpoAuthorityName: 'Thüringer Landesbeauftragter für den Datenschutz und die Informationsfreiheit (TLfDI)',
    dpoAuthorityCity: 'Erfurt',
    dpoAuthorityUrl: 'https://www.tlfdi.de',
    statutorySchoolLawRef: '§ 53 ThürSchulG i. V. m. ThürDSG',
    staffCouncilLawRef: '§ 69 Abs. 2 Nr. 4 ThürPersVG',
    legalSystem: 'GDPR_BDSG',
    feeRegimeDefault: 'PUBLIC_LAW_KAG',
    currencyRoundingStep: 0.01
  },
  CH_DEFAULT: {
    code: 'CH_DEFAULT',
    country: 'CH',
    regionName: 'Schweiz (Eidgenossenschaft)',
    currency: 'CHF',
    dpoAuthorityName: 'Eidgenössischer Datenschutz- und Öffentlichkeitsbeauftragter (EDÖB)',
    dpoAuthorityCity: 'Bern',
    dpoAuthorityUrl: 'https://www.edoeb.admin.ch',
    statutorySchoolLawRef: 'Bundesgesetz über den Datenschutz (revDSG, SR 235.1) & Art. 21 MWSTG',
    staffCouncilLawRef: 'Art. 26 ff. Mitwirkungsgesetz (MwG, SR 822.14) & kant. Personalgesetze',
    legalSystem: 'SWISS_REVDSG',
    feeRegimeDefault: 'PRIVATE_LAW_BGB',
    currencyRoundingStep: 0.05 // 🛡️ Art. 30 MWSTV: Kaufmännische 5-Rappen-Rundung
  },
  AT_DEFAULT: {
    code: 'AT_DEFAULT',
    country: 'AT',
    regionName: 'Österreich (Bund)',
    currency: 'EUR',
    dpoAuthorityName: 'Österreichische Datenschutzbehörde (DSB)',
    dpoAuthorityCity: 'Wien',
    dpoAuthorityUrl: 'https://www.dsb.gv.at',
    statutorySchoolLawRef: 'Datenschutzgesetz (DSG) BGBl. I Nr. 165/1999 & § 42f UrhG-AT',
    staffCouncilLawRef: '§ 96 Abs. 1 Z 3 ArbVG (Kontrollmaßnahmen und Überwachungssysteme)',
    legalSystem: 'AUSTRIAN_DSG',
    feeRegimeDefault: 'PRIVATE_LAW_BGB',
    currencyRoundingStep: 0.01
  }
};

/**
 * Ermittelt das Jurisdiktionsprofil für eine gegebene Kennung oder fällt auf BW zurück.
 */
export function getJurisdictionProfile(code?: string | null): JurisdictionProfile {
  if (code && code in JURISDICTION_REGISTRY) {
    return JURISDICTION_REGISTRY[code as JurisdictionCode];
  }
  return JURISDICTION_REGISTRY.DE_BW;
}
