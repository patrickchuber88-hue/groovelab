import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePremiumOnboardingTour, TourStartButton, TourStep } from './PremiumOnboardingTour';
import { supabase, deleteUserStorageAssets } from '../lib/supabase';
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
  Grid3X3
} from 'lucide-react';
import jsPDF from 'jspdf';
import { useRealNamesVisibility, maskLastName } from '../utils/nameHelper';
import { ScheduleCalendarView } from './ScheduleCalendarView';
import { StudentScheduleSlotsModal } from './StudentScheduleSlotsModal';
import { run15StageSolver } from '../engine/Schedule15StageSolverEngine';
export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  instrument: string;
  duration: number; // Duration in minutes (e.g. 30, 45, 60)
  assignedDay?: number; // 1 = Mon, 2 = Tue, etc.
  assignedTime?: string; // e.g. "14:30"
  isBreak?: boolean;
  customStartTime?: string;
  isPinned?: boolean;
  preferenceMatch?: 'first' | 'secondary' | 'deviation';
  status?: 'ausstehend' | 'verplant' | 'aktiv' | 'in_bearbeitung';
  isGroup?: boolean;
  groupStudents?: Student[];
  sibling_group_id?: string;
  group_id?: string | null;
  isOnboarded?: boolean;
  hasPreferences?: boolean;
}

export interface DayBoard {
  id: string; // unique board id
  dayOfWeek: number; // 1 = Monday, 2 = Tuesday, etc.
  startAnchor: string; // e.g. "14:00"
  endAnchor?: string;
  availabilityEnd?: string; // hard limit for teacher's day
  roomId?: string; // room associated with this board
  students: Student[]; // Ordered list of assigned students
}

interface Room {
  id: string;
  name: string;
}

interface ScheduleBoardProps {
  schoolId: string;
  userId: string;
}

const parseTime = (timeStr: string | null | undefined, fallback = '14:00'): [number, number] => {
  const str = timeStr || fallback || '14:00';
  if (!str || typeof str !== 'string' || !str.includes(':')) return [14, 0];
  const parts = str.split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return [14, 0];
  return [parts[0], parts[1]];
};

const getPrefStartEndMinutes = (pref: any): { startMin: number; endMin: number } => {
  if (!pref) return { startMin: 0, endMin: 0 };
  const [sh, sm] = parseTime(pref.start_time);
  let [eh, em] = parseTime(pref.end_time || pref.start_time);
  let startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  if (endMin <= startMin) {
    endMin = startMin + 120;
  }
  return { startMin, endMin };
};

const parseDayNumber = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const num = Number(val);
  if (!isNaN(num)) return num;
  const str = String(val).trim().toLowerCase();
  if (str.includes('mon')) return 1;
  if (str.includes('die') || str.includes('tue')) return 2;
  if (str.includes('mit') || str.includes('wed')) return 3;
  if (str.includes('don') || str.includes('thu')) return 4;
  if (str.includes('fre') || str.includes('fri')) return 5;
  if (str.includes('sam') || str.includes('sat')) return 6;
  if (str.includes('son') || str.includes('sun')) return 7;
  return 0;
};

const resolveFirstName = (s: any): string => {
  if (s && s.first_name && typeof s.first_name === 'string' && s.first_name.trim()) return s.first_name.trim();
  const fullName = s?.full_name || s?.name || s?.display_name || '';
  if (fullName && typeof fullName === 'string' && fullName.trim()) return fullName.trim().split(' ')[0];
  return 'Schüler';
};

const resolveLastName = (s: any): string => {
  if (s && s.last_name && typeof s.last_name === 'string' && s.last_name.trim()) return s.last_name.trim();
  const fullName = s?.full_name || s?.name || s?.display_name || '';
  if (fullName && typeof fullName === 'string' && fullName.trim().includes(' ')) return fullName.trim().split(' ').slice(1).join(' ');
  return '';
};

