import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  Play,
  Pause,
  Wand2,
  Sliders,
  Repeat,
  Zap,
  Music,
  Plus,
  Trash2,
  Pin,
  Check,
  Volume2,
  ArrowRight
} from 'lucide-react';
import type { SongSection, SongMeasure } from '../SongStructureBar';
import { getSectionColors } from '../SongStructureBar';
import { detectKeyAndScale, syncMeasures } from '../../utils/musicTheoryEngine';
import { playAlongAudioEngine } from '../../utils/songPlayAlongAudioEngine';
import { SongChordGridEditor } from './SongChordGridEditor';
import { SongInstrumentPedagogyView } from './SongInstrumentPedagogyView';

export interface SongArchitectureStudioViewProps {
  songTitle: string;
  songArtist?: string;
  studentName?: string;
  studentInstrument?: string;
  sections: SongSection[];
  activeSectionId: string;
  onSelectSection: (id: string) => void;
  onUpdateSection: (updated: SongSection) => void;
  onAddSection: (name: string) => void;
  onDeleteSection: (id: string) => void;
  onToggleFocus: (id: string) => void;
  songBpm: number;
  onChangeBpm: (bpm: number) => void;
  onTapTempo: () => void;
  songTimeSignature: string;
  onChangeTimeSignature: (sig: string) => void;
  isPlayingAlong: boolean;
  onTogglePlayAlong: () => void;
  playAlongBar: number;
  playAlongBeat: number;
  playAlongRepetition: number;
  isLoopingActiveSection: boolean;
  onToggleLooping: () => void;
  isSpeedTrainerActive: boolean;
  onToggleSpeedTrainer: () => void;
  onOpenWizard: () => void;
  onOpenMixer: () => void;
  onCloseStudio: () => void;
  readOnly?: boolean;
  isMobileView?: boolean;
}

