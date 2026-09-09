import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { supabase, deleteUserStorageAssets } from '../lib/supabase';
import { Music, Calendar, AlertCircle, Library, Shield, ShieldCheck, LogOut, Users, User, Monitor, QrCode, Plus, Pencil, Trash2, Box, BarChart as LucideBarChart, Clock, Star, PieChart as LucidePieChart, TrendingUp, Tablet, ExternalLink, Settings, Search, Bell, MapPin, X, Printer, Award, Download, Mic, Check, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown, GripVertical, BookOpen, Maximize2, ArrowLeft, GraduationCap, Lock, Activity, Zap, RefreshCw, Sliders, VolumeX, Copy, Eye, EyeOff, School, Lightbulb, Disc, XCircle, Volume2, FileText, DoorClosed, Hourglass } from 'lucide-react';
import { 
  ResponsiveContainer,
  BarChart as RechartsBarChart, Bar, XAxis, Tooltip, Cell,
  PieChart as RechartsPieChart, Pie,
  Radar, RadarChart, PolarGrid, PolarAngleAxis
} from 'recharts';
import { renderInstrumentIcon } from '../utils/instruments';
import { checkIsAudioTresorActive } from '../domain/stickersAndTresor';
import { CampusSetupScreen } from './CampusSetupScreen';
import { StudioAvatar, getInstrumentAvatarUrl, resolveCampusStudentAvatar } from './StudioAvatar';
import { IDBadgeCard, inlineAllImagesInElement } from './IDBadgeCard';
import { useRealNamesVisibility, maskLastName, formatTeacherFullName } from '../utils/nameHelper';
import { StudentToDelete } from './ConfirmDeleteStudentModal';
import { deleteStudentFully } from '../utils/studentDeletionService';
import { revokeStudentToken } from '../utils/tokenSigner';
import { isUUID } from '../utils/uuidValidator';

// Lazy load heavy sub-suites & modals on demand
const StudentDetailModal = lazy(() => import('./StudentDetailModal').then(m => ({ default: m.StudentDetailModal })));
const ScheduleBoard = lazy(() => import('./ScheduleBoard').then(m => ({ default: m.ScheduleBoard })));
const StudentScheduleSlotsModal = lazy(() => import('./StudentScheduleSlotsModal').then(m => ({ default: m.StudentScheduleSlotsModal })));
const MeisterwerkDocumentationModal = lazy(() => import('./MeisterwerkDocumentationModal').then(m => ({ default: m.MeisterwerkDocumentationModal })));
const AdminCampusRoomsView = lazy(() => import('./admin/AdminCampusRoomsView').then(m => ({ default: m.AdminCampusRoomsView })));
const AdminSongsView = lazy(() => import('./admin/AdminSongsView').then(m => ({ default: m.AdminSongsView })));
const AdminStatsView = lazy(() => import('./admin/AdminStatsView').then(m => ({ default: m.AdminStatsView })));
const AdminMissionsView = lazy(() => import('./admin/AdminMissionsView').then(m => ({ default: m.AdminMissionsView })));
const AdminBandsView = lazy(() => import('./admin/AdminBandsView').then(m => ({ default: m.AdminBandsView })));
const AdminTeachersView = lazy(() => import('./admin/AdminTeachersView').then(m => ({ default: m.AdminTeachersView })));
const AdminStudentsView = lazy(() => import('./admin/AdminStudentsView').then(m => ({ default: m.AdminStudentsView })));
const AdminSongDetailModal = lazy(() => import('./admin/modals/AdminSongDetailModal'));
const AdminTextbausteinModal = lazy(() => import('./admin/modals/AdminTextbausteinModal'));
const AdminQRModal = lazy(() => import('./admin/modals/AdminQRModal'));
const AdminRoomLayoutModal = lazy(() => import('./admin/modals/AdminRoomLayoutModal'));
import { getStationColor } from './admin/modals/AdminRoomLayoutModal';
import { getLehrwerkColor, getSongColor } from './admin/AdminSongsView';
const CampusEventsBoard = lazy(() => import('./CampusEventsBoard').then(m => ({ default: m.CampusEventsBoard })));
const ConfirmDeleteStudentModal = lazy(() => import('./ConfirmDeleteStudentModal').then(m => ({ default: m.ConfirmDeleteStudentModal })));
const AVVModal = lazy(() => import('./AVVModal').then(m => ({ default: m.AVVModal })));
const FeedbackHubModal = lazy(() => import('./feedback/FeedbackHubModal').then(m => ({ default: m.FeedbackHubModal })));
const HelpCenterModal = lazy(() => import('./help/HelpCenterModal').then(m => ({ default: m.HelpCenterModal })));
const ParentInfoSheetModal = lazy(() => import('./modals/ParentInfoSheetModal').then(m => ({ default: m.ParentInfoSheetModal })));
import { 
  fetchSchoolRoster, 
  getTeacherRoster, 
  getTeacherStudentCount, 
  normalizeStudentKey, 
  isTestOrGenericStudent, 
  deduplicateRoster 
} from '../services/studentRosterService';
import { fetchHolidaysCached } from '../utils/holidayHelper';
import { downloadCsvFile } from '../utils/csvHelper';
import { logSecurityEvent } from '../services/auditLogService';
import { areArraysEqualFast, areObjectsEqualFast } from '../utils/fastCompare';

const cleanRoomName = (name: string | null | undefined): string => {
  if (!name) return 'Unbenannter Raum';
  return name.replace(/^#\d+\s*[-:]*\s*/, '').trim();
};

const capitalizeName = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.trim().split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

const getSimulatedNow = (): Date => {
  const simStr = typeof window !== 'undefined' ? localStorage.getItem('groovelab_simulated_date') : null;
  if (!simStr) return new Date();
  const parts = simStr.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0])) return new Date();
  const baseSim = new Date(parts[0], parts[1] - 1, parts[2], 14, 0, 0);
  const simStartTime = Number(localStorage.getItem('groovelab_simulated_start_timestamp') || Date.now());
  const elapsedMinutes = Math.floor((Date.now() - simStartTime) / 60000);
  return new Date(baseSim.getTime() + elapsedMinutes * 60000);
};

const DEFAULT_IMPRESSUM = `Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz) & § 18 MStV
Patrick Huber
Karl-Fürstenberg Str. 59
79618 Rheinfelden
Deutschland

Kontakt & Schnelle elektronische Kommunikation (§ 5 Abs. 1 Nr. 2 DDG)
E-Mail: patrick.huber@musaek.de / kontakt@campus-groovelab.de
Website: https://campus-groovelab.de
⚡ Elektronischer Schnellkontakt-Service (EuGH C-298/07 / BGH I ZR 238/14): Anfragen werden an Werktagen (Mo–Fr 08:00–18:00 Uhr) in der Regel innerhalb von maximal 60 Minuten beantwortet. Ein Support-Ticketsystem steht direkt im Dashboard zur Verfügung.

Zentrale Kontaktstelle für Behörden und Nutzer (Art. 11, 12 DSA):
E-Mail: kontakt@campus-groovelab.de / copyright@campus-groovelab.de (Sprachen: Deutsch, Englisch)

Umsatzsteuer
Umsatzsteuerbefreit gemäß § 19 UStG (Kleinunternehmerregelung).

EU-Streitschlichtung & Verbraucherstreitbeilegung (§ 36 VSBG)
Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: https://ec.europa.eu/consumers/odr/.
Unsere E-Mail-Adresse finden Sie oben im Impressum.
Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.

Haftung für Inhalte & Hosting-Immunität (Art. 6 DSA / § 7 DDG)
Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte nach den allgemeinen Gesetzen verantwortlich. Für fremde Inhalte haften wir als Host-Provider nach Art. 6 DSA i. V. m. § 7 Abs. 2 DDG erst ab tatsächlicher Kenntnis einer rechtswidrigen Tätigkeit.`;

const INSTRUMENT_COLORS: Record<string, string> = {
  "Guitar": "#ef4444", "E-Gitarre": "#ef4444",
  "Bass": "#eab308", "E-Bass": "#eab308", 
  "Drums": "#3b82f6", "E-Drums": "#3b82f6", 
  "Vocals": "#34a853", 
  "Piano": "#a855f7", "E-Piano": "#a855f7", "Keys": "#a855f7" 
};

const normalizeInstrument = (name: string) => {
  const n = (name || '').toLowerCase().trim();
  if (n.includes('gitarre') || n.includes('guitar')) return 'Guitar';
  if (n.includes('bass')) return 'Bass';
  if (n.includes('drums') || n.includes('schlagzeug')) return 'Drums';
  if (n.includes('piano') || n.includes('keys') || n.includes('klavier')) return 'Keys';
  if (n.includes('vocals') || n.includes('gesang')) return 'Vocals';
  return name;
};

const ADMIN_INSTRUMENT_ICONS: Record<string, any> = { 
  "Gitarre": renderInstrumentIcon("Gitarre"), 
  "Guitar": renderInstrumentIcon("Guitar"), 
  "E-Gitarre": renderInstrumentIcon("E-Gitarre"),
  "Bass": renderInstrumentIcon("Bass"), 
  "E-Bass": renderInstrumentIcon("E-Bass"), 
  "Drums": renderInstrumentIcon("Drums"), 
  "E-Drums": renderInstrumentIcon("E-Drums"), 
  "Vocals": renderInstrumentIcon("Vocals"), 
  "Gesang": renderInstrumentIcon("Gesang"),
  "Piano / Keys": renderInstrumentIcon("Keys"), 
  "Piano": renderInstrumentIcon("Piano"), 
  "E-Piano": renderInstrumentIcon("E-Piano"), 
  "Keys": renderInstrumentIcon("Keys")
};

const resolveCampusAvatar = (u: any, teachersList?: any[], schedulesList?: any[], fallbackTeacher?: any): string => {
  if (!u) return '/avatar_ghost.jpg';
  const role = (u.role || '').toLowerCase();
  const roles = Array.isArray(u.roles) ? u.roles.map((r: any) => String(r).toLowerCase()) : [];
  const isExplicitTeacher = role === 'teacher' || u.isTeacherContext === true || u.isTeacher === true;
  const isExplicitStudent = role === 'student';
  
  if (!isExplicitTeacher && !isExplicitStudent) {
    if (role === 'admin' || role === 'secretary' || roles.includes('admin') || roles.includes('secretary')) {
      return '/campus_login_hero.png';
    }
  }
  
  if (role === 'student') {
    return resolveCampusStudentAvatar(u, teachersList || fallbackTeacher, schedulesList);
  } else {
    // Teachers
    return resolveCampusStudentAvatar({ ...u, role: 'teacher', isTeacherContext: true });
  }
};

const resolveUserAvatar = (u: any, activePlatform?: string, teachersList?: any[], schedulesList?: any[], fallbackTeacher?: any): string => {
  if (!u) return '/avatar_ghost.jpg';
  const role = (u.role || '').toLowerCase();
  const roles = Array.isArray(u.roles) ? u.roles.map((r: any) => String(r).toLowerCase()) : [];
  const isExplicitTeacher = role === 'teacher' || u.isTeacherContext === true || u.isTeacher === true;
  const isExplicitStudent = role === 'student';

  if (!isExplicitTeacher && !isExplicitStudent) {
    if (role === 'admin' || role === 'secretary' || roles.includes('admin') || roles.includes('secretary')) {
      return '/campus_login_hero.png';
    }
  }
  if (activePlatform === 'campus') {
    return resolveCampusAvatar(u, teachersList, schedulesList, fallbackTeacher);
  }
  const isTeacherAvatar = u.photo_url && (u.photo_url.includes('teacher_') || u.photo_url.includes('avatar_teacher'));
  if (role === 'teacher' || isExplicitTeacher) {
    return isTeacherAvatar ? u.photo_url : '/avatar_ghost.jpg';
  }
  return u.photo_url || '/avatar_ghost.jpg';
};

const getInstrumentTypeKey = (instrument: string | null | undefined): string => {
  if (!instrument) return 'guitarist';
  const inst = instrument.toLowerCase().trim();
  if (inst.includes('guitar') || inst.includes('gitarre')) return 'guitarist';
  if (inst.includes('bass')) return 'bassist';
  if (inst.includes('drum') || inst.includes('schlagzeug')) return 'drummer';
  if (inst.includes('piano') || inst.includes('keys') || inst.includes('klavier') || inst.includes('keyboard')) return 'keyboardist';
  if (inst.includes('vocal') || inst.includes('gesang') || inst.includes('stimme') || inst.includes('singer')) return 'vocalist';
  if (inst.includes('trompete') || inst.includes('trumpet')) return 'trumpetist';
  if (inst.includes('posaune') || inst.includes('trombone')) return 'trombonist';
  if (inst.includes('horn')) return 'hornist';
  if (inst.includes('cello')) return 'cellist';
  if (inst.includes('geige') || inst.includes('violin') || inst.includes('violine')) return 'violinist';
  if (inst.includes('klarinette') || inst.includes('clarinet')) return 'clarinetist';
  if (inst.includes('querflöte') || inst.includes('flute')) return 'flutist';
  if (inst.includes('saxofon') || inst.includes('saxophone') || inst.includes('sax')) return 'saxophonist';
  return 'guitarist';
};
const brandColor = "#ea4335";
import { TeacherDashboard } from './TeacherDashboard';
import QRCode from 'react-qr-code';


const TEACHER_AVATARS = [
  { id: 't_male', url: '/avatar_teacher_male.jpg', label: 'Academy Coach M' },
  { id: 't_female', url: '/avatar_teacher_female.jpg', label: 'Academy Coach F' },
  { id: 't_expert', url: '/avatar_teacher_expert.jpg', label: 'Expert Coach' },
  { id: 't_clean', url: '/avatar_teacher_clean.jpg', label: 'Classic Coach' },
  { id: 't_drummer', url: '/avatar_teacher_drummer.jpg', label: 'Beat Coach' },
  { id: 't_drums', url: '/avatar_teacher_drums.jpg', label: 'Percussion Expert' },
  { id: 't_gold', url: '/avatar_teacher_gold_glasses.jpg', label: 'Session Pro' },
  { id: 't_senior', url: '/avatar_teacher_senior.jpg', label: 'Senior Mentor' }
];

const STUDENT_AVATARS = [
  { id: 'avatar_blockfloete', url: '/avatars/blockfloete_avatar.png', label: 'Blockflöte' },
  { id: 'avatar_bariton', url: '/avatars/bariton_avatar.png', label: 'Bariton' },
  { id: 'avatar_cello', url: '/avatars/cello_avatar_new.png', label: 'Cello' },
  { id: 'avatar_ebass', url: '/avatars/ebass_avatar.png', label: 'E-Bass' },
  { id: 'avatar_egitarre', url: '/avatars/egitarre_avatar.png', label: 'E-Gitarre' },
  { id: 'avatar_guitar', url: '/avatars/gitarre_avatar_new.png', label: 'Gitarre' },
  { id: 'avatar_horn', url: '/avatars/horn_avatar_new.png', label: 'Horn' },
  { id: 'avatar_clarinet', url: '/avatars/klarinette_avatar_new.png', label: 'Klarinette' },
  { id: 'avatar_piano', url: '/avatars/klavier_avatar_new.png', label: 'Piano / Keys' },
  { id: 'avatar_kontrabass', url: '/avatars/kontrabass_avatar.png', label: 'Kontrabass' },
  { id: 'avatar_oboe', url: '/avatars/oboe_avatar.png', label: 'Oboe' },
  { id: 'avatar_trombone', url: '/avatars/posaune_avatar.png', label: 'Posaune' },
  { id: 'avatar_flute', url: '/avatars/querfloete_avatar.png', label: 'Querflöte' },
  { id: 'avatar_saxophone', url: '/avatars/saxophon_avatar_new.png', label: 'Saxofon' },
  { id: 'avatar_drums', url: '/avatars/schlagzeug_avatar.png', label: 'Drums' },
  { id: 'avatar_trumpet', url: '/avatars/trompete_avatar_new.png', label: 'Trompete' },
  { id: 'avatar_violin', url: '/avatars/violine_avatar_new.png', label: 'Geige' },
  { id: 'avatar_vocals', url: '/avatars/gesang_avatar.png', label: 'Vocals' }
];


interface AdminDashboardProps {
  userId: string;
  onLogout: () => void;
  forceTab?: string;
  onTabChange?: (tab: string) => void;
  onOpenBandProfile?: (band: any) => void;
  activePlatform?: 'campus' | 'groovelab';
  session?: any;
  onSessionChange?: (session: any) => void;
  locationMode?: 'lab' | 'home';
  onLocationModeChange?: (mode: 'lab' | 'home') => void;
  hideHeader?: boolean;
  onSwitchPlatform?: (platform: 'campus' | 'groovelab') => void;
}

