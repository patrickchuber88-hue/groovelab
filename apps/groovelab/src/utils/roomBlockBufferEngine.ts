/**
 * 🏛️ Campus-Groovelab 0,1% Goldstandard Room Block Buffer Engine
 * apps/groovelab/src/utils/roomBlockBufferEngine.ts
 *
 * Mathematically authoritative cluster engine for room occupancy:
 * 1. Groups contiguous appointments in the same room (same teacher or back-to-back lessons) into session blocks.
 * 2. Applies 15-minute preparation buffer BEFORE the first appointment of the block.
 * 3. Applies 15-minute cleanup/ventilation buffer AFTER the last appointment of the block.
 * 4. Back-to-back appointments within the block remain 100% collision-free.
 * 5. Protects against external bookings and room clashes during the buffer windows.
 */

export interface RoomSlot {
  id?: string;
  roomId?: string;
  room_id?: string;
  startTime: string; // 'HH:MM'
  endTime?: string;   // 'HH:MM'
  duration?: number;  // minutes
  teacherId?: string;
  teacher_id?: string;
  teacherName?: string;
  studentName?: string;
  date?: string;      // 'YYYY-MM-DD'
  dayOfWeek?: number | string;
  day_of_week?: number | string;
  isCancelled?: boolean;
  status?: string;
}

export interface ContiguousRoomBlock {
  teacherId?: string;
  teacherName?: string;
  roomId?: string;
  date?: string;
  dayOfWeek?: number | string;
  startTime: string; // Start of first slot (e.g. '14:00')
  endTime: string;   // End of last slot (e.g. '16:15')
  startMinutes: number;
  endMinutes: number;
  effectiveStartMinutes: number; // e.g. 13:45
  effectiveEndMinutes: number;   // e.g. 16:30
  effectiveStartTime: string;
  effectiveEndTime: string;
  slots: RoomSlot[];
}

export interface RoomBufferConfig {
  bufferBeforeMinutes: number; // default 15
  bufferAfterMinutes: number;  // default 15
  scope?: 'block_boundaries' | 'every_slot';
}

export interface RoomCollisionCheckResult {
  hasConflict: boolean;
  conflictType?: 'direct_overlap' | 'buffer_before' | 'buffer_after';
  conflictingSlot?: RoomSlot;
  conflictingBlock?: ContiguousRoomBlock;
  conflictMessage?: string;
}

export const DEFAULT_ROOM_BUFFER_CONFIG: RoomBufferConfig = {
  bufferBeforeMinutes: 15,
  bufferAfterMinutes: 15,
  scope: 'block_boundaries'
};

/**
 * Converts 'HH:MM' string to minutes from midnight.
 */
export function timeStringToMinutes(timeStr: string | null | undefined): number {
  if (!timeStr) return 0;
  const parts = String(timeStr).split(':');
  const h = Number(parts[0]) || 0;
  const m = Number(parts[1]) || 0;
  return h * 60 + m;
}

/**
 * Converts minutes from midnight to 'HH:MM' string.
 */
