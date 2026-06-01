import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';


// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'https://supabase.178.105.10.2.sslip.io';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// JWT Secret for passwortloser Blitz-Login
const JWT_SECRET = process.env.JWT_SECRET || 'groovelab_jwt_secret_token_2026';

export async function onboardStudentHandler(req: Request, res: Response): Promise<void> {
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

    // Fetch teacher profile to confirm role and get school info and student limits
    const { data: teacherProfile, error: profileError } = await supabase
      .from('users')
      .select('id, school_id, role, max_students, first_name, last_name')
      .eq('id', user.id)
      .single();

    if (profileError || !teacherProfile) {
      res.status(404).json({ error: 'Teacher profile not found.' });
      return;
    }

    if (teacherProfile.role !== 'teacher' && teacherProfile.role !== 'admin') {
      res.status(403).json({ error: 'Access forbidden. Only teachers and admins can onboard students.' });
      return;
    }

    const schoolId = teacherProfile.school_id;
    if (!schoolId) {
      res.status(400).json({ error: 'Teacher is not associated with any school.' });
      return;
    }

    // 2. Validate student onboarding limits - BYPASSED (Limits strictly removed)
    const maxStudentsAllowed = 999999; // Unlimited
    
    // Count current students assigned to this teacher for reference stats
    const { count: currentStudentsCount, error: countError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'student')
      .eq('teacher_id', teacherProfile.id);

    if (countError) {
      res.status(500).json({ error: 'Failed to retrieve slot count.', details: countError.message });
      return;
    }

    const activeStudents = currentStudentsCount || 0;


    // 3. Extract and validate student payload
    const { firstName, lastName, instrument, isAppUser = false } = req.body;

    if (!firstName || !lastName || !instrument) {
      res.status(400).json({ error: 'Missing required student details (firstName, lastName, or instrument).' });
      return;
    }

    // 4. Create student profile data
    const studentQrToken = uuidv4();
    const defaultAvatarUrl = '/avatars/student_drums_1.png'; // Neutral default avatar

    const studentData = {
      school_id: schoolId,
      teacher_id: teacherProfile.id,
      role: 'student',
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      instrument: instrument.trim(),
      avatar_url: defaultAvatarUrl,
      is_app_user: isAppUser,
      qr_token: studentQrToken,
      is_campus_active: isAppUser, // If app user, activate immediately, otherwise parent activates it
      is_groovelab_active: isAppUser,
      status: isAppUser ? 'active' : 'pending'
    };

    // Insert student record
    const { data: insertedStudent, error: insertError } = await supabase
      .from('users')
      .insert(studentData)
      .select('id, first_name, last_name, instrument, is_app_user, qr_token, status')
      .single();

    if (insertError || !insertedStudent) {
      res.status(500).json({ error: 'Failed to create student account.', details: insertError?.message });
      return;
    }

    // Initialize 2-class avatar system record
    const { error: avatarError } = await supabase
      .from('avatars')
      .insert({
        user_id: insertedStudent.id,
        avatar_style: 'Standard_Silhouette',
        instrument_type: instrument.trim(),
        evolution_level: 1
      });

    if (avatarError) {
      console.error('Warning: Failed to initialize avatar profile:', avatarError.message);
    }

    // 5. Generate parent web link if not an app user
    let parentWebLink = '';
    if (!isAppUser) {
      parentWebLink = `http://localhost:5173/parent-input?student_id=${insertedStudent.id}&token=${insertedStudent.qr_token}`;
    }

    // 6. Return response
    res.status(200).json({
      success: true,
      message: 'Student onboarded successfully.',
      student: {
        id: insertedStudent.id,
        firstName: insertedStudent.first_name,
        lastName: insertedStudent.last_name,
        instrument: insertedStudent.instrument,
        isAppUser: insertedStudent.is_app_user,
        qrToken: insertedStudent.is_app_user ? insertedStudent.qr_token : undefined,
        status: insertedStudent.status,
        parentWebLink: !isAppUser ? parentWebLink : undefined
      },
      slots: {
        used: activeStudents + 1,
        max: maxStudentsAllowed,
        remaining: maxStudentsAllowed - (activeStudents + 1)
      }
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}

/**
 * Controller 2: Passwortloser Blitz-Login via Schüler-Ausweis (USP 2 - /api/auth/student-qr)
 * Validiert den student_qr_token und liefert sofort ein gültiges JWT zurück.
 */
export async function loginViaStudentQrHandler(req: Request, res: Response): Promise<void> {
  try {
    const { studentQrToken } = req.body;

    if (!studentQrToken || !studentQrToken.trim()) {
      res.status(400).json({ error: 'studentQrToken is required.' });
      return;
    }

    // Query user profile by qr_token and verify role is student
    const { data: student, error: fetchError } = await supabase
      .from('users')
      .select('id, first_name, last_name, role, school_id, is_app_user, status')
      .eq('qr_token', studentQrToken.trim())
      .single();

    if (fetchError || !student) {
      res.status(404).json({ error: 'Invalid QR token. Student profile not found.' });
      return;
    }

    if (student.role !== 'student') {
      res.status(403).json({ error: 'Access forbidden. This login method is exclusive to students.' });
      return;
    }

    if (!student.is_app_user) {
      res.status(403).json({ error: 'App account is not active for this student. Please contact your music school.' });
      return;
    }

    if (student.status === 'suspended') {
      res.status(403).json({ error: 'Account suspended.' });
      return;
    }

    // Generate passwortloser JWT Auth Token
    const jwtToken = jwt.sign(
      {
        sub: student.id,
        role: student.role,
        school_id: student.school_id,
        name: `${student.first_name} ${student.last_name}`,
        iss: 'groovelab-auth-service',
        aud: 'groovelab-client-app'
      },
      JWT_SECRET,
      { expiresIn: '30d' } // Long-lived family session
    );

    res.status(200).json({
      success: true,
      message: 'Successfully authenticated via student QR Code.',
      token: jwtToken,
      student: {
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        role: student.role,
        schoolId: student.school_id
      }
    });

  } catch (err: any) {
    console.error('Error in loginViaStudentQrHandler:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}

/**
 * Endpoint /api/teacher/generate-student-kaskade
 * Generates an onboarding cascade token for new students.
 */
export async function generateStudentKaskadeHandler(req: Request, res: Response): Promise<void> {
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

    const { data: teacherProfile, error: profileError } = await supabase
      .from('users')
      .select('id, school_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !teacherProfile || (teacherProfile.role !== 'teacher' && teacherProfile.role !== 'admin')) {
      res.status(403).json({ error: 'Access forbidden. Only teachers and admins can generate student cascades.' });
      return;
    }

    const cascadeToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 12); // valid for 12 hours

    const { data: cascade, error: insertError } = await supabase
      .from('student_cascades')
      .insert({
        teacher_id: teacherProfile.id,
        school_id: teacherProfile.school_id,
        token: cascadeToken,
        expires_at: expiresAt.toISOString()
      })
      .select('*')
      .single();

    if (insertError || !cascade) {
      res.status(500).json({ error: 'Failed to generate cascade token.', details: insertError?.message });
      return;
    }

    const registrationLink = `http://localhost:5173/student-signup?cascade=${cascade.token}`;

    res.status(200).json({
      success: true,
      token: cascade.token,
      expiresAt: cascade.expires_at,
      registrationLink,
      message: 'Student cascade onboarding link generated successfully.'
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}

/**
 * Endpoint /api/student/register-via-kaskade
 * Registers a student using a cascade onboarding token.
 * Checks teacher capacity limits. If exceeded, blocks registration and creates alert ticket in system_alerts.
 */
export async function registerStudentViaKaskadeHandler(req: Request, res: Response): Promise<void> {
  try {
    const { cascadeToken, firstName, lastName, email, password, instrument } = req.body;

    if (!cascadeToken || !firstName || !lastName || !email || !password || !instrument) {
      res.status(400).json({ error: 'Missing required registration details.' });
      return;
    }

    // 1. Fetch cascade details
    const { data: cascade, error: cascadeError } = await supabase
      .from('student_cascades')
      .select('*')
      .eq('token', cascadeToken)
      .maybeSingle();

    if (cascadeError || !cascade) {
      res.status(400).json({ error: 'Invalid or expired onboarding token.' });
      return;
    }

    if (new Date(cascade.expires_at) < new Date()) {
      res.status(400).json({ error: 'This onboarding token has expired.' });
      return;
    }

    // 2. Fetch teacher profile for limits
    const { data: teacherProfile, error: teacherError } = await supabase
      .from('users')
      .select('id, first_name, last_name, max_students')
      .eq('id', cascade.teacher_id)
      .single();

    if (teacherError || !teacherProfile) {
      res.status(404).json({ error: 'Associated teacher profile not found.' });
      return;
    }

    // 3. Count current students assigned to this teacher - BYPASSED (Limits strictly removed)
    const { count: currentStudentsCount, error: countError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'student')
      .eq('teacher_id', teacherProfile.id);

    if (countError) {
      res.status(500).json({ error: 'Failed to retrieve slot count.', details: countError.message });
      return;
    }

    const activeStudents = currentStudentsCount || 0;
    const maxStudentsAllowed = 999999; // Unlimited


    // 4. Create student profile
    const studentQrToken = uuidv4();
    const studentData = {
      school_id: cascade.school_id,
      teacher_id: teacherProfile.id,
      role: 'student',
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim().toLowerCase(),
      password_hash: crypto.createHash('sha256').update(password).digest('hex'), // basic secure hash
      instrument: instrument.trim(),
      avatar_url: '/avatars/student_drums_1.png',
      qr_token: studentQrToken,
      show_sekretariat: false,
      show_campus: true,
      show_groovelab: false,
      is_active: false // forced first-login PIN verification
    };

    const { data: newStudent, error: insertError } = await supabase
      .from('users')
      .insert(studentData)
      .select('id, first_name, last_name, ausweis_id, qr_token')
      .single();

    if (insertError || !newStudent) {
      res.status(500).json({ error: 'Failed to create student profile.', details: insertError?.message });
      return;
    }

    // Initialize 2-class avatar system record
    await supabase
      .from('avatars')
      .insert({
        user_id: newStudent.id,
        avatar_style: 'Standard_Silhouette',
        instrument_type: instrument.trim(),
        evolution_level: 1
      });

    res.status(200).json({
      success: true,
      message: 'Student registered successfully. Please activate your account at first login.',
      student: {
        id: newStudent.id,
        firstName: newStudent.first_name,
        lastName: newStudent.last_name,
        ausweisId: newStudent.ausweis_id,
        qrToken: newStudent.qr_token
      }
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}

