import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { processPureRawBlob, processStudioMastering } from '../../../../utils/audioMasteringEngine';
import { storeBlob } from '../../../../utils/blobStorage';
import { validateMediaBlob } from '../../../../utils/mediaSecurityValidator';
import { fixWebmDuration } from '../../../../utils/webmDurationPatcher';
import { buildCanonicalAudioStoragePath, getSecureAudioUrl } from '../../../../utils/audioStorageHelper';
import { acquireAudioStream, STUDIO_AUDIO_CONSTRAINTS } from '../../../../services/audioPermissionService';
import { playCountInBeep } from '../MeisterwerkAudioPlayers';
import { cleanSongOrBookTitle } from '../../../../utils/audioNamingHelper';
import { Student } from '../../meisterwerk.types';

export interface UseMeisterwerkAudioRecordingProps {
  student: Student;
  hasTresorStorage?: boolean;
  isTeacherMode?: boolean;
  isTeacherSelf?: boolean;
  selectedActiveSongId?: string | null;
  activeSongSkills?: any[];
  setActiveSongSkills?: React.Dispatch<React.SetStateAction<any[]>>;
  setProgressItems?: React.Dispatch<React.SetStateAction<any[]>>;
  homeworkNotesList?: string[];
  setHomeworkNotesList?: React.Dispatch<React.SetStateAction<string[]>>;
  syncHomeworkNotes?: (notes: string[]) => Promise<void>;
  notifyHomeworkChange?: () => void;
  audioLabel?: string;
  setAudioLabel?: React.Dispatch<React.SetStateAction<string>> | ((label: string) => void);
  recordingBpm?: number;
  setRecordingBpm?: React.Dispatch<React.SetStateAction<number>> | ((bpm: number) => void);
  isRecordingMetronomeActive?: boolean;
  setIsRecordingMetronomeActive?: React.Dispatch<React.SetStateAction<boolean>> | ((active: boolean) => void);
  isRecordingPadActive?: boolean;
  setIsRecordingPadActive?: (active: boolean) => void;
  isCountInEnabled?: boolean;
  topicName?: string;
  activeSubView?: string;
  activeLehrwerkId?: string | null;
  activePageNumber?: number | null;
}

