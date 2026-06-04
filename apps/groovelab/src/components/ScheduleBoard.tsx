import React, { useState, useEffect } from 'react';
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

export function ScheduleBoard({ schoolId, userId }: ScheduleBoardProps) {
  // Main state
  const [activeTab, setActiveTab] = useState<'calendar' | 'designer'>('calendar');
  const [boards, setBoards] = useState<DayBoard[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarTab, setSidebarTab] = useState<'all' | 'unassigned' | 'assigned'>('unassigned');
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  
  // Create Board form state
  const [newBoardDay, setNewBoardDay] = useState(1);
  const [newBoardStart, setNewBoardStart] = useState('14:00');
  const [newBoardRoom, setNewBoardRoom] = useState('');
  const [showAddBoardForm, setShowAddBoardForm] = useState(false);

  const [draggedStudentId, setDraggedStudentId] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<'sidebar' | 'board' | null>(null);
  const [dragSourceBoardId, setDragSourceBoardId] = useState<string | null>(null);

  // Submission tracking states
  const [hasSubmittedSchedule, setHasSubmittedSchedule] = useState(false);
  const [lastSubmittedTime, setLastSubmittedTime] = useState<string | null>(null);
  const [scheduleStatus, setScheduleStatus] = useState<'none' | 'pending' | 'approved'>('none');

  useEffect(() => {
    loadInitialData();
  }, [schoolId, userId]);

  useEffect(() => {
    if (!isInitialLoadDone) return;
    if (userId) {
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
          customStartTime: s.customStartTime
        }))
      }));

      if (boards.length > 0) {
        localStorage.setItem(`groovelab_teacher_boards_${activePlatform}_${userId}`, JSON.stringify(boardDefinitions));
      } else {
        localStorage.removeItem(`groovelab_teacher_boards_${activePlatform}_${userId}`);
      }

      // Save to Supabase planned_boards column dynamically in real-time
      supabase
        .from('users')
        .update({ [columnName]: boardDefinitions })
        .eq('id', userId)
        .then(({ error }) => {
          if (error) {
            console.error(`Error auto-saving ${columnName} to DB:`, error);
          }
        });
    }
  }, [boards, userId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const activePlatform = localStorage.getItem('groovelab_active_platform') || 'groovelab';
      const isCampus = activePlatform === 'campus';
      const columnName = isCampus ? 'campus_räume' : 'groovelab_räume';
      
      // 1. Fetch all rooms
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

      // 2. Fetch all students for this teacher who are active in the platform
      const { data: sData } = await supabase
        .from('users')
        .select('id, first_name, last_name, instrument, lesson_duration')
        .eq('school_id', schoolId)
        .eq('role', 'student')
        .eq('teacher_id', userId)
        .eq(isCampus ? 'is_campus_active' : 'is_groovelab_active', true);
      
      const loadedStudents: Student[] = (sData || []).map(s => ({
        id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        instrument: s.instrument || 'Musiker',
        duration: s.lesson_duration || 45 // Load lesson_duration from DB
      }));

      // 3. Fetch teacher profile for planned boards (checking new platform-specific column and fallback planned_boards)
      const { data: teacherProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const dbPlannedBoards = ((teacherProfile as any)?.[columnName] || teacherProfile?.planned_boards) as { id: string; dayOfWeek: number; startAnchor: string; roomId: string; students?: Student[] }[] || [];

      // 4. Fetch existing schedules to pre-populate boards
      const { data: schedData } = await supabase
        .from('schedules')
        .select('*, student:users!schedules_student_id_fkey(*)')
        .eq('teacher_id', userId);

      if (schedData && schedData.length > 0) {
        setHasSubmittedSchedule(true);
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
      } else {
        setHasSubmittedSchedule(false);
        setScheduleStatus('none');
      }

      // Reconstruct boards based on database planned_boards OR localStorage OR existing schedules
      let reconstructedBoards: DayBoard[] = [];
      const usedStudentIds = new Set<string>();

      const storedBoards = localStorage.getItem(`groovelab_teacher_boards_${activePlatform}_${userId}`) || localStorage.getItem(`groovelab_teacher_boards_${userId}`);
      let parsedStored: typeof dbPlannedBoards = [];
      if (storedBoards) {
        try {
          parsedStored = JSON.parse(storedBoards);
        } catch (e) {}
      }

      const activeBoardsDefinition = dbPlannedBoards.length > 0 ? dbPlannedBoards : parsedStored;

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

    setBoards(prev => prev.filter(b => b.id !== boardId));
  };

  // Drag start handler for students (either from sidebar or day board)
  const handleDragStart = (studentId: string, source: 'sidebar' | 'board', boardId?: string) => {
    setDraggedStudentId(studentId);
    setDragSource(source);
    if (boardId) setDragSourceBoardId(boardId);
  };

  // Drag over handler to allow dropping
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Handle drops on columns
  const handleDropOnBoard = (targetBoardId: string, index?: number) => {
    if (!draggedStudentId) return;

    const isBreakDrag = draggedStudentId.startsWith('break-') || draggedStudentId === 'sidebar-pause';
    const student = students.find(s => s.id === draggedStudentId);
    if (!student && !isBreakDrag) return;

    setBoards(prev => {
      let sourceBoard = prev.find(b => b.id === dragSourceBoardId);
      let targetBoard = prev.find(b => b.id === targetBoardId);
      if (!targetBoard) return prev;

      // 1. If moving within boards
      if (dragSource === 'board' && sourceBoard) {
        // If moving inside the SAME board
        if (sourceBoard.id === targetBoard.id) {
          const nextStudents = [...targetBoard.students];
          const curIndex = nextStudents.findIndex(s => s.id === draggedStudentId);
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
        const sourceNextStudents = sourceBoard.students.filter(s => s.id !== draggedStudentId);
        const targetNextStudents = [...targetBoard.students];
        
        // Remove from source and recalculate
        const updatedSource = recalculateBoardTimes({ ...sourceBoard, students: sourceNextStudents });
        
        // Add to target and recalculate
        const movedStudent = sourceBoard.students.find(s => s.id === draggedStudentId)!;
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
      if (dragSource === 'sidebar') {
        if (draggedStudentId === 'sidebar-pause') {
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
        if (targetBoard.students.some(s => s.id === draggedStudentId)) return prev;

        // Remove student from any other board if they were assigned
        const cleanedBoards = prev.map(b => {
          if (b.students.some(s => s.id === draggedStudentId)) {
            return recalculateBoardTimes({ ...b, students: b.students.filter(s => s.id !== draggedStudentId) });
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
          if (s.id === draggedStudentId) {
            return {
              ...s,
              assignedDay: targetBoard!.dayOfWeek,
              assignedTime: updatedTarget.students.find(bs => bs.id === draggedStudentId)?.assignedTime
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
          localStorage.setItem(`groovelab_teacher_boards_${activePlatform}_${userId}`, JSON.stringify(boardDefinitions));
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
        .eq('teacher_id', userId);

      // Save the planned boards definitions to the teacher's profile in users table
      const activePlatform = localStorage.getItem('groovelab_active_platform') || 'groovelab';
      const columnName = activePlatform === 'campus' ? 'campus_räume' : 'groovelab_räume';

      const boardDefinitions = validBoards.map(b => ({
        id: b.id,
        dayOfWeek: b.dayOfWeek,
        startAnchor: b.startAnchor,
        roomId: b.roomId
      }));

      await supabase
        .from('users')
        .update({ [columnName]: boardDefinitions })
        .eq('id', userId);

      // 2. Insert all new schedule slots from the day boards
      const inserts = [];
      for (const board of validBoards) {
        for (const s of board.students) {
          inserts.push({
            school_id: schoolId,
            teacher_id: userId,
            student_id: s.isBreak ? null : s.id,
            day_of_week: board.dayOfWeek,
            time_slot: s.assignedTime,
            room_id: board.roomId || null,
            duration: s.duration,
            status: s.isBreak ? 'approved' : 'ready_for_admin_review' // A break/pause is auto-approved
          });
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
          .eq('teacher_id', userId)
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
        .eq('id', userId)
        .single();
      
      const teacherName = teacherProfile ? `${teacherProfile.first_name} ${teacherProfile.last_name}` : 'Patrick';

      await supabase.from('system_alerts').insert({
        school_id: schoolId,
        teacher_id: userId,
        type: 'Stundenplan Freigabe',
        message: `🗓️ Stundenplan-Review: Lehrkraft ${teacherName} hat den neuen Stundenplan erstellt und zur Freigabe an die Verwaltung gesendet.`
      });

      // 4. Generate PDF Backup
      await generatePDFBackup(validBoards, students);

      // 5. Show success animation
      setShowCelebration(true);
      setHasSubmittedSchedule(true);
      setScheduleStatus('pending');
      setLastSubmittedTime(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));
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
        <ScheduleCalendarView schoolId={schoolId} userId={userId} boards={boards} activeTab={activeTab} setActiveTab={setActiveTab} />
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
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1d1d1f', margin: 0, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                  Stundenplan-Designer
                </h2>
              </div>
            </div>

            <div className="app-segmented-switch" style={{ margin: 0 }}>
              <button 
                onClick={() => setActiveTab('calendar')}
                className={`app-segmented-switch-btn ${(activeTab as string) === 'calendar' ? 'active' : ''}`}
              >
                Stundenplan
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
            <div style={{ display: 'flex', gap: '12px', width: '100%', minHeight: '520px', alignItems: 'start' }}>
              {boards.map(board => {
                const dayLabel = DAYS_OF_WEEK.find(d => d.value === board.dayOfWeek)?.name || '';

                return (
                  <div
                    key={board.id}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDropOnBoard(board.id)}
                    style={{ 
                      flex: 1,
                      minWidth: '170px',
                      background: 'rgba(255, 255, 255, 0.4)', 
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.6)', 
                      borderRadius: '16px', 
                      padding: '12px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '8px', 
                      minHeight: '400px',
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

                    {/* Day Column Student Pool List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', minHeight: '320px', marginTop: '6px' }}>
                      {board.students.map((bs, index) => {
                        if (bs.isBreak) {
                          return (
                            <React.Fragment key={bs.id}>
                              <div
                                draggable
                                onDragStart={() => handleDragStart(bs.id, 'board', board.id)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => {
                                  e.stopPropagation();
                                  handleDropOnBoard(board.id, index);
                                }}
                                style={{ 
                                  background: 'rgba(254, 243, 199, 0.5)', 
                                  border: '1.5px dashed rgba(245, 158, 11, 0.25)', 
                                  borderLeft: '4px solid #f59e0b', 
                                  borderRadius: '10px', 
                                  padding: '6px 8px', 
                                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.02)', 
                                  cursor: 'grab', 
                                  display: 'flex', 
                                  flexDirection: 'column', 
                                  gap: '4px', 
                                  position: 'relative' 
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ fontSize: '0.8rem' }}>☕</span>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b45309', letterSpacing: '-0.01em' }}>
                                      Pause
                                    </span>
                                  </div>
                                  
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveStudentFromBoard(board.id, bs.id)}
                                    style={{ background: 'transparent', border: 'none', color: '#d97706', height: '16px', width: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
                                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(254, 243, 199, 0.9)'; e.currentTarget.style.color = '#b45309'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#d97706'; }}
                                    title="Pause löschen"
                                  >
                                    <X size={11} strokeWidth={2.5} />
                                  </button>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', width: '100%' }}>
                                  {/* Merged Uhrzeit: Clock Icon + Time picker */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'rgba(255, 255, 255, 0.6)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '6px', padding: '2px 4px', flex: '0 0 66px', minWidth: '66px' }}>
                                    <Clock size={9} strokeWidth={2.5} style={{ color: '#b45309', flexShrink: 0 }} />
                                    <input
                                      type="time"
                                      value={bs.customStartTime || bs.assignedTime}
                                      className="mini-time-input"
                                      onChange={(e) => {
                                        const newTime = e.target.value || undefined;
                                        const resolvedTime = newTime === bs.assignedTime ? undefined : newTime;
                                        setBoards(prev => prev.map(b => {
                                          if (b.id !== board.id) return b;
                                          const nextStudents = b.students.map(s => s.id === bs.id ? { ...s, customStartTime: resolvedTime } : s);
                                          return recalculateBoardTimes({ ...b, students: nextStudents });
                                        }));
                                      }}
                                      style={{ width: '40px', background: 'transparent', border: 'none', fontSize: '0.68rem', fontWeight: 700, color: '#b45309', outline: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
                                      title="Startzeit bearbeiten"
                                    />
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                                    {[5, 10, 15, 20, 30, 45, 60].includes(bs.duration) ? (
                                      <select
                                        value={bs.duration}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === 'custom') {
                                            const newDur = 12;
                                            setBoards(prev => prev.map(b => {
                                              if (b.id !== board.id) return b;
                                              const nextStudents = b.students.map(s => s.id === bs.id ? { ...s, duration: newDur } : s);
                                              return recalculateBoardTimes({ ...b, students: nextStudents });
                                            }));
                                          } else {
                                            const newDur = parseInt(val);
                                            setBoards(prev => prev.map(b => {
                                              if (b.id !== board.id) return b;
                                              const nextStudents = b.students.map(s => s.id === bs.id ? { ...s, duration: newDur } : s);
                                              return recalculateBoardTimes({ ...b, students: nextStudents });
                                            }));
                                          }
                                        }}
                                        style={{ background: 'rgba(255, 255, 255, 0.6)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '6px', padding: '2px 4px', fontSize: '0.68rem', fontWeight: 700, color: '#b45309', outline: 'none', cursor: 'pointer' }}
                                      >
                                        <option value={5}>5m</option>
                                        <option value={10}>10m</option>
                                        <option value={15}>15m</option>
                                        <option value={20}>20m</option>
                                        <option value={30}>30m</option>
                                        <option value={45}>45m</option>
                                        <option value={60}>60m</option>
                                        <option value="custom">...</option>
                                      </select>
                                    ) : (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '1px', background: 'rgba(255, 255, 255, 0.6)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '6px', padding: '1px 3px' }}>
                                        <input
                                          type="number"
                                          min={1}
                                          max={240}
                                          value={bs.duration}
                                          onChange={(e) => {
                                            const newDur = parseInt(e.target.value) || 0;
                                            setBoards(prev => prev.map(b => {
                                              if (b.id !== board.id) return b;
                                              const nextStudents = b.students.map(s => s.id === bs.id ? { ...s, duration: newDur } : s);
                                              return recalculateBoardTimes({ ...b, students: nextStudents });
                                            }));
                                          }}
                                          style={{ width: '22px', background: 'transparent', border: 'none', fontSize: '0.68rem', fontWeight: 700, color: '#b45309', outline: 'none', textAlign: 'center', padding: 0 }}
                                        />
                                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#b45309' }}>m</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {index < board.students.length - 1 && (
                                <div style={{ display: 'flex', justifyContent: 'center', height: '10px', alignItems: 'center' }}>
                                  <div style={{ borderRight: '1px solid rgba(0, 0, 0, 0.08)', height: '100%', width: '0px' }}></div>
                                </div>
                              )}
                            </React.Fragment>
                          );
                        }

                        let borderLeftColor = '#10b981';
                        if (bs.duration === 30) borderLeftColor = '#10b981';
                        else if (bs.duration === 45) borderLeftColor = '#007aff';
                        else if (bs.duration === 60) borderLeftColor = '#34d399';
                        else if (bs.duration === 90) borderLeftColor = '#ff3b30';

                        return (
                          <React.Fragment key={bs.id}>
                            <div
                              draggable
                              onDragStart={() => handleDragStart(bs.id, 'board', board.id)}
                              onDragOver={handleDragOver}
                              onDrop={(e) => {
                                  e.stopPropagation();
                                  handleDropOnBoard(board.id, index);
                              }}
                              style={{ 
                                background: 'rgba(220, 252, 231, 0.45)', 
                                border: '1px solid rgba(16, 185, 129, 0.15)',
                                borderLeft: '3px solid #10b981', 
                                borderRadius: '10px', 
                                padding: '8px 10px', 
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)', 
                                cursor: 'grab', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '6px', 
                                position: 'relative' 
                              }}
                            >
                              {/* 1st Line: Time (in black) + Duration + Remove Button */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#065f46' }}>
                                    {bs.assignedTime}
                                  </span>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#047857' }}>
                                    {bs.duration} Min
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStudentFromBoard(board.id, bs.id)}
                                  style={{ background: 'transparent', border: 'none', color: '#047857', height: '16px', width: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
                                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(254, 226, 226, 0.8)'; e.currentTarget.style.color = '#ef4444'; }}
                                  onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#047857'; }}
                                  title="Entfernen"
                                >
                                  <X size={11} strokeWidth={2.5} />
                                </button>
                              </div>

                              {/* 2nd Line: Student's Name */}
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#065f46', display: 'block', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {bs.first_name} {bs.last_name}
                                </span>
                              </div>
                            </div>
                            
                            {/* Visual Timeline connector link */}
                            {index < board.students.length - 1 && (
                              <div style={{ display: 'flex', justifyContent: 'center', height: '10px', alignItems: 'center' }}>
                                <div style={{ borderRight: '1px solid rgba(0, 0, 0, 0.08)', height: '100%', width: '0px' }}></div>
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}

                      {board.students.length === 0 && (
                        <div style={{ flex: 1, border: '1.5px dashed rgba(0, 0, 0, 0.08)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', textAlign: 'center', color: '#86868b', minHeight: '120px' }}>
                          <Users size={18} style={{ color: '#c7c7cc', marginBottom: '4px' }} />
                          <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Schüler hierhin</span>
                        </div>
                      )}
                    </div>

                    {/* Board column summary */}
                    {board.students.length > 0 && (
                      <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '6px', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#86868b' }}>
                        <span>Dauer:</span>
                        <span style={{ color: '#1d1d1f', fontWeight: 800 }}>
                          {(() => {
                            const total = board.students.reduce((acc, curr) => acc + curr.duration, 0);
                            const hrs = Math.floor(total / 60);
                            const mins = total % 60;
                            if (hrs > 0) {
                              return `${hrs} h ${mins} m`;
                            }
                            return `${mins} m`;
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

                  return (
                    <div
                      key={s.id}
                      draggable={!isAssigned}
                      onDragStart={() => handleDragStart(s.id, 'sidebar')}
                      style={{ 
                        background: isAssigned ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.65)', 
                        backdropFilter: isAssigned ? 'none' : 'blur(12px)',
                        WebkitBackdropFilter: isAssigned ? 'none' : 'blur(12px)',
                        border: '1px solid rgba(255, 255, 255, 0.6)', 
                        borderLeft: isAssigned ? '3px solid #cbd5e1' : '3px solid #86868b', 
                        borderRadius: '8px', 
                        padding: '6px 8px', 
                        cursor: isAssigned ? 'not-allowed' : 'grab', 
                        opacity: isAssigned ? 0.5 : 1, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '4px',
                        boxShadow: isAssigned ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.01)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1d1d1f', display: 'block', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '4px' }}>
                          {s.first_name} {s.last_name}
                        </span>
                        <span style={{ height: '5px', width: '5px', borderRadius: '50%', background: isAssigned ? '#34d399' : '#d1d1d6', flexShrink: 0 }}></span>
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
    </div>
  );
}