export function minutesToTimeString(minutes: number): string {
  const normalized = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Resolves standard end time in minutes from a slot.
 */
export function getSlotEndMinutes(slot: RoomSlot): number {
  const startM = timeStringToMinutes(slot.startTime);
  if (slot.endTime) {
    const endM = timeStringToMinutes(slot.endTime);
    if (endM > startM) return endM;
  }
  const dur = slot.duration && slot.duration > 0 ? slot.duration : 45;
  return startM + dur;
}

/**
 * Groups raw schedule/booking slots of a room into contiguous session blocks.
 * Adjacent or back-to-back slots (where nextStart <= prevEnd) of the same teacher
 * merge into a continuous block.
 */
export function groupSlotsIntoContiguousBlocks(
  slots: RoomSlot[],
  config: RoomBufferConfig = DEFAULT_ROOM_BUFFER_CONFIG
): ContiguousRoomBlock[] {
  const validSlots = slots.filter(s => {
    if (s.isCancelled) return false;
    if (s.status === 'cancelled' || s.status === 'abgesagt') return false;
    return !!s.startTime;
  });

  if (validSlots.length === 0) return [];

  // Sort chronologically by start time
  const sorted = [...validSlots].sort((a, b) => {
    return timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime);
  });

  const blocks: ContiguousRoomBlock[] = [];
  let currentBlock: {
    teacherId?: string;
    teacherName?: string;
    roomId?: string;
    date?: string;
    dayOfWeek?: number | string;
    slots: RoomSlot[];
    startM: number;
    endM: number;
  } | null = null;

  for (const slot of sorted) {
    const slotStartM = timeStringToMinutes(slot.startTime);
    const slotEndM = getSlotEndMinutes(slot);
    const slotTeacher = slot.teacherId || slot.teacher_id;
    const slotRoom = slot.roomId || slot.room_id;

    if (!currentBlock) {
      currentBlock = {
        teacherId: slotTeacher,
        teacherName: slot.teacherName,
        roomId: slotRoom,
        date: slot.date,
        dayOfWeek: slot.dayOfWeek ?? slot.day_of_week,
        slots: [slot],
        startM: slotStartM,
        endM: slotEndM
      };
      continue;
    }

    // Merge condition:
    // If adjacent or overlapping and same teacher (or same room block):
    const isAdjacentOrOverlapping = slotStartM <= currentBlock.endM;
    const isSameTeacher = !slotTeacher || !currentBlock.teacherId || slotTeacher === currentBlock.teacherId;

    if (isAdjacentOrOverlapping && isSameTeacher) {
      currentBlock.slots.push(slot);
      currentBlock.endM = Math.max(currentBlock.endM, slotEndM);
      if (!currentBlock.teacherName && slot.teacherName) {
        currentBlock.teacherName = slot.teacherName;
      }
    } else {
      // Seal current block and start a new one
      const bufBefore = Math.max(0, config.bufferBeforeMinutes || 0);
      const bufAfter = Math.max(0, config.bufferAfterMinutes || 0);
      const effStart = Math.max(0, currentBlock.startM - bufBefore);
      const effEnd = Math.min(24 * 60, currentBlock.endM + bufAfter);

      blocks.push({
        teacherId: currentBlock.teacherId,
        teacherName: currentBlock.teacherName,
        roomId: currentBlock.roomId,
        date: currentBlock.date,
        dayOfWeek: currentBlock.dayOfWeek,
        startTime: minutesToTimeString(currentBlock.startM),
        endTime: minutesToTimeString(currentBlock.endM),
        startMinutes: currentBlock.startM,
        endMinutes: currentBlock.endM,
        effectiveStartMinutes: effStart,
        effectiveEndMinutes: effEnd,
        effectiveStartTime: minutesToTimeString(effStart),
        effectiveEndTime: minutesToTimeString(effEnd),
        slots: currentBlock.slots
      });

      currentBlock = {
        teacherId: slotTeacher,
        teacherName: slot.teacherName,
        roomId: slotRoom,
        date: slot.date,
        dayOfWeek: slot.dayOfWeek ?? slot.day_of_week,
        slots: [slot],
        startM: slotStartM,
        endM: slotEndM
      };
    }
  }

  if (currentBlock) {
    const bufBefore = Math.max(0, config.bufferBeforeMinutes || 0);
    const bufAfter = Math.max(0, config.bufferAfterMinutes || 0);
    const effStart = Math.max(0, currentBlock.startM - bufBefore);
    const effEnd = Math.min(24 * 60, currentBlock.endM + bufAfter);

    blocks.push({
      teacherId: currentBlock.teacherId,
      teacherName: currentBlock.teacherName,
      roomId: currentBlock.roomId,
      date: currentBlock.date,
      dayOfWeek: currentBlock.dayOfWeek,
      startTime: minutesToTimeString(currentBlock.startM),
      endTime: minutesToTimeString(currentBlock.endM),
      startMinutes: currentBlock.startM,
      endMinutes: currentBlock.endM,
      effectiveStartMinutes: effStart,
      effectiveEndMinutes: effEnd,
      effectiveStartTime: minutesToTimeString(effStart),
      effectiveEndTime: minutesToTimeString(effEnd),
      slots: currentBlock.slots
    });
  }

  return blocks;
}

/**
 * Checks whether a proposed query slot collides with existing room schedule blocks,
 * taking into account the 15-minute buffer before the first appointment and after the last.
 */
