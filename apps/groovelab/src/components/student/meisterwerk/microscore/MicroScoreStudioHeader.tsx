import React from 'react';
import {
  X,
  Play,
  Square,
  Save,
  Music,
  Sparkles,
  Check,
  Minus,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Pencil,
  BookOpen,
  Maximize2,
  Minimize2,
  Palette
} from 'lucide-react';
import { MicroScoreInstrument, MicroScoreSnippet, MicroScoreTimeSignature } from './microScore.types';
import { MicroScorePlayerBar } from './MicroScorePlayerBar';
import { getSnippetArrangementLabel } from '../../../../services/canonicalScoreEngine';
import { VdmDrumPreset } from './vdmDrumPresets';
import { MicroScoreViewModeSwitcher, MicroScoreViewMode } from './MicroScoreViewModeSwitcher';

export interface MicroScoreStudioHeaderProps {
  snippet: MicroScoreSnippet;
  setSnippet: React.Dispatch<React.SetStateAction<MicroScoreSnippet>>;
  theme: { primary: string; glow: string };
  taskId?: string;
  taskTitle?: string;
  readOnly: boolean;
  showTemplates: boolean;
  setShowTemplates: React.Dispatch<React.SetStateAction<boolean>>;
  activeTab: 'practice' | 'write';
  setActiveTab: React.Dispatch<React.SetStateAction<'practice' | 'write'>>;
  isPlaying: boolean;
  stopPlayback: () => void;
  startPlayback: () => void;
  handleManualStop: () => void;
  handleRewind: () => void;
  handleSave: () => void;
  savedSuccess: boolean;
  hasMultipleSnippets: boolean;
  snippetList?: MicroScoreSnippet[];
  currentListIndex: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  handleNavigateSnippet: (index: number) => void;
  isStudioMaximized: boolean;
  handleToggleFullscreen: () => void;
  onClose: () => void;
  activeBar: number;
  setActiveBar: React.Dispatch<React.SetStateAction<number>>;
  availableInstrumentOptions: Array<{ value: MicroScoreInstrument; label: string }>;
  handleInstrumentChange: (inst: MicroScoreInstrument) => void;
  viewMode: MicroScoreViewMode;
  setViewMode: React.Dispatch<React.SetStateAction<MicroScoreViewMode>>;
  isMobileLandscape: boolean;
  isLooping: boolean;
  setIsLooping: React.Dispatch<React.SetStateAction<boolean>>;
  speedRate: number;
  setSpeedRate: React.Dispatch<React.SetStateAction<number>>;
  isMetronomeActive: boolean;
  setIsMetronomeActive: React.Dispatch<React.SetStateAction<boolean>>;
  soloSample: boolean;
  setSoloSample: React.Dispatch<React.SetStateAction<boolean>>;
  isChallengeOpen: boolean;
  setIsChallengeOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setChallengeHits: React.Dispatch<React.SetStateAction<Record<string, 'hit' | 'near' | 'miss'>>>;
  setCountInInfo: React.Dispatch<React.SetStateAction<{ currentBeat: number; totalBeats: number } | null>>;
  applyDrumPreset: (preset: VdmDrumPreset) => void;
  isColorGuide?: boolean;
  onToggleColorGuide?: (val?: boolean) => void;
}

