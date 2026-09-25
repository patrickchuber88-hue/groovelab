import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { processPureRawBlob, processStudioMastering, audioBufferToWavBlob, ensureCenteredStereoAudioBuffer } from '../../../../utils/audioMasteringEngine';
import { storeBlob, deleteBlob } from '../../../../utils/blobStorage';
import { validateMediaBlob } from '../../../../utils/mediaSecurityValidator';
import { fixWebmDuration } from '../../../../utils/webmDurationPatcher';
import { buildCanonicalAudioStoragePath, getSecureAudioUrl } from '../../../../utils/audioStorageHelper';
import { acquireAudioStream, STUDIO_AUDIO_CONSTRAINTS } from '../../../../services/audioPermissionService';
import { playCountInBeep } from '../MeisterwerkAudioPlayers';
import { SharedAudioEngine } from '../../../../utils/sharedAudioEngine';
import { cleanSongOrBookTitle, formatHarmonizedAudioTitle } from '../../../../utils/audioNamingHelper';
import { getSimulatedNow } from '../../studentDateUtils';
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
  setIsCountInEnabled?: React.Dispatch<React.SetStateAction<boolean>> | ((enabled: boolean) => void);
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
  isCountInEnabled: passedIsCountInEnabled,
  setIsCountInEnabled: passedSetIsCountInEnabled,
  topicName
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
  const setIsCountInEnabled: React.Dispatch<React.SetStateAction<boolean>> = (passedSetIsCountInEnabled as React.Dispatch<React.SetStateAction<boolean>>) || setInternalIsCountInEnabled;

  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [isUploadingAudio, setIsUploadingAudio] = useState<boolean>(false);
  const [activeRecordingSongId, setActiveRecordingSongId] = useState<string | null>(null);

  const [recordCountInRemaining, setRecordCountInRemaining] = useState<number | null>(null);
  const [recordCountInMode, setRecordCountInMode] = useState<'get_ready' | 'metronome' | null>(null);
  const isPcmCaptureActiveRef = useRef<boolean>(false);
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
  const recordingMetronomeIntervalRef = useRef<any>(null);

  const isRecordingMetronomeActiveRef = useRef(isRecordingMetronomeActive);
  isRecordingMetronomeActiveRef.current = isRecordingMetronomeActive;
  const recordingBpmRef = useRef(recordingBpm);
  recordingBpmRef.current = recordingBpm;
  const isRecordingPadActiveRef = useRef(isRecordingPadActive);
  isRecordingPadActiveRef.current = isRecordingPadActive;
  const audioLabelRef = useRef(audioLabel);
  audioLabelRef.current = audioLabel;
  const selectedActiveSongIdRef = useRef(selectedActiveSongId);
  selectedActiveSongIdRef.current = selectedActiveSongId;
  const isTeacherModeRef = useRef(isTeacherMode);
  isTeacherModeRef.current = isTeacherMode;

  const generateSmartAudioTitle = (
    isTeacher: boolean, 
    customLabel?: string, 
    overrideSongId?: string,
    existingAudios?: any[]
  ): string => {
    // 1. Check if an active song or topic exists
    const activeSong = (activeSongSkills || []).find(s => (overrideSongId && s.id === overrideSongId) || (selectedActiveSongIdRef.current && s.id === selectedActiveSongIdRef.current));
    const songTitle = activeSong?.songs?.title || activeSong?.title || activeSong?.song_title;
    const cleanTopic = (topicName || "").trim();
    const meaningfulTopic = cleanTopic && !cleanTopic.toLowerCase().startsWith("hausaufgabe") && !cleanTopic.toLowerCase().startsWith("allgemein") && cleanTopic !== 'Meisterwerk-Aufnahme' ? cleanTopic : null;
    const targetSubject = songTitle || meaningfulTopic || undefined;

    return formatHarmonizedAudioTitle({
      label: customLabel,
      songTag: targetSubject,
      topic: targetSubject,
      date: getSimulatedNow().toISOString(),
      isTeacher
    }, existingAudios, isTeacher, targetSubject);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (recordCountInIntervalRef.current) clearInterval(recordCountInIntervalRef.current);
      if (playAlongCountInIntervalRef.current) clearInterval(playAlongCountInIntervalRef.current);
      if (recordingMetronomeIntervalRef.current) clearInterval(recordingMetronomeIntervalRef.current);
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
    setRecordCountInMode(null);
    isPcmCaptureActiveRef.current = false;
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      try {
        rec.stop();
        if (rec.stream) rec.stream.getTracks().forEach(t => t.stop());
      } catch {}
      mediaRecorderRef.current = null;
    }
  };

  const cancelPlayAlongCountIn = () => {
    if (playAlongCountInIntervalRef.current) {
      clearInterval(playAlongCountInIntervalRef.current);
      playAlongCountInIntervalRef.current = null;
    }
    setPlayAlongCountInRemaining(null);
  };

