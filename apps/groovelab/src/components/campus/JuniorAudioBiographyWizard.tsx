import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Sparkles, Mic, Square, Play, Pause, RotateCcw, Check, Trophy, Star, Music, Heart, 
  Zap, Flame, Gift, Volume2, ArrowRight, ArrowLeft, X, Radio, CheckCircle2, ChevronRight,
  Disc, Award, Smile, Edit3, VolumeX, Share2, Plus, Copy
} from 'lucide-react';
import Confetti from 'react-confetti';
import { supabase } from '../../lib/supabase';
import { 
  processStudioMastering, 
  processDualMastering, 
  MasteringProfile,
  ReverbRoomType
} from '../../utils/audioMasteringEngine';
import { storeBlob } from '../../utils/blobStorage';
import { MilestoneData, CustomPlaylist, CustomPlaylistTrack } from './AudioBiographyView';

interface JuniorAudioBiographyWizardProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  milestones: MilestoneData[];
  customPlaylists: CustomPlaylist[];
  initialMilestoneId?: string | null;
  initialPlaylistId?: string | null;
  onSaveCompleted: (savedData: {
    targetType: 'milestone' | 'playlist';
    milestoneId?: string;
    playlistId?: string;
    newPlaylistTitle?: string;
    newPlaylistCoverPreset?: string;
    title: string;
    personalNote?: string;
    rawBlob: Blob;
    masterBlob: Blob;
    rawUrl: string;
    masteredUrl: string;
    duration: number;
    stickerEmoji: string;
  }) => Promise<void> | void;
}