const formatMinutes = (totalMins: number): string => {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

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

export function ScheduleBoard({ schoolId, userId }: ScheduleBoardProps) {
  const { visible: showRealNames, toggleVisibility: toggleRealNames } = useRealNamesVisibility();

  // Main state
  const [activeTab, setActiveTab] = useState<'calendar' | 'designer'>('calendar');

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
  const [boards, setBoards] = useState<DayBoard[]>([]);
  const [undoStack, setUndoStack] = useState<{ boards: DayBoard[]; students: Student[] }[]>([]);
  const [drafts, setDrafts] = useState<{ id: string; name: string; boards: DayBoard[] }[]>([]);

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
    setToast({ message: 'Änderung rückgängig gemacht ↩️', type: 'success' });
  };
  const [activeDraftId, setActiveDraftId] = useState<string>('default');
  const [submittedDraftId, setSubmittedDraftId] = useState<string>('');
  const lastSavedStateRef = useRef<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarTab, setSidebarTab] = useState<'all' | 'unassigned' | 'assigned'>('unassigned');
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);

  // Teacher selector states
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(userId);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  
  // Create Board form state
  const [newBoardDay, setNewBoardDay] = useState(1);
  const [newBoardStart, setNewBoardStart] = useState('14:00');
  const [newBoardEnd, setNewBoardEnd] = useState('20:00');
  const [newBoardRoom, setNewBoardRoom] = useState('');
  const [showAddBoardForm, setShowAddBoardForm] = useState(false);
  const [showNewDraftPromptModal, setShowNewDraftPromptModal] = useState<boolean>(false);

  const [gridSnapMinutes, setGridSnapMinutes] = useState<number>(15); // Default snap to 15 mins

  // Grab offset ref for millimeter-precise mouse drag without cursor jump (ported from ScheduleCalendarView)
  const grabOffsetRef = useRef<number>(20);

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
  const [draggedDuration, setDraggedDuration] = useState<number>(30);
  const [draggedStudentName, setDraggedStudentName] = useState<string>('Termin');
  const [dragSnapState, setDragSnapState] = useState<{
    boardId: string;
    topPx: number;
    timeStr: string;
    duration: number;
    studentName?: string;
  } | null>(null);

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
  const [lastSubmittedTime, setLastSubmittedTime] = useState<string | null>(null);
  const [scheduleStatus, setScheduleStatus] = useState<'none' | 'pending' | 'approved'>('none');

  // RoentgenMatrixView interactive behavior states
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentPrefs, setSelectedStudentPrefs] = useState<any[]>([]);
  const [allStudentPrefsMap, setAllStudentPrefsMap] = useState<Record<string, any[]>>({});
  const [selectedStudentNote, setSelectedStudentNote] = useState<string | null>(null);
  const [shakingStudentId, setShakingStudentId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);
  const [failedStudentIds, setFailedStudentIds] = useState<string[]>([]);
  const [otherTeachersSchedules, setOtherTeachersSchedules] = useState<any[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<any[]>([]);
  const [siblingInfo, setSiblingInfo] = useState<any | null>(null);

  // Focus Day Zoom state
  const [focusedDayOfWeek, setFocusedDayOfWeek] = useState<number | null>(null);
  const autoSaveDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic Theme calculations
  const isCampus = localStorage.getItem('groovelab_active_platform') === 'campus';
  const isGroovelab = localStorage.getItem('groovelab_active_platform') === 'groovelab';
  const isAdminView = currentUserRole === 'admin' || currentUserRole === 'secretary';

  let brandColor = '#34a853'; // Campus Green
  let lightBg = 'rgba(52, 168, 83, 0.06)';
  let hoverBg = 'rgba(52, 168, 83, 0.12)';
  let textAccentColor = '#34a853';

  if (isAdminView) {
    brandColor = '#ea4335'; // Admin Red
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
      title: "Willkommen beim Stundenplan-Designer! 🛠️",
      description: "Lass uns kurz durchgehen, wie du deinen Stundenplan hier planst. Die Plattform hilft dir, deine Schüler optimal einzuteilen und Raumkonflikte zu vermeiden.",
      selector: undefined
    },
    {
      title: "Der Schüler-Pool 👥",
      description: "Hier siehst du alle noch nicht eingeteilten Schüler (graues Label links). Ziehe Schüler einfach per Drag & Drop auf deine Unterrichtstage.",
      selector: "tour-student-pool"
    },
    {
      title: "Deine Wochentags-Boards 📅",
      description: "Jeder Unterrichtstag hat ein eigenes Board, zugeteilt auf einen Raum. Die Unterrichtszeiten passen sich beim Hinzufügen von Schülern automatisch an.",
      selector: "tour-day-boards"
    },
    {
      title: "Pausen & Gruppen ☕",
      description: "Ziehe einfach einen Pausen-Block auf deine Boards, um unterrichtsfreie Zeiten einzuplanen, oder aktiviere den Gruppen-Modus für gemeinsamen Unterricht.",
      selector: "tour-special-features"
    },
    {
      title: "Einloggen & Senden 🚀",
      description: "Wenn dein Stundenplan-Entwurf fertig ist, klicke auf 'Einloggen & Senden', um ihn zur Freigabe an die Verwaltung zu übermitteln.",
      selector: "tour-submit-section"
    }
  ], []);

  // Guided Tour Configuration & State for Calendar (Stundenplan)
  const calendarTourSteps = useMemo(() => [
    {
      title: "Deine Wochenübersicht 📅",
      description: "Dies ist dein freigegebener Stundenplan. Hier siehst du all deine Termine auf einen Blick.",
      selector: undefined
    },
    {
      title: "Die Röntgen-Ansicht 🔍",
      description: "Verwende die Röntgen-Ansicht, um Raumbelegungen von dir und anderen Lehrkräften transparent übereinander zu legen und Belegungen zu prüfen.",
      selector: "tour-calendar-xray"
    },
    {
      title: "Optionen & Aktionen ⚙️",
      description: "Hier kannst du das Wochenende ein- oder ausblenden, Gruppen organisieren oder ganze Wochenkopien erstellen und einfügen.",
      selector: "tour-calendar-actions"
    },
    {
      title: "Zurück zum Designer 🛠️",
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
          teacherName: os.teacher ? `${os.teacher.first_name} ${os.teacher.last_name}` : 'Anderer Lehrer',
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

    const handleStudentsUpdated = () => {
      console.log('[ScheduleBoard] Received student update event (Campus & GrooveLab). Auto-refreshing designer...');
      loadInitialData();
    };

    window.addEventListener('students_updated', handleStudentsUpdated);
    window.addEventListener('campus_students_updated', handleStudentsUpdated);
    window.addEventListener('groovelab_students_updated', handleStudentsUpdated);

    const channel = supabase
      .channel(`schedule-board-realtime-students-${schoolId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users', filter: `school_id=eq.${schoolId}` },
        (payload) => {
          console.log('[ScheduleBoard] Realtime users table change detected:', payload);
          loadInitialData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'students', filter: `school_id=eq.${schoolId}` },
        (payload) => {
          console.log('[ScheduleBoard] Realtime students table change detected:', payload);
          loadInitialData();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('students_updated', handleStudentsUpdated);
      window.removeEventListener('campus_students_updated', handleStudentsUpdated);
      window.removeEventListener('groovelab_students_updated', handleStudentsUpdated);
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

      // Update our drafts list for the active draft ID
      const updatedDrafts = drafts.map(d => {
        if (d.id === activeDraftId) {
          return { ...d, boards: boardDefinitions };
        }
        return d;
      });

      const draftStateToSave = {
        activeDraftId,
        submittedDraftId,
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
  }, [boards, drafts, activeDraftId, submittedDraftId, selectedTeacherId, isInitialLoadDone]);

  const consolidateDatabaseGroups = (boardsList: DayBoard[], rawPool: Student[]): { boards: DayBoard[], pool: Student[] } => {
    const allStudentsMap = new Map<string, Student>();
    
    // Initialize the map with fresh metadata from the database (rawPool)
    rawPool.forEach(s => {
      allStudentsMap.set(s.id, { ...s });
    });
    
    const assignedStudentIds = new Set<string>();

    // Step 1: Scan and clean boardsList of any duplicates. Keep only the first occurrence.
    const cleanedBoards = boardsList.map(b => {
      const nextStudents: Student[] = [];
      b.students.forEach(s => {
        if (s.isBreak) {
          nextStudents.push(s);
          return;
        }
        if (s.isGroup && s.groupStudents) {
          const uniqueMembers = s.groupStudents.filter(gs => {
            if (assignedStudentIds.has(gs.id)) {
              return false;
            }
            assignedStudentIds.add(gs.id);
            return true;
          });
          if (uniqueMembers.length >= 2) {
            nextStudents.push({
              ...s,
              groupStudents: uniqueMembers
            });
          } else if (uniqueMembers.length === 1) {
            const _fm0 = allStudentsMap.get(uniqueMembers[0].id);
            nextStudents.push(_fm0 ? { ...uniqueMembers[0], first_name: _fm0.first_name, last_name: _fm0.last_name } : uniqueMembers[0]);
          }
        } else {
          if (assignedStudentIds.has(s.id)) {
            // Already scheduled elsewhere -> remove duplicate card
            return;
          }
          assignedStudentIds.add(s.id);
          const _fresh = allStudentsMap.get(s.id);
          nextStudents.push(_fresh ? { ...s, first_name: _fresh.first_name, last_name: _fresh.last_name } : s);
        }
      });
      return { ...b, students: nextStudents };
    });

    // Scan boards to mark which of these students are assigned
    cleanedBoards.forEach(b => {
      b.students.forEach(s => {
        if (s.isBreak) return;
        if (s.isGroup && s.groupStudents) {
          s.groupStudents.forEach(gs => {
            const existing = allStudentsMap.get(gs.id);
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
          const existing = allStudentsMap.get(s.id);
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
        
        const merged: Student = {
          id: `group-${groupId}`,
          first_name: members.map(m => m.first_name).join(' & '),
          last_name: '',
          instrument: members.map(m => m.instrument || 'Musiker').filter((val, idx, arr) => arr.indexOf(val) === idx).join('/'),
          duration: Math.max(...members.map(m => m.duration || 30)),
          assignedDay,
          assignedTime,
          status: members.some(m => m.status === 'ausstehend') ? 'ausstehend' : 'verplant',
          isGroup: true,
          hasPreferences: members.some(m => Boolean(m.hasPreferences)),
          group_id: groupId,
          groupStudents: members.map(m => ({
            ...m,
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
          const nonGroupMembers = s.groupStudents.filter(gs => !individualStudentIdsInGroups.has(gs.id));
          const groupMembers = s.groupStudents.filter(gs => individualStudentIdsInGroups.has(gs.id));

          if (nonGroupMembers.length >= 2) {
            nextStudents.push({
              ...s,
              groupStudents: nonGroupMembers
            });
          } else if (nonGroupMembers.length === 1) {
            const _fm1 = allStudentsMap.get(nonGroupMembers[0].id);
            nextStudents.push(_fm1 ? { ...nonGroupMembers[0], first_name: _fm1.first_name, last_name: _fm1.last_name } : nonGroupMembers[0]);
          }

          groupMembers.forEach(gs => {
            if (gs.group_id) {
              const merged = mergedGroupsMap.get(`group-${gs.group_id}`);
              if (merged && merged.assignedDay === b.dayOfWeek && !addedGroupIds.has(gs.group_id)) {
                nextStudents.push(merged);
                addedGroupIds.add(gs.group_id);
              }
            }
          });
        } else {
          if (individualStudentIdsInGroups.has(s.id)) {
            if (s.group_id) {
              const merged = mergedGroupsMap.get(`group-${s.group_id}`);
              if (merged && merged.assignedDay === b.dayOfWeek && !addedGroupIds.has(s.group_id)) {
                nextStudents.push(merged);
                addedGroupIds.add(s.group_id);
              }
            }
          } else {
            const _freshS = allStudentsMap.get(s.id);
            nextStudents.push(_freshS ? { ...s, first_name: _freshS.first_name, last_name: _freshS.last_name } : s);
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
          if (merged) {
            if (!newPool.some(p => p.id === merged.id)) {
              newPool.push(merged);
            }
          }
        }
      } else {
        newPool.push(s);
      }
    });

    return { boards: newBoards, pool: newPool };
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
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

      // Fetch all rooms
      const { data: rData } = await supabase
        .from('rooms')
        .select('id, name')
        .eq('school_id', schoolId)
        .order('name');
      const loadedRooms = rData || [];
      setRooms(loadedRooms);
      if (loadedRooms.length > 0) {
        setNewBoardRoom(loadedRooms[0].id);
      }
      
      // 2. Fetch assigned student IDs across schedules, occurrences, and bands for selected teacher
      const [{ data: schedData }, { data: occData }, { data: groupData }] = await Promise.all([
        supabase.from('schedules').select('*, student:users!schedules_student_id_fkey(*)').eq('teacher_id', selectedTeacherId),
        supabase.from('schedule_occurrences').select('student_id').eq('teacher_id', selectedTeacherId),
        supabase.from('bands').select('id').eq('coach_id', selectedTeacherId)
      ]);

      const schedStudentIds = (schedData || []).map(s => s.student_id).filter(Boolean);
      const occStudentIds = (occData || []).map(s => s.student_id).filter(Boolean);

      let groupStudentIds: string[] = [];
      if (groupData && groupData.length > 0) {
        const groupIds = groupData.map(g => g.id);
        const { data: gsData } = await supabase.from('band_members').select('user_id').in('band_id', groupIds);
        groupStudentIds = (gsData || []).map(gs => gs.user_id).filter(Boolean);
      }

      const teacherAssignedStudentIds = new Set([...schedStudentIds, ...occStudentIds, ...groupStudentIds]);

      // 2. Fetch student records from students table for this school
      const { data: allStudentsDb } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolId);

      const statusMap: Record<string, string> = {};
      const stDbStudentIds = new Set<string>();
      allStudentsDb?.forEach(st => {
        if (st.id) stDbStudentIds.add(st.id);
        if ((st as any).user_id) stDbStudentIds.add((st as any).user_id);
        if ((st as any).student_id) stDbStudentIds.add((st as any).student_id);
        statusMap[st.id] = st.status;
        if ((st as any).user_id) statusMap[(st as any).user_id] = st.status;
      });

      // Fetch students from users table
      const { data: allSchoolStudentUsers } = await supabase
        .from('users')
        .select('id, first_name, last_name, instrument, lesson_duration, sibling_group_id, group_id, is_campus_active, is_groovelab_active, is_active, teacher_id')
        .eq('school_id', schoolId)
        .eq('role', 'student');

      // Fetch pending students from pending_students_decrypted view
      const { data: pendingData } = await supabase
        .from('pending_students_decrypted')
        .select('id, first_name, last_name, instrument, lesson_duration, sibling_group_id, group_id, teacher_id')
        .eq('school_id', schoolId);

      const studentMap = new Map<string, Student>();
      const userToStudentIdMap = new Map<string, string>();

      // Filter helper: include all school students to guarantee 1-to-1 parity with TeacherDashboard and AdminDashboard
      const matchesTeacher = (_tId?: string | null, _sId?: string) => true;

      // A) Add all students from students table (authoritative for lesson duration & teacher assignment)
      allStudentsDb?.forEach(s => {
        if (!matchesTeacher(s.teacher_id, s.id)) return;
        const studentId = s.id;
        if ((s as any).user_id) {
          userToStudentIdMap.set((s as any).user_id, studentId);
        }
        const pendingMatch = pendingData?.find((p: any) => p.id === studentId);
        const userMatch = allSchoolStudentUsers?.find((u: any) => u.id === studentId || u.id === (s as any).user_id);
        const userFname = userMatch ? resolveFirstName(userMatch) : 'Schüler';
        const pendingFname = pendingMatch ? resolveFirstName(pendingMatch) : 'Schüler';
        const rawFname = resolveFirstName(s);
        const fname = userFname !== 'Schüler' ? userFname : (pendingFname !== 'Schüler' ? pendingFname : (rawFname !== 'Schüler' ? rawFname : 'Schüler'));
        const lname = (userMatch ? resolveLastName(userMatch) : '') || (pendingMatch ? resolveLastName(pendingMatch) : '') || resolveLastName(s);
        
        studentMap.set(studentId, {
          id: studentId,
          first_name: fname,
          last_name: lname,
          instrument: s.instrument || (userMatch ? userMatch.instrument : null) || (pendingMatch ? pendingMatch.instrument : 'Musiker'),
          duration: s.lesson_duration || 30,
          status: (s.status || 'ausstehend') as any,
          sibling_group_id: s.sibling_group_id,
          group_id: s.group_id,
          isOnboarded: Boolean(s.is_campus_active || s.is_groovelab_active || s.is_active || s.status === 'aktiv'),
          hasPreferences: false
        });
      });

      // B) Add or merge users table student records
      (allSchoolStudentUsers || []).forEach(u => {
        if (!matchesTeacher((u as any).teacher_id, u.id)) return;
        const fname = resolveFirstName(u);
        const lname = resolveLastName(u);
        const existingStudentId = userToStudentIdMap.get(u.id) || u.id;
        const existing = studentMap.get(existingStudentId) || studentMap.get(u.id);

        if (existing) {
          if (fname && fname !== 'Schüler' && (existing.first_name === 'Schüler' || !existing.first_name)) {
            existing.first_name = fname;
            existing.last_name = lname;
          }
          existing.isOnboarded = existing.isOnboarded || Boolean(u.is_campus_active || u.is_groovelab_active || u.is_active);
          if (!existing.instrument || existing.instrument === 'Musiker') {
            existing.instrument = u.instrument || 'Musiker';
          }
          if (u.sibling_group_id && !existing.sibling_group_id) {
            existing.sibling_group_id = u.sibling_group_id;
          }
          if (u.group_id && !existing.group_id) {
            existing.group_id = u.group_id;
          }
        } else {
          studentMap.set(u.id, {
            id: u.id,
            first_name: fname,
            last_name: lname,
            instrument: u.instrument || 'Musiker',
            duration: u.lesson_duration || 30,
            status: (statusMap[u.id] || 'ausstehend') as any,
            sibling_group_id: u.sibling_group_id,
            group_id: u.group_id,
            isOnboarded: Boolean(u.is_campus_active || u.is_groovelab_active || u.is_active || statusMap[u.id] === 'aktiv'),
            hasPreferences: false
          });
        }
      });

      // C) Add pending onboarding students
      (pendingData || []).forEach((p: any) => {
        if (!matchesTeacher(p.teacher_id, p.id)) return;
        const existingId = userToStudentIdMap.get(p.id) || p.id;
        const existing = studentMap.get(existingId) || studentMap.get(p.id);
        const pFname = resolveFirstName(p);
        const pLname = resolveLastName(p);

        if (existing) {
          if (pFname && pFname !== 'Schüler' && (existing.first_name === 'Schüler' || !existing.first_name)) {
            existing.first_name = pFname;
            existing.last_name = pLname;
          }
        } else {
          studentMap.set(p.id, {
            id: p.id,
            first_name: pFname,
            last_name: pLname,
            instrument: p.instrument || 'Musiker',
            duration: p.lesson_duration || 30,
            status: 'ausstehend',
            sibling_group_id: p.sibling_group_id,
            group_id: p.group_id || null,
            isOnboarded: false,
            hasPreferences: false
          });
        }
      });

      // D) Add any students directly assigned to this teacher in schedules table
      (schedData || []).forEach((sched: any) => {
        if (sched.student_id) {
          const sId = sched.student_id;
          const existingId = userToStudentIdMap.get(sId) || sId;
          if (!studentMap.has(existingId)) {
            const stObj = sched.student || {};
            const fname = resolveFirstName(stObj);
            const lname = resolveLastName(stObj);
            studentMap.set(sId, {
              id: sId,
              first_name: fname !== 'Schüler' ? fname : 'Schüler',
              last_name: lname,
              instrument: stObj.instrument || 'Gitarre',
              duration: sched.duration || stObj.lesson_duration || 30,
              status: 'verplant',
              sibling_group_id: stObj.sibling_group_id,
              group_id: stObj.group_id || null,
              isOnboarded: Boolean(stObj.is_campus_active || stObj.is_groovelab_active || stObj.is_active),
              hasPreferences: false
            });
          }
        }
      });

      const loadedStudents: Student[] = Array.from(studentMap.values());
      
      const prefSubmittedSet = new Set<string>();
      const prefMap: Record<string, any[]> = {};

      const { data: allDbPrefs } = await supabase
        .from('student_schedule_preferences')
        .select('*');

      allDbPrefs?.forEach(p => {
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

      const { data: teacherProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', selectedTeacherId)
        .maybeSingle();

      setIsOnboardingCompleted(teacherProfile?.teacher_onboarding_completed ?? false);
      setTeacherAvailability(teacherProfile?.teacher_availability ?? {});

      const rawPlanned = teacherProfile?.planned_boards || (teacherProfile as any)?.campus_räume || (teacherProfile as any)?.groovelab_räume;
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
      } else {
        // Fallback to local storage
        const stored = localStorage.getItem(`groovelab_teacher_draft_state_${activePlatform}_${selectedTeacherId}`);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.drafts) {
              loadedDrafts = parsed.drafts;
              loadedActiveDraftId = parsed.activeDraftId || 'default';
              loadedSubmittedDraftId = parsed.submittedDraftId || '';
              loadedSubmittedAt = parsed.submittedAt || '';
            }
          } catch (e) {}
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

      // Rename legacy 'Standard-Entwurf' to 'Entwurf 1'
      loadedDrafts = loadedDrafts.map(d => d.name === 'Standard-Entwurf' ? { ...d, name: 'Entwurf 1' } : d);

      if (!loadedActiveDraftId || !loadedDrafts.some(d => d.id === loadedActiveDraftId)) {
        loadedActiveDraftId = loadedDrafts[0]?.id || 'default';
      }

      setDrafts(loadedDrafts);
      setActiveDraftId(loadedActiveDraftId);

      const currentActiveDraft = loadedDrafts.find(d => d.id === loadedActiveDraftId) || loadedDrafts[0];
      const dbPlannedBoards = currentActiveDraft ? currentActiveDraft.boards : [];

      // 4. Existing schedules already pre-fetched as schedData

      // Fetch other teachers' schedules for room conflict checking
      const { data: otherSchedData } = await supabase
        .from('schedules')
        .select('*, student:users!schedules_student_id_fkey(id, first_name, last_name), teacher:users!schedules_teacher_id_fkey(id, first_name, last_name)')
        .eq('school_id', schoolId)
        .neq('teacher_id', selectedTeacherId);
      setOtherTeachersSchedules(otherSchedData || []);

      // Fetch wöchentliche Blockierungen (room_blocked_slots)
      const { data: blockedSlotsData } = await supabase
        .from('room_blocked_slots')
        .select('*')
        .eq('school_id', schoolId);
      setBlockedSlots(blockedSlotsData || []);

      if (schedData && schedData.length > 0) {
        setHasSubmittedSchedule(true);
        // Default submittedDraftId to current active draft if none was saved in DB
        const finalSubmittedId = loadedSubmittedDraftId || loadedActiveDraftId;
        setSubmittedDraftId(finalSubmittedId);

        // Determine schedule review/approval status by looking at non-break schedules
        const nonBreakSchedules = schedData.filter(s => s.student_id !== null);
        if (nonBreakSchedules.length > 0) {
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
        } else {
          // Find the latest created_at in schedData
          const dates = schedData.map(s => s.created_at ? new Date(s.created_at).getTime() : 0).filter(t => t > 0);
          if (dates.length > 0) {
            submissionDate = new Date(Math.max(...dates));
          }
        }

        if (submissionDate && !isNaN(submissionDate.getTime())) {
          const formattedDate = submissionDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
          const formattedTime = submissionDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
          setLastSubmittedTime(`am ${formattedDate}. um ${formattedTime}`);
        } else {
          setLastSubmittedTime(null);
        }
      } else {
        setHasSubmittedSchedule(false);
        setSubmittedDraftId('');
        setScheduleStatus('none');
        setLastSubmittedTime(null);
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
                const dbStudent = loadedStudents.find(ls => ls.id === s.id);
                const targetDuration = dbStudent?.duration || (s.lesson_duration ? s.lesson_duration : 30);
                if (!s.isBreak) {
                  return {
                    ...s,
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
              roomId: loadedRooms.length > 0 ? loadedRooms[0].id : '',
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
              roomId: loadedRooms.length > 0 ? loadedRooms[0].id : '',
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
      loadedDrafts = loadedDrafts.map(d => {
        if (!d.boards || d.boards.length === 0 || d.id === loadedActiveDraftId) {
          return { ...d, boards: reconstructedBoards };
        }
        return d;
      });
      setDrafts(loadedDrafts);

      setBoards(reconstructedBoards);
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
    let currentTime = board.startAnchor || '14:00';
    const updatedStudents = board.students.map(s => {
      let assignedStart = currentTime;
      let effectiveCustomTime = s.customStartTime;
      let isPinned = s.isPinned;

      if (s.isPinned && (s.customStartTime || s.assignedTime)) {
        const targetTime = s.customStartTime || s.assignedTime || currentTime;
        const [csh, csm] = parseTime(targetTime);
        const [curh, curm] = parseTime(currentTime);
        const csMin = csh * 60 + csm;
        const curMin = curh * 60 + curm;

        if (csMin >= curMin) {
          // Pinned placement: gap preserved
          assignedStart = targetTime;
          effectiveCustomTime = targetTime;
        } else {
          // Overlap PREVENTED: Shifted down to end of preceding appointment and unpinned
          assignedStart = currentTime;
          effectiveCustomTime = undefined;
          isPinned = false;
        }
      } else if (s.customStartTime) {
        const [csh, csm] = parseTime(s.customStartTime);
        const [curh, curm] = parseTime(currentTime);
        const csMin = csh * 60 + csm;
        const curMin = curh * 60 + curm;

        if (csMin >= curMin) {
          // Free Placement: Gap preserved
          assignedStart = s.customStartTime;
        } else {
          // Overlap PREVENTED: Shifted down to end of preceding appointment
          assignedStart = currentTime;
          effectiveCustomTime = undefined;
        }
      }

      const assignedTime = assignedStart;
      currentTime = addMinutesToTime(assignedTime, s.duration || 30);

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

    setBoards(prev => prev.filter(b => b.id !== boardId));  };

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
        } else {
          setSelectedStudentPrefs([]);
        }

        const firstStudentId = targetStudentIds[0];
        
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('parent_notes')
          .eq('id', firstStudentId)
          .maybeSingle();
        if (!studentError && studentData) {
          setSelectedStudentNote(studentData.parent_notes || null);
        }

        const { data: curStudent } = await supabase
          .from('users')
          .select('sibling_group_id')
          .eq('id', firstStudentId)
          .single();

        if (curStudent?.sibling_group_id) {
          const { data: sibData } = await supabase
            .from('users')
            .select('id, first_name, last_name, instrument, lesson_duration')
            .eq('sibling_group_id', curStudent.sibling_group_id)
            .neq('id', firstStudentId)
            .maybeSingle();

          if (sibData) {
            const { data: sibSch } = await supabase
              .from('schedules')
              .select('day_of_week, start_time, room_id, teacher:users!schedules_teacher_id_fkey(first_name, last_name)')
              .eq('student_id', sibData.id)
              .maybeSingle();

            const { data: sibPrefs } = await supabase
              .from('student_schedule_preferences')
              .select('*')
              .eq('student_id', sibData.id);

            setSiblingInfo({
              id: sibData.id,
              first_name: sibData.first_name || '',
              last_name: sibData.last_name || '',
              instrument: sibData.instrument || '',
              duration: sibData.lesson_duration || 30,
              assignedDay: sibSch?.day_of_week,
              assignedTime: sibSch?.start_time,
              teacher_name: sibSch?.teacher ? `${Array.isArray(sibSch.teacher) ? sibSch.teacher[0]?.first_name : (sibSch.teacher as any).first_name} ${Array.isArray(sibSch.teacher) ? sibSch.teacher[0]?.last_name : (sibSch.teacher as any).last_name}` : undefined,
              preferences: sibPrefs || []
            });
          } else {
            setSiblingInfo(null);
          }
        } else {
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

        // Check Wunsch hit matching card UI logic (any overlap with Wunschzeit window)
        const gMemberIds = s.isGroup && s.groupStudents ? s.groupStudents.map(gs => gs.id) : [];
        const studPrefs = s.isGroup
          ? gMemberIds.flatMap(mId => allStudentPrefsMap[mId] || [])
          : (allStudentPrefsMap[s.id] || []);
        const hasWunschPref = studPrefs.some(p => p.preference_type === 'wunsch');
        if (hasWunschPref) {
          studentsWithWunsch++;
          const wunschPrefs = studPrefs.filter(p => p.preference_type === 'wunsch' && parseDayNumber(p.day_of_week) === parseDayNumber(b.dayOfWeek));
          for (const pref of wunschPrefs) {
            const { startMin: prefStart, endMin: prefEnd } = getPrefStartEndMinutes(pref);
            if (sStart < prefEnd && sEnd > prefStart) {
              wunschHits++;
              break;
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

      const updatedDrafts = drafts.map(d => {
        if (d.id === activeDraftId) {
          return { ...d, boards: boardDefinitions };
        }
        return d;
      });

      const draftStateToSave = {
        activeDraftId,
        submittedDraftId: activeDraftId,
        submittedAt: new Date().toISOString(),
        drafts: updatedDrafts
      };

      await supabase
        .from('users')
        .update({
          planned_boards: draftStateToSave,
          campus_räume: draftStateToSave,
          groovelab_räume: draftStateToSave
        })
        .eq('id', selectedTeacherId);

      await supabase
        .from('schedules')
        .delete()
        .eq('teacher_id', selectedTeacherId);

      const inserts = [];
      for (const board of validBoards) {
        for (const s of board.students) {
          const slotTime = s.assignedTime || board.startAnchor || '14:00';
          if (s.isGroup && s.groupStudents) {
            for (const gs of s.groupStudents) {
              inserts.push({
                school_id: effectiveSchoolId,
                teacher_id: selectedTeacherId,
                student_id: gs.id,
                day_of_week: board.dayOfWeek,
                time_slot: slotTime,
                room_id: board.roomId || null,
                duration: s.duration || 30,
                status: 'ready_for_admin_review',
                instrument: gs.instrument || 'Musiker'
              });
            }
          } else {
            inserts.push({
              school_id: effectiveSchoolId,
              teacher_id: selectedTeacherId,
              student_id: s.isBreak ? null : s.id,
              day_of_week: board.dayOfWeek,
              time_slot: slotTime,
              room_id: board.roomId || null,
              duration: s.duration || 30,
              status: s.isBreak ? 'approved' : 'ready_for_admin_review',
              instrument: s.isBreak ? null : (s.instrument || 'Musiker')
            });
          }
        }
      }

      if (inserts.length > 0) {
        const { data: insertedSchedules, error: insErr } = await supabase
          .from('schedules')
          .insert(inserts)
          .select();

        if (insErr) {
          console.error('[ScheduleBoard] Error inserting schedules into Supabase:', insErr);
        }

        const occurrences: any[] = [];
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        const todayStr = `${y}-${m}-${d}`;

        const schoolStartYear = today.getMonth() >= 8 ? today.getFullYear() : today.getFullYear() - 1;
        const schoolYearEnd = new Date(`${schoolStartYear + 1}-08-31T23:59:59`);

        (insertedSchedules || []).forEach((sch: any) => {
          const { id: scheduleId, student_id, teacher_id, day_of_week, time_slot, duration } = sch;
          if (!student_id || !day_of_week || !time_slot) return;
          const dayNum = typeof day_of_week === 'number' ? day_of_week : (parseInt(day_of_week, 10) || 1);

          let current = new Date(today);
          const currentDay = current.getDay() || 7;
          const diff = dayNum - currentDay;
          let targetDate = new Date(current);
          targetDate.setDate(current.getDate() + diff);

          if (targetDate < today) {
            targetDate.setDate(targetDate.getDate() + 7);
          }

          while (targetDate <= schoolYearEnd) {
            const ty = targetDate.getFullYear();
            const tm = String(targetDate.getMonth() + 1).padStart(2, '0');
            const td = String(targetDate.getDate()).padStart(2, '0');
            const dateStr = `${ty}-${tm}-${td}`;

            const startTime = time_slot.includes(':') && time_slot.split(':').length === 2 ? time_slot + ':00' : time_slot;
            occurrences.push({
              schedule_id: scheduleId,
              student_id,
              teacher_id,
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
          .eq('teacher_id', selectedTeacherId)
          .gte('date', todayStr);

        if (occurrences.length > 0) {
          await supabase
            .from('schedule_occurrences')
            .insert(occurrences);
        }
      }

      if (showToastNotification) {
        setToast({ message: 'Stundenplan zur Freigabe an die Verwaltung übermittelt! 🚀', type: 'success' });
      }
    } catch (err) {
      console.error('Error auto-saving schedule to Supabase:', err);
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
      setSolverStageText('Zuteilung perfekt abgeschlossen! 🎉');
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
    if (!selectedStudentId) {
      setSelectedStudentPrefs([]);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && draggedStudentId) {
        handleDragEnd();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [draggedStudentId]);

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

  // Handle drops on columns
  const handleDropOnBoard = async (targetBoardId: string, index?: number, droppedCustomTime?: string, isAltSwap: boolean = false) => {
    if (!draggedStudentId) return;

    const isBreakDrag = draggedStudentId.startsWith('break-') || draggedStudentId === 'sidebar-pause';
    const student = students.find(s => s.id === draggedStudentId);
    if (!student && !isBreakDrag) return;

    // Execute standard drop with explicit move vs swap control
    await executeStandardDrop(draggedStudentId, targetBoardId, index, dragSource, dragSourceBoardId, undefined, droppedCustomTime, isAltSwap);
  };

  const executeStandardDrop = async (sourceId: string, targetBoardId: string, index?: number, source?: string | null, sourceBoardId?: string | null, chosenInstrument?: string, droppedCustomTime?: string, isAltSwap: boolean = false) => {
    pushUndoSnapshot();
    const isBreakDrag = sourceId.startsWith('break-') || sourceId === 'sidebar-pause';
    const studentObj = students.find(s => s.id === sourceId);

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
      return boardsList.map(b => {
        const nextStudents: Student[] = [];
        b.students.forEach(s => {
          if (s.isBreak) {
            if (s.id !== studentId) {
              nextStudents.push(s);
            }
            return;
          }
          if (s.id === studentId) {
            // Card matches exactly (individual student or group block ID)
            return;
          }
          if (s.isGroup && s.groupStudents) {
            const remaining = s.groupStudents.filter(gs => gs.id !== studentId);
            if (remaining.length > 1) {
              nextStudents.push({
                ...s,
                groupStudents: remaining
              });
            } else if (remaining.length === 1) {
              nextStudents.push(remaining[0]);
            }
          } else {
            if (s.id !== studentId) {
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

              nextStudents[curIndex] = { ...targetCard, customStartTime: srcTime };
              nextStudents[index] = { ...sourceCard, customStartTime: tgtTime };
              setToast({ message: '1:1 Termintausch durchgeführt! 🔀', type: 'success' });
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
            
            return prev.map(b => b.id === targetBoardId ? updated : b);
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

            sourceNextStudents[srcIdx] = { ...targetStudentToSwap, assignedDay: sourceBoard.dayOfWeek, customStartTime: srcTime };
            targetNextStudents[index] = { ...sourceStudentToSwap, assignedDay: targetBoard.dayOfWeek, customStartTime: tgtTime };

            const updatedSource = recalculateBoardTimes({ ...sourceBoard, students: sourceNextStudents }, targetStudentToSwap.id);
            const updatedTarget = recalculateBoardTimes({ ...targetBoard, students: targetNextStudents }, sourceStudentToSwap.id);

            setStudents(currentStudents => currentStudents.map(s => {
              const inSource = updatedSource.students.find(bs => bs.id === s.id);
              if (inSource) return { ...s, assignedDay: sourceBoard.dayOfWeek, assignedTime: inSource.assignedTime };
              const inTarget = updatedTarget.students.find(bs => bs.id === s.id);
              if (inTarget) return { ...s, assignedDay: targetBoard.dayOfWeek, assignedTime: inTarget.assignedTime };
              return s;
            }));

            setToast({ message: '1:1 Termintausch durchgeführt! 🔀', type: 'success' });

            return prev.map(b => {
              if (b.id === sourceBoard.id) return updatedSource;
              if (b.id === targetBoard.id) return updatedTarget;
              return b;
            });
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

        return cleaned.map(b => b.id === targetBoardId ? updatedTarget : b);
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

      const breakIndex = board.students.findIndex(s => s.id === breakId);
      if (breakIndex === -1) return prev;

      let nextStudents = board.students.filter(s => s.id !== breakId);

      if (!slideUp && breakIndex < nextStudents.length) {
        const nextCard = nextStudents[breakIndex];
        nextStudents = nextStudents.map((s, idx) => {
          if (idx === breakIndex) {
            return { ...s, customStartTime: nextCard.assignedTime };
          }
          return s;
        });
      }

      const updatedBoard = recalculateBoardTimes({ ...board, students: nextStudents });
      return prev.map(b => b.id === boardId ? updatedBoard : b);
    });
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

    const newGroupBlock: Student = {
      id: `group-${crypto.randomUUID()}`,
      first_name: groupStudents.map(s => s.first_name).join(' & '),
      last_name: '',
      instrument: groupStudents.map(s => s.instrument || 'Musiker').filter((v, i, a) => a.indexOf(v) === i).join('/'),
      duration: Math.max(...groupStudents.map(s => s.duration || 30)),
      isGroup: true,
      hasPreferences: groupStudents.some(s => Boolean(s.hasPreferences)),
      groupStudents: groupStudents.map(s => ({
        id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        instrument: s.instrument,
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

  const generatePDFBackup = async (boardsToSave: DayBoard[], allStudents: Student[]) => {
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.text("Mein Stundenplan", 20, 20);
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text("Generiert am " + new Date().toLocaleDateString('de-DE'), 20, 28);
    
    let y = 40;
    
    boardsToSave.forEach(board => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      const dayName = DAYS_OF_WEEK.find(d => d.value === board.dayOfWeek)?.name || 'Tag';
      
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text(`${dayName} - Start: ${board.startAnchor} Uhr`, 20, y);
      y += 8;
      
      board.students.forEach(s => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        
        doc.setFontSize(11);
        if (s.isBreak) {
          doc.setTextColor(180, 83, 9);
          doc.text(`${s.assignedTime} - Pause (${s.duration} Min)`, 25, y);
        } else {
          doc.setTextColor(71, 85, 105);
          doc.text(`${s.assignedTime} - ${s.first_name} ${maskLastName(s.last_name, showRealNames)} (${s.instrument}, ${s.duration} Min)`, 25, y);
        }
        y += 6;
      });
      
      y += 10;
    });

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
    setStudents(prev => {
      const assignments = new Map<string, { dayOfWeek: number; timeSlot?: string }>();
      targetBoards.forEach(b => {
        b.students.forEach(s => {
          if (!s.isBreak) {
            assignments.set(s.id, { dayOfWeek: b.dayOfWeek, timeSlot: s.assignedTime });
          }
        });
      });
      
      return prev.map(s => {
        const assignment = assignments.get(s.id);
        if (assignment) {
          return {
            ...s,
            assignedDay: assignment.dayOfWeek,
            assignedTime: assignment.timeSlot
          };
        } else {
          return {
            ...s,
            assignedDay: undefined,
            assignedTime: undefined
          };
        }
      });
    });
  };

  const handleSwitchDraft = (draftId: string) => {
    if (draftId === activeDraftId) return;

    // 1. Sync current boards to active draft in drafts state
    setDrafts(prev => prev.map(d => d.id === activeDraftId ? { ...d, boards } : d));

    const targetDraft = drafts.find(d => d.id === draftId);
    if (!targetDraft) return;

    setActiveDraftId(draftId);
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
    setToast({ message: `Zu ${targetDraft.name} gewechselt! 🗓️`, type: 'success' });
  };

  const handleCreateDraft = () => {
    // Sync current boards to active draft before creating new one
    setDrafts(prev => prev.map(d => d.id === activeDraftId ? { ...d, boards } : d));
    setShowNewDraftPromptModal(true);
  };

  const handleConfirmNewDraft = (copyTimes: boolean) => {
    setShowNewDraftPromptModal(false);
    const newId = `draft-${crypto.randomUUID()}`;
    const nextNumber = drafts.length + 1;
    const draftName = `Entwurf ${nextNumber}`;

    let initialBoards: DayBoard[] = [];
    const activeDraft = drafts.find(d => d.id === activeDraftId) || drafts[0];

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

    setDrafts(prev => [...prev, newDraft]);
    setActiveDraftId(newId);
    setBoards(initialBoards);
    syncStudentsWithBoards(initialBoards);

    if (!copyTimes) {
      // Open day & time setup modal for fresh configuration
      handleEditTeacherAvailability();
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    if (drafts.length <= 1) {
      await showAlert('Der letzte verbleibende Entwurf kann nicht gelöscht werden.');
      return;
    }
    if (!await showConfirm('Möchtest du diesen Entwurf wirklich löschen?')) {
      return;
    }
    const filtered = drafts.filter(d => d.id !== draftId);
    const updatedDrafts = filtered.map((d, index) => ({
      ...d,
      name: `Entwurf ${index + 1}`
    }));
    
    setDrafts(updatedDrafts);
    if (activeDraftId === draftId) {
      const fallback = updatedDrafts[0];
      setActiveDraftId(fallback.id);
      const newBoards = fallback.boards || [];
      setBoards(newBoards);
      syncStudentsWithBoards(newBoards);
    }
  };

  const handleHardResetSystem = async () => {
    if (!await showConfirm("🚨 Möchtest du WIRKLICH alle bisher eingereichten Stundenpläne komplett löschen und von vorne beginnen? Dies kann nicht rückgängig gemacht werden!")) {
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
    const unassignedCount = students.filter(s => !s.assignedDay).length;
    
    if (unassignedCount > 0) {
      if (!await showConfirm(`Achtung: Es sind noch ${unassignedCount} Schüler nicht auf deine Unterrichtstage verteilt. Möchtest du den Stundenplan trotzdem einloggen und an die Verwaltung senden?`)) {
        return;
      }
    } else {
      if (!await showConfirm('Möchtest du diesen Stundenplan final einloggen und an die Verwaltung senden?')) {
        return;
      }
    }

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

          const [bsh, bsm] = parseTime(s.start_time.substring(0, 5));
          const bStart = bsh * 60 + bsm;
          const [beh, bem] = parseTime(s.end_time.substring(0, 5));
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
      const validBoards = boards.filter(b => b.students.length > 0);
      await persistScheduleToSupabase(validBoards, true);

      // Trigger alert notification for Secretariat
      const { data: teacherProfile } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', selectedTeacherId)
        .single();

      const teacherName = teacherProfile ? `${teacherProfile.first_name} ${teacherProfile.last_name}` : 'Lehrkraft';

      await supabase.from('system_alerts').insert({
        school_id: schoolId,
        teacher_id: selectedTeacherId,
        type: 'Stundenplan Freigabe',
        message: `🗓️ Stundenplan-Review: Lehrkraft ${teacherName} hat den neuen Stundenplan erstellt und zur Freigabe an die Verwaltung gesendet.`
      });

      // Generate PDF Backup & Celebration
      await generatePDFBackup(validBoards, students);
      setShowCelebration(true);
      setHasSubmittedSchedule(true);
      setScheduleStatus('pending');
      const now = new Date();
      const formattedDate = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const formattedTime = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      setLastSubmittedTime(`am ${formattedDate} um ${formattedTime} Uhr`);
    } catch (err: any) {
      console.error('Error saving schedule:', err);
      await showAlert('Fehler beim Speichern: ' + err.message);
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

  if (loading) {
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

  const showOnboardingOverlay = !isOnboardingCompleted && (currentUserRole === 'teacher') && (selectedTeacherId === userId);

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
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>⚡ 1-Klick Schnell-Auswahl:</span>
            {Object.values(onboardingAvailability).some(c => c.checked) && (
              <button
                type="button"
                onClick={() => setOnboardingAvailability({ 1:{checked:false,start:'',end:''}, 2:{checked:false,start:'',end:''}, 3:{checked:false,start:'',end:''}, 4:{checked:false,start:'',end:''}, 5:{checked:false,start:'',end:''}, 6:{checked:false,start:'',end:''}, 7:{checked:false,start:'',end:''} })}
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                🧹 Alle abwählen
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
              📅 Mo – Fr (13:00 – 19:00)
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
              ☀️ Nachmittag (14:00 – 18:00)
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
                📋 Zeiten auf alle übertragen
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
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '100%', margin: '0', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
      <style>{`
        .apple-btn-group {
          background: rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.05);
          border-radius: 10px;
          padding: 3px;
          display: flex;
          align-items: center;
          gap: 2px;
          backdrop-filter: blur(10px);
        }
        .apple-btn {
          background: transparent;
          border: none;
          color: #475569;
          border-radius: 7px;
          padding: 6px 12px;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          gap: 6px;
          min-height: 30px;
          outline: none;
        }
        .apple-btn:hover {
          background: rgba(0, 0, 0, 0.04);
          color: #1d1d1f;
        }
        .apple-btn:active {
          transform: scale(0.97);
        }
        .apple-btn.active {
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
          font-weight: 700;
        }
        .apple-btn:disabled {
          opacity: 0.4;
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
          boards={drafts.find(d => d.id === submittedDraftId)?.boards || boards} 
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
                        background: totalGapsMin === 0 ? '#f0fdf4' : '#fffbeb',
                        border: `1px solid ${totalGapsMin === 0 ? '#bbf7d0' : '#fde68a'}`,
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        color: totalGapsMin === 0 ? '#15803d' : '#b45309',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.15s',
                        marginLeft: '8px'
                      }}
                      className="hover-scale-mini"
                      title="Klicken, um die Auswertung & Erfolgsanalyse erneut zu öffnen"
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={13} color={totalGapsMin === 0 ? "#34a853" : "#d97706"} />
                        <span>{totalAssigned} Schüler eingeteilt</span>
                      </span>
                      <span style={{ color: '#cbd5e1' }}>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Zap size={12} color={totalGapsMin === 0 ? "#16a34a" : "#d97706"} />
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
                    style={{ padding: '6px 12px', fontSize: '0.78rem', lineHeight: '1.2' }}
                  >
                    Stundenplan-Designer
                  </button>
                </div>
                {currentUserRole === 'teacher' && (
                  <TourStartButton onClick={startDesignerTour} platformTheme={localStorage.getItem('groovelab_active_platform') === 'campus' ? 'campus' : 'groovelab'} />
                )}
              </div>

              {/* Right: Spacer (for centering) */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }} />
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(0, 0, 0, 0.06)', margin: '0 -4px' }} />

            {/* ── ROW 2: Teacher-Filter | Apple-Btn-Group | Status + Senden ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '10px' }}>

              {/* Left: Lehrkraft-Filter & Apple Raster Capsule */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.03)', padding: '3px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.04)', minHeight: '36px' }}>
                  {(currentUserRole === 'admin' || currentUserRole === 'secretary') && teachers.length > 0 ? (
                    <>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={11} style={{ strokeWidth: 3 }} /> Lehrkraft:
                      </span>
                      <select
                        value={selectedTeacherId}
                        onChange={(e) => setSelectedTeacherId(e.target.value)}
                        style={{ background: 'transparent', border: 'none', fontSize: '0.78rem', fontWeight: 700, color: '#1d1d1f', outline: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.first_name} {t.last_name}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                      {currentUserRole === 'teacher' ? 'Dein Designer' : 'Stundenplan-Designer'}
                    </span>
                  )}
                </div>

                {/* 🧲 Apple Raster Selector Capsule */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', padding: '3px 10px', minHeight: '36px', boxSizing: 'border-box', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }} title="Magnetisches Rastersystem für Unterrichtszeiten">
                  <Grid3X3 size={13} style={{ color: brandColor }} />
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'Urbanist, sans-serif' }}>Raster:</span>
                  <select
                    value={gridSnapMinutes}
                    onChange={(e) => setGridSnapMinutes(Number(e.target.value))}
                    style={{ border: 'none', fontSize: '0.78rem', fontWeight: 800, color: '#1d1d1f', background: 'transparent', outline: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <option value={5}>5 Min</option>
                    <option value={15}>15 Min</option>
                    <option value={30}>30 Min</option>
                    <option value={60}>60 Min</option>
                  </select>
                </div>
              </div>

              {/* Center: Apple-Button-Group */}
              <div className="apple-btn-group">

                {/* Namen / Datenschutz Toggle */}
                <button
                  type="button"
                  onClick={() => toggleRealNames()}
                  className={`apple-btn ${showRealNames ? 'active' : ''}`}
                  style={{ color: showRealNames ? '#ea4335' : undefined }}
                  title={showRealNames ? "Namen sind geschützt (Nachnamen gekürzt) – klicken zum Anzeigen" : "Vollständige Namen werden angezeigt – klicken zum Schützen"}
                >
                  {showRealNames ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showRealNames ? "Namen schützen" : "Namen anzeigen"}</span>
                </button>

                <div style={{ width: '1px', height: '16px', background: 'rgba(0,0,0,0.1)', margin: '0 4px' }} />

                {currentUserRole === 'teacher' && selectedTeacherId === userId ? (
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

                <button
                  type="button"
                  onClick={async () => {
                    const inviteLink = window.location.origin + "?onboarding=parent";
                    await navigator.clipboard.writeText(inviteLink);
                    await showAlert("Allgemeiner Schüler-Onboarding-Link kopiert! Sende diesen Link an deine Schüler: " + inviteLink);
                  }}
                  className="apple-btn" title="Onboarding-Link kopieren"
                >
                  <Send size={13} />
                  <span>Onboarding-Link</span>
                </button>

                <label htmlFor="pdf-upload" className="apple-btn" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }} title="Backup aus PDF wiederherstellen">
                  <Upload size={13} />
                  <span>Backup</span>
                </label>
                <input id="pdf-upload" type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleRestoreFromPDF} />
              </div>

              {/* Right: Status + Senden */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleHardResetSystem}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                    fontWeight: 600,
                    padding: '8px 14px',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                  title="Stundenplan und Pool komplett auf Null zurücksetzen (Altlasten löschen)"
                >
                  <Trash2 size={14} />
                  <span>System-Reset</span>
                </button>
                {lastSubmittedTime && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: scheduleStatus === 'approved' ? 'rgba(230, 244, 234, 0.95)' : 'rgba(254, 243, 199, 0.95)', border: `1.5px solid ${scheduleStatus === 'approved' ? '#34a853' : '#f59e0b'}`, color: scheduleStatus === 'approved' ? '#1e7e34' : '#92400e', padding: '6px 14px', borderRadius: '10px', fontSize: '0.76rem', fontWeight: 700, boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                    <span>{scheduleStatus === 'approved' ? '✅ Freigegeben' : '⏳ Eingereicht'}</span>
                    <span style={{ opacity: 0.85, fontWeight: 600 }}>({lastSubmittedTime})</span>
                  </div>
                )}
                <button
                  id="tour-submit-section"
                  type="button"
                  onClick={handleLockAndSend}
                  disabled={submitting || boards.length === 0}
                  style={{
                    background: isCampus 
                      ? 'linear-gradient(135deg, #34a853 0%, #2e7d32 100%)'
                      : (isGroovelab 
                        ? 'linear-gradient(135deg, #eab308 0%, #d97706 100%)' 
                        : 'linear-gradient(135deg, #ea4335 0%, #c62828 100%)'),
                    color: 'white', border: 'none', fontWeight: 800, padding: '8px 16px',
                    borderRadius: '10px', fontSize: '0.78rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    opacity: (submitting || boards.length === 0) ? 0.5 : 1,
                    pointerEvents: (submitting || boards.length === 0) ? 'none' : 'auto',
                    boxShadow: `0 4px 12px ${brandColor}30`,
                    transition: 'all 0.2s', outline: 'none'
                  }}
                  onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'none'}
                >
                  <Send size={13} />
                  <span>{submitting ? 'Wird gesendet...' : 'Einloggen & Senden'}</span>
                </button>
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
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1d1d1f', margin: 0, letterSpacing: '-0.02em' }}>Erfolgreich eingeloggt! 🎉</h3>
            <p style={{ color: '#86868b', fontSize: '0.85rem', fontWeight: 500, marginTop: '8px', lineHeight: 1.4 }}>
              Dein dynamischer Stundenplan wurde sicher gespeichert und zur Freigabe an die Verwaltung übermittelt. Eltern erhalten automatisch Push-Benachrichtigungen zur Bestätigung.
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
          {/* Draft Management Toolbar */}
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.55)', 
            backdropFilter: 'blur(20px) saturate(190%)', 
            WebkitBackdropFilter: 'blur(20px) saturate(190%)',
            borderRadius: '16px', 
            padding: '10px 16px', 
            border: '1px solid rgba(255, 255, 255, 0.5)', 
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: '12px',
            marginTop: '-4px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#86868b', marginRight: '4px' }}>Entwürfe:</span>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                {drafts.map(d => {
                  const isActive = d.id === activeDraftId;
                  const totalLessons = d.boards?.reduce((acc, b) => acc + (b.students?.length || 0), 0) || 0;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => handleSwitchDraft(d.id)}
                      style={{
                        background: isActive 
                          ? 'linear-gradient(135deg, #eab308 0%, #d97706 100%)' 
                          : 'rgba(255, 255, 255, 0.65)',
                        color: isActive ? 'white' : '#1d1d1f',
                        border: '1px solid rgba(0, 0, 0, 0.08)',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: isActive ? '0 4px 12px rgba(217, 119, 6, 0.15)' : '0 2px 4px rgba(0,0,0,0.01)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      onMouseOver={e => {
                        if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                      }}
                      onMouseOut={e => {
                        if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.65)';
                      }}
                    >
                      <span>{d.id === submittedDraftId ? 'Mein Stundenplan' : d.name}</span>
                      <span style={{ 
                        background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.05)', 
                        padding: '1px 5px', 
                        borderRadius: '4px', 
                        fontSize: '0.65rem',
                        color: isActive ? 'white' : '#86868b'
                      }}>
                        {totalLessons}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                style={{
                  background: undoStack.length > 0 ? 'rgba(0, 122, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                  color: undoStack.length > 0 ? '#007aff' : '#94a3b8',
                  border: undoStack.length > 0 ? '1px solid rgba(0, 122, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.08)',
                  fontWeight: 600,
                  padding: '5px 12px',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  cursor: undoStack.length > 0 ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s',
                  opacity: undoStack.length > 0 ? 1 : 0.5
                }}
                onMouseOver={e => { if (undoStack.length > 0) e.currentTarget.style.background = 'rgba(0, 122, 255, 0.15)'; }}
                onMouseOut={e => { if (undoStack.length > 0) e.currentTarget.style.background = 'rgba(0, 122, 255, 0.08)'; }}
                title={undoStack.length > 0 ? `Letzte Verschiebung rückgängig machen (⌘Z) – ${undoStack.length} im Speicher` : "Keine Änderungen zum Rückgängig machen"}
              >
                <RotateCcw size={12} />
                <span>Rückgängig{undoStack.length > 0 ? ` (${undoStack.length})` : ''}</span>
              </button>

              <button
                type="button"
                onClick={handleAutoAssign}
                disabled={students.filter(s => !s.assignedDay && !s.isBreak).length === 0}
                style={{
                  background: 'rgba(52, 168, 83, 0.1)',
                  color: '#34a853',
                  border: '1px solid rgba(52, 168, 83, 0.15)',
                  fontWeight: 600,
                  padding: '5px 12px',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s',
                  opacity: students.filter(s => !s.assignedDay && !s.isBreak).length === 0 ? 0.5 : 1,
                  pointerEvents: students.filter(s => !s.assignedDay && !s.isBreak).length === 0 ? 'none' : 'auto'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(52, 168, 83, 0.15)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(52, 168, 83, 0.1)'}
              >
                <Sparkles size={12} />
                Automatisch zuteilen
              </button>

              <button
                type="button"
                onClick={handleResetAllAssignments}
                disabled={students.filter(s => !!s.assignedDay).length === 0}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  fontWeight: 600,
                  padding: '5px 12px',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s',
                  opacity: students.filter(s => !!s.assignedDay).length === 0 ? 0.5 : 1,
                  pointerEvents: students.filter(s => !!s.assignedDay).length === 0 ? 'none' : 'auto'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
              >
                <Trash2 size={12} />
                Zuteilung zurücksetzen
              </button>
              <button
                type="button"
                onClick={() => handleCreateDraft()}
                style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', border: '1px solid rgba(59, 130, 246, 0.15)', fontWeight: 600, padding: '5px 12px', borderRadius: '8px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.15s' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
              >
                <Plus size={12} />
                Neuer leerer Entwurf
              </button>
              <button
                type="button"
                onClick={() => handleDeleteDraft(activeDraftId)}
                disabled={drafts.length <= 1}
                style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.12)', fontWeight: 600, padding: '5px 12px', borderRadius: '8px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.15s', opacity: drafts.length <= 1 ? 0.5 : 1, pointerEvents: drafts.length <= 1 ? 'none' : 'auto' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
              >
                <Trash2 size={12} />
                Löschen
              </button>
            </div>
          </div>

          {/* Info/Guide banner beneath header */}
          <div style={{
            background: 'rgba(37, 99, 235, 0.06)',
            border: '1px solid rgba(37, 99, 235, 0.12)',
            borderRadius: '12px',
            padding: '10px 14px',
            fontSize: '0.78rem',
            color: '#1d4ed8',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '4px'
          }}>
            <span style={{ fontSize: '1rem' }}>💡</span>
            <span>Nutze <strong>Automatisch zuteilen</strong> für die universitäre 15-Stufen-Zuteilung oder ziehe Schüler per Drag & Drop flexibel in deine Unterrichtstage. <strong>Tipp: Karten rasten magnetisch im 15-Min-Raster ein und verdrängen nachfolgende Termine automatisch.</strong></span>
          </div>

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
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 240px', gap: '14px', alignItems: 'start' }}>
            
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
              {boards.filter(b => focusedDayOfWeek === null || b.dayOfWeek === focusedDayOfWeek).map((board, index, arr) => {
                const dayLabel = DAYS_OF_WEEK.find(d => d.value === board.dayOfWeek)?.name || '';
                const PX_PER_MIN = 2.5;
                const [anchorH, anchorM] = parseTime(board.startAnchor);
                const startMinutes = anchorH * 60 + anchorM;
                const dayConfig = (teacherAvailability as any)?.[board.dayOfWeek];
                let availEndMins = startMinutes + 300; // default 5 hours if not specified
                if (dayConfig?.end) {
                  const [eh, em] = parseTime(dayConfig.end);
                  availEndMins = eh * 60 + em;
                }

                let maxStudentEndMins = startMinutes;
                let curMins = startMinutes;
                board.students.forEach(s => {
                  curMins += s.duration;
                  if (curMins > maxStudentEndMins) maxStudentEndMins = curMins;
                });

                let maxPrefEndMins = startMinutes;
                if ((selectedStudentId || draggedStudentId) && selectedStudentPrefs.length > 0) {
                  selectedStudentPrefs.forEach(pref => {
                    if (Number(pref.day_of_week) === Number(board.dayOfWeek)) {
                      const [peh, pem] = parseTime(pref.end_time);
                      const prefEndMins = peh * 60 + pem;
                      if (prefEndMins > maxPrefEndMins) maxPrefEndMins = prefEndMins;
                    }
                  });
                }

                const endMinutes = Math.max(availEndMins, maxStudentEndMins, maxPrefEndMins, startMinutes + 60);
                const columnHeightPx = (endMinutes - startMinutes) * PX_PER_MIN + 48;
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
                    {/* Day Column Header */}
                    <div 
                      style={{ textAlign: 'center', paddingBottom: '8px', borderBottom: '1px solid rgba(0,0,0,0.05)', position: 'relative', cursor: 'pointer' }}
                      onClick={() => setFocusedDayOfWeek(focusedDayOfWeek === board.dayOfWeek ? null : board.dayOfWeek)}
                      title={focusedDayOfWeek === board.dayOfWeek ? "Zurück zur Wochenansicht" : "Diesen Tag vergrößern (Fokus-Ansicht)"}
                    >
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
                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unterrichtstag</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1d1d1f' }}>{dayLabel}</div>

                      {/* TVöD / ArbZG Arbeitszeit-Warnhinweis */}
                      {(() => {
                        let maxContinuous = 0;
                        let currentContinuous = 0;
                        let totalAssigned = 0;
                        for (const s of board.students) {
                          if (s.isBreak) {
                            currentContinuous = 0;
                          } else {
                            currentContinuous += s.duration;
                            totalAssigned += s.duration;
                            if (currentContinuous > maxContinuous) maxContinuous = currentContinuous;
                          }
                        }

                        if (totalAssigned > 360 && maxContinuous > 360) {
                          return (
                            <div style={{ padding: '3px 8px', marginTop: '4px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700, color: '#991b1b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>⚠️ Gesetzliche Pflichtpause fehlt (über 6 Std. ohne Pause)</span>
                            </div>
                          );
                        } else if (maxContinuous > 180) {
                          return (
                            <div style={{ padding: '3px 8px', marginTop: '4px', background: '#fefce8', border: '1px solid #fef08a', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700, color: '#854d0e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>💡 Pause empfohlen (über 3 Std. am Stück)</span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {/* ── PROPORTIONAL TIME-GRID ── */}
                    <div
                      onDragOver={(e) => {
                            e.preventDefault();
                            const rect = e.currentTarget.getBoundingClientRect();
                            const grabOffset = (dragSource === 'sidebar' || draggedStudentId === 'sidebar-pause') ? 15 : (grabOffsetRef.current || 15);
                            const clientY = Math.max(0, Math.min(e.clientY - rect.top - grabOffset, columnHeightPx));
                            const dragMinutes = clientY / PX_PER_MIN;

                            const [bsh, bsm] = parseTime(board.startAnchor);
                            const boardStartMin = bsh * 60 + bsm;
                            const rawMinutes = boardStartMin + dragMinutes;
                            const snappedTotalMinutes = Math.round(rawMinutes / gridSnapMinutes) * gridSnapMinutes;
                            const snappedHours = Math.floor(snappedTotalMinutes / 60) % 24;
                            const snappedMins = snappedTotalMinutes % 60;
                            const targetTime = `${String(snappedHours).padStart(2, '0')}:${String(snappedMins).padStart(2, '0')}`;

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
                            
                            // Capture exact targetTime from the visual green snap line (dragSnapState)
                            const snapTime = (dragSnapState && dragSnapState.boardId === board.id) ? dragSnapState.timeStr : null;
                            const isAltSwap = e.altKey;
                            
                            setDragSnapState(null);

                            let targetTime = snapTime;
                            if (!targetTime) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const grabOffset = (dragSource === 'sidebar' || draggedStudentId === 'sidebar-pause') ? 15 : (grabOffsetRef.current || 20);
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

                              // Check overlap
                              if (startMin < pEnd && endMin > pStart) {
                                if (pref.preference_type === 'gesperrt') {
                                  isBlocked = true;
                                } else if (pref.preference_type === 'wunsch') {
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
                                borderLeft: gBorderLeft,
                                borderRadius: '8px',
                                padding: '5px 8px',
                                boxSizing: 'border-box',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                gap: '2px',
                                zIndex: 98,
                                pointerEvents: 'none',
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
                        const cardHeightPx = bs.duration * PX_PER_MIN - 4;

                        if (bs.isBreak) {
                          return (
                            <div
                              key={bs.id}
                              draggable={true}
                              onDragStart={(e) => handleDragStart(bs.id, 'board', board.id, e)}
                              onDragEnd={handleDragEnd}
                              onDragOver={(e) => {
                                e.preventDefault();
                                handleAutoScrollCheck(e.clientY);
                              }}
                              onDrop={(e) => { e.stopPropagation(); handleDropOnBoard(board.id, cardIndex); }}
                              style={{
                                position: 'absolute', left: 0, right: 0,
                                top: `${Math.max(cardTopPx, 0)}px`,
                                height: `${Math.max(cardHeightPx, 24)}px`,
                                background: 'rgba(254, 243, 199, 0.55)',
                                border: draggedStudentId === bs.id ? '2px dashed #f59e0b' : '1.5px dashed rgba(245, 158, 11, 0.3)',
                                borderLeft: '4px solid #f59e0b',
                                borderRadius: '8px', padding: '4px 8px', boxSizing: 'border-box',
                                cursor: 'grab', display: 'flex', alignItems: 'center',
                                justifyContent: 'space-between', gap: '4px',
                                zIndex: selectedStudentId !== null ? 1 : 2,
                                visibility: 'visible',
                                opacity: (selectedStudentId !== null || draggedStudentId !== null)
                                  ? (draggedStudentId === bs.id ? 0.55 : 0.40)
                                  : 1,
                                filter: 'none',
                                pointerEvents: 'auto',
                                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                overflow: 'hidden',
                              }}
                            >

                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingBreak({
                                    boardId: board.id,
                                    breakId: bs.id,
                                    startTime: bs.customStartTime || bs.assignedTime || '15:00',
                                    duration: bs.duration
                                  });
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, cursor: 'pointer' }}
                                title="Klicken zum Bearbeiten der Pause"
                              >
                                <span style={{ fontSize: '0.75rem', flexShrink: 0 }}>☕</span>
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#b45309', whiteSpace: 'nowrap' }}>Pause</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                                <div 
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '5px', padding: '1px 4px' }}
                                >
                                  <Clock size={10} strokeWidth={2.5} style={{ color: '#b45309', flexShrink: 0 }} />
                                  <input
                                    type="time"
                                    value={bs.customStartTime || bs.assignedTime || '14:00'}
                                    className="mini-time-input"
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      const newTime = e.target.value;
                                      if (!newTime) return;
                                      setBoards(prev => prev.map(b => {
                                        if (b.id !== board.id) return b;
                                        const nextStudents = b.students.map(s => s.id === bs.id ? { ...s, customStartTime: newTime } : s);
                                        return recalculateBoardTimes({ ...b, students: nextStudents });
                                      }));
                                    }}
                                    onBlur={(e) => {
                                      e.stopPropagation();
                                      const newTime = e.target.value;
                                      if (!newTime) return;
                                      const snappedTime = snapTimeToGrid(newTime, gridSnapMinutes);
                                      setBoards(prev => prev.map(b => {
                                        if (b.id !== board.id) return b;
                                        const nextStudents = b.students.map(s => s.id === bs.id ? { ...s, customStartTime: snappedTime } : s);
                                        return recalculateBoardTimes({ ...b, students: nextStudents });
                                      }));
                                    }}
                                    style={{ width: '56px', background: 'transparent', border: 'none', fontSize: '0.68rem', fontWeight: 800, color: '#b45309', outline: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center' }}
                                    title="Pausen-Startzeit ändern"
                                  />
                                </div>
                                <select
                                  value={bs.duration}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    const newDuration = Number(e.target.value);
                                    setBoards(prev => prev.map(b => {
                                      if (b.id !== board.id) return b;
                                      const nextStudents = b.students.map(s => s.id === bs.id ? { ...s, duration: newDuration } : s);
                                      return recalculateBoardTimes({ ...b, students: nextStudents });
                                    }));
                                  }}
                                  style={{ 
                                    background: 'rgba(255,255,255,0.9)', 
                                    borderRadius: '5px', 
                                    padding: '1px 3px', 
                                    fontSize: '0.62rem', 
                                    fontWeight: 800, 
                                    color: '#b45309',
                                    cursor: 'pointer',
                                    border: '1px solid rgba(245,158,11,0.4)',
                                    outline: 'none',
                                    fontFamily: 'inherit'
                                  }}
                                  title="Dauer der Pause wählen"
                                >
                                  <option value={15}>15 Min.</option>
                                  <option value={30}>30 Min.</option>
                                  <option value={45}>45 Min.</option>
                                  <option value={60}>60 Min.</option>
                                  <option value={75}>75 Min.</option>
                                  <option value={90}>90 Min.</option>
                                </select>
                                <button 
                                  type="button" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleRemoveStudentFromBoard(board.id, bs.id);
                                  }}
                                  style={{ background: 'transparent', border: 'none', color: '#d97706', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '1px' }} 
                                  title="Pause löschen"
                                >
                                  <X size={11} strokeWidth={2.5} />
                                </button>
                              </div>
                            </div>
                          );
                        }

                        const isSubmitted = hasSubmittedSchedule && activeDraftId === submittedDraftId;
                        const isSelected = selectedStudentId === bs.id;
                        const isShaking = shakingStudentId === bs.id;

                        // Check if student is scheduled within a preferred ('wunsch') slot
                        let isInsideWunsch = false;
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

                          const wunschPrefs = studPrefs.filter(p => p.preference_type === 'wunsch' && parseDayNumber(p.day_of_week) === parseDayNumber(board.dayOfWeek));
                          for (const pref of wunschPrefs) {
                            const { startMin: prefStart, endMin: prefEnd } = getPrefStartEndMinutes(pref);

                            if (startMin < prefEnd && endMin > prefStart) {
                              isInsideWunsch = true;
                              break;
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

                            const [bsh, bsm] = parseTime(s.start_time.substring(0, 5));
                            const bStart = bsh * 60 + bsm;
                            const [beh, bem] = parseTime(s.end_time.substring(0, 5));
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

                        const isTeacherConflict = teacherConflictStudentName !== '';
                        const isRoomConflict = roomConflictTeacherName !== '';
                        const isBlockedConflict = blockedSlotReason !== '';
                        const hasConflict = isTeacherConflict || isRoomConflict || isBlockedConflict || isStudentSperrzeitConflict;
                        const conflictMsg = isStudentSperrzeitConflict
                          ? `Sperrzeit-Kollision: ${bs.first_name || 'Schüler'} hat diesen Zeitraum als Sperrzeit angegeben!`
                          : (isBlockedConflict
                            ? `Gesperrt durch externe Blockierung: ${blockedSlotReason}`
                            : (isTeacherConflict
                              ? `Doppelbelegung Lehrkraft: Zeitgleich mit ${teacherConflictStudentName} in ${teacherConflictRoomName}`
                              : `Raumkonflikt: Raum besetzt durch Lehrkraft ${roomConflictTeacherName} (Schüler: ${roomConflictStudentName})`));

                        const isCampusTheme = localStorage.getItem('groovelab_active_platform') === 'campus';
                        const isGroovelabTheme = localStorage.getItem('groovelab_active_platform') === 'groovelab';
                        const isAdminViewTheme = currentUserRole === 'admin' || currentUserRole === 'secretary';

                        const studentInPool = students.find((s: Student) => s.id === bs.id);
                        const isPendingOnboarding = (bs.status === 'ausstehend' || (studentInPool ? (studentInPool.status === 'ausstehend' || studentInPool.isOnboarded === false) : false)) && !studentInPool?.hasPreferences;

                        let cardPrimaryColor = isPendingOnboarding ? '#64748b' : '#34a853'; // Grey vs Campus Green
                        let cardLightBg = isPendingOnboarding ? 'rgba(100, 116, 139, 0.08)' : 'rgba(52, 168, 83, 0.06)';
                        let cardBorderColor = isPendingOnboarding ? 'rgba(100, 116, 139, 0.3)' : 'rgba(52, 168, 83, 0.2)';
                        let cardTextColor = isPendingOnboarding ? '#475569' : '#34a853';
                        let cardLightText = isPendingOnboarding ? '#334155' : '#1e3524';

                        if (!isPendingOnboarding) {
                          if (isAdminViewTheme) {
                            cardPrimaryColor = '#ea4335'; // Admin Red
                            cardLightBg = 'rgba(234, 67, 53, 0.06)';
                            cardBorderColor = 'rgba(234, 67, 53, 0.2)';
                            cardTextColor = '#dc2626';
                            cardLightText = '#450a0a';
                          } else if (isGroovelabTheme) {
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
                          }
                        }

                        const cardBg = hasConflict
                          ? '#ef4444'
                          : (isInsideWunsch
                              ? (isGroovelabTheme ? '#eab308' : '#34a853')
                              : '#ffffff');

                        const cardBorder = hasConflict
                          ? '1px solid #dc2626'
                          : (isInsideWunsch
                              ? (isGroovelabTheme ? '1px solid #ca8a04' : '1px solid #2e7d32')
                              : (isSelected 
                                  ? `1.5px solid ${cardPrimaryColor}`
                                  : '1px solid rgba(0, 0, 0, 0.08)'));

                        const hasAnyGroupMemberPrefs = groupMemberIds.some(mId => (allStudentPrefsMap[mId] && allStudentPrefsMap[mId].length > 0)) || (selectedStudentId === bs.id && selectedStudentPrefs.length > 0);

                        const studentHasPrefs = bs.isGroup
                          ? hasAnyGroupMemberPrefs
                          : Boolean(bs.hasPreferences || studentInPool?.hasPreferences || (allStudentPrefsMap[bs.id] && allStudentPrefsMap[bs.id].length > 0));

                        const cardBorderLeft = !studentHasPrefs
                          ? '4px solid #94a3b8'
                          : (hasConflict
                              ? '4px solid #b91c1c'
                              : (isInsideWunsch
                                  ? '4px solid #f59e0b'
                                  : `4px solid ${cardPrimaryColor}`));

                        const textColor = hasConflict
                          ? '#ffffff'
                          : (isInsideWunsch
                              ? '#ffffff'
                              : '#1d1d1f');

                        const badgeBg = hasConflict
                          ? 'rgba(255, 255, 255, 0.25)'
                          : (isInsideWunsch
                              ? 'rgba(255, 255, 255, 0.25)'
                              : 'rgba(0, 0, 0, 0.05)');

                        const badgeColor = hasConflict
                          ? '#ffffff'
                          : (isInsideWunsch
                              ? '#ffffff'
                              : '#6e6e73');

                        const cardShadow = hasConflict
                          ? '0 2px 8px rgba(239, 68, 68, 0.15)'
                          : (isInsideWunsch
                              ? '0 2px 8px rgba(52, 168, 83, 0.18)'
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
                                ? '#34a853'
                                : cardLightBg);

                          const groupBorder = hasConflict
                            ? '1px solid #dc2626'
                            : (isInsideWunsch
                                ? '1px solid #2e7d32'
                                : (draggedStudentId === bs.id ? '2px dashed #f59e0b' : (isGroupSelected ? '2px solid #16a34a' : `1px solid ${cardBorderColor}`)));

                          const groupBorderLeft = !studentHasPrefs
                            ? (isGroupSelected ? '5px solid #94a3b8' : '4px solid #94a3b8')
                            : (hasConflict
                                ? (isGroupSelected ? '5px solid #b91c1c' : '4px solid #b91c1c')
                                : (isInsideWunsch
                                    ? (isGroupSelected ? '5px solid #f59e0b' : '4px solid #f59e0b')
                                    : (isGroupSelected ? `5px solid ${cardPrimaryColor}` : `4px solid ${cardPrimaryColor}`)));

                          const groupTimeColor = hasConflict || isInsideWunsch ? '#ffffff' : highlightColor;
                          const groupTitleColor = hasConflict || isInsideWunsch ? '#ffffff' : '#1f2937';
                          const groupSubtextColor = hasConflict || isInsideWunsch ? 'rgba(255, 255, 255, 0.85)' : '#4b5563';
                          const groupBadgeBg = hasConflict || isInsideWunsch ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.7)';
                          const groupBadgeColor = hasConflict || isInsideWunsch ? '#ffffff' : highlightColor;
                          const groupActionColor = hasConflict || isInsideWunsch ? '#ffffff' : highlightColor;

                          return (
                            <div
                              key={bs.id}
                              draggable={true}
                              onDragStart={(e) => handleDragStart(bs.id, 'board', board.id, e)}
                              onDragEnd={handleDragEnd}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDragOverBoardId(board.id);
                                setDragOverIndex(cardIndex);
                              }}
                              onDrop={(e) => { e.stopPropagation(); handleDropOnBoard(board.id, cardIndex); }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectStudent(bs.id);
                              }}
                              className={`${isShaking ? 'card-shake' : ''} designer-student-card`}
                              style={{
                                position: 'absolute', left: 0, right: 0,
                                top: `${Math.max(cardTopPx, 0)}px`,
                                height: `${Math.max(cardHeightPx, 32)}px`,
                                background: groupBg,
                                border: groupBorder,
                                borderLeft: groupBorderLeft,
                                borderRadius: '8px', padding: '5px 8px', boxSizing: 'border-box',
                                cursor: 'grab', display: 'flex', flexDirection: 'column',
                                justifyContent: 'center', gap: '2px',
                                zIndex: 2,
                                visibility: 'visible',
                                opacity: draggedStudentId === bs.id ? 0.25 : 1,
                                boxShadow: hasConflict ? '0 2px 8px rgba(239, 68, 68, 0.15)' : (isInsideWunsch ? '0 2px 8px rgba(52, 168, 83, 0.18)' : (isSelected ? `0 0 10px ${cardPrimaryColor}40` : '0 2px 6px rgba(0,0,0,0.03)')),
                                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                overflow: 'hidden',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: groupTimeColor, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  👥 {bs.assignedTime}
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
                                      fontWeight: 700, 
                                      color: groupBadgeColor,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '2px'
                                    }}
                                  >
                                    {isInsideWunsch && <span style={{ color: '#ffffff', fontSize: '0.65rem' }}>★</span>}
                                    {bs.duration}m
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
                                {(bs.first_name || (bs as any).name || (bs as any).full_name || 'Gruppe').trim()} {maskLastName(bs.last_name || '', showRealNames)}
                              </span>
                              <span style={{ fontSize: '0.62rem', fontWeight: 600, color: groupSubtextColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {bs.groupStudents?.map(s => `${s.first_name} ${s.last_name?.[0] ? s.last_name[0] + '.' : ''}`).join(', ')}
                              </span>
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

                              if (startM < pEnd && endM > pStart) {
                                if (pref.preference_type === 'gesperrt') {
                                  hBlocked = true;
                                } else if (pref.preference_type === 'wunsch') {
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

                        if (dragOverBoardId === board.id && draggedStudentId && draggedStudentId !== bs.id && dragOverIndex !== null && cardIndex >= dragOverIndex) {
                          let shiftMins = 30;
                          const draggedStudentObj = board.students.find(s => s.id === draggedStudentId) || students.find(s => s.id === draggedStudentId);
                          if (draggedStudentObj) {
                            shiftMins = draggedStudentObj.duration || 30;
                          }
                          const [origH, origM] = parseTime(bs.assignedTime || board.startAnchor);
                          const newTotalMins = origH * 60 + origM + shiftMins;
                          displayAssignedTime = `${String(Math.floor(newTotalMins / 60) % 24).padStart(2, '0')}:${String(newTotalMins % 60).padStart(2, '0')}`;
                          isLiveShiftedPreview = true;
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
                            onDragStart={(e) => handleDragStart(bs.id, 'board', board.id, e)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => {
                              e.preventDefault();
                              handleAutoScrollCheck(e.clientY);
                            }}
                            onDrop={(e) => { e.stopPropagation(); handleDropOnBoard(board.id, cardIndex); }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isGroupModeActive) {
                                handleToggleSelectForGroup(bs.id, board.id);
                              } else {
                                handleSelectStudent(bs.id);
                              }
                            }}
                            className={`${isShaking ? 'card-shake' : ''} ${hasConflict ? 'conflict-pulse-card' : ''} designer-student-card`}
                            style={{
                              position: 'absolute', left: 0, right: 0,
                              top: `${Math.max(cardTopPx, 0)}px`,
                              height: `${Math.max(cardHeightPx, 32)}px`,
                              background: cardBg,
                              border: draggedStudentId === bs.id ? '2px dashed #16a34a' : (isSelected ? '2px solid #16a34a' : finalBorder),
                              borderLeft: !studentHasPrefs
                                ? (isSelected ? '5px solid #94a3b8' : '4px solid #94a3b8')
                                : (isSelected ? `5px solid ${hasConflict ? '#b91c1c' : (isInsideWunsch ? '#f59e0b' : cardPrimaryColor)}` : cardBorderLeft),
                              borderRadius: '8px', padding: '5px 8px', boxSizing: 'border-box',
                              cursor: isGroupModeActive ? 'pointer' : 'grab', display: 'flex', flexDirection: 'column',
                              justifyContent: 'center', gap: '2px',
                              zIndex: draggedStudentId === bs.id ? 50 : (isSelected ? 10 : 2),
                              userSelect: 'none',
                              WebkitUserSelect: 'none',
                              WebkitTouchCallout: 'none',
                              touchAction: 'manipulation',
                              visibility: 'visible',
                              opacity: draggedStudentId === bs.id 
                                ? 0.25 
                                : (selectedStudentId !== null ? (selectedStudentId === bs.id ? 1 : 0.40) : 1),
                              filter: (selectedStudentId !== null && selectedStudentId !== bs.id && draggedStudentId !== bs.id) ? 'saturate(60%)' : 'none',
                              pointerEvents: 'auto',
                              transform: isSelected ? 'scale(1.015)' : 'none',
                              overflow: 'hidden',
                              boxShadow: isSelected ? '0 4px 16px rgba(22, 163, 74, 0.25)' : (draggedStudentId === bs.id ? '0 8px 24px rgba(22, 163, 74, 0.3)' : finalShadow),
                              transition: draggedStudentId ? 'none' : 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
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
                                  <span style={{ color: '#ef4444', cursor: 'help', fontWeight: 800 }} title={conflictMsg}>⚠️</span>
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
                                        setToast({ message: `Startzeit für ${bs.first_name || 'Schüler'} auf ${newTime} Uhr fixiert! 📌`, type: 'success' });
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
                              {studentHasPrefs && (
                                <span
                                  style={{
                                    fontSize: '0.58rem',
                                    fontWeight: 700,
                                    color: isInsideWunsch ? '#15803d' : (isStudentSperrzeitConflict ? '#b91c1c' : '#c2410c'),
                                    background: isInsideWunsch ? '#dcfce7' : (isStudentSperrzeitConflict ? '#fee2e2' : '#ffedd5'),
                                    padding: '1px 4px',
                                    borderRadius: '3px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                    pointerEvents: 'none'
                                  }}
                                  title={isInsideWunsch ? "1. Wunschzeit der Eltern getroffen" : (isStudentSperrzeitConflict ? "Sperrzeit-Konflikt!" : "Abweichende Uhrzeit")}
                                >
                                  {isInsideWunsch ? '✓ Wunsch' : (isStudentSperrzeitConflict ? '⚠️ Sperrzeit' : 'Abweichung')}
                                </span>
                              )}
                              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: badgeColor, background: badgeBg, padding: '1px 5px', borderRadius: '4px', pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                {isInsideWunsch && (
                                  <span title="Wunschtermin garantiert getroffen!" style={{ display: 'inline-flex', alignItems: 'center' }}>
                                    <Star size={9} fill="currentColor" color="currentColor" />
                                  </span>
                                )}
                                {bs.duration}m
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
                                      ? `Uhrzeit ${bs.assignedTime || '14:00'} für ${bs.first_name || 'Schüler'} fixiert! 📌` 
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
                              zIndex: 10,
                              pointerEvents: 'none',
                              boxShadow: `0 0 12px ${lineColor}`,
                              animation: 'pulse-glowing-line 1.5s infinite alternate'
                            }}
                          >
                            <div style={{ position: 'absolute', left: '-4px', top: '-2px', width: '7px', height: '7px', borderRadius: '50%', background: lineColor, boxShadow: `0 0 6px ${lineColor}` }} />
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
              })}

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

            {/* Sidebar Student Pool */}
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
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1d1d1f', margin: 0 }}>
                  Schüler-Pool ({students.length})
                </h4>
                <p style={{ color: '#86868b', fontSize: '0.68rem', fontWeight: 500, marginTop: '1px' }}>
                  Drag & Drop auf die Spalten.
                </p>
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
                  border: '1.5px dashed rgba(245, 158, 11, 0.25)',
                  borderLeft: '4px solid #f59e0b',
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
                <span style={{ fontSize: '0.8rem' }}>☕</span>
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
                              💬 <strong>Eltern-Notiz:</strong> {selectedStudentNote}
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
                                  const inviteLink = window.location.origin + "?onboarding=parent";
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

          </div>

        </>
      )}
        </div>
      )}

      {/* Fallback rendering of deleteBreakState modal */}
      {deleteBreakState && (() => {
        const isCampusTheme = localStorage.getItem('groovelab_active_platform') === 'campus';
        const primaryColor = isCampusTheme ? '#34a853' : '#ea4335';
        const bgAccent = isCampusTheme ? '#e6f4ea' : '#fce8e6';
        
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
                    boxShadow: `0 4px 12px ${isCampusTheme ? 'rgba(52, 168, 83, 0.2)' : 'rgba(234, 67, 53, 0.2)'}`
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
        const isCampusTheme = localStorage.getItem('groovelab_active_platform') === 'campus';
        const primaryColor = isCampusTheme ? '#34a853' : '#ea4335';
        const bgAccent = isCampusTheme ? '#e6f4ea' : '#fce8e6';
        
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
                    boxShadow: `0 4px 12px ${isCampusTheme ? 'rgba(52, 168, 83, 0.2)' : 'rgba(234, 67, 53, 0.2)'}`
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
        const isCampus = localStorage.getItem('groovelab_active_platform') === 'campus';
        const primaryColor = isCampus ? '#34a853' : '#ea4335';
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
        const isCampus = localStorage.getItem('groovelab_active_platform') === 'campus';
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
                  backgroundColor: isCampus ? '#e6f4ea' : '#fce8e6',
                  color: isCampus ? '#34a853' : '#ea4335',
                  flexShrink: 0
                }}>
                  <AlertCircle size={20} style={{ color: isCampus ? '#34a853' : '#ea4335' }} />
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
                    backgroundColor: isCampus ? '#34a853' : '#ea4335',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: isCampus ? '0 4px 12px rgba(52, 168, 83, 0.2)' : '0 4px 12px rgba(234, 67, 53, 0.2)',
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
                  ☕ Pause anpassen
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
                      flex: 1, padding: '10px', borderRadius: '10px', background: '#eab308', color: '#ffffff',
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
          <StudentScheduleSlotsModal
            student={selectedSlotsStudent}
            onClose={() => setSelectedSlotsStudent(null)}
            onPreferencesSaved={() => {
              setSelectedSlotsStudent(null);
            }}
          />
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
                      Neuen Entwurf anlegen 🗓️
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
                  {autoScheduleReportData.overallScore >= 90 ? '✨ Exzellent' : '👍 Sehr gut'}
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

        {activeTab === 'calendar' ? <CalendarTourComponent /> : <DesignerTourComponent />}

    </div>
  );
}
