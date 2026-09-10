import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Square, 
  Check, 
  X, 
  Sliders, 
  Layers, 
  Sparkles
} from 'lucide-react';
import { getBlob, storeBlob } from '../../../utils/blobStorage';
import { playCountInBeep } from './MeisterwerkAudioPlayers';

export interface DuettDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherAudioUrl: string;
  teacherTitle?: string;
  teacherBpm?: number;
  songTag?: string;
  studentId: string;
  studentFirstName?: string;
  onSaveStudentTake?: (take: {
    id: string;
    url: string;
    title: string;
    label: string;
    duration: number;
    created_at: string;
    songTag?: string;
    isDuettTake?: boolean;
    latencyOffsetMs?: number;
  }) => void;
}

export const DuettDeckModal: React.FC<DuettDeckModalProps> = ({
  isOpen,
  onClose,
  teacherAudioUrl,
  teacherTitle = 'Lehrer-Aufnahme',
  teacherBpm = 100,
  songTag,
  studentId,
  studentFirstName = 'Schüler',
  onSaveStudentTake
}) => {
  // Device Detection: Responsive for Smartphones (<=480px), Tablets/iPads (481px-1024px) and Desktops (>1024px)
  const [windowWidth, setWindowWidth] = useState<number>(() => typeof window !== 'undefined' ? window.innerWidth : 1024);
  const isMobile = windowWidth <= 640;
  const isTablet = windowWidth > 640 && windowWidth <= 1024;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Master Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Resolved URLs
  const [resolvedTeacherUrl, setResolvedTeacherUrl] = useState<string>(teacherAudioUrl);
  const [studentAudioBlob, setStudentAudioBlob] = useState<Blob | null>(null);
  const [studentAudioUrl, setStudentAudioUrl] = useState<string | null>(null);
  const [studentDuration, setStudentDuration] = useState<number>(0);
  const [teacherDuration, setTeacherDuration] = useState<number>(0);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [countInStep, setCountInStep] = useState<number | null>(null);
  const [recordDuration, setRecordDuration] = useState(0);

  // Audio Controls & Mix
  const [teacherVolume, setTeacherVolume] = useState<number>(1.0);
  const [studentVolume, setStudentVolume] = useState<number>(1.0);
  const [latencyOffsetMs, setLatencyOffsetMs] = useState<number>(0); // -300ms to +300ms
  const [activeMixPreset, setActiveMixPreset] = useState<'100_teacher' | '50_50' | '100_student' | 'custom'>('50_50');

  // Saving State
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Audio Element & WebAudio Refs
  const teacherAudioRef = useRef<HTMLAudioElement | null>(null);
  const studentAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordStartTimeRef = useRef<number>(0);
  const recordIntervalRef = useRef<any>(null);
  const countInTimerRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);

  // 1. Resolve Teacher Audio Blob / URL
  useEffect(() => {
    let active = true;
    let createdBlobUrl: string | null = null;

    if (teacherAudioUrl.startsWith('campus_blob_') || teacherAudioUrl.startsWith('campus_audio_') || teacherAudioUrl.startsWith('offline://')) {
      getBlob(teacherAudioUrl).then(raw => {
        if (active && raw) {
          const finalBlob = raw instanceof Blob ? raw : new Blob([raw], { type: 'audio/webm' });
          createdBlobUrl = URL.createObjectURL(finalBlob);
          setResolvedTeacherUrl(createdBlobUrl);
        }
      }).catch(err => console.warn('[DuettDeckModal] Failed to load teacher blob:', err));
    } else {
      setResolvedTeacherUrl(teacherAudioUrl);
    }

    return () => {
      active = false;
      if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
    };
  }, [teacherAudioUrl]);

  // Clean up student blob URL on unmount or reset
  useEffect(() => {
    return () => {
      if (studentAudioUrl && studentAudioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(studentAudioUrl);
      }
    };
  }, [studentAudioUrl]);

  // Synchronous Playback Animation Loop
  const updatePlaybackProgress = () => {
    if (teacherAudioRef.current && !teacherAudioRef.current.paused) {
      const t = teacherAudioRef.current.currentTime;
      setCurrentTime(t);

      // Also ensure student audio follows with latency offset
      if (studentAudioRef.current && !studentAudioRef.current.paused) {
        const expectedStudentTime = Math.max(0, t - (latencyOffsetMs / 1000));
        // Soft sync if drift exceeds 40ms
        if (Math.abs(studentAudioRef.current.currentTime - expectedStudentTime) > 0.04) {
          studentAudioRef.current.currentTime = expectedStudentTime;
        }
      }
      animFrameRef.current = requestAnimationFrame(updatePlaybackProgress);
    } else {
      setIsPlaying(false);
    }
  };

  const handleMasterTogglePlay = () => {
    if (isPlaying) {
      // Pause both
      if (teacherAudioRef.current) teacherAudioRef.current.pause();
      if (studentAudioRef.current) studentAudioRef.current.pause();
      setIsPlaying(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    } else {
      // Play both synchronously
      const tAudio = teacherAudioRef.current;
      const sAudio = studentAudioRef.current;
      if (!tAudio) return;

      if (tAudio.ended || tAudio.currentTime >= tAudio.duration) {
        tAudio.currentTime = 0;
        setCurrentTime(0);
      }

      tAudio.volume = teacherVolume;
      tAudio.play().then(() => {
        setIsPlaying(true);
        if (sAudio && studentAudioUrl) {
          sAudio.volume = studentVolume;
          sAudio.currentTime = Math.max(0, tAudio.currentTime - (latencyOffsetMs / 1000));
          sAudio.play().catch(e => console.warn('[DuettDeckModal] Student play error:', e));
        }
        animFrameRef.current = requestAnimationFrame(updatePlaybackProgress);
      }).catch(err => console.warn('[DuettDeckModal] Teacher play error:', err));
    }
  };

  const handleStopAndReset = () => {
    if (teacherAudioRef.current) {
      teacherAudioRef.current.pause();
      teacherAudioRef.current.currentTime = 0;
    }
    if (studentAudioRef.current) {
      studentAudioRef.current.pause();
      studentAudioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  };

  // Mix Presets Handler
  const handleApplyPreset = (preset: '100_teacher' | '50_50' | '100_student') => {
    setActiveMixPreset(preset);
    if (preset === '100_teacher') {
      setTeacherVolume(1.0);
      setStudentVolume(0.0);
      if (teacherAudioRef.current) teacherAudioRef.current.volume = 1.0;
      if (studentAudioRef.current) studentAudioRef.current.volume = 0.0;
    } else if (preset === '50_50') {
      setTeacherVolume(1.0);
      setStudentVolume(1.0);
      if (teacherAudioRef.current) teacherAudioRef.current.volume = 1.0;
      if (studentAudioRef.current) studentAudioRef.current.volume = 1.0;
    } else if (preset === '100_student') {
      setTeacherVolume(0.0);
      setStudentVolume(1.0);
      if (teacherAudioRef.current) teacherAudioRef.current.volume = 0.0;
      if (studentAudioRef.current) studentAudioRef.current.volume = 1.0;
    }
  };

  // 2. Start Synchronous Recording with 1-Measure Count-In
  const handleStartRecording = async () => {
    try {
      handleStopAndReset();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true
        }
      });

      // Prepare MediaRecorder
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : MediaRecorder.isTypeSupported('audio/mp4') 
          ? 'audio/mp4' 
          : 'audio/webm';
      
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setStudentAudioBlob(blob);
        const newUrl = URL.createObjectURL(blob);
        setStudentAudioUrl(newUrl);
        setIsRecording(false);
        if (recordIntervalRef.current) {
          clearInterval(recordIntervalRef.current);
          recordIntervalRef.current = null;
        }
      };

      mediaRecorderRef.current = recorder;

      // 1-Bar Count-in (4 clicks based on teacherBpm)
      const effectiveBpm = Math.max(40, Math.min(220, teacherBpm || 100));
      const intervalMs = (60 / effectiveBpm) * 1000;
      let count = 4;
      setCountInStep(count);
      playCountInBeep(true);

      countInTimerRef.current = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setCountInStep(count);
          playCountInBeep(false);
        } else {
          if (countInTimerRef.current) {
            clearInterval(countInTimerRef.current);
            countInTimerRef.current = null;
          }
          setCountInStep(null);

          // Count-in finished: Start Track A & Recording B simultaneously!
          if (teacherAudioRef.current) {
            teacherAudioRef.current.currentTime = 0;
            teacherAudioRef.current.volume = teacherVolume;
            teacherAudioRef.current.play().catch(err => console.warn('Teacher playback err:', err));
          }

          recorder.start(100);
          setIsRecording(true);
          recordStartTimeRef.current = Date.now();
          setRecordDuration(0);

          recordIntervalRef.current = setInterval(() => {
            const elapsed = Math.floor((Date.now() - recordStartTimeRef.current) / 1000);
            setRecordDuration(elapsed);
          }, 1000);
        }
      }, intervalMs);

    } catch (err) {
      console.error('[DuettDeckModal] Failed to start recording:', err);
      alert('Mikrofonzugriff nicht möglich oder verweigert.');
    }
  };

  const handleStopRecording = () => {
    if (countInTimerRef.current) {
      clearInterval(countInTimerRef.current);
      countInTimerRef.current = null;
      setCountInStep(null);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (teacherAudioRef.current) {
      teacherAudioRef.current.pause();
    }
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    setIsRecording(false);
  };

  // 3. Save Student Take to Practice Studio
  const handleSaveTake = async () => {
    if (!studentAudioBlob || isSaving) return;
    setIsSaving(true);

    try {
      const takeId = `duett_take_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const storageKey = `campus_blob_${takeId}`;

      // Save blob in IndexedDB
      await storeBlob(storageKey, studentAudioBlob);

      const dur = studentDuration || recordDuration || 1;
      const cleanTitle = `Duett: ${teacherTitle.replace(/^Aufnahme:\s*/i, '')}`;
      const nowIso = new Date().toISOString();

      const newTake = {
        id: takeId,
        url: storageKey,
        title: cleanTitle,
        label: cleanTitle,
        duration: dur,
        created_at: nowIso,
        songTag: songTag || teacherTitle,
        isDuettTake: true,
        latencyOffsetMs: latencyOffsetMs
      };

      // Append to LocalStorage junior recordings
      const juniorKey = `campus_junior_recordings_${studentId}`;
      const stored = localStorage.getItem(juniorKey);
      let list = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(list)) list = [];
      list.unshift(newTake);
      localStorage.setItem(juniorKey, JSON.stringify(list));

      if (onSaveStudentTake) {
        onSaveStudentTake(newTake);
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);

    } catch (err) {
      console.error('[DuettDeckModal] Failed to save student take:', err);
      alert('Speichern fehlgeschlagen.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const formatSecs = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Waveform visualization mockup bars (40 bars)
  const teacherWaveform = [30, 45, 70, 50, 80, 95, 65, 40, 85, 90, 60, 45, 80, 100, 75, 55, 70, 85, 60, 40, 50, 75, 90, 65, 80, 95, 70, 45, 60, 85, 90, 65, 50, 70, 85, 60, 45, 35, 25, 20];
  const studentWaveform = [25, 40, 60, 45, 75, 90, 70, 45, 80, 85, 65, 50, 85, 95, 70, 50, 65, 80, 65, 45, 55, 70, 85, 60, 75, 90, 65, 50, 65, 80, 85, 60, 45, 65, 80, 55, 40, 30, 20, 15];

  const teacherProgressRatio = teacherDuration > 0 ? currentTime / teacherDuration : 0;
  const effectiveStudentTime = Math.max(0, currentTime - (latencyOffsetMs / 1000));
  const studentProgressRatio = studentDuration > 0 ? effectiveStudentTime / studentDuration : 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 11000,
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? '0' : '16px'
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Duett-Deck"
    >
      {/* Hidden Audio Elements for Playback */}
      <audio 
        ref={teacherAudioRef} 
        src={resolvedTeacherUrl} 
        preload="auto"
        onLoadedMetadata={() => {
          if (teacherAudioRef.current?.duration) {
            setTeacherDuration(teacherAudioRef.current.duration);
          }
        }}
        onEnded={() => {
          if (!studentAudioRef.current || studentAudioRef.current.ended) {
            setIsPlaying(false);
          }
        }}
      />
      {studentAudioUrl && (
        <audio 
          ref={studentAudioRef} 
          src={studentAudioUrl} 
          preload="auto"
          onLoadedMetadata={() => {
            if (studentAudioRef.current?.duration) {
              setStudentDuration(studentAudioRef.current.duration);
            }
          }}
          onEnded={() => {
            if (!teacherAudioRef.current || teacherAudioRef.current.ended) {
              setIsPlaying(false);
            }
          }}
        />
      )}

      <div
        style={{
          width: '100%',
          maxWidth: isTablet ? '720px' : '680px',
          maxHeight: isMobile ? '92vh' : '90vh',
          background: '#ffffff',
          borderRadius: isMobile ? '24px 24px 0 0' : '28px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}
      >
        {/* Top Navigation / Header */}
        <div
          style={{
            padding: isMobile ? '12px 16px' : '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div
              style={{
                width: isMobile ? '36px' : '40px',
                height: isMobile ? '36px' : '40px',
                minWidth: isMobile ? '36px' : '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 3px 10px rgba(21, 128, 61, 0.28)',
                flexShrink: 0
              }}
            >
              <Layers size={isMobile ? 18 : 20} strokeWidth={2.4} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.66rem', fontWeight: 900, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Synchrones Duett-Deck
              </div>
              <h3 style={{ margin: 0, fontSize: isMobile ? '0.96rem' : '1.08rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {teacherTitle}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '44px',
              height: '44px',
              minWidth: '44px',
              minHeight: '44px',
              borderRadius: '50%',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0
            }}
            className="hover-scale-mini"
            title="Schließen"
            aria-label="Duett-Deck schließen"
          >
            <X size={18} strokeWidth={2.4} />
          </button>
        </div>

        {/* Workstation Body (Scrollable on small mobile displays) */}
        <div style={{ padding: isMobile ? '14px 16px' : '20px', display: 'flex', flexDirection: 'column', gap: isMobile ? '12px' : '16px', overflowY: 'auto' }}>

          {/* ══════════════════════════════════════════════════════════════════
              TRACK 1: LEHRER (STATIC TRACK A)
             ══════════════════════════════════════════════════════════════════ */}
          <div
            style={{
              background: '#f8fafc',
              borderRadius: '20px',
              border: '1.5px solid #e2e8f0',
              padding: isMobile ? '12px' : '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    background: '#e6f4ea',
                    color: '#15803d',
                    fontSize: '0.64rem',
                    fontWeight: 900,
                    padding: '3px 8px',
                    borderRadius: '100px',
                    border: '1px solid #bbf7d0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}
                >
                  Spur 1: Lehrkraft (Fixiert)
                </span>
                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>
                  {formatSecs(currentTime)} / {formatSecs(teacherDuration)}
                </span>
              </div>

              {/* Volume Slider Teacher */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minHeight: '36px' }}>
                {teacherVolume === 0 ? <VolumeX size={16} color="#94a3b8" /> : <Volume2 size={16} color="#15803d" />}
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05"
                  value={teacherVolume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setTeacherVolume(v);
                    if (teacherAudioRef.current) teacherAudioRef.current.volume = v;
                    setActiveMixPreset('custom');
                  }}
                  style={{ width: isMobile ? '65px' : '80px', height: '28px', accentColor: '#15803d', cursor: 'pointer' }}
                  title={`Lehrer Lautstärke: ${Math.round(teacherVolume * 100)}%`}
                />
                <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#475569', minWidth: '32px' }}>
                  {Math.round(teacherVolume * 100)}%
                </span>
              </div>
            </div>

            {/* Waveform Teacher */}
            <div
              onClick={(e) => {
                if (!teacherDuration) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const newRatio = Math.max(0, Math.min(1, clickX / rect.width));
                const newT = newRatio * teacherDuration;
                setCurrentTime(newT);
                if (teacherAudioRef.current) teacherAudioRef.current.currentTime = newT;
                if (studentAudioRef.current) studentAudioRef.current.currentTime = Math.max(0, newT - (latencyOffsetMs / 1000));
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                height: isMobile ? '38px' : '42px',
                cursor: 'pointer',
                background: '#ffffff',
                padding: '4px 10px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
              }}
            >
              {teacherWaveform.map((h, idx) => {
                const barRatio = idx / teacherWaveform.length;
                const isPast = barRatio <= teacherProgressRatio;
                return (
                  <div
                    key={`tw_${idx}`}
                    style={{
                      flex: 1,
                      height: `${h}%`,
                      background: isPast ? '#16a34a' : '#cbd5e1',
                      borderRadius: '4px',
                      transition: 'background 0.1s ease'
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              TRACK 2: SCHÜLER (RECORD & LATENCY ADJUSTABLE TRACK B)
             ══════════════════════════════════════════════════════════════════ */}
          <div
            style={{
              background: studentAudioUrl ? '#f5f3ff' : '#fafafa',
              borderRadius: '20px',
              border: studentAudioUrl ? '1.5px solid #ddd6fe' : '1.5px dashed #cbd5e1',
              padding: isMobile ? '12px' : '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    background: studentAudioUrl ? '#ede9fe' : '#f1f5f9',
                    color: studentAudioUrl ? '#6d28d9' : '#64748b',
                    fontSize: '0.64rem',
                    fontWeight: 900,
                    padding: '3px 8px',
                    borderRadius: '100px',
                    border: studentAudioUrl ? '1px solid #c4b5fd' : '1px solid #e2e8f0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}
                >
                  Spur 2: {studentFirstName} (Schüler)
                </span>
                {studentAudioUrl && (
                  <span style={{ fontSize: '0.74rem', color: '#6d28d9', fontWeight: 700 }}>
                    {formatSecs(Math.max(0, currentTime - (latencyOffsetMs / 1000)))} / {formatSecs(studentDuration)}
                  </span>
                )}
              </div>

              {/* Volume Slider Student (if audio exists) */}
              {studentAudioUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minHeight: '36px' }}>
                  {studentVolume === 0 ? <VolumeX size={16} color="#94a3b8" /> : <Volume2 size={16} color="#7c3aed" />}
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05"
                    value={studentVolume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setStudentVolume(v);
                      if (studentAudioRef.current) studentAudioRef.current.volume = v;
                      setActiveMixPreset('custom');
                    }}
                    style={{ width: isMobile ? '65px' : '80px', height: '28px', accentColor: '#7c3aed', cursor: 'pointer' }}
                    title={`Schüler Lautstärke: ${Math.round(studentVolume * 100)}%`}
                  />
                  <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#475569', minWidth: '32px' }}>
                    {Math.round(studentVolume * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* If NO recording yet: Recording Action Trigger */}
            {!studentAudioUrl && !isRecording && countInStep === null && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: isMobile ? '18px 12px' : '24px 16px',
                  gap: '12px',
                  textAlign: 'center'
                }}
              >
                <button
                  type="button"
                  onClick={handleStartRecording}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    padding: isMobile ? '12px 20px' : '14px 26px',
                    minHeight: '48px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#ffffff',
                    fontSize: isMobile ? '0.88rem' : '0.96rem',
                    fontWeight: 950,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 6px 18px rgba(220, 38, 38, 0.35)',
                    transition: 'all 0.18s ease',
                    width: isMobile ? '100%' : 'auto'
                  }}
                  className="hover-scale"
                >
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffffff', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
                  <span>Aufnahme starten (mit 1 Takt Einzähler)</span>
                </button>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650, lineHeight: 1.35 }}>
                  🎧 Tipp: Spiele am besten mit Kopfhörern mit, um den Klick sauber zu hören!
                </div>
              </div>
            )}

            {/* During Count-In */}
            {countInStep !== null && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px',
                  gap: '8px'
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Bereit machen...
                </div>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                    border: '2px solid #ef4444',
                    color: '#dc2626',
                    fontSize: '1.8rem',
                    fontWeight: 950,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)'
                  }}
                >
                  {countInStep}
                </div>
              </div>
            )}

            {/* Active Recording State */}
            {isRecording && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: isMobile ? '10px 12px' : '12px 16px',
                  background: '#fef2f2',
                  border: '1.5px solid #fca5a5',
                  borderRadius: '16px',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite', flexShrink: 0 }} />
                  <span style={{ fontSize: isMobile ? '0.78rem' : '0.86rem', fontWeight: 900, color: '#991b1b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Aufnahme läuft ({formatSecs(recordDuration)})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleStopRecording}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    minHeight: '40px',
                    borderRadius: '12px',
                    background: '#dc2626',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 900,
                    border: 'none',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                  className="hover-scale-mini"
                >
                  <Square size={14} fill="#ffffff" />
                  <span>Stopp</span>
                </button>
              </div>
            )}

            {/* If Student Audio IS recorded: Render Student Waveform */}
            {studentAudioUrl && !isRecording && countInStep === null && (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    height: isMobile ? '38px' : '42px',
                    background: '#ffffff',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    border: '1px solid #ddd6fe',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Visual Latency Offset Overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${Math.max(0, (latencyOffsetMs / 300) * 15)}%`,
                      background: latencyOffsetMs > 0 ? 'rgba(124, 58, 237, 0.12)' : 'transparent',
                      pointerEvents: 'none'
                    }}
                  />
                  {studentWaveform.map((h, idx) => {
                    const barRatio = idx / studentWaveform.length;
                    const isPast = barRatio <= studentProgressRatio;
                    return (
                      <div
                        key={`sw_${idx}`}
                        style={{
                          flex: 1,
                          height: `${h}%`,
                          background: isPast ? '#7c3aed' : '#e9d5ff',
                          borderRadius: '4px',
                          transition: 'background 0.1s ease'
                        }}
                      />
                    );
                  })}
                </div>

                {/* Retake Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#475569',
                      padding: '6px 12px',
                      minHeight: '36px',
                      borderRadius: '10px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                    className="hover-scale-mini"
                  >
                    <RotateCcw size={13} />
                    <span>Nochmal aufnehmen</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              LATENCY OFFSET SLIDER (+/- MS)
             ══════════════════════════════════════════════════════════════════ */}
          {studentAudioUrl && (
            <div
              style={{
                background: '#f8fafc',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                padding: isMobile ? '10px 12px' : '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sliders size={15} color="#475569" />
                  <span style={{ fontSize: isMobile ? '0.72rem' : '0.76rem', fontWeight: 900, color: '#334155' }}>
                    Latenz-Kompensation (Timing-Feinschliff)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '0.76rem',
                      fontWeight: 900,
                      color: latencyOffsetMs === 0 ? '#64748b' : '#7c3aed',
                      background: latencyOffsetMs === 0 ? '#f1f5f9' : '#ede9fe',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      border: latencyOffsetMs === 0 ? '1px solid #e2e8f0' : '1px solid #ddd6fe'
                    }}
                  >
                    {latencyOffsetMs > 0 ? `+${latencyOffsetMs} ms` : `${latencyOffsetMs} ms`}
                  </span>
                  {latencyOffsetMs !== 0 && (
                    <button
                      type="button"
                      onClick={() => setLatencyOffsetMs(0)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        fontSize: '0.70rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        padding: '4px'
                      }}
                    >
                      Reset (0 ms)
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '36px' }}>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>-300 ms</span>
                <input 
                  type="range"
                  min="-300"
                  max="300"
                  step="5"
                  value={latencyOffsetMs}
                  onChange={(e) => setLatencyOffsetMs(parseInt(e.target.value, 10))}
                  style={{ flex: 1, height: '28px', accentColor: '#7c3aed', cursor: 'pointer' }}
                  title="Schiebe nach links/rechts um Latenzen auszugleichen"
                />
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>+300 ms</span>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              3 QUICK-SELECT PRESET BUTTONS (100% Lehrer / 50-50 / 100% Schüler)
             ══════════════════════════════════════════════════════════════════ */}
          {studentAudioUrl && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.70rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Mix-Abhören:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  { key: '100_teacher', label: '100% Lehrer', desc: 'Lehrer Solo' },
                  { key: '50_50', label: '50 / 50 Duett', desc: 'Beide Spuren' },
                  { key: '100_student', label: '100% Schüler', desc: 'Schüler Solo' }
                ].map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => handleApplyPreset(p.key as any)}
                    style={{
                      padding: isMobile ? '8px 4px' : '10px 8px',
                      minHeight: isMobile ? '44px' : '48px',
                      borderRadius: '12px',
                      border: activeMixPreset === p.key ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
                      background: activeMixPreset === p.key ? '#f0fdf4' : '#ffffff',
                      color: activeMixPreset === p.key ? '#15803d' : '#475569',
                      fontSize: isMobile ? '0.72rem' : '0.78rem',
                      fontWeight: activeMixPreset === p.key ? 950 : 800,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '2px',
                      boxShadow: activeMixPreset === p.key ? '0 2px 8px rgba(22, 163, 74, 0.15)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover-scale-mini"
                  >
                    <span style={{ whiteSpace: 'nowrap' }}>{p.label}</span>
                    <span style={{ fontSize: '0.60rem', fontWeight: 650, color: activeMixPreset === p.key ? '#16a34a' : '#94a3b8', whiteSpace: 'nowrap' }}>
                      {p.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Bottom Footer / Master Controls */}
        <div
          style={{
            padding: isMobile ? '12px 16px' : '16px 20px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexShrink: 0
          }}
        >
          {/* Master Play/Pause and Reset */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleMasterTogglePlay}
              disabled={isRecording || countInStep !== null}
              style={{
                width: isMobile ? '44px' : '48px',
                height: isMobile ? '44px' : '48px',
                minWidth: isMobile ? '44px' : '48px',
                minHeight: isMobile ? '44px' : '48px',
                borderRadius: '50%',
                background: isPlaying
                  ? 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)'
                  : 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale"
              title={isPlaying ? 'Pause' : 'Synchron abspielen'}
              aria-label={isPlaying ? 'Pause' : 'Synchron abspielen'}
            >
              {isPlaying ? <Pause size={isMobile ? 18 : 20} fill="#ffffff" /> : <Play size={isMobile ? 18 : 20} fill="#ffffff" style={{ marginLeft: '2px' }} />}
            </button>

            <button
              type="button"
              onClick={handleStopAndReset}
              style={{
                width: isMobile ? '38px' : '42px',
                height: isMobile ? '38px' : '42px',
                minWidth: isMobile ? '38px' : '42px',
                minHeight: isMobile ? '38px' : '42px',
                borderRadius: '12px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              className="hover-scale-mini"
              title="Von vorne anfangen"
              aria-label="Von vorne anfangen"
            >
              <RotateCcw size={16} />
            </button>

            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginLeft: '2px' }}>
              {formatSecs(currentTime)}
            </span>
          </div>

          {/* Right Action: Save Take */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {studentAudioUrl && (
              <button
                type="button"
                onClick={handleSaveTake}
                disabled={isSaving || saveSuccess}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: isMobile ? '10px 14px' : '10px 20px',
                  minHeight: '44px',
                  borderRadius: '14px',
                  background: saveSuccess 
                    ? '#15803d' 
                    : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  color: '#ffffff',
                  fontSize: isMobile ? '0.78rem' : '0.86rem',
                  fontWeight: 950,
                  border: 'none',
                  cursor: isSaving ? 'wait' : 'pointer',
                  boxShadow: '0 4px 12px rgba(21, 128, 61, 0.28)',
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale"
              >
                {saveSuccess ? (
                  <>
                    <Check size={16} strokeWidth={2.8} />
                    <span>Gespeichert!</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>{isSaving ? 'Speichern...' : (isMobile ? 'Speichern' : 'Take im Studio speichern')}</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                padding: isMobile ? '10px 12px' : '10px 16px',
                minHeight: '44px',
                borderRadius: '14px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#64748b',
                fontSize: '0.84rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
              className="hover-scale-mini"
            >
              Fertig
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