export const JUNIOR_STICKER_REWARDS = [
  { id: 'stk_rocket', emoji: '🚀', label: 'Raketen-Power', gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: '#3b82f6' },
  { id: 'stk_star', emoji: '🌟', label: 'Goldstern', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#f59e0b' },
  { id: 'stk_lion', emoji: '🦁', label: 'Löwen-Groove', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#10b981' },
  { id: 'stk_crown', emoji: '👑', label: 'Meister-Krone', gradient: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)', color: '#eab308' },
  { id: 'stk_game', emoji: '🎮', label: 'Gaming-XP', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: '#8b5cf6' },
  { id: 'stk_heart', emoji: '💖', label: 'Herz-Melodie', gradient: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', color: '#ec4899' },
];

export const JUNIOR_GIFT_RECIPIENTS = [
  { id: 'mama', label: 'Für Mama', name: 'Mama', emoji: '🌸', color: '#ec4899' },
  { id: 'papa', label: 'Für Papa', name: 'Papa', emoji: '🧢', color: '#3b82f6' },
  { id: 'oma', label: 'Für Oma', name: 'Oma', emoji: '👵', color: '#8b5cf6' },
  { id: 'opa', label: 'Für Opa', name: 'Opa', emoji: '👴', color: '#059669' },
  { id: 'birthday', label: 'Geburtstagskind', name: 'das Geburtstagskind', emoji: '🎂', color: '#f59e0b' },
  { id: 'family', label: 'Familie & Freunde', name: 'meine Familie', emoji: '💖', color: '#10b981' },
];

export const PRO_COVER_PRESETS = [
  { id: 'cov_first_songs', label: 'Kids & Einsteiger', emoji: '🎈', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
  { id: 'cov_chart_hits', label: 'Pop & Urban Beats', emoji: '🎧', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' },
  { id: 'cov_rock_garage', label: 'Rock & Band', emoji: '🎸', gradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' },
  { id: 'cov_classical_gold', label: 'Klassik & Akustik', emoji: '🎻', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
];

export const JuniorAudioBiographyWizard: React.FC<JuniorAudioBiographyWizardProps> = ({
  isOpen,
  onClose,
  student,
  milestones,
  customPlaylists,
  initialMilestoneId,
  initialPlaylistId,
  onSaveCompleted
}) => {
  if (!isOpen) return null;

  const studentId = student?.id || student?.student_id || 'student';
  const studentFirstName = student?.first_name || 'Junger Musiker';
  const instrument = (student?.instrument || student?.main_instrument || 'Gitarre').trim();

  // Wizard Steps: 1: Goal Selection, 2: Instrument Ready, 3: Recording, 4: Celebration & Save
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // 1. Goal Decision: 'milestone' | 'playlist' | 'gift'
  const nextOpenMilestone = useMemo(() => {
    if (initialMilestoneId) {
      const found = milestones.find(m => m.id === initialMilestoneId || m.type === initialMilestoneId);
      if (found) return found;
    }
    return milestones.find(m => !m.audioUrl) || milestones[0];
  }, [milestones, initialMilestoneId]);

  const [selectedGoalType, setSelectedGoalType] = useState<'milestone' | 'playlist' | 'gift'>(() => {
    if (initialMilestoneId) {
      const found = milestones.find(m => m.id === initialMilestoneId || m.type === initialMilestoneId);
      if (found?.type === 'family_share') return 'gift';
      return 'milestone';
    }
    if (initialPlaylistId === 'pl_gifts') return 'gift';
    if (initialPlaylistId) return 'playlist';
    return 'milestone';
  });

  // Path 1: Milestone State
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneData>(nextOpenMilestone);

  // Path 2: Playlist State (Pro-Level Principles)
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>(
    initialPlaylistId || customPlaylists[0]?.id || 'new'
  );
  const [isCreatingNewPlaylist, setIsCreatingNewPlaylist] = useState<boolean>(
    !initialPlaylistId && customPlaylists.length === 0
  );
  const [newPlaylistTitle, setNewPlaylistTitle] = useState<string>('');
  const [newPlaylistCover, setNewPlaylistCover] = useState<string>('cov_first_songs');

  // Path 3: Gift State
  const [selectedRecipient, setSelectedRecipient] = useState(JUNIOR_GIFT_RECIPIENTS[0]);

  // Common Song Title
  const [songTitle, setSongTitle] = useState<string>('');

  // Sticker Choice (Step 4)
  const [selectedSticker, setSelectedSticker] = useState(JUNIOR_STICKER_REWARDS[0]);
  const [linkCopied, setLinkCopied] = useState<boolean>(false);

  // Audio Recording States
  const [isCountingIn, setIsCountingIn] = useState<boolean>(false);
  const [countInNumber, setCountInNumber] = useState<number>(3);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [masteredAudioUrl, setMasteredAudioUrl] = useState<string | null>(null);
  const [rawAudioBlob, setRawAudioBlob] = useState<Blob | null>(null);
  const [masteredAudioBlob, setMasteredAudioBlob] = useState<Blob | null>(null);
  const [recordedDuration, setRecordedDuration] = useState<number>(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  // Audio Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const countInIntervalRef = useRef<any>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Map instrument to profile and emoji
  const instrumentInfo = useMemo(() => {
    const inst = instrument.toLowerCase();
    if (inst.includes('klavier') || inst.includes('piano') || inst.includes('flügel') || inst.includes('tasten')) {
      return { emoji: '🎹', name: 'Klavier', profile: 'grand_piano' as MasteringProfile, tip: 'Stelle dein Tablet links oder rechts neben die Tastatur.' };
    }
    if (inst.includes('schlagzeug') || inst.includes('drum') || inst.includes('cajon') || inst.includes('percussion')) {
      return { emoji: '🥁', name: 'Schlagzeug', profile: 'drums_percussion' as MasteringProfile, tip: 'Stelle dein Tablet 2 Meter vor das Set auf einen Stuhl oder Tisch.' };
    }
    if (inst.includes('gesang') || inst.includes('stimme') || inst.includes('sax') || inst.includes('trompete') || inst.includes('posaune') || inst.includes('klarinette')) {
      return { emoji: '🎷', name: 'Blasinstrument / Gesang', profile: 'brass_vocals' as MasteringProfile, tip: 'Halte ca. 1 Meter Abstand zum Mikrofon.' };
    }
    if (inst.includes('geige') || inst.includes('violine') || inst.includes('cello') || inst.includes('bratsche') || inst.includes('kontrabass')) {
      return { emoji: '🎻', name: 'Streichinstrument', profile: 'acoustic_audiophile' as MasteringProfile, tip: 'Stelle dein Gerät in Notenständer-Höhe auf.' };
    }
    if (inst.includes('flöte') || inst.includes('blockflöte') || inst.includes('querflöte')) {
      return { emoji: '🪈', name: 'Flöte', profile: 'acoustic_audiophile' as MasteringProfile, tip: 'Halte etwas Abstand zum Mikrofon, damit es warm klingt.' };
    }
    return { emoji: '🎸', name: instrument || 'Gitarre', profile: 'acoustic_audiophile' as MasteringProfile, tip: 'Lege dein Tablet etwa 1 bis 2 Schritte neben dein Instrument.' };
  }, [instrument]);

  // Set default title based on selected goal
  useEffect(() => {
    if (selectedGoalType === 'milestone') {
      setSongTitle(selectedMilestone?.title || 'Mein Meilenstein');
    } else if (selectedGoalType === 'gift') {
      setSongTitle(`Mein Musik-Geschenk für ${selectedRecipient.name} 🎁`);
    } else {
      if (!songTitle || songTitle.startsWith('Mein Meilenstein') || songTitle.startsWith('Mein Musik-Geschenk')) {
        setSongTitle('Mein Lieblingssong');
      }
    }
  }, [selectedGoalType, selectedMilestone, selectedRecipient]);

  // Clean-up on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (countInIntervalRef.current) clearInterval(countInIntervalRef.current);
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  // Web Audio Synth Chime for Celebrations
  const playJoyfulChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.5);
      });
    } catch (e) {
      // ignore
    }
  };

  // Start Count-In
  const startRecordingCountIn = () => {
    setIsCountingIn(true);
    setCountInNumber(3);

    countInIntervalRef.current = setInterval(() => {
      setCountInNumber(prev => {
        if (prev <= 1) {
          clearInterval(countInIntervalRef.current);
          setIsCountingIn(false);
          startLiveRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Start Live Audio Stream
  const startLiveRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const rawBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleAudioProcessing(rawBlob);
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds(s => s + 1);
      }, 1000);
    } catch (err) {
      alert('Mikrofon-Zugriff nicht möglich. Bitte erlaube den Mikrofon-Zugriff im Browser.');
    }
  };

  // Stop Recording
  const stopLiveRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setIsProcessing(true);
  };

  // Audio DSP Background Magic
  const handleAudioProcessing = async (blob: Blob) => {
    try {
      const dualResult = await processDualMastering(blob, {
        profile: instrumentInfo.profile,
        targetLufs: -14.0,
        reverbRoomType: 'medium',
        reverbWetMix: instrumentInfo.profile === 'drums_percussion' ? 0.12 : 0.08
      });

      const masterBlob = dualResult.masteredBlob;
      const rawBlob = dualResult.rawNormalizedBlob;
      const mUrl = dualResult.masteredUrl;
      const rUrl = dualResult.rawNormalizedUrl;

      setRawAudioBlob(rawBlob);
      setMasteredAudioBlob(masterBlob);
      setAudioUrl(rUrl);
      setMasteredAudioUrl(mUrl);
      setRecordedDuration(recordSeconds || 15);

      setIsProcessing(false);
      setCurrentStep(4);
      playJoyfulChime();
    } catch (err) {
      console.warn('Junior Audio DSP error fallback:', err);
      // Fallback
      const fallbackUrl = URL.createObjectURL(blob);
      setRawAudioBlob(blob);
      setMasteredAudioBlob(blob);
      setAudioUrl(fallbackUrl);
      setMasteredAudioUrl(fallbackUrl);
      setRecordedDuration(recordSeconds || 15);
      setIsProcessing(false);
      setCurrentStep(4);
    }
  };

  // Toggle Preview Audio
  const togglePreview = () => {
    if (!masteredAudioUrl && !audioUrl) return;
    const targetUrl = masteredAudioUrl || audioUrl;

    if (!previewAudioRef.current) {
      const audio = new Audio(targetUrl!);
      previewAudioRef.current = audio;
      audio.onended = () => setIsPlayingPreview(false);
    }

    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.currentTime = 0;
      previewAudioRef.current.play().catch(() => {});
      setIsPlayingPreview(true);
    }
  };

  // WhatsApp Share URL for Family Gifts
  const getGiftShareUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://campus-groovelab.de';
    return `${origin}/share/audio-bio?student_id=${studentId}`;
  };

  const handleWhatsAppShare = () => {
    const url = getGiftShareUrl();
    const message = `*Ein Musik-Geschenk von ${studentFirstName}!* 🎶🎁\n\nHallo ${selectedRecipient.name}, ich habe auf meiner ${instrumentInfo.name} ein persönliches Stück für dich eingespielt!\n\nHier kannst du es dir direkt im Browser anhören:\n${url}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const handleCopyShareLink = () => {
    const url = getGiftShareUrl();
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    });
  };

  // Save to Database
  const handleSaveToTreasureBox = async () => {
    if (!rawAudioBlob || !masteredAudioBlob) return;
    setIsSaving(true);

    try {
      const finalTitle = songTitle.trim() || 'Mein Musikstück';
      const isGiftGoal = selectedGoalType === 'gift';
      const familyShareMs = milestones.find(m => m.type === 'family_share');
      
      const targetType: 'milestone' | 'playlist' = (isGiftGoal || selectedGoalType === 'milestone') ? 'milestone' : 'playlist';
      const targetMilestoneId = isGiftGoal 
        ? (familyShareMs?.id || selectedMilestone.id) 
        : (selectedGoalType === 'milestone' ? selectedMilestone.id : undefined);

      await onSaveCompleted({
        targetType,
        milestoneId: targetMilestoneId,
        playlistId: isGiftGoal 
          ? 'pl_gifts'
          : (selectedGoalType === 'playlist' && !isCreatingNewPlaylist && selectedPlaylistId !== 'new') 
          ? selectedPlaylistId 
          : undefined,
        newPlaylistTitle: (selectedGoalType === 'playlist' && isCreatingNewPlaylist) ? (newPlaylistTitle.trim() || 'Meine neue Playlist') : undefined,
        newPlaylistCoverPreset: (selectedGoalType === 'playlist' && isCreatingNewPlaylist) ? newPlaylistCover : undefined,
        title: finalTitle,
        personalNote: isGiftGoal 
          ? `Geschenk für ${selectedRecipient.name} • Gespielt von ${studentFirstName} auf ${instrumentInfo.name} ${instrumentInfo.emoji}`
          : `Aufgenommen von ${studentFirstName} mit ${instrumentInfo.name} ${instrumentInfo.emoji}`,
        rawBlob: rawAudioBlob,
        masterBlob: masteredAudioBlob,
        rawUrl: audioUrl || '',
        masteredUrl: masteredAudioUrl || '',
        duration: recordedDuration,
        stickerEmoji: selectedSticker.emoji
      });

      setShowConfetti(true);
      playJoyfulChime();

      setTimeout(() => {
        setShowConfetti(false);
        setIsSaving(false);
        onClose();
      }, 2200);
    } catch (e) {
      console.error('Save failed:', e);
      setIsSaving(false);
      alert('Speichern fehlgeschlagen. Bitte versuche es erneut.');
    }
  };

  // Format seconds to mm:ss
  const formatSec = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '16px'
    }}>
      {showConfetti && (
        <Confetti
          width={typeof window !== 'undefined' ? window.innerWidth : 500}
          height={typeof window !== 'undefined' ? window.innerHeight : 800}
          recycle={false}
          numberOfPieces={350}
          gravity={0.25}
        />
      )}

      <div style={{
        background: '#ffffff',
        borderRadius: '32px',
        maxWidth: '580px',
        width: '100%',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Header Bar */}
        <div style={{
          padding: '20px 24px 16px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
          borderTopLeftRadius: '32px',
          borderTopRightRadius: '32px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.15)'
            }}>
              ✨
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  color: '#10b981',
                  background: '#d1fae5',
                  padding: '2px 8px',
                  borderRadius: '100px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  Schritt {currentStep} von 4
                </span>
                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>
                  • Für {studentFirstName}
                </span>
              </div>
              <h2 style={{ margin: '2px 0 0 0', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                {currentStep === 1 && 'Was möchtest du aufnehmen?'}
                {currentStep === 2 && 'Dein Instrument startklar machen'}
                {currentStep === 3 && 'Studio-Aufnahme'}
                {currentStep === 4 && (selectedGoalType === 'gift' ? 'Dein fertiges Musik-Geschenk 🎁' : 'Deine Audio-Trophäe 🏆')}
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              if (previewAudioRef.current) previewAudioRef.current.pause();
              onClose();
            }}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              border: 'none',
              background: '#f1f5f9',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.15s ease'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ══════════════════════════════════════════════════════════════
              SCHRITT 1: DIE 3 GEFÜHRTEN WEGE (MEILENSTEIN / PLAYLIST / GESCHENK)
             ══════════════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <span style={{ fontSize: '0.86rem', color: '#64748b', fontWeight: 600 }}>
                Wähle mit 1 Klick aus, was du heute einspielen möchtest:
              </span>

              {/* 3 Main Choice Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                {/* 🏆 Option 1: Meilenstein einspielen */}
                <div
                  onClick={() => setSelectedGoalType('milestone')}
                  style={{
                    padding: '16px',
                    borderRadius: '20px',
                    border: `2.5px solid ${selectedGoalType === 'milestone' ? '#10b981' : '#e2e8f0'}`,
                    background: selectedGoalType === 'milestone' ? '#f0fdf4' : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxShadow: selectedGoalType === 'milestone' ? '0 6px 20px rgba(16, 185, 129, 0.18)' : '0 2px 6px rgba(0,0,0,0.03)',
                    transition: 'all 0.18s ease'
                  }}
                  className="hover-scale"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.4rem',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
                        flexShrink: 0
                      }}>
                        🏆
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.66rem', fontWeight: 900, background: '#10b981', color: 'white', padding: '1px 7px', borderRadius: '100px' }}>
                            MEILENSTEIN
                          </span>
                          <span style={{ fontSize: '0.66rem', fontWeight: 900, background: selectedMilestone.type === 'first_song' ? '#fef3c7' : '#dcfce7', color: selectedMilestone.type === 'first_song' ? '#b45309' : '#047857', padding: '1px 7px', borderRadius: '100px' }}>
                            +{selectedMilestone.type === 'first_song' ? 100 : 50} XP
                          </span>
                          <span style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 800 }}>
                            Stufe {selectedMilestone.stepNumber} von {milestones.length}
                          </span>
                        </div>
                        <div style={{ fontSize: '1.02rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                          1. Meilenstein einspielen
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
                          Aktuell gewählt: <strong>{selectedMilestone.title}</strong>
                        </div>
                      </div>
                    </div>
                    {selectedGoalType === 'milestone' && (
                      <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={16} strokeWidth={3} />
                      </div>
                    )}
                  </div>

                  {/* Milestone Picker (if selected) */}
                  {selectedGoalType === 'milestone' && (
                    <div style={{
                      paddingTop: '10px',
                      borderTop: '1px dashed #cbd5e1',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#047857' }}>
                        Wähle eine der {milestones.length} Stufen aus:
                      </span>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '6px'
                      }}>
                        {milestones.map(m => {
                          const isMSelected = selectedMilestone.id === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMilestone(m);
                              }}
                              style={{
                                padding: '8px 6px',
                                borderRadius: '12px',
                                border: isMSelected ? '2px solid #10b981' : '1px solid #cbd5e1',
                                background: isMSelected ? '#dcfce7' : '#ffffff',
                                color: isMSelected ? '#047857' : '#334155',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                textAlign: 'center',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              <span>{m.stepNumber}. {m.title.split(' ')[0]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 🎵 Option 2: Zu Playlists hinzufügen oder neue anlegen (Pro-Level Prinzip) */}
                <div
                  onClick={() => setSelectedGoalType('playlist')}
                  style={{
                    padding: '16px',
                    borderRadius: '20px',
                    border: `2.5px solid ${selectedGoalType === 'playlist' ? '#8b5cf6' : '#e2e8f0'}`,
                    background: selectedGoalType === 'playlist' ? '#faf5ff' : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxShadow: selectedGoalType === 'playlist' ? '0 6px 20px rgba(139, 92, 246, 0.18)' : '0 2px 6px rgba(0,0,0,0.03)',
                    transition: 'all 0.18s ease'
                  }}
                  className="hover-scale"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.4rem',
                        boxShadow: '0 4px 12px rgba(139, 92, 246, 0.35)',
                        flexShrink: 0
                      }}>
                        🎵
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.66rem', fontWeight: 900, background: '#8b5cf6', color: 'white', padding: '1px 7px', borderRadius: '100px' }}>
                            PRO-ALBEN
                          </span>
                          <span style={{ fontSize: '0.66rem', fontWeight: 900, background: '#ede9fe', color: '#6d28d9', padding: '1px 7px', borderRadius: '100px' }}>
                            +30 XP
                          </span>
                        </div>
                        <div style={{ fontSize: '1.02rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                          2. Zu Playlist hinzufügen / Neu erstellen
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
                          Echte Playlists wie im Pro-Level (Weihnachten, Lieblingssongs & Alben)
                        </div>
                      </div>
                    </div>
                    {selectedGoalType === 'playlist' && (
                      <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#8b5cf6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={16} strokeWidth={3} />
                      </div>
                    )}
                  </div>

                  {/* Playlist Selection & Creation (if selected) */}
                  {selectedGoalType === 'playlist' && (
                    <div style={{
                      paddingTop: '12px',
                      borderTop: '1px dashed #d8b4fe',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#6d28d9' }}>
                        In welches Album soll das Stück gespeichert werden?
                      </span>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {customPlaylists.map(pl => {
                          const isPlSelected = !isCreatingNewPlaylist && selectedPlaylistId === pl.id;
                          return (
                            <button
                              key={pl.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsCreatingNewPlaylist(false);
                                setSelectedPlaylistId(pl.id);
                              }}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '12px',
                                border: isPlSelected ? '2px solid #8b5cf6' : '1px solid #cbd5e1',
                                background: isPlSelected ? '#ede9fe' : '#ffffff',
                                color: isPlSelected ? '#5b21b6' : '#334155',
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <Disc size={13} />
                              <span>{pl.title}</span>
                              <span style={{ fontSize: '0.66rem', opacity: 0.7 }}>({pl.tracks?.length || 0})</span>
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsCreatingNewPlaylist(true);
                            setSelectedPlaylistId('new');
                          }}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '12px',
                            border: isCreatingNewPlaylist ? '2px solid #8b5cf6' : '1px dashed #8b5cf6',
                            background: isCreatingNewPlaylist ? '#ede9fe' : '#ffffff',
                            color: '#6d28d9',
                            fontSize: '0.76rem',
                            fontWeight: 900,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Plus size={13} strokeWidth={3} />
                          <span>+ Neue Playlist anlegen</span>
                        </button>
                      </div>

                      {/* If creating new playlist */}
                      {isCreatingNewPlaylist && (
                        <div style={{
                          background: '#ffffff',
                          borderRadius: '16px',
                          border: '1.5px solid #d8b4fe',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#6d28d9', marginBottom: '4px' }}>
                              Name der neuen Playlist:
                            </label>
                            <input
                              type="text"
                              value={newPlaylistTitle}
                              onChange={(e) => setNewPlaylistTitle(e.target.value)}
                              placeholder="z. B. Sommer-Hits 2026, Rock Garage..."
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '10px',
                                border: '1.5px solid #cbd5e1',
                                fontSize: '0.84rem',
                                fontWeight: 700,
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#6d28d9', marginBottom: '4px' }}>
                              Album-Cover Kategorie wählen:
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                              {PRO_COVER_PRESETS.map(cov => {
                                const isCovChosen = newPlaylistCover === cov.id;
                                return (
                                  <button
                                    key={cov.id}
                                    type="button"
                                    onClick={() => setNewPlaylistCover(cov.id)}
                                    style={{
                                      padding: '8px 10px',
                                      borderRadius: '10px',
                                      border: isCovChosen ? '2px solid #8b5cf6' : '1px solid #e2e8f0',
                                      background: isCovChosen ? '#f3e8ff' : '#ffffff',
                                      color: isCovChosen ? '#6d28d9' : '#334155',
                                      fontSize: '0.74rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px'
                                    }}
                                  >
                                    <span>{cov.emoji}</span>
                                    <span>{cov.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Song Title Input */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                          Wie heißt dein Song / Stück?
                        </label>
                        <input
                          type="text"
                          value={songTitle}
                          onChange={(e) => setSongTitle(e.target.value)}
                          placeholder="z. B. Jingle Bells, Kuckuck, Für Elise..."
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            border: '1.5px solid #cbd5e1',
                            fontSize: '0.88rem',
                            fontWeight: 800,
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 🎁 Option 3: Geschenk für Mama, Papa, Oma... */}
                <div
                  onClick={() => setSelectedGoalType('gift')}
                  style={{
                    padding: '16px',
                    borderRadius: '20px',
                    border: `2.5px solid ${selectedGoalType === 'gift' ? '#ec4899' : '#e2e8f0'}`,
                    background: selectedGoalType === 'gift' ? '#fdf2f8' : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxShadow: selectedGoalType === 'gift' ? '0 6px 20px rgba(236, 72, 153, 0.18)' : '0 2px 6px rgba(0,0,0,0.03)',
                    transition: 'all 0.18s ease'
                  }}
                  className="hover-scale"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.4rem',
                        boxShadow: '0 4px 12px rgba(236, 72, 153, 0.35)',
                        flexShrink: 0
                      }}>
                        🎁
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.66rem', fontWeight: 900, background: '#ec4899', color: 'white', padding: '1px 7px', borderRadius: '100px' }}>
                            GESCHENK
                          </span>
                          <span style={{ fontSize: '0.66rem', fontWeight: 900, background: '#fce7f3', color: '#be185d', padding: '1px 7px', borderRadius: '100px' }}>
                            +30 XP
                          </span>
                        </div>
                        <div style={{ fontSize: '1.02rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                          3. Musik-Geschenk für Familie & Freunde
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
                          Nimm ein persönliches Ständchen auf & teile es direkt per WhatsApp
                        </div>
                      </div>
                    </div>
                    {selectedGoalType === 'gift' && (
                      <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#ec4899', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={16} strokeWidth={3} />
                      </div>
                    )}
                  </div>

                  {/* Recipient Selection (if selected) */}
                  {selectedGoalType === 'gift' && (
                    <div style={{
                      paddingTop: '12px',
                      borderTop: '1px dashed #fbcfe8',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#be185d' }}>
                        Für wen ist dieses Musik-Geschenk?
                      </span>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                        {JUNIOR_GIFT_RECIPIENTS.map(rec => {
                          const isRecChosen = selectedRecipient.id === rec.id;
                          return (
                            <button
                              key={rec.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRecipient(rec);
                              }}
                              style={{
                                padding: '10px 8px',
                                borderRadius: '12px',
                                border: isRecChosen ? '2px solid #ec4899' : '1px solid #fbcfe8',
                                background: isRecChosen ? '#fce7f3' : '#ffffff',
                                color: isRecChosen ? '#9d174d' : '#334155',
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <span style={{ fontSize: '1.2rem' }}>{rec.emoji}</span>
                              <span>{rec.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Dedication Input */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                          Titel / Widmung deines Geschenks:
                        </label>
                        <input
                          type="text"
                          value={songTitle}
                          onChange={(e) => setSongTitle(e.target.value)}
                          placeholder={`Mein Geschenk für ${selectedRecipient.name}`}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            border: '1.5px solid #cbd5e1',
                            fontSize: '0.88rem',
                            fontWeight: 800,
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Next Button */}
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '20px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: '1.02rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
                  marginTop: '6px'
                }}
                className="hover-scale"
              >
                <span>Weiter zum Aufnahme-Studio 🎙️</span>
                <ChevronRight size={20} />
              </button>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              SCHRITT 2: INSTRUMENT STARTKLAR MACHEN
             ══════════════════════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', textAlign: 'center' }}>
              <div style={{
                width: '90px',
                height: '90px',
                borderRadius: '28px',
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '2px solid #86efac',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '3rem',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.2)'
              }}>
                {instrumentInfo.emoji}
              </div>

              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                  Dein Instrument: {instrumentInfo.name}
                </h3>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.86rem', color: '#64748b', fontWeight: 600 }}>
                  Der Audio-Assistent hat den besten Raumklang für dich schon automatisch eingestellt! ✨
                </p>
              </div>

              {/* Child-Friendly Tip Card */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '20px',
                padding: '16px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                textAlign: 'left'
              }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
                  💡
                </div>
                <div style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 600, lineHeight: 1.4 }}>
                  <strong>Profi-Tipp:</strong> {instrumentInfo.tip} Atme einmal tief durch und nimm dir Zeit!
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '18px',
                    border: '1.5px solid #cbd5e1',
                    background: 'transparent',
                    color: '#64748b',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  Zurück
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(3);
                    startRecordingCountIn();
                  }}
                  style={{
                    flex: 2,
                    padding: '16px',
                    borderRadius: '20px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    fontWeight: 900,
                    fontSize: '1.02rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)'
                  }}
                  className="hover-scale"
                >
                  <Mic size={20} />
                  <span>Ich bin bereit! 🎵</span>
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              SCHRITT 3: DIE STUDIO-AUFNAHME
             ══════════════════════════════════════════════════════════════ */}
          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '16px 0', textAlign: 'center' }}>

              {/* Processing Magic Spinner */}
              {isProcessing ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '24px 0' }}>
                  <div style={{
                    width: '70px',
                    height: '70px',
                    borderRadius: '50%',
                    border: '4px solid #10b981',
                    borderTopColor: 'transparent',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                      ✨ Erstelle Studio-Klang...
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                      Konzertsaal-Akustik & Lautstärke werden perfekt veredelt
                    </p>
                  </div>
                </div>
              ) : isCountingIn ? (
                /* 3-2-1 Countdown */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '20px 0' }}>
                  <div style={{
                    width: '110px',
                    height: '110px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '3.6rem',
                    fontWeight: 900,
                    boxShadow: '0 0 36px rgba(245, 158, 11, 0.6)',
                    animation: 'pulse 1s infinite'
                  }}>
                    {countInNumber}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#f59e0b' }}>
                      Hände ans Instrument! 🎶
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#64748b', fontWeight: 600 }}>
                      Aufnahme startet gleich...
                    </p>
                  </div>
                </div>
              ) : (
                /* Active Recording */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px', width: '100%' }}>
                  <div style={{
                    width: '96px',
                    height: '96px',
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '3px solid #ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'pulse 1.5s infinite',
                    boxShadow: '0 0 24px rgba(239, 68, 68, 0.4)'
                  }}>
                    <Mic size={44} color="#ef4444" />
                  </div>

                  <div>
                    <span style={{
                      fontSize: '2.2rem',
                      fontWeight: 900,
                      color: '#ef4444',
                      fontVariantNumeric: 'tabular-nums',
                      display: 'block'
                    }}>
                      {formatSec(recordSeconds)}
                    </span>
                    <span style={{ fontSize: '0.92rem', color: '#0f172a', fontWeight: 800, marginTop: '2px', display: 'block' }}>
                      Du spielst wunderbar! 🎶
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                      "{songTitle}" wird aufgenommen
                    </span>
                  </div>

                  {/* Bouncing Audio Waves Animation */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px' }}>
                    {[12, 24, 32, 20, 36, 16, 28, 22, 34, 18].map((h, i) => (
                      <div
                        key={i}
                        style={{
                          width: '5px',
                          height: `${Math.max(8, (h * (1 + Math.sin(recordSeconds * 2 + i))))}px`,
                          background: '#10b981',
                          borderRadius: '4px',
                          transition: 'height 0.2s ease'
                        }}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={stopLiveRecording}
                    style={{
                      width: '100%',
                      maxWidth: '360px',
                      padding: '16px',
                      borderRadius: '24px',
                      border: 'none',
                      background: '#ef4444',
                      color: 'white',
                      fontWeight: 900,
                      fontSize: '1.05rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)'
                    }}
                    className="hover-scale"
                  >
                    <Square size={20} fill="#ffffff" />
                    <span>🛑 Fertig gespielt!</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              SCHRITT 4: VORHÖREN, BELOHNUNG, GESCHENK-TEILEN & SPEICHERN
             ══════════════════════════════════════════════════════════════ */}
          {currentStep === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* 🌟 Campus XP Points Reward Banner */}
              <div style={{
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                border: '1.5px solid #f59e0b',
                borderRadius: '20px',
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: '#f59e0b',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    fontWeight: 900,
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)'
                  }}>
                    🪙
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#92400e' }}>
                      +{selectedGoalType === 'milestone' ? (selectedMilestone.type === 'first_song' ? 100 : 50) : 30} Campus XP Belohnung! 🎉
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 600 }}>
                      Wird direkt deinem Schüler-Profil gutgeschrieben
                    </div>
                  </div>
                </div>
                <div style={{
                  fontSize: '1.15rem',
                  fontWeight: 900,
                  color: '#b45309',
                  background: 'rgba(255, 255, 255, 0.6)',
                  padding: '4px 12px',
                  borderRadius: '100px'
                }}>
                  +{selectedGoalType === 'milestone' ? (selectedMilestone.type === 'first_song' ? 100 : 50) : 30} XP
                </div>
              </div>

              {/* Studio Master Audio Card */}
              <div style={{
                background: selectedGoalType === 'gift' 
                  ? 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)' 
                  : 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                borderRadius: '24px',
                padding: '18px',
                border: `1.5px solid ${selectedGoalType === 'gift' ? '#f472b6' : '#86efac'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '16px',
                    background: selectedGoalType === 'gift' 
                      ? 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' 
                      : selectedSticker.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                    flexShrink: 0
                  }}>
                    {selectedGoalType === 'gift' ? '🎁' : selectedSticker.emoji}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: selectedGoalType === 'gift' ? '#db2777' : '#059669', textTransform: 'uppercase' }}>
                      ✨ Studio-Klang veredelt • {formatSec(recordedDuration)} Min.
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
                      {songTitle}
                    </div>
                  </div>
                </div>

                {/* Play / Pause Preview Button */}
                <button
                  type="button"
                  onClick={togglePreview}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    border: 'none',
                    background: isPlayingPreview ? '#ef4444' : (selectedGoalType === 'gift' ? '#ec4899' : '#10b981'),
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)'
                  }}
                  className="hover-scale"
                >
                  {isPlayingPreview ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
                </button>
              </div>

              {/* 🎁 FALL 1: GESCHENK-FLOW -> DIRECT WHATSAPP SHARING CARD */}
              {selectedGoalType === 'gift' ? (
                <div style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  border: '2px solid #ec4899',
                  padding: '20px',
                  boxShadow: '0 8px 24px rgba(236, 72, 153, 0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2.4rem' }}>🎁✨</div>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.18rem', fontWeight: 900, color: '#9d174d' }}>
                      Dein Musik-Geschenk für {selectedRecipient.name} ist bereit!
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.80rem', color: '#64748b', lineHeight: 1.4 }}>
                      Teile dein persönliches Musikstück jetzt direkt per WhatsApp mit deiner Familie:
                    </p>
                  </div>

                  {/* 1-Click WhatsApp Share Button */}
                  <button
                    type="button"
                    onClick={handleWhatsAppShare}
                    style={{
                      width: '100%',
                      padding: '16px',
                      borderRadius: '18px',
                      border: 'none',
                      background: '#25D366',
                      color: 'white',
                      fontWeight: 900,
                      fontSize: '1.02rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: '0 6px 20px rgba(37, 211, 102, 0.35)'
                    }}
                    className="hover-scale"
                  >
                    <Share2 size={20} />
                    <span>🎁 Jetzt per WhatsApp an {selectedRecipient.name} senden</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      color: '#475569',
                      padding: '8px 16px',
                      borderRadius: '100px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    {linkCopied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    <span>{linkCopied ? 'Link kopiert! ✨' : 'Oder Link für Freunde kopieren'}</span>
                  </button>
                </div>
              ) : (
                /* 🏆 FALL 2 & 3: MEILENSTEIN ODER PLAYLIST -> BELOHNUNGS-STICKER WÄHLEN */
                <div>
                  <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                    Wähle deinen Belohnungs-Sticker für dieses Lied:
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                    {JUNIOR_STICKER_REWARDS.map(stk => {
                      const isChosen = selectedSticker.id === stk.id;
                      return (
                        <button
                          key={stk.id}
                          type="button"
                          onClick={() => setSelectedSticker(stk)}
                          style={{
                            aspectRatio: '1 / 1',
                            borderRadius: '16px',
                            border: isChosen ? '2.5px solid #10b981' : '1.5px solid #e2e8f0',
                            background: isChosen ? '#f0fdf4' : '#ffffff',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            boxShadow: isChosen ? '0 4px 12px rgba(16, 185, 129, 0.25)' : 'none',
                            transform: isChosen ? 'scale(1.06)' : 'scale(1)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span>{stk.emoji}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions: Re-Record vs. Save */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (previewAudioRef.current) previewAudioRef.current.pause();
                    setIsPlayingPreview(false);
                    setCurrentStep(3);
                    startRecordingCountIn();
                  }}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '18px',
                    border: '1.5px solid #cbd5e1',
                    background: 'transparent',
                    color: '#64748b',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <RotateCcw size={16} />
                  <span>Nochmal</span>
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveToTreasureBox}
                  style={{
                    flex: 2,
                    padding: '16px',
                    borderRadius: '20px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    fontWeight: 900,
                    fontSize: '1.02rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
                    opacity: isSaving ? 0.7 : 1
                  }}
                  className="hover-scale"
                >
                  <Trophy size={20} />
                  <span>{isSaving ? 'Speichere...' : 'In Schatztruhe sichern! 🏆'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
