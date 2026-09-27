import React from "react";

export interface StudentSongsTabProps {
  activeTab?: string;
  progressLoading?: boolean;
  assignedCampusSongs?: any[];
  lehrwerke?: any[];
  isMobile?: boolean;
  studentUser?: any;
  studentId?: string;
  juniorMediathekFilter?: "all" | "songs" | "lehrwerke" | "homework" | "mastered";
  setJuniorMediathekFilter?: (filter: "all" | "songs" | "lehrwerke" | "homework" | "mastered") => void;
  songSearch?: string;
  setSongSearch?: (s: string) => void;
  songSearchDebounced?: string;
  progressItems?: any[];
  setSelectedTopic?: (topic: string) => void;
  handleTabChangeLocal?: (tab: string, skipResetHwTab?: boolean) => void;
  setSelectedSongForDetail?: (song: any) => void;
  setCertificateSong?: (song: any) => void;
  setSelectedLehrwerkForDetail?: (lehrwerk: any) => void;
  isSongMastered?: (song: any) => boolean;
  localProgress?: any[];
  activeSongSkills?: any[];
  isMusicStandMode?: boolean;
}

// 🎼 Strikte Titel-Bereinigung: Entfernt jegliche Instrumenten-, Arrangement- & Format-Zusätze
export const cleanCanonicalSongTitle = (rawTitle?: string): string => {
  if (!rawTitle) return 'Unbekannter Song';
  return rawTitle
    .replace(/\s*\((?:gitarre|guitar|bass|drums|schlagzeug|klavier|piano|gesang|vocals|lead|arrangement|song|playback|text|audio)[^)]*\)/gi, '')
    .replace(/\s*-\s*(?:gitarre|guitar|bass|drums|schlagzeug|klavier|piano|gesang)/gi, '')
    .trim() || rawTitle.trim();
};

// 🎼 Strikte Interpreten-Bereinigung: Entfernt (text) etc. & normalisiert Typos
export const cleanCanonicalArtistName = (rawArtist?: string): string => {
  if (!rawArtist) return 'Unbekannt';
  let clean = rawArtist
    .replace(/\s*\([^)]*\)/gi, '')
    .replace(/\s*-\s*(?:text|lyrics|gesang|vocals).*/gi, '')
    .trim();
  const lower = clean.toLowerCase();
  if (lower === 'linken park') return 'Linkin Park';
  if (lower === 'acdc' || lower === 'ac dc' || lower === 'ac/dc') return 'AC/DC';
  return clean || 'Unbekannt';
};

// 🎼 Rückwärtskompatibler Alias
export const normalizeArtistName = cleanCanonicalArtistName;

/**
 * 🎵 Mediathek / Songs Tab (Abgelöst & Entfernt)
 * Das separate Mediathek-Board wurde nach Nutzerentscheid vollständig entfernt.
 * Alle Repertoire-, Hausaufgaben- und Lehrwerks-Funktionen leben im Aufgabenheft (homework_book).
 */
export const StudentSongsTab: React.FC<StudentSongsTabProps> = () => null;

export default StudentSongsTab;
