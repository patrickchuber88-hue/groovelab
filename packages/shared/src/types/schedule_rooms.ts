/**
 * Campus-Groovelab Schedule & Room Engine Domain Models
 * Schedule Board, Lessons, Solvers, Room Occupancy, Appointment Changes
 */

export interface StudentLessonConfig {
  studentId: string;
  studentName: string;
  instrument: string;
  durationMinutes: number;
  assignedTeacherId: string;
  assignedRoomId?: string;
  preferredDays?: string[];
  preferredTimeWindow?: {
    start: string;
    end: string;
  };
}

export interface LessonSlot {
  id: string;
  studentId: string;
  teacherId: string;
  roomId?: string;
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  durationMinutes: number;
}

export interface DayBoard {
  dayOfWeek: string;
  slots: LessonSlot[];
}

export interface Room {
  id: string;
  schoolId: string;
  name: string;
  building?: string;
  capacity: number;
  availableInstruments: string[];
  colorCode?: string;
}

export interface RoomOccupancy {
  roomId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  teacherId: string;
  studentId?: string;
  lessonName: string;
}

export interface ScheduleSolverParams {
  teacherId: string;
  schoolId: string;
  targetDay: string;
  students: StudentLessonConfig[];
  availableRooms: Room[];
  startTime: string;
  endTime: string;
}

export interface ScheduleSolverResult {
  isSuccess: boolean;
  score: number;
  dayBoard: DayBoard;
  unassignedStudentIds: string[];
  warnings: string[];
}

export type AppointmentStatus =
  | 'scheduled'
  | 'pending_reschedule'
  | 'cancelled'
  | 'canceled_by_student'
  | 'teacher_sick'
  | 'canceled_by_teacher_sick';

export interface AppointmentOccurrence {
  id: string;
  studentName?: string;
  title?: string;
  date: string;
  original_date?: string;
  startTime?: string;
  endTime?: string;
  status: AppointmentStatus;
}
