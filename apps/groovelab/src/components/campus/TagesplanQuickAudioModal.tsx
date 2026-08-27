import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Mic, Square, Play, Pause, RotateCcw, Check, Loader2, Volume2, Sparkles, Music, Send
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { acquireAudioStream, releaseAudioStream } from '../../services/audioPermissionService';
import { processPureRawBlob } from '../../utils/audioMasteringEngine';

interface TagesplanQuickAudioModalProps {
  isOpen: boolean;
  student: any;
  teacher: any;
  dateStr?: string;
  onClose: () => void;
  onSaved?: (audioUrl: string) => void;
}

export const TagesplanQuickAudioModal: React.FC<TagesplanQuickAudioModalProps> = ({
  isOpen,
  student,
  teacher,
  dateStr,
  onClose,
  onSaved
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [audioTitle, setAudioTitle] = useState('');

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioElemRef = useRef<HTMLAudioElement | null>(null);

  // Set default title based on student and date
  useEffect(() => {
    if (student) {
      const studentName = student.first_name || (student.name ? student.name.split(' ')[0] : 'Schüler');
      const todayFormatted = dateStr 
        ? new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
        : new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
      setAudioTitle(`Unterrichts-Aufnahme (${todayFormatted})`);
    }
  }, [student, dateStr]);

  // Hardware Safety Cleanup
  const stopHardware = () => {
    if (streamRef.current) {
      releaseAudioStream(streamRef.current);
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioElemRef.current) {
      audioElemRef.current.pause();
      audioElemRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopHardware();
    };
  }, []);

  if (!isOpen || !student) return null;

  const studentFirstName = student.first_name || (student.name ? student.name.split(' ')[0] : 'Schüler');
  const studentLastName = student.last_name || (student.name ? student.name.split(' ').slice(1).join(' ') : '');
  const studentFullName = `${studentFirstName} ${studentLastName}`.trim();

  // 1. Start Recording
  const handleStartRecord = async () => {
    try {
      setAudioBlob(null);
      setAudioUrl(null);
      setSaveSuccess(false);
      audioChunksRef.current = [];

      const stream = await acquireAudioStream({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
          sampleRate: 48000
        } as any
      });
      streamRef.current = stream;

      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';
        else if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
        else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
      }

      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const rawBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        try {
          // Studio sound mastering
          const masteredResult = await processPureRawBlob(rawBlob);
          setAudioBlob(masteredResult.processedBlob);
          setAudioUrl(masteredResult.processedUrl || URL.createObjectURL(masteredResult.processedBlob));
        } catch {
          setAudioBlob(rawBlob);
          const url = URL.createObjectURL(rawBlob);
          setAudioUrl(url);
        }
        stopHardware();
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } catch (err) {
      console.warn('[QuickAudioModal] Failed to start recording:', err);
      setIsRecording(false);
    }
  };

  // 2. Stop Recording
  const handleStopRecord = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // 3. Play / Pause Review
  const handleTogglePlayback = () => {
    if (!audioUrl) return;
    if (isPlaying) {
      if (audioElemRef.current) {
        audioElemRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      const audio = new Audio(audioUrl);
      audioElemRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  // 4. Reset
  const handleReset = () => {
    stopHardware();
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setRecordingSeconds(0);
    setSaveSuccess(false);
  };

  // 5. Save & Attach directly to Student's Homework Book
  const handleSaveToHomework = async () => {
    if (!audioBlob || !student.id) return;
    setIsSaving(true);

    try {
      let finalAudioUrl = '';

      // Upload to Supabase Storage
      const fileName = `quick_hw_${student.id}_${Date.now()}.webm`;
      const filePath = `homework/${student.id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('recordings')
        .upload(filePath, audioBlob, {
          contentType: audioBlob.type || 'audio/webm',
          upsert: true
        });

      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from('recordings')
          .getPublicUrl(filePath);
        finalAudioUrl = publicUrlData.publicUrl;
      } else {
        // Fallback to base64 data URL if storage upload failed or offline
        const reader = new FileReader();
        finalAudioUrl = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(audioBlob);
        });
      }

      // Format canonical homework audio entry
      // Format: AUDIO:url|duration|isoDate|title|teacher|shared_with_teacher
      const durationSec = Math.max(1, recordingSeconds);
      const isoNow = new Date().toISOString();
      const cleanTitle = (audioTitle.trim() || `Unterrichts-Aufnahme (${studentFirstName})`).replace(/\|/g, '-');
      const formattedEntry = `AUDIO:${finalAudioUrl}|${durationSec}|${isoNow}|${cleanTitle}|teacher|shared_with_teacher`;

      // Save to localStorage cache for instant zero-latency UI
      const storageKey = `campus_homework_notes_${student.id}`;
      const existingRaw = localStorage.getItem(storageKey);
      let existingList: string[] = [];
      try {
        existingList = existingRaw ? JSON.parse(existingRaw) : [];
        if (!Array.isArray(existingList)) existingList = existingRaw ? [existingRaw] : [];
      } catch {
        existingList = existingRaw ? [existingRaw] : [];
      }

      if (!existingList.includes(formattedEntry)) {
        existingList.push(formattedEntry);
        localStorage.setItem(storageKey, JSON.stringify(existingList));
      }

      // Sync with Supabase progress_matrix (Hausaufgabe)
      try {
        const d = new Date();
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const pastDays = (d.getTime() - startOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
        const topicName = `Hausaufgabe KW ${String(weekNum).padStart(2, '0')}`;

        const { data: existingMatrix } = await supabase
          .from('progress_matrix')
          .select('id, homework_notes')
          .eq('student_id', student.id)
          .eq('topic_name', topicName)
          .maybeSingle();

        if (existingMatrix) {
          await supabase
            .from('progress_matrix')
            .update({
              homework_notes: JSON.stringify(existingList),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingMatrix.id);
        } else {
          await supabase
            .from('progress_matrix')
            .insert({
              student_id: student.id,
              teacher_id: teacher?.id,
              topic_name: topicName,
              status: 'IN_PROGRESS',
              homework_notes: JSON.stringify(existingList),
              updated_at: new Date().toISOString()
            });
        }
      } catch (e) {
        console.warn('[QuickAudioModal] Background DB sync caught error:', e);
      }

      // Notify UI
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('campus_homework_updated', { detail: { studentId: student.id } }));
      }

      setSaveSuccess(true);
      if (onSaved) onSaved(finalAudioUrl);

      setTimeout(() => {
        onClose();
        handleReset();
      }, 1200);

    } catch (err) {
      console.error('[QuickAudioModal] Failed to save homework audio:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isRecording && !isSaving) {
          stopHardware();
          onClose();
        }
      }}
    >
      <div 
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          maxWidth: '460px',
          width: '100%',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          position: 'relative',
          animation: 'scaleUp 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            stopHardware();
            onClose();
          }}
          disabled={isRecording || isSaving}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: (isRecording || isSaving) ? 'not-allowed' : 'pointer',
            color: '#64748b'
          }}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: '#e6f4ea',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#34a853',
            flexShrink: 0
          }}>
            <Mic size={22} color="#34a853" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Audio-Hausaufgabe aufnehmen
            </h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
              Für <strong>{studentFullName}</strong> • Heute im Hausaufgabenheft
            </p>
          </div>
        </div>

        {/* Recording Stage */}
        <div style={{
          background: isRecording 
            ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' 
            : (audioBlob ? '#f0fdf4' : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'),
          borderRadius: '18px',
          border: isRecording ? '1.5px solid #ef4444' : (audioBlob ? '1.5px solid #34a853' : '1px solid #e2e8f0'),
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          transition: 'all 0.2s ease'
        }}>
          {/* Animated Waveform / Timer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isRecording && (
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#ef4444',
                boxShadow: '0 0 12px rgba(239, 68, 68, 0.8)',
                animation: 'pulse 1.2s infinite'
              }} />
            )}
            <span style={{
              fontSize: '2.2rem',
              fontWeight: 900,
              color: isRecording ? '#dc2626' : (audioBlob ? '#15803d' : '#0f172a'),
              letterSpacing: '-0.03em',
              fontFamily: 'monospace'
            }}>
              {formatTime(recordingSeconds)}
            </span>
          </div>

          <p style={{ margin: 0, fontSize: '0.74rem', fontWeight: 700, color: isRecording ? '#b91c1c' : '#64748b', textAlign: 'center' }}>
            {isRecording 
              ? '● Aufnahme läuft... Spiele das Stück oder die Übung ein'
              : (audioBlob ? '✓ Aufnahme bereit zur Übernahme' : 'Klicke auf den Button, um die Aufnahme zu starten')}
          </p>

          {/* Record / Stop Action Button */}
          {!audioBlob ? (
            <button
              type="button"
              onClick={isRecording ? handleStopRecord : handleStartRecord}
              style={{
                marginTop: '4px',
                padding: '12px 24px',
                borderRadius: '14px',
                border: 'none',
                background: isRecording ? '#ef4444' : '#34a853',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: isRecording 
                  ? '0 6px 20px -2px rgba(239, 68, 68, 0.4)' 
                  : '0 6px 20px -2px rgba(52, 168, 83, 0.35)',
                transition: 'all 0.15s ease'
              }}
            >
              {isRecording ? <Square size={16} fill="#ffffff" /> : <Mic size={18} />}
              <span>{isRecording ? 'Aufnahme stoppen' : 'Aufnahme starten'}</span>
            </button>
          ) : (
            /* Review & Playback Controls */
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={handleTogglePlayback}
                style={{
                  padding: '9px 18px',
                  borderRadius: '12px',
                  border: '1px solid #34a853',
                  background: '#ffffff',
                  color: '#15803d',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                <span>{isPlaying ? 'Pause' : 'Anhören'}</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                style={{
                  padding: '9px 14px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#64748b',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Aufnahme verwerfen und neu starten"
              >
                <RotateCcw size={14} />
                <span>Neu aufnehmen</span>
              </button>
            </div>
          )}
        </div>

        {/* Title Input */}
        {audioBlob && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
              Titel / Bezeichnung im Hausaufgabenheft:
            </label>
            <input
              type="text"
              value={audioTitle}
              onChange={(e) => setAudioTitle(e.target.value)}
              placeholder="z. B. Fingersatz Takt 12–16, Intro Gitarre..."
              style={{
                padding: '10px 12px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#0f172a',
                outline: 'none'
              }}
            />
          </div>
        )}

        {/* Primary Save Button */}
        {audioBlob && (
          <button
            type="button"
            onClick={handleSaveToHomework}
            disabled={isSaving || saveSuccess}
            style={{
              padding: '13px',
              borderRadius: '14px',
              border: 'none',
              background: saveSuccess ? '#15803d' : '#34a853',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: '0.88rem',
              cursor: (isSaving || saveSuccess) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 8px 24px -4px rgba(52, 168, 83, 0.4)',
              transition: 'all 0.15s ease'
            }}
          >
            {isSaving ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Wird im Hausaufgabenheft gespeichert...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check size={18} strokeWidth={3} />
                <span>✓ Erfolgreich im Hausaufgabenheft eingetragen!</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Ins Hausaufgabenheft von {studentFirstName} übertragen ➔</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
