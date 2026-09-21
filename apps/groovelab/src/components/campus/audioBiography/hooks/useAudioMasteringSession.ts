import { useState, useRef, useCallback } from 'react';
import {
  processDualMastering,
  DualMasteringResult,
  MasteringProfile,
  ReverbRoomType
} from '../../../../utils/audioMasteringEngine';
import { reportAudioError } from '../../../../lib/errorTelemetry';
import { acquireAudioStream, stabilizeAudioStream, PURE_RAW_AUDIO_CONSTRAINTS } from '../../../../services/audioPermissionService';
import { fixWebmDuration } from '../../../../utils/webmDurationPatcher';
import { StudioMasterClock } from '../../../../utils/studioMasterClock';

export function useAudioMasteringSession(_instrument?: string) {
  const [countDown, setCountDown] = useState<number | null>(null);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isProcessingMastering, setIsProcessingMastering] = useState<boolean>(false);
  const [pendingDualResult, setPendingDualResult] = useState<DualMasteringResult | null>(null);
  const [saveProgress, setSaveProgress] = useState<{ percent: number; stage: string; detail: string } | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<MasteringProfile>('acoustic_audiophile');
  const [selectedReverbRoom, setSelectedReverbRoom] = useState<ReverbRoomType>('warm_livingroom');
  const [reverbWetSlider, setReverbWetSlider] = useState<number>(8);
  const [recordingAutoStoppedInfo, setRecordingAutoStoppedInfo] = useState<boolean>(false);

  const activeMicStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const countInIntervalRef = useRef<any>(null);

  const processDualMasteringForModal = useCallback(async (
    blob: Blob,
    durSec: number,
    prof: MasteringProfile,
    wetPercent: number = 8,
    roomType: ReverbRoomType = 'warm_livingroom'
  ) => {
    setIsProcessingMastering(true);
    try {
      const dualRes = await processDualMastering(blob, durSec, {
        profile: prof,
        reverbRoomType: roomType,
        reverbWetMix: wetPercent / 100,
        enableReverb: wetPercent > 0
      });
      setPendingDualResult(dualRes);
    } catch (err) {
      console.error('Mastering failed:', err);
      alert('Mastering-Signalverarbeitung fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setIsProcessingMastering(false);
    }
  }, []);

  const stopRecording = useCallback((isAutoStopped = false) => {
    if (countInIntervalRef.current) {
      if (typeof countInIntervalRef.current.cancel === 'function') {
        countInIntervalRef.current.cancel();
      } else {
        clearInterval(countInIntervalRef.current);
      }
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsRecording(false);
    if (isAutoStopped) {
      setRecordingAutoStoppedInfo(true);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Could not stop recorder:', e);
      }
    }
  }, []);

  const triggerRecordingCountIn = useCallback(async () => {
    try {
      const stream = await acquireAudioStream({
        audio: {
          ...PURE_RAW_AUDIO_CONSTRAINTS,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          voiceIsolation: false,
          googEchoCancellation: false,
          googAutoGainControl: false,
          googNoiseSuppression: false,
          googHighpassFilter: false,
          googTypingNoiseDetection: false,
          channelCount: { ideal: 2 },
          sampleRate: { ideal: 48000 }
        } as any
      });
      activeMicStreamRef.current = stream;
      await stabilizeAudioStream(stream, 400);

      let mimeType = 'audio/webm;codecs=opus';
      if (typeof MediaRecorder !== 'undefined') {
        if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          if (MediaRecorder.isTypeSupported('audio/webm')) {
            mimeType = 'audio/webm';
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
          } else if (MediaRecorder.isTypeSupported('audio/aac')) {
            mimeType = 'audio/aac';
          } else {
            mimeType = '';
          }
        }
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 256000 })
        : new MediaRecorder(stream, { audioBitsPerSecond: 256000 });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const actualMime = recorder.mimeType || (audioChunksRef.current[0]?.type) || 'audio/webm';
        let audioBlob = new Blob(audioChunksRef.current, { type: actualMime });

        if (actualMime.includes('webm') && recordSeconds > 0) {
          try {
            audioBlob = await fixWebmDuration(audioBlob, recordSeconds);
          } catch (ebmlErr) {
            console.warn('[useAudioMasteringSession] WebM duration patch note:', ebmlErr);
          }
        }

        if (activeMicStreamRef.current) {
          activeMicStreamRef.current.getTracks().forEach(track => track.stop());
          activeMicStreamRef.current = null;
        }

        if (audioBlob.size > 0) {
          setReverbWetSlider(8);
          await processDualMasteringForModal(audioBlob, recordSeconds, selectedProfile, 8, selectedReverbRoom);
        } else {
          alert('Keine Audiodaten aufgezeichnet. Bitte versuche es erneut.');
          setIsProcessingMastering(false);
        }
      };

      setCountDown(3);

      const cancelCountIn = StudioMasterClock.runCountIn(
        60,
        3,
        (remaining) => {
          setCountDown(remaining);
        },
        () => {
          setCountDown(null);
          recorder.start(250);
          setIsRecording(true);
          setRecordingAutoStoppedInfo(false);
          setRecordSeconds(0);

          timerIntervalRef.current = setInterval(() => {
            setRecordSeconds(s => {
              const next = s + 1;
              if (next >= 420) {
                stopRecording(true);
              }
              return next;
            });
          }, 1000);
        }
      );
      countInIntervalRef.current = { cancel: cancelCountIn } as any;

    } catch (err) {
      console.error('Microphone access failed:', err);
      reportAudioError(err, 'acquireAudioStream', { tag: 'MIC_ACCESS_FAILED', severity: 'WARNING' });
      alert('Mikrofonzugriff nicht gestattet oder nicht verfügbar. Bitte erlaube den Mikrofonzugriff in deinen Browser-Einstellungen.');
      if (activeMicStreamRef.current) {
        activeMicStreamRef.current.getTracks().forEach(track => track.stop());
        activeMicStreamRef.current = null;
      }
      setCountDown(null);
    }
  }, [recordSeconds, selectedProfile, selectedReverbRoom, processDualMasteringForModal, stopRecording]);

  const resetRecordingSession = useCallback(() => {
    setPendingDualResult(null);
    setSaveProgress(null);
    setRecordSeconds(0);
    setCountDown(null);
    setIsRecording(false);
    setIsProcessingMastering(false);
  }, []);

  return {
    countDown,
    recordSeconds,
    isRecording,
    isProcessingMastering,
    pendingDualResult,
    dualMasteringResult: pendingDualResult,
    setPendingDualResult,
    saveProgress,
    setSaveProgress,
    selectedProfile,
    setSelectedProfile,
    selectedReverbRoom,
    setSelectedReverbRoom,
    reverbWetSlider,
    setReverbWetSlider,
    recordingAutoStoppedInfo,
    triggerRecordingCountIn,
    stopRecording,
    processDualMasteringForModal,
    resetRecordingSession,
    resetSession: resetRecordingSession
  };
}
