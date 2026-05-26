import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'http://supabase.178.105.10.2.sslip.io';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Endpoint /api/admin/create-teacher-link
 * Generiert einen unikalen, zeitlich begrenzten Registrierungs-Token für neue Lehrkräfte.
 */
export async function createTeacherLinkHandler(req: Request, res: Response): Promise<void> {
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
      res.status(403).json({ error: 'Access forbidden. Only admins can create teacher links.' });
      return;
    }

    const { email, hoursValid = 24 } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email of the teacher is required.' });
      return;
    }

    // 2. Generate teacher activation token details
    const invitationToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + hoursValid);

    // Insert record into teacher_invitations
    const { data: invitation, error: insertError } = await supabase
      .from('teacher_invitations')
      .insert({
        school_id: userProfile.school_id,
        email: email.trim().toLowerCase(),
        token: invitationToken,
        expires_at: expiresAt.toISOString()
      })
      .select('token, expires_at')
      .single();

    if (insertError || !invitation) {
      res.status(500).json({ error: 'Failed to generate invitation token.', details: insertError?.message });
      return;
    }

    // Generate response with link
    const activationLink = `http://localhost:5173/activate?token=${invitation.token}`;

    res.status(200).json({
      success: true,
      token: invitation.token,
      expiresAt: invitation.expires_at,
      activationLink,
      message: 'Aktivierungs-Link für Lehrkraft erfolgreich generiert.'
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
