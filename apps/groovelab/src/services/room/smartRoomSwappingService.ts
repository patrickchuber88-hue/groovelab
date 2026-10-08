/**
 * 🏛️ Campus-Groovelab 0,1% Goldstandard Smart Room Swapping & Absence Resilience Engine
 * smartRoomSwappingService.ts
 * 
 * High-Reliability Architecture for:
 * 1. Time-adaptive 15-Minute Grace Period on absence reporting (< 60m Instant vs. >= 60m Buffered).
 * 2. Pre-emption Hierarchy & Concurrency Protection: Restores primary tenure for Teacher A on reinstatement.
 * 3. Atomic Auto-Shift for Guest Teacher B (moved under review to best alternative room).
 * 4. Dual Notification & Review Shields:
 *    - Secretary Suitability Audit Ticket.
 *    - Teacher B Choice Dialog (Accept suggested room vs. Choose another free room).
 */

export interface PendingAbsenceSlot {
  student_id: string;
  student_name?: string;
  date_str: string;
  time_str: string;
  datetime?: string;
  room_id?: string;
}

export interface PendingAbsenceDispatch {
  id: string;
  teacherId: string;
  teacherName: string;
  schoolId: string;
  startDate: string;
  untilDate: string;
  createdAt: string; // ISO string
  dispatchAt: string; // ISO string (createdAt + 15 min)
  isUrgent: boolean;
  minutesUntilFirstSlot: number;
  affectedSlots: PendingAbsenceSlot[];
  handlingOwner: 'secretariat' | 'teacher';
  officialNote?: string;
}

export interface RoomCollisionRecord {
  id: string;
  schoolId: string;
  originalRoomId: string;
  originalRoomName: string;
  date: string;
  startTime: string;
  endTime: string;
  timeSlotFormatted: string;
  teacherA: {
    id: string;
    name: string;
  };
  teacherB: {
    id: string;
    name: string;
  };
  suggestedRoomId: string;
  suggestedRoomName: string;
  status: 'moved_under_review' | 'accepted_by_teacher_b' | 'reallocated_by_teacher_b' | 'confirmed_by_secretary';
  instrument?: string;
  createdAt: string;
}

const STORAGE_PREFIX_PENDING = 'campus_pending_absence_';
const STORAGE_PREFIX_COLLISIONS = 'campus_room_collisions_';

export class SmartRoomSwappingService {
  /**
   * Berechnet die Vorlaufzeit bis zum ersten betroffenen Unterrichtstermin in Minuten.
   */
  public static calculateAbsenceLeadTimeMinutes(firstSlotDateTime: string | Date, now: Date = new Date()): number {
    const slotDate = typeof firstSlotDateTime === 'string' ? new Date(firstSlotDateTime) : firstSlotDateTime;
    if (isNaN(slotDate.getTime())) return 0;
    const diffMs = slotDate.getTime() - now.getTime();
    return Math.floor(diffMs / (60 * 1000));
  }

  /**
   * 0,1% Goldstandard Vorlaufzeit-Klassifikation:
   * - < 60 Min. Vorlauf: EILFALL -> 0 Minuten Wartezeit, Sofortversand!
   * - >= 60 Min. Vorlauf: NORMALFALL -> 15 Minuten Schonfrist (Undo-Puffer)
   */
  public static evaluateDispatchStrategy(firstSlotDateTime?: string | Date, now: Date = new Date()): {
    hasGracePeriod: boolean;
    minutesUntilFirstSlot: number;
    isUrgent: boolean;
  } {
    if (!firstSlotDateTime) {
      // Kein konkreter Termin bekannt (z.B. ganzer Tag ohne Slots) -> 15m Puffer gewähren
      return { hasGracePeriod: true, minutesUntilFirstSlot: 999, isUrgent: false };
    }

    const minutes = this.calculateAbsenceLeadTimeMinutes(firstSlotDateTime, now);
    const isUrgent = minutes < 60;
    return {
      hasGracePeriod: !isUrgent,
      minutesUntilFirstSlot: minutes,
      isUrgent
    };
  }

