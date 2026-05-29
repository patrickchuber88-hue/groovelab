import React, { useState, useEffect } from 'react';
import { X, Calendar, Music, Award, Star, Clock, User, Users, Sliders, GraduationCap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import QRCode from 'react-qr-code';
import { 
  ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts';

import { renderInstrumentIcon } from '../utils/instruments';

const brandColor = 'var(--primary-color)';

interface StudentDetailModalProps {
  student: any;
  onClose: () => void;
  onOpenBandProfile?: (band: any) => void;
  activePlatform?: 'secretary' | 'campus' | 'groovelab';
  onSwitchPlatform?: (newPlatform: 'campus' | 'groovelab') => void;
}

const getInstrumentAvatarUrl = (instrument: string | null | undefined): string => {
  if (!instrument) return '/avatars/guitar_avatar.png';
  const inst = instrument.toLowerCase().trim();
  if (inst.includes('guitar') || inst.includes('gitarre')) return '/avatars/guitar_avatar.png';
  if (inst.includes('bass')) return '/avatars/bass_avatar.png';
  if (inst.includes('drum') || inst.includes('schlagzeug')) return '/avatars/drums_avatar.png';
  if (inst.includes('piano') || inst.includes('keys') || inst.includes('klavier') || inst.includes('keyboard')) return '/avatars/piano_avatar.png';
  if (inst.includes('vocal') || inst.includes('gesang') || inst.includes('stimme') || inst.includes('singer')) return '/avatars/vocals_avatar.png';
  if (inst.includes('trompete') || inst.includes('trumpet')) return '/avatars/trumpet_avatar.png';
  if (inst.includes('posaune') || inst.includes('trombone')) return '/avatars/trombone_avatar.png';
  if (inst.includes('horn')) return '/avatars/horn_avatar.png';
  if (inst.includes('cello')) return '/avatars/cello_avatar.png';
  if (inst.includes('geige') || inst.includes('violin') || inst.includes('violine')) return '/avatars/violin_avatar.png';
  if (inst.includes('klarinette') || inst.includes('clarinet')) return '/avatars/clarinet_avatar.png';
  if (inst.includes('querflöte') || inst.includes('flute')) return '/avatars/flute_avatar.png';
  if (inst.includes('saxofon') || inst.includes('saxophone') || inst.includes('sax')) return '/avatars/saxophone_avatar.png';
  return '/avatars/guitar_avatar.png';
};

const getDefaultMusicianAvatarUrl = (instrument: string | null | undefined, role: string | null | undefined): string => {
  const isTeacher = (role || '').toLowerCase() === 'teacher' || (role || '').toLowerCase() === 'admin';
  if (isTeacher) return '/avatar_teacher_male.jpg';
  
  if (!instrument) return '/avatars/student_eguitar_1.png';
  const inst = instrument.toLowerCase().trim();
  if (inst.includes('guitar') || inst.includes('gitarre')) return '/avatars/student_boy_black_guitar.png';
  if (inst.includes('bass')) return '/avatars/student_boy_black_bass.png';
  if (inst.includes('drum') || inst.includes('schlagzeug')) return '/avatars/student_boy_black_drums.png';
  if (inst.includes('piano') || inst.includes('keys') || inst.includes('klavier') || inst.includes('keyboard')) return '/avatars/student_boy_black_piano.png';
  if (inst.includes('vocal') || inst.includes('gesang') || inst.includes('stimme') || inst.includes('singer')) return '/avatars/student_boy_red_vocals.png';
  return '/avatars/student_eguitar_1.png';
};

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ student, onClose, onOpenBandProfile, activePlatform, onSwitchPlatform }) => {
  const [localTab, setLocalTab] = useState<'campus' | 'groovelab'>(activePlatform === 'groovelab' ? 'groovelab' : 'campus');
  const isPlatformCampus = localTab === 'campus';

  let displayAvatarSrc = student.photo_url || '/avatar_ghost.jpg';
  if (isPlatformCampus) {
    displayAvatarSrc = getInstrumentAvatarUrl(student.instrument);
  } else {
    const isInstrumentAvatar = student.photo_url && (
      student.photo_url.includes('avatar.png') || 
      student.photo_url.includes('guitar_avatar') || 
      student.photo_url.includes('bass_avatar') || 
      student.photo_url.includes('drums_avatar') || 
      student.photo_url.includes('piano_avatar') || 
      student.photo_url.includes('vocals_avatar') || 
      student.photo_url.includes('trumpet_avatar') || 
      student.photo_url.includes('trombone_avatar') || 
      student.photo_url.includes('horn_avatar') || 
      student.photo_url.includes('cello_avatar') || 
      student.photo_url.includes('violin_avatar') || 
      student.photo_url.includes('clarinet_avatar') || 
      student.photo_url.includes('flute_avatar') || 
      student.photo_url.includes('saxophone_avatar')
    );
    if (!student.photo_url || isInstrumentAvatar || student.photo_url === '/avatar_ghost.jpg') {
      displayAvatarSrc = getDefaultMusicianAvatarUrl(student.instrument, student.role);
    }
  }

  useEffect(() => {
    if (activePlatform) {
      setLocalTab(activePlatform === 'groovelab' ? 'groovelab' : 'campus');
    }
  }, [activePlatform]);

  const handleTabChange = (tab: 'campus' | 'groovelab') => {
    setLocalTab(tab);
    if (onSwitchPlatform) {
      onSwitchPlatform(tab);
    }
  };

  const [skills, setSkills] = useState<any[]>([]);
  const [bands, setBands] = useState<any[]>([]);
  const [vocalsSongIds, setVocalsSongIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showFullPhoto, setShowFullPhoto] = useState(false);
  const [sessionsList, setSessionsList] = useState<any[]>([]);
  const [planningList, setPlanningList] = useState<any[]>([]);
  const [isCampusActive, setIsCampusActive] = useState<boolean>(student.is_campus_active ?? false);
  const [isGroovelabActive, setIsGroovelabActive] = useState<boolean>(student.is_groovelab_active ?? false);
  const [isPremiumActive, setIsPremiumActive] = useState<boolean>(false);
  const [lessonDuration, setLessonDuration] = useState<number>(student.lesson_duration ?? 45);

  // Lehrwerke assigned to student states
  const [globalLehrwerke, setGlobalLehrwerke] = useState<any[]>([]);
  const [assignedLehrwerke, setAssignedLehrwerke] = useState<any[]>([]);
  const [activeLehrwerkId, setActiveLehrwerkId] = useState<string | null>(null);
  const [activePageNumber, setActivePageNumber] = useState<number | null>(null);
  const [pageNoteText, setPageNoteText] = useState<string>('');

  useEffect(() => {
    // Load global Lehrwerke
    try {
      const stored = localStorage.getItem('campus_lehrwerke');
      if (stored) {
        setGlobalLehrwerke(JSON.parse(stored));
      } else {
        // Default library
        const defaults = [
          { id: '1', title: 'GrooveLab Guitar Vol. 1', instrument: 'Guitar', type: 'Standardwerk für E-Gitarre', progress: 60, emoji: '🎸', color: '#34a853', totalPages: 50 },
          { id: '2', title: 'GrooveLab Drums Vol. 1', instrument: 'Drums', type: 'Standardwerk für Schlagzeug', progress: 45, emoji: '🥁', color: '#4f46e5', totalPages: 50 },
          { id: '3', title: 'GrooveLab Bass Vol. 1', instrument: 'Bass', type: 'Standardwerk für E-Bass', progress: 30, emoji: '🎸', color: '#f59e0b', totalPages: 50 },
          { id: '4', title: 'GrooveLab Keys Vol. 1', instrument: 'Keys', type: 'Standardwerk für Keyboard', progress: 80, emoji: '🎹', color: '#ec4899', totalPages: 50 },
          { id: '5', title: 'GrooveLab Vocals Vol. 1', instrument: 'Vocals', type: 'Standardwerk für Gesang', progress: 50, emoji: '🎤', color: '#3b82f6', totalPages: 50 }
        ];
        setGlobalLehrwerke(defaults);
      }
    } catch (e) {}

    // Load student assigned progress
    try {
      const stored = localStorage.getItem('student_lehrwerke_progress');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Filter by student.id
        const filtered = parsed.filter((item: any) => item.studentId === student.id);
        setAssignedLehrwerke(filtered);
      }
    } catch (e) {}
  }, [student.id]);

  const handleAssignLehrwerk = (lehrwerkId: string) => {
    if (!lehrwerkId) return;
    const book = globalLehrwerke.find(b => b.id === lehrwerkId);
    if (!book) return;

    try {
      const stored = localStorage.getItem('student_lehrwerke_progress');
      const parsed = stored ? JSON.parse(stored) : [];
      
      // Check if already assigned
      if (parsed.some((item: any) => item.studentId === student.id && item.lehrwerkId === lehrwerkId)) {
        return;
      }

      const newAssignment = {
        studentId: student.id,
        lehrwerkId: lehrwerkId,
        assignedAt: new Date().toISOString(),
        pageStates: {}
      };

      const updated = [...parsed, newAssignment];
      localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
      setAssignedLehrwerke(updated.filter((item: any) => item.studentId === student.id));
      setActiveLehrwerkId(lehrwerkId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUnassignLehrwerk = (lehrwerkId: string) => {
    if (!window.confirm('Möchtest du dieses Lehrwerk wirklich vom Profil des Schülers entfernen? Alle Lernpfad-Fortschritte gehen verloren.')) return;
    try {
      const stored = localStorage.getItem('student_lehrwerke_progress');
      if (stored) {
        const parsed = JSON.parse(stored);
        const updated = parsed.filter((item: any) => !(item.studentId === student.id && item.lehrwerkId === lehrwerkId));
        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
        setAssignedLehrwerke(updated.filter((item: any) => item.studentId === student.id));
        if (activeLehrwerkId === lehrwerkId) {
          setActiveLehrwerkId(null);
          setActivePageNumber(null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdatePageStatus = (lehrwerkId: string, pageNum: number, status: 'locked' | 'homework' | 'mastered' | 'purple', notes?: string) => {
    try {
      // Manage global page status (purple)
      const globalStored = localStorage.getItem('campus_lehrwerke');
      if (globalStored) {
        const books = JSON.parse(globalStored);
        const updatedBooks = books.map((b: any) => {
          if (b.id === lehrwerkId) {
            const globalPageStates = b.globalPageStates || {};
            if (status === 'purple') {
              globalPageStates[pageNum] = 'purple';
            } else {
              delete globalPageStates[pageNum];
            }
            return { ...b, globalPageStates };
          }
          return b;
        });
        localStorage.setItem('campus_lehrwerke', JSON.stringify(updatedBooks));
        setGlobalLehrwerke(updatedBooks);
      }

      const stored = localStorage.getItem('student_lehrwerke_progress');
      const parsed = stored ? JSON.parse(stored) : [];
      
      const updated = parsed.map((item: any) => {
        if (item.studentId === student.id && item.lehrwerkId === lehrwerkId) {
          const currentPageState = item.pageStates[pageNum] || {};
          return {
            ...item,
            pageStates: {
              ...item.pageStates,
              [pageNum]: {
                ...currentPageState,
                status: status === 'purple' ? 'locked' : status,
                notes: notes !== undefined ? notes : currentPageState.notes || '',
                updatedAt: new Date().toISOString()
              }
            }
          };
        }
        return item;
      });

      localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
      setAssignedLehrwerke(updated.filter((item: any) => item.studentId === student.id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleCampus = async (newVal: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_campus_active: newVal })
        .eq('id', student.id);
      if (error) throw error;
      setIsCampusActive(newVal);
      student.is_campus_active = newVal;
    } catch (err: any) {
      alert('Fehler beim Aktualisieren des Campus-Zugangs: ' + err.message);
    }
  };

  const handleToggleGroovelab = async (newVal: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_groovelab_active: newVal })
        .eq('id', student.id);
      if (error) throw error;
      setIsGroovelabActive(newVal);
      student.is_groovelab_active = newVal;
    } catch (err: any) {
      alert('Fehler beim Aktualisieren des GrooveLab-Zugangs: ' + err.message);
    }
  };

  const handleUpdateDuration = async (duration: number) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ lesson_duration: duration })
        .eq('id', student.id);
      if (error) throw error;
      setLessonDuration(duration);
      student.lesson_duration = duration;
    } catch (err: any) {
      alert('Fehler beim Aktualisieren der Unterrichtsform: ' + err.message);
    }
  };

  const handleTogglePremium = async (newVal: boolean) => {
    try {
      const { error } = await supabase
        .from('premium_status')
        .upsert({ 
          student_id: student.id, 
          is_premium_active: newVal,
          updated_at: new Date().toISOString()
        });
      if (error) throw error;
      
      // Also update users.is_premium_user
      await supabase
        .from('users')
        .update({ is_premium_user: newVal })
        .eq('id', student.id);

      setIsPremiumActive(newVal);
      student.is_premium_user = newVal;
    } catch (err: any) {
      alert('Fehler beim Aktualisieren des Premium-Status: ' + err.message);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      // Fetch skills
      const { data: skillsData } = await supabase
        .from('user_song_skills')
        .select('*, songs(*)')
        .eq('user_id', student.id);
      setSkills(skillsData || []);

      // Fetch enriched bands
      const { data: bandsData } = await supabase
        .from('band_members')
        .select(`
          bands (
            *,
            band_members (
              *,
              users (*)
            ),
            band_songs (
              *,
              songs (*)
            )
          )
        `)
        .eq('user_id', student.id);
      
      const uniqueBandsList: any[] = [];
      const seenBandIds = new Set();
      (bandsData || []).forEach((m: any) => {
        const b = Array.isArray(m.bands) ? m.bands[0] : m.bands;
        if (b && !seenBandIds.has(b.id)) {
          seenBandIds.add(b.id);
          uniqueBandsList.push(b);
        }
      });
      setBands(uniqueBandsList);

      // Fetch vocals slots (formation singing)
      const { data: slotsData } = await supabase
        .from('band_song_slots')
        .select('*, band_songs(*)')
        .eq('user_id', student.id);
      
      const vIds = new Set<string>();
      (slotsData || []).forEach((s: any) => {
        const isVocal = (s.instrument || '').toLowerCase().includes('vocal') || (s.instrument || '').toLowerCase().includes('gesang');
        const songId = s.band_songs?.song_id;
        if (isVocal && s.status !== 'declined' && songId) {
          vIds.add(String(songId));
        }
      });
      setVocalsSongIds(vIds);

      // Fetch sessions
      const { data: sessData } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', student.id)
        .order('check_in_time', { ascending: false });
      setSessionsList(sessData || []);

      // Fetch lab_planning slots
      const { data: planData } = await supabase
        .from('lab_planning')
        .select('*')
        .eq('user_id', student.id);
      setPlanningList(planData || []);

      // Fetch premium status
      const { data: premiumInfo } = await supabase
        .from('premium_status')
        .select('is_premium_active')
        .eq('student_id', student.id)
        .maybeSingle();
      setIsPremiumActive(premiumInfo?.is_premium_active ?? false);

      setLoading(false);
    };
    fetchData();
  }, [student.id]);



  const memberSince = new Date(student.created_at).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  const weekSessions = (() => {
    if (loading || !planningList || planningList.length === 0) return [];

    const dayOrder: { [day: string]: number } = { 'Mo': 1, 'Di': 2, 'Mi': 3, 'Do': 4, 'Fr': 5, 'Sa': 6, 'So': 7 };
    const slotsByDay: { [day: string]: string[] } = {};
    
    planningList.forEach(s => {
      if (!slotsByDay[s.day]) slotsByDay[s.day] = [];
      slotsByDay[s.day].push(s.time);
    });

    const presenceList: { dayStr: string; rangeStr: string; sortKey: number }[] = [];

    Object.entries(slotsByDay).forEach(([day, times]) => {
      times.sort();

      const add15 = (t: string) => {
        let [h, m] = t.split(':').map(Number);
        m += 15;
        if (m >= 60) { h += 1; m = 0; }
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      };

      const toMin = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };

      const ranges: { start: string; end: string }[] = [];
      let currentRange: { start: string; end: string } | null = null;

      times.forEach(t => {
        if (!currentRange) {
          currentRange = { start: t, end: add15(t) };
        } else {
          if (toMin(t) === toMin(currentRange.end)) {
            currentRange.end = add15(t);
          } else {
            ranges.push(currentRange);
            currentRange = { start: t, end: add15(t) };
          }
        }
      });
      if (currentRange) ranges.push(currentRange);

      ranges.forEach(r => {
        presenceList.push({
          dayStr: day,
          rangeStr: `${r.start} Uhr - ${r.end} Uhr`,
          sortKey: (dayOrder[day] || 99) * 10000 + toMin(r.start)
        });
      });
    });

    presenceList.sort((a, b) => a.sortKey - b.sortKey);
    return presenceList;
  })();


  // Grouping logic for songs
  const groupedSongs = skills.reduce((acc: any, s: any) => {
    const songId = s.song_id;
    const level = s.difficulty_level;
    const key = `${songId}_${level}`;
    if (!acc[key]) {
      acc[key] = {
        id: songId,
        title: s.songs?.title,
        artist: s.songs?.artist,
        level: level,
        instruments: []
      };
    }
    acc[key].instruments.push({
      name: s.instrument,
      part_number: s.part_number || 1,
      progress: s.is_stage_ready ? 100 : (s.progress_percent || 0),
      is_stage_ready: s.is_stage_ready
    });
    return acc;
  }, {});

  const songsArray = Object.values(groupedSongs).map((s: any) => {
    const getBaseInst = (name: string) => {
      const n = (name || '').toLowerCase();
      if (n.includes('gitarre') || n.includes('guitar')) return 'Guitar';
      if (n.includes('drums') || n.includes('schlagzeug')) return 'Drums';
      if (n.includes('piano') || n.includes('keys')) return 'Piano';
      if (n.includes('bass')) return 'Bass';
      return name;
    };
    const orderMap: Record<string, number> = { 'Guitar': 1, 'Drums': 2, 'Piano': 3, 'Bass': 4 };
    const sortedInstruments = [...s.instruments].sort((a, b) => {
      const idxA = orderMap[getBaseInst(a.name)] || 99;
      const idxB = orderMap[getBaseInst(b.name)] || 99;
      if (idxA !== idxB) return idxA - idxB;
      return (a.part_number || 1) - (b.part_number || 1);
    });
    return { ...s, instruments: sortedInstruments };
  });
  const practiceBoard = songsArray.filter((s: any) => s.instruments.some((i: any) => i.progress > 0 && !i.is_stage_ready));
  const repertoire = songsArray.filter((s: any) => s.instruments.some((i: any) => i.is_stage_ready));

  const studentRadarData = (() => {
    const radarBase: Record<string, number> = { Guitar: 0, Bass: 0, Drums: 0, Keys: 0, Vocals: 0 };
    skills.forEach((s: any) => {
      const sInst = s.instrument?.toLowerCase();
      if (!sInst) return;
      
      let target: string | null = null;
      if (sInst === 'guitar' || sInst === 'e-gitarre') target = 'Guitar';
      else if (sInst === 'bass' || sInst === 'e-bass') target = 'Bass';
      else if (sInst === 'drums' || sInst === 'e-drums') target = 'Drums';
      else if (sInst === 'keys' || sInst === 'piano' || sInst === 'e-piano') target = 'Keys';
      else if (sInst === 'vocals' || sInst === 'gesang') target = 'Vocals';
      
      if (target && radarBase[target] !== undefined) {
        const prog = s.progress_percent || 0;
        const xp = (s.is_stage_ready || prog === 100) ? 500 : prog * 2;
        radarBase[target] += xp;
      }
    });
    return Object.entries(radarBase).map(([inst, xp]) => ({ instrument: inst, xp }));
  })();

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(242, 242, 247, 0.65)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="glass-panel animation-slide-up" style={{ background: 'rgba(255, 255, 255, 0.95)', padding: '32px', borderRadius: '32px', maxWidth: '920px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative', border: '1px solid rgba(0, 0, 0, 0.05)', boxShadow: '0 30px 60px rgba(0, 0, 0, 0.08)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
          <X size={20} />
        </button>

        {/* iOS-style Segmented Control Switch */}
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'flex-start' }}>
          <div style={{ 
            background: 'rgba(120, 120, 128, 0.12)', 
            borderRadius: '99px', 
            padding: '2px', 
            display: 'inline-flex', 
            gap: '2px' 
          }}>
            <button
              onClick={() => handleTabChange('campus')}
              style={{
                border: 'none',
                borderRadius: '99px',
                padding: '8px 20px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                background: localTab === 'campus' ? '#ffffff' : 'transparent',
                color: localTab === 'campus' ? '#000000' : '#636366',
                boxShadow: localTab === 'campus' ? '0 1px 3px rgba(0,0,0,0.12), 0 1px 1px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              <GraduationCap size={16} />
              <span>Campus</span>
            </button>
            <button
              onClick={() => handleTabChange('groovelab')}
              style={{
                border: 'none',
                borderRadius: '99px',
                padding: '8px 20px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                background: localTab === 'groovelab' ? '#ffffff' : 'transparent',
                color: localTab === 'groovelab' ? '#000000' : '#636366',
                boxShadow: localTab === 'groovelab' ? '0 1px 3px rgba(0,0,0,0.12), 0 1px 1px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              <Music size={16} />
              <span>GrooveLab</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '40px', alignItems: 'start', marginTop: '20px' }}>
          
          {/* LEFT COLUMN: Profile Header + Campus Core Data Lists */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Profile Info Header (Left aligned) */}
            <div style={{ display: 'flex', gap: '28px', alignItems: 'flex-start', width: '100%', flexWrap: 'wrap' }}>
              <div 
                onClick={() => setShowFullPhoto(true)}
                style={{ width: '120px', height: '120px', borderRadius: '28px', overflow: 'hidden', boxShadow: '0 10px 28px rgba(0,0,0,0.08)', border: '4px solid white', flexShrink: 0, cursor: 'pointer', transition: 'all 0.2s ease' }}
                className="hover-scale"
              >
                <img src={displayAvatarSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', margin: 0, lineHeight: 1.1 }}>{student.first_name} {student.last_name}</h2>
                <div style={{ display: 'flex', gap: '16px', marginTop: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                    <Calendar size={14} /> Member seit {memberSince}
                  </div>

                  <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', padding: '4px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 950, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)' }}>
                    <Star size={12} fill="white" /> {(skills.filter(s => {
                      const isVocal = (s.instrument || '').toLowerCase().includes('vocal') || (s.instrument || '').toLowerCase().includes('gesang');
                      return s.is_stage_ready && !isVocal;
                    }).length + vocalsSongIds.size) * 100} XP
                  </div>
                </div>
                
                {/* Activation badges */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  {isCampusActive && (
                    <span style={{ background: '#e6f4ea', color: '#137333', padding: '4px 10px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 800 }}>
                      🎓 Campus
                    </span>
                  )}
                  {isGroovelabActive && (
                    <span style={{ background: '#feefe3', color: '#b45309', padding: '4px 10px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 800 }}>
                      🎸 GrooveLab
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* View Specific Left Content */}
            {isPlatformCampus ? (
              // ---------------- CAMPUS SPECIFIC VIEW DATA LISTS (LEFT) ----------------
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', marginTop: '10px' }}>
                <section>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', marginBottom: '16px' }}>
                    Stundenplan & Unterricht
                  </h3>
                  <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }}>
                    Keine Unterrichtsstunden im Stundenplan eingetragen.
                  </div>
                </section>

                <section>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', marginBottom: '16px' }}>
                    Meisterwerk-Fortschrittsmatrix
                  </h3>
                  <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }}>
                    Noch keine Einträge in der Fortschrittsmatrix vorhanden.
                  </div>
                </section>

                <section>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', marginBottom: '16px' }}>
                    Campus Verfügbarkeit
                  </h3>
                  <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }}>
                    Keine Verfügbarkeiten eingetragen.
                  </div>
                </section>

                <section style={{ borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📚</span> Lehrwerke & Lernpfad
                  </h3>

                  {/* Dropdown to assign a textbook */}
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: '#f8fafc', padding: '12px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <select 
                      onChange={(e) => {
                        handleAssignLehrwerk(e.target.value);
                        e.target.value = '';
                      }}
                      defaultValue=""
                      style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '0.85rem' }}
                    >
                      <option value="" disabled>Lehrwerk aus der Mediathek hinzufügen...</option>
                      {globalLehrwerke
                        .filter(g => !assignedLehrwerke.some(a => a.lehrwerkId === g.id))
                        .map(g => (
                          <option key={g.id} value={g.id}>{g.emoji} {g.title} ({g.instrument})</option>
                        ))
                      }
                    </select>
                  </div>

                  {/* Assigned textbooks list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {assignedLehrwerke.map(assigned => {
                      const book = globalLehrwerke.find(g => g.id === assigned.lehrwerkId) || {
                        title: 'Unbekanntes Buch',
                        type: '',
                        totalPages: 50,
                        emoji: '📚',
                        color: brandColor
                      };
                      const isExpanded = activeLehrwerkId === assigned.lehrwerkId;
                      const pages = Array.from({ length: book.totalPages || 50 }, (_, i) => i + 1);

                      return (
                        <div key={assigned.lehrwerkId} style={{ border: '1px solid #e2e8f0', borderRadius: '20px', overflow: 'hidden', background: 'white' }}>
                          {/* Header of textbook */}
                          <div 
                            onClick={() => {
                              setActiveLehrwerkId(isExpanded ? null : assigned.lehrwerkId);
                              setActivePageNumber(null);
                            }}
                            style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', background: isExpanded ? `${book.color}05` : '#f8fafc', cursor: 'pointer', transition: 'all 0.2s', borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none' }}
                          >
                            <div style={{ width: '36px', height: '48px', background: book.color || brandColor, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '16px', fontWeight: 900, boxShadow: '0 2px 6px rgba(0,0,0,0.05)', flexShrink: 0 }}>
                              <span style={{ margin: 'auto' }}>{book.emoji || '📚'}</span>
                            </div>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>{book.title}</h4>
                              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{book.type || 'Lernpfad'} • {book.totalPages || 50} Seiten</p>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnassignLehrwerk(assigned.lehrwerkId);
                              }}
                              style={{ background: '#fff1f2', border: 'none', color: '#ef4444', fontSize: '0.75rem', fontWeight: 800, padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}
                            >
                              Entfernen
                            </button>
                          </div>

                          {/* Expanded learning path grid */}
                          {isExpanded && (
                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 850, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schüler-Lernpfad (Klicke auf eine Seite):</span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {pages.map(num => {
                                  const pageState = assigned.pageStates[num] || { status: 'locked' };
                                  const book = globalLehrwerke.find(g => g.id === assigned.lehrwerkId) || {};
                                  const isPurple = book.globalPageStates?.[num] === 'purple';
                                  const status = isPurple ? 'purple' : (pageState.status || 'locked');
                                  
                                  let borderColor = '#ef4444'; // locked = rot
                                  let bg = '#fef2f2';
                                  let textColor = '#991b1b';
                                  
                                  if (status === 'homework') {
                                    borderColor = '#f59e0b'; // homework = gelb
                                    bg = '#fffbeb';
                                    textColor = '#92400e';
                                  } else if (status === 'mastered') {
                                    borderColor = '#10b981'; // mastered = grün
                                    bg = '#f0fdf4';
                                    textColor = '#166534';
                                  } else if (status === 'purple') {
                                    borderColor = '#af52de'; // purple = lila
                                    bg = '#f5f3ff';
                                    textColor = '#6d28d9';
                                  }

                                  const isSelected = activePageNumber === num;

                                  return (
                                    <button
                                      key={num}
                                      onClick={() => {
                                        setActivePageNumber(isSelected ? null : num);
                                        setPageNoteText(pageState.notes || '');
                                      }}
                                      style={{
                                        width: '38px',
                                        height: '38px',
                                        borderRadius: '50%',
                                        border: `2px solid ${borderColor}`,
                                        background: isSelected ? borderColor : bg,
                                        color: isSelected ? 'white' : textColor,
                                        fontWeight: 900,
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.15s',
                                        boxShadow: isSelected ? `0 4px 10px ${borderColor}40` : 'none',
                                        transform: isSelected ? 'scale(1.1)' : 'none'
                                      }}
                                      title={pageState.notes ? `Notiz: ${pageState.notes}` : `Seite ${num}`}
                                    >
                                      {num}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Interactive Page Actions overlay/panel */}
                              {activePageNumber !== null && (() => {
                                const pageState = assigned.pageStates[activePageNumber] || { status: 'locked' };
                                const book = globalLehrwerke.find(g => g.id === assigned.lehrwerkId) || {};
                                const isPurple = book.globalPageStates?.[activePageNumber] === 'purple';
                                const status = isPurple ? 'purple' : (pageState.status || 'locked');

                                return (
                                  <div style={{ 
                                    background: 'rgba(255, 255, 255, 0.85)', 
                                    backdropFilter: 'blur(20px)',
                                    WebkitBackdropFilter: 'blur(20px)',
                                    padding: '24px', 
                                    borderRadius: '24px', 
                                    border: '1px solid rgba(0, 0, 0, 0.08)', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: '20px', 
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.04)', 
                                    animation: 'fadeIn 0.2s ease' 
                                  }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '1.1rem' }}>⚙️</span>
                                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1c1c1e', letterSpacing: '-0.01em' }}>
                                          Seite {activePageNumber} dokumentieren
                                        </span>
                                      </div>
                                      <button 
                                        onClick={() => setActivePageNumber(null)}
                                        style={{ 
                                          background: 'rgba(120, 120, 128, 0.08)', 
                                          border: 'none', 
                                          color: '#007aff', 
                                          cursor: 'pointer', 
                                          fontSize: '0.82rem', 
                                          fontWeight: 700,
                                          padding: '6px 14px',
                                          borderRadius: '100px',
                                          transition: 'background 0.2s'
                                        }}
                                      >
                                        Fertig
                                      </button>
                                    </div>

                                    {/* Beautiful iOS Pill Segmented Control */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                      <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
                                      <div style={{ 
                                        display: 'flex', 
                                        background: 'rgba(120, 120, 128, 0.08)', 
                                        padding: '4px', 
                                        borderRadius: '14px',
                                        gap: '2px'
                                      }}>
                                        {[
                                          { key: 'locked', label: 'Offen', activeBg: '#ff3b30' },
                                          { key: 'homework', label: 'Hausaufgabe', activeBg: '#ff9500' },
                                          { key: 'mastered', label: 'Gemeistert', activeBg: '#34c759' },
                                          { key: 'purple', label: 'Inhalt / Info', activeBg: '#af52de' }
                                        ].map(opt => {
                                          const isActive = status === opt.key;
                                          return (
                                            <button
                                              key={opt.key}
                                              type="button"
                                              onClick={() => handleUpdatePageStatus(assigned.lehrwerkId, activePageNumber, opt.key as any, pageNoteText)}
                                              style={{
                                                flex: 1,
                                                padding: '10px 4px',
                                                borderRadius: '11px',
                                                border: 'none',
                                                background: isActive ? opt.activeBg : 'transparent',
                                                color: isActive ? 'white' : '#3a3a3c',
                                                fontWeight: isActive ? 800 : 600,
                                                fontSize: '0.8rem',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                                              }}
                                            >
                                              {opt.label}
                                            </button>
                                          );
                                        })}
                                      </div>
                                      <span style={{ fontSize: '0.72rem', color: '#8e8e93', fontStyle: 'italic', marginTop: '2px' }}>
                                        ℹ️ Inhalt / Info gilt global für alle Schüler. Die anderen States gelten nur für diesen Schüler.
                                      </span>
                                    </div>

                                    {/* Page Notes */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                      <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notizen zur Seite</label>
                                      <div style={{ display: 'flex', gap: '8px' }}>
                                        <input 
                                          placeholder="z.B. Intro-Rhythmus üben, Tempo 90 bpm..."
                                          value={pageNoteText}
                                          onChange={(e) => setPageNoteText(e.target.value)}
                                          style={{ 
                                            flex: 1, 
                                            padding: '12px 16px', 
                                            borderRadius: '12px', 
                                            border: '1px solid rgba(0, 0, 0, 0.12)', 
                                            background: '#ffffff',
                                            fontSize: '0.88rem', 
                                            fontWeight: 500,
                                            outline: 'none',
                                            transition: 'border-color 0.2s'
                                          }}
                                          onFocus={(e) => e.target.style.borderColor = '#007aff'}
                                          onBlur={(e) => e.target.style.borderColor = 'rgba(0, 0, 0, 0.12)'}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleUpdatePageStatus(assigned.lehrwerkId, activePageNumber, status, pageNoteText);
                                            alert('Notiz gespeichert!');
                                          }}
                                          style={{ 
                                            background: '#007aff', 
                                            color: 'white', 
                                            border: 'none', 
                                            padding: '12px 20px', 
                                            borderRadius: '12px', 
                                            fontWeight: 700, 
                                            fontSize: '0.88rem', 
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 12px rgba(0,122,255,0.2)'
                                          }}
                                        >
                                          Sichern
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {assignedLehrwerke.length === 0 && (
                      <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '20px', border: '1px dashed #cbd5e1', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }}>
                        Diesem Schüler wurden noch keine Lehrwerke zugewiesen. Wähle oben ein Buch aus der Mediathek aus.
                      </div>
                    )}
                  </div>
                </section>
              </div>
            ) : (
              // ---------------- GROOVELAB SPECIFIC VIEW DATA LISTS (LEFT) ----------------
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', marginTop: '10px' }}>
                {/* Üben Board */}
                <section>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', color: '#3b82f6', letterSpacing: '0.1em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} /> Üben Board
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {practiceBoard.map((s: any) => (
                      <div key={s.id + s.level} style={{ background: '#f8fafc', padding: '16px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>{s.artist}</div>
                            <div style={{ fontWeight: 900, fontSize: '1rem', color: '#1e293b' }}>{s.title}</div>
                          </div>
                          <div style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 900, background: s.level === 'starter' ? '#fffbeb' : '#eff6ff', color: s.level === 'starter' ? '#b45309' : '#2563eb' }}>
                            {s.level === 'starter' ? '🚀 STARTER' : '⚡ PRO'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {s.instruments.map((inst: any, idx: number) => (
                            <div 
                              key={idx} 
                              title={`${inst.name}${inst.part_number > 1 || (s.instruments.filter((i:any) => i.name === inst.name).length > 1) ? ` ${inst.part_number}` : ''}`}
                              style={{ 
                                fontSize: '0.8rem', 
                                fontWeight: 800, 
                                padding: '4px 8px', 
                                borderRadius: '8px', 
                                background: 'white', 
                                border: '1px solid #e2e8f0', 
                                color: inst.progress === 100 ? '#10b981' : (inst.progress > 0 ? brandColor : '#94a3b8'),
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'help'
                              }}
                            >
                              <span>{renderInstrumentIcon(inst.name, undefined, 14)}</span>
                              <span>{inst.progress}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {practiceBoard.length === 0 && !loading && (
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Keine Songs am Board.</div>
                    )}
                  </div>
                </section>

                {/* Repertoire */}
                <section>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', color: '#10b981', letterSpacing: '0.1em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Award size={16} /> Repertoir
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {repertoire.map((s: any) => (
                      <div key={s.id + s.level} style={{ background: '#f0fdf4', padding: '16px', borderRadius: '20px', border: '1px solid #bbf7d0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#15803d', opacity: 0.7, textTransform: 'uppercase' }}>{s.artist}</div>
                            <div style={{ fontWeight: 900, fontSize: '1rem', color: '#166534' }}>{s.title}</div>
                          </div>
                          <div style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 900, background: '#dcfce7', color: '#15803d' }}>
                            {s.level === 'starter' ? '🚀 STARTER' : '⚡ PRO'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {s.instruments.filter((i: any) => i.is_stage_ready).map((inst: any, idx: number) => (
                            <div 
                              key={idx} 
                              title={`${inst.name}${inst.part_number > 1 || (s.instruments.filter((i:any) => i.name === inst.name).length > 1) ? ` ${inst.part_number}` : ''}`}
                              style={{ 
                                fontSize: '0.8rem', 
                                fontWeight: 800, 
                                padding: '4px 8px', 
                                borderRadius: '8px', 
                                background: 'white', 
                                border: '1px solid #bbf7d0', 
                                color: '#10b981',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'help'
                              }}
                            >
                              <span>{renderInstrumentIcon(inst.name, undefined, 14)}</span>
                              <span>100%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {repertoire.length === 0 && !loading && (
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Noch kein Repertoir.</div>
                    )}
                  </div>
                </section>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Permanent Sidebar Widgets pushed perfectly to the top */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            
            {/* Module & Einstellungen (Switched settings card) */}
            <section style={{ 
              background: '#ffffff', 
              borderRadius: '24px', 
              padding: '24px', 
              border: '1.5px solid #f1f5f9',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)'
            }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={16} style={{ color: '#64748b' }} /> Module & Einstellungen
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>Campus-Modul aktivieren</span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Stundenplan & meisterwerke</span>
                  </div>
                  <button 
                    onClick={() => handleToggleCampus(!isCampusActive)}
                    style={{
                      width: '46px',
                      height: '26px',
                      borderRadius: '99px',
                      background: isCampusActive ? '#22c55e' : '#e2e8f0',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background 0.25s ease',
                      padding: 0
                    }}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#ffffff',
                      position: 'absolute',
                      top: '3px',
                      left: isCampusActive ? '23px' : '3px',
                      transition: 'left 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                    }} />
                  </button>
                </div>

                <div style={{ height: '1px', background: '#f1f5f9' }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>GrooveLab-Modul aktivieren</span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Songbooks, Bands & üben</span>
                  </div>
                  <button 
                    onClick={() => handleToggleGroovelab(!isGroovelabActive)}
                    style={{
                      width: '46px',
                      height: '26px',
                      borderRadius: '99px',
                      background: isGroovelabActive ? '#007aff' : '#e2e8f0',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background 0.25s ease',
                      padding: 0
                    }}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#ffffff',
                      position: 'absolute',
                      top: '3px',
                      left: isGroovelabActive ? '23px' : '3px',
                      transition: 'left 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                    }} />
                  </button>
                </div>

                <div style={{ height: '1px', background: '#f1f5f9' }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>Unterrichtsform (Dauer)</span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Wähle 30 oder 45 min aus</span>
                  </div>
                  <select
                    value={lessonDuration}
                    onChange={(e) => handleUpdateDuration(parseInt(e.target.value))}
                    style={{
                      background: '#f8fafc',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      color: '#1e293b',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value={30}>30 Min</option>
                    <option value={45}>45 Min</option>
                    <option value={60}>60 Min</option>
                    <option value={90}>90 Min</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Wallet Pass (Green ID Card) - Forest green gradient, gold accents */}
            <div className="hover-scale" style={{ 
              background: 'linear-gradient(135deg, #137333 0%, #064e3b 100%)', 
              borderRadius: '24px', 
              padding: '24px', 
              color: 'white',
              boxShadow: '0 20px 45px rgba(2, 44, 34, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              position: 'relative',
              overflow: 'hidden',
              width: '100%',
              minHeight: '410px',
              boxSizing: 'border-box'
            }}>
              {/* Sheen effect */}
              <div style={{
                position: 'absolute',
                top: '-50%', left: '-50%', right: '-50%', bottom: '-50%',
                background: 'radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, transparent 60%)',
                pointerEvents: 'none'
              }} />

              {/* Top Row NFC chip & Pass Title */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
                <div style={{ width: '42px', height: '32px', background: 'linear-gradient(135deg, #fbbf24, #d97706)', borderRadius: '6px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: '25%', right: '25%', borderLeft: '1px solid rgba(0,0,0,0.15)', borderRight: '1px solid rgba(0,0,0,0.15)' }} />
                  <div style={{ position: 'absolute', left: 0, right: 0, top: '33%', bottom: '33%', borderTop: '1px solid rgba(0,0,0,0.15)', borderBottom: '1px solid rgba(0,0,0,0.15)' }} />
                </div>
                <span style={{ fontSize: '0.62rem', fontWeight: 900, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.15em' }}>CAMPUS PASS</span>
              </div>

              {/* Cardholder Identity Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', zIndex: 1 }}>
                <div>
                  <span style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.5)', fontWeight: 800, textTransform: 'uppercase' }}>Karteninhaber</span>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>{student.first_name} {student.last_name}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.5)', fontWeight: 800, textTransform: 'uppercase' }}>Ausweis-ID</span>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#ffffff', marginTop: '2px', fontFamily: 'monospace' }}>5FE712CF</div>
                </div>
              </div>

              {/* School & Status details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', zIndex: 1 }}>
                <div>
                  <span style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.5)', fontWeight: 800, textTransform: 'uppercase' }}>Musikakademie</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>Campus Musikschule</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.5)', fontWeight: 800, textTransform: 'uppercase' }}>Status</span>
                  <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#4ade80', marginTop: '2px' }}>AKTIV</div>
                </div>
              </div>

              {/* Dashed divider line */}
              <div style={{ borderTop: '1px dashed rgba(255, 255, 255, 0.25)', margin: '4px 0', width: '100%', zIndex: 1 }} />

              {/* QR Code Scan area */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', width: '100%', zIndex: 1, marginTop: 'auto' }}>
                <div style={{ 
                  background: '#ffffff', 
                  padding: '16px', 
                  borderRadius: '20px', 
                  boxShadow: '0 12px 30px rgba(0,0,0,0.3)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  border: '1px solid rgba(255, 255, 255, 0.8)'
                }}>
                  <QRCode value={student.qr_token || student.id || ''} size={110} />
                </div>
              </div>
            </div>

            {/* View Specific Right Content */}
            {!isPlatformCampus && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {/* Meine Bands */}
                <section>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', color: '#ec4899', letterSpacing: '0.1em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={16} /> Meine Bands
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {bands.map((b: any) => (
                      <div 
                        key={b.id} 
                        onClick={() => {
                          if (onOpenBandProfile) {
                            onOpenBandProfile(b);
                          }
                        }}
                        className={onOpenBandProfile ? "clickable-band-item" : ""}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '12px', 
                          padding: '12px', 
                          background: '#fdf2f8', 
                          borderRadius: '16px', 
                          border: '1px solid #fbcfe8',
                          cursor: onOpenBandProfile ? 'pointer' : 'default'
                        }}
                      >
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', overflow: 'hidden' }}>
                          <img src={b.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#9d174d' }}>{b.name}</div>
                      </div>
                    ))}
                    {bands.length === 0 && !loading && (
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>In keiner Band aktiv.</div>
                    )}
                  </div>
                </section>

                {/* Wochenplan-Zeiten */}
                <section style={{ marginTop: '16px' }}>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', color: '#f59e0b', letterSpacing: '0.1em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} /> Wochenplan-Zeiten
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {weekSessions.map((pres, idx) => (
                      <div key={idx} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        background: '#fffbeb', 
                        border: '1px solid #fef3c7', 
                        padding: '12px 14px', 
                        borderRadius: '16px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: '#b45309'
                      }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }}></div>
                        <div>
                          {pres.dayStr}. {pres.rangeStr}
                        </div>
                      </div>
                    ))}
                    {weekSessions.length === 0 && (
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', background: '#f8fafc', padding: '12px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>Keine reservierten Zeiten diese Woche.</div>
                    )}
                  </div>
                </section>
              </div>
            )}
          </aside>
        </div>
      </div>
      {showFullPhoto && (
        <div 
          onClick={() => setShowFullPhoto(false)}
          style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 4000, 
            background: 'rgba(0,0,0,0.85)', 
            backdropFilter: 'blur(20px)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            cursor: 'zoom-out'
          }}
        >
          <img 
            src={displayAvatarSrc} 
            style={{ 
              maxWidth: '90%', 
              maxHeight: '90%', 
              borderRadius: '24px', 
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              border: '4px solid white'
            }} 
          />
        </div>
      )}
    </div>
  );
};

