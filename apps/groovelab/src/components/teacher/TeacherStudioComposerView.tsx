import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Sparkles, Send, Mic, Square, Play, Pause, CheckCircle2,
  Sliders, BookOpen, Music, Radio, Users, Check, AlertCircle,
  FileText, Star, Tag, Headphones, Clock, Info, ShieldCheck,
  ChevronRight, ChevronLeft, Layers, Bookmark, X, Plus
} from 'lucide-react';
import { SpeechDictationButton } from '../student/SpeechDictationButton';
import { formatTeacherFullName, formatSingleStudentAnonymized } from '../../utils/nameHelper';
import {
  assignTeacherHomeworkToStudents,
  fetchTeacherSandboxEntry,
  saveTeacherSandboxEntry,
  fetchTeacherMediaAssets,
  TeacherMediaAssets
} from '../../services/teacherStudioService';
import { TeacherMediaPickerDrawer } from './TeacherMediaPickerDrawer';
import { requestMicrophonePermissionOnce, acquireAudioStream } from '../../services/audioPermissionService';
import { buildCanonicalAudioStoragePath } from '../../utils/audioStorageHelper';
import { storeBlob } from '../../utils/blobStorage';
import { supabase } from '../../lib/supabase';
import {
  processStudioMastering,
  TARGET_STUDIO_LUFS,
  TARGET_PEAK_DBTP
} from '../../utils/audioMasteringEngine';

export interface TeacherStudioComposerViewProps {
  teacher: any;
  allStudents: any[];
  todayStudents?: any[];
  schoolData?: any;
  activePlatform?: 'campus' | 'groovelab';
  onClose?: () => void;
}

const DIDACTIC_TAGS = [
  'Rhythmus', 'Wechselschlag', 'Haltung', 'Koordination',
  'Dynamik', 'Intonation', 'Auswendig', 'Timing'
];

const PRESET_TEMPLATES = [
  {
    title: 'Pentatonik & Blues-Shuffle',
    level: 'advance' as const,
    notes: 'Takt 1-8 mit Wechselschlag bei 80 BPM üben. Achte auf entspannte Fingerhaltung.',
    tags: ['Rhythmus', 'Wechselschlag', 'Timing'],
    speedLadder: [60, 80, 100],
    spotlightBars: 'Takt 9-12 (Akkordwechsel)',
    loopTitle: 'A-Moll Blues Shuffle',
    loopBpm: 80,
    parentMemo: 'Liebe Eltern: Der Rhythmus sollte gleichmäßig wie ein Zug fließen.'
  },
  {
    title: 'Erste Akkorde: G-Dur & E-Moll',
    level: 'core' as const,
    notes: 'Flüssiger Wechsel zwischen G-Dur und Em im 4/4 Takt. Laut mitzählen.',
    tags: ['Haltung', 'Rhythmus', 'Koordination'],
    speedLadder: [50, 70, 90],
    spotlightBars: 'Wechsel auf Schlag 1',
    loopTitle: 'Folk Beat 70 BPM',
    loopBpm: 70,
    parentMemo: 'Liebe Eltern: Wenn der Daumen hinter dem Hals bleibt, greift es sauber.'
  },
  {
    title: 'Solo-Artikulation & Bending',
    level: 'master' as const,
    notes: 'Ganzton-Bendings sauber intonieren. Ringfinger vom Mittelfinger stützen.',
    tags: ['Intonation', 'Dynamik', 'Auswendig'],
    speedLadder: [75, 90, 110],
    spotlightBars: 'Takt 16 (Höhepunkt)',
    loopTitle: 'Rock Groove 95 BPM',
    loopBpm: 95,
    parentMemo: 'Liebe Eltern: Das Solo soll mit klarem Ausdruck klingen.'
  }
];