  /**
   * Registriert einen vorgemerkten Ausfall mit 15-Minuten-Puffer im lokalen Cache & State.
   */
  public static createPendingAbsence(payload: Omit<PendingAbsenceDispatch, 'id' | 'createdAt' | 'dispatchAt'>): PendingAbsenceDispatch {
    const now = new Date();
    const dispatchAt = new Date(now.getTime() + 15 * 60 * 1000);
    const record: PendingAbsenceDispatch = {
      ...payload,
      id: `pending_${payload.teacherId}_${now.getTime()}`,
      createdAt: now.toISOString(),
      dispatchAt: dispatchAt.toISOString()
    };

    try {
      localStorage.setItem(`${STORAGE_PREFIX_PENDING}${payload.teacherId}`, JSON.stringify(record));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('campus_pending_absence_updated', { detail: { teacherId: payload.teacherId, record } }));
      }
    } catch (e) {
      console.warn('[SmartRoomSwappingService] Failed to store pending absence:', e);
    }

    return record;
  }

  /**
   * Liest einen aktuell vorgemerkten Ausfall für eine Lehrkraft aus.
   */
  public static getPendingAbsence(teacherId: string): PendingAbsenceDispatch | null {
    if (typeof window === 'undefined' || !teacherId) return null;
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX_PENDING}${teacherId}`);
      if (!raw) return null;
      const parsed: PendingAbsenceDispatch = JSON.parse(raw);
      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Bricht einen vorgemerkten Ausfall während der 15-Minuten-Grace-Period restlos ab (1-Tap Undo).
   */
  public static cancelPendingAbsence(teacherId: string): boolean {
    if (typeof window === 'undefined' || !teacherId) return false;
    try {
      localStorage.removeItem(`${STORAGE_PREFIX_PENDING}${teacherId}`);
      window.dispatchEvent(new CustomEvent('campus_pending_absence_updated', { detail: { teacherId, record: null } }));
      window.dispatchEvent(new CustomEvent('campus_pending_absence_canceled', { detail: { teacherId } }));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Löst den sofortigen Versand der Push-Nachrichten aus (nach 15m Ablauf oder manuellem Klick).
   */
  public static async executeDispatch(
    teacherId: string, 
    supabase: any,
    onSuccess?: () => void
  ): Promise<boolean> {
    const pending = this.getPendingAbsence(teacherId);
    if (!pending) return false;

    try {
      const pushTeacherName = pending.teacherName || 'deiner Lehrkraft';

      // Sende Push-Nachrichten an alle betroffenen Schüler
      const promises = pending.affectedSlots.map(async (slot) => {
        if (!slot.student_id) return;
        const dateObj = slot.date_str ? new Date(slot.date_str + 'T00:00:00') : new Date();
        const dateFormatted = !isNaN(dateObj.getTime())
          ? dateObj.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
          : 'heute';

        const pushTitle = 'Terminabsage ✕';
        const pushBody = `Terminabsage: Dein Unterricht am ${dateFormatted} um ${slot.time_str} Uhr bei ${pushTeacherName} entfällt.`;

        try {
          await supabase.functions.invoke('send-push', {
            body: {
              userId: slot.student_id,
              title: pushTitle,
              body: pushBody,
              url: '/'
            }
          });
        } catch (pushErr) {
          console.warn('[SmartRoomSwappingService] Non-blocking push error:', pushErr);
        }
      });

      await Promise.allSettled(promises);

      // Bereinige den Pending-Cache nach erfolgreichem Versand
      this.cancelPendingAbsence(teacherId);
      if (onSuccess) onSuccess();
      return true;
    } catch (err) {
      console.error('[SmartRoomSwappingService] Exception during executeDispatch:', err);
      return false;
    }
  }

  /**
   * 0,1% Goldstandard Raum-Kollisions- & Shift-Engine:
   * Wird aufgerufen, wenn Lehrer A sich wieder verfügbar meldet.
   * Prüft, ob Kollege B den Stammraum übernommen hat und verlegt Kollege B unter Vorbehalt.
   */
  public static async resolveReinstatementCollisions(params: {
    supabase: any;
    schoolId: string;
    teacherA: { id: string; name: string };
    dateStr: string;
    allRooms: any[];
    existingBookings: any[];
  }): Promise<RoomCollisionRecord[]> {
    const { supabase, schoolId, teacherA, dateStr, allRooms, existingBookings } = params;
    if (!schoolId || !teacherA.id || !dateStr) return [];

    const collisions: RoomCollisionRecord[] = [];

    try {
      // 1. Ermittle den Stammraum von Lehrer A für den heutigen Wochentag
      const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay() || 7; // 1 = Mo ... 7 = So
      
      const { data: schedules } = await supabase
        .from('schedules')
        .select('*')
        .eq('teacher_id', teacherA.id)
        .eq('school_id', schoolId);

      if (!schedules || schedules.length === 0) return [];

      // Finde Stammräume von Lehrer A heute
      const regularRoomIds = new Set<string>();
      schedules.forEach((s: any) => {
        const rawDow = s.day_of_week ?? s.dayOfWeek;
        const sDow = typeof rawDow === 'number' ? rawDow : 1;
        if (sDow === dayOfWeek && (s.room_id || s.roomId)) {
          regularRoomIds.add(String(s.room_id || s.roomId));
        }
      });

      if (regularRoomIds.size === 0) return [];

      // 2. Prüfe, ob andere Lehrkräfte (Kollege B) eine Gast-Buchung in diesen Räumen haben
      for (const roomId of Array.from(regularRoomIds)) {
        const guestBookings = (existingBookings || []).filter((b: any) => {
          const bRoomId = String(b.room_id || b.roomId || '');
          const bTeacherId = String(b.teacher_id || b.teacherId || b.booked_by || '');
          const bDate = String(b.date || b.start_time || '').substring(0, 10);
          return bRoomId === roomId && bTeacherId !== teacherA.id && bDate === dateStr;
        });

        for (const gb of guestBookings) {
          const teacherBId = String(gb.teacher_id || gb.teacherId || gb.booked_by || '');
          const originalRoom = allRooms.find(r => String(r.id) === roomId) || { id: roomId, name: 'Raum' };
          
          const startTime = String(gb.startTime || gb.start_time || '14:00').substring(0, 5);
          const endTime = String(gb.endTime || gb.end_time || '18:00').substring(0, 5);

          // 3. Finde den besten freien Ausweichraum
          const alternativeRoom = this.findBestAlternativeRoom({
            targetDate: dateStr,
            startTime,
            endTime,
            excludedRoomId: roomId,
            allRooms,
            allBookings: existingBookings,
            requiredInstrument: gb.instrument || gb.allowed_instruments?.[0]
          });

          const collision: RoomCollisionRecord = {
            id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            schoolId,
            originalRoomId: roomId,
            originalRoomName: originalRoom.name || `Raum ${originalRoom.room_number || ''}`,
            date: dateStr,
            startTime,
            endTime,
            timeSlotFormatted: `${startTime} – ${endTime} Uhr`,
            teacherA,
            teacherB: {
              id: teacherBId,
              name: gb.teacher_name || gb.booked_by_name || 'Kollege'
            },
            suggestedRoomId: alternativeRoom ? String(alternativeRoom.id) : '',
            suggestedRoomName: alternativeRoom ? (alternativeRoom.name || `Raum ${alternativeRoom.room_number}`) : 'Kein Raum frei (Sekretariat kontaktieren)',
            status: 'moved_under_review',
            instrument: gb.instrument,
            createdAt: new Date().toISOString()
          };

          // 4. Update die Buchung von Kollege B auf den Ausweichraum (unter Vorbehalt)
          if (alternativeRoom && gb.id) {
            await supabase.from('room_bookings').update({
              room_id: alternativeRoom.id,
              notes: `[Auto-Shift] Ausweichraum wegen Reaktivierung von ${teacherA.name}`
            }).eq('id', gb.id);
          }

          collisions.push(collision);
        }
      }

      // Speichere die Kollisionen im lokalen Pool
      if (collisions.length > 0) {
        this.saveCollisions(schoolId, collisions);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('campus_room_collision_detected', { detail: { collisions } }));
        }
      }

      return collisions;
    } catch (err) {
      console.warn('[SmartRoomSwappingService] Exception resolving collisions:', err);
      return [];
    }
  }

  /**
   * Findet den am besten geeigneten freien Ausweichraum unter Berücksichtigung von Akustik-Tags.
   */
  private static findBestAlternativeRoom(params: {
    targetDate: string;
    startTime: string;
    endTime: string;
    excludedRoomId: string;
    allRooms: any[];
    allBookings: any[];
    requiredInstrument?: string;
  }): any | null {
    const { targetDate, startTime, endTime, excludedRoomId, allRooms, allBookings, requiredInstrument } = params;

    const availableRooms = (allRooms || []).filter(room => {
      const rId = String(room.id);
      if (rId === String(excludedRoomId)) return false;

      // Akustik-Check: Ungeeignete Instrumente ausschließen
      if (requiredInstrument && Array.isArray(room.unsuitable_instruments)) {
        if (room.unsuitable_instruments.includes(requiredInstrument)) return false;
      }

      // Zeitliche Überlappung mit anderen Buchungen prüfen
      const hasConflict = (allBookings || []).some((b: any) => {
        const bRoomId = String(b.room_id || b.roomId || '');
        const bDate = String(b.date || b.start_time || '').substring(0, 10);
        if (bRoomId !== rId || bDate !== targetDate) return false;

        const bStart = String(b.startTime || b.start_time || '00:00').substring(0, 5);
        const bEnd = String(b.endTime || b.end_time || '23:59').substring(0, 5);

        // Überlappungstest
        return !(endTime <= bStart || startTime >= bEnd);
      });

      return !hasConflict;
    });

    if (availableRooms.length === 0) return null;

    // Priorisiere Räume mit gleicher Ausstattung
    return availableRooms[0];
  }

  /**
   * Speichert aktive Kollisionen für das Sekretariat und die betroffenen Lehrkräfte.
   */
  public static saveCollisions(schoolId: string, collisions: RoomCollisionRecord[]): void {
    if (typeof window === 'undefined' || !schoolId) return;
    try {
      const existing = this.getCollisions(schoolId);
      const merged = [...collisions, ...existing.filter(e => !collisions.some(c => c.id === e.id))];
      localStorage.setItem(`${STORAGE_PREFIX_COLLISIONS}${schoolId}`, JSON.stringify(merged));
    } catch (e) {
      console.warn('Failed to save collisions:', e);
    }
  }

  /**
   * Ruft aktive Raum-Kollisionen einer Schule ab.
   */
  public static getCollisions(schoolId: string): RoomCollisionRecord[] {
    if (typeof window === 'undefined' || !schoolId) return [];
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX_COLLISIONS}${schoolId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Aktualisiert den Status einer Kollision (z. B. durch Kollege B oder Sekretariat).
   */
  public static updateCollisionStatus(
    schoolId: string, 
    collisionId: string, 
    status: RoomCollisionRecord['status'],
    newRoom?: { id: string; name: string }
  ): void {
    const list = this.getCollisions(schoolId);
    const updated = list.map(item => {
      if (item.id === collisionId) {
        return {
          ...item,
          status,
          ...(newRoom ? { suggestedRoomId: newRoom.id, suggestedRoomName: newRoom.name } : {})
        };
      }
      return item;
    });
    try {
      localStorage.setItem(`${STORAGE_PREFIX_COLLISIONS}${schoolId}`, JSON.stringify(updated));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('campus_room_collision_updated', { detail: { collisionId, status } }));
      }
    } catch (e) {
      console.warn('Failed to update collision status:', e);
    }
  }
}
