import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Award, Star, Clock, Music, Users, Calendar, 
  Smartphone, ShieldCheck, Flame, RefreshCw, QrCode, Copy, Check, Info, Lock
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { StudentModalHeader } from './shared/StudentModalHeader';
import { StudentScheduleCard, getFormattedScheduleDayTime } from './shared/StudentScheduleCard';
import { StudentAccessSection } from './shared/StudentAccessSection';
import { StudentConsentProtocol } from './shared/StudentConsentProtocol';
import { MeisterwerkDocumentationModal } from '../../MeisterwerkDocumentationModal';
import { getInstrumentAvatarUrl, getDefaultMusicianAvatarUrl, resolveCampusStudentAvatar } from '../../StudioAvatar';
import { SkillRadarPentagon } from '../../common/SkillRadarPentagon';
import { SKILL_TAGS } from '../meisterwerk.types';
import QRCode from 'react-qr-code';
import { formatTeacherFullName } from '../../../utils/nameHelper';

const TEACHER_GREEN = '#34a853';
const TEACHER_YELLOW = '#eab308';

export interface TeacherStudentDetailModalProps {
  student: any;
  onClose: () => void;
  onOpenBandProfile?: (band: any) => void;
  onOpenTageskompass?: (student: any) => void;
  activePlatform?: string;
  callerDashboard?: string;
  onSwitchPlatform?: (newPlatform: 'campus' | 'groovelab') => void;
}

