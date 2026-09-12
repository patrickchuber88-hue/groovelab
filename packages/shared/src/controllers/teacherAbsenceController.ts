import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'https://supabase.178.105.10.2.sslip.io';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * POST /api/teacher/report-absence
 * body: { teacherId, absenceUntilDate, absenceStartDate }
 * If absenceUntilDate is null or empty, it ends the absence.
 */
export async function reportAbsenceHandler(req: Request, res: Response): Promise<void> {
  try {
    const { teacherId, absenceUntilDate, absenceStartDate, sickUntilDate, sickStartDate } = req.body;
    const resolvedUntilDate = absenceUntilDate !== undefined ? absenceUntilDate : sickUntilDate;
    const resolvedStartDate = absenceStartDate !== undefined ? absenceStartDate : sickStartDate;

    if (!teacherId) {
      res.status(400).json({ error: 'teacherId is required.' });
      return;
    }

    // 1. Fetch teacher details to see previous sick_until status
    const { data: teacher, error: teacherError } = await supabase
      .from('users')
      .select('id, first_name, last_name, school_id, sick_until, sick_start')
      .eq('id', teacherId)
      .single();

    if (teacherError || !teacher) {
      res.status(404).json({ error: 'Teacher not found.' });
      return;
    }

    const prevAbsenceUntilStr = teacher.sick_until;
    let absenceStartVal: string | null = null;
    if (resolvedUntilDate) {
      const todayD = new Date();
      const localTodayStr = `${todayD.getFullYear()}-${String(todayD.getMonth() + 1).padStart(2, '0')}-${String(todayD.getDate()).padStart(2, '0')}`;
      absenceStartVal = resolvedStartDate || teacher.sick_start || localTodayStr;
    }
    
    // Update teacher's absence columns in database
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({ 
        sick_until: resolvedUntilDate || null,
        sick_start: resolvedUntilDate ? absenceStartVal : null
      })
      .eq('id', teacherId);

    if (userUpdateError) {
      res.status(500).json({ error: 'Failed to update user profile.', details: userUpdateError.message });
      return;
    }


    // 2. Fetch all teacher's schedules
    const { data: schedules, error: schedError } = await supabase
      .from('schedules')
      .select('*')
      .eq('teacher_id', teacherId);

    if (schedError) {
      res.status(500).json({ error: 'Failed to fetch schedules.', details: schedError.message });
      return;
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const absenceUntil = resolvedUntilDate ? new Date(resolvedUntilDate) : null;
    const prevAbsenceUntil = prevAbsenceUntilStr ? new Date(prevAbsenceUntilStr) : null;

    // Define the date range to check/revert: up to 30 days into the future
    const maxDate = new Date(now);
    maxDate.setDate(maxDate.getDate() + 30);

    const currentDate = new Date(todayStart);
    const notificationsToInsert: any[] = [];
    const scheduleIdsToCancel = new Set<string>();
    const scheduleIdsToRestore = new Set<string>();
    const datesToDeleteNotifs: string[] = [];

    // Fetch existing crisis notifications in this range to avoid duplicates
    const { data: existingNotifs } = await supabase
      .from('crisis_notifications')
      .select('slot_start_datetime, student_id')
      .eq('teacher_id', teacherId);

    const existingNotifsSet = new Set(
      (existingNotifs || []).map(n => `${new Date(n.slot_start_datetime).toISOString()}-${n.student_id}`)
    );

    while (currentDate <= maxDate) {
      const rawDay = currentDate.getDay();
      const currentDayOfWeek = rawDay === 0 ? 7 : rawDay;

      // Find schedules for this day of week
      const daySchedules = schedules.filter(s => s.day_of_week === currentDayOfWeek);

      daySchedules.forEach(sched => {
        const [hours, minutes] = (sched.time_slot || '00:00').split(':').map(Number);
        const startDateTime = new Date(currentDate);
        startDateTime.setHours(hours, minutes, 0, 0);

        if (startDateTime >= now) {
          const isCurrentlyAbsent = absenceUntil && startDateTime <= new Date(absenceUntil.getTime() + 24 * 60 * 60 * 1000 - 1);
          
          if (isCurrentlyAbsent) {
            scheduleIdsToCancel.add(sched.id);
            
            const notifKey = `${startDateTime.toISOString()}-${sched.student_id}`;
            if (!existingNotifsSet.has(notifKey)) {
              notificationsToInsert.push({
                teacher_id: teacherId,
                student_id: sched.student_id,
                slot_start_datetime: startDateTime.toISOString(),
                status: 'UNREAD'
              });
            }
          } else {
            // Restore schedules that are no longer in the absence window (or if absence was ended/shortened)
            scheduleIdsToRestore.add(sched.id);
            datesToDeleteNotifs.push(startDateTime.toISOString());
          }
        }
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Apply Absence Cancellations
    if (scheduleIdsToCancel.size > 0) {
      await supabase
        .from('schedules')
        .update({ status: 'canceled_by_teacher_sick' })
        .in('id', Array.from(scheduleIdsToCancel));
    }

    // Apply Restores back to approved
    if (scheduleIdsToRestore.size > 0) {
      await supabase
        .from('schedules')
        .update({ status: 'approved' })
        .in('id', Array.from(scheduleIdsToRestore))
        .eq('status', 'canceled_by_teacher_sick');
    }

    // Insert new crisis notifications
    if (notificationsToInsert.length > 0) {
      await supabase
        .from('crisis_notifications')
        .insert(notificationsToInsert);
    }

    // Delete/update future crisis notifications if absence shortened or ended
    if (datesToDeleteNotifs.length > 0) {
      if (!resolvedUntilDate) {
        // Update matching notifications to is_reinstated = true and status = 'UNREAD' (nur wenn nicht bereits als stattfindend quittiert)
        await supabase
          .from('crisis_notifications')
          .update({ is_reinstated: true, status: 'UNREAD' })
          .eq('teacher_id', teacherId)
          .in('slot_start_datetime', datesToDeleteNotifs)
          .or('is_reinstated.eq.false,status.neq.READ');
      } else {
        await supabase
          .from('crisis_notifications')
          .delete()
          .eq('teacher_id', teacherId)
          .in('slot_start_datetime', datesToDeleteNotifs);
      }
    }

    // Insert alert for Secretary Cockpit (Ausfall-Cockpit)
    let alertMessage = '';
    if (!resolvedUntilDate) {
      alertMessage = `🟢 WIEDER IM DIENST: Lehrkraft ${teacher.first_name} ${teacher.last_name} steht wieder regulär zur Verfügung.`;
    } else if (prevAbsenceUntilStr && resolvedUntilDate !== prevAbsenceUntilStr.substring(0, 10)) {
      alertMessage = `🚨 TERMIN-ANPASSUNG: Lehrkraft ${teacher.first_name} ${teacher.last_name} hat den Abwesenheitszeitraum auf den ${new Date(resolvedUntilDate).toLocaleDateString('de-DE')} geändert.`;
    } else {
      alertMessage = `🚨 TERMINABSAGE: Lehrkraft ${teacher.first_name} ${teacher.last_name} hat Termine bis zum ${new Date(resolvedUntilDate).toLocaleDateString('de-DE')} abgesagt.`;
    }

    await supabase
      .from('system_alerts')
      .insert({
        school_id: teacher.school_id,
        teacher_id: teacherId,
        type: 'Teacher Absence Alert',
        message: alertMessage,
        resolved: false
      });

    res.status(200).json({
      success: true,
      message: 'Absence status successfully updated and synchronized.',
      absenceUntil: resolvedUntilDate || null,
      sickUntil: resolvedUntilDate || null,
      notificationsCreated: notificationsToInsert.length
    });

  } catch (err: any) {
    console.error('Error in reportAbsenceHandler:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}

/**
 * POST /api/student/confirm-crisis-notification
 * body: { notificationId }
 */
export async function confirmCrisisNotificationHandler(req: Request, res: Response): Promise<void> {
  try {
    const { notificationId } = req.body;
    const resolvedId = notificationId || req.query.id;

    if (!resolvedId) {
      res.status(400).json({ error: 'notificationId is required.' });
      return;
    }

    const { error: rpcError } = await supabase.rpc('acknowledge_crisis_notifications', {
      p_notification_ids: [resolvedId]
    });

    if (rpcError) {
      const { error } = await supabase
        .from('crisis_notifications')
        .update({ 
          status: 'READ',
          read_at: new Date().toISOString(),
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', resolvedId);

      if (error) {
        res.status(550).json({ error: 'Failed to confirm notification.', details: error.message });
        return;
      }
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as READ.'
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}

