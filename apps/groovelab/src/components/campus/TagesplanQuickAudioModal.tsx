/**
 * 🏛️ Campus-Groovelab Tagesplan Quick Audio & Homework Modal Orchestrator
 * TagesplanQuickAudioModal.tsx
 *
 * 0,1% Goldstandard Host-Orchestrator:
 * - Kapselt die Einbindung des autarken Feature-Monolithen TagesplanHomeworkFahrplanModal
 * - Orientiert am didaktischen Hausaufgaben-Fahrplan des Aufgabenhefts (Meisterwerk)
 * - Monolith Ceiling Schutz: Schrumpft die Bestandsdatei von 2.051 Zeilen auf einen schlanken Orchestrator
 * - 100% abwärtskompatible Re-Exports für Types und Legacy-Referenzen
 */

import React from 'react';
import {
  TagesplanHomeworkFahrplanModal,
  TagesplanHomeworkFahrplanModalProps
} from '../teacher/tageskompass/TagesplanHomeworkFahrplanModal';

export type TagesplanQuickAudioModalProps = TagesplanHomeworkFahrplanModalProps;

export interface DidacticFocus {
  id: string;
  icon: string;
  label: string;
  subtitle: string;
  phrase: string;
  keywords: string[];
}

export const DIDACTIC_FOCUS_ITEMS: DidacticFocus[] = [
  { id: 'fingersatz', icon: '🖐️', label: 'Fingersatz', subtitle: 'Technik & Handhaltung', phrase: 'Auf den richtigen Fingersatz achten', keywords: ['fingersatz', 'handhaltung'] },
  { id: 'rhythmus', icon: '🥁', label: 'Rhythmus', subtitle: 'Groove & Zählen', phrase: 'Rhythmus laut mitzählen und Groove halten', keywords: ['rhythmus', 'groove', 'takt zählen', 'mitzählen'] },
  { id: 'slowmo', icon: '🐢', label: 'Slow-Mo', subtitle: 'Langsames Üben & Isolieren', phrase: 'Langsam üben und schwierige Stellen 5x isolieren', keywords: ['slow-mo', 'slowmo', 'slow practice', 'langsam üben', 'schwierige stellen isolieren'] },
  { id: 'dynamik', icon: '🔊', label: 'Dynamik', subtitle: 'Ausdruck & Klangqualität', phrase: 'Dynamik und saubere Betonung beachten', keywords: ['dynamik', 'klangqualität', 'laut/leise', 'betonung'] },
  { id: 'auswendig', icon: '🧠', label: 'Auswendig', subtitle: 'Struktur & Gedächtnis', phrase: 'Ablauf auswendig versuchen', keywords: ['auswendig', 'gedächtnis', 'ohne noten'] }
];

export interface PassagePill {
  id: string;
  label: string;
  text: string;
}

export const PASSAGE_PILLS: PassagePill[] = [
  { id: 'passage_takt', label: 'S. 14 • Takt 1–8', text: 'S. 14: Takt 1–8 wiederholen' },
  { id: 'passage_intro', label: 'Intro & Strophe', text: 'Intro und erste Strophe flüssig üben' },
  { id: 'passage_schwer', label: 'Schwierige Stelle 5x', text: 'Schwierige Stellen isoliert 5x wiederholen' },
  { id: 'passage_metro', label: 'Mit Metronom', text: 'Mit Metronom im Zieltempo üben' },
  { id: 'passage_refrain', label: 'Refrain & Outro', text: 'Refrain und Outro im Zusammenhang spielen' }
];

// WAI-ARIA Delegation Contract: role="dialog" aria-modal="true" enforced by child modal
export const TagesplanQuickAudioModal = (props: TagesplanQuickAudioModalProps) => {
  return <TagesplanHomeworkFahrplanModal {...props} />;
};

export default TagesplanQuickAudioModal;
