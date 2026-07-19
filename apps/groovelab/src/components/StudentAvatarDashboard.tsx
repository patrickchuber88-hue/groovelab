import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { subscribeUserToPush, unsubscribeUserFromPush } from '../utils/webPush';
import { 
  Award, Lock, Smartphone, HelpCircle, Trophy, Sparkles, Star, 
  ChevronRight, Coffee, Clock, Flame, BookOpen, Share2, Play, 
  Pause, RotateCcw, Volume2, Moon, QrCode, X, EyeOff, Zap, Music, Library, School, Calendar, Check, Target, MessageSquare, Send,
  Pencil, Edit3, User, Mail, Phone, MapPin, Activity, Camera, TrendingUp, Users, Shield, Search, Palmtree, Settings, Bell, FileText, ThumbsUp, Heart, AlertTriangle, Anchor
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip } from 'recharts';
import { CampusEventsBoard } from './CampusEventsBoard';
import { createPortal } from 'react-dom';
import { QRCodeModal } from './QRCodeModal';
import { MeisterwerkDocumentationModal } from './MeisterwerkDocumentationModal';
import { usePremiumOnboardingTour, TourStep, TourStartButton } from './PremiumOnboardingTour';

const showMissionsFeature = false;

interface Avatar {
  avatar_style: string;
  instrument_type: string;
  evolution_level: number;
  xp: number;
  asset_path: string;
  streak_flame?: number;
}

const getInstrumentAvatarUrl = (instrument: string | null | undefined): string => {
  if (!instrument) return '/avatars/gitarre_avatar_new.png';
  const inst = instrument.toLowerCase().trim();
  if (inst.includes('e-gitarre')) return '/avatars/egitarre_avatar.png';
  if (inst.includes('guitar') || inst.includes('gitarre')) return '/avatars/gitarre_avatar_new.png';
  if (inst.includes('e-bass')) return '/avatars/ebass_avatar.png';
  if (inst.includes('kontrabass') || inst.includes('double bass')) return '/avatars/kontrabass_avatar.png';
  if (inst.includes('bass')) return '/avatars/bass_avatar.png';
  if (inst.includes('drum') || inst.includes('schlagzeug')) return '/avatars/schlagzeug_avatar.png';
  if (inst.includes('piano') || inst.includes('keys') || inst.includes('klavier') || inst.includes('keyboard')) return '/avatars/klavier_avatar_new.png';
  if (inst.includes('vocal') || inst.includes('gesang') || inst.includes('stimme') || inst.includes('singer')) return '/avatars/gesang_avatar.png';
  if (inst.includes('trompete') || inst.includes('trumpet')) return '/avatars/trompete_avatar_new.png';
  if (inst.includes('posaune') || inst.includes('trombone')) return '/avatars/posaune_avatar.png';
  if (inst.includes('horn')) return '/avatars/horn_avatar_new.png';
  if (inst.includes('cello')) return '/avatars/cello_avatar_new.png';
  if (inst.includes('geige') || inst.includes('violin') || inst.includes('violine')) return '/avatars/violine_avatar_new.png';
  if (inst.includes('klarinette') || inst.includes('clarinet')) return '/avatars/klarinette_avatar_new.png';
  if (inst.includes('querflöte') || inst.includes('flute')) return '/avatars/querfloete_avatar.png';
  if (inst.includes('saxofon') || inst.includes('saxophone') || inst.includes('sax')) return '/avatars/saxophon_avatar_new.png';
  if (inst.includes('blockflöte') || inst.includes('recorder') || inst.includes('blockfloete')) return '/avatars/blockfloete_avatar.png';
  if (inst.includes('bariton') || inst.includes('baritone')) return '/avatars/bariton_avatar.png';
  if (inst.includes('oboe')) return '/avatars/oboe_avatar.png';
  return '/avatars/gitarre_avatar_new.png';
};

const maskEmail = (email: string | null | undefined): string => {
  if (!email) return 'Nicht hinterlegt';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [prefix, domain] = parts;
  if (prefix.length <= 2) {
    return `${prefix.charAt(0)}...@${domain}`;
  }
  return `${prefix.substring(0, 2)}...${prefix.charAt(prefix.length - 1)}@${domain}`;
};

const STUDENT_AVATARS = [
  // E-Gitarre (15)
  { id: 'student_boy_guitar_1', label: 'E-Gitarre (Boy Black)', url: '/avatars/student_boy_black_guitar.png', category: 'E-Gitarre' },
  { id: 'student_girl_guitar_1', label: 'E-Gitarre (Girl Blonde)', url: '/avatars/student_girl_blonde_guitar.png', category: 'E-Gitarre' },
  { id: 'student_boy_blonde_guitar', label: 'E-Gitarre (Boy Blonde)', url: '/avatars/student_boy_blonde_guitar.png', category: 'E-Gitarre' },
  { id: 'student_girl_black_guitar', label: 'E-Gitarre (Girl Black)', url: '/avatars/student_girl_black_guitar.png', category: 'E-Gitarre' },
  { id: 'student_eguitar_alt', label: 'E-Gitarre (Hero)', url: '/avatars/student_eguitar_1.png', category: 'E-Gitarre' },
  { id: 'bandstyle_boy_eguitar', label: 'Band E-Gitarre (Boy)', url: '/avatars/bandstyle_boy_eguitar.png', category: 'E-Gitarre' },
  { id: 'bandstyle_girl_eguitar', label: 'Band E-Gitarre (Girl)', url: '/avatars/bandstyle_girl_eguitar.png', category: 'E-Gitarre' },
  { id: 'teen_boy_eguitar_realistic', label: 'E-Gitarre (Realistic Boy)', url: '/avatars/teen_boy_eguitar_realistic.png', category: 'E-Gitarre' },
  { id: 'teen_girl_eguitar_focused', label: 'E-Gitarre (Focused Girl)', url: '/avatars/teen_girl_eguitar_focused.png', category: 'E-Gitarre' },
  { id: 'teen_boy_eguitar_17', label: 'E-Gitarre (Hero Boy)', url: '/avatars/teen_boy_eguitar_17.png', category: 'E-Gitarre' },
  { id: 'teen_boy_acoustic_guitar', label: 'Akustik-Gitarre (Boy)', url: '/avatars/teen_boy_acoustic_guitar.png', category: 'E-Gitarre' },
  { id: 'teen_girl_acoustic_guitar', label: 'Akustik-Gitarre (Girl)', url: '/avatars/teen_girl_acoustic_guitar.png', category: 'E-Gitarre' },
  { id: 'student_eguitar_new_1', label: 'E-Gitarre (Neu 1)', url: '/avatars/student_eguitar_new_1.png', category: 'E-Gitarre' },
  { id: 'student_eguitar_new_2', label: 'E-Gitarre (Neu 2)', url: '/avatars/student_eguitar_new_2.png', category: 'E-Gitarre' },
  { id: 'student_eguitar_new_3', label: 'E-Gitarre (Neu 3)', url: '/avatars/student_eguitar_new_3.png', category: 'E-Gitarre' },

  // E-Piano / Keyboard (15)
  { id: 'student_boy_piano_1', label: 'E-Piano (Boy)', url: '/avatars/student_boy_black_piano.png', category: 'E-Piano' },
  { id: 'student_girl_piano_1', label: 'E-Piano (Girl)', url: '/avatars/student_girl_black_piano.png', category: 'E-Piano' },
  { id: 'student_piano_alt', label: 'E-Piano (Hero)', url: '/avatars/student_piano_1.png', category: 'E-Piano' },
  { id: 'student_boy_piano_2', label: 'E-Piano (Boy 2)', url: '/avatars/student_boy_piano_2.png', category: 'E-Piano' },
  { id: 'student_girl_piano_2', label: 'E-Piano (Girl 2)', url: '/avatars/student_girl_piano_2.png', category: 'E-Piano' },
  { id: 'student_girl_lightbrown_piano', label: 'E-Piano (Girl Lightbrown)', url: '/avatars/student_girl_lightbrown_piano.png', category: 'E-Piano' },
  { id: 'student_boy_lightbrown_piano', label: 'E-Piano (Boy Lightbrown)', url: '/avatars/student_boy_lightbrown_piano.png', category: 'E-Piano' },
  { id: 'student_boy_keyboard_1', label: 'Keyboard (Boy)', url: '/avatars/student_boy_keyboard_1.png', category: 'E-Piano' },
  { id: 'student_boy_producer_1', label: 'Keyboard-Producer (Boy)', url: '/avatars/student_boy_producer_1.png', category: 'E-Piano' },
  { id: 'student_tech_1', label: 'Keyboard-Tech (Hero)', url: '/avatars/student_tech_1.png', category: 'E-Piano' },
  { id: 'bandstyle_boy_epiano', label: 'Band E-Piano (Boy)', url: '/avatars/bandstyle_boy_epiano.png', category: 'E-Piano' },
  { id: 'bandstyle_girl_epiano', label: 'Band E-Piano (Girl)', url: '/avatars/bandstyle_girl_epiano.png', category: 'E-Piano' },
  { id: 'avatar_boy_piano', label: 'Klassen-Piano (Boy)', url: '/avatar_boy_piano.jpg', category: 'E-Piano' },
  { id: 'avatar_girl_piano', label: 'Klassen-Piano (Girl)', url: '/avatar_girl_piano.jpg', category: 'E-Piano' },
  { id: 'student_epiano_new_1', label: 'E-Piano (Neu 1)', url: '/avatars/student_epiano_new_1.png', category: 'E-Piano' },

  // E-Drums (15)
  { id: 'student_boy_drums_1', label: 'E-Drum (Boy Black)', url: '/avatars/student_boy_black_drums.png', category: 'E-Drum' },
  { id: 'student_girl_drums_1', label: 'E-Drum (Girl Blonde)', url: '/avatars/student_girl_blonde_drums.png', category: 'E-Drum' },
  { id: 'student_boy_blonde_drums', label: 'E-Drum (Boy Blonde)', url: '/avatars/student_boy_blonde_drums.png', category: 'E-Drum' },
  { id: 'student_girl_black_drums', label: 'E-Drum (Girl Black)', url: '/avatars/student_girl_black_drums.png', category: 'E-Drum' },
  { id: 'student_drums_alt', label: 'E-Drum (Hero)', url: '/avatars/student_drums_1.png', category: 'E-Drum' },
  { id: 'student_boy_drums_2', label: 'E-Drum (Boy 2)', url: '/avatars/student_boy_drums_2.png', category: 'E-Drum' },
  { id: 'student_girl_drums_2', label: 'E-Drum (Girl 2)', url: '/avatars/student_girl_drums_2.png', category: 'E-Drum' },
  { id: 'student_boy_drums_3', label: 'E-Drum (Boy 3)', url: '/avatars/student_boy_drums_3.png', category: 'E-Drum' },
  { id: 'student_girl_drums_3', label: 'E-Drum (Girl 3)', url: '/avatars/student_girl_drums_3.png', category: 'E-Drum' },
  { id: 'bandstyle_boy_edrums', label: 'Band E-Drum (Boy)', url: '/avatars/bandstyle_boy_edrums.png', category: 'E-Drum' },
  { id: 'bandstyle_girl_edrums', label: 'Band E-Drum (Girl)', url: '/avatars/bandstyle_girl_edrums.png', category: 'E-Drum' },
  { id: 'avatar_boy_drums', label: 'Klassen-Drums (Boy)', url: '/avatar_boy_drums.jpg', category: 'E-Drum' },
  { id: 'avatar_girl_drums', label: 'Klassen-Drums (Girl)', url: '/avatar_girl_drums.jpg', category: 'E-Drum' },
  { id: 'student_edrums_new_1', label: 'E-Drum (Neu 1)', url: '/avatars/student_edrums_new_1.png', category: 'E-Drum' },
  { id: 'student_edrums_new_2', label: 'E-Drum (Neu 2)', url: '/avatars/student_edrums_new_2.png', category: 'E-Drum' },

  // E-Bass (15)
  { id: 'student_girl_bass_1', label: 'E-Bass (Girl Black)', url: '/avatars/student_girl_black_bass.png', category: 'E-Bass' },
  { id: 'student_bass_alt', label: 'E-Bass (Hero)', url: '/avatars/student_bass_1.png', category: 'E-Bass' },
  { id: 'student_girl_ebass_1', label: 'E-Bass (Girl 1)', url: '/avatars/student_girl_ebass_1.png', category: 'E-Bass' },
  { id: 'bandstyle_boy_ebass', label: 'Band E-Bass (Boy)', url: '/avatars/bandstyle_boy_ebass.png', category: 'E-Bass' },
  { id: 'bandstyle_girl_ebass', label: 'Band E-Bass (Girl)', url: '/avatars/bandstyle_girl_ebass.png', category: 'E-Bass' },
  { id: 'avatar_boy_bass', label: 'Klassen-Bass (Boy)', url: '/avatar_boy_bass.jpg', category: 'E-Bass' },
  { id: 'avatar_girl_bass', label: 'Klassen-Bass (Girl)', url: '/avatar_girl_bass.jpg', category: 'E-Bass' },
  { id: 'student_ebass_new_1', label: 'E-Bass (Neu 1)', url: '/avatars/student_ebass_new_1.png', category: 'E-Bass' },
  { id: 'student_ebass_new_2', label: 'E-Bass (Neu 2)', url: '/avatars/student_ebass_new_2.png', category: 'E-Bass' },
  { id: 'student_ebass_new_3', label: 'E-Bass (Neu 3)', url: '/avatars/student_ebass_new_3.png', category: 'E-Bass' },
  { id: 'student_ebass_new_4', label: 'E-Bass (Neu 4)', url: '/avatars/student_ebass_new_4.png', category: 'E-Bass' },
  { id: 'student_ebass_new_5', label: 'E-Bass (Neu 5)', url: '/avatars/student_ebass_new_5.png', category: 'E-Bass' },
  { id: 'student_ebass_new_6', label: 'E-Bass (Neu 6)', url: '/avatars/student_ebass_new_6.png', category: 'E-Bass' },
  { id: 'student_ebass_new_7', label: 'E-Bass (Neu 7)', url: '/avatars/student_ebass_new_7.png', category: 'E-Bass' },
  { id: 'student_ebass_new_8', label: 'E-Bass (Neu 8)', url: '/avatars/student_ebass_new_8.png', category: 'E-Bass' },

  // Gesang (15)
  { id: 'student_boy_vocals_1', label: 'Gesang (Boy Red)', url: '/avatars/student_boy_red_vocals.png', category: 'Gesang' },
  { id: 'student_girl_vocals_1', label: 'Gesang (Girl Red)', url: '/avatars/student_girl_red_vocals.png', category: 'Gesang' },
  { id: 'student_boy_vocals_new', label: 'Gesang (Boy 1)', url: '/avatars/student_boy_vocals_1.png', category: 'Gesang' },
  { id: 'student_girl_vocals_new', label: 'Gesang (Girl 1)', url: '/avatars/student_girl_vocals_1.png', category: 'Gesang' },
  { id: 'student_vocals_alt', label: 'Gesang (Hero)', url: '/avatars/student_vocals_1.png', category: 'Gesang' },
  { id: 'student_vocals_new_2', label: 'Gesang (Neu 2)', url: '/avatars/student_vocals_new_2.png', category: 'Gesang' },
  { id: 'student_vocals_new_3', label: 'Gesang (Neu 3)', url: '/avatars/student_vocals_new_3.png', category: 'Gesang' },
  { id: 'student_vocals_new_4', label: 'Gesang (Neu 4)', url: '/avatars/student_vocals_new_4.png', category: 'Gesang' },
  { id: 'student_vocals_new_5', label: 'Gesang (Neu 5)', url: '/avatars/student_vocals_new_5.png', category: 'Gesang' },
  { id: 'student_vocals_new_6', label: 'Gesang (Neu 6)', url: '/avatars/student_vocals_new_6.png', category: 'Gesang' },
  { id: 'student_vocals_new_7', label: 'Gesang (Neu 7)', url: '/avatars/student_vocals_new_7.png', category: 'Gesang' },
  { id: 'student_vocals_new_8', label: 'Gesang (Neu 8)', url: '/avatars/student_vocals_new_8.png', category: 'Gesang' },
  { id: 'student_vocals_new_9', label: 'Gesang (Neu 9)', url: '/avatars/student_vocals_new_9.png', category: 'Gesang' },
  { id: 'student_vocals_new_10', label: 'Gesang (Neu 10)', url: '/avatars/student_vocals_new_10.png', category: 'Gesang' },
  { id: 'student_vocals_new_11', label: 'Gesang (Neu 11)', url: '/avatars/student_vocals_new_11.png', category: 'Gesang' },

  // Allgemein / Sonstige
  { id: 'avatar_boy_general', label: 'Klassen-Schüler (Boy)', url: '/avatar_boy.jpg', category: 'Sonstige' },
  { id: 'avatar_girl_general', label: 'Klassen-Schülerin (Girl)', url: '/avatar_girl.jpg', category: 'Sonstige' }
];

interface StudentAvatarDashboardProps {
  studentId: string;
  parentActiveTab?: string;
  onTabChange?: (tab: string) => void;
  onProfileUpdate?: (updatedFields: any) => void;
}

const LEVEL_NAMES: Record<string, Record<number, string>> = {
  guitarist: {
    1: 'Garagen-Gitarrist (Lvl 1)',
    2: 'Band-Mitglied (Lvl 2)',
    3: 'Rockstar (Lvl 3)'
  },
  drummer: {
    1: 'Takt-Anfänger (Lvl 1)',
    2: 'Studio-Drummer (Lvl 2)',
    3: 'Rhythmus-Gott (Lvl 3)'
  },
  keyboardist: {
    1: 'Melodien-Sucher (Lvl 1)',
    2: 'Synthie-Pionier (Lvl 2)',
    3: 'Tasten-Virtuose (Lvl 3)'
  },
  vocalist: {
    1: 'Dusch-Sänger (Lvl 1)',
    2: 'Bühnen-Neuling (Lvl 2)',
    3: 'Stimm-König/in (Lvl 3)'
  }
};

interface LevelProgress {
  levelTitle: string;
  prevThreshold: number;
  nextThreshold: number;
  xpInCurrentLevel: number;
  totalXpInLevel: number;
  xpPercentage: number;
}

const getLevelProgress = (level: number, xp: number, instrumentType: string): LevelProgress => {
  const currentLevel = level || 1;
  const currentXp = xp || 0;
  const levelTitle = LEVEL_NAMES[instrumentType]?.[currentLevel] || `Stufe ${currentLevel}`;

  let nextThreshold = 500;
  let prevThreshold = 0;
  if (currentLevel === 2) {
    prevThreshold = 500;
    nextThreshold = 2500;
  } else if (currentLevel === 3) {
    prevThreshold = 2500;
    nextThreshold = 99999;
  }

  const xpInCurrentLevel = Math.max(0, currentXp - prevThreshold);
  const totalXpInLevel = nextThreshold - prevThreshold;
  const xpPercentage = currentLevel === 3 ? 100 : Math.min(100, (xpInCurrentLevel / totalXpInLevel) * 100);

  return {
    levelTitle,
    prevThreshold,
    nextThreshold,
    xpInCurrentLevel,
    totalXpInLevel,
    xpPercentage
  };
};

const HERO_CLASSES = [
  { id: 'guitarist', name: 'Gitarren-Held', icon: '🎸', desc: 'Melodien und Soli rocken' },
  { id: 'drummer', name: 'Beat-Master', icon: '🥁', desc: 'Den Groove und Takt angeben' },
  { id: 'keyboardist', name: 'Tasten-Magier', icon: '🎹', desc: 'Synthesizer und Klavier beherrschen' },
  { id: 'vocalist', name: 'Vocal-Star', icon: '🎤', desc: 'Die Bühne mit deiner Stimme erobern' }
];

const toLocalYYYYMMDD = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getDaysBetweenLocal = (dateStr1: string, dateStr2: string) => {
  const [y1, m1, d1] = dateStr1.split('-').map(Number);
  const [y2, m2, d2] = dateStr2.split('-').map(Number);
  const dt1 = new Date(y1, m1 - 1, d1, 12, 0, 0);
  const dt2 = new Date(y2, m2 - 1, d2, 12, 0, 0);
  const diffTime = dt2.getTime() - dt1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

const getISOWeekRaw = (dateInput?: string | Date, lessonDay: number = 1): string => {
  let date: Date;
  if (!dateInput) {
    date = new Date();
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    const match = String(dateInput).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // 0-indexed
      const day = parseInt(match[3], 10);
      date = new Date(year, month, day);
    } else {
      date = new Date(dateInput);
    }
  }
  
  if (isNaN(date.getTime())) {
    date = new Date();
  }

  // Adjust the date back to the most recent lesson day
  const currentDay = date.getDay(); // 0 (Sun) to 6 (Sat)
  let diff = currentDay - lessonDay;
  if (diff < 0) {
    diff += 7;
  }
  
  const lessonStart = new Date(date);
  lessonStart.setDate(date.getDate() - diff);

  const d = new Date(Date.UTC(lessonStart.getFullYear(), lessonStart.getMonth(), lessonStart.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

const getISOWeek = (dateInput?: string | Date): string => {
  return getISOWeekRaw(dateInput, 1);
};

const getItemWeek = (item: { topic_name: string; updated_at?: string }): string => {
  if (item.topic_name.startsWith('Hausaufgabe KW ')) {
    const parts = item.topic_name.split('Hausaufgabe KW ');
    const kwNum = parts[1]?.trim();
    if (kwNum) {
      const year = item.updated_at ? new Date(item.updated_at).getFullYear() : new Date().getFullYear();
      return `${year}-W${kwNum.padStart(2, '0')}`;
    }
  }
  return item.updated_at ? getISOWeek(item.updated_at) : '';
};

const getLehrwerkColor = (title: string, customLehrwerkeList?: any[]) => {
  const trimmed = (title || '').trim();
  const list = customLehrwerkeList || [];
  const sorted = [...list].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  const index = sorted.findIndex(b => (b.title || '').trim() === trimmed);
  
  if (index !== -1 && sorted.length > 0) {
    const position = index % 26;
    const hue = Math.round((position / 25) * 360);
    return {
      from: `hsl(${hue}, 85%, 94%)`,
      to: `hsl(${hue}, 80%, 84%)`,
      text: `hsl(${hue}, 90%, 25%)`,
      shadowFrom: `hsla(${hue}, 85%, 50%, 0.2)`,
      shadowTo: `hsla(${hue}, 80%, 40%, 0.15)`
    };
  }

  const firstChar = trimmed.charAt(0).toUpperCase();
  const charCode = firstChar.charCodeAt(0) || 65;
  const clampedCode = Math.max(65, Math.min(90, charCode));
  const hue = Math.round(((clampedCode - 65) / 25) * 360);
  return {
    from: `hsl(${hue}, 85%, 94%)`,
    to: `hsl(${hue}, 80%, 84%)`,
    text: `hsl(${hue}, 90%, 25%)`,
    shadowFrom: `hsla(${hue}, 85%, 50%, 0.2)`,
    shadowTo: `hsla(${hue}, 80%, 40%, 0.15)`
  };
};

const getSongColor = (title: string) => {
  const trimmed = (title || '').trim();
  const firstChar = trimmed.charAt(0).toUpperCase();
  const charCode = firstChar.charCodeAt(0) || 65;
  const clampedCode = Math.max(65, Math.min(90, charCode));
  const hue = Math.round(((clampedCode - 65) / 25) * 360);
  return {
    from: `hsl(${hue}, 85%, 94%)`,
    to: `hsl(${hue}, 80%, 84%)`,
    text: `hsl(${hue}, 90%, 25%)`,
    shadowFrom: `hsla(${hue}, 85%, 50%, 0.2)`,
    shadowTo: `hsla(${hue}, 80%, 40%, 0.15)`
  };
};


interface MobileBriefingViewProps {
  studentUser: any;
  briefingData: any;
  scheduleOccurrences: any[];
  progressItems: any[];
  currentXp: number;
  wrappedData: any;
  avatar: any;
  setActiveTab: (tab: string) => void;
  setAppointmentChatData: (data: any) => void;
  setShowAppointmentChat: (show: boolean) => void;
  handleRejectReschedule: (occ: any) => Promise<void>;
  handleConfirmReschedule: (occId: string) => Promise<void>;
  handleAcknowledgeCancellation: (occId: string) => Promise<void>;
  getISOWeek: (date?: string | Date) => string;
  handleTabChangeLocal: (tab: string) => void;
  campusFeedAnnouncements: any[];
  songStats: { assignedCount: number; masteredCount: number };
  occurrencesWithMessages: string[];
  setShowRulesModal: (show: boolean) => void;
  lehrwerke: any[];
  localProgress: any[];
  studentId: string;
  studentFeedTab: 'campus' | 'class';
  setStudentFeedTab: React.Dispatch<React.SetStateAction<'campus' | 'class'>>;
  classFeedPosts: any[];
  classFeedInteractions: any[];
  handleSubmitClassFeedInteraction: (postId: string, type: 'poll_vote' | 'quiz_answer', selectedOption: number, isCorrect?: boolean) => Promise<void>;
  feedInteractions: any[];
  handleReactToPost: (postId: string, emoji: string) => Promise<void>;
}

function MobileBriefingView({
  studentUser,
  briefingData,
  scheduleOccurrences,
  progressItems,
  currentXp,
  wrappedData,
  avatar,
  setActiveTab,
  setAppointmentChatData,
  setShowAppointmentChat,
  handleRejectReschedule,
  handleConfirmReschedule,
  handleAcknowledgeCancellation,
  getISOWeek,
  handleTabChangeLocal,
  campusFeedAnnouncements,
  songStats,
  occurrencesWithMessages,
  setShowRulesModal,
  lehrwerke,
  localProgress,
  studentId,
  studentFeedTab,
  setStudentFeedTab,
  classFeedPosts,
  classFeedInteractions,
  handleSubmitClassFeedInteraction,
  feedInteractions,
  handleReactToPost
}: MobileBriefingViewProps) {
  const campusSettings = studentUser?.schools?.opening_hours?.campus_settings || {};
  const flamesActive = campusSettings.flames_active !== false;
  const xpActive = campusSettings.xp_active !== false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '12px 0px' }}>
      
      {/* TOP WELCOME CARD - BEGRÜSSUNGSWIDGET */}
      <style>{`
        .welcome-card-container {
          display: flex;
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          border: 1px solid rgba(0,0,0,0.04);
          position: relative;
        }
        .welcome-card-image-wrapper {
          width: 140px;
          min-height: 100%;
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
          border-right: 1px solid rgba(0,0,0,0.04);
        }
        .welcome-card-content {
          flex: 1;
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-width: 0;
        }
        @media (max-width: 500px) {
          .welcome-card-image-wrapper {
            width: 90px;
          }
          .welcome-card-content {
            padding: 12px 14px;
            gap: 8px;
          }
        }
      `}</style>

      <div className="welcome-card-container">
        <div className="welcome-card-image-wrapper">
          <img 
            src={
              studentUser?.role === 'admin' || studentUser?.role === 'secretary'
                ? '/campus_login_hero.png'
                : getInstrumentAvatarUrl(studentUser?.resolved_instrument || studentUser?.instrument)
            } 
            alt="Instrument Avatar"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/campus_login_hero.png';
            }}
          />
        </div>
        <div className="welcome-card-content">
          {/* Status badge row */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '5px', 
              background: '#f8fafc', 
              border: '1px solid #e2e8f0', 
              padding: '3px 9px', 
              borderRadius: '30px', 
              fontSize: '0.68rem', 
              fontWeight: 800,
              color: '#475569' 
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34a853', display: 'inline-block' }}></span>
              <span>{new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} UHR</span>
            </div>
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '4px', 
              background: '#e0e7ff', 
              padding: '3px 9px', 
              borderRadius: '30px', 
              fontSize: '0.68rem', 
              fontWeight: 850,
              color: '#4f46e5' 
            }}>
              <span>BEREIT ZUM JAMMEN ⚡</span>
            </div>
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 900, margin: 0, color: '#1e293b', fontFamily: "'Urbanist', sans-serif" }}>
            Willkommen zurück, {studentUser?.first_name || ''}! 👋
          </h2>

          <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.45, margin: 0, fontWeight: 550 }}>
            Ein neuer Moment für Musik. Nimm dir heute ein paar Minuten für deine Übungsziele und sichere dir deine tägliche Serie!
          </p>

          {briefingData?.todayLesson || scheduleOccurrences?.length > 0 ? (() => {
            const nextOcc = scheduleOccurrences[0];
            const hasToday = !!briefingData?.todayLesson;
            
            const teacherId = hasToday ? briefingData.todayLesson.teacher_id : nextOcc?.teacher_id;
            const timeLabel = hasToday ? briefingData.todayLesson.time : nextOcc?.start_time?.substring(0, 5);
            
            const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
            const todayStr = new Date().toISOString().split('T')[0];
            
            const targetDateStr = hasToday ? todayStr : nextOcc?.date;
            const targetDayOfWeek = targetDateStr ? DAYS_DE[new Date(targetDateStr).getDay()] : 'Termin';
            const formattedDate = targetDateStr ? new Date(targetDateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : '';
            const label = `${targetDayOfWeek} (${formattedDate}), ${timeLabel} Uhr`;

            const todayOcc = (scheduleOccurrences || []).find(occ => occ.date === todayStr);
            const finalOccurId = hasToday 
              ? (todayOcc?.id || briefingData?.todayLesson?.id || `today-${teacherId}-${todayStr}`) 
              : nextOcc?.id;

            const lessonText = hasToday 
              ? `Heute, ${briefingData.todayLesson.time} Uhr` 
              : (() => {
                  if(!nextOcc) return 'Demnächst';
                  const d = new Date(nextOcc.date);
                  return `${d.toLocaleDateString('de-DE', {weekday: 'short', day: '2-digit', month: '2-digit'})} - ${nextOcc.start_time?.substring(0,5)} Uhr`;
                })();

            const activePlat = (typeof window !== 'undefined' ? localStorage.getItem('groovelab_active_platform') : 'groovelab') || 'groovelab';
            const isGroove = activePlat === 'groovelab';
            const cardBg = isGroove ? '#fefce8' : '#e6f4ea';
            const cardBorder = isGroove ? 'rgba(234, 179, 8, 0.1)' : 'rgba(52, 168, 83, 0.1)';
            const cardColor = isGroove ? '#ca8a04' : '#34a853';

            return (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                gap: '12px', 
                background: cardBg, 
                padding: '8px 12px', 
                borderRadius: '8px', 
                border: `1px solid ${cardBorder}`,
                marginTop: '4px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: cardColor, fontSize: '0.74rem', fontWeight: 800 }}>
                  <Calendar size={12} color={cardColor} />
                  <span>Nächster Unterricht: {lessonText}</span>
                </div>

                {teacherId && (() => {
                  const hasMessage = finalOccurId && occurrencesWithMessages.includes(finalOccurId);
                  return (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setAppointmentChatData({
                          teacherId,
                          date: targetDateStr,
                          start_time: timeLabel,
                          label,
                          occurrenceId: finalOccurId
                        });
                        setShowAppointmentChat(true);
                      }}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        background: hasMessage ? '#fef3c7' : '#dbeafe', 
                        color: hasMessage ? '#d97706' : '#1e40af', 
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        flexShrink: 0
                      }}
                    >
                      <MessageSquare size={12} fill={hasMessage ? 'currentColor' : 'none'} />
                    </button>
                  );
                })()}
              </div>
            );
          })() : (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              background: '#e6f4ea', 
              padding: '8px 12px', 
              borderRadius: '8px', 
              border: '1px solid rgba(52, 168, 83, 0.1)',
              color: '#34a853', 
              fontSize: '0.74rem', 
              fontWeight: 800,
              marginTop: '4px'
            }}>
              <Calendar size={12} color="#34a853" />
              <span>Nächster Unterricht: Demnächst</span>
            </div>
          )}
        </div>
      </div>

      {/* RESPONSIVE GRID FOR KPIs */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', padding: '0 12px', width: '100%' }} className="kpi-row-container">
        {/* XP Kachel */}
        {xpActive && (
          <div style={{ flex: '1 1 0px', minWidth: 0, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', borderRadius: '20px', color: 'white', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.08)' }} className="kpi-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.03em' }} className="kpi-card-title">XP</span>
              <Star size={15} fill="currentColor" />
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: "'Urbanist', sans-serif" }} className="kpi-card-value">{currentXp || 0} XP</span>
          </div>
        )}
        
        {/* Songs Kachel */}
        <div style={{ flex: '1 1 0px', minWidth: 0, background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)', borderRadius: '20px', color: 'white', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 4px 12px rgba(52, 168, 83, 0.08)' }} className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.03em' }} className="kpi-card-title">Songs</span>
            <Award size={15} />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: "'Urbanist', sans-serif" }} className="kpi-card-value">{songStats.masteredCount} / {songStats.assignedCount}</span>
        </div>

        {/* Fokus Kachel */}
        <div style={{ flex: '1 1 0px', minWidth: 0, background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)', borderRadius: '20px', color: 'white', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 4px 12px rgba(234, 179, 8, 0.08)' }} className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.03em' }} className="kpi-card-title">Fokus</span>
            <Clock size={15} />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: "'Urbanist', sans-serif" }} className="kpi-card-value">{wrappedData?.monthlyFlashback?.focusMinutes || 0} Min</span>
        </div>

        {/* Streak Kachel */}
        {flamesActive && (
          <div style={{ flex: '1 1 0px', minWidth: 0, background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', borderRadius: '20px', color: 'white', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)' }} className="kpi-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.03em' }} className="kpi-card-title">Streak</span>
              <Flame size={15} />
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: "'Urbanist', sans-serif" }} className="kpi-card-value">{avatar?.streak_flame || 0} Tage</span>
          </div>
        )}
      </div>

      {/* RESPONSIVE PRACTICE HUB FOR MOBILE & TABLETS */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '20px',
        alignItems: 'stretch'
      }}>
        {/* Widget 1: Hausaufgaben */}
        <div style={{ background: '#ffffff', borderRadius: '0px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: 'none', borderTop: '1px solid rgba(0, 0, 0, 0.04)', borderBottom: '1px solid rgba(0, 0, 0, 0.04)' }}>
          {(() => {


            const latestItem = progressItems.find(item => item.is_current_homework || item.topic_name.startsWith('Hausaufgabe KW '));
            const latestWeek = latestItem ? getItemWeek(latestItem) : getISOWeek();

            const activeHWs = progressItems.filter(item => {
              if (item.topic_name.includes(' - Seite ')) {
                // Must be from the current week!
                if (!item.updated_at || getISOWeek(item.updated_at) !== latestWeek) {
                  return false;
                }
                const parts = item.topic_name.split(' - Seite ');
                const bookTitle = parts[0].trim();
                const pageNum = parseInt(parts[1], 10);
                const book = lehrwerke.find(g => g.title === bookTitle);
                if (book) {
                  const assignment = localProgress.find((p: any) => String(p.studentId) === String(studentId) && String(p.lehrwerkId) === String(book.id));
                  const pageState = assignment?.pageStates?.[pageNum];
                  return pageState?.status === 'homework';
                }
              }
              return item.is_current_homework && !item.topic_name.startsWith('Hausaufgabe KW ');
            });
            const activeTheories = progressItems.filter(item => {
              if (item.topic_name.includes(' - Seite ')) {
                // Must be from the current week!
                if (!item.updated_at || getISOWeek(item.updated_at) !== latestWeek) {
                  return false;
                }
                const parts = item.topic_name.split(' - Seite ');
                const bookTitle = parts[0].trim();
                const pageNum = parseInt(parts[1], 10);
                const book = lehrwerke.find(g => g.title === bookTitle);
                if (book) {
                  const assignment = localProgress.find((p: any) => String(p.studentId) === String(studentId) && String(p.lehrwerkId) === String(book.id));
                  const pageState = assignment?.pageStates?.[pageNum];
                  return pageState?.status === 'purple';
                }
              }
              return item.status === 'THEORY_DONE' && 
                item.updated_at && 
                getItemWeek(item) === latestWeek &&
                !item.topic_name.startsWith('Hausaufgabe KW ');
            });
            const allActive = [...activeHWs, ...activeTheories];

            const getHomeworkNotes = (): string[] => {
              const notes: string[] = [];
              const weekItems = progressItems.filter(item => getItemWeek(item) === latestWeek);
              for (const item of weekItems) {
                if (item.homework_notes && item.homework_notes.trim()) {
                  try {
                    const raw = item.homework_notes;
                    if (raw.startsWith('[') && raw.endsWith(']')) {
                      const parsed = JSON.parse(raw);
                      if (Array.isArray(parsed)) {
                        parsed.forEach((n: string) => {
                          if (n && n.trim() && !notes.includes(n.trim())) {
                            notes.push(n.trim());
                          }
                        });
                      }
                    } else {
                      const lines = raw
                        .split('\n')
                        .filter((line: string) => !line.trim().startsWith('• 📖') && !line.trim().startsWith('• 🎵') && !line.trim().startsWith('• 🗑️'))
                        .map((l: string) => l.trim())
                        .filter(Boolean);
                      lines.forEach((l: string) => {
                        if (l && !notes.includes(l)) {
                          notes.push(l);
                        }
                      });
                    }
                  } catch (e) {
                    console.error(e);
                  }
                }
              }
              return notes;
            };
            const notesList = getHomeworkNotes();
            const totalItemsCount = allActive.length + notesList.length;

            if (totalItemsCount === 0) {
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookOpen size={16} color="#34a853" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>Hausaufgaben</span>
                  </div>
                  <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>
                    Keine aktuellen Hausaufgaben erfasst ✨
                  </div>
                </div>
              );
            }

            const formatPageNumbers = (pages: number[]): string => {
              if (pages.length === 0) return '';
              const sorted = [...pages].sort((a, b) => a - b);
              const ranges: string[] = [];
              let start = sorted[0];
              let end = start;
              
              for (let i = 1; i < sorted.length; i++) {
                if (sorted[i] === end + 1) {
                  end = sorted[i];
                } else {
                  if (start === end) ranges.push(`${start}`);
                  else ranges.push(`${start}–${end}`);
                  start = sorted[i];
                  end = start;
                }
              }
              if (start === end) ranges.push(`${start}`);
              else ranges.push(`${start}–${end}`);
              
              if (ranges.length === 1) return `S. ${ranges[0]}`;
              const last = ranges.pop();
              return `S. ${ranges.join(', ')} & ${last}`;
            };

            const groupedLehrwerke: Record<string, { pages: { num: number; notes: string; status: string; id: string }[] }> = {};
            const otherHWs: any[] = [];

            allActive.forEach(item => {
              if (item.topic_name.includes(' - Seite ')) {
                const parts = item.topic_name.split(' - Seite ');
                const bookTitle = parts[0].trim();
                const pageNum = parseInt(parts[1], 10);
                
                if (!groupedLehrwerke[bookTitle]) {
                  groupedLehrwerke[bookTitle] = { pages: [] };
                }
                if (!isNaN(pageNum) && !groupedLehrwerke[bookTitle].pages.some(p => p.num === pageNum)) {
                  groupedLehrwerke[bookTitle].pages.push({
                    num: pageNum,
                    notes: item.teacher_notes || '',
                    status: item.status,
                    id: item.id
                  });
                }
              } else {
                otherHWs.push(item);
              }
            });

            Object.keys(groupedLehrwerke).forEach(title => {
              groupedLehrwerke[title].pages.sort((a, b) => a.num - b.num);
            });

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={16} color="#34a853" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>Hausaufgaben ({totalItemsCount})</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
                  {Object.entries(groupedLehrwerke).map(([title, info]) => {
                    const pageNums = info.pages.map(p => p.num);
                    const formattedPages = formatPageNumbers(pageNums);
                    
                    const textNotes = info.pages
                      .map(p => p.notes)
                      .filter(Boolean)
                      .filter(n => n !== 'Inhalte in der Premium-Version freischalten' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:'))
                      .join('; ');

                    return (
                      <div key={title} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          <span style={{ fontSize: '1rem', flexShrink: 0 }}>📖</span>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{title}</div>
                            <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 650, marginTop: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                              <strong>{formattedPages}</strong>
                              {textNotes ? ` • ${textNotes}` : ''}
                            </div>
                          </div>
                        </div>
                        <div style={{ background: '#e6f4ea', color: '#34a853', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Check size={12} strokeWidth={3} />
                        </div>
                      </div>
                    );
                  })}

                  {otherHWs.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b' }}>🎵 Songs & Projekte</div>
                      {otherHWs.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: '12px' }}>
                          <span style={{ fontSize: '0.75rem', color: '#334155', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.topic_name} {item.teacher_notes ? ` - ${item.teacher_notes}` : ''}
                          </span>
                          <div style={{ background: '#e6f4ea', color: '#34a853', borderRadius: '4px', padding: '2px 4px', flexShrink: 0 }}>
                            <Check size={10} strokeWidth={3} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {notesList.length > 0 && (() => {
                    let audioCount = 0;
                    const filteredNotes = notesList.filter((note: string) => !note.startsWith("STICKER:"));
                    if (filteredNotes.length === 0) return null;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                        {filteredNotes.map((note: string, nIdx: number) => {
                          const isAudio = note.startsWith("AUDIO:");
                          if (isAudio) {
                            audioCount++;
                            const parts = note.substring(6).split('|');
                            return (
                              <div key={nIdx} style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
                                <InlineAudioPlayer url={parts[0]} label={parts[3] || `Play-Along #${audioCount}`} />
                              </div>
                            );
                          }
                          return (
                            <div key={nIdx} style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 550, fontStyle: 'italic', background: '#f8fafc', padding: '8px 12px', borderRadius: '12px', borderLeft: '3px solid #3b82f6', lineHeight: '1.3', whiteSpace: 'pre-line' }}>
                              {note}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Widget 2: Tägliche Übezeit */}
        {flamesActive && (
          <div style={{ background: '#ffffff', borderRadius: '0px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px', border: 'none', borderTop: '1px solid rgba(0, 0, 0, 0.04)', borderBottom: '1px solid rgba(0, 0, 0, 0.04)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ background: 'rgba(251, 188, 5, 0.12)', color: '#d97706', width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={14} fill="currentColor" />
                </div>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Dein tägliches Ritual</span>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1e293b' }}>Tägliche Übezeit</div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.35, margin: '4px 0 0 0' }}>
                  Schön, dass du da bist! Lass uns gemeinsam Musik machen. Jede Minute, die du heute übst, stärkt deine Superkräfte am Instrument und bringt dich deinen Zielen ein Stück näher. 🎸✨
                </p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('practice_board')}
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', color: 'white', border: 'none', borderRadius: '12px', padding: '10px 14px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(79, 70, 229, 0.15)' }}>
              🚀 Üben starten
            </button>
          </div>
        )}

        {/* Widget 3: Flammen-Pfad */}
        {flamesActive && (
          <div style={{ background: '#ffffff', borderRadius: '0px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: 'none', borderTop: '1px solid rgba(0, 0, 0, 0.04)', borderBottom: '1px solid rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(() => {
              const streak = avatar?.streak_flame || 0;
              const level = avatar?.evolution_level || 1;
              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Flame size={16} color="#ea580c" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>Flammen-Pfad</span>
                      <button 
                        onClick={() => setShowRulesModal(true)}
                        style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8', transition: 'color 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.color = '#ea580c'}
                        onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
                        title="Spielregeln anzeigen"
                      >
                        <HelpCircle size={13} />
                      </button>
                    </div>
                    <div style={{ 
                      background: streak === 0 ? '#fee2e2' : '#ffedd5', 
                      color: streak === 0 ? '#ef4444' : '#ea580c', 
                      fontSize: '0.68rem', 
                      fontWeight: 800, 
                      padding: '2px 8px', 
                      borderRadius: '100px' 
                    }}>
                      {streak} {streak === 1 ? 'Tag' : 'Tage'}
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', flex: 1, alignItems: 'center' }}>
                    {/* Kleine Flamme */}
                    <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', minHeight: '70px', textAlign: 'center', border: '1px solid rgba(0,0,0,0.02)' }}>
                      <div style={{ color: streak >= 1 ? '#eab308' : '#cbd5e1' }}><Flame size={16} fill={streak >= 1 ? 'currentColor' : 'none'} /></div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: streak >= 1 ? '#854d0e' : '#64748b' }}>Kleine</div>
                      <div style={{ fontSize: '0.55rem', color: '#94a3b8' }}>{level === 3 ? 10 : level === 2 ? 5 : 3} Min</div>
                    </div>
                    {/* Mittlere Flamme */}
                    <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', minHeight: '70px', textAlign: 'center', border: '1px solid rgba(0,0,0,0.02)' }}>
                      <div style={{ color: streak >= 4 ? '#f97316' : '#cbd5e1' }}><Flame size={16} fill={streak >= 4 ? 'currentColor' : 'none'} /></div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: streak >= 4 ? '#9a3412' : '#64748b' }}>Mittlere</div>
                      <div style={{ fontSize: '0.55rem', color: '#94a3b8' }}>{level === 3 ? 15 : level === 2 ? 10 : 5} Min</div>
                    </div>
                    {/* Helden-Feuer */}
                    <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', minHeight: '70px', textAlign: 'center', border: '1px solid rgba(0,0,0,0.02)' }}>
                      <div style={{ color: streak >= 9 ? '#ef4444' : '#cbd5e1' }}><Flame size={16} fill={streak >= 9 ? 'currentColor' : 'none'} /></div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: streak >= 9 ? '#991b1b' : '#64748b' }}>Helden</div>
                      <div style={{ fontSize: '0.55rem', color: '#94a3b8' }}>{level === 3 ? 20 : level === 2 ? 15 : 10} Min</div>
                    </div>
                  </div>
                  {/* Joker indicator */}
                  {(() => {
                    const currentWeek = getISOWeek(new Date());
                    const lastJokerWeek = studentUser?.joker_used_at ? getISOWeek(new Date(studentUser.joker_used_at)) : null;
                    const isJokerAvailable = !studentUser?.joker_used_at || lastJokerWeek !== currentWeek;
                    
                    return (
                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                        <span style={{ color: '#64748b', fontWeight: 650 }}>Wöchentlicher Joker:</span>
                        <span style={{ 
                          color: isJokerAvailable ? '#34a853' : '#ef4444', 
                          fontWeight: 800,
                          background: isJokerAvailable ? '#e6f4ea' : '#fef2f2',
                          padding: '2px 8px',
                          borderRadius: '100px'
                        }}>
                          {isJokerAvailable ? '👍 Bereit' : '❌ Verbraucht'}
                        </span>
                      </div>
                    );
                  })()}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* NÄCHSTE TERMINE TIMELINE */}
      <div style={{ background: '#ffffff', borderRadius: '0px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', borderTop: '1px solid rgba(0,0,0,0.04)', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={16} color="#34a853" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Nächste Termine</h3>
          </div>
          <button onClick={() => handleTabChangeLocal('events')} style={{ background: 'transparent', border: 'none', color: '#34a853', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Alle</button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {(() => {
            const todayStr = new Date().toLocaleDateString('sv-SE');
            const upcomingConfirmed = (scheduleOccurrences || []).filter(occ => 
              (occ.status === 'scheduled' || occ.status === 'rescheduled_confirmed' || occ.status === 'cancelled') && occ.date > todayStr
            );
            if (upcomingConfirmed.length > 0) {
              return upcomingConfirmed.slice(0, 2).map(occ => {
                const d = new Date(occ.date);
                const isCancelled = occ.status === 'cancelled';
                
                if (isCancelled) {
                  return (
                    <div key={occ.id} style={{ display: 'flex', gap: '16px', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                      <div style={{ width: '48px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', textAlign: 'center', flexShrink: 0 }}>
                        <div style={{ background: '#ef4444', color: 'white', fontSize: '0.6rem', fontWeight: 800, padding: '4px 0', textTransform: 'uppercase' }}>{d.toLocaleDateString('de-DE', {month: 'short'})}</div>
                        <div style={{ background: 'white', color: '#1e293b', fontSize: '1.2rem', fontWeight: 900, padding: '6px 0' }}>{d.toLocaleDateString('de-DE', {day: '2-digit'})}</div>
                      </div>
                      
                      <div style={{ 
                        flex: 1, 
                        background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
                        boxShadow: '0 4px 10px rgba(239, 68, 68, 0.1)',
                        borderRadius: '12px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{d.toLocaleDateString('de-DE', {weekday: 'long'})}</span>
                            <span style={{ fontSize: '0.58rem', fontWeight: 900, background: '#000000', color: '#ffffff', padding: '2px 7px', borderRadius: '6px', textTransform: 'uppercase' }}>Ausfall</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600, marginTop: '2px' }}>
                            {occ.start_time?.substring(0,5)} <span style={{ color: '#fee2e2' }}>{occ.schedule?.rooms?.name || 'Groovelab'}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                            const dayLabel = DAYS_DE[new Date(occ.date).getDay()];
                            const formattedDate = new Date(occ.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                            const label = `${dayLabel} (${formattedDate}), ${occ.start_time?.substring(0, 5)} Uhr (Ausfall)`;
                            setAppointmentChatData({
                              teacherId: occ.teacher_id,
                              date: occ.date,
                              start_time: occ.start_time?.substring(0, 5),
                              label,
                              occurrenceId: occ.id
                            });
                            setShowAppointmentChat(true);
                          }}
                          title="Shoutbox öffnen"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: occ.id && occurrencesWithMessages.includes(occ.id) ? '#fef3c7' : 'rgba(255, 255, 255, 0.2)',
                            color: occ.id && occurrencesWithMessages.includes(occ.id) ? '#d97706' : '#ffffff',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            flexShrink: 0
                          }}
                          onMouseOver={e => { e.currentTarget.style.background = occ.id && occurrencesWithMessages.includes(occ.id) ? '#fde68a' : 'rgba(255, 255, 255, 0.3)'; }}
                          onMouseOut={e => { e.currentTarget.style.background = occ.id && occurrencesWithMessages.includes(occ.id) ? '#fef3c7' : 'rgba(255, 255, 255, 0.2)'; }}
                        >
                          <MessageSquare size={14} fill={occ.id && occurrencesWithMessages.includes(occ.id) ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                    </div>
                  );
                }

                const isRescheduled = occ.status === 'rescheduled_confirmed';
                if (isRescheduled) {
                  return (
                    <div key={occ.id} style={{ display: 'flex', gap: '16px', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                      <div style={{ width: '48px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', textAlign: 'center', flexShrink: 0 }}>
                        <div style={{ background: '#eab308', color: 'white', fontSize: '0.6rem', fontWeight: 800, padding: '4px 0', textTransform: 'uppercase' }}>{d.toLocaleDateString('de-DE', {month: 'short'})}</div>
                        <div style={{ background: 'white', color: '#1e293b', fontSize: '1.2rem', fontWeight: 900, padding: '6px 0' }}>{d.toLocaleDateString('de-DE', {day: '2-digit'})}</div>
                      </div>
                      
                      <div style={{ 
                        flex: 1, 
                        background: 'linear-gradient(135deg, #fef08a 0%, #eab308 100%)',
                        boxShadow: '0 4px 10px rgba(234, 179, 8, 0.1)',
                        borderRadius: '12px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#78350f', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{d.toLocaleDateString('de-DE', {weekday: 'long'})}</span>
                            <span style={{ fontSize: '0.58rem', fontWeight: 900, background: '#000000', color: '#ffffff', padding: '2px 7px', borderRadius: '6px', textTransform: 'uppercase' }}>Verschoben</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(120, 53, 15, 0.95)', fontWeight: 600, marginTop: '2px' }}>
                            {occ.start_time?.substring(0,5)} <span style={{ color: '#b45309' }}>{occ.schedule?.rooms?.name || 'Groovelab'}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                            const dayLabel = DAYS_DE[new Date(occ.date).getDay()];
                            const formattedDate = new Date(occ.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                            const label = `${dayLabel} (${formattedDate}), ${occ.start_time?.substring(0, 5)} Uhr (Verschoben)`;
                            setAppointmentChatData({
                              teacherId: occ.teacher_id,
                              date: occ.date,
                              start_time: occ.start_time?.substring(0, 5),
                              label,
                              occurrenceId: occ.id
                            });
                            setShowAppointmentChat(true);
                          }}
                          title="Shoutbox öffnen"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: occ.id && occurrencesWithMessages.includes(occ.id) ? '#f59e0b' : 'rgba(120, 53, 15, 0.12)',
                            color: occ.id && occurrencesWithMessages.includes(occ.id) ? '#ffffff' : '#78350f',
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            flexShrink: 0
                          }}
                          onMouseOver={e => { e.currentTarget.style.background = occ.id && occurrencesWithMessages.includes(occ.id) ? '#d97706' : 'rgba(120, 53, 15, 0.22)'; }}
                          onMouseOut={e => { e.currentTarget.style.background = occ.id && occurrencesWithMessages.includes(occ.id) ? '#f59e0b' : 'rgba(120, 53, 15, 0.12)'; }}
                        >
                          <MessageSquare size={18} fill={occ.id && occurrencesWithMessages.includes(occ.id) ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={occ.id} style={{ display: 'flex', gap: '16px', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                    <div style={{ width: '48px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', textAlign: 'center' }}>
                      <div style={{ background: '#34a853', color: 'white', fontSize: '0.6rem', fontWeight: 800, padding: '4px 0', textTransform: 'uppercase' }}>{d.toLocaleDateString('de-DE', {month: 'short'})}</div>
                      <div style={{ background: 'white', color: '#1e293b', fontSize: '1.2rem', fontWeight: 900, padding: '6px 0' }}>{d.toLocaleDateString('de-DE', {day: '2-digit'})}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{d.toLocaleDateString('de-DE', {weekday: 'long'})}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{occ.start_time?.substring(0,5)} <span style={{ color: '#34a853' }}>{occ.schedule?.rooms?.name || 'Groovelab'}</span></div>
                    </div>
                    <button
                      onClick={() => {
                        const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                        const dayLabel = DAYS_DE[new Date(occ.date).getDay()];
                        const formattedDate = new Date(occ.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                        const label = `${dayLabel} (${formattedDate}), ${occ.start_time?.substring(0, 5)} Uhr`;
                        setAppointmentChatData({
                          teacherId: occ.teacher_id,
                          date: occ.date,
                          start_time: occ.start_time?.substring(0, 5),
                          label,
                          occurrenceId: occ.id
                        });
                        setShowAppointmentChat(true);
                      }}
                      title="Shoutbox öffnen"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: occ.id && occurrencesWithMessages.includes(occ.id) ? '#fef3c7' : '#f1f5f9',
                        color: occ.id && occurrencesWithMessages.includes(occ.id) ? '#d97706' : '#475569',
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        marginLeft: 'auto',
                        flexShrink: 0
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.background = occ.id && occurrencesWithMessages.includes(occ.id) ? '#fde68a' : '#e2e8f0';
                        e.currentTarget.style.color = occ.id && occurrencesWithMessages.includes(occ.id) ? '#d97706' : '#0b57d0';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.background = occ.id && occurrencesWithMessages.includes(occ.id) ? '#fef3c7' : '#f1f5f9';
                        e.currentTarget.style.color = occ.id && occurrencesWithMessages.includes(occ.id) ? '#d97706' : '#475569';
                      }}
                    >
                      <MessageSquare size={18} fill={occ.id && occurrencesWithMessages.includes(occ.id) ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                );
              });
            } else {
              return <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '20px 0' }}>Keine Termine verfügbar.</div>;
            }
          })()}
        </div>
      </div>

      {/* TERMINÄNDERUNGEN MOBILE */}
      {(() => {
        const appointmentChanges = (scheduleOccurrences || []).filter(occ => 
          !occ.student_acknowledged && (
            occ.status === 'pending_reschedule' || 
            occ.status === 'cancelled' || 
            (occ.status === 'scheduled' && occ.original_date && occ.date === occ.original_date)
          )
        );
        if (appointmentChanges.length === 0) return null;
        
        return (
          <div style={{ background: '#ffffff', borderRadius: '0px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: 'none', borderTop: '2px dashed #f59e0b', borderBottom: '2px dashed #f59e0b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
              <Calendar size={16} color="#f59e0b" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Terminänderungen</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {appointmentChanges.map(occ => {
                const d = new Date(occ.date);
                const isReschedule = occ.status === 'pending_reschedule';
                const isCancelled = occ.status === 'cancelled';
                const isRegularReset = occ.status === 'scheduled' && occ.original_date && occ.date === occ.original_date;
                
                let cardBg = '#fef2f2';
                let cardBorder = '#fecaca';
                let badgeText = '❌ Abgesagt';
                let badgeColor = '#991b1b';
                
                if (isReschedule) {
                  cardBg = '#fffbeb';
                  cardBorder = '#fef08a';
                  badgeText = '🔄 Verschiebung';
                  badgeColor = '#854d0e';
                } else if (isRegularReset) {
                  cardBg = '#e6f4ea';
                  cardBorder = '#e6f4ea';
                  badgeText = '❇️ Wieder regulär';
                  badgeColor = '#34a853';
                }
                
                return (
                  <div key={occ.id} style={{ padding: '12px', borderRadius: '16px', background: cardBg, border: `1.5px solid ${cardBorder}`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: badgeColor, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '2px' }}>
                        {badgeText}
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>
                        {d.toLocaleDateString('de-DE', {weekday: 'short', day: '2-digit', month: '2-digit'})}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                        {occ.start_time?.substring(0,5)} Uhr
                      </div>
                      {(occ.status === 'scheduled' && occ.original_date && occ.date === occ.original_date) && (
                        <div style={{ fontSize: '0.7rem', color: '#34a853', fontWeight: 500, marginTop: '4px', lineHeight: '1.2' }}>
                          Dieser Termin wurde wieder auf die ursprüngliche reguläre Zeit zurückgesetzt. Bitte bestätige, dass du dies gesehen hast.
                        </div>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                      {isReschedule ? (
                        <>
                          <button 
                            onClick={() => handleRejectReschedule(occ)}
                            style={{ background: '#ef4444', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '44px', minWidth: '70px', boxShadow: '0 2px 8px rgba(239, 68, 68, 0.15)' }}
                          >
                            Nein
                          </button>
                          <button 
                            onClick={() => handleConfirmReschedule(occ.id)}
                            style={{ background: '#eab308', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '44px', minWidth: '70px', boxShadow: '0 2px 8px rgba(234, 179, 8, 0.15)' }}
                          >
                            Ja
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => handleAcknowledgeCancellation(occ.id)}
                          style={{ background: isRegularReset ? '#34a853' : '#ef4444', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '44px', minWidth: '70px', boxShadow: isRegularReset ? '0 2px 8px rgba(16, 181, 129, 0.15)' : '0 2px 8px rgba(239, 68, 68, 0.15)' }}
                        >
                          Ok
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* LIVE CAMPUS FEED MOBILE */}
      <div style={{ 
        background: '#ffffff', 
        borderRadius: '24px', 
        padding: '24px', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Sparkles size={18} color="#34a853" />
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mitteilungen</h3>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
          <button
            onClick={() => setStudentFeedTab('campus')}
            style={{
              flex: 1,
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              background: studentFeedTab === 'campus' ? '#ffffff' : 'transparent',
              color: studentFeedTab === 'campus' ? '#34a853' : '#64748b',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: studentFeedTab === 'campus' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <School size={16} />
              <span>Campus</span>
            </div>
          </button>
          <button
            onClick={() => setStudentFeedTab('class')}
            style={{
              flex: 1,
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              background: studentFeedTab === 'class' ? '#ffffff' : 'transparent',
              color: studentFeedTab === 'class' ? '#34a853' : '#64748b',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: studentFeedTab === 'class' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Users size={16} />
              <span>Klassen-Feed</span>
            </div>
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {studentFeedTab === 'class' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {classFeedPosts.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px 0', textAlign: 'center', opacity: 0.6 }}>
                  <Sparkles size={24} color="#94a3b8" style={{ strokeWidth: 1.5 }} />
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                    Keine Beiträge in deinem Klassen-Feed.
                  </span>
                </div>
              ) : (
                classFeedPosts.map((post) => {
                  const myInteraction = classFeedInteractions.find(i => i.post_id === post.id && i.user_id === studentId);
                  const isAnswered = !!myInteraction;

                  let typeLabel = 'Mitteilung';
                  let typeBg = '#e6f4ea';
                  let typeColor = '#34a853';
                  if (post.post_type === 'homework') {
                    typeLabel = 'Hausaufgabe';
                    typeBg = '#fef3c7';
                    typeColor = '#b45309';
                  } else if (post.post_type === 'poll') {
                    typeLabel = 'Umfrage';
                    typeBg = '#e0f2fe';
                    typeColor = '#0369a1';
                  } else if (post.post_type === 'quiz') {
                    typeLabel = 'Quiz';
                    typeBg = '#f3e8ff';
                    typeColor = '#6b21a8';
                  }

                  return (
                    <div key={post.id} style={{
                      paddingBottom: '16px',
                      borderBottom: '1px solid #f1f5f9',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '9px', fontWeight: 800, color: typeColor, background: typeBg, padding: '2px 8px', borderRadius: '100px', textTransform: 'uppercase' }}>
                          {typeLabel}
                        </span>
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 650 }}>
                          {new Date(post.created_at).toLocaleDateString('de-DE')}
                        </span>
                      </div>

                      <h5 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                        {post.title}
                      </h5>
                      <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, fontWeight: 500, lineHeight: 1.4 }}>
                        {post.content}
                      </p>

                      {post.attachment_url && (
                        <div style={{ marginTop: '4px' }}>
                          {post.attachment_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                            <a href={post.attachment_url} target="_blank" rel="noreferrer">
                              <img src={post.attachment_url} alt="Anhang" style={{ maxWidth: '100%', maxHeight: '100px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                            </a>
                          ) : (
                            <a href={post.attachment_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#34a853', textDecoration: 'none', fontWeight: 650 }}>
                              📄 Dokument öffnen
                            </a>
                          )}
                        </div>
                      )}

                      {/* Interactive Poll / Quiz options */}
                      {(post.post_type === 'quiz' || post.post_type === 'poll') && post.quiz_data && (
                        <div style={{ marginTop: '8px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                            {post.quiz_data.question}
                          </span>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {Array.isArray(post.quiz_data.options) && post.quiz_data.options.map((opt: string, oIdx: number) => {
                              const isSelectedByMe = myInteraction?.selected_option === oIdx;
                              const isCorrectOption = post.post_type === 'quiz' && post.quiz_data.correctAnswer === oIdx;

                              let btnBg = 'white';
                              let btnBorder = '#cbd5e1';
                              let btnColor = '#1e293b';

                              if (isAnswered) {
                                if (post.post_type === 'quiz') {
                                  if (isCorrectOption) {
                                    btnBg = '#e6f4ea';
                                    btnBorder = '#34a853';
                                    btnColor = '#34a853';
                                  } else if (isSelectedByMe) {
                                    btnBg = '#fce8e6';
                                    btnBorder = '#ea4335';
                                    btnColor = '#ea4335';
                                  }
                                } else {
                                  if (isSelectedByMe) {
                                    btnBg = '#e0f2fe';
                                    btnBorder = '#0369a1';
                                    btnColor = '#0369a1';
                                  }
                                }
                              }

                              return (
                                <button
                                  key={oIdx}
                                  disabled={isAnswered}
                                  onClick={() => {
                                    if (post.post_type === 'quiz') {
                                      handleSubmitClassFeedInteraction(post.id, 'quiz_answer', oIdx, oIdx === post.quiz_data.correctAnswer);
                                    } else {
                                      handleSubmitClassFeedInteraction(post.id, 'poll_vote', oIdx);
                                    }
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    background: btnBg,
                                    border: `1.5px solid ${btnBorder}`,
                                    color: btnColor,
                                    fontSize: '0.78rem',
                                    fontWeight: isSelectedByMe || isCorrectOption ? 700 : 500,
                                    textAlign: 'left',
                                    cursor: isAnswered ? 'default' : 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}
                                >
                                  <span>{opt}</span>
                                  {isAnswered && (
                                    <span>
                                      {post.post_type === 'quiz' ? (
                                        isCorrectOption ? '✓ Richtig' : (isSelectedByMe ? '✗ Falsch' : '')
                                      ) : (
                                        isSelectedByMe ? '✓ Gewählt' : ''
                                      )}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            campusFeedAnnouncements.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px 0', textAlign: 'center', opacity: 0.6 }}>
                <Sparkles size={24} color="#94a3b8" style={{ strokeWidth: 1.5 }} />
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                  Keine aktuellen Campus-Mitteilungen vorhanden.
                </span>
              </div>
            ) : (
              campusFeedAnnouncements.slice(0, 5).map((item, idx, arr) => {
                const postReactions = feedInteractions.filter(i => i.post_id === item.id);
                const thumbsUpCount = postReactions.filter(i => i.emoji_unicode === '👍').length;
                const heartCount = postReactions.filter(i => i.emoji_unicode === '❤️').length;
                const userHasThumbsUp = postReactions.some(i => i.emoji_unicode === '👍' && i.user_id === studentId);
                const userHasHeart = postReactions.some(i => i.emoji_unicode === '❤️' && i.user_id === studentId);

                let categoryLabel = 'Info';
                let categoryBg = '#f1f5f9';
                let categoryColor = '#475569';
                if (item.category === 'announcement') {
                  categoryLabel = 'Ankündigung';
                } else if (item.category === 'event') {
                  categoryLabel = 'Event';
                } else if (item.category === 'holidays') {
                  categoryLabel = 'Ferien';
                }

                if (item.is_emergency) {
                  categoryColor = '#b91c1c';
                  categoryBg = '#fce8e6';
                }

                return (
                  <div key={item.id} style={{
                    paddingBottom: idx === arr.length - 1 ? '0' : '16px',
                    borderBottom: idx === arr.length - 1 ? 'none' : '1px solid #f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{
                          fontSize: '9px',
                          fontWeight: 800,
                          color: '#475569',
                          background: '#f1f5f9',
                          padding: '2px 8px',
                          borderRadius: '100px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}>
                          {item.target_type === 'all' ? 'Alle' : item.target_type === 'teachers' ? 'Lehrer' : item.target_type === 'students' ? 'Schüler' : 'Mitteilung'}
                        </span>
                        <span style={{
                          fontSize: '9px',
                          fontWeight: 800,
                          color: categoryColor,
                          background: categoryBg,
                          padding: '2px 8px',
                          borderRadius: '100px',
                          textTransform: 'uppercase',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}>
                          {item.is_emergency && <AlertTriangle size={9} color="#b91c1c" />}
                          {categoryLabel}
                        </span>
                      </div>
                      <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 650 }}>
                        {new Date(item.created_at).toLocaleDateString('de-DE')}
                      </span>
                    </div>
                    
                    <h5 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                      {item.title}
                    </h5>
                    
                    <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, fontWeight: 500, lineHeight: 1.4 }}>
                      {item.content}
                    </p>

                    {item.attachment_url && (
                      <div style={{ marginTop: '4px' }}>
                        {item.attachment_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                          <a href={item.attachment_url} target="_blank" rel="noreferrer">
                            <img 
                              src={item.attachment_url} 
                              alt="Anhang" 
                              style={{ maxWidth: '100%', maxHeight: '100px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            />
                          </a>
                        ) : (
                          <a 
                            href={item.attachment_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#34a853', textDecoration: 'none', fontWeight: 650 }}
                          >
                            📄 Dokument öffnen
                          </a>
                        )}
                      </div>
                    )}

                    {/* Monochrome Emoji Reactions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <button 
                        onClick={() => handleReactToPost(item.id, '👍')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: userHasThumbsUp ? '#e6f4ea' : 'transparent',
                          border: '1px solid',
                          borderColor: userHasThumbsUp ? '#34a853' : '#e2e8f0',
                          color: userHasThumbsUp ? '#34a853' : '#64748b',
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <ThumbsUp size={11} color={userHasThumbsUp ? '#34a853' : '#64748b'} />
                        <span>{thumbsUpCount}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      </div>

    </div>
  );
}

const sanitizeTextInput = (val: string | null | undefined): string => {
  if (!val) return '';
  return val.replace(/<[^>]*>/g, '').trim();
};

// ─── Student Billing & Invoices Subcomponent ───────────────────────────────────
interface StudentBillingInvoicesSectionProps {
  studentUser: any;
  studentId: string;
}

function StudentBillingInvoicesSection({ studentUser, studentId }: StudentBillingInvoicesSectionProps) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [operatorDetails, setOperatorDetails] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const lastFetchRef = useRef<number>(0);
  const invoicesLoadedRef = useRef<boolean>(false);

  useEffect(() => {
    const fetchBillingData = async () => {
      const nowMs = Date.now();
      if (nowMs - lastFetchRef.current < 5000) {
        return;
      }
      lastFetchRef.current = nowMs;

      try {
        if (!invoicesLoadedRef.current) {
          setLoading(true);
        }
        // Load master billing operator settings (IBAN, BIC, Company Name etc.)
        const { data: billingSettings } = await supabase
          .from('master_billing_settings')
          .select('*')
          .eq('id', 1)
          .maybeSingle();

        setOperatorDetails({
          companyName: billingSettings?.company_name || 'Patrick Huber (Einzelunternehmer)',
          iban: billingSettings?.iban || 'DE89 3704 0044 0532 9482 11',
          bic: billingSettings?.bic || 'WELADED1XYZ'
        });

        // Query invoices. Direct student payment invoices are generated with school_id, type = 'AKT'
        // We filter items where metadata/student_id or schoolStudentLevy applies to this student.
        // As a robust client-side simulation fallback, we load invoices for the school and filter,
        // or check if there is an invoice matching CG-[studentId].
        const { data: invoiceList, error: invError } = await supabase
          .from('invoices')
          .select('*')
          .eq('school_id', studentUser.school_id)
          .order('billing_date', { ascending: false });

        if (invError) throw invError;

        // Parse & filter invoices related to this student
        // When parent pays, it generates an invoice containing items for that student.
        // Let's filter invoices that are marked as student billing, or where the ID contains the studentId,
        // or if they are type 'AKT' and either contain items for this student or were paid by this student.
        const studentInvoices = (invoiceList || []).filter((inv: any) => {
          // If invoice is explicitly dedicated to this student via items or metadata
          const matchesStudent = inv.id?.includes(studentId.slice(0, 8)) || 
                                 JSON.stringify(inv.items || {}).includes(studentId) ||
                                 JSON.stringify(inv.items || {}).toLowerCase().includes((studentUser.first_name || '').toLowerCase());
          
          // Or if billing_payer is student, and this is an activation invoice
          const isStudentInvoiceType = inv.type === 'AKT' || inv.type === 'INF';
          
          return matchesStudent;
        });

        // If no database invoice exists yet, but the user is active, we generate a virtual one
        // to match the legal mock activation flow.
        if (studentInvoices.length === 0 && studentUser.is_campus_active) {
          const actDate = studentUser.activated_at ? new Date(studentUser.activated_at) : new Date(studentUser.created_at || Date.now());
          const m = actDate.getMonth() + 1;
          const y = actDate.getFullYear();
          const yearShort = String(y).slice(-2);
          const monthStr = m < 10 ? `0${m}` : `${m}`;
          
          const monthsMapLocal: Record<number, number> = {
            9: 12, 10: 11, 11: 10, 12: 9, 1: 8, 2: 7, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1
          };
          const restmonate = monthsMapLocal[m] !== undefined ? monthsMapLocal[m] : 12;
          
          // Pricing options
          const billingOption = studentUser.schools?.opening_hours?.campus_settings?.studentBillingOption || 'student_full';
          const studentFee = billingOption === 'student_partial' ? 0.09 : 0.49;
          const totalAmount = restmonate * studentFee;

          studentInvoices.push({
            id: `CG-${studentId.slice(0, 8).toUpperCase()}-${yearShort}${monthStr}`,
            type: 'AKT',
            amount: totalAmount,
            status: 'paid',
            billing_date: actDate.toISOString().split('T')[0],
            due_date: new Date(actDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            items: [
              {
                name: `Rest-Schuljahrespauschale Infrastruktur- & Servicegebühren (${restmonate} Monate)`,
                quantity: 1,
                unit: 'Profil',
                unitPrice: totalAmount,
                amount: totalAmount
              }
            ]
          });
        }

        setInvoices(studentInvoices);
        invoicesLoadedRef.current = true;
      } catch (err) {
        console.error('Error fetching student invoices:', err);
      } finally {
        setLoading(false);
      }
    };

    if (studentUser) {
      fetchBillingData();
    }
  }, [studentId, studentUser]);

  if (loading) {
    return <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Abrechnungsinformationen werden geladen...</div>;
  }

  return (
    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '24px', marginTop: '24px' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FileText size={18} color="#34a853" /> 3. Abrechnung & Rechnungen
      </h3>
      <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '16px', fontWeight: 600, lineHeight: '1.4' }}>
        Hier findest du die Rechnungen für deine Infrastruktur- & Servicegebühren (Rest-Schuljahrespauschale).
      </p>

      {invoices.length === 0 ? (
        <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '18px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Keine Rechnungen vorhanden. Dein Account läuft momentan über die Testphase oder ein Schulguthaben.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {invoices.map((inv) => (
            <div key={inv.id} style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '18px',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              transition: 'all 0.2s'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.875rem', fontWeight: 800, color: '#1e293b' }}>
                    Rechnung #{inv.id}
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                    Rechnungsdatum: {new Date(inv.billing_date).toLocaleDateString('de-DE')}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{inv.amount.toFixed(2).replace('.', ',')} €</strong>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    textTransform: 'uppercase',
                    background: inv.status === 'paid' || inv.status === 'Bezahlt' ? '#e6f4ea' : '#fee2e2',
                    color: inv.status === 'paid' || inv.status === 'Bezahlt' ? '#34a853' : '#991b1b'
                  }}>
                    {inv.status === 'paid' || inv.status === 'Bezahlt' ? 'Bezahlt' : 'Offen'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedInvoice(inv)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      padding: '6px 12px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      color: '#475569',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    Rechnung anzeigen
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invoice Detail Modal (Popup Mask for Quick View) */}
      {selectedInvoice && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            width: '100%',
            maxWidth: '620px',
            borderRadius: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh',
            overflow: 'hidden',
            fontFamily: "'Outfit', sans-serif"
          }}>
            {/* Header / Title bar */}
            <div style={{
              padding: '20px 28px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                Rechnung #{selectedInvoice.id} - Schnellansicht
              </h3>
              <button 
                type="button"
                onClick={() => setSelectedInvoice(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px',
                  borderRadius: '50%',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable invoice content */}
            <div style={{ padding: '28px', overflowY: 'auto', flex: 1 }}>
              {/* Logo / Header block */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #34a853', paddingBottom: '16px', marginBottom: '24px' }}>
                <div>
                  <h4 style={{ margin: 0, color: '#34a853', fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Campus-Groovelab</h4>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Infrastruktur- &amp; Servicegebühren</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h5 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: 900 }}>RECHNUNG</h5>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold' }}>Nr. {selectedInvoice.id}</span>
                </div>
              </div>

              {/* Addresses */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px', fontSize: '0.82rem', lineHeight: 1.5 }}>
                <div>
                  <span style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 800, display: 'block', marginBottom: '6px', letterSpacing: '0.05em' }}>Vertragspartner &amp; Empfänger</span>
                  <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.9rem' }}>Eltern (als ges. Vertreter)</strong>
                  <span style={{ color: '#475569', display: 'block' }}>Musikschule: {studentUser.schools?.name || 'Mitgliedschule'}</span>
                  <span style={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block', marginTop: '4px', fontStyle: 'italic' }}>Kleinbetragsrechnung gemäß § 33 UStDV</span>
                </div>
                <div>
                  <span style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 800, display: 'block', marginBottom: '6px', letterSpacing: '0.05em' }}>Dienstleister / Betreiber</span>
                  <strong style={{ color: '#34a853', display: 'block', fontSize: '0.9rem' }}>Campus-Groovelab</strong>
                  <strong style={{ color: '#0f172a', display: 'block', fontWeight: 700 }}>{operatorDetails.companyName}</strong>
                  <span style={{ color: '#475569' }}>IBAN: {operatorDetails.iban}</span><br />
                  <span style={{ color: '#475569' }}>BIC: {operatorDetails.bic}</span>
                </div>
              </div>

              {/* Dates */}
              <div style={{ background: '#f8fafc', padding: '14px 20px', borderRadius: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '0.78rem', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Rechnungsdatum</span>
                  <strong style={{ color: '#0f172a' }}>{new Date(selectedInvoice.billing_date).toLocaleDateString('de-DE')}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Fälligkeitsdatum</span>
                  <strong style={{ color: '#0f172a' }}>{new Date(selectedInvoice.due_date).toLocaleDateString('de-DE')}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Zahlungsart</span>
                  <strong style={{ color: '#0f172a' }}>Banküberweisung / Girocode</strong>
                </div>
              </div>

              {/* Positions Table */}
              <div style={{ marginBottom: '24px' }}>
                <h5 style={{ margin: '0 0 10px 0', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Positionen:</h5>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569', fontWeight: 700 }}>
                      <th style={{ padding: '8px 0' }}>Leistungsbeschreibung</th>
                      <th style={{ padding: '8px 0', textAlign: 'right' }}>Menge</th>
                      <th style={{ padding: '8px 0', textAlign: 'right' }}>Einzelpreis</th>
                      <th style={{ padding: '8px 0', textAlign: 'right' }}>Gesamtbetrag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedInvoice.items || []).map((item: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px 0' }}>{item.name}</td>
                        <td style={{ padding: '10px 0', textAlign: 'right' }}>{item.quantity} {item.unit || 'Stück'}</td>
                        <td style={{ padding: '10px 0', textAlign: 'right' }}>{item.unitPrice.toFixed(2).replace('.', ',')} €</td>
                        <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 'bold' }}>{item.amount.toFixed(2).replace('.', ',')} €</td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={2}></td>
                      <td style={{ padding: '16px 0 4px 0', textAlign: 'right', fontWeight: 'bold', fontSize: '0.9rem' }}>Gesamtsumme:</td>
                      <td style={{ padding: '16px 0 4px 0', textAlign: 'right', fontWeight: 900, color: '#34a853', fontSize: '1.05rem' }}>{selectedInvoice.amount.toFixed(2).replace('.', ',')} €</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Payment details box with Girocode QR */}
              <div style={{
                  background: '#faf5ff',
                  border: '1px dashed #d8b4fe',
                  borderRadius: '18px',
                  padding: '18px',
                  fontSize: '0.78rem',
                  color: '#5b21b6',
                  lineHeight: '1.6',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <strong style={{ color: '#4c1d95', fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>Zahlungsinformationen</strong>
                    Überweisen Sie den Betrag bitte unter Angabe des Verwendungszwecks an folgende Bankverbindung:<br />
                    <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', marginTop: '6px', gap: '4px 12px' }}>
                      <strong>Kontoinhaber:</strong> <span>{operatorDetails.companyName}</span>
                      <strong>IBAN:</strong> <span>{operatorDetails.iban}</span>
                      <strong>BIC:</strong> <span>{operatorDetails.bic}</span>
                      <strong>Verwendungszweck:</strong> <strong style={{ color: '#4c1d95' }}>{selectedInvoice.id}</strong>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', background: 'white', padding: '10px', borderRadius: '14px', border: '1px solid #e2e8f0', marginLeft: '16px', flexShrink: 0 }}>
                    <QRCode
                      value={`BCD\n002\n1\nSCT\n${operatorDetails.bic.replace(/\s+/g, '')}\n${operatorDetails.companyName}\n${operatorDetails.iban.replace(/\s+/g, '')}\nEUR${selectedInvoice.amount.toFixed(2)}\n\n\n${selectedInvoice.id}\n`}
                      size={90}
                    />
                    <span style={{ fontSize: '0.55rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginTop: '6px' }}>Girocode</span>
                  </div>
                </div>
              </div>

            {/* Footer with actions */}
            <div style={{
              padding: '16px 28px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              background: '#f8fafc'
            }}>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 20px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  color: '#475569',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
              >
                Schließen
              </button>
              <button
                type="button"
                onClick={() => {
                  // In-page printing via hidden iframe
                  const existingFrame = document.getElementById('invoice-print-frame');
                  if (existingFrame) {
                    document.body.removeChild(existingFrame);
                  }

                  const iframe = document.createElement('iframe');
                  iframe.style.position = 'fixed';
                  iframe.style.right = '0';
                  iframe.style.bottom = '0';
                  iframe.style.width = '0';
                  iframe.style.height = '0';
                  iframe.style.border = 'none';
                  iframe.id = 'invoice-print-frame';
                  document.body.appendChild(iframe);

                  const formattedItems = (selectedInvoice.items || []).map((item: any) => `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                      <td style="padding: 10px 0;">${item.name}</td>
                      <td style="padding: 10px 0; text-align: right;">${item.quantity} ${item.unit || 'Stück'}</td>
                      <td style="padding: 10px 0; text-align: right;">${item.unitPrice.toFixed(2).replace('.', ',')} €</td>
                      <td style="padding: 10px 0; text-align: right; font-weight: bold;">${item.amount.toFixed(2).replace('.', ',')} €</td>
                    </tr>
                  `).join('');

                  const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
                  if (iframeDoc) {
                    iframeDoc.write(`
                      <html>
                        <head>
                          <title>Rechnung #${selectedInvoice.id} - Campus-Groovelab</title>
                          <style>
                            body {
                              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                              color: #1e293b;
                              padding: 40px;
                              line-height: 1.5;
                            }
                            @media print {
                              body { padding: 0; }
                              .no-print { display: none !important; }
                            }
                          </style>
                        </head>
                        <body>
                          <!-- Header -->
                          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #34a853; padding-bottom: 20px; margin-bottom: 30px;">
                            <div>
                              <h2 style="margin: 0; color: #34a853; font-size: 1.8rem; font-weight: 900; letter-spacing: -0.02em;">Campus-Groovelab</h2>
                              <span style="font-size: 0.75rem; color: #64748b;">Infrastruktur- &amp; Servicegebühren</span>
                            </div>
                            <div style="text-align: right;">
                              <h3 style="margin: 0; font-size: 1.1rem; color: #0f172a;">RECHNUNG</h3>
                              <span style="font-size: 0.85rem; color: #64748b; font-weight: bold;">Nr. ${selectedInvoice.id}</span>
                            </div>
                          </div>

                          <!-- Addresses -->
                          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 35px; font-size: 0.85rem;">
                            <div>
                              <span style="color: #64748b; text-transform: uppercase; font-size: 0.7rem; font-weight: 800; display: block; margin-bottom: 8px;">Vertragspartner &amp; Empfänger</span>
                              <strong style="color: #0f172a; display: block; font-size: 1rem;">Eltern (als ges. Vertreter)</strong>
                              <span>Musikschule: ${studentUser.schools?.name || 'Mitgliedschule'}</span><br />
                              <span style="color: #94a3b8; font-size: 0.75rem; display: block; margin-top: 4px; font-style: italic;">Kleinbetragsrechnung gemäß § 33 UStDV</span>
                            </div>
                            <div>
                              <span style="color: #64748b; text-transform: uppercase; font-size: 0.7rem; font-weight: 800; display: block; margin-bottom: 8px;">Dienstleister / Betreiber</span>
                              <strong style="color: #34a853; display: block; font-size: 1rem;">Campus-Groovelab</strong>
                              <strong style="color: #0f172a; display: block; font-weight: 600;">${operatorDetails.companyName}</strong>
                              <span>IBAN: ${operatorDetails.iban}</span><br />
                              <span>BIC: ${operatorDetails.bic}</span>
                            </div>
                          </div>

                          <!-- Dates -->
                          <div style="background: #f8fafc; padding: 16px 20px; border-radius: 12px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; font-size: 0.8rem; margin-bottom: 35px; border: 1px solid #e2e8f0;">
                            <div>
                              <span style="color: #64748b; display: block; margin-bottom: 4px;">Rechnungsdatum</span>
                              <strong style="color: #0f172a;">${new Date(selectedInvoice.billing_date).toLocaleDateString('de-DE')}</strong>
                            </div>
                            <div>
                              <span style="color: #64748b; display: block; margin-bottom: 4px;">Fälligkeitsdatum</span>
                              <strong style="color: #0f172a;">${new Date(selectedInvoice.due_date).toLocaleDateString('de-DE')}</strong>
                            </div>
                            <div>
                              <span style="color: #64748b; display: block; margin-bottom: 4px;">Zahlungsart</span>
                              <strong style="color: #0f172a;">Banküberweisung / Girocode</strong>
                            </div>
                          </div>

                          <!-- Table -->
                          <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-bottom: 40px;">
                            <thead>
                              <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; color: #475569; font-weight: 700;">
                                <th style="padding: 10px 0;">Leistungsbeschreibung</th>
                                <th style="padding: 10px 0; text-align: right;">Menge</th>
                                <th style="padding: 10px 0; text-align: right;">Einzelpreis</th>
                                <th style="padding: 10px 0; text-align: right;">Gesamtbetrag</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${formattedItems}
                              <tr>
                                <td colspan="2"></td>
                                <td style="padding: 20px 0 10px 0; text-align: right; font-weight: bold; font-size: 1rem;">Gesamtsumme:</td>
                                <td style="padding: 20px 0 10px 0; text-align: right; font-weight: 900; font-size: 1.15rem; color: #34a853;">${selectedInvoice.amount.toFixed(2).replace('.', ',')} €</td>
                              </tr>
                            </tbody>
                          </table>

                          <!-- Payment details & bank transfers -->
                          <div style="background: #faf5ff; border: 1px dashed #d8b4fe; border-radius: 16px; padding: 20px; font-size: 0.8rem; color: #5b21b6; line-height: 1.6; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                              <strong style="color: #4c1d95; font-size: 0.9rem; display: block; margin-bottom: 8px;">Zahlungsinformationen</strong>
                              Überweisen Sie den Betrag bitte unter Angabe des Verwendungszwecks an folgende Bankverbindung:<br />
                              <strong>Kontoinhaber:</strong> ${operatorDetails.companyName}<br />
                              <strong>IBAN:</strong> ${operatorDetails.iban}<br />
                              <strong>BIC:</strong> ${operatorDetails.bic}<br />
                              <strong>Verwendungszweck:</strong> <strong style="color: #4c1d95; font-size: 0.95rem;">${selectedInvoice.id}</strong>
                            </div>
                            <div style="text-align: center; background: white; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; margin-left: 20px;">
                              <div id="qrcode-canvas"></div>
                              <span style="font-size: 0.6rem; color: #64748b; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-top: 8px;">Girocode</span>
                            </div>
                          </div>

                          <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
                          <script>
                            const text = \`BCD\\n002\\n1\\nSCT\\n${operatorDetails.bic.replace(/\s+/g, '')}\\n${operatorDetails.companyName}\\n${operatorDetails.iban.replace(/\s+/g, '')}\\nEUR${selectedInvoice.amount.toFixed(2)}\\n\\n\\n${selectedInvoice.id}\\n\`;
                            new QRCode(document.getElementById("qrcode-canvas"), {
                              text: text,
                              width: 100,
                              height: 100,
                              correctLevel: QRCode.CorrectLevel.M
                            });
                          </script>
                        </body>
                      </html>
                    `);
                    iframeDoc.close();

                    setTimeout(() => {
                      if (iframe.contentWindow) {
                        iframe.contentWindow.focus();
                        iframe.contentWindow.print();
                      }
                    }, 800);
                  }
                }}
                style={{
                  background: '#34a853',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 20px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  color: 'white',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#34a853'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#34a853'; }}
              >
                <FileText size={16} /> PDF drucken / speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function StudentAvatarDashboard({ studentId, parentActiveTab, onTabChange, onProfileUpdate }: StudentAvatarDashboardProps) {
  console.log('StudentAvatarDashboard Render:', { activeTab: parentActiveTab, studentId });
  const [studentUser, setStudentUser] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 1024 : false);

  const campusSettings = useMemo(() => {
    return studentUser?.schools?.opening_hours?.campus_settings || {};
  }, [studentUser]);

  const flamesActive = campusSettings.flames_active !== false;
  const xpActive = campusSettings.xp_active !== false;
  const showLeaderboard = campusSettings.show_leaderboard !== false;
  const showDetailedStats = campusSettings.show_detailed_stats !== false;
  const studentToTeacherChat = campusSettings.student_to_teacher_chat !== false;

  const tourSteps: TourStep[] = useMemo(() => {
    return [
      {
        selector: 'tour-student-hero',
        title: 'Dein Profil & Level',
        description: 'Hier siehst du deinen aktuellen Fortschritt, gesammelte XP und deine aktuelle Liga im Campus Cup.'
      },
      {
        selector: 'tour-student-practice',
        title: 'Dein Übungsboard',
        description: 'Verwalte deine Hausaufgaben, starte den Fokus-Timer und erhalte Belohnungen für dein tägliches Üben.'
      },
      {
        selector: 'tour-student-songs',
        title: 'Campus Cup & Meisterwerke',
        description: 'Messe dich mit anderen im Campus Cup, entdecke neue Songs und teile deine aufgenommenen Meisterwerke.'
      }
    ];
  }, []);

  const { TourComponent, startTour } = usePremiumOnboardingTour({
    tourKey: `campus_student_tour_${studentId}`,
    steps: tourSteps,
    platformTheme: 'campus'
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showOwnQr, setShowOwnQr] = useState<boolean>(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [showSecondEmail, setShowSecondEmail] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushNotifScheduleChanges, setPushNotifScheduleChanges] = useState(true);
  const [pushNotifHomework, setPushNotifHomework] = useState(false);
  const [pushNotifAllFeatures, setPushNotifAllFeatures] = useState(false);

  const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isStandalone = typeof window !== 'undefined' && ((window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches);

  const [studentSchedules, setStudentSchedules] = useState<any[]>([]);
  const [avatarCategoryFilter, setAvatarCategoryFilter] = useState<string>('Alle');
  const [settingsSubTab, setSettingsSubTab] = useState<'notifications' | 'billing'>('notifications');

  const [isAppUser, setIsAppUser] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [avatarFromDb, setAvatar] = useState<Avatar | null>(null);
  const avatar = avatarFromDb || {
    avatar_style: 'standard',
    instrument_type: studentUser?.instrument || 'Guitar',
    evolution_level: 1,
    xp: 0,
    asset_path: getInstrumentAvatarUrl(studentUser?.instrument),
    streak_flame: 0
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [timeUntilMidnight, setTimeUntilMidnight] = useState('');
  const [unreadCrisisNotifs, setUnreadCrisisNotifs] = useState<any[]>([]);
  const [confirmingCrisisId, setConfirmingCrisisId] = useState<string | null>(null);

  const getSelectableAvatars = () => {
    if (!editingProfile) return [];
    const assigned = (editingProfile.resolved_instrument || editingProfile.instrument || '')
      .split(',')
      .map((i: string) => i.trim())
      .filter(Boolean);

    const CAMPUS_INSTRUMENT_AVATARS = [
      // Gitarre
      { id: 'inst_gitarre_acoustic', label: 'Gitarre', url: '/avatars/gitarre_avatar_new.png', category: 'Gitarre' },
      { id: 'inst_gitarre_electric', label: 'E-Gitarre', url: '/avatars/egitarre_avatar.png', category: 'Gitarre' },
      
      // Piano
      { id: 'inst_piano_acoustic', label: 'Klavier', url: '/avatars/klavier_avatar_new.png', category: 'Piano' },
      { id: 'inst_piano_electric', label: 'E-Piano', url: '/avatars/piano_avatar.png', category: 'Piano' },
      
      // Drums
      { id: 'inst_drums_acoustic', label: 'Schlagzeug', url: '/avatars/schlagzeug_avatar.png', category: 'Schlagzeug' },
      { id: 'inst_drums_electric', label: 'E-Drums', url: '/avatars/drums_avatar.png', category: 'Schlagzeug' },
      
      // Bass
      { id: 'inst_bass_acoustic', label: 'Kontrabass', url: '/avatars/kontrabass_avatar.png', category: 'Bass' },
      { id: 'inst_bass_electric', label: 'E-Bass', url: '/avatars/ebass_avatar.png', category: 'Bass' },
      
      // Gesang
      { id: 'inst_vocals', label: 'Gesang', url: '/avatars/gesang_avatar.png', category: 'Gesang' }
    ];

    if (assigned.length === 0) {
      const defaultUrl = getInstrumentAvatarUrl('');
      return [{ id: 'default_inst', label: 'Standard-Avatar', url: defaultUrl, category: 'Alle' }];
    }

    const list: Array<{ id: string; label: string; url: string; category?: string }> = [];

    assigned.forEach((inst: string) => {
      const lowerInst = inst.toLowerCase();
      let matchedCategory = '';
      if (lowerInst.includes('guitar') || lowerInst.includes('gitarre')) {
        matchedCategory = 'Gitarre';
      } else if (lowerInst.includes('piano') || lowerInst.includes('klavier') || lowerInst.includes('keyboard') || lowerInst.includes('keys')) {
        matchedCategory = 'Piano';
      } else if (lowerInst.includes('drum') || lowerInst.includes('schlagzeug')) {
        matchedCategory = 'Schlagzeug';
      } else if (lowerInst.includes('bass')) {
        matchedCategory = 'Bass';
      } else if (lowerInst.includes('vocal') || lowerInst.includes('gesang') || lowerInst.includes('stimme') || lowerInst.includes('singer')) {
        matchedCategory = 'Gesang';
      }

      if (matchedCategory) {
        const matching = CAMPUS_INSTRUMENT_AVATARS.filter(av => av.category === matchedCategory);
        list.push(...matching);
      } else {
        const url = getInstrumentAvatarUrl(inst);
        list.push({
          id: `inst_${inst}`,
          label: inst,
          url: url,
          category: inst
        });
      }
    });

    const seen = new Set();
    return list.filter(item => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  };

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0); // Next midnight
      const diffMs = midnight.getTime() - now.getTime();
      if (diffMs <= 0) {
        setTimeUntilMidnight('00:00:00');
        return;
      }
      const diffSecs = Math.floor(diffMs / 1000);
      const hrs = Math.floor(diffSecs / 3600);
      const mins = Math.floor((diffSecs % 3600) / 60);
      const secs = diffSecs % 60;
      setTimeUntilMidnight(`${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Selection Screen State
  const [showSelector, setShowSelector] = useState(false);
  const [submittingSelection, setSubmittingSelection] = useState(false);

  // Daily Briefing State
  const [rawBriefingData, setRawBriefingData] = useState<any>(null);
  const [occurrencesWithMessages, setOccurrencesWithMessages] = useState<string[]>([]);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [rawScheduleOccurrences, setRawScheduleOccurrences] = useState<any[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [rawSchoolYearOccurrences, setRawSchoolYearOccurrences] = useState<any[]>([]);
  const [loadingSchoolYearSchedule, setLoadingSchoolYearSchedule] = useState(false);
  const [appointmentFilter, setAppointmentFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [loadingContributions, setLoadingContributions] = useState(false);
  const [contributionsModalData, setContributionsModalData] = useState<{
    goalTitle: string;
    targetMinutes: number;
    contributions: { name: string; minutes: number }[];
  } | null>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);

  const [holidays, setHolidays] = useState<{ start: string, end: string, name: string }[]>([]);

  const parseICSDate = (icsDateStr: string): Date => {
    const cleanStr = icsDateStr.includes(':') ? icsDateStr.split(':')[1] : icsDateStr;
    const year = parseInt(cleanStr.substring(0, 4));
    const month = parseInt(cleanStr.substring(4, 6)) - 1;
    const day = parseInt(cleanStr.substring(6, 8));

    if (cleanStr.includes('T')) {
      const hour = parseInt(cleanStr.substring(9, 11));
      const min = parseInt(cleanStr.substring(11, 13));
      const sec = parseInt(cleanStr.substring(13, 15));
      return new Date(Date.UTC(year, month, day, hour, min, sec));
    }
    return new Date(year, month, day);
  };

  const parseICS = (icsText: string): any[] => {
    const events: any[] = [];
    const lines = icsText.split(/\r?\n/);
    let currentEvent: any = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === 'BEGIN:VEVENT') {
        currentEvent = {};
      } else if (line === 'END:VEVENT' && currentEvent) {
        if (currentEvent.summary && currentEvent.dtstart) {
          events.push(currentEvent);
        }
        currentEvent = null;
      } else if (currentEvent) {
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
          const key = line.substring(0, colonIdx);
          const value = line.substring(colonIdx + 1);

          if (key.startsWith('SUMMARY')) {
            currentEvent.summary = value;
          } else if (key.startsWith('DESCRIPTION')) {
            currentEvent.description = value.replace(/\\n/g, '\n');
          } else if (key.startsWith('DTSTART')) {
            currentEvent.dtstart = parseICSDate(value);
            currentEvent.isAllDay = !value.includes('T');
          } else if (key.startsWith('DTEND')) {
            currentEvent.dtend = parseICSDate(value);
          } else if (key.startsWith('LOCATION')) {
            currentEvent.location = value;
          }
        }
      }
    }
    return events;
  };

  const loadHolidays = async (url: string) => {
    try {
      const urls = (() => {
        try {
          if (url.startsWith('[')) return JSON.parse(url) as string[];
        } catch (e) {}
        if (url.includes(',')) return url.split(',').map(u => u.trim()).filter(Boolean);
        return [url];
      })();

      let combinedEvents: any[] = [];

      for (const singleUrl of urls) {
        try {
          let text = '';
          try {
            const res = await fetch(singleUrl);
            if (!res.ok) throw new Error();
            text = await res.text();
          } catch (corsErr) {
            const proxies = [
              `https://corsproxy.io/?${singleUrl}`,
              `https://api.allorigins.win/get?url=${encodeURIComponent(singleUrl)}`
            ];

            let success = false;
            for (const proxyUrl of proxies) {
              try {
                const res = await fetch(proxyUrl);
                if (!res.ok) continue;
                if (proxyUrl.includes('allorigins')) {
                  const json = await res.json();
                  text = json.contents;
                } else {
                  text = await res.text();
                }
                if (text && text.includes('BEGIN:VCALENDAR')) {
                  success = true;
                  break;
                }
              } catch (e) {
                console.warn(e);
              }
            }
            if (!success) continue;
          }

          if (text) {
            const parsedSingle = parseICS(text);
            combinedEvents = [...combinedEvents, ...parsedSingle];
          }
        } catch (e) {
          console.warn('Error fetching calendar URL:', singleUrl, e);
        }
      }

      if (combinedEvents.length === 0) return;

      const holidayRanges = combinedEvents
        .filter(ev => {
          const summary = (ev.summary || '').toLowerCase();
          return summary.includes('ferien') || summary.includes('feiertag') || summary.includes('schulfrei');
        })
        .map(ev => {
          const toYYYYMMDD = (d: Date) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
          };
          
          const end = ev.dtend ? new Date(ev.dtend) : new Date(ev.dtstart);
          if (ev.dtend && ev.isAllDay) {
            end.setDate(end.getDate() - 1);
          }
          
          return {
            start: toYYYYMMDD(ev.dtstart),
            end: toYYYYMMDD(end),
            name: ev.summary || 'Ferien'
          };
        });

      setHolidays(holidayRanges);
    } catch (err) {
      console.error('Error loading holidays in StudentAvatarDashboard:', err);
    }
  };

  useEffect(() => {
    const calendarUrl = studentUser?.schools?.calendar_url;
    if (calendarUrl) {
      loadHolidays(calendarUrl);
    }
  }, [studentUser?.schools?.calendar_url]);

  const scheduleOccurrences = useMemo<any[]>(() => {
    return rawScheduleOccurrences.filter((occ: any) => {
      const isHoliday = holidays.some(h => occ.date >= h.start && occ.date <= h.end);
      if (isHoliday) {
        const isMockOrVacant = occ.id.startsWith?.('mock-') || occ.id.startsWith?.('vacant-');
        if (isMockOrVacant) return false;

        const isRescheduledFromOutside = occ.original_date && 
          occ.original_date !== occ.date && 
          !holidays.some(h => occ.original_date >= h.start && occ.original_date <= h.end);

        return !!isRescheduledFromOutside;
      }
      return true;
    });
  }, [rawScheduleOccurrences, holidays]);

  const schoolYearOccurrences = useMemo<any[]>(() => {
    return rawSchoolYearOccurrences.filter((occ: any) => {
      const isHoliday = holidays.some(h => occ.date >= h.start && occ.date <= h.end);
      if (isHoliday) {
        const isMockOrVacant = occ.id.startsWith?.('mock-') || occ.id.startsWith?.('vacant-');
        if (isMockOrVacant) return false;

        const isRescheduledFromOutside = occ.original_date && 
          occ.original_date !== occ.date && 
          !holidays.some(h => occ.original_date >= h.start && occ.original_date <= h.end);

        return !!isRescheduledFromOutside;
      }
      return true;
    });
  }, [rawSchoolYearOccurrences, holidays]);

  const isTodayHoliday = useMemo(() => {
    const todayStr = toLocalYYYYMMDD(new Date());
    return holidays.find(h => todayStr >= h.start && todayStr <= h.end);
  }, [holidays]);

  const briefingData = useMemo(() => {
    if (!rawBriefingData) return null;
    if (isTodayHoliday) {
      return {
        ...rawBriefingData,
        todayLesson: null
      };
    }
    return rawBriefingData;
  }, [rawBriefingData, isTodayHoliday]);

  // Direct Chat states inside appointment popup (Shoutbox)
  const [showAppointmentChat, setShowAppointmentChat] = useState(false);
  const [appointmentChatData, setAppointmentChatData] = useState<{ teacherId: string; date: string; start_time: string; label: string; occurrenceId?: string } | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatTypedMessage, setChatTypedMessage] = useState('');
  const [campusFeedAnnouncements, setCampusFeedAnnouncements] = useState<any[]>([]);
  const [feedInteractions, setFeedInteractions] = useState<any[]>([]);
  const [classFeedPosts, setClassFeedPosts] = useState<any[]>([]);
  const [classFeedInteractions, setClassFeedInteractions] = useState<any[]>([]);
  const [studentFeedTab, setStudentFeedTab] = useState<'campus' | 'class'>('campus');
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  // Übe-Ziel (Class Goal) State
  const [classGoals, setClassGoals] = useState<any[]>([]);
  const [classWeeklyMins, setClassWeeklyMins] = useState(0);

  const handleReactToPost = async (postId: string, emoji: string) => {
    try {
      const existing = feedInteractions.find(i => i.post_id === postId && i.user_id === studentId && i.emoji_unicode === emoji);
      if (existing) {
        await supabase
          .from('feed_interactions')
          .delete()
          .eq('id', existing.id);
      } else {
        await supabase
          .from('feed_interactions')
          .insert({
            post_type: 'campus',
            post_id: postId,
            user_id: studentId,
            interaction_type: 'like',
            emoji_unicode: emoji
          });
      }
      
      // Reload announcements & interactions
      const { data: annData } = await supabase
        .from('campus_announcements')
        .select('*, users(first_name, last_name, photo_url)')
        .eq('school_id', studentUser?.school_id)
        .order('created_at', { ascending: false });

      if (annData) {
        const parsed = annData.map((ann: any) => ({
          id: ann.id,
          title: ann.title,
          content: ann.message,
          target_type: ann.target_type || 'all',
          category: ann.category || 'general',
          is_emergency: ann.is_emergency || false,
          attachment_url: ann.attachment_url || null,
          created_at: ann.created_at,
          user: ann.users
        }));
        setCampusFeedAnnouncements(parsed.filter((ann: any) => ann.target_type === 'all' || ann.target_type === 'students'));
      }
      
      const { data: interData } = await supabase
        .from('feed_interactions')
        .select('*')
        .eq('post_type', 'campus');
      if (interData) {
        setFeedInteractions(interData);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitClassFeedInteraction = async (postId: string, type: 'poll_vote' | 'quiz_answer', selectedOption: number, isCorrect?: boolean) => {
    try {
      const existing = classFeedInteractions.find(i => i.post_id === postId && i.user_id === studentId);
      if (existing) {
        alert('Du hast auf diesen Beitrag bereits geantwortet.');
        return;
      }

      const { error } = await supabase
        .from('feed_interactions')
        .insert({
          post_type: 'class',
          post_id: postId,
          user_id: studentId,
          interaction_type: type,
          selected_option: selectedOption,
          is_correct: isCorrect ?? null
        });

      if (error) throw error;

      // Reload interactions
      const { data: classInterData } = await supabase
        .from('feed_interactions')
        .select('*')
        .eq('post_type', 'class');
      if (classInterData) {
        setClassFeedInteractions(classInterData);
      }
    } catch (err: any) {
      console.error(err);
      alert('Fehler beim Speichern der Antwort: ' + err.message);
    }
  };

  const fetchChat = async (teacherId: string, occurrenceId?: string) => {
    if (!studentId || !teacherId) return;
    
    let query = supabase
      .from('campus_direct_messages')
      .select('*');
      
    if (occurrenceId) {
      query = query.eq('occurrence_id', occurrenceId);
    } else {
      query = query.or(`and(sender_id.eq.${studentId},recipient_id.eq.${teacherId}),and(sender_id.eq.${teacherId},recipient_id.eq.${studentId})`);
    }
    
    const { data } = await query.order('created_at', { ascending: true });
    if (data) {
      setChatMessages(data);
      setTimeout(() => chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    }
  };

  useEffect(() => {
    if (!appointmentChatData || !showAppointmentChat) {
      setChatMessages([]);
      return;
    }

    fetchChat(appointmentChatData.teacherId, appointmentChatData.occurrenceId);

    const channel = supabase
      .channel(`chat_student_occ_${appointmentChatData.teacherId}`)
      .on('postgres_changes', { schema: 'public', event: '*', table: 'campus_direct_messages' }, () => {
        fetchChat(appointmentChatData.teacherId, appointmentChatData.occurrenceId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appointmentChatData, showAppointmentChat, studentId]);

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatTypedMessage.trim() || !appointmentChatData) return;

    // Freeze Check
    try {
      const timePart = appointmentChatData.start_time.includes(':') ? appointmentChatData.start_time : `${appointmentChatData.start_time}:00`;
      const lessonDateTime = new Date(`${appointmentChatData.date}T${timePart}`);
      if (Date.now() > lessonDateTime.getTime() + 48 * 60 * 60 * 1000) {
        alert('Dieser Chat ist eingefroren (48 Stunden nach dem Termin) und kann nicht mehr bearbeitet werden.');
        return;
      }
    } catch (err) {
      console.warn(err);
    }

    const messageContent = `[Termin ${appointmentChatData.label}] ${chatTypedMessage.trim()}`;

    try {
      // Optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage = {
        id: tempId,
        sender_id: studentId,
        recipient_id: appointmentChatData.teacherId,
        content: messageContent,
        occurrence_id: appointmentChatData.occurrenceId || null,
        created_at: new Date().toISOString(),
        is_read: false
      };
      setChatMessages(prev => [...prev, optimisticMessage]);
      setChatTypedMessage('');
      setTimeout(() => chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

      const { error } = await supabase.from('campus_direct_messages').insert({
        sender_id: studentId,
        recipient_id: appointmentChatData.teacherId,
        content: messageContent,
        occurrence_id: appointmentChatData.occurrenceId || null
      });
      if (error) throw error;
      
      if (appointmentChatData.occurrenceId) {
        const occId = appointmentChatData.occurrenceId;
        setOccurrencesWithMessages(prev => prev.includes(occId) ? prev : [...prev, occId]);
      }
      
      await fetchChat(appointmentChatData.teacherId, appointmentChatData.occurrenceId);
    } catch (err) {
      console.error('Error sending quick chat message:', err);
    }
  };

  const fetchSchedule = async () => {
    if (!studentId) return;
    setLoadingSchedule(true);
    try {
      const { data, error } = await supabase
        .from('schedule_occurrences')
        .select('*, schedule:schedule_id(*, rooms(name)), teacher:users!schedule_occurrences_teacher_id_fkey(first_name, last_name)')
        .eq('student_id', studentId)
        .gte('date', toLocalYYYYMMDD(new Date()))
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });
      
      if (!error && data) {
        setRawScheduleOccurrences(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const fetchOccurrencesWithMessages = async () => {
    if (!studentId) return;
    try {
      const { data, error } = await supabase
        .from('campus_direct_messages')
        .select('occurrence_id')
        .or(`sender_id.eq.${studentId},recipient_id.eq.${studentId}`);
      if (!error && data) {
        const ids = Array.from(new Set(data.map((m: any) => m.occurrence_id).filter(Boolean)));
        setOccurrencesWithMessages(ids);
      }
    } catch (err) {
      console.error('Error fetching occurrences with messages:', err);
    }
  };

  const fetchBriefingOnly = async () => {
    if (!studentId) return;
    try {
      const resp = await fetch(`/api/briefing/student?userId=${studentId}`);
      if (resp && resp.ok) {
        const bd = await resp.json();
        if (bd && bd.success) {
          setRawBriefingData(bd);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch briefing in real-time:', err);
    }
  };

  const handleOpenContributions = async (goalTitle: string, targetMinutes: number) => {
    setLoadingContributions(true);
    setContributionsModalData({
      goalTitle,
      targetMinutes,
      contributions: []
    });

    try {
      const teacherId = studentUser?.teacher_id;
      const schoolId = studentUser?.school_id;
      if (!teacherId || !schoolId) {
        setLoadingContributions(false);
        return;
      }

      const { data: classmates, error: classmatesErr } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId);

      if (classmatesErr) throw classmatesErr;

      if (classmates && classmates.length > 0) {
        const now = new Date();
        const monday = new Date(now);
        const day = now.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        monday.setDate(now.getDate() + diff);
        monday.setHours(0, 0, 0, 0);
        
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        const classmateIds = classmates.map((c: any) => c.id);

        const { data: practiceData, error: practiceErr } = await supabase
          .from('practice_sessions')
          .select('student_id, duration_minutes')
          .in('student_id', classmateIds)
          .gte('created_at', monday.toISOString())
          .lte('created_at', sunday.toISOString());

        if (practiceErr) throw practiceErr;

        const list = classmates.map((student: any) => {
          const mins = (practiceData || [])
            .filter((s: any) => s.student_id === student.id)
            .reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);
          return {
            name: `${student.first_name || ''} ${student.last_name ? student.last_name.trim().charAt(0) + '.' : ''}`.trim() || 'Schüler',
            minutes: mins
          };
        })
        .filter(item => item.minutes > 0)
        .sort((a, b) => b.minutes - a.minutes);

        setContributionsModalData({
          goalTitle,
          targetMinutes,
          contributions: list
        });
      }
    } catch (err) {
      console.error('Error loading goal contributions:', err);
    } finally {
      setLoadingContributions(false);
    }
  };

  const fetchSchoolYearSchedule = async () => {
    if (!studentId) return;
    setLoadingSchoolYearSchedule(true);
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      let schoolYearStart = new Date(currentYear - 1, 8, 1);
      let schoolYearEnd = new Date(currentYear, 6, 31);

      if (currentMonth >= 7) {
        schoolYearStart = new Date(currentYear, 8, 1);
        schoolYearEnd = new Date(currentYear + 1, 6, 31);
      }

      const startStr = toLocalYYYYMMDD(schoolYearStart);
      const endStr = toLocalYYYYMMDD(schoolYearEnd);

      const { data: occurrences, error: occErr } = await supabase
        .from('schedule_occurrences')
        .select('*, schedule:schedule_id(*, rooms(name)), teacher:users!schedule_occurrences_teacher_id_fkey(first_name, last_name)')
        .eq('student_id', studentId)
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      const { data: schedules, error: schErr } = await supabase
        .from('schedules')
        .select('*, teacher:users!schedules_teacher_id_fkey(first_name, last_name), rooms(name)')
        .eq('student_id', studentId);

      if (occErr) throw occErr;
      if (schErr) throw schErr;

      const allMergedOccurrences: any[] = [];
      const usedActualIds = new Set<string>();

      if (schedules) {
        schedules.forEach(sch => {
          const current = new Date(schoolYearStart);
          while (current <= schoolYearEnd) {
            const currentDay = current.getDay() || 7;
            const diff = sch.day_of_week - currentDay;
            const targetDate = new Date(current);
            targetDate.setDate(current.getDate() + diff);

            if (targetDate >= schoolYearStart && targetDate <= schoolYearEnd) {
              const yyyy = targetDate.getFullYear();
              const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
              const dd = String(targetDate.getDate()).padStart(2, '0');
              const dateStr = `${yyyy}-${mm}-${dd}`;

              const actual = occurrences?.find(occ => 
                (occ.schedule_id === sch.id || occ.student_id === studentId) && 
                (occ.original_date === dateStr || (!occ.original_date && occ.date === dateStr))
              );

              if (actual) {
                allMergedOccurrences.push(actual);
                usedActualIds.add(actual.id);
              } else {
                allMergedOccurrences.push({
                  id: `virtual-${sch.id}-${dateStr}`,
                  schedule_id: sch.id,
                  student_id: studentId,
                  teacher_id: sch.teacher_id,
                  date: dateStr,
                  start_time: sch.time_slot + (sch.time_slot.split(':').length === 2 ? ':00' : ''),
                  duration: sch.duration || 45,
                  status: 'scheduled',
                  is_virtual: true,
                  teacher: sch.teacher,
                  schedule: sch
                });
              }
            }
            current.setDate(current.getDate() + 7);
          }
        });
      }

      if (occurrences) {
        occurrences.forEach(occ => {
          if (!usedActualIds.has(occ.id)) {
            allMergedOccurrences.push(occ);
          }
        });
      }

      allMergedOccurrences.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.start_time || '').localeCompare(b.start_time || '');
      });

      setRawSchoolYearOccurrences(allMergedOccurrences);
    } catch (err) {
      console.error('Error fetching school year schedule:', err);
    } finally {
      setLoadingSchoolYearSchedule(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
    fetchSchoolYearSchedule();
    fetchOccurrencesWithMessages();

    if (!studentId) return;

    const channel = supabase
      .channel(`realtime_student_schedule_${studentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedule_occurrences',
          filter: `student_id=eq.${studentId}`
        },
        () => {
          fetchSchedule();
          fetchSchoolYearSchedule();
          fetchBriefingOnly();
        }
      )
      .subscribe();

    const msgChannel = supabase
      .channel(`realtime_student_messages_${studentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campus_direct_messages'
        },
        () => {
          fetchOccurrencesWithMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(msgChannel);
    };
  }, [studentId]);

  const fetchCrisisNotifications = async () => {
    if (!studentId) return;
    try {
      const { data: studentSchedules, error: schedError } = await supabase
        .from('schedules')
        .select('day_of_week, time_slot')
        .eq('student_id', studentId);

      const { data, error } = await supabase
        .from('crisis_notifications')
        .select('*, teacher:users!crisis_notifications_teacher_id_fkey(first_name, last_name)')
        .eq('student_id', studentId)
        .eq('status', 'UNREAD')
        .order('slot_start_datetime', { ascending: true });

      if (!error && data) {
        if (studentSchedules && studentSchedules.length > 0) {
          const filtered = data.filter(n => {
            const dt = new Date(n.slot_start_datetime);
            const dayOfWeek = dt.getDay() || 7;
            const hours = String(dt.getHours()).padStart(2, '0');
            const minutes = String(dt.getMinutes()).padStart(2, '0');
            const timeSlot = `${hours}:${minutes}`;
            
            return studentSchedules.some(sch => 
              sch.day_of_week === dayOfWeek && 
              sch.time_slot === timeSlot
            );
          });
          setUnreadCrisisNotifs(filtered);
        } else {
          setUnreadCrisisNotifs([]);
        }
      }
    } catch (err) {
      console.error('Error fetching crisis notifications:', err);
    }
  };

  useEffect(() => {
    fetchCrisisNotifications();

    if (!studentId) return;

    const channel = supabase
      .channel(`realtime_student_crisis_${studentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crisis_notifications',
          filter: `student_id=eq.${studentId}`
        },
        () => {
          fetchCrisisNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId]);

  const handleConfirmCrisisNotification = async (notifId: string) => {
    setConfirmingCrisisId(notifId);
    try {
      const { error } = await supabase
        .from('crisis_notifications')
        .update({ status: 'READ' })
        .eq('id', notifId);
      if (error) throw error;
      setUnreadCrisisNotifs(prev => prev.filter(n => n.id !== notifId));
    } catch (err) {
      console.error('Error confirming crisis notification:', err);
      alert('Bestätigung fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setConfirmingCrisisId(null);
    }
  };

  const handleConfirmReschedule = async (occId: string) => {
    try {
      // Optimistic update
      setRawScheduleOccurrences(prev => 
        prev.map(occ => occ.id == occId ? { ...occ, status: 'rescheduled_confirmed', student_acknowledged: true } : occ)
      );

      const { error } = await supabase
        .from('schedule_occurrences')
        .update({ status: 'rescheduled_confirmed', student_acknowledged: true })
        .eq('id', occId);
      if (error) throw error;
    } catch (err: any) {
      console.error('Error confirming reschedule:', err);
      fetchSchedule();
    }
  };

  const handleAcknowledgeCancellation = async (occId: string) => {
    try {
      // Optimistic update
      setRawScheduleOccurrences(prev => 
        prev.map(occ => occ.id == occId ? { ...occ, student_acknowledged: true } : occ)
      );

      const { error } = await supabase
        .from('schedule_occurrences')
        .update({ student_acknowledged: true })
        .eq('id', occId);
      if (error) throw error;
    } catch (err: any) {
      console.error('Error acknowledging cancellation:', err);
      fetchSchedule();
    }
  };

  const handleCancelOccurrence = async (occ: any) => {
    const d = new Date(occ.date);
    const formattedDate = d.toLocaleDateString('de-DE');
    if (!confirm(`Möchtest du deinen Termin am ${formattedDate} um ${occ.start_time?.substring(0,5)} Uhr wirklich absagen?`)) return;

    try {
      if (occ.is_virtual) {
        const { error: insertErr } = await supabase
          .from('schedule_occurrences')
          .insert({
            schedule_id: occ.schedule_id,
            student_id: studentId,
            teacher_id: occ.teacher_id,
            date: occ.date,
            start_time: occ.start_time,
            duration: occ.duration || 45,
            status: 'cancelled',
            student_acknowledged: true
          });
        if (insertErr) throw insertErr;
      } else {
        const { error: updateErr } = await supabase
          .from('schedule_occurrences')
          .update({ status: 'cancelled', student_acknowledged: true })
          .eq('id', occ.id);
        if (updateErr) throw updateErr;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', studentId)
        .single();
      const studentName = userData ? `${userData.first_name} ${userData.last_name}` : 'Ein Schüler';

      await supabase.from('system_alerts').insert({
        school_id: occ.schedule?.school_id || studentUser?.school_id || null,
        teacher_id: occ.teacher_id,
        type: 'Termin abgesagt',
        message: `❌ Absage: ${studentName} hat den Termin am ${formattedDate} um ${occ.start_time?.substring(0,5)} Uhr abgesagt.`
      });

      fetchSchedule();
      fetchSchoolYearSchedule();
      alert('Der Termin wurde erfolgreich abgesagt.');
    } catch (err) {
      console.error('Error canceling occurrence:', err);
      alert('Fehler beim Absagen des Termins.');
    }
  };

  const handleRejectReschedule = async (occ: any) => {
    try {
      const originalDate = occ.original_date || occ.date;
      const originalStartTime = occ.original_start_time || occ.start_time;

      // Optimistic update
      setRawScheduleOccurrences(prev => 
        prev.map(o => o.id == occ.id ? { ...o, date: originalDate, start_time: originalStartTime, status: 'cancelled', student_acknowledged: false } : o)
      );

      // 1. Reset occurrence back to original date/time and set status to cancelled
      const { error: updateErr } = await supabase
        .from('schedule_occurrences')
        .update({
          date: originalDate,
          start_time: originalStartTime,
          status: 'cancelled',
          student_acknowledged: false // Student will see it as cancelled in their dashboard
        })
        .eq('id', occ.id);

      if (updateErr) throw updateErr;

      // 2. Alert the teacher
      const { data: userData } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', studentId)
        .single();
      const studentName = userData ? `${userData.first_name} ${userData.last_name}` : 'Ein Schüler';
      const formattedDate = new Date(occ.date).toLocaleDateString('de-DE');

      await supabase.from('system_alerts').insert({
        school_id: occ.schedule?.school_id || studentUser?.school_id || null,
        teacher_id: occ.teacher_id,
        type: 'Verschiebung abgelehnt',
        message: `❌ ${studentName} hat den Verschiebungstermin am ${formattedDate} abgelehnt. Der Termin wurde auf den Originaltermin zurückgesetzt und für diese Woche abgesagt.`
      });
    } catch (err: any) {
      console.error('Error rejecting reschedule:', err);
      fetchSchedule();
    }
  };
  
  const [activeTab, setActiveTab] = useState<string>(() => {
    let initial = parentActiveTab;
    if (initial === 'mediathek') initial = 'songs';
    if (initial === 'termine' || initial === 'all_appointments') initial = 'events';
    return (initial as any) || 'briefing';
  });

  // ── Asset Preloading Hook (3.2) ──
  useEffect(() => {
    const imagesToPreload = [
      '/avatars/gitarre_avatar_new.png',
      '/avatars/egitarre_avatar.png',
      '/avatars/ebass_avatar.png',
      '/avatars/kontrabass_avatar.png',
      '/avatars/bass_avatar.png',
      '/avatars/schlagzeug_avatar.png',
      '/avatars/klavier_avatar_new.png',
      '/avatars/gesang_avatar.png',
      '/avatars/trompete_avatar_new.png',
      '/avatars/posaune_avatar.png',
      '/avatars/horn_avatar_new.png',
      '/avatars/cello_avatar_new.png',
      '/avatars/violine_avatar_new.png'
    ];
    imagesToPreload.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    if (parentActiveTab) {
      let mapped = parentActiveTab;
      if (mapped === 'mediathek') mapped = 'songs';
      if (mapped === 'termine' || mapped === 'all_appointments') mapped = 'events';
      if (['briefing', 'hero', 'songs', 'practice_board', 'campus_cup', 'events', 'profile', 'settings', 'homework_book'].includes(mapped)) {
        setActiveTab(mapped as any);
      }
    }
  }, [parentActiveTab]);

  useEffect(() => {
    if (activeTab === 'events') {
      fetchSchoolYearSchedule();
    }
  }, [activeTab, studentId]);

  const handleUseJoker = async (dateStr: string) => {
    if (!studentId || !studentUser) return;
    
    const currentWeek = getISOWeek(new Date());
    const lastJokerWeek = studentUser?.joker_used_at ? getISOWeek(new Date(studentUser.joker_used_at)) : null;
    const isJokerAvailable = !studentUser?.joker_used_at || lastJokerWeek !== currentWeek;
    
    if (!isJokerAvailable) {
      alert('Du hast deinen Joker für diese Woche bereits verbraucht!');
      return;
    }

    if (!window.confirm(`Möchtest du deinen Joker für den ${dateStr} einsetzen, um deinen Streak zu sichern?`)) {
      return;
    }

    try {
      const parts = dateStr.split('.');
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = 2000 + parseInt(parts[2], 10);
      const jokerDate = new Date(year, month, day, 12, 0, 0);

      const { error: userErr } = await supabase
        .from('users')
        .update({ joker_used_at: jokerDate.toISOString() })
        .eq('id', studentId);

      if (userErr) throw userErr;

      const currentStreak = avatar?.streak_flame || 0;
      const newStreak = currentStreak === 0 ? 1 : currentStreak + 1;
      
      const { error: avatarErr } = await supabase
        .from('avatars')
        .update({ streak_flame: newStreak })
        .eq('user_id', studentId);

      if (avatarErr) throw avatarErr;

      await fetchStudentAndAvatar();
    } catch (err) {
      console.error('Error using joker:', err);
      alert('Fehler beim Einsetzen des Jokers. Bitte versuche es erneut.');
    }
  };

  const checkAndAutoApplyJoker = async (groupedList: any[]) => {
    if (!studentId || !studentUser || !avatar) return;

    const currentStreak = avatar?.streak_flame || 0;
    if (currentStreak <= 0) return; // Joker is only automatically applied if there is an active streak to save

    const lastJokerWeek = studentUser?.joker_used_at ? getISOWeek(new Date(studentUser.joker_used_at)) : null;
    let firstMissedDayGroup: any = null;
    let foundJokerDate: Date | null = null;

    for (let i = groupedList.length - 1; i >= 0; i--) {
      const group = groupedList[i];
      if (group.isPlaceholder && !group.isToday) {
        const parts = group.date.split('.');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = 2000 + parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        const weekOfD = getISOWeek(d);
        
        if (!lastJokerWeek || weekOfD > lastJokerWeek) {
          firstMissedDayGroup = group;
          foundJokerDate = new Date(year, month, day, 12, 0, 0);
          break;
        }
      }
    }

    if (firstMissedDayGroup && foundJokerDate) {
      console.log('Automatically applying joker to save streak for date:', firstMissedDayGroup.date);
      try {
        const { error: userErr } = await supabase
          .from('users')
          .update({ joker_used_at: foundJokerDate.toISOString() })
          .eq('id', studentId);

        if (userErr) throw userErr;

        // Preserve current streak, don't increment it
        const newStreak = currentStreak;
        
        const { error: avatarErr } = await supabase
          .from('avatars')
          .update({ streak_flame: newStreak })
          .eq('user_id', studentId);

        if (avatarErr) throw avatarErr;

        await fetchStudentAndAvatar();

        // Trigger celebration overlay for saved streak!
        setCelebrationDetails({
          xpGained: 0,
          streakFlame: newStreak,
          sessionCompletedTarget: false,
          usedJokerThisSession: true,
          streak: newStreak,
          sessionMinutes: 0,
          dailyGoal: 3
        });
        setCelebrationRingProgress(1.0);
        setCelebrationExploded(false);
        setShowCelebration(true);
      } catch (err) {
        console.error('Error auto applying joker:', err);
      }
    }
  };

  const handleTabChangeLocal = (tab: string) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // Übe-Board / Gyro-Detox Engine state
  const [sessionActive, setSessionActive] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [isPhoneFlat, setIsPhoneFlat] = useState(false);
  const isPhoneFlatRef = useRef(isPhoneFlat);

  useEffect(() => {
    isPhoneFlatRef.current = isPhoneFlat;
  }, [isPhoneFlat]);

  // Overhauled states for Fokus-Timer (grace period, flat detection types, fallback)
  const [flatType, setFlatType] = useState<'face-up' | 'face-down' | 'none'>('none');
  const [graceSecondsLeft, setGraceSecondsLeft] = useState(10);
  const [isGraceActive, setIsGraceActive] = useState(false);
  const [isDesktopFallback, setIsDesktopFallback] = useState(true);
  const [wakeLockFailed, setWakeLockFailed] = useState(false);
  const [practiceAnchor, setPracticeAnchor] = useState<string | null>(null);
  const [anchorTrigger, setAnchorTrigger] = useState('den Hausaufgaben');
  const [customTriggerText, setCustomTriggerText] = useState('');
  const [lastSelectedMood, setLastSelectedMood] = useState<'sad' | 'neutral' | 'happy' | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationDetails, setCelebrationDetails] = useState<{
    xpGained: number;
    streakFlame: number;
    sessionCompletedTarget: boolean;
    usedJokerThisSession: boolean;
    streak: number;
    sessionMinutes?: number;
    dailyGoal?: number;
  } | null>(null);

  const [celebrationRingProgress, setCelebrationRingProgress] = useState(0);
  const [celebrationExploded, setCelebrationExploded] = useState(false);
  const celebrationCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [lastFinishedTimestamp, setLastFinishedTimestamp] = useState<number | null>(null);
  const wakeLockRef = useRef<any>(null);

  const [fokusLogs, setFokusLogs] = useState<any[]>([]);
  const [isExtraTime, setIsExtraTime] = useState(false);
  const [showCheckpoint, setShowCheckpoint] = useState(false);
  const [checkpointSecondsLeft, setCheckpointSecondsLeft] = useState(20);
  const nextCheckpointSecondsRef = useRef<number>(0);
  const currentLogIdRef = useRef<string | null>(null);
  const currentExtraLogIdRef = useRef<string | null>(null);
  const isExtraTimeRef = useRef(isExtraTime);
  const isFinishingSessionRef = useRef(false);

  useEffect(() => {
    isExtraTimeRef.current = isExtraTime;
  }, [isExtraTime]);

  const [preStartCountdown, setPreStartCountdown] = useState<number | null>(null);
  const preStartCountdownRef = useRef(preStartCountdown);
  useEffect(() => {
    preStartCountdownRef.current = preStartCountdown;
  }, [preStartCountdown]);

  // Load saved focus session on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('groovelab_active_practice_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only restore if session was saved within the last 4 hours
        const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;
        if (parsed.timestamp > fourHoursAgo) {
          setSecondsElapsed(parsed.secondsElapsed || 0);
          if (parsed.selectedTopic) {
            setSelectedTopic(parsed.selectedTopic);
          }
          if (parsed.sessionActive) {
            setSessionActive(true);
            setIsPhoneFlat(true);
          }
        }
      }
    } catch (e) {
      console.error('Failed to restore practice session', e);
    }
  }, []);

  // Save focus session progress dynamically
  useEffect(() => {
    if (sessionActive && secondsElapsed > 0) {
      localStorage.setItem('groovelab_active_practice_session', JSON.stringify({
        secondsElapsed,
        selectedTopic,
        sessionActive,
        timestamp: Date.now()
      }));
    } else if (!sessionActive) {
      localStorage.removeItem('groovelab_active_practice_session');
    }
  }, [secondsElapsed, sessionActive, selectedTopic]);

  // Countdown timer effect for pre-start instructions
  useEffect(() => {
    if (preStartCountdown === null) return;
    if (preStartCountdown > 0) {
      const timer = setTimeout(() => {
        setPreStartCountdown(preStartCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setPreStartCountdown(null);
      setIsPhoneFlat(true); // default to flat/focused when starting
    }
  }, [preStartCountdown]);

  // Screen Wake Lock API Integration
  useEffect(() => {
    const acquireWakeLock = async () => {
      if (!('wakeLock' in navigator)) {
        console.warn('Wake Lock not supported on this browser');
        setWakeLockFailed(true);
        return;
      }
      try {
        if (wakeLockRef.current) return;
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setWakeLockFailed(false);
        console.log('Wake Lock acquired successfully');
      } catch (err) {
        console.error('Failed to acquire Wake Lock:', err);
        setWakeLockFailed(true);
      }
    };

    const releaseWakeLock = async () => {
      setWakeLockFailed(false);
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
          console.log('Wake Lock released successfully');
        } catch (err) {
          console.error('Failed to release Wake Lock:', err);
        }
      }
    };

    const handleVisibility = async () => {
      if (document.visibilityState === 'visible' && sessionActive) {
        await acquireWakeLock();
      } else {
        await releaseWakeLock();
      }
    };

    if (sessionActive) {
      acquireWakeLock();
      document.addEventListener('visibilitychange', handleVisibility);
    } else {
      releaseWakeLock();
    }

    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [sessionActive]);
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [hasCompletedTargetToday, setHasCompletedTargetToday] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'logbook' | 'stats'>('logbook');
  const DEFAULT_FOKUS_LEVELS = {
    level1: { kleine: 3, mittlere: 5, helden: 10 },
    level2: { kleine: 5, mittlere: 10, helden: 15 },
    level3: { kleine: 15, mittlere: 20, helden: 30 }
  };

  const [schoolFokusLevels, setSchoolFokusLevels] = useState<any>(null);

  const getFlameCategory = (streak: number): 'kleine' | 'mittlere' | 'helden' => {
    if (streak >= 9) return 'helden';
    if (streak >= 4) return 'mittlere';
    return 'kleine';
  };

  const getTargetMinutes = (streak: number = 0) => {
    const level = avatar?.evolution_level || 1;
    const cat = getFlameCategory(streak);
    const config = schoolFokusLevels || DEFAULT_FOKUS_LEVELS;
    const levelKey = `level${level}` as 'level1' | 'level2' | 'level3';
    const levelConfig = config[levelKey] || DEFAULT_FOKUS_LEVELS[levelKey];
    return levelConfig[cat] || DEFAULT_FOKUS_LEVELS[levelKey][cat];
  };

  const getTrimesterPracticeDays = () => {
    const now = new Date();
    const currentMonth = now.getMonth();

    let startMonth = 8; // Sept (0-indexed: 8)
    let endMonth = 11; // Dec (0-indexed: 11)

    if (currentMonth >= 0 && currentMonth <= 3) {
      startMonth = 0; // Jan
      endMonth = 3; // Apr
    } else if (currentMonth >= 4 && currentMonth <= 7) {
      startMonth = 4; // May
      endMonth = 7; // Aug
    }

    const startYear = currentMonth >= 8 ? now.getFullYear() : now.getFullYear();
    const endYear = startYear;

    const startDate = new Date(startYear, startMonth, 1, 0, 0, 0);
    const endDate = new Date(endYear, endMonth, 31, 23, 59, 59);

    // Filter logs
    const trimesterLogs = fokusLogs.filter(log => {
      const logDate = new Date(log.created_at);
      return logDate >= startDate && logDate <= endDate && (log.duration_minutes > 0 || log.duration_seconds > 0);
    });

    const uniqueDays = new Set(trimesterLogs.map(log => {
      const logDate = new Date(log.created_at);
      return toLocalYYYYMMDD(logDate);
    }));

    return uniqueDays.size;
  };

  const getTrimesterProgressDetails = () => {
    const practicedDays = getTrimesterPracticeDays();
    const level = avatar?.evolution_level || 1;
    let targetDays = 30;
    let nextLevel = 2;

    if (level === 2) {
      targetDays = 45;
      nextLevel = 3;
    } else if (level >= 3) {
      targetDays = 45;
      nextLevel = 3;
    }

    const progressPercentage = Math.min(100, (practicedDays / targetDays) * 100);

    const now = new Date();
    const currentMonth = now.getMonth();
    let trimesterName = '1. Drittel (Sept - Dez)';
    if (currentMonth >= 0 && currentMonth <= 3) {
      trimesterName = '2. Drittel (Jan - Apr)';
    } else if (currentMonth >= 4 && currentMonth <= 7) {
      trimesterName = '3. Drittel (Mai - Aug)';
    }

    return {
      practicedDays,
      targetDays,
      nextLevel,
      progressPercentage,
      trimesterName,
      isMaxLevel: level >= 3
    };
  };

  // Animate SVG circular ring in celebration modal
  useEffect(() => {
    if (showCelebration && celebrationDetails) {
      const timer = setTimeout(() => {
        const goal = celebrationDetails.dailyGoal || 10;
        const target = Math.min(1.0, (celebrationDetails.sessionMinutes || 0) / goal);
        setCelebrationRingProgress(target);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setCelebrationRingProgress(0);
      setCelebrationExploded(false);
    }
  }, [showCelebration, celebrationDetails]);

  // Trigger HTML5 Canvas particle explosion in celebration modal
  useEffect(() => {
    if (showCelebration && celebrationDetails && celebrationDetails.sessionCompletedTarget && !celebrationExploded && celebrationRingProgress >= 1.0) {
      const timer = setTimeout(() => {
        triggerCelebrationExplosion();
        setCelebrationExploded(true);
      }, 1200); // Trigger near the end of the 1.5s ring animation
      return () => clearTimeout(timer);
    }
  }, [showCelebration, celebrationDetails, celebrationRingProgress, celebrationExploded]);

  // Canvas particle explosion logic for celebration modal
  const triggerCelebrationExplosion = () => {
    // Trigger mechanisches haptisches Feedback (50ms - 30ms - 50ms)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([50, 30, 50]);
    }

    const canvas = celebrationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    let animationFrameId: number;
    const particles: any[] = [];
    const particleCount = 100;
    
    const noteSymbols = ['♪', '♫', '♬', '♩'];
    const colors = ['#fbbf24', '#34a853', '#6366f1', '#ec4899', '#3b82f6', '#f59e0b', '#a855f7'];

    const drawStar = (c: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
      let rot = Math.PI / 2 * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      c.beginPath();
      c.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        c.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        c.lineTo(x, y);
        rot += step;
      }
      c.lineTo(cx, cy - outerRadius);
      c.closePath();
      c.fill();
    };

    const drawSparkle = (c: CanvasRenderingContext2D, cx: number, cy: number, size: number) => {
      c.beginPath();
      c.moveTo(cx - size, cy);
      c.quadraticCurveTo(cx, cy, cx, cy - size);
      c.quadraticCurveTo(cx, cy, cx + size, cy);
      c.quadraticCurveTo(cx, cy, cx, cy + size);
      c.quadraticCurveTo(cx, cy, cx, cy + size);
      c.quadraticCurveTo(cx, cy, cx - size, cy);
      c.closePath();
      c.fill();
    };

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      const typeRand = Math.random();
      let type: 'star' | 'circle' | 'note' | 'sparkle' = 'circle';
      if (typeRand < 0.25) type = 'star';
      else if (typeRand < 0.5) type = 'note';
      else if (typeRand < 0.75) type = 'sparkle';

      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (Math.random() * 2),
        size: 5 + Math.random() * 7,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: 0.01 + Math.random() * 0.015,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
        type,
        noteSymbol: type === 'note' ? noteSymbols[Math.floor(Math.random() * noteSymbols.length)] : undefined,
        gravity: 0.1 + Math.random() * 0.08,
        friction: 0.96 + Math.random() * 0.02
      });
    }

    const renderFrame = () => {
      ctx.clearRect(0, 0, width, height);
      let activeParticles = 0;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.alpha <= 0) continue;

        activeParticles++;
        p.vx *= p.friction;
        p.vy *= p.friction;
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.alpha -= p.decay;

        if (p.alpha < 0) p.alpha = 0;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (p.type === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'star') {
          drawStar(ctx, 0, 0, 5, p.size, p.size / 2.5);
        } else if (p.type === 'sparkle') {
          drawSparkle(ctx, 0, 0, p.size);
        } else if (p.type === 'note') {
          ctx.font = `bold ${Math.round(p.size * 1.6)}px sans-serif`;
          ctx.fillText(p.noteSymbol!, 0, 0);
        }

        ctx.restore();
      }

      if (activeParticles > 0) {
        animationFrameId = requestAnimationFrame(renderFrame);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    renderFrame();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  };

  const getFlameLevelName = (streak: number) => {
    if (streak >= 9) return 'Helden-Feuer';
    if (streak >= 4) return 'Mittlere Flamme';
    if (streak >= 1) return 'Kleine Flamme';
    return 'Keine Flamme';
  };

  const fetchFokusLogs = async () => {
    if (!studentId) return;
    try {
      const { data, error } = await supabase
        .from('fokus_logs')
        .select('*')
        .eq('user_id', studentId)
        .order('created_at', { ascending: false });
      if (!error && data) {
        setFokusLogs(data);
        
        // Calculate if target is completed today
        const todayStr = new Date().toISOString().split('T')[0];
        const todayLogs = data.filter((log: any) => log.created_at && log.created_at.startsWith(todayStr));
        const nonExtraMinutes = todayLogs
          .filter((log: any) => !log.is_extra)
          .reduce((sum: number, log: any) => sum + (log.duration_minutes || 0), 0);
        
        // Fetch current avatar streak
        const { data: avatarRecord } = await supabase
          .from('avatars')
          .select('streak_flame')
          .eq('user_id', studentId)
          .maybeSingle();
        
        const streak = avatarRecord?.streak_flame || 0;
        const targetMins = getTargetMinutes(streak);
        setHasCompletedTargetToday(nonExtraMinutes >= targetMins);
      }
    } catch (err) {
      console.error('Error fetching fokus logs:', err);
    }
  };

  const getGroupedLogs = () => {
    const groups: Record<string, { date: string, focusSeconds: number, extraSeconds: number, flameLevel: string, isPlaceholder?: boolean }> = {};
    
    // Initialize placeholders for the last 7 days starting from user creation date
    const now = new Date();
    const creationDate = studentUser?.created_at ? new Date(studentUser.created_at) : null;
    const startOfCreation = creationDate ? new Date(creationDate.getFullYear(), creationDate.getMonth(), creationDate.getDate()) : null;

    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const startOfD = new Date(d.getFullYear(), d.getMonth(), d.getDate());

      if (startOfCreation && startOfD < startOfCreation) {
        continue;
      }

      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = String(d.getFullYear()).substring(2);
      const dateStr = `${dd}.${mm}.${yy}`;
      
      groups[dateStr] = {
        date: dateStr,
        focusSeconds: 0,
        extraSeconds: 0,
        flameLevel: 'Keine Flamme',
        isPlaceholder: true
      };
    }

    fokusLogs.forEach(log => {
      if (!log.created_at) return;
      
      // format date like 06.06.26 (dd.mm.yy)
      const d = new Date(log.created_at);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = String(d.getFullYear()).substring(2);
      const dateStr = `${dd}.${mm}.${yy}`;
      
      if (!groups[dateStr]) {
        groups[dateStr] = {
          date: dateStr,
          focusSeconds: 0,
          extraSeconds: 0,
          flameLevel: log.flame_level || 'Kleine Flamme'
        };
      } else if (groups[dateStr].isPlaceholder) {
        // If it was initialized as a placeholder, clear the placeholder flag since we have real logs
        groups[dateStr].isPlaceholder = false;
      }
      
      const seconds = log.duration_seconds || ((log.duration_minutes || 0) * 60);
      if (log.is_extra) {
        groups[dateStr].extraSeconds += seconds;
      } else {
        groups[dateStr].focusSeconds += seconds;
      }
      if (log.flame_level) {
        groups[dateStr].flameLevel = log.flame_level;
      }
    });
    
    const list = Object.values(groups);
    // Sort by date descending
    list.sort((a: any, b: any) => {
      const parseDateStr = (s: string) => {
        const parts = s.split('.');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = 2000 + parseInt(parts[2], 10);
        return new Date(year, month, day).getTime();
      };
      return parseDateStr(b.date) - parseDateStr(a.date);
    });
    return list;
  };

  useEffect(() => {
    if (studentId) {
      fetchFokusLogs();
    }
  }, [studentId, activeTab]);

  useEffect(() => {
    if (studentUser && avatar) {
      const grouped = getGroupedLogs();
      checkAndAutoApplyJoker(grouped);
    }
  }, [studentUser?.id, avatar?.streak_flame, fokusLogs]);

  // Campus Cup States
  const [rankingData, setRankingData] = useState<any[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingError, setRankingError] = useState<string | null>(null);
  const [monthlyFocusMinutes, setMonthlyFocusMinutes] = useState(0);
  const [totalFocusMinutes, setTotalFocusMinutes] = useState(0);
  const [classHighlights, setClassHighlights] = useState<any[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(false);
  const [myWeeklyFocus, setMyWeeklyFocus] = useState(0);
  const [classWeeklyFocus, setClassWeeklyFocus] = useState(0);
  const [classCount, setClassCount] = useState(0);
  const [classMins, setClassMins] = useState(0);
  const [otherClassMins, setOtherClassMins] = useState(0);

  const formatMins = (mins: number) => {
    if (mins < 60) return `${Math.round(mins)} Min.`;
    const hrs = Math.floor(mins / 60);
    const rem = Math.round(mins % 60);
    return rem > 0 ? `${hrs} Std. ${rem} Min.` : `${hrs} Std.`;
  };

  const formatMinsToMMSS = (mins: number) => {
    const totalSeconds = Math.round(mins * 60);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const sStr = s < 10 ? `0${s}` : `${s}`;
    if (h > 0) {
      const mStr = m < 10 ? `0${m}` : `${m}`;
      return `${h}:${mStr}:${sStr} Min.`;
    }
    return `${m}:${sStr} Min.`;
  };

  // DIGITAL DETOX TIMER STATE
  const [showDetox, setShowDetox] = useState(false);
  const [detoxMinutes, setDetoxMinutes] = useState(15);
  const [detoxSecondsLeft, setDetoxSecondsLeft] = useState(15 * 60);
  const [isDetoxActive, setIsDetoxActive] = useState(false);
  const [isFaceDown, setIsFaceDown] = useState(false);
  const [detoxCompleted, setDetoxCompleted] = useState(false);
  
  // WRAPPED STORY STATE
  const [showWrapped, setShowWrapped] = useState(false);
  const [wrappedData, setWrappedData] = useState<any>(null);
  const [storySlide, setStorySlide] = useState(0);
  const [wrappedLoading, setWrappedLoading] = useState(false);

  const timerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastHighlightsFetchRef = useRef<number>(0);
  const highlightsLoadedRef = useRef<boolean>(false);

  useEffect(() => {
    fetchStudentAndAvatar();
  }, [studentId]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(err => console.warn('Error closing AudioContext:', err));
        audioContextRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'profile' && studentId) {
      const fetchStudentSchedules = async () => {
        try {
          const { data } = await supabase
            .from('schedules')
            .select('*, teacher:users!schedules_teacher_id_fkey(first_name, last_name), rooms(name)')
            .eq('student_id', studentId);
          if (data) setStudentSchedules(data);
        } catch (err) {
          console.error('Error fetching student schedules:', err);
        }
      };
      fetchStudentSchedules();
    }
  }, [activeTab, studentId]);

  // progress matrix state
  const [studentMissionProgress, setStudentMissionProgress] = useState<any | null>(null);
  const [studentPins, setStudentPins] = useState<any[]>([]);
  const [pinInput, setPinInput] = useState('');
  const [customAvatarFile, setCustomAvatarFile] = useState<File | null>(null);
  const [isUploadingCustomAvatar, setIsUploadingCustomAvatar] = useState(false);
  const [progressItems, setProgressItems] = useState<any[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [classFocusLogs, setClassFocusLogs] = useState<any[]>([]);
  const [classmateIds, setClassmateIds] = useState<string[]>([]);
  const [lehrwerke, setLehrwerke] = useState<any[]>([]);
  const [songs, setSongs] = useState<any[]>([]);
  const songStats = useMemo(() => {
    const assigned = songs.filter(song => {
      const isAssigned = progressItems.some(item => 
        item.topic_name.toLowerCase() === song.title.toLowerCase() ||
        item.topic_name.toLowerCase().includes(song.title.toLowerCase())
      );
      return song.is_campus_active && isAssigned;
    });

    const mastered = assigned.filter(song => {
      const progressItem = progressItems.find(item => 
        item.topic_name.toLowerCase() === song.title.toLowerCase() ||
        item.topic_name.toLowerCase().includes(song.title.toLowerCase())
      );
      return progressItem?.status === 'MASTERED';
    });

    return {
      assignedCount: assigned.length,
      masteredCount: mastered.length
    };
  }, [songs, progressItems]);
  const [songSearch, setSongSearch] = useState('');
  const [songSearchDebounced, setSongSearchDebounced] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setSongSearchDebounced(songSearch);
    }, 250);
    return () => {
      clearTimeout(handler);
    };
  }, [songSearch]);

  const [selectedLehrwerkForDetail, setSelectedLehrwerkForDetail] = useState<any | null>(null);
  const [localProgress, setLocalProgress] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('student_lehrwerke_progress');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });
  const [studentDetailSearch, setStudentDetailSearch] = useState('');
  const [mediathekTab, setMediathekTab] = useState<'songs' | 'lehrwerke'>('songs');

  const fetchStudentProgress = async (silent = false) => {
    if (!silent) {
      setProgressLoading(true);
    }
    let success = false;
    try {
      const stored = localStorage.getItem('student_lehrwerke_progress');
      if (stored) {
        setLocalProgress(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }

    try {
      let schoolId = studentUser?.school_id;
      if (!schoolId) {
        const { data: u } = await supabase.from('users').select('school_id').eq('id', studentId).single();
        schoolId = u?.school_id;
      }
      let query = supabase.from('lehrwerke').select('*');
      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }
      const { data: lehrwerkeData } = await query.order('title');
      if (lehrwerkeData) {
        setLehrwerke(lehrwerkeData.map((item: any) => ({
          ...item,
          totalPages: item.total_pages || 50
        })));
      }
    } catch (err) {
      console.error('Error fetching lehrwerke:', err);
    }

    try {
      let schoolId = studentUser?.school_id;
      if (!schoolId) {
        const { data: u } = await supabase.from('users').select('school_id').eq('id', studentId).single();
        schoolId = u?.school_id;
      }
      let query = supabase.from('songs').select('*');
      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }
      const { data: songsData } = await query.order('title');
      if (songsData) {
        setSongs(songsData);
      }
    } catch (err) {
      console.error('Error fetching songs:', err);
    }

    try {
      // Try to call backend API
      const resp = await fetch(`/api/student/get-progress?studentId=${studentId}`, {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('sb-access-token') || ''}`
        }
      });
      if (resp.ok && resp.headers.get('content-type')?.includes('application/json')) {
        const data = await resp.json();
        setProgressItems(data.progress || []);
        success = true;
      }
    } catch (err) {
      console.warn('API fetch failed, falling back to direct Supabase query:', err);
    }

    if (!success) {
      try {
        // Direct Supabase query fallback
        const premium = true;

        const { data: matrixItems } = await supabase
          .from('progress_matrix')
          .select('*')
          .eq('student_id', studentId)
          .order('updated_at', { ascending: false });

        // Apply asymmetric logic locally as fallback and deduplicate by topic_name
        const uniqueItemsMap = new Map<string, any>();
        (matrixItems || []).forEach((item: any) => {
          const name = (item.topic_name || '').trim().toLowerCase();
          if (name && !uniqueItemsMap.has(name)) {
            uniqueItemsMap.set(name, item);
          }
        });
        const sanitized = Array.from(uniqueItemsMap.values());

        setProgressItems(sanitized);
      } catch (err) {
        console.error('Error fetching progress matrix via fallback:', err);
      }
    }
    setProgressLoading(false);
  };


  const handleUpgrade = async () => {
    try {
      const resp = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: studentId })
      });
      if (resp.ok && resp.headers.get('content-type')?.includes('application/json')) {
        const data = await resp.json();
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }
      }
      
      // Fallback Mock Upgrade
      alert("Premium Upgrade wird geladen... (Simulation: Upgrade auf Premium erfolgt jetzt)");
      const { error } = await supabase
        .from('premium_status')
        .upsert({ student_id: studentId, is_premium_active: true });
      if (error) throw error;
      
      // Also update users.is_premium_user
      await supabase
        .from('users')
        .update({ is_premium_user: true })
        .eq('id', studentId);
        
      fetchStudentAndAvatar();
      fetchStudentProgress();
    } catch (err) {
      console.error(err);
      alert("Fehler beim Checkout-Prozess.");
    }
  };

  useEffect(() => {
    fetchStudentProgress();

    if (!studentId) return;
    const channel = supabase.channel(`realtime_student_progress_${studentId}`);
    channel
      .on('broadcast', { event: 'homework-changed' }, () => {
        fetchStudentProgress();
      })
      .on('broadcast', { event: 'challenge-approved' }, (payload: any) => {
        console.log('[Realtime] Challenge approved broadcast received:', payload);
        fetchStudentProgress();
        const songTitle = payload.payload?.songTitle || 'einem Song';
        alert(`Glückwunsch! Deine Challenge für "${songTitle}" wurde von deinem Lehrer bestätigt! 🏆🎉`);
      })
      .subscribe();

    const handleHomeworkUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.studentId === studentId) {
        fetchStudentProgress();
      }
    };
    window.addEventListener('homework-updated', handleHomeworkUpdate);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('homework-updated', handleHomeworkUpdate);
    };
  }, [studentId]);

  // Synchronize progressItems from DB into student_lehrwerke_progress in localStorage
  useEffect(() => {
    if (lehrwerke.length === 0 || progressItems.length === 0 || !studentId) return;

    try {
      const stored = localStorage.getItem('student_lehrwerke_progress');
      const parsed = stored ? JSON.parse(stored) : [];
      let hasChanges = false;

      lehrwerke.forEach(book => {
        const bookTitleLower = book.title.toLowerCase();
        
        // Find all progress items for this book
        const bookProgressItems = progressItems.filter(item => {
          const topicLower = (item.topic_name || '').toLowerCase();
          return topicLower.startsWith(bookTitleLower + ' - seite ');
        });

        if (bookProgressItems.length === 0) return;

        // Ensure the book is assigned locally if there are progress items for it in the DB
        let assignmentIndex = parsed.findIndex((item: any) => String(item.studentId) === String(studentId) && String(item.lehrwerkId) === String(book.id));
        if (assignmentIndex === -1) {
          const newAssignment = {
            studentId: studentId,
            lehrwerkId: book.id,
            assignedAt: new Date().toISOString(),
            pageStates: {}
          };
          parsed.push(newAssignment);
          assignmentIndex = parsed.length - 1;
          hasChanges = true;
        }
        const assignment = parsed[assignmentIndex];
        const pageStates = { ...assignment.pageStates };
        const pageSeen = new Set<number>();

        bookProgressItems.forEach(item => {
          const parts = item.topic_name.split(' - Seite ');
          const pageNumStr = parts[1];
          const pageNum = parseInt(pageNumStr, 10);
          if (isNaN(pageNum)) return;

          // Only process the latest entry for each page number (newest wins since progressItems is sorted updated_at DESC)
          if (pageSeen.has(pageNum)) return;
          pageSeen.add(pageNum);

          // Map database status/homework back to local status
          let localStatus: 'locked' | 'homework' | 'mastered' | 'purple' = 'locked';
          if (item.status === 'MASTERED') {
            localStatus = 'mastered';
          } else if (item.status === 'THEORY_DONE') {
            localStatus = 'purple';
          } else if (item.is_current_homework) {
            localStatus = 'homework';
          }

          const existingState = pageStates[pageNum];
          const dbItemTime = item.updated_at ? new Date(item.updated_at).getTime() : 0;
          const localItemTime = existingState?.updatedAt ? new Date(existingState.updatedAt).getTime() : 0;

          if (dbItemTime > localItemTime) {
            if (!existingState || existingState.status !== localStatus) {
              pageStates[pageNum] = {
                ...(existingState || {}),
                status: localStatus,
                updatedAt: item.updated_at || new Date().toISOString(),
                notes: item.teacher_notes || existingState?.notes || '',
                homework_notes: item.homework_notes || existingState?.homework_notes || ''
              };
              hasChanges = true;
            }
          }
        });

        assignment.pageStates = pageStates;
      });

      if (hasChanges) {
        console.log('student_lehrwerke_progress HAS CHANGES - WRITING TO LOCALSTORAGE:', parsed);
        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(parsed));
        setLocalProgress(parsed);
      }
    } catch (err) {
      console.error('Error synchronizing textbook progress from DB:', err);
    }
  }, [lehrwerke, progressItems, studentId]);

  useEffect(() => {
    if (!studentUser?.school_id) return;

    const channel = supabase
      .channel('realtime_student_class_focus_logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fokus_logs' }, () => {
        fetchClassHighlights(studentUser.school_id, studentUser.teacher_id, true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentUser?.school_id, studentUser?.teacher_id]);

  const fetchRanking = async () => {
    setRankingLoading(true);
    setRankingError(null);
    try {
      const resp = await fetch(`/api/ranking/global?userId=${studentId}`);
      if (resp.ok && resp.headers.get('content-type')?.includes('application/json')) {
        const data = await resp.json();
        setRankingData(data.ranking || []);
      } else {
        let errData: any = { error: 'Ranking konnte nicht geladen werden.' };
        if (resp.headers.get('content-type')?.includes('application/json')) {
          errData = await resp.json().catch(() => ({ error: 'Ranking konnte nicht geladen werden.' }));
        }
        setRankingError(errData.error || 'Fehler beim Laden des Rankings.');
      }
    } catch (err: any) {
      // Offline / direct Supabase fallback simulation for Campus Cup:
      try {
        const { data: user } = await supabase
          .from('users')
          .select('school_id, schools(name, allow_global_ranking)')
          .eq('id', studentId)
          .maybeSingle();

        const userSchoolName = (user?.schools as any)?.name || 'Meine Musikschule';
        // allowGlobal is bypassed - all schools can view global ranking!

        // Generate mock data representing fair Relative-Focus-Index (RFI)
        const mockSchools = [
          { name: 'Popakademie Berlin', rfi: 45.2, isOwnSchool: false },
          { name: 'Rock- & Jazzschule Freiburg', rfi: 38.5, isOwnSchool: false },
          { name: 'Musikschule Hamburg Nord', rfi: 32.1, isOwnSchool: false },
          { name: 'Tonkunst Stuttgart', rfi: 28.4, isOwnSchool: false },
          { name: 'Groove Academy Köln', rfi: 25.9, isOwnSchool: false },
          { name: userSchoolName, rfi: 18.4, isOwnSchool: true },
          { name: 'Klangwelt Dresden', rfi: 14.2, isOwnSchool: false },
          { name: 'School of Rock Leipzig', rfi: 9.8, isOwnSchool: false }
        ];

        mockSchools.sort((a, b) => b.rfi - a.rfi);
        const ranked = mockSchools.map((s, idx) => ({
          rank: idx + 1,
          name: s.name,
          rfi: s.rfi,
          isOwnSchool: s.isOwnSchool
        }));

        setRankingData(ranked);
      } catch (fallbackErr) {
        setRankingError('Fehler beim Laden des Rankings.');
      }
    } finally {
      setRankingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'campus_cup') {
      fetchRanking();
    }
  }, [activeTab, studentId]);

  // Pre-select homework topic automatically
  useEffect(() => {
    if (progressItems.length > 0 && !selectedTopic) {
      const hw = progressItems.find(i => i.is_current_homework);
      setSelectedTopic(hw ? hw.topic_name : (progressItems[0]?.topic_name || 'Allgemeines Üben'));
    }
  }, [progressItems, selectedTopic]);

  // Gyro Detox Engine Effect
  useEffect(() => {
    if (!sessionActive) {
      setIsPhoneFlat(false);
      setFlatType('none');
      setIsGraceActive(false);
      setGraceSecondsLeft(10);
      return;
    }

    const streak = avatar?.streak_flame || 0;
    const targetSeconds = getTargetMinutes(streak) * 60;

    let isOrientedFlat = false;
    let currentFlatType: 'face-up' | 'face-down' | 'none' = 'none';
    let isMoving = false;
    let motionTimeout: any = null;

    // Detect mobile and check if deviceorientation is available
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const usesSensors = isMobile && typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
    
    setIsDesktopFallback(!usesSensors);

    let graceWarningPlayed = false;

    // Timer interval
    const interval = setInterval(() => {
      if (preStartCountdownRef.current !== null) {
        return;
      }

      // Checkpoint check
      if (showCheckpoint) {
        setCheckpointSecondsLeft(prev => {
          if (prev <= 1) {
            // Failed checkpoint! Pause session.
            setSessionActive(false);
            setShowCheckpoint(false);
            playBeep(330, 600);
            return 20;
          }
          return prev - 1;
        });
        return; // Pause practice increment while checkpoint is active!
      }

      // In desktop mode, page visibility and active window focus matter.
      const isNowFlat = usesSensors 
        ? (isOrientedFlat && !isMoving && !document.hidden && (isMobile ? true : document.hasFocus()))
        : (isMobile ? !document.hidden : (!document.hidden && document.hasFocus()));

      // Update local states
      setIsPhoneFlat(isNowFlat);
      setFlatType(isNowFlat ? currentFlatType : 'none');

      if (isNowFlat) {
        setIsGraceActive(false);
        setGraceSecondsLeft(10);
        graceWarningPlayed = false;

        setSecondsElapsed(prev => {
          const nextVal = prev + 1;
          if (!isExtraTimeRef.current && nextVal >= targetSeconds) {
            setIsExtraTime(true);
            playSuccessChime();
          }

          // Trigger checkpoint popup every 5-8 minutes
          if (nextCheckpointSecondsRef.current > 0 && nextVal >= nextCheckpointSecondsRef.current) {
            setShowCheckpoint(true);
            setCheckpointSecondsLeft(20);
            nextCheckpointSecondsRef.current = nextVal + Math.floor(Math.random() * 180) + 300;
          }

          // Heartbeat update every 10 seconds
          if (nextVal % 10 === 0) {
            // Update heartbeat in DB
            const updateHeartbeat = async () => {
              try {
                if (currentLogIdRef.current) {
                  if (nextVal <= targetSeconds) {
                    const mins = Math.round(nextVal / 60);
                    await supabase
                      .from('fokus_logs')
                      .update({ duration_seconds: nextVal, duration_minutes: mins })
                      .eq('id', currentLogIdRef.current);
                  } else {
                    await supabase
                      .from('fokus_logs')
                      .update({ duration_seconds: targetSeconds, duration_minutes: Math.round(targetSeconds / 60) })
                      .eq('id', currentLogIdRef.current);
                    currentLogIdRef.current = null;
                  }
                }

                if (nextVal > targetSeconds) {
                  const extraSecs = nextVal - targetSeconds;
                  const extraMins = Math.round(extraSecs / 60);

                  if (!currentExtraLogIdRef.current) {
                    const { data } = await supabase
                      .from('fokus_logs')
                      .insert({
                        user_id: studentId,
                        duration_minutes: extraMins,
                        duration_seconds: extraSecs,
                        is_extra: true,
                        flame_level: getFlameLevelName(streak)
                      })
                      .select('id')
                      .single();
                    if (data) {
                      currentExtraLogIdRef.current = data.id;
                    }
                  } else {
                    await supabase
                      .from('fokus_logs')
                      .update({ duration_seconds: extraSecs, duration_minutes: extraMins })
                      .eq('id', currentExtraLogIdRef.current);
                  }
                } else if (!currentLogIdRef.current && currentExtraLogIdRef.current) {
                  const extraMins = Math.round(nextVal / 60);
                  await supabase
                    .from('fokus_logs')
                    .update({ duration_seconds: nextVal, duration_minutes: extraMins })
                    .eq('id', currentExtraLogIdRef.current);
                }
              } catch (err) {
                console.error('Heartbeat update failed:', err);
              }
            };
            updateHeartbeat();
          }

          return nextVal;
        });
      } else {
        if (!isExtraTimeRef.current) {
          // During the focus minutes: HARD RESET TO 0 IMMEDIATELY on interruption (no grace period)
          setSecondsElapsed(0);
          setIsExtraTime(false);
          setIsGraceActive(false);
          setSessionActive(false);
          playBeep(330, 600); // Fail tone
          if (navigator.vibrate) {
            navigator.vibrate([400, 100, 400]);
          }
        } else {
          // Once the focus minutes are reached: START FRIENDLY COUNTDOWN
          setIsGraceActive(true);
          
          setGraceSecondsLeft(prevGrace => {
            if (prevGrace <= 1) {
              // Grace period expired! Just pause the session. Do NOT reset to 0.
              setSessionActive(false);
              setIsGraceActive(false);
              playBeep(440, 300); // Friendly end tone
              return 10;
            }
            
            // Still in grace period, play warning tone once per interruption
            if (!graceWarningPlayed) {
              playBeep(660, 200); // Warning tone
              if (navigator.vibrate) {
                navigator.vibrate([100, 50, 100]);
              }
              graceWarningPlayed = true;
            }
            
            return prevGrace - 1;
          });
        }
      }
    }, 1000);

    // Orientation event handler
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const beta = e.beta;
      const gamma = e.gamma;
      
      if (beta === null || gamma === null) {
        // Fall back to flat if no orientation details
        isOrientedFlat = true;
        currentFlatType = 'face-up';
        return;
      }

      // Flat Face-Up: screen up, beta and gamma near 0
      const faceUp = Math.abs(beta) < 18 && Math.abs(gamma) < 18;
      
      // Flat Face-Down: screen down, beta near 180 (or -180) and gamma near 0
      const faceDown = Math.abs(Math.abs(beta) - 180) < 18 && Math.abs(gamma) < 18;
      
      isOrientedFlat = faceUp || faceDown;
      currentFlatType = faceDown ? 'face-down' : (faceUp ? 'face-up' : 'none');
    };

    // Motion event handler
    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.acceleration;
      if (!acc) return;
      const x = acc.x || 0;
      const y = acc.y || 0;
      const z = acc.z || 0;
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      
      // Filter out lower magnitude instrument vibrations (use 1.8 m/s^2)
      if (magnitude > 1.8) {
        isMoving = true;
        if (motionTimeout) clearTimeout(motionTimeout);
        motionTimeout = setTimeout(() => {
          isMoving = false;
        }, 1500);
      }
    };

    // Page Visibility & Window Focus listener
    const handleVisibilityChange = () => {
      const isWindowFocused = isMobile ? true : document.hasFocus();
      if (document.hidden || !isWindowFocused) {
        isOrientedFlat = false;
        currentFlatType = 'none';
        setIsPhoneFlat(false);
      }
    };

    if (usesSensors) {
      window.addEventListener('deviceorientation', handleOrientation);
      window.addEventListener('devicemotion', handleMotion);
    } else {
      isOrientedFlat = true;
      currentFlatType = 'face-up';
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      if (motionTimeout) clearTimeout(motionTimeout);
      if (usesSensors) {
        window.removeEventListener('deviceorientation', handleOrientation);
        window.removeEventListener('devicemotion', handleMotion);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [sessionActive, avatar?.streak_flame]);

  const handleSaveMood = async (selectedMood: 'sad' | 'neutral' | 'happy') => {
    if (!studentId) return;
    try {
      // Find the last log entry for this user
      const { data: logs, error: logsErr } = await supabase
        .from('fokus_logs')
        .select('id')
        .eq('user_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (logsErr) throw logsErr;
      const latestLog = logs?.[0];
      if (!latestLog || !latestLog.id) return;

      const { error } = await supabase
        .from('fokus_logs')
        .update({ mood: selectedMood })
        .eq('id', latestLog.id);

      if (error) throw error;

      // Update local state for logs
      setFokusLogs(prev => prev.map((log, idx) => idx === 0 ? { ...log, mood: selectedMood } : log));
      setLastSelectedMood(selectedMood);
    } catch (err: any) {
      console.error('Error saving mood check:', err);
    }
  };

  const handleSavePracticeAnchor = async (anchorText: string) => {
    try {
      const { error } = await supabase
        .from('student_stats')
        .upsert({
          student_id: studentId,
          practice_anchor: anchorText,
          updated_at: new Date().toISOString()
        });
      if (error) throw error;
      setPracticeAnchor(anchorText);
    } catch (err: any) {
      alert('Fehler beim Speichern des Ankers: ' + err.message);
    }
  };

  const finishPracticeSession = async () => {
    if (isFinishingSessionRef.current) return;
    isFinishingSessionRef.current = true;

    setSessionActive(false);
    if (secondsElapsed <= 0) {
      alert("Du hast noch nicht genug geübt, um die Session zu beenden. 🎸");
      isFinishingSessionRef.current = false;
      return;
    }

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const dayBeforeYesterday = new Date();
      dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
      const dayBeforeYesterdayStr = dayBeforeYesterday.toISOString().split('T')[0];

      // Fetch current stats
      const { data: stats } = await supabase
        .from('student_stats')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();

      const streak = avatar?.streak_flame || 0;
      const targetMins = getTargetMinutes(streak);
      const targetSeconds = targetMins * 60;
      const flameLevelName = getFlameLevelName(streak);

      let focusSeconds = 0;
      let extraSeconds = 0;

      if (secondsElapsed >= targetSeconds) {
        focusSeconds = targetSeconds;
        extraSeconds = secondsElapsed - targetSeconds;
      } else {
        focusSeconds = secondsElapsed;
        extraSeconds = 0;
      }

      // Convert to minutes (at least 1 if we have seconds, or rounded)
      const focusMinutes = focusSeconds > 0 ? Math.max(1, Math.round(focusSeconds / 60)) : 0;
      const extraMinutes = extraSeconds > 0 ? Math.round(extraSeconds / 60) : 0;

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      // Check if focus time was already logged today
      const { data: existingFocusLogs } = await supabase
        .from('fokus_logs')
        .select('id')
        .eq('user_id', studentId)
        .eq('is_extra', false)
        .gte('created_at', startOfDay.toISOString());

      const hasFocusLoggedToday = existingFocusLogs && existingFocusLogs.length > 0;

      const effectiveFocusSeconds = hasFocusLoggedToday ? 0 : focusSeconds;
      const effectiveFocusMinutes = hasFocusLoggedToday ? 0 : focusMinutes;
      const totalMinutes = effectiveFocusMinutes + extraMinutes;

      // Query today's already logged extra minutes to enforce the 60-minute daily cap on XP for extra time
      let todayExtraMinsLogged = 0;
      try {
        const { data: todayLogs } = await supabase
          .from('fokus_logs')
          .select('duration_minutes')
          .eq('user_id', studentId)
          .eq('is_extra', true)
          .gte('created_at', startOfDay.toISOString());
        if (todayLogs) {
          todayExtraMinsLogged = todayLogs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0);
        }
      } catch (err) {
        console.error('Error fetching today logs for cap:', err);
      }

      const remainingXpEligibleExtraMins = Math.max(0, 60 - todayExtraMinsLogged);
      const xpEligibleExtraMins = Math.min(extraMinutes, remainingXpEligibleExtraMins);
      const xpGained = effectiveFocusMinutes + xpEligibleExtraMins;

      let totalFocus = totalMinutes;
      let monthlyFocus = totalMinutes;
      let currentXp = xpGained;
      let streakFlame = streak;
      let lastPracticeDate = null;
      let lastSecuredDate = null;

      if (stats) {
        totalFocus = (stats.total_focus_minutes || 0) + totalMinutes;
        monthlyFocus = (stats.monthly_focus_minutes || 0) + totalMinutes;
        currentXp = (stats.current_xp || 0) + xpGained;
        streakFlame = stats.streak_flame || 0;
        lastPracticeDate = stats.last_practice_date ? String(stats.last_practice_date) : null;
        lastSecuredDate = lastPracticeDate;
      }

      if (studentUser?.joker_used_at) {
        const jokerDateStr = toLocalYYYYMMDD(new Date(studentUser.joker_used_at));
        if (!lastSecuredDate || jokerDateStr > lastSecuredDate) {
          lastSecuredDate = jokerDateStr;
        }
      }

      if (!lastSecuredDate && studentUser?.created_at) {
        lastSecuredDate = toLocalYYYYMMDD(new Date(studentUser.created_at));
      }

      // Check if this session completed the target or if target was already completed today
      const sessionCompletedTarget = !hasCompletedTargetToday && (secondsElapsed >= targetSeconds);
      let usedJokerThisSession = false;
      
      if (sessionCompletedTarget) {
        if (lastSecuredDate === yesterdayStr) {
          streakFlame += 1;
        } else if (lastSecuredDate === todayStr) {
          // Keep same streak
        } else if (lastSecuredDate) {
          const diffDays = getDaysBetweenLocal(lastSecuredDate, todayStr);
          const totalMissedDays = diffDays - 1;
          
          const currentWeek = getISOWeek(new Date());
          const lastJokerWeek = studentUser?.joker_used_at ? getISOWeek(new Date(studentUser.joker_used_at)) : null;
          const isJokerAvailable = !studentUser?.joker_used_at || lastJokerWeek !== currentWeek;

          let unprotectedMissedDays = totalMissedDays;
          if (isJokerAvailable && streak > 0) {
            unprotectedMissedDays = totalMissedDays - 1;
            usedJokerThisSession = true;
          }

          const decayedStreak = Math.max(0, streak - unprotectedMissedDays);
          streakFlame = decayedStreak + 1;
        } else {
          streakFlame = 1;
        }
      }

      const activeFlameLevel = (sessionCompletedTarget || hasCompletedTargetToday)
        ? getFlameLevelName(streakFlame)
        : getFlameLevelName(streak);

          // 3. Upsert stats
      await supabase.from('student_stats').upsert({
        student_id: studentId,
        total_focus_minutes: totalFocus,
        monthly_focus_minutes: monthlyFocus,
        streak_flame: streakFlame,
        last_practice_date: todayStr,
        current_xp: currentXp,
        practice_anchor: practiceAnchor,
        updated_at: new Date().toISOString()
      });

      // 4. Update avatar
      const { data: avatarRecord } = await supabase
        .from('avatars')
        .select('*')
        .eq('user_id', studentId)
        .maybeSingle();

      if (avatarRecord) {
        await supabase.from('avatars').update({
          xp: currentXp,
          streak_flame: streakFlame,
          last_focus_date: todayStr
        }).eq('id', avatarRecord.id);
      }

      // 5. Update user's joker_used_at if consumed
      if (usedJokerThisSession) {
        await supabase
          .from('users')
          .update({ joker_used_at: new Date().toISOString() })
          .eq('id', studentId);
      }

      setCelebrationDetails({
        xpGained: xpGained,
        streakFlame: streakFlame,
        sessionCompletedTarget: sessionCompletedTarget,
        usedJokerThisSession: usedJokerThisSession,
        streak: streak,
        sessionMinutes: totalMinutes,
        dailyGoal: getTargetMinutes(streakFlame)
      });
      setCelebrationRingProgress(0);
      setCelebrationExploded(false);
      setShowCelebration(true);
      setLastFinishedTimestamp(Date.now());
      
      // Clear highlight after 8 seconds
      setTimeout(() => {
        setLastFinishedTimestamp(null);
      }, 8000);

      setSecondsElapsed(0);
      setIsExtraTime(false);
      setShowCheckpoint(false);
      currentLogIdRef.current = null;
      currentExtraLogIdRef.current = null;
      fetchStudentAndAvatar(true);
      fetchStudentProgress(true);
      fetchFokusLogs();
      setSidebarTab('logbook');
      isFinishingSessionRef.current = false;

    } catch (err: any) {
      console.error('Error finishing session:', err);
      alert('Fehler beim Beenden der Session.');
      setSessionActive(true);
      isFinishingSessionRef.current = false;
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;
    setSavingProfile(true);
    try {
      const cleanFirstName = sanitizeTextInput(editingProfile.first_name);
      const cleanLastName = sanitizeTextInput(editingProfile.last_name);
      const cleanPhone = sanitizeTextInput(editingProfile.phone);
      const cleanInstrument = sanitizeTextInput(editingProfile.instrument);

      const { error } = await supabase
          .from('users')
          .update({
            first_name: cleanFirstName,
            last_name: cleanLastName,
            phone: cleanPhone,
            instrument: cleanInstrument,
            photo_url: editingProfile.photo_url
          })
          .eq('id', studentId);
      
      if (error) throw error;

      // Update local state
      const updatedProfile = {
        ...editingProfile,
        first_name: cleanFirstName,
        last_name: cleanLastName,
        phone: cleanPhone,
        instrument: cleanInstrument
      };
      setStudentUser((prev: any) => prev ? { ...prev, ...updatedProfile } : null);
      
      // Call parent update if exists
      if (onProfileUpdate) {
        onProfileUpdate({
          first_name: cleanFirstName,
          last_name: cleanLastName,
          phone: cleanPhone,
          instrument: cleanInstrument,
          photo_url: editingProfile.photo_url
        });
      }
      
      setShowEditProfile(false);
      alert('Profil erfolgreich gespeichert!');
    } catch (err: any) {
      console.error('Error updating student profile:', err);
      alert('Fehler beim Speichern: ' + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // Gyroscope API Hook for Digital Detox (beta angle)
  useEffect(() => {
    if (!isDetoxActive || detoxCompleted) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const beta = event.beta; // In degree [-180, 180]
      const gamma = event.gamma; // In degree [-90, 90]
      
      if (beta === null) return;
      
      // Placed flat on display (face down): beta is close to 180 or -180, or gamma is tilted.
      // A robust face down detection is Math.abs(beta) > 165 or (Math.abs(beta) < 15 and screen orientation flipped).
      // Let's use Math.abs(beta) > 160 or Math.abs(beta) < -160 or (Math.abs(gamma) > 75 and Math.abs(beta) > 150)
      const faceDown = Math.abs(beta) > 160 || Math.abs(beta) < -160;
      
      if (faceDown && !isFaceDown) {
        setIsFaceDown(true);
        // Play subtle confirmation beep
        playBeep(440, 100);
      } else if (!faceDown && isFaceDown) {
        setIsFaceDown(false);
        // Freeze timer and trigger haptic warning
        triggerWarning();
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [isDetoxActive, isFaceDown, detoxCompleted]);

  // Timer Tick Hook
  useEffect(() => {
    if (isDetoxActive && isFaceDown && detoxSecondsLeft > 0 && !detoxCompleted) {
      timerRef.current = setInterval(() => {
        setDetoxSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleDetoxSuccess();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isDetoxActive, isFaceDown, detoxSecondsLeft, detoxCompleted]);

  const triggerWarning = () => {
    // Haptic Vibrate Warning
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 300]);
    }
    // High-pitched warning beep
    playBeep(880, 400);
  };

  const playBeep = (freq: number, duration: number) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (duration / 1000));
    } catch (e) {
      console.warn("AudioContext warning beep failed:", e);
    }
  };

  const playSuccessChime = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const now = ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.15);
        
        gain.gain.setValueAtTime(0, now + index * 0.15);
        gain.gain.linearRampToValueAtTime(0.15, now + index * 0.15 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.15 + 1.2);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + index * 0.15);
        osc.stop(now + index * 0.15 + 1.5);
      });
    } catch (e) {
      console.warn("AudioContext success chime failed:", e);
    }
  };

  const fetchClassHighlights = async (schoolId: string, teacherId?: string | null, silent = false) => {
    if (!schoolId) return;

    // Rate-limit fetches to prevent rapid/infinite update loops (minimum 5s interval)
    const nowMs = Date.now();
    if (nowMs - lastHighlightsFetchRef.current < 5000) {
      return;
    }
    lastHighlightsFetchRef.current = nowMs;

    // Only set highlightsLoading to true on initial/first load to prevent layout flicker
    if (!silent && !highlightsLoadedRef.current) {
      setHighlightsLoading(true);
    }
    try {
      // 1. Fetch all students in this school
      const { data: schoolStudents } = await supabase
        .from('users')
        .select('id, first_name, last_name, teacher_id')
        .eq('school_id', schoolId)
        .eq('role', 'student');

      if (!schoolStudents || schoolStudents.length === 0) {
        setClassHighlights([]);
        return;
      }

      // Filter classmates (same teacher)
      const classmates = schoolStudents.filter(s => s.teacher_id === teacherId);
      setClassCount(classmates.length);
      setClassmateIds(classmates.map(c => c.id));

      const studentIds = schoolStudents.map(s => s.id);

      // Get school reset date (opening_hours.campus_stats_reset_at or stats_reset_at)
      let resetDate: Date | null = null;
      try {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('opening_hours')
          .eq('id', schoolId)
          .single();
        const oh = schoolData?.opening_hours;
        const resetDateStr = oh?.campus_stats_reset_at || oh?.stats_reset_at;
        if (resetDateStr) resetDate = new Date(resetDateStr);
      } catch (err) {
        console.warn('Could not load school reset date, using start of month:', err);
      }

      // 2. Fetch focus logs since September of current academic year for class annual statistics
      const startOfCurrentMonth = new Date();
      startOfCurrentMonth.setDate(1);
      startOfCurrentMonth.setHours(0, 0, 0, 0);

      const now = new Date();
      const currentMonth = now.getMonth();
      const startYear = currentMonth >= 8 ? now.getFullYear() : now.getFullYear() - 1;
      const annualStartDate = new Date(startYear, 8, 1, 0, 0, 0, 0);

      const queryStartDate = resetDate && resetDate < startOfCurrentMonth ? resetDate : startOfCurrentMonth;

      const classmateAndSelfIds = Array.from(new Set([...classmates.map(c => c.id), studentId]));
      const otherStudentIds = studentIds.filter(id => !classmateAndSelfIds.includes(id));

      const [classmateLogsRes, otherLogsRes] = await Promise.all([
        supabase
          .from('fokus_logs')
          .select('user_id, duration_minutes, created_at')
          .in('user_id', classmateAndSelfIds)
          .gte('created_at', annualStartDate.toISOString()),
        otherStudentIds.length > 0 ? supabase
          .from('fokus_logs')
          .select('user_id, duration_minutes, created_at')
          .in('user_id', otherStudentIds)
          .gte('created_at', queryStartDate.toISOString()) : Promise.resolve({ data: [] })
      ]);

      const focusLogs = [...(classmateLogsRes.data || []), ...(otherLogsRes.data || [])];

      setClassFocusLogs(focusLogs || []);

      // 3. Fetch mastered song skills for this month for classmates and self ONLY
      const { data: skills } = await supabase
        .from('user_song_skills')
        .select('user_id, progress_percent, instrument, is_stage_ready, last_practiced_at, songs(title)')
        .in('user_id', classmateAndSelfIds)
        .gte('last_practiced_at', queryStartDate.toISOString());

      // 4. Compute highlights for classmates ONLY
      const highlights: any[] = [];
      
      classmates.forEach((student: any) => {
        const studentLogs = (focusLogs || []).filter(log => log.user_id === student.id && new Date(log.created_at) >= startOfCurrentMonth);
        const studentSkills = (skills || []).filter(sk => sk.user_id === student.id && sk.last_practiced_at && new Date(sk.last_practiced_at) >= startOfCurrentMonth);

        const monthlyMins = studentLogs.reduce((sum: number, log: any) => sum + (log.duration_minutes || 0), 0);

        // Monthly Streak (weeks with practice)
        const monthlyWeeks = new Set();
        studentLogs.forEach((log: any) => {
          const d = new Date(log.created_at);
          const year = d.getFullYear();
          const firstDayOfYear = new Date(year, 0, 1);
          const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
          const week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
          monthlyWeeks.add(`${year}-${week}`);
        });
        const monthlyStreak = monthlyWeeks.size;

        const masteredThisMonth = studentSkills.filter((sk: any) => sk.progress_percent === 100 || sk.is_stage_ready);

        if (monthlyStreak >= 2) {
          highlights.push({
            studentName: `${student.first_name} ${student.last_name}`,
            emoji: '🔥',
            title: 'Monats-Konstanz',
            text: `Hat in ${monthlyStreak} verschiedenen Wochen diesen Monats geübt!`
          });
        }
        if (monthlyMins >= 120) {
          highlights.push({
            studentName: `${student.first_name} ${student.last_name}`,
            emoji: '⚡',
            title: 'Monats-Fokus',
            text: `Hat diesen Monat bereits ${monthlyMins} Minuten trainiert!`
          });
        }
        masteredThisMonth.forEach((sk: any) => {
          highlights.push({
            studentName: `${student.first_name} ${student.last_name}`,
            emoji: '🏆',
            title: 'Meilenstein',
            text: `Hat heute den Song "${(sk.songs as any)?.title || 'Song'}" gemeistert!`
          });
        });
      });

      // 5. Calculate class total mins vs other school mins since resetDate (used for donut chart)
      const filteredFocusLogs = (focusLogs || []).filter((log: any) => {
        if (resetDate) {
          return new Date(log.created_at) >= resetDate;
        }
        return new Date(log.created_at) >= startOfCurrentMonth;
      });

      let classMinsVal = 0;
      let otherClassMinsVal = 0;
      const classmateIdsSet = new Set(classmates.map(c => c.id));

      filteredFocusLogs.forEach((log: any) => {
        const mins = log.duration_minutes || 0;
        if (classmateIdsSet.has(log.user_id)) {
          classMinsVal += mins;
        } else {
          otherClassMinsVal += mins;
        }
      });

      setClassMins(classMinsVal);
      setOtherClassMins(otherClassMinsVal);

      // 6. Calculate weekly focus minutes for classmates and current student (last 7 days)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const weeklyLogs = (focusLogs || []).filter((log: any) => new Date(log.created_at) >= oneWeekAgo);
      
      const classWeeklySum = weeklyLogs.filter(log => classmateIdsSet.has(log.user_id)).reduce((sum, log) => sum + (log.duration_minutes || 0), 0);
      const myWeeklySum = weeklyLogs.filter(log => log.user_id === studentId).reduce((sum, log) => sum + (log.duration_minutes || 0), 0);
      
      setClassWeeklyFocus(classWeeklySum);
      setMyWeeklyFocus(myWeeklySum);

      setClassHighlights(highlights);
      highlightsLoadedRef.current = true;
    } catch (err) {
      console.error('Error fetching class highlights for student:', err);
    } finally {
      setHighlightsLoading(false);
    }
  };

  const fetchStudentAndAvatar = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setBriefingLoading(true);
      }
      setError(null);

      // Stage 1: Fetch user, avatar, stats, briefing, emails, missions, pins, and personal logs in parallel
      const [userRes, avatarRes, statsRes, briefingRes, emailRes, missionRes, pinsRes, logsRes] = await Promise.all([
        supabase
          .from('users')
          .select('*, schools(*)')
          .eq('id', studentId)
          .single(),
        supabase
          .from('avatars')
          .select('avatar_style, instrument_type, evolution_level, xp, asset_path, streak_flame, last_focus_date, id')
          .eq('user_id', studentId)
          .maybeSingle(),
        supabase
          .from('student_stats')
          .select('*')
          .eq('student_id', studentId)
          .maybeSingle(),
        fetch(`/api/briefing/student?userId=${studentId}`).catch(err => {
          console.warn('Briefing API offline or failed, falling back:', err);
          return null;
        }),
        Promise.resolve({ data: null, error: null } as any),
        supabase
          .from('student_missions')
          .select('*, mission_templates(*)')
          .eq('student_id', studentId)
          .maybeSingle(),
        supabase
          .from('one_time_upload_pins')
          .select('*')
          .eq('student_id', studentId),
        supabase
          .from('fokus_logs')
          .select('*')
          .eq('user_id', studentId)
          .order('created_at', { ascending: false })
      ]);

      if (userRes.error) throw userRes.error;
      const user = userRes.data;
      if (!user) return;

      let resolvedInst = user.instrument;
      if ((!resolvedInst || resolvedInst === 'Allgemein') && user.teacher_id) {
        const { data: teacherData } = await supabase
          .from('users')
          .select('instrument')
          .eq('id', user.teacher_id)
          .maybeSingle();
        if (teacherData?.instrument) {
          resolvedInst = teacherData.instrument;
        }
      }
      user.resolved_instrument = resolvedInst;



      setStudentUser(user);
      setSchoolFokusLevels(user.schools?.opening_hours?.fokus_levels || null);
      setIsAppUser(user.is_app_user ?? false);
      setIsPremiumUser((user.is_premium_user || user.is_active || user.is_campus_active) ?? false);
      setPushEnabled(user.push_notifications_enabled ?? false);
      setPushNotifScheduleChanges(user.push_notif_schedule_changes ?? true);
      setPushNotifHomework(user.push_notif_homework ?? false);
      setPushNotifAllFeatures(user.push_notif_all_features ?? false);

      const avatarRecord = avatarRes.data;
      if (avatarRes.error) throw avatarRes.error;

      let activeStreak = avatarRecord?.streak_flame || 0;
      let lastSecuredDateStr = avatarRecord?.last_focus_date || null;
      if (user?.joker_used_at) {
        const jokerDateStr = toLocalYYYYMMDD(new Date(user.joker_used_at));
        if (!lastSecuredDateStr || jokerDateStr > lastSecuredDateStr) {
          lastSecuredDateStr = jokerDateStr;
        }
      }
      if (!lastSecuredDateStr && user?.created_at) {
        lastSecuredDateStr = toLocalYYYYMMDD(new Date(user.created_at));
      }

      if (lastSecuredDateStr && activeStreak > 0) {
        const todayStr = toLocalYYYYMMDD(new Date());
        const diffDays = getDaysBetweenLocal(lastSecuredDateStr, todayStr);
        if (diffDays > 1) {
          const tempDate = new Date(lastSecuredDateStr);
          let currentDecayedStreak = activeStreak;
          const initialJokerWeek = user?.joker_used_at ? getISOWeek(new Date(user.joker_used_at)) : null;
          let lastJokerWeek = initialJokerWeek;
          
          let latestJokerDate: Date | null = null;
          let streakChanged = false;
          let jokerChanged = false;

          for (let i = 1; i < diffDays; i++) {
            const missedDate = new Date(tempDate.getTime());
            missedDate.setDate(tempDate.getDate() + i);
            const weekOfMissed = getISOWeek(missedDate);
            
            if (currentDecayedStreak > 0 && (!lastJokerWeek || weekOfMissed > lastJokerWeek)) {
              lastJokerWeek = weekOfMissed;
              latestJokerDate = new Date(missedDate.getFullYear(), missedDate.getMonth(), missedDate.getDate(), 12, 0, 0);
              jokerChanged = true;
            } else {
              const oldStreak = currentDecayedStreak;
              currentDecayedStreak = Math.max(0, currentDecayedStreak - 1);
              if (currentDecayedStreak !== oldStreak) {
                streakChanged = true;
              }
            }
          }

          if (streakChanged || jokerChanged) {
            if (streakChanged && avatarRecord) {
              avatarRecord.streak_flame = currentDecayedStreak;
              activeStreak = currentDecayedStreak;
              await supabase.from('avatars').update({ streak_flame: currentDecayedStreak }).eq('user_id', studentId);
              await supabase.from('student_stats').update({ streak_flame: currentDecayedStreak }).eq('student_id', studentId);
            }
            if (jokerChanged && latestJokerDate) {
              await supabase.from('users').update({ joker_used_at: latestJokerDate.toISOString() }).eq('id', studentId);
              user.joker_used_at = latestJokerDate.toISOString();
            }
          }
        }
      }

      if (!avatarRecord && user.is_app_user) {
        setShowSelector(true);
      } else {
        setAvatar(avatarRecord);
      }

      const statsData = statsRes.data;
      setMonthlyFocusMinutes(statsData?.monthly_focus_minutes || 0);
      setTotalFocusMinutes(statsData?.total_focus_minutes || 0);

      if (statsData) {
        setPracticeAnchor(statsData.practice_anchor || null);
      }

      // Assign student missions and pins immediately
      setStudentMissionProgress(missionRes.data || null);
      setStudentPins(pinsRes.data || []);

      // Assign personal fokus logs immediately (anti-waterfall)
      if (!logsRes.error && logsRes.data) {
        setFokusLogs(logsRes.data);
        const todayStr = new Date().toISOString().split('T')[0];
        const todayLogs = logsRes.data.filter((log: any) => log.created_at && log.created_at.startsWith(todayStr));
        const nonExtraMinutes = todayLogs
          .filter((log: any) => !log.is_extra)
          .reduce((sum: number, log: any) => sum + (log.duration_minutes || 0), 0);
        
        const streak = avatarRecord?.streak_flame || 0;
        const targetMins = getTargetMinutes(streak);
        setHasCompletedTargetToday(nonExtraMinutes >= targetMins);
      }

      // Stage 2: Fetch classmates, highlights, announcements, and school goals in parallel (all depend on user config)
      if (user.school_id) {
        const [classmatesRes, highlightsRes, announcementsRes, schoolRes, feedInteractionsRes] = await Promise.all([
          supabase
            .from('users')
            .select('id')
            .eq('teacher_id', user.teacher_id)
            .eq('school_id', user.school_id),
          fetchClassHighlights(user.school_id, user.teacher_id, silent),
          supabase
            .from('campus_announcements')
            .select('*, users(first_name, last_name, photo_url)')
            .eq('school_id', user.school_id)
            .order('created_at', { ascending: false }),
          supabase
            .from('schools')
            .select('opening_hours')
            .eq('id', user.school_id)
            .single(),
          supabase
            .from('feed_interactions')
            .select('*')
            .eq('post_type', 'campus')
        ]);

        // Process interactions
        if (feedInteractionsRes && feedInteractionsRes.data) {
          setFeedInteractions(feedInteractionsRes.data);
        }

        // Process announcements
        if (!announcementsRes.error && announcementsRes.data) {
          const parsed = announcementsRes.data.map((ann: any) => ({
            id: ann.id,
            title: ann.title,
            content: ann.message,
            target_type: ann.target_type || 'all',
            category: ann.category || 'general',
            is_emergency: ann.is_emergency || false,
            attachment_url: ann.attachment_url || null,
            created_at: ann.created_at,
            user: ann.users
          }));
          setCampusFeedAnnouncements(parsed.filter((ann: any) => ann.target_type === 'all' || ann.target_type === 'students'));
        } else {
          setCampusFeedAnnouncements([]);
        }

        // Fetch Class Feed posts
        const { data: classPosts } = await supabase
          .from('class_feed_posts')
          .select('*')
          .eq('teacher_id', user.teacher_id)
          .or(`student_id.is.null,student_id.eq.${studentId}`)
          .order('created_at', { ascending: false });
        if (classPosts) {
          setClassFeedPosts(classPosts);
        }

        // Fetch Class Feed interactions
        const { data: classInterData } = await supabase
          .from('feed_interactions')
          .select('*')
          .eq('post_type', 'class');
        if (classInterData) {
          setClassFeedInteractions(classInterData);
        }

        // Process school targets / class goals
        const schoolData = schoolRes.data;
        const rawTargets = schoolData?.opening_hours?.weekly_targets?.[user.teacher_id];
        let goals: any[] = [];
        if (Array.isArray(rawTargets)) {
          goals = rawTargets;
        } else if (typeof rawTargets === 'number') {
          goals = [{ id: 'default', title: 'Klassenziel', minutes: rawTargets, deadline: '' }];
        }
        setClassGoals(goals);

        // Process classmates weekly practice minutes (depends on classmates list)
        if (classmatesRes.data && classmatesRes.data.length > 0 && goals.length > 0) {
          const classmateIds = classmatesRes.data.map((c: any) => c.id);
          const now = new Date();
          const monday = new Date(now);
          const day = now.getDay();
          const diff = day === 0 ? -6 : 1 - day;
          monday.setDate(now.getDate() + diff);
          monday.setHours(0, 0, 0, 0);
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);
          sunday.setHours(23, 59, 59, 999);

          const { data: practiceData } = await supabase
            .from('practice_sessions')
            .select('duration_minutes')
            .in('student_id', classmateIds)
            .gte('created_at', monday.toISOString())
            .lte('created_at', sunday.toISOString());

          const totalMins = (practiceData || []).reduce(
            (sum: number, s: any) => sum + (s.duration_minutes || 0), 0
          );
          setClassWeeklyMins(totalMins);
        }
      }

      // Stage 3: Read briefing response from Stage 1
      let briefingJsonLoaded = false;
      if (briefingRes && briefingRes.ok) {
        try {
          const bd = await briefingRes.json();
          if (bd && bd.success) {
            setRawBriefingData(bd);
            briefingJsonLoaded = true;
          }
        } catch (e) {
          console.error('Error parsing briefing JSON:', e);
        }
      }

      if (!briefingJsonLoaded) {
        // Fallback local query
        try {
          const schoolId = user.school_id || (user as any).school_id;
          const currentSchoolId = schoolId;

          if (currentSchoolId) {
            const { data: schoolData } = await supabase
              .from('schools')
              .select('allow_messages_global')
              .eq('id', currentSchoolId)
              .single();
            const allowMessages = schoolData?.allow_messages_global ?? true;

            const rawDay = new Date().getDay();
            const todayWeekday = rawDay === 0 ? 7 : rawDay;

            const { data: todaySchedules } = await supabase
              .from('schedules')
              .select(`
                id,
                time_slot,
                status,
                teacher_id,
                rooms (name),
                teacher:users!schedules_teacher_id_fkey (first_name, last_name)
              `)
              .eq('student_id', studentId)
              .eq('day_of_week', todayWeekday)
              .maybeSingle();

            let todayLesson = null;
            if (todaySchedules) {
              const teacherName = todaySchedules.teacher 
                ? `Herr/Frau ${(todaySchedules.teacher as any).last_name}` 
                : 'Lehrkraft';
              todayLesson = {
                id: todaySchedules.id,
                time: todaySchedules.time_slot,
                room: (todaySchedules.rooms as any)?.name || 'Unterrichtsraum',
                teacher: teacherName,
                teacher_id: todaySchedules.teacher_id,
                status: todaySchedules.status,
                displayString: `Heute ${todaySchedules.time_slot} Uhr, ${(todaySchedules.rooms as any)?.name || 'Raum'} bei ${teacherName}`
              };
            }

            const currentXp = avatarRecord?.xp || 0;
            const currentLevel = avatarRecord?.evolution_level || 1;
            const milestoneTarget = 50;
            const remainingXp = milestoneTarget - (currentXp % milestoneTarget);

            setRawBriefingData({
              success: true,
              allowMessagesGlobal: allowMessages,
              todayLesson,
              gamification: {
                streakFlame: avatarRecord?.streak_flame || (user.is_premium_user && avatarRecord?.avatar_style === 'Premium_Hero' ? 6 : 0),
                evolutionLevel: currentLevel,
                currentXp,
                remainingXp,
                xpTargetMessage: `Noch ${remainingXp} XP bis zum heutigen Meilenstein!`,
                avatarStyle: avatarRecord?.avatar_style || 'Standard_Silhouette',
                instrumentType: avatarRecord?.instrument_type || 'Unknown'
              }
            });
          }
        } catch (err) {
          console.error('Error in student briefing fallback:', err);
        }
      }
      setBriefingLoading(false);
    } catch (err: any) {
      console.error('Error loading student avatar:', err);
      setError('Fehler beim Laden des Profils.');
      setBriefingLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadAvatarWithPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAvatarFile) {
      alert('Bitte wähle zuerst ein Bild aus.');
      return;
    }
    if (!pinInput.trim()) {
      alert('Bitte gib die PIN ein.');
      return;
    }

    setIsUploadingCustomAvatar(true);
    try {
      const fileExt = customAvatarFile.name.split('.').pop();
      const fileName = `${studentId}_avatar_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('groovelab-assets')
        .upload(filePath, customAvatarFile);
      
      let finalPublicUrl = '';
      if (uploadErr) {
        console.warn('Storage upload failed, falling back to data URL:', uploadErr);
        const reader = new FileReader();
        finalPublicUrl = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(customAvatarFile);
        });
      } else {
        const { data: publicUrlData } = supabase.storage
          .from('groovelab-assets')
          .getPublicUrl(filePath);
        finalPublicUrl = publicUrlData.publicUrl;
      }

      // Call secure RPC to verify pin code and update users/one-time-pins tables
      const { data: verifyResult, error: verifyErr } = await supabase.rpc('verify_photo_upload_pin', {
        p_student_id: studentId,
        p_pin_code: pinInput.trim(),
        p_photo_url: finalPublicUrl
      });
      
      if (verifyErr || !verifyResult) {
        alert(verifyErr?.message || 'Ungültige oder bereits verwendete PIN!');
        setIsUploadingCustomAvatar(false);
        return;
      }

      if (studentMissionProgress && studentMissionProgress.current_level === 2) {
        await supabase
          .from('student_missions')
          .update({ current_level: 3, unlocked_at: new Date().toISOString() })
          .eq('student_id', studentId);
      }

      alert('Erfolgreich! Dein Bild wurde hochgeladen und dein Level wurde aktualisiert.');
      setPinInput('');
      setCustomAvatarFile(null);
      fetchStudentAndAvatar();
    } catch (err: any) {
      console.error('Error during pin upload:', err);
      alert('Fehler beim Upload: ' + err.message);
    } finally {
      setIsUploadingCustomAvatar(false);
    }
  };

  const handleStartDetox = () => {
    setDetoxSecondsLeft(detoxMinutes * 60);
    setIsDetoxActive(true);
    setIsFaceDown(false);
    setDetoxCompleted(false);
    setShowDetox(true);
  };

  const handleDetoxSuccess = async () => {
    setDetoxCompleted(true);
    setIsDetoxActive(false);
    playBeep(523.25, 600); // Success musical tone

    try {
      const resp = await fetch('/api/complete-detox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: studentId,
          durationMinutes: detoxMinutes
        })
      });

      if (!resp.ok) {
        // Fallback local update if server completed offline
        const newXp = (avatar?.xp || 0) + 10;
        const currentStreak = (avatar?.streak_flame || 0) + 1;
        await supabase.from('avatars').update({
          xp: newXp,
          streak_flame: currentStreak,
          last_focus_date: new Date().toISOString().split('T')[0]
        }).eq('user_id', studentId);
      }

      fetchStudentAndAvatar();
    } catch (err) {
      console.error("Error finalizing focus session:", err);
    }
  };

  const loadWrappedStory = async () => {
    setWrappedLoading(true);
    try {
      const resp = await fetch(`/api/wrapped?userId=${studentId}`);
      if (resp.ok && resp.headers.get('content-type')?.includes('application/json')) {
        const data = await resp.json();
        setWrappedData(data);
      } else {
        // Fallback local mock data
        setWrappedData({
          success: true,
          isPremium: isPremiumUser,
          avatarStyle: isPremiumUser ? 'Premium_Hero' : 'Standard_Silhouette',
          avatarUrl: isPremiumUser ? (avatar?.asset_path || '/avatars/hero_guitarist_lvl1.png') : '/avatars/silhouette_grey.png',
          monthlyFlashback: {
            focusMinutes: isPremiumUser ? 280 : null,
            masteredSongsCount: isPremiumUser ? 4 : null,
            badgeName: isPremiumUser ? 'Mai-Fokus-Badge 🏆' : 'Gesperrt 🔒',
            badgeCode: 'Badge_Mai_2026'
          },
          campusWrapped: {
            focusMinutes: isPremiumUser ? 1420 : null,
            masteredSongsCount: isPremiumUser ? 18 : null
          }
        });
      }
      setStorySlide(0);
      setShowWrapped(true);
    } catch (e) {
      console.error(e);
    } finally {
      setWrappedLoading(false);
    }
  };

  const handleCancelLesson = async (scheduleId: string) => {
    if (!confirm('Möchtest du den heutigen Unterricht wirklich absagen? Der Slot wird für andere freigegeben.')) return;
    try {
      const resp = await fetch('/api/schedule/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId, studentId })
      });
      if (resp.ok) {
        fetchStudentAndAvatar();
        return;
      }
      const { error } = await supabase
        .from('schedules')
        .update({ status: 'canceled_by_student' })
        .eq('id', scheduleId);
      if (error) throw error;
      fetchStudentAndAvatar();
    } catch (err) {
      console.error(err);
      alert('Fehler beim Absagen des Unterrichts.');
    }
  };

  const handleParentApproval = async (scheduleId: string, approve: boolean) => {
    try {
      const nextStatus = approve ? 'approved' : 'canceled_by_student';
      const resp = await fetch('/api/schedule/approve-parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId, approve })
      });
      if (resp.ok) {
        fetchStudentAndAvatar();
        return;
      }
      const { error } = await supabase
        .from('schedules')
        .update({ status: nextStatus })
        .eq('id', scheduleId);
      if (error) throw error;
      fetchStudentAndAvatar();
    } catch (err) {
      console.error(err);
      alert('Fehler bei der Bestätigung.');
    }
  };

  const handleSelectHero = async (heroClassId: string) => {
    setSubmittingSelection(true);
    try {
      const response = await fetch('/api/select-avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${studentId}`
        },
        body: JSON.stringify({ heroClassId })
      });

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const result = await response.json();
        setAvatar(result.avatar);
        setShowSelector(false);
        return;
      }

      const assetPaths: Record<string, string> = {
        guitarist: '/avatars/hero_guitarist_lvl1.png',
        drummer: '/avatars/hero_drummer_lvl1.png',
        keyboardist: '/avatars/hero_keys_lvl1.png',
        vocalist: '/avatars/hero_vocals_lvl1.png'
      };

      const fallbackAvatar = {
        user_id: studentId,
        avatar_style: 'Premium_Hero',
        instrument_type: heroClassId,
        evolution_level: 1,
        xp: 0,
        asset_path: assetPaths[heroClassId] || '/avatars/silhouette_standard.png',
        streak_flame: 0
      };

      const { data, error } = await supabase
        .from('avatars')
        .upsert(fallbackAvatar)
        .select('*')
        .single();

      if (error) throw error;
      await supabase.from('users').update({ avatar_url: fallbackAvatar.asset_path }).eq('id', studentId);

      setAvatar(data as Avatar);
      setShowSelector(false);
    } catch (err: any) {
      setError('Auswahl fehlgeschlagen.');
    } finally {
      setSubmittingSelection(false);
    }
  };

  if (loading && (!studentUser || !avatar)) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Lade Campus-Profil...</p>
      </div>
    );
  }



  // WENN IS_APP_USER = TRUE (Selector Screen if no avatar chosen yet)
  if (showSelector) {
    return (
      <div className="max-w-xl mx-auto bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl animate-fadeIn">
        <div className="text-center mb-6">
          <Sparkles className="h-8 w-8 text-indigo-500 mx-auto mb-2" />
          <h3 className="text-2xl font-black text-white tracking-tight">Wähle deinen Helden!</h3>
          <p className="text-sm text-slate-400 mt-1">Welche Musiker-Klasse passt zu dir? Du kannst sofort XP sammeln.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {HERO_CLASSES.map(hc => (
            <button
              key={hc.id}
              onClick={() => handleSelectHero(hc.id)}
              disabled={submittingSelection}
              className="p-5 bg-slate-950/60 hover:bg-indigo-950/30 border border-slate-800 hover:border-indigo-500 rounded-2xl text-left transition-all duration-200 group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl bg-slate-900 p-2.5 rounded-xl group-hover:scale-110 transition-transform" style={{ filter: 'grayscale(100%)' }}>{hc.icon}</span>
                <div>
                  <span className="block font-extrabold text-white text-base group-hover:text-indigo-400 transition-all">{hc.name}</span>
                  <span className="block text-xs text-slate-400 font-semibold mt-1 leading-relaxed">{hc.desc}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const currentLevel = avatar.evolution_level || 1;
  const currentXp = avatar.xp || 0;
  const { levelTitle, prevThreshold, nextThreshold, xpPercentage } = getLevelProgress(currentLevel, currentXp, avatar.instrument_type);

  // Circular progress calculations for fit style ring
  const circleRadius = 70;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference - (xpPercentage / 100) * circleCircumference;

  return (
    <div style={{ fontFamily: '"Outfit", "Inter", sans-serif', maxWidth: '100%', margin: '0 auto', width: '100%', paddingTop: '24px' }}>
      
      {/* Holiday Banner */}
      {isTodayHoliday && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(52, 168, 83, 0.1) 0%, rgba(255, 255, 255, 0.98) 100%)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(52, 168, 83, 0.18)',
          padding: '18px 24px',
          borderRadius: '24px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          boxShadow: '0 10px 30px -10px rgba(52, 168, 83, 0.08), 0 1px 3px rgba(0, 0, 0, 0.01)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }} className="hover-scale-subtle">
          {/* Subtle background glow */}
          <div style={{
            position: 'absolute',
            right: '-30px',
            top: '-30px',
            width: '120px',
            height: '120px',
            background: 'radial-gradient(circle, rgba(52, 168, 83, 0.12) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          
          {/* Icon Badge */}
          <div style={{
            background: 'rgba(52, 168, 83, 0.08)',
            border: '1.5px solid rgba(52, 168, 83, 0.12)',
            color: '#34a853',
            padding: '12px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(52, 168, 83, 0.04)'
          }}>
            <Palmtree size={22} strokeWidth={2.2} />
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 900,
                color: '#34a853',
                background: 'rgba(52, 168, 83, 0.08)',
                padding: '3px 8px',
                borderRadius: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em'
              }}>
                Schulfrei
              </span>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist', letterSpacing: '-0.01em' }}>
                {isTodayHoliday.name}
              </h4>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.82rem', color: '#475569', fontWeight: 600, lineHeight: 1.4 }}>
              Vom <strong style={{ color: '#34a853', fontWeight: 800 }}>{new Date(isTodayHoliday.start).toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit'})}</strong> bis zum <strong style={{ color: '#34a853', fontWeight: 800 }}>{new Date(isTodayHoliday.end).toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit'})}</strong> findet kein regulärer Unterricht statt. Genieße die Ferien!
            </p>
          </div>
        </div>
      )}
      
      {/* Top Tab Switcher - Removed per user request */}
      <div style={{ display: 'none', gap: '8px', background: '#f1f3f4', padding: '6px', borderRadius: '100px', marginBottom: '24px' }}>
        <button
          onClick={() => handleTabChangeLocal('briefing')}
          style={{
            flex: 1,
            border: 'none',
            background: activeTab === 'briefing' ? '#ffffff' : 'transparent',
            color: activeTab === 'briefing' ? '#0b57d0' : '#5f6368',
            padding: '10px 16px',
            borderRadius: '100px',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: activeTab === 'briefing' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Coffee size={15} />
          <span>Briefing</span>
        </button>
        
        <button
          onClick={() => handleTabChangeLocal('songs')}
          style={{
            flex: 1.2,
            border: 'none',
            background: activeTab === 'songs' ? '#ffffff' : 'transparent',
            color: activeTab === 'songs' ? '#0b57d0' : '#5f6368',
            padding: '10px 16px',
            borderRadius: '100px',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: activeTab === 'songs' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Music size={15} />
          <span>Songs & Material</span>
        </button>

        <button
          onClick={() => handleTabChangeLocal('practice_board')}
          style={{
            flex: 1.2,
            border: 'none',
            background: activeTab === 'practice_board' ? '#ffffff' : 'transparent',
            color: activeTab === 'practice_board' ? '#0b57d0' : '#5f6368',
            padding: '10px 16px',
            borderRadius: '100px',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: activeTab === 'practice_board' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Clock size={15} />
          <span>Übe-Board</span>
        </button>

        <button
          onClick={() => handleTabChangeLocal('campus_cup')}
          style={{
            flex: 1.2,
            border: 'none',
            background: activeTab === 'campus_cup' ? '#ffffff' : 'transparent',
            color: activeTab === 'campus_cup' ? '#0b57d0' : '#5f6368',
            padding: '10px 16px',
            borderRadius: '100px',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: activeTab === 'campus_cup' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Trophy size={15} />
          <span>Performance & Highlights</span>
        </button>

        <button
          onClick={() => handleTabChangeLocal('hero')}
          style={{
            flex: 1,
            border: 'none',
            background: activeTab === 'hero' ? '#ffffff' : 'transparent',
            color: activeTab === 'hero' ? '#0b57d0' : '#5f6368',
            padding: '10px 16px',
            borderRadius: '100px',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: activeTab === 'hero' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Star size={15} />
          <span>Mein Held</span>
        </button>
      </div>

      <div id="tour-student-practice" style={{ display: activeTab === 'practice_board' ? 'flex' : 'none', flexDirection: 'row', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }} className="animation-slide-up">
          
          {/* Left Pane (2/3 width) - KPIs and Fokus-Timer */}
          <div style={{ flex: '2 1 500px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* KPI Cards Grid */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: '14px', width: '100%' }} className="kpi-row-container">
              
              {/* Card 1: XP */}
              {xpActive && (
                <div style={{ 
                  flex: '1 1 0px',
                  minWidth: 0,
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', 
                  borderRadius: '20px', 
                  color: 'white', 
                  padding: '16px', 
                  boxShadow: '0 4px 15px rgba(99, 102, 241, 0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }} className="kpi-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="kpi-card-title">Gesammelte XP</span>
                    <Star size={16} fill="currentColor" />
                  </div>
                  <span style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: "'Urbanist', sans-serif" }} className="kpi-card-value">{avatar?.xp || 0} XP</span>
                </div>
              )}

              {/* Card 2: Practice Minutes */}
              {flamesActive && (
                <div style={{ 
                  flex: '1 1 0px',
                  minWidth: 0,
                  background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)', 
                  borderRadius: '20px', 
                  color: 'white', 
                  padding: '16px', 
                  boxShadow: '0 4px 15px rgba(52, 168, 83, 0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }} className="kpi-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="kpi-card-title">Übeminuten</span>
                    <Clock size={16} />
                  </div>
                  <span style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: "'Urbanist', sans-serif" }} className="kpi-card-value">{totalFocusMinutes || 0} Min.</span>
                </div>
              )}

              {/* Card 3: Focus Time Today */}
              <div style={{ 
                flex: '1 1 0px',
                minWidth: 0,
                background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)', 
                borderRadius: '20px', 
                color: 'white', 
                padding: '16px', 
                boxShadow: '0 4px 15px rgba(234, 179, 8, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }} className="kpi-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="kpi-card-title">Fokus Heute</span>
                  <Activity size={16} />
                </div>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: "'Urbanist', sans-serif", display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px' }} className="kpi-card-value">{(() => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const todayLogs = fokusLogs.filter(log => log.created_at && log.created_at.startsWith(todayStr));
                  
                  // DB sums
                  const dbFocusSecs = todayLogs.filter(l => !l.is_extra).reduce((sum, log) => sum + (log.duration_seconds || ((log.duration_minutes || 0) * 60)), 0);
                  const dbExtraSecs = todayLogs.filter(l => l.is_extra).reduce((sum, log) => sum + (log.duration_seconds || ((log.duration_minutes || 0) * 60)), 0);
                  
                  // Live session sums
                  let liveFocusSecs = 0;
                  let liveExtraSecs = 0;
                  if (sessionActive) {
                    const targetSeconds = getTargetMinutes(avatar?.streak_flame || 0) * 60;
                    if (secondsElapsed >= targetSeconds) {
                      liveFocusSecs = targetSeconds;
                      liveExtraSecs = secondsElapsed - targetSeconds;
                    } else {
                      liveFocusSecs = secondsElapsed;
                    }
                  }
                  
                  const totalFocusSecs = dbFocusSecs + liveFocusSecs;
                  const totalExtraSecs = dbExtraSecs + liveExtraSecs;
                  
                  const focusMin = Math.floor(totalFocusSecs / 60);
                  const extraMin = Math.floor(totalExtraSecs / 60);
                  
                  if (totalExtraSecs > 0) {
                    return (
                      <>
                        <span>{focusMin}m</span>
                        <span style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: 800 }}>({extraMin}m Extra)</span>
                      </>
                    );
                  }
                  return `${focusMin} Min`;
                })()}</span>
              </div>

              {/* Card 4: Streak-Pfad & Joker */}
              {flamesActive && (
                <div style={{ 
                  flex: '1 1 0px',
                  minWidth: 0,
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
                  borderRadius: '20px', 
                  color: 'white', 
                  padding: '16px', 
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '100px'
                }} className="kpi-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="kpi-card-title">Streak-Pfad</span>
                    <Flame size={16} fill="currentColor" />
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }} className="kpi-streak-footer">
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 'fit-content' }}>
                      <span style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: "'Urbanist', sans-serif", lineHeight: 1.1 }} className="kpi-card-value">
                        {avatar?.streak_flame || 0} Tage
                      </span>
                    </div>
                    
                    {(() => {
                      const currentWeek = getISOWeek(new Date());
                      const lastJokerWeek = studentUser?.joker_used_at ? getISOWeek(new Date(studentUser.joker_used_at)) : null;
                      const isJokerAvailable = !studentUser?.joker_used_at || lastJokerWeek !== currentWeek;
                      
                      return (
                        <span style={{ 
                          fontSize: '0.62rem', 
                          fontWeight: 800, 
                          background: isJokerAvailable 
                            ? 'rgba(255, 255, 255, 0.16)' 
                            : 'rgba(0, 0, 0, 0.2)',
                          backdropFilter: 'blur(8px)',
                          WebkitBackdropFilter: 'blur(8px)',
                          border: isJokerAvailable 
                            ? '1px solid rgba(255, 255, 255, 0.4)' 
                            : '1px solid rgba(255, 255, 255, 0.08)',
                          color: isJokerAvailable ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
                          padding: '6px 10px', 
                          borderRadius: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: '1.2',
                          textAlign: 'center',
                          boxShadow: isJokerAvailable 
                            ? '0 4px 12px rgba(0, 0, 0, 0.06), inset 0 1px 1px rgba(255, 255, 255, 0.15)' 
                            : 'none',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          flexShrink: 0
                        }} title="1 Joker pro Woche verfügbar">
                          {isJokerAvailable ? (
                            <>
                              <span style={{ opacity: 0.8 }}>Joker</span>
                              <span style={{ fontWeight: 900 }}>Bereit</span>
                            </>
                          ) : (
                            <>
                              <span style={{ opacity: 0.6 }}>Joker</span>
                              <span style={{ fontWeight: 900, opacity: 0.8 }}>Verbraucht</span>
                            </>
                          )}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              )}



            </div>

            {/* Fokus-Timer Box */}
            <div style={sessionActive ? {
              position: 'fixed',
              inset: 0,
              zIndex: 9998,
              background: isExtraTime ? 'linear-gradient(135deg, #34a853 0%, #022c22 100%)' : '#000000',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxSizing: 'border-box',
              padding: '24px'
            } : {
              background: 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              borderRadius: '32px',
              padding: '36px 30px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(255, 255, 255, 0.4) inset',
              display: 'flex',
              flexDirection: 'column',
              gap: '28px',
              alignItems: 'center',
              position: 'relative',
              overflow: 'hidden',
              color: 'inherit',
              transition: 'all 0.5s ease'
            }}>
              {/* Inner wrapper to keep size consistent and centered on black screen */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '28px',
                alignItems: 'center',
                width: '100%',
                maxWidth: sessionActive ? '380px' : 'none'
              }}>
              {/* Header */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '14px', 
                width: '100%', 
                borderBottom: sessionActive ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(241, 245, 249, 0.6)', 
                paddingBottom: '18px' 
              }}>
                <div style={{ 
                  background: sessionActive ? 'rgba(255, 255, 255, 0.12)' : '#e6f4ea', 
                  color: sessionActive ? '#ffffff' : '#34a853', 
                  padding: '10px', 
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: sessionActive ? 'none' : '0 4px 12px rgba(52, 168, 83, 0.08)'
                }}>
                  <Clock size={20} />
                </div>
                <div>
                  <h4 style={{ 
                    fontWeight: 800, 
                    fontSize: '20px', 
                    color: sessionActive ? '#ffffff' : '#0f172a', 
                    margin: 0, 
                    letterSpacing: '-0.02em' 
                  }}>Fokus-Timer</h4>
                  <p style={{ 
                    fontSize: '0.78rem', 
                    color: sessionActive ? 'rgba(255, 255, 255, 0.6)' : '#64748b', 
                    margin: '4px 0 0 0', 
                    fontWeight: 550, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px' 
                  }}>
                    {isExtraTime ? (
                      <>
                        <Award size={14} style={{ color: '#ffffff', flexShrink: 0 }} />
                        <span style={{ color: '#ffffff', fontWeight: 600 }}>Du bist in der Extra-Zeit!</span>
                      </>
                    ) : (
                      <>
                        <Smartphone size={14} style={{ color: sessionActive ? '#ffffff' : '#34a853', flexShrink: 0 }} />
                        <span>Handy mit dem Display nach unten hinlegen</span>
                      </>
                    )}
                  </p>
                </div>

                {/* Level progression inside the header on the right */}
                {!sessionActive && (() => {
                  const { practicedDays, targetDays, nextLevel, progressPercentage, isMaxLevel } = getTrimesterProgressDetails();
                  return (
                    <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#34a853', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {isMaxLevel ? 'Stufe Max' : `Weg zu Level ${nextLevel}`}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#125026', fontFamily: "'Urbanist', sans-serif" }}>
                          {practicedDays} / {targetDays} Tage
                        </span>
                        <div style={{ width: '60px', height: '5px', background: '#e6f4ea', borderRadius: '100px', overflow: 'hidden' }}>
                          <div style={{ width: `${progressPercentage}%`, height: '100%', background: '#34a853', borderRadius: '100px' }} />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Active Anchor Banner (placed directly under the header line) */}
              {!sessionActive && practiceAnchor && (
                <div style={{
                  width: '100%',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '10px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  boxSizing: 'border-box',
                  marginTop: '12px',
                  marginBottom: '-4px'
                }}>
                  <span style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: 600, 
                    color: '#334155',
                    lineHeight: 1.4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Anchor size={14} style={{ color: '#34a853', flexShrink: 0 }} />
                    <span>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Dein Übe-Anker:</span> „{practiceAnchor.replace(/^Direct nach/, 'Direkt nach')}“
                    </span>
                  </span>
                  <button
                    onClick={() => setPracticeAnchor(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '6px',
                      transition: 'all 0.2s',
                      flexShrink: 0
                    }}
                    title="Anker bearbeiten"
                    onMouseOver={e => e.currentTarget.style.color = '#dc2626'}
                    onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              )}

              {!sessionActive ? (
                /* Timer setup before starting */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '350px', width: '100%', alignItems: 'center' }}>
                  
                  {practiceAnchor ? (
                    <>

                      {/* Circular visual timer representation (static state) */}
                      <div style={{ 
                        position: 'relative', 
                        width: '210px', 
                        height: '210px', 
                        margin: '10px 0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg width="210" height="210" viewBox="0 0 210 210" style={{ transform: 'rotate(-90deg)' }}>
                          <circle cx="105" cy="105" r="95" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                          <circle 
                            cx="105" 
                            cy="105" 
                            r="95" 
                            fill="none" 
                            stroke="url(#blueGradient)" 
                            strokeWidth="4" 
                            strokeDasharray={2 * Math.PI * 95}
                            strokeDashoffset={2 * Math.PI * 95}
                            strokeLinecap="round"
                          />
                          <defs>
                            <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#3b82f6" />
                              <stop offset="100%" stopColor="#1d4ed8" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div style={{
                          position: 'absolute',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <span style={{ fontSize: '2.8rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1 }}>
                            {String(getTargetMinutes(avatar?.streak_flame || 0)).padStart(2, '0')}:00
                          </span>
                          <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '6px' }}>Ziel Fokuszeit</span>
                        </div>
                      </div>

                      <div style={{ 
                        textAlign: 'center', 
                        background: 'rgba(248, 250, 252, 0.6)', 
                        padding: '14px 18px', 
                        borderRadius: '20px', 
                        width: '100%', 
                        border: '1px solid rgba(226, 232, 240, 0.8)',
                        boxSizing: 'border-box',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.01)'
                      }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tages-Herausforderung</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                          {getFlameLevelName(avatar?.streak_flame || 0)} ({getTargetMinutes(avatar?.streak_flame || 0)} Min)
                        </div>
                      </div>

                      <button
                        onClick={async () => {
                          if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
                            try {
                              const permission = await (DeviceOrientationEvent as any).requestPermission();
                              if (permission !== 'granted') {
                                alert('Sensor-Rechte werden für den Fokus-Modus benötigt.');
                                return;
                              }
                            } catch (err) {
                              console.error(err);
                              return;
                            }
                          }
                           setSelectedTopic('Allgemeines Üben');
                           setSecondsElapsed(0);
                           setIsPhoneFlat(true);
                           setIsExtraTime(false);
                           setPreStartCountdown(3);
                           setSessionActive(true);
                           setShowCheckpoint(false);
                           nextCheckpointSecondsRef.current = Math.floor(Math.random() * 180) + 300; // 5-8 minutes

                           // Query focus log today and insert initial heartbeat log
                           const startOfDay = new Date();
                           startOfDay.setHours(0, 0, 0, 0);

                           supabase
                             .from('fokus_logs')
                             .select('id')
                             .eq('user_id', studentId)
                             .eq('is_extra', false)
                             .gte('created_at', startOfDay.toISOString())
                             .then(({ data }) => {
                               const hasFocusLoggedToday = data && data.length > 0;
                               const isExtra = !!hasFocusLoggedToday;

                               supabase
                                 .from('fokus_logs')
                                 .insert({
                                   user_id: studentId,
                                   duration_minutes: 0,
                                   duration_seconds: 0,
                                   is_extra: isExtra,
                                   flame_level: getFlameLevelName(avatar?.streak_flame || 0)
                                 })
                                 .select('id')
                                 .single()
                                 .then(({ data: logData }) => {
                                   if (logData) {
                                     if (isExtra) {
                                       currentExtraLogIdRef.current = logData.id;
                                       currentLogIdRef.current = null;
                                     } else {
                                       currentLogIdRef.current = logData.id;
                                       currentExtraLogIdRef.current = null;
                                     }
                                   }
                                 });
                             });
                         }}
                        style={{
                          width: '100%',
                          background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '16px 24px',
                          borderRadius: '20px',
                          fontWeight: 800,
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          boxShadow: '0 8px 25px rgba(52, 168, 83, 0.25), 0 2px 4px rgba(0,0,0,0.05)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        className="hover-scale"
                      >
                        <Play size={16} fill="white" />
                        <span>Fokus starten</span>
                      </button>
                    </>
                  ) : (
                    /* Inline Setup Anchor Gating Sentence Builder */
                    <div style={{
                      width: '100%',
                      background: 'rgba(52, 168, 83, 0.04)',
                      border: '1.5px dashed rgba(52, 168, 83, 0.25)',
                      borderRadius: '24px',
                      padding: '24px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      boxSizing: 'border-box',
                      alignItems: 'center',
                      textAlign: 'center'
                    }}>
                      <Anchor size={24} style={{ color: '#34a853' }} />
                      <h5 style={{ margin: 0, fontWeight: 900, fontSize: '1rem', color: '#34a853' }}>
                        Setze deinen Übe-Anker
                      </h5>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#34a853', fontWeight: 655, lineHeight: 1.4 }}>
                        Bevor du den Fokus-Timer starten kannst, verbinde das Üben mit einer Routine in deinem Alltag:
                      </p>
                      
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#34a853', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Direkt nach:
                          </span>
                          <select 
                            value={anchorTrigger}
                            onChange={e => {
                              setAnchorTrigger(e.target.value);
                              if (e.target.value !== 'custom') {
                                setCustomTriggerText('');
                              }
                            }}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '12px',
                              padding: '10px 14px',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              color: '#0f172a',
                              outline: 'none',
                              cursor: 'pointer',
                              width: '100%'
                            }}
                          >
                            <option value="den Hausaufgaben">den Hausaufgaben</option>
                            <option value="dem Zähneputzen">dem Zähneputzen</option>
                            <option value="dem Mittagessen">dem Mittagessen</option>
                            <option value="der Schule">der Schule</option>
                            <option value="dem Aufstehen">dem Aufstehen</option>
                            <option value="custom">Eigener Text...</option>
                          </select>
                        </div>

                        {anchorTrigger === 'custom' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#34a853', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Dein eigener Text:
                            </span>
                            <input
                              type="text"
                              placeholder="z.B. dem Abendessen"
                              value={customTriggerText}
                              onChange={e => setCustomTriggerText(e.target.value)}
                              style={{
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '12px',
                                padding: '10px 14px',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                color: '#0f172a',
                                outline: 'none',
                                width: '100%',
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#34a853', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            übe ich:
                          </span>
                          <div style={{
                            background: '#e2e8f0',
                            borderRadius: '12px',
                            padding: '10px 14px',
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            color: '#475569',
                            boxSizing: 'border-box'
                          }}>
                            {studentUser?.resolved_instrument || studentUser?.instrument || 'mein Instrument'}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const trigger = anchorTrigger === 'custom' ? customTriggerText.trim() : anchorTrigger;
                          if (!trigger) {
                            alert('Bitte gib einen Text für deinen Übe-Anker ein!');
                            return;
                          }
                          const instrument = studentUser?.resolved_instrument || studentUser?.instrument || 'mein Instrument';
                          handleSavePracticeAnchor(`Direkt nach ${trigger} übe ich ${instrument}.`);
                        }}
                        style={{
                          marginTop: '8px',
                          width: '100%',
                          background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '14px',
                          borderRadius: '16px',
                          fontWeight: 900,
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          boxShadow: '0 4px 15px rgba(52, 168, 83, 0.2)'
                        }}
                      >
                        Anker setzen & freischalten
                      </button>
                    </div>
                  )}

                </div>
              ) : (
                /* Timer running / Gyro orientation dashboard */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', width: '100%', alignItems: 'center' }}>
                  
                  {preStartCountdown !== null ? (
                    /* Pre-start Instructions & Countdown Screen */
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '24px',
                      textAlign: 'center',
                      padding: '40px 20px',
                      minHeight: '270px',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{
                        fontSize: '4.8rem',
                        fontWeight: 900,
                        color: '#34a853',
                        fontFamily: 'monospace, sans-serif',
                        lineHeight: 1,
                        animation: 'pulseSoft 1.5s infinite ease-in-out'
                      }}>
                        {preStartCountdown}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', margin: '0 0 10px 0', letterSpacing: '-0.02em' }}>
                          Handy hinlegen!
                        </h3>
                        <p style={{ fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 650, lineHeight: 1.5, margin: 0, maxWidth: '280px' }}>
                          Nicht den Tab oder das Programm wechseln.
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Normal active timer layout */
                    <>
                      {wakeLockFailed && (
                        <div style={{
                          width: '100%',
                          maxWidth: '300px',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          background: 'rgba(245, 158, 11, 0.2)',
                          border: '1px solid rgba(245, 158, 11, 0.4)',
                          color: '#fef3c7',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textAlign: 'center',
                          lineHeight: 1.3,
                          marginBottom: '8px',
                          boxSizing: 'border-box'
                        }}>
                          ⚠️ Energiesparmodus aktiv oder Wake-Lock blockiert. Bitte lasse den Bildschirm an!
                        </div>
                      )}
                      {/* Circular animated SVG progress ring */}
                      <div style={{ 
                        position: 'relative', 
                        width: '210px', 
                        height: '210px', 
                        filter: isExtraTime ? 'drop-shadow(0 0 12px rgba(52, 168, 83, 0.25))' : (isPhoneFlat ? 'drop-shadow(0 0 12px rgba(52, 168, 83, 0.2))' : 'drop-shadow(0 0 12px rgba(239, 68, 68, 0.25))'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg width="210" height="210" viewBox="0 0 210 210" style={{ transform: 'rotate(-90deg)' }}>
                          <circle cx="105" cy="105" r="95" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
                          <circle 
                            cx="105" 
                            cy="105" 
                            r="95" 
                            fill="none" 
                            stroke={isExtraTime ? '#ffffff' : (isPhoneFlat ? 'url(#greenGradient)' : 'url(#redGradient)')} 
                            strokeWidth="4" 
                            strokeDasharray={2 * Math.PI * 95}
                            strokeDashoffset={
                              isExtraTime 
                                ? 0 // Full circle in extra time
                                : 2 * Math.PI * 95 - (2 * Math.PI * 95 * Math.min(1, secondsElapsed / (getTargetMinutes(avatar?.streak_flame || 0) * 60)))
                            }
                            strokeLinecap="round"
                            style={{ transition: isPhoneFlat ? 'stroke-dashoffset 1s linear, stroke 0.3s' : 'stroke 0.3s' }}
                          />
                          <defs>
                            <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#34a853" />
                              <stop offset="100%" stopColor="#34a853" />
                            </linearGradient>
                            <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#f87171" />
                              <stop offset="100%" stopColor="#dc2626" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div style={{
                          position: 'absolute',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <span style={{ fontSize: '3rem', fontWeight: 800, color: '#ffffff', fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.02em', lineHeight: 1 }}>
                            {String(Math.floor(secondsElapsed / 60)).padStart(2, '0')}:
                            {String(secondsElapsed % 60).padStart(2, '0')}
                          </span>
                          <span style={{ 
                            fontSize: '0.62rem', 
                            fontWeight: 700, 
                            color: 'rgba(255,255,255,0.7)', 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.08em', 
                            marginTop: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {isExtraTime ? (
                              <>
                                <Zap size={11} fill="currentColor" style={{ animation: 'pulse 1.5s infinite' }} />
                                <span>Extra-Zeit aktiv</span>
                              </>
                            ) : (
                              isPhoneFlat ? 'Üben Aktiv' : 'Unterbrochen'
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Gyro Sensor feedback - ONLY show when interrupted (not flat) to stay clean */}
                      {!isPhoneFlat && (
                        <div style={{
                          width: '100%',
                          maxWidth: '450px',
                          padding: '16px 20px',
                          borderRadius: '20px',
                          background: isExtraTime 
                            ? 'rgba(255, 255, 255, 0.15)' 
                            : 'rgba(239, 68, 68, 0.15)',
                          border: isExtraTime
                            ? '1px solid rgba(255, 255, 255, 0.3)'
                            : '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#ffffff',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          textAlign: 'center',
                          lineHeight: 1.4,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.01)'
                        }}>
                          <div className={isExtraTime ? '' : 'animate-pulse'}>
                            <strong style={{ fontSize: '0.9rem', fontWeight: 800, display: 'block', marginBottom: '2px' }}>
                              {isExtraTime ? 'Fokus pausiert' : 'Fokus unterbrochen!'}
                            </strong>
                            <span style={{ fontSize: '0.78rem', opacity: 0.9 }}>
                              {isExtraTime 
                                ? (isDesktopFallback ? 'Wechsle zurück auf dieses Fenster, um weiter Extra-Zeit zu sammeln.' : 'Lege das Handy mit dem Display nach unten hin, um weiter Extra-Minuten zu sammeln.')
                                : (isDesktopFallback ? 'Wechsle sofort zurück auf dieses Fenster! Sonst fällt dein Timer sofort auf 0 zurück.' : 'Lege das Handy mit dem Display nach unten hin! Sonst fällt dein Timer sofort auf 0 zurück.')}
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Style definitions for modern breathing and glowing animations */}
                  <style dangerouslySetInnerHTML={{__html: `
                    @keyframes breathGlow {
                      0% { opacity: 0.15; transform: scale(0.95) translate(-50%, -50%); filter: blur(45px); }
                      50% { opacity: 0.3; transform: scale(1.05) translate(-50%, -50%); filter: blur(65px); }
                      100% { opacity: 0.15; transform: scale(0.95) translate(-50%, -50%); filter: blur(45px); }
                    }
                    @keyframes breathRing {
                      0% { transform: scale(0.98); }
                      50% { transform: scale(1.02); }
                      100% { transform: scale(0.98); }
                    }
                    @keyframes pulseSoft {
                      0%, 100% { opacity: 0.5; }
                      50% { opacity: 1; }
                    }
                  `}} />

                  {/* Fullscreen Active Timer Overlays */}
                  {sessionActive && (
                    <>
                      {/* 1. Flat on Table Mode */}
                      {false && isPhoneFlat && !isDesktopFallback && createPortal(
                        <div 
                          className="fokus-overlay-container"
                          style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 9999,
                            background: '#000000', // AMOLED Black base
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            userSelect: 'none',
                            fontFamily: '"Plus Jakarta Sans", -apple-system, system-ui, sans-serif',
                            overflow: 'hidden'
                          }}
                        >
                          {/* CSS for hover buttons and breathing effect */}
                          <style dangerouslySetInnerHTML={{__html: `
                            @keyframes timerBreathe {
                              0%, 100% { opacity: 0.8; text-shadow: 0 0 10px rgba(255,255,255,0.05); }
                              50% { opacity: 1; text-shadow: 0 0 20px rgba(255,255,255,0.2); }
                            }
                            .fokus-digits {
                              animation: timerBreathe 4s ease-in-out infinite;
                            }
                            .fokus-controls {
                              opacity: 0;
                              transform: translateY(10px);
                              transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                            }
                            .fokus-overlay-container:hover .fokus-controls {
                              opacity: 1;
                              transform: translateY(0);
                            }
                          `}} />

                          {/* Large Timer digits only */}
                          <div className="fokus-digits" style={{
                            fontSize: 'clamp(5.5rem, 18vw, 10rem)',
                            fontWeight: 100,
                            fontFamily: 'system-ui, -apple-system, monospace',
                            letterSpacing: '-0.03em',
                            lineHeight: 1,
                            color: '#ffffff',
                            textAlign: 'center',
                            zIndex: 10
                          }}>
                            {String(Math.floor(secondsElapsed / 60)).padStart(2, '0')}:
                            {String(secondsElapsed % 60).padStart(2, '0')}
                          </div>
                        </div>,
                        document.body
                      )}

                      {/* 2. Grace Period Warning Overlay (when picked up / tab hidden) */}
                      {isGraceActive && !isPhoneFlat && !isDesktopFallback && createPortal(
                        <div 
                          style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 10001, // Layered above the flat overlay
                            background: 'rgba(9, 9, 11, 0.72)',
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '24px',
                            color: '#ffffff',
                            userSelect: 'none',
                            fontFamily: '"Plus Jakarta Sans", -apple-system, system-ui, sans-serif'
                          }}
                        >
                          <div style={{
                            width: '100%',
                            maxWidth: '340px',
                            background: 'rgba(24, 24, 27, 0.85)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '32px',
                            padding: '40px 30px',
                            textAlign: 'center',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '24px'
                          }}>
                            {/* Warning Sign */}
                            <div style={{
                              width: '72px',
                              height: '72px',
                              borderRadius: '22px',
                              background: 'rgba(245, 158, 11, 0.12)',
                              border: '1px solid rgba(245, 158, 11, 0.25)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fbbf24',
                              animation: 'pulseSoft 1.5s infinite'
                            }}>
                              <Smartphone size={32} style={{ animation: 'bounce 2s infinite' }} />
                            </div>

                            <div>
                              <h3 style={{ fontSize: '1.45rem', fontWeight: 850, color: '#f59e0b', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                                Fokus unterbrochen!
                              </h3>
                              <p style={{ fontSize: '0.82rem', color: '#a1a1aa', fontWeight: 550, lineHeight: 1.5, margin: 0 }}>
                                {isDesktopFallback 
                                  ? 'Wechsle sofort zurück auf diese Seite, um den Fokus fortzusetzen.'
                                  : 'Lege das Handy wieder flach auf den Tisch, um den Fokus fortzusetzen.'}
                              </p>
                            </div>

                            {/* Big countdown number */}
                            <div style={{
                              fontSize: '4.8rem',
                              fontWeight: 800,
                              color: '#fbbf24',
                              fontFamily: 'monospace, sans-serif',
                              lineHeight: 1,
                              margin: '4px 0'
                            }}>
                              {graceSecondsLeft}
                            </div>

                            {/* Animated shrinking progress bar */}
                            <div style={{
                              width: '100%',
                              height: '6px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              borderRadius: '3px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                height: '100%',
                                background: 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)',
                                width: `${graceSecondsLeft * 10}%`,
                                transition: 'width 1s linear',
                                borderRadius: '3px'
                              }} />
                            </div>

                            {/* Quick Action Buttons */}
                            <button
                              onClick={finishPracticeSession}
                              style={{
                                width: '100%',
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                color: '#ffffff',
                                padding: '14px 20px',
                                borderRadius: '16px',
                                fontWeight: 700,
                                fontSize: '0.88rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                              }}
                              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
                              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                            >
                              Fokus beenden & Sichern
                            </button>
                          </div>
                        </div>,
                        document.body
                      )}

                      {/* 3. Anti-Cheat Checkpoint Overlay */}
                      {showCheckpoint && createPortal(
                        <div 
                          style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 10002, // Topmost layer
                            background: 'rgba(9, 9, 11, 0.95)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '24px',
                            color: '#ffffff',
                            userSelect: 'none',
                            fontFamily: '"Plus Jakarta Sans", -apple-system, system-ui, sans-serif',
                            textAlign: 'center'
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '24px',
                            maxWidth: '320px',
                            width: '100%'
                          }}>
                            <div style={{
                              width: '72px',
                              height: '72px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 0 24px rgba(52, 168, 83, 0.4)',
                              cursor: 'pointer',
                              animation: 'pulse 1.5s infinite'
                            }}
                            onClick={() => setShowCheckpoint(false)}
                            >
                              <span style={{ fontSize: '2.5rem' }}>🔥</span>
                            </div>
                            
                            <div>
                              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#ffffff' }}>
                                Bist du noch fokussiert?
                              </h3>
                              <p style={{ margin: '10px 0 0 0', fontSize: '0.875rem', color: '#a1a1aa', lineHeight: 1.5 }}>
                                Tippe schnell auf das Flammen-Symbol, um deine Session fortzusetzen!
                              </p>
                            </div>

                            <div style={{
                              fontSize: '1.75rem',
                              fontWeight: 900,
                              color: '#34a853',
                              fontVariantNumeric: 'tabular-nums'
                            }}>
                              {checkpointSecondsLeft}s
                            </div>
                          </div>
                        </div>
                      , document.body)}
                    </>
                  )}

                  {/* 3. Celebration / Success Logbook Overlay */}
                  {showCelebration && celebrationDetails && createPortal(
                    <div 
                      style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 10003, // Topmost layer
                        background: 'rgba(9, 9, 11, 0.75)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px',
                        color: '#ffffff',
                        userSelect: 'none',
                        fontFamily: '"Plus Jakarta Sans", -apple-system, system-ui, sans-serif'
                      }}
                    >
                      <div style={{
                        width: '100%',
                        maxWidth: '360px',
                        background: 'rgba(24, 24, 27, 0.9)',
                        border: '1px solid rgba(52, 168, 83, 0.2)',
                        borderRadius: '32px',
                        padding: '40px 30px',
                        textAlign: 'center',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '24px',
                        position: 'relative'
                      }}>
                        {/* Animated Progress Ring Container */}
                        <div style={{ position: 'relative', width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                          {/* Canvas for Particle Explosion */}
                          <canvas
                            ref={celebrationCanvasRef}
                            width={320}
                            height={320}
                            style={{
                              position: 'absolute',
                              top: '-80px',
                              left: '-80px',
                              width: '320px',
                              height: '320px',
                              pointerEvents: 'none',
                              zIndex: 10
                            }}
                          />

                          {/* SVG circular progress bar */}
                          <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
                            {/* Background Track */}
                            <circle
                              cx="80"
                              cy="80"
                              r="70"
                              fill="transparent"
                              stroke="rgba(255, 255, 255, 0.08)"
                              strokeWidth="8"
                            />
                            {/* Foreground Progress */}
                            <circle
                              cx="80"
                              cy="80"
                              r="70"
                              fill="transparent"
                              stroke="url(#celebrationProgressGrad)"
                              strokeWidth="8"
                              strokeDasharray="439.82"
                              strokeDashoffset={439.82 - 439.82 * celebrationRingProgress}
                              strokeLinecap="round"
                              style={{
                                transition: 'stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                              }}
                            />
                            <defs>
                              <linearGradient id="celebrationProgressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#34a853" />
                                <stop offset="100%" stopColor="#34a853" />
                              </linearGradient>
                            </defs>
                          </svg>

                          {/* Flame Icon & Streak Count in Center */}
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 5
                          }}>
                            <Flame
                              size={36}
                              color="#ea580c"
                              fill="#ea580c"
                              style={{
                                filter: 'drop-shadow(0 2px 8px rgba(234, 88, 12, 0.5))',
                                transform: 'scale(1)',
                                animation: 'pulse 2s infinite ease-in-out'
                              }}
                            />
                            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ffffff', marginTop: '2px', lineHeight: 1 }}>
                              {celebrationDetails.streakFlame}
                            </span>
                            <span style={{ fontSize: '0.55rem', fontWeight: 900, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '1px' }}>
                              Tage Streak
                            </span>
                          </div>
                        </div>

                        <div>
                          <h3 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#34a853', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                            Großartig geübt!
                          </h3>
                          <p style={{ fontSize: '0.88rem', color: '#a1a1aa', fontWeight: 500, lineHeight: 1.5, margin: 0 }}>
                            Deine Übe-Session wurde erfolgreich im Log-Buch gespeichert!
                          </p>
                        </div>

                        <div style={{
                          width: '100%',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: '20px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          textAlign: 'left'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span style={{ color: '#71717a', fontWeight: 600 }}>XP erhalten:</span>
                            <span style={{ color: '#38bdf8', fontWeight: 800 }}>+{celebrationDetails.xpGained} XP ⚡</span>
                          </div>
                          
                          {celebrationDetails.sessionCompletedTarget && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                              <span style={{ color: '#71717a', fontWeight: 600 }}>Tagesziel:</span>
                              <span style={{ color: '#34a853', fontWeight: 800 }}>Erreicht! 🏆</span>
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                            <span style={{ color: '#71717a', fontWeight: 600 }}>Streak:</span>
                            <span style={{ color: '#fb923c', fontWeight: 800 }}>{celebrationDetails.streakFlame} Tage 🔥</span>
                          </div>

                          {celebrationDetails.usedJokerThisSession && (
                            <div style={{ fontSize: '0.78rem', color: '#fb923c', fontWeight: 600, marginTop: '4px', textAlign: 'center', background: 'rgba(251, 146, 60, 0.08)', padding: '6px 12px', borderRadius: '10px' }}>
                              🎯 Joker eingesetzt, um deinen Streak von {celebrationDetails.streak} Tagen zu retten!
                            </div>
                          )}
                        </div>

                        {/* Stimmungs-Check Section */}
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                          <span style={{ fontSize: '0.78rem', color: '#a1a1aa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Wie war deine Übe-Session?
                          </span>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '2px' }}>
                            {[
                              { mood: 'sad', emoji: '😕', label: 'Schwer' },
                              { mood: 'neutral', emoji: '🙂', label: 'Ganz gut' },
                              { mood: 'happy', emoji: '😎', label: 'Super!' }
                            ].map(item => {
                              const isSelected = lastSelectedMood === item.mood;
                              return (
                                <button
                                  key={item.mood}
                                  onClick={() => handleSaveMood(item.mood as 'sad' | 'neutral' | 'happy')}
                                  style={{
                                    background: isSelected ? 'rgba(52, 168, 83, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                    border: isSelected ? '2.5px solid #34a853' : '2.5px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '20px',
                                    width: '64px',
                                    height: '64px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    gap: '4px',
                                    transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                                    boxShadow: isSelected ? '0 0 15px rgba(52, 168, 83, 0.25)' : 'none'
                                  }}
                                  onMouseOver={e => {
                                    if (!isSelected) {
                                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                                      e.currentTarget.style.transform = 'scale(1.05)';
                                    }
                                  }}
                                  onMouseOut={e => {
                                    if (!isSelected) {
                                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                      e.currentTarget.style.transform = 'scale(1)';
                                    }
                                  }}
                                >
                                  <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{item.emoji}</span>
                                  <span style={{ fontSize: '0.52rem', fontWeight: 800, color: isSelected ? '#34a853' : '#a1a1aa', textTransform: 'uppercase' }}>
                                    {item.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setShowCelebration(false);
                            setLastSelectedMood(null);
                          }}
                          style={{
                            width: '100%',
                            background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '14px 20px',
                            borderRadius: '16px',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(52, 168, 83, 0.2)',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          Log-Buch ansehen
                        </button>
                      </div>
                    </div>
                  , document.body)}

                  <div style={{ display: 'flex', gap: '14px', width: '100%', maxWidth: '350px' }}>
                    <button
                      onClick={finishPracticeSession}
                      style={{
                        flex: 1,
                        background: isExtraTime 
                          ? 'linear-gradient(135deg, #ffffff 0%, #f4f4f5 100%)' 
                          : 'linear-gradient(135deg, #34a853 0%, #34a853 100%)',
                        color: isExtraTime ? '#34a853' : 'white',
                        border: 'none',
                        padding: '16px',
                        borderRadius: '20px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        boxShadow: isExtraTime 
                          ? '0 8px 25px rgba(255, 255, 255, 0.15)' 
                          : '0 8px 25px rgba(52, 168, 83, 0.2), 0 2px 4px rgba(0,0,0,0.05)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      className="hover-scale"
                    >
                      🏁 Beenden
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Möchtest du diese Session wirklich abbrechen? Der Fortschritt geht verloren.')) {
                          setSecondsElapsed(0);
                          setSessionActive(false);
                          setIsExtraTime(false);
                        }
                      }}
                      style={{
                        padding: '16px 20px',
                        borderRadius: '20px',
                        border: isExtraTime 
                          ? '1px solid rgba(255, 255, 255, 0.4)' 
                          : (sessionActive ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(252, 165, 165, 0.8)'),
                        background: isExtraTime 
                          ? 'transparent' 
                          : (sessionActive ? 'transparent' : 'rgba(254, 242, 242, 0.5)'),
                        backdropFilter: 'blur(4px)',
                        color: isExtraTime || sessionActive ? '#ffffff' : '#ef4444',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      className="hover-scale"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
              </div>
            </div>

          </div>

          {/* Right Pane (1/3 width) - Flammen Log-Buch & Jahres-Statistik Sidebar */}
          <div style={{ 
            flex: '1 1 300px', 
            background: '#ffffff', 
            border: '1px solid #e2e8f0', 
            borderRadius: '24px', 
            padding: '24px', 
            boxShadow: '0 4px 20px rgba(0,0,0,0.01)',
            minWidth: '280px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}>
            {/* Sidebar View Switcher Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ 
                  background: sidebarTab === 'logbook' ? '#fff7ed' : '#e6f4ea', 
                  color: sidebarTab === 'logbook' ? '#ea580c' : '#34a853', 
                  padding: '8px', 
                  borderRadius: '12px',
                  transition: 'all 0.3s ease'
                }}>
                  {sidebarTab === 'logbook' ? <Flame size={18} fill="currentColor" /> : <Calendar size={18} />}
                </div>
                <div>
                  <h4 style={{ fontWeight: 850, fontSize: '18px', color: '#1e293b', margin: 0 }}>
                    {sidebarTab === 'logbook' ? 'Log-Buch' : 'Jahres-Statistik'}
                  </h4>
                  <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '2px 0 0 0', fontWeight: 600 }}>
                    {sidebarTab === 'logbook' ? 'Tägliche Übe-Einträge' : 'Übeminuten (Sep - Aug)'}
                  </p>
                </div>
              </div>
              
              {/* Toggle Button */}
              <button
                onClick={() => setSidebarTab(sidebarTab === 'logbook' ? 'stats' : 'logbook')}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  color: '#475569',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
              >
                {sidebarTab === 'logbook' ? (
                  <>
                    <Calendar size={12} />
                    <span>Statistik</span>
                  </>
                ) : (
                  <>
                    <Flame size={12} fill="currentColor" />
                    <span>Log-Buch</span>
                  </>
                )}
              </button>
            </div>

            {/* Tab Panel Switcher */}
            {sidebarTab === 'stats' ? (
              /* Jahres-Statistik Grid */
              (() => {
                const now = new Date();
                const currentMonth = now.getMonth();
                const startYear = currentMonth >= 8 ? now.getFullYear() : now.getFullYear() - 1;
                const monthsList = [
                  { month: 8, label: 'Sep', year: startYear },
                  { month: 9, label: 'Okt', year: startYear },
                  { month: 10, label: 'Nov', year: startYear },
                  { month: 11, label: 'Dez', year: startYear },
                  { month: 0, label: 'Jan', year: startYear + 1 },
                  { month: 1, label: 'Feb', year: startYear + 1 },
                  { month: 2, label: 'Mrz', year: startYear + 1 },
                  { month: 3, label: 'Apr', year: startYear + 1 },
                  { month: 4, label: 'Mai', year: startYear + 1 },
                  { month: 5, label: 'Jun', year: startYear + 1 },
                  { month: 6, label: 'Jul', year: startYear + 1 },
                  { month: 7, label: 'Aug', year: startYear + 1 }
                ];

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="animation-fade-in">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      {monthsList.map(item => {
                        const logsForMonth = fokusLogs.filter(log => {
                          if (!log.created_at) return false;
                          const logDate = new Date(log.created_at);
                          return logDate.getMonth() === item.month && logDate.getFullYear() === item.year;
                        });
                        let totalSecs = logsForMonth.reduce((sum, log) => {
                          return sum + (log.duration_seconds || ((log.duration_minutes || 0) * 60));
                        }, 0);
                        
                        if (sessionActive && secondsElapsed > 0 && item.month === now.getMonth() && item.year === now.getFullYear()) {
                          totalSecs += secondsElapsed;
                        }

                        const minutes = Math.round(totalSecs / 60);
                        
                        // Heatmap Style Calculation
                        let bg = '#f8fafc';
                        let border = '1px solid #e2e8f0';
                        let labelColor = '#94a3b8';
                        let textColor = '#64748b';
                        let numColor = '#1e293b';
                        let shadow = 'none';

                        if (minutes > 0) {
                          if (minutes <= 15) {
                            // Level 1: ultra light green
                            bg = 'linear-gradient(135deg, #e6f4ea 0%, #e6fbf0 100%)';
                            border = '1px solid #e6f4ea';
                            labelColor = '#34a853';
                            textColor = '#34a853';
                            numColor = '#34a853';
                            shadow = '0 2px 6px rgba(52, 168, 83, 0.04)';
                          } else if (minutes <= 60) {
                            // Level 2: soft green
                            bg = 'linear-gradient(135deg, #e6f4ea 0%, #e6f4ea 100%)';
                            border = '1px solid #e6f4ea';
                            labelColor = '#34a853';
                            textColor = '#34a853';
                            numColor = '#34a853';
                            shadow = '0 3px 8px rgba(52, 168, 83, 0.07)';
                          } else if (minutes <= 180) {
                            // Level 3: medium green
                            bg = 'linear-gradient(135deg, #e6f4ea 0%, #e6f4ea 100%)';
                            border = '1px solid #e6f4ea';
                            labelColor = '#34a853';
                            textColor = '#34a853';
                            numColor = '#34a853';
                            shadow = '0 4px 12px rgba(52, 168, 83, 0.12)';
                          } else {
                            // Level 4 (Master): Solid emerald jewel
                            bg = 'linear-gradient(135deg, #34a853 0%, #34a853 100%)';
                            border = '1px solid #34a853';
                            labelColor = 'rgba(255, 255, 255, 0.8)';
                            textColor = 'rgba(255, 255, 255, 0.9)';
                            numColor = '#ffffff';
                            shadow = '0 6px 15px rgba(52, 168, 83, 0.25)';
                          }
                        }

                        return (
                          <div 
                            key={`${item.month}-${item.year}`}
                            style={{
                              background: bg,
                              border: border,
                              borderRadius: '16px',
                              padding: '12px 4px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '3px',
                              minHeight: '66px',
                              textAlign: 'center',
                              boxShadow: shadow,
                              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                              cursor: 'default'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              if (minutes > 0) {
                                e.currentTarget.style.boxShadow = shadow.replace(/0\.\d+/, '0.3');
                              } else {
                                e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.04)';
                                e.currentTarget.style.borderColor = '#cbd5e1';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0px)';
                              e.currentTarget.style.boxShadow = shadow;
                              e.currentTarget.style.borderColor = border.split(' ')[2];
                            }}
                          >
                            <span style={{ 
                              fontSize: '0.62rem', 
                              fontWeight: 800, 
                              color: labelColor,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em'
                            }}>
                              {item.label}
                            </span>
                            <span style={{ 
                              fontSize: '0.9rem', 
                              fontWeight: 900, 
                              color: numColor,
                              fontFamily: "'Urbanist', sans-serif"
                            }}>
                              {minutes}
                              <span style={{ fontSize: '0.6rem', fontWeight: 700, marginLeft: '1px', color: textColor }}>m</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Heatmap Legend */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      marginTop: '4px', 
                      padding: '8px 10px',
                      background: '#f8fafc',
                      borderRadius: '12px',
                      border: '1px solid #f1f5f9',
                      fontSize: '0.58rem', 
                      color: '#94a3b8', 
                      fontWeight: 700
                    }}>
                      <span style={{ textTransform: 'uppercase', letterSpacing: '0.02em' }}>Heatmap:</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0' }} /> 0m
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e6fbf0', border: '1px solid #e6f4ea' }} /> &lt;15m
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e6f4ea', border: '1px solid #e6f4ea' }} /> &lt;1h
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e6f4ea', border: '1px solid #e6f4ea' }} /> &lt;3h
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34a853' }} /> 3h+
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              /* List entries */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '480px', overflowY: 'auto', paddingRight: '4px' }} className="animation-fade-in">
                {(() => {
                  const grouped = getGroupedLogs();
                  if (grouped.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic', padding: '40px 10px' }}>
                        Noch keine Einträge im Log-Buch vorhanden. Starte deine erste Fokus-Session! 🚀
                      </div>
                    );
                  }

                  // Group by month
                  const groupedByMonth: Record<string, { label: string, key: string, entries: typeof grouped, practiceDays: number }> = {};
                  const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

                  grouped.forEach(entry => {
                    const parts = entry.date.split('.');
                    if (parts.length < 3) return;
                    const monthIndex = parseInt(parts[1], 10) - 1;
                    const yearFull = 2000 + parseInt(parts[2], 10);
                    const key = `${monthIndex}-${yearFull}`;
                    const label = `${monthNames[monthIndex]} ${yearFull}`;

                    if (!groupedByMonth[key]) {
                      groupedByMonth[key] = {
                        label,
                        key,
                        entries: [],
                        practiceDays: 0
                      };
                    }
                    groupedByMonth[key].entries.push(entry);
                    
                    // Count as practice day if they actually practiced
                    const practiced = !entry.isPlaceholder || entry.focusSeconds > 0 || entry.extraSeconds > 0;
                    if (practiced) {
                      groupedByMonth[key].practiceDays += 1;
                    }
                  });

                  const months = Object.values(groupedByMonth);

                  // Sort months by year and month index descending
                  months.sort((a, b) => {
                    const [aMonth, aYear] = a.key.split('-').map(Number);
                    const [bMonth, bYear] = b.key.split('-').map(Number);
                    if (aYear !== bYear) return bYear - aYear;
                    return bMonth - aMonth;
                  });

                  return months.map((month, mIdx) => {
                    const isExpanded = expandedMonths[month.key] !== undefined 
                      ? expandedMonths[month.key] 
                      : mIdx === 0; // first month is expanded by default

                    const toggleMonth = () => {
                      setExpandedMonths(prev => ({
                        ...prev,
                        [month.key]: !isExpanded
                      }));
                    };

                    return (
                      <div key={month.key} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Month Header Accordion Toggle */}
                        <div 
                          onClick={toggleMonth}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '16px',
                            padding: '12px 16px',
                            cursor: 'pointer',
                            userSelect: 'none',
                            transition: 'all 0.2s ease-in-out'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ChevronRight 
                              size={16} 
                              style={{ 
                                color: '#64748b', 
                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', 
                                transition: 'transform 0.2s ease-in-out' 
                              }} 
                            />
                            <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b' }}>
                              {month.label}
                            </span>
                          </div>
                          
                          <span style={{ 
                            fontSize: '0.7rem', 
                            fontWeight: 800, 
                            color: month.practiceDays > 0 ? '#34a853' : '#64748b',
                            background: month.practiceDays > 0 ? '#e6f4ea' : '#f1f5f9',
                            padding: '4px 10px',
                            borderRadius: '100px',
                            letterSpacing: '0.02em'
                          }}>
                            {month.practiceDays} {month.practiceDays === 1 ? 'Übetag' : 'Übetage'}
                          </span>
                        </div>

                        {/* Collapsible Content */}
                        {isExpanded && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', paddingLeft: '8px' }}>
                            {month.entries.map((group, idx) => {
                              const now = new Date();
                              const todayDd = String(now.getDate()).padStart(2, '0');
                              const todayMm = String(now.getMonth() + 1).padStart(2, '0');
                              const todayYy = String(now.getFullYear()).substring(2);
                              const todayDateStr = `${todayDd}.${todayMm}.${todayYy}`;

                              const isToday = group.date === todayDateStr;
                              
                              const jokerDateStr = (() => {
                                if (!studentUser?.joker_used_at) return null;
                                const jd = new Date(studentUser.joker_used_at);
                                const dd = String(jd.getDate()).padStart(2, '0');
                                const mm = String(jd.getMonth() + 1).padStart(2, '0');
                                const yy = String(jd.getFullYear()).substring(2);
                                return `${dd}.${mm}.${yy}`;
                              })();
                              const isJokerDay = jokerDateStr === group.date;
                              
                              const getTargetSeconds = (flame: string) => {
                                const level = avatar?.evolution_level || 1;
                                if (level === 3) {
                                  if (flame === 'Helden-Feuer') return 20 * 60;
                                  if (flame === 'Mittlere Flamme') return 15 * 60;
                                  return 10 * 60;
                                } else if (level === 2) {
                                  if (flame === 'Helden-Feuer') return 15 * 60;
                                  if (flame === 'Mittlere Flamme') return 10 * 60;
                                  return 5 * 60;
                                } else {
                                  if (flame === 'Helden-Feuer') return 10 * 60;
                                  if (flame === 'Mittlere Flamme') return 5 * 60;
                                  return 3 * 60;
                                }
                              };
                              
                              const getFlameIconSize = (flame: string) => {
                                if (flame === 'Helden-Feuer') return 18;
                                if (flame === 'Mittlere Flamme') return 15;
                                return 12;
                              };
                              
                              const targetSecs = getTargetSeconds(group.flameLevel);
                              const iconSize = getFlameIconSize(group.flameLevel);
                              const hasMastered = group.focusSeconds >= targetSecs && !group.isPlaceholder;
                              
                              let borderLeftColor = '#e2e8f0';
                              if (hasMastered) {
                                borderLeftColor = '#34a853'; // Green (Mastered)
                              } else if (isJokerDay) {
                                borderLeftColor = '#f97316'; // Same hue as Streak path KPI (Orange)
                              } else if (isToday) {
                                borderLeftColor = '#eab308'; // Yellow (Active)
                              } else {
                                borderLeftColor = '#94a3b8'; // Slate/Grey (Not practiced / target not reached)
                              }

                              const timeUntilMidnight = (() => {
                                if (!isToday) return null;
                                const midnight = new Date();
                                midnight.setHours(24, 0, 0, 0);
                                const diff = midnight.getTime() - now.getTime();
                                const hrs = Math.floor(diff / (1000 * 60 * 60));
                                const mins = Math.floor((diff / (1000 * 60)) % 60);
                                const secs = Math.floor((diff / 1000) % 60);
                                return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                              })();

                              const focusMins = Math.round(group.focusSeconds / 60);
                              const extraMins = Math.floor(group.extraSeconds / 60);
                              const extraSecs = group.extraSeconds % 60;
                              
                              const textParts = [];
                              if (group.focusSeconds > 0) {
                                textParts.push(`Fokuszeit (+${focusMins}m)`);
                              }
                              if (group.extraSeconds > 0) {
                                textParts.push(`+${extraMins}:${String(extraSecs).padStart(2, '0')} (extra)`);
                              }
                              const statusText = textParts.join(' - ');

                              const cardElement = (() => {
                                if (group.isPlaceholder) {
                                  if (isToday) {
                                    return (
                                      <div 
                                        style={{ 
                                          background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.03) 0%, rgba(234, 179, 8, 0.01) 100%)', 
                                          border: '1px dashed rgba(234, 179, 8, 0.25)', 
                                          borderRadius: '16px', 
                                          padding: '12px 14px',
                                          display: 'flex',
                                          flexDirection: 'row',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          gap: '12px',
                                          borderLeft: `4px solid ${borderLeftColor}`,
                                          boxShadow: '0 2px 8px rgba(234, 179, 8, 0.01)'
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1, flexWrap: 'wrap' }}>
                                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#ca8a04', fontFamily: 'monospace' }}>
                                            {group.date}
                                          </span>
                                          <span style={{ 
                                            fontSize: '0.58rem', 
                                            fontWeight: 900, 
                                            background: 'rgba(234, 179, 8, 0.08)', 
                                            color: '#ca8a04', 
                                            padding: '1px 6px', 
                                            borderRadius: '100px', 
                                            letterSpacing: '0.04em', 
                                            textTransform: 'uppercase' 
                                          }}>
                                            Aktiv
                                          </span>
                                          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569' }}>
                                            - Sichere dir deinen Übe-Streak!
                                          </span>
                                        </div>
                                        
                                        {timeUntilMidnight && (
                                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                                            <span style={{ 
                                              fontSize: '0.68rem', 
                                              fontWeight: 800, 
                                              color: '#a16207', 
                                              background: '#fef9c3',
                                              padding: '2px 6px',
                                              borderRadius: '6px',
                                              display: 'inline-flex', 
                                              alignItems: 'center', 
                                              gap: '3px', 
                                              fontFamily: 'monospace' 
                                            }}>
                                              ⏳ {timeUntilMidnight}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  } else if (isJokerDay) {
                                    return (
                                      <div 
                                        style={{ 
                                          background: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)', 
                                          border: '1px solid #c2410c', 
                                          borderRadius: '16px', 
                                          padding: '12px 14px',
                                          display: 'flex',
                                          flexDirection: 'row',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          gap: '12px',
                                          boxShadow: '0 4px 12px rgba(194, 65, 12, 0.12)'
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#ffffff', fontFamily: 'monospace' }}>
                                            {group.date}
                                          </span>
                                          <span style={{ 
                                            fontSize: '0.58rem', 
                                            fontWeight: 900, 
                                            background: 'rgba(255, 255, 255, 0.22)', 
                                            color: '#ffffff', 
                                            padding: '1px 6px', 
                                            borderRadius: '100px', 
                                            letterSpacing: '0.04em', 
                                            textTransform: 'uppercase' 
                                          }}>
                                            Joker eingesetzt
                                          </span>
                                        </div>
                                        
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                                          <Shield size={iconSize} fill="#ffffff" color="#ffffff" />
                                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ffffff' }}>
                                            Joker
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    const currentWeek = getISOWeek(new Date());
                                    const lastJokerWeek = studentUser?.joker_used_at ? getISOWeek(new Date(studentUser.joker_used_at)) : null;
                                    const isJokerAvailable = !studentUser?.joker_used_at || lastJokerWeek !== currentWeek;

                                    return (
                                      <div 
                                        style={{ 
                                          background: '#ffffff', 
                                          border: '1px dashed rgba(148, 163, 184, 0.25)', 
                                          borderRadius: '16px', 
                                          padding: '12px 14px',
                                          display: 'flex',
                                          flexDirection: 'row',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          gap: '12px',
                                          borderLeft: `4px solid ${borderLeftColor}`,
                                          boxShadow: '0 2px 8px rgba(148, 163, 184, 0.01)'
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', fontFamily: 'monospace' }}>
                                            {group.date}
                                          </span>
                                          <span style={{ 
                                            fontSize: '0.58rem', 
                                            fontWeight: 900, 
                                            background: 'rgba(148, 163, 184, 0.08)', 
                                            color: '#94a3b8', 
                                            padding: '1px 6px', 
                                            borderRadius: '100px', 
                                            letterSpacing: '0.04em', 
                                            textTransform: 'uppercase' 
                                          }}>
                                            Nicht geübt
                                          </span>
                                        </div>
                                        
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            <Flame 
                                              size={iconSize} 
                                              fill={group.flameLevel === 'Keine Flamme' ? 'none' : '#ef4444'} 
                                              color={group.flameLevel === 'Keine Flamme' ? '#94a3b8' : '#ef4444'} 
                                            />
                                            <span style={{ 
                                              fontSize: '0.7rem', 
                                              fontWeight: 800, 
                                              color: group.flameLevel === 'Keine Flamme' ? '#94a3b8' : '#ef4444' 
                                            }}>
                                              {group.flameLevel}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }
                                } else if (hasMastered) {
                                  const isJustFinished = isToday && lastFinishedTimestamp && (Date.now() - lastFinishedTimestamp < 8000);
                                  return (
                                    <div 
                                      style={{ 
                                        background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)', 
                                        border: '1px solid #34a853', 
                                        borderRadius: '16px', 
                                        padding: '12px 14px',
                                        display: 'flex',
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '12px',
                                        boxShadow: isJustFinished ? '0 0 16px rgba(52, 168, 83, 0.6)' : '0 4px 12px rgba(19, 115, 51, 0.12)',
                                        animation: isJustFinished ? 'logPulseGlow 2s infinite' : 'none'
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                                        {isJustFinished && (
                                          <span style={{ 
                                            fontSize: '0.55rem', 
                                            fontWeight: 900, 
                                            background: '#ffffff', 
                                            color: '#34a853', 
                                            padding: '2px 6px', 
                                            borderRadius: '100px', 
                                            letterSpacing: '0.04em',
                                            textTransform: 'uppercase',
                                            animation: 'pulseSoft 1.5s infinite'
                                          }}>
                                            Neu!
                                          </span>
                                        )}
                                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap' }}>
                                          {group.date}
                                        </span>
                                        {statusText && (
                                          <span style={{ fontSize: '0.74rem', fontWeight: 650, color: '#e6f4ea', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            - {statusText}
                                          </span>
                                        )}
                                      </div>
                                      
                                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                                        <Flame size={iconSize} fill="#ffffff" color="#ffffff" />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ffffff' }}>
                                          {group.flameLevel}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                }

                                const isJustFinished = isToday && lastFinishedTimestamp && (Date.now() - lastFinishedTimestamp < 8000);
                                return (
                                  <div 
                                    style={{ 
                                      background: '#f8fafc', 
                                      border: '1px solid #e2e8f0', 
                                      borderRadius: '16px', 
                                      padding: '12px 14px',
                                      display: 'flex',
                                      flexDirection: 'row',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      gap: '12px',
                                      borderLeft: `4px solid ${borderLeftColor}`,
                                      boxShadow: isJustFinished ? '0 0 16px rgba(234, 179, 8, 0.6)' : 'none',
                                      animation: isJustFinished ? 'logPulseGlowYellow 2s infinite' : 'none'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                                      {isJustFinished && (
                                        <span style={{ 
                                          fontSize: '0.55rem', 
                                          fontWeight: 900, 
                                          background: '#eab308', 
                                          color: '#ffffff', 
                                          padding: '2px 6px', 
                                          borderRadius: '100px', 
                                          letterSpacing: '0.04em',
                                          textTransform: 'uppercase',
                                          animation: 'pulseSoft 1.5s infinite'
                                        }}>
                                          Neu!
                                        </span>
                                      )}
                                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', whiteSpace: 'nowrap' }}>
                                        {group.date}
                                      </span>
                                      {statusText && (
                                        <span style={{ fontSize: '0.74rem', fontWeight: 650, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          - {statusText}
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                                      <Flame size={iconSize} fill={hasMastered ? '#34a853' : isToday ? '#eab308' : '#ef4444'} color={hasMastered ? '#34a853' : isToday ? '#eab308' : '#ef4444'} />
                                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: hasMastered ? '#34a853' : isToday ? '#eab308' : '#ef4444' }}>
                                        {group.flameLevel}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })();

                              const getFlameColor = (flame: string) => {
                                if (flame === 'Helden-Feuer') return '#ef4444';
                                if (flame === 'Mittlere Flamme') return '#f97316';
                                if (flame === 'Kleine Flamme') return '#eab308';
                                return '#cbd5e1';
                              };
                              const activeColor = getFlameColor(group.flameLevel);
                              const isStreakActive = group.flameLevel !== 'Keine Flamme';



                              return (
                                <div key={idx} style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                                  {/* Left side timeline column */}
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '16px', position: 'relative', flexShrink: 0 }}>
                                    {/* Dot/Node */}
                                    <div style={{
                                      width: '10px',
                                      height: '10px',
                                      borderRadius: '50%',
                                      background: isStreakActive ? activeColor : '#cbd5e1',
                                      boxShadow: isStreakActive ? `0 0 6px ${activeColor}` : 'none',
                                      border: '2px solid #ffffff',
                                      zIndex: 2,
                                      marginTop: '18px'
                                    }} />
                                    {/* Connector line to the next item */}
                                    {idx < month.entries.length - 1 && (
                                      <div style={{
                                        position: 'absolute',
                                        top: '25px',
                                        bottom: '-20px',
                                        width: '2px',
                                        borderLeft: isStreakActive ? `2px solid ${activeColor}` : '2px dashed #cbd5e1',
                                        zIndex: 1
                                      }} />
                                    )}
                                  </div>
                                  {/* Right side card */}
                                  <div style={{ flex: 1, minWidth: 0, paddingBottom: idx === month.entries.length - 1 ? '0' : '8px' }}>
                                    {cardElement}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>

        </div>

      <div id="tour-student-songs" style={{ display: activeTab === 'songs' ? 'flex' : 'none', flexDirection: 'column', gap: '20px' }}>
        {activeTab === 'songs' && (
          progressLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
              Songs & Material werden geladen...
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 300px',
              gap: '24px',
              alignItems: 'start'
            }}>
              {/* LEFT COLUMN: MAIN MEDIATHEK AREA */}
              <div 
                className="glass-panel" 
                style={{ 
                  flex: 1,
                  background: 'white', 
                  borderRadius: '20px', 
                  border: '1px solid rgba(0, 0, 0, 0.05)', 
                  padding: '24px 30px', 
                  boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.02), 0 2px 8px -1px rgba(0, 0, 0, 0.01)',
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '24px' 
                }}
              >
                {/* Header Area */}
                {(() => {
                  const brandColor = studentUser?.schools?.brand_color || '#34a853';
                  return (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h2 style={{ fontSize: '1.85rem', color: '#18181b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontWeight: 900 }}>
                          <div style={{ background: `${brandColor}15`, color: brandColor, padding: '5px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                            <Library size={20} />
                          </div>
                          <span>Mediathek</span>
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '4px 0 0 0', fontWeight: 600 }}>
                          Deine Songs und Lehrwerke für den Unterricht.
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Unified Smart Search Field */}
                <div style={{ position: 'relative', width: '100%' }}>
                  <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    placeholder="Songs nach Titel/Interpret oder Lehrwerke nach Titel/Autor durchsuchen..." 
                    value={songSearch}
                    onChange={e => setSongSearch(e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '12px 14px 12px 48px', 
                      borderRadius: '14px', 
                      border: '1px solid #e2e8f0', 
                      background: '#f8fafc', 
                      fontWeight: 600, 
                      fontSize: '0.92rem', 
                      outline: 'none', 
                      transition: 'all 0.2s',
                      boxSizing: 'border-box',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.01)'
                    }}
                  />
                </div>

                {/* Two Columns Layout */}
                {(() => {
                  const brandColor = studentUser?.schools?.brand_color || '#34a853';
                  
                  const isMastered = (sng: any) => {
                    const progressItem = progressItems.find(item => 
                      item.topic_name.toLowerCase() === sng.title.toLowerCase() ||
                      item.topic_name.toLowerCase().includes(sng.title.toLowerCase())
                    );
                    return progressItem?.status === 'MASTERED';
                  };
                  
                  const filteredSongs = songs.filter(song => {
                    const matchesSearch = songSearchDebounced === '' || 
                      song.title?.toLowerCase().includes(songSearchDebounced.toLowerCase()) || 
                      song.artist?.toLowerCase().includes(songSearchDebounced.toLowerCase());
                    const isAssigned = progressItems.some(item => 
                      item.topic_name.toLowerCase() === song.title.toLowerCase() ||
                      item.topic_name.toLowerCase().includes(song.title.toLowerCase())
                    );
                    return matchesSearch && song.is_campus_active && isAssigned;
                  }).sort((a, b) => {
                    const aMastered = isMastered(a);
                    const bMastered = isMastered(b);
                    if (aMastered && !bMastered) return 1;
                    if (!aMastered && bMastered) return -1;
                    return (a.title || '').localeCompare(b.title || '', 'de', { sensitivity: 'base' });
                  });

                  const filteredLehrwerke = lehrwerke.filter(item => {
                    const matchesSearch = songSearchDebounced === '' || 
                      item.title?.toLowerCase().includes(songSearchDebounced.toLowerCase()) || 
                      item.author?.toLowerCase().includes(songSearchDebounced.toLowerCase());
                    const isAssigned = localProgress.some((p: any) => String(p.studentId) === String(studentId) && String(p.lehrwerkId) === String(item.id));
                    return matchesSearch && isAssigned;
                  });

                  return (
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
                      gap: '30px', 
                      alignItems: 'flex-start' 
                    }}>
                      {/* Left Column: Songs */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Music size={16} color={brandColor} /> Songs ({filteredSongs.length})
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {filteredSongs.length === 0 ? (
                            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                              Keine Songs gefunden.
                            </div>
                          ) : (
                            filteredSongs.map(song => {
                              const lwColor = getSongColor(song.title || '');
                              const coverBg = `linear-gradient(135deg, ${lwColor.from} 0%, ${lwColor.to} 100%)`;

                              // Check progress status
                              const progressItem = progressItems.find(item => 
                                item.topic_name.toLowerCase() === song.title.toLowerCase() ||
                                item.topic_name.toLowerCase().includes(song.title.toLowerCase())
                              );

                              let statusColor = '';
                              let statusBg = '';
                              let statusText = '';

                              if (progressItem) {
                                if (progressItem.is_current_homework) {
                                  statusColor = '#06b6d4';
                                  statusBg = '#ecfeff';
                                  statusText = 'Aktuelle Mission';
                                } else if (progressItem.status === 'THEORY_DONE') {
                                  statusColor = '#a855f7';
                                  statusBg = '#f3e8ff';
                                  statusText = 'Theorie gelesen';
                                } else if (progressItem.status === 'MASTERED') {
                                  statusColor = '#34a853';
                                  statusBg = '#e6f4ea';
                                  statusText = 'Meisterwerk!';
                                } else {
                                  statusColor = '#34a853';
                                  statusBg = '#e6f4ea';
                                  statusText = 'In Arbeit';
                                }
                              }

                              return (
                                <div 
                                  key={song.id} 
                                  className="glass-panel hover-scale"
                                  style={{ 
                                    padding: '14px 18px', 
                                    display: 'flex', 
                                    gap: '12px',
                                    alignItems: 'center', 
                                    background: 'white', 
                                    borderRadius: '24px', 
                                    border: '1px solid #e2e8f0', 
                                    borderLeft: `5px solid ${lwColor.from}`,
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)', 
                                    transition: 'all 0.2s ease',
                                    minHeight: '92px',
                                    boxSizing: 'border-box'
                                  }}
                                >
                                  {/* Pink/Peach Sleeve + Vinyl peeking out Cover Icon */}
                                  <div style={{ position: 'relative', width: '68px', height: '56px', flexShrink: 0 }}>
                                    <div style={{
                                      position: 'absolute',
                                      right: '4px',
                                      top: '5px',
                                      width: '46px',
                                      height: '46px',
                                      borderRadius: '50%',
                                      background: '#090a0f',
                                      boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      zIndex: 1
                                    }}>
                                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: lwColor.to, opacity: 0.45 }} />
                                    </div>
                                    <div style={{
                                      position: 'absolute',
                                      left: 0,
                                      top: 0,
                                      width: '56px',
                                      height: '56px',
                                      background: coverBg,
                                      borderRadius: '16px',
                                      boxShadow: '0 8px 20px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      zIndex: 2,
                                      border: `1px solid ${lwColor.text}18`
                                    }}>
                                      <span style={{ fontSize: '28px', lineHeight: 1, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.1))' }}>🎵</span>
                                    </div>
                                  </div>

                                  {/* Title and Artist */}
                                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '1.15rem', letterSpacing: '-0.02em', lineHeight: '1.2' }}>{song.title}</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>von {song.artist}</div>
                                  </div>

                                  {statusText && (
                                    <span style={{
                                      background: statusBg,
                                      color: statusColor,
                                      padding: '4px 8px',
                                      borderRadius: '8px',
                                      fontSize: '0.65rem',
                                      fontWeight: 900,
                                      textTransform: 'uppercase',
                                      whiteSpace: 'nowrap',
                                      alignSelf: 'center',
                                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                                    }}>
                                      {statusText}
                                    </span>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Right Column: Lehrwerke */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Library size={16} color={brandColor} /> Lehrwerke ({filteredLehrwerke.length})
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                          {filteredLehrwerke.length === 0 ? (
                            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                              Keine Lehrwerke gefunden.
                            </div>
                          ) : (
                            filteredLehrwerke.map(item => {
                              const gradient = getLehrwerkColor(item.title, lehrwerke);
                              
                              // Check textbook progress
                              const assignment = localProgress.find((p: any) => String(p.studentId) === String(studentId) && String(p.lehrwerkId) === String(item.id));
                              let masteredCount = 0;
                              if (assignment && assignment.pageStates) {
                                masteredCount = Object.values(assignment.pageStates).filter((s: any) => s.status === 'mastered').length;
                              }
                              const pct = item.totalPages > 0 ? (masteredCount / item.totalPages) : 0;

                              return (
                                <div 
                                  key={item.id} 
                                  className="glass-panel hover-scale" 
                                  style={{ 
                                    padding: '14px 18px', 
                                    background: 'white', 
                                    display: 'flex', 
                                    gap: '12px', 
                                    alignItems: 'center', 
                                    borderRadius: '24px', 
                                    border: '1px solid #e2e8f0', 
                                    borderLeft: `5px solid ${gradient.from}`,
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)',
                                    position: 'relative',
                                    transition: 'all 0.2s ease',
                                    minHeight: '92px',
                                    boxSizing: 'border-box'
                                  }}
                                >
                                  <div style={{ 
                                    width: '44px', 
                                    height: '58px', 
                                    background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`, 
                                    borderRadius: '6px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    color: gradient.text, 
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                                    flexShrink: 0
                                  }}>
                                    <BookOpen size={18} color={gradient.text} />
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <h4 style={{ margin: '0 0 2px 0', fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</h4>
                                    {item.author && <p style={{ margin: '0 0 2px 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>von {item.author}</p>}
                                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>📖 {item.totalPages || 50} Seiten</p>
                                    
                                    {masteredCount > 0 && (
                                      <div style={{ marginTop: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>
                                          <span>{masteredCount} / {item.totalPages} Seiten geschafft</span>
                                          <span>{Math.round(pct * 100)}%</span>
                                        </div>
                                        <div style={{ width: '100%', height: '5px', borderRadius: '3px', background: '#e2e8f0', overflow: 'hidden' }}>
                                          <div style={{ width: `${Math.min(100, pct * 100)}%`, height: '100%', background: gradient.from, borderRadius: '3px' }} />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* RIGHT COLUMN: MEINE ERFOLGE WIDGET */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.45) 100%)',
                backdropFilter: 'blur(24px) saturate(1.8)',
                WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                borderRadius: '24px',
                padding: '24px',
                boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}>
                <div>
                  <h4 style={{ fontSize: '1.05rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontWeight: 900 }}>
                    <div style={{ background: '#fef3c7', padding: '6px', borderRadius: '10px', display: 'flex', alignItems: 'center' }}>
                      <Trophy size={16} color="#d97706" fill="#d97706" />
                    </div>
                    <span>Meine Erfolge</span>
                  </h4>
                  <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '4px 0 0 0', fontWeight: 600 }}>
                    Deine gesammelten Meilensteine
                  </p>
                </div>

                {/* List of Mastered Songs & Lehrwerke */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Mastered Songs Section */}
                  <div>
                    <h5 style={{ fontSize: '0.72rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🏆 Gemeisterte Songs
                    </h5>
                    {(() => {
                      const masteredSongs = progressItems.filter(item => !item.topic_name.includes(' - Seite ') && item.status === 'MASTERED');
                      if (masteredSongs.length === 0) {
                        return (
                          <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.72rem', fontStyle: 'italic', background: 'rgba(255, 255, 255, 0.4)', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                            Noch keine Meisterwerke.
                          </div>
                        );
                      }
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {masteredSongs.map(item => {
                            const matchingSong = songs.find(s => s.title.toLowerCase() === item.topic_name.toLowerCase() || item.topic_name.toLowerCase().includes(s.title.toLowerCase()));
                            const artist = matchingSong?.artist || 'Unbekannt';
                            const title = matchingSong?.title || item.topic_name;
                            const lwColor = getSongColor(title);
                            const coverBg = `linear-gradient(135deg, ${lwColor.from} 0%, ${lwColor.to} 100%)`;

                            return (
                              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#e6f4ea', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e6f4ea' }}>
                                <div style={{
                                  width: '32px',
                                  height: '32px',
                                  background: coverBg,
                                  borderRadius: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: lwColor.text,
                                  flexShrink: 0,
                                  border: '1px solid rgba(0,0,0,0.05)'
                                }}>
                                  <Music size={14} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0, fontSize: '0.78rem', fontWeight: 800, color: '#34a853', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {artist} - {title}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Mastered / Completed Lehrwerke Section */}
                  <div>
                    <h5 style={{ fontSize: '0.72rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      📚 Gemeisterte Lehrwerke
                    </h5>
                    {(() => {
                      const studentAssignments = localProgress.filter((p: any) => String(p.studentId) === String(studentId));
                      const assignedLehrwerke = lehrwerke.filter(book => studentAssignments.some((p: any) => String(p.lehrwerkId) === String(book.id)));

                      // Filter for 100% completed textbooks
                      const completedBooks = assignedLehrwerke.map(book => {
                        const assignment = studentAssignments.find((p: any) => String(p.lehrwerkId) === String(book.id));
                        let masteredCount = 0;
                        if (assignment && assignment.pageStates) {
                          masteredCount = Object.values(assignment.pageStates).filter((s: any) => s.status === 'mastered').length;
                        }
                        const pct = book.totalPages > 0 ? (masteredCount / book.totalPages) : 0;
                        return { book, masteredCount, pct };
                      }).filter(item => item.pct >= 1);

                      if (completedBooks.length === 0) {
                        return (
                          <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.72rem', fontStyle: 'italic', background: 'rgba(255, 255, 255, 0.4)', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                            Noch keine Lehrwerke gemeistert.
                          </div>
                        );
                      }

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {completedBooks.map(({ book }) => {
                            const gradient = getLehrwerkColor(book.title, lehrwerke);
                            const cardBg = '#f5f3ff';
                            const cardBorder = '1px solid #ddd6fe';

                            return (
                              <div key={book.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: cardBg, padding: '10px 12px', borderRadius: '12px', border: cardBorder }}>
                                <div style={{
                                  width: '32px',
                                  height: '32px',
                                  background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                                  borderRadius: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: gradient.text,
                                  flexShrink: 0,
                                  border: '1px solid rgba(0,0,0,0.05)'
                                }}>
                                  <BookOpen size={14} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0, fontSize: '0.78rem', fontWeight: 800, color: '#5b21b6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {book.title}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      <div style={{ display: activeTab === 'campus_cup' ? 'flex' : 'none', flexDirection: 'column', gap: '32px' }}>
        {activeTab === 'campus_cup' && (
          rankingLoading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
              Performance & Highlights werden geladen...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="animation-slide-up">
              
              {/* Top Section: Header & Contribution */}
              {(() => {
                const brandColor = studentUser?.schools?.brand_color || '#34a853';
                const activeSessionMins = sessionActive ? Math.round(secondsElapsed / 60) : 0;
                const liveClassMins = classMins + activeSessionMins;
                const liveClassWeeklyFocus = classWeeklyFocus + activeSessionMins;

                const totalSchoolMins = liveClassMins + otherClassMins;
                const contributionPercent = totalSchoolMins > 0 
                  ? Math.round((liveClassMins / totalSchoolMins) * 100) 
                  : 0;

                // MoM performance percentage
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                const startOfCurrentMonth = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
                const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
                const startOfPreviousMonth = new Date(prevYear, prevMonth, 1, 0, 0, 0, 0);
                const daysElapsed = now.getDate();
                const limitOfPreviousMonth = new Date(prevYear, prevMonth, daysElapsed, now.getHours(), now.getMinutes(), now.getSeconds());

                const currentMonthMins = classFocusLogs.filter(log => {
                  if (!log.created_at) return false;
                  const d = new Date(log.created_at);
                  const isClassmateOrSelf = classmateIds.includes(log.user_id) || log.user_id === studentId;
                  return isClassmateOrSelf && d >= startOfCurrentMonth && d <= now;
                }).reduce((sum, log) => sum + (log.duration_minutes || 0), 0) + activeSessionMins;

                const previousMonthMins = classFocusLogs.filter(log => {
                  if (!log.created_at) return false;
                  const d = new Date(log.created_at);
                  const isClassmateOrSelf = classmateIds.includes(log.user_id) || log.user_id === studentId;
                  return isClassmateOrSelf && d >= startOfPreviousMonth && d <= limitOfPreviousMonth;
                }).reduce((sum, log) => sum + (log.duration_minutes || 0), 0);

                const momPercent = previousMonthMins > 0
                  ? Math.round(((currentMonthMins - previousMonthMins) / previousMonthMins) * 100)
                  : (currentMonthMins > 0 ? 100 : 0);

                // Weekly activity rate
                const startOfWeek = new Date();
                const day = startOfWeek.getDay();
                const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
                startOfWeek.setDate(diff);
                startOfWeek.setHours(0, 0, 0, 0);

                const activeThisWeekCount = (classmateIds || []).filter(id => {
                  return classFocusLogs.some(log => {
                    if (!log.created_at) return false;
                    const d = new Date(log.created_at);
                    return log.user_id === id && d >= startOfWeek && d <= now;
                  });
                }).length;

                const activityRate = classCount > 0
                  ? Math.round((activeThisWeekCount / classCount) * 100)
                  : 0;

                const pieData = liveClassMins === 0 && otherClassMins === 0 
                  ? [
                      { name: 'Unsere Klasse', value: 0.1, color: brandColor },
                      { name: 'Restliche Schule', value: 0.9, color: '#e2e8f0' }
                    ]
                  : [
                      { name: 'Unsere Klasse', value: liveClassMins, color: brandColor },
                      { name: 'Restliche Schule', value: otherClassMins, color: '#cbd5e1' }
                    ];

                return (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2.2fr 1.2fr', gap: '32px', alignItems: 'stretch' }}>
                    {/* Top Left: Header and summary cards */}
                    <div className="glass-panel" style={{ padding: '20px 24px', background: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(0,0,0,0.01)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `${brandColor}15`, color: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Award size={24} />
                        </div>
                        <div>
                          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Performance & Highlights</h2>
                          <p style={{ color: '#64748b', margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>Feiere die Lernfortschritte deiner Klasse und stärke die Motivation durch positives Feedback.</p>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '12px' }}>
                        {[
                          { label: 'Deine Klasse', value: classCount, icon: Users, color: brandColor, bg: '#f8fafc', isNeutral: true },
                          { label: 'Klassen-Übezeit (Monat)', value: formatMins(currentMonthMins), icon: Clock, color: brandColor, bg: '#f8fafc', isNeutral: true },
                          { label: 'Klassen-Übezeit (Woche)', value: formatMins(liveClassWeeklyFocus), icon: TrendingUp, color: brandColor, bg: '#f8fafc', isNeutral: true },
                          { label: 'Beitrag zur Schule', value: `${contributionPercent}%`, icon: Shield, color: brandColor, bg: '#f8fafc', isNeutral: true },
                          { label: 'Trend zum Vormonat', value: momPercent >= 0 ? `+${momPercent}%` : `${momPercent}%`, icon: Activity, color: momPercent >= 0 ? '#34a853' : '#ea4335', bg: momPercent >= 0 ? '#e6f4ea' : '#fce8e6', isNeutral: false },
                          { label: 'Klassen-Aktivität', value: `${activityRate}%`, icon: Zap, color: brandColor, bg: '#f8fafc', isNeutral: true },
                          { label: 'Ø Zeit / Kopf (Woche)', value: formatMinsToMMSS(classCount > 0 ? (liveClassWeeklyFocus / classCount) : 0), icon: Clock, color: brandColor, bg: '#f8fafc', isNeutral: true },
                          { label: 'Ø Zeit / Kopf (Monat)', value: formatMinsToMMSS(classCount > 0 ? (currentMonthMins / classCount) : 0), icon: Award, color: brandColor, bg: '#f8fafc', isNeutral: true }
                        ].map((stat, idx) => (
                          <div key={idx} style={{ padding: '12px 14px', background: stat.bg, borderRadius: '24px', border: stat.isNeutral ? '1px solid #e2e8f0' : `1px solid ${stat.color}25`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '92px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</span>
                              <div style={{ padding: '6px', borderRadius: '8px', background: 'white', color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.02)', border: stat.isNeutral ? '1px solid #e2e8f0' : `1px solid ${stat.color}15` }}>
                                <stat.icon size={16} />
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.02em', marginTop: '4px' }}>{stat.value}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Top Right: Donut Chart (Gemeinsamer Schul-Beitrag) */}
                    <div className="glass-panel" style={{ padding: '20px 24px', background: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.01)' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', width: '100%', marginBottom: '4px', textAlign: 'left' }}>
                        Gemeinsamer Schul-Beitrag
                      </h3>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', width: '100%', margin: '0 0 12px 0', textAlign: 'left', fontWeight: 600 }}>
                        Wie viel trägt deine Klasse bei?
                      </p>

                      <div style={{ width: '100%', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <RechartsPieChart width={130} height={130}>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={42}
                            outerRadius={58}
                            paddingAngle={liveClassMins > 0 && otherClassMins > 0 ? 3 : 0}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatMins(Number(value))} />
                        </RechartsPieChart>
                        
                        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '1.25rem', fontWeight: 950, color: '#0f172a', lineHeight: 1 }}>
                            {contributionPercent}%
                          </span>
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
                            Anteil
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', marginTop: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: '#f8fafc', borderRadius: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: brandColor }} />
                            <span style={{ fontSize: '0.72rem', fontWeight: 750, color: '#334155' }}>Unsere Klasse</span>
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a' }}>{formatMins(liveClassMins)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: '#f8fafc', borderRadius: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#cbd5e1' }} />
                            <span style={{ fontSize: '0.72rem', fontWeight: 750, color: '#64748b' }}>Restliche Schule</span>
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>{formatMins(otherClassMins)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Grid Section: Goals | Highlights | Annual Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr 1.2fr', gap: '32px', alignItems: 'stretch' }}>
                
                {/* Column 1: Übe-Ziele der Klasse */}
                <div className="glass-panel" style={{ padding: '32px', background: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.01)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                      <span>🌱</span> Übe-Ziele der Klasse
                    </h3>
                  </div>

                  {(() => {
                    const brandColor = studentUser?.schools?.brand_color || '#34a853';
                    const targets = classGoals || [];
                    const totalGoals = targets.length;
                    const masteredGoals = targets.filter((target: any) => {
                      const targetPercent = Math.round((classWeeklyFocus / target.minutes) * 100);
                      return targetPercent >= 100;
                    }).length;
                    const highestPercent = targets.length > 0 
                      ? Math.max(...targets.map((target: any) => Math.round((classWeeklyFocus / target.minutes) * 100)))
                      : 0;

                    return (
                      <>
                        {totalGoals > 0 && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '16px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Missionen</span>
                              <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1e293b', marginTop: '2px' }}>{totalGoals}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }}>
                              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Geknackt</span>
                              <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#34a853', marginTop: '2px' }}>{masteredGoals}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Peak</span>
                              <span style={{ fontSize: '1.05rem', fontWeight: 900, color: brandColor, marginTop: '2px' }}>{highestPercent}%</span>
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {totalGoals === 0 ? (
                            <p style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', margin: '20px 0', fontWeight: 600 }}>
                              Keine aktiven Ziele angelegt.
                            </p>
                          ) : (
                            targets.map((target: any) => {
                              const targetPercent = Math.round((classWeeklyFocus / target.minutes) * 100);
                              const isDeadlinePassed = target.deadline ? new Date(target.deadline) < new Date() : false;
                              
                              const maxPercentOnBar = 133;
                              const visualWidth = Math.min(100, (targetPercent / maxPercentOnBar) * 100);
                              const isAchieved = targetPercent >= 100;

                              return (
                                <div 
                                  key={target.id} 
                                  onClick={() => handleOpenContributions(target.title || 'Übe-Ziel der Klasse', target.minutes)}
                                  onMouseOver={e => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(52, 168, 83, 0.22)';
                                  }}
                                  onMouseOut={e => {
                                    e.currentTarget.style.transform = 'none';
                                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(52, 168, 83, 0.12)';
                                  }}
                                  style={{
                                    position: 'relative',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    background: '#34a853',
                                    boxShadow: '0 6px 20px rgba(52, 168, 83, 0.12)',
                                    borderRadius: '16px',
                                    padding: '12px 14px',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                                  }}
                                >
                                  {/* Row 1: Title, Deadline on left & Percentage on right */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                                      <span style={{
                                        fontSize: '0.8rem',
                                        fontWeight: 700,
                                        color: '#ffffff',
                                        letterSpacing: '-0.01em',
                                        lineHeight: '1.25',
                                        whiteSpace: 'normal',
                                        wordBreak: 'break-word'
                                      }}>
                                        {target.title || 'Challenge'}
                                      </span>
                                      {target.deadline && (
                                        <span style={{
                                          fontSize: '0.62rem',
                                          fontWeight: 500,
                                          color: isDeadlinePassed ? '#ff8780' : 'rgba(255, 255, 255, 0.75)',
                                          lineHeight: '1.2',
                                          whiteSpace: 'normal'
                                        }}>
                                          bis {new Date(target.deadline).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                                          {isDeadlinePassed && ' (abgelaufen)'}
                                        </span>
                                      )}
                                    </div>
                                    <span style={{
                                      fontSize: '1.1rem',
                                      fontWeight: 800,
                                      color: '#ffffff',
                                      letterSpacing: '-0.02em',
                                      fontFeatureSettings: '"tnum"',
                                      flexShrink: 0,
                                      alignSelf: 'flex-start'
                                    }}>
                                      {targetPercent}%
                                    </span>
                                  </div>

                                  {/* Progress bar container */}
                                  <div style={{ position: 'relative', height: '6px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '99px' }}>
                                    {/* Target marker (100% line) at 75% width */}
                                    <div style={{
                                      position: 'absolute',
                                      left: '75%',
                                      top: '-2px',
                                      height: '10px',
                                      width: '2px',
                                      background: '#ffffff',
                                      zIndex: 3,
                                      borderRadius: '99px'
                                    }} />

                                    {/* Bar fill */}
                                    <div style={{
                                      width: `${visualWidth}%`,
                                      height: '100%',
                                      background: '#ffffff',
                                      borderRadius: '99px',
                                      transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                      boxShadow: '0 0 6px rgba(255, 255, 255, 0.25)'
                                    }} />
                                  </div>

                                  {/* Row 3: Current / Target & Status label */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', gap: '10px' }}>
                                    <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontFeatureSettings: '"tnum"', fontWeight: 500, whiteSpace: 'normal' }}>
                                      <span style={{ fontWeight: 700, color: '#ffffff' }}>{classWeeklyFocus}</span> / {target.minutes} Min.
                                    </span>
                                    <span style={{
                                      fontWeight: 700,
                                      color: isAchieved ? '#e6f4ea' : 'rgba(255, 255, 255, 0.8)',
                                      whiteSpace: 'normal',
                                      textAlign: 'right'
                                    }}>
                                      {isAchieved ? 'Erreicht 🎉' : `Noch ${Math.max(0, target.minutes - classWeeklyFocus)} Min.`}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Column 2: Helden-Momente */}
                <div className="glass-panel" style={{ padding: '32px', background: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', minHeight: '350px', boxShadow: '0 4px 20px rgba(0,0,0,0.01)' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <span>✨</span> Helden-Momente
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 20px 0', fontWeight: 600 }}>
                    Besondere Highlights deiner Mitschüler aus diesem Monat.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {highlightsLoading ? (
                      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>Highlights werden geladen...</div>
                    ) : classHighlights.length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '24px', border: '1px dashed #cbd5e1' }}>
                        <span style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🤫</span>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#475569', margin: '0 0 6px 0' }}>Ruhe vor dem Sturm</h4>
                        <p style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: '300px', margin: 0, lineHeight: 1.4 }}>
                          Sobald du oder deine Mitschüler diesen Monat fleißig üben oder Challenges meistern, erscheinen die Erfolge hier!
                        </p>
                      </div>
                    ) : (
                      classHighlights.map((hl: any, idx: number) => (
                        <div 
                          key={idx} 
                          style={{ 
                            padding: '14px 18px', 
                            background: '#f8fafc', 
                            borderRadius: '16px', 
                            border: '1px solid #e2e8f0', 
                            display: 'flex', 
                            alignItems: 'center',
                            gap: '14px'
                          }}
                          className="hover-scale"
                        >
                          <span style={{ fontSize: '1.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {hl.emoji}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px' }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a' }}>
                                {(() => {
                                  const name = hl.studentName || '';
                                  const parts = name.trim().split(/\s+/);
                                  if (parts.length <= 1) return name;
                                  const first = parts[0];
                                  const last = parts[parts.length - 1];
                                  return `${first} ${last.charAt(0)}.`;
                                })()}
                              </span>
                              <span style={{ fontSize: '0.65rem', fontWeight: 900, color: studentUser?.schools?.brand_color || '#34a853', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                {hl.title}
                              </span>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '3px 0 0 0', lineHeight: 1.3, fontWeight: 555 }}>
                              {hl.text}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Column 3: Jahresstatistik */}
                <div className="glass-panel" style={{ padding: '32px', background: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.01)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                    <div style={{ background: '#e6f4ea', color: '#34a853', padding: '8px', borderRadius: '12px' }}>
                      <Calendar size={18} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>
                        Jahres-Statistik
                      </h3>
                      <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '2px 0 0 0', fontWeight: 600 }}>
                        Übeminuten (Sep - Aug)
                      </p>
                    </div>
                  </div>

                  {(() => {
                    const now = new Date();
                    const currentMonth = now.getMonth();
                    const startYear = currentMonth >= 8 ? now.getFullYear() : now.getFullYear() - 1;
                    const monthsList = [
                      { month: 8, label: 'Sep', year: startYear },
                      { month: 9, label: 'Okt', year: startYear },
                      { month: 10, label: 'Nov', year: startYear },
                      { month: 11, label: 'Dez', year: startYear },
                      { month: 0, label: 'Jan', year: startYear + 1 },
                      { month: 1, label: 'Feb', year: startYear + 1 },
                      { month: 2, label: 'Mrz', year: startYear + 1 },
                      { month: 3, label: 'Apr', year: startYear + 1 },
                      { month: 4, label: 'Mai', year: startYear + 1 },
                      { month: 5, label: 'Jun', year: startYear + 1 },
                      { month: 6, label: 'Jul', year: startYear + 1 },
                      { month: 7, label: 'Aug', year: startYear + 1 }
                    ];

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                          {monthsList.map(item => {
                            const logsForMonth = classFocusLogs.filter(log => {
                              if (!log.created_at) return false;
                              const logDate = new Date(log.created_at);
                              const isClassmateOrSelf = (classmateIds || []).includes(log.user_id) || log.user_id === studentId;
                              return isClassmateOrSelf && logDate.getMonth() === item.month && logDate.getFullYear() === item.year;
                            });
                            let totalSecs = logsForMonth.reduce((sum, log) => {
                              return sum + (log.duration_seconds || ((log.duration_minutes || 0) * 60));
                            }, 0);

                            if (sessionActive && secondsElapsed > 0 && item.month === now.getMonth() && item.year === now.getFullYear()) {
                              totalSecs += secondsElapsed;
                            }

                            const minutes = Math.round(totalSecs / 60);

                            // Heatmap calculations
                            let bg = '#f8fafc';
                            let border = '1px solid #e2e8f0';
                            let labelColor = '#94a3b8';
                            let textColor = '#64748b';
                            let numColor = '#1e293b';
                            let shadow = 'none';

                            if (minutes > 0) {
                              if (minutes <= 15) {
                                bg = 'linear-gradient(135deg, #e6f4ea 0%, #e6fbf0 100%)';
                                border = '1px solid #e6f4ea';
                                labelColor = '#34a853';
                                textColor = '#34a853';
                                numColor = '#34a853';
                                shadow = '0 2px 6px rgba(52, 168, 83, 0.04)';
                              } else if (minutes <= 60) {
                                bg = 'linear-gradient(135deg, #e6f4ea 0%, #e6f4ea 100%)';
                                border = '1px solid #e6f4ea';
                                labelColor = '#34a853';
                                textColor = '#34a853';
                                numColor = '#34a853';
                                shadow = '0 3px 8px rgba(52, 168, 83, 0.07)';
                              } else if (minutes <= 180) {
                                bg = 'linear-gradient(135deg, #e6f4ea 0%, #e6f4ea 100%)';
                                border = '1px solid #e6f4ea';
                                labelColor = '#34a853';
                                textColor = '#34a853';
                                numColor = '#34a853';
                                shadow = '0 4px 12px rgba(52, 168, 83, 0.12)';
                              } else {
                                bg = 'linear-gradient(135deg, #34a853 0%, #34a853 100%)';
                                border = '1px solid #34a853';
                                labelColor = 'rgba(255, 255, 255, 0.8)';
                                textColor = 'rgba(255, 255, 255, 0.9)';
                                numColor = '#ffffff';
                                shadow = '0 6px 15px rgba(52, 168, 83, 0.25)';
                              }
                            }

                            return (
                              <div 
                                key={`${item.month}-${item.year}`}
                                style={{
                                  background: bg,
                                  border: border,
                                  borderRadius: '16px',
                                  padding: '12px 4px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '3px',
                                  minHeight: '66px',
                                  textAlign: 'center',
                                  boxShadow: shadow,
                                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                              >
                                <span style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: labelColor }}>
                                  {item.label}
                                </span>
                                <span style={{ fontSize: '1.05rem', fontWeight: 950, color: numColor, fontFeatureSettings: '"tnum"', letterSpacing: '-0.02em' }}>
                                  {minutes}<span style={{ fontSize: '0.72rem', fontWeight: 700, color: textColor, marginLeft: '1px' }}>m</span>
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Legend */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '8px 12px', background: '#f8fafc', padding: '10px 14px', borderRadius: '14px', border: '1px solid #e2e8f0', marginTop: '6px' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Heatmap:</span>
                          {[
                            { color: '#f8fafc', label: '0m', border: '#e2e8f0' },
                            { color: '#e6f4ea', label: '<15m', border: '#e6f4ea' },
                            { color: '#e6f4ea', label: '<1h', border: '#e6f4ea' },
                            { color: '#e6f4ea', label: '<3h', border: '#e6f4ea' },
                            { color: '#34a853', label: '3h+', border: '#34a853' }
                          ].map(pill => (
                            <div key={pill.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: pill.color, border: `1px solid ${pill.border}` }} />
                              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b' }}>{pill.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

              </div>

            </div>
          )
        )}
      </div>

      <div style={{ display: activeTab === 'events' ? 'block' : 'none' }}>
        {activeTab === 'events' && (
          <CampusEventsBoard 
            userId={studentId}
            role="student"
            schoolId={studentUser?.school_id || ''}
            supabase={supabase}
            brandColor={studentUser?.schools?.brand_color || '#34a853'}
          />
        )}
      </div>

      <div style={{ display: (activeTab === 'homework_book' && studentUser) ? 'block' : 'none', marginTop: '24px', width: '100%' }}>
        {activeTab === 'homework_book' && studentUser && (
          <MeisterwerkDocumentationModal
            student={{
              id: studentId,
              first_name: studentUser ? studentUser.first_name : '',
              last_name: studentUser ? studentUser.last_name : '',
              photo_url: (studentUser && studentUser.photo_url) || '/avatar_ghost.jpg',
              is_campus_active: studentUser ? studentUser.is_campus_active : false
            }}
            onClose={() => {}}
            teacherId={studentUser ? studentUser.teacher_id : null}
            readOnly={true}
            isEmbed={true}
          />
        )}
      </div>

      <div style={{ display: activeTab === 'briefing' ? 'block' : 'none' }}>
        {activeTab === 'briefing' && (
          isMobile ? (
          <MobileBriefingView
            studentUser={studentUser}
            briefingData={briefingData}
            scheduleOccurrences={scheduleOccurrences}
            progressItems={progressItems}
            currentXp={currentXp}
            wrappedData={wrappedData}
            avatar={avatar}
            setActiveTab={setActiveTab}
            setAppointmentChatData={setAppointmentChatData}
            setShowAppointmentChat={setShowAppointmentChat}
            handleRejectReschedule={handleRejectReschedule}
            handleConfirmReschedule={handleConfirmReschedule}
            handleAcknowledgeCancellation={handleAcknowledgeCancellation}
            getISOWeek={getISOWeek}
            handleTabChangeLocal={handleTabChangeLocal}
            campusFeedAnnouncements={campusFeedAnnouncements}
            songStats={songStats}
            occurrencesWithMessages={occurrencesWithMessages}
            setShowRulesModal={setShowRulesModal}
            lehrwerke={lehrwerke}
            localProgress={localProgress}
            studentId={studentId}
            studentFeedTab={studentFeedTab}
            setStudentFeedTab={setStudentFeedTab}
            classFeedPosts={classFeedPosts}
            classFeedInteractions={classFeedInteractions}
            handleSubmitClassFeedInteraction={handleSubmitClassFeedInteraction}
            feedInteractions={feedInteractions}
            handleReactToPost={handleReactToPost}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* MAIN 2-COLUMN LAYOUT */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: '32px', alignItems: 'start' }}>
            
            {/* LEFT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* TOP 4 KPIs ROW - SLEEK GAMIFIED TILES */}
              <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', width: '100%' }}>
                
                {/* KPI 1: XP */}
                {xpActive && (
                  <div style={{ 
                    flex: '1 1 0px',
                    minWidth: 0,
                    position: 'relative', overflow: 'hidden',
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white',
                    borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.3)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '70px',
                    padding: '16px', boxSizing: 'border-box',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }} className="hover-scale">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Level XP</span>
                      <div style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '6px', borderRadius: '10px' }}>
                        <Star size={14} color="white" fill="white" />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '8px' }}>
                      <span style={{ fontSize: '1.6rem', fontWeight: 950, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>
                        {currentXp || 0}
                      </span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, opacity: 0.9 }}>XP</span>
                    </div>
                  </div>
                )}

                {/* KPI 2: Songs */}
                <div style={{ 
                  flex: '1 1 0px',
                  minWidth: 0,
                  position: 'relative', overflow: 'hidden',
                  background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)', color: 'white',
                  borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(52, 168, 83, 0.3)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '70px',
                  padding: '16px', boxSizing: 'border-box',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }} className="hover-scale">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Songs</span>
                    <div style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '6px', borderRadius: '10px' }}>
                      <Award size={14} color="white" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '8px' }}>
                    <span style={{ fontSize: '1.6rem', fontWeight: 950, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>
                      {songStats.masteredCount}/{songStats.assignedCount}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, opacity: 0.9 }}>Songs</span>
                  </div>
                </div>

                {/* KPI 3: Fokus */}
                {flamesActive && (
                  <div style={{ 
                    flex: '1 1 0px',
                    minWidth: 0,
                    position: 'relative', overflow: 'hidden',
                    background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)', color: 'white',
                    borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(234, 179, 8, 0.35)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '70px',
                    padding: '16px', boxSizing: 'border-box',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }} className="hover-scale">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Übeminuten</span>
                      <div style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '6px', borderRadius: '10px' }}>
                        <Clock size={14} color="white" />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '8px' }}>
                      <span style={{ fontSize: '1.6rem', fontWeight: 950, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>
                        {wrappedData?.monthlyFlashback?.focusMinutes || 0}
                      </span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, opacity: 0.9 }}>Min</span>
                    </div>
                  </div>
                )}

                {/* KPI 4: Streak */}
                {flamesActive && (
                  <div style={{ 
                    flex: '1 1 0px',
                    minWidth: 0,
                    position: 'relative', overflow: 'hidden',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white',
                    borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.3)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '70px',
                    padding: '16px', boxSizing: 'border-box',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }} className="hover-scale">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tagesserie</span>
                      <div style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '6px', borderRadius: '10px' }}>
                        <Flame size={14} color="white" fill="white" />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '8px' }}>
                      <span style={{ fontSize: '1.6rem', fontWeight: 950, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>
                        {avatar?.streak_flame || 0}
                      </span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, opacity: 0.9 }}>Tage</span>
                    </div>
                  </div>
                )}

              </div>

              {/* Welcome Block */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.5) 100%)',
                backdropFilter: 'blur(24px) saturate(1.8)',
                WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
                border: '1px solid rgba(255, 255, 255, 0.7)',
                borderRadius: '30px',
                display: 'flex',
                alignItems: 'stretch',
                boxShadow: '0 20px 50px rgba(15, 23, 42, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                width: '100%',
                boxSizing: 'border-box',
                overflow: 'hidden',
                position: 'relative',
                minHeight: '200px'
              }}>
                {/* Background decorative music note */}
                <Music size={160} style={{ position: 'absolute', right: '5%', bottom: '-40px', opacity: 0.03, color: '#6366f1', pointerEvents: 'none' }} />

                {/* Left Instrument Avatar Sticker Container - Full Height */}
                <div style={{
                  width: '190px',
                  background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                  position: 'relative',
                  overflow: 'hidden',
                  borderRight: '1px solid rgba(0, 0, 0, 0.1)'
                }}>
                  {/* Glowing background behind instrument */}
                  <div style={{
                    position: 'absolute',
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(99, 102, 241, 0) 70%)',
                    filter: 'blur(10px)',
                    zIndex: 1
                  }} />
                  <img 
                    src={
                      studentUser?.role === 'admin' || studentUser?.role === 'secretary'
                        ? '/campus_login_hero.png'
                        : studentUser?.photo_url && studentUser.photo_url.includes('_avatar')
                        ? studentUser.photo_url
                        : getInstrumentAvatarUrl(studentUser?.resolved_instrument || studentUser?.instrument)
                    } 
                    alt="" 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                      zIndex: 2,
                      transform: 'scale(1.05)',
                      transition: 'transform 0.5s ease'
                    }} 
                    className="hover-zoom"
                  />
                  

                </div>

                {/* Right Text & Info Column */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0, flex: 1, zIndex: 2, padding: '24px 32px' }}>
                  {/* Live Clock Badge & Status Indicator */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#ffffff',
                      border: '1px solid rgba(0, 0, 0, 0.05)',
                      borderRadius: '100px',
                      padding: '4px 12px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                    }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34a853', animation: 'pulse 2s infinite' }} />
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#475569', letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                        {new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} UHR
                      </span>
                    </div>

                    <div style={{
                      background: 'rgba(99, 102, 241, 0.08)',
                      color: '#4f46e5',
                      fontSize: '0.6rem',
                      fontWeight: 900,
                      borderRadius: '100px',
                      padding: '4px 10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Bereit zum Jammen ⚡️
                    </div>
                  </div>

                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '28px', 
                    fontWeight: 950, 
                    color: '#0f172a', 
                    fontFamily: "'Plus Jakarta Sans', sans-serif", 
                    lineHeight: 1.1,
                    letterSpacing: '-0.02em'
                  }}>
                    Willkommen zurück, <span style={{ 
                      background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      fontWeight: 950
                    }}>{studentUser?.first_name || ''}</span>! 👋
                  </h3>
                  
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.88rem', color: '#475569', fontWeight: 600, lineHeight: 1.45, maxWidth: '95%' }}>
                    {flamesActive 
                      ? 'Ein neuer Moment für Musik. Nimm dir heute ein paar Minuten für deine Übungsziele und sichere dir deine tägliche Serie!'
                      : 'Ein neuer Moment für Musik. Nimm dir heute ein paar Minuten für deine Übungsziele!'}
                  </p>

                  {briefingData?.todayLesson || scheduleOccurrences?.length > 0 ? (() => {
                    const nextOcc = scheduleOccurrences[0];
                    const hasToday = !!briefingData?.todayLesson;
                    
                    const teacherId = hasToday ? briefingData.todayLesson.teacher_id : nextOcc?.teacher_id;
                    const teacherName = hasToday ? briefingData.todayLesson.teacher : (nextOcc?.teacher ? `Herr/Frau ${nextOcc.teacher.last_name}` : 'Lehrkraft');
                    const timeLabel = hasToday ? briefingData.todayLesson.time : nextOcc?.start_time?.substring(0, 5);
                    
                    const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                    const todayStr = new Date().toISOString().split('T')[0];
                    
                    const targetDateStr = hasToday ? todayStr : nextOcc?.date;
                    const targetDayOfWeek = targetDateStr ? DAYS_DE[new Date(targetDateStr).getDay()] : 'Termin';
                    const formattedDate = targetDateStr ? new Date(targetDateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : '';
                    const label = `${targetDayOfWeek} (${formattedDate}), ${timeLabel} Uhr`;
  
                    const todayOcc = (scheduleOccurrences || []).find(occ => occ.date === todayStr);
                    const finalOccurId = hasToday 
                      ? (todayOcc?.id || briefingData?.todayLesson?.id || `today-${teacherId}-${todayStr}`) 
                      : nextOcc?.id;
  
                    return (
                      <div style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          background: 'linear-gradient(135deg, rgba(52, 168, 83, 0.08) 0%, rgba(52, 168, 83, 0.02) 100%)', 
                          color: '#34a853', 
                          padding: '6px 14px', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem', 
                          fontWeight: 800,
                          border: '1px solid rgba(52, 168, 83, 0.15)'
                        }}>
                          <Calendar size={13} color="#34a853" />
                          <span>Nächster Unterricht: {hasToday ? `Heute, ${briefingData.todayLesson.time} Uhr` : (() => {
                            if(!nextOcc) return 'Demnächst';
                            const d = new Date(nextOcc.date);
                            return `${d.toLocaleDateString('de-DE', {weekday: 'long', day: '2-digit', month: '2-digit'})} - ${nextOcc.start_time?.substring(0,5)} Uhr`;
                          })()}</span>
                        </div>
  
                        {teacherId && (() => {
                          const hasMessage = finalOccurId && occurrencesWithMessages.includes(finalOccurId);
                          return (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setAppointmentChatData({
                                  teacherId,
                                  date: targetDateStr,
                                  start_time: timeLabel,
                                  label,
                                  occurrenceId: finalOccurId
                                });
                                setShowAppointmentChat(true);
                              }}
                              title="Shoutbox öffnen"
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                background: hasMessage ? '#fef3c7' : '#e0e7ff', 
                                color: hasMessage ? '#d97706' : '#4f46e5', 
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                flexShrink: 0,
                                boxShadow: hasMessage ? '0 4px 10px rgba(217, 119, 6, 0.1)' : '0 4px 10px rgba(79, 70, 229, 0.1)'
                              }}
                              onMouseOver={e => e.currentTarget.style.background = hasMessage ? '#fde68a' : '#c7d2fe'}
                              onMouseOut={e => e.currentTarget.style.background = hasMessage ? '#fef3c7' : '#e0e7ff'}
                            >
                              <MessageSquare size={14} fill={hasMessage ? 'currentColor' : 'none'} />
                            </button>
                          );
                        })()}
                      </div>
                    );
                  })() : (
                    <div style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(52, 168, 83, 0.06)', color: '#34a853', padding: '6px 14px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}>
                      <Calendar size={13} color="#34a853" />
                      <span>Nächster Unterricht: Demnächst</span>
                    </div>
                  )}
                </div>
              </div>

              {/* PEDAGOGISCHER DREISPALTIER-ÜBEBEREICH */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '24px', 
                alignItems: 'stretch' 
              }}>

                {/* Spalte 1: Hausaufgaben (Orientieren & Planen) */}
                {(() => {
                  const getPrevWeek = (wkStr: string): string => {
                    const [year, week] = wkStr.split('-W').map(Number);
                    const simple = new Date(year, 0, 4);
                    const day = simple.getDay() || 7;
                    const monday = new Date(simple.getTime() - (day - 1) * 24 * 3600000);
                    monday.setDate(monday.getDate() + (week - 1) * 7 - 7);
                    return getISOWeekRaw(monday, 1);
                  };

                  const latestItem = progressItems.find(item => item.is_current_homework || item.topic_name.startsWith('Hausaufgabe KW '));
                  const currentWeekStr = latestItem ? getItemWeek(latestItem) : getISOWeekRaw(new Date(), 1);
                  const prevWeekStr = getPrevWeek(currentWeekStr);

                  const parseHomeworkNotes = (rawNotes: string): string[] => {
                    if (!rawNotes || rawNotes.trim() === '') return [];
                    try {
                      let parsed: string[] = [];
                      if (rawNotes.startsWith('[') && rawNotes.endsWith(']')) {
                        parsed = JSON.parse(rawNotes);
                      } else {
                        parsed = rawNotes.split('\n\n').filter(Boolean);
                      }
                      const unique: string[] = [];
                      parsed.forEach(n => {
                        if (n && n.trim() && !unique.includes(n.trim())) {
                          unique.push(n.trim());
                        }
                      });
                      return unique;
                    } catch (e) {
                      return [rawNotes.trim()];
                    }
                  };

                  const currentWeekItems = progressItems.filter(item => {
                    if (item.topic_name.startsWith('Hausaufgabe KW ')) return false;
                    if (item.status === 'MASTERED' || item.status === 'THEORY_DONE') return false;
                    
                    if (item.topic_name.includes(' - Seite ')) {
                      // Must be from the current week!
                      if (!item.updated_at || getISOWeekRaw(item.updated_at, 1) !== currentWeekStr) {
                        return false;
                      }
                      const parts = item.topic_name.split(' - Seite ');
                      const bookTitle = parts[0].trim();
                      const pageNum = parseInt(parts[1], 10);
                      const book = lehrwerke.find(g => g.title === bookTitle);
                      if (book) {
                        const assignment = localProgress.find((p: any) => p.studentId === studentId && p.lehrwerkId === book.id);
                        const pageState = assignment?.pageStates?.[pageNum];
                        return pageState?.status === 'homework';
                      }
                    }
                    return item.is_current_homework;
                  });

                  const getNotesForWeek = (weekStr: string): string[] => {
                    const notes: string[] = [];
                    const weekItems = progressItems.filter(item => getItemWeek(item) === weekStr);
                    for (const item of weekItems) {
                      if (item.homework_notes && item.homework_notes.trim()) {
                        const parsed = parseHomeworkNotes(item.homework_notes);
                        parsed.forEach(n => {
                          if (n && n.trim() && !notes.includes(n.trim())) {
                            notes.push(n.trim());
                          }
                        });
                      }
                    }
                    return notes;
                  };

                  const currentWeekNotes = getNotesForWeek(currentWeekStr);
                  const prevWeekNotes = getNotesForWeek(prevWeekStr);

                  const prevWeekItems = progressItems.filter(item => 
                    !item.topic_name.startsWith('Hausaufgabe KW ') && 
                    item.status !== 'MASTERED' && 
                    item.status !== 'THEORY_DONE' && 
                    getItemWeek(item) === prevWeekStr
                  );

                  const currentWeekNum = currentWeekStr.split('-W')[1] || '';
                  const prevWeekNum = prevWeekStr.split('-W')[1] || '';

                  const cleanTitle = (t: string) => t.replace(/\s*\((gitarre|guitar|e-gitarre|bass|e-bass|drums|schlagzeug|klavier|piano|keys|keyboard|vocals|gesang|stimme|allgemein)\)/i, '');

                  const groupAndFormatItems = (rawItems: any[]) => {
                    const groupedLehrwerke: Record<string, { pages: { num: number; notes: string; status: string }[] }> = {};
                    const otherItems: any[] = [];

                    (rawItems || []).forEach(item => {
                      const title = item.title || item.topic_name || '';
                      if (title.includes(' - Seite ')) {
                        const parts = title.split(' - Seite ');
                        const bookTitle = cleanTitle(parts[0].trim());
                        const pageNum = parseInt(parts[1], 10);
                        
                        if (!groupedLehrwerke[bookTitle]) {
                          groupedLehrwerke[bookTitle] = { pages: [] };
                        }
                        if (!isNaN(pageNum) && !groupedLehrwerke[bookTitle].pages.some(p => p.num === pageNum)) {
                          groupedLehrwerke[bookTitle].pages.push({
                            num: pageNum,
                            notes: item.teacher_notes || '',
                            status: item.status
                          });
                        }
                      } else {
                        otherItems.push(item);
                      }
                    });

                    // Sort pages
                    Object.keys(groupedLehrwerke).forEach(title => {
                      groupedLehrwerke[title].pages.sort((a, b) => a.num - b.num);
                    });

                    const formatPageNumbers = (pages: number[]): string => {
                      if (pages.length === 0) return '';
                      const sorted = [...pages].sort((a, b) => a - b);
                      const ranges: string[] = [];
                      let start = sorted[0];
                      let end = start;
                      
                      for (let i = 1; i < sorted.length; i++) {
                        if (sorted[i] === end + 1) {
                          end = sorted[i];
                        } else {
                          if (start === end) {
                            ranges.push(`${start}`);
                          } else {
                            ranges.push(`${start}-${end}`);
                          }
                          start = sorted[i];
                          end = start;
                        }
                      }
                      if (start === end) {
                        ranges.push(`${start}`);
                      } else {
                        ranges.push(`${start}-${end}`);
                      }
                      
                      if (ranges.length === 1) return `S. ${ranges[0]}`;
                      const last = ranges.pop();
                      return `S. ${ranges.join(', ')} & ${last}`;
                    };

                    const groupedItems = Object.entries(groupedLehrwerke).map(([bookTitle, info]) => {
                      const pageNums = info.pages.map(p => p.num);
                      const formattedPages = formatPageNumbers(pageNums);
                      
                      const textNotes = info.pages
                        .map(p => p.notes)
                        .filter(Boolean)
                        .filter(n => n !== 'Inhalte in der Premium-Version freischalten' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:'))
                        .join('; ');

                      const allDone = info.pages.every(p => p.status === 'MASTERED' || p.status === 'THEORY_DONE');
                      return {
                        title: bookTitle,
                        subtitle: formattedPages,
                        notes: textNotes,
                        status: allDone ? 'MASTERED' : 'IN_PROGRESS',
                        isBook: true
                      };
                    });

                    return [
                      ...groupedItems,
                      ...otherItems.map(item => ({
                        title: cleanTitle(item.title || item.topic_name || ''),
                        subtitle: '',
                        notes: item.teacher_notes || '',
                        status: item.status,
                        isBook: false
                      }))
                    ];
                  };

                  const formattedPrevWeekItems = groupAndFormatItems(prevWeekItems);
                  const formattedCurrentWeekItems = groupAndFormatItems(currentWeekItems);

                  return (
                    <div style={{ 
                      background: '#ffffff', 
                      borderRadius: '24px', 
                      padding: '24px', 
                      boxShadow: '0 10px 30px rgba(15, 23, 42, 0.03)',
                      border: '1px solid rgba(0, 0, 0, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ background: 'rgba(52, 168, 83, 0.08)', color: '#34a853', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <BookOpen size={16} />
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 950, color: '#1e293b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            Hausaufgaben
                          </h4>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Deine Wochenziele
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto' }}>
                        {/* Hausaufgaben dieser Woche */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Aktuell (KW {currentWeekNum || '?'})
                            </span>
                            <span style={{ background: '#e6f4ea', color: '#34a853', fontSize: '0.58rem', fontWeight: 900, padding: '1px 6px', borderRadius: '4px' }}>
                              Aktiv
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {((formattedCurrentWeekItems && formattedCurrentWeekItems.length > 0) || (currentWeekNotes && currentWeekNotes.length > 0)) ? (
                              <>
                                {formattedCurrentWeekItems && formattedCurrentWeekItems.map((item: any, idx: number) => {
                                  const isBook = item.isBook;
                                  const isDone = item.status === 'MASTERED' || item.status === 'THEORY_DONE';
                                  const textNotes = item.notes;
                                  
                                  return (
                                    <div key={`curr-item-${idx}`} style={{
                                      background: isDone ? 'rgba(52, 168, 83, 0.02)' : '#ffffff',
                                      padding: '10px 12px',
                                      borderRadius: '12px',
                                      border: isDone ? '1px solid rgba(52, 168, 83, 0.15)' : '1px solid rgba(0, 0, 0, 0.04)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '4px'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                          {isBook ? <BookOpen size={12} color={isDone ? '#34a853' : '#34a853'} /> : <Music size={12} color={isDone ? '#34a853' : '#34a853'} />}
                                          <span style={{ 
                                            fontWeight: 800, 
                                            color: isDone ? '#94a3b8' : '#1e293b', 
                                            fontSize: '0.78rem', 
                                            textDecoration: isDone ? 'line-through' : 'none',
                                            whiteSpace: 'nowrap', 
                                            textOverflow: 'ellipsis', 
                                            overflow: 'hidden' 
                                          }}>
                                            {item.title} {item.subtitle ? `(${item.subtitle})` : ''}
                                          </span>
                                        </div>
                                        
                                        {isDone ? (
                                          <span style={{ color: '#34a853', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                            <Check size={12} strokeWidth={3} />
                                          </span>
                                        ) : (
                                          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4f46e5', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
                                        )}
                                      </div>
                                      {textNotes && (
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650, marginLeft: '20px' }}>
                                          Bemerkung: {textNotes}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}

                                {currentWeekNotes && (() => {
                                  let audioCount = 0;
                                  const filteredNotes = currentWeekNotes.filter((note: string) => !note.startsWith("STICKER:"));
                                  return filteredNotes.map((note: string, idx: number) => {
                                    const isAudio = note.startsWith("AUDIO:");
                                    if (isAudio) {
                                      audioCount++;
                                      const parts = note.substring(6).split('|');
                                      return (
                                        <div key={`curr-note-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '6px 10px', borderRadius: '12px', borderLeft: '3px solid #34a853', margin: '2px 4px' }}>
                                          <InlineAudioPlayer url={parts[0]} label={parts[3] || `Play-Along #${audioCount}`} />
                                        </div>
                                      );
                                    }
                                    return (
                                      <div key={`curr-note-${idx}`} style={{ 
                                        fontSize: '0.78rem', 
                                        color: '#475569', 
                                        fontWeight: 650, 
                                        fontStyle: 'italic', 
                                        borderLeft: '3px solid #34a853', 
                                        paddingLeft: '8px', 
                                        margin: '2px 4px',
                                        lineHeight: 1.4,
                                        background: '#f8fafc',
                                        padding: '6px 8px',
                                        borderRadius: '0 8px 8px 0',
                                        whiteSpace: 'pre-line'
                                      }}>
                                        📝 {note}
                                      </div>
                                    );
                                  });
                                })()}
                              </>
                            ) : (
                              <div style={{ 
                                padding: '12px', 
                                background: '#f8fafc',
                                borderRadius: '12px',
                                border: '1px dashed #cbd5e1',
                                fontSize: '0.75rem',
                                color: '#94a3b8',
                                textAlign: 'center',
                                fontWeight: 700
                              }}>
                                Keine Aufgaben erfasst
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Hausaufgaben der Vorwoche */}
                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                          <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                            Letzte Woche (KW {prevWeekNum || '?'})
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', opacity: 0.7 }}>
                            {((formattedPrevWeekItems && formattedPrevWeekItems.length > 0) || (prevWeekNotes && prevWeekNotes.length > 0)) ? (
                              <>
                                {formattedPrevWeekItems && formattedPrevWeekItems.map((item: any, idx: number) => {
                                  const isBook = item.isBook;
                                  const isDone = item.status === 'MASTERED' || item.status === 'THEORY_DONE';
                                  const textNotes = item.notes;
                                  
                                  return (
                                    <div key={`prev-item-${idx}`} style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '2px',
                                      fontSize: '0.75rem'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                          {isBook ? <BookOpen size={11} color="#94a3b8" /> : <Music size={11} color="#94a3b8" />}
                                          <span style={{ fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                            {item.title} {item.subtitle ? `(${item.subtitle})` : ''}
                                          </span>
                                        </div>
                                        {isDone && <Check size={10} color="#34a853" strokeWidth={3} />}
                                      </div>
                                      {textNotes && (
                                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginLeft: '17px' }}>
                                          Bemerkung: {textNotes}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                {prevWeekNotes && (() => {
                                  let audioCount = 0;
                                  const filteredNotes = prevWeekNotes.filter((note: string) => !note.startsWith("STICKER:"));
                                  return filteredNotes.map((note: string, idx: number) => {
                                    const isAudio = note.startsWith("AUDIO:");
                                    if (isAudio) {
                                      audioCount++;
                                      const parts = note.substring(6).split('|');
                                      return (
                                        <div key={`prev-note-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '6px 10px', borderRadius: '12px', borderLeft: '2px solid #cbd5e1', margin: '2px 4px', opacity: 0.85 }}>
                                          <InlineAudioPlayer url={parts[0]} label={parts[3] || `Play-Along #${audioCount}`} />
                                        </div>
                                      );
                                    }
                                    return (
                                      <div key={`prev-note-${idx}`} style={{ 
                                        fontSize: '0.72rem', 
                                        color: '#64748b', 
                                        fontWeight: 650, 
                                        fontStyle: 'italic', 
                                        borderLeft: '2px solid #cbd5e1', 
                                        paddingLeft: '6px', 
                                        margin: '2px 4px',
                                        lineHeight: 1.3,
                                        whiteSpace: 'pre-line'
                                      }}>
                                        {note}
                                      </div>
                                    );
                                  });
                                })()}
                              </>
                            ) : (
                              <div style={{ fontSize: '0.72rem', color: '#cbd5e1', fontStyle: 'italic' }}>
                                Keine Aufgaben erfasst
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Spalte 2: Tägliche Übezeit (Tun & Erleben) */}
                {flamesActive && (() => {
                  const streak = avatar?.streak_flame || 0;
                  const requiredMins = streak >= 6 ? 10 : streak >= 3 ? 5 : 3;
                  return (
                    <div style={{ 
                      background: '#ffffff', 
                      borderRadius: '24px', 
                      padding: '24px', 
                      boxShadow: '0 10px 30px rgba(15, 23, 42, 0.03)',
                      border: '1px solid rgba(0, 0, 0, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '16px'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ background: 'rgba(251, 188, 5, 0.12)', color: '#d97706', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Zap size={16} fill="currentColor" />
                          </div>
                          <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Dein tägliches Ritual</span>
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            Tägliche Übezeit
                          </h4>
                          <p style={{ margin: '6px 0 0 0', fontSize: '0.78rem', color: '#64748b', lineHeight: 1.45 }}>
                            Schön, dass du da bist! Lass uns gemeinsam Musik machen. Jede Minute, die du heute übst, stärkt deine Superkräfte am Instrument und bringt dich deinen Zielen ein Stück näher. 🎸✨
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ 
                          background: 'rgba(251, 188, 5, 0.05)', 
                          borderRadius: '12px', 
                          padding: '10px 14px', 
                          border: '1px dashed rgba(251, 188, 5, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          alignSelf: 'stretch'
                        }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1.5s infinite' }} />
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#854d0e' }}>
                            Ziel für heute: Mindestens {requiredMins} Min. üben
                          </span>
                        </div>

                        <button 
                          onClick={() => setActiveTab('practice_board')}
                          style={{ 
                            background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '12px', 
                            padding: '12px 20px', 
                            fontWeight: 900, 
                            fontSize: '0.85rem', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            gap: '8px', 
                            boxShadow: '0 8px 20px rgba(79, 70, 229, 0.2)',
                            transition: 'all 0.2s',
                            width: '100%'
                          }}
                          onMouseOver={e => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 10px 25px rgba(79, 70, 229, 0.3)';
                          }}
                          onMouseOut={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 8px 20px rgba(79, 70, 229, 0.2)';
                          }}
                        >
                          <Play size={14} fill="white" />
                          🚀 Üben starten
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {flamesActive && (() => {
                  const streak = avatar?.streak_flame || 0;
                  const level = avatar?.evolution_level || 1;
                  
                  const isTier1Unlocked = streak >= 1;
                  const isTier2Unlocked = streak >= 4;
                  const isTier3Unlocked = streak >= 9;

                  return (
                    <div style={{ 
                      background: '#ffffff', 
                      borderRadius: '24px', 
                      padding: '24px', 
                      boxShadow: '0 10px 30px rgba(15, 23, 42, 0.03)',
                      border: '1px solid rgba(0, 0, 0, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            🔥 Flammen-Pfad
                          </span>
                          <button 
                            onClick={() => setShowRulesModal(true)}
                            style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8', transition: 'color 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.color = '#ea580c'}
                            onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
                            title="Spielregeln anzeigen"
                          >
                            <HelpCircle size={14} />
                          </button>
                        </div>
                        <span style={{ 
                          background: streak === 0 
                            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
                            : 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)', 
                          color: streak === 0 ? '#ffffff' : '#ea580c', 
                          fontSize: '0.75rem', 
                          fontWeight: 900, 
                          padding: '3px 10px', 
                          borderRadius: '100px',
                          boxShadow: streak === 0 
                            ? '0 2px 6px rgba(239, 68, 68, 0.15)' 
                            : '0 2px 6px rgba(234, 88, 12, 0.05)'
                        }}>
                          {streak} {streak === 1 ? 'Tag' : 'Tage'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', flex: 1, justifyContent: 'center' }}>
                        {/* Stepper vertical line connector */}
                        <div style={{
                          position: 'absolute',
                          left: '17px',
                          top: '20px',
                          bottom: '20px',
                          width: '2px',
                          background: '#e2e8f0',
                          zIndex: 1
                        }} />
                        
                        {/* Dynamic connector overlay based on streak */}
                        <div style={{
                          position: 'absolute',
                          left: '17px',
                          top: '20px',
                          height: streak >= 9 ? '100%' : streak >= 4 ? '50%' : '0%',
                          width: '2px',
                          background: 'linear-gradient(to bottom, #f97316 0%, #ef4444 100%)',
                          zIndex: 1,
                          transition: 'height 0.5s ease'
                        }} />

                        {/* Tier 1 Item */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '12px', 
                          background: '#f8fafc', 
                          padding: '10px 14px', 
                          borderRadius: '12px', 
                          border: '1px solid rgba(0,0,0,0.03)',
                          zIndex: 2,
                          boxShadow: isTier1Unlocked ? '0 2px 8px rgba(234, 179, 8, 0.05)' : 'none',
                          opacity: isTier1Unlocked ? 1 : 0.6,
                          transition: 'all 0.3s'
                        }}>
                          <div style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            background: isTier1Unlocked ? '#eab308' : '#cbd5e1', 
                            boxShadow: isTier1Unlocked ? '0 0 8px #eab308' : 'none',
                            zIndex: 3
                          }} />
                          <div style={{ color: isTier1Unlocked ? '#eab308' : '#94a3b8', display: 'flex', alignItems: 'center' }}>
                            <Flame size={18} fill={isTier1Unlocked ? 'currentColor' : 'none'} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 900, color: isTier1Unlocked ? '#854d0e' : '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                Kleine Flamme
                              </span>
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: isTier1Unlocked ? '#854d0e' : '#94a3b8', flexShrink: 0 }}>
                                1-3 Tage • {level === 3 ? 10 : level === 2 ? 5 : 3}m
                              </span>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {streak > 0 ? '🎉 Aktiv!' : 'Bereit zum Start! Fange heute an!'}
                            </div>
                          </div>
                        </div>

                        {/* Tier 2 Item */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '12px', 
                          background: '#f8fafc', 
                          padding: '10px 14px', 
                          borderRadius: '12px', 
                          border: '1px solid rgba(0,0,0,0.03)',
                          zIndex: 2,
                          boxShadow: isTier2Unlocked ? '0 2px 8px rgba(249, 115, 22, 0.05)' : 'none',
                          opacity: isTier2Unlocked ? 1 : 0.6,
                          transition: 'all 0.3s'
                        }}>
                          <div style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            background: isTier2Unlocked ? '#f97316' : '#cbd5e1', 
                            boxShadow: isTier2Unlocked ? '0 0 8px #f97316' : 'none',
                            zIndex: 3
                          }} />
                          <div style={{ color: isTier2Unlocked ? '#f97316' : '#94a3b8', display: 'flex', alignItems: 'center' }}>
                            <Flame size={18} fill={isTier2Unlocked ? 'currentColor' : 'none'} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 900, color: isTier2Unlocked ? '#9a3412' : '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                Mittlere Flamme
                              </span>
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: isTier2Unlocked ? '#9a3412' : '#94a3b8', flexShrink: 0 }}>
                                4-8 Tage • {level === 3 ? 15 : level === 2 ? 10 : 5}m
                              </span>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {isTier2Unlocked ? '🎉 Aktiv!' : `Noch ${Math.max(1, 4 - streak)} ${Math.max(1, 4 - streak) === 1 ? 'Tag' : 'Tage'}`}
                            </div>
                          </div>
                        </div>

                        {/* Tier 3 Item */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '12px', 
                          background: '#f8fafc', 
                          padding: '10px 14px', 
                          borderRadius: '12px', 
                          border: '1px solid rgba(0,0,0,0.03)',
                          zIndex: 2,
                          boxShadow: isTier3Unlocked ? '0 2px 8px rgba(239, 68, 68, 0.05)' : 'none',
                          opacity: isTier3Unlocked ? 1 : 0.6,
                          transition: 'all 0.3s'
                        }}>
                          <div style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            background: isTier3Unlocked ? '#ef4444' : '#cbd5e1', 
                            boxShadow: isTier3Unlocked ? '0 0 8px #ef4444' : 'none',
                            zIndex: 3
                          }} />
                          <div style={{ color: isTier3Unlocked ? '#ef4444' : '#94a3b8', display: 'flex', alignItems: 'center' }}>
                            <Flame size={18} fill={isTier3Unlocked ? 'currentColor' : 'none'} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 900, color: isTier3Unlocked ? '#991b1b' : '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                Helden-Feuer
                              </span>
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: isTier3Unlocked ? '#991b1b' : '#94a3b8', flexShrink: 0 }}>
                                9+ Tage • {level === 3 ? 20 : level === 2 ? 15 : 10}m
                              </span>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {isTier3Unlocked ? '🔥 Helden-Feuer aktiv!' : `Noch ${Math.max(1, 9 - streak)} ${Math.max(1, 9 - streak) === 1 ? 'Tag' : 'Tage'}`}
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })()}

              </div>

            </div>


            {/* RIGHT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Nächste Termine */}
              <div style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={18} color="#34a853" />
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Nächste Termine</h3>
                  </div>
                  <button onClick={() => handleTabChangeLocal('events')} style={{ background: 'transparent', border: 'none', color: '#34a853', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>Alle anzeigen</button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {(() => {
                    const todayStr = new Date().toLocaleDateString('sv-SE');
                    const upcomingConfirmed = (scheduleOccurrences || []).filter(occ => 
                      (occ.status === 'scheduled' || occ.status === 'rescheduled_confirmed' || occ.status === 'cancelled') && occ.date > todayStr
                    );
                    if (upcomingConfirmed.length > 0) {
                      return upcomingConfirmed.slice(0, 2).map(occ => {
                        const d = new Date(occ.date);
                        const isCancelled = occ.status === 'cancelled';
                        
                        if (isCancelled) {
                          return (
                            <div key={occ.id} style={{ display: 'flex', gap: '16px', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                              <div style={{ width: '48px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', textAlign: 'center', flexShrink: 0 }}>
                                 <div style={{ background: '#ef4444', color: 'white', fontSize: '0.6rem', fontWeight: 800, padding: '4px 0', textTransform: 'uppercase' }}>{d.toLocaleDateString('de-DE', {month: 'short'})}</div>
                                 <div style={{ background: 'white', color: '#1e293b', fontSize: '1.2rem', fontWeight: 900, padding: '6px 0' }}>{d.toLocaleDateString('de-DE', {day: '2-digit'})}</div>
                              </div>
                              
                              <div style={{ 
                                flex: 1, 
                                background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
                                boxShadow: '0 4px 10px rgba(239, 68, 68, 0.1)',
                                borderRadius: '14px',
                                padding: '10px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                              }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>{d.toLocaleDateString('de-DE', {weekday: 'long'})}</span>
                                    <span style={{ fontSize: '0.58rem', fontWeight: 900, background: '#000000', color: '#ffffff', padding: '2px 7px', borderRadius: '6px', textTransform: 'uppercase' }}>Ausfall</span>
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600, marginTop: '2px' }}>
                                    {occ.start_time?.substring(0,5)} Uhr <span style={{ color: '#fee2e2' }}>{occ.schedule?.rooms?.name || 'Groovelab'}</span>
                                  </div>
                                </div>

                                <button
                                  onClick={() => {
                                    const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                                    const dayLabel = DAYS_DE[new Date(occ.date).getDay()];
                                    const formattedDate = new Date(occ.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                                    const label = `${dayLabel} (${formattedDate}), ${occ.start_time?.substring(0, 5)} Uhr (Ausfall)`;
                                    setAppointmentChatData({
                                      teacherId: occ.teacher_id,
                                      date: occ.date,
                                      start_time: occ.start_time?.substring(0, 5),
                                      label,
                                      occurrenceId: occ.id
                                    });
                                    setShowAppointmentChat(true);
                                  }}
                                  title="Shoutbox öffnen"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: occ.id && occurrencesWithMessages.includes(occ.id) ? '#fef3c7' : 'rgba(255, 255, 255, 0.2)',
                                    color: occ.id && occurrencesWithMessages.includes(occ.id) ? '#d97706' : '#ffffff',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    flexShrink: 0
                                  }}
                                  onMouseOver={e => { e.currentTarget.style.background = occ.id && occurrencesWithMessages.includes(occ.id) ? '#fde68a' : 'rgba(255, 255, 255, 0.3)'; }}
                                  onMouseOut={e => { e.currentTarget.style.background = occ.id && occurrencesWithMessages.includes(occ.id) ? '#fef3c7' : 'rgba(255, 255, 255, 0.2)'; }}
                                >
                                  <MessageSquare size={14} fill={occ.id && occurrencesWithMessages.includes(occ.id) ? 'currentColor' : 'none'} />
                                </button>
                              </div>
                            </div>
                          );
                        }

                        const isRescheduled = occ.status === 'rescheduled_confirmed';
                        if (isRescheduled) {
                          return (
                            <div key={occ.id} style={{ display: 'flex', gap: '16px', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                              <div style={{ width: '48px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', textAlign: 'center', flexShrink: 0 }}>
                                 <div style={{ background: '#eab308', color: 'white', fontSize: '0.6rem', fontWeight: 800, padding: '4px 0', textTransform: 'uppercase' }}>{d.toLocaleDateString('de-DE', {month: 'short'})}</div>
                                 <div style={{ background: 'white', color: '#1e293b', fontSize: '1.2rem', fontWeight: 900, padding: '6px 0' }}>{d.toLocaleDateString('de-DE', {day: '2-digit'})}</div>
                              </div>
                              
                              <div style={{ 
                                flex: 1, 
                                background: 'linear-gradient(135deg, #fef08a 0%, #eab308 100%)',
                                boxShadow: '0 4px 10px rgba(234, 179, 8, 0.1)',
                                borderRadius: '14px',
                                padding: '10px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                              }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#78350f', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>{d.toLocaleDateString('de-DE', {weekday: 'long'})}</span>
                                    <span style={{ fontSize: '0.58rem', fontWeight: 900, background: '#000000', color: '#ffffff', padding: '2px 7px', borderRadius: '6px', textTransform: 'uppercase' }}>Verschoben</span>
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: 'rgba(120, 53, 15, 0.95)', fontWeight: 600, marginTop: '2px' }}>
                                    {occ.start_time?.substring(0,5)} Uhr <span style={{ color: '#b45309' }}>{occ.schedule?.rooms?.name || 'Groovelab'}</span>
                                  </div>
                                </div>

                                <button
                                  onClick={() => {
                                    const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                                    const dayLabel = DAYS_DE[new Date(occ.date).getDay()];
                                    const formattedDate = new Date(occ.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                                    const label = `${dayLabel} (${formattedDate}), ${occ.start_time?.substring(0, 5)} Uhr (Verschoben)`;
                                    setAppointmentChatData({
                                      teacherId: occ.teacher_id,
                                      date: occ.date,
                                      start_time: occ.start_time?.substring(0, 5),
                                      label,
                                      occurrenceId: occ.id
                                    });
                                    setShowAppointmentChat(true);
                                  }}
                                  title="Shoutbox öffnen"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: occ.id && occurrencesWithMessages.includes(occ.id) ? '#f59e0b' : 'rgba(120, 53, 15, 0.12)',
                                    color: occ.id && occurrencesWithMessages.includes(occ.id) ? '#ffffff' : '#78350f',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    flexShrink: 0
                                  }}
                                  onMouseOver={e => { e.currentTarget.style.background = occ.id && occurrencesWithMessages.includes(occ.id) ? '#d97706' : 'rgba(120, 53, 15, 0.22)'; }}
                                  onMouseOut={e => { e.currentTarget.style.background = occ.id && occurrencesWithMessages.includes(occ.id) ? '#f59e0b' : 'rgba(120, 53, 15, 0.12)'; }}
                                >
                                  <MessageSquare size={14} fill={occ.id && occurrencesWithMessages.includes(occ.id) ? 'currentColor' : 'none'} />
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={occ.id} style={{ display: 'flex', gap: '16px', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                            <div style={{ width: '48px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', textAlign: 'center' }}>
                              <div style={{ background: '#34a853', color: 'white', fontSize: '0.6rem', fontWeight: 800, padding: '4px 0', textTransform: 'uppercase' }}>{d.toLocaleDateString('de-DE', {month: 'short'})}</div>
                              <div style={{ background: 'white', color: '#1e293b', fontSize: '1.2rem', fontWeight: 900, padding: '6px 0' }}>{d.toLocaleDateString('de-DE', {day: '2-digit'})}</div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>{d.toLocaleDateString('de-DE', {weekday: 'long'})}</span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{occ.start_time?.substring(0,5)} <span style={{ color: '#34a853' }}>{occ.schedule?.rooms?.name || 'Groovelab'}</span></div>
                            </div>
                            <button
                              onClick={() => {
                                const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                                const dayLabel = DAYS_DE[new Date(occ.date).getDay()];
                                const formattedDate = new Date(occ.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                                const label = `${dayLabel} (${formattedDate}), ${occ.start_time?.substring(0, 5)} Uhr`;
                                setAppointmentChatData({
                                  teacherId: occ.teacher_id,
                                  date: occ.date,
                                  start_time: occ.start_time?.substring(0, 5),
                                  label,
                                  occurrenceId: occ.id
                                });
                                setShowAppointmentChat(true);
                              }}
                              title="Shoutbox öffnen"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: occ.id && occurrencesWithMessages.includes(occ.id) ? '#fef3c7' : '#f1f5f9',
                                color: occ.id && occurrencesWithMessages.includes(occ.id) ? '#d97706' : '#475569',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                marginLeft: 'auto',
                                flexShrink: 0
                              }}
                              onMouseOver={e => {
                                e.currentTarget.style.background = occ.id && occurrencesWithMessages.includes(occ.id) ? '#fde68a' : '#e2e8f0';
                                e.currentTarget.style.color = occ.id && occurrencesWithMessages.includes(occ.id) ? '#d97706' : '#0b57d0';
                              }}
                              onMouseOut={e => {
                                e.currentTarget.style.background = occ.id && occurrencesWithMessages.includes(occ.id) ? '#fef3c7' : '#f1f5f9';
                                e.currentTarget.style.color = occ.id && occurrencesWithMessages.includes(occ.id) ? '#d97706' : '#475569';
                              }}
                            >
                              <MessageSquare size={14} fill={occ.id && occurrencesWithMessages.includes(occ.id) ? 'currentColor' : 'none'} />
                            </button>
                          </div>
                        );
                      });
                    } else {
                      return <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '20px 0' }}>Keine Termine verfügbar.</div>;
                    }
                  })()}
                </div>
              </div>

              {/* Terminänderungen */}
              {(() => {
                const appointmentChanges = (scheduleOccurrences || []).filter(occ => 
                  !occ.student_acknowledged && (
                    occ.status === 'pending_reschedule' || 
                    occ.status === 'cancelled' || 
                    (occ.status === 'scheduled' && occ.original_date && occ.date === occ.original_date)
                  )
                );
                if (appointmentChanges.length === 0) return null;
                
                return (
                  <div style={{ background: '#ffffff', borderRadius: '24px', padding: '16px 18px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1.5px dashed #f59e0b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                      <Calendar size={16} color="#f59e0b" />
                      <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Terminänderungen</h3>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {appointmentChanges.map(occ => {
                        const d = new Date(occ.date);
                        const isReschedule = occ.status === 'pending_reschedule';
                        const isCancelled = occ.status === 'cancelled';
                        const isRegularReset = occ.status === 'scheduled' && occ.original_date && occ.date === occ.original_date;
                        
                        let cardBg = '#fef2f2';
                        let cardBorder = '#fecaca';
                        let badgeText = '❌ Termin abgesagt';
                        let badgeColor = '#991b1b';
                        
                        if (isReschedule) {
                          cardBg = '#fffbeb';
                          cardBorder = '#fef08a';
                          badgeText = '🔄 Verschiebung vorgeschlagen';
                          badgeColor = '#854d0e';
                        } else if (isRegularReset) {
                          cardBg = '#e6f4ea';
                          cardBorder = '#e6f4ea';
                          badgeText = '❇️ Wieder regulär';
                          badgeColor = '#34a853';
                        }
                        
                        return (
                          <div key={occ.id} style={{ 
                            padding: '12px', 
                            borderRadius: '12px', 
                            background: cardBg, 
                            border: `1px solid ${cardBorder}`, 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '8px',
                            position: 'relative',
                            zIndex: 5
                          }}>
                            <div>
                              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: badgeColor, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '2px' }}>
                                {badgeText}
                              </div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b' }}>
                                {d.toLocaleDateString('de-DE', {weekday: 'long', day: '2-digit', month: '2-digit'})}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', gap: '8px' }}>
                                <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                                  {occ.start_time?.substring(0,5)} Uhr
                                </div>
                                {!isReschedule && (
                                  <button 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleAcknowledgeCancellation(occ.id);
                                    }}
                                    style={{ 
                                      background: (occ.status === 'scheduled' && occ.original_date && occ.date === occ.original_date) ? '#34a853' : '#ef4444', 
                                      color: 'white', 
                                      border: 'none', 
                                      padding: '4px 10px', 
                                      borderRadius: '6px', 
                                      fontSize: '0.7rem', 
                                      fontWeight: 700, 
                                      cursor: 'pointer',
                                      boxShadow: `0 2px 4px ${(occ.status === 'scheduled' && occ.original_date && occ.date === occ.original_date) ? 'rgba(52, 168, 83, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
                                      transition: 'all 0.2s',
                                      flexShrink: 0,
                                      position: 'relative',
                                      zIndex: 10
                                    }}
                                  >
                                    Gelesen abhaken
                                  </button>
                                )}
                              </div>
                              {(occ.status === 'scheduled' && occ.original_date && occ.date === occ.original_date) && (
                                <div style={{ fontSize: '0.7rem', color: '#34a853', fontWeight: 500, marginTop: '4px', lineHeight: '1.2' }}>
                                  Findet wieder regulär statt.
                                </div>
                              )}
                            </div>
                            
                            {isReschedule && (
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '2px' }}>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleRejectReschedule(occ);
                                    }}
                                    style={{ 
                                      background: '#ef4444', 
                                      color: 'white', 
                                      border: 'none', 
                                      padding: '4px 10px', 
                                      borderRadius: '6px', 
                                      fontSize: '0.7rem', 
                                      fontWeight: 700, 
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 4px rgba(239, 68, 68, 0.15)',
                                      transition: 'all 0.2s',
                                      position: 'relative',
                                      zIndex: 10
                                    }}
                                  >
                                    Ablehnen
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleConfirmReschedule(occ.id);
                                    }}
                                    style={{ 
                                      background: '#eab308', 
                                      color: 'white', 
                                      border: 'none', 
                                      padding: '4px 10px', 
                                      borderRadius: '6px', 
                                      fontSize: '0.7rem', 
                                      fontWeight: 700, 
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 4px rgba(234, 179, 8, 0.15)',
                                      transition: 'all 0.2s',
                                      position: 'relative',
                                      zIndex: 10
                                    }}
                                  >
                                    Bestätigen
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* ÜBE-ZIEL WIDGET (Crowdfunding-Stil) */}
              {classGoals.length > 0 && (
                <div style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '18px 20px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, sans-serif"
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '10px',
                      background: '#e6f4ea',
                      border: '1px solid #e6f4ea',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Target size={18} color="#34a853" />
                    </div>
                    <h3 style={{
                      fontSize: '0.92rem',
                      fontWeight: 750,
                      color: '#1c1c1e',
                      margin: 0,
                      letterSpacing: '-0.02em',
                      lineHeight: '1.2'
                    }}>
                      Klassen-Übe-Ziel
                    </h3>
                  </div>

                  {/* Goals */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {classGoals.map((goal: any) => {
                      const pct = goal.minutes > 0 ? Math.round((classWeeklyMins / goal.minutes) * 100) : 0;
                      const isDeadlinePassed = goal.deadline ? new Date(goal.deadline) < new Date() : false;
                      const maxPercentOnBar = 133;
                      const visualWidth = Math.min(100, (pct / maxPercentOnBar) * 100);
                      const isAchieved = pct >= 100;

                      return (
                        <div 
                          key={goal.id} 
                          onClick={() => handleOpenContributions(goal.title || 'Klassen-Übe-Ziel', goal.minutes)}
                          onMouseOver={e => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 10px 25px rgba(52, 168, 83, 0.22)';
                          }}
                          onMouseOut={e => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(52, 168, 83, 0.12)';
                          }}
                          style={{
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            background: '#34a853',
                            boxShadow: '0 6px 20px rgba(52, 168, 83, 0.12)',
                            borderRadius: '16px',
                            padding: '12px 14px',
                            gap: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                        >
                          {/* Row 1: Title, Deadline on left & Percentage on right */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                              <span style={{
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                color: '#ffffff',
                                letterSpacing: '-0.01em',
                                lineHeight: '1.25',
                                whiteSpace: 'normal',
                                wordBreak: 'break-word'
                              }}>
                                {goal.title || 'Challenge'}
                              </span>
                              {goal.deadline && (
                                <span style={{
                                  fontSize: '0.62rem',
                                  fontWeight: 500,
                                  color: isDeadlinePassed ? '#ff8780' : 'rgba(255, 255, 255, 0.75)',
                                  lineHeight: '1.2',
                                  whiteSpace: 'normal'
                                }}>
                                  bis {new Date(goal.deadline).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                                  {isDeadlinePassed && ' (abgelaufen)'}
                                </span>
                              )}
                            </div>
                            <span style={{
                              fontSize: '1.1rem',
                              fontWeight: 800,
                              color: '#ffffff',
                              letterSpacing: '-0.02em',
                              fontFeatureSettings: '"tnum"',
                              flexShrink: 0,
                              alignSelf: 'flex-start'
                            }}>
                              {pct}%
                            </span>
                          </div>

                          {/* Progress bar container */}
                          <div style={{ position: 'relative', height: '6px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '99px' }}>
                            {/* Target marker (100% line) at 75% width */}
                            <div style={{
                              position: 'absolute',
                              left: '75%',
                              top: '-2px',
                              height: '10px',
                              width: '2px',
                              background: '#ffffff',
                              zIndex: 3,
                              borderRadius: '99px'
                            }} />

                            {/* Bar fill */}
                            <div style={{
                              width: `${visualWidth}%`,
                              height: '100%',
                              background: '#ffffff',
                              borderRadius: '99px',
                              transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                              boxShadow: '0 0 6px rgba(255, 255, 255, 0.25)'
                            }} />
                          </div>

                          {/* Row 3: Current / Target & Status label */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', gap: '10px' }}>
                            <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontFeatureSettings: '"tnum"', fontWeight: 500, whiteSpace: 'normal' }}>
                              <span style={{ fontWeight: 700, color: '#ffffff' }}>{classWeeklyMins}</span> / {goal.minutes} Min.
                            </span>
                            <span style={{
                              fontWeight: 700,
                              color: isAchieved ? '#e6f4ea' : 'rgba(255, 255, 255, 0.8)',
                              whiteSpace: 'normal',
                              textAlign: 'right'
                            }}>
                              {isAchieved ? 'Erreicht 🎉' : `Noch ${Math.max(0, goal.minutes - classWeeklyMins)} Min.`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* LIVE CAMPUS FEED (DESKTOP) */}
              <div style={{ 
                background: '#ffffff', 
                borderRadius: '24px', 
                padding: '24px', 
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Sparkles size={18} color="#34a853" />
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mitteilungen</h3>
                </div>

                {/* Tab switcher */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
                  <button
                    onClick={() => setStudentFeedTab('campus')}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: studentFeedTab === 'campus' ? '#ffffff' : 'transparent',
                      color: studentFeedTab === 'campus' ? '#34a853' : '#64748b',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: studentFeedTab === 'campus' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <School size={16} />
                      <span>Campus</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setStudentFeedTab('class')}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: studentFeedTab === 'class' ? '#ffffff' : 'transparent',
                      color: studentFeedTab === 'class' ? '#34a853' : '#64748b',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: studentFeedTab === 'class' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <Users size={16} />
                      <span>Klassen-Feed</span>
                    </div>
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {studentFeedTab === 'class' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {classFeedPosts.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px 0', textAlign: 'center', opacity: 0.6 }}>
                          <Sparkles size={24} color="#94a3b8" style={{ strokeWidth: 1.5 }} />
                          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                            Keine Beiträge in deinem Klassen-Feed.
                          </span>
                        </div>
                      ) : (
                        classFeedPosts.map((post) => {
                          const myInteraction = classFeedInteractions.find(i => i.post_id === post.id && i.user_id === studentId);
                          const isAnswered = !!myInteraction;

                          let typeLabel = 'Mitteilung';
                          let typeBg = '#e6f4ea';
                          let typeColor = '#34a853';
                          if (post.post_type === 'homework') {
                            typeLabel = 'Hausaufgabe';
                            typeBg = '#fef3c7';
                            typeColor = '#b45309';
                          } else if (post.post_type === 'poll') {
                            typeLabel = 'Umfrage';
                            typeBg = '#e0f2fe';
                            typeColor = '#0369a1';
                          } else if (post.post_type === 'quiz') {
                            typeLabel = 'Quiz';
                            typeBg = '#f3e8ff';
                            typeColor = '#6b21a8';
                          }

                          return (
                            <div key={post.id} style={{
                              paddingBottom: '16px',
                              borderBottom: '1px solid #f1f5f9',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '9px', fontWeight: 800, color: typeColor, background: typeBg, padding: '2px 8px', borderRadius: '100px', textTransform: 'uppercase' }}>
                                  {typeLabel}
                                </span>
                                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 650 }}>
                                  {new Date(post.created_at).toLocaleDateString('de-DE')}
                                </span>
                              </div>

                              <h5 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                                {post.title}
                              </h5>
                              <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, fontWeight: 500, lineHeight: 1.4 }}>
                                {post.content}
                              </p>

                              {post.attachment_url && (
                                <div style={{ marginTop: '4px' }}>
                                  {post.attachment_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                                    <a href={post.attachment_url} target="_blank" rel="noreferrer">
                                      <img src={post.attachment_url} alt="Anhang" style={{ maxWidth: '100%', maxHeight: '100px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                    </a>
                                  ) : (
                                    <a href={post.attachment_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#34a853', textDecoration: 'none', fontWeight: 650 }}>
                                      📄 Dokument öffnen
                                    </a>
                                  )}
                                </div>
                              )}

                              {/* Interactive Poll / Quiz options */}
                              {(post.post_type === 'quiz' || post.post_type === 'poll') && post.quiz_data && (
                                <div style={{ marginTop: '8px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                                    {post.quiz_data.question}
                                  </span>

                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {Array.isArray(post.quiz_data.options) && post.quiz_data.options.map((opt: string, oIdx: number) => {
                                      const isSelectedByMe = myInteraction?.selected_option === oIdx;
                                      const isCorrectOption = post.post_type === 'quiz' && post.quiz_data.correctAnswer === oIdx;

                                      let btnBg = 'white';
                                      let btnBorder = '#cbd5e1';
                                      let btnColor = '#1e293b';

                                      if (isAnswered) {
                                        if (post.post_type === 'quiz') {
                                          if (isCorrectOption) {
                                            btnBg = '#e6f4ea';
                                            btnBorder = '#34a853';
                                            btnColor = '#34a853';
                                          } else if (isSelectedByMe) {
                                            btnBg = '#fce8e6';
                                            btnBorder = '#ea4335';
                                            btnColor = '#ea4335';
                                          }
                                        } else {
                                          if (isSelectedByMe) {
                                            btnBg = '#e0f2fe';
                                            btnBorder = '#0369a1';
                                            btnColor = '#0369a1';
                                          }
                                        }
                                      }

                                      return (
                                        <button
                                          key={oIdx}
                                          disabled={isAnswered}
                                          onClick={() => {
                                            if (post.post_type === 'quiz') {
                                              handleSubmitClassFeedInteraction(post.id, 'quiz_answer', oIdx, oIdx === post.quiz_data.correctAnswer);
                                            } else {
                                              handleSubmitClassFeedInteraction(post.id, 'poll_vote', oIdx);
                                            }
                                          }}
                                          style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            background: btnBg,
                                            border: `1.5px solid ${btnBorder}`,
                                            color: btnColor,
                                            fontSize: '0.78rem',
                                            fontWeight: isSelectedByMe || isCorrectOption ? 700 : 500,
                                            textAlign: 'left',
                                            cursor: isAnswered ? 'default' : 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                          }}
                                        >
                                          <span>{opt}</span>
                                          {isAnswered && (
                                            <span>
                                              {post.post_type === 'quiz' ? (
                                                isCorrectOption ? '✓ Richtig' : (isSelectedByMe ? '✗ Falsch' : '')
                                              ) : (
                                                isSelectedByMe ? '✓ Gewählt' : ''
                                              )}
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    campusFeedAnnouncements.length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px 0', textAlign: 'center', opacity: 0.6 }}>
                        <Sparkles size={24} color="#94a3b8" style={{ strokeWidth: 1.5 }} />
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                          Keine aktuellen Campus-Mitteilungen vorhanden.
                        </span>
                      </div>
                    ) : (
                      campusFeedAnnouncements.slice(0, 5).map((item, idx, arr) => {
                        const postReactions = feedInteractions.filter(i => i.post_id === item.id);
                        const thumbsUpCount = postReactions.filter(i => i.emoji_unicode === '👍').length;
                        const heartCount = postReactions.filter(i => i.emoji_unicode === '❤️').length;
                        const userHasThumbsUp = postReactions.some(i => i.emoji_unicode === '👍' && i.user_id === studentId);
                        const userHasHeart = postReactions.some(i => i.emoji_unicode === '❤️' && i.user_id === studentId);

                        let categoryLabel = 'Info';
                        let categoryBg = '#f1f5f9';
                        let categoryColor = '#475569';
                        if (item.category === 'announcement') {
                          categoryLabel = 'Ankündigung';
                        } else if (item.category === 'event') {
                          categoryLabel = 'Event';
                        } else if (item.category === 'holidays') {
                          categoryLabel = 'Ferien';
                        }

                        if (item.is_emergency) {
                          categoryColor = '#b91c1c';
                          categoryBg = '#fce8e6';
                        }

                        return (
                          <div key={item.id} style={{
                            paddingBottom: idx === arr.length - 1 ? '0' : '16px',
                            borderBottom: idx === arr.length - 1 ? 'none' : '1px solid #f1f5f9',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{
                                  fontSize: '9px',
                                  fontWeight: 800,
                                  color: '#475569',
                                  background: '#f1f5f9',
                                  padding: '2px 8px',
                                  borderRadius: '100px',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em'
                                }}>
                                  {item.target_type === 'all' ? 'Alle' : item.target_type === 'teachers' ? 'Lehrer' : item.target_type === 'students' ? 'Schüler' : 'Mitteilung'}
                                </span>
                                <span style={{
                                  fontSize: '9px',
                                  fontWeight: 800,
                                  color: categoryColor,
                                  background: categoryBg,
                                  padding: '2px 8px',
                                  borderRadius: '100px',
                                  textTransform: 'uppercase',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}>
                                  {item.is_emergency && <AlertTriangle size={9} color="#b91c1c" />}
                                  {categoryLabel}
                                </span>
                              </div>
                              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 650 }}>
                                {new Date(item.created_at).toLocaleDateString('de-DE')}
                              </span>
                            </div>
                            
                            <h5 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                              {item.title}
                            </h5>
                            
                            <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, fontWeight: 500, lineHeight: 1.4 }}>
                              {item.content}
                            </p>

                            {item.attachment_url && (
                              <div style={{ marginTop: '4px' }}>
                                {item.attachment_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                                  <a href={item.attachment_url} target="_blank" rel="noreferrer">
                                    <img 
                                      src={item.attachment_url} 
                                      alt="Anhang" 
                                      style={{ maxWidth: '100%', maxHeight: '100px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                    />
                                  </a>
                                ) : (
                                  <a 
                                    href={item.attachment_url} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#34a853', textDecoration: 'none', fontWeight: 650 }}
                                  >
                                    📄 Dokument öffnen
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Monochrome Emoji Reactions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                              <button 
                                onClick={() => handleReactToPost(item.id, '👍')}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: userHasThumbsUp ? '#e6f4ea' : 'transparent',
                                  border: '1px solid',
                                  borderColor: userHasThumbsUp ? '#34a853' : '#e2e8f0',
                                  color: userHasThumbsUp ? '#34a853' : '#64748b',
                                  padding: '3px 8px',
                                  borderRadius: '9999px',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <ThumbsUp size={11} color={userHasThumbsUp ? '#34a853' : '#64748b'} />
                                <span>{thumbsUpCount}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
        )
      )}
      </div>
      
      <div style={{ display: activeTab === 'hero' ? 'block' : 'none' }}>
        {activeTab === 'hero' && (
          <div id="tour-student-hero" style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          {/* Evolution Badge Top Right */}
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#e0f2fe',
            border: '1px solid #bae6fd',
            color: '#0369a1',
            fontWeight: 800,
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            padding: '4px 12px',
            borderRadius: '100px'
          }}>
            <Trophy size={11} /> {avatar.instrument_type}
          </div>
          
          <div style={{ position: 'absolute', top: '20px', left: '20px' }}>
            <TourStartButton onClick={startTour} platformTheme="campus" />
          </div>

          {/* Avatar Showcase */}
          <div style={{ textAlign: 'center', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ position: 'relative', display: 'inline-block', margin: '0 auto' }}>
              {/* Avatar frame */}
              <div style={{
                width: '160px',
                height: '160px',
                borderRadius: '50%',
                background: '#f8fafc',
                border: '3px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.02)',
                transition: 'all 0.3s'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '5rem' }}>
                    {avatar.instrument_type === 'guitarist' ? '🎸' : avatar.instrument_type === 'drummer' ? '🥁' : avatar.instrument_type === 'keyboardist' ? '🎹' : '🎤'}
                  </span>
                </div>
              </div>
              
              {xpActive && (
                <div style={{
                  position: 'absolute',
                  bottom: '-8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#0b57d0',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.68rem',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  padding: '4px 14px',
                  borderRadius: '100px',
                  boxShadow: '0 4px 12px rgba(11, 87, 208, 0.25)',
                  border: '2px solid #ffffff',
                  whiteSpace: 'nowrap'
                }}>
                  Evolution {currentLevel}
                </div>
              )}
            </div>

            {/* Info Block */}
            <div style={{ marginTop: '8px' }}>
              <h3 style={{ fontSize: '28px', fontWeight: 900, color: '#1e293b', margin: 0 }}>
                Mein Held
              </h3>
              {xpActive && (
                <span style={{ color: '#0b57d0', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                  <Award size={13} /> {levelTitle}
                </span>
              )}
            </div>

            {/* XP Progress Bar */}
            {xpActive && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  <span>Erfahrungspunkte (XP)</span>
                  <span style={{ color: '#0b57d0', fontFamily: 'monospace', fontWeight: 900 }}>
                    {currentLevel === 3 ? `${currentXp} XP (MAX)` : `${currentXp} / ${nextThreshold} XP`}
                  </span>
                </div>

                <div style={{ width: '100%', background: '#e2e8f0', borderRadius: '100px', height: '10px', overflow: 'hidden' }}>
                  <div
                    style={{ width: `${xpPercentage}%`, height: '100%', borderRadius: '100px', background: '#0b57d0', transition: 'all 1s' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                  {currentLevel === 3 ? (
                    <span>Glückwunsch! Höchste Stufe erreicht!</span>
                  ) : (
                    <>
                      <span>Noch {nextThreshold - currentXp} XP bis Evolution {currentLevel + 1}</span>
                      <span>{Math.round(xpPercentage)}%</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Missions Board / Adventure Map */}
          {showMissionsFeature && (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              marginTop: '20px'
            }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.25rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🗺️ Mein Abenteuer-Pfad (Schuljahr)
              </h3>
              
              {/* Visual curved/horizontal node path */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', padding: '24px 10px', overflowX: 'auto', gap: '24px' }}>
                <div style={{ position: 'absolute', left: '40px', right: '40px', top: '50%', height: '4px', background: '#cbd5e1', zIndex: 1, transform: 'translateY(-50%)' }} />
                <div style={{
                  position: 'absolute',
                  left: '40px',
                  width: `${Math.min(100, Math.max(0, (( (studentMissionProgress?.current_level || 1) - 1) / 5) * 100))}%`,
                  top: '50%',
                  height: '4px',
                  background: '#34a853',
                  zIndex: 2,
                  transform: 'translateY(-50%)',
                  transition: 'width 0.5s ease'
                }} />
                
                {[1, 2, 3, 4, 5, 6].map(lvl => {
                  const sLvl = studentMissionProgress?.current_level || 1;
                  const isCompleted = sLvl > lvl;
                  const isCurrent = sLvl === lvl;
                  const isLocked = sLvl < lvl;
                  
                  return (
                    <div key={lvl} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 3, position: 'relative', minWidth: '70px' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: isCompleted ? '#34a853' : isCurrent ? '#ffffff' : '#cbd5e1',
                        border: isCurrent ? '4px solid #34a853' : '4px solid transparent',
                        color: isCompleted ? '#ffffff' : isCurrent ? '#34a853' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '1rem',
                        boxShadow: isCurrent ? '0 0 15px rgba(52, 168, 83, 0.3)' : 'none',
                        transition: 'all 0.3s'
                      }}>
                        {lvl}
                      </div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: isCurrent ? '#34a853' : '#64748b', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {lvl === 1 ? 'Start 1 Song' : lvl === 2 ? 'Upload PIN' : lvl === 3 ? '3 Songs' : `Level ${lvl}`}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Current Level Requirement details */}
              <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>
                  Aktuelles Ziel: Stufe {studentMissionProgress?.current_level || 1}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                  {(studentMissionProgress?.current_level || 1) === 1 && (
                    <div>
                      🎯 <strong>Ziel:</strong> Schließe deinen ersten Song erfolgreich ab (1 Song).<br />
                      Erledigt: {progressItems.filter((i: any) => i.is_stage_ready).length >= 1 ? '✅ Ja' : '❌ Noch kein Song abgeschlossen.'}
                    </div>
                  )}
                  {(studentMissionProgress?.current_level || 1) === 2 && (
                    <div>
                      🎯 <strong>Ziel:</strong> Erreiche eine 7-Tage-Übestreak (große Flamme) + 15 Minuten Fokus-Üben am Stück.<br />
                      Dein aktueller Streak: {avatar?.streak_flame || 0} von 7 Tagen.
                    </div>
                  )}
                  {(studentMissionProgress?.current_level || 1) === 3 && (
                    <div>
                      🎯 <strong>Ziel:</strong> Schließe mindestens 3 Songs erfolgreich ab.<br />
                      Erledigt: {progressItems.filter((i: any) => i.is_stage_ready).length} von 3 Songs.
                    </div>
                  )}
                  {(studentMissionProgress?.current_level || 1) > 3 && (
                    <div>
                      🎯 <strong>Ziel:</strong> Folge deinem Lehrplan und schließe fortlaufend neue Songs ab!
                    </div>
                  )}
                </div>
              </div>

              {/* PIN Code Verification Card (Level 2 specific upload unlock) */}
              {(studentMissionProgress?.current_level || 1) >= 2 && (
                <div style={{ border: '2px dashed #e6f4ea', background: '#e6f4ea', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontWeight: 900, color: '#34a853', fontSize: '1rem' }}>
                      🔓 Custom Avatar / Instrument Upload freigeschaltet!
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#34a853', lineHeight: 1.4 }}>
                      Trage deine einmalige PIN ein, die du von deinem Lehrer erhalten hast, um dein eigenes Profilbild/Instrumenten-Foto hochzuladen.
                    </p>
                  </div>

                  {/* AI Prompt Assistant helper */}
                  <div style={{ background: '#ffffff', border: '1px solid #e6f4ea', padding: '12px', borderRadius: '12px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#34a853', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                      💡 Prompt-Assistent für KI-Generatoren (z.B. Midjourney, DALL-E)
                    </span>
                    <div style={{ fontSize: '0.75rem', color: '#1e293b', fontStyle: 'italic', background: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                      <span id="promptText">"Ein cooler Musik-Hero im Comic-Stil mit einem {studentUser?.instrument || 'Gitarre'}, leuchtende Farben, Profilbild, quadratisch"</span>
                      <button
                        type="button"
                        onClick={() => {
                          const txt = document.getElementById('promptText')?.innerText || '';
                          navigator.clipboard.writeText(txt);
                          alert('Prompt kopiert!');
                        }}
                        style={{ background: '#e2e8f0', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer' }}
                      >
                        Kopieren
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleUploadAvatarWithPin} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '160px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#34a853' }}>6-stellige Einmal-PIN</label>
                      <input
                        type="text"
                        placeholder="z.B. 123456"
                        value={pinInput}
                        onChange={e => setPinInput(e.target.value)}
                        maxLength={8}
                        style={{ padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #e6f4ea', fontWeight: 700 }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1.5, minWidth: '200px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#34a853' }}>Foto auswählen</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => setCustomAvatarFile(e.target.files?.[0] || null)}
                        style={{ fontSize: '0.75rem', color: '#475569' }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isUploadingCustomAvatar}
                      style={{
                        background: '#34a853',
                        color: 'white',
                        border: 'none',
                        padding: '10px 18px',
                        borderRadius: '12px',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(52, 168, 83, 0.2)'
                      }}
                    >
                      {isUploadingCustomAvatar ? 'Wird hochgeladen...' : 'Bild hochladen'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
        )}
      </div>

      <div style={{ display: (activeTab === 'profile' && studentUser) ? 'flex' : 'none', flexDirection: 'column', gap: '28px', maxWidth: '100%', margin: '0 auto', width: '100%' }} className="animation-slide-up">
        {activeTab === 'profile' && studentUser && (
          <>
            {/* Header Card with Premium Campus Green Gradient */}
          <div style={{
            background: 'linear-gradient(135deg, #34a853 0%, #0d4d22 100%)',
            backdropFilter: 'blur(24px) saturate(1.8)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '32px',
            boxShadow: '0 12px 40px rgba(52, 168, 83, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
            display: 'flex',
            overflow: 'visible',
            position: 'relative',
            minHeight: '240px',
            alignItems: 'center',
            padding: '32px 48px',
            gap: '32px',
            flexWrap: 'wrap'
          }}>
            {/* Floating Shielded Avatar Frame */}
            <div style={{
              width: '128px',
              height: '128px',
              borderRadius: '50%',
              border: '5px solid #ffffff',
              boxShadow: '0 12px 32px rgba(52, 168, 83, 0.2)',
              background: '#ffffff',
              flexShrink: 0,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 2,
              transform: 'translateY(-10px)'
            }}>
              <img 
                src={
                  studentUser?.role === 'admin' || studentUser?.role === 'secretary'
                    ? '/campus_login_hero.png'
                    : studentUser.photo_url && studentUser.photo_url.includes('_avatar')
                    ? studentUser.photo_url
                    : getInstrumentAvatarUrl(studentUser.resolved_instrument || studentUser.instrument)
                } 
                alt="" 
                style={{ width: '95%', height: '95%', objectFit: 'contain' }} 
              />
            </div>

            {/* Profile Identity Details */}
            <div style={{ flex: 1, minWidth: '280px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                <span style={{
                  background: '#ffffff',
                  color: '#34a853', 
                  padding: '4px 14px', 
                  borderRadius: '10px',
                  fontSize: '0.7rem', 
                  fontWeight: 900, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.08em'
                }}>
                  Campus Schüler
                </span>
                <span style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 750 }}>
                  🏢 {studentUser.schools?.name || 'Groovelab Campus'}
                </span>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.85rem', fontWeight: 500 }}>
                  • Mitglied seit {studentUser.created_at && !isNaN(new Date(studentUser.created_at).getTime()) ? new Date(studentUser.created_at).toLocaleDateString('de-DE') : 'unbekannt'}
                </span>
              </div>

              <h1 style={{ fontSize: '28px', fontWeight: 950, color: '#ffffff', margin: '0 0 12px 0', letterSpacing: '-0.03em', fontFamily: "'Urbanist', sans-serif" }}>
                Hausaufgabenheft
              </h1>

              {/* Active Instruments Badge List */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(studentUser.instrument || '').split(',').map((inst: string) => inst.trim()).filter(Boolean).map((inst: string) => (
                  <div key={inst} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    color: '#ffffff',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '0.78rem',
                    fontWeight: 800
                  }}>
                    <span>{inst}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Buttons Area */}
            <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setShowOwnQr(true)}
                style={{ 
                  background: '#ffffff', 
                  border: 'none', 
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                  color: '#34a853', 
                  fontSize: '0.85rem', 
                  fontWeight: 800, 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '12px 20px',
                  borderRadius: '16px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <span>Campus-Ausweis</span>
                <QrCode size={15} />
              </button>

              <button 
                onClick={() => {
                  setEditingProfile({ ...studentUser });
                  setAvatarCategoryFilter('Alle');
                  setShowSecondEmail(!!studentUser?.parent_email);
                  setShowAvatarSelector(false);
                  setShowEditProfile(true);
                }} 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.15)', 
                  border: '1px solid rgba(255, 255, 255, 0.25)', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  color: '#ffffff', 
                  fontSize: '0.85rem', 
                  fontWeight: 800, 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '12px 20px',
                  borderRadius: '16px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'; }}
              >
                <span>Profil bearbeiten</span>
                <Pencil size={15} />
              </button>
            </div>
          </div>

          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            {/* Metric 1: XP */}
            {xpActive && (
              <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '24px', padding: '24px', display: 'flex', gap: '16px', alignItems: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.01)' }}>
                <div style={{ height: '48px', width: '48px', borderRadius: '14px', background: 'rgba(52, 168, 83, 0.08)', color: '#34a853', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Star size={22} fill="#34a853" />
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Erfahrung (XP)</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Urbanist', sans-serif" }}>
                    {avatar?.xp || 0} XP
                  </div>
                </div>
              </div>
            )}

            {/* Metric 2: Übe-Streak */}
            {flamesActive && (
              <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '24px', padding: '24px', display: 'flex', gap: '16px', alignItems: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.01)' }}>
                <div style={{ height: '48px', width: '48px', borderRadius: '14px', background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Flame size={22} fill="#ef4444" color="#ef4444" />
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Übe-Streak</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Urbanist', sans-serif" }}>
                    {avatar?.streak_flame || 0} Tage
                  </div>
                </div>
              </div>
            )}

            {/* Metric 3: Focus Month */}
            <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '24px', padding: '24px', display: 'flex', gap: '16px', alignItems: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.01)' }}>
              <div style={{ height: '48px', width: '48px', borderRadius: '14px', background: 'rgba(234, 179, 8, 0.08)', color: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Fokus Diesen Monat</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Urbanist', sans-serif" }}>
                  {monthlyFocusMinutes} Min.
                </div>
              </div>
            </div>

            {/* Metric 4: Weekly Lessons */}
            <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '24px', padding: '24px', display: 'flex', gap: '16px', alignItems: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.01)' }}>
              <div style={{ height: '48px', width: '48px', borderRadius: '14px', background: 'rgba(59, 130, 246, 0.08)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Calendar size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Wochenstunden</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Urbanist', sans-serif" }}>
                  {studentSchedules.length} {studentSchedules.length === 1 ? 'Fach' : 'Fächer'}
                </div>
              </div>
            </div>
          </div>

          {/* Weekly recurring schedules & Jahres-Statistik side-by-side */}
          <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', width: '100%', alignItems: 'stretch' }}>
            {/* Wöchentlicher Unterrichtsplan */}
            <div style={{ flex: '1 1 350px', background: 'white', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '32px', padding: '32px', boxShadow: '0 8px 30px rgba(0,0,0,0.01)', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 20px 0', fontFamily: "'Urbanist', sans-serif", display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={20} style={{ color: '#34a853' }} />
                Wöchentlicher Unterrichtsplan
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                {studentSchedules.length > 0 ? (
                  studentSchedules.map((sch) => {
                    const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                    return (
                      <div key={sch.id} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '16px 20px', 
                        background: '#f8fafc', 
                        borderRadius: '16px', 
                        border: '1px solid #f1f5f9' 
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ height: '42px', width: '42px', borderRadius: '12px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.04)', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                            {getInstrumentAvatarUrl(sch.instrument).includes('piano') ? '🎹' : getInstrumentAvatarUrl(sch.instrument).includes('drums') ? '🥁' : getInstrumentAvatarUrl(sch.instrument).includes('vocals') ? '🎤' : '🎸'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 850, color: '#0f172a', fontSize: '0.9rem' }}>
                              {DAYS_DE[sch.day_of_week]}s, {sch.time_slot} Uhr
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                              {sch.teacher ? `Coach: ${sch.teacher.first_name} ${sch.teacher.last_name}` : 'Patrick Huber'} • {sch.rooms?.name || 'Raum 1'} ({sch.duration || 45} Min)
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', border: '2px dashed #cbd5e1', borderRadius: '24px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    Keine wöchentlichen Termine hinterlegt.
                  </div>
                )}
              </div>
            </div>

            {/* Jahres-Statistik (Personal) */}
            <div style={{ flex: '1 1 350px', background: 'white', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '32px', padding: '32px', boxShadow: '0 8px 30px rgba(0,0,0,0.01)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <div style={{ background: '#e6f4ea', color: '#34a853', padding: '8px', borderRadius: '12px' }}>
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0, fontFamily: "'Urbanist', sans-serif" }}>
                    Jahres-Statistik
                  </h3>
                  <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '2px 0 0 0', fontWeight: 600 }}>
                    Übeminuten (Sep - Aug)
                  </p>
                </div>
              </div>

              {(() => {
                const now = new Date();
                const currentMonth = now.getMonth();
                const startYear = currentMonth >= 8 ? now.getFullYear() : now.getFullYear() - 1;
                const monthsList = [
                  { month: 8, label: 'Sep', year: startYear },
                  { month: 9, label: 'Okt', year: startYear },
                  { month: 10, label: 'Nov', year: startYear },
                  { month: 11, label: 'Dez', year: startYear },
                  { month: 0, label: 'Jan', year: startYear + 1 },
                  { month: 1, label: 'Feb', year: startYear + 1 },
                  { month: 2, label: 'Mrz', year: startYear + 1 },
                  { month: 3, label: 'Apr', year: startYear + 1 },
                  { month: 4, label: 'Mai', year: startYear + 1 },
                  { month: 5, label: 'Jun', year: startYear + 1 },
                  { month: 6, label: 'Jul', year: startYear + 1 },
                  { month: 7, label: 'Aug', year: startYear + 1 }
                ];

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'center' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      {monthsList.map(item => {
                        const logsForMonth = fokusLogs.filter(log => {
                          if (!log.created_at) return false;
                          const logDate = new Date(log.created_at);
                          return logDate.getMonth() === item.month && logDate.getFullYear() === item.year;
                        });
                        let totalSecs = logsForMonth.reduce((sum, log) => {
                          return sum + (log.duration_seconds || ((log.duration_minutes || 0) * 60));
                        }, 0);
                        
                        if (sessionActive && secondsElapsed > 0 && item.month === now.getMonth() && item.year === now.getFullYear()) {
                          totalSecs += secondsElapsed;
                        }

                        const minutes = Math.round(totalSecs / 60);
                        
                        // Heatmap Style Calculation
                        let bg = '#f8fafc';
                        let border = '1px solid #e2e8f0';
                        let labelColor = '#94a3b8';
                        let textColor = '#64748b';
                        let numColor = '#1e293b';
                        let shadow = 'none';

                        if (minutes > 0) {
                          if (minutes <= 15) {
                            bg = 'linear-gradient(135deg, #e6f4ea 0%, #e6fbf0 100%)';
                            border = '1px solid #e6f4ea';
                            labelColor = '#34a853';
                            textColor = '#34a853';
                            numColor = '#34a853';
                            shadow = '0 2px 6px rgba(52, 168, 83, 0.04)';
                          } else if (minutes <= 60) {
                            bg = 'linear-gradient(135deg, #e6f4ea 0%, #e6f4ea 100%)';
                            border = '1px solid #e6f4ea';
                            labelColor = '#34a853';
                            textColor = '#34a853';
                            numColor = '#34a853';
                            shadow = '0 3px 8px rgba(52, 168, 83, 0.07)';
                          } else if (minutes <= 180) {
                            bg = 'linear-gradient(135deg, #e6f4ea 0%, #e6f4ea 100%)';
                            border = '1px solid #e6f4ea';
                            labelColor = '#34a853';
                            textColor = '#34a853';
                            numColor = '#34a853';
                            shadow = '0 4px 12px rgba(52, 168, 83, 0.12)';
                          } else {
                            bg = 'linear-gradient(135deg, #34a853 0%, #34a853 100%)';
                            border = '1px solid #34a853';
                            labelColor = 'rgba(255, 255, 255, 0.8)';
                            textColor = 'rgba(255, 255, 255, 0.9)';
                            numColor = '#ffffff';
                            shadow = '0 6px 15px rgba(52, 168, 83, 0.25)';
                          }
                        }

                        return (
                          <div 
                            key={`${item.month}-${item.year}`}
                            style={{
                              background: bg,
                              border: border,
                              borderRadius: '16px',
                              padding: '12px 4px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '3px',
                              minHeight: '66px',
                              textAlign: 'center',
                              boxShadow: shadow,
                              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                              cursor: 'default'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              if (minutes > 0) {
                                e.currentTarget.style.boxShadow = shadow.replace(/0\.\d+/, '0.3');
                              } else {
                                e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.04)';
                                e.currentTarget.style.borderColor = '#cbd5e1';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0px)';
                              e.currentTarget.style.boxShadow = shadow;
                              e.currentTarget.style.borderColor = border.split(' ')[2];
                            }}
                          >
                            <span style={{ 
                              fontSize: '0.62rem', 
                              fontWeight: 800, 
                              color: labelColor,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em'
                            }}>
                              {item.label}
                            </span>
                            <span style={{ 
                              fontSize: '0.9rem', 
                              fontWeight: 900, 
                              color: numColor,
                              fontFamily: "'Urbanist', sans-serif"
                            }}>
                              {minutes}
                              <span style={{ fontSize: '0.6rem', fontWeight: 700, marginLeft: '1px', color: textColor }}>m</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Heatmap Legend */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      marginTop: '4px', 
                      padding: '8px 10px',
                      background: '#f8fafc',
                      borderRadius: '12px',
                      border: '1px solid #f1f5f9',
                      fontSize: '0.58rem', 
                      color: '#94a3b8', 
                      fontWeight: 700
                    }}>
                      <span style={{ textTransform: 'uppercase', letterSpacing: '0.02em' }}>Heatmap:</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0' }} /> 0m
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e6fbf0', border: '1px solid #e6f4ea' }} /> &lt;15m
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e6f4ea', border: '1px solid #e6f4ea' }} /> &lt;1h
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e6f4ea', border: '1px solid #e6f4ea' }} /> &lt;3h
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34a853' }} /> 3h+
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {showOwnQr && studentUser?.qr_token && (
            <QRCodeModal user={studentUser} activePlatform="campus" onClose={() => setShowOwnQr(false)} />
          )}

          {/* Profile Edit Overlay Modal */}
          {showEditProfile && editingProfile && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.3)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              zIndex: 11000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}>
              <form onSubmit={handleSaveProfile} style={{
                background: 'white',
                border: '1px solid rgba(255,255,255,0.8)',
                borderRadius: '32px',
                boxShadow: '0 20px 50px rgba(15, 23, 42, 0.15)',
                width: '100%',
                maxWidth: '540px',
                padding: '36px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                position: 'relative'
              }}>
                <button 
                  type="button"
                  onClick={() => setShowEditProfile(false)}
                  style={{ position: 'absolute', top: '24px', right: '24px', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={16} />
                </button>

                <h3 style={{ fontSize: '1.5rem', fontWeight: 950, color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                  Profil bearbeiten
                </h3>

                {/* Big Avatar Preview & Edit Button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', margin: '4px 0' }}>
                  <div style={{
                    width: '110px',
                    height: '110px',
                    borderRadius: '50%',
                    border: '5px solid #ffffff',
                    boxShadow: '0 8px 24px rgba(52, 168, 83, 0.12)',
                    background: '#ffffff',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    <img 
                      src={
                        editingProfile?.role === 'admin' || editingProfile?.role === 'secretary'
                          ? '/campus_login_hero.png'
                          : editingProfile.photo_url && editingProfile.photo_url.includes('_avatar')
                          ? editingProfile.photo_url
                          : getInstrumentAvatarUrl(editingProfile.resolved_instrument || editingProfile.instrument)
                      } 
                      alt="" 
                      style={{ width: '92%', height: '92%', objectFit: 'contain' }} 
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                    style={{
                      background: showAvatarSelector ? '#34a8530c' : '#ffffff',
                      border: `1.5px solid ${showAvatarSelector ? '#34a853' : 'rgba(0,0,0,0.08)'}`,
                      color: showAvatarSelector ? '#34a853' : '#0f172a',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      borderRadius: '12px',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                    }}
                    onMouseOver={(e) => {
                      if (!showAvatarSelector) {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.transform = 'scale(1.02)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!showAvatarSelector) {
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.transform = 'scale(1)';
                      }
                    }}
                  >
                    <Camera size={14} />
                    <span>Profilbild bearbeiten</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Vorname</label>
                      <input 
                        type="text" 
                        required
                        value={editingProfile.first_name || ''} 
                        onChange={(e) => setEditingProfile((prev: any) => ({ ...prev, first_name: e.target.value }))}
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Nachname</label>
                      <input 
                        type="text" 
                        required
                        value={editingProfile.last_name || ''} 
                        onChange={(e) => setEditingProfile((prev: any) => ({ ...prev, last_name: e.target.value }))}
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>



                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Instrumente</label>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 16px',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      fontSize: '0.88rem',
                      color: '#64748b',
                      boxSizing: 'border-box'
                    }}>
                      <Lock size={14} style={{ color: '#94a3b8' }} />
                      <span style={{ fontWeight: 600 }}>{editingProfile.instrument || 'Keine Instrumente hinterlegt'}</span>
                    </div>
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                      Die Verwaltung legt deine Instrumente fest. Du kannst sie nicht selbst ändern.
                    </span>
                  </div>

                  {showAvatarSelector && (
                    <div className="animation-slide-down" style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '12px', 
                      marginTop: '4px',
                      padding: '16px',
                      background: 'rgba(52, 168, 83, 0.03)',
                      borderRadius: '20px',
                      border: '1.5px dashed rgba(52, 168, 83, 0.15)'
                    }}>
                      <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#34a853', textTransform: 'uppercase', display: 'block' }}>Wähle deinen neuen Instrumenten-Avatar</label>
                      
                      {/* Category Filter Tabs */}
                      {(() => {
                        const selectableAvatars = getSelectableAvatars();
                        const selectableCategories = Array.from(new Set(selectableAvatars.map(av => av.category).filter(Boolean))) as string[];
                        
                        if (selectableCategories.length <= 1) return null;
                        
                        return (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                            {['Alle', ...selectableCategories].map(cat => {
                              const isCatSelected = avatarCategoryFilter === cat;
                              return (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => setAvatarCategoryFilter(cat)}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: '10px',
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    border: `1.5px solid ${isCatSelected ? '#34a853' : '#e2e8f0'}`,
                                    background: isCatSelected ? '#34a853' : 'white',
                                    color: isCatSelected ? 'white' : '#64748b',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  {cat}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {/* Scrollable Grid of Avatars */}
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))', 
                        gap: '12px', 
                        maxHeight: '180px', 
                        overflowY: 'auto',
                        padding: '8px',
                        background: 'white',
                        borderRadius: '14px',
                        border: '1px solid #e2e8f0'
                      }}>
                        {(() => {
                          const selectableAvatars = getSelectableAvatars();
                          return selectableAvatars.filter(av => avatarCategoryFilter === 'Alle' || av.category === avatarCategoryFilter).map((avatarItem) => {
                            const isSelected = editingProfile.photo_url === avatarItem.url;
                            return (
                              <button
                                key={avatarItem.id}
                                type="button"
                                onClick={() => setEditingProfile((prev: any) => ({ ...prev, photo_url: avatarItem.url }))}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '8px',
                                  borderRadius: '12px',
                                  border: `2.5px solid ${isSelected ? '#34a853' : 'transparent'}`,
                                  background: isSelected ? 'white' : 'transparent',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s',
                                  outline: 'none',
                                  boxShadow: isSelected ? '0 4px 10px rgba(52, 168, 83, 0.15)' : 'none'
                                }}
                              >
                                <div style={{ 
                                  width: '56px', 
                                  height: '56px', 
                                  borderRadius: '10px', 
                                  overflow: 'hidden', 
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                                  background: 'white',
                                  border: '1px solid #e2e8f0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <img src={avatarItem.url} style={{ width: '90%', height: '90%', objectFit: 'contain' }} alt={avatarItem.label} loading="lazy" />
                                </div>
                                <span style={{ 
                                  fontSize: '0.62rem', 
                                  fontWeight: 750, 
                                  color: isSelected ? '#1e293b' : '#64748b',
                                  textAlign: 'center',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  width: '100%'
                                }} title={avatarItem.label}>
                                  {avatarItem.label.split(' (')[0]}
                                </span>
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowEditProfile(false)}
                    style={{ flex: 1, padding: '14px', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white', color: '#0f172a', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Abbrechen
                  </button>
                  <button 
                    type="submit" 
                    disabled={savingProfile}
                    style={{ flex: 2, padding: '14px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)', color: 'white', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 8px 24px rgba(52, 168, 83, 0.15)' }}
                  >
                    {savingProfile ? 'Wird gespeichert...' : 'Änderungen speichern'}
                  </button>
                </div>
              </form>
            </div>
          )}
          </>
        )}
      </div>

      {/* Settings Tab */}
      <div style={{ display: (activeTab === 'settings' && studentUser) ? 'flex' : 'none', marginTop: '24px', flexDirection: 'column', gap: '24px', maxWidth: '1000px', margin: '0 auto', width: '100%', padding: '0 20px' }}>
        {activeTab === 'settings' && studentUser && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ 
              display: 'flex',
              background: '#ffffff',
              borderRadius: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 20px rgba(15, 23, 42, 0.02)',
              minHeight: '520px',
              overflow: 'hidden',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
            }}>
              {/* LEFT SIDEBAR */}
              <div style={{
                width: '250px',
                background: '#f8fafc',
                borderRight: '1px solid #e2e8f0',
                padding: '24px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                flexShrink: 0,
                textAlign: 'left'
              }}>
                <h3 style={{ margin: '0 0 16px 8px', fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Einstellungen</h3>
                {[
                  { id: 'notifications', label: 'System & Push-Benachrichtigungen' },
                  { id: 'billing', label: 'Abrechnung & Rechnungen' }
                ].map((item) => {
                  const isSelected = settingsSubTab === item.id;
                  const brandColor = '#34a853';
                  const activeColor = isSelected ? brandColor : '#64748b';
                  
                  const renderIcon = () => {
                    switch (item.id) {
                      case 'notifications': return <Bell size={14} color={activeColor} />;
                      case 'billing': return <FileText size={14} color={activeColor} />;
                      default: return null;
                    }
                  };

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSettingsSubTab(item.id as any)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: isSelected ? '0 12px 12px 0' : '12px',
                        border: 'none',
                        borderLeft: isSelected ? `3px solid ${brandColor}` : '3px solid transparent',
                        background: isSelected ? '#e6f4ea' : 'transparent',
                        color: isSelected ? brandColor : '#475569',
                        fontSize: '0.82rem',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease'
                      }}
                      className="hover-scale"
                    >
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        background: isSelected ? '#ffffff' : '#f1f5f9',
                        boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
                      }}>{renderIcon()}</span>
                      <span style={{ flex: 1 }}>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* RIGHT PANEL */}
              <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', textAlign: 'left' }}>
                {settingsSubTab === 'notifications' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>Benachrichtigungen</h3>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>Passe an, worüber und wie wir dich informieren.</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Push-Benachrichtigungen Haupt-Toggle */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '18px', background: '#f8fafc', border: '1px solid #e2e8f0', transition: 'all 0.2s', opacity: isPremiumUser ? 1 : 0.6 }}>
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                          <div style={{ padding: '10px', borderRadius: '12px', background: pushEnabled ? '#34a85315' : '#f1f5f9', color: pushEnabled ? '#34a853' : '#94a3b8', display: 'flex', transition: 'all 0.2s' }}>
                            <Bell size={18} />
                          </div>
                          <div>
                            <h4 style={{ margin: '0 0 2px 0', fontSize: '0.875rem', fontWeight: 800, color: '#1e293b' }}>Push-Benachrichtigungen aktivieren</h4>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Erlaube der App, dir Direktnachrichten auf dein Handy zu schicken.</p>
                          </div>
                        </div>
                        
                        {isPremiumUser ? (
                          <button
                            type="button"
                            onClick={async () => {
                              const nextVal = !pushEnabled;
                              setPushEnabled(nextVal);
                              if (nextVal) {
                                const success = await subscribeUserToPush(studentId);
                                if (!success) {
                                  setPushEnabled(false);
                                  alert('Fehler beim Aktivieren der Push-Benachrichtigungen. Bitte überprüfe die Berechtigungen deines Browsers.');
                                } else {
                                  alert('Push-Benachrichtigungen erfolgreich aktiviert! 🔔');
                                }
                              } else {
                                const success = await unsubscribeUserFromPush(studentId);
                                if (!success) {
                                  setPushEnabled(true);
                                  alert('Fehler beim Deaktivieren der Push-Benachrichtigungen.');
                                } else {
                                  alert('Push-Benachrichtigungen deaktiviert.');
                                }
                              }
                            }}
                            className={`app-binary-switch ${pushEnabled ? 'active' : ''}`}
                            style={{ backgroundColor: pushEnabled ? '#34a853' : undefined }}
                          >
                            <div className="app-binary-switch-knob" />
                          </button>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fee2e2', color: '#ef4444', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800 }}>
                            <span>🔒 Nur für aktive Schüler</span>
                          </div>
                        )}
                      </div>

                      {!isPremiumUser && (
                        <p style={{ fontSize: '0.75rem', color: '#ef4444', margin: '4px 0 0 0', fontWeight: 700 }}>
                          * Dein Account muss in der Verwaltung aktiv geschaltet sein, um diese Echtzeit-Funktion nutzen zu können.
                        </p>
                      )}

                      {/* iOS Helper Alert */}
                      {isIOS && !isStandalone && (
                        <div style={{
                          padding: '12px 16px',
                          background: '#fffbeb',
                          border: '1px solid #fef3c7',
                          borderRadius: '16px',
                          fontSize: '0.75rem',
                          color: '#b45309',
                          lineHeight: '1.4',
                          fontWeight: 600
                        }}>
                          <strong>💡 iOS / iPhone Info:</strong> Um Benachrichtigungen auf Apple-Geräten zu aktivieren, musst du die App zuerst auf deinem Homescreen installieren: Tippe im Safari-Browser auf das <strong>Teilen-Symbol (Box mit Pfeil nach oben)</strong> und wähle <strong>"Zum Home-Bildschirm"</strong>. Öffne GrooveLab danach über das neue App-Icon auf deinem Homescreen.
                        </div>
                      )}

                      {/* Detail-Toggles */}
                      {pushEnabled && isPremiumUser && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                          {[
                            { k: 'changes', label: 'Terminänderungen 📅', desc: 'Verschiebungen, Ausfälle oder Lehrerwechsel', val: pushNotifScheduleChanges, setter: setPushNotifScheduleChanges, dbKey: 'push_notif_schedule_changes', icon: <Calendar size={18} /> },
                            { k: 'homework', label: 'Hausaufgaben 📝', desc: 'Neue Übe-Aufgaben oder Feedback deiner Lehrkraft', val: pushNotifHomework, setter: setPushNotifHomework, dbKey: 'push_notif_homework', icon: <Pencil size={18} /> },
                            { k: 'news', label: 'Neuigkeiten & Aktionen 🚀', desc: 'Mitteilungen der Musikschule und interessante Aktionen', val: pushNotifAllFeatures, setter: setPushNotifAllFeatures, dbKey: 'push_notif_all_features', icon: <Users size={18} /> }
                          ].map((row) => (
                            <div key={row.k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '18px', background: '#f8fafc', border: '1px solid #e2e8f0', transition: 'all 0.2s' }}>
                              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                                <div style={{ padding: '10px', borderRadius: '12px', background: row.val ? '#34a85315' : '#f1f5f9', color: row.val ? '#34a853' : '#94a3b8', display: 'flex', transition: 'all 0.2s' }}>
                                  {row.icon}
                                </div>
                                <div>
                                  <h4 style={{ margin: '0 0 2px 0', fontSize: '0.875rem', fontWeight: 800, color: '#1e293b' }}>{row.label}</h4>
                                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{row.desc}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={async () => {
                                  const nextVal = !row.val;
                                  row.setter(nextVal);
                                  await supabase.from('users').update({ [row.dbKey]: nextVal }).eq('id', studentId);
                                }}
                                className={`app-binary-switch ${row.val ? 'active' : ''}`}
                                style={{ backgroundColor: row.val ? '#34a853' : undefined }}
                              >
                                <div className="app-binary-switch-knob" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* System zurücksetzen */}
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#ef4444', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RotateCcw size={18} color="#ef4444" /> System zurücksetzen
                      </h3>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '16px', fontWeight: 600, lineHeight: '1.4' }}>
                        Wenn die App nicht korrekt lädt, der Timer hakt oder Anzeigefehler auftreten, kannst du hier alle lokalen Cache-Daten zurücksetzen.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Möchtest du wirklich alle lokalen Daten und gespeicherten Übe-Sessions zurücksetzen? Die App wird danach neu geladen.')) {
                            localStorage.removeItem('groovelab_active_practice_session');
                            localStorage.removeItem('student_lehrwerke_progress');
                            window.location.reload();
                          }
                        }}
                        style={{
                          background: '#fee2e2',
                          color: '#ef4444',
                          border: '1px solid #fca5a5',
                          padding: '12px 20px',
                          borderRadius: '14px',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <RotateCcw size={14} /> Lokalen Cache leeren
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Abrechnung */}
                    {studentUser?.role?.toLowerCase() === 'student' && (
                      <StudentBillingInvoicesSection studentUser={studentUser} studentId={studentId} />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* PERSISTENT STATUS BAR */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 40px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              borderRadius: '20px',
              marginTop: '8px'
            }}>
              <span style={{ fontSize: '0.82rem', color: '#34a853', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                ✓ Alle Änderungen gespeichert.
              </span>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                Änderungen werden sofort wirksam und gesichert.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Notebook Lehrwerk Detail Modal */}
      {selectedLehrwerkForDetail && (() => {
        const book = selectedLehrwerkForDetail;
        const gradient = getLehrwerkColor(book.title, lehrwerke);
        
        // Find pages/chapters of this book and their status from localProgress and progressItems
        const pagesMap: Record<number, { status: string, notes: string, id?: string }> = {};
        
        // Load from progressItems (Supabase backend)
        progressItems.forEach(item => {
          if (item.topic_name.toLowerCase().startsWith(`${book.title.toLowerCase()} - seite `)) {
            const pageNum = parseInt(item.topic_name.split(' - Seite ')[1], 10);
            if (!isNaN(pageNum)) {
              pagesMap[pageNum] = {
                status: item.status,
                notes: item.teacher_notes || '',
                id: item.id
              };
            }
          }
        });

        // Supplement with localProgress (localStorage)
        const assignment = localProgress.find((p: any) => String(p.studentId) === String(studentId) && String(p.lehrwerkId) === String(book.id));
        if (assignment && assignment.pageStates) {
          Object.entries(assignment.pageStates).forEach(([pageNumStr, stateObj]: [string, any]) => {
            const pageNum = parseInt(pageNumStr, 10);
            if (!isNaN(pageNum)) {
              pagesMap[pageNum] = {
                status: stateObj.status === 'mastered' ? 'MASTERED' : 'IN_PROGRESS',
                notes: stateObj.notes || pagesMap[pageNum]?.notes || '',
                id: pagesMap[pageNum]?.id
              };
            }
          });
        }

        const sortedPages = Object.entries(pagesMap)
          .map(([numStr, details]) => ({ num: parseInt(numStr, 10), ...details }))
          .sort((a, b) => a.num - b.num);

        const masteredCount = sortedPages.filter(p => p.status === 'MASTERED').length;

        return (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 4000,
            background: 'rgba(9, 9, 11, 0.65)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            fontFamily: '"Inter", sans-serif'
          }}>
            <div style={{
              background: '#f3f3f6',
              borderRadius: '32px',
              width: '100%',
              maxWidth: '1100px',
              height: '80vh',
              boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid rgba(0, 0, 0, 0.05)',
              position: 'relative'
            }} className="animation-slide-up">
              
              {/* Header - Waldgrün Header */}
              <div style={{
                padding: '16px 24px',
                background: '#456355',
                borderBottom: '1px solid rgba(50, 72, 62, 0.8)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 50,
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <BookOpen size={20} color="#ffffff" />
                  <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', fontFamily: 'Urbanist' }}>
                    Lehrwerk-Details: {book.title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedLehrwerkForDetail(null)}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#ffffff',
                    transition: 'all 0.18s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                  }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Inside Pages of the Notebook (Left/Right Pages) */}
              <div style={{
                display: 'flex',
                flex: 1,
                overflow: 'hidden',
                position: 'relative'
              }}>
                
                {/* Left Page (Information & General Progress) */}
                <div style={{
                  flex: 1,
                  padding: '32px',
                  overflowY: 'auto',
                  background: '#ffffff',
                  borderRight: '1px solid #e2e8f0',
                  position: 'relative'
                }}>

                  {/* Content Container */}
                  <div style={{ paddingRight: '12px' }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '24px' }}>
                      <div style={{ 
                        width: '80px', 
                        height: '105px', 
                        background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`, 
                        borderRadius: '4px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                      }}>
                        <BookOpen size={36} color={gradient.text} />
                      </div>
                      <div>
                        <h2 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                          {book.title}
                        </h2>
                        {book.author && (
                          <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>
                            von {book.author}
                          </p>
                        )}
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>
                          📖 {book.totalPages || 50} Seiten
                        </span>
                      </div>
                    </div>

                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '20px 0 12px 0', borderBottom: '2px solid #cbd5e1', paddingBottom: '6px' }}>
                      📊 Dein Fortschritt
                    </h3>
                    <div style={{ background: 'rgba(255, 255, 255, 0.7)', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>
                        <span>Gemeisterte Seiten</span>
                        <span>{masteredCount} / {book.totalPages || 50} Seiten</span>
                      </div>
                      <div style={{ width: '100%', height: '10px', borderRadius: '5px', background: '#cbd5e1', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, (masteredCount / (book.totalPages || 50)) * 100)}%`, height: '100%', background: gradient.text, borderRadius: '5px', transition: 'width 0.3s ease' }} />
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#475569', margin: '4px 0 0 0', lineHeight: '1.4', fontWeight: 600 }}>
                        {masteredCount === 0 
                          ? 'Du hast noch keine Seiten dieses Lehrwerks abgeschlossen. Viel Spaß beim Üben! 🚀' 
                          : masteredCount === (book.totalPages || 50) 
                          ? 'Wahnsinn! Du hast dieses Lehrwerk vollständig durchgearbeitet! 🏆✨' 
                          : 'Weiter so! Jeder Meilenstein bringt dich deinem Ziel näher.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Page (Assigned Pages & Notes) */}
                <div style={{
                  flex: 1,
                  padding: '32px',
                  overflowY: 'auto',
                  background: '#f8fafc',
                  position: 'relative'
                }}>

                  {/* Content Container */}
                  <div style={{ paddingLeft: '12px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px 0', borderBottom: '2px solid #cbd5e1', paddingBottom: '6px' }}>
                      📋 Aufgaben & Seiten
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {sortedPages.map((page) => {
                        let badgeBg = '#e6f4ea';
                        let badgeColor = '#34a853';
                        let badgeText = 'In Arbeit';

                        if (page.status === 'THEORY_DONE') {
                          badgeBg = '#f3e8ff';
                          badgeColor = '#6b21a8';
                          badgeText = 'Theorie';
                        } else if (page.status === 'MASTERED') {
                          badgeBg = '#e6f4ea';
                          badgeColor = '#34a853';
                          badgeText = 'Erledigt';
                        }

                        return (
                          <div key={page.num} style={{
                            background: 'rgba(255, 255, 255, 0.7)',
                            border: '1px solid #e2e8f0',
                            padding: '12px 16px',
                            borderRadius: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                                Seite {page.num}
                              </span>
                              <span style={{
                                background: badgeBg,
                                color: badgeColor,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '0.65rem',
                                fontWeight: 900,
                                textTransform: 'uppercase'
                              }}>
                                {badgeText}
                              </span>
                            </div>
                            {page.notes && (
                              <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569', fontWeight: 550, fontStyle: 'italic', background: '#ffffff', padding: '8px 12px', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
                                {page.notes}
                              </p>
                            )}
                          </div>
                        );
                      })}

                      {sortedPages.length === 0 && (
                        <p style={{ fontStyle: 'italic', color: '#64748b', fontSize: '0.85rem', textAlign: 'center', marginTop: '24px' }}>
                          Hier sind aktuell keine Seiten eingetragen.
                        </p>
                      )}
                    </div>
                  </div>
                </div>



              </div>
            </div>
          </div>
        );
      })()}

      {/* ======================================================== */}
      {/* 9:16 MOBILE STORY GENERATOR MODAL (Wrapped & Flashback) */}
      {/* ======================================================== */}
      {showWrapped && wrappedData && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: '#09090b',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '"Outfit", sans-serif'
        }}>
          {/* 9:16 Aspect Ratio Container */}
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '430px',
            height: '100%',
            maxHeight: '860px',
            background: '#000000',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #18181b',
            boxSizing: 'border-box'
          }}>
            {/* Top Indicator Bars */}
            <div style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              right: '16px',
              zIndex: 10000,
              display: 'flex',
              gap: '4px'
            }}>
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} style={{
                  flex: 1,
                  height: '4px',
                  background: idx < storySlide ? '#eab308' : idx === storySlide ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
                  borderRadius: '100px',
                  overflow: 'hidden'
                }}>
                  {idx === storySlide && (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      background: '#eab308',
                      animation: 'storyProgress 5s linear forwards'
                    }} />
                  )}
                </div>
              ))}
            </div>

            {/* Header: Title and Close button */}
            <div style={{
              position: 'absolute',
              top: '32px',
              left: '16px',
              right: '16px',
              zIndex: 10000,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ color: 'white', fontWeight: 900, fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Campus-Groovelab Wrapped
              </span>
              <button 
                onClick={() => setShowWrapped(false)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* STORY SLIDES */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 24px', boxSizing: 'border-box', color: 'white' }}>
              
              {/* SLIDE 0: INTRO */}
              {storySlide === 0 && (
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
                  <div style={{ fontSize: '6rem', animation: 'bounce 2s infinite' }}>🎬</div>
                  <h2 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
                    Dein musikalischer Flashback!
                  </h2>
                  <p style={{ color: '#a1a1aa', fontSize: '1rem', fontWeight: 500 }}>
                    Schauen wir uns an, was du diesen Monat im Campus-Groovelab geleistet hast! Bist du bereit für deine Story?
                  </p>
                </div>
              )}

              {/* SLIDE 1: STATISTICS (Censored for Free, Uncensored for Premium) */}
              {storySlide === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ background: '#eab308', color: '#09090b', fontSize: '0.7rem', fontWeight: 900, padding: '4px 12px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fokus &amp; Übung</span>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, marginTop: '12px' }}>Deine Meilensteine</h2>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Focus Minutes Card */}
                    <div style={{ background: '#09090b', border: '1px solid #27272a', padding: '24px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <Clock size={36} color="#eab308" />
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 800 }}>Fokus-Zeit</div>
                        <div 
                          className={!wrappedData.isPremium ? 'blur-md text-2xl font-black text-white select-none' : 'text-2xl font-black text-white'}
                        >
                          {wrappedData.isPremium ? `${wrappedData.monthlyFlashback.focusMinutes} Minuten` : '9999 Minuten'}
                        </div>
                      </div>
                    </div>

                    {/* Mastered Songs Card */}
                    <div style={{ background: '#09090b', border: '1px solid #27272a', padding: '24px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <BookOpen size={36} color="#34a853" />
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 800 }}>Gemeisterte Songs</div>
                        <div 
                          className={!wrappedData.isPremium ? 'blur-md text-2xl font-black text-white select-none' : 'text-2xl font-black text-white'}
                        >
                          {wrappedData.isPremium ? `${wrappedData.monthlyFlashback.masteredSongsCount} Songs` : '88 Songs'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {!wrappedData.isPremium && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '12px', borderRadius: '16px', color: '#ef4444', fontSize: '0.78rem' }}>
                      <EyeOff size={16} />
                      <span>Statistiken ausgeblendet. Upgrade auf Premium erforderlich!</span>
                    </div>
                  )}
                </div>
              )}

              {/* SLIDE 2: AVATAR SHOWCASE (Grayscale for Free, 3D/Color for Premium) */}
              {storySlide === 2 && (
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
                  <div>
                    <span style={{ background: '#34a853', color: 'white', fontSize: '0.7rem', fontWeight: 900, padding: '4px 12px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Charakter Evolution</span>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, marginTop: '12px' }}>Dein Avatar-Status</h2>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <div 
                      className={!wrappedData.isPremium ? 'grayscale w-40 h-40 rounded-full bg-zinc-800 border-4 border-zinc-700 flex items-center justify-center overflow-hidden' : 'w-40 h-40 rounded-full bg-indigo-950/40 border-4 border-indigo-500 flex items-center justify-center overflow-hidden animate-pulse'}
                    >
                      <span style={{ fontSize: '5.5rem' }}>
                        {avatar.instrument_type === 'guitarist' ? '🎸' : avatar.instrument_type === 'drummer' ? '🥁' : avatar.instrument_type === 'keyboardist' ? '🎹' : '🎤'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>
                      {wrappedData.isPremium ? levelTitle.split(' (')[0] : 'Analoger Schüler (Silhouette)'}
                    </h3>
                    <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '6px' }}>
                      {wrappedData.isPremium 
                        ? `Evolution Level ${currentLevel} erreicht!`
                        : 'Kostenlose Avatare bleiben grau und leblos. Upgrade, um deinen 3D-Helden zu erwecken!'
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* SLIDE 3: BADGES & VIRAL QR SHARE */}
              {storySlide === 3 && (
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900 }}>
                      {wrappedData.isPremium ? 'Sammle dein Badge!' : 'Hol dir die Vollversion'}
                    </h2>
                    <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '6px' }}>
                      {wrappedData.isPremium ? 'Hier ist dein exklusives Monats-Badge:' : 'Upgrade für nur 0,49 € / Monat!'}
                    </p>
                  </div>

                  {wrappedData.isPremium ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                      <div style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(245, 158, 11, 0.3)' }}>
                        <Trophy size={36} color="white" />
                      </div>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fbbf24' }}>
                        {wrappedData.monthlyFlashback.badgeName}
                      </span>

                      {/* Viral QR Code Generator */}
                      <div style={{ background: 'white', padding: '10px', borderRadius: '16px', marginTop: '8px', boxShadow: '0 10px 30px rgba(255,255,255,0.05)' }}>
                        <QRCode value={`https://groovelab.app/join?ref=${studentId}`} size={100} />
                      </div>
                      <span style={{ fontSize: '0.65rem', color: '#71717a' }}>Virale Partner-ID: ref={studentId}</span>

                      {/* One click WhatsApp Status Share */}
                      <a 
                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Schau mal! Mein GrooveLab Rückblick diesen Monat: Ich war ${wrappedData.monthlyFlashback.focusMinutes} Minuten fokussiert und habe mein ${wrappedData.monthlyFlashback.badgeName} freigeschaltet! Musik machen ist genial! Werde auch Mitglied: https://groovelab.app/join?ref=${studentId}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ background: '#25d366', color: 'white', textDecoration: 'none', padding: '14px 28px', borderRadius: '14px', fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', boxShadow: '0 4px 12px rgba(37, 211, 102, 0.2)' }}
                      >
                        <Share2 size={16} /> Auf WhatsApp teilen
                      </a>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#27272a', border: '2px dashed #3f3f46', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Lock size={32} color="#71717a" />
                      </div>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#a1a1aa' }}>Badge gesperrt</span>

                      {/* Redirect to WhatsApp upgrade trigger */}
                      <a 
                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Hallo Musikschule! Ich möchte mein GrooveLab-Konto auf Premium upgraden, um Avatare, Streaks und monatliche Stories freizuschalten. Bitte sendet mir den Upgrade-Link für 0,49€.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ background: '#fbbf24', color: '#09090b', textDecoration: 'none', padding: '14px 28px', borderRadius: '14px', fontSize: '0.85rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}
                      >
                        <Zap size={16} /> Jetzt Upgrade anfordern (0,49 €)
                      </a>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Story Navigation Tabs Bottom */}
            <div style={{
              display: 'flex',
              padding: '16px',
              borderTop: '1px solid #18181b',
              background: '#09090b',
              gap: '8px'
            }}>
              <button 
                onClick={() => setStorySlide(prev => Math.max(0, prev - 1))}
                disabled={storySlide === 0}
                style={{ flex: 1, background: '#18181b', border: '1px solid #27272a', color: 'white', padding: '12px 16px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: storySlide === 0 ? 0.5 : 1 }}
              >
                Zurück
              </button>
              
              <button 
                onClick={() => {
                  if (storySlide === 3) {
                    setShowWrapped(false);
                  } else {
                    setStorySlide(prev => Math.min(3, prev + 1));
                  }
                }}
                style={{ flex: 2, background: '#eab308', border: 'none', color: '#09090b', padding: '12px 16px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 900, cursor: 'pointer', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {storySlide === 3 ? 'Schließen' : 'Weiter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DIGITAL DETOX ACTIVE TIMER OVERLAY (AMOLED Black Screen)  */}
      {/* ======================================================== */}
      {showDetox && createPortal(
        <div style={{
          position: 'fixed',
          inset: 0,
          background: '#000000', // AMOLED Black
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontFamily: '"Outfit", sans-serif',
          padding: '24px'
        }}>
          {isFaceDown ? (
            // Full AMOLED-Black with minimal reizarm layout
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '32px', alignItems: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Moon size={24} color="#52525b" className="animate-pulse" />
              </div>
              <h1 style={{ fontSize: '4rem', fontWeight: 100, fontFamily: 'monospace', letterSpacing: '-0.02em', color: '#27272a', margin: 0 }}>
                {Math.floor(detoxSecondsLeft / 60)}:{String(detoxSecondsLeft % 60).padStart(2, '0')}
              </h1>
              <p style={{ color: '#27272a', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                Digital Detox Aktiv
              </p>
            </div>
          ) : (
            // Warning/Flat check mode when flipped face up
            <div style={{ 
              textAlign: 'center', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '28px', 
              alignItems: 'center', 
              maxWidth: '340px',
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '30px',
              padding: '40px 30px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '24px', 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.2)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.05)'
              }}>
                <Smartphone size={38} color="#ef4444" className="animate-bounce" />
              </div>
              
              <div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f87171', letterSpacing: '-0.02em', margin: '0 0 8px 0' }}>
                  Handy umdrehen!
                </h2>
                <p style={{ color: '#a1a1aa', fontSize: '0.88rem', lineHeight: '1.5', fontWeight: 500, margin: 0 }}>
                  Der Timer ist eingefroren. Lege das Smartphone mit dem Display nach unten hin, um den Fokusmodus fortzusetzen.
                </p>
              </div>
              
              <div style={{ fontSize: '3.6rem', fontWeight: 800, color: 'white', fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.02em', margin: '10px 0', lineHeight: 1 }}>
                {Math.floor(detoxSecondsLeft / 60)}:{String(detoxSecondsLeft % 60).padStart(2, '0')}
              </div>

              <div style={{ width: '100%' }}>
                <button 
                  onClick={() => {
                    setIsDetoxActive(false);
                    setShowDetox(false);
                  }}
                  style={{ 
                    width: '100%', 
                    padding: '16px', 
                    background: 'rgba(255, 255, 255, 0.1)', 
                    border: '1px solid rgba(255, 255, 255, 0.05)', 
                    color: 'white', 
                    borderRadius: '20px', 
                    fontSize: '0.9rem', 
                    fontWeight: 700, 
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  className="hover-scale"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {detoxCompleted && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: '#09090b',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              textAlign: 'center'
            }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#34a853', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                <Award size={48} color="white" />
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white' }}>Fokus abgeschlossen!</h2>
              <p style={{ color: '#a1a1aa', fontSize: '0.9rem', marginTop: '8px', maxWidth: '280px' }}>
                {xpActive 
                  ? `Sehr gut! Du warst ${detoxMinutes} Minuten voll konzentriert. Dir wurden +10 XP auf deinen Avatar gebucht.`
                  : `Sehr gut! Du warst ${detoxMinutes} Minuten voll konzentriert. Dein Fokus war erfolgreich!`}
              </p>
              
              <button 
                onClick={() => {
                  setShowDetox(false);
                  setDetoxCompleted(false);
                }}
                style={{ marginTop: '24px', background: '#34a853', color: 'white', border: 'none', padding: '14px 28px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer' }}
              >
                Zurück zum Dashboard
              </button>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Contributions breakdown pie chart modal */}
      {contributionsModalData && (() => {
        const contributions = contributionsModalData.contributions || [];
        const totalContributed = contributions.reduce((sum, c) => sum + c.minutes, 0);

        const colorPalette = [
          '#6366f1', // Indigo
          '#34a853', // Emerald
          '#f59e0b', // Amber
          '#ef4444', // Red
          '#3b82f6', // Blue
          '#ec4899', // Pink
          '#8b5cf6', // Violet
          '#34a853', // Teal
        ];

        let accumulatedPercent = 0;
        const gradientSectors = contributions.map((c, idx) => {
          const percent = (c.minutes / (totalContributed || 1)) * 100;
          const start = accumulatedPercent;
          accumulatedPercent += percent;
          const color = colorPalette[idx % colorPalette.length];
          return `${color} ${start}% ${accumulatedPercent}%`;
        });
        const conicGradient = totalContributed > 0 
          ? `conic-gradient(${gradientSectors.join(', ')})`
          : '#cbd5e1';

        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(16px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', padding: '32px', borderRadius: '28px', boxShadow: '0 24px 60px rgba(15, 23, 42, 0.16)', width: '460px', maxWidth: '95vw', border: '1px solid rgba(255,255,255,0.5)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', maxHeight: '90vh', overflowY: 'auto' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🌱 Übe-Ziele der Klasse
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                    {contributionsModalData.goalTitle}
                  </p>
                </div>
                <button 
                  onClick={() => setContributionsModalData(null)}
                  style={{ background: '#f8fafc', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseOut={e => e.currentTarget.style.background = '#f8fafc'}
                >
                  <X size={18} />
                </button>
              </div>

              {loadingContributions ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '16px' }}>
                  <div style={{ width: '40px', height: '40px', border: '3px solid #f3f3f3', borderTop: '3px solid #34a853', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>Lade Schülerbeiträge...</span>
                  <style>{`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', alignItems: 'center' }}>
                  {/* Pie / Donut Chart */}
                  <div style={{
                    width: '180px',
                    height: '180px',
                    borderRadius: '50%',
                    background: conicGradient,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)'
                  }}>
                    {/* Donut hole */}
                    <div style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      background: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.04)'
                    }}>
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gesamt</span>
                      <span style={{ fontSize: '1.6rem', fontWeight: 950, color: '#1e293b', letterSpacing: '-0.02em', fontFeatureSettings: '"tnum"' }}>{totalContributed}<span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#64748b', marginLeft: '1px' }}>m</span></span>
                      <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#94a3b8', marginTop: '2px' }}>von {contributionsModalData.targetMinutes}m</span>
                    </div>
                  </div>

                  {/* Contributions List */}
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                      Beiträge dieser Woche
                    </div>
                    {contributions.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.82rem', padding: '20px 0', fontWeight: 650 }}>
                        🎵 Bisher hat noch kein Schüler geübt. Mach den ersten Schritt!
                      </div>
                    ) : (
                      contributions.map((c, idx) => {
                        const percent = totalContributed > 0 ? Math.round((c.minutes / totalContributed) * 100) : 0;
                        const sliceColor = colorPalette[idx % colorPalette.length];
                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: sliceColor }} />
                              <span style={{ fontSize: '0.85rem', fontWeight: 750, color: '#1e293b' }}>{c.name}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1e293b', fontFeatureSettings: '"tnum"' }}>{c.minutes} Min</span>
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', background: '#e2e8f0', padding: '2px 8px', borderRadius: '100px', fontFeatureSettings: '"tnum"' }}>{percent}%</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Close Button */}
              <button 
                onClick={() => setContributionsModalData(null)}
                style={{ background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)', color: 'white', border: 'none', borderRadius: '14px', padding: '12px 20px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', marginTop: '28px', width: '100%', boxShadow: '0 4px 12px rgba(52, 168, 83, 0.15)', transition: 'all 0.2s' }}
                onMouseOver={e => e.currentTarget.style.boxShadow = '0 6px 16px rgba(52, 168, 83, 0.25)'}
                onMouseOut={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(52, 168, 83, 0.15)'}
              >
                Schließen
              </button>

            </div>
          </div>
        );
      })()}

      {/* Spielregeln Modal */}
      {showRulesModal && (() => {
        const level = avatar?.evolution_level || 1;
        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ background: '#ffffff', padding: '28px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(15, 23, 42, 0.12)', width: '450px', maxWidth: '100%', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', position: 'relative' }}>
              
              {/* Close icon */}
              <button 
                onClick={() => setShowRulesModal(false)}
                style={{ position: 'absolute', top: '20px', right: '20px', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'}
                onMouseOut={e => e.currentTarget.style.background = '#f1f5f9'}
              >
                <X size={16} />
              </button>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <Flame size={24} color="#ea580c" fill="#ea580c" />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>
                  Spielregeln: Flammen-Pfad (Level {level})
                </h3>
              </div>

              <p style={{ margin: '0 0 20px 0', fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                Halte deine Flamme am Brennen! Übe jeden Tag aktiv mit der App, um deine Übestreak (Serie) auszubauen und neue Flammen-Stufen freizuschalten.
              </p>

              {/* Flame Levels */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Die Flammen-Stufen:
                </span>
                
                {/* Kleine Flamme */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '12px 16px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.02)' }}>
                  <div style={{ color: '#eab308', display: 'flex', alignItems: 'center' }}>
                    <Flame size={20} fill="currentColor" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>Kleine Flamme</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Streak von 1 - 3 Tagen • Ziel: <strong style={{ color: '#854d0e' }}>{level === 3 ? 10 : level === 2 ? 5 : 3} Min.</strong> Üben täglich</div>
                  </div>
                </div>

                {/* Mittlere Flamme */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '12px 16px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.02)' }}>
                  <div style={{ color: '#f97316', display: 'flex', alignItems: 'center' }}>
                    <Flame size={20} fill="currentColor" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>Mittlere Flamme</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Streak von 4 - 8 Tagen • Ziel: <strong style={{ color: '#a21caf' }}>{level === 3 ? 15 : level === 2 ? 10 : 5} Min.</strong> Üben täglich</div>
                  </div>
                </div>

                {/* Helden-Feuer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '12px 16px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.02)' }}>
                  <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                    <Flame size={20} fill="currentColor" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>Helden-Feuer</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Streak ab 9 Tagen • Ziel: <strong style={{ color: '#b91c1c' }}>{level === 3 ? 20 : level === 2 ? 15 : 10} Min.</strong> Üben täglich</div>
                  </div>
                </div>
              </div>

            {/* Joker Info */}
            <div style={{ background: '#e6f4ea', border: '1px solid #e6f4ea', borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34a853', fontWeight: 800, fontSize: '0.85rem', marginBottom: '6px' }}>
                🎯 Der wöchentliche Joker & Fehltage
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#34a853', lineHeight: 1.45 }}>
                Jede Woche (Montag bis Sonntag) erhältst du <strong>1 Joker</strong>. Wenn du das Üben an einem Tag verpasst, wird der Joker am Tagesende automatisch eingesetzt, um deinen Streak zu retten. Hast du keinen Joker mehr, wird <strong>jeder Fehltag als -1 auf deinen Streak</strong> gewertet (z. B. fällt ein 5-Tage-Streak nach einem Fehltag auf 4 Tage).
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '0.78rem', color: '#34a853', lineHeight: 1.45 }}>
                <strong>Wichtig:</strong> Um die Kleine Flamme zum Brennen zu bringen, benötigst du mindestens <strong>1 Übe-Tag (Streak &gt;= 1)</strong>. Wenn der Streak durch Fehltage auf 0 fällt, leuchtet keine Flamme mehr.
              </p>
            </div>

            {/* Action Button */}
            <button 
              onClick={() => setShowRulesModal(false)}
              style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: 'white', border: 'none', borderRadius: '16px', padding: '14px 20px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', width: '100%', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.2)', transition: 'all 0.2s' }}
              onMouseOver={e => e.currentTarget.style.boxShadow = '0 6px 16px rgba(234, 88, 12, 0.3)'}
              onMouseOut={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(234, 88, 12, 0.2)'}
            >
              Alles klar!
            </button>

          </div>
        </div>
      );
    })()}

      {/* Appointment Quick Chat (Shoutbox) Modal */}
      {showAppointmentChat && appointmentChatData && (() => {
        let isFrozen = false;
        try {
          const timePart = appointmentChatData.start_time.includes(':') ? appointmentChatData.start_time : `${appointmentChatData.start_time}:00`;
          const lessonDateTime = new Date(`${appointmentChatData.date}T${timePart}`);
          isFrozen = Date.now() > lessonDateTime.getTime() + 48 * 60 * 60 * 1000;
        } catch (e) {}

        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', padding: '24px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', width: '420px', maxWidth: '90vw', border: '1px solid rgba(255,255,255,0.5)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', height: '520px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Shoutbox – Terminabsprache {isFrozen && '🔒'}
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: isFrozen ? '#ef4444' : '#64748b', fontWeight: 700 }}>
                    {isFrozen ? 'Eingefroren (48h nach Termin)' : '1:1 Absprache mit deiner Lehrkraft'}
                  </p>
                </div>
                <button 
                  onClick={() => setShowAppointmentChat(false)}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={20} />
                </button>
              </div>


              {/* Chat messages viewport */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', paddingRight: '4px' }}>
                {isFrozen && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', textAlign: 'center', justifyContent: 'center' }}>
                    🔒 Shoutbox eingefroren (Schreibschutz aktiv)
                  </div>
                )}
                {chatMessages.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.8rem', textAlign: 'center', padding: '16px' }}>
                    Noch keine Nachrichten. Schreib deiner Lehrkraft für eine schnelle Absprache.
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => {
                    const isMe = msg.sender_id === studentId;
                    const isTerminMsg = msg.content.startsWith('[Termin');
                    let displayedContent = msg.content;
                    let prefixText = '';
                    if (isTerminMsg) {
                      const closeBracketIdx = msg.content.indexOf(']');
                      if (closeBracketIdx !== -1) {
                        prefixText = msg.content.substring(1, closeBracketIdx);
                        displayedContent = msg.content.substring(closeBracketIdx + 1).trim();
                      }
                    }

                    return (
                      <div key={msg.id || idx} style={{ display: 'flex', flexDirection: 'column', alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%', textAlign: 'left' }}>
                        {prefixText && (
                          <span style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '2px', alignSelf: isMe ? 'flex-end' : 'flex-start', fontWeight: 600 }}>
                            📅 {prefixText}
                          </span>
                        )}
                        <div style={{ 
                          background: isMe ? '#4f46e5' : '#f1f5f9', 
                          color: isMe ? 'white' : '#1e293b', 
                          padding: '8px 12px', 
                          borderRadius: '12px', 
                          borderBottomRightRadius: isMe ? '2px' : '12px',
                          borderBottomLeftRadius: isMe ? '12px' : '2px',
                          fontSize: '0.82rem',
                          lineHeight: 1.4,
                          wordBreak: 'break-word'
                        }}>
                          {displayedContent}
                        </div>
                        <span style={{ fontSize: '0.6rem', color: '#64748b', marginTop: '2px', alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                          {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={chatMessagesEndRef} />
              </div>

              {/* Send Input Form */}
              <form onSubmit={handleSendChatMessage} style={{ display: 'flex', gap: '8px', marginTop: 'auto', width: '100%' }}>
                <input 
                  type="text" 
                  placeholder={isFrozen ? "Shoutbox nach 48h eingefroren..." : "Nachricht senden..."}
                  disabled={isFrozen}
                  value={chatTypedMessage}
                  onChange={e => setChatTypedMessage(e.target.value)}
                  style={{ flex: 1, padding: '12px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.88rem', outline: 'none', background: isFrozen ? '#f1f5f9' : '#ffffff', minHeight: '44px', boxSizing: 'border-box' }}
                />
                <button type="submit" disabled={isFrozen} style={{ background: isFrozen ? '#cbd5e1' : '#4f46e5', color: 'white', border: 'none', borderRadius: '12px', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isFrozen ? 'not-allowed' : 'pointer', boxShadow: isFrozen ? 'none' : '0 4px 12px rgba(79, 70, 229, 0.15)', minHeight: '44px', flexShrink: 0 }}>
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Crisis Notification Modal for Student Confirmation */}
      {unreadCrisisNotifs.length > 0 && (() => {
        const isReinstated = unreadCrisisNotifs.some(n => n.is_reinstated);
        return (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)',
            zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px'
          }}>
            <div style={{
              background: 'white', padding: '32px', borderRadius: '28px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.2)', width: '100%', maxWidth: '480px',
              border: isReinstated ? '2px solid #e6f4ea' : '2px solid #fee2e2',
              display: 'flex', flexDirection: 'column', gap: '20px',
              boxSizing: 'border-box', textAlign: 'center'
            }}>
              <div style={{
                background: isReinstated 
                  ? 'linear-gradient(135deg, #34a853 0%, #34a853 100%)'
                  : 'linear-gradient(135deg, #ef4444 0%, #be123c 100%)',
                color: 'white', width: '56px', height: '56px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.8rem', margin: '0 auto',
                boxShadow: isReinstated 
                  ? '0 8px 20px rgba(52, 168, 83, 0.3)'
                  : '0 8px 20px rgba(239, 68, 68, 0.3)'
              }}>
                {isReinstated ? '☀️' : '🌡️'}
              </div>
              
              <div>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '1.25rem', 
                  fontWeight: 900, 
                  color: isReinstated ? '#34a853' : '#9f1239', 
                  fontFamily: '"Outfit", "Inter", sans-serif' 
                }}>
                  {isReinstated ? 'Gute Neuigkeiten: Unterricht findet statt!' : 'Wichtige Mitteilung: Unterrichtsausfall'}
                </h3>
                <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 600, lineHeight: 1.4 }}>
                  {isReinstated 
                    ? 'Deine Lehrkraft ist früher wieder gesund geworden. Dein Unterricht findet wie gewohnt statt:'
                    : 'Deine Lehrkraft hat sich krankgemeldet. Daher müssen die folgenden Termine leider ausfallen:'}
                </p>
              </div>

              <div style={{
                display: 'flex', flexDirection: 'column', gap: '10px',
                maxHeight: '180px', overflowY: 'auto', padding: '4px'
              }}>
                {unreadCrisisNotifs.map((n, idx) => {
                  const dt = new Date(n.slot_start_datetime);
                  const dateStr = dt.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
                  const timeStr = dt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                  const teacherName = n.teacher ? `${n.teacher.first_name} ${n.teacher.last_name}` : 'Deine Lehrkraft';

                  return (
                    <div key={n.id || idx} style={{
                      background: isReinstated ? '#e6f4ea' : '#fff5f5', 
                      border: isReinstated ? '1.5px solid #e6f4ea' : '1.5px solid #fecaca',
                      borderRadius: '16px', padding: '12px 16px', textAlign: 'left',
                      display: 'flex', flexDirection: 'column', gap: '4px'
                    }}>
                      <div style={{ 
                        fontSize: '0.82rem', 
                        fontWeight: 800, 
                        color: isReinstated ? '#34a853' : '#991b1b' 
                      }}>
                        {isReinstated ? `☀️ Findet statt: ${dateStr}` : `🚫 Ausfall: ${dateStr}`}
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: isReinstated ? '#34a853' : '#7f1d1d', 
                        fontWeight: 600, 
                        display: 'flex', 
                        gap: '8px', 
                        alignItems: 'center' 
                      }}>
                        <span>🕒 {timeStr} Uhr</span>
                        <span>•</span>
                        <span>Lehrer: {teacherName}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={async () => {
                  try {
                    const promises = unreadCrisisNotifs.map(n => 
                      supabase
                        .from('crisis_notifications')
                        .update({ status: 'READ' })
                        .eq('id', n.id)
                    );
                    await Promise.all(promises);
                    setUnreadCrisisNotifs([]);
                  } catch (err) {
                    console.error('Error confirming notifications:', err);
                    alert('Bestätigung fehlgeschlagen. Bitte versuche es erneut.');
                  }
                }}
                style={{
                  background: isReinstated
                    ? 'linear-gradient(135deg, #34a853 0%, #34a853 100%)'
                    : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white', border: 'none', borderRadius: '16px',
                  padding: '16px', fontWeight: 900, fontSize: '0.88rem',
                  cursor: 'pointer', fontFamily: '"Outfit", "Inter", sans-serif',
                  boxShadow: isReinstated
                    ? '0 6px 20px rgba(52, 168, 83, 0.25)'
                    : '0 6px 20px rgba(239, 68, 68, 0.25)',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                className="hover-scale"
              >
                {isReinstated ? 'Super, ich bin dabei! 👍' : 'Ich habe den Ausfall zur Kenntnis genommen'}
              </button>
            </div>
          </div>
        );
      })()}
      
      <TourComponent />
    </div>
  );
}

const CassetteIcon: React.FC<{ isPlaying: boolean; color?: string }> = ({ isPlaying, color = 'currentColor' }) => {
  return (
    <svg 
      viewBox="0 0 24 24" 
      width="20" 
      height="20" 
      fill="none" 
      stroke={color} 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      style={{
        display: 'block',
        flexShrink: 0
      }}
    >
      {/* Outer Cassette Shell */}
      <rect x="2" y="3" width="20" height="14" rx="2" strokeWidth="1.8" />
      {/* Bottom Trapezoid (exposed tape run) */}
      <path d="M6 17 L7.5 20.5 L16.5 20.5 L18 17" strokeWidth="1.5" />
      {/* Center label sticker area */}
      <rect x="4.5" y="5.5" width="15" height="9" rx="1" strokeWidth="1.2" opacity="0.85" />
      {/* The clear plastic window in the middle */}
      <rect x="7.5" y="7.5" width="9" height="5" rx="0.5" strokeWidth="1" opacity="0.8" />
      {/* Left rotating reel */}
      <g style={{ transformOrigin: '10px 10px', animation: isPlaying ? 'spin-clockwise 3s linear infinite' : 'none' }}>
        <circle cx="10" cy="10" r="1.8" strokeWidth="1.2" />
        <path d="M10 8.2 L10 11.8 M8.2 10 L11.8 10" strokeWidth="1" />
      </g>
      {/* Right rotating reel */}
      <g style={{ transformOrigin: '14px 10px', animation: isPlaying ? 'spin-clockwise 3s linear infinite' : 'none' }}>
        <circle cx="14" cy="10" r="1.8" strokeWidth="1.2" />
        <path d="M14 8.2 L14 11.8 M12.2 10 L15.8 10" strokeWidth="1" />
      </g>
      {/* Small details: screw holes in corners */}
      <circle cx="3.5" cy="4.5" r="0.4" fill={color} stroke="none" opacity="0.6" />
      <circle cx="20.5" cy="4.5" r="0.4" fill={color} stroke="none" opacity="0.6" />
      <circle cx="3.5" cy="15.5" r="0.4" fill={color} stroke="none" opacity="0.6" />
      <circle cx="20.5" cy="15.5" r="0.4" fill={color} stroke="none" opacity="0.6" />
      {/* Tape rolls inside window */}
      <circle cx="10" cy="10" r="3" strokeWidth="0.8" strokeDasharray="1 1" opacity="0.45" />
      <circle cx="14" cy="10" r="2.8" strokeWidth="0.8" strokeDasharray="1 1" opacity="0.45" />
    </svg>
  );
};

const InlineAudioPlayer: React.FC<{ url: string; label: string; onDelete?: () => void }> = ({ url, label, onDelete }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(Math.round(audio.duration));
      }
    };
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    if (audio.duration && isFinite(audio.duration)) {
      setDuration(Math.round(audio.duration));
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [url]);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #2c2a29 0%, #1a1817 100%)',
      borderRadius: '16px',
      padding: '16px',
      width: '320px',
      border: '4px solid #0f0e0d',
      boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      fontFamily: 'monospace',
      color: '#fff',
      alignSelf: 'center',
      position: 'relative',
      userSelect: 'none'
    }}>
      <audio ref={audioRef} src={url} />
      
      {/* 4 Screws in corners */}
      <div style={{ position: 'absolute', top: '4px', left: '4px', width: '3px', height: '3px', borderRadius: '50%', background: '#64748b', opacity: 0.8 }} />
      <div style={{ position: 'absolute', top: '4px', right: '4px', width: '3px', height: '3px', borderRadius: '50%', background: '#64748b', opacity: 0.8 }} />
      <div style={{ position: 'absolute', bottom: '4px', left: '4px', width: '3px', height: '3px', borderRadius: '50%', background: '#64748b', opacity: 0.8 }} />
      <div style={{ position: 'absolute', bottom: '4px', right: '4px', width: '3px', height: '3px', borderRadius: '50%', background: '#64748b', opacity: 0.8 }} />

      {/* Cassette Top Notch/Details */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', gap: '10px', marginTop: '1px' }}>
        <div style={{ width: '8px', height: '2px', background: '#334155', borderRadius: '0.5px' }} />
        <div style={{ width: '18px', height: '2px', background: '#334155', borderRadius: '0.5px' }} />
        <div style={{ width: '8px', height: '2px', background: '#334155', borderRadius: '0.5px' }} />
      </div>

      {/* Sticker Label Area */}
      <div style={{
        background: 'linear-gradient(to bottom, #dbeafe 0%, #eff6ff 100%)',
        border: '2px solid #000',
        borderRadius: '6px',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        position: 'relative'
      }}>
        <div style={{ height: '3px', background: '#ef4444', width: '100%' }} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.62rem', color: '#1e3a8a', fontWeight: 900 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
            {label.toUpperCase()}
          </span>
          <span>{Math.round(currentTime)}s / {duration || '9'}s</span>
        </div>

        <div style={{
          background: '#000',
          borderRadius: '4px',
          height: '28px',
          margin: '4px 0',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '0 20px',
          position: 'relative'
        }}>
          <div 
            className={isPlaying ? 'spinning' : ''}
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: '#94a3b8',
              border: '3px dashed #334155',
              animation: isPlaying ? 'spin 4s linear infinite' : 'none'
            }} 
          />
          <div 
            className={isPlaying ? 'spinning' : ''}
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: '#94a3b8',
              border: '3px dashed #334155',
              animation: isPlaying ? 'spin 4s linear infinite' : 'none'
            }} 
          />
        </div>
      </div>

      {/* Control Buttons */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={() => togglePlay()}
          style={{
            background: '#d97706',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '0.72rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
              <rect x="5" y="5" width="4" height="14" rx="1" />
              <rect x="15" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
          <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
              setIsPlaying(false);
              setCurrentTime(0);
            }
          }}
          style={{
            background: '#475569',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '0.72rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
            <rect x="5" y="5" width="14" height="14" rx="1.5"/>
          </svg>
          <span>STOP</span>
        </button>

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            style={{
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>
            </svg>
            <span>LÖSCHEN</span>
          </button>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 640px) {
          .kpi-row-container {
            gap: 6px !important;
            padding: 0 4px !important;
          }
          .kpi-card {
            padding: 10px 8px !important;
            border-radius: 12px !important;
            min-height: auto !important;
          }
          .kpi-card-title {
            font-size: 0.55rem !important;
          }
          .kpi-card-value {
            font-size: 0.95rem !important;
          }
          .kpi-streak-footer {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 4px !important;
            margin-top: 6px !important;
          }
          .kpi-streak-footer span {
            font-size: 0.58rem !important;
          }
        }
      `}} />
    </div>
  );
};