export const SongArchitectureStudioView: React.FC<SongArchitectureStudioViewProps> = ({
  songTitle,
  songArtist,
  studentName,
  studentInstrument = 'Gitarre',
  sections,
  activeSectionId,
  onSelectSection,
  onUpdateSection,
  onAddSection,
  onDeleteSection,
  onToggleFocus,
  songBpm,
  onChangeBpm,
  onTapTempo,
  songTimeSignature,
  onChangeTimeSignature,
  isPlayingAlong,
  onTogglePlayAlong,
  playAlongBar,
  playAlongBeat,
  playAlongRepetition,
  isLoopingActiveSection,
  onToggleLooping,
  isSpeedTrainerActive,
  onToggleSpeedTrainer,
  onOpenWizard,
  onOpenMixer,
  onCloseStudio,
  readOnly = false,
  isMobileView = false
}) => {
  // Global Keyboard Shortcuts (Space = Play/Pause, Escape = Close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === ' ' && sections.length > 0) {
        e.preventDefault();
        onTogglePlayAlong();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCloseStudio();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sections.length, onTogglePlayAlong, onCloseStudio]);

  const activeSec = sections.find(s => s.id === activeSectionId) || sections[0];

  // Music theory calculations for active section
  const currentTheory = React.useMemo(() => {
    if (!activeSec || !activeSec.chords || activeSec.chords.length === 0) {
      return detectKeyAndScale(['C']);
    }
    return detectKeyAndScale(activeSec.chords);
  }, [activeSec]);

  // Overall key analysis
  const globalChords = React.useMemo(() => {
    return Array.from(new Set(sections.flatMap(s => s.chords || [])));
  }, [sections]);

  const globalTheory = React.useMemo(() => {
    if (globalChords.length === 0) return detectKeyAndScale(['C']);
    return detectKeyAndScale(globalChords);
  }, [globalChords]);

  const beatsPerBar = songTimeSignature === '3/4' ? 3 : (songTimeSignature === '6/8' ? 6 : (songTimeSignature === '12/8' ? 12 : 4));

  return (
    <div
      role="region"
      aria-label="Song-Architektur & Play-Along Studio"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        minHeight: 0,
        background: '#f8fafc',
        borderRadius: '24px',
        border: '1px solid #cbd5e1',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
        boxSizing: 'border-box',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      {/* ========================================================================= */}
      {/* 1. TOP HEADER: Back button, Title & Quick Actions                         */}
      {/* ========================================================================= */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '14px 20px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          boxSizing: 'border-box'
        }}
      >
        {/* Left: Back to Aufgabenheft */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={onCloseStudio}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '12px',
              border: '1.5px solid #cbd5e1',
              background: '#ffffff',
              color: '#1e293b',
              fontSize: '0.82rem',
              fontWeight: 850,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale"
            title="Zurück zum Aufgabenheft (Esc)"
          >
            <ChevronLeft size={16} strokeWidth={2.5} style={{ color: '#475569' }} />
            <span>Zurück zum Aufgabenheft</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}
            >
              <Music size={16} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 900, color: '#0f172a' }}>
                  {songTitle}
                </h3>
                {songArtist && (
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 650 }}>
                    von {songArtist}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650 }}>
                Song-Architektur & VST Play-Along Studio
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={onOpenWizard}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '12px',
              border: '1.5px solid #6366f1',
              background: '#eef2ff',
              color: '#4338ca',
              fontSize: '0.82rem',
              fontWeight: 850,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale"
            title="Schritt-für-Schritt Baukasten öffnen"
          >
            <Wand2 size={15} strokeWidth={2} style={{ color: '#4338ca' }} />
            <span>Baukasten-Editor</span>
          </button>

          <button
            type="button"
            onClick={onOpenMixer}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '12px',
              border: '1.5px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontSize: '0.82rem',
              fontWeight: 850,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale"
            title="Audio-Mixer für Drums, Bass, Chords & Klick öffnen"
          >
            <Sliders size={15} style={{ color: '#475569' }} />
            <span>Mixer</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. BODY CONTENT: Empty State OR 2-Column Studio                           */}
      {/* ========================================================================= */}
      {sections.length === 0 ? (
        /* ======================================================================= */
        /* 📭 EMPTY STATE: Zero Dummy Data - Clean and Inviting                     */
        /* ======================================================================= */
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 24px',
            textAlign: 'center',
            gap: '20px'
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '24px',
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)'
            }}
          >
            <Music size={32} strokeWidth={1.75} style={{ color: '#64748b' }} />
          </div>

          <div style={{ maxWidth: '460px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
              Noch keine Song-Architektur erstellt
            </h4>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b', lineHeight: 1.55, fontWeight: 600 }}>
              Dieser Song besitzt noch keine Formteile. Starte den Schritt-für-Schritt Baukasten, um Strophen, Refrains, Taktzahlen und Akkorde festzulegen. Sobald die Struktur steht, kannst du mit dem VST-Instrument live dazu spielen!
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={onOpenWizard}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '16px',
                border: 'none',
                background: '#0f172a',
                color: '#ffffff',
                fontSize: '0.92rem',
                fontWeight: 850,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.2)',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale"
            >
              <Wand2 size={16} strokeWidth={2.5} style={{ color: '#ffffff' }} />
              <span>Baukasten starten</span>
              <ArrowRight size={16} strokeWidth={2.5} style={{ color: '#ffffff' }} />
            </button>

            <button
              type="button"
              onClick={() => onAddSection('Strophe')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 20px',
                borderRadius: '16px',
                border: '1.5px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                fontSize: '0.9rem',
                fontWeight: 850,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale"
            >
              <Plus size={16} strokeWidth={2.5} style={{ color: '#475569' }} />
              <span>Ersten Teil anlegen</span>
            </button>
          </div>
        </div>
      ) : (
        /* ======================================================================= */
        /* 🏛️ 2-COLUMN STUDIO: Macro & Transport (Left) / Micro & Grid (Right)     */
        /* ======================================================================= */
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: isMobileView ? '1fr' : '380px 1fr',
            minHeight: 0,
            overflowY: isMobileView ? 'auto' : 'hidden'
          }}
        >
          {/* ------------------------------------------------------------------- */}
          {/* COLUMN 1 (LEFT): Transport Controls & Formteil-Ablauf              */}
          {/* ------------------------------------------------------------------- */}
          <div
            style={{
              borderRight: isMobileView ? 'none' : '1px solid #e2e8f0',
              borderBottom: isMobileView ? '1px solid #e2e8f0' : 'none',
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              boxSizing: 'border-box'
            }}
          >
            {/* 1.1 Audio Transport Controls Bar */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                background: '#fafbfd'
              }}
            >
              {/* Master Play/Pause Button */}
              <button
                type="button"
                onClick={onTogglePlayAlong}
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  borderRadius: '16px',
                  border: 'none',
                  background: isPlayingAlong ? '#dc2626' : '#0f172a',
                  color: '#ffffff',
                  fontSize: '0.94rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: isPlayingAlong
                    ? '0 4px 18px rgba(220, 38, 38, 0.3)'
                    : '0 4px 18px rgba(15, 23, 42, 0.25)',
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale"
              >
                {isPlayingAlong ? (
                  <>
                    <Pause size={18} strokeWidth={2.5} style={{ color: '#ffffff' }} />
                    <span>Pausieren</span>
                  </>
                ) : (
                  <>
                    <Play size={18} strokeWidth={2.5} fill="#ffffff" style={{ color: '#ffffff' }} />
                    <span>Song abspielen</span>
                  </>
                )}
              </button>

              {/* Transport Quick-Tools: Loop, Speed Trainer, BPM, Taktart */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Loop Button */}
                <button
                  type="button"
                  onClick={onToggleLooping}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    border: isLoopingActiveSection ? '1.5px solid #0f172a' : '1px solid #cbd5e1',
                    background: isLoopingActiveSection ? '#0f172a' : '#ffffff',
                    color: isLoopingActiveSection ? '#ffffff' : '#475569',
                    fontSize: '0.76rem',
                    fontWeight: 850,
                    cursor: 'pointer',
                    transition: 'all 0.12s'
                  }}
                  title="Aktuellen Formteil in Dauerschleife wiederholen"
                >
                  <Repeat size={14} style={{ color: isLoopingActiveSection ? '#ffffff' : '#475569' }} />
                  <span>{isLoopingActiveSection ? 'Loop An' : 'Loop'}</span>
                </button>

                {/* Speed-Trainer (+5 BPM) */}
                <button
                  type="button"
                  onClick={onToggleSpeedTrainer}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    border: isSpeedTrainerActive ? '1.5px solid #0f172a' : '1px solid #cbd5e1',
                    background: isSpeedTrainerActive ? '#0f172a' : '#ffffff',
                    color: isSpeedTrainerActive ? '#ffffff' : '#475569',
                    fontSize: '0.76rem',
                    fontWeight: 850,
                    cursor: 'pointer',
                    transition: 'all 0.12s'
                  }}
                  title="Automatischer Speed-Trainer (+5 BPM pro Durchlauf)"
                >
                  <Zap size={14} style={{ color: isSpeedTrainerActive ? '#ffffff' : '#475569' }} />
                  <span>{isSpeedTrainerActive ? 'Speed An' : 'Speed +5'}</span>
                </button>
              </div>

              {/* Tempo & Taktart Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '8px 12px',
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0'
                }}
              >
                {/* BPM Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => onChangeBpm(Math.max(40, songBpm - 2))}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontWeight: 900,
                      fontSize: '0.95rem',
                      color: '#475569',
                      padding: '2px 6px'
                    }}
                  >
                    −
                  </button>
                  <span style={{ fontWeight: 950, fontSize: '0.86rem', color: '#0f172a', minWidth: '44px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                    {songBpm} BPM
                  </span>
                  <button
                    type="button"
                    onClick={() => onChangeBpm(Math.min(240, songBpm + 2))}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontWeight: 900,
                      fontSize: '0.95rem',
                      color: '#475569',
                      padding: '2px 6px'
                    }}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={onTapTempo}
                    style={{
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      color: '#0f172a',
                      padding: '3px 8px',
                      borderRadius: '8px',
                      fontSize: '0.72rem',
                      fontWeight: 850,
                      cursor: 'pointer',
                      marginLeft: '2px'
                    }}
                    title="Im Takt tippen"
                  >
                    Tap
                  </button>
                </div>

                {/* Time Signature */}
                <select
                  value={songTimeSignature}
                  onChange={(e) => onChangeTimeSignature(e.target.value)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '3px 8px',
                    fontSize: '0.76rem',
                    fontWeight: 850,
                    color: '#0f172a',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="4/4">4/4 Takt</option>
                  <option value="3/4">3/4 Walzer</option>
                  <option value="6/8">6/8 Feel</option>
                  <option value="12/8">12/8 Blues</option>
                </select>
              </div>

              {/* Live Beat Tracker (Pulsing during play) */}
              {isPlayingAlong && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 12px',
                    background: '#0f172a',
                    borderRadius: '10px',
                    color: '#ffffff'
                  }}
                >
                  <span style={{ fontSize: '0.72rem', fontWeight: 850 }}>
                    Takt {playAlongBar} • {playAlongRepetition > 1 ? `Rep. ${playAlongRepetition}` : 'Beat'}:
                  </span>
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    {Array.from({ length: beatsPerBar }).map((_, idx) => {
                      const beatNum = idx + 1;
                      const isActive = playAlongBeat === beatNum;
                      return (
                        <div
                          key={beatNum}
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: isActive ? '#ffffff' : '#334155',
                            transform: isActive ? 'scale(1.3)' : 'scale(1)',
                            transition: 'all 0.08s ease'
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 1.2 Formteile-Timeline / Ablauf-Liste */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '4px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Song-Ablauf ({sections.length} Formteile):
                </span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>
                  Tonart: {globalTheory.key}
                </span>
              </div>

              {sections.map((sec, idx) => {
                const isSelected = sec.id === activeSectionId;
                const isPlayingThis = isPlayingAlong && sec.id === activeSectionId;
                const colors = getSectionColors(sec.name);

                return (
                  <div
                    key={sec.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectSection(sec.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectSection(sec.id);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '14px',
                      background: isSelected ? colors.activeBg : '#f8fafc',
                      border: isSelected ? `2px solid ${colors.text}` : '1.5px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 3px 10px rgba(0, 0, 0, 0.04)' : 'none',
                      position: 'relative'
                    }}
                    className="hover-scale"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#94a3b8', width: '16px' }}>
                        {idx + 1}.
                      </span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 900, color: colors.text }}>
                            {sec.name}
                          </span>
                          {sec.isHomeworkFocus && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                background: '#16a34a',
                                color: '#ffffff',
                                borderRadius: '6px',
                                padding: '1px 5px',
                                fontSize: '0.62rem',
                                fontWeight: 900
                              }}
                            >
                              <Pin size={9} style={{ color: '#ffffff' }} />
                              <span>Fokus</span>
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, marginTop: '2px' }}>
                          {sec.bars || `${sec.barsCount || 8} Takte`}
                          {sec.repetitions && sec.repetitions > 1 ? ` • ${sec.repetitions}x Wdh.` : ''}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isPlayingThis && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#0f172a', color: '#ffffff', padding: '2px 8px', borderRadius: '100px', fontSize: '0.68rem', fontWeight: 850 }}>
                          <Play size={10} fill="#ffffff" />
                          <span>Takt {playAlongBar}</span>
                        </div>
                      )}

                      {!readOnly && isSelected && sections.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSection(sec.id);
                          }}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Formteil entfernen"
                        >
                          <Trash2 size={13} style={{ color: '#ef4444' }} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {!readOnly && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {['Intro', 'Strophe', 'Refrain', 'Bridge', 'Outro'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => onAddSection(preset)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '10px',
                        border: '1px dashed #cbd5e1',
                        background: '#ffffff',
                        color: '#475569',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      className="hover-scale"
                    >
                      <Plus size={12} style={{ color: '#475569' }} />
                      <span>{preset}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ------------------------------------------------------------------- */}
          {/* COLUMN 2 (RIGHT): Detail View - Takt-Grid, Harmonik & Instrument    */}
          {/* ------------------------------------------------------------------- */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflowY: 'auto',
              padding: isMobileView ? '16px' : '20px 24px',
              gap: '16px',
              background: '#f8fafc'
            }}
          >
            {activeSec ? (
              <>
                {/* 2.1 Section Detail Header Card */}
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    padding: '16px 20px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 950, color: '#0f172a' }}>
                      {activeSec.name}
                    </h4>
                    <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#475569', background: '#f1f5f9', padding: '3px 8px', borderRadius: '8px' }}>
                      {activeSec.bars || `${activeSec.barsCount || 8} Takte`}
                    </span>
                    {activeSec.repetitions && activeSec.repetitions > 1 && (
                      <span style={{ fontSize: '0.76rem', fontWeight: 850, color: '#0284c7', background: '#e0f2fe', padding: '3px 8px', borderRadius: '8px' }}>
                        {activeSec.repetitions}x Wiederholung
                      </span>
                    )}
                  </div>

                  {/* Right Header Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => onToggleFocus(activeSec.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '10px',
                          border: activeSec.isHomeworkFocus ? '1px solid #86efac' : '1px solid #cbd5e1',
                          background: activeSec.isHomeworkFocus ? '#f0fdf4' : '#ffffff',
                          color: activeSec.isHomeworkFocus ? '#16a34a' : '#475569',
                          fontSize: '0.76rem',
                          fontWeight: 850,
                          cursor: 'pointer'
                        }}
                        className="hover-scale"
                        title="Als Hausaufgabe-Fokus markieren"
                      >
                        <Pin size={13} style={{ color: activeSec.isHomeworkFocus ? '#16a34a' : '#475569' }} />
                        <span>{activeSec.isHomeworkFocus ? 'Fokus aktiv' : 'Als Fokus setzen'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 2.2 Takt-für-Takt Grid (Zero-Scroll mit großer Typografie) */}
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    padding: '18px 20px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Takt-Matrix (Klick auf Takt zum Ändern):
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>
                      VST Akkord-Begleitung aktiv
                    </span>
                  </div>

                  <SongChordGridEditor
                    section={activeSec}
                    allChords={globalChords}
                    currentPlayAlongBar={isPlayingAlong && activeSec.id === activeSectionId ? playAlongBar : undefined}
                    isPlayingAlong={isPlayingAlong}
                    readOnly={readOnly}
                    onUpdateSection={onUpdateSection}
                  />
                </div>

                {/* 2.3 Didaktische Harmonielehre & Solo-Labor (Monochrom) */}
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    padding: '16px 20px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#0f172a' }}>
                        Solo & Jammen:
                      </span>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {currentTheory.scaleNotes.map((note) => (
                          <button
                            key={note}
                            type="button"
                            onClick={() => {
                              try {
                                playAlongAudioEngine.playSingleNote(note);
                              } catch {}
                            }}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              padding: '2px 8px',
                              borderRadius: '7px',
                              fontSize: '0.82rem',
                              fontWeight: 900,
                              fontFamily: 'monospace',
                              color: '#0f172a',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center'
                            }}
                            className="hover-scale"
                            title={`Ton ${note} anhören`}
                            aria-label={`Ton ${note} auf Rhodes anhören`}
                          >
                            {note}
                          </button>
                        ))}
                      </div>
                      <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 750 }}>
                        ({currentTheory.scaleName.replace(/🎸|🎹/g, '').trim()})
                      </span>
                    </div>

                    <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 800, background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                      Stufen: {currentTheory.degrees} • Tonart: {currentTheory.key}
                    </span>
                  </div>
                </div>

                {/* 2.4 Instrumenten-Pädagogik Ansicht */}
                <SongInstrumentPedagogyView
                  section={activeSec}
                  studentInstrument={studentInstrument}
                />
              </>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  padding: '40px 20px',
                  textAlign: 'center',
                  background: '#ffffff',
                  borderRadius: '20px',
                  border: '1.5px dashed #cbd5e1'
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '20px',
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px'
                  }}
                >
                  <Music size={28} strokeWidth={2} style={{ color: '#0f172a' }} />
                </div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                  Noch keine Formteile vorhanden
                </h3>
                <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748b', maxWidth: '380px', lineHeight: 1.5 }}>
                  Starte den Baukasten, um Tempo, Taktart, Song-Struktur und Akkorde für <strong>{songTitle}</strong> in einfachen Schritten festzulegen.
                </p>
                <button
                  type="button"
                  onClick={onOpenWizard}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    borderRadius: '14px',
                    border: 'none',
                    background: '#0f172a',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: 850,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale"
                >
                  <Wand2 size={16} strokeWidth={2.5} />
                  <span>Song-Architektur Baukasten starten</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
