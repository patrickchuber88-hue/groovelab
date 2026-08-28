import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Mic, Square, Play, Pause, RotateCcw, Check, Loader2, Send, FileText, Plus, ChevronRight, Trash2, Zap, Sparkles, ArrowLeft, Music, Sliders
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { acquireAudioStream, releaseAudioStream } from '../../services/audioPermissionService';
import { processPureRawBlob } from '../../utils/audioMasteringEngine';
import { capitalizeFirstLetter } from '../../utils/nameHelper';
import { saveOfflineAudioRecord } from '../../utils/offlineAudioVault';

interface TagesplanQuickAudioModalProps {
  isOpen: boolean;
  student: any;
  teacher: any;
  dateStr?: string;
  onClose: () => void;
  onSaved?: (resultUrlOrText: string) => void;
}

interface TemplateCategory {
  id: string;
  title: string;
  iconType: 'music' | 'sliders' | 'sparkles';
  items: string[];
}

const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'practice',
    title: 'Üben & Tempo',
    iconType: 'music',
    items: [
      'Takt 1–8 wiederholen',
      'Mit Metronom (60 bpm) langsam üben',
      'Langsam und sorgfältig einüben',
      'Rhythmus laut mitzählen',
      'Schwierige Stellen isoliert 5x wiederholen'
    ]
  },
  {
    id: 'technique',
    title: 'Technik & Haltung',
    iconType: 'sliders',
    items: [
      'Auf den richtigen Fingersatz achten',
      'Wechselschlag kontrollieren',
      'Handhaltung entspannen und locker bleiben',
      'Dynamik und saubere Betonung beachten',
      'Sauberen Tonansatz und Dämpfung üben'
    ]
  },
  {
    id: 'performance',
    title: 'Stück & Motivation',
    iconType: 'sparkles',
    items: [
      'Ablauf auswendig versuchen',
      'Intro und Refrain flüssig verbinden',
      'Nächste Woche zum Vorspielen vorbereiten',
      'Tolle Leistung heute! Weiter so.'
    ]
  }
];

const QUICK_PILLS = [
  { label: 'Takt 1–8', text: 'Takt 1–8 wiederholen' },
  { label: 'Metronom 60 bpm', text: 'Mit Metronom (60 bpm) langsam üben' },
  { label: 'Fingersatz', text: 'Auf den richtigen Fingersatz achten' },
  { label: 'Wechselschlag', text: 'Wechselschlag kontrollieren' }
];

