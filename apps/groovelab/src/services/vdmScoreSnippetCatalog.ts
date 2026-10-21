/**
 * 🏛️ Campus-Groovelab 0,1% Goldstandard: Kuratierter Notenschnipsel-Katalog
 * vdmScoreSnippetCatalog.ts
 * 
 * Kanonischer Musikschul-Katalog über alle Instrumentalfächer und Ausbildungsstufen:
 * - 8 Fachkategorien + Eigene Schnipsel mit 3-Achsen-Taxonomie (Rubrik x Sub-Ordner x Ausbildungsstufe)
 * - Exakte 1–4 Takte MicroScores mit polyphoner Synthese & Notenmatrix
 * - 100% DSGVO-, MarkenG- & UrhG-konform (§§ 2, 51, 60a UrhG)
 * - Durchgängige Einteilung in Elementar-/Grundstufe, Unterstufe und Mittelstufe
 */

import { MicroScoreSnippet } from '../components/student/meisterwerk/microscore/microScore.types';
import { VDM_DRUM_SCORE_SNIPPETS } from './vdmDrumScoreSnippets';
import { VDM_EMP_SCORE_SNIPPETS } from './vdmEmpScoreSnippets';
import { VDM_GUITAR_UKE_SNIPPETS } from './vdmGuitarUkuleleSnippets';
import { VDM_INSTRUMENTAL_WARMUPS } from './vdmInstrumentalWarmups';
import { VDM_BAND_SYNC_PACKS } from './vdmBandSyncPacks';
import { BESTOF_CURRICULUM_EXPANSION } from './bestOfCurriculumExpansion';
import { INSTRUMENT_CURRICULUM_EXPANSION } from './instrumentCurriculumExpansion';
import { VDM_MASTERPIECE_CURRICULUM_EXPANSION } from './vdmMasterpieceCurriculumExpansion';

export interface VdmSubFolder {
  id: string;
  label: string;
  description: string;
}

export type VdmCategoryId =
  | 'Eigene'
  | 'Tonleitern'
  | 'Akkorde'
  | 'Rhythmus'
  | 'Technik'
  | 'Früherziehung'
  | 'Zupfinstrumente'
  | 'Vokal'
  | 'BandPacks';

export interface VdmFolderCategory {
  id: VdmCategoryId;
  name: string;
  iconName: 'sparkles' | 'music' | 'layers' | 'drum' | 'zap' | 'smile' | 'guitar' | 'mic' | 'users';
  description: string;
  color: {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    badgeText: string;
    activeBg: string;
    activeText: string;
    shadow: string;
  };
  subFolders: VdmSubFolder[];
}

/**
 * 🏛️ Campus-Groovelab 0,1% Goldstandard Wächter:
 * Erkennt autoritativ, ob ein Notenschnipsel von der Lehrkraft selbst
 * erstellt/gespeichert wurde oder aus dem kuratierten Standard-Katalog stammt.
 */
export const isOwnScoreSnippet = (s: MicroScoreSnippet): boolean => {
  if (!s || !s.id) return false;
  if (s.id.startsWith('vdm-') || (s as any).isVdmStandard) return false;
  return s.category === 'Eigene' || s.category === 'Eigene Notenschnipsel' || s.isCustom === true || !s.id.startsWith('vdm-');
};

