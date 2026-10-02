import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send, Loader2, Volume2, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { acquireAudioStream, releaseAudioStream } from '../../../services/audioPermissionService';
import { processPureRawBlob } from '../../../utils/audioMasteringEngine';
import { saveOfflineAudioRecord } from '../../../utils/offlineAudioVault';
import { formatTagesKompassStudentName } from './types';

interface TagesKompassSmartInputProps {
  studentId: string;
  studentName?: string;
  isSaving?: boolean;
  onSaveText: (text: string) => Promise<void>;
  onSaveAudio: (audioUrl: string, durationSec: number) => Promise<void>;
  disabled?: boolean;
}

export const TagesKompassSmartInput: React.FC<TagesKompassSmartInputProps> = ({
  studentId,
  studentName = 'Schüler',
  isSaving = false,
  onSaveText,
  onSaveAudio,
  disabled = false
}) => {
  const maskedStudentName = formatTagesKompassStudentName(null, studentName);
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioStreamRef.current) releaseAudioStream(audioStreamRef.current);
    };
  }, []);

  const handleTextSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSaving || isRecording || disabled) return;
    try {
      await onSaveText(trimmed);
      setText('');
    } catch (err) {
      console.error('[SmartInput] Error saving text homework:', err);
    }
  };

  const startAudioRecording = async () => {
    if (isRecording || isSaving || disabled) return;
    try {
      const stream = await acquireAudioStream();
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';
        else if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
        else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setIsProcessingAudio(true);
        try {
          const rawBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
          let finalBlob: Blob = rawBlob;
          try {
            const mastered = await processPureRawBlob(rawBlob);
            if (mastered?.processedBlob) {
              finalBlob = mastered.processedBlob;
            }
          } catch (e) {
            console.warn('[SmartInput] Audio mastering fallback to raw blob:', e);
          }

          const fileExt = mimeType.includes('mp4') ? 'm4a' : 'webm';
          const fileName = `voice-homework-${studentId}-${Date.now()}.${fileExt}`;
          const filePath = `${studentId}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('campus-assets')
            .upload(filePath, finalBlob, { contentType: finalBlob.type || 'audio/webm', upsert: true });

          if (uploadError) {
            console.warn('[SmartInput] Remote upload failed, storing offline:', uploadError);
            const offlineRec = await saveOfflineAudioRecord({
              blob: finalBlob,
              mimeType: finalBlob.type || 'audio/webm',
              durationSeconds: recordSeconds || 1,
              studentId,
              context: 'homework',
              title: `Hausaufgabe ${maskedStudentName}`
            });
            await onSaveAudio(`offline://${offlineRec.id}`, recordSeconds || 1);
          } else {
            const { data: publicUrlData } = supabase.storage.from('campus-assets').getPublicUrl(filePath);
            await onSaveAudio(publicUrlData.publicUrl, recordSeconds || 1);
          }
        } catch (err) {
          console.error('[SmartInput] Error uploading voice memo:', err);
        } finally {
          setIsProcessingAudio(false);
          setRecordSeconds(0);
          if (audioStreamRef.current) {
            releaseAudioStream(audioStreamRef.current);
            audioStreamRef.current = null;
          }
        }
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordSeconds(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('[SmartInput] Could not access microphone:', err);
      alert('Mikrofon-Zugriff nicht möglich. Bitte Berechtigung im Browser erteilen.');
    }
  };

  const stopAudioRecording = () => {
    if (!isRecording) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const formatSecs = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      {isRecording ? (
        // Aufnahme-Modus (Pulsierend, schlicht, 1 Klick zum Beenden)
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fef2f2',
            border: '1.5px solid #f87171',
            borderRadius: '16px',
            padding: '8px 14px',
            minHeight: '48px',
            boxSizing: 'border-box',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span 
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#dc2626',
                boxShadow: '0 0 8px rgba(220, 38, 38, 0.8)',
                animation: 'pulse 1s infinite'
              }}
            />
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#991b1b' }}>
              Sprachmemo aufnehmen: {formatSecs(recordSeconds)}
            </span>
          </div>

          <button
            type="button"
            onClick={stopAudioRecording}
            aria-label="Aufnahme stoppen und als Hausaufgabe speichern"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '6px 14px',
              fontSize: '0.80rem',
              fontWeight: 800,
              cursor: 'pointer',
              minHeight: '36px'
            }}
          >
            <Square size={13} fill="#ffffff" />
            <span>Stopp & Zuweisen</span>
          </button>
        </div>
      ) : isProcessingAudio ? (
        // Lade-Status nach Aufnahme
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '12px',
            minHeight: '48px',
            color: '#64748b',
            fontSize: '0.85rem',
            fontWeight: 700
          }}
        >
          <Loader2 size={16} className="animate-spin" color="#16a34a" />
          <span>Sprachmemo wird verarbeitet & zugewiesen...</span>
        </div>
      ) : (
        // Standard Smart-Input (Text + 1-Click Mic)
        <form 
          onSubmit={handleTextSubmit}
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '16px',
            padding: '4px 6px 4px 14px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            transition: 'border-color 0.2s',
            minHeight: '48px',
            boxSizing: 'border-box'
          }}
          onFocus={e => e.currentTarget.style.borderColor = '#16a34a'}
          onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'}
        >
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={`Neue Hausaufgabe für ${maskedStudentName} eingeben...`}
            disabled={isSaving || disabled}
            aria-label={`Neue Hausaufgabe für ${maskedStudentName}`}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '0.88rem',
              fontWeight: 600,
              color: '#1e293b',
              background: 'transparent',
              padding: '6px 0'
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* 1-Click Sprachmemo Mic Button */}
            <button
              type="button"
              onClick={startAudioRecording}
              disabled={isSaving || disabled || Boolean(text.trim())}
              title="1-Klick Sprachmemo aufnehmen"
              aria-label="1-Klick Sprachmemo aufnehmen"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: 'none',
                background: text.trim() ? '#f1f5f9' : '#f0fdf4',
                color: text.trim() ? '#94a3b8' : '#16a34a',
                cursor: text.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Mic size={17} />
            </button>

            {/* Senden Button */}
            <button
              type="submit"
              disabled={!text.trim() || isSaving || disabled}
              title="Hausaufgabe zuweisen"
              aria-label="Hausaufgabe zuweisen"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: 'none',
                background: text.trim() ? '#34a853' : '#f1f5f9',
                color: text.trim() ? '#ffffff' : '#94a3b8',
                cursor: text.trim() ? 'pointer' : 'default',
                transition: 'all 0.15s ease'
              }}
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
