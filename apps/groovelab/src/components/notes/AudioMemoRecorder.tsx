import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Play, Pause, Trash2, Check, Lock, AlertCircle, Volume2 } from 'lucide-react';
import { checkIsAudioTresorActive } from '../../domain/stickersAndTresor';
import { supabase } from '../../lib/supabase';

interface AudioMemoRecorderProps {
  user: any;
  onAudioReady: (audioUrl: string, durationSeconds: number) => void;
  onCancel: () => void;
}

export const AudioMemoRecorder: React.FC<AudioMemoRecorderProps> = ({
  user,
  onAudioReady,
  onCancel
}) => {
  const hasTresor = checkIsAudioTresorActive(user);

  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop hardware mic stream strictly
  const stopHardwareStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try { track.stop(); } catch (e) {}
      });
      streamRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopHardwareStream();
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl, stopHardwareStream]);

  const startRecording = async () => {
    if (user?.parent_allow_audio === false) {
      setErrorMsg('Sprachaufnahmen wurden von den Erziehungsberechtigten deaktiviert.');
      return;
    }
    if (!hasTresor) return;
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(finalBlob);
        const url = URL.createObjectURL(finalBlob);
        setAudioUrl(url);
        stopHardwareStream();
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordSeconds(prev => {
          if (prev >= 120) { // Max 2 Minutes
            stopRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err: any) {
      console.error('Microphone access failed:', err);
      setErrorMsg('Mikrofonzugriff verweigert oder nicht verfügbar.');
      stopHardwareStream();
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleTogglePlay = () => {
    if (!audioPlayerRef.current) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSaveAndUpload = async () => {
    if (!audioBlob) return;
    setIsUploading(true);
    setErrorMsg(null);

    try {
      const fileName = `memo_${user?.id || 'guest'}_${Date.now()}.${audioBlob.type.includes('mp4') ? 'mp4' : 'webm'}`;
      const filePath = `notes/${fileName}`;

      const { data, error } = await supabase.storage
        .from('user-recordings')
        .upload(filePath, audioBlob, {
          contentType: audioBlob.type,
          upsert: true
        });

      let finalUrl = '';
      if (!error && data?.path) {
        const { data: publicUrlData } = supabase.storage
          .from('user-recordings')
          .getPublicUrl(data.path);
        finalUrl = publicUrlData.publicUrl;
      } else {
        // Fallback local blob URL representation
        finalUrl = audioUrl || '';
      }

      onAudioReady(finalUrl, recordSeconds || 1);
    } catch (err: any) {
      console.warn('Audio upload fallback to local URL:', err);
      onAudioReady(audioUrl || '', recordSeconds || 1);
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 1. Audio-Tresor is locked
  if (!hasTresor) {
    return (
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        marginTop: '10px'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: '#f1f5f9',
          color: '#64748b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Lock size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
            Audio-Tresor Speicher erforderlich
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>
            Dauerhafte Audio-Memos mit Cloud-Speicher sind im Zusatz-Speichervolumen <strong>Audio-Tresor</strong> enthalten.
            Live Voice-to-Text (Diktat) ist weiterhin 100% inklusive!
          </div>
        </div>
        <button
          onClick={onCancel}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '6px 10px'
          }}
        >
          Schließen
        </button>
      </div>
    );
  }

  // 2. Audio-Tresor is Active
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(240, 253, 244, 0.6) 0%, rgba(220, 252, 231, 0.3) 100%)',
      border: '1px solid rgba(52, 168, 83, 0.25)',
      borderRadius: '16px',
      padding: '14px 18px',
      marginTop: '10px',
      boxShadow: '0 4px 14px rgba(52, 168, 83, 0.06)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: isRecording ? '#fee2e2' : '#dcfce7',
            color: isRecording ? '#ef4444' : '#166534',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            animation: isRecording ? 'pulse 1.5s infinite' : 'none'
          }}>
            {isRecording ? <Mic size={18} /> : <Volume2 size={18} />}
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 850, color: '#0f172a' }}>
              {isRecording ? 'Sprachmemo aufnehmen...' : audioUrl ? 'Sprachmemo bereit' : 'Audio-Memo aufnehmen'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
              {isRecording ? `${formatTime(recordSeconds)} / 2:00` : audioUrl ? `Dauer: ${formatTime(recordSeconds)}` : 'Max. 2 Minuten (Opus HQ)'}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!isRecording && !audioUrl && (
            <button
              onClick={startRecording}
              style={{
                background: '#34a853',
                color: 'white',
                border: 'none',
                padding: '7px 14px',
                borderRadius: '10px',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(52, 168, 83, 0.2)'
              }}
            >
              <Mic size={14} />
              <span>Aufnahme starten</span>
            </button>
          )}

          {isRecording && (
            <button
              onClick={stopRecording}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '7px 14px',
                borderRadius: '10px',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)'
              }}
            >
              <Square size={14} />
              <span>Stoppen</span>
            </button>
          )}

          {audioUrl && (
            <>
              <audio
                ref={audioPlayerRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                style={{ display: 'none' }}
              />
              <button
                onClick={handleTogglePlay}
                style={{
                  background: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  fontWeight: 750,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                <span>{isPlaying ? 'Pause' : 'Anhören'}</span>
              </button>

              <button
                onClick={handleSaveAndUpload}
                disabled={isUploading}
                style={{
                  background: '#34a853',
                  color: 'white',
                  border: 'none',
                  padding: '7px 14px',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(52, 168, 83, 0.2)'
                }}
              >
                <Check size={14} />
                <span>{isUploading ? 'Speichern...' : 'Übernehmen'}</span>
              </button>
            </>
          )}

          <button
            onClick={() => {
              stopHardwareStream();
              onCancel();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px'
            }}
            title="Abbrechen"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '0.72rem', marginTop: '8px', fontWeight: 600 }}>
          <AlertCircle size={13} />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
