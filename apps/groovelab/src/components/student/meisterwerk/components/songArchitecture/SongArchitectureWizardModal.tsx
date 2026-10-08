import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Wand2, X, Check, ChevronRight, ChevronLeft,
  Plus, Trash2, Copy, ArrowRight, Volume2, CheckCircle2, Disc3,
  RotateCcw, Pin
} from 'lucide-react';
import type { SongSection } from '../SongStructureBar';
import { getSectionColors } from '../SongStructureBar';
import {
  detectKeyAndScale,
  getDiatonicChordsForKey,
  parseChords,
  syncMeasures
} from '../../utils/musicTheoryEngine';
import { playAlongAudioEngine } from '../../utils/songPlayAlongAudioEngine';
import { SongChordGridEditor } from './SongChordGridEditor';

export interface SongArchitectureWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSections: SongSection[];
  initialBpm: number;
  initialTimeSignature: string;
  songTitle?: string;
  songArtist?: string;
  onSave: (params: {
    sections: SongSection[];
    bpm: number;
    timeSignature: string;
    title?: string;
    artist?: string;
  }) => void;
}

// 6 Clear Apple Micro-Steps
const WIZARD_STEPS = [
  { id: 1, name: 'Tempo', shortTitle: '1. Tempo' },
  { id: 2, name: 'Taktart', shortTitle: '2. Taktart' },
  { id: 3, name: 'Songteile', shortTitle: '3. Songteile' },
  { id: 4, name: 'Taktlängen', shortTitle: '4. Taktlängen' },
  { id: 5, name: 'Akkorde', shortTitle: '5. Akkorde' },
  { id: 6, name: 'Start', shortTitle: '6. Start' }
] as const;