let sharedMetronomeAudioCtx: AudioContext | null = null;

const getSharedMetronomeAudioCtx = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  try {
    if (!sharedMetronomeAudioCtx || sharedMetronomeAudioCtx.state === 'closed') {
      sharedMetronomeAudioCtx = new AudioCtx();
    }
    if (sharedMetronomeAudioCtx.state === 'suspended') {
      sharedMetronomeAudioCtx.resume().catch(() => {});
    }
  } catch (err) {
    console.warn('[AudioRecording] Error initializing shared AudioContext:', err);
  }
  return sharedMetronomeAudioCtx;
};

  const playMetronomeTick = useCallback((accent = false) => {
    try {
      const ctx = getSharedMetronomeAudioCtx();
      if (!ctx) return;

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
    } catch (err) {
      console.warn('[AudioRecording] Metronome tick error:', err);
    }
  }, []);

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

      // 🎙️ Universal Web Audio PCM capture setup (100% Safari WebKit & Chromium compatible)
      const audioCtx = SharedAudioEngine.getContext();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume().catch(() => {});
      }

      const pcmChunksL: Float32Array[] = [];
      const pcmChunksR: Float32Array[] = [];
      let totalPcmSamples = 0;
      let pcmSourceNode: MediaStreamAudioSourceNode | null = null;
      let pcmProcessorNode: ScriptProcessorNode | null = null;
      let pcmSilentGain: GainNode | null = null;

      try {
        pcmSourceNode = audioCtx.createMediaStreamSource(stream);
        pcmProcessorNode = audioCtx.createScriptProcessor(4096, 2, 2);
        pcmSilentGain = audioCtx.createGain();
        pcmSilentGain.gain.setValueAtTime(0, audioCtx.currentTime); // Prevent echo feedback to speakers

        pcmProcessorNode.onaudioprocess = (e) => {
          if (!isPcmCaptureActiveRef.current) return;
          const inL = e.inputBuffer.getChannelData(0);
          let inR = inL;
          if (e.inputBuffer.numberOfChannels > 1) {
            const rawR = e.inputBuffer.getChannelData(1);
            let hasSignal = false;
            for (let i = 0; i < rawR.length; i += 16) {
              if (Math.abs(rawR[i]) > 0.0001) {
                hasSignal = true;
                break;
              }
            }
            if (hasSignal) {
              inR = rawR;
            }
          }
          pcmChunksL.push(new Float32Array(inL));
          pcmChunksR.push(new Float32Array(inR));
          totalPcmSamples += inL.length;
        };

        pcmSourceNode.connect(pcmProcessorNode);
        pcmProcessorNode.connect(pcmSilentGain);
        pcmSilentGain.connect(audioCtx.destination);
      } catch (pcmErr) {
        console.warn('[useMeisterwerkAudioRecording] PCM stream capture init fallback:', pcmErr);
      }

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
        // Disconnect PCM recording graph
        try {
          if (pcmProcessorNode) {
            pcmProcessorNode.onaudioprocess = null;
            pcmProcessorNode.disconnect();
          }
          if (pcmSilentGain) pcmSilentGain.disconnect();
          if (pcmSourceNode) pcmSourceNode.disconnect();
        } catch {}

        stream.getTracks().forEach(track => track.stop());
        setIsUploadingAudio(true);

        const timeStamp = Date.now();
        const exactElapsedSec = Math.max(0.1, (Date.now() - (recordStartTimeRef.current || Date.now())) / 1000);

        let processedBlob: Blob | null = null;
        let dspDuration = 0;

        // 1. Primary: High-fidelity uncompressed PCM WAV generation
        if (totalPcmSamples > 0 && pcmChunksL.length > 0) {
          try {
            const rawBuffer = audioCtx.createBuffer(2, totalPcmSamples, audioCtx.sampleRate);
            const chanL = rawBuffer.getChannelData(0);
            const chanR = rawBuffer.getChannelData(1);
            let offset = 0;
            for (let i = 0; i < pcmChunksL.length; i++) {
              chanL.set(pcmChunksL[i], offset);
              chanR.set(pcmChunksR[i], offset);
              offset += pcmChunksL[i].length;
            }
            const capturedBuffer = ensureCenteredStereoAudioBuffer(audioCtx, rawBuffer);
            dspDuration = capturedBuffer.duration;
            processedBlob = audioBufferToWavBlob(capturedBuffer, {
              title: overrideLabel || audioLabelRef.current || 'Aufnahme',
              artist: isTeacherModeRef.current ? 'Lehrkraft' : (student?.name || 'Schüler')
            });
          } catch (pcmWavErr) {
            console.warn('[useMeisterwerkAudioRecording] PCM WAV export error:', pcmWavErr);
          }
        }

        // 2. Secondary fallback: MediaRecorder blob processing
        if (!processedBlob) {
          const rawBlob = new Blob(audioChunks, { type: recorder.mimeType || 'audio/webm' });
          const patchedBlob = await fixWebmDuration(rawBlob, exactElapsedSec).catch(() => rawBlob);
          try {
            if (isMasterworkSong) {
              const res = await processStudioMastering(patchedBlob);
              processedBlob = res.masteredBlob;
              dspDuration = res.durationSec || 0;
            } else {
              const res = await processPureRawBlob(patchedBlob, { padActive: isRecordingPadActiveRef.current });
              processedBlob = res.processedBlob;
              dspDuration = res.durationSec || 0;
            }
          } catch (e) {
            console.warn('[useMeisterwerkAudioRecording] DSP processing fallback:', e);
            processedBlob = patchedBlob;
          }
        }

        const recDuration = Math.max(
          1,
          Math.ceil(dspDuration || exactElapsedSec),
          Math.ceil(exactElapsedSec)
        );

        const fileExt = (processedBlob.type && processedBlob.type.includes('wav')) ? 'wav' : (processedBlob.type && processedBlob.type.includes('mp4') ? 'mp4' : (processedBlob.type && processedBlob.type.includes('webm') ? 'webm' : 'wav'));
        const contentType = processedBlob.type || 'audio/wav';
        const uniqueRecId = `rec-${student?.id || 'stud'}-${timeStamp}`;
        const localBlobKey = `campus_blob_${student?.id || 'stud'}_${timeStamp}.${fileExt}`;

        // ⚡ Optimistic instant persistence into IndexedDB (< 15ms)
        await storeBlob(localBlobKey, processedBlob).catch(() => {});

        const isTeacherActor = Boolean(isTeacherModeRef.current);
        const isStudentSession = !isTeacherActor;
        const currentAudioLabel = overrideLabel || audioLabelRef.current || '';

        // Collect existing audios for smart title generation
        const existingAudios: any[] = [];
        if (isTeacherActor) {
          (homeworkNotesList || []).forEach((n: string) => {
            if (typeof n === 'string' && n.startsWith('AUDIO:')) {
              const parts = n.substring(6).split('|');
              existingAudios.push({
                url: parts[0]?.trim(),
                date: parts[2]?.trim(),
                label: parts[3]?.trim(),
                songTag: parts[7]?.trim(),
                author: 'teacher',
                isTeacher: true
              });
            }
          });
        } else {
          try {
            const stored = localStorage.getItem(`campus_junior_recordings_${student?.id}`);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed)) {
                parsed.forEach((r: any) => {
                  existingAudios.push({
                    url: r.url,
                    date: r.date,
                    label: r.title || r.label,
                    songTag: r.songTag || r.song || r.songTitle,
                    author: 'student',
                    isTeacher: false
                  });
                });
              }
            }
          } catch {}
        }

        const smartTitle = generateSmartAudioTitle(isTeacherActor, currentAudioLabel, songId || undefined, existingAudios);

        if (isMasterworkSong && songId) {
          setActiveSongSkills?.(prev => (prev || []).map(s => s.id === songId ? { ...s, recording_url: localBlobKey } : s));
          setProgressItems?.(prev => (prev || []).map(p => p.id === songId ? { ...p, recording_url: localBlobKey } : p));
        } else if (isStudentSession) {
          // 🎓 Student practice recording - SAVE TO JUNIOR RECORDINGS VAULT
          const candidateStudentIds = Array.from(new Set([
            student?.id,
            (student as any)?.student_id,
            (student as any)?.studentId,
            (student as any)?.canonical_uuid,
            (student as any)?.slot_id
          ].filter(Boolean))) as string[];

          const metronomeBpmToSave = isRecordingMetronomeActiveRef.current ? recordingBpmRef.current : undefined;

          const newRec = {
            id: uniqueRecId,
            url: localBlobKey,
            blobKey: localBlobKey,
            duration: recDuration,
            date: new Date().toISOString(),
            title: smartTitle,
            label: currentAudioLabel,
            visibility: 'private',
            metronomeBpm: metronomeBpmToSave,
            bpm: metronomeBpmToSave,
            cloudSyncStatus: 'local'
          };

          candidateStudentIds.forEach(cid => {
            const juniorKey = `campus_junior_recordings_${cid}`;
            let existing: any[] = [];
            try {
              const stored = localStorage.getItem(juniorKey);
              if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) existing = parsed;
              }
            } catch {}

            const updated = [newRec, ...existing.filter((r: any) => r.id !== uniqueRecId && r.url !== localBlobKey)];
            localStorage.setItem(juniorKey, JSON.stringify(updated));
          });

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new CustomEvent('campus_junior_recordings_updated'));
          }
        } else {
          // 👨‍🏫 Teacher note - SAVE TO HOMEWORK NOTES & TEACHER VAULT
          const creatorRole = 'teacher';
          const initialVisibility = 'shared_with_teacher';
          const activeSong = (activeSongSkills || []).find(s => (songId && s.id === songId) || (selectedActiveSongIdRef.current && s.id === selectedActiveSongIdRef.current));
          const songTitle = activeSong?.songs?.title || activeSong?.title || activeSong?.song_title;
          const assignedTag = songTitle || cleanSongOrBookTitle(currentAudioLabel) || '';
          const metronomeBpmToSave = isRecordingMetronomeActiveRef.current ? recordingBpmRef.current : undefined;
          const bpmSuffix = metronomeBpmToSave ? `||||BPM:${metronomeBpmToSave}` : '';
          const audioMetaStr = `AUDIO:${localBlobKey}|${recDuration}|${new Date().toISOString()}|${smartTitle}|${creatorRole}|${initialVisibility}|${uniqueRecId}|${assignedTag}${bpmSuffix}`;

          const candidateStudentIds = Array.from(new Set([
            student?.id,
            (student as any)?.student_id,
            (student as any)?.studentId,
            (student as any)?.canonical_uuid,
            (student as any)?.slot_id
          ].filter(Boolean))) as string[];

          candidateStudentIds.forEach(cid => {
            const teacherVaultKey = `campus_teacher_audio_vault_${cid}`;
            try {
              const existingVaultStr = localStorage.getItem(teacherVaultKey);
              let existingVault: string[] = [];
              if (existingVaultStr) {
                const parsed = JSON.parse(existingVaultStr);
                if (Array.isArray(parsed)) existingVault = parsed;
              }
              if (!existingVault.includes(audioMetaStr)) {
                const updatedVault = [audioMetaStr, ...existingVault.filter(v => typeof v === 'string' ? !v.includes(uniqueRecId) : true)];
                localStorage.setItem(teacherVaultKey, JSON.stringify(updatedVault));
              }
            } catch (vErr) {
              console.warn('[useMeisterwerkAudioRecording] teacher vault write:', vErr);
            }
          });

          if (setHomeworkNotesList) {
            setHomeworkNotesList(prev => {
              const ex = prev || [];
              const updated = [...ex.filter(n => n !== audioMetaStr), audioMetaStr];
              if (syncHomeworkNotes) {
                syncHomeworkNotes(updated).catch(() => {});
              }
              return updated;
            });
          }
        }

        setRecordingSavedToast(isTeacherActor ? '🎙️ Unterrichts-Aufnahme gespeichert!' : '🌟 Klasse Take gespeichert!');
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
            const targetSchoolId = student?.school_id || (student as any)?.schoolId || localStorage.getItem('groovelab_school_id') || localStorage.getItem('campus_school_id') || 'global';
            const fileName = `rec_${timeStamp}.${fileExt}`;
            const filePath = buildCanonicalAudioStoragePath(targetSchoolId, student?.id || 'stud', 'recordings', fileName);

            const validation = await validateMediaBlob(processedBlob, 'audio', contentType);
            if (!validation.isValid) {
              console.warn('[useMeisterwerkAudioRecording] Validation failed:', validation.reason);
              return;
            }

            const uploadPromise = supabase.storage
              .from('campus-assets')
              .upload(filePath, processedBlob, { contentType, cacheControl: 'private, max-age=3600' });

            const timeoutPromise = new Promise<{ error: Error }>((_, reject) =>
              setTimeout(() => reject(new Error('Storage upload timeout')), 8000)
            );

            const uploadRes = await Promise.race([uploadPromise, timeoutPromise]) as any;

            if (uploadRes && !uploadRes.error) {
              const cloudUrl = await getSecureAudioUrl(filePath, 'campus-assets', 300);
              if (cloudUrl) {
                await storeBlob(cloudUrl, processedBlob).catch(() => {});

                if (isStudentSession) {
                  const candidateStudentIds = Array.from(new Set([
                    student?.id,
                    (student as any)?.student_id,
                    (student as any)?.studentId,
                    (student as any)?.canonical_uuid,
                    (student as any)?.slot_id
                  ].filter(Boolean))) as string[];

                  candidateStudentIds.forEach(cid => {
                    const juniorKey = `campus_junior_recordings_${cid}`;
                    try {
                      const stored = localStorage.getItem(juniorKey);
                      if (stored) {
                        const parsed = JSON.parse(stored);
                        if (Array.isArray(parsed)) {
                          const upgraded = parsed.map((r: any) =>
                            r.id === uniqueRecId || r.url === localBlobKey
                              ? { ...r, url: cloudUrl, cloudPath: filePath, cloudSyncStatus: 'synced' }
                              : r
                          );
                          localStorage.setItem(juniorKey, JSON.stringify(upgraded));
                        }
                      }
                    } catch {}
                  });
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('storage'));
                    window.dispatchEvent(new CustomEvent('campus_junior_recordings_updated'));
                  }
                } else {
                  setHomeworkNotesList?.(prev => {
                    const ex = prev || [];
                    const upgradedList = ex.map((n: string) => {
                      if (typeof n === 'string' && n.includes(localBlobKey)) {
                        return n.replace(localBlobKey, cloudUrl);
                      }
                      return n;
                    });
                    syncHomeworkNotes?.(upgradedList).catch(() => {});
                    return upgradedList;
                  });
                }
              }
            }
          } catch (cErr) {
            console.warn('[useMeisterwerkAudioRecording] Cloud upload error:', cErr);
          }
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
    // ⚡ Synchrones WebAudio Pre-Unlocking & Session Audio Routing (Safari/iOS Fix)
    try {
      const ctx = SharedAudioEngine.getContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      SharedAudioEngine.startSessionAudioBypass();
    } catch {}

    const prep = await prepareRecordingEngine(overrideSongId, overrideLabel, isMasterworkSong);
    if (!prep) {
      try { SharedAudioEngine.stopSessionAudioBypass(); } catch {}
      return;
    }

    cancelActiveRecordCountIn();
    const isMetronomeActive = Boolean(isRecordingMetronomeActiveRef.current);

    if (!isMetronomeActive) {
      // 🌟 MODUS A: Kein Metronom aktiv -> Entspannter 3-Sekunden "Bereit machen... 3, 2, 1 -> Los!" Countdown
      // Audio-Gate bleibt ZU (isPcmCaptureActiveRef.current = false), damit der Vorlauf NICHT in der Aufnahme landet!
      isPcmCaptureActiveRef.current = false;
      setRecordCountInMode('get_ready');
      let count = 3;
      setRecordCountInRemaining(count);

      recordCountInIntervalRef.current = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setRecordCountInRemaining(count);
        } else {
          if (recordCountInIntervalRef.current) {
            clearInterval(recordCountInIntervalRef.current);
            recordCountInIntervalRef.current = null;
          }
          setRecordCountInRemaining(null);
          setRecordCountInMode(null);

          // 🔴 EXAKT HIER startet die Aufnahme: Sekunde 0.000, 0 ms Preroll!
          isPcmCaptureActiveRef.current = true;
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
      }, 1000);
    } else {
      // ⏱️ MODUS B: Metronom AKTIV -> Musikalischer 1-Takt-Einzähler im Ziel-BPM-Tempo
      // Audio-Gate geht SOFORT AUF, damit das Einzählen autoritativ mit aufgenommen wird!
      isPcmCaptureActiveRef.current = true;
      setRecordCountInMode('metronome');
      let count = 4;
      setRecordCountInRemaining(count);

      const activeBpm = Math.max(40, Math.min(240, recordingBpmRef.current || 100));
      const metroIntervalMs = (60 / activeBpm) * 1000;

      // Start MediaRecorder & PCM capture immediately so the count-in is recorded
      prep.recorder.start(100);
      mediaRecorderRef.current = prep.recorder;
      playCountInBeep(true);

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
          setRecordCountInMode(null);

          setAudioDuration(0);
          setIsRecordingAudio(true);
          recordStartTimeRef.current = Date.now();

          // ⏱️ Klick-Track läuft synchron während der Aufnahme weiter
          let beatCount = 0;
          playCountInBeep(true); // Downbeat auf Takt 1
          if (recordingMetronomeIntervalRef.current) clearInterval(recordingMetronomeIntervalRef.current);
          recordingMetronomeIntervalRef.current = setInterval(() => {
            beatCount = (beatCount + 1) % 4;
            playCountInBeep(beatCount === 0);
          }, metroIntervalMs);

          const maxSec = hasTresorStorage ? 420 : 60;
          recordingTimerRef.current = setInterval(() => {
            const elapsed = Math.floor((Date.now() - recordStartTimeRef.current) / 1000);
            setAudioDuration(elapsed);
            if (elapsed >= maxSec) {
              stopRecordingAudio(prep.recorder);
            }
          }, 500);
        }
      }, metroIntervalMs);
    }
  };

  const stopRecordingAudio = (activeRecorder?: MediaRecorder) => {
    if (isStoppingAudioRef.current) return;
    isStoppingAudioRef.current = true;
    isPcmCaptureActiveRef.current = false;
    setRecordCountInMode(null);
    cancelActiveRecordCountIn();
    cancelPlayAlongCountIn();

    if (recordingMetronomeIntervalRef.current) {
      clearInterval(recordingMetronomeIntervalRef.current);
      recordingMetronomeIntervalRef.current = null;
    }
    try {
      SharedAudioEngine.stopSessionAudioBypass();
    } catch {}

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

  const handleRetakeRecordingAudio = () => {
    cancelActiveRecordCountIn();
    cancelPlayAlongCountIn();
    if (recordingMetronomeIntervalRef.current) {
      clearInterval(recordingMetronomeIntervalRef.current);
      recordingMetronomeIntervalRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    const rec = mediaRecorderRef.current;
    if (rec) {
      rec.onstop = null;
      try {
        if (rec.state !== 'inactive') rec.stop();
        if (rec.stream) rec.stream.getTracks().forEach(t => t.stop());
      } catch {}
    }
    mediaRecorderRef.current = null;
    setIsRecordingAudio(false);
    setAudioDuration(0);
    isStoppingAudioRef.current = false;
    setTimeout(() => {
      startRecordingAudio();
    }, 120);
  };

  const handleStartPlayAlongRecording = async () => {
    const prep = await prepareRecordingEngine(selectedActiveSongId || undefined, audioLabel, false);
    if (!prep) return;

    const maxSec = hasTresorStorage ? 420 : 60;

    if (!isCountInEnabled) {
      setAudioDuration(0);
      setIsRecordingAudio(true);
      recordStartTimeRef.current = Date.now();
      prep.recorder.start(100);
      mediaRecorderRef.current = prep.recorder;

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      recordingTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - (recordStartTimeRef.current || Date.now())) / 1000);
        setAudioDuration(elapsed);
        if (elapsed >= maxSec) {
          stopRecordingAudio(prep.recorder);
        }
      }, 500);
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

        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        recordingTimerRef.current = setInterval(() => {
          const elapsed = Math.floor((Date.now() - (recordStartTimeRef.current || Date.now())) / 1000);
          setAudioDuration(elapsed);
          if (elapsed >= maxSec) {
            stopRecordingAudio(prep.recorder);
          }
        }, 500);
      }
    }, intervalMs);
  };

  // ⏱️ Reaktivität: Metronom während laufender Aufnahme dynamisch umschalten
  useEffect(() => {
    if (!isRecordingAudio) {
      if (recordingMetronomeIntervalRef.current) {
        clearInterval(recordingMetronomeIntervalRef.current);
        recordingMetronomeIntervalRef.current = null;
      }
      return;
    }

    if (isRecordingMetronomeActive) {
      if (!recordingMetronomeIntervalRef.current) {
        let beatCount = 0;
        const activeBpm = Math.max(40, Math.min(240, recordingBpm || 100));
        const metroIntervalMs = (60 / activeBpm) * 1000;
        playCountInBeep(true);
        recordingMetronomeIntervalRef.current = setInterval(() => {
          beatCount = (beatCount + 1) % 4;
          playCountInBeep(beatCount === 0);
        }, metroIntervalMs);
      }
    } else {
      if (recordingMetronomeIntervalRef.current) {
        clearInterval(recordingMetronomeIntervalRef.current);
        recordingMetronomeIntervalRef.current = null;
      }
    }
  }, [isRecordingAudio, isRecordingMetronomeActive, recordingBpm]);

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
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) return;

    try {
      const candidateStudentIds = Array.from(new Set([
        student?.id,
        (student as any)?.student_id,
        (student as any)?.studentId,
        (student as any)?.canonical_uuid,
        (student as any)?.slot_id
      ].filter(Boolean))) as string[];

      candidateStudentIds.forEach(cid => {
        const juniorKey = `campus_junior_recordings_${cid}`;
        const storedJunior = localStorage.getItem(juniorKey);
        if (storedJunior) {
          const parsed = JSON.parse(storedJunior);
          if (Array.isArray(parsed)) {
            let modified = false;
            const updatedJunior = parsed.map((r: any) => {
              if ((id && r.id === id) || (url && (r.url === url || r.url?.includes(url)))) {
                modified = true;
                return {
                  ...r,
                  title: trimmedTitle,
                  label: trimmedTitle,
                  isCustomTitle: true
                };
              }
              return r;
            });
            if (modified) {
              localStorage.setItem(juniorKey, JSON.stringify(updatedJunior));
            }
          }
        }
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('campus_junior_recordings_updated'));
      }
    } catch (err) {
      console.warn('[handleRenameStudentAudio] Error:', err);
    }
  }, [student]);

  const handleDeleteStudentAudio = useCallback(async (targetUrl: string, targetId?: string, audMeta?: any) => {
    try {
      const candidateStudentIds = Array.from(new Set([
        student?.id,
        (student as any)?.student_id,
        (student as any)?.studentId,
        (student as any)?.canonical_uuid,
        (student as any)?.slot_id,
        'current'
      ].filter(Boolean))) as string[];

      const matchesTarget = (r: any) => {
        if (!r) return false;
        if (targetId && r.id && String(r.id) === String(targetId)) return true;
        if (targetUrl && r.url && (r.url === targetUrl || r.url.includes(targetUrl) || targetUrl.includes(r.url))) return true;
        if (audMeta?.blobKey && (r.blobKey === audMeta.blobKey || r.url === audMeta.blobKey)) return true;
        if (r.blobKey && (r.blobKey === targetUrl || (targetId && r.blobKey.includes(targetId)))) return true;
        if (audMeta?.original_url && (r.url === audMeta.original_url || r.original_url === audMeta.original_url)) return true;
        if (audMeta?.date && r.date === audMeta.date && (r.title === audMeta.label || r.label === audMeta.label || r.harmonizedTitle === audMeta.label)) return true;
        return false;
      };

      // 1. Delete across all candidate student IDs (junior recordings & audio biography)
      candidateStudentIds.forEach(cid => {
        const juniorKey = `campus_junior_recordings_${cid}`;
        try {
          const stored = localStorage.getItem(juniorKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              const filtered = parsed.filter(r => !matchesTarget(r));
              localStorage.setItem(juniorKey, JSON.stringify(filtered));
            }
          }
        } catch {}

        const bioKey = `campus_audio_biography_${cid}`;
        try {
          const storedBio = localStorage.getItem(bioKey);
          if (storedBio) {
            const parsedBio = JSON.parse(storedBio);
            if (Array.isArray(parsedBio)) {
              const filteredBio = parsedBio.filter(r => !matchesTarget(r));
              localStorage.setItem(bioKey, JSON.stringify(filteredBio));
            }
          }
        } catch {}
      });

      // 2. Remove binary from local IndexedDB if local blobKey exists
      if (targetUrl && (targetUrl.startsWith('campus_blob_') || targetUrl.startsWith('campus_audio_') || targetUrl.startsWith('blob_'))) {
        deleteBlob(targetUrl).catch(() => {});
      }
      if (audMeta?.blobKey) {
        deleteBlob(audMeta.blobKey).catch(() => {});
      }
      if (targetId) {
        deleteBlob(`campus_audio_${targetId}_raw`).catch(() => {});
        deleteBlob(`campus_audio_${targetId}_master`).catch(() => {});
      }

      // 3. Remove remote binary from Supabase Storage if uploaded
      const effectiveUrl = targetUrl || audMeta?.url;
      if (effectiveUrl && effectiveUrl.includes('campus-assets/')) {
        const parts = effectiveUrl.split('campus-assets/');
        if (parts[1]) {
          supabase.storage.from('campus-assets').remove([parts[1]]).catch(() => {});
        }
      }

      // 4. Remove from homeworkNotesList if present as student take
      if (setHomeworkNotesList) {
        setHomeworkNotesList(prev => {
          const ex = prev || [];
          const filtered = ex.filter(n => {
            if (typeof n === 'string' && n.startsWith('AUDIO:')) {
              if (targetUrl && n.includes(targetUrl)) return false;
              if (targetId && n.includes(targetId)) return false;
            }
            return true;
          });
          if (filtered.length !== ex.length && syncHomeworkNotes) {
            syncHomeworkNotes(filtered).catch(() => {});
          }
          return filtered;
        });
      }

      // 5. Remove from progress_matrix if present
      if (student?.id) {
        try {
          if (targetId) {
            await supabase.from('progress_matrix').delete().eq('id', targetId);
          }
          if (effectiveUrl && effectiveUrl.startsWith('http')) {
            await supabase.from('progress_matrix').delete().eq('recording_url', effectiveUrl);
          }
        } catch {}
      }

      // 6. Trigger live cross-tab and component sync
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('campus_junior_recordings_updated'));
      }
    } catch (err) {
      console.warn('[handleDeleteStudentAudio] Error deleting student audio:', err);
    }
  }, [student, setHomeworkNotesList, syncHomeworkNotes]);

  return {
    isRecordingAudio,
    audioDuration,
    isUploadingAudio,
    activeRecordingSongId,
    recordCountInRemaining,
    recordCountInMode,
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
    handleRetakeRecordingAudio,
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
    setIsCountInEnabled,
    formatRecordTime,
    handleRenameStudentAudio,
    handleDeleteStudentAudio
  };
}
