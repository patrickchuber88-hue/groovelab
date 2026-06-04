import { createClient } from '@supabase/supabase-js';

const url = "https://supabase.campus-groovelab.de";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc";
const supabase = createClient(url, key);

async function run() {
  const { data: user, error } = await supabase
    .from('users')
    .select('planned_boards')
    .eq('id', '03564b1c-e2bb-4ccb-be95-b9fd1ef34829')
    .single();

  if (error) {
    console.error("Error:", error);
    return;
  }

  const boards = user.planned_boards || [];
  console.log(`Patrick Huber has ${boards.length} planned boards.`);

  // Collect all student IDs from the boards
  const studentIds = [];
  for (const board of boards) {
    if (board.students) {
      for (const student of board.students) {
        if (student.id && !student.isBreak) {
          studentIds.push(student.id);
        }
      }
    }
  }

  console.log(`Found ${studentIds.length} student references in planned boards.`);

  if (studentIds.length === 0) return;

  // Query all these students' statuses
  const { data: students, error: studentsError } = await supabase
    .from('users')
    .select('id, first_name, last_name, is_campus_active, is_groovelab_active')
    .in('id', studentIds);

  if (studentsError) {
    console.error("Error fetching students:", studentsError);
    return;
  }

  const studentMap = {};
  for (const s of students) {
    studentMap[s.id] = s;
  }

  // Go through each board and analyze the students
  for (let i = 0; i < boards.length; i++) {
    const board = boards[i];
    console.log(`\nBoard ${i + 1}: DayOfWeek=${board.dayOfWeek}, Start=${board.startAnchor}, RoomID=${board.roomId}`);
    
    if (board.students && board.students.length > 0) {
      for (const sRef of board.students) {
        if (sRef.isBreak) {
          console.log(`  - Break (${sRef.duration} mins)`);
          continue;
        }
        const sDb = studentMap[sRef.id];
        if (!sDb) {
          console.log(`  - Student ID ${sRef.id} not found in DB! Name in board: ${sRef.first_name} ${sRef.last_name}`);
        } else {
          console.log(`  - Student: ${sDb.first_name} ${sDb.last_name} | Campus Active: ${sDb.is_campus_active} | GrooveLab Active: ${sDb.is_groovelab_active}`);
        }
      }
    } else {
      console.log("  - Empty board");
    }
  }
}

run();