export const SongArchitectureWizardModal: React.FC<SongArchitectureWizardModalProps> = ({
  isOpen,
  onClose,
  initialSections,
  initialBpm,
  initialTimeSignature,
  songTitle = 'Mein Song',
  songArtist = '',
  onSave
}) => {
  // Step navigation (1 through 6)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Core Parameters
  const [title, setTitle] = useState<string>(songTitle);
  const [artist, setArtist] = useState<string>(songArtist);
  const [bpm, setBpm] = useState<number>(initialBpm || 116);
  const [timeSignature, setTimeSignature] = useState<string>(initialTimeSignature || '4/4');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('pop');

  // Formteile (Sections) State
  const [sections, setSections] = useState<SongSection[]>(() => {
    if (initialSections && initialSections.length > 0) {
      return initialSections.map((s) => {
        const b = s.barsCount || (s.bars ? parseInt(s.bars, 10) || 8 : 8);
        const c = s.chords && s.chords.length > 0 ? s.chords : ['C'];
        return {
          ...s,
          barsCount: b,
          bars: `${b} Takte`,
          repetitions: s.repetitions || 1,
          chords: c,
          measures: syncMeasures(b, c, s.measures)
        };
      });
    }
    return [];
  });

  // Selected Block ID in Step 3 Live-Arranger
  const [selectedArrangerSectionId, setSelectedArrangerSectionId] = useState<string>('');

  // Undo Buffer for Template Switching
  const previousSectionsRef = useRef<SongSection[] | null>(null);
  const [showUndoBanner, setShowUndoBanner] = useState<boolean>(false);
  const undoTimeoutRef = useRef<any>(null);

  // Step 5 State: Active section being edited for chords
  const [activeStep5SectionId, setActiveStep5SectionId] = useState<string>('');
  const [showManualEditor, setShowManualEditor] = useState<boolean>(false);

  // Tap-Tempo tracking
  const tapTimesRef = useRef<number[]>([]);

  // Default Pop Template Helper
  const createPopTemplate = (ts: number): SongSection[] => [
    { id: `s-${ts}-1`, name: 'Intro', barsCount: 4, bars: '4 Takte', repetitions: 1, chords: ['Em', 'C', 'G', 'D'], measures: syncMeasures(4, ['Em', 'C', 'G', 'D']) },
    { id: `s-${ts}-2`, name: 'Strophe 1', barsCount: 8, bars: '8 Takte', repetitions: 1, chords: ['Em', 'C', 'G', 'D'], measures: syncMeasures(8, ['Em', 'C', 'G', 'D']) },
    { id: `s-${ts}-3`, name: 'Pre-Chorus', barsCount: 4, bars: '4 Takte', repetitions: 1, chords: ['C', 'D'], measures: syncMeasures(4, ['C', 'D']) },
    { id: `s-${ts}-4`, name: 'Refrain', barsCount: 8, bars: '8 Takte', repetitions: 2, isHomeworkFocus: true, chords: ['G', 'D', 'Em', 'C'], measures: syncMeasures(8, ['G', 'D', 'Em', 'C']) },
    { id: `s-${ts}-5`, name: 'Strophe 2', barsCount: 8, bars: '8 Takte', repetitions: 1, chords: ['Em', 'C', 'G', 'D'], measures: syncMeasures(8, ['Em', 'C', 'G', 'D']) },
    { id: `s-${ts}-6`, name: 'Bridge', barsCount: 8, bars: '8 Takte', repetitions: 1, chords: ['C', 'D', 'Em', 'Em'], measures: syncMeasures(8, ['C', 'D', 'Em', 'Em']) },
    { id: `s-${ts}-7`, name: 'Outro', barsCount: 4, bars: '4 Takte', repetitions: 1, chords: ['Em', 'C', 'G', 'D'], measures: syncMeasures(4, ['Em', 'C', 'G', 'D']) }
  ];

  // Reset and synchronize state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setShowManualEditor(false);
      if (initialBpm) setBpm(initialBpm);
      if (initialTimeSignature) setTimeSignature(initialTimeSignature);
      if (songTitle) setTitle(songTitle);
      if (songArtist) setArtist(songArtist);

      if (initialSections && initialSections.length > 0) {
        const initialized = initialSections.map((s) => {
          const b = s.barsCount || (s.bars ? parseInt(s.bars, 10) || 8 : 8);
          const c = s.chords && s.chords.length > 0 ? s.chords : ['C'];
          return {
            ...s,
            barsCount: b,
            bars: `${b} Takte`,
            repetitions: s.repetitions || 1,
            chords: c,
            measures: syncMeasures(b, c, s.measures)
          };
        });
        setSections(initialized);
        setSelectedArrangerSectionId(initialized[0]?.id || '');
        setActiveStep5SectionId(initialized[0]?.id || '');
      } else {
        // Pre-load Pop Template as starting basis so student immediately sees an interactive structure
        const defaultPop = createPopTemplate(Date.now());
        setSections(defaultPop);
        setSelectedTemplateKey('pop');
        setSelectedArrangerSectionId(defaultPop[0]?.id || '');
        setActiveStep5SectionId(defaultPop[0]?.id || '');
      }
    }
  }, [isOpen]);

  // Maintain valid selected section in Arranger & Chord Step
  useEffect(() => {
    if (sections.length > 0) {
      if (!selectedArrangerSectionId || !sections.some(s => s.id === selectedArrangerSectionId)) {
        setSelectedArrangerSectionId(sections[0].id);
      }
      if (!activeStep5SectionId || !sections.some(s => s.id === activeStep5SectionId)) {
        setActiveStep5SectionId(sections[0].id);
      }
    }
  }, [sections, selectedArrangerSectionId, activeStep5SectionId]);

  // Escape key listener for accessible modal closing (WCAG 2.2 AA)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Global music theory analysis
  const allSongChords = useMemo(() => {
    return Array.from(new Set(sections.flatMap(s => s?.chords || [])));
  }, [sections]);

  const globalTheory = useMemo(() => {
    return detectKeyAndScale(allSongChords.length > 0 ? allSongChords : ['G', 'D', 'Em', 'C']);
  }, [allSongChords]);

  // Total bars and estimated duration
  const totalBarsCount = useMemo(() => {
    return sections.reduce((sum, s) => {
      const b = s.barsCount || (s.bars ? parseInt(s.bars, 10) || 8 : 8);
      const reps = s.repetitions || 1;
      return sum + (b * reps);
    }, 0);
  }, [sections]);

  const estimatedDuration = useMemo(() => {
    const beatsPerBar = timeSignature === '3/4' ? 3 : (timeSignature === '6/8' ? 6 : (timeSignature === '12/8' ? 12 : 4));
    const totalBeats = totalBarsCount * beatsPerBar;
    const totalSeconds = Math.round((totalBeats / Math.max(40, bpm)) * 60);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs} Min`;
  }, [totalBarsCount, timeSignature, bpm]);

  // Tap-Tempo Handler
  const handleTapTempo = () => {
    const now = Date.now();
    const taps = tapTimesRef.current.filter(t => now - t < 3000);
    taps.push(now);
    tapTimesRef.current = taps;
    if (taps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < taps.length; i++) {
        intervals.push(taps[i] - taps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.min(240, Math.max(40, Math.round(60000 / avgInterval)));
      setBpm(calculatedBpm);
    }
  };

  // Metronome test preview click
  const handleTestClick = () => {
    try {
      playAlongAudioEngine.playClick(true);
      setTimeout(() => playAlongAudioEngine.playClick(false), 220);
      setTimeout(() => playAlongAudioEngine.playClick(false), 440);
      setTimeout(() => playAlongAudioEngine.playClick(false), 660);
    } catch {}
  };

  // Section manipulation helpers
  const handleUpdateSection = (idx: number, patch: Partial<SongSection>) => {
    const updated = [...sections];
    const target = updated[idx];
    if (!target) return;
    const newBarsCount = patch.barsCount !== undefined ? patch.barsCount : (target.barsCount || 8);
    const newChords = patch.chords !== undefined ? patch.chords : target.chords;
    const newMeasures = patch.measures !== undefined
      ? patch.measures
      : syncMeasures(newBarsCount, newChords, target.measures);

    updated[idx] = {
      ...target,
      ...patch,
      barsCount: newBarsCount,
      bars: `${newBarsCount} Takte`,
      chords: newChords,
      measures: newMeasures
    };
    setSections(updated);
  };

  const handleAddSection = (name = 'Strophe', insertAfterId?: string) => {
    const defaultChords = ['G', 'D', 'Em', 'C'];
    const newId = `sec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newSec: SongSection = {
      id: newId,
      name,
      barsCount: 8,
      bars: '8 Takte',
      repetitions: 1,
      chords: defaultChords,
      measures: syncMeasures(8, defaultChords)
    };

    if (insertAfterId) {
      const idx = sections.findIndex(s => s.id === insertAfterId);
      if (idx !== -1) {
        const next = [...sections];
        next.splice(idx + 1, 0, newSec);
        setSections(next);
        setSelectedArrangerSectionId(newId);
        return;
      }
    }

    setSections([...sections, newSec]);
    setSelectedArrangerSectionId(newId);
  };

  const handleDuplicateSection = (id: string) => {
    const idx = sections.findIndex(s => s.id === id);
    if (idx === -1) return;
    const target = sections[idx];
    const newId = `sec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const dupl: SongSection = {
      ...target,
      id: newId,
      name: `${target.name} (Kopie)`
    };
    const next = [...sections];
    next.splice(idx + 1, 0, dupl);
    setSections(next);
    setSelectedArrangerSectionId(newId);
  };

  const handleDeleteSection = (id: string) => {
    if (sections.length <= 1) return;
    const idx = sections.findIndex(s => s.id === id);
    if (idx === -1) return;
    const next = sections.filter(s => s.id !== id);
    setSections(next);
    const nextSelected = next[Math.max(0, idx - 1)]?.id || next[0]?.id || '';
    setSelectedArrangerSectionId(nextSelected);
  };

  const handleMoveSection = (id: string, dir: 'up' | 'down') => {
    const idx = sections.findIndex(s => s.id === id);
    if (idx === -1) return;
    if ((dir === 'up' && idx === 0) || (dir === 'down' && idx === sections.length - 1)) return;
    const next = [...sections];
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    const temp = next[idx];
    next[idx] = next[targetIdx];
    next[targetIdx] = temp;
    setSections(next);
  };

  // Apple-Style Smart Templates for Step 3 with Gentle Undo
  const applyTemplate = (key: string) => {
    // Save current sections to undo buffer
    previousSectionsRef.current = [...sections];
    setShowUndoBanner(true);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    undoTimeoutRef.current = setTimeout(() => setShowUndoBanner(false), 6000);

    setSelectedTemplateKey(key);
    const ts = Date.now();

    let newStructure: SongSection[] = [];

    if (key === 'pop') {
      newStructure = createPopTemplate(ts);
    } else if (key === 'compact') {
      newStructure = [
        { id: `s-${ts}-1`, name: 'Strophe', barsCount: 8, bars: '8 Takte', repetitions: 1, chords: ['C', 'G', 'Am', 'F'], measures: syncMeasures(8, ['C', 'G', 'Am', 'F']) },
        { id: `s-${ts}-2`, name: 'Refrain', barsCount: 8, bars: '8 Takte', repetitions: 2, isHomeworkFocus: true, chords: ['F', 'G', 'C', 'Am'], measures: syncMeasures(8, ['F', 'G', 'C', 'Am']) }
      ];
    } else if (key === 'blues') {
      setTimeSignature('4/4');
      setBpm(105);
      newStructure = [
        { id: `s-${ts}-1`, name: 'Intro', barsCount: 4, bars: '4 Takte', repetitions: 1, chords: ['E7', 'B7'], measures: syncMeasures(4, ['E7', 'B7']) },
        { id: `s-${ts}-2`, name: '12-Bar Blues Chorus', barsCount: 12, bars: '12 Takte', repetitions: 2, isHomeworkFocus: true, chords: ['E7', 'A7', 'E7', 'B7', 'A7', 'E7'], measures: syncMeasures(12, ['E7', 'A7', 'E7', 'B7', 'A7', 'E7']) },
        { id: `s-${ts}-3`, name: 'Solo Chorus', barsCount: 12, bars: '12 Takte', repetitions: 2, chords: ['E7', 'A7', 'E7', 'B7', 'A7', 'E7'], measures: syncMeasures(12, ['E7', 'A7', 'E7', 'B7', 'A7', 'E7']) },
        { id: `s-${ts}-4`, name: 'Outro & Coda', barsCount: 4, bars: '4 Takte', repetitions: 1, chords: ['A7', 'Bb7', 'B7', 'E7'], measures: syncMeasures(4, ['A7', 'Bb7', 'B7', 'E7']) }
      ];
    } else {
      // Leer starten
      newStructure = [
        { id: `s-${ts}-1`, name: 'Strophe', barsCount: 8, bars: '8 Takte', repetitions: 1, chords: ['G', 'D', 'Em', 'C'], measures: syncMeasures(8, ['G', 'D', 'Em', 'C']) }
      ];
    }

    setSections(newStructure);
    setSelectedArrangerSectionId(newStructure[0]?.id || '');
  };

  const handleUndoTemplate = () => {
    if (previousSectionsRef.current && previousSectionsRef.current.length > 0) {
      setSections(previousSectionsRef.current);
      setSelectedArrangerSectionId(previousSectionsRef.current[0]?.id || '');
      previousSectionsRef.current = null;
      setShowUndoBanner(false);
    }
  };

  // Finish and Save
  const handleFinish = () => {
    const finalSections = sections.length > 0 ? sections : [
      { id: `s-${Date.now()}-1`, name: 'Strophe', barsCount: 8, bars: '8 Takte', repetitions: 1, chords: ['G', 'D', 'Em', 'C'], measures: syncMeasures(8, ['G', 'D', 'Em', 'C']) }
    ];

    onSave({
      sections: finalSections,
      bpm,
      timeSignature,
      title,
      artist
    });
    onClose();
  };

  // Currently active section in Step 3 Live-Arranger
  const activeArrangerIdx = sections.findIndex(s => s.id === selectedArrangerSectionId);
  const activeArrangerSection = sections[activeArrangerIdx] || sections[0];

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Song-Architektur Baukasten"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================================================================= */}
        {/* APPLE-STYLE HEADER & PROGRESS DOTS (5 Steps)                      */}
        {/* ================================================================= */}
        <div style={{
          padding: '18px 24px 14px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          background: '#ffffff'
        }}>
          {/* Top Row: Title & Close */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#0f172a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Wand2 size={18} strokeWidth={2.2} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                  Song-Architektur Baukasten
                </h3>
                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 650 }}>
                  In 5 einfachen Schritten zur perfekten Songstruktur & Play-Along
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                border: 'none',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                transition: 'all 0.15s ease'
              }}
              title="Schließen (Esc)"
              aria-label="Schließen"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>

          {/* Apple-Style Segmented Step Progress Bar (6 Steps) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '8px'
          }}>
            {WIZARD_STEPS.map((step) => {
              const isCurrent = currentStep === step.id;
              const isDone = currentStep > step.id;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setCurrentStep(step.id)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: '4px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title={step.name}
                >
                  <div style={{
                    width: '100%',
                    height: '4px',
                    borderRadius: '4px',
                    background: isCurrent ? '#0f172a' : (isDone ? '#10b981' : '#e2e8f0'),
                    transition: 'all 0.2s ease'
                  }} />
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: isCurrent ? 900 : 700,
                    color: isCurrent ? '#0f172a' : (isDone ? '#10b981' : '#94a3b8'),
                    whiteSpace: 'nowrap'
                  }}>
                    {step.shortTitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ================================================================= */}
        {/* STEP CONTENT BODY (Scrollable, Clean, Generous Spacing)           */}
        {/* ================================================================= */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}>

          {/* --------------------------------------------------------------- */}
          {/* SCHRITT 1: TEMPO & PULS (BPM)                                    */}
          {/* --------------------------------------------------------------- */}
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', textAlign: 'center' }}>
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                  Wie schnell soll der Song sein?
                </h4>
                <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b', fontWeight: 600 }}>
                  Wähle das Grundtempo oder tippe einfach im Takt der Musik mit.
                </p>
              </div>

              {/* Large Apple-Style BPM Counter */}
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '24px',
                padding: '24px 32px',
                width: '100%',
                maxWidth: '420px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const newBpm = Math.max(40, bpm - 1);
                      setBpm(newBpm);
                      try { playAlongAudioEngine.playTempoTick(); } catch {}
                    }}
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      border: '1.5px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a',
                      fontSize: '1.6rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover-scale"
                    aria-label="Tempo um 1 BPM verringern"
                  >
                    −
                  </button>

                  <div style={{ minWidth: '130px', textAlign: 'center' }}>
                    <div style={{
                      fontSize: '3.4rem',
                      fontWeight: 950,
                      color: '#0f172a',
                      lineHeight: 1,
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-0.03em'
                    }}>
                      {bpm}
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      BPM
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const newBpm = Math.min(240, bpm + 1);
                      setBpm(newBpm);
                      try { playAlongAudioEngine.playTempoTick(); } catch {}
                    }}
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      border: '1.5px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a',
                      fontSize: '1.6rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover-scale"
                    aria-label="Tempo um 1 BPM erhöhen"
                  >
                    +
                  </button>
                </div>

                {/* Subtitle feel badge */}
                <div style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: bpm < 90 ? '#0284c7' : (bpm > 125 ? '#dc2626' : '#16a34a'),
                  background: bpm < 90 ? '#e0f2fe' : (bpm > 125 ? '#fee2e2' : '#dcfce7'),
                  padding: '4px 14px',
                  borderRadius: '100px'
                }}>
                  {bpm < 85 ? 'Gemütlich / Ballade' : (bpm < 105 ? 'Mäßiges Tempo' : (bpm < 128 ? 'Klassisches Pop-Tempo' : 'Schnell / Upbeat'))}
                </div>
              </div>

              {/* 3 Curated Apple Speed Presets */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {[
                  { label: '🛋 Gemütlich (80 BPM)', val: 80 },
                  { label: '⚡ Modern Pop (116 BPM)', val: 116 },
                  { label: '🚀 Schnell (135 BPM)', val: 135 }
                ].map((p) => {
                  const isActive = bpm === p.val;
                  return (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => {
                        setBpm(p.val);
                        try { playAlongAudioEngine.playTempoTick(); } catch {}
                      }}
                      style={{
                        padding: '9px 18px',
                        borderRadius: '100px',
                        border: isActive ? '1.5px solid #0f172a' : '1.5px solid #cbd5e1',
                        background: isActive ? '#0f172a' : '#ffffff',
                        color: isActive ? '#ffffff' : '#334155',
                        fontSize: '0.82rem',
                        fontWeight: 850,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isActive ? '0 4px 12px rgba(15, 23, 42, 0.12)' : '0 1px 3px rgba(0,0,0,0.02)'
                      }}
                      className="hover-scale"
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {/* Large Apple-Style Rhythmic Tap-Tempo Button */}
              <button
                type="button"
                onClick={handleTapTempo}
                style={{
                  padding: '12px 28px',
                  borderRadius: '16px',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: '0.88rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale"
                title="Tippe mehrfach im Takt, um das Tempo automatisch zu erfassen"
              >
                <Disc3 size={18} style={{ color: '#0f172a' }} />
                <span>Tap Tempo (im Takt tippen)</span>
              </button>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SCHRITT 2: TAKTART (TIME SIGNATURE)                             */}
          {/* --------------------------------------------------------------- */}
          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', textAlign: 'center' }}>
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                  Welche Taktart hat dein Song?
                </h4>
                <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b', fontWeight: 600 }}>
                  Die allermeisten Pop- und Rocksongs haben 4 Schläge pro Takt.
                </p>
              </div>

              {/* Symmetrical 3-Column Apple Cards in 1 Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: '12px',
                width: '100%',
                maxWidth: '640px'
              }}>
                {[
                  {
                    sig: '4/4',
                    title: '4/4 Takt',
                    badge: 'Pop & Rock',
                    desc: '4 Schläge pro Takt. Perfekt für 90% aller Songs.',
                    dots: ['●', '●', '●', '●']
                  },
                  {
                    sig: '3/4',
                    title: '3/4 Takt',
                    badge: 'Walzer & Ballade',
                    desc: '3 Schläge pro Takt. Schwungvoll und tanzbar.',
                    dots: ['●', '●', '●']
                  },
                  {
                    sig: '6/8',
                    title: '6/8 Takt',
                    badge: 'Gefühlvoll & Slow',
                    desc: 'Fließendes 6er-Feeling für Blues und Slow-Songs.',
                    dots: ['●', '●', '●', '●', '●', '●']
                  }
                ].map((item) => {
                  const isSelected = timeSignature === item.sig;

                  return (
                    <button
                      key={item.sig}
                      type="button"
                      onClick={() => {
                        setTimeSignature(item.sig);
                        try { playAlongAudioEngine.playClick(true); } catch {}
                      }}
                      style={{
                        background: isSelected ? '#f8fafc' : '#ffffff',
                        border: isSelected ? '2px solid #0f172a' : '1.5px solid #e2e8f0',
                        borderRadius: '20px',
                        padding: '18px 14px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        position: 'relative',
                        boxShadow: isSelected ? '0 8px 24px rgba(15, 23, 42, 0.08)' : 'none',
                        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                        transition: 'all 0.15s ease'
                      }}
                      className="hover-scale"
                    >
                      {isSelected && (
                        <div style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: '#0f172a',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}

                      <div style={{
                        fontSize: '1.5rem',
                        fontWeight: 950,
                        color: isSelected ? '#0f172a' : '#334155',
                        lineHeight: 1
                      }}>
                        {item.title}
                      </div>

                      <div style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        color: isSelected ? '#0f172a' : '#64748b',
                        background: isSelected ? '#e2e8f0' : '#f1f5f9',
                        padding: '3px 7px',
                        borderRadius: '6px',
                        alignSelf: 'flex-start'
                      }}>
                        {item.badge}
                      </div>

                      <p style={{
                        margin: '2px 0 0 0',
                        fontSize: '0.74rem',
                        color: '#64748b',
                        lineHeight: 1.35,
                        flex: 1
                      }}>
                        {item.desc}
                      </p>

                      {/* Rhythm Beat Dots */}
                      <div style={{
                        display: 'flex',
                        gap: '4px',
                        alignItems: 'center',
                        marginTop: 'auto',
                        paddingTop: '6px'
                      }}>
                        {item.dots.map((dot, dIdx) => (
                          <span
                            key={dIdx}
                            style={{
                              fontSize: '0.78rem',
                              color: isSelected ? '#0f172a' : '#94a3b8',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {dot}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SCHRITT 3: SONGTEILE FESTLEGEN (REINE STRUKTUR & REIHENFOLGE)   */}
          {/* --------------------------------------------------------------- */}
          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Header Title & Counter */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                    Welche Teile hat dein Song?
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                    Wähle eine Vorlage oder stelle die Bausteine per Fingertipp zusammen.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    background: '#f1f5f9',
                    padding: '5px 12px',
                    borderRadius: '100px',
                    fontSize: '0.74rem',
                    fontWeight: 850,
                    color: '#334155'
                  }}>
                    {sections.length} Formteile
                  </div>

                  {showUndoBanner && (
                    <button
                      type="button"
                      onClick={handleUndoTemplate}
                      style={{
                        background: '#eef2ff',
                        border: '1px solid #c7d2fe',
                        color: '#4338ca',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '0.72rem',
                        fontWeight: 850,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      className="hover-scale"
                    >
                      <RotateCcw size={12} />
                      <span>Rückgängig</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 1. Vorlagen-Kicker (Kompakt, 1-Zeilig) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginRight: '4px', flexShrink: 0 }}>
                  Vorlage:
                </span>
                {[
                  { key: 'pop', label: 'Pop-Hit Standard' },
                  { key: 'compact', label: 'Strophe & Refrain' },
                  { key: 'blues', label: '12-Bar Blues' },
                  { key: 'custom', label: 'Leer starten' }
                ].map((tpl) => {
                  const isSelected = selectedTemplateKey === tpl.key;
                  return (
                    <button
                      key={tpl.key}
                      type="button"
                      onClick={() => applyTemplate(tpl.key)}
                      style={{
                        background: isSelected ? '#0f172a' : '#ffffff',
                        color: isSelected ? '#ffffff' : '#475569',
                        border: isSelected ? '1.5px solid #0f172a' : '1px solid #cbd5e1',
                        padding: '4px 11px',
                        borderRadius: '9999px',
                        fontSize: '0.74rem',
                        fontWeight: isSelected ? 900 : 750,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.12s ease'
                      }}
                      className="hover-scale"
                    >
                      {tpl.label}
                    </button>
                  );
                })}
              </div>

              {/* 2. Song-Ablauf Timeline (Bunte Blöcke ohne Taktzahlen) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 850, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Song-Ablauf (Reihenfolge anordnen):
                </span>

                <div style={{
                  display: 'flex',
                  gap: '8px',
                  overflowX: 'auto',
                  padding: '6px 2px 10px 2px',
                  alignItems: 'stretch'
                }}>
                  {sections.map((sec, idx) => {
                    const colors = getSectionColors(sec.name);

                    return (
                      <div
                        key={sec.id}
                        style={{
                          background: colors.bg,
                          border: `1.5px solid ${colors.border}`,
                          borderRadius: '16px',
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '10px',
                          minWidth: '135px',
                          flex: '0 0 auto',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <span style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '7px',
                            background: colors.badgeBg,
                            color: '#ffffff',
                            fontSize: '0.72rem',
                            fontWeight: 900,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {idx + 1}
                          </span>

                          {/* Reorder Buttons */}
                          <div style={{ display: 'inline-flex', gap: '2px', background: '#ffffff', borderRadius: '7px', padding: '1px', border: '1px solid #cbd5e1' }}>
                            <button
                              type="button"
                              onClick={() => handleMoveSection(sec.id, 'up')}
                              disabled={idx === 0}
                              title="Nach links schieben"
                              style={{ border: 'none', background: 'transparent', cursor: idx === 0 ? 'not-allowed' : 'pointer', color: idx === 0 ? '#cbd5e1' : '#0f172a', padding: '2px 5px', fontSize: '0.68rem', fontWeight: 900 }}
                            >
                              ◀
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveSection(sec.id, 'down')}
                              disabled={idx === sections.length - 1}
                              title="Nach rechts schieben"
                              style={{ border: 'none', background: 'transparent', cursor: idx === sections.length - 1 ? 'not-allowed' : 'pointer', color: idx === sections.length - 1 ? '#cbd5e1' : '#0f172a', padding: '2px 5px', fontSize: '0.68rem', fontWeight: 900 }}
                            >
                              ▶
                            </button>
                          </div>
                        </div>

                        <div style={{
                          fontSize: '0.98rem',
                          fontWeight: 950,
                          color: colors.text,
                          whiteSpace: 'nowrap'
                        }}>
                          {sec.name}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', paddingTop: '4px', borderTop: `1px solid ${colors.border}` }}>
                          <button
                            type="button"
                            onClick={() => handleDuplicateSection(sec.id)}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: '#334155',
                              padding: '2px 6px',
                              borderRadius: '6px',
                              fontSize: '0.66rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                            className="hover-scale"
                            title="Duplizieren"
                          >
                            <Copy size={10} />
                            <span>Kopie</span>
                          </button>

                          {sections.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSection(sec.id)}
                              style={{
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                color: '#ef4444',
                                padding: '2px 6px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              className="hover-scale"
                              title="Entfernen"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Baustein Palette */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', padding: '4px 0' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 850, color: '#64748b', textTransform: 'uppercase', marginRight: '4px' }}>
                  + Baustein anfügen:
                </span>
                {['Intro', 'Strophe', 'Pre-Chorus', 'Refrain', 'Bridge', 'Solo', 'Outro'].map((presetName) => (
                  <button
                    key={presetName}
                    type="button"
                    onClick={() => handleAddSection(presetName)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      padding: '5px 12px',
                      borderRadius: '8px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.12s ease'
                    }}
                    className="hover-scale"
                  >
                    <Plus size={11} strokeWidth={2.5} />
                    <span>{presetName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SCHRITT 4: TAKTLÄNGEN ZUWEISEN (AUFGERÄUMTE ZEILEN-ÜBERSICHT)    */}
          {/* --------------------------------------------------------------- */}
          {currentStep === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Header Title & Overall Stats */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                    Wie lang ist jeder Songteil?
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                    Tippe auf die gewünschte Taktanzahl für jeden Baustein.
                  </p>
                </div>

                <div style={{
                  background: '#f1f5f9',
                  padding: '5px 12px',
                  borderRadius: '100px',
                  fontSize: '0.74rem',
                  fontWeight: 850,
                  color: '#334155'
                }}>
                  Gesamt: {totalBarsCount} Takte • ca. {estimatedDuration} bei {bpm} BPM
                </div>
              </div>

              {/* Section List with Takte & Repetition Pills */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '380px',
                overflowY: 'auto',
                paddingRight: '4px'
              }}>
                {sections.map((sec, idx) => {
                  const colors = getSectionColors(sec.name);
                  const currentBars = sec.barsCount || 8;
                  const currentReps = sec.repetitions || 1;

                  return (
                    <div
                      key={sec.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
                      }}
                    >
                      {/* Name & Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '130px' }}>
                        <span style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '8px',
                          background: colors.badgeBg,
                          color: '#ffffff',
                          fontSize: '0.72rem',
                          fontWeight: 900,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {idx + 1}
                        </span>
                        <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a' }}>
                          {sec.name}
                        </span>
                      </div>

                      {/* Takte Pills: 4, 8, 12, 16 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b' }}>Takte:</span>
                        {[4, 8, 12, 16].map((bars) => {
                          const isSelected = currentBars === bars;
                          return (
                            <button
                              key={bars}
                              type="button"
                              onClick={() => handleUpdateSection(idx, { barsCount: bars, bars: `${bars} Takte` })}
                              style={{
                                border: isSelected ? '1.5px solid #0f172a' : '1px solid #cbd5e1',
                                background: isSelected ? '#0f172a' : '#ffffff',
                                color: isSelected ? '#ffffff' : '#334155',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                fontSize: '0.76rem',
                                fontWeight: 900,
                                cursor: 'pointer',
                                transition: 'all 0.12s ease'
                              }}
                              className="hover-scale"
                            >
                              {bars}
                            </button>
                          );
                        })}
                      </div>

                      {/* Repetitions: 1x, 2x, 3x */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b' }}>Wdh:</span>
                        {[1, 2, 3].map((r) => {
                          const isSelected = currentReps === r;
                          return (
                            <button
                              key={r}
                              type="button"
                              onClick={() => handleUpdateSection(idx, { repetitions: r })}
                              style={{
                                border: isSelected ? '1.5px solid #0f172a' : '1px solid #cbd5e1',
                                background: isSelected ? '#0f172a' : '#ffffff',
                                color: isSelected ? '#ffffff' : '#334155',
                                padding: '4px 9px',
                                borderRadius: '8px',
                                fontSize: '0.74rem',
                                fontWeight: 900,
                                cursor: 'pointer',
                                transition: 'all 0.12s ease'
                              }}
                              className="hover-scale"
                            >
                              {r}×
                            </button>
                          );
                        })}
                      </div>

                      {/* Focus Pin */}
                      <button
                        type="button"
                        onClick={() => handleUpdateSection(idx, { isHomeworkFocus: !sec.isHomeworkFocus })}
                        style={{
                          border: sec.isHomeworkFocus ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
                          background: sec.isHomeworkFocus ? '#dcfce7' : '#ffffff',
                          color: sec.isHomeworkFocus ? '#166534' : '#64748b',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.72rem',
                          fontWeight: 850,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        className="hover-scale"
                        title="Als aktuellen Hausaufgaben-Schwerpunkt markieren"
                      >
                        <Pin size={11} style={{ color: sec.isHomeworkFocus ? '#166534' : '#64748b' }} />
                        <span>{sec.isHomeworkFocus ? 'Fokus' : 'Fokus?'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SCHRITT 5: AKKORDE FESTLEGEN (1-TAP STYLE-KARTEN MIT SOUND)     */}
          {/* --------------------------------------------------------------- */}
          {currentStep === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                  Welche Akkorde sollen erklingen?
                </h4>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                  Wähle für jeden Formteil einfach einen Klang-Stil. Beim Antippen hörst du sofort das Rhodes-Klavier.
                </p>
              </div>

              {/* Section Tabs to Switch Sections - CLEAN (OHNE KLAMMERN) */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                {sections.map((s) => {
                  const isSelected = s.id === activeStep5SectionId;
                  const colors = getSectionColors(s.name);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveStep5SectionId(s.id)}
                      style={{
                        background: isSelected ? '#0f172a' : colors.bg,
                        border: isSelected ? '1.5px solid #0f172a' : `1px solid ${colors.border}`,
                        color: isSelected ? '#ffffff' : colors.text,
                        padding: '6px 14px',
                        borderRadius: '12px',
                        fontWeight: 900,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                      className="hover-scale"
                    >
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: isSelected ? '#ffffff' : colors.badgeBg
                      }} />
                      <span>{s.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Active Section Chord Style Selector */}
              {(() => {
                const targetSecIdx = sections.findIndex(s => s.id === activeStep5SectionId);
                const targetSec = sections[targetSecIdx] || sections[0];
                if (!targetSec) return null;

                const safeTargetChords = targetSec?.chords && Array.isArray(targetSec.chords) && targetSec.chords.length > 0
                  ? targetSec.chords
                  : ['G', 'D', 'Em', 'C'];
                const chordTheory = detectKeyAndScale(safeTargetChords);

                const handleApplyStyleChords = (chordArr: string[]) => {
                  try {
                    playAlongAudioEngine.playChordPad(chordArr[0]);
                  } catch {}
                  handleUpdateSection(targetSecIdx, { chords: chordArr });
                };

                // Auto-Inherit candidate check: Look for a previous section with same base name
                const baseName = targetSec.name.replace(/\s*\d+$/, '').trim().toLowerCase();
                const parentCandidate = sections.find((s, idx) => idx < targetSecIdx && s.name.replace(/\s*\d+$/, '').trim().toLowerCase() === baseName && s.chords?.length > 0);

                const handleNextSection = () => {
                  if (targetSecIdx < sections.length - 1) {
                    setActiveStep5SectionId(sections[targetSecIdx + 1].id);
                  } else {
                    setCurrentStep(6);
                  }
                };

                const STYLES = [
                  { label: 'Pop-Hit', desc: 'Modern & eingängig', icon: '🌟', chords: ['G', 'D', 'Em', 'C'] },
                  { label: 'Emotional & Deep', desc: 'Gefühlvoll in Moll', icon: '🌙', chords: ['Em', 'C', 'G', 'D'] },
                  { label: 'Klassiker', desc: 'Zeitlos & harmonisch', icon: '🎹', chords: ['C', 'G', 'Am', 'F'] },
                  { label: 'Rock & Drive', desc: 'Kraftvoll mit Power', icon: '🎸', chords: ['E', 'A', 'B', 'E'] },
                  { label: 'Blues & Funk', desc: 'Groovig mit 7er-Akkorden', icon: '🎺', chords: ['E7', 'A7', 'B7', 'E7'] }
                ];

                return (
                  <div style={{
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '20px',
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                  }}>
                    {/* Header info with Section Title, Detected Key, and Next Section Button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 950, color: '#0f172a' }}>
                          {targetSec.name}
                        </span>
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569', background: '#e2e8f0', padding: '2px 8px', borderRadius: '6px' }}>
                          {targetSec.barsCount || 8} Takte
                        </span>
                        <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 800, background: '#dcfce7', padding: '2px 8px', borderRadius: '6px' }}>
                          Tonart: {chordTheory.key}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {parentCandidate && (
                          <button
                            type="button"
                            onClick={() => handleApplyStyleChords(parentCandidate.chords)}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: '#334155',
                              padding: '5px 12px',
                              borderRadius: '8px',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                            className="hover-scale"
                            title={`Akkorde von ${parentCandidate.name} übernehmen`}
                          >
                            ↳ Wie {parentCandidate.name}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleNextSection}
                          style={{
                            background: '#0f172a',
                            color: '#ffffff',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            fontSize: '0.76rem',
                            fontWeight: 850,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          className="hover-scale"
                        >
                          <span>{targetSecIdx < sections.length - 1 ? 'Nächster Teil' : 'Weiter zu Start'}</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>

                    {/* 5 Big Apple Style Cards */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '8px'
                    }}>
                      {STYLES.map((st) => {
                        const isMatching = JSON.stringify(targetSec.chords) === JSON.stringify(st.chords);
                        return (
                          <button
                            key={st.label}
                            type="button"
                            onClick={() => handleApplyStyleChords(st.chords)}
                            style={{
                              background: isMatching ? '#ffffff' : '#ffffff',
                              border: isMatching ? '2px solid #0f172a' : '1px solid #cbd5e1',
                              borderRadius: '14px',
                              padding: '12px 14px',
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              position: 'relative',
                              boxShadow: isMatching ? '0 4px 12px rgba(15, 23, 42, 0.08)' : 'none',
                              transform: isMatching ? 'scale(1.01)' : 'scale(1)',
                              transition: 'all 0.15s ease'
                            }}
                            className="hover-scale"
                          >
                            {isMatching && (
                              <div style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                background: '#0f172a',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <Check size={11} strokeWidth={3} />
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '1.1rem' }}>{st.icon}</span>
                              <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a' }}>{st.label}</span>
                            </div>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{st.desc}</span>
                            <span style={{ fontSize: '0.76rem', color: '#2563eb', fontWeight: 850, fontFamily: 'monospace', marginTop: '4px' }}>
                              {st.chords.join(' · ')}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Optional Teacher / Pro Toggle: Manual Editor */}
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setShowManualEditor(!showManualEditor)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#64748b',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '2px 0'
                        }}
                      >
                        <span>{showManualEditor ? '▲ Feinschliff ausblenden' : '⚙️ Akkorde manuell pro Takt anpassen'}</span>
                      </button>

                      {showManualEditor && (
                        <div style={{ marginTop: '12px', animation: 'fadeIn 0.15s ease' }}>
                          <SongChordGridEditor
                            section={targetSec}
                            allChords={allSongChords}
                            hidePresets={true}
                            hideTranspose={true}
                            onUpdateSection={(updatedSec) => {
                              handleUpdateSection(targetSecIdx, updatedSec);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* SCHRITT 6: LOSLEGEN & MITSPIELEN                                */}
          {/* --------------------------------------------------------------- */}
          {currentStep === 6 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', textAlign: 'center' }}>
              <div>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '20px',
                  background: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto'
                }}>
                  <CheckCircle2 size={32} strokeWidth={2.5} />
                </div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>
                  Deine Song-Architektur ist bereit!
                </h4>
                <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b', fontWeight: 600 }}>
                  Unser System hat deinen Song analysiert. Du kannst jetzt direkt im Studio mitspielen.
                </p>
              </div>

              {/* Apple Hero Summary Card */}
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '20px',
                padding: '20px',
                width: '100%',
                maxWidth: '480px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                      Erkannte Tonart
                    </span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a' }}>
                      {globalTheory.key}
                    </div>
                  </div>
                  <div style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    padding: '4px 10px',
                    borderRadius: '100px',
                    fontSize: '0.74rem',
                    fontWeight: 850
                  }}>
                    Tonale Harmonie: {globalTheory.diatonicFitScore}% passend
                  </div>
                </div>

                {/* Solo-Töne (Pentatonik) mit Sounding Pills */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                      Empfohlene Solo-Töne (No-Wrong-Notes):
                    </span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8' }}>
                      Tippen zum Anhören 🎵
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {globalTheory.scaleNotes.map((note, idx) => (
                      <button
                        key={note}
                        type="button"
                        onClick={() => {
                          try {
                            playAlongAudioEngine.playSingleNote(note);
                          } catch {}
                        }}
                        style={{
                          background: idx === 0 ? '#0f172a' : '#ffffff',
                          color: idx === 0 ? '#ffffff' : '#0f172a',
                          border: '1.5px solid #cbd5e1',
                          padding: '6px 12px',
                          borderRadius: '10px',
                          fontSize: '0.88rem',
                          fontWeight: 900,
                          fontFamily: 'monospace',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease'
                        }}
                        className="hover-scale"
                        title={`Ton ${note} auf Rhodes anhören`}
                        aria-label={`Ton ${note} auf Rhodes anhören`}
                      >
                        {note}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration & Tempo */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#475569', fontWeight: 700 }}>
                  <span>⏱️ {totalBarsCount} Takte • ca. {estimatedDuration}</span>
                  <span>⚡ {bpm} BPM • {timeSignature}</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ================================================================= */}
        {/* APPLE-STYLE FOOTER NAVIGATION (Back & Next - 6 Steps)             */}
        {/* ================================================================= */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #f1f5f9',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep - 1)}
              style={{
                border: '1.5px solid #e2e8f0',
                background: '#ffffff',
                color: '#475569',
                padding: '9px 16px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ChevronLeft size={16} />
              <span>Zurück</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < 6 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep + 1)}
              style={{
                border: 'none',
                background: '#0f172a',
                color: '#ffffff',
                padding: '10px 22px',
                borderRadius: '12px',
                fontWeight: 850,
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.15)'
              }}
              className="hover-scale"
            >
              <span>Weiter zu Schritt {currentStep + 1}</span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              style={{
                border: 'none',
                background: '#16a34a',
                color: '#ffffff',
                padding: '10px 24px',
                borderRadius: '12px',
                fontWeight: 900,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: 'none'
              }}
              className="hover-scale"
            >
              <Check size={16} strokeWidth={2.5} />
              <span>Im Studio starten</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
