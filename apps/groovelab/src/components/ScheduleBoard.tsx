import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
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
  Upload
} from 'lucide-react';
import jsPDF from 'jspdf';
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
}

interface DayBoard {
  id: string; // unique board id
  dayOfWeek: number; // 1 = Monday, 2 = Tuesday, etc.
  startAnchor: string; // e.g. "14:00"
  endAnchor?: string;
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
  // Main state
  const [activeTab, setActiveTab] = useState<'calendar' | 'designer'>('calendar');
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
  const [newBoardRoom, setNewBoardRoom] = useState('');
  const [showAddBoardForm, setShowAddBoardForm] = useState(false);

  const [draggedStudentId, setDraggedStudentId] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<'sidebar' | 'board' | null>(null);
  const [dragSourceBoardId, setDragSourceBoardId] = useState<string | null>(null);
  const [dragOverBoardId, setDragOverBoardId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

  // Submission tracking states
  const [hasSubmittedSchedule, setHasSubmittedSchedule] = useState(false);
  const [lastSubmittedTime, setLastSubmittedTime] = useState<string | null>(null);
  const [scheduleStatus, setScheduleStatus] = useState<'none' | 'pending' | 'approved'>('none');

  // RoentgenMatrixView interactive behavior states
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentPrefs, setSelectedStudentPrefs] = useState<any[]>([]);
  const [selectedStudentNote, setSelectedStudentNote] = useState<string | null>(null);
  const [shakingStudentId, setShakingStudentId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);
  const [otherTeachersSchedules, setOtherTeachersSchedules] = useState<any[]>([]);

