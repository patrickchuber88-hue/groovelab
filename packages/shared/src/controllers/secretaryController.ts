import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'https://supabase.178.105.10.2.sslip.io';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface SchoolCreationRequest {
  name: string;
  primaryColor?: string;
  logoUrl?: string;
  zipCode?: string;
  city?: string;
}

interface SchoolCreationResponse {
  schoolId: string;
  name: string;
  secretaryOnboardingToken: string;
  secretaryOnboardingLink: string;
}

interface SecretaryDashboardInitResponse {
  schoolId: string;
  schoolName: string;
  logoUrl: string | null;
  primaryColor: string;
  allowMessagesGlobal: boolean;
  hasKioskTokenSet: boolean;
  hasCampusTokenSet: boolean;
}

/**
 * Controller 1: Schul-Erstellungs-Controller (Master Portal / Super-Admin)
 * Generiert beim Erstellen einer Schule automatisch einen sicheren Krypto-Token.
 */
export async function createSchoolHandler(req: Request, res: Response): Promise<void> {
  try {
    // 1. Authenticate user and verify super_admin/master_admin rights
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

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('is_master_admin, role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      res.status(404).json({ error: 'User profile not found.' });
      return;
    }

    if (!userProfile.is_master_admin && userProfile.role !== 'super_admin') {
      res.status(403).json({ error: 'Access forbidden. Only super admins or master admins can create schools.' });
      return;
    }

    const { name, primaryColor, logoUrl, zipCode, city }: SchoolCreationRequest = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'School name is required.' });
      return;
    }

    // Generate a secure crypto-token for the secretary onboarding
    const secretaryOnboardingToken = randomBytes(32).toString('hex');
    // Generate default unique tokens for kiosk and campus login
    const groovelabKioskToken = randomBytes(24).toString('hex');
    const campusLoginToken = randomBytes(24).toString('hex');

    // Insert new school into database
    const { data: newSchool, error: insertError } = await supabase
      .from('schools')
      .insert({
        name: name.trim(),
        primary_color: primaryColor || '#3b82f6',
        logo_url: logoUrl || null,
        zip_code: zipCode || null,
        city: city || null,
        secretary_onboarding_token: secretaryOnboardingToken,
        groovelab_kiosk_token: groovelabKioskToken,
        campus_login_token: campusLoginToken,
        allow_messages_global: true
      })
      .select()
      .single();

    if (insertError || !newSchool) {
      res.status(500).json({ error: 'Failed to create school record in database.', details: insertError?.message });
      return;
    }

    const origin = req.get('origin') || process.env.FRONTEND_URL || 'https://campus-groovelab.de';
    const secretaryOnboardingLink = `${origin}/secretary-onboarding?token=${secretaryOnboardingToken}`;

    const responseData: SchoolCreationResponse = {
      schoolId: newSchool.id,
      name: newSchool.name,
      secretaryOnboardingToken: newSchool.secretary_onboarding_token,
      secretaryOnboardingLink
    };

    res.status(201).json({
      success: true,
      message: 'School successfully created and provisioned.',
      data: responseData
    });

  } catch (err: any) {
    console.error('Error in createSchoolHandler:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}

/**
 * Controller 2: Secretary Dashboard Init Endpoint
 * Validiert den Token und gibt die Basisdaten für das Sekretariat zurück.
 */
export async function getSecretaryDashboardInitHandler(req: Request, res: Response): Promise<void> {
  try {
    // Retrieve onboarding token from route parameters, query parameters, or body
    let token = (req.params.token || req.query.token || req.body.token) as string;

    if (!token && req.headers.authorization) {
      token = req.headers.authorization.replace('Bearer ', '');
    }

    if (!token) {
      res.status(400).json({ error: 'Missing secretary onboarding token.' });
      return;
    }

    // Query school details using the onboarding token
    const { data: school, error: schoolErr } = await supabase
      .from('schools')
      .select('id, name, logo_url, primary_color, groovelab_kiosk_token, campus_login_token, allow_messages_global')
      .eq('secretary_onboarding_token', token)
      .maybeSingle();

    if (schoolErr) {
      res.status(500).json({ error: 'Database error when fetching school details.', details: schoolErr.message });
      return;
    }

    if (!school) {
      res.status(404).json({ error: 'Invalid onboarding token. School not found or already onboarded.' });
      return;
    }

    const dashboardInitData: SecretaryDashboardInitResponse = {
      schoolId: school.id,
      schoolName: school.name,
      logoUrl: school.logo_url,
      primaryColor: school.primary_color || '#3b82f6',
      allowMessagesGlobal: school.allow_messages_global ?? true,
      hasKioskTokenSet: !!school.groovelab_kiosk_token,
      hasCampusTokenSet: !!school.campus_login_token
    };

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      school: dashboardInitData
    });

  } catch (err: any) {
    console.error('Error in getSecretaryDashboardInitHandler:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
