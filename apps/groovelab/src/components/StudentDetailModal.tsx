import React, { useState, useEffect } from 'react';
import { X, Calendar, Music, Award, Star, Clock, User, Users, Sliders, GraduationCap, BookOpen, RefreshCw, Link, Eye, EyeOff, Mic, Play, Square, Download, Copy, Smartphone, Check, Pencil, ShieldCheck, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import QRCode from 'react-qr-code';
import { 
  ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts';

import { renderInstrumentIcon } from '../utils/instruments';
import { MeisterwerkDocumentationModal } from './MeisterwerkDocumentationModal';
import { useRealNamesVisibility, maskLastName } from '../utils/nameHelper';

const brandColor = 'var(--primary-color)';

interface StudentDetailModalProps {
  student: any;
  onClose: () => void;
  onOpenBandProfile?: (band: any) => void;
  onOpenTageskompass?: (student: any) => void;
  activePlatform?: 'secretary' | 'campus' | 'groovelab';
  onSwitchPlatform?: (newPlatform: 'campus' | 'groovelab') => void;
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

const getDefaultMusicianAvatarUrl = (instrument: string | null | undefined, role: string | null | undefined): string => {
  const isTeacher = (role || '').toLowerCase() === 'teacher' || (role || '').toLowerCase() === 'admin';
  if (isTeacher) return '/avatar_ghost.jpg';
  
  if (!instrument) return '/avatars/student_eguitar_1.png';
  const inst = instrument.toLowerCase().trim();
  if (inst.includes('guitar') || inst.includes('gitarre')) return '/avatars/student_boy_black_guitar.png';
  if (inst.includes('bass')) return '/avatars/student_boy_black_bass.png';
  if (inst.includes('drum') || inst.includes('schlagzeug')) return '/avatars/student_boy_black_drums.png';
  if (inst.includes('piano') || inst.includes('keys') || inst.includes('klavier') || inst.includes('keyboard')) return '/avatars/student_boy_black_piano.png';
  if (inst.includes('vocal') || inst.includes('gesang') || inst.includes('stimme') || inst.includes('singer')) return '/avatars/student_boy_red_vocals.png';
  return '/avatars/student_eguitar_1.png';
};

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ student, onClose, onOpenBandProfile, onOpenTageskompass, activePlatform, onSwitchPlatform }) => {
  const { visible: showRealNames, toggleVisibility: toggleRealNames } = useRealNamesVisibility();
  const [firstName, setFirstName] = useState<string>(student.first_name || '');
  const [lastName, setLastName] = useState<string>(student.last_name || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [showQrOverlay, setShowQrOverlay] = useState<boolean>(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [isGroovelabActive, setIsGroovelabActive] = useState<boolean>(student.is_groovelab_active ?? student.isGroovelabActive ?? false);
  const [isCampusActive, setIsCampusActive] = useState<boolean>(student.is_campus_active ?? student.isCampusActive ?? false);
  const [localTab, setLocalTab] = useState<'campus' | 'groovelab'>(() => {
    const isCampusAct = student.is_campus_active ?? student.isCampusActive ?? false;
    const isGrooveAct = student.is_groovelab_active ?? student.isGroovelabActive ?? false;
    if (!isCampusAct && isGrooveAct) return 'groovelab';
    if (activePlatform === 'groovelab' && isGrooveAct) return 'groovelab';
    return 'campus';
  });
  const isPlatformCampus = localTab === 'campus' || !isGroovelabActive;


  let displayAvatarSrc = student.photo_url || '/avatar_ghost.jpg';
  const role = (student.role || '').toLowerCase();
  const roles = Array.isArray(student.roles) ? student.roles.map((r: any) => String(r).toLowerCase()) : [];
  if (role === 'admin' || role === 'secretary' || roles.includes('admin') || roles.includes('secretary')) {
    displayAvatarSrc = '/campus_login_hero.png';
  } else if (isPlatformCampus) {
    displayAvatarSrc = getInstrumentAvatarUrl(student.instrument);
  } else {
    const isStudentAvatar = student.photo_url && (
      student.photo_url.includes('student_') ||
      student.photo_url.includes('bandstyle_') ||
      student.photo_url.includes('teen_') ||
      student.photo_url.includes('avatar_boy') ||
      student.photo_url.includes('avatar_girl')
    );
    const isInstrumentAvatar = !isStudentAvatar && student.photo_url && (
      student.photo_url.includes('avatar.png') || 
      student.photo_url.includes('guitar_avatar') || 
      student.photo_url.includes('gitarre_avatar_new') || 
      student.photo_url.includes('ebass_avatar') || 
      student.photo_url.includes('egitarre_avatar') || 
      student.photo_url.includes('kontrabass_avatar') || 
      student.photo_url.includes('bass_avatar') || 
      student.photo_url.includes('drums_avatar') || 
      student.photo_url.includes('schlagzeug_avatar') || 
      student.photo_url.includes('piano_avatar') || 
      student.photo_url.includes('klavier_avatar_new') || 
      student.photo_url.includes('vocals_avatar') || 
      student.photo_url.includes('gesang_avatar') || 
      student.photo_url.includes('trumpet_avatar') || 
      student.photo_url.includes('trompete_avatar_new') || 
      student.photo_url.includes('trombone_avatar') || 
      student.photo_url.includes('posaune_avatar') || 
      student.photo_url.includes('horn_avatar') || 
      student.photo_url.includes('horn_avatar_new') || 
      student.photo_url.includes('cello_avatar') || 
      student.photo_url.includes('cello_avatar_new') || 
      student.photo_url.includes('violin_avatar') || 
      student.photo_url.includes('violine_avatar_new') || 
      student.photo_url.includes('clarinet_avatar') || 
      student.photo_url.includes('klarinette_avatar_new') || 
      student.photo_url.includes('flute_avatar') || 
      student.photo_url.includes('querfloete_avatar') || 
      student.photo_url.includes('saxophone_avatar') || 
      student.photo_url.includes('saxophon_avatar_new') || 
      student.photo_url.includes('blockfloete_avatar') || 
      student.photo_url.includes('bariton_avatar') || 
      student.photo_url.includes('oboe_avatar')
    );
    const isTeacherAvatar = student.photo_url && (
      student.photo_url.includes('teacher_') ||
      student.photo_url.includes('avatar_teacher')
    );
    if (student.role === 'teacher') {
      displayAvatarSrc = isTeacherAvatar ? student.photo_url : '/avatar_ghost.jpg';
    } else if (!student.photo_url || isInstrumentAvatar || student.photo_url === '/avatar_ghost.jpg') {
      displayAvatarSrc = '/avatar_ghost.jpg';
    }
  }

  useEffect(() => {
    if (activePlatform) {
      if (activePlatform === 'groovelab' && isGroovelabActive) {
        setLocalTab('groovelab');
      } else if (!isCampusActive && isGroovelabActive) {
        setLocalTab('groovelab');
      } else {
        setLocalTab('campus');
      }
    }
  }, [activePlatform, isCampusActive, isGroovelabActive]);

  const handleTabChange = (tab: 'campus' | 'groovelab') => {
    setLocalTab(tab);
  };

  const [skills, setSkills] = useState<any[]>([]);
  const [bands, setBands] = useState<any[]>([]);
  const [vocalsSongIds, setVocalsSongIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showFullPhoto, setShowFullPhoto] = useState(false);
  const [sessionsList, setSessionsList] = useState<any[]>([]);
  const [showPresenceLogOverlay, setShowPresenceLogOverlay] = useState(false);
  const [planningList, setPlanningList] = useState<any[]>([]);
  const [schedulesList, setSchedulesList] = useState<any[]>([]);
  const [avatar, setAvatar] = useState<any>(null);
  const [studentStats, setStudentStats] = useState<any>(null);
  const [exemptFromDirectBilling, setExemptFromDirectBilling] = useState<boolean>(student.exempt_from_direct_billing ?? false);
  const [isPremiumActive, setIsPremiumActive] = useState<boolean>(false);
  const [lessonDuration, setLessonDuration] = useState<number>(student.lesson_duration || 30);
  const [appUsageMode, setAppUsageMode] = useState<string>(student.app_usage_mode || 'student_only');
  const [parentPin, setParentPin] = useState<string>(student.parent_pin || '');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupStudents, setGroupStudents] = useState<any[]>([]);
  const [schoolStudents, setSchoolStudents] = useState<any[]>([]);
  const [selectedStudentToLink, setSelectedStudentToLink] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [campusRequestSent, setCampusRequestSent] = useState<boolean>(() => {
    return localStorage.getItem(`req_campus_${student.id}`) === 'true';
  });
  const [groovelabRequestSent, setGroovelabRequestSent] = useState<boolean>(() => {
    return localStorage.getItem(`req_groovelab_${student.id}`) === 'true';
  });
  const [durationRequestSent, setDurationRequestSent] = useState<boolean>(() => {
    return localStorage.getItem(`req_duration_${student.id}`) !== null;
  });
  const [requestedDuration, setRequestedDuration] = useState<number>(() => {
    const val = localStorage.getItem(`req_duration_${student.id}`);
    return val ? parseInt(val) : 45;
  });
  const [showDurationRequestDropdown, setShowDurationRequestDropdown] = useState<boolean>(false);

  // Lehrwerke assigned to student states
  const [globalLehrwerke, setGlobalLehrwerke] = useState<any[]>([]);
  const [assignedLehrwerke, setAssignedLehrwerke] = useState<any[]>([]);
  const [activeLehrwerkId, setActiveLehrwerkId] = useState<string | null>(null);
  const [activePageNumber, setActivePageNumber] = useState<number | null>(null);
  const [pageNoteText, setPageNoteText] = useState<string>('');

  const [showTageskompassModal, setShowTageskompassModal] = useState(false);
  const [currentTeacherId, setCurrentTeacherId] = useState<string | undefined>(undefined);
  const [schoolName, setSchoolName] = useState<string>('Campus Musikschule');
  const [localQrToken, setLocalQrToken] = useState<string>(student.qr_token || '');
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [copiedOnboardingLink, setCopiedOnboardingLink] = useState(false);
  const [copiedCampusLink, setCopiedCampusLink] = useState(false);
  const [copiedGrooveLink, setCopiedGrooveLink] = useState(false);
  const [consentLogs, setConsentLogs] = useState<any[]>([]);

  const isOwnProfile = currentTeacherId === student.id;
  const isPeerStudent = currentUserRole === 'student' && !isOwnProfile;

  useEffect(() => {
    if (isPeerStudent) {
      setLocalTab('groovelab');
    }
  }, [isPeerStudent]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const loggedInUserId = sessionStorage.getItem('groovelab_user_id');
      if (loggedInUserId) {
        setCurrentTeacherId(loggedInUserId);
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('id', loggedInUserId)
          .single();
        if (data) {
          setCurrentUserRole(data.role);
        }
      } else {
        // Fallback to supabase auth user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentTeacherId(user.id);
          const { data } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();
          if (data) {
            setCurrentUserRole(data.role);
          }
        }
      }
    };
    fetchCurrentUser();
  }, []);

  const handleSaveName = async () => {
    try {
      if (!editFirstName.trim() || !editLastName.trim()) {
        alert('Vorname und Nachname dürfen nicht leer sein.');
        return;
      }
      const { error } = await supabase
        .from('users')
        .update({
          first_name: editFirstName.trim(),
          last_name: editLastName.trim()
        })
        .eq('id', student.id);
      if (error) throw error;
      setFirstName(editFirstName.trim());
      setLastName(editLastName.trim());
      student.first_name = editFirstName.trim();
      student.last_name = editLastName.trim();
      setIsEditingName(false);
    } catch (err: any) {
      alert('Fehler beim Speichern des Namens: ' + err.message);
    }
  };

  useEffect(() => {
    const fetchQrToken = async () => {
      if (!student.qr_token && student.id) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('qr_token')
            .eq('id', student.id)
            .single();
          if (data && data.qr_token) {
            setLocalQrToken(data.qr_token);
            student.qr_token = data.qr_token;
          } else {
            setLocalQrToken('');
          }
        } catch (err) {
          console.error('Error fetching qr_token in StudentDetailModal:', err);
          setLocalQrToken('');
        }
      } else {
        setLocalQrToken(student.qr_token || '');
      }
    };
    fetchQrToken();
  }, [student.id, student.qr_token]);

  const handleRegenerateQrToken = async () => {
    if (!window.confirm('Möchtest du diesen QR-Code wirklich sperren und neu generieren? Der alte Code verliert sofort seine Gültigkeit.')) {
      return;
    }
    
    let newUuid: string;
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      newUuid = crypto.randomUUID();
    } else {
      newUuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          qr_token: newUuid,
          is_campus_active: true,
          is_groovelab_active: true
        })
        .eq('id', student.id);
        
      if (error) {
        alert('Fehler beim Sperren/Generieren des QR-Codes: ' + error.message);
      } else {
        setLocalQrToken(newUuid);
        student.qr_token = newUuid;
        student.is_campus_active = true;
        student.is_groovelab_active = true;
        alert('QR-Code erfolgreich neu generiert und Benutzerkonto reaktiviert!');
      }
    } catch (err: any) {
      console.error('Error updating qr_token:', err);
      alert('Fehler beim Aktualisieren: ' + (err.message || 'Unbekannter Fehler'));
    }
  };

  const handleGenerateOnboardingLink = async () => {
    try {
      const { data, error } = await supabase
        .from('student_onboarding_tokens')
        .insert({ student_id: student.id })
        .select('token')
        .single();

      if (error) throw error;
      
      const inviteUrl = `${window.location.origin}/?onboarding=parent&token=${data.token}`;
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedOnboardingLink(true);
      alert(`Personalisierter Onboarding-Link für ${student.first_name || 'Schüler'} wurde in die Zwischenablage kopiert!\n\nLink: ${inviteUrl}`);
      setTimeout(() => setCopiedOnboardingLink(false), 3000);
    } catch (err: any) {
      console.error('Error generating onboarding token:', err);
      alert('Der Onboarding-Link konnte nicht generiert werden: ' + err.message);
    }
  };

  useEffect(() => {
    const fetchSchool = async () => {
      let resolvedSchoolId = student.school_id || student.schoolId || (student.schools?.id) || (Array.isArray(student.schools) ? student.schools[0]?.id : null);
      
      if (!resolvedSchoolId && student.id) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('school_id')
            .eq('id', student.id)
            .single();
          if (data && data.school_id) {
            resolvedSchoolId = data.school_id;
          }
        } catch (err) {
          console.error('Error fetching student school_id:', err);
        }
      }

      if (resolvedSchoolId) {
        try {
          const { data, error } = await supabase
            .from('schools')
            .select('name')
            .eq('id', resolvedSchoolId)
            .single();
          if (data) {
            setSchoolName(data.name || 'Campus Musikschule');
          }
        } catch (err) {
          console.error('Error fetching school details:', err);
        }
      } else {
        setSchoolName('Campus Musikschule');
      }
    };

    fetchSchool();
  }, [student.id, student.school_id, student.schools]);

  // Removed redundant auth check

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

  useEffect(() => {
    setIsCampusActive(student.is_campus_active ?? student.isCampusActive ?? false);
    setIsGroovelabActive(student.is_groovelab_active ?? student.isGroovelabActive ?? false);
    setExemptFromDirectBilling(student.exempt_from_direct_billing ?? false);
    setLessonDuration(student.lesson_duration || 30);
    setCampusRequestSent(localStorage.getItem(`req_campus_${student.id}`) === 'true');
    setGroovelabRequestSent(localStorage.getItem(`req_groovelab_${student.id}`) === 'true');
    setDurationRequestSent(localStorage.getItem(`req_duration_${student.id}`) !== null);
    const val = localStorage.getItem(`req_duration_${student.id}`);
    setRequestedDuration(val ? parseInt(val) : 45);
  }, [student]);

  useEffect(() => {
    // Load global Lehrwerke from Supabase
    const fetchLehrwerke = async () => {
      try {
        let query = supabase.from('lehrwerke').select('*');
        const schoolId = student.school_id || student.schoolId;
        if (schoolId) {
          query = query.eq('school_id', schoolId);
        }
        const { data: lehrwerkeData, error } = await query.order('title');
        if (error) throw error;

        if (lehrwerkeData && lehrwerkeData.length > 0) {
          const mapped = lehrwerkeData.map((item: any) => ({
            ...item,
            totalPages: item.total_pages || 50,
            emoji: item.emoji || '📖',
            color: item.color || '#456355'
          }));
          setGlobalLehrwerke(mapped);
        } else {
          setGlobalLehrwerke([]);
        }
      } catch (err) {
        console.error('Error fetching lehrwerke in StudentDetailModal:', err);
      }
    };

    fetchLehrwerke();

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
  }, [student.id, currentTeacherId]);

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

  const handleUnassignLehrwerk = async (lehrwerkId: string) => {
    if (!window.confirm('Möchtest du dieses Lehrwerk wirklich vom Profil des Schülers entfernen? Der gesamte bereits erreichte Fortschritt für dieses Lehrwerk wird gelöscht.')) return;
    try {
      const book = globalLehrwerke.find(b => b.id === lehrwerkId);
      if (book) {
        await supabase
          .from('progress_matrix')
          .delete()
          .eq('student_id', student.id)
          .like('topic_name', `${book.title} - Seite %`);
      }

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
      if (!newVal && isGroovelabActive) {
        setLocalTab('groovelab');
      }
      if (newVal) {
        localStorage.removeItem(`req_campus_${student.id}`);
        setCampusRequestSent(false);
      }
    } catch (err: any) {
      alert('Fehler beim Aktualisieren des Campus-Zugangs: ' + err.message);
    }
  };

  const handleToggleExemption = async (newVal: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ exempt_from_direct_billing: newVal })
        .eq('id', student.id);
      if (error) throw error;
      setExemptFromDirectBilling(newVal);
      student.exempt_from_direct_billing = newVal;
    } catch (err: any) {
      alert('Fehler beim Aktualisieren des Befreiungs-Status: ' + err.message);
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
      if (newVal) {
        localStorage.removeItem(`req_groovelab_${student.id}`);
        setGroovelabRequestSent(false);
      }
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
      localStorage.removeItem(`req_duration_${student.id}`);
      setDurationRequestSent(false);
    } catch (err: any) {
      alert('Fehler beim Aktualisieren der Unterrichtsform: ' + err.message);
    }
  };

  const handleUpdateAppUsageMode = async (mode: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ app_usage_mode: mode })
        .eq('id', student.id);
      if (error) throw error;
      setAppUsageMode(mode);
      student.app_usage_mode = mode;
    } catch (err: any) {
      alert('Fehler beim Aktualisieren des Nutzungsmodus: ' + err.message);
    }
  };

  const handleUpdateParentPin = async (newPin: string) => {
    try {
      if (newPin && !/^\d{4}$/.test(newPin)) {
        alert('Die Eltern-PIN muss genau 4 Ziffern lang sein.');
        return;
      }
      const { error } = await supabase
        .from('users')
        .update({ parent_pin: newPin || null })
        .eq('id', student.id);
      if (error) throw error;
      setParentPin(newPin);
      student.parent_pin = newPin;
    } catch (err: any) {
      alert('Fehler beim Aktualisieren der Eltern-PIN: ' + err.message);
    }
  };

  const handleLinkGroup = async () => {
    if (!selectedStudentToLink) return;
    try {
      const newGroupId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });
      
      const { error: err1 } = await supabase
        .from('users')
        .update({ group_id: newGroupId })
        .eq('id', student.id);
      if (err1) throw err1;

      const { error: err2 } = await supabase
        .from('users')
        .update({ group_id: newGroupId })
        .eq('id', selectedStudentToLink);
      if (err2) throw err2;

      alert('Gruppenunterricht erfolgreich eingerichtet!');
      setSelectedStudentToLink('');
      setStudentSearchQuery('');
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      alert('Fehler beim Einrichten: ' + err.message);
    }
  };

  const handleUnlinkGroup = async () => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ group_id: null })
        .eq('id', student.id);
      if (error) throw error;

      alert('Schüler erfolgreich aus der Gruppe entfernt!');
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      alert('Fehler beim Trennen: ' + err.message);
    }
  };

  const handleUpdateEvolutionLevel = async (level: number) => {
    try {
      const { error } = await supabase
        .from('avatars')
        .upsert({ 
          user_id: student.id, 
          evolution_level: level,
          instrument_type: student.instrument || 'Musiker',
          avatar_style: avatar?.avatar_style || 'student_eguitar_alt',
          xp: avatar?.xp || 0,
          streak_flame: avatar?.streak_flame || 0
        }, { onConflict: 'user_id' });
      if (error) throw error;
      
      const { data: updatedAvatar } = await supabase
        .from('avatars')
        .select('*')
        .eq('user_id', student.id)
        .single();
      setAvatar(updatedAvatar);
    } catch (err: any) {
      alert('Fehler beim Aktualisieren des Levels: ' + err.message);
    }
  };

  const handleUpdateStreak = async (newStreak: number) => {
    try {
      const { error: avatarErr } = await supabase
        .from('avatars')
        .update({ streak_flame: newStreak })
        .eq('user_id', student.id);
      if (avatarErr) throw avatarErr;

      const { error: statsErr } = await supabase
        .from('student_stats')
        .update({ streak_flame: newStreak })
        .eq('student_id', student.id);
      if (statsErr) throw statsErr;

      if (avatar) {
        setAvatar({ ...avatar, streak_flame: newStreak });
      }
      if (studentStats) {
        setStudentStats({ ...studentStats, streak_flame: newStreak });
      }
    } catch (err: any) {
      alert('Fehler beim Aktualisieren des Streaks: ' + err.message);
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
      // 1. Fetch latest user details (including group_id and school_id)
      const { data: latestUser } = await supabase
        .from('users')
        .select('first_name, last_name, is_campus_active, is_groovelab_active, lesson_duration, app_usage_mode, exempt_from_direct_billing, group_id, school_id, parent_pin')
        .eq('id', student.id)
        .single();

      let groupStudentIds = [student.id];
      if (latestUser) {
        setFirstName(latestUser.first_name || '');
        setLastName(latestUser.last_name || '');
        setIsCampusActive(latestUser.is_campus_active ?? false);
        setIsGroovelabActive(latestUser.is_groovelab_active ?? false);
        setExemptFromDirectBilling(latestUser.exempt_from_direct_billing ?? false);
        setLessonDuration(latestUser.lesson_duration || 30);
        setAppUsageMode(latestUser.app_usage_mode || 'student_only');
        setParentPin(latestUser.parent_pin || '');
        
        if (latestUser.group_id) {
          setGroupId(latestUser.group_id);
          const { data: grpUsers } = await supabase
            .from('users')
            .select('id, first_name, last_name')
            .eq('group_id', latestUser.group_id);
          if (grpUsers) {
            setGroupStudents(grpUsers.filter((u: any) => u.id !== student.id));
            groupStudentIds = grpUsers.map((u: any) => u.id);
          }
        } else {
          setGroupId(null);
          setGroupStudents([]);
        }

        // Fetch parent consent logs
        const { data: cLogs } = await supabase
          .from('parent_consent_logs')
          .select('created_at, ip_address, user_agent, consent_type')
          .eq('student_id', student.id)
          .order('created_at', { ascending: false });
        if (cLogs) setConsentLogs(cLogs);
      }

      // Fetch other school students (for group setup dropdown list)
      const targetSchoolId = latestUser?.school_id || student.school_id || student.schoolId;
      if (targetSchoolId) {
        const { data: allSchoolStudents } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .eq('school_id', targetSchoolId)
          .eq('role', 'student')
          .neq('id', student.id);
        setSchoolStudents(allSchoolStudents || []);
      } else {
        setSchoolStudents([]);
      }

      // Fetch skills (shared for group if linked)
      const { data: skillsData } = await supabase
        .from('user_song_skills')
        .select('*, songs(*)')
        .in('user_id', groupStudentIds);
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
        .select('*, stations(id, name, color)')
        .eq('user_id', student.id)
        .order('check_in_time', { ascending: false });
      setSessionsList(sessData || []);

      // Fetch lab_planning slots
      const { data: planData } = await supabase
        .from('lab_planning')
        .select('*')
        .eq('user_id', student.id);
      setPlanningList(planData || []);

      // Fetch approved, review, and draft student schedules (shared for group if linked)
      const { data: schedData } = await supabase
        .from('schedules')
        .select(`
          id,
          time_slot,
          day_of_week,
          status,
          rooms (name),
          teacher:users!schedules_teacher_id_fkey (first_name, last_name)
        `)
        .in('student_id', groupStudentIds)
        .in('status', ['approved', 'ready_for_admin_review', 'draft']);
      setSchedulesList(schedData || []);

      // Fetch premium status
      const { data: premiumInfo } = await supabase
        .from('premium_status')
        .select('is_premium_active')
        .eq('student_id', student.id)
        .maybeSingle();
      setIsPremiumActive(premiumInfo?.is_premium_active ?? false);

      // Fetch avatar details
      const { data: avatarRecord } = await supabase
        .from('avatars')
        .select('*')
        .eq('user_id', student.id)
        .maybeSingle();
      setAvatar(avatarRecord);

      // Fetch student stats
      const { data: statsRecord } = await supabase
        .from('student_stats')
        .select('*')
        .eq('student_id', student.id)
        .maybeSingle();
      setStudentStats(statsRecord);

      setLoading(false);
    };
    fetchData();
  }, [student.id, refreshTrigger]);

  const handleExportDSGVOJson = () => {
    let localHomework = [];
    try {
      const stored = localStorage.getItem('student_lehrwerke_progress');
      if (stored) {
        const parsed = JSON.parse(stored);
        localHomework = parsed.filter((item: any) => item.studentId === student.id);
      }
    } catch (e) {
      console.error('Error parsing homework progress for JSON export:', e);
    }

    const exportData = {
      exportMetadata: {
        document_type: "Datenschutzauskunft gem. Art. 15 DSGVO",
        platform_name: "Campus-Groovelab",
        technical_provider: "Patrick Huber, Karl-Fürstenberg-Str. 59, 79618 Rheinfelden",
        responsible_controller: schoolName || "Kooperations-Musikschule",
        export_date: new Date().toISOString()
      },
      studentProfile: {
        id: student.id,
        first_name: firstName,
        last_name: lastName,
        nickname: student.nickname || null,
        instrument: student.instrument || null,
        lesson_duration_minutes: lessonDuration,
        app_usage_mode: appUsageMode,
        is_campus_active: isCampusActive,
        is_groovelab_active: isGroovelabActive,
        is_premium_active: isPremiumActive,
        exempt_from_direct_billing: exemptFromDirectBilling,
        created_at: student.created_at || null,
        parent_pin_set: !!parentPin
      },
      consentLogs: consentLogs.map((log: any) => ({
        created_at: log.created_at,
        ip_address: log.ip_address || "Anonymisiert",
        user_agent: log.user_agent || "Unbekannt",
        consent_type: log.consent_type === 'terms_privacy' ? 'AGB & Datenschutz akzeptiert' : 'Direkt-Kommunikation freigegeben'
      })),
      groupLinkage: {
        group_id: groupId,
        linked_partners: groupStudents.map((s: any) => ({
          id: s.id,
          first_name: s.first_name,
          last_name: s.last_name
        }))
      },
      bands: bands.map((b: any) => ({
        id: b.id,
        name: b.name,
        created_at: b.created_at
      })),
      gamificationProgress: studentStats ? {
        xp: studentStats.xp || 0,
        streak_flame: studentStats.streak_flame || 0,
        stickers: studentStats.stickers || []
      } : null,
      schedules: schedulesList.map((s: any) => ({
        id: s.id,
        time_slot: s.time_slot,
        day_of_week: s.day_of_week,
        status: s.status,
        room: s.rooms?.name || null,
        teacher: s.teacher ? `${s.teacher.first_name} ${s.teacher.last_name}` : null
      })),
      presenceSessions: sessionsList.map((s: any) => ({
        id: s.id,
        check_in_time: s.check_in_time,
        check_out_time: s.check_out_time,
        station_name: s.stations?.name || "Live Lab Terminal"
      })),
      homeworkAndLearningProgress: localHomework.map((item: any) => {
        const bookName = globalLehrwerke.find((b: any) => b.id === item.lehrwerkId)?.title || `Lehrwerk (ID: ${item.lehrwerkId})`;
        return {
          lehrwerk_title: bookName,
          lehrwerk_id: item.lehrwerkId,
          page_states: item.pageStates
        };
      })
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dsgvo-auskunft-${firstName}-${lastName}-${student.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportDSGVOPdf = () => {
    let localHomework = [];
    try {
      const stored = localStorage.getItem('student_lehrwerke_progress');
      if (stored) {
        const parsed = JSON.parse(stored);
        localHomework = parsed.filter((item: any) => item.studentId === student.id);
      }
    } catch (e) {
      console.error('Error parsing homework progress for PDF export:', e);
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Bitte erlauben Sie Popups für diese App, um den PDF-Export anzuzeigen.');
      return;
    }

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>DSGVO-Auskunft - ${firstName} ${lastName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;900&display=swap');
          body {
            font-family: 'Outfit', sans-serif;
            color: #1e293b;
            margin: 40px;
            line-height: 1.5;
            background: #ffffff;
          }
          .header {
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            margin: 0;
            font-size: 1.8rem;
            font-weight: 900;
            color: #0f172a;
          }
          .header-meta {
            font-size: 0.82rem;
            color: #64748b;
            margin-top: 8px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .section {
            margin-bottom: 25px;
            page-break-inside: avoid;
          }
          .section-title {
            font-size: 1.05rem;
            font-weight: 850;
            color: #0f172a;
            border-bottom: 1.5px solid #f1f5f9;
            padding-bottom: 6px;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
          .data-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 12px 16px;
            font-size: 0.85rem;
          }
          .data-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            border-bottom: 1px solid #f1f5f9;
          }
          .data-row:last-child {
            border-bottom: none;
          }
          .data-label {
            font-weight: 600;
            color: #475569;
          }
          .data-value {
            font-weight: 700;
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.8rem;
            margin-top: 8px;
          }
          th, td {
            text-align: left;
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
          }
          th {
            background: #f8fafc;
            font-weight: 800;
            color: #475569;
            text-transform: uppercase;
            font-size: 0.72rem;
            letter-spacing: 0.03em;
          }
          .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 6px;
            font-size: 0.68rem;
            font-weight: 800;
          }
          .badge-active {
            background: #e6f4ea;
            color: #137333;
          }
          .badge-inactive {
            background: #f1f5f9;
            color: #5f6368;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 0.72rem;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 16px;
          }
          @media print {
            body { margin: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Datenschutzauskunft gem. Art. 15 DSGVO</h1>
          <div class="header-meta">
            <div><strong>Verantwortliche Stelle:</strong> ${schoolName || 'Kooperations-Musikschule'}</div>
            <div><strong>Technischer Dienstleister:</strong> Patrick Huber, Karl-Fürstenberg-Str. 59, 79618 Rheinfelden</div>
            <div><strong>Exportiert am:</strong> ${new Date().toLocaleString('de-DE')}</div>
            <div><strong>Plattform:</strong> Campus-Groovelab</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">1. Schüler-Stammdaten</div>
          <div class="grid-2">
            <div class="data-box">
              <div class="data-row"><span class="data-label">Mitglieds-ID:</span><span class="data-value">${student.id}</span></div>
              <div class="data-row"><span class="data-label">Vorname:</span><span class="data-value">${firstName}</span></div>
              <div class="data-row"><span class="data-label">Nachname (Klartext):</span><span class="data-value">${lastName}</span></div>
              <div class="data-row"><span class="data-label">Künstlername/Nickname:</span><span class="data-value">${student.nickname || '-'}</span></div>
            </div>
            <div class="data-box">
              <div class="data-row"><span class="data-label">Instrument:</span><span class="data-value">${student.instrument || '-'}</span></div>
              <div class="data-row"><span class="data-label">Unterrichtszeit:</span><span class="data-value">${lessonDuration} Min.</span></div>
              <div class="data-row"><span class="data-label">Lizenzstatus Campus:</span><span class="data-value"><span class="badge ${isCampusActive ? 'badge-active' : 'badge-inactive'}">${isCampusActive ? 'Aktiv' : 'Inaktiv'}</span></span></div>
              <div class="data-row"><span class="data-label">Lizenzstatus GrooveLab:</span><span class="data-value"><span class="badge ${isGroovelabActive ? 'badge-active' : 'badge-inactive'}">${isGroovelabActive ? 'Aktiv' : 'Inaktiv'}</span></span></div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">2. Revisionssichere Einwilligungsprotokolle (DSGVO)</div>
          ${consentLogs.length === 0 ? '<p style="font-size:0.8rem; font-style:italic; color:#64748b;">Keine expliziten Einwilligungsprotokolle vorhanden (z.B. bei rein interner Schülerdatenverwaltung ohne Login).</p>' : `
          <table>
            <thead>
              <tr>
                <th>Zeitpunkt (DE)</th>
                <th>Einwilligungstyp</th>
                <th>IP-Adresse</th>
                <th>Browser / User-Agent</th>
              </tr>
            </thead>
            <tbody>
              ${consentLogs.map((log: any) => `
                <tr>
                  <td>${new Date(log.created_at).toLocaleString('de-DE')}</td>
                  <td><strong>${log.consent_type === 'terms_privacy' ? 'AGB &amp; Datenschutzerklärung akzeptiert' : 'Direktnachrichten / Chat freigegeben'}</strong></td>
                  <td>${log.ip_address || 'Anonymisiert'}</td>
                  <td style="max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${log.user_agent || 'Unbekannt'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          `}
        </div>

        <div class="section">
          <div class="section-title">3. Gamification- &amp; Aktivitäts-Fortschritte</div>
          <div class="data-box">
            <div class="grid-2">
              <div>
                <div class="data-row"><span class="data-label">Erfahrungspunkte (XP):</span><span class="data-value">${studentStats?.xp || 0} XP</span></div>
                <div class="data-row"><span class="data-label">Aktuelle Übe-Streak:</span><span class="data-value">${studentStats?.streak_flame || 0} Tage 🔥</span></div>
              </div>
              <div>
                <div class="data-row"><span class="data-label">Erhaltene Sticker:</span><span class="data-value">${(studentStats?.stickers || []).length} Sticker</span></div>
                <div class="data-row">
                  <span class="data-label">Stickernamen:</span>
                  <span class="data-value" style="font-size:0.75rem;">
                    ${(studentStats?.stickers || []).join(', ') || 'Keine'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">4. Stundenpläne &amp; Gruppenverknüpfungen</div>
          <div class="grid-2">
            <div class="data-box">
              <strong>Stundenplan-Einträge:</strong>
              ${schedulesList.length === 0 ? '<div style="margin-top:6px; color:#64748b; font-style:italic;">Keine Einträge</div>' : `
                <div style="margin-top:6px; font-size:0.8rem; display:flex; flex-direction:column; gap:4px;">
                  ${schedulesList.map((s: any) => `
                    <div>&bull; ${s.day_of_week} ${s.time_slot} Uhr (${s.rooms?.name || 'Kein Raum'}) bei ${s.teacher ? `${s.teacher.first_name} ${s.teacher.last_name}` : 'Lehrkraft'} [${s.status}]</div>
                  `).join('')}
                </div>
              `}
            </div>
            <div class="data-box">
              <strong>Gruppenunterricht-Verknüpfung:</strong>
              ${groupId ? `
                <div style="margin-top:6px; font-size:0.8rem;">
                  Gruppen-ID: ${groupId}<br/>
                  Verknüpfte Partner: ${groupStudents.map((s: any) => `${s.first_name} ${s.last_name}`).join(', ')}
                </div>
              ` : '<div style="margin-top:6px; color:#64748b; font-style:italic;">Einzelunterricht (keine Gruppenpartner)</div>'}
              <div style="margin-top:8px; border-top:1px solid #e2e8f0; padding-top:6px;">
                <strong>Bands/Ensembles:</strong>
                ${bands.length === 0 ? '<span style="color:#64748b; font-style:italic;"> Keine</span>' : `
                  <div style="margin-top:4px; font-size:0.8rem;">
                    ${bands.map((b: any) => `&bull; ${b.name}`).join('<br/>')}
                  </div>
                `}
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">5. Hausaufgabenheft &amp; Lernfortschritt</div>
          ${localHomework.length === 0 ? '<p style="font-size:0.8rem; font-style:italic; color:#64748b;">Kein Lernfortschritt im Hausaufgabenheft für diesen Schüler vorhanden.</p>' : `
            <div style="display:flex; flex-direction:column; gap:12px;">
              ${localHomework.map((item: any) => {
                const bookTitle = globalLehrwerke.find((b: any) => b.id === item.lehrwerkId)?.title || `Lehrwerk (ID: ${item.lehrwerkId})`;
                const pages = Object.entries(item.pageStates || {});
                return `
                  <div class="data-box">
                    <strong style="display:block; margin-bottom:6px; font-size:0.88rem; color:#0f172a;">${bookTitle}</strong>
                    ${pages.length === 0 ? '<span style="color:#64748b; font-style:italic; font-size:0.8rem;">Keine bearbeiteten Seiten</span>' : `
                      <table>
                        <thead>
                          <tr>
                            <th style="width:10%">Seite</th>
                            <th style="width:20%">Status</th>
                            <th style="width:45%">Notizen / Hausaufgabe</th>
                            <th style="width:25%">Aktualisiert am</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${pages.map(([pNum, state]: any) => `
                            <tr>
                              <td><strong>S. ${pNum}</strong></td>
                              <td><span class="badge ${state.status === 'mastered' ? 'badge-active' : 'badge-inactive'}">${state.status === 'homework' ? 'Hausaufgabe' : state.status === 'mastered' ? 'Meisterwerk' : 'Gesperrt'}</span></td>
                              <td>${state.notes || '-'}</td>
                              <td>${state.updatedAt ? new Date(state.updatedAt).toLocaleString('de-DE') : '-'}</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    `}
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <div class="section">
          <div class="section-title">6. Anwesenheits- &amp; Terminal-Checkins</div>
          ${sessionsList.length === 0 ? '<p style="font-size:0.8rem; font-style:italic; color:#64748b;">Keine Anwesenheitszeiten erfasst.</p>' : `
          <table>
            <thead>
              <tr>
                <th>Check-In Zeit</th>
                <th>Check-Out Zeit</th>
                <th>Terminal-Station</th>
              </tr>
            </thead>
            <tbody>
              ${sessionsList.map((s: any) => `
                <tr>
                  <td>${new Date(s.check_in_time).toLocaleString('de-DE')}</td>
                  <td>${s.check_out_time ? new Date(s.check_out_time).toLocaleString('de-DE') : 'automatisch ausgecheckt'}</td>
                  <td><strong>${s.stations?.name || 'Live Lab Terminal'}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          `}
        </div>

        <div class="footer">
          Erstellt am ${new Date().toLocaleString('de-DE')} im Auftrag der Schulleitung &middot; &copy; Campus-Groovelab
        </div>

        <script>
          window.addEventListener('load', () => {
            setTimeout(() => {
              window.print();
            }, 500);
          });
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };



  const memberSince = (() => {
    if (!student?.created_at) return 'unbekannt';
    const d = new Date(student.created_at);
    return isNaN(d.getTime()) ? 'unbekannt' : d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  })();

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
        if (!t || !t.includes(':')) return '00:00';
        let [h, m] = t.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return '00:00';
        m += 15;
        if (m >= 60) { h += 1; m = 0; }
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      };

      const toMin = (t: string) => {
        if (!t || !t.includes(':')) return 0;
        const [h, m] = t.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return 0;
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

  const currentXP = avatar?.xp || ((skills.filter((s: any) => { 
    const isVocal = (s.instrument || '').toLowerCase().includes('vocal') || (s.instrument || '').toLowerCase().includes('gesang'); 
    return s.is_stage_ready && !isVocal; 
  }).length + vocalsSongIds.size) * 100) || 0;

  const verifiedSongsCount = skills.filter((s: any) => s.is_stage_ready).length + vocalsSongIds.size;
  const focusMinutes = studentStats?.total_focus_minutes || studentStats?.monthly_focus_minutes || 0;
  const streakDays = avatar?.streak_flame || 0;

  const getCalendarWeek = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `KW ${weekNo} (${d.getUTCFullYear()})`;
  };

  const getDurationString = (checkIn: string, checkOut: string | null) => {
    const start = new Date(checkIn);
    const end = checkOut ? new Date(checkOut) : null;
    const startStr = start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    if (!end) {
      return `Aktiv... (seit ${startStr})`;
    }
    const endStr = end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
    return `${diffMins} Min. (${startStr} - ${endStr})`;
  };

  const formatDateDe = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleExportPresenceCSV = () => {
    if (!sessionsList || sessionsList.length === 0) {
      alert("Keine Anwesenheitsdaten zum Exportieren vorhanden.");
      return;
    }
    
    let csvContent = "\uFEFF";
    csvContent += "Schüler;Kalenderwoche;Datum;Station;Check-In;Check-Out;Dauer (Minuten)\n";
    
    sessionsList.forEach((s: any) => {
      const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim();
      const checkIn = new Date(s.check_in_time);
      const kw = getCalendarWeek(checkIn);
      const datum = checkIn.toLocaleDateString('de-DE');
      const station = s.stations?.name || 'Unbekannt';
      const checkInTime = checkIn.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      const checkOutTime = s.check_out_time ? new Date(s.check_out_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'Aktiv';
      
      let durationMins = '';
      if (s.check_out_time) {
        const diffMs = new Date(s.check_out_time).getTime() - checkIn.getTime();
        durationMins = String(Math.max(0, Math.floor(diffMs / 60000)));
      } else {
        durationMins = 'Aktiv';
      }
      
      csvContent += `"${studentName}";"${kw}";"${datum}";"${station}";"${checkInTime}";"${checkOutTime}";"${durationMins}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileName = `Anwesenheit_${student.first_name || 'Schueler'}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(242, 242, 247, 0.65)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <style>{`
        @media (max-width: 900px) {
          .student-detail-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          .student-detail-header {
            flex-wrap: wrap !important;
            gap: 16px !important;
          }
          .student-detail-panel {
            padding: 16px !important;
            border-radius: 24px !important;
          }
        }
      `}</style>
      <div className="glass-panel student-detail-panel animation-slide-up" style={{ background: 'rgba(255, 255, 255, 0.95)', padding: '32px', borderRadius: '32px', maxWidth: '920px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative', border: '1px solid rgba(0, 0, 0, 0.05)', boxShadow: '0 30px 60px rgba(0, 0, 0, 0.08)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
          <X size={20} />
        </button>
        
        {/* iOS-style Segmented Control Switch */}
        <div style={{ 
          marginBottom: '24px', 
          display: 'flex', 
          justifyContent: 'flex-start',
          alignItems: 'center' 
        }}>
          {!isPeerStudent && (
            <div style={{ 
              background: 'rgba(120, 120, 128, 0.12)', 
              borderRadius: '99px', 
              padding: '2px', 
              display: 'inline-flex', 
              gap: '2px' 
            }}>
              {isCampusActive && (
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
              )}
              {isGroovelabActive && (
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
              )}
            </div>
          )}

          {(currentUserRole === 'admin' || currentUserRole === 'teacher' || currentUserRole === 'secretary') && (
            <button
              type="button"
              onClick={() => {
                const link = `${window.location.origin}/onboarding/${localQrToken || student.qr_token || student.id}`;
                navigator.clipboard.writeText(link);
                alert(`${localTab === 'campus' ? 'Campus' : 'GrooveLab'}-Onboarding-Link in die Zwischenablage kopiert! 📋`);
              }}
              style={{
                marginLeft: 'auto',
                marginRight: '12px',
                border: '1.5px solid rgba(0, 0, 0, 0.05)',
                borderRadius: '99px',
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                background: '#f1f5f9',
                color: '#475569',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}
              className="hover-scale"
            >
              <Copy size={14} />
              <span>Onboarding-Link kopieren</span>
            </button>
          )}

          {!isPeerStudent && (
            <button
              type="button"
              onClick={() => setShowQrOverlay(true)}
              style={{
                marginLeft: (currentUserRole === 'admin' || currentUserRole === 'teacher' || currentUserRole === 'secretary') ? '0' : 'auto',
                marginRight: '60px',
                border: '1.5px solid rgba(0, 0, 0, 0.05)',
                borderRadius: '99px',
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                background: localTab === 'campus' ? 'linear-gradient(135deg, #34a853 0%, #34a853 100%)' : '#1e293b',
                color: '#ffffff',
                boxShadow: localTab === 'campus' ? '0 4px 12px rgba(52, 168, 83, 0.2)' : '0 4px 12px rgba(30, 41, 59, 0.2)'
              }}
              className="hover-scale"
            >
              <Award size={14} />
              <span>{localTab === 'campus' ? 'Campus Pass' : 'Member Pass'}</span>
            </button>
          )}
        </div>

        <div className="student-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1.25fr 360px', gap: '40px', alignItems: 'start', marginTop: '20px' }}>
          
          {/* LEFT COLUMN: Profile Header + Campus Core Data Lists */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Profile Info Header (Left aligned) */}
            <div className="student-detail-header" style={{ display: 'flex', gap: '28px', alignItems: 'flex-start', width: '100%', flexWrap: 'nowrap' }}>
              <div 
                onClick={() => setShowFullPhoto(true)}
                style={{ width: '120px', height: '120px', borderRadius: '28px', overflow: 'hidden', boxShadow: '0 10px 28px rgba(0,0,0,0.08)', border: '4px solid white', flexShrink: 0, cursor: 'pointer', transition: 'all 0.2s ease' }}
                className="hover-scale"
              >
                <img src={displayAvatarSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
                {isEditingName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <input 
                      type="text" 
                      value={editFirstName} 
                      onChange={e => setEditFirstName(e.target.value)} 
                      style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '1rem',
                        fontWeight: 700,
                        width: '120px',
                        outline: 'none'
                      }}
                    />
                    <input 
                      type="text" 
                      value={editLastName} 
                      onChange={e => setEditLastName(e.target.value)} 
                      style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '1rem',
                        fontWeight: 700,
                        width: '120px',
                        outline: 'none'
                      }}
                    />
                    <button 
                      onClick={handleSaveName}
                      style={{
                        background: '#34a853',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      Speichern
                    </button>
                    <button 
                      onClick={() => {
                        setEditFirstName(firstName);
                        setEditLastName(lastName);
                        setIsEditingName(false);
                      }}
                      style={{
                        background: '#f1f5f9',
                        color: '#64748b',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      Abbrechen
                    </button>
                  </div>
                ) : (
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', margin: 0, lineHeight: 1.1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{firstName} {maskLastName(lastName)}</span>
                    <button
                      type="button"
                      onClick={() => toggleRealNames()}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: showRealNames ? '#ea4335' : '#64748b',
                        padding: '4px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        transition: 'all 0.15s ease'
                      }}
                      title={showRealNames ? "Nachname ausblenden" : "Nachname einblenden (für 10s)"}
                      className="hover-scale-mini"
                    >
                      {showRealNames ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    {(currentUserRole === 'admin' || currentUserRole === 'secretary') && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditFirstName(firstName);
                          setEditLastName(lastName);
                          setIsEditingName(true);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748b',
                          padding: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          transition: 'all 0.15s ease'
                        }}
                        title="Name bearbeiten"
                        className="hover-scale-mini"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                  </h2>
                )}
                <div style={{ display: 'flex', gap: '16px', marginTop: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                    <Calendar size={14} /> Member seit {memberSince}
                  </div>
                </div>

                {/* Instrument challenge counters (only in GrooveLab mode) */}
                {!isPlatformCampus && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'nowrap' }}>
                    {['Guitar', 'Drums', 'Keys', 'Bass', 'Vocals'].map(inst => {
                      const count = skills.filter(s => {
                        const sInst = (s.instrument || '').toLowerCase();
                        const target = inst.toLowerCase();
                        let match = false;
                        if (target === 'guitar') match = sInst === 'guitar' || sInst === 'e-gitarre' || sInst === 'gitarre';
                        else if (target === 'bass') match = sInst === 'bass' || sInst === 'e-bass';
                        else if (target === 'drums') match = sInst === 'drums' || sInst === 'e-drums' || sInst === 'schlagzeug';
                        else if (target === 'keys') match = sInst === 'keys' || sInst === 'piano' || sInst === 'e-piano' || sInst === 'klavier' || sInst === 'keyboard';
                        else if (target === 'vocals') match = sInst === 'vocals' || sInst === 'gesang';
                        else match = sInst === target;
                        
                        const isMastered = s.is_stage_ready || s.progress_percent === 100;
                        return match && isMastered;
                      }).length + (inst === 'Vocals' ? vocalsSongIds.size : 0);

                      return (
                        <div 
                          key={inst} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '4px', 
                            background: '#f8fafc', 
                            padding: '4px 8px', 
                            borderRadius: '8px', 
                            border: '1px solid #f1f5f9' 
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center' }}>
                            {renderInstrumentIcon(inst, undefined, 13)}
                          </span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 900, color: count > 0 ? 'var(--primary-color)' : '#94a3b8' }}>
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Activation badges */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {isCampusActive && (
                    <span style={{ background: '#e6f4ea', color: '#34a853', padding: '4px 10px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 800 }}>
                      🎓 Campus
                    </span>
                  )}
                  {isGroovelabActive && (
                    <span style={{ background: '#fefce8', color: '#eab308', border: '1px solid #fef08a', padding: '4px 10px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 800 }}>
                      🎸 GrooveLab
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* KPIs Grid — tab-specific */}
            {isPlatformCampus ? (
              /* ---- CAMPUS KPIs: XP, Songs, Fokus, Streak ---- */
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', 
                gap: '12px', 
                marginTop: '8px',
                alignItems: 'stretch'
              }}>
                {/* Card 1: Campus XP (Blue) */}
                <div style={{
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  color: 'white',
                  borderRadius: '16px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 6px 15px rgba(29, 78, 216, 0.1)',
                  height: '100%',
                  boxSizing: 'border-box'
                }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.18)',
                    borderRadius: '10px',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Star size={18} fill="white" color="white" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif" }}>
                      {currentXP} XP
                    </div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.85, letterSpacing: '0.04em', marginTop: '2px', lineHeight: 1.1 }}>
                      XP GESAMMELT
                    </div>
                  </div>
                </div>

                {/* Card 2: Campus Songs (Green) */}
                <div style={{
                  background: 'linear-gradient(135deg, #34a853, #34a853)',
                  color: 'white',
                  borderRadius: '16px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 6px 15px rgba(19, 115, 51, 0.1)',
                  height: '100%',
                  boxSizing: 'border-box'
                }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.18)',
                    borderRadius: '10px',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Award size={18} fill="white" color="white" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif" }}>
                      {verifiedSongsCount} / {skills.length + vocalsSongIds.size}
                    </div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.85, letterSpacing: '0.04em', marginTop: '2px', lineHeight: 1.1 }}>
                      SONGS GEMEISTERT
                    </div>
                  </div>
                </div>

                {/* Card 3: Fokus (Yellow) */}
                <div style={{
                  background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)',
                  color: 'white',
                  borderRadius: '16px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 6px 15px rgba(234, 179, 8, 0.2)',
                  height: '100%',
                  boxSizing: 'border-box'
                }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.18)',
                    borderRadius: '10px',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Clock size={18} color="white" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif" }}>
                      {focusMinutes} Min
                    </div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.85, letterSpacing: '0.04em', marginTop: '2px', lineHeight: 1.1 }}>
                      FOKUS-ÜBEZEIT
                    </div>
                  </div>
                </div>

                {/* Card 4: Streak (Orange) */}
                <div style={{
                  background: 'linear-gradient(135deg, #f97316, #c2410c)',
                  color: 'white',
                  borderRadius: '16px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 6px 15px rgba(194, 65, 12, 0.1)',
                  height: '100%',
                  boxSizing: 'border-box'
                }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.18)',
                    borderRadius: '10px',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <span style={{ fontSize: '1.1rem', filter: 'grayscale(100%)' }}>🔥</span>
                  </div>
                   <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.15rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif" }}>
                        {streakDays} {streakDays === 1 ? 'Tag' : 'Tage'}
                      </span>
                      {(currentUserRole === 'admin' || currentUserRole === 'secretary') && (
                        <button
                          onClick={async () => {
                            const val = prompt('Übe-Streak (Tage) manuell anpassen:', String(streakDays));
                            if (val !== null) {
                              const num = parseInt(val, 10);
                              if (!isNaN(num) && num >= 0) {
                                await handleUpdateStreak(num);
                              } else {
                                alert('Bitte gib eine gültige Zahl >= 0 ein.');
                              }
                            }
                          }}
                          style={{
                            background: 'rgba(255, 255, 255, 0.25)',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.62rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            transition: 'background 0.2s',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
                        >
                          Bearbeiten
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.85, letterSpacing: '0.04em', marginTop: '4px', lineHeight: 1.1 }}>
                      SERIE AM LAUFEN
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ---- GROOVELAB KPIs: GrooveLab-XP, Anzahl Songs ---- */
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', 
                gap: '12px', 
                marginTop: '8px',
                alignItems: 'stretch'
              }}>
                {/* GL Card 1: GrooveLab XP (Yellow/Gold) */}
                <div style={{
                  background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)',
                  color: 'white',
                  borderRadius: '16px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 6px 15px rgba(234, 179, 8, 0.2)',
                  height: '100%',
                  boxSizing: 'border-box'
                }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.18)',
                    borderRadius: '10px',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Star size={18} fill="white" color="white" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif" }}>
                      {verifiedSongsCount * 100} XP
                    </div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.85, letterSpacing: '0.04em', marginTop: '2px', lineHeight: 1.1 }}>
                      GROOVELAB XP
                    </div>
                  </div>
                </div>

                {/* GL Card 2: Anzahl Songs (Blue) */}
                <div style={{
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  color: 'white',
                  borderRadius: '16px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 6px 15px rgba(29, 78, 216, 0.15)',
                  height: '100%',
                  boxSizing: 'border-box'
                }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.18)',
                    borderRadius: '10px',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Music size={18} fill="white" color="white" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif" }}>
                      {verifiedSongsCount}
                    </div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.85, letterSpacing: '0.04em', marginTop: '2px', lineHeight: 1.1 }}>
                      SONGS GEMEISTERT
                    </div>
                  </div>
                </div>
              </div>
            )}



            {/* View Specific Left Content */}
            {isPlatformCampus ? (
              // ---------------- CAMPUS SPECIFIC VIEW DATA LISTS (LEFT) ----------------
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', marginTop: '10px' }}>
                <section>
                  {schedulesList.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {schedulesList
                        .sort((a, b) => {
                          if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
                          return (a.time_slot || '').localeCompare(b.time_slot || '');
                        })
                        .map((sched) => {
                          const isApproved = sched.status === 'approved';
                          const isReview = sched.status === 'ready_for_admin_review';
                          const statusText = isApproved ? 'Aktiv' : isReview ? 'In Prüfung' : 'Entwurf';
                          const badgeBg = isApproved ? '#ffffff' : isReview ? '#ffffff' : '#e2e8f0';
                          const badgeColor = isApproved ? '#34a853' : isReview ? '#b45309' : '#64748b';
                          const cardBg = isApproved ? '#e6f4ea' : isReview ? '#fffbeb' : '#f8fafc';
                          const cardBorder = isApproved ? '1.5px solid rgba(52, 168, 83, 0.15)' : isReview ? '1.5px solid rgba(245, 158, 11, 0.15)' : '1.5px solid #e2e8f0';
                          const textColor = isApproved ? '#34a853' : isReview ? '#b45309' : '#475569';

                          const WEEKDAYS_DE = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
                          const weekday = WEEKDAYS_DE[sched.day_of_week] || 'Wochentag';
                          const roomName = sched.rooms?.name || 'Unterrichtsraum';
                          const teacherName = sched.teacher 
                            ? `${sched.teacher.first_name} ${sched.teacher.last_name}` 
                            : 'Unbekannte Lehrkraft';

                          return (
                            <div 
                              key={sched.id} 
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '12px', 
                                padding: '10px 14px', 
                                background: cardBg, 
                                border: cardBorder, 
                                borderRadius: '14px',
                                color: textColor
                              }}
                            >
                              <div style={{ 
                                width: '46px', 
                                height: '46px', 
                                borderRadius: '10px', 
                                background: '#ffffff', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
                                flexShrink: 0,
                                border: `1px solid ${isApproved ? 'rgba(52, 168, 83, 0.1)' : 'rgba(245, 158, 11, 0.1)'}`
                              }}>
                                <span style={{ fontSize: '0.58rem', fontWeight: 900, textTransform: 'uppercase', opacity: 0.7 }}>{weekday.substring(0, 2)}</span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 900, marginTop: '-2px' }}>{sched.time_slot}</span>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <strong style={{ fontSize: '0.85rem', color: textColor, fontWeight: 800 }}>
                                    Einzelunterricht bei {teacherName}
                                  </strong>
                                  <span style={{ 
                                    background: badgeBg, 
                                    color: badgeColor, 
                                    padding: '2px 6px', 
                                    borderRadius: '6px', 
                                    fontSize: '0.58rem', 
                                    fontWeight: 900,
                                    border: isApproved ? '1px solid rgba(52, 168, 83,0.15)' : '1px solid rgba(245,158,11,0.15)'
                                  }}>
                                    {statusText}
                                  </span>
                                </div>
                                <span style={{ display: 'block', fontSize: '0.72rem', color: textColor, opacity: 0.8, marginTop: '2px', fontWeight: 650 }}>
                                  🏢 {roomName} &bull; {weekday}s
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }}>
                      Keine Unterrichtsstunden im Stundenplan eingetragen.
                    </div>
                  )}
                </section>

                {/* Songs & Lehrwerke Section */}
                <section style={{ 
                  background: '#f8fafc',
                  borderRadius: '24px',
                  padding: '20px 24px',
                  border: '1.5px solid #f1f5f9',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', width: '100%' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', color: '#34a853', letterSpacing: '0.08em', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Music size={16} /> Songs & Lehrwerke
                    </h3>

                    {/* Schüler-Notizbuch Button */}
                    <button
                      onClick={() => {
                        if (onOpenTageskompass) {
                          onOpenTageskompass(student);
                        } else {
                          setShowTageskompassModal(true);
                        }
                      }}
                      style={{
                        border: '1.5px solid #dfd3be',
                        borderRadius: '99px',
                        padding: '6px 14px',
                        fontSize: '0.74rem',
                        fontWeight: 850,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        background: 'linear-gradient(135deg, #fdfaf2 0%, #f4e8d1 100%)',
                        color: '#5c4033',
                        boxShadow: '0 4px 12px rgba(139, 90, 43, 0.06)',
                        fontFamily: 'inherit',
                        height: '30px',
                        boxSizing: 'border-box'
                      }}
                      className="hover-scale"
                    >
                      <span style={{ fontSize: '0.85rem', lineHeight: '1' }}>📓</span>
                      <span style={{ fontFamily: 'Urbanist, sans-serif', letterSpacing: '0.01em' }}>Schüler-Notizbuch</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Lehrwerke Row */}
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>Aktive Lehrwerke</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {(assignedLehrwerke || []).map((assigned) => {
                          const book = globalLehrwerke.find(b => b.id === assigned.lehrwerkId);
                          if (!book) return null;

                          // Compute progress
                          const pageStates = assigned.pageStates || {};
                          const totalPages = book.totalPages || 50;
                          const masteredCount = Object.values(pageStates).filter((p: any) => p.status === 'mastered').length;
                          const percent = Math.round((masteredCount / totalPages) * 100);

                          const bookColor = getLehrwerkColor(book.title);

                          return (
                            <div key={assigned.lehrwerkId} style={{ 
                              background: '#ffffff', 
                              padding: '8px 12px', 
                              borderRadius: '12px', 
                              border: '1px solid #e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.82rem'
                            }}>
                              <span style={{ fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                  width: '24px',
                                  height: '32px',
                                  background: `linear-gradient(135deg, ${bookColor.from}, ${bookColor.to})`,
                                  borderRadius: '4px',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                  border: 'none',
                                  position: 'relative',
                                  flexShrink: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <BookOpen size={11} color={bookColor.text} />
                                  <div style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    bottom: 0,
                                    width: '3px',
                                    background: 'rgba(0,0,0,0.08)',
                                    borderRight: '1px solid rgba(255,255,255,0.1)'
                                  }} />
                                </div>
                                <span>{book.title}</span>
                              </span>
                              <span style={{ 
                                background: percent > 0 ? '#e6f4ea' : '#f1f5f9', 
                                color: percent > 0 ? '#34a853' : '#64748b', 
                                padding: '2px 8px', 
                                borderRadius: '6px', 
                                fontWeight: 900,
                                fontSize: '0.75rem' 
                              }}>
                                {percent}% gemeistert
                              </span>
                            </div>
                          );
                        })}
                        {(assignedLehrwerke || []).length === 0 && (
                          <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>Keine aktiven Lehrwerke zugewiesen.</div>
                        )}
                      </div>
                    </div>

                    {/* Divider line inside card */}
                    <div style={{ height: '1px', background: '#e2e8f0' }} />

                    {/* Songs Row */}
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>Aktive Songs & Übungen</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {/* Active (practice) songs */}
                        {practiceBoard.map((s: any) => (
                          <div key={s.id + s.level} style={{ 
                            background: '#ffffff', 
                            padding: '8px 12px', 
                            borderRadius: '12px', 
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.82rem'
                          }}>
                            <span style={{ fontWeight: 800, color: '#1e293b' }}>
                              🎸 {s.title} <span style={{ fontWeight: 500, color: '#64748b', fontSize: '0.75rem' }}>({s.artist})</span>
                            </span>
                            <span style={{ 
                              background: '#eff6ff', 
                              color: '#2563eb', 
                              padding: '2px 8px', 
                              borderRadius: '6px', 
                              fontWeight: 900,
                              fontSize: '0.75rem' 
                            }}>
                              Übt gerade ({Math.max(...s.instruments.map((i:any) => i.progress)) || 0}%)
                            </span>
                          </div>
                        ))}

                        {/* Mastered repertoire songs */}
                        {repertoire.map((s: any) => (
                          <div key={s.id + s.level} style={{ 
                            background: '#e6f4ea', 
                            padding: '8px 12px', 
                            borderRadius: '12px', 
                            border: '1px solid #e6f4ea',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.82rem'
                          }}>
                            <span style={{ fontWeight: 800, color: '#34a853' }}>
                              🎉 {s.title} <span style={{ fontWeight: 500, color: '#34a853', opacity: 0.8, fontSize: '0.75rem' }}>({s.artist})</span>
                            </span>
                            <span style={{ 
                              background: '#e6f4ea', 
                              color: '#34a853', 
                              padding: '2px 8px', 
                              borderRadius: '6px', 
                              fontWeight: 900,
                              fontSize: '0.75rem' 
                            }}>
                              ✓ Verifiziert
                            </span>
                          </div>
                        ))}

                        {practiceBoard.length === 0 && repertoire.length === 0 && (
                          <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>Keine Songs eingetragen.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

              </div>
            ) : (
              // ---------------- GROOVELAB SPECIFIC VIEW DATA LISTS (LEFT) ----------------
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', marginTop: '10px' }}>

                {/* Meine Bands */}
                <section>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', color: '#eab308', letterSpacing: '0.1em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                          background: '#fefce8', 
                          borderRadius: '16px', 
                          border: '1px solid #fef08a',
                          cursor: onOpenBandProfile ? 'pointer' : 'default'
                        }}
                      >
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', overflow: 'hidden' }}>
                          <img src={b.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#854d0e' }}>{b.name}</div>
                      </div>
                    ))}
                    {bands.length === 0 && !loading && (
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>In keiner Band aktiv.</div>
                    )}
                  </div>
                </section>

                {/* Wochenplan-Zeiten */}
                {!isPeerStudent && (
                  <section>
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
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Pass first, then settings (campus only) */}
          {isPlatformCampus ? (
            <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* App & Ausweis speichern Widget */}
              <section style={{
                background: 'linear-gradient(135deg, #e6f4ea 0%, #ffffff 100%)',
                borderRadius: '24px',
                padding: '20px',
                border: '1.5px solid rgba(52, 168, 83, 0.15)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 900, color: '#34a853', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Smartphone size={16} /> App &amp; Ausweis speichern
                </h4>
                <p style={{ fontSize: '0.72rem', color: '#475569', margin: 0, lineHeight: 1.4, fontWeight: 650 }}>
                  {currentUserRole === 'student' 
                    ? "Speichere deinen Mitgliedsausweis auf dem Homescreen und installiere die App ganz einfach auf deinem Smartphone."
                    : "Kopiere den Link und sende ihn dem Schüler, damit er seinen Mitgliedsausweis speichern und die App installieren kann."
                  }
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const link = `${window.location.origin}/onboarding/${localQrToken || student.qr_token || student.id}?platform=campus`;
                    navigator.clipboard.writeText(link);
                    setCopiedCampusLink(true);
                    setTimeout(() => setCopiedCampusLink(false), 2000);
                  }}
                  style={{
                    width: '100%',
                    background: copiedCampusLink ? '#e6f4ea' : '#34a853',
                    color: copiedCampusLink ? '#34a853' : '#ffffff',
                    border: copiedCampusLink ? '1.5px solid #34a853' : 'none',
                    borderRadius: '14px',
                    padding: '10px 14px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: copiedCampusLink ? 'none' : '0 4px 12px rgba(19, 115, 51, 0.2)',
                    transition: 'all 0.2s ease-in-out'
                  }}
                  className="hover-scale"
                >
                  {copiedCampusLink ? <Check size={12} /> : <Copy size={12} />}
                  <span>
                    {copiedCampusLink 
                      ? 'Link kopiert! ✓' 
                      : (currentUserRole === 'student' ? 'Link für Smartphone kopieren' : 'Link für Schüler kopieren')
                    }
                  </span>
                </button>
              </section>

                {/* Onboarding-Link button */}
                {(currentUserRole === 'admin' || currentUserRole === 'teacher' || currentUserRole === 'secretary') && (
                  <button
                    onClick={handleGenerateOnboardingLink}
                    className="google-btn-secondary"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '0.8rem',
                      fontWeight: 850,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: copiedOnboardingLink ? '#e6f4ea' : '#ffffff',
                      border: copiedOnboardingLink ? '1.5px solid #e6f4ea' : '1.5px solid #cbd5e1',
                      color: copiedOnboardingLink ? '#34a853' : '#0f172a',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      marginTop: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)',
                      transition: 'all 0.2s',
                      fontFamily: 'Urbanist'
                    }}
                    onMouseEnter={(e) => {
                      if (!copiedOnboardingLink) {
                        e.currentTarget.style.background = '#f8fafc';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!copiedOnboardingLink) {
                        e.currentTarget.style.background = '#ffffff';
                      }
                    }}
                  >
                    <Link size={14} />
                    {copiedOnboardingLink ? 'Onboarding-Link kopiert!' : 'Individuellen Onboarding-Link generieren'}
                  </button>
                )}

                {/* DSGVO Datenschutzauskunft section */}
                {(currentUserRole === 'admin' || currentUserRole === 'secretary' || currentUserRole === 'teacher') && (
                  <section style={{ 
                    background: '#ffffff', 
                    borderRadius: '24px', 
                    padding: '16px 20px', 
                    border: '1.5px solid #f1f5f9',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)'
                  }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldCheck size={16} style={{ color: '#34a853' }} /> Datenschutz &amp; Auskunft
                    </h4>
                    <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '0 0 14px 0', lineHeight: 1.4, fontWeight: 550 }}>
                      Exportiere alle personenbezogenen Daten dieses Schülers gesetzeskonform nach Art. 15 DSGVO.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button
                        onClick={handleExportDSGVOPdf}
                        style={{
                          width: '100%',
                          background: '#f8fafc',
                          color: '#1e293b',
                          border: '1.5px solid #cbd5e1',
                          borderRadius: '12px',
                          padding: '8px 12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                      >
                        <Printer size={14} style={{ color: '#64748b' }} />
                        <span>Datenblatt drucken (PDF)</span>
                      </button>
                      <button
                        onClick={handleExportDSGVOJson}
                        style={{
                          width: '100%',
                          background: '#f8fafc',
                          color: '#1e293b',
                          border: '1.5px solid #cbd5e1',
                          borderRadius: '12px',
                          padding: '8px 12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                      >
                        <Download size={14} style={{ color: '#64748b' }} />
                        <span>Daten exportieren (JSON)</span>
                      </button>
                    </div>
                  </section>
                )}

                {/* 2. Module & Einstellungen — below the pass */}
                <section style={{ 
                  background: '#ffffff', 
                  borderRadius: '24px', 
                  padding: '16px 20px', 
                  border: '1.5px solid #f1f5f9',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)'
                }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sliders size={16} style={{ color: '#64748b' }} /> Module &amp; Einstellungen
                  </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  {/* Campus-Modul */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: '1 1 0px', minWidth: '135px', gap: '8px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>Campus</span>
                    {activePlatform === 'secretary' ? (
                      <div style={{ 
                        background: '#f1f5f9', 
                        padding: '2px', 
                        borderRadius: '12px', 
                        display: 'inline-flex', 
                        border: 'none',
                        alignItems: 'center'
                      }}>
                        <button
                          onClick={() => handleToggleCampus(false)}
                          style={{
                            background: !isCampusActive ? '#ffffff' : 'transparent',
                            color: !isCampusActive ? '#1e293b' : '#64748b',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            fontWeight: !isCampusActive ? 800 : 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: !isCampusActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                          }}
                        >
                          Inaktiv
                        </button>
                        <button
                          onClick={() => handleToggleCampus(true)}
                          style={{
                            background: isCampusActive ? '#34c759' : 'transparent', // Apple Green
                            color: isCampusActive ? '#ffffff' : '#64748b',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            fontWeight: isCampusActive ? 800 : 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: isCampusActive ? '0 1px 4px rgba(52, 168, 83, 0.3)' : 'none'
                          }}
                        >
                          Aktiv
                        </button>
                      </div>
                    ) : (
                      <span style={{ 
                        background: isCampusActive ? '#e6f4ea' : '#f1f5f9', 
                        color: isCampusActive ? '#34a853' : '#64748b', 
                        padding: '4px 10px', 
                        borderRadius: '10px', 
                        fontSize: '0.75rem', 
                        fontWeight: 800 
                      }}>
                        {isCampusActive ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    )}
                  </div>

                  {/* Vertikaler Trenner zwischen Campus und GrooveLab */}
                  <div style={{ width: '1px', height: '18px', background: '#e2e8f0' }} />

                  {/* GrooveLab-Modul */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: '1 1 0px', minWidth: '135px', gap: '8px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>GrooveLab</span>
                    {activePlatform === 'secretary' ? (
                      <div style={{ 
                        background: '#f1f5f9', 
                        padding: '2px', 
                        borderRadius: '12px', 
                        display: 'inline-flex', 
                        border: 'none',
                        alignItems: 'center'
                      }}>
                        <button
                          onClick={() => handleToggleGroovelab(false)}
                          style={{
                            background: !isGroovelabActive ? '#ffffff' : 'transparent',
                            color: !isGroovelabActive ? '#1e293b' : '#64748b',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            fontWeight: !isGroovelabActive ? 800 : 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: !isGroovelabActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                          }}
                        >
                          Inaktiv
                        </button>
                        <button
                          onClick={() => handleToggleGroovelab(true)}
                          style={{
                            background: isGroovelabActive ? '#eab308' : 'transparent', // Yellow/Gold
                            color: isGroovelabActive ? '#ffffff' : '#64748b',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            fontWeight: isGroovelabActive ? 800 : 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: isGroovelabActive ? '0 1px 4px rgba(234, 179, 8, 0.3)' : 'none'
                          }}
                        >
                          Aktiv
                        </button>
                      </div>
                    ) : (
                      <span style={{ 
                        background: isGroovelabActive ? '#fef3c7' : '#f1f5f9', 
                        color: isGroovelabActive ? '#b45309' : '#64748b', 
                        padding: '4px 10px', 
                        borderRadius: '10px', 
                        fontSize: '0.75rem', 
                        fontWeight: 800 
                      }}>
                        {isGroovelabActive ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ height: '1px', background: '#f1f5f9' }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>Unterrichtsform</span>
                  {activePlatform === 'secretary' || currentUserRole === 'admin' || currentUserRole === 'secretary' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {durationRequestSent && (
                        <span style={{ 
                          background: '#fffbeb', 
                          color: '#b45309', 
                          border: '1px solid #fde68a', 
                          padding: '3px 6px', 
                          borderRadius: '8px', 
                          fontSize: '0.65rem', 
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}>
                          ⏳ Wunsch: {requestedDuration} Min
                        </span>
                      )}
                      <div style={{
                        background: '#f1f5f9',
                        padding: '2px',
                        borderRadius: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}>
                        {[30, 45, 60, 90].map((dur) => {
                          const isSelected = lessonDuration === dur;
                          return (
                            <button
                              key={dur}
                              onClick={() => handleUpdateDuration(dur)}
                              style={{
                                background: isSelected ? '#ffffff' : 'transparent',
                                color: isSelected ? '#1e293b' : '#64748b',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                fontWeight: isSelected ? 800 : 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                              }}
                            >
                              {dur} Min
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <span style={{ background: '#f1f5f9', color: '#1e293b', padding: '4px 10px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800 }}>
                      {lessonDuration} Min
                    </span>
                  )}
                </div>

                <div style={{ height: '1px', background: '#f1f5f9' }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>Übungs-Level (Streaks)</span>
                  {currentUserRole === 'admin' || currentUserRole === 'teacher' || currentUserRole === 'secretary' ? (
                    <div style={{
                      background: '#f1f5f9',
                      padding: '2px',
                      borderRadius: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}>
                      {[1, 2, 3].map((lvl) => {
                        const isSelected = (avatar?.evolution_level || 1) === lvl;
                        return (
                          <button
                            key={lvl}
                            onClick={() => handleUpdateEvolutionLevel(lvl)}
                            style={{
                              background: isSelected ? '#ffffff' : 'transparent',
                              color: isSelected ? '#1e293b' : '#64748b',
                              border: 'none',
                              borderRadius: '10px',
                              padding: '4px 8px',
                              fontSize: '0.75rem',
                              fontWeight: isSelected ? 800 : 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                              boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                            }}
                            title={lvl === 1 ? '3/5/10 Min.' : lvl === 2 ? '5/10/15 Min.' : '10/15/20 Min.'}
                          >
                            Level {lvl}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <span style={{ background: '#f1f5f9', color: '#1e293b', padding: '4px 10px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800 }}>
                      Level {avatar?.evolution_level || 1}
                    </span>
                  )}
                </div>

                <div style={{ height: '1px', background: '#f1f5f9' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>Campus-Nutzungsmodus</span>
                  {currentUserRole === 'admin' || currentUserRole === 'teacher' || currentUserRole === 'secretary' ? (
                    <div style={{
                      background: '#f1f5f9',
                      padding: '2px',
                      borderRadius: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}>
                      <button
                        onClick={() => handleUpdateAppUsageMode('student_only')}
                        style={{
                          background: appUsageMode === 'student_only' ? '#ffffff' : 'transparent',
                          color: appUsageMode === 'student_only' ? '#1e293b' : '#64748b',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '4px 8px',
                          fontSize: '0.75rem',
                          fontWeight: appUsageMode === 'student_only' ? 800 : 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          boxShadow: appUsageMode === 'student_only' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                        }}
                      >
                        📱 Selbstnutzer
                      </button>
                      <button
                        onClick={() => handleUpdateAppUsageMode('parent_hybrid')}
                        style={{
                          background: appUsageMode === 'parent_hybrid' ? '#ffffff' : 'transparent',
                          color: appUsageMode === 'parent_hybrid' ? '#1e293b' : '#64748b',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '4px 8px',
                          fontSize: '0.75rem',
                          fontWeight: appUsageMode === 'parent_hybrid' ? 800 : 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          boxShadow: appUsageMode === 'parent_hybrid' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                        }}
                      >
                        👪 Hybrid
                      </button>
                    </div>
                  ) : (
                    <span style={{ background: '#f1f5f9', color: '#1e293b', padding: '4px 10px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800 }}>
                      {appUsageMode === 'parent_hybrid' ? '👪 Hybrid' : '📱 Selbstnutzer'}
                    </span>
                  )}
                </div>

                {appUsageMode === 'parent_hybrid' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', background: '#f8fafc', padding: '10px 14px', borderRadius: '16px', border: '1px solid #e2e8f0', width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>👪 Eltern-PIN (4-stellig)</span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Schützt den Elternbereich vor unbefugtem Zugriff</span>
                    </div>
                    {currentUserRole === 'admin' || currentUserRole === 'teacher' || currentUserRole === 'secretary' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="text"
                          maxLength={4}
                          placeholder="Ziffern"
                          value={parentPin}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setParentPin(val);
                            if (val.length === 4 || val.length === 0) {
                              handleUpdateParentPin(val);
                            }
                          }}
                          style={{
                            width: '80px',
                            padding: '6px 10px',
                            border: '1.5px solid #cbd5e1',
                            borderRadius: '10px',
                            fontSize: '0.85rem',
                            textAlign: 'center',
                            fontWeight: 700,
                            color: '#1e293b'
                          }}
                        />
                        {parentPin && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('Möchtest du die Eltern-PIN wirklich zurücksetzen? Der Schüler/Elternteil muss beim nächsten Scan eine neue PIN vergeben.')) {
                                setParentPin('');
                                handleUpdateParentPin('');
                              }
                            }}
                            style={{
                              padding: '6px 10px',
                              background: '#fee2e2',
                              border: 'none',
                              borderRadius: '8px',
                              color: '#dc2626',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'background 0.2s'
                            }}
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>
                        {parentPin ? '••••' : 'Nicht festgelegt'}
                      </span>
                    )}
                  </div>
                )}

                {consentLogs.length > 0 && (
                  <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '12px', width: '100%' }}>
                    <h5 style={{ margin: '0 0 8px 0', fontSize: '0.78rem', fontWeight: 800, color: '#334155' }}>
                      🛡️ Revisionssichere Einwilligungsprotokolle
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {consentLogs.map((log, idx) => (
                        <div key={idx} style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '8px 10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#34a853' }}>
                              ✓ {log.consent_type === 'terms_privacy' ? 'AGB & Datenschutz akzeptiert' : 'Direkt-Kommunikation freigegeben'}
                            </span>
                            <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600 }}>
                              {new Date(log.created_at).toLocaleString('de-DE')}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#7d7d82' }}>
                            <span>IP: {log.ip_address || 'Anonymisiert'}</span>
                            <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.user_agent}>
                              Browser: {log.user_agent || 'Unbekannt'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </section>

            {/* Sektion Gruppenunterricht */}
            <section style={{ 
              background: '#ffffff', 
              borderRadius: '24px', 
              padding: '16px 20px', 
              border: '1.5px solid #f1f5f9',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
              marginTop: '16px'
            }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} style={{ color: '#64748b' }} /> Gruppenunterricht
              </h4>

              {groupId ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 500 }}>
                    Verknüpft im Gruppenunterricht mit:
                    <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                       {groupStudents.map(s => (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#64748b' }}></span>
                          {s.first_name} {s.last_name ? s.last_name.charAt(0) + '.' : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {(currentUserRole === 'admin' || currentUserRole === 'teacher' || currentUserRole === 'secretary') && (
                    <button
                      onClick={handleUnlinkGroup}
                      style={{
                        background: '#fff1f2',
                        color: '#e11d48',
                        border: '1px solid #fecdd3',
                        borderRadius: '12px',
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        marginTop: '4px'
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.background = '#ffe4e6';
                        e.currentTarget.style.borderColor = '#fda4af';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = '#fff1f2';
                        e.currentTarget.style.borderColor = '#fecdd3';
                      }}
                    >
                      Verbindung trennen
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', fontStyle: 'italic' }}>
                    Dieser Schüler hat aktuell Einzelunterricht.
                  </div>

                  {(currentUserRole === 'admin' || currentUserRole === 'teacher' || currentUserRole === 'secretary') && (
                    <>
                      {!showGroupSelector ? (
                        <button
                          onClick={() => setShowGroupSelector(true)}
                          style={{
                            background: '#f8fafc',
                            color: '#1e293b',
                            border: '1.5px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '8px 12px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                          onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
                          onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                        >
                          Gruppenunterricht einrichten
                        </button>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Partner auswählen:</span>
                          <div style={{ position: 'relative' }}>
                            <input
                              type="text"
                              placeholder="Name des Schülers suchen..."
                              value={studentSearchQuery}
                              onChange={e => {
                                setStudentSearchQuery(e.target.value);
                                setSelectedStudentToLink('');
                                setSearchDropdownOpen(true);
                              }}
                              onFocus={() => setSearchDropdownOpen(true)}
                              onBlur={() => {
                                setTimeout(() => setSearchDropdownOpen(false), 200);
                              }}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '10px',
                                border: '1.5px solid #cbd5e1',
                                fontSize: '0.8rem',
                                color: '#1e293b',
                                outline: 'none',
                                background: '#ffffff',
                                boxSizing: 'border-box'
                              }}
                            />
                            {searchDropdownOpen && (
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                background: '#ffffff',
                                border: '1.5px solid #cbd5e1',
                                borderRadius: '12px',
                                marginTop: '4px',
                                maxHeight: '150px',
                                overflowY: 'auto',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                zIndex: 10
                              }}>
                                {schoolStudents
                                  .filter(s => {
                                    const fullName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
                                    return fullName.includes(studentSearchQuery.toLowerCase());
                                  })
                                  .map(s => (
                                    <div
                                      key={s.id}
                                      onClick={() => {
                                        setSelectedStudentToLink(s.id);
                                        setStudentSearchQuery(`${s.first_name || ''} ${s.last_name || ''}`);
                                        setSearchDropdownOpen(false);
                                      }}
                                      style={{
                                        padding: '8px 12px',
                                        fontSize: '0.8rem',
                                        color: '#1e293b',
                                        cursor: 'pointer',
                                        background: selectedStudentToLink === s.id ? '#e6f4ea' : '#ffffff',
                                        borderBottom: '1px solid #f1f5f9',
                                        textAlign: 'left'
                                      }}
                                      onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                                      onMouseLeave={e => e.currentTarget.style.background = selectedStudentToLink === s.id ? '#e6f4ea' : '#ffffff'}
                                    >
                                      {s.first_name} {s.last_name ? s.last_name.charAt(0) + '.' : ''}
                                    </div>
                                  ))}
                                {schoolStudents.filter(s => {
                                  const fullName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
                                  return fullName.includes(studentSearchQuery.toLowerCase());
                                }).length === 0 && (
                                  <div style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
                                    Keine Schüler gefunden
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <button
                              onClick={handleLinkGroup}
                              disabled={!selectedStudentToLink}
                              style={{
                                flex: 1,
                                background: selectedStudentToLink ? '#34a853' : '#cbd5e1',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: selectedStudentToLink ? 'pointer' : 'default',
                                transition: 'all 0.15s'
                              }}
                            >
                              Verknüpfen
                            </button>
                            <button
                              onClick={() => {
                                setShowGroupSelector(false);
                                setSelectedStudentToLink('');
                                setStudentSearchQuery('');
                              }}
                              style={{
                                flex: 1,
                                background: '#ef4444',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                            >
                              Abbrechen
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </section>
          </aside>
          ) : (
            <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* App & Ausweis speichern Widget */}
              {!isPeerStudent && (
                <>
                  <section style={{
                    background: 'linear-gradient(135deg, #fefce8 0%, #ffffff 100%)',
                    borderRadius: '24px',
                    padding: '20px',
                    border: '1.5px solid rgba(234, 179, 8, 0.2)',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 900, color: '#854d0e', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Smartphone size={16} /> App &amp; Ausweis speichern
                    </h4>
                    <p style={{ fontSize: '0.72rem', color: '#475569', margin: 0, lineHeight: 1.4, fontWeight: 650 }}>
                      {currentUserRole === 'student' 
                        ? "Speichere deinen Mitgliedsausweis auf dem Homescreen und lade die App ganz einfach herunter."
                        : "Kopiere den Link und sende ihn dem Schüler, damit er seinen Mitgliedsausweis speichern und die App installieren kann."
                      }
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const link = `${window.location.origin}/onboarding/${localQrToken || student.qr_token || student.id}?platform=groovelab`;
                        navigator.clipboard.writeText(link);
                        setCopiedGrooveLink(true);
                        setTimeout(() => setCopiedGrooveLink(false), 2000);
                      }}
                      style={{
                        width: '100%',
                        background: copiedGrooveLink ? '#fefce8' : '#eab308',
                        color: copiedGrooveLink ? '#854d0e' : '#ffffff',
                        border: copiedGrooveLink ? '1.5px solid #eab308' : 'none',
                        borderRadius: '14px',
                        padding: '10px 14px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: copiedGrooveLink ? 'none' : '0 4px 12px rgba(234, 179, 8, 0.2)',
                        transition: 'all 0.2s ease-in-out'
                      }}
                      className="hover-scale"
                    >
                      {copiedGrooveLink ? <Check size={12} /> : <Copy size={12} />}
                      <span>
                        {copiedGrooveLink 
                          ? 'Link kopiert! ✓' 
                          : (currentUserRole === 'student' ? 'Link für Smartphone kopieren' : 'Link für Schüler kopieren')
                        }
                      </span>
                    </button>
                  </section>

                  {/* 1. Anwesenheits-Logbuch Button */}
                  <section style={{ 
                    background: '#ffffff', 
                    borderRadius: '24px', 
                    padding: '16px 20px', 
                    border: '1.5px solid #fef9c3',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)'
                  }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={16} style={{ color: '#eab308' }} /> Anwesenheit
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowPresenceLogOverlay(true)}
                      style={{
                        width: '100%',
                        padding: '14px 20px',
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: '#eab308',
                        border: 'none',
                        color: '#ffffff',
                        borderRadius: '18px',
                        cursor: 'pointer',
                        boxShadow: '0 8px 24px rgba(234, 179, 8, 0.25)',
                        transition: 'all 0.25s ease',
                        fontFamily: 'Urbanist, sans-serif',
                        letterSpacing: '0.01em'
                      }}
                      className="hover-scale"
                    >
                      <BookOpen size={16} />
                      Anwesenheits-Logbuch öffnen
                    </button>
                  </section>
                </>
              )}

              {/* 2. Skill Radar */}
              <section style={{ 
                background: '#ffffff', 
                borderRadius: '24px', 
                padding: '16px 20px', 
                border: '1.5px solid #fef9c3',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#eab308', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <Music size={16} style={{ color: '#eab308' }} /> Skill Radar
                </h4>
                
                <div style={{ width: '100%', height: '240px', display: 'flex', justifyContent: 'center' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="65%" data={studentRadarData}>
                      <PolarGrid stroke="#f1f5f9" />
                      <PolarAngleAxis dataKey="instrument" tick={({ x, y, payload }) => (
                        <text x={x} y={y} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }}>
                          {payload.value}
                        </text>
                      )} />
                      <Radar name="XP" dataKey="xp" stroke="#eab308" fill="#facc15" fillOpacity={0.5} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* DSGVO Datenschutzauskunft section */}
              {(currentUserRole === 'admin' || currentUserRole === 'secretary' || currentUserRole === 'teacher') && (
                <section style={{ 
                  background: '#ffffff', 
                  borderRadius: '24px', 
                  padding: '16px 20px', 
                  border: '1.5px solid #fef9c3',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
                  marginTop: '16px'
                }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#eab308', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={16} style={{ color: '#eab308' }} /> Datenschutz &amp; Auskunft
                  </h4>
                  <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '0 0 14px 0', lineHeight: 1.4, fontWeight: 650 }}>
                    Exportiere alle personenbezogenen Daten dieses Schülers gesetzeskonform nach Art. 15 DSGVO.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      onClick={handleExportDSGVOPdf}
                      style={{
                        width: '100%',
                        background: '#f8fafc',
                        color: '#1e293b',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: '12px',
                        padding: '8px 12px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                    >
                      <Printer size={14} style={{ color: '#64748b' }} />
                      <span>Datenblatt drucken (PDF)</span>
                    </button>
                    <button
                      onClick={handleExportDSGVOJson}
                      style={{
                        width: '100%',
                        background: '#f8fafc',
                        color: '#1e293b',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: '12px',
                        padding: '8px 12px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                    >
                      <Download size={14} style={{ color: '#64748b' }} />
                      <span>Daten exportieren (JSON)</span>
                    </button>
                  </div>
                </section>
              )}
            </aside>
          )}
        </div>
      </div>

      {/* CAMPUS / MEMBER PASS OVERLAY MODAL */}
      {showQrOverlay && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 4000,
            background: 'rgba(15, 23, 42, 0.82)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowQrOverlay(false)}
        >
          {/* Viewport-level Close Button */}
          <button 
            onClick={() => setShowQrOverlay(false)}
            style={{
              position: 'absolute',
              top: '32px',
              right: '32px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#ffffff',
              transition: 'all 0.25s ease',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              zIndex: 4100
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Schließen"
          >
            <X size={22} />
          </button>

          <div 
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '380px'
            }}
            onClick={e => e.stopPropagation()}
          >

            {localTab === 'campus' ? (
              /* ============ CAMPUS PASS OVERLAY ============ */
              <div style={{ 
                background: 'radial-gradient(circle at 80% 10%, rgba(16, 185, 129, 0.15), transparent 50%), radial-gradient(circle at 20% 90%, rgba(16, 185, 129, 0.08), transparent 50%), linear-gradient(135deg, #27272a 0%, #121214 100%)', 
                borderRadius: '32px', 
                padding: '32px', 
                color: 'white',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(16, 185, 129, 0.15)',
                border: '1.5px solid rgba(16, 185, 129, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                boxSizing: 'border-box',
                gap: '24px'
              }}>
                {/* Sheen effect */}
                <div style={{
                  position: 'absolute',
                  top: '-50%', left: '-50%', right: '-50%', bottom: '-50%',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, transparent 50%, rgba(255, 255, 255, 0.02) 100%)',
                  pointerEvents: 'none'
                }} />

                {/* CAMPUS PASS Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
                  <span style={{ 
                    fontSize: '0.7rem', 
                    fontWeight: 900, 
                    color: '#34d399', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.22em',
                  }}>
                    CAMPUS PASS
                  </span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', background: 'rgba(0,0,0,0.2)', padding: '2px 8px', borderRadius: '20px' }}>
                    Aktiv
                  </span>
                </div>

                {/* Top Info Section */}
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', zIndex: 1, flexDirection: 'row-reverse', width: '100%', justifyContent: 'space-between' }}>
                  <img 
                    src={displayAvatarSrc} 
                    alt="Avatar" 
                    style={{ 
                      width: '76px', 
                      height: '76px', 
                      borderRadius: '24px', 
                      objectFit: 'cover', 
                      border: '3px solid rgba(16, 185, 129, 0.4)',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
                    }} 
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div>
                      <span style={{ fontSize: '0.52rem', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Name</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em', lineHeight: '1.1' }}>
                        {student.first_name} {student.last_name ? student.last_name.charAt(0) + '.' : ''}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.52rem', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Musikschule</span>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff', opacity: 0.95, lineHeight: '1.2' }}>
                        {schoolName}
                      </div>
                    </div>
                  </div>
                </div>


                {/* QR Code Container */}
                <div style={{ 
                  background: 'white', 
                  padding: '16px', 
                  borderRadius: '24px', 
                  boxShadow: '0 15px 35px rgba(0,0,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '8px 0',
                  zIndex: 1
                }}>
                  <QRCode value={`${window.location.origin}/qr/${localQrToken || student.qr_token || student.id || ''}`} size={150} style={{ width: '150px', height: '150px' }} />
                </div>

                {/* Actions */}
                {(currentUserRole === 'admin' || currentUserRole === 'teacher' || currentUserRole === 'secretary') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 1 }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const link = `${window.location.origin}/onboarding/${localQrToken || student.qr_token || student.id}`;
                        navigator.clipboard.writeText(link);
                        alert('Campus-Onboarding-Link in die Zwischenablage kopiert! 📋');
                      }}
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.15)',
                        color: '#ffffff',
                        border: '1.5px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: '16px',
                        padding: '12px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.45)';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                      }}
                    >
                      <Copy size={14} />
                      Onboarding-Link kopieren
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRegenerateQrToken();
                      }}
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.12)',
                        color: '#ffffff',
                        border: '1.5px solid rgba(255, 255, 255, 0.25)',
                        borderRadius: '16px',
                        padding: '12px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.22)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                      }}
                    >
                      <RefreshCw size={14} />
                      QR-Code sperren &amp; neu generieren
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* ============ GROOVELAB MEMBER PASS OVERLAY ============ */
              <div style={{
                background: 'white',
                borderRadius: '32px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
                overflow: 'hidden',
                border: '1.5px solid #e2e8f0',
                boxSizing: 'border-box'
              }}>
                {/* Lanyard Hole Mockup */}
                <div style={{ height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b' }}>
                  <div style={{ width: '28px', height: '6px', borderRadius: '3px', background: '#0f172a' }}></div>
                </div>

                {/* Status Header */}
                <div style={{ 
                  background: student.role === 'student' ? 'var(--primary-color)' : '#f59e0b', 
                  padding: '8px', 
                  textAlign: 'center',
                  textTransform: 'uppercase'
                }}>
                  <div style={{ color: 'white', fontSize: '0.65rem', fontWeight: 900, letterSpacing: '0.2em' }}>
                    {student.role === 'student' ? 'Member Access' : 'Staff / Coach'}
                  </div>
                </div>

                {/* Content Area */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 28px', gap: '16px' }}>
                  {/* Portrait */}
                  <div style={{ 
                    width: '92px', 
                    height: '92px', 
                    borderRadius: '50%', 
                    border: `3px solid ${student.role === 'student' ? 'var(--primary-color)' : '#f59e0b'}`,
                    padding: '3px',
                    background: 'white',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}>
                    <img 
                      src={displayAvatarSrc} 
                      alt="Profile"
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        borderRadius: '50%'
                      }} 
                    />
                  </div>

                  {/* Identity */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1e293b', lineHeight: 1.1, letterSpacing: '-0.02em' }}>{student.first_name} {student.last_name ? student.last_name.charAt(0) + '.' : ''}</div>
                  </div>


                  {/* QR Code Container */}
                  <div style={{ 
                    background: 'white', 
                    padding: '14px', 
                    borderRadius: '20px',
                    border: '1px solid #f1f5f9',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%'
                  }}>
                    <QRCode value={`${window.location.origin}/qr/${localQrToken || student.qr_token || student.id || ''}`} size={150} style={{ width: '150px', height: '150px' }} />
                  </div>

                  <p style={{ 
                    fontSize: '0.7rem', 
                    color: '#94a3b8', 
                    textAlign: 'center', 
                    margin: '0', 
                    fontWeight: 600, 
                    lineHeight: 1.3,
                    maxWidth: '220px'
                  }}>
                    Halte diesen Code vor die Kamera des iPads,<br/>um dich automatisch am Platz anzumelden.
                  </p>
                </div>

                {/* Actions */}
                {(currentUserRole === 'admin' || currentUserRole === 'teacher' || currentUserRole === 'secretary') && (
                  <div style={{ padding: '0 28px 24px 28px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const link = `${window.location.origin}/onboarding/${localQrToken || student.qr_token || student.id}`;
                        navigator.clipboard.writeText(link);
                        alert('GrooveLab-Onboarding-Link in die Zwischenablage kopiert! 📋');
                      }}
                      style={{
                        width: '100%',
                        background: '#fefce8',
                        color: '#854d0e',
                        border: '1.5px solid #fef3c7',
                        borderRadius: '16px',
                        padding: '12px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = '#fef9c3'}
                      onMouseOut={e => e.currentTarget.style.background = '#fefce8'}
                    >
                      <Copy size={14} />
                      Onboarding-Link kopieren
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRegenerateQrToken();
                      }}
                      style={{
                        width: '100%',
                        background: '#fff1f2',
                        color: '#e11d48',
                        border: '1.5px solid #fecdd3',
                        borderRadius: '16px',
                        padding: '12px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = '#ffe4e6'}
                      onMouseOut={e => e.currentTarget.style.background = '#fff1f2'}
                    >
                      <RefreshCw size={14} />
                      QR-Code sperren &amp; neu generieren
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
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
      {showPresenceLogOverlay && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 4000,
            background: 'rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowPresenceLogOverlay(false)}
        >
          {/* Apple-style CSS keyframe animation for the active session glow/pulse */}
          <style>{`
            @keyframes apple-pulse {
              0% { transform: scale(0.9); opacity: 0.4; }
              50% { transform: scale(1.2); opacity: 1; }
              100% { transform: scale(0.9); opacity: 0.4; }
            }
          `}</style>
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#f5f5f7', // macOS/iOS system secondary background
              borderRadius: '20px',
              width: '100%',
              maxWidth: '480px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 30px 60px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Icons", "Helvetica Neue", Helvetica, Arial, sans-serif'
            }}
          >
            {/* Header */}
            <div style={{ 
              padding: '18px 24px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              background: 'rgba(245, 245, 247, 0.8)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid rgba(0, 0, 0, 0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={18} style={{ color: '#1d1d1f' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.015em' }}>
                  Anwesenheits-Logbuch
                </h3>
              </div>
              <button 
                onClick={() => setShowPresenceLogOverlay(false)}
                style={{
                  background: 'rgba(0, 0, 0, 0.05)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#86868b',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'}
              >
                <X size={15} />
              </button>
            </div>

            {/* Content List */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '16px 20px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '10px' 
            }}>
              {sessionsList.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#86868b', 
                  fontSize: '0.85rem', 
                  padding: '40px 0', 
                  fontWeight: 500 
                }}>
                  Bisher keine Anwesenheitszeiten erfasst.
                </div>
              ) : (
                sessionsList.map((s: any, idx) => {
                  const checkIn = new Date(s.check_in_time);
                  const kw = getCalendarWeek(checkIn);
                  const durationStr = getDurationString(s.check_in_time, s.check_out_time);
                  const isCurrent = !s.check_out_time;
                  
                  const stationName = s.stations?.name || 'Unbekannt';
                  const stationColor = s.stations?.color || '#cbd5e1';

                  // Dynamic theme-compliant accent colors matching platform settings
                  const activeAccent = localTab === 'campus' ? '#34a853' : '#eab308';
                  const activeAccentBg = localTab === 'campus' ? '#e6f4ea' : '#fefce8';

                  return (
                    <div 
                      key={idx}
                      style={{
                        background: '#ffffff',
                        borderRadius: '14px',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.015)',
                        border: isCurrent ? `1.5px solid ${activeAccent}` : '1px solid rgba(0, 0, 0, 0.035)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {isCurrent && (
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: '4px',
                          background: activeAccent
                        }} />
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ 
                          fontSize: '0.68rem', 
                          fontWeight: 600, 
                          color: '#86868b',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          {kw}
                        </span>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px',
                          background: 'rgba(0,0,0,0.025)',
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}>
                          <span style={{ 
                            display: 'inline-block', 
                            width: '6px', 
                            height: '6px', 
                            borderRadius: '50%', 
                            background: stationColor 
                          }}></span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#48484a' }}>
                            {stationName}
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.01em' }}>
                        {formatDateDe(s.check_in_time)}
                      </div>
                      <div style={{ 
                        fontSize: '0.8rem', 
                        fontWeight: 500, 
                        color: isCurrent ? activeAccent : '#86868b', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        marginTop: '2px'
                      }}>
                        {isCurrent ? (
                          <span style={{ 
                            position: 'relative', 
                            display: 'inline-flex',
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            background: activeAccent 
                          }}>
                            <span style={{
                              position: 'absolute',
                              display: 'inline-flex',
                              borderRadius: '50%',
                              width: '100%',
                              height: '100%',
                              background: activeAccent,
                              animation: 'apple-pulse 1.6s infinite ease-in-out'
                            }} />
                          </span>
                        ) : (
                          <Clock size={12} style={{ color: '#86868b' }} />
                        )}
                        <span>{durationStr}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer / CSV Export */}
            <div style={{ 
              padding: '14px 24px 18px 24px', 
              borderTop: '1px solid rgba(0, 0, 0, 0.06)', 
              display: 'flex', 
              justifyContent: 'flex-end', 
              background: 'rgba(245, 245, 247, 0.8)',
              backdropFilter: 'blur(10px)'
            }}>
              {(currentUserRole === 'admin' || currentUserRole === 'teacher' || currentUserRole === 'secretary') && sessionsList.length > 0 && (
                <button
                  onClick={handleExportPresenceCSV}
                  style={{
                    background: '#1d1d1f', // Premium, dark system button style
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 18px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    transition: 'background-color 0.15s, transform 0.15s',
                    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = '#000000';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#1d1d1f';
                  }}
                >
                  <Download size={13} />
                  Als CSV exportieren
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {showTageskompassModal && (
        <MeisterwerkDocumentationModal
          student={{
            id: student.id,
            first_name: student.first_name,
            last_name: student.last_name,
            photo_url: student.photo_url || '/avatar_ghost.jpg',
            is_campus_active: student.is_campus_active
          }}
          onClose={() => setShowTageskompassModal(false)}
          teacherId={currentTeacherId}
          isTeacherTools={true}
        />
      )}
    </div>
  );
};