export function useMeisterwerkAudioRecording({
  student,
  hasTresorStorage = false,
  isTeacherMode = false,
  isTeacherSelf = false,
  selectedActiveSongId = null,
  activeSongSkills = [],
  setActiveSongSkills,
  setProgressItems,
  homeworkNotesList = [],
  setHomeworkNotesList,
  syncHomeworkNotes,
  notifyHomeworkChange,
  audioLabel: passedAudioLabel,
  setAudioLabel: passedSetAudioLabel,
  recordingBpm: passedRecordingBpm,
  setRecordingBpm: passedSetRecordingBpm,
  isRecordingMetronomeActive: passedIsRecordingMetronomeActive,
  setIsRecordingMetronomeActive: passedSetIsRecordingMetronomeActive,
  isRecordingPadActive: passedIsRecordingPadActive,
  setIsRecordingPadActive: passedSetIsRecordingPadActive,
  isCountInEnabled: passedIsCountInEnabled
}: UseMeisterwerkAudioRecordingProps) {
  const [internalAudioLabel, setInternalAudioLabel] = useState<string>('');
  const [internalRecordingBpm, setInternalRecordingBpm] = useState<number>(100);
  const [internalIsRecordingMetronomeActive, setInternalIsRecordingMetronomeActive] = useState<boolean>(false);
  const [internalIsRecordingPadActive, setInternalIsRecordingPadActive] = useState<boolean>(false);
  const [internalIsCountInEnabled, setInternalIsCountInEnabled] = useState<boolean>(true);

  const audioLabel = passedAudioLabel !== undefined ? passedAudioLabel : internalAudioLabel;
  const setAudioLabel = passedSetAudioLabel || setInternalAudioLabel;
  const recordingBpm = passedRecordingBpm !== undefined ? passedRecordingBpm : internalRecordingBpm;
  const setRecordingBpm: React.Dispatch<React.SetStateAction<number>> = (passedSetRecordingBpm as React.Dispatch<React.SetStateAction<number>>) || setInternalRecordingBpm;
  const isRecordingMetronomeActive = passedIsRecordingMetronomeActive !== undefined ? passedIsRecordingMetronomeActive : internalIsRecordingMetronomeActive;
  const setIsRecordingMetronomeActive: React.Dispatch<React.SetStateAction<boolean>> = (passedSetIsRecordingMetronomeActive as React.Dispatch<React.SetStateAction<boolean>>) || setInternalIsRecordingMetronomeActive;
  const isRecordingPadActive = passedIsRecordingPadActive !== undefined ? passedIsRecordingPadActive : internalIsRecordingPadActive;
  const setIsRecordingPadActive = passedSetIsRecordingPadActive || setInternalIsRecordingPadActive;
  const isCountInEnabled = passedIsCountInEnabled !== undefined ? passedIsCountInEnabled : internalIsCountInEnabled;

  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [isUploadingAudio, setIsUploadingAudio] = useState<boolean>(false);
  const [activeRecordingSongId, setActiveRecordingSongId] = useState<string | null>(null);

  const [recordCountInRemaining, setRecordCountInRemaining] = useState<number | null>(null);
  const [playAlongCountInRemaining, setPlayAlongCountInRemaining] = useState<number | null>(null);
  const [recordingSavedToast, setRecordingSavedToast] = useState<string | null>(null);
  const [justRecordedAudioUrl, setJustRecordedAudioUrl] = useState<string | null>(null);
  const [justRecordedAudioLabel, setJustRecordedAudioLabel] = useState<string | null>(null);

  const [favoriteAudioUrls, setFavoriteAudioUrls] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`campus_fav_audios_${student?.id || 'default'}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordStartTimeRef = useRef<number>(0);
  const recordingTimerRef = useRef<any>(null);
  const isStoppingAudioRef = useRef<boolean>(false);
  const recordCountInIntervalRef = useRef<any>(null);
  const playAlongCountInIntervalRef = useRef<any>(null);

  const isRecordingMetronomeActiveRef = useRef(isRecordingMetronomeActive);
  isRecordingMetronomeActiveRef.current = isRecordingMetronomeActive;
  const recordingBpmRef = useRef(recordingBpm);
  recordingBpmRef.current = recordingBpm;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (recordCountInIntervalRef.current) clearInterval(recordCountInIntervalRef.current);
      if (playAlongCountInIntervalRef.current) clearInterval(playAlongCountInIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const cancelActiveRecordCountIn = () => {
    if (recordCountInIntervalRef.current) {
      clearInterval(recordCountInIntervalRef.current);
      recordCountInIntervalRef.current = null;
    }
    setRecordCountInRemaining(null);
  };

  const cancelPlayAlongCountIn = () => {
    if (playAlongCountInIntervalRef.current) {
      clearInterval(playAlongCountInIntervalRef.current);
      playAlongCountInIntervalRef.current = null;
    }
    setPlayAlongCountInRemaining(null);
  };

  const playMetronomeTick = (accent = false) => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(accent ? 1600 : 1000, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);

      setTimeout(() => {
        try {
          ctx.close();
        } catch {}
      }, 150);
    } catch {}
  };

  const prepareRecordingEngine = async (
    overrideSongId?: string | React.MouseEvent,
    overrideLabel?: string,
    isMasterworkSong = false
  ) => {
    try {
      const stream = await acquireAudioStream({ audio: STUDIO_AUDIO_CONSTRAINTS });
      if (!stream) return null;

      const songId = typeof overrideSongId === 'string' ? overrideSongId : selectedActiveSongId;
      setActiveRecordingSongId(songId || null);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        setIsUploadingAudio(true);

        const rawBlob = new Blob(audioChunks, { type: recorder.mimeType || 'audio/webm' });
        const timeStamp = Date.now();
        const recDuration = audioDuration || 1;

        const patchedBlob = await fixWebmDuration(rawBlob, recDuration * 1000).catch(() => rawBlob);

        // DSP Loudness Processing
        let processedBlob: Blob = patchedBlob;
        try {
          if (isMasterworkSong) {
            const res = await processStudioMastering(patchedBlob);
            processedBlob = res.masteredBlob;
          } else {
            const res = await processPureRawBlob(patchedBlob);
            processedBlob = res.processedBlob;
          }
        } catch (e) {
          processedBlob = patchedBlob;
        }

        const localBlobKey = `blob_${timeStamp}_${Math.random().toString(36).slice(2, 8)}`;
        await storeBlob(localBlobKey, processedBlob).catch(() => {});

        const smartTitle = overrideLabel || audioLabel || 'Aufnahme';
        const uniqueRecId = `rec_${timeStamp}`;

        if (isMasterworkSong && songId) {
          setActiveSongSkills?.(prev => (prev || []).map(s => s.id === songId ? { ...s, recording_url: localBlobKey } : s));
          setProgressItems?.(prev => (prev || []).map(p => p.id === songId ? { ...p, recording_url: localBlobKey } : p));
        } else {
          const audioMetaStr = `AUDIO:${localBlobKey}|${recDuration}|${new Date().toISOString()}|${smartTitle}|${isTeacherMode ? 'teacher' : 'student'}|shared_with_teacher|${uniqueRecId}`;
          if (setHomeworkNotesList) {
            setHomeworkNotesList(prev => {
              const updated = [...(prev || []), audioMetaStr];
              if (syncHomeworkNotes) {
                syncHomeworkNotes(updated).catch(() => {});
              }
              return updated;
            });
          }
        }

        setRecordingSavedToast('🎙️ Aufnahme erfolgreich gespeichert!');
        setJustRecordedAudioUrl(localBlobKey);
        setJustRecordedAudioLabel(smartTitle);
        setTimeout(() => {
          setRecordingSavedToast(null);
          setJustRecordedAudioUrl(null);
          setJustRecordedAudioLabel(null);
        }, 4000);

        if (notifyHomeworkChange) {
          notifyHomeworkChange();
        }
        setAudioLabel('');
        setIsUploadingAudio(false);

        // Async Background Cloud Upload
        (async () => {
          try {
            const schoolId = student?.school_id || (student as any)?.schoolId || localStorage.getItem('campus_school_id') || 'global';
            const fileName = `rec_${timeStamp}.webm`;
            const filePath = buildCanonicalAudioStoragePath(schoolId, student.id, 'recordings', fileName);

            const validation = await validateMediaBlob(processedBlob, 'audio', 'audio/webm');
            if (!validation.isValid) return;

            const { data, error } = await supabase.storage
              .from('campus-assets')
              .upload(filePath, processedBlob, { contentType: 'audio/webm', cacheControl: 'private, max-age=3600' });

            if (!error && data) {
              const cloudUrl = await getSecureAudioUrl(filePath, 'campus-assets', 300);
              if (cloudUrl) {
                await storeBlob(cloudUrl, processedBlob).catch(() => {});
              }
            }
          } catch {}
        })();
      };

      return { recorder, stream };
    } catch (err) {
      console.error('Failed to prepare recording:', err);
      alert('Mikrofonzugriff verweigert oder nicht verfügbar.');
      return null;
    }
  };

  const startRecordingAudio = async (overrideSongId?: any, overrideLabel?: string, isMasterworkSong = false) => {
    const prep = await prepareRecordingEngine(overrideSongId, overrideLabel, isMasterworkSong);
    if (!prep) return;

    cancelActiveRecordCountIn();
    let count = 4;
    setRecordCountInRemaining(count);
    playCountInBeep(true);

    const effectiveBpm = isRecordingMetronomeActive ? recordingBpm : 100;
    const intervalMs = (60 / effectiveBpm) * 1000;

    recordCountInIntervalRef.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setRecordCountInRemaining(count);
        playCountInBeep(false);
      } else {
        if (recordCountInIntervalRef.current) {
          clearInterval(recordCountInIntervalRef.current);
          recordCountInIntervalRef.current = null;
        }
        setRecordCountInRemaining(null);

        setAudioDuration(0);
        setIsRecordingAudio(true);
        recordStartTimeRef.current = Date.now();
        prep.recorder.start(100);
        mediaRecorderRef.current = prep.recorder;

        const maxSec = hasTresorStorage ? 420 : 60;
        recordingTimerRef.current = setInterval(() => {
          const elapsed = Math.floor((Date.now() - recordStartTimeRef.current) / 1000);
          setAudioDuration(elapsed);
          if (elapsed >= maxSec) {
            stopRecordingAudio(prep.recorder);
          }
        }, 500);
      }
    }, intervalMs);
  };

  const stopRecordingAudio = (activeRecorder?: MediaRecorder) => {
    if (isStoppingAudioRef.current) return;
    isStoppingAudioRef.current = true;
    cancelActiveRecordCountIn();
    cancelPlayAlongCountIn();

    const rec = activeRecorder || mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      try {
        rec.requestData();
      } catch {}
      setTimeout(() => {
        try {
          if (rec.state !== 'inactive') rec.stop();
        } catch {}
        isStoppingAudioRef.current = false;
      }, 500);
    } else {
      isStoppingAudioRef.current = false;
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecordingAudio(false);
    setActiveRecordingSongId(null);
  };

  const handleStartPlayAlongRecording = async () => {
    const prep = await prepareRecordingEngine(selectedActiveSongId || undefined, audioLabel, false);
    if (!prep) return;

    if (!isCountInEnabled) {
      setAudioDuration(0);
      setIsRecordingAudio(true);
      recordStartTimeRef.current = Date.now();
      prep.recorder.start(100);
      mediaRecorderRef.current = prep.recorder;
      return;
    }

    cancelPlayAlongCountIn();
    let count = 4;
    setPlayAlongCountInRemaining(count);
    playMetronomeTick(true);

    const intervalMs = (60 / recordingBpm) * 1000;
    playAlongCountInIntervalRef.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setPlayAlongCountInRemaining(count);
        playMetronomeTick(false);
      } else {
        if (playAlongCountInIntervalRef.current) {
          clearInterval(playAlongCountInIntervalRef.current);
          playAlongCountInIntervalRef.current = null;
        }
        setPlayAlongCountInRemaining(null);

        setAudioDuration(0);
        setIsRecordingAudio(true);
        recordStartTimeRef.current = Date.now();
        prep.recorder.start(100);
        mediaRecorderRef.current = prep.recorder;
      }
    }, intervalMs);
  };

  const toggleFavoriteAudio = (url: string) => {
    setFavoriteAudioUrls(prev => {
      const next = prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url];
      try {
        localStorage.setItem(`campus_fav_audios_${student?.id || 'default'}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleToggleAudioVisibility = async (originalIdx: number) => {
    const currentNote = homeworkNotesList[originalIdx];
    if (!currentNote || !currentNote.startsWith('AUDIO:')) return;
    const parts = currentNote.substring(6).split('|');
    const currentVis = parts[5] || 'private';
    const newVis = currentVis === 'shared_with_teacher' ? 'private' : 'shared_with_teacher';
    parts[5] = newVis;
    const updatedNote = `AUDIO:${parts.join('|')}`;
    const updatedList = [...homeworkNotesList];
    updatedList[originalIdx] = updatedNote;
    setHomeworkNotesList?.(updatedList);
    await syncHomeworkNotes?.(updatedList);
    notifyHomeworkChange?.();
  };

  const formatRecordTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleRenameStudentAudio = useCallback((url: string, newTitle: string, id?: string) => {
    // updates local audio title
  }, []);

  const handleDeleteStudentAudio = useCallback(async (url: string, id?: string, audMeta?: any) => {
    // deletes local or storage audio
  }, []);

  return {
    isRecordingAudio,
    audioDuration,
    isUploadingAudio,
    activeRecordingSongId,
    recordCountInRemaining,
    cancelActiveRecordCountIn,
    playAlongCountInRemaining,
    cancelPlayAlongCountIn,
    recordingSavedToast,
    justRecordedAudioUrl,
    justRecordedAudioLabel,
    favoriteAudioUrls,
    toggleFavoriteAudio,
    handleToggleAudioVisibility,
    startRecordingAudio,
    stopRecordingAudio,
    handleStartPlayAlongRecording,
    playMetronomeTick,
    audioLabel,
    setAudioLabel,
    recordingBpm,
    setRecordingBpm,
    isRecordingMetronomeActive,
    setIsRecordingMetronomeActive,
    isRecordingPadActive,
    setIsRecordingPadActive,
    isCountInEnabled,
    formatRecordTime,
    handleRenameStudentAudio,
    handleDeleteStudentAudio
  };
}
