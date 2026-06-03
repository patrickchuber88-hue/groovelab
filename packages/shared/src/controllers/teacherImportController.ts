import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import * as csv from 'csv-string';
import { randomBytes, createHmac } from 'crypto';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'https://supabase.178.105.10.2.sslip.io';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Secret for generating the encrypted teacher_qr_token
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'groovelab_secret_token_key_2026';

interface TeacherImportRow {
  Vorname: string;
  Nachname: string;
  'E-Mail': string;
  Instrument: string;
  'Maximale Anzahl Schüler': string;
}

export async function importTeachersHandler(req: Request, res: Response): Promise<void> {
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

    // Fetch user role and school_id to verify admin rights
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      res.status(404).json({ error: 'User profile not found.' });
      return;
    }

    if (userProfile.role !== 'admin') {
      res.status(403).json({ error: 'Access forbidden. Only admins can import teachers.' });
      return;
    }

    const schoolId = userProfile.school_id;
    if (!schoolId) {
      res.status(400).json({ error: 'Admin is not associated with any school.' });
      return;
    }

    // 2. Extract CSV data from request
    let csvData = '';
    if (req.file) {
      csvData = req.file.buffer.toString('utf8');
    } else if (req.body && req.body.csv) {
      csvData = req.body.csv;
    } else {
      res.status(400).json({ error: 'No CSV file or CSV string provided.' });
      return;
    }

    // 3. Parse CSV data
    const parsedData = csv.parse(csvData, { comma: ';', quote: '"' });
    if (parsedData.length < 2) {
      res.status(400).json({ error: 'CSV file is empty or missing header row.' });
      return;
    }

    const headers = parsedData[0].map(h => h.trim());
    
    // Map header names to indices
    const firstNameIdx = headers.indexOf('Vorname');
    const lastNameIdx = headers.indexOf('Nachname');
    const emailIdx = headers.indexOf('E-Mail');
    const instrumentIdx = headers.indexOf('Instrument');
    const maxStudentsIdx = headers.indexOf('Maximale Anzahl Schüler');

    // 4. Validate Headers
    if (firstNameIdx === -1 || lastNameIdx === -1 || emailIdx === -1 || instrumentIdx === -1 || maxStudentsIdx === -1) {
      res.status(400).json({ 
        error: 'Invalid CSV format. Missing required headers.',
        details: {
          expected: ['Vorname', 'Nachname', 'E-Mail', 'Instrument', 'Maximale Anzahl Schüler'],
          received: headers
        }
      });
      return;
    }

    const importedTeachers = [];
    const errors = [];

    // 5. Process Rows
    for (let i = 1; i < parsedData.length; i++) {
      const row = parsedData[i];
      if (row.length === 0 || (row.length === 1 && row[0].trim() === '')) {
        continue; // skip empty rows
      }

      const firstName = row[firstNameIdx]?.trim();
      const lastName = row[lastNameIdx]?.trim();
      const email = row[emailIdx]?.trim();
      const instrument = row[instrumentIdx]?.trim();
      const maxStudentsStr = row[maxStudentsIdx]?.trim();

      // Row Validation
      if (!firstName || !lastName || !email || !instrument || !maxStudentsStr) {
        errors.push({
          row: i + 1,
          error: 'Missing required value in row.',
          data: { firstName, lastName, email, instrument, maxStudentsStr }
        });
        continue;
      }

      const maxStudents = parseInt(maxStudentsStr, 10);
      if (isNaN(maxStudents) || maxStudents < 0) {
        errors.push({
          row: i + 1,
          error: 'Maximale Anzahl Schüler must be a non-negative integer.',
          data: { maxStudentsStr }
        });
        continue;
      }

      // Generate a unique 'ausweis_nummer' (Zufalls-String als Einmal-PIN)
      // Generates a 6-digit random numeric string
      const ausweisNummer = Math.floor(100000 + Math.random() * 900000).toString();

      // Generate a coupled 'teacher_qr_token'
      const teacherQrToken = 't_' + ausweisNummer;

      importedTeachers.push({
        school_id: schoolId,
        role: 'teacher',
        first_name: firstName,
        last_name: lastName,
        email: email,
        instrument: instrument,
        max_students: maxStudents,
        qr_token: null, // set to null to bypass default uuid v4 generation if it exists, or just fallback
        registration_pin: ausweisNummer, // Keep for backward compatibility/referencing
        ausweis_nummer: ausweisNummer,
        teacher_qr_token: teacherQrToken,
        is_active: false,
        is_campus_active: true,
        is_groovelab_active: false
      });
    }

    if (errors.length > 0 && importedTeachers.length === 0) {
      res.status(400).json({ error: 'Import failed. All rows contained errors.', details: errors });
      return;
    }

    // 6. Bulk Insert into Database
    const { data: insertedRecords, error: insertError } = await supabase
      .from('users')
      .insert(importedTeachers)
      .select('id, first_name, last_name, email, ausweis_nummer, teacher_qr_token');

    if (insertError) {
      res.status(500).json({ error: 'Database insert failed.', details: insertError.message });
      return;
    }

    // 7. Return Response
    res.status(200).json({
      success: true,
      message: `Successfully imported ${importedTeachers.length} teachers.`,
      records: insertedRecords,
      warnings: errors.length > 0 ? errors : undefined
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