export function AdminDashboard({ 
  userId, 
  onLogout, 
  forceTab, 
  onTabChange, 
  onOpenBandProfile, 
  activePlatform = 'groovelab',
  session,
  onSessionChange,
  locationMode,
  onLocationModeChange,
  hideHeader = false,
  onSwitchPlatform
}: AdminDashboardProps) {
  const [admin, setAdmin] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const isGhost = userId === 'master-support-id' || sessionStorage.getItem('groovelab_support_ghost') === 'true';
      if (isGhost) {
        const ghostSchoolId = sessionStorage.getItem('groovelab_ghost_school_id') || '';
        const ghostSchoolName = sessionStorage.getItem('groovelab_ghost_school_name') || 'Musikschule';
        const ghostRole = sessionStorage.getItem('groovelab_ghost_active_role') || 'admin';
        return {
          id: 'master-support-id',
          school_id: ghostSchoolId,
          role: ghostRole,
          first_name: `${ghostSchoolName} Support`,
          last_name: '',
          photo_url: '/campus_login_hero.png',
          avatar_url: '/campus_login_hero.png',
          is_campus_active: true,
          is_groovelab_active: true,
          is_ghost_mode: true,
          schools: {
            id: ghostSchoolId,
            name: ghostSchoolName,
            status: 'active'
          }
        };
      }
      const cached = sessionStorage.getItem('groovelab_cached_user') || localStorage.getItem('groovelab_cached_user') || sessionStorage.getItem('campus_user') || localStorage.getItem('campus_user');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && (!userId || parsed.id === userId)) {
            return parsed;
          }
        } catch (e) {}
      }
    }
    return null;
  });
  const schoolObj = Array.isArray((admin as any)?.schools) ? (admin as any)?.schools[0] : (admin as any)?.schools;
  const { visible: showRealNames, toggleVisibility: toggleRealNames } = useRealNamesVisibility();
  const [students, setStudents] = useState<any[]>([]);
  const [deleteStudentModalData, setDeleteStudentModalData] = useState<StudentToDelete | null>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTimetableStudent, setSelectedTimetableStudent] = useState<any | null>(null);
  const [allSchedulePreferences, setAllSchedulePreferences] = useState<Record<string, any[]>>({});
  const [showAVVModal, setShowAVVModal] = useState(false);

  const hasTimetableOnboarding = (s: any) => {
    if (s?.timetable_assigned_at) return true;
    if (allSchedulePreferences[s?.id] && allSchedulePreferences[s?.id].length > 0) return true;
    return false;
  };
  const [rooms, setRooms] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);

  const resolveUserAvatarBound = (u: any, platform?: string) => {
    return resolveUserAvatar(u, platform || activePlatform, teachers, schedules, admin);
  };
  const [holidays, setHolidays] = useState<{ start: string, end: string, name: string }[]>([]);
  const [scheduleOccurrences, setScheduleOccurrences] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [songs, setSongs] = useState<any[]>([]);
  const [allBands, setAllBands] = useState<any[]>([]);
  const [galleryStudents, setGalleryStudents] = useState<any[]>([]);
  const [setupRooms, setSetupRooms] = useState<any[]>([]);
  const [setupStations, setSetupStations] = useState<any[]>([]);
  const [kiosks, setKiosks] = useState<any[] | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [missionSearch, setMissionSearch] = useState('');
  const [missionFilter, setMissionFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [missionTemplates, setMissionTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editingTemplateConfig, setEditingTemplateConfig] = useState<any | null>(null);
  const [studentMissionsMap, setStudentMissionsMap] = useState<Record<string, any>>({});
  const [missionsActiveSubTab, setMissionsActiveSubTab] = useState<'assignments' | 'templates' | 'approvals'>('assignments');
  const tabStorageKey = activePlatform === 'campus' ? 'campus_active_tab' : 'groovelab_active_tab';
  const [activeTab, setActiveTabRaw] = useState<string>(() => {
    if (forceTab) return forceTab;
    const key = activePlatform === 'campus' ? 'campus_active_tab' : 'groovelab_active_tab';
    const saved = typeof window !== 'undefined' ? (sessionStorage.getItem(key) || localStorage.getItem(key)) : null;
    return saved || (activePlatform === 'campus' ? 'briefing' : 'live');
  });

  const setActiveTab = (tab: string) => {
    setActiveTabRaw(tab);
    const key = activePlatform === 'campus' ? 'campus_active_tab' : 'groovelab_active_tab';
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(key, tab);
      localStorage.setItem(key, tab);
    }
    if (onTabChange) onTabChange(tab);
  };
  const [mediathekTab, setMediathekTab] = useState<'songs' | 'lehrwerke' | 'schnelltext'>('songs');
  const mediathekTouchStartXRef = useRef<number | null>(null);

  const handleMediathekTouchStart = (e: React.TouchEvent) => {
    mediathekTouchStartXRef.current = e.touches[0].clientX;
  };

  const handleMediathekTouchEnd = (e: React.TouchEvent) => {
    if (mediathekTouchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = mediathekTouchStartXRef.current - touchEndX;
    if (Math.abs(diffX) > 40) {
      if (diffX > 0) {
        if (mediathekTab === 'songs') setMediathekTab('lehrwerke');
        else if (mediathekTab === 'lehrwerke') setMediathekTab('schnelltext');
      } else {
        if (mediathekTab === 'schnelltext') setMediathekTab('lehrwerke');
        else if (mediathekTab === 'lehrwerke') setMediathekTab('songs');
      }
    }
    mediathekTouchStartXRef.current = null;
  };
  const [lehrwerke, setLehrwerke] = useState<any[]>([]);
  const [showAddLehrwerk, setShowAddLehrwerk] = useState(false);
  const [newLehrwerk, setNewLehrwerk] = useState({ title: '', author: '', totalPages: 50 });
  const [editingLehrwerk, setEditingLehrwerk] = useState<any | null>(null);
  const [bulkModeLehrwerke, setBulkModeLehrwerke] = useState(false);
  const [bulkTextLehrwerke, setBulkTextLehrwerke] = useState('');
  const [selectedLehrwerkForDetail, setSelectedLehrwerkForDetail] = useState<any | null>(null);
  const [selectedStudentForProgress, setSelectedStudentForProgress] = useState<any | null>(null);
  const [selectedBrush, setSelectedBrush] = useState<'unbearbeitet' | 'in_progress' | 'mastered' | 'theory_done'>('in_progress');
  const [weeklyHomeworkNotesList, setWeeklyHomeworkNotesList] = useState<string[]>([]);
  const [newHomeworkNoteText, setNewHomeworkNoteText] = useState('');
  const [songLessonNotes, setSongLessonNotes] = useState<string>('');
  const [lessonDayForProgress, setLessonDayForProgress] = useState<number>(1);
  const [selectedSongForDetail, setSelectedSongForDetail] = useState<any | null>(null);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState('300');
  const [newGoalTitle, setNewGoalTitle] = useState('Klassen-Rockstar-Challenge');
  const [newGoalMinutes, setNewGoalMinutes] = useState('300');
  const [newGoalDeadline, setNewGoalDeadline] = useState('');
  const [showAddGoalForm, setShowAddGoalForm] = useState(false);

  // Campus Bookings states
  const [selectedCampusRoomId, setSelectedCampusRoomId] = useState<string>(() => rooms[0]?.id || '');
  const [showMobileRoomSlider, setShowMobileRoomSlider] = useState<boolean>(false);
  const [favoriteRoomId, setFavoriteRoomId] = useState<string | null>(() => localStorage.getItem(`groovelab_favorite_room_id_${userId}`));
  const [showUnsuitableList, setShowUnsuitableList] = useState(false);
  const [hoveredInstrumentIdx, setHoveredInstrumentIdx] = useState<number | null>(null);
  const consolidateBookings = (bookings: any[]) => {
    const timeToMins = (t: string) => {
      if (!t) return 0;
      const [h, m] = t.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const minsToTime = (mins: number) => {
      const h = Math.floor(mins / 60) % 24;
      const m = mins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    // Group bookings by room, date, teacher, and whether it's a schedule
    const groups: { [key: string]: any[] } = {};
    bookings.forEach(b => {
      if (b.isSchedule) return;
      const key = `${b.roomId}_${b.date}_${b.teacherId}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(b);
    });

    const processedIds = new Set<string>();
    const consolidated: any[] = [];

    // Add all weekly schedules as is
    bookings.filter(b => b.isSchedule).forEach(b => consolidated.push(b));

    // Process groups
    Object.keys(groups).forEach(key => {
      const list = groups[key];
      if (list.length === 0) return;

      // Sort by start time
      const sorted = [...list].sort((a, b) => timeToMins(a.startTime) - timeToMins(b.startTime));
      
      let current = sorted[0];
      processedIds.add(current.id);

      for (let i = 1; i < sorted.length; i++) {
        const next = sorted[i];
        const currentEnd = timeToMins(current.endTime);
        const nextStart = timeToMins(next.startTime);

        if (currentEnd >= nextStart) {
          // Merge next into current
          const nextEnd = timeToMins(next.endTime);
          const maxEnd = Math.max(currentEnd, nextEnd);
          current = {
            ...current,
            endTime: minsToTime(maxEnd),
            purpose: current.purpose === next.purpose 
              ? current.purpose 
              : `${current.purpose} / ${next.purpose}`
          };
          processedIds.add(next.id);
        } else {
          consolidated.push(current);
          current = next;
          processedIds.add(current.id);
        }
      }
      consolidated.push(current);
    });

    // Add any manual bookings that were not processed (just in case)
    bookings.forEach(b => {
      if (!b.isSchedule && !processedIds.has(b.id)) {
        consolidated.push(b);
      }
    });

    return consolidated;
  };

  const [campusBookings, setCampusBookingsRaw] = useState<any[]>(() => {
    try {
      const sId = admin?.school_id || '';
      const stored = (sId ? localStorage.getItem(`groovelab_campus_bookings_${sId}`) : null) || localStorage.getItem('groovelab_campus_bookings');
      const initial = stored ? JSON.parse(stored) : [];
      return consolidateBookings(Array.isArray(initial) ? initial : []);
    } catch {
      return [];
    }
  });

  const setCampusBookings = (val: any[] | ((prev: any[]) => any[])) => {
    setCampusBookingsRaw(prev => {
      const updated = typeof val === 'function' ? val(prev) : val;
      return consolidateBookings(updated);
    });
  };

  const [hasInitializedRoom, setHasInitializedRoom] = useState(false);
  const [dbRoomBookings, setDbRoomBookings] = useState<any[]>([]);

  const myRooms = React.useMemo(() => {
    const roomIds = new Set<string>();
    
    // 1. Check weekly schedules
    if (schedules && schedules.length > 0) {
      schedules.forEach((s: any) => {
        const isOwn = s.teacher_id === userId || (admin && s.teacher?.first_name && `${s.teacher.first_name} ${s.teacher.last_name}`.trim().toLowerCase() === `${admin.first_name || ''} ${admin.last_name || ''}`.trim().toLowerCase());
        if (isOwn && s.room_id) {
          roomIds.add(s.room_id);
        }
      });
    }

    // 2. Check manual bookings
    if (campusBookings && campusBookings.length > 0) {
      campusBookings.forEach((b: any) => {
        const isOwn = b.teacherId === userId || (admin && b.teacherName && b.teacherName.trim().toLowerCase() === `${admin.first_name || ''} ${admin.last_name || ''}`.trim().toLowerCase());
        if (isOwn && b.roomId) {
          roomIds.add(b.roomId);
        }
      });
    }

    // 3. Check database room bookings
    if (dbRoomBookings && dbRoomBookings.length > 0) {
      dbRoomBookings.forEach((b: any) => {
        const isOwn = b.teacherId === userId || (admin && b.teacherName && b.teacherName.trim().toLowerCase() === `${admin.first_name || ''} ${admin.last_name || ''}`.trim().toLowerCase());
        if (isOwn && b.roomId) {
          roomIds.add(b.roomId);
        }
      });
    }

    return rooms.filter((r: any) => roomIds.has(r.id));
  }, [rooms, schedules, campusBookings, dbRoomBookings, userId, admin]);

  useEffect(() => {
    const calendarUrl = schoolObj?.calendar_url;
    if (calendarUrl) {
      fetchHolidaysCached(calendarUrl).then(h => {
        if (h && h.length > 0) setHolidays(h);
      });
    }
  }, [schoolObj?.calendar_url]);

  useEffect(() => {
    const checkMobile = () => {
      if (typeof window !== 'undefined') setWindowWidth(window.innerWidth);
      const isSimMobile = typeof document !== 'undefined' && Boolean(document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait, .sim-viewport-tablet, .sim-viewport-landscape, .sim-viewport-iphone14, [class*="sim-viewport-mobile"], [class*="sim-viewport-tablet"]'));
      setIsMobile(window.innerWidth <= 1024 || isSimMobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    window.addEventListener('groovelab_orientation_changed', checkMobile);

    const observer = new MutationObserver(() => {
      checkMobile();
    });
    if (typeof document !== 'undefined' && document.body) {
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
      window.removeEventListener('groovelab_orientation_changed', checkMobile);
      observer.disconnect();
    };
  }, []);

  // Pre-select the room where the teacher teaches today
  useEffect(() => {
    if (hasInitializedRoom) return;
    if (!userId || !myRooms || myRooms.length === 0) return;
    
    const today = new Date();
    const DAYS_MAP = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayDayName = DAYS_MAP[today.getDay()];
    const todayDayIndex = today.getDay();
    const todayDateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

    // 1. Look for a room with a schedule today
    const todaySchedule = schedules.find((s: any) => {
      const isOwn = s.teacher_id === userId || (admin && s.teacher?.first_name && `${s.teacher.first_name} ${s.teacher.last_name}`.trim().toLowerCase() === `${admin.first_name || ''} ${admin.last_name || ''}`.trim().toLowerCase());
      const matchesDay = s.day_of_week === todayDayName || String(s.day_of_week) === String(todayDayIndex);
      return isOwn && matchesDay && s.room_id;
    });

    if (todaySchedule && todaySchedule.room_id) {
      setSelectedCampusRoomId(todaySchedule.room_id);
      setHasInitializedRoom(true);
      return;
    }

    // 2. Look for a room with a manual booking today
    const todayBooking = campusBookings.find((b: any) => {
      const isOwn = b.teacherId === userId || (admin && b.teacherName && b.teacherName.trim().toLowerCase() === `${admin.first_name || ''} ${admin.last_name || ''}`.trim().toLowerCase());
      return isOwn && b.date === todayDateStr && b.roomId;
    });

    if (todayBooking && todayBooking.roomId) {
      setSelectedCampusRoomId(todayBooking.roomId);
      setHasInitializedRoom(true);
      return;
    }

    const currentIsValid = selectedCampusRoomId === 'all' || myRooms.some((r: any) => r.id === selectedCampusRoomId);
    if (!selectedCampusRoomId || !currentIsValid) {
      setSelectedCampusRoomId(myRooms[0]?.id || 'all');
    }
    setHasInitializedRoom(true);
  }, [myRooms, schedules, campusBookings, userId, admin, hasInitializedRoom, selectedCampusRoomId]);


  const [bookingDate, setBookingDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [bookingStartTime, setBookingStartTime] = useState<string>('08:00');
  const [bookingEndTime, setBookingEndTime] = useState<string>('09:00');
  const [bookingPurpose, setBookingPurpose] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [showPreviewField, setShowPreviewField] = useState<boolean>(false);
  const [recurringInterval, setRecurringInterval] = useState<number>(1);
  const [bookingType, setBookingType] = useState<'solo' | 'lesson'>('solo');
  const [bookingStudentId, setBookingStudentId] = useState<string>('');
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>('');
  const [successAnimationRoomId, setSuccessAnimationRoomId] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string>('Alle');
  const [roomSearchQuery, setRoomSearchQuery] = useState<string>('');
  const [isRoomSearchDropdownOpen, setIsRoomSearchDropdownOpen] = useState<boolean>(false);
  const [showMyBookingsOnly, setShowMyBookingsOnly] = useState<boolean>(false);
  const [showOnlyFreeNow, setShowOnlyFreeNow] = useState<boolean>(false);
  const [isDateFilterActive, setIsDateFilterActive] = useState<boolean>(false);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [draftBooking, setDraftBooking] = useState<{
    dayIdx: number;
    hour: string;
    date: string;
    startTime: string;
    endTime: string;
    rect: { top: number; left: number; width: number; height: number } | null;
  } | null>(null);
  const [draftPurpose, setDraftPurpose] = useState<string>('');
  const [dragOverCell, setDragOverCell] = useState<{ dayIdx: number; hour: string } | null>(null);
  
  // External blocking states
  const [bookingTargetType, setBookingTargetType] = useState<'internal' | 'external'>('internal');
  const [externalBookingPartnerName, setExternalBookingPartnerName] = useState<string>('');
  const [roomBlockedSlots, setRoomBlockedSlots] = useState<any[]>([]);

  // World-Class Room Board Mobile & Search Enhancements
  const [mobileCalendarView, setMobileCalendarView] = useState<'day' | 'week'>('day');
  const [mobileSelectedDayIdx, setMobileSelectedDayIdx] = useState<number>(() => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1; // 0=Mon, ..., 6=Sun
  });
  const [selectedEquipmentFilter, setSelectedEquipmentFilter] = useState<string>('Alle');
  const [showRoomFinderBar, setShowRoomFinderBar] = useState<boolean>(false);
  const [finderStartTime, setFinderStartTime] = useState<string>('14:00');
  const [finderEndTime, setFinderEndTime] = useState<string>('15:00');
  const [finderResultCount, setFinderResultCount] = useState<number | null>(null);



  // Textbausteine states
  const [textbausteine, setTextbausteine] = useState<any[]>(() => {
    const sId = admin?.school_id || '';
    const stored = (sId ? localStorage.getItem(`groovelab_textbausteine_${sId}`) : null) || localStorage.getItem('groovelab_textbausteine');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const containsOldWording = parsed.some((x: any) => 
          x.text.includes('Fingersätze') || 
          x.text.includes('Tasten/Saiten') || 
          x.text.includes('Fingern') || 
          x.text.includes('Griffwechsel')
        );
        if (parsed.length > 0 && parsed.some((x: any) => x.category) && !containsOldWording) {
          return parsed;
        }
      } catch (e) {
        console.error("Error parsing textbausteine:", e);
      }
    }
    return [
      // Rhythmus & Timing (Puls & Grooves)
      { id: 'r1', label: '🥁 Puls-Master', text: 'Klopfe den Puls mit dem Fuß und klatsche den Rhythmus im Vorfeld. Spreche die Notenwerte laut mit – dein innerer Puls ist das Fundament jedes Grooves!', type: 'both', category: 'rhythm', active: true },
      { id: 'r2', label: '⏱️ Metronom-Buddy', text: 'Starte mit dem Metronom bei einem entspannten Entschleunigungs-Tempo. Erhöhe das Tempo erst in 5er-Schritten, wenn die Passage 3-mal in Folge makellos im Takt lag.', type: 'both', category: 'rhythm', active: true },
      { id: 'r3', label: '🐌 Schnecken-Tempo', text: 'Zerlege die schwierige Stelle in echtes Lupen-Tempo. Wenn du jede Bewegung extrem langsam und präzise ausführst, schaltet dein Gehirn automatisch in den Turbo-Modus!', type: 'both', category: 'rhythm', active: true },
      { id: 'r4', label: '🧩 Puzzle-Taktik', text: 'Verbinde Mikromodule: Übe nicht das ganze Stück auf einmal, sondern isoliere genau einen Takt. Erst wenn dieses Puzzleteil perfekt sitzt, baust du die Brücke zum nächsten Takt.', type: 'both', category: 'rhythm', active: true },
      { id: 'r5', label: '🚶‍♂️ Klatsch-Gehen', text: 'Bewege deinen Körper im gleichmäßigen Gehtakt durch den Raum und klatsche die Melodie synchron dazu. So verankerst du das Rhythmusgefühl im ganzen Körper!', type: 'both', category: 'rhythm', active: false },
      { id: 'r6', label: '⏳ Dehnungs-Übung', text: 'Spiele den Bewegungsablauf in doppelter Notenlänge vollkommen gedehnt durch. Spüre genau, wie deine Finger oder Hände den nächsten Ton vorausschauend vorbereiten.', type: 'both', category: 'rhythm', active: false },

      // Technik & Bewegungsökonomie
      { id: 't1', label: '🔂 Ritter-Dreierspiel', text: 'Mastery-Regel: Wiederhole den kniffligen Übergang exakt dreimal hintereinander ohne den kleinsten Fehler. Das brennt die Bewegung direkt ins Muskelgedächtnis ein!', type: 'both', category: 'technique', active: true },
      { id: 't2', label: '👁️ Blind-Flug', text: 'Schließe beim Spielen bewusst die Augen und aktiviere deine innere Klangvorstellung. Vertraue deinem Tastsinn und dem Raumgefühl deiner Hände!', type: 'both', category: 'technique', active: true },
      { id: 't3', label: '🏋️‍♂️ Fokus-Gym', text: 'Führe die Bewegungsabläufe in Zeitlupe bei minimalem Kraftaufwand aus. Achte auf maximale Lockerheit in Schultern, Handgelenken und Fingern.', type: 'both', category: 'technique', active: true },
      { id: 't4', label: '🕵️‍♂️ Detail-Detektiv', text: 'Verfolge das Notenbild mit geschärftem Blick: Prüfe Vorzeichen, Artikulation (Staccato/Legato) und Fingersätze haargenau. Kein akustisches Detail bleibt unentdeckt!', type: 'lehrwerke', category: 'technique', active: true },
      { id: 't5', label: '🚀 Hürden-Sprung', text: 'Isoliere die kritische Bewegungsschnittstelle: Übe gezielt nur den Zielwechsel vom letzten Ton des alten Taktes auf den ersten Ton des neuen Taktes.', type: 'both', category: 'technique', active: false },
      { id: 't6', label: '🕸️ Relax-Übung', text: 'Scanne deinen Körper während des Spiels auf unnötige Spannung. Lass alle Muskeln, die gerade nicht aktiv gebraucht werden, völlig entspannt und gelöst.', type: 'both', category: 'technique', active: false },

      // Ausdruck, Klangkultur & Performance
      { id: 'p1', label: '🎵 Laut-Leise Zauber', text: 'Erschaffe dramaturgische Kontraste! Gestalte den dynamischen Bogen spürbar zwischen zartem Pianissimo und kraftvollem Forte – gib den Tönen Raum zum Atmen.', type: 'both', category: 'performance', active: true },
      { id: 'p2', label: '🌟 Eigener Remix', text: 'Kreativitäts-Challenge: Überlege dir eine eigene stilistische Variation, ein cooles Lick oder eine kleine Verzierung für diesen Abschnitt. Bring deine eigene musikalische Handschrift ein!', type: 'songs', category: 'performance', active: true },
      { id: 'p3', label: '🎭 Storyteller', text: 'Welche Emotion oder Geschichte steckt in diesen Takten? Forme jeden Ton so, als würdest du einer Zuhörerschaft ein spannendes oder berührendes Abenteuer erzählen.', type: 'both', category: 'performance', active: true },
      { id: 'p4', label: '🌊 Atem-Fluss', text: 'Forme Phrasen wie ein erfahrener Sänger: Atme vor dem Phrasenbeginn ein und führe den Bogen organisch bis zum Entspannungspunkt der Phrase.', type: 'both', category: 'performance', active: true },
      { id: 'p5', label: '🎤 Echo-Spiel', text: 'Spiel mit Klangschattierungen: Gestalte die Phrasenwiederholung als zartes, fernes Echo aus den Bergen mit reduzierter Anschlagsintensität.', type: 'both', category: 'performance', active: false },
      { id: 'p6', label: '🎬 Scheinwerfer-An', text: 'Bühnen-Simulation: Spiele das Stück ohne Unterbrechung von Anfang bis Ende durch. Wenn ein kleiner Wackler passiert, spiele unbeeindruckt im Puls weiter – wie ein echter Profi auf der Bühne!', type: 'both', category: 'performance', active: false }
    ];
  });

  const [showTextbausteinModal, setShowTextbausteinModal] = useState<boolean>(false);
  const [showTeacherToolsModal, setShowTeacherToolsModal] = useState<boolean>(false);
  const [previewingTextbaustein, setPreviewingTextbaustein] = useState<any | null>(null);
  const [copiedTbId, setCopiedTbId] = useState<string | null>(null);
  useEffect(() => {
    const [sh, sm] = bookingStartTime.split(':').map(Number);
    const [eh, em] = bookingEndTime.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    if (endMins <= startMins) {
      const targetEndMins = startMins + 30;
      const th = String(Math.floor(targetEndMins / 60)).padStart(2, '0');
      const tm = String(targetEndMins % 60).padStart(2, '0');
      setBookingEndTime(`${th}:${tm}`);
    }
  }, [bookingStartTime, bookingEndTime]);

  // LocalStorage synchronization for campus bookings
  useEffect(() => {
    const sId = admin?.school_id;
    if (sId) {
      localStorage.setItem(`groovelab_campus_bookings_${sId}`, JSON.stringify(campusBookings));
    } else {
      localStorage.setItem('groovelab_campus_bookings', JSON.stringify(campusBookings));
    }
  }, [campusBookings, admin?.school_id]);

  useEffect(() => {
    const sId = admin?.school_id;
    if (sId) {
      localStorage.setItem(`groovelab_textbausteine_${sId}`, JSON.stringify(textbausteine));
    } else {
      localStorage.setItem('groovelab_textbausteine', JSON.stringify(textbausteine));
    }
  }, [textbausteine, admin?.school_id]);

  const getISOWeekNum = (dateInput?: string | Date, lessonDay: number = 1): string => {
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
    return String(weekNo).padStart(2, '0');
  };


  const fetchWeeklyHomeworkNotes = async (studentId: string, currentLessonDay: number) => {
    try {
      const currentWeekNum = getISOWeekNum(undefined, currentLessonDay);
      const topicName = `Hausaufgabe KW ${currentWeekNum}`;
      
      const { data, error } = await supabase
        .from('progress_matrix')
        .select('*')
        .eq('student_id', studentId)
        .eq('topic_name', topicName)
        .maybeSingle();
        
      if (data && data.homework_notes) {
        try {
          const raw = data.homework_notes;
          if (raw.startsWith('[') && raw.endsWith(']')) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              setWeeklyHomeworkNotesList(parsed);
              return;
            }
          }
          const lines = raw.split('\n').map((l: string) => l.trim()).filter(Boolean);
          setWeeklyHomeworkNotesList(lines);
        } catch (e) {
          setWeeklyHomeworkNotesList([data.homework_notes]);
        }
      } else {
        setWeeklyHomeworkNotesList([]);
      }
    } catch (err) {
      console.error('Error fetching weekly homework notes:', err);
    }
  };

  useEffect(() => {
    if (selectedStudentForProgress) {
      const loadLessonDayAndFetch = async () => {
        let activeLessonDay = 1;
        try {
          const { data } = await supabase
            .from('schedules')
            .select('day_of_week')
            .eq('student_id', selectedStudentForProgress.id)
            .limit(1);
          if (data && data.length > 0 && data[0].day_of_week !== undefined) {
            activeLessonDay = data[0].day_of_week;
          }
        } catch (e) {
          console.error('Error loading lesson day:', e);
        }
        setLessonDayForProgress(activeLessonDay);
        fetchWeeklyHomeworkNotes(selectedStudentForProgress.id, activeLessonDay);
      };
      loadLessonDayAndFetch();
    } else {
      setWeeklyHomeworkNotesList([]);
      setLessonDayForProgress(1);
    }
  }, [selectedStudentForProgress]);

  const handleAddWeeklyHomeworkNote = async () => {
    if (!newHomeworkNoteText.trim() || !selectedStudentForProgress) return;
    
    const updatedNotes = [...weeklyHomeworkNotesList, newHomeworkNoteText.trim()];
    setWeeklyHomeworkNotesList(updatedNotes);
    setNewHomeworkNoteText('');
    
    try {
      const currentWeekNum = getISOWeekNum(undefined, lessonDayForProgress);
      const topicName = `Hausaufgabe KW ${currentWeekNum}`;
      const activeTId = userId || '';
      
      const { data: existing } = await supabase
        .from('progress_matrix')
        .select('id')
        .eq('student_id', selectedStudentForProgress.id)
        .eq('topic_name', topicName)
        .maybeSingle();
        
      if (existing) {
        await supabase
          .from('progress_matrix')
          .update({
            homework_notes: JSON.stringify(updatedNotes),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('progress_matrix')
          .insert({
            student_id: selectedStudentForProgress.id,
            teacher_id: activeTId,
            topic_name: topicName,
            status: 'IN_PROGRESS',
            is_current_homework: true,
            teacher_notes: '',
            homework_notes: JSON.stringify(updatedNotes),
            updated_at: new Date().toISOString()
          });
      }
    } catch (err) {
      console.error('Error saving weekly homework note:', err);
    }
  };

  const handleDeleteWeeklyHomeworkNote = async (idxToDelete: number) => {
    if (!selectedStudentForProgress) return;
    
    const updatedNotes = weeklyHomeworkNotesList.filter((_, idx) => idx !== idxToDelete);
    setWeeklyHomeworkNotesList(updatedNotes);
    
    try {
      const currentWeekNum = getISOWeekNum(undefined, lessonDayForProgress);
      const topicName = `Hausaufgabe KW ${currentWeekNum}`;
      
      const { data: existing } = await supabase
        .from('progress_matrix')
        .select('id')
        .eq('student_id', selectedStudentForProgress.id)
        .eq('topic_name', topicName)
        .maybeSingle();
        
      if (existing) {
        await supabase
          .from('progress_matrix')
          .update({
            homework_notes: JSON.stringify(updatedNotes),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      }
    } catch (err) {
      console.error('Error deleting weekly homework note:', err);
    }
  };

  const [quickAddPageNum, setQuickAddPageNum] = useState<string>('');
  const [localProgress, setLocalProgress] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('student_lehrwerke_progress');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });
  const [studentDetailSearch, setStudentDetailSearch] = useState('');
  const [assignStudentSearch, setAssignStudentSearch] = useState('');
  const [isAssignSearchFocused, setIsAssignSearchFocused] = useState(false);
  const [isEditingBookHeader, setIsEditingBookHeader] = useState(false);
  const [editBookTitle, setEditBookTitle] = useState('');
  const [editBookAuthor, setEditBookAuthor] = useState('');
  const [editBookTotalPages, setEditBookTotalPages] = useState(50);
  const [showTageskompassModal, setShowTageskompassModal] = useState(false);
  const [selectedStudentForTageskompass, setSelectedStudentForTageskompass] = useState<any>(null);
  const [initialLehrwerkIdForTageskompass, setInitialLehrwerkIdForTageskompass] = useState<string | null>(null);
  const [assignedStudentsSearchQuery, setAssignedStudentsSearchQuery] = useState('');
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [draggedStationId, setDraggedStationId] = useState<string | null>(null);
  
  const [showQuickAddStudent, setShowQuickAddStudent] = useState(false);
  const [quickFirstName, setQuickFirstName] = useState('');
  const [quickLastName, setQuickLastName] = useState('');
  const [quickInstrument, setQuickInstrument] = useState('Gitarre');

  const [dragOverStationId, setDragOverStationId] = useState<string | null>(null);

  const handleStationDragStart = (e: React.DragEvent, id: string) => {
    setDraggedStationId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleStationDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedStationId !== id) {
      setDragOverStationId(id);
    }
  };

  const handleStationDrop = async (e: React.DragEvent, targetRoomId: string) => {
    e.preventDefault();
    if (!draggedStationId || !dragOverStationId) {
      setDraggedStationId(null);
      setDragOverStationId(null);
      return;
    }

    // Get the current room's stations
    const roomStations = stations.filter(s => s.room_id === targetRoomId);
    
    // Find indexes
    const dragIdx = roomStations.findIndex(s => s.id === draggedStationId);
    const hoverIdx = roomStations.findIndex(s => s.id === dragOverStationId);

    if (dragIdx === -1 || hoverIdx === -1) {
      setDraggedStationId(null);
      setDragOverStationId(null);
      return;
    }

    // Reorder array
    const updatedRoomStations = [...roomStations];
    const [draggedItem] = updatedRoomStations.splice(dragIdx, 1);
    updatedRoomStations.splice(hoverIdx, 0, draggedItem);

    // Optimistically update the state for stations
    const remainingStations = stations.filter(s => s.room_id !== targetRoomId);
    
    // Assign new sort_order fields
    const updatedAll = [
      ...remainingStations,
      ...updatedRoomStations.map((s, idx) => ({ ...s, sort_order: idx }))
    ];
    
    // Sort updatedAll by sort_order ascending, then by name
    updatedAll.sort((a, b) => {
      if (a.room_id === b.room_id) {
        if ((a.sort_order ?? 0) !== (b.sort_order ?? 0)) {
          return (a.sort_order ?? 0) - (b.sort_order ?? 0);
        }
        return (a.name || '').localeCompare(b.name || '');
      }
      return 0;
    });

    setStations(updatedAll);

    // Also update setupStations if active tab is setup
    setSetupStations(prev => {
      const other = prev.filter(s => s.room_id !== targetRoomId);
      const updatedSetup = [
        ...other,
        ...updatedRoomStations.map((s, idx) => ({ ...s, sort_order: idx }))
      ];
      updatedSetup.sort((a, b) => {
        if (a.room_id === b.room_id) {
          if ((a.sort_order ?? 0) !== (b.sort_order ?? 0)) {
            return (a.sort_order ?? 0) - (b.sort_order ?? 0);
          }
          return (a.name || '').localeCompare(b.name || '');
        }
        return 0;
      });
      return updatedSetup;
    });

    setDraggedStationId(null);
    setDragOverStationId(null);

    // Update in Supabase
    try {
      const promises = updatedRoomStations.map((s, idx) => {
        return supabase
          .from('stations')
          .update({ sort_order: idx })
          .eq('id', s.id);
      });
      await Promise.all(promises);
    } catch (err) {
      console.error('Failed to update stations sort order:', err);
    }
  };

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  
  const [bandSearch, setBandSearch] = useState('');
  const [bandLetter, setBandLetter] = useState<string | null>(null);
  const [selectedCoachId, setSelectedCoachId] = useState<string>('all');
  const [editingBand, setEditingBand] = useState<any>(null);
  const [showAddMember, setShowAddMember] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [externalName, setExternalName] = useState('');
  const [externalInstrument, setExternalInstrument] = useState('Vocals');
  
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showBulkAddStudents, setShowBulkAddStudents] = useState(false);
  const [showParentInfoSheetModal, setShowParentInfoSheetModal] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [parsedStudents, setParsedStudents] = useState<{ firstName: string; lastName: string; instrument: string }[]>([]);
  const [defaultInstrumentForBulk, setDefaultInstrumentForBulk] = useState('Gitarre');
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [newStudent, setNewStudent] = useState({ firstName: '', lastName: '', birthDate: '', photoUrl: '/avatar_ghost.jpg', isExternalVocalist: false, instrument: 'Gitarre', app_usage_mode: 'student_only' });
  const [vocalistOnlyMode, setVocalistOnlyMode] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'green' | 'yellow' | 'red'>('all');
  const [studentsXP, setStudentsXP] = useState<Record<string, number>>({});
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isSimMobile = typeof document !== 'undefined' && Boolean(document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait, .sim-viewport-tablet, .sim-viewport-landscape, .sim-viewport-iphone14, [class*="sim-viewport-mobile"], [class*="sim-viewport-tablet"]'));
    return window.innerWidth <= 1024 || isSimMobile;
  });
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);
  
  const [showAddBand, setShowAddBand] = useState(false);
  const [newBand, setNewBand] = useState({ name: '', song_id: '', coach_id: userId, photo_url: '' });
  const [selectedMembers, setSelectedMembers] = useState<{user_id: string, instrument: string}[]>([]);
  const [memberToSearch, setMemberToSearch] = useState('');
  
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [newTeacher, setNewTeacher] = useState<{
    firstName: string;
    lastName: string;
    isAdmin: boolean;
    instrument: string;
    photoUrl: string;
    employment_type?: 'employed' | 'freelance';
  }>({ firstName: '', lastName: '', isAdmin: false, instrument: '', photoUrl: '', employment_type: 'employed' });

  const op = schoolObj?.opening_hours || {};
  const teachersManageStudents = op.gl_setting_groovelab_teachers_manage_students === true;
  const teachersManageTeachers = op.gl_setting_groovelab_teachers_manage_teachers === true;
  const campusTeachersManageStudents = op.gl_setting_campus_teachers_manage_students === true;
  const campusTeachersManageTeachers = op.gl_setting_campus_teachers_manage_teachers === true;

  const currentPlatformTeachersManageStudents = activePlatform === 'campus' ? campusTeachersManageStudents : teachersManageStudents;
  const currentPlatformTeachersManageTeachers = activePlatform === 'campus' ? campusTeachersManageTeachers : teachersManageTeachers;

  const canManageStudents = currentPlatformTeachersManageStudents;
  const canManageTeachers = currentPlatformTeachersManageTeachers;

  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomLocation, setNewRoomLocation] = useState<{lat: number, lng: number} | null>(null);
  const [newRoomStationCount, setNewRoomStationCount] = useState(5);
  const [draggedRoomId, setDraggedRoomId] = useState<string | null>(null);
  const [dragOverRoomId, setDragOverRoomId] = useState<string | null>(null);
  const draggedRoomIdRef = React.useRef<string | null>(null);
  
  const [showAddStationForRoom, setShowAddStationForRoom] = useState<string | null>(null);
  const [newStationName, setNewStationName] = useState('');
  const [newStationColor, setNewStationColor] = useState('#64748b');
  const [activeColorMenuStationId, setActiveColorMenuStationId] = useState<string | null>(null);
  
  // Layout Customizer states
  const [customizingRoom, setCustomizingRoom] = useState<any | null>(null);
  const calendarScrollRef = React.useRef<HTMLDivElement>(null);
  const loadedWeekRangeRef = React.useRef<{ start: string; end: string } | null>(null);

  
  const [showAddSong, setShowAddSong] = useState(false);
  const [bulkModeSongs, setBulkModeSongs] = useState(false);
  const [bulkTextSongs, setBulkTextSongs] = useState('');
  const [newSong, setNewSong] = useState({ artist: '', title: '', level: 1, media_link: '', tomplay_url: '', pdf_folder_url: '', guitar_pro_url: '', pdf_drums_url: '', pdf_guitar_url: '', pdf_bass_url: '', pdf_vocals_url: '', pdf_keys_url: '', playalong_url: '', bypass_wlan_check: false, instrumentation: { 'E-Gitarre': 1, 'E-Bass': 1, 'E-Drums': 1, 'E-Piano': 1 } as Record<string, number> });
  
  const [songSearch, setSongSearch] = useState('');
  const [songSearchType, setSongSearchType] = useState<'title' | 'artist'>('title');
  const [songAlphaFilter, setSongAlphaFilter] = useState<string | null>(null);
  
  const [selectedQRUser, setSelectedQRUser] = useState<any>(null);
  const [qrAvatarDataUrl, setQrAvatarDataUrl] = useState<string | null>(null);
  const [qrSchoolName, setQrSchoolName] = useState<string>('Campus Musikschule');

  useEffect(() => {
    if (!selectedQRUser) {
      setQrSchoolName('Campus Musikschule');
      return;
    }
    const fetchSchool = async () => {
      let resolvedSchoolId = selectedQRUser.school_id || selectedQRUser.schoolId || (selectedQRUser.schools?.id) || (Array.isArray(selectedQRUser.schools) ? selectedQRUser.schools[0]?.id : null);
      
      if (!resolvedSchoolId && selectedQRUser.id) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('school_id')
            .eq('id', selectedQRUser.id)
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
            setQrSchoolName(data.name || 'Campus Musikschule');
          }
        } catch (err) {
          console.error('Error fetching school details:', err);
        }
      } else {
        setQrSchoolName('Campus Musikschule');
      }
    };

    fetchSchool();
  }, [selectedQRUser]);

  useEffect(() => {
    if (!selectedQRUser) {
      setQrAvatarDataUrl(null);
      return;
    }
    
    let active = true;
    const roleLower = (selectedQRUser.role || '').toLowerCase();
    const isQRAdminOrSecretary = roleLower === 'admin' || roleLower === 'secretary';
    let originalUrl = selectedQRUser.photo_url || '/avatar_ghost.jpg';
    if (isQRAdminOrSecretary) {
      originalUrl = '/campus_login_hero.png';
    } else if (selectedQRUser.role === 'student') {
      originalUrl = resolveCampusStudentAvatar(selectedQRUser, teachers, schedules);
    }
    
    if (originalUrl.startsWith('data:') || originalUrl.startsWith('blob:')) {
      setQrAvatarDataUrl(originalUrl);
      return;
    }

    const loadAndConvert = async () => {
      try {
        let url = new URL(originalUrl, window.location.origin).href;
        
        if (originalUrl !== '/avatar_ghost.jpg') {
          const separator = url.includes('?') ? '&' : '?';
          url = `${url}${separator}cb=${Date.now()}`;
        }
        
        const response = await fetch(url, { mode: 'cors', cache: 'no-cache' });
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        
        const reader = new FileReader();
        reader.onloadend = () => {
          if (active) {
            setQrAvatarDataUrl(reader.result as string);
          }
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.warn('Could not convert image to base64, using fallback URL:', err);
        if (active) {
          setQrAvatarDataUrl(originalUrl);
        }
      }
    };

    loadAndConvert();
    return () => {
      active = false;
    };
  }, [selectedQRUser]);

  const handleQRImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.src.startsWith('data:')) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width || 120;
      canvas.height = img.naturalHeight || img.height || 120;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setQrAvatarDataUrl(dataUrl);
      }
    } catch (err) {
      console.warn('QR OnLoad canvas conversion failed:', err);
    }
  };

  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentDetails, setStudentDetails] = useState<any>(null);
  const [studentLabMins, setStudentLabMins] = useState(0);
  const [studentHomeMins, setStudentHomeMins] = useState(0);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [listType, setListType] = useState<'active' | 'archive'>('active');
  const [instrumentFilter, setInstrumentFilter] = useState<string>('all');
  const [studentSessions, setStudentSessions] = useState<any[]>([]);
  const [studentPlanning, setStudentPlanning] = useState<any[]>([]);
  const [studentRejections, setStudentRejections] = useState<any[]>([]);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [editingSong, setEditingSong] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [manualCoords, setManualCoords] = useState<Record<string, string>>({});
  const [showManualInput, setShowManualInput] = useState<string | null>(null);
  const [showBatchiPadModal, setShowBatchiPadModal] = useState<{ roomId: string } | null>(null);
  const [batchiPadCount, setBatchiPadCount] = useState<string>('1');

  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingRoomName, setEditingRoomName] = useState('');

  const brandColor = activePlatform === 'campus' ? '#34a853' : (activePlatform === 'groovelab' ? '#eab308' : '#ea4335');

  const getStatusColor = (studentId: string, lastSeen: string | null, createdAt?: string | null) => {
    const hasLiveSession = activeSessions.some(se => se.user_id === studentId);
    
    let isOnline = false;
    if (lastSeen) {
      const lastSeenTime = new Date(lastSeen).getTime();
      const createdTime = createdAt ? new Date(createdAt).getTime() : 0;
      
      // If last_seen is identical to created_at (or within 1 second), they have never logged in
      const hasNeverLoggedIn = Math.abs(lastSeenTime - createdTime) < 1000;
      
      if (!hasNeverLoggedIn) {
        isOnline = lastSeenTime > Date.now() - 5 * 60 * 1000;
      }
    }
    
    if (hasLiveSession) return '#34a853'; // Green
    if (isOnline) return '#fbbf24'; // Yellow (Home)
    return '#ef4444'; // Red
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleLogoutStudent = async (sessionId: string) => {
    if (!window.confirm('Schüler wirklich ausloggen?')) return;
    const { error } = await supabase.from('sessions').update({ check_out_time: new Date().toISOString() }).eq('id', sessionId);
    if (error) {
      alert('Fehler beim Ausloggen: ' + error.message);
      return;
    }
    fetchData();
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Mitglied aus der Band entfernen?')) return;
    try {
      const { error } = await supabase.from('band_members').delete().eq('id', memberId);
      if (error) throw error;
      
      // Recalculate coach if not manual
      const { data: member } = await supabase.from('band_members').select('band_id').eq('id', memberId).single();
      if (member) await updateBandCoach(member.band_id);
      
      fetchData();
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    }
  };

  const handleAddMember = async (bandId: string, userId: string | null, instrument: string, extName?: string) => {
    try {
      const insertData: any = {
        band_id: bandId,
        user_id: userId,
        instrument: instrument,
        confetti_seen: true
      };
      if (extName) {
        insertData.external_name = extName;
      }

      const { error } = await supabase.from('band_members').insert(insertData);
      if (error && error.message.includes('external_name')) {
        if (!userId) {
          throw new Error("Der Server unterstützt keine externen Mitglieder. Bitte führen Sie die SQL-Migration aus.");
        }
        const fallbackData = { ...insertData };
        delete fallbackData.external_name;
        const { error: retryErr } = await supabase.from('band_members').insert(fallbackData);
        if (retryErr) throw retryErr;
      } else if (error) {
        throw error;
      }
      
      const { data: bandSongs } = await supabase.from('band_songs').select('id').eq('band_id', bandId);
      if (bandSongs && bandSongs.length > 0) {
         // Fetch existing slots to dynamically calculate non-conflicting part_number
         const songIds = bandSongs.map((bs: any) => bs.id);
         const { data: existingSlots } = await supabase
            .from('band_song_slots')
            .select('band_song_id, instrument, part_number')
            .in('band_song_id', songIds);

         const slotsToInsert = bandSongs.map((bs: any) => {
            const matchingSlots = (existingSlots || []).filter(
               (s: any) => s.band_song_id === bs.id && s.instrument === instrument
            );
            const maxPart = matchingSlots.reduce((max: number, s: any) => Math.max(max, s.part_number || 1), 0);
            const nextPart = maxPart + 1;

            const slotObj: any = {
               band_song_id: bs.id,
               user_id: userId,
               instrument: instrument,
               part_number: nextPart,
               status: 'joined'
            };
            if (extName) {
               slotObj.external_name = extName;
            }
            return slotObj;
         });

         const { error: slotErr } = await supabase.from('band_song_slots').insert(slotsToInsert);
         if (slotErr && slotErr.message.includes('external_name')) {
            if (!userId) {
               console.error("Failed to insert slots for external member:", slotErr);
            } else {
               const cleanedSlots = slotsToInsert.map((s: any) => {
                  const copy = { ...s };
                  delete copy.external_name;
                  return copy;
               });
               const { error: retrySlotErr } = await supabase.from('band_song_slots').insert(cleanedSlots);
               if (retrySlotErr) throw retrySlotErr;
            }
         } else if (slotErr) {
            throw slotErr;
         }
      }
      
      // Recalculate coach if not manual
      await updateBandCoach(bandId);
      
      setShowAddMember(null);
      setMemberSearch('');
      setExternalName('');
      fetchData();
    } catch (err: any) {
      alert('Fehler beim Hinzufügen: ' + err.message);
    }
  };

  const updateBandCoach = async (bandId: string) => {
    try {
      const { data: band } = await supabase.from('bands').select('coach_is_manual, song_id').eq('id', bandId).single();
      if (!band || band.coach_is_manual) return;

      const { data: members } = await supabase
        .from('band_members')
        .select(`
          user_id,
          users!inner(user_song_skills:user_song_skills!user_song_skills_user_id_fkey(*))
        `)
        .eq('band_id', bandId);

      if (!members) return;

      const counts: Record<string, number> = {};
      members.forEach((m: any) => {
        const verifierId = m.users?.user_song_skills?.find((s: any) => s.song_id === band.song_id && s.is_stage_ready)?.verified_by_id;
        if (verifierId) counts[verifierId] = (counts[verifierId] || 0) + 1;
      });

      let topTid = null;
      let max = 0;
      for (const [tid, c] of Object.entries(counts)) {
        if (c > max) {
          max = c;
          topTid = tid;
        }
      }

      if (topTid) {
        await supabase.from('bands').update({ coach_id: topTid }).eq('id', bandId);
      }
    } catch (err) {
      console.error('Coach update failed:', err);
    }
  };

  const handleSaveBandEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('bands').update({
        name: editingBand.name,
        bio: editingBand.bio,
        genre: editingBand.genre,
        coach_id: editingBand.coach_id,
        coach_is_manual: editingBand.coach_is_manual
      }).eq('id', editingBand.id);
      if (error) throw error;
      setEditingBand(null);
      fetchData();
    } catch (err: any) {
      alert('Fehler beim Speichern: ' + err.message);
    }
  };

  const handleLogout = () => {
    onLogout();
  };

  useEffect(() => {
    if (forceTab && forceTab !== activeTab) {
      setActiveTab(forceTab);
    }
  }, [forceTab]);

  useEffect(() => {
    const handleRefresh = () => { fetchData(true); };
    window.addEventListener('refresh-bookings', handleRefresh);
    return () => {
      window.removeEventListener('refresh-bookings', handleRefresh);
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, [activeTab, activePlatform, bookingDate, missionFilter]);

  useEffect(() => {
    if (!admin && userId) {
      const timeout = setTimeout(() => {
        setAdmin((current: any) => {
          if (current) return current;
          console.warn('[AdminDashboard] Loading timeout triggered hard fallback profile.');
          return {
            id: userId,
            first_name: 'Lehrer',
            last_name: 'GrooveLab',
            role: 'teacher',
            school_id: null
          };
        });
      }, 4000);
      return () => clearTimeout(timeout);
    }
  }, [admin, userId]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`realtime_teacher_challenges_${userId}`);
    channel
      .on('broadcast', { event: 'challenge-submitted' }, (payload: any) => {
        console.log('[Realtime] Challenge submitted broadcast received:', payload);
        fetchData();
        const studentName = payload.payload?.studentName || 'Ein Schüler';
        const songTitle = payload.payload?.songTitle || 'einem Song';
        const instrument = payload.payload?.instrument || '';
        alert(`Neue Challenge von ${studentName} für "${songTitle}" (${instrument}) eingereicht! 🚀`);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (activeTab === 'rooms') {
      const savedDate = localStorage.getItem('groovelab_selected_booking_date');
      const savedRoomId = localStorage.getItem('groovelab_selected_booking_room_id');
      const savedStartTime = localStorage.getItem('groovelab_selected_booking_start_time');
      const savedEndTime = localStorage.getItem('groovelab_selected_booking_end_time');

      if (savedDate) {
        setBookingDate(savedDate);
        localStorage.removeItem('groovelab_selected_booking_date');
      }
      if (savedRoomId) {
        setSelectedCampusRoomId(savedRoomId);
        localStorage.removeItem('groovelab_selected_booking_room_id');
      }
      if (savedStartTime) {
        setBookingStartTime(savedStartTime);
        localStorage.removeItem('groovelab_selected_booking_start_time');
      }
      if (savedEndTime) {
        setBookingEndTime(savedEndTime);
        localStorage.removeItem('groovelab_selected_booking_end_time');
      }
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'rooms') {
      setTimeout(() => {
        if (calendarScrollRef.current) {
          const now = new Date();
          let currentHour = now.getHours();
          let currentMin = now.getMinutes();

          if (isDateFilterActive && bookingStartTime) {
            const [h, m] = bookingStartTime.split(':');
            currentHour = parseInt(h, 10) || currentHour;
            currentMin = parseInt(m, 10) || currentMin;
          }

          if (currentHour >= 8 && currentHour <= 22) {
            const rowHeight = 56;
            const hoursSinceStart = currentHour - 8;
            const yPos = (hoursSinceStart * rowHeight) + ((currentMin / 60) * rowHeight);
            const containerHeight = 420;
            const targetScrollTop = yPos - (containerHeight / 2);
            calendarScrollRef.current.scrollTop = Math.max(0, targetScrollTop);
          }
        }
      }, 150);
    }
  }, [activeTab, selectedCampusRoomId, isDateFilterActive, bookingStartTime]);

  const normalizeStudentKey = (firstName: string, lastName: string) => {
    const fn = (firstName || '').toLowerCase().replace(/[^a-z0-9äöüß]/g, '');
    const ln = (lastName || '').toLowerCase().replace(/[^a-z0-9äöüß]/g, '');
    return `${fn}_${ln}`;
  };

  const isTestOrGenericStudent = (firstName: string, lastName: string) => {
    const fn = (firstName || '').toLowerCase().trim();
    const full = `${firstName || ''} ${lastName || ''}`.toLowerCase().trim();
    return (
      !fn ||
      fn.startsWith('test') ||
      fn.includes('testvorname') ||
      full.includes('ausstehend') ||
      full.includes('onboarding') ||
      full.includes('unbekannt') ||
      full === 'schüler' ||
      full === 'musiker'
    );
  };

  const deduplicateStudents = (students: any[]): any[] => {
    if (!Array.isArray(students)) return [];
    const seenIds = new Set<string>();
    const studentMap = new Map<string, any>();

    for (const student of students) {
      if (!student) continue;

      const fn = (student.first_name || '').trim();
      const ln = (student.last_name || '').trim();

      // Skip test / generic dummy profiles
      if (isTestOrGenericStudent(fn, ln) && student.isPendingOnboarding) continue;

      if (student.id && seenIds.has(student.id)) continue;

      const nameKey = normalizeStudentKey(fn, ln);

      if (nameKey !== '_') {
        if (studentMap.has(nameKey)) {
          const existing = studentMap.get(nameKey);
          if (existing.isPendingOnboarding && !student.isPendingOnboarding) {
            if (existing.id) seenIds.delete(existing.id);
            studentMap.set(nameKey, student);
            if (student.id) seenIds.add(student.id);
          }
          continue;
        }
        studentMap.set(nameKey, student);
      } else {
        const fallbackKey = student.id || `anon_${Math.random()}`;
        studentMap.set(fallbackKey, student);
      }

      if (student.id) seenIds.add(student.id);
    }

    return Array.from(studentMap.values());
  };

  const fetchTeacherStudentsHelper = async (teacherId: string, schoolId: string, platform: string) => {
    let assignedStudentIds: string[] = [];
    if (!teacherId || !isUUID(teacherId)) return assignedStudentIds;

    if (platform === 'campus') {
      const [{ data: schedData }, { data: occData }, { data: groupData }] = await Promise.all([
        supabase.from('schedules').select('student_id').eq('teacher_id', teacherId),
        supabase.from('schedule_occurrences').select('student_id').eq('teacher_id', teacherId),
        supabase.from('bands').select('id').eq('coach_id', teacherId)
      ]);

      const schedStudentIds = (schedData || []).map(s => s.student_id).filter(Boolean);
      const occStudentIds = (occData || []).map(s => s.student_id).filter(Boolean);

      let groupStudentIds: string[] = [];
      if (groupData && groupData.length > 0) {
        const groupIds = groupData.map(g => g.id);
        const { data: gsData } = await supabase.from('band_members').select('user_id').in('band_id', groupIds);
        groupStudentIds = (gsData || []).map(gs => gs.user_id).filter(Boolean);
      }

      assignedStudentIds = Array.from(new Set([...schedStudentIds, ...occStudentIds, ...groupStudentIds]));
    }

    const schoolRoster = await fetchSchoolRoster(schoolId, supabase);
    let teacherStudents = getTeacherRoster(teacherId, schoolRoster, assignedStudentIds);

    if (platform !== 'campus') {
      teacherStudents = teacherStudents.filter(s => s.is_groovelab_active);
    }

    if (teacherStudents.length > 0 && platform === 'campus') {
      const unlinkedStudents = teacherStudents.filter((s: any) => !s.teacher_id && !s.isPendingOnboarding).map((s: any) => s.id);
      if (unlinkedStudents.length > 0) {
        supabase.from('users').update({ teacher_id: teacherId }).in('id', unlinkedStudents).then(() => {
          console.log(`[Teacher Board] Auto-synced teacher_id for ${unlinkedStudents.length} students.`);
        });
      }
    }

    return teacherStudents;
  };

  const fetchData = async (force = false) => {
    let currentAdmin = admin;
    let adminData: any = null;
    let fetchError = null;
    try {
      if (userId === 'master-support-id' || (typeof window !== 'undefined' && sessionStorage.getItem('groovelab_support_ghost') === 'true')) {
        const ghostSchoolId = sessionStorage.getItem('groovelab_ghost_school_id') || '';
        const ghostSchoolName = sessionStorage.getItem('groovelab_ghost_school_name') || 'Musikschule';
        const ghostRole = sessionStorage.getItem('groovelab_ghost_active_role') || 'admin';
        adminData = {
          id: 'master-support-id',
          school_id: ghostSchoolId,
          role: ghostRole,
          first_name: `${ghostSchoolName} Support`,
          last_name: '',
          photo_url: '/campus_login_hero.png',
          avatar_url: '/campus_login_hero.png',
          is_campus_active: true,
          is_groovelab_active: true,
          is_ghost_mode: true,
          schools: {
            id: ghostSchoolId,
            name: ghostSchoolName,
            status: 'active'
          }
        };
      } else {
        const { data, error } = await supabase
          .from('users')
          .select('*, schools(*)')
          .eq('id', userId)
          .maybeSingle();
        if (error) {
          fetchError = error;
        } else {
          adminData = data;
        }

        // Fallback 1: Try shallow select if relation join failed or RLS blocked join
        if (!adminData) {
          try {
            const { data: shallowData, error: shallowErr } = await supabase
              .from('users')
              .select('*')
              .eq('id', userId)
              .maybeSingle();
            if (shallowData) {
              adminData = shallowData;
              console.warn('[AdminDashboard] Loaded user via fallback query without schools join.');
            } else if (shallowErr) {
              console.warn('[AdminDashboard] Shallow fallback error:', shallowErr);
            }
          } catch (e) {
            console.error('[AdminDashboard] Fallback query failed:', e);
          }
        }
      }
    } catch (e: any) {
      fetchError = e;
    }

    // Fallback 2: Retrieve from cached localStorage/sessionStorage user if API failed
    if (!adminData) {
      if (fetchError) {
        console.error('[AdminDashboard] Failed to fetch admin/teacher user profile:', fetchError);
      }
      const cached = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_cached_user') || localStorage.getItem('groovelab_cached_user') || sessionStorage.getItem('campus_user') || localStorage.getItem('campus_user')) : null;
      if (cached) {
        try {
          adminData = JSON.parse(cached);
          console.warn('[AdminDashboard] Recovered user profile from local storage cache.');
        } catch (e) {}
      }
    }

    // Fallback 3: Hard fallback minimal object to prevent layout hangs
    if (!adminData && currentAdmin) {
      adminData = currentAdmin;
    }
    if (!adminData) {
      adminData = {
        id: userId,
        first_name: 'Lehrer',
        last_name: 'GrooveLab',
        role: 'teacher',
        school_id: null
      };
      console.warn('[AdminDashboard] Created hard fallback minimal user profile.');
    }

    setAdmin((prev: any) => {
      if (prev && areObjectsEqualFast(prev, adminData)) return prev;
      return adminData;
    });
    currentAdmin = adminData;
    if (typeof window !== 'undefined' && adminData) {
      try {
        sessionStorage.setItem('groovelab_cached_user', JSON.stringify(adminData));
      } catch (e) {}
    }

    const userRole = adminData.role?.toLowerCase() || 'student';
    if (userRole !== 'admin' && userRole !== 'teacher' && userRole !== 'secretary') {
      return;
    }

    try {
      if (activeTab === 'live' || activeTab === 'schedule') {
        // Fetch live / schedule resources
      } else if (activeTab === 'students') {
        const activeWorkspace = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_active_workspace') || localStorage.getItem('groovelab_active_workspace')) : null;
        const isTeacherMode = adminData.role === 'teacher' || activeWorkspace === 'teacher';
        const canSeeAllStudents = (adminData.role === 'admin' || adminData.role === 'secretary') && !isTeacherMode;
        let studentsData: any[] = [];

        if (canSeeAllStudents) {
          const schoolRoster = await fetchSchoolRoster(adminData.school_id, supabase);
          studentsData = activePlatform === 'groovelab' 
            ? schoolRoster.filter(s => s.is_groovelab_active) 
            : schoolRoster;
        } else {
          const targetTeacherId = adminData.is_ghost_mode 
            ? (sessionStorage.getItem('groovelab_ghost_shadowed_teacher_id') || adminData.id) 
            : adminData.id;
          studentsData = await fetchTeacherStudentsHelper(targetTeacherId, adminData.school_id, activePlatform);
          if (adminData.is_ghost_mode && (!studentsData || studentsData.length === 0)) {
            const schoolRoster = await fetchSchoolRoster(adminData.school_id, supabase);
            studentsData = activePlatform === 'groovelab' 
              ? schoolRoster.filter(s => s.is_groovelab_active) 
              : schoolRoster;
          }
        }

        if (studentsData) {
          if (adminData.school_id && teachers.length === 0) {
            let tsq = supabase
              .from('users')
              .select('*')
              .eq('school_id', adminData.school_id)
              .in('role', ['teacher', 'admin']);
            if (activePlatform === 'campus') tsq = tsq.eq('is_campus_active', true);
            else tsq = tsq.eq('is_groovelab_active', true);
            tsq.order('first_name').then(({ data: tData }) => {
              if (tData) setTeachers(tData);
            });
          }
          // --- AUTO-CLEANUP DELETED/ARCHIVED STUDENTS (NON-BLOCKING BACKGROUND DISPATCH) ---
          const expiredStudents = studentsData.filter((s: any) => s.contract_ends_at && new Date(s.contract_ends_at).getTime() < Date.now());
          const expiredIds = expiredStudents.map((s: any) => s.id);
          const toDelete = expiredStudents.filter((s: any) => s.delete_after_contract === true).map((s: any) => s.id);
          const activeStudentsForState = toDelete.length > 0
            ? studentsData.filter((s: any) => !toDelete.includes(s.id))
            : studentsData;

          // Immediately render student list without stalling on DB mutations
          setStudents(prev => {
            if (prev && areArraysEqualFast(prev, activeStudentsForState)) return prev;
            return activeStudentsForState;
          });

          // Perform cleanup in parallel background worker to keep UI 100% smooth
          if (expiredIds.length > 0) {
            setTimeout(async () => {
              try {
                await supabase.from('band_members').delete().in('user_id', expiredIds);
                if (toDelete.length > 0) {
                  await deleteUserStorageAssets(toDelete);
                  await Promise.allSettled([
                    supabase.from('bands').update({ coach_id: null }).in('coach_id', toDelete),
                    supabase.from('user_song_skills').delete().in('user_id', toDelete),
                    supabase.from('user_song_skills').update({ verified_by_id: null }).in('verified_by_id', toDelete),
                    supabase.from('sessions').delete().in('user_id', toDelete),
                    supabase.from('band_songs').update({ suggested_by: null }).in('suggested_by', toDelete),
                    supabase.from('lab_planning').delete().in('user_id', toDelete),
                    supabase.from('band_shoutbox').delete().in('user_id', toDelete),
                    supabase.from('band_song_slots').delete().in('user_id', toDelete),
                    supabase.from('help_requests').delete().in('user_id', toDelete),
                    supabase.from('avatars').delete().in('user_id', toDelete),
                    supabase.from('users').delete().in('id', toDelete)
                  ]);
                }
              } catch (cleanErr) {
                console.warn('[AdminDashboard] Background student cleanup caught error:', cleanErr);
              }
            }, 0);
          }
          const studentIds = activeStudentsForState.map((s: any) => s.id);
          
          // Fetch active sessions for school's students
          const { data: sData } = await supabase
            .from('sessions')
            .select('*, profiles:users!inner(*), stations(*)')
            .eq('profiles.school_id', adminData.school_id)
            .is('check_out_time', null);
          setActiveSessions(prev => {
            const nextVal = sData || [];
            if (prev && areArraysEqualFast(prev, nextVal)) return prev;
            return nextVal;
          });

          if (studentIds.length > 0) {
            // Fetch skills for XP calculation
            const { data: skillsData } = await supabase
              .from('user_song_skills')
              .select('user_id, instrument, is_stage_ready')
              .in('user_id', studentIds);

            // Fetch band song slots for Vocals XP
            const { data: slotsData } = await supabase
              .from('band_song_slots')
              .select('user_id, instrument, status')
              .in('user_id', studentIds);

            const xpMap: Record<string, number> = {};
            activeStudentsForState.forEach((student: any) => {
              const studentSkills = (skillsData || []).filter((sk: any) => sk.user_id === student.id);
              const studentSlots = (slotsData || []).filter((sl: any) => sl.user_id === student.id);

              const stageReadyCount = studentSkills.filter((sk: any) => {
                const isVocal = (sk.instrument || '').toLowerCase().includes('vocal') || (sk.instrument || '').toLowerCase().includes('gesang');
                return sk.is_stage_ready && !isVocal;
              }).length;

              const vocalsCount = studentSlots.filter((sl: any) => {
                const isVocal = (sl.instrument || '').toLowerCase().includes('vocal') || (sl.instrument || '').toLowerCase().includes('gesang');
                return isVocal && sl.status !== 'declined';
              }).length;

              xpMap[student.id] = (stageReadyCount + vocalsCount) * 100;
            });
            setStudentsXP(xpMap);
          } else {
            setStudentsXP({});
          }
        }
      }
    } catch (e: any) {
      fetchError = e;
    }


    if (currentAdmin?.school_id) {
      // Fetch kiosks for the school only if not loaded yet
      if (!kiosks || kiosks.length === 0) {
        const { data: kiosksData } = await supabase
          .from('kiosks')
          .select('*')
          .eq('school_id', currentAdmin.school_id);
        setKiosks(kiosksData || []);
      }

      if (activeTab === 'students' || activeTab === 'schedule') {
        try {
          if (currentAdmin?.school_id && isUUID(currentAdmin.school_id)) {
            const { data: prefData } = await supabase
              .from('student_schedule_preferences')
              .select('student_id, preference_type, day_of_week, start_time')
              .eq('school_id', currentAdmin.school_id);
            if (prefData) {
              const map: Record<string, any[]> = {};
              prefData.forEach((p: any) => {
                if (!map[p.student_id]) map[p.student_id] = [];
                map[p.student_id].push(p);
              });
              setAllSchedulePreferences(map);
            }
          }
        } catch (e) {
          console.warn('Failed to fetch schedule preferences:', e);
        }
      }
      const adminData = currentAdmin;

      if (activeTab === 'live') {
        // Unconditionally fetch active sessions to keep online indicators and Live Lab realtime
        try {
          const { data: activeSessionsData } = await supabase
            .from('sessions')
            .select('*, profiles:users!inner(*), stations(*)')
            .eq('profiles.school_id', adminData.school_id)
            .is('check_out_time', null);
          setActiveSessions(activeSessionsData || []);
        } catch (err) {
          console.warn('Failed to fetch active sessions:', err);
        }
      } else if (activeTab === 'team') {
        let tsq = supabase
          .from('users')
          .select('*')
          .eq('school_id', adminData.school_id)
          .in('role', ['teacher', 'admin']);
        if (activePlatform === 'campus') tsq = tsq.eq('is_campus_active', true);
        else tsq = tsq.eq('is_groovelab_active', true);
        const { data: teachersData } = await tsq.order('first_name');
        if (teachersData) setTeachers(teachersData);
      } else if (activeTab === 'rooms') {
        let roomsQuery = supabase
          .from('rooms')
          .select('*')
          .eq('school_id', adminData.school_id);
        
        if (activePlatform === 'campus') {
          roomsQuery = roomsQuery.eq('is_campus_active', true);
        } else {
          roomsQuery = roomsQuery.eq('is_groovelab_active', true);
        }
        
        const { data: roomsData } = await roomsQuery.order('sort_order', { ascending: true });
        if (roomsData) {
          const schoolId = adminData.school_id;
          const localInstMap = (() => {
            try {
              return JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
            } catch { return {}; }
          })();
          const mappedRooms = roomsData.map(r => ({
            ...r,
            room_instruments: (Array.isArray(r.room_instruments) && r.room_instruments.length > 0) 
              ? r.room_instruments 
              : (localInstMap[r.id] || [])
          }));
          setRooms(mappedRooms);
          const favKey = `groovelab_favorite_room_id_${userId}`;
          const favoriteRoomId = localStorage.getItem(favKey);
          if (favoriteRoomId) {
            const favRoom = mappedRooms.find(r => r.id === favoriteRoomId);
            if (favRoom) {
              setSelectedCampusRoomId(favRoom.id);
            }
          }
        }

        const d = new Date(bookingDate);
        const day = d.getDay();
        const diff = d.getDate() - (day === 0 ? 6 : day - 1);
        const monday = new Date(d.setDate(diff));
        monday.setHours(0,0,0,0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23,59,59,999);

        const startDateStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
        const endDateStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;

        const weekChanged = force ||
                            !loadedWeekRangeRef.current || 
                            loadedWeekRangeRef.current.start !== startDateStr || 
                            loadedWeekRangeRef.current.end !== endDateStr;

        if (weekChanged) {
          const { data: schedulesData } = await supabase
            .from('schedules')
            .select('*, teacher:users!schedules_teacher_id_fkey(id, first_name, last_name)')
            .eq('school_id', adminData.school_id);
          setSchedules(schedulesData || []);

          // Fetch weekly recurring room blocked slots
          const { data: blockedSlotsData } = await supabase
            .from('room_blocked_slots')
            .select('*')
            .eq('school_id', adminData.school_id);
          setRoomBlockedSlots(blockedSlotsData || []);


          const { data: occursData } = await supabase
            .from('schedule_occurrences')
            .select('*')
            .eq('school_id', adminData.school_id)
            .or(`and(date.gte.${startDateStr},date.lte.${endDateStr}),and(original_date.gte.${startDateStr},date.lte.${endDateStr})`);

          // Fetch room_bookings from database for the selected week
          const { data: dbBookingsData } = await supabase
            .from('room_bookings')
            .select(`
              id,
              room_id,
              date,
              start_time,
              end_time,
              title,
              booked_by,
              status,
              profiles:users!booked_by (
                id,
                first_name,
                last_name,
                role
              )
            `)
            .eq('school_id', adminData.school_id)
            .gte('date', startDateStr)
            .lte('date', endDateStr);

          if (dbBookingsData) {
            const mapped = dbBookingsData.map((db: any) => {
              const startTimeStr = db.start_time ? db.start_time.substring(0, 5) : '00:00';
              const endTimeStr = db.end_time ? db.end_time.substring(0, 5) : '00:00';
              const isStaff = db.profiles?.role?.toLowerCase() === 'secretary' || db.profiles?.role?.toLowerCase() === 'admin';
              const creatorName = db.profiles 
                ? `${capitalizeName(db.profiles.first_name)} ${capitalizeName(db.profiles.last_name)}`.trim()
                : 'Lehrer';
              
              const teacherName = creatorName || (isStaff ? 'Schule' : 'Lehrkraft');
              const dbTitle = db.title || 'Unterricht';
              const purpose = dbTitle;

              return {
                id: db.id,
                roomId: db.room_id,
                date: db.date,
                startTime: startTimeStr,
                endTime: endTimeStr,
                purpose: purpose,
                teacherId: db.booked_by,
                teacherName: teacherName,
                isDbBooking: true,
                status: db.status
              };
            });
            setDbRoomBookings(mapped);
          } else {
            setDbRoomBookings([]);
          }

          // Map room overrides and schedules onto loaded occurrences so their room is correct
          let mappedOccurs = (occursData || []).map((occ: any) => {
            const sch = (schedulesData || []).find((s: any) => s.id === occ.schedule_id);
            return {
              ...occ,
              schedules: sch || null
            };
          });
          if (dbBookingsData && occursData) {
            mappedOccurs = mappedOccurs.map((occ: any) => {
              const booking = dbBookingsData.find(b => 
                b.date === occ.date && 
                b.start_time.substring(0, 5) === occ.start_time.substring(0, 5) &&
                b.booked_by === occ.teacher_id
              );
              if (booking) {
                return {
                  ...occ,
                  schedules: occ.schedules ? {
                    ...occ.schedules,
                    room_id: booking.room_id
                  } : {
                    room_id: booking.room_id
                  }
                };
              }
              return occ;
            });
          }
          setScheduleOccurrences(mappedOccurs);
          loadedWeekRangeRef.current = { start: startDateStr, end: endDateStr };
        }

        let { data: stationsData } = await supabase
          .from('stations')
          .select('*, rooms!inner(school_id)')
          .eq('rooms.school_id', adminData.school_id)
          .order('sort_order', { ascending: true })
          .order('name');

        if (stationsData) setStations(stationsData);
      } else if (activeTab === 'songs') {
        let sq = supabase
          .from('songs')
          .select('*')
          .eq('school_id', adminData.school_id);
        if (activePlatform === 'campus') sq = sq.eq('is_campus_active', true);
        else sq = sq.eq('is_groovelab_active', true);
        const activeWorkspace = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_active_workspace') || localStorage.getItem('groovelab_active_workspace')) : null;
        const isTeacherMode = adminData.role === 'teacher' || activeWorkspace === 'teacher';

        // REGEL: Lehrer sehen nur ihre eigenen Songs (teacher_id-Filter)
        if (isTeacherMode) sq = sq.eq('teacher_id', adminData.id);
        const { data: songsData } = await sq.order('title');
        if (songsData) setSongs(songsData);

        // REGEL: Lehrer sehen nur ihre eigenen Lehrwerke (teacher_id-Filter)
        let lwSq = supabase
          .from('lehrwerke')
          .select('*')
          .eq('school_id', adminData.school_id);
        if (isTeacherMode) lwSq = lwSq.eq('teacher_id', adminData.id);
        const { data: lehrwerkeData } = await lwSq.order('title');
        if (lehrwerkeData) {
          const mappedLw = lehrwerkeData.map((item: any) => ({
            ...item,
            totalPages: item.total_pages || 50
          }));
          setLehrwerke(mappedLw);
        }

        // Fetch students for assignments in songs/lehrwerke detail modal
        let studentsData: any[] = [];
        if (isTeacherMode) {
          studentsData = await fetchTeacherStudentsHelper(adminData.id, adminData.school_id, activePlatform);
        } else {
          let studSq = supabase.from('users').select('*').eq('school_id', adminData.school_id).eq('role', 'student');
          if (activePlatform !== 'campus') studSq = studSq.eq('is_groovelab_active', true);
          const { data } = await studSq.order('first_name');
          studentsData = data || [];
        }
        if (studentsData) setStudents(studentsData);
      } else if (activeTab === 'bands') {
        const { data: bandsData } = await supabase
          .from('bands')
          .select('*, songs(id, title, artist, instrumentation), band_members(*, users(*)), coach:users!coach_id(id, first_name, last_name, photo_url), band_songs(*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url, user_song_skills:user_song_skills!user_song_skills_user_id_fkey(id, song_id, instrument, progress_percent, is_pending_approval, is_stage_ready))))')
          .eq('school_id', adminData.school_id)
          .order('name');
        if (bandsData) {
          const filteredBands = bandsData.filter((b: any) => b.name !== '__SYSTEM_ANNOUNCEMENTS__');
          setAllBands(filteredBands); 
          if (editingBand) {
            const updated = bandsData.find((b: any) => b.id === editingBand.id);
            if (updated) {
              setEditingBand((prev: any) => {
                if (!prev) return null;
                return {
                  ...updated,
                  name: prev.name,
                  bio: prev.bio,
                  genre: prev.genre,
                  coach_id: prev.coach_id,
                  coach_is_manual: prev.coach_is_manual
                };
              });
            }
          }
        }
        // Also fetch students for the search function in band edit
        const activeWorkspace = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_active_workspace') || localStorage.getItem('groovelab_active_workspace')) : null;
        const isTeacherMode = adminData.role === 'teacher' || activeWorkspace === 'teacher';
        let bsq = supabase.from('users').select('*').eq('school_id', adminData.school_id).eq('role', 'student');
        if (activePlatform !== 'campus') bsq = bsq.eq('is_groovelab_active', true);
        if (isTeacherMode) bsq = bsq.eq('teacher_id', adminData.id);
        const { data: studentsData } = await bsq.order('first_name');
        if (studentsData) setStudents(studentsData);
        
        // Also fetch teachers for coach selection
        let coachTsq = supabase
          .from('users')
          .select('*')
          .eq('school_id', adminData.school_id)
          .in('role', ['teacher', 'admin']);
        if (activePlatform === 'campus') coachTsq = coachTsq.eq('is_campus_active', true);
        else coachTsq = coachTsq.eq('is_groovelab_active', true);
        const { data: teachersData } = await coachTsq.order('first_name');
        if (teachersData) setTeachers(teachersData);
      } else if (activeTab === 'stats') {
        fetchStats(adminData.school_id);
        let statsTsq = supabase
          .from('users')
          .select('*')
          .eq('school_id', adminData.school_id)
          .in('role', ['teacher', 'admin']);
        if (activePlatform === 'campus') statsTsq = statsTsq.eq('is_campus_active', true);
        else statsTsq = statsTsq.eq('is_groovelab_active', true);
        const { data: teachersData } = await statsTsq.order('first_name');
        if (teachersData) setTeachers(teachersData);
      } else if (activeTab === 'gallery') {
        let usq = supabase.from('users').select('*').eq('school_id', adminData.school_id);
        if (activePlatform !== 'campus') usq = usq.eq('is_groovelab_active', true);
        const { data: allUsers } = await usq.order('first_name');
        if (allUsers) {
          const activeWorkspace = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_active_workspace') || localStorage.getItem('groovelab_active_workspace')) : null;
          const isTeacherMode = adminData.role === 'teacher' || activeWorkspace === 'teacher';
          if (isTeacherMode) {
            setStudents(allUsers.filter(u => u.role === 'student' && u.teacher_id === adminData.id));
          } else {
            setStudents(allUsers.filter(u => u.role === 'student'));
          }
          setTeachers(allUsers.filter(u => u.role === 'teacher' || (Array.isArray(u.roles) && u.roles.includes('teacher'))));
        }
      } else if (activeTab === 'setup') {
        const { data: rData } = await supabase.from('rooms').select('*').eq('school_id', adminData.school_id).eq('is_groovelab_active', true).order('sort_order', { ascending: true });
        setSetupRooms(rData || []);
        const { data: sData } = await supabase.from('stations').select('*, rooms!inner(school_id)').eq('rooms.school_id', adminData.school_id).order('sort_order', { ascending: true }).order('name');
        setSetupStations(sData || []);
        
        // Fetch active sessions
        const { data: activeSessionsData } = await supabase
          .from('sessions')
          .select('*, profiles:users!inner(*), stations(*)')
          .eq('profiles.school_id', adminData.school_id)
          .is('check_out_time', null)
          .order('check_in_time', { ascending: false });
        setActiveSessions(activeSessionsData || []);
        
        // Fetch students roster for manual check-in
        let ssq = supabase.from('users').select('*').eq('school_id', adminData.school_id).eq('role', 'student');
        if (activePlatform !== 'campus') ssq = ssq.eq('is_groovelab_active', true);
        const activeWorkspace = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_active_workspace') || localStorage.getItem('groovelab_active_workspace')) : null;
        const isTeacherMode = adminData.role === 'teacher' || activeWorkspace === 'teacher';
        if (isTeacherMode) ssq = ssq.eq('teacher_id', adminData.id);
        const { data: studentsData } = await ssq.order('first_name');
        if (studentsData) setStudents(studentsData);
      } else if (activeTab === 'missions') {
        try {
          const { data: templatesData, error: tErr } = await supabase
            .from('mission_templates')
            .select('*')
            .eq('school_id', adminData.school_id);
          
          let activeTemplates = templatesData || [];

          if (activeTemplates.length === 0 && !tErr) {
            const defaultTemp = {
              school_id: adminData.school_id,
              title: 'Standard-Schuljahr',
              level_1_config: { songs_required: 1 },
              level_2_config: { streak_required: 7, focus_minutes_required: 15 },
              level_3_config: { songs_required: 3 },
              level_4_config: { songs_required: 5 },
              level_5_config: { songs_required: 8 },
              level_6_config: { songs_required: 12 },
              is_default: true
            };
            const { data: inserted } = await supabase.from('mission_templates').insert([defaultTemp]).select();
            if (inserted) activeTemplates = inserted;
          }
          setMissionTemplates(activeTemplates);

          const { data: studentMissionsData } = await supabase
            .from('student_missions')
            .select('*, mission_templates(*)');
          
          const mapping: Record<string, any> = {};
          (studentMissionsData || []).forEach((m: any) => {
            mapping[m.student_id] = m;
          });
          setStudentMissionsMap(mapping);
        } catch (err) {
          console.warn('Failed to load mission templates or progress:', err);
        }

        let studentsData: any[] = [];
        const activeWorkspace = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_active_workspace') || localStorage.getItem('groovelab_active_workspace')) : null;
        const isTeacherMode = adminData.role === 'teacher' || activeWorkspace === 'teacher';
        if (isTeacherMode) {
          studentsData = await fetchTeacherStudentsHelper(adminData.id, adminData.school_id, activePlatform);
        } else {
          let ssq = supabase.from('users').select('*').eq('school_id', adminData.school_id).eq('role', 'student');
          if (activePlatform !== 'campus') ssq = ssq.eq('is_groovelab_active', true);
          const { data } = await ssq.order('first_name');
          studentsData = data || [];
        }
        if (studentsData) setStudents(studentsData);

        let query = supabase.from('user_song_skills').select('*, users!user_id(*), songs(*)');
        if (missionFilter === 'pending') {
          query = query.eq('is_pending_approval', true);
        } else if (missionFilter === 'approved') {
          query = query.eq('is_stage_ready', true).eq('is_pending_approval', false);
        }
        const { data: subData } = await query;
        
        const filteredSubs = (subData || []).filter((s: any) => {
          const u = Array.isArray(s.users) ? s.users[0] : s.users;
          const matchesSchool = u?.school_id === adminData.school_id;
          const matchesTeacher = !isTeacherMode || u?.teacher_id === adminData.id;
          return matchesSchool && matchesTeacher;
        });

        const mappedSubs = filteredSubs.map((s: any) => ({
          ...s,
          users: Array.isArray(s.users) ? s.users[0] : s.users,
          songs: Array.isArray(s.songs) ? s.songs[0] : s.songs
        }));
        
        setSubmissions(mappedSubs);

        const { data: activeSessionsData } = await supabase
          .from('sessions')
          .select('*, profiles:users!inner(*), stations(*)')
          .eq('profiles.school_id', adminData.school_id)
          .is('check_out_time', null);
        setActiveSessions(activeSessionsData || []);
      }
    }
  };

  useEffect(() => {
    if (!admin?.school_id) return;
    
    const channel = supabase
      .channel(`admin_lab_updates_${admin.school_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `school_id=eq.${admin.school_id}` }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fokus_logs', filter: `school_id=eq.${admin.school_id}` }, () => {
        fetchData();
      })
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [admin?.school_id]);

  useEffect(() => {
    if (!admin?.school_id || kiosks === null) return;

    const activeRooms = rooms.length > 0 ? rooms : setupRooms;
    const activeStations = stations.length > 0 ? stations : setupStations;

    if (activeRooms.length === 0) return;

    const missingKiosks: any[] = [];

    activeRooms.forEach(r => {
      const exists = kiosks.some(k => k.room_id === r.id && !k.station_id);
      if (!exists) {
        missingKiosks.push({
          school_id: admin.school_id,
          name: r.name || 'Raum Kiosk',
          room_id: r.id,
          station_id: null
        });
      }
    });

    activeStations.forEach(s => {
      const exists = kiosks.some(k => k.station_id === s.id);
      if (!exists) {
        missingKiosks.push({
          school_id: admin.school_id,
          name: s.name || 'iPad Kiosk',
          room_id: s.room_id,
          station_id: s.id
        });
      }
    });

    if (missingKiosks.length > 0) {
      const insertKiosks = async () => {
        const { error } = await supabase.from('kiosks').insert(missingKiosks);
        if (!error) {
          const { data: kiosksData } = await supabase
            .from('kiosks')
            .select('*')
            .eq('school_id', admin.school_id);
          setKiosks(kiosksData || []);
        } else {
          console.error('Error auto-creating kiosks:', error);
        }
      };
      insertKiosks();
    }
  }, [admin?.school_id, rooms, setupRooms, stations, setupStations, kiosks]);

  const fetchStats = async (schoolId: string, customOpeningHours?: any) => {
    // Calculate required date ranges upfront to avoid querying historical records
    const openingHours = customOpeningHours || schoolObj?.opening_hours;
    const resetDateStr = activePlatform === 'campus'
      ? (openingHours?.campus_stats_reset_at || openingHours?.stats_reset_at)
      : (openingHours?.groovelab_stats_reset_at || openingHours?.stats_reset_at);
    const resetDate = resetDateStr ? new Date(resetDateStr) : null;

    const now = getSimulatedNow();
    const currentMonth = now.getMonth();
    const startYear = currentMonth >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    const annualStartDate = new Date(startYear, 8, 1, 0, 0, 0, 0);

    const queryStartDate = resetDate ? (resetDate > annualStartDate ? resetDate : annualStartDate) : annualStartDate;
    const sessionStartDate = new Date(queryStartDate.getTime() - 24 * 60 * 60 * 1000); // 1 day buffer for session overlap

    let schoolStudents: any[] = [];
    const activeWorkspace = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_active_workspace') || localStorage.getItem('groovelab_active_workspace')) : null;
    const isTeacherMode = admin?.role === 'teacher' || activeWorkspace === 'teacher' || userId === 'teacher';
    
    let allSchoolStudentIds: string[] = [];

    if (isTeacherMode && admin?.id) {
      const [teacherStudentsList, allSchoolUsersRes] = await Promise.all([
        fetchTeacherStudentsHelper(admin.id, schoolId, activePlatform),
        supabase.from('users').select('id, first_name, last_name, photo_url, teacher_id').eq('school_id', schoolId).eq('role', 'student')
      ]);
      schoolStudents = teacherStudentsList || [];
      const allSchoolUsers = allSchoolUsersRes.data || [];
      allSchoolStudentIds = Array.from(new Set([...schoolStudents.map((s: any) => s.id), ...allSchoolUsers.map((u: any) => u.id)]));
    } else {
      let studentListSq = supabase.from('users').select('id, first_name, last_name, photo_url, teacher_id').eq('school_id', schoolId).eq('role', 'student');
      if (activePlatform !== 'campus') studentListSq = studentListSq.eq('is_groovelab_active', true);
      const { data } = await studentListSq;
      schoolStudents = data || [];
      allSchoolStudentIds = (schoolStudents || []).map((s: any) => s.id);
    }

    let statsSongsSq = supabase.from('songs').select('level').eq('school_id', schoolId);
    if (activePlatform === 'campus') statsSongsSq = statsSongsSq.eq('is_campus_active', true);
    else statsSongsSq = statsSongsSq.eq('is_groovelab_active', true);

    const { data: songsData } = await statsSongsSq;

    const studentCount = schoolStudents?.length || 0;
    const songCount = songsData?.length || 0;

    if (schoolStudents) {
      setStudents(schoolStudents);
    }

    const studentIds = (schoolStudents || []).map((s: any) => s.id);
    const queryStudentIds = allSchoolStudentIds.length > 0 ? allSchoolStudentIds : studentIds;
    let sessions: any[] = [];
    let focusLogs: any[] = [];
    let skills: any[] = [];

    if (queryStudentIds.length > 0) {
      // Fetch sessions, focus logs, and skills filtered by active students and date range
      const sessionsSq = supabase
        .from('sessions')
        .select('check_in_time, check_out_time, station_id, user_id')
        .in('user_id', queryStudentIds)
        .not('check_out_time', 'is', null)
        .gte('check_in_time', sessionStartDate.toISOString());

      const focusLogsSq = supabase
        .from('fokus_logs')
        .select('user_id, duration_minutes, duration_seconds, created_at')
        .in('user_id', queryStudentIds)
        .gte('created_at', queryStartDate.toISOString());

      let skillsSq = supabase
        .from('user_song_skills')
        .select('user_id, progress_percent, instrument, is_stage_ready, last_practiced_at, created_at, songs!inner(title, artist, is_campus_active, is_groovelab_active)')
        .in('user_id', queryStudentIds);

      if (activePlatform === 'campus') {
        skillsSq = skillsSq.eq('songs.is_campus_active', true);
      } else {
        skillsSq = skillsSq.eq('songs.is_groovelab_active', true);
      }

      const [
        { data: sessionsData },
        { data: focusLogsData },
        { data: skillsData }
      ] = await Promise.all([
        sessionsSq,
        focusLogsSq,
        skillsSq
      ]);

      let mergedFocusLogs = [...(focusLogsData || [])];
      try {
        (schoolStudents || []).forEach((st: any) => {
          const localLogsKey = `cg_local_fokus_logs_${st.id}`;
          const localLogsStr = typeof window !== 'undefined' ? localStorage.getItem(localLogsKey) : null;
          if (localLogsStr) {
            const parsed = JSON.parse(localLogsStr);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const remoteIds = new Set(mergedFocusLogs.map((l: any) => l.id));
              const missing = parsed.filter((l: any) => !remoteIds.has(l.id));
              mergedFocusLogs = [...missing, ...mergedFocusLogs];
            }
          }
        });
      } catch (e) {}

      sessions = sessionsData || [];
      focusLogs = mergedFocusLogs;
      skills = skillsData || [];
    }

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    let totalMins = 0;
    let labMins = 0;
    let homeMins = 0;
    
    const filteredFocusLogs = (focusLogs || []).filter((log: any) => {
      const logDate = new Date(log.created_at);
      if (resetDate && logDate < resetDate) return false;
      return true;
    });

    filteredFocusLogs.forEach((log: any) => {
      const mins = log.duration_minutes || (log.duration_seconds ? Math.round(log.duration_seconds / 60) : 0);
      totalMins += mins;

      // Classify as lab mins if there was an active school station check-in around this focus log
      const logTime = new Date(log.created_at).getTime();
      const isAtStation = (sessions || []).some((s: any) => {
        if (s.user_id !== log.user_id || !s.station_id) return false;
        const start = new Date(s.check_in_time).getTime();
        const end = s.check_out_time ? new Date(s.check_out_time).getTime() : Date.now();
        // 15 minutes tolerance on either side
        return logTime >= start - 900000 && logTime <= end + 900000;
      });

      if (isAtStation) {
        labMins += mins;
      } else {
        homeMins += mins;
      }
    });

    // Mastered challenges count per instrument
    const stageReadyPerInst = { guitar: 0, keys: 0, drums: 0, bass: 0, vocals: 0 };
    skills?.forEach((s: any) => {
      if (s.is_stage_ready) {
        const inst = (s.instrument || '').toLowerCase().trim();
        if (inst === 'guitar' || inst === 'e-gitarre' || inst === 'gitarre') stageReadyPerInst.guitar++;
        else if (inst === 'keys' || inst === 'piano' || inst === 'e-piano' || inst === 'piano / keys') stageReadyPerInst.keys++;
        else if (inst === 'drums' || inst === 'e-drums' || inst === 'schlagzeug') stageReadyPerInst.drums++;
        else if (inst === 'bass' || inst === 'e-bass') stageReadyPerInst.bass++;
        else if (inst === 'vocals' || inst === 'gesang' || inst.includes('vocal')) stageReadyPerInst.vocals++;
      }
    });

    // Top Songs: count unique students practicing each song
    const songUniqueUsers: Record<string, Set<string>> = {};
    skills?.forEach((s: any) => {
      const title = s.songs?.title;
      const artist = s.songs?.artist;
      const userId = s.user_id;
      if (title && userId) {
        const key = `${title} - ${artist}`;
        if (!songUniqueUsers[key]) {
          songUniqueUsers[key] = new Set();
        }
        songUniqueUsers[key].add(userId);
      }
    });
    const topSongs = Object.entries(songUniqueUsers)
      .map(([name, userSet]) => ({ name, count: userSet.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Compute Leaderboard in memory from the fetched students and skills lists
    const leaderboard = (schoolStudents || []).map((student: any) => {
      const xp = (skills || [])
        .filter((s: any) => s.user_id === student.id && (s.progress_percent === 100 || s.is_stage_ready))
        .length * 100;
      return {
        id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        photo_url: student.photo_url,
        avatar_url: student.avatar_url,
        instrument: student.instrument,
        xp
      };
    })
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 5);

    const levelDist = { level1: 0, level2: 0, level3: 0 };
    songsData?.forEach(s => {
      if (s.level === 1) levelDist.level1++;
      if (s.level === 2) levelDist.level2++;
      if (s.level === 3) levelDist.level3++;
    });

    const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const weekdayData = days.map((day, idx) => {
      const mins = filteredFocusLogs
        .filter((log: any) => new Date(log.created_at).getDay() === idx)
        .reduce((acc: number, log: any) => acc + (log.duration_minutes || 0), 0);
      return { day, mins: Math.round(mins / 60) };
    });

    // Cooperative and Highlights calculations for Campus platform
    let myClassMins = 0;
    let otherClassMins = 0;
    const myStudents = isTeacherMode 
      ? (schoolStudents || []) 
      : (schoolStudents || []).filter((s: any) => s.teacher_id === userId);
    const myStudentIds = new Set(myStudents.map((s: any) => s.id));

    filteredFocusLogs.forEach((log: any) => {
      const mins = log.duration_minutes || (log.duration_seconds ? Math.round(log.duration_seconds / 60) : 0);
      if (myStudentIds.has(log.user_id)) {
        myClassMins += mins;
      } else {
        otherClassMins += mins;
      }
    });

    // Map focus logs & skills for highlights
    const studentFocusLogsMap: Record<string, any[]> = {};
    (focusLogs || []).forEach((log: any) => {
      const uId = log.user_id;
      if (uId) {
        if (!studentFocusLogsMap[uId]) studentFocusLogsMap[uId] = [];
        studentFocusLogsMap[uId].push(log);
      }
    });

    const studentSkillsMap: Record<string, any[]> = {};
    (skills || []).forEach((sk: any) => {
      const uId = sk.user_id;
      if (uId) {
        if (!studentSkillsMap[uId]) studentSkillsMap[uId] = [];
        studentSkillsMap[uId].push(sk);
      }
    });

    // Calculate highlights (Helden-Momente) - Current Calendar Month with getSimulatedNow()
    let classWeeklyMins = 0;
    const highlights: any[] = [];
    const simNow = getSimulatedNow();
    const highlightMonth = simNow.getMonth();
    const highlightYear = simNow.getFullYear();
    const startOfCurrentMonth = new Date(highlightYear, highlightMonth, 1, 0, 0, 0, 0);

    const startOfWeek = new Date(simNow);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    myStudents.forEach((student: any) => {
      const studentLogs = studentFocusLogsMap[student.id] || [];
      const studentSkills = studentSkillsMap[student.id] || [];

      // Calculate recent focus minutes (this week)
      const weeklyLogs = studentLogs.filter((log: any) => {
        if (!log.created_at) return false;
        const logDate = new Date(log.created_at);
        return logDate >= startOfWeek && logDate <= simNow;
      });
      const recentMins = weeklyLogs.reduce((sum: number, log: any) => {
        return sum + (log.duration_minutes || (log.duration_seconds ? Math.round(log.duration_seconds / 60) : 0));
      }, 0);
      classWeeklyMins += recentMins;

      // Filter focus logs for current month
      const monthlyLogs = studentLogs.filter((log: any) => {
        if (!log.created_at) return false;
        const logDate = new Date(log.created_at);
        return logDate >= startOfCurrentMonth && logDate <= simNow;
      });
      const monthlyMins = monthlyLogs.reduce((sum: number, log: any) => {
        return sum + (log.duration_minutes || (log.duration_seconds ? Math.round(log.duration_seconds / 60) : 0));
      }, 0);

      // Monthly Streak (weeks with practice in current month)
      const monthlyWeeks = new Set();
      monthlyLogs.forEach((log: any) => {
        const d = new Date(log.created_at);
        const year = d.getFullYear();
        const firstDayOfYear = new Date(year, 0, 1);
        const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
        const week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        monthlyWeeks.add(`${year}-${week}`);
      });
      const monthlyStreak = monthlyWeeks.size;

      // Mastered songs this month
      const masteredThisMonth = studentSkills.filter((sk: any) => {
        const isMastered = sk.progress_percent === 100 || sk.is_stage_ready;
        if (!isMastered) return false;
        const date = sk.last_practiced_at ? new Date(sk.last_practiced_at) : (sk.created_at ? new Date(sk.created_at) : null);
        return date && date >= startOfCurrentMonth && date <= simNow;
      });

      // Add highlights
      if (monthlyStreak >= 2) {
        highlights.push({
          studentId: student.id,
          studentName: `${student.first_name} ${maskLastName(student.last_name, showRealNames)}`.trim(),
          type: 'streak',
          value: `${monthlyStreak} Wochen`,
          emoji: '🔥',
          title: 'Monats-Konstanz',
          text: `Hat in ${monthlyStreak} verschiedenen Wochen diesen Monats geübt!`
        });
      }
      if (monthlyMins >= 120) {
        highlights.push({
          studentId: student.id,
          studentName: `${student.first_name} ${maskLastName(student.last_name, showRealNames)}`.trim(),
          type: 'focus',
          value: `${monthlyMins} Min.`,
          emoji: '⚡',
          title: 'Monats-Fokus',
          text: `Hat diesen Monat bereits ${monthlyMins} Minuten trainiert!`
        });
      }
      masteredThisMonth.forEach((sk: any) => {
        highlights.push({
          studentId: student.id,
          studentName: `${student.first_name} ${maskLastName(student.last_name, showRealNames)}`.trim(),
          type: 'song',
          value: sk.songs?.title || 'Song',
          emoji: '🏆',
          title: 'Meilenstein',
          text: `Hat heute den Song "${sk.songs?.title || 'Song'}" gemeistert!`
        });
      });
    });

    const rawTargets = openingHours?.weekly_targets?.[userId] || openingHours?.weekly_targets?.default;
    let weeklyTargets: any[] = [];
    if (Array.isArray(rawTargets) && rawTargets.length > 0) {
      weeklyTargets = rawTargets;
    } else if (typeof rawTargets === 'number') {
      weeklyTargets = [{ id: 'default', title: 'Klassen-Monats-Quest', minutes: rawTargets, deadline: '' }];
    } else {
      weeklyTargets = [{ id: 'default', title: 'Klassen-Monats-Quest', minutes: 100, deadline: '' }];
    }

    setStats({
      studentCount,
      songCount,
      totalMins,
      labMins,
      homeMins,
      levelDist,
      weekdayData,
      stageReadyPerInst,
      topSongs,
      leaderboard,
      resetDateStr,
      myClassMins,
      otherClassMins,
      myClassCount: myStudents.length,
      classWeeklyMins,
      weeklyTargets,
      highlights,
      focusLogs: focusLogs || []
    });
  };

  const handleSaveTargets = async (updatedTargets: any[]) => {
    if (!admin?.school_id) return;

    // 1. Update stats state immediately
    if (stats) {
      setStats({
        ...stats,
        weeklyTargets: updatedTargets
      });
    }

    const currentHours = schoolObj?.opening_hours || {};
    const updatedHours = {
      ...currentHours,
      weekly_targets: {
        ...(currentHours.weekly_targets || {}),
        [userId]: updatedTargets
      }
    };

    // 2. Update admin state immediately
    setAdmin({
      ...admin,
      schools: Array.isArray(admin.schools)
        ? [
            {
              ...admin.schools[0],
              opening_hours: updatedHours
            }
          ]
        : {
            ...admin.schools,
            opening_hours: updatedHours
          }
    });
    setIsEditingTarget(false);

    // 3. Save to DB in background without blocking UI
    supabase
      .from('schools')
      .update({ opening_hours: updatedHours })
      .eq('id', admin.school_id)
      .then(({ error }) => {
        if (error) {
          alert("Fehler beim Speichern in der Datenbank: " + error.message);
        }
      });
  };

  const handleAddGoal = async () => {
    const currentTargets = stats?.weeklyTargets || [];
    const newGoal = {
      id: Date.now().toString(),
      title: newGoalTitle,
      minutes: parseInt(newGoalMinutes, 10) || 300,
      deadline: newGoalDeadline
    };
    const updated = [...currentTargets, newGoal];
    await handleSaveTargets(updated);
    setNewGoalTitle('Klassen-Rockstar-Challenge');
    setNewGoalMinutes('300');
    setNewGoalDeadline('');
    setShowAddGoalForm(false);
  };

  const handleDeleteGoal = async (goalId: string) => {
    const currentTargets = stats?.weeklyTargets || [];
    const updated = currentTargets.filter((g: any) => g.id !== goalId);
    await handleSaveTargets(updated);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin?.school_id) return;

    // DSGVO Art. 28 Compliance: AVV Contract MUST be signed before inserting personal data
    const isAvvSigned = Boolean(
      schoolObj?.avv_signed_at || 
      (typeof window !== 'undefined' && localStorage.getItem(`groovelab_avv_signed_${admin?.school_id}`))
    );
    if (!isAvvSigned) {
      alert('DSGVO-Compliance: Vor dem Anlegen von Schülerdaten muss der gesetzliche Auftragsverarbeitungsvertrag (AVV gem. Art. 28 DSGVO) einmalig durch die Schulleitung digital gezeichnet werden.');
      setShowAVVModal(true);
      return;
    }
    
    // Check limits if enabled
    if (schoolObj?.limits_enabled) {
      const maxStudents = schoolObj.max_students ?? 6;
      if (students.length >= maxStudents) {
        alert(`Limit erreicht! Deine Schule darf maximal ${maxStudents} Schüler registrieren. Kontaktiere deinen Master-Admin.`);
        return;
      }
    }

    const qrToken = crypto.randomUUID();
    const studentInstrument = newStudent.isExternalVocalist ? 'Vocals' : (newStudent.instrument || 'Gitarre');
    const studentAvatarUrl = getInstrumentAvatarUrl(studentInstrument);

    const hasCampus = schoolObj?.has_campus_subscription !== false;
    const finalLastName = hasCampus ? newStudent.lastName : (newStudent.lastName?.trim() ? newStudent.lastName.trim().charAt(0).toUpperCase() + '.' : '');

    const isSchoolAutoActivateAll = schoolObj?.student_billing_option === 'option3_3' || schoolObj?.student_billing_option === 'all_inclusive';

    const { data, error } = await supabase.from('users').insert({
      school_id: admin.school_id, 
      role: 'student',
      roles: ['student'],
      first_name: newStudent.firstName, 
      last_name: finalLastName, 
      birth_date: null,
      photo_url: newStudent.photoUrl || '/avatar_ghost.jpg',
      avatar_url: studentAvatarUrl,
      qr_token: qrToken,
      is_external_vocalist: newStudent.isExternalVocalist,
      instrument: studentInstrument,
      is_campus_active: isSchoolAutoActivateAll,
      is_groovelab_active: isSchoolAutoActivateAll,
      app_usage_mode: newStudent.app_usage_mode || 'student_only'
    }).select().single();
    
    if (error) alert('Fehler: ' + error.message);
    else if (data) { 
      // Also automatically create/sync their avatars record
      await supabase.from('avatars').upsert({
        user_id: data.id,
        avatar_style: 'Premium_Hero',
        instrument_type: getInstrumentTypeKey(studentInstrument),
        evolution_level: 1,
        xp: 0,
        asset_path: studentAvatarUrl,
        streak_flame: 0
      });

      setStudents([...students, data]); 
      setShowAddStudent(false); 
      setNewStudent({ firstName: '', lastName: '', birthDate: '', photoUrl: '/avatar_ghost.jpg', isExternalVocalist: false, instrument: 'Gitarre', app_usage_mode: 'student_only' }); 
      window.dispatchEvent(new CustomEvent('students_updated'));
      window.dispatchEvent(new CustomEvent('campus_students_updated'));
      window.dispatchEvent(new CustomEvent('groovelab_students_updated'));
    }
  };

  const parseBulkInput = (text: string, currentInstrument: string) => {
    if (!text.trim()) {
      setParsedStudents([]);
      return;
    }
    const lines = text.split('\n');
    const studentsList = lines
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        const parts = line.split(' ');
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ') || '';
        return {
          firstName,
          lastName,
          instrument: currentInstrument
        };
      });
    setParsedStudents(studentsList);
  };

  const handleBulkAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin?.school_id || parsedStudents.length === 0) return;
    setIsBulkSaving(true);

    // Check limits - BYPASSED (Limits strictly removed)

    const hasCampus = schoolObj?.has_campus_subscription !== false;
    const isSchoolAutoActivateAll = schoolObj?.student_billing_option === 'option3_3' || schoolObj?.student_billing_option === 'all_inclusive';
    const studentsToInsert = parsedStudents.map(student => {
      const qrToken = crypto.randomUUID();
      const isVocalist = student.instrument === 'Gesang';
      const studentInstrument = isVocalist ? 'Vocals' : student.instrument;
      const studentAvatarUrl = getInstrumentAvatarUrl(studentInstrument);
      const finalLastName = hasCampus ? student.lastName : (student.lastName?.trim() ? student.lastName.trim().charAt(0).toUpperCase() + '.' : '');
      
      return {
        school_id: admin.school_id, 
        role: 'student', 
        roles: ['student'],
        first_name: student.firstName, 
        last_name: finalLastName, 
        birth_date: null,
        photo_url: '/avatar_ghost.jpg',
        avatar_url: studentAvatarUrl,
        qr_token: qrToken,
        is_external_vocalist: isVocalist,
        instrument: studentInstrument,
        is_campus_active: isSchoolAutoActivateAll,
        is_groovelab_active: isSchoolAutoActivateAll,
        app_usage_mode: 'student_only'
      };
    });

    try {
      const { data, error } = await supabase.from('users').insert(studentsToInsert).select();
      
      if (error) {
        alert('Fehler beim Anlegen: ' + error.message);
      } else if (data && data.length > 0) {
        const avatarsToInsert = data.map(dbStudent => {
          const studentInstrument = dbStudent.instrument || 'Gitarre';
          const studentAvatarUrl = getInstrumentAvatarUrl(studentInstrument);
          return {
            user_id: dbStudent.id,
            avatar_style: 'Premium_Hero',
            instrument_type: getInstrumentTypeKey(studentInstrument),
            evolution_level: 1,
            xp: 0,
            asset_path: studentAvatarUrl,
            streak_flame: 0
          };
        });
        
        await supabase.from('avatars').upsert(avatarsToInsert);
        
        setStudents([...students, ...data]);
        setShowBulkAddStudents(false);
        setBulkInput('');
        setParsedStudents([]);
        window.dispatchEvent(new CustomEvent('students_updated'));
        window.dispatchEvent(new CustomEvent('campus_students_updated'));
        window.dispatchEvent(new CustomEvent('groovelab_students_updated'));
      }
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    } finally {
      setIsBulkSaving(false);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    const studentInstrument = editingStudent.instrument || 'Gitarre';
    const studentAvatarUrl = getInstrumentAvatarUrl(studentInstrument);

    const hasCampus = schoolObj?.has_campus_subscription !== false;
    const finalLastName = hasCampus ? editingStudent.last_name : (editingStudent.last_name?.trim() ? editingStudent.last_name.trim().charAt(0).toUpperCase() + '.' : '');

    const { error } = await supabase.from('users').update({
      first_name: editingStudent.first_name,
      last_name: finalLastName,
      birth_date: null,
      status: editingStudent.status || 'active',
      is_trial: editingStudent.is_trial || false,
      trial_ends_at: editingStudent.trial_ends_at || null,
      contract_ends_at: editingStudent.contract_ends_at || null,
      instrument: studentInstrument,
      avatar_url: studentAvatarUrl,
      app_usage_mode: editingStudent.app_usage_mode || 'student_only'
    }).eq('id', editingStudent.id);
    
    if (error) alert('Fehler: ' + error.message);
    else {
      // Keep their avatars record in sync too
      await supabase.from('avatars').upsert({
        user_id: editingStudent.id,
        avatar_style: 'Premium_Hero',
        instrument_type: getInstrumentTypeKey(studentInstrument),
        evolution_level: 1,
        asset_path: studentAvatarUrl
      });

      setStudents(students.map(s => s.id === editingStudent.id ? {
        ...editingStudent,
        avatar_url: studentAvatarUrl
      } : s));
      setEditingStudent(null);
      window.dispatchEvent(new CustomEvent('students_updated'));
      window.dispatchEvent(new CustomEvent('campus_students_updated'));
      window.dispatchEvent(new CustomEvent('groovelab_students_updated'));
    }
  };

  const handleDeleteStudent = (id: string) => {
    const studentToDelete = students.find(s => s.id === id);
    if (!studentToDelete) return;

    const teacher = teachers.find(t => t.id === studentToDelete.teacher_id);
    const teacherName = teacher ? formatTeacherFullName(teacher) : undefined;
    const studentName = `${studentToDelete.first_name || ''} ${studentToDelete.last_name || ''}`.trim() || 'Schüler';

    setDeleteStudentModalData({
      id: studentToDelete.id,
      name: studentName,
      instrument: studentToDelete.instrument,
      teacherName,
      isCampusActive: studentToDelete.is_campus_active,
      isGroovelabActive: studentToDelete.is_groovelab_active
    });
  };

  const handleCleanupPlanning = async () => {
    if (!window.confirm('Möchtest du verwaiste Einträge im Wochenplan bereinigen? (Einträge von gelöschten Schülern werden entfernt)')) return;
    
    try {
      // 1. Hole alle Planungs-Einträge
      const { data: planning } = await supabase.from('lab_planning').select('id, user_id').eq('school_id', admin.school_id);
      // 2. Hole alle aktuellen Schüler/Lehrer
      const { data: currentUsers } = await supabase.from('users').select('id').eq('school_id', admin.school_id);
      
      if (!planning || !currentUsers) return;
      
      const userIds = new Set(currentUsers.map(u => u.id));
      const orphaned = planning.filter(p => !userIds.has(p.user_id));
      
      if (orphaned.length === 0) {
        alert('Keine verwaisten Einträge gefunden. Deine Datenbank ist sauber! ✨');
        return;
      }
      
      const { error } = await supabase.from('lab_planning').delete().in('id', orphaned.map(o => o.id));
      if (error) throw error;
      
      alert(`${orphaned.length} verwaiste Einträge erfolgreich entfernt! ✅`);
      fetchData();
    } catch (err: any) {
      alert('Fehler bei der Bereinigung: ' + err.message);
    }
  };

  const handleResetAllPlanning = async () => {
    if (!admin?.school_id) return;
    if (!window.confirm("Bist du sicher? Dies löscht alle aktuellen Planungen für die gesamte Akademie!")) return;
    const { error } = await supabase.from('lab_planning').delete().eq('school_id', admin.school_id);
    if (error) alert("Fehler beim Zurücksetzen: " + error.message);
    else fetchData();
  };

  const handleCreateBandManually = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBand.name || !admin?.school_id) return;

    // 1. Create Band
    const { data: band, error: bErr } = await supabase.from('bands').insert({
      name: newBand.name,
      coach_id: newBand.coach_id || userId,
      school_id: admin.school_id,
      status: 'active',
      photo_url: newBand.photo_url || null
    }).select().single();

    if (bErr || !band) {
      alert("Fehler beim Erstellen der Band: " + bErr?.message);
      return;
    }

    // 2. Add Song (if selected)
    if (newBand.song_id) {
       const { data: bs, error: bsErr } = await supabase.from('band_songs').insert({
         band_id: band.id,
         song_id: newBand.song_id,
         status: 'ready'
       }).select().single();
       
       if (bs) {
          // Add Slots for members
          for (const m of selectedMembers) {
             await supabase.from('band_song_slots').insert({
               band_song_id: bs.id,
               user_id: m.user_id,
               instrument: m.instrument,
               status: 'joined'
             });
          }
       } else {
          console.error("Fehler beim Verknüpfen des Songs:", bsErr);
       }
    }

    // 3. Add Members
    // First, the coach
    const coachInsertData: any = { 
      band_id: band.id, 
      user_id: newBand.coach_id || userId, 
      role: 'coach',
      instrument: 'Coach'
    };
    await supabase.from('band_members').insert(coachInsertData);
    
    for (const m of selectedMembers) {
       const memberInsertData: any = {
         band_id: band.id,
         user_id: m.user_id,
         role: 'member',
         instrument: m.instrument
       };
       await supabase.from('band_members').insert(memberInsertData);
    }

    setShowAddBand(false);
    setNewBand({ name: '', song_id: '', coach_id: userId, photo_url: '' });
    setSelectedMembers([]);
    fetchData();
  };
  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin?.school_id) return;

    // DSGVO Art. 28 Compliance: AVV Contract MUST be signed before inserting teacher data
    const isAvvSigned = Boolean(
      schoolObj?.avv_signed_at || 
      (typeof window !== 'undefined' && localStorage.getItem(`groovelab_avv_signed_${admin?.school_id}`))
    );
    if (!isAvvSigned) {
      alert('DSGVO-Compliance: Vor dem Anlegen von Lehrkräften muss der gesetzliche Auftragsverarbeitungsvertrag (AVV gem. Art. 28 DSGVO) einmalig durch die Schulleitung digital gezeichnet werden.');
      setShowAVVModal(true);
      return;
    }

    // Check limits if enabled
    if (schoolObj?.limits_enabled) {
      const maxTeachers = schoolObj.max_teachers ?? 2;
      if (teachers.length >= maxTeachers) {
        alert(`Limit erreicht! Deine Schule darf maximal ${maxTeachers} Lehrer/Admins registrieren. Kontaktiere deinen Master-Admin.`);
        return;
      }
    }

    const isAdmOrSec = newTeacher.isAdmin;
    const targetRole = newTeacher.isAdmin ? 'admin' : 'teacher';
    const { data, error } = await supabase.from('users').insert({
      school_id: admin.school_id, 
      role: targetRole, 
      roles: [targetRole],
      first_name: newTeacher.firstName, 
      last_name: newTeacher.lastName, 
      instrument: newTeacher.instrument || '',
      photo_url: isAdmOrSec ? '/campus_login_hero.png' : newTeacher.photoUrl,
      employment_type: newTeacher.employment_type || 'employed',
      qr_token: crypto.randomUUID()
    }).select().single();
    if (error) alert('Fehler: ' + error.message);
    else if (data) { setTeachers([...teachers, data]); setShowAddTeacher(false); setNewTeacher({ firstName: '', lastName: '', isAdmin: false, instrument: '', photoUrl: '', employment_type: 'employed' }); }
  };

  const handleDeleteTeacher = async (id: string) => {
    if (id === userId) return alert('Du kannst dich nicht selbst löschen!');
    if (window.confirm('Möchtest du diesen Lehrer wirklich löschen?')) {
      try {
        // Cleanup related data
        await supabase.from('bands').update({ coach_id: null }).eq('coach_id', id);
        await supabase.from('sessions').delete().eq('user_id', id);
        await supabase.from('band_members').delete().eq('user_id', id);
        await supabase.from('user_song_skills').delete().eq('user_id', id);
        await supabase.from('user_song_skills').update({ verified_by_id: null }).eq('verified_by_id', id);
        await supabase.from('band_songs').update({ suggested_by: null }).eq('suggested_by', id);
        await supabase.from('lab_planning').delete().eq('user_id', id);
        await supabase.from('band_shoutbox').delete().eq('user_id', id);
        await supabase.from('band_song_slots').delete().eq('user_id', id);
        await supabase.from('help_requests').delete().eq('user_id', id);
        await deleteUserStorageAssets([id]);
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw error;
        
        setTeachers(teachers.filter(t => t.id !== id));
      } catch (err: any) {
        alert('Fehler beim Löschen: ' + err.message);
      }
    }
  };

  const handleToggleObserver = async (t: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const newValue = !t.is_observer;
    // Optimistic update
    setTeachers((prev: any[]) => prev.map(x => x.id === t.id ? { ...x, is_observer: newValue } : x));
    const { error } = await supabase.from('users').update({ is_observer: newValue }).eq('id', t.id);
    if (error) {
      // Rollback on failure
      setTeachers((prev: any[]) => prev.map(x => x.id === t.id ? { ...x, is_observer: !newValue } : x));
      alert('Fehler beim Speichern: ' + error.message);
    }
  };

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    const isAdmOrSec = editingTeacher.role === 'admin' || editingTeacher.role === 'secretary';
    const { error } = await supabase.from('users').update({
      first_name: editingTeacher.first_name,
      last_name: editingTeacher.last_name,
      role: editingTeacher.role,
      groovelab_instrument: editingTeacher.groovelab_instrument,
      photo_url: isAdmOrSec ? '/campus_login_hero.png' : editingTeacher.photo_url,
      bio: editingTeacher.bio,
      expertise: editingTeacher.expertise,
      bands: editingTeacher.bands,
      employment_type: editingTeacher.employment_type || 'employed'
    }).eq('id', editingTeacher.id);
    
    if (error) alert('Fehler: ' + error.message);
    else {
      setTeachers(teachers.map(t => t.id === editingTeacher.id ? editingTeacher : t));
      setEditingTeacher(null);
      alert('Lehrer-Profil erfolgreich aktualisiert! ✅');
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin?.school_id) return;
    
    const { data: roomData, error: roomError } = await supabase.from('rooms').insert({
      school_id: admin.school_id, 
      name: newRoomName,
      latitude: newRoomLocation?.lat,
      longitude: newRoomLocation?.lng,
      sort_order: rooms.length,
      is_campus_active: true,
      is_groovelab_active: true
    }).select().single();
    
    if (roomError) {
      alert('Fehler beim Raum anlegen: ' + roomError.message);
      return;
    }

    if (roomData) { 
      const stationsToInsert = [];
      
      // Always add Teacher iPad
      stationsToInsert.push({
        room_id: roomData.id,
        name: 'Lehrer iPad',
        color: '#34a853',
        instrument: 'Tablet',
        pos_x: 50,
        pos_y: 50
      });

      if (newRoomStationCount > 0) {
        for (let i = 0; i < newRoomStationCount; i++) {
          stationsToInsert.push({
            room_id: roomData.id,
            name: `iPad ${i + 1}`
          });
        }
      }

      await supabase.from('stations').insert(stationsToInsert);

      fetchData();
      setShowAddRoom(false); 
      setNewRoomName(''); 
      setNewRoomLocation(null);
      setNewRoomStationCount(5);
    }
  };

  const captureGPSForRoom = () => {
    if (!navigator.geolocation) {
      alert('GPS wird nicht unterstützt.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewRoomLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => alert('Fehler beim Abrufen des Standorts. Bitte Berechtigungen prüfen.'),
      { enableHighAccuracy: true }
    );
  };

  const handleAddStation = async (e: React.FormEvent, roomId: string) => {
    e.preventDefault();
    const { data, error } = await supabase.from('stations').insert({
      room_id: roomId, name: newStationName, color: newStationColor
    }).select().single();
    if (error) alert('Fehler: ' + error.message);
    else if (data) { 
      setStations([...stations, data]); 
      setShowAddStationForRoom(null); 
      setNewStationName(''); 
      setNewStationColor('#64748b');
    }
  };

  const triggerBatchAddStations = (roomId: string) => {
    setShowBatchiPadModal({ roomId });
    setBatchiPadCount('1');
  };

  const executeBatchAddStations = async () => {
    if (!showBatchiPadModal) return;
    const roomId = showBatchiPadModal.roomId;
    const count = parseInt(batchiPadCount, 10);
    if (isNaN(count) || count <= 0) {
      alert("Bitte eine gültige Anzahl (Zahl größer als 0) eingeben.");
      return;
    }

    const roomStations = stations.filter(s => s.room_id === roomId && s.name.startsWith('iPad '));
    let nextNum = 1;
    roomStations.forEach(s => {
      const match = s.name.match(/^iPad\s+(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= nextNum) {
          nextNum = num + 1;
        }
      }
    });

    const stationsToInsert = [];
    for (let i = 0; i < count; i++) {
      const currentNum = nextNum + i;
      let color = '#64748b';
      if (currentNum === 1 || currentNum === 2) color = '#ef4444';
      else if (currentNum === 3 || currentNum === 4) color = '#a855f7';
      else if (currentNum === 5 || currentNum === 6) color = '#3b82f6';
      else if (currentNum === 7 || currentNum === 8) color = '#eab308';

      stationsToInsert.push({
        room_id: roomId,
        name: `iPad ${currentNum}`,
        color: color
      });
    }

    const { data, error } = await supabase.from('stations').insert(stationsToInsert).select();
    if (error) {
      alert('Fehler beim Anlegen der iPads: ' + error.message);
    } else if (data) {
      setStations([...stations, ...data]);
      setShowBatchiPadModal(null);
    }
  };



  const handleUpdateRoomName = async (roomId: string) => {
    if (!editingRoomName.trim()) return;
    const { error } = await supabase.from('rooms').update({ name: editingRoomName }).eq('id', roomId);
    if (error) alert(error.message);
    else {
      setRooms(rooms.map(r => r.id === roomId ? { ...r, name: editingRoomName } : r));
      setEditingRoomId(null);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!window.confirm('Raum und alle darin enthaltenen iPads wirklich löschen?')) return;
    const { error } = await supabase.from('rooms').delete().eq('id', roomId);
    if (error) alert(error.message);
    else {
      setRooms(prev => prev.filter(r => r.id !== roomId));
      fetchData();
    }
  };

  const handleRoomDragStart = (e: React.DragEvent, roomId: string) => {
    setDraggedRoomId(roomId);
    draggedRoomIdRef.current = roomId;
    e.dataTransfer.setData('text/plain', roomId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleRoomDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRoomDragEnter = (e: React.DragEvent, roomId: string) => {
    e.preventDefault();
    const activeDraggedId = draggedRoomIdRef.current || draggedRoomId;
    if (activeDraggedId && activeDraggedId !== roomId) {
      setDragOverRoomId(roomId);
    }
  };

  const handleRoomDragLeave = () => {
    setDragOverRoomId(null);
  };

  const handleRoomDrop = async (e: React.DragEvent, targetRoomId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedRoomIdRef.current || draggedRoomId;
    if (!sourceId || sourceId === targetRoomId) {
      setDraggedRoomId(null);
      draggedRoomIdRef.current = null;
      setDragOverRoomId(null);
      return;
    }

    // Optimistically update local rooms state
    const sourceIndex = rooms.findIndex(r => r.id === sourceId);
    const targetIndex = rooms.findIndex(r => r.id === targetRoomId);
    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggedRoomId(null);
      draggedRoomIdRef.current = null;
      setDragOverRoomId(null);
      return;
    }

    const reorderedRooms = [...rooms];
    const [movedRoom] = reorderedRooms.splice(sourceIndex, 1);
    reorderedRooms.splice(targetIndex, 0, movedRoom);

    // Reassign sort_order values locally
    const updatedRooms = reorderedRooms.map((room, idx) => ({
      ...room,
      sort_order: idx
    }));

    setRooms(updatedRooms);
    setDraggedRoomId(null);
    draggedRoomIdRef.current = null;
    setDragOverRoomId(null);

    // Persist reordered sort_order values to the database
    try {
      const updatePromises = updatedRooms.map((room, idx) =>
        supabase
          .from('rooms')
          .update({ sort_order: idx })
          .eq('id', room.id)
      );
      await Promise.all(updatePromises);
      console.log('Successfully reordered rooms in database');
    } catch (err) {
      console.error('Error persisting room order:', err);
      alert('Fehler beim Speichern der Raumreihenfolge.');
      if (admin?.school_id) {
        const { data: roomsData } = await supabase
          .from('rooms')
          .select('*')
          .eq('school_id', admin.school_id)
          .eq('is_groovelab_active', true)
          .order('sort_order', { ascending: true });
        if (roomsData) setRooms(roomsData);
      }
    }
  };

  const handleRoomDragEnd = () => {
    setDraggedRoomId(null);
    draggedRoomIdRef.current = null;
    setDragOverRoomId(null);
  };

  const handleDeleteStation = async (stationId: string) => {
    if (!window.confirm('Dieses iPad wirklich entfernen?')) return;
    const { error } = await supabase.from('stations').delete().eq('id', stationId);
    if (error) alert(error.message);
    else fetchData();
  };

  const handleUpdateStationColor = async (stationId: string, newColor: string) => {
    const station = stations.find(s => s.id === stationId);
    if (!station) return;

    // Find partner in pair (1-2, 3-4, etc.)
    const nameMatch = station.name.match(/\d+$/);
    const partnerId = nameMatch ? (() => {
      const num = parseInt(nameMatch[0]);
      const partnerNum = num % 2 === 0 ? num - 1 : num + 1;
      const partnerName = station.name.replace(/\d+$/, partnerNum.toString());
      return stations.find(s => s.name === partnerName && s.room_id === station.room_id)?.id;
    })() : null;

    const idsToUpdate = [stationId];
    if (partnerId) idsToUpdate.push(partnerId);

    const { error } = await supabase.from('stations').update({ color: newColor }).in('id', idsToUpdate);
    if (error) {
      alert('Fehler: ' + error.message);
    } else {
      setStations(stations.map(s => idsToUpdate.includes(s.id) ? { ...s, color: newColor } : s));
    }
  };

  const handleAddGeofencePoint = async (roomId: string, manualLat?: number, manualLng?: number) => {
    if (!manualLat && !window.confirm('Aktuellen Standort als weiteren Kalibrierungs-Punkt für diesen Raum hinzufügen? (Radius: 20m)')) return;
    
    const updatePoint = async (lat: number, lng: number) => {
      console.log(`[Admin] Punkt hinzufügen: ${lat}, ${lng}`);
      
      const { data: latestRoom, error: fetchError } = await supabase
        .from('rooms')
        .select('geofence_points')
        .eq('id', roomId)
        .single();

      if (fetchError || !latestRoom) return;

      const currentPoints = Array.isArray(latestRoom.geofence_points) ? [...latestRoom.geofence_points] : [];
      const newPoint = { lat, lng, timestamp: new Date().toISOString() };
      currentPoints.push(newPoint);

      await supabase.from('rooms').update({ 
        geofence_points: currentPoints,
        latitude: lat,
        longitude: lng
      }).eq('id', roomId);
      
      fetchData();
    };

    if (manualLat && manualLng) {
      updatePoint(manualLat, manualLng);
      return;
    }
    
    const tryScan = (highAccuracy: boolean) => {
      const geoOptions = {
        enableHighAccuracy: highAccuracy,
        timeout: highAccuracy ? 5000 : 10000,
        maximumAge: 0 
      };

      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        
        console.log(`[Admin] Scan erfolgreich: ${lat}, ${lng}`);

        // 1. Frischesten Stand des Raumes direkt aus der DB holen (verhindert Race Conditions)
        const { data: latestRoom, error: fetchError } = await supabase
          .from('rooms')
          .select('name, geofence_points')
          .eq('id', roomId)
          .single();

        if (fetchError || !latestRoom) {
          alert('Fehler beim Abrufen der aktuellen Raumdaten: ' + (fetchError?.message || 'Nicht gefunden'));
          return;
        }

        // 2. Punkte sicher zusammenführen
        let currentPoints: Array<{ lat: number, lng: number, timestamp: string }> = [];
        if (latestRoom.geofence_points && Array.isArray(latestRoom.geofence_points)) {
          currentPoints = [...latestRoom.geofence_points];
        }

        const newPoint = { 
          lat: Number(lat.toFixed(8)), 
          lng: Number(lng.toFixed(8)), 
          timestamp: new Date().toISOString() 
        };
        
        currentPoints.push(newPoint);

        // 3. Update an Supabase senden
        const { error: updateError } = await supabase.from('rooms').update({
          geofence_points: currentPoints,
          latitude: Number(lat.toFixed(8)),
          longitude: Number(lng.toFixed(8))
        }).eq('id', roomId);
        
        if (updateError) {
          console.error('[Admin] DB Fehler:', updateError);
          alert('Datenbank-Fehler beim Speichern: ' + updateError.message);
        } else {
          alert(`Punkt ${currentPoints.length} erfolgreich für "${latestRoom.name}" hinzugefügt! ✅`);
          await fetchData(); 
        }
      }, (err) => {
        if (highAccuracy) {
          console.log('[Admin] High Accuracy failed, trying normal...');
          tryScan(false);
        } else {
          alert('Standort-Fehler: ' + err.message);
        }
      }, geoOptions);
    };

    tryScan(true);
  };

  const handleDeleteGeofencePoint = async (roomId: string, index: number) => {
    if (!window.confirm('Diesen Geofence-Punkt wirklich löschen?')) return;
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    
    const points: any[] = Array.isArray(room.geofence_points) ? [...room.geofence_points] : [];
    points.splice(index, 1);
    
    // Update lat/lng to the last remaining point or null
    const lastPoint = points.length > 0 ? points[points.length - 1] : null;

    const { error } = await supabase.from('rooms').update({
      geofence_points: points,
      latitude: lastPoint?.lat || null,
      longitude: lastPoint?.lng || null
    }).eq('id', roomId);
    
    if (error) alert(error.message);
    else fetchData();
  };

  const handleClearGeofencePoints = async (roomId: string) => {
    if (!window.confirm('Alle gespeicherten Kalibrierungs-Punkte für diesen Raum löschen?')) return;
    const { error } = await supabase.from('rooms').update({
      geofence_points: [],
      latitude: null,
      longitude: null
    }).eq('id', roomId);
    if (error) alert(error.message);
    else fetchData();
  };

  const handleAutoParseLinks = (text: string, isEditing: boolean) => {
    const lines = text.split(/[\n,;]/);
    const urls: Record<string, string> = {
      pdf_guitar_url: '',
      pdf_bass_url: '',
      pdf_drums_url: '',
      pdf_keys_url: '',
      pdf_vocals_url: ''
    };
    
    const current = isEditing ? editingSong : newSong;
    if (!current) return;
    urls.pdf_guitar_url = current.pdf_guitar_url || '';
    urls.pdf_bass_url = current.pdf_bass_url || '';
    urls.pdf_drums_url = current.pdf_drums_url || '';
    urls.pdf_keys_url = current.pdf_keys_url || '';
    urls.pdf_vocals_url = current.pdf_vocals_url || '';

    lines.forEach(line => {
      const trimmed = line.trim();
      const urlMatch = trimmed.match(/(https?:\/\/[^\s"'><]+)/);
      if (!urlMatch) return;
      const url = urlMatch[1];
      const lower = trimmed.toLowerCase();
      
      if (lower.includes('gitarre') || lower.includes('guitar') || lower.includes('git')) {
        urls.pdf_guitar_url = url;
      } else if (lower.includes('bass')) {
        urls.pdf_bass_url = url;
      } else if (lower.includes('drums') || lower.includes('drum') || lower.includes('schlagzeug') || lower.includes('schlag')) {
        urls.pdf_drums_url = url;
      } else if (lower.includes('piano') || lower.includes('keys') || lower.includes('keyboard') || lower.includes('tasten')) {
        urls.pdf_keys_url = url;
      } else if (lower.includes('vocals') || lower.includes('gesang') || lower.includes('lyrics') || lower.includes('text') || lower.includes('sing')) {
        urls.pdf_vocals_url = url;
      }
    });

    if (isEditing) {
      setEditingSong({
        ...editingSong,
        ...urls
      });
    } else {
      setNewSong({
        ...newSong,
        ...urls
      });
    }
  };

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedSchoolId = admin?.school_id || (admin?.schools as any)?.id;
    if (!resolvedSchoolId) {
      alert('Schul-ID nicht gefunden.');
      return;
    }

    const resolvedTeacherId = (admin?.role === 'teacher' ? admin?.id : null) || userId || admin?.id;
    const isCampus = (activePlatform === 'campus');

    if (bulkModeSongs) {
      const lines = bulkTextSongs.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) return;

      const insertPayloads = lines.map(line => {
        let artist = 'Unbekannt';
        let title = line;
        if (line.includes(' - ')) {
          const parts = line.split(' - ');
          artist = parts[0].trim();
          title = parts.slice(1).join(' - ').trim();
        }
        return {
          school_id: resolvedSchoolId, 
          artist, 
          title, 
          level: 1, 
          media_link: '',
          tomplay_url: '',
          pdf_folder_url: '',
          guitar_pro_url: '',
          pdf_drums_url: '',
          pdf_guitar_url: '',
          pdf_bass_url: '',
          pdf_vocals_url: '',
          pdf_keys_url: '',
          playalong_url: '',
          bypass_wlan_check: false,
          instrumentation: isCampus ? {} : { 'E-Gitarre': 1, 'E-Bass': 1, 'E-Drums': 1, 'E-Piano': 1 },
          is_campus_active: isCampus,
          is_groovelab_active: !isCampus,
          teacher_id: resolvedTeacherId
        };
      });

      let { data, error } = await supabase.from('songs').insert(insertPayloads).select();

      if (error && (error.message.includes('playalong_url') || error.code === 'PGRST204' || error.message.includes('column') || error.message.includes('cache'))) {
        console.warn('[AdminDashboard] playalong_url column missing, retrying bulk insert without it');
        const strippedPayloads = insertPayloads.map(({ playalong_url, ...stripped }) => stripped);
        const retryResult = await supabase.from('songs').insert(strippedPayloads).select();
        data = retryResult.data;
        error = retryResult.error;
      }

      if (error) alert('Fehler: ' + error.message);
      else if (data) {
        setSongs(prev => [...prev, ...data]);
        setShowAddSong(false);
        setBulkModeSongs(false);
        setBulkTextSongs('');
      }
      return;
    }
    
    const insertPayload: any = {
      school_id: resolvedSchoolId, 
      artist: newSong.artist?.trim() || 'Unbekannt', 
      title: newSong.title?.trim() || 'Unbenannter Song', 
      level: newSong.level || 1, 
      media_link: newSong.media_link || '',
      tomplay_url: newSong.tomplay_url || '',
      pdf_folder_url: '',
      guitar_pro_url: '',
      pdf_drums_url: '',
      pdf_guitar_url: '',
      pdf_bass_url: '',
      pdf_vocals_url: '',
      pdf_keys_url: '',
      playalong_url: '',
      bypass_wlan_check: !!newSong.bypass_wlan_check,
      instrumentation: isCampus ? {} : (newSong.instrumentation || { 'E-Gitarre': 1, 'E-Bass': 1, 'E-Drums': 1, 'E-Piano': 1 }),
      is_campus_active: isCampus,
      is_groovelab_active: !isCampus,
      teacher_id: resolvedTeacherId
    };

    let { data, error } = await supabase.from('songs').insert(insertPayload).select().single();
    
    if (error && (error.message.includes('playalong_url') || error.code === 'PGRST204' || error.message.includes('column') || error.message.includes('cache'))) {
      console.warn('[AdminDashboard] playalong_url column missing, retrying insert without it');
      const { playalong_url, ...strippedPayload } = insertPayload;
      const retryResult = await supabase.from('songs').insert(strippedPayload).select().single();
      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) alert('Fehler: ' + error.message);
    else if (data) { 
      setSongs(prev => [...prev, data]); 
      setShowAddSong(false); 
      setNewSong({ artist: '', title: '', level: 1, media_link: '', tomplay_url: '', pdf_folder_url: '', guitar_pro_url: '', pdf_drums_url: '', pdf_guitar_url: '', pdf_bass_url: '', pdf_vocals_url: '', pdf_keys_url: '', playalong_url: '', bypass_wlan_check: false, instrumentation: { 'E-Gitarre': 1, 'E-Bass': 1, 'E-Drums': 1, 'E-Piano': 1 } }); 
    }
  };

  const handleUpdateSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSong) return;

    const updatePayload: any = {
      artist: editingSong.artist,
      title: editingSong.title,
      level: editingSong.level,
      media_link: editingSong.media_link,
      tomplay_url: editingSong.tomplay_url,
      pdf_folder_url: editingSong.pdf_folder_url || '',
      guitar_pro_url: editingSong.guitar_pro_url || '',
      pdf_drums_url: editingSong.pdf_drums_url || '',
      pdf_guitar_url: editingSong.pdf_guitar_url || '',
      pdf_bass_url: editingSong.pdf_bass_url || '',
      pdf_vocals_url: editingSong.pdf_vocals_url || '',
      pdf_keys_url: editingSong.pdf_keys_url || '',
      playalong_url: editingSong.playalong_url || '',
      bypass_wlan_check: !!editingSong.bypass_wlan_check,
      instrumentation: editingSong.instrumentation
    };

    let { error } = await supabase.from('songs').update(updatePayload).eq('id', editingSong.id);
    
    // Fallback: If playalong_url column doesn't exist, retry without it
    if (error && (error.message.includes('playalong_url') || error.code === 'PGRST204' || error.message.includes('column') || error.message.includes('cache'))) {
      console.warn('[AdminDashboard] playalong_url column missing, retrying update without it');
      const { playalong_url, ...strippedPayload } = updatePayload;
      const retryResult = await supabase.from('songs').update(strippedPayload).eq('id', editingSong.id);
      error = retryResult.error;
    }

    if (error) alert('Fehler: ' + error.message);
    else {
      setSongs(songs.map(s => s.id === editingSong.id ? editingSong : s));
      setEditingSong(null);
      alert('Song erfolgreich aktualisiert! ✅');
    }
  };

  const handleDeleteSong = async (songId: string) => {
    if (!window.confirm('Song wirklich aus der Bibliothek löschen? Damit wird er auch aus allen Schüler-Boards, der Rejection-History und sämtlichen Bands entfernt.')) return;
    try {
      console.log('[Admin] Starting deep delete for song:', songId);
      
      // 1. Cleanup all dependencies
      // Delete rejection history for this song
      await supabase.from('rejection_history').delete().eq('song_id', songId);
      
      // Handle Bands and their dependencies
      const { data: bandsToDelete } = await supabase.from('bands').select('id').eq('song_id', songId);
      if (bandsToDelete && bandsToDelete.length > 0) {
        const bandIds = bandsToDelete.map(b => b.id);
        
        // Cleanup band members and shoutbox
        await supabase.from('band_members').delete().in('band_id', bandIds);
        await supabase.from('band_shoutbox').delete().in('band_id', bandIds);
        
        // Cleanup band song slots
        const { data: bandSongs } = await supabase.from('band_songs').select('id').in('band_id', bandIds);
        if (bandSongs && bandSongs.length > 0) {
          await supabase.from('band_song_slots').delete().in('band_song_id', bandSongs.map(bs => bs.id));
        }
        
        // Delete the bands themselves
        await supabase.from('bands').delete().in('id', bandIds);
      }

      // Cleanup ALL band_song_slots for this song (including proposals without bands)
      const { data: allBS } = await supabase.from('band_songs').select('id').eq('song_id', songId);
      if (allBS && allBS.length > 0) {
        await supabase.from('band_song_slots').delete().in('band_song_id', allBS.map(bs => bs.id));
      }

      // Cleanup remaining student skills and song mappings
      await supabase.from('user_song_skills').delete().eq('song_id', songId);
      await supabase.from('band_songs').delete().eq('song_id', songId);
      
      // 2. Finally delete the song record
      const { error } = await supabase.from('songs').delete().eq('id', songId);
      if (error) throw error;
      
      console.log('[Admin] Delete successful');
      setSongs(prev => prev.filter(s => s.id !== songId));
      alert('Song wurde inklusive aller Verknüpfungen erfolgreich gelöscht. 🗑️');
    } catch (err: any) {
      console.error('[Admin] Global Delete error:', err);
      alert('Fehler beim Löschen: ' + err.message + '\n\nDetails: Prüfe die Konsole für mehr Infos.');
    }
  };


  const [studentBands, setStudentBands] = useState<any[]>([]);
  const [studentDetailTab, setStudentDetailTab] = useState<'profile' | 'logbook' | 'contract'>('profile');
  const [showFullPhoto, setShowFullPhoto] = useState(false);

  const fetchStudentProfile = async (student: any) => {
    setSelectedStudent(student);
    setStudentDetailTab('profile'); // Reset to default tab

    // Fetch student's bands and filter out duplicates
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
    setStudentBands(uniqueBandsList);

    const { data: skills } = await supabase
      .from('user_song_skills')
      .select('*, songs(*)')
      .eq('user_id', student.id);
    
    setStudentDetails(skills || []);

    const { data: rejHistory } = await supabase
      .from('rejection_history')
      .select('*, songs(*)')
      .eq('user_id', student.id)
      .order('rejected_at', { ascending: false });
    setStudentRejections(rejHistory || []);

    const { data: allSessions } = await supabase
      .from('sessions')
      .select('check_in_time, check_out_time, station_id')
      .eq('user_id', student.id);
    
    if (allSessions) {
      const openingHours = schoolObj?.opening_hours;
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      
      // Filter for "Logbuch" (must be at station AND on active day)
      const logSessions = allSessions.filter(s => {
        if (!s.station_id) return false;
        if (openingHours) {
          const d = new Date(s.check_in_time);
          const dayConfig = openingHours[dayNames[d.getDay()]];
          if (!dayConfig || !dayConfig.active) return false;
        }
        return true;
      });

      setStudentSessions([...logSessions].sort((a: any, b: any) => new Date(b.check_in_time).getTime() - new Date(a.check_in_time).getTime()));
      let labMins = 0;
      let homeMins = 0;

      allSessions.forEach(s => {
        const start = new Date(s.check_in_time);
        const end = s.check_out_time ? new Date(s.check_out_time) : new Date();
        const duration = Math.floor((end.getTime() - start.getTime()) / 60000);
        const mins = Math.max(0, duration);
        
        // Only count as lab mins if it's a valid log session (at station and during opening hours)
        const isValidLog = logSessions.some(ls => ls.check_in_time === s.check_in_time && ls.station_id === s.station_id);
        
        if (s.station_id && isValidLog) {
          labMins += mins;
        } else if (!s.station_id) {
          homeMins += mins;
        }
      });

      setStudentLabMins(labMins);
      setStudentHomeMins(homeMins);

      // Erweiterte Statistiken
      const avgDuration = allSessions.length > 0 ? Math.round((labMins + homeMins) / allSessions.length) : 0;
      const lastSession = allSessions.length > 0 ? new Date(allSessions[0].check_in_time) : null;
      
      // Fokus Instrument
      const instXp: Record<string, number> = {};
      skills?.forEach((s: any) => {
        const xp = s.is_stage_ready || s.progress_percent === 100 ? 500 : s.progress_percent * 2;
        instXp[s.instrument] = (instXp[s.instrument] || 0) + xp;
      });
      const topInst = Object.entries(instXp).sort((a,b) => b[1] - a[1])[0]?.[0] || 'Keines';

      // Streak berechnen (einzigartige Kalenderwochen)
      const weeks = new Set();
      allSessions.forEach(s => {
        const d = new Date(s.check_in_time);
        const year = d.getFullYear();
        const firstDayOfYear = new Date(year, 0, 1);
        const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
        const week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        weeks.add(`${year}-${week}`);
      });

      (student as any).stats = {
        avgDuration,
        lastActive: lastSession ? lastSession.toLocaleDateString() : 'Nie',
        topInstrument: topInst,
        sessionCount: allSessions.length,
        streak: weeks.size
      };
    }

    const { data: planning } = await supabase
      .from('lab_planning')
      .select('*')
      .eq('user_id', student.id);
    setStudentPlanning(planning || []);
  };

  if (!admin) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc', color: '#64748b', fontSize: '1rem', fontWeight: 600 }}>
        Lade Dashboard...
      </div>
    );
  }

  if (!admin) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b', fontWeight: 600 }}>Lädt...</div>;


  
  const sidebarItems = [
    { id: 'live', label: 'Live Lab', icon: Monitor },
    { id: 'students', label: 'Schüler', icon: Users },
    { id: 'bands', label: 'Bands', icon: Award },
    { id: 'team', label: 'Team', icon: Shield },
    { id: 'rooms', label: 'Räume', icon: Box },
    { id: 'songs', label: activePlatform === 'campus' ? 'Mediathek' : 'Songs', icon: activePlatform === 'campus' ? Library : Music },
    ...(activePlatform === 'campus' ? [{ id: 'stats', label: 'Statistik', icon: LucideBarChart }] : []),
    { id: 'gallery', label: 'ID Galerie', icon: QrCode },
    { id: 'setup', label: 'Einstellungen', icon: Settings },
  ];

  const renderLiveTab = () => (
    <div style={{ marginTop: '0px', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <TeacherDashboard 
        key={`teacher-dashboard-view-${activePlatform}`}
        userId={userId} 
        hideHeader={activePlatform === 'campus' ? false : true} 
        hideSidebar={true}
        viewMode="admin" 
        activePlatform={activePlatform as any}
        initialTab={activeTab === 'live' ? 'live' : (activeTab === 'briefing' ? 'briefing' : (activePlatform === 'campus' ? 'briefing' : 'live'))}
        onTabChange={(id) => onTabChange?.(id)}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        session={session}
        onSessionChange={onSessionChange}
        locationMode={locationMode}
        onLocationModeChange={onLocationModeChange}
      />
    </div>
  );

  const renderBandsTab = () => (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Bands-Verwaltung wird geladen...</div>}>
      <AdminBandsView
        activePlatform={activePlatform}
        allBands={allBands}
        bandSearch={bandSearch}
        setBandSearch={setBandSearch}
        bandLetter={bandLetter}
        setBandLetter={setBandLetter}
        selectedCoachId={selectedCoachId}
        setSelectedCoachId={setSelectedCoachId}
        showAddBand={showAddBand}
        setShowAddBand={setShowAddBand}
        newBand={newBand}
        setNewBand={setNewBand}
        setEditingBand={setEditingBand}
        teachers={teachers}
        songs={songs}
        students={students}
        showRealNames={showRealNames}
        onOpenBandProfile={onOpenBandProfile}
        handleCreateBandManually={handleCreateBandManually}
        selectedMembers={selectedMembers}
        setSelectedMembers={setSelectedMembers}
        memberToSearch={memberToSearch}
        setMemberToSearch={setMemberToSearch}
        showAddMember={showAddMember}
        setShowAddMember={setShowAddMember}
        memberSearch={memberSearch}
        setMemberSearch={setMemberSearch}
        fetchData={fetchData}
      />
    </Suspense>
  );


  const handleDeleteAllStudents = async () => {
    const confirmDelete = window.confirm("Möchtest du WIRKLICH ALLE Schüler löschen? Dies kann nicht rückgängig gemacht werden!");
    if (!confirmDelete) return;

    try {
      const studentIds = students.map(s => s.id);
      if (studentIds.length === 0) return;

      await supabase.from('bands').update({ coach_id: null }).in('coach_id', studentIds);
      await supabase.from('band_members').delete().in('user_id', studentIds);
      await supabase.from('user_song_skills').delete().in('user_id', studentIds);
      await supabase.from('user_song_skills').update({ verified_by_id: null }).in('verified_by_id', studentIds);
      await supabase.from('sessions').delete().in('user_id', studentIds);
      await supabase.from('band_songs').update({ suggested_by: null }).in('suggested_by', studentIds);
      await supabase.from('lab_planning').delete().in('user_id', studentIds);
      await supabase.from('band_shoutbox').delete().in('user_id', studentIds);
      await supabase.from('band_song_slots').delete().in('user_id', studentIds);
      await supabase.from('help_requests').delete().in('user_id', studentIds);
      await supabase.from('avatars').delete().in('user_id', studentIds);
      await deleteUserStorageAssets(studentIds);
      await supabase.from('users').delete().in('id', studentIds);

      setStudents([]);
      alert("Alle Schüler wurden erfolgreich gelöscht.");
    } catch (err: any) {
      console.error("Fehler beim Löschen aller Schüler:", err);
      alert("Ein Fehler ist aufgetreten.");
    }
  };

  const renderStudentsTab = () => (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Schülerverwaltung wird geladen...</div>}>
      <AdminStudentsView
        activePlatform={activePlatform}
        admin={admin}
        userId={userId}
        schoolObj={schoolObj}
        students={students}
        setStudents={setStudents}
        studentSearch={studentSearch}
        setStudentSearch={setStudentSearch}
        listType={listType}
        setListType={setListType}
        instrumentFilter={instrumentFilter}
        setInstrumentFilter={setInstrumentFilter}
        showAddStudent={showAddStudent}
        setShowAddStudent={setShowAddStudent}
        showBulkAddStudents={showBulkAddStudents}
        setShowBulkAddStudents={setShowBulkAddStudents}
        bulkInput={bulkInput}
        setBulkInput={setBulkInput}
        parsedStudents={parsedStudents}
        setParsedStudents={setParsedStudents}
        defaultInstrumentForBulk={defaultInstrumentForBulk}
        setDefaultInstrumentForBulk={setDefaultInstrumentForBulk}
        isBulkSaving={isBulkSaving}
        setIsBulkSaving={setIsBulkSaving}
        newStudent={newStudent}
        setNewStudent={setNewStudent}
        editingStudent={editingStudent}
        setEditingStudent={setEditingStudent}
        showRealNames={showRealNames}
        toggleRealNames={toggleRealNames}
        canManageStudents={canManageStudents}
        hasTimetableOnboarding={hasTimetableOnboarding}
        windowWidth={windowWidth}
        isMobile={isMobile}
        setSelectedStudent={setSelectedStudent}
        setSelectedQRUser={setSelectedQRUser}
        setSelectedTimetableStudent={setSelectedTimetableStudent}
        setSelectedStudentForTageskompass={setSelectedStudentForTageskompass}
        setShowTageskompassModal={setShowTageskompassModal}
        setShowParentInfoSheetModal={setShowParentInfoSheetModal}
        fetchStudentProfile={fetchStudentProfile}
        handleAddStudent={handleAddStudent}
        handleBulkAddSubmit={handleBulkAddSubmit}
        handleDeleteStudent={handleDeleteStudent}
        handleUpdateStudent={handleUpdateStudent}
        parseBulkInput={parseBulkInput}
        resolveUserAvatar={resolveUserAvatarBound}
      />
    </Suspense>
  );

  const renderTeachersTab = () => (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Lehrerverwaltung wird geladen...</div>}>
      <AdminTeachersView
        activePlatform={activePlatform}
        admin={admin}
        userId={userId}
        teachers={teachers}
        canManageTeachers={canManageTeachers}
        showAddTeacher={showAddTeacher}
        setShowAddTeacher={setShowAddTeacher}
        newTeacher={newTeacher}
        setNewTeacher={setNewTeacher}
        editingTeacher={editingTeacher}
        setEditingTeacher={setEditingTeacher}
        handleAddTeacher={handleAddTeacher}
        handleUpdateTeacher={handleUpdateTeacher}
        handleDeleteTeacher={handleDeleteTeacher}
        handleToggleObserver={handleToggleObserver}
        setSelectedQRUser={setSelectedQRUser}
        windowWidth={windowWidth}
      />
    </Suspense>
  );

  const renderCampusRoomsTab = () => (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Raumplaner wird geladen...</div>}>
      <AdminCampusRoomsView
        activePlatform={activePlatform}
        admin={admin}
        userId={userId}
        rooms={rooms}
        setRooms={setRooms}
        schoolObj={schoolObj}
        students={students}
        schedules={schedules}
        setSchedules={setSchedules}
        campusBookings={campusBookings}
        setCampusBookings={setCampusBookings}
        dbRoomBookings={dbRoomBookings}
        scheduleOccurrences={scheduleOccurrences}
        holidays={holidays}
        roomSearchQuery={roomSearchQuery}
        setRoomSearchQuery={setRoomSearchQuery}
        selectedCampusRoomId={selectedCampusRoomId}
        setSelectedCampusRoomId={setSelectedCampusRoomId}
        selectedFloor={selectedFloor}
        setSelectedFloor={setSelectedFloor}
        selectedEquipmentFilter={selectedEquipmentFilter}
        setSelectedEquipmentFilter={setSelectedEquipmentFilter}
        showOnlyFreeNow={showOnlyFreeNow}
        setShowOnlyFreeNow={setShowOnlyFreeNow}
        showMyBookingsOnly={showMyBookingsOnly}
        setShowMyBookingsOnly={setShowMyBookingsOnly}
        isDateFilterActive={isDateFilterActive}
        setIsDateFilterActive={setIsDateFilterActive}
        bookingDate={bookingDate}
        setBookingDate={setBookingDate}
        bookingStartTime={bookingStartTime}
        setBookingStartTime={setBookingStartTime}
        bookingEndTime={bookingEndTime}
        setBookingEndTime={setBookingEndTime}
        bookingPurpose={bookingPurpose}
        setBookingPurpose={setBookingPurpose}
        bookingType={bookingType}
        setBookingType={setBookingType}
        bookingStudentId={bookingStudentId}
        setBookingStudentId={setBookingStudentId}
        bookingTargetType={bookingTargetType}
        setBookingTargetType={setBookingTargetType}
        externalBookingPartnerName={externalBookingPartnerName}
        setExternalBookingPartnerName={setExternalBookingPartnerName}
        selectedBooking={selectedBooking}
        setSelectedBooking={setSelectedBooking}
        isRecurring={isRecurring}
        setIsRecurring={setIsRecurring}
        recurringInterval={recurringInterval}
        setRecurringInterval={setRecurringInterval}
        showPreviewField={showPreviewField}
        setShowPreviewField={setShowPreviewField}
        showMobileRoomSlider={showMobileRoomSlider}
        setShowMobileRoomSlider={setShowMobileRoomSlider}
        mobileSelectedDayIdx={mobileSelectedDayIdx}
        setMobileSelectedDayIdx={setMobileSelectedDayIdx}
        favoriteRoomId={favoriteRoomId}
        setFavoriteRoomId={setFavoriteRoomId}
        dragOverCell={dragOverCell}
        setDragOverCell={setDragOverCell}
        showRoomFinderBar={showRoomFinderBar}
        setShowRoomFinderBar={setShowRoomFinderBar}
        finderStartTime={finderStartTime}
        setFinderStartTime={setFinderStartTime}
        finderEndTime={finderEndTime}
        setFinderEndTime={setFinderEndTime}
        roomBlockedSlots={roomBlockedSlots}
        calendarScrollRef={calendarScrollRef}
        fetchData={fetchData}
        showRealNames={showRealNames}
        isMobile={isMobile}
        hoveredInstrumentIdx={hoveredInstrumentIdx}
        setHoveredInstrumentIdx={setHoveredInstrumentIdx}
        setDraftBooking={setDraftBooking}
        setFinderResultCount={setFinderResultCount}
        setIsRoomSearchDropdownOpen={setIsRoomSearchDropdownOpen}
        setStudentSearchTerm={setStudentSearchTerm}
        setSuccessAnimationRoomId={setSuccessAnimationRoomId}
      />
    </Suspense>
  );
  const renderGroovelabRoomsTab = () => {
    const groovelabBrandColor = '#eab308';
    
    return (
      <div style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-panel" style={{ 
            background: 'linear-gradient(135deg, #ffffff, #f8fafc)', 
            border: '1px solid #e2e8f0', 
            borderRadius: '24px', 
            padding: '10px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '8px',
            boxShadow: '0 4px 20px -2px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ background: `${groovelabBrandColor}15`, color: groovelabBrandColor, padding: '14px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 20px -6px ${groovelabBrandColor}30` }}>
                <Box size={28} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                  Räume & Übeplätze
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                  Verwalte deine Räume und ordne Kiosk-Stationen zu
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>{rooms.length}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Räume</div>
              </div>
              <div style={{ width: '1px', height: '32px', background: '#cbd5e1' }} />
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>
                  {stations.filter(s => rooms.some(r => r.id === s.room_id) && s.name.toLowerCase() !== 'lehrer ipad').length}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>iPads Gesamt</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 400px), 1fr))', gap: '24px' }}>
            {rooms.map((room, index) => (
              <div 
                key={room.id} 
                className="glass-panel" 
                draggable
                onDragStart={e => handleRoomDragStart(e, room.id)}
                onDragOver={handleRoomDragOver}
                onDragEnter={e => handleRoomDragEnter(e, room.id)}
                onDragLeave={handleRoomDragLeave}
                onDrop={e => handleRoomDrop(e, room.id)}
                onDragEnd={handleRoomDragEnd}
                style={{ 
                  padding: '24px', 
                  background: 'white', 
                  borderRadius: '24px', 
                  border: dragOverRoomId === room.id ? `2px dashed ${groovelabBrandColor}` : '1px solid #f1f5f9',
                  opacity: draggedRoomId === room.id ? 0.4 : 1,
                  cursor: 'grab',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Kopfzeile: Hauptinformationen & Aktionen */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <GripVertical size={18} color="#cbd5e1" style={{ cursor: 'grab' }} />
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${groovelabBrandColor}10`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Box size={20} color={groovelabBrandColor} />
                      </div>
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                      {index + 1}. {room.name}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button onClick={() => setCustomizingRoom(room)} style={{ padding: '8px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={14} color={groovelabBrandColor} /> Layout
                    </button>
                    <button onClick={() => triggerBatchAddStations(room.id)} style={{ padding: '8px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', color: groovelabBrandColor, cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Plus size={14} /> iPad
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRoom(room.id);
                      }} 
                      aria-label={`Raum ${room.name} löschen`}
                      style={{ 
                        padding: '8px', 
                        borderRadius: '10px', 
                        background: '#f8fafc', 
                        border: '1px solid #e2e8f0', 
                        color: '#94a3b8', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = '#ef4444';
                        e.currentTarget.style.background = '#fef2f2';
                        e.currentTarget.style.borderColor = '#fecaca';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = '#94a3b8';
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                      }}
                      title="Raum löschen"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Fußzeile: Sekundäre Einstellungen (Geofence) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderTop: '1px solid #f8fafc', paddingTop: '16px' }}>
                  {/* Linke Seite: Geofence Tags & Löschen-Link */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    {(room.geofence_points || []).map((pt: any, idx: number) => (
                      <div key={idx} style={{ 
                        background: '#fef9c3', 
                        border: '1px solid #fef08a', 
                        borderRadius: '8px', 
                        padding: '6px 10px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        fontSize: '0.7rem', 
                        color: '#854d0e', 
                        fontWeight: 700
                      }}>
                        <MapPin size={10} /> Punkt {idx + 1}
                        <button 
                          onClick={() => handleDeleteGeofencePoint(room.id, idx)}
                          aria-label={`Geofence Punkt ${idx + 1} für Raum ${room.name} löschen`}
                          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                          title="Punkt löschen"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    
                    {(room.geofence_points?.length > 0 || room.latitude) && (
                      <button 
                        onClick={() => handleClearGeofencePoints(room.id)}
                        aria-label={`Alle Geofence-Punkte für Raum ${room.name} löschen`}
                        style={{ background: 'transparent', border: 'none', color: '#cbd5e1', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', padding: '6px' }}
                      >
                        Alle löschen
                      </button>
                    )}
                  </div>

                  {/* Rechte Seite: Geofence Kontrollen (Scan / Manuell) */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button 
                      onClick={() => handleAddGeofencePoint(room.id)}
                      aria-label={`Aktuellen GPS-Standort für Raum ${room.name} scannen`}
                      style={{ 
                        background: '#fffbeb', 
                        border: '1px dashed #fcd34d', 
                        borderRadius: '8px', 
                        padding: '6px 10px', 
                        color: '#92400e', 
                        fontSize: '0.7rem', 
                        fontWeight: 800, 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Aktuellen Standort scannen"
                    >
                      <MapPin size={12} /> Scan
                    </button>

                    <button 
                      onClick={() => setShowManualInput(showManualInput === room.id ? null : room.id)}
                      aria-label="Manuelle Koordinateneingabe umschalten"
                      style={{ 
                        background: '#f8fafc', 
                        border: '1px dashed #cbd5e1', 
                        borderRadius: '8px', 
                        padding: '6px 10px', 
                        color: '#64748b', 
                        fontSize: '0.7rem', 
                        fontWeight: 800, 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Plus size={12} /> Manuell
                    </button>

                    {showManualInput === room.id && (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', animation: 'fadeIn 0.2s' }}>
                        <input 
                          aria-label="Geokoordinaten Breitengrad und Längengrad eingeben"
                          placeholder="Lat, Lng" 
                          value={manualCoords[room.id] || ''} 
                          onChange={e => setManualCoords({...manualCoords, [room.id]: e.target.value})}
                          style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.7rem', width: '140px' }} 
                        />
                        <button 
                          onClick={() => {
                            const parts = manualCoords[room.id]?.split(',').map(s => s.trim());
                            if (parts?.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
                              handleAddGeofencePoint(room.id, Number(parts[0]), Number(parts[1]));
                              setManualCoords({...manualCoords, [room.id]: ''});
                              setShowManualInput(null);
                            } else {
                              alert('Format: 47.123, 7.456');
                            }
                          }}
                          aria-label="Geokoordinaten setzen"
                          style={{ background: groovelabBrandColor, color: 'white', border: 'none', borderRadius: '8px', padding: '6px 10px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Set
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {stations
                    .filter(s => s.room_id === room.id)
                    .sort((a, b) => {
                      const aIsLehrer = a.name.toLowerCase() === 'lehrer ipad';
                      const bIsLehrer = b.name.toLowerCase() === 'lehrer ipad';
                      if (aIsLehrer && !bIsLehrer) return -1;
                      if (!aIsLehrer && bIsLehrer) return 1;
                      return 0;
                    })
                    .map(station => (
                      <div key={station.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #f1f5f9', transition: 'all 0.2s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, color: '#475569' }}>
                          <Tablet size={16} color={getStationColor(station.name, station.color)} /> {station.name}
                        </div>
                        {station.name.toLowerCase() !== 'lehrer ipad' && (
                          <button 
                            onClick={() => handleDeleteStation(station.id)} 
                            aria-label={`Übeplatz ${station.name} löschen`}
                            title={`Übeplatz ${station.name} löschen`}
                            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }} 
                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} 
                            onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  {stations.filter(s => s.room_id === room.id).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.8125rem', border: '1px dashed #e2e8f0', borderRadius: '14px' }}>Keine Übeplätze definiert.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderRoomsTab = () => {
    return activePlatform === 'groovelab' ? renderGroovelabRoomsTab() : renderCampusRoomsTab();
  };

  const renderSongsTab = () => (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Mediathek wird geladen...</div>}>
      <AdminSongsView
        activePlatform={activePlatform}
        admin={admin}
        userId={userId}
        songs={songs}
        lehrwerke={lehrwerke}
        setLehrwerke={setLehrwerke}
        songSearch={songSearch}
        setSongSearch={setSongSearch}
        mediathekTab={mediathekTab}
        setMediathekTab={setMediathekTab}
        bulkModeSongs={bulkModeSongs}
        setBulkModeSongs={setBulkModeSongs}
        bulkTextSongs={bulkTextSongs}
        setBulkTextSongs={setBulkTextSongs}
        bulkModeLehrwerke={bulkModeLehrwerke}
        setBulkModeLehrwerke={setBulkModeLehrwerke}
        bulkTextLehrwerke={bulkTextLehrwerke}
        setBulkTextLehrwerke={setBulkTextLehrwerke}
        showAddSong={showAddSong}
        setShowAddSong={setShowAddSong}
        showAddLehrwerk={showAddLehrwerk}
        setShowAddLehrwerk={setShowAddLehrwerk}
        editingSong={editingSong}
        setEditingSong={setEditingSong}
        editingLehrwerk={editingLehrwerk}
        setEditingLehrwerk={setEditingLehrwerk}
        newSong={newSong}
        setNewSong={setNewSong}
        newLehrwerk={newLehrwerk}
        setNewLehrwerk={setNewLehrwerk}
        textbausteine={textbausteine}
        copiedTbId={copiedTbId}
        setCopiedTbId={setCopiedTbId}
        selectedSongForDetail={selectedSongForDetail}
        selectedLehrwerkForDetail={selectedLehrwerkForDetail}
        selectedStudentForProgress={selectedStudentForProgress}
        setShowTeacherToolsModal={setShowTeacherToolsModal}
        setShowTextbausteinModal={setShowTextbausteinModal}
        setPreviewingTextbaustein={setPreviewingTextbaustein}
        setNewHomeworkNoteText={setNewHomeworkNoteText}
        setSongLessonNotes={setSongLessonNotes}
        handleAddSong={handleAddSong}
        handleDeleteSong={handleDeleteSong}
        handleUpdateSong={handleUpdateSong}
        handleMediathekTouchStart={handleMediathekTouchStart}
        handleMediathekTouchEnd={handleMediathekTouchEnd}
      />
    </Suspense>
  );
  const renderStatsTab = () => (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Statistiken werden geladen...</div>}>
      <AdminStatsView
        activePlatform={activePlatform}
        admin={admin}
        userId={userId}
        students={students}
        teachers={teachers}
        stats={stats}
        isMobile={isMobile}
        showRealNames={showRealNames}
        showAddGoalForm={showAddGoalForm}
        setShowAddGoalForm={setShowAddGoalForm}
        newGoalTitle={newGoalTitle}
        setNewGoalTitle={setNewGoalTitle}
        newGoalMinutes={newGoalMinutes}
        setNewGoalMinutes={setNewGoalMinutes}
        newGoalDeadline={newGoalDeadline}
        setNewGoalDeadline={setNewGoalDeadline}
        handleAddGoal={handleAddGoal}
        handleDeleteGoal={handleDeleteGoal}
        resolveUserAvatar={resolveUserAvatarBound}
      />
    </Suspense>
  );
  const renderIDGalleryTab = () => (
    <div style={{ marginTop: '0px' }}>
      <IDGallery users={[...teachers, ...students]} brandColor={brandColor} onShowQR={setSelectedQRUser} />
    </div>
  );

  const renderSetupTab = () => (
    <div style={{ marginTop: '0px' }}>
      {activePlatform === 'campus' ? (
        <CampusSetupScreen 
          school={schoolObj} 
          admin={admin} 
          brandColor={brandColor} 
          onUpdate={() => fetchData()} 
        />
      ) : (
        <DeviceSetupScreen 
          rooms={setupRooms} 
          stations={setupStations} 
          brandColor={brandColor} 
          activeSessions={activeSessions}
          students={students}
          school={schoolObj}
          admin={admin}
          kiosks={kiosks || []}
          onUpdate={() => fetchData()}
          onCleanupPlanning={handleCleanupPlanning}
          onResetPlanning={handleResetAllPlanning}
          activePlatform={activePlatform}
        />
      )}
    </div>
  );

  const handleApproveSubmission = async (subId: string) => {
    setSubmissions(prev => prev.filter(s => s.id !== subId));
    try {
      const { data: sub } = await supabase.from('user_song_skills').select('user_id, song_id, instrument, difficulty_level, songs(title)').eq('id', subId).single();
      
      await supabase.from('user_song_skills').update({ is_pending_approval: false, is_stage_ready: true, verified_by_id: userId }).eq('id', subId);
      
      if (sub) {
        // Send a realtime broadcast to the student's dashboard!
        const songTitle = Array.isArray((sub as any).songs) ? ((sub as any).songs[0] as any)?.title : ((sub as any).songs as any)?.title;
        const channel = supabase.channel(`realtime_student_progress_${sub.user_id}`);
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'challenge-approved',
              payload: {
                songId: sub.song_id,
                songTitle: songTitle || 'Song',
                instrument: sub.instrument,
                difficultyLevel: sub.difficulty_level
              }
            });
            setTimeout(() => supabase.removeChannel(channel), 1000);
          }
        });
        const { data: memberships } = await supabase.from('band_members').select('band_id').eq('user_id', sub.user_id);
        
        if (memberships && memberships.length > 0) {
          const bandIds = memberships.map(m => m.band_id);
          
          const { data: existingBandSongs } = await supabase
            .from('band_songs')
            .select('band_id')
            .in('band_id', bandIds)
            .eq('song_id', sub.song_id);
            
          const bandsWithSong = new Set(existingBandSongs?.map(bs => bs.band_id) || []);
          
          const { data: assignedSlots } = await supabase
            .from('band_song_slots')
            .select('band_songs(band_id)')
            .eq('user_id', sub.user_id)
            .eq('band_songs.song_id', sub.song_id);
          
          const bandsWhereAlreadyAssigned = new Set((assignedSlots || []).map((s: any) => 
            Array.isArray(s.band_songs) ? s.band_songs[0]?.band_id : s.band_songs?.band_id
          ).filter(Boolean));

          const hasEligibleBands = bandIds.some(id => !bandsWithSong.has(id) && !bandsWhereAlreadyAssigned.has(id));
          
          if (hasEligibleBands) {
            await supabase.from('users').update({ 
              pending_repertoire_proposal: {
                song_id: sub.song_id,
                difficulty_level: sub.difficulty_level,
                instrument: sub.instrument
              }
            }).eq('id', sub.user_id);
          }
        }
      }
    } catch (err) {
      console.error('Error approving submission:', err);
    }
    fetchData();
  };

  const handleRejectSubmission = async (subId: string) => {
    setSubmissions(prev => prev.filter(s => s.id !== subId));
    try {
      await supabase.from('user_song_skills').update({ is_pending_approval: false, progress_percent: 85 }).eq('id', subId);
    } catch (err) {
      console.error('Error rejecting submission:', err);
    }
    fetchData();
  };

  const handleAssignTemplate = async (studentId: string, templateId: string) => {
    try {
      const existing = studentMissionsMap[studentId];
      if (existing) {
        await supabase
          .from('student_missions')
          .update({ template_id: templateId || null })
          .eq('student_id', studentId);
      } else {
        await supabase
          .from('student_missions')
          .insert({ student_id: studentId, template_id: templateId || null, current_level: 1 });
      }
      fetchData();
    } catch (err) {
      console.error('Error assigning template:', err);
    }
  };

  const handleUpdateStudentLevel = async (studentId: string, level: number) => {
    try {
      const existing = studentMissionsMap[studentId];
      if (existing) {
        await supabase
          .from('student_missions')
          .update({ current_level: level, unlocked_at: new Date().toISOString() })
          .eq('student_id', studentId);
      } else {
        await supabase
          .from('student_missions')
          .insert({ student_id: studentId, current_level: level, unlocked_at: new Date().toISOString() });
      }
      fetchData();
    } catch (err) {
      console.error('Error updating level:', err);
    }
  };

  const handleGeneratePin = async (studentId: string, level: number) => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      const { data: existingPins } = await supabase
        .from('one_time_upload_pins')
        .select('*')
        .eq('student_id', studentId)
        .eq('unlocked_level', level)
        .eq('is_used', false);
      
      if (existingPins && existingPins.length > 0) {
        alert(`Bestehende PIN für Stufe ${level} ist: ${existingPins[0].pin_code}`);
        return;
      }

      await supabase.from('one_time_upload_pins').insert({
        student_id: studentId,
        pin_code: pin,
        unlocked_level: level,
        is_used: false
      });
      alert(`Erfolgreich! Einmal-PIN für Bild-Upload generiert: ${pin}`);
      fetchData();
    } catch (err) {
      console.error('Error generating PIN:', err);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplateConfig) return;
    try {
      let res;
      if (editingTemplateConfig.id) {
        res = await supabase
          .from('mission_templates')
          .update({
            title: editingTemplateConfig.title,
            level_1_config: editingTemplateConfig.level_1_config,
            level_2_config: editingTemplateConfig.level_2_config,
            level_3_config: editingTemplateConfig.level_3_config,
            level_4_config: editingTemplateConfig.level_4_config,
            level_5_config: editingTemplateConfig.level_5_config,
            level_6_config: editingTemplateConfig.level_6_config,
          })
          .eq('id', editingTemplateConfig.id);
      } else {
        res = await supabase
          .from('mission_templates')
          .insert({
            school_id: admin?.school_id,
            title: editingTemplateConfig.title,
            level_1_config: editingTemplateConfig.level_1_config,
            level_2_config: editingTemplateConfig.level_2_config,
            level_3_config: editingTemplateConfig.level_3_config,
            level_4_config: editingTemplateConfig.level_4_config,
            level_5_config: editingTemplateConfig.level_5_config,
            level_6_config: editingTemplateConfig.level_6_config,
          });
      }
      
      if (res.error) throw res.error;
      
      setIsEditingTemplate(false);
      setEditingTemplateConfig(null);
      alert('Vorlage erfolgreich gespeichert!');
      fetchData();
    } catch (err: any) {
      console.error('Error saving template:', err);
      alert('Fehler beim Speichern der Vorlage: ' + (err.message || err.details || err));
    }
  };

  const handleCreateNewTemplate = () => {
    setEditingTemplateConfig({
      title: 'Neue Missions-Vorgabe',
      level_1_config: { songs_required: 1 },
      level_2_config: { streak_required: 7, focus_minutes_required: 15 },
      level_3_config: { songs_required: 3 },
      level_4_config: { songs_required: 5 },
      level_5_config: { songs_required: 8 },
      level_6_config: { songs_required: 12 },
    });
    setIsEditingTemplate(true);
  };

  const renderMissionsTab = () => (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Missions-Board wird geladen...</div>}>
      <AdminMissionsView
        activePlatform={activePlatform}
        submissions={submissions}
        missionSearch={missionSearch}
        setMissionSearch={setMissionSearch}
        missionsActiveSubTab={missionsActiveSubTab}
        setMissionsActiveSubTab={setMissionsActiveSubTab}
        missionFilter={missionFilter}
        setMissionFilter={setMissionFilter}
        editingTemplateConfig={editingTemplateConfig}
        setEditingTemplateConfig={setEditingTemplateConfig}
        isEditingTemplate={isEditingTemplate}
        setIsEditingTemplate={setIsEditingTemplate}
        studentMissionsMap={studentMissionsMap}
        missionTemplates={missionTemplates}
        activeSessions={activeSessions}
        students={students}
        songs={songs}
        showRealNames={showRealNames}
        handleApproveSubmission={handleApproveSubmission}
        handleRejectSubmission={handleRejectSubmission}
        handleSaveTemplate={handleSaveTemplate}
        handleCreateNewTemplate={handleCreateNewTemplate}
        handleAssignTemplate={handleAssignTemplate}
        handleGeneratePin={handleGeneratePin}
        handleUpdateStudentLevel={handleUpdateStudentLevel}
        resolveUserAvatar={resolveUserAvatarBound}
      />
    </Suspense>
  );

  const renderBatchiPadModal = () => {
    if (!showBatchiPadModal) return null;
    return (
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-ipad-modal-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowBatchiPadModal(null);
        }}
        style={{ 
          position: 'fixed', 
          inset: 0, 
          zIndex: 9999, 
          background: 'rgba(0,0,0,0.3)', 
          backdropFilter: 'blur(15px)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          animation: 'fadeIn 0.25s ease-out'
        }}
      >
        <div 
          className="glass-panel"
          style={{ 
            background: 'rgba(255, 255, 255, 0.88)', 
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            borderRadius: '16px', 
            width: '290px', 
            boxShadow: '0 10px 30px rgba(0,0,0,0.12), 0 1px 8px rgba(0,0,0,0.05)',
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            textAlign: 'center',
            overflow: 'hidden',
            paddingTop: '20px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            animation: 'scaleIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
        >
          <div style={{ padding: '0 16px 18px 16px', width: '100%' }}>
            <h3 id="batch-ipad-modal-title" style={{ fontSize: '1.05rem', fontWeight: 600, color: '#000000', margin: '0 0 4px 0', letterSpacing: '-0.01em' }}>iPads hinzufügen</h3>
            <p style={{ fontSize: '0.82rem', color: '#3a3a3c', margin: '0 0 16px 0', lineHeight: '1.35', fontWeight: 400 }}>
              Wie viele iPads sollen der Reihe nach angelegt werden?
            </p>
            <input 
              type="number"
              aria-label="Anzahl der hinzuzufügenden iPads"
              min="1"
              max="50"
              value={batchiPadCount}
              onChange={e => setBatchiPadCount(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                border: '1px solid rgba(0, 0, 0, 0.15)',
                background: 'rgba(255, 255, 255, 0.65)',
                borderRadius: '8px',
                textAlign: 'center',
                fontSize: '1.05rem',
                fontWeight: 700,
                color: '#000000',
                outline: 'none',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)'
              }}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') executeBatchAddStations();
              }}
            />
          </div>
          <div style={{ display: 'flex', width: '100%', borderTop: '0.5px solid rgba(0, 0, 0, 0.15)' }}>
            <button 
              type="button" 
              onClick={() => setShowBatchiPadModal(null)} 
              style={{ 
                flex: 1, 
                height: '44px', 
                background: 'transparent', 
                border: 'none', 
                borderRight: '0.5px solid rgba(0, 0, 0, 0.15)', 
                color: '#007aff', 
                fontSize: '1.05rem', 
                fontWeight: 400, 
                cursor: 'pointer', 
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.1s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Abbrechen
            </button>
            <button 
              type="button" 
              onClick={executeBatchAddStations} 
              style={{ 
                flex: 1, 
                height: '44px', 
                background: 'transparent', 
                border: 'none', 
                color: '#007aff', 
                fontSize: '1.05rem', 
                fontWeight: 600, 
                cursor: 'pointer', 
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.1s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderStudentDetailModal = () => {
    if (!selectedStudent) return null;

    const activeWorkspace = typeof window !== 'undefined' 
      ? (sessionStorage.getItem('groovelab_active_workspace') || localStorage.getItem('groovelab_active_workspace')) 
      : null;
    const isTeacherMode = admin?.role === 'teacher' || activeWorkspace === 'teacher' || userId === 'teacher';

    return (
      <Suspense fallback={null}>
        <StudentDetailModal 
          student={selectedStudent} 
          onClose={() => setSelectedStudent(null)} 
          callerDashboard={isTeacherMode ? 'teacher' : 'admin'}
          onOpenBandProfile={(band) => {
            setEditingBand(band);
            setSelectedStudent(null);
          }}
          activePlatform={activePlatform === "campus" ? "campus" : "groovelab"}
          onSwitchPlatform={onSwitchPlatform}
        />
      </Suspense>
    );
  };




  const renderLogoutDialog = () => {
    if (!showLogoutConfirm) return null;
    return (
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-dialog-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowLogoutConfirm(false);
        }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      >
        <div style={{ background: 'white', padding: '32px', borderRadius: '32px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: '#fff1f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <LogOut size={32} />
          </div>
          <h3 id="logout-dialog-title" style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '8px', color: '#1e293b' }}>Abmelden?</h3>
          <p style={{ color: '#64748b', marginBottom: '32px', fontWeight: 500 }}>Bist du sicher, dass du das Admin-Dashboard verlassen möchtest?</p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => setShowLogoutConfirm(false)} style={{ flex: 1, padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white', color: '#1e293b', fontWeight: 700, cursor: 'pointer' }}>Abbrechen</button>
            <button onClick={handleLogout} style={{ flex: 1, padding: '16px', borderRadius: '16px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 800, cursor: 'pointer' }}>Ja, Abmelden</button>
          </div>
        </div>
      </div>
    );
  };
  return (
    <div 
      role="tabpanel"
      id={`admin-tabpanel-${activeTab}`}
      aria-label={`Admin Dashboard: ${activeTab}`}
      tabIndex={0}
      style={{ 
        flex: 1, 
        padding: hideHeader ? '0px' : (activeTab === 'live' ? (windowWidth <= 768 ? '0px' : '0px 10px 10px 10px') : (windowWidth <= 768 ? '0px' : '10px')), 
        overflowY: activeTab === 'live' ? (windowWidth <= 768 ? 'visible' : 'hidden') : 'auto',
        height: activeTab === 'live' ? (windowWidth <= 768 ? 'auto' : '100%') : 'auto',
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      width: '100%',
      overflowX: 'hidden'
    }}>
      {!hideHeader && activeTab !== 'live' && activeTab !== 'schedule' && (admin as any)?.schools?.limits_enabled && (
        <header style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', marginBottom: '24px', marginTop: '16px', gap: '20px', flexWrap: 'wrap' }}>
          {/* Quota Progress Indicators */}
          <div style={{ display: 'flex', gap: '20px', background: '#ffffff', padding: '12px 20px', borderRadius: '18px', border: '1.5px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.01)', flexWrap: 'wrap' }}>
            {[
              { label: 'Lehrkräfte', cur: teachers.length, max: (admin as any).schools.max_teachers ?? 2, color: '#3b82f6' },
              { label: 'Schüler', cur: students.length, max: (admin as any).schools.max_students ?? 6, color: '#34a853' }
            ].map((item, i) => {
              const pct = Math.min(100, (item.cur / item.max) * 100);
              const isClose = pct >= 90;
              const barColor = isClose ? '#ef4444' : item.color;
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '100px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 800, color: isClose ? '#ef4444' : '#64748b' }}>
                    <span>{item.label}</span>
                    <span>{item.cur}/{item.max}</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', borderRadius: '3px', background: '#f1f5f9', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: '3px', transition: 'width 0.3s ease' }}></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Herrenberg & DRV Audit Button */}
          <button
            type="button"
            onClick={async () => {
              try {
                const { generateStaffCouncilDeclarationPDF } = await import('../utils/staffCouncilDeclarationGenerator');
                await generateStaffCouncilDeclarationPDF({
                  schoolName: schoolObj?.name || admin?.school_name,
                  schoolAddress: schoolObj ? `${schoolObj.street || ''}, ${schoolObj.zip_code || ''} ${schoolObj.city || ''}`.trim() : undefined,
                  schoolSigneeName: schoolObj?.avv_signee_name,
                  schoolId: schoolObj?.id ? String(schoolObj.id) : admin?.school_id ? String(admin.school_id) : undefined
                });
              } catch (e) {
                console.error('Herrenberg PDF Generation Error:', e);
              }
            }}
            aria-label="Herrenberg- & DRV-Audit-Dossier herunterladen"
            title="Offizielles Dossier zur Weisungsfreiheit freier Honorarkräfte (BSG B 12 R 3/20 R) für Betriebsprüfungen der Rentenversicherung"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#f8fafc',
              color: '#334155',
              border: '1.5px solid #cbd5e1',
              padding: '10px 16px',
              borderRadius: '16px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            className="focus-ring"
            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.background = '#f1f5f9'; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
          >
            <span>🏛️</span>
            <span>Herrenberg-Dossier (DRV)</span>
          </button>

          {/* AVV Digital Sign Button */}
          <button
            type="button"
            onClick={() => setShowAVVModal(true)}
            aria-label="Auftragsverarbeitungsvertrag AVV verwalten"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: schoolObj?.avv_signed_at ? '#f0fdf4' : '#fef2f2',
              color: schoolObj?.avv_signed_at ? '#15803d' : '#dc2626',
              border: `1.5px solid ${schoolObj?.avv_signed_at ? '#bbf7d0' : '#fecaca'}`,
              padding: '10px 16px',
              borderRadius: '16px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            className="focus-ring"
          >
            <span>{schoolObj?.avv_signed_at ? '✅' : '📜'}</span>
            <span>{schoolObj?.avv_signed_at ? 'AVV unterzeichnet' : 'AVV unterzeichnen'}</span>
          </button>
        </header>
      )}

      {activeTab === 'schedule' ? (
        admin && (
          <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Lade Stundenplan...</div>}>
            <ScheduleBoard schoolId={admin.school_id} userId={userId} />
          </Suspense>
        )
      ) : activeTab === 'events' ? (
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Lade Termine &amp; Kalender...</div>}>
          <CampusEventsBoard 
            userId={userId}
            role={admin?.role || 'teacher'}
            schoolId={admin?.school_id || ''}
            supabase={supabase}
            brandColor={brandColor}
          />
        </Suspense>
      ) : activeTab === 'bands' ? (
        renderBandsTab()
      ) : activeTab === 'students' ? (
        renderStudentsTab()
      ) : activeTab === 'team' ? (
        renderTeachersTab()
      ) : activeTab === 'rooms' ? (
        renderRoomsTab()
      ) : activeTab === 'songs' ? (
        renderSongsTab()
      ) : activeTab === 'stats' ? (
        renderStatsTab()
      ) : activeTab === 'gallery' ? (
        renderIDGalleryTab()
      ) : activeTab === 'setup' ? (
        renderSetupTab()
      ) : activeTab === 'missions' ? (
        renderMissionsTab()
      ) : (
        renderLiveTab()
      )}

      {renderStudentDetailModal()}
      {deleteStudentModalData && (
        <Suspense fallback={null}>
          <ConfirmDeleteStudentModal
            isOpen={!!deleteStudentModalData}
            student={deleteStudentModalData}
            activePlatform={activePlatform === 'campus' ? 'campus' : activePlatform === 'groovelab' ? 'groovelab' : 'all'}
            onClose={() => setDeleteStudentModalData(null)}
            onConfirm={async (studentId) => {
              const res = await deleteStudentFully(studentId, {
                activePlatform: activePlatform === 'campus' ? 'campus' : activePlatform === 'groovelab' ? 'groovelab' : 'all',
                isCampusActive: deleteStudentModalData?.isCampusActive,
                isGroovelabActive: deleteStudentModalData?.isGroovelabActive
              });
              if (!res.success) {
                throw new Error(res.error);
              }
              setStudents(prev => prev.filter(s => s.id !== studentId));
            }}
          />
        </Suspense>
      )}
      
      {/* Personalisierbares Eltern-Informationsblatt (PDF) Modal */}
      {showParentInfoSheetModal && (
        <Suspense fallback={null}>
          <ParentInfoSheetModal
            isOpen={showParentInfoSheetModal}
            onClose={() => setShowParentInfoSheetModal(false)}
            schoolData={{
              name: schoolObj?.name || (admin?.schools ? (Array.isArray(admin.schools) ? admin.schools[0]?.name : admin.schools?.name) : '') || 'Unsere Musikschule',
              subdomain: schoolObj?.subdomain || '',
              logo_url: schoolObj?.logo_url || '',
              city: schoolObj?.city || '',
              student_billing_option: schoolObj?.student_billing_option || 'school_all',
              email: schoolObj?.email || admin?.email || ''
            }}
            activePlatformDefault={activePlatform === 'campus' ? 'campus' : activePlatform === 'groovelab' ? 'groovelab' : 'both'}
          />
        </Suspense>
      )}

      {selectedQRUser && (
        <Suspense fallback={null}>
          <AdminQRModal
            user={selectedQRUser}
            onClose={() => setSelectedQRUser(null)}
            activePlatform={activePlatform}
            admin={admin}
            schoolObj={schoolObj}
            showRealNames={showRealNames}
            supabase={supabase}
            onUserUpdated={(updatedUser) => {
              setSelectedQRUser(updatedUser);
              if (updatedUser.role === 'student') {
                setStudents(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
              } else {
                setTeachers(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
              }
            }}
          />
        </Suspense>
      )}
      {selectedTimetableStudent && (
        <Suspense fallback={null}>
          <StudentScheduleSlotsModal
            student={selectedTimetableStudent}
            onClose={() => setSelectedTimetableStudent(null)}
            onPreferencesSaved={() => {
              if (admin?.school_id) {
                supabase
                  .from('student_schedule_preferences')
                  .select('student_id, preference_type, day_of_week, start_time')
                  .then(({ data }) => {
                    if (data) {
                      const map: Record<string, any[]> = {};
                      data.forEach((p: any) => {
                        if (!map[p.student_id]) map[p.student_id] = [];
                        map[p.student_id].push(p);
                      });
                      setAllSchedulePreferences(map);
                    }
                  });
              }
              fetchData(true);
            }}
            activePlatform={activePlatform}
            teacherId={admin?.id}
            onOpenScheduleBoard={() => setActiveTab('schedule')}
          />
        </Suspense>
      )}
      {customizingRoom && (
        <Suspense fallback={null}>
          <AdminRoomLayoutModal
            room={customizingRoom}
            onClose={() => setCustomizingRoom(null)}
            stations={stations}
            setStations={setStations}
            rooms={rooms}
            setRooms={setRooms}
            kiosks={kiosks}
            supabase={supabase}
            activePlatform={activePlatform}
            brandColor={brandColor}
          />
        </Suspense>
      )}
      {renderBatchiPadModal()}
      {renderLogoutDialog()}

      {showAVVModal && (
        <Suspense fallback={null}>
          <AVVModal
            isOpen={showAVVModal}
            onClose={() => setShowAVVModal(false)}
            school={schoolObj || (admin?.schools ? (Array.isArray(admin.schools) ? admin.schools[0] : admin.schools) : null) || { id: admin?.school_id, name: admin?.first_name ? `${admin.first_name}'s Schule` : 'Musikschule' }}
            onAVVSigned={() => {
              const nowIso = new Date().toISOString();
              if (admin) {
                setAdmin((prev: any) => {
                  if (!prev) return prev;
                  const currentSchools = prev.schools;
                  let updatedSchools;
                  if (Array.isArray(currentSchools)) {
                    updatedSchools = currentSchools.map((s: any) => ({ ...s, avv_signed_at: nowIso }));
                  } else if (currentSchools && typeof currentSchools === 'object') {
                    updatedSchools = { ...currentSchools, avv_signed_at: nowIso };
                  } else {
                    updatedSchools = { id: prev.school_id, avv_signed_at: nowIso };
                  }
                  return {
                    ...prev,
                    schools: updatedSchools
                  };
                });
              }
              setShowAVVModal(false);
              fetchData(true);
            }}
          />
        </Suspense>
      )}


      {/* Notebook Song Detail Modal */}
      {selectedSongForDetail && (
        <Suspense fallback={null}>
          <AdminSongDetailModal
            song={selectedSongForDetail}
            onClose={() => setSelectedSongForDetail(null)}
            students={students}
            supabase={supabase}
            textbausteine={textbausteine}
            songLessonNotes={songLessonNotes}
            setSongLessonNotes={setSongLessonNotes}
            onSongUpdated={(updatedSong) => {
              setSongs(prev => prev.map(s => s.id === updatedSong.id ? updatedSong : s));
              setSelectedSongForDetail(updatedSong);
            }}
            onOpenTageskompass={(student) => {
              setSelectedStudentForTageskompass(student);
              setShowTageskompassModal(true);
            }}
          />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <AdminTextbausteinModal
          isOpen={showTextbausteinModal}
          onClose={() => setShowTextbausteinModal(false)}
          textbausteine={textbausteine}
          setTextbausteine={setTextbausteine}
          brandColor={brandColor}
          previewingTextbaustein={previewingTextbaustein}
          onClosePreview={() => setPreviewingTextbaustein(null)}
          copiedTbId={copiedTbId}
          setCopiedTbId={setCopiedTbId}
        />
      </Suspense>

      {showTageskompassModal && selectedStudentForTageskompass && (
        <Suspense fallback={null}>
          <MeisterwerkDocumentationModal
            student={{
              id: selectedStudentForTageskompass.id,
              first_name: selectedStudentForTageskompass.first_name,
              last_name: selectedStudentForTageskompass.last_name,
              photo_url: selectedStudentForTageskompass.photo_url || '/avatar_ghost.jpg',
              is_campus_active: selectedStudentForTageskompass.is_campus_active,
              school_id: selectedStudentForTageskompass.school_id || admin?.school_id
            }}
            onClose={() => {
              setShowTageskompassModal(false);
              setSelectedStudentForTageskompass(null);
              setInitialLehrwerkIdForTageskompass(null);
            }}
            teacherId={userId}
            initialLehrwerkId={initialLehrwerkIdForTageskompass || undefined}
            hasTresorStorage={checkIsAudioTresorActive(selectedStudentForTageskompass) || checkIsAudioTresorActive(admin)}
            onProfileClick={(student) => {
              setShowTageskompassModal(false);
              setSelectedStudentForTageskompass(null);
              setInitialLehrwerkIdForTageskompass(null);
              setSelectedStudent(student);
            }}
          />
        </Suspense>
      )}

      {showTeacherToolsModal && (
        <Suspense fallback={null}>
          <MeisterwerkDocumentationModal
            student={{
              id: 'teacher-self',
              first_name: admin?.first_name || 'Lehrer',
              last_name: admin?.last_name || '',
              photo_url: admin?.photo_url || '/campus_login_hero.png',
              is_campus_active: true,
              school_id: admin?.school_id
            }}
            onClose={() => setShowTeacherToolsModal(false)}
            teacherId={userId}
            isTeacherTools={true}
            hasTresorStorage={checkIsAudioTresorActive(admin)}
          />
        </Suspense>
      )}


      {/* Modals for Band Editing (Teacher Sonderrecht) */}
      {editingBand && (
        <div role="dialog" aria-modal="true" aria-label="Band bearbeiten" style={{ position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <form onSubmit={handleSaveBandEdit} className="glass-panel animation-slide-up" style={{ background: 'white', padding: '32px', borderRadius: '32px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Band bearbeiten</h2>
              <button 
                type="button" 
                onClick={() => setEditingBand(null)} 
                aria-label="Modal Band bearbeiten schließen"
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>Bandname</label>
                  <input required aria-label="Bandname" value={editingBand.name} onChange={e => setEditingBand({...editingBand, name: e.target.value})} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '6px', fontWeight: 700, background: '#f8fafc' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>Genre</label>
                  <input aria-label="Genre" value={editingBand.genre || ''} onChange={e => setEditingBand({...editingBand, genre: e.target.value})} placeholder="z.B. Rock, Pop" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '6px', fontWeight: 700, background: '#f8fafc' }} />
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>Bandcoach</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                    <input 
                      type="checkbox" 
                      checked={editingBand.coach_is_manual} 
                      onChange={e => setEditingBand({...editingBand, coach_is_manual: e.target.checked})} 
                    />
                    Manuell festlegen
                  </label>
                </div>
                
                <select 
                  aria-label="Bandcoach auswählen"
                  value={editingBand.coach_id || ''} 
                  onChange={e => setEditingBand({...editingBand, coach_id: e.target.value, coach_is_manual: true})}
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 700, background: 'white' }}
                >
                  <option value="">Kein Coach / Automatisch</option>
                  {teachers.filter(t => !t.is_observer).map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name || ''}</option>
                  ))}
                </select>
                <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '8px', fontWeight: 600 }}>
                  {editingBand.coach_is_manual 
                    ? 'Coach wurde manuell zugewiesen.' 
                    : 'Automatisch: Der Lehrer mit den meisten verifizierten Mitgliedern.'}
                </p>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Mitglieder verwalten</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(editingBand.band_members || []).map((m: any) => {
                    const u = Array.isArray(m.users) ? m.users[0] : m.users;
                    return (
                      <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                           <div style={{ width: '32px', height: '32px', borderRadius: '10px', overflow: 'hidden', background: m.user_id ? '#f1f5f9' : '#000000', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             {m.user_id ? (
                               <img src={resolveCampusAvatar(u, teachers, schedules)} alt={`${u?.first_name || 'Mitglied'} Avatar`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                             ) : (
                               <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: 900 }}>{m.external_name?.[0] || 'E'}</span>
                             )}
                           </div>
                           <div>
                             <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>
                               {m.user_id ? `${u?.first_name} ${u?.last_name || ''}` : m.external_name}
                             </div>
                             <div style={{ fontSize: '0.7rem', fontWeight: 700, color: brandColor, textTransform: 'uppercase' }}>{m.instrument}</div>
                           </div>
                         </div>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveMember(m.id)} 
                          aria-label={`Mitglied ${m.user_id ? `${u?.first_name} ${u?.last_name || ''}` : m.external_name} entfernen`}
                          title="Mitglied entfernen"
                          style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                  <button type="button" onClick={() => setShowAddMember(editingBand.id)} style={{ padding: '16px', borderRadius: '16px', border: '2px dashed #cbd5e1', background: 'transparent', color: brandColor, fontWeight: 800, cursor: 'pointer', marginTop: '4px' }}>
                    + Weiteren Schüler hinzufügen
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="submit" style={{ flex: 2, background: brandColor, color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 20px -5px rgba(0,0,0,0.1)' }}>Änderungen speichern</button>
                <button type="button" onClick={() => setEditingBand(null)} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 700, cursor: 'pointer' }}>Schließen</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Add Member Search Modal */}
      {showAddMember && (
        <div role="dialog" aria-modal="true" aria-label="Schüler suchen" style={{ position: 'fixed', inset: 0, zIndex: 6000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel animation-slide-up" style={{ background: 'white', padding: '32px', borderRadius: '32px', maxWidth: '450px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>Schüler suchen</h2>
              <button 
                onClick={() => setShowAddMember(null)} 
                aria-label="Dialog Schüler suchen schließen"
                title="Dialog schließen"
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>
            
            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                aria-label="Schüler nach Name suchen"
                placeholder="Name eingeben..." 
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                style={{ width: '100%', padding: '14px 14px 14px 40px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 700 }}
              />
            </div>

            <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px' }}>
              {(() => {
                const currentMemberIds = editingBand?.band_members?.map((m: any) => m.user_id) || [];
                return students.filter(s => 
                  !currentMemberIds.includes(s.id) &&
                  `${s.first_name} ${s.last_name}`.toLowerCase().includes(memberSearch.toLowerCase())
                ).map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={resolveCampusAvatar(s, teachers, schedules)} alt={`${s.first_name} ${s.last_name} Avatar`} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{s.first_name} {s.last_name}</div>
                   </div>
                   <select 
                     aria-label={`Instrument für ${s.first_name} ${s.last_name} auswählen`}
                     onChange={(e) => handleAddMember(showAddMember, s.id, e.target.value)}
                     defaultValue=""
                     style={{ padding: '8px', borderRadius: '10px', border: '1px solid #e2e8f0', fontWeight: 800, fontSize: '0.75rem', background: 'white' }}
                   >
                     <option value="" disabled>Instrument?</option>
                     {Object.keys(ADMIN_INSTRUMENT_ICONS).map(inst => <option key={inst} value={inst}>{inst}</option>)}
                   </select>
                </div>
                ));
              })()}
            </div>
            <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '24px', paddingTop: '24px' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px' }}>Externen Schüler hinzufügen</h4>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input 
                  placeholder="Name (z.B. Gesangsschülerin)" 
                  value={externalName}
                  onChange={e => setExternalName(e.target.value)}
                  style={{ flex: 2, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 700, background: '#f8fafc' }}
                />
                <select 
                  value={externalInstrument}
                  onChange={e => setExternalInstrument(e.target.value)}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 700, background: 'white' }}
                >
                  {Object.keys(INSTRUMENT_COLORS).map(inst => <option key={inst} value={inst}>{inst}</option>)}
                </select>
                <button 
                  type="button"
                  onClick={() => handleAddMember(showAddMember!, null, externalInstrument, externalName)}
                  disabled={!externalName}
                  style={{ padding: '0 20px', borderRadius: '12px', border: 'none', background: brandColor, color: 'white', fontWeight: 800, cursor: 'pointer', opacity: externalName ? 1 : 0.5 }}
                >
                  +
                </button>
              </div>
            </div>
            
            <button onClick={() => setShowAddMember(null)} style={{ width: '100%', marginTop: '20px', padding: '16px', borderRadius: '16px', border: 'none', background: '#f1f5f9', fontWeight: 700, cursor: 'pointer' }}>Abbrechen</button>
          </div>
        </div>
      )}
    </div>
  );
}

function IDGallery({ users, brandColor, onShowQR, activePlatform }: { users: any[], brandColor: string, onShowQR: (user: any) => void, activePlatform?: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'teacher' | 'student' | 'vocalist'>('all');
  const [selectedPrintIds, setSelectedPrintIds] = useState<Record<string, boolean>>({});

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    
    if (filterType === 'all') {
      return true;
    } else if (filterType === 'teacher') {
      return u.role === 'teacher' || u.role === 'admin';
    } else if (filterType === 'student') {
      return u.role === 'student' && !u.is_external_vocalist;
    } else if (filterType === 'vocalist') {
      return u.is_external_vocalist;
    }
    return true;
  });

  const toggleSelectForPrint = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPrintIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const selectAllForPrint = () => {
    const next: Record<string, boolean> = {};
    filteredUsers.forEach(u => {
      next[u.id] = true;
    });
    setSelectedPrintIds(next);
  };

  const clearAllForPrint = () => {
    setSelectedPrintIds({});
  };

  const selectedUsers = filteredUsers.filter(u => selectedPrintIds[u.id]);
  const selectedCount = selectedUsers.length;
  const pageCount = Math.ceil(selectedCount / 9);

  return (
    <div style={{ marginTop: '0px' }}>
      <style>{`
        .id-card-hover {
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .id-card-hover:hover {
          transform: translateY(-12px) scale(1.02);
          box-shadow: 0 30px 60px rgba(0,0,0,0.15) !important;
          z-index: 10;
        }

        #print-id-cards-container {
          display: none !important;
        }

        @media print {
          #root {
            display: none !important;
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          
          #print-id-cards-container {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-shadow: none !important;
          }

          #print-id-cards-container img {
            opacity: 1 !important;
          }

          .print-page {
            width: 210mm !important;
            height: 297mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-sizing: border-box !important;
            padding: 15mm 15mm !important;
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            grid-template-rows: repeat(3, 1fr) !important;
            gap: 12px !important;
            background: white !important;
          }

          .print-page:not(:last-child) {
            page-break-after: always !important;
            break-after: page !important;
          }

          .print-card-wrapper {
            box-sizing: border-box !important;
            border: 1px dashed #cbd5e1 !important;
            padding: 6px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: white !important;
          }
        }
      `}</style>
      
      <div className="glass-panel" style={{ padding: '40px', background: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(20px)', borderRadius: '32px', border: '1px solid rgba(255, 255, 255, 0.3)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)' }}>
         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '48px' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', marginBottom: '8px', letterSpacing: '-0.03em' }}>ID Gallerie</h2>
            <p style={{ color: '#64748b', fontWeight: 500 }}>Vollständige Galerie aller Lehrer und Schüler im Event-Stil.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            {/* Filter Switch */}
            <div style={{ background: 'rgba(241, 245, 249, 0.8)', padding: '4px', borderRadius: '14px', display: 'flex', gap: '4px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
              {[
                { type: 'all', label: 'Alle' },
                { type: 'teacher', label: 'Lehrer' },
                { type: 'student', label: 'Schüler' },
                { type: 'vocalist', label: 'Gesangsschüler' }
              ].map(opt => (
                <button 
                  key={opt.type}
                  onClick={() => setFilterType(opt.type as any)}
                  style={{ 
                    padding: '8px 16px', 
                    borderRadius: '10px', 
                    border: 'none', 
                    background: filterType === opt.type ? 'white' : 'transparent',
                    color: filterType === opt.type ? '#1e293b' : '#94a3b8',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    boxShadow: filterType === opt.type ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: '250px' }}>
              <Search size={20} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Name suchen..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '12px 12px 12px 48px', 
                  borderRadius: '14px', 
                  border: '1px solid rgba(255,255,255,0.5)', 
                  background: 'rgba(255,255,255,0.8)',
                  color: '#1e293b',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  outline: 'none'
                }} 
              />
            </div>
          </div>
        </div>
        
        <div className="id-gallery-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '32px' }}>
          {filteredUsers.map(u => (
            <IDBadgeCard 
              key={u.id}
              user={u} 
              activePlatform={activePlatform} 
              selectedPrint={selectedPrintIds[u.id]} 
              onToggleSelectPrint={(e) => toggleSelectForPrint(u.id, e)} 
              onClick={() => onShowQR(u)} 
              style={{ width: '100%', height: 'auto', aspectRatio: '0.62', cursor: 'pointer' }} 
              showSubtext={false} 
            />
          ))}
        </div>
      </div>

      {/* Floating Action Panel for printing */}
      {selectedCount > 0 && (
        <div 
          role="toolbar"
          aria-label="Aktionen für ausgewählte Ausweise"
          style={{
          position: 'fixed',
          bottom: '32px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '16px 28px',
          borderRadius: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          zIndex: 9999,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
          color: 'white',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <style>{`
            @keyframes slideUp {
              from { transform: translate(-50%, 50px); opacity: 0; }
              to { transform: translate(-50%, 0); opacity: 1; }
            }
          `}</style>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>
              {selectedCount} {selectedCount === 1 ? 'Ausweis' : 'Ausweise'} ausgewählt
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
              Benötigt {pageCount} {pageCount === 1 ? 'DIN A4 Seite' : 'DIN A4 Seiten'}
            </span>
          </div>

          <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.1)' }} />

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={selectAllForPrint}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#f8fafc',
                padding: '10px 16px',
                borderRadius: '12px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
            >
              Alle auswählen
            </button>
            
            <button
              onClick={clearAllForPrint}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                padding: '10px 16px',
                borderRadius: '12px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#f1f5f9'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
            >
              Auswahl aufheben
            </button>

            <button
              onClick={() => window.print()}
              style={{
                background: '#ea4335',
                border: 'none',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '12px',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(234, 67, 53, 0.3)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#d93025'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#ea4335'}
            >
              <Printer size={16} />
              Drucken
            </button>

            <button
              onClick={clearAllForPrint}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                color: '#cbd5e1',
                padding: '10px',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Hidden Print Container */}
      {selectedCount > 0 && createPortal(
        <div id="print-id-cards-container">
          {Array.from({ length: pageCount }).map((_, pageIdx) => {
            const pageUsers = selectedUsers.slice(pageIdx * 9, (pageIdx + 1) * 9);
            return (
              <div key={pageIdx} className="print-page">
                {pageUsers.map(u => {
                  const isQRAdminOrSec = u.role === 'admin' || u.role === 'secretary';
                  const cardHeaderColor = isQRAdminOrSec ? '#ea4335' : (u.role === 'student' ? '#eab308' : '#34a853');
                  const cardBadgeLabel = isQRAdminOrSec ? 'Admin / Control' : (u.role === 'student' ? 'Member Access' : 'Staff / Coach');
                  return (
                    <div key={u.id} className="print-card-wrapper">
                      <IDBadgeCard 
                        user={u} 
                        activePlatform={activePlatform} 
                        isPrintVersion={true}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

function DeviceSetupScreen({ 
  rooms, 
  stations, 
  brandColor = '#eab308', 
  activeSessions, 
  students, 
  school,
  admin,
  kiosks,
  onUpdate,
  onCleanupPlanning,
  onResetPlanning,
  activePlatform = 'groovelab'
}: { 
  rooms: any[], 
  stations: any[], 
  brandColor?: string, 
  activeSessions: any[], 
  students: any[], 
  school: any,
  admin: any,
  kiosks: any[],
  onUpdate: () => void,
  onCleanupPlanning: () => void,
  onResetPlanning: () => void,
  activePlatform?: 'campus' | 'groovelab'
}) {
  const [activeGrooveSettingsModal, setActiveGrooveSettingsModal] = useState<'hours' | 'security' | 'devices' | 'analytics' | 'maintenance' | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState(() => rooms[0]?.id || '');
  const effectiveSchool = Array.isArray(school) ? school[0] : school;
  const isMobile = typeof window !== 'undefined' && (window.innerWidth <= 1024 || Boolean(typeof document !== 'undefined' && document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait, .sim-viewport-tablet, .sim-viewport-landscape, .sim-viewport-iphone14, [class*="sim-viewport-mobile"], [class*="sim-viewport-tablet"]')));

  // Academy Setup state
  const [name, setName] = useState(effectiveSchool?.name || '');
  const [lat, setLat] = useState(effectiveSchool?.latitude?.toString() || '');
  const [lng, setLng] = useState(effectiveSchool?.longitude?.toString() || '');
  const [radius, setRadius] = useState(effectiveSchool?.geofence_radius_meters?.toString() || '100');
  const [hours, setHours] = useState<any>(effectiveSchool?.opening_hours || {
    monday: { start: '08:00', end: '20:00', active: true },
    tuesday: { start: '08:00', end: '20:00', active: true },
    wednesday: { start: '08:00', end: '20:00', active: true },
    thursday: { start: '08:00', end: '20:00', active: true },
    friday: { start: '08:00', end: '20:00', active: true },
    saturday: { start: '10:00', end: '16:00', active: false },
    sunday: { start: '10:00', end: '16:00', active: false }
  });
  const [initialConfig, setInitialConfig] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedKioskLink, setCopiedKioskLink] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isHelpCenterOpen, setIsHelpCenterOpen] = useState(false);
  const [kioskPin, setKioskPin] = useState<string>(effectiveSchool?.groovelab_kiosk_pin || '1234');
  const [showKioskPin, setShowKioskPin] = useState(false);
  const [isSavingKioskPin, setIsSavingKioskPin] = useState(false);
  const [kioskPinSavedFeedback, setKioskPinSavedFeedback] = useState(false);

  useEffect(() => {
    if (effectiveSchool?.id) {
      const fetchPin = async () => {
        try {
          const { data, error } = await supabase.rpc('get_groovelab_kiosk_pin', { p_school_id: effectiveSchool.id });
          if (!error && data) {
            setKioskPin(data);
          } else if (effectiveSchool?.groovelab_kiosk_pin) {
            setKioskPin(effectiveSchool.groovelab_kiosk_pin);
          }
        } catch {
          if (effectiveSchool?.groovelab_kiosk_pin) {
            setKioskPin(effectiveSchool.groovelab_kiosk_pin);
          }
        }
      };
      fetchPin();
    }
  }, [effectiveSchool?.id]);

  const handleSaveKioskPin = async (customPin?: string) => {
    const pinToSave = (customPin !== undefined ? customPin : kioskPin).trim();
    if (!/^[0-9]{4}$/.test(pinToSave)) {
      alert('Der Terminal-PIN muss genau 4 Ziffern (0000-9999) enthalten.');
      return;
    }
    if (!effectiveSchool?.id) {
      alert('Fehler: Keine Schul-ID gefunden.');
      return;
    }
    setIsSavingKioskPin(true);
    try {
      const { error: rpcErr } = await supabase.rpc('set_groovelab_kiosk_pin', {
        p_school_id: effectiveSchool.id,
        p_pin: pinToSave
      });
      if (rpcErr) {
        const { error: updateErr } = await supabase
          .from('schools')
          .update({ groovelab_kiosk_pin: pinToSave })
          .eq('id', effectiveSchool.id);
        if (updateErr) throw updateErr;
      }
      setKioskPin(pinToSave);
      setKioskPinSavedFeedback(true);
      setTimeout(() => setKioskPinSavedFeedback(false), 2500);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      alert('Fehler beim Speichern des Terminal-PINs: ' + (err.message || err));
    } finally {
      setIsSavingKioskPin(false);
    }
  };

  const handleGenerateRandomPin = () => {
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    setKioskPin(newPin);
  };

  useEffect(() => {
    if (rooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

  useEffect(() => {
    if (effectiveSchool) {
      setName(effectiveSchool.name || '');
      const sLat = effectiveSchool.latitude?.toString() || '';
      const sLng = effectiveSchool.longitude?.toString() || '';
      const sRadius = effectiveSchool.geofence_radius_meters?.toString() || '100';
      const sHours = effectiveSchool.opening_hours || {
        monday: { start: '08:00', end: '20:00', active: true },
        tuesday: { start: '08:00', end: '20:00', active: true },
        wednesday: { start: '08:00', end: '20:00', active: true },
        thursday: { start: '08:00', end: '20:00', active: true },
        friday: { start: '08:00', end: '20:00', active: true },
        saturday: { start: '10:00', end: '16:00', active: false },
        sunday: { start: '10:00', end: '16:00', active: false }
      };

      setLat(sLat);
      setLng(sLng);
      setRadius(sRadius);
      setHours(sHours);
      setInitialConfig({
        hours: JSON.parse(JSON.stringify(sHours)),
        lat: sLat,
        lng: sLng,
        radius: sRadius
      });
    }
  }, [effectiveSchool]);

  const isSettingsDirty = React.useMemo(() => {
    if (!initialConfig) return false;
    return (
      JSON.stringify(hours) !== JSON.stringify(initialConfig.hours) ||
      lat !== initialConfig.lat ||
      lng !== initialConfig.lng ||
      radius !== initialConfig.radius
    );
  }, [initialConfig, hours, lat, lng, radius]);

  const days = [
    { id: 'monday', label: 'Montag' },
    { id: 'tuesday', label: 'Dienstag' },
    { id: 'wednesday', label: 'Mittwoch' },
    { id: 'thursday', label: 'Donnerstag' },
    { id: 'friday', label: 'Freitag' },
    { id: 'saturday', label: 'Samstag' },
    { id: 'sunday', label: 'Sonntag' }
  ];

  const handleSaveAcademy = async () => {
    if (!effectiveSchool?.id) {
      alert('Fehler: Keine Schul-ID gefunden.');
      return;
    }
    setIsSaving(true);
    const { error } = await supabase
      .from('schools')
      .update({ 
        name, 
        opening_hours: hours,
        latitude: lat ? Number(lat) : null,
        longitude: lng ? Number(lng) : null,
        geofence_radius_meters: radius ? Number(radius) : 100
      })
      .eq('id', effectiveSchool.id);
    
    setIsSaving(false);
    if (error) {
      alert('Fehler: ' + error.message);
    } else {
      setInitialConfig({
        hours: JSON.parse(JSON.stringify(hours)),
        lat,
        lng,
        radius
      });
      alert('GrooveLab-Einstellungen erfolgreich gespeichert! 🌟');
      onUpdate();
    }
  };

  const handleExportAllPresenceCSV = async () => {
    const schoolId = effectiveSchool?.id || admin?.school_id;
    if (!schoolId) {
      alert('Fehler: Keine Schul-ID gefunden.');
      return;
    }

    try {
      const { data: sessData, error } = await supabase
        .from('sessions')
        .select('*, users!inner(first_name, last_name, role, school_id), stations(name)')
        .eq('users.school_id', schoolId)
        .order('check_in_time', { ascending: false });

      if (error) {
        alert('Fehler beim Laden der Daten: ' + error.message);
        return;
      }

      if (!sessData || sessData.length === 0) {
        alert('Keine Anwesenheitsdaten zum Exportieren gefunden.');
        return;
      }

      const getCW = (date: Date) => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return `KW ${weekNo} (${d.getUTCFullYear()})`;
      };

      const headers = ['Name', 'Rolle', 'Kalenderwoche', 'Datum', 'Station', 'Check-In', 'Check-Out', 'Dauer (Minuten)'];
      const rows = sessData.map((s: any) => {
        const u = s.users;
        const nameStr = `${u?.first_name || ''} ${u?.last_name || ''}`.trim();
        const roleStr = u?.role === 'student' ? 'Schüler' : u?.role === 'teacher' ? 'Lehrer' : u?.role || 'Unbekannt';
        const checkIn = new Date(s.check_in_time);
        const kw = getCW(checkIn);
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

        return [nameStr, roleStr, kw, datum, station, checkInTime, checkOutTime, durationMins];
      });

      const fileName = `Anwesenheiten_Gesamt_${new Date().toISOString().slice(0, 10)}.csv`;
      downloadCsvFile(fileName, headers, rows, ';');

      logSecurityEvent({
        action: 'EXPORT_PRESENCE_CSV',
        schoolId,
        metadata: { rowCount: rows.length, fileName }
      });
    } catch (err: any) {
      alert('Export-Fehler: ' + err.message);
    }
  };

  const roomStations = stations.filter(s => s.room_id === selectedRoomId);
  const activeRoom = rooms.find(r => r.id === selectedRoomId) || rooms[0];
  const activeKiosk = activeRoom ? (kiosks || []).find(k => k.room_id === activeRoom.id && !k.station_id) : null;
  const roomKioskUrl = activeKiosk 
    ? `${window.location.origin}/?kiosk_token=${activeKiosk.secret_token}` 
    : (activeRoom ? `${window.location.origin}/?kiosk_room_id=${activeRoom.id}` : '');

  const getStationByNumber = (num: number) => {
    return roomStations.find(s => {
      const name = s.name || '';
      const lower = name.toLowerCase();
      return lower === `ipad ${num}` || lower === `ipad${num}`;
    });
  };

  const lehrerStation = roomStations.find(s => {
    const name = s.name || '';
    const lower = name.toLowerCase();
    return lower.includes('lehrer') || lower.includes('teacher');
  });

  const renderStationCell = (station: any, defaultName: string, isLarge = false) => {
    if (!station) {
      return (
        <div style={{
          background: '#f8fafc',
          border: '2px dashed #cbd5e1',
          borderRadius: '24px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100px',
          color: '#94a3b8',
          fontSize: '0.75rem',
          fontWeight: 800,
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <div style={{ opacity: 0.6, fontSize: '1.2rem', marginBottom: '4px' }}>📴</div>
          {defaultName} (nicht aktiv)
        </div>
      );
    }

    const activeSession = activeSessions.find(s => s.station_id === station.id);
    const isCurrentDevice = localStorage.getItem('groovelab_station_id') === station.id;

    return (
      <div 
        onClick={async () => {
          if (isCurrentDevice) return;
          if (window.confirm(`Möchtest du dieses iPad fest für "${station.name}" konfigurieren?`)) {
            localStorage.setItem('groovelab_station_id', station.id);
            window.location.reload();
          }
        }}
        style={{
          background: isCurrentDevice 
            ? 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)' 
            : 'white',
          border: isCurrentDevice 
            ? `3px solid ${brandColor}` 
            : '2px solid #f1f5f9',
          borderRadius: '24px',
          padding: '16px',
          minHeight: '110px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          cursor: isCurrentDevice ? 'default' : 'pointer',
          boxShadow: isCurrentDevice 
            ? `0 12px 24px -10px ${brandColor}30, 0 4px 6px -2px ${brandColor}10` 
            : '0 4px 20px -2px rgba(148, 163, 184, 0.06), 0 2px 4px -1px rgba(148, 163, 184, 0.03)',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isCurrentDevice ? 'none' : 'translateY(0px)',
          userSelect: 'none'
        }}
      >
        {isCurrentDevice && (
          <div style={{
            position: 'absolute',
            top: '-10px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: `linear-gradient(135deg, ${brandColor} 0%, #f59e0b 100%)`,
            color: 'white',
            fontSize: '0.6rem',
            fontWeight: 1000,
            padding: '3px 12px',
            borderRadius: '20px',
            boxShadow: `0 4px 8px ${brandColor}40`,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
            letterSpacing: '0.05em'
          }}>
            <span>✨</span> DIESES IPAD <span>✨</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
               width: '32px',
               height: '32px',
               borderRadius: '10px',
               background: isCurrentDevice ? `${brandColor}15` : `${getStationColor(station.name, station.color)}15`,
               color: isCurrentDevice ? brandColor : getStationColor(station.name, station.color),
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               fontSize: '1rem',
               transition: 'all 0.2s'
            }}>
              <Tablet size={16} />
            </div>
            <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#1e293b' }}>
              {station.name}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 800,
              color: activeSession ? '#34a853' : '#64748b',
              background: activeSession ? '#e6f4ea' : '#f1f5f9',
              padding: '2px 8px',
              borderRadius: '12px'
            }}>
              {activeSession ? 'Besetzt' : 'Frei'}
            </span>
          </div>
        </div>

        <div style={{ 
          margin: '10px 0', 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          background: activeSession ? '#f8fafc' : 'transparent',
          borderRadius: '16px',
          padding: activeSession ? '8px 12px' : '0 12px',
          border: activeSession ? '1px solid #f1f5f9' : 'none'
        }}>
          {activeSession ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundImage: `url(${activeSession.profiles?.photo_url || '/avatar_ghost.jpg'})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundColor: '#cbd5e1',
                border: '2px solid white',
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
              }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', lineHeight: 1.2 }}>
                  {activeSession.profiles?.first_name} {maskLastName(activeSession.profiles?.last_name)}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>
                  am Üben...
                </div>
              </div>
            </div>
          ) : (
            <span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 700, fontStyle: 'italic' }}>
              Zum Koppeln tippen
            </span>
          )}
        </div>

        <div style={{ width: '100%' }}>
          {isCurrentDevice ? (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (window.confirm("Dieses iPad wirklich entkoppeln und in den Mobil-Modus versetzen?")) {
                  localStorage.removeItem('groovelab_station_id');
                  window.location.reload();
                }
              }}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '12px',
                border: 'none',
                background: '#fee2e2',
                color: '#ef4444',
                fontSize: '0.75rem',
                fontWeight: 900,
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <span>🔌</span> Kopplung aufheben
            </button>
          ) : (
            <div style={{
              width: '100%',
              padding: '8px',
              borderRadius: '12px',
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              color: '#64748b',
              fontSize: '0.75rem',
              fontWeight: 800,
              textAlign: 'center',
              transition: 'all 0.15s'
            }}>
              Koppeln
            </div>
          )}
        </div>
      </div>
    );
  };

  const modules = [
    {
      id: 'hours',
      title: 'Betriebszeiten & Studio-Zeiten',
      subtitle: hours.enforce_hours !== false ? 'Strikte Öffnungszeiten aktiv' : 'Flexible Öffnungszeiten',
      badge: hours.enforce_hours !== false ? 'Strikte Zeiten' : 'Flexibel',
      gradient: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
      shadowColor: 'rgba(234, 179, 8, 0.35)',
      icon: Clock
    },
    {
      id: 'security',
      title: 'Geofencing & Login-Schutz',
      subtitle: hours.geofence_bypass !== true ? `${radius || 100}m Geofence aktiv` : 'Bypass Aktiv',
      badge: hours.geofence_bypass !== true ? `${radius || 100}m Radius` : 'Bypass',
      gradient: 'linear-gradient(135deg, #facc15 0%, #d97706 100%)',
      shadowColor: 'rgba(250, 204, 21, 0.40)',
      icon: ShieldCheck
    },
    {
      id: 'devices',
      title: 'Kiosk-Geräte & Stations-Setup',
      subtitle: `${rooms.length} ${rooms.length === 1 ? 'Raum' : 'Räume'} • ${stations.length} Stationen`,
      badge: `${stations.length} iPads konfiguriert`,
      gradient: 'linear-gradient(135deg, #ca8a04 0%, #854d0e 100%)',
      shadowColor: 'rgba(202, 138, 4, 0.40)',
      icon: Monitor
    },
    {
      id: 'analytics',
      title: 'Anwesenheit & Protokolle',
      subtitle: 'Check-Ins & Probenhistorie (CSV)',
      badge: 'Export',
      gradient: 'linear-gradient(135deg, #eab308 0%, #a16207 100%)',
      shadowColor: 'rgba(234, 179, 8, 0.35)',
      icon: Activity
    },
    {
      id: 'maintenance',
      title: 'Systemwartung & Bereinigung',
      subtitle: 'Wochenplan bereinigen & Reset',
      badge: 'Wartung',
      gradient: 'linear-gradient(135deg, #eab308 0%, #854d0e 100%)',
      shadowColor: 'rgba(234, 179, 8, 0.35)',
      icon: AlertCircle
    },
    {
      id: 'feedback',
      title: 'Ideenschmiede',
      subtitle: 'Song-Wünsche & Feedback melden',
      badge: 'Mitgestalten',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
      shadowColor: 'rgba(245, 158, 11, 0.35)',
      icon: Lightbulb
    }
  ];

  return (
    <div style={{ marginTop: '0px', display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', boxSizing: 'border-box' }}>
      <div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 1000, color: '#0f172a', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: '#fefce8', border: '1px solid #fef08a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ca8a04' }}>
            <Sliders size={22} strokeWidth={2.4} />
          </div>
          <span>GrooveLab-Einstellungen</span>
        </h2>
        <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 600, textAlign: 'left' }}>
          Konfiguriere Betriebszeiten, Geofencing &amp; Standort-Sicherheit, Kiosk-Proberäume und Systemwartung für dein Studio.
        </p>
      </div>

      {/* MODULAR COVER CARDS GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '18px',
        width: '100%'
      }}>
        {modules.map((module) => {
          const IconComp = module.icon;
          return (
            <div
              key={module.id}
              onClick={() => {
                if (module.id === 'feedback') {
                  setIsFeedbackModalOpen(true);
                } else {
                  setActiveGrooveSettingsModal(module.id as any);
                }
              }}
              style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '20px',
                padding: '24px 16px 20px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative',
                overflow: 'hidden'
              }}
              className="hover-scale"
            >
              {/* Square Cover Icon Box */}
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: module.gradient,
                boxShadow: `0 8px 18px -3px ${module.shadowColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.25)'
              }}>
                <IconComp size={30} color="#ffffff" strokeWidth={2.3} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }} />
              </div>

              {/* Title & Subtitle */}
              <div style={{ marginTop: '14px', padding: '0 4px', width: '100%' }}>
                <div style={{ fontSize: '0.92rem', fontWeight: 850, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                  {module.title}
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginTop: '3px', lineHeight: '1.3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {module.subtitle}
                </div>
              </div>

              {/* Status Badge */}
              {module.badge && (
                <span style={{
                  marginTop: '10px',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  color: '#ca8a04',
                  background: '#fefce8',
                  border: '1px solid #fef08a',
                  padding: '2px 8px',
                  borderRadius: '100px'
                }}>
                  {module.badge}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* PERSISTENT BOTTOM SAVE BAR (IF DIRTY) */}
      {isSettingsDirty && (
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: isMobile ? '10px' : '0',
          padding: isMobile ? '12px 16px' : '16px 32px',
          border: '1px solid #fef08a',
          background: '#fefce8',
          borderRadius: isMobile ? '16px' : '20px',
          boxSizing: 'border-box',
          width: '100%',
          boxShadow: '0 4px 16px rgba(234, 179, 8, 0.15)'
        }}>
          <span style={{ fontSize: '0.82rem', color: '#854d0e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚠️ Ungespeicherte Änderungen an den GrooveLab-Einstellungen vorhanden.
          </span>
          <button
            onClick={handleSaveAcademy}
            disabled={isSaving}
            style={{
              padding: '10px 24px',
              width: isMobile ? '100%' : 'auto',
              background: '#eab308',
              color: '#0f172a',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 900,
              fontSize: '0.84rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(234, 179, 8, 0.35)',
              transition: 'all 0.2s',
              opacity: isSaving ? 0.7 : 1
            }}
            className="hover-scale"
          >
            {isSaving ? 'Wird gespeichert...' : 'Einstellungen speichern'}
          </button>
        </div>
      )}

      {/* QUICK LINK: HANDBUCH & AKADEMIE */}
      <div style={{ 
        background: '#fefce8', 
        borderRadius: '20px', 
        padding: '18px 24px', 
        border: '1.5px solid #fef08a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: '#eab308', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={20} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 900, color: '#713f12' }}>
              Leitfäden &amp; Akademie (Offizielles Handbuch)
            </h4>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#854d0e' }}>
              Schritt-für-Schritt-Anleitungen für Schulleitung, Kollegium und Band-Coaches sowie FAQ.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsHelpCenterOpen(true)}
          style={{
            background: '#eab308',
            color: '#0f172a',
            border: 'none',
            padding: '9px 18px',
            borderRadius: '10px',
            fontWeight: 800,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(234, 179, 8, 0.25)',
            transition: 'all 0.15s'
          }}
          className="hover-scale"
        >
          <BookOpen size={14} /> Leitfäden öffnen
        </button>
      </div>

      {/* FOCUS MODALS FOR GROOVELAB SETTINGS */}
      {activeGrooveSettingsModal && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-label="GrooveLab Einstellungen"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxSizing: 'border-box'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveGrooveSettingsModal(null);
          }}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: activeGrooveSettingsModal === 'devices' ? '920px' : activeGrooveSettingsModal === 'hours' ? '760px' : '620px',
              maxHeight: '90vh',
              background: '#ffffff',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.8)',
              boxShadow: '0 25px 60px -12px rgba(15, 23, 42, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
            className="animate-scale-in"
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(234, 179, 8, 0.3)'
                }}>
                  {activeGrooveSettingsModal === 'hours' && <Clock size={22} color="#ffffff" />}
                  {activeGrooveSettingsModal === 'security' && <ShieldCheck size={22} color="#ffffff" />}
                  {activeGrooveSettingsModal === 'devices' && <Monitor size={22} color="#ffffff" />}
                  {activeGrooveSettingsModal === 'analytics' && <Activity size={22} color="#ffffff" />}
                  {activeGrooveSettingsModal === 'maintenance' && <AlertCircle size={22} color="#ffffff" />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                    {activeGrooveSettingsModal === 'hours' && 'Betriebszeiten & Studio-Zeiten'}
                    {activeGrooveSettingsModal === 'security' && 'Geofencing & Login-Schutz'}
                    {activeGrooveSettingsModal === 'devices' && 'Kiosk-Geräte & Stations-Setup'}
                    {activeGrooveSettingsModal === 'analytics' && 'Anwesenheit & Check-In Protokolle'}
                    {activeGrooveSettingsModal === 'maintenance' && 'Systemwartung & Bereinigung'}
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>
                    {activeGrooveSettingsModal === 'hours' && 'Öffnungszeiten und Login-Regeln für das GrooveLab Studio.'}
                    {activeGrooveSettingsModal === 'security' && 'Standort-Validierung (Geofence) und Sicherheitsregeln konfigurieren.'}
                    {activeGrooveSettingsModal === 'devices' && 'Kiosk-iPads den GrooveLab-Stationen zuweisen und verwalten.'}
                    {activeGrooveSettingsModal === 'analytics' && 'Anwesenheits- und Probenprotokolle aller Band-Mitglieder herunterladen.'}
                    {activeGrooveSettingsModal === 'maintenance' && 'Scheduler-Datenleichen bereinigen und Semester-Resets vornehmen.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveGrooveSettingsModal(null)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                className="hover-scale"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(85vh - 140px)', textAlign: 'left' }}>
              
              {/* TAB 1: BETRIEBSZEITEN */}
              {activeGrooveSettingsModal === 'hours' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Mode Selector */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                    <button 
                      type="button"
                      onClick={() => setHours({ ...hours, enforce_hours: true })}
                      style={{ 
                        padding: '14px',
                        borderRadius: '14px',
                        border: `2px solid ${hours.enforce_hours !== false ? '#eab308' : '#e2e8f0'}`,
                        background: hours.enforce_hours !== false ? '#fefce8' : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s'
                      }}
                      className="hover-scale"
                    >
                      <div style={{ fontWeight: 850, fontSize: '0.88rem', color: hours.enforce_hours !== false ? '#ca8a04' : '#1e293b', marginBottom: '3px' }}>Strikte Öffnungszeiten</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.35 }}>Login mit Geotracking NUR innerhalb der Öffnungszeiten erlaubt.</div>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setHours({ ...hours, enforce_hours: false })}
                      style={{ 
                        padding: '14px',
                        borderRadius: '14px',
                        border: `2px solid ${hours.enforce_hours === false ? '#eab308' : '#e2e8f0'}`,
                        background: hours.enforce_hours === false ? '#fefce8' : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s'
                      }}
                      className="hover-scale"
                    >
                      <div style={{ fontWeight: 850, fontSize: '0.88rem', color: hours.enforce_hours === false ? '#ca8a04' : '#1e293b', marginBottom: '3px' }}>Flexible Öffnungszeiten</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.35 }}>Login mit Geotracking AUCH außerhalb der Zeiten erlaubt.</div>
                    </button>
                  </div>

                  {/* 7 Days Table */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '18px', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                      Wochenübersicht (Mo – So)
                    </div>
                    {days.map((day, idx) => {
                      const isActive = hours[day.id]?.active !== false;
                      return (
                        <div
                          key={day.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                            borderBottom: idx < days.length - 1 ? '1px solid #f1f5f9' : 'none',
                            opacity: isActive ? 1 : 0.6,
                            transition: 'opacity 0.2s',
                            gap: '12px'
                          }}
                        >
                          <div style={{ width: '110px', fontWeight: 800, color: '#1e293b', fontSize: '0.86rem', flexShrink: 0 }}>
                            {day.label}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                            <input
                              type="time"
                              value={hours[day.id]?.start || '08:00'}
                              disabled={!isActive}
                              onChange={e => setHours({...hours, [day.id]: {...(hours[day.id] || {}), active: isActive, start: e.target.value}})}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                background: isActive ? '#ffffff' : '#f1f5f9',
                                fontWeight: 700,
                                fontSize: '0.84rem',
                                color: isActive ? '#1e293b' : '#94a3b8',
                                outline: 'none',
                                width: '90px'
                              }}
                            />
                            <span style={{ color: '#94a3b8', fontWeight: 600 }}>–</span>
                            <input
                              type="time"
                              value={hours[day.id]?.end || '20:00'}
                              disabled={!isActive}
                              onChange={e => setHours({...hours, [day.id]: {...(hours[day.id] || {}), active: isActive, end: e.target.value}})}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                background: isActive ? '#ffffff' : '#f1f5f9',
                                fontWeight: 700,
                                fontSize: '0.84rem',
                                color: isActive ? '#1e293b' : '#94a3b8',
                                outline: 'none',
                                width: '90px'
                              }}
                            />
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 850, color: isActive ? '#15803d' : '#ef4444', minWidth: '38px', textAlign: 'right' }}>
                              {isActive ? 'OFFEN' : 'ZU'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setHours({...hours, [day.id]: {...(hours[day.id] || {}), active: !isActive, start: hours[day.id]?.start || '08:00', end: hours[day.id]?.end || '20:00'}})}
                              className={`app-binary-switch ${isActive ? 'active' : ''}`}
                              style={{ backgroundColor: isActive ? '#eab308' : undefined, flexShrink: 0 }}
                            >
                              <div className="app-binary-switch-knob" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: GEOFENCING & SICHERHEIT */}
              {activeGrooveSettingsModal === 'security' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* Mode Selector */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                    <button 
                      type="button"
                      onClick={() => setHours({ ...hours, geofence_bypass: false })}
                      style={{ 
                        padding: '14px',
                        borderRadius: '14px',
                        border: `2px solid ${hours.geofence_bypass !== true ? '#eab308' : '#e2e8f0'}`,
                        background: hours.geofence_bypass !== true ? '#fefce8' : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                      className="hover-scale"
                    >
                      <div style={{ fontWeight: 850, fontSize: '0.88rem', color: hours.geofence_bypass !== true ? '#ca8a04' : '#1e293b', marginBottom: '3px' }}>Geofencing Aktivieren (Standard)</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.35 }}>Login wird mit den Koordinaten des Raums abgeglichen.</div>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setHours({ ...hours, geofence_bypass: true })}
                      style={{ 
                        padding: '14px',
                        borderRadius: '14px',
                        border: `2px solid ${hours.geofence_bypass === true ? '#eab308' : '#e2e8f0'}`,
                        background: hours.geofence_bypass === true ? '#fefce8' : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                      className="hover-scale"
                    >
                      <div style={{ fontWeight: 850, fontSize: '0.88rem', color: hours.geofence_bypass === true ? '#ca8a04' : '#1e293b', marginBottom: '3px' }}>Geofencing Ausschalten (Bypass)</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.35 }}>Jeder Login führt direkt ins Live Lab ohne GPS-Abfrage.</div>
                    </button>
                  </div>

                  {/* Geofence Radius */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Erlaubter Geofence-Radius</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {['50', '100', '200', '500'].map((rVal) => {
                        const isSelected = (radius || '100') === rVal;
                        return (
                          <button
                            key={rVal}
                            type="button"
                            onClick={() => setRadius(rVal)}
                            style={{
                              flex: 1,
                              padding: '10px',
                              borderRadius: '10px',
                              border: isSelected ? '2px solid #eab308' : '1px solid #cbd5e1',
                              background: isSelected ? '#fefce8' : '#ffffff',
                              color: isSelected ? '#ca8a04' : '#475569',
                              fontWeight: 850,
                              fontSize: '0.84rem',
                              cursor: 'pointer'
                            }}
                            className="hover-scale"
                          >
                            {rVal} Meter
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Coordinates GPS */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Schul-Koordinaten (GPS)</label>
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition(
                              (pos) => {
                                setLat(pos.coords.latitude.toFixed(6));
                                setLng(pos.coords.longitude.toFixed(6));
                                alert('GPS-Koordinaten erfolgreich ermittelt! 📍');
                              },
                              (err) => alert('Standort konnte nicht ermittelt werden: ' + err.message)
                            );
                          } else {
                            alert('Geolocation wird von diesem Browser nicht unterstützt.');
                          }
                        }}
                        style={{
                          background: '#fefce8',
                          border: '1px solid #fef08a',
                          color: '#ca8a04',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        className="hover-scale"
                      >
                        <MapPin size={12} /> Standort ermitteln
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <input 
                        type="text" 
                        placeholder="Breitengrad (z.B. 47.5584)" 
                        value={lat} 
                        onChange={e => setLat(e.target.value)}
                        style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 600, outline: 'none' }}
                      />
                      <input 
                        type="text" 
                        placeholder="Längengrad (z.B. 7.9472)" 
                        value={lng} 
                        onChange={e => setLng(e.target.value)}
                        style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 600, outline: 'none' }}
                      />
                    </div>
                  </div>

                  {/* GDPR Status */}
                  <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ShieldCheck size={24} color="#ca8a04" />
                    <div>
                      <strong style={{ fontSize: '0.84rem', color: '#713f12', display: 'block' }}>Art. 32 DSGVO Konforme Speicherung</strong>
                      <span style={{ fontSize: '0.72rem', color: '#a16207' }}>
                        Standortdaten werden ausschließlich temporär zur Check-in-Validierung verarbeitet und niemals in Bewegungsprofilen gespeichert.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: KIOSK GERÄTE & STATIONS SETUP */}
              {activeGrooveSettingsModal === 'devices' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* GrooveLab Terminal Setup PIN Card */}
                  <div style={{ 
                    background: '#fefce8', 
                    border: '1.5px solid #fef08a', 
                    borderRadius: '18px', 
                    padding: '20px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <h4 style={{ fontSize: '0.94rem', fontWeight: 900, color: '#854d0e', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Lock size={18} color="#854d0e" /> GrooveLab Terminal-Einrichtungs-PIN (4 Ziffern)
                        </h4>
                        <p style={{ fontSize: '0.78rem', color: '#a16207', margin: '4px 0 0 0', fontWeight: 550, lineHeight: 1.4, maxWidth: '620px' }}>
                          Dieser 4-stellige PIN autorisiert neue Schüler-Terminals und iPads im Bandraum. Er schützt vor unbefugten Stations-Kopplungen durch Schüler von außerhalb. Bereits gekoppelte iPads bleiben bei einer PIN-Änderung unterbrechungsfrei aktiv.
                        </p>
                      </div>
                      {kioskPinSavedFeedback && (
                        <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Check size={14} /> PIN erfolgreich gespeichert!
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input 
                          type={showKioskPin ? "text" : "password"}
                          maxLength={4}
                          aria-label="Vierstellige Kiosk-PIN"
                          value={kioskPin}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                            setKioskPin(val);
                          }}
                          placeholder="1234"
                          style={{ 
                            width: '130px', 
                            padding: '10px 14px', 
                            borderRadius: '10px', 
                            border: '1.5px solid #fef08a', 
                            background: '#ffffff',
                            color: '#854d0e',
                            fontSize: '1.1rem',
                            fontWeight: 900,
                            letterSpacing: '0.3em',
                            textAlign: 'center',
                            fontFamily: 'monospace',
                            outline: 'none'
                          }} 
                        />
                        <button
                          type="button"
                          onClick={() => setShowKioskPin(!showKioskPin)}
                          aria-label={showKioskPin ? "PIN verbergen" : "PIN anzeigen"}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            background: 'transparent',
                            border: 'none',
                            color: '#a16207',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title={showKioskPin ? "PIN verbergen" : "PIN anzeigen"}
                        >
                          {showKioskPin ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleGenerateRandomPin}
                        style={{
                          background: '#ffffff',
                          color: '#854d0e',
                          border: '1px solid #fef08a',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s'
                        }}
                        className="hover-scale"
                      >
                        <RefreshCw size={14} /> Neu auswürfeln
                      </button>

                      <button
                        type="button"
                        disabled={isSavingKioskPin || kioskPin.length !== 4}
                        onClick={() => handleSaveKioskPin()}
                        style={{
                          background: '#eab308',
                          color: '#0f172a',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '10px 18px',
                          fontSize: '0.78rem',
                          fontWeight: 900,
                          cursor: isSavingKioskPin || kioskPin.length !== 4 ? 'not-allowed' : 'pointer',
                          opacity: isSavingKioskPin || kioskPin.length !== 4 ? 0.6 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 10px rgba(234,179,8,0.2)',
                          transition: 'all 0.15s'
                        }}
                        className="hover-scale"
                      >
                        {isSavingKioskPin ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                        {isSavingKioskPin ? 'Speichern…' : 'PIN speichern'}
                      </button>
                    </div>
                  </div>

                  {/* GrooveLab Kiosk Device Onboarding Link section */}
                  {effectiveSchool?.groovelab_kiosk_token && (
                    <div style={{ 
                      background: '#fefce8', 
                      border: '1.5px solid #fef08a', 
                      borderRadius: '18px', 
                      padding: '18px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '10px'
                    }}>
                      <div>
                        <h4 style={{ fontSize: '0.92rem', fontWeight: 900, color: '#854d0e', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Monitor size={18} /> GrooveLab Kiosk-Geräte Onboarding Link
                        </h4>
                        <p style={{ fontSize: '0.76rem', color: '#a16207', margin: '3px 0 0 0', fontWeight: 550, lineHeight: 1.4 }}>
                          Kopiere diesen Link und öffne ihn auf neuen Kiosk-iPads im Proberaum, um diese direkt als GrooveLab-Kiosk einzurichten.
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input 
                          type="text" 
                          readOnly 
                          value={`${window.location.origin}/device-onboarding/${effectiveSchool.groovelab_kiosk_token}`}
                          style={{ 
                            flex: 1, 
                            padding: '10px 14px', 
                            borderRadius: '10px', 
                            border: '1px solid #fef08a', 
                            background: '#ffffff',
                            color: '#854d0e',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            outline: 'none'
                          }} 
                        />
                        <button
                          onClick={() => {
                            const link = `${window.location.origin}/device-onboarding/${effectiveSchool.groovelab_kiosk_token}`;
                            navigator.clipboard.writeText(link);
                            setCopiedKioskLink(true);
                            setTimeout(() => setCopiedKioskLink(false), 2000);
                          }}
                          style={{
                            background: '#eab308',
                            color: '#0f172a',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '10px 16px',
                            fontSize: '0.78rem',
                            fontWeight: 900,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 10px rgba(234,179,8,0.2)',
                            transition: 'all 0.15s'
                          }}
                          className="hover-scale"
                        >
                          {copiedKioskLink ? <Check size={14} /> : <Copy size={14} />}
                          {copiedKioskLink ? 'Kopiert!' : 'Kopieren'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Room Selector Tab Bar */}
                  {rooms.length > 1 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {rooms.map(r => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setSelectedRoomId(r.id)}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '10px',
                            border: 'none',
                            background: selectedRoomId === r.id ? '#eab308' : '#f1f5f9',
                            color: selectedRoomId === r.id ? '#0f172a' : '#64748b',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          className="hover-scale"
                        >
                          {r.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Seating Layout Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '12px',
                    background: '#f8fafc',
                    padding: '16px',
                    borderRadius: '20px',
                    border: '1px solid #e2e8f0',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}>
                    {/* Row 1: iPads 3, 4, 5, 6 */}
                    {renderStationCell(getStationByNumber(3), 'iPad 3')}
                    {renderStationCell(getStationByNumber(4), 'iPad 4')}
                    {renderStationCell(getStationByNumber(5), 'iPad 5')}
                    {renderStationCell(getStationByNumber(6), 'iPad 6')}

                    {/* Row 2: iPad 2, Lehrer-iPad (spans 2 columns), iPad 7 */}
                    {renderStationCell(getStationByNumber(2), 'iPad 2')}
                    <div style={{ gridColumn: 'span 2' }}>
                      {renderStationCell(lehrerStation, 'Lehrer-iPad', true)}
                    </div>
                    {renderStationCell(getStationByNumber(7), 'iPad 7')}

                    {/* Mittelgang Divider */}
                    <div style={{
                      gridColumn: 'span 4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px 0',
                      color: '#94a3b8',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.25em',
                      borderTop: '1px dashed #e2e8f0',
                      borderBottom: '1px dashed #e2e8f0',
                      margin: '2px 0',
                      userSelect: 'none'
                    }}>
                      ↕ Mittelgang ↕
                    </div>

                    {/* Row 3: iPad 1, empty space (entrance), iPad 8 */}
                    {renderStationCell(getStationByNumber(1), 'iPad 1')}
                    <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 600 }}>
                      Eingang
                    </div>
                    {renderStationCell(getStationByNumber(8), 'iPad 8')}
                  </div>
                </div>
              )}

              {/* TAB 4: ANWESENHEIT & PROTOKOLLE */}
              {activeGrooveSettingsModal === 'analytics' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Activity size={22} color="#ca8a04" />
                      <div>
                        <strong style={{ fontSize: '0.92rem', color: '#0f172a', display: 'block' }}>Anwesenheitsdaten &amp; Check-In Export</strong>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Lade alle Anwesenheits- und Check-In-Protokolle von allen Coaches und Schülern dieser Musikschule als CSV-Datei herunter.
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleExportAllPresenceCSV}
                      style={{
                        width: 'fit-content',
                        background: '#eab308',
                        color: '#0f172a',
                        border: 'none',
                        padding: '12px 22px',
                        borderRadius: '12px',
                        fontWeight: 900,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(234,179,8,0.25)',
                        marginTop: '6px'
                      }}
                      className="hover-scale"
                    >
                      <Download size={16} /> Alle Anwesenheiten exportieren (CSV)
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 5: SYSTEMWARTUNG */}
              {activeGrooveSettingsModal === 'maintenance' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 850, fontSize: '0.86rem', color: '#1e293b' }}>Wochenplan bereinigen</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4 }}>Entfernt inaktive Daten und synchronisiert Rosteinträge, um Dateileichen aus der Scheduler-Tabelle zu entfernen.</div>
                    <button 
                      type="button"
                      onClick={onCleanupPlanning}
                      style={{ 
                        width: 'fit-content',
                        background: '#ffffff', 
                        border: '1.5px solid #fef08a', 
                        color: '#ca8a04', 
                        padding: '9px 16px', 
                        borderRadius: '10px', 
                        fontWeight: 800, 
                        fontSize: '0.8rem', 
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                      className="hover-scale"
                    >
                      Wochenplan bereinigen (Datenleichen entfernen)
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 850, fontSize: '0.86rem', color: '#1e293b' }}>Wochenplan komplett leeren</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4 }}>Versetzt den Scheduler für alle Schüler in den Ausgangszustand und löscht alle eingetragenen Zeitslots. Dieser Schritt kann nicht rückgängig gemacht werden!</div>
                    <button 
                      type="button"
                      onClick={onResetPlanning}
                      style={{ 
                        width: 'fit-content',
                        background: '#ffffff', 
                        border: '1.5px solid #fecaca', 
                        color: '#ef4444', 
                        padding: '9px 16px', 
                        borderRadius: '10px', 
                        fontWeight: 800, 
                        fontSize: '0.8rem', 
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                      className="hover-scale"
                    >
                      Wochenplan komplett leeren
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 850, fontSize: '0.86rem', color: '#1e293b' }}>Übe-Statistiken zurücksetzen</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4 }}>Setzt die aufgezeichneten Minuten und Übezeiten für alle Schülerprofile auf 0 zurück. Nützlich zum Beginn eines neuen Semesters.</div>
                    <button 
                      type="button"
                      onClick={async () => {
                        if (window.confirm("Möchtest du die Übe-Statistik (eingeloggte Minuten) wirklich für alle Schüler zurücksetzen?")) {
                          setIsSaving(true);
                          const updatedHours = {
                            ...hours,
                            [activePlatform === 'campus' ? 'campus_stats_reset_at' : 'groovelab_stats_reset_at']: new Date().toISOString()
                          };
                          const { error } = await supabase
                            .from('schools')
                            .update({ opening_hours: updatedHours })
                            .eq('id', school.id);
                          setIsSaving(false);
                          if (error) alert("Fehler: " + error.message);
                          else {
                            setHours(updatedHours);
                            alert("Statistiken erfolgreich zurückgesetzt!");
                            onUpdate();
                          }
                        }
                      }}
                      style={{ 
                        width: 'fit-content',
                        background: '#ffffff', 
                        border: '1.5px solid #fef08a', 
                        color: '#ca8a04', 
                        padding: '9px 16px', 
                        borderRadius: '10px', 
                        fontWeight: 800, 
                        fontSize: '0.8rem', 
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                      className="hover-scale"
                    >
                      Übe-Statistiken zurücksetzen
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #f1f5f9',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px'
            }}>
              <button
                type="button"
                onClick={() => setActiveGrooveSettingsModal(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
                className="hover-scale"
              >
                Schließen
              </button>

              {(activeGrooveSettingsModal === 'hours' || activeGrooveSettingsModal === 'security') && (
                <button
                  type="button"
                  onClick={async () => {
                    await handleSaveAcademy();
                    setActiveGrooveSettingsModal(null);
                  }}
                  disabled={!isSettingsDirty || isSaving}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isSettingsDirty ? '#eab308' : '#cbd5e1',
                    color: isSettingsDirty ? '#0f172a' : '#94a3b8',
                    fontSize: '0.82rem',
                    fontWeight: 900,
                    cursor: isSettingsDirty ? 'pointer' : 'default',
                    boxShadow: isSettingsDirty ? '0 4px 12px rgba(234,179,8,0.3)' : 'none'
                  }}
                  className={isSettingsDirty ? "hover-scale" : ""}
                >
                  {isSaving ? 'Speichern...' : 'Speichern'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feedback & Ideenschmiede Modal */}
      {isFeedbackModalOpen && (
        <Suspense fallback={null}>
          <FeedbackHubModal
            isOpen={isFeedbackModalOpen}
            onClose={() => setIsFeedbackModalOpen(false)}
            userRole="admin"
            userId={admin?.id || admin?.userId || 'admin'}
            userName="Administrator"
            schoolId={effectiveSchool?.id || school?.id}
            schoolName={effectiveSchool?.name}
            activePlatform={activePlatform as any}
          />
        </Suspense>
      )}

      {/* Leitfäden & Akademie Modal */}
      {isHelpCenterOpen && (
        <Suspense fallback={null}>
          <HelpCenterModal
            isOpen={isHelpCenterOpen}
            onClose={() => setIsHelpCenterOpen(false)}
            userRole="admin"
            activePlatform={activePlatform as any}
            schoolName={effectiveSchool?.name || school?.name}
            initialBoardId="rooms"
            onOpenFeedbackHub={() => {
              setIsHelpCenterOpen(false);
              setIsFeedbackModalOpen(true);
            }}
          />
        </Suspense>
      )}
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
      `}} />
    </div>
  );
};

