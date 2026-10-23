/**
 * 🏛️ Campus-Groovelab 0,1% Goldstandard Room Block Buffer Engine Tests
 * apps/groovelab/src/tests/test_room_block_buffer_engine.ts
 */

import {
  groupSlotsIntoContiguousBlocks,
  checkRoomBlockCollision,
  timeStringToMinutes,
  minutesToTimeString,
  DEFAULT_ROOM_BUFFER_CONFIG,
  RoomSlot
} from '../utils/roomBlockBufferEngine';

function assert(description: string, condition: boolean) {
  if (!condition) {
    console.error(`❌ FAILED: ${description}`);
    throw new Error(`Assertion failed: ${description}`);
  }
  console.log(`✅ PASSED: ${description}`);
}

console.log('--- TEST 1: TIME CONVERSION HELPER ---');
assert('14:00 to minutes is 840', timeStringToMinutes('14:00') === 840);
assert('14:45 to minutes is 885', timeStringToMinutes('14:45') === 885);
assert('Minutes 840 back to 14:00', minutesToTimeString(840) === '14:00');
assert('Minutes 885 back to 14:45', minutesToTimeString(885) === '14:45');

console.log('\n--- TEST 2: CONTIGUOUS SESSION BLOCK CLUSTERING ---');
const teacherSlots: RoomSlot[] = [
  { id: '1', startTime: '14:00', endTime: '14:45', teacherId: 'teacher-1', teacherName: 'Max', roomId: 'room-a' },
  { id: '2', startTime: '14:45', endTime: '15:30', teacherId: 'teacher-1', teacherName: 'Max', roomId: 'room-a' },
  { id: '3', startTime: '15:30', endTime: '16:15', teacherId: 'teacher-1', teacherName: 'Max', roomId: 'room-a' }
];

const blocks = groupSlotsIntoContiguousBlocks(teacherSlots, DEFAULT_ROOM_BUFFER_CONFIG);
assert('Exactly 1 continuous block formed for 3 back-to-back lessons', blocks.length === 1);
assert('Block starts at 14:00', blocks[0].startTime === '14:00');
assert('Block ends at 16:15', blocks[0].endTime === '16:15');
assert('Effective start with 15m buffer is 13:45', blocks[0].effectiveStartTime === '13:45');
assert('Effective end with 15m buffer is 16:30', blocks[0].effectiveEndTime === '16:30');

console.log('\n--- TEST 3: COLLISION DETECTION WITH PREPARATION & CLEANUP BUFFER ---');
// A. Foreign booking attempts to book during preparation buffer (13:30 - 14:00)
const bufferBeforeCheck = checkRoomBlockCollision(
  { startTime: '13:30', endTime: '14:00', roomId: 'room-a' },
  teacherSlots,
  DEFAULT_ROOM_BUFFER_CONFIG
);
assert('Booking in 13:30-14:00 triggers buffer_before collision', bufferBeforeCheck.hasConflict && bufferBeforeCheck.conflictType === 'buffer_before');
console.log('   Message:', bufferBeforeCheck.conflictMessage);

// B. Foreign booking before preparation buffer (13:00 - 13:45) -> Exact boundary touching
const touchingBeforeCheck = checkRoomBlockCollision(
  { startTime: '13:00', endTime: '13:45', roomId: 'room-a' },
  teacherSlots,
  DEFAULT_ROOM_BUFFER_CONFIG
);
assert('Booking ending exactly at 13:45 has NO conflict (boundary immunity)', !touchingBeforeCheck.hasConflict);

// C. Foreign booking attempts to book during cleanup buffer (16:15 - 16:30)
const bufferAfterCheck = checkRoomBlockCollision(
  { startTime: '16:15', endTime: '16:45', roomId: 'room-a' },
  teacherSlots,
  DEFAULT_ROOM_BUFFER_CONFIG
);
assert('Booking starting at 16:15 triggers buffer_after collision', bufferAfterCheck.hasConflict && bufferAfterCheck.conflictType === 'buffer_after');
console.log('   Message:', bufferAfterCheck.conflictMessage);

// D. Foreign booking after cleanup buffer (16:30 - 17:15) -> Exact boundary touching
const touchingAfterCheck = checkRoomBlockCollision(
  { startTime: '16:30', endTime: '17:15', roomId: 'room-a' },
  teacherSlots,
  DEFAULT_ROOM_BUFFER_CONFIG
);
assert('Booking starting exactly at 16:30 has NO conflict (boundary immunity)', !touchingAfterCheck.hasConflict);

console.log('\n--- ALL UNIT TESTS COMPLETED SUCCESSFULLY ---');
