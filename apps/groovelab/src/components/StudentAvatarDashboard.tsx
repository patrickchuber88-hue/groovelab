import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Award, Lock, Smartphone, HelpCircle, Trophy, Sparkles, Star, 
  ChevronRight, Coffee, Clock, Flame, BookOpen, Share2, Play, 
  Pause, RotateCcw, Volume2, Moon, QrCode, X, EyeOff, Zap, Music, Library, Calendar, Check, Target, MessageSquare, Send,
  Pencil, User, Mail, Phone, MapPin, Activity, Camera, TrendingUp, Users, Shield, Search
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip } from 'recharts';

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
  campusFeedAnnouncements
}: MobileBriefingViewProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '4px' }}>
      
      {/* TOP WELCOME CARD */}
      <div style={{ background: '#ffffff', borderRadius: '24px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 900, margin: 0, color: '#1e293b', fontFamily: "'Urbanist', sans-serif" }}>
            Briefing
          </h2>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Music size={20} color="#0b57d0" strokeWidth={1.5} />
          </div>
        </div>
        <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.4, margin: '8px 0 0 0', fontWeight: 550 }}>
          Ein neuer Moment für Musik. Sichere dir deine tägliche Serie!
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

          return (
            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f5f3ff', color: '#7c3aed', padding: '6px 12px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 750 }}>
                <Calendar size={12} />
                <span>Unterricht: {hasToday ? `Heute, ${briefingData.todayLesson.time} Uhr` : (() => {
                  if(!nextOcc) return 'Demnächst';
                  const d = new Date(nextOcc.date);
                  return `${d.toLocaleDateString('de-DE', {weekday: 'short', day: '2-digit', month: '2-digit'})} - ${nextOcc.start_time?.substring(0,5)} Uhr`;
                })()}</span>
              </div>

              {teacherId && (
                <button 
                  onClick={() => {
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
                    background: '#dbeafe', 
                    color: '#1e40af', 
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <MessageSquare size={13} />
                </button>
              )}
            </div>
          );
        })() : (
          <div style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f5f3ff', color: '#7c3aed', padding: '6px 12px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 750 }}>
            <Calendar size={12} />
            <span>Unterricht: Demnächst</span>
          </div>
        )}
      </div>

      {/* RESPONSIVE GRID FOR KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
        {/* XP Kachel */}
        <div style={{ background: 'linear-gradient(135deg, #0b57d0 0%, #3b82f6 100%)', borderRadius: '20px', color: 'white', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 4px 12px rgba(11, 87, 208, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.03em' }}>XP</span>
            <Star size={15} fill="currentColor" />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: "'Urbanist', sans-serif" }}>{currentXp || 0} XP</span>
        </div>
        
        {/* Songs Kachel */}
        <div style={{ background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)', borderRadius: '20px', color: 'white', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Songs</span>
            <Award size={15} />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: "'Urbanist', sans-serif" }}>{wrappedData?.monthlyFlashback?.masteredSongsCount || 0} / 3</span>
        </div>

        {/* Fokus Kachel */}
        <div style={{ background: 'linear-gradient(135deg, #eab308 0%, #facc15 100%)', borderRadius: '20px', color: '#1f2937', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 4px 12px rgba(234, 179, 8, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Fokus</span>
            <Clock size={15} />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: "'Urbanist', sans-serif" }}>{wrappedData?.monthlyFlashback?.focusMinutes || 0} Min</span>
        </div>

        {/* Streak Kachel */}
        <div style={{ background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)', borderRadius: '20px', color: 'white', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Streak</span>
            <Flame size={15} />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: "'Urbanist', sans-serif" }}>{avatar?.streak_flame || 0} Tage</span>
        </div>
      </div>

      {/* RESPONSIVE PRACTICE HUB FOR MOBILE & TABLETS */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '20px',
        alignItems: 'stretch'
      }}>
        {/* Widget 1: Hausaufgaben */}
        <div style={{ background: '#ffffff', borderRadius: '24px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid rgba(0, 0, 0, 0.04)' }}>
          {(() => {
            const activeHWs = progressItems.filter(item => item.is_current_homework && !item.topic_name.startsWith('Hausaufgabe KW '));
            const currentWeek = getISOWeek();
            const activeTheories = progressItems.filter(item => 
              item.status === 'THEORY_DONE' && 
              item.updated_at && 
              getISOWeek(item.updated_at) === currentWeek &&
              !item.topic_name.startsWith('Hausaufgabe KW ')
            );
            const allActive = [...activeHWs, ...activeTheories];

            const getHomeworkNotes = (): string[] => {
              for (const item of progressItems) {
                if (item.homework_notes && item.homework_notes.trim()) {
                  try {
                    const raw = item.homework_notes;
                    if (raw.startsWith('[') && raw.endsWith(']')) {
                      const parsed = JSON.parse(raw);
                      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                    } else {
                      const lines = raw
                        .split('\n')
                        .filter((line: string) => !line.trim().startsWith('• 📖') && !line.trim().startsWith('• 🎵') && !line.trim().startsWith('• 🗑️'))
                        .map((l: string) => l.trim())
                        .filter(Boolean);
                      if (lines.length > 0) return lines;
                    }
                  } catch (e) {
                    console.error(e);
                  }
                }
              }
              return [];
            };
            const notesList = getHomeworkNotes();
            const totalItemsCount = allActive.length + notesList.length;

            if (totalItemsCount === 0) {
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookOpen size={16} color="#4f46e5" />
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
                  <BookOpen size={16} color="#4f46e5" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>Hausaufgaben ({totalItemsCount})</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
                  {Object.entries(groupedLehrwerke).map(([title, info]) => {
                    const pageNums = info.pages.map(p => p.num);
                    const formattedPages = formatPageNumbers(pageNums);
                    const combinedNotes = info.pages
                      .map(p => p.notes)
                      .filter(Boolean)
                      .filter(n => n !== 'Inhalte in der Premium-Version freischalten')
                      .join('; ');

                    return (
                      <div key={title} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          <span style={{ fontSize: '1rem', flexShrink: 0 }}>📖</span>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{title}</div>
                            <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 650, marginTop: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                              <strong>{formattedPages}</strong>
                              {combinedNotes ? ` • ${combinedNotes}` : ''}
                            </div>
                          </div>
                        </div>
                        <div style={{ background: '#dcfce7', color: '#16a34a', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
                          <div style={{ background: '#dcfce7', color: '#16a34a', borderRadius: '4px', padding: '2px 4px', flexShrink: 0 }}>
                            <Check size={10} strokeWidth={3} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {notesList.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                      {notesList.map((note: string, nIdx: number) => (
                        <div key={nIdx} style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 550, fontStyle: 'italic', background: '#f8fafc', padding: '8px 12px', borderRadius: '12px', borderLeft: '3px solid #3b82f6', lineHeight: '1.3', whiteSpace: 'pre-line' }}>
                          {note}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Widget 2: Tägliche Übezeit */}
        <div style={{ background: '#ffffff', borderRadius: '24px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px', border: '1px solid rgba(0, 0, 0, 0.04)' }}>
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

        {/* Widget 3: Flammen-Pfad */}
        <div style={{ background: '#ffffff', borderRadius: '24px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {(() => {
            const streak = avatar?.streak_flame || 0;
            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Flame size={16} color="#ea580c" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>Flammen-Pfad</span>
                  </div>
                  <div style={{ 
                    background: streak === 0 ? '#fee2e2' : '#ffedd5', 
                    color: streak === 0 ? '#ffffff' : '#ea580c', 
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
                    <div style={{ color: streak >= 3 ? '#eab308' : '#cbd5e1' }}><Flame size={16} fill={streak >= 3 ? 'currentColor' : 'none'} /></div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: streak >= 3 ? '#854d0e' : '#64748b' }}>Kleine</div>
                    <div style={{ fontSize: '0.55rem', color: '#94a3b8' }}>3 Min</div>
                  </div>
                  {/* Mittlere Flamme */}
                  <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', minHeight: '70px', textAlign: 'center', border: '1px solid rgba(0,0,0,0.02)' }}>
                    <div style={{ color: streak >= 6 ? '#f97316' : '#cbd5e1' }}><Flame size={16} fill={streak >= 6 ? 'currentColor' : 'none'} /></div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: streak >= 6 ? '#9a3412' : '#64748b' }}>Mittlere</div>
                    <div style={{ fontSize: '0.55rem', color: '#94a3b8' }}>5 Min</div>
                  </div>
                  {/* Helden-Feuer */}
                  <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', minHeight: '70px', textAlign: 'center', border: '1px solid rgba(0,0,0,0.02)' }}>
                    <div style={{ color: streak >= 9 ? '#ef4444' : '#cbd5e1' }}><Flame size={16} fill={streak >= 9 ? 'currentColor' : 'none'} /></div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: streak >= 9 ? '#991b1b' : '#64748b' }}>Helden</div>
                    <div style={{ fontSize: '0.55rem', color: '#94a3b8' }}>10 Min</div>
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
                        color: isJokerAvailable ? '#10b981' : '#ef4444', 
                        fontWeight: 800,
                        background: isJokerAvailable ? '#ecfdf5' : '#fef2f2',
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
      </div>

      {/* NÄCHSTE TERMINE TIMELINE */}
      <div style={{ background: '#ffffff', borderRadius: '24px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={16} color="#10b981" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Nächste Termine</h3>
          </div>
          <button onClick={() => handleTabChangeLocal('events')} style={{ background: 'transparent', border: 'none', color: '#10b981', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Alle</button>
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
                            background: 'rgba(255, 255, 255, 0.2)',
                            color: '#ffffff',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            flexShrink: 0
                          }}
                          onMouseOver={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'; }}
                          onMouseOut={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'; }}
                        >
                          <MessageSquare size={14} />
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
                            background: 'rgba(120, 53, 15, 0.12)',
                            color: '#78350f',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            flexShrink: 0
                          }}
                          onMouseOver={e => { e.currentTarget.style.background = 'rgba(120, 53, 15, 0.22)'; }}
                          onMouseOut={e => { e.currentTarget.style.background = 'rgba(120, 53, 15, 0.12)'; }}
                        >
                          <MessageSquare size={14} />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={occ.id} style={{ display: 'flex', gap: '16px', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                    <div style={{ width: '48px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', textAlign: 'center' }}>
                      <div style={{ background: '#10b981', color: 'white', fontSize: '0.6rem', fontWeight: 800, padding: '4px 0', textTransform: 'uppercase' }}>{d.toLocaleDateString('de-DE', {month: 'short'})}</div>
                      <div style={{ background: 'white', color: '#1e293b', fontSize: '1.2rem', fontWeight: 900, padding: '6px 0' }}>{d.toLocaleDateString('de-DE', {day: '2-digit'})}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{d.toLocaleDateString('de-DE', {weekday: 'long'})}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{occ.start_time?.substring(0,5)} <span style={{ color: '#22c55e' }}>{occ.schedule?.rooms?.name || 'Groovelab'}</span></div>
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
                        background: '#f1f5f9',
                        color: '#475569',
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
                        e.currentTarget.style.background = '#e2e8f0';
                        e.currentTarget.style.color = '#0b57d0';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.background = '#f1f5f9';
                        e.currentTarget.style.color = '#475569';
                      }}
                    >
                      <MessageSquare size={14} />
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
          <div style={{ background: '#ffffff', borderRadius: '24px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '2px dashed #f59e0b' }}>
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
                  cardBg = '#ecfdf5';
                  cardBorder = '#a7f3d0';
                  badgeText = '❇️ Wieder regulär';
                  badgeColor = '#065f46';
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
                    </div>
                    
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      {isReschedule ? (
                        <>
                          <button 
                            onClick={() => handleRejectReschedule(occ)}
                            style={{ background: '#ef4444', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Nein
                          </button>
                          <button 
                            onClick={() => handleConfirmReschedule(occ.id)}
                            style={{ background: '#eab308', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Ja
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => handleAcknowledgeCancellation(occ.id)}
                          style={{ background: isRegularReset ? '#10b981' : '#ef4444', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Sparkles size={18} color="#eab308" />
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Campus Feed</h3>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {campusFeedAnnouncements.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px 0', textAlign: 'center', opacity: 0.6 }}>
              <Sparkles size={24} color="#94a3b8" style={{ strokeWidth: 1.5 }} />
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                Keine aktuellen Campus-Mitteilungen vorhanden.
              </span>
            </div>
          ) : (
            campusFeedAnnouncements.slice(0, 5).map((item, idx, arr) => {
              return (
                <div key={item.id} style={{
                  paddingBottom: idx === arr.length - 1 ? '0' : '16px',
                  borderBottom: idx === arr.length - 1 ? 'none' : '1px solid #f1f5f9',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}

export function StudentAvatarDashboard({ studentId, parentActiveTab, onTabChange, onProfileUpdate }: StudentAvatarDashboardProps) {
  const [studentUser, setStudentUser] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [studentSchedules, setStudentSchedules] = useState<any[]>([]);

  const [isAppUser, setIsAppUser] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [timeUntilMidnight, setTimeUntilMidnight] = useState('');

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
  const [briefingData, setBriefingData] = useState<any>(null);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [scheduleOccurrences, setScheduleOccurrences] = useState<any[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [schoolYearOccurrences, setSchoolYearOccurrences] = useState<any[]>([]);
  const [loadingSchoolYearSchedule, setLoadingSchoolYearSchedule] = useState(false);
  const [appointmentFilter, setAppointmentFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');

  // Direct Chat states inside appointment popup (Shoutbox)
  const [showAppointmentChat, setShowAppointmentChat] = useState(false);
  const [appointmentChatData, setAppointmentChatData] = useState<{ teacherId: string; date: string; start_time: string; label: string; occurrenceId?: string } | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatTypedMessage, setChatTypedMessage] = useState('');
  const [campusFeedAnnouncements, setCampusFeedAnnouncements] = useState<any[]>([]);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  // Übe-Ziel (Class Goal) State
  const [classGoals, setClassGoals] = useState<any[]>([]);
  const [classWeeklyMins, setClassWeeklyMins] = useState(0);

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
        setScheduleOccurrences(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSchedule(false);
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
          let current = new Date(schoolYearStart);
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

      setSchoolYearOccurrences(allMergedOccurrences);
    } catch (err) {
      console.error('Error fetching school year schedule:', err);
    } finally {
      setLoadingSchoolYearSchedule(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
    fetchSchoolYearSchedule();

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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId]);

  const handleConfirmReschedule = async (occId: string) => {
    try {
      const { error } = await supabase
        .from('schedule_occurrences')
        .update({ status: 'rescheduled_confirmed', student_acknowledged: true })
        .eq('id', occId);
      if (error) throw error;
      fetchSchedule();
    } catch (err) {
      console.error('Error confirming reschedule:', err);
    }
  };

  const handleAcknowledgeCancellation = async (occId: string) => {
    try {
      const { error } = await supabase
        .from('schedule_occurrences')
        .update({ student_acknowledged: true })
        .eq('id', occId);
      if (error) throw error;
      fetchSchedule();
    } catch (err) {
      console.error('Error acknowledging cancellation:', err);
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
            status: 'canceled_by_student',
            student_acknowledged: true
          });
        if (insertErr) throw insertErr;
      } else {
        const { error: updateErr } = await supabase
          .from('schedule_occurrences')
          .update({ status: 'canceled_by_student', student_acknowledged: true })
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
        school_id: occ.schedule?.school_id || null,
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
        school_id: occ.schedule?.school_id || null,
        teacher_id: occ.teacher_id,
        type: 'Verschiebung abgelehnt',
        message: `❌ ${studentName} hat den Verschiebungstermin am ${formattedDate} abgelehnt. Der Termin wurde auf den Originaltermin zurückgesetzt und für diese Woche abgesagt.`
      });

      fetchSchedule();
    } catch (err) {
      console.error('Error rejecting reschedule:', err);
    }
  };
  
  const [activeTab, setActiveTab] = useState<string>(() => {
    let initial = parentActiveTab;
    if (initial === 'mediathek') initial = 'songs';
    if (initial === 'termine' || initial === 'all_appointments') initial = 'events';
    return (initial as any) || 'briefing';
  });

  useEffect(() => {
    if (parentActiveTab) {
      let mapped = parentActiveTab;
      if (mapped === 'mediathek') mapped = 'songs';
      if (mapped === 'termine' || mapped === 'all_appointments') mapped = 'events';
      if (['briefing', 'hero', 'songs', 'practice_board', 'campus_cup', 'events', 'profile'].includes(mapped)) {
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

    const currentWeek = getISOWeek(new Date());
    const lastJokerWeek = studentUser?.joker_used_at ? getISOWeek(new Date(studentUser.joker_used_at)) : null;
    const isJokerAvailable = !studentUser?.joker_used_at || lastJokerWeek !== currentWeek;

    if (!isJokerAvailable) return;

    let firstMissedDayGroup: any = null;
    for (let i = groupedList.length - 1; i >= 0; i--) {
      const group = groupedList[i];
      if (group.isPlaceholder && !group.isToday) {
        const parts = group.date.split('.');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = 2000 + parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        
        if (getISOWeek(d) === currentWeek) {
          firstMissedDayGroup = group;
          break;
        }
      }
    }

    if (firstMissedDayGroup) {
      console.log('Automatically applying joker to save streak for date:', firstMissedDayGroup.date);
      try {
        const parts = firstMissedDayGroup.date.split('.');
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

  const [fokusLogs, setFokusLogs] = useState<any[]>([]);
  const [isExtraTime, setIsExtraTime] = useState(false);
  const [hasCompletedTargetToday, setHasCompletedTargetToday] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'logbook' | 'stats'>('logbook');

  const getTargetMinutes = (streak: number) => {
    if (streak >= 9) return 10;
    if (streak >= 6) return 5;
    return 3;
  };

  const getFlameLevelName = (streak: number) => {
    if (streak >= 9) return 'Helden-Feuer';
    if (streak >= 6) return 'Mittlere Flamme';
    return 'Kleine Flamme';
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
        flameLevel: getFlameLevelName(avatar?.streak_flame || 0),
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

  useEffect(() => {
    fetchStudentAndAvatar();
  }, [studentId]);

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
  const [songSearch, setSongSearch] = useState('');
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

  const fetchStudentProgress = async () => {
    setProgressLoading(true);
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
      alert("Stripe Checkout wird geladen... (Simulation: Upgrade auf Premium erfolgt jetzt)");
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
  }, [studentId, activeTab]);

  useEffect(() => {
    if (!studentUser?.school_id) return;

    const channel = supabase
      .channel('realtime_student_class_focus_logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fokus_logs' }, () => {
        fetchClassHighlights(studentUser.school_id, studentUser.teacher_id);
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
      return;
    }

    const streak = avatar?.streak_flame || 0;
    const targetSeconds = getTargetMinutes(streak) * 60;

    // Timer interval
    const interval = setInterval(() => {
      if (isPhoneFlat) {
        setSecondsElapsed(prev => {
          const nextVal = prev + 1;
          if (!isExtraTime && nextVal >= targetSeconds) {
            setIsExtraTime(true);
            playSuccessChime();
          }
          return nextVal;
        });
      } else {
        if (!isExtraTime) {
          // Hard fall to 0 if orientation lost and not in extra time!
          setSecondsElapsed(0);
        }
      }
    }, 1000);

    // Orientation event handler
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const beta = e.beta || 0;
      const gamma = e.gamma || 0;

      // Phone is flat if beta and gamma are near 0 or 180 (within 15 deg threshold)
      const flat = (Math.abs(beta) < 15 && Math.abs(gamma) < 15) || 
                   (Math.abs(Math.abs(beta) - 180) < 15 && Math.abs(gamma) < 15);

      if (flat) {
        if (!isPhoneFlat) {
          setIsPhoneFlat(true);
        }
      } else {
        if (isPhoneFlat) {
          setIsPhoneFlat(false);
          if (!isExtraTime) {
            // Hard reset warning sound
            playBeep(440, 400); 
            if (navigator.vibrate) {
              navigator.vibrate([300, 100, 300]);
            }
          } else {
            // Soft pause warning sound
            playBeep(880, 200);
            if (navigator.vibrate) {
              navigator.vibrate([100, 50, 100]);
            }
          }
        }
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      clearInterval(interval);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [sessionActive, isPhoneFlat, isExtraTime, avatar?.streak_flame]);

  const finishPracticeSession = async () => {
    setSessionActive(false);
    if (secondsElapsed <= 0) {
      alert("Du hast noch nicht genug geübt, um die Session zu beenden. 🎸");
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

      if (hasCompletedTargetToday) {
        // Entire session is extra time
        extraSeconds = secondsElapsed;
      } else {
        if (secondsElapsed >= targetSeconds) {
          focusSeconds = targetSeconds;
          extraSeconds = secondsElapsed - targetSeconds;
        } else {
          focusSeconds = secondsElapsed;
        }
      }

      // Convert to minutes (at least 1 if we have seconds, or rounded)
      const focusMinutes = focusSeconds > 0 ? Math.max(1, Math.round(focusSeconds / 60)) : 0;
      const extraMinutes = extraSeconds > 0 ? Math.round(extraSeconds / 60) : 0;
      const totalMinutes = Math.max(1, Math.round(secondsElapsed / 60));

      let totalFocus = totalMinutes;
      let monthlyFocus = totalMinutes;
      let currentXp = totalMinutes * 10;
      let streakFlame = streak;
      let lastPracticeDate = null;

      if (stats) {
        totalFocus = (stats.total_focus_minutes || 0) + totalMinutes;
        monthlyFocus = (stats.monthly_focus_minutes || 0) + totalMinutes;
        currentXp = (stats.current_xp || 0) + (totalMinutes * 10);
        streakFlame = stats.streak_flame || 0;
        lastPracticeDate = stats.last_practice_date ? String(stats.last_practice_date) : null;
      }

      // Check if this session completed the target or if target was already completed today
      const sessionCompletedTarget = !hasCompletedTargetToday && (secondsElapsed >= targetSeconds);
      let usedJokerThisSession = false;
      
      if (sessionCompletedTarget) {
        if (lastPracticeDate === yesterdayStr) {
          streakFlame += 1;
        } else if (lastPracticeDate === todayStr) {
          // Keep same streak
        } else {
          // Check if we can use a joker (1 per week)
          const currentWeek = getISOWeek(new Date());
          const lastJokerWeek = studentUser?.joker_used_at ? getISOWeek(new Date(studentUser.joker_used_at)) : null;
          const isJokerAvailable = !studentUser?.joker_used_at || lastJokerWeek !== currentWeek;

          if (lastPracticeDate === dayBeforeYesterdayStr && isJokerAvailable) {
            streakFlame = streak + 1; // Preserve streak and add today's practice
            usedJokerThisSession = true;
          } else {
            streakFlame = 1;
          }
        }
      }

      // 1. Save focus log for focus time
      if (focusSeconds > 0) {
        await supabase.from('fokus_logs').insert({
          user_id: studentId,
          duration_minutes: focusMinutes,
          duration_seconds: focusSeconds,
          is_extra: false,
          flame_level: flameLevelName,
          created_at: new Date().toISOString()
        });
      }

      // 2. Save focus log for extra time
      if (extraSeconds > 0) {
        await supabase.from('fokus_logs').insert({
          user_id: studentId,
          duration_minutes: extraMinutes,
          duration_seconds: extraSeconds,
          is_extra: true,
          flame_level: flameLevelName,
          created_at: new Date().toISOString()
        });
      }

      // 3. Upsert stats
      await supabase.from('student_stats').upsert({
        student_id: studentId,
        total_focus_minutes: totalFocus,
        monthly_focus_minutes: monthlyFocus,
        streak_flame: streakFlame,
        last_practice_date: todayStr,
        current_xp: currentXp,
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

      let successMsg = `Klasse geübt! Du hast +${totalMinutes * 10} XP erhalten! ⚡`;
      if (sessionCompletedTarget) {
        if (usedJokerThisSession) {
          successMsg += ` 🎯 Dein wöchentlicher Joker wurde eingesetzt, um deinen Streak von ${streak} Tagen zu retten! Dein Streak liegt jetzt bei ${streakFlame} Flammen! 🔥`;
        } else {
          successMsg += ` Du hast die tägliche Fokuszeit gemeistert! Dein Streak ist bei ${streakFlame} Flammen! 🔥`;
        }
      }
      alert(successMsg);

      setSecondsElapsed(0);
      setIsExtraTime(false);
      fetchStudentAndAvatar();
      fetchStudentProgress();

    } catch (err: any) {
      console.error('Error finishing session:', err);
      alert('Fehler beim Beenden der Session.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: editingProfile.first_name,
          last_name: editingProfile.last_name,
          email: editingProfile.email,
          phone: editingProfile.phone,
          instrument: editingProfile.instrument,
          photo_url: editingProfile.photo_url
        })
        .eq('id', studentId);
      
      if (error) throw error;
      
      // Update local state
      setStudentUser((prev: any) => prev ? { ...prev, ...editingProfile } : null);
      
      // Call parent update if exists
      if (onProfileUpdate) {
        onProfileUpdate({
          first_name: editingProfile.first_name,
          last_name: editingProfile.last_name,
          email: editingProfile.email,
          phone: editingProfile.phone,
          instrument: editingProfile.instrument,
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

  const fetchClassHighlights = async (schoolId: string, teacherId?: string | null) => {
    if (!schoolId) return;
    setHighlightsLoading(true);
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

      const { data: focusLogs } = await supabase
        .from('fokus_logs')
        .select('user_id, duration_minutes, created_at')
        .in('user_id', studentIds)
        .gte('created_at', annualStartDate.toISOString());

      setClassFocusLogs(focusLogs || []);

      // 3. Fetch mastered song skills for this month for these students
      const { data: skills } = await supabase
        .from('user_song_skills')
        .select('user_id, progress_percent, instrument, is_stage_ready, last_practiced_at, songs(title)')
        .in('user_id', studentIds)
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
    } catch (err) {
      console.error('Error fetching class highlights for student:', err);
    } finally {
      setHighlightsLoading(false);
    }
  };

  const fetchStudentAndAvatar = async () => {
    try {
      setLoading(true);
      setBriefingLoading(true);
      setError(null);

      // 1. Fetch student user profile with premium state
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('*, schools(*)')
        .eq('id', studentId)
        .single();

      if (userErr) throw userErr;
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
      setIsAppUser(user.is_app_user ?? false);
      setIsPremiumUser(user.is_premium_user ?? false);

      // 2. Fetch avatar records
      const { data: avatarRecord, error: avatarErr } = await supabase
        .from('avatars')
        .select('avatar_style, instrument_type, evolution_level, xp, asset_path, streak_flame')
        .eq('user_id', studentId)
        .maybeSingle();

      if (avatarErr) throw avatarErr;

      if (!avatarRecord && user.is_app_user) {
        setShowSelector(true);
      } else {
        setAvatar(avatarRecord);
      }

      // Fetch student stats for Campus Cup
      const { data: statsData } = await supabase
        .from('student_stats')
        .select('monthly_focus_minutes, total_focus_minutes')
        .eq('student_id', studentId)
        .maybeSingle();
      setMonthlyFocusMinutes(statsData?.monthly_focus_minutes || 0);
      setTotalFocusMinutes(statsData?.total_focus_minutes || 0);

      if (user.school_id) {
        fetchClassHighlights(user.school_id, user.teacher_id);
      }

      // Fetch announcements matching student's school_id
      try {
        const { data: annData, error: annErr } = await supabase
          .from('campus_announcements')
          .select('*, users(first_name, last_name, photo_url)')
          .eq('school_id', user.school_id)
          .order('created_at', { ascending: false });

        if (!annErr && annData) {
          const parsed = annData.map(ann => ({
            id: ann.id,
            title: ann.title,
            content: ann.message,
            target_type: ann.target_type || 'all',
            created_at: ann.created_at,
            user: ann.users
          }));
          setCampusFeedAnnouncements(parsed.filter(ann => ann.target_type === 'all' || ann.target_type === 'students'));
        } else {
          setCampusFeedAnnouncements([]);
        }
      } catch (aErr) {
        console.error('Error fetching student announcements:', aErr);
      }

      // 3. Fetch daily briefing
      try {
        const resp = await fetch(`/api/briefing/student?userId=${studentId}`);
        if (resp.ok) {
          const bd = await resp.json();
          if (bd && bd.success) {
            setBriefingData(bd);
          }
        } else {
          throw new Error('API offline');
        }
      } catch (e) {
        // Fallback local query
        try {
          const schoolId = user.school_id || (user as any).school_id;
          let currentSchoolId = schoolId;

          if (!currentSchoolId) {
            const { data: userWithSchool } = await supabase
              .from('users')
              .select('school_id')
              .eq('id', studentId)
              .single();
            currentSchoolId = userWithSchool?.school_id;
          }

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

            setBriefingData({
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
      } finally {
        setBriefingLoading(false);
      }

      // 4. Fetch Übe-Ziele (class practice goals from teacher's school opening_hours)
      try {
        const teacherId = user.teacher_id;
        const schoolId = user.school_id;
        if (teacherId && schoolId) {
          // Load teacher's goals from school opening_hours
          const { data: schoolData } = await supabase
            .from('schools')
            .select('opening_hours')
            .eq('id', schoolId)
            .single();

          const rawTargets = schoolData?.opening_hours?.weekly_targets?.[teacherId];
          let goals: any[] = [];
          if (Array.isArray(rawTargets)) {
            goals = rawTargets;
          } else if (typeof rawTargets === 'number') {
            goals = [{ id: 'default', title: 'Klassenziel', minutes: rawTargets, deadline: '' }];
          }
          setClassGoals(goals);

          // Calculate this student class's weekly practice minutes
          // Get all students of this teacher for current week
          if (goals.length > 0) {
            const now = new Date();
            const monday = new Date(now);
            const day = now.getDay();
            const diff = day === 0 ? -6 : 1 - day;
            monday.setDate(now.getDate() + diff);
            monday.setHours(0, 0, 0, 0);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);

            // Get all students of same teacher
            const { data: classmates } = await supabase
              .from('users')
              .select('id')
              .eq('teacher_id', teacherId)
              .eq('school_id', schoolId);

            if (classmates && classmates.length > 0) {
              const classmateIds = classmates.map((c: any) => c.id);
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
        }
      } catch (goalErr) {
        console.warn('Could not load class goals:', goalErr);
      }

      try {
        const { data: missionData } = await supabase
          .from('student_missions')
          .select('*, mission_templates(*)')
          .eq('student_id', studentId)
          .maybeSingle();

        setStudentMissionProgress(missionData);

        const { data: pinsData } = await supabase
          .from('one_time_upload_pins')
          .select('*')
          .eq('student_id', studentId);
        
        setStudentPins(pinsData || []);
      } catch (err) {
        console.warn('Failed to load student missions progress:', err);
      }
    } catch (err: any) {
      console.error('Error loading student avatar:', err);
      setError('Fehler beim Laden des Profils.');
      setBriefingLoading(false);
    } finally {
      fetchFokusLogs();
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
      const { data: matchedPins, error: pinErr } = await supabase
        .from('one_time_upload_pins')
        .select('*')
        .eq('student_id', studentId)
        .eq('pin_code', pinInput.trim())
        .eq('is_used', false);
      
      if (pinErr || !matchedPins || matchedPins.length === 0) {
        alert('Ungültige oder bereits verwendete PIN!');
        setIsUploadingCustomAvatar(false);
        return;
      }

      const activePin = matchedPins[0];

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

      await supabase
        .from('users')
        .update({ photo_url: finalPublicUrl })
        .eq('id', studentId);
      
      await supabase
        .from('one_time_upload_pins')
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq('id', activePin.id);

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
        const newXp = (avatar?.xp || 0) + 100;
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Lade Helden-Profil...</p>
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
                <span className="text-3xl bg-slate-900 p-2.5 rounded-xl group-hover:scale-110 transition-transform">{hc.icon}</span>
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

  if (!avatar) return null;

  const currentLevel = avatar.evolution_level || 1;
  const currentXp = avatar.xp || 0;
  const levelTitle = LEVEL_NAMES[avatar.instrument_type]?.[currentLevel] || `Stufe ${currentLevel}`;

  // XP calculation
  let nextThreshold = 100;
  let prevThreshold = 0;
  if (currentLevel === 2) {
    prevThreshold = 100;
    nextThreshold = 300;
  } else if (currentLevel === 3) {
    prevThreshold = 300;
    nextThreshold = 9999;
  }

  const xpInCurrentLevel = Math.max(0, currentXp - prevThreshold);
  const totalXpInLevel = nextThreshold - prevThreshold;
  const xpPercentage = currentLevel === 3 ? 100 : Math.min(100, (xpInCurrentLevel / totalXpInLevel) * 100);

  // Circular progress calculations for fit style ring
  const circleRadius = 70;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference - (xpPercentage / 100) * circleCircumference;

  return (
    <div style={{ fontFamily: '"Outfit", "Inter", sans-serif', maxWidth: '100%', margin: '0 auto', width: '100%', paddingTop: '24px' }}>
      
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

      {activeTab === 'practice_board' && (
        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }} className="animation-slide-up">
          
          {/* Left Pane (2/3 width) - KPIs and Fokus-Timer */}
          <div style={{ flex: '2 1 500px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* KPI Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '14px' }}>
              
              {/* Card 1: XP */}
              <div style={{ 
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', 
                borderRadius: '20px', 
                color: 'white', 
                padding: '16px', 
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gesammelte XP</span>
                  <Star size={16} fill="currentColor" />
                </div>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: "'Urbanist', sans-serif" }}>{avatar?.xp || 0} XP</span>
              </div>

              {/* Card 2: Practice Minutes */}
              <div style={{ 
                background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', 
                borderRadius: '20px', 
                color: 'white', 
                padding: '16px', 
                boxShadow: '0 4px 15px rgba(4, 120, 87, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Übeminuten</span>
                  <Clock size={16} />
                </div>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: "'Urbanist', sans-serif" }}>{totalFocusMinutes || 0} Min.</span>
              </div>

              {/* Card 3: Focus Time Today */}
              <div style={{ 
                background: 'linear-gradient(135deg, #eab308 0%, #a16207 100%)', 
                borderRadius: '20px', 
                color: 'white', 
                padding: '16px', 
                boxShadow: '0 4px 15px rgba(161, 98, 7, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fokus Heute</span>
                  <Activity size={16} />
                </div>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: "'Urbanist', sans-serif" }}>{(() => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const todayLogs = fokusLogs.filter(log => log.created_at && log.created_at.startsWith(todayStr));
                  const totalSecs = todayLogs.reduce((sum, log) => sum + (log.duration_seconds || ((log.duration_minutes || 0) * 60)), 0);
                  const finalSecs = totalSecs + (sessionActive ? secondsElapsed : 0);
                  const m = Math.floor(finalSecs / 60);
                  const s = finalSecs % 60;
                  return `${m}:${String(s).padStart(2, '0')} Min`;
                })()}</span>
              </div>

              {/* Card 4: Streak-Pfad & Joker */}
              <div style={{ 
                background: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)', 
                borderRadius: '20px', 
                color: 'white', 
                padding: '16px', 
                boxShadow: '0 4px 15px rgba(194, 65, 12, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '100px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Streak-Pfad</span>
                  <Flame size={16} fill="currentColor" />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: "'Urbanist', sans-serif", lineHeight: 1.1 }}>
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

            </div>

            {/* Fokus-Timer Box */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '24px',
              padding: '30px 24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.01)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              alignItems: 'center',
              position: 'relative'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
                <div style={{ background: '#eff6ff', color: '#3b82f6', padding: '8px', borderRadius: '12px' }}>
                  <Clock size={18} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 850, fontSize: '22px', color: '#1e293b', margin: 0 }}>Fokus-Timer</h4>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {isExtraTime ? (
                      <>
                        <Award size={13} style={{ color: '#eab308', flexShrink: 0 }} />
                        <span>Du bist in der Extra-Zeit!</span>
                      </>
                    ) : (
                      <>
                        <Smartphone size={13} style={{ color: '#3b82f6', flexShrink: 0 }} />
                        <span>Handy flach hinlegen & Fokus halten</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {!sessionActive ? (
                /* Timer setup before starting */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '350px', width: '100%', alignItems: 'center' }}>
                  
                  {/* Circular visual timer representation (static state) */}
                  <div style={{ position: 'relative', width: '200px', height: '200px', margin: '10px 0' }}>
                    <svg width="200" height="200" viewBox="0 0 200 200">
                      <circle cx="100" cy="100" r="85" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                      <circle 
                        cx="100" 
                        cy="100" 
                        r="85" 
                        fill="none" 
                        stroke="#3b82f6" 
                        strokeWidth="12" 
                        strokeDasharray={2 * Math.PI * 85}
                        strokeDashoffset={2 * Math.PI * 85}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{ fontSize: '2.4rem', fontWeight: 900, color: '#1e293b' }}>
                        {String(getTargetMinutes(avatar?.streak_flame || 0)).padStart(2, '0')}:00
                      </span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>Ziel Fokuszeit</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: '16px', width: '100%', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Tages-Herausforderung</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1e293b', marginTop: '3px' }}>
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
                        }
                      }
                      
                      // Auto-select topic if none selected
                      setSelectedTopic('Allgemeines Üben');
                      setSecondsElapsed(0);
                      setIsPhoneFlat(false);
                      setIsExtraTime(hasCompletedTargetToday);
                      setSessionActive(true);
                    }}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '16px',
                      borderRadius: '16px',
                      fontWeight: 900,
                      fontSize: '0.92rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(59, 130, 246, 0.25)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                    className="hover-scale"
                  >
                    🚀 Fokus starten
                  </button>
                </div>
              ) : (
                /* Timer running / Gyro orientation dashboard */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', alignItems: 'center' }}>
                  
                  {/* Circular animated SVG progress ring */}
                  <div style={{ position: 'relative', width: '200px', height: '200px', filter: isExtraTime ? 'drop-shadow(0 0 10px rgba(16, 185, 129, 0.2))' : 'none' }}>
                    <svg width="200" height="200" viewBox="0 0 200 200">
                      <circle cx="100" cy="100" r="85" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                      <circle 
                        cx="100" 
                        cy="100" 
                        r="85" 
                        fill="none" 
                        stroke={isExtraTime ? '#10b981' : (isPhoneFlat ? '#3b82f6' : '#ef4444')} 
                        strokeWidth="12" 
                        strokeDasharray={2 * Math.PI * 85}
                        strokeDashoffset={
                          isExtraTime 
                            ? 0 // Full circle in extra time
                            : 2 * Math.PI * 85 - (2 * Math.PI * 85 * Math.min(1, secondsElapsed / (getTargetMinutes(avatar?.streak_flame || 0) * 60)))
                        }
                        strokeLinecap="round"
                        transform="rotate(-90 100 100)"
                        style={{ transition: isPhoneFlat ? 'stroke-dashoffset 1s linear, stroke 0.3s' : 'stroke 0.3s' }}
                      />
                    </svg>
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{ fontSize: '2.6rem', fontWeight: 950, color: '#0f172a', fontFamily: 'monospace' }}>
                        {String(Math.floor(secondsElapsed / 60)).padStart(2, '0')}:
                        {String(secondsElapsed % 60).padStart(2, '0')}
                      </span>
                      <span style={{ 
                        fontSize: '0.65rem', 
                        fontWeight: 900, 
                        color: isExtraTime ? '#10b981' : (isPhoneFlat ? '#3b82f6' : '#ef4444'), 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.05em', 
                        marginTop: '4px' 
                      }}>
                        {isExtraTime ? 'Extra-Zeit active 🚀' : (isPhoneFlat ? 'Üben Aktiv' : 'Unterbrochen')}
                      </span>
                    </div>
                  </div>

                  {/* Gyro Sensor feedback */}
                  <div style={{
                    width: '100%',
                    maxWidth: '450px',
                    padding: '16px 20px',
                    borderRadius: '16px',
                    background: isPhoneFlat ? '#ecfdf5' : '#fef2f2',
                    border: isPhoneFlat ? '1.5px solid #a7f3d0' : '1.5px solid #fca5a5',
                    color: isPhoneFlat ? '#065f46' : '#991b1b',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    textAlign: 'center',
                    lineHeight: 1.4
                  }}>
                    {isPhoneFlat ? (
                      <div>
                        <strong>Perfekte Lage! 📱</strong>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', opacity: 0.9 }}>Das Handy liegt flach auf dem Display. Der Timer läuft im Hintergrund.</p>
                      </div>
                    ) : (
                      <div className={isExtraTime ? '' : 'animate-pulse'}>
                        <strong>{isExtraTime ? '⏸️ Session pausiert' : '🚨 Fokus unterbrochen!'}</strong>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', opacity: 0.9 }}>
                          {isExtraTime 
                            ? 'Lege das Handy flach hin, um weiter Extra-Minuten zu sammeln.' 
                            : 'Lege das Handy flach hin! Sonst fällt dein Timer sofort auf 0 zurück.'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Fullscreen AMOLED Black Screen Overlay when Flat */}
                  {sessionActive && isPhoneFlat && (
                    <div 
                      style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        background: '#000000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#1c1917',
                        userSelect: 'none'
                      }}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#292524', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                          {isExtraTime ? '🔥 Extra-Zeit läuft...' : '⚡ Fokus aktiv...'}
                        </div>
                        <div style={{ fontSize: '1.4rem', color: '#1c1917', marginTop: '10px', fontWeight: 800 }}>
                          {String(Math.floor(secondsElapsed / 60)).padStart(2, '0')}:{String(secondsElapsed % 60).padStart(2, '0')}
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '350px' }}>
                    <button
                      onClick={finishPracticeSession}
                      style={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '14px',
                        borderRadius: '14px',
                        fontWeight: 900,
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        boxShadow: '0 4px 12px rgba(16,185,129,0.15)',
                        textTransform: 'uppercase'
                      }}
                    >
                      🏁 Beenden
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Möchtest du diese Session wirklich abbrechen? Der Fortschritt geht verloren.')) {
                          setSessionActive(false);
                          setIsExtraTime(false);
                        }
                      }}
                      style={{
                        padding: '14px',
                        borderRadius: '14px',
                        border: '1.5px solid #fca5a5',
                        background: '#fef2f2',
                        color: '#ef4444',
                        fontWeight: 800,
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
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
                  background: sidebarTab === 'logbook' ? '#fff7ed' : '#ecfdf5', 
                  color: sidebarTab === 'logbook' ? '#ea580c' : '#10b981', 
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
                            bg = 'linear-gradient(135deg, #f0fdf4 0%, #e6fbf0 100%)';
                            border = '1px solid #dcfce7';
                            labelColor = '#166534';
                            textColor = '#15803d';
                            numColor = '#166534';
                            shadow = '0 2px 6px rgba(22, 163, 74, 0.04)';
                          } else if (minutes <= 60) {
                            // Level 2: soft green
                            bg = 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)';
                            border = '1px solid #bbf7d0';
                            labelColor = '#14532d';
                            textColor = '#166534';
                            numColor = '#14532d';
                            shadow = '0 3px 8px rgba(22, 163, 74, 0.07)';
                          } else if (minutes <= 180) {
                            // Level 3: medium green
                            bg = 'linear-gradient(135deg, #bbf7d0 0%, #86efac 100%)';
                            border = '1px solid #86efac';
                            labelColor = '#14532d';
                            textColor = '#14532d';
                            numColor = '#14532d';
                            shadow = '0 4px 12px rgba(22, 163, 74, 0.12)';
                          } else {
                            // Level 4 (Master): Solid emerald jewel
                            bg = 'linear-gradient(135deg, #10b981 0%, #047857 100%)';
                            border = '1px solid #059669';
                            labelColor = 'rgba(255, 255, 255, 0.8)';
                            textColor = 'rgba(255, 255, 255, 0.9)';
                            numColor = '#ffffff';
                            shadow = '0 6px 15px rgba(16, 185, 129, 0.25)';
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
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e6fbf0', border: '1px solid #dcfce7' }} /> &lt;15m
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#bbf7d0', border: '1px solid #bbf7d0' }} /> &lt;1h
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#86efac', border: '1px solid #86efac' }} /> &lt;3h
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} /> 3h+
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              /* List entries */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '480px', overflowY: 'auto', paddingRight: '4px' }} className="animation-fade-in">
                {(() => {
                  const grouped = getGroupedLogs();
                  if (grouped.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic', padding: '40px 10px' }}>
                        Noch keine Einträge im Log-Buch vorhanden. Starte deine erste Fokus-Session! 🚀
                      </div>
                    );
                  }

                  return grouped.map((group, idx) => {
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
                      if (flame === 'Helden-Feuer') return 10 * 60;
                      if (flame === 'Mittlere Flamme') return 5 * 60;
                      return 3 * 60;
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
                      borderLeftColor = '#10b981'; // Green (Mastered)
                    } else if (isJokerDay) {
                      borderLeftColor = '#f97d13'; // Golden-Orange (Joker Day)
                    } else if (isToday) {
                      borderLeftColor = '#eab308'; // Yellow (Active)
                    } else {
                      borderLeftColor = '#ef4444'; // Red (Not practiced / target not reached)
                    }

                    if (group.isPlaceholder) {
                      if (isToday) {
                        return (
                          <div 
                            key={idx}
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
                            key={idx}
                            style={{ 
                              background: 'linear-gradient(135deg, #f97d13 0%, #d96a06 100%)', 
                              border: '1px solid #d96a06', 
                              borderRadius: '16px', 
                              padding: '12px 14px',
                              display: 'flex',
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '12px',
                              boxShadow: '0 4px 12px rgba(249, 125, 19, 0.12)'
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
                              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#fef3c7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                - Streak gerettet! 🎯
                              </span>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                              <Flame size={iconSize} fill="#ffffff" color="#ffffff" />
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
                            key={idx}
                            style={{ 
                              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.03) 0%, rgba(239, 68, 68, 0.01) 100%)', 
                              border: '1px dashed rgba(239, 68, 68, 0.25)', 
                              borderRadius: '16px', 
                              padding: '12px 14px',
                              display: 'flex',
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '12px',
                              borderLeft: `4px solid ${borderLeftColor}`,
                              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.01)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#ef4444', fontFamily: 'monospace' }}>
                                {group.date}
                              </span>
                              <span style={{ 
                                fontSize: '0.58rem', 
                                fontWeight: 900, 
                                background: 'rgba(239, 68, 68, 0.08)', 
                                color: '#ef4444', 
                                padding: '1px 6px', 
                                borderRadius: '100px', 
                                letterSpacing: '0.04em', 
                                textTransform: 'uppercase' 
                              }}>
                                Nicht geübt
                              </span>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                              {isJokerAvailable && (
                                <button 
                                  onClick={() => handleUseJoker(group.date)}
                                  style={{
                                    background: '#8b5cf6',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    fontSize: '0.65rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 4px rgba(139, 92, 246, 0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseOver={(e) => e.currentTarget.style.background = '#7c3aed'}
                                  onMouseOut={(e) => e.currentTarget.style.background = '#8b5cf6'}
                                >
                                  🎯 Joker einsetzen
                                </button>
                              )}
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <Flame size={iconSize} fill="#ef4444" color="#ef4444" />
                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ef4444' }}>
                                  Kleine Flamme
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    }

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

                    return (
                      <div 
                        key={idx}
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
                          borderLeft: `4px solid ${borderLeftColor}`
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
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
                          <Flame size={iconSize} fill={hasMastered ? '#10b981' : isToday ? '#eab308' : '#ef4444'} color={hasMastered ? '#10b981' : isToday ? '#eab308' : '#ef4444'} />
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: hasMastered ? '#10b981' : isToday ? '#eab308' : '#ef4444' }}>
                            {group.flameLevel}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>

        </div>
      )}

      {activeTab === 'songs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {progressLoading ? (
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
                  const brandColor = studentUser?.schools?.brand_color || '#16a34a';
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
                  const brandColor = studentUser?.schools?.brand_color || '#16a34a';
                  
                  const isMastered = (sng: any) => {
                    const progressItem = progressItems.find(item => 
                      item.topic_name.toLowerCase() === sng.title.toLowerCase() ||
                      item.topic_name.toLowerCase().includes(sng.title.toLowerCase())
                    );
                    return progressItem?.status === 'MASTERED';
                  };
                  
                  const filteredSongs = songs.filter(song => {
                    const matchesSearch = songSearch === '' || 
                      song.title?.toLowerCase().includes(songSearch.toLowerCase()) || 
                      song.artist?.toLowerCase().includes(songSearch.toLowerCase());
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
                    const matchesSearch = songSearch === '' || 
                      item.title?.toLowerCase().includes(songSearch.toLowerCase()) || 
                      item.author?.toLowerCase().includes(songSearch.toLowerCase());
                    const isAssigned = localProgress.some((p: any) => p.studentId === studentId && p.lehrwerkId === item.id);
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
                                  statusColor = '#10b981';
                                  statusBg = '#d1fae5';
                                  statusText = 'Meisterwerk!';
                                } else {
                                  statusColor = '#eab308';
                                  statusBg = '#fffbeb';
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
                              const assignment = localProgress.find((p: any) => p.studentId === studentId && p.lehrwerkId === item.id);
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
                              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f0fdf4', padding: '10px 12px', borderRadius: '12px', border: '1px solid #d1fae5' }}>
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
                                <div style={{ flex: 1, minWidth: 0, fontSize: '0.78rem', fontWeight: 800, color: '#065f46', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                      const studentAssignments = localProgress.filter((p: any) => p.studentId === studentId);
                      const assignedLehrwerke = lehrwerke.filter(book => studentAssignments.some((p: any) => p.lehrwerkId === book.id));

                      // Filter for 100% completed textbooks
                      const completedBooks = assignedLehrwerke.map(book => {
                        const assignment = studentAssignments.find((p: any) => p.lehrwerkId === book.id);
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
          )}
        </div>
      )}

      {activeTab === 'campus_cup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {rankingLoading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
              Performance & Highlights werden geladen...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="animation-slide-up">
              
              {/* Top Section: Header & Contribution */}
              {(() => {
                const brandColor = studentUser?.schools?.brand_color || '#16a34a';
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
                          { label: 'Deine Klasse', value: classCount, icon: Users, color: brandColor, bg: `${brandColor}08` },
                          { label: 'Klassen-Übezeit (Monat)', value: formatMins(currentMonthMins), icon: Clock, color: '#f59e0b', bg: '#fffbeb' },
                          { label: 'Klassen-Übezeit (Woche)', value: formatMins(liveClassWeeklyFocus), icon: TrendingUp, color: '#10b981', bg: '#f0fdf4' },
                          { label: 'Beitrag zur Schule', value: `${contributionPercent}%`, icon: Shield, color: '#6366f1', bg: '#f5f3ff' },
                          { label: 'Trend zum Vormonat', value: momPercent >= 0 ? `+${momPercent}%` : `${momPercent}%`, icon: Activity, color: momPercent >= 0 ? '#10b981' : '#ef4444', bg: momPercent >= 0 ? '#f0fdf4' : '#fef2f2' },
                          { label: 'Klassen-Aktivität', value: `${activityRate}%`, icon: Zap, color: '#ec4899', bg: '#fdf2f8' },
                          { label: 'Ø Zeit / Kopf (Woche)', value: formatMins(classCount > 0 ? Math.round(liveClassWeeklyFocus / classCount) : 0), icon: Clock, color: '#f59e0b', bg: '#fffbeb' },
                          { label: 'Ø Zeit / Kopf (Monat)', value: formatMins(classCount > 0 ? Math.round(currentMonthMins / classCount) : 0), icon: Award, color: brandColor, bg: `${brandColor}08` }
                        ].map((stat, idx) => (
                          <div key={idx} style={{ padding: '12px 14px', background: stat.bg, borderRadius: '24px', border: `1px solid ${stat.color}15`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '92px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</span>
                              <div style={{ padding: '6px', borderRadius: '8px', background: 'white', color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
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
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={42}
                              outerRadius={58}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatMins(Number(value))} />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                        
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
                    const brandColor = studentUser?.schools?.brand_color || '#16a34a';
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
                              <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#10b981', marginTop: '2px' }}>{masteredGoals}</span>
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
                                <div key={target.id} style={{
                                  position: 'relative',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  background: '#10b981',
                                  boxShadow: '0 6px 20px rgba(16, 185, 129, 0.12)',
                                  borderRadius: '16px',
                                  padding: '12px 14px',
                                  gap: '8px'
                                }}>
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
                                      color: isAchieved ? '#a7f3d0' : 'rgba(255, 255, 255, 0.8)',
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
                              <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a' }}>{hl.studentName}</span>
                              <span style={{ fontSize: '0.65rem', fontWeight: 900, color: studentUser?.schools?.brand_color || '#16a34a', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
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
                    <div style={{ background: '#ecfdf5', color: '#10b981', padding: '8px', borderRadius: '12px' }}>
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
                                bg = 'linear-gradient(135deg, #f0fdf4 0%, #e6fbf0 100%)';
                                border = '1px solid #dcfce7';
                                labelColor = '#166534';
                                textColor = '#15803d';
                                numColor = '#166534';
                                shadow = '0 2px 6px rgba(22, 163, 74, 0.04)';
                              } else if (minutes <= 60) {
                                bg = 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)';
                                border = '1px solid #bbf7d0';
                                labelColor = '#14532d';
                                textColor = '#166534';
                                numColor = '#14532d';
                                shadow = '0 3px 8px rgba(22, 163, 74, 0.07)';
                              } else if (minutes <= 180) {
                                bg = 'linear-gradient(135deg, #bbf7d0 0%, #86efac 100%)';
                                border = '1px solid #86efac';
                                labelColor = '#14532d';
                                textColor = '#14532d';
                                numColor = '#14532d';
                                shadow = '0 4px 12px rgba(22, 163, 74, 0.12)';
                              } else {
                                bg = 'linear-gradient(135deg, #10b981 0%, #047857 100%)';
                                border = '1px solid #059669';
                                labelColor = 'rgba(255, 255, 255, 0.8)';
                                textColor = 'rgba(255, 255, 255, 0.9)';
                                numColor = '#ffffff';
                                shadow = '0 6px 15px rgba(16, 185, 129, 0.25)';
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
                            { color: '#f0fdf4', label: '<15m', border: '#dcfce7' },
                            { color: '#dcfce7', label: '<1h', border: '#bbf7d0' },
                            { color: '#bbf7d0', label: '<3h', border: '#86efac' },
                            { color: '#10b981', label: '3h+', border: '#059669' }
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
          )}
        </div>
      )}

      {activeTab === 'events' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
          {(() => {
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();
            let startYear = currentYear;
            let endYear = currentYear + 1;
            if (currentMonth < 7) {
              startYear = currentYear - 1;
              endYear = currentYear;
            }
            const schoolYearText = `Schuljahr ${startYear}/${endYear}`;

            return (
              <div style={{
                background: 'rgba(255, 255, 255, 0.65)',
                backdropFilter: 'blur(25px) saturate(190%)',
                border: '1px solid rgba(0, 0, 0, 0.05)',
                borderRadius: '24px',
                padding: '24px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                position: 'relative'
              }} className="animation-slide-up">
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '16px' }}>
                  <div style={{ background: 'rgba(0, 113, 227, 0.1)', color: '#0071e3', padding: '8px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calendar size={18} />
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: '28px', color: '#1d1d1f', margin: 0, letterSpacing: '-0.02em', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>Events</h4>
                    <p style={{ fontSize: '0.72rem', color: '#86868b', margin: '2px 0 0 0', fontWeight: 500, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>Deine geplanten Unterrichtsstunden & Konzerte des laufenden Schuljahres</p>
                  </div>
                </div>

                {/* Filter Toggle Switch */}
                <div style={{
                  position: 'relative',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 110px)',
                  background: 'rgba(255, 255, 255, 0.45)',
                  backdropFilter: 'blur(20px) saturate(190%)',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  padding: '4px',
                  borderRadius: '16px',
                  width: 'fit-content',
                  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.03), inset 0 1px 2px rgba(255, 255, 255, 0.5)',
                  margin: '0 0 12px 0',
                  isolation: 'isolate'
                }}>
                  {/* Sliding liquid glass indicator pill */}
                  <div style={{
                    position: 'absolute',
                    top: '4px',
                    bottom: '4px',
                    left: appointmentFilter === 'upcoming' ? '4px' : appointmentFilter === 'past' ? '118px' : '232px',
                    width: '110px',
                    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.75) 100%)',
                    border: '0.5px solid rgba(0, 0, 0, 0.05)',
                    borderRadius: '12px',
                    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
                    transition: 'left 0.38s cubic-bezier(0.25, 1, 0.5, 1)',
                    zIndex: 1
                  }} />

                  <button
                    onClick={() => setAppointmentFilter('upcoming')}
                    style={{
                      position: 'relative',
                      border: 'none',
                      background: 'transparent',
                      color: appointmentFilter === 'upcoming' ? '#1d1d1f' : '#475569',
                      padding: '8px 0',
                      borderRadius: '12px',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      transition: 'color 0.25s ease, transform 0.1s ease',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                      zIndex: 2,
                      textAlign: 'center'
                    }}
                    onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.96)'; }}
                    onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    Kommende
                  </button>
                  <button
                    onClick={() => setAppointmentFilter('past')}
                    style={{
                      position: 'relative',
                      border: 'none',
                      background: 'transparent',
                      color: appointmentFilter === 'past' ? '#1d1d1f' : '#475569',
                      padding: '8px 0',
                      borderRadius: '12px',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      transition: 'color 0.25s ease, transform 0.1s ease',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                      zIndex: 2,
                      textAlign: 'center'
                    }}
                    onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.96)'; }}
                    onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    Vergangene
                  </button>
                  <button
                    onClick={() => setAppointmentFilter('all')}
                    style={{
                      position: 'relative',
                      border: 'none',
                      background: 'transparent',
                      color: appointmentFilter === 'all' ? '#1d1d1f' : '#475569',
                      padding: '8px 0',
                      borderRadius: '12px',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      transition: 'color 0.25s ease, transform 0.1s ease',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                      zIndex: 2,
                      textAlign: 'center'
                    }}
                    onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.96)'; }}
                    onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    Alle
                  </button>
                </div>

                {/* List */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', maxWidth: '100%', margin: '0 auto', width: '100%' }}>
                  {loadingSchoolYearSchedule ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#86868b', fontWeight: 500, fontSize: '0.8rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
                      Termine werden geladen...
                    </div>
                  ) : schoolYearOccurrences && schoolYearOccurrences.length > 0 ? (
                (() => {
                  const filteredOccurrences = schoolYearOccurrences.filter(occ => {
                    const isPast = (() => {
                      const todayStr = toLocalYYYYMMDD(new Date());
                      if (occ.date < todayStr) return true;
                      if (occ.date > todayStr) return false;
                      const nowTimeStr = new Date().toTimeString().substring(0, 8);
                      const startTime = occ.start_time || '00:00:00';
                      return startTime < nowTimeStr;
                    })();

                    if (appointmentFilter === 'upcoming') return !isPast;
                    if (appointmentFilter === 'past') return isPast;
                    return true;
                  });

                  if (filteredOccurrences.length === 0) {
                    return (
                      <div style={{ 
                        gridColumn: '1 / -1',
                        background: '#f8fafc', 
                        border: '1.5px dashed #e2e8f0', 
                        borderRadius: '16px', 
                        padding: '40px 24px', 
                        textAlign: 'center', 
                        color: '#64748b', 
                        fontWeight: 700,
                        fontSize: '0.9rem'
                      }}>
                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📅</div>
                        {appointmentFilter === 'upcoming' 
                          ? 'Keine kommenden Termine eingetragen.' 
                          : appointmentFilter === 'past' 
                            ? 'Keine vergangenen Termine eingetragen.' 
                            : 'Keine Termine eingetragen.'}
                      </div>
                    );
                  }

                  const groups: Record<string, any[]> = {};
                  filteredOccurrences.forEach(occ => {
                    const monthKey = occ.date.substring(0, 7);
                    if (!groups[monthKey]) {
                      groups[monthKey] = [];
                    }
                    groups[monthKey].push(occ);
                  });

                  const sortedMonthKeys = Object.keys(groups).sort();

                  return sortedMonthKeys.map(monthKey => {
                    const monthDate = new Date(monthKey + '-02');
                    const monthName = monthDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

                    return (
                      <div key={monthKey} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h3 style={{ 
                          fontSize: '0.8rem', 
                          fontWeight: 800, 
                          color: '#1d1d1f', 
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          margin: '20px 0 6px 0', 
                          borderBottom: '1px solid rgba(0, 0, 0, 0.08)', 
                          paddingBottom: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0071e3', display: 'inline-block' }} />
                          {monthName}
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {groups[monthKey].map(occ => {
                            const d = new Date(occ.date);
                            const isCanceled = occ.status === 'canceled_by_student' || occ.status === 'teacher_sick' || occ.status === 'cancelled';
                            const isPast = (() => {
                              const todayStr = toLocalYYYYMMDD(new Date());
                              if (occ.date < todayStr) return true;
                              if (occ.date > todayStr) return false;
                              const nowTimeStr = new Date().toTimeString().substring(0, 8);
                              const startTime = occ.start_time || '00:00:00';
                              return startTime < nowTimeStr;
                            })();
                            
                            let statusBadgeText = 'Regulär';
                            let statusBadgeColor = '#22c55e';
                            let statusBadgeBg = '#dcfce7';
                            
                            if (occ.status === 'canceled_by_student' || occ.status === 'cancelled' || occ.status === 'teacher_sick') {
                              statusBadgeText = 'Abgesagt';
                              statusBadgeColor = '#ef4444';
                              statusBadgeBg = '#fee2e2';
                            } else if (occ.status === 'pending_reschedule' || occ.status === 'rescheduled_confirmed') {
                              statusBadgeText = 'Verschoben';
                              statusBadgeColor = '#f59e0b';
                              statusBadgeBg = '#fef3c7';
                            }

                             return (
                              <div 
                                key={occ.id} 
                                style={{ 
                                  display: 'flex', 
                                  gap: '12px', 
                                  alignItems: 'center', 
                                  padding: '10px 14px', 
                                  borderRadius: '12px', 
                                  border: '1px solid #e2e8f0', 
                                  background: '#f8fafc',
                                  opacity: isPast ? 0.45 : isCanceled ? 0.6 : 1,
                                  transition: 'transform 0.2s',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.01)'
                                }}
                                className="hover-scale-subtle"
                              >
                                <div style={{ 
                                  width: '46px', 
                                  borderRadius: '10px', 
                                  overflow: 'hidden', 
                                  border: '1.5px solid #e2e8f0', 
                                  display: 'flex', 
                                  flexDirection: 'column', 
                                  textAlign: 'center',
                                  flexShrink: 0
                                }}>
                                  <div style={{ background: isPast || isCanceled ? '#94a3b8' : '#ef4444', color: 'white', fontSize: '0.55rem', fontWeight: 900, padding: '2px 0', textTransform: 'uppercase' }}>
                                    {d.toLocaleDateString('de-DE', {month: 'short'})}
                                  </div>
                                  <div style={{ background: 'white', color: '#1e293b', fontSize: '1.1rem', fontWeight: 900, padding: '3px 0', lineHeight: 1.1 }}>
                                    {d.toLocaleDateString('de-DE', {day: '2-digit'})}
                                  </div>
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>{d.toLocaleDateString('de-DE', {weekday: 'long'})}</span>
                                    {!occ.is_virtual && (
                                      <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>
                                        • Spezifisch
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                    <span>⏱️ {occ.start_time?.substring(0,5)} Uhr</span>
                                    <span>• {occ.duration || 45} Min</span>
                                    {occ.schedule?.room && (
                                      <span style={{ color: '#0b57d0' }}>• Raum: {occ.schedule.room}</span>
                                    )}
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                  <div style={{ 
                                    background: statusBadgeBg, 
                                    color: statusBadgeColor, 
                                    fontSize: '0.62rem', 
                                    fontWeight: 900, 
                                    padding: '4px 8px', 
                                    borderRadius: '100px', 
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.02em'
                                  }}>
                                    {statusBadgeText}
                                  </div>
                                  
                                  {/* Chat entry button for any past or future lesson */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
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
                                      background: '#ffffff',
                                      border: '1px solid #e2e8f0',
                                      color: '#64748b',
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '50%',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s',
                                      flexShrink: 0
                                    }}
                                    onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0b57d0'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#64748b'; }}
                                  >
                                    <MessageSquare size={13} />
                                  </button>

                                  {!isCanceled && !isPast && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCancelOccurrence(occ);
                                      }}
                                      style={{
                                        background: 'transparent',
                                        border: '1px solid #fee2e2',
                                        color: '#ef4444',
                                        fontSize: '0.62rem',
                                        fontWeight: 800,
                                        padding: '4px 8px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                      }}
                                      onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                                      onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                    >
                                      Absagen
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()
              ) : (
                <div style={{ 
                  background: '#f8fafc', 
                  border: '1.5px dashed #e2e8f0', 
                  borderRadius: '16px', 
                  padding: '40px 24px', 
                  textAlign: 'center', 
                  color: '#64748b', 
                  fontWeight: 700,
                  fontSize: '0.9rem'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📅</div>
                  Keine Termine für das laufende Schuljahr eingetragen.
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  )}

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
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* MAIN 2-COLUMN LAYOUT */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '32px', alignItems: 'start' }}>
            
            {/* LEFT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* TOP 4 KPIs ROW - SLEEK GAMIFIED TILES */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                
                {/* KPI 1: XP */}
                <div style={{ 
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

                {/* KPI 2: Songs */}
                <div style={{ 
                  position: 'relative', overflow: 'hidden',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white',
                  borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.3)',
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
                      {wrappedData?.monthlyFlashback?.masteredSongsCount || 0}/3
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, opacity: 0.9 }}>Songs</span>
                  </div>
                </div>

                {/* KPI 3: Fokus */}
                <div style={{ 
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

                {/* KPI 4: Streak */}
                <div style={{ 
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
                      studentUser?.photo_url && (
                        studentUser.photo_url.includes('avatar') || 
                        studentUser.photo_url.includes('gitarre') || 
                        studentUser.photo_url.includes('bass') || 
                        studentUser.photo_url.includes('drum') || 
                        studentUser.photo_url.includes('piano') || 
                        studentUser.photo_url.includes('klavier') || 
                        studentUser.photo_url.includes('vocal') || 
                        studentUser.photo_url.includes('trompete') || 
                        studentUser.photo_url.includes('cello') || 
                        studentUser.photo_url.includes('geige') || 
                        studentUser.photo_url.includes('sax')
                      )
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
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
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
                    Hi, <span style={{ 
                      background: 'linear-gradient(135deg, #4f46e5 0%, #007aff 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      fontWeight: 950
                    }}>{studentUser?.first_name || 'Student'}</span>! 👋
                  </h3>
                  
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.88rem', color: '#475569', fontWeight: 600, lineHeight: 1.45, maxWidth: '95%' }}>
                    Ein neuer Moment für Musik. Nimm dir heute ein paar Minuten für deine Übungsziele und sichere dir deine tägliche Serie!
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
                          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)', 
                          color: '#059669', 
                          padding: '6px 14px', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem', 
                          fontWeight: 800,
                          border: '1px solid rgba(16, 185, 129, 0.15)'
                        }}>
                          <Calendar size={13} color="#059669" />
                          <span>Nächster Unterricht: {hasToday ? `Heute, ${briefingData.todayLesson.time} Uhr` : (() => {
                            if(!nextOcc) return 'Demnächst';
                            const d = new Date(nextOcc.date);
                            return `${d.toLocaleDateString('de-DE', {weekday: 'long', day: '2-digit', month: '2-digit'})} - ${nextOcc.start_time?.substring(0,5)} Uhr`;
                          })()}</span>
                        </div>
  
                        {teacherId && (
                          <button 
                            onClick={() => {
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
                              background: '#e0e7ff', 
                              color: '#4f46e5', 
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              border: 'none',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              flexShrink: 0,
                              boxShadow: '0 4px 10px rgba(79, 70, 229, 0.1)'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = '#c7d2fe'}
                            onMouseOut={e => e.currentTarget.style.background = '#e0e7ff'}
                          >
                            <MessageSquare size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })() : (
                    <div style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.06)', color: '#10b981', padding: '6px 14px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}>
                      <Calendar size={13} color="#10b981" />
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
                  const currentWeekStr = getISOWeekRaw(new Date(), 1);
                  const prevWeekDate = new Date();
                  prevWeekDate.setDate(prevWeekDate.getDate() - 7);
                  const prevWeekStr = getISOWeekRaw(prevWeekDate, 1);

                  const parseHomeworkNotes = (rawNotes: string): string[] => {
                    if (!rawNotes || rawNotes.trim() === '') return [];
                    try {
                      if (rawNotes.startsWith('[') && rawNotes.endsWith(']')) {
                        return JSON.parse(rawNotes);
                      }
                      return rawNotes.split('\n\n').filter(Boolean);
                    } catch (e) {
                      return [rawNotes];
                    }
                  };

                  const currentWeekItems = progressItems.filter(item => 
                    !item.topic_name.startsWith('Hausaufgabe KW ') && 
                    item.status !== 'MASTERED' && 
                    item.status !== 'THEORY_DONE' &&
                    (item.is_current_homework || (item.updated_at && getISOWeekRaw(item.updated_at, 1) === currentWeekStr))
                  );

                  const currentWeekNotesItem = progressItems.find(item => 
                    item.topic_name.startsWith('Hausaufgabe KW ') && 
                    (item.is_current_homework || (item.updated_at && getISOWeekRaw(item.updated_at, 1) === currentWeekStr))
                  ) || progressItems.find(item => 
                    item.is_current_homework && 
                    item.homework_notes && 
                    item.homework_notes.trim() !== ''
                  );

                  const currentWeekNotes = currentWeekNotesItem ? parseHomeworkNotes(currentWeekNotesItem.homework_notes) : [];

                  const prevWeekItems = progressItems.filter(item => 
                    !item.topic_name.startsWith('Hausaufgabe KW ') && 
                    item.status !== 'MASTERED' && 
                    item.status !== 'THEORY_DONE' && 
                    item.updated_at && 
                    getISOWeekRaw(item.updated_at, 1) === prevWeekStr
                  );

                  const prevWeekNotesItem = progressItems.find(item => 
                    item.topic_name.startsWith('Hausaufgabe KW ') && 
                    item.updated_at && 
                    getISOWeekRaw(item.updated_at, 1) === prevWeekStr
                  );

                  const prevWeekNotes = prevWeekNotesItem ? parseHomeworkNotes(prevWeekNotesItem.homework_notes) : [];

                  const currentWeekNum = currentWeekStr.split('-W')[1] || '';
                  const prevWeekNum = prevWeekStr.split('-W')[1] || '';

                  const cleanTitle = (t: string) => t.replace(/\s*\((gitarre|guitar|e-gitarre|bass|e-bass|drums|schlagzeug|klavier|piano|keys|keyboard|vocals|gesang|stimme|allgemein)\)/i, '');

                  const groupAndFormatItems = (rawItems: any[]) => {
                    const groupedLehrwerke: Record<string, { pages: number[]; statuses: string[] }> = {};
                    const otherItems: any[] = [];

                    (rawItems || []).forEach(item => {
                      const title = item.title || item.topic_name || '';
                      if (title.includes(' - Seite ')) {
                        const parts = title.split(' - Seite ');
                        const bookTitle = cleanTitle(parts[0].trim());
                        const pageNum = parseInt(parts[1], 10);
                        
                        if (!groupedLehrwerke[bookTitle]) {
                          groupedLehrwerke[bookTitle] = { pages: [], statuses: [] };
                        }
                        if (!isNaN(pageNum) && !groupedLehrwerke[bookTitle].pages.includes(pageNum)) {
                          groupedLehrwerke[bookTitle].pages.push(pageNum);
                          groupedLehrwerke[bookTitle].statuses.push(item.status);
                        }
                      } else {
                        otherItems.push(item);
                      }
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
                      const formattedPages = formatPageNumbers(info.pages);
                      const allDone = info.statuses.every(status => status === 'MASTERED' || status === 'THEORY_DONE');
                      return {
                        title: `${bookTitle}: ${formattedPages}`,
                        status: allDone ? 'MASTERED' : 'IN_PROGRESS',
                        isBook: true
                      };
                    });

                    return [
                      ...groupedItems,
                      ...otherItems.map(item => ({
                        title: cleanTitle(item.title || item.topic_name || ''),
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
                        <div style={{ background: 'rgba(99, 102, 241, 0.08)', color: '#4f46e5', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                            <span style={{ background: '#e0e7ff', color: '#4f46e5', fontSize: '0.58rem', fontWeight: 900, padding: '1px 6px', borderRadius: '4px' }}>
                              Aktiv
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {((formattedCurrentWeekItems && formattedCurrentWeekItems.length > 0) || (currentWeekNotes && currentWeekNotes.length > 0)) ? (
                              <>
                                {formattedCurrentWeekItems && formattedCurrentWeekItems.map((item: any, idx: number) => {
                                  const isBook = item.isBook;
                                  const isDone = item.status === 'MASTERED' || item.status === 'THEORY_DONE';
                                  
                                  return (
                                    <div key={`curr-item-${idx}`} style={{
                                      background: isDone ? 'rgba(16, 185, 129, 0.02)' : '#ffffff',
                                      padding: '10px 12px',
                                      borderRadius: '12px',
                                      border: isDone ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(0, 0, 0, 0.04)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: '8px'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                        {isBook ? <BookOpen size={12} color={isDone ? '#10b981' : '#4f46e5'} /> : <Music size={12} color={isDone ? '#10b981' : '#4f46e5'} />}
                                        <span style={{ 
                                          fontWeight: 800, 
                                          color: isDone ? '#94a3b8' : '#1e293b', 
                                          fontSize: '0.78rem', 
                                          textDecoration: isDone ? 'line-through' : 'none',
                                          whiteSpace: 'nowrap', 
                                          textOverflow: 'ellipsis', 
                                          overflow: 'hidden' 
                                        }}>
                                          {item.title}
                                        </span>
                                      </div>
                                      
                                      {isDone ? (
                                        <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                          <Check size={12} strokeWidth={3} />
                                        </span>
                                      ) : (
                                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4f46e5', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
                                      )}
                                    </div>
                                  );
                                })}

                                {currentWeekNotes && currentWeekNotes.map((note: string, idx: number) => (
                                  <div key={`curr-note-${idx}`} style={{ 
                                    fontSize: '0.78rem', 
                                    color: '#475569', 
                                    fontWeight: 650, 
                                    fontStyle: 'italic', 
                                    borderLeft: '3px solid #10b981', 
                                    paddingLeft: '8px', 
                                    margin: '2px 4px',
                                    lineHeight: 1.4,
                                    background: '#f8fafc',
                                    padding: '6px 8px',
                                    borderRadius: '0 8px 8px 0'
                                  }}>
                                    📝 {note}
                                  </div>
                                ))}
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
                                  
                                  return (
                                    <div key={`prev-item-${idx}`} style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      fontSize: '0.75rem',
                                      gap: '8px'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                        {isBook ? <BookOpen size={11} color="#94a3b8" /> : <Music size={11} color="#94a3b8" />}
                                        <span style={{ fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                          {item.title}
                                        </span>
                                      </div>
                                      {isDone && <Check size={10} color="#10b981" strokeWidth={3} />}
                                    </div>
                                  );
                                })}
                                {prevWeekNotes && prevWeekNotes.map((note: string, idx: number) => (
                                  <div key={`prev-note-${idx}`} style={{ 
                                    fontSize: '0.72rem', 
                                    color: '#64748b', 
                                    fontWeight: 650, 
                                    fontStyle: 'italic', 
                                    borderLeft: '2px solid #cbd5e1', 
                                    paddingLeft: '6px', 
                                    margin: '2px 4px',
                                    lineHeight: 1.3
                                  }}>
                                    {note}
                                  </div>
                                ))}
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
                {(() => {
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

                {/* Spalte 3: Flammen-Pfad (Reflektieren & Belohnen) */}
                {(() => {
                  const streak = avatar?.streak_flame || 0;
                  
                  const isTier1Unlocked = streak >= 3;
                  const isTier2Unlocked = streak >= 6;
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
                        <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          🔥 Flammen-Pfad
                        </span>
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
                          height: streak >= 9 ? '100%' : streak >= 6 ? '50%' : streak >= 3 ? '0%' : '0%',
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
                                3+ Tage • 3m
                              </span>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {isTier1Unlocked ? '🎉 Freigeschaltet!' : `Noch ${Math.max(1, 3 - streak)} ${Math.max(1, 3 - streak) === 1 ? 'Tag' : 'Tage'}`}
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
                                6+ Tage • 5m
                              </span>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {isTier2Unlocked ? '🎉 Freigeschaltet!' : `Noch ${Math.max(1, 6 - streak)} ${Math.max(1, 6 - streak) === 1 ? 'Tag' : 'Tage'}`}
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
                                9+ Tage • 10m
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
                    <Calendar size={18} color="#10b981" />
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Nächste Termine</h3>
                  </div>
                  <button onClick={() => handleTabChangeLocal('events')} style={{ background: 'transparent', border: 'none', color: '#10b981', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>Alle anzeigen</button>
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
                                    background: 'rgba(255, 255, 255, 0.2)',
                                    color: '#ffffff',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    flexShrink: 0
                                  }}
                                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'; }}
                                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'; }}
                                >
                                  <MessageSquare size={14} />
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
                                    background: 'rgba(120, 53, 15, 0.12)',
                                    color: '#78350f',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    flexShrink: 0
                                  }}
                                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(120, 53, 15, 0.22)'; }}
                                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(120, 53, 15, 0.12)'; }}
                                >
                                  <MessageSquare size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={occ.id} style={{ display: 'flex', gap: '16px', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                            <div style={{ width: '48px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', textAlign: 'center' }}>
                              <div style={{ background: '#10b981', color: 'white', fontSize: '0.6rem', fontWeight: 800, padding: '4px 0', textTransform: 'uppercase' }}>{d.toLocaleDateString('de-DE', {month: 'short'})}</div>
                              <div style={{ background: 'white', color: '#1e293b', fontSize: '1.2rem', fontWeight: 900, padding: '6px 0' }}>{d.toLocaleDateString('de-DE', {day: '2-digit'})}</div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>{d.toLocaleDateString('de-DE', {weekday: 'long'})}</span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{occ.start_time?.substring(0,5)} <span style={{ color: '#22c55e' }}>{occ.schedule?.rooms?.name || 'Groovelab'}</span></div>
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
                                background: '#f1f5f9',
                                color: '#475569',
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
                                e.currentTarget.style.background = '#e2e8f0';
                                e.currentTarget.style.color = '#0b57d0';
                              }}
                              onMouseOut={e => {
                                e.currentTarget.style.background = '#f1f5f9';
                                e.currentTarget.style.color = '#475569';
                              }}
                            >
                              <MessageSquare size={14} />
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
                          cardBg = '#ecfdf5';
                          cardBorder = '#a7f3d0';
                          badgeText = '❇️ Wieder regulär';
                          badgeColor = '#065f46';
                        }
                        
                        return (
                          <div key={occ.id} style={{ 
                            padding: '12px', 
                            borderRadius: '12px', 
                            background: cardBg, 
                            border: `1px solid ${cardBorder}`, 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '8px' 
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
                                    onClick={() => handleAcknowledgeCancellation(occ.id)}
                                    style={{ 
                                      background: isRegularReset ? '#10b981' : '#ef4444', 
                                      color: 'white', 
                                      border: 'none', 
                                      padding: '4px 10px', 
                                      borderRadius: '6px', 
                                      fontSize: '0.7rem', 
                                      fontWeight: 700, 
                                      cursor: 'pointer',
                                      boxShadow: `0 2px 4px ${isRegularReset ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
                                      transition: 'all 0.2s',
                                      flexShrink: 0
                                    }}
                                  >
                                    Gelesen abhaken
                                  </button>
                                )}
                              </div>
                              {isRegularReset && (
                                <div style={{ fontSize: '0.7rem', color: '#047857', fontWeight: 500, marginTop: '4px', lineHeight: '1.2' }}>
                                  Findet wieder regulär statt.
                                </div>
                              )}
                            </div>
                            
                            {isReschedule && (
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '2px' }}>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button 
                                    onClick={() => handleRejectReschedule(occ)}
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
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    Ablehnen
                                  </button>
                                  <button 
                                    onClick={() => handleConfirmReschedule(occ.id)}
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
                                      transition: 'all 0.2s'
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
                      background: '#f0fdf4',
                      border: '1px solid #d1fae5',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Target size={18} color="#10b981" />
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
                        <div key={goal.id} style={{
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          background: '#10b981',
                          boxShadow: '0 6px 20px rgba(16, 185, 129, 0.12)',
                          borderRadius: '16px',
                          padding: '12px 14px',
                          gap: '8px'
                        }}>
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
                              color: isAchieved ? '#a7f3d0' : 'rgba(255, 255, 255, 0.8)',
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

              {/* LIVE CAMPUS FEED */}
              <div style={{ 
                background: '#ffffff', 
                borderRadius: '24px', 
                padding: '24px', 
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <Sparkles size={18} color="#eab308" />
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Campus Feed</h3>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {campusFeedAnnouncements.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px 0', textAlign: 'center', opacity: 0.6 }}>
                      <Sparkles size={24} color="#94a3b8" style={{ strokeWidth: 1.5 }} />
                      <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                        Keine aktuellen Campus-Mitteilungen vorhanden.
                      </span>
                    </div>
                  ) : (
                    campusFeedAnnouncements.slice(0, 5).map((item, idx, arr) => {
                      return (
                        <div key={item.id} style={{
                          paddingBottom: idx === arr.length - 1 ? '0' : '16px',
                          borderBottom: idx === arr.length - 1 ? 'none' : '1px solid #f1f5f9',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      )
    )}
      
      {activeTab === 'hero' && (
        <div style={{
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
            </div>

            {/* Info Block */}
            <div style={{ marginTop: '8px' }}>
              <h3 style={{ fontSize: '28px', fontWeight: 900, color: '#1e293b', margin: 0 }}>
                Mein Held
              </h3>
              <span style={{ color: '#0b57d0', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                <Award size={13} /> {levelTitle}
              </span>
            </div>

            {/* XP Progress Bar */}
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
                  background: '#16a34a',
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
                        background: isCompleted ? '#16a34a' : isCurrent ? '#ffffff' : '#cbd5e1',
                        border: isCurrent ? '4px solid #16a34a' : '4px solid transparent',
                        color: isCompleted ? '#ffffff' : isCurrent ? '#16a34a' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '1rem',
                        boxShadow: isCurrent ? '0 0 15px rgba(22, 163, 74, 0.3)' : 'none',
                        transition: 'all 0.3s'
                      }}>
                        {lvl}
                      </div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: isCurrent ? '#16a34a' : '#64748b', textAlign: 'center', whiteSpace: 'nowrap' }}>
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
                <div style={{ border: '2px dashed #bbf7d0', background: '#f0fdf4', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontWeight: 900, color: '#166534', fontSize: '1rem' }}>
                      🔓 Custom Avatar / Instrument Upload freigeschaltet!
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#15803d', lineHeight: 1.4 }}>
                      Trage deine einmalige PIN ein, die du von deinem Lehrer erhalten hast, um dein eigenes Profilbild/Instrumenten-Foto hochzuladen.
                    </p>
                  </div>

                  {/* AI Prompt Assistant helper */}
                  <div style={{ background: '#ffffff', border: '1px solid #dcfce7', padding: '12px', borderRadius: '12px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
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
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#15803d' }}>6-stellige Einmal-PIN</label>
                      <input
                        type="text"
                        placeholder="z.B. 123456"
                        value={pinInput}
                        onChange={e => setPinInput(e.target.value)}
                        maxLength={8}
                        style={{ padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #a7f3d0', fontWeight: 700 }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1.5, minWidth: '200px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#15803d' }}>Foto auswählen</label>
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
                        background: '#16a34a',
                        color: 'white',
                        border: 'none',
                        padding: '10px 18px',
                        borderRadius: '12px',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(22, 163, 74, 0.2)'
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

      {activeTab === 'profile' && studentUser && (
        <div className="animation-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '100%', margin: '0 auto', width: '100%' }}>
          {/* Header Card with Premium Glassmorphism */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.45) 100%)',
            backdropFilter: 'blur(24px) saturate(1.8)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            borderRadius: '32px',
            boxShadow: '0 12px 40px rgba(52, 168, 83, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
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
              boxShadow: '0 12px 32px rgba(52, 168, 83, 0.12)',
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
                  studentUser.photo_url && (studentUser.photo_url.includes('egitarre_avatar') || studentUser.photo_url.includes('gitarre_avatar_new'))
                    ? studentUser.photo_url
                    : ((studentUser.resolved_instrument || studentUser.instrument || '').toLowerCase().trim().includes('guitar') || (studentUser.resolved_instrument || studentUser.instrument || '').toLowerCase().trim().includes('gitarre'))
                      ? '/avatars/gitarre_avatar_new.png'
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
                  background: 'linear-gradient(135deg, #34a853 0%, #1b8035 100%)',
                  color: 'white', 
                  padding: '4px 14px', 
                  borderRadius: '10px',
                  fontSize: '0.7rem', 
                  fontWeight: 900, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.08em',
                  boxShadow: '0 4px 10px rgba(52, 168, 83, 0.2)'
                }}>
                  Campus Schüler
                </span>
                <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 750 }}>
                  🏢 {studentUser.schools?.name || 'Groovelab Campus'}
                </span>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 500 }}>
                  • Mitglied seit {new Date(studentUser.created_at).toLocaleDateString('de-DE')}
                </span>
              </div>

              <h1 style={{ fontSize: '28px', fontWeight: 950, color: '#0f172a', margin: '0 0 12px 0', letterSpacing: '-0.03em', fontFamily: "'Urbanist', sans-serif" }}>
                Profil
              </h1>

              {/* Active Instruments Badge List */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(studentUser.instrument || '').split(',').map((inst: string) => inst.trim()).filter(Boolean).map((inst: string) => (
                  <div key={inst} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(52, 168, 83, 0.05)',
                    border: '1px solid rgba(52, 168, 83, 0.12)',
                    color: '#34a853',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '0.78rem',
                    fontWeight: 800
                  }}>
                    <span>🎸</span>
                    <span>{inst}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Profile Edit Action Button */}
            <button 
              onClick={() => {
                setEditingProfile({ ...studentUser });
                setShowEditProfile(true);
              }} 
              style={{ 
                background: '#ffffff', 
                border: '1px solid rgba(0,0,0,0.06)', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                color: '#0f172a', 
                fontSize: '0.85rem', 
                fontWeight: 800, 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '12px 20px',
                borderRadius: '16px',
                transition: 'all 0.2s',
                marginLeft: 'auto'
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.background = '#f8fafc'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#ffffff'; }}
            >
              <span>Profil bearbeiten</span>
              <Pencil size={15} />
            </button>
          </div>

          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            {/* Metric 1: XP */}
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

            {/* Metric 2: Übe-Streak */}
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

            {/* Metric 3: Focus Month */}
            <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '24px', padding: '24px', display: 'flex', gap: '16px', alignItems: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.01)' }}>
              <div style={{ height: '48px', width: '48px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.08)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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

          {/* Split layout: schedules list & contact info card */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'start' }}>
            {/* Weekly recurring schedules */}
            <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '32px', padding: '32px', boxShadow: '0 8px 30px rgba(0,0,0,0.01)' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 20px 0', fontFamily: "'Urbanist', sans-serif", display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={20} style={{ color: '#34a853' }} />
                Wöchentlicher Unterrichtsplan
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                  <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', border: '2px dashed #cbd5e1', borderRadius: '24px' }}>
                    Keine wöchentlichen Termine hinterlegt.
                  </div>
                )}
              </div>
            </div>

            {/* General details and contacts */}
            <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '32px', padding: '32px', boxShadow: '0 8px 30px rgba(0,0,0,0.01)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0', fontFamily: "'Urbanist', sans-serif" }}>
                Kontaktdaten & Adresse
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <Mail size={16} color="#64748b" />
                  <div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>E-Mail-Adresse</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>{studentUser.email || 'Nicht hinterlegt'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <Phone size={16} color="#64748b" />
                  <div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Telefonnummer</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>{studentUser.phone || 'Nicht hinterlegt'}</div>
                  </div>
                </div>

                {studentUser.parent_email && (
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <User size={16} color="#64748b" />
                    <div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Eltern E-Mail</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>{studentUser.parent_email}</div>
                    </div>
                  </div>
                )}

                {(studentUser.street || studentUser.city) && (
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <MapPin size={16} color="#64748b" />
                    <div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Adresse</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                        {studentUser.street ? `${studentUser.street}, ` : ''}{studentUser.zip_code || ''} {studentUser.city || ''}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

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
                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>E-Mail-Adresse</label>
                    <input 
                      type="email" 
                      required
                      value={editingProfile.email || ''} 
                      onChange={(e) => setEditingProfile((prev: any) => ({ ...prev, email: e.target.value }))}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Telefonnummer</label>
                    <input 
                      type="text" 
                      value={editingProfile.phone || ''} 
                      onChange={(e) => setEditingProfile((prev: any) => ({ ...prev, phone: e.target.value }))}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Instrumente (durch Komma getrennt)</label>
                    <input 
                      type="text" 
                      value={editingProfile.instrument || ''} 
                      onChange={(e) => setEditingProfile((prev: any) => ({ ...prev, instrument: e.target.value }))}
                      placeholder="z.B. Gitarre, Schlagzeug"
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  {editingProfile.instrument && (editingProfile.instrument.toLowerCase().includes('guitar') || editingProfile.instrument.toLowerCase().includes('gitarre')) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                      <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Profilbild (Avatar)</label>
                      <div style={{ display: 'flex', gap: '20px' }}>
                        {[
                          { id: 'gitarre', label: 'Akustische Gitarre (Standard)', url: '/avatars/gitarre_avatar_new.png' },
                          { id: 'egitarre', label: 'E-Gitarre', url: '/avatars/egitarre_avatar.png' }
                        ].map((avatarItem) => {
                          const isSelected = editingProfile.photo_url === avatarItem.url || (!editingProfile.photo_url && avatarItem.id === 'gitarre');
                          return (
                            <button
                              key={avatarItem.id}
                              type="button"
                              onClick={() => setEditingProfile((prev: any) => ({ ...prev, photo_url: avatarItem.url }))}
                              style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '16px',
                                borderRadius: '20px',
                                border: `3px solid ${isSelected ? '#34a853' : '#f1f5f9'}`,
                                background: isSelected ? 'rgba(52, 168, 83, 0.04)' : 'white',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                outline: 'none'
                              }}
                            >
                              <div style={{ width: '80px', height: '80px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                <img src={avatarItem.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={avatarItem.label} />
                              </div>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isSelected ? '#1e293b' : '#64748b' }}>{avatarItem.label}</span>
                            </button>
                          );
                        })}
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
                    style={{ flex: 2, padding: '14px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, #34a853 0%, #1b8035 100%)', color: 'white', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 8px 24px rgba(52, 168, 83, 0.15)' }}
                  >
                    {savingProfile ? 'Wird gespeichert...' : 'Änderungen speichern'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

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
        const assignment = localProgress.find((p: any) => p.studentId === studentId && p.lehrwerkId === book.id);
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
              background: `radial-gradient(circle, ${gradient.from} 0%, ${gradient.to} 100%)`,
              borderRadius: '32px',
              width: '100%',
              maxWidth: '1100px',
              height: '80vh',
              boxShadow: '0 30px 80px rgba(0, 0, 0, 0.5), inset 0 0 30px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: `2px solid ${gradient.text}`,
              padding: '10px',
              position: 'relative'
            }} className="animation-slide-up">
              
              {/* Absolute Close Button */}
              <button
                onClick={() => setSelectedLehrwerkForDetail(null)}
                style={{
                  position: 'absolute',
                  top: '24px',
                  right: '24px',
                  zIndex: 100,
                  background: 'rgba(255, 255, 255, 0.7)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#475569',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#ffffff'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)'}
              >
                <X size={16} />
              </button>

              {/* Inside Pages of the Notebook (Left/Right Pages) */}
              <div style={{
                display: 'flex',
                flex: 1,
                overflow: 'hidden',
                borderRadius: '20px',
                boxShadow: 'inset 0 10px 30px rgba(0,0,0,0.1)',
                position: 'relative'
              }}>
                
                {/* Left Page (Information & General Progress) */}
                <div style={{
                  flex: 1,
                  padding: '32px',
                  overflowY: 'auto',
                  background: '#faf8f2',
                  backgroundImage: 'repeating-linear-gradient(#faf8f2, #faf8f2 27px, #e5e0d4 27px, #e5e0d4 28px)',
                  borderRight: '1px dashed #cbd5e1',
                  position: 'relative'
                }}>
                  {/* Left binder holes on the right edge */}
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    bottom: '20px',
                    right: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-around',
                    zIndex: 25
                  }}>
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <div key={idx} style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#121214',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)'
                      }} />
                    ))}
                  </div>

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
                  background: '#faf8f2',
                  backgroundImage: 'repeating-linear-gradient(#faf8f2, #faf8f2 27px, #e5e0d4 27px, #e5e0d4 28px)',
                  position: 'relative'
                }}>
                  {/* Right binder holes on the left edge */}
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    bottom: '20px',
                    left: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-around',
                    zIndex: 25
                  }}>
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <div key={idx} style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#121214',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)'
                      }} />
                    ))}
                  </div>

                  {/* Content Container */}
                  <div style={{ paddingLeft: '12px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px 0', borderBottom: '2px solid #cbd5e1', paddingBottom: '6px' }}>
                      📋 Aufgaben & Seiten
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {sortedPages.map((page) => {
                        let badgeBg = '#fffbeb';
                        let badgeColor = '#854d0e';
                        let badgeText = 'In Arbeit';

                        if (page.status === 'THEORY_DONE') {
                          badgeBg = '#f3e8ff';
                          badgeColor = '#6b21a8';
                          badgeText = 'Theorie';
                        } else if (page.status === 'MASTERED') {
                          badgeBg = '#d1fae5';
                          badgeColor = '#065f46';
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

                {/* Ringbook Spine overlay (Golden Rings) */}
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  bottom: '20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '32px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-around',
                  zIndex: 30,
                  pointerEvents: 'none'
                }}>
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <div key={idx} style={{
                      position: 'relative',
                      width: '100%',
                      height: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{
                        width: '28px',
                        height: '18px',
                        borderRadius: '50%',
                        background: 'transparent',
                        border: '3px solid #d4af37',
                        borderTopColor: '#ffe57f',
                        borderLeftColor: '#ffc107',
                        borderRightColor: '#ffc107',
                        borderBottomColor: '#b78a02',
                        boxShadow: '0 3px 5px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.4)',
                        transform: 'scaleY(0.8)'
                      }} />
                    </div>
                  ))}
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
                GrooveLab Wrapped
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
                    Schauen wir uns an, was du diesen Monat im GrooveLab geleistet hast! Bist du bereit für deine Story?
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
                      <BookOpen size={36} color="#10b981" />
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
                    <span style={{ background: '#10b981', color: 'white', fontSize: '0.7rem', fontWeight: 900, padding: '4px 12px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Charakter Evolution</span>
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
                style={{ flex: 1, background: '#18181b', border: '1px solid #27272a', color: 'white', padding: '12px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', opacity: storySlide === 0 ? 0.5 : 1 }}
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
                style={{ flex: 2, background: '#eab308', border: 'none', color: '#09090b', padding: '12px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 900, cursor: 'pointer' }}
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
      {showDetox && (
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
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', maxWidth: '320px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Smartphone size={40} color="#ef4444" className="animate-bounce" />
              </div>
              
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ef4444', letterSpacing: '-0.03em' }}>
                Handy umdrehen!
              </h2>
              
              <p style={{ color: '#a1a1aa', fontSize: '0.9rem', lineHeight: '1.5', fontWeight: 500 }}>
                Der Timer ist eingefroren. Lege das Smartphone flach auf das Display, um den Fokusmodus fortzusetzen.
              </p>
              
              <div style={{ fontSize: '3rem', fontWeight: 900, color: 'white', fontFamily: 'monospace', margin: '8px 0' }}>
                {Math.floor(detoxSecondsLeft / 60)}:{String(detoxSecondsLeft % 60).padStart(2, '0')}
              </div>

              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <button 
                  onClick={() => {
                    setIsDetoxActive(false);
                    setShowDetox(false);
                  }}
                  style={{ flex: 1, padding: '14px', background: '#27272a', border: '1px solid #3f3f46', color: 'white', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer' }}
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
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                <Award size={48} color="white" />
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white' }}>Fokus abgeschlossen!</h2>
              <p style={{ color: '#a1a1aa', fontSize: '0.9rem', marginTop: '8px', maxWidth: '280px' }}>
                Sehr gut! Du warst {detoxMinutes} Minuten voll konzentriert. Dir wurden +100 XP auf deinen Avatar gebucht.
              </p>
              
              <button 
                onClick={() => {
                  setShowDetox(false);
                  setDetoxCompleted(false);
                }}
                style={{ marginTop: '24px', background: '#10b981', color: 'white', border: 'none', padding: '14px 28px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer' }}
              >
                Zurück zum Dashboard
              </button>
            </div>
          )}
        </div>
      )}

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
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={16} />
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
              <form onSubmit={handleSendChatMessage} style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                <input 
                  type="text" 
                  placeholder={isFrozen ? "Shoutbox nach 48h eingefroren..." : "Nachricht senden..."}
                  disabled={isFrozen}
                  value={chatTypedMessage}
                  onChange={e => setChatTypedMessage(e.target.value)}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: isFrozen ? '#f1f5f9' : '#ffffff' }}
                />
                <button type="submit" disabled={isFrozen} style={{ background: isFrozen ? '#cbd5e1' : '#4f46e5', color: 'white', border: 'none', borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isFrozen ? 'not-allowed' : 'pointer', boxShadow: isFrozen ? 'none' : '0 4px 12px rgba(79, 70, 229, 0.15)' }}>
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>
        );
      })()}
      
    </div>
  );
}
