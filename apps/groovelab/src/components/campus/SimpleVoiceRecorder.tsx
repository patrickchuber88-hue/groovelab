import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Check, Loader2, Volume2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { processPureRawBlob, TARGET_PURE_RAW_LUFS, TARGET_PEAK_DBTP } from '../../utils/audioMasteringEngine';

interface SimpleVoiceRecorderProps {
  studentId: string;
  onRecordingComplete?: (audioUrl: string) => void;
  onAudioSaved?: (audioUrl: string) => void;
  colorTheme?: string;
  buttonLabel?: string;
  topicName?: string;
}

export const SimpleVoiceRecorder: React.FC<SimpleVoiceRecorderProps> = ({
  studentId,
  onRecordingComplete,
  onAudioSaved,
  colorTheme = '#16a34a',
  buttonLabel = 'Stück aufnehmen',
  topicName
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [normalizedBlob, setNormalizedBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const recordAudioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<any>(null);
  const audioElemRef = useRef<HTMLAudioElement | null>(null);

  // Stop hardware microphone access when unmounting
  useEffect(() => {
    return () => {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recordAudioCtxRef.current && recordAudioCtxRef.current.state !== 'closed') {
        try { recordAudioCtxRef.current.close(); } catch {}
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioElemRef.current) {
        audioElemRef.current.pause();
        audioElemRef.current = null;
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setUploadSuccess(false);
      setAudioUrl(null);
      setNormalizedBlob(null);
      audioChunksRef.current = [];

      // 🌟 1. Pure Raw Studio Sound Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          googEchoCancellation: false,
          googAutoGainControl: false,
          googNoiseSuppression: false,
          googHighpassFilter: false,
          googTypingNoiseDetection: false,
          channelCount: 1,
          sampleRate: 48000
        } as any
      });
      audioStreamRef.current = stream;

      // 🌟 2. WebAudio Dual-Channel Center Bridge
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const recordAudioCtx = new AudioCtx();
      recordAudioCtxRef.current = recordAudioCtx;
      const sourceNode = recordAudioCtx.createMediaStreamSource(stream);
      const mergerNode = recordAudioCtx.createChannelMerger(2);
      sourceNode.connect(mergerNode, 0, 0); // Left
      sourceNode.connect(mergerNode, 0, 1); // Right
      const destNode = recordAudioCtx.createMediaStreamDestination();
      mergerNode.connect(destNode);
      const recordStream = destNode.stream;

      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';
        else if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
        else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else if (MediaRecorder.isTypeSupported('audio/aac')) mimeType = 'audio/aac';
      }

      const mediaRecorder = mimeType ? new MediaRecorder(recordStream, { mimeType }) : new MediaRecorder(recordStream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const rawBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        
        // 🌟 3. Universal EBU R128 Pure RAW Loudness Calibration (-14.5 LUFS / -1.0 dBTP True-Peak Guard)
        let finalBlob = rawBlob;
        let localUrl = '';
        try {
          const pureRawRes = await processPureRawBlob(rawBlob, { targetLufs: TARGET_PURE_RAW_LUFS, targetPeakDb: TARGET_PEAK_DBTP });
          finalBlob = pureRawRes.processedBlob;
          localUrl = pureRawRes.processedUrl;
          if (pureRawRes.durationSec) {
            setRecordingDuration(Math.round(pureRawRes.durationSec));
          }
        } catch (dspErr) {
          console.warn('[SimpleVoiceRecorder] Pure RAW DSP fallback:', dspErr);
          localUrl = URL.createObjectURL(rawBlob);
        }

        setNormalizedBlob(finalBlob);
        setAudioUrl(localUrl);

        // Turn off microphone hardware light immediately
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(track => track.stop());
          audioStreamRef.current = null;
        }
        recordStream.getTracks().forEach(track => track.stop());
        if (recordAudioCtxRef.current && recordAudioCtxRef.current.state !== 'closed') {
          try { recordAudioCtxRef.current.close(); } catch {}
          recordAudioCtxRef.current = null;
        }
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Mikrofon-Zugriff nicht möglich. Bitte erlaube den Mikrofon-Zugriff in den Browser-Einstellungen.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const togglePlayback = () => {
    if (!audioUrl) return;

    if (!audioElemRef.current) {
      audioElemRef.current = new Audio(audioUrl);
      audioElemRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioElemRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElemRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleUploadAndSave = async () => {
    if (!audioUrl) return;
    const blobToUpload = normalizedBlob || (audioChunksRef.current.length > 0 ? new Blob(audioChunksRef.current, { type: 'audio/webm' }) : null);
    if (!blobToUpload) return;

    try {
      setIsUploading(true);
      const isWav = blobToUpload.type.includes('wav');
      const fileExt = isWav ? 'wav' : (blobToUpload.type.includes('mp4') ? 'mp4' : 'webm');
      const contentType = isWav ? 'audio/wav' : (blobToUpload.type || 'audio/webm');
      const targetSchoolId = localStorage.getItem('groovelab_school_id') || localStorage.getItem('campus_school_id');
      const schoolPathPrefix = targetSchoolId ? `schools/${targetSchoolId}/` : '';
      const fileName = `${schoolPathPrefix}audio/memo_${studentId}_${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('campus-assets')
        .upload(fileName, blobToUpload, {
          contentType,
          upsert: true
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('campus-assets')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData?.publicUrl || '';
      setUploadSuccess(true);
      if (onRecordingComplete) {
        onRecordingComplete(publicUrl);
      }
      if (onAudioSaved) {
        onAudioSaved(publicUrl);
      }
    } catch (e) {
      console.error('Upload failed:', e);
      alert('Upload fehlgeschlagen. Bitte versuche es noch einmal.');
    } finally {
      setIsUploading(false);
    }
  };

  const resetRecording = () => {
    if (audioElemRef.current) {
      audioElemRef.current.pause();
      audioElemRef.current = null;
    }
    setAudioUrl(null);
    setIsPlaying(false);
    setUploadSuccess(false);
    setRecordingDuration(0);
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '16px',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        alignItems: 'center',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      {!audioUrl ? (
        // State 1: Ready to Record or Recording
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%' }}>
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: isRecording
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : `linear-gradient(135deg, ${colorTheme} 0%, #15803d 100%)`,
              border: 'none',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: isRecording
                ? '0 0 0 8px rgba(239, 68, 68, 0.2), 0 8px 24px rgba(239, 68, 68, 0.4)'
                : '0 8px 24px rgba(22, 163, 74, 0.25)',
              transform: isRecording ? 'scale(1.05)' : 'scale(1)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {isRecording ? (
              <Square size={24} fill="white" />
            ) : (
              <Mic size={28} />
            )}
          </button>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#1e293b' }}>
              {isRecording ? 'Aufnahme läuft...' : buttonLabel}
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: isRecording ? '#ef4444' : '#64748b', marginTop: '2px' }}>
              {isRecording ? `Dauer: ${formatSeconds(recordingDuration)} (Klick zum Stoppen)` : 'Tippe auf das Mikrofon'}
            </div>
          </div>
        </div>
      ) : (
        // State 2: Recorded - Preview & Send
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontWeight: 800, fontSize: '0.9rem' }}>
            <Volume2 size={18} color={colorTheme} />
            <span>Deine Aufnahme ({formatSeconds(recordingDuration)})</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', justifyContent: 'center' }}>
            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={togglePlayback}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 18px',
                borderRadius: '100px',
                border: 'none',
                background: '#f1f5f9',
                color: '#1e293b',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              {isPlaying ? <Pause size={16} fill="#1e293b" /> : <Play size={16} fill="#1e293b" />}
              <span>{isPlaying ? 'Pause' : 'Anhören'}</span>
            </button>

            {/* Redo Button */}
            <button
              type="button"
              onClick={resetRecording}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 14px',
                borderRadius: '100px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#64748b',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
              title="Neu aufnehmen"
            >
              <RotateCcw size={15} />
              <span>Neu</span>
            </button>

            {/* Save / Send Button */}
            <button
              type="button"
              onClick={handleUploadAndSave}
              disabled={isUploading || uploadSuccess}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 20px',
                borderRadius: '100px',
                border: 'none',
                background: uploadSuccess
                  ? '#16a34a'
                  : `linear-gradient(135deg, ${colorTheme} 0%, #15803d 100%)`,
                color: 'white',
                fontWeight: 900,
                fontSize: '0.85rem',
                cursor: (isUploading || uploadSuccess) ? 'default' : 'pointer',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)'
              }}
            >
              {isUploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Speichert...</span>
                </>
              ) : uploadSuccess ? (
                <>
                  <Check size={16} strokeWidth={3} />
                  <span>Gespeichert! 🎉</span>
                </>
              ) : (
                <>
                  <Check size={16} strokeWidth={3} />
                  <span>Fertig & Senden</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
