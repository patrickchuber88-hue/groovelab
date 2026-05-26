import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'https://supabase.178.105.10.2.sslip.io';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface ScheduleProposal {
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  dayOfWeek: number;
  timeSlot: string;
  status: 'matched' | 'sticker';
  label: string;
  roomId: string | null;
  roomName: string | null;
}

export async function calculateScheduleHandler(req: Request, res: Response): Promise<void> {
  try {
    // 1. Authenticate user and verify admin rights
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Authorization header is missing.' });
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      res.status(401).json({ error: 'Unauthorized or invalid token.' });
      return;
    }

    // Verify admin role to run the matching engine for the school
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile || userProfile.role !== 'admin') {
      res.status(403).json({ error: 'Access forbidden. Only administrators can calculate the schedule.' });
      return;
    }

    const schoolId = userProfile.school_id;
    if (!schoolId) {
      res.status(400).json({ error: 'Administrator is not associated with a school.' });
      return;
    }

    // 2. Fetch all teachers and students of the school
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name, role, teacher_id, is_app_user, instrument')
      .eq('school_id', schoolId)
      .in('role', ['teacher', 'student']);

    if (usersError || !allUsers) {
      res.status(500).json({ error: 'Failed to fetch users.', details: usersError?.message });
      return;
    }

    const teachers = allUsers.filter(u => u.role === 'teacher');
    const students = allUsers.filter(u => u.role === 'student');

    if (teachers.length === 0) {
      res.status(400).json({ error: 'No teachers found in the school to schedule.' });
      return;
    }

    // 3. Fetch rooms and allowed instruments (Instrumenten-Raum-Matrix)
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('id, name, allowed_instruments')
      .eq('school_id', schoolId);

    if (roomsError) {
      res.status(500).json({ error: 'Failed to fetch rooms for the matrix.', details: roomsError.message });
      return;
    }

    const schoolRooms = rooms || [];

    // 4. Fetch all weekly availabilities for the school users
    const userIds = allUsers.map(u => u.id);
    const { data: availabilities, error: availError } = await supabase
      .from('user_availability')
      .select('user_id, day_of_week, time_slot')
      .in('user_id', userIds);

    if (availError || !availabilities) {
      res.status(500).json({ error: 'Failed to fetch availabilities.', details: availError?.message });
      return;
    }

    // Group availabilities by user_id
    const availMap: Record<string, { day: number; slot: string }[]> = {};
    availabilities.forEach(av => {
      if (!availMap[av.user_id]) {
        availMap[av.user_id] = [];
      }
      availMap[av.user_id].push({
        day: av.day_of_week,
        slot: av.time_slot
      });
    });

    const proposals: ScheduleProposal[] = [];
    const assignedSlots = new Set<string>(); // Keep track of "teacher_id-day-time_slot" to avoid conflicts
    const roomAssignedSlots = new Set<string>(); // Keep track of "room_id-day-time_slot" to avoid conflicts

    // Helper to get formatted keys
    const getSlotKey = (teacherId: string, day: number, slot: string) => `${teacherId}-${day}-${slot}`;
    const getRoomSlotKey = (roomId: string, day: number, slot: string) => `${roomId}-${day}-${slot}`;

    // Helper to find a room compatible with the student's instrument at a given day/time slot
    const findCompatibleRoom = (studentInstrument: string, day: number, slot: string): { id: string; name: string } | null => {
      const formattedInstrument = (studentInstrument || '').trim().toLowerCase();
      
      for (const room of schoolRooms) {
        const allowed = (room.allowed_instruments || []).map((ins: string) => ins.toLowerCase());
        
        // If room allows this instrument
        if (allowed.includes(formattedInstrument)) {
          const roomSlotKey = getRoomSlotKey(room.id, day, slot);
          if (!roomAssignedSlots.has(roomSlotKey)) {
            return { id: room.id, name: room.name };
          }
        }
      }
      return null;
    };

    // 5. Run Matching Algorithm (USP 3 - 80/20 Match-Engine)
    for (const student of students) {
      const teacherId = student.teacher_id;
      if (!teacherId) continue;

      const teacher = teachers.find(t => t.id === teacherId);
      if (!teacher) continue;

      const teacherName = `${teacher.first_name} ${teacher.last_name}`;
      const studentName = `${student.first_name} ${student.last_name}`;
      const studentInstrument = student.instrument || 'Klavier';

      const studentAvails = availMap[student.id] || [];
      const teacherAvails = availMap[teacherId] || [];

      // Case A: Student has entered availabilities
      if (studentAvails.length > 0) {
        let assigned = false;

        // Find intersection of slots between student and teacher
        const matches = studentAvails.filter(sa =>
          teacherAvails.some(ta => ta.day === sa.day && ta.slot === sa.slot)
        );

        matches.sort((a, b) => a.day - b.day || a.slot.localeCompare(b.slot));

        for (const match of matches) {
          const slotKey = getSlotKey(teacherId, match.day, match.slot);
          
          if (!assignedSlots.has(slotKey)) {
            // Find a room according to the instrument matrix
            const compatibleRoom = findCompatibleRoom(studentInstrument, match.day, match.slot);
            if (compatibleRoom) {
              assignedSlots.add(slotKey);
              roomAssignedSlots.add(getRoomSlotKey(compatibleRoom.id, match.day, match.slot));
              
              proposals.push({
                studentId: student.id,
                studentName,
                teacherId,
                teacherName,
                dayOfWeek: match.day,
                timeSlot: match.slot,
                status: 'matched',
                label: 'Automatisch zugeteilt (Wunschzeit & Raum Übereinstimmung)',
                roomId: compatibleRoom.id,
                roomName: compatibleRoom.name
              });
              assigned = true;
              break;
            }
          }
        }

        // If no mutual matches with free room were found, look for any free teacher availability slot
        if (!assigned) {
          teacherAvails.sort((a, b) => a.day - b.day || a.slot.localeCompare(b.slot));
          for (const ta of teacherAvails) {
            const slotKey = getSlotKey(teacherId, ta.day, ta.slot);
            if (!assignedSlots.has(slotKey)) {
              const compatibleRoom = findCompatibleRoom(studentInstrument, ta.day, ta.slot);
              if (compatibleRoom) {
                assignedSlots.add(slotKey);
                roomAssignedSlots.add(getRoomSlotKey(compatibleRoom.id, ta.day, ta.slot));
                
                proposals.push({
                  studentId: student.id,
                  studentName,
                  teacherId,
                  teacherName,
                  dayOfWeek: ta.day,
                  timeSlot: ta.slot,
                  status: 'matched',
                  label: 'Alternativ zugeteilt (Freier Raum & Lehrer-Slot)',
                  roomId: compatibleRoom.id,
                  roomName: compatibleRoom.name
                });
                assigned = true;
                break;
              }
            }
          }
        }

        // If even the teacher/rooms have no slots left, report conflict
        if (!assigned) {
          proposals.push({
            studentId: student.id,
            studentName,
            teacherId,
            teacherName,
            dayOfWeek: 0,
            timeSlot: 'Kein freier Slot',
            status: 'matched',
            label: 'Konflikt: Kein passender freier Raum/Lehrer-Slot!',
            roomId: null,
            roomName: null
          });
        }
      } 
      // Case B: Student has NO availabilities entered (e.g. parent link pending)
      else {
        let assigned = false;
        
        teacherAvails.sort((a, b) => a.day - b.day || a.slot.localeCompare(b.slot));
        for (const ta of teacherAvails) {
          const slotKey = getSlotKey(teacherId, ta.day, ta.slot);
          if (!assignedSlots.has(slotKey)) {
            const compatibleRoom = findCompatibleRoom(studentInstrument, ta.day, ta.slot);
            if (compatibleRoom) {
              assignedSlots.add(slotKey);
              roomAssignedSlots.add(getRoomSlotKey(compatibleRoom.id, ta.day, ta.slot));
              
              proposals.push({
                studentId: student.id,
                studentName,
                teacherId,
                teacherName,
                dayOfWeek: ta.day,
                timeSlot: ta.slot,
                status: 'sticker',
                label: student.is_app_user 
                  ? 'Sticker: App-Registrierung ausstehend' 
                  : 'Sticker: Eltern-Rückmeldung ausstehend (Reserviert)',
                roomId: compatibleRoom.id,
                roomName: compatibleRoom.name
              });
              assigned = true;
              break;
            }
          }
        }

        if (!assigned) {
          proposals.push({
            studentId: student.id,
            studentName,
            teacherId,
            teacherName,
            dayOfWeek: 0,
            timeSlot: 'Kein freier Slot',
            status: 'sticker',
            label: 'Konflikt: Reservierung mangels freien Räumen/Lehrer-Slots fehlgeschlagen',
            roomId: null,
            roomName: null
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Schedule matching proposals calculated successfully with Room-Instrument Matrix.',
      proposals,
      metrics: {
        totalStudents: students.length,
        scheduled: proposals.filter(p => p.dayOfWeek > 0).length,
        conflicts: proposals.filter(p => p.dayOfWeek === 0).length
      }
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}

/**
 * Controller 2: LEHRER-FINETUNING & REVIEW-STATUS (submit-schedule-by-teacher)
 * POST-Endpunkt: /api/schedule/submit
 * Schaltet den Stundenplan-Status auf 'ready_for_admin_review' und triggert einen Alert.
 */
export async function submitScheduleByTeacherHandler(req: Request, res: Response): Promise<void> {
  try {
    // 1. Authenticate user and verify they are a teacher
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Authorization header is missing.' });
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      res.status(401).json({ error: 'Unauthorized or invalid token.' });
      return;
    }

    // Verify role is teacher
    const { data: teacherProfile, error: profileError } = await supabase
      .from('users')
      .select('id, school_id, role, first_name, last_name')
      .eq('id', user.id)
      .single();

    if (profileError || !teacherProfile || teacherProfile.role !== 'teacher') {
      res.status(403).json({ error: 'Access forbidden. Only teachers can submit schedules for review.' });
      return;
    }

    const schoolId = teacherProfile.school_id;
    if (!schoolId) {
      res.status(400).json({ error: 'Teacher is not associated with any school.' });
      return;
    }

    // 2. Set all 'draft' status schedules of this teacher's students to 'ready_for_admin_review'
    // Update query
    const { error: updateError } = await supabase
      .from('schedules')
      .update({ status: 'ready_for_admin_review' })
      .eq('school_id', schoolId)
      .eq('teacher_id', teacherProfile.id)
      .eq('status', 'draft');

    if (updateError) {
      res.status(500).json({ error: 'Failed to update schedule status in database.', details: updateError.message });
      return;
    }

    // 3. Create a review request alert for the secretary (Ebene 2)
    const alertMessage = `Stundenplan-Review: Lehrkraft ${teacherProfile.first_name} ${teacherProfile.last_name} (ID: ${teacherProfile.id}) hat die 80/20 Match-Korrekturen abgeschlossen und den Stundenplan zur Überprüfung freigegeben.`;
    
    const { error: alertError } = await supabase
      .from('system_alerts')
      .insert({
        school_id: schoolId,
        teacher_id: teacherProfile.id,
        type: 'Schedule Review Request',
        message: alertMessage,
        resolved: false
      });

    if (alertError) {
      console.error('Failed to log Schedule Review Alert:', alertError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Schedule successfully submitted for admin review.',
      teacher: {
        id: teacherProfile.id,
        name: `${teacherProfile.first_name} ${teacherProfile.last_name}`
      }
    });

  } catch (err: any) {
    console.error('Error in submitScheduleByTeacherHandler:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}

/**
 * Controller 3: ABSAGE-TRIGGER BY STUDENT
 * POST-Endpunkt: /api/schedule/cancel
 * Sagt eine Unterrichtsstunde ab und setzt den Status auf 'canceled_by_student' (Freislot).
 */
export async function cancelScheduleByStudentHandler(req: Request, res: Response): Promise<void> {
  try {
    const { scheduleId, studentId } = req.body;
    if (!scheduleId || !studentId) {
      res.status(400).json({ error: 'scheduleId and studentId are required.' });
      return;
    }

    // Update schedule state
    const { data, error } = await supabase
      .from('schedules')
      .update({ status: 'canceled_by_student' })
      .eq('id', scheduleId)
      .eq('student_id', studentId)
      .select('*');

    if (error) {
      res.status(500).json({ error: 'Failed to cancel schedule.', details: error.message });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Unterricht wurde erfolgreich abgesagt. Der Slot ist nun als Freislot freigegeben.',
      schedule: data
    });
  } catch (err: any) {
    console.error('Error in cancelScheduleByStudentHandler:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}

/**
 * Controller 4: DRAG-AND-DROP SWAP-ENGINE MIT AMPELPRINZIP
 * POST-Endpunkt: /api/schedule/swap
 * Prüft Verfügbarkeiten und die Instrumenten-Raum-Matrix. Führt entweder direkten Tausch (GRÜN) oder Push-Anfrage (GELB) aus, oder blockiert (ROT).
 */
export async function swapScheduleHandler(req: Request, res: Response): Promise<void> {
  try {
    const { scheduleId, targetTimeSlot, targetDayOfWeek, targetRoomId } = req.body;
    if (!scheduleId || !targetTimeSlot || targetDayOfWeek === undefined || !targetRoomId) {
      res.status(400).json({ error: 'scheduleId, targetTimeSlot, targetDayOfWeek, and targetRoomId are required.' });
      return;
    }

    // 1. Fetch current schedule and student details
    const { data: schedule, error: schedError } = await supabase
      .from('schedules')
      .select(`
        id,
        school_id,
        teacher_id,
        student_id,
        day_of_week,
        time_slot,
        room_id,
        student:users!schedules_student_id_fkey (id, instrument, first_name, last_name)
      `)
      .eq('id', scheduleId)
      .single();

    if (schedError || !schedule) {
      res.status(404).json({ error: 'Schedule not found.' });
      return;
    }

    const student = (schedule as any).student;
    const studentInstrument = student?.instrument || 'Klavier';

    // 2. Room Matrix Validation (allowed_instruments)
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, name, allowed_instruments')
      .eq('id', targetRoomId)
      .single();

    if (roomError || !room) {
      res.status(400).json({ 
        success: false, 
        color: 'RED', 
        error: 'Ziel-Raum existiert nicht oder ist ungültig.' 
      });
      return;
    }

    const allowed = (room.allowed_instruments || []).map((i: string) => i.toLowerCase());
    const formattedInstrument = studentInstrument.trim().toLowerCase();
    
    // Check if room supports student's instrument
    const supportsInstrument = allowed.includes(formattedInstrument) || 
                               allowed.includes(studentInstrument.toLowerCase()) || 
                               allowed.length === 0; // Empty means all allowed for fallback

    if (!supportsInstrument) {
      res.status(200).json({
        success: false,
        color: 'RED',
        message: `Raum-Kollision: ${room.name} erlaubt das Instrument '${studentInstrument}' nicht. Drop blockiert (Bypass-Schutz).`
      });
      return;
    }

    // 3. Collision Validation (teacher occupancy or room occupancy)
    const { data: conflicts, error: conflictError } = await supabase
      .from('schedules')
      .select('id, teacher_id, room_id, status')
      .eq('day_of_week', targetDayOfWeek)
      .eq('time_slot', targetTimeSlot)
      .neq('id', scheduleId)
      .neq('status', 'canceled_by_student'); // Ignore canceled slots

    if (conflictError) {
      res.status(500).json({ error: 'Error validating collisions.', details: conflictError.message });
      return;
    }

    // Check if teacher is busy or room is busy in target slot
    const teacherBusy = conflicts.some(c => c.teacher_id === schedule.teacher_id);
    const roomBusy = conflicts.some(c => c.room_id === targetRoomId);

    if (teacherBusy || roomBusy) {
      res.status(200).json({
        success: false,
        color: 'RED',
        message: 'Kollision: Die Lehrkraft oder der Raum ist im Ziel-Slot bereits belegt. Drop blockiert.'
      });
      return;
    }

    // 4. Availability check (Traffic Light Matrix)
    const { data: availability, error: availError } = await supabase
      .from('user_availability')
      .select('id')
      .eq('user_id', schedule.student_id)
      .eq('day_of_week', targetDayOfWeek)
      .eq('time_slot', targetTimeSlot)
      .maybeSingle();

    if (availError) {
      res.status(500).json({ error: 'Error checking availability.', details: availError.message });
      return;
    }

    const isAvailable = !!availability;

    if (isAvailable) {
      // GREEN: direct swap
      const { error: updateError } = await supabase
        .from('schedules')
        .update({
          day_of_week: targetDayOfWeek,
          time_slot: targetTimeSlot,
          room_id: targetRoomId,
          status: 'approved' // Automatically approved
        })
        .eq('id', scheduleId);

      if (updateError) {
        res.status(500).json({ error: 'Failed to update schedule.', details: updateError.message });
        return;
      }

      res.status(200).json({
        success: true,
        color: 'GREEN',
        message: 'Tausch erfolgreich: Slot liegt in den Verfügbarkeiten des Schülers und verletzt keine Raum-Matrix.',
        schedule: { ...schedule, day_of_week: targetDayOfWeek, time_slot: targetTimeSlot, room_id: targetRoomId }
      });
    } else {
      // YELLOW: outside availabilities, needs parent approval
      const { error: updateError } = await supabase
        .from('schedules')
        .update({
          day_of_week: targetDayOfWeek,
          time_slot: targetTimeSlot,
          room_id: targetRoomId,
          status: 'pending_parent_approval' // Triggers parent push request
        })
        .eq('id', scheduleId);

      if (updateError) {
        res.status(500).json({ error: 'Failed to update schedule to pending.', details: updateError.message });
        return;
      }

      // In production, trigger push notifications to parents.
      // Mocked here by returning the status.
      res.status(200).json({
        success: true,
        color: 'YELLOW',
        message: 'Push-Anfrage gesendet: Slot liegt außerhalb der Standard-Verfügbarkeiten. Warte auf Bestätigung der Eltern.',
        schedule: { ...schedule, day_of_week: targetDayOfWeek, time_slot: targetTimeSlot, room_id: targetRoomId, status: 'pending_parent_approval' }
      });
    }
  } catch (err: any) {
    console.error('Error in swapScheduleHandler:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}

/**
 * Controller 5: LEHRER-KRANKHEITS-BYPASS & AUTOMATISIERTER ALARM-FLOW
 * POST-Endpunkt: /api/teacher/sick
 * Setzt den Status aller heutigen Stunden auf 'teacher_sick', meldet dies ans Sekretariat und benachrichtigt Eltern.
 */
export async function reportTeacherIllnessHandler(req: Request, res: Response): Promise<void> {
  try {
    const { teacherId, pin } = req.body;
    if (!teacherId || !pin) {
      res.status(400).json({ error: 'teacherId and pin are required.' });
      return;
    }

    // 1. Verify Teacher PIN (ausweis_nummer in users table)
    const { data: teacher, error: teacherError } = await supabase
      .from('users')
      .select('id, first_name, last_name, school_id, role, ausweis_nummer')
      .eq('id', teacherId)
      .single();

    if (teacherError || !teacher) {
      res.status(404).json({ error: 'Teacher not found.' });
      return;
    }

    if (teacher.role !== 'teacher') {
      res.status(403).json({ error: 'Only teachers can report illness.' });
      return;
    }

    // Verify PIN
    if (teacher.ausweis_nummer !== pin) {
      res.status(401).json({ error: 'Invalid PIN. Access denied.' });
      return;
    }

    // Determine current weekday (1-7) for today's lesson filters
    const rawDay = new Date().getDay();
    const todayWeekday = rawDay === 0 ? 7 : rawDay;

    // 2. Set status of all today's lessons of this teacher to 'teacher_sick'
    const { data: updatedSchedules, error: updateError } = await supabase
      .from('schedules')
      .update({ status: 'teacher_sick' })
      .eq('teacher_id', teacherId)
      .eq('day_of_week', todayWeekday)
      .select('id, student_id, users!schedules_student_id_fkey(first_name, last_name)');

    if (updateError) {
      res.status(500).json({ error: 'Failed to update schedules status.', details: updateError.message });
      return;
    }

    // 3. Insert HIGH PRIORITY Alert into 'system_alerts' for the Secretary
    const alertMessage = `🚨 LEHRER-KRANKHEIT: Lehrkraft ${teacher.first_name} ${teacher.last_name} hat sich für heute krankgemeldet. ${updatedSchedules?.length || 0} Unterrichtsstunden entfallen.`;
    
    const { error: alertError } = await supabase
      .from('system_alerts')
      .insert({
        school_id: teacher.school_id,
        teacher_id: teacherId,
        type: 'Teacher Illness Alert',
        message: alertMessage,
        resolved: false
      });

    if (alertError) {
      console.error('Failed to log illness alert:', alertError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Krankheitsmeldung erfolgreich registriert. Unterrichtsstunden storniert und Sekretariatsalarm ausgelöst.',
      affectedSchedulesCount: updatedSchedules?.length || 0
    });
  } catch (err: any) {
    console.error('Error in reportTeacherIllnessHandler:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
