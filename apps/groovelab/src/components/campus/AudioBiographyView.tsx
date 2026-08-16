import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, Pause, Mic, Square, Shield, Lock, Unlock, Share2, Check, Star, Award, 
  Sparkles, Volume2, VolumeX, RotateCcw, Copy, ExternalLink, Calendar, Disc, Clock, 
  Info, Sliders, Music, Zap, Flame, Heart, Upload, MessageSquare, MessageCircle, ChevronRight,
  ChevronLeft, FileText, X, AlertCircle, ChevronDown, ListMusic, SkipForward, SkipBack, Gift, Bell, Lightbulb,
  Sun, Moon, CheckCircle2, History, Plus, Trash2, Edit3, SlidersHorizontal, Radio, Layers, Download,
  Folder, FolderOpen, BookOpen, Trophy, Maximize2
} from 'lucide-react';

import { supabase } from '../../lib/supabase';
import { processStudioMastering, processDualMastering, DualMasteringResult, MasteringProfile } from '../../utils/audioMasteringEngine';
import { storeBlob, getBlob, deleteBlob } from '../../utils/blobStorage';


export interface MilestoneData {
  id: string;
  type: 'first_tone' | 'first_scale' | 'first_song' | 'happy_birthday' | 'first_christmas_song' | 'first_solo' | 'first_own_song' | 'hardest_piece' | 'favorite_song';
  title: string;
  subtitle: string;
  stepNumber: number;
  iconName: 'sparkles' | 'sliders' | 'music' | 'gift' | 'bell' | 'zap' | 'lightbulb' | 'flame' | 'heart';
  audioUrl?: string;
  masteredAudioUrl?: string;
  duration?: number;
  recordedAt?: string;
  isVerified?: boolean;
  isUnerasable?: boolean;
  visibility: 'private' | 'teacher_allowed';
  version: number;
  personalNote?: string;
  schoolYear?: string;
  preferredVersion?: 'master' | 'raw';
}

export interface CustomPlaylistTrack {
  id: string;
  title: string;
  subtitle?: string;
  audioUrl: string;
  masteredAudioUrl?: string;
  duration?: number;
  recordedAt?: string;
  personalNote?: string;
  preferredVersion?: 'master' | 'raw';
  reverbWetMix?: number;
}


export interface CustomPlaylist {
  id: string;
  title: string;
  description?: string;
  vibeTheme: 'sunset_gold' | 'midnight_neon' | 'forest_emerald' | 'royal_ruby' | 'vintage_charcoal' | 'ocean_cyan' | 'vintage_tape' | 'ocean_breeze' | 'cyber_neon' | 'royal_velvet' | 'emerald_studio' | 'christmas_gold';
  iconName: string;
  coverPresetId?: string;
  schoolYear?: string;
  tracks: CustomPlaylistTrack[];
  createdAt: string;
}

export interface SchoolYearCoverConfig {
  vol: number;
  volLabel: string;
  themeTitle: string;
  subTitle: string;
  gradient: string;
  accentColor: string;
  badge: string;
  iconName: string;
}

