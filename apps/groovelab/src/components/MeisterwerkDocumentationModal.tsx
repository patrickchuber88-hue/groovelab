import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Award, Flame, AlertCircle, BookOpen, Music, History, Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Book, Star, Sliders, RotateCcw, RotateCw, Mic, Square, Play, Pause, VolumeX, Volume2, Trash2, Headphones, Minimize2, Maximize2, Calendar, FileText, Zap, Clock, Info, Activity, ArrowLeft, Edit3, Disc, Search, Lock, Unlock, Share2, Sparkles, Radio, Download, Repeat, Timer, Scissors, Moon, Wrench, Hash, Filter, Target, User, Printer, MessageSquare, Mail, Copy, ExternalLink, HelpCircle, Hand, Lightbulb, MoreHorizontal, Pin, EyeOff, ArrowRightLeft, Send } from 'lucide-react';
import Confetti from 'react-confetti';
import { supabase } from '../lib/supabase';
import { GroovePracticeCompanion } from './groovelab/GroovePracticeCompanion';
import { GrooveTrainerStudioView } from './campus/GrooveTrainerStudioView';
import type { CustomPlaylist, CustomPlaylistTrack } from './campus/AudioBiographyView';
import { processPureRawBlob, processStudioMastering, TARGET_PURE_RAW_LUFS, TARGET_STUDIO_LUFS, TARGET_PEAK_DBTP, MAX_PURE_RAW_LIMITER_GR_DB } from '../utils/audioMasteringEngine';
import { storeBlob, getBlob, deleteBlob } from '../utils/blobStorage';
import { validateMediaBlob } from '../utils/mediaSecurityValidator';
import { fixWebmDuration } from '../utils/webmDurationPatcher';
import { buildCanonicalAudioStoragePath, getSecureAudioUrl } from '../utils/audioStorageHelper';
import { AudioTrackCarousel } from './AudioTrackCarousel';
import { MeisterOhrSticker } from './MeisterOhrSticker';
const AudioEditorModal = React.lazy(() => import('./campus/AudioEditorModal').then(m => ({ default: m.AudioEditorModal })));
const GrooveLoopstation = React.lazy(() => import('./groovelab/GrooveLoopstation').then(m => ({ default: m.GrooveLoopstation })));
const CampusTuner = React.lazy(() => import('./campus/CampusTuner').then(m => ({ default: m.CampusTuner })));
const EarLabStudioModal = React.lazy(() => import('./campus/EarLabStudioModal').then(m => ({ default: m.EarLabStudioModal })));
const AudioBiographyView = React.lazy(() => import('./campus/AudioBiographyView').then(m => ({ default: m.AudioBiographyView })));
const MeisterwerkCertificateModal = React.lazy(() => import('./ui/MeisterwerkCertificateModal').then(m => ({ default: m.MeisterwerkCertificateModal })));
import { synthesizeNeuralSpeech, playAudioBlob, stopNeuralSpeech, buildContinuousHomeworkNarrative, cleanTextForTts, formatPageNumbersGerman } from '../services/neuralTtsService';
import { isDevEnvironment, getCanonicalQrLandingUrl } from '../utils/tenantUrlHelper';
import { generateStudentHomeworkPrintoutPDF } from '../utils/pdfGenerator';
import { formatTeacherFullName, capitalizeFirstLetter, formatSongTitleCase, copyTextToClipboard, maskLastName } from '../utils/nameHelper';
import { AudioWaveformVisualizer } from './ui/AudioWaveformVisualizer';
import { harmonizeAudioList, formatHarmonizedAudioTitle, cleanSongOrBookTitle, extractBaseTopic, formatAudioDate, getNextSequentialTakeNumber } from '../utils/audioNamingHelper';
import { HomeworkTransferModal } from './campus/HomeworkTransferModal';
import { broadcastPracticeUpdate } from '../utils/studentProgressEngine';
import { acquireAudioStream, requestMicrophonePermissionOnce, STUDIO_AUDIO_CONSTRAINTS, stabilizeAudioStream } from '../services/audioPermissionService';
import { 
  ALL_STICKERS, 
  getUnifiedStickerStatus, 
  getUnifiedStickersMap, 
  cleanNotesText, 
  filterNotesForStudent,
  isInternalMetadataNote,
  checkIsAudioTresorActive,
  checkIsAudioTresorReadOnly,
  calculateCampusSchoolYearNumber,
  type StickerUnlockContext,
  type StickerUnlockResult
} from '../domain/stickersAndTresor';

export { 
  ALL_STICKERS, 
  getUnifiedStickerStatus, 
  getUnifiedStickersMap, 
  cleanNotesText, 
  filterNotesForStudent,
  isInternalMetadataNote,
  checkIsAudioTresorActive,
  checkIsAudioTresorReadOnly
};
export type { StickerUnlockContext, StickerUnlockResult };

import { getSimulatedNow, getISOWeekRaw } from './student/studentDateUtils';
import { getInstrumentAvatarUrl, resolveCampusStudentAvatar } from './student/studentAvatars.constants';
import { SpeechDictationButton } from './student/SpeechDictationButton';
import {
  type Student,
  type MeisterwerkDocumentationModalProps,
  type ProgressItem,
  type ParsedStudentQuestion,
  type ParsedStudentAnnotation,
  formatPageNumbers,
  getCleanPageNotes,
  getCleanTeacherHomeworkText,
  formatStudentNoteDisplay,
  parseStudentQuestionFromNotes,
  parseStudentAnnotation,
  parseSongArtistAndTitle,
  SKILL_TAGS
} from './student/meisterwerk.types';

import {
  CassetteIcon,
  playCountInBeep,
  MasterworkAudioCapsule,
  InlineAudioPlayer,
  RetroCassettePlayer
} from './student/meisterwerk/MeisterwerkAudioPlayers';
import { MeisterwerkStickerAlbumTab } from './student/meisterwerk/MeisterwerkStickerAlbumTab';
import { MeisterwerkSkillRadarTab } from './student/meisterwerk/MeisterwerkSkillRadarTab';
import { MeisterwerkRecordingsTab } from './student/meisterwerk/MeisterwerkRecordingsTab';
import { MeisterwerkLogbuchTab } from './student/meisterwerk/MeisterwerkLogbuchTab';
import { MeisterwerkDocumentTab } from './student/meisterwerk/MeisterwerkDocumentTab';

export type { Student, MeisterwerkDocumentationModalProps, ProgressItem, ParsedStudentQuestion, ParsedStudentAnnotation };
export { 
  formatPageNumbers, 
  getCleanPageNotes, 
  getCleanTeacherHomeworkText, 
  formatStudentNoteDisplay, 
  parseStudentQuestionFromNotes, 
  parseStudentAnnotation, 
  parseSongArtistAndTitle, 
  SKILL_TAGS,
  SpeechDictationButton,
  InlineAudioPlayer,
  RetroCassettePlayer,
  MasterworkAudioCapsule,
  CassetteIcon,
  playCountInBeep
};

export const MeisterwerkDocumentationModal: React.FC<MeisterwerkDocumentationModalProps> = ({ 
  student, 
  onClose, 
  teacherId, 
  teacherName: propTeacherName,
  schoolName: propSchoolName,
  initialLehrwerkId, 
  initialViewMode, 
  initialModalTab, 
  onProfileClick, 
  readOnly = false, 
  isEmbed = false, 
  isTeacherTools = false, 
  uiLevel: propUiLevel,
  initialXp,
  initialStreak,
  initialPracticeMinutes,
  initialMasteredSongsCount,
  hasTresorStorage: propHasTresor,
  groupStudents: propGroupStudents,
  isParentUnlocked = false,
  parentPermissions: propParentPermissions,
  onSaveParentOverrides,
  isSoftLocked = false,
  onTriggerSoftLock,
  initialLehrwerke,
  initialSongs,
  initialProgressItems,
  initialLocalProgress,
  onSongsUpdated,
  isTeacherSandbox = false,
  onOpenAssignModal,
  schoolId: propSchoolId
}) => {
  const isTeacherSelf = isTeacherSandbox || isTeacherTools || student?.id === 'teacher-self' || student?.id === 'teacher-studio-sandbox' || (student as any)?.role === 'teacher' || (student as any)?.is_teacher || (student as any)?.role === 'admin';

  // 🛡️ REVISIONSSICHERE ALTERSTUFE: Reaktiv und prioritär synchron mit Elternbereich
  const resolveInitialUiLevel = (): 'junior' | 'teen' | 'pro' => {
    if (isTeacherSelf) return 'pro';
    const sId = student?.id;
    if (typeof window !== 'undefined' && sId && sId !== 'teacher-self') {
      const studentStorage = localStorage.getItem(`campus_student_ui_level_${sId}`);
      if (studentStorage === 'junior' || studentStorage === 'teen' || studentStorage === 'pro') {
        return studentStorage;
      }
    }
    const fromStudentObj = (student as any)?.campus_ui_level;
    if (fromStudentObj === 'junior' || fromStudentObj === 'teen' || fromStudentObj === 'pro') {
      return fromStudentObj;
    }
    if (propUiLevel === 'junior' || propUiLevel === 'teen' || propUiLevel === 'pro') {
      return propUiLevel;
    }
    if (typeof window !== 'undefined') {
      const globalStorage = localStorage.getItem('campus_student_ui_level');
      if (globalStorage === 'junior' || globalStorage === 'teen' || globalStorage === 'pro') {
        return globalStorage as 'junior' | 'teen' | 'pro';
      }
    }
    return 'junior';
  };

  const [uiLevel, setUiLevel] = useState<'junior' | 'teen' | 'pro'>(resolveInitialUiLevel);
  const [effectiveParentPermissions, setEffectiveParentPermissions] = useState<any>(() => {
    return propParentPermissions || (student as any)?.parent_permissions || null;
  });

  // Re-synchronize when propUiLevel or student changes
  useEffect(() => {
    const nextLvl = resolveInitialUiLevel();
    setUiLevel(nextLvl);
    if (propParentPermissions || (student as any)?.parent_permissions) {
      setEffectiveParentPermissions(propParentPermissions || (student as any)?.parent_permissions);
    }
  }, [student?.id, (student as any)?.campus_ui_level, propUiLevel]);

  // 🛡️ Live DB Sync & Cross-Tab/Event Sync mit dem Elternbereich
  useEffect(() => {
    if (isTeacherSelf || !student?.id || student.id === 'teacher-self') return;

    // 1. Authoritative DB fetch from users table
    supabase
      .from('users')
      .select('campus_ui_level, parent_permissions')
      .eq('id', student.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) {
          if (data.campus_ui_level && (data.campus_ui_level === 'junior' || data.campus_ui_level === 'teen' || data.campus_ui_level === 'pro')) {
            setUiLevel(data.campus_ui_level as 'junior' | 'teen' | 'pro');
            if (typeof window !== 'undefined') {
              localStorage.setItem(`campus_student_ui_level_${student.id}`, data.campus_ui_level);
            }
          }
          if (data.parent_permissions) {
            setEffectiveParentPermissions(data.parent_permissions);
          }
        }
      }, (e: any) => console.warn('[MeisterwerkDocumentationModal] DB ui_level fetch error:', e));

    // 2. CustomEvent listener (fired by Elternbereich on same window)
    const handleLevelChangeEvt = (e: any) => {
      const newLvl = e?.detail;
      if (newLvl && (newLvl === 'junior' || newLvl === 'teen' || newLvl === 'pro')) {
        setUiLevel(newLvl);
      }
    };
    window.addEventListener('campus_ui_level_changed', handleLevelChangeEvt);

    // 3. Storage listener (cross-tab / multi-window)
    const handleStorageEvt = (e: StorageEvent) => {
      if (e.key === `campus_student_ui_level_${student.id}` && e.newValue) {
        if (e.newValue === 'junior' || e.newValue === 'teen' || e.newValue === 'pro') {
          setUiLevel(e.newValue as 'junior' | 'teen' | 'pro');
        }
      }
    };
    window.addEventListener('storage', handleStorageEvt);

    // 4. Realtime subscription on users table for this student
    const channel = supabase
      .channel(`meisterwerk_student_level_${student.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${student.id}` },
        (payload: any) => {
          const updated = payload.new;
          if (updated?.campus_ui_level && (updated.campus_ui_level === 'junior' || updated.campus_ui_level === 'teen' || updated.campus_ui_level === 'pro')) {
            setUiLevel(updated.campus_ui_level as 'junior' | 'teen' | 'pro');
            if (typeof window !== 'undefined') {
              localStorage.setItem(`campus_student_ui_level_${student.id}`, updated.campus_ui_level);
            }
          }
          if (updated?.parent_permissions) {
            setEffectiveParentPermissions(updated.parent_permissions);
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('campus_ui_level_changed', handleLevelChangeEvt);
      window.removeEventListener('storage', handleStorageEvt);
      supabase.removeChannel(channel);
    };
  }, [student?.id, isTeacherSelf]);

  const [showAgeUiInfoModal, setShowAgeUiInfoModal] = useState<boolean>(false);
  const [recTargetLevel, setRecTargetLevel] = useState<'teen' | 'pro' | 'loopstation'>('teen');
  const [recNote, setRecNote] = useState<string>('');
  const [isSavingRec, setIsSavingRec] = useState<boolean>(false);
  const [recSuccess, setRecSuccess] = useState<boolean>(false);
  const isSessionTeacher = typeof window !== 'undefined' && (() => {
    try {
      const ws = sessionStorage.getItem('groovelab_active_workspace');
      if (ws === 'teacher' || ws === 'admin' || ws === 'secretary') return true;
      const cached = sessionStorage.getItem('groovelab_cached_user');
      if (cached) {
        const u = JSON.parse(cached);
        if (u && (u.role === 'teacher' || u.role === 'admin' || u.role === 'secretary' || u.is_teacher)) return true;
      }
      const role = sessionStorage.getItem('groovelab_user_role') || localStorage.getItem('groovelab_user_role');
      if (role === 'teacher' || role === 'admin' || role === 'secretary') return true;
    } catch (e) {}
    return false;
  })();
  const isTeacherMode = !readOnly || isTeacherTools || isTeacherSandbox || isSessionTeacher;
  const effectiveIsSoftLocked = isTeacherSelf ? false : isSoftLocked;
  const effectiveIsParentUnlocked = isTeacherSelf ? true : (isParentUnlocked || false);
  const studentFirstName = isTeacherSelf 
    ? (formatTeacherFullName(propTeacherName || student).split(' ')[0] || 'Lehrkraft')
    : (student?.first_name || (student as any)?.name?.split(' ')[0] || 'Schüler').trim();

  // 👥 DUO & GRUPPENUNTERRICHT: Compute all participants of the current lesson group
  const effectiveGroupStudents: Student[] = useMemo(() => {
    const list: Student[] = [];
    const addedIds = new Set<string>();
    const addStud = (s: any) => {
      if (!s) return;
      const sId = s.id || s.user_id || s.name || s.first_name;
      if (sId && !addedIds.has(sId)) {
        addedIds.add(sId);
        list.push(s);
      }
    };
    addStud(student);
    if (Array.isArray(propGroupStudents)) {
      propGroupStudents.forEach(addStud);
    }
    if (Array.isArray(student?.groupStudents)) {
      student.groupStudents.forEach(addStud);
    }
    if (Array.isArray((student as any)?.students)) {
      (student as any).students.forEach(addStud);
    }
    return list;
  }, [student?.id, (student as any)?.groupStudents, (student as any)?.students, propGroupStudents]);
  const [isCampusActive, setIsCampusActive] = useState<boolean>(student.is_campus_active ?? true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showProtokollOnboarding, setShowProtokollOnboarding] = useState<boolean>(() => {
    try {
      const seen = localStorage.getItem('groovelab_protokoll_onboarding_seen');
      return seen !== 'true';
    } catch (e) {
      return false;
    }
  });
  const [onboardingStep, setOnboardingStep] = useState<number>(0);

  // Skill-Radar & Feedback-Tagging
  const [showSkillRadar, setShowSkillRadar] = useState(false);
  const [pendingFeedbackTags, setPendingFeedbackTags] = useState<string[]>([]);
  const [pendingTargetFocusTags, setPendingTargetFocusTags] = useState<string[]>([]);
  const [pendingFeedbackStatus, setPendingFeedbackStatus] = useState<'beherrscht' | 'in_entwicklung' | 'wiederholen' | null>(null);
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const [studentPracticeFeedback, setStudentPracticeFeedback] = useState<string | null>(() => {
    try {
      const currentWeekStr = getISOWeek();
      return localStorage.getItem(`groovelab_student_feedback_${student?.id || 'default'}_${currentWeekStr}`);
    } catch (e) {
      return null;
    }
  });
  const activePlat = typeof window !== 'undefined' ? localStorage.getItem('groovelab_active_platform') : 'campus';
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(typeof window !== 'undefined' ? window.innerWidth : 1200);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('groovelab_orientation_changed', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('groovelab_orientation_changed', handleResize);
    };
  }, []);

  const isInsideSimMobile = typeof document !== 'undefined' && !!document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait');
  const isInsideSimTabletLandscape = typeof document !== 'undefined' && !!document.querySelector('.sim-viewport-tablet, .sim-viewport-landscape');
  const isInsideSim = isInsideSimMobile || isInsideSimTabletLandscape;
  const isMobileView = (windowWidth <= 768 && !isInsideSimTabletLandscape) || isInsideSimMobile;
  const [mobileProtokollTab, setMobileProtokollTab] = useState<'repertoire' | 'homework'>(readOnly ? 'homework' : 'repertoire');
  const [hubTab, setHubTab] = useState<'modules' | 'protocol'>((student?.is_campus_active === false) ? 'protocol' : 'modules');
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const radarAnalysisCardsRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  // Tastatur-Shortcut: F-Taste toggelt Vollbild
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
         activeEl.tagName === 'TEXTAREA' ||
         activeEl.getAttribute('contenteditable') === 'true')
      ) return;

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setIsFullscreen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const displayedStudentName = useMemo(() => {
    if (isTeacherSelf) {
      return formatTeacherFullName(propTeacherName || student) || 'Aufgaben-Studio';
    }
    return readOnly
      ? 'Aufgabenheft'
      : `${student.first_name}${student.last_name ? ' ' + student.last_name.trim().charAt(0) + '.' : ''}`;
  }, [readOnly, isTeacherSelf, propTeacherName, student.first_name, student.last_name]);

  const actualStudentName = useMemo(() => {
    if (isTeacherSelf) {
      return formatTeacherFullName(propTeacherName || student) || 'Lehrkraft';
    }
    const fName = (student.first_name || '').trim();
    if (!fName) return 'Musiker';
    if (readOnly) return fName; // 🛡️ Zero-Knowledge for students: strictly pure first name
    const lInitial = student.last_name ? ' ' + student.last_name.trim().charAt(0) + '.' : '';
    return `${fName}${lInitial}`;
  }, [readOnly, isTeacherSelf, propTeacherName, student.first_name, student.last_name]);

  const getSchoolYearString = (dateInput?: string | Date) => {
    let d = new Date();
    if (dateInput) {
      const parsed = new Date(dateInput);
      if (!isNaN(parsed.getTime())) {
        d = parsed;
      }
    }
    const year = d.getFullYear();
    const month = d.getMonth(); // 0-indexed (0 = Jan, 8 = Sept)
    if (month >= 8) {
      return `${year}/${year + 1}`;
    } else {
      return `${year - 1}/${year}`;
    }
  };

  useEffect(() => {
    if (!student.id) return;
    if (typeof student.is_campus_active === 'boolean') {
      setIsCampusActive(student.is_campus_active);
      if (student.is_campus_active === false) {
        setHubTab('protocol');
      }
      return;
    }
    supabase
      .from('users')
      .select('is_campus_active')
      .eq('id', student.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data && typeof data.is_campus_active === 'boolean') {
          setIsCampusActive(data.is_campus_active);
          if (data.is_campus_active === false) {
            setHubTab('protocol');
          }
        }
      });
  }, [student.id, student.is_campus_active]);

  const [studentInstrument, setStudentInstrument] = useState<string | null>(null);
  const [studentSchoolId, setStudentSchoolId] = useState<string | null>(null);
  const [studentTeacherId, setStudentTeacherId] = useState<string | null>(null);
  const [progressItems, setProgressItems] = useState<ProgressItem[]>(() => initialProgressItems || []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Left column navigation tab
  const [leftTab, setLeftTab] = useState<'lehrwerke' | 'songs' | 'history'>('lehrwerke');

  // Form State for editing / adding
  const [activeItem, setActiveItem] = useState<ProgressItem | null>(null);
  const [topicName, setTopicName] = useState('');
  const [status, setStatus] = useState<'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED'>('IN_PROGRESS');
  const [certModalSong, setCertModalSong] = useState<any | null>(null);
  const [resolvedSchoolName, setResolvedSchoolName] = useState<string>(() => {
    if (propSchoolName) return propSchoolName;
    if ((student as any)?.school_name) return (student as any).school_name;
    if ((student as any)?.schools?.name) return (student as any).schools.name;
    try {
      const raw = localStorage.getItem('groovelab_school_info');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.school_name || parsed.name) return parsed.school_name || parsed.name;
      }
    } catch {}
    return localStorage.getItem('groovelab_school_name') || localStorage.getItem('campus_school_name') || 'Campus-Groovelab Musikschule';
  });

  useEffect(() => {
    const sId = student?.school_id || (student as any)?.schoolId || studentSchoolId || localStorage.getItem('groovelab_school_id') || localStorage.getItem('campus_school_id');
    if (sId) {
      supabase
        .from('schools')
        .select('name')
        .eq('id', sId)
        .maybeSingle()
        .then(({ data }) => {
          if (data && data.name) {
            setResolvedSchoolName(data.name);
          }
        });
    }
  }, [student?.school_id, (student as any)?.schoolId, studentSchoolId]);

  const [isCurrentHomework, setIsCurrentHomework] = useState(false);
  const [teacherNotes, setTeacherNotes] = useState<string>(() => {
    try {
      return localStorage.getItem(`campus_teacher_notes_${student.id}`) || '';
    } catch {
      return '';
    }
  });
  const [generalHomeworkNotes, setGeneralHomeworkNotes] = useState<string>(() => {
    try {
      const currentWeek = getISOWeek();
      const cachedWeek = localStorage.getItem(`campus_homework_week_${student.id}`);
      if (cachedWeek && cachedWeek !== currentWeek) {
        return '';
      }
      const cached = localStorage.getItem(`campus_homework_notes_${student.id}`);
      if (cached && cached.startsWith('[') && cached.endsWith(']')) {
        const parsed = JSON.parse(cached);
        return parsed.filter((n: string) => 
          typeof n === 'string' && !isInternalMetadataNote(n)
        ).join('\n\n') || '';
      }
      return !isInternalMetadataNote(cached) ? (cached || '') : '';
    } catch {
      return '';
    }
  });
  const [songHomeworkNotes, setSongHomeworkNotes] = useState<string>('');
  const [pageHomeworkNotes, setPageHomeworkNotes] = useState<string>('');
  const [homeworkNotes, setHomeworkNotes] = useState<string>('');
  const [homeworkNotesList, setHomeworkNotesList] = useState<string[]>(() => {
    try {
      const currentWeek = getISOWeekRaw(undefined, 1);
      const candidateStudentIds = Array.from(new Set([
        student?.id,
        (student as any)?.student_id,
        (student as any)?.studentId,
        (student as any)?.canonical_uuid,
        (student as any)?.slot_id
      ].filter(Boolean))) as string[];

      let initialNotes: string[] = [];
      for (const cid of candidateStudentIds) {
        const cachedWeek = localStorage.getItem(`campus_homework_week_${cid}`);
        if (cachedWeek && cachedWeek !== currentWeek) {
          continue;
        }
        const cached = localStorage.getItem(`campus_homework_notes_${cid}`);
        if (cached && cached.startsWith('[') && cached.endsWith(']')) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              initialNotes = parsed;
              break;
            }
          } catch {}
        } else if (cached && cached.trim()) {
          initialNotes = [cached.trim()];
          break;
        }
      }

      // 🛡️ Fail-Safe: Always merge all takes from campus_teacher_audio_vault across candidateStudentIds
      candidateStudentIds.forEach(cid => {
        const vaultKey = `campus_teacher_audio_vault_${cid}`;
        const storedVault = localStorage.getItem(vaultKey);
        if (storedVault) {
          try {
            const parsedVault = JSON.parse(storedVault);
            if (Array.isArray(parsedVault)) {
              parsedVault.forEach((vItem: any) => {
                const vStr = typeof vItem === 'string' ? vItem : vItem?.audioMetaStr;
                if (vStr && vStr.includes('AUDIO:')) {
                  const vParts = vStr.substring(vStr.indexOf('AUDIO:') + 6).split('|');
                  const vUrl = vParts[0]?.trim();
                  const alreadyInList = initialNotes.some(m => typeof m === 'string' && m.includes('AUDIO:') && m.includes(vUrl));
                  if (!alreadyInList) {
                    initialNotes.push(vStr);
                  }
                }
              });
            }
          } catch {}
        }
      });

      return initialNotes;
    } catch {
      return [];
    }
  });
  const [studentNotes, setStudentNotes] = useState('');
  const [isStudentNotePrivate, setIsStudentNotePrivate] = useState(false);
  const [studentNotesSavedToast, setStudentNotesSavedToast] = useState(false);
  const [isQuestionEditorOpen, setIsQuestionEditorOpen] = useState(false);
  const [questionDraftText, setQuestionDraftText] = useState('');
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  const parsedStudentQuestion = useMemo(() => {
    return parseStudentQuestionFromNotes(homeworkNotesList);
  }, [homeworkNotesList]);

  const [resolvedTeacherName, setResolvedTeacherName] = useState<string>(() => {
    if (propTeacherName && propTeacherName !== 'Lehrkraft' && propTeacherName !== 'deine Lehrkraft') {
      return formatTeacherFullName(propTeacherName);
    }
    if ((student as any)?.teacher) {
      const f = formatTeacherFullName((student as any).teacher);
      if (f && f !== 'Lehrkraft') return f;
    }
    if ((student as any)?.teacher_name) {
      const f = formatTeacherFullName((student as any).teacher_name);
      if (f && f !== 'Lehrkraft') return f;
    }
    return '';
  });

  useEffect(() => {
    if (propTeacherName && propTeacherName !== 'Lehrkraft' && propTeacherName !== 'deine Lehrkraft') {
      setResolvedTeacherName(formatTeacherFullName(propTeacherName));
      return;
    }
    if (!resolvedTeacherName) {
      const cacheKeys = ['groovelab_cached_user', 'campus_cached_user', 'campus_user', 'groovelab_user'];
      for (const k of cacheKeys) {
        try {
          const raw = sessionStorage.getItem(k) || localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && (parsed.role === 'teacher' || parsed.role === 'admin' || isTeacherMode)) {
              const f = formatTeacherFullName(parsed);
              if (f && f !== 'Lehrkraft') {
                setResolvedTeacherName(f);
                return;
              }
            }
          }
        } catch {}
      }
    }
    const tid = teacherId || (student as any)?.teacher_id;
    if (tid && tid !== 'teacher-self' && !resolvedTeacherName) {
      supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', tid)
        .maybeSingle()
        .then(
          ({ data }) => {
            if (data && (data.first_name || data.last_name)) {
              const formatted = formatTeacherFullName(data);
              if (formatted && formatted !== 'Lehrkraft') {
                setResolvedTeacherName(formatted);
              }
            }
          },
          () => {}
        );
    }
  }, [teacherId, (student as any)?.teacher_id, propTeacherName]);

  const effectiveTeacherFullName = useMemo(() => {
    if (resolvedTeacherName && resolvedTeacherName !== 'Lehrkraft') return resolvedTeacherName;
    const raw = propTeacherName || (student as any)?.teacher_name || '';
    if (raw) {
      const f = formatTeacherFullName(raw);
      if (f && f !== 'Lehrkraft') return f;
    }
    if ((student as any)?.teacher) {
      const f = formatTeacherFullName((student as any).teacher);
      if (f && f !== 'Lehrkraft') return f;
    }
    return 'Lehrkraft';
  }, [resolvedTeacherName, propTeacherName, (student as any)?.teacher_name, (student as any)?.teacher]);

  const [isNotesFocused, setIsNotesFocused] = useState(false);
  const isNotesExpanded = isNotesFocused || !!generalHomeworkNotes.trim();
  const homeworkTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const studentNotesTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const studentNotesSelectionRef = React.useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const pageNotesTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const pageNotesSelectionRef = React.useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const songNotesTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const songNotesSelectionRef = React.useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const teacherNotesTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const latestGeneralHomeworkNotesRef = React.useRef<string>(generalHomeworkNotes);
  const latestTeacherNotesRef = React.useRef<string>(teacherNotes);

  React.useEffect(() => {
    latestGeneralHomeworkNotesRef.current = generalHomeworkNotes;
  }, [generalHomeworkNotes]);

  React.useEffect(() => {
    latestTeacherNotesRef.current = teacherNotes;
  }, [teacherNotes]);

  const adjustTextareaHeight = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    el.style.height = 'auto';
    el.style.height = `${Math.max(64, el.scrollHeight)}px`;
    if (start !== null && end !== null && document.activeElement === el) {
      try { el.setSelectionRange(start, end); } catch {}
    }
  };

  const lastClickRef = React.useRef<{ pageNum: number; timestamp: number } | null>(null);
  const clickTimeoutRef = React.useRef<any>(null);

  const [activeTagPickerRowIndex, setActiveTagPickerRowIndex] = useState<number | null>(null);

  // Song catalog integration
  const [activeInputTab, setActiveInputTab] = useState<'free' | 'catalog' | 'lehrwerk_page' | 'active_song'>('free');
  const [songs, setSongs] = useState<any[]>(() => initialSongs || []);
  const [songsLoading, setSongsLoading] = useState(false);
  const [songSearch, setSongSearch] = useState('');
  const [selectedSongId, setSelectedSongId] = useState<string>('');
  const [songPart, setSongPart] = useState('');

  // Lehrwerke assigned to student states
  const [globalLehrwerke, setGlobalLehrwerke] = useState<any[]>(() => {
    let list = Array.isArray(initialLehrwerke) ? [...initialLehrwerke] : [];
    try {
      if (typeof window !== 'undefined') {
        const storedCustom = localStorage.getItem('custom_lehrwerke');
        if (storedCustom) {
          const parsed = JSON.parse(storedCustom);
          if (Array.isArray(parsed)) {
            parsed.forEach((c: any) => {
              if (c && c.id) {
                const normTitle = (c.title || '').trim().toLowerCase();
                if (!list.some(m => String(m.id) === String(c.id) || (m.title || '').trim().toLowerCase() === normTitle)) {
                  list.push({
                    ...c,
                    totalPages: c.totalPages || c.total_pages || 50,
                    emoji: c.emoji || '📖',
                    color: c.color || '#34a853'
                  });
                }
              }
            });
          }
        }
      }
    } catch {}
    return list;
  });
  const [assignedLehrwerke, setAssignedLehrwerke] = useState<any[]>(() => {
    if (initialLocalProgress && Array.isArray(initialLocalProgress)) {
      return initialLocalProgress.filter((item: any) => String(item.studentId) === String(student.id));
    }
    return [];
  });
  const sortedAssignedLehrwerke = useMemo(() => {
    // 🛡️ Auto-healing: Merge any Lehrwerk found in progressItems or globalLehrwerke into assigned list and populate page states
    const combined = assignedLehrwerke.map(a => ({ ...a, pageStates: { ...(a.pageStates || {}) } }));
    (progressItems || []).forEach(item => {
      if (item.topic_name && item.topic_name.includes(' - Seite ')) {
        const parts = item.topic_name.split(' - Seite ');
        const bookTitle = parts[0].trim();
        const pageNum = parseInt(parts[1], 10);
        const book = globalLehrwerke.find(g => (g.title || '').trim().toLowerCase() === bookTitle.toLowerCase());
        const targetId = book?.id || `custom-${bookTitle.toLowerCase()}`;
        let assignment = combined.find(a => String(a.lehrwerkId) === String(targetId) || ((a.bookTitle || a.lehrwerkTitle || '').trim().toLowerCase() === bookTitle.toLowerCase()));
        if (!assignment) {
          assignment = {
            studentId: student.id,
            lehrwerkId: targetId,
            bookTitle: book?.title || bookTitle,
            lehrwerkTitle: book?.title || bookTitle,
            totalPages: book?.totalPages || book?.total_pages || 50,
            assignedAt: item.created_at || item.updated_at || new Date().toISOString(),
            pageStates: {}
          };
          combined.push(assignment);
        }
        if (!isNaN(pageNum) && assignment.pageStates) {
          if (!assignment.pageStates[pageNum] || item.is_current_homework) {
            let status: 'locked' | 'homework' | 'mastered' | 'purple' = 'locked';
            if (item.status === 'MASTERED') status = 'mastered';
            else if (item.status === 'THEORY_DONE') status = 'purple';
            else if (item.is_current_homework) status = 'homework';

            assignment.pageStates[pageNum] = {
              ...(assignment.pageStates[pageNum] || {}),
              status: assignment.pageStates[pageNum]?.status || status,
              isCurrentHomework: Boolean(item.is_current_homework),
              notes: item.teacher_notes || assignment.pageStates[pageNum]?.notes || '',
              homework_notes: item.homework_notes || assignment.pageStates[pageNum]?.homework_notes || ''
            };
          }
        }
      } else if (item.topic_name && item.topic_name.startsWith('Hausaufgabe KW ') && item.teacher_notes && item.teacher_notes.includes('SNAPSHOT_LEHRWERKE:')) {
        // 📚 Cold Cache / Online: Also unpack Lehrwerke and homework page states from SNAPSHOT_LEHRWERKE
        try {
          const snapshotIdx = item.teacher_notes.indexOf('SNAPSHOT_LEHRWERKE:');
          const afterSnapshot = item.teacher_notes.slice(snapshotIdx + 'SNAPSHOT_LEHRWERKE:'.length);
          const endIdx = afterSnapshot.search(/\n\n--- [A-Z_]+ ---|\n\nSNAPSHOT_/);
          const jsonStr = (endIdx !== -1 ? afterSnapshot.slice(0, endIdx) : afterSnapshot).trim();
          const parsed = JSON.parse(jsonStr);
          if (Array.isArray(parsed)) {
            parsed.forEach((lw: any) => {
              const bookTitle = (lw.title || lw.bookTitle || lw.lehrwerkTitle || '').trim();
              if (!bookTitle) return;
              const book = globalLehrwerke.find(g => (g.title || '').trim().toLowerCase() === bookTitle.toLowerCase());
              const targetId = lw.id || lw.lehrwerkId || book?.id || `custom-${bookTitle.toLowerCase()}`;
              let assignment = combined.find(a => String(a.lehrwerkId) === String(targetId) || ((a.bookTitle || a.lehrwerkTitle || '').trim().toLowerCase() === bookTitle.toLowerCase()));
              if (!assignment) {
                assignment = {
                  studentId: student.id,
                  lehrwerkId: targetId,
                  bookTitle: book?.title || bookTitle,
                  lehrwerkTitle: book?.title || bookTitle,
                  totalPages: lw.totalPages || book?.totalPages || book?.total_pages || 50,
                  assignedAt: item.created_at || new Date().toISOString(),
                  pageStates: {}
                };
                combined.push(assignment);
              }
              if (Array.isArray(lw.pages) && assignment.pageStates) {
                lw.pages.forEach((p: any) => {
                  const pNum = typeof p === 'object' ? p.page : parseInt(p, 10);
                  if (!isNaN(pNum) && !assignment.pageStates[pNum]) {
                    assignment.pageStates[pNum] = {
                      status: 'homework',
                      isCurrentHomework: true,
                      notes: (typeof p === 'object' ? p.notes : '') || '',
                      homework_notes: (typeof p === 'object' ? p.notes : '') || ''
                    };
                  }
                });
              }
            });
          }
        } catch (e) {
          console.warn('Could not parse SNAPSHOT_LEHRWERKE in sortedAssignedLehrwerke:', e);
        }
      }
    });

    return combined.sort((a, b) => {
      const timeA = a.assignedAt ? new Date(a.assignedAt).getTime() : 0;
      const timeB = b.assignedAt ? new Date(b.assignedAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [assignedLehrwerke, progressItems, globalLehrwerke, student.id]);

  // 🔄 Prop-Sync: When parent loads data asynchronously (cold cache / online server), sync incoming props into modal state
  React.useEffect(() => {
    if (initialProgressItems && initialProgressItems.length > 0) {
      setProgressItems(initialProgressItems);

      // 🛡️ Enterprise+ Cold-Cache Hydration: Extract audios, notes & snapshot songs from server snapshot row (KW item)
      try {
        const curWeekIso = getISOWeek();
        const candidateSnapshots = initialProgressItems.filter((item: any) => {
          if (!item.topic_name?.startsWith('Hausaufgabe KW ')) return false;
          return getItemWeek(item) === curWeekIso || (item.updated_at && getISOWeek(item.updated_at) === curWeekIso);
        });

        // Fallback to latest past snapshot if current week has no homework_notes yet
        if (candidateSnapshots.length === 0) {
          const pastSnapshots = initialProgressItems.filter((item: any) => item.topic_name?.startsWith('Hausaufgabe KW '));
          pastSnapshots.sort((a: any, b: any) => {
            const wA = getItemWeek(a) || '';
            const wB = getItemWeek(b) || '';
            if (wA !== wB) return wB.localeCompare(wA);
            const tA = new Date(a.updated_at || a.created_at || 0).getTime();
            const tB = new Date(b.updated_at || b.created_at || 0).getTime();
            return tB - tA;
          });
          if (pastSnapshots.length > 0) {
            candidateSnapshots.push(pastSnapshots[0]);
          }
        }

        const activeSnap = candidateSnapshots[0];
        if (activeSnap && activeSnap.homework_notes) {
          let parsedNotes: any[] = [];
          const rawNotes = activeSnap.homework_notes;
          try {
            if (typeof rawNotes === 'string' && rawNotes.startsWith('[') && rawNotes.endsWith(']')) {
              const p = JSON.parse(rawNotes);
              if (Array.isArray(p)) parsedNotes = p;
            } else if (typeof rawNotes === 'string' && rawNotes.trim()) {
              parsedNotes = [rawNotes.trim()];
            } else if (Array.isArray(rawNotes)) {
              parsedNotes = rawNotes;
            }
          } catch {}

          if (parsedNotes.length > 0) {
            setHomeworkNotesList(prev => {
              const merged = [...prev];
              parsedNotes.forEach(pItem => {
                if (!pItem || typeof pItem !== 'string') return;
                if (pItem.includes('AUDIO:')) {
                  const pParts = pItem.substring(pItem.indexOf('AUDIO:') + 6).split('|');
                  const pUrl = pParts[0]?.trim();
                  const exists = merged.some(m => typeof m === 'string' && m.includes('AUDIO:') && m.includes(pUrl));
                  if (!exists) merged.push(pItem);
                } else if (!merged.includes(pItem)) {
                  if (pItem.trim()) merged.push(pItem);
                }
              });
              return merged;
            });

            const textNotes = parsedNotes.filter(n => typeof n === 'string' && !isInternalMetadataNote(n)).join('\n\n');
            if (textNotes) {
              setGeneralHomeworkNotes(prev => prev.trim() ? prev : textNotes);
              setHomeworkNotes(prev => prev.trim() ? prev : textNotes);
            }
          }

          if (activeSnap.teacher_notes) {
            setTeacherNotes(prev => prev.trim() ? prev : activeSnap.teacher_notes);
          }
        }
      } catch (syncErr) {
        console.warn('[MeisterwerkDocumentationModal] Error hydrating snapshot from initialProgressItems:', syncErr);
      }
    }
  }, [initialProgressItems]);

  React.useEffect(() => {
    if (initialLehrwerke && initialLehrwerke.length > 0) {
      setGlobalLehrwerke(initialLehrwerke);
    }
  }, [initialLehrwerke]);

  React.useEffect(() => {
    if (initialLocalProgress && Array.isArray(initialLocalProgress)) {
      const studentAssigned = initialLocalProgress.filter((item: any) => String(item.studentId) === String(student.id));
      if (studentAssigned.length > 0) {
        setAssignedLehrwerke(studentAssigned);
      }
    }
  }, [initialLocalProgress, student.id]);

  React.useEffect(() => {
    if (initialSongs && initialSongs.length > 0) {
      setSongs(initialSongs);
      setActiveSongSkills(initialSongs);
    }
  }, [initialSongs]);

  const [activeLehrwerkId, setActiveLehrwerkId] = useState<string | null>(null);
  const [activePageNumber, setActivePageNumber] = useState<number | null>(null);
  const [activeSubView, setActiveSubView] = useState<'hub' | 'lehrwerk' | 'song' | 'history'>('hub');
  const [selectedHistoryWeek, setSelectedHistoryWeek] = useState<string | null>(null);
  const [songProgressPercent, setSongProgressPercent] = useState<number>(25);

  // Dual-Metacognition Match Model State
  const [studentRating, setStudentRating] = useState<number | null>(null);
  const [isMatchModeEnabled, setIsMatchModeEnabled] = useState<boolean>(false);
  const [lastMatchedAt, setLastMatchedAt] = useState<string | null>(null);
  const [lastMatchedTeacherPercent, setLastMatchedTeacherPercent] = useState<number | null>(null);
  const [lastMatchedStudentPercent, setLastMatchedStudentPercent] = useState<number | null>(null);
  const [isMatchSuccessful, setIsMatchSuccessful] = useState<boolean | null>(null);
  const [isMatchRevealed, setIsMatchRevealed] = useState<boolean>(false);
  const [showMatchConfetti, setShowMatchConfetti] = useState<boolean>(false);
  const [matchFeedbackToast, setMatchFeedbackToast] = useState<string | null>(null);
  const [isStudentRatingCommitted, setIsStudentRatingCommitted] = useState<boolean>(false);
  const [studentRatingUpdatedAt, setStudentRatingUpdatedAt] = useState<string | null>(null);
  const [matchHistory, setMatchHistory] = useState<Array<{
    matched_at: string;
    teacher_percent: number;
    student_percent: number;
    xp_amount: number;
    tier: 'tier1' | 'tier2' | 'tier3';
  }>>([]);
  const [showdownState, setShowdownState] = useState<{
    isRunning: boolean;
    teacherTarget: number;
    studentTarget: number;
    currentTeacherVal: number;
    currentStudentVal: number;
    tier: 'tier1' | 'tier2' | 'tier3';
    xpAmount: number;
    matchedAt: string;
  } | null>(null);

  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newCustomTagInput, setNewCustomTagInput] = useState<string>('');
  const [expandedTeacherAudioWeeks, setExpandedTeacherAudioWeeks] = useState<Record<string, boolean>>({});
  const [expandedStudentAudioWeeks, setExpandedStudentAudioWeeks] = useState<Record<string, boolean>>({});

  const toggleTeacherAudioWeek = (weekKey: string, defaultOpen: boolean = true) => {
    setExpandedTeacherAudioWeeks(prev => {
      const current = prev[weekKey] !== undefined ? prev[weekKey] : defaultOpen;
      return { ...prev, [weekKey]: !current };
    });
  };

  const toggleStudentAudioWeek = (weekKey: string, defaultOpen: boolean = true) => {
    setExpandedStudentAudioWeeks(prev => {
      const current = prev[weekKey] !== undefined ? prev[weekKey] : defaultOpen;
      return { ...prev, [weekKey]: !current };
    });
  };

  const handleAddCustomTag = () => {
    const val = newCustomTagInput.trim();
    if (!val) return;
    if (!SKILL_TAGS.some(st => st.key.toLowerCase() === val.toLowerCase()) && !customTags.some(ct => ct.toLowerCase() === val.toLowerCase())) {
      setCustomTags(prev => [...prev, val]);
    }
    if (pendingFeedbackTags.length < 2) {
      if (!pendingFeedbackTags.includes(val)) {
        setPendingFeedbackTags(prev => [...prev, val]);
      }
    }
    setNewCustomTagInput('');
  };

  // Feedback helpers
  const getFeedbackForWeek = (wk: string): { status: string; tags: string[]; at: string } | null => {
    const weekNum = wk.split('-W')[1] || '';
    const item = progressItems.find(item =>
      item.topic_name === `Hausaufgabe KW ${weekNum}` && item.homework_notes
    );
    if (!item) return null;
    try {
      const notes: string[] = JSON.parse(item.homework_notes || '[]');
      const fbStr = notes.find(n => n.startsWith('FEEDBACK:'));
      if (!fbStr) return null;
      return JSON.parse(fbStr.substring(9));
    } catch { return null; }
  };

  const saveFeedback = async (wk: string, tags: string[], fbStatus: string | null) => {
    const weekNum = wk.split('-W')[1] || '';
    const item = progressItems.find(it =>
      it.topic_name === `Hausaufgabe KW ${weekNum}` && it.id
    );
    const feedbackJson = `FEEDBACK:${JSON.stringify({ status: fbStatus, tags, at: new Date().toISOString() })}`;
    try {
      if (item?.id) {
        // Update existing Hausaufgabe-KW entry
        const notes: string[] = JSON.parse(item.homework_notes || '[]');
        const filteredNotes = notes.filter(n => !n.startsWith('FEEDBACK:'));
        if (fbStatus || tags.length > 0) filteredNotes.push(feedbackJson);
        const { error } = await supabase
          .from('progress_matrix')
          .update({ homework_notes: JSON.stringify(filteredNotes), updated_at: new Date().toISOString() })
          .eq('id', item.id);
        if (error) throw error;
        setProgressItems(prev => prev.map(p => p.id === item.id ? { ...p, homework_notes: JSON.stringify(filteredNotes) } : p));
      } else {
        // No Hausaufgabe-KW row yet — create one to hold the feedback
        const activeTId = await getCurrentTeacherId();
        const newNotes = (fbStatus || tags.length > 0) ? JSON.stringify([feedbackJson]) : '[]';
        const { data, error } = await supabase
          .from('progress_matrix')
          .insert({
            student_id: student.id,
            teacher_id: activeTId,
            topic_name: `Hausaufgabe KW ${weekNum}`,
            status: 'IN_PROGRESS',
            is_current_homework: false,
            teacher_notes: '',
            homework_notes: newNotes,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        if (error) throw error;
        if (data) setProgressItems(prev => [...prev, data]);
      }
    } catch (e) {
      console.error('Error saving feedback:', e);
    }
  };

  const [textbausteine] = useState<any[]>(() => {
    const stored = localStorage.getItem('groovelab_textbausteine');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.length > 0 && parsed.some((x: any) => x.category)) {
          return parsed;
        }
      } catch (e) {
        console.error("Error parsing textbausteine:", e);
      }
    }
    return [
      { id: 'r1', label: '🥁 Puls-Master', text: 'Klopfe den Puls mit dem Fuß und klatsche den Rhythmus im Vorfeld. Spreche die Notenwerte laut mit – dein innerer Puls ist das Fundament jedes Grooves!', type: 'both', category: 'rhythm', active: true },
      { id: 'r2', label: '⏱️ Metronom-Buddy', text: 'Starte mit dem Metronom bei einem entspannten Entschleunigungs-Tempo. Erhöhe das Tempo erst in 5er-Schritten, wenn die Passage 3-mal in Folge makellos im Takt lag.', type: 'both', category: 'rhythm', active: true },
      { id: 'r3', label: '🐌 Schnecken-Tempo', text: 'Zerlege die schwierige Stelle in echtes Lupen-Tempo. Wenn du jede Bewegung extrem langsam und präzise ausführst, schaltet dein Gehirn automatisch in den Turbo-Modus!', type: 'both', category: 'rhythm', active: true },
      { id: 'r4', label: '🧩 Puzzle-Taktik', text: 'Verbinde Mikromodule: Übe nicht das ganze Stück auf einmal, sondern isoliere genau einen Takt. Erst wenn dieses Puzzleteil perfekt sitzt, baust du die Brücke zum nächsten Takt.', type: 'both', category: 'rhythm', active: true },
      { id: 't1', label: '🔂 Ritter-Dreierspiel', text: 'Mastery-Regel: Wiederhole den kniffligen Übergang exakt dreimal hintereinander ohne den kleinsten Fehler. Das brennt die Bewegung direkt ins Muskelgedächtnis ein!', type: 'both', category: 'technique', active: true },
      { id: 't2', label: '👁️ Blind-Flug', text: 'Schließe beim Spielen bewusst die Augen und aktiviere deine innere Klangvorstellung. Vertraue deinem Tastsinn und dem Raumgefühl deiner Hände!', type: 'both', category: 'technique', active: true },
      { id: 't3', label: '🏋️‍♂️ Fokus-Gym', text: 'Führe die Bewegungsabläufe in Zeitlupe bei minimalem Kraftaufwand aus. Achte auf maximale Lockerheit in Schultern, Handgelenken und Fingern.', type: 'both', category: 'technique', active: true },
      { id: 't4', label: '🕵️‍♂️ Detail-Detektiv', text: 'Verfolge das Notenbild mit geschärftem Blick: Prüfe Vorzeichen, Artikulation (Staccato/Legato) und Fingersätze haargenau. Kein akustisches Detail bleibt unentdeckt!', type: 'lehrwerke', category: 'technique', active: true },
      { id: 'p1', label: '🎵 Laut-Leise Zauber', text: 'Erschaffe dramaturgische Kontraste! Gestalte den dynamischen Bogen spürbar zwischen zartem Pianissimo und kraftvollem Forte – gib den Tönen Raum zum Atmen.', type: 'both', category: 'performance', active: true },
      { id: 'p2', label: '🌟 Eigener Remix', text: 'Kreativitäts-Challenge: Überlege dir eine eigene stilistische Variation, ein cooles Lick oder eine kleine Verzierung für diesen Abschnitt. Bring deine eigene musikalische Handschrift ein!', type: 'songs', category: 'performance', active: true },
      { id: 'p3', label: '🎭 Storyteller', text: 'Welche Emotion oder Geschichte steckt in diesen Takten? Forme jeden Ton so, als würdest du einer Zuhörerschaft ein spannendes oder berührendes Abenteuer erzählen.', type: 'both', category: 'performance', active: true },
      { id: 'p4', label: '🌊 Atem-Fluss', text: 'Forme Phrasen wie ein erfahrener Sänger: Atme vor dem Phrasenbeginn ein und führe den Bogen organisch bis zum Entspannungspunkt der Phrase.', type: 'both', category: 'performance', active: true }
    ];
  });

  // Always start at hub view when modal opens
  useEffect(() => {
    setActiveSubView('hub');
    setActiveModalTab('document');
    setActiveLehrwerkId(null);
    setActivePageNumber(null);
    setSelectedActiveSongId('');
    if (readOnly || initialModalTab === 'document') {
      setMobileProtokollTab('homework');
    }
  }, [student.id, readOnly, initialModalTab]);

  // Load existing feedback when a week is selected in the archive
  useEffect(() => {
    if (!selectedHistoryWeek) {
      setPendingFeedbackTags([]);
      setPendingFeedbackStatus(null);
      return;
    }
    const fb = getFeedbackForWeek(selectedHistoryWeek);
    setPendingFeedbackTags(fb?.tags || []);
    setPendingFeedbackStatus((fb?.status as any) || null);
  }, [selectedHistoryWeek, progressItems]);

  const getLehrwerkColor = (title: string) => {
    const trimmed = (title || '').trim();
    const sorted = [...globalLehrwerke].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
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
      from: `hsl(${hue}, 85%, 92%)`,
      to: `hsl(${hue}, 80%, 82%)`,
      text: `hsl(${hue}, 90%, 25%)`,
      shadowFrom: `hsla(${hue}, 85%, 50%, 0.2)`,
      shadowTo: `hsla(${hue}, 80%, 40%, 0.15)`
    };
  };

  const renderSongVinylCover = (songColor: { from: string; to: string; text?: string }, size: 'sm' | 'md' | 'lg' = 'md') => {
    const isSm = size === 'sm';
    const isLg = size === 'lg';
    const sleeveSize = isSm ? 54 : isLg ? 102 : 94;
    const vinylSize = isSm ? 48 : isLg ? 92 : 84;
    const borderRadius = isSm ? 14 : isLg ? 25 : 23;
    const noteWidth = isSm ? 30 : isLg ? 52 : 46;
    const noteHeight = isSm ? 30 : isLg ? 52 : 46;
    const vinylRight = isSm ? -7 : isLg ? -13 : -11;

    const gradId = `fineVinylGrad_${(songColor?.from || 'blue').replace(/[^a-zA-Z0-9]/g, '')}_${size}`;
    const highId = `fineVinylHigh_${(songColor?.from || 'blue').replace(/[^a-zA-Z0-9]/g, '')}_${size}`;
    const headHigh1 = `fineHead1_${(songColor?.from || 'blue').replace(/[^a-zA-Z0-9]/g, '')}_${size}`;
    const headHigh2 = `fineHead2_${(songColor?.from || 'blue').replace(/[^a-zA-Z0-9]/g, '')}_${size}`;

    return (
      <div style={{
        position: 'relative',
        width: `${sleeveSize + (isSm ? 8 : 12)}px`,
        height: `${sleeveSize}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginLeft: isSm ? '-3px' : '-5px',
        flexShrink: 0
      }}>
        {/* 1. Sleek Black Vinyl Disc with Ultra-Fine Grooves */}
        <div style={{
          position: 'absolute',
          right: `${vinylRight}px`,
          width: `${vinylSize}px`,
          height: `${vinylSize}px`,
          borderRadius: '50%',
          boxShadow: '3px 5px 15px rgba(0, 0, 0, 0.32)',
          zIndex: 1,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width={vinylSize} height={vinylSize} viewBox="0 0 100 100" fill="none">
            <defs>
              <radialGradient id={`discBase_${gradId}`} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#2c2c30" />
                <stop offset="25%" stopColor="#141416" />
                <stop offset="60%" stopColor="#08080a" />
                <stop offset="90%" stopColor="#18181b" />
                <stop offset="100%" stopColor="#050506" />
              </radialGradient>
              {/* Anisotropic Light Reflection Beams */}
              <linearGradient id={`discSheen1_${gradId}`} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.22)" />
                <stop offset="35%" stopColor="rgba(255, 255, 255, 0)" />
                <stop offset="65%" stopColor="rgba(255, 255, 255, 0)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0.18)" />
              </linearGradient>
              <linearGradient id={`discSheen2_${gradId}`} x1="100" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.15)" />
                <stop offset="40%" stopColor="rgba(255, 255, 255, 0)" />
                <stop offset="60%" stopColor="rgba(255, 255, 255, 0)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0.12)" />
              </linearGradient>
            </defs>
            {/* Disc Body */}
            <circle cx="50" cy="50" r="49.5" fill={`url(#discBase_${gradId})`} />
            <circle cx="50" cy="50" r="49.5" fill={`url(#discSheen1_${gradId})`} />
            <circle cx="50" cy="50" r="49.5" fill={`url(#discSheen2_${gradId})`} />
            
            {/* Distinct, Crisp Concentric Vinyl Grooves */}
            <circle cx="50" cy="50" r="46.5" stroke="rgba(255,255,255,0.32)" strokeWidth="0.85" />
            <circle cx="50" cy="50" r="44" stroke="rgba(0,0,0,0.65)" strokeWidth="0.85" />
            <circle cx="50" cy="50" r="41.5" stroke="rgba(255,255,255,0.26)" strokeWidth="0.85" />
            <circle cx="50" cy="50" r="39" stroke="rgba(0,0,0,0.6)" strokeWidth="0.85" />
            <circle cx="50" cy="50" r="36.5" stroke="rgba(255,255,255,0.28)" strokeWidth="0.85" />
            <circle cx="50" cy="50" r="34" stroke="rgba(0,0,0,0.6)" strokeWidth="0.85" />
            <circle cx="50" cy="50" r="31.5" stroke="rgba(255,255,255,0.22)" strokeWidth="0.85" />
            <circle cx="50" cy="50" r="29" stroke="rgba(0,0,0,0.6)" strokeWidth="0.85" />
            <circle cx="50" cy="50" r="26.5" stroke="rgba(255,255,255,0.18)" strokeWidth="0.85" />
            <circle cx="50" cy="50" r="24" stroke="rgba(0,0,0,0.5)" strokeWidth="0.85" />
            <circle cx="50" cy="50" r="21.5" stroke="rgba(255,255,255,0.16)" strokeWidth="0.85" />
            
            {/* Outer Rim Light Edge */}
            <circle cx="50" cy="50" r="49" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          </svg>
        </div>

        {/* 2. Soft Pastel Rounded Square Sleeve */}
        <div style={{
          width: `${sleeveSize}px`,
          height: `${sleeveSize}px`,
          background: `linear-gradient(135deg, ${songColor.from} 0%, ${songColor.to} 100%)`,
          borderRadius: `${borderRadius}px`,
          boxShadow: '0 11px 24px -4px rgba(0, 0, 0, 0.1), 0 3px 7px -2px rgba(0, 0, 0, 0.05), inset 0 1.5px 2px rgba(255, 255, 255, 0.9)',
          border: '1.5px solid rgba(255, 255, 255, 0.8)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          boxSizing: 'border-box'
        }}>
          {/* 3. 10% Feiner 3D Double Music Note (Sleek, Glossy, Precision Engineered) */}
          <svg 
            width={noteWidth} 
            height={noteHeight} 
            viewBox="0 0 100 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            style={{ filter: 'drop-shadow(0 4.5px 7px rgba(0, 0, 0, 0.25)) drop-shadow(0 1.5px 2.5px rgba(0, 0, 0, 0.14))' }}
          >
            <defs>
              {/* Main 3D Dark Graphite Body */}
              <linearGradient id={gradId} x1="25" y1="15" x2="75" y2="85" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#2c2c30" />
                <stop offset="35%" stopColor="#18181b" />
                <stop offset="75%" stopColor="#0f0f12" />
                <stop offset="100%" stopColor="#08080a" />
              </linearGradient>
              
              {/* Head 1 Specular Glow */}
              <radialGradient id={headHigh1} cx="34" cy="67" r="12" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.45)" />
                <stop offset="45%" stopColor="rgba(255, 255, 255, 0.08)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
              </radialGradient>

              {/* Head 2 Specular Glow */}
              <radialGradient id={headHigh2} cx="67" cy="58" r="12" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.45)" />
                <stop offset="45%" stopColor="rgba(255, 255, 255, 0.08)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
              </radialGradient>

              {/* Top Beam Highlight Line */}
              <linearGradient id={highId} x1="39" y1="21" x2="78" y2="13" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.72)" />
                <stop offset="60%" stopColor="rgba(255, 255, 255, 0.26)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0.05)" />
              </linearGradient>
            </defs>

            {/* Left Note Head (10% feineres 3D-Oval) */}
            <ellipse cx="36" cy="68.5" rx="11.8" ry="8.8" transform="rotate(-19 36 68.5)" fill={`url(#${gradId})`} />
            <ellipse cx="36" cy="68.5" rx="11.8" ry="8.8" transform="rotate(-19 36 68.5)" fill={`url(#${headHigh1})`} />

            {/* Right Note Head (10% feineres 3D-Oval) */}
            <ellipse cx="68" cy="59.5" rx="11.8" ry="8.8" transform="rotate(-19 68 59.5)" fill={`url(#${gradId})`} />
            <ellipse cx="68" cy="59.5" rx="11.8" ry="8.8" transform="rotate(-19 68 59.5)" fill={`url(#${headHigh2})`} />

            {/* Left Stem (5.8px Schlanker Stab) */}
            <rect x="42" y="25" width="5.8" height="44" rx="2.9" fill={`url(#${gradId})`} />

            {/* Right Stem (5.8px Schlanker Stab) */}
            <rect x="74.2" y="16" width="5.8" height="44" rx="2.9" fill={`url(#${gradId})`} />

            {/* Top Beam (10% feinerer Verbindungsbalken) */}
            <path d="M 42 26 C 42 22 45 21 48.5 20.2 L 75.5 13.5 C 78.5 12.8 81.5 14.2 81.5 17.5 L 81.5 24.5 C 81.5 27.5 78.5 28.5 75.5 29.2 L 48.5 35.8 C 45 36.5 42 35.2 42 32 Z" fill={`url(#${gradId})`} />

            {/* Top Beam Specular Light Edge */}
            <path d="M 44.5 23 L 78.5 14.8" stroke={`url(#${highId})`} strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    );
  };

  const [pageGroupIndex, setPageGroupIndex] = useState(0);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);

  // Active Songs
  const [activeSongSkills, setActiveSongSkills] = useState<any[]>(() => initialSongs || []);
  const [selectedActiveSongId, setSelectedActiveSongId] = useState<string>('');
  const [rhythmVal, setRhythmVal] = useState<number>(25);
  const [fingerVal, setFingerVal] = useState<number>(25);
  const [expressionVal, setExpressionVal] = useState<number>(25);
  const [isSubSlidersExpanded, setIsSubSlidersExpanded] = useState<boolean>(false);

  // Active paintbrush mode
  const [activeBrush, setActiveBrush] = useState<'NONE' | 'LOCKED' | 'HOMEWORK' | 'MASTERED' | 'THEORY' | 'STUDENT_FOCUS'>('NONE');
  const [showAllPagesGrid, setShowAllPagesGrid] = useState(false);
  const [showAllPresets, setShowAllPresets] = useState(false);
  const [textbookPageChunkIndex, setTextbookPageChunkIndex] = useState<number>(() => {
    try {
      const val = localStorage.getItem('groovelab_textbook_page_chunk_index');
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  });

  const setPageChunk = (idx: number) => {
    setTextbookPageChunkIndex(idx);
    localStorage.setItem('groovelab_textbook_page_chunk_index', String(idx));
  };

  const [isSongSearchFocused, setIsSongSearchFocused] = useState(false);
  const [studentXP, setStudentXP] = useState<number>(initialXp ?? 0);
  const [studentStreak, setStudentStreak] = useState<number>(initialStreak ?? 0);
  const [studentPracticeMinutes, setStudentPracticeMinutes] = useState<number>(initialPracticeMinutes ?? 0);
  const [weeklyPracticeDays, setWeeklyPracticeDays] = useState<number>(0);

  useEffect(() => {
    if (initialXp !== undefined) setStudentXP(initialXp);
  }, [initialXp]);

  useEffect(() => {
    if (initialStreak !== undefined) setStudentStreak(initialStreak);
  }, [initialStreak]);

  useEffect(() => {
    if (initialPracticeMinutes !== undefined) setStudentPracticeMinutes(initialPracticeMinutes);
  }, [initialPracticeMinutes]);

  // Developer simulation states
  const [simulatedSongsCount, setSimulatedSongsCount] = useState<number | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [selectedSimSticker, setSelectedSimSticker] = useState<string>('fleiss-pionier');

  // Teacher Skill Level Overrides for Interactive Skill-Radar Cockpit (Single Source of Truth)
  const [skillOverrides, setSkillOverrides] = useState<{ [tagKey: string]: number }>(() => {
    try {
      if (student?.skill_radar_levels && typeof student.skill_radar_levels === 'object') {
        const db = student.skill_radar_levels;
        return {
          rhythmus: Number(db.rhythmus || 1),
          technik: Number(db.technik || 1),
          klang: Number(db.klang || db.intonation || 1),
          intonation: Number(db.klang || db.intonation || 1),
          ausdruck: Number(db.ausdruck || 1),
          repertoire: Number(db.repertoire || 1)
        };
      }
      const saved = localStorage.getItem(`groovelab_skill_overrides_${student?.id || 'default'}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.klang && !parsed.intonation) parsed.intonation = parsed.klang;
        if (parsed.intonation && !parsed.klang) parsed.klang = parsed.intonation;
        return parsed;
      }
      return {};
    } catch {
      return {};
    }
  });

  // Reactive listener for external skill radar changes (e.g. from TeacherStudentDetailModal)
  useEffect(() => {
    const handleSkillRadarChanged = (e: any) => {
      if (e.detail?.studentId && student?.id && e.detail.studentId === student.id) {
        if (e.detail.levels) {
          const lvls = e.detail.levels;
          setSkillOverrides({
            ...lvls,
            klang: lvls.klang || lvls.intonation || 1,
            intonation: lvls.klang || lvls.intonation || 1
          });
        }
        if (e.detail.weeklyFocus && e.detail.weeklyFocus !== 'ausgeglichen') {
          setPendingTargetFocusTags([e.detail.weeklyFocus]);
        }
      }
    };
    window.addEventListener('skill_radar_levels_changed', handleSkillRadarChanged);
    return () => window.removeEventListener('skill_radar_levels_changed', handleSkillRadarChanged);
  }, [student?.id]);

  const handleSetSkillLevel = (tagKey: string, targetLevel: number) => {
    if (readOnly && !isTeacherTools) return;
    const validLevel = Math.min(5, Math.max(1, targetLevel));
    setSkillOverrides(prev => {
      const updated = { ...prev, [tagKey]: validLevel };
      if (tagKey === 'klang') updated.intonation = validLevel;
      if (tagKey === 'intonation') updated.klang = validLevel;
      try {
        localStorage.setItem(`groovelab_skill_overrides_${student?.id || 'default'}`, JSON.stringify(updated));
        localStorage.setItem(`student_pillars_${student?.id || 'default'}`, JSON.stringify(updated));
      } catch (e) {}

      if (student?.id) {
        window.dispatchEvent(new CustomEvent('skill_radar_levels_changed', {
          detail: { studentId: student.id, levels: updated, weeklyFocus: pendingTargetFocusTags[0] || 'ausgeglichen' }
        }));
        const payload = {
          ...updated,
          intonation: updated.klang || updated.intonation,
          weekly_focus: pendingTargetFocusTags[0] || 'ausgeglichen'
        };
        student.skill_radar_levels = payload;
        supabase.from('users').update({ skill_radar_levels: payload }).eq('id', student.id).then(() => {});
      }

      return updated;
    });
    triggerDebouncedAutoSave(350);
  };

  const handleImproveSkill = (tagKey: string) => {
    setSkillOverrides(prev => {
      const current = prev[tagKey] ?? 3;
      const nextLevel = Math.min(5, current + 1);
      const updated = { ...prev, [tagKey]: nextLevel };
      if (tagKey === 'klang') updated.intonation = nextLevel;
      if (tagKey === 'intonation') updated.klang = nextLevel;
      try {
        localStorage.setItem(`groovelab_skill_overrides_${student?.id || 'default'}`, JSON.stringify(updated));
        localStorage.setItem(`student_pillars_${student?.id || 'default'}`, JSON.stringify(updated));
      } catch (e) {}

      if (student?.id) {
        window.dispatchEvent(new CustomEvent('skill_radar_levels_changed', {
          detail: { studentId: student.id, levels: updated, weeklyFocus: pendingTargetFocusTags[0] || 'ausgeglichen' }
        }));
        const payload = {
          ...updated,
          intonation: updated.klang || updated.intonation,
          weekly_focus: pendingTargetFocusTags[0] || 'ausgeglichen'
        };
        student.skill_radar_levels = payload;
        supabase.from('users').update({ skill_radar_levels: payload }).eq('id', student.id).then(() => {});
      }

      return updated;
    });
    triggerDebouncedAutoSave(350);
  };

  const handleTriggerSkillQuest = (tagKey: string) => {
    // Toggle active focus tag for this skill (Max 2)
    setPendingTargetFocusTags(prev => {
      let nextTags: string[];
      if (prev.includes(tagKey)) {
        nextTags = prev.filter(k => k !== tagKey);
      } else if (prev.length >= 2) {
        nextTags = [prev[1], tagKey];
      } else {
        nextTags = [...prev, tagKey];
      }

      if (student?.id) {
        window.dispatchEvent(new CustomEvent('skill_radar_levels_changed', {
          detail: { studentId: student.id, levels: skillOverrides, weeklyFocus: nextTags[0] || 'ausgeglichen' }
        }));
      }
      return nextTags;
    });
    triggerImmediateAutoSave();
  };

  const handleMasterAllSkills = () => {
    const updated: { [k: string]: number } = {};
    SKILL_TAGS.forEach(t => {
      updated[t.key] = 5; // Level 5 Meister
      if (t.legacyKey) updated[t.legacyKey] = 5;
    });
    setSkillOverrides(updated);
    try {
      localStorage.setItem(`groovelab_skill_overrides_${student?.id || 'default'}`, JSON.stringify(updated));
      localStorage.setItem(`student_pillars_${student?.id || 'default'}`, JSON.stringify(updated));
    } catch (e) {}

    if (student?.id) {
      window.dispatchEvent(new CustomEvent('skill_radar_levels_changed', {
        detail: { studentId: student.id, levels: updated, weeklyFocus: pendingTargetFocusTags[0] || 'ausgeglichen' }
      }));
      const payload = {
        ...updated,
        intonation: 5,
        weekly_focus: pendingTargetFocusTags[0] || 'ausgeglichen'
      };
      student.skill_radar_levels = payload;
      supabase.from('users').update({ skill_radar_levels: payload }).eq('id', student.id).then(() => {});
    }

    triggerImmediateAutoSave();
  };

  // Helper for 2-Tier Auto-Detection of Custom Textbausteine to Skill-Radar Tags
  const detectSkillTagFromText = (label: string, text: string, category?: string): string | null => {
    const combined = ((label || '') + ' ' + (text || '')).trim().toLowerCase();
    if (!combined) return null;

    if (combined.includes('metronom') || combined.includes('bpm') || combined.includes('tempo') || combined.includes('entschleunig') || combined.includes('schnecke') || combined.includes('rhythmus') || combined.includes('takt') || combined.includes('puls') || combined.includes('groove') || combined.includes('timing') || combined.includes('einzählen')) {
      return 'rhythmus';
    }
    if (combined.includes('finger') || combined.includes('hand') || combined.includes('griff') || combined.includes('haltung') || combined.includes('lockerheit') || combined.includes('technik') || combined.includes('motorik') || combined.includes('ansatz') || combined.includes('bogen') || combined.includes('stick')) {
      return 'technik';
    }
    if (combined.includes('klang') || combined.includes('ton') || combined.includes('intonation') || combined.includes('sauber') || combined.includes('artikulation') || combined.includes('staccato') || combined.includes('legato') || combined.includes('rein')) {
      return 'intonation';
    }
    if (combined.includes('ausdruck') || combined.includes('dynamik') || combined.includes('gefühl') || combined.includes('lautstärke') || combined.includes('phrasierung') || combined.includes('blind-flug') || combined.includes('emotion')) {
      return 'ausdruck';
    }
    if (combined.includes('auswendig') || combined.includes('blatt') || combined.includes('gedächtnis') || combined.includes('ohne noten') || combined.includes('repertoire') || combined.includes('bühne') || combined.includes('performance') || combined.includes('spielfluss') || combined.includes('routine') || combined.includes('song') || combined.includes('selbst')) {
      return 'repertoire';
    }

    if (category === 'rhythm') return 'rhythmus';
    if (category === 'technique') return 'technik';
    return null;
  };

  // Robust Universal Song Title Normalization & Matcher
  const getNormalizedSongTitle = (skillOrItem: any): string => {
    if (!skillOrItem) return '';
    if (typeof skillOrItem === 'string') {
      return skillOrItem.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase();
    }
    
    // Check if it's a textbook page or general homework note
    const topic = skillOrItem.topic_name || '';
    if (topic.includes(' - Seite ') || topic.startsWith('Hausaufgabe KW ')) {
      return '';
    }

    if (topic) {
      return topic.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase();
    }

    const artist = (skillOrItem.songs?.artist || skillOrItem.artist || '').trim();
    const title = (skillOrItem.songs?.title || skillOrItem.song_title || skillOrItem.title || '').trim();
    if (artist && title) return `${artist} - ${title}`.toLowerCase();
    return (title || artist).toLowerCase();
  };

  const getCanonicalSongKey = (skillOrItem: any): string => {
    const raw = getNormalizedSongTitle(skillOrItem);
    if (!raw) return '';
    if (raw.includes(' - ')) {
      return raw.split(' - ')[1].trim().toLowerCase();
    }
    return raw.trim().toLowerCase();
  };

  const isSongMatch = (itemA: any, itemB: any): boolean => {
    if (!itemA || !itemB) return false;
    const titleA = getNormalizedSongTitle(itemA);
    const titleB = getNormalizedSongTitle(itemB);
    if (!titleA || !titleB) return false;
    if (titleA === titleB) return true;
    
    const keyA = getCanonicalSongKey(itemA);
    const keyB = getCanonicalSongKey(itemB);
    if (keyA && keyB && keyA === keyB) return true;

    // Check if one contains the other (e.g. "Seven Nation Army" matches "The White Stripes - Seven Nation Army")
    if (titleA.includes(titleB) || titleB.includes(titleA)) return true;

    return false;
  };

  const [simStickerContext, setSimStickerContext] = useState<string>('Simulation');
  const [selectedPreviewSticker, setSelectedPreviewSticker] = useState<any | null>(null);
  const [selectedStickerDetailIdx, setSelectedStickerDetailIdx] = useState<number | null>(null);
  const [isDevSimulationActive, setIsDevSimulationActive] = useState<boolean>(false);
  const [awardedStickerToAnimate, setAwardedStickerToAnimate] = useState<any | null>(null);
  const [schoolName, setSchoolName] = useState<string>(() => (propSchoolName && propSchoolName !== 'Campus-Groovelab') ? propSchoolName : ((student as any)?.school_name || ''));
  const [shareCardLayout, setShareCardLayout] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    if (propSchoolName && propSchoolName !== 'Campus-Groovelab') {
      setSchoolName(propSchoolName);
    } else if (resolvedSchoolName && resolvedSchoolName !== 'Campus-Groovelab Musikschule' && resolvedSchoolName !== 'Campus-Groovelab') {
      setSchoolName(resolvedSchoolName);
    }
  }, [propSchoolName, resolvedSchoolName]);
  const [sessionLogs, setSessionLogs] = useState<string[]>([]);
  const [lessonDay, setLessonDay] = useState<number>(1);
  const [activeModalTab, setActiveModalTab] = useState<'document' | 'logbook' | 'stickeralbum' | 'skillradar' | 'audiobiography'>(initialModalTab || 'document');

  useEffect(() => {
    if (initialModalTab) {
      setActiveModalTab(initialModalTab);
      if (initialModalTab === 'document') {
        setActiveSubView('hub');
        setHubTab('modules');
        setActiveViewMode(initialViewMode || 'document');
      }
    }
  }, [initialModalTab, initialViewMode]);

  useEffect(() => {
    if (initialViewMode) {
      setActiveViewMode(initialViewMode);
    }
  }, [initialViewMode]);

  useEffect(() => {
    const handleResetToStartseite = () => {
      setActiveModalTab('document');
      setActiveViewMode('document');
      setActiveSubView('hub');
      setHubTab('modules');
      setMobileProtokollTab('homework');
      setSelectedActiveSongId('');
      setActiveLehrwerkId(null);
    };
    window.addEventListener('campus_reset_homework_board', handleResetToStartseite);
    return () => window.removeEventListener('campus_reset_homework_board', handleResetToStartseite);
  }, []);
  const [simulatedStickers, setSimulatedStickers] = useState<Record<string, { count: number; details: { topic: string; date: string }[] }>>({});
  const currentSchoolYear = useMemo(() => getSchoolYearString(), []);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>(currentSchoolYear);

  const availableSchoolYears = useMemo(() => {
    const yearsSet = new Set<string>();
    yearsSet.add(currentSchoolYear);

    if (student?.created_at) {
      yearsSet.add(getSchoolYearString(student.created_at));
    }
    if (student?.activated_at) {
      yearsSet.add(getSchoolYearString(student.activated_at));
    }
    (progressItems || []).forEach(item => {
      if (item.created_at) yearsSet.add(getSchoolYearString(item.created_at));
      if (item.updated_at) yearsSet.add(getSchoolYearString(item.updated_at));
    });

    if (isDevSimulationActive || Object.keys(simulatedStickers).length > 0) {
      const parts = currentSchoolYear.split('/').map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        yearsSet.add(`${parts[0] - 1}/${parts[1] - 1}`);
        yearsSet.add(`${parts[0] - 2}/${parts[1] - 2}`);
      }
    }

    return Array.from(yearsSet).sort().reverse();
  }, [currentSchoolYear, student?.created_at, student?.activated_at, progressItems, isDevSimulationActive, simulatedStickers]);

  const simulateMultiYearProgress = () => {
    setSimulatedStickers({
      'fleiss-pionier': { count: 1, details: [{ topic: 'Fleiß-Pionier', date: '2025-09-10' }] },
      'uebe-meister': { count: 1, details: [{ topic: 'Übe-Meister', date: '2025-11-01' }] },
      'uebe-legende': { count: 1, details: [{ topic: 'Übe-Legende', date: '2026-02-15' }] },
      'uebe-grossmeister': { count: 1, details: [{ topic: 'Übe-Großmeister', date: '2026-05-20' }] },
      'xp-sammler': { count: 1, details: [{ topic: 'XP-Sammler', date: '2025-09-15' }] },
      'xp-champion': { count: 1, details: [{ topic: 'XP-Champion', date: '2025-11-20' }] },
      'xp-meister': { count: 1, details: [{ topic: 'XP-Meister', date: '2026-02-10' }] },
      'xp-legende': { count: 1, details: [{ topic: 'XP-Legende', date: '2026-06-01' }] },
      'streak-kaiser': { count: 1, details: [{ topic: 'Streak-Kaiser', date: '2026-03-01' }] },
      'repertoire-gigant': { count: 1, details: [{ topic: 'Repertoire-Gigant', date: '2026-06-15' }] },
      'stage-star': { count: 3, details: [{ topic: 'Stage-Star', date: '2026-07-01' }] }
    });
    alert('🎉 3 Schuljahre wurden simuliert! Nutze das Schuljahr-Dropdown im Header, um zwischen 2025/2026 (Aktuell), 2024/2025 (Hall of Fame) und 2023/2024 (Hall of Fame) umzuschalten.');
  };

  const triggerCelebrationTest = () => {
    const stickerToCelebrate = ALL_STICKERS.find(s => s.id === 'uebe-grossmeister') || ALL_STICKERS[0];
    setAwardedStickerToAnimate(stickerToCelebrate);
    setSelectedPreviewSticker(stickerToCelebrate);
  };

  // Persistent memory cache for sticker image assets to prevent garbage collection and eliminate loading flicker
  const preloadedStickerImagesRef = useRef<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    ALL_STICKERS.forEach(st => {
      if (!preloadedStickerImagesRef.current[st.id]) {
        const img = new Image();
        img.src = `/stickers/${st.id}.png?v=1`;
        preloadedStickerImagesRef.current[st.id] = img;
      }
    });
  }, []);

  const [stickerCategoryFilter, setStickerCategoryFilter] = useState<'all' | 'ueben' | 'xp' | 'streaks' | 'songs' | 'spezial'>('all');
  const [isXpLegendOpen, setIsXpLegendOpen] = useState<boolean>(false);
  const [activeViewMode, setActiveViewMode] = useState<'document' | 'recordings' | 'loopstation' | 'practice' | 'tuner' | 'groovetrainer' | 'earlab'>(initialViewMode || 'document');

  useEffect(() => {
    if (isSoftLocked && !isTeacherMode && (activeViewMode === 'loopstation' || activeViewMode === 'practice' || activeViewMode === 'recordings' || activeViewMode === 'groovetrainer' || activeViewMode === 'earlab')) {
      setActiveViewMode('document');
      if (onTriggerSoftLock) onTriggerSoftLock();
    }
  }, [isSoftLocked, isTeacherMode, activeViewMode, onTriggerSoftLock]);

  // Speech Recognition & Audio play-along state
  const [isListening, setIsListening] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioLabel, setAudioLabel] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [localJuniorRecordingsTrigger, setLocalJuniorRecordingsTrigger] = useState(0);

  // 🏷️ Reactive Song-Tag Overrides for Audio Recordings: audioUrl -> songTag
  const [audioSongTags, setAudioSongTags] = useState<{ [url: string]: string }>(() => {
    try {
      if (student?.id) {
        const stored = localStorage.getItem(`campus_audio_song_tags_${student.id}`);
        if (stored) return JSON.parse(stored);
      }
    } catch {}
    return {};
  });

  const handleUpdateAudioSongTag = (audioUrl: string, songTag: string | null) => {
    if (!audioUrl) return;
    setAudioSongTags(prev => {
      const next = { ...prev };
      if (songTag && songTag.trim() !== '') {
        next[audioUrl] = songTag.trim();
      } else {
        delete next[audioUrl];
      }
      try {
        if (student?.id) {
          localStorage.setItem(`campus_audio_song_tags_${student.id}`, JSON.stringify(next));
        }
      } catch {}
      return next;
    });

    // Also update student recordings in localStorage if applicable
    try {
      if (student?.id) {
        const juniorKey = `campus_junior_recordings_${student.id}`;
        const stored = localStorage.getItem(juniorKey);
        if (stored) {
          const list = JSON.parse(stored);
          if (Array.isArray(list)) {
            let changed = false;
            list.forEach((rec: any) => {
              if (rec.url === audioUrl) {
                rec.songTag = songTag && songTag.trim() !== '' ? songTag.trim() : undefined;
                changed = true;
              }
            });
            if (changed) {
              localStorage.setItem(juniorKey, JSON.stringify(list));
              setLocalJuniorRecordingsTrigger(p => p + 1);
            }
          }
        }
      }
    } catch {}
  };
  const [mediaRecorderInstance, setMediaRecorderInstance] = useState<MediaRecorder | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTargetRef = useRef<{ songId?: string; label?: string; isMasterwork?: boolean }>({});
  const [activeRecordingSongId, setActiveRecordingSongId] = useState<string | null>(null);
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const activeAudioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const useNotebookLayout = false;
  const recordingTimerRef = React.useRef<any>(null);
  const recordStartTimeRef = React.useRef<number>(0);
  const accumulatedTranscriptRef = React.useRef<string>('');

  // ⏱️ Mechanical Metronome Icon Component (Harmonic Precision Silhouette)
  const MechanicalMetronomeIcon = ({ size = 18, color = "currentColor", strokeWidth = 2 }: { size?: number; color?: string; strokeWidth?: number }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {/* Precision pyramid body */}
      <path d="M5.5 21h13l-3.8-15.5a1 1 0 0 0-.97-.8h-3.46a1 1 0 0 0-.97.8L5.5 21z" />
      {/* Center pendulum slot */}
      <path d="M12 7.5v10.5" strokeOpacity={0.45} />
      {/* Swinging pendulum arm */}
      <path d="M12 18l4.2-9.5" />
      {/* Sliding tempo weight / bob */}
      <rect x="14.2" y="10" width="3.4" height="2.4" rx="0.7" fill={color} strokeWidth={0} />
    </svg>
  );


  // 🔍 Unified Omnisearch, Favorites, Month & Song Album States
  const [recordingSearchQuery, setRecordingSearchQuery] = useState<string>("");
  const [selectedTeacherMonth, setSelectedTeacherMonth] = useState<{ key: string; label: string } | null>(null);
  const [selectedStudentMonth, setSelectedStudentMonth] = useState<{ key: string; label: string } | null>(null);
  const [selectedTeacherSongAlbum, setSelectedTeacherSongAlbum] = useState<string | null>(null);
  const [selectedStudentSongAlbum, setSelectedStudentSongAlbum] = useState<string | null>(null);
  const [showTeacherFavoritesOnly, setShowTeacherFavoritesOnly] = useState<boolean>(false);
  const [showStudentFavoritesOnly, setShowStudentFavoritesOnly] = useState<boolean>(false);
  const [showTeacherHomeworkArchive, setShowTeacherHomeworkArchive] = useState<boolean>(false);
  const [openHomeworkWeekAccordions, setOpenHomeworkWeekAccordions] = useState<string[]>([]);
  const [isTeacherHomeworkExpanded, setIsTeacherHomeworkExpanded] = useState<boolean>(readOnly ? true : false);
  const [isStudentWeekExpanded, setIsStudentWeekExpanded] = useState<boolean>(false);
  const [recordingSavedToast, setRecordingSavedToast] = useState<string | null>(null);
  const [mobileRecordingsTab, setMobileRecordingsTab] = useState<'teacher' | 'student'>('teacher');
  const [favoriteAudioUrls, setFavoriteAudioUrls] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`campus_audio_favorites_${student?.id || "default"}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const toggleFavoriteAudio = (audioUrl: string) => {
    setFavoriteAudioUrls(prev => {
      const updated = prev.includes(audioUrl) ? prev.filter(u => u !== audioUrl) : [...prev, audioUrl];
      try {
        localStorage.setItem(`campus_audio_favorites_${student?.id || "default"}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // 🎨 Curated Seasonal Jewel Vinyl Spectrum for Monthly Album Covers
  const getMonthAlbumTheme = (monthKey: string) => {
    const monthNum = parseInt(monthKey.split('-')[1] || '1', 10);
    switch (monthNum) {
      case 1: // Januar - Nordic Glacier
        return {
          bg: 'linear-gradient(135deg, #0284c7 0%, #0369a1 60%, #075985 100%)',
          shadow: 'rgba(2, 132, 199, 0.35)',
          glow: '#38bdf8'
        };
      case 2: // Februar - Amethyst Velvet
        return {
          bg: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 60%, #5b21b6 100%)',
          shadow: 'rgba(124, 58, 237, 0.35)',
          glow: '#a78bfa'
        };
      case 3: // März - Spring Emerald
        return {
          bg: 'linear-gradient(135deg, #059669 0%, #047857 60%, #064e3b 100%)',
          shadow: 'rgba(5, 150, 105, 0.35)',
          glow: '#34d399'
        };
      case 4: // April - Cherry Blossom
        return {
          bg: 'linear-gradient(135deg, #e11d48 0%, #be123c 60%, #9f1239 100%)',
          shadow: 'rgba(225, 29, 72, 0.35)',
          glow: '#fb7185'
        };
      case 5: // Mai - Fresh Meadow
        return {
          bg: 'linear-gradient(135deg, #16a34a 0%, #15803d 60%, #166534 100%)',
          shadow: 'rgba(22, 163, 74, 0.35)',
          glow: '#4ade80'
        };
      case 6: // Juni - Sunburst Gold
        return {
          bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 60%, #b45309 100%)',
          shadow: 'rgba(217, 119, 6, 0.35)',
          glow: '#fde047'
        };
      case 7: // Juli - Azure Lagoon
        return {
          bg: 'linear-gradient(135deg, #0891b2 0%, #0e7490 60%, #155e75 100%)',
          shadow: 'rgba(8, 145, 178, 0.35)',
          glow: '#22d3ee'
        };
      case 8: // August - Sunset Tangerine
        return {
          bg: 'linear-gradient(135deg, #ea580c 0%, #c2410c 60%, #9a3412 100%)',
          shadow: 'rgba(234, 88, 12, 0.35)',
          glow: '#fb923c'
        };
      case 9: // September - Electric Cobalt
        return {
          bg: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 60%, #3730a3 100%)',
          shadow: 'rgba(79, 70, 229, 0.35)',
          glow: '#818cf8'
        };
      case 10: // Oktober - Autumn Terracotta
        return {
          bg: 'linear-gradient(135deg, #b45309 0%, #92400e 60%, #78350f 100%)',
          shadow: 'rgba(180, 83, 9, 0.35)',
          glow: '#f59e0b'
        };
      case 11: // November - Deep Slate Mocha
        return {
          bg: 'linear-gradient(135deg, #57534e 0%, #44403c 60%, #292524 100%)',
          shadow: 'rgba(87, 83, 78, 0.35)',
          glow: '#a8a29e'
        };
      case 12: // Dezember - Crimson Velvet
        return {
          bg: 'linear-gradient(135deg, #be123c 0%, #9f1239 60%, #881337 100%)',
          shadow: 'rgba(190, 18, 60, 0.35)',
          glow: '#f43f5e'
        };
      default:
        return {
          bg: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 60%, #3730a3 100%)',
          shadow: 'rgba(79, 70, 229, 0.35)',
          glow: '#818cf8'
        };
    }
  };

  // 📅 KW Week Navigation Offset (0 = Current Week, -1 = Previous Week, etc. Hausaufgabe zeigt immer 'Diese Woche')
  const [viewingWeekOffset, setViewingWeekOffset] = useState<number>(0);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);

  useEffect(() => {
    setViewingWeekOffset(0);
  }, [student?.id]);

  const getTargetWeekIso = useCallback((offset: number): string => {
    const target = getSimulatedNow();
    if (offset !== 0) {
      target.setDate(target.getDate() + (offset * 7));
    }
    return getISOWeek(target);
  }, []);

  const getWeekDateRange = useCallback((offset: number) => {
    const target = getSimulatedNow();
    target.setDate(target.getDate() + (offset * 7));

    const day = target.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(target);
    monday.setDate(target.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const startDay = monday.getDate();
    const endDay = sunday.getDate();
    const startMonth = monday.toLocaleDateString('de-DE', { month: 'short' }).replace('.', '');
    const endMonth = sunday.toLocaleDateString('de-DE', { month: 'short' }).replace('.', '');

    const dateSpan = startMonth === endMonth
      ? `${startDay}. – ${endDay}. ${startMonth}`
      : `${startDay}. ${startMonth} – ${endDay}. ${endMonth}`;

    let label = 'Diese Woche';
    if (offset === -1) label = 'Letzte Woche';
    else if (offset < -1) label = `Vor ${Math.abs(offset)} Wochen`;
    else if (offset === 1) label = 'Folgewoche';
    else if (offset > 1) label = `In ${offset} Wochen`;
    else if (offset === 0) label = 'Diese Woche';

    return { dateSpan, label };
  }, []);

  // 🏷️ Didaktischer Kategorie-Filter (#Technik, #Repertoire, #Theorie, #Konzert, #Hausaufgabe, #Wichtig)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  // 🔊 Enterprise+ Sequential Phrase-Queue TTS Engine mit 4 wählbaren Varianten
  // 'neural_thorsten' = Option A: Neuronale KI-Stimme (Piper WASM Studio-Hörbuch)
  // 'neural_kerstin'  = Option A: Neuronale KI-Frauenstimme (Piper WASM)
  // 'cheerful'        = Option B: Fröhlich & Motivierend (Native Acoustic Tuning + Chime)
  // 'classic'         = Option C: Klassisch & Sachlich (Native Pitch 1.0)
  const [ttsMode, setTtsMode] = useState<'neural_thorsten' | 'neural_kerstin' | 'cheerful' | 'classic'>(() => {
    try {
      const saved = localStorage.getItem('campus_tts_mode');
      if (saved === 'neural_thorsten' || saved === 'neural_kerstin' || saved === 'cheerful' || saved === 'classic') {
        return saved;
      }
      return 'neural_thorsten';
    } catch {
      return 'neural_thorsten';
    }
  });

  const [ttsStatusText, setTtsStatusText] = useState<string | null>(null);

  const handleSetTtsMode = useCallback((mode: 'neural_thorsten' | 'neural_kerstin' | 'cheerful' | 'classic') => {
    setTtsMode(mode);
    try {
      localStorage.setItem('campus_tts_mode', mode);
    } catch {}
  }, []);

  const [isTtsSpeaking, setIsTtsSpeaking] = useState<boolean>(false);
  const [activeTtsKey, setActiveTtsKey] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(() => {
    try {
      return localStorage.getItem('campus_tts_voice_uri') || '';
    } catch {
      return '';
    }
  });
  const ttsSessionIdRef = useRef<number>(0);

  // 🎵 Web Audio API Motivational Intro Chime (100% Kostenlos, 0kb Netzwerklast, DSGVO-konform)
  const playMotivationalTtsIntroChime = useCallback((mode: string) => {
    if (mode === 'classic') return; // Kein Chime in Variante classic
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;

      // Fröhlicher 4-Ton-Aufgang (C5, E5, G5, C6)
      const notes = [
        { freq: 523.25, time: 0.00, dur: 0.10 },
        { freq: 659.25, time: 0.07, dur: 0.12 },
        { freq: 783.99, time: 0.14, dur: 0.14 },
        { freq: 1046.50, time: 0.21, dur: 0.24 }
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);
        gain.gain.setValueAtTime(0.001, now + time);
        gain.gain.exponentialRampToValueAtTime(0.15, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + time);
        osc.stop(now + time + dur + 0.04);
      });

      setTimeout(() => {
        try {
          ctx.close();
        } catch {
          // ignore
        }
      }, 700);
    } catch (e) {
      console.warn('[TTS] Audio chime failed gracefully:', e);
    }
  }, []);

  // Pre-load and listen to dynamic browser voice registry
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      try {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          setAvailableVoices(v);
        }
      } catch (e) {
        console.warn('[TTS] Failed to load voices:', e);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const selectBestGermanVoice = (): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const germanVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('de'));
    if (germanVoices.length === 0) {
      return voices[0] || null;
    }

    // 🚀 Latenz-Optimierung: Bevorzuge lokale Offline-Stimmen (0 ms Netzwerklatenz)
    // Cloud-/Online-Stimmen (z.B. Edge 'Online (Natural)', Chrome 'Google Deutsch') senden Audiodaten
    // über das Internet, was eine Startverzögerung von 1,5 bis 3 Sekunden verursacht.
    const isNetworkVoice = (v: SpeechSynthesisVoice) =>
      v.localService === false ||
      v.name.toLowerCase().includes('online') ||
      v.name.toLowerCase().includes('network');

    const localVoices = germanVoices.filter(v => !isNetworkVoice(v));
    const pool = localVoices.length > 0 ? localVoices : germanVoices;

    // 1. Lokale System-Favoriten (Apple Anna, Helena, Petra, Markus, Martin, Siri, Microsoft Katja, Stefan, etc.)
    const preferredNames = ['anna', 'helena', 'petra', 'markus', 'martin', 'siri', 'katja', 'amira', 'marlene', 'vicki', 'stefan', 'hedda'];
    for (const name of preferredNames) {
      const match = pool.find(v => v.name.toLowerCase().includes(name));
      if (match) return match;
    }

    // 2. Lokale erweiterte / enhanced Stimmen
    const enhanced = pool.find(v => 
      v.name.toLowerCase().includes('enhanced') || 
      v.name.toLowerCase().includes('premium') || 
      v.name.toLowerCase().includes('erweitert')
    );
    if (enhanced) return enhanced;

    // 3. Beliebige erste lokale Stimme aus dem Pool
    if (pool.length > 0) return pool[0];

    // 4. Letzter Fallback auf Cloud-/Online-Stimmen
    return germanVoices[0] || null;
  };

  const handleStopSpeaking = () => {
    ttsSessionIdRef.current += 1;
    stopNeuralSpeech();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      // 🚀 Chromium/WebKit Queue-Unfreeze: Sofort resume() aufrufen, um das 3-5s Einfrieren der Queue zu verhindern
      try {
        window.speechSynthesis.resume();
      } catch {}
    }
    setIsTtsSpeaking(false);
    setActiveTtsKey(null);
    setTtsStatusText(null);
  };

  // Ensure speech is cancelled on component unmount
  useEffect(() => {
    return () => {
      ttsSessionIdRef.current += 1;
      stopNeuralSpeech();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        try {
          window.speechSynthesis.resume();
        } catch {}
      }
    };
  }, []);

  const handleSpeakText = async (textOrPhrases: string | string[], elementKey: string = 'global') => {
    if (isTtsSpeaking && activeTtsKey === elementKey) {
      handleStopSpeaking();
      return;
    }

    handleStopSpeaking();

    // 🧼 Bereinige Text zuerst über die zentrale kindgerechte TTS-Engine, bevor Sätze geteilt werden
    const normalizedInput = Array.isArray(textOrPhrases)
      ? textOrPhrases.map(p => cleanTextForTts(p)).join(' ')
      : cleanTextForTts(textOrPhrases);

    const rawPhrases = normalizedInput
      .split(/(?<=[.!?])\s+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (rawPhrases.length === 0) return;

    // 🔗 Greeting-Fusion: Verschmelze kurze Eröffnungsphrasen (< 30 Zeichen, z.B. "Hallo!", "Super gemacht!"),
    // damit die Begrüßung flüssig ohne störende Sprechpause in den ersten Satz übergeht.
    const phrases: string[] = [];
    for (let i = 0; i < rawPhrases.length; i++) {
      const p = rawPhrases[i];
      if (phrases.length === 0 && p.length < 30 && i < rawPhrases.length - 1) {
        phrases.push(`${p} ${rawPhrases[i + 1]}`);
        i++;
      } else {
        phrases.push(p);
      }
    }

    const currentSessionId = ++ttsSessionIdRef.current;
    setIsTtsSpeaking(true);
    setActiveTtsKey(elementKey);

    // 🌟 Native Fallback / Native Tuning Engine (Web Speech API)
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Sprachausgabe wird in diesem Browser nicht unterstützt.');
      setIsTtsSpeaking(false);
      setActiveTtsKey(null);
      return;
    }

    const bestVoice = selectBestGermanVoice();

    // 🎵 Fröhlicher Chime (startet parallel im Hintergrund – blockiert nicht die Sprach-Initialisierung)
    playMotivationalTtsIntroChime('cheerful');

    // 💓 Heartbeat-Schutz gegen Chromium 15-Sekunden-Pause-Bug
    const heartbeatInterval = setInterval(() => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
    }, 3000);

    try {
      for (let i = 0; i < phrases.length; i++) {
        if (ttsSessionIdRef.current !== currentSessionId) {
          break; // Cancelled
        }

        const phrase = phrases[i];
        await new Promise<void>((resolve) => {
          const utterance = new SpeechSynthesisUtterance(phrase);
          utterance.lang = 'de-DE';
          
          utterance.pitch = 1.04;
          utterance.rate = 0.91;
          utterance.volume = 0.65;

          if (bestVoice) {
            utterance.voice = bestVoice;
          }

          utterance.onend = () => {
            resolve();
          };

          utterance.onerror = (e) => {
            console.warn('[TTS] Phrase speech error:', e);
            resolve();
          };

          // Vor jedem Absenden Warteschlange entsperren
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }

          window.speechSynthesis.speak(utterance);
        });

        if (ttsSessionIdRef.current !== currentSessionId) {
          break; // Cancelled during utterance
        }

        if (i < phrases.length - 1) {
          await new Promise((r) => setTimeout(r, 100));
        }
      }
    } finally {
      clearInterval(heartbeatInterval);
      if (ttsSessionIdRef.current === currentSessionId) {
        setIsTtsSpeaking(false);
        setActiveTtsKey(null);
        setTtsStatusText(null);
      }
    }
  };

  const buildCompleteWeeklyHomeworkSpeechPhrases = (
    weekNumber: string,
    lehrwerkeList: { title: string; pages: number[]; notes?: string[] }[],
    songList: { title: string; note?: string }[],
    audioNotes: { label?: string }[],
    generalNoteText: string
  ): string[] => {
    if (lehrwerkeList.length === 0 && songList.length === 0 && (!audioNotes || audioNotes.length === 0) && (!generalNoteText || !generalNoteText.trim())) {
      return ['Für diese Woche sind noch keine Hausaufgaben eingetragen.'];
    }

    const narrative = buildContinuousHomeworkNarrative({
      teacherName: (effectiveTeacherFullName && !/^(deine\s+lehrkraft|lehrkraft|fachlehrkraft)$/i.test(effectiveTeacherFullName.trim())) 
        ? effectiveTeacherFullName 
        : ((student as any)?.teacher_name || (student as any)?.teacher?.name || undefined),
      instrument: (student as any)?.instrument || (student as any)?.instrument_type,
      books: lehrwerkeList.map(b => ({
        title: b.title,
        pageNums: b.pages,
        notes: b.notes
      })),
      songs: songList.map(s => ({
        title: s.title,
        note: s.note
      })),
      audioCount: audioNotes ? audioNotes.length : 0,
      generalNotes: generalNoteText
    });

    return [narrative];
  };

  const generateSmartAudioTitle = (
    isTeacher: boolean, 
    customLabel?: string, 
    overrideSongId?: string,
    existingAudios?: any[]
  ): string => {
    // 1. Check if an active song or topic exists
    const activeSong = (activeSongSkills || []).find(s => (overrideSongId && s.id === overrideSongId) || (selectedActiveSongId && s.id === selectedActiveSongId));
    const songTitle = activeSong?.songs?.title || activeSong?.title || activeSong?.song_title;
    const cleanTopic = (topicName || "").trim();
    const meaningfulTopic = cleanTopic && !cleanTopic.toLowerCase().startsWith("hausaufgabe") && !cleanTopic.toLowerCase().startsWith("allgemein") && cleanTopic !== 'Meisterwerk-Aufnahme' ? cleanTopic : null;
    const targetSubject = songTitle || meaningfulTopic || undefined;

    return formatHarmonizedAudioTitle({
      label: customLabel,
      songTag: targetSubject,
      topic: targetSubject,
      date: getSimulatedNow().toISOString(),
      isTeacher
    }, existingAudios, isTeacher, targetSubject);
  };

  const matchesAudioSearch = (aud: any, searchQuery: string): boolean => {
    if (!searchQuery || !searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    
    // 1. Match in direct text label / title / notes / songTag / harmonizedTitle / baseTopic
    const label = (aud.harmonizedTitle || aud.label || aud.title || "").toLowerCase();
    const songTag = (aud.songTag || "").toLowerCase();
    const baseTopic = (aud.baseTopic || "").toLowerCase();
    if (label.includes(q) || songTag.includes(q) || baseTopic.includes(q)) return true;

    // 2. Resolve date keywords
    const d = aud.date ? new Date(aud.date) : null;
    if (d && !isNaN(d.getTime())) {
      const weekdayFull = d.toLocaleDateString("de-DE", { weekday: "long" }).toLowerCase();
      const weekdayShort = d.toLocaleDateString("de-DE", { weekday: "short" }).toLowerCase();
      const monthFull = d.toLocaleDateString("de-DE", { month: "long" }).toLowerCase();
      const monthShort = d.toLocaleDateString("de-DE", { month: "short" }).toLowerCase();
      const dayNum = String(d.getDate());
      const monthNum = String(d.getMonth() + 1).padStart(2, "0");
      const yearNum = String(d.getFullYear());
      const timeStr = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
      const weekStr = getISOWeek(d);
      const weekNum = weekStr.split("-W")[1] || "";

      const datePatterns = [
        weekdayFull,
        weekdayShort.replace('.', ''),
        monthFull,
        monthShort.replace('.', ''),
        `${dayNum}.${monthNum}`,
        `${dayNum}. ${monthShort}`,
        `${dayNum}. ${monthFull}`,
        `kw ${weekNum}`,
        `kw${weekNum}`,
        `woche ${weekNum}`,
        yearNum,
        timeStr
      ];

      if (datePatterns.some(pat => pat.includes(q) || q.includes(pat))) {
        return true;
      }
    }

    // 3. Match role / visibility / category keywords
    const visibility = (aud.visibility || "").toLowerCase();
    const source = (aud.source || "").toLowerCase();
    if (q.includes("lehrer") || q.includes("lehrkraft") || q.includes("unterricht")) {
      if (source.includes("teacher") || visibility.includes("teacher") || label.includes("unterricht")) return true;
    }
    if (q.includes("schüler") || q.includes("übung") || q.includes("take") || q.includes("privat")) {
      if (source.includes("junior") || visibility.includes("private") || label.includes("übe")) return true;
    }
    if (q.includes("favorit") || q.includes("stern") || q.includes("gemerkt")) {
      if (favoriteAudioUrls.includes(aud.url)) return true;
    }

    return false;
  };

  // ⏱️ Recording Metronome / Click State
  const [isRecordingMetronomeActive, setIsRecordingMetronomeActive] = useState<boolean>(false);
  const [recordingBpm, setRecordingBpm] = useState<number>(100);
  const [showRecordingMetronomePopup, setShowRecordingMetronomePopup] = useState<boolean>(false);
  const recordingMetronomeIntervalRef = useRef<any>(null);
  const recordingMetronomeAudioCtxRef = useRef<AudioContext | null>(null);
  const recordingMetronomeRef = useRef<HTMLDivElement | null>(null);
  const isStoppingAudioRef = useRef<boolean>(false);

  useEffect(() => {
    if (!showRecordingMetronomePopup) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (recordingMetronomeRef.current && !recordingMetronomeRef.current.contains(e.target as Node)) {
        setShowRecordingMetronomePopup(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowRecordingMetronomePopup(false);
    };
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('touchstart', handleOutside);
    window.addEventListener('keydown', handleEsc);

    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('touchstart', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [showRecordingMetronomePopup]);

  const playMetronomeTick = (isAccent: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!recordingMetronomeAudioCtxRef.current || recordingMetronomeAudioCtxRef.current.state === 'closed') {
        recordingMetronomeAudioCtxRef.current = new AudioCtx();
      }
      const ctx = recordingMetronomeAudioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isAccent ? 1200 : 800, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.045);
    } catch {}
  };

  useEffect(() => {
    if (isRecordingAudio && isRecordingMetronomeActive) {
      const intervalMs = (60 / recordingBpm) * 1000;
      let beat = 0;
      playMetronomeTick(true);
      recordingMetronomeIntervalRef.current = setInterval(() => {
        beat = (beat + 1) % 4;
        playMetronomeTick(beat === 0);
      }, intervalMs);
    } else {
      if (recordingMetronomeIntervalRef.current) {
        clearInterval(recordingMetronomeIntervalRef.current);
        recordingMetronomeIntervalRef.current = null;
      }
      if (recordingMetronomeAudioCtxRef.current && recordingMetronomeAudioCtxRef.current.state !== 'closed') {
        recordingMetronomeAudioCtxRef.current.close().catch(() => {});
        recordingMetronomeAudioCtxRef.current = null;
      }
    }

    return () => {
      if (recordingMetronomeIntervalRef.current) {
        clearInterval(recordingMetronomeIntervalRef.current);
        recordingMetronomeIntervalRef.current = null;
      }
      if (recordingMetronomeAudioCtxRef.current && recordingMetronomeAudioCtxRef.current.state !== 'closed') {
        recordingMetronomeAudioCtxRef.current.close().catch(() => {});
        recordingMetronomeAudioCtxRef.current = null;
      }
    };
  }, [isRecordingAudio, isRecordingMetronomeActive, recordingBpm]);

  // ⏱️ Play-Along Count-In (4-Beat Vorzähler) & Metronome Popover State
  const [isCountInEnabled, setIsCountInEnabled] = useState<boolean>(true);
  const [playAlongCountInRemaining, setPlayAlongCountInRemaining] = useState<number | null>(null);
  const [showPlayAlongMetronomePopup, setShowPlayAlongMetronomePopup] = useState<boolean>(false);
  const playAlongCountInIntervalRef = useRef<any>(null);
  const pendingCountInStreamRef = useRef<MediaStream | null>(null);
  const pendingCountInAudioCtxRef = useRef<AudioContext | null>(null);
  const pendingCountInPreparedRef = useRef<any>(null);

  // ⏱️ General Record Count-In (4-Beat Vorzähler) & Recent Success Feedback
  const [recordCountInRemaining, setRecordCountInRemaining] = useState<number | null>(null);
  const [justRecordedAudioUrl, setJustRecordedAudioUrl] = useState<string | null>(null);
  const [justRecordedAudioLabel, setJustRecordedAudioLabel] = useState<string | null>(null);
  const recordCountInIntervalRef = useRef<any>(null);
  const pendingRecordStreamRef = useRef<MediaStream | null>(null);
  const pendingRecordAudioCtxRef = useRef<AudioContext | null>(null);
  const pendingRecordPreparedRef = useRef<any>(null);

  const cancelActiveRecordCountIn = useCallback(() => {
    if (recordCountInIntervalRef.current) {
      clearInterval(recordCountInIntervalRef.current);
      recordCountInIntervalRef.current = null;
    }
    if (pendingRecordStreamRef.current) {
      try {
        pendingRecordStreamRef.current.getTracks().forEach(track => {
          track.stop();
          pendingRecordStreamRef.current?.removeTrack(track);
        });
      } catch (e) {}
      pendingRecordStreamRef.current = null;
    }
    if (pendingRecordAudioCtxRef.current && pendingRecordAudioCtxRef.current.state !== 'closed') {
      try {
        pendingRecordAudioCtxRef.current.close().catch(() => {});
      } catch (e) {}
      pendingRecordAudioCtxRef.current = null;
    }
    pendingRecordPreparedRef.current = null;
    setRecordCountInRemaining(null);
  }, []);

  useEffect(() => {
    return () => {
      cancelActiveRecordCountIn();
    };
  }, [cancelActiveRecordCountIn]);

  const cancelPlayAlongCountIn = useCallback(() => {
    if (playAlongCountInIntervalRef.current) {
      clearInterval(playAlongCountInIntervalRef.current);
      playAlongCountInIntervalRef.current = null;
    }
    if (pendingCountInStreamRef.current) {
      try {
        pendingCountInStreamRef.current.getTracks().forEach(track => {
          track.stop();
          pendingCountInStreamRef.current?.removeTrack(track);
        });
      } catch (e) {}
      pendingCountInStreamRef.current = null;
    }
    if (pendingCountInAudioCtxRef.current && pendingCountInAudioCtxRef.current.state !== 'closed') {
      try {
        pendingCountInAudioCtxRef.current.close().catch(() => {});
      } catch (e) {}
      pendingCountInAudioCtxRef.current = null;
    }
    pendingCountInPreparedRef.current = null;
    setPlayAlongCountInRemaining(null);
  }, []);

  useEffect(() => {
    return () => {
      cancelPlayAlongCountIn();
    };
  }, [cancelPlayAlongCountIn]);

  const [activeNoteTarget, setActiveNoteTarget] = useState<'student' | 'teacher'>('student');

  useEffect(() => {
    if (studentNotesTextareaRef.current) {
      adjustTextareaHeight(studentNotesTextareaRef.current);
    }
  }, [generalHomeworkNotes, viewingWeekOffset, activeNoteTarget]);

  useEffect(() => {
    if (teacherNotesTextareaRef.current) {
      adjustTextareaHeight(teacherNotesTextareaRef.current);
    }
  }, [teacherNotes, activeNoteTarget]);

  const isStudentTresorActive = useMemo(() => {
    return checkIsAudioTresorActive(student);
  }, [
    student?.id,
    student?.school_id,
    (student as any)?.has_audio_tresor,
    (student as any)?.storage_addon_gb,
    (student as any)?.storage_addon_status,
    (student as any)?.schools
  ]);

  const [hasTresorStorage, setHasTresorStorage] = useState<boolean>(() => {
    if (propHasTresor === true) return true;
    return checkIsAudioTresorActive(student);
  });

  useEffect(() => {
    if (propHasTresor === true || isStudentTresorActive) {
      setHasTresorStorage(true);
    } else if (propHasTresor === false && !isStudentTresorActive) {
      setHasTresorStorage(false);
    }
  }, [propHasTresor, isStudentTresorActive]);

  useEffect(() => {
    let active = true;
    if (propHasTresor === true || isStudentTresorActive) {
      setHasTresorStorage(true);
      return;
    }
    const checkTresor = async () => {
      const rawSch = (student as any)?.schools || (student as any)?.school;
      const schObj = Array.isArray(rawSch) ? rawSch[0] : rawSch;
      let targetSchoolId = 
        student?.school_id || 
        (student as any)?.schoolId || 
        schObj?.id ||
        sessionStorage.getItem('groovelab_school_id') || 
        localStorage.getItem('groovelab_school_id') || 
        sessionStorage.getItem('campus_school_id') ||
        localStorage.getItem('campus_school_id') ||
        localStorage.getItem('groovelab_last_school_id') ||
        localStorage.getItem('school_id');

      if (!targetSchoolId) {
        try {
          const cachedUser = JSON.parse(localStorage.getItem('groovelab_cached_user') || '{}');
          if (cachedUser?.school_id) targetSchoolId = cachedUser.school_id;
        } catch (e) {}
      }

      if (!targetSchoolId && student?.id && student.id !== 'teacher-self') {
        try {
          const { data: stRec } = await supabase
            .from('users')
            .select('school_id')
            .eq('id', student.id)
            .maybeSingle();
          if (stRec?.school_id) targetSchoolId = stRec.school_id;
        } catch (e) {}
      }

      if (!targetSchoolId) {
        try {
          const currentUid = typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_user_id') : null;
          if (currentUid) {
            const { data: uRec } = await supabase
              .from('users')
              .select('school_id')
              .eq('id', currentUid)
              .maybeSingle();
            if (uRec?.school_id) targetSchoolId = uRec.school_id;
          }
        } catch (e) {}
      }

      if (targetSchoolId) {
        try {
          const { data: sch } = await supabase
            .from('schools')
            .select('storage_addon_gb, storage_addon_status')
            .eq('id', targetSchoolId)
            .maybeSingle();
          if (active && sch && Number(sch.storage_addon_gb || 0) > 0 && sch.storage_addon_status !== 'cancelled') {
            setHasTresorStorage(true);
            return;
          }
        } catch (e) {}
      }

      // Fallback: check if the primary active school has booked Audio-Tresor
      try {
        const { data: activeSchools } = await supabase
          .from('schools')
          .select('id, storage_addon_gb, storage_addon_status')
          .gt('storage_addon_gb', 0)
          .neq('storage_addon_status', 'cancelled')
          .limit(1);
        if (active && activeSchools && activeSchools.length > 0) {
          setHasTresorStorage(true);
        }
      } catch (e) {}
    };
    checkTresor();
    return () => { active = false; };
  }, [student?.id, student?.school_id, propHasTresor, isStudentTresorActive]);

  const formatRecordTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        } catch (e) {
          console.warn("Failed to stop media recorder on unmount:", e);
        }
      }
      if ((window as any).recognitionInstance) {
        try {
          (window as any).recognitionInstance.stop();
        } catch (e) {
          console.warn("Failed to stop speech recognition on unmount:", e);
        }
      }
    };
  }, []);
  const [pageUndoStack, setPageUndoStack] = useState<{ lehrwerkId: string, pageNum: number, prevStatus: any }[]>([]);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  const summarizeVoiceNotes = async (textStr: string) => {
    if (!textStr || !textStr.trim()) return;
    try {
      setSaving(true);
      const { data, error: invokeErr } = await supabase.functions.invoke('summarize-homework', {
        body: { transcript: textStr }
      });
      if (invokeErr) throw invokeErr;
      const textToAppend = data?.summary ? `• ${data.summary}` : `• ${textStr}`;
      
      if (activeInputTab === 'active_song') {
        setSongHomeworkNotes(prev => prev ? `${prev}\n${textToAppend}` : textToAppend);
      } else if (activeInputTab === 'lehrwerk_page') {
        setPageHomeworkNotes(prev => prev ? `${prev}\n${textToAppend}` : textToAppend);
      } else {
        setGeneralHomeworkNotes(prev => prev ? `${prev}\n${textToAppend}` : textToAppend);
      }
      setHasChanges(true);
      triggerDebouncedAutoSave(300);
    } catch (e) {
      console.error("Error summarizing voice notes:", e);
      const textToAppend = `• ${textStr}`;
      if (activeInputTab === 'active_song') {
        setSongHomeworkNotes(prev => prev ? `${prev}\n${textToAppend}` : textToAppend);
      } else if (activeInputTab === 'lehrwerk_page') {
        setPageHomeworkNotes(prev => prev ? `${prev}\n${textToAppend}` : textToAppend);
      } else {
        setGeneralHomeworkNotes(prev => prev ? `${prev}\n${textToAppend}` : textToAppend);
      }
      setHasChanges(true);
      triggerDebouncedAutoSave(300);
    } finally {
      setSaving(false);
    }
  };

  // Speech Recognition setup
  const toggleSpeechRecognition = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Spracherkennung wird von Ihrem Browser leider nicht unterstützt (empfohlen: Google Chrome oder Safari).");
      return;
    }

    if (isListening) {
      setIsListening(false);
      if ((window as any).recognitionInstance) {
        (window as any).recognitionInstance.stop();
      }
    } else {
      // 🛡️ Centralized One-Time Permission Gatekeeper (Unified Session Authorization)
      const hasPermission = await requestMicrophonePermissionOnce();
      if (!hasPermission) {
        setIsListening(false);
        return;
      }

      setIsListening(true);
      accumulatedTranscriptRef.current = '';
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'de-DE';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          accumulatedTranscriptRef.current += finalTranscript;
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === 'not-allowed') {
          localStorage.removeItem('campus_microphone_permission_granted');
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        const textStr = accumulatedTranscriptRef.current.trim();
        if (textStr) {
          summarizeVoiceNotes(textStr);
        }
      };

      (window as any).recognitionInstance = recognition;
      recognition.start();
    }
  };

  // Audio Recorder logic
  const prepareRecordingEngine = async (overrideSongId?: string | React.MouseEvent, overrideLabel?: string, isMasterworkSong = false) => {
    const rawSongId = typeof overrideSongId === 'string' ? overrideSongId : null;
    const isMasterwork = Boolean(isMasterworkSong);
    const targetSongId = rawSongId || (isMasterwork ? selectedActiveSongId : (selectedActiveSongId || undefined));
    const targetLabel = (typeof overrideLabel === 'string' ? overrideLabel : null) || audioLabel || '';
    recordingTargetRef.current = { songId: targetSongId || undefined, label: targetLabel, isMasterwork };
    if (targetSongId && isMasterwork) {
      setSelectedActiveSongId(targetSongId);
      setActiveRecordingSongId(targetSongId);
    }
    if (targetLabel && targetLabel !== 'Meisterwerk-Aufnahme') {
      setAudioLabel(targetLabel);
    }

    const userRoleInSession = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_user_role') || localStorage.getItem('groovelab_user_role')) : null;
    const isStudentActor = !isTeacherTools && userRoleInSession?.toLowerCase() === 'student' && readOnly;
    if (isStudentActor) {
      const isAudioDenied = (student as any)?.parent_allow_audio === false || 
        ((student as any)?.parent_permissions?.allow_student_audio === false);
      if (isAudioDenied) {
        alert('Die Aufnahme-Funktion für Schüler ist im Eltern-Kontrollzentrum aktuell pausiert. Bitte deine Eltern, sie im Eltern-Bereich zu aktivieren.');
        return null;
      }
    }

    if (checkIsAudioTresorReadOnly(student)) {
      alert('Der Audio-Tresor deiner Musikschule befindet sich im geschützten Nur-Lese-Modus (Zahlungsrückstand der B2B-Infrastruktur). Bestehende Aufnahmen können uneingeschränkt angehört und heruntergeladen werden. Neue Uploads sind vorübergehend pausiert.');
      return null;
    }

    const audioNotesCount = homeworkNotesList.filter(note => note.startsWith("AUDIO:")).length;
    if (!hasTresorStorage && audioNotesCount >= 12) {
      alert("Limit erreicht! Du hast bereits 12 Sprachaufnahmen in diesem Protokoll. Bitte lösche eine alte Sprachaufnahme, bevor du eine neue aufnimmst.");
      return null;
    }

    // 🎙️ Check if school Audio-Tresor storage quota is exceeded
    const targetSchoolId = student?.school_id || (student as any)?.schoolId || (typeof window !== 'undefined' ? (localStorage.getItem('groovelab_school_id') || localStorage.getItem('campus_school_id')) : null);
    if (targetSchoolId) {
      try {
        const overridesStr = typeof window !== 'undefined' ? localStorage.getItem('groovelab_school_overrides') : null;
        const overrides = overridesStr ? JSON.parse(overridesStr) : {};
        const schoolObj = overrides[targetSchoolId] || {};
        const storageUsed = Number(schoolObj.storage_used_bytes || 0);
        const storageAddon = Number(schoolObj.storage_addon_gb || 0);
        const totalCapBytes = (1.0 + storageAddon) * 1024 * 1024 * 1024;
        if (storageUsed > 0 && storageUsed >= totalCapBytes) {
          alert('Der Audio-Tresor deiner Musikschule hat das Speichervolumen erreicht. Neue Aufnahmen sind vorübergehend pausiert. Bitte wende dich an die Schulleitung für eine Speichererweiterung oder lösche alte Aufnahmen.');
          return null;
        }
      } catch (e) {}
    }
    let durationInSeconds = 0;
    try {
      const stream = await acquireAudioStream({ audio: STUDIO_AUDIO_CONSTRAINTS });
      await stabilizeAudioStream(stream, 350);

      // 🌟 WebAudio Dual-Channel Center Bridge:
      // Routes microphone input to Left and Right channels (true stereo preservation + single-channel center bridge)
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const recordAudioCtx = new AudioCtx();
      if (recordAudioCtx.state === 'suspended') {
        await recordAudioCtx.resume().catch(() => {});
      }
      const sourceNode = recordAudioCtx.createMediaStreamSource(stream);
      const mergerNode = recordAudioCtx.createChannelMerger(2);
      if (sourceNode.channelCount >= 2) {
        const splitter = recordAudioCtx.createChannelSplitter(2);
        sourceNode.connect(splitter);
        splitter.connect(mergerNode, 0, 0);
        splitter.connect(mergerNode, 1, 1);
      } else {
        sourceNode.connect(mergerNode, 0, 0); // Duplicate to Left
        sourceNode.connect(mergerNode, 0, 1); // Duplicate to Right
      }
      const destNode = recordAudioCtx.createMediaStreamDestination();
      mergerNode.connect(destNode);
      const recordStream = destNode.stream;

      // 🎙️ Dynamic Audio Quality Adaptation based on Audio-Tresor Storage (Instant Non-Blocking Startup)
      let targetSchoolId = student?.school_id || (student as any)?.schoolId || localStorage.getItem('groovelab_school_id') || localStorage.getItem('campus_school_id');
      let effectiveTresor = hasTresorStorage || checkIsAudioTresorActive(student);
      if (targetSchoolId && !effectiveTresor) {
        supabase
          .from('schools')
          .select('storage_addon_gb, storage_addon_status')
          .eq('id', targetSchoolId)
          .maybeSingle()
          .then(({ data: sch }: any) => {
            if (sch && Number(sch.storage_addon_gb || 0) > 0 && sch.storage_addon_status !== 'cancelled') {
              setHasTresorStorage(true);
            }
          }, () => {});
      }

      // 192 kbps Transparent Studio Audio (Opus 48kHz Stereo) when Audio-Tresor is booked, else 128 kbps
      const targetBitrate = effectiveTresor ? 192000 : 128000;
      let mimeType = 'audio/webm;codecs=opus';
      if (typeof MediaRecorder !== 'undefined') {
        if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
          else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
          else if (MediaRecorder.isTypeSupported('audio/aac')) mimeType = 'audio/aac';
          else mimeType = '';
        }
      }

      let recorder: MediaRecorder;
      try {
        recorder = mimeType 
          ? new MediaRecorder(recordStream, { mimeType, audioBitsPerSecond: targetBitrate }) 
          : new MediaRecorder(recordStream, { audioBitsPerSecond: targetBitrate });
      } catch (recErr) {
        recorder = new MediaRecorder(recordStream);
      }
      const chunks: BlobPart[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = async () => {
        try {
          stream.getTracks().forEach(track => track.stop());
          recordStream.getTracks().forEach(track => track.stop());
          if (recordAudioCtx && recordAudioCtx.state !== 'closed') {
            recordAudioCtx.close().catch(() => {});
          }
        } catch (e) {}

        let rawBlob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if ((recorder.mimeType || 'audio/webm').includes('webm') && durationInSeconds > 0) {
          try {
            rawBlob = await fixWebmDuration(rawBlob, durationInSeconds);
          } catch (ebmlErr) {
            console.warn('[Meisterwerk] EBML patch note:', ebmlErr);
          }
        }
        // 🎙️ 100% PURE RAW & STUDIO MASTERING DSP (Calibrated Loudness from sample 0):
        let dspDuration = 0;
        let blob: Blob = rawBlob;
        let url = '';
        try {
          // 🌟 100% PURE RAW Universal Limiter Normalization (-14.5 LUFS / max 3.0 dB GR)
          const pureRawRes = await processPureRawBlob(rawBlob, { 
            targetLufs: TARGET_PURE_RAW_LUFS, 
            targetPeakDb: TARGET_PEAK_DBTP,
            maxLimiterGrDb: MAX_PURE_RAW_LIMITER_GR_DB
          });
          blob = pureRawRes.processedBlob;
          url = pureRawRes.processedUrl;
          if (pureRawRes.durationSec) {
            dspDuration = pureRawRes.durationSec;
            durationInSeconds = Math.round(pureRawRes.durationSec);
          }
        } catch (dspErr) {
          console.warn('[MeisterwerkDocumentationModal] Primary DSP fallback:', dspErr);
          try {
            const pureRawFallback = await processPureRawBlob(rawBlob, {
              targetLufs: TARGET_PURE_RAW_LUFS,
              targetPeakDb: TARGET_PEAK_DBTP,
              maxLimiterGrDb: MAX_PURE_RAW_LIMITER_GR_DB
            });
            blob = pureRawFallback.processedBlob;
            url = pureRawFallback.processedUrl;
            if (pureRawFallback.durationSec) {
              dspDuration = pureRawFallback.durationSec;
              durationInSeconds = Math.round(pureRawFallback.durationSec);
            }
          } catch {
            blob = rawBlob;
            url = URL.createObjectURL(rawBlob);
          }
        }

        setAudioBlob(blob);
        setAudioUrl(url);

        const exactElapsedSec = Math.max(0.1, (Date.now() - (recordStartTimeRef.current || Date.now())) / 1000);
        // Exakte Dauer: Kein früheres Abschneiden erlaubt, lieber eine Sekunde zu spät als zu früh
        const recDuration = Math.max(
          1,
          Math.ceil(dspDuration || exactElapsedSec),
          Math.ceil(exactElapsedSec)
        );
        const targetInfo = recordingTargetRef.current;
        const isMasterwork = Boolean(targetInfo.isMasterwork);
        const currentSongId = targetInfo.songId || (isMasterwork ? selectedActiveSongId : undefined);
        const currentAudioLabel = targetInfo.label || audioLabel || '';
        const normKey = currentAudioLabel.toLowerCase().trim();
        const isTeacherActor = isTeacherMode;
        const isStudentSession = !isTeacherActor;

        // 🎯 Collect existing audios for this actor to calculate the next strictly sequential take number (#1, #2, #3...)
        const existingAudios: any[] = [];
        if (isTeacherActor) {
          (homeworkNotesList || []).forEach((n: string) => {
            if (typeof n === 'string' && n.startsWith('AUDIO:')) {
              const parts = n.substring(6).split('|');
              existingAudios.push({
                url: parts[0]?.trim(),
                date: parts[2]?.trim(),
                label: parts[3]?.trim(),
                songTag: parts[7]?.trim(),
                author: 'teacher',
                isTeacher: true
              });
            }
          });
        } else {
          try {
            const stored = localStorage.getItem(`campus_junior_recordings_${student.id}`);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed)) {
                parsed.forEach((r: any) => {
                  existingAudios.push({
                    url: r.url,
                    date: r.date,
                    label: r.title || r.label,
                    songTag: r.songTag || r.song || r.songTitle,
                    author: 'student',
                    isTeacher: false
                  });
                });
              }
            }
          } catch {}
        }

        const smartTitle = generateSmartAudioTitle(isTeacherActor, currentAudioLabel, currentSongId, existingAudios);

        const fileExt = hasTresorStorage ? 'wav' : (blob.type.includes('wav') ? 'wav' : blob.type.includes('webm') ? 'webm' : blob.type.includes('ogg') ? 'ogg' : 'mp3');
        const contentType = hasTresorStorage ? 'audio/wav' : (blob.type || 'audio/webm');
        const timeStamp = Date.now();
        const uniqueRecId = `rec-${student.id}-${timeStamp}`;
        const localBlobKey = `campus_blob_${student.id}_${timeStamp}.${fileExt}`;

        // ⚡ 1. OPTIMISTIC INSTANT PERSISTENCE (< 15ms)
        // Store binary into local IndexedDB immediately
        await storeBlob(localBlobKey, blob).catch(() => {});

        if (isMasterwork) {
          // 🏆 EXCLUSIVELY ATTACHED TO THE 100% MEISTERWERK SONG
          if (currentSongId) {
            localStorage.setItem(`campus_mastered_audio_${student.id}_${currentSongId}`, localBlobKey);
          }
          if (normKey) {
            localStorage.setItem(`campus_mastered_audio_${student.id}_${normKey}`, localBlobKey);
          }

          // Clean up any test recordings from junior recordings
          const juniorKey = `campus_junior_recordings_${student.id}`;
          try {
            const stored = localStorage.getItem(juniorKey);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed)) {
                const cleaned = parsed.filter(r => {
                  const rText = `${r.title || ''} ${r.label || ''}`.toLowerCase();
                  return !rText.includes(normKey) && !rText.includes('over each other');
                });
                localStorage.setItem(juniorKey, JSON.stringify(cleaned));
                setLocalJuniorRecordingsTrigger(prev => prev + 1);
              }
            }
          } catch {}

          // Clean up any test notes from homeworkNotesList
          setHomeworkNotesList(prev => {
            const ex = prev || [];
            const cleanedList = ex.filter(n => {
              if (typeof n === 'string' && n.startsWith('AUDIO:')) {
                const nLower = n.toLowerCase();
                return !nLower.includes(normKey) && !nLower.includes('over each other');
              }
              return true;
            });
            if (cleanedList.length !== ex.length) {
              syncHomeworkNotes(cleanedList).catch(() => {});
            }
            return cleanedList;
          });

          // 🎵 Update React State for activeSongSkills and progressItems ONLY
          setActiveSongSkills(prev => (prev || []).map(s => {
            const sTitle = (s.songs?.title || s.title || s.song_title || '').toLowerCase().trim();
            if ((currentSongId && s.id === currentSongId) || (sTitle && (normKey.includes(sTitle) || sTitle.includes(normKey)))) {
              return { ...s, recording_url: localBlobKey, audio_url: localBlobKey };
            }
            return s;
          }));

          setProgressItems(prev => (prev || []).map(p => {
            const pTitle = ((p as any).topic_name || (p as any).title || '').toLowerCase().trim();
            if ((currentSongId && p.id === currentSongId) || (pTitle && (normKey.includes(pTitle) || pTitle.includes(normKey)))) {
              return {
                ...p,
                recording_url: localBlobKey
              };
            }
            return p;
          }));

          if (currentSongId) {
            supabase.from('user_song_skills').update({ recording_url: localBlobKey }).eq('id', currentSongId).then(() => {});
            supabase.from('progress_matrix').update({ recording_url: localBlobKey }).eq('id', currentSongId).then(() => {});
          }
        } else if (isStudentSession) {
          // 🎓 Student practice recording - INSTANT UPDATE IN LOCAL STORAGE & UI
          const candidateStudentIds = Array.from(new Set([
            student?.id,
            (student as any)?.student_id,
            (student as any)?.studentId,
            (student as any)?.canonical_uuid,
            (student as any)?.slot_id
          ].filter(Boolean))) as string[];

          const metronomeBpmToSave = isRecordingMetronomeActive ? recordingBpm : undefined;

          const newRec = {
            id: uniqueRecId,
            url: localBlobKey,
            duration: recDuration,
            date: new Date().toISOString(),
            title: smartTitle,
            label: currentAudioLabel,
            visibility: 'private',
            metronomeBpm: metronomeBpmToSave
          };

          candidateStudentIds.forEach(cid => {
            const juniorKey = `campus_junior_recordings_${cid}`;
            let existing: any[] = [];
            try {
              const stored = localStorage.getItem(juniorKey);
              if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) existing = parsed;
              }
            } catch {}

            const updated = [newRec, ...existing.filter((r: any) => r.id !== uniqueRecId && r.url !== localBlobKey)];
            localStorage.setItem(juniorKey, JSON.stringify(updated));
          });
          setLocalJuniorRecordingsTrigger(prev => prev + 1);
        } else {
          // 👨‍🏫 Teacher homework voice note - INSTANT UPDATE
          const creatorRole = 'teacher';
          const initialVisibility = 'shared_with_teacher';
          const activeSong = (activeSongSkills || []).find(s => (currentSongId && s.id === currentSongId) || (selectedActiveSongId && s.id === selectedActiveSongId));
          const songTitle = activeSong?.songs?.title || activeSong?.title || activeSong?.song_title;
          const assignedTag = songTitle || cleanSongOrBookTitle(currentAudioLabel) || '';
          const metronomeBpmToSave = isRecordingMetronomeActive ? recordingBpm : undefined;
          const bpmSuffix = metronomeBpmToSave ? `||||BPM:${metronomeBpmToSave}` : '';
          const audioMetaStr = `AUDIO:${localBlobKey}|${recDuration}|${new Date().toISOString()}|${smartTitle}|${creatorRole}|${initialVisibility}|${uniqueRecId}|${assignedTag}${bpmSuffix}`;
          
          // 🛡️ Fail-Safe Persistent Teacher Audio Vault across all candidate IDs (Immune to weekly roll-overs & network drops)
          const candidateStudentIds = Array.from(new Set([
            student?.id,
            (student as any)?.student_id,
            (student as any)?.studentId,
            (student as any)?.canonical_uuid,
            (student as any)?.slot_id
          ].filter(Boolean))) as string[];

          candidateStudentIds.forEach(cid => {
            const teacherVaultKey = `campus_teacher_audio_vault_${cid}`;
            try {
              const existingVaultStr = localStorage.getItem(teacherVaultKey);
              let existingVault: string[] = [];
              if (existingVaultStr) {
                const parsed = JSON.parse(existingVaultStr);
                if (Array.isArray(parsed)) existingVault = parsed;
              }
              if (!existingVault.includes(audioMetaStr)) {
                const updatedVault = [audioMetaStr, ...existingVault.filter(v => typeof v === 'string' ? !v.includes(uniqueRecId) : true)];
                localStorage.setItem(teacherVaultKey, JSON.stringify(updatedVault));
              }
            } catch (vErr) {
              console.warn('[saveAudioMetadata] teacher vault write:', vErr);
            }
          });

          setHomeworkNotesList(prev => {
            const ex = prev || [];
            const updatedList = [...ex.filter(n => n !== audioMetaStr), audioMetaStr];
            syncHomeworkNotes(updatedList).catch(err => console.warn('[saveAudioMetadata] sync note:', err));
            return updatedList;
          });
        }

        // 🌟 Kid & Teacher Celebration Feedback Toast & Hero Highlight
        setRecordingSavedToast(isTeacherActor ? '🎙️ Unterrichts-Aufnahme gespeichert!' : '🌟 Klasse Take gespeichert!');
        setJustRecordedAudioUrl(localBlobKey);
        setJustRecordedAudioLabel(smartTitle);
        setTimeout(() => {
          setRecordingSavedToast(null);
          setJustRecordedAudioUrl(null);
          setJustRecordedAudioLabel(null);
        }, 4000);

        notifyHomeworkChange();
        setAudioLabel('');
        setIsUploadingAudio(false); // ⚡ SPINNER VANISHES INSTANTLY! ZERO PERCEIVED DELAY!

        // ☁️ 2. RESILIENT ASYNC BACKGROUND CLOUD SYNC (Non-blocking with 8s Timeout Guard)
        (async () => {
          try {
            let targetSchoolId = student?.school_id || (student as any)?.schoolId || localStorage.getItem('groovelab_school_id') || localStorage.getItem('campus_school_id');
            const fileName = `feedback_${timeStamp}.${fileExt}`;
            const filePath = buildCanonicalAudioStoragePath(targetSchoolId, student.id, 'recordings', fileName);

            // 🛡️ Enterprise Media Security & Anti-Malware Ingestion Validation
            const validation = await validateMediaBlob(blob, 'audio', contentType);
            if (!validation.isValid) {
              console.warn('[Meisterwerk] Feedback audio upload blocked by security validator:', validation.reason);
              return;
            }

            // 8s Timeout Guard so hanging network never leaks resources
            const uploadPromise = supabase.storage
              .from('campus-assets')
              .upload(filePath, blob, { 
                contentType,
                cacheControl: 'private, max-age=3600' 
              });

            const timeoutPromise = new Promise<{ error: Error }>((_, reject) => 
              setTimeout(() => reject(new Error('Storage upload timeout')), 8000)
            );

            const uploadRes = await Promise.race([uploadPromise, timeoutPromise]) as any;

            if (uploadRes && !uploadRes.error) {
              const cloudUrl = await getSecureAudioUrl(filePath, 'campus-assets', 300);
              
              if (cloudUrl) {
                // Also cache under cloudUrl in IndexedDB for seamless offline/online playback
                await storeBlob(cloudUrl, blob).catch(() => {});

                // Silently upgrade local pointers to public cloud URL
                if (isMasterwork) {
                  if (currentSongId) localStorage.setItem(`campus_mastered_audio_${student.id}_${currentSongId}`, cloudUrl);
                  if (normKey) localStorage.setItem(`campus_mastered_audio_${student.id}_${normKey}`, cloudUrl);
                  if (currentSongId) {
                    supabase.from('user_song_skills').update({ recording_url: cloudUrl }).eq('id', currentSongId).then(() => {});
                    supabase.from('progress_matrix').update({ recording_url: cloudUrl }).eq('id', currentSongId).then(() => {});
                  }
                } else if (isStudentSession) {
                  const juniorKey = `campus_junior_recordings_${student.id}`;
                  try {
                    const stored = localStorage.getItem(juniorKey);
                    if (stored) {
                      const parsed = JSON.parse(stored);
                      if (Array.isArray(parsed)) {
                        const upgraded = parsed.map((r: any) => r.id === uniqueRecId || r.url === localBlobKey ? { ...r, url: cloudUrl } : r);
                        localStorage.setItem(juniorKey, JSON.stringify(upgraded));
                        setLocalJuniorRecordingsTrigger(prev => prev + 1);
                      }
                    }
                  } catch {}
                } else {
                  // Teacher note upgrade
                  setHomeworkNotesList(prev => {
                    const ex = prev || [];
                    const upgradedList = ex.map((n: string) => {
                      if (typeof n === 'string' && n.includes(localBlobKey)) {
                        return n.replace(localBlobKey, cloudUrl);
                      }
                      return n;
                    });
                    syncHomeworkNotes(upgradedList).catch(() => {});
                    return upgradedList;
                  });

                  // Also upgrade in teacher audio vault across all candidate IDs
                  const candidateStudentIds = Array.from(new Set([
                    student?.id,
                    (student as any)?.student_id,
                    (student as any)?.studentId,
                    (student as any)?.canonical_uuid,
                    (student as any)?.slot_id
                  ].filter(Boolean))) as string[];

                  candidateStudentIds.forEach(cid => {
                    const teacherVaultKey = `campus_teacher_audio_vault_${cid}`;
                    try {
                      const existingVaultStr = localStorage.getItem(teacherVaultKey);
                      if (existingVaultStr) {
                        const parsed = JSON.parse(existingVaultStr);
                        if (Array.isArray(parsed)) {
                          const upgradedVault = parsed.map((item: any) => {
                            if (typeof item === 'string' && item.includes(localBlobKey)) {
                              return item.replace(localBlobKey, cloudUrl);
                            }
                            return item;
                          });
                          localStorage.setItem(teacherVaultKey, JSON.stringify(upgradedVault));
                        }
                      }
                    } catch {}
                  });
                }
              }
            }

            // Optional: Background quota tracking without blocking UI
            if (targetSchoolId && blob?.size) {
              try {
                const { data: schoolData } = await supabase
                  .from('schools')
                  .select('storage_used_bytes')
                  .eq('id', targetSchoolId)
                  .maybeSingle();
                if (schoolData) {
                  const currentBytes = Number(schoolData.storage_used_bytes || 0);
                  const updatedBytes = currentBytes + blob.size;
                  await supabase
                    .from('schools')
                    .update({ storage_used_bytes: updatedBytes })
                    .eq('id', targetSchoolId);
                }
              } catch {}
            }
          } catch (bgSyncErr) {
            console.warn('[Meisterwerk] Background cloud sync note (local playback fully intact):', bgSyncErr);
          }
        })();
      };

      return {
        stream,
        recordStream,
        recordAudioCtx,
        recorder,
        effectiveTresor
      };
    } catch (err) {
      console.error("Failed to prepare recording engine:", err);
      alert("Mikrofonzugriff verweigert oder nicht verfügbar.");
      return null;
    }
  };

  const startRecordingWithEngine = (prep: { recorder: MediaRecorder; effectiveTresor: boolean }) => {
    const { recorder, effectiveTresor } = prep;
    setAudioDuration(0);
    setIsRecordingAudio(true);
    recordStartTimeRef.current = Date.now();
    recorder.start(100);
    setMediaRecorderInstance(recorder);
    mediaRecorderRef.current = recorder;
    
    const maxRecordSeconds = effectiveTresor ? 420 : 60;

    recordingTimerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - recordStartTimeRef.current) / 1000);
      setAudioDuration(elapsed);
      if (elapsed >= maxRecordSeconds) {
        stopRecordingAudio(recorder);
      }
    }, 500);
  };

  const startRecordingAudio = async (overrideSongId?: string | React.MouseEvent, overrideLabel?: string, isMasterworkSong = false) => {
    const prep = await prepareRecordingEngine(overrideSongId, overrideLabel, isMasterworkSong);
    if (!prep) return;

    cancelActiveRecordCountIn();
    pendingRecordStreamRef.current = prep.stream;
    pendingRecordAudioCtxRef.current = prep.recordAudioCtx;
    pendingRecordPreparedRef.current = prep;

    let count = 4;
    setRecordCountInRemaining(count);
    playCountInBeep(true);

    const effectiveBpm = (isRecordingMetronomeActive && recordingBpm) ? recordingBpm : 100;
    const intervalMs = (60 / effectiveBpm) * 1000;

    recordCountInIntervalRef.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setRecordCountInRemaining(count);
        playCountInBeep(false);
      } else {
        if (recordCountInIntervalRef.current) {
          clearInterval(recordCountInIntervalRef.current);
          recordCountInIntervalRef.current = null;
        }
        setRecordCountInRemaining(null);
        pendingRecordStreamRef.current = null;
        pendingRecordAudioCtxRef.current = null;
        pendingRecordPreparedRef.current = null;
        startRecordingWithEngine(prep);
      }
    }, intervalMs);
  };

  const stopRecordingAudio = (activeRecorder?: MediaRecorder) => {
    if (isStoppingAudioRef.current) return;
    isStoppingAudioRef.current = true;
    cancelActiveRecordCountIn();
    cancelPlayAlongCountIn();

    // 🛡️ Mindestaufnahmedauer & Anti-Prell-Schutz (500ms): Verhindert versehentliche 0-Sekunden-Takes
    const elapsedSinceStart = Date.now() - (recordStartTimeRef.current || 0);
    const delayBeforeStop = Math.max(500, 500 - elapsedSinceStart);

    const rec = activeRecorder || mediaRecorderRef.current || mediaRecorderInstance;
    if (rec && rec.state !== 'inactive') {
      try {
        rec.requestData();
      } catch (e) {}
      // 🛡️ Safety buffer (500ms): Garantiert, dass der letzte Takt, Ausklang & Raumhall vollständig im Puffer landen (kein vorzeitiges Abschneiden)
      setTimeout(() => {
        try {
          if (rec.state !== 'inactive') {
            rec.stop();
          }
        } catch (e) {}
        isStoppingAudioRef.current = false;
      }, delayBeforeStop);
    } else {
      isStoppingAudioRef.current = false;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecordingAudio(false);
    setActiveRecordingSongId(null);
  };

  const handleStartPlayAlongRecording = async () => {
    // 🌟 Pre-warm microphone & audio graph BEFORE starting count-in
    const prep = await prepareRecordingEngine();
    if (!prep) return;

    if (!isCountInEnabled) {
      startRecordingWithEngine(prep);
      return;
    }

    cancelPlayAlongCountIn();
    pendingCountInStreamRef.current = prep.stream;
    pendingCountInAudioCtxRef.current = prep.recordAudioCtx;
    pendingCountInPreparedRef.current = prep;

    let count = 4;
    setPlayAlongCountInRemaining(count);
    playMetronomeTick(true);

    const intervalMs = (60 / recordingBpm) * 1000;
    playAlongCountInIntervalRef.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setPlayAlongCountInRemaining(count);
        playMetronomeTick(false);
      } else {
        if (playAlongCountInIntervalRef.current) {
          clearInterval(playAlongCountInIntervalRef.current);
          playAlongCountInIntervalRef.current = null;
        }
        setPlayAlongCountInRemaining(null);
        // Safely detach from pending so cancellation won't terminate active recording
        pendingCountInStreamRef.current = null;
        pendingCountInAudioCtxRef.current = null;
        pendingCountInPreparedRef.current = null;
        startRecordingWithEngine(prep);
      }
    }, intervalMs);
  };

  const awardSticker = async (stickerId: string, topicNameContext?: string) => {
    try {
      const st = ALL_STICKERS.find(s => s.id === stickerId);
      // Duplicate Protection: If single-award sticker (multi === false) is already collected, do not add duplicate
      if (st && st.multi === false && collectedStickers[stickerId] && collectedStickers[stickerId].count > 0) {
        if (st) setAwardedStickerToAnimate(st);
        return;
      }

      const targetTopic = topicNameContext || topicName || `Allgemein`;
      const dateStr = new Date().toISOString();
      const stickerEntry = `STICKER:${stickerId}|${targetTopic.replace(/\|/g, '-')}|${dateStr}`;

      // Update homeworkNotesList so handleSave and progressItems persist it
      setHomeworkNotesList(prev => [...(prev || []), stickerEntry]);

      // Update simulatedStickers state so the Sticker Board renders the sticker immediately
      setSimulatedStickers(prev => {
        const existing = prev[stickerId] || { count: 0, details: [] };
        return {
          ...prev,
          [stickerId]: {
            count: existing.count + 1,
            details: [...existing.details, { topic: targetTopic, date: dateStr }]
          }
        };
      });

      // Persist directly to Supabase progress_matrix if activeItem or general row exists
      if (!readOnly && student?.id) {
        try {
          const currentNotes = [...(homeworkNotesList || []), stickerEntry];
          const specialNotes = currentNotes.filter(n => typeof n === 'string' && (n.startsWith('AUDIO:') || n.startsWith('STICKER:') || n.startsWith('FEEDBACK:') || n.startsWith('STUDENT_NOTE_')));
          const effectiveGeneralNotes = latestGeneralHomeworkNotesRef.current || generalHomeworkNotes || '';
          const finalNotesList = [...specialNotes];
          if (effectiveGeneralNotes.trim().length > 0) {
            effectiveGeneralNotes.split('\n').map((s: string) => s.trim()).filter(Boolean).forEach((line: string) => {
              if (!finalNotesList.includes(line)) finalNotesList.push(line);
            });
          }
          const targetTopicName = activeItem?.topic_name || topicName || 'Allgemeine Hausaufgabe';
          await supabase.from('progress_matrix').upsert({
            student_id: student.id,
            topic_name: targetTopicName,
            status: activeItem?.status || 'IN_PROGRESS',
            is_current_homework: true,
            homework_notes: JSON.stringify(finalNotesList),
            updated_at: new Date().toISOString()
          }, { onConflict: 'student_id,topic_name' });
        } catch (dbErr) {
          console.warn('Could not directly persist sticker award to progress_matrix:', dbErr);
        }
      }

      await fetchProgress();
      notifyHomeworkChange();
      
      // Trigger visual confetti animation modal
      if (st) {
        setAwardedStickerToAnimate(st);
      }
    } catch (e) {
      console.error("Error awarding sticker:", e);
    }
  };

  const handleClose = async () => {
    if (autoSaveDebounceTimerRef.current) {
      clearTimeout(autoSaveDebounceTimerRef.current);
    }
    if (hasChanges && !readOnly) {
      try {
        await handleSave(true);
      } catch (e) {
        console.warn('Auto-save on close error:', e);
      }
    }
    onClose();
  };

  const getISOWeek = (dateInput?: string | Date): string => {
    return getISOWeekRaw(dateInput, lessonDay);
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

  const getWeeksBetween = (startWeek: string, endWeek: string): string[] => {
    const parseWeekToMonday = (wk: string): Date => {
      const [year, week] = wk.split('-W').map(Number);
      const simple = new Date(year, 0, 4);
      const day = simple.getDay() || 7;
      const monday = new Date(simple.getTime() - (day - 1) * 24 * 3600000);
      monday.setDate(monday.getDate() + (week - 1) * 7);
      return monday;
    };

    try {
      const startMon = parseWeekToMonday(startWeek);
      const endMon = parseWeekToMonday(endWeek);
      
      const result: string[] = [];
      const curr = new Date(startMon);
      let iterations = 0;
      while (curr <= endMon && iterations < 500) {
        result.push(getISOWeek(curr));
        curr.setDate(curr.getDate() + 7);
        iterations++;
      }
      return Array.from(new Set(result)).sort().reverse();
    } catch (e) {
      console.error(e);
      return [startWeek, endWeek];
    }
  };

  // Custom song & lehrwerk creation form states
  const [showCreateSongModal, setShowCreateSongModal] = useState(false);
  const [songModalTab, setSongModalTab] = useState<'catalog' | 'create'>('catalog');
  const [newSongTitle, setNewSongTitle] = useState('');
  const [newSongArtist, setNewSongArtist] = useState('');

  const [showCreateLehrwerkModal, setShowCreateLehrwerkModal] = useState(false);
  const [newLehrwerkTitle, setNewLehrwerkTitle] = useState('');
  const [newLehrwerkPages, setNewLehrwerkPages] = useState('50');
  const [newLehrwerkLoading, setNewLehrwerkLoading] = useState(false);

  // 💽 Share Audio Recording to Audio-Biografie Playlist State
  const [shareAudioModal, setShareAudioModal] = useState<{
    isOpen: boolean;
    audioUrl: string;
    duration: number;
    label: string;
    date?: string;
  } | null>(null);

  const [sharePlaylistId, setSharePlaylistId] = useState<string>('');
  const [shareProcessing, setShareProcessing] = useState<'raw' | 'master'>('master');
  const [shareCustomTitle, setShareCustomTitle] = useState<string>('');
  const [isSharingToPlaylist, setIsSharingToPlaylist] = useState<boolean>(false);
  const [showNewPlaylistInput, setShowNewPlaylistInput] = useState<boolean>(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState<string>('');
  const [availablePlaylists, setAvailablePlaylists] = useState<CustomPlaylist[]>([]);

  const handleToggleAudioVisibility = async (originalIdx: number) => {
    const currentNote = homeworkNotesList[originalIdx];
    if (!currentNote || !currentNote.startsWith('AUDIO:')) return;
    const parts = currentNote.substring(6).split('|');
    const currentVis = parts[5] || 'private';
    const newVis = currentVis === 'shared_with_teacher' ? 'private' : 'shared_with_teacher';
    parts[5] = newVis;
    const updatedNote = `AUDIO:${parts.join('|')}`;
    const updatedList = [...homeworkNotesList];
    updatedList[originalIdx] = updatedNote;
    setHomeworkNotesList(updatedList);
    await syncHomeworkNotes(updatedList);
    notifyHomeworkChange();
  };

  const handleOpenShareModal = (aud: { url: string; duration: number; label: string; date?: string }) => {
    const playlistsKey = `campus_custom_playlists_${student.id}`;
    let playlists: CustomPlaylist[] = [];
    const saved = localStorage.getItem(playlistsKey);
    if (saved) {
      try {
        playlists = JSON.parse(saved);
      } catch {}
    }
    if (!playlists || playlists.length === 0) {
      playlists = [
        {
          id: 'pl_meilenstein_lp',
          title: '🏆 Meine Meilenstein-LP',
          vibeTheme: 'sunset_gold',
          iconName: 'trophy',
          createdAt: 'Schuljahr 2026/2027',
          tracks: []
        },
        {
          id: 'pl_lieblingssongs',
          title: '⭐ Meine Lieblingslieder-Playlist',
          vibeTheme: 'midnight_neon',
          iconName: 'heart',
          createdAt: 'Schuljahr 2026/2027',
          tracks: []
        },
        {
          id: 'pl_sommerhits',
          title: '☀️ Meine Sommerhits-Playlist',
          vibeTheme: 'ocean_cyan',
          iconName: 'sun',
          createdAt: 'Schuljahr 2026/2027',
          tracks: []
        }
      ];
      localStorage.setItem(playlistsKey, JSON.stringify(playlists));
    }

    setAvailablePlaylists(playlists);
    setSharePlaylistId(playlists[0]?.id || 'pl_meilenstein_lp');
    setShareProcessing('master');
    setShareCustomTitle(aud.label || 'Meine Aufnahme');
    setShowNewPlaylistInput(false);
    setNewPlaylistTitle('');
    setShareAudioModal({
      isOpen: true,
      audioUrl: aud.url,
      duration: aud.duration,
      label: aud.label,
      date: aud.date
    });
  };

  const handleSaveShareToPlaylist = async () => {
    if (!shareAudioModal) return;
    setIsSharingToPlaylist(true);

    try {
      const playlistsKey = `campus_custom_playlists_${student.id}`;
      let playlists: CustomPlaylist[] = [...availablePlaylists];
      const saved = localStorage.getItem(playlistsKey);
      if (saved) {
        try {
          playlists = JSON.parse(saved);
        } catch {}
      }

      let targetPlaylistId = sharePlaylistId;

      if (showNewPlaylistInput && newPlaylistTitle.trim()) {
        const newPl: CustomPlaylist = {
          id: `pl_custom_${Date.now()}`,
          title: newPlaylistTitle.trim(),
          vibeTheme: 'forest_emerald',
          iconName: 'music',
          createdAt: `Schuljahr 2026/2027`,
          tracks: []
        };
        playlists.push(newPl);
        targetPlaylistId = newPl.id;
      }

      const targetPl = playlists.find(p => p.id === targetPlaylistId) || playlists[0];
      if (!targetPl) throw new Error('Keine Playliste gefunden');

      const trackId = `track_${Date.now()}`;
      let rawBlob: Blob | null = null;
      let masterBlob: Blob | null = null;

      try {
        const resp = await fetch(shareAudioModal.audioUrl);
        rawBlob = await resp.blob();
      } catch (fetchErr) {
        console.warn('Could not fetch blob from URL directly:', fetchErr);
      }

      let masteredAudioUrl = shareAudioModal.audioUrl;

      if (rawBlob) {
        await storeBlob(`campus_audio_${trackId}_raw`, rawBlob);

        if (shareProcessing === 'master') {
          try {
            const masteredResult = await processStudioMastering(rawBlob, { 
              profile: 'acoustic_audiophile',
              targetLufs: TARGET_STUDIO_LUFS,
              targetPeakDb: TARGET_PEAK_DBTP
            });
            if (masteredResult && masteredResult.masteredBlob) {
              masterBlob = masteredResult.masteredBlob;
              await storeBlob(`campus_audio_${trackId}_master`, masterBlob);
              masteredAudioUrl = URL.createObjectURL(masterBlob);
            }
          } catch (dspErr) {
            console.warn('[Meisterwerk] DSP mastering fallback to raw:', dspErr);
          }
        }
      }

      const newTrack: CustomPlaylistTrack = {
        id: trackId,
        title: shareCustomTitle.trim() || shareAudioModal.label || 'Aufnahme',
        subtitle: shareProcessing === 'master' ? '✨ Studio Master' : '🎙️ Pure Raw',
        audioUrl: shareAudioModal.audioUrl,
        masteredAudioUrl: shareProcessing === 'master' ? masteredAudioUrl : undefined,
        duration: shareAudioModal.duration,
        recordedAt: shareAudioModal.date || new Date().toISOString(),
        preferredVersion: shareProcessing
      };

      if (!targetPl.tracks) targetPl.tracks = [];
      targetPl.tracks.push(newTrack);
      localStorage.setItem(playlistsKey, JSON.stringify(playlists));

      setIsSharingToPlaylist(false);
      setShareAudioModal(null);
      alert(`✨ Track "${newTrack.title}" erfolgreich zur Playliste "${targetPl.title}" hinzugefügt!`);
    } catch (err: any) {
      console.error('Failed to share track to playlist:', err);
      setIsSharingToPlaylist(false);
      alert('Fehler beim Hinzufügen zur Playliste: ' + (err?.message || 'Unbekannter Fehler'));
    }
  };

  const getCurrentTeacherId = async (): Promise<string> => {
    if (teacherId) return teacherId;
    if ((student as any).teacher_id) return (student as any).teacher_id;
    try {
      if (student.id && student.id !== 'teacher-self') {
        const { data: stUser } = await supabase.from('users').select('teacher_id').eq('id', student.id).maybeSingle();
        if (stUser?.teacher_id) return stUser.teacher_id;

        // Also check student_teachers junction table
        const { data: stRel } = await supabase.from('student_teachers').select('teacher_id').eq('student_id', student.id).maybeSingle();
        if (stRel?.teacher_id) return stRel.teacher_id;
      }
      const { data: { user } } = await supabase.auth.getUser();
      // 🛡️ Anti-Confuse: Only return user.id if logged in user is actually a teacher/admin (never when user is the student!)
      if (user && user.id !== student.id && !readOnly) {
        const { data: authU } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
        if (authU && authU.role !== 'student') return user.id;
      }

      // Fallback: Query first teacher in users table for this school
      const schoolId = student?.school_id || (student as any)?.schoolId;
      let tQuery = supabase.from('users').select('id').eq('role', 'teacher');
      if (schoolId) tQuery = tQuery.eq('school_id', schoolId);
      const { data: teachers } = await tQuery.limit(1);
      if (teachers && teachers.length > 0) {
        return teachers[0].id;
      }
    } catch (e) {
      console.error('Error determining teacher ID:', e);
    }
    // Safe fallback
    return (student as any)?.teacher_id || '';
  };

  const [activeRhythmSong, setActiveRhythmSong] = useState<{ songTitle: string; targetBpm: number; songId?: string } | null>(null);

  const syncHomeworkNotes = async (notesList: string[]) => {
    if (student.id === 'teacher-self') {
      console.log("Teacher-self practice: skipping database homework notes synchronization.");
      return;
    }
    const currentWeek = getISOWeek();
    const allNotesJson = JSON.stringify(notesList);
    const cleanNotesJson = JSON.stringify(notesList.filter(n => !n.startsWith('AUDIO:')));

    // Always backup to localStorage across all candidate IDs
    try {
      const candidateStudentIds = Array.from(new Set([
        student.id,
        (student as any)?.student_id,
        (student as any)?.studentId,
        (student as any)?.canonical_uuid,
        (student as any)?.slot_id
      ].filter(Boolean))) as string[];

      candidateStudentIds.forEach(cid => {
        localStorage.setItem(`campus_homework_notes_${cid}`, allNotesJson);
        localStorage.setItem(`campus_homework_week_${cid}`, currentWeek);
        localStorage.setItem(`campus_teacher_notes_${cid}`, teacherNotes.trim());

        // Guarantee all AUDIO: entries are backed up into campus_teacher_audio_vault
        const teacherVaultKey = `campus_teacher_audio_vault_${cid}`;
        const existingVaultStr = localStorage.getItem(teacherVaultKey);
        let existingVault: string[] = [];
        if (existingVaultStr) {
          try {
            const parsed = JSON.parse(existingVaultStr);
            if (Array.isArray(parsed)) existingVault = parsed;
          } catch {}
        }
        const audioNotesToKeep = notesList.filter(n => typeof n === 'string' && n.startsWith('AUDIO:'));
        let vaultChanged = false;
        audioNotesToKeep.forEach(an => {
          if (!existingVault.includes(an)) {
            existingVault.push(an);
            vaultChanged = true;
          }
        });
        if (vaultChanged) {
          localStorage.setItem(teacherVaultKey, JSON.stringify(existingVault));
        }
      });
    } catch (lsErr) {
      console.warn('[Meisterwerk] localStorage cache notice:', lsErr);
    }

    try {
      const dummyWeeklyItem = progressItems.find(item => 
        item.topic_name.startsWith('Hausaufgabe KW ') && 
        getItemWeek(item) === currentWeek
      );

      if (dummyWeeklyItem) {
        const { error } = await supabase
          .from('progress_matrix')
          .update({ homework_notes: allNotesJson, teacher_notes: teacherNotes.trim(), updated_at: new Date().toISOString() })
          .eq('id', dummyWeeklyItem.id);
        if (error) console.warn('[syncHomeworkNotes] Supabase update warning:', error);
        else {
          setProgressItems(prev => (prev || []).map(p => p.id === dummyWeeklyItem.id ? { ...p, homework_notes: allNotesJson, teacher_notes: teacherNotes.trim(), updated_at: new Date().toISOString() } : p));
        }
      } else {
        const activeTId = await getCurrentTeacherId();
        const { data: insertedData, error } = await supabase
          .from('progress_matrix')
          .insert({
            student_id: student.id,
            teacher_id: activeTId,
            topic_name: `Hausaufgabe KW ${currentWeek.split('-W')[1]}`,
            status: 'IN_PROGRESS',
            is_current_homework: true,
            teacher_notes: teacherNotes.trim(),
            homework_notes: allNotesJson,
            updated_at: new Date().toISOString()
          })
          .select();
        if (error) console.warn('[syncHomeworkNotes] Supabase insert warning:', error);
        else if (insertedData && insertedData[0]) {
          setProgressItems(prev => [insertedData[0], ...(prev || [])]);
        }
      }
    } catch (dbErr) {
      console.warn('[syncHomeworkNotes] Supabase sync notice (cached locally):', dbErr);
    }
  };



  // Fetch student's school's songs catalog (Strictly Teacher's Campus Mediathek)
  useEffect(() => {
    async function loadSongs() {
      if (student.id === 'teacher-self') {
        setSongsLoading(false);
        return;
      }
      setSongsLoading(true);
      try {
        let effectiveSchoolId = (student as any)?.school_id || (student as any)?.schoolId || studentSchoolId;
        let activeTId = teacherId || (student as any)?.teacher_id;

        if (!effectiveSchoolId || !activeTId) {
          const { data: studentUser, error: studentError } = await supabase
            .from('users')
            .select('school_id, teacher_id')
            .eq('id', student.id)
            .maybeSingle();

          if (!studentError && studentUser) {
            if (!effectiveSchoolId) effectiveSchoolId = studentUser.school_id;
            if (!activeTId) activeTId = studentUser.teacher_id;
          }
        }
        if (!activeTId) {
          activeTId = await getCurrentTeacherId();
        }

        if (effectiveSchoolId) {
          let sq = supabase
            .from('songs')
            .select('*')
            .eq('school_id', effectiveSchoolId)
            .eq('is_campus_active', true);
          
          if (activeTId && isTeacherTools) {
            sq = sq.eq('teacher_id', activeTId);
          }
          
          const { data: songsData, error: songsError } = await sq.order('title', { ascending: true });

          if (songsError) throw songsError;
          const cleanSongs = (songsData || []).filter(s => {
            const t = (s.title || '').toLowerCase().trim();
            return t !== 'test' && t !== 'test - test' && t !== 'test-test';
          });
          setSongs(cleanSongs);
        }
      } catch (err) {
        console.error('Error loading catalog songs:', err);
      } finally {
        setSongsLoading(false);
      }
    }
    if (student.id) {
      loadSongs();
    }
  }, [student.id, teacherId]);

  useEffect(() => {
    const loadLessonDay = async () => {
      if (student.id === 'teacher-self') return;
      try {
        const { data } = await supabase
          .from('schedules')
          .select('day_of_week')
          .eq('student_id', student.id)
          .limit(1);
        if (data && data.length > 0 && data[0].day_of_week !== undefined) {
          setLessonDay(data[0].day_of_week);
        }
      } catch (e) {
        console.error('Error loading lesson day:', e);
      }
    };
    if (student.id) {
      loadLessonDay();
    }
  }, [student.id]);

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  // Load Lehrwerke data from Supabase (Strictly aligned with Teacher's Campus Mediathek & Deduplicated)
  const loadLehrwerke = async (resolvedSchoolId?: string, resolvedTeacherId?: string) => {
    try {
      const activeTId = await getCurrentTeacherId();
      const schoolId = propSchoolId || resolvedSchoolId || student?.school_id || (student as any)?.schoolId || studentSchoolId || sessionStorage.getItem('groovelab_school_id') || localStorage.getItem('campus_school_id') || localStorage.getItem('groovelab_school_id') || localStorage.getItem('school_id');
      const effectiveTeacherId = teacherId || resolvedTeacherId || studentTeacherId || activeTId || (student as any)?.teacher_id;

      let lehrwerkeData: any[] = [];
      
      // 1. Unified Query: Fetch school-specific, teacher-specific and global (school_id is null) Lehrwerke (100% aligned with Mediathek)
      let query = supabase.from('lehrwerke').select('*');
      const orParts: string[] = ['school_id.is.null'];
      if (schoolId) {
        orParts.push(`school_id.eq.${schoolId}`);
      }
      if (effectiveTeacherId) {
        orParts.push(`teacher_id.eq.${effectiveTeacherId}`);
      }
      query = query.or(orParts.join(','));
      const { data: allData, error } = await query.order('title');
      if (error) console.warn('Lehrwerke load note:', error);
      if (allData) lehrwerkeData = allData;

      let rawMapped: any[] = [];
      if (lehrwerkeData && lehrwerkeData.length > 0) {
        rawMapped = lehrwerkeData.map((item: any) => ({
          ...item,
          totalPages: item.total_pages || 50,
          emoji: item.emoji || '📖',
          color: item.color || '#34a853'
        }));
      }

      // 3. Merge locally cached custom Lehrwerke (strictly deduplicated by ID and Title)
      try {
        const storedCustom = localStorage.getItem('custom_lehrwerke');
        if (storedCustom) {
          const parsedCustom = JSON.parse(storedCustom);
          if (Array.isArray(parsedCustom)) {
            parsedCustom.forEach(c => {
              if (c && c.id) {
                const normCustomTitle = (c.title || '').trim().toLowerCase();
                const alreadyExists = rawMapped.some(m => 
                  String(m.id) === String(c.id) || 
                  (m.title || '').trim().toLowerCase() === normCustomTitle
                );
                if (!alreadyExists) {
                  rawMapped.push({
                    ...c,
                    totalPages: c.totalPages || c.total_pages || 50,
                    emoji: c.emoji || '📖',
                    color: c.color || '#34a853'
                  });
                }
              }
            });
          }
        }
      } catch {}

      // 4. Strict Canonical Title Deduplication (prefer teacher_id records over global/null)
      const uniqueBooksMap = new Map<string, any>();
      rawMapped.forEach(book => {
        const normKey = (book.title || '').trim().toLowerCase();
        if (!normKey) return;
        if (!uniqueBooksMap.has(normKey)) {
          uniqueBooksMap.set(normKey, book);
        } else {
          const existing = uniqueBooksMap.get(normKey);
          const currentHasTeacher = Boolean(book.teacher_id);
          const existingHasTeacher = Boolean(existing.teacher_id);
          if (!existingHasTeacher && currentHasTeacher) {
            uniqueBooksMap.set(normKey, book);
          }
        }
      });

      const mapped = Array.from(uniqueBooksMap.values());
      setGlobalLehrwerke(mapped);

      // 5. Load assigned Lehrwerke from localStorage (both student_lehrwerke_progress and campus_lehrwerke_progress_${student.id})
      let assignedFromStorage: any[] = [];
      try {
        const storedAssigned = localStorage.getItem('student_lehrwerke_progress');
        if (storedAssigned) {
          const parsedAssigned = JSON.parse(storedAssigned);
          if (Array.isArray(parsedAssigned)) {
            assignedFromStorage = parsedAssigned.filter((item: any) => String(item.studentId) === String(student.id));
          }
        }
      } catch {}

      try {
        const targetId = student?.id;
        const storedScoped = targetId && (localStorage.getItem(`campus_lehrwerke_progress_${targetId}`) || sessionStorage.getItem(`campus_lehrwerke_progress_${targetId}`));
        if (storedScoped) {
          const parsedScoped = JSON.parse(storedScoped);
          if (Array.isArray(parsedScoped)) {
            parsedScoped.forEach((item: any) => {
              if (!assignedFromStorage.some(a => String(a.lehrwerkId) === String(item.lehrwerkId) || (a.bookTitle && item.bookTitle && a.bookTitle.toLowerCase() === item.bookTitle.toLowerCase()))) {
                assignedFromStorage.push(item);
              }
            });
          }
        }
      } catch {}

      if (assignedFromStorage.length > 0) {
        setAssignedLehrwerke(assignedFromStorage);
      }
    } catch (e) {
      console.error('Error loading Lehrwerke in modal:', e);
    }
  };

  // Load Student's active song skills (Strictly isolated to Teacher's Campus Mediathek)
  const loadActiveSongSkills = async () => {
    try {
      const activeTId = await getCurrentTeacherId();
      
      const { data: skillsData, error } = await supabase
        .from('user_song_skills')
        .select('*, songs(*)')
        .eq('user_id', student.id);
      
      if (error) throw error;

      // Filter: In Campus Hausaufgabenheft, ONLY active Campus songs are shown!
      // In student mode (readOnly or student viewing own), never filter out songs that belong to the student.
      const isStudentViewingOwn = readOnly || !isTeacherTools || String(student.id) === String(activeTId);
      const filteredSkills = (skillsData || []).filter((skill: any) => {
        if (!skill.songs) return false;
        const hasHomework = skill.is_current_homework || Boolean(skill.homework_notes);
        if (!hasHomework) {
          // 1. Must be active on Campus if not assigned as homework
          if (skill.songs.is_campus_active !== true && !isStudentViewingOwn) return false;
          // 2. Only in explicit teacher-tools session (editing), check teacherId if supplied
          if (!isStudentViewingOwn && teacherId && skill.songs.teacher_id && skill.songs.teacher_id !== teacherId) return false;
        }
        return true;
      });

      // Deduplicate song skills so each unique song appears only once
      const uniqueMap = new Map<string, any>();
      filteredSkills.forEach((skill: any) => {
        const key = String(skill.song_id || skill.songs?.id || skill.songs?.title || skill.id);
        const existing = uniqueMap.get(key);
        if (!existing || (skill.progress_percent || 0) > (existing.progress_percent || 0)) {
          uniqueMap.set(key, skill);
        }
      });

      const loadedList = Array.from(uniqueMap.values());
      setActiveSongSkills(loadedList);
      onSongsUpdated?.(loadedList);
    } catch (e) {
      console.error('Error loading active songs in modal:', e);
    }
  };

  // Fetch student's progress matrix history
  const fetchProgress = async () => {
    setLoading(true);
    setError(null);
    let data: any[] | null = null;
    try {
      const candidateStudentIds = Array.from(new Set([
        student?.id,
        (student as any)?.student_id,
        (student as any)?.studentId,
        (student as any)?.canonical_uuid,
        (student as any)?.slot_id
      ].filter(Boolean))) as string[];

      const validUuid = candidateStudentIds.find(id => typeof id === 'string' && !id.startsWith('slot_') && id.length > 10) || student?.id;

      try {
        if (validUuid && !validUuid.startsWith('slot_')) {
          const { data: dbData, error: dbError } = await supabase
            .from('progress_matrix')
            .select('*')
            .eq('student_id', validUuid)
            .order('updated_at', { ascending: false });

          if (dbError) {
            console.warn('[fetchProgress] Supabase progress_matrix notice:', dbError.message || dbError);
          } else {
            data = dbData;
          }
        }
      } catch (dbErr) {
        console.warn('[fetchProgress] Network or database query notice, proceeding with local vault:', dbErr);
      }

      if (data) {
        setProgressItems(data);
      }

      // Scan and load custom tags from history
      const customFound: string[] = [];
      (data || []).forEach(item => {
        try {
          const notes: string[] = JSON.parse(item.homework_notes || '[]');
          const fbStr = notes.find((n: string) => n.startsWith('FEEDBACK:'));
          if (fbStr) {
            const fbObj = JSON.parse(fbStr.substring(9));
            if (Array.isArray(fbObj.tags)) {
              fbObj.tags.forEach((t: string) => {
                const normalized = t.trim();
                if (normalized && !SKILL_TAGS.some(st => st.key === normalized) && !customFound.includes(normalized)) {
                  customFound.push(normalized);
                }
              });
            }
          }
        } catch {}
      });
      setCustomTags(customFound);

      // Pre-populate homeworkNotes with the active general homework notes (KW item)
      const currentWeek = getISOWeek();
      let activeWeeklyItem = (data || []).find(item => 
        item.topic_name.startsWith('Hausaufgabe KW ') && 
        (getItemWeek(item) === currentWeek || (item.updated_at && getISOWeek(item.updated_at) === currentWeek))
      );

      // Fallback to latest past snapshot row if current week has no homework notes yet
      if (!activeWeeklyItem || !activeWeeklyItem.homework_notes) {
        const pastSnapshots = (data || []).filter(item => item.topic_name?.startsWith('Hausaufgabe KW '));
        pastSnapshots.sort((a: any, b: any) => {
          const wA = getItemWeek(a) || '';
          const wB = getItemWeek(b) || '';
          if (wA !== wB) return wB.localeCompare(wA);
          const tA = new Date(a.updated_at || a.created_at || 0).getTime();
          const tB = new Date(b.updated_at || b.created_at || 0).getTime();
          return tB - tA;
        });
        if (pastSnapshots.length > 0) {
          activeWeeklyItem = pastSnapshots[0];
        }
      }

      let loadedHomeworkNotes = '';
      let loadedHomeworkNotesList: string[] = [];
      let loadedTeacherNotes = '';

      if (activeWeeklyItem) {
        if (activeWeeklyItem.homework_notes) {
          const rawNotes = activeWeeklyItem.homework_notes;
          try {
            if (rawNotes.startsWith('[') && rawNotes.endsWith(']')) {
              const parsed = JSON.parse(rawNotes);
              if (Array.isArray(parsed)) {
                loadedHomeworkNotesList = [...parsed];
              }
            } else {
              const cleanNotes = rawNotes
                .split('\n')
                .filter((line: string) => !line.trim().startsWith('• 📖') && !line.trim().startsWith('• 🎵') && !line.trim().startsWith('• 🗑️'))
                .join('\n')
                .trim();
              if (cleanNotes) {
                loadedHomeworkNotesList = cleanNotes.split('\n\n').filter(Boolean);
              }
            }
          } catch (e) {
            loadedHomeworkNotesList = [rawNotes];
          }
        }
        if (activeWeeklyItem.teacher_notes) {
          loadedTeacherNotes = activeWeeklyItem.teacher_notes;
        }
      }

      // Single source of truth for active weekly homework notes - Smart Merge preserving all AUDIO: attachments across candidate IDs
      try {
        const candidateStudentIds = Array.from(new Set([
          student.id,
          (student as any)?.student_id,
          (student as any)?.studentId,
          (student as any)?.canonical_uuid,
          (student as any)?.slot_id
        ].filter(Boolean))) as string[];

        let cachedHW: string | null = null;
        for (const cid of candidateStudentIds) {
          const raw = localStorage.getItem(`campus_homework_notes_${cid}`);
          if (raw) {
            cachedHW = raw;
            break;
          }
        }

        if (cachedHW) {
          let cachedList: string[] = [];
          if (cachedHW.startsWith('[') && cachedHW.endsWith(']')) {
            const parsed = JSON.parse(cachedHW);
            if (Array.isArray(parsed)) {
              cachedList = parsed.map(String);
            }
          } else if (cachedHW.trim()) {
            cachedList = [cachedHW.trim()];
          }

          if (cachedList.length > 0) {
            // Combine loadedHomeworkNotesList and cachedList preserving all AUDIO: entries
            const mergedList = [...loadedHomeworkNotesList];
            cachedList.forEach(cachedItem => {
              if (!cachedItem || typeof cachedItem !== 'string') return;
              if (cachedItem.includes('AUDIO:')) {
                const cParts = cachedItem.substring(cachedItem.indexOf('AUDIO:') + 6).split('|');
                const cUrl = cParts[0]?.trim();
                const alreadyExists = mergedList.some(m => typeof m === 'string' && m.includes('AUDIO:') && m.includes(cUrl));
                if (!alreadyExists) {
                  mergedList.push(cachedItem);
                }
              } else if (!mergedList.includes(cachedItem)) {
                if (cachedItem.trim()) {
                  mergedList.push(cachedItem);
                }
              }
            });
            loadedHomeworkNotesList = mergedList;
          }
        }

        // 🛡️ Fail-Safe: Always merge all takes from campus_teacher_audio_vault across all candidate IDs
        candidateStudentIds.forEach(cid => {
          const teacherVaultKey = `campus_teacher_audio_vault_${cid}`;
          const storedVault = localStorage.getItem(teacherVaultKey);
          if (storedVault) {
            try {
              const parsedVault = JSON.parse(storedVault);
              if (Array.isArray(parsedVault)) {
                parsedVault.forEach((vItem: any) => {
                  const vStr = typeof vItem === 'string' ? vItem : vItem?.audioMetaStr;
                  if (vStr && vStr.includes('AUDIO:')) {
                    const vParts = vStr.substring(vStr.indexOf('AUDIO:') + 6).split('|');
                    const vUrl = vParts[0]?.trim();
                    const alreadyInList = loadedHomeworkNotesList.some(m => typeof m === 'string' && m.includes('AUDIO:') && m.includes(vUrl));
                    if (!alreadyInList) {
                      loadedHomeworkNotesList.push(vStr);
                    }
                  }
                });
              }
            } catch {}
          }
        });
      } catch (lsErr) {}

      // Filter text notes for the textarea
      loadedHomeworkNotes = loadedHomeworkNotesList.filter((n: string) => 
        typeof n === 'string' && !isInternalMetadataNote(n)
      ).join('\n\n');

      if (!loadedTeacherNotes) {
        try {
          const cachedTN = localStorage.getItem(`campus_teacher_notes_${student.id}`);
          if (cachedTN) {
            loadedTeacherNotes = cachedTN;
          }
        } catch (lsErr) {}
      }

      setHomeworkNotesList(loadedHomeworkNotesList);
      const isStudentNotesFocused = typeof document !== 'undefined' && studentNotesTextareaRef.current && document.activeElement === studentNotesTextareaRef.current;
      const isTeacherNotesFocused = typeof document !== 'undefined' && teacherNotesTextareaRef.current && document.activeElement === teacherNotesTextareaRef.current;
      if (!hasChanges) {
        if (!isStudentNotesFocused) {
          setGeneralHomeworkNotes(loadedHomeworkNotes);
          setHomeworkNotes(loadedHomeworkNotes);
        }
        if (!isTeacherNotesFocused) {
          setTeacherNotes(loadedTeacherNotes);
        }
      }
    } catch (err: any) {
      console.error('Error fetching progress:', err);
      setError('Fehler beim Laden des Lernfortschritts.');
    } finally {
      setLoading(false);
    }
  };

  const notifyHomeworkChange = async () => {
    // 1. Dispatch custom DOM events for same-window / local sync across all candidate IDs
    const candidateStudentIds = Array.from(new Set([
      student.id,
      (student as any)?.student_id,
      (student as any)?.studentId,
      (student as any)?.canonical_uuid,
      (student as any)?.slot_id
    ].filter(Boolean))) as string[];

    candidateStudentIds.forEach(cid => {
      window.dispatchEvent(new CustomEvent('homework-updated', { detail: { studentId: cid } }));
      window.dispatchEvent(new CustomEvent('campus_homework_updated', { detail: { studentId: cid } }));
    });

    // 2. Broadcast on Supabase channel for cross-browser / cross-device real-time websocket sync
    try {
      const channel = supabase.channel(`realtime_student_progress_${student.id}`);
      const fallbackTimer = setTimeout(() => supabase.removeChannel(channel), 5000);
      try {
        await channel.send({
          type: 'broadcast',
          event: 'homework-changed',
          payload: { studentId: student.id }
        });
      } finally {
        clearTimeout(fallbackTimer);
        setTimeout(() => supabase.removeChannel(channel), 1000);
      }
    } catch (e) {
      console.warn('Realtime broadcast error:', e);
    }
  };

  // 🔄 Reactive Auto-Sync: Refresh progress immediately when homework is updated elsewhere
  useEffect(() => {
    const candidateIds = new Set([
      student.id,
      (student as any)?.student_id,
      (student as any)?.studentId,
      (student as any)?.canonical_uuid,
      (student as any)?.slot_id
    ].filter(Boolean));

    const handleHwUpdate = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail?.studentId || candidateIds.has(detail.studentId)) {
        fetchProgress();
      }
    };

    window.addEventListener('homework-updated', handleHwUpdate);
    window.addEventListener('campus_homework_updated', handleHwUpdate);
    return () => {
      window.removeEventListener('homework-updated', handleHwUpdate);
      window.removeEventListener('campus_homework_updated', handleHwUpdate);
    };
  }, [student.id, (student as any)?.student_id]);


  useEffect(() => {
    if (student.id) {
      if (student.id === 'teacher-self') {
        loadLehrwerke();
        setLoading(false);
        return;
      }
      fetchProgress();
      loadLehrwerke();
      loadActiveSongSkills();

      const fetchProfile = async () => {
        try {
          const knownInstrument = (student as any)?.instrument || (student as any)?.resolved_instrument;
          const knownSchoolId = propSchoolId || student?.school_id || (student as any)?.schoolId;
          const knownTeacherId = teacherId || (student as any)?.teacher_id || (student as any)?.teacherId;
          const knownSchoolName = propSchoolName || student?.school_name || (Array.isArray((student as any)?.schools) ? (student as any)?.schools[0]?.name : (student as any)?.schools?.name);

          if (knownInstrument) {
            setStudentInstrument(knownInstrument);
          }
          if (knownTeacherId) {
            setStudentTeacherId(knownTeacherId);
          }
          if (knownSchoolId) {
            setStudentSchoolId(knownSchoolId);
            loadLehrwerke(knownSchoolId, knownTeacherId);
          }
          if (knownSchoolName) {
            setSchoolName(knownSchoolName);
            setResolvedSchoolName(knownSchoolName);
          } else if (knownSchoolId) {
            supabase
              .from('schools')
              .select('name')
              .eq('id', knownSchoolId)
              .maybeSingle()
              .then(({ data: schoolData }) => {
                if (schoolData && schoolData.name) {
                  setSchoolName(schoolData.name);
                  setResolvedSchoolName(schoolData.name);
                }
              });
          }

          // Query users and schools only if instrument, schoolId or teacherId is missing
          if (!knownInstrument || !knownSchoolId || !knownTeacherId) {
            const { data, error } = await supabase
              .from('users')
              .select('instrument, school_id, teacher_id')
              .eq('id', student.id)
              .maybeSingle();
            if (!error && data) {
              if (data.instrument && !knownInstrument) {
                setStudentInstrument(data.instrument);
              }
              const resTid = knownTeacherId || data.teacher_id;
              if (data.teacher_id && !knownTeacherId) {
                setStudentTeacherId(data.teacher_id);
              }
              if (data.school_id && !knownSchoolId) {
                setStudentSchoolId(data.school_id);
                loadLehrwerke(data.school_id, resTid);
                
                if (!knownSchoolName) {
                  const { data: schoolData } = await supabase
                    .from('schools')
                    .select('name')
                    .eq('id', data.school_id)
                    .maybeSingle();
                  if (schoolData && schoolData.name) {
                    setSchoolName(schoolData.name);
                  }
                }
              } else if (data.teacher_id && !knownTeacherId) {
                loadLehrwerke(knownSchoolId, data.teacher_id);
              }
            }
          }

          // Fetch avatars only if initial values were not provided via props
          if (initialXp === undefined || initialStreak === undefined) {
            const { data: avatarData, error: avatarError } = await supabase
              .from('avatars')
              .select('xp, streak_flame')
              .eq('user_id', student.id)
              .maybeSingle();

            if (!avatarError && avatarData) {
              if (initialXp === undefined) setStudentXP(avatarData.xp || 0);
              if (initialStreak === undefined) setStudentStreak(avatarData.streak_flame || 0);
            }
          }

          // Fetch fokus_logs only if initialPracticeMinutes was not provided
          if (initialPracticeMinutes === undefined) {
            const { data: focusData, error: focusError } = await supabase
              .from('fokus_logs')
              .select('created_at, duration_seconds')
              .eq('user_id', student.id);

            if (!focusError && focusData) {
              const totalSeconds = focusData.reduce((sum, item) => sum + (item.duration_seconds || 0), 0);
              setStudentPracticeMinutes(Math.floor(totalSeconds / 60));

              const currentWeek = getISOWeek();
              const currentWeekDays = new Set(
                focusData
                  .filter(item => item.created_at && getISOWeek(item.created_at) === currentWeek)
                  .map(item => new Date(item.created_at).toISOString().split('T')[0])
              );
              setWeeklyPracticeDays(currentWeekDays.size);
            }
          }
        } catch (e) {
          console.error('Error loading student profile in modal:', e);
        }
      };
      fetchProfile();
    }
  }, [student.id]);


  const resetStickerAlbum = async () => {
    try {
      const itemsToUpdate = progressItems.filter(item => item.homework_notes);
      
      for (const item of itemsToUpdate) {
        if (!item.id || !item.homework_notes) continue;
        try {
          const notesArray = item.homework_notes.startsWith('[') && item.homework_notes.endsWith(']')
            ? JSON.parse(item.homework_notes)
            : [item.homework_notes];
            
          if (Array.isArray(notesArray)) {
            const filteredArray = notesArray.filter((note: string) => !note.startsWith("STICKER:"));
            const updatedNotesJson = JSON.stringify(filteredArray);
            
            await supabase
              .from('progress_matrix')
              .update({ homework_notes: updatedNotesJson, updated_at: new Date().toISOString() })
              .eq('id', item.id);
          }
        } catch (e) {
          // ignore
        }
      }
      
      setSimulatedSongsCount(null);
      await fetchProgress();
      notifyHomeworkChange();
      alert("Sticker-Sammelalbum wurde erfolgreich zurückgesetzt! 🧹");
    } catch (e) {
      console.error("Error resetting sticker album:", e);
      alert("Fehler beim Zurücksetzen des Sticker-Albums.");
    }
  };

  const downloadShareCard = (sticker: any, topicOverride?: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const medalCenterY = 405;
    const tX = 140;
    const tY = 65;
    const tW = 920;
    const tH = 1070;
    const cardRadius = 38;

    const isLegendary = sticker.rarity === 'legendary';
    const isEpic = sticker.rarity === 'epic';
    const isRare = sticker.rarity === 'rare';
    const isSchuljahr = sticker.category === 'schuljahr';
    const borderColor = isLegendary || isSchuljahr ? '#facc15' : isEpic ? '#c084fc' : '#22c55e';
    const cardGlow = isLegendary || isSchuljahr ? 'rgba(250, 204, 21, 0.35)' : isEpic ? 'rgba(192, 132, 252, 0.3)' : 'rgba(34, 197, 94, 0.28)';

    // 1. LAYER 1: Deep Studio Atmosphere & Radial Vignette
    const bgGrad = ctx.createRadialGradient(600, 500, 60, 600, 600, 780);
    bgGrad.addColorStop(0, '#0c1322');
    bgGrad.addColorStop(0.55, '#070a14');
    bgGrad.addColorStop(1, '#030509');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 1200);

    // 1b. Concentric Guilloche / Acoustic Waveform Rings (Certificate Fine Art Security Lines)
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.setLineDash([4, 8]);
    [220, 290, 360, 440, 520].forEach(r => {
      ctx.beginPath();
      ctx.arc(600, medalCenterY, r, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.restore();

    // 1c. Ambient Backlight Spotlight behind the card plaque
    const ambientSpot = ctx.createRadialGradient(600, medalCenterY, 80, 600, medalCenterY, 520);
    ambientSpot.addColorStop(0, cardGlow);
    ambientSpot.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = ambientSpot;
    ctx.fillRect(0, 0, 1200, 1200);

    // 2. LAYER 2: 3D Collector Plaque Card Body (Deep Obsidian Core)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 45;
    ctx.shadowOffsetY = 24;

    const cardBgGrad = ctx.createLinearGradient(tX, tY, tX, tY + tH);
    cardBgGrad.addColorStop(0, '#131c2e');
    cardBgGrad.addColorStop(0.4, '#0f1728');
    cardBgGrad.addColorStop(1, '#090e1a');
    ctx.fillStyle = cardBgGrad;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(tX, tY, tW, tH, cardRadius);
    } else {
      ctx.rect(tX, tY, tW, tH);
    }
    ctx.fill();
    ctx.restore();

    // 2b. Rainbow Holographic Sheen inside card for rare/epic/legendary/schuljahr stickers
    if (isLegendary || isEpic || isRare || isSchuljahr) {
      ctx.save();
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(tX, tY, tW, tH, cardRadius);
      } else {
        ctx.rect(tX, tY, tW, tH);
      }
      ctx.clip();
      const holoGrad = ctx.createLinearGradient(tX, tY, tX + tW, tY + tH);
      holoGrad.addColorStop(0, 'rgba(255, 0, 128, 0.08)');
      holoGrad.addColorStop(0.25, 'rgba(0, 255, 255, 0.08)');
      holoGrad.addColorStop(0.5, 'rgba(255, 255, 0, 0.08)');
      holoGrad.addColorStop(0.75, 'rgba(0, 255, 128, 0.08)');
      holoGrad.addColorStop(1, 'rgba(255, 0, 255, 0.08)');
      ctx.fillStyle = holoGrad;
      ctx.fillRect(tX, tY, tW, tH);
      ctx.restore();
    }

    // 3. LAYER 3: Precision Multi-Stage Metallic Border & Corner Ornaments
    ctx.save();
    // Outer Border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(tX, tY, tW, tH, cardRadius);
    } else {
      ctx.rect(tX, tY, tW, tH);
    }
    ctx.stroke();

    // Inner Hairline Inset
    const insetGap = 12;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(tX + insetGap, tY + insetGap, tW - insetGap * 2, tH - insetGap * 2, cardRadius - 8);
    } else {
      ctx.rect(tX + insetGap, tY + insetGap, tW - insetGap * 2, tH - insetGap * 2);
    }
    ctx.stroke();

    // 4 Precision Artisan Corner Brackets
    const bracketLen = 22;
    const cornerInset = 20;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2.5;

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(tX + cornerInset, tY + cornerInset + bracketLen);
    ctx.lineTo(tX + cornerInset, tY + cornerInset);
    ctx.lineTo(tX + cornerInset + bracketLen, tY + cornerInset);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(tX + tW - cornerInset - bracketLen, tY + cornerInset);
    ctx.lineTo(tX + tW - cornerInset, tY + cornerInset);
    ctx.lineTo(tX + tW - cornerInset, tY + cornerInset + bracketLen);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(tX + cornerInset, tY + tH - cornerInset - bracketLen);
    ctx.lineTo(tX + cornerInset, tY + tH - cornerInset);
    ctx.lineTo(tX + cornerInset + bracketLen, tY + tH - cornerInset);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(tX + tW - cornerInset - bracketLen, tY + tH - cornerInset);
    ctx.lineTo(tX + tW - cornerInset, tY + tH - cornerInset);
    ctx.lineTo(tX + tW - cornerInset, tY + tH - cornerInset - bracketLen);
    ctx.stroke();
    ctx.restore();

    // 4. LAYER 4: Header Ribbon, Rarity & Edition Tag
    ctx.save();
    // Micro Edition Header
    ctx.font = '900 14px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText('✦ OFFIZIELLES SAMMLER-ZERTIFIKAT • CAMPUS-GROOVELAB ✦', 600, tY + 44);

    // Rarity & Stufe Stamp
    const syStr = getSchoolYearString();
    const yearNumber = parseInt(sticker.id.replace('schuljahr-', ''), 10) || 1;
    const rarityText = isSchuljahr
      ? `⭐ ${(sticker.rarityLabel || 'STANDARD').toUpperCase()} • AUSBILDUNGSSTUFE #${yearNumber}`
      : `⭐ ${(sticker.rarityLabel || 'STANDARD').toUpperCase()} • SCHULJAHR ${selectedSchoolYear || syStr}`;
    ctx.font = '900 18px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = borderColor;
    ctx.fillText(rarityText, 600, tY + 76);

    // Slanted "GEMEISTERT!" Ribbon with 3D Bevel
    ctx.translate(600, tY + 130);
    ctx.rotate(-2 * Math.PI / 180);
    const pillText = isSchuljahr ? 'ABSOLVIERT!' : 'GEMEISTERT!';
    ctx.font = '900 26px "Helvetica Neue", Arial, sans-serif';
    const pillTextWidth = ctx.measureText(pillText).width;
    const pillW = pillTextWidth + 48;
    const pillH = 46;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;

    const ribbonGrad = ctx.createLinearGradient(0, -pillH / 2, 0, pillH / 2);
    if (isLegendary || isSchuljahr) {
      ribbonGrad.addColorStop(0, '#eab308');
      ribbonGrad.addColorStop(1, '#ca8a04');
    } else if (isEpic) {
      ribbonGrad.addColorStop(0, '#a855f7');
      ribbonGrad.addColorStop(1, '#7e22ce');
    } else {
      ribbonGrad.addColorStop(0, '#22c55e');
      ribbonGrad.addColorStop(1, '#15803d');
    }
    ctx.fillStyle = ribbonGrad;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(-pillW/2, -pillH/2, pillW, pillH, 23);
    } else {
      ctx.rect(-pillW/2, -pillH/2, pillW, pillH);
    }
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pillText, 0, 0);
    ctx.restore();

    // 5. LAYER 5: Student Details Typography & Dynamic Layout Budgeting
    // Safe card boundary: tY to tY + tH (65 to 1135).
    // Bottom area reserved for Hallmark (logoY + 28), Dual-Brand Logo (logoY), and School Seal (badgeY).
    const sealH = 58;
    const badgeY = tY + tH - 185; // Fixed safe anchor for school seal: ~950
    const logoY = badgeY + sealH + 34; // Fixed safe anchor for logo: ~1042
    const hallmarkY = logoY + 28; // ~1070 (card bottom is 1135, leaving 65px breathing room)

    // Calculate vertical space available for student typography between ribbon (tY + 160) and badgeY (950)
    // Available middle slot height: ~370px (from ~580 to ~950)
    let textY = tY + 615;

    // Student Name: auto-shrink font size if name is very long
    ctx.fillStyle = '#ffffff';
    let studentNameFontSize = 46;
    ctx.font = `900 ${studentNameFontSize}px "Helvetica Neue", Arial, sans-serif`;
    while (ctx.measureText(actualStudentName).width > 780 && studentNameFontSize > 28) {
      studentNameFontSize -= 2;
      ctx.font = `900 ${studentNameFontSize}px "Helvetica Neue", Arial, sans-serif`;
    }
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 12;
    ctx.fillText(actualStudentName, 600, textY);
    ctx.shadowColor = 'transparent';

    if (studentInstrument) {
      textY += 34;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '900 19px "Helvetica Neue", Arial, sans-serif';
      const instrumentStr = `✦ ${studentInstrument.toUpperCase()} • INSTRUMENTALAUSBILDUNG ✦`;
      ctx.fillText(instrumentStr, 600, textY);
    }

    textY += 46;
    ctx.fillStyle = borderColor;
    let titleFontSize = 36;
    ctx.font = `italic 900 ${titleFontSize}px "Helvetica Neue", Arial, sans-serif`;
    while (ctx.measureText(sticker.title.toUpperCase()).width > 800 && titleFontSize > 24) {
      titleFontSize -= 2;
      ctx.font = `italic 900 ${titleFontSize}px "Helvetica Neue", Arial, sans-serif`;
    }
    ctx.fillText(sticker.title.toUpperCase(), 600, textY);

    const rawTopic = topicOverride || (collectedStickers[sticker.id]?.details?.slice(-1)[0]?.topic);
    const cleanTopic = (rawTopic && rawTopic !== 'Simulation' && rawTopic !== 'Allgemein') ? rawTopic : undefined;
    const isSongCard = sticker.category === 'songs' || sticker.id === 'song-master' || Boolean(cleanTopic);

    if (isSongCard && (cleanTopic || sticker.id === 'song-master')) {
      textY += 38;
      ctx.fillStyle = '#fde047';
      ctx.font = '900 23px "Helvetica Neue", Arial, sans-serif';
      const topicText = `🎵 ${cleanTopic || 'Song gemeistert'}`;
      ctx.fillText(topicText, 600, textY);
    } else {
      textY += 34;
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 19px "Helvetica Neue", Arial, sans-serif';
      let descText = sticker.desc || '';
      if (ctx.measureText(descText).width > 800) {
        ctx.font = 'bold 17px "Helvetica Neue", Arial, sans-serif';
      }
      ctx.fillText(descText, 600, textY);

      if (sticker.equiv && textY + 28 < badgeY - 15) {
        textY += 28;
        ctx.fillStyle = '#38bdf8';
        ctx.font = '900 17px "Helvetica Neue", Arial, sans-serif';
        ctx.fillText(sticker.equiv, 600, textY);
      }
    }

    // 6. LAYER 6: The Authoritative Music School Certification Seal (Anchored safely)
    let authoritativeSchool = '';
    const candidates = [
      propSchoolName,
      resolvedSchoolName,
      schoolName,
      student?.school_name,
      (student as any)?.schools?.name,
      Array.isArray((student as any)?.schools) ? (student as any)?.schools[0]?.name : null,
      typeof window !== 'undefined' ? (localStorage.getItem('groovelab_school_name') || localStorage.getItem('campus_school_name') || sessionStorage.getItem('groovelab_ghost_school_name')) : null
    ];
    for (const c of candidates) {
      if (c && typeof c === 'string') {
        const trimmed = c.trim();
        if (
          trimmed && 
          trimmed !== 'Campus-Groovelab' && 
          trimmed.toLowerCase() !== 'musikschule' && 
          trimmed !== 'Campus-Groovelab Musikschule' &&
          trimmed !== 'Meine Musikschule'
        ) {
          authoritativeSchool = trimmed;
          break;
        }
      }
    }
    if (!authoritativeSchool) {
      authoritativeSchool = 'Campus-Groovelab Partner-Musikschule';
    }

    let displaySchool = authoritativeSchool.toUpperCase();
    if (!displaySchool.includes('MUSIK') && !displaySchool.includes('MUSÄK') && !displaySchool.includes('KONSERVATORIUM') && !displaySchool.includes('AKADEMIE') && !displaySchool.includes('SCHULE')) {
      displaySchool = `MUSIKSCHULE • ${displaySchool}`;
    }

    let schoolFontSize = 20;
    ctx.font = `900 ${schoolFontSize}px "Helvetica Neue", Arial, sans-serif`;
    while (ctx.measureText(displaySchool).width > 700 && schoolFontSize > 14) {
      schoolFontSize -= 1;
      ctx.font = `900 ${schoolFontSize}px "Helvetica Neue", Arial, sans-serif`;
    }

    const schoolTextW = ctx.measureText(displaySchool).width;
    const badgeW = Math.min(840, Math.max(460, schoolTextW + 70));
    const badgeH = sealH;
    const badgeX = 600 - badgeW / 2;

    // Official Seal Container with 3D Bevel & Gold Border
    ctx.save();
    ctx.fillStyle = 'rgba(234, 179, 8, 0.08)';
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(badgeX, badgeY, badgeW, badgeH, 16);
    } else {
      ctx.rect(badgeX, badgeY, badgeW, badgeH);
    }
    ctx.fill();
    ctx.stroke();

    // Inner dashed seal border
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.22)';
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(badgeX + 4, badgeY + 4, badgeW - 8, badgeH - 8, 12);
    } else {
      ctx.rect(badgeX + 4, badgeY + 4, badgeW - 8, badgeH - 8);
    }
    ctx.stroke();
    ctx.restore();

    // Seal Text
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ca8a04';
    ctx.font = '900 11px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText('✦ OFFIZIELL ZERTIFIZIERT DURCH ✦', 600, badgeY + 16);

    ctx.fillStyle = '#fef08a';
    ctx.font = `900 ${schoolFontSize}px "Helvetica Neue", Arial, sans-serif`;
    ctx.fillText(displaySchool, 600, badgeY + 39);
    ctx.restore();

    // 7. LAYER 7: Official Dual-Brand Logo & ASVS Security Hallmark
    ctx.font = '900 23px "Helvetica Neue", Arial, sans-serif';
    const partCampus = 'Campus';
    const partDash = '-';
    const partGroove = 'Groovelab';
    const partDomain = '.de';

    const wCampus = ctx.measureText(partCampus).width;
    const wDash = ctx.measureText(partDash).width;
    const wGroove = ctx.measureText(partGroove).width;
    const wDomain = ctx.measureText(partDomain).width;
    const totalLogoW = wCampus + wDash + wGroove + wDomain;

    let currentLogoX = 600 - totalLogoW / 2;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Campus in Campus-Grün
    ctx.fillStyle = '#34a853';
    ctx.fillText(partCampus, currentLogoX, logoY);
    currentLogoX += wCampus;

    // Bindestrich in Slate
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(partDash, currentLogoX, logoY);
    currentLogoX += wDash;

    // Groovelab in GrooveLab-Gelb
    ctx.fillStyle = '#facc15';
    ctx.fillText(partGroove, currentLogoX, logoY);
    currentLogoX += wGroove;

    // .de in dezentem Schiefergrau
    ctx.fillStyle = '#64748b';
    ctx.fillText(partDomain, currentLogoX, logoY);
    ctx.textBaseline = 'alphabetic'; // reset

    // Micro Hallmark Line (Variante 3: Musikalisches Sammler- & Akademie-Branding)
    const cleanStickerId = sticker.id.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const syDisplay = selectedSchoolYear || syStr;
    ctx.font = '700 11px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText(`✦ VERIFIZIERTE SAMMLER-EDITION • SCHULJAHR ${syDisplay} • ID: CG-${cleanStickerId} ✦`, 600, hallmarkY);

    // 8. LAYER 8: Die-Cut Vinyl Sticker Presentation with 3D Hologram Glow
    const drawStickerAsset = (imgOrEmoji: HTMLImageElement | string, isImg: boolean) => {
      ctx.save();
      ctx.translate(600, medalCenterY);

      // Backlight Pedestal Glow with Trading-Card holographic rings
      const pedestalGlow = ctx.createRadialGradient(0, 0, 30, 0, 0, 190);
      pedestalGlow.addColorStop(0, isLegendary || isSchuljahr ? 'rgba(250, 204, 21, 0.35)' : isEpic ? 'rgba(192, 132, 252, 0.3)' : 'rgba(52, 168, 83, 0.28)');
      pedestalGlow.addColorStop(0.7, isLegendary || isSchuljahr ? 'rgba(250, 204, 21, 0.08)' : 'rgba(52, 168, 83, 0.05)');
      pedestalGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = pedestalGlow;
      ctx.beginPath();
      ctx.arc(0, 0, 190, 0, Math.PI * 2);
      ctx.fill();

      if (isImg) {
        const sSize = 300;
        const sRadius = 28;
        const sX = -sSize / 2;
        const sY = -sSize / 2;

        // Multi-stage 3D Studio Drop Shadow behind rounded image shape
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
        ctx.shadowBlur = 38;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 20;
        ctx.fillStyle = '#080d18';
        ctx.beginPath();
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(sX, sY, sSize, sSize, sRadius);
        } else {
          ctx.rect(sX, sY, sSize, sSize);
        }
        ctx.fill();
        ctx.restore();

        // Clipped image with smooth 28px squircle radius (matching DOM borderRadius: 24px)
        ctx.save();
        ctx.beginPath();
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(sX, sY, sSize, sSize, sRadius);
        } else {
          ctx.rect(sX, sY, sSize, sSize);
        }
        ctx.clip();
        ctx.drawImage(imgOrEmoji as HTMLImageElement, sX, sY, sSize, sSize);
        ctx.restore();
      } else {
        // Stenciled Coin Emblem for Emoji Fallback
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 12;
        ctx.fillStyle = sticker.bg || 'rgba(52, 168, 83, 0.25)';
        ctx.beginPath();
        ctx.arc(0, 0, 140, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 6;
        ctx.stroke();

        ctx.font = '120px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sticker.emoji || '🏆', 0, 0);
      }

      ctx.restore();
      
      const filename = (cleanTopic || sticker.title || 'sticker').toLowerCase().replace(/[^a-z0-9]/gi, '_');
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.download = `campus_sticker_${filename}.jpg`;
      link.href = dataUrl;
      link.click();
    };

    // Load sticker asset
    const img = new Image();
    img.onload = () => {
      drawStickerAsset(img, true);
    };
    img.onerror = () => {
      drawStickerAsset(sticker.emoji || '🏆', false);
    };
    img.src = `/stickers/${sticker.id}.png?v=1`;
  };

  const shareCard = async (sticker: any, topicOverride?: string) => {
    try {
      downloadShareCard(sticker, topicOverride);
    } catch (err) {
      console.log('Share action ended:', err);
    }
  };

  useEffect(() => {
    if (initialLehrwerkId && globalLehrwerke.length > 0) {
      const isAssigned = assignedLehrwerke.some(a => a.lehrwerkId === initialLehrwerkId);
      if (!isAssigned) {
        handleAssignLehrwerk(initialLehrwerkId);
      } else if (activeLehrwerkId !== initialLehrwerkId) {
        selectTextbookPage(initialLehrwerkId, 1);
      }
    }
  }, [initialLehrwerkId, globalLehrwerke, assignedLehrwerke]);

  // Synchronize progressItems from DB into student_lehrwerke_progress in localStorage
  useEffect(() => {
    if (globalLehrwerke.length === 0 || progressItems.length === 0) return;

    try {
      const stored = localStorage.getItem('student_lehrwerke_progress');
      const parsed = stored ? JSON.parse(stored) : [];
      let hasChanges = false;

      globalLehrwerke.forEach(book => {
        const bookTitleLower = book.title.toLowerCase();
        
        // Find all progress items for this book
        const bookProgressItems = progressItems.filter(item => {
          const topicLower = (item.topic_name || '').toLowerCase();
          return topicLower.startsWith(bookTitleLower + ' - seite ');
        });

        if (bookProgressItems.length === 0) return;

        // Ensure the book is assigned locally if there are progress items for it in the DB
        let assignmentIndex = parsed.findIndex((item: any) => 
          String(item.studentId) === String(student.id) && 
          (String(item.lehrwerkId) === String(book.id) || (item.bookTitle && item.bookTitle.toLowerCase() === book.title.toLowerCase()))
        );
        if (assignmentIndex === -1) {
          const newAssignment = {
            studentId: student.id,
            lehrwerkId: book.id,
            bookTitle: book.title,
            lehrwerkTitle: book.title,
            totalPages: book.totalPages || book.total_pages || 50,
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
        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(parsed));
        const filtered = parsed.filter((item: any) => String(item.studentId) === String(student.id));
        setAssignedLehrwerke(filtered);
      }
    } catch (err) {
      console.error('Error synchronizing textbook progress from DB:', err);
    }
  }, [globalLehrwerke, progressItems, student.id]);

  // Dynamically auto-expand the homework textarea height as more content gets entered
  useEffect(() => {
    if (homeworkTextareaRef.current) {
      homeworkTextareaRef.current.style.height = 'auto';
      homeworkTextareaRef.current.style.height = `${Math.max(90, homeworkTextareaRef.current.scrollHeight)}px`;
    }
  }, [homeworkNotes]);

  const selectItemForEditing = (item: ProgressItem) => {
    setActiveItem(item);
    setTopicName(item.topic_name);
    setStatus(item.status);
    setIsCurrentHomework(item.is_current_homework);
    setTeacherNotes(item.teacher_notes || '');
    setHomeworkNotes('');
    setActiveInputTab('free');
  };

  const handleCreateNew = () => {
    setActiveItem(null);
    setTopicName('');
    setStatus('IN_PROGRESS');
    setIsCurrentHomework(false);
    setTeacherNotes('');
    setHomeworkNotes('');
    setActiveInputTab('free');
    setSelectedSongId('');
    setSongPart('');
    setActivePageNumber(null);
    setSelectedActiveSongId('');
  };

  const handleResetAllCurrentHomework = async () => {
    try {
      const activeIds = progressItems.filter(item => item.is_current_homework).map(item => item.id).filter(Boolean);
      if (activeIds.length > 0) {
        await supabase
          .from('progress_matrix')
          .update({ is_current_homework: false, status: 'IN_PROGRESS' })
          .in('id', activeIds);
      }

      // Reset Lehrwerke in localStorage
      const stored = localStorage.getItem('student_lehrwerke_progress');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const updated = parsed.map((item: any) => {
            if (item.studentId === student.id && item.pageStates) {
              const pageStates = { ...item.pageStates };
              Object.keys(pageStates).forEach(pKey => {
                if (pageStates[pKey]?.status === 'homework' || pageStates[pKey]?.isCurrentHomework) {
                  pageStates[pKey] = {
                    ...pageStates[pKey],
                    status: 'locked',
                    isCurrentHomework: false,
                    updatedAt: new Date().toISOString()
                  };
                }
              });
              return { ...item, pageStates };
            }
            return item;
          });
          localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
          setAssignedLehrwerke(updated.filter((item: any) => item.studentId === student.id));
          loadLehrwerke();
        } catch (e) {}
      }

      // Clear local storage for song homeworks
      (activeSongSkills || []).forEach((skill: any) => {
        try {
          localStorage.setItem(`song_hw_${student.id}_${skill.id}`, 'false');
          if (skill.song_id) localStorage.setItem(`song_hw_${student.id}_${skill.song_id}`, 'false');
        } catch (e) {}
      });

      setIsCurrentHomework(false);
      setGeneralHomeworkNotes('');
      setHomeworkNotes('');
      setHomeworkNotesList([]);
      try {
        const currentIso = getTargetWeekIso(viewingWeekOffset);
        localStorage.removeItem(`week_transferred_${student.id}_${currentIso}`);
        localStorage.removeItem(`campus_homework_notes_${student.id}`);
        localStorage.removeItem(`campus_homework_week_${student.id}`);
      } catch (e) {}
      setSessionLogs(prev => [...prev, `🗑️ Alle aktiven Hausaufgaben zurückgesetzt`]);
      await fetchProgress();
      await loadActiveSongSkills();
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error resetting current homework:', e);
    }
  };

  // 📥 Source-Daten für Hausaufgaben-Übertrag in eine neue Kalenderwoche
  const sourceTransferData = useMemo(() => {
    // 1. Lehrwerke from assignedLehrwerke and progressItems
    const lwMap: Record<string, { pages: number[]; notes: string[]; bookColor?: any }> = {};
    (assignedLehrwerke || []).forEach((assignment: any) => {
      const book = globalLehrwerke.find(g => g.id === assignment.lehrwerkId);
      if (!book || !assignment.pageStates) return;
      Object.entries(assignment.pageStates).forEach(([pStr, pState]: [string, any]) => {
        if (pState?.status === 'homework' || pState?.isCurrentHomework) {
          const pNum = parseInt(pStr, 10);
          if (!isNaN(pNum)) {
            if (!lwMap[book.title]) lwMap[book.title] = { pages: [], notes: [], bookColor: getLehrwerkColor(book.title) };
            if (!lwMap[book.title].pages.includes(pNum)) lwMap[book.title].pages.push(pNum);
          }
        }
      });
    });

    (progressItems || []).forEach((item: any) => {
      if (item.topic_name && item.topic_name.includes(' - Seite ') && item.is_current_homework) {
        const parts = item.topic_name.split(' - Seite ');
        const bTitle = parts[0].trim();
        const pNum = parseInt(parts[1], 10);
        if (!lwMap[bTitle]) lwMap[bTitle] = { pages: [], notes: [], bookColor: getLehrwerkColor(bTitle) };
        if (!isNaN(pNum) && !lwMap[bTitle].pages.includes(pNum)) lwMap[bTitle].pages.push(pNum);
      }
    });

    const sourceLW = Object.entries(lwMap).map(([title, info]) => ({
      title,
      pages: info.pages.sort((a, b) => a - b),
      notes: info.notes,
      bookColor: info.bookColor
    }));

    // 2. Songs
    const sourceS: any[] = [];
    (progressItems || []).forEach((item: any) => {
      if (item.is_current_homework && !item.topic_name?.includes(' - Seite ') && !item.topic_name?.startsWith('Hausaufgabe KW ')) {
        const cleanTopic = getNormalizedSongTitle(item);
        const canKey = getCanonicalSongKey(item);
        if (cleanTopic && !sourceS.some(x => getCanonicalSongKey(x) === canKey || getNormalizedSongTitle(x) === cleanTopic)) {
          sourceS.push({
            id: item.id,
            topic_name: item.topic_name,
            homework_notes: item.homework_notes
          });
        }
      }
    });

    (activeSongSkills || []).forEach((skill: any) => {
      const isHwInLs = localStorage.getItem(`song_hw_${student.id}_${skill.id}`) === 'true' ||
                       localStorage.getItem(`song_hw_${student.id}_${skill.song_id}`) === 'true';
      const isMarkedHw = isHwInLs || skill.is_current_homework === true || skill.is_homework === true;
      if (isMarkedHw) {
        const cleanTopic = getNormalizedSongTitle(skill);
        const canKey = getCanonicalSongKey(skill);
        if (!sourceS.some(x => getCanonicalSongKey(x) === canKey || getNormalizedSongTitle(x) === cleanTopic)) {
          const songArtist = skill.songs?.artist || skill.artist || '';
          const songTitle = skill.songs?.title || skill.title || skill.song_title || 'Song';
          const songInstrument = skill.instrument ? ` (${skill.instrument})` : '';
          const fullTitle = songArtist ? `${songArtist} - ${songTitle}${songInstrument}` : `${songTitle}${songInstrument}`;
          sourceS.push({
            id: skill.id,
            topic_name: fullTitle,
            homework_notes: skill.homework_notes
          });
        }
      }
    });

    // 3. Audios
    const rawAudioList = (homeworkNotesList || [])
      .map((note, idx) => ({ note: typeof note === 'string' ? note : String(note || ''), idx }))
      .filter(item => item.note.includes("AUDIO:"))
      .map((item, index) => {
        const cleanStr = item.note.startsWith('[') ? item.note.replace(/[\[\]"]/g, '') : item.note;
        const parts = cleanStr.substring(cleanStr.indexOf('AUDIO:') + 6).split('|');
        return {
          url: parts[0]?.trim(),
          duration: parseInt(parts[1] || '0', 10),
          date: parts[2]?.trim(),
          label: parts[3]?.trim() || `Aufnahme #${index + 1}`,
          author: parts[4]?.trim() || 'teacher',
          uniqueRecId: parts[6]?.trim(),
          songTag: parts[7]?.trim(),
          originalIdx: item.idx,
          idx: item.idx
        };
      })
      .filter(a => !!a.url);

    const harmonizedSourceAudios = harmonizeAudioList(rawAudioList, true, topicName);
    const sourceA = harmonizedSourceAudios.map(aud => ({
      ...aud,
      label: aud.harmonizedTitle || aud.label
    }));

    return { sourceLW, sourceS, sourceA };
  }, [assignedLehrwerke, globalLehrwerke, progressItems, activeSongSkills, homeworkNotesList, student.id, topicName]);

  // 🎯 Prüft, ob transferierbare Aufgaben aus der Vorwoche (Lehrwerke, Songs, Audios, Notizen) vorliegen
  const hasTransferableHomework = useMemo(() => {
    const hasLW = (sourceTransferData.sourceLW || []).length > 0;
    const hasSongs = (sourceTransferData.sourceS || []).length > 0;
    const hasAudios = (sourceTransferData.sourceA || []).length > 0;
    
    // Prüfen, ob didaktische Notizen vorliegen
    const hasNotesInList = (homeworkNotesList || []).some(n => 
      typeof n === 'string' && 
      !isInternalMetadataNote(n) && 
      !n.startsWith('AUDIO:') && 
      !n.startsWith('STICKER:') && 
      !n.startsWith('FEEDBACK:') && 
      n.trim().length > 0
    );
    const hasGeneralNotes = Boolean(generalHomeworkNotes && generalHomeworkNotes.trim().length > 0);
    const hasPreviousWeekSnapshot = (progressItems || []).some((item: any) => {
      if (!item.is_current_homework && !item.topic_name?.startsWith('Hausaufgabe KW ')) return false;
      const notes = item.homework_notes || item.teacher_notes || '';
      return typeof notes === 'string' && notes.trim().length > 0;
    });

    return hasLW || hasSongs || hasAudios || hasNotesInList || hasGeneralNotes || hasPreviousWeekSnapshot;
  }, [sourceTransferData, homeworkNotesList, generalHomeworkNotes, progressItems]);

  // ⚡ Atomare Ausführung des Hausaufgaben-Übertrags in eine neue Kalenderwoche (Echte Kopie statt destruktiver Mutation)
  const handleExecuteBatchTransfer = async (decisions: {
    lehrwerke: Record<string, 'master' | 'reactivate' | 'park'>;
    lehrwerkePages?: Record<string, Record<number, 'master' | 'reactivate' | 'park'>>;
    songs: Record<string, 'master' | 'reactivate' | 'park'>;
    audios: Record<string, 'keep' | 'hide'>;
  }) => {
    try {
      const targetIso = getTargetWeekIso(viewingWeekOffset);
      const targetNum = targetIso.split('-W')[1] || '';
      const prevTarget = getSimulatedNow();
      prevTarget.setDate(prevTarget.getDate() + ((viewingWeekOffset - 1) * 7));
      const sourceIso = getISOWeek(prevTarget);
      const sourceNum = sourceIso.split('-W')[1] || '';
      const activeTId = await getCurrentTeacherId();

      // === 0. VORWOCHEN-INTEGRITÄT: Vorwochen-Snapshot vorab vollständig einfrieren ===
      try {
        const existingSourceSnap = progressItems.find(it => it.topic_name === `Hausaufgabe KW ${sourceNum}`);
        const sourceAudios = (sourceTransferData.sourceA || []).map(a => 
          `AUDIO:${a.url}|${a.duration || 0}|${a.date || new Date().toISOString()}|${a.label}|${(a as any).author || 'teacher'}|shared_with_teacher|${(a as any).uniqueRecId || ''}|${(a as any).songTag || ''}`
        );

        if (existingSourceSnap) {
          let existingNotesList: string[] = [];
          try {
            const p = typeof existingSourceSnap.homework_notes === 'string' 
              ? JSON.parse(existingSourceSnap.homework_notes) 
              : existingSourceSnap.homework_notes;
            if (Array.isArray(p)) existingNotesList = p;
          } catch {}

          const cleanExisting = existingNotesList.filter((n: string) => 
            typeof n === 'string' && !n.startsWith('SNAPSHOT_LEHRWERKE:') && !n.startsWith('SNAPSHOT_SONGS:')
          );
          const enrichedSourceNotes = [
            ...cleanExisting,
            ...(sourceTransferData.sourceLW.length > 0 ? [`SNAPSHOT_LEHRWERKE:${JSON.stringify(sourceTransferData.sourceLW)}`] : []),
            ...(sourceTransferData.sourceS.length > 0 ? [`SNAPSHOT_SONGS:${JSON.stringify(sourceTransferData.sourceS)}`] : [])
          ];

          await supabase
            .from('progress_matrix')
            .update({
              homework_notes: JSON.stringify(enrichedSourceNotes)
            })
            .eq('id', existingSourceSnap.id);
        } else {
          const sourceSnapNotes = [
            ...sourceAudios,
            ...(sourceTransferData.sourceLW.length > 0 ? [`SNAPSHOT_LEHRWERKE:${JSON.stringify(sourceTransferData.sourceLW)}`] : []),
            ...(sourceTransferData.sourceS.length > 0 ? [`SNAPSHOT_SONGS:${JSON.stringify(sourceTransferData.sourceS)}`] : [])
          ];
          await supabase
            .from('progress_matrix')
            .insert({
              student_id: student.id,
              teacher_id: activeTId,
              topic_name: `Hausaufgabe KW ${sourceNum}`,
              status: 'IN_PROGRESS',
              is_current_homework: false,
              teacher_notes: '',
              homework_notes: JSON.stringify(sourceSnapNotes),
              updated_at: prevTarget.toISOString()
            });
        }
      } catch (snapErr) {
        console.warn('[handleExecuteBatchTransfer] Notice preserving source snapshot:', snapErr);
      }

      // 1. Lehrwerke (mit granularer Einzel-Seiten-Triage als Kopie für Zielwoche)
      for (const [title, action] of Object.entries(decisions.lehrwerke)) {
        const bookPagesDecision = decisions.lehrwerkePages?.[title];
        if (bookPagesDecision && Object.keys(bookPagesDecision).length > 0) {
          for (const [pNumStr, pAction] of Object.entries(bookPagesDecision)) {
            const pageNum = parseInt(pNumStr, 10);
            if (isNaN(pageNum)) continue;
            if (pAction === 'master') {
              await handleMasterSinglePageDirect(title, pageNum);
            } else if (pAction === 'park') {
              await handleRemoveSinglePageHomework(title, pageNum);
            } else if (pAction === 'reactivate') {
              await handleReactivateSinglePageDirect(title, pageNum, targetIso);
            }
          }
        } else {
          if (action === 'master') {
            await handleMasterBookDirect(title);
          } else if (action === 'park') {
            await handleRemoveBookHomework(title);
          } else if (action === 'reactivate') {
            await handleReactivateBookDirect(title, targetIso);
          }
        }
      }

      // 2. Songs (Triage als Kopie für Zielwoche)
      for (const [songKey, action] of Object.entries(decisions.songs)) {
        const songItem = sourceTransferData.sourceS.find(s => (s.id === songKey || s.topic_name === songKey));
        if (!songItem) continue;
        if (action === 'master') {
          await handleMasterSongDirect(songItem);
        } else if (action === 'park') {
          await handleRemoveSongHomework(songItem);
        } else if (action === 'reactivate') {
          await handleReactivateSongDirect(songItem, targetIso);
        }
      }

      // 3. Audios
      for (const [url, action] of Object.entries(decisions.audios)) {
        const aItem = sourceTransferData.sourceA.find(a => a.url === url);
        if (action === 'keep') {
          if (aItem) await handleKeepAudioTrack(aItem.originalIdx, url);
        } else if (action === 'hide') {
          if (aItem) await handleHideAudioTrack(aItem.originalIdx, url);
        }
      }

      // 4. Mark target week as transferred in local storage
      localStorage.setItem(`week_transferred_${student.id}_${targetIso}`, 'true');

      // 5. Create / update weekly snapshot in progress_matrix for the target week with complete metadata
      const existingSnap = progressItems.find(it => it.topic_name === `Hausaufgabe KW ${targetNum}`);
      const keptAudios = sourceTransferData.sourceA
        .filter(a => decisions.audios[a.url] === 'keep')
        .map(a => `AUDIO:${a.url}|${a.duration || 0}|${new Date().toISOString()}|${a.label}|${(a as any).author || 'teacher'}|shared_with_teacher|${(a as any).uniqueRecId || ''}|${(a as any).songTag || ''}`);

      const targetLwList = sourceTransferData.sourceLW
        .map(lw => {
          const pagesDecision = decisions.lehrwerkePages?.[lw.title];
          const keptPages = pagesDecision 
            ? lw.pages.filter(p => pagesDecision[p] === 'reactivate')
            : (decisions.lehrwerke[lw.title] === 'reactivate' ? lw.pages : []);
          return {
            ...lw,
            pages: keptPages
          };
        })
        .filter(lw => lw.pages.length > 0);

      const targetSongsList = sourceTransferData.sourceS.filter(s => decisions.songs[s.id || s.topic_name] === 'reactivate');

      const targetSnapNotes = [
        ...keptAudios,
        ...(targetLwList.length > 0 ? [`SNAPSHOT_LEHRWERKE:${JSON.stringify(targetLwList)}`] : []),
        ...(targetSongsList.length > 0 ? [`SNAPSHOT_SONGS:${JSON.stringify(targetSongsList)}`] : [])
      ];
      const snapNotesJson = JSON.stringify(targetSnapNotes);

      if (existingSnap) {
        await supabase
          .from('progress_matrix')
          .update({ homework_notes: snapNotesJson, is_current_homework: true, updated_at: new Date().toISOString() })
          .eq('id', existingSnap.id);
      } else {
        await supabase
          .from('progress_matrix')
          .insert({
            student_id: student.id,
            teacher_id: activeTId,
            topic_name: `Hausaufgabe KW ${targetNum}`,
            status: 'IN_PROGRESS',
            is_current_homework: true,
            teacher_notes: '',
            homework_notes: snapNotesJson,
            updated_at: new Date().toISOString()
          });
      }

      notifyHomeworkChange();
      await fetchProgress();
      await loadLehrwerke();
      await loadActiveSongSkills();
      setIsTransferModalOpen(false);
    } catch (err) {
      console.error('[handleExecuteBatchTransfer] Error:', err);
    }
  };


  const handleRemoveSinglePageHomework = async (bookTitle: string, pageNum: number) => {
    try {
      const book = globalLehrwerke.find(b => b.title === bookTitle);
      if (book) {
        const stored = localStorage.getItem('student_lehrwerke_progress');
        const parsed = stored ? JSON.parse(stored) : [];
        
        const updated = parsed.map((item: any) => {
          if (item.studentId === student.id && item.lehrwerkId === book.id) {
            const pageStates = { ...item.pageStates };
            pageStates[pageNum] = {
              ...pageStates[pageNum],
              status: 'locked',
              isCurrentHomework: false,
              updatedAt: new Date().toISOString()
            };
            return { ...item, pageStates };
          }
          return item;
        });
        
        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
        setAssignedLehrwerke(updated.filter((item: any) => item.studentId === student.id));
        
        const globalStored = localStorage.getItem('campus_lehrwerke');
        if (globalStored) {
          const books = JSON.parse(globalStored);
          const updatedBooks = books.map((b: any) => {
            if (b.id === book.id) {
              const globalPageStates = { ...b.globalPageStates };
              delete globalPageStates[pageNum];
              return { ...b, globalPageStates };
            }
            return b;
          });
          localStorage.setItem('campus_lehrwerke', JSON.stringify(updatedBooks));
        }

        loadLehrwerke();
      }

      // Update database progress_matrix for this single page
      const pageTopic = `${bookTitle} - Seite ${pageNum}`;
      const matchingItems = progressItems.filter(item => item.topic_name === pageTopic);
      const matchingIds = matchingItems.map(i => i.id).filter(id => id && !String(id).startsWith('temp-'));
      if (matchingIds.length > 0) {
        await supabase
          .from('progress_matrix')
          .update({ is_current_homework: false, status: 'IN_PROGRESS' })
          .in('id', matchingIds);
      }

      setProgressItems(prev => prev.map(item => {
        if (item.topic_name === pageTopic) {
          return { ...item, is_current_homework: false, status: 'IN_PROGRESS' };
        }
        return item;
      }));

      await fetchProgress();
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error removing single page homework:', e);
    }
  };

  const handleRemoveBookHomework = async (bookTitle: string) => {
    try {
      const book = globalLehrwerke.find(b => b.title === bookTitle);
      if (book) {
        const stored = localStorage.getItem('student_lehrwerke_progress');
        const parsed = stored ? JSON.parse(stored) : [];
        
        const updated = parsed.map((item: any) => {
          if (item.studentId === student.id && item.lehrwerkId === book.id) {
            const pageStates = { ...item.pageStates };
            Object.keys(pageStates).forEach(pKey => {
              if (pageStates[pKey]?.status === 'homework' || pageStates[pKey]?.isCurrentHomework) {
                pageStates[pKey] = {
                  ...pageStates[pKey],
                  status: 'locked',
                  isCurrentHomework: false,
                  updatedAt: new Date().toISOString()
                };
              }
            });
            return { ...item, pageStates };
          }
          return item;
        });
        
        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
        setAssignedLehrwerke(updated.filter((item: any) => item.studentId === student.id));
        loadLehrwerke();
      }

      // Update database progress_matrix for all pages of this book
      const matchingItems = progressItems.filter(item => item.topic_name && item.topic_name.startsWith(`${bookTitle} - Seite `));
      const matchingIds = matchingItems.map(i => i.id).filter(id => id && !String(id).startsWith('temp-'));
      if (matchingIds.length > 0) {
        await supabase
          .from('progress_matrix')
          .update({ is_current_homework: false, status: 'IN_PROGRESS' })
          .in('id', matchingIds);
      }

      setProgressItems(prev => prev.map(item => {
        if (item.topic_name && item.topic_name.startsWith(`${bookTitle} - Seite `)) {
          return { ...item, is_current_homework: false, status: 'IN_PROGRESS' };
        }
        return item;
      }));

      await fetchProgress();
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error removing book homework:', e);
    }
  };

  const handleRemoveSongHomework = async (songItemOrSkill: any) => {
    try {
      const canonicalKey = getCanonicalSongKey(songItemOrSkill);
      const matchingSkill = activeSongSkills.find(s => isSongMatch(s, songItemOrSkill));
      const skillId = matchingSkill?.id || songItemOrSkill?.id;

      // 1. LocalStorage update
      try {
        if (student?.id) {
          if (skillId) localStorage.setItem(`song_hw_${student.id}_${skillId}`, 'false');
          if (matchingSkill?.id) localStorage.setItem(`song_hw_${student.id}_${matchingSkill.id}`, 'false');
          if (matchingSkill?.song_id) localStorage.setItem(`song_hw_${student.id}_${matchingSkill.song_id}`, 'false');
        }
      } catch (e) {}

      // 2. Database update: update all matching progress_matrix entries
      const matchingItems = progressItems.filter(item => isSongMatch(item, songItemOrSkill));
      const matchingIds = matchingItems.map(i => i.id).filter(id => id && !String(id).startsWith('temp-'));

      if (matchingIds.length > 0) {
        await supabase
          .from('progress_matrix')
          .update({ is_current_homework: false, status: 'IN_PROGRESS' })
          .in('id', matchingIds);
      }

      // 3. Optimistic local state update
      if (selectedActiveSongId && matchingSkill && (selectedActiveSongId === matchingSkill.id || selectedActiveSongId === matchingSkill.song_id)) {
        setIsCurrentHomework(false);
        setStatus('IN_PROGRESS');
      }

      setProgressItems(prev => prev.map(item => {
        if (isSongMatch(item, songItemOrSkill)) {
          return { ...item, is_current_homework: false, status: 'IN_PROGRESS' };
        }
        return item;
      }));

      await fetchProgress();
      await loadActiveSongSkills();
      notifyHomeworkChange();
    } catch (err) {
      console.error('Error removing song homework:', err);
    }
  };

  const handleRemoveHomeworkItem = async (itemId: string, bookTitle?: string, pageNum?: number) => {
    try {
      if (bookTitle && pageNum !== undefined) {
        await handleRemoveSinglePageHomework(bookTitle, pageNum);
        return;
      }
      const item = progressItems.find(i => i.id === itemId);
      if (item) {
        await handleRemoveSongHomework(item);
        return;
      }

      const { error } = await supabase
        .from('progress_matrix')
        .update({ is_current_homework: false, status: 'IN_PROGRESS' })
        .eq('id', itemId);

      if (error) throw error;

      await fetchProgress();
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error removing homework item:', e);
    }
  };

  const handleMasterSongDirect = async (songItemOrSkill: any) => {
    try {
      const matchingSkill = activeSongSkills.find(s => isSongMatch(s, songItemOrSkill));
      const skillId = matchingSkill?.id || songItemOrSkill?.id;

      try {
        if (student?.id) {
          if (skillId) localStorage.setItem(`song_hw_${student.id}_${skillId}`, 'false');
          if (matchingSkill?.id) localStorage.setItem(`song_hw_${student.id}_${matchingSkill.id}`, 'false');
          if (matchingSkill?.song_id) localStorage.setItem(`song_hw_${student.id}_${matchingSkill.song_id}`, 'false');
        }
      } catch (e) {}

      const matchingItems = progressItems.filter(item => isSongMatch(item, songItemOrSkill));
      const matchingIds = matchingItems.map(i => i.id).filter(id => id && !String(id).startsWith('temp-'));

      if (matchingIds.length > 0) {
        await supabase
          .from('progress_matrix')
          .update({ is_current_homework: false, status: 'MASTERED', updated_at: new Date().toISOString() })
          .in('id', matchingIds);
      }

      if (selectedActiveSongId && matchingSkill && (selectedActiveSongId === matchingSkill.id || selectedActiveSongId === matchingSkill.song_id)) {
        setIsCurrentHomework(false);
        setStatus('MASTERED');
      }

      setProgressItems(prev => prev.map(item => {
        if (isSongMatch(item, songItemOrSkill)) {
          return { ...item, is_current_homework: false, status: 'MASTERED' };
        }
        return item;
      }));

      setShowMatchConfetti(true);
      setTimeout(() => setShowMatchConfetti(false), 3500);

      await fetchProgress();
      await loadActiveSongSkills();
      notifyHomeworkChange();
    } catch (err) {
      console.error('Error mastering song homework:', err);
    }
  };

  const handleReactivateSongDirect = async (songItemOrSkill: any, targetWeekIso?: string) => {
    try {
      const matchingSkill = activeSongSkills.find(s => isSongMatch(s, songItemOrSkill));
      const skillId = matchingSkill?.id || songItemOrSkill?.id;

      try {
        if (student?.id) {
          if (skillId) localStorage.setItem(`song_hw_${student.id}_${skillId}`, 'true');
          if (matchingSkill?.id) localStorage.setItem(`song_hw_${student.id}_${matchingSkill.id}`, 'true');
          if (matchingSkill?.song_id) localStorage.setItem(`song_hw_${student.id}_${matchingSkill.song_id}`, 'true');
        }
      } catch (e) {}

      const targetIso = targetWeekIso || getTargetWeekIso(viewingWeekOffset);
      const songTopic = songItemOrSkill.topic_name || getNormalizedSongTitle(songItemOrSkill);
      const activeTId = await getCurrentTeacherId();

      const existingInTargetWeek = progressItems.find(item => 
        isSongMatch(item, songItemOrSkill) && 
        item.updated_at && 
        getISOWeek(item.updated_at) === targetIso
      );

      if (existingInTargetWeek?.id && !String(existingInTargetWeek.id).startsWith('temp-')) {
        await supabase
          .from('progress_matrix')
          .update({ is_current_homework: true, status: 'IN_PROGRESS', updated_at: new Date().toISOString() })
          .eq('id', existingInTargetWeek.id);
      } else {
        // ECHTE KOPIE: Neuer Datensatz für Zielwoche einfügen
        await supabase
          .from('progress_matrix')
          .insert({
            student_id: student.id,
            teacher_id: activeTId,
            topic_name: songTopic,
            status: 'IN_PROGRESS',
            is_current_homework: true,
            homework_notes: songItemOrSkill.homework_notes || '',
            teacher_notes: '',
            updated_at: new Date().toISOString()
          });
      }

      // Historische Vorwochen-Datensätze behalten ihr original updated_at (KEIN Überschreiben des Zeitstempels!)
      const pastMatching = progressItems.filter(item => 
        isSongMatch(item, songItemOrSkill) && 
        item.updated_at && 
        getISOWeek(item.updated_at) !== targetIso && 
        item.is_current_homework
      );
      const pastIds = pastMatching.map(i => i.id).filter(id => id && !String(id).startsWith('temp-'));
      if (pastIds.length > 0) {
        await supabase.from('progress_matrix').update({ is_current_homework: false }).in('id', pastIds);
      }

      if (selectedActiveSongId && matchingSkill && (selectedActiveSongId === matchingSkill.id || selectedActiveSongId === matchingSkill.song_id)) {
        setIsCurrentHomework(true);
        setStatus('IN_PROGRESS');
      }

      setProgressItems(prev => prev.map(item => {
        if (isSongMatch(item, songItemOrSkill)) {
          return { ...item, is_current_homework: true, status: 'IN_PROGRESS' };
        }
        return item;
      }));

      await fetchProgress();
      await loadActiveSongSkills();
      notifyHomeworkChange();
    } catch (err) {
      console.error('Error reactivating song homework:', err);
    }
  };

  const handleMasterBookDirect = async (bookTitle: string) => {
    try {
      const book = globalLehrwerke.find(b => b.title === bookTitle);
      if (book) {
        const stored = localStorage.getItem('student_lehrwerke_progress');
        const parsed = stored ? JSON.parse(stored) : [];
        
        const updated = parsed.map((item: any) => {
          if (item.studentId === student.id && item.lehrwerkId === book.id) {
            const pageStates = { ...item.pageStates };
            Object.keys(pageStates).forEach(pKey => {
              if (pageStates[pKey]?.status === 'homework' || pageStates[pKey]?.isCurrentHomework) {
                pageStates[pKey] = {
                  ...pageStates[pKey],
                  status: 'mastered',
                  isCurrentHomework: false,
                  updatedAt: new Date().toISOString()
                };
              }
            });
            return { ...item, pageStates };
          }
          return item;
        });
        
        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
        setAssignedLehrwerke(updated.filter((item: any) => item.studentId === student.id));
        loadLehrwerke();
      }

      const matchingItems = progressItems.filter(item => item.topic_name && item.topic_name.startsWith(`${bookTitle} - Seite `));
      const matchingIds = matchingItems.map(i => i.id).filter(id => id && !String(id).startsWith('temp-'));
      if (matchingIds.length > 0) {
        await supabase
          .from('progress_matrix')
          .update({ is_current_homework: false, status: 'MASTERED', updated_at: new Date().toISOString() })
          .in('id', matchingIds);
      }

      setProgressItems(prev => prev.map(item => {
        if (item.topic_name && item.topic_name.startsWith(`${bookTitle} - Seite `)) {
          return { ...item, is_current_homework: false, status: 'MASTERED' };
        }
        return item;
      }));

      setShowMatchConfetti(true);
      setTimeout(() => setShowMatchConfetti(false), 3500);

      await fetchProgress();
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error mastering book homework:', e);
    }
  };

  const handleReactivateBookDirect = async (bookTitle: string, targetWeekIso?: string) => {
    try {
      const book = globalLehrwerke.find(b => b.title === bookTitle);
      if (book) {
        const stored = localStorage.getItem('student_lehrwerke_progress');
        const parsed = stored ? JSON.parse(stored) : [];
        
        const updated = parsed.map((item: any) => {
          if (item.studentId === student.id && item.lehrwerkId === book.id) {
            const pageStates = { ...item.pageStates };
            Object.keys(pageStates).forEach(pKey => {
              pageStates[pKey] = {
                ...pageStates[pKey],
                status: 'homework',
                isCurrentHomework: true,
                updatedAt: new Date().toISOString()
              };
            });
            return { ...item, pageStates };
          }
          return item;
        });
        
        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
        setAssignedLehrwerke(updated.filter((item: any) => item.studentId === student.id));
        loadLehrwerke();
      }

      const targetIso = targetWeekIso || getTargetWeekIso(viewingWeekOffset);
      const activeTId = await getCurrentTeacherId();

      const matchingItems = progressItems.filter(item => item.topic_name && item.topic_name.startsWith(`${bookTitle} - Seite `));
      const targetItems = matchingItems.filter(item => item.updated_at && getISOWeek(item.updated_at) === targetIso);
      const targetIds = targetItems.map(i => i.id).filter(id => id && !String(id).startsWith('temp-'));

      if (targetIds.length > 0) {
        await supabase
          .from('progress_matrix')
          .update({ is_current_homework: true, status: 'IN_PROGRESS', updated_at: new Date().toISOString() })
          .in('id', targetIds);
      } else {
        const pagesToCopy = matchingItems.map(item => {
          const parts = item.topic_name.split(' - Seite ');
          return parts[1] ? parseInt(parts[1], 10) : NaN;
        }).filter(p => !isNaN(p));
        const uniquePages = Array.from(new Set(pagesToCopy));
        
        for (const pNum of uniquePages) {
          await supabase.from('progress_matrix').insert({
            student_id: student.id,
            teacher_id: activeTId,
            topic_name: `${bookTitle} - Seite ${pNum}`,
            status: 'IN_PROGRESS',
            is_current_homework: true,
            homework_notes: '',
            teacher_notes: '',
            updated_at: new Date().toISOString()
          });
        }
      }

      // Historische Vorwochen-Datensätze behalten ihr original updated_at
      const pastMatching = matchingItems.filter(item => item.updated_at && getISOWeek(item.updated_at) !== targetIso && item.is_current_homework);
      const pastIds = pastMatching.map(i => i.id).filter(id => id && !String(id).startsWith('temp-'));
      if (pastIds.length > 0) {
        await supabase.from('progress_matrix').update({ is_current_homework: false }).in('id', pastIds);
      }

      setProgressItems(prev => prev.map(item => {
        if (item.topic_name && item.topic_name.startsWith(`${bookTitle} - Seite `)) {
          return { ...item, is_current_homework: true, status: 'IN_PROGRESS' };
        }
        return item;
      }));

      await fetchProgress();
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error reactivating book homework:', e);
    }
  };

  const handleMasterSinglePageDirect = async (bookTitle: string, pageNum: number) => {
    try {
      const book = globalLehrwerke.find(b => b.title === bookTitle);
      if (book) {
        const stored = localStorage.getItem('student_lehrwerke_progress');
        const parsed = stored ? JSON.parse(stored) : [];
        
        const updated = parsed.map((item: any) => {
          if (item.studentId === student.id && item.lehrwerkId === book.id) {
            const pageStates = { ...item.pageStates };
            pageStates[pageNum] = {
              ...pageStates[pageNum],
              status: 'mastered',
              isCurrentHomework: false,
              updatedAt: new Date().toISOString()
            };
            return { ...item, pageStates };
          }
          return item;
        });
        
        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
        setAssignedLehrwerke(updated.filter((item: any) => item.studentId === student.id));
        loadLehrwerke();
      }

      const pageTopic = `${bookTitle} - Seite ${pageNum}`;
      const matchingItems = progressItems.filter(item => item.topic_name === pageTopic);
      const matchingIds = matchingItems.map(i => i.id).filter(id => id && !String(id).startsWith('temp-'));
      if (matchingIds.length > 0) {
        await supabase
          .from('progress_matrix')
          .update({ is_current_homework: false, status: 'MASTERED', updated_at: new Date().toISOString() })
          .in('id', matchingIds);
      }

      setProgressItems(prev => prev.map(item => {
        if (item.topic_name === pageTopic) {
          return { ...item, is_current_homework: false, status: 'MASTERED' };
        }
        return item;
      }));

      setShowMatchConfetti(true);
      setTimeout(() => setShowMatchConfetti(false), 3500);

      await fetchProgress();
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error mastering single page:', e);
    }
  };

  const handleReactivateSinglePageDirect = async (bookTitle: string, pageNum: number, targetWeekIso?: string) => {
    try {
      const book = globalLehrwerke.find(b => b.title === bookTitle);
      if (book) {
        const stored = localStorage.getItem('student_lehrwerke_progress');
        const parsed = stored ? JSON.parse(stored) : [];
        
        const updated = parsed.map((item: any) => {
          if (item.studentId === student.id && item.lehrwerkId === book.id) {
            const pageStates = { ...item.pageStates };
            pageStates[pageNum] = {
              ...pageStates[pageNum],
              status: 'homework',
              isCurrentHomework: true,
              updatedAt: new Date().toISOString()
            };
            return { ...item, pageStates };
          }
          return item;
        });
        
        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
        setAssignedLehrwerke(updated.filter((item: any) => item.studentId === student.id));
        loadLehrwerke();
      }

      const targetIso = targetWeekIso || getTargetWeekIso(viewingWeekOffset);
      const pageTopic = `${bookTitle} - Seite ${pageNum}`;
      const activeTId = await getCurrentTeacherId();

      const existingInTargetWeek = progressItems.find(item => 
        item.topic_name === pageTopic && 
        item.updated_at && 
        getISOWeek(item.updated_at) === targetIso
      );

      if (existingInTargetWeek?.id && !String(existingInTargetWeek.id).startsWith('temp-')) {
        await supabase
          .from('progress_matrix')
          .update({ is_current_homework: true, status: 'IN_PROGRESS', updated_at: new Date().toISOString() })
          .eq('id', existingInTargetWeek.id);
      } else {
        // ECHTE KOPIE: Neuer Datensatz für Zielwoche einfügen
        await supabase
          .from('progress_matrix')
          .insert({
            student_id: student.id,
            teacher_id: activeTId,
            topic_name: pageTopic,
            status: 'IN_PROGRESS',
            is_current_homework: true,
            homework_notes: '',
            teacher_notes: '',
            updated_at: new Date().toISOString()
          });
      }

      // Historische Datensätze behalten ihr originales updated_at (KW der Vorwoche bleibt unangetastet!)
      const pastMatching = progressItems.filter(item => 
        item.topic_name === pageTopic && 
        item.updated_at && 
        getISOWeek(item.updated_at) !== targetIso && 
        item.is_current_homework
      );
      const pastIds = pastMatching.map(i => i.id).filter(id => id && !String(id).startsWith('temp-'));
      if (pastIds.length > 0) {
        await supabase.from('progress_matrix').update({ is_current_homework: false }).in('id', pastIds);
      }

      setProgressItems(prev => prev.map(item => {
        if (item.topic_name === pageTopic) {
          return { ...item, is_current_homework: true, status: 'IN_PROGRESS' };
        }
        return item;
      }));

      await fetchProgress();
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error reactivating single page:', e);
    }
  };

  const handleKeepAudioTrack = async (_originalIdx: number, _url?: string) => {
    setShowMatchConfetti(true);
    setTimeout(() => setShowMatchConfetti(false), 2000);
    notifyHomeworkChange();
  };

  const handleHideAudioTrack = async (noteIndexOrUrl: number | string, optionalUrl?: string) => {
    try {
      let targetUrl: string | undefined = typeof noteIndexOrUrl === 'string' ? noteIndexOrUrl : optionalUrl;
      let targetIndex: number = typeof noteIndexOrUrl === 'number' ? noteIndexOrUrl : -1;

      const updatedList = (homeworkNotesList || []).filter((item, idx) => {
        if (targetIndex >= 0 && idx === targetIndex) return false;
        if (targetUrl && typeof item === 'string' && item.includes(targetUrl)) return false;
        return true;
      });

      setHomeworkNotesList(updatedList);

      try {
        localStorage.setItem(`campus_homework_notes_${student.id}`, JSON.stringify(updatedList));
      } catch {}

      if (student?.id) {
        try {
          const currentKw = getISOWeek();
          const { data: currentRows } = await supabase
            .from('progress_matrix')
            .select('id, topic_name, homework_notes')
            .eq('student_id', student.id)
            .like('topic_name', `Hausaufgabe KW %`);

          if (currentRows && currentRows.length > 0) {
            for (const row of currentRows) {
              const rowKw = getISOWeek(row.topic_name.replace('Hausaufgabe KW ', ''));
              if (rowKw === currentKw) {
                await supabase
                  .from('progress_matrix')
                  .update({ homework_notes: updatedList })
                  .eq('id', row.id);
              }
            }
          }
        } catch (dbErr) {
          console.warn('DB update on hide audio note:', dbErr);
        }
      }

      notifyHomeworkChange();
    } catch (e) {
      console.error('Error hiding audio note:', e);
    }
  };

  const handleDeleteNote = async (noteIndexOrUrl: number | string, optionalUrl?: string) => {
    try {
      let targetUrl: string | undefined = typeof noteIndexOrUrl === 'string' ? noteIndexOrUrl : optionalUrl;
      let targetIndex: number = typeof noteIndexOrUrl === 'number' ? noteIndexOrUrl : -1;

      // 1. Locate the note in homeworkNotesList
      let noteToDelete = targetIndex >= 0 ? homeworkNotesList[targetIndex] : undefined;
      if (!noteToDelete && targetUrl) {
        const urlMatch = targetUrl;
        noteToDelete = homeworkNotesList.find(n => typeof n === 'string' && n.includes(urlMatch));
      }
      if (!targetUrl && noteToDelete && typeof noteToDelete === 'string' && noteToDelete.startsWith('AUDIO:')) {
        const parts = noteToDelete.substring(6).split('|');
        targetUrl = parts[0]?.trim();
      }

      // 2. Delete from Supabase Storage if remote
      if (targetUrl && targetUrl.startsWith('http')) {
        const marker = '/storage/v1/object/public/campus-assets/';
        const markerIndex = targetUrl.indexOf(marker);
        if (markerIndex !== -1) {
          const filePath = targetUrl.substring(markerIndex + marker.length);
          console.log('[handleDeleteNote] Removing audio file from storage:', filePath);
          supabase.storage.from('campus-assets').remove([filePath]).catch(err => console.warn('Storage remove warning:', err));
        }
      }

      // 3. Delete from IndexedDB if local blob
      if (targetUrl && (targetUrl.startsWith('campus_blob_') || targetUrl.startsWith('campus_audio_'))) {
        deleteBlob(targetUrl).catch(() => {});
      }

      // 4. Filter from homeworkNotesList by Index, Note String, AND URL
      const updatedList = (homeworkNotesList || []).filter((item, idx) => {
        if (targetIndex >= 0 && idx === targetIndex) return false;
        if (noteToDelete && item === noteToDelete) return false;
        if (targetUrl && typeof item === 'string' && item.includes(targetUrl)) return false;
        return true;
      });

      setHomeworkNotesList(updatedList);

      // 5. Update localStorage campus_homework_notes
      const candidateStudentIds = Array.from(new Set([
        student?.id,
        (student as any)?.student_id,
        (student as any)?.studentId,
        (student as any)?.canonical_uuid,
        (student as any)?.slot_id
      ].filter(Boolean))) as string[];

      candidateStudentIds.forEach(cid => {
        try {
          localStorage.setItem(`campus_homework_notes_${cid}`, JSON.stringify(updatedList));
        } catch {}

        // 6. Filter from campus_junior_recordings (if present)
        const juniorKey = `campus_junior_recordings_${cid}`;
        try {
          const storedJunior = localStorage.getItem(juniorKey);
          if (storedJunior) {
            const parsed = JSON.parse(storedJunior);
            if (Array.isArray(parsed)) {
              const updatedJunior = parsed.filter((r: any) => {
                if (targetUrl && (r.url === targetUrl || r.url?.includes(targetUrl))) return false;
                return true;
              });
              localStorage.setItem(juniorKey, JSON.stringify(updatedJunior));
            }
          }
        } catch {}

        // 6b. Filter from campus_teacher_audio_vault
        const teacherVaultKey = `campus_teacher_audio_vault_${cid}`;
        try {
          const storedVault = localStorage.getItem(teacherVaultKey);
          if (storedVault) {
            const parsedVault = JSON.parse(storedVault);
            if (Array.isArray(parsedVault)) {
              const updatedVault = parsedVault.filter((item: any) => {
                const str = typeof item === 'string' ? item : item?.audioMetaStr || '';
                if (targetUrl && str.includes(targetUrl)) return false;
                if (noteToDelete && str === noteToDelete) return false;
                return true;
              });
              localStorage.setItem(teacherVaultKey, JSON.stringify(updatedVault));
            }
          }
        } catch {}
      });
      setLocalJuniorRecordingsTrigger(prev => prev + 1);

      // 7. Update progressItems and clean ALL progress_matrix rows in Supabase
      if (student?.id) {
        try {
          const { data: allStudentMatrix } = await supabase
            .from('progress_matrix')
            .select('id, homework_notes, recording_url')
            .eq('student_id', student.id);

          if (allStudentMatrix) {
            for (const row of allStudentMatrix) {
              let updatedRowNotes = row.homework_notes;
              let rowRecUrl = row.recording_url;
              let rowChanged = false;

              if (row.homework_notes && (
                (targetUrl && row.homework_notes.includes(targetUrl)) ||
                (noteToDelete && row.homework_notes.includes(noteToDelete))
              )) {
                rowChanged = true;
                if (row.homework_notes.startsWith('[') && row.homework_notes.endsWith(']')) {
                  try {
                    const parsed = JSON.parse(row.homework_notes);
                    if (Array.isArray(parsed)) {
                      const filtered = parsed.filter((n: string) => {
                        if (typeof n !== 'string') return true;
                        if (targetUrl && n.includes(targetUrl)) return false;
                        if (noteToDelete && n === noteToDelete) return false;
                        return true;
                      });
                      updatedRowNotes = JSON.stringify(filtered);
                    }
                  } catch {}
                } else if (targetUrl) {
                  updatedRowNotes = updatedRowNotes.replace(new RegExp(`AUDIO:${targetUrl}[^\\s,"]*`, 'g'), '').trim();
                }
              }

              if (rowRecUrl && targetUrl && rowRecUrl === targetUrl) {
                rowChanged = true;
                rowRecUrl = null;
              }

              if (rowChanged) {
                await supabase
                  .from('progress_matrix')
                  .update({ homework_notes: updatedRowNotes, recording_url: rowRecUrl, updated_at: new Date().toISOString() })
                  .eq('id', row.id);
              }
            }
          }
        } catch (cleanErr) {
          console.warn('[handleDeleteNote] Error cleaning matrix rows:', cleanErr);
        }
      }

      setProgressItems(prev => prev.map(p => {
        let notesStr = p.homework_notes ? String(p.homework_notes) : '';
        let hasChange = false;
        if (targetUrl && notesStr.includes(targetUrl)) {
          notesStr = notesStr.replace(new RegExp(`AUDIO:${targetUrl}[^\\s,"]*`, 'g'), '').trim();
          hasChange = true;
        }
        const pRecUrl = (p as any).recording_url;
        if (pRecUrl && targetUrl && pRecUrl === targetUrl) {
          hasChange = true;
          (p as any).recording_url = null;
        }
        if (hasChange) {
          return { ...p, homework_notes: notesStr };
        }
        return p;
      }));

      // 8. Sync with database
      await syncHomeworkNotes(updatedList);
      await fetchProgress();
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error deleting note:', e);
    }
  };

  const handleRenameTeacherAudio = async (url: string, newTitle: string, originalIdx?: number) => {
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) return;

    try {
      let targetIdx = originalIdx;
      if (targetIdx === undefined || targetIdx < 0 || !homeworkNotesList[targetIdx]?.includes(url)) {
        targetIdx = homeworkNotesList.findIndex(n => typeof n === 'string' && n.startsWith('AUDIO:') && n.includes(url));
      }

      let originalNote = '';
      let updatedNote = '';

      if (targetIdx >= 0 && homeworkNotesList[targetIdx]) {
        originalNote = homeworkNotesList[targetIdx];
        const parts = originalNote.substring(6).split('|');
        parts[3] = trimmedTitle;
        while (parts.length < 8) parts.push('');
        parts[8] = 'custom';
        updatedNote = `AUDIO:${parts.join('|')}`;

        const updatedList = [...homeworkNotesList];
        updatedList[targetIdx] = updatedNote;
        setHomeworkNotesList(updatedList);

        try {
          localStorage.setItem(`campus_homework_notes_${student.id}`, JSON.stringify(updatedList));
        } catch {}

        await syncHomeworkNotes(updatedList);
        notifyHomeworkChange();
      }

      if (student?.id && originalNote && updatedNote) {
        try {
          const { data: allStudentMatrix } = await supabase
            .from('progress_matrix')
            .select('id, homework_notes')
            .eq('student_id', student.id);

          if (allStudentMatrix) {
            for (const row of allStudentMatrix) {
              if (row.homework_notes && row.homework_notes.includes(originalNote)) {
                const updatedRowNotes = row.homework_notes.replace(originalNote, updatedNote);
                await supabase
                  .from('progress_matrix')
                  .update({ homework_notes: updatedRowNotes, updated_at: new Date().toISOString() })
                  .eq('id', row.id);
              }
            }
          }
        } catch (mErr) {
          console.warn('[handleRenameTeacherAudio] Error updating matrix rows:', mErr);
        }

        setProgressItems(prev => prev.map(p => {
          let notesStr = p.homework_notes ? String(p.homework_notes) : '';
          if (notesStr && notesStr.includes(originalNote)) {
            return { ...p, homework_notes: notesStr.replace(originalNote, updatedNote) };
          }
          return p;
        }));
      }

      const juniorKey = `campus_junior_recordings_${student.id}`;
      try {
        const storedJunior = localStorage.getItem(juniorKey);
        if (storedJunior) {
          const parsed = JSON.parse(storedJunior);
          if (Array.isArray(parsed)) {
            let modified = false;
            const updatedJunior = parsed.map((r: any) => {
              if (url && (r.url === url || r.url?.includes(url))) {
                modified = true;
                return { ...r, title: trimmedTitle, label: trimmedTitle, isCustomTitle: true };
              }
              return r;
            });
            if (modified) {
              localStorage.setItem(juniorKey, JSON.stringify(updatedJunior));
              setLocalJuniorRecordingsTrigger(prev => prev + 1);
            }
          }
        }
      } catch {}
    } catch (err) {
      console.warn('[handleRenameTeacherAudio] Error:', err);
    }
  };

  const handleSaveEditedTeacherAudio = async (
    result: { url: string; original_url?: string; duration: number; original_duration?: number; label: string; mode: 'overwrite' | 'duplicate' },
    originalIdx?: number,
    currentUrl?: string
  ) => {
    try {
      const candidateStudentIds = Array.from(new Set([
        student?.id,
        (student as any)?.student_id,
        (student as any)?.studentId,
        (student as any)?.canonical_uuid,
        (student as any)?.slot_id
      ].filter(Boolean))) as string[];

      let targetIdx = originalIdx;
      if (targetIdx === undefined || targetIdx < 0 || (currentUrl && !homeworkNotesList[targetIdx]?.includes(currentUrl))) {
        targetIdx = homeworkNotesList.findIndex(n => typeof n === 'string' && n.startsWith('AUDIO:') && (currentUrl ? n.includes(currentUrl) : false));
      }

      let originalNote = '';
      let updatedNote = '';
      const list = [...(homeworkNotesList || [])];

      if (targetIdx >= 0 && list[targetIdx]) {
        originalNote = list[targetIdx];
      } else if (currentUrl) {
        // Search in progressItems
        for (const p of (progressItems || [])) {
          if (p.homework_notes && typeof p.homework_notes === 'string' && p.homework_notes.includes(currentUrl)) {
            const chunks = p.homework_notes.split('AUDIO:');
            for (const chunk of chunks) {
              if (chunk && chunk.includes(currentUrl)) {
                const firstDelim = chunk.search(/[\n\r"\]]/);
                const audioContent = firstDelim !== -1 ? chunk.substring(0, firstDelim) : chunk;
                originalNote = 'AUDIO:' + audioContent.trim();
                break;
              }
            }
          }
          if (originalNote) break;
        }

        // Also search in candidate localStorage vaults if not found in progressItems
        if (!originalNote) {
          for (const cid of candidateStudentIds) {
            const vaultRaw = localStorage.getItem(`campus_teacher_audio_vault_${cid}`) || localStorage.getItem(`campus_homework_notes_${cid}`);
            if (vaultRaw && vaultRaw.includes(currentUrl)) {
              const chunks = vaultRaw.split('AUDIO:');
              for (const chunk of chunks) {
                if (chunk && chunk.includes(currentUrl)) {
                  const firstDelim = chunk.search(/[\n\r"\]]/);
                  const audioContent = firstDelim !== -1 ? chunk.substring(0, firstDelim) : chunk;
                  originalNote = 'AUDIO:' + audioContent.trim();
                  break;
                }
              }
            }
            if (originalNote) break;
          }
        }
      }

      if (originalNote) {
        const parts = originalNote.substring(6).split('|');
        const masterOrigUrl = parts[9]?.trim() || parts[0]?.trim() || result.original_url || '';
        const masterOrigDur = parts[10]?.trim() || parts[1]?.trim() || String(result.original_duration || result.duration || 0);

        const newParts = [...parts];
        while (newParts.length < 11) newParts.push('');
        newParts[0] = result.url;
        newParts[1] = String(result.duration);
        newParts[2] = new Date().toISOString();
        newParts[3] = result.label.trim() || newParts[3];
        newParts[8] = 'custom';
        newParts[9] = masterOrigUrl;
        newParts[10] = masterOrigDur;

        updatedNote = `AUDIO:${newParts.join('|')}`;

        if (targetIdx >= 0) {
          if (result.mode === 'overwrite') {
            list[targetIdx] = updatedNote;
          } else {
            list.push(updatedNote);
          }
        }
      } else {
        const masterOrigUrl = result.original_url || currentUrl || result.url;
        const masterOrigDur = String(result.original_duration || result.duration || 0);
        updatedNote = `AUDIO:${result.url}|${result.duration}|${new Date().toISOString()}|${result.label}|teacher|shared_with_teacher|rec-${Date.now()}||custom|${masterOrigUrl}|${masterOrigDur}`;
        list.push(updatedNote);
      }

      setHomeworkNotesList(list);

      candidateStudentIds.forEach(cid => {
        try {
          const hwRaw = localStorage.getItem(`campus_homework_notes_${cid}`);
          if (hwRaw && originalNote && updatedNote && result.mode === 'overwrite' && hwRaw.includes(originalNote)) {
            localStorage.setItem(`campus_homework_notes_${cid}`, hwRaw.replace(originalNote, updatedNote));
          } else if (cid === student?.id) {
            localStorage.setItem(`campus_homework_notes_${cid}`, JSON.stringify(list));
          }

          const vaultRaw = localStorage.getItem(`campus_teacher_audio_vault_${cid}`);
          if (vaultRaw && originalNote && updatedNote && result.mode === 'overwrite' && vaultRaw.includes(originalNote)) {
            localStorage.setItem(`campus_teacher_audio_vault_${cid}`, vaultRaw.replace(originalNote, updatedNote));
          }
        } catch {}
      });

      await syncHomeworkNotes(list);
      notifyHomeworkChange();

      if (student?.id && originalNote && updatedNote && result.mode === 'overwrite') {
        try {
          const { data: allStudentMatrix } = await supabase
            .from('progress_matrix')
            .select('id, homework_notes')
            .in('student_id', candidateStudentIds);

          if (allStudentMatrix) {
            for (const row of allStudentMatrix) {
              if (row.homework_notes && row.homework_notes.includes(originalNote)) {
                const updatedRowNotes = row.homework_notes.replace(originalNote, updatedNote);
                await supabase
                  .from('progress_matrix')
                  .update({ homework_notes: updatedRowNotes, updated_at: new Date().toISOString() })
                  .eq('id', row.id);
              }
            }
          }
        } catch (mErr) {
          console.warn('[handleSaveEditedTeacherAudio] Error updating matrix rows:', mErr);
        }

        setProgressItems(prev => prev.map(p => {
          let notesStr = p.homework_notes ? String(p.homework_notes) : '';
          if (notesStr && notesStr.includes(originalNote)) {
            return { ...p, homework_notes: notesStr.replace(originalNote, updatedNote) };
          }
          return p;
        }));
      }
    } catch (err) {
      console.warn('[handleSaveEditedTeacherAudio] Error:', err);
    }
  };

  const handleRevertTeacherAudioToOriginal = async (originalIdx?: number, currentUrl?: string) => {
    try {
      const candidateStudentIds = Array.from(new Set([
        student?.id,
        (student as any)?.student_id,
        (student as any)?.studentId,
        (student as any)?.canonical_uuid,
        (student as any)?.slot_id
      ].filter(Boolean))) as string[];

      let targetIdx = originalIdx;
      if (targetIdx === undefined || targetIdx < 0 || (currentUrl && !homeworkNotesList[targetIdx]?.includes(currentUrl))) {
        targetIdx = homeworkNotesList.findIndex(n => typeof n === 'string' && n.startsWith('AUDIO:') && (currentUrl ? n.includes(currentUrl) : false));
      }

      if (targetIdx < 0 || !homeworkNotesList[targetIdx]) return;
      const originalNote = homeworkNotesList[targetIdx];
      const parts = originalNote.substring(6).split('|');
      const masterOrigUrl = parts[9]?.trim();
      const masterOrigDur = parts[10]?.trim() || '0';
      if (!masterOrigUrl) return;

      const newParts = [...parts];
      newParts[0] = masterOrigUrl;
      newParts[1] = masterOrigDur;
      newParts.splice(9, 2);
      const updatedNote = `AUDIO:${newParts.join('|')}`;

      const list = [...homeworkNotesList];
      list[targetIdx] = updatedNote;
      setHomeworkNotesList(list);

      candidateStudentIds.forEach(cid => {
        try {
          const hwRaw = localStorage.getItem(`campus_homework_notes_${cid}`);
          if (hwRaw && hwRaw.includes(originalNote)) {
            localStorage.setItem(`campus_homework_notes_${cid}`, hwRaw.replace(originalNote, updatedNote));
          } else if (cid === student?.id) {
            localStorage.setItem(`campus_homework_notes_${cid}`, JSON.stringify(list));
          }

          const vaultRaw = localStorage.getItem(`campus_teacher_audio_vault_${cid}`);
          if (vaultRaw && vaultRaw.includes(originalNote)) {
            localStorage.setItem(`campus_teacher_audio_vault_${cid}`, vaultRaw.replace(originalNote, updatedNote));
          }
        } catch {}
      });

      await syncHomeworkNotes(list);
      notifyHomeworkChange();

      if (student?.id && originalNote && updatedNote) {
        try {
          const { data: allStudentMatrix } = await supabase
            .from('progress_matrix')
            .select('id, homework_notes')
            .in('student_id', candidateStudentIds);

          if (allStudentMatrix) {
            for (const row of allStudentMatrix) {
              if (row.homework_notes && row.homework_notes.includes(originalNote)) {
                const updatedRowNotes = row.homework_notes.replace(originalNote, updatedNote);
                await supabase
                  .from('progress_matrix')
                  .update({ homework_notes: updatedRowNotes, updated_at: new Date().toISOString() })
                  .eq('id', row.id);
              }
            }
          }
        } catch (mErr) {
          console.warn('[handleRevertTeacherAudioToOriginal] Error updating matrix rows:', mErr);
        }

        setProgressItems(prev => prev.map(p => {
          let notesStr = p.homework_notes ? String(p.homework_notes) : '';
          if (notesStr && notesStr.includes(originalNote)) {
            return { ...p, homework_notes: notesStr.replace(originalNote, updatedNote) };
          }
          return p;
        }));
      }
    } catch (err) {
      console.warn('[handleRevertTeacherAudioToOriginal] Error:', err);
    }
  };

  const handleRenameStudentAudio = (url: string, newTitle: string, id?: string) => {
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) return;

    try {
      const juniorKey = `campus_junior_recordings_${student.id}`;
      const storedJunior = localStorage.getItem(juniorKey);
      if (storedJunior) {
        const parsed = JSON.parse(storedJunior);
        if (Array.isArray(parsed)) {
          let modified = false;
          const updatedJunior = parsed.map((r: any) => {
            if ((id && r.id === id) || (url && (r.url === url || r.url?.includes(url)))) {
              modified = true;
              return {
                ...r,
                title: trimmedTitle,
                label: trimmedTitle,
                isCustomTitle: true
              };
            }
            return r;
          });
          if (modified) {
            localStorage.setItem(juniorKey, JSON.stringify(updatedJunior));
            setLocalJuniorRecordingsTrigger(prev => prev + 1);
          }
        }
      }
    } catch (err) {
      console.warn('[handleRenameStudentAudio] Error:', err);
    }
  };

  const handleDeleteStudentAudio = async (targetUrl: string, targetId?: string, audMeta?: any) => {
    try {
      const candidateStudentIds = Array.from(new Set([
        student?.id,
        (student as any)?.student_id,
        (student as any)?.studentId,
        (student as any)?.canonical_uuid,
        (student as any)?.slot_id,
        'current'
      ].filter(Boolean))) as string[];

      const matchesTarget = (r: any) => {
        if (!r) return false;
        if (targetId && r.id && String(r.id) === String(targetId)) return true;
        if (targetUrl && r.url && (r.url === targetUrl || r.url.includes(targetUrl) || targetUrl.includes(r.url))) return true;
        if (audMeta?.blobKey && (r.blobKey === audMeta.blobKey || r.url === audMeta.blobKey)) return true;
        if (r.blobKey && (r.blobKey === targetUrl || (targetId && r.blobKey.includes(targetId)))) return true;
        if (audMeta?.original_url && (r.url === audMeta.original_url || r.original_url === audMeta.original_url)) return true;
        if (audMeta?.date && r.date === audMeta.date && (r.title === audMeta.label || r.label === audMeta.label || r.harmonizedTitle === audMeta.label)) return true;
        return false;
      };

      // 1. Delete across all candidate student IDs (junior recordings & audio biography)
      candidateStudentIds.forEach(cid => {
        const juniorKey = `campus_junior_recordings_${cid}`;
        try {
          const stored = localStorage.getItem(juniorKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              const filtered = parsed.filter(r => !matchesTarget(r));
              localStorage.setItem(juniorKey, JSON.stringify(filtered));
            }
          }
        } catch {}

        const bioKey = `campus_audio_biography_${cid}`;
        try {
          const storedBio = localStorage.getItem(bioKey);
          if (storedBio) {
            const parsedBio = JSON.parse(storedBio);
            if (Array.isArray(parsedBio)) {
              const filteredBio = parsedBio.filter(r => !matchesTarget(r));
              localStorage.setItem(bioKey, JSON.stringify(filteredBio));
            }
          }
        } catch {}
      });

      // 2. Remove binary from local IndexedDB if local blobKey exists
      if (targetUrl && (targetUrl.startsWith('campus_blob_') || targetUrl.startsWith('campus_audio_'))) {
        deleteBlob(targetUrl).catch(() => {});
      }
      if (audMeta?.blobKey) {
        deleteBlob(audMeta.blobKey).catch(() => {});
      }
      if (targetId) {
        deleteBlob(`campus_audio_${targetId}_raw`).catch(() => {});
        deleteBlob(`campus_audio_${targetId}_master`).catch(() => {});
      }

      // 3. Remove remote binary from Supabase Storage if uploaded
      const effectiveUrl = targetUrl || audMeta?.url;
      if (effectiveUrl && effectiveUrl.includes('campus-assets/')) {
        const parts = effectiveUrl.split('campus-assets/');
        if (parts[1]) {
          supabase.storage.from('campus-assets').remove([parts[1]]).catch(() => {});
        }
      }

      // 4. Remove from progress_matrix if present
      if (student?.id) {
        try {
          if (targetId) {
            await supabase.from('progress_matrix').delete().eq('id', targetId);
          }
          if (effectiveUrl && effectiveUrl.startsWith('http')) {
            await supabase.from('progress_matrix').delete().eq('recording_url', effectiveUrl);
          }
        } catch {}
      }

      // 5. Trigger live cross-tab and component sync
      setLocalJuniorRecordingsTrigger(prev => prev + 1);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('campus_junior_recordings_updated'));
      }
    } catch (err) {
      console.warn('[handleDeleteStudentAudio] Error deleting student audio:', err);
    }
  };


  const handleDeletePageNote = async (bookTitle: string, pageNum: number) => {
    try {
      const book = globalLehrwerke.find(b => b.title === bookTitle);
      if (!book) return;

      const stored = localStorage.getItem('student_lehrwerke_progress');
      if (stored) {
        const parsed = JSON.parse(stored);
        const updated = parsed.map((item: any) => {
          if (item.studentId === student.id && item.lehrwerkId === book.id) {
            const pageStates = { ...item.pageStates };
            if (pageStates[pageNum]) {
              pageStates[pageNum] = {
                ...pageStates[pageNum],
                homeworkNotes: '',
                homework_notes: ''
              };
            }
            return { ...item, pageStates };
          }
          return item;
        });
        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
      }

      const currentWeek = getISOWeek();
      const existing = progressItems.find(item => 
        item.topic_name === `${bookTitle} - Seite ${pageNum}` && 
        item.updated_at && 
        getISOWeek(item.updated_at) === currentWeek
      );

      if (existing?.id) {
        const { error } = await supabase
          .from('progress_matrix')
          .update({ homework_notes: '' })
          .eq('id', existing.id);
        if (error) throw error;
      }

      await fetchProgress();
      loadLehrwerke();
      notifyHomeworkChange();
    } catch (err) {
      console.error('Error deleting page note:', err);
    }
  };

  // Didactic Tags definition & styling helper
  const DIDACTIC_TAG_STYLES: Record<string, { bg: string; color: string; border: string; label: string }> = {
    technik: { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', label: '#Technik' },
    rhythmus: { bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe', label: '#Rhythmus' },
    klang: { bg: '#e6f4ea', color: '#166534', border: '#bbf7d0', label: '#Klang' },
    intonation: { bg: '#e6f4ea', color: '#166534', border: '#bbf7d0', label: '#Klang' },
    ausdruck: { bg: '#f3e8ff', color: '#6b21a8', border: '#e9d5ff', label: '#Ausdruck' },
    repertoire: { bg: '#fef9c3', color: '#854d0e', border: '#fef08a', label: '#Repertoire' },
    theorie: { bg: '#fef3c7', color: '#b45309', border: '#fde68a', label: '#Theorie' },
    konzert: { bg: '#ffedd5', color: '#9a3412', border: '#fed7aa', label: '#Konzert' },
    hausaufgabe: { bg: '#e6f4ea', color: '#166534', border: '#bbf7d0', label: '#Hausaufgabe' },
    wichtig: { bg: '#ffe4e6', color: '#9f1239', border: '#fecdd3', label: '#Wichtig' }
  };

  const getDidacticTagStyle = (tag: string) => {
    const clean = tag.replace(/^#/, '').toLowerCase();
    return DIDACTIC_TAG_STYLES[clean] || { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', label: `#${clean}` };
  };

  const DIDACTIC_QUICK_TAGS = [
    { tag: '#Technik', desc: 'Motorik & Handhaltung', color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe', skillKey: 'technik' },
    { tag: '#Rhythmus', desc: 'Metronom & Timing', color: '#4338ca', bg: '#e0e7ff', border: '#c7d2fe', skillKey: 'rhythmus' },
    { tag: '#Klang', desc: 'Tonkultur & Sauberkeit', color: '#166534', bg: '#e6f4ea', border: '#bbf7d0', skillKey: 'intonation' },
    { tag: '#Ausdruck', desc: 'Dynamik & Phrasierung', color: '#6b21a8', bg: '#f3e8ff', border: '#e9d5ff', skillKey: 'ausdruck' },
    { tag: '#Repertoire', desc: 'Songs & Stücke', color: '#854d0e', bg: '#fef9c3', border: '#fef08a', skillKey: 'repertoire' },
    { tag: '#Theorie', desc: 'Noten & Harmonielehre', color: '#b45309', bg: '#fef3c7', border: '#fde68a', skillKey: 'theorie' },
    { tag: '#Wichtig', desc: 'Wichtiger Hinweis', color: '#9f1239', bg: '#ffe4e6', border: '#fecdd3' },
    { tag: '#Konzert', desc: 'Vorspiel & Bühne', color: '#9a3412', bg: '#ffedd5', border: '#fed7aa' }
  ];

  // Helper to render text with highlighted Smart Badges
  const renderTextWithDidacticBadges = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(#[a-zA-ZäöüÄÖÜß_-]+)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith('#')) {
        const style = getDidacticTagStyle(part);
        return (
          <span
            key={`tag-badge-${pIdx}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              padding: '1px 6px',
              borderRadius: '4px',
              fontSize: '0.70rem',
              fontWeight: 800,
              background: style.bg,
              color: style.color,
              border: `1px solid ${style.border}`,
              margin: '0 3px',
              verticalAlign: 'baseline'
            }}
          >
            <Hash size={9} strokeWidth={2.6} />
            <span>{part.replace(/^#/, '')}</span>
          </span>
        );
      }
      return <span key={`text-${pIdx}`}>{part}</span>;
    });
  };

  const PRESET_CHIPS: { label: string; text: string; isBpm?: boolean }[] = [
    { label: 'Tempo halten', text: 'Achte auf ein gleichmäßiges Tempo und übe gezielt mit dem Metronom.', isBpm: false },
    { label: 'Sauber spielen', text: 'Spiele diese Stelle besonders sauber, achte auf saubere Töne und klaren Klang.', isBpm: false },
    { label: 'Rhythmus (60 BPM)', text: 'Übe diesen Rhythmus präzise auf den Klick (60 BPM).', isBpm: true },
    { label: 'Fingersatz üben', text: 'Halte dich exakt an den notierten Fingersatz und achte auf eine entspannte Handhaltung.', isBpm: false },
    { label: 'Ausdruck & Dynamik', text: 'Gestalte die Dynamik bewusst (p/f) und bringe Emotion und Gefühl in deinen Ausdruck.', isBpm: false },
    { label: 'Auswendig spielen', text: 'Präge dir diesen Abschnitt auswendig ein und spiele frei ohne Notenblatt.', isBpm: false },
    { label: 'Kontinuität üben', text: 'Übe diese Stelle täglich 10 Minuten für eine hohe Kontinuität und Sicherheit.', isBpm: false },
    { label: 'Selbstständig üben', text: 'Erarbeite dir die nächsten Takte selbstständig und achte auf eigene Fehlerkorrektur.', isBpm: false }
  ];

  const getHomeworkNoteItems = (notesText: string): string[] => {
    if (!notesText || !notesText.trim()) return [];
    return notesText
      .split('\n')
      .map(s => s.replace(/^[•\-\*\s]+/, '').trim())
      .filter(s => s.length > 0 && !isInternalMetadataNote(s));
  };


  const handleDeleteSingleNoteItem = (indexToDelete: number) => {
    const current = latestGeneralHomeworkNotesRef.current !== undefined
      ? latestGeneralHomeworkNotesRef.current
      : generalHomeworkNotes;

    const lines = current.split('\n').map(s => s.trim()).filter(Boolean);
    const updatedLines = lines.filter((_, idx) => idx !== indexToDelete);
    const nextText = updatedLines.join('\n');

    latestGeneralHomeworkNotesRef.current = nextText;
    setGeneralHomeworkNotes(nextText);
    setHomeworkNotes(nextText);

    const specialNotes = (homeworkNotesList || []).filter(n => typeof n === 'string' && isInternalMetadataNote(n));
    const cleanUpdatedLines = updatedLines.filter(s => s.length > 0 && !isInternalMetadataNote(s));
    const combined = [...specialNotes, ...cleanUpdatedLines];
    setHomeworkNotesList(combined);

    try {
      localStorage.setItem(`campus_homework_notes_${student.id}`, JSON.stringify(combined));
      localStorage.setItem(`campus_homework_week_${student.id}`, getISOWeek());
    } catch {}

    syncHomeworkNotes(combined).catch(() => {});
    triggerImmediateAutoSave();
    notifyHomeworkChange();
  };

  const handleTogglePresetChip = (chip: { label: string; text: string; isBpm?: boolean }, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    const current = latestGeneralHomeworkNotesRef.current !== undefined
      ? latestGeneralHomeworkNotesRef.current
      : generalHomeworkNotes;

    let lines = current.split('\n').map(s => s.trim()).filter(Boolean);

    if (chip.isBpm) {
      const bpmIdx = lines.findIndex(l => l.toLowerCase().includes('bpm'));
      if (bpmIdx !== -1) {
        lines.splice(bpmIdx, 1);
      } else {
        lines.push('Übe diesen Rhythmus präzise auf den Klick (60 BPM).');
      }
    } else {
      const foundIdx = lines.findIndex(l => l === chip.text || l.includes(chip.text));
      if (foundIdx !== -1) {
        lines.splice(foundIdx, 1);
      } else {
        lines.push(chip.text);
      }
    }

    const nextText = lines.join('\n');
    latestGeneralHomeworkNotesRef.current = nextText;
    setGeneralHomeworkNotes(nextText);
    studentNotesSelectionRef.current = { start: nextText.length, end: nextText.length };

    const specialNotes = (homeworkNotesList || []).filter(n => typeof n === 'string' && isInternalMetadataNote(n));
    const noteLines = nextText.split('\n').map(s => s.trim()).filter(s => s.length > 0 && !isInternalMetadataNote(s));
    const combined = [...specialNotes, ...noteLines];
    setHomeworkNotesList(combined);

    try {
      localStorage.setItem(`campus_homework_notes_${student.id}`, JSON.stringify(combined));
      localStorage.setItem(`campus_homework_week_${student.id}`, getISOWeek());
    } catch {}

    triggerImmediateAutoSave();
  };

  const handleSetRowTag = (rowIndex: number, tagKey: string | null) => {
    const current = latestGeneralHomeworkNotesRef.current !== undefined
      ? latestGeneralHomeworkNotesRef.current
      : generalHomeworkNotes;

    const lines = current.split('\n').map(s => s.trim()).filter(Boolean);
    if (rowIndex >= lines.length) return;

    let line = lines[rowIndex];

    // Remove any existing didactic tag from this line
    DIDACTIC_QUICK_TAGS.forEach(dt => {
      const escaped = dt.tag.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
      line = line.replace(new RegExp(`\\s*${escaped}`, 'g'), '');
    });
    line = line.trim();

    // If a new tag is selected, append it with a leading space
    if (tagKey) {
      const tagObj = DIDACTIC_QUICK_TAGS.find(dt => dt.tag === tagKey || dt.skillKey === tagKey);
      const tagToAdd = tagObj ? tagObj.tag : (tagKey.startsWith('#') ? tagKey : `#${tagKey}`);
      line = `${line} ${tagToAdd}`;

      if (tagObj?.skillKey) {
        setPendingTargetFocusTags(prev => prev.includes(tagObj.skillKey!) ? prev : [...prev, tagObj.skillKey!]);
      }
    }

    lines[rowIndex] = line;
    const nextText = lines.join('\n');

    latestGeneralHomeworkNotesRef.current = nextText;
    setGeneralHomeworkNotes(nextText);
    studentNotesSelectionRef.current = { start: nextText.length, end: nextText.length };

    const specialNotes = (homeworkNotesList || []).filter(n => typeof n === 'string' && isInternalMetadataNote(n));
    const noteLines = nextText.split('\n').map(s => s.trim()).filter(s => s.length > 0 && !isInternalMetadataNote(s));
    const combined = [...specialNotes, ...noteLines];
    setHomeworkNotesList(combined);

    try {
      localStorage.setItem(`campus_homework_notes_${student.id}`, JSON.stringify(combined));
    } catch {}

    setActiveTagPickerRowIndex(null);
    triggerImmediateAutoSave();
  };

  const insertOrToggleTagInText = (
    currentText: string,
    tag: string,
    selection: { start: number; end: number }
  ): { nextText: string; newCursorPos: number; isActivated: boolean } => {
    // If the tag is already present in the text, clicking it removes it cleanly
    if (currentText.includes(tag)) {
      const escapedTag = tag.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
      const nextText = currentText.replace(new RegExp(`\\s*${escapedTag}`, 'g'), '').trim();
      const newCursorPos = Math.min(selection.start, nextText.length);
      return { nextText, newCursorPos, isActivated: false };
    }

    // Insert tag at exact cursor position
    const len = currentText.length;
    const start = Math.min(Math.max(0, selection.start), len);
    const end = Math.min(Math.max(start, selection.end), len);

    const before = currentText.slice(0, start);
    const after = currentText.slice(end);

    const needsLeadingSpace = before.length > 0 && !/[\s\n]/.test(before.slice(-1));
    const needsTrailingSpace = after.length > 0 && !/[\s\n]/.test(after.slice(0, 1));

    const insertText = `${needsLeadingSpace ? ' ' : ''}${tag}${needsTrailingSpace ? ' ' : ' '}`;
    const nextText = `${before}${insertText}${after}`;
    const newCursorPos = before.length + insertText.length;

    return { nextText, newCursorPos, isActivated: true };
  };

  const handleToggleQuickTag = (t: { tag: string; skillKey?: string }, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    const current = latestGeneralHomeworkNotesRef.current !== undefined
      ? latestGeneralHomeworkNotesRef.current
      : generalHomeworkNotes;

    const { nextText, newCursorPos, isActivated } = insertOrToggleTagInText(
      current,
      t.tag,
      studentNotesSelectionRef.current
    );

    latestGeneralHomeworkNotesRef.current = nextText;
    setGeneralHomeworkNotes(nextText);
    studentNotesSelectionRef.current = { start: newCursorPos, end: newCursorPos };

    const specialNotes = (homeworkNotesList || []).filter(n => typeof n === 'string' && isInternalMetadataNote(n));
    const noteLines = nextText.split('\n').map(s => s.trim()).filter(s => s.length > 0 && !isInternalMetadataNote(s));
    const combined = [...specialNotes, ...noteLines];
    setHomeworkNotesList(combined);

    try {
      localStorage.setItem(`campus_homework_notes_${student.id}`, JSON.stringify(combined));
      localStorage.setItem(`campus_homework_week_${student.id}`, getISOWeek());
    } catch {}

    if (t.skillKey) {
      setPendingTargetFocusTags(prev => {
        if (isActivated) {
          return prev.includes(t.skillKey!) ? prev : [...prev, t.skillKey!];
        } else {
          return prev.filter(k => k !== t.skillKey);
        }
      });
    }

    triggerDebouncedAutoSave(350);

    // Re-focus textarea and place cursor right after the inserted tag
    setTimeout(() => {
      if (studentNotesTextareaRef.current) {
        studentNotesTextareaRef.current.focus();
        try {
          studentNotesTextareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        } catch {}
      }
    }, 10);
  };

  const handleAddNote = async () => {
    if (!homeworkNotes.trim()) return;
    try {
      const newNote = homeworkNotes.trim();
      const updatedList = [...homeworkNotesList, newNote];
      setHomeworkNotesList(updatedList);
      setHomeworkNotes('');

      await syncHomeworkNotes(updatedList);

      await fetchProgress();
      notifyHomeworkChange();
      setIsNotesFocused(false);
    } catch (e) {
      console.error('Error adding note:', e);
    }
  };

  const handleStatusChange = (newStatus: 'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED') => {
    setStatus(newStatus);
  };

  const handleRemoveLehrwerk = async (lehrwerkId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Lehrwerk wirklich entfernen?")) return;
    try {
      const book = globalLehrwerke.find(g => g.id === lehrwerkId);
      if (book && book.title) {
        // Set is_current_homework to false for all pages of this book
        const { error } = await supabase
          .from('progress_matrix')
          .update({ is_current_homework: false })
          .eq('student_id', student.id)
          .like('topic_name', `${book.title} - Seite %`);
        if (error) console.error('Error updating progress matrix:', error);
      }

      if (lehrwerkId.startsWith('custom-') || book?.is_custom) {
        try {
          await supabase
            .from('lehrwerke')
            .delete()
            .eq('id', lehrwerkId);
        } catch (err) {
          console.warn('Error deleting custom lehrwerk from DB:', err);
        }

        const globalStored = localStorage.getItem('campus_lehrwerke');
        if (globalStored) {
          try {
            const parsedGlobal = JSON.parse(globalStored);
            const updatedGlobal = parsedGlobal.filter((b: any) => b.id !== lehrwerkId);
            localStorage.setItem('campus_lehrwerke', JSON.stringify(updatedGlobal));
          } catch (err) {
            console.error(err);
          }
        }
      }

      const stored = localStorage.getItem('student_lehrwerke_progress');
      const parsed = stored ? JSON.parse(stored) : [];
      const updated = parsed.filter((item: any) => !(item.studentId === student.id && item.lehrwerkId === lehrwerkId));
      localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
      await loadLehrwerke();
      if (activeLehrwerkId === lehrwerkId) {
        setActiveLehrwerkId(null);
        setActivePageNumber(null);
      }

      await fetchProgress();
      notifyHomeworkChange();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveSong = async (skillId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Song wirklich aus den aktiven Projekten entfernen?")) return;
    try {
      const { error } = await supabase
        .from('user_song_skills')
        .delete()
        .eq('id', skillId);
      if (error) throw error;
      await loadActiveSongSkills();
      if (selectedActiveSongId === skillId) {
        setSelectedActiveSongId('');
      }
    } catch (err) {
      console.error('Error removing song skill:', err);
      setError('Fehler beim Entfernen des Songs.');
    }
  };

  const handleUndo = async () => {
    if (pageUndoStack.length === 0) return;
    const lastChange = pageUndoStack[pageUndoStack.length - 1];
    setPageUndoStack(prev => prev.slice(0, -1));

    let targetStatus: 'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED' = 'IN_PROGRESS';
    let targetHomework = false;
    
    if (lastChange.prevStatus.status === 'mastered') {
      targetStatus = 'MASTERED';
    } else if (lastChange.prevStatus.status === 'purple') {
      targetStatus = 'THEORY_DONE';
    } else if (lastChange.prevStatus.status === 'homework') {
      targetStatus = 'IN_PROGRESS';
      targetHomework = true;
    }
    
    await triggerDirectSave(lastChange.lehrwerkId, lastChange.pageNum, targetStatus, targetHomework, true);
  };

  // Assign textbook to student inside the modal
  const handleAssignLehrwerk = (lehrwerkId: string) => {
    if (!lehrwerkId) return;
    const book = globalLehrwerke.find(b => String(b.id) === String(lehrwerkId));
    if (!book) return;

    try {
      const stored = localStorage.getItem('student_lehrwerke_progress');
      const parsed = stored ? JSON.parse(stored) : [];
      
      if (parsed.some((item: any) => String(item.studentId) === String(student.id) && String(item.lehrwerkId) === String(lehrwerkId))) {
        return;
      }

      const newAssignment = {
        studentId: student.id,
        lehrwerkId: lehrwerkId,
        bookTitle: book.title,
        lehrwerkTitle: book.title,
        totalPages: book.totalPages || 50,
        assignedAt: new Date().toISOString(),
        visibility: 'private',
        pageStates: {}
      };

      const updated = [...parsed, newAssignment];
      localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
      setAssignedLehrwerke(prev => [...prev.filter(a => String(a.lehrwerkId) !== String(lehrwerkId)), newAssignment]);
      loadLehrwerke();
      setActiveLehrwerkId(lehrwerkId);
      setShowAssignDropdown(false);
    } catch (e) {
      console.error(e);
    }
  };

  const updateLehrwerkVisibility = (lehrwerkId: string, visibility: 'private' | 'read' | 'control') => {
    try {
      const stored = localStorage.getItem('student_lehrwerke_progress');
      const parsed = stored ? JSON.parse(stored) : [];
      const updated = parsed.map((item: any) => {
        if (item.studentId === student.id && item.lehrwerkId === lehrwerkId) {
          return { ...item, visibility };
        }
        return item;
      });
      localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
      setAssignedLehrwerke(updated.filter((item: any) => item.studentId === student.id));
    } catch (e) {
      console.error('Error updating lehrwerk visibility:', e);
    }
  };

  const toggleStudentFocusPage = (lehrwerkId: string, pageNum: number) => {
    try {
      const stored = localStorage.getItem('student_lehrwerke_progress');
      const parsed = stored ? JSON.parse(stored) : [];
      
      let isCurrentlyFocused = false;
      let totalFocusCount = 0;

      parsed.forEach((item: any) => {
        if (item.studentId === student.id && item.lehrwerkId === lehrwerkId) {
          if (item.pageStates?.[pageNum]?.studentFocus) {
            isCurrentlyFocused = true;
          }
          Object.values(item.pageStates || {}).forEach((pState: any) => {
            if (pState?.studentFocus) totalFocusCount++;
          });
        }
      });

      if (!isCurrentlyFocused && totalFocusCount >= 3) {
        alert("🎯 Pädagogischer Fokus: Du kannst maximal 3 Seiten gleichzeitig als deinen Übe-Fokus markieren.\n\nBitte hebe erst die Markierung einer anderen Seite auf, um eine neue zu fokussieren.");
        return;
      }

      const nextFocused = !isCurrentlyFocused;

      const updated = parsed.map((item: any) => {
        if (item.studentId === student.id && item.lehrwerkId === lehrwerkId) {
          const pageStates = { ...item.pageStates };
          const existing = pageStates[pageNum] || { status: 'locked' };
          pageStates[pageNum] = {
            ...existing,
            studentFocus: nextFocused,
            updatedAt: new Date().toISOString()
          };
          return {
            ...item,
            pageStates
          };
        }
        return item;
      });

      localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
      const filtered = updated.filter((item: any) => item.studentId === student.id);
      setAssignedLehrwerke(filtered);
    } catch (e) {
      console.error('Error toggling student focus:', e);
    }
  };

  const handlePageDoubleClick = (lehrwerkId: string, pageNum: number) => {
    const stored = localStorage.getItem('student_lehrwerke_progress');
    const parsed = stored ? JSON.parse(stored) : [];
    const assignedBook = parsed.find((a: any) => a.studentId === student.id && a.lehrwerkId === lehrwerkId);
    const pageState = assignedBook?.pageStates?.[pageNum] || { status: 'locked' };
    const currentStatus = pageState.status || 'locked';

    console.log('handlePageDoubleClick called:', { lehrwerkId, pageNum, currentStatus });
    let targetStatus: 'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED' = 'IN_PROGRESS';
    let targetHomework = false;

    if (currentStatus === 'homework') {
      targetStatus = 'MASTERED';
      targetHomework = false;
    } else if (currentStatus === 'mastered') {
      targetStatus = 'IN_PROGRESS';
      targetHomework = false;
    } else {
      targetStatus = 'IN_PROGRESS';
      targetHomework = true;
    }

    console.log('handlePageDoubleClick saving:', { targetStatus, targetHomework });
    triggerDirectSave(lehrwerkId, pageNum, targetStatus, targetHomework);
    selectTextbookPage(lehrwerkId, pageNum, targetStatus, targetHomework);
  };

  const selectTextbookPage = (
    lehrwerkId: string, 
    pageNum: number, 
    overrideStatus?: 'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED',
    overrideHomework?: boolean
  ) => {
    console.log('selectTextbookPage called:', { lehrwerkId, pageNum, overrideStatus, overrideHomework });
    let book = globalLehrwerke.find(b => b.id === lehrwerkId);
    if (!book) {
      const stored = localStorage.getItem('student_lehrwerke_progress');
      const parsed = stored ? JSON.parse(stored) : [];
      const assigned = parsed.find((a: any) => a.studentId === student.id && a.lehrwerkId === lehrwerkId);
      if (assigned || lehrwerkId.startsWith('custom-')) {
        book = {
          id: lehrwerkId,
          title: assigned?.title || 'Eigenes Lehrwerk',
          totalPages: 50,
          total_pages: 50,
          emoji: '📚',
          color: '#34a853',
          is_custom: true
        };
      } else {
        console.log('selectTextbookPage book not found:', lehrwerkId);
        return;
      }
    }

    setActiveLehrwerkId(lehrwerkId);
    setActivePageNumber(pageNum);
    setActiveInputTab('lehrwerk_page');
    setActiveSubView('lehrwerk');
    
    // Automatically determine which 49-page group this page belongs to
    const calculatedGroup = Math.floor((pageNum - 1) / 49);
    setPageGroupIndex(calculatedGroup);
    
    const stored = localStorage.getItem('student_lehrwerke_progress');
    const parsed = stored ? JSON.parse(stored) : [];
    const assignedBook = parsed.find((a: any) => a.studentId === student.id && a.lehrwerkId === lehrwerkId);
    const pageState = assignedBook?.pageStates?.[pageNum] || { status: 'locked', notes: '', homework_notes: '' };
    console.log('selectTextbookPage pageState loaded:', pageState);
    
    // Look up existing database notes in progressItems
    const topicNameStr = `${book.title} - Seite ${pageNum}`;
    const dbItem = progressItems.find(item => item.topic_name === topicNameStr);
    
    // Auto-populate form
    setTopicName(topicNameStr);
    setTeacherNotes(dbItem ? (dbItem.teacher_notes || '') : (pageState.notes || ''));
    let loadedNote = '';
    if (dbItem?.homework_notes) {
      try {
        const parsed = JSON.parse(dbItem.homework_notes);
        if (Array.isArray(parsed)) {
          loadedNote = parsed.map((line: string) => cleanNotesText(line)).filter(Boolean).join('\n');
        } else {
          loadedNote = cleanNotesText(String(parsed));
        }
      } catch {
        loadedNote = cleanNotesText(dbItem.homework_notes);
      }
    } else {
      loadedNote = cleanNotesText(pageState.homeworkNotes || pageState.homework_notes || '');
    }
    setHomeworkNotes(cleanNotesText(loadedNote));

    let loadedStudentNote = pageState.studentNotes || '';
    let loadedIsPrivate = pageState.studentNotesIsPrivate || false;

    if (dbItem?.homework_notes) {
      try {
        const parsedDB = JSON.parse(dbItem.homework_notes);
        if (Array.isArray(parsedDB)) {
          const pub = parsedDB.find((line: string) => typeof line === 'string' && line.startsWith('STUDENT_NOTE_PUBLIC:'));
          const priv = parsedDB.find((line: string) => typeof line === 'string' && line.startsWith('STUDENT_NOTE_PRIVATE:'));
          if (pub) {
            loadedStudentNote = pub.replace(/^STUDENT_NOTE_PUBLIC:[^|]*\|/, '');
            loadedIsPrivate = false;
          } else if (priv) {
            loadedStudentNote = priv.replace(/^STUDENT_NOTE_PRIVATE:[^|]*\|/, '');
            loadedIsPrivate = true;
          }
        }
      } catch {}
    }

    setStudentNotes(loadedStudentNote);
    setIsStudentNotePrivate(loadedIsPrivate);

    // Map textbook page statuses to Supabase/form states
    if (overrideStatus !== undefined) {
      setStatus(overrideStatus);
      setIsCurrentHomework(!!overrideHomework);
    } else {
      const bookPageStatus = pageState.status || 'locked';
      if (bookPageStatus === 'mastered') {
        setStatus('MASTERED');
        setIsCurrentHomework(false);
      } else if (bookPageStatus === 'purple') {
        setStatus('THEORY_DONE');
        setIsCurrentHomework(false);
      } else if (bookPageStatus === 'homework') {
        setStatus('IN_PROGRESS');
        setIsCurrentHomework(true);
      } else {
        setStatus('IN_PROGRESS');
        setIsCurrentHomework(false);
      }
    }
  };

  const selectActiveSong = (skill: any) => {
    setSelectedActiveSongId(skill.id);
    setActiveInputTab('active_song');
    setActiveSubView('song');
    setSongProgressPercent(skill.progress_percent || 0);
    
    // Load sub-sliders
    const savedValsStr = localStorage.getItem(`song_skills_detail_${student.id}_${skill.id}`);
    let r = skill.progress_percent || 0;
    let f = skill.progress_percent || 0;
    let e = skill.progress_percent || 0;
    if (savedValsStr) {
      try {
        const parsed = JSON.parse(savedValsStr);
        if (typeof parsed.rhythm === 'number') r = parsed.rhythm;
        if (typeof parsed.finger === 'number') f = parsed.finger;
        if (typeof parsed.expression === 'number') e = parsed.expression;
      } catch (err) {
        console.error(err);
      }
    }
    setRhythmVal(r);
    setFingerVal(f);
    setExpressionVal(e);
    
    const songArtist = skill.songs?.artist || skill.artist || '';
    const songTitle = skill.songs?.title || skill.title || skill.song_title || 'Song';
    const songInstrument = skill.instrument ? ` (${skill.instrument})` : '';
    const fullTitle = songArtist ? `${songArtist} - ${songTitle}${songInstrument}` : `${songTitle}${songInstrument}`;
    setTopicName(fullTitle);
    
    // Look up existing database notes in progressItems for THIS song with robust matcher
    const matchingItems = progressItems.filter(item => isSongMatch(item, skill));
    const isAnyHw = matchingItems.some(item => Boolean(item.is_current_homework));
    const dbItem = matchingItems[0];

    const cachedTeacherNote = localStorage.getItem(`song_teacher_note_${student.id}_${skill.id}`) ||
                              localStorage.getItem(`song_teacher_note_${student.id}_${skill.song_id}`) || '';
    setTeacherNotes(cachedTeacherNote || (dbItem ? (dbItem.teacher_notes || '') : ''));

    // Load song homework notes (strictly isolated from general homework notes)
    const cachedSongNote = localStorage.getItem(`song_note_${student.id}_${skill.id}`) ||
                           localStorage.getItem(`song_note_${student.id}_${skill.song_id}`) || '';
    if (cachedSongNote) {
      setSongHomeworkNotes(cachedSongNote);
    } else if (dbItem && dbItem.homework_notes) {
      const cleanSongNote = getCleanPageNotes(dbItem.homework_notes);
      setSongHomeworkNotes(cleanSongNote);
    } else {
      setSongHomeworkNotes('');
    }
    
    if (skill.is_stage_ready || skill.progress_percent === 100 || (dbItem && dbItem.status === 'MASTERED')) {
      setStatus('MASTERED');
      setIsCurrentHomework(false);
    } else {
      setStatus('IN_PROGRESS');
      const localHw = localStorage.getItem(`song_hw_${student.id}_${skill.id}`);
      const isHw = isAnyHw || (localHw === 'true');
      setIsCurrentHomework(isHw);
    }

    // Dual Match Model State (Parked on Roadmap)
    setIsMatchModeEnabled(false);

    const localStudentRating = localStorage.getItem(`song_student_rating_${student.id}_${skill.id}`);
    const sRating = localStudentRating !== null && localStudentRating !== undefined ? parseInt(localStudentRating, 10) : (skill.student_rating ?? (dbItem?.student_rating ?? null));
    setStudentRating(sRating);

    const sUpdated = skill.student_rating_updated_at || localStorage.getItem(`song_student_rating_updated_at_${student.id}_${skill.id}`);
    setStudentRatingUpdatedAt(sUpdated || null);
    setIsStudentRatingCommitted(Boolean(sRating !== null && sRating !== undefined && sUpdated));

    const lastMatchDate = skill.last_matched_at || dbItem?.last_matched_at || localStorage.getItem(`song_last_matched_at_${student.id}_${skill.id}`);
    setLastMatchedAt(lastMatchDate || null);

    const lastTeacherP = skill.last_matched_teacher_percent ?? dbItem?.last_matched_teacher_percent ?? null;
    setLastMatchedTeacherPercent(lastTeacherP);

    const lastStudentP = skill.last_matched_student_percent ?? dbItem?.last_matched_student_percent ?? null;
    setLastMatchedStudentPercent(lastStudentP);

    const lastMatchSuccess = skill.is_match_successful ?? dbItem?.is_match_successful ?? (lastMatchDate && lastTeacherP !== null && lastStudentP !== null ? Math.abs(lastTeacherP - lastStudentP) <= 10 : null);
    setIsMatchSuccessful(lastMatchSuccess);
    const isUpToDateMatch = Boolean(lastMatchDate && (!sUpdated || new Date(lastMatchDate).getTime() >= new Date(sUpdated).getTime()));
    setIsMatchRevealed(isUpToDateMatch);

    // Load persistent 3-slot match history
    const rawHistory = (skill as any).match_history || (dbItem as any)?.match_history || localStorage.getItem(`song_match_history_${student.id}_${skill.id}`);
    let parsedHistory: any[] = [];
    if (Array.isArray(rawHistory)) {
      parsedHistory = rawHistory;
    } else if (typeof rawHistory === 'string') {
      try { parsedHistory = JSON.parse(rawHistory); } catch (e) {}
    }
    if (parsedHistory.length === 0 && lastMatchDate && lastTeacherP !== null && lastStudentP !== null) {
      const diff = Math.abs(lastTeacherP - lastStudentP);
      parsedHistory = [{
        matched_at: lastMatchDate,
        teacher_percent: lastTeacherP,
        student_percent: lastStudentP,
        xp_amount: diff <= 10 ? 50 : (diff <= 20 ? 25 : 5),
        tier: diff <= 10 ? 'tier1' : (diff <= 20 ? 'tier2' : 'tier3')
      }];
    }
    setMatchHistory(parsedHistory.slice(0, 3));
  };

  // Sync active song homework status whenever progressItems finishes loading from Supabase (without overwriting typed notes)
  useEffect(() => {
    if (activeInputTab === 'active_song' && selectedActiveSongId && progressItems.length > 0) {
      const skill = activeSongSkills.find(s => s.id === selectedActiveSongId || s.song_id === selectedActiveSongId);
      if (skill) {
        const matchingItems = progressItems.filter(item => isSongMatch(item, skill));
        if (matchingItems.length > 0) {
          const isHw = matchingItems.some(item => Boolean(item.is_current_homework));
          setIsCurrentHomework(isHw);
          const newest = matchingItems[0];
          if (newest.status === 'MASTERED' || skill.is_stage_ready) {
            setStatus('MASTERED');
          } else {
            setStatus('IN_PROGRESS');
          }
          if (newest.student_rating !== undefined && newest.student_rating !== null) {
            setStudentRating(prev => (prev === null ? newest.student_rating! : prev));
          }
          if (newest.last_matched_at) {
            setLastMatchedAt(newest.last_matched_at);
            setLastMatchedTeacherPercent(newest.last_matched_teacher_percent ?? null);
            setLastMatchedStudentPercent(newest.last_matched_student_percent ?? null);
            setIsMatchSuccessful(newest.is_match_successful ?? null);
            setIsMatchRevealed(true);
          }
        }
      }
    }
  }, [progressItems, activeInputTab, selectedActiveSongId, activeSongSkills]);

  // Find former notes matching the current topic Name automatically!
  const formerNotes = useMemo(() => {
    if (!topicName.trim()) return [];
    return progressItems.filter(item => item.topic_name.toLowerCase().trim() === topicName.toLowerCase().trim());
  }, [topicName, progressItems]);

  const effectiveMasteredSongsCount = useMemo(() => {
    const fromSkills = (activeSongSkills || []).filter(s => s.progress === 100 || s.status === 'MASTERED' || s.is_stage_ready).length;
    const fromItems = (progressItems || []).filter(item => {
      const t = (item.topic_name || '').toLowerCase().trim();
      return !t.includes(' - seite ') && t !== 'test' && t !== 'test - test' && t !== 'test-test' && item.status === 'MASTERED';
    }).length;
    const fromInitial = initialMasteredSongsCount || 0;
    const fromSim = simulatedSongsCount !== null ? simulatedSongsCount : 0;
    return Math.max(fromSkills, fromItems, fromInitial, fromSim);
  }, [activeSongSkills, progressItems, initialMasteredSongsCount, simulatedSongsCount]);

  // Scan all database entries for awarded stickers & compute milestone stickers synchronously
  const collectedStickers = useMemo(() => {
    const isArchivedYear = selectedSchoolYear !== currentSchoolYear;

    let yearProgressItems = progressItems;
    if (isArchivedYear) {
      yearProgressItems = (progressItems || []).filter(item => {
        const itemYear = getSchoolYearString(item.created_at || item.updated_at);
        return itemYear === selectedSchoolYear;
      });
    }

    // 🛡️ Deterministische Zählung: Ausbildungsjahre werden STRIKT ab Registrierungsdatum des Benutzers berechnet
    const regDateStr = student?.activated_at || student?.created_at || (student as any)?.registered_at;
    const studentCampusYearNum = calculateCampusSchoolYearNumber(regDateStr, selectedSchoolYear);

    return getUnifiedStickersMap({
      practiceMinutes: isArchivedYear ? 0 : studentPracticeMinutes,
      xp: isArchivedYear ? 0 : studentXP,
      streakDays: isArchivedYear ? 0 : studentStreak,
      masteredSongsCount: isArchivedYear ? 0 : effectiveMasteredSongsCount,
      progressItems: yearProgressItems,
      simulatedStickers,
      studentCreatedAt: student?.created_at,
      activatedAt: student?.activated_at,
      registeredAt: (student as any)?.registered_at,
      activeSchoolYearsCount: studentCampusYearNum,
      selectedSchoolYear
    });
  }, [studentPracticeMinutes, studentXP, studentStreak, effectiveMasteredSongsCount, progressItems, simulatedStickers, selectedSchoolYear, currentSchoolYear, student?.created_at, student?.activated_at, (student as any)?.registered_at]);


  const triggerDirectSave = async (
    lehrwerkId: string, 
    pageNum: number, 
    targetStatus: 'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED', 
    targetHomework: boolean,
    isUndo = false
  ) => {
    if (!isUndo) {
      const assignedBook = assignedLehrwerke.find(a => a.lehrwerkId === lehrwerkId);
      const prevPageState = assignedBook?.pageStates?.[pageNum] || { status: 'locked' };
      setPageUndoStack(prev => [...prev, { lehrwerkId, pageNum, prevStatus: prevPageState }]);
    }

    let pageStatus: 'locked' | 'homework' | 'mastered' | 'purple' = 'locked';
    if (targetStatus === 'MASTERED') {
      pageStatus = 'mastered';
    } else if (targetStatus === 'THEORY_DONE') {
      pageStatus = 'purple';
    } else if (targetHomework) {
      pageStatus = 'homework';
    }

    try {
      const book = globalLehrwerke.find(g => g.id === lehrwerkId);
      if (!book) return;

      const globalStored = localStorage.getItem('campus_lehrwerke');
      if (globalStored) {
        const books = JSON.parse(globalStored);
        const updatedBooks = books.map((b: any) => {
          if (b.id === lehrwerkId) {
            const globalPageStates = b.globalPageStates || {};
            if (pageStatus === 'purple') {
              globalPageStates[pageNum] = 'purple';
            } else {
              delete globalPageStates[pageNum];
            }
            return { ...b, globalPageStates };
          }
          return b;
        });
        localStorage.setItem('campus_lehrwerke', JSON.stringify(updatedBooks));
      }

      const stored = localStorage.getItem('student_lehrwerke_progress');
      const parsed = stored ? JSON.parse(stored) : [];
      
      const updated = parsed.map((item: any) => {
        if (item.studentId === student.id && item.lehrwerkId === lehrwerkId) {
          return {
            ...item,
            pageStates: {
              ...item.pageStates,
              [pageNum]: {
                ...(item.pageStates?.[pageNum] || {}),
                status: pageStatus,
                updatedAt: new Date(Date.now() + 10000).toISOString()
              }
            }
          };
        }
        return item;
      });

      localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
      setAssignedLehrwerke(updated.filter((item: any) => item.studentId === student.id));

      setTopicName(`${book.title} - Seite ${pageNum}`);
      setStatus(targetStatus);
      setIsCurrentHomework(targetHomework);

      const activeTId = await getCurrentTeacherId();
      const currentWeek = getISOWeek();
      const existingThisWeek = progressItems.find(item => 
        item.topic_name === `${book.title} - Seite ${pageNum}` && 
        item.updated_at && 
        getISOWeek(item.updated_at) === currentWeek
      );

      const assignedBook = (updated || []).find((item: any) => item.studentId === student.id && item.lehrwerkId === lehrwerkId);
      const existingPageState = assignedBook?.pageStates?.[pageNum];

      const existingPageNote = (activeLehrwerkId === lehrwerkId && activePageNumber === pageNum && pageHomeworkNotes)
        ? pageHomeworkNotes.trim()
        : (existingThisWeek?.homework_notes ? getCleanPageNotes(existingThisWeek.homework_notes) : (existingPageState?.homeworkNotes || ''));

      const row = {
        student_id: student.id,
        teacher_id: activeTId,
        topic_name: `${book.title} - Seite ${pageNum}`,
        status: targetStatus,
        is_current_homework: targetHomework,
        teacher_notes: existingThisWeek ? (existingThisWeek.teacher_notes || '') : (existingPageState?.notes || ''),
        homework_notes: existingPageNote,
        updated_at: new Date().toISOString()
      };

      if (existingThisWeek?.id) {
        await supabase
          .from('progress_matrix')
          .update(row)
          .eq('id', existingThisWeek.id);
      } else {
        await supabase
          .from('progress_matrix')
          .insert(row);
      }

      // Automatically award +15 Campus-XP when a textbook page is freshly mastered
      if (targetStatus === 'MASTERED') {
        const pageKey = `xp_awarded_page_${student.id}_${lehrwerkId}_${pageNum}`;
        const alreadyAwarded = localStorage.getItem(pageKey);
        if (!alreadyAwarded) {
          localStorage.setItem(pageKey, 'true');
          await awardCampusXP(15, `Lehrwerk gemeistert: ${book.title} - S. ${pageNum}`);
        }
      }

      // Add to session log
      if (pageStatus === 'homework' || pageStatus === 'purple') {
        const logText = pageStatus === 'homework' 
          ? `📖 ${book.title} - S. ${pageNum}` 
          : `📖 ${book.title} - S. ${pageNum} (Theorie)`;
        
        setSessionLogs(prev => {
          const filtered = prev.filter(log => !log.startsWith(`📖 ${book.title} - S. ${pageNum}`));
          return [...filtered, logText];
        });
      } else {
        setSessionLogs(prev => prev.filter(log => !log.startsWith(`📖 ${book.title} - S. ${pageNum}`)));
      }

      await fetchProgress();
      notifyHomeworkChange();
    } catch (e) {
      console.error('Error saving direct textbook progress:', e);
    }
  };

  const handleBackToHub = async () => {
    if (activeInputTab === 'active_song' && selectedActiveSongId) {
      await triggerDirectSongSave(selectedActiveSongId, status, isCurrentHomework, songHomeworkNotes);
    } else if (activeInputTab === 'lehrwerk_page' && activeLehrwerkId && activePageNumber !== null) {
      await handleSave(true);
    }
    setActiveSubView('hub');
    setActiveInputTab('free');
    setSelectedActiveSongId('');
    setActiveLehrwerkId(null);
    setActivePageNumber(null);
    setHasChanges(false);
    setSongHomeworkNotes('');
    setPageHomeworkNotes('');
  };

  const awardCampusXP = async (amount: number, reason: string, durationSeconds: number = 0) => {
    try {
      if (!student?.id || (amount <= 0 && durationSeconds <= 0)) return;
      const nowIso = new Date().toISOString();
      const durationMins = Math.round(durationSeconds / 60);

      // 1. Fetch current user XP
      const { data: userProfile } = await supabase
        .from('users')
        .select('id, campus_xp, xp')
        .eq('id', student.id)
        .single();

      const currentCampusXP = userProfile?.campus_xp || userProfile?.xp || 0;
      const newCampusXP = currentCampusXP + amount;

      // Update users table
      if (amount > 0) {
        await supabase
          .from('users')
          .update({
            campus_xp: newCampusXP,
            xp: newCampusXP,
            updated_at: nowIso
          })
          .eq('id', student.id);
      }

      // 2. Fetch & update student_stats record
      const { data: statsRecord } = await supabase
        .from('student_stats')
        .select('*')
        .eq('student_id', student.id)
        .maybeSingle();

      const currentStatsXp = (statsRecord?.current_xp || 0) + amount;
      const currentFocusMins = (statsRecord?.total_focus_minutes || 0) + durationMins;
      const currentMonthlyMins = (statsRecord?.monthly_focus_minutes || 0) + durationMins;

      await supabase
        .from('student_stats')
        .upsert({
          student_id: student.id,
          current_xp: currentStatsXp,
          total_focus_minutes: currentFocusMins,
          monthly_focus_minutes: currentMonthlyMins,
          updated_at: nowIso
        }, { onConflict: 'student_id' });

      // 3. Update avatars table
      try {
        await supabase
          .from('avatars')
          .update({
            xp: currentStatsXp,
            updated_at: nowIso
          })
          .or(`user_id.eq.${student.id},student_id.eq.${student.id}`);
      } catch (avErr) {}

      // 4. Update offline local storage cache for instant offline & engine sync
      try {
        if (typeof window !== 'undefined') {
          const offStatsKey = `cg_offline_stats_${student.id}`;
          const offPracticeKey = `cg_offline_practice_${student.id}`;
          const existingOffStats = JSON.parse(localStorage.getItem(offStatsKey) || '{}');
          const existingOffPractice = JSON.parse(localStorage.getItem(offPracticeKey) || '{}');

          const updatedOffStats = {
            ...existingOffStats,
            current_xp: Math.max(existingOffStats.current_xp || 0, currentStatsXp),
            total_focus_minutes: Math.max(existingOffStats.total_focus_minutes || 0, currentFocusMins),
            monthly_focus_minutes: Math.max(existingOffStats.monthly_focus_minutes || 0, currentMonthlyMins),
            saved_at: nowIso
          };
          localStorage.setItem(offStatsKey, JSON.stringify(updatedOffStats));

          const updatedOffPractice = {
            ...existingOffPractice,
            xp: Math.max(existingOffPractice.xp || 0, currentStatsXp),
            total_focus_minutes: Math.max(existingOffPractice.total_focus_minutes || 0, currentFocusMins),
            monthly_focus_minutes: Math.max(existingOffPractice.monthly_focus_minutes || 0, currentMonthlyMins),
            saved_at: nowIso
          };
          localStorage.setItem(offPracticeKey, JSON.stringify(updatedOffPractice));
        }
      } catch (e) {}

      // 5. Insert log entry in fokus_logs for transparency & auditing
      try {
        await supabase.from('fokus_logs').insert({
          student_id: student.id,
          duration_minutes: durationMins,
          duration_seconds: durationSeconds,
          xp_earned: amount,
          is_extra: true,
          created_at: nowIso
        });
      } catch (logErr) {}

      // 6. Broadcast updates across tabs and DOM events
      broadcastPracticeUpdate(student.id, { xpEarned: amount, durationMinutes: durationMins, durationSeconds });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('campus-xp-awarded', {
          detail: { studentId: student.id, amount, newTotal: newCampusXP, reason }
        }));
      }
    } catch (err) {
      console.warn('Campus XP update note:', err);
    }
  };

  const handleGrooveTrainerRewardXp = useCallback(async (xp: number, durationSeconds: number = 0) => {
    if (student?.id && (xp > 0 || durationSeconds > 0)) {
      await awardCampusXP(xp, 'Groove-Trainer gemeistert', durationSeconds);
    }
  }, [student?.id]);


  const handleStudentRatingChange = (val: number) => {
    setStudentRating(val);
    setIsStudentRatingCommitted(false);
    setIsMatchRevealed(false);
    setHasChanges(true);
    if (selectedActiveSongId) {
      try {
        localStorage.setItem(`song_student_rating_${student.id}_${selectedActiveSongId}`, String(val));
      } catch (err) {}
    }
  };

  const handleCommitStudentRating = async () => {
    const val = studentRating ?? 0;
    const nowIso = new Date().toISOString();
    setIsStudentRatingCommitted(true);
    setIsMatchRevealed(false);
    setStudentRatingUpdatedAt(nowIso);
    setMatchFeedbackToast('🔒 Tipp abgeschickt! Deine Lehrkraft sieht sofort deine Abgabe.');
    setTimeout(() => setMatchFeedbackToast(null), 3500);

    if (selectedActiveSongId) {
      try {
        localStorage.setItem(`song_student_rating_${student.id}_${selectedActiveSongId}`, String(val));
        localStorage.setItem(`song_student_rating_updated_at_${student.id}_${selectedActiveSongId}`, nowIso);

        if (!String(selectedActiveSongId).startsWith('temp-')) {
          await supabase
            .from('user_song_skills')
            .update({
              student_rating: val,
              student_rating_updated_at: nowIso
            })
            .eq('id', selectedActiveSongId);
        }
        const matchingItems = progressItems.filter(item => isSongMatch(item, { id: selectedActiveSongId }));
        const validIds = matchingItems.map(i => i.id).filter(id => id && !String(id).startsWith('temp-'));
        if (validIds.length > 0) {
          await supabase
            .from('progress_matrix')
            .update({
              student_rating: val,
              updated_at: nowIso
            })
            .in('id', validIds);
        }
      } catch (e) {
        console.error('Error committing student rating:', e);
      }
    }
  };


  const handleToggleMatchMode = async () => {
    const nextVal = !isMatchModeEnabled;
    setIsMatchModeEnabled(nextVal);
    if (selectedActiveSongId) {
      try {
        localStorage.setItem(`song_match_mode_${student.id}_${selectedActiveSongId}`, String(nextVal));
        if (!String(selectedActiveSongId).startsWith('temp-')) {
          await supabase
            .from('user_song_skills')
            .update({ is_match_mode_enabled: nextVal })
            .eq('id', selectedActiveSongId);
        }
      } catch (err) {}
    }
  };

  const handleCheckMatch = async () => {
    if (studentRating === null || studentRating === undefined) return;
    if (matchHistory.length >= 3) {
      setMatchFeedbackToast('🏆 Alle 3 Meilenstein-Matches für diesen Song sind bereits abgeschlossen!');
      setTimeout(() => setMatchFeedbackToast(null), 3500);
      return;
    }

    const teacherPercent = songProgressPercent;
    const studPercent = studentRating;
    const diff = Math.abs(teacherPercent - studPercent);
    const isTier1 = diff <= 10;
    const isTier2 = diff > 10 && diff <= 20;
    const isTier3 = diff > 20;
    const tier: 'tier1' | 'tier2' | 'tier3' = isTier1 ? 'tier1' : (isTier2 ? 'tier2' : 'tier3');
    const isSuccess = isTier1;
    const xpWon = isTier1 ? 50 : (isTier2 ? 25 : 5);
    const nowIso = new Date().toISOString();

    const activeSongObj = activeSongSkills.find(s => s.id === selectedActiveSongId || s.song_id === selectedActiveSongId);
    const songTitle = activeSongObj?.songs?.title || 'Song';

    // 1. Trigger Dual-Balken Showdown Race Animation (1.2s)
    setShowdownState({
      isRunning: true,
      teacherTarget: teacherPercent,
      studentTarget: studPercent,
      currentTeacherVal: 0,
      currentStudentVal: 0,
      tier,
      xpAmount: xpWon,
      matchedAt: nowIso
    });

    const startTime = performance.now();
    const duration = 1200; // 1.2 seconds

    const animateRace = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const curT = teacherPercent * ease;
      const curS = studPercent * ease;

      setShowdownState(prev => prev ? {
        ...prev,
        currentTeacherVal: curT,
        currentStudentVal: curS
      } : null);

      if (progress < 1) {
        requestAnimationFrame(animateRace);
      } else {
        // Race complete! Finalize match result
        finalizeMatchResult(teacherPercent, studPercent, isTier1, isTier2, isTier3, tier, isSuccess, xpWon, nowIso, songTitle);
      }
    };

    requestAnimationFrame(animateRace);
  };

  const finalizeMatchResult = async (
    teacherPercent: number,
    studPercent: number,
    isTier1: boolean,
    isTier2: boolean,
    isTier3: boolean,
    tier: 'tier1' | 'tier2' | 'tier3',
    isSuccess: boolean,
    xpWon: number,
    nowIso: string,
    songTitle: string
  ) => {
    setShowdownState(prev => prev ? {
      ...prev,
      isRunning: false,
      currentTeacherVal: teacherPercent,
      currentStudentVal: studPercent
    } : null);

    setLastMatchedAt(nowIso);
    setLastMatchedTeacherPercent(teacherPercent);
    setLastMatchedStudentPercent(studPercent);
    setIsMatchSuccessful(isSuccess);
    setIsMatchRevealed(true);

    const newEntry = {
      matched_at: nowIso,
      teacher_percent: teacherPercent,
      student_percent: studPercent,
      xp_amount: xpWon,
      tier
    };
    const updatedHistory = [...matchHistory.filter(h => h.matched_at !== nowIso), newEntry].slice(0, 3);
    setMatchHistory(updatedHistory);

    try {
      if (selectedActiveSongId) {
        localStorage.setItem(`song_last_matched_at_${student.id}_${selectedActiveSongId}`, nowIso);
        localStorage.setItem(`song_last_matched_teacher_percent_${student.id}_${selectedActiveSongId}`, String(teacherPercent));
        localStorage.setItem(`song_last_matched_student_percent_${student.id}_${selectedActiveSongId}`, String(studPercent));
        localStorage.setItem(`song_is_match_successful_${student.id}_${selectedActiveSongId}`, String(isSuccess));
        localStorage.setItem(`song_match_history_${student.id}_${selectedActiveSongId}`, JSON.stringify(updatedHistory));

        if (!String(selectedActiveSongId).startsWith('temp-')) {
          await supabase
            .from('user_song_skills')
            .update({
              last_matched_at: nowIso,
              last_matched_teacher_percent: teacherPercent,
              last_matched_student_percent: studPercent,
              is_match_successful: isSuccess,
              teacher_rating_updated_at: nowIso,
              match_history: updatedHistory
            })
            .eq('id', selectedActiveSongId);
        }
        const matchingItems = progressItems.filter(item => isSongMatch(item, { id: selectedActiveSongId }));
        const validIds = matchingItems.map(i => i.id).filter(id => id && !String(id).startsWith('temp-'));
        if (validIds.length > 0) {
          await supabase
            .from('progress_matrix')
            .update({
              last_matched_at: nowIso,
              last_matched_teacher_percent: teacherPercent,
              last_matched_student_percent: studPercent,
              is_match_successful: isSuccess,
              match_history: updatedHistory
            })
            .in('id', validIds);
        }
      }
    } catch (e) {
      console.error('Error saving match result:', e);
    }

    // 1. Broadcast over Supabase Realtime channel for live in-app celebration on student device
    try {
      const channel = supabase.channel(`realtime_student_progress_${student.id}`);
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.send({
            type: 'broadcast',
            event: 'song-matched',
            payload: {
              songTitle,
              tier,
              xpAmount: xpWon,
              teacherPercent,
              studentPercent: studPercent,
              matchedAt: nowIso,
              matchNumber: updatedHistory.length
            }
          });
          supabase.removeChannel(channel);
        }
      });
    } catch (bcErr) {
      console.warn('Realtime broadcast error:', bcErr);
    }

    // 2. Insert notification record for PWA / WebPush
    try {
      await supabase.from('notifications').insert({
        user_id: student.id,
        title: isTier1 ? '🎯 Volltreffer! Meister-Ohr freigeschaltet!' : (isTier2 ? '✨ Super Gehör! +25 XP gesammelt!' : '🚀 Neues Song-Match mit deiner Lehrkraft!'),
        message: `Für "${songTitle}": Du hast +${xpWon} Campus-XP erhalten! (Meilenstein ${updatedHistory.length}/3)`,
        type: 'song_match',
        is_read: false,
        created_at: nowIso
      });
    } catch (notifErr) {}

    // 3. XP Awarding & Teacher UI feedback
    if (isTier1) {
      setShowMatchConfetti(true);
      setTimeout(() => setShowMatchConfetti(false), 4500);
      await awardCampusXP(50, 'Meister-Ohr Volltreffer');
      setMatchFeedbackToast(`🎯 VOLLTREFFER! +50 Campus-XP & Meister-Ohr freigeschaltet! (Match ${updatedHistory.length}/3)`);
      setTimeout(() => setMatchFeedbackToast(null), 4500);
    } else if (isTier2) {
      setShowMatchConfetti(true);
      setTimeout(() => setShowMatchConfetti(false), 4000);
      await awardCampusXP(25, 'Super Gehör Match');
      setMatchFeedbackToast(`✨ SUPER GEHÖR! +25 Campus-XP gesammelt! (Match ${updatedHistory.length}/3)`);
      setTimeout(() => setMatchFeedbackToast(null), 4500);
    } else {
      await awardCampusXP(5, 'Weiter-Rocker Motivations-Bonus');
      setMatchFeedbackToast(`🚀 WEITER-ROCKER! +5 Campus-XP fürs Mitmachen & Weitermachen! (Match ${updatedHistory.length}/3)`);
      setTimeout(() => setMatchFeedbackToast(null), 4500);
    }
  };

  const songSaveTimeoutRef = useRef<any>(null);
  const triggerDebouncedSongSave = (val: string) => {
    if (songSaveTimeoutRef.current) clearTimeout(songSaveTimeoutRef.current);
    songSaveTimeoutRef.current = setTimeout(() => {
      if (selectedActiveSongId) {
        const isHw = val.trim().length > 0 ? true : isCurrentHomework;
        triggerDirectSongSave(selectedActiveSongId, status, isHw, val, teacherNotes);
      }
    }, 450);
  };

  const triggerDebouncedTeacherNoteSave = (val: string) => {
    if (songSaveTimeoutRef.current) clearTimeout(songSaveTimeoutRef.current);
    songSaveTimeoutRef.current = setTimeout(() => {
      if (selectedActiveSongId) {
        triggerDirectSongSave(selectedActiveSongId, status, isCurrentHomework, songHomeworkNotes, val);
      }
    }, 450);
  };

  const triggerDirectSongSave = async (skillId: string, targetStatus: 'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED', targetHomework: boolean, songNoteOverride?: string, teacherNoteOverride?: string) => {
    try {
      const skill = activeSongSkills.find(s => s.id === skillId || s.song_id === skillId || s.songs?.id === skillId);
      const skillPercent = songProgressPercent !== undefined ? songProgressPercent : (skill?.progress_percent || 0);

      const songArtist = skill?.songs?.artist || skill?.artist || '';
      const songTitle = skill?.songs?.title || skill?.title || skill?.song_title || topicName.replace(/\s*\([^)]*\)\s*$/, '').trim() || 'Song';
      const songInstrument = skill?.instrument ? ` (${skill.instrument})` : '';
      const fullTitle = songArtist ? `${songArtist} - ${songTitle}${songInstrument}` : `${songTitle}${songInstrument}`;

      const noteToSave = songNoteOverride !== undefined
        ? songNoteOverride
        : (songHomeworkNotes !== undefined ? songHomeworkNotes : '');

      const teacherNoteToSave = teacherNoteOverride !== undefined
        ? teacherNoteOverride
        : (teacherNotes !== undefined ? teacherNotes : '');

      // Local storage backup for instant sync
      try {
        if (skillId) {
          localStorage.setItem(`song_hw_${student.id}_${skillId}`, targetHomework ? 'true' : 'false');
          localStorage.setItem(`song_note_${student.id}_${skillId}`, noteToSave);
          localStorage.setItem(`song_teacher_note_${student.id}_${skillId}`, teacherNoteToSave);
        }
        if (skill?.id) {
          localStorage.setItem(`song_hw_${student.id}_${skill.id}`, targetHomework ? 'true' : 'false');
          localStorage.setItem(`song_note_${student.id}_${skill.id}`, noteToSave);
          localStorage.setItem(`song_teacher_note_${student.id}_${skill.id}`, teacherNoteToSave);
        }
        if (skill?.song_id) {
          localStorage.setItem(`song_hw_${student.id}_${skill.song_id}`, targetHomework ? 'true' : 'false');
          localStorage.setItem(`song_note_${student.id}_${skill.song_id}`, noteToSave);
          localStorage.setItem(`song_teacher_note_${student.id}_${skill.song_id}`, teacherNoteToSave);
        }
      } catch (e) {}

      if (skillId && !String(skillId).startsWith('temp-')) {
        await supabase
          .from('user_song_skills')
          .update({
            is_stage_ready: targetStatus === 'MASTERED',
            progress_percent: skillPercent
          })
          .eq('id', skillId);
      }

      setTopicName(fullTitle);
      setStatus(targetStatus);
      setIsCurrentHomework(targetHomework);

      const activeTId = await getCurrentTeacherId();
      
      // Look for ALL existing progress_matrix items for this student with this song
      const matchingExistingItems = progressItems.filter(item => isSongMatch(item, skill || { topic_name: fullTitle }));
      const existingItem = matchingExistingItems[0];

      const row = {
        student_id: student.id,
        teacher_id: activeTId,
        topic_name: fullTitle,
        status: targetStatus,
        is_current_homework: targetHomework,
        teacher_notes: teacherNoteToSave,
        homework_notes: noteToSave,
        updated_at: new Date().toISOString()
      };

      const validMatchingIds = matchingExistingItems
        .map(i => i.id)
        .filter(id => id && !String(id).startsWith('temp-'));

      let savedItem: any = null;
      if (validMatchingIds.length > 0) {
        const { data, error } = await supabase
          .from('progress_matrix')
          .update(row)
          .in('id', validMatchingIds)
          .select();
        if (!error && data && data.length > 0) {
          savedItem = data[0];
        }
      } else {
        const { data, error } = await supabase
          .from('progress_matrix')
          .insert(row)
          .select()
          .single();
        if (!error && data) {
          savedItem = data;
        }
      }

      // Optimistic update of progressItems so preview and dashboard show note instantly
      const finalItem = savedItem || { id: existingItem?.id || ('temp-' + Date.now()), ...row };
      setProgressItems(prev => {
        const remaining = prev.filter(item => !isSongMatch(item, skill || { topic_name: fullTitle }));
        return [finalItem, ...remaining];
      });

      // Automatically award +100 Campus-XP when a song is freshly marked as 100% MASTERED
      if (targetStatus === 'MASTERED' || skillPercent === 100) {
        const songXpKey = `xp_awarded_song_${student.id}_${skillId || songTitle}`;
        const alreadyAwarded = localStorage.getItem(songXpKey);
        if (!alreadyAwarded) {
          localStorage.setItem(songXpKey, 'true');
          await awardCampusXP(100, `Song zu 100% gemeistert: ${songTitle}`);
        }
      }

      // Add to session log
      if (targetHomework || targetStatus === 'THEORY_DONE') {
        const logText = targetHomework 
          ? `🎵 ${songTitle}` 
          : `🎵 ${songTitle} (Theorie)`;
        
        setSessionLogs(prev => {
          const filtered = prev.filter(log => !log.startsWith(`🎵 ${songTitle}`));
          return [...filtered, logText];
        });
      } else {
        setSessionLogs(prev => prev.filter(log => !log.startsWith(`🎵 ${songTitle}`)));
      }

      notifyHomeworkChange();
    } catch (e) {
      console.error('Error saving song status directly:', e);
    }
  };

  const handleSaveStudentNotes = async () => {
    if (!activeLehrwerkId || activePageNumber === null) return;
    try {
      setSaving(true);
      const stored = localStorage.getItem('student_lehrwerke_progress');
      const parsed = stored ? JSON.parse(stored) : [];

      const updated = parsed.map((item: any) => {
        if (item.studentId === student.id && item.lehrwerkId === activeLehrwerkId) {
          const existingPageState = item.pageStates?.[activePageNumber] || {};
          return {
            ...item,
            pageStates: {
              ...item.pageStates,
              [activePageNumber]: {
                ...existingPageState,
                studentNotes: studentNotes.trim(),
                studentNotesIsPrivate: isStudentNotePrivate,
                updatedAt: new Date().toISOString()
              }
            }
          };
        }
        return item;
      });

      localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
      setAssignedLehrwerke(updated.filter((item: any) => item.studentId === student.id));

      const notePrefix = isStudentNotePrivate ? 'STUDENT_NOTE_PRIVATE' : 'STUDENT_NOTE_PUBLIC';
      const formattedEntry = `${notePrefix}:${new Date().toISOString()}|${studentNotes.trim()}`;

      const updatedNotesList = homeworkNotesList.filter(
        n => typeof n === 'string' && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:')
      );

      if (studentNotes.trim()) {
        updatedNotesList.push(formattedEntry);
      }
      setHomeworkNotesList(updatedNotesList);

      await syncHomeworkNotes(updatedNotesList);
      setStudentNotesSavedToast(true);
      setTimeout(() => setStudentNotesSavedToast(false), 2500);
    } catch (err) {
      console.error('Fehler beim Speichern der Schüler-Notiz:', err);
      alert('Fehler beim Speichern der Schüler-Notiz.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStudentQuestion = async (qText: string) => {
    const trimmed = qText.trim();
    if (!trimmed) return;
    setIsSavingQuestion(true);
    try {
      const isoNow = new Date().toISOString();
      const tag = `STUDENT_QUESTION:${isoNow}|${trimmed}`;

      // 1. Optimistic local state update
      const filtered = (homeworkNotesList || []).filter(
        n => typeof n === 'string' && !n.startsWith('STUDENT_QUESTION:') && !n.startsWith('❓ Frage für den Unterricht:')
      );
      const updatedList = [tag, ...filtered];
      setHomeworkNotesList(updatedList);
      try {
        localStorage.setItem(`campus_homework_notes_${student.id}`, JSON.stringify(updatedList));
      } catch {}

      // 2. Authoritative server RPC call
      const { error } = await supabase.rpc('save_student_homework_question', {
        p_student_id: student.id,
        p_question_text: trimmed
      });

      if (error) {
        console.warn('[handleSaveStudentQuestion] RPC notice, saving via syncHomeworkNotes fallback:', error);
        await syncHomeworkNotes(updatedList);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('campus_student_question_updated', { detail: { studentId: student.id } }));
      }
      setIsQuestionEditorOpen(false);
      setQuestionDraftText('');
      setStudentNotesSavedToast(true);
      setTimeout(() => setStudentNotesSavedToast(false), 2500);
    } catch (err) {
      console.error('Fehler beim Speichern der Schülerfrage:', err);
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleResolveStudentQuestion = async () => {
    setIsSavingQuestion(true);
    try {
      const updatedList = (homeworkNotesList || []).filter(
        n => typeof n === 'string' && !n.startsWith('STUDENT_QUESTION:') && !n.startsWith('❓ Frage für den Unterricht:')
      );
      setHomeworkNotesList(updatedList);
      try {
        localStorage.setItem(`campus_homework_notes_${student.id}`, JSON.stringify(updatedList));
      } catch {}

      const { error } = await supabase.rpc('resolve_student_homework_question', {
        p_student_id: student.id
      });
      if (error) {
        console.warn('[handleResolveStudentQuestion] RPC notice, resolving via syncHomeworkNotes fallback:', error);
        await syncHomeworkNotes(updatedList);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('campus_student_question_updated', { detail: { studentId: student.id } }));
      }
      setIsQuestionEditorOpen(false);
      setQuestionDraftText('');
    } catch (err) {
      console.error('Fehler beim Erledigen der Schülerfrage:', err);
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const autoSaveDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerDebouncedAutoSave = (delayMs: number = 350) => {
    if (readOnly) return;
    setHasChanges(true);
    if (autoSaveDebounceTimerRef.current) {
      clearTimeout(autoSaveDebounceTimerRef.current);
    }
    autoSaveDebounceTimerRef.current = setTimeout(() => {
      handleSave(true);
    }, delayMs);
  };

  const triggerImmediateAutoSave = () => {
    if (readOnly) return;
    if (autoSaveDebounceTimerRef.current) {
      clearTimeout(autoSaveDebounceTimerRef.current);
    }
    handleSave(true);
  };

  const handleSave = async (e?: React.FormEvent | boolean, keepOpenParam?: boolean) => {
    let keepOpen = false;
    if (typeof e === 'boolean') {
      keepOpen = e;
    } else {
      e?.preventDefault();
      if (typeof keepOpenParam === 'boolean') {
        keepOpen = keepOpenParam;
      }
    }
    const currentWeekNum = getISOWeek().split('-W')[1] || '';
    const defaultTitle = `Hausaufgabe KW ${currentWeekNum}`;
    const finalTopicName = topicName.trim() || defaultTitle;

    setSaving(true);
    setError(null);

    let targetHomework = isCurrentHomework;
    // Save page status to local textbooks structure if page active
    if (activeInputTab === 'lehrwerk_page' && activeLehrwerkId && activePageNumber !== null) {
      try {
        const stored = localStorage.getItem('student_lehrwerke_progress');
        const parsed = stored ? JSON.parse(stored) : [];

        // Map status/homework form values back to local textbook format
        let pageStatus: 'locked' | 'homework' | 'mastered' | 'purple' = 'locked';
        if (status === 'MASTERED') {
          pageStatus = 'mastered';
        } else if (status === 'THEORY_DONE') {
          pageStatus = 'purple';
        } else if (isCurrentHomework || (status === 'IN_PROGRESS' && homeworkNotes.trim().length > 0)) {
          pageStatus = 'homework';
          targetHomework = true;
        }

        // Manage global page status (purple / info)
        const globalStored = localStorage.getItem('campus_lehrwerke');
        if (globalStored) {
          const books = JSON.parse(globalStored);
          const updatedBooks = books.map((b: any) => {
            if (b.id === activeLehrwerkId) {
              const globalPageStates = b.globalPageStates || {};
              if (pageStatus === 'purple') {
                globalPageStates[activePageNumber] = 'purple';
              } else {
                delete globalPageStates[activePageNumber];
              }
              return { ...b, globalPageStates };
            }
            return b;
          });
          localStorage.setItem('campus_lehrwerke', JSON.stringify(updatedBooks));
        }

        const updated = parsed.map((item: any) => {
          if (item.studentId === student.id && item.lehrwerkId === activeLehrwerkId) {
            const existingPageState = item.pageStates?.[activePageNumber] || {};
            return {
              ...item,
              pageStates: {
                ...item.pageStates,
                [activePageNumber]: {
                  ...existingPageState,
                  status: pageStatus,
                  notes: teacherNotes.trim(),
                  homeworkNotes: homeworkNotes.trim(),
                  studentNotes: studentNotes.trim(),
                  studentNotesIsPrivate: isStudentNotePrivate,
                  updatedAt: new Date(Date.now() + 10000).toISOString()
                }
              }
            };
          }
          return item;
        });

        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
        setAssignedLehrwerke(updated.filter((item: any) => item.studentId === student.id));
      } catch (err) {
        console.error('Error saving textbook local progress:', err);
      }
    }

    // Save to active song skills and progress matrix if active song selected
    if (activeInputTab === 'active_song' && selectedActiveSongId) {
      try {
        const noteToSave = songHomeworkNotes.trim();
        const finalHw = isCurrentHomework || noteToSave.length > 0;
        await triggerDirectSongSave(selectedActiveSongId, status, finalHw, noteToSave);
        setStudentNotesSavedToast(true);
        setTimeout(() => setStudentNotesSavedToast(false), 2500);
        if (!keepOpen) {
          setActiveSubView('hub');
          setActiveInputTab('free');
        }
        setSaving(false);
        return;
      } catch (err) {
        console.error('Error updating song skill and notes:', err);
      }
    }

    const isLehrwerkPage = (activeInputTab === 'lehrwerk_page');
    const isSong = (activeInputTab === 'active_song');

    const effectiveGeneralNotes = latestGeneralHomeworkNotesRef.current !== undefined
      ? latestGeneralHomeworkNotesRef.current
      : generalHomeworkNotes;
    const effectiveTeacherNotes = latestTeacherNotesRef.current !== undefined
      ? latestTeacherNotesRef.current
      : teacherNotes;

    const specialNotes = homeworkNotesList.filter(n => typeof n === 'string' && (n.startsWith('AUDIO:') || n.startsWith('STICKER:') || n.startsWith('FEEDBACK:') || n.startsWith('STUDENT_NOTE_')));
    const finalNotesList = [...specialNotes];
    if (!isLehrwerkPage && !isSong && effectiveGeneralNotes.trim().length > 0) {
      const noteLines = effectiveGeneralNotes.split('\n').map(s => s.trim()).filter(Boolean);
      noteLines.forEach(line => {
        if (!finalNotesList.includes(line)) {
          finalNotesList.push(line);
        }
      });
    }
    if (!isLehrwerkPage && !isSong) {
      if (sourceTransferData.sourceLW.length > 0) {
        finalNotesList.push(`SNAPSHOT_LEHRWERKE:${JSON.stringify(sourceTransferData.sourceLW)}`);
      }
      if (sourceTransferData.sourceS.length > 0) {
        finalNotesList.push(`SNAPSHOT_SONGS:${JSON.stringify(sourceTransferData.sourceS)}`);
      }
    }
    const combinedHomeworkNotes = JSON.stringify(finalNotesList);

    const hasHomeworkText = isSong ? songHomeworkNotes.trim().length > 0 : (isLehrwerkPage ? pageHomeworkNotes.trim().length > 0 : finalNotesList.length > 0);
    const isExplicitHomework = targetHomework !== undefined ? targetHomework : isCurrentHomework;
    const finalIsCurrentHomework = isSong 
      ? (isCurrentHomework || songHomeworkNotes.trim().length > 0)
      : (isLehrwerkPage
          ? (isCurrentHomework || pageHomeworkNotes.trim().length > 0)
          : (isExplicitHomework || hasHomeworkText));

    const payload = {
      id: activeItem?.id,
      studentId: student.id,
      topicName: finalTopicName,
      status,
      isCurrentHomework: finalIsCurrentHomework,
      teacherNotes: effectiveTeacherNotes.trim(),
      homeworkNotes: isSong ? songHomeworkNotes.trim() : (isLehrwerkPage ? pageHomeworkNotes.trim() : combinedHomeworkNotes)
    };

    try {
      // Clean up any unassigned textbooks' homework status in the database
      const unassignedHWItems = progressItems.filter(item => {
        if (!item.is_current_homework) return false;
        if (item.topic_name.includes(' - Seite ')) {
          const parts = item.topic_name.split(' - Seite ');
          const bookTitle = parts[0].trim();
          const book = globalLehrwerke.find(g => g.title === bookTitle);
          const isBookAssigned = book && assignedLehrwerke.some(a => a.lehrwerkId === book.id);
          return !isBookAssigned;
        }
        return false;
      });

      if (unassignedHWItems.length > 0) {
        const unassignedIds = unassignedHWItems.map(item => item.id).filter(Boolean);
        if (unassignedIds.length > 0) {
          await supabase
            .from('progress_matrix')
            .update({ is_current_homework: false })
            .in('id', unassignedIds);
        }
      }

      // Direct reliable Supabase persistence
      const activeTId = await getCurrentTeacherId();
      const currentWeek = getISOWeek();

      const rowHomeworkNotes = isSong
        ? songHomeworkNotes.trim()
        : (isLehrwerkPage
            ? pageHomeworkNotes.trim()
            : combinedHomeworkNotes);

      const row = {
        student_id: student.id,
        teacher_id: activeTId,
        topic_name: finalTopicName,
        status,
        is_current_homework: finalIsCurrentHomework,
        teacher_notes: effectiveTeacherNotes.trim(),
        homework_notes: rowHomeworkNotes,
        updated_at: new Date().toISOString()
      };

      // Immediate local backup (only for general homework notes)
      if (!isLehrwerkPage && !isSong) {
        try {
          localStorage.setItem(`campus_homework_notes_${student.id}`, combinedHomeworkNotes);
          localStorage.setItem(`campus_homework_week_${student.id}`, currentWeek);
          localStorage.setItem(`campus_teacher_notes_${student.id}`, effectiveTeacherNotes.trim());
        } catch (lsErr) {
          console.warn('[Meisterwerk] localStorage backup notice:', lsErr);
        }
      }

      let dbError;
      if (activeItem?.id) {
        const { error } = await supabase
          .from('progress_matrix')
          .update(row)
          .eq('id', activeItem.id);
        dbError = error;
      } else {
        // Find if there is an entry with the same topic name in the current calendar week
        const existingThisWeek = progressItems.find(item => 
          item.topic_name === finalTopicName && 
          item.updated_at && 
          getISOWeek(item.updated_at) === currentWeek
        );

        if (existingThisWeek?.id) {
          const { error } = await supabase
            .from('progress_matrix')
            .update(row)
            .eq('id', existingThisWeek.id);
          dbError = error;
        } else {
          const { error } = await supabase
            .from('progress_matrix')
            .insert(row);
          dbError = error;
        }
      }

      if (dbError) throw dbError;

      // 👥 DUO & GRUPPENUNTERRICHT: Sync shared homework note row to all sibling students in the group
      if (effectiveGroupStudents.length > 1) {
        const otherStudents = effectiveGroupStudents.filter(s => s.id && s.id !== student.id);
        for (const otherStud of otherStudents) {
          try {
            if (!isLehrwerkPage && !isSong) {
              localStorage.setItem(`campus_homework_notes_${otherStud.id}`, combinedHomeworkNotes);
              localStorage.setItem(`campus_homework_week_${otherStud.id}`, currentWeek);
            }
            const otherRow = {
              student_id: otherStud.id,
              teacher_id: activeTId,
              topic_name: finalTopicName,
              status,
              is_current_homework: finalIsCurrentHomework,
              teacher_notes: effectiveTeacherNotes.trim(),
              homework_notes: rowHomeworkNotes,
              updated_at: new Date().toISOString()
            };
            const { data: existingSiblingRows } = await supabase
              .from('progress_matrix')
              .select('id, updated_at')
              .eq('student_id', otherStud.id)
              .eq('topic_name', finalTopicName);

            const siblingMatch = existingSiblingRows?.find((r: any) => r.updated_at && getISOWeek(r.updated_at) === currentWeek) || existingSiblingRows?.[0];
            if (siblingMatch?.id) {
              await supabase
                .from('progress_matrix')
                .update(otherRow)
                .eq('id', siblingMatch.id);
            } else {
              await supabase
                .from('progress_matrix')
                .insert(otherRow);
            }
          } catch (grpErr) {
            console.warn('[Meisterwerk] Group student sync notice:', otherStud.id, grpErr);
          }
        }
      }

      if (!isLehrwerkPage && !isSong) {
        await syncHomeworkNotes(finalNotesList);
      }

      if (targetHomework && !isCurrentHomework) {
        setIsCurrentHomework(true);
      }

      await fetchProgress();
      notifyHomeworkChange();
      setStudentNotesSavedToast(true);
      setTimeout(() => setStudentNotesSavedToast(false), 2500);

      setHomeworkNotesList(finalNotesList);
      setHasChanges(false);
    } catch (err: any) {
      console.error('Error saving progress:', err);
      setError('Fehler beim Speichern des Fortschritts.');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignSongFromCatalog = async (songId: string) => {
    if (!songId) return;
    
    // Check if already in active songs
    const existing = activeSongSkills.find((s: any) => s.song_id === songId);
    if (existing) {
      selectActiveSong(existing);
      return;
    }

    try {
      const song = songs.find(s => s.id === songId);
      if (!song) return;

      const defaultInstrument = activeSongSkills[0]?.instrument || 
        globalLehrwerke.find(l => assignedLehrwerke.some(a => a.lehrwerkId === l.id))?.instrument || 
        'Gitarre';

      const { data: newSkill, error } = await supabase
        .from('user_song_skills')
        .insert({
          user_id: student.id,
          song_id: songId,
          instrument: defaultInstrument,
          progress_percent: 0,
          is_stage_ready: false
        })
        .select('*, songs(*)')
        .single();

      if (error) throw error;

      await loadActiveSongSkills();
      
      if (newSkill) {
        selectActiveSong(newSkill);
      } else {
        const { data: refreshedSkills } = await supabase
          .from('user_song_skills')
          .select('*, songs(*)')
          .eq('user_id', student.id);
        if (refreshedSkills) {
          const found = refreshedSkills.find((s: any) => s.song_id === songId);
          if (found) selectActiveSong(found);
        }
      }
      
      setSongSearch('');
      setSelectedSongId('');
    } catch (e) {
      console.error('Error assigning song from catalog:', e);
      setError('Fehler beim Hinzufügen des Songs.');
    }
  };

  const handleCreateAndAssignSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSongTitle.trim() || !newSongArtist.trim()) {
      alert('Bitte Titel und Künstler ausfüllen.');
      return;
    }

    try {
      // Get student's school ID
      let schoolId = '';
      const { data: studentUser, error: studentError } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', student.id)
        .maybeSingle();

      if (studentUser?.school_id) {
        schoolId = studentUser.school_id;
      } else {
        // Fallback: Get current authenticated teacher's school ID
        const activeTId = await getCurrentTeacherId();
        const { data: teacherUser } = await supabase
          .from('users')
          .select('school_id')
          .eq('id', activeTId)
          .maybeSingle();
        if (teacherUser?.school_id) {
          schoolId = teacherUser.school_id;
        }
      }

      if (!schoolId) {
        alert('Schule des Schülers konnte nicht ermittelt werden.');
        return;
      }

      // 1. Insert into songs catalog (Teacher's Campus Mediathek)
      const activeTId = teacherId || await getCurrentTeacherId();
      const { data: createdSong, error: songError } = await supabase
        .from('songs')
        .insert({
          title: newSongTitle.trim(),
          artist: newSongArtist.trim(),
          school_id: schoolId,
          is_campus_active: true,
          is_groovelab_active: false,
          teacher_id: activeTId || null
        })
        .select()
        .maybeSingle();

      if (songError) throw songError;
      if (!createdSong) {
        // If exact title/artist already exists, fetch it instead of failing
        const { data: existingSongs } = await supabase
          .from('songs')
          .select('*')
          .eq('title', newSongTitle.trim())
          .eq('artist', newSongArtist.trim())
          .eq('school_id', schoolId);
        
        if (existingSongs && existingSongs.length > 0) {
          // Use the existing song
          const matchedSong = existingSongs[0];
          await assignSongToStudent(matchedSong, schoolId);
        } else {
          throw new Error('Song-Erstellung schlug fehl.');
        }
      } else {
        await assignSongToStudent(createdSong, schoolId);
      }
    } catch (err: any) {
      console.error('Error creating custom song:', err);
      setError('Fehler beim Erstellen des Songs.');
    }
  };

  const handleCreateAndAssignLehrwerk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLehrwerkTitle.trim()) return;

    setNewLehrwerkLoading(true);
    try {
      const schoolId = propSchoolId || student?.school_id || (student as any)?.schoolId || studentSchoolId || sessionStorage.getItem('groovelab_school_id') || localStorage.getItem('campus_school_id') || localStorage.getItem('groovelab_school_id') || localStorage.getItem('school_id');
      const totalPages = parseInt(newLehrwerkPages, 10) || 50;

      let createdId = `custom-${Date.now()}`;
      let createdBook: any = null;

      try {
        const { data: newLehrwerk, error } = await supabase
          .from('lehrwerke')
          .insert({
            title: newLehrwerkTitle.trim(),
            total_pages: totalPages,
            school_id: schoolId || null,
            teacher_id: teacherId || null
          })
          .select('*')
          .single();

        if (!error && newLehrwerk) {
          createdId = newLehrwerk.id;
          createdBook = {
            ...newLehrwerk,
            totalPages: newLehrwerk.total_pages || totalPages,
            emoji: '📚',
            color: '#34a853'
          };
        }
      } catch (err) {
        console.warn('Supabase insert lehrwerke fallback to local:', err);
      }

      if (!createdBook) {
        createdBook = {
          id: createdId,
          title: newLehrwerkTitle.trim(),
          total_pages: totalPages,
          totalPages: totalPages,
          emoji: '📚',
          color: '#34a853'
        };
      }

      // 1. Cache custom book in local storage
      try {
        const storedCustom = localStorage.getItem('custom_lehrwerke');
        const parsedCustom = storedCustom ? JSON.parse(storedCustom) : [];
        const updatedCustom = [...parsedCustom.filter((b: any) => b.id !== createdBook.id), createdBook];
        localStorage.setItem('custom_lehrwerke', JSON.stringify(updatedCustom));
      } catch {}

      // 2. Assign to student in localStorage & state with title
      const stored = localStorage.getItem('student_lehrwerke_progress');
      const parsed = stored ? JSON.parse(stored) : [];
      const isStudentCreator = readOnly || !teacherId;
      if (!parsed.some((item: any) => item.studentId === student.id && item.lehrwerkId === createdId)) {
        const newAssignment = {
          studentId: student.id,
          lehrwerkId: createdId,
          bookTitle: newLehrwerkTitle.trim(),
          lehrwerkTitle: newLehrwerkTitle.trim(),
          totalPages: totalPages,
          assignedAt: new Date().toISOString(),
          createdByRole: isStudentCreator ? 'student' : 'teacher',
          isStudentCreated: isStudentCreator,
          pageStates: {}
        };
        const updated = [...parsed, newAssignment];
        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
      }

      await loadLehrwerke();
      setGlobalLehrwerke(prev => [...prev.filter(b => b.id !== createdId), createdBook]);
      setActiveLehrwerkId(createdId);
      setShowCreateLehrwerkModal(false);
      setNewLehrwerkTitle('');
      setNewLehrwerkPages('50');
    } catch (err: any) {
      console.error('Error creating custom lehrwerk:', err);
    } finally {
      setNewLehrwerkLoading(false);
    }
  };

  const assignSongToStudent = async (song: any, schoolId: string) => {
    // Refresh catalog local list
    const activeTId = teacherId || await getCurrentTeacherId();
    let sq = supabase
      .from('songs')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_campus_active', true);
    if (activeTId && isTeacherTools) {
      sq = sq.eq('teacher_id', activeTId);
    }
    const { data: refreshedSongs } = await sq.order('title', { ascending: true });
    if (refreshedSongs) {
      setSongs(refreshedSongs);
    }

    // 2. Assign to student details
    const defaultInstrument = activeSongSkills[0]?.instrument || 
      globalLehrwerke.find(l => assignedLehrwerke.some(a => a.lehrwerkId === l.id))?.instrument || 
      'Gitarre';

    // Verify if already assigned
    const existing = activeSongSkills.find((s: any) => s.song_id === song.id);
    if (existing) {
      selectActiveSong(existing);
      setNewSongTitle('');
      setNewSongArtist('');
      setShowCreateSongModal(false);
      return;
    }

    const { data: newSkill, error: skillError } = await supabase
      .from('user_song_skills')
      .insert({
        user_id: student.id,
        song_id: song.id,
        instrument: defaultInstrument,
        progress_percent: 0,
        is_stage_ready: false
      })
      .select('*, songs(*)')
      .maybeSingle();

    if (skillError) throw skillError;

    await loadActiveSongSkills();

    if (newSkill) {
      selectActiveSong(newSkill);
    } else {
      const { data: refreshedSkills } = await supabase
        .from('user_song_skills')
        .select('*, songs(*)')
        .eq('user_id', student.id);
      if (refreshedSkills) {
        const found = refreshedSkills.find((s: any) => s.song_id === song.id);
        if (found) selectActiveSong(found);
      }
    }

    // Reset modal fields
    setNewSongTitle('');
    setNewSongArtist('');
    setShowCreateSongModal(false);
  };

  // Unified canonical active songs resolver (combines user_song_skills, progressItems/homework, songs catalog, and localStorage)
  const resolvedActiveSongs = useMemo(() => {
    const songsMap = new Map<string, any>();

    // 1. From activeSongSkills (Direct user assignments in user_song_skills)
    (activeSongSkills || []).forEach((skill: any) => {
      const songObj = skill.songs || {};
      const title = songObj.title || skill.title || skill.song_title || '';
      const artist = songObj.artist || skill.artist || 'Unbekannt';
      const id = skill.id || songObj.id || skill.song_id;
      if (title) {
        const normKey = getNormalizedSongTitle(skill) || title.toLowerCase().trim();
        const localHw = localStorage.getItem(`song_hw_${student.id}_${id}`) ??
                        (skill.song_id ? localStorage.getItem(`song_hw_${student.id}_${skill.song_id}`) : null) ??
                        (songObj.id ? localStorage.getItem(`song_hw_${student.id}_${songObj.id}`) : null);
        const isHw = (localHw === 'true') || (localHw !== 'false' && Boolean(skill.is_current_homework));
        const localNote = localStorage.getItem(`song_note_${student.id}_${id}`) ||
                          (skill.song_id ? localStorage.getItem(`song_note_${student.id}_${skill.song_id}`) : '') ||
                          (songObj.id ? localStorage.getItem(`song_note_${student.id}_${songObj.id}`) : '') ||
                          skill.homework_notes ||
                          skill.teacher_notes ||
                          '';

        songsMap.set(normKey, {
          ...skill,
          id,
          title,
          artist,
          progress_percent: skill.progress_percent || 0,
          is_stage_ready: Boolean(skill.is_stage_ready || skill.progress_percent === 100),
          status: skill.status || (skill.progress_percent === 100 ? 'MASTERED' : 'IN_PROGRESS'),
          is_current_homework: isHw,
          homework_notes: localNote,
          songs: songObj.title ? songObj : { id: skill.song_id || id, title, artist, teacher_id: skill.teacher_id }
        });
      }
    });

    // 2. From progressItems (Direct assignments in progress_matrix / homework notes for assigned songs)
    (progressItems || []).forEach((item: any) => {
      const rawTopic = (item.topic_name || item.title || '').trim();
      if (!rawTopic || rawTopic.startsWith('Hausaufgabe KW ') || rawTopic.includes(' - Seite ') || rawTopic.toLowerCase().trim() === 'test') return;

      const normKey = getNormalizedSongTitle(item) || rawTopic.toLowerCase().trim();
      const existing = songsMap.get(normKey) || Array.from(songsMap.values()).find(s => isSongMatch(item, s));

      const localHw = localStorage.getItem(`song_hw_${student.id}_${item.id}`) ??
                      (item.song_id ? localStorage.getItem(`song_hw_${student.id}_${item.song_id}`) : null);
      const isHw = (localHw === 'true') || (localHw !== 'false' && Boolean(item.is_current_homework));
      const localNote = localStorage.getItem(`song_note_${student.id}_${item.id}`) ||
                        (item.song_id ? localStorage.getItem(`song_note_${student.id}_${item.song_id}`) : '') ||
                        item.homework_notes ||
                        item.teacher_notes ||
                        '';

      if (existing) {
        if (isHw) existing.is_current_homework = true;
        if (item.status === 'MASTERED') {
          existing.status = 'MASTERED';
          existing.is_stage_ready = true;
          existing.progress_percent = 100;
        }
        if (localNote) existing.homework_notes = localNote;
      } else {
        const matchedCatalogSong = (songs || []).find((catSong: any) => 
          catSong.id === item.song_id || isSongMatch(item, catSong)
        );

        let title = rawTopic.replace(/\s*\([^)]*\)\s*$/, '').trim();
        let artist = 'Unbekannt';
        if (matchedCatalogSong) {
          title = matchedCatalogSong.title || title;
          artist = matchedCatalogSong.artist || 'Unbekannt';
        } else if (title.includes(' - ')) {
          const parts = title.split(' - ');
          artist = parts[0].trim();
          title = parts.slice(1).join(' - ').trim();
        }

        const songId = item.song_id || matchedCatalogSong?.id || item.id;
        songsMap.set(normKey, {
          id: songId,
          song_id: songId,
          title,
          artist,
          progress_percent: item.progress_percent || (item.status === 'MASTERED' ? 100 : (item.score ? Math.min(100, item.score * 10) : 0)),
          is_stage_ready: Boolean(item.status === 'MASTERED' || (item.score && item.score >= 10)),
          status: item.status || (item.score && item.score >= 10 ? 'MASTERED' : 'IN_PROGRESS'),
          is_current_homework: isHw,
          homework_notes: localNote,
          songs: matchedCatalogSong || { id: songId, title, artist, teacher_id: item.teacher_id }
        });
      }
    });

    // 3. From songs catalog / initialSongs (Campus active songs assigned to student)
    (songs || []).forEach((s: any) => {
      if (!s.title) return;
      const normKey = (getNormalizedSongTitle(s) || s.title).toLowerCase().trim();
      if (songsMap.has(normKey)) return;

      const isAssigned = (progressItems || []).some((item: any) => isSongMatch(item, s));
      if (isAssigned) {
        const localHw = localStorage.getItem(`song_hw_${student.id}_${s.id}`) === 'true' || Boolean(s.is_current_homework);
        const localNote = localStorage.getItem(`song_note_${student.id}_${s.id}`) || s.homework_notes || s.teacher_notes || '';
        songsMap.set(normKey, {
          ...s,
          id: s.id || normKey,
          song_id: s.id || normKey,
          title: s.title,
          artist: s.artist || 'Unbekannt',
          progress_percent: s.progress_percent || 0,
          is_stage_ready: Boolean(s.is_stage_ready || s.progress_percent === 100),
          status: s.status || 'IN_PROGRESS',
          is_current_homework: localHw,
          homework_notes: localNote,
          songs: s
        });
      }
    });

    return Array.from(songsMap.values());
  }, [activeSongSkills, progressItems, songs, student.id]);

  // 🎵 Extrahierte Liste verfügbarer Schüler-Songs für das 1-Tap Song-Tagging (+Tag)
  // 🎵 Extrahierte Liste verfügbarer Schüler-Songs & Lehrwerke für das 1-Tap Tagging (+Zuordnen)
  const availableSongsForTagging = useMemo(() => {
    const list: { title: string; artist?: string; fullLabel: string; type?: 'song' | 'book' }[] = [];
    const seen = new Set<string>();

    const addSong = (rawTitle: string, rawArtist?: string) => {
      if (!rawTitle) return;
      const parsed = parseSongArtistAndTitle(rawTitle);
      const title = parsed.title;
      const artist = rawArtist || parsed.artist;
      const fullLabel = artist ? `${artist} - ${title}` : title;
      const norm = title.toLowerCase().trim();
      if (!norm || seen.has(norm)) return;
      seen.add(norm);
      list.push({ title, artist, fullLabel, type: 'song' });
    };

    const addBook = (rawTitle: string) => {
      if (!rawTitle) return;
      const title = cleanSongOrBookTitle(rawTitle);
      const norm = title.toLowerCase().trim();
      if (!norm || seen.has(norm) || norm === 'test') return;
      seen.add(norm);
      list.push({ title, fullLabel: title, type: 'book' });
    };

    // 1. Lehrwerke from globalLehrwerke
    (globalLehrwerke || []).forEach((b: any) => {
      if (b && b.title) addBook(b.title);
    });

    // 2. From assignedLehrwerke
    (assignedLehrwerke || []).forEach((a: any) => {
      if (a && a.title) addBook(a.title);
    });

    // 3. From resolvedActiveSongs
    (resolvedActiveSongs || []).forEach((s: any) => {
      const t = s.title || s.songs?.title;
      const a = s.artist || s.songs?.artist;
      if (t) addSong(t, a);
    });

    // 4. From activeSongSkills
    (activeSongSkills || []).forEach((s: any) => {
      const t = s.songs?.title || s.title || s.song_title;
      const a = s.songs?.artist || s.artist;
      if (t) addSong(t, a);
    });

    // 5. From progressItems
    (progressItems || []).forEach((p: any) => {
      const topic = (p.topic_name || p.title || '').trim();
      if (topic && !topic.startsWith('Hausaufgabe KW ') && topic.toLowerCase() !== 'test') {
        if (topic.includes(' - Seite ') || topic.toLowerCase().includes('lehrwerk') || topic.toLowerCase().includes('buch') || topic.toLowerCase().includes('fitness')) {
          addBook(topic);
        } else {
          addSong(topic);
        }
      }
    });

    // 6. From student songs if available
    if (Array.isArray((student as any)?.songs)) {
      (student as any).songs.forEach((s: any) => {
        if (typeof s === 'string') addSong(s);
        else if (s && s.title) addSong(s.title, s.artist);
      });
    }

    return list;
  }, [globalLehrwerke, assignedLehrwerke, resolvedActiveSongs, activeSongSkills, progressItems, (student as any)?.songs]);

  const isBookAlbum = useCallback((rawTitle: string): boolean => {
    if (!rawTitle) return false;
    const norm = rawTitle.toLowerCase().trim();
    const matched = availableSongsForTagging.find(item => item.title.toLowerCase().trim() === norm || item.fullLabel.toLowerCase().trim() === norm);
    if (matched && matched.type) return matched.type === 'book';
    return norm.includes('lehrwerk') || norm.includes('buch') || norm.includes('schule') || norm.includes('band ') || norm.includes('heft') || norm.includes('methode') || norm.includes('fitness') || norm.includes(' - seite ');
  }, [availableSongsForTagging]);

  const activeBook = activeLehrwerkId ? globalLehrwerke.find(g => g.id === activeLehrwerkId) : null;
  const activeSong = selectedActiveSongId ? (resolvedActiveSongs.find(s => s.id === selectedActiveSongId || s.song_id === selectedActiveSongId) || activeSongSkills.find(s => s.id === selectedActiveSongId)) : null;
  const bookColor = (activeBook && activeSubView === 'lehrwerk') 
    ? getLehrwerkColor(activeBook.title) 
    : (activeSong && activeSubView === 'song') 
      ? getSongColor(activeSong.songs?.title || activeSong.title || 'Song') 
      : null;

  const renderArchivButton = (isMobile: boolean = false) => {
    if (isTeacherTools) return null;
    const isHistoryActive = activeSubView === 'history' && activeViewMode === 'document';
    return (
      <button
        type="button"
        onClick={() => {
          if (isHistoryActive) {
            setActiveSubView('hub');
          } else {
            setActiveModalTab('document');
            setActiveViewMode('document');
            setActiveSubView('history');
            const existingWeeks = progressItems
              .filter(item => item.updated_at)
              .map(item => getItemWeek(item))
              .filter(Boolean);
            let weeks: string[] = [];
            if (existingWeeks.length > 0) {
              const sortedExisting = [...existingWeeks].sort();
              const earliestWeek = sortedExisting[0];
              const currentWeek = getISOWeek();
              const latestExisting = sortedExisting[sortedExisting.length - 1];
              const endWeek = currentWeek > latestExisting ? currentWeek : latestExisting;
              weeks = getWeeksBetween(earliestWeek, endWeek);
            } else {
              weeks = [getISOWeek()];
            }
            if (weeks.length > 0) {
              setSelectedHistoryWeek(weeks[0]);
            }
          }
        }}
        style={{
          background: isHistoryActive ? '#34a853' : 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#ffffff',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.2s ease',
          marginRight: '4px',
          flexShrink: 0
        }}
        className="hover-scale"
      >
        <History size={14} />
        <span>Archiv</span>
        {!isCampusActive && (
          <span style={{ fontSize: '0.60rem', background: 'rgba(255, 255, 255, 0.22)', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>Basis</span>
        )}
      </button>
    );
  };

  const renderSkillRadarButton = (isMobile: boolean = false) => {
    if (isTeacherTools) return null;
    const radarTitle = uiLevel === 'junior' ? 'Musik-Stern ⭐' : uiLevel === 'pro' ? 'Kompetenz-Radar' : 'Skill-Radar';
    return (
      <button
        type="button"
        onClick={() => { setActiveModalTab('skillradar'); setActiveSubView('hub'); }}
        title={!isCampusActive ? `${radarTitle} (Lehrer-Demo • Schüler im Basis-Status)` : radarTitle}
        aria-label={radarTitle}
        style={{
          background: activeModalTab === 'skillradar' ? '#34a853' : 'rgba(255,255,255,0.15)',
          border: isMobile ? 'none' : '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          height: isMobile ? 'auto' : '30px',
          padding: isMobile ? '6px 12px' : '0 10px 0 8px',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          cursor: 'pointer',
          color: '#ffffff',
          fontSize: isMobile ? '0.74rem' : '0.72rem',
          fontWeight: isMobile ? 800 : 700,
          transition: 'all 0.18s ease',
          flexShrink: 0,
          marginRight: isMobile ? '0' : '4px',
          whiteSpace: 'nowrap'
        }}
        className="hover-scale"
      >
        {uiLevel === 'junior' ? <Star size={isMobile ? 12 : 13} /> : <Activity size={isMobile ? 12 : 13} />}
        <span>{radarTitle}</span>
        {!isCampusActive && (
          <span style={{ fontSize: '0.60rem', background: 'rgba(255, 255, 255, 0.22)', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>Basis</span>
        )}
      </button>
    );
  };

  const renderSkillRadarTabContent = () => {
    return (
      <MeisterwerkSkillRadarTab
        progressItems={progressItems}
        generalHomeworkNotes={generalHomeworkNotes}
        latestGeneralHomeworkNotesRef={latestGeneralHomeworkNotesRef}
        homeworkNotes={homeworkNotes}
        homeworkNotesList={homeworkNotesList}
        skillOverrides={skillOverrides}
        pendingTargetFocusTags={pendingTargetFocusTags}
        readOnly={readOnly}
        isTeacherTools={isTeacherTools}
        isMobileView={isMobileView}
        useNotebookLayout={useNotebookLayout}
        uiLevel={uiLevel}
        teacherName={effectiveTeacherFullName}
        studentName={studentFirstName}
        instrumentName={studentInstrument || (student as any)?.instrument || (student as any)?.instrument_type || (student as any)?.instrument_name || ''}
        handleMasterAllSkills={handleMasterAllSkills}
        handleTriggerSkillQuest={handleTriggerSkillQuest}
        handleSetSkillLevel={handleSetSkillLevel}
        renderTextWithDidacticBadges={renderTextWithDidacticBadges}
      />
    );
  };

  const renderSchoolYearSelector = () => {
    const isArchived = selectedSchoolYear !== currentSchoolYear;
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <select
          value={selectedSchoolYear}
          onChange={(e) => setSelectedSchoolYear(e.target.value)}
          aria-label="Schuljahr auswählen"
          style={{
            background: isArchived ? '#fef3c7' : '#f8fafc',
            border: isArchived ? '1.5px solid #f59e0b' : '1px solid #cbd5e1',
            color: isArchived ? '#92400e' : '#334155',
            fontSize: '0.74rem',
            fontWeight: 800,
            padding: '3px 10px',
            borderRadius: '20px',
            cursor: 'pointer',
            outline: 'none',
            letterSpacing: '0.01em',
            boxShadow: isArchived ? '0 2px 6px rgba(245, 158, 11, 0.2)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          {availableSchoolYears.map(year => (
            <option key={year} value={year}>
              {year === currentSchoolYear ? `🎓 Schuljahr ${year} (Aktuell)` : `📚 Schuljahr ${year} (Archiv)`}
            </option>
          ))}
        </select>
        {isArchived && (
          <span style={{
            fontSize: '0.66rem',
            fontWeight: 850,
            padding: '2px 8px',
            background: '#fef3c7',
            border: '1px solid #fde68a',
            color: '#b45309',
            borderRadius: '12px'
          }}>
            🏆 Archiv-Modus
          </span>
        )}
      </div>
    );
  };


  const renderFullscreenButton = () => {
    return (
      <button
        type="button"
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
        style={{
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: isFullscreen ? '20px' : '50%',
          height: '30px',
          padding: isFullscreen ? '0 10px 0 8px' : '0',
          width: isFullscreen ? 'auto' : '30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '5px',
          cursor: 'pointer',
          color: '#ffffff',
          fontSize: '0.72rem',
          fontWeight: 700,
          transition: 'all 0.18s ease',
          flexShrink: 0,
          marginRight: '4px',
          whiteSpace: 'nowrap'
        }}
        className="hover-scale"
      >
        {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        {isFullscreen && <span>Vollbild beenden</span>}
      </button>
    );
  };

  const getCurrentHomeworkSnapshot = () => {
    // 1. School & Teacher Names
    let tName = resolvedTeacherName || effectiveTeacherFullName || propTeacherName || '';
    if (tName === 'Lehrkraft' || tName === 'deine Lehrkraft') {
      tName = '';
    }
    if (!tName && (student as any)?.teacher) {
      const f = formatTeacherFullName((student as any).teacher);
      if (f && f !== 'Lehrkraft') tName = f;
    }
    if (!tName && (student as any)?.teacher_name) {
      const f = formatTeacherFullName((student as any).teacher_name);
      if (f && f !== 'Lehrkraft') tName = f;
    }
    let sName = propSchoolName || (student as any)?.school_name || (student as any)?.schools?.name || '';

    try {
      const cacheKeys = ['groovelab_cached_user', 'campus_cached_user', 'campus_user', 'groovelab_user'];
      for (const k of cacheKeys) {
        if (tName && tName !== 'Lehrkraft' && sName) break;
        const raw = sessionStorage.getItem(k) || localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (!tName && (parsed.role === 'teacher' || parsed.role === 'admin' || isTeacherMode)) {
            const f = formatTeacherFullName(parsed);
            if (f && f !== 'Lehrkraft') {
              tName = f;
            }
          }
          if (!sName && parsed.school_name) {
            sName = parsed.school_name;
          }
        }
      }
      if (!sName) {
        sName = localStorage.getItem('groovelab_school_name') || localStorage.getItem('campus_school_name') || '';
      }
    } catch {}

    const rawTeacher = tName || (student as any)?.teacher_name || '';
    const finalTeacher = formatTeacherFullName(rawTeacher);
    const finalSchool = sName || 'Campus-Groovelab Musikschule';
    const finalInstrument = (student as any)?.instrument || (student as any)?.instrument_name || 'Gitarre';
    const stName = readOnly
      ? (student.first_name || 'Schüler/in').trim()
      : `${student.first_name || ''} ${student.last_name ? student.last_name.trim().charAt(0) + '.' : ''}`.trim() || 'Schüler/in';
    const stFirstName = (student.first_name || (student as any)?.name?.split(' ')[0] || 'Schüler').trim();
    const targetToken = (student as any)?.qr_token || (student as any)?.ausweis_nummer || '';
    const appUrl = getCanonicalQrLandingUrl(targetToken);
    const weekNum = getISOWeek().split('-W')[1] || '';

    // 2. Build 1:1 Structured Items
    const items: Array<{ type: 'song' | 'lehrwerk' | 'note'; title: string; subtitle?: string; notes?: string }> = [];

    // 2a. Songs from progressItems / activeSongSkills
    const uniqueItemsMap = new Map<string, any>();
    (progressItems || []).forEach(item => {
      const canonicalKey = getCanonicalSongKey(item);
      const normTitle = getNormalizedSongTitle(item).toLowerCase();
      const name = canonicalKey || normTitle || (item.topic_name || '').trim().toLowerCase();
      if (name && !uniqueItemsMap.has(name)) {
        uniqueItemsMap.set(name, item);
      }
    });

    const currentSongs: any[] = [];
    Array.from(uniqueItemsMap.values()).forEach(item => {
      if (item.is_current_homework && !item.topic_name?.includes(' - Seite ') && !item.topic_name?.startsWith('Hausaufgabe KW ')) {
        const rawArtist = (item.songs?.artist || item.artist || '').trim();
        const rawTitle = (item.songs?.title || item.song_title || item.title || '').trim();
        let displayTitle = rawTitle ? (rawArtist ? `${rawArtist} - ${rawTitle}` : rawTitle) : (item.topic_name || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
        displayTitle = formatSongTitleCase(displayTitle);
        const cachedNote = localStorage.getItem(`song_note_${student.id}_${item.id}`) ||
                           localStorage.getItem(`song_note_${student.id}_${item.song_id}`) ||
                           item.homework_notes || '';
        const cleanNote = capitalizeFirstLetter(getCleanPageNotes(cachedNote));
        currentSongs.push({
          title: displayTitle || 'Song',
          notes: cleanNote
        });
      }
    });

    (activeSongSkills || []).forEach(skill => {
      const isHwInLs = localStorage.getItem(`song_hw_${student.id}_${skill.id}`) === 'true' ||
                       localStorage.getItem(`song_hw_${student.id}_${skill.song_id}`) === 'true';
      if (isHwInLs) {
        const rawArtist = (skill.songs?.artist || skill.artist || '').trim();
        const rawTitle = (skill.songs?.title || skill.song_title || skill.title || '').trim();
        let displayTitle = rawTitle ? (rawArtist ? `${rawArtist} - ${rawTitle}` : rawTitle) : (skill.topic_name || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
        displayTitle = formatSongTitleCase(displayTitle);
        if (!currentSongs.some(s => s.title.toLowerCase() === displayTitle.toLowerCase())) {
          const cachedNote = localStorage.getItem(`song_note_${student.id}_${skill.id}`) ||
                             localStorage.getItem(`song_note_${student.id}_${skill.song_id}`) || '';
          const cleanNote = capitalizeFirstLetter(getCleanPageNotes(cachedNote));
          currentSongs.push({
            title: displayTitle || 'Song',
            notes: cleanNote
          });
        }
      }
    });

    currentSongs.forEach(song => {
      items.push({
        type: 'song',
        title: song.title,
        notes: song.notes ? `📌 Fahrplan: ${song.notes}` : undefined
      });
    });

    // 2b. Lehrwerke from assignedLehrwerke
    const groupedLehrwerke: Record<string, { pages: number[]; notes: string[] }> = {};
    (assignedLehrwerke || []).forEach(assignment => {
      const book = globalLehrwerke.find(g => g.id === assignment.lehrwerkId);
      if (!book || !assignment.pageStates) return;
      Object.entries(assignment.pageStates).forEach(([pNumStr, pState]: [string, any]) => {
        if (pState?.status === 'homework' || pState?.isCurrentHomework) {
          const pageNum = parseInt(pNumStr, 10);
          if (!isNaN(pageNum)) {
            if (!groupedLehrwerke[book.title]) {
              groupedLehrwerke[book.title] = { pages: [], notes: [] };
            }
            if (!groupedLehrwerke[book.title].pages.includes(pageNum)) {
              groupedLehrwerke[book.title].pages.push(pageNum);
              const cleanNote = capitalizeFirstLetter(getCleanPageNotes(pState.homeworkNotes || pState.homework_notes));
              if (cleanNote) {
                groupedLehrwerke[book.title].notes.push(`Seite ${pageNum}: ${cleanNote}`);
              }
            }
          }
        }
      });
    });

    Object.entries(groupedLehrwerke).forEach(([title, info]) => {
      info.pages.sort((a, b) => a - b);
      const pagesLabel = info.pages.length > 0 ? ` (S. ${info.pages.join(', ')})` : '';
      items.push({
        type: 'lehrwerk',
        title: `${title}${pagesLabel}`,
        notes: info.notes.length > 0 ? info.notes.join('; ') : undefined
      });
    });

    // 2c. Additional Homework Notes & Quick-Chips
    const noteItems = getHomeworkNoteItems(generalHomeworkNotes);
    if (noteItems.length > 0) {
      noteItems.forEach(note => {
        const cleanT = capitalizeFirstLetter(cleanNotesText(note).trim());
        if (cleanT && !cleanT.startsWith('[AUDIO:') && !cleanT.startsWith('AUDIO:')) {
          items.push({
            type: 'note',
            title: cleanT
          });
        }
      });
    }

    if (homeworkNotesList && homeworkNotesList.length > 0) {
      homeworkNotesList.forEach(note => {
        const cleanT = capitalizeFirstLetter(cleanNotesText(note).trim());
        if (cleanT && !cleanT.startsWith('[AUDIO:') && !cleanT.startsWith('AUDIO:') && !items.some(it => it.title === cleanT)) {
          items.push({
            type: 'note',
            title: cleanT
          });
        }
      });
    }

    if (items.length === 0) {
      items.push({
        type: 'note',
        title: 'Aktuelle Übungen aus dem Unterricht wie besprochen fortführen.'
      });
    }

    // 3. Audio Recordings List
    const audioList: Array<{ label: string; duration?: string; url?: string }> = (homeworkNotesList || [])
      .map((note, idx) => ({ note: typeof note === 'string' ? note : String(note || ''), idx }))
      .filter(item => item.note.includes("AUDIO:"))
      .map((item, index) => {
        const cleanStr = item.note.startsWith('[') ? item.note.replace(/[\[\]"]/g, '') : item.note;
        const parts = cleanStr.substring(cleanStr.indexOf('AUDIO:') + 6).split('|');
        const durSec = parseInt(parts[1] || '0', 10);
        const durStr = durSec > 0 ? `${Math.floor(durSec / 60)}:${String(durSec % 60).padStart(2, '0')}` : undefined;
        const rawLabel = parts[3]?.trim() || `Aufnahme #${index + 1}`;
        return {
          label: capitalizeFirstLetter(rawLabel),
          duration: durStr,
          url: parts[0]?.trim()
        };
      })
      .filter(a => !!a.url);

    return {
      studentName: stName,
      studentFirstName: stFirstName,
      teacherName: finalTeacher,
      schoolName: finalSchool,
      instrument: finalInstrument,
      weekNumber: weekNum,
      date: new Date().toLocaleDateString('de-DE'),
      qrToken: targetToken,
      appUrl,
      items,
      audioRecordings: audioList
    };
  };

  const handlePrintCurrentHomework = async () => {
    try {
      const snap = getCurrentHomeworkSnapshot();
      await generateStudentHomeworkPrintoutPDF({
        schoolName: snap.schoolName,
        studentName: snap.studentName,
        instrument: snap.instrument,
        teacherName: snap.teacherName,
        items: snap.items,
        audioRecordings: snap.audioRecordings,
        weekNumber: snap.weekNumber,
        date: snap.date,
        qrToken: snap.qrToken,
        hasAudioRecordings: snap.audioRecordings.length > 0
      });
    } catch (err) {
      console.warn('[PrintHomework] PDF Generation error:', err);
    }
  };

  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setIsShareMenuOpen(false);
      }
    };
    if (isShareMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isShareMenuOpen]);

  const getHomeworkFormattedSummary = () => {
    const snap = getCurrentHomeworkSnapshot();
    const sections: string[] = [];

    // 1. Lehrwerke (mit Seiten & Hinweisen)
    const lehrwerke = snap.items.filter(it => it.type === 'lehrwerk');
    if (lehrwerke.length > 0) {
      const lwLines = lehrwerke.map(lw => {
        if (lw.notes) {
          const cleanN = capitalizeFirstLetter(lw.notes.replace(/^[📌📝•-]\s*/, '').trim());
          return `• ${lw.title}\n  Hinweis: ${cleanN}`;
        }
        return `• ${lw.title}`;
      });
      sections.push(`LEHRWERKE\n${lwLines.join('\n\n')}`);
    }

    // 2. Songs (mit Titel & Fahrplan)
    const songs = snap.items.filter(it => it.type === 'song');
    if (songs.length > 0) {
      const songLines = songs.map(s => {
        if (s.notes) {
          const cleanF = capitalizeFirstLetter(s.notes.replace(/^[📌📝•-]\s*(Fahrplan:\s*)?/i, '').trim());
          return `• ${s.title}\n  Fahrplan: ${cleanF}`;
        }
        return `• ${s.title}`;
      });
      sections.push(`SONGS & REPERTOIRE\n${songLines.join('\n\n')}`);
    }

    // 3. Zusatz-Notizen
    const notes = snap.items.filter(it => it.type === 'note');
    if (notes.length > 0) {
      const noteLines = notes.map(n => `• ${capitalizeFirstLetter(n.title.replace(/^[📌📝•-]\s*/, '').trim())}`);
      sections.push(`NOTIZEN\n${noteLines.join('\n')}`);
    }

    // 4. Unterrichtsaufnahmen (Reine Anzahl)
    const audioCount = snap.audioRecordings ? snap.audioRecordings.length : 0;
    if (audioCount > 0) {
      const recordingLabel = audioCount === 1 ? '1 neue Aufnahme' : `${audioCount} neue Aufnahmen`;
      sections.push(`UNTERRICHTSAUFNAHMEN\n• ${recordingLabel} in der Web-App hinterlegt`);
    }

    const tasksBlock = sections.length > 0 
      ? sections.join('\n\n') 
      : '• Aktuelle Übungen aus dem Unterricht wie besprochen fortführen.';

    const divider = '────────────────────────────────────────';
    const shareSubject = `Wochenplan KW ${snap.weekNumber} • ${snap.studentFirstName} • ${snap.schoolName}`;
    const teacherSignOff = snap.teacherName && snap.teacherName !== 'Lehrkraft' && snap.teacherName !== 'deine Lehrkraft'
      ? snap.teacherName 
      : 'Deine Lehrkraft';

    const cleanSchoolName = snap.schoolName || 'Campus-Groovelab';
    const closingSchool = !cleanSchoolName.toLowerCase().includes('campus-groovelab')
      ? `${cleanSchoolName} • Campus-Groovelab`
      : cleanSchoolName;

    const shareBody = `Hallo ${snap.studentFirstName},\n\nhier ist dein Wochenplan mit den aktuellen Übezielen aus unserem Unterricht:\n\n${divider}\nÜBE-ZIELE • KW ${snap.weekNumber}\n${divider}\n\n${tasksBlock}\n\n${divider}\nINTERAKTIVE WEB-APP\nUnterrichtsaufnahmen, Song-Bibliothek und Übe-Timer:\n${snap.appUrl}\n\nHerzliche Grüße\n${teacherSignOff}\n${closingSchool}`;

    return {
      shareSubject,
      shareBody,
      appUrl: snap.appUrl
    };
  };

  const handleShareMessenger = async () => {
    const { shareSubject, shareBody } = getHomeworkFormattedSummary();
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareSubject,
          text: shareBody
        });
        setIsShareMenuOpen(false);
        return;
      } catch (e) {}
    }
    handleCopyShareLink();
  };

  const handleShareEmail = () => {
    const { shareSubject, shareBody } = getHomeworkFormattedSummary();
    const mailUrl = `mailto:?subject=${encodeURIComponent(shareSubject)}&body=${encodeURIComponent(shareBody)}`;
    window.location.href = mailUrl;
    setIsShareMenuOpen(false);
  };

  const handleCopyShareLink = () => {
    try {
      const { shareBody } = getHomeworkFormattedSummary();
      const success = copyTextToClipboard(shareBody);
      if (success) {
        setIsLinkCopied(true);
        setTimeout(() => setIsLinkCopied(false), 2500);
      }
    } catch (e) {
      console.warn('Clipboard write failed', e);
    }
  };

  const handleNativeShare = async () => {
    const { shareSubject, shareBody, appUrl } = getHomeworkFormattedSummary();
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: shareSubject,
          text: shareBody,
          url: appUrl
        });
        setIsShareMenuOpen(false);
      } catch (err) {
        // Fallback / dismissed
      }
    }
  };



  const handleSendTeacherRecommendation = async () => {
    if (!student?.id) return;
    setIsSavingRec(true);
    try {
      const existingPermissions = (student as any)?.parent_permissions || propParentPermissions || {};
      const updatedPermissions = {
        ...existingPermissions,
        teacher_recommendation: {
          teacher_id: teacherId || "",
          teacher_name: effectiveTeacherFullName || "Fachlehrkraft",
          recommended_level: recTargetLevel,
          note: recNote.trim() || `${studentFirstName} macht tolle Fortschritte und ist bereit für zusätzliche Funktionen.`,
          created_at: new Date().toISOString(),
          dismissed: false
        }
      };

      const { error } = await supabase
        .from("users")
        .update({ parent_permissions: updatedPermissions })
        .eq("id", student.id);

      if (error) throw error;
      setRecSuccess(true);
      setTimeout(() => {
        setShowAgeUiInfoModal(false);
        setRecSuccess(false);
      }, 1600);
    } catch (e) {
      console.error("[Meisterwerk] Could not save teacher recommendation:", e);
    } finally {
      setIsSavingRec(false);
    }
  };

  const renderAgeUiInfoModal = () => {
    if (isTeacherSandbox || isTeacherTools || isTeacherSelf || !showAgeUiInfoModal) return null;
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Altersstufe & Berechtigungen"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 99999,
          padding: "16px"
        }}
        onClick={() => setShowAgeUiInfoModal(false)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#ffffff",
            borderRadius: "24px",
            width: "100%",
            maxWidth: "540px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            animation: "fadeIn 0.18s ease-out"
          }}
        >
          {/* Header */}
          <div style={{
            padding: "20px 24px 16px 24px",
            background: uiLevel === "junior"
              ? "linear-gradient(135deg, #fefce8 0%, #fef08a 100%)"
              : uiLevel === "teen"
                ? "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)"
                : "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                fontSize: "1.2rem"
              }}>
                {uiLevel === "junior" ? "🧒" : uiLevel === "teen" ? "⚡" : "🎓"}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 900, color: "#0f172a" }}>
                  {uiLevel === "junior" ? "Junior-Stufe (6–10 Jahre)" : uiLevel === "teen" ? "Teen-Stufe (11–15 Jahre)" : "Pro-Stufe (ab 16 Jahre)"}
                </h3>
                <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#64748b" }}>
                  Schüler-Profil von {studentFirstName}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAgeUiInfoModal(false)}
              style={{
                background: "rgba(255,255,255,0.8)",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer"
              }}
              className="hover-scale"
            >
              <X size={16} color="#475569" />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px", maxHeight: "70vh", overflowY: "auto" }}>
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "14px 16px" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0f172a", marginBottom: "6px" }}>
                Funktionsumfang dieser Altersstufe:
              </div>
              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.78rem", color: "#475569", lineHeight: 1.6 }}>
                {uiLevel === "junior" ? (
                  <>
                    <li><strong>5 aktive Module:</strong> Übe-Begleiter, Aufnahmen, Groove-Trainer, Stimmgerät, Klang-Detektiv, Musik-Stern ⭐ & Protokoll.</li>
                    <li><strong>Kindgerechte Begriffe:</strong> Klang-Detektiv statt EarLab, Sticker-Album statt Meilensteine.</li>
                    <li><strong>Rechte-Schutz:</strong> Loopstation & Archiv regulär inaktiv (können von Eltern über PIN freigeschaltet werden).</li>
                    <li><strong>Kinderschutz:</strong> Nachtruhe-Schutz aktiv, kein Schüler-Direktchat ohne Eltern.</li>
                  </>
                ) : uiLevel === "teen" ? (
                  <>
                    <li><strong>7 aktive Module:</strong> Inklusive Loopstation, Skill-Radar, Chat und Mitteilungen.</li>
                    <li><strong>Eigenverantwortung:</strong> Stundenplan-Vorschläge & Übe-Timer freigeschaltet.</li>
                    <li><strong>Archiv:</strong> Regulär inaktiv (über Eltern-Freigabe aktivierbar).</li>
                  </>
                ) : (
                  <>
                    <li><strong>Volles Studio:</strong> Alle Module inklusive Unterrichts-Archiv voll aktiv.</li>
                    <li><strong>Autonomie:</strong> Alle Schüler-Werkzeuge ohne Einschränkungen verfügbar.</li>
                  </>
                )}
              </ul>
            </div>

            {/* Teacher section: Didaktische Empfehlung an Eltern */}
            {isTeacherMode ? (
              <div style={{
                background: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)",
                border: "1.5px solid #bfdbfe",
                borderRadius: "16px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Sparkles size={16} color="#2563eb" />
                  <span style={{ fontSize: "0.86rem", fontWeight: 900, color: "#1e3a8a" }}>
                    Didaktische Empfehlung an die Eltern
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "0.74rem", color: "#475569", lineHeight: 1.45 }}>
                  Die dauerhafte Rechte- und Stufenverwaltung obliegt den Eltern. Du kannst hier eine fachliche Empfehlung hinterlegen, die den Eltern im Elternbereich angezeigt wird.
                </p>

                {recSuccess ? (
                  <div style={{
                    background: "#dcfce7",
                    border: "1px solid #86efac",
                    borderRadius: "12px",
                    padding: "12px",
                    textAlign: "center",
                    fontSize: "0.82rem",
                    fontWeight: 850,
                    color: "#15803d"
                  }}>
                    ✓ Empfehlung erfolgreich an {studentFirstName}s Eltern übermittelt!
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "0.74rem", fontWeight: 800, color: "#334155" }}>
                        Empfohlene Freigabe:
                      </label>
                      <select
                        value={recTargetLevel}
                        onChange={(e) => setRecTargetLevel(e.target.value as any)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "10px",
                          border: "1px solid #cbd5e1",
                          background: "#ffffff",
                          fontSize: "0.80rem",
                          fontWeight: 700,
                          color: "#0f172a"
                        }}
                      >
                        <option value="teen">⚡ Wechsel zur Teen-Stufe (11–15 J. / inkl. Loopstation)</option>
                        <option value="loopstation">🎛️ Loopstation freischalten (im Junior-Profil)</option>
                        <option value="pro">🎓 Wechsel zur Pro-Stufe (ab 16 J.)</option>
                      </select>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "0.74rem", fontWeight: 800, color: "#334155" }}>
                        Hinweis / Begründung für die Eltern:
                      </label>
                      <textarea
                        value={recNote}
                        onChange={(e) => setRecNote(e.target.value)}
                        placeholder={`z. B. ${studentFirstName} macht tolle Fortschritte und wir möchten im Unterricht nun die Loopstation einsetzen...`}
                        rows={3}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "10px",
                          border: "1px solid #cbd5e1",
                          background: "#ffffff",
                          fontSize: "0.78rem",
                          color: "#0f172a",
                          resize: "none",
                          fontFamily: "inherit"
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      disabled={isSavingRec}
                      onClick={handleSendTeacherRecommendation}
                      style={{
                        background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "12px",
                        padding: "10px 16px",
                        fontSize: "0.82rem",
                        fontWeight: 900,
                        cursor: isSavingRec ? "wait" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)"
                      }}
                      className="hover-scale"
                    >
                      <Mail size={15} />
                      <span>{isSavingRec ? "Wird gespeichert..." : "Empfehlung an Eltern senden"}</span>
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "16px",
                padding: "16px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "0.80rem", color: "#64748b", marginBottom: "12px" }}>
                  Eltern können die Altersstufe oder einzelne Module (z. B. Loopstation) jederzeit im Elternbereich über den Eltern-PIN anpassen.
                </div>
                <button
                  type="button"
                  onClick={() => setShowAgeUiInfoModal(false)}
                  style={{
                    background: "#0f172a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "12px",
                    padding: "8px 16px",
                    fontSize: "0.80rem",
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                  className="hover-scale"
                >
                  Verstanden
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCloseButton = () => {
    if (isEmbed) return null;
    return (
      <button
        type="button"
        onClick={handleClose}
        aria-label="Dokumentation sichern und schließen"
        style={{
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          border: '1px solid rgba(255,255,255,0.35)',
          borderRadius: '20px',
          padding: '6px 16px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          cursor: 'pointer',
          color: '#ffffff',
          fontWeight: 850,
          fontSize: '0.80rem',
          transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          flexShrink: 0,
          boxShadow: '0 2px 10px rgba(22, 163, 74, 0.35)'
        }}
        className="hover-scale"
        title="Dokumentation sichern & schließen"
      >
        <Check size={14} strokeWidth={3} />
        <span>Fertig & Schließen</span>
      </button>
    );
  };



  const isMobileOrSim = isFullscreen || isMobileView || isInsideSim || (typeof window !== 'undefined' && window.innerWidth < 1024);

  const content = (
    <div
      role={isEmbed ? undefined : "dialog"}
      aria-modal={isEmbed ? undefined : "true"}
      aria-label="Meisterwerk- & Hausaufgabendokumentation"
      style={{
      background: useNotebookLayout 
        ? (bookColor 
            ? `radial-gradient(circle, ${bookColor.from} 0%, ${bookColor.to} 100%)` 
            : 'radial-gradient(circle, #5c4d40 0%, #30261f 100%)') 
        : '#ffffff', // Opaque white background canvas for seamless full-height scrolling
      borderRadius: isMobileOrSim ? '0' : '20px',
      width: '100%',
      maxWidth: '100%',
      height: isEmbed ? '100%' : (isMobileOrSim ? '100%' : '92vh'),
      boxShadow: useNotebookLayout ? '0 30px 80px rgba(0, 0, 0, 0.6), inset 0 0 40px rgba(0, 0, 0, 0.4)' : '0 30px 60px -15px rgba(0, 0, 0, 0.25)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      border: useNotebookLayout 
        ? 'none' 
        : '1px solid rgba(0, 0, 0, 0.05)',
      padding: useNotebookLayout ? '6px' : '0',
      position: 'relative',
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
    }} className={isMobileOrSim ? "mobile-modal-shell" : "animation-slide-up"}>
                {/* Embedded Style Block - Universal for ALL Tabs */}
        <style dangerouslySetInnerHTML={{__html: `
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes ambientGoldBreathing {
            0%, 100% {
              box-shadow: 0 4px 18px -2px rgba(245, 158, 11, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.50);
              border-color: rgba(253, 224, 71, 0.70);
            }
            50% {
              box-shadow: 0 4px 28px 3px rgba(251, 191, 36, 0.65), inset 0 1px 3px rgba(255, 255, 255, 0.85);
              border-color: rgba(253, 224, 71, 0.95);
            }
          }
          .modal-content-container {
            display: flex !important;
            flex-direction: row !important;
          }
          
          @media (max-width: 900px) {
            .modal-header-container {
              flex-direction: column !important;
              align-items: stretch !important;
              padding: 8px 12px 6px 12px !important;
              gap: 4px !important;
              flex: 0 0 auto !important;
              flex-shrink: 0 !important;
              height: auto !important;
              min-height: auto !important;
            }
            .header-top-row {
              width: 100% !important;
            }
            .header-tabs-desktop-container {
              display: none !important;
            }
            .header-desktop-archiv {
              display: none !important;
            }
            .header-mobile-menu-row {
              display: flex !important;
            }
            .header-left-info {
              flex-wrap: nowrap !important;
              width: auto !important;
              gap: 8px !important;
            }
            
            .modal-content-container {
              flex-direction: column !important;
              overflow-y: auto !important;
              height: auto !important;
              flex: 1 1 0% !important;
              min-height: 0 !important;
              -webkit-overflow-scrolling: touch !important;
            }
            .modal-content-container > div {
              width: 100% !important;
              max-width: 100% !important;
              height: auto !important;
              max-height: none !important;
              flex: none !important;
              min-height: 0 !important;
              overflow-y: visible !important;
              box-sizing: border-box !important;
              border-right: none !important;
              border-left: none !important;
            }
          }

          [class*="sim-viewport"] .modal-header-container,
          .sim-viewport-mobile .modal-header-container,
          .sim-viewport-portrait .modal-header-container,
          .sim-viewport-tablet .modal-header-container {
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 8px 12px 6px 12px !important;
            gap: 4px !important;
            flex: 0 0 auto !important;
            flex-shrink: 0 !important;
            height: auto !important;
            min-height: auto !important;
          }
          [class*="sim-viewport"] .header-top-row,
          .sim-viewport-mobile .header-top-row,
          .sim-viewport-portrait .header-top-row,
          .sim-viewport-tablet .header-top-row {
            width: 100% !important;
          }
          [class*="sim-viewport"] .header-tabs-desktop-container,
          .sim-viewport-mobile .header-tabs-desktop-container,
          .sim-viewport-portrait .header-tabs-desktop-container,
          .sim-viewport-tablet .header-tabs-desktop-container {
            display: none !important;
          }
          [class*="sim-viewport"] .header-desktop-archiv,
          .sim-viewport-mobile .header-desktop-archiv,
          .sim-viewport-portrait .header-desktop-archiv,
          .sim-viewport-tablet .header-desktop-archiv {
            display: none !important;
          }
          [class*="sim-viewport"] .header-mobile-menu-row,
          .sim-viewport-mobile .header-mobile-menu-row,
          .sim-viewport-portrait .header-mobile-menu-row,
          .sim-viewport-tablet .header-mobile-menu-row {
            display: flex !important;
          }
          [class*="sim-viewport"] .header-left-info,
          .sim-viewport-mobile .header-left-info,
          .sim-viewport-portrait .header-left-info,
          .sim-viewport-tablet .header-left-info {
            flex-wrap: nowrap !important;
            width: auto !important;
            gap: 8px !important;
          }
          [class*="sim-viewport"] .modal-content-container,
          .sim-viewport-mobile .modal-content-container,
          .sim-viewport-portrait .modal-content-container,
          .sim-viewport-tablet .modal-content-container {
            flex-direction: column !important;
            overflow-y: auto !important;
            height: auto !important;
            flex: 1 1 0% !important;
            min-height: 0 !important;
            -webkit-overflow-scrolling: touch !important;
          }
          [class*="sim-viewport"] .modal-content-container > div,
          .sim-viewport-mobile .modal-content-container > div,
          .sim-viewport-portrait .modal-content-container > div,
          .sim-viewport-tablet .modal-content-container > div {
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            flex: none !important;
            min-height: 0 !important;
            overflow-y: visible !important;
            box-sizing: border-box !important;
            border-right: none !important;
            border-left: none !important;
          }
        `}} />

        {/* Header - Apple-style compact redesign */}
        <div style={{
          padding: isMobileOrSim ? 'max(10px, env(safe-area-inset-top, 10px)) max(12px, env(safe-area-inset-right, 12px)) 6px max(12px, env(safe-area-inset-left, 12px))' : 'max(16px, env(safe-area-inset-top, 16px)) max(20px, env(safe-area-inset-right, 20px)) 16px max(20px, env(safe-area-inset-left, 20px))',
          background: 'linear-gradient(135deg, #34a853 0%, #4f46e5 100%)',
          backdropFilter: 'none',
          borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '0',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
        }} className="modal-header-container">
          
          {/* Top Row / Desktop Row */}
          <div className="header-top-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0, position: 'relative' }}>
            {/* Left: Avatar + Student Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }} className="header-left-info">
              <div 
                onClick={() => onProfileClick && onProfileClick(student)}
                title={onProfileClick ? 'Schülerprofil anzeigen' : undefined}
                style={{
                  width: isMobileOrSim ? '30px' : '38px',
                  height: isMobileOrSim ? '30px' : '38px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                  border: '1.5px solid rgba(255, 213, 79, 0.2)',
                  cursor: onProfileClick ? 'pointer' : 'default',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (onProfileClick) e.currentTarget.style.opacity = '0.8';
                }}
                onMouseLeave={(e) => {
                  if (onProfileClick) e.currentTarget.style.opacity = '1';
                }}
              >
                <img
                  src={resolveCampusStudentAvatar({ ...(student || {}), instrument: studentInstrument || student?.instrument })}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  alt=""
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 
                    onClick={() => onProfileClick && onProfileClick(student)}
                    title={onProfileClick ? 'Schülerprofil anzeigen' : undefined}
                    style={{
                      margin: 0,
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      cursor: onProfileClick ? 'pointer' : 'default',
                      transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (onProfileClick) e.currentTarget.style.opacity = '0.8';
                    }}
                    onMouseLeave={(e) => {
                      if (onProfileClick) e.currentTarget.style.opacity = '1';
                    }}
                  >
                    {displayedStudentName}
                  </h2>
                  {!isTeacherSandbox && !isTeacherTools && !isTeacherSelf ? (
                    <>
                      <button
                        type="button"
                        onClick={() => { setOnboardingStep(0); setShowProtokollOnboarding(true); }}
                        title="Anleitung & Onboarding anzeigen"
                        style={{
                          background: 'rgba(255, 255, 255, 0.18)',
                          border: '1px solid rgba(255, 255, 255, 0.28)',
                          color: '#ffffff',
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          padding: 0,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s ease',
                          flexShrink: 0
                        }}
                        className="hover-scale"
                      >
                        <Info size={13} color="#ffffff" />
                      </button>
                      {/* Interaktives Alter-UI Badge (Nur für Schüler) */}
                      <button
                        type="button"
                        onClick={() => setShowAgeUiInfoModal(true)}
                        title="Altersstufe & Berechtigungen anzeigen"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: uiLevel === 'junior' 
                            ? 'rgba(254, 240, 138, 0.22)' 
                            : uiLevel === 'teen' 
                              ? 'rgba(199, 210, 254, 0.22)' 
                              : 'rgba(233, 213, 255, 0.22)',
                          border: uiLevel === 'junior' 
                            ? '1px solid rgba(253, 224, 71, 0.55)' 
                            : uiLevel === 'teen' 
                              ? '1px solid rgba(165, 180, 252, 0.55)' 
                              : '1px solid rgba(216, 180, 254, 0.55)',
                          borderRadius: '100px',
                          padding: '2px 8px',
                          color: '#ffffff',
                          fontSize: '0.70rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.12)',
                          transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                          flexShrink: 0
                        }}
                        className="hover-scale"
                      >
                        <span>{uiLevel === 'junior' ? '🧒 Junior (6–10 J.)' : uiLevel === 'teen' ? '⚡ Teen (11–15 J.)' : '🎓 Pro (ab 16 J.)'}</span>
                      </button>
                    </>
                  ) : (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(255, 255, 255, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.35)',
                        borderRadius: '100px',
                        padding: '2px 8px',
                        color: '#ffffff',
                        fontSize: '0.70rem',
                        fontWeight: 800,
                        flexShrink: 0
                      }}
                    >
                      Lehrkraft
                    </span>
                  )}
                </div>
                {(activeViewMode === 'recordings' || activeModalTab === 'audiobiography') && (
                  <span style={{ fontSize: '0.68rem', fontWeight: 650, color: 'rgba(255, 255, 255, 0.75)', lineHeight: 1, marginTop: '2px' }}>
                    Aufgabenheft · Audio-Studio
                  </span>
                )}
              </div>
            </div>

            {/* Desktop Navigation Action: Centered Monochrome Back to Modules Button + Apple Spotlight Search & Segmented Switch */}
            {(activeViewMode !== 'document' || activeModalTab !== 'document' || activeSubView !== 'hub' || hubTab === 'protocol') && (
              <div style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                display: isMobileOrSim ? 'none' : 'flex',
                alignItems: 'center',
                gap: '10px',
                zIndex: 10
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveModalTab('document');
                    setActiveViewMode('document');
                    setActiveSubView('hub');
                    setHubTab('modules');
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.16)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255, 255, 255, 0.32)',
                    color: '#ffffff',
                    padding: '7px 18px',
                    borderRadius: '100px',
                    fontSize: '0.80rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.35)',
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                    letterSpacing: '-0.01em',
                    userSelect: 'none'
                  }}
                  className="hover-scale"
                >
                  <ArrowLeft size={15} color="#ffffff" strokeWidth={2.6} />
                  <span>Zurück zu den Modulen</span>
                </button>

                {/* 🔍 In Recordings View: Clean High-Contrast Spotlight Search Bar */}
                {activeViewMode === 'recordings' && (
                  <div style={{ position: 'relative', width: '260px' }}>
                    <Search size={14} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="Aufnahmen durchsuchen..."
                      value={recordingSearchQuery}
                      onChange={(e) => setRecordingSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 28px 6px 34px',
                        borderRadius: '100px',
                        border: '1.5px solid #e2e8f0',
                        background: '#ffffff',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                      }}
                    />
                    {recordingSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setRecordingSearchQuery('')}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: '#e2e8f0',
                          border: 'none',
                          borderRadius: '50%',
                          width: '16px',
                          height: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#64748b',
                          cursor: 'pointer',
                          fontSize: '10px',
                          padding: 0
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Actions (Always visible on all screen sizes, including Fullscreen + Close) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }} className="header-right-actions">
              {onOpenAssignModal && (
                <button
                  type="button"
                  onClick={onOpenAssignModal}
                  aria-label="Hausaufgabe an Schüler zuweisen"
                  style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    border: '1px solid rgba(255,255,255,0.35)',
                    borderRadius: '20px',
                    padding: '6px 14px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    color: '#ffffff',
                    fontWeight: 850,
                    fontSize: '0.80rem',
                    flexShrink: 0,
                    boxShadow: '0 2px 10px rgba(2, 132, 199, 0.35)'
                  }}
                  className="hover-scale"
                  title="Hausaufgabe an Schüler zuweisen"
                >
                  <Send size={13} />
                  <span>An Schüler zuweisen</span>
                </button>
              )}
              {renderFullscreenButton()}
              {renderCloseButton()}
            </div>

          </div>

          {/* Bottom Row (mobile/tablet only) - iOS Native Segmented Switch [ Module | Hausaufgaben ] */}
          {(() => {
            const isHausaufgabenActive = mobileProtokollTab === 'homework' && activeViewMode === 'document' && activeModalTab === 'document';
            const isModulesActive = !isHausaufgabenActive;

            return (
              <div className="header-mobile-menu-row" style={{
                display: isMobileOrSim ? 'flex' : 'none',
                width: '100%',
                marginTop: '4px',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <div
                  role="tablist"
                  aria-label="Bereichsauswahl"
                  style={{
                    display: 'inline-flex',
                    background: 'rgba(0, 0, 0, 0.22)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    padding: '3px',
                    borderRadius: '100px',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
                    width: '100%',
                    maxWidth: '280px'
                  }}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isModulesActive}
                    onClick={() => {
                      setActiveModalTab('document');
                      setActiveViewMode('document');
                      setActiveSubView('hub');
                      setHubTab('modules');
                      setMobileProtokollTab('repertoire');
                    }}
                    style={{
                      flex: 1,
                      padding: '7px 14px',
                      borderRadius: '100px',
                      border: 'none',
                      background: isModulesActive ? '#ffffff' : 'transparent',
                      color: isModulesActive ? '#0f172a' : '#ffffff',
                      fontWeight: 850,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: isModulesActive ? '0 2px 8px rgba(0, 0, 0, 0.18)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      outline: 'none'
                    }}
                  >
                    {isTeacherSelf ? 'Studio-Module' : 'Module'}
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={isHausaufgabenActive}
                    onClick={() => {
                      setActiveModalTab('document');
                      setActiveViewMode('document');
                      setActiveSubView('hub');
                      setMobileProtokollTab('homework');
                    }}
                    style={{
                      flex: 1,
                      padding: '7px 14px',
                      borderRadius: '100px',
                      border: 'none',
                      background: isHausaufgabenActive ? '#ffffff' : 'transparent',
                      color: isHausaufgabenActive ? '#0f172a' : '#ffffff',
                      fontWeight: 850,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: isHausaufgabenActive ? '0 2px 8px rgba(0, 0, 0, 0.18)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      outline: 'none'
                    }}
                  >
                    {isTeacherSelf ? 'Anleitung & Tipps' : 'Hausaufgaben'}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>

        {/* 🏫 LEHRER-DEMO-BANNER (wenn Modul im Schüler-UI-Level inaktiv ist) - NIEMALS IM LEHRER-SANDBOX / TOOLS MODUS */}
        {isTeacherMode && !isTeacherSandbox && !isTeacherTools && !isTeacherSelf && (() => {
          const overrides = effectiveParentPermissions?.module_overrides || (student as any)?.parent_permissions?.module_overrides || propParentPermissions?.module_overrides;
          const isCurrentModuleInactive = (activeViewMode === "loopstation" && uiLevel === "junior" && !overrides?.loopstation)
            || (activeSubView === "history" && activeViewMode === "document" && uiLevel !== "pro" && !overrides?.archive);
          if (!isCurrentModuleInactive) return null;
          return (
            <div style={{
              background: "linear-gradient(90deg, #fef3c7 0%, #fffbeb 100%)",
              borderBottom: "1.5px solid #fde68a",
              padding: "9px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.80rem",
              fontWeight: 750,
              color: "#92400e",
              zIndex: 45,
              flexShrink: 0,
              boxShadow: "0 2px 6px rgba(245, 158, 11, 0.10)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Info size={16} color="#d97706" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Lehrer-Demo-Modus:</strong> Dieses Modul ist für <strong>{studentFirstName}</strong> in der {uiLevel.toUpperCase()}-Stufe regulär ausgeblendet. Du nutzt es zur Unterrichtsvorführung.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveViewMode("document");
                  setActiveModalTab("document");
                  setActiveSubView("hub");
                }}
                style={{
                  background: "#ffffff",
                  border: "1px solid #d97706",
                  borderRadius: "8px",
                  padding: "4px 12px",
                  fontSize: "0.74rem",
                  fontWeight: 850,
                  color: "#92400e",
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
                className="hover-scale"
              >
                Zurück zu {studentFirstName}s Modulen
              </button>
            </div>
          );
        })()}

        {/* Modal Content - Side-by-side Columns or Logbook */}
        <div
          onTouchStart={(e) => {
            if (!isMobileView || activeModalTab !== 'document') return;
            touchStartXRef.current = e.touches[0].clientX;
            touchStartYRef.current = e.touches[0].clientY;
          }}
          onTouchEnd={(e) => {
            if (!isMobileView || activeModalTab !== 'document' || touchStartXRef.current === null || touchStartYRef.current === null) return;
            const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
            const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
            touchStartXRef.current = null;
            touchStartYRef.current = null;

            if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
              if (deltaX < -40) {
                setMobileProtokollTab('homework');
              } else if (deltaX > 40) {
                setMobileProtokollTab('repertoire');
              }
            }
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflowY: (isMobileOrSim || activeViewMode !== 'document' || activeModalTab !== 'document') ? 'auto' : 'hidden',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            minHeight: 0,
            background: useNotebookLayout 
              ? (bookColor 
                  ? `radial-gradient(circle, ${bookColor.from} 0%, ${bookColor.to} 100%)` 
                  : 'radial-gradient(circle, #5c4d40 0%, #30261f 100%)') 
              : '#ffffff',
            padding: '0',
            position: 'relative'
          }} className="modal-content-container">
          {!isCampusActive && (activeModalTab !== 'document' || activeViewMode !== 'document') && (
            <div style={{
              width: '100%',
              background: '#f8fafc',
              borderBottom: '1.5px solid #e2e8f0',
              color: '#475569',
              padding: '8px 16px',
              fontSize: '0.78rem',
              fontWeight: 750,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              flexShrink: 0,
              boxSizing: 'border-box'
            }}>
              <Lock size={13} color="#64748b" />
              <span>Lehrer-Demo-Modus • Dieses Modul ist für Schüler im Basis-Status inaktiv. Hausaufgaben im Protokoll werden direkt synchronisiert.</span>
            </div>
          )}
          {activeModalTab === 'skillradar' ? (
            <div style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: isMobileOrSim ? '16px 16px calc(280px + env(safe-area-inset-bottom, 40px)) 16px' : '20px 24px 80px 24px'
            }}>
              {renderSkillRadarTabContent()}
            </div>
          ) : activeViewMode === 'groovetrainer' ? (
            <div style={{
              width: '100%',
              flex: 1,
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              borderTop: '1px solid #e2e8f0',
              boxSizing: 'border-box',
              padding: isMobileOrSim ? '16px 16px calc(280px + env(safe-area-inset-bottom, 40px)) 16px' : '24px 32px 80px 32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              alignItems: 'center',
              minHeight: isMobileOrSim ? 'auto' : 'calc(70vh - 60px)'
            }}>
              <GrooveTrainerStudioView
                student={student}
                onClose={() => {
                  setActiveViewMode('document');
                  setHubTab('modules');
                }}
                uiLevel={uiLevel}
                useNotebookLayout={true}
                homeworkNotesList={homeworkNotesList}
                onRewardXp={handleGrooveTrainerRewardXp}
              />
            </div>
          ) : activeViewMode === 'loopstation' ? (
            <div style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: isMobileOrSim ? '16px 16px calc(280px + env(safe-area-inset-bottom, 40px)) 16px' : '20px 24px 80px 24px'
            }}>
              <React.Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Lade Loopstation...</div>}>
                <GrooveLoopstation
                  student={student}
                  homeworkNotesList={homeworkNotesList}
                  setHomeworkNotesList={setHomeworkNotesList}
                  syncHomeworkNotes={syncHomeworkNotes}
                  fetchProgress={fetchProgress}
                  notifyHomeworkChange={notifyHomeworkChange}
                  readOnly={readOnly}
                  setActiveViewMode={setActiveViewMode}
                  useNotebookLayout={useNotebookLayout}
                  hasTresorStorage={hasTresorStorage}
                />
              </React.Suspense>
            </div>
          ) : activeViewMode === 'practice' ? (
            <div style={{
              width: '100%',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              boxSizing: 'border-box',
              padding: isMobileOrSim ? '16px 16px calc(280px + env(safe-area-inset-bottom, 40px)) 16px' : '16px 20px 20px 20px'
            }}>
              <GroovePracticeCompanion
                useNotebookLayout={useNotebookLayout}
                isCampusModule={true}
                studentId={student.id}
                student={student}
                onNavigateToRecordings={() => setActiveViewMode('recordings')}
                activeSongContext={activeRhythmSong}
                onRhythmScoreUpdate={(score, details) => {
                  if (details.beatsCount >= 12) {
                    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const starsStr = '⭐'.repeat(details.stars || 1);
                    const entry = `RHYTHM_SCORE:${score}%|${details.bpm}|${details.beatsCount}|${timeStr}|${starsStr}|${details.songTitle || ''}`;
                    setHomeworkNotesList(prev => {
                      const filtered = prev.filter(n => !n.startsWith('RHYTHM_SCORE:'));
                      const updated = [...filtered, entry];
                      syncHomeworkNotes(updated).catch(err => console.error('Error syncing rhythm score:', err));
                      return updated;
                    });
                  }
                }}
              />
            </div>
          ) : activeViewMode === 'tuner' ? (
            <div style={{
              width: '100%',
              flex: 1,
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              borderTop: '1px solid #e2e8f0',
              boxSizing: 'border-box',
              padding: isMobileOrSim ? '16px 16px calc(280px + env(safe-area-inset-bottom, 40px)) 16px' : '28px 24px 80px 24px',
              minHeight: isMobileOrSim ? 'auto' : 'calc(70vh - 60px)'
            }}>
              <React.Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Lade Stimmgerät...</div>}>
                <CampusTuner
                  uiLevel={uiLevel}
                />
              </React.Suspense>
            </div>
          ) : activeViewMode === 'earlab' ? (
            <div style={{
              width: '100%',
              flex: 1,
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              borderTop: '1px solid #e2e8f0',
              boxSizing: 'border-box',
              padding: isMobileOrSim ? '16px 16px calc(280px + env(safe-area-inset-bottom, 40px)) 16px' : '24px 32px 80px 32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              alignItems: 'center',
              minHeight: isMobileOrSim ? 'auto' : 'calc(70vh - 60px)'
            }}>
              <React.Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Lade EarLab &amp; Harmony-Studio...</div>}>
                <EarLabStudioModal
                  student={student}
                  uiLevel={uiLevel}
                  embedded={true}
                  useNotebookLayout={true}
                  onClose={() => {
                    setActiveViewMode('document');
                    setHubTab('modules');
                  }}
                  onRewardXp={async (xp, reason) => {
                    if (student?.id && xp > 0) {
                      await awardCampusXP(xp, reason);
                    }
                  }}
                  onSessionComplete={(summary) => {
                    const pillarLabel = summary.pillar === 'intervals' ? 'Intervalle' : summary.pillar === 'chords' ? 'Akkorde' : 'Rhythmus';
                    const entry = `EARLAB_SCORE:${summary.vdmLevel.toUpperCase()}|${pillarLabel}|${summary.accuracy}%|+${summary.xp}XP|${new Date().toLocaleDateString('de-DE')}`;
                    setHomeworkNotesList(prev => {
                      const filtered = prev.filter(n => !n.startsWith('EARLAB_SCORE:'));
                      const updated = [...filtered, entry];
                      syncHomeworkNotes(updated).catch(err => console.error('Error syncing earlab score:', err));
                      return updated;
                    });
                  }}
                />
              </React.Suspense>
            </div>
          ) : activeViewMode === 'recordings' ? (
            <MeisterwerkRecordingsTab
              isTeacherTools={isTeacherTools}
              readOnly={readOnly}
              student={student}
              activeSongSkills={resolvedActiveSongs}
              audioDuration={audioDuration}
              audioLabel={audioLabel}
              audioSongTags={audioSongTags}
              availablePlaylists={availablePlaylists}
              availableSongsForTagging={availableSongsForTagging}
              expandedStudentAudioWeeks={expandedStudentAudioWeeks}
              expandedTeacherAudioWeeks={expandedTeacherAudioWeeks}
              favoriteAudioUrls={favoriteAudioUrls}
              formatRecordTime={formatRecordTime}
              getISOWeek={getISOWeek}
              getMonthAlbumTheme={getMonthAlbumTheme}
              getNormalizedSongTitle={getNormalizedSongTitle}
              handleDeleteNote={handleDeleteNote}
              handleDeleteStudentAudio={handleDeleteStudentAudio}
              handleRenameStudentAudio={handleRenameStudentAudio}
              handleRenameTeacherAudio={handleRenameTeacherAudio}
              handleSaveEditedTeacherAudio={handleSaveEditedTeacherAudio}
              handleRevertTeacherAudioToOriginal={handleRevertTeacherAudioToOriginal}
              handleSaveShareToPlaylist={handleSaveShareToPlaylist}
              handleUpdateAudioSongTag={handleUpdateAudioSongTag}
              hasTresorStorage={hasTresorStorage}
              homeworkNotes={homeworkNotes}
              homeworkNotesList={homeworkNotesList}
              isBookAlbum={isBookAlbum}
              isCurrentHomework={isCurrentHomework}
              isMobileOrSim={isMobileOrSim}
              isRecordingAudio={isRecordingAudio}
              isRecordingMetronomeActive={isRecordingMetronomeActive}
              isSharingToPlaylist={isSharingToPlaylist}
              isStudentWeekExpanded={isStudentWeekExpanded}
              isTeacherHomeworkExpanded={isTeacherHomeworkExpanded}
              isTeacherMode={isTeacherMode}
              isUploadingAudio={isUploadingAudio}
              matchesAudioSearch={matchesAudioSearch}
              mobileRecordingsTab={mobileRecordingsTab}
              newPlaylistTitle={newPlaylistTitle}
              openHomeworkWeekAccordions={openHomeworkWeekAccordions}
              playMetronomeTick={playMetronomeTick}
              progressItems={progressItems}
              recordingBpm={recordingBpm}
              recordingMetronomeRef={recordingMetronomeRef}
              recordingSearchQuery={recordingSearchQuery}
              selectedStudentMonth={selectedStudentMonth}
              selectedStudentSongAlbum={selectedStudentSongAlbum}
              selectedTeacherMonth={selectedTeacherMonth}
              selectedTeacherSongAlbum={selectedTeacherSongAlbum}
              setAudioLabel={setAudioLabel}
              setIsRecordingMetronomeActive={setIsRecordingMetronomeActive}
              setIsStudentWeekExpanded={setIsStudentWeekExpanded}
              setIsTeacherHomeworkExpanded={setIsTeacherHomeworkExpanded}
              setLocalJuniorRecordingsTrigger={setLocalJuniorRecordingsTrigger}
              setMobileRecordingsTab={setMobileRecordingsTab}
              setNewPlaylistTitle={setNewPlaylistTitle}
              setOpenHomeworkWeekAccordions={setOpenHomeworkWeekAccordions}
              setRecordingBpm={setRecordingBpm}
              setSelectedStudentMonth={setSelectedStudentMonth}
              setSelectedStudentSongAlbum={setSelectedStudentSongAlbum}
              setSelectedTeacherMonth={setSelectedTeacherMonth}
              setSelectedTeacherSongAlbum={setSelectedTeacherSongAlbum}
              setShareAudioModal={setShareAudioModal}
              setShareCustomTitle={setShareCustomTitle}
              setSharePlaylistId={setSharePlaylistId}
              setShareProcessing={setShareProcessing}
              setShowNewPlaylistInput={setShowNewPlaylistInput}
              setShowRecordingMetronomePopup={setShowRecordingMetronomePopup}
              setShowStudentFavoritesOnly={setShowStudentFavoritesOnly}
              setShowTeacherFavoritesOnly={setShowTeacherFavoritesOnly}
              setShowTeacherHomeworkArchive={setShowTeacherHomeworkArchive}
              shareAudioModal={shareAudioModal}
              shareCustomTitle={shareCustomTitle}
              sharePlaylistId={sharePlaylistId}
              shareProcessing={shareProcessing}
              showNewPlaylistInput={showNewPlaylistInput}
              showRecordingMetronomePopup={showRecordingMetronomePopup}
              showStudentFavoritesOnly={showStudentFavoritesOnly}
              showTeacherFavoritesOnly={showTeacherFavoritesOnly}
              showTeacherHomeworkArchive={showTeacherHomeworkArchive}
              songs={songs}
              startRecordingAudio={startRecordingAudio}
              stopRecordingAudio={stopRecordingAudio}
              recordCountInRemaining={recordCountInRemaining}
              cancelActiveRecordCountIn={cancelActiveRecordCountIn}
              justRecordedAudioUrl={justRecordedAudioUrl}
              justRecordedAudioLabel={justRecordedAudioLabel}
              studentFirstName={studentFirstName}
              toggleFavoriteAudio={toggleFavoriteAudio}
              toggleStudentAudioWeek={toggleStudentAudioWeek}
              toggleTeacherAudioWeek={toggleTeacherAudioWeek}
              topicName={topicName}
              useNotebookLayout={useNotebookLayout}
            />
          ) : activeModalTab === 'document' ? (
            <MeisterwerkDocumentTab
              DIDACTIC_QUICK_TAGS={DIDACTIC_QUICK_TAGS}
              PRESET_CHIPS={PRESET_CHIPS}
              activeBrush={activeBrush}
              activeLehrwerkId={activeLehrwerkId}
              activeNoteTarget={activeNoteTarget}
              activePageNumber={activePageNumber}
              activeSongSkills={resolvedActiveSongs}
              activeSubView={activeSubView}
              activeTagPickerRowIndex={activeTagPickerRowIndex}
              activeTtsKey={activeTtsKey}
              adjustTextareaHeight={adjustTextareaHeight}
              assignedLehrwerke={sortedAssignedLehrwerke}
              audioDuration={audioDuration}
              audioLabel={audioLabel}
              awardSticker={awardSticker}
              buildCompleteWeeklyHomeworkSpeechPhrases={buildCompleteWeeklyHomeworkSpeechPhrases}
              cancelPlayAlongCountIn={cancelPlayAlongCountIn}
              clickTimeoutRef={clickTimeoutRef}
              collectedStickers={collectedStickers}
              customTags={customTags}
              effectiveGroupStudents={effectiveGroupStudents}
              effectiveTeacherFullName={effectiveTeacherFullName}
              expressionVal={expressionVal}
              fingerVal={fingerVal}
              formatRecordTime={formatRecordTime}
              generalHomeworkNotes={generalHomeworkNotes}
              getCanonicalSongKey={getCanonicalSongKey}
              getFeedbackForWeek={getFeedbackForWeek}
              getHomeworkNoteItems={getHomeworkNoteItems}
              getISOWeek={getISOWeek}
              getItemWeek={getItemWeek}
              getLehrwerkColor={getLehrwerkColor}
              getNormalizedSongTitle={getNormalizedSongTitle}
              getSongColor={getSongColor}
              getTargetWeekIso={getTargetWeekIso}
              getWeekDateRange={getWeekDateRange}
              getWeeksBetween={getWeeksBetween}
              globalLehrwerke={globalLehrwerke}
              handleAddCustomTag={handleAddCustomTag}
              handleAssignLehrwerk={handleAssignLehrwerk}
              handleAssignSongFromCatalog={handleAssignSongFromCatalog}
              handleBackToHub={handleBackToHub}
              handleCheckMatch={handleCheckMatch}
              handleCommitStudentRating={handleCommitStudentRating}
              handleCopyShareLink={handleCopyShareLink}
              handleCreateAndAssignLehrwerk={handleCreateAndAssignLehrwerk}
              handleCreateAndAssignSong={handleCreateAndAssignSong}
              handleDeleteNote={handleDeleteNote}
              handleDeletePageNote={handleDeletePageNote}
              handleDeleteSingleNoteItem={handleDeleteSingleNoteItem}
              handlePageDoubleClick={handlePageDoubleClick}
              handleRemoveLehrwerk={handleRemoveLehrwerk}
              handleRemoveSong={handleRemoveSong}
              handleResetAllCurrentHomework={handleResetAllCurrentHomework}
              handleResolveStudentQuestion={handleResolveStudentQuestion}
              handleSave={handleSave}
              handleSaveStudentQuestion={handleSaveStudentQuestion}
              handleSetRowTag={handleSetRowTag}
              handleShareEmail={handleShareEmail}
              handleSpeakText={handleSpeakText}
              handleStartPlayAlongRecording={handleStartPlayAlongRecording}
              handleStopSpeaking={handleStopSpeaking}
              handleStudentRatingChange={handleStudentRatingChange}
              handleToggleMatchMode={handleToggleMatchMode}
              handleTogglePresetChip={handleTogglePresetChip}
              hasTresorStorage={hasTresorStorage}
              hasTransferableHomework={hasTransferableHomework}
              homeworkNotes={homeworkNotes}
              homeworkNotesList={homeworkNotesList}
              hubTab={hubTab}
              insertOrToggleTagInText={insertOrToggleTagInText}
              isCampusActive={isCampusActive}
              isCountInEnabled={isCountInEnabled}
              isCurrentHomework={isCurrentHomework}
              isFullscreen={isFullscreen}
              isInsideSim={isInsideSim}
              isLinkCopied={isLinkCopied}
              isMatchModeEnabled={isMatchModeEnabled}
              isMatchRevealed={isMatchRevealed}
              isMobileOrSim={isMobileOrSim}
              isMobileView={isMobileView}
              isQuestionEditorOpen={isQuestionEditorOpen}
              isRecordingAudio={isRecordingAudio}
              isRecordingMetronomeActive={isRecordingMetronomeActive}
              isSavingFeedback={isSavingFeedback}
              isSavingQuestion={isSavingQuestion}
              isShareMenuOpen={isShareMenuOpen}
              isSongMatch={isSongMatch}
              isStudentNotePrivate={isStudentNotePrivate}
              isStudentRatingCommitted={isStudentRatingCommitted}
              isSubSlidersExpanded={isSubSlidersExpanded}
              isTeacherMode={isTeacherMode}
              isTeacherTools={isTeacherTools}
              isTeacherSelf={isTeacherSelf}
              onClose={onClose}
              isTtsSpeaking={isTtsSpeaking}
              isUploadingAudio={isUploadingAudio}
              lastClickRef={lastClickRef}
              lastMatchedAt={lastMatchedAt}
              lastMatchedStudentPercent={lastMatchedStudentPercent}
              lastMatchedTeacherPercent={lastMatchedTeacherPercent}
              latestGeneralHomeworkNotesRef={latestGeneralHomeworkNotesRef}
              latestTeacherNotesRef={latestTeacherNotesRef}
              matchHistory={matchHistory}
              mobileProtokollTab={mobileProtokollTab}
              newCustomTagInput={newCustomTagInput}
              newLehrwerkLoading={newLehrwerkLoading}
              newLehrwerkPages={newLehrwerkPages}
              newLehrwerkTitle={newLehrwerkTitle}
              newSongArtist={newSongArtist}
              newSongTitle={newSongTitle}
              pageHomeworkNotes={pageHomeworkNotes}
              pageNotesSelectionRef={pageNotesSelectionRef}
              pageNotesTextareaRef={pageNotesTextareaRef}
              parsedStudentQuestion={parsedStudentQuestion}
              pendingFeedbackStatus={pendingFeedbackStatus}
              pendingFeedbackTags={pendingFeedbackTags}
              playAlongCountInRemaining={playAlongCountInRemaining}
              playMetronomeTick={playMetronomeTick}
              progressItems={progressItems}
              questionDraftText={questionDraftText}
              readOnly={readOnly}
              recordingBpm={recordingBpm}
              renderSongVinylCover={renderSongVinylCover}
              renderTextWithDidacticBadges={renderTextWithDidacticBadges}
              rhythmVal={rhythmVal}
              saveFeedback={saveFeedback}
              schoolId={studentSchoolId}
              selectActiveSong={selectActiveSong}
              selectTextbookPage={selectTextbookPage}
              selectedActiveSongId={selectedActiveSongId}
              selectedCategoryFilter={selectedCategoryFilter}
              selectedHistoryWeek={selectedHistoryWeek}
              setActiveBrush={setActiveBrush}
              setActiveInputTab={setActiveInputTab}
              setActiveLehrwerkId={setActiveLehrwerkId}
              setActiveModalTab={setActiveModalTab}
              setActiveNoteTarget={setActiveNoteTarget}
              setActivePageNumber={setActivePageNumber}
              setActiveSongSkills={setActiveSongSkills}
              setActiveSubView={setActiveSubView}
              setActiveTagPickerRowIndex={setActiveTagPickerRowIndex}
              setActiveViewMode={setActiveViewMode}
              setAudioLabel={setAudioLabel}
              setExpressionVal={setExpressionVal}
              setFingerVal={setFingerVal}
              setGeneralHomeworkNotes={setGeneralHomeworkNotes}
              setHasChanges={setHasChanges}
              setHomeworkNotesList={setHomeworkNotesList}
              setHubTab={setHubTab}
              setIsCountInEnabled={setIsCountInEnabled}
              setIsCurrentHomework={setIsCurrentHomework}
              setIsNotesFocused={setIsNotesFocused}
              setIsQuestionEditorOpen={setIsQuestionEditorOpen}
              setIsRecordingMetronomeActive={setIsRecordingMetronomeActive}
              setIsSavingFeedback={setIsSavingFeedback}
              setIsShareMenuOpen={setIsShareMenuOpen}
              setIsStudentNotePrivate={setIsStudentNotePrivate}
              setIsSubSlidersExpanded={setIsSubSlidersExpanded}
              setIsTransferModalOpen={setIsTransferModalOpen}
              setMobileProtokollTab={setMobileProtokollTab}
              setNewCustomTagInput={setNewCustomTagInput}
              setNewLehrwerkPages={setNewLehrwerkPages}
              setNewLehrwerkTitle={setNewLehrwerkTitle}
              setNewSongArtist={setNewSongArtist}
              setNewSongTitle={setNewSongTitle}
              setPageChunk={setPageChunk}
              setPageHomeworkNotes={setPageHomeworkNotes}
              setPendingFeedbackStatus={setPendingFeedbackStatus}
              setPendingFeedbackTags={setPendingFeedbackTags}
              setQuestionDraftText={setQuestionDraftText}
              setRecordingBpm={setRecordingBpm}
              setRhythmVal={setRhythmVal}
              setSelectedHistoryWeek={setSelectedHistoryWeek}
              setShowAllPagesGrid={setShowAllPagesGrid}
              setShowAssignDropdown={setShowAssignDropdown}
              setShowCreateLehrwerkModal={setShowCreateLehrwerkModal}
              setShowCreateSongModal={setShowCreateSongModal}
              setShowPlayAlongMetronomePopup={setShowPlayAlongMetronomePopup}
              setSongHomeworkNotes={setSongHomeworkNotes}
              setSongModalTab={setSongModalTab}
              setSongProgressPercent={setSongProgressPercent}
              setSongSearch={setSongSearch}
              setStatus={setStatus}
              setStudentNotes={setStudentNotes}
              setTeacherNotes={setTeacherNotes}
              setViewingWeekOffset={setViewingWeekOffset}
              shareMenuRef={shareMenuRef}
              showAssignDropdown={showAssignDropdown}
              showCreateLehrwerkModal={showCreateLehrwerkModal}
              showCreateSongModal={showCreateSongModal}
              showMatchConfetti={showMatchConfetti}
              showPlayAlongMetronomePopup={showPlayAlongMetronomePopup}
              showdownState={showdownState}
              songHomeworkNotes={songHomeworkNotes}
              songModalTab={songModalTab}
              songNotesSelectionRef={songNotesSelectionRef}
              songNotesTextareaRef={songNotesTextareaRef}
              songProgressPercent={songProgressPercent}
              songSearch={songSearch}
              songs={songs}
              sortedAssignedLehrwerke={sortedAssignedLehrwerke}
              status={status}
              stopRecordingAudio={stopRecordingAudio}
              student={student}
              studentFirstName={studentFirstName}
              studentNotes={studentNotes}
              studentNotesSelectionRef={studentNotesSelectionRef}
              studentNotesTextareaRef={studentNotesTextareaRef}
              studentRating={studentRating}
              studentRatingUpdatedAt={studentRatingUpdatedAt}
              teacherId={teacherId}
              teacherNotes={teacherNotes}
              teacherNotesTextareaRef={teacherNotesTextareaRef}
              textbookPageChunkIndex={textbookPageChunkIndex}
              toggleStudentFocusPage={toggleStudentFocusPage}
              topicName={topicName}
              triggerDebouncedAutoSave={triggerDebouncedAutoSave}
              triggerDebouncedSongSave={triggerDebouncedSongSave}
              triggerDebouncedTeacherNoteSave={triggerDebouncedTeacherNoteSave}
              triggerDirectSave={triggerDirectSave}
              triggerDirectSongSave={triggerDirectSongSave}
              triggerImmediateAutoSave={triggerImmediateAutoSave}
              uiLevel={uiLevel}
              parentPermissions={effectiveParentPermissions}
              updateLehrwerkVisibility={updateLehrwerkVisibility}
              useNotebookLayout={useNotebookLayout}
              viewingWeekOffset={viewingWeekOffset}
            />
      ) : activeModalTab === 'stickeralbum' ? (
        <MeisterwerkStickerAlbumTab
          isMobileOrSim={isMobileOrSim}
          readOnly={readOnly}
          isDevSimulationActive={isDevSimulationActive}
          setIsDevSimulationActive={setIsDevSimulationActive}
          simulateMultiYearProgress={simulateMultiYearProgress}
          resetStickerAlbum={resetStickerAlbum}
          collectedStickers={collectedStickers}
          renderSchoolYearSelector={renderSchoolYearSelector}
          awardSticker={awardSticker}
          awardedStickerToAnimate={awardedStickerToAnimate}
          setAwardedStickerToAnimate={setAwardedStickerToAnimate}
          downloadShareCard={downloadShareCard}
          topicName={topicName}
          actualStudentName={actualStudentName}
          studentInstrument={studentInstrument}
          shareCard={shareCard}
          selectedSchoolYear={selectedSchoolYear}
          currentSchoolYear={currentSchoolYear}
          student={student}
          schoolName={schoolName}
        />
      ) : activeModalTab === 'audiobiography' ? (
        /* AUDIO-BIOGRAFIE VIEW (AKUSTISCHES STAMMBAUCH & MEILENSTEINE) */
        <React.Suspense fallback={<div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>Lade Audio-Biografie...</div>}>
          <AudioBiographyView
            student={{
              ...student,
              school_id: student?.school_id || (student as any)?.schoolId || studentSchoolId || localStorage.getItem('campus_school_id') || localStorage.getItem('groovelab_school_id') || localStorage.getItem('school_id'),
              school_name: schoolName || (student as any)?.school_name,
              schools: (student as any)?.schools || (window as any).__groovelab_active_school
            }}
            teacherId={teacherId}
            isTeacher={isTeacherTools}
            onBackToHub={() => { setActiveModalTab('document'); setActiveSubView('hub'); }}
            isMobileOrSim={isMobileOrSim}
            studentUiLevel={uiLevel}
          />
        </React.Suspense>
      ) : (
        /* COLUMN 4: 🏆 MEISTERWERKE & LOGBUCH (Full Width in Swiss Modernist Style) */
        <MeisterwerkLogbuchTab
          isMobileOrSim={isMobileOrSim}
          useNotebookLayout={useNotebookLayout}
          student={student}
          assignedLehrwerke={sortedAssignedLehrwerke}
          globalLehrwerke={globalLehrwerke}
          activeSongSkills={resolvedActiveSongs}
          setActiveSongSkills={setActiveSongSkills}
          progressItems={progressItems}
          setProgressItems={setProgressItems}
          activeAudioPlayerRef={activeAudioPlayerRef}
          playingAudioUrl={playingAudioUrl}
          setPlayingAudioUrl={setPlayingAudioUrl}
          notifyHomeworkChange={notifyHomeworkChange}
          getSongColor={getSongColor}
          renderSongVinylCover={renderSongVinylCover}
          isRecordingAudio={isRecordingAudio}
          activeRecordingSongId={activeRecordingSongId}
          selectedActiveSongId={selectedActiveSongId}
          recordingTargetRef={recordingTargetRef}
          stopRecordingAudio={stopRecordingAudio}
          startRecordingAudio={startRecordingAudio}
          audioDuration={audioDuration}
          readOnly={readOnly}
          getLehrwerkColor={getLehrwerkColor}
          setCertModalSong={setCertModalSong}
          resolvedSchoolName={resolvedSchoolName}
        />
      )}
      
      {/* Apple-style Backdrop Blur Overlay for All Pages Grid */}
      {showAllPagesGrid && activeLehrwerkId && (() => {
        const assigned = assignedLehrwerke.find(a => a.lehrwerkId === activeLehrwerkId);
        if (!assigned) return null;
        const book = globalLehrwerke.find(g => g.id === activeLehrwerkId) || { title: 'Lehrwerk', emoji: '📚', totalPages: 50 };
        const pages = Array.from({ length: book.totalPages || 50 }, (_, i) => i + 1);

        return (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: 'fadeIn 0.25s ease'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '32px',
              width: '100%',
              maxWidth: '640px',
              maxHeight: '90%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
              overflow: 'hidden',
              animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
              {/* Header */}
              <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e8e8ed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {(() => {
                    const bookColor = getLehrwerkColor(book.title);
                    return (
                      <div style={{
                        width: '18px',
                        height: '24px',
                        background: `linear-gradient(135deg, ${bookColor.from}, ${bookColor.to})`,
                        borderRadius: '3px',
                        border: 'none',
                        position: 'relative',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <BookOpen size={9} color={bookColor.text} />
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: '2px',
                          background: 'rgba(0,0,0,0.08)',
                          borderRight: '1px solid rgba(255,255,255,0.1)'
                        }} />
                      </div>
                    );
                  })()}
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#000' }}>
                    {book.title} — Alle Seiten
                  </h3>
                </div>
                <button
                  onClick={() => setShowAllPagesGrid(false)}
                  style={{
                    background: '#f3f3f6',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#000'
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Grid Content */}
              <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', justifyItems: 'center' }}>
                  {pages.map(num => {
                    const pageState = assigned.pageStates[num] || { status: 'locked' };
                    const globalPage = book.globalPageStates?.[num] === 'purple';
                    const status = globalPage ? 'purple' : (pageState.status || 'locked');
                    const isStudentFocus = Boolean(pageState?.studentFocus);

                    let borderColor = '#ef4444';
                    let bg = '#fef2f2';
                    let textColor = '#991b1b';

                    if (status === 'homework') {
                      borderColor = '#eab308';
                      bg = '#fffbeb';
                      textColor = '#92400e';
                    } else if (status === 'mastered') {
                      borderColor = '#34a853';
                      bg = '#e6f4ea';
                      textColor = '#34a853';
                    } else if (status === 'purple') {
                      borderColor = '#af52de';
                      bg = '#f5f3ff';
                      textColor = '#6d28d9';
                    }

                    let solidActiveBg = '#ef4444';
                    if (status === 'homework') {
                      solidActiveBg = '#eab308';
                    } else if (status === 'mastered') {
                      solidActiveBg = '#34a853';
                    } else if (status === 'purple') {
                      solidActiveBg = '#af52de';
                    }

                    const isPageActive = activePageNumber === num;

                    return (
                      <button
                        key={num}
                        onClick={() => {
                          const isStudentCreated = Boolean(assigned?.isStudentCreated || assigned?.createdByRole === 'student' || book.created_by_role === 'student');
                          const isStudentViewingTeacherBook = Boolean(readOnly && !isStudentCreated);

                          if (activeBrush === 'STUDENT_FOCUS') {
                            toggleStudentFocusPage(assigned.lehrwerkId, num);
                            selectTextbookPage(assigned.lehrwerkId, num);
                            setShowAllPagesGrid(false);
                            return;
                          }

                          if (activeBrush !== 'NONE' && !isStudentViewingTeacherBook) {
                            let targetStatus: 'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED' = 'IN_PROGRESS';
                            let targetHomework = false;

                            if (activeBrush === 'LOCKED') {
                              targetStatus = 'IN_PROGRESS';
                              targetHomework = false;
                            } else if (activeBrush === 'HOMEWORK') {
                              targetStatus = 'IN_PROGRESS';
                              targetHomework = true;
                            } else if (activeBrush === 'MASTERED') {
                              targetStatus = 'MASTERED';
                              targetHomework = false;
                            } else if (activeBrush === 'THEORY') {
                              targetStatus = 'THEORY_DONE';
                              targetHomework = false;
                            }

                            triggerDirectSave(assigned.lehrwerkId, num, targetStatus, targetHomework);
                            selectTextbookPage(assigned.lehrwerkId, num, targetStatus, targetHomework);
                            setShowAllPagesGrid(false);
                            return;
                          }

                          const now = Date.now();
                          if (lastClickRef.current && lastClickRef.current.pageNum === num && (now - lastClickRef.current.timestamp) < 250) {
                            if (clickTimeoutRef.current) {
                              clearTimeout(clickTimeoutRef.current);
                              clickTimeoutRef.current = null;
                            }
                            lastClickRef.current = null;
                            if (!isStudentViewingTeacherBook) {
                              handlePageDoubleClick(assigned.lehrwerkId, num);
                            } else {
                              selectTextbookPage(assigned.lehrwerkId, num);
                            }
                            setShowAllPagesGrid(false);
                          } else {
                            lastClickRef.current = { pageNum: num, timestamp: now };
                            if (clickTimeoutRef.current) {
                              clearTimeout(clickTimeoutRef.current);
                            }
                            clickTimeoutRef.current = setTimeout(() => {
                              clickTimeoutRef.current = null;
                              lastClickRef.current = null;
                              selectTextbookPage(assigned.lehrwerkId, num);
                              setShowAllPagesGrid(false);
                            }, 250);
                          }
                        }}
                        style={{
                          position: 'relative',
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          border: isPageActive 
                            ? `2.5px solid ${solidActiveBg}` 
                            : (isStudentFocus ? '2.5px solid #8b5cf6' : `2px solid ${borderColor}`),
                          background: isPageActive ? solidActiveBg : bg,
                          color: isPageActive ? 'white' : textColor,
                          fontWeight: 900,
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s',
                          boxShadow: isStudentFocus 
                            ? (isPageActive ? '0 0 0 3px #8b5cf6, 0 4px 12px rgba(139, 92, 246, 0.4)' : '0 0 0 2px #8b5cf6, 0 2px 8px rgba(139, 92, 246, 0.35)')
                            : (isPageActive ? '0 4px 10px rgba(0,0,0,0.15)' : 'none'),
                          transform: isPageActive ? 'scale(1.1)' : 'none'
                        }}
                      >
                        <span>{num}</span>
                        {isStudentFocus && (
                          <span 
                            title="Schüler-Übefokus" 
                            style={{
                              position: 'absolute',
                              top: '-3px',
                              right: '-3px',
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              background: '#8b5cf6',
                              border: '2px solid #ffffff',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                              display: 'inline-block'
                            }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      </div>

        {/* Premium Schritt-für-Schritt Onboarding Modal Overlay */}
        {showProtokollOnboarding && (
          <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: 'fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '28px',
              width: '100%',
              maxWidth: '640px',
              padding: '36px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
              border: '1.5px solid rgba(255, 255, 255, 0.8)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Top Progress Bar & Step Dots */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {[0, 1, 2, 3].map((stepIdx) => (
                    <div
                      key={stepIdx}
                      style={{
                        width: stepIdx === onboardingStep ? '28px' : '8px',
                        height: '8px',
                        borderRadius: '4px',
                        background: stepIdx === onboardingStep ? '#34a853' : (stepIdx < onboardingStep ? '#a7f3d0' : '#e2e8f0'),
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    />
                  ))}
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', marginLeft: '6px' }}>
                    Schritt {onboardingStep + 1} von 4
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    try { localStorage.setItem('groovelab_protokoll_onboarding_seen', 'true'); } catch(e){}
                    setShowProtokollOnboarding(false);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Überspringen
                </button>
              </div>

              {/* Step Content */}
              {onboardingStep === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ background: '#e6f4ea', width: '52px', height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <BookOpen size={28} color="#34a853" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#0f172a', margin: 0 }}>
                        Dein zentrales Wochen-Protokoll
                      </h3>
                      <span style={{ fontSize: '0.74rem', color: '#34a853', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Wochenaufgaben & Lehrer-Notizen
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                    Im <strong>Schüler-Protokoll</strong> findest du alle wöchentlichen Hausaufgaben, Lehrwerkseiten und Notizen deines Lehrers. Es bildet das Herzstück deines Musikunterrichts bei <strong>Campus-Groovelab</strong>.
                  </p>
                  <div style={{ background: '#f8fafc', borderRadius: '18px', padding: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Check size={16} color="#34a853" />
                      <span>Transparenter Wochenfortschritt für Schüler & Eltern</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Check size={16} color="#34a853" />
                      <span>Historie aller vergangenen Unterrichtsstunden nachschlagen</span>
                    </div>
                  </div>
                </div>
              )}

              {onboardingStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ background: '#fef3c7', width: '52px', height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Clock size={28} color="#d97706" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#0f172a', margin: 0 }}>
                        Fokus-Timer, XP & Streaks
                      </h3>
                      <span style={{ fontSize: '0.74rem', color: '#d97706', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Selbstständiges Üben belohnen
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                    Starte beim Üben zu Hause den <strong>Fokus-Timer</strong>. Erreiche mindestens 3 Minuten Fokuszeit, um deinen Tages-Bonus freizuschalten, XP-Punkte zu sammeln und deine Übe-Streak-Flamme am Brennen zu halten!
                  </p>
                  <div style={{ background: '#fffbeb', borderRadius: '18px', padding: '16px', border: '1px dashed #fde68a', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Flame size={24} color="#f97316" />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#b45309' }}>1 Min. Übezeit = 1 XP | Tages-Ziel = +10 XP Bonus</span>
                      <span style={{ fontSize: '0.74rem', color: '#d97706' }}>Disziplin zahlt sich aus: Halte deine Streak über 7, 14 & 30 Tage!</span>
                    </div>
                  </div>
                </div>
              )}

              {onboardingStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ background: '#e0e7ff', width: '52px', height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Mic size={28} color="#4f46e5" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#0f172a', margin: 0 }}>
                        Audio-Aufnahme & Loopstation Studio
                      </h3>
                      <span style={{ fontSize: '0.74rem', color: '#4f46e5', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Interaktives Recording & Band-Labor
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                    Nimm deine Übe-Fortschritte direkt als Sprach-/Instrumenten-Memo im Protokoll auf oder nutze die <strong>Web-Audio Loopstation</strong> zum Einspielen eigener Mehrspur-Beats & Songs!
                  </p>
                  <div style={{ background: '#f8fafc', borderRadius: '18px', padding: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Headphones size={24} color="#4f46e5" />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b' }}>Sample-Accurate Recording & Dynamic Waveforms</span>
                      <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Höre deine Aufnahmen jederzeit im Hausaufgabenheft an.</span>
                    </div>
                  </div>
                </div>
              )}

              {onboardingStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ background: '#fef9c3', width: '52px', height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Award size={28} color="#ca8a04" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#0f172a', margin: 0 }}>
                        Meisterwerke & Campus-Sammelsticker
                      </h3>
                      <span style={{ fontSize: '0.74rem', color: '#ca8a04', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Glänzende Auszeichnungen sammeln
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                    Für gemeisterte Songs und Meilensteine erhältst du glänzende <strong>Campus-Sammelsticker</strong> für dein virtuelles Sammelalbum. Sammle seltene, epische & legendäre Sticker und teile deine Urkunden!
                  </p>
                  <div style={{ background: '#fefce8', borderRadius: '18px', padding: '16px', border: '1px dashed #fef08a', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Star size={24} color="#eab308" />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#854d0e' }}>Dein persönliches Sticker-Sammelalbum</span>
                      <span style={{ fontSize: '0.74rem', color: '#a16207' }}>Erfolge bleiben dein ganzes Schuljahr über sichtbar!</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Control Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <button
                  type="button"
                  disabled={onboardingStep === 0}
                  onClick={() => setOnboardingStep(prev => Math.max(0, prev - 1))}
                  style={{
                    background: 'transparent',
                    border: '1px solid #cbd5e1',
                    color: onboardingStep === 0 ? '#cbd5e1' : '#475569',
                    borderRadius: '12px',
                    padding: '10px 18px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: onboardingStep === 0 ? 'default' : 'pointer'
                  }}
                >
                  Zurück
                </button>

                {onboardingStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(prev => Math.min(3, prev + 1))}
                    style={{
                      background: '#34a853',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '10px 24px',
                      fontSize: '0.84rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(52, 168, 83, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>Weiter</span>
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      try { localStorage.setItem('groovelab_protokoll_onboarding_seen', 'true'); } catch(e){}
                      setShowProtokollOnboarding(false);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #34a853 0%, #16a34a 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '10px 24px',
                      fontSize: '0.86rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      boxShadow: '0 6px 18px rgba(52, 168, 83, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>Protokoll erkunden 🚀</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Floating Recording Saved Celebration Banner */}
        {recordingSavedToast && (
          <div
            style={{
              position: 'fixed',
              bottom: '28px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999999,
              background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '100px',
              boxShadow: '0 12px 36px rgba(22, 163, 74, 0.4), 0 4px 12px rgba(0,0,0,0.18)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.94rem',
              fontWeight: 900,
              letterSpacing: '-0.01em',
              pointerEvents: 'none',
              animation: 'fade-in 0.25s ease-out'
            }}
          >
            <span>{recordingSavedToast}</span>
          </div>
        )}
      </div>
    );

    // ── Skill-Radar Drawer ──────────────────────────────────────────────
    const skillRadarDrawer = showSkillRadar ? createPortal(
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(9,9,11,0.72)', backdropFilter: 'blur(18px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
        onClick={() => setShowSkillRadar(false)}
      >
        <div
          style={{ background: 'white', borderRadius: '28px', width: '100%', maxWidth: '840px', maxHeight: '90vh', overflowY: 'auto', padding: '20px', boxShadow: '0 30px 80px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', gap: '16px' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>Skill-Radar Cockpit</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Entwicklungs-Analyse & Kompetenz-Cockpit</p>
            </div>
            <button
              onClick={() => setShowSkillRadar(false)}
              style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={16} color="#475569" />
            </button>
          </div>

          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            {renderSkillRadarTabContent()}
          </div>
        </div>
      </div>,
      document.body
    ) : null;
    // ────────────────────────────────────────────────────────────────────

    // Embed-Modus ohne Fullscreen: normal eingebettet (kein Overlay)
    if (isEmbed && !isFullscreen) {
      return (
        <>
          <div style={{ width: '100%', height: (isMobileOrSim || isMobileView) ? '100%' : 'calc(100vh - 120px)', minHeight: (isMobileOrSim || isMobileView) ? '100%' : '600px', fontFamily: '"Inter", sans-serif' }}>
            {content}
          </div>
          {skillRadarDrawer}
          {certModalSong && (
            <React.Suspense fallback={null}>
              <MeisterwerkCertificateModal
                studentName={certModalSong.studentName}
                songTitle={certModalSong.songTitle}
                instrument={certModalSong.instrument}
                schoolName={certModalSong.schoolName}
                teacherName={certModalSong.teacherName}
                masteredDate={certModalSong.masteredDate}
                certificateId={certModalSong.certificateId}
                onClose={() => setCertModalSong(null)}
              />
            </React.Suspense>
          )}
          {isTransferModalOpen && (
            <HomeworkTransferModal
              isOpen={isTransferModalOpen}
              onClose={() => setIsTransferModalOpen(false)}
              targetWeekNum={getTargetWeekIso(viewingWeekOffset).split('-W')[1] || ''}
              targetWeekIso={getTargetWeekIso(viewingWeekOffset)}
              targetDateSpan={getWeekDateRange(viewingWeekOffset).dateSpan}
              sourceWeekNum={(() => {
                const prevTarget = getSimulatedNow();
                prevTarget.setDate(prevTarget.getDate() + ((viewingWeekOffset - 1) * 7));
                return getISOWeek(prevTarget).split('-W')[1] || '';
              })()}
              sourceLehrwerke={sourceTransferData.sourceLW}
              sourceSongs={sourceTransferData.sourceS}
              sourceAudios={sourceTransferData.sourceA}
              onExecuteTransfer={handleExecuteBatchTransfer}
            />
          )}
          {renderAgeUiInfoModal()}
        </>
      );
    }

    const simTarget = typeof document !== 'undefined' ? (document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait, .sim-viewport-tablet') as HTMLElement) : null;
    const portalTarget = simTarget || document.body;

    // Embed-Modus MIT Fullscreen ODER normales Modal → immer als Portal über alles
    return (
      <>
        {createPortal(
          <div
            ref={modalContainerRef}
            className="meisterwerk-modal-portal-overlay"
            style={{
              position: isInsideSim ? 'absolute' : 'fixed',
              inset: 0,
              zIndex: 99999,
              background: isFullscreen ? 'transparent' : (isMobileOrSim ? '#ffffff' : 'rgba(9, 9, 11, 0.85)'),
              backdropFilter: isFullscreen ? 'none' : 'blur(20px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: (isFullscreen || isInsideSim || isMobileView) ? '0' : '20px',
              fontFamily: '"Inter", sans-serif',
              overflow: 'hidden',
              overscrollBehavior: 'contain',
              transition: 'background 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {content}
          </div>,
          portalTarget
        )}
        {skillRadarDrawer}
        {certModalSong && (
          <React.Suspense fallback={null}>
            <MeisterwerkCertificateModal
              studentName={certModalSong.studentName}
              songTitle={certModalSong.songTitle}
              instrument={certModalSong.instrument}
              schoolName={certModalSong.schoolName}
              teacherName={certModalSong.teacherName}
              masteredDate={certModalSong.masteredDate}
              certificateId={certModalSong.certificateId}
              onClose={() => setCertModalSong(null)}
            />
          </React.Suspense>
        )}
        {isTransferModalOpen && (
          <HomeworkTransferModal
            isOpen={isTransferModalOpen}
            onClose={() => setIsTransferModalOpen(false)}
            targetWeekNum={getTargetWeekIso(viewingWeekOffset).split('-W')[1] || ''}
            targetWeekIso={getTargetWeekIso(viewingWeekOffset)}
            targetDateSpan={getWeekDateRange(viewingWeekOffset).dateSpan}
            sourceWeekNum={(() => {
              const prevTarget = getSimulatedNow();
              prevTarget.setDate(prevTarget.getDate() + ((viewingWeekOffset - 1) * 7));
              return getISOWeek(prevTarget).split('-W')[1] || '';
            })()}
            sourceLehrwerke={sourceTransferData.sourceLW}
            sourceSongs={sourceTransferData.sourceS}
            sourceAudios={sourceTransferData.sourceA}
            onExecuteTransfer={handleExecuteBatchTransfer}
          />
        )}
        {renderAgeUiInfoModal()}
      </>
    );
  };

export default MeisterwerkDocumentationModal;
