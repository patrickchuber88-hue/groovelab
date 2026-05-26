import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'https://supabase.178.105.10.2.sslip.io';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function sendInvitationsHandler(req: Request, res: Response): Promise<void> {
  try {
    // 1. Authenticate user and verify they are an admin
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

    // Verify admin role
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile || userProfile.role !== 'admin') {
      res.status(403).json({ error: 'Access forbidden. Only admins can send invitations.' });
      return;
    }

    const { userIds } = req.body;
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({ error: 'No user IDs provided for sending invitations.' });
      return;
    }

    // 2. Fetch the corresponding teachers
    const { data: teachers, error: fetchError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, qr_token')
      .in('id', userIds)
      .eq('school_id', userProfile.school_id)
      .eq('role', 'teacher');

    if (fetchError || !teachers || teachers.length === 0) {
      res.status(404).json({ error: 'No matching teachers found to invite.', details: fetchError?.message });
      return;
    }

    const sentMailsInfo = [];

    // 3. Loop and mock email sending (console log)
    for (const teacher of teachers) {
      const registrationUrl = `http://localhost:5173/register?token=${teacher.qr_token}`;
      
      console.log('--------------------------------------------------');
      console.log(`[EMAIL SERVICE] Sende Aktivierungs-E-Mail`);
      console.log(`Empfänger: ${teacher.first_name} ${teacher.last_name} <${teacher.email}>`);
      console.log(`Betreff: Aktiviere deinen GrooveLab & Campus Account`);
      console.log(`Inhalt: Hallo ${teacher.first_name},`);
      console.log(`deine Musikschule hat dich für GrooveLab & Campus freigeschaltet.`);
      console.log(`Nutze diesen Aktivierungs-Link um deine Registrierung abzuschließen:`);
      console.log(`${registrationUrl}`);
      console.log('--------------------------------------------------');

      sentMailsInfo.push({
        id: teacher.id,
        email: teacher.email,
        sent: true,
        sentAt: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: `Successfully simulated sending ${teachers.length} invitation emails.`,
      sentMails: sentMailsInfo
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}

export async function verifyTeacherPinHandler(req: Request, res: Response): Promise<void> {
  try {
    const { qrToken, pin } = req.body;

    if (!qrToken || !pin) {
      res.status(400).json({ error: 'Missing qrToken or pin in request body.' });
      return;
    }

    // 1. Find teacher by qr_token
    const { data: teacher, error: fetchError } = await supabase
      .from('users')
      .select('id, first_name, last_name, registration_pin, role')
      .eq('qr_token', qrToken)
      .single();

    if (fetchError || !teacher) {
      res.status(404).json({ error: 'Teacher profile not found with this token.' });
      return;
    }

    if (teacher.role !== 'teacher') {
      res.status(400).json({ error: 'This token does not belong to a teacher.' });
      return;
    }

    // 2. Verify the 6-digit registration PIN
    if (teacher.registration_pin !== pin.trim()) {
      res.status(401).json({ error: 'Invalid activation PIN. Please check your credentials.' });
      return;
    }

    // 3. Update active states
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_campus_active: true,
        is_groovelab_active: true,
        status: 'active'
      })
      .eq('id', teacher.id);

    if (updateError) {
      res.status(500).json({ error: 'Database update failed.', details: updateError.message });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Account successfully activated!',
      activatedUser: {
        id: teacher.id,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        is_campus_active: true,
        is_groovelab_active: true,
        status: 'active'
      }
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