export const SCHOOL_YEAR_COVERS: SchoolYearCoverConfig[] = [
  { vol: 1, volLabel: 'VOL. 01', themeTitle: 'FIRST NOTES', subTitle: '1. Lernjahr • Start & Erste Töne', gradient: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)', accentColor: '#10b981', badge: '1. LERNJAHR', iconName: 'sparkles' },
  { vol: 2, volLabel: 'VOL. 02', themeTitle: 'RISING RHYTHM', subTitle: '2. Lernjahr • Timing & Rhythmus', gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fbbf24 100%)', accentColor: '#f97316', badge: '2. LERNJAHR', iconName: 'sliders' },
  { vol: 3, volLabel: 'VOL. 03', themeTitle: 'MELODY FLOW', subTitle: '3. Lernjahr • Melodien & Phrasierung', gradient: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 50%, #38bdf8 100%)', accentColor: '#06b6d4', badge: '3. LERNJAHR', iconName: 'music' },
  { vol: 4, volLabel: 'VOL. 04', themeTitle: 'SOUND HORIZON', subTitle: '4. Lernjahr • Harmonik & Klangfarben', gradient: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #c084fc 100%)', accentColor: '#8b5cf6', badge: '4. LERNJAHR', iconName: 'zap' },
  { vol: 5, volLabel: 'VOL. 05', themeTitle: 'HALFTIME MASTER', subTitle: '5. Lernjahr • Halbzeit & Meilensteine', gradient: 'linear-gradient(135deg, #b45309 0%, #d97706 50%, #fde047 100%)', accentColor: '#f59e0b', badge: '5. LERNJAHR', iconName: 'trophy' },
  { vol: 6, volLabel: 'VOL. 06', themeTitle: 'GROOVE ENGINE', subTitle: '6. Lernjahr • Dynamik & Band-Drive', gradient: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 50%, #fb7185 100%)', accentColor: '#f43f5e', badge: '6. LERNJAHR', iconName: 'disc' },
  { vol: 7, volLabel: 'VOL. 07', themeTitle: 'HARMONY VIBES', subTitle: '7. Lernjahr • Mehrstimmigkeit & Tiefe', gradient: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #5eead4 100%)', accentColor: '#14b8a6', badge: '7. LERNJAHR', iconName: 'headphones' },
  { vol: 8, volLabel: 'VOL. 08', themeTitle: 'VIRTUOSO TRACKS', subTitle: '8. Lernjahr • Virtuoses Repertoire', gradient: 'linear-gradient(135deg, #4338ca 0%, #6366f1 50%, #a855f7 100%)', accentColor: '#6366f1', badge: '8. LERNJAHR', iconName: 'flame' },
  { vol: 9, volLabel: 'VOL. 09', themeTitle: 'MASTERWORKS', subTitle: '9. Lernjahr • Große Werke & Soli', gradient: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #64748b 100%)', accentColor: '#94a3b8', badge: '9. LERNJAHR', iconName: 'award' },
  { vol: 10, volLabel: 'VOL. 10', themeTitle: 'DECADE LEGEND', subTitle: '10. Lernjahr • Meisterklasse & Jubiläum', gradient: 'linear-gradient(135deg, #18181b 0%, #ca8a04 50%, #fef08a 100%)', accentColor: '#eab308', badge: '10. JUBILÄUM', iconName: 'trophy' }
];

export interface UniversalPlaylistCoverConfig {
  id: string;
  category: 'kids' | 'urban_vibes' | 'classic_jazz' | 'events_stage';
  categoryLabel: string;
  defaultTitle: string;
  subTitle: string;
  gradient: string;
  accentColor: string;
  badge: string;
  iconName: string;
  emoji: string;
  vibeTheme: CustomPlaylist['vibeTheme'];
}

export const UNIVERSAL_PLAYLIST_COVERS: UniversalPlaylistCoverConfig[] = [
  // 1. Kids & Einsteiger (5)
  {
    id: 'cov_gaming_xp',
    category: 'kids',
    categoryLabel: 'Kids & Einsteiger',
    defaultTitle: 'Gaming & XP Level-Up',
    subTitle: 'Pixel Sound, Boss Themes & Highscores',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 50%, #10b981 100%)',
    accentColor: '#06b6d4',
    badge: 'GAMING XP',
    iconName: 'zap',
    emoji: '🎮',
    vibeTheme: 'cyber_neon'
  },
  {
    id: 'cov_comic_pop',
    category: 'kids',
    categoryLabel: 'Kids & Einsteiger',
    defaultTitle: 'Bubblegum Comic Pop',
    subTitle: 'Gute Laune, Spass & bunte Melodien',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 50%, #fbbf24 100%)',
    accentColor: '#ec4899',
    badge: 'COMIC POP',
    iconName: 'sparkles',
    emoji: '🍬',
    vibeTheme: 'cyber_neon'
  },
  {
    id: 'cov_magic_sounds',
    category: 'kids',
    categoryLabel: 'Kids & Einsteiger',
    defaultTitle: 'Zauberklänge & Märchen',
    subTitle: 'Magische Melodien & Fantasiereisen',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
    accentColor: '#8b5cf6',
    badge: 'MAGIC SOUNDS',
    iconName: 'sparkles',
    emoji: '✨',
    vibeTheme: 'midnight_neon'
  },
  {
    id: 'cov_animal_groove',
    category: 'kids',
    categoryLabel: 'Kids & Einsteiger',
    defaultTitle: 'Dschungel & Tier-Grooves',
    subTitle: 'Wilde Rhythmen & lustige Tierlieder',
    gradient: 'linear-gradient(135deg, #15803d 0%, #84cc16 50%, #eab308 100%)',
    accentColor: '#84cc16',
    badge: 'ANIMAL GROOVE',
    iconName: 'music',
    emoji: '🦁',
    vibeTheme: 'forest_emerald'
  },
  {
    id: 'cov_first_songs',
    category: 'kids',
    categoryLabel: 'Kids & Einsteiger',
    defaultTitle: 'Meine ersten Songs',
    subTitle: 'Die allerersten Lieblingslieder',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #38bdf8 100%)',
    accentColor: '#f59e0b',
    badge: 'FIRST SONGS',
    iconName: 'heart',
    emoji: '🌱',
    vibeTheme: 'sunset_gold'
  },

  // 2. Pop, Rock & Urban Vibes (5)
  {
    id: 'cov_chart_hits',
    category: 'urban_vibes',
    categoryLabel: 'Pop, Rock & Beats',
    defaultTitle: 'Top Hits & Radio Charts',
    subTitle: 'Aktuelle Chart-Hits & Ohrwürmer',
    gradient: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 50%, #ec4899 100%)',
    accentColor: '#06b6d4',
    badge: 'CHART HITS',
    iconName: 'music',
    emoji: '🔥',
    vibeTheme: 'cyber_neon'
  },
  {
    id: 'cov_rock_garage',
    category: 'urban_vibes',
    categoryLabel: 'Pop, Rock & Beats',
    defaultTitle: 'Rock Garage & Distortion',
    subTitle: 'Riffs, Power-Chords & Drive',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #b91c1c 50%, #f97316 100%)',
    accentColor: '#ef4444',
    badge: 'ROCK GARAGE',
    iconName: 'flame',
    emoji: '🎸',
    vibeTheme: 'royal_ruby'
  },
  {
    id: 'cov_lofi_chill',
    category: 'urban_vibes',
    categoryLabel: 'Pop, Rock & Beats',
    defaultTitle: 'Lo-Fi Beats & Chillout',
    subTitle: 'Relaxte Akkorde & Study Flow',
    gradient: 'linear-gradient(135deg, #818cf8 0%, #c084fc 50%, #f472b6 100%)',
    accentColor: '#c084fc',
    badge: 'LO-FI CHILL',
    iconName: 'headphones',
    emoji: '☕',
    vibeTheme: 'midnight_neon'
  },
  {
    id: 'cov_urban_trap',
    category: 'urban_vibes',
    categoryLabel: 'Pop, Rock & Beats',
    defaultTitle: 'Urban Flow & 808 Beats',
    subTitle: 'Hip-Hop Vibes, Trap & Flow',
    gradient: 'linear-gradient(135deg, #09090b 0%, #18181b 50%, #10b981 100%)',
    accentColor: '#10b981',
    badge: 'URBAN FLOW',
    iconName: 'disc',
    emoji: '🕶️',
    vibeTheme: 'emerald_studio'
  },
  {
    id: 'cov_summer_vibes',
    category: 'urban_vibes',
    categoryLabel: 'Pop, Rock & Beats',
    defaultTitle: 'Sommerhits & Beach Jam',
    subTitle: 'Sonnige Klänge & Urlaubsfeeling',
    gradient: 'linear-gradient(135deg, #ea580c 0%, #f59e0b 50%, #06b6d4 100%)',
    accentColor: '#f59e0b',
    badge: 'SUMMER JAM',
    iconName: 'sun',
    emoji: '☀️',
    vibeTheme: 'ocean_breeze'
  },

  // 3. Klassik, Jazz & Akustik (5)
  {
    id: 'cov_classical_gold',
    category: 'classic_jazz',
    categoryLabel: 'Klassik & Jazz',
    defaultTitle: 'Klassik Meisterwerke',
    subTitle: 'Große Meister, Sonaten & Etüden',
    gradient: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #d97706 100%)',
    accentColor: '#d97706',
    badge: 'KLASSIK MEISTER',
    iconName: 'award',
    emoji: '🎻',
    vibeTheme: 'forest_emerald'
  },
  {
    id: 'cov_piano_dreams',
    category: 'classic_jazz',
    categoryLabel: 'Klassik & Jazz',
    defaultTitle: 'Piano Dreams & Balladen',
    subTitle: 'Sanfte Tastenklänge & Emotionen',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #6366f1 100%)',
    accentColor: '#6366f1',
    badge: 'PIANO DREAMS',
    iconName: 'music',
    emoji: '🎹',
    vibeTheme: 'midnight_neon'
  },
  {
    id: 'cov_smooth_jazz',
    category: 'classic_jazz',
    categoryLabel: 'Klassik & Jazz',
    defaultTitle: 'Smooth Jazz & Soul Lounge',
    subTitle: 'Groovige Akkorde, Swing & Improvisation',
    gradient: 'linear-gradient(135deg, #78350f 0%, #b45309 50%, #f59e0b 100%)',
    accentColor: '#f59e0b',
    badge: 'JAZZ LOUNGE',
    iconName: 'music',
    emoji: '🎷',
    vibeTheme: 'sunset_gold'
  },
  {
    id: 'cov_acoustic_camp',
    category: 'classic_jazz',
    categoryLabel: 'Klassik & Jazz',
    defaultTitle: 'Acoustic Guitar & Unplugged',
    subTitle: 'Fingerpicking & Lagerfeuer-Songs',
    gradient: 'linear-gradient(135deg, #27272a 0%, #3f3f46 50%, #059669 100%)',
    accentColor: '#059669',
    badge: 'UNPLUGGED',
    iconName: 'music',
    emoji: '🪕',
    vibeTheme: 'vintage_charcoal'
  },
  {
    id: 'cov_cinema_score',
    category: 'classic_jazz',
    categoryLabel: 'Klassik & Jazz',
    defaultTitle: 'Filmscore & Epische Soundtracks',
    subTitle: 'Großes Kino & heroische Orchester-Sounds',
    gradient: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #38bdf8 100%)',
    accentColor: '#38bdf8',
    badge: 'CINEMA SCORE',
    iconName: 'award',
    emoji: '🎬',
    vibeTheme: 'royal_velvet'
  },

  // 4. Events, Bühne & Saison (5)
  {
    id: 'cov_christmas_magic',
    category: 'events_stage',
    categoryLabel: 'Bühne & Saison',
    defaultTitle: 'Weihnachten & Winterzauber',
    subTitle: 'Festliche Klänge für Heiligabend',
    gradient: 'linear-gradient(135deg, #991b1b 0%, #b91c1c 50%, #f59e0b 100%)',
    accentColor: '#f59e0b',
    badge: 'WEIHNACHTEN',
    iconName: 'gift',
    emoji: '🎄',
    vibeTheme: 'christmas_gold'
  },
  {
    id: 'cov_stage_live',
    category: 'events_stage',
    categoryLabel: 'Bühne & Saison',
    defaultTitle: 'Konzert & Live Auftritt',
    subTitle: 'Bühnenreif vorbereitet fürs Scheinwerferlicht',
    gradient: 'linear-gradient(135deg, #581c87 0%, #7e22ce 50%, #f43f5e 100%)',
    accentColor: '#f43f5e',
    badge: 'STAGE LIVE',
    iconName: 'trophy',
    emoji: '🏆',
    vibeTheme: 'royal_velvet'
  },
  {
    id: 'cov_exam_prep',
    category: 'events_stage',
    categoryLabel: 'Bühne & Saison',
    defaultTitle: 'Prüfungs- & Vorspiel-Repertoire',
    subTitle: 'Präzise & punktgenau einstudiert',
    gradient: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #06b6d4 100%)',
    accentColor: '#06b6d4',
    badge: 'PRÜFUNG & VORSPIEL',
    iconName: 'sliders',
    emoji: '🎯',
    vibeTheme: 'midnight_neon'
  },
  {
    id: 'cov_favorites_heart',
    category: 'events_stage',
    categoryLabel: 'Bühne & Saison',
    defaultTitle: 'Meine absoluten Lieblingsstücke',
    subTitle: 'Herzens-Songs, die ich immer wieder spiele',
    gradient: 'linear-gradient(135deg, #be123c 0%, #e11d48 50%, #f43f5e 100%)',
    accentColor: '#f43f5e',
    badge: 'FAVORITES',
    iconName: 'heart',
    emoji: '❤️',
    vibeTheme: 'vintage_tape'
  },
  {
    id: 'cov_band_jam',
    category: 'events_stage',
    categoryLabel: 'Bühne & Saison',
    defaultTitle: 'Band-Probe & Jam-Session',
    subTitle: 'Zusammen grooven & Ensemblespiel',
    gradient: 'linear-gradient(135deg, #1e293b 0%, #ca8a04 50%, #facc15 100%)',
    accentColor: '#facc15',
    badge: 'BAND & ENSEMBLE',
    iconName: 'disc',
    emoji: '🥁',
    vibeTheme: 'sunset_gold'
  }
];

interface SchoolYearLP {
  id: string;
  year: string;
  title: string;
  subtitle: string;
  accentColor: string;
  gradient: string;
  isCurrent: boolean;
  volNum: number;
  volLabel: string;
  themeTitle: string;
  tracksCount: number;
  totalDurationMin: number;
}

interface AudioBiographyViewProps {
  student: any;
  teacherId?: string;
  isTeacher?: boolean;
  onBackToHub: () => void;
  isMobileOrSim?: boolean;
}

const VIBE_THEMES = [
  { id: 'christmas_gold', name: 'Christmas Cathedral', color: '#d97706', gradient: 'linear-gradient(135deg, #b45309 0%, #78350f 50%, #d97706 100%)', desc: 'Festlicher Glanz & Kathedralenhall' },
  { id: 'sunset_gold', name: 'Sunset Gold', color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', desc: 'Warm & Akustisch' },
  { id: 'midnight_neon', name: 'Midnight Neon', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)', desc: 'Modern & Synthesizer' },
  { id: 'forest_emerald', name: 'Forest Emerald', color: '#10b981', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', desc: 'Klassik & Natur' },
  { id: 'royal_ruby', name: 'Royal Ruby', color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', desc: 'Konzertsaal & Gala' },
  { id: 'vintage_charcoal', name: 'Vintage Vinyl', color: '#64748b', gradient: 'linear-gradient(135deg, #475569 0%, #1e293b 100%)', desc: 'Analoges Tonstudio' },
  { id: 'ocean_cyan', name: 'Ocean Cyan', color: '#06b6d4', gradient: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)', desc: 'Frisch & Melodisch' },
  { id: 'vintage_tape', name: 'Vintage Tape', color: '#e11d48', gradient: 'linear-gradient(135deg, #e11d48 0%, #be123c 50%, #881337 100%)', desc: 'Festlich & Bandwärme' },
  { id: 'ocean_breeze', name: 'Ocean Breeze', color: '#0284c7', gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #075985 100%)', desc: 'Sommer & Urlaubs-Vibes' },
  { id: 'cyber_neon', name: 'Cyber Neon', color: '#ec4899', gradient: 'linear-gradient(135deg, #ec4899 0%, #d946ef 50%, #a855f7 100%)', desc: 'Pop-Star & Charts' },
  { id: 'royal_velvet', name: 'Royal Velvet', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 50%, #4c1d95 100%)', desc: 'Bühnenreif & Festlich' },
  { id: 'emerald_studio', name: 'Emerald Studio', color: '#10b981', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)', desc: 'Campus-Grün & Erfolg' }
];

export interface PlaylistTemplate {
  id: string;
  title: string;
  description: string;
  vibeTheme: CustomPlaylist['vibeTheme'];
  iconName: string;
  emoji: string;
  tag: string;
}

export const PEDAGOGICAL_PLAYLIST_TEMPLATES: PlaylistTemplate[] = [
  {
    id: 'tpl_weihnachten',
    title: '🎄 Meine Weihnachts-Playlist',
    description: 'Festliche Klänge für Heiligabend, Familie & Freunde',
    vibeTheme: 'vintage_tape',
    iconName: 'gift',
    emoji: '🎄',
    tag: 'Saisonal (Winter)'
  },
  {
    id: 'tpl_sommerhits',
    title: '☀️ Meine Sommerhits & Sommerkonzert',
    description: 'Highlights zum Schuljahresabschluss & Urlaubsvibes',
    vibeTheme: 'ocean_breeze',
    iconName: 'sun',
    emoji: '☀️',
    tag: 'Saisonal (Sommer)'
  },
  {
    id: 'tpl_lieblingssongs',
    title: '⭐ Meine absoluten Lieblingssongs',
    description: 'Tracks, die ich einfach immer wieder gerne spiele',
    vibeTheme: 'cyber_neon',
    iconName: 'heart',
    emoji: '⭐',
    tag: 'Lieblingsstücke'
  },
  {
    id: 'tpl_konzert',
    title: '🏆 Mein Konzert- & Vorspiel-Repertoire',
    description: 'Auf den Punkt vorbereitet für den großen Auftritt & Prüfungen',
    vibeTheme: 'royal_velvet',
    iconName: 'trophy',
    emoji: '🏆',
    tag: 'Bühne & Prüfung'
  },
  {
    id: 'tpl_vorher_nachher',
    title: '🌱 Mein Start: Vorher & Nachher',
    description: 'Vom allerersten Ton bis zu meinen heutigen Fortschritten',
    vibeTheme: 'emerald_studio',
    iconName: 'sparkles',
    emoji: '🌱',
    tag: 'Entwicklung'
  },
  {
    id: 'tpl_band',
    title: '🥁 Groove & Band-Session',
    description: 'Gemeinsam grooven – Songs aus Bandprobe & Ensemble',
    vibeTheme: 'sunset_gold',
    iconName: 'disc',
    emoji: '🥁',
    tag: 'Band & Ensemble'
  }
];

/**
 * Dynamically computes active music school years starting from student registration date (created_at).
 * Includes the timeless golden Milestone-LP and active school year albums mapped to 10-year rotational cover series.
 */
export function computeActiveSchoolYears(createdAt?: string): SchoolYearLP[] {
  let regStartYear = 2026;
  if (createdAt) {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      // Month < 8 (Jan-Aug) belongs to school year starting in year - 1
      regStartYear = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
    }
  }

  const now = new Date();
  const currentStartYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const maxYear = Math.max(currentStartYear, 2026);
  const minYear = Math.min(regStartYear, maxYear);

  const yearsList: SchoolYearLP[] = [];

  // 🌟 Goldene Meilenstein-LP (Zeitlos • Lebenswerk über alle Jahre)
  yearsList.push({
    id: 'lp_timeless_master',
    year: '🌟 Meilenstein-LP',
    title: '🌟 Meine Meilenstein-LP (Zeitlos)',
    subtitle: 'Mein musikalisches Lebenswerk – Alle Meilensteine',
    accentColor: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    isCurrent: false,
    volNum: 0,
    volLabel: 'MEISTER-LP',
    themeTitle: 'MASTERWORKS',
    tracksCount: 0,
    totalDurationMin: 0
  });

  const totalYears = maxYear - minYear + 1;

  for (let y = maxYear; y >= minYear; y--) {
    const isCurrent = y === maxYear;
    const volNum = totalYears - (maxYear - y);
    const coverVol = ((volNum - 1) % 10) + 1;
    const coverConfig = SCHOOL_YEAR_COVERS.find(c => c.vol === coverVol) || SCHOOL_YEAR_COVERS[0];

    yearsList.push({
      id: `lp_${y}_${y + 1}`,
      year: `${y}/${y + 1}`,
      title: `${coverConfig.volLabel} • ${coverConfig.themeTitle}`,
      subtitle: `${volNum}. Lernjahr (${y}/${y + 1}) • ${isCurrent ? 'Aktuelles Schuljahr' : 'Archiv'}`,
      accentColor: coverConfig.accentColor,
      gradient: coverConfig.gradient,
      isCurrent,
      volNum,
      volLabel: coverConfig.volLabel,
      themeTitle: coverConfig.themeTitle,
      tracksCount: 0,
      totalDurationMin: 0
    });
  }

  return yearsList;
}


const DEFAULT_MILESTONES: Omit<MilestoneData, 'id' | 'visibility' | 'version'>[] = [
  {
    type: 'first_tone',
    title: 'Mein erster Ton',
    subtitle: 'Der allererste Klang auf deinem Instrument',
    stepNumber: 1,
    iconName: 'sparkles',
    schoolYear: '2026/2027'
  },
  {
    type: 'first_scale',
    title: 'Meine erste Tonleiter',
    subtitle: 'Der erste Fingerfertigkeits-Meilenstein',
    stepNumber: 2,
    iconName: 'sliders',
    schoolYear: '2026/2027'
  },
  {
    type: 'first_song',
    title: 'Mein erster Song',
    subtitle: 'Dein erstes vollständig gemeistertes Lied',
    stepNumber: 3,
    iconName: 'music',
    schoolYear: '2026/2027'
  },
  {
    type: 'happy_birthday',
    title: 'Happy Birthday',
    subtitle: 'Das persönliche Geschenk-Ständchen für Familie & Freunde',
    stepNumber: 4,
    iconName: 'gift',
    schoolYear: '2026/2027'
  },
  {
    type: 'first_christmas_song',
    title: 'Mein erstes Weihnachtslied',
    subtitle: 'Der festliche Meilenstein unterm Weihnachtsbaum',
    stepNumber: 5,
    iconName: 'bell',
    schoolYear: '2026/2027'
  },
  {
    type: 'first_solo',
    title: 'Mein erstes Solo',
    subtitle: 'Der Moment freier Improvisation & Ausdruckskraft',
    stepNumber: 6,
    iconName: 'zap',
    schoolYear: '2026/2027'
  },
  {
    type: 'first_own_song',
    title: 'Mein erster eigener Song',
    subtitle: 'Deine allererste eigene Melodie & Komposition',
    stepNumber: 7,
    iconName: 'lightbulb',
    schoolYear: '2026/2027'
  },
  {
    type: 'hardest_piece',
    title: 'Mein schwierigstes Stück',
    subtitle: 'Deine persönliche Resilienz-Trophäe',
    stepNumber: 8,
    iconName: 'flame',
    schoolYear: '2026/2027'
  },
  {
    type: 'favorite_song',
    title: 'Mein aktueller Lieblingssong',
    subtitle: 'Dein musikalischer Herzens-Track des Schuljahres',
    stepNumber: 9,
    iconName: 'heart',
    schoolYear: '2026/2027'
  }
];

export const AudioBiographyView: React.FC<AudioBiographyViewProps> = ({
  student,
  teacherId,
  isTeacher = false,
  onBackToHub,
  isMobileOrSim = false
}) => {
  const studentId = student?.id || student?.student_id || 'anonymous_student';

  const STORAGE_KEY = `campus_audio_biography_${studentId}`;
  const PLAYLISTS_KEY = `campus_custom_playlists_${studentId}`;
  const THEME_KEY = `campus_audio_biography_theme`;

  // UI Theme state: Default is 'light' (Apple Paper Light Mode)
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  // Top-Level View Tab: 'overview' (Startansicht / CD-Regal), 'milestones', 'playlists'
  const [activeMainTab, setActiveMainTab] = useState<'overview' | 'milestones' | 'playlists'>('overview');

  const [milestones, setMilestones] = useState<MilestoneData[]>([]);
  const [customPlaylists, setCustomPlaylists] = useState<CustomPlaylist[]>([]);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);

  // 💽 Persistent Mini-Player & Album Queue States
  const [playbackQueue, setPlaybackQueue] = useState<Array<{ id: string; title: string; subtitle?: string; audioUrl: string; masteredAudioUrl?: string; duration?: number; albumTitle?: string }>>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(0);
  const [currentAlbumMeta, setCurrentAlbumMeta] = useState<{ title: string; subtitle?: string; gradient?: string; accentColor?: string } | null>(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [audioVolume, setAudioVolume] = useState<number>(1);
  const [isMiniPlayerMuted, setIsMiniPlayerMuted] = useState<boolean>(false);
  const [isMiniPlayerPlaying, setIsMiniPlayerPlaying] = useState<boolean>(false);

  // 📁 Schuljahr-Ordner Modal & 📖 Digitales Liner-Notes Booklet Modal States
  const [activeSchoolYearFolderModal, setActiveSchoolYearFolderModal] = useState<SchoolYearLP | null>(null);
  const [activeLinerNotesModal, setActiveLinerNotesModal] = useState<{
    title: string;
    subtitle?: string;
    gradient?: string;
    tracks: Array<{ title: string; subtitle?: string; personalNote?: string; recordedAt?: string; duration?: number; schoolYear?: string }>;
  } | null>(null);

  // Cache student metadata for seamless shared playlist experience
  useEffect(() => {
    if (student) {
      try {
        const meta = {
          id: student.id || student.student_id,
          first_name: student.first_name || '',
          last_name: student.last_name || '',
          instrument: student.instrument || student.main_instrument || 'Gitarre',
          school_id: student.school_id || '',
          school_name: student.school_name || ''
        };
        localStorage.setItem(`campus_student_meta_${studentId}`, JSON.stringify(meta));
        if (student.school_name && !student.school_name.toLowerCase().includes('groove academy')) {
          localStorage.setItem('campus_school_name', student.school_name);
        }
      } catch {
        // ignore
      }
    }
  }, [student, studentId]);
  
  // Active music school years dynamically computed from student registration date (created_at)
  const activeSchoolYears: SchoolYearLP[] = useMemo(() => {
    return computeActiveSchoolYears(student?.created_at || student?.registered_at);
  }, [student?.created_at, student?.registered_at]);

  // Vinyl Shelf State: Can show Milestone Years or Custom Playlists
  const [shelfMode, setShelfMode] = useState<'years' | 'playlists'>('years');
  const [selectedYearId, setSelectedYearId] = useState<string>(activeSchoolYears[0]?.id || 'lp_2026_2027');
  const [selectedCustomPlaylistId, setSelectedCustomPlaylistId] = useState<string | null>(null);
  const [isPlayingPlaylist, setIsPlayingPlaylist] = useState<boolean>(false);
  const [playlistCurrentTrackIdx, setPlaylistCurrentTrackIdx] = useState<number>(0);
  const [showChapterList, setShowChapterList] = useState<boolean>(true);

  // A/B Hörvergleich (Früher vs. Heute) State
  const [isPlayingABComparison, setIsPlayingABComparison] = useState<boolean>(false);
  const [abComparisonStage, setAbComparisonStage] = useState<'station1' | 'transition' | 'station9' | null>(null);

  // Global Audio Engine Mode: 'master' (default) vs 'raw' (unprocessed)
  const [audioMode, setAudioMode] = useState<'master' | 'raw'>('master');
  const [currentPlayingTrackMeta, setCurrentPlayingTrackMeta] = useState<{ rawUrl: string; masteredUrl?: string; trackId: string } | null>(null);

  // Recording & Upload States + 3-Sec Count-In Timer + Studio Mastering Status

  const [recordingMilestoneId, setRecordingMilestoneId] = useState<string | null>(null);
  const [recordingPlaylistId, setRecordingPlaylistId] = useState<string | null>(null);
  const [countDown, setCountDown] = useState<number | null>(null);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const [isProcessingMastering, setIsProcessingMastering] = useState<boolean>(false);
  const [activeUploadModalMilestone, setActiveUploadModalMilestone] = useState<MilestoneData | null>(null);
  const [uploadMode, setUploadMode] = useState<'mic' | 'file'>('mic');
  const [selectedProfile, setSelectedProfile] = useState<MasteringProfile>('acoustic_audiophile');
  const isDrumPadMode = selectedProfile === 'drums_percussion';
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [tempSongTitle, setTempSongTitle] = useState<string>('');
  const [tempArtist, setTempArtist] = useState<string>('');
  const [tempNote, setTempNote] = useState<string>('');
  const [tempVisibility, setTempVisibility] = useState<'private' | 'teacher_allowed'>('private');
  
  // Dual-Version Decision States (Equal Loudness -13 LUFS)
  const [pendingDualResult, setPendingDualResult] = useState<DualMasteringResult | null>(null);
  const [pendingDurationSec, setPendingDurationSec] = useState<number>(0);
  const [selectedVersionChoice, setSelectedVersionChoice] = useState<'master' | 'raw'>('master');
  const [modalPreviewPlaying, setModalPreviewPlaying] = useState<'master' | 'raw' | null>(null);
  const [reverbWetSlider, setReverbWetSlider] = useState<number>(30); // 30% Default Gala Hall
  const [lastRawInputFile, setLastRawInputFile] = useState<Blob | File | null>(null);
  const [isReMasteringReverb, setIsReMasteringReverb] = useState<boolean>(false);
  const reverbDebounceTimerRef = useRef<any>(null);
  const modalPreviewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Download Menu Popover State for both versions
  const [activeDownloadMenuTrack, setActiveDownloadMenuTrack] = useState<{ rawUrl?: string; masteredUrl?: string; title: string; trackId?: string } | null>(null);

  // 🎛️ Song Edit & Remastering Modal State (Edit Hall / Wet-Dry & Master vs. RAW Choice)
  const [editingTrackData, setEditingTrackData] = useState<{
    playlistId?: string;
    trackId: string;
    title: string;
    subtitle?: string;
    artist?: string;
    personalNote?: string;
    audioUrl: string;
    masteredAudioUrl?: string;
    preferredVersion: 'master' | 'raw';
    reverbWetMix: number;
  } | null>(null);
  const [isRemasteringEditTrack, setIsRemasteringEditTrack] = useState<boolean>(false);
  const [isSavingEditTrack, setIsSavingEditTrack] = useState<boolean>(false);
  const [editModalPreviewPlaying, setEditModalPreviewPlaying] = useState<'master' | 'raw' | null>(null);
  const editModalAudioRef = useRef<HTMLAudioElement | null>(null);
  const [editTempMasterBlob, setEditTempMasterBlob] = useState<Blob | null>(null);
  const [editTempMasterUrl, setEditTempMasterUrl] = useState<string | null>(null);

  // 🗑️ Delete Confirmation Modal State (Double confirmation on delete)
  const [pendingDeleteModal, setPendingDeleteModal] = useState<{
    type: 'track' | 'playlist';
    playlistId: string;
    trackId?: string;
    title: string;
  } | null>(null);


  // Playlist Wizard Modal States (3 Steps)
  const [showPlaylistWizard, setShowPlaylistWizard] = useState<boolean>(false);
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [wizardTitle, setWizardTitle] = useState<string>('');
  const [wizardDesc, setWizardDesc] = useState<string>('');
  const [wizardTheme, setWizardTheme] = useState<CustomPlaylist['vibeTheme']>('sunset_gold');
  const [wizardIcon, setWizardIcon] = useState<string>('music');
  const [wizardCoverPresetId, setWizardCoverPresetId] = useState<string>('cov_chart_hits');
  const [wizardCoverCategory, setWizardCoverCategory] = useState<'all' | 'kids' | 'urban_vibes' | 'classic_jazz' | 'events_stage'>('all');
  const [wizardSelectedMilestones, setWizardSelectedMilestones] = useState<string[]>([]);

  // Reflection Popover State
  const [activeReflectionMilestone, setActiveReflectionMilestone] = useState<MilestoneData | null>(null);
  const [reflectionText, setReflectionText] = useState<string>('');

  // Share Modal States
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [sharePin, setSharePin] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(`campus_share_pin_${student?.id || studentId}`);
      if (stored && /^\d{4}$/.test(stored)) return stored;
    } catch {}
    return Math.floor(1000 + Math.random() * 9000).toString();
  });
  const [shareAnonymously, setShareAnonymously] = useState<boolean>(false);
  const [shareAllowApplause, setShareAllowApplause] = useState<boolean>(true);
  const [shareTargetPlaylistId, setShareTargetPlaylistId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const activeMicStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const countInIntervalRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 🛡️ Audio-Tresor Storage Add-on Access Gate
  const [tresorAccessLoading, setTresorAccessLoading] = useState<boolean>(true);
  const [hasAudioTresorStorage, setHasAudioTresorStorage] = useState<boolean>(true);

  // Initialize theme from storage (default to 'light')
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
      } else {
        setTheme('light');
        localStorage.setItem(THEME_KEY, 'light');
      }
    } catch {
      setTheme('light');
    }
  }, []);

  // Check School Audio-Tresor Storage Add-on Status
  useEffect(() => {
    let isCancelled = false;
    const checkStorageAddon = async () => {
      // 0. Direct Props & Joined School Inspection (Zero-Latency)
      if (student?.schools) {
        const activeGb = Number(student.schools.storage_addon_gb || 0);
        const isStatusValid = student.schools.storage_addon_status !== 'cancelled';
        if (activeGb > 0 && isStatusValid) {
          if (!isCancelled) {
            setHasAudioTresorStorage(true);
            setTresorAccessLoading(false);
          }
          return;
        }
      }

      if (student?.storage_addon_gb !== undefined && student?.storage_addon_gb !== null) {
        const activeGb = Number(student.storage_addon_gb || 0);
        if (activeGb > 0) {
          if (!isCancelled) {
            setHasAudioTresorStorage(true);
            setTresorAccessLoading(false);
          }
          return;
        }
      }

      let targetSchoolId = 
        student?.school_id || 
        (student as any)?.schoolId || 
        (student as any)?.schools?.id ||
        (window as any).__groovelab_school_id || 
        localStorage.getItem('groovelab_school_id') || 
        localStorage.getItem('campus_school_id') || 
        localStorage.getItem('school_id') ||
        sessionStorage.getItem('groovelab_school_id') ||
        sessionStorage.getItem('groovelab_ghost_school_id');

      let schoolData: any = null;

      // 1. Lookup by targetSchoolId
      if (targetSchoolId) {
        try {
          const { data } = await supabase
            .from('schools')
            .select('*')
            .eq('id', targetSchoolId)
            .maybeSingle();
          if (data) schoolData = data;
        } catch (e) {
          console.warn('[Storage Check] ID lookup note:', e);
        }
      }

      // 2. Lookup by student.school_name if ID was missing or not found
      if (!schoolData && (student?.school_name || localStorage.getItem('campus_school_name'))) {
        const sName = student?.school_name || localStorage.getItem('campus_school_name');
        if (sName) {
          try {
            const { data } = await supabase
              .from('schools')
              .select('*')
              .ilike('name', `%${sName}%`)
              .maybeSingle();
            if (data) schoolData = data;
          } catch (e) {
            console.warn('[Storage Check] Name lookup note:', e);
          }
        }
      }

      // 3. Lookup by student database record
      if (!schoolData && studentId && studentId !== 'anonymous_student') {
        try {
          const { data: stRec } = await supabase
            .from('students')
            .select('school_id')
            .eq('id', studentId)
            .maybeSingle();
          if (stRec?.school_id) {
            const { data } = await supabase
              .from('schools')
              .select('*')
              .eq('id', stRec.school_id)
              .maybeSingle();
            if (data) schoolData = data;
          }
        } catch (e) {
          console.warn('[Storage Check] Student record lookup note:', e);
        }
      }

      // 4. Session Fallback: Query primary active school
      if (!schoolData) {
        try {
          const { data } = await supabase
            .from('schools')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (data) schoolData = data;
        } catch (e) {
          console.warn('[Storage Check] Primary school fallback lookup note:', e);
        }
      }

      // 5. Merge localStorage Overrides (from Secretary/Admin live bookings)
      try {
        const overridesStr = localStorage.getItem('groovelab_school_overrides') || localStorage.getItem('campus_school_overrides');
        if (overridesStr) {
          const overrides = JSON.parse(overridesStr);
          const sId = targetSchoolId || schoolData?.id;
          if (sId && overrides[sId]) {
            schoolData = { ...(schoolData || {}), ...overrides[sId] };
          } else {
            const allEntries = Object.values(overrides) as any[];
            const activeEntry = allEntries.find(e => Number(e.storage_addon_gb || 0) > 0 && e.storage_addon_status !== 'cancelled');
            if (activeEntry) {
              schoolData = { ...(schoolData || {}), ...activeEntry };
            }
          }
        }
      } catch (e) {
        console.warn('[Storage Check] Overrides check error:', e);
      }

      // 7. Check if any billing booking is active across localStorage
      let isAnyBillingBooked = false;
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('isBillingBooked_') && localStorage.getItem(k) === 'true') {
            isAnyBillingBooked = true;
            break;
          }
        }
      } catch (e) {}

      if (!isCancelled) {
        let activeGb = Number(schoolData?.storage_addon_gb || schoolData?.storage_addon_pending_gb || 0);
        if (activeGb === 0 && (isAnyBillingBooked || schoolData?.status === 'active' || schoolData?.is_trial === true)) {
          const fallbackBooked = Number(localStorage.getItem('selectedStorageAddonGb') || 20);
          activeGb = fallbackBooked;
        }

        const isStatusValid = schoolData?.storage_addon_status !== 'cancelled';
        const isAddonActive = activeGb > 0 && isStatusValid;

        setHasAudioTresorStorage(Boolean(isAddonActive));
        setTresorAccessLoading(false);
      }
    };

    checkStorageAddon();
    return () => { isCancelled = true; };
  }, [student, studentId]);

  const toggleTheme = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    try {
      localStorage.setItem(THEME_KEY, newTheme);
    } catch {
      // Ignore
    }
  };

  // Initialize and load saved milestones and playlists with binary blob hydration
  useEffect(() => {
    let isCancelled = false;

    const loadAndHydrate = async () => {
      try {
        // 1. Load Milestones
        let loadedMilestones: MilestoneData[] = [];
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const updatedParsed = parsed.map((p: MilestoneData) => {
            if (p.type === 'favorite_song') {
              return {
                ...p,
                title: 'Mein aktueller Lieblingssong',
                subtitle: 'Dein musikalischer Herzens-Track des Schuljahres'
              };
            }
            return p;
          });

          if (updatedParsed.length < DEFAULT_MILESTONES.length) {
            loadedMilestones = DEFAULT_MILESTONES.map((def, idx) => {
              const existing = updatedParsed.find((p: any) => p.type === def.type);
              return existing || {
                ...def,
                id: `ms_${def.type}_${idx}`,
                visibility: 'private',
                version: 1,
                isUnerasable: false,
                isVerified: false
              };
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(loadedMilestones));
          } else {
            loadedMilestones = updatedParsed;
          }
        } else {
          loadedMilestones = DEFAULT_MILESTONES.map((def, idx) => ({
            ...def,
            id: `ms_${def.type}_${idx}`,
            visibility: 'private',
            version: 1,
            isUnerasable: false,
            isVerified: false
          }));
        }

        // Hydrate Milestones Audio Blobs from IndexedDB
        const hydratedMilestones = await Promise.all(
          loadedMilestones.map(async (m) => {
            const rawBlob = await getBlob(`campus_audio_${m.id}_raw`);
            const masterBlob = await getBlob(`campus_audio_${m.id}_master`);

            let audioUrl = m.audioUrl;
            let masteredAudioUrl = m.masteredAudioUrl;

            if (rawBlob && rawBlob instanceof Blob) {
              audioUrl = URL.createObjectURL(rawBlob);
            }
            if (masterBlob && masterBlob instanceof Blob) {
              masteredAudioUrl = URL.createObjectURL(masterBlob);
            }

            return {
              ...m,
              audioUrl: audioUrl || m.audioUrl,
              masteredAudioUrl: masteredAudioUrl || m.masteredAudioUrl
            };
          })
        );

        if (!isCancelled) {
          setMilestones(hydratedMilestones);
        }

        // 2. Load Custom Playlists
        let loadedPlaylists: CustomPlaylist[] = [];
        const savedPlaylists = localStorage.getItem(PLAYLISTS_KEY);
        if (savedPlaylists) {
          loadedPlaylists = JSON.parse(savedPlaylists);
        } else {
          const starterPlaylists: CustomPlaylist[] = [
            {
              id: 'pl_meilenstein_lp',
              title: '🌟 Meine Meilenstein-LP',
              description: 'Mein musikalisches Lebenswerk – Die wichtigsten Meilensteine',
              vibeTheme: 'sunset_gold',
              iconName: 'star',
              createdAt: 'Schuljahr 2026/2027',
              tracks: []
            },
            {
              id: 'pl_sommer_2026',
              title: '☀️ Mein Sommerkonzert 2026',
              description: 'Akustische Highlights & Vorbereitungen zum Schuljahresabschluss',
              vibeTheme: 'sunset_gold',
              iconName: 'sun',
              createdAt: '15. Aug 2026',
              tracks: []
            },
            {
              id: 'pl_weihnachten',
              title: '🎄 Meine Weihnachts-Playlist',
              description: 'Festliche Klänge für Heiligabend, Familie & Freunde',
              vibeTheme: 'vintage_tape',
              iconName: 'gift',
              createdAt: 'Schuljahr 2026/2027',
              tracks: []
            },
            {
              id: 'pl_lieblingssongs',
              title: '⭐ Meine absoluten Lieblingssongs',
              description: 'Tracks, die ich einfach immer wieder gerne spiele',
              vibeTheme: 'cyber_neon',
              iconName: 'heart',
              createdAt: 'Schuljahr 2026/2027',
              tracks: []
            }
          ];
          loadedPlaylists = starterPlaylists;
          localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(starterPlaylists));
        }

        // Hydrate Playlists Audio Blobs from IndexedDB
        const hydratedPlaylists = await Promise.all(
          loadedPlaylists.map(async (pl) => {
            const hydratedTracks = await Promise.all(
              pl.tracks.map(async (t) => {
                const rawBlob = await getBlob(`campus_audio_${t.id}_raw`);
                const masterBlob = await getBlob(`campus_audio_${t.id}_master`);

                let audioUrl = t.audioUrl;
                let masteredAudioUrl = t.masteredAudioUrl;

                if (rawBlob && rawBlob instanceof Blob) {
                  audioUrl = URL.createObjectURL(rawBlob);
                }
                if (masterBlob && masterBlob instanceof Blob) {
                  masteredAudioUrl = URL.createObjectURL(masterBlob);
                }

                return {
                  ...t,
                  audioUrl: audioUrl || t.audioUrl,
                  masteredAudioUrl: masteredAudioUrl || t.masteredAudioUrl
                };
              })
            );
            return { ...pl, tracks: hydratedTracks };
          })
        );

        if (!isCancelled) {
          setCustomPlaylists(hydratedPlaylists);
          if (hydratedPlaylists.length > 0 && !selectedCustomPlaylistId) {
            setSelectedCustomPlaylistId(hydratedPlaylists[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load and hydrate audio biography:', err);
      }
    };

    loadAndHydrate();

    return () => {
      isCancelled = true;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (editModalAudioRef.current) {
        editModalAudioRef.current.pause();
        editModalAudioRef.current = null;
      }
      if (activeMicStreamRef.current) {
        activeMicStreamRef.current.getTracks().forEach(track => track.stop());
        activeMicStreamRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (countInIntervalRef.current) {
        clearInterval(countInIntervalRef.current);
      }
    };
  }, [studentId]);


  // Persist milestone state changes
  const saveMilestones = (updated: MilestoneData[]) => {
    setMilestones(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  // Persist custom playlists state changes
  const savePlaylists = (updated: CustomPlaylist[]) => {
    setCustomPlaylists(updated);
    try {
      localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  // Helper to resolve an active, playable object URL (from IndexedDB binary storage or valid remote URL)
  const resolvePlayableUrl = async (rawUrl?: string, masteredUrl?: string, trackId?: string, mode: 'master' | 'raw' = audioMode): Promise<string | null> => {
    if (!trackId && !rawUrl && !masteredUrl) return null;

    // 1. Try to fetch fresh binary blob from IndexedDB
    if (trackId) {
      const preferredBlobKey = mode === 'master' ? `campus_audio_${trackId}_master` : `campus_audio_${trackId}_raw`;
      const fallbackBlobKey = mode === 'master' ? `campus_audio_${trackId}_raw` : `campus_audio_${trackId}_master`;

      let storedBlob = await getBlob(preferredBlobKey);
      if (!storedBlob) {
        storedBlob = await getBlob(fallbackBlobKey);
      }
      if (storedBlob && storedBlob instanceof Blob) {
        return URL.createObjectURL(storedBlob);
      }
    }

    // 2. If no local blob in IndexedDB, use remote URL if it's not a dead localhost blob
    const candidateUrl = mode === 'master' ? (masteredUrl || rawUrl) : (rawUrl || masteredUrl);
    if (candidateUrl && !candidateUrl.startsWith('blob:')) {
      return candidateUrl;
    }

    // 3. Fallback to candidateUrl as-is if available
    return candidateUrl || null;
  };

  // 🌟 Download Dialog Trigger (Opens choices for Studio Master, Pure RAW or Both)
  const downloadAudioTrack = (rawUrl?: string, masteredUrl?: string, trackTitle: string = 'Track', trackId?: string) => {
    setActiveDownloadMenuTrack({
      rawUrl,
      masteredUrl,
      title: trackTitle,
      trackId
    });
  };

  // 🌟 High-Fidelity Downloader for specific versions (Studio Master, Pure RAW, or Both)
  const downloadSpecificAudioVersion = async (
    targetVersion: 'master' | 'raw' | 'both',
    rawUrl?: string,
    masteredUrl?: string,
    trackTitle: string = 'Track',
    trackId?: string
  ) => {
    const safeTitle = (trackTitle || 'Track').replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, '_');
    const safeStudent = (student?.first_name || 'Campus').replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, '_');

    const downloadSingle = async (mode: 'master' | 'raw', labelSuffix: string) => {
      const url = await resolvePlayableUrl(rawUrl, masteredUrl, trackId, mode);
      if (!url) {
        console.warn(`[Download] Could not resolve playable URL for mode: ${mode}`);
        return false;
      }
      const filename = `${safeStudent}_${safeTitle}_${labelSuffix}.wav`;

      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
        return true;
      } catch {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return true;
      }
    };

    if (targetVersion === 'master') {
      await downloadSingle('master', 'Studio_Master');
    } else if (targetVersion === 'raw') {
      await downloadSingle('raw', 'Pure_RAW');
    } else if (targetVersion === 'both') {
      await downloadSingle('master', 'Studio_Master');
      setTimeout(async () => {
        await downloadSingle('raw', 'Pure_RAW');
      }, 500);
    }
    setActiveDownloadMenuTrack(null);
  };


  // Audio Playback with Live Seamless A/B Master/RAW Switch
  const handlePlayToggle = async (rawUrl?: string, masteredUrl?: string, trackId?: string) => {
    if (!trackId && !rawUrl) return;
    const effectiveId = trackId || rawUrl || 'temp_track';

    if (activePlayingId === effectiveId) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setActivePlayingId(null);
      setIsMiniPlayerPlaying(false);
      setCurrentPlayingTrackMeta(null);
      setIsPlayingPlaylist(false);
      setIsPlayingABComparison(false);
    } else {
      const urlToPlay = await resolvePlayableUrl(rawUrl, masteredUrl, trackId, audioMode);
      if (!urlToPlay) {
        alert('Der Song konnte nicht geladen werden. Bitte nimm den Track erneut auf.');
        return;
      }
      setCurrentPlayingTrackMeta({ rawUrl: rawUrl || urlToPlay, masteredUrl: masteredUrl || urlToPlay, trackId: effectiveId });
      playAudioUrl(urlToPlay, effectiveId);
    }
  };

  const switchAudioMode = async (newMode: 'master' | 'raw') => {
    setAudioMode(newMode);
    if (activePlayingId && currentPlayingTrackMeta && audioRef.current) {
      const currentPos = audioRef.current.currentTime;
      const isPaused = audioRef.current.paused;
      const targetUrl = await resolvePlayableUrl(
        currentPlayingTrackMeta.rawUrl, 
        currentPlayingTrackMeta.masteredUrl, 
        currentPlayingTrackMeta.trackId, 
        newMode
      );
      
      if (targetUrl) {
        const newAudio = new Audio(targetUrl);
        newAudio.currentTime = currentPos;
        newAudio.volume = isMiniPlayerMuted ? 0 : audioVolume;
        newAudio.ontimeupdate = () => setAudioCurrentTime(newAudio.currentTime);
        newAudio.onloadedmetadata = () => setAudioDuration(newAudio.duration || 0);
        audioRef.current.pause();
        audioRef.current = newAudio;
        if (!isPaused) {
          newAudio.play().then(() => setIsMiniPlayerPlaying(true)).catch(console.warn);
        }
        newAudio.onended = () => {
          if (isPlayingPlaylist) {
            playNextInPlaylist();
          } else {
            setActivePlayingId(null);
            setIsMiniPlayerPlaying(false);
          }
        };
      }
    }
  };

  const playAudioUrl = (url: string, trackId: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(url);
    audio.volume = isMiniPlayerMuted ? 0 : audioVolume;
    audioRef.current = audio;
    
    audio.ontimeupdate = () => {
      setAudioCurrentTime(audio.currentTime);
    };
    audio.onloadedmetadata = () => {
      setAudioDuration(audio.duration || 0);
    };

    audio.play().then(() => {
      setIsMiniPlayerPlaying(true);
    }).catch(e => console.warn('Playback error:', e));
    setActivePlayingId(trackId);
    
    audio.onended = () => {
      if (isPlayingPlaylist) {
        playNextInPlaylist();
      } else {
        setActivePlayingId(null);
        setIsMiniPlayerPlaying(false);
      }
    };
  };

  // 💽 Unified Album & Playlist Queue Player
  const playAlbumQueue = async (
    albumTitle: string,
    albumSubtitle: string,
    tracks: Array<{ id: string; title: string; subtitle?: string; audioUrl: string; masteredAudioUrl?: string; duration?: number; albumTitle?: string }>,
    coverGradient?: string,
    accentColor?: string
  ) => {
    if (!tracks || tracks.length === 0) {
      alert(`"${albumTitle}" enthält noch keine Audio-Aufnahmen. Nimm zuerst Songs auf!`);
      return;
    }

    setPlaybackQueue(tracks);
    setCurrentQueueIndex(0);
    setCurrentAlbumMeta({ title: albumTitle, subtitle: albumSubtitle, gradient: coverGradient, accentColor });
    setIsPlayingPlaylist(true);
    setIsPlayingABComparison(false);

    const firstTrack = tracks[0];
    const url = await resolvePlayableUrl(firstTrack.audioUrl, firstTrack.masteredAudioUrl, firstTrack.id, audioMode);
    if (url && firstTrack.id) {
      setCurrentPlayingTrackMeta({ rawUrl: firstTrack.audioUrl || url, masteredUrl: firstTrack.masteredAudioUrl || url, trackId: firstTrack.id });
      playAudioUrl(url, firstTrack.id);
    }
  };

  // Continuous Playlist Engine
  const activeCustomPlaylist = customPlaylists.find(p => p.id === selectedCustomPlaylistId) || customPlaylists[0];
  const activePlaylistTracks = playbackQueue.length > 0 
    ? playbackQueue 
    : (shelfMode === 'years' ? milestones.filter(m => m.audioUrl) : (activeCustomPlaylist?.tracks || []));

  const startContinuousPlaylist = async () => {
    if (activePlaylistTracks.length === 0) {
      alert('Diese Playlist enthält noch keine Audio-Tracks. Nimm zuerst einen Song auf oder füge Meilensteine hinzu!');
      return;
    }

    if (isPlayingPlaylist && isMiniPlayerPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsMiniPlayerPlaying(false);
    } else if (isPlayingPlaylist && !isMiniPlayerPlaying) {
      if (audioRef.current) {
        audioRef.current.play().then(() => setIsMiniPlayerPlaying(true)).catch(console.warn);
      }
    } else {
      setIsPlayingPlaylist(true);
      setIsPlayingABComparison(false);
      setPlaylistCurrentTrackIdx(0);
      setCurrentQueueIndex(0);
      const firstTrack = activePlaylistTracks[0];
      const url = await resolvePlayableUrl(firstTrack?.audioUrl, firstTrack?.masteredAudioUrl, firstTrack?.id, audioMode);
      if (url && firstTrack?.id) {
        setCurrentPlayingTrackMeta({ rawUrl: firstTrack.audioUrl || url, masteredUrl: firstTrack.masteredAudioUrl || url, trackId: firstTrack.id });
        playAudioUrl(url, firstTrack.id);
      }
    }
  };

  const playNextInPlaylist = async () => {
    const queueToUse = playbackQueue.length > 0 ? playbackQueue : activePlaylistTracks;
    const currentIdx = playbackQueue.length > 0 ? currentQueueIndex : playlistCurrentTrackIdx;
    const nextIdx = currentIdx + 1;
    if (nextIdx < queueToUse.length) {
      if (playbackQueue.length > 0) setCurrentQueueIndex(nextIdx);
      setPlaylistCurrentTrackIdx(nextIdx);
      const nextTrack = queueToUse[nextIdx];
      const url = await resolvePlayableUrl(nextTrack?.audioUrl, nextTrack?.masteredAudioUrl, nextTrack?.id, audioMode);
      if (url && nextTrack?.id) {
        setCurrentPlayingTrackMeta({ rawUrl: nextTrack.audioUrl || url, masteredUrl: nextTrack.masteredAudioUrl || url, trackId: nextTrack.id });
        playAudioUrl(url, nextTrack.id);
      }
    } else {
      setIsPlayingPlaylist(false);
      setActivePlayingId(null);
      setIsMiniPlayerPlaying(false);
      setPlaylistCurrentTrackIdx(0);
      setCurrentQueueIndex(0);
    }
  };

  const playPrevInPlaylist = async () => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setAudioCurrentTime(0);
      return;
    }
    const queueToUse = playbackQueue.length > 0 ? playbackQueue : activePlaylistTracks;
    const currentIdx = playbackQueue.length > 0 ? currentQueueIndex : playlistCurrentTrackIdx;
    const prevIdx = currentIdx - 1;
    if (prevIdx >= 0) {
      if (playbackQueue.length > 0) setCurrentQueueIndex(prevIdx);
      setPlaylistCurrentTrackIdx(prevIdx);
      const prevTrack = queueToUse[prevIdx];
      const url = await resolvePlayableUrl(prevTrack?.audioUrl, prevTrack?.masteredAudioUrl, prevTrack?.id, audioMode);
      if (url && prevTrack?.id) {
        setCurrentPlayingTrackMeta({ rawUrl: prevTrack.audioUrl || url, masteredUrl: prevTrack.masteredAudioUrl || url, trackId: prevTrack.id });
        playAudioUrl(url, prevTrack.id);
      }
    } else if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setAudioCurrentTime(0);
    }
  };

  const toggleMiniPlayerPlay = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play().then(() => setIsMiniPlayerPlaying(true)).catch(console.warn);
    } else {
      audioRef.current.pause();
      setIsMiniPlayerPlaying(false);
    }
  };

  const seekMiniPlayer = (newTime: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setAudioCurrentTime(newTime);
    }
  };

  // 🌟 A/B HÖRVERGLEICH (Früher vs. Heute)
  const startABComparison = async () => {
    const track1 = milestones.find(m => m.stepNumber === 1 && m.audioUrl) || milestones.find(m => m.audioUrl);
    const track9 = milestones.find(m => m.stepNumber === 9 && m.audioUrl) || milestones[milestones.length - 1];

    if (!track1?.audioUrl && !track9?.audioUrl) {
      alert('Nimm zuerst Meilenstein 01 oder deinen Lieblingssong auf, um den A/B-Hörvergleich zu starten!');
      return;
    }

    if (isPlayingABComparison) {
      if (audioRef.current) audioRef.current.pause();
      setIsPlayingABComparison(false);
      setAbComparisonStage(null);
      setActivePlayingId(null);
      return;
    }

    setIsPlayingABComparison(true);
    setIsPlayingPlaylist(false);
    setAbComparisonStage('station1');

    const url1 = await resolvePlayableUrl(track1?.audioUrl, track1?.masteredAudioUrl, track1?.id, audioMode);
    if (url1 && track1) {
      const audio1 = new Audio(url1);
      audioRef.current = audio1;
      setActivePlayingId(track1.id);
      audio1.play().catch(console.warn);

      // Play 8 seconds of Station 01, then crossfade to Station 09
      setTimeout(async () => {
        setAbComparisonStage('transition');
        const url9 = await resolvePlayableUrl(track9?.audioUrl, track9?.masteredAudioUrl, track9?.id, audioMode);
        setTimeout(() => {
          if (url9 && track9) {
            audio1.pause();
            const audio9 = new Audio(url9);
            audioRef.current = audio9;
            setActivePlayingId(track9.id);
            setAbComparisonStage('station9');
            audio9.play().catch(console.warn);

            audio9.onended = () => {
              setIsPlayingABComparison(false);
              setAbComparisonStage(null);
              setActivePlayingId(null);
            };
          } else {
            setIsPlayingABComparison(false);
            setAbComparisonStage(null);
            setActivePlayingId(null);
          }
        }, 1500);
      }, 8000);
    }
  };


  // Open Recording/Upload Modal
  const openUploadModal = (ms: MilestoneData) => {
    setActiveUploadModalMilestone(ms);
    setRecordingPlaylistId(null);
    setUploadMode('mic');
    setSelectedProfile('acoustic_audiophile');
    setUploadFile(null);
    setTempSongTitle(ms.title || '');
    setTempArtist(student?.first_name || 'Eigenes Spiel');
    setTempNote(ms.personalNote || '');
    setTempVisibility(ms.visibility || 'private');
    setCountDown(null);
  };


  // 🌟 MIKROFON-FREIGABE ZUERST ANFORDERN -> DANN 3-SEKUNDEN COUNT-IN
  const triggerRecordingCountIn = async () => {
    try {
      // 1. Mikrofon-Berechtigung ZUERST anfordern mit audiophilen Settings
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000
        }
      });
      activeMicStreamRef.current = stream;

      // 2. Browser MIME-Type Ermittlung (Safari, Chrome, Firefox, iOS Kompatibilität)
      let mimeType = 'audio/webm;codecs=opus';
      if (typeof MediaRecorder !== 'undefined') {
        if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          if (MediaRecorder.isTypeSupported('audio/webm')) {
            mimeType = 'audio/webm';
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
          } else if (MediaRecorder.isTypeSupported('audio/aac')) {
            mimeType = 'audio/aac';
          } else {
            mimeType = '';
          }
        }
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const actualMime = recorder.mimeType || (audioChunksRef.current[0]?.type) || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMime });

        // WICHTIG: Tracks erst beenden, wenn alle Audiodaten vollständig geflusht wurden!
        if (activeMicStreamRef.current) {
          activeMicStreamRef.current.getTracks().forEach(track => track.stop());
          activeMicStreamRef.current = null;
        }

        if (audioBlob.size > 0) {
          setReverbWetSlider(30);
          await processDualMasteringForModal(audioBlob, recordSeconds, selectedProfile, 30);
        } else {
          alert('Keine Audiodaten aufgezeichnet. Bitte versuche es erneut.');
          setIsProcessingMastering(false);
        }
      };

      // 3. 3-Sekunden Count-In („Hände ans Instrument“)
      setCountDown(3);
      let currentCount = 3;

      countInIntervalRef.current = setInterval(() => {
        currentCount -= 1;
        if (currentCount > 0) {
          setCountDown(currentCount);
        } else {
          clearInterval(countInIntervalRef.current);
          setCountDown(null);

          // 4. Lückenloser Aufnahmestart mit 250ms Puffer-Timeslices
          recorder.start(250);
          setRecordingMilestoneId(activeUploadModalMilestone?.id || 'new_track');
          setRecordSeconds(0);

          timerIntervalRef.current = setInterval(() => {
            setRecordSeconds(s => s + 1);
          }, 1000);
        }
      }, 1000);

    } catch (err) {
      console.error('Microphone access failed:', err);
      alert('Mikrofonzugriff nicht gestattet oder nicht verfügbar. Bitte erlaube den Mikrofonzugriff in deinen Browser-Einstellungen.');
      if (activeMicStreamRef.current) {
        activeMicStreamRef.current.getTracks().forEach(track => track.stop());
        activeMicStreamRef.current = null;
      }
      setCountDown(null);
    }
  };

  const stopRecording = () => {
    if (countInIntervalRef.current) {
      clearInterval(countInIntervalRef.current);
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    setRecordingMilestoneId(null);
    setIsProcessingMastering(true);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.requestData();
      } catch (e) {}
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Recorder stop note:', e);
      }
    }
    // HINWEIS: activeMicStreamRef.current wird sicher in recorder.onstop gestoppt!
  };

  // File Upload Handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|aac|webm|ogg)$/i)) {
        alert('Bitte wähle eine gültige Audiodatei (mp3, wav, m4a, aac, webm).');
        return;
      }
      setUploadFile(file);
    }
  };

  const commitFileUpload = async () => {
    if (!uploadFile) return;
    setReverbWetSlider(30);
    await processDualMasteringForModal(uploadFile, 0, selectedProfile, 30);
  };

  /**
   * 🎛️ DUAL MASTERING PIPELINE (Loudness-Matched -13.0 LUFS Classical & Jazz Reference):
   * Erzeugt simultan:
   * 1. Studio Audio-Processing (-13.0 LUFS, New York Parallel-Kompression & Gala Hall)
   * 2. Pure RAW (-13.0 LUFS Lautheits-Match, 100% unverfälschter Originalklang)
   */
  const processDualMasteringForModal = async (
    fileOrBlob: Blob | File, 
    durationSec: number, 
    profileOverride?: MasteringProfile,
    initialWetMixPercent: number = 30
  ) => {
    setIsProcessingMastering(true);
    setPendingDualResult(null);
    setLastRawInputFile(fileOrBlob);

    const effectiveProfile: MasteringProfile = profileOverride || selectedProfile;
    const isDrum = effectiveProfile === 'drums_percussion';
    const effectiveWetMix = isDrum ? 0.12 : (initialWetMixPercent / 100);

    try {
      const dualRes = await processDualMastering(fileOrBlob, {
        profile: effectiveProfile,
        targetLufs: -13.0,
        targetPeakDb: -1.0,
        isDrumPadMode: isDrum,
        applyAutoGainStage: true,
        applyAdaptiveHpf: true,
        applyTransientSoftener: true,
        applyLowEndResonance: true,
        applyMidResonance: true,
        applyTiltEq: true,
        tiltPivotHz: 1000,
        applyDeHarsh: true,
        applyPultecAir: true,
        applyParallelConsoleBus: true,
        applyStereoDimension: true,
        applyConvolutionReverb: true,
        reverbWetMix: effectiveWetMix,
        reverbPreDelayMs: effectiveProfile === 'grand_piano' ? 25 : 30
      });
      setPendingDualResult(dualRes);
      setPendingDurationSec(dualRes.durationSec || durationSec);
    } catch (e) {
      console.warn('Dual mastering processing fallback:', e);
      const fallbackUrl = URL.createObjectURL(fileOrBlob);
      const fallbackBlob = fileOrBlob instanceof Blob ? fileOrBlob : new Blob([fileOrBlob], { type: 'audio/wav' });
      setPendingDualResult({
        masteredBlob: fallbackBlob,
        masteredUrl: fallbackUrl,
        rawNormalizedBlob: fallbackBlob,
        rawNormalizedUrl: fallbackUrl,
        originalLufs: -20,
        finalLufs: -18
      });
      setPendingDurationSec(durationSec);
    } finally {
      setIsProcessingMastering(false);
    }
  };

  /**
   * 🏛️ Interaktiver Gala-Hall Schieberegler beim Vorhören
   */
  const handleReverbSliderChange = (newPercent: number) => {
    setReverbWetSlider(newPercent);
    if (!lastRawInputFile) return;

    if (reverbDebounceTimerRef.current) {
      clearTimeout(reverbDebounceTimerRef.current);
    }

    reverbDebounceTimerRef.current = setTimeout(async () => {
      setIsReMasteringReverb(true);
      try {
        const effectiveProfile: MasteringProfile = selectedProfile;
        const isDrum = effectiveProfile === 'drums_percussion';
        const newMasterRes = await processStudioMastering(lastRawInputFile, {
          profile: effectiveProfile,
          targetLufs: -13.0,
          targetPeakDb: -1.0,
          isDrumPadMode: isDrum,
          applyAutoGainStage: true,
          applyAdaptiveHpf: true,
          applyTransientSoftener: true,
          applyLowEndResonance: true,
          applyMidResonance: true,
          applyTiltEq: true,
          tiltPivotHz: 1000,
          applyDeHarsh: true,
          applyPultecAir: true,
          applyParallelConsoleBus: true,
          applyStereoDimension: true,
          applyConvolutionReverb: true,
          reverbWetMix: isDrum ? 0.12 : (newPercent / 100),
          reverbPreDelayMs: effectiveProfile === 'grand_piano' ? 25 : 30
        });

        setPendingDualResult(prev => {
          if (!prev) return null;
          return {
            ...prev,
            masteredBlob: newMasterRes.masteredBlob,
            masteredUrl: newMasterRes.masteredUrl
          };
        });

        // Wenn die Studio-Version gerade abgespielt wird, Audio nahtlos aktualisieren
        if (modalPreviewPlaying === 'master' && modalPreviewAudioRef.current) {
          const currentPos = modalPreviewAudioRef.current.currentTime;
          modalPreviewAudioRef.current.pause();
          const newAudio = new Audio(newMasterRes.masteredUrl);
          newAudio.currentTime = currentPos;
          modalPreviewAudioRef.current = newAudio;
          newAudio.play().catch(console.warn);
          newAudio.onended = () => setModalPreviewPlaying(null);
        }
      } catch (err) {
        console.warn('Re-master with new reverb wet mix note:', err);
      } finally {
        setIsReMasteringReverb(false);
      }
    }, 180);
  };

  /**
   * Vorhören im Aufnahme-Modal (A/B Test vor dem Speichern)
   */
  const toggleModalPreview = (version: 'master' | 'raw') => {
    if (!pendingDualResult) return;

    if (modalPreviewPlaying === version) {
      if (modalPreviewAudioRef.current) {
        modalPreviewAudioRef.current.pause();
      }
      setModalPreviewPlaying(null);
    } else {
      if (modalPreviewAudioRef.current) {
        modalPreviewAudioRef.current.pause();
      }
      const targetUrl = version === 'master' ? pendingDualResult.masteredUrl : pendingDualResult.rawNormalizedUrl;
      const audio = new Audio(targetUrl);
      modalPreviewAudioRef.current = audio;
      audio.play().catch(console.warn);
      setModalPreviewPlaying(version);
      audio.onended = () => {
        setModalPreviewPlaying(null);
      };
    }
  };

  /**
   * 💾 Speichert die gewählte Version (Studio vs. RAW) + sichert beide Versionen für zukünftiges Umschalten & Download
   */
  const confirmAndSaveTrackDecision = async () => {
    if (!pendingDualResult) return;

    if (modalPreviewAudioRef.current) {
      modalPreviewAudioRef.current.pause();
      modalPreviewAudioRef.current = null;
    }
    setModalPreviewPlaying(null);

    const targetTrackId = activeUploadModalMilestone?.id || `plt_${Date.now()}`;
    const rawBlob = pendingDualResult.rawNormalizedBlob;
    const masterBlob = pendingDualResult.masteredBlob;
    let rawUrl = pendingDualResult.rawNormalizedUrl;
    let masteredUrl = pendingDualResult.masteredUrl;

    // 1. 💾 PERSIST TO LOCAL BINARY INDEXEDDB (both equal-loudness versions)
    try {
      await storeBlob(`campus_audio_${targetTrackId}_raw`, rawBlob);
      await storeBlob(`campus_audio_${targetTrackId}_master`, masterBlob);
    } catch (dbErr) {
      console.warn('[IndexedDB] Local blob save note:', dbErr);
    }

    // 2. ☁️ PERSIST TO SUPABASE CLOUD STORAGE (Bucket: campus-assets)
    try {
      const sId = student?.id || studentId || 'student';
      const rawPath = `audio_biography/${sId}_${targetTrackId}_raw.wav`;
      const masterPath = `audio_biography/${sId}_${targetTrackId}_master.wav`;

      const { error: rawErr } = await supabase.storage
        .from('campus-assets')
        .upload(rawPath, rawBlob, { contentType: 'audio/wav', upsert: true });

      if (!rawErr) {
        const { data: rawData } = supabase.storage.from('campus-assets').getPublicUrl(rawPath);
        if (rawData?.publicUrl) rawUrl = rawData.publicUrl;
      }

      const { error: masterErr } = await supabase.storage
        .from('campus-assets')
        .upload(masterPath, masterBlob, { contentType: 'audio/wav', upsert: true });

      if (!masterErr) {
        const { data: masterData } = supabase.storage.from('campus-assets').getPublicUrl(masterPath);
        if (masterData?.publicUrl) masteredUrl = masterData.publicUrl;
      }

      // 3. 🎙️ UPDATE AUDIO-TRESOR STORAGE QUOTA (Consumes school storage_used_bytes)
      let targetSchoolId = student?.school_id || (student as any)?.schoolId || (window as any).__groovelab_school_id || localStorage.getItem('groovelab_school_id') || localStorage.getItem('campus_school_id');

      if (!targetSchoolId && studentId && studentId !== 'anonymous_student') {
        try {
          const { data: stRec } = await supabase
            .from('students')
            .select('school_id')
            .eq('id', studentId)
            .maybeSingle();
          if (stRec?.school_id) {
            targetSchoolId = stRec.school_id;
          }
        } catch (stErr) {
          console.warn('[Storage] School lookup note:', stErr);
        }
      }

      if (targetSchoolId) {
        const addedBytes = (rawBlob?.size || 0) + (masterBlob?.size || 0);
        const { data: schoolData } = await supabase
          .from('schools')
          .select('storage_used_bytes')
          .eq('id', targetSchoolId)
          .maybeSingle();

        if (schoolData) {
          const currentBytes = Number(schoolData.storage_used_bytes || 0);
          const newBytes = currentBytes + addedBytes;
          await supabase
            .from('schools')
            .update({ storage_used_bytes: newBytes })
            .eq('id', targetSchoolId);
        }
      }
    } catch (storageErr) {
      console.warn('[Storage] Cloud storage upload / quota note:', storageErr);
    }


    const versionLabel = selectedVersionChoice === 'master'
      ? 'Studio-Processing (-13 LUFS)'
      : 'Pure RAW (-13 LUFS Lautheits-Match)';

    // Case A: Saving into a Milestone
    if (activeUploadModalMilestone) {
      const msId = activeUploadModalMilestone.id;
      const updated = milestones.map(m => {
        if (m.id === msId) {
          return {
            ...m,
            title: tempSongTitle.trim() || m.title,
            audioUrl: rawUrl,
            masteredAudioUrl: masteredUrl,
            duration: pendingDurationSec || m.duration || 30,
            recordedAt: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }),
            isVerified: isTeacher ? true : m.isVerified,
            isUnerasable: true,
            visibility: tempVisibility,
            personalNote: tempNote.trim() || (tempArtist.trim() ? `Interpret: ${tempArtist.trim()}` : m.personalNote),
            preferredVersion: selectedVersionChoice
          };
        }
        return m;
      });

      saveMilestones(updated);
      setActiveUploadModalMilestone(null);
    } 
    // Case B: Saving into a Custom Playlist
    else if (recordingPlaylistId) {
      const displayTitle = tempSongTitle.trim() || tempNote.trim() || `Song ${new Date().toLocaleDateString('de-DE')}`;
      const artistSubtitle = tempArtist.trim() 
        ? `${tempArtist.trim()} • ${versionLabel}` 
        : versionLabel;

      const newTrack: CustomPlaylistTrack = {
        id: targetTrackId,
        title: displayTitle,
        subtitle: artistSubtitle,
        audioUrl: rawUrl,
        masteredAudioUrl: masteredUrl,
        duration: pendingDurationSec || 45,
        recordedAt: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }),
        personalNote: tempNote.trim(),
        preferredVersion: selectedVersionChoice
      };

      const updatedPlaylists = customPlaylists.map(pl => {
        if (pl.id === recordingPlaylistId) {
          return {
            ...pl,
            tracks: [...pl.tracks, newTrack]
          };
        }
        return pl;
      });

      savePlaylists(updatedPlaylists);
      setRecordingPlaylistId(null);
    }

    setPendingDualResult(null);
    setRecordingMilestoneId(null);
    setRecordSeconds(0);
    setUploadFile(null);
  };

  // 🎛️ Öffnet das Song-Bearbeitungs-Modal (Hall-Regler, Versionen & Songdetails)
  const openEditTrackModal = (playlistId: string, track: CustomPlaylistTrack) => {
    if (audioRef.current) {
      audioRef.current.pause();
      setActivePlayingId(null);
    }
    if (modalPreviewAudioRef.current) {
      modalPreviewAudioRef.current.pause();
      setModalPreviewPlaying(null);
    }
    if (editModalAudioRef.current) {
      editModalAudioRef.current.pause();
      setEditModalPreviewPlaying(null);
    }

    let initialArtist = '';
    if (track.subtitle && track.subtitle.includes(' • ')) {
      const parts = track.subtitle.split(' • ');
      if (parts[0] && !parts[0].includes('Studio-Processing') && !parts[0].includes('Pure RAW')) {
        initialArtist = parts[0];
      }
    }

    setEditingTrackData({
      playlistId,
      trackId: track.id,
      title: track.title,
      subtitle: track.subtitle || '',
      artist: initialArtist,
      personalNote: track.personalNote || '',
      audioUrl: track.audioUrl,
      masteredAudioUrl: track.masteredAudioUrl,
      preferredVersion: track.preferredVersion || 'master',
      reverbWetMix: typeof track.reverbWetMix === 'number' ? track.reverbWetMix : 30
    });
    setEditTempMasterBlob(null);
    setEditTempMasterUrl(null);
  };

  const closeEditTrackModal = () => {
    if (editModalAudioRef.current) {
      editModalAudioRef.current.pause();
      editModalAudioRef.current = null;
    }
    setEditModalPreviewPlaying(null);
    setEditingTrackData(null);
    setEditTempMasterBlob(null);
    setEditTempMasterUrl(null);
  };

  // 🏛️ Interaktive Hall-Regler-Anpassung im Bearbeitungs-Modal
  const handleEditReverbSliderChange = (newPercent: number) => {
    if (!editingTrackData) return;

    setEditingTrackData(prev => prev ? { ...prev, reverbWetMix: newPercent } : null);

    if (reverbDebounceTimerRef.current) {
      clearTimeout(reverbDebounceTimerRef.current);
    }

    reverbDebounceTimerRef.current = setTimeout(async () => {
      if (!editingTrackData) return;
      setIsRemasteringEditTrack(true);
      try {
        // 1. Hole Roh-Audiodatei aus IndexedDB oder Cloud URL
        let rawBlobData = await getBlob(`campus_audio_${editingTrackData.trackId}_raw`);
        let rawBlob: Blob | null = null;
        if (rawBlobData instanceof Blob) {
          rawBlob = rawBlobData;
        } else if (rawBlobData) {
          rawBlob = new Blob([rawBlobData as any], { type: 'audio/wav' });
        } else if (editingTrackData.audioUrl) {
          try {
            const resp = await fetch(editingTrackData.audioUrl);
            if (resp.ok) rawBlob = await resp.blob();
          } catch (fetchErr) {
            console.warn('Could not fetch raw audio url:', fetchErr);
          }
        }

        if (rawBlob) {
          const effectiveProfile: MasteringProfile = selectedProfile;
          const isDrum = effectiveProfile === 'drums_percussion';
          const newMasterRes = await processStudioMastering(rawBlob, {
            profile: effectiveProfile,
            targetLufs: -13.0,
            targetPeakDb: -1.0,
            isDrumPadMode: isDrum,
            applyAutoGainStage: true,
            applyAdaptiveHpf: true,
            applyTransientSoftener: true,
            applyLowEndResonance: true,
            applyMidResonance: true,
            applyTiltEq: true,
            tiltPivotHz: 1000,
            applyDeHarsh: true,
            applyPultecAir: true,
            applyParallelConsoleBus: true,
            applyStereoDimension: true,
            applyConvolutionReverb: true,
            reverbWetMix: isDrum ? 0.12 : (newPercent / 100),
            reverbPreDelayMs: effectiveProfile === 'grand_piano' ? 25 : 30
          });

          setEditTempMasterBlob(newMasterRes.masteredBlob);
          setEditTempMasterUrl(newMasterRes.masteredUrl);

          // Nahtlose Audio-Aktualisierung bei laufender Wiedergabe
          if (editModalPreviewPlaying === 'master' && editModalAudioRef.current) {
            const currentPos = editModalAudioRef.current.currentTime;
            editModalAudioRef.current.pause();
            const newAudio = new Audio(newMasterRes.masteredUrl);
            newAudio.currentTime = currentPos;
            editModalAudioRef.current = newAudio;
            newAudio.play().catch(console.warn);
            newAudio.onended = () => setEditModalPreviewPlaying(null);
          }
        }
      } catch (err) {
        console.warn('Re-master in edit modal failed:', err);
      } finally {
        setIsRemasteringEditTrack(false);
      }
    }, 180);
  };

  // 🎧 Vorhören im Bearbeitungs-Modal
  const toggleEditModalPreview = async (version: 'master' | 'raw') => {
    if (!editingTrackData) return;

    if (editModalPreviewPlaying === version) {
      if (editModalAudioRef.current) {
        editModalAudioRef.current.pause();
      }
      setEditModalPreviewPlaying(null);
    } else {
      if (editModalAudioRef.current) {
        editModalAudioRef.current.pause();
      }

      let targetUrl: string | null = null;
      if (version === 'master') {
        targetUrl = editTempMasterUrl || editingTrackData.masteredAudioUrl || null;
        if (!targetUrl) {
          targetUrl = await resolvePlayableUrl(editingTrackData.audioUrl, editingTrackData.masteredAudioUrl, editingTrackData.trackId, 'master');
        }
      } else {
        targetUrl = editingTrackData.audioUrl || null;
        if (!targetUrl) {
          targetUrl = await resolvePlayableUrl(editingTrackData.audioUrl, editingTrackData.masteredAudioUrl, editingTrackData.trackId, 'raw');
        }
      }

      if (targetUrl) {
        const audio = new Audio(targetUrl);
        editModalAudioRef.current = audio;
        audio.play().catch(console.warn);
        setEditModalPreviewPlaying(version);
        audio.onended = () => {
          setEditModalPreviewPlaying(null);
        };
      }
    }
  };

  // 💾 Speichern der Song-Bearbeitungen
  const handleSaveEditedTrack = async () => {
    if (!editingTrackData) return;
    setIsSavingEditTrack(true);

    try {
      let finalMasteredUrl = editingTrackData.masteredAudioUrl;

      // 1. Wenn ein neuer Master gerendert wurde, in IndexedDB & Cloud speichern
      if (editTempMasterBlob) {
        try {
          await storeBlob(`campus_audio_${editingTrackData.trackId}_master`, editTempMasterBlob);
        } catch (dbErr) {
          console.warn('Local blob update note:', dbErr);
        }

        try {
          const sId = student?.id || studentId || 'student';
          const masterPath = `audio_biography/${sId}_${editingTrackData.trackId}_master.wav`;
          const { error: masterErr } = await supabase.storage
            .from('campus-assets')
            .upload(masterPath, editTempMasterBlob, { contentType: 'audio/wav', upsert: true });

          if (!masterErr) {
            const { data: masterData } = supabase.storage.from('campus-assets').getPublicUrl(masterPath);
            if (masterData?.publicUrl) finalMasteredUrl = masterData.publicUrl;
          }
        } catch (stErr) {
          console.warn('Cloud storage update note:', stErr);
        }
      }

      const versionLabel = editingTrackData.preferredVersion === 'master'
        ? 'Studio-Processing (-13 LUFS)'
        : 'Pure RAW (-13 LUFS Lautheits-Match)';

      const artistSubtitle = editingTrackData.artist?.trim()
        ? `${editingTrackData.artist.trim()} • ${versionLabel}`
        : versionLabel;

      // 2. Playlists State aktualisieren
      if (editingTrackData.playlistId) {
        const updatedPlaylists = customPlaylists.map(pl => {
          if (pl.id === editingTrackData.playlistId) {
            return {
              ...pl,
              tracks: pl.tracks.map(t => {
                if (t.id === editingTrackData.trackId) {
                  return {
                    ...t,
                    title: editingTrackData.title.trim() || t.title,
                    subtitle: artistSubtitle,
                    personalNote: editingTrackData.personalNote?.trim(),
                    preferredVersion: editingTrackData.preferredVersion,
                    reverbWetMix: editingTrackData.reverbWetMix,
                    masteredAudioUrl: finalMasteredUrl || t.masteredAudioUrl
                  };
                }
                return t;
              })
            };
          }
          return pl;
        });

        savePlaylists(updatedPlaylists);
      }

      closeEditTrackModal();
    } finally {
      setIsSavingEditTrack(false);
    }
  };

  // 🌟 PLAYLIST WIZARD: STEP FINALIZE & CREATION
  const completePlaylistWizard = () => {
    if (!wizardTitle.trim()) {
      alert('Bitte gib deiner Playlist einen Namen.');
      return;
    }

    // Add selected milestones as initial tracks
    const initialTracks: CustomPlaylistTrack[] = wizardSelectedMilestones.map(msId => {
      const ms = milestones.find(m => m.id === msId);
      return {
        id: `plt_from_ms_${msId}`,
        title: ms?.title || 'Meilenstein',
        subtitle: ms?.subtitle || '',
        audioUrl: ms?.audioUrl || '',
        masteredAudioUrl: ms?.masteredAudioUrl || ms?.audioUrl || '',
        duration: ms?.duration || 30,
        recordedAt: ms?.recordedAt || 'Verewigt',
        personalNote: ms?.personalNote
      };
    }).filter(t => !!t.audioUrl);

    const newPlaylist: CustomPlaylist = {
      id: `pl_${Date.now()}`,
      title: wizardTitle.trim(),
      description: wizardDesc.trim() || 'Persönliche Song-Sammlung',
      vibeTheme: wizardTheme,
      iconName: wizardIcon,
      coverPresetId: wizardCoverPresetId,
      tracks: initialTracks,
      createdAt: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    const updated = [...customPlaylists, newPlaylist];
    savePlaylists(updated);
    setSelectedCustomPlaylistId(newPlaylist.id);
    setShelfMode('playlists');
    setShowPlaylistWizard(false);
    setWizardStep(1);
    setWizardTitle('');
    setWizardDesc('');
    setWizardCoverPresetId('cov_chart_hits');
    setWizardSelectedMilestones([]);
  };

  // 🗑️ Trigger delete confirmation for a track
  const requestDeleteTrack = (playlistId: string, trackId: string, trackTitle: string) => {
    setPendingDeleteModal({
      type: 'track',
      playlistId,
      trackId,
      title: trackTitle
    });
  };

  // 🗑️ Trigger delete confirmation for a playlist
  const requestDeletePlaylist = (playlistId: string, playlistTitle: string) => {
    setPendingDeleteModal({
      type: 'playlist',
      playlistId,
      title: playlistTitle
    });
  };

  // 🗑️ Execute deletion after explicit user confirmation
  const executeConfirmedDelete = async () => {
    if (!pendingDeleteModal) return;

    let freedTrackCount = 0;
    let targetSchoolId = student?.school_id || (student as any)?.schoolId || (window as any).__groovelab_school_id || localStorage.getItem('groovelab_school_id') || localStorage.getItem('campus_school_id');

    if (!targetSchoolId && studentId && studentId !== 'anonymous_student') {
      try {
        const { data: stRec } = await supabase
          .from('students')
          .select('school_id')
          .eq('id', studentId)
          .maybeSingle();
        if (stRec?.school_id) {
          targetSchoolId = stRec.school_id;
        }
      } catch (stErr) {
        console.warn('[Storage] School lookup note on delete:', stErr);
      }
    }

    if (pendingDeleteModal.type === 'track' && pendingDeleteModal.trackId) {
      const { playlistId, trackId } = pendingDeleteModal;
      deleteBlob(`campus_audio_${trackId}_raw`).catch(console.warn);
      deleteBlob(`campus_audio_${trackId}_master`).catch(console.warn);
      freedTrackCount = 1;

      const updated = customPlaylists.map(pl => {
        if (pl.id === playlistId) {
          return {
            ...pl,
            tracks: pl.tracks.filter(t => t.id !== trackId)
          };
        }
        return pl;
      });
      savePlaylists(updated);
    } else if (pendingDeleteModal.type === 'playlist') {
      const { playlistId } = pendingDeleteModal;
      const targetPl = customPlaylists.find(p => p.id === playlistId);
      if (targetPl) {
        freedTrackCount = targetPl.tracks.length;
        targetPl.tracks.forEach(t => {
          deleteBlob(`campus_audio_${t.id}_raw`).catch(console.warn);
          deleteBlob(`campus_audio_${t.id}_master`).catch(console.warn);
        });
      }
      const updated = customPlaylists.filter(pl => pl.id !== playlistId);
      savePlaylists(updated);
      if (selectedCustomPlaylistId === playlistId) {
        setSelectedCustomPlaylistId(updated[0]?.id || null);
      }
    }

    // Decrement school storage quota (avg 26 MB per track with Master + RAW)
    if (targetSchoolId && freedTrackCount > 0) {
      try {
        const approxFreedBytes = freedTrackCount * 26 * 1024 * 1024;
        const { data: schoolData } = await supabase
          .from('schools')
          .select('storage_used_bytes')
          .eq('id', targetSchoolId)
          .maybeSingle();

        if (schoolData) {
          const currentBytes = Number(schoolData.storage_used_bytes || 0);
          const newBytes = Math.max(0, currentBytes - approxFreedBytes);
          await supabase
            .from('schools')
            .update({ storage_used_bytes: newBytes })
            .eq('id', targetSchoolId);
        }
      } catch (quotaErr) {
        console.warn('[Audio-Tresor] Quota reduction note:', quotaErr);
      }
    }

    setPendingDeleteModal(null);
  };



  const verifyMilestoneByTeacher = (msId: string) => {
    const updated = milestones.map(m => {
      if (m.id === msId) {
        return {
          ...m,
          isVerified: true,
          isUnerasable: true
        };
      }
      return m;
    });
    saveMilestones(updated);
  };

  const toggleVisibility = (msId: string) => {
    const updated = milestones.map(m => {
      if (m.id === msId) {
        return {
          ...m,
          visibility: (m.visibility === 'private' ? 'teacher_allowed' : 'private') as 'private' | 'teacher_allowed'
        };
      }
      return m;
    });
    saveMilestones(updated);
  };

  const openReflectionModal = (ms: MilestoneData) => {
    setActiveReflectionMilestone(ms);
    setReflectionText(ms.personalNote || '');
  };

  const saveReflectionNote = () => {
    if (!activeReflectionMilestone) return;
    const updated = milestones.map(m => {
      if (m.id === activeReflectionMilestone.id) {
        return {
          ...m,
          personalNote: reflectionText
        };
      }
      return m;
    });
    saveMilestones(updated);
    setActiveReflectionMilestone(null);
  };

  const copyToClipboard = (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 3000);
        }).catch(() => {
          fallbackCopyText(text);
        });
      } else {
        fallbackCopyText(text);
      }
    } catch {
      fallbackCopyText(text);
    }
  };

  const fallbackCopyText = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 3000);
      }
    } catch (err) {
      console.warn('Fallback copy failed:', err);
    }
  };

  // Deterministic PIN hash helper for cross-device family verification
  const computePinHash = (pin: string): string => {
    if (!pin) return '';
    const clean = pin.trim();
    let h = 0x811c9dc5;
    const str = `campus_groovelab_salt_${clean}`;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(36);
  };

  const effectiveShareUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (shareTargetPlaylistId) params.set('pl', shareTargetPlaylistId);
    if (shareAnonymously) params.set('anon', '1');
    if (!shareAllowApplause) params.set('appl', '0');
    if (sharePin) params.set('pinh', computePinHash(sharePin));
    const qs = params.toString();
    return `${window.location.origin}/bio/${studentId || 'talent'}${qs ? `?${qs}` : ''}`;
  }, [studentId, shareTargetPlaylistId, shareAnonymously, shareAllowApplause, sharePin]);

  const fullShareText = useMemo(() => {
    return `🎵 Höre dir meine neuesten Songs aus der Musikschule an!\n\n1. Link öffnen: ${effectiveShareUrl}\n2. Familien-PIN eingeben: ${sharePin || '4829'}\n\n🔒 WICHTIGER RECHTSHINWEIS (§ 15 Abs. 3 UrhG):\nDieser Link & PIN sind ausschließlich für den privaten Familienkreis bestimmt. Ein öffentliches Teilen (z. B. auf Social Media, Instagram, TikTok oder Websites) ist urheberrechtlich strengstens untersagt.`;
  }, [effectiveShareUrl, sharePin]);

  const handleShareLink = async () => {
    // Save current PIN for this student/playlist
    try {
      if (studentId && sharePin) {
        localStorage.setItem(`campus_share_pin_${studentId}`, sharePin);
        if (shareTargetPlaylistId) {
          localStorage.setItem(`campus_share_pin_${studentId}_${shareTargetPlaylistId}`, sharePin);
        }
      }
    } catch {}

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `🎵 Audio-Biografie & Songs`,
          text: fullShareText
        });
        return;
      } catch (err) {
        // Fallback to clipboard if share cancelled or unsupported
      }
    }
    copyToClipboard(fullShareText);
  };

  const handleShareWhatsApp = () => {
    try {
      if (studentId && sharePin) {
        localStorage.setItem(`campus_share_pin_${studentId}`, sharePin);
        if (shareTargetPlaylistId) {
          localStorage.setItem(`campus_share_pin_${studentId}_${shareTargetPlaylistId}`, sharePin);
        }
      }
    } catch {}

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullShareText)}`;
    window.open(waUrl, '_blank');
  };

  const isLight = theme === 'light';

  // HIGH-CONTRAST APPLE COLOR TOKENS
  const colors = {
    bg: isLight ? '#f8fafc' : 'radial-gradient(ellipse at top, #111827 0%, #030712 100%)',
    textPrimary: isLight ? '#0f172a' : '#ffffff',
    textSecondary: isLight ? '#334155' : '#e2e8f0',
    textMuted: isLight ? '#475569' : '#cbd5e1',
    cardBg: isLight ? '#ffffff' : 'rgba(17, 24, 39, 0.85)',
    cardBgHighlight: isLight ? '#f0fdf4' : 'rgba(31, 41, 55, 0.95)',
    cardBorder: isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.14)',
    cardBorderHighlight: isLight ? '#86efac' : 'rgba(16, 185, 129, 0.5)',
    panelBg: isLight ? '#f1f5f9' : 'rgba(15, 23, 42, 0.75)',
    panelBorder: isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.1)',
    noteBg: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.07)',
    noteBorder: isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.18)',
    shadow: isLight ? '0 4px 20px rgba(0, 0, 0, 0.06)' : '0 10px 30px rgba(0, 0, 0, 0.45)',
    emerald: '#10b981',
    gold: '#f59e0b'
  };

  const renderIcon = (iconName: string, isGold: boolean = false) => {
    const props = { size: 20, color: isGold ? '#f59e0b' : '#10b981', strokeWidth: 2.2 };
    switch (iconName) {
      case 'sparkles': return <Sparkles {...props} />;
      case 'sliders': return <Sliders {...props} />;
      case 'music': return <Music {...props} />;
      case 'gift': return <Gift {...props} />;
      case 'bell': return <Bell {...props} />;
      case 'zap': return <Zap {...props} />;
      case 'lightbulb': return <Lightbulb {...props} />;
      case 'flame': return <Flame {...props} />;
      case 'heart': return <Heart {...props} />;
      default: return <Sparkles {...props} />;
    }
  };

  const completedCount = milestones.filter(m => m.audioUrl).length;
  const progressPercent = Math.round((completedCount / (milestones.length || 9)) * 100);
  const selectedYearObj = activeSchoolYears.find((y: SchoolYearLP) => y.id === selectedYearId) || activeSchoolYears[0];

  const currentShelfVibeObj = shelfMode === 'years'
    ? { 
        color: selectedYearObj?.accentColor || '#10b981', 
        gradient: selectedYearObj?.gradient || 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
        title: selectedYearObj?.title || 'Aktuelle Meisterreise', 
        subtitle: selectedYearObj?.subtitle || 'Meisterstücke & Soli', 
        year: selectedYearObj?.year || '2026/2027',
        tracksCount: activePlaylistTracks.length 
      }
    : {
        color: VIBE_THEMES.find(v => v.id === activeCustomPlaylist?.vibeTheme)?.color || '#10b981',
        gradient: VIBE_THEMES.find(v => v.id === activeCustomPlaylist?.vibeTheme)?.gradient || 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        title: activeCustomPlaylist?.title || 'Eigene Playlist',
        subtitle: activeCustomPlaylist?.description || 'Custom Album',
        year: 'Custom',
        tracksCount: activeCustomPlaylist?.tracks.length || 0
      };

  const isAllMilestonesCompleted = shelfMode === 'years' && milestones.length >= 9 && milestones.every(m => !!m.audioUrl);
  const station1 = milestones.find(m => m.stepNumber === 1 && m.audioUrl);
  const station9 = milestones.find(m => m.stepNumber === 9 && m.audioUrl);
  const canPlayAB = !!station1 && !!station9;
  const abRecordedCount = (station1 ? 1 : 0) + (station9 ? 1 : 0);

  const formatSeconds = (sec?: number) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const calcTracksDurationFormatted = (tracks: Array<{ duration?: number }>) => {
    const totalSec = tracks.reduce((acc, t) => acc + (t.duration || 60), 0);
    const min = Math.ceil(totalSec / 60);
    return `${min} Min.`;
  };

  // 🎨 Dedicated Spotify Editorial Icon Renderer
  const renderCoverIcon = (iconName: string, size = 26, color = '#ffffff') => {
    const props = { size, color, strokeWidth: 2.2 };
    switch (iconName) {
      case 'sparkles': return <Sparkles {...props} />;
      case 'sliders': return <Sliders {...props} />;
      case 'music': return <Music {...props} />;
      case 'gift': return <Gift {...props} />;
      case 'bell': return <Bell {...props} />;
      case 'zap': return <Zap {...props} />;
      case 'lightbulb': return <Lightbulb {...props} />;
      case 'flame': return <Flame {...props} />;
      case 'heart': return <Heart {...props} />;
      case 'sun': return <Sun {...props} />;
      case 'disc': return <Disc {...props} />;
      case 'award': return <Award {...props} />;
      case 'star': return <Star {...props} />;
      case 'radio': return <Radio {...props} />;
      case 'volume-2': return <Volume2 {...props} />;
      default: return <Music {...props} />;
    }
  };

  // 🎨 High-Performance Spotify Editorial Vector Artwork Renderer (1:1 Square)
  const renderSpotifyCoverArtwork = ({
    gradient,
    accentColor,
    badge,
    title,
    subtitle,
    volLabel,
    iconName,
    emoji,
    isMilestoneMaster = false,
    progressLabel
  }: {
    gradient: string;
    accentColor: string;
    badge?: string;
    title: string;
    subtitle?: string;
    volLabel?: string;
    iconName?: string;
    emoji?: string;
    isMilestoneMaster?: boolean;
    progressLabel?: string;
  }) => {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        background: gradient,
        borderRadius: '14px',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '16px',
        boxSizing: 'border-box',
        boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.18)'
      }}>
        {/* Subtle Geometric Overlay */}
        <div style={{
          position: 'absolute',
          top: '-20%',
          right: '-20%',
          width: '70%',
          height: '70%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.22) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* Diagonal Light Streak */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.02) 40%, transparent 60%)',
          pointerEvents: 'none'
        }} />

        {/* Top Header Row: Spotify Editorial Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 }}>
          <span style={{
            fontSize: '0.62rem',
            fontWeight: 900,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#ffffff',
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            padding: '3px 8px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            {volLabel || badge || 'PLAYLIST'}
          </span>

          {isMilestoneMaster ? (
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}>
              <Award size={14} color="#b45309" />
            </div>
          ) : emoji ? (
            <span style={{ fontSize: '1.25rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>{emoji}</span>
          ) : null}
        </div>

        {/* Center Artwork Graphic / Icon */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          zIndex: 2,
          margin: 'auto 0'
        }}>
          {isMilestoneMaster ? (
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: 'rgba(0, 0, 0, 0.35)',
              border: '2px solid rgba(255, 255, 255, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
            }}>
              <Sparkles size={34} color="#fde047" />
            </div>
          ) : (
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(8px)',
              border: '1.5px solid rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 18px rgba(0,0,0,0.3)'
            }}>
              {renderCoverIcon(iconName || 'music', 28, '#ffffff')}
            </div>
          )}
        </div>

        {/* Bottom Title & Subtitle Banner inside Cover */}
        <div style={{ zIndex: 2, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{
            fontSize: '1rem',
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '-0.02em',
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {title}
          </span>
          {subtitle && (
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.85)',
              textShadow: '0 1px 4px rgba(0, 0, 0, 0.6)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {subtitle}
            </span>
          )}
          {progressLabel && (
            <span style={{
              marginTop: '4px',
              fontSize: '0.64rem',
              fontWeight: 900,
              color: '#fef3c7',
              background: 'rgba(0, 0, 0, 0.5)',
              padding: '2px 6px',
              borderRadius: '4px',
              alignSelf: 'flex-start'
            }}>
              ⭐ {progressLabel}
            </span>
          )}
        </div>
      </div>
    );
  };

  // 🟢 Pure Spotify 1:1 Square Card Component
  const renderSpotifyCoverCard = (item: {
    id: string;
    title: string;
    subtitle: string;
    badge?: string;
    trackCount: number;
    totalDurationMin?: number;
    gradient: string;
    accentColor: string;
    iconName?: string;
    coverEmoji?: string;
    volLabel?: string;
    isMilestoneMaster?: boolean;
    progressLabel?: string;
    isPlayingThisAlbum?: boolean;
    isBoxsetFolder?: boolean;
    onPlay: (e: React.MouseEvent) => void;
    onOpen: () => void;
    onShare?: (e: React.MouseEvent) => void;
    onBooklet?: (e: React.MouseEvent) => void;
  }) => {
    const isPlaying = !!item.isPlayingThisAlbum;

    return (
      <div
        key={item.id}
        onClick={item.onOpen}
        style={{
          flex: '0 0 auto',
          width: isMobileOrSim ? '180px' : '220px',
          scrollSnapAlign: 'start',
          borderRadius: '16px',
          background: isLight ? '#ffffff' : 'rgba(30, 41, 59, 0.6)',
          border: `1.5px solid ${isPlaying ? item.accentColor : (isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)')}`,
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          cursor: 'pointer',
          boxShadow: isPlaying 
            ? `0 12px 30px ${item.accentColor}33` 
            : (isLight ? '0 4px 14px rgba(0, 0, 0, 0.04)' : '0 6px 20px rgba(0, 0, 0, 0.3)'),
          position: 'relative',
          boxSizing: 'border-box'
        }}
        className="spotify-card-hover"
      >
        {/* 1:1 Square Artwork Container */}
        <div style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1 / 1',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          {renderSpotifyCoverArtwork({
            gradient: item.gradient,
            accentColor: item.accentColor,
            badge: item.badge,
            title: item.title,
            subtitle: item.subtitle,
            volLabel: item.volLabel,
            iconName: item.iconName,
            emoji: item.coverEmoji,
            isMilestoneMaster: item.isMilestoneMaster,
            progressLabel: item.progressLabel
          })}

          {/* 🟢 Spotify Floating Play Button (Bottom-Right Hover) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              item.onPlay(e);
            }}
            title={isPlaying ? "Wiedergabe pausieren" : "Playlist abspielen"}
            style={{
              position: 'absolute',
              bottom: '10px',
              right: '10px',
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: '#10b981',
              border: 'none',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.45)',
              opacity: isPlaying ? 1 : undefined,
              zIndex: 10
            }}
            className="spotify-play-btn"
          >
            {isPlaying ? (
              <Pause size={20} fill="#ffffff" color="#ffffff" />
            ) : (
              <Play size={20} fill="#ffffff" color="#ffffff" style={{ marginLeft: '2px' }} />
            )}
          </button>
        </div>

        {/* Card Typography & Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
            <h4 style={{
              margin: 0,
              fontSize: '0.92rem',
              fontWeight: 900,
              color: isPlaying ? '#10b981' : colors.textPrimary,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: '-0.01em'
            }}>
              {item.title}
            </h4>

            {item.onBooklet && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); item.onBooklet!(e); }}
                title="Booklet anzeigen"
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                className="hover-scale"
              >
                <BookOpen size={14} />
              </button>
            )}
          </div>

          <span style={{
            fontSize: '0.74rem',
            color: colors.textSecondary,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontWeight: 500
          }}>
            {item.subtitle}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                color: colors.textMuted
              }}>
                {item.trackCount} {item.trackCount === 1 ? 'Track' : 'Tracks'}
                {item.totalDurationMin ? ` • ${item.totalDurationMin} Min.` : ''}
              </span>
            </div>

            {item.isBoxsetFolder && (
              <span style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                color: '#06b6d4',
                background: isLight ? '#e0f2fe' : 'rgba(6, 182, 212, 0.15)',
                padding: '2px 6px',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}>
                <Folder size={10} />
                Ordner
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 🌟 1. TAB: MASTER ÜBERSICHT (SPOTIFY PLAYLIST HUB MIT NEBENEINANDER LIEGENDEN COVERN)
  const renderOverviewShelf = () => {
    const completedMilestones = milestones.filter(m => !!m.audioUrl);
    const milestonesRecordedCount = completedMilestones.length;
    const milestonesTotalSec = completedMilestones.reduce((acc, m) => acc + (m.duration || 60), 0);
    const milestonesMin = Math.ceil(milestonesTotalSec / 60);

    const isCurrentSchoolYear = (dateStr?: string) => {
      if (!dateStr) return true;
      return dateStr.includes('2026') || dateStr.includes('2027') || !dateStr.includes('/');
    };

    const currentYearPlaylists = customPlaylists.filter(pl => isCurrentSchoolYear(pl.createdAt));
    const schoolYearAlbums = activeSchoolYears.filter(y => y.id !== 'lp_timeless_master');

    const isMilestonesPlaying = isPlayingPlaylist && (currentAlbumMeta?.title.includes('Meilenstein') || (playbackQueue.length > 0 && playbackQueue[0]?.id.startsWith('ms_')));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>

        {/* ⭐ SEKTION 1: MEINE MEILENSTEIN-PLAYLIST (ZEITLOS) */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} color="#f59e0b" />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: colors.textPrimary }}>
                1. Meine Meilenstein-Playlist (Zeitlos)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveMainTab('milestones')}
              style={{
                background: 'none',
                border: 'none',
                color: '#10b981',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>Zur 9-Stationen Chronik</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Horizontale Leiste: Nebeneinander platziert */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '18px',
            overflowX: 'auto',
            paddingBottom: '12px',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch'
          }}>
            {renderSpotifyCoverCard({
              id: 'sp_milestones_master',
              title: 'Meine Meilenstein-LP',
              subtitle: '9 Meilensteine • Lebenswerk',
              badge: '⭐ MASTER-LP',
              volLabel: 'MEISTER-LP',
              trackCount: completedMilestones.length,
              totalDurationMin: milestonesMin,
              gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 45%, #b45309 100%)',
              accentColor: '#f59e0b',
              isMilestoneMaster: true,
              progressLabel: `${milestonesRecordedCount}/9 gemeistert`,
              isPlayingThisAlbum: isMilestonesPlaying,
              onPlay: () => {
                const tracksToPlay = completedMilestones.map(m => ({
                  id: m.id,
                  title: m.title,
                  subtitle: m.subtitle,
                  audioUrl: m.audioUrl!,
                  masteredAudioUrl: m.masteredAudioUrl,
                  duration: m.duration || 60,
                  albumTitle: '🌟 Meine Meilenstein-LP'
                }));
                playAlbumQueue('🌟 Meine Meilenstein-LP (Zeitlos)', '9 Schlüssel-Meilensteine', tracksToPlay, 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', '#f59e0b');
              },
              onOpen: () => setActiveMainTab('milestones'),
              onBooklet: () => {
                setActiveLinerNotesModal({
                  title: '🌟 Meine Meilenstein-LP (Zeitlos)',
                  subtitle: 'Die 9 Meilensteine deiner musikalischen Heldenreise',
                  gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  tracks: milestones.map(m => ({
                    title: m.title,
                    subtitle: m.subtitle,
                    personalNote: m.personalNote,
                    recordedAt: m.recordedAt,
                    duration: m.duration,
                    schoolYear: m.schoolYear
                  }))
                });
              },
              onShare: () => {
                setShareTargetPlaylistId(null);
                setShowShareModal(true);
              }
            })}
          </div>
        </div>

        {/* 🔥 SEKTION 2: PLAYLISTEN IM LAUFENDEN SCHULJAHR (2026/2027) */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flame size={18} color="#ef4444" />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: colors.textPrimary }}>
                2. Playlisten im laufenden Schuljahr (2026/2027)
              </h3>
            </div>

            <button
              type="button"
              onClick={() => {
                setWizardStep(1);
                setShowPlaylistWizard(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                border: 'none',
                color: 'white',
                padding: '6px 14px',
                borderRadius: '100px',
                fontSize: '0.76rem',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(245, 158, 11, 0.3)'
              }}
              className="hover-scale"
            >
              <Plus size={14} />
              <span>Neue Playlist erstellen</span>
            </button>
          </div>

          {/* Horizontale Leiste: Nebeneinander platziert */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '18px',
            overflowX: 'auto',
            paddingBottom: '12px',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch'
          }}>
            {/* Quick-Create Spotify Card */}
            <div
              onClick={() => {
                setWizardStep(1);
                setShowPlaylistWizard(true);
              }}
              style={{
                flex: '0 0 auto',
                width: isMobileOrSim ? '180px' : '220px',
                scrollSnapAlign: 'start',
                borderRadius: '16px',
                border: `2px dashed ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.25)'}`,
                background: isLight ? 'rgba(241, 245, 249, 0.5)' : 'rgba(255, 255, 255, 0.03)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                gap: '10px',
                minHeight: isMobileOrSim ? '240px' : '280px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box'
              }}
              className="hover-scale"
            >
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 6px 18px rgba(245, 158, 11, 0.35)'
              }}>
                <Plus size={24} strokeWidth={2.8} />
              </div>
              <div>
                <span style={{ fontSize: '0.88rem', fontWeight: 900, color: colors.textPrimary, display: 'block' }}>
                  Neue Playlist
                </span>
                <span style={{ fontSize: '0.72rem', color: colors.textMuted, marginTop: '2px', display: 'block' }}>
                  Cover & Songs wählen
                </span>
              </div>
            </div>

            {/* Render Current Year Custom Playlists */}
            {currentYearPlaylists.map((pl) => {
              const presetConfig = UNIVERSAL_PLAYLIST_COVERS.find(c => c.id === pl.coverPresetId);
              const themeObj = VIBE_THEMES.find(v => v.id === pl.vibeTheme) || VIBE_THEMES[0];
              const effectiveGradient = presetConfig?.gradient || themeObj.gradient;
              const effectiveAccent = presetConfig?.accentColor || themeObj.color;
              const effectiveBadge = presetConfig?.badge || `${pl.tracks.length} TRACKS`;
              const isPlayingThis = isPlayingPlaylist && (currentAlbumMeta?.title === pl.title || (activeCustomPlaylist?.id === pl.id && isMiniPlayerPlaying));

              return renderSpotifyCoverCard({
                id: pl.id,
                title: pl.title,
                subtitle: pl.description || 'Studio Playlist',
                badge: effectiveBadge,
                trackCount: pl.tracks.length,
                totalDurationMin: Math.ceil(pl.tracks.reduce((acc, t) => acc + (t.duration || 60), 0) / 60),
                gradient: effectiveGradient,
                accentColor: effectiveAccent,
                iconName: presetConfig?.iconName || pl.iconName,
                coverEmoji: presetConfig?.emoji || (pl.iconName === 'gift' ? '🎄' : pl.iconName === 'sun' ? '☀️' : pl.iconName === 'heart' ? '⭐' : '🎵'),
                isPlayingThisAlbum: isPlayingThis,
                onPlay: () => {
                  playAlbumQueue(pl.title, pl.description || 'Studio Album', pl.tracks, effectiveGradient, effectiveAccent);
                },
                onOpen: () => {
                  setSelectedCustomPlaylistId(pl.id);
                  setActiveMainTab('playlists');
                },
                onBooklet: () => {
                  setActiveLinerNotesModal({
                    title: pl.title,
                    subtitle: pl.description,
                    gradient: effectiveGradient,
                    tracks: pl.tracks.map(t => ({
                      title: t.title,
                      subtitle: t.subtitle,
                      personalNote: t.personalNote,
                      recordedAt: t.recordedAt,
                      duration: t.duration
                    }))
                  });
                },
                onShare: () => {
                  setShareTargetPlaylistId(pl.id);
                  setShowShareModal(true);
                }
              });
            })}
          </div>
        </div>

        {/* 📚 SEKTION 3: SCHULJAHRES-ALBEN (10-JAHRES-ROTATION) */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Folder size={18} color="#06b6d4" />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: colors.textPrimary }}>
                3. Schuljahres-Alben (10-Jahres-Rotation)
              </h3>
            </div>
            <span style={{ fontSize: '0.76rem', color: colors.textMuted, fontWeight: 600 }}>
              Play-Button startet die Jahres-LP • Klick öffnet den Schuljahr-Ordner
            </span>
          </div>

          {/* Horizontale Leiste: Nebeneinander platziert */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '18px',
            overflowX: 'auto',
            paddingBottom: '12px',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch'
          }}>
            {schoolYearAlbums.map((lp) => {
              const yearPlaylists = customPlaylists.filter(pl => pl.createdAt && pl.createdAt.includes(lp.year));
              const yearMilestones = milestones.filter(m => m.audioUrl && (m.schoolYear === lp.year || (lp.isCurrent && !m.schoolYear)));
              const allYearTracks = [
                ...yearMilestones.map(m => ({
                  id: m.id,
                  title: m.title,
                  subtitle: m.subtitle,
                  audioUrl: m.audioUrl!,
                  masteredAudioUrl: m.masteredAudioUrl,
                  duration: m.duration || 60,
                  albumTitle: lp.title
                })),
                ...yearPlaylists.flatMap(pl => pl.tracks.map(t => ({ ...t, albumTitle: pl.title })))
              ];

              const totalTracks = allYearTracks.length;
              const totalMin = Math.ceil(allYearTracks.reduce((acc, t) => acc + (t.duration || 60), 0) / 60);
              const isPlayingThisLP = isPlayingPlaylist && currentAlbumMeta?.title === lp.title;

              return renderSpotifyCoverCard({
                id: lp.id,
                title: lp.title,
                subtitle: `${lp.subtitle} (${totalTracks} Tracks)`,
                badge: lp.volLabel,
                volLabel: lp.volLabel,
                trackCount: totalTracks,
                totalDurationMin: totalMin,
                gradient: lp.gradient,
                accentColor: lp.accentColor,
                iconName: SCHOOL_YEAR_COVERS.find(c => c.vol === lp.volNum)?.iconName || 'disc',
                isBoxsetFolder: true,
                isPlayingThisAlbum: isPlayingThisLP,
                onPlay: () => {
                  playAlbumQueue(lp.title, lp.subtitle, allYearTracks, lp.gradient, lp.accentColor);
                },
                onOpen: () => {
                  setActiveSchoolYearFolderModal(lp);
                },
                onBooklet: () => {
                  setActiveLinerNotesModal({
                    title: `${lp.title} (Liner-Notes)`,
                    subtitle: `Gesamt-Chronik aller Aufnahmen im Schuljahr ${lp.year}`,
                    gradient: lp.gradient,
                    tracks: allYearTracks.map(t => ({
                      title: t.title,
                      subtitle: t.subtitle,
                      duration: t.duration,
                      schoolYear: lp.year
                    }))
                  });
                },
                onShare: () => {
                  setShareTargetPlaylistId(null);
                  setShowShareModal(true);
                }
              });
            })}
          </div>
        </div>

      </div>
    );
  };

  // 📁 MODAL: SCHULJAHR-ORDNER & DETAIL-REGAL
  const renderSchoolYearFolderModal = () => {
    if (!activeSchoolYearFolderModal) return null;
    const lp = activeSchoolYearFolderModal;

    const yearPlaylists = customPlaylists.filter(pl => pl.createdAt && pl.createdAt.includes(lp.year));
    const yearMilestones = milestones.filter(m => m.audioUrl && (m.schoolYear === lp.year || (lp.isCurrent && !m.schoolYear)));
    const allYearTracks = [
      ...yearMilestones.map(m => ({
        id: m.id,
        title: m.title,
        subtitle: m.subtitle,
        audioUrl: m.audioUrl!,
        masteredAudioUrl: m.masteredAudioUrl,
        duration: m.duration || 60,
        albumTitle: lp.title
      })),
      ...yearPlaylists.flatMap(pl => pl.tracks.map(t => ({ ...t, albumTitle: pl.title })))
    ];

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px'
      }}>
        <div style={{
          background: isLight ? '#ffffff' : '#1e293b',
          border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
          borderRadius: '28px',
          padding: '28px',
          maxWidth: '740px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          color: colors.textPrimary,
          display: 'flex',
          flexDirection: 'column',
          gap: '22px',
          boxShadow: '0 30px 70px rgba(0, 0, 0, 0.8)'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: lp.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 6px 18px rgba(0,0,0,0.3)'
              }}>
                <FolderOpen size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: lp.accentColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Schuljahr-Archiv
                </span>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900 }}>
                  Schuljahr {lp.year} – Playlists & Aufnahmen
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveSchoolYearFolderModal(null)}
              style={{
                background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.textSecondary,
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Action: Play entire school year */}
          <div style={{
            background: isLight ? '#f8fafc' : 'rgba(15, 23, 42, 0.6)',
            border: `1px solid ${colors.panelBorder}`,
            borderRadius: '18px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div>
              <span style={{ fontSize: '0.9rem', fontWeight: 900, color: colors.textPrimary, display: 'block' }}>
                Gesamte Jahres-LP abspielen
              </span>
              <span style={{ fontSize: '0.76rem', color: colors.textMuted }}>
                {allYearTracks.length} Aufnahmen • {Math.ceil(allYearTracks.reduce((acc, t) => acc + (t.duration || 60), 0) / 60)} Minuten Gesamt-Laufzeit
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                playAlbumQueue(`Schuljahr ${lp.year} (Gesamt-LP)`, lp.subtitle, allYearTracks, lp.gradient, lp.accentColor);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                color: 'white',
                padding: '10px 18px',
                borderRadius: '100px',
                fontSize: '0.82rem',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
              }}
              className="hover-scale"
            >
              <Play size={16} />
              <span>Ganzes Schuljahr abspielen</span>
            </button>
          </div>

          {/* Playlists in this school year */}
          <div>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.94rem', fontWeight: 900, color: colors.textPrimary }}>
              Playlists in diesem Schuljahr ({yearPlaylists.length})
            </h4>

            {yearPlaylists.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', background: isLight ? '#f8fafc' : 'rgba(0,0,0,0.2)', borderRadius: '14px', color: colors.textMuted, fontSize: '0.82rem' }}>
                Keine separaten Playlists für dieses Schuljahr angelegt.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobileOrSim ? '1fr' : 'repeat(2, 1fr)', gap: '12px' }}>
                {yearPlaylists.map((pl) => {
                  const themeObj = VIBE_THEMES.find(v => v.id === pl.vibeTheme) || VIBE_THEMES[0];
                  return (
                    <div
                      key={pl.id}
                      style={{
                        background: isLight ? '#ffffff' : 'rgba(30, 41, 59, 0.8)',
                        border: `1px solid ${colors.cardBorder}`,
                        borderRadius: '16px',
                        padding: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          background: themeObj.gradient,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white'
                        }}>
                          <Music size={18} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.86rem', fontWeight: 900, color: colors.textPrimary, display: 'block' }}>
                            {pl.title}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: colors.textMuted }}>
                            {pl.tracks.length} Songs • -13 LUFS
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          playAlbumQueue(pl.title, pl.description || 'Playlist', pl.tracks, themeObj.gradient, themeObj.color);
                        }}
                        style={{
                          background: '#10b981',
                          border: 'none',
                          color: 'white',
                          borderRadius: '50%',
                          width: '34px',
                          height: '34px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <Play size={15} style={{ marginLeft: '2px' }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Milestones in this school year */}
          <div>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.94rem', fontWeight: 900, color: colors.textPrimary }}>
              Gemeisterte Meilensteine in diesem Schuljahr ({yearMilestones.length})
            </h4>

            {yearMilestones.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', background: isLight ? '#f8fafc' : 'rgba(0,0,0,0.2)', borderRadius: '14px', color: colors.textMuted, fontSize: '0.82rem' }}>
                Keine Meilensteine in diesem Schuljahr aufgezeichnet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {yearMilestones.map((ms) => (
                  <div
                    key={ms.id}
                    style={{
                      background: isLight ? '#ffffff' : 'rgba(30, 41, 59, 0.8)',
                      border: `1px solid ${colors.cardBorder}`,
                      borderRadius: '14px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: '#f59e0b',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 900
                      }}>
                        <Check size={14} strokeWidth={3} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.84rem', fontWeight: 800, color: colors.textPrimary, display: 'block' }}>
                          Station {ms.stepNumber}: {ms.title}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: colors.textMuted }}>
                          {ms.subtitle}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePlayToggle(ms.audioUrl, ms.masteredAudioUrl, ms.id)}
                      style={{
                        background: activePlayingId === ms.id ? '#f59e0b' : '#10b981',
                        border: 'none',
                        color: 'white',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      {activePlayingId === ms.id ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: '2px' }} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 📖 MODAL: DIGITALES LINER-NOTES BOOKLET
  const renderLinerNotesModal = () => {
    if (!activeLinerNotesModal) return null;
    const bk = activeLinerNotesModal;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px'
      }}>
        <div style={{
          background: isLight ? '#ffffff' : '#1e293b',
          border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
          borderRadius: '28px',
          padding: '28px',
          maxWidth: '680px',
          width: '100%',
          maxHeight: '88vh',
          overflowY: 'auto',
          color: colors.textPrimary,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxShadow: '0 30px 70px rgba(0, 0, 0, 0.8)'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BookOpen size={22} color="#10b981" />
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase' }}>
                  Digitales CD-Booklet & Liner-Notes
                </span>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>
                  {bk.title}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveLinerNotesModal(null)}
              style={{
                background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.textSecondary,
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>

          <p style={{ margin: 0, fontSize: '0.84rem', color: colors.textSecondary, lineHeight: 1.45 }}>
            {bk.subtitle || 'Persönliche Notizen, didaktische Meilenstein-Erklärungen und Tonstudio-Aufnahmeberichte.'}
          </p>

          {/* Tracks Liner-Notes List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {bk.tracks.map((t, idx) => (
              <div
                key={idx}
                style={{
                  background: isLight ? '#f8fafc' : 'rgba(15, 23, 42, 0.65)',
                  border: `1px solid ${colors.panelBorder}`,
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#10b981', background: isLight ? '#dcfce7' : 'rgba(16,185,129,0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                      #{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                    </span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 900, color: colors.textPrimary }}>
                      {t.title}
                    </span>
                  </div>
                  {t.schoolYear && (
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: colors.textMuted }}>
                      {t.schoolYear}
                    </span>
                  )}
                </div>

                {t.subtitle && (
                  <span style={{ fontSize: '0.76rem', color: colors.textMuted }}>
                    {t.subtitle}
                  </span>
                )}

                {t.personalNote ? (
                  <div style={{
                    marginTop: '4px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.05)',
                    borderLeft: '3px solid #10b981',
                    fontSize: '0.78rem',
                    color: colors.textSecondary,
                    fontStyle: 'italic'
                  }}>
                    💬 "{t.personalNote}"
                  </div>
                ) : (
                  <span style={{ fontSize: '0.74rem', color: colors.textMuted, fontStyle: 'italic', marginTop: '2px' }}>
                    Noch keine persönliche Notiz hinterlegt.
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 💽 PERSISTENT FLOATING BOTTOM MINI-PLAYER (APPLE MUSIC STYLE)
  const renderFloatingMiniPlayer = () => {
    if (!activePlayingId && !isPlayingPlaylist && !isMiniPlayerPlaying) return null;

    const currentTrack = (playbackQueue.length > 0 ? playbackQueue[currentQueueIndex] : null) ||
      milestones.find(m => m.id === activePlayingId) ||
      customPlaylists.flatMap(p => p.tracks).find(t => t.id === activePlayingId) || {
        title: currentAlbumMeta?.title || 'Wiedergabe aktiv',
        subtitle: currentAlbumMeta?.subtitle || 'Campus-Groovelab Studio Player'
      };

    const albumName = currentAlbumMeta?.title || (shelfMode === 'years' ? '🌟 Meine Meilenstein-LP' : activeCustomPlaylist?.title || 'Studio-Album');

    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(94%, 860px)',
        zIndex: 99998,
        background: isLight ? 'rgba(255, 255, 255, 0.94)' : 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
        border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.16)'}`,
        borderRadius: '24px',
        padding: '12px 18px',
        boxShadow: isLight ? '0 16px 45px rgba(0, 0, 0, 0.12)' : '0 20px 50px rgba(0, 0, 0, 0.7)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        boxSizing: 'border-box'
      }}>
        {/* Progress Scrubber */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: colors.textMuted, minWidth: '32px' }}>
            {formatSeconds(audioCurrentTime)}
          </span>
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pos = (e.clientX - rect.left) / rect.width;
              if (audioDuration > 0) seekMiniPlayer(pos * audioDuration);
            }}
            style={{
              flex: 1,
              height: '5px',
              borderRadius: '100px',
              background: isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.15)',
              position: 'relative',
              cursor: 'pointer'
            }}
          >
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: `${audioDuration > 0 ? (audioCurrentTime / audioDuration) * 100 : 0}%`,
              background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
              borderRadius: '100px'
            }} />
          </div>
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: colors.textMuted, minWidth: '32px', textAlign: 'right' }}>
            {formatSeconds(audioDuration)}
          </span>
        </div>

        {/* Main Player Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
          
          {/* Left: Mini-Disc Artwork + Song Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '160px', flex: 1 }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, #0f172a 20%, #334155 22%, #0f172a 40%, #1e293b 60%, #0f172a 80%, #334155 100%)',
              border: '1.5px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              animation: isMiniPlayerPlaying ? 'vinylSpin 3.5s linear infinite' : 'none'
            }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#10b981' }} />
            </div>

            <div style={{ minWidth: 0 }}>
              <span style={{
                display: 'block',
                fontSize: '0.86rem',
                fontWeight: 900,
                color: colors.textPrimary,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {currentTrack.title}
              </span>
              <span style={{
                display: 'block',
                fontSize: '0.72rem',
                color: colors.textMuted,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {albumName}
              </span>
            </div>
          </div>

          {/* Center: Playback Controls (Skip Prev, Play/Pause, Skip Next) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={playPrevInPlaylist}
              title="Vorheriger Song"
              style={{
                background: 'none',
                border: 'none',
                color: colors.textPrimary,
                cursor: 'pointer',
                padding: '6px'
              }}
              className="hover-scale"
            >
              <SkipBack size={18} />
            </button>

            <button
              type="button"
              onClick={toggleMiniPlayerPlay}
              title={isMiniPlayerPlaying ? "Pause" : "Play"}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
              }}
              className="hover-scale"
            >
              {isMiniPlayerPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
            </button>

            <button
              type="button"
              onClick={playNextInPlaylist}
              title="Nächster Song"
              style={{
                background: 'none',
                border: 'none',
                color: colors.textPrimary,
                cursor: 'pointer',
                padding: '6px'
              }}
              className="hover-scale"
            >
              <SkipForward size={18} />
            </button>
          </div>

          {/* Right: Studio Audio-Processing Switcher & Volume */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: isMobileOrSim ? 0 : 1, justifyContent: 'flex-end' }}>
            {!isMobileOrSim && (
              <button
                type="button"
                onClick={() => switchAudioMode(audioMode === 'master' ? 'raw' : 'master')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '100px',
                  border: `1px solid ${audioMode === 'master' ? '#10b981' : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.2)')}`,
                  background: audioMode === 'master' ? (isLight ? '#dcfce7' : 'rgba(16, 185, 129, 0.2)') : 'transparent',
                  color: audioMode === 'master' ? '#10b981' : colors.textMuted,
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                <Sparkles size={12} color="#10b981" />
                <span>{audioMode === 'master' ? '✨ Studio (-13 LUFS)' : '🎙️ RAW'}</span>
              </button>
            )}

            {/* Volume toggle */}
            {!isMobileOrSim && (
              <button
                type="button"
                onClick={() => {
                  if (audioRef.current) {
                    const newMuted = !isMiniPlayerMuted;
                    setIsMiniPlayerMuted(newMuted);
                    audioRef.current.volume = newMuted ? 0 : audioVolume;
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                {isMiniPlayerMuted ? <VolumeX size={16} color="#ef4444" /> : <Volume2 size={16} />}
              </button>
            )}

            {/* Stop & Close Mini-Player */}
            <button
              type="button"
              onClick={() => {
                if (audioRef.current) audioRef.current.pause();
                setActivePlayingId(null);
                setIsMiniPlayerPlaying(false);
                setIsPlayingPlaylist(false);
              }}
              title="Player schließen"
              style={{
                background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.textSecondary,
                cursor: 'pointer'
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderVinylShelf = () => (
    <div style={{
      background: colors.cardBg,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: `1.5px solid ${colors.cardBorder}`,
      borderRadius: '24px',
      padding: '22px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px',
      boxShadow: colors.shadow,
      boxSizing: 'border-box'
    }}>
      {/* Header with Shelf Mode Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ListMusic size={19} color="#10b981" />
          <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 900, color: colors.textPrimary }}>
            Schallplatten-Regal
          </h3>
        </div>

        {/* Toggle between Jahres-LPs and Custom Playlists */}
        <div style={{ display: 'flex', gap: '2px', background: isLight ? '#f1f5f9' : 'rgba(0,0,0,0.3)', borderRadius: '100px', padding: '2px' }}>
          <button
            type="button"
            onClick={() => setShelfMode('years')}
            style={{
              padding: '4px 8px',
              borderRadius: '100px',
              border: 'none',
              background: shelfMode === 'years' ? (isLight ? '#ffffff' : 'rgba(255,255,255,0.2)') : 'transparent',
              color: shelfMode === 'years' ? (isLight ? '#0f172a' : '#ffffff') : colors.textSecondary,
              fontSize: '0.68rem',
              fontWeight: 900,
              cursor: 'pointer'
            }}
          >
            Jahres-LPs
          </button>
          <button
            type="button"
            onClick={() => setShelfMode('playlists')}
            style={{
              padding: '4px 8px',
              borderRadius: '100px',
              border: 'none',
              background: shelfMode === 'playlists' ? (isLight ? '#ffffff' : 'rgba(255,255,255,0.2)') : 'transparent',
              color: shelfMode === 'playlists' ? (isLight ? '#0f172a' : '#ffffff') : colors.textSecondary,
              fontSize: '0.68rem',
              fontWeight: 900,
              cursor: 'pointer'
            }}
          >
            Playlists ({customPlaylists.length})
          </button>
        </div>
      </div>

      {/* Shelf Tabs Selection: Dynamically filtered by student.created_at */}
      {shelfMode === 'years' ? (
        <div style={{ display: 'flex', gap: '6px', background: isLight ? '#f1f5f9' : 'rgba(0, 0, 0, 0.35)', borderRadius: '12px', padding: '4px', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.08)'}` }}>
          {activeSchoolYears.map((lp: SchoolYearLP) => {
            const isSelected = selectedYearId === lp.id;
            return (
              <button
                key={lp.id}
                type="button"
                onClick={() => setSelectedYearId(lp.id)}
                style={{
                  flex: 1,
                  padding: '7px 4px',
                  borderRadius: '9px',
                  border: 'none',
                  background: isSelected ? (isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.16)') : 'transparent',
                  color: isSelected ? (isLight ? '#0f172a' : '#ffffff') : colors.textSecondary,
                  fontSize: '0.72rem',
                  fontWeight: isSelected ? 900 : 700,
                  cursor: 'pointer',
                  boxShadow: isSelected && isLight ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                {lp.year}
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', background: isLight ? '#f1f5f9' : 'rgba(0, 0, 0, 0.35)', borderRadius: '12px', padding: '4px', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.08)'}` }}>
          {customPlaylists.length === 0 ? (
            <span style={{ fontSize: '0.72rem', color: colors.textMuted, padding: '6px 10px' }}>Keine Playlists angelegt</span>
          ) : (
            customPlaylists.map((pl) => {
              const isSelected = selectedCustomPlaylistId === pl.id;
              return (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => setSelectedCustomPlaylistId(pl.id)}
                  style={{
                    flex: 1,
                    padding: '7px 8px',
                    borderRadius: '9px',
                    border: 'none',
                    background: isSelected ? (isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.16)') : 'transparent',
                    color: isSelected ? (isLight ? '#0f172a' : '#ffffff') : colors.textSecondary,
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: isSelected && isLight ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {pl.title}
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Selected Vinyl Turntable Display with Apple Modern Sleeve Layout */}
      <div style={{
        background: isLight ? '#f8fafc' : 'rgba(15, 23, 42, 0.75)',
        border: `1.5px solid ${isAllMilestonesCompleted ? '#f59e0b' : currentShelfVibeObj.color}44`,
        borderRadius: '20px',
        padding: '20px 14px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '14px',
        position: 'relative',
        boxShadow: isAllMilestonesCompleted ? '0 8px 24px rgba(245, 158, 11, 0.2)' : (isLight ? '0 4px 16px rgba(0,0,0,0.04)' : 'none')
      }}>
        {/* 🏆 Golden Vinyl Badge if 9/9 Completed */}
        {isAllMilestonesCompleted && (
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            border: '1px solid #f59e0b',
            borderRadius: '100px',
            padding: '3px 9px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.35)',
            zIndex: 2
          }}>
            <Sparkles size={11} color="#b45309" />
            <span style={{ fontSize: '0.66rem', fontWeight: 900, color: '#b45309', textTransform: 'uppercase' }}>
              Goldene LP
            </span>
          </div>
        )}

        {/* Apple Modern Vinyl & Sleeve Arrangement */}
        <div style={{
          position: 'relative',
          width: '180px',
          height: '140px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* 3D Vinyl Sleeve (Papphülle) */}
          <div style={{
            position: 'absolute',
            left: '8px',
            width: '110px',
            height: '110px',
            borderRadius: '12px',
            background: isAllMilestonesCompleted
              ? 'linear-gradient(135deg, #78350f 0%, #b45309 50%, #f59e0b 100%)'
              : currentShelfVibeObj.gradient,
            boxShadow: '0 10px 24px rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
            zIndex: 1,
            transform: 'rotate(-4deg)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Disc size={14} color="white" />
              <span style={{ fontSize: '0.58rem', fontWeight: 900, color: 'rgba(255, 255, 255, 0.9)' }}>
                {currentShelfVibeObj.year}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '0.62rem', fontWeight: 900, color: 'white', display: 'block', lineHeight: 1.1, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                {student?.first_name || 'Campus'}
              </span>
              <span style={{ fontSize: '0.52rem', color: 'rgba(255, 255, 255, 0.8)', fontWeight: 700 }}>
                {student?.instrument || 'Meister-Album'}
              </span>
            </div>
          </div>

          {/* Rotating Vinyl Disc Sliding out of Sleeve */}
          <div style={{
            position: 'absolute',
            right: '8px',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: isAllMilestonesCompleted
              ? 'radial-gradient(circle, #fef08a 0%, #eab308 40%, #ca8a04 75%, #713f12 100%)'
              : 'radial-gradient(circle, #1c1917 25%, #0c0a09 60%, #000000 100%)',
            border: isAllMilestonesCompleted ? '3.5px solid #ca8a04' : '3.5px solid #292524',
            boxShadow: isAllMilestonesCompleted 
              ? '0 0 28px rgba(234, 179, 8, 0.65)' 
              : ((isPlayingPlaylist || isPlayingABComparison) ? `0 0 28px ${currentShelfVibeObj.color}88` : '0 10px 26px rgba(0, 0, 0, 0.65)'),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: (isPlayingPlaylist || isPlayingABComparison) ? 'vinylSpin 3.5s linear infinite' : 'none',
            transition: 'all 0.3s ease',
            zIndex: 2
          }}>
            {/* Center Label */}
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: isAllMilestonesCompleted
                ? 'linear-gradient(135deg, #78350f 0%, #b45309 100%)'
                : currentShelfVibeObj.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#09090b' }} />
            </div>
          </div>
        </div>

        {/* Album Title & Stats */}
        <div style={{ textAlign: 'center' }}>
          <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900, color: colors.textPrimary }}>
            {isAllMilestonesCompleted ? '🏆 Goldene Meister-LP' : currentShelfVibeObj.title}
          </h4>
          <span style={{ fontSize: '0.76rem', color: colors.textSecondary, marginTop: '3px', display: 'block', fontWeight: 600 }}>
            {currentShelfVibeObj.subtitle} • {activePlaylistTracks.length} / 9 Tracks
          </span>
        </div>

        {/* Smart CTA Main Button: Play or Record First Milestone */}
        {activePlaylistTracks.length === 0 ? (
          <button
            type="button"
            onClick={() => {
              if (milestones.length > 0) {
                openUploadModal(milestones[0]);
              }
            }}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '100px',
              border: 'none',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              fontSize: '0.84rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
              transition: 'all 0.2s ease'
            }}
            className="hover-scale"
          >
            <Mic size={16} />
            <span>Ersten Meilenstein aufnehmen</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={startContinuousPlaylist}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '100px',
              border: 'none',
              background: isPlayingPlaylist ? '#ef4444' : currentShelfVibeObj.gradient,
              color: 'white',
              fontSize: '0.84rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: isPlayingPlaylist ? '0 4px 16px rgba(239, 68, 68, 0.4)' : `0 4px 16px ${currentShelfVibeObj.color}55`,
              transition: 'all 0.2s ease'
            }}
            className="hover-scale"
          >
            {isPlayingPlaylist ? <Pause size={16} /> : <Play size={16} />}
            <span>{isPlayingPlaylist ? 'Playlist anhalten' : 'Komplette Playlist abspielen'}</span>
          </button>
        )}

        {/* Smart Gated A/B Comparison Player Button (Only in Years Shelf) */}
        {shelfMode === 'years' && (
          <button
            type="button"
            onClick={() => {
              if (canPlayAB) {
                startABComparison();
              }
            }}
            disabled={!canPlayAB && !isPlayingABComparison}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '100px',
              border: `1.5px solid ${isPlayingABComparison ? '#f59e0b' : (canPlayAB ? (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.18)') : (isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'))}`,
              background: isPlayingABComparison 
                ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' 
                : (canPlayAB ? (isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.08)') : (isLight ? '#f1f5f9' : 'rgba(255,255,255,0.03)')),
              color: isPlayingABComparison ? '#92400e' : (canPlayAB ? colors.textPrimary : colors.textMuted),
              fontSize: '0.76rem',
              fontWeight: 900,
              cursor: canPlayAB ? 'pointer' : 'not-allowed',
              opacity: canPlayAB ? 1 : 0.65,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: isPlayingABComparison ? '0 4px 16px rgba(245, 158, 11, 0.4)' : 'none',
              transition: 'all 0.2s ease'
            }}
            className={canPlayAB ? 'hover-scale' : ''}
          >
            <History size={15} color={isPlayingABComparison ? '#d97706' : (canPlayAB ? '#10b981' : '#94a3b8')} />
            <span>
              {isPlayingABComparison 
                ? (abComparisonStage === 'station1' ? '🎧 Station 01 (Erster Ton)...' : abComparisonStage === 'transition' ? '✨ Überblende zu heute...' : '🚀 Station 09 (Lieblingssong)!') 
                : (canPlayAB ? '✨ Hörvergleich: Erster Ton vs. Heute' : `🔒 Hörvergleich (${abRecordedCount}/2: #01 & #09 benötigt)`)}
            </span>
          </button>
        )}
      </div>

      {/* Chapter Tracklist: Complete 9 Stations in Years Shelf with Direct Record */}
      <div style={{
        background: isLight ? '#f1f5f9' : 'rgba(0, 0, 0, 0.35)',
        border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.1)'}`,
        borderRadius: '18px',
        overflow: 'hidden'
      }}>
        <button
          type="button"
          onClick={() => setShowChapterList(!showChapterList)}
          style={{
            width: '100%',
            padding: '11px 14px',
            background: 'transparent',
            border: 'none',
            color: colors.textPrimary,
            fontSize: '0.8rem',
            fontWeight: 900,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Disc size={15} color={currentShelfVibeObj.color} />
            <span>
              {shelfMode === 'years' 
                ? `9 Meilenstein-Kapitel (${activePlaylistTracks.length}/9)` 
                : `Titelliste (${activePlaylistTracks.length} Tracks)`}
            </span>
          </div>
          <ChevronDown size={15} style={{ transform: showChapterList ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>

        {showChapterList && (
          <div style={{ padding: '0 10px 10px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {shelfMode === 'years' ? (
              milestones.map((ms) => {
                const isTrackPlaying = activePlayingId === ms.id;
                const isRecorded = !!ms.audioUrl;

                return (
                  <div
                    key={ms.id}
                    style={{
                      padding: '9px 11px',
                      borderRadius: '12px',
                      background: isTrackPlaying 
                        ? (isLight ? '#dcfce7' : 'rgba(16, 185, 129, 0.2)') 
                        : (isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.05)'),
                      border: isTrackPlaying 
                        ? `1.5px solid ${isLight ? '#86efac' : 'rgba(16, 185, 129, 0.5)'}` 
                        : `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.06)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      opacity: isRecorded ? 1 : 0.75,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div 
                      onClick={() => isRecorded && handlePlayToggle(ms.audioUrl, ms.masteredAudioUrl, ms.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: isRecorded ? 'pointer' : 'default', flex: 1 }}
                    >
                      <span style={{ fontSize: '0.72rem', color: isRecorded ? (isLight ? '#059669' : '#34d399') : colors.textMuted, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
                        #{ms.stepNumber < 10 ? `0${ms.stepNumber}` : ms.stepNumber}
                      </span>
                      <div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: isTrackPlaying ? '#10b981' : colors.textPrimary, display: 'block', lineHeight: 1.25 }}>
                          {ms.title}
                        </span>
                        {ms.personalNote && (
                          <span style={{ fontSize: '0.66rem', color: colors.textSecondary, fontStyle: 'italic', fontWeight: 500 }}>
                            "{ms.personalNote.slice(0, 24)}..."
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isRecorded ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handlePlayToggle(ms.audioUrl, ms.masteredAudioUrl, ms.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            {isTrackPlaying ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '12px' }}>
                                {[0, 1, 2].map(b => (
                                  <div
                                    key={b}
                                    style={{
                                      width: '2.5px',
                                      background: '#10b981',
                                      borderRadius: '2px',
                                      animation: 'soundBarPulse 0.8s ease-in-out infinite alternate',
                                      animationDelay: `${b * 0.2}s`
                                    }}
                                  />
                                ))}
                              </div>
                            ) : (
                              <Play size={13} color="#10b981" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadAudioTrack(ms.audioUrl, ms.masteredAudioUrl, ms.title, ms.id);
                            }}
                            title="Song herunterladen"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            className="hover-scale"
                          >
                            <Download size={12} color={isLight ? '#64748b' : '#94a3b8'} />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openUploadModal(ms)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '100px',
                            border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.15)'}`,
                            background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.08)',
                            color: colors.textPrimary,
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          className="hover-scale"
                        >
                          <Mic size={11} color="#10b981" />
                          <span>+ Aufnehmen</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              activePlaylistTracks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '12px', color: colors.textSecondary, fontSize: '0.74rem' }}>
                  Keine Tracks vorhanden
                </div>
              ) : (
                activePlaylistTracks.map((t, idx) => {
                  const isTrackPlaying = activePlayingId === t.id;
                  const isRecorded = !!t.audioUrl;

                  return (
                    <div
                      key={t.id}
                      onClick={() => isRecorded && handlePlayToggle(t.audioUrl, t.masteredAudioUrl, t.id)}
                      style={{
                        padding: '9px 11px',
                        borderRadius: '12px',
                        background: isTrackPlaying 
                          ? (isLight ? '#dcfce7' : 'rgba(16, 185, 129, 0.2)') 
                          : (isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.05)'),
                        border: isTrackPlaying 
                          ? `1.5px solid ${isLight ? '#86efac' : 'rgba(16, 185, 129, 0.5)'}` 
                          : `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.06)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: isRecorded ? 'pointer' : 'default',
                        opacity: isRecorded ? 1 : 0.6,
                        transition: 'all 0.15s ease'
                      }}
                      className={isRecorded ? 'hover-scale' : ''}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.72rem', color: isLight ? '#059669' : '#34d399', fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
                          #{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                        </span>
                        <div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: isTrackPlaying ? '#10b981' : colors.textPrimary, display: 'block', lineHeight: 1.25 }}>
                            {t.title}
                          </span>
                          {(t as any).personalNote && (
                            <span style={{ fontSize: '0.66rem', color: colors.textSecondary, fontStyle: 'italic', fontWeight: 500 }}>
                              "{(t as any).personalNote.slice(0, 24)}..."
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isTrackPlaying ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '12px' }}>
                            {[0, 1, 2].map(b => (
                              <div
                                key={b}
                                style={{
                                  width: '2.5px',
                                  background: '#10b981',
                                  borderRadius: '2px',
                                  animation: 'soundBarPulse 0.8s ease-in-out infinite alternate',
                                  animationDelay: `${b * 0.2}s`
                                }}
                              />
                            ))}
                          </div>
                        ) : isRecorded ? (
                          <Play size={13} color="#10b981" />
                        ) : (
                          <Clock size={13} color={isLight ? '#94a3b8' : '#64748b'} />
                        )}

                        {isRecorded && shelfMode === 'playlists' && selectedCustomPlaylistId && 'audioUrl' in t && t.audioUrl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (selectedCustomPlaylistId) {
                                openEditTrackModal(selectedCustomPlaylistId, t as CustomPlaylistTrack);
                              }
                            }}
                            title="Song bearbeiten"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            className="hover-scale"
                          >
                            <Edit3 size={12} color="#0ea5e9" />
                          </button>
                        )}

                        {isRecorded && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadAudioTrack(t.audioUrl, t.masteredAudioUrl, t.title, t.id);
                            }}
                            title="Song herunterladen"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            className="hover-scale"
                          >
                            <Download size={12} color={isLight ? '#64748b' : '#94a3b8'} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        )}

      </div>

      {/* Quick Share to Family Button */}
      <button
        type="button"
        onClick={() => setShowShareModal(true)}
        style={{
          width: '100%',
          padding: '11px',
          borderRadius: '100px',
          border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.16)'}`,
          background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
          color: colors.textPrimary,
          fontSize: '0.8rem',
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          boxShadow: isLight ? '0 2px 6px rgba(0,0,0,0.04)' : 'none'
        }}
        className="hover-scale"
      >
        <Share2 size={14} color="#10b981" />
        <span>Playlist mit Familie teilen</span>
      </button>
    </div>
  );

  // 🛡️ Audio-Tresor Gate Screen (If School has not purchased storage add-on)
  if (!tresorAccessLoading && !hasAudioTresorStorage) {
    return (
      <div style={{
        flex: 1,
        width: '100%',
        padding: isMobileOrSim ? '24px 16px 100px 16px' : '40px 32px 80px 32px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: colors.bg,
        color: colors.textPrimary,
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        boxSizing: 'border-box'
      }}>
        <div style={{
          maxWidth: '540px',
          width: '100%',
          background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.04)',
          border: `1.5px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)'}`,
          borderRadius: '24px',
          padding: '36px 28px',
          textAlign: 'center',
          boxShadow: isLight ? '0 10px 30px rgba(0,0,0,0.06)' : '0 10px 30px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '18px'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(217, 119, 6, 0.3)'
          }}>
            <Shield size={32} color="#ffffff" />
          </div>

          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 6px 0', color: colors.textPrimary }}>
              Audio-Biografie & Audio-Tresor
            </h2>
            <p style={{ fontSize: '0.85rem', color: colors.textSecondary, margin: 0, lineHeight: 1.5 }}>
              Cloud-Speicher für deine Musikschule erforderlich
            </p>
          </div>

          <div style={{
            background: isLight ? '#fffbeb' : 'rgba(217, 119, 6, 0.1)',
            border: `1px solid ${isLight ? '#fde68a' : 'rgba(217, 119, 6, 0.25)'}`,
            borderRadius: '16px',
            padding: '16px',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={16} color="#d97706" />
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: isLight ? '#92400e' : '#fde68a' }}>
                Funktion ist aktuell nicht freigeschaltet
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: isLight ? '#78350f' : '#cbd5e1', margin: 0, lineHeight: 1.5 }}>
              Die <b>Audio-Biografie</b>, Studio-Playlists und das verlustfreie <b>24-Bit Hi-Res Studio-Mastering</b> stehen deiner Musikschule erst nach Buchung des <b>Audio-Tresor Speicher-Add-ons</b> zur Verfügung.
            </p>
            <p style={{ fontSize: '0.74rem', color: colors.textSecondary, margin: 0, lineHeight: 1.4 }}>
              {isTeacher
                ? '💡 Schulleitung & Verwaltung können den Audio-Tresor im Sekretariats-Dashboard unter "Abrechnung & Cloud-Speicher" jederzeit ab +10 GB aktivieren.'
                : '💡 Bitte wende dich an deine Lehrkraft oder das Sekretariat deiner Musikschule, um den Audio-Tresor zu buchen.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onBackToHub}
            style={{
              width: '100%',
              padding: '12px 20px',
              borderRadius: '14px',
              border: 'none',
              background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.08)',
              color: colors.textPrimary,
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale"
          >
            <span>Zurück zum Hausaufgabenheft / Protokoll</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1,
      width: '100%',
      padding: isMobileOrSim ? '16px 12px 100px 12px' : '24px 28px 80px 28px',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '22px',
      background: colors.bg,
      color: colors.textPrimary,
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      boxSizing: 'border-box',
      transition: 'background 0.3s ease, color 0.3s ease'
    }}>
      {/* Keyframe animations & Spotify Hover Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes soundBarPulse {
          0%, 100% { height: 4px; }
          50% { height: 16px; }
        }
        @keyframes vinylSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes activeStepGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.45); }
          50% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
        }
        @keyframes countInPulse {
          0% { transform: scale(0.6); opacity: 0; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .spotify-card-hover {
          transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease !important;
        }
        .spotify-card-hover:hover {
          transform: translateY(-5px) !important;
        }
        .spotify-play-btn {
          opacity: 0;
          transform: translateY(8px) scale(0.85);
          transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.15s ease !important;
        }
        .spotify-card-hover:hover .spotify-play-btn {
          opacity: 1 !important;
          transform: translateY(0) scale(1) !important;
        }
        .spotify-play-btn:hover {
          transform: translateY(0) scale(1.08) !important;
          background: #059669 !important;
        }
      `}} />

      {/* Top Bar: Navigation, Main Tabs, Theme Switcher & Share */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <button
          type="button"
          onClick={onBackToHub}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
            border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.16)'}`,
            color: colors.textPrimary,
            padding: '8px 16px',
            borderRadius: '100px',
            fontSize: '0.8rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.2s ease'
          }}
          className="hover-scale"
        >
          <span>← Zurück zum Aufgabenheft</span>
        </button>

        {/* 🌟 1. APPLE MAIN SEGMENTED TABS: ÜBERSICHT vs MEILENSTEINE vs PLAYLISTS */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: isLight ? '#e2e8f0' : 'rgba(0, 0, 0, 0.4)',
          border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.12)'}`,
          borderRadius: '100px',
          padding: '4px',
          gap: '4px'
        }}>
          <button
            type="button"
            onClick={() => setActiveMainTab('overview')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '100px',
              border: 'none',
              background: activeMainTab === 'overview' ? (isLight ? '#ffffff' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)') : 'transparent',
              color: activeMainTab === 'overview' ? (isLight ? '#0f172a' : '#ffffff') : colors.textSecondary,
              fontSize: '0.78rem',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: activeMainTab === 'overview' && isLight ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Disc size={14} color={activeMainTab === 'overview' ? (isLight ? '#10b981' : '#ffffff') : undefined} />
            <span>Übersicht</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('milestones')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '100px',
              border: 'none',
              background: activeMainTab === 'milestones' ? (isLight ? '#ffffff' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)') : 'transparent',
              color: activeMainTab === 'milestones' ? (isLight ? '#0f172a' : '#ffffff') : colors.textSecondary,
              fontSize: '0.78rem',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: activeMainTab === 'milestones' && isLight ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Sparkles size={14} color={activeMainTab === 'milestones' ? '#f59e0b' : undefined} />
            <span>Meilensteine (9)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('playlists')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '100px',
              border: 'none',
              background: activeMainTab === 'playlists' ? (isLight ? '#ffffff' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)') : 'transparent',
              color: activeMainTab === 'playlists' ? (isLight ? '#0f172a' : '#ffffff') : colors.textSecondary,
              fontSize: '0.78rem',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: activeMainTab === 'playlists' && isLight ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <ListMusic size={14} color="#10b981" />
            <span>Eigene Playlists ({customPlaylists.length})</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Create Playlist Button */}
          <button
            type="button"
            onClick={() => {
              setWizardStep(1);
              setShowPlaylistWizard(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              border: 'none',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '100px',
              fontSize: '0.8rem',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
              transition: 'all 0.2s ease'
            }}
            className="hover-scale"
          >
            <Plus size={15} />
            <span>Playlist erstellen</span>
          </button>

          {/* Apple Segmented Theme Switcher */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: isLight ? '#e2e8f0' : 'rgba(0, 0, 0, 0.4)',
            border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.12)'}`,
            borderRadius: '100px',
            padding: '3px',
            gap: '2px'
          }}>
            <button
              type="button"
              onClick={() => toggleTheme('light')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                borderRadius: '100px',
                border: 'none',
                background: isLight ? '#ffffff' : 'transparent',
                color: isLight ? '#0f172a' : '#94a3b8',
                fontSize: '0.72rem',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: isLight ? '0 2px 6px rgba(0,0,0,0.12)' : 'none'
              }}
            >
              <Sun size={12} color={isLight ? '#f59e0b' : '#94a3b8'} />
              <span>Hell</span>
            </button>
            <button
              type="button"
              onClick={() => toggleTheme('dark')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                borderRadius: '100px',
                border: 'none',
                background: !isLight ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: !isLight ? '#ffffff' : '#64748b',
                fontSize: '0.72rem',
                fontWeight: 900,
                cursor: 'pointer'
              }}
            >
              <Moon size={12} />
              <span>Studio</span>
            </button>
          </div>

          {/* Share Action */}
          <button
            onClick={() => setShowShareModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '100px',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
              transition: 'all 0.2s ease'
            }}
            className="hover-scale"
          >
            <Share2 size={14} />
            <span>Teilen</span>
          </button>
        </div>
      </div>

      {/* HERO SECTION */}
      <div style={{
        background: isLight ? '#ffffff' : 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: `1px solid ${colors.cardBorder}`,
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        padding: '22px 26px',
        display: 'flex',
        flexDirection: isMobileOrSim ? 'column' : 'row',
        alignItems: isMobileOrSim ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        gap: '20px',
        boxShadow: colors.shadow
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: isLight ? '#dcfce7' : 'rgba(16, 185, 129, 0.18)',
              border: `1px solid ${isLight ? '#86efac' : 'rgba(16, 185, 129, 0.4)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Disc size={24} color="#10b981" />
            </div>
            <h2 style={{
              margin: 0,
              fontSize: isMobileOrSim ? '1.25rem' : '1.5rem',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              color: colors.textPrimary
            }}>
              {activeMainTab === 'overview' 
                ? 'Meine Audio-Biografie – CD & Album-Regal' 
                : activeMainTab === 'milestones' 
                  ? 'Meine Audio-Biografie & Meilenstein-Chronik' 
                  : 'Meine Custom Playlists & Studio-Alben'}
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: '0.86rem', color: colors.textSecondary, maxWidth: '640px', lineHeight: 1.45, fontWeight: 500 }}>
            {activeMainTab === 'overview'
              ? 'Alle deine Playlisten, Meilensteine und Schuljahres-LPs im edlen CD-Cover Format – lückenlos abspielbar mit automatischem Studio-Mastering (-13 LUFS).'
              : activeMainTab === 'milestones' 
                ? 'Deine musikalische Heldenreise in 9 Stationen – mit automatischem Studio Audio-Processing (-13 LUFS Klassik & Jazz Referenz).' 
                : 'Erstelle eigene Alben mit automatischem Studio Audio-Processing (-13 LUFS Klassik & Jazz Referenz).'}
          </p>
        </div>
      </div>



      {/* TAB CONTENT: 1. OVERVIEW (DEFAULT), 2. MILESTONES, OR 3. CUSTOM PLAYLISTS */}
      {activeMainTab === 'overview' ? (
        renderOverviewShelf()
      ) : activeMainTab === 'milestones' ? (
        <>
          {/* Timeline Node Chips */}
          <div style={{
            background: colors.panelBg,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${colors.panelBorder}`,
            borderRadius: '24px',
            padding: '22px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: colors.shadow
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="#f59e0b" />
                <span style={{ fontSize: '0.88rem', fontWeight: 900, color: colors.textPrimary, letterSpacing: '-0.01em' }}>
                  Meilenstein-Chronik (9 Stationen)
                </span>
              </div>
              <span style={{ fontSize: '0.76rem', color: colors.textMuted, fontWeight: 600 }}>
                Tippe auf eine Station, um die Aufnahme aufzurufen
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobileOrSim ? 'repeat(3, 1fr)' : 'repeat(9, 1fr)',
              gap: isMobileOrSim ? '16px 8px' : '8px',
              position: 'relative',
              paddingTop: '6px'
            }}>
              {milestones.map((ms, idx) => {
                const isCompleted = !!ms.audioUrl;
                const isSelected = selectedMilestoneId === ms.id;
                const isCurrentFocus = !isCompleted && (idx === 0 || !!milestones[idx - 1]?.audioUrl);

                return (
                  <div
                    key={ms.id}
                    onClick={() => setSelectedMilestoneId(ms.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      padding: '8px 4px',
                      borderRadius: '16px',
                      background: isSelected 
                        ? (isLight ? '#e0f2fe' : 'rgba(255, 255, 255, 0.12)') 
                        : 'transparent',
                      border: isSelected 
                        ? `1.5px solid ${isLight ? '#38bdf8' : 'rgba(16, 185, 129, 0.6)'}` 
                        : '1.5px solid transparent',
                      transition: 'all 0.2s ease'
                    }}
                    className="hover-scale"
                  >
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isCompleted 
                        ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                        : isCurrentFocus 
                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                          : (isLight ? '#e2e8f0' : 'rgba(30, 41, 59, 0.9)'),
                      border: isCompleted 
                        ? '2px solid #fef3c7' 
                        : isCurrentFocus 
                          ? '2px solid #a7f3d0' 
                          : `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
                      boxShadow: isCompleted 
                        ? '0 0 16px rgba(245, 158, 11, 0.45)' 
                        : isCurrentFocus 
                          ? '0 0 16px rgba(16, 185, 129, 0.45)' 
                          : 'none',
                      animation: isCurrentFocus ? 'activeStepGlow 2s infinite' : 'none',
                      color: isCompleted || isCurrentFocus ? 'white' : (isLight ? '#475569' : '#e2e8f0')
                    }}>
                      {isCompleted ? (
                        <Check size={20} strokeWidth={3} />
                      ) : (
                        <span style={{ fontSize: '0.84rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
                          {ms.stepNumber < 10 ? `0${ms.stepNumber}` : ms.stepNumber}
                        </span>
                      )}
                    </div>

                    <div>
                      <span style={{
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        color: isCompleted ? '#f59e0b' : isCurrentFocus ? '#10b981' : colors.textPrimary,
                        display: 'block',
                        lineHeight: 1.2
                      }}>
                        {ms.title}
                      </span>
                      <span style={{
                        fontSize: '0.66rem',
                        color: isCompleted ? (isLight ? '#059669' : '#a7f3d0') : isCurrentFocus ? (isLight ? '#047857' : '#6ee7b7') : colors.textMuted,
                        fontWeight: 700
                      }}>
                        {isCompleted ? '✓ Fertig' : isCurrentFocus ? 'Jetzt bereit' : 'Ausstehend'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 9 Milestone Cards + Shelf Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobileOrSim ? '1fr' : 'minmax(0, 1fr) 340px',
            gap: '24px',
            alignItems: 'start'
          }}>
            {/* Left 9 Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobileOrSim ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px'
            }}>
              {milestones.map((ms) => {
                const isPlayingThis = activePlayingId === ms.id;
                const isHighlighted = selectedMilestoneId === ms.id;
                const isCompleted = !!ms.audioUrl;

                return (
                  <div
                    key={ms.id}
                    style={{
                      background: isHighlighted ? colors.cardBgHighlight : colors.cardBg,
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: ms.isVerified
                        ? '1.8px solid #f59e0b'
                        : isCompleted 
                          ? `1.5px solid ${isLight ? '#fcd34d' : 'rgba(245, 158, 11, 0.55)'}` 
                          : isHighlighted 
                            ? `1.5px solid ${colors.cardBorderHighlight}` 
                            : `1.5px solid ${colors.cardBorder}`,
                      borderRadius: '22px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      position: 'relative',
                      boxShadow: ms.isVerified
                        ? '0 10px 28px rgba(245, 158, 11, 0.18)'
                        : isCompleted 
                          ? (isLight ? '0 8px 24px rgba(245, 158, 11, 0.12)' : '0 10px 28px rgba(245, 158, 11, 0.12)') 
                          : colors.shadow,
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  >
                    {/* Header with Chapter Pill */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '14px',
                          background: isCompleted 
                            ? (isLight ? '#fef3c7' : 'rgba(245, 158, 11, 0.18)') 
                            : (isLight ? '#dcfce7' : 'rgba(16, 185, 129, 0.14)'),
                          border: `1.5px solid ${isCompleted ? (isLight ? '#fde68a' : 'rgba(245, 158, 11, 0.4)') : (isLight ? '#bbf7d0' : 'rgba(16, 185, 129, 0.3)')}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {renderIcon(ms.iconName, isCompleted)}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 900,
                              color: '#f59e0b',
                              background: isLight ? '#fef3c7' : 'rgba(245, 158, 11, 0.15)',
                              padding: '2px 8px',
                              borderRadius: '100px',
                              letterSpacing: '0.04em',
                              textTransform: 'uppercase',
                              fontVariantNumeric: 'tabular-nums'
                            }}>
                              STATION {ms.stepNumber < 10 ? `0${ms.stepNumber}` : ms.stepNumber}
                            </span>
                            {ms.isVerified && (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.66rem',
                                fontWeight: 900,
                                color: '#b45309',
                                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                                border: '1px solid #f59e0b',
                                padding: '2px 8px',
                                borderRadius: '100px',
                                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.25)'
                              }}>
                                <CheckCircle2 size={11} color="#d97706" />
                                <span>Meisterwerk</span>
                              </span>
                            )}
                          </div>
                          <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 900, color: colors.textPrimary, letterSpacing: '-0.01em' }}>
                            {ms.title}
                          </h4>
                          <span style={{ fontSize: '0.76rem', color: colors.textSecondary, fontWeight: 600, lineHeight: 1.3, display: 'block', marginTop: '3px' }}>
                            {ms.subtitle}
                          </span>
                        </div>
                      </div>

                      {/* Privacy Toggle */}
                      <button
                        type="button"
                        onClick={() => toggleVisibility(ms.id)}
                        title={ms.visibility === 'private' ? 'Nur für mich (Privat)' : 'Für Lehrer freigegeben'}
                        style={{
                          background: ms.visibility === 'private' 
                            ? (isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.18)') 
                            : (isLight ? '#dcfce7' : 'rgba(16, 185, 129, 0.18)'),
                          border: `1px solid ${ms.visibility === 'private' ? (isLight ? '#fca5a5' : 'rgba(239, 68, 68, 0.4)') : (isLight ? '#86efac' : 'rgba(16, 185, 129, 0.4)')}`,
                          color: ms.visibility === 'private' ? (isLight ? '#dc2626' : '#fca5a5') : (isLight ? '#15803d' : '#34d399'),
                          padding: '4px 9px',
                          borderRadius: '100px',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          flexShrink: 0
                        }}
                      >
                        {ms.visibility === 'private' ? <Lock size={11} /> : <Unlock size={11} />}
                        <span>{ms.visibility === 'private' ? 'Privat' : 'Lehrer'}</span>
                      </button>
                    </div>

                    {/* Personal Reflection Snippet */}
                    {ms.personalNote ? (
                      <div
                        onClick={() => openReflectionModal(ms)}
                        style={{
                          background: colors.noteBg,
                          border: `1px solid ${colors.noteBorder}`,
                          borderRadius: '12px',
                          padding: '9px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        className="hover-scale"
                      >
                        <MessageSquare size={14} color="#10b981" />
                        <span style={{ fontSize: '0.76rem', color: colors.textPrimary, fontStyle: 'italic', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          "{ms.personalNote}"
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openReflectionModal(ms)}
                        style={{
                          background: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)',
                          border: `1px dashed ${isLight ? '#94a3b8' : 'rgba(255, 255, 255, 0.25)'}`,
                          borderRadius: '12px',
                          padding: '8px 12px',
                          color: colors.textSecondary,
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        className="hover-scale"
                      >
                        <MessageSquare size={13} color="#10b981" />
                        <span>+ Notiz: Warum dieses Stück?</span>
                      </button>
                    )}

                    {/* Status & Equalizer Indicator */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.76rem',
                      color: colors.textSecondary,
                      paddingTop: '8px',
                      borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'}`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isPlayingThis ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '14px' }}>
                            {[0, 1, 2, 3, 4].map(idx => (
                              <div
                                key={idx}
                                style={{
                                  width: '3px',
                                  background: '#f59e0b',
                                  borderRadius: '2px',
                                  animation: `soundBarPulse 0.8s ease-in-out infinite alternate`,
                                  animationDelay: `${idx * 0.15}s`
                                }}
                              />
                            ))}
                          </div>
                        ) : ms.audioUrl ? (
                          <Check size={16} color="#f59e0b" strokeWidth={3} />
                        ) : (
                          <Clock size={15} color={isLight ? '#64748b' : '#94a3b8'} />
                        )}
                        <span style={{ color: ms.audioUrl ? '#f59e0b' : colors.textSecondary, fontWeight: ms.audioUrl ? 900 : 600 }}>
                          {isPlayingThis ? 'Wiedergabe...' : ms.audioUrl ? (ms.isVerified ? '🏅 Verifiziert' : '🏆 Aufgenommen') : 'Bereit zur Aufnahme'}
                        </span>
                      </div>

                      {ms.recordedAt && (
                        <span style={{ color: colors.textPrimary, fontWeight: 800, fontSize: '0.74rem' }}>
                          {ms.recordedAt}
                        </span>
                      )}
                    </div>

                    {/* Action Buttons: Play, Teacher Validation, or Open Modal */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 'auto' }}>
                      {ms.audioUrl ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handlePlayToggle(ms.audioUrl, ms.masteredAudioUrl, ms.id)}
                            style={{
                              flex: 1,
                              padding: '11px 16px',
                              borderRadius: '100px',
                              border: 'none',
                              background: isPlayingThis ? '#d97706' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: 'white',
                              fontWeight: 900,
                              fontSize: '0.84rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              cursor: 'pointer',
                              boxShadow: isPlayingThis ? '0 4px 14px rgba(217, 119, 6, 0.4)' : '0 4px 14px rgba(16, 185, 129, 0.35)',
                              transition: 'all 0.15s ease'
                            }}
                            className="hover-scale"
                          >
                            {isPlayingThis ? <Pause size={15} /> : <Play size={15} />}
                            <span>{isPlayingThis ? 'Pausieren' : 'Anhören'}</span>
                          </button>

                          {/* Download Button */}
                          <button
                            type="button"
                            onClick={() => downloadAudioTrack(ms.audioUrl, ms.masteredAudioUrl, ms.title, ms.id)}
                            title="Aufnahme herunterladen (WAV)"
                            style={{
                              padding: '11px 13px',
                              borderRadius: '100px',
                              border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.18)'}`,
                              background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
                              color: colors.textPrimary,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: isLight ? '0 2px 6px rgba(0,0,0,0.04)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                            className="hover-scale"
                          >
                            <Download size={15} color="#10b981" />
                          </button>

                          {isTeacher && !ms.isVerified && (
                            <button
                              type="button"
                              onClick={() => verifyMilestoneByTeacher(ms.id)}
                              title="Als verifiziertes Meisterwerk besiegeln"
                              style={{
                                padding: '11px 14px',
                                borderRadius: '100px',
                                border: '1.5px solid #f59e0b',
                                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                                color: '#b45309',
                                fontWeight: 900,
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
                              }}
                              className="hover-scale"
                            >
                              <Award size={15} color="#d97706" />
                              <span>Bestätigen</span>
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openUploadModal(ms)}
                          style={{
                            flex: 1,
                            padding: '11px 16px',
                            borderRadius: '100px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: 'white',
                            fontWeight: 900,
                            fontSize: '0.84rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                            transition: 'all 0.15s ease'
                          }}
                          className="hover-scale"
                        >
                          <Mic size={15} />
                          <span>Jetzt verewigen</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Side: Vinyl Shelf Component */}
            {renderVinylShelf()}
          </div>
        </>
      ) : (
        /* 🌟 2. TAB: CUSTOM PLAYLISTS VIEW */
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobileOrSim ? '1fr' : 'minmax(0, 1fr) 340px',
          gap: '24px',
          alignItems: 'start'
        }}>
          {/* Left: Custom Playlists Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: colors.textPrimary }}>
                  Deine erstellten Playlists & Studio-Alben ({customPlaylists.length})
                </h3>
                <span style={{ fontSize: '0.78rem', color: colors.textSecondary }}>
                  Jeder Song wird automatisch mit hochwertigem Studio Audio-Processing (-13 LUFS) aufbereitet.
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setWizardStep(1);
                  setShowPlaylistWizard(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  color: 'white',
                  padding: '10px 18px',
                  borderRadius: '100px',
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                }}
                className="hover-scale"
              >
                <Plus size={16} />
                <span>Neue Playlist erstellen</span>
              </button>
            </div>

            {customPlaylists.map(pl => {
              const themeObj = VIBE_THEMES.find(v => v.id === pl.vibeTheme) || VIBE_THEMES[0];
              const isSelected = selectedCustomPlaylistId === pl.id && shelfMode === 'playlists';

              return (
                <div
                  key={pl.id}
                  style={{
                    background: isSelected ? colors.cardBgHighlight : colors.cardBg,
                    border: `1.5px solid ${isSelected ? themeObj.color : colors.cardBorder}`,
                    borderRadius: '24px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    boxShadow: colors.shadow,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Playlist Header Card */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '16px',
                        background: themeObj.gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        boxShadow: `0 4px 14px ${themeObj.color}44`,
                        flexShrink: 0
                      }}>
                        <Disc size={28} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 900, color: themeObj.color, background: `${themeObj.color}18`, padding: '2px 8px', borderRadius: '100px' }}>
                            {themeObj.name}
                          </span>
                          <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: colors.textPrimary }}>
                            {pl.title}
                          </h4>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: colors.textSecondary, marginTop: '2px', display: 'block' }}>
                          {pl.description} • {pl.tracks.length} Songs • Erstellt {pl.createdAt}
                        </span>

                        {/* 🎉 Live Stolz- & Applaus-Plakette */}
                        {(() => {
                          const reactionKey = `campus_reactions_${studentId}_${pl.id}`;
                          let reactions = { bravo: 0, love: 0, fire: 0, star: 0 };
                          try {
                            const stored = localStorage.getItem(reactionKey);
                            if (stored) reactions = JSON.parse(stored);
                          } catch {}
                          const totalReactions = reactions.bravo + reactions.love + reactions.fire + reactions.star;
                          if (totalReactions === 0) return null;

                          return (
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(239, 68, 68, 0.12) 100%)',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              padding: '3px 10px',
                              borderRadius: '100px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              color: '#f59e0b',
                              marginTop: '6px'
                            }}>
                              <span>🎉 {totalReactions}× Applaus erhalten</span>
                              <span style={{ color: colors.textSecondary }}>•</span>
                              <span>
                                {reactions.love > 0 && `❤️ ${reactions.love} `}
                                {reactions.bravo > 0 && `👏 ${reactions.bravo} `}
                                {reactions.fire > 0 && `🔥 ${reactions.fire} `}
                                {reactions.star > 0 && `⭐ ${reactions.star}`}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setShareTargetPlaylistId(pl.id);
                          setShowShareModal(true);
                        }}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '100px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: '#ffffff',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)'
                        }}
                        className="hover-scale"
                      >
                        <Share2 size={13} />
                        <span>Playlist teilen</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomPlaylistId(pl.id);
                          setShelfMode('playlists');
                        }}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '100px',
                          border: `1.5px solid ${isSelected ? themeObj.color : (isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.18)')}`,
                          background: isSelected ? `${themeObj.color}22` : (isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.06)'),
                          color: isSelected ? themeObj.color : colors.textPrimary,
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Disc size={14} />
                        <span>{isSelected ? 'Im Regal aktiv' : 'Im Regal auflegen'}</span>
                      </button>

                      {/* Download Complete Album Button */}
                      {pl.tracks.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            pl.tracks.forEach((tr, i) => {
                              setTimeout(() => {
                                downloadAudioTrack(tr.audioUrl, tr.masteredAudioUrl, tr.title, tr.id);
                              }, i * 350);
                            });
                          }}
                          title="Alle Songs dieser Playlist herunterladen"
                          style={{
                            padding: '8px 12px',
                            borderRadius: '100px',
                            border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.15)'}`,
                            background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.06)',
                            color: colors.textPrimary,
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: isLight ? '0 2px 6px rgba(0,0,0,0.04)' : 'none'
                          }}
                          className="hover-scale"
                        >
                          <Download size={13} color="#10b981" />
                          <span>Album laden</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => requestDeletePlaylist(pl.id, pl.title)}
                        title="Playlist löschen"
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`,
                          background: 'transparent',
                          color: '#ef4444',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Tracks List inside Playlist */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'}`, paddingTop: '14px' }}>
                    {pl.tracks.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '16px', color: colors.textSecondary, fontSize: '0.82rem' }}>
                        Noch keine Songs in dieser Playlist. Nimm jetzt den ersten Track auf!
                      </div>
                    ) : (
                      pl.tracks.map((t, idx) => {
                        const isPlaying = activePlayingId === t.id;
                        const isMaster = t.preferredVersion !== 'raw';

                        return (
                          <div
                            key={t.id}
                            style={{
                              padding: '10px 14px',
                              borderRadius: '14px',
                              background: isPlaying ? (isLight ? '#dcfce7' : 'rgba(16, 185, 129, 0.2)') : (isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.04)'),
                              border: `1px solid ${isPlaying ? '#10b981' : (isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.06)')}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <button
                                type="button"
                                onClick={() => handlePlayToggle(t.audioUrl, t.masteredAudioUrl, t.id)}
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '50%',
                                  border: 'none',
                                  background: isPlaying ? '#10b981' : (isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)'),
                                  color: isPlaying ? 'white' : colors.textPrimary,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer'
                                }}
                              >
                                {isPlaying ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: '2px' }} />}
                              </button>

                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '0.74rem', fontWeight: 900, color: themeObj.color }}>
                                    #{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                                  </span>
                                  <span style={{ fontSize: '0.86rem', fontWeight: 800, color: isPlaying ? '#10b981' : colors.textPrimary }}>
                                    {t.title}
                                  </span>
                                  
                                  {isMaster ? (
                                    <span style={{
                                      fontSize: '0.66rem',
                                      fontWeight: 900,
                                      color: '#15803d',
                                      background: isLight ? '#dcfce7' : 'rgba(16, 185, 129, 0.2)',
                                      border: '1px solid rgba(16, 185, 129, 0.4)',
                                      padding: '1px 6px',
                                      borderRadius: '6px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px'
                                    }}>
                                      <Sparkles size={10} />
                                      <span>Studio Master</span>
                                    </span>
                                  ) : (
                                    <span style={{
                                      fontSize: '0.66rem',
                                      fontWeight: 900,
                                      color: '#b45309',
                                      background: isLight ? '#fef3c7' : 'rgba(245, 158, 11, 0.2)',
                                      border: '1px solid rgba(245, 158, 11, 0.4)',
                                      padding: '1px 6px',
                                      borderRadius: '6px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px'
                                    }}>
                                      <Mic size={10} />
                                      <span>Pure RAW</span>
                                    </span>
                                  )}
                                </div>
                                <span style={{ fontSize: '0.72rem', color: colors.textSecondary }}>
                                  {t.subtitle || (isMaster ? 'Studio-Processing (-13 LUFS)' : 'Pure RAW Direct')} • {t.recordedAt}
                                </span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => openEditTrackModal(pl.id, t)}
                                title="Song bearbeiten (Hall, Master/RAW & Notizen)"
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`,
                                  background: isLight ? '#f0f9ff' : 'rgba(14, 165, 233, 0.12)',
                                  color: '#0284c7',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                                className="hover-scale"
                              >
                                <Edit3 size={14} color="#0284c7" />
                              </button>

                              <button
                                type="button"
                                onClick={() => downloadAudioTrack(t.audioUrl, t.masteredAudioUrl, t.title, t.id)}
                                title="Song herunterladen"
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`,
                                  background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
                                  color: colors.textPrimary,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                                className="hover-scale"
                              >
                                <Download size={14} color="#10b981" />
                              </button>

                              <button
                                type="button"
                                onClick={() => requestDeleteTrack(pl.id, t.id, t.title)}
                                title="Song aus Playlist entfernen"
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  border: `1px solid ${isLight ? '#fecaca' : 'rgba(239, 68, 68, 0.2)'}`,
                                  background: isLight ? '#fef2f2' : 'rgba(239, 68, 68, 0.08)',
                                  color: '#ef4444',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                                className="hover-scale"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}

                    {/* Add Track Action Button inside Playlist */}
                    <button
                      type="button"
                      onClick={() => {
                        setRecordingPlaylistId(pl.id);
                        setActiveUploadModalMilestone(null);
                        setUploadMode('mic');
                        setTempNote('');
                        setCountDown(null);
                      }}
                      style={{
                        padding: '10px',
                        borderRadius: '12px',
                        border: `1.5px dashed ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
                        background: 'transparent',
                        color: colors.textPrimary,
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        marginTop: '4px'
                      }}
                      className="hover-scale"
                    >
                      <Plus size={15} color="#10b981" />
                      <span>+ Neuen Song für "{pl.title}" aufnehmen & mastern</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Side: Vinyl Shelf Component */}
          {renderVinylShelf()}
        </div>
      )}

      {/* 🌟 3. PLAYLIST ERSTELLUNGS-WIZARD (3-STEP APPLE MODAL) */}
      {showPlaylistWizard && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: isLight ? '#ffffff' : '#1e293b',
            border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
            borderRadius: '28px',
            padding: isMobileOrSim ? '20px' : '28px',
            maxWidth: wizardStep === 2 ? '780px' : '520px',
            maxHeight: '92vh',
            overflowY: 'auto',
            width: '100%',
            color: colors.textPrimary,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
            transition: 'max-width 0.25s ease'
          }}>
            {/* Header & Step Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#f59e0b', background: '#fef3c7', padding: '2px 8px', borderRadius: '100px' }}>
                    SCHRITT {wizardStep} VON 3
                  </span>
                </div>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '1.25rem', fontWeight: 900 }}>
                  {wizardStep === 1 && '1. Playlist-Name & Thema'}
                  {wizardStep === 2 && '2. Spotify Playlist-Cover wählen'}
                  {wizardStep === 3 && '3. Tracks zusammenstellen'}
                </h3>
              </div>
              <button
                onClick={() => setShowPlaylistWizard(false)}
                style={{ background: 'none', border: 'none', color: colors.textSecondary, fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* STEP 1: TITLE & DESC */}
            {wizardStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* 💡 Didaktische Vorlagen (1-Klick-Auswahl) */}
                <div>
                  <span style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    💡 Didaktische Vorlagen & Entwürfe (1-Klick-Auswahl):
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                    {PEDAGOGICAL_PLAYLIST_TEMPLATES.map((tpl) => {
                      const isChosen = wizardTitle === tpl.title;
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => {
                            setWizardTitle(tpl.title);
                            setWizardDesc(tpl.description);
                            setWizardTheme(tpl.vibeTheme);
                            setWizardIcon(tpl.iconName);
                          }}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '14px',
                            border: isChosen ? '1.5px solid #10b981' : `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)'}`,
                            background: isChosen ? (isLight ? '#ecfdf5' : 'rgba(16, 185, 129, 0.18)') : (isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.04)'),
                            color: colors.textPrimary,
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            gap: '3px',
                            textAlign: 'left',
                            boxShadow: isChosen ? '0 2px 8px rgba(16, 185, 129, 0.25)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                          className="hover-scale"
                        >
                          <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>{tpl.emoji}</span>
                          <strong style={{ fontSize: '0.74rem', color: isChosen ? '#10b981' : colors.textPrimary }}>
                            {tpl.title.replace(/^[^\s]+\s/, '')}
                          </strong>
                          <span style={{ fontSize: '0.64rem', color: colors.textSecondary }}>{tpl.tag}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, marginBottom: '6px' }}>
                    Titel der Playlist:
                  </label>
                  <input
                    type="text"
                    placeholder="z. B. Mein Sommerkonzert 2026, Akustik-Sessions..."
                    value={wizardTitle}
                    onChange={(e) => setWizardTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '14px',
                      border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
                      background: isLight ? '#f8fafc' : 'rgba(0, 0, 0, 0.35)',
                      color: colors.textPrimary,
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      boxSizing: 'border-box'
                    }}
                    autoFocus
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, marginBottom: '6px' }}>
                    Beschreibung / Widmung (optional):
                  </label>
                  <input
                    type="text"
                    placeholder="z. B. Für Familie & Freunde zusammengestellt"
                    value={wizardDesc}
                    onChange={(e) => setWizardDesc(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '14px',
                      border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
                      background: isLight ? '#f8fafc' : 'rgba(0, 0, 0, 0.35)',
                      color: colors.textPrimary,
                      fontSize: '0.84rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!wizardTitle.trim()) {
                      alert('Bitte gib einen Playlist-Namen ein.');
                      return;
                    }
                    setWizardStep(2);
                  }}
                  style={{
                    width: '100%',
                    padding: '13px',
                    borderRadius: '100px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    fontWeight: 900,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginTop: '8px'
                  }}
                  className="hover-scale"
                >
                  <span>Weiter: Spotify-Cover wählen</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* STEP 2: 20 UNIVERSAL SPOTIFY COVERS (5x4 GRID WITH CATEGORY TABS) */}
            {wizardStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '0.82rem', color: colors.textSecondary }}>
                    Wähle aus 20 universellen Spotify-Covern für jedes Alter & Musikgenre:
                  </span>

                  {/* 🏷️ Category Filter Tabs */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    overflowX: 'auto',
                    paddingBottom: '4px',
                    marginTop: '10px'
                  }}>
                    {[
                      { id: 'all', label: 'Alle (20)' },
                      { id: 'kids', label: '👶 Kids & Einsteiger' },
                      { id: 'urban_vibes', label: '⚡ Vibes & Urban' },
                      { id: 'classic_jazz', label: '🎻 Klassik & Jazz' },
                      { id: 'events_stage', label: '🎤 Bühne & Events' }
                    ].map(cat => {
                      const isCatActive = wizardCoverCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setWizardCoverCategory(cat.id as any)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '100px',
                            border: `1.5px solid ${isCatActive ? '#10b981' : (isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.15)')}`,
                            background: isCatActive ? (isLight ? '#ecfdf5' : 'rgba(16, 185, 129, 0.2)') : (isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.05)'),
                            color: isCatActive ? '#10b981' : colors.textPrimary,
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s ease'
                          }}
                          className="hover-scale"
                        >
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5x4 / Responsive Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobileOrSim ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                  gap: '12px',
                  maxHeight: '380px',
                  overflowY: 'auto',
                  paddingRight: '4px'
                }}>
                  {UNIVERSAL_PLAYLIST_COVERS
                    .filter(cov => wizardCoverCategory === 'all' || cov.category === wizardCoverCategory)
                    .map(cov => {
                      const isChosen = wizardCoverPresetId === cov.id;
                      return (
                        <div
                          key={cov.id}
                          onClick={() => {
                            setWizardCoverPresetId(cov.id);
                            setWizardTheme(cov.vibeTheme);
                            setWizardIcon(cov.iconName);
                          }}
                          style={{
                            borderRadius: '14px',
                            border: `2px solid ${isChosen ? '#10b981' : (isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)')}`,
                            background: isChosen ? (isLight ? '#f0fdf4' : 'rgba(16, 185, 129, 0.15)') : (isLight ? '#ffffff' : 'rgba(0, 0, 0, 0.2)'),
                            padding: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            position: 'relative',
                            boxShadow: isChosen ? '0 4px 14px rgba(16, 185, 129, 0.35)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                          className="hover-scale"
                        >
                          {/* 1:1 Cover Artwork */}
                          <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', borderRadius: '10px', overflow: 'hidden' }}>
                            {renderSpotifyCoverArtwork({
                              gradient: cov.gradient,
                              accentColor: cov.accentColor,
                              badge: cov.badge,
                              title: cov.defaultTitle,
                              subtitle: cov.subTitle,
                              iconName: cov.iconName,
                              emoji: cov.emoji
                            })}

                            {/* Active Checkmark Pill */}
                            {isChosen && (
                              <div style={{
                                position: 'absolute',
                                top: '6px',
                                right: '6px',
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: '#10b981',
                                border: '2px solid #ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ffffff',
                                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
                                zIndex: 10
                              }}>
                                <Check size={12} strokeWidth={3.5} />
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{
                              fontSize: '0.74rem',
                              fontWeight: 900,
                              color: isChosen ? '#10b981' : colors.textPrimary,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {cov.defaultTitle}
                            </span>
                            <span style={{
                              fontSize: '0.64rem',
                              color: colors.textSecondary,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {cov.subTitle}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Footer buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '100px',
                      border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.2)'}`,
                      background: 'transparent',
                      color: colors.textPrimary,
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Zurück
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardStep(3)}
                    style={{
                      flex: 2,
                      padding: '12px',
                      borderRadius: '100px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                    className="hover-scale"
                  >
                    <span>Weiter: Tracks wählen</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: SELECT TRACKS & FINALIZE */}
            {wizardStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <span style={{ fontSize: '0.82rem', color: colors.textSecondary }}>
                  Möchtest du bereits aufgenommene Meilensteine direkt in diese Playlist übernehmen?
                </span>

                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {milestones.filter(m => m.audioUrl).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px', color: colors.textSecondary, fontSize: '0.78rem' }}>
                      Bisher keine Meilenstein-Aufnahmen vorhanden. Du kannst nach der Erstellung direkt eigene Songs aufnehmen!
                    </div>
                  ) : (
                    milestones.filter(m => m.audioUrl).map(ms => {
                      const isChecked = wizardSelectedMilestones.includes(ms.id);
                      return (
                        <label
                          key={ms.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            borderRadius: '12px',
                            background: isChecked ? (isLight ? '#dcfce7' : 'rgba(16,185,129,0.15)') : (isLight ? '#f8fafc' : 'rgba(255,255,255,0.04)'),
                            border: `1px solid ${isChecked ? '#10b981' : (isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)')}`,
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setWizardSelectedMilestones([...wizardSelectedMilestones, ms.id]);
                                } else {
                                  setWizardSelectedMilestones(wizardSelectedMilestones.filter(id => id !== ms.id));
                                }
                              }}
                              style={{ accentColor: '#10b981', width: '16px', height: '16px' }}
                            />
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: colors.textPrimary }}>
                              {ms.title}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.72rem', color: colors.textSecondary }}>
                            {ms.recordedAt}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setWizardStep(2)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '100px',
                      border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.2)'}`,
                      background: 'transparent',
                      color: colors.textPrimary,
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Zurück
                  </button>
                  <button
                    type="button"
                    onClick={completePlaylistWizard}
                    style={{
                      flex: 2,
                      padding: '12px',
                      borderRadius: '100px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                    className="hover-scale"
                  >
                    <Check size={16} strokeWidth={3} />
                    <span>Playlist jetzt erstellen</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🌟 4. AUFNAHME- & UPLOAD-MODAL (Live-Mic & DAW File Drop) */}
      {(activeUploadModalMilestone || recordingPlaylistId) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: isLight ? '#ffffff' : '#1e293b',
            border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
            borderRadius: '24px',
            padding: '28px',
            maxWidth: '520px',
            width: '100%',
            color: colors.textPrimary,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Disc size={22} color="#10b981" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 900 }}>
                    {activeUploadModalMilestone ? `${activeUploadModalMilestone.title} verewigen` : 'Neuen Song für Playlist aufnehmen'}
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: colors.textSecondary, fontWeight: 600 }}>
                    {activeUploadModalMilestone ? activeUploadModalMilestone.subtitle : 'Studio Mastering Chain wird automatisch angewendet'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  if (countInIntervalRef.current) clearInterval(countInIntervalRef.current);
                  if (activeMicStreamRef.current) {
                    activeMicStreamRef.current.getTracks().forEach(track => track.stop());
                    activeMicStreamRef.current = null;
                  }
                  if (recordingMilestoneId) stopRecording();
                  setActiveUploadModalMilestone(null);
                  setRecordingPlaylistId(null);
                  setCountDown(null);
                }}
                style={{ background: 'none', border: 'none', color: colors.textSecondary, fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Mode Switcher (Shown during capture) */}
            {!isProcessingMastering && !pendingDualResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', background: isLight ? '#f1f5f9' : 'rgba(0, 0, 0, 0.35)', borderRadius: '12px', padding: '4px', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.08)'}` }}>
                  <button
                    type="button"
                    onClick={() => setUploadMode('mic')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '10px',
                      border: 'none',
                      background: uploadMode === 'mic' ? (isLight ? '#ffffff' : 'rgba(16, 185, 129, 0.25)') : 'transparent',
                      color: uploadMode === 'mic' ? (isLight ? '#10b981' : '#34d399') : colors.textSecondary,
                      fontWeight: 900,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      boxShadow: uploadMode === 'mic' && isLight ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Mic size={15} />
                    <span>Live-Mikrofon</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode('file')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '10px',
                      border: 'none',
                      background: uploadMode === 'file' ? (isLight ? '#ffffff' : 'rgba(16, 185, 129, 0.25)') : 'transparent',
                      color: uploadMode === 'file' ? (isLight ? '#10b981' : '#34d399') : colors.textSecondary,
                      fontWeight: 900,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      boxShadow: uploadMode === 'file' && isLight ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Upload size={15} />
                    <span>Datei-Upload</span>
                  </button>
                </div>

                {/* 🎛️ Audiophile Instrument & Source Profile Selector */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '4px',
                  background: isLight ? '#f8fafc' : 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '14px',
                  padding: '4px',
                  border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.1)'}`
                }}>
                  {/* Option 1: Acoustic */}
                  <button
                    type="button"
                    onClick={() => setSelectedProfile('acoustic_audiophile')}
                    style={{
                      padding: '7px 6px',
                      borderRadius: '10px',
                      border: 'none',
                      background: selectedProfile === 'acoustic_audiophile' 
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                        : 'transparent',
                      color: selectedProfile === 'acoustic_audiophile' ? '#ffffff' : colors.textSecondary,
                      fontSize: '0.70rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      boxShadow: selectedProfile === 'acoustic_audiophile' ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span>🎻 Akustik</span>
                  </button>

                  {/* Option 2: Grand Piano */}
                  <button
                    type="button"
                    onClick={() => setSelectedProfile('grand_piano')}
                    style={{
                      padding: '7px 6px',
                      borderRadius: '10px',
                      border: 'none',
                      background: selectedProfile === 'grand_piano' 
                        ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' 
                        : 'transparent',
                      color: selectedProfile === 'grand_piano' ? '#ffffff' : colors.textSecondary,
                      fontSize: '0.70rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      boxShadow: selectedProfile === 'grand_piano' ? '0 2px 8px rgba(14, 165, 233, 0.3)' : 'none',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span>🎹 Klavier</span>
                  </button>

                  {/* Option 3: Brass & Vocals */}
                  <button
                    type="button"
                    onClick={() => setSelectedProfile('brass_vocals')}
                    style={{
                      padding: '7px 6px',
                      borderRadius: '10px',
                      border: 'none',
                      background: selectedProfile === 'brass_vocals' 
                        ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' 
                        : 'transparent',
                      color: selectedProfile === 'brass_vocals' ? '#ffffff' : colors.textSecondary,
                      fontSize: '0.70rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      boxShadow: selectedProfile === 'brass_vocals' ? '0 2px 8px rgba(139, 92, 246, 0.3)' : 'none',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span>🎷 Gesang/Bläser</span>
                  </button>

                  {/* Option 4: Drums */}
                  <button
                    type="button"
                    onClick={() => setSelectedProfile('drums_percussion')}
                    style={{
                      padding: '7px 6px',
                      borderRadius: '10px',
                      border: 'none',
                      background: selectedProfile === 'drums_percussion' 
                        ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                        : 'transparent',
                      color: selectedProfile === 'drums_percussion' ? '#ffffff' : colors.textSecondary,
                      fontSize: '0.70rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      boxShadow: selectedProfile === 'drums_percussion' ? '0 2px 8px rgba(245, 158, 11, 0.3)' : 'none',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span>🥁 Drums (-12dB)</span>
                  </button>
                </div>

                {selectedProfile === 'drums_percussion' && (
                  <div style={{
                    background: isLight ? '#fffbeb' : 'rgba(245, 158, 11, 0.12)',
                    border: `1px solid ${isLight ? '#fde68a' : 'rgba(245, 158, 11, 0.3)'}`,
                    borderRadius: '12px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Volume2 size={15} color="#f59e0b" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '0.72rem', color: isLight ? '#92400e' : '#fde68a', fontWeight: 600, lineHeight: 1.35 }}>
                      <b>Drum-Pad aktiv:</b> -12 dB Headroom-Schutz & Kick-Tiefbass (35 Hz). <i>Tipp: Smartphone 1,5 bis 2 Meter vor das Kit stellen.</i>
                    </span>
                  </div>
                )}

                {selectedProfile === 'grand_piano' && (
                  <div style={{
                    background: isLight ? '#f0f9ff' : 'rgba(14, 165, 233, 0.12)',
                    border: `1px solid ${isLight ? '#bae6fd' : 'rgba(14, 165, 233, 0.3)'}`,
                    borderRadius: '12px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Music size={15} color="#0ea5e9" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '0.72rem', color: isLight ? '#0369a1' : '#bae6fd', fontWeight: 600, lineHeight: 1.35 }}>
                      <b>Flügel-Modus:</b> 118% M/S Stereo-Breite & selektive 220 Hz Entdröhnung für warme, offene Klavierklänge.
                    </span>
                  </div>
                )}

                {selectedProfile === 'brass_vocals' && (
                  <div style={{
                    background: isLight ? '#faf5ff' : 'rgba(139, 92, 246, 0.12)',
                    border: `1px solid ${isLight ? '#e9d5ff' : 'rgba(139, 92, 246, 0.3)'}`,
                    borderRadius: '12px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Zap size={15} color="#8b5cf6" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '0.72rem', color: isLight ? '#6b21a8' : '#e9d5ff', fontWeight: 600, lineHeight: 1.35 }}>
                      <b>Präsenz & De-Harsh:</b> +1.4 dB Stimmpräsenz bei 3.2 kHz & aktiver 6.8 kHz Zischlaut-Schutz.
                    </span>
                  </div>
                )}
              </div>
            )}


            {/* Modal Body: Processing vs. Decision Preview vs. Capture Controls */}
            {isProcessingMastering ? (

              <div style={{ textAlign: 'center', padding: '36px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  border: '4px solid #10b981',
                  borderTopColor: 'transparent',
                  animation: 'spin 1s linear infinite'
                }} />
                <div>
                  <span style={{ fontSize: '1.05rem', fontWeight: 900, color: colors.textPrimary, display: 'block' }}>
                    🎛️ Studio Audio-Processing...
                  </span>
                  <span style={{ fontSize: '0.78rem', color: colors.textSecondary, marginTop: '4px', display: 'block' }}>
                    Erzeuge <b>Studio Audio-Processing</b> & <b>Pure RAW</b> mit exaktem <b>-13.0 LUFS Pegelabgleich</b>
                  </span>
                </div>
              </div>
            ) : pendingDualResult ? (
              /* 🎧 DUAL VERSION DECISION (Vorhören & Standard festlegen) */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ textAlign: 'center', padding: '2px 0' }}>
                  <span style={{ fontSize: '0.96rem', fontWeight: 900, color: colors.textPrimary, display: 'block' }}>
                    🎵 Aufnahme fertig! Welche Version möchtest du speichern?
                  </span>
                  <span style={{ fontSize: '0.76rem', color: colors.textSecondary, marginTop: '2px', display: 'block', lineHeight: 1.35 }}>
                    Beide Spuren haben <b>exakt dieselbe Lautheit (-13.0 LUFS)</b>. Du kannst beide vorhören und deine Standard-Version wählen (jederzeit im Player umschaltbar).
                  </span>
                </div>

                {/* 2 Version Decision Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {/* Card 1: Studio Audio-Processing */}
                  <div
                    onClick={() => setSelectedVersionChoice('master')}
                    style={{
                      border: `2px solid ${selectedVersionChoice === 'master' ? '#10b981' : (isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.12)')}`,
                      borderRadius: '16px',
                      padding: '14px',
                      background: selectedVersionChoice === 'master' 
                        ? (isLight ? '#f0fdf4' : 'rgba(16, 185, 129, 0.12)') 
                        : (isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)'),
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '10px',
                      boxShadow: selectedVersionChoice === 'master' ? '0 4px 14px rgba(16, 185, 129, 0.2)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover-scale"
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.66rem', fontWeight: 900, padding: '2px 8px', borderRadius: '100px', background: '#10b981', color: 'white' }}>
                          ✨ STUDIO PROCESSING
                        </span>
                        {selectedVersionChoice === 'master' && (
                          <CheckCircle2 size={16} color="#10b981" />
                        )}
                      </div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 900, color: colors.textPrimary }}>
                        Studio Audio-Processing (-13 LUFS)
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.72rem', color: colors.textSecondary, lineHeight: 1.3 }}>
                        Festlicher Gala-Konzertsaal-Klang mit edler 3D-Konzertakustik.
                      </p>
                    </div>


                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleModalPreview('master');
                      }}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '100px',
                        border: 'none',
                        background: modalPreviewPlaying === 'master' ? '#ef4444' : '#10b981',
                        color: 'white',
                        fontWeight: 800,
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px'
                      }}
                    >
                      {modalPreviewPlaying === 'master' ? <Pause size={13} /> : <Play size={13} />}
                      <span>{modalPreviewPlaying === 'master' ? 'Stoppen' : 'Studio vorhören'}</span>
                    </button>
                  </div>

                  {/* Card 2: Pure RAW */}
                  <div
                    onClick={() => setSelectedVersionChoice('raw')}
                    style={{
                      border: `2px solid ${selectedVersionChoice === 'raw' ? '#3b82f6' : (isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.12)')}`,
                      borderRadius: '16px',
                      padding: '14px',
                      background: selectedVersionChoice === 'raw' 
                        ? (isLight ? '#eff6ff' : 'rgba(59, 130, 246, 0.12)') 
                        : (isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)'),
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '10px',
                      boxShadow: selectedVersionChoice === 'raw' ? '0 4px 14px rgba(59, 130, 246, 0.2)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover-scale"
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.66rem', fontWeight: 900, padding: '2px 8px', borderRadius: '100px', background: '#3b82f6', color: 'white' }}>
                          🎙️ PURE RAW
                        </span>
                        {selectedVersionChoice === 'raw' && (
                          <CheckCircle2 size={16} color="#3b82f6" />
                        )}
                      </div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 900, color: colors.textPrimary }}>
                        Originalklang (-13 LUFS)
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.72rem', color: colors.textSecondary, lineHeight: 1.3 }}>
                        Unbearbeitete Originalaufnahme mit pegelangepasster Lautheit.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleModalPreview('raw');
                      }}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '100px',
                        border: 'none',
                        background: modalPreviewPlaying === 'raw' ? '#ef4444' : '#3b82f6',
                        color: 'white',
                        fontWeight: 800,
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px'
                      }}
                    >
                      {modalPreviewPlaying === 'raw' ? <Pause size={13} /> : <Play size={13} />}
                      <span>{modalPreviewPlaying === 'raw' ? 'Stoppen' : 'RAW vorhören'}</span>
                    </button>
                  </div>
                </div>

                {/* 🏛️ Apple-Style Spatial Audio Raumakustik (4 Presets + Fein-Tuning Slider) */}
                <div style={{
                  background: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '18px',
                  padding: '14px 16px',
                  border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 900, color: colors.textPrimary, letterSpacing: '-0.01em' }}>
                        🏛️ Raumakustik & Raumgröße
                      </span>
                      {isReMasteringReverb && (
                        <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 800, animation: 'pulse 1s infinite' }}>
                          ⏳ Remastering...
                        </span>
                      )}
                    </div>
                    <span style={{
                      fontSize: '0.74rem',
                      fontWeight: 900,
                      color: '#10b981',
                      background: isLight ? '#dcfce7' : 'rgba(16, 185, 129, 0.18)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      padding: '2px 9px',
                      borderRadius: '100px'
                    }}>
                      {reverbWetSlider <= 12 ? '🎙️ Studio' : reverbWetSlider <= 25 ? '🎻 Kammermusik' : reverbWetSlider <= 42 ? '🏛️ Konzertsaal' : '⛪ Kathedrale'} • {reverbWetSlider}%
                    </span>
                  </div>

                  {/* 4 Apple-Style Curated Room Preset Buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {[
                      { id: 'studio', name: 'Studio', emoji: '🎙️', wet: 10, sub: 'Trocken' },
                      { id: 'chamber', name: 'Kammermusik', emoji: '🎻', wet: 20, sub: 'Warm' },
                      { id: 'hall', name: 'Konzertsaal', emoji: '🏛️', wet: 35, sub: 'Gala-Saal' },
                      { id: 'cathedral', name: 'Kathedrale', emoji: '⛪', wet: 55, sub: 'Monumental' },
                    ].map(room => {
                      const isActive = Math.abs(reverbWetSlider - room.wet) <= 6;
                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => handleReverbSliderChange(room.wet)}
                          style={{
                            padding: '10px 6px',
                            borderRadius: '14px',
                            border: isActive 
                              ? '1.5px solid #10b981' 
                              : `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'}`,
                            background: isActive 
                              ? (isLight ? '#f0fdf4' : 'rgba(16, 185, 129, 0.2)') 
                              : (isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.03)'),
                            boxShadow: isActive ? '0 4px 12px rgba(16, 185, 129, 0.22)' : 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '3px',
                            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                          }}
                          className="hover-scale"
                        >
                          <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{room.emoji}</span>
                          <span style={{
                            fontSize: '0.74rem',
                            fontWeight: 900,
                            color: isActive ? (isLight ? '#059669' : '#34d399') : colors.textPrimary,
                            whiteSpace: 'nowrap'
                          }}>
                            {room.name}
                          </span>
                          <span style={{
                            fontSize: '0.62rem',
                            fontWeight: 600,
                            color: isActive ? (isLight ? '#15803d' : '#86efac') : colors.textSecondary
                          }}>
                            {room.sub}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Apple Fine-Tuning Slider Bar */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '2px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: colors.textSecondary, fontWeight: 700 }}>
                      <span>Feinabstimmung (Raumtiefe & Nachhall):</span>
                      <span style={{ color: '#10b981', fontWeight: 900 }}>{reverbWetSlider}% Wet</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="65"
                      step="1"
                      value={reverbWetSlider}
                      onChange={(e) => handleReverbSliderChange(Number(e.target.value))}
                      style={{
                        width: '100%',
                        accentColor: '#10b981',
                        cursor: 'pointer',
                        height: '6px',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                </div>

                {/* Song Meta Inputs: Titel & Interpret */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)'}`, paddingTop: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', color: colors.textPrimary, fontWeight: 800, marginBottom: '5px' }}>
                        Songtitel:
                      </label>
                      <input
                        type="text"
                        placeholder={activeUploadModalMilestone ? activeUploadModalMilestone.title : 'z. B. Für Elise, Sommer-Song...'}
                        value={tempSongTitle}
                        onChange={(e) => setTempSongTitle(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '12px',
                          border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
                          background: isLight ? '#f8fafc' : 'rgba(0, 0, 0, 0.35)',
                          color: colors.textPrimary,
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', color: colors.textPrimary, fontWeight: 800, marginBottom: '5px' }}>
                        Interpret / Künstler:
                      </label>
                      <input
                        type="text"
                        placeholder={student?.first_name ? `${student.first_name}` : 'z. B. Beethoven, Eigenes Spiel...'}
                        value={tempArtist}
                        onChange={(e) => setTempArtist(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '12px',
                          border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
                          background: isLight ? '#f8fafc' : 'rgba(0, 0, 0, 0.35)',
                          color: colors.textPrimary,
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: colors.textSecondary, fontWeight: 700, marginBottom: '5px' }}>
                      Persönliche Notiz / Erinnerung (optional):
                    </label>
                    <input
                      type="text"
                      placeholder={activeUploadModalMilestone ? 'z. B. Mein erstes Lied mit beiden Händen auf dem Klavier...' : 'z. B. Akustische Aufnahme für das Sommerkonzert...'}
                      value={tempNote}
                      onChange={(e) => setTempNote(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '12px',
                        border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.15)'}`,
                        background: isLight ? '#ffffff' : 'rgba(0, 0, 0, 0.25)',
                        color: colors.textPrimary,
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Confirm & Save Actions */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (modalPreviewAudioRef.current) modalPreviewAudioRef.current.pause();
                      setModalPreviewPlaying(null);
                      setPendingDualResult(null);
                    }}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '100px',
                      border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
                      background: 'transparent',
                      color: colors.textSecondary,
                      fontWeight: 800,
                      fontSize: '0.84rem',
                      cursor: 'pointer'
                    }}
                  >
                    Neu aufnehmen
                  </button>

                  <button
                    type="button"
                    onClick={confirmAndSaveTrackDecision}
                    style={{
                      flex: 2,
                      padding: '12px',
                      borderRadius: '100px',
                      border: 'none',
                      background: selectedVersionChoice === 'master'
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: 'white',
                      fontWeight: 900,
                      fontSize: '0.86rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: selectedVersionChoice === 'master' 
                        ? '0 4px 16px rgba(16, 185, 129, 0.4)' 
                        : '0 4px 16px rgba(59, 130, 246, 0.4)'
                    }}
                    className="hover-scale"
                  >
                    <Check size={16} strokeWidth={3} />
                    <span>Als {selectedVersionChoice === 'master' ? 'Studio Master' : 'Pure RAW'} speichern</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Capture Content (Live Mic or File Upload) */
              <>
                {/* Content: Live Mic Recording */}
                {uploadMode === 'mic' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '16px 0' }}>

                    {countDown !== null ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '90px',
                          height: '90px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 0 30px rgba(245, 158, 11, 0.6)',
                          animation: 'countInPulse 1s ease-in-out infinite'
                        }}>
                          <span style={{ fontSize: '2.8rem', fontWeight: 900, color: 'white' }}>
                            {countDown}
                          </span>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#f59e0b' }}>
                            Hände ans Instrument!
                          </span>
                          <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: colors.textSecondary }}>
                            Aufnahme startet in {countDown} Sekunde{countDown > 1 ? 'n' : ''}...
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{
                          width: '84px',
                          height: '84px',
                          borderRadius: '50%',
                          background: recordingMilestoneId ? 'rgba(239, 68, 68, 0.2)' : (isLight ? '#dcfce7' : 'rgba(16, 185, 129, 0.18)'),
                          border: `2.5px solid ${recordingMilestoneId ? '#ef4444' : '#10b981'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          animation: recordingMilestoneId ? 'pulse 1.5s infinite' : 'none'
                        }}>
                          {recordingMilestoneId ? <Mic size={38} color="#ef4444" /> : <Mic size={38} color="#10b981" />}
                        </div>

                        <div style={{ textAlign: 'center', width: '100%' }}>
                          <span style={{ fontSize: '1.4rem', fontWeight: 900, color: recordingMilestoneId ? '#ef4444' : colors.textPrimary }}>
                            {recordingMilestoneId ? `00:${recordSeconds < 10 ? '0' : ''}${recordSeconds}` : 'Bereit zur Aufnahme'}
                          </span>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: colors.textSecondary, fontWeight: 600 }}>
                            {recordingMilestoneId ? 'Aufnahme läuft... Spiele deinen Song!' : 'Klicke auf den Button, um das 3-Sekunden-Einzählen zu starten.'}
                          </p>
                        </div>

                        {recordingMilestoneId ? (
                          <button
                            type="button"
                            onClick={stopRecording}
                            style={{
                              padding: '12px 28px',
                              borderRadius: '100px',
                              border: 'none',
                              background: '#ef4444',
                              color: 'white',
                              fontWeight: 900,
                              fontSize: '0.86rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              boxShadow: '0 4px 16px rgba(239, 68, 68, 0.4)'
                            }}
                          >
                            <Square size={16} fill="#fff" />
                            <span>Aufnahme beenden & mastern</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={triggerRecordingCountIn}
                            style={{
                              padding: '12px 28px',
                              borderRadius: '100px',
                              border: 'none',
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: 'white',
                              fontWeight: 900,
                              fontSize: '0.86rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)'
                            }}
                            className="hover-scale"
                          >
                            <Mic size={16} />
                            <span>Aufnahme starten (3s Vorlauf)</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '10px 0' }}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="audio/*,.mp3,.wav,.m4a,.aac,.webm"
                      style={{ display: 'none' }}
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        border: '2px dashed #10b981',
                        borderRadius: '18px',
                        padding: '24px',
                        textAlign: 'center',
                        background: isLight ? '#f0fdf4' : 'rgba(16, 185, 129, 0.08)',
                        cursor: 'pointer'
                      }}
                      className="hover-scale"
                    >
                      <Upload size={32} color="#10b981" style={{ margin: '0 auto 8px auto' }} />
                      <span style={{ fontSize: '0.9rem', fontWeight: 900, color: colors.textPrimary, display: 'block' }}>
                        {uploadFile ? uploadFile.name : 'Audiodatei hier ablegen oder auswählen'}
                      </span>
                      <span style={{ fontSize: '0.76rem', color: colors.textSecondary, marginTop: '4px', display: 'block', fontWeight: 600 }}>
                        Unterstützt MP3, WAV, M4A, AAC aus GarageBand, Logic oder Sprachmemos (max. 25 MB)
                      </span>
                    </div>

                    {uploadFile && (
                      <button
                        type="button"
                        onClick={commitFileUpload}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '100px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: 'white',
                          fontWeight: 900,
                          fontSize: '0.86rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                        className="hover-scale"
                      >
                        <Check size={16} strokeWidth={3} />
                        <span>Audiodatei importieren & mastern</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Mastering DSP Info Banner */}
                <div style={{
                  background: isLight ? '#f0fdf4' : 'rgba(16, 185, 129, 0.12)',
                  border: `1px solid ${isLight ? '#86efac' : 'rgba(16, 185, 129, 0.3)'}`,
                  borderRadius: '12px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <SlidersHorizontal size={16} color="#10b981" />
                  <span style={{ fontSize: '0.74rem', color: isLight ? '#166534' : '#a7f3d0', fontWeight: 700 }}>
                    Automatischer -13.0 LUFS Pegelabgleich für Studio Audio-Processing & Pure RAW.
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 🌟 5. REFLEXIONS-MODAL */}
      {activeReflectionMilestone && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: isLight ? '#ffffff' : '#1e293b',
            border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
            borderRadius: '24px',
            padding: '28px',
            maxWidth: '460px',
            width: '100%',
            color: colors.textPrimary,
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={20} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900 }}>
                  Warum dieses Stück?
                </h3>
              </div>
              <button
                onClick={() => setActiveReflectionMilestone(null)}
                style={{ background: 'none', border: 'none', color: colors.textSecondary, fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.82rem', color: colors.textSecondary, lineHeight: 1.45, fontWeight: 500 }}>
              Halte deine Gedanken zu <strong>{activeReflectionMilestone.title}</strong> fest: Was war die größte Herausforderung? Welche Emotion verbindest du mit diesem Moment?
            </p>

            <textarea
              rows={4}
              value={reflectionText}
              onChange={(e) => setReflectionText(e.target.value)}
              placeholder="Schreibe deine persönliche Notiz hier..."
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '14px',
                border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
                background: isLight ? '#f8fafc' : 'rgba(0, 0, 0, 0.35)',
                color: colors.textPrimary,
                fontSize: '0.86rem',
                fontWeight: 600,
                resize: 'none',
                boxSizing: 'border-box'
              }}
            />

            <button
              type="button"
              onClick={saveReflectionNote}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '100px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                fontWeight: 900,
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
              }}
              className="hover-scale"
            >
              <Check size={16} strokeWidth={3} />
              <span>Gedanken verewigen</span>
            </button>
          </div>
        </div>
      )}

      {/* 🌟 6. SHARE MODAL */}
      {showShareModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: isLight ? '#ffffff' : '#1e293b',
            border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
            borderRadius: '24px',
            padding: '28px',
            maxWidth: '480px',
            width: '100%',
            color: colors.textPrimary,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Share2 size={20} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 900 }}>
                  Audio-Biografie & Playlists sicher teilen
                </h3>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                style={{ background: 'none', border: 'none', color: colors.textSecondary, fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.84rem', color: colors.textSecondary, lineHeight: 1.45, fontWeight: 500 }}>
              Erstelle einen DSGVO-geschützten Link für Eltern, Großeltern und Freunde. Keine Registrierung für Empfänger nötig.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Target Playlist Selector */}
              {customPlaylists.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: colors.textPrimary, marginBottom: '6px', fontWeight: 800 }}>
                    Was möchtest du teilen?
                  </label>
                  <select
                    value={shareTargetPlaylistId || ''}
                    onChange={(e) => setShareTargetPlaylistId(e.target.value || null)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.25)'}`,
                      background: isLight ? '#f8fafc' : 'rgba(0, 0, 0, 0.35)',
                      color: colors.textPrimary,
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">🌟 Komplette Audio-Biografie (Alle Meilensteine)</option>
                    {customPlaylists.map(pl => (
                      <option key={pl.id} value={pl.id}>
                        💿 Playlist: {pl.title} ({pl.tracks.length} Songs)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 🛡️ Urheberrechts- & GEMA-Schutz (§§ 16, 19a UrhG): Downloads für Dritte untersagt */}
              <div style={{
                background: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '14px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: isLight ? '#e6f4ea' : 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10b981',
                  flexShrink: 0
                }}>
                  <Shield size={16} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: colors.textPrimary }}>
                    100% GEMA- & Urheberrechtsschutz (Listen-Only)
                  </span>
                  <span style={{ fontSize: '0.70rem', color: colors.textSecondary, lineHeight: 1.35 }}>
                    Geteilte Links sind reine <b>Web-Streams ohne Download-Möglichkeit</b> für Dritte (§§ 16, 19a UrhG). Deine Originaldateien bleiben in deinem Account geschützt.
                  </span>
                </div>
              </div>

              {/* Applause / Reactions Toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.86rem', cursor: 'pointer', color: colors.textPrimary, fontWeight: 700 }}>
                <input
                  type="checkbox"
                  checked={shareAllowApplause}
                  onChange={(e) => setShareAllowApplause(e.target.checked)}
                  style={{ accentColor: '#10b981', width: '17px', height: '17px' }}
                />
                <span>Icon-Applaus & Reaktionen erlauben (👏 Bravo, ❤️ Herz, 🔥 Feuer, ⭐ Stern)</span>
              </label>

              {/* Anonymize Toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.86rem', cursor: 'pointer', color: colors.textPrimary, fontWeight: 700 }}>
                <input
                  type="checkbox"
                  checked={shareAnonymously}
                  onChange={(e) => setShareAnonymously(e.target.checked)}
                  style={{ accentColor: '#10b981', width: '17px', height: '17px' }}
                />
                <span>Name anonymisieren (z. B. "Schülerin der Musikschule")</span>
              </label>

              {/* Mandatory 4-Digit PIN Security (§ 15 Abs. 3 UrhG) */}
              <div style={{
                background: isLight ? '#f0fdf4' : 'rgba(16, 185, 129, 0.08)',
                border: `1.5px solid ${isLight ? '#86efac' : 'rgba(16, 185, 129, 0.25)'}`,
                borderRadius: '16px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.82rem', color: colors.textPrimary, fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Lock size={15} color="#10b981" />
                    <span>Deine feste Familien-PIN (Gilt für alle deine Playlists):</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const newPin = Math.floor(1000 + Math.random() * 9000).toString();
                      setSharePin(newPin);
                      try {
                        localStorage.setItem(`campus_share_pin_${student?.id || studentId}`, newPin);
                        if (shareTargetPlaylistId) {
                          localStorage.setItem(`campus_share_pin_${student?.id || studentId}_${shareTargetPlaylistId}`, newPin);
                        }
                      } catch {}
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#10b981',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>🎲 PIN neu würfeln</span>
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="text"
                    maxLength={4}
                    value={sharePin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setSharePin(val);
                      try {
                        localStorage.setItem(`campus_share_pin_${student?.id || studentId}`, val);
                        if (shareTargetPlaylistId) {
                          localStorage.setItem(`campus_share_pin_${student?.id || studentId}_${shareTargetPlaylistId}`, val);
                        }
                      } catch {}
                    }}
                    style={{
                      width: '120px',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: `1.5px solid #10b981`,
                      background: isLight ? '#ffffff' : 'rgba(0, 0, 0, 0.45)',
                      color: colors.textPrimary,
                      fontSize: '1.25rem',
                      fontWeight: 900,
                      letterSpacing: '6px',
                      textAlign: 'center',
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{ fontSize: '0.74rem', color: colors.textSecondary, lineHeight: 1.35 }}>
                    Oma & Familie müssen sich nur diesen einen 4-stelligen Code merken, um alle deine Songs & Alben anzuhören.
                  </span>
                </div>
              </div>
            </div>

            {/* Generated Share Message Box */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: colors.textPrimary, marginBottom: '6px', fontWeight: 800 }}>
                Generierte Freigabe-Nachricht für WhatsApp / SMS / Mail:
              </label>
              <div style={{
                padding: '12px 14px',
                borderRadius: '14px',
                border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.15)'}`,
                background: isLight ? '#f8fafc' : 'rgba(0, 0, 0, 0.45)',
                color: colors.textPrimary,
                fontSize: '0.78rem',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.45,
                userSelect: 'all'
              }}>
                {fullShareText}
              </div>
            </div>

            {/* Action Buttons: WhatsApp Direct, Native Share Sheet & Direct Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* 🟢 1. Dedicated WhatsApp Share Button */}
              <button
                type="button"
                onClick={handleShareWhatsApp}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '100px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: '0.94rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 6px 20px rgba(37, 211, 102, 0.45)',
                  transition: 'all 0.2s ease'
                }}
                className="hover-scale"
              >
                <MessageCircle size={20} strokeWidth={2.5} />
                <span>🟢 Direkt per WhatsApp an Familie senden</span>
              </button>

              {/* 📋 2. Universal Share / Copy Button */}
              <button
                type="button"
                onClick={handleShareLink}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '100px',
                  border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
                  background: copySuccess ? '#059669' : (isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.08)'),
                  color: copySuccess ? 'white' : colors.textPrimary,
                  fontWeight: 900,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
                className="hover-scale"
              >
                {copySuccess ? <Check size={17} strokeWidth={3} /> : <Share2 size={17} />}
                <span>{copySuccess ? 'Nachricht in Zwischenablage kopiert! 🎉' : '📋 Nachricht kopieren & teilen'}</span>
              </button>

              {/* 🔗 3. Test Preview Button */}
              <button
                type="button"
                onClick={() => window.open(effectiveShareUrl, '_blank')}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '100px',
                  border: `1.5px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.12)'}`,
                  background: isLight ? '#ffffff' : 'transparent',
                  color: colors.textSecondary,
                  fontWeight: 800,
                  fontSize: '0.80rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
                className="hover-scale"
              >
                <ExternalLink size={14} color="#10b981" />
                <span>PIN-Eingabeseite testen (neuer Tab)</span>
              </button>

              {/* 🔒 Privater Familien-Zugang Hinweis nach § 15 Abs. 3 UrhG */}
              <div style={{
                background: isLight ? '#f8fafc' : 'rgba(0, 0, 0, 0.3)',
                border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'}`,
                borderRadius: '14px',
                padding: '12px 14px',
                marginTop: '4px'
              }}>
                <span style={{ display: 'block', fontSize: '0.72rem', color: colors.textSecondary, lineHeight: 1.45 }}>
                  🔒 <strong>Privater Familien-Zugang:</strong><br />
                  Diese Audio-Aufnahmen enthalten urheberrechtlich geschützte Musikstücke. Um die gesetzlichen Bestimmungen einzuhalten, darfst du diesen Link und die PIN ausschließlich an deine Familie und enge persönliche Freunde weitergeben (§ 15 Abs. 3 UrhG). Ein öffentliches Teilen (z. B. in sozialen Netzwerken oder auf öffentlichen Webseiten) ist nicht gestattet.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 7. DUAL-VERSION DOWNLOAD MODAL (Studio Master & Pure RAW) */}
      {activeDownloadMenuTrack && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px'
        }}>
          <div style={{
            background: isLight ? '#ffffff' : '#1e293b',
            border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
            borderRadius: '24px',
            padding: '24px',
            maxWidth: '460px',
            width: '100%',
            color: colors.textPrimary,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Download size={22} color="#10b981" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900 }}>
                    Song herunterladen
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: colors.textSecondary, fontWeight: 600 }}>
                    "{activeDownloadMenuTrack.title}"
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveDownloadMenuTrack(null)}
                style={{ background: 'none', border: 'none', color: colors.textSecondary, fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.8rem', color: colors.textSecondary, lineHeight: 1.4 }}>
              Wähle dein bevorzugtes Format. Beide Spuren sind in verlustfreier Studioqualität (WAV) und auf <b>-13.0 LUFS pegelangeglichen</b>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Option 1: Studio Master */}
              <button
                type="button"
                onClick={() => downloadSpecificAudioVersion(
                  'master', 
                  activeDownloadMenuTrack.rawUrl, 
                  activeDownloadMenuTrack.masteredUrl, 
                  activeDownloadMenuTrack.title, 
                  activeDownloadMenuTrack.trackId
                )}
                style={{
                  padding: '14px 16px',
                  borderRadius: '16px',
                  border: `1.5px solid ${isLight ? '#86efac' : 'rgba(16, 185, 129, 0.3)'}`,
                  background: isLight ? '#f0fdf4' : 'rgba(16, 185, 129, 0.12)',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  textAlign: 'left'
                }}
                className="hover-scale"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#10b981' }}>
                      Studio Audio-Processing (.wav)
                    </div>
                    <div style={{ fontSize: '0.74rem', color: colors.textSecondary }}>
                      Mit Studio Audio-Processing • -13 LUFS
                    </div>
                  </div>
                </div>
                <Download size={16} color="#10b981" />
              </button>

              {/* Option 2: Pure RAW */}
              <button
                type="button"
                onClick={() => downloadSpecificAudioVersion(
                  'raw', 
                  activeDownloadMenuTrack.rawUrl, 
                  activeDownloadMenuTrack.masteredUrl, 
                  activeDownloadMenuTrack.title, 
                  activeDownloadMenuTrack.trackId
                )}
                style={{
                  padding: '14px 16px',
                  borderRadius: '16px',
                  border: `1.5px solid ${isLight ? '#93c5fd' : 'rgba(59, 130, 246, 0.3)'}`,
                  background: isLight ? '#eff6ff' : 'rgba(59, 130, 246, 0.12)',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  textAlign: 'left'
                }}
                className="hover-scale"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <Mic size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#3b82f6' }}>
                      Pure RAW (.wav)
                    </div>
                    <div style={{ fontSize: '0.74rem', color: colors.textSecondary }}>
                      Unbearbeitete Originalaufnahme • -13 LUFS Pegel-Match
                    </div>
                  </div>
                </div>
                <Download size={16} color="#3b82f6" />
              </button>

              {/* Option 3: Both Versions */}
              <button
                type="button"
                onClick={() => downloadSpecificAudioVersion(
                  'both', 
                  activeDownloadMenuTrack.rawUrl, 
                  activeDownloadMenuTrack.masteredUrl, 
                  activeDownloadMenuTrack.title, 
                  activeDownloadMenuTrack.trackId
                )}
                style={{
                  padding: '12px 16px',
                  borderRadius: '16px',
                  border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.15)'}`,
                  background: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.05)',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 800
                }}
                className="hover-scale"
              >
                <Download size={14} color="#f59e0b" />
                <span>Beide Versionen herunterladen (Master + RAW)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎛️ 7. SONG EDITIEREN & RAUMKLANG MODAL (Edit Hall, Version & Details) */}
      {editingTrackData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.82)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: isLight ? '#ffffff' : '#1e293b',
            border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
            borderRadius: '24px',
            padding: '26px',
            maxWidth: '520px',
            width: '100%',
            color: colors.textPrimary,
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.75)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: isLight ? '#e0f2fe' : 'rgba(14, 165, 233, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0284c7'
                }}>
                  <SlidersHorizontal size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.14rem', fontWeight: 900 }}>
                    Song bearbeiten & Raumklang
                  </h3>
                  <span style={{ fontSize: '0.76rem', color: colors.textSecondary, fontWeight: 600 }}>
                    Standard-Version festlegen & Gala-Konzertsaal Hall verfeinern
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeEditTrackModal}
                style={{ background: 'none', border: 'none', color: colors.textSecondary, fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Version Selection Cards (Studio Master vs. Pure RAW) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 800, color: colors.textPrimary }}>
                Standard-Wiedergabeversion:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {/* Option 1: Studio Master */}
                <div
                  onClick={() => setEditingTrackData(prev => prev ? { ...prev, preferredVersion: 'master' } : null)}
                  style={{
                    border: `2px solid ${editingTrackData.preferredVersion === 'master' ? '#10b981' : (isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.12)')}`,
                    borderRadius: '16px',
                    padding: '12px',
                    background: editingTrackData.preferredVersion === 'master' 
                      ? (isLight ? '#f0fdf4' : 'rgba(16, 185, 129, 0.12)') 
                      : (isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)'),
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '8px',
                    boxShadow: editingTrackData.preferredVersion === 'master' ? '0 4px 14px rgba(16, 185, 129, 0.2)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale"
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.64rem', fontWeight: 900, padding: '2px 7px', borderRadius: '100px', background: '#10b981', color: 'white' }}>
                        ✨ STUDIO MASTER
                      </span>
                      {editingTrackData.preferredVersion === 'master' && (
                        <CheckCircle2 size={15} color="#10b981" />
                      )}
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 900, color: colors.textPrimary }}>
                      Studio Audio-Processing
                    </div>
                    <p style={{ margin: '3px 0 0 0', fontSize: '0.70rem', color: colors.textSecondary, lineHeight: 1.25 }}>
                      Gala-Konzertsaal Raumklang & Druck (-13 LUFS).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleEditModalPreview('master');
                    }}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '100px',
                      border: 'none',
                      background: editModalPreviewPlaying === 'master' ? '#ef4444' : '#10b981',
                      color: 'white',
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px'
                    }}
                  >
                    {editModalPreviewPlaying === 'master' ? <Pause size={12} /> : <Play size={12} />}
                    <span>{editModalPreviewPlaying === 'master' ? 'Stoppen' : 'Studio vorhören'}</span>
                  </button>
                </div>

                {/* Option 2: Pure RAW */}
                <div
                  onClick={() => setEditingTrackData(prev => prev ? { ...prev, preferredVersion: 'raw' } : null)}
                  style={{
                    border: `2px solid ${editingTrackData.preferredVersion === 'raw' ? '#3b82f6' : (isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.12)')}`,
                    borderRadius: '16px',
                    padding: '12px',
                    background: editingTrackData.preferredVersion === 'raw' 
                      ? (isLight ? '#eff6ff' : 'rgba(59, 130, 246, 0.12)') 
                      : (isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)'),
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '8px',
                    boxShadow: editingTrackData.preferredVersion === 'raw' ? '0 4px 14px rgba(59, 130, 246, 0.2)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale"
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.64rem', fontWeight: 900, padding: '2px 7px', borderRadius: '100px', background: '#3b82f6', color: 'white' }}>
                        🎙️ PURE RAW
                      </span>
                      {editingTrackData.preferredVersion === 'raw' && (
                        <CheckCircle2 size={15} color="#3b82f6" />
                      )}
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 900, color: colors.textPrimary }}>
                      Originalklang
                    </div>
                    <p style={{ margin: '3px 0 0 0', fontSize: '0.70rem', color: colors.textSecondary, lineHeight: 1.25 }}>
                      100% unverfälschte Mikrofon-Aufnahme (-13 LUFS).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleEditModalPreview('raw');
                    }}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '100px',
                      border: 'none',
                      background: editModalPreviewPlaying === 'raw' ? '#ef4444' : '#3b82f6',
                      color: 'white',
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px'
                    }}
                  >
                    {editModalPreviewPlaying === 'raw' ? <Pause size={12} /> : <Play size={12} />}
                    <span>{editModalPreviewPlaying === 'raw' ? 'Stoppen' : 'RAW vorhören'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 🏛️ Apple-Style Spatial Audio Raumakustik (4 Presets + Fein-Tuning Slider) */}
            <div style={{
              background: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.04)',
              borderRadius: '18px',
              padding: '14px 16px',
              border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 900, color: colors.textPrimary, letterSpacing: '-0.01em' }}>
                    🏛️ Raumakustik & Raumgröße
                  </span>
                  {isRemasteringEditTrack && (
                    <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 800, animation: 'pulse 1s infinite' }}>
                      ⏳ Remastering...
                    </span>
                  )}
                </div>
                <span style={{
                  fontSize: '0.74rem',
                  fontWeight: 900,
                  color: '#10b981',
                  background: isLight ? '#dcfce7' : 'rgba(16, 185, 129, 0.18)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '2px 9px',
                  borderRadius: '100px'
                }}>
                  {editingTrackData.reverbWetMix <= 12 ? '🎙️ Studio' : editingTrackData.reverbWetMix <= 25 ? '🎻 Kammermusik' : editingTrackData.reverbWetMix <= 42 ? '🏛️ Konzertsaal' : '⛪ Kathedrale'} • {editingTrackData.reverbWetMix}%
                </span>
              </div>

              {/* 4 Apple-Style Curated Room Preset Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[
                  { id: 'studio', name: 'Studio', emoji: '🎙️', wet: 10, sub: 'Trocken' },
                  { id: 'chamber', name: 'Kammermusik', emoji: '🎻', wet: 20, sub: 'Warm' },
                  { id: 'hall', name: 'Konzertsaal', emoji: '🏛️', wet: 35, sub: 'Gala-Saal' },
                  { id: 'cathedral', name: 'Kathedrale', emoji: '⛪', wet: 55, sub: 'Monumental' },
                ].map(room => {
                  const isActive = Math.abs(editingTrackData.reverbWetMix - room.wet) <= 6;
                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => handleEditReverbSliderChange(room.wet)}
                      style={{
                        padding: '10px 6px',
                        borderRadius: '14px',
                        border: isActive 
                          ? '1.5px solid #10b981' 
                          : `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'}`,
                        background: isActive 
                          ? (isLight ? '#f0fdf4' : 'rgba(16, 185, 129, 0.2)') 
                          : (isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.03)'),
                        boxShadow: isActive ? '0 4px 12px rgba(16, 185, 129, 0.22)' : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3px',
                        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                      className="hover-scale"
                    >
                      <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{room.emoji}</span>
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: 900,
                        color: isActive ? (isLight ? '#059669' : '#34d399') : colors.textPrimary,
                        whiteSpace: 'nowrap'
                      }}>
                        {room.name}
                      </span>
                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: 600,
                        color: isActive ? (isLight ? '#15803d' : '#86efac') : colors.textSecondary
                      }}>
                        {room.sub}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Apple Fine-Tuning Slider Bar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: colors.textSecondary, fontWeight: 700 }}>
                  <span>Feinabstimmung (Raumtiefe & Nachhall):</span>
                  <span style={{ color: '#10b981', fontWeight: 900 }}>{editingTrackData.reverbWetMix}% Wet</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="65"
                  step="1"
                  value={editingTrackData.reverbWetMix}
                  onChange={(e) => handleEditReverbSliderChange(Number(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: '#10b981',
                    cursor: 'pointer',
                    height: '6px',
                    borderRadius: '4px'
                  }}
                />
              </div>
            </div>

            {/* Song Meta Inputs: Titel & Notiz */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: colors.textPrimary, fontWeight: 800, marginBottom: '4px' }}>
                  Songtitel:
                </label>
                <input
                  type="text"
                  value={editingTrackData.title}
                  onChange={(e) => setEditingTrackData(prev => prev ? { ...prev, title: e.target.value } : null)}
                  placeholder="z. B. Für Elise..."
                  style={{
                    width: '100%',
                    padding: '9px 11px',
                    borderRadius: '12px',
                    border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
                    background: isLight ? '#f8fafc' : 'rgba(0, 0, 0, 0.35)',
                    color: colors.textPrimary,
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: colors.textPrimary, fontWeight: 800, marginBottom: '4px' }}>
                  Interpret / Notiz:
                </label>
                <input
                  type="text"
                  value={editingTrackData.artist || ''}
                  onChange={(e) => setEditingTrackData(prev => prev ? { ...prev, artist: e.target.value } : null)}
                  placeholder="z. B. Amelia..."
                  style={{
                    width: '100%',
                    padding: '9px 11px',
                    borderRadius: '12px',
                    border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
                    background: isLight ? '#f8fafc' : 'rgba(0, 0, 0, 0.35)',
                    color: colors.textPrimary,
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={closeEditTrackModal}
                disabled={isSavingEditTrack}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: '100px',
                  border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
                  background: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.05)',
                  color: colors.textPrimary,
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
                className="hover-scale"
              >
                Abbrechen
              </button>

              <button
                type="button"
                onClick={handleSaveEditedTrack}
                disabled={isSavingEditTrack}
                style={{
                  flex: 1.3,
                  padding: '11px',
                  borderRadius: '100px',
                  border: 'none',
                  background: '#10b981',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  cursor: isSavingEditTrack ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                  opacity: isSavingEditTrack ? 0.7 : 1
                }}
                className="hover-scale"
              >
                <Check size={16} />
                <span>{isSavingEditTrack ? 'Wird gespeichert...' : 'Änderungen speichern'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 8. DELETE CONFIRMATION MODAL */}
      {pendingDeleteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: '16px'
        }}>
          <div style={{
            background: isLight ? '#ffffff' : '#1e293b',
            border: `1px solid ${isLight ? '#fecaca' : 'rgba(239, 68, 68, 0.3)'}`,
            borderRadius: '24px',
            padding: '26px',
            maxWidth: '440px',
            width: '100%',
            color: colors.textPrimary,
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: isLight ? '#fef2f2' : 'rgba(239, 68, 68, 0.15)',
                border: '1.5px solid #ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                flexShrink: 0
              }}>
                <Trash2 size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 900, color: colors.textPrimary }}>
                  {pendingDeleteModal.type === 'track' ? 'Song wirklich löschen?' : 'Playlist wirklich löschen?'}
                </h3>
                <span style={{ fontSize: '0.82rem', color: '#ef4444', fontWeight: 700 }}>
                  "{pendingDeleteModal.title}"
                </span>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.84rem', color: colors.textSecondary, lineHeight: 1.45 }}>
              {pendingDeleteModal.type === 'track'
                ? 'Möchtest du diesen Song wirklich aus deiner Playlist und dem Speicher entfernen? Diese Aktion kann nicht rückgängig gemacht werden.'
                : 'Möchtest du diese Playlist wirklich löschen? (Die 9 Meilensteine deiner Audio-Biografie bleiben davon 100% erhalten)'}
            </p>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setPendingDeleteModal(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '100px',
                  border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
                  background: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.05)',
                  color: colors.textPrimary,
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
                className="hover-scale"
              >
                Abbrechen
              </button>

              <button
                type="button"
                onClick={executeConfirmedDelete}
                style={{
                  flex: 1.2,
                  padding: '12px',
                  borderRadius: '100px',
                  border: 'none',
                  background: '#ef4444',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 16px rgba(239, 68, 68, 0.4)'
                }}
                className="hover-scale"
              >
                <Trash2 size={15} />
                <span>Löschen bestätigen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📁 9. SCHULJAHR-ORDNER MODAL */}
      {renderSchoolYearFolderModal()}

      {/* 📖 10. DIGITALES LINER-NOTES BOOKLET MODAL */}
      {renderLinerNotesModal()}

      {/* 💽 11. PERSISTENT FLOATING BOTTOM MINI-PLAYER */}
      {renderFloatingMiniPlayer()}
    </div>
  );
};