export const TeacherStudentDetailModal: React.FC<TeacherStudentDetailModalProps> = ({
  student,
  onClose,
  onOpenBandProfile,
  onOpenTageskompass,
  activePlatform,
  callerDashboard,
  onSwitchPlatform
}) => {
  const isGrooveInitially = activePlatform === 'groovelab' && (student.is_groovelab_active ?? student.isGroovelabActive);
  const [selectedSubTab, setSelectedSubTab] = useState<'teaching' | 'competencies' | 'support'>('teaching');
  const [firstName, setFirstName] = useState<string>(student.first_name || (student.name ? student.name.split(' ')[0] : ''));
  const [lastName, setLastName] = useState<string>(student.last_name || (student.name && student.name.split(' ').length > 1 ? student.name.split(' ').slice(1).join(' ') : ''));
  const [isLastNameRevealedLocally, setIsLastNameRevealedLocally] = useState<boolean>(false);
  const [studentUiLevel, setStudentUiLevel] = useState<'junior' | 'teen' | 'pro'>(() => student.campus_ui_level || 'junior');
  const [isCampusActive, setIsCampusActive] = useState<boolean>(student.is_campus_active ?? student.isCampusActive ?? false);
  const [isGroovelabActive, setIsGroovelabActive] = useState<boolean>(student.is_groovelab_active ?? student.isGroovelabActive ?? false);
  const [lessonDuration, setLessonDuration] = useState<number>(student.lesson_duration || 30);
  const [appUsageMode, setAppUsageMode] = useState<string>(student.app_usage_mode || 'student_only');
  const [skills, setSkills] = useState<any[]>([]);
  const [bands, setBands] = useState<any[]>([]);
  const [vocalsSongIds, setVocalsSongIds] = useState<Set<string>>(new Set());
  const [schedulesList, setSchedulesList] = useState<any[]>([]);
  const [avatar, setAvatar] = useState<any>(null);
  const [studentStats, setStudentStats] = useState<any>(null);
  const [globalLehrwerke, setGlobalLehrwerke] = useState<any[]>([]);
  const [assignedLehrwerke, setAssignedLehrwerke] = useState<any[]>([]);
  const [campusHomeworkItems, setCampusHomeworkItems] = useState<any[]>([]);
  const [showTageskompassModal, setShowTageskompassModal] = useState(false);
  const [showQrOverlay, setShowQrOverlay] = useState(false);
  const [localQrToken, setLocalQrToken] = useState<string>(student.qr_token || '');

  // 5 Säulen Kompetenz-Stufen & Wochenschwerpunkt (Single Source of Truth)
  const [pillarLevels, setPillarLevels] = useState<Record<string, number>>(() => {
    try {
      const dbLevels = student.skill_radar_levels;
      if (dbLevels && typeof dbLevels === 'object') {
        return {
          rhythmus: Number(dbLevels.rhythmus || 1),
          technik: Number(dbLevels.technik || 1),
          klang: Number(dbLevels.klang || dbLevels.intonation || 1),
          ausdruck: Number(dbLevels.ausdruck || 1),
          repertoire: Number(dbLevels.repertoire || 1)
        };
      }
      const savedOverride = localStorage.getItem(`groovelab_skill_overrides_${student.id}`);
      if (savedOverride) {
        const parsed = JSON.parse(savedOverride);
        return {
          rhythmus: Number(parsed.rhythmus || 1),
          technik: Number(parsed.technik || 1),
          klang: Number(parsed.klang || parsed.intonation || 1),
          ausdruck: Number(parsed.ausdruck || 1),
          repertoire: Number(parsed.repertoire || 1)
        };
      }
      const savedLegacy = localStorage.getItem(`student_pillars_${student.id}`);
      if (savedLegacy) {
        const parsed = JSON.parse(savedLegacy);
        return {
          rhythmus: Number(parsed.rhythmus || 1),
          technik: Number(parsed.technik || 1),
          klang: Number(parsed.klang || parsed.intonation || 1),
          ausdruck: Number(parsed.ausdruck || 1),
          repertoire: Number(parsed.repertoire || 1)
        };
      }
    } catch (e) {}
    return {
      rhythmus: 1,
      technik: 1,
      klang: 1,
      ausdruck: 1,
      repertoire: 1
    };
  });

  const [activeWeeklyFocus, setActiveWeeklyFocus] = useState<string>(() => {
    try {
      return student.skill_radar_levels?.weekly_focus || 
        localStorage.getItem(`groovelab_weekly_focus_${student.id}`) || 
        'ausgeglichen';
    } catch {
      return 'ausgeglichen';
    }
  });

  const handleSetPillarLevel = async (pillarKey: string, level: number) => {
    const updated = { ...pillarLevels, [pillarKey]: level };
    setPillarLevels(updated);

    // Sync to unified localStorage caches
    try {
      localStorage.setItem(`groovelab_skill_overrides_${student.id}`, JSON.stringify({
        ...updated,
        intonation: updated.klang
      }));
      localStorage.setItem(`student_pillars_${student.id}`, JSON.stringify(updated));
    } catch (e) {}

    // Dispatch window event for immediate reactive sync across open modals/tabs
    window.dispatchEvent(new CustomEvent('skill_radar_levels_changed', {
      detail: { studentId: student.id, levels: updated, weeklyFocus: activeWeeklyFocus }
    }));

    // Persist to Supabase
    try {
      const payload = {
        ...updated,
        intonation: updated.klang,
        weekly_focus: activeWeeklyFocus
      };
      student.skill_radar_levels = payload;
      await supabase.from('users').update({ skill_radar_levels: payload }).eq('id', student.id);
    } catch (err) {
      console.warn('Could not persist skill_radar_levels to Supabase:', err);
    }
  };

  const handleSetWeeklyFocus = async (focusKey: string) => {
    setActiveWeeklyFocus(focusKey);
    try {
      localStorage.setItem(`groovelab_weekly_focus_${student.id}`, focusKey);
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('skill_radar_levels_changed', {
      detail: { studentId: student.id, levels: pillarLevels, weeklyFocus: focusKey }
    }));

    try {
      const payload = {
        ...pillarLevels,
        intonation: pillarLevels.klang,
        weekly_focus: focusKey
      };
      student.skill_radar_levels = payload;
      await supabase.from('users').update({ skill_radar_levels: payload }).eq('id', student.id);
    } catch (err) {
      console.warn('Could not persist weekly_focus to Supabase:', err);
    }
  };

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showQrOverlay) setShowQrOverlay(false);
        else if (showTageskompassModal) setShowTageskompassModal(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showQrOverlay, showTageskompassModal, onClose]);

  // Sync state with incoming student prop
  useEffect(() => {
    setFirstName(student.first_name || (student.name ? student.name.split(' ')[0] : ''));
    setLastName(student.last_name || (student.name && student.name.split(' ').length > 1 ? student.name.split(' ').slice(1).join(' ') : ''));
    setIsCampusActive(student.is_campus_active ?? student.isCampusActive ?? false);
    setIsGroovelabActive(student.is_groovelab_active ?? student.isGroovelabActive ?? false);
    setStudentUiLevel(student.campus_ui_level || 'junior');
    setLessonDuration(student.lesson_duration || 30);
    setAppUsageMode(student.app_usage_mode || 'student_only');
    setLocalQrToken(student.qr_token || '');
    setIsLastNameRevealedLocally(false);
  }, [student]);

  // Fetch teacher-specific student data
  useEffect(() => {
    const fetchTeacherData = async () => {
      if (!student.id) return;

      // 1. Skills
      try {
        const { data: skillsData } = await supabase
          .from('user_skills')
          .select('*')
          .eq('user_id', student.id);
        setSkills(skillsData || []);
      } catch (e) {}

      // 2. Bands
      try {
        const { data: bandsData } = await supabase
          .from('band_members')
          .select('bands ( id, name, photo_url, rehearsal_time, room_name )')
          .eq('user_id', student.id);
        const bList: any[] = [];
        (bandsData || []).forEach((m: any) => {
          const b = Array.isArray(m.bands) ? m.bands[0] : m.bands;
          if (b && !bList.some(item => item.id === b.id)) bList.push(b);
        });
        setBands(bList);
      } catch (e) {}

      // 3. Vocals song IDs
      try {
        const { data: slotsData } = await supabase
          .from('band_song_slots')
          .select('*, band_songs(*)')
          .eq('user_id', student.id);
        const vIds = new Set<string>();
        (slotsData || []).forEach((s: any) => {
          const isVocal = (s.instrument || '').toLowerCase().includes('vocal') || (s.instrument || '').toLowerCase().includes('gesang');
          if (isVocal && s.status !== 'declined' && s.band_songs?.song_id) {
            vIds.add(String(s.band_songs.song_id));
          }
        });
        setVocalsSongIds(vIds);
      } catch (e) {}

      // 4. Schedules
      try {
        const { data: schedData } = await supabase
          .from('schedules')
          .select(`
            id,
            time_slot,
            day_of_week,
            status,
            rooms ( name ),
            teacher:users!schedules_teacher_id_fkey ( first_name, last_name )
          `)
          .eq('student_id', student.id);
        setSchedulesList(schedData || []);
      } catch (e) {}

      // 5. Avatar & Stats
      try {
        const { data: avData } = await supabase.from('avatars').select('*').eq('user_id', student.id).maybeSingle();
        setAvatar(avData);
        const { data: stData } = await supabase.from('student_stats').select('*').eq('student_id', student.id).maybeSingle();
        setStudentStats(stData);
      } catch (e) {}

      // 6. Lehrwerke
      try {
        const { data: lwData } = await supabase.from('lehrwerke').select('*').order('title');
        setGlobalLehrwerke(lwData || []);
      } catch (e) {}

      // 7. Assigned progress from localStorage
      try {
        const stored = localStorage.getItem('student_lehrwerke_progress');
        if (stored) {
          const parsed = JSON.parse(stored);
          setAssignedLehrwerke(parsed.filter((item: any) => item.studentId === student.id));
        }
      } catch (e) {}

      // 8. Homework progress
      try {
        const { data: pmData } = await supabase
          .from('progress_matrix')
          .select('*')
          .eq('student_id', student.id)
          .order('created_at', { ascending: false });
        setCampusHomeworkItems(pmData || []);
      } catch (e) {}
    };

    fetchTeacherData();
  }, [student.id]);

  // Reactive listener for external skill radar changes (e.g. from Meisterwerk Cockpit)
  useEffect(() => {
    const handleSkillRadarChanged = (e: any) => {
      if (e.detail?.studentId === student.id) {
        if (e.detail.levels) {
          setPillarLevels(e.detail.levels);
        }
        if (e.detail.weeklyFocus) {
          setActiveWeeklyFocus(e.detail.weeklyFocus);
        }
      }
    };
    window.addEventListener('skill_radar_levels_changed', handleSkillRadarChanged);
    return () => window.removeEventListener('skill_radar_levels_changed', handleSkillRadarChanged);
  }, [student.id]);

  // 🎯 Didaktische Schüler-Reflexionen (🟢 Läuft super / 🟡 Noch wackelig / 🔴 Brauche Hilfe)
  const [studentTaskReflections, setStudentTaskReflections] = useState<Record<string, { status: 'super' | 'wackelig' | 'hilfe'; timestamp: string; label?: string }>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(`campus_student_task_reflections_${student.id}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const handleSync = () => {
      try {
        const raw = localStorage.getItem(`campus_student_task_reflections_${student.id}`);
        if (raw) setStudentTaskReflections(JSON.parse(raw));
      } catch {}
    };
    window.addEventListener('campus_homework_reflection_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('campus_homework_reflection_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [student.id]);

  const handleUpdateEvolutionLevel = async (lvl: number) => {
    try {
      await supabase.from('avatars').update({ evolution_level: lvl }).eq('user_id', student.id);
      setAvatar((prev: any) => ({ ...prev, evolution_level: lvl }));
    } catch (err: any) {
      console.error('Error updating evolution level:', err);
    }
  };

  const handleOpenHausaufgabenheft = () => {
    if (onOpenTageskompass) {
      onOpenTageskompass(student);
    } else {
      setShowTageskompassModal(true);
    }
  };

  // KPIs
  const currentXP = avatar?.xp || ((skills.filter((s: any) => s.is_stage_ready).length + vocalsSongIds.size) * 100) || 0;
  const focusMinutes = studentStats?.total_focus_minutes || studentStats?.monthly_focus_minutes || 0;
  const streakDays = avatar?.streak_flame || 0;
  const masteredSongsCount = campusHomeworkItems.filter((i) => i.status === 'mastered').length;

  const displayAvatar = resolveCampusStudentAvatar(student);
  const memberSince = student.created_at
    ? new Date(student.created_at).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    : 'Juli 2026';

  const activeThemeColor = isGrooveInitially ? TEACHER_YELLOW : TEACHER_GREEN;

  return (
    <div
      className="student-detail-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10500,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Lehrer-Karteikarte"
    >
      <div
        className="student-detail-panel"
        style={{
          background: '#ffffff',
          borderRadius: '32px',
          padding: '32px',
          width: '100%',
          maxWidth: '1020px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header with Anonymized Name & Quick QR */}
        <StudentModalHeader
          mode="teacher"
          student={student}
          firstName={firstName}
          lastName={lastName}
          displayAvatarSrc={displayAvatar}
          memberSince={memberSince}
          activeColor={activeThemeColor}
          isLastNameRevealedLocally={isLastNameRevealedLocally}
          onToggleLastNameRevealed={() => setIsLastNameRevealedLocally((prev) => !prev)}
          onQuickQr={() => setShowQrOverlay(true)}
          onClose={onClose}
        />

        {/* 3 Teacher Navigation Tabs */}
        <div
          role="tablist"
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid #e2e8f0',
            marginBottom: '26px'
          }}
        >
          <button
            type="button"
            role="tab"
            id="teacher-tab-teaching"
            aria-controls="teacher-panel-teaching"
            aria-selected={selectedSubTab === 'teaching'}
            aria-label="Unterricht und Hausaufgaben anzeigen"
            onClick={() => setSelectedSubTab('teaching')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: selectedSubTab === 'teaching' ? `3px solid ${activeThemeColor}` : '3px solid transparent',
              padding: '10px 18px',
              fontSize: '0.92rem',
              fontWeight: 800,
              color: selectedSubTab === 'teaching' ? '#0f172a' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s'
            }}
          >
            <BookOpen size={17} style={{ color: selectedSubTab === 'teaching' ? activeThemeColor : '#94a3b8' }} />
            <span>Unterricht &amp; Hausaufgaben</span>
          </button>

          <button
            type="button"
            role="tab"
            id="teacher-tab-competencies"
            aria-controls="teacher-panel-competencies"
            aria-selected={selectedSubTab === 'competencies'}
            aria-label="Kompetenzen und Übe-Level anzeigen"
            onClick={() => setSelectedSubTab('competencies')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: selectedSubTab === 'competencies' ? `3px solid ${activeThemeColor}` : '3px solid transparent',
              padding: '10px 18px',
              fontSize: '0.92rem',
              fontWeight: 800,
              color: selectedSubTab === 'competencies' ? '#0f172a' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s'
            }}
          >
            <Music size={17} style={{ color: selectedSubTab === 'competencies' ? activeThemeColor : '#94a3b8' }} />
            <span>Kompetenzen &amp; Übe-Level</span>
          </button>

          <button
            type="button"
            role="tab"
            id="teacher-tab-support"
            aria-controls="teacher-panel-support"
            aria-selected={selectedSubTab === 'support'}
            aria-label="Support und PIN-Hilfe anzeigen"
            onClick={() => setSelectedSubTab('support')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: selectedSubTab === 'support' ? `3px solid ${activeThemeColor}` : '3px solid transparent',
              padding: '10px 18px',
              fontSize: '0.92rem',
              fontWeight: 800,
              color: selectedSubTab === 'support' ? '#0f172a' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s'
            }}
          >
            <ShieldCheck size={17} style={{ color: selectedSubTab === 'support' ? activeThemeColor : '#94a3b8' }} />
            <span>Support &amp; PIN-Hilfe</span>
          </button>
        </div>

        {/* Tab 1: Unterricht & Hausaufgaben */}
        {selectedSubTab === 'teaching' && (
          <div
            role="tabpanel"
            id="teacher-panel-teaching"
            aria-labelledby="teacher-tab-teaching"
            tabIndex={0}
            style={{ display: 'grid', gridTemplateColumns: '1.25fr 360px', gap: '32px', alignItems: 'start' }}
            className="student-detail-grid"
          >
            {/* Left Column: 4 KPI Cards & Assigned Lehrwerke */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
              {/* 4 Learning KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
                {/* XP */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #4285f4, #2b6cb0)',
                    color: '#ffffff',
                    borderRadius: '18px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 6px 15px rgba(66, 133, 244, 0.15)'
                  }}
                >
                  <div style={{ background: 'rgba(255, 255, 255, 0.2)', borderRadius: '12px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Star size={20} fill="#ffffff" color="#ffffff" />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 950, lineHeight: 1.1 }}>{currentXP} XP</div>
                    <div style={{ fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.85, marginTop: '2px' }}>XP gesammelt</div>
                  </div>
                </div>

                {/* Mastered Songs */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #34a853, #22c55e)',
                    color: '#ffffff',
                    borderRadius: '18px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 6px 15px rgba(52, 168, 83, 0.15)'
                  }}
                >
                  <div style={{ background: 'rgba(255, 255, 255, 0.2)', borderRadius: '12px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Award size={20} fill="#ffffff" color="#ffffff" />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 950, lineHeight: 1.1 }}>{masteredSongsCount}</div>
                    <div style={{ fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.85, marginTop: '2px' }}>Songs gemeistert</div>
                  </div>
                </div>

                {/* Focus Minutes */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #fbbc05, #d97706)',
                    color: '#ffffff',
                    borderRadius: '18px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 6px 15px rgba(251, 188, 5, 0.15)'
                  }}
                >
                  <div style={{ background: 'rgba(255, 255, 255, 0.2)', borderRadius: '12px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={20} fill="#ffffff" color="#ffffff" />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 950, lineHeight: 1.1 }}>{focusMinutes} Min.</div>
                    <div style={{ fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.85, marginTop: '2px' }}>Fokus-Übezeit</div>
                  </div>
                </div>

                {/* Streak Days */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #ea4335, #b91c1c)',
                    color: '#ffffff',
                    borderRadius: '18px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 6px 15px rgba(234, 67, 53, 0.15)'
                  }}
                >
                  <div style={{ background: 'rgba(255, 255, 255, 0.2)', borderRadius: '12px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Flame size={20} fill="#ffffff" color="#ffffff" />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 950, lineHeight: 1.1 }}>{streakDays} Tage</div>
                    <div style={{ fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.85, marginTop: '2px' }}>Serie am Laufen</div>
                  </div>
                </div>
              </div>

              {/* Active Lehrwerke & Homework List */}
              <section
                style={{
                  background: '#f8fafc',
                  borderRadius: '24px',
                  padding: '22px',
                  border: '1.5px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 style={{ fontSize: '0.86rem', fontWeight: 900, textTransform: 'uppercase', color: TEACHER_GREEN, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.05em' }}>
                    <BookOpen size={16} /> Aktive Lehrwerke &amp; Hausaufgaben
                  </h4>
                </div>

                {/* Lehrwerke Row */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {assignedLehrwerke.map((assigned) => {
                    const book = globalLehrwerke.find((b: any) => b.id === assigned.lehrwerkId);
                    if (!book) return null;
                    return (
                      <div
                        key={assigned.lehrwerkId}
                        style={{
                          background: '#ffffff',
                          padding: '10px 14px',
                          borderRadius: '14px',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.86rem' }}>
                          📖 {book.title}
                        </span>
                        <span style={{ background: '#e6f4ea', color: '#15803d', padding: '3px 8px', borderRadius: '8px', fontSize: '0.74rem', fontWeight: 850 }}>
                          Aktiv
                        </span>
                      </div>
                    );
                  })}
                  {assignedLehrwerke.length === 0 && (
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', padding: '8px 0' }}>
                      Keine Lehrwerke im Hausaufgabenheft zugewiesen.
                    </div>
                  )}
                </div>

                {/* Songs Row */}
                <div style={{ height: '1px', background: '#e2e8f0' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                    Aktuelle Aufgaben
                  </div>
                  {campusHomeworkItems.slice(0, 5).map((item) => {
                    const reflEntry = Object.entries(studentTaskReflections).find(([k]) => {
                      if (k.includes(item.id)) return true;
                      if (item.topic_name && k.toLowerCase().includes(item.topic_name.toLowerCase())) return true;
                      if (item.title && k.toLowerCase().includes(item.title.toLowerCase())) return true;
                      return false;
                    })?.[1];

                    return (
                      <div
                        key={item.id}
                        style={{
                          background: reflEntry?.status === 'hilfe' ? '#fef2f2' : reflEntry?.status === 'wackelig' ? '#fffbeb' : item.status === 'mastered' ? '#f0fdf4' : '#ffffff',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          border: reflEntry?.status === 'hilfe' ? '1.5px solid #fca5a5' : reflEntry?.status === 'wackelig' ? '1.5px solid #fde68a' : item.status === 'mastered' ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          fontSize: '0.82rem',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                          <span style={{ fontWeight: 800, color: item.status === 'mastered' ? '#15803d' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.status === 'mastered' ? '🎉 ' : '🎵 '}{item.title || item.topic_name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          {reflEntry && (
                            <span
                              style={{
                                background: reflEntry.status === 'super' ? '#dcfce7' : reflEntry.status === 'wackelig' ? '#fef3c7' : '#fee2e2',
                                color: reflEntry.status === 'super' ? '#15803d' : reflEntry.status === 'wackelig' ? '#b45309' : '#b91c1c',
                                border: reflEntry.status === 'super' ? '1px solid #86efac' : reflEntry.status === 'wackelig' ? '1px solid #fde68a' : '1px solid #fca5a5',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontWeight: 900,
                                fontSize: '0.70rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <span>{reflEntry.status === 'super' ? '🟢 Super' : reflEntry.status === 'wackelig' ? '🟡 Wackelig' : '🔴 Braucht Hilfe!'}</span>
                            </span>
                          )}
                          <span
                            style={{
                              background: item.status === 'mastered' ? '#dcfce7' : '#eff6ff',
                              color: item.status === 'mastered' ? '#15803d' : '#2563eb',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontWeight: 850,
                              fontSize: '0.72rem'
                            }}
                          >
                            {item.status === 'mastered' ? 'Gemeistert' : 'Aufgabe'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {campusHomeworkItems.length === 0 && (
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      Keine offenen Aufgaben eingetragen.
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Right Column: Hero Button Hausaufgabenheft & Schedule Card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* Hero Button: Digitales Hausaufgabenheft */}
              <section
                style={{
                  background: 'linear-gradient(135deg, #34a853 0%, #059669 45%, #4f46e5 100%)',
                  borderRadius: '24px',
                  padding: '24px 22px',
                  color: '#ffffff',
                  boxShadow: '0 12px 30px rgba(52, 168, 83, 0.28)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BookOpen size={24} color="#ffffff" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.64rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.9 }}>
                      DIDAKTISCHES MANDAT
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#ffffff', margin: '2px 0 0 0' }}>
                      Digitales Hausaufgabenheft
                    </h3>
                  </div>
                </div>

                <p style={{ fontSize: '0.78rem', opacity: 0.9, margin: 0, lineHeight: 1.45 }}>
                  Wochenziele, Übungs-Streaks, Audio-Aufnahmen &amp; Meisterwerke des Schülers direkt im Unterricht öffnen.
                </p>

                <button
                  type="button"
                  onClick={handleOpenHausaufgabenheft}
                  aria-label="Digitales Hausaufgabenheft öffnen"
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    color: '#15803d',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '12px 18px',
                    fontWeight: 950,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)'
                  }}
                  className="hover-scale"
                >
                  <BookOpen size={17} />
                  <span>Hausaufgabenheft öffnen</span>
                </button>
              </section>

              {/* Schedule Card */}
              <StudentScheduleCard
                schedulesList={schedulesList}
                lessonDuration={lessonDuration}
                student={student}
                mode="teacher"
                activeColor={activeThemeColor}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Kompetenzen & Übe-Level */}
        {selectedSubTab === 'competencies' && (
          <div
            role="tabpanel"
            id="teacher-panel-competencies"
            aria-labelledby="teacher-tab-competencies"
            tabIndex={0}
            style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', alignItems: 'start' }}
            className="student-detail-grid"
          >
            {/* Left Column: 5-Säulen Förder-Raster & Apple Dots */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <section
                style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '24px',
                  border: '1.5px solid #f1f5f9',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 900, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📊</span> 5-Säulen Förder-Entwicklungsraster
                  </h4>
                  <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: '100px', fontSize: '0.74rem', fontWeight: 800 }}>
                    Stufen 1–5
                  </span>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 14px', fontSize: '0.76rem', color: '#475569', lineHeight: 1.45 }}>
                  <strong style={{ color: '#0f172a' }}>Pädagogisches Entwicklungsraster:</strong> Dient der individuellen Förderung musikalischer Schwerpunkte (keine Notengebung). Einstufung erfolgt persönlich durch die Lehrkraft.
                </div>

                {/* 5 Pillars with Interactive Step Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {SKILL_TAGS.map((tag) => {
                    const currentLvl = pillarLevels[tag.key] || (tag.legacyKey ? pillarLevels[tag.legacyKey] : 1) || 1;
                    return (
                      <div
                        key={tag.key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          background: '#f8fafc',
                          borderRadius: '14px',
                          border: '1px solid #f1f5f9'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.2rem' }}>{tag.icon}</span>
                          <div>
                            <div style={{ fontSize: '0.86rem', fontWeight: 850, color: '#1e293b' }}>
                              {tag.label}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                              {tag.description}
                            </div>
                          </div>
                        </div>

                        {/* 5 Level Buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {[1, 2, 3, 4, 5].map((step) => {
                            const isFilled = currentLvl >= step;
                            return (
                              <button
                                key={step}
                                type="button"
                                onClick={() => handleSetPillarLevel(tag.key, step)}
                                aria-label={`Stufe ${step} für ${tag.label} festlegen`}
                                aria-pressed={isFilled}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  border: 'none',
                                  background: isFilled ? tag.color : '#e2e8f0',
                                  color: isFilled ? (tag.key === 'ausdruck' ? '#0f172a' : '#ffffff') : '#475569',
                                  fontSize: '0.72rem',
                                  fontWeight: 900,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.15s ease',
                                  boxShadow: isFilled ? '0 2px 6px rgba(0,0,0,0.12)' : 'none'
                                }}
                                title={`Stufe ${step} für ${tag.label}`}
                              >
                                {step}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Wochenschwerpunkt (Fokus-Impuls) Schnellwahl */}
                <div style={{
                  marginTop: '6px',
                  paddingTop: '16px',
                  borderTop: '1px dashed #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🎯</span> Wochenschwerpunkt (Fokus-Impuls)
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      Im Schülerradar hervorgehoben
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {[
                      { key: 'ausgeglichen', label: '🌈 Ganzheitlich (Alle 5)' },
                      ...SKILL_TAGS.map((t) => ({ key: t.key, label: `${t.icon} ${t.label.split(' ')[0]}` }))
                    ].map((f) => {
                      const isSelected = activeWeeklyFocus === f.key;
                      return (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => handleSetWeeklyFocus(f.key)}
                          aria-pressed={isSelected}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '100px',
                            border: isSelected ? '1.5px solid #0f172a' : '1px solid #e2e8f0',
                            background: isSelected ? '#0f172a' : '#f8fafc',
                            color: isSelected ? '#ffffff' : '#475569',
                            fontSize: '0.74rem',
                            fontWeight: 850,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: isSelected ? '0 2px 8px rgba(15, 23, 42, 0.18)' : 'none'
                          }}
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* Harmonisiertes Skill-Radar Cockpit Visual */}
              <section
                style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '24px',
                  border: '1.5px solid #f1f5f9',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.86rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🕸️</span> Harmonisiertes Skill-Radar Cockpit
                  </div>
                  {activeWeeklyFocus !== 'ausgeglichen' && (
                    <span style={{
                      background: '#fef3c7',
                      color: '#92400e',
                      padding: '3px 10px',
                      borderRadius: '100px',
                      fontSize: '0.7rem',
                      fontWeight: 900,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span>🎯</span> Fokus aktiv
                    </span>
                  )}
                </div>

                <SkillRadarPentagon
                  levels={pillarLevels}
                  activeFocusTags={activeWeeklyFocus !== 'ausgeglichen' ? [activeWeeklyFocus] : []}
                  size="compact"
                  uiLevel={studentUiLevel}
                  studentName={firstName || student.first_name || 'Schüler'}
                  instrumentName={student.instrument || (student as any)?.instrument_type || (student as any)?.instrument_name || ''}
                  onSkillClick={(tagKey) => {
                    handleSetWeeklyFocus(activeWeeklyFocus === tagKey ? 'ausgeglichen' : tagKey);
                  }}
                />
              </section>
            </div>

            {/* Right Column: UI Level, Streaks Level & Read-Only Usage Mode */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* Campus UI Level: Read-Only mit Elterlichem Schutz-Badge (§ 1626 BGB / Art. 8 DSGVO) */}
              <section
                style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '22px',
                  border: '1.5px solid #f1f5f9',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Pädagogisches Campus-UI-Level
                      <span style={{
                        background: '#f1f5f9',
                        color: '#64748b',
                        padding: '2px 8px',
                        borderRadius: '100px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Lock size={11} /> Nur Lesezugriff
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                      Didaktische Darstellung nach Altersstufe
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  background: '#f8fafc',
                  padding: '6px',
                  borderRadius: '16px',
                  border: '1px solid #f1f5f9'
                }}>
                  {[
                    { key: 'junior', label: 'Junior', age: '6–10 J.', icon: '🐣' },
                    { key: 'teen', label: 'Teen', age: '11–15 J.', icon: '🚀' },
                    { key: 'pro', label: 'Pro', age: '16+ J.', icon: '👑' }
                  ].map((lvl) => {
                    const isActive = studentUiLevel === lvl.key;
                    return (
                      <div
                        key={lvl.key}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '10px 8px',
                          borderRadius: '12px',
                          background: isActive ? TEACHER_GREEN : 'transparent',
                          color: isActive ? '#ffffff' : '#64748b',
                          fontWeight: isActive ? 900 : 700,
                          transition: 'all 0.2s ease',
                          boxShadow: isActive ? '0 4px 12px rgba(52, 168, 83, 0.25)' : 'none',
                          opacity: isActive ? 1 : 0.65
                        }}
                      >
                        <span style={{ fontSize: '1.2rem', marginBottom: '2px' }}>{lvl.icon}</span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 900 }}>{lvl.label}</span>
                        <span style={{ fontSize: '0.68rem', opacity: isActive ? 0.9 : 0.7 }}>{lvl.age}</span>
                        {isActive && (
                          <span style={{
                            marginTop: '4px',
                            fontSize: '0.62rem',
                            background: 'rgba(255, 255, 255, 0.25)',
                            padding: '1px 6px',
                            borderRadius: '100px',
                            fontWeight: 900
                          }}>
                            Aktiv
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Legal Note: Elterliches Sorgerecht (§ 1626 BGB / Art. 8 DSGVO) */}
                <div style={{
                  fontSize: '0.7rem',
                  color: '#475569',
                  lineHeight: 1.45,
                  background: '#f8fafc',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start'
                }}>
                  <Lock size={15} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: '#0f172a' }}>Erziehungsberechtigten-Schutz (§ 1626 BGB / Art. 8 DSGVO):</strong> Das didaktische UI-Level wird ausschließlich im Elternbereich der Schulfamilie verwaltet. Die Lehrkraft besitzt hierfür bewusst reines Leserecht.
                  </div>
                </div>
              </section>

              {/* Evolution Level (Streaks) */}
              <section
                style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '22px',
                  border: '1.5px solid #f1f5f9',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 850, color: '#1e293b' }}>
                    Übungs-Level (Streaks)
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                    Tägliches Mindest-Übeziel
                  </div>
                </div>

                <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '12px', gap: '3px' }}>
                  {[1, 2, 3].map((lvl) => {
                    const isSelected = (avatar?.evolution_level || 1) === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => handleUpdateEvolutionLevel(lvl)}
                        aria-label={`Übungs-Level Mindestziel: Stufe ${lvl}`}
                        aria-pressed={isSelected}
                        style={{
                          background: isSelected ? '#ffffff' : 'transparent',
                          color: isSelected ? '#0f172a' : '#475569',
                          border: 'none',
                          borderRadius: '9px',
                          padding: '6px 12px',
                          fontSize: '0.78rem',
                          fontWeight: isSelected ? 900 : 700,
                          cursor: 'pointer',
                          boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                        }}
                      >
                        Stufe {lvl}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Informative Usage Mode (Read-Only to respect parental rights) */}
              <section
                style={{
                  background: '#f8fafc',
                  borderRadius: '24px',
                  padding: '20px 22px',
                  border: '1.5px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Nutzungsmodus (Eltern-Entscheidung)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      background: appUsageMode === 'parent_hybrid' ? '#eff6ff' : '#f0fdf4',
                      color: appUsageMode === 'parent_hybrid' ? '#1d4ed8' : '#15803d',
                      border: appUsageMode === 'parent_hybrid' ? '1px solid #bfdbfe' : '1px solid #bbf7d0',
                      padding: '4px 12px',
                      borderRadius: '100px',
                      fontSize: '0.78rem',
                      fontWeight: 850
                    }}
                  >
                    {appUsageMode === 'parent_hybrid' ? '🔒 Eltern-Hybrid (PIN-geschützt)' : '📱 Selbstnutzer'}
                  </span>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                  Wird beim Onboarding durch die Erziehungsberechtigten festgelegt (§ 1626 BGB).
                </div>
              </section>

              {/* Bands Widget if applicable */}
              {isGroovelabActive && bands.length > 0 && (
                <section
                  style={{
                    background: '#fefce8',
                    borderRadius: '24px',
                    padding: '20px 22px',
                    border: '1.5px solid #fef08a',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#854d0e', textTransform: 'uppercase' }}>
                    🎸 Bands in GrooveLab
                  </div>
                  {bands.map((b) => (
                    <div
                      key={b.id}
                      role={onOpenBandProfile ? 'button' : undefined}
                      tabIndex={onOpenBandProfile ? 0 : undefined}
                      aria-label={onOpenBandProfile ? `Band-Profil ${b.name} öffnen` : undefined}
                      onClick={() => onOpenBandProfile && onOpenBandProfile(b)}
                      onKeyDown={(e) => {
                        if (onOpenBandProfile && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          onOpenBandProfile(b);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: '#ffffff',
                        padding: '10px 14px',
                        borderRadius: '14px',
                        cursor: onOpenBandProfile ? 'pointer' : 'default',
                        border: '1px solid #fef08a'
                      }}
                    >
                      <img src={b.photo_url || '/avatar_ghost.jpg'} alt={b.name} style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover' }} />
                      <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#854d0e' }}>{b.name}</span>
                    </div>
                  ))}
                </section>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Support & PIN-Hilfe */}
        {selectedSubTab === 'support' && (
          <div
            role="tabpanel"
            id="teacher-panel-support"
            aria-labelledby="teacher-tab-support"
            tabIndex={0}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', alignItems: 'start' }}
            className="student-detail-grid"
          >
            {/* Left Column: Face-to-Face PIN Reset */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <StudentAccessSection
                student={student}
                mode="teacher"
                activeColor={activeThemeColor}
                isGroove={isGrooveInitially}
                avatarSrc={displayAvatar}
                localQrToken={localQrToken}
                onOpenQrOverlay={() => setShowQrOverlay(true)}
              />
            </div>

            {/* Right Column: Consent Status & Emergency Contacts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* Art. 8 Consent Status Badge */}
              <StudentConsentProtocol
                student={student}
                mode="teacher"
              />

              {/* Emergency Contact */}
              <section
                style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '22px',
                  border: '1.5px solid #f1f5f9',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <h4 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>
                  📞 Notfallkontakt (Unterrichtsausfall / Notfall)
                </h4>
                <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.45 }}>
                  Im Falle einer plötzlichen Verhinderung oder eines Notfalls während der Unterrichtsstunde:
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                  {(student.emergency_phone || student.parent_phone || student.phone) ? (
                    <span>
                      {student.emergency_phone || student.parent_phone || student.phone}
                      {student.parent_name ? (
                        <span style={{ marginLeft: '8px', color: '#64748b', fontWeight: 600, fontSize: '0.78rem' }}>
                          ({student.parent_name})
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    'Keine Notfall-Nummer im Schülerprofil hinterlegt.'
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>

      {/* Quick QR Code Overlay */}
      {showQrOverlay && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Ausweis-QR für ${firstName}`}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 11000,
            background: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowQrOverlay(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '28px',
              padding: '28px',
              maxWidth: '360px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', marginBottom: '6px' }}>
              Ausweis-QR für {firstName}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748b', marginBottom: '18px' }}>
              Halte das Smartphone des Schülers vor diesen QR-Code.
            </div>
            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '18px', border: '1.5px solid #e2e8f0' }}>
              <QRCode
                value={`${window.location.origin}/onboarding/${localQrToken || student.qr_token || student.id}?platform=campus`}
                size={200}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowQrOverlay(false)}
              aria-label="Ausweis-QR-Code schließen"
              style={{
                marginTop: '20px',
                width: '100%',
                background: activeThemeColor,
                color: isGrooveInitially ? '#0f172a' : '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {/* Meisterwerk Documentation / Hausaufgabenheft Modal Fallback */}
      {showTageskompassModal && (
        <MeisterwerkDocumentationModal
          student={student}
          teacherName={formatTeacherFullName(schedulesList?.[0]?.teacher || (student as any)?.teacher_name || (student as any)?.teacher)}
          onClose={() => setShowTageskompassModal(false)}
        />
      )}
    </div>
  );
};
