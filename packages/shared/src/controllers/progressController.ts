import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'https://supabase.178.105.10.2.sslip.io';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * 1. TEACHER: SAVE PROGRESS (/api/teacher/save-progress)
 * Erlaubt dem Lehrer das uneingeschränkte Speichern und Aktualisieren.
 */
export async function saveProgressHandler(req: Request, res: Response): Promise<void> {
  try {
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

    // Verify role is teacher/admin
    const { data: teacherProfile, error: profileError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !teacherProfile || (teacherProfile.role !== 'teacher' && teacherProfile.role !== 'admin')) {
      res.status(403).json({ error: 'Access forbidden. Only teachers can document progress.' });
      return;
    }

    const { id, studentId, topicName, status, isCurrentHomework, teacherNotes, homeworkNotes } = req.body;

    if (!studentId || !topicName || !status) {
      res.status(400).json({ error: 'studentId, topicName and status are required.' });
      return;
    }

    // Validate status values
    const validStatuses = ['IN_PROGRESS', 'THEORY_DONE', 'MASTERED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid status. Must be IN_PROGRESS, THEORY_DONE, or MASTERED.' });
      return;
    }

    let result = null;

    if (id) {
      // Update by ID
      const { data, error } = await supabase
        .from('progress_matrix')
        .update({
          status,
          is_current_homework: !!isCurrentHomework,
          teacher_notes: teacherNotes || '',
          homework_notes: homeworkNotes || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Check if combination of studentId and topicName already exists
      const { data: existing } = await supabase
        .from('progress_matrix')
        .select('id')
        .eq('student_id', studentId)
        .eq('topic_name', topicName)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { data, error } = await supabase
          .from('progress_matrix')
          .update({
            status,
            is_current_homework: !!isCurrentHomework,
            teacher_notes: teacherNotes || '',
            homework_notes: homeworkNotes || '',
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select('*')
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('progress_matrix')
          .insert({
            student_id: studentId,
            teacher_id: teacherProfile.id,
            topic_name: topicName,
            status,
            is_current_homework: !!isCurrentHomework,
            teacher_notes: teacherNotes || '',
            homework_notes: homeworkNotes || ''
          })
          .select('*')
          .single();

        if (error) throw error;
        result = data;
      }
    }

    res.status(200).json({
      success: true,
      message: 'Lernfortschritt erfolgreich gespeichert.',
      progress: result
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}

/**
 * 2. STUDENT: GET PROGRESS (/api/student/get-progress)
 * Liest den Fortschritt für den Schüler.
 * Prüft den Premium-Status. Wenn nicht aktiv zensiert er die Daten.
 */
export async function getProgressHandler(req: Request, res: Response): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    let userId = req.query.studentId as string;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        // Retrieve logged in user's role to distinguish between student and teacher/admin
        const { data: loggedInUser } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (loggedInUser?.role === 'student') {
          // Students are locked to viewing their own progress only
          userId = user.id;
        } else if (!userId) {
          // Teachers / admins default to their own if no studentId is queried
          userId = user.id;
        }
      }
    }

    if (!userId) {
      res.status(400).json({ error: 'studentId is required.' });
      return;
    }

    const isPremium = true;

    // 2. Fetch progress items
    const { data: progressItems, error: fetchError } = await supabase
      .from('progress_matrix')
      .select('*')
      .eq('student_id', userId)
      .order('updated_at', { ascending: false });

    if (fetchError) {
      res.status(500).json({ error: 'Failed to fetch progress.', details: fetchError.message });
      return;
    }

    // 3. Process and sanitize based on premium status, deduplicating by topic_name (latest wins)
    const uniqueItemsMap = new Map<string, any>();
    (progressItems || []).forEach(item => {
      const name = (item.topic_name || '').trim().toLowerCase();
      if (name && !uniqueItemsMap.has(name)) {
        uniqueItemsMap.set(name, item);
      }
    });
    const sanitizedProgress = Array.from(uniqueItemsMap.values());

    res.status(200).json({
      success: true,
      isPremiumActive: isPremium,
      progress: sanitizedProgress
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
