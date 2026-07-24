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
  Star
} from 'lucide-react';
import jsPDF from 'jspdf';
import { useRealNamesVisibility, maskLastName } from '../utils/nameHelper';
import { ScheduleCalendarView } from './ScheduleCalendarView';
interface Student {
  id: string;
  first_name: string;
  last_name: string;
  instrument: string;
  duration: number; // Duration in minutes (e.g. 30, 45, 60)
  assignedDay?: number; // 1 = Mon, 2 = Tue, etc.
  assignedTime?: string; // e.g. "14:30"
  isBreak?: boolean;
  customStartTime?: string;
  status?: 'ausstehend' | 'verplant' | 'aktiv' | 'in_bearbeitung';
  isGroup?: boolean;
  groupStudents?: Student[];
  sibling_group_id?: string;
  group_id?: string | null;
  isOnboarded?: boolean;
  hasPreferences?: boolean;
}

interface DayBoard {
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
  const [drafts, setDrafts] = useState<{ id: string; name: string; boards: DayBoard[] }[]>([]);
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

  const [gridSnapMinutes, setGridSnapMinutes] = useState<number>(15); // Default snap to 15 mins

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

  const [draggedStudentId, setDraggedStudentId] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<'sidebar' | 'board' | null>(null);
  const [dragSourceBoardId, setDragSourceBoardId] = useState<string | null>(null);
  const [dragOverBoardId, setDragOverBoardId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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
          .update({ [columnName]: draftStateToSave })
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
            .select('id, first_name, last_name, planned_boards')
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
        .eq(isCampus ? 'is_campus_active' : 'is_groovelab_active', true)
        .order('name');
      const loadedRooms = rData || [];
      setRooms(loadedRooms);
      if (loadedRooms.length > 0) {
        setNewBoardRoom(loadedRooms[0].id);
      }
      
      // 2. Fetch student IDs and statuses assigned to this teacher from students table
      const { data: allStudentsDb } = await supabase
        .from('students')
        .select('id, status, teacher_id')
        .eq('school_id', schoolId)
        .eq('teacher_id', selectedTeacherId);

      const statusMap: Record<string, string> = {};
      const stDbStudentIds: string[] = [];
      allStudentsDb?.forEach(st => {
        statusMap[st.id] = st.status;
        if (st.id) stDbStudentIds.push(st.id);
      });

      // Fetch students from users table assigned to this teacher (or linked via students table)
      let userQuery = supabase
        .from('users')
        .select('id, first_name, last_name, instrument, lesson_duration, sibling_group_id, group_id, is_campus_active, is_groovelab_active, is_active')
        .eq('school_id', schoolId)
        .eq('role', 'student');

      if (stDbStudentIds.length > 0) {
        userQuery = userQuery.or(`teacher_id.eq.${selectedTeacherId},id.in.(${stDbStudentIds.join(',')})`);
      } else {
        userQuery = userQuery.eq('teacher_id', selectedTeacherId);
      }

      const { data: sData } = await userQuery;

      // Fetch pending students from pending_students_decrypted view
      const { data: pendingData } = await supabase
        .from('pending_students_decrypted')
        .select('id, first_name, last_name, instrument, lesson_duration, sibling_group_id, group_id')
        .eq('school_id', schoolId)
        .eq('teacher_id', selectedTeacherId);

      // Collect all student IDs to check student_schedule_preferences
      const rawAllStudentIds = Array.from(new Set([
        ...(allStudentsDb || []).map(s => s.id),
        ...(sData || []).map(s => s.id),
        ...(pendingData || []).map((s: any) => s.id)
      ]));

      const prefSubmittedSet = new Set<string>();
      const prefMap: Record<string, any[]> = {};
      if (rawAllStudentIds.length > 0) {
        const { data: prefRows } = await supabase
          .from('student_schedule_preferences')
          .select('*')
          .in('student_id', rawAllStudentIds);

        prefRows?.forEach(p => {
          prefSubmittedSet.add(p.student_id);
          if (!prefMap[p.student_id]) prefMap[p.student_id] = [];
          prefMap[p.student_id].push(p);
        });
      }
      setAllStudentPrefsMap(prefMap);

      const loadedStudents: Student[] = [
        ...(sData || []).map(s => ({
          id: s.id,
          first_name: resolveFirstName(s),
          last_name: resolveLastName(s),
          instrument: s.instrument || 'Musiker',
          duration: s.lesson_duration || 30,
          status: (statusMap[s.id] || 'verplant') as any,
          sibling_group_id: s.sibling_group_id,
          group_id: s.group_id,
          isOnboarded: Boolean(s.is_campus_active || s.is_groovelab_active || s.is_active || statusMap[s.id] === 'aktiv'),
          hasPreferences: prefSubmittedSet.has(s.id)
        })),
        ...(pendingData || []).map((s: any) => ({
          id: s.id,
          first_name: resolveFirstName(s),
          last_name: resolveLastName(s),
          instrument: s.instrument || 'Musiker',
          duration: s.lesson_duration || 30,
          status: 'ausstehend' as const,
          sibling_group_id: s.sibling_group_id,
          group_id: s.group_id || null,
          isOnboarded: false,
          hasPreferences: prefSubmittedSet.has(s.id)
        }))
      ];

      const { data: teacherProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', selectedTeacherId)
        .maybeSingle();

      setIsOnboardingCompleted(teacherProfile?.teacher_onboarding_completed ?? false);
      setTeacherAvailability(teacherProfile?.teacher_availability ?? {});

      const rawPlanned = (teacherProfile as any)?.[columnName] || teacherProfile?.planned_boards;
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
        loadedDrafts = [{ id: 'default', name: 'Standard-Entwurf', boards: rawPlanned as any }];
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
        loadedDrafts = [{ id: 'default', name: 'Standard-Entwurf', boards: parsedStored }];
        loadedActiveDraftId = 'default';
      }

      setDrafts(loadedDrafts);
      setActiveDraftId(loadedActiveDraftId);

      const currentActiveDraft = loadedDrafts.find(d => d.id === loadedActiveDraftId) || loadedDrafts[0];
      const dbPlannedBoards = currentActiveDraft ? currentActiveDraft.boards : [];

      // 4. Fetch existing schedules to pre-populate boards
      const { data: schedData } = await supabase
        .from('schedules')
        .select('*, student:users!schedules_student_id_fkey(*)')
        .eq('teacher_id', selectedTeacherId);

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

          if (totalAssignedInDraft === 0 && !hasSavedDrafts && schedData && schedData.length > 0) {
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

      // Fallback: If no boards loaded from localStorage, reconstruct solely from database
      if (!hasSavedDrafts && reconstructedBoards.length === 0 && schedData && schedData.length > 0) {
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

      // Consolidate database groups across all boards and pool
      const consolidated = consolidateDatabaseGroups(reconstructedBoards, loadedStudents);
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
            const dayConfig = (teacherProfile.teacher_availability as any)[i];
            reconstructedBoards.push({
              id: `board-${crypto.randomUUID()}`,
              dayOfWeek: i,
              startAnchor: dayConfig?.start || '14:00',
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

      setBoards(reconstructedBoards);
      setStudents(finalGroupedStudents);
      
      // Set activeTab dynamically based on whether the schedule is empty (0 assigned students) or full (>0 assigned students)
      const totalAssigned = reconstructedBoards.reduce((acc, b) => acc + b.students.filter(s => !s.isBreak).length, 0);
      setActiveTab(totalAssigned > 0 ? 'calendar' : 'designer');
      
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

  // Helper to recalculate all lesson times in a column sequentially
  function recalculateBoardTimes(board: DayBoard): DayBoard {
    let currentTime = board.startAnchor;
    const updatedStudents = board.students.map(s => {
      if (s.customStartTime) {
        const [csh, csm] = parseTime(s.customStartTime);
        const [curh, curm] = parseTime(currentTime);
        if (csh * 60 + csm > curh * 60 + curm) {
          currentTime = s.customStartTime;
        }
      }
      const assignedTime = currentTime;
      currentTime = addMinutesToTime(currentTime, s.duration);
      return {
        ...s,
        assignedDay: board.dayOfWeek,
        assignedTime
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

  const handleAutoAssign = async () => {
    // 1. Collect ALL non-break students for this teacher (both pool and board) for clean-slate optimization
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
      setLoading(true);
      const studentIds = unassignedStudents.map(s => s.id);
      
      const { data: prefs, error } = await supabase
        .from('student_schedule_preferences')
        .select('*')
        .in('student_id', studentIds);

      if (error) throw error;

      const prefsByStudentId: Record<string, any[]> = {};
      studentIds.forEach(id => { prefsByStudentId[id] = []; });
      prefs?.forEach(p => {
        if (p.student_id) prefsByStudentId[p.student_id].push(p);
      });

      // Calculate blocked duration in minutes
      const calculateBlockedDuration = (studentPrefs: any[]) => {
        let totalMinutes = 0;
        for (const p of studentPrefs) {
          if (p.preference_type === 'gesperrt') {
            const { startMin, endMin } = getPrefStartEndMinutes(p);
            totalMinutes += Math.max(0, endMin - startMin);
          }
        }
        return totalMinutes;
      };

      const calculateWunschDuration = (studentPrefs: any[]) => {
        let totalMinutes = 0;
        for (const p of studentPrefs) {
          if (p.preference_type === 'wunsch') {
            const { startMin, endMin } = getPrefStartEndMinutes(p);
            totalMinutes += Math.max(0, endMin - startMin);
          }
        }
        return totalMinutes;
      };

      const flexibleStudents = unassignedStudents.filter(s => {
        const hasPrefs = prefsByStudentId[s.id] && prefsByStudentId[s.id].length > 0;
        const hasSib = !!s.sibling_group_id;
        return !hasPrefs && !hasSib;
      });

      const wunschStudents = unassignedStudents.filter(s => {
        const prefs = prefsByStudentId[s.id] || [];
        const hasDirectWunsch = prefs.some(p => p.preference_type === 'wunsch');
        const hasSiblingWunsch = s.sibling_group_id && unassignedStudents.some(other => 
          other.sibling_group_id === s.sibling_group_id && (prefsByStudentId[other.id] || []).some(p => p.preference_type === 'wunsch')
        );
        return hasDirectWunsch || hasSiblingWunsch;
      });

      const sperrzeitStudents = unassignedStudents.filter(s => {
        const prefs = prefsByStudentId[s.id] || [];
        const hasWunsch = prefs.some(p => p.preference_type === 'wunsch');
        const hasPrefs = prefs.length > 0;
        const hasSib = !!s.sibling_group_id;
        return !hasWunsch && (hasPrefs || hasSib);
      });

      // Sort Wunsch students (fewer wunsch minutes = harder to place = placed first)
      wunschStudents.sort((a, b) => {
        const aWunsch = calculateWunschDuration(prefsByStudentId[a.id] || []);
        const bWunsch = calculateWunschDuration(prefsByStudentId[b.id] || []);
        if (aWunsch !== bWunsch) return aWunsch - bWunsch;
        return a.duration - b.duration;
      });

      // Sort Sperrzeit students (more blocked minutes = harder to place = placed first)
      const getSperrzeitScore = (s: any) => {
        const sSiblingBonus = s.sibling_group_id ? 50000 : 0;
        const sPrefs = prefsByStudentId[s.id] || [];
        const sBlockedMinutes = calculateBlockedDuration(sPrefs);
        const sConstraintScore = (sBlockedMinutes / 60) * 10000;
        return sSiblingBonus + sConstraintScore + (s.duration * 100);
      };

      sperrzeitStudents.sort((a, b) => {
        const aScore = getSperrzeitScore(a);
        const bScore = getSperrzeitScore(b);
        if (aScore !== bScore) return bScore - aScore;
        return a.first_name.localeCompare(b.first_name);
      });
      
      flexibleStudents.sort((a, b) => b.duration - a.duration);

      const RUN_ITERATIONS = 100;
      let bestGlobalScore = -Infinity;
      let bestBoardsState: any[] = [];
      let bestNewlyAssigned: Record<string, { day: number; time: string }> = {};

      for (let iteration = 0; iteration < RUN_ITERATIONS; iteration++) {
        // Start each iteration from clean board state (preserving Breaks)
        let currentBoards = boards.map(b => ({ ...b, students: b.students.filter(s => s.isBreak) }));
        const newlyAssignedStudentIds: Record<string, { day: number; time: string }> = {};

        const fuzzedWunschStudents = [...wunschStudents];
        if (iteration > 0) {
          for (let i = 0; i < fuzzedWunschStudents.length - 1; i++) {
            if (Math.random() < 0.2) {
              const temp = fuzzedWunschStudents[i];
              fuzzedWunschStudents[i] = fuzzedWunschStudents[i+1];
              fuzzedWunschStudents[i+1] = temp;
            }
          }
        }

        const fuzzedSperrzeitStudents = [...sperrzeitStudents];
        if (iteration > 0) {
          for (let i = 0; i < fuzzedSperrzeitStudents.length - 1; i++) {
            if (Math.random() < 0.2) {
              const temp = fuzzedSperrzeitStudents[i];
              fuzzedSperrzeitStudents[i] = fuzzedSperrzeitStudents[i+1];
              fuzzedSperrzeitStudents[i+1] = temp;
            }
          }
        }

        const fuzzedFlexibleStudents = [...flexibleStudents];
        if (iteration > 0) {
          for (let i = 0; i < fuzzedFlexibleStudents.length - 1; i++) {
            if (Math.random() < 0.2) {
              const temp = fuzzedFlexibleStudents[i];
              fuzzedFlexibleStudents[i] = fuzzedFlexibleStudents[i+1];
              fuzzedFlexibleStudents[i+1] = temp;
            }
          }
        }

      const isSlotBlockedForStudent = (studentId: string, dayOfWeek: number, startMin: number, endMin: number) => {
        const studentPrefs = prefsByStudentId[studentId] || [];
        const blockedPrefs = studentPrefs.filter(p => p.preference_type === 'gesperrt' && parseDayNumber(p.day_of_week) === parseDayNumber(dayOfWeek));
        for (const pref of blockedPrefs) {
          const { startMin: prefStart, endMin: prefEnd } = getPrefStartEndMinutes(pref);

          if (startMin < prefEnd && endMin > prefStart) {
            return true; // Overlaps with Sperrzeit
          }
        }
        return false;
      };

      const calculateWunschBonus = (studentId: string, dayOfWeek: number, startMin: number, endMin: number) => {
        const studentPrefs = prefsByStudentId[studentId] || [];
        const wunschPrefs = studentPrefs.filter(p => p.preference_type === 'wunsch' && parseDayNumber(p.day_of_week) === parseDayNumber(dayOfWeek));
        for (const pref of wunschPrefs) {
          const { startMin: prefStart, endMin: prefEnd } = getPrefStartEndMinutes(pref);

          if (startMin < prefEnd && endMin > prefStart) {
            return 10000000; // High Wunschzeit-Treffer Bonus
          }
        }
        return 0;
      };

      // Helper to calculate slot fitness (Lückenlos-Bonus, Isolations-Strafe, etc.)
      const calculateSlotFitness = (board: any, startMin: number, endMin: number, isWunschCandidate = false) => {
        let score = 0;
        
        // 1. Check if within Teacher Availability (hard constraint)
        const [bh, bm] = parseTime(board.startAnchor);
        const boardStartMin = bh * 60 + bm;
        const [beh, bem] = parseTime(board.availabilityEnd || '23:59');
        const boardEndMin = beh * 60 + bem;
        
        if (startMin < boardStartMin || endMin > boardEndMin) {
          return -9999999; // Strictly avoid outside teacher hours
        }

        // 2. Check Room Conflict with other teachers or room blockings
        if (board.roomId) {
          const hasBlockedConflict = blockedSlots.some((s: any) => {
            if (s.room_id !== board.roomId || Number(s.day_of_week) !== Number(board.dayOfWeek)) return false;
            const { startMin: bStart, endMin: bEnd } = getPrefStartEndMinutes(s);
            return (startMin < bEnd && endMin > bStart);
          });
          if (hasBlockedConflict) return -9999999;

          const hasOtherTeacherConflict = otherTeachersSchedules.some((os: any) => {
            if (Number(os.day_of_week) !== Number(board.dayOfWeek) || os.room_id !== board.roomId) return false;
            const [osh, osm] = parseTime(os.time_slot);
            const oStart = osh * 60 + osm;
            const oEnd = oStart + (os.duration || 30);
            return (startMin < oEnd && endMin > oStart);
          });
          if (hasOtherTeacherConflict) return -9999999;
        }

        // 3. Check continuous instruction time without breaks (> 180 min penalty)
        let currentContinuousMins = 0;
        for (const s of board.students) {
          if (s.isBreak) {
            currentContinuousMins = 0;
          } else {
            currentContinuousMins += s.duration;
          }
        }
        if (currentContinuousMins + (endMin - startMin) > 180) {
          score -= 15000;
        }

        let lueckenlos = false;
        let gapBefore = 0;
        let gapAfter = 0;

        // Calculate total assigned minutes on this board for load balancing
        let totalAssignedMinutes = 0;
        for (const s of board.students) {
          totalAssignedMinutes += s.duration;
        }
        // Load balancing penalty: boards with more assigned minutes become less attractive
        score -= totalAssignedMinutes * 10;

        if (board.students.length === 0) {
          // Empty board, connecting to start of day is lückenlos
          gapBefore = startMin - boardStartMin;
          if (gapBefore === 0) lueckenlos = true;
        } else {
          // Find closest student before and after
          let closestEndBefore = boardStartMin;
          let closestStartAfter = boardEndMin;

          for (const s of board.students) {
            if (!s.assignedTime) continue;
            const [sh, sm] = parseTime(s.assignedTime);
            const sStart = sh * 60 + sm;
            const sEnd = sStart + s.duration;
            
            if (sEnd <= startMin && sEnd > closestEndBefore) {
              closestEndBefore = sEnd;
            }
            if (sStart >= endMin && sStart < closestStartAfter) {
              closestStartAfter = sStart;
            }
          }

          gapBefore = startMin - closestEndBefore;
          gapAfter = closestStartAfter - endMin;

          if (gapBefore === 0 || gapAfter === 0) lueckenlos = true;
        }

        if (lueckenlos) {
          score += 10000;
        } else if (!isWunschCandidate) {
          // Isolation penalty (only apply for non-Wunschzeit placements!)
          if (gapBefore > 0) score -= Math.floor(gapBefore / 15) * 5000;
          if (gapAfter > 0 && gapAfter < 1440) score -= Math.floor(gapAfter / 15) * 5000;
        }

        return score;
      };

      const siblingMatchBonus = (student: any, board: any, startMin: number, endMin: number) => {
        if (!student.sibling_group_id) return 0;
        for (const s of board.students) {
          if (s.id !== student.id && s.sibling_group_id === student.sibling_group_id && s.assignedTime) {
            const [ssh, ssm] = parseTime(s.assignedTime);
            const sStart = ssh * 60 + ssm;
            const sEnd = sStart + s.duration;
            if (startMin === sEnd || endMin === sStart) {
              return 500000; // 500.000 bonus for placing sibling back-to-back!
            }
            return 50000; // 50.000 bonus for same day
          }
        }
        return 0;
      };

      // PHASE 2 & 3 Combined Logic (Greedy Insertion)
      const assignStudents = (studentsList: any[], isPhase3: boolean) => {
        for (const student of studentsList) {
          const studentPrefs = prefsByStudentId[student.id] || [];
          const wunschPrefs = studentPrefs.filter(p => p.preference_type === 'wunsch');

          let bestCandidate: { boardId: string; insertIndex: number; customStartTime?: string; score: number } | null = null;
          let highestScore = -Infinity;

          // If Phase 2, try Wunschzeit sliding window matches across entire pref time windows
          if (!isPhase3) {
            for (const pref of wunschPrefs) {
              const prefDay = parseDayNumber(pref.day_of_week);
              const board = currentBoards.find(b => parseDayNumber(b.dayOfWeek) === prefDay);
              if (!board) continue;

              const [psh, psm] = parseTime(pref.start_time);
              const prefStartMin = psh * 60 + psm;
              const [peh, pem] = parseTime(pref.end_time || pref.start_time);
              let prefEndMin = peh * 60 + pem;
              if (prefEndMin <= prefStartMin) {
                prefEndMin = prefStartMin + 180; // Default 3h window if end_time missing or equal
              }

              // Teacher availability bounds
              const [bh, bm] = parseTime(board.startAnchor);
              const boardStartMin = bh * 60 + bm;
              const [beh, bem] = parseTime(board.availabilityEnd || '23:59');
              const boardEndMin = beh * 60 + bem;

              // Slide in 15-minute steps across the entire Wunschzeit window
              for (let candidateMin = prefStartMin; candidateMin + student.duration <= prefEndMin; candidateMin += 15) {
                const candidateEndMin = candidateMin + student.duration;

                // Check Sperrzeit for this student
                if (isSlotBlockedForStudent(student.id, board.dayOfWeek, candidateMin, candidateEndMin)) continue;

                // Check Teacher availability
                if (candidateMin < boardStartMin || candidateEndMin > boardEndMin) continue;

                const candidateStartStr = `${String(Math.floor(candidateMin / 60)).padStart(2, '0')}:${String(candidateMin % 60).padStart(2, '0')}`;

                // Verify that inserting this student does not push any existing student on the board into a Sperrzeit
                let testInsertPos = board.students.length;
                for (let i = 0; i < board.students.length; i++) {
                  if (board.students[i].assignedTime) {
                    const [sh, sm] = parseTime(board.students[i].assignedTime!);
                    if (candidateMin < sh * 60 + sm) {
                      testInsertPos = i;
                      break;
                    }
                  }
                }
                const tempStudentsTest = [...board.students];
                tempStudentsTest.splice(testInsertPos, 0, { ...student, assignedDay: board.dayOfWeek, customStartTime: candidateStartStr });
                const tempBoardTest = recalculateBoardTimes({ ...board, students: tempStudentsTest });
                let boardSperrzeitConflict = false;
                for (const bs of tempBoardTest.students) {
                  if (bs.isBreak || !bs.assignedTime) continue;
                  const [bsh, bsm] = parseTime(bs.assignedTime);
                  const bsStart = bsh * 60 + bsm;
                  const bsEnd = bsStart + bs.duration;
                  if (isSlotBlockedForStudent(bs.id, board.dayOfWeek, bsStart, bsEnd)) {
                    boardSperrzeitConflict = true;
                    break;
                  }
                }
                if (boardSperrzeitConflict) continue;

                let customStartTimeViolated = false;
                for (const bs of tempBoardTest.students) {
                  if (bs.assignedTime) {
                    const [ash, asm] = parseTime(bs.assignedTime);
                    const startMin = ash * 60 + asm;
                    const endMin = startMin + bs.duration;

                    // Hard-Lock: Verify that no Wunschzeit student is pushed out of their Wunschzeit window
                    const bsPrefs = prefsByStudentId[bs.id] || [];
                    const bsWunschPrefs = bsPrefs.filter(p => p.preference_type === 'wunsch' && parseDayNumber(p.day_of_week) === parseDayNumber(tempBoardTest.dayOfWeek));
                    if (bsWunschPrefs.length > 0) {
                      let isStillInWunsch = false;
                      for (const pref of bsWunschPrefs) {
                        const { startMin: prefStart, endMin: prefEnd } = getPrefStartEndMinutes(pref);
                        if (startMin < prefEnd && endMin > prefStart) {
                          isStillInWunsch = true;
                          break;
                        }
                      }
                      if (!isStillInWunsch) {
                        customStartTimeViolated = true;
                        break;
                      }
                    }
                  }
                }
                if (customStartTimeViolated) continue;

                // Ensure last student in tempBoardTest doesn't exceed board availability end
                const lastStudent = tempBoardTest.students[tempBoardTest.students.length - 1];
                if (lastStudent && lastStudent.assignedTime) {
                  const [lsh, lsm] = parseTime(lastStudent.assignedTime);
                  if (lsh * 60 + lsm + lastStudent.duration > boardEndMin) {
                    continue;
                  }
                }

                const fitnessScore = calculateSlotFitness(board, candidateMin, candidateEndMin, true);
                const sibBonus = siblingMatchBonus(student, board, candidateMin, candidateEndMin);
                let totalScore = 1000000 + fitnessScore + sibBonus; // 1.000.000 for wunschzeit window hit
                
                // Bonus if exact start of wunschzeit window
                if (candidateMin === prefStartMin) totalScore += 50000;

                if (totalScore > highestScore) {
                  let insertPos = board.students.length;
                  for (let i = 0; i < board.students.length; i++) {
                    if (board.students[i].assignedTime) {
                      const [sh, sm] = parseTime(board.students[i].assignedTime!);
                      if (candidateMin < sh * 60 + sm) {
                        insertPos = i;
                        break;
                      }
                    }
                  }
                  highestScore = totalScore;
                  bestCandidate = { boardId: board.id, insertIndex: insertPos, customStartTime: candidateStartStr, score: totalScore };
                }
              }
            }
          }

          // Fallback or Phase 3: Evaluate standard insertion points (before/after every existing student and at start of day)
          if (!bestCandidate) {
            for (const board of currentBoards) {
              const studentCount = board.students.length;
              for (let pos = 0; pos <= studentCount; pos++) {
                const tempStudents = [...board.students];
                const tempStudentToAssign = { ...student, assignedDay: board.dayOfWeek, customStartTime: undefined };
                tempStudents.splice(pos, 0, tempStudentToAssign);

                const tempBoard = recalculateBoardTimes({ ...board, students: tempStudents });
                const assignedStud = tempBoard.students.find(s => s.id === student.id);
                if (!assignedStud || !assignedStud.assignedTime) continue;

                const [ash, asm] = parseTime(assignedStud.assignedTime);
                const startMin = ash * 60 + asm;
                const endMin = startMin + student.duration;

                // Teacher availability check
                const [bh, bm] = parseTime(board.startAnchor);
                const boardStartMin = bh * 60 + bm;
                const [beh, bem] = parseTime(board.availabilityEnd || '23:59');
                const boardEndMin = beh * 60 + bem;

                if (startMin < boardStartMin || endMin > boardEndMin) {
                  continue; 
                }

                if (isSlotBlockedForStudent(student.id, board.dayOfWeek, startMin, endMin)) continue;

                // Verify that inserting this student does not push any existing student on the board into a Sperrzeit
                let boardSperrzeitConflict = false;
                for (const bs of tempBoard.students) {
                  if (bs.isBreak || !bs.assignedTime) continue;
                  const [bsh, bsm] = parseTime(bs.assignedTime);
                  const bsStart = bsh * 60 + bsm;
                  const bsEnd = bsStart + bs.duration;
                  if (isSlotBlockedForStudent(bs.id, board.dayOfWeek, bsStart, bsEnd)) {
                    boardSperrzeitConflict = true;
                    break;
                  }
                }
                if (boardSperrzeitConflict) continue;

                let customStartTimeViolated = false;
                for (const bs of tempBoard.students) {
                  if (bs.customStartTime && bs.assignedTime) {
                    const [csh, csm] = parseTime(bs.customStartTime);
                    const [ash, asm] = parseTime(bs.assignedTime);
                    if (ash * 60 + asm > csh * 60 + csm) {
                      customStartTimeViolated = true;
                      break;
                    }
                  }
                }
                if (customStartTimeViolated) continue;

                const wunschBonus = calculateWunschBonus(student.id, board.dayOfWeek, startMin, endMin);
                const fitnessScore = calculateSlotFitness(board, startMin, endMin);
                const sibBonus = siblingMatchBonus(student, board, startMin, endMin);
                const score = wunschBonus + fitnessScore + sibBonus;

                if (score > highestScore) {
                  highestScore = score;
                  bestCandidate = { boardId: board.id, insertIndex: pos, score };
                }
              }
            }
          }

          if (bestCandidate) {
            currentBoards = currentBoards.map(b => {
              if (b.id !== bestCandidate!.boardId) return b;
              const studentToAssign = { 
                ...student, 
                assignedDay: b.dayOfWeek, 
                customStartTime: bestCandidate!.customStartTime 
              };
              const nextStudents = [...b.students];
              nextStudents.splice(bestCandidate!.insertIndex, 0, studentToAssign);

              const updatedBoard = recalculateBoardTimes({ ...b, students: nextStudents });
              
              const assignedItem = updatedBoard.students.find(s => s.id === student.id);
              if (assignedItem && assignedItem.assignedTime) {
                newlyAssignedStudentIds[student.id] = { day: b.dayOfWeek, time: assignedItem.assignedTime };
              }
              return updatedBoard;
            });
          }
        }
      };

      // Run Phase 1 (V.I.P. Wunschzeiten)
      assignStudents(fuzzedWunschStudents, false);
      // Run Phase 2 (Sperrzeiten & Siblings)
      assignStudents(fuzzedSperrzeitStudents, false);
      // Run Phase 3 (Flexible)
      assignStudents(fuzzedFlexibleStudents, true);

      // Evaluate Global Score
      let globalScore = 0;
      const assignedIdsCount = Object.keys(newlyAssignedStudentIds).length;

      for (const board of currentBoards) {
        for (const s of board.students) {
          if (newlyAssignedStudentIds[s.id] && !s.isBreak) {
            const sPrefs = prefsByStudentId[s.id] || [];
            if (s.assignedTime) {
              const [ash, asm] = parseTime(s.assignedTime);
              const startMin = ash * 60 + asm;
              const endMin = startMin + s.duration;

              const wunschPrefs = sPrefs.filter(p => p.preference_type === 'wunsch' && parseDayNumber(p.day_of_week) === parseDayNumber(board.dayOfWeek));
              let matchedWunsch = false;
              for (const pref of wunschPrefs) {
                const { startMin: prefStart, endMin: prefEnd } = getPrefStartEndMinutes(pref);
                if (startMin < prefEnd && endMin > prefStart) {
                  matchedWunsch = true;
                  break;
                }
              }
              if (matchedWunsch) {
                globalScore += 100000000; // 100 MILLION BONUS for fulfilling Wunschzeit window!
              }
            }
          }
        }
      }

      globalScore += assignedIdsCount * 100000; // Total student count is secondary to Wunschzeiten!

      if (globalScore > bestGlobalScore) {
        bestGlobalScore = globalScore;
        bestBoardsState = currentBoards;
        bestNewlyAssigned = newlyAssignedStudentIds;
      }
    } // End GRASP Loop

    let currentBoards = bestBoardsState;
    const newlyAssignedStudentIds = bestNewlyAssigned;

    // Track unassignable student IDs
    const failedIds = unassignedStudents
      .filter(s => !newlyAssignedStudentIds[s.id])
      .map(s => s.id);
      setFailedStudentIds(failedIds);

      // Update state
      setBoards(currentBoards);
      setStudents(currentStudents => currentStudents.map(s => {
        if (s.isBreak) return s;
        if (newlyAssignedStudentIds[s.id]) {
          return {
            ...s,
            assignedDay: newlyAssignedStudentIds[s.id].day,
            assignedTime: newlyAssignedStudentIds[s.id].time
          };
        }
        return {
          ...s,
          assignedDay: undefined,
          assignedTime: undefined
        };
      }));

      const assignedCount = Object.keys(newlyAssignedStudentIds).length;
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
            message: `${assignedCount} Schüler wurden erfolgreich zugeteilt!`,
            type: 'success'
          });
        }
      } else {
        setToast({
          message: "Keine Schüler konnten automatisch zugeteilt werden (Sperrzeit-Konflikte oder mangelnde Unterrichtszeit-Kapazitäten).",
          type: 'warning'
        });
      }

    } catch (err: any) {
      console.error("Error during auto assign:", err);
      setToast({
        message: "Fehler bei der automatischen Zuteilung: " + err.message,
        type: 'warning'
      });
    } finally {
      setLoading(false);
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

  // Drag start handler for students (either from sidebar or day board)
  const handleDragStart = async (studentId: string, source: 'sidebar' | 'board', boardId?: string) => {
    setDraggedStudentId(studentId);
    setDragSource(source);
    if (boardId) setDragSourceBoardId(boardId);
    setDragOverBoardId(null);
    setDragOverIndex(null);

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
  };

  const handleDragEnd = () => {
    setDraggedStudentId(null);
    setDragSource(null);
    setDragSourceBoardId(null);
    setDragOverBoardId(null);
    setDragOverIndex(null);
    if (!selectedStudentId) {
      setSelectedStudentPrefs([]);
    }
  };

  // Drag over handler to allow dropping
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
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
  const handleDropOnBoard = async (targetBoardId: string, index?: number) => {
    if (!draggedStudentId) return;

    const isBreakDrag = draggedStudentId.startsWith('break-') || draggedStudentId === 'sidebar-pause';
    const student = students.find(s => s.id === draggedStudentId);
    if (!student && !isBreakDrag) return;

    // Check if we dropped on a specific student card (cross-student drop)
    if (index !== undefined && !isBreakDrag) {
      const targetBoard = boards.find(b => b.id === targetBoardId);
      if (targetBoard) {
        const targetStudent = targetBoard.students[index];
        if (targetStudent && targetStudent.id !== draggedStudentId && !targetStudent.isBreak) {
          // Open decision popup
          setDropDecisionState({ 
            sourceId: draggedStudentId, 
            targetId: targetStudent.id, 
            targetBoardId, 
            index,
            dragSource,
            dragSourceBoardId
          });
          return;
        }
      }
    }

    // Otherwise, execute standard drop immediately!
    await executeStandardDrop(draggedStudentId, targetBoardId, index, dragSource, dragSourceBoardId);
  };

  const executeStandardDrop = async (sourceId: string, targetBoardId: string, index?: number, source?: string | null, sourceBoardId?: string | null, chosenInstrument?: string) => {
    const isBreakDrag = sourceId.startsWith('break-') || sourceId === 'sidebar-pause';
    const studentObj = students.find(s => s.id === sourceId);

    if (!isBreakDrag && studentObj && source === 'sidebar' && !chosenInstrument) {
      const instruments = studentObj.instrument ? studentObj.instrument.split(',').map((i: string) => i.trim()).filter(Boolean) : [];
      if (instruments.length > 1) {
        setInstrumentSelectorState({
          sourceId,
          targetBoardId,
          index,
          dragSource: source,
          dragSourceBoardId: sourceBoardId,
          instruments
        });
        setSelectedDropInstrument(instruments[0]);
        return;
      }
    }

    const student = studentObj ? {
      ...studentObj,
      instrument: chosenInstrument || studentObj.instrument || 'Musiker',
      customStartTime: undefined
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

              const [bsh, bsm] = parseTime(s.start_time.substring(0, 5));
              const bStart = bsh * 60 + bsm;
              const [beh, bem] = parseTime(s.end_time.substring(0, 5));
              const bEnd = beh * 60 + bem;

              return startMin < bEnd && endMin > bStart;
            });

            if (hasBlockedConflict) {
              setShakingStudentId(sourceId);
              setTimeout(() => setShakingStudentId(null), 500);
              setToast({
                message: `Raumkonflikt: Der Raum ist in diesem Zeitraum durch einen externen Termin blockiert!`,
                type: 'warning'
              });

              // Reset drag tracking and stop execution
              setDraggedStudentId(null);
              setDragSource(null);
              setDragSourceBoardId(null);
              setDragOverBoardId(null);
              setDragOverIndex(null);
              return;
            }
          }

          try {
            // Fetch student's 'gesperrt' preferences from Supabase
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
                // Shake the card
                setShakingStudentId(sourceId);
                setTimeout(() => setShakingStudentId(null), 500);

                const allowOverride = await showConfirm(
                  `Achtung: Sperrzeit-Kollision!\n\n${student.first_name} ${maskLastName(student.last_name, showRealNames)} hat den Zeitraum (${formatMinutes(startMin)} - ${formatMinutes(endMin)} Uhr) als Sperrzeit angegeben.\n\nMöchtest du den Schüler trotzdem eintragen?`,
                  'Trotzdem eintragen',
                  'Abbrechen'
                );

                if (!allowOverride) {
                  // Reset drag tracking and stop execution
                  setDraggedStudentId(null);
                  setDragSource(null);
                  setDragSourceBoardId(null);
                  setDragOverBoardId(null);
                  setDragOverIndex(null);
                  return;
                }
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
          if (s.isGroup && s.groupStudents) {
            if (s.id === studentId) {
              // Dragging the whole group card -> remove it entirely
              return;
            }
            const remaining = s.groupStudents.filter(gs => gs.id !== studentId);
            if (remaining.length >= 2) {
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
            const [moved] = nextStudents.splice(curIndex, 1);
            const movedCleared = { ...moved, customStartTime: undefined };
            if (index !== undefined) {
              nextStudents.splice(index, 0, movedCleared);
            } else {
              nextStudents.push(movedCleared);
            }
            const updated = recalculateBoardTimes({ ...targetBoard, students: nextStudents });
            
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

        const cleaned = removeStudentFromBoardsList(prev, sourceId);
        const targetBoardCleaned = cleaned.find(b => b.id === targetBoardId);
        if (!targetBoardCleaned) return prev;

        const targetNextStudents = [...targetBoardCleaned.students];
        const movedStudent = { ...rawMoved, customStartTime: undefined };
        if (index !== undefined) {
          targetNextStudents.splice(index, 0, movedStudent);
        } else {
          targetNextStudents.push(movedStudent);
        }
        const updatedTarget = recalculateBoardTimes({ ...targetBoardCleaned, students: targetNextStudents });

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
          const targetNextStudents = [...targetBoard.students];
          const newBreak: Student = {
            id: `break-${crypto.randomUUID()}`,
            first_name: 'Pause',
            last_name: '',
            instrument: '',
            duration: 15,
            isBreak: true
          };
          if (index !== undefined) {
            targetNextStudents.splice(index, 0, newBreak);
          } else {
            targetNextStudents.push(newBreak);
          }
          const updatedTarget = recalculateBoardTimes({ ...targetBoard, students: targetNextStudents });
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

        const targetNextStudents = [...targetBoardCleaned.students];
        const studentToAssign = { ...student, assignedDay: targetBoardCleaned.dayOfWeek };

        if (index !== undefined) {
          targetNextStudents.splice(index, 0, studentToAssign);
        } else {
          targetNextStudents.push(studentToAssign);
        }

        const updatedTarget = recalculateBoardTimes({ ...targetBoardCleaned, students: targetNextStudents });

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

        return cleaned.map(b => b.id === targetBoardId ? updatedTarget : b);
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

  // Remove a student from a day board (make them unassigned again)
  const handleRemoveStudentFromBoard = (boardId: string, studentId: string) => {
    if (studentId.startsWith('break-')) {
      setDeleteBreakState({ boardId, breakId: studentId });
      return;
    }

    setBoards(prev => {
      const board = prev.find(b => b.id === boardId);
      if (!board) return prev;

      const nextStudents = board.students.filter(s => s.id !== studentId);
      const updatedBoard = recalculateBoardTimes({ ...board, students: nextStudents });

      setStudents(currentStudents => currentStudents.map(s => {
        if (s.id === studentId) {
          return { ...s, assignedDay: undefined, assignedTime: undefined };
        }
        return s;
      }));

      return prev.map(b => b.id === boardId ? updatedBoard : b);
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
      first_name: groupStudents[0].first_name,
      last_name: groupStudents[0].last_name,
      instrument: groupStudents.map(s => s.instrument || 'Musiker').filter((v, i, a) => a.indexOf(v) === i).join(', '),
      duration: groupStudents.reduce((acc, s) => acc + s.duration, 0),
      isGroup: true,
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
    const targetDraft = drafts.find(d => d.id === draftId);
    if (!targetDraft) return;
    
    setActiveDraftId(draftId);
    const newBoards = targetDraft.boards || [];
    setBoards(newBoards);
    syncStudentsWithBoards(newBoards);
  };

  const handleCreateDraft = () => {
    const newId = `draft-${crypto.randomUUID()}`;
    const nextNumber = drafts.length + 1;
    const draftName = `Entwurf ${nextNumber}`;
    
    const defaultRoomId = rooms.length > 0 ? rooms[0].id : '';
    const initialBoards: DayBoard[] = [];
    for (let i = 1; i <= 5; i++) {
      initialBoards.push({
        id: `board-${crypto.randomUUID()}`,
        dayOfWeek: i,
        startAnchor: '14:00',
        roomId: defaultRoomId,
        students: []
      });
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

      // 1. Delete all previous schedules for this teacher
      await supabase
        .from('schedules')
        .delete()
        .eq('teacher_id', selectedTeacherId);

      // Save the planned boards definitions to the teacher's profile in users table
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
        .update({ [columnName]: draftStateToSave })
        .eq('id', selectedTeacherId);

      setSubmittedDraftId(activeDraftId);
      setDrafts(updatedDrafts);

      // 2. Insert all new schedule slots from the day boards
      const inserts = [];
      for (const board of validBoards) {
        for (const s of board.students) {
          if (s.isGroup && s.groupStudents) {
            for (const gs of s.groupStudents) {
              inserts.push({
                school_id: schoolId,
                teacher_id: selectedTeacherId,
                student_id: gs.id,
                day_of_week: board.dayOfWeek,
                time_slot: s.assignedTime,
                room_id: board.roomId || null,
                duration: s.duration,
                status: 'ready_for_admin_review',
                instrument: gs.instrument || 'Musiker'
              });
            }
          } else {
            inserts.push({
              school_id: schoolId,
              teacher_id: selectedTeacherId,
              student_id: s.isBreak ? null : s.id,
              day_of_week: board.dayOfWeek,
              time_slot: s.assignedTime,
              room_id: board.roomId || null,
              duration: s.duration,
              status: s.isBreak ? 'approved' : 'ready_for_admin_review', // A break/pause is auto-approved
              instrument: s.isBreak ? null : (s.instrument || 'Musiker')
            });
          }
        }
      }

      if (inserts.length > 0) {
        // Before inserting, validate that no other approved schedule exists for this student_id with the same instrument column value.
        const studentIds = inserts.map(i => i.student_id).filter(Boolean);
        if (studentIds.length > 0) {
          const { data: existingSchedules, error: checkError } = await supabase
            .from('schedules')
            .select('student_id, instrument, student:users!schedules_student_id_fkey(id, first_name, last_name)')
            .eq('status', 'approved')
            .neq('teacher_id', selectedTeacherId)
            .in('student_id', studentIds);
            
          if (checkError) {
            console.error("Error checking existing schedules:", checkError);
          } else if (existingSchedules && existingSchedules.length > 0) {
            for (const insert of inserts) {
              if (!insert.student_id) continue;
              const conflict = (existingSchedules as any[]).find((es: any) => es.student_id === insert.student_id && es.instrument === insert.instrument);
              if (conflict) {
                const studentObj = conflict.student;
                const studentName = studentObj ? `${studentObj.first_name} ${maskLastName(studentObj.last_name, showRealNames)}` : 'Schüler';
                alert(`Fehler: Für ${studentName} existiert bereits ein genehmigter Stundenplan für das Instrument "${insert.instrument}".`);
                setSubmitting(false);
                return;
              }
            }
          }
        }

        const { data: insertedSchedules, error: insertErr } = await supabase
          .from('schedules')
          .insert(inserts)
          .select();
        if (insertErr) throw insertErr;

        // Generate schedule_occurrences for the next 4 weeks!
        const occurrences: any[] = [];
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        const todayStr = `${y}-${m}-${d}`;

        (insertedSchedules || []).forEach((sch: any) => {
          const { id: scheduleId, student_id, teacher_id, day_of_week, time_slot, duration } = sch;
          if (!student_id || !day_of_week || !time_slot) return;

          for (let i = 0; i < 4; i++) {
            const targetDate = new Date();
            const currentDay = today.getDay() || 7;
            const diff = day_of_week - currentDay + (i * 7);
            targetDate.setDate(today.getDate() + diff);

            const ty = targetDate.getFullYear();
            const tm = String(targetDate.getMonth() + 1).padStart(2, '0');
            const td = String(targetDate.getDate()).padStart(2, '0');
            const dateStr = `${ty}-${tm}-${td}`;
            if (dateStr < todayStr) continue;

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
          }
        });

        // Delete future occurrences for this teacher first to prevent duplicates
        await supabase
          .from('schedule_occurrences')
          .delete()
          .eq('teacher_id', selectedTeacherId)
          .gte('date', todayStr);

        if (occurrences.length > 0) {
          const { error: occErr } = await supabase
            .from('schedule_occurrences')
            .insert(occurrences);
          if (occErr) {
            console.error('Error inserting schedule_occurrences:', occErr);
          }
        }
      }

      // 3. Trigger alert notification for Secretariat
      const { data: teacherProfile } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', selectedTeacherId)
        .single();
      
      const teacherName = teacherProfile ? `${teacherProfile.first_name} ${teacherProfile.last_name}` : 'Patrick';

      await supabase.from('system_alerts').insert({
        school_id: schoolId,
        teacher_id: selectedTeacherId,
        type: 'Stundenplan Freigabe',
        message: `🗓️ Stundenplan-Review: Lehrkraft ${teacherName} hat den neuen Stundenplan erstellt und zur Freigabe an die Verwaltung gesendet.`
      });

      // 4. Generate PDF Backup
      await generatePDFBackup(validBoards, students);

      // 5. Show success animation
      setShowCelebration(true);
      setHasSubmittedSchedule(true);
      setScheduleStatus('pending');
      const now = new Date();
      const formattedDate = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
      const formattedTime = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      setLastSubmittedTime(`am ${formattedDate}. um ${formattedTime}`);
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
          {/* Header Panel — same 2-row layout as ScheduleCalendarView */}
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.65)', 
            backdropFilter: 'blur(30px) saturate(210%)', 
            WebkitBackdropFilter: 'blur(30px) saturate(210%)',
            borderRadius: '16px', 
            padding: '12px 16px', 
            border: '1px solid rgba(255, 255, 255, 0.6)', 
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.03)', 
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
              </div>

              {/* Center: Tab-Switcher + Tour + Raster */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div id="tour-calendar-switch" className="app-segmented-switch" style={{ margin: 0, padding: '3px', gap: '4px', minHeight: '36px', display: 'flex', alignItems: 'center' }}>
                  <button 
                    onClick={() => setActiveTab('calendar')}
                    className={`app-segmented-switch-btn ${(activeTab as string) === 'calendar' ? 'active' : ''}`}
                    style={{ padding: '6px 12px', fontSize: '0.78rem', lineHeight: '1.2' }}
                  >
                    Stundenplan
                  </button>
                  <button 
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
                {/* Grid Snap Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '4px 10px', height: '32px', boxSizing: 'border-box' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'Urbanist' }}>Raster:</span>
                  <select
                    value={gridSnapMinutes}
                    onChange={(e) => setGridSnapMinutes(Number(e.target.value))}
                    style={{ border: 'none', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', background: 'transparent', outline: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <option value={30}>30 Min</option>
                    <option value={15}>15 Min</option>
                    <option value={5}>5 Min</option>
                  </select>
                </div>
              </div>

              {/* Right: Spacer (for centering) */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }} />
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(0, 0, 0, 0.06)', margin: '0 -4px' }} />

            {/* ── ROW 2: Teacher-Filter | Apple-Btn-Group | Status + Senden ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '10px' }}>

              {/* Left: Lehrkraft-Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.03)', padding: '3px 8px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.04)', minHeight: '36px' }}>
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
                {hasSubmittedSchedule && scheduleStatus === 'approved' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(230, 244, 234, 0.65)', border: '1px solid rgba(52, 168, 83, 0.25)', color: '#34a853', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700 }}>
                    <span style={{ color: '#34a853', fontSize: '0.8rem' }}>✓</span>
                    <span>Freigegeben</span>
                  </div>
                )}
                {hasSubmittedSchedule && scheduleStatus === 'pending' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(254, 243, 199, 0.65)', border: '1px solid rgba(245, 158, 11, 0.25)', color: '#92400e', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700 }}>
                    <span style={{ color: '#d97706', fontSize: '0.8rem' }}>⏳</span>
                    <span>Eingereicht {lastSubmittedTime ? `(um ${lastSubmittedTime} Uhr)` : '(Wartet auf Freigabe)'}</span>
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
            <span>Ziehe Schüler aus dem Pool direkt in deine Unterrichtstage. Pausen & Slots berechnen sich automatisch. <strong>Tipp: Die blaue Startzeit unter dem Wochentag kann durch Anklicken manuell angepasst werden.</strong></span>
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
              overflow: 'hidden'
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
                    onDrop={() => handleDropOnBoard(board.id)}
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
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1d1d1f', marginBottom: '8px' }}>{dayLabel}</div>
                      
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                        {/* Apple iOS-Style Time Pill */}
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            background: lightBg,
                            borderRadius: '6px',
                            padding: '2px 5px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: textAccentColor,
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = hoverBg; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = lightBg; }}
                        >
                          <input 
                            type="time" 
                            value={board.startAnchor} 
                            className="mini-time-input"
                            onChange={(e) => {
                              const newVal = e.target.value;
                              const snappedVal = newVal ? snapTimeToGrid(newVal, gridSnapMinutes) : '14:00';
                              setBoards(prev => prev.map(b => {
                                if (b.id !== board.id) return b;
                                return recalculateBoardTimes({ ...b, startAnchor: snappedVal });
                              }));
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ fontSize: '0.78rem', fontWeight: 700, border: 'none', background: 'transparent', outline: 'none', color: textAccentColor, padding: 0, width: '42px', cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit' }}
                            title="Startzeit ändern"
                          />
                          <span style={{ fontSize: '0.65rem', fontWeight: 600, marginLeft: '1px', color: textAccentColor }}>Uhr</span>
                        </div>
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
                        const clientY = e.clientY - rect.top;
                        const dragMinutes = clientY / PX_PER_MIN;
                        
                        let accMin = 0;
                        let targetIndex = 0;
                        for (let i = 0; i < board.students.length; i++) {
                          const s = board.students[i];
                          const cardStart = accMin;
                          const cardEnd = accMin + s.duration;
                          if (dragMinutes < (cardStart + cardEnd) / 2) {
                            break;
                          }
                          accMin += s.duration;
                          targetIndex = i + 1;
                        }
                        
                        if (dragOverBoardId !== board.id || dragOverIndex !== targetIndex) {
                          setDragOverBoardId(board.id);
                          setDragOverIndex(targetIndex);
                        }
                      }}
                      onDragLeave={() => {
                        setDragOverBoardId(null);
                        setDragOverIndex(null);
                      }}
                      onDrop={() => {
                        handleDropOnBoard(board.id, dragOverIndex !== null ? dragOverIndex : undefined);
                      }}
                      style={{ 
                        position: 'relative', 
                        height: `${columnHeightPx}px`, 
                        flexShrink: 0, 
                        marginTop: '4px',
                        backgroundColor: dragOverBoardId === board.id ? lightBg : 'transparent',
                        outline: dragOverBoardId === board.id ? `1.5px dashed ${brandColor}` : 'none',
                        borderRadius: '12px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                       {/* Hour marker & 15-minute subdivision lines */}
                      {hourMarkers.map(m => {
                        const subMarkers = [];
                        for (const minOffset of [15, 30, 45]) {
                          const subTop = m.top + minOffset * PX_PER_MIN;
                          if (subTop <= columnHeightPx) {
                            subMarkers.push(
                              <div
                                key={`sub-${m.hour}-${minOffset}`}
                                style={{ 
                                  position: 'absolute', 
                                  left: 0, 
                                  right: 0, 
                                  top: `${subTop}px`, 
                                  borderTop: '1px dotted rgba(0,0,0,0.05)', 
                                  pointerEvents: 'none', 
                                  zIndex: 0 
                                }}
                              />
                            );
                          }
                        }
                        return (
                          <React.Fragment key={m.hour}>
                            <div
                              style={{ position: 'absolute', left: 0, right: 0, top: `${m.top}px`, borderTop: '1px dashed rgba(0,0,0,0.08)', pointerEvents: 'none', zIndex: 0 }}
                            >
                              <span style={{ position: 'absolute', left: '2px', top: '-8px', fontSize: '0.58rem', color: 'rgba(0,0,0,0.25)', fontWeight: 700, userSelect: 'none' }}>
                                {String(m.hour).padStart(2, '0')}:00
                              </span>
                            </div>
                            {subMarkers}
                          </React.Fragment>
                        );
                      })}

                      {/* Interactive Preferences Overlays (Roentgen Matrix View) */}
                       {(selectedStudentId || draggedStudentId) && (() => {
                        const blockCount = Math.floor((endMinutes - startMinutes) / 15);
                        const matchedTypes: ('wunsch' | 'gesperrt' | null)[] = Array(blockCount).fill(null);
                        
                        for (let i = 0; i < blockCount; i++) {
                          const blockStart = startMinutes + i * 15;
                          const blockEnd = blockStart + 15;
                          
                          selectedStudentPrefs.forEach(pref => {
                            if (pref.day_of_week === board.dayOfWeek) {
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
                                    fontSize: '0.64rem',
                                    fontWeight: 800,
                                    color: isBlocked ? '#991b1b' : '#166534',
                                    background: isBlocked ? '#fef2f2' : '#f0fdf4',
                                    padding: '2px 6px',
                                    borderRadius: '6px',
                                    border: `1px solid ${isBlocked ? '#fecaca' : '#bbf7d0'}`,
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                    backdropFilter: 'blur(4px)',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {isBlocked ? <Ban size={11} color="#dc2626" /> : null}
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
                                fontSize: '0.64rem',
                                fontWeight: 800,
                                color: isBlocked ? '#991b1b' : '#166534',
                                background: isBlocked ? '#fef2f2' : '#f0fdf4',
                                padding: '2px 6px',
                                borderRadius: '6px',
                                border: `1px solid ${isBlocked ? '#fecaca' : '#bbf7d0'}`,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                backdropFilter: 'blur(4px)',
                                whiteSpace: 'nowrap'
                              }}>
                                {isBlocked ? <Ban size={11} color="#dc2626" /> : <Star size={11} fill="#16a34a" color="#166534" />}
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
                              draggable
                              onDragStart={() => handleDragStart(bs.id, 'board', board.id)}
                              onDragEnd={handleDragEnd}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDragOverBoardId(board.id);
                                setDragOverIndex(cardIndex);
                              }}
                              onDrop={(e) => { e.stopPropagation(); handleDropOnBoard(board.id, cardIndex); }}
                              style={{
                                position: 'absolute', left: 0, right: 0,
                                top: `${Math.max(cardTopPx, 0)}px`,
                                height: `${Math.max(cardHeightPx, 24)}px`,
                                background: 'rgba(254, 243, 199, 0.55)',
                                border: '1.5px dashed rgba(245, 158, 11, 0.3)',
                                borderLeft: '4px solid #f59e0b',
                                borderRadius: '8px', padding: '4px 8px', boxSizing: 'border-box',
                                cursor: 'grab', display: 'flex', alignItems: 'center',
                                justifyContent: 'space-between', gap: '4px',
                                zIndex: selectedStudentId !== null ? 1 : 2,
                                opacity: selectedStudentId !== null ? 0.8 : 1,
                                filter: 'none',
                                pointerEvents: 'auto',
                                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                overflow: 'hidden',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                                <span style={{ fontSize: '0.75rem', flexShrink: 0 }}>☕</span>
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#b45309', whiteSpace: 'nowrap' }}>Pause</span>
                                <span style={{ fontSize: '0.6rem', color: '#d97706', fontWeight: 600 }}>{bs.assignedTime}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '5px', padding: '1px 3px' }}>
                                  <Clock size={8} strokeWidth={2.5} style={{ color: '#b45309' }} />
                                  <input
                                    type="time" value={bs.customStartTime || bs.assignedTime} className="mini-time-input"
                                    onChange={(e) => {
                                      const newTime = e.target.value || undefined;
                                      const snappedTime = newTime ? snapTimeToGrid(newTime, gridSnapMinutes) : undefined;
                                      const resolvedTime = snappedTime === bs.assignedTime ? undefined : snappedTime;
                                      setBoards(prev => prev.map(b => {
                                        if (b.id !== board.id) return b;
                                        const nextStudents = b.students.map(s => s.id === bs.id ? { ...s, customStartTime: resolvedTime } : s);
                                        return recalculateBoardTimes({ ...b, students: nextStudents });
                                      }));
                                    }}
                                    style={{ width: '38px', background: 'transparent', border: 'none', fontSize: '0.62rem', fontWeight: 700, color: '#b45309', outline: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
                                  />
                                </div>
                                 <span 
                                   style={{ 
                                     background: 'rgba(255,255,255,0.6)', 
                                     borderRadius: '5px', 
                                     padding: '1px 5px', 
                                     fontSize: '0.62rem', 
                                     fontWeight: 700, 
                                     color: '#b45309' 
                                   }}
                                 >
                                   {bs.duration}m
                                 </span>
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
                        const studPrefs = allStudentPrefsMap[bs.id] || (selectedStudentId === bs.id ? selectedStudentPrefs : []);
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

                        const isTeacherConflict = teacherConflictStudentName !== '';
                        const isRoomConflict = roomConflictTeacherName !== '';
                        const isBlockedConflict = blockedSlotReason !== '';
                        const hasConflict = isTeacherConflict || isRoomConflict || isBlockedConflict;
                        const conflictMsg = isBlockedConflict
                          ? `Gesperrt durch externe Blockierung: ${blockedSlotReason}`
                          : (isTeacherConflict
                            ? `Doppelbelegung Lehrkraft: Zeitgleich mit ${teacherConflictStudentName} in ${teacherConflictRoomName}`
                            : `Raumkonflikt: Raum besetzt durch Lehrkraft ${roomConflictTeacherName} (Schüler: ${roomConflictStudentName})`);

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
                          ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
                          : (isInsideWunsch
                              ? cardPrimaryColor
                              : (isSelected 
                                  ? cardLightBg
                                  : (isSubmitted 
                                      ? 'rgba(230, 244, 234, 0.5)' 
                                      : cardLightBg)));

                        const cardBorder = hasConflict
                          ? '1.5px solid #ef4444'
                          : (isInsideWunsch
                              ? `1px solid ${cardPrimaryColor}`
                              : (isSelected 
                                  ? `1.5px solid ${cardPrimaryColor}`
                                  : `1px solid ${cardBorderColor}`));

                        const cardBorderLeft = hasConflict
                          ? '4px solid #dc2626'
                          : (isInsideWunsch
                              ? `4px solid ${cardPrimaryColor}`
                              : `4px solid ${cardPrimaryColor}`);

                        const textColor = hasConflict
                          ? '#991b1b'
                          : (isInsideWunsch
                              ? '#ffffff'
                              : (isSelected 
                                  ? cardTextColor
                                  : cardLightText));

                        const badgeBg = hasConflict
                          ? 'rgba(239, 68, 68, 0.1)'
                          : (isInsideWunsch
                              ? 'rgba(255, 255, 255, 0.2)'
                              : 'rgba(255, 255, 255, 0.45)');

                        const badgeColor = hasConflict
                          ? '#ef4444'
                          : (isInsideWunsch
                              ? '#ffffff'
                              : cardTextColor);

                        const shadowColor = isSubmitted 
                          ? 'rgba(0,0,0,0.02)' 
                          : 'rgba(0,0,0,0.03)';
                        const shadowHoverColor = isSubmitted 
                          ? 'rgba(0,0,0,0.06)' 
                          : 'rgba(0,0,0,0.08)';
                        const cardShadow = hasConflict
                          ? '0 4px 10px rgba(239, 68, 68, 0.15)'
                          : (isInsideWunsch
                              ? `0 6px 16px ${cardPrimaryColor}33`
                              : (isSelected 
                                  ? `0 0 10px ${cardPrimaryColor}40`
                                  : `0 2px 6px ${shadowColor}`));

                        const isSelectedForGroup = selectedForGroup.includes(bs.id);
                        const highlightColor = cardPrimaryColor;

                        if (bs.isGroup) {
                          return (
                            <div
                              key={bs.id}
                              draggable
                              onDragStart={() => handleDragStart(bs.id, 'board', board.id)}
                              onDragEnd={handleDragEnd}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDragOverBoardId(board.id);
                                setDragOverIndex(cardIndex);
                              }}
                              onDrop={(e) => { e.stopPropagation(); handleDropOnBoard(board.id, cardIndex); }}
                              onClick={(e) => { e.stopPropagation(); }}
                              className={`${isShaking ? 'card-shake' : ''} designer-student-card`}
                              style={{
                                position: 'absolute', left: 0, right: 0,
                                top: `${Math.max(cardTopPx, 0)}px`,
                                height: `${Math.max(cardHeightPx, 32)}px`,
                                background: cardLightBg,
                                border: isSelected ? `1.5px solid ${cardPrimaryColor}` : `1px solid ${cardBorderColor}`,
                                borderLeft: `4px solid ${cardPrimaryColor}`,
                                borderRadius: '8px', padding: '5px 8px', boxSizing: 'border-box',
                                cursor: 'grab', display: 'flex', flexDirection: 'column',
                                justifyContent: 'center', gap: '2px',
                                zIndex: 2,
                                boxShadow: isSelected ? `0 0 10px ${cardPrimaryColor}40` : '0 2px 6px rgba(0,0,0,0.03)',
                                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: highlightColor, display: 'flex', alignItems: 'center', gap: '3px' }}>
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
                                        color: highlightColor,
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
                                       background: 'rgba(255,255,255,0.7)', 
                                       borderRadius: '5px', 
                                       padding: '1px 5px', 
                                       fontSize: '0.62rem', 
                                       fontWeight: 700, 
                                       color: highlightColor 
                                     }}
                                   >
                                     {bs.duration}m
                                   </span>
                                  <button 
                                    type="button" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      handleRemoveStudentFromBoard(board.id, bs.id);
                                    }}
                                    style={{ background: 'transparent', border: 'none', color: highlightColor, display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '1px', opacity: 0.7 }}
                                    title="Entfernen"
                                  >
                                    <X size={11} strokeWidth={2.5} />
                                  </button>
                                </div>
                              </div>
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {(bs.first_name || (bs as any).name || (bs as any).full_name || 'Gruppe').trim()} {maskLastName(bs.last_name || '', showRealNames)}
                              </span>
                              <span style={{ fontSize: '0.62rem', fontWeight: 600, color: '#4b5563', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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

                        return (
                          <div
                            key={bs.id}
                            draggable={true}
                            onDragStart={() => handleDragStart(bs.id, 'board', board.id)}
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
                              border: finalBorder,
                              borderLeft: cardBorderLeft,
                              borderRadius: '8px', padding: '5px 8px', boxSizing: 'border-box',
                              cursor: isGroupModeActive ? 'pointer' : 'grab', display: 'flex', flexDirection: 'column',
                              justifyContent: 'center', gap: '2px',
                              zIndex: selectedStudentId !== null ? (isSelected ? 4 : 2) : 2,
                              opacity: (selectedStudentId !== null || draggedStudentId !== null)
                                ? ((selectedStudentId === bs.id || draggedStudentId === bs.id) ? 1 : 0.6)
                                : 1,
                              filter: 'none',
                              pointerEvents: 'auto',
                              transform: isSelected ? 'scale(1.02)' : 'none',
                              overflow: 'hidden',
                              boxShadow: finalShadow,
                              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            }}
                          onMouseOver={e => {
                            if (!isSelected) {
                              e.currentTarget.style.boxShadow = hasConflict ? '0 4px 14px rgba(239,68,68,0.25)' : `0 4px 14px ${shadowHoverColor}`;
                            }
                          }}
                          onMouseOut={e => {
                            if (!isSelected) {
                              e.currentTarget.style.boxShadow = cardShadow;
                            }
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: textColor, display: 'flex', alignItems: 'center', gap: '3px' }}>
                              {hasConflict && (
                                <span style={{ color: '#ef4444', cursor: 'help', fontWeight: 800 }} title={conflictMsg}>⚠️</span>
                              )}
                              {isInsideWunsch && (
                                <span style={{ color: '#f59e0b', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center' }} title="Wunschtermin garantiert getroffen!">⭐</span>
                              )}
                              {bs.assignedTime}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              {isInsideWunsch && (
                                <span style={{ fontSize: '0.6rem', fontWeight: 800, color: isInsideWunsch ? '#ffffff' : '#15803d', background: isInsideWunsch ? 'rgba(255,255,255,0.25)' : '#dcfce7', border: isInsideWunsch ? '1px solid rgba(255,255,255,0.4)' : '1px solid #86efac', borderRadius: '4px', padding: '1px 5px', display: 'inline-flex', alignItems: 'center', gap: '2px' }} title="Wunschtermin garantiert getroffen!">
                                  ⭐ Wunsch-Slot
                                </span>
                              )}
                              <span style={{ fontSize: '0.62rem', fontWeight: 600, color: badgeColor, background: badgeBg, padding: '1px 5px', borderRadius: '4px' }}>{bs.duration}m</span>
                              <button 
                                type="button" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleRemoveStudentFromBoard(board.id, bs.id);
                                }}
                                style={{ background: 'transparent', border: 'none', color: badgeColor, display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '1px', opacity: 0.7 }}
                                onMouseOver={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                                onMouseOut={e => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; (e.currentTarget as HTMLElement).style.color = badgeColor; }}
                                title="Entfernen"
                              >
                                <X size={11} strokeWidth={2.5} />
                              </button>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <InstrumentBadge instrument={bs.instrument} color={textColor} />
                            {(bs.first_name || (bs as any).name || (bs as any).full_name || 'Schüler').trim()} {maskLastName(bs.last_name || '', showRealNames)}
                          </span>
                          {cardHeightPx > 52 && (
                            <span style={{ fontSize: '0.62rem', fontWeight: 600, color: isInsideWunsch ? 'rgba(255,255,255,0.85)' : (hasConflict ? '#991b1b' : (isSubmitted ? cardPrimaryColor : cardTextColor)), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bs.instrument}</span>
                          )}
                        </div>
                      );
                    })}
                      {/* Drag insertion indicator line */}
                      {(() => {
                        if (dragOverBoardId !== board.id || dragOverIndex === null) return null;
                        const lineColor = brandColor;
                        
                        let topPx = 0;
                        if (dragOverIndex < board.students.length) {
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
                            <div style={{ position: 'absolute', right: '-4px', top: '-2px', width: '7px', height: '7px', borderRadius: '50%', background: lineColor, boxShadow: `0 0 6px ${lineColor}` }} />
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
                  Schüler-Pool
                </h4>
                <p style={{ color: '#86868b', fontSize: '0.68rem', fontWeight: 500, marginTop: '1px' }}>
                  Drag & Drop auf die Spalten.
                </p>
              </div>

              {/* Draggable Pause item */}
              <div
                id="tour-special-features"
                draggable
                onDragStart={() => handleDragStart('sidebar-pause', 'sidebar')}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '350px', overflowY: 'auto', paddingRight: '2px' }}>
                {filteredStudents.map(s => {
                  const isAssigned = !!s.assignedDay;
                  const assignedDayLabel = isAssigned ? DAYS_OF_WEEK.find(d => d.value === s.assignedDay)?.name : '';
                  const isSelected = selectedStudentId === s.id;
                  const isShaking = shakingStudentId === s.id;

                  return (
                    <div
                      key={s.id}
                      draggable={!isAssigned}
                      onDragStart={() => handleDragStart(s.id, 'sidebar')}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleSelectStudent(s.id)}
                      className={isShaking ? 'card-shake' : ''}
                      style={{ 
                        background: s.hasPreferences
                          ? (isSelected ? '#f0fdf4' : (isAssigned ? 'rgba(52, 168, 83, 0.05)' : 'rgba(240, 253, 244, 0.8)'))
                          : (isSelected ? '#f8fafc' : (isAssigned ? 'rgba(0, 0, 0, 0.02)' : 'rgba(248, 250, 252, 0.8)')), 
                        backdropFilter: isAssigned ? 'none' : 'blur(12px)',
                        WebkitBackdropFilter: isAssigned ? 'none' : 'blur(12px)',
                        border: s.hasPreferences
                          ? (isSelected ? '1.5px solid #16a34a' : '1px solid #bbf7d0')
                          : (isSelected ? '1.5px solid #475569' : '1px solid #cbd5e1'), 
                        borderLeft: s.hasPreferences
                          ? (isSelected ? '4px solid #16a34a' : (isAssigned ? '3px solid #86efac' : '4px solid #34a853'))
                          : (isSelected ? '4px solid #0f172a' : (isAssigned ? '3px solid #cbd5e1' : '4px solid #94a3b8')), 
                        borderRadius: '8px', 
                        padding: '6px 8px', 
                        cursor: 'pointer', 
                        opacity: isSelected ? 1 : (isAssigned ? 0.6 : 1), 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '4px',
                        boxShadow: isSelected 
                          ? (s.hasPreferences ? '0 4px 14px rgba(22, 163, 74, 0.18)' : '0 4px 14px rgba(15, 23, 42, 0.14)')
                          : (isAssigned ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.01)'),
                        transition: 'all 0.25s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1d1d1f', display: 'block', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '4px' }}>
                          {(s.first_name || (s as any).name || (s as any).full_name || 'Schüler').trim()} {maskLastName(s.last_name || '', showRealNames)}
                        </span>
                        {failedStudentIds.includes(s.id) ? (
                          <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '3px' }} title="Dieser Schüler konnte wegen Sperrzeit-Kollision nicht eingeteilt werden. Sende erneut den Onboarding-Link oder erweitere deine Unterrichtszeiten.">
                            <Ban size={9} color="#dc2626" />
                            <span>Sperrzeit-Konflikt</span>
                          </span>
                        ) : s.hasPreferences ? (
                          <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#166534', background: '#e6f4ea', border: '1px solid #bbf7d0', padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '3px' }} title="Wunsch- & Sperrzeiten gemeldet (Stundenplan-Onboarding abgeschlossen)">
                            <Star size={9} fill="#16a34a" color="#166534" />
                            <span>Zeiten da</span>
                          </span>
                        ) : s.status === 'ausstehend' ? (
                          <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#ea580c', background: '#fff7ed', border: '1px solid #ffedd5', padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.02em' }} title="Noch keine Wunsch- & Sperrzeiten eingereicht (Stundenplan-Onboarding ausstehend)">Ausstehend</span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }} title="Stundenplan-Onboarding abgeschlossen">
                            <span style={{
                              height: '7px',
                              width: '7px',
                              borderRadius: '50%',
                              background: '#34a853',
                              boxShadow: '0 0 6px rgba(52, 168, 83, 0.35)',
                              flexShrink: 0
                            }}></span>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.62rem', fontWeight: 600, color: '#86868b' }}>
                          {s.duration} Min
                        </span>

                        {isAssigned && (
                          <span style={{ fontSize: '0.58rem', fontWeight: 600, color: '#34a853', background: 'rgba(230, 244, 234, 0.6)', padding: '1px 4px', borderRadius: '4px', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }} title={`${assignedDayLabel} um ${s.assignedTime}`}>
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
                            {s.status === 'ausstehend' ? (
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const inviteLink = window.location.origin + "?onboarding=parent";
                                  navigator.clipboard.writeText(inviteLink);
                                  await showAlert("Onboarding-Link kopiert! Du kannst diesen Link jetzt an die Eltern senden: " + inviteLink);
                                }}
                                style={{ flex: 1, padding: '4px 8px', background: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.58rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                              >
                                Onboarding-Link kopieren
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleResetPreferences(s.id);
                                }}
                                style={{ flex: 1, padding: '4px 8px', background: '#d97706', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.58rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                              >
                                Zur Überarbeitung freigeben
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

      {dropDecisionState && (() => {
        const isCampusTheme = localStorage.getItem('groovelab_active_platform') === 'campus';
        const primaryColor = isCampusTheme ? '#34a853' : '#ea4335';
        
        // Find names of the students
        const getStudentName = (id: string) => {
          // Check designer boards
          for (const b of boards) {
            const found = b.students.find(s => s.id === id);
            if (found) {
              if (found.isGroup) return found.first_name + " " + maskLastName(found.last_name, showRealNames);
              return `${found.first_name} ${maskLastName(found.last_name, showRealNames)}`;
            }
          }
          // Check sidebar list
          const found = students.find(s => s.id === id);
          if (found) return `${found.first_name} ${maskLastName(found.last_name, showRealNames)}`;
          return 'Schüler';
        };

        const srcName = getStudentName(dropDecisionState.sourceId);
        const tgtName = getStudentName(dropDecisionState.targetId);

        return (
          <>
            {/* Delete Pause Dialog */}
            {deleteBreakState && (() => {
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
              <div style={{ fontSize: '2.5rem' }}>🔀</div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1d1d1f' }}>Termine zusammenführen oder tauschen?</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#515154', lineHeight: 1.5 }}>
                Du hast den Termin von <strong>{srcName}</strong> auf den Termin von <strong>{tgtName}</strong> gezogen. Was möchtest du tun?
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '8px' }}>
                <button
                  onClick={() => {
                    mergeStudentsViaDragAndDrop(dropDecisionState.sourceId, dropDecisionState.targetId, dropDecisionState.targetBoardId);
                    setDropDecisionState(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#0b57d0',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(11, 87, 208, 0.2)'
                  }}
                  onMouseOver={e => e.currentTarget.style.filter = 'brightness(0.9)'}
                  onMouseOut={e => e.currentTarget.style.filter = 'none'}
                >
                  👥 Zusammenführen (Ensembles/Bands)
                </button>

                <button
                  onClick={async () => {
                    const { sourceId, targetBoardId, index, dragSource, dragSourceBoardId } = dropDecisionState;
                    setDropDecisionState(null);
                    await executeStandardDrop(sourceId, targetBoardId, index, dragSource, dragSourceBoardId);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    background: 'transparent',
                    color: '#1d1d1f',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  🔄 Tauschen / Platzieren
                </button>

                <button
                  onClick={() => {
                    setDropDecisionState(null);
                    setDraggedStudentId(null);
                    setDragSource(null);
                    setDragSourceBoardId(null);
                    setDragOverBoardId(null);
                    setDragOverIndex(null);
                  }}
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
          </>
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

            {activeTab === 'calendar' ? <CalendarTourComponent /> : <DesignerTourComponent />}

    </div>
  );
}
