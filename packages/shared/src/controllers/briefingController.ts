import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'https://supabase.178.105.10.2.sslip.io';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Helper to check the global messaging policy ("THE MUTED WALL").
 * Returns false if allow_messages_global is false in the school settings.
 */
async function checkAllowMessagesGlobal(schoolId: string): Promise<boolean> {
  if (!schoolId) return true;
  try {
    const { data, error } = await supabase
      .from('schools')
      .select('allow_messages_global')
      .eq('id', schoolId)
      .single();
    if (error || !data) {
      return true;
    }
    return data.allow_messages_global ?? true;
  } catch (err) {
    return true;
  }
}

/**
 * Sanitizes free-text fields based on the messaging policy.
 */
function sanitizeText(text: string | null | undefined, allowMessages: boolean, fallback: string = ''): string {
  if (!allowMessages) {
    return '[SYSTEM: Nachrichten global stummgeschaltet]';
  }
  return text || fallback;
}

/**
 * 1. SEKRETARIAT-BRIEFING (/api/briefing/secretary)
 */
export async function getSecretaryBriefingHandler(req: Request, res: Response): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    let schoolId = (req.query.schoolId || req.body.schoolId) as string;
    let userId = (req.query.userId || req.body.userId) as string;

    // Optional authentication check
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
      }
    }

    if (userId && !schoolId) {
      const { data: profile } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', userId)
        .single();
      if (profile) {
        schoolId = profile.school_id;
      }
    }

    if (!schoolId) {
      res.status(400).json({ error: 'School ID is required for secretary briefing.' });
      return;
    }

    const allowMessages = await checkAllowMessagesGlobal(schoolId);

    // * Count of unresolved Capacity Overrun Alerts
    const { count: overrunAlertsCount, error: alertsErr } = await supabase
      .from('system_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('type', 'capacity_overrun')
      .eq('resolved', false);

    if (alertsErr) {
      res.status(500).json({ error: 'Failed to fetch capacity alerts.', details: alertsErr.message });
      return;
    }

    // * Count of teachers in inactive status (is_active = false)
    const { count: inactiveTeachersCount, error: teachersErr } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('role', 'teacher')
      .eq('is_active', false);

    if (teachersErr) {
      res.status(500).json({ error: 'Failed to fetch inactive teachers.', details: teachersErr.message });
      return;
    }

    // * Status overview of schedules (draft vs ready_for_admin_review)
    const { data: schedules, error: schedulesErr } = await supabase
      .from('schedules')
      .select('status')
      .eq('school_id', schoolId);

    if (schedulesErr) {
      res.status(500).json({ error: 'Failed to fetch schedule statuses.', details: schedulesErr.message });
      return;
    }

    let draftCount = 0;
    let readyForReviewCount = 0;
    let approvedCount = 0;

    if (schedules) {
      schedules.forEach((sch) => {
        if (sch.status === 'draft') draftCount++;
        else if (sch.status === 'ready_for_admin_review') readyForReviewCount++;
        else if (sch.status === 'approved') approvedCount++;
      });
    }

    // Unresolved alerts detailed lists (sanitized if muted)
    const { data: detailedAlerts } = await supabase
      .from('system_alerts')
      .select('id, type, message, created_at')
      .eq('school_id', schoolId)
      .eq('resolved', false)
      .limit(10);

    const sanitizedAlerts = (detailedAlerts || []).map((alert) => ({
      ...alert,
      message: sanitizeText(alert.message, allowMessages, 'Benachrichtigung')
    }));

    res.status(200).json({
      success: true,
      allowMessagesGlobal: allowMessages,
      metrics: {
        openCapacityAlerts: overrunAlertsCount || 0,
        inactiveTeachers: inactiveTeachersCount || 0,
        schedules: {
          draft: draftCount,
          readyForReview: readyForReviewCount,
          approved: approvedCount
        }
      },
      alerts: sanitizedAlerts
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}

/**
 * 2. LEHRER-BRIEFING (/api/briefing/teacher)
 */
export async function getTeacherBriefingHandler(req: Request, res: Response): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    let userId = (req.query.userId || req.body.userId) as string;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
      }
    }

    if (!userId) {
      res.status(400).json({ error: 'User ID (teacher) is required.' });
      return;
    }

    // Fetch teacher profile
    const { data: teacher, error: teacherErr } = await supabase
      .from('users')
      .select('id, school_id, first_name, last_name, role')
      .eq('id', userId)
      .single();

    if (teacherErr || !teacher || teacher.role !== 'teacher') {
      res.status(404).json({ error: 'Teacher profile not found or role is incorrect.' });
      return;
    }

    const schoolId = teacher.school_id;
    const allowMessages = await checkAllowMessagesGlobal(schoolId);

    // Determine current day of week (1 = Monday, ..., 7 = Sunday)
    // Javascript's Date.getDay() returns 0 for Sunday, 1 for Monday, etc.
    const rawDay = new Date().getDay();
    const todayWeekday = rawDay === 0 ? 7 : rawDay;

    // Fetch schedules for today for this teacher
    const { data: slots, error: slotsErr } = await supabase
      .from('schedules')
      .select(`
        id,
        time_slot,
        status,
        day_of_week,
        rooms (id, name),
        student:users!schedules_student_id_fkey (
          id,
          first_name,
          last_name,
          is_app_user,
          is_premium_user,
          instrument,
          birth_date,
          avatars (avatar_style, evolution_level, xp, streak_flame)
        )
      `)
      .eq('teacher_id', userId)
      .eq('day_of_week', todayWeekday);

    if (slotsErr) {
      res.status(500).json({ error: 'Failed to fetch schedule slots.', details: slotsErr.message });
      return;
    }

    const todayStr = new Date().toISOString().substring(0, 10);

    // Fetch occurrences for today for this teacher
    const { data: occurrences } = await supabase
      .from('schedule_occurrences')
      .select(`
        id,
        date,
        original_date,
        start_time,
        status,
        schedule_id,
        student_id,
        schedules (
          rooms (id, name)
        ),
        student:users!schedule_occurrences_student_id_fkey (
          id,
          first_name,
          last_name,
          is_app_user,
          is_premium_user,
          instrument,
          birth_date,
          avatars (avatar_style, evolution_level, xp, streak_flame)
        )
      `)
      .eq('teacher_id', userId)
      .or(`date.eq.${todayStr},original_date.eq.${todayStr}`);

    // Format regular schedules
    let timeline = (slots || []).map((slot: any) => {
      const student = slot.student;
      const avatar = student?.avatars?.[0] || null;
      const isPremium = student?.is_premium_user ?? false;
      const isAnalogStickerUser = !student?.is_app_user || !isPremium || avatar?.avatar_style === 'Standard_Silhouette';

      return {
        scheduleId: slot.id,
        timeSlot: slot.time_slot,
        status: slot.status,
        roomId: slot.rooms?.id || null,
        room: slot.rooms?.name || 'Hauptraum',
        instrument: student?.instrument || 'Klavier',
        student: student ? {
          id: student.id,
          name: `${student.first_name} ${student.last_name}`,
          isAppUser: student.is_app_user ?? false,
          isAnalogStickerUser,
          birthDate: student.birth_date,
          streakFlame: avatar?.streak_flame || 0
        } : null
      };
    });

    // Merge with occurrences for today
    if (occurrences && occurrences.length > 0) {
      occurrences.forEach((occ: any) => {
        const student = occ.student;
        const avatar = student?.avatars?.[0] || null;
        const isPremium = student?.is_premium_user ?? false;
        const isAnalogStickerUser = !student?.is_app_user || !isPremium || avatar?.avatar_style === 'Standard_Silhouette';
        const formattedTime = occ.start_time ? occ.start_time.substring(0, 5) : '00:00';
        const occStudentId = occ.student?.id || occ.student_id;

        if (occ.original_date === todayStr && occ.date !== todayStr) {
          // Rescheduled AWAY from today -> mark as rescheduled_away
          const existingIdx = timeline.findIndex((t: any) => t.student?.id === occStudentId);
          if (existingIdx !== -1) {
            timeline[existingIdx].status = 'rescheduled_away';
          }
        } else if (occ.date === todayStr) {
          // Rescheduled TO today or updated today -> update or insert into today's timeline
          const existingIdx = timeline.findIndex((t: any) => t.student?.id === occStudentId);
          const mappedItem = {
            scheduleId: occ.schedule_id || occ.id,
            timeSlot: formattedTime,
            status: occ.status === 'rescheduled_confirmed' ? 'approved' : occ.status,
            roomId: occ.schedules?.rooms?.id || null,
            room: occ.schedules?.rooms?.name || 'Hauptraum',
            instrument: student?.instrument || 'Klavier',
            student: student ? {
              id: student.id,
              name: `${student.first_name} ${student.last_name}`,
              isAppUser: student.is_app_user ?? false,
              isAnalogStickerUser,
              birthDate: student.birth_date,
              streakFlame: avatar?.streak_flame || 0
            } : null
          };

          if (occ.status === 'cancelled') {
            mappedItem.status = 'canceled_by_student';
          }

          if (existingIdx !== -1) {
            timeline[existingIdx] = mappedItem;
          } else {
            timeline.push(mappedItem);
          }
        }
      });
    }

    timeline.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));

    // Vorbereitungs-Spiegel for the NEXT upcoming student
    // For local times, extract hour and minutes
    const now = new Date();
    const currentStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Find first slot starting after current time, or fallback to first slot
    const nextSlot = timeline.find((s) => s.timeSlot >= currentStr) || timeline[0] || null;
    let prepMirror = null;

    if (nextSlot && nextSlot.student) {
      const studentId = nextSlot.student.id;
      
      // Fetch next student's avatar & practice stats
      const { data: studentAvatar } = await supabase
        .from('avatars')
        .select('evolution_level, xp, avatar_style')
        .eq('user_id', studentId)
        .maybeSingle();

      // Fetch next student's premium status
      const { data: studentUser } = await supabase
        .from('users')
        .select('is_premium_user')
        .eq('id', studentId)
        .single();
      const isPremium = studentUser?.is_premium_user ?? false;

      // Fetch progress/verified songs from last week (e.g. completed exercises or custom songs)
      const { data: recentProgress } = await supabase
        .from('user_progress')
        .select(`
          current_level,
          stage_ready_badge,
          last_updated,
          exercises (title, description)
        `)
        .eq('user_id', studentId)
        .order('last_updated', { ascending: false })
        .limit(3);

      const verifiedSongs = (recentProgress || []).map((p: any) => ({
        title: p.exercises?.title || 'Übungssong',
        status: p.stage_ready_badge ? 'verifiziert' : 'in_progress',
        level: p.current_level || 1,
        note: sanitizeText(p.exercises?.description || '', allowMessages, 'Geschützter Inhalt')
      }));

      // Fallback streak logic if not present in custom tables
      prepMirror = {
        studentId,
        studentName: nextSlot.student.name,
        timeSlot: nextSlot.timeSlot,
        streakCount: studentAvatar?.streak_flame || 0,
        evolutionLevel: isPremium ? (studentAvatar?.evolution_level || 1) : 1,
        verifiedSongs
      };
    }

    // Fetch all occurrences for this teacher in the current week to detect rescheduled appointments
    let rescheduledReminders: any[] = [];
    try {
      const startOfWeek = new Date();
      const currentDay = startOfWeek.getDay();
      const distance = currentDay === 0 ? -6 : 1 - currentDay; // distance to Monday
      const monday = new Date(startOfWeek);
      monday.setDate(startOfWeek.getDate() + distance);
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      const mondayStr = monday.toISOString().substring(0, 10);
      const sundayStr = sunday.toISOString().substring(0, 10);

      const { data: weekOccurrences } = await supabase
        .from('schedule_occurrences')
        .select(`
          id,
          date,
          original_date,
          start_time,
          status,
          student:users!schedule_occurrences_student_id_fkey (
            first_name,
            last_name
          )
        `)
        .eq('teacher_id', userId)
        .gte('date', mondayStr)
        .lte('date', sundayStr);

      if (weekOccurrences && weekOccurrences.length > 0) {
        const rescheduledUpcoming = weekOccurrences.filter((occ: any) => {
          const hasDateDiff = occ.original_date && occ.original_date !== occ.date;
          // Return only rescheduled items that are today or in the future
          return hasDateDiff && occ.date >= todayStr;
        });

        rescheduledReminders = rescheduledUpcoming.map((occ: any) => {
          const dateObj = new Date(occ.date);
          const weekdayStr = dateObj.toLocaleDateString('de-DE', { weekday: 'long' });
          const weekdayShort = dateObj.toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', '');
          const day = String(dateObj.getDate()).padStart(2, '0');
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const dateFormatted = `${day}.${month}`;
          const yearShort = dateObj.getFullYear().toString().substring(2);
          const timeFormatted = occ.start_time ? occ.start_time.substring(0, 5) : '';
          const originalDateObj = occ.original_date ? new Date(occ.original_date) : null;
          const originalWeekdayStr = originalDateObj ? originalDateObj.toLocaleDateString('de-DE', { weekday: 'long' }) : 'seinem regulären Termin';

          return {
            id: occ.id,
            studentName: `${occ.student?.first_name || ''} ${occ.student?.last_name || ''}`.trim(),
            originalWeekday: originalWeekdayStr,
            weekday: weekdayStr,
            weekdayShort,
            dateStr: dateFormatted,
            yearShort,
            time: timeFormatted
          };
        });
      }
    } catch (err) {
      console.warn('Failed to fetch rescheduled reminders', err);
    }

    res.status(200).json({
      success: true,
      allowMessagesGlobal: allowMessages,
      todayWeekday,
      timeline,
      prepMirror,
      rescheduledReminders
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}

/**
 * 3. SCHÜLER- & ELTERN-BRIEFING (/api/briefing/student)
 */
export async function getStudentBriefingHandler(req: Request, res: Response): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    let userId = (req.query.userId || req.body.userId) as string;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
      }
    }

    if (!userId) {
      res.status(400).json({ error: 'User ID (student) is required.' });
      return;
    }

    // Fetch student profile
    const { data: student, error: studentErr } = await supabase
      .from('users')
      .select('id, school_id, first_name, last_name, role, is_premium_user')
      .eq('id', userId)
      .single();

    if (studentErr || !student || student.role !== 'student') {
      res.status(404).json({ error: 'Student profile not found or role is incorrect.' });
      return;
    }

    const schoolId = student.school_id;
    const allowMessages = await checkAllowMessagesGlobal(schoolId);

    // Get today's lesson details
    const rawDay = new Date().getDay();
    const todayWeekday = rawDay === 0 ? 7 : rawDay;

    const { data: todaySchedules, error: scheduleErr } = await supabase
      .from('schedules')
      .select(`
        time_slot,
        rooms (name),
        teacher:users!schedules_teacher_id_fkey (first_name, last_name)
      `)
      .eq('student_id', userId)
      .eq('day_of_week', todayWeekday)
      .maybeSingle();

    let todayLesson = null;
    if (todaySchedules) {
      const teacherName = todaySchedules.teacher 
        ? `Herr/Frau ${todaySchedules.teacher.last_name}` 
        : 'Lehrkraft';
      todayLesson = {
        time: todaySchedules.time_slot,
        room: todaySchedules.rooms?.name || 'Unterrichtsraum',
        teacher: teacherName,
        displayString: `Heute ${todaySchedules.time_slot} Uhr, ${todaySchedules.rooms?.name || 'Raum'} bei ${teacherName}`
      };
    }

    // Fetch avatar and gamification statistics
    const { data: avatarRecord } = await supabase
      .from('avatars')
      .select('evolution_level, xp, avatar_style, instrument_type')
      .eq('user_id', userId)
      .maybeSingle();

    // Streak and XP calculations
    const currentXp = avatarRecord?.xp || 0;
    const currentLevel = avatarRecord?.evolution_level || 1;
    const milestoneTarget = 50; // every 50 XP is a new milestone/level helper
    const remainingXp = milestoneTarget - (currentXp % milestoneTarget);

    res.status(200).json({
      success: true,
      allowMessagesGlobal: allowMessages,
      todayLesson,
      gamification: {
        streakFlame: avatarRecord?.streak_flame || 0,
        evolutionLevel: student?.is_premium_user ? currentLevel : 1,
        currentXp,
        remainingXp,
        xpTargetMessage: `Noch ${remainingXp} XP bis zum heutigen Meilenstein!`,
        avatarStyle: student?.is_premium_user ? (avatarRecord?.avatar_style || 'Premium_Hero') : 'Standard_Silhouette',
        instrumentType: avatarRecord?.instrument_type || 'Unknown'
      }
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