export const TeacherStudioComposerView: React.FC<TeacherStudioComposerViewProps> = ({
  teacher,
  allStudents = [],
  todayStudents = [],
  schoolData,
  activePlatform = 'campus',
  onClose
}) => {
  const teacherId = teacher?.id || teacher?.userId;
  const schoolId = teacher?.school_id || teacher?.schoolId;

  // ─── ACTIVE STEP IN MINIMALIST STEPPER: 1 | 2 | 3 ───
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  // 1. Package Form States (Step 1)
  const [topicName, setTopicName] = useState('Pentatonik & Blues-Shuffle');
  const [difficultyLevel, setDifficultyLevel] = useState<'core' | 'advance' | 'master'>('advance');
  const [homeworkNotes, setHomeworkNotes] = useState(
    'Takt 1-8 mit Wechselschlag bei 80 BPM üben. Achte auf entspannte Handgelenke und sauberes Dämpfen.'
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(['Rhythmus', 'Wechselschlag']);
  const [includeLehrwerk, setIncludeLehrwerk] = useState<boolean>(true);

  // ─── 📚 MEDIATHEK & MEDIEN-BAUKASTEN STATES ───
  const [mediaAssets, setMediaAssets] = useState<TeacherMediaAssets | null>(null);
  const [isLoadingMediaAssets, setIsLoadingMediaAssets] = useState<boolean>(true);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState<boolean>(false);
  const [mediaPickerInitialTab, setMediaPickerInitialTab] = useState<'lehrwerke' | 'songs' | 'audios'>('lehrwerke');

  // Modulare Bausteine im Paket
  const [selectedLehrwerke, setSelectedLehrwerke] = useState<Array<{
    id: string;
    title: string;
    author?: string;
    instrument?: string;
    pages: string;
    bookColor?: { from: string; to: string; text: string };
  }>>([
    {
      id: 'lw-default-1',
      title: 'Schule für E-Gitarre Band 1',
      author: 'Peter Bursch',
      instrument: 'E-Gitarre',
      pages: '24, 25'
    }
  ]);

  const [selectedSongs, setSelectedSongs] = useState<Array<{
    id: string;
    title: string;
    artist?: string;
    instrument?: string;
    tempo_bpm?: number;
    key?: string;
    audio_url?: string | null;
  }>>([]);

  const [selectedTeacherAudios, setSelectedTeacherAudios] = useState<Array<{
    id: string;
    title: string;
    url: string;
    duration?: number;
  }>>([]);

  // 2. Audio & Media States (Step 2)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedAudioDuration, setRecordedAudioDuration] = useState<number>(24);
  const [isPlayingRecorded, setIsPlayingRecorded] = useState(false);
  const [isMastering, setIsMastering] = useState(false);
  const [audioBpm, setAudioBpm] = useState<number>(80);

  // Progressive Disclosure Toggles (Expand on demand)
  const [showSpeedLadder, setShowSpeedLadder] = useState(false);
  const [speedLadder, setSpeedLadder] = useState<number[]>([60, 80, 100]);
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [spotlightBars, setSpotlightBars] = useState<string>('Takt 9–12 (Akkordwechsel)');
  const [showLoop, setShowLoop] = useState(false);
  const [includeLoop, setIncludeLoop] = useState<boolean>(false);
  const [loopTitle, setLoopTitle] = useState<string>('A-Moll Blues Shuffle (4 Spuren)');
  const [loopBpm, setLoopBpm] = useState<number>(80);
  const [showParentMemo, setShowParentMemo] = useState(false);
  const [parentMemo, setParentMemo] = useState<string>(
    'Liebe Eltern, hören Sie kurz rein: Der Rhythmus sollte gleichmäßig wie ein Zug fließen.'
  );

  // 🚀 Auto-Hydrate Mediathek Assets (100% DSGVO-rein, nur eigene Lehrer-Audios)
  useEffect(() => {
    let isMounted = true;
    if (teacherId) {
      setIsLoadingMediaAssets(true);
      fetchTeacherMediaAssets(teacherId, schoolId)
        .then(assets => {
          if (isMounted) {
            setMediaAssets(assets);
            setIsLoadingMediaAssets(false);
          }
        })
        .catch(err => {
          console.warn('[TeacherStudioComposer] Error loading media assets:', err);
          if (isMounted) setIsLoadingMediaAssets(false);
        });
    }
    return () => { isMounted = false; };
  }, [teacherId, schoolId]);

  // Drawer & Builder Handlers
  const handleOpenMediaPicker = (tab: 'lehrwerke' | 'songs' | 'audios' = 'lehrwerke') => {
    setMediaPickerInitialTab(tab);
    setIsMediaPickerOpen(true);
  };

  const handleAddLehrwerk = (lw: { id: string; title: string; author?: string; instrument?: string; bookColor?: any }) => {
    setSelectedLehrwerke(prev => {
      const exists = prev.find(item => item.title.toLowerCase() === lw.title.toLowerCase());
      if (exists) {
        return prev.filter(item => item.title.toLowerCase() !== lw.title.toLowerCase());
      } else {
        return [...prev, {
          id: lw.id || `lw-${Date.now()}`,
          title: lw.title,
          author: lw.author,
          instrument: lw.instrument,
          pages: '1',
          bookColor: lw.bookColor
        }];
      }
    });
  };

  const handleUpdateLehrwerkPages = (id: string, pages: string) => {
    setSelectedLehrwerke(prev => prev.map(item => item.id === id ? { ...item, pages } : item));
  };

  const handleRemoveLehrwerk = (id: string) => {
    setSelectedLehrwerke(prev => prev.filter(item => item.id !== id));
  };

  const handleAddSong = (song: { id: string; title: string; artist?: string; tempo_bpm?: number; key?: string; audio_url?: string | null }) => {
    setSelectedSongs(prev => {
      const exists = prev.find(item => item.id === song.id || item.title.toLowerCase() === song.title.toLowerCase());
      if (exists) {
        return prev.filter(item => item.id !== song.id && item.title.toLowerCase() !== song.title.toLowerCase());
      } else {
        return [...prev, song];
      }
    });
  };

  const handleRemoveSong = (id: string) => {
    setSelectedSongs(prev => prev.filter(item => item.id !== id));
  };

  const handleAddAudio = (audio: { url: string; label: string; duration?: number }) => {
    setSelectedTeacherAudios(prev => {
      const exists = prev.find(item => item.url === audio.url);
      if (exists) {
        return prev.filter(item => item.url !== audio.url);
      } else {
        return [...prev, { id: `audio-${Date.now()}`, title: audio.label, url: audio.url, duration: audio.duration }];
      }
    });
  };

  const handleRemoveAudio = (url: string) => {
    setSelectedTeacherAudios(prev => prev.filter(item => item.url !== url));
  };

  // 3. Distribution States (Step 3)
  const currentWeekIso = useMemo(() => {
    const d = new Date();
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    const pastDays = (d.getTime() - startOfYear.getTime()) / 86400000;
    const wk = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${String(wk).padStart(2, '0')}`;
  }, []);

  const [targetWeekOffset, setTargetWeekOffset] = useState<0 | 1>(0);
  const [appendMode, setAppendMode] = useState<boolean>(true);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [instrumentFilter, setInstrumentFilter] = useState<string>('all');

  // UI Feedback
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Auto-select today students on mount
  useEffect(() => {
    if (todayStudents && todayStudents.length > 0) {
      setSelectedStudentIds(new Set(todayStudents.map(s => String(s.id))));
    } else if (allStudents && allStudents.length > 0) {
      setSelectedStudentIds(new Set(allStudents.slice(0, 6).map(s => String(s.id))));
    }
  }, [todayStudents, allStudents]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const loadTemplate = (tmpl: typeof PRESET_TEMPLATES[0]) => {
    setTopicName(tmpl.title);
    setDifficultyLevel(tmpl.level);
    setHomeworkNotes(tmpl.notes);
    setSelectedTags(tmpl.tags);
    setSpeedLadder(tmpl.speedLadder);
    setSpotlightBars(tmpl.spotlightBars);
    setLoopTitle(tmpl.loopTitle);
    setLoopBpm(tmpl.loopBpm);
    setParentMemo(tmpl.parentMemo);
    showToast(`✓ Vorlage „${tmpl.title}“ geladen!`);
  };

  // Audio Recording with Studio Mastering Pipeline
  const startRecording = async () => {
    setErrorMessage(null);
    const hasPerm = await requestMicrophonePermissionOnce();
    if (!hasPerm) {
      setErrorMessage('Mikrofonzugriff wurde im Browser nicht gestattet.');
      return;
    }

    try {
      const stream = await acquireAudioStream();
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const rawAudioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setIsMastering(true);
        let finalBlob: Blob = rawAudioBlob;
        let finalUrl = URL.createObjectURL(rawAudioBlob);

        try {
          // 🎛️ EBU R128 STUDIO MASTERING (-14.0 LUFS DSP Pipeline)
          const masterResult = await processStudioMastering(rawAudioBlob, {
            profile: 'acoustic_audiophile',
            targetLufs: TARGET_STUDIO_LUFS,
            targetPeakDb: TARGET_PEAK_DBTP,
            applyConvolutionReverb: true,
            reverbRoomType: 'small',
            reverbWetMix: 0.06
          });

          if (masterResult && masterResult.masteredBlob) {
            finalBlob = masterResult.masteredBlob;
            finalUrl = masterResult.masteredUrl;
            if (masterResult.durationSec) {
              setRecordedAudioDuration(Math.round(masterResult.durationSec));
            }
          }
        } catch (masterErr) {
          console.warn('[TeacherStudioComposer] Mastering fallback:', masterErr);
        } finally {
          setIsMastering(false);
        }

        setRecordedAudioUrl(finalUrl);

        // Offline-Safe Local Caching
        const localKey = `studio_ref_${Date.now()}.mp3`;
        await storeBlob(localKey, finalBlob).catch(() => {});

        // Background Cloud Upload
        if (schoolId && teacherId) {
          const cloudPath = buildCanonicalAudioStoragePath(schoolId, teacherId, 'recordings', localKey);
          supabase.storage.from('campus-assets').upload(cloudPath, finalBlob, { upsert: true }).catch(() => {});
        }
      };

      recorder.start(200);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } catch (e: any) {
      console.error('Recording start error:', e);
      setErrorMessage('Aufnahme konnte nicht gestartet werden.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      } catch {}
    }
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsRecording(false);
    setRecordedAudioDuration(Math.max(1, recordingSeconds));
  };

  const togglePlayback = () => {
    if (!recordedAudioUrl) return;
    if (!audioElementRef.current) {
      audioElementRef.current = new Audio(recordedAudioUrl);
      audioElementRef.current.onended = () => setIsPlayingRecorded(false);
    }
    if (isPlayingRecorded) {
      audioElementRef.current.pause();
      setIsPlayingRecorded(false);
    } else {
      audioElementRef.current.play().catch(() => {});
      setIsPlayingRecorded(true);
    }
  };

  // Student Filters
  const uniqueInstruments = useMemo(() => {
    const set = new Set<string>();
    allStudents.forEach(s => {
      if (s.instrument) set.add(s.instrument);
    });
    return Array.from(set);
  }, [allStudents]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.toLowerCase().trim();
    return allStudents.filter(s => {
      if (!s) return false;
      const firstName = (s.first_name || s.name?.split(' ')[0] || '').toLowerCase();
      const lastName = (s.last_name || '').toLowerCase();
      const inst = (s.instrument || '').toLowerCase();
      const matchesSearch = !q || firstName.includes(q) || lastName.includes(q) || inst.includes(q);
      const matchesInst = instrumentFilter === 'all' || s.instrument === instrumentFilter;
      return matchesSearch && matchesInst;
    });
  }, [allStudents, studentSearch, instrumentFilter]);

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllToday = () => {
    if (todayStudents && todayStudents.length > 0) {
      setSelectedStudentIds(new Set(todayStudents.map(s => String(s.id))));
    }
  };

  const selectAllFiltered = () => {
    setSelectedStudentIds(new Set(filteredStudents.map(s => String(s.id))));
  };

  const clearSelection = () => {
    setSelectedStudentIds(new Set());
  };

  // Final Dispatch
  const handleDispatchPackage = async () => {
    if (selectedStudentIds.size === 0) {
      setErrorMessage('Bitte wähle mindestens einen Schüler aus.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const lehrwerkePayload = selectedLehrwerke.map(lw => ({
        id: lw.id,
        title: lw.title,
        pages: lw.pages
      }));

      const songsPayload = selectedSongs.map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        bpm: s.tempo_bpm,
        key: s.key,
        audio_url: s.audio_url || undefined
      }));

      const audiosPayload = [
        ...(recordedAudioUrl ? [{
          id: `rec-${Date.now()}`,
          name: `${topicName} (Master-Referenz ${audioBpm} BPM)`,
          url: recordedAudioUrl,
          duration_seconds: recordedAudioDuration
        }] : []),
        ...selectedTeacherAudios.map(a => ({
          id: a.id,
          name: a.title,
          url: a.url,
          duration_seconds: a.duration || 30
        }))
      ];

      let compositeNotes = homeworkNotes;
      if (selectedTags.length > 0) {
        compositeNotes += `\n🎯 Didaktischer Fokus: ${selectedTags.join(', ')}`;
      }
      if (showSpotlight && spotlightBars) {
        compositeNotes += `\n🔁 Spotlight-Loop: ${spotlightBars}`;
      }
      if (includeLoop && loopTitle) {
        compositeNotes += `\n🎛️ Loopstation-Jam: ${loopTitle} (${loopBpm} BPM)`;
      }
      if (showParentMemo && parentMemo) {
        compositeNotes += `\n👨‍👩‍👧 Eltern-Hinweis: ${parentMemo}`;
      }

      const parts = currentWeekIso.split('-W');
      let targetWeek = currentWeekIso;
      if (parts.length === 2 && targetWeekOffset === 1) {
        const yr = parseInt(parts[0], 10);
        const wk = parseInt(parts[1], 10) + 1;
        targetWeek = `${yr}-W${String(wk).padStart(2, '0')}`;
      }

      const result = await assignTeacherHomeworkToStudents({
        teacherId: teacherId || '',
        schoolId: schoolId || '',
        targetStudentIds: Array.from(selectedStudentIds),
        targetWeekIso: targetWeek,
        topicName: topicName,
        notesContent: compositeNotes,
        lehrwerke: lehrwerkePayload,
        songs: songsPayload,
        audios: audiosPayload,
        appendMode: appendMode
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Fehler bei der Zuweisung.');
      } else {
        const studentNames = allStudents
          .filter(s => selectedStudentIds.has(String(s.id)))
          .map(s => formatSingleStudentAnonymized(s.first_name, s.last_name, s.id));
        const previewNames = studentNames.slice(0, 3).join(', ') + (studentNames.length > 3 ? ` (+${studentNames.length - 3})` : '');
        showToast(`🎉 Aufgaben-Paket an ${result.assigned_count} Schüler zugewiesen (${previewNames})!`);
      }
    } catch (err: any) {
      console.error('Dispatch error:', err);
      setErrorMessage(err?.message || 'Unerwarteter Fehler bei der Zuweisung.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      minHeight: '85vh',
      boxSizing: 'border-box',
      background: '#f8fafc',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      padding: '8px 16px 40px 16px'
    }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div role="status" aria-live="polite" style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 999999,
          backgroundColor: '#0f172a',
          color: '#ffffff',
          padding: '14px 22px',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.88rem',
          fontWeight: 800,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <CheckCircle2 size={20} color="#22c55e" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ─── HEADER WITH MINIMALIST 3-STEP STEPPER ─── */}
      <header style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '20px',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        {/* Title & Template Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {onClose && (
            <button
              type="button"
              role="button"
              tabIndex={0}
              aria-label="Zurück zum Briefing Board"
              onClick={onClose}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClose();
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                minHeight: '40px',
                borderRadius: '12px',
                border: '1.5px solid #e2e8f0',
                background: '#ffffff',
                color: '#475569',
                fontWeight: 800,
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
              }}
              className="hover-scale"
              title="Zurück zum Briefing Board"
            >
              <ChevronLeft size={16} />
              <span>Zurück zum Briefing</span>
            </button>
          )}

          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(2, 132, 199, 0.25)'
          }}>
            <Sparkles size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
              Campus Didaktik-Studio
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Vorlagen:</span>
              {PRESET_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => loadTemplate(tmpl)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '100px',
                    padding: '3px 10px',
                    fontSize: '0.68rem',
                    fontWeight: 750,
                    color: '#334155',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  className="hover-scale-mini"
                >
                  <Bookmark size={10} color="#0284c7" />
                  <span>{tmpl.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Apple-Grade 3-Step Segmented Stepper */}
        <div style={{
          background: '#f1f5f9',
          borderRadius: '100px',
          padding: '4px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          border: '1px solid #e2e8f0'
        }}>
          <button
            type="button"
            onClick={() => setActiveStep(1)}
            style={{
              border: 'none',
              borderRadius: '100px',
              padding: '6px 16px',
              fontSize: '0.78rem',
              fontWeight: 850,
              cursor: 'pointer',
              background: activeStep === 1 ? '#0284c7' : 'transparent',
              color: activeStep === 1 ? '#ffffff' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: activeStep === 1 ? 'rgba(255,255,255,0.25)' : '#cbd5e1', color: activeStep === 1 ? '#fff' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.70rem' }}>1</span>
            <span>Inhalt & Notiz</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStep(2)}
            style={{
              border: 'none',
              borderRadius: '100px',
              padding: '6px 16px',
              fontSize: '0.78rem',
              fontWeight: 850,
              cursor: 'pointer',
              background: activeStep === 2 ? '#0284c7' : 'transparent',
              color: activeStep === 2 ? '#ffffff' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: activeStep === 2 ? 'rgba(255,255,255,0.25)' : '#cbd5e1', color: activeStep === 2 ? '#fff' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.70rem' }}>2</span>
            <span>Audio & Medien</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStep(3)}
            style={{
              border: 'none',
              borderRadius: '100px',
              padding: '6px 16px',
              fontSize: '0.78rem',
              fontWeight: 850,
              cursor: 'pointer',
              background: activeStep === 3 ? '#0284c7' : 'transparent',
              color: activeStep === 3 ? '#ffffff' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: activeStep === 3 ? 'rgba(255,255,255,0.25)' : '#cbd5e1', color: activeStep === 3 ? '#fff' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.70rem' }}>3</span>
            <span>Schüler zuweisen</span>
          </button>
        </div>
      </header>

      {/* Error Alert */}
      {errorMessage && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fee2e2',
          borderRadius: '14px',
          padding: '12px 18px',
          color: '#991b1b',
          fontSize: '0.84rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '16px'
        }}>
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ─── 2-COLUMN FOCUSED WORKSPACE ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: window.innerWidth > 1024 ? '1.18fr 0.82fr' : '1fr',
        gap: '20px',
        alignItems: 'start'
      }}>
        {/* ══════════════════════════════════════════════════════════════
            SPALTE 1: AKTIVER SCHRITT IM BAUKASTEN
        ══════════════════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* ───────── SCHRITT 1: INHALT & NOTIZ ───────── */}
          {activeStep === 1 && (
            <div style={{
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 850, color: '#0f172a' }}>
                    Thema & Lektion
                  </label>
                  {/* Difficulty Pills */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setDifficultyLevel('core')}
                      style={{
                        border: 'none',
                        borderRadius: '100px',
                        padding: '4px 10px',
                        fontSize: '0.70rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: difficultyLevel === 'core' ? '#22c55e' : '#f1f5f9',
                        color: difficultyLevel === 'core' ? '#ffffff' : '#475569'
                      }}
                    >
                      🌱 Core
                    </button>
                    <button
                      type="button"
                      onClick={() => setDifficultyLevel('advance')}
                      style={{
                        border: 'none',
                        borderRadius: '100px',
                        padding: '4px 10px',
                        fontSize: '0.70rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: difficultyLevel === 'advance' ? '#0284c7' : '#f1f5f9',
                        color: difficultyLevel === 'advance' ? '#ffffff' : '#475569'
                      }}
                    >
                      ⚡ Advance
                    </button>
                    <button
                      type="button"
                      onClick={() => setDifficultyLevel('master')}
                      style={{
                        border: 'none',
                        borderRadius: '100px',
                        padding: '4px 10px',
                        fontSize: '0.70rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: difficultyLevel === 'master' ? '#eab308' : '#f1f5f9',
                        color: difficultyLevel === 'master' ? '#0f172a' : '#475569'
                      }}
                    >
                      👑 Master
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                  placeholder="z.B. Pentatonik & Blues-Shuffle"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    fontSize: '0.98rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    outline: 'none',
                    background: '#f8fafc'
                  }}
                />
              </div>

              {/* Übeanweisung mit Diktat */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 850, color: '#0f172a' }}>
                    Übeanweisung für den Schüler
                  </label>
                  <SpeechDictationButton
                    onTranscript={(txt) => setHomeworkNotes(prev => prev ? `${prev} ${txt}` : txt)}
                    size="sm"
                    title="Übeanweisung diktieren"
                  />
                </div>

                <textarea
                  rows={4}
                  value={homeworkNotes}
                  onChange={(e) => setHomeworkNotes(e.target.value)}
                  placeholder="Was soll geübt werden? (z.B. Takt 1-8 mit Wechselschlag)..."
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    color: '#1e293b',
                    outline: 'none',
                    resize: 'vertical',
                    background: '#f8fafc',
                    lineHeight: 1.5
                  }}
                />

                {/* Didactic Quick-Chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                  {DIDACTIC_TAGS.map((tag, idx) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        style={{
                          background: isSelected ? '#dcfce7' : '#f1f5f9',
                          border: isSelected ? '1px solid #86efac' : '1px solid #e2e8f0',
                          borderRadius: '100px',
                          padding: '3px 10px',
                          fontSize: '0.70rem',
                          fontWeight: 800,
                          color: isSelected ? '#166534' : '#64748b',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Tag size={10} />
                        <span>{tag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lehrwerk & Seiten: 1% Goldstandard Baukasten */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 850, color: '#0f172a' }}>
                    Lehrwerke & Seiten ({selectedLehrwerke.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => handleOpenMediaPicker('lehrwerke')}
                    style={{
                      background: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      color: '#0284c7',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={13} />
                    <span>Aus Mediathek wählen</span>
                  </button>
                </div>

                {selectedLehrwerke.length === 0 ? (
                  <div
                    onClick={() => handleOpenMediaPicker('lehrwerke')}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1.5px dashed #cbd5e1',
                      background: '#f8fafc',
                      textAlign: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <BookOpen size={22} color="#94a3b8" style={{ margin: '0 auto 6px auto', display: 'block' }} />
                    <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#64748b' }}>
                      Kein Lehrwerk zugewiesen. Klicke hier, um Lehrwerke aus der Mediathek auszuwählen.
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedLehrwerke.map((lw) => (
                      <div
                        key={lw.id}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          flexWrap: 'wrap'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '180px', flex: 1 }}>
                          <div style={{
                            width: '32px',
                            height: '38px',
                            borderRadius: '4px',
                            background: 'linear-gradient(135deg, #334155 0%, #0f172a 100%)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <BookOpen size={15} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {lw.title}
                            </span>
                            <div style={{ fontSize: '0.70rem', color: '#64748b', display: 'flex', gap: '6px' }}>
                              {lw.author && <span>{lw.author}</span>}
                              {lw.instrument && <span style={{ background: '#e2e8f0', padding: '0 4px', borderRadius: '3px' }}>{lw.instrument}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Inline Page Numbers Input */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <label style={{ fontSize: '0.74rem', fontWeight: 750, color: '#475569' }}>
                            Seiten:
                          </label>
                          <input
                            type="text"
                            value={lw.pages}
                            onChange={(e) => handleUpdateLehrwerkPages(lw.id, e.target.value)}
                            placeholder="z.B. 24, 25"
                            style={{
                              width: '110px',
                              border: '1.5px solid #cbd5e1',
                              borderRadius: '8px',
                              padding: '5px 8px',
                              fontSize: '0.80rem',
                              fontWeight: 800,
                              color: '#0f172a',
                              background: '#ffffff',
                              outline: 'none'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveLehrwerk(lw.id)}
                            aria-label="Lehrwerk entfernen"
                            title="Entfernen"
                            style={{
                              border: 'none',
                              background: '#fee2e2',
                              color: '#ef4444',
                              borderRadius: '6px',
                              width: '28px',
                              height: '28px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stepper Footer: Go to Step 2 */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 20px',
                    fontSize: '0.84rem',
                    fontWeight: 850,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
                  }}
                  className="hover-scale"
                >
                  <span>Weiter: Audio & Medien</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ───────── SCHRITT 2: AUDIO & MEDIEN ───────── */}
          {activeStep === 2 && (
            <div style={{
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 850, color: '#0f172a' }}>
                    Master-Play-Along einspielen
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>Metronom:</span>
                    <input
                      type="number"
                      min="40"
                      max="220"
                      value={audioBpm}
                      onChange={(e) => setAudioBpm(parseInt(e.target.value, 10) || 80)}
                      style={{
                        width: '54px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '2px 6px',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        textAlign: 'center'
                      }}
                    />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>BPM</span>
                  </div>
                </div>

                {/* Big Apple-Grade Record Bar */}
                <div style={{
                  background: '#faf5ff',
                  border: '1.5px solid #e9d5ff',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      style={{
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '10px 20px',
                        fontSize: '0.84rem',
                        fontWeight: 850,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                      }}
                      className="hover-scale"
                    >
                      <Mic size={18} />
                      <span>Referenz aufnehmen</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      style={{
                        background: '#ef4444',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '10px 20px',
                        fontSize: '0.84rem',
                        fontWeight: 850,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        animation: 'pulse 1.5s infinite'
                      }}
                    >
                      <Square size={16} />
                      <span>Aufnahme stoppen ({recordingSeconds}s)</span>
                    </button>
                  )}

                  {/* Mastering Feedback */}
                  {isMastering && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7e22ce', fontSize: '0.78rem', fontWeight: 850 }}>
                      <Sparkles size={16} color="#9333ea" />
                      <span>✨ Studio-Mastering läuft (-14 LUFS DSP)...</span>
                    </div>
                  )}

                  {/* Playback preview if recorded */}
                  {!isMastering && recordedAudioUrl && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={togglePlayback}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #c084fc',
                          borderRadius: '10px',
                          padding: '8px 14px',
                          fontSize: '0.78rem',
                          fontWeight: 850,
                          color: '#7e22ce',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {isPlayingRecorded ? <Pause size={14} /> : <Play size={14} />}
                        <span>{isPlayingRecorded ? 'Pause' : 'Master abhören'}</span>
                      </button>
                      <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#7e22ce' }}>
                        {recordedAudioDuration}s (-14 LUFS)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 🎵 REPERTOIRE-SONGS AUS DER MEDIATHEK */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 850, color: '#0f172a' }}>
                    Repertoire-Songs aus Mediathek ({selectedSongs.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => handleOpenMediaPicker('songs')}
                    style={{
                      background: '#fefce8',
                      border: '1px solid #fef08a',
                      color: '#a16207',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={13} />
                    <span>Song aus Mediathek wählen</span>
                  </button>
                </div>

                {selectedSongs.length === 0 ? (
                  <div
                    onClick={() => handleOpenMediaPicker('songs')}
                    style={{
                      padding: '14px',
                      borderRadius: '12px',
                      border: '1.5px dashed #cbd5e1',
                      background: '#f8fafc',
                      textAlign: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <Music size={20} color="#94a3b8" style={{ margin: '0 auto 4px auto', display: 'block' }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>
                      Kein Repertoire-Song gewählt. Klicke hier, um Titel mit BPM & Backing-Track hinzuzufügen.
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedSongs.map(song => (
                      <div
                        key={song.id}
                        style={{
                          background: '#fffbeb',
                          border: '1px solid #fde68a',
                          borderRadius: '12px',
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: '#facc15',
                            color: '#0f172a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <Music size={16} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {song.title}
                            </span>
                            <div style={{ fontSize: '0.70rem', color: '#64748b', display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span>{song.artist}</span>
                              {song.tempo_bpm && <span style={{ fontWeight: 800, color: '#854d0e' }}>{song.tempo_bpm} BPM</span>}
                              {song.key && <span style={{ fontWeight: 800 }}>{song.key}</span>}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveSong(song.id)}
                          aria-label="Song entfernen"
                          title="Entfernen"
                          style={{
                            border: 'none',
                            background: '#fee2e2',
                            color: '#ef4444',
                            borderRadius: '6px',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 🎙️ EIGENE LEHRER-AUDIOS AUS AUFGABENHEFT / TRESOR */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 850, color: '#0f172a' }}>
                    Eigene Lehrer-Demos & Übe-Memos ({selectedTeacherAudios.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => handleOpenMediaPicker('audios')}
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      color: '#16a34a',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={13} />
                    <span>Demo aus Mediathek wählen</span>
                  </button>
                </div>

                {selectedTeacherAudios.length === 0 ? (
                  <div
                    onClick={() => handleOpenMediaPicker('audios')}
                    style={{
                      padding: '14px',
                      borderRadius: '12px',
                      border: '1.5px dashed #cbd5e1',
                      background: '#f8fafc',
                      textAlign: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <Mic size={20} color="#94a3b8" style={{ margin: '0 auto 4px auto', display: 'block' }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>
                      Keine eigene Archiv-Aufnahme gewählt. Klicke hier, um eigene Demos aus dem Aufgabenheft hinzuzufügen.
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedTeacherAudios.map(audio => (
                      <div
                        key={audio.id}
                        style={{
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: '12px',
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: '#22c55e',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <Mic size={16} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {audio.title}
                            </span>
                            <div style={{ fontSize: '0.70rem', color: '#16a34a', display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 700 }}>
                              <span>Lehrer-Demo</span>
                              {audio.duration && <span>{audio.duration}s</span>}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveAudio(audio.url)}
                          aria-label="Audio entfernen"
                          title="Entfernen"
                          style={{
                            border: 'none',
                            background: '#fee2e2',
                            color: '#ef4444',
                            borderRadius: '6px',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Progressive Disclosure Pills: Add Optional Tools */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '8px' }}>
                  Zusätzliche Medien & Didaktik-Tools (Optional):
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowSpeedLadder(!showSpeedLadder)}
                    style={{
                      background: showSpeedLadder ? '#e0f2fe' : '#f1f5f9',
                      border: showSpeedLadder ? '1px solid #7dd3fc' : '1px solid #e2e8f0',
                      color: showSpeedLadder ? '#0369a1' : '#475569',
                      borderRadius: '100px',
                      padding: '6px 14px',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {showSpeedLadder ? <Check size={14} /> : <Plus size={14} />}
                    <span>Speed-Ladder (60/80/100%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSpotlight(!showSpotlight)}
                    style={{
                      background: showSpotlight ? '#f3e8ff' : '#f1f5f9',
                      border: showSpotlight ? '1px solid #d8b4fe' : '1px solid #e2e8f0',
                      color: showSpotlight ? '#7e22ce' : '#475569',
                      borderRadius: '100px',
                      padding: '6px 14px',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {showSpotlight ? <Check size={14} /> : <Plus size={14} />}
                    <span>Spotlight-Looping</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowLoop(!showLoop);
                      setIncludeLoop(!showLoop);
                    }}
                    style={{
                      background: showLoop ? '#fef9c3' : '#f1f5f9',
                      border: showLoop ? '1px solid #fde047' : '1px solid #e2e8f0',
                      color: showLoop ? '#854d0e' : '#475569',
                      borderRadius: '100px',
                      padding: '6px 14px',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {showLoop ? <Check size={14} /> : <Plus size={14} />}
                    <span>Loopstation-Jam</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowParentMemo(!showParentMemo)}
                    style={{
                      background: showParentMemo ? '#dcfce7' : '#f1f5f9',
                      border: showParentMemo ? '1px solid #86efac' : '1px solid #e2e8f0',
                      color: showParentMemo ? '#166534' : '#475569',
                      borderRadius: '100px',
                      padding: '6px 14px',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {showParentMemo ? <Check size={14} /> : <Plus size={14} />}
                    <span>Eltern-Hinweis</span>
                  </button>
                </div>
              </div>

              {/* Collapsible Tool 1: Spotlight-Looping */}
              {showSpotlight && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px' }}>
                  <label style={{ fontSize: '0.76rem', fontWeight: 850, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    🔁 Problemstellen-Loop (z.B. Takt 9–12)
                  </label>
                  <input
                    type="text"
                    value={spotlightBars}
                    onChange={(e) => setSpotlightBars(e.target.value)}
                    placeholder="z.B. Takt 9–12 (Akkordwechsel)"
                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', fontSize: '0.82rem', fontWeight: 700 }}
                  />
                </div>
              )}

              {/* Collapsible Tool 2: Loopstation Backing */}
              {showLoop && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px' }}>
                  <label style={{ fontSize: '0.76rem', fontWeight: 850, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    🎛️ Loopstation Backing-Track
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                    <input
                      type="text"
                      value={loopTitle}
                      onChange={(e) => setLoopTitle(e.target.value)}
                      placeholder="Loop-Titel"
                      style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', fontSize: '0.82rem', fontWeight: 700 }}
                    />
                    <input
                      type="number"
                      value={loopBpm}
                      onChange={(e) => setLoopBpm(parseInt(e.target.value, 10) || 80)}
                      style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', fontSize: '0.82rem', fontWeight: 700, textAlign: 'center' }}
                    />
                  </div>
                </div>
              )}

              {/* Collapsible Tool 3: Eltern-Hinweis */}
              {showParentMemo && (
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '12px 16px' }}>
                  <label style={{ fontSize: '0.76rem', fontWeight: 850, color: '#065f46', display: 'block', marginBottom: '6px' }}>
                    👨‍👩‍👧 Eltern-Quick-Check
                  </label>
                  <input
                    type="text"
                    value={parentMemo}
                    onChange={(e) => setParentMemo(e.target.value)}
                    placeholder="Hör-Tipp für Eltern..."
                    style={{ width: '100%', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '8px 12px', fontSize: '0.80rem', fontWeight: 600, color: '#065f46' }}
                  />
                </div>
              )}

              {/* Stepper Footer: Back to 1 / Go to 3 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 18px',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <ChevronLeft size={16} />
                  <span>Zurück: Inhalt</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 20px',
                    fontSize: '0.84rem',
                    fontWeight: 850,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
                  }}
                  className="hover-scale"
                >
                  <span>Weiter: Schüler zuweisen</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ───────── SCHRITT 3: SCHÜLER ZUWEISEN ───────── */}
          {activeStep === 3 && (
            <div style={{
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.86rem', fontWeight: 850, color: '#0f172a' }}>
                  Empfänger auswählen ({selectedStudentIds.size} gewählt)
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={selectAllToday}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '3px 10px', fontSize: '0.70rem', fontWeight: 800, cursor: 'pointer' }}
                  >
                    Heute ({todayStudents.length})
                  </button>
                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '3px 10px', fontSize: '0.70rem', fontWeight: 800, cursor: 'pointer' }}
                  >
                    Alle ({allStudents.length})
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '3px 10px', fontSize: '0.70rem', fontWeight: 800, cursor: 'pointer' }}
                  >
                    Leeren
                  </button>
                </div>
              </div>

              {/* Search & Instrument Filter */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Schüler suchen..."
                  style={{
                    flex: 1,
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.80rem',
                    fontWeight: 600
                  }}
                />
                {uniqueInstruments.length > 0 && (
                  <select
                    value={instrumentFilter}
                    onChange={(e) => setInstrumentFilter(e.target.value)}
                    style={{
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '0.80rem',
                      fontWeight: 700,
                      background: '#ffffff'
                    }}
                  >
                    <option value="all">Alle Fächer</option>
                    {uniqueInstruments.map(inst => (
                      <option key={inst} value={inst}>{inst}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* 🛡️ SCHÜLER-LISTE: Vorname + N. Formatierung (OWASP & DSGVO Goldstandard) */}
              <div style={{
                maxHeight: '260px',
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                {filteredStudents.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.80rem' }}>
                    Keine Schüler gefunden.
                  </div>
                ) : (
                  filteredStudents.map(student => {
                    const sId = String(student.id);
                    const isChecked = selectedStudentIds.has(sId);
                    const isToday = todayStudents.some(ts => String(ts.id) === sId);
                    // 🛡️ Kanonische Darstellung: "Vorname + N." (z.B. Noah M.)
                    const displayName = formatSingleStudentAnonymized(
                      student.first_name,
                      student.last_name,
                      student.id
                    );

                    return (
                      <div
                        key={sId}
                        onClick={() => toggleStudent(sId)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: isChecked ? '#f0f9ff' : 'transparent',
                          cursor: 'pointer',
                          transition: 'background 0.1s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1e293b' }}>
                            {displayName}
                          </span>
                          {student.instrument && (
                            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                              • {student.instrument}
                            </span>
                          )}
                        </div>
                        {isToday && (
                          <span style={{ fontSize: '0.66rem', fontWeight: 850, color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                            Heute
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Target Week & Append Option */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setTargetWeekOffset(0)}
                    style={{
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontWeight: targetWeekOffset === 0 ? 850 : 600,
                      background: targetWeekOffset === 0 ? '#0284c7' : '#ffffff',
                      color: targetWeekOffset === 0 ? '#ffffff' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    Diese Woche
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetWeekOffset(1)}
                    style={{
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontWeight: targetWeekOffset === 1 ? 850 : 600,
                      background: targetWeekOffset === 1 ? '#0284c7' : '#ffffff',
                      color: targetWeekOffset === 1 ? '#ffffff' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    Nächste Woche
                  </button>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 750, color: '#475569' }}>
                  <input
                    type="checkbox"
                    checked={appendMode}
                    onChange={(e) => setAppendMode(e.target.checked)}
                  />
                  <span>Anhängen (Append-Safe)</span>
                </label>
              </div>

              {/* Stepper Footer: Back to 2 */}
              <div style={{ display: 'flex', justifyContent: 'flex-start', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 18px',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <ChevronLeft size={16} />
                  <span>Zurück: Audio & Medien</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════
            SPALTE 2: SCHLANKE LIVE-VORSCHAU & STICKY SEND-CARD
        ══════════════════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Live Preview Card */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Radio size={16} color="#0284c7" />
                <span>Schüler-Vorschau</span>
              </span>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: '100px' }}>
                {targetWeekOffset === 0 ? 'Diese Woche' : 'Nächste Woche'}
              </span>
            </div>

            {/* Simulated Clean Mobile Card */}
            <div style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              border: '1.5px solid #cbd5e1',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 900, color: '#0f172a' }}>
                    {topicName || 'Hausaufgabe'}
                  </h4>
                  <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 700 }}>
                    {teacher ? formatTeacherFullName(teacher) : 'Lehrkraft'} • {difficultyLevel.toUpperCase()}
                  </span>
                </div>
                {selectedTags.length > 0 && (
                  <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#166534', background: '#dcfce7', padding: '2px 8px', borderRadius: '100px' }}>
                    {selectedTags[0]}
                  </span>
                )}
              </div>

              {/* Text & Lehrwerke */}
              <div style={{ background: '#ffffff', borderRadius: '10px', padding: '10px', border: '1px solid #e2e8f0' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.78rem', color: '#334155', lineHeight: 1.45, fontWeight: 600 }}>
                  {homeworkNotes || 'Keine Notizen angegeben.'}
                </p>

                {/* Lehrwerke Badges */}
                {selectedLehrwerke.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                    {selectedLehrwerke.map((lw) => (
                      <div
                        key={lw.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#fff7ed',
                          border: '1px solid #ffedd5',
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}
                      >
                        <BookOpen size={11} color="#ea580c" />
                        <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#9a3412' }}>
                          {lw.title} {lw.pages ? `(S. ${lw.pages})` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Repertoire-Songs in Preview */}
              {selectedSongs.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {selectedSongs.map(song => (
                    <div
                      key={song.id}
                      style={{
                        background: '#ffffff',
                        borderRadius: '10px',
                        padding: '8px 10px',
                        border: '1px solid #fef08a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Music size={13} color="#ca8a04" />
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a' }}>
                          {song.title}
                        </span>
                        <span style={{ fontSize: '0.66rem', color: '#64748b' }}>• {song.artist}</span>
                      </div>
                      {song.tempo_bpm && (
                        <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#854d0e', background: '#fef9c3', padding: '1px 6px', borderRadius: '4px' }}>
                          {song.tempo_bpm} BPM
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Audio Capsule if recorded */}
              {recordedAudioUrl && (
                <div style={{ background: '#ffffff', borderRadius: '10px', padding: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#8b5cf6', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Play size={12} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.74rem', fontWeight: 850, color: '#0f172a', display: 'block' }}>
                        Play-Along ({audioBpm} BPM)
                      </span>
                      <span style={{ fontSize: '0.64rem', color: '#7e22ce', fontWeight: 700 }}>
                        ✨ Studio-Master (-14 LUFS)
                      </span>
                    </div>
                  </div>
                  {showSpotlight && spotlightBars && (
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#7e22ce', background: '#f3e8ff', padding: '2px 6px', borderRadius: '4px' }}>
                      🔁 {spotlightBars}
                    </span>
                  )}
                </div>
              )}

              {/* Selected Teacher Audio Demos in Preview */}
              {selectedTeacherAudios.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {selectedTeacherAudios.map(audio => (
                    <div
                      key={audio.id}
                      style={{
                        background: '#ffffff',
                        borderRadius: '10px',
                        padding: '8px 10px',
                        border: '1px solid #bbf7d0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mic size={13} color="#16a34a" />
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a' }}>
                          {audio.title}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#166534', background: '#dcfce7', padding: '1px 6px', borderRadius: '4px' }}>
                        {audio.duration || 30}s
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Jam Loop if included */}
              {showLoop && includeLoop && loopTitle && (
                <div style={{ background: '#ffffff', borderRadius: '10px', padding: '8px 10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sliders size={12} color="#eab308" />
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a' }}>
                      {loopTitle}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#854d0e', background: '#fef9c3', padding: '2px 6px', borderRadius: '4px' }}>
                    {loopBpm} BPM
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Send Action Card */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#64748b' }}>
                Bereit zum Senden:
              </span>
              <span style={{
                fontSize: '0.82rem',
                fontWeight: 900,
                color: selectedStudentIds.size > 0 ? '#0284c7' : '#94a3b8'
              }}>
                {selectedStudentIds.size} Schüler ausgewählt
              </span>
            </div>

            <button
              type="button"
              disabled={isSubmitting || selectedStudentIds.size === 0}
              onClick={handleDispatchPackage}
              style={{
                width: '100%',
                background: selectedStudentIds.size === 0
                  ? '#94a3b8'
                  : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                padding: '14px 20px',
                fontSize: '0.92rem',
                fontWeight: 850,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: selectedStudentIds.size === 0 || isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: selectedStudentIds.size === 0 ? 'none' : '0 4px 16px rgba(2, 132, 199, 0.35)',
                transition: 'transform 0.15s ease'
              }}
              className={selectedStudentIds.size > 0 && !isSubmitting ? 'hover-scale' : ''}
            >
              <Send size={18} />
              <span>
                {isSubmitting
                  ? 'Verteile Aufgaben-Paket...'
                  : `Aufgaben-Paket an ${selectedStudentIds.size} Schüler senden`}
              </span>
            </button>

            <p style={{ margin: 0, fontSize: '0.70rem', color: '#94a3b8', textAlign: 'center', fontWeight: 600 }}>
              Synchronisiert via Supabase Realtime direkt in Schüler-PWA & Audio-Tresor.
            </p>
          </div>

        </div>
      </div>

      {/* 📚 MEDIATHEK & MEDIEN-BAUKASTEN DRAWER (FLYOUT) */}
      <TeacherMediaPickerDrawer
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        teacherId={teacherId || ''}
        schoolId={schoolId || ''}
        mediaAssets={mediaAssets}
        isLoadingAssets={isLoadingMediaAssets}
        onAddLehrwerk={handleAddLehrwerk}
        onAddSong={handleAddSong}
        onAddAudio={handleAddAudio}
        selectedLehrwerkTitles={selectedLehrwerke.map(lw => lw.title)}
        selectedSongTitles={selectedSongs.map(s => s.title)}
        selectedAudioUrls={selectedTeacherAudios.map(a => a.url)}
        initialTab={mediaPickerInitialTab}
      />
    </div>
  );
};
