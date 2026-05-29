import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'https://supabase.178.105.10.2.sslip.io';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * POST /api/teacher/save-setup
 * Body: { teacherId, startAnchor, breakTimes }
 */
export async function saveTeacherSetupHandler(req: Request, res: Response): Promise<void> {
  try {
    const { teacherId, startAnchor, breakTimes } = req.body;

    if (!teacherId || !startAnchor) {
      res.status(400).json({ error: 'teacherId and startAnchor are required.' });
      return;
    }

    // Verify user is a teacher
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', teacherId)
      .single();

    if (profileError || !userProfile || (userProfile.role !== 'teacher' && userProfile.role !== 'admin')) {
      res.status(403).json({ error: 'Access forbidden. Only teachers can update setup.' });
      return;
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        start_anchor: startAnchor,
        break_times: breakTimes || []
      })
      .eq('id', teacherId)
      .select('id, start_anchor, break_times')
      .single();

    if (error) {
      res.status(500).json({ error: 'Failed to update teacher setup.', details: error.message });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Teacher setup updated successfully.',
      setup: data
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}

/**
 * GET /api/teacher/get-setup
 * Query: ?teacherId=...
 */
export async function getTeacherSetupHandler(req: Request, res: Response): Promise<void> {
  try {
    const teacherId = req.query.teacherId as string;

    if (!teacherId) {
      res.status(400).json({ error: 'teacherId query parameter is required.' });
      return;
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, start_anchor, break_times')
      .eq('id', teacherId)
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Teacher setup not found.', details: error?.message });
      return;
    }

    res.status(200).json({
      success: true,
      setup: {
        startAnchor: data.start_anchor,
        breakTimes: data.break_times
      }
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