export function checkRoomBlockCollision(
  query: {
    startTime: string;
    endTime: string;
    teacherId?: string;
    roomId?: string;
    date?: string;
    dayOfWeek?: number | string;
    excludeSlotId?: string;
  },
  existingSlots: RoomSlot[],
  config: RoomBufferConfig = DEFAULT_ROOM_BUFFER_CONFIG
): RoomCollisionCheckResult {
  const qStartM = timeStringToMinutes(query.startTime);
  const qEndM = timeStringToMinutes(query.endTime);

  if (qStartM >= qEndM) {
    return {
      hasConflict: true,
      conflictType: 'direct_overlap',
      conflictMessage: 'Die Endzeit muss nach der Startzeit liegen.'
    };
  }

  // Filter slots for the same room (and date/day if provided)
  const roomSlots = existingSlots.filter(s => {
    if (query.excludeSlotId && s.id === query.excludeSlotId) return false;
    if (query.roomId && s.roomId && s.roomId !== query.roomId) return false;
    if (query.roomId && s.room_id && s.room_id !== query.roomId) return false;
    if (query.date && s.date && s.date !== query.date) return false;
    if (query.dayOfWeek !== undefined && s.dayOfWeek !== undefined && String(s.dayOfWeek) !== String(query.dayOfWeek)) {
      return false;
    }
    return true;
  });

  if (roomSlots.length === 0) {
    return { hasConflict: false };
  }

  // Compute session blocks with boundaries
  const blocks = groupSlotsIntoContiguousBlocks(roomSlots, config);

  for (const block of blocks) {
    // 1. Direct core overlap with active lesson block
    // Strict interval check: startA < endB && endA > startB
    if (qStartM < block.endMinutes && qEndM > block.startMinutes) {
      // If same teacher and appending back-to-back inside the block
      const isSameTeacher = query.teacherId && block.teacherId && query.teacherId === block.teacherId;
      // If it strictly overlaps with an existing slot inside the block:
      const slotOverlap = block.slots.find(s => {
        const sStart = timeStringToMinutes(s.startTime);
        const sEnd = getSlotEndMinutes(s);
        return qStartM < sEnd && qEndM > sStart;
      });

      if (slotOverlap) {
        const studentInfo = slotOverlap.studentName ? ` durch ${slotOverlap.studentName}` : '';
        const teacherInfo = block.teacherName ? ` (${block.teacherName})` : '';
        return {
          hasConflict: true,
          conflictType: 'direct_overlap',
          conflictingSlot: slotOverlap,
          conflictingBlock: block,
          conflictMessage: `Raum bereits belegt${studentInfo}${teacherInfo} von ${slotOverlap.startTime} bis ${minutesToTimeString(getSlotEndMinutes(slotOverlap))} Uhr.`
        };
      }

      if (!isSameTeacher) {
        return {
          hasConflict: true,
          conflictType: 'direct_overlap',
          conflictingBlock: block,
          conflictMessage: `Raum ist von ${block.startTime} bis ${block.endTime} Uhr durch ${block.teacherName || 'eine andere Lehrkraft'} belegt.`
        };
      }
    }

    // 2. Buffer before first appointment (e.g. 13:45 - 14:00)
    if (block.effectiveStartMinutes < block.startMinutes) {
      const bufStart = block.effectiveStartMinutes;
      const bufEnd = block.startMinutes;
      if (qStartM < bufEnd && qEndM > bufStart) {
        // If the query is from the SAME teacher starting earlier, it extends the block cleanly
        if (query.teacherId && block.teacherId && query.teacherId === block.teacherId) {
          continue;
        }
        return {
          hasConflict: true,
          conflictType: 'buffer_before',
          conflictingBlock: block,
          conflictMessage: `Kollision mit dem ${config.bufferBeforeMinutes}-Minuten-Rüstpuffer (${minutesToTimeString(bufStart)} - ${minutesToTimeString(bufEnd)} Uhr) vor Beginn des Unterrichtsblocks${block.teacherName ? ` von ${block.teacherName}` : ''}.`
        };
      }
    }

    // 3. Buffer after last appointment (e.g. 16:15 - 16:30)
    if (block.effectiveEndMinutes > block.endMinutes) {
      const bufStart = block.endMinutes;
      const bufEnd = block.effectiveEndMinutes;
      if (qStartM < bufEnd && qEndM > bufStart) {
        // If the query is from the SAME teacher appending later, it extends the block cleanly
        if (query.teacherId && block.teacherId && query.teacherId === block.teacherId) {
          continue;
        }
        return {
          hasConflict: true,
          conflictType: 'buffer_after',
          conflictingBlock: block,
          conflictMessage: `Kollision mit dem ${config.bufferAfterMinutes}-Minuten-Nachbereitungspuffer (${minutesToTimeString(bufStart)} - ${minutesToTimeString(bufEnd)} Uhr) nach Unterrichtsende${block.teacherName ? ` von ${block.teacherName}` : ''}.`
        };
      }
    }
  }

  return { hasConflict: false };
}
