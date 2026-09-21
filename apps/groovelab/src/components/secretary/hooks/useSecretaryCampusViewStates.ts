import { useState } from 'react';

export interface UseSecretaryCampusViewStatesReturn {
  // Feature Toggles
  enabledCampusSubjects: boolean;
  setEnabledCampusSubjects: React.Dispatch<React.SetStateAction<boolean>>;
  enabledCampusRooms: boolean;
  setEnabledCampusRooms: React.Dispatch<React.SetStateAction<boolean>>;
  enabledCampusEvents: boolean;
  setEnabledCampusEvents: React.Dispatch<React.SetStateAction<boolean>>;
  enabledCampusSchedules: boolean;
  setEnabledCampusSchedules: React.Dispatch<React.SetStateAction<boolean>>;
  enabledCalendarWidget: boolean;
  setEnabledCalendarWidget: React.Dispatch<React.SetStateAction<boolean>>;
  enabledQrLogin: boolean;
  setEnabledQrLogin: React.Dispatch<React.SetStateAction<boolean>>;

  // Teacher Management Permissions
  teachersManageStudents: boolean;
  setTeachersManageStudents: React.Dispatch<React.SetStateAction<boolean>>;
  teachersManageTeachers: boolean;
  setTeachersManageTeachers: React.Dispatch<React.SetStateAction<boolean>>;
  campusTeachersManageStudents: boolean;
  setCampusTeachersManageStudents: React.Dispatch<React.SetStateAction<boolean>>;
  campusTeachersManageTeachers: boolean;
  setCampusTeachersManageTeachers: React.Dispatch<React.SetStateAction<boolean>>;

  // View Modes & Selection
  schedulesRoomsViewMode: 'designer' | 'live';
  setSchedulesRoomsViewMode: React.Dispatch<React.SetStateAction<'designer' | 'live'>>;
  roomsSubView: 'overview' | 'plan' | 'settings';
  setRoomsSubView: React.Dispatch<React.SetStateAction<'overview' | 'plan' | 'settings'>>;
  liveViewDay: number;
  setLiveViewDay: React.Dispatch<React.SetStateAction<number>>;

  // Ad-Hoc Booking
  showAdHocBooking: boolean;
  setShowAdHocBooking: React.Dispatch<React.SetStateAction<boolean>>;
  adHocRoomId: string | null;
  setAdHocRoomId: React.Dispatch<React.SetStateAction<string | null>>;
  adHocTeacherId: string;
  setAdHocTeacherId: React.Dispatch<React.SetStateAction<string>>;
  adHocStudentName: string;
  setAdHocStudentName: React.Dispatch<React.SetStateAction<string>>;
  adHocStartTime: string;
  setAdHocStartTime: React.Dispatch<React.SetStateAction<string>>;
  adHocDuration: number;
  setAdHocDuration: React.Dispatch<React.SetStateAction<number>>;
}

export function useSecretaryCampusViewStates(): UseSecretaryCampusViewStatesReturn {
  // Feature Toggles
  const [enabledCampusSubjects, setEnabledCampusSubjects] = useState<boolean>(true);
  const [enabledCampusRooms, setEnabledCampusRooms] = useState<boolean>(true);
  const [enabledCampusEvents, setEnabledCampusEvents] = useState<boolean>(true);
  const [enabledCampusSchedules, setEnabledCampusSchedules] = useState<boolean>(true);
  const [enabledCalendarWidget, setEnabledCalendarWidget] = useState<boolean>(true);
  const [enabledQrLogin, setEnabledQrLogin] = useState<boolean>(true);

  // Teacher Management Permissions
  const [teachersManageStudents, setTeachersManageStudents] = useState<boolean>(false);
  const [teachersManageTeachers, setTeachersManageTeachers] = useState<boolean>(false);
  const [campusTeachersManageStudents, setCampusTeachersManageStudents] = useState<boolean>(false);
  const [campusTeachersManageTeachers, setCampusTeachersManageTeachers] = useState<boolean>(false);

  // View Modes & Selection
  const [schedulesRoomsViewMode, setSchedulesRoomsViewMode] = useState<'designer' | 'live'>('designer');
  const [roomsSubView, setRoomsSubView] = useState<'overview' | 'plan' | 'settings'>('overview');
  const [liveViewDay, setLiveViewDay] = useState<number>(1);

  // Ad-Hoc Booking
  const [showAdHocBooking, setShowAdHocBooking] = useState<boolean>(false);
  const [adHocRoomId, setAdHocRoomId] = useState<string | null>(null);
  const [adHocTeacherId, setAdHocTeacherId] = useState<string>('');
  const [adHocStudentName, setAdHocStudentName] = useState<string>('');
  const [adHocStartTime, setAdHocStartTime] = useState<string>('14:00');
  const [adHocDuration, setAdHocDuration] = useState<number>(45);

  return {
    enabledCampusSubjects,
    setEnabledCampusSubjects,
    enabledCampusRooms,
    setEnabledCampusRooms,
    enabledCampusEvents,
    setEnabledCampusEvents,
    enabledCampusSchedules,
    setEnabledCampusSchedules,
    enabledCalendarWidget,
    setEnabledCalendarWidget,
    enabledQrLogin,
    setEnabledQrLogin,
    teachersManageStudents,
    setTeachersManageStudents,
    teachersManageTeachers,
    setTeachersManageTeachers,
    campusTeachersManageStudents,
    setCampusTeachersManageStudents,
    campusTeachersManageTeachers,
    setCampusTeachersManageTeachers,
    schedulesRoomsViewMode,
    setSchedulesRoomsViewMode,
    roomsSubView,
    setRoomsSubView,
    liveViewDay,
    setLiveViewDay,
    showAdHocBooking,
    setShowAdHocBooking,
    adHocRoomId,
    setAdHocRoomId,
    adHocTeacherId,
    setAdHocTeacherId,
    adHocStudentName,
    setAdHocStudentName,
    adHocStartTime,
    setAdHocStartTime,
    adHocDuration,
    setAdHocDuration
  };
}