export const VDM_CATEGORIES: VdmFolderCategory[] = [
  {
    id: 'Eigene',
    name: 'Eigene Notenschnipsel',
    iconName: 'sparkles',
    description: 'Individuell erstellte Schnipsel & Hausaufgaben der Lehrkraft',
    color: { bg: '#f3e8ff', border: '#a855f7', text: '#7e22ce', badgeBg: '#f3e8ff', badgeText: '#7e22ce', activeBg: '#a855f7', activeText: '#ffffff', shadow: 'none' },
    subFolders: [
      { id: 'all', label: 'Alle eigenen Schnipsel', description: 'Alle von Ihnen erstellten Notenschnipsel' },
      { id: 'drafts', label: 'Entwürfe', description: 'Noch nicht als Hausaufgabe vergebene Schnipsel' },
      { id: 'assigned', label: 'Zugewiesen', description: 'Bereits als Hausaufgabe vergebene Schnipsel' }
    ]
  },
  {
    id: 'Tonleitern',
    name: 'Tonleitern & Pentatonik',
    iconName: 'music',
    description: '5-Ton-Räume, Dur, Moll, Pentatonik, Blues & Kirchentonarten',
    color: { bg: '#dbeafe', border: '#3b82f6', text: '#1d4ed8', badgeBg: '#dbeafe', badgeText: '#1d4ed8', activeBg: '#3b82f6', activeText: '#ffffff', shadow: 'none' },
    subFolders: [
      { id: 'all', label: 'Alle Tonleitern', description: 'Alle Tonleiter-Übungen im Überblick' },
      { id: 'fuenfton', label: '5-Ton-Raum (Einstieg)', description: 'Erste 5 Töne C-D-E-F-G ohne Lagenwechsel' },
      { id: 'dur', label: 'Dur (Grund- & Unterstufe)', description: 'C-, G-, F-, D- und B-Dur Tonleitern' },
      { id: 'moll', label: 'Moll (natürlich/harmonisch/melodisch)', description: 'a-, e- und d-Moll mit Leittönen' },
      { id: 'pentatonik', label: 'Pentatonik & Blues', description: '5-Ton-Räume & Pentatonik-Licks' },
      { id: 'modal', label: 'Modal & Chromatisch', description: 'Kirchentonarten & Halbton-Schritte' }
    ]
  },
  {
    id: 'Akkorde',
    name: 'Akkorde & Kadenzen',
    iconName: 'layers',
    description: 'Zweiklänge, Dreiklänge, Arpeggios, Umkehrungen & Kadenzen',
    color: { bg: '#e6f4ea', border: '#34a853', text: '#137333', badgeBg: '#e6f4ea', badgeText: '#137333', activeBg: '#34a853', activeText: '#ffffff', shadow: 'none' },
    subFolders: [
      { id: 'all', label: 'Alle Akkorde', description: 'Alle Akkord-, Arpeggio- & Kadenzübungen' },
      { id: 'zweiklang-einstieg', label: 'Zweiklänge (Terzen & Quinten)', description: 'Zweistimmiger Harmonie-Einstieg' },
      { id: 'akkordwechsel', label: '2-Akkord-Wechsel (Em-Am / C-G)', description: 'Die wichtigsten ersten Akkordwechsel' },
      { id: 'dreiklaenge', label: 'Block-Dreiklänge (Dur & Moll)', description: 'Grunddreiklänge im simultanen Anschlag' },
      { id: 'arpeggio', label: 'Gebrochene Dreiklänge (Arpeggio)', description: 'Melodisch zerlegte Dreiklänge für alle Instrumente' },
      { id: 'umkehrungen', label: 'Umkehrungen (Sext & Quartsext)', description: 'Grundstellung, 1. und 2. Umkehrung' },
      { id: 'kadenzen', label: 'Hauptkadenzen & Pop-Formeln', description: 'I-IV-V-I, G7-Auflösung, Moll-Kadenz & 4-Chords' },
      { id: 'jazz-vierklaenge', label: 'Jazz & Septakkorde', description: 'II-V-I Verbindung, Dominant-7 & Maj7' }
    ]
  },
  {
    id: 'Rhythmus',
    name: 'Rhythmus & Grooves',
    iconName: 'drum',
    description: 'Grundpuls, Achtel, Punktierungen, 16tel, Triolen & Drum-Grooves',
    color: { bg: '#fef9c3', border: '#facc15', text: '#854d0e', badgeBg: '#fef9c3', badgeText: '#854d0e', activeBg: '#facc15', activeText: '#0f172a', shadow: 'none' },
    subFolders: [
      { id: 'all', label: 'Alle Rhythmen', description: 'Alle Rhythmus- und Metronomübungen' },
      { id: 'grundpuls', label: 'Viertel & Achtelpuls', description: 'Präzises Timing, Achtel-Paare & Pausenzählen' },
      { id: 'punktiert-synkopen', label: 'Punktierungen & Synkopen', description: 'Klassische Punktierung & Off-Beats' },
      { id: 'sechzehntel', label: '16tel-Figuren & Galopp', description: 'Binäre 16tel-Gruppen & Galopp-Motive' },
      { id: 'triolen-shuffle', label: 'Triolen & Shuffle', description: 'Achtel-Triolen & Blues Shuffle-Feel' },
      { id: 'ungerade', label: '3/4 Walzer & 6/8 Takt', description: 'Dreiertakt & wiegender 6/8 Rhythmus' },
      { id: 'grooves', label: 'Schlagzeug & Drum Grooves', description: 'Rock, Funk, Disco, Halftime & Tom-Fills' }
    ]
  },
  {
    id: 'Technik',
    name: 'Warm-ups & Fitness',
    iconName: 'zap',
    description: 'Blockflöte, Bläser, Streicher, Tasten, Gitarre & Drum-Rudiments',
    color: { bg: '#e0e7ff', border: '#6366f1', text: '#4338ca', badgeBg: '#e0e7ff', badgeText: '#4338ca', activeBg: '#6366f1', activeText: '#ffffff', shadow: 'none' },
    subFolders: [
      { id: 'all', label: 'Alle Warm-ups', description: 'Alle Fingerübungen und Technik-Drills' },
      { id: 'blockfloete-holz', label: 'Blockflöte & Holzbläser', description: 'H-A-G Einstieg, Fünftonraum & Überblasen' },
      { id: 'blaeser-longtones', label: 'Bläser (Long Tones)', description: 'Intonations-Stütze & Dynamik p < f > p' },
      { id: 'blaeser-flexibility', label: 'Bläser (Lippenbindung & Zunge)', description: 'Naturtöne & Doppelzunge' },
      { id: 'streicher-bogen', label: 'Streicher (Bogen & Saitenwechsel)', description: 'Leersaiten Ab-/Aufstrich & Saitenwechsel' },
      { id: 'streicher-lagen', label: 'Streicher (1. Lage)', description: 'Dur/Moll Griffmuster' },
      { id: 'klavier-hanon', label: 'Tasten (Hanon No. 1)', description: 'Fingerunabhängigkeit & Lockerung' },
      { id: 'klavier-daumen', label: 'Tasten (Daumenuntersatz)', description: '1-2-3-1 Legato Oktave' },
      { id: 'klavier-alberti', label: 'Tasten (Alberti-Bass)', description: 'C-E-G-E Sonatinenbegleitung' },
      { id: 'gitarre-spider', label: 'Gitarre & Bass (Spider)', description: '1-2-3-4 Wechselschlag & Koordination' },
      { id: 'drums-rudiments', label: 'Drums (Rudiments & Rolls)', description: 'Single Stroke, Double Stroke & Paradiddle' }
    ]
  },
  {
    id: 'Früherziehung',
    name: 'Früherziehung & EMP',
    iconName: 'smile',
    description: 'Kuckucksruf, Fünftonraum, Pentatonik, Bodypercussion & Sprachrhythmen',
    color: { bg: '#fee2e2', border: '#ef4444', text: '#b91c1c', badgeBg: '#fee2e2', badgeText: '#b91c1c', activeBg: '#ef4444', activeText: '#ffffff', shadow: 'none' },
    subFolders: [
      { id: 'all', label: 'Alle EMP-Schnipsel', description: 'Alle Früherziehungs-Übungen' },
      { id: 'emp-terz', label: 'Kuckucksruf & 3-Ton-Raum', description: 'Moll-Terz G-E & Ringe-Reihe' },
      { id: 'emp-fuenfton', label: 'Fünftonraum & Lieder', description: 'Tonleiter-Treppe & Hänschen Klein' },
      { id: 'emp-pentatonik', label: 'Pentatonischer Garten', description: 'C-D-E-G-A ohne Halbtonschritte' },
      { id: 'emp-sprache', label: 'Sprachrhythmus & Puls', description: 'Sprechverse, Silbenmetrik & Uhr-Ticken' },
      { id: 'emp-bodypercussion', label: 'Body-Percussion', description: 'Stampfen, Patschen, Klatschen' },
      { id: 'emp-register', label: 'Register & Kontraste', description: 'Elefant vs. Maus' },
      { id: 'emp-echo', label: 'Call & Response', description: 'Glöckchen-Echo' },
      { id: 'emp-artikulation', label: 'Artikulation', description: 'Dino-Stampf & Schmetterling' }
    ]
  },
  {
    id: 'Zupfinstrumente',
    name: 'Gitarre, Ukulele & Bass',
    iconName: 'guitar',
    description: 'Calypso-Strumming, PIMA-Arpeggios, Powerchords & Slap-Bass',
    color: { bg: '#ffedd5', border: '#f97316', text: '#c2410c', badgeBg: '#ffedd5', badgeText: '#c2410c', activeBg: '#f97316', activeText: '#ffffff', shadow: 'none' },
    subFolders: [
      { id: 'all', label: 'Alle Zupfinstrumente', description: 'Alle Gitarren-, Ukulele- und Bass-Übungen' },
      { id: 'ukulele-basics', label: 'Ukulele (Calypso & Chords)', description: 'Calypso Strumming & Magic 4 Chords' },
      { id: 'gitarre-openchords', label: 'Gitarre (Shuffle & Riffs)', description: 'Blues Shuffle Riff & Begleitung' },
      { id: 'gitarre-arpeggio', label: 'Gitarre (PIMA Arpeggio)', description: 'Carcassi Zupfmuster & Lagen' },
      { id: 'rock-powerchords', label: 'Rock (Powerchords & P.M.)', description: 'E5-G5-A5 mit abgedämpfter Kante' },
      { id: 'gitarre-barre', label: 'Gitarre (Barré Vorbereitung)', description: 'Mini-Barré & Kraftaufbau' },
      { id: 'bass-grooves', label: 'E-Bass (Walking & Slap)', description: 'Jazz Walking Bass & Thumb-Pop' }
    ]
  },
  {
    id: 'Vokal',
    name: 'Vokal & Gehörbildung',
    iconName: 'mic',
    description: 'Stimm-Sirene, Belcanto-Arpeggio, Zwerchfell-Staccato & Solmisation',
    color: { bg: '#cffafe', border: '#06b6d4', text: '#0e7490', badgeBg: '#cffafe', badgeText: '#0e7490', activeBg: '#06b6d4', activeText: '#ffffff', shadow: 'none' },
    subFolders: [
      { id: 'all', label: 'Alle Vokalübungen', description: 'Alle Gesangs- & Gehörbildungsübungen' },
      { id: 'vokal-sirene', label: 'Stimm-Sirene (Register)', description: 'Brust- zu Kopfstimme Ausgleich' },
      { id: 'vokal-arpeggio', label: 'Dreiklänge ("Ma-Me-Mi")', description: 'Belcanto Vokalmodulation Legato' },
      { id: 'vokal-staccato', label: 'Zwerchfell-Staccato', description: 'Kurze "Ha-Ha" Atemimpulse' },
      { id: 'vokal-solmisation', label: 'Relative Solmisation', description: 'Do-Re-Mi-Fa-So Kodály-Silben' }
    ]
  },
  {
    id: 'BandPacks',
    name: 'GrooveLab Band-Packs',
    iconName: 'users',
    description: 'Synchrone 3-Pack Ensembles (Drums + Bass + Keys/Melodie)',
    color: { bg: '#f1f5f9', border: '#94a3b8', text: '#475569', badgeBg: '#f1f5f9', badgeText: '#475569', activeBg: '#0f172a', activeText: '#ffffff', shadow: 'none' },
    subFolders: [
      { id: 'all', label: 'Alle Band-Packs', description: 'Alle synchronen Ensembles' },
      { id: 'band-funk', label: 'Funk Drive in Dm (96 BPM)', description: '16tel Ghost-Hi-Hat, Slap Bass, Dm9 Stabs' },
      { id: 'band-pop', label: 'Pop Anthem in C (120 BPM)', description: 'Four-on-the-Floor, 8tel Bass, Piano Hook' },
      { id: 'band-blues', label: 'Blues Shuffle in A (80 BPM)', description: 'Triplet Shuffle, Walking Bass, Blues Licks' }
    ]
  }
];

