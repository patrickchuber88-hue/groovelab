/**
 * 🏛️ CAMPUS-GROOVELAB: TEACHER ROOM RESOLVER
 *
 * Autoritativer Resolver zur Ermittlung des aktuellen Unterrichts- bzw.
 * Aufenthaltsraums einer Lehrkraft.
 * 
 * Verhindert falsche Fallbacks (wie blindes "Musikzimmer") und folgt einer
 * deterministischen 6-Stufen-Priorität:
 * 1. Aktiver Unterrichts-Slot (Laufende Stunde)
 * 2. Heutige Unterrichtsräume (Tagesplan-Projektion)
 * 3. Stundenplan-Board des heutigen Wochentags (planned_boards)
 * 4. Beliebiges aktives Stundenplan-Board der Lehrkraft
 * 5. Bevorzugter Proberaum / Raum-Präferenzen im Profil (preferred_room_ids)
 * 6. Im Client gespeicherte Raum-Auswahl (selectedRoomId / LocalStorage)
 */

export interface RoomRecord {
  id: string;
  name: string;
  school_id?: string | number;
  [key: string]: any;
}

export interface ResolveTeacherRoomParams {
  activeTimelineSlot?: any;
  teacherTodayRooms?: string[];
  teacher?: any;
  todayBoard?: any;
  rooms?: RoomRecord[];
  selectedRoomId?: string | null;
  fallbackRoom?: string;
}

const INVALID_ROOM_NAMES = new Set(['', 'raum', 'unbenannter raum', 'undefined', 'null']);

function isValidRoomName(name: unknown): name is string {
  if (typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length > 0 && !INVALID_ROOM_NAMES.has(trimmed.toLowerCase());
}

export function resolveTeacherCurrentRoom({
  activeTimelineSlot,
  teacherTodayRooms = [],
  teacher,
  todayBoard,
  rooms = [],
  selectedRoomId,
  fallbackRoom = 'Raum 1'
}: ResolveTeacherRoomParams): string {
  // 1. Raum aus dem aktuell aktiven Unterrichts-Slot
  const slotRoom = activeTimelineSlot?.room || activeTimelineSlot?.rooms?.name;
  if (isValidRoomName(slotRoom)) {
    return slotRoom.trim();
  }

  // 2. Raum aus der heutigen Tagesplan-Auflistung
  if (Array.isArray(teacherTodayRooms) && teacherTodayRooms.length > 0) {
    const validTodayRoom = teacherTodayRooms.find(isValidRoomName);
    if (validTodayRoom) {
      return validTodayRoom.trim();
    }
  }

  // 3. Raum aus dem Stundenplan-Board des heutigen Wochentags (todayBoard)
  if (todayBoard) {
    if (todayBoard.roomId && Array.isArray(rooms)) {
      const matched = rooms.find(r => r.id === todayBoard.roomId);
      if (matched && isValidRoomName(matched.name)) {
        return matched.name.trim();
      }
    }
    if (isValidRoomName(todayBoard.roomName)) {
      return todayBoard.roomName.trim();
    }
  }

  // 4. Raum aus allen aktiven Stundenplan-Boards der Lehrkraft
  if (teacher) {
    const planned = teacher.planned_boards || teacher.campus_räume || teacher.groovelab_räume;
    let boardsList: any[] = [];
    if (Array.isArray(planned)) {
      boardsList = planned;
    } else if (planned?.drafts && Array.isArray(planned.drafts)) {
      const activeDraft = planned.drafts.find((d: any) => d.id === (planned.activeDraftId || planned.submittedDraftId)) || planned.drafts[0];
      if (Array.isArray(activeDraft?.boards)) boardsList = activeDraft.boards;
    } else if (Array.isArray(planned?.boards)) {
      boardsList = planned.boards;
    }

    for (const b of boardsList) {
      if (b?.roomId && Array.isArray(rooms)) {
        const matched = rooms.find(r => r.id === b.roomId);
        if (matched && isValidRoomName(matched.name)) {
          return matched.name.trim();
        }
      }
      if (isValidRoomName(b?.roomName)) {
        return b.roomName.trim();
      }
    }
  }

  // 5. Bevorzugter Raum aus dem Benutzerprofil (preferred_room_ids)
  const prefIds: string[] = Array.isArray(teacher?.preferred_room_ids) ? teacher.preferred_room_ids : [];
  if (prefIds.length > 0 && Array.isArray(rooms)) {
    for (const prefId of prefIds) {
      const matched = rooms.find(r => r.id === prefId);
      if (matched && isValidRoomName(matched.name)) {
        return matched.name.trim();
      }
    }
  }

  // 6. Im Client gespeicherter Proberaum (selectedRoomId oder LocalStorage)
  const savedRoomId = selectedRoomId || (typeof window !== 'undefined' ? (
    localStorage.getItem('groovelab_teacher_selected_room_id_campus') ||
    localStorage.getItem('groovelab_teacher_selected_room_id')
  ) : null);

  if (savedRoomId && Array.isArray(rooms)) {
    const matched = rooms.find(r => r.id === savedRoomId);
    if (matched && isValidRoomName(matched.name) && !matched.name.toLowerCase().startsWith('canonical-')) {
      return matched.name.trim();
    }
  }

  // 7. Fallback: Erstes Board aus LocalStorage oder definierter Fallback
  if (typeof window !== 'undefined') {
    try {
      const activePlatform = localStorage.getItem('groovelab_active_platform') || 'campus';
      const tid = teacher?.id;
      if (tid) {
        const cachedBoardsRaw = localStorage.getItem(`groovelab_teacher_boards_${activePlatform}_${tid}`) ||
                                localStorage.getItem(`groovelab_teacher_boards_${tid}`);
        if (cachedBoardsRaw) {
          const cachedBoards = JSON.parse(cachedBoardsRaw);
          if (Array.isArray(cachedBoards)) {
            for (const b of cachedBoards) {
              if (b?.roomId && Array.isArray(rooms)) {
                const matched = rooms.find(r => r.id === b.roomId);
                if (matched && isValidRoomName(matched.name)) return matched.name.trim();
              }
              if (isValidRoomName(b?.roomName)) return b.roomName.trim();
            }
          }
        }
      }
    } catch {}
  }

  return fallbackRoom;
}
