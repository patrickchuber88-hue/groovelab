import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'http://supabase.178.105.10.2.sslip.io';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'groovelab_jwt_secret_token_2026';

function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

/**
 * 1. ERSTAKTIVIERUNGS-WEICHE (/api/auth/activate)
 * Erster Login für Lehrer oder Schüler.
 * Verifiziert entweder über QR-Code-Token (Option A) oder über manual Ausweis-ID (Option B).
 * Gibt zurück, ob eine PIN festgelegt werden muss, und setzt die PIN.
 */
export async function activateAccountHandler(req: Request, res: Response): Promise<void> {
  try {
    const { token, ausweisId, personalPin } = req.body;

    if (!token && !ausweisId) {
      res.status(400).json({ error: 'Entweder QR-Token oder Ausweis-ID erforderlich.' });
      return;
    }

    // Find user by QR Token or Ausweis ID
    let query = supabase.from('users').select('*');
    if (token) {
      query = query.eq('qr_token', token);
    } else {
      query = query.eq('ausweis_id', ausweisId);
    }

    const { data: user, error: fetchError } = await query.maybeSingle();

    if (fetchError || !user) {
      res.status(404).json({ error: 'Benutzerprofil mit diesen Zugangsdaten nicht gefunden.' });
      return;
    }

    if (user.is_active) {
      res.status(400).json({ error: 'Account ist bereits aktiv. Bitte nutze den regulären Login.' });
      return;
    }

    // If personalPin is not provided, block the flow and prompt frontend to request it
    if (!personalPin) {
      res.status(200).json({
        success: true,
        pinRequired: true,
        message: 'Erstaktivierung erfolgreich verifiziert. Bitte vergebe eine 4-stellige PIN.',
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        }
      });
      return;
    }

    // Validate 4-digit PIN format
    if (!/^\d{4}$/.test(personalPin)) {
      res.status(400).json({ error: 'Die PIN muss genau 4 Ziffern lang sein.' });
      return;
    }

    // Save hashed PIN and activate account
    const hashedPin = hashPin(personalPin);
    const { error: updateError } = await supabase
      .from('users')
      .update({
        personal_pin: hashedPin,
        is_active: true
      })
      .eq('id', user.id);

    if (updateError) {
      res.status(500).json({ error: 'Aktivierung fehlgeschlagen.', details: updateError.message });
      return;
    }

    // Generate JWT after activation
    const jwtToken = jwt.sign(
      {
        sub: user.id,
        role: user.role,
        school_id: user.school_id,
        name: `${user.first_name} ${user.last_name}`,
        show_sekretariat: user.show_sekretariat,
        show_campus: user.show_campus,
        show_groovelab: user.show_groovelab,
        iss: 'groovelab-auth-service',
        aud: 'groovelab-client-app'
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(200).json({
      success: true,
      message: 'Account erfolgreich aktiviert und PIN gespeichert!',
      token: jwtToken,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        showSekretariat: user.show_sekretariat,
        showCampus: user.show_campus,
        showGroovelab: user.show_groovelab
      }
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Interner Server-Fehler bei der Aktivierung.', details: err.message });
  }
}

/**
 * 2. UNIVERSAL-LOGIN MIT EMERGENCY-BYPASS (/api/auth/login)
 * Standard: login via QR code (qr_token)
 * Emergency: login via ausweis_id + personal_pin
 */
export async function universalLoginHandler(req: Request, res: Response): Promise<void> {
  try {
    const { qrToken, ausweisId, personalPin } = req.body;

    if (!qrToken && (!ausweisId || !personalPin)) {
      res.status(400).json({ error: 'Ungültige Anmeldedaten. QR-Token oder Ausweis-ID + PIN erforderlich.' });
      return;
    }

    let user = null;

    if (qrToken) {
      // Standard Flow: Scan valid QR code
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('qr_token', qrToken)
        .maybeSingle();

      if (error || !data) {
        res.status(401).json({ error: 'Ungültiger QR-Ausweis.' });
        return;
      }
      user = data;

      // Note: Standard everyday login has zero friction, no PIN prompt!
    } else {
      // Emergency Bypass Flow: Ausweis-ID + Personal PIN
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('ausweis_id', ausweisId)
        .maybeSingle();

      if (error || !data) {
        res.status(401).json({ error: 'Falsche Ausweis-ID oder PIN.' });
        return;
      }

      if (!data.is_active) {
        res.status(400).json({ error: 'Dieser Account wurde noch nicht aktiviert. Bitte führe zuerst das Erst-Onboarding durch.' });
        return;
      }

      const hashedInputPin = hashPin(personalPin);
      if (data.personal_pin !== hashedInputPin) {
        res.status(401).json({ error: 'Falsche Ausweis-ID oder PIN.' });
        return;
      }
      user = data;
    }

    // Generate JWT with 3-tab matrix
    const jwtToken = jwt.sign(
      {
        sub: user.id,
        role: user.role,
        school_id: user.school_id,
        name: `${user.first_name} ${user.last_name}`,
        show_sekretariat: user.show_sekretariat,
        show_campus: user.show_campus,
        show_groovelab: user.show_groovelab,
        iss: 'groovelab-auth-service',
        aud: 'groovelab-client-app'
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(200).json({
      success: true,
      message: 'Erfolgreich angemeldet.',
      token: jwtToken,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        showSekretariat: user.show_sekretariat,
        showCampus: user.show_campus,
        showGroovelab: user.show_groovelab
      }
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Interner Server-Fehler beim Login.', details: err.message });
  }
}

/**
 * 3. PIN VERIFIKATION FÜR SENSIPLE BEREICHE (/api/auth/verify-pin)
 * Ermöglicht die Überprüfung der PIN bei Klick auf [ SEKRETARIAT ]
 */
export async function verifyPersonalPinHandler(req: Request, res: Response): Promise<void> {
  try {
    const { userId, personalPin } = req.body;

    if (!userId || !personalPin) {
      res.status(400).json({ error: 'Benutzer-ID und PIN sind erforderlich.' });
      return;
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('personal_pin')
      .eq('id', userId)
      .single();

    if (error || !user) {
      res.status(404).json({ error: 'Benutzer nicht gefunden.' });
      return;
    }

    const hashedInputPin = hashPin(personalPin);
    if (user.personal_pin !== hashedInputPin) {
      res.status(401).json({ error: 'PIN ist ungültig.', valid: false });
      return;
    }

    res.status(200).json({
      success: true,
      valid: true,
      message: 'PIN erfolgreich verifiziert.'
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Server-Fehler bei PIN-Verifikation.', details: err.message });
  }
}
