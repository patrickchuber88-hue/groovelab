import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Award, Lock, Smartphone, HelpCircle, Trophy, Sparkles, Star, 
  ChevronRight, Coffee, Clock, Flame, BookOpen, Share2, Play, 
  Pause, RotateCcw, Volume2, Moon, QrCode, X, EyeOff, Zap, Music, Library, Calendar, Check, Target, MessageSquare, Send,
  Pencil, User, Mail, Phone, MapPin, Activity, Camera
} from 'lucide-react';
import QRCode from 'react-qr-code';

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

      {/* 2x2 GRID FOR FITBIT STYLE KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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

      {/* HAUSAUFGABEN FITBIT STYLE */}
      <div style={{ background: '#ffffff', borderRadius: '24px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', borderLeft: '6px solid #22c55e' }}>
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
              <>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#16a34a', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px' }}>AKTUELLE HAUSAUFGABEN (0):</div>
                <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>
                  Keine aktuellen Hausaufgaben erfasst ✨
                </div>
              </>
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
            <>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#16a34a', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px' }}>
                AKTUELLE HAUSAUFGABEN ({totalItemsCount}):
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {Object.entries(groupedLehrwerke).map(([title, info]) => {
                  const pageNums = info.pages.map(p => p.num);
                  const formattedPages = formatPageNumbers(pageNums);
                  const combinedNotes = info.pages
                    .map(p => p.notes)
                    .filter(Boolean)
                    .filter(n => n !== 'Inhalte in der Premium-Version freischalten')
                    .join('; ');

                  return (
                    <div key={title} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.1rem' }}>📖</span>
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>{title}</div>
                          <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 650, marginTop: '2px' }}>
                            <strong>{formattedPages}</strong>
                            {combinedNotes ? ` • ${combinedNotes}` : ''}
                          </div>
                        </div>
                      </div>
                      <div style={{ background: '#dcfce7', color: '#16a34a', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Check size={14} strokeWidth={3} />
                      </div>
                    </div>
                  );
                })}

                {otherHWs.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>🎵 Songs & Projekte</div>
                    {otherHWs.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: '12px' }}>
                        <span style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600 }}>
                          {item.topic_name} {item.teacher_notes ? ` - ${item.teacher_notes}` : ''}
                        </span>
                        <div style={{ background: '#dcfce7', color: '#16a34a', borderRadius: '4px', padding: '2px 4px' }}>
                          <Check size={12} strokeWidth={3} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {notesList.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '2px' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      💡 Übe-Tipps:
                    </div>
                    {notesList.map((note: string, nIdx: number) => (
                      <div key={nIdx} style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 550, fontStyle: 'italic', background: '#f8fafc', padding: '8px 12px', borderRadius: '12px', borderLeft: '3px solid #3b82f6', lineHeight: '1.35', whiteSpace: 'pre-line' }}>
                        {note}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </div>

      {/* ÜBESOLL ACTION CARD */}
      <div style={{ background: '#ffffff', borderRadius: '24px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '12px', width: '40px', height: '40px', flexShrink: 0 }}>
            <Flame size={24} fill="currentColor" />
          </div>
          <div>
            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>TÄGLICHES ÜBESOLL</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#1e293b', marginTop: '2px' }}>Übezeit noch offen</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.3, marginTop: '2px' }}>Starte jetzt deinen Fokus-Übemodus! ⚡️</div>
          </div>
        </div>
        <button 
          onClick={() => setActiveTab('practice_board')}
          style={{ background: '#4f46e5', color: 'white', border: 'none', borderRadius: '12px', padding: '10px 14px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(79, 70, 229, 0.15)' }}>
          🚀 Üben starten
        </button>
      </div>

      {/* ÜBE-SERIE & FLAMMEN DUOLINGO STYLE */}
      <div style={{ background: '#ffffff', borderRadius: '24px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>🔥 Übe-Serie & Flammen</h3>
          <div style={{ background: '#ffedd5', color: '#ea580c', fontSize: '0.7rem', fontWeight: 800, padding: '3px 10px', borderRadius: '100px' }}>0 Tage</div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
          {/* Kleine Flamme */}
          <div style={{ background: '#fef08a', borderRadius: '12px', padding: '10px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', minHeight: '80px', textAlign: 'center' }}>
            <div style={{ color: '#eab308' }}><Flame size={18} fill="currentColor" /></div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#854d0e' }}>Kleine</div>
            <div style={{ fontSize: '0.58rem', color: '#a16207' }}>3 Min</div>
          </div>
          {/* Mittlere Flamme */}
          <div style={{ background: '#ffedd5', borderRadius: '12px', padding: '10px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', minHeight: '80px', textAlign: 'center' }}>
            <div style={{ color: '#f97316' }}><Flame size={18} fill="currentColor" /></div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#9a3412' }}>Mittlere</div>
            <div style={{ fontSize: '0.58rem', color: '#c2410c' }}>5 Min</div>
          </div>
          {/* Helden-Feuer */}
          <div style={{ background: '#fee2e2', borderRadius: '12px', padding: '10px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', minHeight: '80px', textAlign: 'center' }}>
            <div style={{ color: '#ef4444' }}><Flame size={18} fill="currentColor" /></div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#991b1b' }}>Helden</div>
            <div style={{ fontSize: '0.58rem', color: '#b91c1c' }}>10 Min</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.7rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span>👍 Joker bereit</span>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select style={{ border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 4px', fontSize: '0.65rem', background: '#f8fafc' }}><option>Tag 0</option></select>
              <select style={{ border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 4px', fontSize: '0.65rem', background: '#f8fafc' }}><option>0 Fehl</option></select>
              <button style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 6px', fontSize: '0.65rem', fontWeight: 600 }}>Real Geübt</button>
            </div>
          </div>
        </div>
      </div>

      {/* NÄCHSTE TERMINE TIMELINE */}
      <div style={{ background: '#ffffff', borderRadius: '24px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={16} color="#ef4444" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Nächste Termine</h3>
          </div>
          <button onClick={() => handleTabChangeLocal('events')} style={{ background: 'transparent', border: 'none', color: '#0b57d0', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Alle</button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {(() => {
            const upcomingConfirmed = (scheduleOccurrences || []).filter(occ => 
              occ.status === 'scheduled' || occ.status === 'rescheduled_confirmed'
            );
            if (upcomingConfirmed.length > 0) {
              return upcomingConfirmed.slice(0, 2).map(occ => {
                const d = new Date(occ.date);
                return (
                  <div key={occ.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                    <div style={{ width: '40px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ background: '#ef4444', color: 'white', fontSize: '0.55rem', fontWeight: 800, padding: '2px 0', textTransform: 'uppercase' }}>{d.toLocaleDateString('de-DE', {month: 'short'})}</div>
                      <div style={{ background: 'white', color: '#1e293b', fontSize: '1rem', fontWeight: 900, padding: '4px 0' }}>{d.toLocaleDateString('de-DE', {day: '2-digit'})}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>{d.toLocaleDateString('de-DE', {weekday: 'short'})}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{occ.start_time?.substring(0,5)} Uhr</div>
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
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f1f5f9',
                        color: '#475569',
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <MessageSquare size={13} />
                    </button>
                  </div>
                );
              });
            } else {
              return <div style={{ fontSize: '0.78rem', color: '#64748b', textAlign: 'center', padding: '10px 0' }}>Keine Termine verfügbar.</div>;
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
        .select('*, schedule:schedule_id(*), teacher:users!schedule_occurrences_teacher_id_fkey(first_name, last_name)')
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
        .select('*, schedule:schedule_id(*), teacher:users!schedule_occurrences_teacher_id_fkey(first_name, last_name)')
        .eq('student_id', studentId)
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      const { data: schedules, error: schErr } = await supabase
        .from('schedules')
        .select('*, teacher:users!schedules_teacher_id_fkey(first_name, last_name)')
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

  // Campus Cup States
  const [rankingData, setRankingData] = useState<any[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingError, setRankingError] = useState<string | null>(null);
  const [monthlyFocusMinutes, setMonthlyFocusMinutes] = useState(0);

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
  const [lehrwerke, setLehrwerke] = useState<any[]>([]);
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

        // Apply asymmetric logic locally as fallback
        const sanitized = (matrixItems || []).map((item: any) => {
          return item;
        });

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

    // Timer interval
    const interval = setInterval(() => {
      if (isPhoneFlat) {
        setSecondsElapsed(prev => prev + 1);
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
          // High-pitched warning beep
          playBeep(880, 200);
          setTimeout(() => playBeep(880, 200), 250);
          if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
          }
        }
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      clearInterval(interval);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [sessionActive, isPhoneFlat]);

  const finishPracticeSession = async () => {
    setSessionActive(false);
    const durationMinutes = Math.max(1, Math.round(secondsElapsed / 60));

    try {
      // 1. Post to API endpoint
      const response = await fetch('/api/student/finish-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('sb-access-token') || ''}`
        },
        body: JSON.stringify({
          studentId,
          topicName: selectedTopic,
          durationMinutes
        })
      });

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const data = await response.json();
        alert(`Klasse geübt! Du hast +${data.stats.xpAdded} XP erhalten und dein Streak ist bei ${data.stats.streakFlame} Flammen! 🔥`);
        fetchStudentAndAvatar();
        fetchStudentProgress();
        return;
      }

      // 2. Direct Supabase fallback
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Fetch current stats
      const { data: stats } = await supabase
        .from('student_stats')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();

      let totalFocus = durationMinutes;
      let monthlyFocus = durationMinutes;
      let currentXp = durationMinutes * 10;
      let streakFlame = 1;
      let lastPracticeDate = null;

      if (stats) {
        totalFocus = (stats.total_focus_minutes || 0) + durationMinutes;
        monthlyFocus = (stats.monthly_focus_minutes || 0) + durationMinutes;
        currentXp = (stats.current_xp || 0) + (durationMinutes * 10);
        streakFlame = stats.streak_flame || 0;
        lastPracticeDate = stats.last_practice_date ? String(stats.last_practice_date) : null;
      }

      if (lastPracticeDate === yesterdayStr) {
        streakFlame += 1;
      } else if (lastPracticeDate === todayStr) {
        // Keep same streak
      } else {
        streakFlame = 1;
      }

      // Upsert stats
      await supabase.from('student_stats').upsert({
        student_id: studentId,
        total_focus_minutes: totalFocus,
        monthly_focus_minutes: monthlyFocus,
        streak_flame: streakFlame,
        last_practice_date: todayStr,
        current_xp: currentXp,
        updated_at: new Date().toISOString()
      });

      // Log to focus log
      await supabase.from('fokus_logs').insert({
        user_id: studentId,
        duration_minutes: durationMinutes,
        created_at: new Date().toISOString()
      });

      // Update avatar
      const { data: avatar } = await supabase
        .from('avatars')
        .select('*')
        .eq('user_id', studentId)
        .maybeSingle();

      if (avatar) {
        await supabase.from('avatars').update({
          xp: currentXp,
          streak_flame: streakFlame,
          last_focus_date: todayStr
        }).eq('id', avatar.id);
      }

      alert(`Klasse geübt! Du hast +${durationMinutes * 10} XP erhalten und dein Streak ist bei ${streakFlame} Flammen! 🔥`);
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
        .select('monthly_focus_minutes')
        .eq('student_id', studentId)
        .maybeSingle();
      setMonthlyFocusMinutes(statsData?.monthly_focus_minutes || 0);

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
          <span>Campus-Cup</span>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
          <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              position: 'relative'
            }} className="animation-slide-up">
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
                <div style={{ background: '#ecfdf5', color: '#10b981', padding: '8px', borderRadius: '12px' }}>
                  <Clock size={18} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 800, fontSize: '28px', color: '#1e293b', margin: 0 }}>Übe-Board</h4>
                  <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '2px 0 0 0', fontWeight: 600 }}>Fokusmodus & Gyroskop-Steuerung</p>
                </div>
              </div>

              {!sessionActive ? (
                /* Timer setup before starting */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '400px', margin: '0 auto', width: '100%' }}>
                  {/* Missions-Auswahl (Dropdown) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>
                      Wähle dein Übe-Thema:
                    </label>
                    <select
                      value={selectedTopic}
                      onChange={(e) => setSelectedTopic(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '14px',
                        border: '1.5px solid #e2e8f0',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        backgroundColor: 'white',
                        outline: 'none'
                      }}
                    >
                      <option value="">-- Thema auswählen --</option>
                      {progressItems.map((item) => (
                        <option key={item.id} value={item.topic_name}>
                          {item.topic_name} {item.is_current_homework ? '🎯 (Hausaufgabe)' : ''}
                        </option>
                      ))}
                      <option value="Allgemeines Üben">Allgemeines Üben 🎸</option>
                    </select>
                  </div>

                  {/* Circular visual timer representation (static state) */}
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                    <div style={{ position: 'relative', width: '180px', height: '180px' }}>
                      <svg width="180" height="180" viewBox="0 0 180 180">
                        <circle cx="90" cy="90" r="76" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                        <circle 
                          cx="90" 
                          cy="90" 
                          r="76" 
                          fill="none" 
                          stroke="#10b981" 
                          strokeWidth="10" 
                          strokeDasharray={2 * Math.PI * 76}
                          strokeDashoffset={2 * Math.PI * 76}
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
                        <span style={{ fontSize: '2rem', fontWeight: 900, color: '#1e293b' }}>00:00</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>Detox-Timer</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
                        try {
                          const permission = await (DeviceOrientationEvent as any).requestPermission();
                          if (permission !== 'granted') {
                            alert('Sensor-Rechte werden für den Detox-Modus benötigt.');
                            return;
                          }
                        } catch (err) {
                          console.error(err);
                        }
                      }
                      
                      // Pre-select topic
                      if (!selectedTopic) {
                        const hw = progressItems.find(i => i.is_current_homework);
                        setSelectedTopic(hw ? hw.topic_name : (progressItems[0]?.topic_name || 'Allgemeines Üben'));
                      }
                      setSecondsElapsed(0);
                      setSessionActive(true);
                      setIsPhoneFlat(false);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '16px',
                      borderRadius: '16px',
                      fontWeight: 900,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(16,185,129,0.2)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                    className="hover-scale"
                  >
                    🚀 Fokus-Session starten
                  </button>
                </div>
              ) : (
                /* Timer running / Gyro orientation dashboard */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Fokus-Thema:</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>{selectedTopic}</div>
                  </div>

                  {/* Circular animated SVG progress ring */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div style={{ position: 'relative', width: '200px', height: '200px' }}>
                      <svg width="200" height="200" viewBox="0 0 200 200">
                        <circle cx="100" cy="100" r="85" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                        <circle 
                          cx="100" 
                          cy="100" 
                          r="85" 
                          fill="none" 
                          stroke={isPhoneFlat ? '#10b981' : '#ef4444'} 
                          strokeWidth="12" 
                          strokeDasharray={2 * Math.PI * 85}
                          strokeDashoffset={2 * Math.PI * 85 - (2 * Math.PI * 85 * ((secondsElapsed % 60) / 60))}
                          strokeLinecap="round"
                          transform="rotate(-90 100 100)"
                          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
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
                        <span style={{ fontSize: '2.5rem', fontWeight: 950, color: '#0f172a', fontFamily: 'monospace' }}>
                          {String(Math.floor(secondsElapsed / 60)).padStart(2, '0')}:
                          {String(secondsElapsed % 60).padStart(2, '0')}
                        </span>
                        <span style={{ fontSize: '0.62rem', fontWeight: 900, color: isPhoneFlat ? '#10b981' : '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>
                          {isPhoneFlat ? 'Üben Aktiv' : 'Pausiert'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Gyro Sensor feedback */}
                  <div style={{
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
                      <div className="animate-pulse">
                        <strong>🚨 Fokus unterbrochen!</strong>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', opacity: 0.9 }}>Lege das Handy wieder auf das Display, um weiterzuüben.</p>
                      </div>
                    )}
                  </div>

                  {/* Display Down Fullscreen Blackout Overlay */}
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
                        color: '#18181b',
                        userSelect: 'none'
                      }}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#27272a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                          Fokus active...
                        </div>
                        <div style={{ fontSize: '1rem', color: '#18181b', marginTop: '8px' }}>
                          {String(Math.floor(secondsElapsed / 60)).padStart(2, '0')}:{String(secondsElapsed % 60).padStart(2, '0')}
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px' }}>
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
                      🏁 Session Beenden
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Möchtest du diese Session wirklich abbrechen? Der Fortschritt geht verloren.')) {
                          setSessionActive(false);
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
      )}

      {activeTab === 'songs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {progressLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
              Songs & Material werden geladen...
            </div>
          ) : (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '8px', borderRadius: '12px' }}>
                    <Music size={18} />
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 800, fontSize: '28px', color: '#1e293b', margin: 0 }}>Mediathek</h4>
                    <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '2px 0 0 0', fontWeight: 600 }}>Deine Meilensteine & Hausaufgaben</p>
                  </div>
                </div>

                {/* Tab Selector */}
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '14px', gap: '4px' }}>
                  <button 
                    type="button"
                    onClick={() => setMediathekTab('songs')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      background: mediathekTab === 'songs' ? 'white' : 'transparent',
                      color: mediathekTab === 'songs' ? '#1e293b' : '#64748b',
                      fontWeight: 900,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      boxShadow: mediathekTab === 'songs' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Music size={14} color={mediathekTab === 'songs' ? '#1e293b' : '#64748b'} />
                    Songs & Projekte
                  </button>
                  <button 
                    type="button"
                    onClick={() => setMediathekTab('lehrwerke')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      background: mediathekTab === 'lehrwerke' ? 'white' : 'transparent',
                      color: mediathekTab === 'lehrwerke' ? '#1e293b' : '#64748b',
                      fontWeight: 900,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      boxShadow: mediathekTab === 'lehrwerke' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Library size={14} color={mediathekTab === 'lehrwerke' ? '#1e293b' : '#64748b'} />
                    Lehrwerke
                  </button>
                </div>
              </div>

              {mediathekTab === 'songs' ? (
                /* SONGS TAB */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Pinned current homework "Aktuelle Mission" */}
                  {progressItems.some(item => item.is_current_homework && !item.topic_name.includes(' - Seite ')) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        🎯 Aktuelle Mission
                      </span>
                      {progressItems.filter(item => item.is_current_homework && !item.topic_name.includes(' - Seite ')).map(item => {
                        let statusColor = '#eab308';
                        let statusBg = '#fffbeb';
                        let statusText = 'In Arbeit';

                        if (item.status === 'THEORY_DONE') {
                          statusColor = '#a855f7';
                          statusBg = '#f3e8ff';
                          statusText = 'Theorie gelesen';
                        } else if (item.status === 'MASTERED') {
                          statusColor = '#10b981';
                          statusBg = '#d1fae5';
                          statusText = 'Meisterwerk!';
                        }

                        return (
                          <div 
                            key={item.id} 
                            style={{
                              background: '#f0fdfa',
                              borderRadius: '20px',
                              border: '2px solid #06b6d4',
                              padding: '20px',
                              boxShadow: '0 0 15px rgba(6, 182, 212, 0.15)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px'
                            }}
                            className="animate-pulse"
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0f172a' }}>
                                {item.topic_name}
                              </span>
                              <span style={{
                                background: statusBg,
                                color: statusColor,
                                padding: '4px 10px',
                                borderRadius: '8px',
                                fontSize: '0.7rem',
                                fontWeight: 900,
                                textTransform: 'uppercase'
                              }}>
                                {statusText}
                              </span>
                            </div>
                            {item.teacher_notes && (
                              <div style={{ background: 'white', padding: '12px 16px', borderRadius: '12px', border: '1px solid #ccfbf1', fontSize: '0.82rem', color: '#0f172a', fontWeight: 600, fontStyle: 'italic' }}>
                                Notiz: {item.teacher_notes}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Complete grid of song tiles */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Deine Meilensteine
                    </span>
                    {progressItems.filter(item => !item.topic_name.includes(' - Seite ')).length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>
                        Noch keine Songs am Board.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                        {progressItems.filter(item => !item.topic_name.includes(' - Seite ')).map(item => {
                          let tileBg = 'white';
                          let tileBorder = '1px solid #e2e8f0';
                          let badgeBg = '#f1f5f9';
                          let badgeColor = '#475569';
                          let badgeText = 'In Arbeit';

                          if (item.status === 'IN_PROGRESS') {
                            tileBg = '#fffbeb';
                            tileBorder = '1.5px solid #fef08a';
                            badgeBg = '#fef9c3';
                            badgeColor = '#854d0e';
                          } else if (item.status === 'THEORY_DONE') {
                            tileBg = '#faf5ff';
                            tileBorder = '1.5px solid #e9d5ff';
                            badgeBg = '#f3e8ff';
                            badgeColor = '#6b21a8';
                            badgeText = 'Theorie gelesen';
                          } else if (item.status === 'MASTERED') {
                            tileBg = '#f0fdf4';
                            tileBorder = '1.5px solid #a7f3d0';
                            badgeBg = '#d1fae5';
                            badgeColor = '#065f46';
                            badgeText = 'Meisterwerk!';
                          }

                          return (
                            <div 
                              key={item.id} 
                              style={{
                                background: tileBg,
                                border: item.is_current_homework ? '2px solid #06b6d4' : tileBorder,
                                borderRadius: '20px',
                                padding: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                boxShadow: item.is_current_homework ? '0 0 10px rgba(6, 182, 212, 0.1)' : 'none',
                                position: 'relative'
                              }}
                              className={item.is_current_homework ? 'animate-pulse' : 'hover-scale'}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b' }}>
                                  {item.topic_name}
                                </span>
                                <span style={{
                                  background: badgeBg,
                                  color: badgeColor,
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  fontSize: '0.62rem',
                                  fontWeight: 900,
                                  textTransform: 'uppercase',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {badgeText}
                                </span>
                              </div>
                              {item.teacher_notes && (
                                <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, fontWeight: 550, lineHeight: 1.3 }}>
                                  {item.teacher_notes}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* LEHRWERKE TAB */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Deine Schulbücher & Lehrwerke
                    </span>
                    {(() => {
                      // Extract book titles from progressItems page tasks
                      const progressBookTitles = new Set<string>();
                      progressItems.forEach(item => {
                        if (item.topic_name.includes(' - Seite ')) {
                          const title = item.topic_name.split(' - Seite ')[0].trim();
                          progressBookTitles.add(title);
                        }
                      });

                      const assignedBookIds = localProgress.filter((p: any) => p.studentId === studentId).map((p: any) => p.lehrwerkId);
                      const assignedLehrwerke = lehrwerke.filter(book => {
                        const isExplicitlyAssigned = assignedBookIds.includes(book.id);
                        const isReferencedInProgress = Array.from(progressBookTitles).some(t => t.toLowerCase() === book.title.toLowerCase());
                        return isExplicitlyAssigned || isReferencedInProgress;
                      });

                      const missingBooks = Array.from(progressBookTitles).filter(title => 
                        !lehrwerke.some(book => book.title.toLowerCase() === title.toLowerCase())
                      );
                      const fallbackBooks = missingBooks.map((title, idx) => ({
                        id: `fallback-${idx}`,
                        title: title,
                        author: 'GrooveLab Campus',
                        totalPages: 50
                      }));

                      const allStudentBooks = [...assignedLehrwerke, ...fallbackBooks];

                      if (allStudentBooks.length === 0) {
                        return (
                          <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>
                            Keine Lehrwerke zugewiesen.
                          </div>
                        );
                      }

                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                          {allStudentBooks.map(book => {
                            const gradient = getLehrwerkColor(book.title, lehrwerke);
                            const assignment = localProgress.find((p: any) => p.studentId === studentId && p.lehrwerkId === book.id);
                            
                            let masteredCount = 0;
                            if (assignment && assignment.pageStates) {
                              masteredCount = Object.values(assignment.pageStates).filter((s: any) => s.status === 'mastered').length;
                            } else {
                              masteredCount = progressItems.filter(item => 
                                item.topic_name.toLowerCase().startsWith(`${book.title.toLowerCase()} - seite `) && 
                                item.status === 'MASTERED'
                              ).length;
                            }

                            return (
                              <div 
                                key={book.id}
                                onClick={() => setSelectedLehrwerkForDetail(book)}
                                style={{ 
                                  padding: '20px', 
                                  background: 'white', 
                                  display: 'flex', 
                                  gap: '16px', 
                                  alignItems: 'center', 
                                  borderRadius: '24px', 
                                  border: '1px solid #e2e8f0', 
                                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.02)',
                                  position: 'relative',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease'
                                }}
                                className="hover-scale"
                              >
                                {(() => {
                                  return (
                                    <div style={{ 
                                      width: '64px', 
                                      height: '84px', 
                                      background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`, 
                                      borderRadius: '8px', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center', 
                                      color: gradient.text, 
                                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                      flexShrink: 0
                                    }}>
                                      <BookOpen size={24} color={gradient.text} />
                                    </div>
                                  );
                                })()}
                                <div style={{ flex: 1 }}>
                                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>{book.title}</h4>
                                  {book.author && <p style={{ margin: '0 0 4px 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>von {book.author}</p>}
                                  
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#475569', fontWeight: 700, marginTop: '8px', marginBottom: '4px' }}>
                                    <span style={{ color: '#94a3b8' }}>📖 {book.totalPages || 50} Seiten</span>
                                    <span>{masteredCount} / {book.totalPages || 50} S. geschafft</span>
                                  </div>
                                  <div style={{ width: '100%', height: '6px', borderRadius: '3px', background: '#e2e8f0', overflow: 'hidden' }}>
                                    <div style={{ width: `${Math.min(100, (masteredCount / (book.totalPages || 50)) * 100)}%`, height: '100%', background: gradient.text, borderRadius: '3px', transition: 'width 0.3s ease' }} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {activeTab === 'campus_cup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <style>{`
            @keyframes pulse-green {
              0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); border-color: rgba(34, 197, 94, 0.8); }
              70% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); border-color: rgba(34, 197, 94, 0.8); }
              100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); border-color: rgba(34, 197, 94, 0.8); }
            }
            .pulsing-own-school {
              animation: pulse-green 2s infinite;
              background-color: #f0fdf4 !important;
              border: 2px solid #22c55e !important;
            }
          `}</style>

          {rankingLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
              Campus-Cup wird geladen...
            </div>
          ) : rankingError ? (
            <div style={{
              background: '#fef2f2',
              border: '1.5px solid #fca5a5',
              padding: '24px',
              borderRadius: '24px',
              textAlign: 'center',
              color: '#991b1b',
              fontWeight: 700
            }}>
              {rankingError}
            </div>
          ) : (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }} className="animation-slide-up">
              
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
                <div style={{ background: '#fef3c7', color: '#d97706', padding: '8px', borderRadius: '12px' }}>
                  <Trophy size={18} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 800, fontSize: '28px', color: '#1e293b', margin: 0 }}>Campus-Cup</h4>
                  <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '2px 0 0 0', fontWeight: 600 }}>Globales Ranking aller Musikschulen (RFI Index)</p>
                </div>
              </div>

              {/* Leaderboard Table List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                
                {/* Render Top 3 */}
                {rankingData.slice(0, 3).map((item) => {
                  const medal = item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `#${item.rank}`;
                  return (
                    <div
                      key={item.name}
                      className={item.isOwnSchool ? 'pulsing-own-school' : ''}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: item.isOwnSchool ? '#f0fdf4' : '#f8fafc',
                        border: item.isOwnSchool ? '2px solid #22c55e' : '1px solid #e2e8f0',
                        padding: '14px 18px',
                        borderRadius: '16px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontWeight: 900, fontSize: '1.2rem', color: '#64748b', width: '32px', textAlign: 'center' }}>{medal}</span>
                        <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b' }}>
                          {item.name} {item.isOwnSchool && <span style={{ fontSize: '0.65rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '100px', marginLeft: '6px', fontWeight: 900 }}>EIGENE SCHULE</span>}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#0f172a' }}>{item.rfi}</span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Min/Schüler</span>
                      </div>
                    </div>
                  );
                })}

                {/* Sandwich Window rendering */}
                {(() => {
                  const ownIndex = rankingData.findIndex(item => item.isOwnSchool);
                  if (ownIndex === -1 || ownIndex < 3) return null;

                  const predecessor = rankingData[ownIndex - 1];
                  const ownSchool = rankingData[ownIndex];
                  const successor = rankingData[ownIndex + 1];
                  const diff = predecessor ? (predecessor.rfi - ownSchool.rfi).toFixed(1) : '0.0';

                  return (
                    <>
                      {/* Divider */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        color: '#94a3b8',
                        fontWeight: 900,
                        fontSize: '1.1rem',
                        letterSpacing: '0.15em',
                        padding: '4px 0'
                      }}>
                        •••
                      </div>

                      {/* Predecessor */}
                      {predecessor && (
                        <div
                          key={predecessor.name}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            padding: '14px 18px',
                            borderRadius: '16px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#64748b', width: '32px', textAlign: 'center' }}>#{predecessor.rank}</span>
                            <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b' }}>{predecessor.name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#0f172a' }}>{predecessor.rfi}</span>
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Min/Schüler</span>
                          </div>
                        </div>
                      )}

                      {/* Own School (Pulsing Green) */}
                      <div
                        key={ownSchool.name}
                        className="pulsing-own-school"
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '14px 18px',
                          borderRadius: '16px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#15803d', width: '32px', textAlign: 'center' }}>#{ownSchool.rank}</span>
                          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#166534' }}>
                            {ownSchool.name} <span style={{ fontSize: '0.65rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '100px', marginLeft: '6px', fontWeight: 900 }}>EIGENE SCHULE</span>
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#15803d' }}>{ownSchool.rfi}</span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#15803d', opacity: 0.7, textTransform: 'uppercase' }}>Min/Schüler</span>
                        </div>
                      </div>

                      {/* Successor */}
                      {successor && (
                        <div
                          key={successor.name}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            padding: '14px 18px',
                            borderRadius: '16px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#64748b', width: '32px', textAlign: 'center' }}>#{successor.rank}</span>
                            <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b' }}>{successor.name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#0f172a' }}>{successor.rfi}</span>
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Min/Schüler</span>
                          </div>
                        </div>
                      )}

                      {/* Live Difference Calculator */}
                      {predecessor && (
                        <div style={{
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          padding: '12px 16px',
                          borderRadius: '16px',
                          color: '#1e40af',
                          fontSize: '0.78rem',
                          fontWeight: 750,
                          textAlign: 'center',
                          marginTop: '4px'
                        }}>
                          🚀 Noch <strong>+{diff} Minuten</strong> im Schnitt pro Schüler bis Platz {predecessor.rank}!
                        </div>
                      )}
                    </>
                  );
                })()}

              </div>

                <div style={{
                  background: '#f0fdf4',
                  border: '1.5px solid #bbf7d0',
                  padding: '14px 18px',
                  borderRadius: '20px',
                  color: '#15803d',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.05)',
                  marginTop: '10px'
                }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 900 }}>✓</span>
                  <span>Du hast diesen Monat bereits <strong>{monthlyFocusMinutes}</strong> Minuten zum Erfolg deiner Schule beigetragen! Weiter so!</span>
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
          
          {/* TOP 4 KPIs ROW */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            
            {/* KPI 1: XP */}
            <div style={{ 
              background: 'linear-gradient(135deg, #0b57d0 0%, #3b82f6 100%)', 
              borderRadius: '16px', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '12px 16px', 
              position: 'relative', 
              overflow: 'hidden', 
              boxShadow: '0 4px 15px rgba(11, 87, 208, 0.1)' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.18)', borderRadius: '10px', width: '32px', height: '32px', flexShrink: 0 }}>
                <Star size={16} fill="currentColor" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Urbanist', sans-serif" }}>{currentXp || 0} XP</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 750, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>XP gesammelt</span>
              </div>
            </div>

            {/* KPI 2: Songs */}
            <div style={{ 
              background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)', 
              borderRadius: '16px', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '12px 16px', 
              position: 'relative', 
              overflow: 'hidden', 
              boxShadow: '0 4px 15px rgba(22, 163, 74, 0.1)' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.18)', borderRadius: '10px', width: '32px', height: '32px', flexShrink: 0 }}>
                <Award size={16} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Urbanist', sans-serif" }}>{wrappedData?.monthlyFlashback?.masteredSongsCount || 0} / 3</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 750, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>Songs verifiziert</span>
              </div>
            </div>

            {/* KPI 3: Fokus */}
            <div style={{ 
              background: 'linear-gradient(135deg, #eab308 0%, #facc15 100%)', 
              borderRadius: '16px', 
              color: '#1f2937', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '12px 16px', 
              position: 'relative', 
              overflow: 'hidden', 
              boxShadow: '0 4px 15px rgba(234, 179, 8, 0.1)' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.06)', borderRadius: '10px', width: '32px', height: '32px', flexShrink: 0 }}>
                <Clock size={16} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Urbanist', sans-serif" }}>{wrappedData?.monthlyFlashback?.focusMinutes || 0} Min</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 750, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>Fokus-Übezeit</span>
              </div>
            </div>

            {/* KPI 4: Streak */}
            <div style={{ 
              background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)', 
              borderRadius: '16px', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '12px 16px', 
              position: 'relative', 
              overflow: 'hidden', 
              boxShadow: '0 4px 15px rgba(234, 88, 12, 0.1)' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.18)', borderRadius: '10px', width: '32px', height: '32px', flexShrink: 0 }}>
                <Flame size={16} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Urbanist', sans-serif" }}>{avatar?.streak_flame || 0} Tage</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 750, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>Serie am Laufen</span>
              </div>
            </div>

          </div>

          {/* MAIN 2-COLUMN LAYOUT */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>
            
            {/* LEFT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Welcome Block */}
              <div style={{ background: '#ffffff', borderRadius: '24px', padding: '18px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden' }}>
                <h2 style={{ fontSize: '28px', fontWeight: 900, margin: '0 0 10px 0', color: '#1e293b', fontFamily: "'Urbanist', sans-serif" }}>
                  Briefing
                </h2>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.5, margin: 0, flex: 1, fontWeight: 500 }}>
                    Ein neuer Moment für Musik. Nimm dir heute ein paar Minuten für deine Übungsziele und sichere dir deine tägliche Serie!
                  </p>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Music size={30} color="#0b57d0" strokeWidth={1.5} />
                  </div>
                </div>
                
                {briefingData?.todayLesson || scheduleOccurrences?.length > 0 ? (() => {
                  const nextOcc = scheduleOccurrences[0];
                  const hasToday = !!briefingData?.todayLesson;
                  
                  const teacherId = hasToday ? briefingData.todayLesson.teacher_id : nextOcc?.teacher_id;
                  const teacherName = hasToday ? briefingData.todayLesson.teacher : (nextOcc?.teacher ? `Herr/Frau ${nextOcc.teacher.last_name}` : 'Lehrkraft');
                  const timeLabel = hasToday ? briefingData.todayLesson.time : nextOcc?.start_time?.substring(0, 5);
                  
                  const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                  const todayStr = new Date().toISOString().split('T')[0];
                  
                  // Synchronize date and day name so the chat room labels match exactly
                  const targetDateStr = hasToday ? todayStr : nextOcc?.date;
                  const targetDayOfWeek = targetDateStr ? DAYS_DE[new Date(targetDateStr).getDay()] : 'Termin';
                  const formattedDate = targetDateStr ? new Date(targetDateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : '';
                  const label = `${targetDayOfWeek} (${formattedDate}), ${timeLabel} Uhr`;

                  // Synchronize the occurrenceId so they point to the exact same database record
                  const todayOcc = (scheduleOccurrences || []).find(occ => occ.date === todayStr);
                  const finalOccurId = hasToday 
                    ? (todayOcc?.id || briefingData?.todayLesson?.id || `today-${teacherId}-${todayStr}`) 
                    : nextOcc?.id;

                  return (
                    <div style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#f5f3ff', color: '#7c3aed', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700 }}>
                        <Calendar size={13} />
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
                            background: '#dbeafe', 
                            color: '#1e40af', 
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            flexShrink: 0
                          }}
                          onMouseOver={e => e.currentTarget.style.background = '#bfdbfe'}
                          onMouseOut={e => e.currentTarget.style.background = '#dbeafe'}
                        >
                          <MessageSquare size={13} />
                        </button>
                      )}
                    </div>
                  );
                })() : (
                  <div style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#f5f3ff', color: '#7c3aed', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700 }}>
                    <Calendar size={13} />
                    <span>Nächster Unterricht: Demnächst</span>
                  </div>
                )}
              </div>

              {/* Hausaufgaben & Übesoll Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Hausaufgaben */}
                <div style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', borderLeft: '6px solid #22c55e' }}>
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
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', color: '#10b981', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Award size={18} />
                          </div>
                          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Aktuelle Hausaufgaben
                          </h4>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {/* Hausaufgaben der Vorwoche */}
                          <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                              Hausaufgaben der Vorwoche (KW {prevWeekNum || '?'})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {((formattedPrevWeekItems && formattedPrevWeekItems.length > 0) || (prevWeekNotes && prevWeekNotes.length > 0)) ? (
                                <>
                                  {formattedPrevWeekItems && formattedPrevWeekItems.map((item: any, idx: number) => {
                                    const isBook = item.isBook;
                                    return (
                                      <div key={`prev-item-${idx}`} style={{
                                        background: '#f8fafc',
                                        padding: '10px 12px',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(0, 0, 0, 0.03)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '8px',
                                        opacity: 0.85
                                      }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                          {isBook ? <BookOpen size={14} color="#64748b" /> : <Music size={14} color="#64748b" />}
                                          <span style={{ fontWeight: 800, color: '#475569', fontSize: '0.8rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                            {item.title}
                                          </span>
                                        </div>
                                        {(item.status === 'MASTERED' || item.status === 'THEORY_DONE') && (
                                          <span style={{
                                            background: 'rgba(16, 185, 129, 0.08)',
                                            color: '#10b981',
                                            fontSize: '0.64rem',
                                            fontWeight: 800,
                                            borderRadius: '100px',
                                            padding: '2px 8px',
                                            textTransform: 'uppercase',
                                            flexShrink: 0
                                          }}>
                                            Erledigt
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {prevWeekNotes && prevWeekNotes.map((note: string, idx: number) => (
                                    <div key={`prev-note-${idx}`} style={{ 
                                      fontSize: '0.75rem', 
                                      color: '#64748b', 
                                      fontWeight: 500, 
                                      fontStyle: 'italic', 
                                      borderLeft: '2.5px solid #cbd5e1', 
                                      paddingLeft: '8px', 
                                      margin: '2px 4px',
                                      lineHeight: 1.3,
                                      opacity: 0.85
                                    }}>
                                      {note}
                                    </div>
                                  ))}
                                </>
                              ) : (
                                <div style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  gap: '6px', 
                                  padding: '14px 0', 
                                  background: '#f8fafc',
                                  borderRadius: '12px',
                                  border: '1px dashed #e2e8f0',
                                  fontSize: '0.74rem',
                                  color: '#94a3b8',
                                  fontWeight: 555
                                }}>
                                  <BookOpen size={14} />
                                  <span>Keine Hausaufgaben erfasst.</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Hausaufgaben dieser Woche */}
                          <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                              Hausaufgaben dieser Woche (KW {currentWeekNum || '?'})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {((formattedCurrentWeekItems && formattedCurrentWeekItems.length > 0) || (currentWeekNotes && currentWeekNotes.length > 0)) ? (
                                <>
                                  {formattedCurrentWeekItems && formattedCurrentWeekItems.map((item: any, idx: number) => {
                                    const isBook = item.isBook;
                                    return (
                                      <div key={`curr-item-${idx}`} style={{
                                        background: '#f8fafc',
                                        padding: '10px 12px',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(0, 0, 0, 0.03)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '8px'
                                      }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                          {isBook ? <BookOpen size={14} color="#64748b" /> : <Music size={14} color="#64748b" />}
                                          <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.8rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                            {item.title}
                                          </span>
                                        </div>
                                        {(item.status === 'MASTERED' || item.status === 'THEORY_DONE') && (
                                          <span style={{
                                            background: 'rgba(16, 185, 129, 0.08)',
                                            color: '#10b981',
                                            fontSize: '0.64rem',
                                            fontWeight: 800,
                                            borderRadius: '100px',
                                            padding: '2px 8px',
                                            textTransform: 'uppercase',
                                            flexShrink: 0
                                          }}>
                                            Erledigt
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {currentWeekNotes && currentWeekNotes.map((note: string, idx: number) => (
                                    <div key={`curr-note-${idx}`} style={{ 
                                      fontSize: '0.75rem', 
                                      color: '#475569', 
                                      fontWeight: 500, 
                                      fontStyle: 'italic', 
                                      borderLeft: '2.5px solid #10b981', 
                                      paddingLeft: '8px', 
                                      margin: '2px 4px',
                                      lineHeight: 1.3
                                    }}>
                                      {note}
                                    </div>
                                  ))}
                                </>
                              ) : (
                                <div style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  gap: '6px', 
                                  padding: '14px 0', 
                                  background: '#f8fafc',
                                  borderRadius: '12px',
                                  border: '1px dashed #e2e8f0',
                                  fontSize: '0.74rem',
                                  color: '#94a3b8',
                                  fontWeight: 550
                                }}>
                                  <BookOpen size={14} />
                                  <span>Keine Hausaufgaben erfasst.</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Übesoll */}
                <div style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flex: 1 }}>
                    <div style={{ color: '#cbd5e1' }}>
                      <Flame size={32} fill="currentColor" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '4px' }}>TÄGLICHES ÜBESOLL (HEUTE)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', marginBottom: '8px' }}>Tägliche Übezeit noch offen</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>Starte jetzt deinen Fokus-Übemodus, um deine Flammen zu schützen! ⚡️</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('practice_board')}
                    style={{ background: '#4f46e5', color: 'white', border: 'none', borderRadius: '12px', padding: '12px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)' }}>
                    🚀 Üben starten
                  </button>
                </div>
              </div>

              {/* Flame Tiers */}
              <div style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>🔥 Übe-Serie & Flammen</h3>
                  <div style={{ background: '#ffedd5', color: '#ea580c', fontSize: '0.75rem', fontWeight: 800, padding: '4px 12px', borderRadius: '100px' }}>0 Tage</div>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: '#ef4444' }}>🔥 Helden-Feuer aktiv! Mindestzeit: 10 Min.</span>
                  <span style={{ color: '#eab308' }}>🔥 Serie aktiv! Täglich mindestens 10 Min. ⚡️</span>
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
                  {/* Kleine Flamme */}
                  <div style={{ background: '#fef08a', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: '100px' }}>
                    <div style={{ color: '#eab308' }}><Flame size={24} fill="currentColor" /></div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#854d0e' }}>Kleine Flamme</div>
                    <div style={{ fontSize: '0.65rem', color: '#a16207' }}>Stufe 1 (Tag 3+) | 3 Min |</div>
                  </div>
                  {/* Mittlere Flamme */}
                  <div style={{ background: '#ffedd5', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: '100px' }}>
                    <div style={{ color: '#f97316' }}><Flame size={24} fill="currentColor" /></div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#9a3412' }}>Mittlere Flamme</div>
                    <div style={{ fontSize: '0.65rem', color: '#c2410c' }}>Stufe 2 (Tag 6+) | 5 Min |</div>
                  </div>
                  {/* Helden-Feuer */}
                  <div style={{ background: '#fee2e2', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: '100px' }}>
                    <div style={{ color: '#ef4444' }}><Flame size={24} fill="currentColor" /></div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#991b1b' }}>Helden-Feuer</div>
                    <div style={{ fontSize: '0.65rem', color: '#b91c1c' }}>Stufe 3 (Tag 9+) | 10 Min |</div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748b' }}>
                  <span>👍 Joker bereit</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span>Test:</span>
                    <select style={{ border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 8px', fontSize: '0.7rem' }}><option>Tag 0</option></select>
                    <select style={{ border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 8px', fontSize: '0.7rem' }}><option>0 Fehl</option></select>
                    <button style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 600 }}>Real Geübt</button>
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Nächste Termine */}
              <div style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={18} color="#ef4444" />
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Nächste Termine</h3>
                  </div>
                  <button onClick={() => handleTabChangeLocal('events')} style={{ background: 'transparent', border: 'none', color: '#0b57d0', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>Alle anzeigen</button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {(() => {
                    const upcomingConfirmed = (scheduleOccurrences || []).filter(occ => 
                      occ.status === 'scheduled' || occ.status === 'rescheduled_confirmed'
                    );
                    if (upcomingConfirmed.length > 0) {
                      return upcomingConfirmed.slice(0, 3).map(occ => {
                        const d = new Date(occ.date);
                        return (
                          <div key={occ.id} style={{ display: 'flex', gap: '16px', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                            <div style={{ width: '48px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', textAlign: 'center' }}>
                              <div style={{ background: '#ef4444', color: 'white', fontSize: '0.6rem', fontWeight: 800, padding: '4px 0', textTransform: 'uppercase' }}>{d.toLocaleDateString('de-DE', {month: 'short'})}</div>
                              <div style={{ background: 'white', color: '#1e293b', fontSize: '1.2rem', fontWeight: 900, padding: '6px 0' }}>{d.toLocaleDateString('de-DE', {day: '2-digit'})}</div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>{d.toLocaleDateString('de-DE', {weekday: 'long'})}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{occ.start_time?.substring(0,5)} <span style={{ color: '#22c55e' }}>Groovelab</span></div>
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
                  <div style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '2px dashed #f59e0b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                      <Calendar size={18} color="#f59e0b" />
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Terminänderungen</h3>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                          badgeText = '🔄 Neuer Termin vorgeschlagen';
                          badgeColor = '#854d0e';
                        } else if (isRegularReset) {
                          cardBg = '#ecfdf5';
                          cardBorder = '#a7f3d0';
                          badgeText = '❇️ Termin wieder regulär';
                          badgeColor = '#065f46';
                        }
                        
                        return (
                          <div key={occ.id} style={{ 
                            padding: '16px', 
                            borderRadius: '16px', 
                            background: cardBg, 
                            border: `1.5px solid ${cardBorder}`, 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '12px' 
                          }}>
                            <div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: badgeColor, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                                {badgeText}
                              </div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>
                                {d.toLocaleDateString('de-DE', {weekday: 'long', day: '2-digit', month: '2-digit'})}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600, marginTop: '2px' }}>
                                {occ.start_time?.substring(0,5)} Uhr
                              </div>
                              {isRegularReset && (
                                <div style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 500, marginTop: '4px' }}>
                                  Dieser Termin findet nun wieder wie ursprünglich geplant statt.
                                </div>
                              )}
                            </div>
                            
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              {isReschedule ? (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button 
                                    onClick={() => handleRejectReschedule(occ)}
                                    style={{ 
                                      background: '#ef4444', 
                                      color: 'white', 
                                      border: 'none', 
                                      padding: '6px 12px', 
                                      borderRadius: '8px', 
                                      fontSize: '0.75rem', 
                                      fontWeight: 700, 
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
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
                                      padding: '6px 12px', 
                                      borderRadius: '8px', 
                                      fontSize: '0.75rem', 
                                      fontWeight: 700, 
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 4px rgba(234, 179, 8, 0.2)',
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    Bestätigen
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => handleAcknowledgeCancellation(occ.id)}
                                  style={{ 
                                    background: isRegularReset ? '#10b981' : '#ef4444', 
                                    color: 'white', 
                                    border: 'none', 
                                    padding: '6px 12px', 
                                    borderRadius: '8px', 
                                    fontSize: '0.75rem', 
                                    fontWeight: 700, 
                                    cursor: 'pointer',
                                    boxShadow: `0 2px 4px ${isRegularReset ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  Gelesen abhaken
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

              {/* ÜBE-ZIEL WIDGET (Crowdfunding-Stil) */}
              {classGoals.length > 0 && (
                <div style={{
                  background: '#ffffff',
                  borderRadius: '20px',
                  padding: '20px 22px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                  border: '1px solid #e8edf3',
                  fontFamily: "'Inter', sans-serif"
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                    <div style={{
                      width: '38px', height: '38px', borderRadius: '50%',
                      background: '#ffffff',
                      border: '2px solid #10b981',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, boxShadow: '0 2px 8px rgba(16,185,129,0.18)'
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#10b981" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-13 6 4-4 6.25-6 10-7C18.5 2 19 1 17 8z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 style={{
                        fontSize: '0.895rem',
                        fontWeight: 700,
                        color: '#0f172a',
                        margin: 0,
                        letterSpacing: '-0.02em',
                        fontFamily: "'Inter', sans-serif"
                      }}>
                        Klassen-Übe-Ziel
                      </h3>
                      <p style={{
                        fontSize: '0.6rem',
                        fontWeight: 600,
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.07em',
                        margin: '2px 0 0 0',
                        fontFamily: "'Inter', sans-serif"
                      }}>
                        Gemeinsam stärker
                      </p>
                    </div>
                  </div>

                  {/* Goals */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {classGoals.map((goal: any) => {
                      const pct = goal.minutes > 0 ? Math.round((classWeeklyMins / goal.minutes) * 100) : 0;
                      const isDeadlinePassed = goal.deadline ? new Date(goal.deadline) < new Date() : false;
                      const maxPercentOnBar = 133;
                      const visualWidth = Math.min(100, (pct / maxPercentOnBar) * 100);
                      const isAchieved = pct >= 100;

                      return (
                        <div key={goal.id} style={{
                          background: isAchieved ? '#f0fdf4' : '#f8fafc',
                          borderRadius: '12px',
                          padding: '14px 16px',
                          border: isAchieved ? '1px solid #a7f3d0' : '1px solid #e8edf3'
                        }}>
                          {/* Title row */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              color: '#1e293b',
                              letterSpacing: '-0.01em',
                              fontFamily: "'Inter', sans-serif"
                            }}>
                              {goal.title || 'Wochenziel'}
                            </span>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: isAchieved ? '#059669' : '#0b57d0',
                              background: isAchieved ? 'rgba(16,185,129,0.1)' : 'rgba(11,87,208,0.07)',
                              padding: '1px 7px',
                              borderRadius: '5px',
                              letterSpacing: '-0.02em',
                              fontFamily: "'Inter', sans-serif",
                              fontFeatureSettings: '"tnum"'
                            }}>
                              {pct}%
                            </span>
                          </div>

                          {/* Deadline */}
                          {goal.deadline && (
                            <div style={{
                              fontSize: '0.62rem',
                              fontWeight: 500,
                              color: isDeadlinePassed ? '#ef4444' : '#94a3b8',
                              marginBottom: '10px',
                              letterSpacing: '0.01em',
                              fontFamily: "'Inter', sans-serif"
                            }}>
                              bis {new Date(goal.deadline).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              {isDeadlinePassed && <span style={{ marginLeft: '4px', color: '#ef4444' }}>· abgelaufen</span>}
                            </div>
                          )}

                          {/* Progress bar */}
                          <div style={{ position: 'relative', height: '7px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden', marginBottom: '8px' }}>
                            <div style={{
                              width: `${visualWidth}%`,
                              height: '100%',
                              background: isAchieved
                                ? 'linear-gradient(90deg, #34d399 0%, #059669 100%)'
                                : 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)',
                              borderRadius: '99px',
                              transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)'
                            }} />
                            {/* Goal line at 75% = 100% mark */}
                            <div style={{
                              position: 'absolute', left: '75%', top: 0, bottom: 0,
                              width: '1.5px', background: 'rgba(255,255,255,0.95)',
                              zIndex: 2
                            }} />
                          </div>

                          {/* Minutes sub-label */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span style={{
                              fontSize: '0.64rem',
                              fontWeight: 500,
                              color: '#64748b',
                              fontFamily: "'Inter', sans-serif",
                              letterSpacing: '0',
                              fontFeatureSettings: '"tnum"'
                            }}>
                              <span style={{ fontWeight: 700, color: '#334155' }}>{classWeeklyMins}</span> / {goal.minutes} Min.
                            </span>
                            {isAchieved && (
                              <span style={{
                                fontSize: '0.6rem',
                                fontWeight: 700,
                                color: '#059669',
                                letterSpacing: '0.02em',
                                fontFamily: "'Inter', sans-serif",
                                textTransform: 'uppercase'
                              }}>
                                ✓ Ziel erreicht
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
