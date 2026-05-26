import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'https://supabase.178.105.10.2.sslip.io';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * POST /api/teacher/report-sick
 * body: { teacherId, sickUntilDate }
 */
export async function reportSickHandler(req: Request, res: Response): Promise<void> {
  try {
    const { teacherId, sickUntilDate } = req.body;

    if (!teacherId || !sickUntilDate) {
      res.status(400).json({ error: 'teacherId and sickUntilDate are required.' });
      return;
    }

    const sickUntil = new Date(sickUntilDate);
    if (isNaN(sickUntil.getTime())) {
      res.status(400).json({ error: 'Invalid sickUntilDate format.' });
      return;
    }

    // 1. Fetch teacher's schedules
    const { data: schedules, error: schedError } = await supabase
      .from('schedules')
      .select('*')
      .eq('teacher_id', teacherId);

    if (schedError) {
      res.status(500).json({ error: 'Failed to fetch schedules.', details: schedError.message });
      return;
    }

    if (!schedules || schedules.length === 0) {
      res.status(200).json({ success: true, message: 'No slots found for this teacher.', notificationsCreated: 0 });
      return;
    }

    const now = new Date();
    const notificationsToInsert: any[] = [];
    const scheduleIdsToUpdate = new Set<string>();

    // Iterate through dates from now until sickUntilDate (inclusive)
    const currentDate = new Date(now);
    currentDate.setHours(0, 0, 0, 0); // Start of day for iteration loop

    const endDate = new Date(sickUntil);
    endDate.setHours(23, 59, 59, 999);

    while (currentDate <= endDate) {
      // getDay() is 0 for Sunday, 1 for Monday, etc.
      // day_of_week is 1 for Monday, 7 for Sunday
      const rawDay = currentDate.getDay();
      const currentDayOfWeek = rawDay === 0 ? 7 : rawDay;

      // Find schedules for this day of week
      const daySchedules = schedules.filter(s => s.day_of_week === currentDayOfWeek);

      daySchedules.forEach(sched => {
        // Calculate slot_start_datetime: date + time_slot (e.g. "14:00")
        const [hours, minutes] = (sched.time_slot || '00:00').split(':').map(Number);
        const startDateTime = new Date(currentDate);
        startDateTime.setHours(hours, minutes, 0, 0);

        // Process only future slots
        if (startDateTime >= now) {
          scheduleIdsToUpdate.add(sched.id);
          notificationsToInsert.push({
            teacher_id: teacherId,
            student_id: sched.student_id,
            slot_start_datetime: startDateTime.toISOString(),
            status: 'UNREAD'
          });
        }
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 2. Perform DB Updates
    if (scheduleIdsToUpdate.size > 0) {
      // Set schedule status to canceled_by_teacher_sick
      const { error: updateError } = await supabase
        .from('schedules')
        .update({ status: 'canceled_by_teacher_sick' })
        .in('id', Array.from(scheduleIdsToUpdate));

      if (updateError) {
        res.status(500).json({ error: 'Failed to update schedule status.', details: updateError.message });
        return;
      }
    }

    if (notificationsToInsert.length > 0) {
      // Insert into crisis_notifications
      const { error: insertError } = await supabase
        .from('crisis_notifications')
        .insert(notificationsToInsert);

      if (insertError) {
        res.status(500).json({ error: 'Failed to create crisis notifications.', details: insertError.message });
        return;
      }

      // Simulate Email & WebSocket Dispatching
      notificationsToInsert.forEach(notif => {
        const token = Math.random().toString(36).substring(2, 15);
        const link = `${supabaseUrl}/api/student/confirm-crisis-notification?id=${notif.id || 'token'}&token=${token}`;
        console.log(`[Sick Leave Cascade] Dispatched push notification to student ${notif.student_id}`);
        console.log(`[Sick Leave Cascade] E-mail sent to parents of student ${notif.student_id}. Confirm link: ${link}`);
      });
    }

    res.status(200).json({
      success: true,
      message: `Teacher sick reported. ${notificationsToInsert.length} slots canceled/notified.`,
      notificationsCreated: notificationsToInsert.length
    });

  } catch (err: any) {
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

    const { error } = await supabase
      .from('crisis_notifications')
      .update({ status: 'READ' })
      .eq('id', resolvedId);

    if (error) {
      res.status(550).json({ error: 'Failed to confirm notification.', details: error.message });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as READ.'
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
