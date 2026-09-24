import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePremiumOnboardingTour, TourStartButton, TourStep } from './PremiumOnboardingTour';
import { supabase, deleteUserStorageAssets, queryCache } from '../lib/supabase';
import { logApplicationAudit } from '../services/auditLogService';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Send, 
  CheckCircle, 
  Users, 
  Clock, 
  Settings, 
  AlertCircle, 
  GraduationCap,
  Sparkles,
  MapPin,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  Search,
  Upload,
  Eye,
  EyeOff,
  Ban,
  Star,
  Zap,
  Pin,
  Lock,
  Sliders,
  RotateCcw,
  Grid3X3,
  MoreVertical,
  Coffee,
  ArrowLeftRight
} from 'lucide-react';
import { 
  useRealNamesVisibility, 
  maskLastName, 
  formatGroupStudentsAnonymized, 
  formatTeacherFullName,
  resolveCanonicalStudentFromList,
  matchStudentNameOrInitial,
  extractStudentTokensFromName
} from '../utils/nameHelper';
import { ScheduleCalendarViewDesktop as ScheduleCalendarView } from './ScheduleCalendarViewDesktop';
const StudentScheduleSlotsModal = React.lazy(() => import('./StudentScheduleSlotsModal').then(m => ({ default: m.StudentScheduleSlotsModal })));
import { getParentOnboardingUrl } from '../utils/tenantUrlHelper';
import { isUUID } from '../utils/uuidValidator';
import {
  Student,
  DayBoard,
  ScheduleRoom as Room,
  parseTime,
  getPrefStartEndMinutes,
  parseDayNumber,
  resolveFirstName,
  resolveLastName,
  formatMinutes
} from '../domain/schedule/scheduleBoardTypes';
import { isTeacherInstrumentCompatible } from '../services/studentRosterService';
export type { Student, DayBoard };

interface ScheduleBoardProps {
  schoolId: string;
  userId: string;
}

const DAYS_OF_WEEK = [
  { value: 1, name: 'Montag' },
  { value: 2, name: 'Dienstag' },
  { value: 3, name: 'Mittwoch' },
  { value: 4, name: 'Donnerstag' },
  { value: 5, name: 'Freitag' },
  { value: 6, name: 'Samstag' },
  { value: 7, name: 'Sonntag' }
];

function InstrumentBadge({ instrument, color }: { instrument: string; color: string }) {
  const name = (instrument || '').toLowerCase();
  
  if (name.includes('gesang') || name.includes('vocals') || name.includes('stimme') || name.includes('gesangunterricht')) {
    return (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
        <line x1="12" x2="12" y1="19" y2="22" />
      </svg>
    );
  }
  
  if (name.includes('klavier') || name.includes('piano') || name.includes('keyboard')) {
    return (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <rect x="2" y="3" width="20" height="18" rx="2" ry="2" />
        <line x1="2" x2="22" y1="12" y2="12" />
        <line x1="6" x2="6" y1="12" y2="21" />
        <line x1="10" x2="10" y1="12" y2="21" />
        <line x1="14" x2="14" y1="12" y2="21" />
        <line x1="18" x2="18" y1="12" y2="21" />
      </svg>
    );
  }

  if (name.includes('gitarre') || name.includes('guitar') || name.includes('bass') || name.includes('ukulele')) {
    return (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="m16 16 3.6 3.6a2 2 0 1 1-2.8 2.8L13 19" />
        <path d="m19.1-4.9.7.7a2 2 0 0 1 0 2.8L13 5" />
        <path d="m15 2-8 8a5 5 0 1 0 7 7l8-8Z" />
      </svg>
    );
  }

  if (name.includes('trommel') || name.includes('schlagzeug') || name.includes('drum')) {
    return (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <ellipse cx="12" cy="8" rx="9" ry="3" />
        <path d="M3 8v8a9 9 0 0 0 18 0V8" />
        <path d="M7 10v4" />
        <path d="M17 10v4" />
      </svg>
    );
  }

  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

// 🏛️ Tier-1 L1-Cache Hydration: Sofortige 0ms-Sichtbarkeit des Stundenplaner-Entwurfs
const readInitialTeacherDraftState = (teacherId: string) => {
  if (typeof window === 'undefined' || !teacherId) return null;
  try {
    const activePlatform = localStorage.getItem('groovelab_active_platform') || 'groovelab';
    const keys = [
      `groovelab_teacher_draft_state_${activePlatform}_${teacherId}`,
      `groovelab_teacher_draft_state_campus_${teacherId}`,
      `groovelab_teacher_draft_state_groovelab_${teacherId}`
    ];
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.drafts) && parsed.drafts.length > 0) {
          return parsed;
        }
      }
    }
  } catch (e) {}
  return null;
};

export function ScheduleBoardDesktop({ schoolId, userId }: ScheduleBoardProps) {
  const { visible: showRealNames, toggleVisibility: toggleRealNames } = useRealNamesVisibility();

  // Main state
  const [activeTab, setActiveTab] = useState<'calendar' | 'designer'>('calendar');
  const [schoolProfile, setSchoolProfile] = useState<{ name?: string; subdomain?: string } | null>(null);

  useEffect(() => {
    if (!schoolId) return;
    supabase
      .from('schools')
      .select('name, subdomain')
      .eq('id', schoolId)
      .single()
      .then(({ data }) => {
        if (data) setSchoolProfile(data);
      });
  }, [schoolId]);

  // Teacher onboarding state variables
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(true);
  const [teacherAvailability, setTeacherAvailability] = useState<any>({});
  const [onboardingAvailability, setOnboardingAvailability] = useState<{
    [day: number]: { checked: boolean; start: string; end: string }
  }>({
    1: { checked: false, start: '', end: '' },
    2: { checked: false, start: '', end: '' },
    3: { checked: false, start: '', end: '' },
    4: { checked: false, start: '', end: '' },
    5: { checked: false, start: '', end: '' },
    6: { checked: false, start: '', end: '' },
    7: { checked: false, start: '', end: '' }
  });
  const [onboardingSubmitting, setOnboardingSubmitting] = useState<boolean>(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);

  interface CustomDialogConfig {
    type: 'confirm' | 'alert';
    message: string;
    resolve: (value: boolean) => void;
    confirmLabel?: string;
    cancelLabel?: string;
  }
  const [dialogConfig, setDialogConfig] = useState<CustomDialogConfig | null>(null);

  const showConfirm = (message: string, confirmLabel = 'Ja', cancelLabel = 'Nein'): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogConfig({
        type: 'confirm',
        message,
        resolve,
        confirmLabel,
        cancelLabel
      });
    });
  };

  const showAlert = (message: string): Promise<void> => {
    return new Promise((resolve) => {
      setDialogConfig({
        type: 'alert',
        message,
        resolve: () => resolve(),
        confirmLabel: 'OK'
      });
    });
  };
  const initialDraftState = useMemo(() => readInitialTeacherDraftState(userId), [userId]);
  const [boards, setBoards] = useState<DayBoard[]>(() => {
    if (initialDraftState?.drafts) {
      const activeId = initialDraftState.activeDraftId || 'default';
      const target = initialDraftState.drafts.find((d: any) => d.id === activeId) || initialDraftState.drafts[0];
      if (target?.boards) return target.boards;
    }
    return [];
  });
  const [undoStack, setUndoStack] = useState<{ boards: DayBoard[]; students: Student[] }[]>([]);
  const [drafts, setDrafts] = useState<{ id: string; name: string; boards: DayBoard[] }[]>(() => initialDraftState?.drafts || []);
  const draftsRef = useRef<{ id: string; name: string; boards: DayBoard[] }[]>([]);
  draftsRef.current = drafts;

  const pushUndoSnapshot = () => {
    setUndoStack(prev => [
      ...prev.slice(-24),
      {
        boards: JSON.parse(JSON.stringify(boards)),
        students: JSON.parse(JSON.stringify(students))
      }
    ]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const lastSnapshot = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, prev.length - 1));
    setBoards(lastSnapshot.boards);
    setStudents(lastSnapshot.students);
    setToast({ message: 'Änderung rückgängig gemacht', type: 'success' });
  };
  const [activeDraftId, setActiveDraftId] = useState<string>(() => initialDraftState?.activeDraftId || 'default');
  const activeDraftIdRef = useRef<string>('default');
  activeDraftIdRef.current = activeDraftId;
  const [submittedDraftId, setSubmittedDraftId] = useState<string>(() => initialDraftState?.submittedDraftId || '');
  const lastSavedStateRef = useRef<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState<boolean>(() => !initialDraftState);
  const [submitting, setSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarTab, setSidebarTab] = useState<'all' | 'unassigned' | 'assigned'>('unassigned');
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);

  // Teacher selector states
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(userId);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('user_role') || sessionStorage.getItem('groovelab_active_role') || '';
    }
    return '';
  });
  
  // Create Board form state
  const [newBoardDay, setNewBoardDay] = useState(1);
  const [newBoardStart, setNewBoardStart] = useState('14:00');
  const [newBoardEnd, setNewBoardEnd] = useState('20:00');
  const [newBoardRoom, setNewBoardRoom] = useState('');
  const [showAddBoardForm, setShowAddBoardForm] = useState(false);
  const [showNewDraftPromptModal, setShowNewDraftPromptModal] = useState<boolean>(false);
  const [showPartialSubmitModal, setShowPartialSubmitModal] = useState<boolean>(false);
  const [partialSubmitData, setPartialSubmitData] = useState<{ unassignedStudents: Student[]; totalAssigned: number; totalStudents: number } | null>(null);

  const [gridSnapMinutes, setGridSnapMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('groovelab_grid_snap_minutes');
    const parsed = saved ? Number(saved) : 15;
    return [15, 30, 60].includes(parsed) ? parsed : 15;
  }); // Default snap to 15 mins or saved preference (5 min option removed)
  const masterStudentsRef = useRef<Student[]>([]);

  // Grab offset ref for millimeter-precise mouse drag without cursor jump (ported from ScheduleCalendarView)
  const grabOffsetRef = useRef<number>(20);
  const lastSnapTimeRef = useRef<{ boardId: string; timeStr: string } | null>(null);

  const cleanupDragGhost = () => {
    if (typeof document !== 'undefined') {
      const ghost = document.getElementById('drag-preview-ghost-designer');
      if (ghost && ghost.parentNode) {
        ghost.parentNode.removeChild(ghost);
      }
    }
  };

   const snapTimeToGrid = (timeStr: string, snapMinutes: number): string => {
     if (!timeStr) return timeStr;
     const [hours, minutes] = timeStr.split(':').map(Number);
     const totalMinutes = hours * 60 + minutes;
     const snappedMinutes = Math.round(totalMinutes / snapMinutes) * snapMinutes;
     const snappedHours = Math.floor(snappedMinutes / 60) % 24;
     const snappedMins = snappedMinutes % 60;
     const hStr = String(snappedHours).padStart(2, '0');
     const mStr = String(snappedMins).padStart(2, '0');
     return `${hStr}:${mStr}`;
   };
  const playCubaseSnapClick = () => {
    // Audio snap click disabled per user request
  };

  // Pre-instantiated & pre-cached blank drag preview image (prevents first-load drag cancellation in WebKit/Safari)
  const BLANK_DRAG_IMAGE = typeof window !== 'undefined' ? new Image() : null;
  if (BLANK_DRAG_IMAGE) {
    BLANK_DRAG_IMAGE.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  }

  const resolveInstrument = (inst?: string): string => {
    const raw = (inst || '').trim();
    if (!raw || raw.toLowerCase() === 'musiker' || raw.toLowerCase() === 'instrument') {
      const currentTeacher = teachers.find(t => t.id === selectedTeacherId);
      if (currentTeacher) {
        if (Array.isArray(currentTeacher.instruments) && currentTeacher.instruments.length > 0 && currentTeacher.instruments[0]?.trim()) {
          const tInst = currentTeacher.instruments[0].trim();
          if (tInst.toLowerCase() !== 'musiker' && tInst.toLowerCase() !== 'instrument') return tInst;
        }
        if (currentTeacher.instrument && currentTeacher.instrument.trim()) {
          const tInst = currentTeacher.instrument.trim();
          if (tInst.toLowerCase() !== 'musiker' && tInst.toLowerCase() !== 'instrument') return tInst;
        }
      }
      return 'Gitarre';
    }
    return raw;
  };
  const [draggedStudentId, setDraggedStudentId] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<'sidebar' | 'board' | null>(null);
  const [dragSourceBoardId, setDragSourceBoardId] = useState<string | null>(null);
  const [dragOverBoardId, setDragOverBoardId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);
  const [draggedDuration, setDraggedDuration] = useState<number>(30);
  const [draggedStudentName, setDraggedStudentName] = useState<string>('Termin');
  const [dragSnapState, setDragSnapState] = useState<{
    boardId: string;
    topPx: number;
    timeStr: string;
    duration: number;
    studentName?: string;
  } | null>(null);

  // 🍏 Apple Human Interface Intentions: Dual-Zone Drag & Drop (Swap vs Insert)
  const [dragTargetIntent, setDragTargetIntent] = useState<'swap' | 'before' | 'after' | null>(null);
  const [dragTargetStudentId, setDragTargetStudentId] = useState<string | null>(null);

  // 🍏 Apple Quick Action Popover (No-Drag Klick-Alternative)
  const [quickActionStudentId, setQuickActionStudentId] = useState<string | null>(null);
  const [quickActionBoardId, setQuickActionBoardId] = useState<string | null>(null);
  const [swapPartnerPendingId, setSwapPartnerPendingId] = useState<string | null>(null);

  // Drag-and-Drop Instrument Selector state
  const [instrumentSelectorState, setInstrumentSelectorState] = useState<{
    sourceId: string;
    targetBoardId: string;
    index?: number;
    dragSource?: string | null;
    dragSourceBoardId?: string | null;
    instruments: string[];
  } | null>(null);
  const [selectedDropInstrument, setSelectedDropInstrument] = useState<string>('');

  // Drag-and-Drop Decision state
  const [dropDecisionState, setDropDecisionState] = useState<{ 
    sourceId: string, 
    targetId: string, 
    targetBoardId: string, 
    index: number,
    dragSource: string | null,
    dragSourceBoardId: string | null
  } | null>(null);

  // Group Mode states
  const [isGroupModeActive, setIsGroupModeActive] = useState<boolean>(false);
  const [selectedForGroup, setSelectedForGroup] = useState<string[]>([]);
  const [deleteBreakState, setDeleteBreakState] = useState<{ boardId: string, breakId: string } | null>(null);

  interface EditingBreakState {
    boardId: string;
    breakId: string;
    startTime: string;
    duration: number;
  }
  const [editingBreak, setEditingBreak] = useState<{ boardId: string; breakId: string; startTime?: string; duration: number } | null>(null);

  // 🍏 Apple HIG Edge-Resize State for Breaks (Direktes Kanten-Ziehen & Stauchen)
  interface ResizingBreakState {
    boardId: string;
    breakId: string;
    initialDuration: number;
    startY: number;
    currentDuration: number;
  }
  const [resizingBreak, setResizingBreak] = useState<ResizingBreakState | null>(null);
  const resizingBreakRef = useRef<ResizingBreakState | null>(null);
  resizingBreakRef.current = resizingBreak;

  const [editingTimeStudent, setEditingTimeStudent] = useState<{ boardId: string; studentId: string; currentTime: string } | null>(null);
  const [selectedSlotsStudent, setSelectedSlotsStudent] = useState<Student | null>(null);
  const [showAutoScheduleReportModal, setShowAutoScheduleReportModal] = useState(false);
  const [autoScheduleReportData, setAutoScheduleReportData] = useState<{
    totalAssigned: number;
    totalStudents: number;
    totalGapsMin: number;
    gapCount: number;
    wunschHits: number;
    studentsWithWunsch?: number;
    siblingHits: number;
    totalSiblings: number;
    overallScore: number;
    theoreticalMaxWunschHits?: number;
    activePlanTab?: 'wunschzeit' | 'lueckenlos';
    planWunschzeit?: any;
    planLueckenlos?: any;
  } | null>(null);

  const [isSolverRunning, setIsSolverRunning] = useState(false);
  const [solverProgress, setSolverProgress] = useState(0);
  const [solverStageText, setSolverStageText] = useState('Stufe 1-3: Pre-Computation...');

  // Submission tracking states
  const [hasSubmittedSchedule, setHasSubmittedSchedule] = useState(false);
  const [submittedBoardsSnapshot, setSubmittedBoardsSnapshot] = useState<string | null>(null);
  const [lastSubmittedTime, setLastSubmittedTime] = useState<string | null>(null);
  const [submittedAtIso, setSubmittedAtIso] = useState<string>('');
  const submittedAtIsoRef = useRef<string>('');
  const [scheduleStatus, setScheduleStatus] = useState<'none' | 'pending' | 'approved' | 'needs_revision'>('none');
  const [rejectionNote, setRejectionNote] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectNoteInput, setRejectNoteInput] = useState<string>('');

  const hasUnsubmittedEdits = useMemo(() => {
    if (!hasSubmittedSchedule || !submittedBoardsSnapshot) return false;
    const currentSnapshot = JSON.stringify(boards.map(b => ({
      id: b.id,
      day: b.dayOfWeek,
      room: b.roomId,
      startAnchor: b.startAnchor,
      students: b.students.map(s => `${s.id}-${s.assignedTime}-${s.duration}-${s.isBreak ? '1' : '0'}`)
    })));
    return currentSnapshot !== submittedBoardsSnapshot;
  }, [hasSubmittedSchedule, submittedBoardsSnapshot, boards]);

  // RoentgenMatrixView interactive behavior states
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentPrefs, setSelectedStudentPrefs] = useState<any[]>([]);
  const [allStudentPrefsMap, setAllStudentPrefsMap] = useState<Record<string, any[]>>({});
  const [selectedStudentNote, setSelectedStudentNote] = useState<string | null>(null);
  const [shakingStudentId, setShakingStudentId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'info' } | null>(null);
  const [failedStudentIds, setFailedStudentIds] = useState<string[]>([]);
  const [otherTeachersSchedules, setOtherTeachersSchedules] = useState<any[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<any[]>([]);
  const [siblingInfo, setSiblingInfo] = useState<any | null>(null);

  // Focus Day Zoom state
  const [focusedDayOfWeek, setFocusedDayOfWeek] = useState<number | null>(null);
  const autoSaveDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Pool Auto-Collapse & Tip banner states
  const [isPoolManuallyCollapsed, setIsPoolManuallyCollapsed] = useState<boolean | null>(null);
  const [showTipBanner, setShowTipBanner] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('groovelab_hide_designer_tip') !== 'true';
  });

  // Dynamic Theme calculations
  const activePlatformStored = typeof localStorage !== 'undefined' ? localStorage.getItem('groovelab_active_platform') : 'campus';
  const isGroovelab = activePlatformStored === 'groovelab';

  // 🏛️ Herrenberg-Goldstandard & Dual-Role Guard:
  // Bestimme den aktiven Arbeitsbereich. Befindet sich der Benutzer im Bereich 'teacher' (Campus Lehrkraft),
  // agiert er IMMER und AUSNAHMSLOS in der didaktischen Lehrkraft-Rolle (didaktische Termin- & Schülerplanung ohne Raumauswahl).
  // Raumzuweisung und Genehmigung/Ablehnung sind physikalisch auf den Bereich 'secretary' (Schulverwaltung) beschränkt.
  const activeWorkspace = typeof window !== 'undefined'
    ? (sessionStorage.getItem('groovelab_active_workspace') || localStorage.getItem('groovelab_active_workspace') || '')
    : '';
  const isSecretaryWorkspace = activeWorkspace === 'secretary' || (
    (currentUserRole === 'admin' || currentUserRole === 'secretary') &&
    activeWorkspace !== 'teacher' &&
    activePlatformStored === 'admin'
  );
  const isTeacher = !isSecretaryWorkspace;
  const isCampus = !isGroovelab;
  const isAdminView = isSecretaryWorkspace;

  let brandColor = '#34a853'; // Campus Green by default
  let lightBg = 'rgba(52, 168, 83, 0.06)';
  let hoverBg = 'rgba(52, 168, 83, 0.12)';
  let textAccentColor = '#34a853';

  if (isAdminView) {
    brandColor = '#ea4335'; // Admin Red only in dedicated Admin/Secretariat cockpit
    lightBg = 'rgba(234, 67, 53, 0.06)';
    hoverBg = 'rgba(234, 67, 53, 0.12)';
    textAccentColor = '#ea4335';
  } else if (isGroovelab) {
    brandColor = '#eab308'; // GrooveLab Yellow
    lightBg = 'rgba(234, 179, 8, 0.06)';
    hoverBg = 'rgba(234, 179, 8, 0.12)';
    textAccentColor = '#ca8a04'; // Dark yellow text
  }

  // Guided Tour Configuration & State for Designer
  const designerTourSteps = useMemo(() => [
    {
      title: "Willkommen beim Stundenplan-Designer",
      description: "Lass uns kurz durchgehen, wie du deinen Stundenplan hier planst. Die Plattform hilft dir, deine Schüler optimal einzuteilen und Raumkonflikte zu vermeiden.",
      selector: undefined
    },
    {
      title: "Der Schüler-Pool",
      description: "Hier siehst du alle noch nicht eingeteilten Schüler (graues Label links). Ziehe Schüler einfach per Drag & Drop auf deine Unterrichtstage.",
      selector: "tour-student-pool"
    },
    {
      title: "Deine Wochentags-Boards",
      description: "Jeder Unterrichtstag hat ein eigenes Board, zugeteilt auf einen Raum. Die Unterrichtszeiten passen sich beim Hinzufügen von Schülern automatisch an.",
      selector: "tour-day-boards"
    },
    {
      title: "Pausen & Gruppen",
      description: "Ziehe einfach einen Pausen-Block auf deine Boards, um unterrichtsfreie Zeiten einzuplanen, oder aktiviere den Gruppen-Modus für gemeinsamen Unterricht.",
      selector: "tour-special-features"
    },
    {
      title: "Terminvorschlag abstimmen",
      description: "Wenn dein Stundenplan-Entwurf fertig abgestimmt ist, klicke auf 'Abstimmen & Freigeben', um ihn zur Freigabe an die Schulleitung zu übermitteln.",
      selector: "tour-submit-section"
    }
  ], []);

  // Guided Tour Configuration & State for Calendar (Stundenplan)
  const calendarTourSteps = useMemo(() => [
    {
      title: "Deine Wochenübersicht",
      description: "Dies ist dein freigegebener Stundenplan. Hier siehst du all deine Termine auf einen Blick.",
      selector: undefined
    },
    {
      title: "Die Röntgen-Ansicht",
      description: "Verwende die Röntgen-Ansicht, um Raumbelegungen von dir und anderen Lehrkräften transparent übereinander zu legen und Belegungen zu prüfen.",
      selector: "tour-calendar-xray"
    },
    {
      title: "Optionen & Aktionen",
      description: "Hier kannst du das Wochenende ein- oder ausblenden, Gruppen organisieren oder ganze Wochenkopien erstellen und einfügen.",
      selector: "tour-calendar-actions"
    },
    {
      title: "Zurück zum Designer",
      description: "Möchtest du deinen Stundenplan anpassen? Wechsle hier jederzeit zurück in den Stundenplan-Designer.",
      selector: "tour-calendar-switch"
    }
  ], []);

  const { TourComponent: DesignerTourComponent, startTour: startDesignerTour } = usePremiumOnboardingTour({
    tourKey: `campus_groovelab_designer_tour_completed_${selectedTeacherId}`,
    steps: designerTourSteps,
    platformTheme: localStorage.getItem('groovelab_active_platform') === 'campus' ? 'campus' : 'groovelab'
  });

  const { TourComponent: CalendarTourComponent, startTour: startCalendarTour } = usePremiumOnboardingTour({
    tourKey: `campus_groovelab_calendar_tour_completed_${selectedTeacherId}`,
    steps: calendarTourSteps,
    platformTheme: localStorage.getItem('groovelab_active_platform') === 'campus' ? 'campus' : 'groovelab'
  });

  // Cmd+Z / Ctrl+Z Keyboard listener for undoing schedule changes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') return;

        if (undoStack.length > 0) {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, boards, students]);



  // ── Optimized Conflict Detection Caching (Map Lookups) ──
  const teacherBusyIntervals = useMemo(() => {
    const map: Record<number, { start: number; end: number; studentName: string; roomName: string; boardId: string }[]> = {};
    boards.forEach(ob => {
      const [anchorH, anchorM] = parseTime(ob.startAnchor);
      const startMinutes = anchorH * 60 + anchorM;
      
      let currentStart = startMinutes;
      ob.students.forEach(obs => {
        const start = currentStart;
        const end = currentStart + obs.duration;
        currentStart = end;

        if (!obs.isBreak) {
          if (!map[ob.dayOfWeek]) {
            map[ob.dayOfWeek] = [];
          }
          const r = rooms.find(room => room.id === ob.roomId);
          map[ob.dayOfWeek].push({
            start,
            end,
            studentName: `${obs.first_name} ${maskLastName(obs.last_name, showRealNames)}`,
            roomName: r ? r.name : 'Anderer Raum',
            boardId: ob.id
          });
        }
      });
    });
    return map;
  }, [boards, rooms, showRealNames]);

  const otherTeachersRoomsIntervals = useMemo(() => {
    const map: Record<string, { start: number; end: number; teacherName: string; studentName: string }[]> = {};
    otherTeachersSchedules.forEach(os => {
      if (os.day_of_week !== undefined && os.room_id && os.time_slot) {
        const key = `${os.day_of_week}_${os.room_id}`;
        const [osh, osm] = parseTime(os.time_slot);
        const start = osh * 60 + osm;
        const end = start + (os.duration || 30);
        if (!map[key]) {
          map[key] = [];
        }
        map[key].push({
          start,
          end,
          teacherName: os.teacher ? formatTeacherFullName(os.teacher) : 'Anderer Lehrer',
          studentName: os.student ? `${os.student.first_name} ${maskLastName(os.student.last_name, showRealNames)}` : 'Schüler'
        });
      }
    });
    return map;
  }, [otherTeachersSchedules, showRealNames]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);


  useEffect(() => {
    lastSavedStateRef.current = '';
    loadInitialData();
  }, [schoolId, userId, selectedTeacherId]);

  // Realtime & Event-based automatic student list synchronization
  useEffect(() => {
    if (!schoolId) return;

    let debounceTimer: any = null;
    const debouncedReload = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadInitialData();
      }, 500);
    };

    const handleStudentsUpdated = () => {
      console.log('[ScheduleBoard] Received student update event (Campus & GrooveLab). Auto-refreshing designer...');
      debouncedReload();
    };

    window.addEventListener('students_updated', handleStudentsUpdated);
    window.addEventListener('campus_students_updated', handleStudentsUpdated);
    window.addEventListener('groovelab_students_updated', handleStudentsUpdated);

    const channel = supabase
      .channel(`schedule-board-realtime-students-${schoolId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users', filter: `school_id=eq.${schoolId}` },
        (payload: any) => {
          // 🛡️ Enterprise Performance Guard: Ignore pure presence/heartbeat updates ('last_seen')
          if (payload.eventType === 'UPDATE' && payload.old && payload.new) {
            const substantiveFields = [
              'role', 'roles', 'school_id', 'is_active', 'is_campus_active', 
              'is_groovelab_active', 'token_version', 'is_master_admin', 
              'first_name', 'last_name', 'instrument', 'lesson_duration', 
              'sibling_group_id', 'group_id', 'status', 'teacher_id'
            ];
            const hasSubstantiveChange = substantiveFields.some(
              field => payload.old[field] !== undefined && payload.new[field] !== undefined && payload.old[field] !== payload.new[field]
            );
            if (!hasSubstantiveChange) return;
          }
          console.log('[ScheduleBoard] Realtime users table substantive change detected:', payload);
          debouncedReload();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'students', filter: `school_id=eq.${schoolId}` },
        (payload) => {
          console.log('[ScheduleBoard] Realtime students table change detected:', payload);
          debouncedReload();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('students_updated', handleStudentsUpdated);
      window.removeEventListener('campus_students_updated', handleStudentsUpdated);
      window.removeEventListener('groovelab_students_updated', handleStudentsUpdated);
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [schoolId, selectedTeacherId]);

  useEffect(() => {
    if (!isInitialLoadDone) return;
    if (selectedTeacherId) {
      const activePlatform = localStorage.getItem('groovelab_active_platform') || 'groovelab';
      const columnName = activePlatform === 'campus' ? 'campus_räume' : 'groovelab_räume';

      const boardDefinitions = boards.map(b => ({
        id: b.id,
        dayOfWeek: b.dayOfWeek,
        startAnchor: b.startAnchor,
        roomId: b.roomId,
        students: b.students.map(s => ({
          id: s.id,
          first_name: s.first_name,
          last_name: s.last_name,
          instrument: s.instrument,
          duration: s.duration,
          assignedDay: s.assignedDay,
          assignedTime: s.assignedTime,
          isBreak: s.isBreak,
          customStartTime: s.customStartTime,
          isGroup: s.isGroup,
          groupStudents: s.groupStudents
        }))
      }));

      // Guard against race conditions during an active submission
      if (isSubmittingRef.current) {
        return;
      }

      // Update our drafts list for the active draft ID using draftsRef to prevent circular cascades
      const currentDraftsList = draftsRef.current.length > 0 ? draftsRef.current : drafts;
      const effectiveSubmittedAt = submittedAtIsoRef.current || submittedAtIso || ((currentDraftsList.find(d => d.id === submittedDraftId) as any)?.submittedAt) || null;

      const updatedDrafts = currentDraftsList.map(d => {
        if (d.id === activeDraftId) {
          // Invariant: Never downgrade 'ready_for_admin_review' back to 'approved' or unsubmitted during autosave
          const preservedStatus = (d as any).status === 'ready_for_admin_review' || (d.id === submittedDraftId && scheduleStatus === 'pending')
            ? 'ready_for_admin_review'
            : (d as any).status;
          const preservedSubmittedAt = (d as any).submittedAt || (d.id === submittedDraftId ? effectiveSubmittedAt : null);

          // 🛡️ Fail-Safe: If boardDefinitions has 0 students but d.boards previously had students, DO NOT wipe out!
          const newStudentCount = boardDefinitions.reduce((acc, b) => acc + (b.students || []).filter(s => !s.isBreak).length, 0);
          const oldStudentCount = (d.boards || []).reduce((acc, b) => acc + (b.students || []).filter((s: any) => !s.isBreak).length, 0);
          const effectiveBoards = (newStudentCount === 0 && oldStudentCount > 0) ? d.boards : boardDefinitions;

          return { 
            ...d, 
            status: preservedStatus,
            submittedAt: preservedSubmittedAt,
            boards: effectiveBoards 
          };
        }
        return d;
      });

      const draftStateToSave = {
        activeDraftId,
        submittedDraftId: submittedDraftId || '',
        submittedAt: submittedDraftId ? effectiveSubmittedAt : null,
        drafts: updatedDrafts
      };

      const payloadStr = JSON.stringify(draftStateToSave);
      if (lastSavedStateRef.current === payloadStr) {
        return;
      }
      lastSavedStateRef.current = payloadStr;

      // Update local drafts state to keep it fully synchronized!
      setDrafts(updatedDrafts);

      localStorage.setItem(`groovelab_teacher_draft_state_${activePlatform}_${selectedTeacherId}`, payloadStr);
      // Legacy compatibility item
      if (boards.length > 0) {
        localStorage.setItem(`groovelab_teacher_boards_${activePlatform}_${selectedTeacherId}`, JSON.stringify(boardDefinitions));
      } else {
        localStorage.removeItem(`groovelab_teacher_boards_${activePlatform}_${selectedTeacherId}`);
      }

      // Debounce Supabase write (1000ms delay)
      const handler = setTimeout(() => {
        if (isSubmittingRef.current) return;
        supabase
          .from('users')
          .update({
            planned_boards: draftStateToSave,
            [columnName]: draftStateToSave
          })
          .eq('id', selectedTeacherId)
          .then(({ error }) => {
            if (error) {
              console.error(`Error auto-saving ${columnName} to DB:`, error);
            }
          });
      }, 1000);

      return () => clearTimeout(handler);
    }
  }, [boards, activeDraftId, submittedDraftId, selectedTeacherId, isInitialLoadDone]);

  const consolidateDatabaseGroups = (boardsList: DayBoard[], rawPool: Student[]): { boards: DayBoard[], pool: Student[] } => {
    const allStudentsMap = new Map<string, Student>();
    const nameToCanonicalMap = new Map<string, Student>();
    
    // Initialize the map with fresh metadata from the database (rawPool)
    rawPool.forEach(s => {
      allStudentsMap.set(s.id, { ...s });
      const fn = (s.first_name || '').trim().toLowerCase();
      const ln = (s.last_name || '').trim().toLowerCase();
      const nameKey = `${fn}_${ln}`;
      if (nameKey !== '_') {
        nameToCanonicalMap.set(nameKey, s);
      }
    });

    const rawStudentsList = Array.from(allStudentsMap.values());
    
    const resolveCanonicalStudent = (sId?: string | null, sFname?: string | null, sLname?: string | null): Student | undefined => {
      if (sId && allStudentsMap.has(sId)) return allStudentsMap.get(sId);
      const fn = (sFname || '').trim().toLowerCase();
      const ln = (sLname || '').trim().toLowerCase();
      const nameKey = `${fn}_${ln}`;
      if (nameKey !== '_' && nameToCanonicalMap.has(nameKey)) {
        const canonical = nameToCanonicalMap.get(nameKey)!;
        return allStudentsMap.get(canonical.id);
      }
      // Enterprise Initial & Token Matcher fallback (e.g. "Tina H." -> "Tina Huber")
      return resolveCanonicalStudentFromList({ id: sId, first_name: sFname, last_name: sLname }, rawStudentsList);
    };

    const assignedStudentIds = new Set<string>();

    // Pre-pass: Identify all students who are already part of an existing group card on the boards
    // This ensures single duplicate cards for members (e.g. Tina H. or Fabian T.) are eliminated.
    const preAssignedGroupMemberIds = new Set<string>();
    boardsList.forEach(b => {
      b.students.forEach(s => {
        if (s.isBreak) return;
        if (s.isGroup && s.groupStudents && s.groupStudents.length > 0) {
          s.groupStudents.forEach(gs => {
            const res = resolveCanonicalStudent(gs.id, gs.first_name, gs.last_name);
            preAssignedGroupMemberIds.add(res ? res.id : gs.id);
          });
        } else if (s.first_name && (s.first_name.includes('&') || s.first_name.includes(',') || /\b(and|und)\b/i.test(s.first_name))) {
          const tokens = extractStudentTokensFromName(s.first_name);
          tokens.forEach(tok => {
            const res = resolveCanonicalStudentFromList(tok, rawStudentsList);
            if (res) preAssignedGroupMemberIds.add(res.id);
          });
        }
      });
    });

    // Step 1: Scan and clean boardsList of any duplicates. Keep only the first occurrence.
    const cleanedBoards = boardsList.map(b => {
      const nextStudents: Student[] = [];
      b.students.forEach(s => {
        if (s.isBreak) {
          nextStudents.push(s);
          return;
        }
        if (s.isGroup && s.groupStudents && s.groupStudents.length > 0) {
          const uniqueMembers = s.groupStudents.filter(gs => {
            const resolved = resolveCanonicalStudent(gs.id, gs.first_name, gs.last_name);
            const targetId = resolved ? resolved.id : gs.id;
            if (assignedStudentIds.has(targetId)) {
              return false;
            }
            assignedStudentIds.add(targetId);
            return true;
          });
          if (uniqueMembers.length >= 2) {
            nextStudents.push({
              ...s,
              groupStudents: uniqueMembers.map(gs => {
                const resolved = resolveCanonicalStudent(gs.id, gs.first_name, gs.last_name);
                return resolved ? { ...gs, id: resolved.id, first_name: resolved.first_name, last_name: resolved.last_name } : gs;
              })
            });
          } else if (uniqueMembers.length === 1) {
            const resolved = resolveCanonicalStudent(uniqueMembers[0].id, uniqueMembers[0].first_name, uniqueMembers[0].last_name);
            nextStudents.push(resolved ? { ...uniqueMembers[0], id: resolved.id, first_name: resolved.first_name, last_name: resolved.last_name } : uniqueMembers[0]);
          }
        } else {
          const resolved = resolveCanonicalStudent(s.id, s.first_name, s.last_name);
          const targetId = resolved ? resolved.id : s.id;
          // If this student is already scheduled OR is part of a scheduled group card, drop redundant single card
          if (assignedStudentIds.has(targetId) || preAssignedGroupMemberIds.has(targetId)) {
            return;
          }
          assignedStudentIds.add(targetId);
          nextStudents.push(resolved ? { 
            ...s, 
            id: resolved.id, 
            first_name: resolved.first_name, 
            last_name: resolved.last_name, 
            instrument: resolved.instrument || s.instrument, 
            duration: resolved.duration || s.duration 
          } : s);
        }
      });
      return { ...b, students: nextStudents };
    });

    // Scan boards to mark which of these students are assigned
    cleanedBoards.forEach(b => {
      b.students.forEach(s => {
        if (s.isBreak) return;
        if (s.isGroup && s.groupStudents && s.groupStudents.length > 0) {
          s.groupStudents.forEach(gs => {
            const existing = resolveCanonicalStudent(gs.id, gs.first_name, gs.last_name);
            if (existing) {
              existing.assignedDay = b.dayOfWeek;
              existing.assignedTime = s.assignedTime;
            } else {
              // Fallback for students not in rawPool
              allStudentsMap.set(gs.id, {
                ...gs,
                assignedDay: b.dayOfWeek,
                assignedTime: s.assignedTime
              });
            }
          });
        } else {
          const existing = resolveCanonicalStudent(s.id, s.first_name, s.last_name);
          if (existing) {
            existing.assignedDay = b.dayOfWeek;
            existing.assignedTime = s.assignedTime;
          } else {
            // Fallback for students not in rawPool
            allStudentsMap.set(s.id, {
              ...s,
              assignedDay: b.dayOfWeek,
              assignedTime: s.assignedTime
            });
          }
        }
      });
    });

    const dbGroups: Record<string, Student[]> = {};
    allStudentsMap.forEach(s => {
      if (s.group_id) {
        if (!dbGroups[s.group_id]) {
          dbGroups[s.group_id] = [];
        }
        dbGroups[s.group_id].push(s);
      }
    });

    const mergedGroupsMap = new Map<string, Student>();
    const individualStudentIdsInGroups = new Set<string>();

    Object.entries(dbGroups).forEach(([groupId, members]) => {
      if (members.length >= 2) {
        members.forEach(m => individualStudentIdsInGroups.add(m.id));
        
        const scheduledMember = members.find(m => m.assignedDay !== undefined);
        const assignedDay = scheduledMember?.assignedDay;
        const assignedTime = scheduledMember?.assignedTime;
        
        const validGroupInsts = members.map(m => m.instrument).filter(inst => inst && !['musiker', 'musikerin', 'instrument', 'keines', 'none', '-'].includes(inst.toLowerCase().trim()));
        const cleanGroupInst = validGroupInsts.length > 0 ? Array.from(new Set(validGroupInsts)).join(', ') : 'Gitarre';

        const merged: Student = {
          id: `group-${groupId}`,
          first_name: members.map(m => m.first_name).join(' & '),
          last_name: '',
          instrument: cleanGroupInst,
          duration: Math.max(...members.map(m => m.duration || 30)),
          assignedDay,
          assignedTime,
          status: members.some(m => m.status === 'ausstehend') ? 'ausstehend' : 'verplant',
          isGroup: true,
          hasPreferences: members.some(m => Boolean(m.hasPreferences)),
          group_id: groupId,
          groupStudents: members.map(m => ({
            ...m,
            instrument: m.instrument && !['musiker', 'musikerin', 'instrument', 'keines', 'none', '-'].includes(m.instrument.toLowerCase().trim()) ? m.instrument : cleanGroupInst,
            assignedDay,
            assignedTime
          }))
        };
        mergedGroupsMap.set(`group-${groupId}`, merged);
      }
    });

    const newBoards = cleanedBoards.map(b => {
      const nextStudents: Student[] = [];
      const addedGroupIds = new Set<string>();

      b.students.forEach(s => {
        if (s.isBreak) {
          nextStudents.push(s);
          return;
        }
        
        if (s.isGroup && s.groupStudents) {
          const nonGroupMembers = s.groupStudents.filter(gs => {
            const res = resolveCanonicalStudent(gs.id, gs.first_name, gs.last_name);
            const effId = res ? res.id : gs.id;
            return !individualStudentIdsInGroups.has(effId);
          });
          const groupMembers = s.groupStudents.filter(gs => {
            const res = resolveCanonicalStudent(gs.id, gs.first_name, gs.last_name);
            const effId = res ? res.id : gs.id;
            return individualStudentIdsInGroups.has(effId);
          });

          if (nonGroupMembers.length >= 2) {
            nextStudents.push({
              ...s,
              groupStudents: nonGroupMembers
            });
          } else if (nonGroupMembers.length === 1) {
            const _fm1 = resolveCanonicalStudent(nonGroupMembers[0].id, nonGroupMembers[0].first_name, nonGroupMembers[0].last_name) || allStudentsMap.get(nonGroupMembers[0].id);
            nextStudents.push(_fm1 ? { ...nonGroupMembers[0], id: _fm1.id, first_name: _fm1.first_name, last_name: _fm1.last_name } : nonGroupMembers[0]);
          }

          groupMembers.forEach(gs => {
            const res = resolveCanonicalStudent(gs.id, gs.first_name, gs.last_name);
            const effGroupId = res?.group_id || gs.group_id;
            if (effGroupId) {
              const merged = mergedGroupsMap.get(`group-${effGroupId}`);
              if (merged && merged.assignedDay === b.dayOfWeek && !addedGroupIds.has(effGroupId)) {
                nextStudents.push(merged);
                addedGroupIds.add(effGroupId);
              }
            }
          });
        } else {
          // Single student card on board: check if this student belongs to a group
          const resolved = resolveCanonicalStudent(s.id, s.first_name, s.last_name) || allStudentsMap.get(s.id);
          const effectiveId = resolved ? resolved.id : s.id;
          const effectiveGroupId = resolved?.group_id || s.group_id;

          if (individualStudentIdsInGroups.has(effectiveId) || (effectiveGroupId && mergedGroupsMap.has(`group-${effectiveGroupId}`))) {
            const targetGroupId = effectiveGroupId;
            if (targetGroupId) {
              const merged = mergedGroupsMap.get(`group-${targetGroupId}`);
              if (merged && merged.assignedDay === b.dayOfWeek && !addedGroupIds.has(targetGroupId)) {
                nextStudents.push(merged);
                addedGroupIds.add(targetGroupId);
              }
            }
            // Do NOT push `s` as single student card! It is absorbed into the group.
          } else {
            nextStudents.push(resolved ? { 
              ...s, 
              id: resolved.id, 
              first_name: resolved.first_name, 
              last_name: resolved.last_name, 
              duration: resolved.duration || s.duration, 
              instrument: resolved.instrument || s.instrument 
            } : s);
          }
        }
      });

      mergedGroupsMap.forEach((merged) => {
        const groupId = merged.group_id!;
        if (merged.assignedDay === b.dayOfWeek && !addedGroupIds.has(groupId)) {
          nextStudents.push(merged);
          addedGroupIds.add(groupId);
        }
      });

      return {
        ...b,
        students: nextStudents
      };
    });

    const newPool: Student[] = [];
    allStudentsMap.forEach(s => {
      if (individualStudentIdsInGroups.has(s.id)) {
        if (s.group_id) {
          const merged = mergedGroupsMap.get(`group-${s.group_id}`);
          if (merged && merged.assignedDay === undefined) {
            if (!newPool.some(p => p.id === merged.id)) {
              newPool.push(merged);
            }
          }
        }
      } else {
        if (s.assignedDay === undefined) {
          newPool.push(s);
        }
      }
    });

    return { boards: newBoards, pool: newPool };
  };

  const loadInitialData = async () => {
    try {
      if (!draftsRef.current || draftsRef.current.length === 0) {
        setLoading(true);
      }
      const activePlatform = localStorage.getItem('groovelab_active_platform') || 'groovelab';
      const isCampus = activePlatform === 'campus';
      const columnName = isCampus ? 'campus_räume' : 'groovelab_räume';
      
      // 1. Fetch current user role and teachers list if not done yet
      let role = currentUserRole;
      let teachersList = teachers;
      if (!role) {
        const { data: userProfile } = await supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .maybeSingle();
        role = userProfile?.role || 'teacher';
        setCurrentUserRole(role);

        if (role === 'admin' || role === 'secretary') {
          const { data: tData } = await supabase
            .from('users')
            .select('id, first_name, last_name, planned_boards, campus_räume, groovelab_räume')
            .eq('school_id', schoolId)
            .in('role', ['teacher', 'admin', 'secretary'])
            .order('first_name');
          
          teachersList = tData || [];
          setTeachers(teachersList);
          
          // Default to the first teacher ONLY if the logged-in user is NOT a teacher in the list
          const isUserATeacher = teachersList.some(t => t.id === userId);
          if (!isUserATeacher && selectedTeacherId === userId && teachersList.length > 0) {
            const firstTeacher = teachersList.find(t => t.id !== userId) || teachersList[0];
            if (firstTeacher) {
              setSelectedTeacherId(firstTeacher.id);
              return; // Exiting early as the state change will trigger this effect again
            }
          }
        }
      }

      // 🏛️ Tier-1 SWR Instant Paint: Sofortiger Paint des gecachten Entwurfs vor Netzwerkabfragen
      const earlyStoredDraftState = localStorage.getItem(`groovelab_teacher_draft_state_${activePlatform}_${selectedTeacherId}`);
      if (earlyStoredDraftState) {
        try {
          const parsedEarly = JSON.parse(earlyStoredDraftState);
          if (parsedEarly && Array.isArray(parsedEarly.drafts) && parsedEarly.drafts.length > 0) {
            const activeDId = parsedEarly.activeDraftId || 'default';
            const targetD = parsedEarly.drafts.find((d: any) => d.id === activeDId) || parsedEarly.drafts[0];
            if (targetD && Array.isArray(targetD.boards) && targetD.boards.length > 0) {
              setBoards(targetD.boards);
              setDrafts(parsedEarly.drafts);
              setActiveDraftId(activeDId);
              if (parsedEarly.submittedDraftId) setSubmittedDraftId(parsedEarly.submittedDraftId);
              setLoading(false); // Instant Paint!
            }
          }
        } catch (e) {
          // Non-blocking early parse
        }
      }

      // 🛡️ 2. Tier-1 Low-Latency Single-Flight RPC (OWASP ASVS Level 3 / DSGVO Art. 5 & 25 Scoped)
      let loadedRooms: any[] = [];
      let schedData: any[] = [];
      let occData: any[] = [];
      let groupData: any[] = [];
      let teacherProfile: any = null;
      let otherSchedData: any[] = [];
      let blockedSlotsData: any[] = [];
      let allDbPrefs: any[] = [];
      let rawPlannedEarly: any = null;
      let usedFastRoster = false;

      const studentMap = new Map<string, Student>();
      const userToStudentIdMap = new Map<string, string>();
      const idAliasMap = new Map<string, string>();
      const nameToCanonicalIdMap = new Map<string, string>();

      try {
        const { data: roster, error: rosterErr } = await supabase.rpc('get_teacher_schedule_roster', {
          p_teacher_id: selectedTeacherId,
          p_school_id: schoolId
        });

        if (!rosterErr && roster && typeof roster === 'object' && Array.isArray(roster.students)) {
          loadedRooms = roster.rooms || [];
          teacherProfile = roster.teacher_profile || null;
          schedData = roster.schedules || [];
          otherSchedData = roster.room_busy_intervals || [];
          blockedSlotsData = roster.blocked_slots || [];
          allDbPrefs = roster.preferences || [];
          rawPlannedEarly = teacherProfile?.planned_boards || (teacherProfile as any)?.campus_räume || (teacherProfile as any)?.groovelab_räume;

          (roster.students || []).forEach((st: any) => {
            const canonicalStudent: Student = {
              id: st.id,
              first_name: st.first_name || 'Schüler',
              last_name: st.last_name || '',
              instrument: st.instrument || 'Musiker',
              duration: st.duration || 30,
              status: (st.status || 'aktiv') as any,
              sibling_group_id: st.sibling_group_id || undefined,
              group_id: st.group_id || null,
              isOnboarded: Boolean(st.isOnboarded),
              hasPreferences: Boolean(st.hasPreferences)
            };
            studentMap.set(st.id, canonicalStudent);
            if (st.user_id) {
              studentMap.set(st.user_id, canonicalStudent);
              userToStudentIdMap.set(st.user_id, st.id);
            }
            const fn = (canonicalStudent.first_name || '').trim().toLowerCase();
            const ln = (canonicalStudent.last_name || '').trim().toLowerCase();
            const nameKey = `${fn}_${ln}`;
            if (nameKey !== '_') {
              nameToCanonicalIdMap.set(nameKey, st.id);
            }
          });

          usedFastRoster = true;
        }
      } catch (rpcErr) {
        console.warn('[ScheduleBoard] Fast roster RPC note, engaging fail-safe fallback:', rpcErr);
      }

      if (!usedFastRoster) {
        let allStudentsDb: any[] = [];
        let allSchoolStudentUsers: any[] = [];
        let pendingData: any[] = [];

        const [
          fallbackRooms,
          schedRes,
          occRes,
          groupRes,
          profileRes,
          studentsDbRes,
          schoolUsersRes,
          pendingRes,
          otherRes,
          blockedRes,
          prefsRes
        ] = await Promise.all([
          queryCache.fetch(`rooms_${schoolId}`, async () => {
            const { data } = await supabase.from('rooms').select('id, name').eq('school_id', schoolId).order('name');
            return data || [];
          }, { ttlMs: 60_000, staleWhileRevalidate: true }),
          supabase.from('schedules').select('*, student:users!schedules_student_id_fkey(id, first_name, last_name, instrument, lesson_duration, sibling_group_id, group_id, is_campus_active, is_groovelab_active, is_active)').eq('school_id', schoolId).eq('teacher_id', selectedTeacherId),
          supabase.from('schedule_occurrences').select('student_id').eq('teacher_id', selectedTeacherId),
          supabase.from('bands').select('id, coach_id, band_members(user_id)').eq('coach_id', selectedTeacherId),
          supabase.from('users').select('*').eq('id', selectedTeacherId).maybeSingle(),
          queryCache.fetch(`students_table_${schoolId}`, async () => {
            const { data } = await supabase.from('students').select('id, first_name, last_name, instrument, lesson_duration, sibling_group_id, group_id, is_campus_active, is_groovelab_active, is_active, teacher_id').eq('school_id', schoolId);
            return data || [];
          }, { ttlMs: 60_000, staleWhileRevalidate: true }),
          queryCache.fetch(`student_users_${schoolId}`, async () => {
            const { data } = await supabase.from('users').select('id, first_name, last_name, instrument, lesson_duration, sibling_group_id, group_id, is_campus_active, is_groovelab_active, is_active, status, teacher_id').eq('school_id', schoolId).eq('role', 'student');
            return data || [];
          }, { ttlMs: 60_000, staleWhileRevalidate: true }),
          queryCache.fetch(`pending_students_${schoolId}`, async () => {
            const { data } = await supabase.from('pending_students_decrypted').select('id, first_name, last_name, instrument, lesson_duration, sibling_group_id, group_id, teacher_id').eq('school_id', schoolId);
            return data || [];
          }, { ttlMs: 60_000, staleWhileRevalidate: true }),
          queryCache.fetch(`other_schedules_${schoolId}_${selectedTeacherId}`, async () => {
            const { data } = await supabase
              .from('schedules')
              .select('*, student:users!schedules_student_id_fkey(id, first_name, last_name), teacher:users!schedules_teacher_id_fkey(id, first_name, last_name)')
              .eq('school_id', schoolId)
              .neq('teacher_id', selectedTeacherId);
            return data || [];
          }, { ttlMs: 30_000, staleWhileRevalidate: true }),
          queryCache.fetch(`blocked_slots_${schoolId}`, async () => {
            const { data } = await supabase.from('room_blocked_slots').select('*').eq('school_id', schoolId);
            return data || [];
          }, { ttlMs: 60_000, staleWhileRevalidate: true }),
          queryCache.fetch(`student_schedule_preferences_${schoolId}`, async () => {
            const { data } = await supabase.from('student_schedule_preferences').select('*').eq('school_id', schoolId);
            return data || [];
          }, { ttlMs: 60_000, staleWhileRevalidate: true })
        ]);

        loadedRooms = fallbackRooms || [];
        schedData = schedRes.data || [];
        occData = occRes.data || [];
        groupData = groupRes.data || [];
        teacherProfile = profileRes.data || null;
        allStudentsDb = studentsDbRes || [];
        allSchoolStudentUsers = schoolUsersRes || [];
        pendingData = pendingRes || [];
        otherSchedData = otherRes || [];
        blockedSlotsData = blockedRes || [];
        allDbPrefs = prefsRes || [];

        const schedStudentIds = (schedData || []).map(s => s.student_id).filter(Boolean);
        const occStudentIds = (occData || []).map(s => s.student_id).filter(Boolean);

        let groupStudentIds: string[] = [];
        if (groupData && groupData.length > 0) {
          groupData.forEach(g => {
            if (Array.isArray(g.band_members)) {
              g.band_members.forEach((bm: any) => {
                if (bm?.user_id) groupStudentIds.push(bm.user_id);
              });
            }
          });
        }

        rawPlannedEarly = teacherProfile?.planned_boards || (teacherProfile as any)?.campus_räume || (teacherProfile as any)?.groovelab_räume;
        const savedTeacherStudentIds = new Set<string>(
          Array.isArray(rawPlannedEarly?.allTeacherStudentIds)
            ? rawPlannedEarly.allTeacherStudentIds
            : (Array.isArray(rawPlannedEarly?.unassignedStudentIds) ? rawPlannedEarly.unassignedStudentIds : [])
        );

        // 🛡️ Enterprise+ Goldstandard: Harvest all student IDs embedded in stored drafts and boards
        if (rawPlannedEarly?.drafts && Array.isArray(rawPlannedEarly.drafts)) {
          rawPlannedEarly.drafts.forEach((d: any) => {
            (d.boards || []).forEach((b: any) => {
              (b.students || []).forEach((st: any) => {
                if (st?.id && !st.id.startsWith('break-')) savedTeacherStudentIds.add(st.id);
                if (Array.isArray(st?.groupStudents)) {
                  st.groupStudents.forEach((gs: any) => {
                    if (gs?.id) savedTeacherStudentIds.add(gs.id);
                  });
                }
              });
            });
          });
        } else if (Array.isArray(rawPlannedEarly)) {
          rawPlannedEarly.forEach((b: any) => {
            (b.students || []).forEach((st: any) => {
              if (st?.id && !st.id.startsWith('break-')) savedTeacherStudentIds.add(st.id);
              if (Array.isArray(st?.groupStudents)) {
                st.groupStudents.forEach((gs: any) => {
                  if (gs?.id) savedTeacherStudentIds.add(gs.id);
                });
              }
            });
          });
        }

        const teacherAssignedStudentIds = new Set([...schedStudentIds, ...occStudentIds, ...groupStudentIds]);

        const statusMap: Record<string, string> = {};
        const stDbStudentIds = new Set<string>();
        allStudentsDb?.forEach((st: any) => {
          if (st.id) stDbStudentIds.add(st.id);
          if ((st as any).user_id) stDbStudentIds.add((st as any).user_id);
          if ((st as any).student_id) stDbStudentIds.add((st as any).student_id);
          statusMap[st.id] = st.status;
        });

        // Filter helper: ONLY include students explicitly assigned to selected teacher or via recurring schedules/bands/draft backups
        const matchesTeacher = (tId?: string | null, sId?: string, isGroup?: boolean) => {
          if (!selectedTeacherId) return false;
          if (isGroup || (sId && sId.startsWith('group-'))) return true;
          if (tId) {
            return tId === selectedTeacherId;
          }
          if (sId && (teacherAssignedStudentIds.has(sId) || savedTeacherStudentIds.has(sId))) {
            return true;
          }
          return false;
        };

        const registerStudentOrMerge = (cand: {
          id: string;
          userId?: string | null;
          fname: string;
          lname: string;
          instrument?: string | null;
          duration?: number;
          status?: string;
          sibling_group_id?: string | null;
          group_id?: string | null;
          isOnboarded?: boolean;
        }) => {
          const fname = cand.fname || 'Schüler';
          const lname = cand.lname || '';
          const nameKey = `${fname.toLowerCase().trim()}_${lname.toLowerCase().trim()}`;
          
          const existingCanonicalId = (cand.userId && userToStudentIdMap.get(cand.userId)) ||
            idAliasMap.get(cand.id) ||
            (cand.userId && idAliasMap.get(cand.userId)) ||
            (nameKey !== '_' && nameToCanonicalIdMap.get(nameKey));

          if (existingCanonicalId && studentMap.has(existingCanonicalId)) {
            const existing = studentMap.get(existingCanonicalId)!;
            idAliasMap.set(cand.id, existingCanonicalId);
            if (cand.userId) idAliasMap.set(cand.userId, existingCanonicalId);

            if (fname && fname !== 'Schüler' && (existing.first_name === 'Schüler' || !existing.first_name)) {
              existing.first_name = fname;
              existing.last_name = lname;
            }
            if (cand.isOnboarded) existing.isOnboarded = true;
            if (cand.instrument && cand.instrument !== 'Musiker' && (!existing.instrument || existing.instrument === 'Musiker')) {
              existing.instrument = cand.instrument;
            }
            if (cand.duration && cand.duration > (existing.duration || 0)) {
              existing.duration = cand.duration;
            }
            if (cand.sibling_group_id && !existing.sibling_group_id) {
              existing.sibling_group_id = cand.sibling_group_id;
            }
            if (cand.group_id && !existing.group_id) {
              existing.group_id = cand.group_id;
            }
            return existingCanonicalId;
          }

          const canonicalId = cand.userId || cand.id;
          idAliasMap.set(cand.id, canonicalId);
          if (cand.userId) {
            idAliasMap.set(cand.userId, canonicalId);
            userToStudentIdMap.set(cand.userId, canonicalId);
          }
          if (nameKey !== '_') {
            nameToCanonicalIdMap.set(nameKey, canonicalId);
          }

          studentMap.set(canonicalId, {
            id: canonicalId,
            first_name: fname,
            last_name: lname,
            instrument: cand.instrument || 'Musiker',
            duration: cand.duration || 30,
            status: (cand.status || 'ausstehend') as any,
            sibling_group_id: cand.sibling_group_id || undefined,
            group_id: cand.group_id || null,
            isOnboarded: Boolean(cand.isOnboarded),
            hasPreferences: false
          });
          return canonicalId;
        };

        allStudentsDb?.forEach(s => {
          if (!matchesTeacher(s.teacher_id, s.id)) return;
          const studentId = s.id;
          const pendingMatch = pendingData?.find((p: any) => p.id === studentId);
          const userMatch = allSchoolStudentUsers?.find((u: any) => u.id === studentId || u.id === (s as any).user_id);
          const userFname = userMatch ? resolveFirstName(userMatch) : '';
          const pendingFname = pendingMatch ? resolveFirstName(pendingMatch) : '';
          const rawFname = resolveFirstName(s);
          const candidateFname = (userFname && userFname !== 'Schüler') ? userFname : ((pendingFname && pendingFname !== 'Schüler') ? pendingFname : ((rawFname && rawFname !== 'Schüler') ? rawFname : ''));
          
          if (!userMatch && (!candidateFname || ['ausstehender schüler', 'ausstehendes', 'unbekannt', 'onboarding', 'test'].includes(candidateFname.toLowerCase()))) {
            return;
          }

          const fname = candidateFname || 'Schüler';
          const lname = (userMatch ? resolveLastName(userMatch) : '') || (pendingMatch ? resolveLastName(pendingMatch) : '') || resolveLastName(s);
          
          registerStudentOrMerge({
            id: studentId,
            userId: (s as any).user_id || (userMatch ? userMatch.id : null),
            fname,
            lname,
            instrument: s.instrument || (userMatch ? userMatch.instrument : null) || (pendingMatch ? pendingMatch.instrument : 'Musiker'),
            duration: s.lesson_duration || 30,
            status: ((s as any).status || 'ausstehend') as any,
            sibling_group_id: s.sibling_group_id,
            group_id: s.group_id,
            isOnboarded: Boolean(s.is_campus_active || s.is_groovelab_active || s.is_active || (s as any).status === 'aktiv')
          });
        });

        (allSchoolStudentUsers || []).forEach(u => {
          if (!matchesTeacher((u as any).teacher_id, u.id)) return;
          const fname = resolveFirstName(u);
          const lname = resolveLastName(u);
          
          registerStudentOrMerge({
            id: u.id,
            userId: u.id,
            fname,
            lname,
            instrument: u.instrument || 'Musiker',
            duration: u.lesson_duration || 30,
            status: (statusMap[u.id] || 'ausstehend') as any,
            sibling_group_id: u.sibling_group_id,
            group_id: u.group_id,
            isOnboarded: Boolean(u.is_campus_active || u.is_groovelab_active || u.is_active || statusMap[u.id] === 'aktiv')
          });
        });

        (pendingData || []).forEach((p: any) => {
          if (!matchesTeacher(p.teacher_id, p.id)) return;
          const pFname = resolveFirstName(p);
          if (!pFname || pFname === 'Schüler' || ['ausstehender schüler', 'ausstehendes', 'unbekannt', 'onboarding', 'test'].includes(pFname.toLowerCase())) return;
          const pLname = resolveLastName(p);

          registerStudentOrMerge({
            id: p.id,
            userId: null,
            fname: pFname,
            lname: pLname,
            instrument: p.instrument || 'Musiker',
            duration: p.lesson_duration || 30,
            status: 'ausstehend',
            sibling_group_id: p.sibling_group_id,
            group_id: p.group_id || null,
            isOnboarded: false
          });
        });

        (schedData || []).forEach((sched: any) => {
          if (sched.student_id) {
            const sId = sched.student_id;
            const stObj = sched.student || {};
            const fname = resolveFirstName(stObj);
            const lname = resolveLastName(stObj);
            registerStudentOrMerge({
              id: sId,
              userId: sId,
              fname: fname !== 'Schüler' ? fname : 'Schüler',
              lname,
              instrument: stObj.instrument || 'Gitarre',
              duration: sched.duration || stObj.lesson_duration || 30,
              status: 'verplant',
              sibling_group_id: stObj.sibling_group_id,
              group_id: stObj.group_id || null,
              isOnboarded: Boolean(stObj.is_campus_active || stObj.is_groovelab_active || stObj.is_active)
            });
          }
        });
      }

      setOtherTeachersSchedules(otherSchedData || []);
      setBlockedSlots(blockedSlotsData || []);

      setRooms(loadedRooms || []);
      const activePlatformVal = localStorage.getItem('groovelab_active_platform') || 'groovelab';
      const defaultRoomObj = activePlatformVal === 'groovelab'
        ? (loadedRooms.find((r: any) => r.name.toLowerCase().includes('groovelab')) || loadedRooms[0])
        : (loadedRooms.find((r: any) => !r.name.toLowerCase().includes('groovelab')) || loadedRooms[0]);
      const defaultRoomId = defaultRoomObj ? defaultRoomObj.id : '';

      if (loadedRooms && loadedRooms.length > 0) {
        setNewBoardRoom(defaultRoomId);
      }

      const loadedStudents: Student[] = Array.from(studentMap.values());
      
      const prefSubmittedSet = new Set<string>();
      const prefMap: Record<string, any[]> = {};

      allDbPrefs?.forEach((p: any) => {
        if (!p.student_id) return;
        prefSubmittedSet.add(p.student_id);
        
        const matchingStudent = loadedStudents.find(s => s.id === p.student_id);
        const targetId = matchingStudent ? matchingStudent.id : p.student_id;
        prefSubmittedSet.add(targetId);
        if (!prefMap[targetId]) prefMap[targetId] = [];
        prefMap[targetId].push(p);
      });
      setAllStudentPrefsMap(prefMap);

      loadedStudents.forEach(s => {
        s.hasPreferences = prefSubmittedSet.has(s.id);
      });

      setIsOnboardingCompleted(teacherProfile?.teacher_onboarding_completed ?? false);
      setTeacherAvailability(teacherProfile?.teacher_availability ?? {});

      const rawPlanned = rawPlannedEarly;
      const storedDraftState = localStorage.getItem(`groovelab_teacher_draft_state_${activePlatform}_${selectedTeacherId}`);
      const storedBoardsState = localStorage.getItem(`groovelab_teacher_boards_${activePlatform}_${selectedTeacherId}`) || localStorage.getItem(`groovelab_teacher_boards_${selectedTeacherId}`);
      const hasSavedDrafts = !!(
        (rawPlanned && (Array.isArray(rawPlanned) ? rawPlanned.length > 0 : ((rawPlanned as any).drafts && (rawPlanned as any).drafts.length > 0))) ||
        storedDraftState ||
        storedBoardsState
      );
      
      let loadedDrafts: { id: string; name: string; boards: DayBoard[] }[] = [];
      let loadedActiveDraftId = 'default';
      let loadedSubmittedDraftId = '';
      let loadedSubmittedAt = '';

      if (rawPlanned && typeof rawPlanned === 'object' && !Array.isArray(rawPlanned) && (rawPlanned as any).drafts) {
        loadedDrafts = (rawPlanned as any).drafts;
        loadedActiveDraftId = (rawPlanned as any).activeDraftId || 'default';
        loadedSubmittedDraftId = (rawPlanned as any).submittedDraftId || '';
        loadedSubmittedAt = (rawPlanned as any).submittedAt || '';
      } else if (Array.isArray(rawPlanned) && rawPlanned.length > 0) {
        // Legacy single draft format
        loadedDrafts = [{ id: 'default', name: 'Entwurf 1', boards: rawPlanned as any }];
        loadedActiveDraftId = 'default';
      }

      // Read local storage draft state
      const stored = localStorage.getItem(`groovelab_teacher_draft_state_${activePlatform}_${selectedTeacherId}`);
      let localParsedDrafts: any[] = [];
      let localActiveDraftId = '';
      let localSubmittedDraftId = '';
      let localSubmittedAt = '';
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && Array.isArray(parsed.drafts)) {
            localParsedDrafts = parsed.drafts;
            localActiveDraftId = parsed.activeDraftId || '';
            localSubmittedDraftId = parsed.submittedDraftId || '';
            localSubmittedAt = parsed.submittedAt || '';
          }
        } catch (e) {}
      }

      // FAIL-SAFE MERGE: Never drop any locally created drafts, but strictly deduplicate by ID and Name
      if (localParsedDrafts.length > 0) {
        if (loadedDrafts.length === 0) {
          loadedDrafts = localParsedDrafts;
          if (localActiveDraftId) loadedActiveDraftId = localActiveDraftId;
          if (localSubmittedDraftId) loadedSubmittedDraftId = localSubmittedDraftId;
          if (localSubmittedAt) loadedSubmittedAt = localSubmittedAt;
        } else {
          const dbDraftIdSet = new Set(loadedDrafts.map(d => d.id));
          const dbDraftNameSet = new Set(loadedDrafts.map(d => (d.name || '').trim().toLowerCase()));

          for (const ld of localParsedDrafts) {
            const ldName = (ld.name || '').trim().toLowerCase();
            const existingById = loadedDrafts.find(d => d.id === ld.id);
            const existingByName = !existingById && (ldName === 'entwurf 1' || ldName === 'standard-entwurf')
              ? loadedDrafts.find(d => (d.name || '').trim().toLowerCase() === 'entwurf 1' || (d.name || '').trim().toLowerCase() === 'standard-entwurf')
              : null;

            const existing = existingById || existingByName;

            if (existing) {
              // Deduplication match: merge boards if existing is empty and local has students
              const existingStudentCount = (existing.boards || []).reduce((acc: number, b: any) => acc + (b.students || []).filter((s: any) => !s.isBreak).length, 0);
              const localStudentCount = (ld.boards || []).reduce((acc: number, b: any) => acc + (b.students || []).filter((s: any) => !s.isBreak).length, 0);

              if (existingStudentCount === 0 && localStudentCount > 0) {
                existing.boards = ld.boards;
              }
            } else if (!dbDraftIdSet.has(ld.id) && !dbDraftNameSet.has(ldName)) {
              // Genuinely distinct local draft
              loadedDrafts.push(ld);
              dbDraftIdSet.add(ld.id);
              dbDraftNameSet.add(ldName);
            }
          }

          // Active draft precedence: A draft with populated students must ALWAYS take precedence over an empty draft
          const activeCandidate = loadedDrafts.find(d => d.id === localActiveDraftId);
          const activeCandidateCount = activeCandidate ? (activeCandidate.boards || []).reduce((acc: number, b: any) => acc + (b.students || []).filter((s: any) => !s.isBreak).length, 0) : 0;
          const bestPopulatedDraft = loadedDrafts.find(d => (d.boards || []).some((b: any) => (b.students || []).some((s: any) => !s.isBreak)));

          if (activeCandidate && (activeCandidateCount > 0 || !bestPopulatedDraft)) {
            loadedActiveDraftId = localActiveDraftId;
          } else if (bestPopulatedDraft) {
            loadedActiveDraftId = bestPopulatedDraft.id;
          }

          if (localSubmittedDraftId) {
            loadedSubmittedDraftId = localSubmittedDraftId;
          }
          if (localSubmittedAt) {
            loadedSubmittedAt = localSubmittedAt;
          }
        }
      }

      if (loadedDrafts.length === 0) {
        // Fallback to old single boards localstorage item if present
        const storedBoards = localStorage.getItem(`groovelab_teacher_boards_${activePlatform}_${selectedTeacherId}`) || localStorage.getItem(`groovelab_teacher_boards_${selectedTeacherId}`);
        let parsedStored: any[] = [];
        if (storedBoards) {
          try {
            parsedStored = JSON.parse(storedBoards);
          } catch (e) {}
        }
        loadedDrafts = [{ id: 'default', name: 'Entwurf 1', boards: parsedStored }];
        loadedActiveDraftId = 'default';
      }

      const validStudentIds = new Set(Array.from(studentMap.keys()));

      // Helper to resolve canonical student from draft slot
      const resolveStudentFromDraft = (s: any): Student | undefined => {
        if (!s || s.isBreak || s.isVacant) return undefined;
        if (s.id && studentMap.has(s.id)) return studentMap.get(s.id);
        if (s.id && idAliasMap.has(s.id)) {
          const canonicalId = idAliasMap.get(s.id)!;
          if (studentMap.has(canonicalId)) return studentMap.get(canonicalId);
        }
        const fn = (s.first_name || '').trim().toLowerCase();
        const ln = (s.last_name || '').trim().toLowerCase();
        const nameKey = `${fn}_${ln}`;
        if (nameKey !== '_' && nameToCanonicalIdMap.has(nameKey)) {
          const canonicalId = nameToCanonicalIdMap.get(nameKey)!;
          if (studentMap.has(canonicalId)) return studentMap.get(canonicalId);
        }
        return undefined;
      };

      // Rename legacy 'Standard-Entwurf' to 'Entwurf 1' and preserve all students with Zero-Drop Fail-Safe
      loadedDrafts = loadedDrafts.map(d => ({
        ...d,
        name: d.name === 'Standard-Entwurf' ? 'Entwurf 1' : d.name,
        boards: (d.boards || []).map(b => ({
          ...b,
          students: (b.students || []).map(s => {
            if (s.isBreak || s.isVacant) return s;
            if (s.isGroup || (s.id && s.id.startsWith('group-')) || (s.groupStudents && s.groupStudents.length > 0)) {
              if (s.groupStudents && Array.isArray(s.groupStudents)) {
                const validMembers: any[] = [];
                s.groupStudents.forEach((gs: any) => {
                  const resolved = resolveStudentFromDraft(gs);
                  if (resolved) {
                    validMembers.push({
                      ...gs,
                      id: resolved.id,
                      first_name: resolved.first_name,
                      last_name: resolved.last_name,
                      instrument: resolved.instrument || gs.instrument,
                      duration: resolved.duration || gs.duration
                    });
                  } else {
                    validMembers.push({
                      ...gs,
                      first_name: gs.first_name || 'Schüler',
                      last_name: gs.last_name || '',
                      instrument: gs.instrument || 'Musiker',
                      duration: gs.duration || 30
                    });
                  }
                });
                if (validMembers.length === 0) return s;
                if (validMembers.length === 1) {
                  const m = validMembers[0];
                  return {
                    ...s,
                    isGroup: false,
                    id: m.id,
                    first_name: m.first_name,
                    last_name: m.last_name,
                    instrument: m.instrument,
                    duration: m.duration,
                    groupStudents: undefined
                  };
                }
                return {
                  ...s,
                  first_name: formatGroupStudentsAnonymized(validMembers, false),
                  groupStudents: validMembers
                };
              }
              return s;
            }
            const resolved = resolveStudentFromDraft(s);
            if (resolved) {
              return {
                ...s,
                id: resolved.id,
                first_name: resolved.first_name,
                last_name: resolved.last_name,
                instrument: resolved.instrument || s.instrument,
                duration: resolved.duration || s.duration
              };
            }
            // 🛡️ Fail-Safe Preservation: NEVER drop a student from a teacher's draft!
            return {
              ...s,
              first_name: s.first_name || 'Schüler',
              last_name: s.last_name || '',
              instrument: s.instrument || 'Musiker',
              duration: s.duration || 30
            };
          }).filter(Boolean) as Student[]
        }))
      }));

      if (!loadedActiveDraftId || !loadedDrafts.some(d => d.id === loadedActiveDraftId)) {
        loadedActiveDraftId = loadedDrafts[0]?.id || 'default';
      }

      setDrafts(loadedDrafts);
      setActiveDraftId(loadedActiveDraftId);

      const currentActiveDraft = loadedDrafts.find(d => d.id === loadedActiveDraftId) || loadedDrafts[0];
      const dbPlannedBoards = currentActiveDraft ? currentActiveDraft.boards : [];

      // 4. Existing schedules already pre-fetched as schedData (otherTeachersSchedules & blockedSlots already batched in Promise.all)

      if (schedData && schedData.length > 0) {
        setHasSubmittedSchedule(true);
        // Resolve canonical submitted draft ID: strictly prefer explicitly submitted/approved draft
        let finalSubmittedId = '';
        if (loadedSubmittedDraftId && loadedDrafts.some(d => d.id === loadedSubmittedDraftId)) {
          finalSubmittedId = loadedSubmittedDraftId;
        } else {
          const approvedOrPendingDraft = loadedDrafts.find(d => (d as any).status === 'approved' || (d as any).status === 'ready_for_admin_review');
          if (approvedOrPendingDraft) {
            finalSubmittedId = approvedOrPendingDraft.id;
          } else {
            // Find draft with the most assigned students (avoid picking a fresh empty draft)
            const draftWithMostStudents = [...loadedDrafts].sort((a, b) => {
              const aCount = a.boards?.reduce((acc, brd) => acc + (brd.students?.length || 0), 0) || 0;
              const bCount = b.boards?.reduce((acc, brd) => acc + (brd.students?.length || 0), 0) || 0;
              return bCount - aCount;
            })[0];
            finalSubmittedId = draftWithMostStudents?.id || '';
          }
        }
        setSubmittedDraftId(finalSubmittedId);

        // Determine schedule review/approval status
        const submittedDraftObj = loadedDrafts.find(d => d.id === finalSubmittedId);
        const isDraftPending = (submittedDraftObj as any)?.status === 'ready_for_admin_review';
        const isDraftNeedsRevision = (submittedDraftObj as any)?.status === 'needs_revision' || (rawPlanned as any)?.status === 'needs_revision';
        const isDraftApproved = (submittedDraftObj as any)?.status === 'approved' || (rawPlanned as any)?.status === 'approved';

        const nonBreakSchedules = schedData.filter(s => s.student_id !== null);
        if (isDraftNeedsRevision) {
          setScheduleStatus('needs_revision');
          setRejectionNote((submittedDraftObj as any)?.rejectionNote || (rawPlanned as any)?.rejectionNote || null);
        } else if (isDraftPending) {
          setScheduleStatus('pending');
        } else if (isDraftApproved) {
          setScheduleStatus('approved');
        } else if (nonBreakSchedules.length > 0) {
          const allApproved = nonBreakSchedules.every(s => s.status === 'approved');
          const hasPending = nonBreakSchedules.some(s => s.status === 'ready_for_admin_review');
          if (allApproved) {
            setScheduleStatus('approved');
          } else if (hasPending) {
            setScheduleStatus('pending');
          } else {
            setScheduleStatus('pending');
          }
        } else {
          setScheduleStatus('approved');
        }

        // Parse and set the submission timestamp with date and time
        let submissionDate: Date | null = null;
        if (loadedSubmittedAt) {
          submissionDate = new Date(loadedSubmittedAt);
          setSubmittedAtIso(loadedSubmittedAt);
          submittedAtIsoRef.current = loadedSubmittedAt;
        } else {
          // Find the latest created_at in schedData
          const dates = schedData.map(s => s.created_at ? new Date(s.created_at).getTime() : 0).filter(t => t > 0);
          if (dates.length > 0) {
            submissionDate = new Date(Math.max(...dates));
          }
        }

        if (submissionDate && !isNaN(submissionDate.getTime())) {
          const rawDate = submissionDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
          const cleanDate = rawDate.endsWith('.') ? rawDate.slice(0, -1) : rawDate;
          const formattedTime = submissionDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
          setLastSubmittedTime(`am ${cleanDate}. um ${formattedTime} Uhr`);
        } else {
          setLastSubmittedTime(null);
        }
      } else {
        const submittedDraftObj = loadedDrafts.find(d => d.id === (loadedSubmittedDraftId || loadedActiveDraftId));
        const isDraftPending = (submittedDraftObj as any)?.status === 'ready_for_admin_review';
        const isDraftNeedsRevision = (submittedDraftObj as any)?.status === 'needs_revision' || (rawPlanned as any)?.status === 'needs_revision';
        const isDraftApproved = (submittedDraftObj as any)?.status === 'approved' || (rawPlanned as any)?.status === 'approved';

        if (loadedSubmittedDraftId || isDraftPending || isDraftNeedsRevision || isDraftApproved) {
          setHasSubmittedSchedule(true);
          setSubmittedDraftId(loadedSubmittedDraftId || loadedActiveDraftId);
          if (isDraftNeedsRevision) {
            setScheduleStatus('needs_revision');
            setRejectionNote((submittedDraftObj as any)?.rejectionNote || (rawPlanned as any)?.rejectionNote || null);
          } else if (isDraftApproved) {
            setScheduleStatus('approved');
          } else {
            setScheduleStatus('pending');
          }
          if (loadedSubmittedAt) {
            setSubmittedAtIso(loadedSubmittedAt);
            submittedAtIsoRef.current = loadedSubmittedAt;
            const submissionDate = new Date(loadedSubmittedAt);
            if (!isNaN(submissionDate.getTime())) {
              const rawDate = submissionDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
              const cleanDate = rawDate.endsWith('.') ? rawDate.slice(0, -1) : rawDate;
              const formattedTime = submissionDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
              setLastSubmittedTime(`am ${cleanDate}. um ${formattedTime} Uhr`);
            }
          }
        } else {
          setHasSubmittedSchedule(false);
          setSubmittedDraftId('');
          setScheduleStatus('none');
          setLastSubmittedTime(null);
          setActiveTab('designer');
        }
      }

      // Reconstruct boards based on database planned_boards OR localStorage OR existing schedules
      let reconstructedBoards: DayBoard[] = [];
      const usedStudentIds = new Set<string>();

      const activeBoardsDefinition = dbPlannedBoards;

      if (activeBoardsDefinition && activeBoardsDefinition.length > 0) {
        try {
          reconstructedBoards = activeBoardsDefinition.map(p => {
            const daySched = schedData?.find((s: any) => s.day_of_week === p.dayOfWeek && s.room_id);
            return {
              id: p.id,
              dayOfWeek: p.dayOfWeek,
              startAnchor: p.startAnchor,
              roomId: daySched ? daySched.room_id : p.roomId,
              students: (p.students || []).map((s: any) => {
                const dbStudent = resolveStudentFromDraft(s) || loadedStudents.find(ls => ls.id === s.id);
                const targetDuration = dbStudent?.duration || (s.lesson_duration ? s.lesson_duration : 30);
                if (!s.isBreak) {
                  return {
                    ...s,
                    id: dbStudent?.id || s.id,
                    duration: targetDuration,
                    first_name: dbStudent?.first_name || s.first_name,
                    last_name: dbStudent?.last_name || s.last_name,
                    instrument: dbStudent?.instrument || s.instrument
                  };
                }
                return s;
              })
            };
          });
          
          const totalAssignedInDraft = reconstructedBoards.reduce((acc, b) => acc + b.students.length, 0);

          if (totalAssignedInDraft === 0 && schedData && schedData.length > 0) {
            // Populate students from schedData into these boards
            schedData.forEach(slot => {
              const isBreak = !slot.student;
              if (!isBreak) {
                usedStudentIds.add(slot.student_id);
              }
              
              // Find matching board by dayOfWeek and roomId
              let matchingBoard = reconstructedBoards.find(b => b.dayOfWeek === slot.day_of_week && b.roomId === slot.room_id);
              if (!matchingBoard) {
                // fallback to matching by dayOfWeek only
                matchingBoard = reconstructedBoards.find(b => b.dayOfWeek === slot.day_of_week);
              }
              
              if (matchingBoard) {
                  matchingBoard.students.push({
                  id: isBreak ? `break-${crypto.randomUUID()}` : slot.student.id,
                  first_name: isBreak ? 'Pause' : slot.student.first_name,
                  last_name: isBreak ? '' : slot.student.last_name,
                  instrument: isBreak ? '' : (slot.student.instrument || 'Musiker'),
                  duration: slot.duration || (isBreak ? 15 : (slot.student.lesson_duration || 30)),
                  assignedDay: slot.day_of_week,
                  assignedTime: slot.time_slot,
                  isBreak: isBreak,
                  customStartTime: isBreak ? slot.time_slot : undefined
                });
              } else {
                // If schedule exists but no board in localStorage, reconstruct a new board for it
                const boardId = `board-${crypto.randomUUID()}`;
                reconstructedBoards.push({
                  id: boardId,
                  dayOfWeek: slot.day_of_week,
                  startAnchor: slot.time_slot || '14:00',
                  roomId: slot.room_id || undefined,
                  students: [{
                    id: isBreak ? `break-${crypto.randomUUID()}` : slot.student.id,
                    first_name: isBreak ? 'Pause' : slot.student.first_name,
                    last_name: isBreak ? '' : slot.student.last_name,
                    instrument: isBreak ? '' : (slot.student.instrument || 'Musiker'),
                    duration: slot.duration || (isBreak ? 15 : (slot.student.lesson_duration || 30)),
                    assignedDay: slot.day_of_week,
                    assignedTime: slot.time_slot,
                    isBreak: isBreak,
                    customStartTime: isBreak ? slot.time_slot : undefined
                  }]
                });
              }
            });
            
            // Recalculate times sequentially for all boards
            reconstructedBoards = reconstructedBoards.map(b => recalculateBoardTimes(b));
          } else {
            // Draft students are loaded, so mark those students as assigned in the usedStudentIds set
            reconstructedBoards.forEach(b => {
              b.students.forEach(s => {
                if (!s.isBreak) {
                  usedStudentIds.add(s.id);
                  if (s.isGroup && s.groupStudents && s.groupStudents.length > 0) {
                    s.groupStudents.forEach(gs => {
                      usedStudentIds.add(gs.id);
                    });
                  } else if (s.first_name && (s.first_name.includes('&') || s.first_name.includes(',') || /\b(and|und)\b/i.test(s.first_name))) {
                    const tokens = extractStudentTokensFromName(s.first_name);
                    tokens.forEach(tok => {
                      const can = resolveCanonicalStudentFromList(tok, loadedStudents);
                      if (can) usedStudentIds.add(can.id);
                    });
                  }
                }
              });
            });
            // Make sure loaded drafts have recalculated times to set endAnchors properly
            reconstructedBoards = reconstructedBoards.map(b => recalculateBoardTimes(b));
          }
        } catch (e) {
          console.error('Failed to parse stored boards, falling back...', e);
          reconstructedBoards = [];
        }
      }

      // Fallback: If no boards loaded or empty draft, reconstruct directly from database schedData
      if (reconstructedBoards.length === 0 && schedData && schedData.length > 0) {
        // Group schedules by day_of_week and room_id
        const groups: Record<string, typeof schedData> = {};
        schedData.forEach(s => {
          const key = `${s.day_of_week}_${s.room_id || 'no-room'}`;
          if (!groups[key]) groups[key] = [];
          groups[key].push(s);
        });

        Object.entries(groups).forEach(([key, slots]) => {
          const [dayStr, roomId] = key.split('_');
          const dayVal = parseInt(dayStr);
          
          // Sort slots in this day by time_slot to preserve order
          const sortedSlots = [...slots].sort((a, b) => (a.time_slot || '').localeCompare(b.time_slot || ''));
          
          const startAnchor = sortedSlots[0]?.time_slot || '14:00';
          
          const boardStudents: Student[] = [];
          sortedSlots.forEach(slot => {
            const isBreak = !slot.student;
            if (!isBreak) {
              usedStudentIds.add(slot.student_id);
            }
            
            boardStudents.push({
              id: isBreak ? `break-${crypto.randomUUID()}` : slot.student.id,
              first_name: isBreak ? 'Pause' : slot.student.first_name,
              last_name: isBreak ? '' : slot.student.last_name,
              instrument: isBreak ? '' : (slot.student.instrument || 'Musiker'),
              duration: slot.duration || (isBreak ? 15 : 45), // default to 45 if not specified
              assignedDay: dayVal,
              assignedTime: slot.time_slot,
              isBreak: isBreak,
              customStartTime: isBreak ? slot.time_slot : undefined
            });
          });

          reconstructedBoards.push({
            id: `board-${crypto.randomUUID()}`,
            dayOfWeek: dayVal,
            startAnchor,
            roomId: roomId === 'no-room' ? undefined : roomId,
            students: boardStudents
          });
        });
      }

      // Clean loadedStudents: filter out placeholder 'Schüler' entries without valid names, and deduplicate
      const validStudents = loadedStudents.filter(s => {
        if (!s) return false;
        const fn = (s.first_name || '').trim();
        const ln = (s.last_name || '').trim();
        if (fn === 'Schüler' && (!ln || ln === '')) return false;
        return true;
      });

      const deduplicateScheduleStudents = (students: Student[]): Student[] => {
        if (!Array.isArray(students)) return [];
        const seenIds = new Set<string>();
        const studentMap = new Map<string, Student>();

        for (const student of students) {
          if (!student) continue;
          if (student.id && seenIds.has(student.id)) continue;

          const fn = (student.first_name || '').trim().toLowerCase();
          const ln = (student.last_name || '').trim().toLowerCase();
          const nameKey = `${fn}_${ln}`;

          if (nameKey !== '_') {
            if (studentMap.has(nameKey)) {
              const existing = studentMap.get(nameKey)!;
              if (!existing.isOnboarded && student.isOnboarded) {
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

      const cleanStudents = deduplicateScheduleStudents(validStudents);
      masterStudentsRef.current = cleanStudents;

      // Consolidate database groups across all boards and pool
      const consolidated = consolidateDatabaseGroups(reconstructedBoards, cleanStudents);
      reconstructedBoards = consolidated.boards;
      const finalGroupedStudents = consolidated.pool;

      // Re-populate usedStudentIds set based on the grouped students
      usedStudentIds.clear();
      reconstructedBoards.forEach(b => {
        b.students.forEach(s => {
          if (!s.isBreak) {
            if (s.isGroup && s.groupStudents) {
              s.groupStudents.forEach(gs => usedStudentIds.add(gs.id));
            } else {
              usedStudentIds.add(s.id);
            }
          }
        });
      });

      // Ensure only teacher's configured Wunschtage are present in the designer if onboarding is completed
      const activeDays = Object.keys(teacherProfile?.teacher_availability || {}).map(Number);
      if (teacherProfile?.teacher_onboarding_completed && activeDays.length > 0) {
        reconstructedBoards = reconstructedBoards.filter(b => activeDays.includes(b.dayOfWeek));
        activeDays.forEach(i => {
          const hasDay = reconstructedBoards.some(b => b.dayOfWeek === i);
          if (!hasDay) {
            const dayConfig = (teacherProfile?.teacher_availability as any)?.[i];
            reconstructedBoards.push({
              id: `board-${crypto.randomUUID()}`,
              dayOfWeek: i,
              startAnchor: dayConfig?.start || '14:00',
              availabilityEnd: dayConfig?.end || '19:00',
              roomId: isTeacher ? undefined : defaultRoomId,
              students: []
            });
          }
        });
      } else {
        // Fallback for missing/uncompleted onboarding
        for (let i = 1; i <= 5; i++) {
          const hasDay = reconstructedBoards.some(b => b.dayOfWeek === i);
          if (!hasDay) {
            reconstructedBoards.push({
              id: `board-${crypto.randomUUID()}`,
              dayOfWeek: i,
              startAnchor: '14:00',
              roomId: isTeacher ? undefined : defaultRoomId,
              students: []
            });
          }
        }
      }

      // Sort boards by dayOfWeek so they are displayed chronologically (Monday to Friday, etc.)
      reconstructedBoards.sort((a, b) => a.dayOfWeek - b.dayOfWeek);

      // Make sure loaded drafts have recalculated times to set endAnchors properly
      reconstructedBoards = reconstructedBoards.map(b => recalculateBoardTimes(b));

      // Guarantee that all drafts in loadedDrafts (especially Entwurf 1) have valid day boards assigned
      const reconstructedStudentCount = reconstructedBoards.reduce((acc, b) => acc + (b.students || []).filter(s => !s.isBreak).length, 0);
      loadedDrafts = loadedDrafts.map(d => {
        const dStudentCount = (d.boards || []).reduce((acc, b) => acc + (b.students || []).filter(s => !s.isBreak).length, 0);
        if (!d.boards || d.boards.length === 0 || (d.id === loadedActiveDraftId && (reconstructedStudentCount > 0 || dStudentCount === 0))) {
          return { ...d, boards: reconstructedBoards };
        }
        return d;
      });
      setDrafts(loadedDrafts);

      setBoards(reconstructedBoards);
      if (schedData && schedData.length > 0) {
        setSubmittedBoardsSnapshot(JSON.stringify(reconstructedBoards.map(b => ({
          id: b.id,
          day: b.dayOfWeek,
          room: b.roomId,
          startAnchor: b.startAnchor,
          students: b.students.map(s => `${s.id}-${s.assignedTime}-${s.duration}-${s.isBreak ? '1' : '0'}`)
        }))));
      }
      setStudents(finalGroupedStudents);
      
      // Rule 1: Set activeTab dynamically on initial load. The 'calendar' tab opens as the start page whenever rooms are assigned or schedule is approved!
      if (!isInitialLoadDone) {
        const hasAllocatedRooms = reconstructedBoards.some((b: any) => !!b.roomId);
        const draftMapStr = typeof window !== 'undefined' ? localStorage.getItem(`groovelab_matrix_allocations_draft_${schoolId}`) : null;
        const hasDraftAllocations = !!draftMapStr && draftMapStr !== '{}';
        const isScheduleApproved = (schedData && schedData.length > 0 && schedData.filter((s: any) => s.student_id !== null).every((s: any) => s.status === 'approved'));
        const isUnlocked = isScheduleApproved || hasAllocatedRooms || hasDraftAllocations || (schedData && schedData.length > 0) || true;

        if (isUnlocked) {
          setActiveTab('calendar');
        } else {
          setActiveTab('designer');
        }
      }
      
      setIsInitialLoadDone(true);

      // Auto-trigger is now handled by usePremiumOnboardingTour
    } catch (err) {
      console.error('Error loading schedule board data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTeacherAvailability = async () => {
    const proceed = await showConfirm(
      "Möchtest du deine Unterrichtstage und Unterrichtszeiten ändern?\n\n" +
      "Bestehende Zuteilungen an Tagen, die du abwählst, werden entfernt. Andere Tage bleiben erhalten.",
      "Ja, Zeiten ändern",
      "Abbrechen"
    );
    if (!proceed) return;

    // Populate onboardingAvailability from teacherAvailability
    const updatedOnboarding: any = {
      1: { checked: false, start: '', end: '' },
      2: { checked: false, start: '', end: '' },
      3: { checked: false, start: '', end: '' },
      4: { checked: false, start: '', end: '' },
      5: { checked: false, start: '', end: '' },
      6: { checked: false, start: '', end: '' },
      7: { checked: false, start: '', end: '' }
    };
    
    Object.entries(teacherAvailability || {}).forEach(([dayNum, cfg]: [string, any]) => {
      const day = Number(dayNum);
      if (updatedOnboarding[day]) {
        updatedOnboarding[day].checked = true;
        updatedOnboarding[day].start = cfg.start || '';
        updatedOnboarding[day].end = cfg.end || '';
      }
    });
    
    setOnboardingAvailability(updatedOnboarding);
    setIsOnboardingCompleted(false);
  };

  const handleTeacherOnboardingSubmit = async () => {
    setOnboardingError(null);
    const activeDays = Object.entries(onboardingAvailability).filter(([_, cfg]) => cfg.checked);
    if (activeDays.length === 0) {
      setOnboardingError('Bitte wähle mindestens einen Wunschtag aus.');
      return;
    }
    
    // Check that start and end times are set and valid
    for (const [dayNum, cfg] of activeDays) {
      if (!cfg.start || !cfg.end) {
        const dayName = DAYS_OF_WEEK.find(d => d.value === Number(dayNum))?.name || 'Wochentag';
        setOnboardingError(`Bitte wähle Start- und Endzeit für ${dayName} aus.`);
        return;
      }
      const [sh, sm] = parseTime(cfg.start);
      const [eh, em] = parseTime(cfg.end);
      if (sh * 60 + sm >= eh * 60 + em) {
        const dayName = DAYS_OF_WEEK.find(d => d.value === Number(dayNum))?.name || 'Wochentag';
        setOnboardingError(`Die Endzeit an ${dayName} muss nach der Startzeit liegen.`);
        return;
      }
    }
    
    try {
      setOnboardingSubmitting(true);
      const availabilityJson: any = {};
      activeDays.forEach(([dayNum, cfg]) => {
        availabilityJson[Number(dayNum)] = { start: cfg.start, end: cfg.end };
      });
      
      const { error } = await supabase
        .from('users')
        .update({
          teacher_onboarding_completed: true,
          teacher_availability: availabilityJson
        })
        .eq('id', selectedTeacherId);
        
      if (error) throw error;
      
      try {
        localStorage.setItem('groovelab_teacher_availability', JSON.stringify(availabilityJson));
        if (selectedTeacherId) {
          localStorage.setItem(`groovelab_teacher_availability_${selectedTeacherId}`, JSON.stringify(availabilityJson));
        }
      } catch (e) {}
      
      // Auto-initialize standard draft boards for the selected days
      await loadInitialData();
      setIsOnboardingCompleted(true);
      setTeacherAvailability(availabilityJson);
    } catch (err: any) {
      console.error('Error submitting teacher onboarding:', err);
      setOnboardingError(err.message || 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
    } finally {
      setOnboardingSubmitting(false);
    }
  };

  // Helper to add minutes to an HH:MM time string
  function addMinutesToTime(time: string, mins: number): string {
    const [hStr, mStr] = time.split(':');
    let h = parseInt(hStr);
    let m = parseInt(mStr);
    
    m += mins;
    h += Math.floor(m / 60);
    m = m % 60;
    h = h % 24;

    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // Helper to insert a student into a board's student list at its exact chronological position
  function insertStudentChronologically(studentList: Student[], studentToInsert: Student, targetTime?: string, targetIndex?: number): Student[] {
    const list = [...studentList];
    if (targetTime) {
      const [tHours, tMins] = parseTime(targetTime);
      const targetMin = tHours * 60 + tMins;
      
      let insertIdx = list.findIndex(s => {
        const sTime = s.customStartTime || s.assignedTime;
        if (!sTime) return false;
        const [sh, sm] = parseTime(sTime);
        return (sh * 60 + sm) >= targetMin;
      });

      if (insertIdx === -1) {
        insertIdx = list.length;
      }

      list.splice(insertIdx, 0, studentToInsert);
    } else if (targetIndex !== undefined) {
      const insertIdx = Math.min(Math.max(0, targetIndex), list.length);
      list.splice(insertIdx, 0, studentToInsert);
    } else {
      list.push(studentToInsert);
    }
    return list;
  }

  // Helper to recalculate all lesson times in a column (gaps allowed, 100% zero-overlap guarantee)
  function recalculateBoardTimes(board: DayBoard, _priorityCardId?: string): DayBoard {
    const sortedStudents = [...board.students].sort((a, b) => {
      const aTime = a.customStartTime || a.assignedTime || board.startAnchor || '14:00';
      const bTime = b.customStartTime || b.assignedTime || board.startAnchor || '14:00';
      const [ah, am] = parseTime(aTime);
      const [bh, bm] = parseTime(bTime);
      return (ah * 60 + am) - (bh * 60 + bm);
    });

    let currentTime = snapTimeToGrid(board.startAnchor || '14:00', gridSnapMinutes || 15);
    const updatedStudents = sortedStudents.map(s => {
      let assignedStart = currentTime;
      let effectiveCustomTime = s.customStartTime;
      let isPinned = s.isPinned;

      if (s.isPinned && (s.customStartTime || s.assignedTime)) {
        const targetTime = s.customStartTime || s.assignedTime || '14:00';
        const snappedTarget = snapTimeToGrid(targetTime, gridSnapMinutes || 15);
        const [csh, csm] = parseTime(snappedTarget);
        const [curh, curm] = parseTime(currentTime);
        if (csh * 60 + csm >= curh * 60 + curm) {
          assignedStart = snappedTarget;
        } else {
          assignedStart = currentTime;
          isPinned = false;
        }
      } else if (s.customStartTime) {
        const snappedTarget = snapTimeToGrid(s.customStartTime, gridSnapMinutes || 15);
        const [csh, csm] = parseTime(snappedTarget);
        const [curh, curm] = parseTime(currentTime);
        if (csh * 60 + csm >= curh * 60 + curm) {
          assignedStart = snappedTarget;
          effectiveCustomTime = snappedTarget;
        } else {
          assignedStart = currentTime;
          effectiveCustomTime = currentTime;
        }
      } else {
        // Uncustomized student: sequence-fit immediately after preceding lesson
        assignedStart = currentTime;
      }

      const assignedTime = snapTimeToGrid(assignedStart, gridSnapMinutes || 15);
      currentTime = snapTimeToGrid(addMinutesToTime(assignedTime, s.duration || 30), gridSnapMinutes || 15);

      return {
        ...s,
        assignedDay: board.dayOfWeek,
        assignedTime,
        customStartTime: effectiveCustomTime,
        isPinned
      };
    });

    return {
      ...board,
      students: updatedStudents,
      endAnchor: currentTime
    };
  }

  // Add a new planned lesson day board
  const handleAddBoard = (e: React.FormEvent) => {
    e.preventDefault();
    const exists = boards.some(b => b.dayOfWeek === newBoardDay);
    if (exists) {
      const dayName = DAYS_OF_WEEK.find(d => d.value === newBoardDay)?.name || '';
      showAlert(`Der Unterrichtstag "${dayName}" wurde bereits hinzugefügt.`);
      return;
    }
    const newBoard: DayBoard = {
      id: `board-${crypto.randomUUID()}`,
      dayOfWeek: newBoardDay,
      startAnchor: newBoardStart,
      availabilityEnd: newBoardEnd,
      roomId: undefined,
      students: []
    };
    setBoards(prev => {
      const updated = [...prev, newBoard];
      return updated.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    });
    setShowAddBoardForm(false);
  };

  // Directly assign or reassign a room to a day board (used by secretariat and admin)
  const handleAssignBoardRoom = (boardId: string, newRoomId: string) => {
    setBoards(prev => prev.map(b => b.id === boardId ? { ...b, roomId: newRoomId || undefined } : b));
  };

  // 🏛️ Herrenberg-Goldstandard: Intelligente Raum-Kollisionsprüfung für das Schulsekretariat
  const getRoomCollisionInfo = (roomId: string, board: DayBoard): string | null => {
    if (!roomId) return null;
    const boardStudents = (board.students || []).filter(s => !s.isBreak && s.assignedTime);
    let startMin = 24 * 60;
    let endMin = 0;
    if (boardStudents.length > 0) {
      boardStudents.forEach(s => {
        const [sh, sm] = parseTime(s.assignedTime);
        const sStart = sh * 60 + sm;
        const sEnd = sStart + (s.duration || 30);
        if (sStart < startMin) startMin = sStart;
        if (sEnd > endMin) endMin = sEnd;
      });
    } else if (board.startAnchor) {
      const [sh, sm] = parseTime(board.startAnchor);
      startMin = sh * 60 + sm;
      endMin = startMin + 60;
    }
    if (startMin >= endMin) return null;

    // 1. Check against weekly blocked room slots
    const matchedBlocked = (blockedSlots || []).find((b: any) => {
      if (b.room_id !== roomId) return false;
      if (Number(b.day_of_week) !== Number(board.dayOfWeek)) return false;
      const [bsh, bsm] = parseTime(b.start_time ? b.start_time.substring(0, 5) : '00:00');
      const bStart = bsh * 60 + bsm;
      const [beh, bem] = parseTime(b.end_time ? b.end_time.substring(0, 5) : '23:59');
      const bEnd = beh * 60 + bem;
      return startMin < bEnd && endMin > bStart;
    });
    if (matchedBlocked) {
      return matchedBlocked.title ? `Gesperrt: ${matchedBlocked.title}` : 'Gesperrt';
    }

    // 2. Check against other teachers schedules
    const matchedOther = (otherTeachersSchedules || []).find((s: any) => {
      if (s.room_id !== roomId) return false;
      if (s.teacher_id === selectedTeacherId) return false;
      if (Number(s.day_of_week) !== Number(board.dayOfWeek)) return false;
      const [tsh, tsm] = parseTime(s.time_slot ? s.time_slot.substring(0, 5) : '00:00');
      const tStart = tsh * 60 + tsm;
      const tEnd = tStart + (s.duration || 45);
      return startMin < tEnd && endMin > tStart;
    });
    if (matchedOther) {
      const tName = formatTeacherFullName(matchedOther.teacher || teachers.find(t => t.id === matchedOther.teacher_id));
      return `Belegt (${tName !== 'Lehrkraft' ? tName : 'Andere Lehrkraft'})`;
    }

    return null;
  };

  // Add a break/pause to a day board
  const handleAddBreakToBoard = (boardId: string) => {
    setBoards(prev => prev.map(b => {
      if (b.id !== boardId) return b;
      
      const newBreak: Student = {
        id: `break-${crypto.randomUUID()}`,
        first_name: 'Pause',
        last_name: '',
        instrument: '',
        duration: 15, // default 15 minutes break
        isBreak: true
      };
      
      return recalculateBoardTimes({
        ...b,
        students: [...b.students, newBreak]
      });
    }));
  };

  // Delete a day board and return all its students to the sidebar list
  const handleDeleteBoard = async (boardId: string) => {
    if (!await showConfirm('Möchtest du diesen Unterrichtstag wirklich löschen? Alle zugewiesenen Schüler werden wieder freigegeben.')) return;
    
    const boardToDelete = boards.find(b => b.id === boardId);
    if (!boardToDelete) return;

    // Reset student assignment flags
    const returnedStudentIds = boardToDelete.students.map(s => s.id);
    setStudents(prev => prev.map(s => {
      if (returnedStudentIds.includes(s.id)) {
        return { ...s, assignedDay: undefined, assignedTime: undefined };
      }
      return s;
    }));

    setBoards(prev => {
      const nextBoards = prev.filter(b => b.id !== boardId);
      const currentActiveId = activeDraftIdRef.current || activeDraftId;
      const currentList = draftsRef.current.length > 0 ? draftsRef.current : drafts;
      const updatedDrafts = currentList.map(d => d.id === currentActiveId ? { ...d, boards: nextBoards } : d);
      draftsRef.current = updatedDrafts;
      setDrafts(updatedDrafts);
      triggerDebouncedAutoSave(nextBoards);
      return nextBoards;
    });
    setToast({ message: 'Unterrichtstag gelöscht und Schüler freigegeben', type: 'success' });
  };

  // Select/deselect a student and load their preferences in real-time
  const handleSelectStudent = async (studentId: string) => {
    if (selectedStudentId === studentId) {
      setSelectedStudentId(null);
      setSelectedStudentPrefs([]);
      setSelectedStudentNote(null);
      setSiblingInfo(null);
    } else {
      setSelectedStudentId(studentId);
      setSelectedStudentNote(null);
      try {
        let targetStudentIds = [studentId];
        let grpId: string | null = null;
        
        if (studentId.startsWith('group-')) {
          grpId = studentId.replace('group-', '');
        } else {
          const found = students.find(s => s.id === studentId);
          if (found?.group_id) {
            grpId = found.group_id;
          }
        }
        
        if (grpId) {
          const { data: grpUsers } = await supabase
            .from('users')
            .select('id')
            .eq('group_id', grpId);
          if (grpUsers && grpUsers.length > 0) {
            targetStudentIds = grpUsers.map((u: any) => u.id);
          }
        }

        const validStudentIds = targetStudentIds.filter(isUUID);
        const { data: prefsData, error: prefsErr } = validStudentIds.length > 0
          ? await supabase
              .from('student_schedule_preferences')
              .select('*')
              .in('student_id', validStudentIds)
          : { data: [], error: null };

        if (!prefsErr && prefsData) {
          const combinedPrefs: any[] = [];
          
          for (let day = 1; day <= 5; day++) {
            const slotsCount = 24 * 4; 
            const wunschCounts = Array(slotsCount).fill(0);
            const isGesperrt = Array(slotsCount).fill(false);
            
            targetStudentIds.forEach(sId => {
              const studentPrefs = prefsData.filter(p => p.student_id === sId && Number(p.day_of_week) === day);
              studentPrefs.forEach(pref => {
                const [sh, sm] = parseTime(pref.start_time);
                const [eh, em] = parseTime(pref.end_time);
                const startIdx = Math.floor((sh * 60 + sm) / 15);
                const endIdx = Math.ceil((eh * 60 + em) / 15);
                
                for (let i = startIdx; i < endIdx; i++) {
                  if (i >= 0 && i < slotsCount) {
                    if (pref.preference_type === 'gesperrt') {
                      isGesperrt[i] = true;
                    } else if (pref.preference_type === 'wunsch') {
                      wunschCounts[i]++;
                    }
                  }
                }
              });
            });
            
            let currentType: 'wunsch' | 'gesperrt' | null = null;
            let startIdx = -1;
            
            for (let i = 0; i < slotsCount; i++) {
              let type: 'wunsch' | 'gesperrt' | null = null;
              if (isGesperrt[i]) {
                type = 'gesperrt';
              } else if (wunschCounts[i] === targetStudentIds.length && targetStudentIds.length > 0) {
                type = 'wunsch';
              }
              
              if (type !== currentType) {
                if (currentType && startIdx !== -1) {
                  const startTime = `${String(Math.floor((startIdx * 15) / 60)).padStart(2, '0')}:${String((startIdx * 15) % 60).padStart(2, '0')}:00`;
                  const endTime = `${String(Math.floor((i * 15) / 60)).padStart(2, '0')}:${String((i * 15) % 60).padStart(2, '0')}:00`;
                  combinedPrefs.push({
                    day_of_week: day,
                    start_time: startTime,
                    end_time: endTime,
                    preference_type: currentType
                  });
                }
                currentType = type;
                startIdx = type ? i : -1;
              }
            }
            if (currentType && startIdx !== -1) {
              const startTime = `${String(Math.floor((startIdx * 15) / 60)).padStart(2, '0')}:${String((startIdx * 15) % 60).padStart(2, '0')}:00`;
              const endTime = '24:00:00';
              combinedPrefs.push({
                day_of_week: day,
                start_time: startTime,
                end_time: endTime,
                preference_type: currentType
              });
            }
          }
          
          setSelectedStudentPrefs(combinedPrefs);
        } else {
          setSelectedStudentPrefs([]);
        }

        const firstStudentId = targetStudentIds.find(isUUID);
        
        if (firstStudentId) {
          const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select('parent_notes')
            .eq('id', firstStudentId)
            .maybeSingle();
          if (!studentError && studentData) {
            setSelectedStudentNote(studentData.parent_notes || null);
          } else {
            setSelectedStudentNote(null);
          }

          const { data: curStudent } = await supabase
            .from('users')
            .select('sibling_group_id')
            .eq('id', firstStudentId)
            .maybeSingle();

          if (curStudent?.sibling_group_id) {
            const { data: sibData } = await supabase
              .from('users')
              .select('id, first_name, last_name, instrument, lesson_duration')
              .eq('sibling_group_id', curStudent.sibling_group_id)
              .neq('id', firstStudentId)
              .maybeSingle();

            if (sibData && isUUID(sibData.id)) {
              const { data: sibSch } = await supabase
                .from('schedules')
                .select('day_of_week, start_time, room_id, teacher_id')
                .eq('student_id', sibData.id)
                .maybeSingle();

              const { data: sibPrefs } = await supabase
                .from('student_schedule_preferences')
                .select('*')
                .eq('student_id', sibData.id);

              const teacherMatch = (teachers || []).find((t: any) => t.id === sibSch?.teacher_id);
              const teacherName = teacherMatch ? `${teacherMatch.first_name || ''} ${teacherMatch.last_name || ''}`.trim() : undefined;

              setSiblingInfo({
                id: sibData.id,
                first_name: sibData.first_name || '',
                last_name: sibData.last_name || '',
                instrument: sibData.instrument || '',
                duration: sibData.lesson_duration || 30,
                assignedDay: sibSch?.day_of_week,
                assignedTime: sibSch?.start_time,
                teacher_name: teacherName || undefined,
                preferences: sibPrefs || []
              });
            } else {
              setSiblingInfo(null);
            }
          } else {
            setSiblingInfo(null);
          }
        } else {
          setSelectedStudentNote(null);
          setSiblingInfo(null);
        }
      } catch (err) {
        console.error("Error loading student preferences or notes:", err);
        setSelectedStudentPrefs([]);
        setSelectedStudentNote(null);
        setSiblingInfo(null);
      }
    }
  };

  const handleResetPreferences = async (studentId: string) => {
    if (!await showConfirm("Möchtest du das Onboarding für diesen Schüler zur Überarbeitung freigeben? Seine bisherigen Wünsche & Notizen bleiben erhalten, damit die Eltern sie bequem anpassen können.")) {
      return;
    }
    try {
      setLoading(true);
      // Reset student status to 'ausstehend' to re-enable onboarding edit link, without deleting previous preferences
      const { error: studentErr } = await supabase.from('students').update({ status: 'ausstehend' }).eq('id', studentId);
      if (studentErr) console.error("Error updating student status during reset:", studentErr);

      await showAlert("Onboarding zur Überarbeitung freigegeben.");
      loadInitialData();
    } catch (err) {
      console.error("Error enabling student onboarding edit:", err);
      await showAlert("Fehler beim Freigeben.");
    } finally {
      setLoading(false);
    }
  };

  const calculateLiveBoardGaps = (boardsList: DayBoard[]) => {
    let totalGapsMin = 0;
    let gapCount = 0;
    let totalAssigned = 0;
    let wunschHits = 0;
    let studentsWithWunsch = 0;

    boardsList.forEach(b => {
      const assignedStudents = b.students
        .filter(s => s.assignedTime)
        .sort((a, b) => {
          const [ah, am] = parseTime(a.assignedTime);
          const [bh, bm] = parseTime(b.assignedTime);
          return (ah * 60 + am) - (bh * 60 + bm);
        });

      let prevEndMin = -1;
      assignedStudents.forEach(s => {
        const [sh, sm] = parseTime(s.assignedTime);
        const sStart = sh * 60 + sm;
        const sEnd = sStart + s.duration;

        if (s.isBreak) {
          prevEndMin = sEnd;
          return;
        }

        totalAssigned++;

        if (prevEndMin !== -1 && sStart > prevEndMin) {
          const gapSize = sStart - prevEndMin;
          totalGapsMin += gapSize;
          gapCount++;
        }
        prevEndMin = sEnd;

        // Check Wunsch hit matching card UI logic (exact complete containment in Wunschzeit window)
        const gMemberIds = s.isGroup && s.groupStudents ? s.groupStudents.map(gs => gs.id) : [];
        if (s.isGroup && gMemberIds.length > 1) {
          const allHavePrefs = gMemberIds.every(mId => (allStudentPrefsMap[mId] || []).some(p => p.preference_type === 'wunsch'));
          if (allHavePrefs) {
            studentsWithWunsch++;
            let matchedCount = 0;
            gMemberIds.forEach(mId => {
              const mPrefs = (allStudentPrefsMap[mId] || []).filter(p => p.preference_type === 'wunsch' && parseDayNumber(p.day_of_week) === parseDayNumber(b.dayOfWeek));
              const matches = mPrefs.some(pref => {
                const { startMin: prefStart, endMin: prefEnd } = getPrefStartEndMinutes(pref);
                return sStart >= prefStart && sEnd <= prefEnd;
              });
              if (matches) matchedCount++;
            });
            if (matchedCount === gMemberIds.length && matchedCount > 0) {
              wunschHits++;
            }
          }
        } else {
          const studPrefs = allStudentPrefsMap[s.id] || [];
          const hasWunschPref = studPrefs.some(p => p.preference_type === 'wunsch');
          if (hasWunschPref) {
            studentsWithWunsch++;
            const wunschPrefs = studPrefs.filter(p => p.preference_type === 'wunsch' && parseDayNumber(p.day_of_week) === parseDayNumber(b.dayOfWeek));
            for (const pref of wunschPrefs) {
              const { startMin: prefStart, endMin: prefEnd } = getPrefStartEndMinutes(pref);
              if (sStart >= prefStart && sEnd <= prefEnd) {
                wunschHits++;
                break;
              }
            }
          }
        }
      });
    });

    return { totalGapsMin, gapCount, totalAssigned, wunschHits, studentsWithWunsch };
  };

  const persistScheduleToSupabase = async (boardsToSave: DayBoard[], showToastNotification = false) => {
    if (!selectedTeacherId) return;
    try {
      let effectiveSchoolId = schoolId;
      if (!effectiveSchoolId || effectiveSchoolId.trim() === '') {
        effectiveSchoolId = localStorage.getItem('groovelab_school_id') || '';
      }
      if (!effectiveSchoolId) {
        const { data: tUser } = await supabase.from('users').select('school_id').eq('id', selectedTeacherId).single();
        if (tUser && tUser.school_id) {
          effectiveSchoolId = tUser.school_id;
        }
      }

      const validBoards = boardsToSave.filter(b => b.students.length > 0);

      const activePlatform = localStorage.getItem('groovelab_active_platform') || 'groovelab';
      const columnName = activePlatform === 'campus' ? 'campus_räume' : 'groovelab_räume';

      const boardDefinitions = validBoards.map(b => ({
        id: b.id,
        dayOfWeek: b.dayOfWeek,
        startAnchor: b.startAnchor,
        roomId: b.roomId,
        students: b.students.map(s => ({
          id: s.id,
          first_name: s.first_name,
          last_name: s.last_name,
          instrument: s.instrument,
          duration: s.duration,
          assignedDay: s.assignedDay,
          assignedTime: s.assignedTime,
          isBreak: s.isBreak,
          customStartTime: s.customStartTime,
          isGroup: s.isGroup,
          groupStudents: s.groupStudents
        }))
      }));

      const currentDraftsList = draftsRef.current.length > 0 ? draftsRef.current : drafts;
      const currentActiveId = activeDraftIdRef.current || activeDraftId;

      let draftFound = false;
      const updatedDrafts = currentDraftsList.map(d => {
        if (d.id === currentActiveId) {
          draftFound = true;
          return { ...d, boards: boardDefinitions };
        }
        return d;
      });

      if (!draftFound && currentActiveId) {
        updatedDrafts.push({
          id: currentActiveId,
          name: `Entwurf ${updatedDrafts.length + 1}`,
          boards: boardDefinitions
        });
      }

      draftsRef.current = updatedDrafts;
      setDrafts(updatedDrafts);

      // ZERO-DATA-LOSS HARDENING: Extract all student IDs belonging to this teacher
      const allPoolStudents = masterStudentsRef.current.length > 0 ? masterStudentsRef.current : students;
      const currentTeacherObj = teachers.find(t => t.id === selectedTeacherId);
      const activeTeacherInstrument = currentTeacherObj?.instrument;

      const allTeacherStudentIds = Array.from(new Set(
        allPoolStudents
          .flatMap(s => s.isGroup && s.groupStudents ? s.groupStudents.map(gs => gs.id) : [s.id])
          .filter(id => id && !id.startsWith('group-') && !id.startsWith('break-'))
      ));

      // FACH-INTEGRITÄT (1% Goldstandard): Nur fachkompatible Schüler auf teacher_id schreiben
      const compatibleTeacherStudentIds = allTeacherStudentIds.filter(id => {
        const studentObj = allPoolStudents.find(s => s.id === id || (s.groupStudents && s.groupStudents.some(gs => gs.id === id)));
        return isTeacherInstrumentCompatible(activeTeacherInstrument, studentObj?.instrument);
      });

      // Harden student ownership in Supabase: ensure teacher_id is set in users and students
      if (compatibleTeacherStudentIds.length > 0 && selectedTeacherId) {
        try {
          await Promise.all([
            supabase
              .from('users')
              .update({ teacher_id: selectedTeacherId })
              .in('id', compatibleTeacherStudentIds)
              .eq('school_id', effectiveSchoolId),
            supabase
              .from('students')
              .update({ teacher_id: selectedTeacherId })
              .in('id', compatibleTeacherStudentIds)
              .eq('school_id', effectiveSchoolId)
          ]);
        } catch (ownershipErr) {
          console.warn('[ScheduleBoard] Non-blocking ownership hardening note:', ownershipErr);
        }
      }

      const unassignedStudentIds = students
        .filter(s => !s.isBreak && !s.assignedDay)
        .flatMap(s => s.isGroup && s.groupStudents ? s.groupStudents.map(gs => gs.id) : [s.id])
        .filter(id => id && !id.startsWith('group-') && !id.startsWith('break-'));

      const draftStateToSave = {
        activeDraftId: currentActiveId,
        submittedDraftId: submittedDraftId || '',
        submittedAt: submittedDraftId ? (submittedAtIsoRef.current || submittedAtIso || (lastSubmittedTime ? new Date().toISOString() : '')) : null,
        drafts: updatedDrafts,
        allTeacherStudentIds,
        unassignedStudentIds
      };

      lastSavedStateRef.current = JSON.stringify(draftStateToSave);

      // 1. Immediate local storage persistence
      localStorage.setItem(`groovelab_teacher_draft_state_${activePlatform}_${selectedTeacherId}`, JSON.stringify(draftStateToSave));

      // 2. View persistence (users)
      try {
        await supabase
          .from('users')
          .update({
            planned_boards: draftStateToSave,
            campus_räume: draftStateToSave,
            groovelab_räume: draftStateToSave
          })
          .eq('id', selectedTeacherId);
      } catch (viewErr) {
        console.warn('[ScheduleBoard] users view persistence note:', viewErr);
      }

      // 3. Live Synchronisation for Approved Schedules (Closed-Loop Lifecycle):
      // When modifying an approved schedule, sync changes revisionssicher, update room bookings, and notify students
      if (scheduleStatus === 'approved') {
        try {
          const cleanTeacherId = selectedTeacherId ? selectedTeacherId.replace(/^teacher-/i, '') : '';
          const today = new Date();
          const todayStr = today.toISOString().split('T')[0];

          for (const b of boardsToSave) {
            const cleanRoomId = isUUID(b.roomId) ? b.roomId : null;
            const dayName = DAYS_OF_WEEK.find(d => d.value === b.dayOfWeek)?.name || 'Unterrichtstag';

            for (const s of b.students) {
              if (s.isBreak || !s.assignedTime) continue;
              const studentIds = (s.isGroup && s.groupStudents) ? s.groupStudents.map((gs: any) => gs.id) : [s.id];

              for (const stId of studentIds) {
                if (!isUUID(stId)) continue;

                // 1. Update / Upsert schedules table
                await supabase.from('schedules').upsert({
                  school_id: effectiveSchoolId,
                  teacher_id: cleanTeacherId,
                  student_id: stId,
                  day_of_week: b.dayOfWeek,
                  time_slot: s.assignedTime,
                  room_id: cleanRoomId,
                  duration: s.duration || 30,
                  status: 'approved'
                }, { onConflict: 'school_id,teacher_id,student_id' });

                // 2. Update future occurrences for this student with this teacher via authoritative reschedule RPC
                const { data: upcomingOccs } = await supabase
                  .from('schedule_occurrences')
                  .select('id, date, start_time')
                  .eq('student_id', stId)
                  .eq('teacher_id', cleanTeacherId)
                  .gte('date', todayStr)
                  .order('date', { ascending: true })
                  .limit(1);

                if (upcomingOccs && upcomingOccs.length > 0) {
                  const occ = upcomingOccs[0];
                  await supabase.rpc('reschedule_lesson_authoritative', {
                    p_occurrence_id: occ.id,
                    p_student_id: stId,
                    p_teacher_id: cleanTeacherId,
                    p_date: occ.date,
                    p_start_time: s.assignedTime.length === 5 ? `${s.assignedTime}:00` : s.assignedTime,
                    p_original_date: occ.date,
                    p_original_start_time: occ.start_time,
                    p_duration: s.duration || 30,
                    p_template_room_id: cleanRoomId,
                    p_notes: `Termin auf Stundenplan-Board verschoben auf ${dayName} ${s.assignedTime} Uhr`
                  });
                }
              }
            }
          }
          window.dispatchEvent(new CustomEvent('refresh-bookings'));
        } catch (liveSyncErr) {
          console.warn('[ScheduleBoardDesktop] Approved live schedule sync note:', liveSyncErr);
        }
      }

      // HERMETIC SANDBOX INVARIANT:
      // An unsubmitted draft (e.g. Entwurf 4) must NEVER mutate `schedules` or `schedule_occurrences`!
      // Production database tables remain 100% untouched until formal secretariat approval.

      if (showToastNotification) {
        setToast({ message: scheduleStatus === 'approved' ? 'Änderung revisionssicher live synchronisiert!' : 'Entwurf erfolgreich gesichert!', type: 'success' });
      }
    } catch (err) {
      console.error('Error auto-saving schedule draft:', err);
    }
  };

  const triggerDebouncedAutoSave = (updatedBoards: DayBoard[]) => {
    if (autoSaveDebounceTimerRef.current) {
      clearTimeout(autoSaveDebounceTimerRef.current);
    }
    autoSaveDebounceTimerRef.current = setTimeout(() => {
      persistScheduleToSupabase(updatedBoards, false);
    }, 500);
  };

  const handleAutoAssign = async () => {
    const unassignedStudents = students.filter(s => !s.isBreak);
    if (unassignedStudents.length === 0) {
      setToast({ message: "Keine Schüler zum Einteilen vorhanden!", type: 'warning' });
      return;
    }

    if (boards.length === 0) {
      setToast({ message: "Bitte lege zuerst mindestens einen Unterrichtstag (Board) an.", type: 'warning' });
      return;
    }

    try {
      setIsSolverRunning(true);
      setSolverProgress(5);
      setSolverStageText('Stufe 1-3: O(1) Pre-Computation & Sperrzeit-Shield...');
      pushUndoSnapshot();

      const { run15StageSolver } = await import('../engine/Schedule15StageSolverEngine');
      const solverResult = await run15StageSolver({
        unassignedStudents,
        boards,
        supabase,
        blockedSlots,
        otherTeachersSchedules,
        teacherAvailability,
        recalculateBoardTimesFn: recalculateBoardTimes,
        onProgress: (pct, stageText) => {
          setSolverProgress(pct);
          setSolverStageText(stageText);
        }
      });

      const { planWunschzeit, planLueckenlos, bestBoardsState, newlyAssignedMap } = solverResult;

      const computePlanMetrics = (plan: any) => {
        const totalAssigned = Object.keys(plan.newlyAssignedMap || {}).length;
        const totalStudentsCount = unassignedStudents.length;
        const studentsWithWunsch = plan.studentsWithWunsch || 1;
        const wunschHits = plan.wunschHits || 0;
        const missedWunschCount = Math.max(0, studentsWithWunsch - wunschHits);
        const gapCount = plan.gapCount || 0;
        const unassignedCount = Math.max(0, totalStudentsCount - totalAssigned);

        // Strict Senior Developer Scoring Matrix (100 Points Base)
        // - Unassigned Student: -15 Pts per student
        // - Missed Wunschzeit: -7.5 Pts per missed preference
        // - Gap (15 Min): -6 Pts per gap slot
        let overallScore = 100;
        overallScore -= unassignedCount * 15;
        overallScore -= missedWunschCount * 7.5;
        overallScore -= gapCount * 6;

        // Strict Quality Threshold Caps:
        // Exzellent (95-100) is reserved ONLY for 100% Wunschzeiten and max 1 gap!
        if (missedWunschCount >= 2 || gapCount >= 2) {
          overallScore = Math.min(84, overallScore); // Max "Gut" (Yellow)
        }
        if (missedWunschCount >= 4 || gapCount >= 4 || unassignedCount >= 1) {
          overallScore = Math.min(74, overallScore); // Max "Befriedigend"
        }

        overallScore = Math.max(10, Math.min(100, Math.round(overallScore)));

        return {
          ...plan,
          totalAssigned,
          totalStudents: totalStudentsCount,
          overallScore
        };
      };

      const planWunschzeitData = computePlanMetrics(planWunschzeit || solverResult);
      const planLueckenlosData = computePlanMetrics(planLueckenlos || solverResult);

      const activePlan = planWunschzeitData;

      // Update state with default Plan A (Max Wunschzeiten)
      setBoards(activePlan.boardsState || bestBoardsState);
      persistScheduleToSupabase(activePlan.boardsState || bestBoardsState, true);
      setStudents(currentStudents => currentStudents.map(s => {
        if (s.isBreak) return s;
        if (activePlan.newlyAssignedMap && activePlan.newlyAssignedMap[s.id]) {
          return {
            ...s,
            assignedDay: activePlan.newlyAssignedMap[s.id].day,
            assignedTime: activePlan.newlyAssignedMap[s.id].time
          };
        }
        return {
          ...s,
          assignedDay: undefined,
          assignedTime: undefined
        };
      }));

      setAutoScheduleReportData({
        activePlanTab: 'wunschzeit',
        planWunschzeit: planWunschzeitData,
        planLueckenlos: planLueckenlosData,
        ...activePlan
      });
      setShowAutoScheduleReportModal(true);

      const failedIds = unassignedStudents
        .filter(s => !(activePlan.newlyAssignedMap && activePlan.newlyAssignedMap[s.id]))
        .map(s => s.id);
      setFailedStudentIds(failedIds);

      const assignedCount = Object.keys(activePlan.newlyAssignedMap || {}).length;
      const unassignedCount = unassignedStudents.length - assignedCount;

      if (assignedCount > 0) {
        if (unassignedCount > 0) {
          const failedNames = unassignedStudents
            .filter(s => failedIds.includes(s.id))
            .map(s => `${s.first_name} ${maskLastName(s.last_name, showRealNames)}`)
            .slice(0, 3)
            .join(', ');
          setToast({
            message: `${assignedCount} Schüler zugeteilt. ${unassignedCount} Schüler (${failedNames}) konnte wegen Kapazitäts- oder Sperrzeit-Kollision nicht eingeteilt werden.`,
            type: 'warning'
          });
        } else {
          setToast({
            message: `${assignedCount} Schüler wurden erfolgreich durch den geschützten 15-Stufen-Solver zugeteilt!`,
            type: 'success'
          });
        }
      } else {
        setToast({
          message: "Keine Zuteilung möglich. Bitte überprüfe die Wunsch- und Sperrzeiten.",
          type: 'warning'
        });
      }
    } catch (err: any) {
      console.error("Error during auto assign:", err);
      setToast({
        message: "Fehler bei der automatischen Zuteilung: " + (err.message || err),
        type: 'warning'
      });
    } finally {
      setSolverProgress(100);
      setSolverStageText('Zuteilung perfekt abgeschlossen!');
      await new Promise(r => setTimeout(r, 600));
      setIsSolverRunning(false);
    }
  };

  const handleResetAllAssignments = async () => {
    if (!await showConfirm("Möchtest du wirklich alle zugeteilten Schüler dieses Entwurfs zurücksetzen? Alle Schüler werden wieder in den Schüler-Pool (Offen) gelegt.")) {
      return;
    }
    setBoards(currentBoards => currentBoards.map(b => {
      const nextStudents = b.students.filter(s => s.isBreak); // Keep only breaks
      return recalculateBoardTimes({ ...b, students: nextStudents });
    }));

    setStudents(currentStudents => currentStudents.map(s => ({
      ...s,
      assignedDay: undefined,
      assignedTime: undefined
    })));

    setToast({
      message: "Alle Zuteilungen wurden erfolgreich zurückgesetzt.",
      type: 'success'
    });
  };

  const handleGenerateMockPreferences = async () => {
    try {
      setLoading(true);
      const teacherStudentIds = students.map(s => s.id);
      if (teacherStudentIds.length === 0) {
        setToast({
          message: "Keine Schüler vorhanden, für die Präferenzen generiert werden können.",
          type: 'warning'
        });
        return;
      }

      await supabase
        .from('student_schedule_preferences')
        .delete()
        .in('student_id', teacherStudentIds);

      const newPrefs: any[] = [];
      const days = [1, 2, 3, 4, 5];
      const times = [
        { start: '14:00', end: '16:00' },
        { start: '15:00', end: '17:00' },
        { start: '16:00', end: '18:00' },
        { start: '17:00', end: '19:00' }
      ];

      teacherStudentIds.forEach((studentId, idx) => {
        const wunschDay = days[idx % days.length];
        const wunschTime = times[idx % times.length];
        
        const gesperrtDay = days[(idx + 2) % days.length];
        const gesperrtTime = times[(idx + 1) % times.length];

        newPrefs.push({
          student_id: studentId,
          day_of_week: wunschDay,
          start_time: wunschTime.start,
          end_time: wunschTime.end,
          preference_type: 'wunsch'
        });

        newPrefs.push({
          student_id: studentId,
          day_of_week: gesperrtDay,
          start_time: gesperrtTime.start,
          end_time: gesperrtTime.end,
          preference_type: 'gesperrt'
        });
      });

      const { error } = await supabase
        .from('student_schedule_preferences')
        .insert(newPrefs);

      if (error) throw error;

      if (selectedStudentId) {
        const { data } = await supabase
          .from('student_schedule_preferences')
          .select('*')
          .eq('student_id', selectedStudentId);
        setSelectedStudentPrefs(data || []);
      }

      setToast({
        message: "Erfundene Wunsch- und Sperrzeiten wurden erfolgreich generiert!",
        type: 'success'
      });

    } catch (err: any) {
      console.error("Error generating mock preferences:", err);
      setToast({
        message: "Fehler beim Generieren der Präferenzen: " + err.message,
        type: 'warning'
      });
    } finally {
      setLoading(false);
    }
  };

  // Drag start handler for students (100% Synchronous for 0ms Instant Drag Latency!)
  const handleDragStart = (studentId: string, source: 'sidebar' | 'board', boardId?: string, e?: React.DragEvent) => {
    // 1. FIRST LINE: DataTransfer setup for 0ms browser drag loop initialization!
    if (e && e.dataTransfer) {
      try {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', studentId);
        // 🍏 Suppress browser's ugly floating native ghost overlay (Apple Calendar style)
        const emptyImg = new Image();
        emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        e.dataTransfer.setDragImage(emptyImg, 0, 0);
      } catch (err) {
        // Fallback silently
      }
    }

    setDraggedStudentId(studentId);
    setDragSource(source);
    if (boardId) setDragSourceBoardId(boardId);
    setDragOverBoardId(null);
    setDragOverIndex(null);

    // Resolve dragged duration and name for Cubase ghost preview synchronously
    let dur = 30;
    let name = 'Termin';
    let inst = 'Instrument';
    if (studentId === 'sidebar-pause' || studentId.startsWith('break-')) {
      dur = 15;
      name = 'Pause';
      inst = 'Pause';
      if (studentId.startsWith('break-')) {
        for (const b of boards) {
          const bs = b.students.find(s => s.id === studentId);
          if (bs) {
            dur = bs.duration || 15;
            break;
          }
        }
      }
    } else {
      const foundSidebar = students.find(s => s.id === studentId);
      if (foundSidebar) {
        dur = foundSidebar.duration || 30;
        name = `${foundSidebar.first_name || ''} ${foundSidebar.last_name || ''}`.trim();
        inst = resolveInstrument(foundSidebar.instrument);
      } else {
        for (const b of boards) {
          const bs = b.students.find(s => s.id === studentId);
          if (bs) {
            dur = bs.duration || 30;
            name = `${bs.first_name || ''} ${bs.last_name || ''}`.trim();
            inst = resolveInstrument(bs.instrument);
            break;
          }
        }
      }
    }
    setDraggedDuration(dur);
    setDraggedStudentName(name);

    // Fetch preferences asynchronously in background without blocking drag initialization
    (async () => {
      try {
        let targetStudentIds = [studentId];
        let grpId: string | null = null;
      
      if (studentId.startsWith('group-')) {
        grpId = studentId.replace('group-', '');
      } else {
        const found = students.find(s => s.id === studentId);
        if (found?.group_id) {
          grpId = found.group_id;
        }
      }
      
      if (grpId) {
        const { data: grpUsers } = await supabase
          .from('users')
          .select('id')
          .eq('group_id', grpId);
        if (grpUsers && grpUsers.length > 0) {
          targetStudentIds = grpUsers.map((u: any) => u.id);
        }
      }

      const { data: prefsData, error: prefsErr } = await supabase
        .from('student_schedule_preferences')
        .select('*')
        .in('student_id', targetStudentIds);

      if (!prefsErr && prefsData) {
        const combinedPrefs: any[] = [];
        
        for (let day = 1; day <= 5; day++) {
          const slotsCount = 24 * 4; 
          const wunschCounts = Array(slotsCount).fill(0);
          const isGesperrt = Array(slotsCount).fill(false);
          
          targetStudentIds.forEach(sId => {
            const studentPrefs = prefsData.filter(p => p.student_id === sId && Number(p.day_of_week) === day);
            studentPrefs.forEach(pref => {
              const [sh, sm] = parseTime(pref.start_time);
              const [eh, em] = parseTime(pref.end_time);
              const startIdx = Math.floor((sh * 60 + sm) / 15);
              const endIdx = Math.ceil((eh * 60 + em) / 15);
              
              for (let i = startIdx; i < endIdx; i++) {
                if (i >= 0 && i < slotsCount) {
                  if (pref.preference_type === 'gesperrt') {
                    isGesperrt[i] = true;
                  } else if (pref.preference_type === 'wunsch') {
                    wunschCounts[i]++;
                  }
                }
              }
            });
          });
          
          let currentType: 'wunsch' | 'gesperrt' | null = null;
          let startIdx = -1;
          
          for (let i = 0; i < slotsCount; i++) {
            let type: 'wunsch' | 'gesperrt' | null = null;
            if (isGesperrt[i]) {
              type = 'gesperrt';
            } else if (wunschCounts[i] === targetStudentIds.length && targetStudentIds.length > 0) {
              type = 'wunsch';
            }
            
            if (type !== currentType) {
              if (currentType && startIdx !== -1) {
                const startTime = `${String(Math.floor((startIdx * 15) / 60)).padStart(2, '0')}:${String((startIdx * 15) % 60).padStart(2, '0')}:00`;
                const endTime = `${String(Math.floor((i * 15) / 60)).padStart(2, '0')}:${String((i * 15) % 60).padStart(2, '0')}:00`;
                combinedPrefs.push({
                  day_of_week: day,
                  start_time: startTime,
                  end_time: endTime,
                  preference_type: currentType
                });
              }
              currentType = type;
              startIdx = type ? i : -1;
            }
          }
          if (currentType && startIdx !== -1) {
            const startTime = `${String(Math.floor((startIdx * 15) / 60)).padStart(2, '0')}:${String((startIdx * 15) % 60).padStart(2, '0')}:00`;
            const endTime = '24:00:00';
            combinedPrefs.push({
              day_of_week: day,
              start_time: startTime,
              end_time: endTime,
              preference_type: currentType
            });
          }
        }
        
        setSelectedStudentPrefs(combinedPrefs);
      }
    } catch (err) {
      console.error("Error loading preferences on drag start:", err);
    }
  })();
};

  const autoScrollIntervalRef = useRef<any>(null);
  const autoScrollSpeedRef = useRef<number>(0);
  const autoScrollContainerRef = useRef<HTMLElement | null>(null);

  const startAutoScroll = (container: HTMLElement, speed: number) => {
    autoScrollContainerRef.current = container;
    autoScrollSpeedRef.current = speed;
    if (!autoScrollIntervalRef.current) {
      autoScrollIntervalRef.current = setInterval(() => {
        if (autoScrollContainerRef.current) {
          const c = autoScrollContainerRef.current;
          const currentSpeed = autoScrollSpeedRef.current;
          if (currentSpeed < 0) {
            c.scrollTop = Math.max(0, c.scrollTop + currentSpeed);
          } else if (currentSpeed > 0) {
            c.scrollTop = Math.min(c.scrollHeight - c.clientHeight, c.scrollTop + currentSpeed);
          }
        }
      }, 16);
    }
  };

  const stopAutoScroll = () => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
    autoScrollSpeedRef.current = 0;
  };

  const handleAutoScrollCheck = (clientY: number) => {
    if (!clientY) return;

    const scrollContainer = (document.querySelector('.overflow-y-auto') || document.querySelector('.schedule-designer-board-container')) as HTMLElement;
    if (scrollContainer) {
      const scrollRect = scrollContainer.getBoundingClientRect();
      const relativeY = clientY - scrollRect.top;
      const scrollThreshold = 90;
      const maxScrollSpeed = 25;

      if (relativeY < scrollThreshold) {
        const speed = -Math.round((scrollThreshold - relativeY) / scrollThreshold * maxScrollSpeed);
        startAutoScroll(scrollContainer, speed);
      } else if (relativeY > scrollRect.height - scrollThreshold) {
        const speed = Math.round((relativeY - (scrollRect.height - scrollThreshold)) / scrollThreshold * maxScrollSpeed);
        startAutoScroll(scrollContainer, speed);
      } else {
        stopAutoScroll();
      }
    }
  };

  const handleDragEnd = () => {
    cleanupDragGhost();
    stopAutoScroll();
    setDraggedStudentId(null);
    setDragSource(null);
    setDragSourceBoardId(null);
    setDragOverBoardId(null);
    setDragOverIndex(null);
    setDragSnapState(null);
    setDragTargetIntent(null);
    setDragTargetStudentId(null);
    if (!selectedStudentId) {
      setSelectedStudentPrefs([]);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (draggedStudentId) handleDragEnd();
        if (quickActionStudentId) setQuickActionStudentId(null);
        if (swapPartnerPendingId) setSwapPartnerPendingId(null);
        if (resizingBreakRef.current) {
          const bState = resizingBreakRef.current;
          setBoards(prev => prev.map(b => {
            if (b.id !== bState.boardId) return b;
            const nextStudents = b.students.map(s => s.id === bState.breakId ? { ...s, duration: bState.initialDuration } : s);
            return recalculateBoardTimes({ ...b, students: nextStudents });
          }));
          setResizingBreak(null);
        }
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (quickActionStudentId) {
        setQuickActionStudentId(null);
      }
    };
    const handlePointerUpOrCancel = () => {
      if (resizingBreakRef.current) {
        setResizingBreak(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('pointerup', handlePointerUpOrCancel);
    window.addEventListener('pointercancel', handlePointerUpOrCancel);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('pointerup', handlePointerUpOrCancel);
      window.removeEventListener('pointercancel', handlePointerUpOrCancel);
    };
  }, [draggedStudentId, quickActionStudentId, swapPartnerPendingId, resizingBreak]);

  // Drag over handler to allow dropping
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    handleAutoScrollCheck(e.clientY);
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const mergeStudentsViaDragAndDrop = (sourceId: string, targetId: string, targetBoardId: string) => {
    // Find source student
    let sourceStudent: Student | null = null;
    let sourceBoardId: string | null = null;
    
    // Check if source student is in designer boards
    for (const b of boards) {
      const found = b.students.find(s => s.id === sourceId);
      if (found) {
        sourceStudent = found;
        sourceBoardId = b.id;
        break;
      }
    }
    
    // Check in sidebar if not in boards
    if (!sourceStudent) {
      const found = students.find(s => s.id === sourceId);
      if (found) sourceStudent = found;
    }
    
    if (!sourceStudent) return;
    
    // Find target board and target student
    const targetBoard = boards.find(b => b.id === targetBoardId);
    if (!targetBoard) return;
    const targetStudent = targetBoard.students.find(s => s.id === targetId);
    if (!targetStudent || targetStudent.isBreak) return;
    
    setBoards(prev => {
      // 1. Remove source student from its source board if it was on a board
      let nextSourceBoardStudents: Student[] = [];
      if (sourceBoardId) {
        const sBoard = prev.find(b => b.id === sourceBoardId)!;
        nextSourceBoardStudents = sBoard.students.filter(s => s.id !== sourceId);
      }
      
      // 2. Build the merged student list/group on target board
      const targetBoardInstance = prev.find(b => b.id === targetBoardId)!;
      let nextTargetBoardStudents = [...targetBoardInstance.students];
      
      // If source and target are on the same board, make sure we remove source first to prevent duplication
      if (sourceBoardId === targetBoardId) {
        nextTargetBoardStudents = nextTargetBoardStudents.filter(s => s.id !== sourceId);
      }
      
      const idx = nextTargetBoardStudents.findIndex(s => s.id === targetId);
      if (idx === -1) return prev;
      
      // Merge logic:
      const flatStudents = (studentObj: Student): Student[] => {
        if (studentObj.isGroup && studentObj.groupStudents) {
          return studentObj.groupStudents;
        }
        return [studentObj];
      };
      
      const groupStudentsList = [...flatStudents(targetStudent), ...flatStudents(sourceStudent)];
      
      const mergedBlock: Student = {
        id: targetStudent.isGroup ? targetStudent.id : `group-${crypto.randomUUID()}`,
        first_name: groupStudentsList[0].first_name,
        last_name: groupStudentsList[0].last_name,
        instrument: groupStudentsList.map(s => s.instrument || 'Musiker').filter((v, i, a) => a.indexOf(v) === i).join(', '),
        duration: targetStudent.duration || 30,
        isGroup: true,
        groupStudents: groupStudentsList.map(s => ({
          id: s.id,
          first_name: s.first_name,
          last_name: s.last_name,
          instrument: s.instrument,
          duration: s.duration,
          assignedDay: targetBoard.dayOfWeek,
          assignedTime: targetStudent.assignedTime || s.assignedTime
        })),
        assignedDay: targetBoard.dayOfWeek,
        assignedTime: targetStudent.assignedTime
      };
      
      nextTargetBoardStudents.splice(idx, 1, mergedBlock);
      
      return prev.map(b => {
        if (b.id === sourceBoardId && b.id === targetBoardId) {
          return recalculateBoardTimes({ ...b, students: nextTargetBoardStudents });
        }
        if (b.id === sourceBoardId) {
          return recalculateBoardTimes({ ...b, students: nextSourceBoardStudents });
        }
        if (b.id === targetBoardId) {
          return recalculateBoardTimes({ ...b, students: nextTargetBoardStudents });
        }
        return b;
      });
    });
    
    setToast({ message: 'Termine per Drag & Drop zusammengeführt!', type: 'success' });
  };

  // 🍏 Apple Quick Action Helpers (No-Drag Klick-Alternative)
  const handleQuickAdjustStudentTime = (boardId: string, studentId: string, deltaMinutes: number) => {
    pushUndoSnapshot();
    setBoards(prev => prev.map(b => {
      if (b.id !== boardId) return b;
      const card = b.students.find(s => s.id === studentId);
      if (!card) return b;
      const [curH, curM] = parseTime(card.customStartTime || card.assignedTime || b.startAnchor);
      const curTotal = curH * 60 + curM;
      const newTotal = Math.max(8 * 60, Math.min(22 * 60, curTotal + deltaMinutes));
      const newTime = `${String(Math.floor(newTotal / 60) % 24).padStart(2, '0')}:${String(newTotal % 60).padStart(2, '0')}`;
      
      const nextStudents = b.students.map(s => s.id === studentId ? { ...s, customStartTime: newTime } : s);
      return recalculateBoardTimes({ ...b, students: nextStudents }, studentId);
    }));
    setToast({
      message: deltaMinutes > 0 ? `Termin um +${deltaMinutes} Min verschoben` : `Termin um ${deltaMinutes} Min vorverlegt`,
      type: 'success'
    });
  };

  const handleQuickInsertBreakBefore = (boardId: string, studentId: string) => {
    pushUndoSnapshot();
    setBoards(prev => prev.map(b => {
      if (b.id !== boardId) return b;
      const idx = b.students.findIndex(s => s.id === studentId);
      if (idx === -1) return b;
      const refStudent = b.students[idx];
      const newBreak: Student = {
        id: `break-${crypto.randomUUID()}`,
        first_name: 'Pause',
        last_name: '',
        instrument: '',
        duration: 15,
        isBreak: true,
        assignedDay: b.dayOfWeek,
        assignedTime: refStudent.assignedTime
      };
      const nextStudents = [...b.students];
      nextStudents.splice(idx, 0, newBreak);
      return recalculateBoardTimes({ ...b, students: nextStudents });
    }));
    setToast({ message: '15 Min. Pause eingefügt!', type: 'success' });
    setQuickActionStudentId(null);
  };

  const handleStartInteractiveSwap = (studentId: string, _boardId: string) => {
    setSwapPartnerPendingId(studentId);
    setQuickActionStudentId(null);
    const st = students.find(s => s.id === studentId) || boards.flatMap(b => b.students).find(s => s.id === studentId);
    const studentName = st?.first_name || 'Schüler';
    setToast({ message: `Tauschmodus aktiv: Wähle den Tauschpartner für ${studentName}. (Abbrechen mit Esc)`, type: 'info' });
  };

  const handleExecuteInteractiveSwap = async (targetStudentId: string, targetBoardId: string) => {
    if (!swapPartnerPendingId) return;

    if (swapPartnerPendingId === targetStudentId) {
      setSwapPartnerPendingId(null);
      setToast({ message: 'Tauschmodus beendet.', type: 'info' });
      return;
    }

    const sourceId = swapPartnerPendingId;
    let sourceBoard: DayBoard | undefined = undefined;
    for (const b of boards) {
      if (b.students.some(s => s.id === sourceId)) {
        sourceBoard = b;
        break;
      }
    }

    const targetBoard = boards.find(b => b.id === targetBoardId);
    if (!sourceBoard || !targetBoard) {
      setSwapPartnerPendingId(null);
      return;
    }

    const sourceCard = sourceBoard.students.find(s => s.id === sourceId);
    const targetCard = targetBoard.students.find(s => s.id === targetStudentId);

    if (!sourceCard || !targetCard) {
      setSwapPartnerPendingId(null);
      return;
    }

    if (targetCard.isBreak || sourceCard.isBreak) {
      setToast({ message: 'Pausen können nicht mit Schülern getauscht werden.', type: 'warning' });
      return;
    }

    // Capture Undo Snapshot
    pushUndoSnapshot();

    // Check student blocked preferences (Sperrzeiten) for sovereign warning
    try {
      const { data: sourcePrefs } = await supabase
        .from('student_schedule_preferences')
        .select('*')
        .eq('student_id', sourceId)
        .eq('preference_type', 'gesperrt');

      const { data: targetPrefs } = await supabase
        .from('student_schedule_preferences')
        .select('*')
        .eq('student_id', targetStudentId)
        .eq('preference_type', 'gesperrt');

      let hasSperrzeitConflict = false;

      // Check if source student is blocked on target day/time
      if (sourcePrefs && sourcePrefs.length > 0) {
        const tgtTimeStr = targetCard.customStartTime || targetCard.assignedTime || targetBoard.startAnchor || '14:00';
        const [tsh, tsm] = parseTime(tgtTimeStr);
        const tStart = tsh * 60 + tsm;
        const tEnd = tStart + (sourceCard.duration || 30);
        for (const pref of sourcePrefs) {
          if (Number(pref.day_of_week) === Number(targetBoard.dayOfWeek)) {
            const [psh, psm] = parseTime(pref.start_time);
            const [peh, pem] = parseTime(pref.end_time);
            if (tStart < (peh * 60 + pem) && tEnd > (psh * 60 + psm)) {
              hasSperrzeitConflict = true;
              break;
            }
          }
        }
      }

      // Check if target student is blocked on source day/time
      if (!hasSperrzeitConflict && targetPrefs && targetPrefs.length > 0) {
        const srcTimeStr = sourceCard.customStartTime || sourceCard.assignedTime || sourceBoard.startAnchor || '14:00';
        const [ssh, ssm] = parseTime(srcTimeStr);
        const sStart = ssh * 60 + ssm;
        const sEnd = sStart + (targetCard.duration || 30);
        for (const pref of targetPrefs) {
          if (Number(pref.day_of_week) === Number(sourceBoard.dayOfWeek)) {
            const [psh, psm] = parseTime(pref.start_time);
            const [peh, pem] = parseTime(pref.end_time);
            if (sStart < (peh * 60 + pem) && sEnd > (psh * 60 + psm)) {
              hasSperrzeitConflict = true;
              break;
            }
          }
        }
      }

      if (hasSperrzeitConflict) {
        setToast({
          message: 'Sperrzeit-Hinweis: Mindestens ein Schüler hat im neuen Zeitraum eine Sperrzeit (rot markiert).',
          type: 'warning'
        });
      } else {
        setToast({
          message: `Termine zwischen ${sourceCard.first_name || 'Schüler'} und ${targetCard.first_name || 'Schüler'} getauscht!`,
          type: 'success'
        });
      }
    } catch {
      setToast({
        message: `Termine zwischen ${sourceCard.first_name || 'Schüler'} und ${targetCard.first_name || 'Schüler'} getauscht!`,
        type: 'success'
      });
    }

    // Execute atomic swap in boards state
    setBoards(prev => {
      const currentSourceBoard = prev.find(b => b.id === sourceBoard!.id);
      const currentTargetBoard = prev.find(b => b.id === targetBoard.id);
      if (!currentSourceBoard || !currentTargetBoard) return prev;

      let finalBoards: DayBoard[];

      if (currentSourceBoard.id === currentTargetBoard.id) {
        // SAME BOARD SWAP
        const nextStudents = [...currentSourceBoard.students];
        const srcIdx = nextStudents.findIndex(s => s.id === sourceId);
        const tgtIdx = nextStudents.findIndex(s => s.id === targetStudentId);
        if (srcIdx === -1 || tgtIdx === -1) return prev;

        const sCard = nextStudents[srcIdx];
        const tCard = nextStudents[tgtIdx];
        const sTime = sCard.customStartTime || sCard.assignedTime;
        const tTime = tCard.customStartTime || tCard.assignedTime;

        nextStudents[srcIdx] = { ...tCard, customStartTime: sTime, isPinned: false };
        nextStudents[tgtIdx] = { ...sCard, customStartTime: tTime, isPinned: false };

        const updatedBoard = recalculateBoardTimes({ ...currentSourceBoard, students: nextStudents }, sCard.id);

        setStudents(curr => curr.map(s => {
          if (s.id === sourceId) {
            return {
              ...s,
              assignedDay: updatedBoard.dayOfWeek,
              assignedTime: updatedBoard.students.find(bs => bs.id === sourceId)?.assignedTime
            };
          }
          if (s.id === targetStudentId) {
            return {
              ...s,
              assignedDay: updatedBoard.dayOfWeek,
              assignedTime: updatedBoard.students.find(bs => bs.id === targetStudentId)?.assignedTime
            };
          }
          return s;
        }));

        finalBoards = prev.map(b => b.id === currentSourceBoard.id ? updatedBoard : b);
      } else {
        // CROSS BOARD SWAP
        const sourceNextStudents = [...currentSourceBoard.students];
        const targetNextStudents = [...currentTargetBoard.students];

        const srcIdx = sourceNextStudents.findIndex(s => s.id === sourceId);
        const tgtIdx = targetNextStudents.findIndex(s => s.id === targetStudentId);
        if (srcIdx === -1 || tgtIdx === -1) return prev;

        const sCard = sourceNextStudents[srcIdx];
        const tCard = targetNextStudents[tgtIdx];
        const sTime = sCard.customStartTime || sCard.assignedTime;
        const tTime = tCard.customStartTime || tCard.assignedTime;

        sourceNextStudents[srcIdx] = { ...tCard, assignedDay: currentSourceBoard.dayOfWeek, customStartTime: sTime, isPinned: false };
        targetNextStudents[tgtIdx] = { ...sCard, assignedDay: currentTargetBoard.dayOfWeek, customStartTime: tTime, isPinned: false };

        const updatedSource = recalculateBoardTimes({ ...currentSourceBoard, students: sourceNextStudents }, tCard.id);
        const updatedTarget = recalculateBoardTimes({ ...currentTargetBoard, students: targetNextStudents }, sCard.id);

        setStudents(curr => curr.map(s => {
          if (s.id === sourceId) {
            return {
              ...s,
              assignedDay: updatedTarget.dayOfWeek,
              assignedTime: updatedTarget.students.find(bs => bs.id === sourceId)?.assignedTime
            };
          }
          if (s.id === targetStudentId) {
            return {
              ...s,
              assignedDay: updatedSource.dayOfWeek,
              assignedTime: updatedSource.students.find(bs => bs.id === targetStudentId)?.assignedTime
            };
          }
          return s;
        }));

        finalBoards = prev.map(b => {
          if (b.id === currentSourceBoard.id) return updatedSource;
          if (b.id === currentTargetBoard.id) return updatedTarget;
          return b;
        });
      }

      triggerDebouncedAutoSave(finalBoards);
      return finalBoards;
    });

    setSwapPartnerPendingId(null);
  };

  // Handle drops on columns (support both Drag & Drop and accessible 2-click selection)
  const handleDropOnBoard = async (targetBoardId: string, index?: number, droppedCustomTime?: string, isAltSwap: boolean = false) => {
    const activeId = draggedStudentId || selectedStudentId;
    if (!activeId) return;

    const isBreakDrag = activeId.startsWith('break-') || activeId === 'sidebar-pause';
    let student = students.find(s => s.id === activeId);
    if (!student && !isBreakDrag) {
      for (const b of boards) {
        const found = b.students.find(s => s.id === activeId);
        if (found) {
          student = found;
          break;
        }
      }
    }
    if (!student && !isBreakDrag) return;

    const effectiveSource = dragSource || (selectedStudentId ? 'sidebar' : null);
    const effectiveSourceBoardId = dragSourceBoardId;

    // 🍏 Apple Intent Check: If dropped in the center of a target card or Alt key held ➔ 1:1 Swap!
    const shouldSwap = isAltSwap || (dragTargetIntent === 'swap' && dragSource === 'board' && index !== undefined);

    // Execute standard drop with explicit move vs swap control
    await executeStandardDrop(activeId, targetBoardId, index, effectiveSource, effectiveSourceBoardId, undefined, droppedCustomTime, shouldSwap);
    setSelectedStudentId(null);
    setDragTargetIntent(null);
    setDragTargetStudentId(null);
  };

  const executeStandardDrop = async (sourceId: string, targetBoardId: string, index?: number, source?: string | null, sourceBoardId?: string | null, chosenInstrument?: string, droppedCustomTime?: string, isAltSwap: boolean = false) => {
    pushUndoSnapshot();
    const isBreakDrag = sourceId.startsWith('break-') || sourceId === 'sidebar-pause';
    let studentObj = students.find(s => s.id === sourceId);
    if (!studentObj && !isBreakDrag) {
      for (const b of boards) {
        const found = b.students.find(s => s.id === sourceId);
        if (found) {
          studentObj = found;
          break;
        }
      }
    }

    // Instant direct drop without popup interruptions
    const primaryInstrument = studentObj?.instrument ? studentObj.instrument.split(',')[0].trim() : 'Musiker';

    const student = studentObj ? {
      ...studentObj,
      instrument: chosenInstrument || studentObj.instrument || 'Musiker',
      customStartTime: droppedCustomTime || undefined
    } : null;

    // Validate if the timeframe overlaps with a 'gesperrt' (blocked) preference for the student
    if (!isBreakDrag && student) {
      const targetBoard = boards.find(b => b.id === targetBoardId);
      if (targetBoard) {
        // Calculate proposed start/end times by simulating the drop
        let targetNextStudents = [...targetBoard.students];
        targetNextStudents = targetNextStudents.filter(s => s.id !== sourceId);
        
        const studentToAssign = { ...student, assignedDay: targetBoard.dayOfWeek, customStartTime: undefined };
        if (index !== undefined) {
          targetNextStudents.splice(index, 0, studentToAssign);
        } else {
          targetNextStudents.push(studentToAssign);
        }

        const tempBoard = recalculateBoardTimes({ ...targetBoard, students: targetNextStudents });
        const assignedStudent = tempBoard.students.find(s => s.id === sourceId);

        if (assignedStudent && assignedStudent.assignedTime) {
          const [sh, sm] = parseTime(assignedStudent.assignedTime);
          const startMin = sh * 60 + sm;
          const endMin = startMin + student.duration;

          // Check if this overlaps with any wöchentliche Blockierung (blockedSlots) in this room
          if (targetBoard.roomId) {
            const hasBlockedConflict = blockedSlots.some((s: any) => {
              if (s.room_id !== targetBoard.roomId) return false;
              if (s.day_of_week !== targetBoard.dayOfWeek) return false;

              const [bsh, bsm] = parseTime(s.start_time ? s.start_time.substring(0, 5) : '00:00');
              const bStart = bsh * 60 + bsm;
              const [beh, bem] = parseTime(s.end_time ? s.end_time.substring(0, 5) : '23:59');
              const bEnd = beh * 60 + bem;

              return startMin < bEnd && endMin > bStart;
            });

            if (hasBlockedConflict) {
              setShakingStudentId(sourceId);
              setTimeout(() => setShakingStudentId(null), 500);

              const allowOverride = await showConfirm(
                `Achtung: Raum-Blockierung!\n\nDer gewählte Zeitraum (${formatMinutes(startMin)} - ${formatMinutes(endMin)} Uhr) ist für den Raum "${rooms.find(r => r.id === targetBoard.roomId)?.name || 'Raum'}" gesperrt.\n\nMöchtest du den Termin trotzdem dorthin verschieben?`,
                'Trotzdem verschieben',
                'Abbrechen'
              );

              if (!allowOverride) {
                setDraggedStudentId(null);
                setDragSource(null);
                setDragSourceBoardId(null);
                setDragOverBoardId(null);
                setDragOverIndex(null);
                return;
              }
            }
          }

          // Check student's own 'gesperrt' preferences from Supabase
          try {
            const { data: prefs, error } = await supabase
              .from('student_schedule_preferences')
              .select('*')
              .eq('student_id', sourceId)
              .eq('preference_type', 'gesperrt');

            if (!error && prefs && prefs.length > 0) {
              let isBlocked = false;
              for (const pref of prefs) {
                if (Number(pref.day_of_week) === Number(targetBoard.dayOfWeek)) {
                  const [psh, psm] = parseTime(pref.start_time);
                  const [peh, pem] = parseTime(pref.end_time);
                  const prefStart = psh * 60 + psm;
                  const prefEnd = peh * 60 + pem;

                  // Overlap check
                  if (startMin < prefEnd && endMin > prefStart) {
                    isBlocked = true;
                    break;
                  }
                }
              }

              if (isBlocked) {
                // Toast subtle notice without blocking the move
                setToast({
                  message: `Sperrzeit-Kollision: ${student.first_name || 'Schüler'} wurde in einer Sperrzeit platziert (rot markiert).`,
                  type: 'warning'
                });
              }
            }
          } catch (err) {
            console.error("Error checking student preferences:", err);
          }
        }
      }
    }

    const removeStudentFromBoardsList = (boardsList: DayBoard[], studentId: string): DayBoard[] => {
      const baseId = studentId ? studentId.split('-')[0] : '';
      return boardsList.map(b => {
        const nextStudents: Student[] = [];
        b.students.forEach(s => {
          if (s.isBreak) {
            if (s.id !== studentId) {
              nextStudents.push(s);
            }
            return;
          }
          if (s.id === studentId || (baseId && s.id && s.id.split('-')[0] === baseId)) {
            // Card matches exactly (individual student or group block ID)
            return;
          }
          if (s.isGroup && s.groupStudents) {
            const remaining = s.groupStudents.filter(gs => gs.id !== studentId && (!baseId || gs.id.split('-')[0] !== baseId));
            if (remaining.length > 1) {
              nextStudents.push({
                ...s,
                groupStudents: remaining
              });
            } else if (remaining.length === 1) {
              nextStudents.push(remaining[0]);
            }
          } else {
            if (s.id !== studentId && (!baseId || s.id.split('-')[0] !== baseId)) {
              nextStudents.push(s);
            }
          }
        });
        return recalculateBoardTimes({ ...b, students: nextStudents });
      });
    };

    setBoards(prev => {
      const sourceBoard = prev.find(b => b.id === sourceBoardId);
      const targetBoard = prev.find(b => b.id === targetBoardId);
      if (!targetBoard) return prev;

      // 1. If moving within boards
      if (source === 'board' && sourceBoard) {
        // If moving inside the SAME board
        if (sourceBoard.id === targetBoard.id) {
          const nextStudents = [...targetBoard.students];
          const curIndex = nextStudents.findIndex(s => s.id === sourceId);
          if (curIndex !== -1) {
            if (isAltSwap && index !== undefined && index < nextStudents.length && curIndex !== index && !nextStudents[index].isBreak) {
              // 1-to-1 Swap triggered explicitly via Alt/Option key
              const sourceCard = nextStudents[curIndex];
              const targetCard = nextStudents[index];

              const srcTime = sourceCard.customStartTime || sourceCard.assignedTime;
              const tgtTime = targetCard.customStartTime || targetCard.assignedTime;

              nextStudents[curIndex] = { ...targetCard, customStartTime: srcTime, isPinned: false };
              nextStudents[index] = { ...sourceCard, customStartTime: tgtTime, isPinned: false };
              setToast({ message: '1:1 Termintausch durchgeführt!', type: 'success' });
            } else {
              // Default Move & Smart Displacement
              const [moved] = nextStudents.splice(curIndex, 1);
              const movedCustom = { 
                ...moved, 
                customStartTime: droppedCustomTime || (moved.isBreak ? (moved.customStartTime || moved.assignedTime) : undefined) 
              };
              const finalStudents = insertStudentChronologically(nextStudents, movedCustom, droppedCustomTime, index);
              nextStudents.length = 0;
              nextStudents.push(...finalStudents);
            }
            const updated = recalculateBoardTimes({ ...targetBoard, students: nextStudents }, sourceId);
            
            setStudents(currentStudents => currentStudents.map(s => {
              if (s.id === sourceId) {
                return {
                  ...s,
                  assignedDay: targetBoard.dayOfWeek,
                  assignedTime: updated.students.find(bs => bs.id === sourceId)?.assignedTime
                };
              }
              return s;
            }));
            
            const finalBoards = prev.map(b => b.id === targetBoardId ? updated : b);
            triggerDebouncedAutoSave(finalBoards);
            return finalBoards;
          }
          return prev;
        }

        // If moving to a DIFFERENT board
        const rawMoved = sourceBoard.students.find(s => s.id === sourceId);
        if (!rawMoved) return prev;

        // Check if 1-to-1 Swap triggered explicitly via Alt/Option key
        if (isAltSwap && index !== undefined && index < targetBoard.students.length && !targetBoard.students[index].isBreak) {
          const targetStudentToSwap = targetBoard.students[index];
          const sourceNextStudents = [...sourceBoard.students];
          const targetNextStudents = [...targetBoard.students];

          const srcIdx = sourceNextStudents.findIndex(s => s.id === sourceId);
          if (srcIdx !== -1) {
            const sourceStudentToSwap = sourceNextStudents[srcIdx];

            const srcTime = sourceStudentToSwap.customStartTime || sourceStudentToSwap.assignedTime;
            const tgtTime = targetStudentToSwap.customStartTime || targetStudentToSwap.assignedTime;

            sourceNextStudents[srcIdx] = { ...targetStudentToSwap, assignedDay: sourceBoard.dayOfWeek, customStartTime: srcTime, isPinned: false };
            targetNextStudents[index] = { ...sourceStudentToSwap, assignedDay: targetBoard.dayOfWeek, customStartTime: tgtTime, isPinned: false };

            const updatedSource = recalculateBoardTimes({ ...sourceBoard, students: sourceNextStudents }, targetStudentToSwap.id);
            const updatedTarget = recalculateBoardTimes({ ...targetBoard, students: targetNextStudents }, sourceStudentToSwap.id);

            setStudents(currentStudents => currentStudents.map(s => {
              const inSource = updatedSource.students.find(bs => bs.id === s.id);
              if (inSource) return { ...s, assignedDay: sourceBoard.dayOfWeek, assignedTime: inSource.assignedTime };
              const inTarget = updatedTarget.students.find(bs => bs.id === s.id);
              if (inTarget) return { ...s, assignedDay: targetBoard.dayOfWeek, assignedTime: inTarget.assignedTime };
              return s;
            }));

            setToast({ message: '1:1 Termintausch durchgeführt!', type: 'success' });

            const finalBoards = prev.map(b => {
              if (b.id === sourceBoard.id) return updatedSource;
              if (b.id === targetBoard.id) return updatedTarget;
              return b;
            });
            triggerDebouncedAutoSave(finalBoards);
            return finalBoards;
          }
        }

        // Standard move to a different board column
        const cleaned = removeStudentFromBoardsList(prev, sourceId);
        const targetBoardCleaned = cleaned.find(b => b.id === targetBoardId);
        if (!targetBoardCleaned) return prev;

        const movedStudent = { 
          ...rawMoved, 
          customStartTime: droppedCustomTime || (rawMoved.isBreak ? (rawMoved.customStartTime || rawMoved.assignedTime) : undefined) 
        };
        const finalTargetStudents = insertStudentChronologically(targetBoardCleaned.students, movedStudent, droppedCustomTime, index);

        const updatedTarget = recalculateBoardTimes({ ...targetBoardCleaned, students: finalTargetStudents }, sourceId);

        setStudents(currentStudents => currentStudents.map(s => {
          if (s.id === sourceId || (rawMoved.isGroup && rawMoved.groupStudents?.some(gs => gs.id === s.id))) {
            return {
              ...s,
              assignedDay: targetBoardCleaned.dayOfWeek,
              assignedTime: updatedTarget.students.find(bs => bs.id === s.id)?.assignedTime
            };
          }
          return s;
        }));

        const finalBoards = cleaned.map(b => b.id === targetBoardId ? updatedTarget : b);
        triggerDebouncedAutoSave(finalBoards);
        return finalBoards;
      }

      // 2. If moving from sidebar to board
      if (source === 'sidebar') {
        if (sourceId === 'sidebar-pause') {
          const newBreak: Student = {
            id: `break-${crypto.randomUUID()}`,
            first_name: 'Pause',
            last_name: '',
            instrument: '',
            duration: 15,
            isBreak: true,
            customStartTime: droppedCustomTime || undefined
          };
          const targetNextStudents = insertStudentChronologically(targetBoard.students, newBreak, droppedCustomTime, index);
          const updatedTarget = recalculateBoardTimes({ ...targetBoard, students: targetNextStudents }, newBreak.id);
          return prev.map(b => b.id === targetBoardId ? updatedTarget : b);
        }

        if (!student) return prev;

        // Check if student is already in target board (either directly or inside a group)
        const isAlreadyInTarget = targetBoard.students.some(s => {
          if (s.isBreak) return false;
          if (s.isGroup && s.groupStudents) {
            return s.groupStudents.some(gs => gs.id === sourceId);
          }
          return s.id === sourceId;
        });
        if (isAlreadyInTarget) return prev;

        const cleaned = removeStudentFromBoardsList(prev, sourceId);
        const targetBoardCleaned = cleaned.find(b => b.id === targetBoardId);
        if (!targetBoardCleaned) return prev;

        const studentToAssign = { ...student, assignedDay: targetBoardCleaned.dayOfWeek, customStartTime: droppedCustomTime || undefined };
        const targetNextStudents = insertStudentChronologically(targetBoardCleaned.students, studentToAssign, droppedCustomTime, index);

        const updatedTarget = recalculateBoardTimes({ ...targetBoardCleaned, students: targetNextStudents }, sourceId);

        setStudents(currentStudents => currentStudents.map(s => {
          if (s.id === sourceId) {
            return {
              ...s,
              assignedDay: targetBoardCleaned.dayOfWeek,
              assignedTime: updatedTarget.students.find(bs => bs.id === sourceId)?.assignedTime
            };
          }
          return s;
        }));

        const finalBoards = cleaned.map(b => b.id === targetBoardId ? updatedTarget : b);
        triggerDebouncedAutoSave(finalBoards);
        return finalBoards;
      }

      return prev;
    });

    // Reset drag tracking
    setDraggedStudentId(null);
    setDragSource(null);
    setDragSourceBoardId(null);
    setDragOverBoardId(null);
    setDragOverIndex(null);
  };

  const executeRemoveBreak = (boardId: string, breakId: string, slideUp: boolean) => {
    setBoards(prev => {
      const board = prev.find(b => b.id === boardId);
      if (!board) return prev;

      const breakCard = board.students.find(s => s.id === breakId);
      const breakIndex = board.students.findIndex(s => s.id === breakId);
      if (breakIndex === -1) return prev;

      const breakDuration = breakCard?.duration || 15;
      let nextStudents = board.students.filter(s => s.id !== breakId);

      if (!slideUp && breakIndex < nextStudents.length) {
        const nextCard = nextStudents[breakIndex];
        nextStudents = nextStudents.map((s, idx) => {
          if (idx === breakIndex) {
            return { ...s, customStartTime: nextCard.assignedTime };
          }
          return s;
        });
      } else if (slideUp) {
        // Close gap: advance customStartTime for following cards
        nextStudents = nextStudents.map((s, idx) => {
          if (idx >= breakIndex && s.customStartTime) {
            const [csh, csm] = parseTime(s.customStartTime);
            const shifted = Math.max(0, csh * 60 + csm - breakDuration);
            const h = Math.floor(shifted / 60) % 24;
            const m = shifted % 60;
            return { ...s, customStartTime: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` };
          }
          return s;
        });
      }

      const updatedBoard = recalculateBoardTimes({ ...board, students: nextStudents });
      const nextBoards = prev.map(b => b.id === boardId ? updatedBoard : b);

      const currentActiveId = activeDraftIdRef.current || activeDraftId;
      const currentList = draftsRef.current.length > 0 ? draftsRef.current : drafts;
      const updatedDrafts = currentList.map(d => d.id === currentActiveId ? { ...d, boards: nextBoards } : d);
      draftsRef.current = updatedDrafts;
      setDrafts(updatedDrafts);
      triggerDebouncedAutoSave(nextBoards);

      return nextBoards;
    });
    setToast({ message: 'Pause entfernt und Folgetermine aufgerückt!', type: 'success' });
  };

  // Remove a student or group from a day board (make them unassigned again)
  const handleRemoveStudentFromBoard = (boardId: string, studentId: string) => {
    if (studentId.startsWith('break-')) {
      executeRemoveBreak(boardId, studentId, true);
      return;
    }

    setBoards(prev => {
      const board = prev.find(b => b.id === boardId);
      if (!board) return prev;

      const targetStudent = board.students.find(s => s.id === studentId);
      const nextStudents = board.students.filter(s => s.id !== studentId);
      const updatedBoard = recalculateBoardTimes({ ...board, students: nextStudents });

      const memberIds = targetStudent?.isGroup && targetStudent.groupStudents
        ? targetStudent.groupStudents.map(gs => gs.id)
        : [studentId];

      setStudents(currentStudents => currentStudents.map(s => {
        if (s.id === studentId || memberIds.includes(s.id)) {
          return { ...s, assignedDay: undefined, assignedTime: undefined };
        }
        return s;
      }));

      const nextBoards = prev.map(b => b.id === boardId ? updatedBoard : b);
      const currentActiveId = activeDraftIdRef.current || activeDraftId;
      const currentList = draftsRef.current.length > 0 ? draftsRef.current : drafts;
      const updatedDrafts = currentList.map(d => d.id === currentActiveId ? { ...d, boards: nextBoards } : d);
      draftsRef.current = updatedDrafts;
      setDrafts(updatedDrafts);
      triggerDebouncedAutoSave(nextBoards);
      return nextBoards;
    });
  };

  const handleToggleSelectForGroup = (studentId: string, boardId: string) => {
    setSelectedForGroup(prev => {
      const board = boards.find(b => b.id === boardId);
      if (!board) return prev;

      const hasDifferentBoardSelection = prev.some(id => !board.students.some(s => s.id === id));
      if (hasDifferentBoardSelection) {
        return [studentId];
      }

      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleMergeSelectedIntoGroup = () => {
    if (selectedForGroup.length < 2) return;

    const targetBoard = boards.find(b => b.students.some(s => selectedForGroup.includes(s.id)));
    if (!targetBoard) return;

    const groupStudents = selectedForGroup
      .map(id => targetBoard.students.find(s => s.id === id))
      .filter((s): s is Student => !!s);
    const firstSelectedIndex = targetBoard.students.findIndex(s => selectedForGroup.includes(s.id));
    const remainingStudents = targetBoard.students.filter(s => !selectedForGroup.includes(s.id));

    const validGroupInsts = groupStudents.map(s => s.instrument).filter(inst => inst && !['musiker', 'musikerin', 'instrument', 'keines', 'none', '-'].includes(inst.toLowerCase().trim()));
    const cleanGroupInst = validGroupInsts.length > 0 ? Array.from(new Set(validGroupInsts)).join(', ') : 'Gitarre';

    const newGroupBlock: Student = {
      id: `group-${crypto.randomUUID()}`,
      first_name: groupStudents.map(s => s.first_name).join(' & '),
      last_name: '',
      instrument: cleanGroupInst,
      duration: Math.max(...groupStudents.map(s => s.duration || 30)),
      isGroup: true,
      hasPreferences: groupStudents.some(s => Boolean(s.hasPreferences)),
      groupStudents: groupStudents.map(s => ({
        id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        instrument: s.instrument && !['musiker', 'musikerin', 'instrument', 'keines', 'none', '-'].includes(s.instrument.toLowerCase().trim()) ? s.instrument : cleanGroupInst,
        duration: s.duration,
        assignedDay: s.assignedDay,
        assignedTime: s.assignedTime
      })),
      assignedDay: targetBoard.dayOfWeek,
      assignedTime: groupStudents[0].assignedTime
    };

    const nextStudents = [...remainingStudents];
    nextStudents.splice(firstSelectedIndex, 0, newGroupBlock);

    setBoards(prev => prev.map(b => b.id === targetBoard.id ? recalculateBoardTimes({ ...b, students: nextStudents }) : b));

    setSelectedForGroup([]);
    setIsGroupModeActive(false);
    setToast({ message: 'Termine erfolgreich zusammengeführt!', type: 'success' });
  };

  const handleUngroupBlock = (boardId: string, groupBlockId: string) => {
    setBoards(prev => prev.map(b => {
      if (b.id !== boardId) return b;

      const groupBlock = b.students.find(s => s.id === groupBlockId);
      if (!groupBlock || !groupBlock.isGroup || !groupBlock.groupStudents) return b;

      const nextStudents: Student[] = [];
      b.students.forEach(s => {
        if (s.id === groupBlockId) {
          groupBlock.groupStudents!.forEach(gs => {
            nextStudents.push({
              ...gs,
              assignedDay: b.dayOfWeek
            });
          });
        } else {
          nextStudents.push(s);
        }
      });

      return recalculateBoardTimes({ ...b, students: nextStudents });
    }));
    setToast({ message: 'Gruppentermin wieder aufgeteilt!', type: 'success' });
  };

  // Update student's lesson duration (Unterrichtsdauer)
  const handleUpdateDuration = async (studentId: string, duration: number) => {
    // 1. Update duration in main students list
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, duration } : s));

    // 2. Update duration in day boards and recalculate lesson times
    setBoards(prev => prev.map(b => {
      if (b.students.some(s => s.id === studentId)) {
        const nextStudents = b.students.map(s => s.id === studentId ? { ...s, duration } : s);
        return recalculateBoardTimes({ ...b, students: nextStudents });
      }
      return b;
    }));

    // 3. Persist to database users table
    try {
      const { error } = await supabase
        .from('users')
        .update({ lesson_duration: duration })
        .eq('id', studentId);
      if (error) throw error;
    } catch (err) {
      console.error('Error updating lesson_duration in users table:', err);
    }
  };

  // Insert a 15-minute break automatically when continuous block exceeds 3 hours (ArbZG / Arbeitsschutz)
  const handleInsertAutoBreak = (boardId: string) => {
    pushUndoSnapshot();

    setBoards(prev => {
      const targetBoard = prev.find(b => b.id === boardId);
      if (!targetBoard || targetBoard.students.length === 0) return prev;

      // Find first teaching card to anchor start time
      const firstStudent = targetBoard.students.find(s => !s.isBreak);
      const baseStartTime = firstStudent?.assignedTime || firstStudent?.customStartTime || targetBoard.startAnchor || '14:00';
      const [bsh, bsm] = parseTime(baseStartTime);
      let runningMinutes = bsh * 60 + bsm;
      let inserted = false;
      let insertIndex = -1;
      let pauseStartTime = '';

      let continuousMinutes = 0;
      for (let i = 0; i < targetBoard.students.length; i++) {
        const s = targetBoard.students[i];
        if (s.isBreak) {
          continuousMinutes = 0;
          continue;
        }
        continuousMinutes += (s.duration || 30);
        const sTime = s.assignedTime || s.customStartTime || '14:00';
        const [sh, sm] = parseTime(sTime);
        runningMinutes = (sh * 60 + sm) + (s.duration || 30);

        if (continuousMinutes >= 150) {
          insertIndex = i + 1;
          const ph = Math.floor(runningMinutes / 60) % 24;
          const pm = runningMinutes % 60;
          pauseStartTime = `${String(ph).padStart(2, '0')}:${String(pm).padStart(2, '0')}`;
          inserted = true;
          break;
        }
      }

      if (!inserted) {
        insertIndex = Math.max(1, Math.floor(targetBoard.students.length / 2));
        const prevStudent = targetBoard.students[insertIndex - 1];
        const prevTime = prevStudent?.assignedTime || prevStudent?.customStartTime || '14:00';
        const [psh, psm] = parseTime(prevTime);
        const pEnd = psh * 60 + psm + (prevStudent?.duration || 30);
        const ph = Math.floor(pEnd / 60) % 24;
        const pm = pEnd % 60;
        pauseStartTime = `${String(ph).padStart(2, '0')}:${String(pm).padStart(2, '0')}`;
      }

      const newBreak: Student = {
        id: `break-${crypto.randomUUID()}`,
        first_name: 'Pause',
        last_name: '',
        instrument: '',
        duration: 15,
        isBreak: true,
        customStartTime: pauseStartTime,
        assignedTime: pauseStartTime,
        assignedDay: targetBoard.dayOfWeek
      };

      const nextStudents: Student[] = [];
      targetBoard.students.forEach((s, idx) => {
        if (idx === insertIndex) {
          nextStudents.push(newBreak);
        }
        if (idx >= insertIndex) {
          let shiftedCustom = s.customStartTime;
          if (shiftedCustom) {
            const [csh, csm] = parseTime(shiftedCustom);
            const advanced = csh * 60 + csm + 15;
            const ah = Math.floor(advanced / 60) % 24;
            const am = advanced % 60;
            shiftedCustom = `${String(ah).padStart(2, '0')}:${String(am).padStart(2, '0')}`;
          }
          nextStudents.push({
            ...s,
            customStartTime: shiftedCustom
          });
        } else {
          nextStudents.push(s);
        }
      });

      if (insertIndex >= targetBoard.students.length) {
        nextStudents.push(newBreak);
      }

      const updatedBoard = recalculateBoardTimes({ ...targetBoard, students: nextStudents });
      const nextBoards = prev.map(b => b.id === boardId ? updatedBoard : b);

      const currentActiveId = activeDraftIdRef.current || activeDraftId;
      const currentList = draftsRef.current.length > 0 ? draftsRef.current : drafts;
      const updatedDrafts = currentList.map(d => d.id === currentActiveId ? { ...d, boards: nextBoards } : d);
      draftsRef.current = updatedDrafts;
      setDrafts(updatedDrafts);
      triggerDebouncedAutoSave(nextBoards);

      return nextBoards;
    });

    setToast({ message: '15-Minuten-Pause erfolgreich eingeschoben!', type: 'success' });
  };

  const generatePDFBackup = async (boardsToSave: DayBoard[], allStudents: Student[]) => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    doc.setProperties({
      title: 'Stundenplan & Backup - Campus-Groovelab Enterprise',
      subject: 'Stundenplan-Export und Backup-Datenblatt',
      author: 'Campus-Groovelab Platform',
      creator: 'Campus-Groovelab Platform'
    });

    const primaryGreen = [52, 168, 83];
    const darkSlate = [15, 23, 42];
    const mutedText = [100, 116, 139];

    // Top Header Accent Bar
    doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.rect(0, 0, 210, 6, 'F');

    // Header Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('Unterrichts-Stundenplan', 20, 20);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text(`Campus-Groovelab Enterprise • Erstellt am ${new Date().toLocaleDateString('de-DE')}`, 20, 26);
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 30, 190, 30);

    let y = 38;

    boardsToSave.forEach(board => {
      if (y > 250) {
        doc.addPage();
        doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
        doc.rect(0, 0, 210, 4, 'F');
        y = 20;
      }
      
      const dayName = DAYS_OF_WEEK.find(d => d.value === board.dayOfWeek)?.name || 'Tag';
      
      // Day Board Header Card
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(20, y, 170, 8, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
      doc.text(`${dayName.toUpperCase()} (Unterrichtsbeginn: ${board.startAnchor} Uhr)`, 24, y + 5.5);
      y += 12;

      board.students.forEach(s => {
        if (y > 270) {
          doc.addPage();
          doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
          doc.rect(0, 0, 210, 4, 'F');
          y = 20;
        }

        doc.setFontSize(9);
        if (s.isBreak) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(180, 83, 9);
          doc.text(`• ${s.assignedTime || '00:00'} Uhr`, 25, y);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(146, 64, 14);
          doc.text(`[Pause] (${s.duration} Min)`, 65, y);
        } else {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(51, 65, 85);
          doc.text(`• ${s.assignedTime || '00:00'} Uhr`, 25, y);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(15, 23, 42);
          doc.text(`${s.first_name} ${maskLastName(s.last_name, showRealNames)}`, 65, y);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(52, 168, 83);
          doc.text(`${s.instrument} (${s.duration} Min)`, 140, y);
        }
        y += 5.5;
      });

      y += 6;
    });

    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text(`Erstellt über Campus-Groovelab Enterprise Platform • Stand: ${new Date().toLocaleDateString('de-DE')}`, 20, 282);

    const pdfArrayBuffer = doc.output('arraybuffer');
    // Safe btoa for UTF-8 (umlaute etc)
    const encodedJson = btoa(unescape(encodeURIComponent(JSON.stringify({ boards: boardsToSave, students: allStudents }))));
    const backupData = "\n---GROOVELAB_BACKUP---\n" + encodedJson;
    const encoder = new TextEncoder();
    const backupBuffer = encoder.encode(backupData);
    
    const finalBlob = new Blob([pdfArrayBuffer, backupBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(finalBlob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `Stundenplan_Backup_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestoreFromPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const marker = "---GROOVELAB_BACKUP---\n";
      const idx = text.lastIndexOf(marker);
      
      if (idx !== -1) {
        const base64Data = text.substring(idx + marker.length);
        // Safe atob for UTF-8
        const jsonStr = decodeURIComponent(escape(atob(base64Data)));
        const parsed = JSON.parse(jsonStr);
        
        if (parsed.boards && parsed.students) {
          setBoards(parsed.boards);
          setStudents(parsed.students);
          // Auto-save to localStorage
          const boardDefinitions = parsed.boards.map((b: DayBoard) => ({
            id: b.id,
            dayOfWeek: b.dayOfWeek,
            startAnchor: b.startAnchor,
            roomId: b.roomId,
            students: b.students
          }));
          const activePlatform = localStorage.getItem('groovelab_active_platform') || 'groovelab';
          localStorage.setItem(`groovelab_teacher_boards_${activePlatform}_${selectedTeacherId}`, JSON.stringify(boardDefinitions));
          await showAlert('Stundenplan erfolgreich aus dem Backup wiederhergestellt!');
        } else {
          await showAlert('Ungültiges Backup-Format.');
        }
      } else {
        await showAlert('Kein Backup in dieser PDF gefunden.');
      }
    } catch (err) {
      console.error(err);
      await showAlert('Fehler beim Wiederherstellen der Datei.');
    }
    
    e.target.value = '';
  };

  const syncStudentsWithBoards = (targetBoards: DayBoard[]) => {
    const sourceStudents = masterStudentsRef.current.length > 0 ? masterStudentsRef.current : students;
    const consolidated = consolidateDatabaseGroups(targetBoards, sourceStudents);
    setBoards(consolidated.boards);
    setStudents(consolidated.pool);
  };

  const handleSwitchDraft = (draftId: string) => {
    const currentActiveId = activeDraftIdRef.current || activeDraftId;
    if (draftId === currentActiveId) return;

    // 1. Sync current boards to active draft in drafts state
    const syncedDrafts = (draftsRef.current.length > 0 ? draftsRef.current : drafts).map(d => d.id === currentActiveId ? { ...d, boards } : d);
    draftsRef.current = syncedDrafts;
    setDrafts(syncedDrafts);

    const targetDraft = syncedDrafts.find(d => d.id === draftId);
    if (!targetDraft) return;

    setActiveDraftId(draftId);
    activeDraftIdRef.current = draftId;
    let newBoards = targetDraft.boards || [];
    if (newBoards.length === 0 && boards.length > 0) {
      newBoards = boards.map(b => ({
        ...b,
        id: `board-${crypto.randomUUID()}`,
        students: b.students.filter(s => s.isBreak)
      }));
    }
    setBoards(newBoards);
    syncStudentsWithBoards(newBoards);
    setToast({ message: `Zu ${targetDraft.name} gewechselt!`, type: 'success' });
  };

  const handleCreateDraft = () => {
    // Sync current boards to active draft before creating new one
    const currentActiveId = activeDraftIdRef.current || activeDraftId;
    const syncedDrafts = (draftsRef.current.length > 0 ? draftsRef.current : drafts).map(d => d.id === currentActiveId ? { ...d, boards } : d);
    draftsRef.current = syncedDrafts;
    setDrafts(syncedDrafts);
    setShowNewDraftPromptModal(true);
  };

  const handleConfirmNewDraft = (copyTimes: boolean) => {
    setShowNewDraftPromptModal(false);
    const newId = `draft-${crypto.randomUUID()}`;
    const currentList = draftsRef.current.length > 0 ? draftsRef.current : drafts;
    const nextNumber = currentList.length + 1;
    const draftName = `Entwurf ${nextNumber}`;

    let initialBoards: DayBoard[] = [];
    const currentActiveId = activeDraftIdRef.current || activeDraftId;
    const activeDraft = currentList.find(d => d.id === currentActiveId) || currentList[0];

    if (copyTimes && activeDraft && activeDraft.boards && activeDraft.boards.length > 0) {
      // Copy existing teaching days & times, but clear student placements
      initialBoards = activeDraft.boards.map(b => ({
        ...b,
        id: `board-${crypto.randomUUID()}`,
        students: (b.students || []).filter(s => s.isBreak) // Keep breaks, clear students
      }));
    } else {
      // Create fresh default boards
      const defaultRoomId = rooms.length > 0 ? rooms[0].id : '';
      for (let i = 1; i <= 5; i++) {
        initialBoards.push({
          id: `board-${crypto.randomUUID()}`,
          dayOfWeek: i,
          startAnchor: '14:00',
          roomId: defaultRoomId,
          students: []
        });
      }
    }

    const newDraft = {
      id: newId,
      name: draftName,
      boards: initialBoards
    };

    const nextDrafts = [...currentList, newDraft];
    draftsRef.current = nextDrafts;
    setDrafts(nextDrafts);
    setActiveDraftId(newId);
    activeDraftIdRef.current = newId;
    setBoards(initialBoards);
    syncStudentsWithBoards(initialBoards);

    // Immediate persistence to ensure draft is never lost on refresh or submit
    const draftStateToSave = {
      activeDraftId: newId,
      submittedDraftId,
      submittedAt: lastSubmittedTime ? new Date().toISOString() : '',
      drafts: nextDrafts,
      allTeacherStudentIds: Array.from(new Set((masterStudentsRef.current.length > 0 ? masterStudentsRef.current : students).map(s => s.id))),
      unassignedStudentIds: students.filter(s => !s.isBreak && !s.assignedDay).map(s => s.id)
    };
    const activePlatform = localStorage.getItem('groovelab_active_platform') || 'groovelab';
    const columnName = activePlatform === 'campus' ? 'campus_räume' : 'groovelab_räume';
    localStorage.setItem(`groovelab_teacher_draft_state_${activePlatform}_${selectedTeacherId}`, JSON.stringify(draftStateToSave));
    
    supabase
      .from('users')
      .update({
        planned_boards: draftStateToSave,
        campus_räume: draftStateToSave,
        groovelab_räume: draftStateToSave
      })
      .eq('id', selectedTeacherId)
      .then();

    if (!copyTimes) {
      // Open day & time setup modal for fresh configuration
      handleEditTeacherAvailability();
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    const currentList = draftsRef.current.length > 0 ? draftsRef.current : drafts;
    if (currentList.length <= 1) {
      await showAlert('Der letzte verbleibende Entwurf kann nicht gelöscht werden.');
      return;
    }
    if (!await showConfirm('Möchtest du diesen Entwurf wirklich löschen?')) {
      return;
    }
    const filtered = currentList.filter(d => d.id !== draftId);
    const updatedDrafts = filtered.map((d, index) => ({
      ...d,
      name: `Entwurf ${index + 1}`
    }));
    
    draftsRef.current = updatedDrafts;
    setDrafts(updatedDrafts);

    let nextActiveId = activeDraftIdRef.current || activeDraftId;
    let nextBoards = boards;

    if (nextActiveId === draftId) {
      const fallback = updatedDrafts[0];
      nextActiveId = fallback.id;
      setActiveDraftId(fallback.id);
      activeDraftIdRef.current = fallback.id;
      nextBoards = fallback.boards || [];
      setBoards(nextBoards);
      syncStudentsWithBoards(nextBoards);
    }

    const nextSubmittedDraftId = submittedDraftId === draftId ? '' : submittedDraftId;
    if (submittedDraftId === draftId) {
      setSubmittedDraftId('');
    }

    // Persist deletion immediately
    const draftStateToSave = {
      activeDraftId: nextActiveId,
      submittedDraftId: nextSubmittedDraftId,
      submittedAt: nextSubmittedDraftId ? lastSubmittedTime : '',
      drafts: updatedDrafts,
      allTeacherStudentIds: Array.from(new Set((masterStudentsRef.current.length > 0 ? masterStudentsRef.current : students).map(s => s.id))),
      unassignedStudentIds: students.filter(s => !s.isBreak && !s.assignedDay).map(s => s.id)
    };
    const activePlatform = localStorage.getItem('groovelab_active_platform') || 'groovelab';
    const columnName = activePlatform === 'campus' ? 'campus_räume' : 'groovelab_räume';
    localStorage.setItem(`groovelab_teacher_draft_state_${activePlatform}_${selectedTeacherId}`, JSON.stringify(draftStateToSave));
    
    supabase
      .from('users')
      .update({
        planned_boards: draftStateToSave,
        campus_räume: draftStateToSave,
        groovelab_räume: draftStateToSave
      })
      .eq('id', selectedTeacherId)
      .then();
  };

  const handleHardResetSystem = async () => {
    if (!await showConfirm("Möchtest du WIRKLICH alle bisher eingereichten Stundenpläne komplett löschen und von vorne beginnen? Dies kann nicht rückgängig gemacht werden!")) {
      return;
    }
    
    try {
      setLoading(true);
      
      // 1. Delete all schedule slots for this teacher
      await supabase
        .from('schedules')
        .delete()
        .eq('teacher_id', selectedTeacherId);
        
      // 2. Delete all future schedule_occurrences
      const todayStr = new Date().toISOString().split('T')[0];
      await supabase
        .from('schedule_occurrences')
        .delete()
        .eq('teacher_id', selectedTeacherId)
        .gte('date', todayStr);
        
      // 3. Clear draft state in users table
      const activePlatform = localStorage.getItem('groovelab_active_platform') || 'groovelab';
      const columnName = activePlatform === 'campus' ? 'campus_räume' : 'groovelab_räume';
      await supabase
        .from('users')
        .update({ [columnName]: null })
        .eq('id', selectedTeacherId);
        
      // 4. Force refresh of the data
      queryCache.invalidatePrefix('other_schedules_');
      setHasSubmittedSchedule(false);
      setScheduleStatus('none');
      setDrafts([{ id: `draft-${crypto.randomUUID()}`, name: 'Entwurf 1', boards: [] }]);
      setBoards([]);
      
      await loadInitialData();
      
      setToast({
        message: "Stundenplan-Altlasten wurden erfolgreich gelöscht.",
        type: 'success'
      });
    } catch (err: any) {
      console.error('Error in hard reset:', err);
      await showAlert('Fehler beim Zurücksetzen: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Lock in schedule and send to Secretariat
  const handleLockAndSend = async () => {
    const unassignedStudentsList = students.filter(s => !s.isBreak && !s.assignedDay);
    const unassignedCount = unassignedStudentsList.length;
    const totalAssigned = boards.reduce((acc, b) => acc + b.students.filter(s => !s.isBreak && s.assignedTime).length, 0);
    const totalStudentsCount = totalAssigned + unassignedCount;

    if (unassignedCount > 0) {
      setPartialSubmitData({
        unassignedStudents: unassignedStudentsList,
        totalAssigned,
        totalStudents: totalStudentsCount
      });
      setShowPartialSubmitModal(true);
      return;
    }

    const confirmMsg = hasUnsubmittedEdits 
      ? `Möchtest du die geänderten ${totalAssigned} Unterrichtstermine erneut zur Prüfung an das Schulsekretariat übermitteln?`
      : `Möchtest du diesen Stundenplan (${totalAssigned} eingeteilte Schüler) zur Prüfung an das Schulsekretariat übermitteln?`;

    if (!await showConfirm(confirmMsg)) {
      return;
    }

    await executeLockAndSend();
  };

  const executeLockAndSend = async () => {
    // Validate if any assigned student in the draft overlaps with wöchentliche Blockierungen
    let hasBlockedConflict = false;
    let conflictStudentName = '';
    let conflictRoomName = '';
    
    for (const board of boards) {
      if (!board.roomId) continue;
      
      for (const bs of board.students) {
        if (bs.isBreak || !bs.assignedTime) continue;
        
        const [sh, sm] = parseTime(bs.assignedTime);
        const startMin = sh * 60 + sm;
        const endMin = startMin + bs.duration;
        
        const matchedBlocked = blockedSlots.find((s: any) => {
          if (s.room_id !== board.roomId) return false;
          if (s.day_of_week !== board.dayOfWeek) return false;

          const [bsh, bsm] = parseTime(s.start_time ? s.start_time.substring(0, 5) : '00:00');
          const bStart = bsh * 60 + bsm;
          const [beh, bem] = parseTime(s.end_time ? s.end_time.substring(0, 5) : '23:59');
          const bEnd = beh * 60 + bem;

          return startMin < bEnd && endMin > bStart;
        });
        
        if (matchedBlocked) {
          hasBlockedConflict = true;
          conflictStudentName = `${bs.first_name} ${maskLastName(bs.last_name, showRealNames)}`;
          const r = rooms.find(room => room.id === board.roomId);
          conflictRoomName = r ? r.name : 'Raum';
          break;
        }
      }
      if (hasBlockedConflict) break;
    }
    
    if (hasBlockedConflict) {
      await showAlert(`Einreichen blockiert: Der Unterricht von ${conflictStudentName} in ${conflictRoomName} überschneidet sich mit einer externen Blockierung/Kooperation. Bitte verschiebe den Termin oder wähle einen anderen Raum.`);
      return;
    }

    try {
      setSubmitting(true);
      isSubmittingRef.current = true;
      const validBoards = boards.filter(b => b.students.length > 0);
      const currentActiveId = activeDraftIdRef.current || activeDraftId;
      
      const now = new Date();
      const nowIso = now.toISOString();
      setSubmittedAtIso(nowIso);
      submittedAtIsoRef.current = nowIso;
      const formattedDate = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const formattedTime = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      const submitTimeString = `am ${formattedDate} um ${formattedTime} Uhr`;

      // 1. Mark this specific draft as submitted
      setSubmittedDraftId(currentActiveId);
      setLastSubmittedTime(submitTimeString);
      setHasSubmittedSchedule(true);
      setScheduleStatus('pending');
      setSubmittedBoardsSnapshot(JSON.stringify(validBoards.map(b => ({
        id: b.id,
        day: b.dayOfWeek,
        room: b.roomId,
        startAnchor: b.startAnchor,
        students: b.students.map(s => `${s.id}-${s.assignedTime}-${s.duration}-${s.isBreak ? '1' : '0'}`)
      }))));

      const boardDefinitions = validBoards.map(b => ({
        id: b.id,
        dayOfWeek: b.dayOfWeek,
        startAnchor: b.startAnchor,
        roomId: b.roomId,
        students: b.students.map(s => ({
          id: s.id,
          first_name: s.first_name,
          last_name: s.last_name,
          instrument: s.instrument,
          duration: s.duration,
          assignedDay: s.assignedDay,
          assignedTime: s.assignedTime,
          isBreak: s.isBreak,
          customStartTime: s.customStartTime,
          isGroup: s.isGroup,
          groupStudents: s.groupStudents
        }))
      }));

      const currentDraftsList = draftsRef.current.length > 0 ? draftsRef.current : drafts;
      const updatedDrafts = currentDraftsList.map(d => {
        if (d.id === currentActiveId) {
          return { ...d, status: 'ready_for_admin_review', boards: boardDefinitions, submittedAt: now.toISOString() };
        }
        return d;
      });
      draftsRef.current = updatedDrafts;
      setDrafts(updatedDrafts);

      const allTeacherStudentIds = Array.from(new Set(
        students
          .flatMap(s => s.isGroup && s.groupStudents ? s.groupStudents.map(gs => gs.id) : [s.id])
          .filter(id => id && !id.startsWith('group-') && !id.startsWith('break-'))
      ));
      const unassignedStudentIds = students
        .filter(s => !s.isBreak && !s.assignedDay)
        .flatMap(s => s.isGroup && s.groupStudents ? s.groupStudents.map(gs => gs.id) : [s.id])
        .filter(id => id && !id.startsWith('group-') && !id.startsWith('break-'));

      const draftStateToSave = {
        activeDraftId: currentActiveId,
        submittedDraftId: currentActiveId,
        submittedAt: now.toISOString(),
        drafts: updatedDrafts,
        allTeacherStudentIds,
        unassignedStudentIds
      };

      const activePlatform = localStorage.getItem('groovelab_active_platform') || 'groovelab';
      const payloadToSaveStr = JSON.stringify(draftStateToSave);
      lastSavedStateRef.current = payloadToSaveStr;
      localStorage.setItem(`groovelab_teacher_draft_state_${activePlatform}_${selectedTeacherId}`, payloadToSaveStr);

      await supabase
        .from('users')
        .update({
          planned_boards: draftStateToSave,
          campus_räume: draftStateToSave,
          groovelab_räume: draftStateToSave
        })
        .eq('id', selectedTeacherId);

      // Trigger alert notification for Secretariat
      const { data: teacherProfile } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', selectedTeacherId)
        .single();

      const teacherName = teacherProfile ? `${teacherProfile.first_name} ${teacherProfile.last_name}` : 'Lehrkraft';
      const unassignedStudentsCount = unassignedStudentIds.length;
      const totalAssignedCount = validBoards.reduce((acc, b) => acc + b.students.filter(s => !s.isBreak && s.assignedTime).length, 0);
      const totalCount = totalAssignedCount + unassignedStudentsCount;

      const alertMsg = unassignedStudentsCount > 0
        ? `Stundenplan-Review (Teil-Einreichung): Lehrkraft ${teacherName} hat den Stundenplan eingereicht (${totalAssignedCount} von ${totalCount} Schülern eingeteilt, ${unassignedStudentsCount} offen im Pool).`
        : `Stundenplan-Review: Lehrkraft ${teacherName} hat den vollständigen neuen Stundenplan erstellt und zur Freigabe an die Verwaltung gesendet (${totalAssignedCount} Schüler eingeteilt).`;

      await supabase.from('system_alerts').insert({
        school_id: schoolId,
        teacher_id: selectedTeacherId,
        type: 'Stundenplan Freigabe',
        message: alertMsg
      });

      // Generate PDF Backup & Celebration
      await generatePDFBackup(validBoards, students);
      setShowCelebration(true);
      setToast({ message: 'Stundenplan zur Prüfung an die Verwaltung übermittelt! Bis zur Freigabe bleibt der bisherige Plan aktiv.', type: 'success' });
    } catch (err: any) {
      console.error('Error submitting schedule:', err);
      await showAlert('Fehler beim Einreichen: ' + err.message);
    } finally {
      setSubmitting(false);
      setTimeout(() => {
        isSubmittingRef.current = false;
      }, 1500);
    }
  };

  // 🏛️ Enterprise+ Goldstandard: Schulsekretariat Freigabe- & Ablehnungs-Engine
  const handleApproveScheduleByAdmin = async () => {
    const validBoards = boards.filter(b => b.students.some(s => !s.isBreak));
    if (validBoards.length === 0) {
      await showAlert('Keine Unterrichtsstunden zum Genehmigen vorhanden.');
      return;
    }

    // Check if every valid board has a room assigned
    const missingRoomBoards = validBoards.filter(b => !b.roomId);
    if (missingRoomBoards.length > 0) {
      const dayNames = missingRoomBoards.map(b => DAYS_OF_WEEK.find(d => d.value === b.dayOfWeek)?.name || 'Tag').join(', ');
      await showAlert(`Raumzuweisung fehlt: Bitte weise zuerst den Unterrichtstagen (${dayNames}) einen Raum zu, bevor du den Stundenplan freigibst.`);
      return;
    }

    const totalStudents = validBoards.reduce((acc, b) => acc + b.students.filter(s => !s.isBreak && s.assignedTime).length, 0);
    const teacherProfile = teachers.find(t => t.id === selectedTeacherId);
    const teacherName = teacherProfile ? `${teacherProfile.first_name} ${teacherProfile.last_name}` : 'Lehrkraft';

    if (!await showConfirm(`Möchtest du den Stundenplan für ${teacherName} (${totalStudents} eingeteilte Schüler) jetzt verbindlich genehmigen und live schalten? Eltern und Schüler werden automatisch informiert.`)) {
      return;
    }

    try {
      setSubmitting(true);
      const now = new Date();
      const currentActiveId = activeDraftIdRef.current || activeDraftId;
      const cleanTeacherId = selectedTeacherId ? selectedTeacherId.replace(/^teacher-/i, '') : '';

      // 1. Prepare clean slots to insert/update in schedules table
      const slotsToInsert: any[] = [];
      validBoards.forEach(b => {
        const cleanRoomId = isUUID(b.roomId) ? b.roomId : null;
        b.students.forEach(s => {
          if (s.isBreak || !s.assignedTime) return;
          if (s.isGroup && s.groupStudents && s.groupStudents.length > 0) {
            s.groupStudents.forEach(gs => {
              slotsToInsert.push({
                school_id: schoolId,
                teacher_id: cleanTeacherId,
                student_id: isUUID(gs.id) ? gs.id : null,
                day_of_week: b.dayOfWeek,
                time_slot: s.assignedTime,
                room_id: cleanRoomId,
                duration: s.duration || 30,
                status: 'approved'
              });
            });
          } else if (s.id && !s.id.startsWith('group-') && !s.id.startsWith('break-')) {
            slotsToInsert.push({
              school_id: schoolId,
              teacher_id: cleanTeacherId,
              student_id: isUUID(s.id) ? s.id : null,
              day_of_week: b.dayOfWeek,
              time_slot: s.assignedTime,
              room_id: cleanRoomId,
              duration: s.duration || 30,
              status: 'approved'
            });
          }
        });
      });

      // Purge old schedules for this teacher to prevent duplicates
      await supabase
        .from('schedules')
        .delete()
        .eq('school_id', schoolId)
        .eq('teacher_id', cleanTeacherId);

      // Insert new approved schedules
      if (slotsToInsert.length > 0) {
        const { error: insertErr } = await supabase
          .from('schedules')
          .insert(slotsToInsert);
        if (insertErr) throw insertErr;
      }

      // Update planned_boards state to approved
      const updatedDrafts = drafts.map(d => {
        if (d.id === currentActiveId) {
          return { ...d, status: 'approved', approvedAt: now.toISOString() };
        }
        return d;
      });
      setDrafts(updatedDrafts);
      draftsRef.current = updatedDrafts;

      const draftStateToSave = {
        activeDraftId: currentActiveId,
        submittedDraftId: currentActiveId,
        status: 'approved',
        approvedAt: now.toISOString(),
        drafts: updatedDrafts
      };

      await supabase
        .from('users')
        .update({
          planned_boards: draftStateToSave,
          campus_räume: draftStateToSave,
          groovelab_räume: draftStateToSave
        })
        .eq('id', cleanTeacherId);

      // Resolve pending submission alerts for Teacher
      await supabase
        .from('system_alerts')
        .update({ resolved: true })
        .eq('school_id', schoolId)
        .eq('teacher_id', cleanTeacherId)
        .in('type', ['Stundenplan Freigabe', 'schedule_submission']);

      // System Alert / Notification for Teacher
      await supabase.from('system_alerts').insert({
        school_id: schoolId,
        teacher_id: cleanTeacherId,
        type: 'Stundenplan Genehmigt',
        message: `Stundenplan genehmigt: Das Schulsekretariat hat deinen Stundenplan verbindlich freigegeben und live geschaltet (${totalStudents} Schüler eingeteilt).`
      });

      // Generate schedule_occurrences for this teacher until end of school year
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      const todayStr = `${y}-${m}-${d}`;
      const schoolStartYear = today.getMonth() >= 8 ? today.getFullYear() : today.getFullYear() - 1;
      const schoolYearEnd = new Date(`${schoolStartYear + 1}-08-31T23:59:59`);

      const { data: dbTeacherSchedules } = await supabase
        .from('schedules')
        .select('*')
        .eq('school_id', schoolId)
        .eq('teacher_id', cleanTeacherId)
        .eq('status', 'approved');

      if (dbTeacherSchedules && dbTeacherSchedules.length > 0) {
        const occurrences: any[] = [];
        dbTeacherSchedules.forEach((sch: any) => {
          const { id: scheduleId, student_id, day_of_week, time_slot, duration } = sch;
          if (!student_id || !day_of_week || !time_slot) return;
          const dayNum = typeof day_of_week === 'number' ? day_of_week : (parseInt(day_of_week, 10) || 1);

          const current = new Date(today);
          current.setHours(0, 0, 0, 0);
          const currentDay = current.getDay() || 7;
          const diff = dayNum - currentDay;
          const targetDate = new Date(current);
          targetDate.setDate(current.getDate() + diff);

          const todayZero = new Date(today);
          todayZero.setHours(0, 0, 0, 0);
          if (targetDate < todayZero) {
            targetDate.setDate(targetDate.getDate() + 7);
          }

          while (targetDate <= schoolYearEnd) {
            const ty = targetDate.getFullYear();
            const tm = String(targetDate.getMonth() + 1).padStart(2, '0');
            const td = String(targetDate.getDate()).padStart(2, '0');
            const dateStr = `${ty}-${tm}-${td}`;
            const startTime = time_slot.includes(':') && time_slot.split(':').length === 2 ? time_slot + ':00' : time_slot;
            occurrences.push({
              school_id: schoolId,
              schedule_id: scheduleId,
              template_room_id: sch.room_id || null,
              student_id,
              teacher_id: cleanTeacherId,
              date: dateStr,
              start_time: startTime,
              duration: duration || 45,
              status: 'scheduled'
            });
            targetDate.setDate(targetDate.getDate() + 7);
          }
        });

        await supabase
          .from('schedule_occurrences')
          .delete()
          .eq('teacher_id', cleanTeacherId)
          .gte('date', todayStr);

        if (occurrences.length > 0) {
          const chunkSize = 250;
          for (let i = 0; i < occurrences.length; i += chunkSize) {
            const chunk = occurrences.slice(i, i + chunkSize);
            const { error: chunkErr } = await supabase.from('schedule_occurrences').insert(chunk);
            if (chunkErr) {
              console.error('[ScheduleBoardDesktop] Occurrence bulk insert chunk failed:', chunkErr);
            }
          }
        }
      }

      // 🛡️ 1. Automatic Room Bookings Synchronization (Enterprise Closed-Loop Lifecycle)
      try {
        const bookingsToInsert: any[] = [];
        const processedBookingKeys = new Set<string>();

        // Purge existing upcoming bookings for this teacher to prevent ghost collisions
        await supabase
          .from('room_bookings')
          .delete()
          .eq('school_id', schoolId)
          .eq('booked_by', cleanTeacherId)
          .gte('date', todayStr);

        validBoards.forEach(b => {
          const cleanRoomId = isUUID(b.roomId) ? b.roomId : null;
          if (!cleanRoomId) return;

          b.students.forEach(s => {
            if (s.isBreak || !s.assignedTime) return;
            const [sh, sm] = parseTime(s.assignedTime);
            const startMins = sh * 60 + sm;
            const duration = s.duration || 30;
            const endMins = startMins + duration;
            const eh = Math.floor(endMins / 60);
            const em = endMins % 60;
            const startTimeStr = `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00`;
            const endTimeStr = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00`;

            const current = new Date(today);
            current.setHours(0, 0, 0, 0);
            const currentDay = current.getDay() || 7;
            const diff = b.dayOfWeek - currentDay;
            const targetDate = new Date(current);
            targetDate.setDate(current.getDate() + diff);
            const todayMidnight = new Date(today);
            todayMidnight.setHours(0, 0, 0, 0);
            if (targetDate < todayMidnight) {
              targetDate.setDate(targetDate.getDate() + 7);
            }

            // Generate bookings for the next 8 weeks
            const bookingHorizon = new Date(today.getTime() + 8 * 7 * 24 * 60 * 60 * 1000);
            while (targetDate <= bookingHorizon) {
              const ty = targetDate.getFullYear();
              const tm = String(targetDate.getMonth() + 1).padStart(2, '0');
              const td = String(targetDate.getDate()).padStart(2, '0');
              const dateStr = `${ty}-${tm}-${td}`;
              const key = `${cleanRoomId}_${dateStr}_${startTimeStr}`;

              if (!processedBookingKeys.has(key)) {
                processedBookingKeys.add(key);
                const sName = s.isGroup && s.groupStudents ? `Gruppe (${s.groupStudents.length} Schüler)` : `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Schüler';
                bookingsToInsert.push({
                  school_id: schoolId,
                  room_id: cleanRoomId,
                  booked_by: cleanTeacherId,
                  date: dateStr,
                  start_time: startTimeStr,
                  end_time: endTimeStr,
                  title: `Unterricht: ${sName}`,
                  status: 'approved',
                  is_confirmed: true
                });
              }
              targetDate.setDate(targetDate.getDate() + 7);
            }
          });
        });

        if (bookingsToInsert.length > 0) {
          const bookingChunkSize = 250;
          for (let i = 0; i < bookingsToInsert.length; i += bookingChunkSize) {
            const bChunk = bookingsToInsert.slice(i, i + bookingChunkSize);
            await supabase.from('room_bookings').insert(bChunk);
          }
          window.dispatchEvent(new CustomEvent('refresh-bookings'));
        }
      } catch (roomErr) {
        console.warn('[ScheduleBoardDesktop] Room bookings synchronization note:', roomErr);
      }

      // 🛡️ 2. Student & Parent Notification Pipeline (Enterprise Closed-Loop Lifecycle)
      try {
        const studentNotificationPromises: any[] = [];
        const notifiedStudentIds = new Set<string>();

        validBoards.forEach(b => {
          const dayName = DAYS_OF_WEEK.find(d => d.value === b.dayOfWeek)?.name || 'Unterrichtstag';
          const roomObj = rooms.find(r => r.id === b.roomId);
          const roomName = roomObj ? roomObj.name : 'Musikschule';

          b.students.forEach(s => {
            if (s.isBreak || !s.assignedTime) return;
            const studentsToNotify = (s.isGroup && s.groupStudents && s.groupStudents.length > 0)
              ? s.groupStudents
              : [s];

            studentsToNotify.forEach((st: any) => {
              const cleanStudentId = isUUID(st.id) ? st.id : null;
              if (!cleanStudentId || notifiedStudentIds.has(cleanStudentId)) return;
              notifiedStudentIds.add(cleanStudentId);

              const timeLabel = s.assignedTime ? s.assignedTime.substring(0, 5) : '';
              const firstName = (st.first_name || 'Schüler').trim();
              const notifMsg = `Hallo ${firstName}, dein neuer Unterrichtstermin ist bestätigt: Jeden ${dayName} um ${timeLabel} Uhr bei ${teacherName} in ${roomName}.`;

              // Direct message
              studentNotificationPromises.push(
                supabase.from('campus_direct_messages').insert({
                  school_id: schoolId,
                  sender_id: cleanTeacherId,
                  recipient_id: cleanStudentId,
                  content: notifMsg,
                  is_system: true,
                  message_type: 'schedule_approved',
                  is_read: false
                })
              );

              // In-app notification (Glocke)
              studentNotificationPromises.push(
                supabase.from('notifications').insert({
                  user_id: cleanStudentId,
                  title: '✅ Neuer Unterrichtstermin',
                  message: notifMsg,
                  metadata: { type: 'schedule_approved', day_of_week: b.dayOfWeek, time_slot: timeLabel }
                })
              );

              // Push notification trigger
              studentNotificationPromises.push(
                supabase.functions.invoke('send-push', {
                  body: {
                    userId: cleanStudentId,
                    title: '✅ Neuer Unterrichtstermin',
                    body: notifMsg,
                    url: '/'
                  }
                }).catch(() => {})
              );
            });
          });
        });

        if (studentNotificationPromises.length > 0) {
          await Promise.allSettled(studentNotificationPromises);
        }
      } catch (notifErr) {
        console.warn('[ScheduleBoardDesktop] Student notification pipeline note:', notifErr);
      }

      // 🛡️ 3. Enterprise+ Revisionssicheres Audit-Logging (OWASP ASVS / DSGVO Art. 30)
      try {
        await logApplicationAudit({
          schoolId: schoolId || null,
          tableName: 'schedules',
          action: 'SCHEDULES_APPROVED',
          recordId: isUUID(cleanTeacherId) ? cleanTeacherId : null,
          details: {
            action_type: 'SCHEDULES_APPROVED',
            teacher_id: cleanTeacherId,
            teacher_name: teacherName,
            slots_count: slotsToInsert.length,
            approved_at: now.toISOString(),
            approved_by: userId || 'Schulleitung'
          }
        });
      } catch (auditErr) {
        console.warn('[ScheduleBoardDesktop] Audit logging notice:', auditErr);
      }

      setScheduleStatus('approved');
      setToast({ message: `Stundenplan für ${teacherName} erfolgreich genehmigt & live geschaltet!`, type: 'success' });
    } catch (err: any) {
      console.error('Error approving schedule:', err);
      await showAlert('Fehler beim Genehmigen: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectScheduleByAdmin = async () => {
    const teacherProfile = teachers.find(t => t.id === selectedTeacherId);
    const teacherName = teacherProfile ? `${teacherProfile.first_name} ${teacherProfile.last_name}` : 'Lehrkraft';

    const defaultMsg = 'Der Stundenplan wurde abgelehnt. Bitte setzen Sie sich mit dem Schulsekretariat in Verbindung.';
    const finalNote = rejectNoteInput.trim() || defaultMsg;

    try {
      setSubmitting(true);
      const now = new Date();
      const currentActiveId = activeDraftIdRef.current || activeDraftId;
      const cleanTeacherId = selectedTeacherId ? selectedTeacherId.replace(/^teacher-/i, '') : '';

      const updatedDrafts = drafts.map(d => {
        if (d.id === currentActiveId) {
          return { 
            ...d, 
            status: 'needs_revision', 
            rejectionNote: finalNote, 
            rejectedAt: now.toISOString() 
          };
        }
        return d;
      });
      setDrafts(updatedDrafts);
      draftsRef.current = updatedDrafts;

      const draftStateToSave = {
        activeDraftId: currentActiveId,
        submittedDraftId: currentActiveId,
        status: 'needs_revision',
        rejectionNote: finalNote,
        rejectedAt: now.toISOString(),
        drafts: updatedDrafts
      };

      await supabase
        .from('users')
        .update({
          planned_boards: draftStateToSave,
          campus_räume: draftStateToSave,
          groovelab_räume: draftStateToSave
        })
        .eq('id', cleanTeacherId);

      // Resolve pending submission alert
      await supabase
        .from('system_alerts')
        .update({ resolved: true })
        .eq('school_id', schoolId)
        .eq('teacher_id', cleanTeacherId)
        .in('type', ['Stundenplan Freigabe', 'schedule_submission']);

      // System Alert for Teacher
      await supabase.from('system_alerts').insert({
        school_id: schoolId,
        teacher_id: cleanTeacherId,
        type: 'Stundenplan Klärungsbedarf',
        message: `Stundenplan abgelehnt: ${finalNote}`
      });

      setScheduleStatus('needs_revision');
      setRejectionNote(finalNote);
      setShowRejectModal(false);
      setRejectNoteInput('');
      setToast({ message: `Stundenplan von ${teacherName} zur Überarbeitung zurückgegeben.`, type: 'warning' });
    } catch (err: any) {
      console.error('Error rejecting schedule:', err);
      await showAlert('Fehler beim Zurückgeben: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.tagName === 'SELECT' || 
        activeEl.getAttribute('contenteditable') === 'true'
      )) {
        return;
      }

      if (e.key === 'a' || e.key === 'A') {
        const canAutoAssign = students.filter(s => !s.assignedDay && !s.isBreak).length > 0;
        if (canAutoAssign) {
          e.preventDefault();
          handleAutoAssign();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        const canReset = students.filter(s => !!s.assignedDay).length > 0;
        if (canReset) {
          e.preventDefault();
          handleResetAllAssignments();
        }
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        const availableDays = DAYS_OF_WEEK.filter(d => !boards.some(b => b.dayOfWeek === d.value));
        if (availableDays.length > 0) {
          setNewBoardDay(availableDays[0].value);
          setShowAddBoardForm(true);
        } else {
          showAlert("Alle Wochentage wurden bereits hinzugefügt.");
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowAddBoardForm(false);
        setSelectedStudentId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [students, boards, handleAutoAssign, handleResetAllAssignments]);

  if (loading && activeTab === 'designer') {
    return (
      <div className="flex h-[400px] items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-500"></div>
          <span className="font-bold text-sm tracking-wider uppercase">Lade Stundenplaner...</span>
        </div>
      </div>
    );
  }
   // Filter students based on search and tab selections
  const filteredStudents = students.filter(s => {
    const isAssigned = !!s.assignedDay;
    if (sidebarTab === 'unassigned' && isAssigned) return false;
    if (sidebarTab === 'assigned' && !isAssigned) return false;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) || 
             (s.instrument || '').toLowerCase().includes(q);
    }
    return true;
  });

  const unassignedCount = students.filter(s => !s.assignedDay).length;
  const assignedCount = students.filter(s => !!s.assignedDay).length;
  const allCount = students.length;

  const showOnboardingOverlay = !isOnboardingCompleted && !isSecretaryWorkspace && (selectedTeacherId === userId);

  let onboardingOverlayContent = null;
  if (showOnboardingOverlay) {
    const timeOptions = [
      '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
      '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
      '22:00'
    ];

    onboardingOverlayContent = (
      <div style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
        borderRadius: '16px',
        padding: '16px 24px',
        maxWidth: '500px',
        margin: '12px auto',
        border: '1px solid #e2e8f0',
        boxShadow: '0 12px 36px rgba(0,0,0,0.06)',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}>
        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          <div style={{ height: '36px', width: '36px', background: '#e6f4ea', color: '#34a853', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px auto' }}>
            <Calendar size={18} />
          </div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em' }}>
            Persönliches Onboarding
          </h2>
          <p style={{ color: '#475569', fontSize: '0.78rem', lineHeight: '1.35', maxWidth: '440px', margin: '0 auto' }}>
            Bevor du den Stundenplan-Designer nutzen kannst, richte bitte deine Wunschtage und Unterrichtszeiten ein. Deine Schüler sehen beim Onboarding nur die hier ausgewählten Wochentage und Zeitfenster.
          </p>
        </div>

        {onboardingError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '8px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={14} />
            <span>{onboardingError}</span>
          </div>
        )}

        {/* Schnellwahl-Vorlagen & Quick-Actions Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px', background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Zap size={12} color="currentColor" />
              <span>1-Klick Schnell-Auswahl:</span>
            </span>
            {Object.values(onboardingAvailability).some(c => c.checked) && (
              <button
                type="button"
                onClick={() => setOnboardingAvailability({ 1:{checked:false,start:'',end:''}, 2:{checked:false,start:'',end:''}, 3:{checked:false,start:'',end:''}, 4:{checked:false,start:'',end:''}, 5:{checked:false,start:'',end:''}, 6:{checked:false,start:'',end:''}, 7:{checked:false,start:'',end:''} })}
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <RotateCcw size={11} color="currentColor" />
                <span>Alle abwählen</span>
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setOnboardingAvailability({
                  1: { checked: true, start: '13:00', end: '19:00' },
                  2: { checked: true, start: '13:00', end: '19:00' },
                  3: { checked: true, start: '13:00', end: '19:00' },
                  4: { checked: true, start: '13:00', end: '19:00' },
                  5: { checked: true, start: '13:00', end: '19:00' },
                  6: { checked: false, start: '', end: '' },
                  7: { checked: false, start: '', end: '' }
                });
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #bbf7d0',
                background: '#f0fdf4',
                color: '#15803d',
                fontWeight: 800,
                fontSize: '0.76rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s'
              }}
            >
              <Calendar size={13} color="currentColor" />
              <span>Mo – Fr (13:00 – 19:00)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOnboardingAvailability({
                  1: { checked: true, start: '14:00', end: '18:00' },
                  2: { checked: true, start: '14:00', end: '18:00' },
                  3: { checked: true, start: '14:00', end: '18:00' },
                  4: { checked: true, start: '14:00', end: '18:00' },
                  5: { checked: true, start: '14:00', end: '18:00' },
                  6: { checked: false, start: '', end: '' },
                  7: { checked: false, start: '', end: '' }
                });
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #e0f2fe',
                background: '#f0f9ff',
                color: '#0369a1',
                fontWeight: 800,
                fontSize: '0.76rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s'
              }}
            >
              <Clock size={13} color="currentColor" />
              <span>Nachmittag (14:00 – 18:00)</span>
            </button>

            {Object.values(onboardingAvailability).filter(c => c.checked).length >= 2 && (
              <button
                type="button"
                onClick={() => {
                  const firstActive = Object.values(onboardingAvailability).find(c => c.checked && c.start && c.end);
                  if (firstActive) {
                    setOnboardingAvailability(prev => {
                      const next = { ...prev };
                      Object.keys(next).forEach((key: any) => {
                        if (next[key].checked) {
                          next[key].start = firstActive.start;
                          next[key].end = firstActive.end;
                        }
                      });
                      return next;
                    });
                  }
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #fed7aa',
                  background: '#fff7ed',
                  color: '#c2410c',
                  fontWeight: 800,
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Überträgt die eingestellte Zeit des ersten Tages auf alle angehakten Tage"
              >
                <Clock size={12} color="currentColor" />
                <span>Zeiten auf alle übertragen</span>
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
          {DAYS_OF_WEEK.map(day => {
            const cfg = onboardingAvailability[day.value];
            return (
              <div key={day.value} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 12px',
                borderRadius: '8px',
                background: cfg.checked ? '#ffffff' : '#f8fafc',
                border: cfg.checked ? '1.5px solid #34a853' : '1px solid #e2e8f0',
                transition: 'all 0.2s',
                boxShadow: cfg.checked ? '0 2px 6px rgba(52, 168, 83, 0.05)' : 'none'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, color: '#1e293b', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={cfg.checked}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setOnboardingAvailability(prev => {
                        // Find standard default time from first active day or default to 13:00-19:00
                        const firstActive = Object.values(prev).find(c => c.checked && c.start && c.end);
                        const defaultStart = firstActive?.start || '13:00';
                        const defaultEnd = firstActive?.end || '19:00';
                        return {
                          ...prev,
                          [day.value]: {
                            checked: isChecked,
                            start: isChecked ? (prev[day.value].start && prev[day.value].start !== prev[day.value].end ? prev[day.value].start : defaultStart) : prev[day.value].start,
                            end: isChecked ? (prev[day.value].end && prev[day.value].start !== prev[day.value].end ? prev[day.value].end : defaultEnd) : prev[day.value].end
                          }
                        };
                      });
                    }}
                    style={{
                      accentColor: '#34a853',
                      width: '16px',
                      height: '16px',
                      cursor: 'pointer'
                    }}
                  />
                  <span>{day.name}</span>
                </label>

                {cfg.checked && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Von:</span>
                      <input
                        type="time"
                        value={cfg.start || '13:00'}
                        onChange={(e) => {
                          setOnboardingAvailability(prev => ({
                            ...prev,
                            [day.value]: { ...prev[day.value], start: e.target.value }
                          }));
                        }}
                        style={{
                          padding: '3px 6px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#1e293b',
                          background: '#ffffff',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Bis:</span>
                      <input
                        type="time"
                        value={cfg.end || '19:00'}
                        onChange={(e) => {
                          setOnboardingAvailability(prev => ({
                            ...prev,
                            [day.value]: { ...prev[day.value], end: e.target.value }
                          }));
                        }}
                        style={{
                          padding: '3px 6px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#1e293b',
                          background: '#ffffff',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleTeacherOnboardingSubmit}
          disabled={onboardingSubmitting}
          style={{
            width: '100%',
            padding: '10px 16px',
            borderRadius: '10px',
            border: 'none',
            background: '#34a853',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.88rem',
            cursor: onboardingSubmitting ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 4px 14px rgba(52, 168, 83, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
          onMouseOver={(e) => { if (!onboardingSubmitting) e.currentTarget.style.backgroundColor = '#2d9247'; }}
          onMouseOut={(e) => { if (!onboardingSubmitting) e.currentTarget.style.backgroundColor = '#34a853'; }}
        >
          {onboardingSubmitting ? 'Wird gespeichert...' : 'Verfügbarkeit speichern & Stundenplan freischalten'}
        </button>

        {/* Hinweis didaktisches Koordinierungsinstrument */}
        <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '0.70rem', color: '#64748b', lineHeight: '1.4', background: 'rgba(0,0,0,0.02)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.04)' }}>
          <strong>Hinweis:</strong> Der Stundenplan-Designer ist ein didaktisches Koordinierungsinstrument und ersetzt kein betriebliches Zeiterfassungssystem.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '100%', margin: '0', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
      <style>{`
        .apple-btn-group {
          background: rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(0, 0, 0, 0.04);
          border-radius: 11px;
          padding: 2.5px;
          display: flex;
          align-items: center;
          gap: 2px;
          backdrop-filter: blur(16px) saturate(180%);
          box-shadow: inset 0 0.5px 1px rgba(0, 0, 0, 0.04);
        }
        .apple-btn {
          background: transparent;
          border: 0.5px solid transparent;
          color: #3a3a3c;
          border-radius: 8px;
          padding: 5px 11px;
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: -0.01em;
          cursor: pointer;
          transition: all 0.16s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          align-items: center;
          gap: 6px;
          min-height: 28px;
          outline: none;
        }
        .apple-btn:hover {
          background: rgba(0, 0, 0, 0.035);
          color: #1d1d1f;
        }
        .apple-btn:active {
          transform: scale(0.965);
        }
        .apple-btn.active {
          background: #ffffff;
          color: #1d1d1f;
          border-color: rgba(0, 0, 0, 0.04);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(0, 0, 0, 0.04);
          font-weight: 700;
        }
        .apple-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
          pointer-events: none;
        }
        @keyframes pulse-glowing-line {
          0% { opacity: 0.6; }
          100% { opacity: 1; }
        }
        @keyframes conflictPulse {
          0% { border-color: rgba(239, 68, 68, 0.4); box-shadow: 0 0 0 0px rgba(239, 68, 68, 0.2); }
          50% { border-color: rgba(239, 68, 68, 0.9); box-shadow: 0 0 0 5px rgba(239, 68, 68, 0.15); }
          100% { border-color: rgba(239, 68, 68, 0.4); box-shadow: 0 0 0 0px rgba(239, 68, 68, 0.2); }
        }
        .conflict-pulse-card {
          animation: conflictPulse 2s infinite ease-in-out !important;
        }
        .designer-student-card {
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .designer-student-card:hover {
          transform: translateY(-1.5px) scale(1.015) !important;
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.05) !important;
          z-index: 5 !important;
        }
      `}</style>
      
      {activeTab === 'calendar' ? (
        <ScheduleCalendarView 
          schoolId={schoolId} 
          userId={selectedTeacherId} 
          boards={(() => {
            // Das Stundenplan-Board bezieht sich immer 1:1 wasserdicht auf die eingereichten/genehmigten Termine des Stundenplan-Designers:
            const targetDraft = 
              (submittedDraftId && drafts.find(d => d.id === submittedDraftId)) ||
              drafts.find(d => (d as any).status === 'approved') ||
              drafts.find(d => (d as any).status === 'ready_for_admin_review') ||
              drafts.find(d => d.id === activeDraftId) ||
              drafts[0];
            const candidateBoards = targetDraft?.boards;
            if (candidateBoards && candidateBoards.some(b => (b.students || []).length > 0)) {
              return candidateBoards;
            }
            if (boards && boards.some(b => (b.students || []).length > 0)) {
              return boards;
            }
            return candidateBoards || boards || [];
          })()} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          teachers={teachers}
          selectedTeacherId={selectedTeacherId}
          setSelectedTeacherId={setSelectedTeacherId}
          currentUserRole={currentUserRole}
          hasSubmittedSchedule={hasSubmittedSchedule}
          scheduleStatus={scheduleStatus}
          onStartTour={() => {
            startCalendarTour();
          }}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
          {/* Header Panel — sticky on iPad / desktop */}
          <div style={{ 
            position: 'sticky',
            top: '10px',
            zIndex: 50,
            background: 'rgba(255, 255, 255, 0.75)', 
            backdropFilter: 'blur(30px) saturate(210%)', 
            WebkitBackdropFilter: 'blur(30px) saturate(210%)',
            borderRadius: '16px', 
            padding: '12px 16px', 
            border: '1px solid rgba(255, 255, 255, 0.6)', 
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.04)', 
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>

            {/* ── ROW 1: Title | Tabs+Tour+Raster | Spacer ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', width: '100%', gap: '10px' }}>
              {/* Left: Titel */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ height: '32px', width: '32px', borderRadius: '8px', background: 'rgba(52, 168, 83, 0.12)', color: '#34a853', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Calendar size={16} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1d1d1f', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                    Stundenplan-Designer
                  </h2>
                </div>
                {boards.some(b => b.students.some(s => !s.isBreak && s.assignedTime)) && (() => {
                  const { totalGapsMin, gapCount, totalAssigned, wunschHits, studentsWithWunsch } = calculateLiveBoardGaps(boards);
                  const unassignedCount = students.filter(s => !s.isBreak && !s.assignedTime).length;
                  const totalStudentsCount = unassignedCount + totalAssigned;
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        const assignmentPct = totalStudentsCount > 0 ? (totalAssigned / totalStudentsCount) * 50 : 50;
                        const wunschRatio = studentsWithWunsch > 0 ? (wunschHits / studentsWithWunsch) : 1;
                        const wunschPct = wunschRatio * 35;
                        const gapBonus = gapCount === 0 ? 15 : Math.max(0, 15 - gapCount * 5);
                        const overallScore = Math.min(100, Math.round(assignmentPct + wunschPct + gapBonus));

                        setAutoScheduleReportData({
                          totalAssigned,
                          totalStudents: totalStudentsCount,
                          totalGapsMin,
                          gapCount,
                          wunschHits,
                          studentsWithWunsch,
                          siblingHits: 0,
                          totalSiblings: 0,
                          overallScore
                        });
                        setShowAutoScheduleReportModal(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '5px 12px',
                        borderRadius: '20px',
                        background: (totalGapsMin === 0 && unassignedCount === 0) ? '#f0fdf4' : '#fffbeb',
                        border: `1px solid ${(totalGapsMin === 0 && unassignedCount === 0) ? '#bbf7d0' : '#fde68a'}`,
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        color: (totalGapsMin === 0 && unassignedCount === 0) ? '#15803d' : '#b45309',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.15s',
                        marginLeft: '8px'
                      }}
                      className="hover-scale-mini"
                      title="Klicken, um die Auswertung & Erfolgsanalyse erneut zu öffnen"
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {unassignedCount > 0 ? (
                          <AlertCircle size={13} color="#d97706" />
                        ) : (
                          <CheckCircle size={13} color="#34a853" />
                        )}
                        <span>
                          {unassignedCount > 0 
                            ? `${totalAssigned}/${totalStudentsCount} Schüler eingeteilt (${unassignedCount} offen)` 
                            : `${totalAssigned} Schüler eingeteilt`}
                        </span>
                      </span>
                      <span style={{ color: '#cbd5e1' }}>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Zap size={12} color={(totalGapsMin === 0 && unassignedCount === 0) ? "#16a34a" : "#d97706"} />
                        <span>{gapCount === 0 ? '0 Min Lücken (Lückenlos)' : `${totalGapsMin} Min ${gapCount === 1 ? 'Lücke' : 'Lücken'}`}</span>
                      </span>
                      <Sparkles size={12} style={{ marginLeft: '2px', opacity: 0.8 }} />
                    </button>
                  );
                })()}
              </div>

              {/* Center: Tab-Switcher + Tour */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div id="tour-calendar-switch" className="app-segmented-switch" style={{ margin: 0, padding: '3px', gap: '4px', minHeight: '36px', display: 'flex', alignItems: 'center' }}>
                  <button 
                    type="button"
                    onClick={() => setActiveTab('calendar')}
                    className={`app-segmented-switch-btn ${(activeTab as string) === 'calendar' ? 'active' : ''}`}
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.78rem',
                      lineHeight: '1.2',
                      opacity: 1,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                    title="Wöchentlicher freigegebener Stundenplan"
                  >
                    <Calendar size={12} style={{ opacity: 0.9 }} />
                    <span>Stundenplan</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setActiveTab('designer')}
                    className={`app-segmented-switch-btn ${(activeTab as string) === 'designer' ? 'active' : ''}`}
                    style={{ 
                      padding: '6px 12px', 
                      fontSize: '0.78rem', 
                      lineHeight: '1.2',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                    title="Stundenplan-Designer (Planung & Zuteilung)"
                  >
                    <Sliders size={12} style={{ opacity: 0.9 }} />
                    <span>Stundenplan-Designer</span>
                  </button>
                </div>
                {!isSecretaryWorkspace && (
                  <TourStartButton onClick={startDesignerTour} platformTheme={localStorage.getItem('groovelab_active_platform') === 'campus' ? 'campus' : 'groovelab'} />
                )}
              </div>

              {/* Right: Didactic Purpose & Secretariat Approval Disclaimer Badge */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', minWidth: 0 }}>
                <div 
                  title="Didaktische Terminplanung • Unverbindlicher Entwurf zur Raumprüfung & Freigabe durch Musikschule"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(255, 255, 255, 0.85)',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    borderRadius: '100px',
                    padding: '4px 12px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                    fontSize: '0.70rem',
                    fontWeight: 700,
                    color: '#475569',
                    letterSpacing: '0.01em',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    maxWidth: '100%'
                  }}
                >
                  <Info size={12} color="currentColor" style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Didaktische Terminplanung • Unverbindlicher Entwurf zur Raumprüfung & Freigabe durch Musikschule
                  </span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(0, 0, 0, 0.06)', margin: '0 -4px' }} />

            {/* ── ROW 2: Teacher-Filter | Apple-Btn-Group | Status + Senden ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '10px' }}>

              {/* Left: Lehrkraft-Filter & Apple Raster Capsule */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.03)', padding: '3px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.04)', minHeight: '36px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                    {isSecretaryWorkspace ? 'Stundenplan-Designer (Verwaltung)' : 'Dein Designer'}
                  </span>
                </div>

                {/* 🧲 Apple Raster Selector Capsule */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', padding: '3px 10px', minHeight: '36px', boxSizing: 'border-box', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }} title="Magnetisches Rastersystem für Unterrichtszeiten">
                  <Grid3X3 size={13} style={{ color: brandColor }} />
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'Urbanist, sans-serif' }}>Raster:</span>
                  <select
                    value={gridSnapMinutes}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setGridSnapMinutes(val);
                      localStorage.setItem('groovelab_grid_snap_minutes', String(val));
                    }}
                    style={{ border: 'none', fontSize: '0.78rem', fontWeight: 800, color: '#1d1d1f', background: 'transparent', outline: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <option value={15}>15 Min</option>
                    <option value={30}>30 Min</option>
                    <option value={60}>60 Min</option>
                  </select>
                </div>

                {/* 🟢 Mini-Legende Wunsch vs Ausweich (D3) */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', padding: '3px 10px', minHeight: '36px', boxSizing: 'border-box' }} title="Farb-Semantik im Designer: Grün = Wunschtermin erfüllt • Weiß = Ausweichtermin">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.70rem', fontWeight: 700, color: '#15803d' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 4px rgba(34,197,94,0.4)' }} />
                    ★ Wunsch
                  </span>
                  <span style={{ color: '#cbd5e1' }}>•</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.70rem', fontWeight: 700, color: '#64748b' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffffff', border: '1.5px solid #cbd5e1', display: 'inline-block' }} />
                    ○ Ausweich
                  </span>
                </div>
              </div>

              {/* Center: Apple-Button-Group */}
              <div className="apple-btn-group">

                {/* Namen / Datenschutz Toggle */}
                <button
                  type="button"
                  onClick={() => toggleRealNames()}
                  className={`apple-btn ${showRealNames ? 'active' : ''}`}
                  style={{ color: showRealNames ? brandColor : undefined }}
                  title={showRealNames ? "Namen sind geschützt (Nachnamen gekürzt) – klicken zum Anzeigen" : "Vollständige Namen werden angezeigt – klicken zum Schützen"}
                >
                  {showRealNames ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showRealNames ? "Namen schützen" : "Namen anzeigen"}</span>
                </button>

                <div style={{ width: '1px', height: '16px', background: 'rgba(0,0,0,0.1)', margin: '0 4px' }} />

                {!isSecretaryWorkspace && selectedTeacherId === userId ? (
                  <button type="button" onClick={handleEditTeacherAvailability} className="apple-btn" title="Unterrichtszeiten & Wunschtage ändern">
                    <Clock size={13} />
                    <span>Zeiten ändern</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const availableDays = DAYS_OF_WEEK.filter(d => !boards.some(b => b.dayOfWeek === d.value));
                      if (availableDays.length === 0) { showAlert("Alle Wochentage wurden bereits hinzugefügt."); return; }
                      setNewBoardDay(availableDays[0].value);
                      setShowAddBoardForm(true);
                    }}
                    className="apple-btn" title="Tag anlegen"
                  >
                    <Plus size={13} />
                    <span>Tag anlegen</span>
                  </button>
                )}

                <div style={{ width: '1px', height: '16px', background: 'rgba(0,0,0,0.1)', margin: '0 4px' }} />

                {/* Options-Dropdown (Mehr) */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setShowMoreMenu(prev => !prev)}
                    className={`apple-btn ${showMoreMenu ? 'active' : ''}`}
                    title="Weitere Optionen & Aktionen"
                  >
                    <MoreVertical size={13} />
                    <span>Mehr</span>
                  </button>

                  {showMoreMenu && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      right: 0,
                      background: 'rgba(255, 255, 255, 0.96)',
                      backdropFilter: 'blur(20px) saturate(190%)',
                      border: '1px solid rgba(0,0,0,0.1)',
                      borderRadius: '12px',
                      padding: '6px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      zIndex: 1000,
                      minWidth: '220px'
                    }}>
                      <button
                        type="button"
                        onClick={async () => {
                          setShowMoreMenu(false);
                          const inviteLink = getParentOnboardingUrl(schoolProfile?.name || 'Stadtmusikschule', schoolProfile?.subdomain);
                          await navigator.clipboard.writeText(inviteLink);
                          await showAlert("Allgemeiner Schüler-Onboarding-Link kopiert! Sende diesen Link an deine Schüler: " + inviteLink);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          border: 'none',
                          background: 'transparent',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: '#1d1d1f',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <Send size={13} />
                        <span>Onboarding-Link kopieren</span>
                      </button>

                      <label
                        htmlFor="pdf-upload"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: '#1d1d1f',
                          cursor: 'pointer',
                          margin: 0
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                        onClick={() => setShowMoreMenu(false)}
                      >
                        <Upload size={13} />
                        <span>PDF-Backup wiederherstellen</span>
                      </label>

                      <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', margin: '4px 0' }} />

                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          handleHardResetSystem();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          border: 'none',
                          background: 'rgba(239, 68, 68, 0.08)',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: '#ef4444',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                      >
                        <Trash2 size={13} />
                        <span>System-Reset</span>
                      </button>
                    </div>
                  )}
                </div>
                <input id="pdf-upload" type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleRestoreFromPDF} />
              </div>

              {/* Right: Status + Senden (Rollen-spezifisch) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isSecretaryWorkspace ? (
                  <>
                    {/* Status-Pill für Admin/Sekretariat */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      background: scheduleStatus === 'approved' 
                        ? 'rgba(230, 244, 234, 0.95)' 
                        : (scheduleStatus === 'needs_revision' ? '#fef2f2' : 'rgba(254, 243, 199, 0.95)'), 
                      border: `1.5px solid ${scheduleStatus === 'approved' ? '#34a853' : (scheduleStatus === 'needs_revision' ? '#ef4444' : '#f59e0b')}`, 
                      color: scheduleStatus === 'approved' ? '#064e3b' : (scheduleStatus === 'needs_revision' ? '#991b1b' : '#78350f'), 
                      padding: '6px 14px', 
                      borderRadius: '10px', 
                      fontSize: '0.76rem', 
                      fontWeight: 800, 
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)' 
                    }}>
                      {scheduleStatus === 'approved' ? (
                        <CheckCircle size={13} strokeWidth={2.5} style={{ color: 'currentColor', flexShrink: 0 }} />
                      ) : scheduleStatus === 'needs_revision' ? (
                        <AlertCircle size={13} strokeWidth={2.5} style={{ color: 'currentColor', flexShrink: 0 }} />
                      ) : (
                        <Clock size={13} strokeWidth={2.5} style={{ color: 'currentColor', flexShrink: 0 }} />
                      )}
                      <span>
                        {scheduleStatus === 'approved' 
                          ? 'Genehmigt & Live' 
                          : (scheduleStatus === 'needs_revision' ? 'Klärungsbedarf' : 'In Prüfung')}
                      </span>
                      {lastSubmittedTime && <span style={{ opacity: 0.85, fontWeight: 600 }}>({lastSubmittedTime})</span>}
                    </div>

                    {/* Button 1: Genehmigen & Live schalten */}
                    <button
                      type="button"
                      onClick={handleApproveScheduleByAdmin}
                      disabled={submitting || boards.length === 0}
                      style={{
                        background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                        color: 'white', border: 'none', fontWeight: 800, padding: '7px 16px',
                        borderRadius: '11px', fontSize: '0.8rem', letterSpacing: '-0.01em', minHeight: '32px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px',
                        boxShadow: '0 2px 8px rgba(22,163,74,0.3)',
                        transition: 'all 0.16s ease'
                      }}
                      onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                      onMouseOut={e => e.currentTarget.style.transform = 'none'}
                    >
                      <CheckCircle size={13} strokeWidth={2.5} />
                      <span>{scheduleStatus === 'approved' ? 'Freigabe aktualisieren' : 'Stundenplan genehmigen & Live schalten'}</span>
                    </button>

                    {/* Button 2: Ablehnen / Klärungsbedarf */}
                    <button
                      type="button"
                      onClick={() => {
                        setRejectNoteInput('');
                        setShowRejectModal(true);
                      }}
                      disabled={submitting}
                      style={{
                        background: '#ffffff',
                        color: '#b91c1c',
                        border: '1.5px solid #fca5a5',
                        fontWeight: 700,
                        padding: '7px 14px',
                        borderRadius: '11px',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = '#fef2f2'}
                      onMouseOut={e => e.currentTarget.style.background = '#ffffff'}
                    >
                      <AlertCircle size={13} strokeWidth={2.5} />
                      <span>Ablehnen (Klärungsbedarf)</span>
                    </button>
                  </>
                ) : (
                  <>
                    {/* Lehrkraft-Ansicht */}
                    {scheduleStatus === 'needs_revision' ? (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        background: '#fef2f2', 
                        border: '1.5px solid #ef4444', 
                        color: '#991b1b', 
                        padding: '6px 14px', 
                        borderRadius: '10px', 
                        fontSize: '0.76rem', 
                        fontWeight: 800, 
                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)' 
                      }}>
                        <AlertCircle size={13} strokeWidth={2.5} style={{ color: '#ef4444', flexShrink: 0 }} />
                        <span>Abgelehnt – Bitte im Sekretariat melden</span>
                      </div>
                    ) : lastSubmittedTime && !hasUnsubmittedEdits ? (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        background: scheduleStatus === 'approved' ? 'rgba(230, 244, 234, 0.95)' : 'rgba(254, 243, 199, 0.95)', 
                        border: `1.5px solid ${scheduleStatus === 'approved' ? '#34a853' : '#f59e0b'}`, 
                        color: scheduleStatus === 'approved' ? '#064e3b' : '#78350f', 
                        padding: '6px 14px', 
                        borderRadius: '10px', 
                        fontSize: '0.76rem', 
                        fontWeight: 800, 
                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)' 
                      }}>
                        {scheduleStatus === 'approved' ? (
                          <CheckCircle size={13} strokeWidth={2.5} style={{ color: 'currentColor', flexShrink: 0 }} />
                        ) : (
                          <Clock size={13} strokeWidth={2.5} style={{ color: 'currentColor', flexShrink: 0 }} />
                        )}
                        <span>{scheduleStatus === 'approved' ? 'Genehmigt & Live' : 'In Prüfung durch Schulsekretariat'}</span>
                        <span style={{ opacity: 0.85, fontWeight: 600 }}>({lastSubmittedTime})</span>
                      </div>
                    ) : null}

                    {(!hasSubmittedSchedule || hasUnsubmittedEdits || scheduleStatus === 'needs_revision') && (
                      <button
                        id="tour-submit-section"
                        type="button"
                        onClick={handleLockAndSend}
                        disabled={submitting || boards.length === 0}
                        style={{
                          background: (hasUnsubmittedEdits || scheduleStatus === 'needs_revision')
                            ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                            : (isCampus 
                              ? 'linear-gradient(135deg, #34a853 0%, #2e7d32 100%)'
                              : (isGroovelab 
                                ? 'linear-gradient(135deg, #eab308 0%, #d97706 100%)' 
                                : 'linear-gradient(135deg, #ea4335 0%, #c62828 100%)')),
                          color: 'white', border: 'none', fontWeight: 800, padding: '7px 16px',
                          borderRadius: '11px', fontSize: '0.8rem', letterSpacing: '-0.01em', minHeight: '32px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '6px',
                          opacity: (submitting || boards.length === 0) ? 0.5 : 1,
                          pointerEvents: (submitting || boards.length === 0) ? 'none' : 'auto',
                          boxShadow: `0 2px 8px ${(hasUnsubmittedEdits || scheduleStatus === 'needs_revision') ? '#d97706' : brandColor}35, inset 0 1px 0 rgba(255,255,255,0.25)`,
                          transition: 'all 0.16s cubic-bezier(0.16, 1, 0.3, 1)', outline: 'none'
                        }}
                        onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                        onMouseOut={e => e.currentTarget.style.transform = 'none'}
                      >
                        <Send size={13} />
                        <span>
                          {submitting 
                            ? 'Wird übermittelt...' 
                            : ((hasUnsubmittedEdits || scheduleStatus === 'needs_revision')
                              ? 'Änderungen erneut zur Freigabe einreichen' 
                              : 'Stundenplan zur Freigabe einreichen')}
                        </span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>


          {onboardingOverlayContent ? (
            onboardingOverlayContent
          ) : showCelebration ? (
        <div className="animation-slide-up" style={{ background: 'rgba(255, 255, 255, 0.65)', backdropFilter: 'blur(30px) saturate(190%)', WebkitBackdropFilter: 'blur(30px) saturate(190%)', borderRadius: '28px', padding: '40px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.5)', boxShadow: '0 20px 50px rgba(0,0,0,0.04)', maxWidth: '480px', margin: '40px auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div style={{ height: '72px', width: '72px', background: 'rgba(52, 168, 83, 0.15)', border: '1px solid rgba(52, 168, 83, 0.25)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34a853' }}>
            <CheckCircle size={36} strokeWidth={2.5} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1d1d1f', margin: 0, letterSpacing: '-0.02em' }}>Terminvorschlag übermittelt!</h3>
            <p style={{ color: '#86868b', fontSize: '0.85rem', fontWeight: 500, marginTop: '8px', lineHeight: 1.4 }}>
              Dein pädagogischer Stundenplan-Vorschlag wurde sicher gespeichert und zur einvernehmlichen Freigabe an die Schulleitung übermittelt. Eltern erhalten nach Freigabe automatisch die Terminbestätigung.
            </p>
          </div>
          <button
            onClick={() => {
              setShowCelebration(false);
              loadInitialData();
            }}
            style={{ background: 'linear-gradient(135deg, #eab308 0%, #d97706 100%)', color: 'white', border: 'none', fontWeight: 700, padding: '12px 28px', borderRadius: '14px', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 8px 20px rgba(234, 179, 8, 0.2)' }}
          >
            Zurück zur Ansicht
          </button>
        </div>
          ) : (
            <>
          {/* Apple HIG Goldstandard Draft Management Toolbar */}
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.75)', 
            backdropFilter: 'blur(20px) saturate(190%)', 
            WebkitBackdropFilter: 'blur(20px) saturate(190%)',
            borderRadius: '16px', 
            padding: '8px 16px', 
            border: '1px solid rgba(255, 255, 255, 0.8)', 
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.03)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: '16px',
            marginTop: '-4px',
            flexWrap: 'nowrap'
          }}>
            {/* Left: Apple Segmented Control for Drafts + Integrated Add Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexShrink: 1 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'Urbanist, sans-serif', flexShrink: 0 }}>
                Entwürfe:
              </span>
              <div style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                background: 'rgba(0, 0, 0, 0.04)', 
                borderRadius: '10px', 
                padding: '2px', 
                border: '1px solid rgba(0, 0, 0, 0.05)',
                gap: '2px',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                maxWidth: '100%'
              }}>
                {drafts.map(d => {
                  const isActive = d.id === activeDraftId;
                  const totalLessons = d.boards?.reduce((acc, b) => acc + (b.students?.length || 0), 0) || 0;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => handleSwitchDraft(d.id)}
                      style={{
                        background: isActive ? '#ffffff' : 'transparent',
                        color: isActive ? '#0f172a' : '#64748b',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '5px 10px',
                        fontSize: '0.75rem',
                        fontWeight: isActive ? 800 : 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: isActive ? '0 1px 4px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.1)' : 'none',
                        transition: 'all 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                      onMouseOver={e => {
                        if (!isActive) {
                          e.currentTarget.style.color = '#0f172a';
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)';
                        }
                      }}
                      onMouseOut={e => {
                        if (!isActive) {
                          e.currentTarget.style.color = '#64748b';
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <span>{d.name}</span>
                      {d.id === submittedDraftId && (
                        <span 
                          title="Eingereichter Entwurf"
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: '#22c55e',
                            display: 'inline-block',
                            boxShadow: '0 0 4px rgba(34, 197, 94, 0.5)',
                            flexShrink: 0
                          }}
                        />
                      )}
                      <span style={{
                        background: isActive ? 'rgba(0, 0, 0, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                        borderRadius: '6px',
                        padding: '1px 5px',
                        fontSize: '0.64rem',
                        fontWeight: 700,
                        color: isActive ? '#0f172a' : '#94a3b8',
                        flexShrink: 0
                      }}>
                        {totalLessons}
                      </span>
                    </button>
                  );
                })}
                {/* Adjacent Apple "+" Icon Button */}
                <button
                  type="button"
                  onClick={() => handleCreateDraft()}
                  title="Neuen leeren Entwurf anlegen"
                  aria-label="Neuen leeren Entwurf anlegen"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '5px 8px',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.16s ease',
                    flexShrink: 0
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.65)';
                    e.currentTarget.style.color = '#0f172a';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#64748b';
                  }}
                >
                  <Plus size={14} strokeWidth={2.4} />
                </button>
              </div>
            </div>

            {/* Right: Flagship Action (Hero) + Apple Toolbar Group */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              {/* 🌟 HERO FLAGGSCHIFF: Automatisch zuteilen */}
              <button
                type="button"
                onClick={handleAutoAssign}
                disabled={students.filter(s => !s.assignedDay && !s.isBreak).length === 0}
                title="Flaggschiff-Algorithmus: Universitäre 4-Phasen-Auto-Zuteilung starten"
                style={{
                  background: students.filter(s => !s.assignedDay && !s.isBreak).length === 0
                    ? 'rgba(0, 0, 0, 0.04)'
                    : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  color: students.filter(s => !s.assignedDay && !s.isBreak).length === 0 ? '#94a3b8' : '#ffffff',
                  border: students.filter(s => !s.assignedDay && !s.isBreak).length === 0 ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(22, 163, 74, 0.4)',
                  fontWeight: 800,
                  padding: '7px 16px',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  cursor: students.filter(s => !s.assignedDay && !s.isBreak).length === 0 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  boxShadow: students.filter(s => !s.assignedDay && !s.isBreak).length === 0
                    ? 'none'
                    : '0 4px 14px rgba(22, 163, 74, 0.32), 0 1px 3px rgba(0, 0, 0, 0.08)',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  letterSpacing: '-0.01em',
                  pointerEvents: students.filter(s => !s.assignedDay && !s.isBreak).length === 0 ? 'none' : 'auto'
                }}
                onMouseOver={e => {
                  if (students.filter(s => !s.assignedDay && !s.isBreak).length > 0) {
                    e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 6px 18px rgba(22, 163, 74, 0.42), 0 2px 5px rgba(0, 0, 0, 0.1)';
                  }
                }}
                onMouseOut={e => {
                  if (students.filter(s => !s.assignedDay && !s.isBreak).length > 0) {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(22, 163, 74, 0.32), 0 1px 3px rgba(0, 0, 0, 0.08)';
                  }
                }}
              >
                <Sparkles size={14} color="currentColor" strokeWidth={2.4} />
                <span>Automatisch zuteilen</span>
              </button>

              {/* 🛠️ Apple HIG Button Group (Rückgängig | Zurücksetzen | Löschen) */}
              <div className="apple-btn-group" style={{ height: '36px' }}>
                {/* Rückgängig */}
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  className="apple-btn"
                  style={{
                    opacity: undoStack.length > 0 ? 1 : 0.45,
                    cursor: undoStack.length > 0 ? 'pointer' : 'not-allowed',
                    color: undoStack.length > 0 ? '#0f172a' : '#94a3b8',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    padding: '0 10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title={undoStack.length > 0 ? `Letzte Verschiebung rückgängig machen (⌘Z) – ${undoStack.length} im Speicher` : "Keine Änderungen zum Rückgängig machen"}
                >
                  <RotateCcw size={12} strokeWidth={2.4} />
                  <span>Rückgängig{undoStack.length > 0 ? ` (${undoStack.length})` : ''}</span>
                </button>

                <div style={{ width: '1px', height: '16px', background: 'rgba(0,0,0,0.08)', margin: '0 2px' }} />

                {/* Zuteilung zurücksetzen */}
                <button
                  type="button"
                  onClick={handleResetAllAssignments}
                  disabled={students.filter(s => !!s.assignedDay).length === 0}
                  className="apple-btn"
                  style={{
                    opacity: students.filter(s => !!s.assignedDay).length === 0 ? 0.4 : 1,
                    cursor: students.filter(s => !!s.assignedDay).length === 0 ? 'not-allowed' : 'pointer',
                    color: '#64748b',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    padding: '0 10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={e => {
                    if (students.filter(s => !!s.assignedDay).length > 0) {
                      e.currentTarget.style.color = '#dc2626';
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                    }
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.color = '#64748b';
                    e.currentTarget.style.background = 'transparent';
                  }}
                  title="Zuteilung aller Schüler in diesem Entwurf zurücksetzen"
                >
                  <RotateCcw size={12} strokeWidth={2.4} />
                  <span>Zurücksetzen</span>
                </button>

                <div style={{ width: '1px', height: '16px', background: 'rgba(0,0,0,0.08)', margin: '0 2px' }} />

                {/* Entwurf löschen */}
                <button
                  type="button"
                  onClick={() => handleDeleteDraft(activeDraftId)}
                  disabled={drafts.length <= 1}
                  className="apple-btn"
                  style={{
                    opacity: drafts.length <= 1 ? 0.35 : 1,
                    cursor: drafts.length <= 1 ? 'not-allowed' : 'pointer',
                    color: '#64748b',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    padding: '0 10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={e => {
                    if (drafts.length > 1) {
                      e.currentTarget.style.color = '#dc2626';
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                    }
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.color = '#64748b';
                    e.currentTarget.style.background = 'transparent';
                  }}
                  title={drafts.length <= 1 ? "Der letzte verbleibende Entwurf kann nicht gelöscht werden" : "Diesen Entwurf löschen"}
                >
                  <Trash2 size={12} strokeWidth={2.4} />
                  <span>Löschen</span>
                </button>
              </div>
            </div>
          </div>

          {/* Teacher Review Pending Banner (ready_for_admin_review / pending) */}
          {scheduleStatus === 'pending' && (
            <div className="animation-slide-down" style={{
              background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
              border: '1.5px solid #f59e0b',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '0.82rem',
              color: '#78350f',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '8px',
              boxShadow: '0 2px 10px rgba(245, 158, 11, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={18} color="#d97706" style={{ flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontWeight: 800, color: '#92400e' }}>
                    Stundenplan zur Freigabe eingereicht {lastSubmittedTime ? `(${lastSubmittedTime})` : ''} · In Prüfung beim Schulsekretariat
                  </span>
                  <span style={{ fontSize: '0.76rem', color: '#b45309', fontWeight: 500 }}>
                    Das Schulsekretariat prüft aktuell die Raumverteilung. Sobald die Freigabe erteilt ist, wird der Plan automatisch als Live-Plan aktiv.
                  </span>
                </div>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid #fde68a',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#92400e',
                whiteSpace: 'nowrap'
              }}>
                <Lock size={12} color="#d97706" />
                <span>Schreibschutz aktiv</span>
              </div>
            </div>
          )}

          {/* Teacher Revision Banner (needs_revision) */}
          {scheduleStatus === 'needs_revision' && (
            <div className="animation-slide-down" style={{
              background: '#fef2f2',
              border: '1.5px solid #f87171',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '0.82rem',
              color: '#991b1b',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '8px',
              boxShadow: '0 2px 10px rgba(239, 68, 68, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontWeight: 800, color: '#991b1b' }}>
                    Der Stundenplan wurde abgelehnt. Bitte setzen Sie sich mit dem Schulsekretariat in Verbindung.
                  </span>
                  {rejectionNote && (
                    <span style={{ fontSize: '0.76rem', color: '#b91c1c', fontWeight: 500 }}>
                      Begründung des Sekretariats: „{rejectionNote}“
                    </span>
                  )}
                </div>
              </div>
              <span style={{
                fontSize: '0.72rem',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#dc2626',
                padding: '4px 10px',
                borderRadius: '6px',
                fontWeight: 700,
                flexShrink: 0
              }}>
                Klärungsbedarf
              </span>
            </div>
          )}

          {/* Unsubmitted edits warning banner */}
          {hasUnsubmittedEdits && (
            <div className="animation-slide-down" style={{
              background: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '12px',
              padding: '10px 14px',
              fontSize: '0.78rem',
              color: '#92400e',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              marginBottom: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={15} color="#d97706" style={{ flexShrink: 0 }} />
                <span>Du hast den Stundenplan angepasst. Klicke auf <strong>"Stundenplan zur Freigabe einreichen"</strong>, um deinen Terminvorschlag an das Schulsekretariat zu übermitteln.</span>
              </div>
            </div>
          )}

          {/* Unassigned students warning banner */}
          {(() => {
            const currentUnassigned = students.filter(s => !s.isBreak && !s.assignedDay);
            if (currentUnassigned.length === 0) return null;
            return (
              <div className="animation-slide-down" style={{
                background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.95) 0%, rgba(253, 230, 138, 0.7) 100%)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1.5px solid rgba(245, 158, 11, 0.5)',
                borderRadius: '12px',
                padding: '10px 14px',
                fontSize: '0.78rem',
                color: '#92400e',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                marginBottom: '6px',
                boxShadow: '0 2px 10px rgba(245, 158, 11, 0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} color="#d97706" style={{ flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <span style={{ fontWeight: 800, color: '#78350f' }}>
                      {currentUnassigned.length === 1
                        ? `Achtung: Es ist noch 1 Schüler nicht auf deine Unterrichtstage eingeteilt!`
                        : `Achtung: Es sind noch ${currentUnassigned.length} Schüler nicht auf deine Unterrichtstage eingeteilt!`}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: 500 }}>
                      Du kannst den Stundenplan trotzdem einreichen. Nicht eingeteilte Schüler verbleiben sicher in deinem Schüler-Pool.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSidebarTab('unassigned')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: 'white',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    padding: '5px 12px',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#92400e',
                    cursor: 'pointer',
                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s'
                  }}
                  onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'none'}
                >
                  <span>Offene Schüler im Pool ({currentUnassigned.length})</span>
                  <span>➔</span>
                </button>
              </div>
            );
          })()}

          {/* Apple Pro Tip Showcase Callout */}
          {showTipBanner && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(22, 163, 74, 0.2)',
              borderLeft: '4px solid #16a34a',
              borderRadius: '14px',
              padding: '8px 14px',
              fontSize: '0.77rem',
              color: '#334155',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '6px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '7px',
                  background: 'rgba(22, 163, 74, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: '#16a34a'
                }}>
                  <Sparkles size={13} strokeWidth={2.2} />
                </div>
                <span style={{ lineHeight: 1.45 }}>
                  Nutze <strong style={{ color: '#15803d', fontWeight: 800 }}>Automatisch zuteilen</strong> für die universitäre 4-Phasen-Zuteilung (18 Optimierungsstufen) oder ziehe Schüler per Drag &amp; Drop flexibel in deine Unterrichtstage. <strong style={{ color: '#0f172a' }}>Tipp: Karten rasten magnetisch im {gridSnapMinutes || 15}-Min-Raster ein und verdrängen nachfolgende Termine automatisch.</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowTipBanner(false);
                  try { localStorage.setItem('groovelab_hide_designer_tip', 'true'); } catch (_) {}
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '6px',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={e => { e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'; }}
                onMouseOut={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }}
                title="Hinweis ausblenden"
                aria-label="Hinweis ausblenden"
              >
                <X size={13} strokeWidth={2.5} />
              </button>
            </div>
          )}

          {/* Form to Add Day Board */}
          {showAddBoardForm && (
            <form onSubmit={handleAddBoard} className="animation-slide-up" style={{ background: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(20px) saturate(190%)', WebkitBackdropFilter: 'blur(20px) saturate(190%)', borderRadius: '20px', padding: '16px 20px', border: '1px solid rgba(255, 255, 255, 0.5)', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', alignItems: 'end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#86868b' }}>Unterrichtstag</label>
                <select
                  value={newBoardDay}
                  onChange={e => setNewBoardDay(parseInt(e.target.value))}
                  style={{ width: '100%', background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(0, 0, 0, 0.08)', borderRadius: '10px', padding: '8px 10px', fontSize: '0.8rem', fontWeight: 600, outline: 'none' }}
                >
                  {DAYS_OF_WEEK.filter(d => !boards.some(b => b.dayOfWeek === d.value)).map(d => (
                    <option key={d.value} value={d.value}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#86868b' }}>Startzeit (Uhrzeit)</label>
                <input
                  type="time"
                  required
                  value={newBoardStart}
                  onChange={e => setNewBoardStart(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(0, 0, 0, 0.08)', borderRadius: '10px', padding: '8px 10px', fontSize: '0.8rem', fontWeight: 600, outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#86868b' }}>Endzeit (Uhrzeit)</label>
                <input
                  type="time"
                  required
                  value={newBoardEnd}
                  onChange={e => setNewBoardEnd(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(0, 0, 0, 0.08)', borderRadius: '10px', padding: '8px 10px', fontSize: '0.8rem', fontWeight: 600, outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="submit"
                  style={{ flex: 1, background: '#1d1d1f', color: 'white', border: 'none', fontWeight: 700, padding: '10px', borderRadius: '10px', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Hinzufügen
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddBoardForm(false)}
                  style={{ background: 'rgba(0, 0, 0, 0.04)', border: 'none', color: '#515154', fontWeight: 700, padding: '10px 14px', borderRadius: '10px', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Abbrechen
                </button>
              </div>
            </form>
          )}

          {/* Main workspace layout */}
          {(() => {
            const currentUnassigned = students.filter(s => !s.isBreak && !s.assignedDay);
            const isPoolCollapsed = isPoolManuallyCollapsed !== null ? isPoolManuallyCollapsed : (currentUnassigned.length === 0);
            return (
              <div style={{ display: 'grid', gridTemplateColumns: isPoolCollapsed ? 'minmax(0, 1fr) 44px' : 'minmax(0, 1fr) 240px', gap: '14px', alignItems: 'start', transition: 'all 0.25s' }}>
            
            {/* Main Boards Column Container */}
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 }}>
              {/* 🍏 Active Swap Mode Banner (Light Theme / Campus-Grün) */}
              {swapPartnerPendingId && (() => {
                const swapSourceStudent = students.find(s => s.id === swapPartnerPendingId) || boards.flatMap(b => b.students).find(s => s.id === swapPartnerPendingId);
                return (
                  <div
                    role="region"
                    aria-label="Tauschmodus aktiv"
                    style={{
                      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                      border: '1.5px solid #86efac',
                      borderRadius: '16px',
                      padding: '12px 18px',
                      marginBottom: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: '0 4px 16px rgba(22, 163, 74, 0.12)',
                      animation: 'floating-slide-up 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: '#34a853',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        boxShadow: '0 2px 8px rgba(52, 168, 83, 0.3)'
                      }}>
                        <ArrowLeftRight size={18} strokeWidth={2.4} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#14532d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>Tauschmodus aktiv</span>
                          <span style={{ fontSize: '0.70rem', fontWeight: 700, background: '#bbf7d0', color: '#15803d', padding: '1px 8px', borderRadius: '12px' }}>
                            1:1 Tausch
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#166534', marginTop: '2px' }}>
                          Wähle den Schüler aus, mit dem <strong>{swapSourceStudent ? `${swapSourceStudent.first_name || 'Schüler'} ${maskLastName(swapSourceStudent.last_name || '', showRealNames)}` : 'der Termin'}</strong> ({swapSourceStudent?.assignedTime || ''} Uhr) getauscht werden soll.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSwapPartnerPendingId(null);
                        setToast({ message: 'Tauschmodus beendet.', type: 'info' });
                      }}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #86efac',
                        color: '#15803d',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        padding: '8px 14px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseOver={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#4ade80'; }}
                      onMouseOut={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#86efac'; }}
                    >
                      <X size={14} />
                      <span>Abbrechen (Esc)</span>
                    </button>
                  </div>
                );
              })()}

              {/* Trello Board List Column Area */}
              <div id="tour-day-boards" style={{ 
              display: 'flex', 
              gap: '0px', 
              width: '100%', 
              minHeight: '520px', 
              alignItems: 'stretch',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '24px',
              padding: '20px 8px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch'
            }}>
              {(() => {
                const visibleBoards = boards.filter(b => focusedDayOfWeek === null || b.dayOfWeek === focusedDayOfWeek);
                const PX_PER_MIN = 2.5;

                // DAW-Synchronized horizontal timeline calculation across all visible boards
                let minGlobalStart = 24 * 60;
                let maxGlobalEnd = 0;

                visibleBoards.forEach(b => {
                  const [anchorH, anchorM] = parseTime(b.startAnchor || '14:00');
                  const bStart = anchorH * 60 + anchorM;
                  if (bStart < minGlobalStart) minGlobalStart = bStart;

                  let maxStudEnd = bStart;
                  let curMins = bStart;
                  b.students.forEach(s => {
                    const sTime = s.assignedTime || s.customStartTime;
                    if (sTime) {
                      const [sh, sm] = parseTime(sTime);
                      const sEnd = sh * 60 + sm + (s.duration || 30);
                      if (sEnd > maxStudEnd) maxStudEnd = sEnd;
                    } else {
                      curMins += (s.duration || 30);
                      if (curMins > maxStudEnd) maxStudEnd = curMins;
                    }
                  });

                  const dayConfig = (teacherAvailability as any)?.[b.dayOfWeek];
                  let availEnd = bStart + 300;
                  if (dayConfig?.end) {
                    const [eh, em] = parseTime(dayConfig.end);
                    availEnd = eh * 60 + em;
                  }

                  const bEnd = Math.max(availEnd, maxStudEnd, bStart + 60);
                  if (bEnd > maxGlobalEnd) maxGlobalEnd = bEnd;
                });

                if (minGlobalStart === 24 * 60) minGlobalStart = 13 * 60;
                const globalStartMinutes = Math.floor(minGlobalStart / 30) * 30;
                const globalEndMinutes = Math.max(Math.ceil(maxGlobalEnd / 30) * 30, globalStartMinutes + 270);
                const uniformColumnHeightPx = (globalEndMinutes - globalStartMinutes) * PX_PER_MIN + 48;

                return visibleBoards.map((board, index, arr) => {
                  const dayLabel = DAYS_OF_WEEK.find(d => d.value === board.dayOfWeek)?.name || '';
                  const startMinutes = globalStartMinutes;
                  const endMinutes = globalEndMinutes;
                  const columnHeightPx = uniformColumnHeightPx;
                  const startHour = Math.floor(startMinutes / 60);
                  const endHour = Math.ceil(endMinutes / 60);
                  const hourMarkers: { hour: number; top: number }[] = [];
                  for (let h = startHour; h <= endHour; h++) {
                    const top = (h * 60 - startMinutes) * PX_PER_MIN;
                    if (top >= -2 && top <= columnHeightPx + 30) {
                      hourMarkers.push({ hour: h % 24, top });
                    }
                  }

                  return (
                    <div
                      key={board.id}
                      role="region"
                      aria-label={`Wochentag ${DAYS_OF_WEEK.find(d => d.value === board.dayOfWeek)?.name || 'Tag'}`}
                      onClick={() => {
                        if (selectedStudentId) {
                          handleDropOnBoard(board.id);
                        }
                      }}
                      onDragOver={handleDragOver}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDropOnBoard(board.id);
                      }}
                      style={{ 
                        flex: 1,
                        minWidth: focusedDayOfWeek !== null ? '100%' : '170px',
                        background: 'transparent', 
                        borderRight: index < arr.length - 1 ? '1px solid #e2e8f0' : 'none', 
                        padding: '0 10px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '8px',
                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                    >
                      {/* Day Column Header with 100% uniform height to align grid baseline across all days */}
                      <div 
                        role="button"
                        tabIndex={0}
                        aria-label={focusedDayOfWeek === board.dayOfWeek ? "Wochenansicht wiederherstellen" : `Fokus-Ansicht für ${dayLabel || 'Wochentag'} aktivieren`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setFocusedDayOfWeek(focusedDayOfWeek === board.dayOfWeek ? null : board.dayOfWeek);
                          }
                        }}
                        style={{ 
                          textAlign: 'center', 
                          paddingBottom: '8px', 
                          borderBottom: '1px solid rgba(0,0,0,0.05)', 
                          position: 'relative', 
                          cursor: 'pointer',
                          minHeight: '84px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}
                        onClick={() => setFocusedDayOfWeek(focusedDayOfWeek === board.dayOfWeek ? null : board.dayOfWeek)}
                        title={focusedDayOfWeek === board.dayOfWeek ? "Zurück zur Wochenansicht" : "Diesen Tag vergrößern (Fokus-Ansicht)"}
                      >
                        {/* Day deletion button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBoard(board.id);
                          }}
                          aria-label={`Unterrichtstag ${dayLabel} löschen`}
                          title={`Unterrichtstag ${dayLabel} löschen`}
                          style={{
                            position: 'absolute',
                            top: '2px',
                            left: '2px',
                            padding: '4px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: '#94a3b8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 2,
                            transition: 'color 0.15s, background-color 0.15s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#ef4444';
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#94a3b8';
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <Trash2 size={13} />
                        </button>

                        {focusedDayOfWeek === board.dayOfWeek && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFocusedDayOfWeek(null);
                            }}
                            className="apple-btn"
                            style={{
                              position: 'absolute',
                              top: '0px',
                              right: '4px',
                              padding: '4px 8px',
                              fontSize: '0.65rem',
                              background: 'rgba(0,0,0,0.05)',
                              borderRadius: '6px',
                              minHeight: '22px'
                            }}
                          >
                            Wochenansicht
                          </button>
                        )}
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unterrichtstag</div>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1d1d1f' }}>{dayLabel} ({board.students.filter(s => !s.isBreak).length})</div>
                          
                          {/* 🏛️ Raum-Zuweisung: Für Sekretariat/Admin direkt editierbar als Dropdown mit intelligenter Kollisionserkennung, für Lehrkraft als 3-Stufen-Herrenberg-Anzeige */}
                          {isSecretaryWorkspace ? (
                            <div 
                              onClick={(e) => e.stopPropagation()} 
                              style={{ marginTop: '5px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                <MapPin size={11} color={board.roomId ? (getRoomCollisionInfo(board.roomId, board) ? '#dc2626' : '#16a34a') : '#ea580c'} style={{ flexShrink: 0 }} />
                                <select
                                  value={board.roomId || ''}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleAssignBoardRoom(board.id, e.target.value);
                                  }}
                                  aria-label={`Raum für ${dayLabel} zuweisen`}
                                  style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: '6px',
                                    border: board.roomId 
                                      ? (getRoomCollisionInfo(board.roomId, board) ? '1.5px solid #fca5a5' : '1px solid #bbf7d0') 
                                      : '1.5px solid #fdba74',
                                    background: board.roomId 
                                      ? (getRoomCollisionInfo(board.roomId, board) ? '#fef2f2' : '#f0fdf4') 
                                      : '#fff7ed',
                                    color: board.roomId 
                                      ? (getRoomCollisionInfo(board.roomId, board) ? '#b91c1c' : '#15803d') 
                                      : '#c2410c',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    maxWidth: '140px',
                                    textOverflow: 'ellipsis'
                                  }}
                                >
                                  <option value="">-- Raum zuweisen --</option>
                                  {rooms.map(r => {
                                    const colInfo = getRoomCollisionInfo(r.id, board);
                                    return (
                                      <option key={r.id} value={r.id}>
                                        {r.name} {colInfo ? `⚠️ (${colInfo})` : '✓ (Frei)'}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                              {board.roomId && getRoomCollisionInfo(board.roomId, board) && (
                                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#b91c1c', textAlign: 'center', maxWidth: '140px', lineHeight: 1.1 }}>
                                  ⚠️ {getRoomCollisionInfo(board.roomId, board)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div style={{ marginTop: '4px', fontSize: '0.68rem', fontWeight: 600, color: (scheduleStatus === 'approved' && board.roomId) ? '#15803d' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                              <MapPin size={10} color={(scheduleStatus === 'approved' && board.roomId) ? '#16a34a' : '#94a3b8'} style={{ flexShrink: 0 }} />
                              <span 
                                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }} 
                                title={(scheduleStatus === 'approved' && board.roomId) 
                                  ? `Zugewiesener Raum: ${rooms.find(r => r.id === board.roomId)?.name || 'Raum'}` 
                                  : 'Die Zuweisung freier Räume erfolgt nach Einreichung durch das Schulsekretariat'}
                              >
                                {(scheduleStatus === 'approved' && board.roomId) 
                                  ? (rooms.find(r => r.id === board.roomId)?.name || 'Raum zugewiesen')
                                  : 'Raum: Zuteilung durch Musikschule'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* TVöD / ArbZG Arbeitszeit-Warnhinweis */}
                        {(() => {
                          let maxContinuous = 0;
                          let currentContinuous = 0;
                          let totalAssigned = 0;
                          for (const s of board.students) {
                            if (s.isBreak) {
                              currentContinuous = 0;
                            } else {
                              currentContinuous += (s.duration || 30);
                              totalAssigned += (s.duration || 30);
                              if (currentContinuous > maxContinuous) maxContinuous = currentContinuous;
                            }
                          }

                          if (totalAssigned > 360 && maxContinuous > 360) {
                            return (
                              <div style={{ padding: '3px 8px', marginTop: '4px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '0.66rem', fontWeight: 700, color: '#991b1b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                <AlertCircle size={11} color="currentColor" />
                                <span>Pflichtpause fehlt (&gt; 6 Std.)</span>
                              </div>
                            );
                          } else if (maxContinuous > 180) {
                            return (
                              <div style={{ padding: '4px 8px', marginTop: '4px', background: '#fefce8', border: '1px solid #fef08a', borderRadius: '6px', fontSize: '0.66rem', fontWeight: 700, color: '#854d0e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <Clock size={11} color="currentColor" />
                                  <span>Pause empfohlen (&gt; 3 Std.)</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleInsertAutoBreak(board.id);
                                  }}
                                  style={{
                                    background: '#fef08a',
                                    border: '1px solid #facc15',
                                    borderRadius: '5px',
                                    padding: '2px 7px',
                                    fontSize: '0.62rem',
                                    fontWeight: 800,
                                    color: '#854d0e',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px'
                                  }}
                                  title="15-Minuten-Pause automatisch einschieben und Folgetermine verschieben"
                                >
                                  <span>+ 15m Pause</span>
                                </button>
                              </div>
                            );
                          }
                          return <div style={{ height: '26px' }} />;
                        })()}
                      </div>

                    {/* ── PROPORTIONAL TIME-GRID ── */}
                    <div
                      onDragOver={(e) => {
                            e.preventDefault();
                            const rect = e.currentTarget.getBoundingClientRect();
                            const grabOffset = (dragSource === 'sidebar' || draggedStudentId === 'sidebar-pause') 
                              ? 0 
                              : Math.min(Math.max(0, grabOffsetRef.current || 0), 40);
                            const clientY = Math.max(0, Math.min(e.clientY - rect.top - grabOffset, columnHeightPx));
                            const dragMinutes = clientY / PX_PER_MIN;

                            const [bsh, bsm] = parseTime(board.startAnchor);
                            const boardStartMin = bsh * 60 + bsm;
                            const rawMinutes = boardStartMin + dragMinutes;
                            const snappedTotalMinutes = Math.round(rawMinutes / gridSnapMinutes) * gridSnapMinutes;
                            const snappedHours = Math.floor(snappedTotalMinutes / 60) % 24;
                            const snappedMins = snappedTotalMinutes % 60;
                            const targetTime = `${String(snappedHours).padStart(2, '0')}:${String(snappedMins).padStart(2, '0')}`;

                            lastSnapTimeRef.current = { boardId: board.id, timeStr: targetTime };

                            const topPx = (snappedTotalMinutes - boardStartMin) * PX_PER_MIN;

                            // Calculate targetIndex strictly from snappedTotalMinutes (chronological grid position)
                            let targetIndex = board.students.findIndex(s => {
                              const sTime = s.customStartTime || s.assignedTime;
                              if (!sTime) return false;
                              const [sh, sm] = parseTime(sTime);
                              return (sh * 60 + sm) >= snappedTotalMinutes;
                            });
                            if (targetIndex === -1) targetIndex = board.students.length;

                            if (dragOverBoardId !== board.id || dragOverIndex !== targetIndex || dragSnapState?.topPx !== topPx) {
                              if (dragSnapState && dragSnapState.timeStr !== targetTime) {
                                playCubaseSnapClick();
                              }
                              setDragOverBoardId(board.id);
                              setDragOverIndex(targetIndex);
                              setDragSnapState({
                                boardId: board.id,
                                topPx,
                                timeStr: targetTime,
                                duration: draggedDuration,
                                studentName: draggedStudentName
                              });
                            }
                          }}
                          onDragLeave={(e) => {
                            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                            cleanupDragGhost();
                            setDragOverBoardId(null);
                            setDragOverIndex(null);
                            setDragSnapState(null);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            cleanupDragGhost();
                            
                            // Capture exact targetTime from dragSnapState or lastSnapTimeRef
                            const snapTime = (dragSnapState && dragSnapState.boardId === board.id)
                              ? dragSnapState.timeStr
                              : (lastSnapTimeRef.current && lastSnapTimeRef.current.boardId === board.id ? lastSnapTimeRef.current.timeStr : null);
                            const isAltSwap = e.altKey;
                            
                            setDragSnapState(null);
                            lastSnapTimeRef.current = null;

                            let targetTime = snapTime;
                            if (!targetTime) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const grabOffset = (dragSource === 'sidebar' || draggedStudentId === 'sidebar-pause') 
                                ? 0 
                                : Math.min(Math.max(0, grabOffsetRef.current || 0), 40);
                              const clientY = Math.max(0, Math.min(e.clientY - rect.top - grabOffset, columnHeightPx));
                              const dragMinutes = clientY / PX_PER_MIN;

                              const [bsh, bsm] = parseTime(board.startAnchor);
                              const rawMinutes = bsh * 60 + bsm + dragMinutes;
                              const snappedTotalMinutes = Math.round(rawMinutes / gridSnapMinutes) * gridSnapMinutes;
                              const snappedHours = Math.floor(snappedTotalMinutes / 60) % 24;
                              const snappedMins = snappedTotalMinutes % 60;
                              targetTime = `${String(snappedHours).padStart(2, '0')}:${String(snappedMins).padStart(2, '0')}`;
                            }

                            handleDropOnBoard(board.id, dragOverIndex !== null ? dragOverIndex : undefined, targetTime, isAltSwap);
                          }}
                          style={{ 
                            position: 'relative', 
                            height: `${columnHeightPx}px`, 
                            flexShrink: 0, 
                            marginTop: '4px',
                            backgroundColor: dragOverBoardId === board.id ? 'rgba(248, 250, 252, 0.8)' : 'transparent',
                            outline: dragOverBoardId === board.id ? '1.5px dashed #cbd5e1' : 'none',
                            borderRadius: '12px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                       {/* Dynamic Cubase DAW Grid Subdivision Lines */}
                      {(() => {
                        const [bsh, bsm] = parseTime(board.startAnchor);
                        const boardStartMin = bsh * 60 + bsm;
                        const colStartMin = startMinutes;
                        const colEndMin = endMinutes;

                        // Align first grid line strictly to absolute 00:00 clock multiples of gridSnapMinutes
                        const firstGridMin = Math.ceil(colStartMin / gridSnapMinutes) * gridSnapMinutes;
                        const gridLines = [];

                        for (let min = firstGridMin; min <= colEndMin; min += gridSnapMinutes) {
                          const topPx = (min - boardStartMin) * PX_PER_MIN;
                          if (topPx < 0 || topPx > columnHeightPx) continue;

                          const h = Math.floor(min / 60) % 24;
                          const mins = min % 60;
                          const isHour = mins === 0;

                          gridLines.push(
                            <div
                              key={`cubase-grid-${min}`}
                              style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: `${topPx}px`,
                                borderTop: isHour 
                                  ? '1.5px dashed rgba(0,0,0,0.12)' 
                                  : '1px dotted rgba(0,0,0,0.06)',
                                pointerEvents: 'none',
                                zIndex: 0
                              }}
                            >
                              {isHour && (
                                <span style={{ position: 'absolute', left: '2px', top: '-8px', fontSize: '0.58rem', color: 'rgba(0,0,0,0.3)', fontWeight: 800, userSelect: 'none', fontFamily: 'Urbanist, sans-serif' }}>
                                  {String(h).padStart(2, '0')}:00
                                </span>
                              )}
                            </div>
                          );
                        }
                        return gridLines;
                      })()}

                      {/* Cubase Ghost Event Preview Frame & Magnetic Snap Line */}
                      {dragSnapState && dragSnapState.boardId === board.id && (() => {
                        // Evaluate preference matching for dragged student on this day/time slot
                        const prefsToUse = (draggedStudentId && allStudentPrefsMap[draggedStudentId])
                          ? allStudentPrefsMap[draggedStudentId]
                          : selectedStudentPrefs;
                        let isWunsch = false;
                        let isBlocked = false;

                        if (prefsToUse && prefsToUse.length > 0) {
                          const [sh, sm] = parseTime(dragSnapState.timeStr);
                          const startMin = sh * 60 + sm;
                          const endMin = startMin + dragSnapState.duration;

                          for (const pref of prefsToUse) {
                            if (Number(pref.day_of_week) === Number(board.dayOfWeek)) {
                              const [psh, psm] = parseTime(pref.start_time);
                              const [peh, pem] = parseTime(pref.end_time);
                              const pStart = psh * 60 + psm;
                              const pEnd = peh * 60 + pem;

                              // Check collision or exact wunsch hit
                              if (pref.preference_type === 'gesperrt') {
                                if (startMin < pEnd && endMin > pStart) {
                                  isBlocked = true;
                                }
                              } else if (pref.preference_type === 'wunsch') {
                                if (startMin >= pStart && endMin <= pEnd) {
                                  isWunsch = true;
                                }
                              }
                            }
                          }
                        }

                        // Match exact dropped card styling (Los-Lass-Modus) for 100% seamless transition
                        const dragInst = resolveInstrument();

                        let gBg = '#ffffff';
                        let gBorder = '1px solid rgba(0, 0, 0, 0.08)';
                        let gBorderLeft = '4px solid #94a3b8';
                        let gText = '#1d1d1f';
                        let gSubText = '#64748b';
                        let gBadgeBg = 'rgba(0, 0, 0, 0.05)';
                        let gBadgeText = '#475569';
                        let gShadow = '0 6px 20px rgba(0, 0, 0, 0.08)';
                        let borderColor = '#cbd5e1';

                        if (isBlocked) {
                          gBg = '#ef4444';
                          gBorder = '1px solid #dc2626';
                          gBorderLeft = '4px solid #b91c1c';
                          gText = '#ffffff';
                          gSubText = 'rgba(255, 255, 255, 0.9)';
                          gBadgeBg = 'rgba(255, 255, 255, 0.25)';
                          gBadgeText = '#ffffff';
                          gShadow = '0 4px 12px rgba(239, 68, 68, 0.25)';
                          borderColor = '#ef4444';
                        } else if (isWunsch) {
                          gBg = '#34a853';
                          gBorder = '1px solid #2e7d32';
                          gBorderLeft = '4px solid #f59e0b';
                          gText = '#ffffff';
                          gSubText = 'rgba(255, 255, 255, 0.9)';
                          gBadgeBg = 'rgba(255, 255, 255, 0.25)';
                          gBadgeText = '#ffffff';
                          gShadow = '0 4px 12px rgba(52, 168, 83, 0.2)';
                          borderColor = '#34a853';
                        }

                        return (
                          <>
                            {/* Ghost Event Frame (1-zu-1 identisch mit gedroppter Karte) */}
                            <div
                              style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: `${Math.max(dragSnapState.topPx, 0)}px`,
                                height: `${dragSnapState.duration * PX_PER_MIN - 4}px`,
                                background: gBg,
                                border: gBorder,
                                borderRadius: '10px',
                                padding: '5px 8px',
                                boxSizing: 'border-box',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                gap: '2px',
                                zIndex: 98,
                                pointerEvents: 'none',
                                backdropFilter: 'blur(8px)',
                                WebkitBackdropFilter: 'blur(8px)',
                                boxShadow: gShadow,
                                transition: 'top 0.08s cubic-bezier(0.16, 1, 0.3, 1)',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: gText, pointerEvents: 'none' }}>
                                  {dragSnapState.timeStr}
                                </span>
                                <span style={{ fontSize: '0.62rem', fontWeight: 600, color: gBadgeText, background: gBadgeBg, padding: '1px 5px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  {isWunsch && (
                                    <Star size={9} fill="currentColor" color="currentColor" />
                                  )}
                                  {dragSnapState.duration}m
                                </span>
                              </div>

                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: gText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <InstrumentBadge instrument={dragInst} color={gText} />
                                {dragSnapState.studentName || 'Schüler'}
                              </span>

                              {dragSnapState.duration >= 30 && (
                                <span style={{ fontSize: '0.62rem', fontWeight: 600, color: gSubText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {isWunsch ? 'Wunschzeit getroffen!' : (isBlocked ? 'Sperrzeit (Verboten)' : dragInst)}
                                </span>
                              )}
                            </div>

                            {/* Minimalist Apple Snap Line */}
                            <div 
                              style={{ 
                                position: 'absolute', 
                                left: 0, 
                                right: 0, 
                                top: `${Math.max(dragSnapState.topPx, 0)}px`, 
                                height: '1.5px', 
                                background: borderColor, 
                                zIndex: 99, 
                                pointerEvents: 'none',
                                transition: 'top 0.08s cubic-bezier(0.16, 1, 0.3, 1)'
                              }}
                            />
                          </>
                        );
                      })()}

                      {/* Interactive Preferences Overlays (Roentgen Matrix View) */}
                       {(selectedStudentId || draggedStudentId) && (() => {
                        const blockCount = Math.floor((endMinutes - startMinutes) / 15);
                        const matchedTypes: ('wunsch' | 'gesperrt' | null)[] = Array(blockCount).fill(null);
                        
                        for (let i = 0; i < blockCount; i++) {
                          const blockStart = startMinutes + i * 15;
                          const blockEnd = blockStart + 15;
                          
                          selectedStudentPrefs.forEach(pref => {
                            if (Number(pref.day_of_week) === Number(board.dayOfWeek)) {
                              const [ph, pm] = parseTime(pref.start_time);
                              const [peh, pem] = parseTime(pref.end_time);
                              const prefStart = ph * 60 + pm;
                              const prefEnd = peh * 60 + pem;
                              
                              if (blockStart < prefEnd && blockEnd > prefStart) {
                                if (pref.preference_type === 'gesperrt') {
                                  matchedTypes[i] = 'gesperrt';
                                } else if (pref.preference_type === 'wunsch' && matchedTypes[i] !== 'gesperrt') {
                                  matchedTypes[i] = 'wunsch';
                                }
                              }
                            }
                          });
                        }

                        // Merge contiguous slots of the same preference type
                        const mergedBlocks = [];
                        let currentType: 'wunsch' | 'gesperrt' | null = null;
                        let startIndex = -1;

                        for (let i = 0; i < blockCount; i++) {
                          const type = matchedTypes[i];
                          if (type !== currentType) {
                            if (currentType && startIndex !== -1) {
                              const top = startIndex * 15 * PX_PER_MIN;
                              const height = (i - startIndex) * 15 * PX_PER_MIN;
                              const isBlocked = currentType === 'gesperrt';
                              const blockStartTimeStr = formatMinutes(startMinutes + startIndex * 15);
                              const blockEndTimeStr = formatMinutes(startMinutes + i * 15);
                              
                              mergedBlocks.push(
                                <div
                                  key={`pref-block-${board.id}-${startIndex}-${i}`}
                                  className={isBlocked ? 'roentgen-blocked' : 'roentgen-preferred'}
                                  style={{
                                    position: 'absolute',
                                    left: 0,
                                    right: 0,
                                    top: `${top}px`,
                                    height: `${height}px`,
                                    zIndex: 3,
                                    boxSizing: 'border-box',
                                    pointerEvents: 'none',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    justifyContent: 'flex-start',
                                    padding: '4px 6px',
                                    overflow: 'hidden'
                                  }}
                                >
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.62rem',
                                    fontWeight: 800,
                                    color: isBlocked ? '#991b1b' : '#166534',
                                    background: isBlocked ? 'rgba(254, 242, 242, 0.88)' : 'rgba(240, 253, 244, 0.88)',
                                    padding: '2px 7px',
                                    borderRadius: '6px',
                                    border: `1px solid ${isBlocked ? 'rgba(239, 68, 68, 0.3)' : 'rgba(52, 168, 83, 0.3)'}`,
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                                    backdropFilter: 'blur(12px)',
                                    WebkitBackdropFilter: 'blur(12px)',
                                    whiteSpace: 'nowrap',
                                    letterSpacing: '-0.01em'
                                  }}>
                                    {isBlocked ? <Ban size={10} color="#dc2626" /> : <Star size={10} color="currentColor" />}
                                    <span>{isBlocked ? `Sperrzeit (${blockStartTimeStr} - ${blockEndTimeStr})` : `Wunschzeit (${blockStartTimeStr} - ${blockEndTimeStr})`}</span>
                                  </div>
                                </div>
                              );
                            }
                            currentType = type;
                            startIndex = type ? i : -1;
                          }
                        }

                        if (currentType && startIndex !== -1) {
                          const top = startIndex * 15 * PX_PER_MIN;
                          const height = (blockCount - startIndex) * 15 * PX_PER_MIN;
                          const isBlocked = currentType === 'gesperrt';
                          const blockStartTimeStr = formatMinutes(startMinutes + startIndex * 15);
                          const blockEndTimeStr = formatMinutes(startMinutes + blockCount * 15);
                          
                          mergedBlocks.push(
                            <div
                              key={`pref-block-${board.id}-${startIndex}-${blockCount}`}
                              className={isBlocked ? 'roentgen-blocked' : 'roentgen-preferred'}
                              style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: `${top}px`,
                                height: `${height}px`,
                                zIndex: 3,
                                boxSizing: 'border-box',
                                pointerEvents: 'none',
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'flex-start',
                                padding: '4px 6px',
                                overflow: 'hidden'
                              }}
                            >
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                color: isBlocked ? '#991b1b' : '#166534',
                                background: isBlocked ? 'rgba(254, 242, 242, 0.88)' : 'rgba(240, 253, 244, 0.88)',
                                padding: '2px 7px',
                                borderRadius: '6px',
                                border: `1px solid ${isBlocked ? 'rgba(239, 68, 68, 0.3)' : 'rgba(52, 168, 83, 0.3)'}`,
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                whiteSpace: 'nowrap',
                                letterSpacing: '-0.01em'
                              }}>
                                {isBlocked ? <Ban size={10} color="#dc2626" /> : <Star size={10} color="currentColor" />}
                                <span>{isBlocked ? `Sperrzeit (${blockStartTimeStr} - ${blockEndTimeStr})` : `Wunschzeit (${blockStartTimeStr} - ${blockEndTimeStr})`}</span>
                              </div>
                            </div>
                          );
                        }

                        // Sibling visual enhancements
                        if (siblingInfo) {
                          // Scenario 1: Sibling is scheduled (we show parallel, before, after)
                          if (siblingInfo.scheduled_slot && siblingInfo.scheduled_slot.day_of_week === board.dayOfWeek) {
                            const [sh, sm] = parseTime(siblingInfo.scheduled_slot.start_time);
                            const sibStartMin = sh * 60 + sm;
                            const sibDuration = siblingInfo.duration || 30;
                            const currentStudDuration = students.find(s => s.id === selectedStudentId)?.duration || 30;

                            const recommendations = [
                              {
                                label: 'Geschwister-Empfehlung: Parallel',
                                start: sibStartMin,
                                duration: Math.min(sibDuration, currentStudDuration),
                                bg: 'rgba(139, 92, 246, 0.15)',
                                border: '1.5px dashed #8b5cf6'
                              },
                              {
                                label: 'Geschwister-Empfehlung: Vorher',
                                start: sibStartMin - currentStudDuration,
                                duration: currentStudDuration,
                                bg: 'rgba(139, 92, 246, 0.1)',
                                border: '1.5px dashed #a78bfa'
                              },
                              {
                                label: 'Geschwister-Empfehlung: Nachher',
                                start: sibStartMin + sibDuration,
                                duration: currentStudDuration,
                                bg: 'rgba(139, 92, 246, 0.1)',
                                border: '1.5px dashed #a78bfa'
                              }
                            ];

                            recommendations.forEach((rec, idx) => {
                              if (rec.start >= startMinutes && rec.start + rec.duration <= endMinutes) {
                                const top = (rec.start - startMinutes) * PX_PER_MIN;
                                const height = rec.duration * PX_PER_MIN;
                                mergedBlocks.push(
                                  <div
                                    key={`sib-rec-${board.id}-${idx}`}
                                    style={{
                                      position: 'absolute',
                                      left: '4px',
                                      right: '4px',
                                      top: `${top}px`,
                                      height: `${height}px`,
                                      background: rec.bg,
                                      border: rec.border,
                                      borderRadius: '8px',
                                      zIndex: 4,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      pointerEvents: 'none',
                                      boxSizing: 'border-box'
                                    }}
                                  >
                                    <span style={{
                                      fontSize: '9px',
                                      fontWeight: 800,
                                      color: '#6d28d9',
                                      background: '#ffffff',
                                      padding: '2px 6px',
                                      borderRadius: '6px',
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                      textAlign: 'center'
                                    }}>
                                      {rec.label}
                                    </span>
                                  </div>
                                );
                              }
                            });
                          }

                          // Scenario 2: Sibling is not scheduled yet, we highlight common Wunschzeiten
                          if (!siblingInfo.scheduled_slot) {
                            selectedStudentPrefs.forEach(pref => {
                              if (pref.preference_type === 'wunsch' && pref.day_of_week === board.dayOfWeek) {
                                const [ph, pm] = parseTime(pref.start_time);
                                const [peh, pem] = parseTime(pref.end_time);
                                const prefStart = ph * 60 + pm;
                                const prefEnd = peh * 60 + pem;

                                const hasOverlap = siblingInfo.selected_slots?.some((sp: any) => {
                                  if (sp.preference_type !== 'wunsch' || sp.day_of_week !== board.dayOfWeek) return false;
                                  const [sph, spm] = parseTime(sp.start_time);
                                  const [speh, spem] = parseTime(sp.end_time);
                                  const sStart = sph * 60 + spm;
                                  const sEnd = speh * 60 + spem;
                                  return (prefStart < sEnd && prefEnd > sStart);
                                });

                                if (hasOverlap && prefStart >= startMinutes && prefEnd <= endMinutes) {
                                  const top = (prefStart - startMinutes) * PX_PER_MIN;
                                  const height = (prefEnd - prefStart) * PX_PER_MIN;

                                  mergedBlocks.push(
                                    <div
                                      key={`sib-overlap-${board.id}-${prefStart}`}
                                      style={{
                                        position: 'absolute',
                                        left: 0,
                                        right: 0,
                                        top: `${top}px`,
                                        height: `${height}px`,
                                        border: '2px solid #8b5cf6',
                                        background: 'repeating-linear-gradient(45deg, rgba(52, 168, 83, 0.1), rgba(52, 168, 83, 0.1) 8px, rgba(139, 92, 246, 0.1) 8px, rgba(139, 92, 246, 0.1) 16px)',
                                        zIndex: 4,
                                        pointerEvents: 'none',
                                        boxSizing: 'border-box'
                                      }}
                                    />
                                  );
                                }
                              }
                            });
                          }
                        }

                        return mergedBlocks;
                      })()}

                      {/* Empty drop hint */}
                      {board.students.length === 0 && !((selectedStudentId || draggedStudentId) && selectedStudentPrefs.some(p => Number(p.day_of_week) === Number(board.dayOfWeek) && p.preference_type === 'gesperrt')) && (
                        <div style={{ position: 'absolute', inset: '8px 0', border: '1.5px dashed rgba(0,0,0,0.08)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#86868b', pointerEvents: 'none', zIndex: 1 }}>
                          <Users size={18} style={{ color: '#c7c7cc', marginBottom: '4px' }} />
                          <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Schüler hierhin</span>
                        </div>
                      )}

                      {/* Cards: absolutely positioned by assignedTime */}
                      {board.students.map((bs, cardIndex) => {
                        const [sh, sm] = parseTime(bs.assignedTime || board.startAnchor);
                        const cardTopPx = (sh * 60 + sm - startMinutes) * PX_PER_MIN;
                        const cardHeightPx = (bs.duration || 30) * PX_PER_MIN - 4;

                        // 🍏 Apple HIG Spatial Opening: Wenn eine Karte über diese Spalte gezogen wird,
                        // weichen alle nachfolgenden Karten flüssig nach unten aus und öffnen die Ziellücke
                        const isCardShifted = dragOverBoardId === board.id &&
                          draggedStudentId !== null &&
                          draggedStudentId !== bs.id &&
                          dragOverIndex !== null &&
                          cardIndex >= dragOverIndex &&
                          dragTargetIntent !== 'swap';

                        let shiftMins = 30;
                        if (draggedStudentId) {
                          if (draggedStudentId === 'sidebar-pause' || draggedStudentId.startsWith('break-')) {
                            shiftMins = 15;
                          } else {
                            const draggedObj = board.students.find(s => s.id === draggedStudentId) || students.find(s => s.id === draggedStudentId);
                            if (draggedObj) shiftMins = draggedObj.duration || 30;
                          }
                        }
                        const shiftPx = isCardShifted ? (shiftMins * PX_PER_MIN) : 0;

                        if (bs.isBreak) {
                          const isCurrentlyResizingThis = resizingBreak?.breakId === bs.id;
                          const effectiveBreakDuration = isCurrentlyResizingThis ? resizingBreak.currentDuration : (bs.duration || 15);
                          const cardHeightPx = effectiveBreakDuration * PX_PER_MIN - 4;
                          const [bsh, bsm] = parseTime(bs.assignedTime || board.startAnchor);
                          const endTotalMin = bsh * 60 + bsm + effectiveBreakDuration;
                          const endHours = Math.floor(endTotalMin / 60) % 24;
                          const endMins = endTotalMin % 60;
                          const breakEndTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
                          const breakStartTime = bs.assignedTime || `${String(bsh).padStart(2, '0')}:${String(bsm).padStart(2, '0')}`;

                          return (
                            <div
                              key={bs.id}
                              role="button"
                              tabIndex={0}
                              aria-label={`Pause ${breakStartTime} bis ${breakEndTime} Uhr (${effectiveBreakDuration} Minuten)`}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  (e.currentTarget as HTMLElement).click();
                                }
                              }}
                              draggable={!isCurrentlyResizingThis}
                              onDragStart={(e) => handleDragStart(bs.id, 'board', board.id, e)}
                              onDragEnd={handleDragEnd}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDragOverBoardId(board.id);
                                setDragOverIndex(cardIndex);
                              }}
                              onDrop={(e) => { e.stopPropagation(); handleDropOnBoard(board.id, cardIndex); }}
                              className="designer-student-card"
                              style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: `${Math.max(cardTopPx, 0)}px`,
                                height: `${Math.max(cardHeightPx, 32)}px`,
                                background: 'linear-gradient(135deg, #ffffff 0%, #fefce8 100%)',
                                border: isCurrentlyResizingThis ? '1.5px solid #d97706' : '1px solid #fef08a',
                                borderLeft: isCurrentlyResizingThis ? '5px solid #b45309' : '4px solid #f59e0b',
                                borderRadius: '10px',
                                padding: '4px 8px 10px 8px',
                                boxSizing: 'border-box',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: isCurrentlyResizingThis ? 'ns-resize' : 'grab',
                                boxShadow: isCurrentlyResizingThis ? '0 6px 18px rgba(245, 158, 11, 0.28)' : '0 2px 6px rgba(245, 158, 11, 0.08)',
                                zIndex: isCurrentlyResizingThis ? 30 : 10,
                                userSelect: 'none',
                                transform: isCardShifted ? `translateY(${shiftPx}px)` : 'none',
                                transition: isCurrentlyResizingThis ? 'none' : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.15s ease',
                                willChange: 'transform, top'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                <div style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '6px',
                                  background: 'rgba(245, 158, 11, 0.15)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#d97706',
                                  flexShrink: 0
                                }}>
                                  <Coffee size={12} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', minWidth: 0 }}>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#854d0e', letterSpacing: '-0.01em' }}>
                                    {breakStartTime}–{breakEndTime}
                                  </span>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a16207' }}>
                                    Pause
                                  </span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                <span style={{
                                  fontSize: '0.6rem',
                                  fontWeight: 800,
                                  background: isCurrentlyResizingThis ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.16)',
                                  color: '#b45309',
                                  padding: '1px 5px',
                                  borderRadius: '5px',
                                  border: isCurrentlyResizingThis ? '1px solid #d97706' : 'none',
                                  transition: 'all 0.15s ease'
                                }}>
                                  {effectiveBreakDuration}m
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    executeRemoveBreak(board.id, bs.id, true);
                                  }}
                                  title="Pause löschen (Folgetermine rücken auf)"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: '2px',
                                    color: '#a16207',
                                    cursor: 'pointer',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <X size={12} />
                                </button>
                              </div>

                              {/* 🍏 Apple HIG Edge-Resize Handle: Unterer Griff zum magnetischen Ziehen & Stauchen */}
                              <div
                                role="separator"
                                aria-orientation="horizontal"
                                aria-label={`Pausenlänge anpassen (aktuell ${effectiveBreakDuration} Minuten)`}
                                tabIndex={0}
                                onPointerDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                                  setResizingBreak({
                                    boardId: board.id,
                                    breakId: bs.id,
                                    initialDuration: bs.duration || 15,
                                    startY: e.clientY,
                                    currentDuration: bs.duration || 15
                                  });
                                }}
                                onPointerMove={(e) => {
                                  if (!resizingBreak || resizingBreak.breakId !== bs.id) return;
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const deltaPx = e.clientY - resizingBreak.startY;
                                  const deltaMin = Math.round((deltaPx / PX_PER_MIN) / 15) * 15;
                                  const newDuration = Math.min(120, Math.max(15, resizingBreak.initialDuration + deltaMin));
                                  if (newDuration !== resizingBreak.currentDuration) {
                                    setResizingBreak(prev => prev ? { ...prev, currentDuration: newDuration } : null);
                                    setBoards(prev => prev.map(b => {
                                      if (b.id !== resizingBreak.boardId) return b;
                                      const nextStudents = b.students.map(s => s.id === bs.id ? { ...s, duration: newDuration } : s);
                                      return recalculateBoardTimes({ ...b, students: nextStudents });
                                    }));
                                  }
                                }}
                                onPointerUp={(e) => {
                                  if (!resizingBreak || resizingBreak.breakId !== bs.id) return;
                                  e.preventDefault();
                                  e.stopPropagation();
                                  try {
                                    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                                  } catch {}
                                  pushUndoSnapshot();
                                  const finalDuration = resizingBreak.currentDuration;
                                  setResizingBreak(null);
                                  triggerDebouncedAutoSave(boards);
                                  setToast({
                                    message: `Pause auf ${finalDuration} Min angepasst (Folgetermine synchronisiert)`,
                                    type: 'success'
                                  });
                                }}
                                onPointerCancel={(e) => {
                                  if (!resizingBreak || resizingBreak.breakId !== bs.id) return;
                                  try {
                                    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                                  } catch {}
                                  const initDur = resizingBreak.initialDuration;
                                  setBoards(prev => prev.map(b => {
                                    if (b.id !== resizingBreak.boardId) return b;
                                    const nextStudents = b.students.map(s => s.id === bs.id ? { ...s, duration: initDur } : s);
                                    return recalculateBoardTimes({ ...b, students: nextStudents });
                                  }));
                                  setResizingBreak(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                                    e.preventDefault();
                                    const newDuration = Math.min(120, (bs.duration || 15) + 15);
                                    pushUndoSnapshot();
                                    setBoards(prev => prev.map(b => {
                                      if (b.id !== board.id) return b;
                                      const nextStudents = b.students.map(s => s.id === bs.id ? { ...s, duration: newDuration } : s);
                                      return recalculateBoardTimes({ ...b, students: nextStudents });
                                    }));
                                    setToast({ message: `Pause auf ${newDuration} Min verlängert`, type: 'success' });
                                  } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                                    e.preventDefault();
                                    const newDuration = Math.max(15, (bs.duration || 15) - 15);
                                    pushUndoSnapshot();
                                    setBoards(prev => prev.map(b => {
                                      if (b.id !== board.id) return b;
                                      const nextStudents = b.students.map(s => s.id === bs.id ? { ...s, duration: newDuration } : s);
                                      return recalculateBoardTimes({ ...b, students: nextStudents });
                                    }));
                                    setToast({ message: `Pause auf ${newDuration} Min verkürzt`, type: 'success' });
                                  }
                                }}
                                title="Pausenlänge durch Ziehen nach unten/oben anpassen (15m-Schritte) oder Pfeiltasten"
                                className="break-resize-handle"
                                style={{
                                  position: 'absolute',
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  height: '10px',
                                  cursor: 'ns-resize',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  zIndex: 15,
                                  touchAction: 'none',
                                  userSelect: 'none'
                                }}
                              >
                                <div style={{
                                  width: '28px',
                                  height: '3.5px',
                                  borderRadius: '2px',
                                  background: isCurrentlyResizingThis ? '#b45309' : 'rgba(217, 119, 6, 0.45)',
                                  transition: 'all 0.15s ease',
                                  boxShadow: isCurrentlyResizingThis ? '0 0 6px rgba(180, 83, 9, 0.4)' : 'none'
                                }} />
                              </div>
                            </div>
                          );
                        }

                        const isSubmitted = hasSubmittedSchedule && activeDraftId === submittedDraftId;
                        const isSelected = selectedStudentId === bs.id;
                        const isShaking = shakingStudentId === bs.id;

                        // Check if student is scheduled within a preferred ('wunsch') slot
                        let isInsideWunsch = false;
                        let isPartialWunsch = false;
                        const groupMemberIds = bs.isGroup && bs.groupStudents ? bs.groupStudents.map(gs => gs.id) : [];
                        const studPrefs = bs.isGroup
                          ? (groupMemberIds.flatMap(mId => allStudentPrefsMap[mId] || []).length > 0
                              ? groupMemberIds.flatMap(mId => allStudentPrefsMap[mId] || [])
                              : (selectedStudentId === bs.id ? selectedStudentPrefs : []))
                          : (allStudentPrefsMap[bs.id] || (selectedStudentId === bs.id ? selectedStudentPrefs : []));

                        if (studPrefs.length > 0) {
                          const [sh, sm] = parseTime(bs.assignedTime || board.startAnchor);
                          const startMin = sh * 60 + sm;
                          const endMin = startMin + bs.duration;

                          if (bs.isGroup && groupMemberIds.length > 1) {
                            let matchedCount = 0;
                            groupMemberIds.forEach(mId => {
                              const mPrefs = (allStudentPrefsMap[mId] || []).filter(p => p.preference_type === 'wunsch' && parseDayNumber(p.day_of_week) === parseDayNumber(board.dayOfWeek));
                              const matches = mPrefs.some(pref => {
                                const { startMin: prefStart, endMin: prefEnd } = getPrefStartEndMinutes(pref);
                                return startMin >= prefStart && endMin <= prefEnd;
                              });
                              if (matches) matchedCount++;
                            });

                            if (matchedCount === groupMemberIds.length && matchedCount > 0) {
                              isInsideWunsch = true;
                              isPartialWunsch = false;
                            } else {
                              isInsideWunsch = false;
                              isPartialWunsch = false;
                            }
                          } else {
                            const wunschPrefs = studPrefs.filter(p => p.preference_type === 'wunsch' && parseDayNumber(p.day_of_week) === parseDayNumber(board.dayOfWeek));
                            for (const pref of wunschPrefs) {
                              const { startMin: prefStart, endMin: prefEnd } = getPrefStartEndMinutes(pref);

                              if (startMin >= prefStart && endMin <= prefEnd) {
                                isInsideWunsch = true;
                                break;
                              }
                            }
                          }
                        }
                        
                        // Check teacher double booking:
                        // Does this teacher teach another student at the same time in another room on the same day?
                        let teacherConflictStudentName = '';
                        let teacherConflictRoomName = '';
                        if (bs.assignedTime) {
                          const [sh, sm] = parseTime(bs.assignedTime);
                          const startMin = sh * 60 + sm;
                          const endMin = startMin + bs.duration;

                          const sameDayIntervals = teacherBusyIntervals[board.dayOfWeek] || [];
                          const matched = sameDayIntervals.find((item: any) => 
                            item.boardId !== board.id && startMin < item.end && endMin > item.start
                          );
                          if (matched) {
                            teacherConflictStudentName = matched.studentName;
                            teacherConflictRoomName = matched.roomName;
                          }
                        }

                        // Check room conflict with OTHER teachers:
                        // Does another teacher have a scheduled lesson in this room at this time on this day?
                        let roomConflictTeacherName = '';
                        let roomConflictStudentName = '';
                        if (board.roomId && bs.assignedTime) {
                          const [sh, sm] = parseTime(bs.assignedTime);
                          const startMin = sh * 60 + sm;
                          const endMin = startMin + bs.duration;

                          const key = `${board.dayOfWeek}_${board.roomId}`;
                          const roomIntervals = otherTeachersRoomsIntervals[key] || [];
                          const matched = roomIntervals.find((item: any) => 
                            startMin < item.end && endMin > item.start
                          );
                          if (matched) {
                            roomConflictTeacherName = matched.teacherName;
                            roomConflictStudentName = matched.studentName;
                          }
                        }

                        // Check conflict with recurring external blocked slots
                        let blockedSlotReason = '';
                        if (board.roomId && bs.assignedTime) {
                          const [sh, sm] = parseTime(bs.assignedTime);
                          const startMin = sh * 60 + sm;
                          const endMin = startMin + bs.duration;

                          const matchedBlocked = blockedSlots.find((s: any) => {
                            if (s.room_id !== board.roomId) return false;
                            if (s.day_of_week !== board.dayOfWeek) return false;

                            const [bsh, bsm] = parseTime(s.start_time ? s.start_time.substring(0, 5) : '00:00');
                            const bStart = bsh * 60 + bsm;
                            const [beh, bem] = parseTime(s.end_time ? s.end_time.substring(0, 5) : '23:59');
                            const bEnd = beh * 60 + bem;

                            return startMin < bEnd && endMin > bStart;
                          });

                          if (matchedBlocked) {
                            blockedSlotReason = matchedBlocked.reason || 'Kooperation / Externe Blockierung';
                          }
                        }

                        // Check student's own Sperrzeit preference overlap
                        let isStudentSperrzeitConflict = false;
                        if (bs.assignedTime && studPrefs.length > 0) {
                          const [sh, sm] = parseTime(bs.assignedTime || board.startAnchor);
                          const startMin = sh * 60 + sm;
                          const endMin = startMin + bs.duration;

                          const gesperrtPrefs = studPrefs.filter(p => p.preference_type === 'gesperrt' && parseDayNumber(p.day_of_week) === parseDayNumber(board.dayOfWeek));
                          for (const pref of gesperrtPrefs) {
                            const { startMin: prefStart, endMin: prefEnd } = getPrefStartEndMinutes(pref);
                            if (startMin < prefEnd && endMin > prefStart) {
                              isStudentSperrzeitConflict = true;
                              break;
                            }
                          }
                        }

                        // Check overlap with another REAL student on the SAME board (excluding breaks/gaps!)
                        let sameBoardConflictStudentName = '';
                        if (bs.assignedTime && !bs.isBreak) {
                          const [sh, sm] = parseTime(bs.assignedTime);
                          const startMin = sh * 60 + sm;
                          const endMin = startMin + bs.duration;

                          const sameBoardOverlap = board.students.find(other => {
                            if (other.id === bs.id || other.isBreak) return false; // GAPS/BREAKS ARE NOT APPOINTMENTS!
                            if (!other.assignedTime) return false;
                            const [osh, osm] = parseTime(other.assignedTime);
                            const oStart = osh * 60 + osm;
                            const oEnd = oStart + other.duration;
                            return startMin < oEnd && endMin > oStart;
                          });

                          if (sameBoardOverlap) {
                            sameBoardConflictStudentName = `${sameBoardOverlap.first_name} ${maskLastName(sameBoardOverlap.last_name, showRealNames)}`;
                          }
                        }

                        const isTeacherConflict = teacherConflictStudentName !== '';
                        const isRoomConflict = roomConflictTeacherName !== '';
                        const isBlockedConflict = blockedSlotReason !== '';
                        const isSameBoardConflict = sameBoardConflictStudentName !== '';
                        const hasConflict = !bs.isBreak && (isTeacherConflict || isRoomConflict || isBlockedConflict || isStudentSperrzeitConflict || isSameBoardConflict);
                        const conflictMsg = isStudentSperrzeitConflict
                          ? `Sperrzeit-Kollision: ${bs.first_name || 'Schüler'} hat diesen Zeitraum als Sperrzeit angegeben!`
                          : (isBlockedConflict
                            ? `Gesperrt durch externe Blockierung: ${blockedSlotReason}`
                            : (isSameBoardConflict
                              ? `Doppelbelegung im selben Raum: Zeitgleich mit ${sameBoardConflictStudentName}`
                              : (isTeacherConflict
                                ? `Doppelbelegung Lehrkraft: Zeitgleich mit ${teacherConflictStudentName} in ${teacherConflictRoomName}`
                                : `Raumkonflikt: Raum besetzt durch Lehrkraft ${roomConflictTeacherName} (Schüler: ${roomConflictStudentName})`)));

                        const isCampusTheme = localStorage.getItem('groovelab_active_platform') === 'campus';
                        const isGroovelabTheme = localStorage.getItem('groovelab_active_platform') === 'groovelab';
                        const isAdminViewTheme = isSecretaryWorkspace;

                        const studentInPool = students.find((s: Student) => s.id === bs.id);
                        const isPendingOnboarding = (bs.status === 'ausstehend' || (studentInPool ? (studentInPool.status === 'ausstehend' || studentInPool.isOnboarded === false) : false)) && !studentInPool?.hasPreferences;

                        let cardPrimaryColor = isPendingOnboarding ? '#64748b' : '#34a853'; // Grey vs Campus Green
                        let cardLightBg = isPendingOnboarding ? 'rgba(100, 116, 139, 0.08)' : 'rgba(52, 168, 83, 0.06)';
                        let cardBorderColor = isPendingOnboarding ? 'rgba(100, 116, 139, 0.3)' : 'rgba(52, 168, 83, 0.2)';
                        let cardTextColor = isPendingOnboarding ? '#475569' : '#34a853';
                        let cardLightText = isPendingOnboarding ? '#334155' : '#1e3524';

                        if (!isPendingOnboarding) {
                          if (isGroovelabTheme) {
                            cardPrimaryColor = '#ca8a04'; // GrooveLab Dark Yellow
                            cardLightBg = 'rgba(254, 252, 232, 0.9)'; // Sleek yellow glassmorphism
                            cardBorderColor = 'rgba(234, 179, 8, 0.25)';
                            cardTextColor = '#854d0e';
                            cardLightText = '#422006';
                          } else if (!isCampusTheme) {
                            // Blue fallback
                            cardPrimaryColor = '#3b82f6';
                            cardLightBg = 'rgba(59, 130, 246, 0.06)';
                            cardBorderColor = 'rgba(59, 130, 246, 0.2)';
                            cardTextColor = '#1d4ed8';
                            cardLightText = '#1e3a8a';
                          } else {
                            cardPrimaryColor = '#34a853';
                            cardLightBg = 'rgba(52, 168, 83, 0.06)';
                            cardBorderColor = 'rgba(52, 168, 83, 0.2)';
                            cardTextColor = '#34a853';
                            cardLightText = '#1e3524';
                          }
                        }

                        const isCustomPlacement = !!bs.customStartTime;

                        const cardBg = hasConflict
                          ? '#ef4444'
                          : (isInsideWunsch
                              ? (isGroovelabTheme ? '#eab308' : '#22c55e')
                              : '#f8fafc');

                        const cardBorder = hasConflict
                          ? '1px solid #dc2626'
                          : (isInsideWunsch
                              ? (isGroovelabTheme ? '1px solid #ca8a04' : '1px solid #16a34a')
                              : (isSelected 
                                  ? `1.5px solid ${cardPrimaryColor}`
                                  : '1px solid #cbd5e1'));

                        const cardBorderLeft = hasConflict
                          ? '4px solid #b91c1c'
                          : (isInsideWunsch
                              ? '1px solid #16a34a'
                              : (isSelected
                                  ? `4px solid ${cardPrimaryColor}`
                                  : '1px solid #cbd5e1'));

                        const textColor = hasConflict || isInsideWunsch
                          ? '#ffffff'
                          : '#0f172a';

                        const badgeBg = hasConflict || isInsideWunsch
                          ? 'rgba(255, 255, 255, 0.25)'
                          : 'rgba(0, 0, 0, 0.06)';

                        const badgeColor = hasConflict || isInsideWunsch
                          ? '#ffffff'
                          : '#334155';

                        const cardShadow = hasConflict
                          ? '0 2px 8px rgba(239, 68, 68, 0.15)'
                          : (isInsideWunsch
                              ? '0 2px 8px rgba(34, 197, 94, 0.18)'
                              : (isSelected
                                  ? '0 4px 14px rgba(0, 0, 0, 0.08)'
                                  : '0 2px 8px rgba(0, 0, 0, 0.04)'));

                        const isSelectedForGroup = selectedForGroup.includes(bs.id);
                        const highlightColor = cardPrimaryColor;
                        const isGroupSelected = selectedStudentId === bs.id;

                        if (bs.isGroup) {
                          const groupBg = hasConflict
                            ? '#ef4444'
                            : (isInsideWunsch
                                ? (isGroovelabTheme ? '#eab308' : '#22c55e')
                                : '#f8fafc');

                          const groupBorder = hasConflict
                            ? '1px solid #dc2626'
                            : (isInsideWunsch
                                ? (isGroovelabTheme ? '1px solid #ca8a04' : '1px solid #16a34a')
                                : (draggedStudentId === bs.id ? '2px dashed #f59e0b' : (isGroupSelected ? '2px solid #16a34a' : '1px solid #cbd5e1')));

                          const groupBorderLeft = hasConflict
                            ? (isGroupSelected ? '5px solid #b91c1c' : '4px solid #b91c1c')
                            : (isInsideWunsch
                                ? '1px solid #16a34a'
                                : (isGroupSelected ? '5px solid #16a34a' : '1px solid #cbd5e1'));

                          const groupTimeColor = hasConflict || isInsideWunsch ? '#ffffff' : '#0f172a';
                          const groupTitleColor = hasConflict || isInsideWunsch ? '#ffffff' : '#0f172a';
                          const groupSubtextColor = hasConflict || isInsideWunsch ? 'rgba(255, 255, 255, 0.85)' : '#475569';
                          const groupBadgeBg = hasConflict || isInsideWunsch ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.06)';
                          const groupBadgeColor = hasConflict || isInsideWunsch ? '#ffffff' : '#334155';
                          const groupActionColor = hasConflict || isInsideWunsch ? '#ffffff' : '#64748b';

                          return (
                            <div
                              key={bs.id}
                              role="button"
                              tabIndex={0}
                              aria-label={`Geplanter Termin: ${bs.first_name || ''} ${maskLastName(bs.last_name || '', showRealNames)}, ${bs.assignedTime || ''}, ${bs.duration || 30} Minuten`}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  (e.currentTarget as HTMLElement).click();
                                }
                              }}
                              draggable={true}
                              onDragStart={(e) => handleDragStart(bs.id, 'board', board.id, e)}
                              onDragEnd={handleDragEnd}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAutoScrollCheck(e.clientY);
                                const rect = e.currentTarget.getBoundingClientRect();
                                const relY = (e.clientY - rect.top) / rect.height;
                                setDragOverBoardId(board.id);
                                setDragOverIndex(cardIndex);
                                setDragTargetStudentId(bs.id);
                                if (draggedStudentId && draggedStudentId !== bs.id && dragSource === 'board') {
                                  if (relY > 0.20 && relY < 0.80) {
                                    setDragTargetIntent('swap');
                                  } else if (relY <= 0.20) {
                                    setDragTargetIntent('before');
                                  } else {
                                    setDragTargetIntent('after');
                                  }
                                }
                              }}
                              onDragLeave={() => {
                                if (dragTargetStudentId === bs.id) {
                                  setDragTargetIntent(null);
                                  setDragTargetStudentId(null);
                                }
                              }}
                              onDrop={(e) => { 
                                e.stopPropagation(); 
                                const isSwapZone = dragTargetIntent === 'swap' && dragTargetStudentId === bs.id;
                                handleDropOnBoard(board.id, cardIndex, undefined, e.altKey || isSwapZone); 
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (swapPartnerPendingId) {
                                  handleExecuteInteractiveSwap(bs.id, board.id);
                                  return;
                                }
                                handleSelectStudent(bs.id);
                              }}
                              className={`${isShaking ? 'card-shake' : ''} designer-student-card`}
                              style={{
                                position: 'absolute', left: 0, right: 0,
                                top: `${Math.max(cardTopPx, 0)}px`,
                                height: `${Math.max(cardHeightPx, 32)}px`,
                                background: groupBg,
                                border: groupBorder,
                                borderRadius: '8px', padding: '5px 8px', boxSizing: 'border-box',
                                cursor: 'grab', display: 'flex', flexDirection: 'column',
                                justifyContent: 'center', gap: '2px',
                                zIndex: 2,
                                visibility: 'visible',
                                opacity: draggedStudentId === bs.id ? 0.25 : 1,
                                boxShadow: hasConflict ? '0 2px 8px rgba(239, 68, 68, 0.15)' : (isInsideWunsch ? '0 2px 8px rgba(52, 168, 83, 0.18)' : (isSelected ? `0 0 10px ${cardPrimaryColor}40` : '0 2px 6px rgba(0,0,0,0.03)')),
                                transform: (dragTargetIntent === 'swap' && dragTargetStudentId === bs.id) 
                                  ? 'scale(0.98)' 
                                  : (isCardShifted ? `translateY(${shiftPx}px)` : 'none'),
                                transition: draggedStudentId ? 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)' : 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                                willChange: 'transform, top',
                                overflow: 'hidden',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: groupTimeColor, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Users size={11} color="currentColor" />
                                  <span>{bs.assignedTime}</span>
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  {!bs.group_id && (
                                    <button
                                      type="button"
                                      onClick={() => handleUngroupBlock(board.id, bs.id)}
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: groupActionColor,
                                        fontSize: '0.62rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        padding: '2px 4px',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '2px'
                                      }}
                                      title="Gruppe aufteilen"
                                    >
                                      Aufteilen
                                    </button>
                                  )}
                                   <span 
                                     style={{ 
                                       background: groupBadgeBg, 
                                       borderRadius: '5px', 
                                       padding: '1px 5px', 
                                       fontSize: '0.62rem', 
                                       fontWeight: 800, 
                                       color: groupBadgeColor,
                                       display: 'flex',
                                       alignItems: 'center',
                                       gap: '3px'
                                     }}
                                     title={isInsideWunsch ? "Gruppe liegt auf Wunschtermin!" : "Gruppe liegt auf Ausweichtermin"}
                                   >
                                     <Users size={9} style={{ opacity: 0.85 }} />
                                     {isInsideWunsch ? (
                                       <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                         <Star size={7} fill="currentColor" color="currentColor" />
                                         <span>Wunsch</span>
                                       </span>
                                     ) : (
                                       <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                         <span style={{ width: '5px', height: '5px', borderRadius: '50%', border: '1px solid currentColor', display: 'inline-block' }} />
                                         <span>Ausweich</span>
                                       </span>
                                     )}
                                     <span>{bs.duration}m</span>
                                   </span>
                                  <button 
                                    type="button" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      handleRemoveStudentFromBoard(board.id, bs.id);
                                    }}
                                    style={{ background: 'transparent', border: 'none', color: groupActionColor, display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '1px', opacity: 0.8 }}
                                    title="Entfernen"
                                  >
                                    <X size={11} strokeWidth={2.5} />
                                  </button>
                                </div>
                              </div>
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: groupTitleColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {bs.isGroup && bs.groupStudents && bs.groupStudents.length > 0
                                  ? bs.groupStudents.map(s => `${s.first_name || ''} ${maskLastName(s.last_name || '', showRealNames)}`.trim()).filter(Boolean).join(' & ')
                                  : ((bs.first_name || (bs as any).name || 'Gruppe').trim())}
                              </span>

                              {/* 🍏 Apple Dual-Zone Visual Swap Indicator Overlay for Groups */}
                              {dragTargetIntent === 'swap' && dragTargetStudentId === bs.id && (
                                <div style={{
                                  position: 'absolute',
                                  inset: 0,
                                  background: 'rgba(37, 99, 235, 0.15)',
                                  backdropFilter: 'blur(2px)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  color: '#1d4ed8',
                                  fontWeight: 800,
                                  fontSize: '0.72rem',
                                  borderRadius: '8px',
                                  pointerEvents: 'none',
                                  zIndex: 20
                                }}>
                                  <ArrowLeftRight size={14} strokeWidth={2.6} />
                                  <span>1:1 Tausch</span>
                                </div>
                              )}
                            </div>
                          );
                        }

                        const finalBorder = isGroupModeActive && isSelectedForGroup
                          ? `2.5px solid ${highlightColor}`
                          : cardBorder;
                        const finalShadow = isGroupModeActive && isSelectedForGroup
                          ? `0 0 12px ${highlightColor}`
                          : cardShadow;

                        // Compute dynamic column dropzone outline: Slate gray for neutral, Campus Green for Wunschzeit, Red for Sperrzeit
                        let colOutlineColor = '#cbd5e1';
                        let colBgColor = 'rgba(248, 250, 252, 0.7)';

                        if (dragOverBoardId === board.id && dragSnapState && selectedStudentPrefs && selectedStudentPrefs.length > 0) {
                          const [th, tm] = parseTime(dragSnapState.timeStr);
                          const startM = th * 60 + tm;
                          const endM = startM + dragSnapState.duration;
                          let hWunsch = false;
                          let hBlocked = false;

                          selectedStudentPrefs.forEach(pref => {
                            if (Number(pref.day_of_week) === Number(board.dayOfWeek)) {
                              const [psh, psm] = parseTime(pref.start_time);
                              const [peh, pem] = parseTime(pref.end_time);
                              const pStart = psh * 60 + psm;
                              const pEnd = peh * 60 + pem;

                              if (pref.preference_type === 'gesperrt') {
                                if (startM < pEnd && endM > pStart) {
                                  hBlocked = true;
                                }
                              } else if (pref.preference_type === 'wunsch') {
                                if (startM >= pStart && endM <= pEnd) {
                                  hWunsch = true;
                                }
                              }
                            }
                          });

                          if (hBlocked) {
                            colOutlineColor = '#ef4444';
                            colBgColor = 'rgba(254, 242, 242, 0.7)';
                          } else if (hWunsch) {
                            colOutlineColor = '#34a853';
                            colBgColor = 'rgba(230, 244, 234, 0.7)';
                          }
                        }

                        let displayAssignedTime = bs.assignedTime || '14:00';
                        let isLiveShiftedPreview = false;

                        if (isCardShifted) {
                          isLiveShiftedPreview = true;
                          const [origH, origM] = parseTime(bs.assignedTime || board.startAnchor);
                          const newTotalMins = origH * 60 + origM + shiftMins;
                          displayAssignedTime = `${String(Math.floor(newTotalMins / 60) % 24).padStart(2, '0')}:${String(newTotalMins % 60).padStart(2, '0')}`;
                        }

                        return (
                          <div
                            key={bs.id}
                            draggable={true}
                            onMouseDown={(e) => {
                               const rect = e.currentTarget.getBoundingClientRect();
                               grabOffsetRef.current = e.clientY - rect.top;
                               (e.currentTarget as HTMLElement).style.cursor = 'grabbing';
                             }}
                            onMouseUp={(e) => {
                              (e.currentTarget as HTMLElement).style.cursor = isGroupModeActive ? 'pointer' : 'grab';
                            }}
                            onDragStart={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              grabOffsetRef.current = e.clientY - rect.top;
                              handleDragStart(bs.id, 'board', board.id, e);
                            }}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleAutoScrollCheck(e.clientY);
                              const rect = e.currentTarget.getBoundingClientRect();
                              const relY = (e.clientY - rect.top) / rect.height;
                              setDragOverBoardId(board.id);
                              setDragOverIndex(cardIndex);
                              setDragTargetStudentId(bs.id);
                              if (draggedStudentId && draggedStudentId !== bs.id && dragSource === 'board') {
                                if (relY > 0.20 && relY < 0.80) {
                                  setDragTargetIntent('swap');
                                } else if (relY <= 0.20) {
                                  setDragTargetIntent('before');
                                } else {
                                  setDragTargetIntent('after');
                                }
                              }
                            }}
                            onDragLeave={() => {
                              if (dragTargetStudentId === bs.id) {
                                setDragTargetIntent(null);
                                setDragTargetStudentId(null);
                              }
                            }}
                            onDrop={(e) => { 
                              e.stopPropagation(); 
                              const snapTime = (dragSnapState && dragSnapState.boardId === board.id) ? dragSnapState.timeStr : undefined;
                              setDragSnapState(null);
                              const isSwapZone = dragTargetIntent === 'swap' && dragTargetStudentId === bs.id;
                              handleDropOnBoard(board.id, cardIndex, snapTime, e.altKey || isSwapZone); 
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (swapPartnerPendingId) {
                                handleExecuteInteractiveSwap(bs.id, board.id);
                                return;
                              }
                              if (isGroupModeActive) {
                                handleToggleSelectForGroup(bs.id, board.id);
                              } else {
                                handleSelectStudent(bs.id);
                                setQuickActionStudentId(prev => prev === bs.id ? null : bs.id);
                                setQuickActionBoardId(board.id);
                              }
                            }}
                            className={`${isShaking ? 'card-shake' : ''} ${hasConflict ? 'conflict-pulse-card' : ''} designer-student-card`}
                            style={{
                              position: 'absolute', left: 0, right: 0,
                              top: `${Math.max(cardTopPx, 0)}px`,
                              height: `${Math.max(cardHeightPx, 32)}px`,
                              background: (dragTargetIntent === 'swap' && dragTargetStudentId === bs.id)
                                ? 'linear-gradient(135deg, rgba(52, 168, 83, 0.2) 0%, rgba(34, 197, 94, 0.3) 100%)'
                                : (swapPartnerPendingId === bs.id ? '#f0fdf4' : cardBg),
                              border: (dragTargetIntent === 'swap' && dragTargetStudentId === bs.id)
                                ? '2px dashed #16a34a'
                                : (swapPartnerPendingId === bs.id
                                    ? '2px solid #34a853'
                                    : (draggedStudentId === bs.id ? '2px dashed #16a34a' : (isSelected ? '2px solid #16a34a' : finalBorder))),
                              borderRadius: '8px', padding: '5px 8px', boxSizing: 'border-box',
                              cursor: isGroupModeActive ? 'pointer' : (swapPartnerPendingId ? 'pointer' : 'grab'), display: 'flex', flexDirection: 'column',
                              justifyContent: 'center', gap: '2px',
                              zIndex: draggedStudentId === bs.id ? 50 : ((dragTargetIntent === 'swap' && dragTargetStudentId === bs.id) ? 40 : (isSelected ? 10 : 2)),
                              userSelect: 'none',
                              WebkitUserSelect: 'none',
                              WebkitTouchCallout: 'none',
                              touchAction: 'manipulation',
                              visibility: 'visible',
                              opacity: draggedStudentId === bs.id 
                                ? 0.25 
                                : (selectedStudentId !== null ? (selectedStudentId === bs.id ? 1 : 0.40) : 1),
                              filter: (selectedStudentId !== null && selectedStudentId !== bs.id && draggedStudentId !== bs.id && dragTargetStudentId !== bs.id) ? 'saturate(60%)' : 'none',
                              pointerEvents: 'auto',
                              transform: (dragTargetIntent === 'swap' && dragTargetStudentId === bs.id) 
                                ? 'scale(0.98)' 
                                : (isCardShifted ? `translateY(${shiftPx}px)` : (isSelected ? 'scale(1.015)' : 'none')),
                              overflow: 'visible',
                              boxShadow: (dragTargetIntent === 'swap' && dragTargetStudentId === bs.id)
                                ? '0 0 16px rgba(52, 168, 83, 0.4)'
                                : (swapPartnerPendingId === bs.id
                                    ? '0 0 0 3px rgba(52, 168, 83, 0.25), 0 4px 14px rgba(52, 168, 83, 0.2)'
                                    : (isSelected ? '0 4px 16px rgba(22, 163, 74, 0.25)' : (draggedStudentId === bs.id ? '0 8px 24px rgba(22, 163, 74, 0.3)' : finalShadow))),
                              transition: draggedStudentId ? 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)' : 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                              willChange: 'transform, top',
                            }}
                            onMouseOver={e => {
                              if (!isSelected && selectedStudentId !== null) {
                                e.currentTarget.style.opacity = '0.90';
                                e.currentTarget.style.filter = 'none';
                              }
                              if (!isSelected) {
                                e.currentTarget.style.boxShadow = hasConflict ? '0 4px 14px rgba(239, 68, 68, 0.25)' : '0 4px 14px rgba(0, 0, 0, 0.08)';
                              }
                            }}
                            onMouseOut={e => {
                              if (!isSelected && selectedStudentId !== null) {
                                e.currentTarget.style.opacity = '0.40';
                                e.currentTarget.style.filter = 'saturate(60%)';
                              }
                              if (!isSelected) {
                                e.currentTarget.style.boxShadow = cardShadow;
                              }
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: textColor, display: 'flex', alignItems: 'center', gap: '4px', pointerEvents: 'auto' }}>
                                {hasConflict && (
                                  <span style={{ color: '#ef4444', cursor: 'help', display: 'inline-flex', alignItems: 'center' }} title={conflictMsg}>
                                    <AlertCircle size={12} color="#ef4444" />
                                  </span>
                                )}
                                {editingTimeStudent?.studentId === bs.id && editingTimeStudent?.boardId === board.id ? (
                                  <input
                                    type="time"
                                    autoFocus
                                    defaultValue={bs.customStartTime || bs.assignedTime || '14:00'}
                                    onPointerDown={e => e.stopPropagation()}
                                    onClick={e => e.stopPropagation()}
                                    onChange={(e) => {
                                      const newTime = e.target.value;
                                      if (newTime) {
                                        setBoards(prev => prev.map(b => {
                                          if (b.id !== board.id) return b;
                                          const nextStudents = b.students.map(s => s.id === bs.id ? { ...s, customStartTime: newTime } : s);
                                          return recalculateBoardTimes({ ...b, students: nextStudents });
                                        }));
                                        setEditingTimeStudent(null);
                                        setToast({ message: `Startzeit für ${bs.first_name || 'Schüler'} auf ${newTime} Uhr fixiert!`, type: 'success' });
                                      }
                                    }}
                                    onBlur={() => setEditingTimeStudent(null)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === 'Escape') {
                                        setEditingTimeStudent(null);
                                      }
                                    }}
                                    style={{
                                      fontSize: '0.72rem',
                                      fontWeight: 800,
                                      padding: '1px 4px',
                                      borderRadius: '4px',
                                      border: `1.5px solid ${brandColor}`,
                                      outline: 'none',
                                      background: '#ffffff',
                                      color: '#1d1d1f',
                                      pointerEvents: 'auto',
                                      cursor: 'pointer',
                                      width: '68px'
                                    }}
                                  />
                                ) : (
                                  <span
                                    style={{
                                      fontSize: '0.72rem',
                                      fontWeight: 800,
                                      color: isLiveShiftedPreview ? '#f59e0b' : textColor,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      pointerEvents: 'none',
                                      transition: 'color 0.15s ease'
                                    }}
                                  >
                                    <span>{displayAssignedTime}</span>
                                    {isLiveShiftedPreview && (
                                      <span style={{ fontSize: '0.55rem', fontWeight: 900, background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.5)', color: '#d97706', padding: '0px 4px', borderRadius: '3px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                        Neu
                                      </span>
                                    )}
                                    {isSelected && <Clock size={10} style={{ opacity: 0.8 }} />}
                                  </span>
                                )}
                              </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', pointerEvents: 'auto' }}>
                              {isStudentSperrzeitConflict && (
                                <span
                                  style={{
                                    fontSize: '0.58rem',
                                    fontWeight: 700,
                                    color: '#b91c1c',
                                    background: '#fee2e2',
                                    padding: '1px 4px',
                                    borderRadius: '3px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                    pointerEvents: 'none'
                                  }}
                                  title="Sperrzeit-Konflikt!"
                                >
                                  <AlertCircle size={10} color="#b91c1c" />
                                  <span>Sperrzeit</span>
                                </span>
                              )}
                              <span 
                                style={{ 
                                  fontSize: '0.62rem', 
                                  fontWeight: 800, 
                                  color: badgeColor, 
                                  background: badgeBg, 
                                  padding: '1px 5px', 
                                  borderRadius: '4px', 
                                  pointerEvents: 'none', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '3px' 
                                }}
                                title={isInsideWunsch ? "Wunschtermin garantiert getroffen!" : "Eingeteilt als Ausweichtermin (außerhalb der Wunschzeit)"}
                              >
                                {isInsideWunsch ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                    <Star size={8} fill="currentColor" color="currentColor" />
                                    <span>Wunsch</span>
                                  </span>
                                ) : (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', border: '1px solid currentColor', display: 'inline-block' }} />
                                    <span>Ausweich</span>
                                  </span>
                                )}
                                <span>{bs.duration}m</span>
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setBoards(prev => prev.map(b => {
                                    if (b.id !== board.id) return b;
                                    const nextStudents = b.students.map(s => {
                                      if (s.id !== bs.id) return s;
                                      const newPinned = !s.isPinned;
                                      return {
                                        ...s,
                                        isPinned: newPinned,
                                        customStartTime: newPinned ? (s.customStartTime || s.assignedTime || '14:00') : undefined
                                      };
                                    });
                                    return recalculateBoardTimes({ ...b, students: nextStudents });
                                  }));
                                  setToast({
                                    message: !bs.isPinned 
                                      ? `Uhrzeit ${bs.assignedTime || '14:00'} für ${bs.first_name || 'Schüler'} fixiert!` 
                                      : `Fixierung für ${bs.first_name || 'Schüler'} gelöst.`,
                                    type: 'success'
                                  });
                                }}
                                style={{
                                  background: bs.isPinned ? 'rgba(234, 179, 8, 0.2)' : 'transparent',
                                  border: 'none',
                                  color: bs.isPinned ? '#ca8a04' : badgeColor,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  padding: '3px',
                                  borderRadius: '4px',
                                  opacity: bs.isPinned ? 1 : 0.65,
                                  pointerEvents: 'auto'
                                }}
                                title={bs.isPinned ? "Fixierte Uhrzeit (Klick zum Lösen)" : "Uhrzeit fixieren (Pin)"}
                              >
                                <Pin size={11} strokeWidth={2.5} style={{ transform: bs.isPinned ? 'rotate(45deg)' : 'none' }} />
                              </button>
                              <button 
                                type="button" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleRemoveStudentFromBoard(board.id, bs.id);
                                }}
                                style={{ 
                                  background: 'transparent', 
                                  border: 'none', 
                                  color: badgeColor, 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  cursor: 'pointer', 
                                  padding: '4px', 
                                  minWidth: '28px',
                                  minHeight: '28px',
                                  borderRadius: '6px',
                                  opacity: 0.7, 
                                  pointerEvents: 'auto' 
                                }}
                                onMouseOver={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                                onMouseOut={e => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; (e.currentTarget as HTMLElement).style.color = badgeColor; }}
                                title="Entfernen"
                              >
                                <X size={12} strokeWidth={2.5} />
                              </button>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '4px', pointerEvents: 'none' }}>
                            <InstrumentBadge instrument={resolveInstrument(bs.instrument)} color={textColor} />
                            {(bs.first_name || (bs as any).name || (bs as any).full_name || 'Schüler').trim()} {maskLastName(bs.last_name || '', showRealNames)}
                          </span>
                          {cardHeightPx > 52 && (
                            <span style={{ fontSize: '0.62rem', fontWeight: 600, color: isInsideWunsch ? 'rgba(255,255,255,0.85)' : (hasConflict ? '#991b1b' : (isSubmitted ? cardPrimaryColor : cardTextColor)), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none' }}>{resolveInstrument(bs.instrument)}</span>
                          )}

                          {/* 🍏 Apple Dual-Zone Visual Swap Indicator Overlay */}
                          {dragTargetIntent === 'swap' && dragTargetStudentId === bs.id && (
                            <div style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'rgba(52, 168, 83, 0.15)',
                              backdropFilter: 'blur(2px)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              color: '#15803d',
                              fontWeight: 800,
                              fontSize: '0.72rem',
                              borderRadius: '8px',
                              pointerEvents: 'none',
                              zIndex: 20
                            }}>
                              <ArrowLeftRight size={14} strokeWidth={2.6} />
                              <span>1:1 Tausch</span>
                            </div>
                          )}

                          {/* 🍏 Interactive Swap Badges */}
                          {swapPartnerPendingId === bs.id && (
                            <div style={{
                              position: 'absolute',
                              top: '3px',
                              right: '3px',
                              background: '#15803d',
                              color: '#ffffff',
                              fontSize: '0.58rem',
                              fontWeight: 800,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              boxShadow: '0 1px 4px rgba(21, 128, 61, 0.35)',
                              pointerEvents: 'none',
                              zIndex: 15
                            }}>
                              <ArrowLeftRight size={9} strokeWidth={2.6} />
                              <span>Ausgewählt</span>
                            </div>
                          )}

                          {swapPartnerPendingId && swapPartnerPendingId !== bs.id && !bs.isBreak && (
                            <div style={{
                              position: 'absolute',
                              top: '3px',
                              right: '3px',
                              background: 'rgba(52, 168, 83, 0.12)',
                              border: '1px solid #86efac',
                              color: '#15803d',
                              fontSize: '0.58rem',
                              fontWeight: 800,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              pointerEvents: 'none',
                              zIndex: 15
                            }}>
                              <ArrowLeftRight size={9} strokeWidth={2.6} />
                              <span>Tauschen</span>
                            </div>
                          )}

                          {/* 🍏 Apple Quick Action Popover (No-Drag Klick-Alternative - Light Campus Theme) */}
                          {quickActionStudentId === bs.id && !draggedStudentId && (
                            <div 
                              onClick={e => e.stopPropagation()}
                              style={{
                                position: 'absolute',
                                top: 'calc(100% + 6px)',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: '#ffffff',
                                color: '#0f172a',
                                borderRadius: '12px',
                                padding: '5px 7px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.04)',
                                zIndex: 100,
                                whiteSpace: 'nowrap',
                                animation: 'floating-slide-up 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                              }}
                            >
                              {/* -15m */}
                              <button
                                type="button"
                                onClick={() => handleQuickAdjustStudentTime(board.id, bs.id, -15)}
                                style={{
                                  background: '#f1f5f9',
                                  border: '1px solid #e2e8f0',
                                  color: '#0f172a',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  padding: '4px 7px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseOver={e => { e.currentTarget.style.background = '#e2e8f0'; }}
                                onMouseOut={e => { e.currentTarget.style.background = '#f1f5f9'; }}
                                title="15 Minuten früher"
                              >
                                -15m
                              </button>

                              {/* +15m */}
                              <button
                                type="button"
                                onClick={() => handleQuickAdjustStudentTime(board.id, bs.id, 15)}
                                style={{
                                  background: '#f1f5f9',
                                  border: '1px solid #e2e8f0',
                                  color: '#0f172a',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  padding: '4px 7px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseOver={e => { e.currentTarget.style.background = '#e2e8f0'; }}
                                onMouseOut={e => { e.currentTarget.style.background = '#f1f5f9'; }}
                                title="15 Minuten später"
                              >
                                +15m
                              </button>

                              {/* Tauschen (Campus-Grün) */}
                              <button
                                type="button"
                                onClick={() => handleStartInteractiveSwap(bs.id, board.id)}
                                style={{
                                  background: '#34a853',
                                  border: '1px solid #2e9549',
                                  color: '#ffffff',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  boxShadow: '0 1px 3px rgba(52, 168, 83, 0.35)',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseOver={e => { e.currentTarget.style.background = '#2e9549'; }}
                                onMouseOut={e => { e.currentTarget.style.background = '#34a853'; }}
                                title="Mit anderem Schüler 1:1 tauschen"
                              >
                                <ArrowLeftRight size={11} strokeWidth={2.4} />
                                <span>Tauschen</span>
                              </button>

                              {/* Pause davor */}
                              <button
                                type="button"
                                onClick={() => handleQuickInsertBreakBefore(board.id, bs.id)}
                                style={{
                                  background: '#fef9c3',
                                  border: '1px solid #fef08a',
                                  color: '#854d0e',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  padding: '4px 7px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseOver={e => { e.currentTarget.style.background = '#fef08a'; }}
                                onMouseOut={e => { e.currentTarget.style.background = '#fef9c3'; }}
                                title="15 Min. Pause davor einfügen"
                              >
                                <Coffee size={11} />
                                <span>Pause</span>
                              </button>

                              {/* Schließen */}
                              <button
                                type="button"
                                onClick={() => setQuickActionStudentId(null)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#64748b',
                                  padding: '3px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  borderRadius: '4px',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseOver={e => { e.currentTarget.style.color = '#0f172a'; }}
                                onMouseOut={e => { e.currentTarget.style.color = '#64748b'; }}
                                title="Schließen"
                              >
                                <X size={11} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                      {/* Drag insertion indicator line */}
                      {(() => {
                        if (dragOverBoardId !== board.id || dragOverIndex === null) return null;
                        const lineColor = brandColor;
                        
                        let topPx = 0;
                        if (dragSnapState && dragSnapState.boardId === board.id) {
                          topPx = dragSnapState.topPx;
                        } else if (dragOverIndex !== null && dragOverIndex < board.students.length) {
                          const targetStudent = board.students[dragOverIndex];
                          const [sh, sm] = parseTime(targetStudent.assignedTime || board.startAnchor);
                          topPx = (sh * 60 + sm - startMinutes) * PX_PER_MIN;
                        } else if (board.students.length > 0) {
                          const lastStudent = board.students[board.students.length - 1];
                          const [sh, sm] = parseTime(lastStudent.assignedTime || board.startAnchor);
                          topPx = (sh * 60 + sm - startMinutes) * PX_PER_MIN + lastStudent.duration * PX_PER_MIN;
                        }
                        
                        return (
                          <div 
                            style={{
                              position: 'absolute',
                              left: '4px',
                              right: '4px',
                              top: `${Math.max(topPx - 2, 0)}px`,
                              height: '3px',
                              background: lineColor,
                              borderRadius: '1.5px',
                              zIndex: 25,
                              pointerEvents: 'none',
                              boxShadow: `0 0 12px ${lineColor}`,
                              animation: 'pulse-glowing-line 1.5s infinite alternate'
                            }}
                          >
                            <div style={{ position: 'absolute', left: '-4px', top: '-2px', width: '7px', height: '7px', borderRadius: '50%', background: lineColor, boxShadow: `0 0 6px ${lineColor}` }} />
                            
                            {/* 🍏 Apple Wish/Blocked Micro-HUD floating indicator */}
                            {draggedStudentId && (
                              <div style={{
                                position: 'absolute',
                                right: '4px',
                                top: '-22px',
                                background: '#1d1d1f',
                                color: '#ffffff',
                                padding: '2px 7px',
                                borderRadius: '6px',
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                whiteSpace: 'nowrap'
                              }}>
                                {selectedStudentPrefs.some(p => Number(p.day_of_week) === Number(board.dayOfWeek) && p.preference_type === 'wunsch') ? (
                                  <>
                                    <Star size={8} fill="#22c55e" color="#22c55e" />
                                    <span style={{ color: '#4ade80' }}>Wunschzeit</span>
                                  </>
                                ) : selectedStudentPrefs.some(p => Number(p.day_of_week) === Number(board.dayOfWeek) && p.preference_type === 'gesperrt') ? (
                                  <>
                                    <AlertCircle size={8} color="#f87171" />
                                    <span style={{ color: '#f87171' }}>Sperrzeit</span>
                                  </>
                                ) : (
                                  <span style={{ color: '#cbd5e1' }}>Ausweichzeit</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Column summary */}
                    {board.students.length > 0 && (
                      <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '6px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#86868b' }}>
                        <span>Dauer:</span>
                        <span style={{ color: '#1d1d1f', fontWeight: 800 }}>
                          {(() => {
                            const total = board.students.reduce((acc, curr) => acc + curr.duration, 0);
                            const hrs = Math.floor(total / 60);
                            const mins = total % 60;
                            return hrs > 0 ? `${hrs} h ${mins} m` : `${mins} m`;
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                );
              });
            })()}

              {boards.length === 0 && (
                <div style={{ flex: 1, background: 'rgba(255, 255, 255, 0.4)', border: '1.5px dashed rgba(0, 0, 0, 0.08)', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '36px', textAlign: 'center', minHeight: '400px' }}>
                  <Sparkles size={28} style={{ color: '#eab308', marginBottom: '12px' }} />
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1d1d1f' }}>Noch keine Unterrichtstage</h4>
                  <p style={{ color: '#86868b', fontSize: '0.78rem', fontWeight: 500, marginTop: '6px', maxWidth: '300px', lineHeight: 1.35 }}>
                    Klicke oben auf „Tag anlegen“, um geplante Unterrichtstage hinzuzufügen.
                  </p>
                </div>
              )}
            </div>
            </div>

            {/* Sidebar Student Pool */}
            {isPoolCollapsed ? (
              <div 
                id="tour-student-pool" 
                onClick={() => setIsPoolManuallyCollapsed(false)}
                style={{ 
                  background: 'rgba(255, 255, 255, 0.75)', 
                  backdropFilter: 'blur(20px) saturate(190%)', 
                  WebkitBackdropFilter: 'blur(20px) saturate(190%)',
                  borderRadius: '20px', 
                  border: '1px solid rgba(255, 255, 255, 0.6)', 
                  padding: '16px 6px', 
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.03)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '12px', 
                  position: 'sticky', 
                  top: '16px', 
                  height: 'fit-content',
                  cursor: 'pointer',
                  width: '44px',
                  userSelect: 'none',
                  transition: 'all 0.2s'
                }}
                title="Schüler-Pool ausklappen"
              >
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: currentUnassigned.length === 0 ? 'rgba(52, 168, 83, 0.12)' : 'rgba(245, 158, 11, 0.12)', color: currentUnassigned.length === 0 ? '#15803d' : '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {currentUnassigned.length === 0 ? <CheckCircle size={15} /> : <Users size={15} />}
                </div>
                <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: '0.74rem', fontWeight: 800, color: '#475569', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Schüler-Pool</span>
                  <span style={{ background: currentUnassigned.length === 0 ? '#dcfce7' : '#fef3c7', color: currentUnassigned.length === 0 ? '#166534' : '#92400e', padding: '2px 5px', borderRadius: '4px', fontSize: '0.62rem' }}>
                    {currentUnassigned.length}
                  </span>
                </div>
                <ChevronLeft size={14} style={{ color: '#94a3b8', marginTop: '12px' }} />
              </div>
            ) : (
              <div id="tour-student-pool" style={{ 
                background: 'rgba(255, 255, 255, 0.55)', 
                backdropFilter: 'blur(20px) saturate(190%)', 
                WebkitBackdropFilter: 'blur(20px) saturate(190%)',
                borderRadius: '20px', 
                border: '1px solid rgba(255, 255, 255, 0.5)', 
                padding: '14px', 
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.03)', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '12px', 
                position: 'sticky', 
                top: '16px', 
                height: 'fit-content' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1d1d1f', margin: 0 }}>
                      Schüler-Pool ({students.length})
                    </h4>
                    <p style={{ color: '#86868b', fontSize: '0.68rem', fontWeight: 500, marginTop: '1px' }}>
                      Drag & Drop auf die Spalten.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPoolManuallyCollapsed(true)}
                    style={{ border: 'none', background: 'rgba(0,0,0,0.04)', borderRadius: '6px', padding: '4px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Schüler-Pool einklappen"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>

              {/* Draggable Pause item */}
              <div
                id="tour-special-features"
                draggable
                onDragStart={(e) => handleDragStart('sidebar-pause', 'sidebar', undefined, e)}
                onDragEnd={handleDragEnd}
                style={{
                  background: 'rgba(254, 243, 199, 0.5)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1.5px dashed rgba(245, 158, 11, 0.4)',
                  borderRadius: '10px',
                  padding: '6px 10px',
                  cursor: 'grab',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.02)',
                  transition: 'all 0.2s',
                  userSelect: 'none'
                }}
              >
                <Coffee size={13} color="#b45309" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b45309', flex: 1 }}>
                  Pause herausziehen
                </span>
                <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#d97706', background: 'rgba(254, 243, 199, 0.8)', padding: '1px 4px', borderRadius: '4px' }}>
                  DRAG
                </span>
              </div>

              {/* Search input field */}
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#86868b' }} />
                <input
                  type="text"
                  placeholder="Suchen..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(0, 0, 0, 0.08)', borderRadius: '10px', padding: '6px 10px 6px 28px', fontSize: '0.72rem', fontWeight: 600, outline: 'none' }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: '#86868b', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Sidebar Category Tabs */}
              <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.04)', padding: '2px', borderRadius: '10px', gap: '2px' }}>
                <button
                  type="button"
                  onClick={() => setSidebarTab('unassigned')}
                  style={{ flex: 1, border: 'none', padding: '4px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', background: sidebarTab === 'unassigned' ? 'white' : 'transparent', color: sidebarTab === 'unassigned' ? '#1d1d1f' : '#86868b', boxShadow: sidebarTab === 'unassigned' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.2s' }}
                >
                  Offen ({unassignedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarTab('assigned')}
                  style={{ flex: 1, border: 'none', padding: '4px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', background: sidebarTab === 'assigned' ? 'white' : 'transparent', color: sidebarTab === 'assigned' ? '#1d1d1f' : '#86868b', boxShadow: sidebarTab === 'assigned' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.2s' }}
                >
                  Verteilt
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarTab('all')}
                  style={{ flex: 1, border: 'none', padding: '4px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', background: sidebarTab === 'all' ? 'white' : 'transparent', color: sidebarTab === 'all' ? '#1d1d1f' : '#86868b', boxShadow: sidebarTab === 'all' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.2s' }}
                >
                  Alle
                </button>
              </div>



              {/* Sidebar Student cards list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: 'calc(100vh - 280px)', minHeight: '450px', overflowY: 'auto', paddingRight: '2px' }}>
                {filteredStudents.map(s => {
                  const isAssigned = !!s.assignedDay;
                  const assignedDayLabel = isAssigned ? DAYS_OF_WEEK.find(d => d.value === s.assignedDay)?.name : '';
                  const isSelected = selectedStudentId === s.id;
                  const isShaking = shakingStudentId === s.id;

                  return (
                    <div
                      key={s.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Schüler ${s.first_name} ${maskLastName(s.last_name, showRealNames)}, ${s.instrument || 'Instrument'}, ${s.duration || 30} Minuten${isSelected ? ', ausgewählt für Zuweisung' : ''}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          (e.currentTarget as HTMLElement).click();
                        }
                      }}
                      draggable={true}
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => {
                        (e.currentTarget as HTMLElement).style.cursor = 'grabbing';
                      }}
                      onMouseUp={(e) => {
                        (e.currentTarget as HTMLElement).style.cursor = 'grab';
                      }}
                      onDragStart={(e) => handleDragStart(s.id, 'sidebar', undefined, e)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!draggedStudentId) {
                          handleSelectStudent(s.id);
                        }
                      }}
                      className={isShaking ? 'card-shake' : ''}
                      style={{ 
                        background: '#ffffff', 
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        borderTop: isSelected ? `1.5px solid ${brandColor}` : '1px solid rgba(0, 0, 0, 0.08)', 
                        borderRight: isSelected ? `1.5px solid ${brandColor}` : '1px solid rgba(0, 0, 0, 0.08)', 
                        borderBottom: isSelected ? `1.5px solid ${brandColor}` : '1px solid rgba(0, 0, 0, 0.08)', 
                        borderLeft: s.hasPreferences
                          ? `4px solid ${brandColor}`
                          : '4px solid #94a3b8', 
                        borderRadius: '8px', 
                        padding: '6px 8px', 
                        cursor: 'grab', 
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        opacity: isSelected ? 1 : (isAssigned ? 0.75 : 1), 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '4px',
                        boxShadow: isSelected 
                          ? '0 4px 14px rgba(0, 0, 0, 0.08)'
                          : '0 2px 8px rgba(0, 0, 0, 0.04)',
                        transition: 'opacity 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1d1d1f', display: 'block', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '4px', pointerEvents: 'none' }}>
                          {(s.first_name || (s as any).name || (s as any).full_name || 'Schüler').trim()} {maskLastName(s.last_name || '', showRealNames)}
                        </span>
                        {failedStudentIds.includes(s.id) ? (
                          (() => {
                            const sPrefs = (allStudentPrefsMap[s.id] || []);
                            const hasSperrzeit = sPrefs.some((p: any) => p.preference_type === 'gesperrt');
                            if (hasSperrzeit) {
                              return (
                                <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', padding: '1.5px 6px', borderRadius: '5px', textTransform: 'uppercase', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '3px', pointerEvents: 'none' }} title="Dieser Schüler konnte wegen Sperrzeit-Kollision nicht eingeteilt werden. Sende erneut den Onboarding-Link oder erweitere deine Unterrichtszeiten.">
                                  <Ban size={9} color="#dc2626" />
                                  <span>Sperrzeit-Konflikt</span>
                                </span>
                              );
                            }
                            return (
                              <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#d97706', background: '#fffbe8', border: '1px solid #fde68a', padding: '1.5px 6px', borderRadius: '5px', textTransform: 'uppercase', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '3px', pointerEvents: 'none' }} title="Dieser Schüler hat keine Sperrzeiten, konnte aber wegen voller Tages-Kapazität nicht automatisch eingeteilt werden. Erweitere deine Unterrichtszeiten.">
                                <AlertCircle size={9} color="#d97706" />
                                <span>Nicht zugeteilt</span>
                              </span>
                            );
                          })()
                        ) : s.hasPreferences ? (
                          <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#166534', background: '#e6f4ea', border: '1px solid #bbf7d0', padding: '1.5px 6px', borderRadius: '5px', textTransform: 'uppercase', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '3px', pointerEvents: 'none' }} title="Wunsch- & Sperrzeiten gemeldet (Stundenplan-Onboarding abgeschlossen)">
                            <Star size={9} color="currentColor" />
                            <span>Zeiten da</span>
                          </span>
                        ) : null}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none' }}>
                        <span style={{ fontSize: '0.62rem', fontWeight: 600, color: '#86868b', pointerEvents: 'none' }}>
                          {s.duration} Min • {resolveInstrument(s.instrument)}
                        </span>

                        {isAssigned && (
                          <span style={{ fontSize: '0.58rem', fontWeight: 600, color: '#34a853', background: 'rgba(230, 244, 234, 0.6)', padding: '1px 4px', borderRadius: '4px', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em', pointerEvents: 'none' }} title={`${assignedDayLabel} um ${s.assignedTime}`}>
                            {assignedDayLabel} {s.assignedTime}
                          </span>
                        )}
                      </div>

                      {isSelected && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                          {selectedStudentNote && (
                            <div style={{
                              padding: '6px 8px',
                              borderRadius: '6px',
                              background: '#fffbeb',
                              border: '1px solid #fde68a',
                              color: '#b45309',
                              fontSize: '0.62rem',
                              fontWeight: 650,
                              lineHeight: '1.3',
                              textAlign: 'left',
                              wordBreak: 'break-word'
                            }}>
                              <Info size={11} color="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} />
                              <strong>Eltern-Notiz:</strong> {selectedStudentNote}
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                            {s.hasPreferences ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSlotsStudent(s);
                                }}
                                style={{
                                  flex: 1,
                                  padding: '5px 10px',
                                  background: '#f1f5f9',
                                  color: '#334155',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '6px',
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '5px',
                                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                                  transition: 'all 0.15s'
                                }}
                                className="hover-scale-mini"
                                title="Klicken, um die eingereichten Wunsch- und Sperrzeiten dieses Schülers anzuzeigen und anzupassen"
                              >
                                <Clock size={11} color="#475569" /> Eingereichte Zeiten
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const inviteLink = getParentOnboardingUrl(schoolProfile?.name || 'Stadtmusikschule', schoolProfile?.subdomain);
                                  navigator.clipboard.writeText(inviteLink);
                                  await showAlert("Onboarding-Link kopiert! Du kannst diesen Link jetzt an die Eltern senden: " + inviteLink);
                                }}
                                style={{
                                  flex: 1,
                                  padding: '5px 10px',
                                  background: '#f8fafc',
                                  color: '#64748b',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '6px',
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s'
                                }}
                                className="hover-scale-mini"
                              >
                                Onboarding-Link kopieren
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '16px 8px', border: '1.5px dashed rgba(0, 0, 0, 0.08)', borderRadius: '12px', color: '#86868b' }}>
                    <Info size={16} style={{ margin: '0 auto 4px auto', display: 'block', color: '#c7c7cc' }} />
                    <p style={{ fontSize: '0.7rem', fontWeight: 600 }}>Keine Schüler</p>
                  </div>
                )}
              </div>
            </div>
            )}

          </div>
            );
          })()}

        </>
      )}
        </div>
      )}

      {/* Fallback rendering of deleteBreakState modal */}
      {deleteBreakState && (() => {
        const primaryColor = brandColor;
        const bgAccent = isCampus ? '#e6f4ea' : (isGroovelab ? '#fefce8' : '#fce8e6');
        
        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ 
              background: '#ffffff', 
              padding: '28px', 
              borderRadius: '24px', 
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)', 
              width: '420px', 
              maxWidth: '90vw', 
              border: '1px solid rgba(0,0,0,0.08)', 
              display: 'flex', 
              flexDirection: 'column',
              gap: '16px', 
              alignItems: 'center',
              textAlign: 'center',
              boxSizing: 'border-box' 
            }}>
              <h3 style={{ marginTop: 0, marginBottom: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>
                Pause entfernen
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#515154', lineHeight: 1.5 }}>
                Wie soll mit der entstandenen Lücke verfahren werden?
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '8px' }}>
                <button
                  onClick={() => {
                    executeRemoveBreak(deleteBreakState.boardId, deleteBreakState.breakId, true);
                    setDeleteBreakState(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    border: 'none',
                    background: primaryColor,
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: `0 4px 12px ${primaryColor}30`
                  }}
                  onMouseOver={e => e.currentTarget.style.filter = 'brightness(0.9)'}
                  onMouseOut={e => e.currentTarget.style.filter = 'none'}
                >
                  Folgetermine aufrutschen lassen (Lücke füllen)
                </button>

                <button
                  onClick={() => {
                    executeRemoveBreak(deleteBreakState.boardId, deleteBreakState.breakId, false);
                    setDeleteBreakState(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    border: `1.5px solid ${primaryColor}`,
                    background: 'transparent',
                    color: primaryColor,
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = bgAccent}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  Lücke belassen (Terminzeiten einfrieren)
                </button>

                <button
                  onClick={() => setDeleteBreakState(null)}
                  style={{
                    width: '100%',
                    padding: '10px 20px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'transparent',
                    color: '#86868b',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                  onMouseOut={e => e.currentTarget.style.color = '#86868b'}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Fallback rendering of deleteBreakState modal when dropDecisionState is not active */}
      {!dropDecisionState && deleteBreakState && (() => {
        const primaryColor = brandColor;
        const bgAccent = isCampus ? '#e6f4ea' : (isGroovelab ? '#fefce8' : '#fce8e6');
        
        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ 
              background: '#ffffff', 
              padding: '28px', 
              borderRadius: '24px', 
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)', 
              width: '420px', 
              maxWidth: '90vw', 
              border: '1px solid rgba(0,0,0,0.08)', 
              display: 'flex', 
              flexDirection: 'column',
              gap: '16px', 
              alignItems: 'center',
              textAlign: 'center',
              boxSizing: 'border-box' 
            }}>
              <h3 style={{ marginTop: 0, marginBottom: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>
                Pause entfernen
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#515154', lineHeight: 1.5 }}>
                Wie soll mit der entstandenen Lücke verfahren werden?
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '8px' }}>
                <button
                  onClick={() => {
                    executeRemoveBreak(deleteBreakState.boardId, deleteBreakState.breakId, true);
                    setDeleteBreakState(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    border: 'none',
                    background: primaryColor,
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: `0 4px 12px ${primaryColor}30`
                  }}
                  onMouseOver={e => e.currentTarget.style.filter = 'brightness(0.9)'}
                  onMouseOut={e => e.currentTarget.style.filter = 'none'}
                >
                  Folgetermine aufrutschen lassen (Lücke füllen)
                </button>

                <button
                  onClick={() => {
                    executeRemoveBreak(deleteBreakState.boardId, deleteBreakState.breakId, false);
                    setDeleteBreakState(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    border: `1.5px solid ${primaryColor}`,
                    background: 'transparent',
                    color: primaryColor,
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = bgAccent}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  Lücke belassen (Terminzeiten einfrieren)
                </button>

                <button
                  onClick={() => setDeleteBreakState(null)}
                  style={{
                    width: '100%',
                    padding: '10px 20px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'transparent',
                    color: '#86868b',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                  onMouseOut={e => e.currentTarget.style.color = '#86868b'}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {instrumentSelectorState && (() => {
        const primaryColor = brandColor;
        const studentObj = students.find(s => s.id === instrumentSelectorState.sourceId);
        const studentName = studentObj ? `${studentObj.first_name} ${maskLastName(studentObj.last_name, showRealNames)}` : 'Schüler';

        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              background: '#ffffff',
              padding: '28px',
              borderRadius: '24px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
              width: '400px',
              maxWidth: '90vw',
              border: '1px solid rgba(0,0,0,0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', textAlign: 'center' }}>
                Instrument auswählen
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#515154', textAlign: 'center', lineHeight: 1.4 }}>
                Bitte wähle das Instrument für diese Unterrichtsstunde von <strong>{studentName}</strong>:
              </p>
              <select
                value={selectedDropInstrument}
                onChange={(e) => setSelectedDropInstrument(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: '#1e293b'
                }}
              >
                {instrumentSelectorState.instruments.map(i => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  onClick={() => setInstrumentSelectorState(null)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    background: 'transparent',
                    color: '#64748b',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => {
                    const { sourceId, targetBoardId, index, dragSource, dragSourceBoardId } = instrumentSelectorState;
                    setInstrumentSelectorState(null);
                    executeStandardDrop(sourceId, targetBoardId, index, dragSource, dragSourceBoardId, selectedDropInstrument);
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    background: primaryColor,
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Zuweisen
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(20px) saturate(190%)',
          WebkitBackdropFilter: 'blur(20px) saturate(190%)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderLeft: '4px solid #ef4444',
          padding: '12px 18px',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 99999,
          animation: 'swissSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1f2937' }}>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', color: '#9ca3af', padding: 0, marginLeft: '6px' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {dialogConfig && (() => {
        return (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes scaleIn {
                from { transform: scale(0.95); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
              }
              .dialog-btn:hover {
                opacity: 0.95;
                transform: translateY(-0.5px);
              }
              .dialog-btn:active {
                transform: translateY(0);
              }
            `}</style>
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                padding: '24px 28px',
                maxWidth: '440px',
                width: '90%',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
                animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                border: '1px solid rgba(0, 0, 0, 0.05)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: lightBg,
                  color: brandColor,
                  flexShrink: 0
                }}>
                  <AlertCircle size={20} style={{ color: brandColor }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: '#1f2937'
                  }}>
                    {dialogConfig.type === 'confirm' ? 'Bestätigung' : 'Hinweis'}
                  </h3>
                  <p style={{
                    margin: 0,
                    fontSize: '0.9rem',
                    lineHeight: '1.5',
                    color: '#4b5563',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {dialogConfig.message}
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
                {dialogConfig.type === 'confirm' && (
                  <button
                    className="dialog-btn"
                    onClick={() => {
                      const resolve = dialogConfig.resolve;
                      setDialogConfig(null);
                      resolve(false);
                    }}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '10px',
                      border: '1px solid #e5e7eb',
                      backgroundColor: '#ffffff',
                      color: '#374151',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {dialogConfig.cancelLabel || 'Nein'}
                  </button>
                )}
                <button
                  className="dialog-btn"
                  onClick={() => {
                    const resolve = dialogConfig.resolve;
                    setDialogConfig(null);
                    resolve(true);
                  }}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: brandColor,
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: `0 4px 12px ${brandColor}30`,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {dialogConfig.confirmLabel || (dialogConfig.type === 'confirm' ? 'Ja' : 'OK')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

        {editingBreak && (
          <div 
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 99999
            }}
            onClick={() => setEditingBreak(null)}
          >
            <div 
              style={{
                background: '#ffffff', borderRadius: '16px', padding: '24px',
                width: '360px', maxWidth: '90vw', boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                border: '1px solid #fef08a'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Coffee size={16} color="currentColor" />
                  <span>Pause anpassen</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingBreak(null)}
                  style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#4b5563', marginBottom: '6px' }}>
                    Startzeit der Pause (Anker):
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="time"
                      value={editingBreak.startTime}
                      onChange={(e) => setEditingBreak(prev => prev ? { ...prev, startTime: e.target.value } : null)}
                      style={{
                        flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #fde047',
                        fontSize: '0.95rem', fontWeight: 700, color: '#b45309', outline: 'none', background: '#fefce8'
                      }}
                    />
                    {editingBreak.startTime && (
                      <button
                        type="button"
                        onClick={() => setEditingBreak(prev => prev ? { ...prev, startTime: '' } : null)}
                        style={{ background: '#f3f4f6', border: 'none', padding: '8px 10px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700, color: '#6b7280', cursor: 'pointer' }}
                        title="Startzeit freigeben (automatisch nach vorherigem Schüler)"
                      >
                        Automatisch
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#4b5563', marginBottom: '6px' }}>
                    Dauer der Pause:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                    {[15, 30, 45, 60].map(dur => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setEditingBreak(prev => prev ? { ...prev, duration: dur } : null)}
                        style={{
                          padding: '8px', borderRadius: '8px', border: editingBreak.duration === dur ? '2px solid #eab308' : '1px solid #e5e7eb',
                          background: editingBreak.duration === dur ? '#fefce8' : '#ffffff',
                          color: editingBreak.duration === dur ? '#b45309' : '#374151',
                          fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                      >
                        {dur}m
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!editingBreak) return;
                      const snappedStart = editingBreak.startTime ? snapTimeToGrid(editingBreak.startTime, gridSnapMinutes) : undefined;
                      setBoards(prev => prev.map(b => {
                        if (b.id !== editingBreak.boardId) return b;
                        const nextStudents = b.students.map(s => {
                          if (s.id !== editingBreak.breakId) return s;
                          return {
                            ...s,
                            customStartTime: snappedStart,
                            duration: editingBreak.duration
                          };
                        });
                        return recalculateBoardTimes({ ...b, students: nextStudents });
                      }));
                      setEditingBreak(null);
                    }}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '10px', background: '#eab308', color: '#0f172a',
                      border: 'none', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer', boxShadow: '0 4px 10px rgba(234,179,8,0.3)'
                    }}
                  >
                    Pause Speichern
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Student Schedule Slots Modal */}
        {selectedSlotsStudent && (
          <React.Suspense fallback={null}>
            <StudentScheduleSlotsModal
              student={selectedSlotsStudent}
              onClose={() => setSelectedSlotsStudent(null)}
              onPreferencesSaved={() => {
                setSelectedSlotsStudent(null);
              }}
            />
          </React.Suspense>
        )}

        {/* Apple Glass New Draft Prompt Modal */}
        {showNewDraftPromptModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.25s ease-out'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '28px 32px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 25px 70px rgba(0, 0, 0, 0.15)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              position: 'relative'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: '#e8f0fe',
                    border: '1px solid #d2e3fc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#1a73e8',
                    boxShadow: '0 4px 12px rgba(26, 115, 232, 0.12)'
                  }}>
                    <Calendar size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1d1d1f', margin: 0, letterSpacing: '-0.02em' }}>
                      Neuen Entwurf anlegen
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#515154', margin: '2px 0 0 0', fontWeight: 600 }}>
                      Entwurf {drafts.length + 1} erstellen
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewDraftPromptModal(false)}
                  style={{
                    background: '#f5f5f7',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#86868b',
                    cursor: 'pointer'
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Message */}
              <p style={{ fontSize: '0.92rem', color: '#334155', lineHeight: 1.55, margin: 0, fontWeight: 500 }}>
                Möchtest du die <strong>gleichen Unterrichtstermine und Zeiten</strong> deines aktuellen Plans für den neuen Entwurf übernehmen?
              </p>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleConfirmNewDraft(true)}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 18px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(22, 163, 74, 0.25)',
                    transition: 'all 0.15s'
                  }}
                  className="hover-scale-mini"
                >
                  <CheckCircle size={16} />
                  <span>Ja, Zeiten & Wochentage übernehmen</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleConfirmNewDraft(false)}
                  style={{
                    width: '100%',
                    background: '#f8fafc',
                    color: '#334155',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '12px 18px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s'
                  }}
                  className="hover-scale-mini"
                >
                  <Sliders size={16} color="#64748b" />
                  <span>Nein, neue Zeiten festlegen</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Partial Submit Enterprise Review Modal */}
        {showPartialSubmitModal && partialSubmitData && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.25s ease-out'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '28px 32px',
              maxWidth: '540px',
              width: '100%',
              boxShadow: '0 25px 70px rgba(0, 0, 0, 0.18)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: '#fef3c7',
                    border: '1px solid #fde68a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#d97706',
                    boxShadow: '0 4px 12px rgba(217, 119, 6, 0.15)'
                  }}>
                    <AlertCircle size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1d1d1f', margin: 0, letterSpacing: '-0.02em' }}>
                      Stundenplan mit offenen Schülern einreichen?
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: '#92400e', margin: '2px 0 0 0', fontWeight: 700 }}>
                      {partialSubmitData.unassignedStudents.length} von {partialSubmitData.totalStudents} Schülern noch nicht zugeteilt
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPartialSubmitModal(false)}
                  style={{
                    background: '#f5f5f7',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#86868b',
                    cursor: 'pointer'
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Message */}
              <p style={{ fontSize: '0.86rem', color: '#475569', lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
                Folgende <strong>{partialSubmitData.unassignedStudents.length} Schüler</strong> sind auf keinem deiner Unterrichtstage eingeteilt:
              </p>

              {/* Unassigned Students List */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                maxHeight: '180px',
                overflowY: 'auto',
                padding: '8px',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
              }}>
                {partialSubmitData.unassignedStudents.map((s, idx) => (
                  <div
                    key={s.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {s.first_name ? s.first_name[0] : 'S'}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                          {s.first_name} {maskLastName(s.last_name, showRealNames)}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                          {s.instrument || 'Musiker'} • {s.duration || 30} Min
                        </div>
                      </div>
                    </div>
                    <div style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: s.hasPreferences ? '#dcfce7' : '#f1f5f9',
                      color: s.hasPreferences ? '#15803d' : '#64748b'
                    }}>
                      {s.hasPreferences ? 'Wunschzeit da' : 'Keine Wunschzeit'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Explanatory Callout */}
              <div style={{
                background: 'rgba(234, 179, 8, 0.08)',
                border: '1px solid rgba(234, 179, 8, 0.25)',
                borderRadius: '12px',
                padding: '10px 14px',
                fontSize: '0.76rem',
                color: '#854d0e',
                lineHeight: 1.45
              }}>
                <Info size={13} style={{ display: 'inline-block', verticalAlign: 'text-bottom', marginRight: '5px' }} /><strong>Zero-Data-Loss Garantie:</strong> Wenn du jetzt einreichst, wird dein aktueller Stand mit {partialSubmitData.totalAssigned} Schülern an die Verwaltung gesendet. Alle offenen Schüler <strong>verbleiben sicher in deinem Schüler-Pool</strong> und fliegen niemals aus der Liste.
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowPartialSubmitModal(false);
                    setSidebarTab('unassigned');
                  }}
                  style={{
                    flex: 1,
                    padding: '11px 16px',
                    borderRadius: '12px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'}
                  onMouseOut={e => e.currentTarget.style.background = '#f1f5f9'}
                >
                  Abbrechen & Zuteilen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPartialSubmitModal(false);
                    executeLockAndSend();
                  }}
                  style={{
                    flex: 1.2,
                    padding: '11px 16px',
                    borderRadius: '12px',
                    background: isCampus
                      ? 'linear-gradient(135deg, #34a853 0%, #2e7d32 100%)'
                      : (isGroovelab
                        ? 'linear-gradient(135deg, #eab308 0%, #d97706 100%)'
                        : 'linear-gradient(135deg, #ea4335 0%, #c62828 100%)'),
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'none'}
                >
                  <Send size={13} />
                  <span>Als Teilplan einreichen ➔</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Apple Glass Auto-Schedule Report Scorecard Modal */}
        {showAutoScheduleReportModal && autoScheduleReportData && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.25s ease-out'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '28px 32px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 25px 70px rgba(0, 0, 0, 0.15)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '22px',
              position: 'relative'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: '#e6f4ea',
                    border: '1px solid #ceead6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#34a853',
                    boxShadow: '0 4px 12px rgba(52, 168, 83, 0.12)'
                  }}>
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1d1d1f', margin: 0, letterSpacing: '-0.02em' }}>
                      Stundenplan-Analyse
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#515154', margin: '2px 0 0 0', fontWeight: 600 }}>
                      Automatische Zuteilung erfolgreich berechnet!
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAutoScheduleReportModal(false)}
                  style={{
                    background: '#f5f5f7',
                    border: 'none',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#86868b',
                    transition: 'all 0.15s'
                  }}
                  className="hover-scale-mini"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Hero Overall Score Badge */}
              <div style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #e6f4ea 100%)',
                border: '1.5px solid #bbf7d0',
                borderRadius: '18px',
                padding: '18px 22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Urbanist' }}>
                    Gesamt-Qualität
                  </div>
                  <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#15803d', letterSpacing: '-0.03em', marginTop: '2px' }}>
                    {autoScheduleReportData.overallScore} <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>/ 100 Punkte</span>
                  </div>
                </div>
                <div style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  background: '#ffffff',
                  color: '#15803d',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  border: '1px solid #bbf7d0',
                  boxShadow: '0 4px 12px rgba(34, 197, 94, 0.1)'
                }}>
                  {autoScheduleReportData.overallScore >= 90 ? 'Exzellent' : 'Sehr gut'}
                </div>
              </div>

              {/* 4 Grid Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* 1. Einteilungsquote */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#15803d', fontSize: '0.75rem', fontWeight: 800 }}>
                    <CheckCircle size={13} color="#34a853" /> Einteilungsquote
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1d1d1f' }}>
                    {Math.round((autoScheduleReportData.totalAssigned / Math.max(1, autoScheduleReportData.totalStudents)) * 100)} %
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                    {autoScheduleReportData.totalAssigned} von {autoScheduleReportData.totalStudents} Schülern eingeteilt
                  </div>
                </div>

                {/* 2. Lückenlosigkeit */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0284c7', fontSize: '0.75rem', fontWeight: 800 }}>
                    <Zap size={13} color="#0ea5e9" /> Lückenlosigkeit
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1d1d1f' }}>
                    {autoScheduleReportData.gapCount === 0 
                      ? '0 Lücken (0 Min)' 
                      : `${autoScheduleReportData.gapCount} ${autoScheduleReportData.gapCount === 1 ? 'Lücke' : 'Lücken'} (${autoScheduleReportData.totalGapsMin} Min)`}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                    {autoScheduleReportData.gapCount === 0 ? '100% Lückenloser Tagesplan' : `${autoScheduleReportData.totalGapsMin} Min Ungeplanter Leerlauf`}
                  </div>
                </div>

                {/* 3. Wunschzeiten */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontSize: '0.75rem', fontWeight: 800 }}>
                    <Star size={13} fill="#22c55e" color="#16a34a" /> Wunschzeiten
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1d1d1f' }}>
                    {autoScheduleReportData.wunschHits} / {autoScheduleReportData.studentsWithWunsch ?? autoScheduleReportData.totalAssigned}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                    {autoScheduleReportData.theoreticalMaxWunschHits && autoScheduleReportData.theoreticalMaxWunschHits < (autoScheduleReportData.studentsWithWunsch ?? autoScheduleReportData.totalAssigned)
                      ? `Max. möglich: ${autoScheduleReportData.theoreticalMaxWunschHits} (Überbuchung/Sperrzeiten)`
                      : 'Wunschfenster voll erfüllt'}
                  </div>
                </div>

                {/* 4. Geschwister */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#7c3aed', fontSize: '0.75rem', fontWeight: 800 }}>
                    <Users size={13} color="#8b5cf6" /> Geschwister
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1d1d1f' }}>
                    {autoScheduleReportData.totalSiblings > 0 ? `${autoScheduleReportData.siblingHits} / ${autoScheduleReportData.totalSiblings} Paare` : 'Keine Paare'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                    Direkt hintereinander
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => setShowAutoScheduleReportModal(false)}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '14px',
                  background: '#34a853',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 6px 20px rgba(22, 163, 74, 0.25)',
                  transition: 'all 0.15s'
                }}
                className="hover-scale-mini"
              >
                <Sparkles size={16} /> Plan übernehmen
              </button>
            </div>
          </div>
        )}

            {/* 🍏 Apple Glass Solver Loading Overlay */}
        {isSolverRunning && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '32px 36px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 25px 70px rgba(0, 0, 0, 0.18)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '18px'
            }}>
              {/* Animated Shimmer Badge */}
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #e6f4ea 0%, #d1fae5 100%)',
                border: '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34a853',
                boxShadow: '0 6px 18px rgba(52, 168, 83, 0.18)'
              }}>
                <Sparkles size={28} className="animate-spin-slow" />
              </div>

              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1d1d1f', margin: 0, letterSpacing: '-0.02em' }}>
                  Stundenplan wird optimiert...
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '6px 0 0 0', fontWeight: 600 }}>
                  {solverStageText}
                </p>
              </div>

              {/* Progress Bar */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <div style={{
                  width: '100%',
                  height: '10px',
                  background: '#f1f5f9',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  position: 'relative',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${solverProgress}%`,
                    background: 'linear-gradient(90deg, #34a853 0%, #22c55e 100%)',
                    borderRadius: '10px',
                    transition: 'width 0.15s ease-out',
                    boxShadow: '0 0 12px rgba(52, 168, 83, 0.4)'
                  }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#166534', fontFamily: 'Urbanist, sans-serif' }}>
                  <span>15-STUFEN GROSSMEISTER SOLVER</span>
                  <span>{solverProgress}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 🏛️ Modal: Stundenplan ablehnen / Klärungsbedarf mitteilen */}
        {showRejectModal && (
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-modal-title"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowRejectModal(false);
              }
            }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10000,
              background: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '28px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.15)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#dc2626'
                  }}>
                    <AlertCircle size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h3 id="reject-modal-title" style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
                      Stundenplan ablehnen / Klärung
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0', fontWeight: 600 }}>
                      Der Stundenplan wird zurück an die Lehrkraft übermittelt.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseOver={e => { e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; }}
                  onMouseOut={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }}
                  aria-label="Schließen"
                >
                  <X size={16} strokeWidth={2.4} />
                </button>
              </div>

              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px 14px', fontSize: '0.78rem', color: '#991b1b', lineHeight: 1.45 }}>
                <strong>Hinweis:</strong> Alle eingeteilten Schüler verbleiben vollständig im Entwurf der Lehrkraft. Die Lehrkraft erhält die Aufforderung, sich mit dem Schulsekretariat in Verbindung zu setzen.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="reject-note-input" style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569' }}>
                  Begründung / Nachricht an die Lehrkraft (optional):
                </label>
                <textarea
                  id="reject-note-input"
                  value={rejectNoteInput}
                  onChange={e => setRejectNoteInput(e.target.value)}
                  placeholder="Der Stundenplan wurde abgelehnt. Bitte setzen Sie sich mit dem Schulsekretariat in Verbindung."
                  rows={3}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    fontSize: '0.8rem',
                    color: '#0f172a',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  disabled={submitting}
                  style={{
                    background: 'rgba(0, 0, 0, 0.05)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '8px 16px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleRejectScheduleByAdmin}
                  disabled={submitting}
                  style={{
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '8px 18px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)'
                  }}
                >
                  <X size={14} strokeWidth={2.5} />
                  <span>{submitting ? 'Wird übermittelt...' : 'Plan ablehnen & benachrichtigen'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calendar' ? <CalendarTourComponent /> : <DesignerTourComponent />}

        {/* Hinweis didaktisches Koordinierungsinstrument */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 16px', margin: '14px auto 4px auto', background: 'rgba(255, 255, 255, 0.7)', border: '1px solid rgba(0, 0, 0, 0.05)', borderRadius: '12px', maxWidth: '780px', width: '100%', boxSizing: 'border-box' }}>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textAlign: 'center', lineHeight: 1.4 }}>
            <strong>Hinweis:</strong> Der Stundenplan-Designer ist ein pädagogisches Koordinierungsinstrument zur Abstimmung von Unterrichtseinheiten und ersetzt kein betriebliches Arbeitszeiterfassungssystem.
          </span>
        </div>

    </div>
  );
}