export const MicroScoreStudioHeader: React.FC<MicroScoreStudioHeaderProps> = ({
  snippet,
  setSnippet,
  theme,
  taskId,
  taskTitle,
  readOnly,
  activeTab,
  setActiveTab,
  isPlaying,
  stopPlayback,
  startPlayback,
  handleManualStop,
  handleRewind,
  handleSave,
  savedSuccess,
  hasMultipleSnippets,
  snippetList,
  currentListIndex,
  canGoPrev,
  canGoNext,
  handleNavigateSnippet,
  isStudioMaximized,
  handleToggleFullscreen,
  onClose,
  availableInstrumentOptions,
  handleInstrumentChange,
  viewMode,
  setViewMode,
  isMobileLandscape,
  isLooping,
  setIsLooping,
  speedRate,
  setSpeedRate,
  isMetronomeActive,
  setIsMetronomeActive,
  soloSample,
  setSoloSample,
  isChallengeOpen,
  setIsChallengeOpen,
  setChallengeHits,
  setCountInInfo,
  isColorGuide = true,
  onToggleColorGuide
}) => {
  return (
    <div
      style={{
        padding: '14px 20px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        background: '#ffffff'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '220px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '11px',
              background: theme.primary,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 2px 10px ${theme.glow}`,
              flexShrink: 0
            }}
          >
            <Music size={18} color="#ffffff" strokeWidth={2.5} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            {taskId || taskTitle ? (
              <>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <BookOpen size={12} strokeWidth={2.2} />
                  <span>Hausaufgabe · Noten-Schnipsel</span>
                </span>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '1.14rem',
                    fontWeight: 900,
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontFamily: 'inherit'
                  }}
                  title={snippet.title}
                >
                  {snippet.title}
                </h2>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: readOnly ? 'transparent' : '#f8fafc',
                    border: readOnly ? 'none' : '1px solid #e2e8f0',
                    borderRadius: '9px',
                    padding: readOnly ? '0' : '2px 10px 2px 8px',
                    flex: 1,
                    maxWidth: '380px',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                  }}
                >
                  {!readOnly && <Pencil size={13} color="#64748b" style={{ flexShrink: 0 }} />}
                  <input
                    type="text"
                    value={snippet.title}
                    onChange={e => setSnippet(prev => ({ ...prev, title: e.target.value }))}
                    onFocus={e => {
                      if (e.target.value === 'Neuer Noten-Schnipsel') {
                        e.target.select();
                      }
                    }}
                    disabled={readOnly}
                    placeholder="Schnipsel benennen (z. B. C-Dur Tonleiter, Takt 1–2)"
                    aria-label="Titel des Micro-Score Schnipsels"
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 900,
                      color: '#0f172a',
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      width: '100%',
                      fontFamily: 'inherit',
                      padding: 0
                    }}
                  />
                </div>
              </div>
            )}

            {activeTab === 'practice' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '0.64rem',
                    fontWeight: 800,
                    color: theme.primary,
                    background: `${theme.primary}15`,
                    padding: '2px 7px',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {getSnippetArrangementLabel(snippet, snippet.instrument)}
                </span>

                {snippet.description && snippet.description !== 'Eigene Übung oder Noten-Schnipsel' && (
                  <span
                    title={snippet.description}
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      color: '#475569',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      maxWidth: '420px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {snippet.description}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            role="tablist"
            aria-label="Micro-Score Arbeitsmodus"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#f1f5f9',
              borderRadius: '12px',
              padding: '3px',
              gap: '3px'
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'practice'}
              onClick={() => {
                setActiveTab('practice');
                if (isPlaying) stopPlayback();
              }}
              style={{
                border: 'none',
                background: activeTab === 'practice' ? '#ffffff' : 'transparent',
                color: activeTab === 'practice' ? '#0f172a' : '#64748b',
                borderRadius: '9px',
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: activeTab === 'practice' ? 900 : 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
                boxShadow: activeTab === 'practice' ? '0 1px 4px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.05)' : 'none'
              }}
            >
              <Headphones size={15} strokeWidth={2.2} color={activeTab === 'practice' ? theme.primary : 'currentColor'} />
              <span>Üben & Mitspielen</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'write'}
              onClick={() => {
                setActiveTab('write');
                if (isPlaying) stopPlayback();
              }}
              style={{
                border: 'none',
                background: activeTab === 'write' ? '#ffffff' : 'transparent',
                color: activeTab === 'write' ? '#0f172a' : '#64748b',
                borderRadius: '9px',
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: activeTab === 'write' ? 900 : 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
                boxShadow: activeTab === 'write' ? '0 1px 4px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.05)' : 'none'
              }}
            >
              <Pencil size={15} strokeWidth={2.2} color={activeTab === 'write' ? '#4f46e5' : 'currentColor'} />
              <span>Noten bearbeiten</span>
            </button>
          </div>

          {!readOnly && (activeTab === 'write' || savedSuccess) && (
            <button
              type="button"
              role="button"
              tabIndex={0}
              onClick={handleSave}
              style={{
                border: 'none',
                background: savedSuccess ? '#059669' : '#4f46e5',
                color: '#ffffff',
                borderRadius: '11px',
                height: '38px',
                padding: '0 18px',
                fontSize: '0.82rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                boxShadow: savedSuccess
                  ? '0 4px 12px rgba(5,150,105,0.35)'
                  : '0 4px 14px rgba(79,70,229,0.38)',
                transition: 'all 0.15s ease'
              }}
              title="Noten-Schnipsel speichern (Cmd+S / Ctrl+S)"
            >
              {savedSuccess ? <Check size={15} strokeWidth={3} /> : <Save size={15} />}
              <span>{savedSuccess ? 'Gespeichert! ✓' : 'Fertig & Speichern'}</span>
            </button>
          )}

          {activeTab === 'practice' && hasMultipleSnippets && snippetList && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: '#f1f5f9',
                borderRadius: '10px',
                padding: '2px 4px',
                gap: '2px',
                flexShrink: 0
              }}
              role="group"
              aria-label="Übungs-Navigation"
            >
              <button
                type="button"
                onClick={() => canGoPrev && handleNavigateSnippet(currentListIndex - 1)}
                disabled={!canGoPrev}
                aria-label="Vorherige Übung (Pfeiltaste links)"
                title={canGoPrev ? `Vorherige Übung (←): ${snippetList[currentListIndex - 1]?.title || ''}` : 'Erste Übung erreicht'}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: canGoPrev ? '#0f172a' : '#cbd5e1',
                  borderRadius: '8px',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: canGoPrev ? 'pointer' : 'default',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => {
                  if (canGoPrev) e.currentTarget.style.background = '#ffffff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>

              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#475569',
                padding: '0 6px',
                whiteSpace: 'nowrap',
                userSelect: 'none'
              }}>
                {currentListIndex + 1} / {snippetList.length}
              </span>

              <button
                type="button"
                onClick={() => canGoNext && handleNavigateSnippet(currentListIndex + 1)}
                disabled={!canGoNext}
                aria-label="Nächste Übung (Pfeiltaste rechts)"
                title={canGoNext ? `Nächste Übung (→): ${snippetList[currentListIndex + 1]?.title || ''}` : 'Letzte Übung erreicht'}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: canGoNext ? '#0f172a' : '#cbd5e1',
                  borderRadius: '8px',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: canGoNext ? 'pointer' : 'default',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => {
                  if (canGoNext) e.currentTarget.style.background = '#ffffff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          )}

          <button
            type="button"
            role="button"
            tabIndex={0}
            onClick={handleToggleFullscreen}
            aria-label={isStudioMaximized ? "Vollbild verkleinern" : "Vollbild aktivieren"}
            title={isStudioMaximized ? "Vollbild verkleinern (F)" : "Vollbildmodus aktivieren (F)"}
            style={{
              border: 'none',
              background: isStudioMaximized ? '#e0e7ff' : '#f1f5f9',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: isStudioMaximized ? '#4f46e5' : '#475569',
              transition: 'all 0.15s ease'
            }}
          >
            {isStudioMaximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          <button
            type="button"
            role="button"
            tabIndex={0}
            onClick={() => {
              stopPlayback();
              onClose();
            }}
            aria-label="Schließen"
            style={{
              border: 'none',
              background: '#f1f5f9',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569',
              transition: 'background 0.15s ease'
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {activeTab === 'write' && (
            <>
              <div style={{ position: 'relative' }}>
                <select
                  value={snippet.timeSignature}
                  onChange={e => setSnippet(prev => ({ ...prev, timeSignature: e.target.value as MicroScoreTimeSignature }))}
                  disabled={readOnly}
                  style={{ height: '32px', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0 24px 0 8px', fontSize: '0.74rem', fontWeight: 800, background: '#ffffff', color: '#0f172a', cursor: readOnly ? 'default' : 'pointer', appearance: 'none', outline: 'none' }}
                  title="Taktart auswählen"
                >
                  <option value="4/4">4/4</option>
                  <option value="3/4">3/4</option>
                  <option value="2/4">2/4</option>
                  <option value="6/8">6/8</option>
                </select>
                <ChevronDown size={12} style={{ position: 'absolute', right: '7px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '2px 4px', gap: '3px' }}>
                <button
                  type="button"
                  onClick={() => setSnippet(prev => ({ ...prev, tempoBpm: Math.max(40, prev.tempoBpm - 2) }))}
                  disabled={readOnly}
                  title="2 BPM langsamer"
                  style={{ border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                >
                  <Minus size={12} strokeWidth={2.5} />
                </button>
                <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                  {snippet.tempoBpm} <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748b' }}>BPM</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSnippet(prev => ({ ...prev, tempoBpm: Math.min(240, prev.tempoBpm + 2) }))}
                  disabled={readOnly}
                  title="2 BPM schneller"
                  style={{ border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                >
                  <Plus size={12} strokeWidth={2.5} />
                </button>
              </div>

              <button
                type="button"
                disabled={!isPlaying && (!snippet.notes || snippet.notes.length === 0)}
                onClick={isPlaying ? stopPlayback : startPlayback}
                style={{
                  border: 'none',
                  background: isPlaying ? '#dc2626' : '#0f172a',
                  color: '#ffffff',
                  borderRadius: '11px',
                  height: '36px',
                  padding: '0 16px',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  cursor: (!isPlaying && (!snippet.notes || snippet.notes.length === 0)) ? 'not-allowed' : 'pointer',
                  opacity: (!isPlaying && (!snippet.notes || snippet.notes.length === 0)) ? 0.45 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  boxShadow: (!isPlaying && (!snippet.notes || snippet.notes.length === 0)) ? 'none' : '0 3px 10px rgba(15, 23, 42, 0.2)',
                  transition: 'all 0.15s ease'
                }}
                title={(!isPlaying && (!snippet.notes || snippet.notes.length === 0)) ? 'Setze zuerst mindestens eine Note zum Anhören' : isPlaying ? 'Wiedergabe stoppen (Leertaste)' : 'Schnipsel vorhören (Leertaste)'}
              >
                {isPlaying ? <Square size={13} fill="#ffffff" /> : <Play size={14} fill="#ffffff" />}
                <span>{isPlaying ? 'Stopp' : 'Anhören'}</span>
              </button>
            </>
          )}

          <div style={{ position: 'relative' }}>
            <select
              value={snippet.instrument}
              onChange={e => {
                handleInstrumentChange(e.target.value as MicroScoreInstrument);
                e.currentTarget.blur();
              }}
              disabled={readOnly}
              style={{
                height: isMobileLandscape ? '34px' : '38px',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: isMobileLandscape ? '0 28px 0 10px' : '0 32px 0 12px',
                fontSize: isMobileLandscape ? '0.74rem' : '0.80rem',
                fontWeight: 800,
                background: '#ffffff',
                color: '#0f172a',
                cursor: readOnly ? 'default' : 'pointer',
                appearance: 'none',
                outline: 'none',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
                transition: 'all 0.15s ease'
              }}
              title="Instrument wechseln"
            >
              {availableInstrumentOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: '#64748b'
              }}
            />
          </div>

          <MicroScoreViewModeSwitcher
            instrument={snippet.instrument}
            activeMode={viewMode}
            onSelectMode={setViewMode}
            isMobileLandscape={isMobileLandscape}
            themeColor={theme.primary}
            readOnly={readOnly}
          />

          {/* 🎨 / 🎼 Prominenter 0,1% Goldstandard Notenfarb-Switcher (Bunte Noten vs. Klassisch Schwarz) */}
          {onToggleColorGuide && (
            <div
              role="tablist"
              aria-label="Notenfarb-Darstellung"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: isMobileLandscape ? '34px' : '38px',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '3px',
                gap: '3px',
                boxSizing: 'border-box',
                userSelect: 'none'
              }}
            >
              <button
                type="button"
                role="tab"
                aria-selected={isColorGuide}
                onClick={() => onToggleColorGuide(true)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                    onToggleColorGuide(!isColorGuide);
                  }
                }}
                title="Bunte Didaktik-Noten (Boomwhacker-Farben & Tonnamen auf Noten und Griffbrett)"
                style={{
                  border: 'none',
                  height: '100%',
                  background: isColorGuide
                    ? 'linear-gradient(135deg, #ef4444 0%, #f97316 16%, #facc15 33%, #34a853 50%, #06b6d4 67%, #3b82f6 84%, #a855f7 100%)'
                    : 'transparent',
                  color: isColorGuide ? '#ffffff' : '#64748b',
                  borderRadius: '9px',
                  padding: isMobileLandscape ? '0 10px' : '0 14px',
                  fontSize: isMobileLandscape ? '0.74rem' : '0.80rem',
                  fontWeight: isColorGuide ? 900 : 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isColorGuide
                    ? '0 2px 8px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.25) inset'
                    : 'none',
                  textShadow: isColorGuide ? '0 1px 2px rgba(0, 0, 0, 0.45)' : 'none',
                  whiteSpace: 'nowrap',
                  outline: 'none'
                }}
              >
                <Palette
                  size={14}
                  strokeWidth={2.4}
                  style={{
                    color: isColorGuide ? '#ffffff' : '#ef4444',
                    filter: isColorGuide ? 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.35))' : 'none'
                  }}
                />
                <span>Bunte Noten</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={!isColorGuide}
                onClick={() => onToggleColorGuide(false)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                    onToggleColorGuide(!isColorGuide);
                  }
                }}
                title="Klassische schwarze Urtext-Noten (ohne Buchstaben im Notenkopf)"
                style={{
                  border: 'none',
                  height: '100%',
                  background: !isColorGuide ? '#ffffff' : 'transparent',
                  color: !isColorGuide ? '#0f172a' : '#64748b',
                  borderRadius: '9px',
                  padding: isMobileLandscape ? '0 10px' : '0 14px',
                  fontSize: isMobileLandscape ? '0.74rem' : '0.80rem',
                  fontWeight: !isColorGuide ? 900 : 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: !isColorGuide
                    ? '0 1px 4px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(15, 23, 42, 0.06)'
                    : 'none',
                  whiteSpace: 'nowrap',
                  outline: 'none'
                }}
              >
                <Music size={14} strokeWidth={2.4} style={{ color: !isColorGuide ? '#0f172a' : '#64748b' }} />
                <span>Klassisch</span>
              </button>
            </div>
          )}
        </div>

        {activeTab === 'practice' && (
          <MicroScorePlayerBar
            variant="header"
            isPlaying={isPlaying}
            onTogglePlay={isPlaying ? handleManualStop : startPlayback}
            onRewind={handleRewind}
            isLooping={isLooping}
            onToggleLoop={() => setIsLooping(prev => !prev)}
            speedRate={speedRate}
            onChangeSpeed={(speed) => {
              setSpeedRate(speed);
              if (isPlaying) {
                stopPlayback();
                setTimeout(() => startPlayback(), 60);
              }
            }}
            isMetronomeActive={isMetronomeActive}
            onToggleMetronome={() => setIsMetronomeActive(prev => !prev)}
            soloSample={soloSample}
            onToggleSoloSample={() => setSoloSample(prev => !prev)}
            instrument={snippet.instrument}
            tempoBpm={snippet.tempoBpm}
            isChallengeOpen={isChallengeOpen}
            onToggleChallenge={() => {
              setIsChallengeOpen(prev => {
                const next = !prev;
                if (next) {
                  setChallengeHits({});
                } else {
                  if (isPlaying) stopPlayback();
                  setCountInInfo(null);
                }
                return next;
              });
            }}
            readOnly={readOnly}
          />
        )}
      </div>
    </div>
  );
};