export const TagesplanQuickAudioModal: React.FC<TagesplanQuickAudioModalProps> = ({
  isOpen,
  student,
  teacher,
  dateStr,
  onClose,
  onSaved
}) => {
  const [activeMode, setActiveMode] = useState<'dictate' | 'audio'>('dictate');
  const [viewState, setViewState] = useState<'main' | 'templates'>('main');

  // --- Dictation State ---
  const [isDictating, setIsDictating] = useState(false);
  const [dictatedText, setDictatedText] = useState('');
  const recognitionRef = useRef<any>(null);

  // --- Audio Recording State ---
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioTitle, setAudioTitle] = useState('');

  // --- Common State ---
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioElemRef = useRef<HTMLAudioElement | null>(null);

  const isSpeechSupported = typeof window !== 'undefined' && 
    (Boolean((window as any).SpeechRecognition) || Boolean((window as any).webkitSpeechRecognition));

  useEffect(() => {
    if (student) {
      const todayFormatted = dateStr 
        ? new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
        : new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
      setAudioTitle(`Unterrichts-Aufnahme (${todayFormatted})`);
      setDictatedText('');
      setViewState('main');
      setSaveSuccess(false);
    }
  }, [student, dateStr, isOpen]);

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
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setIsDictating(false);
  };

  useEffect(() => {
    return () => stopHardware();
  }, []);

  if (!isOpen || !student) return null;

  const studentFirstName = student.first_name || (student.name ? student.name.split(' ')[0] : 'Schüler');
  const studentLastName = student.last_name || (student.name ? student.name.split(' ').slice(1).join(' ') : '');
  const studentFullName = `${studentFirstName} ${studentLastName}`.trim();

  // 1. DICTATION LOGIC
  const handleStartDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      stopHardware();
      const recognition = new SpeechRecognition();
      recognition.lang = 'de-DE';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) final += event.results[i][0].transcript;
        }
        if (final) {
          setDictatedText(prev => capitalizeFirstLetter((prev + ' ' + final).trim()));
        }
      };

      recognition.onerror = () => setIsDictating(false);
      recognition.onend = () => setIsDictating(false);

      recognitionRef.current = recognition;
      recognition.start();
      setIsDictating(true);
    } catch (err) {
      setIsDictating(false);
    }
  };

  const handleStopDictation = () => {
    if (recognitionRef.current) try { recognitionRef.current.stop(); } catch {}
    setIsDictating(false);
  };

  const handleAppendPhrase = (phrase: string) => {
    setDictatedText(prev => {
      const clean = prev.trim();
      if (!clean) return capitalizeFirstLetter(phrase);
      return `${clean}. ${capitalizeFirstLetter(phrase)}`;
    });
  };

  const handleSaveDictatedText = async () => {
    if (!dictatedText.trim() || !student.id) return;
    setIsSaving(true);
    try {
      const cleanNote = capitalizeFirstLetter(dictatedText.trim());
      const storageKey = `campus_homework_notes_${student.id}`;
      const existingRaw = localStorage.getItem(storageKey);
      let existingList: string[] = [];
      try {
        existingList = existingRaw ? JSON.parse(existingRaw) : [];
      } catch { existingList = []; }

      if (!existingList.includes(cleanNote)) {
        existingList.push(cleanNote);
        localStorage.setItem(storageKey, JSON.stringify(existingList));
      }

      try {
        const d = new Date();
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const pastDays = (d.getTime() - startOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
        const topicName = `Hausaufgabe KW ${String(weekNum).padStart(2, '0')}`;

        const { data: existingMatrix } = await supabase
          .from('progress_matrix')
          .select('id')
          .eq('student_id', student.id)
          .eq('topic_name', topicName)
          .maybeSingle();

        if (existingMatrix) {
          await supabase.from('progress_matrix').update({ homework_notes: JSON.stringify(existingList), updated_at: new Date().toISOString() }).eq('id', existingMatrix.id);
        } else {
          await supabase.from('progress_matrix').insert({ student_id: student.id, teacher_id: teacher?.id, topic_name: topicName, status: 'IN_PROGRESS', homework_notes: JSON.stringify(existingList), updated_at: new Date().toISOString() });
        }
      } catch (e) { console.warn('[QuickAudioModal] Dictation DB sync error:', e); }

      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('campus_homework_updated', { detail: { studentId: student.id } }));
      setSaveSuccess(true);
      if (onSaved) onSaved(cleanNote);
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      console.error(err);
    } finally { setIsSaving(false); }
  };

  // 2. AUDIO LOGIC
  const handleStartRecord = async () => {
    try {
      setAudioBlob(null); setAudioUrl(null); setSaveSuccess(false); audioChunksRef.current = [];
      const stream = await acquireAudioStream({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1, sampleRate: 48000 } as any });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        const rawBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        try {
          const mastered = await processPureRawBlob(rawBlob);
          setAudioBlob(mastered.processedBlob);
          setAudioUrl(mastered.processedUrl || URL.createObjectURL(mastered.processedBlob));
        } catch { setAudioBlob(rawBlob); setAudioUrl(URL.createObjectURL(rawBlob)); }
        stopHardware();
      };
      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch (err) { setIsRecording(false); }
  };

  const handleStopRecord = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
    setIsRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const handleTogglePlayback = () => {
    if (!audioUrl) return;
    if (isPlaying) { if (audioElemRef.current) audioElemRef.current.pause(); setIsPlaying(false); }
    else {
      const audio = new Audio(audioUrl);
      audioElemRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleReset = () => {
    stopHardware();
    setAudioBlob(null); setAudioUrl(null); setIsPlaying(false); setRecordingSeconds(0); setSaveSuccess(false); setDictatedText(''); setViewState('main');
  };

  const handleSaveAudioToHomework = async () => {
    if (!audioBlob || !student.id) return;
    setIsSaving(true);
    try {
      let finalUrl = '';
      const durationSec = Math.max(1, recordingSeconds);
      const isoNow = new Date().toISOString();
      const fileName = `quick_hw_${student.id}_${Date.now()}.webm`;
      const filePath = `homework/${student.id}/${fileName}`;

      if (navigator.onLine) {
        try {
          const { data: uploadData, error: upErr } = await supabase.storage.from('recordings').upload(filePath, audioBlob, { contentType: 'audio/webm', upsert: true });
          if (upErr) throw upErr;
          const { data: urlData } = supabase.storage.from('recordings').getPublicUrl(filePath);
          finalUrl = urlData.publicUrl;
        } catch (cloudErr) {
          console.warn('[QuickAudioModal] Cloud upload failed, saving locally into Offline Audio Vault:', cloudErr);
        }
      }

      // If offline or cloud upload failed: Save lossless Audio-Blob into IndexedDB
      if (!finalUrl) {
        const savedRecord = await saveOfflineAudioRecord({
          blob: audioBlob,
          mimeType: 'audio/webm',
          durationSeconds: durationSec,
          studentId: student.id,
          teacherId: teacher?.id,
          context: 'homework',
          title: audioTitle,
          metadata: {
            storagePath: filePath,
            syncTable: 'progress_matrix'
          }
        });
        finalUrl = `offline://${savedRecord.id}`;
      }

      const formattedEntry = `AUDIO:${finalUrl}|${durationSec}|${isoNow}|${audioTitle.replace(/\|/g, '-')}|teacher|shared_with_teacher`;
      
      const storageKey = `campus_homework_notes_${student.id}`;
      const existingRaw = localStorage.getItem(storageKey);
      let list: string[] = [];
      try { list = existingRaw ? JSON.parse(existingRaw) : []; } catch {}
      list.push(formattedEntry);
      localStorage.setItem(storageKey, JSON.stringify(list));

      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('campus_homework_updated', { detail: { studentId: student.id } }));
      setSaveSuccess(true);
      if (onSaved) onSaved(finalUrl);
      setTimeout(() => onClose(), 1000);
    } catch (err) { 
      console.error('[QuickAudioModal] Error saving audio to homework:', err); 
    } finally { 
      setIsSaving(false); 
    }
  };

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const renderCategoryIcon = (type: TemplateCategory['iconType']) => {
    switch (type) {
      case 'music': return <Music size={16} />;
      case 'sliders': return <Sliders size={16} />;
      case 'sparkles': return <Sparkles size={16} />;
    }
  };

  return (
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        background: 'rgba(15, 23, 42, 0.45)', 
        backdropFilter: 'blur(12px)', 
        WebkitBackdropFilter: 'blur(12px)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        zIndex: 99999, 
        padding: 'clamp(12px, 3.5vw, 24px)' 
      }} 
      onClick={(e) => { if (e.target === e.currentTarget && !isRecording && !isDictating && !isSaving) { stopHardware(); onClose(); } }}
    >
      <div 
        style={{ 
          background: '#ffffff', 
          borderRadius: '24px', 
          border: '1px solid rgba(226, 232, 240, 0.9)', 
          boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.22), 0 0 1px 1px rgba(0,0,0,0.04)', 
          maxWidth: 'min(480px, 94vw)', 
          width: '100%', 
          maxHeight: '90vh', 
          overflowY: 'auto', 
          padding: 'clamp(18px, 4vw, 24px)', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px', 
          position: 'relative', 
          animation: 'scaleUp 0.16s cubic-bezier(0.16, 1, 0.3, 1)' 
        }}
      >
        {viewState === 'main' && (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '42px', 
                  height: '42px', 
                  borderRadius: '12px', 
                  background: '#f0fdf4', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#16a34a', 
                  flexShrink: 0 
                }}>
                  {activeMode === 'dictate' ? <FileText size={22} /> : <Mic size={22} />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 'clamp(1.05rem, 2.5vw, 1.15rem)', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                    {activeMode === 'dictate' ? 'Hausaufgabe diktieren' : 'Audio-Aufnahme'}
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                    Für <strong>{studentFullName}</strong> • Heute
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => { stopHardware(); onClose(); }} 
                disabled={isRecording || isDictating || isSaving} 
                style={{ 
                  width: '34px', 
                  height: '34px', 
                  borderRadius: '50%', 
                  border: 'none', 
                  background: '#f1f5f9', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: (isRecording || isDictating || isSaving) ? 'not-allowed' : 'pointer', 
                  color: '#64748b',
                  flexShrink: 0,
                  transition: 'background 0.12s ease'
                }}
              >
                <X size={17} strokeWidth={2.4} />
              </button>
            </div>

            {/* Apple Segmented Control */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              background: '#f1f5f9', 
              padding: '4px', 
              borderRadius: '14px', 
              gap: '4px' 
            }}>
              <button 
                type="button" 
                onClick={() => { stopHardware(); setActiveMode('dictate'); }} 
                style={{ 
                  padding: '9px 12px', 
                  borderRadius: '10px', 
                  border: 'none', 
                  background: activeMode === 'dictate' ? '#ffffff' : 'transparent', 
                  color: activeMode === 'dictate' ? '#0f172a' : '#64748b', 
                  fontWeight: activeMode === 'dictate' ? 850 : 600, 
                  fontSize: '0.84rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '7px', 
                  cursor: 'pointer', 
                  boxShadow: activeMode === 'dictate' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.12s ease'
                }}
              >
                <FileText size={16} /> <span>Diktieren</span>
              </button>
              <button 
                type="button" 
                onClick={() => { stopHardware(); setActiveMode('audio'); }} 
                style={{ 
                  padding: '9px 12px', 
                  borderRadius: '10px', 
                  border: 'none', 
                  background: activeMode === 'audio' ? '#ffffff' : 'transparent', 
                  color: activeMode === 'audio' ? '#0f172a' : '#64748b', 
                  fontWeight: activeMode === 'audio' ? 850 : 600, 
                  fontSize: '0.84rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '7px', 
                  cursor: 'pointer', 
                  boxShadow: activeMode === 'audio' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.12s ease'
                }}
              >
                <Mic size={16} /> <span>Audio</span>
              </button>
            </div>

            {/* TAB 1: DICTATE */}
            {activeMode === 'dictate' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Live Dictation Strip */}
                <div style={{ 
                  background: isDictating ? '#fef2f2' : '#f8fafc', 
                  borderRadius: '16px', 
                  border: isDictating ? '1.5px solid #ef4444' : '1px solid #e2e8f0', 
                  padding: '12px 16px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  gap: '10px',
                  transition: 'all 0.15s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ 
                      width: '11px', 
                      height: '11px', 
                      borderRadius: '50%', 
                      background: isDictating ? '#ef4444' : '#16a34a', 
                      boxShadow: isDictating ? '0 0 10px rgba(239, 68, 68, 0.8)' : 'none',
                      animation: isDictating ? 'pulse 1.2s infinite' : 'none' 
                    }} />
                    <span style={{ fontSize: '0.86rem', fontWeight: 750, color: isDictating ? '#b91c1c' : '#334155' }}>
                      {isDictating ? 'Diktat läuft... Sprich jetzt' : (isSpeechSupported ? 'Sprach-Diktat bereit' : 'Tastatureingabe')}
                    </span>
                  </div>
                  {isSpeechSupported && (
                    <button 
                      type="button" 
                      onClick={isDictating ? handleStopDictation : handleStartDictation} 
                      style={{ 
                        padding: '8px 16px', 
                        borderRadius: '11px', 
                        border: 'none', 
                        background: isDictating ? '#ef4444' : '#16a34a', 
                        color: '#ffffff', 
                        fontWeight: 800, 
                        fontSize: '0.82rem', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        boxShadow: isDictating ? '0 4px 12px rgba(239, 68, 68, 0.35)' : '0 4px 12px rgba(22, 163, 74, 0.25)',
                        transition: 'all 0.12s ease'
                      }}
                    >
                      {isDictating ? <Square size={14} fill="#ffffff" /> : <Mic size={15} />} 
                      <span>{isDictating ? 'Stopp' : 'Sprechen'}</span>
                    </button>
                  )}
                </div>

                {/* Editor Container */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Hausaufgaben-Bemerkung:
                    </label>
                    {dictatedText && (
                      <button 
                        type="button" 
                        onClick={() => setDictatedText('')} 
                        style={{ 
                          background: 'transparent', 
                          border: 'none', 
                          color: '#94a3b8', 
                          fontSize: '0.74rem', 
                          fontWeight: 700, 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '4px',
                          cursor: 'pointer',
                          padding: '2px 6px'
                        }}
                      >
                        <Trash2 size={13} /> Leeren
                      </button>
                    )}
                  </div>
                  <textarea 
                    value={dictatedText} 
                    onChange={(e) => setDictatedText(e.target.value)} 
                    placeholder="Diktieren oder tippen (z. B. Seite 14 Takt 1–8 mit Metronom 60 bpm üben)..." 
                    rows={4} 
                    style={{ 
                      width: '100%', 
                      boxSizing: 'border-box',
                      padding: '14px 16px', 
                      borderRadius: '16px', 
                      border: '1px solid #cbd5e1', 
                      fontSize: '0.90rem', 
                      fontWeight: 600,
                      lineHeight: 1.5,
                      color: '#0f172a',
                      outline: 'none',
                      resize: 'none',
                      fontFamily: 'inherit',
                      minHeight: '105px'
                    }} 
                  />
                </div>

                {/* Quick-Pills & Full-Library Launcher */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>
                      Schnell-Bausteine:
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setViewState('templates')} 
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: '#16a34a', 
                        fontSize: '0.78rem', 
                        fontWeight: 800, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        cursor: 'pointer',
                        padding: '2px 4px'
                      }}
                    >
                      <Zap size={13} /> 
                      <span>Alle Vorlagen</span> 
                      <ChevronRight size={13} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '2px' }}>
                    {QUICK_PILLS.map((pill) => (
                      <button 
                        key={pill.label} 
                        type="button" 
                        onClick={() => handleAppendPhrase(pill.text)} 
                        style={{ 
                          padding: '8px 14px', 
                          borderRadius: '11px', 
                          border: '1px solid #e2e8f0', 
                          background: '#f8fafc', 
                          fontSize: '0.78rem', 
                          fontWeight: 700, 
                          color: '#334155',
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'all 0.12s ease'
                        }}
                      >
                        <Plus size={12} /> {pill.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary CTA */}
                <button 
                  type="button" 
                  onClick={handleSaveDictatedText} 
                  disabled={!dictatedText.trim() || isSaving || saveSuccess} 
                  style={{ 
                    marginTop: '4px', 
                    padding: '14px 20px', 
                    borderRadius: '16px', 
                    border: 'none', 
                    background: saveSuccess ? '#15803d' : (!dictatedText.trim() ? '#e2e8f0' : '#16a34a'), 
                    color: !dictatedText.trim() ? '#94a3b8' : '#ffffff', 
                    fontWeight: 900, 
                    fontSize: '0.92rem', 
                    cursor: (!dictatedText.trim() || isSaving || saveSuccess) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '9px',
                    boxShadow: dictatedText.trim() ? '0 8px 24px -3px rgba(22, 163, 74, 0.4)' : 'none',
                    minHeight: '48px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Wird eingetragen...</span>
                    </>
                  ) : saveSuccess ? (
                    <>
                      <Check size={18} strokeWidth={3} />
                      <span>Bemerkung eingetragen!</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Als Bemerkung übernehmen ➔</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* TAB 2: AUDIO */}
            {activeMode === 'audio' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ 
                  background: isRecording ? '#fef2f2' : (audioBlob ? '#f0fdf4' : '#f8fafc'), 
                  borderRadius: '20px', 
                  border: isRecording ? '1.5px solid #ef4444' : (audioBlob ? '1.5px solid #86efac' : '1px solid #e2e8f0'),
                  padding: '24px 16px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '14px',
                  transition: 'all 0.15s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isRecording && (
                      <span style={{ 
                        width: '12px', 
                        height: '12px', 
                        borderRadius: '50%', 
                        background: '#ef4444', 
                        boxShadow: '0 0 12px rgba(239, 68, 68, 0.8)',
                        animation: 'pulse 1.2s infinite' 
                      }} />
                    )}
                    <span style={{ 
                      fontSize: 'clamp(2.2rem, 5vw, 2.6rem)', 
                      fontWeight: 900, 
                      color: isRecording ? '#dc2626' : (audioBlob ? '#15803d' : '#0f172a'), 
                      fontFamily: 'monospace',
                      letterSpacing: '-0.02em'
                    }}>
                      {formatTime(recordingSeconds)}
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.80rem', fontWeight: 700, color: isRecording ? '#b91c1c' : '#64748b', textAlign: 'center' }}>
                    {isRecording 
                      ? 'Aufnahme läuft... Spiele das Stück oder den Rhythmus ein' 
                      : (audioBlob ? 'Aufnahme bereit zur Übernahme' : 'Klicke auf den Button, um die Aufnahme zu starten')}
                  </p>

                  {!audioBlob ? (
                    <button 
                      type="button" 
                      onClick={isRecording ? handleStopRecord : handleStartRecord} 
                      style={{ 
                        padding: '12px 26px', 
                        borderRadius: '14px', 
                        border: 'none', 
                        background: isRecording ? '#ef4444' : '#16a34a', 
                        color: '#ffffff', 
                        fontWeight: 800, 
                        fontSize: '0.90rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '9px',
                        boxShadow: isRecording ? '0 6px 20px rgba(239, 68, 68, 0.35)' : '0 6px 20px rgba(22, 163, 74, 0.3)',
                        transition: 'all 0.12s ease'
                      }}
                    >
                      {isRecording ? <Square size={16} fill="#ffffff" /> : <Mic size={18} />}
                      <span>{isRecording ? 'Aufnahme stoppen' : 'Aufnahme starten'}</span>
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        type="button" 
                        onClick={handleTogglePlayback} 
                        style={{ 
                          padding: '9px 18px', 
                          borderRadius: '12px', 
                          border: '1px solid #16a34a', 
                          color: '#15803d', 
                          background: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '7px'
                        }}
                      >
                        {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                        <span>{isPlaying ? 'Pause' : 'Anhören'}</span>
                      </button>
                      <button 
                        type="button" 
                        onClick={handleReset} 
                        style={{ 
                          padding: '9px 16px', 
                          borderRadius: '12px', 
                          border: '1px solid #cbd5e1', 
                          color: '#64748b', 
                          background: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <RotateCcw size={14} /> <span>Neu</span>
                      </button>
                    </div>
                  )}
                </div>

                {audioBlob && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                      Titel / Bezeichnung:
                    </label>
                    <input 
                      type="text" 
                      value={audioTitle} 
                      onChange={(e) => setAudioTitle(e.target.value)} 
                      style={{ 
                        padding: '11px 14px', 
                        borderRadius: '12px', 
                        border: '1px solid #cbd5e1',
                        fontSize: '0.86rem',
                        fontWeight: 600,
                        color: '#0f172a',
                        outline: 'none'
                      }} 
                    />
                  </div>
                )}

                {audioBlob && (
                  <button 
                    type="button" 
                    onClick={handleSaveAudioToHomework} 
                    disabled={isSaving || saveSuccess}
                    style={{ 
                      marginTop: '4px',
                      padding: '14px 20px', 
                      borderRadius: '16px', 
                      border: 'none', 
                      background: saveSuccess ? '#15803d' : '#16a34a', 
                      color: '#ffffff', 
                      fontWeight: 900,
                      fontSize: '0.92rem',
                      cursor: (isSaving || saveSuccess) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '9px',
                      boxShadow: '0 8px 24px -3px rgba(22, 163, 74, 0.4)',
                      minHeight: '48px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Wird gespeichert...</span>
                      </>
                    ) : saveSuccess ? (
                      <>
                        <Check size={18} strokeWidth={3} />
                        <span>Audio gespeichert!</span>
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Audio ins Hausaufgabenheft übertragen ➔</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* VIEW B: TEMPLATES LIBRARY */}
        {viewState === 'templates' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.15s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button 
                type="button" 
                onClick={() => setViewState('main')} 
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  color: '#16a34a', 
                  fontWeight: 800, 
                  fontSize: '0.86rem',
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                <ArrowLeft size={17} /> <span>Zurück zum Diktat</span>
              </button>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#94a3b8' }}>
                Tippen zum Einfügen
              </span>
            </div>

            <div>
              <h3 style={{ margin: 0, fontSize: '1.10rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                Vorlagen-Bibliothek
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.80rem', color: '#64748b', fontWeight: 500 }}>
                Wähle einen Baustein für das Hausaufgabenheft von {studentFirstName}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '360px', overflowY: 'auto', paddingRight: '2px' }}>
              {TEMPLATE_CATEGORIES.map((cat) => (
                <div key={cat.id} style={{ background: '#f8fafc', borderRadius: '18px', border: '1px solid #e2e8f0', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#334155' }}>
                    {renderCategoryIcon(cat.iconType)}
                    <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#1e293b' }}>{cat.title}</span>
                  </div>
                  {cat.items.map((item) => (
                    <button 
                      key={item} 
                      type="button" 
                      onClick={() => { handleAppendPhrase(item); setViewState('main'); }} 
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
                        borderRadius: '12px', 
                        border: '1px solid #e2e8f0', 
                        textAlign: 'left', 
                        background: '#ffffff',
                        fontSize: '0.84rem',
                        fontWeight: 650,
                        color: '#0f172a',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        transition: 'all 0.12s ease'
                      }}
                    >
                      <span>{item}</span>
                      <Plus size={15} color="#16a34a" style={{ flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
