export interface BypassTeacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  instrument: string;
  maxStudents: number;
  ausweisNummer: string;
  teacherQrToken: string;
  studentCount?: number;
  contractEndsAt?: string | null;
  isCampusActive?: boolean;
  isGroovelabActive?: boolean;
  isActive?: boolean;
  role?: string;
  roles?: string[];
  isPinActivated?: boolean;
  ausfall_until?: string | null;
  preferred_room_ids?: string[];
}

export interface GrooveLabCoach {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  roles?: string[];
  instrument: string;
  isActive: boolean;
  isCampusActive?: boolean;
  isGroovelabActive?: boolean;
  ausweisNummer?: string;
  teacherQrToken?: string;
  isPinActivated?: boolean;
  studentCount?: number;
  contractEndsAt?: string | null;
  ausfall_until?: string | null;
  preferred_room_ids?: string[];
}
