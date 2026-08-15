import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL || 'https://supabase.178.105.10.2.sslip.io';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const ALLOWED_MIME_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/aac', 'audio/webm', 'audio/ogg'];
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * 1. Pre-Signed Upload URL für Meilenstein-Aufnahme generieren
 * POST /api/milestones/:id/upload-url
 */
export async function generateUploadUrlHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id: milestoneId } = req.params;
    const { studentId, schoolId, mimeType, fileSizeBytes } = req.body;

    if (!milestoneId || !studentId || !schoolId) {
      res.status(400).json({ error: 'Milestone ID, Student ID und School ID sind erforderlich.' });
      return;
    }

    // Validierung: MIME-Type & Dateigröße
    if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType)) {
      res.status(400).json({ error: 'Ungültiges Audioformat. Erlaubt sind mp3, wav, m4a, aac, webm, ogg.' });
      return;
    }

    if (fileSizeBytes && fileSizeBytes > MAX_FILE_SIZE_BYTES) {
      res.status(400).json({ error: 'Dateigröße überschreitet das Limit von 25 MB.' });
      return;
    }

    // Prüfen, ob Meilenstein gesperrt/unlöschbar ist
    const { data: existing } = await supabase
      .from('audio_milestones')
      .select('is_unerasable')
      .eq('id', milestoneId)
      .maybeSingle();

    if (existing?.is_unerasable) {
      res.status(403).json({ error: 'Dieser Meilenstein ist als unveränderliches Fundament geschützt.' });
      return;
    }

    const filePath = `audio/biography/${schoolId}/${studentId}/${milestoneId}_${Date.now()}.webm`;
    
    // Supabase Storage Pre-Signed Upload URL (60 Sekunden TTL)
    const { data, error } = await supabase.storage
      .from('campus-assets')
      .createSignedUploadUrl(filePath);

    if (error || !data) {
      res.status(500).json({ error: 'Fehler beim Generieren der Upload-URL.', details: error?.message });
      return;
    }

    res.json({
      uploadUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      expiresInSeconds: 60
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Interner Serverfehler', details: err.message });
  }
}

/**
 * 2. Pre-Signed Streaming URL (15 Minuten TTL) mit Rechteprüfung
 * GET /api/recordings/:id/stream
 */
export async function getStreamingUrlHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id: recordingId } = req.params;
    const { requesterUserId, role, shareToken } = req.query;

    if (!recordingId) {
      res.status(400).json({ error: 'Recording ID ist erforderlich.' });
      return;
    }

    const { data: recording, error: recError } = await supabase
      .from('audio_recordings')
      .select('*, audio_milestones!inner(student_id, tenant_id, visibility)')
      .eq('id', recordingId)
      .single();

    if (recError || !recording) {
      res.status(404).json({ error: 'Aufnahme nicht gefunden.' });
      return;
    }

    const milestone = (recording as any).audio_milestones;
    const isOwner = requesterUserId === milestone?.student_id;
    const isTeacher = role === 'teacher' || role === 'admin' || role === 'secretary';
    const isPublicAllowed = milestone?.visibility === 'teacher_allowed' || !!shareToken;

    if (!isOwner && !isTeacher && !isPublicAllowed) {
      res.status(403).json({ error: 'Zugriff verweigert (Privater Meilenstein).' });
      return;
    }

    // Signierte Streaming-URL für 15 Minuten (900 Sekunden)
    const { data: signedData, error: signError } = await supabase.storage
      .from('campus-assets')
      .createSignedUrl(recording.file_path, 900);

    if (signError || !signedData) {
      res.status(500).json({ error: 'Streaming-URL konnte nicht signiert werden.' });
      return;
    }

    res.json({
      streamUrl: signedData.signedUrl,
      expiresInSeconds: 900,
      duration: recording.duration_seconds
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Interner Serverfehler', details: err.message });
  }
}

/**
 * 3. Lehrer-Validierungs-Workflow
 * POST /api/milestones/:id/verify
 */
export async function verifyMilestoneHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id: milestoneId } = req.params;
    const { teacherId, notes } = req.body;

    if (!milestoneId || !teacherId) {
      res.status(400).json({ error: 'Milestone ID und Teacher ID sind erforderlich.' });
      return;
    }

    // Status aktualisieren & Fundament unlöschbar machen
    const { data: milestone, error: updateErr } = await supabase
      .from('audio_milestones')
      .update({
        status: 'verified_masterpiece',
        is_unerasable: true,
        verified_by: teacherId,
        verified_at: new Date().toISOString()
      })
      .eq('id', milestoneId)
      .select('*, student:users!inner(id, school_id)')
      .single();

    if (updateErr || !milestone) {
      res.status(500).json({ error: 'Meilenstein konnte nicht verifiziert werden.' });
      return;
    }

    // Benachrichtigungs-Event an den Schüler auslösen
    await supabase.from('notifications').insert({
      user_id: (milestone as any).student_id,
      school_id: (milestone as any).tenant_id,
      title: '🏆 Meisterwerk verifiziert!',
      message: `Deine Lehrkraft hat deinen Meilenstein "${(milestone as any).title}" offiziell als Meisterwerk bestätigt.`,
      type: 'masterpiece_verified'
    });

    res.json({ success: true, milestone });
  } catch (err: any) {
    res.status(500).json({ error: 'Interner Serverfehler', details: err.message });
  }
}

/**
 * 4. Öffentlicher Share-Resolver (DSGVO-geschützt)
 * POST /api/share/:token/access
 */
export async function accessSharedBiographyHandler(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.params;
    const { pin } = req.body;

    if (!token) {
      res.status(400).json({ error: 'Share-Token erforderlich.' });
      return;
    }

    const { data: shareLink, error } = await supabase
      .from('shared_biography_links')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !shareLink) {
      res.status(404).json({ error: 'Freigabe-Link nicht gefunden oder abgelaufen.' });
      return;
    }

    // Ablaufdatum prüfen
    if (new Date(shareLink.expires_at) < new Date()) {
      res.status(410).json({ error: 'Dieser Freigabe-Link ist abgelaufen.' });
      return;
    }

    // PIN-Validierung
    if (shareLink.pin_hash) {
      const inputHash = crypto.createHash('sha256').update(pin || '').digest('hex');
      if (inputHash !== shareLink.pin_hash) {
        res.status(401).json({ error: 'Ungültiger 4-stelliger PIN-Code.' });
        return;
      }
    }

    // Freigegebene Meilensteine abrufen
    const { data: milestones } = await supabase
      .from('audio_milestones')
      .select('id, title, subtitle, status, audio_recordings(duration_seconds, recorded_at, file_path)')
      .eq('student_id', shareLink.student_id)
      .eq('visibility', 'teacher_allowed');

    res.json({
      success: true,
      anonymized: shareLink.is_anonymized,
      studentDisplayName: shareLink.is_anonymized ? 'Schüler/in der Musikschule' : shareLink.student_display_name,
      milestones: milestones || []
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Interner Serverfehler', details: err.message });
  }
}