export const VDM_SCORE_SNIPPETS: MicroScoreSnippet[] = [
  // =========================================================================
  // 1. TONLEITERN & PENTATONIK
  // =========================================================================
  {
    id: 'vdm-scale-c-dur',
    title: 'C-Dur Tonleiter (Auf- & Abwärts)',
    category: 'Tonleitern',
    vdmFolder: 'dur',
    vdmLevel: 'elementar',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 80,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Grundstufe: Gleichmäßige Achtelnoten im 4/4-Takt auf- und abwärts von C4 bis C5 und zurück zum Grundton C4.',
    tags: ['Grundstufe', 'C-Dur', 'Auf & Ab', 'Metronom'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'v1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'C4' },
      { id: 'v2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'D4' },
      { id: 'v3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'E4' },
      { id: 'v4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'F4' },
      { id: 'v5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'G4' },
      { id: 'v6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'A4' },
      { id: 'v7', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'B4' },
      { id: 'v8', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'C5' },
      { id: 'v9', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'B4' },
      { id: 'v10', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'A4' },
      { id: 'v11', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'G4' },
      { id: 'v12', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'F4' },
      { id: 'v13', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'E4' },
      { id: 'v14', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'D4' },
      { id: 'v15', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'C4' }
    ]
  },
  {
    id: 'vdm-scale-g-dur',
    title: 'G-Dur Tonleiter (Auf- & Abwärts)',
    category: 'Tonleitern',
    vdmFolder: 'dur',
    vdmLevel: 'unterstufe',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 80,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Unterstufe 1: Tonleiter mit 1 Kreuz-Vorzeichen (Fis) über 1 Oktave auf- und abwärts.',
    tags: ['Unterstufe', 'G-Dur', 'Kreuz-Tonart', 'Auf & Ab'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'vg1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'G4' },
      { id: 'vg2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'A4' },
      { id: 'vg3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'B4' },
      { id: 'vg4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'C5' },
      { id: 'vg5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'D5' },
      { id: 'vg6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'E5' },
      { id: 'vg7', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'F#5' },
      { id: 'vg8', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'G5' },
      { id: 'vg9', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'F#5' },
      { id: 'vg10', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'E5' },
      { id: 'vg11', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'D5' },
      { id: 'vg12', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'C5' },
      { id: 'vg13', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'B4' },
      { id: 'vg14', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'A4' },
      { id: 'vg15', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'G4' }
    ]
  },
  {
    id: 'vdm-scale-f-dur',
    title: 'F-Dur Tonleiter (Auf- & Abwärts)',
    category: 'Tonleitern',
    vdmFolder: 'dur',
    vdmLevel: 'unterstufe',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 76,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Unterstufe 1: Tonleiter mit 1 B-Vorzeichen (Bb) auf- und abwärts in gleichmäßigem Fluss.',
    tags: ['Unterstufe', 'F-Dur', 'B-Tonart', 'Auf & Ab'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'vf1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'F4' },
      { id: 'vf2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'G4' },
      { id: 'vf3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'A4' },
      { id: 'vf4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'Bb4' },
      { id: 'vf5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'C5' },
      { id: 'vf6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'D5' },
      { id: 'vf7', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'E5' },
      { id: 'vf8', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'F5' },
      { id: 'vf9', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'E5' },
      { id: 'vf10', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'D5' },
      { id: 'vf11', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'C5' },
      { id: 'vf12', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'Bb4' },
      { id: 'vf13', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'A4' },
      { id: 'vf14', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'G4' },
      { id: 'vf15', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'F4' }
    ]
  },
  {
    id: 'vdm-scale-d-dur',
    title: 'D-Dur Tonleiter (Auf- & Abwärts)',
    category: 'Tonleitern',
    vdmFolder: 'dur',
    vdmLevel: 'unterstufe',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 84,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Unterstufe 2: D-Dur mit Fis und Cis auf- und abwärts über 1 Oktave.',
    tags: ['Unterstufe', 'D-Dur', 'Auf & Ab', 'Fis & Cis'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'vd1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'D4' },
      { id: 'vd2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'E4' },
      { id: 'vd3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'F#4' },
      { id: 'vd4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'G4' },
      { id: 'vd5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'A4' },
      { id: 'vd6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'B4' },
      { id: 'vd7', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'C#5' },
      { id: 'vd8', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'D5' },
      { id: 'vd9', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'C#5' },
      { id: 'vd10', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'B4' },
      { id: 'vd11', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'A4' },
      { id: 'vd12', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'G4' },
      { id: 'vd13', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'F#4' },
      { id: 'vd14', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'E4' },
      { id: 'vd15', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'D4' }
    ]
  },
  {
    id: 'vdm-scale-a-moll-nat',
    title: 'A-Moll natürlich (Auf- & Abwärts)',
    category: 'Tonleitern',
    vdmFolder: 'moll',
    vdmLevel: 'unterstufe',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 76,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Unterstufe 1: Natürliche Moll-Tonleiter (parallele Molltonart zu C-Dur) über 1 Oktave auf- und abwärts.',
    tags: ['A-Moll', 'Natürliches Moll', 'Unterstufe', 'Auf & Ab'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'van1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'A4' },
      { id: 'van2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'B4' },
      { id: 'van3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'C5' },
      { id: 'van4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'D5' },
      { id: 'van5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'E5' },
      { id: 'van6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'F5' },
      { id: 'van7', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'G5' },
      { id: 'van8', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'A5' },
      { id: 'van9', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'G5' },
      { id: 'van10', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'F5' },
      { id: 'van11', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'E5' },
      { id: 'van12', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'D5' },
      { id: 'van13', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'C5' },
      { id: 'van14', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'B4' },
      { id: 'van15', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'A4' }
    ]
  },
  {
    id: 'vdm-scale-a-moll-harm',
    title: 'A-Moll harmonisch (Auf- & Abwärts)',
    category: 'Tonleitern',
    vdmFolder: 'moll',
    vdmLevel: 'unterstufe',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 76,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Unterstufe 2: Erhöhter 7. Ton (Gis5) als Leitton zum Grundton A auf- und abwärts.',
    tags: ['A-Moll', 'Harmonisch', 'Leitton', 'Unterstufe', 'Auf & Ab'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'vah1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'A4' },
      { id: 'vah2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'B4' },
      { id: 'vah3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'C5' },
      { id: 'vah4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'D5' },
      { id: 'vah5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'E5' },
      { id: 'vah6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'F5' },
      { id: 'vah7', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'G#5' },
      { id: 'vah8', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'A5' },
      { id: 'vah9', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'G#5' },
      { id: 'vah10', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'F5' },
      { id: 'vah11', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'E5' },
      { id: 'vah12', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'D5' },
      { id: 'vah13', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'C5' },
      { id: 'vah14', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'B4' },
      { id: 'vah15', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'A4' }
    ]
  },
  {
    id: 'vdm-scale-e-moll-harm',
    title: 'E-Moll harmonisch (Auf- & Abwärts)',
    category: 'Tonleitern',
    vdmFolder: 'moll',
    vdmLevel: 'mittelstufe',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 80,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Mittelstufe: Harmonisches e-Moll mit Fis und Leitton Dis auf- und abwärts.',
    tags: ['E-Moll', 'Harmonisch', 'Leitton', 'Auf & Ab'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'vem1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'E4' },
      { id: 'vem2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'F#4' },
      { id: 'vem3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'G4' },
      { id: 'vem4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'A4' },
      { id: 'vem5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'B4' },
      { id: 'vem6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'C5' },
      { id: 'vem7', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'D#5' },
      { id: 'vem8', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'E5' },
      { id: 'vem9', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'D#5' },
      { id: 'vem10', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'C5' },
      { id: 'vem11', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'B4' },
      { id: 'vem12', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'A4' },
      { id: 'vem13', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'G4' },
      { id: 'vem14', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'F#4' },
      { id: 'vem15', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'E4' }
    ]
  },
  {
    id: 'vdm-scale-c-penta',
    title: 'C-Dur Pentatonik (Auf- & Abwärts)',
    category: 'Tonleitern',
    vdmFolder: 'pentatonik',
    vdmLevel: 'elementar',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 88,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Grundstufe: Universelle Pentatonik (C-D-E-G-A) im flüssigen Achtellauf auf- und abwärts.',
    tags: ['C-Dur', 'Pentatonik', 'Melodie-Bildung', 'Auf & Ab'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'vcp1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'C4' },
      { id: 'vcp2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'D4' },
      { id: 'vcp3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'E4' },
      { id: 'vcp4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'G4' },
      { id: 'vcp5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'A4' },
      { id: 'vcp6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'C5' },
      { id: 'vcp7', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'D5' },
      { id: 'vcp8', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'E5' },
      { id: 'vcp9', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'D5' },
      { id: 'vcp10', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'C5' },
      { id: 'vcp11', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'A4' },
      { id: 'vcp12', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'G4' },
      { id: 'vcp13', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'E4' },
      { id: 'vcp14', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'D4' },
      { id: 'vcp15', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'C4' }
    ]
  },
  {
    id: 'vdm-scale-a-penta-guitar',
    title: 'A-Moll Pentatonik Lick (Box 1)',
    category: 'Tonleitern',
    vdmFolder: 'pentatonik',
    vdmLevel: 'unterstufe',
    instrument: 'guitar',
    timeSignature: '4/4',
    tempoBpm: 90,
    barsCount: 2,
    displayMode: 'both',
    description: 'Unterstufe: Klassischer Einstieg in das Solo-Spiel (A-C-D-E-G) mit authentischer Bund-Notation.',
    tags: ['A-Moll', 'Pentatonik', 'Solo-Lick', 'Gitarre'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'vap1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'A3', fret: 5, stringIndex: 5 },
      { id: 'vap2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'C4', fret: 8, stringIndex: 5 },
      { id: 'vap3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'D4', fret: 5, stringIndex: 4 },
      { id: 'vap4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'E4', fret: 7, stringIndex: 4 },
      { id: 'vap5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'G4', fret: 5, stringIndex: 3 },
      { id: 'vap6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'A4', fret: 7, stringIndex: 3 },
      { id: 'vap7', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'C5', fret: 5, stringIndex: 2 },
      { id: 'vap8', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'D5', fret: 7, stringIndex: 2 },
      { id: 'vap9', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'C5', fret: 5, stringIndex: 2 },
      { id: 'vap10', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'A4', fret: 7, stringIndex: 3 },
      { id: 'vap11', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'G4', fret: 5, stringIndex: 3 },
      { id: 'vap12', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'E4', fret: 7, stringIndex: 4 },
      { id: 'vap13', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'D4', fret: 5, stringIndex: 4 },
      { id: 'vap14', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'C4', fret: 8, stringIndex: 5 },
      { id: 'vap15', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'A3', fret: 5, stringIndex: 5 }
    ]
  },
  {
    id: 'vdm-scale-blues-a',
    title: 'Blues Scale A (mit Blue Note Eb)',
    category: 'Tonleitern',
    vdmFolder: 'pentatonik',
    vdmLevel: 'mittelstufe',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 84,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Mittelstufe: A-Blues-Tonleiter (A-C-D-Eb-E-G-A) mit charakteristischer Blue Note Eb auf- und abwärts.',
    tags: ['Blues', 'Blue Note', 'Saxophon & Bläser', 'Auf & Ab'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'vbl1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'A4' },
      { id: 'vbl2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'C5' },
      { id: 'vbl3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'D5' },
      { id: 'vbl4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'Eb5' },
      { id: 'vbl5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'E5' },
      { id: 'vbl6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'G5' },
      { id: 'vbl7', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'A5' },
      { id: 'vbl8', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'G5' },
      { id: 'vbl9', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'E5' },
      { id: 'vbl10', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'Eb5' },
      { id: 'vbl11', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'D5' },
      { id: 'vbl12', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'C5' },
      { id: 'vbl13', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'A4' }
    ]
  },
  {
    id: 'vdm-scale-dorian-d',
    title: 'D-Dorisch (Kirchentonart / Modal)',
    category: 'Tonleitern',
    vdmFolder: 'modal',
    vdmLevel: 'mittelstufe',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 80,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Mittelstufe: Dorische Tonleiter mit charakteristischer großer Sexte B4 auf- und abwärts.',
    tags: ['Kirchentonart', 'Modal', 'Dorisch', 'Querflöte', 'Auf & Ab'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'vdd1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'D4' },
      { id: 'vdd2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'E4' },
      { id: 'vdd3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'F4' },
      { id: 'vdd4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'G4' },
      { id: 'vdd5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'A4' },
      { id: 'vdd6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'B4' },
      { id: 'vdd7', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'C5' },
      { id: 'vdd8', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'D5' },
      { id: 'vdd9', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'C5' },
      { id: 'vdd10', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'B4' },
      { id: 'vdd11', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'A4' },
      { id: 'vdd12', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'G4' },
      { id: 'vdd13', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'F4' },
      { id: 'vdd14', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'E4' },
      { id: 'vdd15', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'D4' }
    ]
  },

  // =========================================================================
  // 2. AKKORDE, ZERLEGUNGEN & KADENZEN (SIMULTANE POLYPHONIE)
  // =========================================================================
  {
    id: 'vdm-chord-two-tone-intervals',
    title: 'Zweiklang-Harmonie: Terzen & Quinten',
    category: 'Akkorde',
    vdmFolder: 'zweiklang-einstieg',
    vdmLevel: 'elementar',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 72,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Grundstufe: Simultan zweistimmiges Spiel (Terzen und Quinten) zur Grundlegung polyphonen Hörens.',
    tags: ['Zweiklang', 'Terzen', 'Quinten', 'Harmonie-Einstieg'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'zt1a', barIndex: 0, beatFraction: 0, duration: '2', pitch: 'C4' },
      { id: 'zt1b', barIndex: 0, beatFraction: 0, duration: '2', pitch: 'E4' },
      { id: 'zt2a', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'D4' },
      { id: 'zt2b', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'F4' },
      { id: 'zt3a', barIndex: 1, beatFraction: 0, duration: '2', pitch: 'E4' },
      { id: 'zt3b', barIndex: 1, beatFraction: 0, duration: '2', pitch: 'G4' },
      { id: 'zt4a', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'C4' },
      { id: 'zt4b', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'G4' }
    ]
  },
  {
    id: 'vdm-chord-c-triad',
    title: 'C-Dur Dreiklang (Simultaner Blockakkord)',
    category: 'Akkorde',
    vdmFolder: 'dreiklaenge',
    vdmLevel: 'elementar',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 72,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Grundstufe: Gleichzeitiger Anschlag aller 3 Akkordtöne (C-E-G) im Viertelpuls.',
    tags: ['C-Dur', 'Dreiklang', 'Blockakkord', 'Grundstufe'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    chords: [
      { id: 'c1', barIndex: 0, tickPosition: 0, chordName: 'C' },
      { id: 'c2', barIndex: 1, tickPosition: 0, chordName: 'C' }
    ],
    notes: [
      { id: 'ct1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'C4' },
      { id: 'ct2', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'E4' },
      { id: 'ct3', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'G4' },
      { id: 'ct4', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'C4' },
      { id: 'ct5', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'E4' },
      { id: 'ct6', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'G4' },
      { id: 'ct7', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'C4' },
      { id: 'ct8', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'E4' },
      { id: 'ct9', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'G4' },
      { id: 'ct10', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'C4' },
      { id: 'ct11', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'E4' },
      { id: 'ct12', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'G4' },
      { id: 'ct13', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'C4' },
      { id: 'ct14', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'E4' },
      { id: 'ct15', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'G4' },
      { id: 'ct16', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'C4' },
      { id: 'ct17', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'E4' },
      { id: 'ct18', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'G4' }
    ]
  },
  {
    id: 'vdm-chord-am-em-triad',
    title: 'A-Moll & E-Moll Blockdreiklänge',
    category: 'Akkorde',
    vdmFolder: 'dreiklaenge',
    vdmLevel: 'unterstufe',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 76,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Unterstufe 1: Simultaner Anschlag der parallelen Molldreiklänge Am und Em.',
    tags: ['A-Moll', 'E-Moll', 'Moll-Dreiklang', 'Simultan'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    chords: [
      { id: 'ca1', barIndex: 0, tickPosition: 0, chordName: 'Am' },
      { id: 'ce1', barIndex: 1, tickPosition: 0, chordName: 'Em' }
    ],
    notes: [
      { id: 'cam1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'A3' },
      { id: 'cam2', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'C4' },
      { id: 'cam3', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'E4' },
      { id: 'cam4', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'A3' },
      { id: 'cam5', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'C4' },
      { id: 'cam6', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'E4' },
      { id: 'cam7', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'A3' },
      { id: 'cam8', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'C4' },
      { id: 'cam9', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'E4' },
      { id: 'cem1', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'E3' },
      { id: 'cem2', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'G3' },
      { id: 'cem3', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'B3' },
      { id: 'cem4', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'E3' },
      { id: 'cem5', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'G3' },
      { id: 'cem6', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'B3' },
      { id: 'cem7', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'E3' },
      { id: 'cem8', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'G3' },
      { id: 'cem9', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'B3' }
    ]
  },
  {
    id: 'vdm-chord-em-am',
    title: 'Akkordwechsel Em ⇄ Am (Liedbegleitung)',
    category: 'Akkorde',
    vdmFolder: 'akkordwechsel',
    vdmLevel: 'unterstufe',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 76,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Unterstufe 1: Der fundamentale 2-Akkord-Wechsel. Takt 1: Em, Takt 2: Am simultan im 4/4-Puls.',
    tags: ['Akkordwechsel', 'Em-Am', 'Liedbegleitung', 'Basis'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    chords: [
      { id: 'w1', barIndex: 0, tickPosition: 0, chordName: 'Em' },
      { id: 'w2', barIndex: 1, tickPosition: 0, chordName: 'Am' }
    ],
    notes: [
      { id: 'we1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'E3' },
      { id: 'we2', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'G3' },
      { id: 'we3', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'B3' },
      { id: 'we4', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'E3' },
      { id: 'we5', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'G3' },
      { id: 'we6', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'B3' },
      { id: 'we7', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'E3' },
      { id: 'we8', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'G3' },
      { id: 'we9', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'B3' },
      { id: 'wa1', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'A3' },
      { id: 'wa2', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'C4' },
      { id: 'wa3', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'E4' },
      { id: 'wa4', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'A3' },
      { id: 'wa5', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'C4' },
      { id: 'wa6', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'E4' },
      { id: 'wa7', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'A3' },
      { id: 'wa8', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'C4' },
      { id: 'wa9', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'E4' }
    ]
  },
  {
    id: 'vdm-chord-em-d',
    title: 'Akkordwechsel Em ⇄ D (Folk & Rock)',
    category: 'Akkorde',
    vdmFolder: 'akkordwechsel',
    vdmLevel: 'unterstufe',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 80,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Unterstufe 1: Klassischer Lagerfeuer- und Pop-Wechsel zwischen E-Moll und D-Dur.',
    tags: ['Akkordwechsel', 'Em-D', 'Folk', 'Rock'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    chords: [
      { id: 'w3', barIndex: 0, tickPosition: 0, chordName: 'Em' },
      { id: 'w4', barIndex: 1, tickPosition: 0, chordName: 'D' }
    ],
    notes: [
      { id: 'wed1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'E3' },
      { id: 'wed2', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'G3' },
      { id: 'wed3', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'B3' },
      { id: 'wed4', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'E3' },
      { id: 'wed5', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'G3' },
      { id: 'wed6', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'B3' },
      { id: 'wed7', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'E3' },
      { id: 'wed8', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'G3' },
      { id: 'wed9', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'B3' },
      { id: 'wdd1', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'D4' },
      { id: 'wdd2', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'F#4' },
      { id: 'wdd3', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'A4' },
      { id: 'wdd4', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'D4' },
      { id: 'wdd5', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'F#4' },
      { id: 'wdd6', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'A4' },
      { id: 'wdd7', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'D4' },
      { id: 'wdd8', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'F#4' },
      { id: 'wdd9', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'A4' }
    ]
  },
  {
    id: 'vdm-chord-c-g',
    title: 'Akkordwechsel C ⇄ G (Tonika - Dominante)',
    category: 'Akkorde',
    vdmFolder: 'akkordwechsel',
    vdmLevel: 'unterstufe',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 76,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Unterstufe 1: Die Ur-Harmonie I ⇄ V. Simultaner Blockanschlag mit sauberem Fingerwechsel.',
    tags: ['Akkordwechsel', 'C-G', 'Tonika-Dominante', 'Basis'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    chords: [
      { id: 'w5', barIndex: 0, tickPosition: 0, chordName: 'C' },
      { id: 'w6', barIndex: 1, tickPosition: 0, chordName: 'G' }
    ],
    notes: [
      { id: 'wcg1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'C4' },
      { id: 'wcg2', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'E4' },
      { id: 'wcg3', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'G4' },
      { id: 'wcg4', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'C4' },
      { id: 'wcg5', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'E4' },
      { id: 'wcg6', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'G4' },
      { id: 'wcg7', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'C4' },
      { id: 'wcg8', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'E4' },
      { id: 'wcg9', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'G4' },
      { id: 'wgg1', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'B3' },
      { id: 'wgg2', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'D4' },
      { id: 'wgg3', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'G4' },
      { id: 'wgg4', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'B3' },
      { id: 'wgg5', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'D4' },
      { id: 'wgg6', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'G4' },
      { id: 'wgg7', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'B3' },
      { id: 'wgg8', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'D4' },
      { id: 'wgg9', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'G4' }
    ]
  },
  {
    id: 'vdm-chord-c-am',
    title: 'Akkordwechsel C ⇄ Am (Dur-Moll-Parallele)',
    category: 'Akkorde',
    vdmFolder: 'akkordwechsel',
    vdmLevel: 'unterstufe',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 76,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Unterstufe 1: Ökonomischer Fingerwechsel zwischen C-Dur und A-Moll mit gemeinsamen Tönen C und E.',
    tags: ['Akkordwechsel', 'C-Am', 'Parallele', 'Liedbegleitung'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    chords: [
      { id: 'w7', barIndex: 0, tickPosition: 0, chordName: 'C' },
      { id: 'w8', barIndex: 1, tickPosition: 0, chordName: 'Am' }
    ],
    notes: [
      { id: 'wca1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'C4' },
      { id: 'wca2', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'E4' },
      { id: 'wca3', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'G4' },
      { id: 'wca4', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'C4' },
      { id: 'wca5', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'E4' },
      { id: 'wca6', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'G4' },
      { id: 'wca7', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'C4' },
      { id: 'wca8', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'E4' },
      { id: 'wca9', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'G4' },
      { id: 'waa1', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'C4' },
      { id: 'waa2', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'E4' },
      { id: 'waa3', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'A4' },
      { id: 'waa4', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'C4' },
      { id: 'waa5', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'E4' },
      { id: 'waa6', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'A4' },
      { id: 'waa7', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'C4' },
      { id: 'waa8', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'E4' },
      { id: 'waa9', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'A4' }
    ]
  },
  {
    id: 'vdm-chord-cadence-classic',
    title: 'Klassische Hauptkadenz (C - F - G - C)',
    category: 'Akkorde',
    vdmFolder: 'kadenzen',
    vdmLevel: 'unterstufe',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 70,
    barsCount: 4,
    displayMode: 'notes',
    description: 'Unterstufe 1: Tonika (C), Subdominante (F), Dominante (G), Tonika (C) in simultaner Stimmführung.',
    tags: ['Kadenz', 'Harmonielehre', 'I-IV-V-I', 'Stimmführung'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    chords: [
      { id: 'k1', barIndex: 0, tickPosition: 0, chordName: 'C' },
      { id: 'k2', barIndex: 1, tickPosition: 0, chordName: 'F' },
      { id: 'k3', barIndex: 2, tickPosition: 0, chordName: 'G' },
      { id: 'k4', barIndex: 3, tickPosition: 0, chordName: 'C' }
    ],
    notes: [
      { id: 'kn1a', barIndex: 0, beatFraction: 0, duration: '1', pitch: 'C4' },
      { id: 'kn1b', barIndex: 0, beatFraction: 0, duration: '1', pitch: 'E4' },
      { id: 'kn1c', barIndex: 0, beatFraction: 0, duration: '1', pitch: 'G4' },
      { id: 'kn2a', barIndex: 1, beatFraction: 0, duration: '1', pitch: 'C4' },
      { id: 'kn2b', barIndex: 1, beatFraction: 0, duration: '1', pitch: 'F4' },
      { id: 'kn2c', barIndex: 1, beatFraction: 0, duration: '1', pitch: 'A4' },
      { id: 'kn3a', barIndex: 2, beatFraction: 0, duration: '1', pitch: 'B3' },
      { id: 'kn3b', barIndex: 2, beatFraction: 0, duration: '1', pitch: 'D4' },
      { id: 'kn3c', barIndex: 2, beatFraction: 0, duration: '1', pitch: 'G4' },
      { id: 'kn4a', barIndex: 3, beatFraction: 0, duration: '1', pitch: 'C4' },
      { id: 'kn4b', barIndex: 3, beatFraction: 0, duration: '1', pitch: 'E4' },
      { id: 'kn4c', barIndex: 3, beatFraction: 0, duration: '1', pitch: 'G4' }
    ]
  },
  {
    id: 'vdm-chord-pop-progression',
    title: 'Pop-Kadenz (C - G - Am - F)',
    category: 'Akkorde',
    vdmFolder: 'kadenzen',
    vdmLevel: 'unterstufe',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 80,
    barsCount: 4,
    displayMode: 'notes',
    description: 'Unterstufe: Das universelle 4-Chord Pop-Schema mit simultanen Viertelschlägen.',
    tags: ['Pop-Kadenz', 'Akkordwechsel', 'C-G-Am-F', '4 Chords'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    chords: [
      { id: 'p1', barIndex: 0, tickPosition: 0, chordName: 'C' },
      { id: 'p2', barIndex: 1, tickPosition: 0, chordName: 'G' },
      { id: 'p3', barIndex: 2, tickPosition: 0, chordName: 'Am' },
      { id: 'p4', barIndex: 3, tickPosition: 0, chordName: 'F' }
    ],
    notes: [
      // Bar 0: C
      { id: 'pn0_1a', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'C4' },
      { id: 'pn0_1b', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'E4' },
      { id: 'pn0_1c', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'G4' },
      { id: 'pn0_2a', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'C4' },
      { id: 'pn0_2b', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'E4' },
      { id: 'pn0_2c', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'G4' },
      { id: 'pn0_3a', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'C4' },
      { id: 'pn0_3b', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'E4' },
      { id: 'pn0_3c', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'G4' },
      { id: 'pn0_4a', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'C4' },
      { id: 'pn0_4b', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'E4' },
      { id: 'pn0_4c', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'G4' },
      // Bar 1: G
      { id: 'pn1_1a', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'B3' },
      { id: 'pn1_1b', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'D4' },
      { id: 'pn1_1c', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'G4' },
      { id: 'pn1_2a', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'B3' },
      { id: 'pn1_2b', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'D4' },
      { id: 'pn1_2c', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'G4' },
      { id: 'pn1_3a', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'B3' },
      { id: 'pn1_3b', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'D4' },
      { id: 'pn1_3c', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'G4' },
      { id: 'pn1_4a', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'B3' },
      { id: 'pn1_4b', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'D4' },
      { id: 'pn1_4c', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'G4' },
      // Bar 2: Am
      { id: 'pn2_1a', barIndex: 2, beatFraction: 0, duration: '4', pitch: 'C4' },
      { id: 'pn2_1b', barIndex: 2, beatFraction: 0, duration: '4', pitch: 'E4' },
      { id: 'pn2_1c', barIndex: 2, beatFraction: 0, duration: '4', pitch: 'A4' },
      { id: 'pn2_2a', barIndex: 2, beatFraction: 4, duration: '4', pitch: 'C4' },
      { id: 'pn2_2b', barIndex: 2, beatFraction: 4, duration: '4', pitch: 'E4' },
      { id: 'pn2_2c', barIndex: 2, beatFraction: 4, duration: '4', pitch: 'A4' },
      { id: 'pn2_3a', barIndex: 2, beatFraction: 8, duration: '4', pitch: 'C4' },
      { id: 'pn2_3b', barIndex: 2, beatFraction: 8, duration: '4', pitch: 'E4' },
      { id: 'pn2_3c', barIndex: 2, beatFraction: 8, duration: '4', pitch: 'A4' },
      { id: 'pn2_4a', barIndex: 2, beatFraction: 12, duration: '4', pitch: 'C4' },
      { id: 'pn2_4b', barIndex: 2, beatFraction: 12, duration: '4', pitch: 'E4' },
      { id: 'pn2_4c', barIndex: 2, beatFraction: 12, duration: '4', pitch: 'A4' },
      // Bar 3: F
      { id: 'pn3_1a', barIndex: 3, beatFraction: 0, duration: '4', pitch: 'C4' },
      { id: 'pn3_1b', barIndex: 3, beatFraction: 0, duration: '4', pitch: 'F4' },
      { id: 'pn3_1c', barIndex: 3, beatFraction: 0, duration: '4', pitch: 'A4' },
      { id: 'pn3_2a', barIndex: 3, beatFraction: 4, duration: '4', pitch: 'C4' },
      { id: 'pn3_2b', barIndex: 3, beatFraction: 4, duration: '4', pitch: 'F4' },
      { id: 'pn3_2c', barIndex: 3, beatFraction: 4, duration: '4', pitch: 'A4' },
      { id: 'pn3_3a', barIndex: 3, beatFraction: 8, duration: '4', pitch: 'C4' },
      { id: 'pn3_3b', barIndex: 3, beatFraction: 8, duration: '4', pitch: 'F4' },
      { id: 'pn3_3c', barIndex: 3, beatFraction: 8, duration: '4', pitch: 'A4' },
      { id: 'pn3_4a', barIndex: 3, beatFraction: 12, duration: '4', pitch: 'C4' },
      { id: 'pn3_4b', barIndex: 3, beatFraction: 12, duration: '4', pitch: 'F4' },
      { id: 'pn3_4c', barIndex: 3, beatFraction: 12, duration: '4', pitch: 'A4' }
    ]
  },
  {
    id: 'vdm-chord-pop-g',
    title: '4-Chords G-Dur (G - D - Em - C)',
    category: 'Akkorde',
    vdmFolder: 'kadenzen',
    vdmLevel: 'unterstufe',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 84,
    barsCount: 4,
    displayMode: 'notes',
    description: 'Unterstufe: Der Hit-Standard in G-Dur mit 4 simultanen Schlägen pro Takt.',
    tags: ['Pop-Kadenz', 'G-D-Em-C', 'Hit-Schema', '4 Chords'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    chords: [
      { id: 'pg1', barIndex: 0, tickPosition: 0, chordName: 'G' },
      { id: 'pg2', barIndex: 1, tickPosition: 0, chordName: 'D' },
      { id: 'pg3', barIndex: 2, tickPosition: 0, chordName: 'Em' },
      { id: 'pg4', barIndex: 3, tickPosition: 0, chordName: 'C' }
    ],
    notes: [
      // Bar 0: G
      { id: 'pg0_1a', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'B3' },
      { id: 'pg0_1b', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'D4' },
      { id: 'pg0_1c', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'G4' },
      { id: 'pg0_2a', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'B3' },
      { id: 'pg0_2b', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'D4' },
      { id: 'pg0_2c', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'G4' },
      { id: 'pg0_3a', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'B3' },
      { id: 'pg0_3b', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'D4' },
      { id: 'pg0_3c', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'G4' },
      { id: 'pg0_4a', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'B3' },
      { id: 'pg0_4b', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'D4' },
      { id: 'pg0_4c', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'G4' },
      // Bar 1: D
      { id: 'pg1_1a', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'A3' },
      { id: 'pg1_1b', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'D4' },
      { id: 'pg1_1c', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'F#4' },
      { id: 'pg1_2a', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'A3' },
      { id: 'pg1_2b', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'D4' },
      { id: 'pg1_2c', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'F#4' },
      { id: 'pg1_3a', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'A3' },
      { id: 'pg1_3b', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'D4' },
      { id: 'pg1_3c', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'F#4' },
      { id: 'pg1_4a', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'A3' },
      { id: 'pg1_4b', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'D4' },
      { id: 'pg1_4c', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'F#4' },
      // Bar 2: Em
      { id: 'pg2_1a', barIndex: 2, beatFraction: 0, duration: '4', pitch: 'G3' },
      { id: 'pg2_1b', barIndex: 2, beatFraction: 0, duration: '4', pitch: 'B3' },
      { id: 'pg2_1c', barIndex: 2, beatFraction: 0, duration: '4', pitch: 'E4' },
      { id: 'pg2_2a', barIndex: 2, beatFraction: 4, duration: '4', pitch: 'G3' },
      { id: 'pg2_2b', barIndex: 2, beatFraction: 4, duration: '4', pitch: 'B3' },
      { id: 'pg2_2c', barIndex: 2, beatFraction: 4, duration: '4', pitch: 'E4' },
      { id: 'pg2_3a', barIndex: 2, beatFraction: 8, duration: '4', pitch: 'G3' },
      { id: 'pg2_3b', barIndex: 2, beatFraction: 8, duration: '4', pitch: 'B3' },
      { id: 'pg2_3c', barIndex: 2, beatFraction: 8, duration: '4', pitch: 'E4' },
      { id: 'pg2_4a', barIndex: 2, beatFraction: 12, duration: '4', pitch: 'G3' },
      { id: 'pg2_4b', barIndex: 2, beatFraction: 12, duration: '4', pitch: 'B3' },
      { id: 'pg2_4c', barIndex: 2, beatFraction: 12, duration: '4', pitch: 'E4' },
      // Bar 3: C
      { id: 'pg3_1a', barIndex: 3, beatFraction: 0, duration: '4', pitch: 'G3' },
      { id: 'pg3_1b', barIndex: 3, beatFraction: 0, duration: '4', pitch: 'C4' },
      { id: 'pg3_1c', barIndex: 3, beatFraction: 0, duration: '4', pitch: 'E4' },
      { id: 'pg3_2a', barIndex: 3, beatFraction: 4, duration: '4', pitch: 'G3' },
      { id: 'pg3_2b', barIndex: 3, beatFraction: 4, duration: '4', pitch: 'C4' },
      { id: 'pg3_2c', barIndex: 3, beatFraction: 4, duration: '4', pitch: 'E4' },
      { id: 'pg3_3a', barIndex: 3, beatFraction: 8, duration: '4', pitch: 'G3' },
      { id: 'pg3_3b', barIndex: 3, beatFraction: 8, duration: '4', pitch: 'C4' },
      { id: 'pg3_3c', barIndex: 3, beatFraction: 8, duration: '4', pitch: 'E4' },
      { id: 'pg3_4a', barIndex: 3, beatFraction: 12, duration: '4', pitch: 'G3' },
      { id: 'pg3_4b', barIndex: 3, beatFraction: 12, duration: '4', pitch: 'C4' },
      { id: 'pg3_4c', barIndex: 3, beatFraction: 12, duration: '4', pitch: 'E4' }
    ]
  },
  {
    id: 'vdm-chord-inversions-c',
    title: 'Dreiklangs-Umkehrungen C-Dur (Simultan)',
    category: 'Akkorde',
    vdmFolder: 'umkehrungen',
    vdmLevel: 'unterstufe',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 68,
    barsCount: 3,
    displayMode: 'notes',
    description: 'Unterstufe 2: Grundstellung (C-E-G), 1. Umkehrung (E-G-C), 2. Umkehrung (G-C-E) als simultane Akkorde.',
    tags: ['Umkehrungen', 'Sextakkord', 'Quartsextakkord', 'Simultan'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      // Bar 0: Grundstellung
      { id: 'inv1a', barIndex: 0, beatFraction: 0, duration: '2', pitch: 'C4' },
      { id: 'inv1b', barIndex: 0, beatFraction: 0, duration: '2', pitch: 'E4' },
      { id: 'inv1c', barIndex: 0, beatFraction: 0, duration: '2', pitch: 'G4' },
      { id: 'inv2a', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'C4' },
      { id: 'inv2b', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'E4' },
      { id: 'inv2c', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'G4' },
      // Bar 1: 1. Umkehrung (Sextakkord)
      { id: 'inv3a', barIndex: 1, beatFraction: 0, duration: '2', pitch: 'E4' },
      { id: 'inv3b', barIndex: 1, beatFraction: 0, duration: '2', pitch: 'G4' },
      { id: 'inv3c', barIndex: 1, beatFraction: 0, duration: '2', pitch: 'C5' },
      { id: 'inv4a', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'E4' },
      { id: 'inv4b', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'G4' },
      { id: 'inv4c', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'C5' },
      // Bar 2: 2. Umkehrung (Quartsextakkord)
      { id: 'inv5a', barIndex: 2, beatFraction: 0, duration: '2', pitch: 'G4' },
      { id: 'inv5b', barIndex: 2, beatFraction: 0, duration: '2', pitch: 'C5' },
      { id: 'inv5c', barIndex: 2, beatFraction: 0, duration: '2', pitch: 'E5' },
      { id: 'inv6a', barIndex: 2, beatFraction: 8, duration: '2', pitch: 'G4' },
      { id: 'inv6b', barIndex: 2, beatFraction: 8, duration: '2', pitch: 'C5' },
      { id: 'inv6c', barIndex: 2, beatFraction: 8, duration: '2', pitch: 'E5' }
    ]
  },
  {
    id: 'vdm-chord-jazz-ii-v-i',
    title: 'Jazz-Kadenz II - V - I (Dm7 - G7 - Cmaj7)',
    category: 'Akkorde',
    vdmFolder: 'jazz-vierklaenge',
    vdmLevel: 'mittelstufe',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 85,
    barsCount: 3,
    displayMode: 'notes',
    description: 'Mittelstufe: Vierstimmige simultane Jazz-Voicings mit sanfter Stimmführung.',
    tags: ['Jazz', 'II-V-I', 'Septakkorde', 'Vierklänge', 'Simultan'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    chords: [
      { id: 'j1', barIndex: 0, tickPosition: 0, chordName: 'Dm7' },
      { id: 'j2', barIndex: 1, tickPosition: 0, chordName: 'G7' },
      { id: 'j3', barIndex: 2, tickPosition: 0, chordName: 'Cmaj7' }
    ],
    notes: [
      // Bar 0: Dm7 (D-F-A-C)
      { id: 'jn1a', barIndex: 0, beatFraction: 0, duration: '2', pitch: 'D4' },
      { id: 'jn1b', barIndex: 0, beatFraction: 0, duration: '2', pitch: 'F4' },
      { id: 'jn1c', barIndex: 0, beatFraction: 0, duration: '2', pitch: 'A4' },
      { id: 'jn1d', barIndex: 0, beatFraction: 0, duration: '2', pitch: 'C5' },
      { id: 'jn2a', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'D4' },
      { id: 'jn2b', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'F4' },
      { id: 'jn2c', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'A4' },
      { id: 'jn2d', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'C5' },
      // Bar 1: G7 (G-B-D-F -> Voice leading B3-D4-F4-G4)
      { id: 'jn3a', barIndex: 1, beatFraction: 0, duration: '2', pitch: 'B3' },
      { id: 'jn3b', barIndex: 1, beatFraction: 0, duration: '2', pitch: 'D4' },
      { id: 'jn3c', barIndex: 1, beatFraction: 0, duration: '2', pitch: 'F4' },
      { id: 'jn3d', barIndex: 1, beatFraction: 0, duration: '2', pitch: 'G4' },
      { id: 'jn4a', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'B3' },
      { id: 'jn4b', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'D4' },
      { id: 'jn4c', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'F4' },
      { id: 'jn4d', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'G4' },
      // Bar 2: Cmaj7 (C-E-G-B -> C4-E4-G4-B4)
      { id: 'jn5a', barIndex: 2, beatFraction: 0, duration: '1', pitch: 'C4' },
      { id: 'jn5b', barIndex: 2, beatFraction: 0, duration: '1', pitch: 'E4' },
      { id: 'jn5c', barIndex: 2, beatFraction: 0, duration: '1', pitch: 'G4' },
      { id: 'jn5d', barIndex: 2, beatFraction: 0, duration: '1', pitch: 'B4' }
    ]
  },

  // =========================================================================
  // 3. RHYTHMUS & GROOVES
  // =========================================================================
  {
    id: 'vdm-rhythm-quarter-pulse',
    title: 'Viertel-Puls & Pausen-Drill',
    category: 'Rhythmus',
    vdmFolder: 'grundpuls',
    vdmLevel: 'elementar',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 80,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Grundstufe: Viertelnoten im Wechsel mit Viertelpausen. Metronom-Stabilisation.',
    tags: ['Metronom', 'Pausen', 'Grundstufe', 'Timing'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'rq1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'C4' },
      { id: 'rq2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'REST' },
      { id: 'rq3', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'C4' },
      { id: 'rq4', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'REST' },
      { id: 'rq5', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'C4' },
      { id: 'rq6', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'C4' },
      { id: 'rq7', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'C4' },
      { id: 'rq8', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'REST' }
    ]
  },
  {
    id: 'vdm-rhythm-dotted-quarter',
    title: 'Punktierte Viertel & Achtel',
    category: 'Rhythmus',
    vdmFolder: 'punktiert-synkopen',
    vdmLevel: 'unterstufe',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 80,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Unterstufe 1: Klassisches Motiv – punktierte Viertel mit anschließender Achtel.',
    tags: ['Punktierung', 'Rhythmus', 'Klassik'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'rd1', barIndex: 0, beatFraction: 0, duration: '4', isDotted: true, pitch: 'C4' },
      { id: 'rd2', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'D4' },
      { id: 'rd3', barIndex: 0, beatFraction: 8, duration: '4', isDotted: true, pitch: 'E4' },
      { id: 'rd4', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'F4' },
      { id: 'rd5', barIndex: 1, beatFraction: 0, duration: '2', pitch: 'G4' },
      { id: 'rd6', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'C4' }
    ]
  },
  {
    id: 'vdm-rhythm-syncopation',
    title: 'Off-Beat Synkopen-Workout',
    category: 'Rhythmus',
    vdmFolder: 'punktiert-synkopen',
    vdmLevel: 'mittelstufe',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 88,
    barsCount: 2,
    displayMode: 'both',
    description: 'Mittelstufe: Betonung auf den Und-Zählzeiten (Off-Beat) für Funk & Pop.',
    tags: ['Synkope', 'Off-Beat', 'Funk', 'Bass'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'rs1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'REST' },
      { id: 'rs2', barIndex: 0, beatFraction: 2, duration: '4', pitch: 'A3', fret: 0, stringIndex: 4 },
      { id: 'rs3', barIndex: 0, beatFraction: 6, duration: '4', pitch: 'C4', fret: 3, stringIndex: 4 },
      { id: 'rs4', barIndex: 0, beatFraction: 10, duration: '4', pitch: 'D4', fret: 0, stringIndex: 3 },
      { id: 'rs5', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'E4', fret: 2, stringIndex: 3 },
      { id: 'rs6', barIndex: 1, beatFraction: 0, duration: '2', pitch: 'A3', fret: 0, stringIndex: 4 },
      { id: 'rs7', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'REST' }
    ]
  },
  {
    id: 'vdm-rhythm-triplets-drill',
    title: 'Achtel-Triolen & Metronom-Drill',
    category: 'Rhythmus',
    vdmFolder: 'triolen-shuffle',
    vdmLevel: 'mittelstufe',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 85,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Mittelstufe: 3 Triolennoten pro Viertelschlag sauber aufgeteilt.',
    tags: ['Triolen', 'Metronom', 'Drill', 'Schlagzeug'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'rt1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'C4', isTriplet: true },
      { id: 'rt2', barIndex: 0, beatFraction: 1.33, duration: '8', pitch: 'D4', isTriplet: true },
      { id: 'rt3', barIndex: 0, beatFraction: 2.66, duration: '8', pitch: 'E4', isTriplet: true },
      { id: 'rt4', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'C4' },
      { id: 'rt5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'C4', isTriplet: true },
      { id: 'rt6', barIndex: 0, beatFraction: 9.33, duration: '8', pitch: 'D4', isTriplet: true },
      { id: 'rt7', barIndex: 0, beatFraction: 10.66, duration: '8', pitch: 'E4', isTriplet: true },
      { id: 'rt8', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'C4' },
      { id: 'rt9', barIndex: 1, beatFraction: 0, duration: '1', pitch: 'C4' }
    ]
  },
  {
    id: 'vdm-rhythm-waltz-3-4',
    title: '3/4 Takt Walzer-Begleitung',
    category: 'Rhythmus',
    vdmFolder: 'ungerade',
    vdmLevel: 'unterstufe',
    instrument: 'universal',
    timeSignature: '3/4',
    tempoBpm: 108,
    barsCount: 3,
    displayMode: 'notes',
    description: 'Unterstufe 1: Bass auf Zählzeit 1, Akkord-Nachschläge auf 2 und 3.',
    tags: ['3/4 Takt', 'Walzer', 'Begleitung'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'rw1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'C3' },
      { id: 'rw2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'E4' },
      { id: 'rw3', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'G4' },
      { id: 'rw4', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'G3' },
      { id: 'rw5', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'D4' },
      { id: 'rw6', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'F4' },
      { id: 'rw7', barIndex: 2, beatFraction: 0, duration: '2', isDotted: true, pitch: 'C3' }
    ],
    projections: {
      drums: {
        instrument: 'drums',
        clef: 'percussion',
        displayMode: 'notes',
        description: 'Schlagzeug 3/4 Walzer (PAS-Standard): Bass Drum auf 1, Snare auf 2 und 3, durchgehende Hi-Hat auf allen 3 Vierteln.',
        notes: [
          // Takt 1
          { id: 'wz0_hh0', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'G5' },
          { id: 'wz0_bd0', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'F4' },
          { id: 'wz0_hh4', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'G5' },
          { id: 'wz0_sd4', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'C5' },
          { id: 'wz0_hh8', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'G5' },
          { id: 'wz0_sd8', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'C5' },
          // Takt 2
          { id: 'wz1_hh0', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'G5' },
          { id: 'wz1_bd0', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'F4' },
          { id: 'wz1_hh4', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'G5' },
          { id: 'wz1_sd4', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'C5' },
          { id: 'wz1_hh8', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'G5' },
          { id: 'wz1_sd8', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'C5' },
          // Takt 3: Akzentuierter Schlusstakt
          { id: 'wz2_cr0', barIndex: 2, beatFraction: 0, duration: '4', pitch: 'A5' },
          { id: 'wz2_bd0', barIndex: 2, beatFraction: 0, duration: '4', pitch: 'F4' }
        ]
      }
    }
  },
  ...VDM_DRUM_SCORE_SNIPPETS,

  // =========================================================================
  // 4. WARM-UPS & FINGER-FITNESS
  // =========================================================================
  {
    id: 'vdm-tech-hanon-no1',
    title: 'Hanon No. 1 Fingerunabhängigkeit',
    category: 'Technik',
    vdmFolder: 'klavier-hanon',
    vdmLevel: 'unterstufe',
    instrument: 'piano',
    timeSignature: '4/4',
    tempoBpm: 72,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Unterstufe 2: Gleichmäßiger Anschlag und Fingerunabhängigkeit für alle 5 Finger.',
    tags: ['Hanon', 'Klavier', 'Fingerkraft', 'Legato'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'th1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'C4' },
      { id: 'th2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'E4' },
      { id: 'th3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'F4' },
      { id: 'th4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'G4' },
      { id: 'th5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'A4' },
      { id: 'th6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'G4' },
      { id: 'th7', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'F4' },
      { id: 'th8', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'E4' },
      { id: 'th9', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'D4' },
      { id: 'th10', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'F4' },
      { id: 'th11', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'G4' },
      { id: 'th12', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'A4' },
      { id: 'th13', barIndex: 1, beatFraction: 8, duration: '8', pitch: 'B4' },
      { id: 'th14', barIndex: 1, beatFraction: 10, duration: '8', pitch: 'A4' },
      { id: 'th15', barIndex: 1, beatFraction: 12, duration: '8', pitch: 'G4' },
      { id: 'th16', barIndex: 1, beatFraction: 14, duration: '8', pitch: 'F4' }
    ]
  },
  {
    id: 'vdm-tech-spider-guitar',
    title: 'Spider-Exercise (1-2-3-4 Wechselschlag)',
    category: 'Technik',
    vdmFolder: 'gitarre-spider',
    vdmLevel: 'unterstufe',
    instrument: 'guitar',
    timeSignature: '4/4',
    tempoBpm: 75,
    barsCount: 2,
    displayMode: 'both',
    description: 'Unterstufe 1: Wechselschlag (i-m oder Plektrum) über Bund 1 bis 4 auf E- und A-Saite.',
    tags: ['Spider', 'Gitarre', 'Wechselschlag', 'Finger-Fitness'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'ts1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'F3', fret: 1, stringIndex: 5 },
      { id: 'ts2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'F#3', fret: 2, stringIndex: 5 },
      { id: 'ts3', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'G3', fret: 3, stringIndex: 5 },
      { id: 'ts4', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'G#3', fret: 4, stringIndex: 5 },
      { id: 'ts5', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'A#3', fret: 1, stringIndex: 4 },
      { id: 'ts6', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'B3', fret: 2, stringIndex: 4 },
      { id: 'ts7', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'C4', fret: 3, stringIndex: 4 },
      { id: 'ts8', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'C#4', fret: 4, stringIndex: 4 }
    ]
  },
  {
    id: 'vdm-tech-long-tones-wind',
    title: 'Long Tones & Stütze (p < f > p)',
    category: 'Technik',
    vdmFolder: 'blaeser-longtones',
    vdmLevel: 'elementar',
    instrument: 'trumpet',
    timeSignature: '4/4',
    tempoBpm: 60,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Grundstufe: Gleichmäßiger Luftstrom, Intonations-Haltebogen und Dynamikschwellung.',
    tags: ['Long Tones', 'Bläser', 'Trompete', 'Intonation', 'Atmung'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'tlt1', barIndex: 0, beatFraction: 0, duration: '1', pitch: 'G4' },
      { id: 'tlt2', barIndex: 1, beatFraction: 0, duration: '1', pitch: 'C5' }
    ]
  },
  {
    id: 'vdm-tech-paradiddle-drums',
    title: 'Paradiddle Stick-Control (R-L-R-R L-R-L-L)',
    category: 'Technik',
    vdmFolder: 'drums-rudiments',
    vdmLevel: 'unterstufe',
    instrument: 'drums',
    clef: 'percussion',
    timeSignature: '4/4',
    tempoBpm: 80,
    barsCount: 2,
    displayMode: 'notes',
    description: 'Unterstufe 1: Das fundamentale Rudiment für saubere Stockkontrolle und Akzente auf der Snare (C5).',
    tags: ['Paradiddle', 'Drums', 'Stick Control', 'Rudiment'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'tpd1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'C5' },
      { id: 'tpd2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'C5' },
      { id: 'tpd3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'C5' },
      { id: 'tpd4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'C5' },
      { id: 'tpd5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'C5' },
      { id: 'tpd6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'C5' },
      { id: 'tpd7', barIndex: 0, beatFraction: 12, duration: '8', pitch: 'C5' },
      { id: 'tpd8', barIndex: 0, beatFraction: 14, duration: '8', pitch: 'C5' },
      { id: 'tpd9', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'C5' },
      { id: 'tpd10', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'E5' },
      { id: 'tpd11', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'C5' }
    ]
  },
  ...VDM_EMP_SCORE_SNIPPETS,
  ...VDM_GUITAR_UKE_SNIPPETS,
  ...VDM_INSTRUMENTAL_WARMUPS,
  ...VDM_BAND_SYNC_PACKS,
  ...BESTOF_CURRICULUM_EXPANSION,
  ...INSTRUMENT_CURRICULUM_EXPANSION,
  ...VDM_MASTERPIECE_CURRICULUM_EXPANSION
];