  // ── Optimized Conflict Detection Caching (Map Lookups) ──
  const teacherBusyIntervals = useMemo(() => {
    const map: Record<number, { start: number; end: number; studentName: string; roomName: string; boardId: string }[]> = {};
    boards.forEach(ob => {
      const [anchorH, anchorM] = (ob.startAnchor || '14:00').split(':').map(Number);
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
            studentName: `${obs.first_name} ${obs.last_name}`,
            roomName: r ? r.name : 'Anderer Raum',
            boardId: ob.id
          });
        }
      });
    });
    return map;
  }, [boards, rooms]);

  const otherTeachersRoomsIntervals = useMemo(() => {
    const map: Record<string, { start: number; end: number; teacherName: string; studentName: string }[]> = {};
    otherTeachersSchedules.forEach(os => {
      if (os.day_of_week !== undefined && os.room_id && os.time_slot) {
        const key = `${os.day_of_week}_${os.room_id}`;
        const [osh, osm] = os.time_slot.split(':').map(Number);
        const start = osh * 60 + osm;
        const end = start + (os.duration || 45);
        if (!map[key]) {
          map[key] = [];
        }
        map[key].push({
          start,
          end,
          teacherName: os.teacher ? `${os.teacher.first_name} ${os.teacher.last_name}` : 'Anderer Lehrer',
          studentName: os.student ? `${os.student.first_name} ${os.student.last_name}` : 'Schüler'
        });
      }
    });
    return map;
  }, [otherTeachersSchedules]);

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
          
          const filteredTeachers = (tData || []).filter(u => {
            const rawPlanned = u.planned_boards;
            let loadedDrafts: any[] = [];
            let loadedSubmittedDraftId = '';
            if (rawPlanned && typeof rawPlanned === 'object' && !Array.isArray(rawPlanned) && (rawPlanned as any).drafts) {
              loadedDrafts = (rawPlanned as any).drafts;
              loadedSubmittedDraftId = (rawPlanned as any).submittedDraftId || '';
            } else if (Array.isArray(rawPlanned) && rawPlanned.length > 0) {
              loadedDrafts = [{ id: 'default', name: 'Standard-Entwurf', boards: rawPlanned }];
            }
            
            const hasDrafts = loadedDrafts && loadedDrafts.length > 0 && loadedDrafts.some(d => d.boards && d.boards.length > 0);
            const isSubmitted = loadedSubmittedDraftId !== '';
            
            if (hasDrafts && !isSubmitted) {
              return false; // exclude unsubmitted
            }
            return true;
          });

          teachersList = filteredTeachers;
          setTeachers(teachersList);
          
          // Default to the first teacher if selectedTeacherId is still the admin's ID
          if (selectedTeacherId === userId && teachersList.length > 0) {
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

      // 2. Fetch all students for the selected teacher who are in the school
      const { data: sData } = await supabase
        .from('users')
        .select('id, first_name, last_name, instrument, lesson_duration')
        .eq('school_id', schoolId)
        .eq('role', 'student')
        .eq('teacher_id', selectedTeacherId)
        ;

      // Fetch pending students from pending_students_decrypted view
      const { data: pendingData } = await supabase
        .from('pending_students_decrypted')
        .select('id, first_name, last_name, instrument')
        .eq('school_id', schoolId)
        .eq('teacher_id', selectedTeacherId);

      // Fetch statuses and parent notes for all teacher's students
      const { data: allStudentsDb } = await supabase
        .from('students')
        .select('id, status')
        .eq('school_id', schoolId)
        .eq('teacher_id', selectedTeacherId);

      const statusMap: Record<string, string> = {};
      allStudentsDb?.forEach(st => {
        statusMap[st.id] = st.status;
      });
      
      const loadedStudents: Student[] = [
        ...(sData || []).map(s => ({
          id: s.id,
          first_name: s.first_name,
          last_name: s.last_name,
          instrument: s.instrument || 'Musiker',
          duration: s.lesson_duration || 45, // Load lesson_duration from DB
          status: (statusMap[s.id] || 'verplant') as any
        })),
        ...(pendingData || []).map(s => ({
          id: s.id,
          first_name: s.first_name,
          last_name: s.last_name,
          instrument: s.instrument || 'Musiker',
          duration: 45, // default duration
          status: 'ausstehend' as const
        }))
      ];

      // 3. Fetch teacher profile for planned boards (checking new platform-specific column and fallback planned_boards)
      const { data: teacherProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', selectedTeacherId)
        .maybeSingle();

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
        .select('*, student:users!schedules_student_id_fkey(first_name, last_name), teacher:users!schedules_teacher_id_fkey(first_name, last_name)')
        .eq('school_id', schoolId)
        .neq('teacher_id', selectedTeacherId);
      setOtherTeachersSchedules(otherSchedData || []);

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
              students: p.students || []
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
                  duration: slot.duration || (isBreak ? 15 : (slot.student.lesson_duration || 45)),
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
                    duration: slot.duration || (isBreak ? 15 : (slot.student.lesson_duration || 45)),
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

      // Mark students as assigned or unassigned
      const finalStudents = loadedStudents.map(s => {
        const isAssigned = usedStudentIds.has(s.id);
        if (isAssigned) {
          const matchingBoard = reconstructedBoards.find(b => b.students.some(bs => bs.id === s.id));
          const matchingStudent = matchingBoard?.students.find(bs => bs.id === s.id);
          return {
            ...s,
            duration: matchingStudent?.duration || 45,
            assignedDay: matchingBoard?.dayOfWeek,
            assignedTime: matchingStudent?.assignedTime
          };
        }
        return s;
      });

      // Ensure Monday to Friday (1 to 5) are always present in the designer
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

      // Sort boards by dayOfWeek so they are displayed chronologically (Monday to Friday, etc.)
      reconstructedBoards.sort((a, b) => a.dayOfWeek - b.dayOfWeek);

      setBoards(reconstructedBoards);
      setStudents(finalStudents);
      setIsInitialLoadDone(true);
    } catch (err) {
      console.error('Error loading schedule board data:', err);
    } finally {
      setLoading(false);
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
      if (s.isBreak && s.customStartTime) {
        currentTime = s.customStartTime;
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
    const newBoard: DayBoard = {
      id: `board-${crypto.randomUUID()}`,
      dayOfWeek: newBoardDay,
      startAnchor: newBoardStart,
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
  const handleDeleteBoard = (boardId: string) => {
    if (!window.confirm('Möchtest du diesen Unterrichtstag wirklich löschen? Alle zugewiesenen Schüler werden wieder freigegeben.')) return;
    
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
    } else {
      setSelectedStudentId(studentId);
      setSelectedStudentNote(null);
      try {
        // Load preferences
        const { data, error } = await supabase
          .from('student_schedule_preferences')
          .select('*')
          .eq('student_id', studentId);
        if (!error && data) {
          setSelectedStudentPrefs(data);
        } else {
          setSelectedStudentPrefs([]);
        }

        // Load parent notes from students table
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('parent_notes')
          .eq('id', studentId)
          .maybeSingle();
        if (!studentError && studentData) {
          setSelectedStudentNote(studentData.parent_notes || null);
        }
      } catch (err) {
        console.error("Error loading student preferences or notes:", err);
        setSelectedStudentPrefs([]);
        setSelectedStudentNote(null);
      }
    }
  };

  const handleResetPreferences = async (studentId: string) => {
    if (!confirm("Möchtest du die Stundenplan-Präferenzen und das Onboarding für diesen Schüler wirklich zurücksetzen? Der Schüler muss das Onboarding dann erneut durchlaufen.")) {
      return;
    }
    try {
      setLoading(true);
      // 1. Delete user record if exists
      const { error: userErr } = await supabase.from('users').delete().eq('id', studentId);
      if (userErr) console.error("Error deleting user during reset:", userErr);
      
      // 2. Clear student schedule preferences
      const { error: prefErr } = await supabase.from('student_schedule_preferences').delete().eq('student_id', studentId);
      if (prefErr) console.error("Error deleting preferences during reset:", prefErr);
      
      // 3. Reset student status to 'ausstehend' and clear parent notes
      const { error: studentErr } = await supabase.from('students').update({ status: 'ausstehend', parent_notes: null }).eq('id', studentId);
      if (studentErr) console.error("Error updating student during reset:", studentErr);

      alert("Onboarding erfolgreich zurückgesetzt.");
      loadInitialData();
    } catch (err) {
      console.error("Error resetting student onboarding:", err);
      alert("Fehler beim Zurücksetzen.");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoAssign = async () => {
    // 1. Find all unassigned students for this teacher
    const unassignedStudents = students.filter(s => !s.assignedDay && !s.isBreak);
    if (unassignedStudents.length === 0) {
      setToast({
        message: "Alle Schüler sind bereits eingeteilt!",
        type: 'success'
      });
      return;
    }

    if (boards.length === 0) {
      setToast({
        message: "Bitte lege zuerst mindestens einen Unterrichtstag (Board) an.",
        type: 'warning'
      });
      return;
    }

    try {
      setLoading(true);
      const studentIds = unassignedStudents.map(s => s.id);
      
      // 2. Fetch preferences for all unassigned students
      const { data: prefs, error } = await supabase
        .from('student_schedule_preferences')
        .select('*')
        .in('student_id', studentIds);

      if (error) throw error;

      const prefsByStudentId: Record<string, any[]> = {};
      studentIds.forEach(id => {
        prefsByStudentId[id] = [];
      });
      prefs?.forEach(p => {
        if (p.student_id) {
          prefsByStudentId[p.student_id].push(p);
        }
      });

      // 3. Sort students by constraints: number of 'gesperrt' preferences descending
      // If equal, sort by number of 'wunsch' preferences descending.
      const sortedUnassigned = [...unassignedStudents].sort((a, b) => {
        const aPrefs = prefsByStudentId[a.id] || [];
        const bPrefs = prefsByStudentId[b.id] || [];
        const aBlocked = aPrefs.filter(p => p.preference_type === 'gesperrt').length;
        const bBlocked = bPrefs.filter(p => p.preference_type === 'gesperrt').length;
        if (aBlocked !== bBlocked) {
          return bBlocked - aBlocked; // More blocked slots = higher priority
        }
        const aWunsch = aPrefs.filter(p => p.preference_type === 'wunsch').length;
        const bWunsch = bPrefs.filter(p => p.preference_type === 'wunsch').length;
        return bWunsch - aWunsch;
      });

      // 4. Local copy of boards during allocation
      let currentBoards = [...boards];
      const newlyAssignedStudentIds: Record<string, { day: number; time: string }> = {};

      for (const student of sortedUnassigned) {
        let bestBoardId: string | null = null;
        let highestScore = -Infinity;

        // Try placing on each active board
        for (const board of currentBoards) {
          // Determine the start time for the student on this board
          // The student would be appended to the end of the board's students list
          let startAnchorTime = board.startAnchor;
          let currentMinutes = 0;
          if (board.students.length > 0) {
            // Find the last student's end time
            const lastStudent = board.students[board.students.length - 1];
            if (lastStudent.assignedTime) {
              const [h, m] = lastStudent.assignedTime.split(':').map(Number);
              currentMinutes = h * 60 + m + lastStudent.duration;
            } else {
              const [h, m] = startAnchorTime.split(':').map(Number);
              currentMinutes = h * 60 + m;
            }
          } else {
            const [h, m] = startAnchorTime.split(':').map(Number);
            currentMinutes = h * 60 + m;
          }

          const startMin = currentMinutes;
          const endMin = startMin + student.duration;

          // Check if this slot overlaps with any 'gesperrt' preferences of the student
          const studentPrefs = prefsByStudentId[student.id] || [];
          const blockedPrefs = studentPrefs.filter(p => p.preference_type === 'gesperrt' && Number(p.day_of_week) === Number(board.dayOfWeek));
          
          let isBlocked = false;
          for (const pref of blockedPrefs) {
            const [psh, psm] = pref.start_time.split(':').map(Number);
            const [peh, pem] = pref.end_time.split(':').map(Number);
            const prefStart = psh * 60 + psm;
            const prefEnd = peh * 60 + pem;

            if (startMin < prefEnd && endMin > prefStart) {
              isBlocked = true;
              break;
            }
          }

          if (isBlocked) continue; // Skip this board/day since it's blocked

          // Calculate score
          let score = 1000;

          // Add points for preferred time ('wunsch') overlap
          const preferredPrefs = studentPrefs.filter(p => p.preference_type === 'wunsch' && Number(p.day_of_week) === Number(board.dayOfWeek));
          let hasWunschOverlap = false;
          for (const pref of preferredPrefs) {
            const [psh, psm] = pref.start_time.split(':').map(Number);
            const [peh, pem] = pref.end_time.split(':').map(Number);
            const prefStart = psh * 60 + psm;
            const prefEnd = peh * 60 + pem;

            if (startMin < prefEnd && endMin > prefStart) {
              hasWunschOverlap = true;
              break;
            }
          }

          if (hasWunschOverlap) {
            score += 10000;
          }

          // Load balancing: subtract total duration of students on board to prefer less busy boards
          const boardLoad = board.students.reduce((acc, s) => acc + s.duration, 0);
          score -= boardLoad;

          if (score > highestScore) {
            highestScore = score;
            bestBoardId = board.id;
          }
        }

        if (bestBoardId) {
          // Perform the assignment
          currentBoards = currentBoards.map(b => {
            if (b.id !== bestBoardId) return b;
            const studentToAssign = { ...student, assignedDay: b.dayOfWeek };
            const nextStudents = [...b.students, studentToAssign];
            const updatedBoard = recalculateBoardTimes({ ...b, students: nextStudents });
            
            // Extract the recalculated start time for this student
            const assignedTime = updatedBoard.students[updatedBoard.students.length - 1].assignedTime || '';
            newlyAssignedStudentIds[student.id] = { day: b.dayOfWeek, time: assignedTime };
            
            return updatedBoard;
          });
        }
      }

      // Update boards and student states
      setBoards(currentBoards);
      setStudents(currentStudents => currentStudents.map(s => {
        if (newlyAssignedStudentIds[s.id]) {
          return {
            ...s,
            assignedDay: newlyAssignedStudentIds[s.id].day,
            assignedTime: newlyAssignedStudentIds[s.id].time
          };
        }
        return s;
      }));

      const assignedCount = Object.keys(newlyAssignedStudentIds).length;
      const unassignedCount = unassignedStudents.length - assignedCount;

      if (assignedCount > 0) {
        setToast({
          message: `${assignedCount} Schüler wurden automatisch zugeteilt! ${unassignedCount > 0 ? `(${unassignedCount} nicht zuteilbar aufgrund von Konflikten)` : ''}`,
          type: unassignedCount > 0 ? 'warning' : 'success'
        });
      } else {
        setToast({
          message: "Keine Schüler konnten automatisch zugeteilt werden (Präferenz-Konflikte auf allen Tagen).",
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

  const handleResetAllAssignments = () => {
    if (!window.confirm("Möchtest du wirklich alle zugeteilten Schüler dieses Entwurfs zurücksetzen? Alle Schüler werden wieder in den Schüler-Pool (Offen) gelegt.")) {
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
  const handleDragStart = (studentId: string, source: 'sidebar' | 'board', boardId?: string) => {
    setDraggedStudentId(studentId);
    setDragSource(source);
    if (boardId) setDragSourceBoardId(boardId);
    setDragOverBoardId(null);
    setDragOverIndex(null);
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
        first_name: 'Gruppentermin',
        last_name: `(${groupStudentsList.length} Schüler)`,
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

  const executeStandardDrop = async (sourceId: string, targetBoardId: string, index?: number, source?: string | null, sourceBoardId?: string | null) => {
    const isBreakDrag = sourceId.startsWith('break-') || sourceId === 'sidebar-pause';
    const student = students.find(s => s.id === sourceId);

    // Validate if the timeframe overlaps with a 'gesperrt' (blocked) preference for the student
    if (!isBreakDrag && student) {
      const targetBoard = boards.find(b => b.id === targetBoardId);
      if (targetBoard) {
        // Calculate proposed start/end times by simulating the drop
        let targetNextStudents = [...targetBoard.students];
        targetNextStudents = targetNextStudents.filter(s => s.id !== sourceId);
        
        const studentToAssign = { ...student, assignedDay: targetBoard.dayOfWeek };
        if (index !== undefined) {
          targetNextStudents.splice(index, 0, studentToAssign);
        } else {
          targetNextStudents.push(studentToAssign);
        }

        const tempBoard = recalculateBoardTimes({ ...targetBoard, students: targetNextStudents });
        const assignedStudent = tempBoard.students.find(s => s.id === sourceId);

        if (assignedStudent && assignedStudent.assignedTime) {
          const [sh, sm] = assignedStudent.assignedTime.split(':').map(Number);
          const startMin = sh * 60 + sm;
          const endMin = startMin + student.duration;

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
                  const [psh, psm] = pref.start_time.split(':').map(Number);
                  const [peh, pem] = pref.end_time.split(':').map(Number);
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

                // Show warnings toast
                setToast({
                  message: `Zeitkonflikt: Der Schüler ${student.first_name} ${student.last_name} ist in diesem Zeitraum gesperrt!`,
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
          } catch (err) {
            console.error("Error checking student preferences:", err);
          }
        }
      }
    }

    setBoards(prev => {
      let sourceBoard = prev.find(b => b.id === sourceBoardId);
      let targetBoard = prev.find(b => b.id === targetBoardId);
      if (!targetBoard) return prev;

      // 1. If moving within boards
      if (source === 'board' && sourceBoard) {
        // If moving inside the SAME board
        if (sourceBoard.id === targetBoard.id) {
          const nextStudents = [...targetBoard.students];
          const curIndex = nextStudents.findIndex(s => s.id === sourceId);
          if (curIndex !== -1) {
            const [moved] = nextStudents.splice(curIndex, 1);
            if (index !== undefined) {
              nextStudents.splice(index, 0, moved);
            } else {
              nextStudents.push(moved);
            }
            return prev.map(b => b.id === targetBoardId ? recalculateBoardTimes({ ...b, students: nextStudents }) : b);
          }
          return prev;
        }

        // If moving to a DIFFERENT board
        const sourceNextStudents = sourceBoard.students.filter(s => s.id !== sourceId);
        const targetNextStudents = [...targetBoard.students];
        
        // Remove from source and recalculate
        const updatedSource = recalculateBoardTimes({ ...sourceBoard, students: sourceNextStudents });
        
        // Add to target and recalculate
        const movedStudent = sourceBoard.students.find(s => s.id === sourceId)!;
        if (index !== undefined) {
          targetNextStudents.splice(index, 0, movedStudent);
        } else {
          targetNextStudents.push(movedStudent);
        }
        const updatedTarget = recalculateBoardTimes({ ...targetBoard, students: targetNextStudents });

        return prev.map(b => {
          if (b.id === sourceBoard!.id) return updatedSource;
          if (b.id === targetBoardId) return updatedTarget;
          return b;
        });
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
        // Check if student is already in target board
        if (targetBoard.students.some(s => s.id === sourceId)) return prev;

        // Remove student from any other board if they were assigned
        const cleanedBoards = prev.map(b => {
          if (b.students.some(s => s.id === sourceId)) {
            return recalculateBoardTimes({ ...b, students: b.students.filter(s => s.id !== sourceId) });
          }
          return b;
        });

        const targetNextStudents = [...targetBoard.students];
        const studentToAssign = { ...student, assignedDay: targetBoard.dayOfWeek };

        if (index !== undefined) {
          targetNextStudents.splice(index, 0, studentToAssign);
        } else {
          targetNextStudents.push(studentToAssign);
        }

        // Recalculate target board
        const updatedTarget = recalculateBoardTimes({ ...targetBoard, students: targetNextStudents });

        // Update overall student list flags
        setStudents(currentStudents => currentStudents.map(s => {
          if (s.id === sourceId) {
            return {
              ...s,
              assignedDay: targetBoard!.dayOfWeek,
              assignedTime: updatedTarget.students.find(bs => bs.id === sourceId)?.assignedTime
            };
          }
          return s;
        }));

        return cleanedBoards.map(b => b.id === targetBoardId ? updatedTarget : b);
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

  // Remove a student from a day board (make them unassigned again)
  const handleRemoveStudentFromBoard = (boardId: string, studentId: string) => {
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

    const groupStudents = targetBoard.students.filter(s => selectedForGroup.includes(s.id));
    const firstSelectedIndex = targetBoard.students.findIndex(s => selectedForGroup.includes(s.id));
    const remainingStudents = targetBoard.students.filter(s => !selectedForGroup.includes(s.id));

    const newGroupBlock: Student = {
      id: `group-${crypto.randomUUID()}`,
      first_name: 'Gruppentermin',
      last_name: `(${groupStudents.length} Schüler)`,
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
          doc.text(`${s.assignedTime} - ${s.first_name} ${s.last_name} (${s.instrument}, ${s.duration} Min)`, 25, y);
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
          alert('Stundenplan erfolgreich aus dem Backup wiederhergestellt!');
        } else {
          alert('Ungültiges Backup-Format.');
        }
      } else {
        alert('Kein Backup in dieser PDF gefunden.');
      }
    } catch (err) {
      console.error(err);
      alert('Fehler beim Wiederherstellen der Datei.');
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

  const handleDeleteDraft = (draftId: string) => {
    if (drafts.length <= 1) {
      alert('Der letzte verbleibende Entwurf kann nicht gelöscht werden.');
      return;
    }
    if (!confirm('Möchtest du diesen Entwurf wirklich löschen?')) {
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

  // Lock in schedule and send to Secretariat
  const handleLockAndSend = async () => {
    const unassignedCount = students.filter(s => !s.assignedDay).length;
    
    if (unassignedCount > 0) {
      if (!window.confirm(`Achtung: Es sind noch ${unassignedCount} Schüler nicht auf deine Unterrichtstage verteilt. Möchtest du den Stundenplan trotzdem einloggen und an die Verwaltung senden?`)) {
        return;
      }
    } else {
      if (!window.confirm('Möchtest du diesen Stundenplan final einloggen und an die Verwaltung senden?')) {
        return;
      }
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
                status: 'ready_for_admin_review'
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
              status: s.isBreak ? 'approved' : 'ready_for_admin_review' // A break/pause is auto-approved
            });
          }
        }
      }

      if (inserts.length > 0) {
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
      alert('Fehler beim Speichern: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', maxWidth: '100%', margin: '0', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
      
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
        />
      ) : (
        <>
          {showCelebration ? (
        <div className="animation-slide-up" style={{ background: 'rgba(255, 255, 255, 0.65)', backdropFilter: 'blur(30px) saturate(190%)', WebkitBackdropFilter: 'blur(30px) saturate(190%)', borderRadius: '28px', padding: '40px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.5)', boxShadow: '0 20px 50px rgba(0,0,0,0.04)', maxWidth: '480px', margin: '40px auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div style={{ height: '72px', width: '72px', background: 'rgba(52, 211, 153, 0.15)', border: '1px solid rgba(52, 211, 153, 0.25)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
          
          {/* Header Panel */}
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.55)', 
            backdropFilter: 'blur(20px) saturate(190%)', 
            WebkitBackdropFilter: 'blur(20px) saturate(190%)',
            borderRadius: '20px', 
            padding: '16px 20px', 
            border: '1px solid rgba(255, 255, 255, 0.5)', 
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.03)', 
            display: 'grid', 
            gridTemplateColumns: '1fr auto 540px', 
            alignItems: 'center', 
            gap: '16px'
          }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ height: '40px', width: '40px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Calendar size={20} />
              </div>
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1d1d1f', margin: 0, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                  Stundenplan-Designer
                </h2>
                {(currentUserRole === 'admin' || currentUserRole === 'secretary') && teachers.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#86868b' }}>Lehrkraft:</span>
                    <select
                      value={selectedTeacherId}
                      onChange={(e) => setSelectedTeacherId(e.target.value)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.75)',
                        border: '1px solid rgba(0, 0, 0, 0.08)',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#1d1d1f',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.first_name} {t.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="app-segmented-switch" style={{ margin: 0 }}>
              <button 
                onClick={() => setActiveTab('calendar')}
                className={`app-segmented-switch-btn ${(activeTab as string) === 'calendar' ? 'active' : ''}`}
              >
                {hasSubmittedSchedule ? 'Mein Stundenplan' : 'Entwurf'}
              </button>
              <button 
                onClick={() => setActiveTab('designer')}
                className={`app-segmented-switch-btn ${(activeTab as string) === 'designer' ? 'active' : ''}`}
              >
                Stundenplan-Designer
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
              {hasSubmittedSchedule && scheduleStatus === 'approved' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(209, 250, 229, 0.5)', border: '1px solid rgba(16, 185, 129, 0.15)', color: '#065f46', padding: '6px 10px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 700 }}>
                  <span style={{ color: '#10b981', fontSize: '0.8rem' }}>✓</span> 
                  <span>Freigegeben</span>
                </div>
              )}
              {hasSubmittedSchedule && scheduleStatus === 'pending' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(254, 243, 199, 0.5)', border: '1px solid rgba(245, 158, 11, 0.15)', color: '#92400e', padding: '6px 10px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 700 }}>
                  <span style={{ color: '#d97706', fontSize: '0.8rem' }}>⏳</span> 
                  <span>Eingereicht {lastSubmittedTime ? `(um ${lastSubmittedTime} Uhr)` : '(Wartet auf Freigabe)'}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowAddBoardForm(true)}
                style={{ background: 'rgba(255, 255, 255, 0.6)', color: '#1d1d1f', border: '1px solid rgba(0, 0, 0, 0.08)', fontWeight: 600, padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.9)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.6)'}
              >
                <Plus size={13} />
                Tag anlegen
              </button>
              
              <label 
                htmlFor="pdf-upload"
                style={{ background: 'rgba(255, 255, 255, 0.6)', color: '#1d1d1f', border: '1px solid rgba(0, 0, 0, 0.08)', fontWeight: 600, padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.9)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.6)'}
              >
                <Upload size={13} />
                Backup
              </label>
              <input 
                id="pdf-upload" 
                type="file" 
                accept="application/pdf" 
                style={{ display: 'none' }} 
                onChange={handleRestoreFromPDF} 
              />

              <button
                type="button"
                onClick={handleLockAndSend}
                disabled={submitting || boards.length === 0}
                style={{ background: 'linear-gradient(135deg, #eab308 0%, #d97706 100%)', color: 'white', border: 'none', fontWeight: 700, padding: '6px 14px', borderRadius: '10px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', opacity: (submitting || boards.length === 0) ? 0.5 : 1, pointerEvents: (submitting || boards.length === 0) ? 'none' : 'auto', boxShadow: '0 6px 16px rgba(234, 179, 8, 0.15)', transition: 'all 0.2s' }}
              >
                <Send size={13} />
                {submitting ? 'Wird gesendet...' : 'Einloggen & Senden'}
              </button>
            </div>
          </div>

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
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.15)',
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
                onMouseOver={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
              >
                <Sparkles size={12} />
                Automatisch zuteilen
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsGroupModeActive(prev => !prev);
                  setSelectedForGroup([]);
                }}
                style={{
                  background: isGroupModeActive 
                    ? (localStorage.getItem('groovelab_active_platform') === 'campus' ? '#137333' : '#007aff') 
                    : 'transparent',
                  color: isGroupModeActive ? 'white' : '#64748b',
                  border: `1px solid ${isGroupModeActive 
                    ? (localStorage.getItem('groovelab_active_platform') === 'campus' ? '#137333' : '#007aff') 
                    : '#cbd5e1'}`,
                  fontWeight: 600,
                  padding: '5px 12px',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s'
                }}
              >
                <Users size={12} />
                {isGroupModeActive ? 'Gruppen-Modus aktiv' : 'Gruppentermine'}
              </button>
              {isGroupModeActive && selectedForGroup.length >= 2 && (
                <button
                  type="button"
                  onClick={handleMergeSelectedIntoGroup}
                  style={{
                    background: '#16a34a',
                    color: 'white',
                    border: 'none',
                    fontWeight: 600,
                    padding: '5px 12px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s',
                    boxShadow: '0 2px 4px rgba(22, 163, 74, 0.3)'
                  }}
                >
                  Zusammenführen ({selectedForGroup.length})
                </button>
              )}
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
                  {DAYS_OF_WEEK.map(d => (
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
            <div style={{ 
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
              {boards.map((board, index) => {
                const dayLabel = DAYS_OF_WEEK.find(d => d.value === board.dayOfWeek)?.name || '';
                const PX_PER_MIN = 2.5;
                const [anchorH, anchorM] = (board.startAnchor || '14:00').split(':').map(Number);
                const startMinutes = anchorH * 60 + anchorM;
                const totalMinutes = board.students.reduce((acc, s) => acc + s.duration, 0);
                const endMinutes = startMinutes + Math.max(totalMinutes, 60);
                const columnHeightPx = (endMinutes - startMinutes) * PX_PER_MIN + 48;
                const startHour = Math.floor(startMinutes / 60);
                const endHour = Math.ceil(endMinutes / 60) + 1;
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
                      minWidth: '170px',
                      background: 'transparent', 
                      borderRight: index < boards.length - 1 ? '1px solid #e2e8f0' : 'none', 
                      padding: '0 10px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '8px',
                      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  >
                    {/* Day Column Header */}
                    <div style={{ textAlign: 'center', paddingBottom: '8px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unterrichtstag</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1d1d1f', marginBottom: '8px' }}>{dayLabel}</div>
                      
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                        {/* Apple iOS-Style Time Pill */}
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          background: 'rgba(0, 122, 255, 0.08)',
                          borderRadius: '6px',
                          padding: '2px 5px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#007aff',
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(0, 122, 255, 0.15)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0, 122, 255, 0.08)'; }}
                        >
                          <input 
                            type="time" 
                            value={board.startAnchor} 
                            className="mini-time-input"
                            onChange={(e) => {
                              const newVal = e.target.value;
                              setBoards(prev => prev.map(b => {
                                if (b.id !== board.id) return b;
                                return recalculateBoardTimes({ ...b, startAnchor: newVal || '14:00' });
                              }));
                            }}
                            style={{ fontSize: '0.78rem', fontWeight: 700, border: 'none', background: 'transparent', outline: 'none', color: '#007aff', padding: 0, width: '42px', cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit' }}
                            title="Startzeit ändern"
                          />
                          <span style={{ fontSize: '0.65rem', fontWeight: 600, marginLeft: '1px', color: '#007aff' }}>Uhr</span>
                        </div>
                      </div>
                    </div>

                    {/* ── PROPORTIONAL TIME-GRID ── */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragOverBoardId !== board.id || dragOverIndex !== board.students.length) {
                          setDragOverBoardId(board.id);
                          setDragOverIndex(board.students.length);
                        }
                      }}
                      onDragLeave={() => {
                        setDragOverBoardId(null);
                        setDragOverIndex(null);
                      }}
                      onDrop={() => {
                        handleDropOnBoard(board.id, dragOverIndex !== null ? dragOverIndex : undefined);
                      }}
                      style={{ position: 'relative', height: `${columnHeightPx}px`, flexShrink: 0, marginTop: '4px' }}
                    >
                       {/* Hour marker & 15-minute subdivision lines */}
                      {hourMarkers.map(m => {
                        const subMarkers = [];
                        for (let minOffset of [15, 30, 45]) {
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
                      {selectedStudentId && (() => {
                        const blockCount = Math.floor((endMinutes - startMinutes) / 15);
                        const matchedTypes: ('wunsch' | 'gesperrt' | null)[] = Array(blockCount).fill(null);
                        
                        for (let i = 0; i < blockCount; i++) {
                          const blockStart = startMinutes + i * 15;
                          const blockEnd = blockStart + 15;
                          
                          selectedStudentPrefs.forEach(pref => {
                            if (pref.day_of_week === board.dayOfWeek) {
                              const [ph, pm] = pref.start_time.split(':').map(Number);
                              const [peh, pem] = pref.end_time.split(':').map(Number);
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
                              const className = currentType === 'gesperrt' 
                                ? 'roentgen-blocked opacity-40 pointer-events-none' 
                                : 'roentgen-preferred';
                              
                              mergedBlocks.push(
                                <div
                                  key={`pref-block-${board.id}-${startIndex}-${i}`}
                                  className={className}
                                  style={{
                                    position: 'absolute',
                                    left: 0,
                                    right: 0,
                                    top: `${top}px`,
                                    height: `${height}px`,
                                    zIndex: 3,
                                    boxSizing: 'border-box',
                                    pointerEvents: 'none'
                                  }}
                                />
                              );
                            }
                            currentType = type;
                            startIndex = type ? i : -1;
                          }
                        }

                        if (currentType && startIndex !== -1) {
                          const top = startIndex * 15 * PX_PER_MIN;
                          const height = (blockCount - startIndex) * 15 * PX_PER_MIN;
                          const className = currentType === 'gesperrt' 
                            ? 'roentgen-blocked opacity-40 pointer-events-none' 
                            : 'roentgen-preferred';
                          
                          mergedBlocks.push(
                            <div
                              key={`pref-block-${board.id}-${startIndex}-${blockCount}`}
                              className={className}
                              style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: `${top}px`,
                                height: `${height}px`,
                                zIndex: 3,
                                boxSizing: 'border-box',
                                pointerEvents: 'none'
                              }}
                            />
                          );
                        }
                        return mergedBlocks;
                      })()}

                      {/* Empty drop hint */}
                      {board.students.length === 0 && (
                        <div style={{ position: 'absolute', inset: '8px 0', border: '1.5px dashed rgba(0,0,0,0.08)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#86868b', pointerEvents: 'none', zIndex: 1 }}>
                          <Users size={18} style={{ color: '#c7c7cc', marginBottom: '4px' }} />
                          <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Schüler hierhin</span>
                        </div>
                      )}

                      {/* Cards: absolutely positioned by assignedTime */}
                      {board.students.map((bs, cardIndex) => {
                        const [sh, sm] = (bs.assignedTime || board.startAnchor || '14:00').split(':').map(Number);
                        const cardTopPx = (sh * 60 + sm - startMinutes) * PX_PER_MIN;
                        const cardHeightPx = bs.duration * PX_PER_MIN - 4;

                        if (bs.isBreak) {
                          return (
                            <div
                              key={bs.id}
                              draggable
                              onDragStart={() => handleDragStart(bs.id, 'board', board.id)}
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
                                      const resolvedTime = newTime === bs.assignedTime ? undefined : newTime;
                                      setBoards(prev => prev.map(b => {
                                        if (b.id !== board.id) return b;
                                        const nextStudents = b.students.map(s => s.id === bs.id ? { ...s, customStartTime: resolvedTime } : s);
                                        return recalculateBoardTimes({ ...b, students: nextStudents });
                                      }));
                                    }}
                                    style={{ width: '38px', background: 'transparent', border: 'none', fontSize: '0.62rem', fontWeight: 700, color: '#b45309', outline: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
                                  />
                                </div>
                                <select
                                  value={bs.duration}
                                  onChange={(e) => {
                                    const newDur = parseInt(e.target.value) || 15;
                                    setBoards(prev => prev.map(b => {
                                      if (b.id !== board.id) return b;
                                      const nextStudents = b.students.map(s => s.id === bs.id ? { ...s, duration: newDur } : s);
                                      return recalculateBoardTimes({ ...b, students: nextStudents });
                                    }));
                                  }}
                                  style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '5px', padding: '1px 3px', fontSize: '0.62rem', fontWeight: 700, color: '#b45309', outline: 'none', cursor: 'pointer' }}
                                >
                                  {[5,10,15,20,30,45,60].map(v => <option key={v} value={v}>{v}m</option>)}
                                </select>
                                <button type="button" onClick={() => handleRemoveStudentFromBoard(board.id, bs.id)}
                                  style={{ background: 'transparent', border: 'none', color: '#d97706', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '1px' }} title="Pause löschen">
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
                        if (selectedStudentId === bs.id && selectedStudentPrefs.length > 0) {
                          const [sh, sm] = (bs.assignedTime || board.startAnchor || '14:00').split(':').map(Number);
                          const startMin = sh * 60 + sm;
                          const endMin = startMin + bs.duration;

                          const wunschPrefs = selectedStudentPrefs.filter(p => p.preference_type === 'wunsch' && Number(p.day_of_week) === Number(board.dayOfWeek));
                          for (const pref of wunschPrefs) {
                            const [psh, psm] = pref.start_time.split(':').map(Number);
                            const [peh, pem] = pref.end_time.split(':').map(Number);
                            const prefStart = psh * 60 + psm;
                            const prefEnd = peh * 60 + pem;

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
                          const [sh, sm] = bs.assignedTime.split(':').map(Number);
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
                          const [sh, sm] = bs.assignedTime.split(':').map(Number);
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

                        const isTeacherConflict = teacherConflictStudentName !== '';
                        const isRoomConflict = roomConflictTeacherName !== '';
                        const hasConflict = isTeacherConflict || isRoomConflict;
                        const conflictMsg = isTeacherConflict
                          ? `Doppelbelegung Lehrkraft: Zeitgleich mit ${teacherConflictStudentName} in ${teacherConflictRoomName}`
                          : `Raumkonflikt: Raum besetzt durch Lehrkraft ${roomConflictTeacherName} (Schüler: ${roomConflictStudentName})`;

                        const isCampus = localStorage.getItem('groovelab_active_platform') === 'campus';
                        const campusPrimary = '#137333';
                        const campusBg = 'rgba(230, 244, 234, 0.65)';
                        const campusBorder = 'rgba(19, 115, 51, 0.2)';
                        const campusText = '#137333';

                        const cardBg = hasConflict
                          ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
                          : (isInsideWunsch
                              ? '#064e3b'
                              : (isSelected 
                                  ? (isCampus ? 'rgba(19, 115, 51, 0.08)' : 'rgba(0, 122, 255, 0.08)') 
                                  : (isSubmitted 
                                      ? 'rgba(220, 252, 231, 0.5)' 
                                      : (isCampus ? campusBg : 'rgba(219, 234, 254, 0.65)'))));

                        const cardBorder = hasConflict
                          ? '1.5px solid #ef4444'
                          : (isInsideWunsch
                              ? '1px solid #047857'
                              : (isSelected 
                                  ? (isCampus ? `1.5px solid ${campusPrimary}` : '1.5px solid #007aff') 
                                  : (isSubmitted 
                                      ? '1px solid rgba(16, 185, 129, 0.18)' 
                                      : (isCampus ? `1px solid ${campusBorder}` : '1px solid rgba(59, 130, 246, 0.2)'))));

                        const cardBorderLeft = hasConflict
                          ? '4px solid #dc2626'
                          : (isInsideWunsch
                              ? '4px solid #10b981'
                              : (isSelected 
                                  ? (isCampus ? `4px solid ${campusPrimary}` : '4px solid #007aff') 
                                  : (isSubmitted ? '4px solid #10b981' : (isCampus ? `4px solid ${campusPrimary}` : '4px solid #3b82f6'))));

                        const textColor = hasConflict
                          ? '#991b1b'
                          : (isInsideWunsch
                              ? '#ffffff'
                              : (isSelected 
                                  ? (isCampus ? campusText : '#007aff') 
                                  : (isSubmitted ? '#065f46' : (isCampus ? campusText : '#1e3a8a'))));

                        const badgeBg = hasConflict
                          ? 'rgba(239, 68, 68, 0.1)'
                          : (isInsideWunsch
                              ? 'rgba(255, 255, 255, 0.2)'
                              : (isSelected 
                                  ? (isCampus ? 'rgba(19, 115, 51, 0.08)' : 'rgba(0, 122, 255, 0.08)') 
                                  : (isSubmitted ? 'rgba(16, 185, 129, 0.08)' : (isCampus ? 'rgba(19, 115, 51, 0.08)' : 'rgba(59, 130, 246, 0.08)'))));

                        const badgeColor = hasConflict
                          ? '#ef4444'
                          : (isInsideWunsch
                              ? '#ffffff'
                              : (isSelected 
                                  ? (isCampus ? campusText : '#007aff') 
                                  : (isSubmitted ? '#047857' : (isCampus ? campusText : '#1d4ed8'))));

                        const shadowColor = isSubmitted 
                          ? 'rgba(16,185,129,0.06)' 
                          : (isCampus ? 'rgba(19,115,51,0.06)' : 'rgba(59,130,246,0.06)');
                        const shadowHoverColor = isSubmitted 
                          ? 'rgba(16,185,129,0.14)' 
                          : (isCampus ? 'rgba(19,115,51,0.14)' : 'rgba(59,130,246,0.14)');
                        const cardShadow = hasConflict
                          ? '0 4px 10px rgba(239, 68, 68, 0.15)'
                          : (isInsideWunsch
                              ? '0 6px 16px rgba(16, 185, 129, 0.25)'
                              : (isSelected 
                                  ? (isCampus ? `0 0 10px ${campusPrimary}40` : '0 0 10px rgba(0, 122, 255, 0.25)') 
                                  : `0 2px 6px ${shadowColor}`));

                        const isSelectedForGroup = selectedForGroup.includes(bs.id);
                        const isCampusTheme = localStorage.getItem('groovelab_active_platform') === 'campus';
                        const highlightColor = isCampusTheme ? '#137333' : '#007aff';

                        if (bs.isGroup) {
                          return (
                            <div
                              key={bs.id}
                              draggable
                              onDragStart={() => handleDragStart(bs.id, 'board', board.id)}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDragOverBoardId(board.id);
                                setDragOverIndex(cardIndex);
                              }}
                              onDrop={(e) => { e.stopPropagation(); handleDropOnBoard(board.id, cardIndex); }}
                              onClick={(e) => { e.stopPropagation(); }}
                              style={{
                                position: 'absolute', left: 0, right: 0,
                                top: `${Math.max(cardTopPx, 0)}px`,
                                height: `${Math.max(cardHeightPx, 32)}px`,
                                background: isCampusTheme ? 'rgba(230, 244, 234, 0.95)' : 'rgba(219, 234, 254, 0.95)',
                                border: isSelected ? `1.5px solid ${highlightColor}` : '1px solid rgba(16, 185, 129, 0.25)',
                                borderLeft: `4px solid ${highlightColor}`,
                                borderRadius: '8px', padding: '5px 8px', boxSizing: 'border-box',
                                cursor: 'grab', display: 'flex', flexDirection: 'column',
                                justifyContent: 'center', gap: '2px',
                                zIndex: 2,
                                boxShadow: isSelected ? `0 0 10px ${highlightColor}` : '0 2px 6px rgba(0,0,0,0.05)',
                                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: highlightColor, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  👥 {bs.assignedTime}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
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
                                  <select
                                    value={bs.duration}
                                    onChange={(e) => {
                                      const newDur = parseInt(e.target.value) || 15;
                                      setBoards(prev => prev.map(b => {
                                        if (b.id !== board.id) return b;
                                        const nextStudents = b.students.map(s => s.id === bs.id ? { ...s, duration: newDur } : s);
                                        return recalculateBoardTimes({ ...b, students: nextStudents });
                                      }));
                                    }}
                                    style={{
                                      background: 'rgba(255,255,255,0.7)',
                                      border: `1px solid ${highlightColor}20`,
                                      borderRadius: '5px',
                                      padding: '1px 3px',
                                      fontSize: '0.62rem',
                                      fontWeight: 700,
                                      color: highlightColor,
                                      outline: 'none',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {[30, 45, 60, 75, 90, 120].map(v => <option key={v} value={v}>{v}m</option>)}
                                  </select>
                                  <button type="button" onClick={() => handleRemoveStudentFromBoard(board.id, bs.id)}
                                    style={{ background: 'transparent', border: 'none', color: highlightColor, display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '1px', opacity: 0.7 }}
                                    title="Entfernen">
                                    <X size={11} strokeWidth={2.5} />
                                  </button>
                                </div>
                              </div>
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {bs.first_name} {bs.last_name}
                              </span>
                              <span style={{ fontSize: '0.62rem', fontWeight: 600, color: '#4b5563', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {bs.groupStudents?.map(s => `${s.first_name} ${s.last_name[0]}.`).join(', ')}
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
                            className={isShaking ? 'card-shake' : ''}
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
                              opacity: selectedStudentId !== null ? (isSelected ? 1 : 0.8) : 1,
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
                              {bs.assignedTime}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <span style={{ fontSize: '0.62rem', fontWeight: 600, color: badgeColor, background: badgeBg, padding: '1px 5px', borderRadius: '4px' }}>{bs.duration}m</span>
                              <button type="button" onClick={() => handleRemoveStudentFromBoard(board.id, bs.id)}
                                style={{ background: 'transparent', border: 'none', color: badgeColor, display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '1px', opacity: 0.7 }}
                                onMouseOver={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                                onMouseOut={e => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; (e.currentTarget as HTMLElement).style.color = badgeColor; }}
                                title="Entfernen"><X size={11} strokeWidth={2.5} /></button>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <InstrumentBadge instrument={bs.instrument} color={textColor} />
                            {bs.first_name} {bs.last_name}
                          </span>
                          {cardHeightPx > 52 && (
                            <span style={{ fontSize: '0.62rem', fontWeight: 600, color: isInsideWunsch ? 'rgba(255,255,255,0.85)' : (hasConflict ? '#991b1b' : (isSubmitted ? '#065f46' : (isCampus ? campusText : '#2563eb'))), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bs.instrument}</span>
                          )}
                        </div>
                      );
                    })}
                      {/* Drag insertion indicator line */}
                      {(() => {
                        if (dragOverBoardId !== board.id || dragOverIndex === null) return null;
                        const isGreenTheme = localStorage.getItem('groovelab_active_platform') === 'campus';
                        const lineColor = isGreenTheme ? '#137333' : '#007aff';
                        
                        let topPx = 0;
                        if (dragOverIndex < board.students.length) {
                          const targetStudent = board.students[dragOverIndex];
                          const [sh, sm] = (targetStudent.assignedTime || board.startAnchor || '14:00').split(':').map(Number);
                          topPx = (sh * 60 + sm - startMinutes) * PX_PER_MIN;
                        } else if (board.students.length > 0) {
                          const lastStudent = board.students[board.students.length - 1];
                          const [sh, sm] = (lastStudent.assignedTime || board.startAnchor || '14:00').split(':').map(Number);
                          topPx = (sh * 60 + sm - startMinutes) * PX_PER_MIN + lastStudent.duration * PX_PER_MIN;
                        }
                        
                        return (
                          <div 
                            style={{
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              top: `${Math.max(topPx - 2, 0)}px`,
                              height: '4px',
                              background: lineColor,
                              borderRadius: '2px',
                              zIndex: 10,
                              pointerEvents: 'none',
                              boxShadow: `0 0 8px ${lineColor}`
                            }}
                          />
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
            <div style={{ 
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
                draggable
                onDragStart={() => handleDragStart('sidebar-pause', 'sidebar')}
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
                      onClick={() => handleSelectStudent(s.id)}
                      className={isShaking ? 'card-shake' : ''}
                      style={{ 
                        background: isSelected 
                          ? 'rgba(0, 122, 255, 0.08)' 
                          : (isAssigned ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.65)'), 
                        backdropFilter: isAssigned ? 'none' : 'blur(12px)',
                        WebkitBackdropFilter: isAssigned ? 'none' : 'blur(12px)',
                        border: isSelected 
                          ? '1.5px solid #007aff' 
                          : '1px solid rgba(255, 255, 255, 0.6)', 
                        borderLeft: isSelected 
                          ? '4px solid #007aff' 
                          : (isAssigned ? '3px solid #cbd5e1' : '3px solid #86868b'), 
                        borderRadius: '8px', 
                        padding: '6px 8px', 
                        cursor: 'pointer', 
                        opacity: isSelected ? 1 : (isAssigned ? 0.6 : 1), 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '4px',
                        boxShadow: isSelected 
                          ? '0 0 10px rgba(0, 122, 255, 0.25)' 
                          : (isAssigned ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.01)'),
                        transition: 'all 0.25s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1d1d1f', display: 'block', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '4px' }}>
                          {s.first_name} {s.last_name}
                        </span>
                        {s.status === 'ausstehend' ? (
                          <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#ea580c', background: '#fff7ed', border: '1px solid #ffedd5', padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Ausstehend</span>
                        ) : (
                          <span style={{ height: '5px', width: '5px', borderRadius: '50%', background: isAssigned ? '#34d399' : '#d1d1d6', flexShrink: 0 }}></span>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.62rem', fontWeight: 600, color: '#86868b' }}>
                          {s.duration} Min
                        </span>

                        {isAssigned && (
                          <span style={{ fontSize: '0.58rem', fontWeight: 600, color: '#15803d', background: 'rgba(220, 252, 231, 0.6)', padding: '1px 4px', borderRadius: '4px', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }} title={`${assignedDayLabel} um ${s.assignedTime}`}>
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const inviteLink = window.location.origin + "?onboarding=parent";
                                  navigator.clipboard.writeText(inviteLink);
                                  alert("Onboarding-Link kopiert! Du kannst diesen Link jetzt an die Eltern senden: " + inviteLink);
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
                                style={{ flex: 1, padding: '4px 8px', background: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.58rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                              >
                                Onboarding zurücksetzen
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

        </div>
      )}
        </>
      )}

      {dropDecisionState && (() => {
        const isCampusTheme = localStorage.getItem('groovelab_active_platform') === 'campus';
        const primaryColor = isCampusTheme ? '#137333' : '#007aff';
        
        // Find names of the students
        const getStudentName = (id: string) => {
          // Check designer boards
          for (const b of boards) {
            const found = b.students.find(s => s.id === id);
            if (found) {
              if (found.isGroup) return found.first_name + " " + found.last_name;
              return `${found.first_name} ${found.last_name}`;
            }
          }
          // Check sidebar list
          const found = students.find(s => s.id === id);
          if (found) return `${found.first_name} ${found.last_name}`;
          return 'Schüler';
        };

        const srcName = getStudentName(dropDecisionState.sourceId);
        const tgtName = getStudentName(dropDecisionState.targetId);

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
                    background: primaryColor,
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: `0 4px 12px ${isCampusTheme ? 'rgba(19, 115, 51, 0.2)' : 'rgba(0, 122, 255, 0.2)'}`
                  }}
                  onMouseOver={e => e.currentTarget.style.filter = 'brightness(0.9)'}
                  onMouseOut={e => e.currentTarget.style.filter = 'none'}
                >
                  👥 Zusammenführen (Gruppenunterricht)
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
    </div>
  );
}
