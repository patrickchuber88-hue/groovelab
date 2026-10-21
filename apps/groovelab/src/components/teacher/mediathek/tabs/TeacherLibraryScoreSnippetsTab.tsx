/**
 * 🏛️ Campus-Groovelab 0,1% Goldstandard: Notenschnipsel-Tab
 * TeacherLibraryScoreSnippetsTab.tsx
 * 
 * Autarker Feature-Monolith für das Mediathek Board:
 * - Übersicht aller Notenschnipsel (1–4 Takte) der Lehrkraft
 * - Integrierte Web Audio Synthesizer Schnell-Vorschau (▶ Play / ■ Stop)
 * - 1-Tap Direktauslöser: [ ⚡ Als Hausaufgabe zuweisen ]
 * - Direkter Absprung ins MicroScore Studio für Bearbeitung & Neuanlage
 * - BFSG 2025 & WCAG 2.2 AA konform (Tastaturbedienung, Kontrast >= 7:1)
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Music, Play, Square, Share2, Plus, Edit2, Trash2,
  Clock, Sparkles, Filter, ChevronRight, ChevronDown, Volume2,
  LayoutGrid, List, Globe, Piano, Guitar, Drum, Wind, Activity, Mic, Layers, FolderOpen,
  ArrowUpDown
} from 'lucide-react';
import { MicroScoreSnippet, MicroScoreInstrument } from '../../../student/meisterwerk/microscore/microScore.types';
import { MicroScoreAudioSynthesizer, durationToSeconds } from '../../../student/meisterwerk/microscore/microScoreAudioSynthesizer';
import { INSTRUMENT_OPTIONS } from '../../../student/meisterwerk/microscore/vdmDrumPresets';
import { VDM_CATEGORIES, isOwnScoreSnippet, VdmFolderCategory } from '../../../../services/vdmScoreSnippetCatalog';
import { resolveSnippetForInstrument } from '../../../../services/canonicalScoreEngine';
import { MicroScoreCalmThumbnail } from '../components/MicroScoreCalmThumbnail';
import {
  sortScoreSnippets,
  VdmSortMode,
  VDM_SORT_OPTIONS,
  getVdmLevelWeight,
  getVdmLevelColor,
  VDM_LEVEL_COLORS
} from '../../../../services/vdmDidacticSortEngine';
import {
  mapFilterToInstrument,
  mapInstrumentToFilter,
  isSnippetMatchingInstrument,
  INSTRUMENT_COLOR_MAP,
  matchesLevelFilter,
  getSnippetCategoryMeta,
  TeacherScoreSnippetListRow
} from './teacherScoreSnippetHelpers';
export {
  mapFilterToInstrument,
  mapInstrumentToFilter,
  isSnippetMatchingInstrument,
  matchesLevelFilter,
  getSnippetCategoryMeta
};

export interface TeacherLibraryScoreSnippetsTabProps {
  snippets: MicroScoreSnippet[];
  onAssign: (snippet: MicroScoreSnippet) => void;
  onEdit: (snippet: MicroScoreSnippet, snippetList?: MicroScoreSnippet[], initialIndex?: number) => void;
  onDelete: (snippetId: string) => void;
  onNewSnippet: () => void;
  searchQuery?: string;
  selectedInstrumentFilter?: string;
  setSelectedInstrumentFilter?: (filter: string) => void;
  showInstrumentFilterBar?: boolean;
}

export const TeacherLibraryScoreSnippetsTab: React.FC<TeacherLibraryScoreSnippetsTabProps> = ({
  snippets,
  onAssign,
  onEdit,
  onDelete,
  onNewSnippet,
  searchQuery = '',
  selectedInstrumentFilter,
  setSelectedInstrumentFilter,
  showInstrumentFilterBar = true
}) => {
  const [internalInstFilter, setInternalInstFilter] = useState('Alle');
  const currentInstFilter = selectedInstrumentFilter || internalInstFilter;
  const setInstFilter = (filter: string) => {
    setInternalInstFilter(filter);
    if (setSelectedInstrumentFilter) {
      setSelectedInstrumentFilter(filter);
    }
  };

  const [selectedCategory, setSelectedCategory] = useState<string>('Alle');
  const [selectedSubFolder, setSelectedSubFolder] = useState<string>('all');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('all');
  const [playingSnippetId, setPlayingSnippetId] = useState<string | null>(null);
  const [cardInstrumentOverrides, setCardInstrumentOverrides] = useState<Record<string, MicroScoreInstrument>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    try {
      return (localStorage.getItem('teacher_score_snippet_view_mode') as 'grid' | 'list') || 'grid';
    } catch {
      return 'grid';
    }
  });

  const handleSetViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    try {
      localStorage.setItem('teacher_score_snippet_view_mode', mode);
    } catch {}
  };

  const [sortMode, setSortMode] = useState<VdmSortMode>(() => {
    try {
      return (localStorage.getItem('teacher_score_snippet_sort_mode') as VdmSortMode) || 'didactic';
    } catch {
      return 'didactic';
    }
  });

  const handleSetSortMode = (mode: VdmSortMode) => {
    setSortMode(mode);
    try {
      localStorage.setItem('teacher_score_snippet_sort_mode', mode);
    } catch {}
  };

  const synthRef = useRef<MicroScoreAudioSynthesizer | null>(null);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Synthesizer Instanz aufbauen
  useEffect(() => {
    synthRef.current = new MicroScoreAudioSynthesizer();
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      if (synthRef.current) synthRef.current.stopAll();
    };
  }, []);

  const stopPlayback = useCallback(() => {
    setPlayingSnippetId(null);
    if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
    if (synthRef.current) {
      synthRef.current.stopAll();
    }
  }, []);

  const activeTargetInstrument = useMemo(() => {
    return mapFilterToInstrument(currentInstFilter);
  }, [currentInstFilter]);


  const handleAssignSnippet = useCallback((rawSnippet: MicroScoreSnippet, instrumentOverride?: MicroScoreInstrument) => {
    const chosenInst = instrumentOverride || cardInstrumentOverrides[rawSnippet.id] || activeTargetInstrument;
    const targetInst = (chosenInst && chosenInst !== 'universal') ? chosenInst : (rawSnippet.instrument || 'piano');
    const resolved = resolveSnippetForInstrument(rawSnippet, targetInst);
    onAssign(resolved);
  }, [activeTargetInstrument, cardInstrumentOverrides, onAssign]);

  // Quick Playback
  const togglePlaySnippet = useCallback((rawSnippet: MicroScoreSnippet, instrumentOverride?: MicroScoreInstrument) => {
    if (playingSnippetId === rawSnippet.id) {
      stopPlayback();
      return;
    }

    stopPlayback();
    setPlayingSnippetId(rawSnippet.id);

    const chosenInst = instrumentOverride || cardInstrumentOverrides[rawSnippet.id] || mapFilterToInstrument(currentInstFilter);
    const targetInst = (chosenInst && chosenInst !== 'universal')
      ? chosenInst
      : (rawSnippet.instrument === 'drums' || rawSnippet.clef === 'percussion' ? 'drums' : (rawSnippet.instrument || 'piano'));
    const snippet = resolveSnippetForInstrument(rawSnippet, targetInst);

    const synth = synthRef.current || new MicroScoreAudioSynthesizer();
    synthRef.current = synth;
    synth.init();

    const bpm = snippet.tempoBpm || 80;
    const sixteenthMs = Math.round((60000 / bpm) / 4);
    const barsCount = snippet.barsCount || 2;
    const fractionsPerBar = 16;
    let curBar = 0;
    let curFraction = 0;

    playTimerRef.current = setInterval(() => {
      // 1. Metronom Klick
      if (curFraction % 4 === 0) {
        synth.scheduleMetronomeClick(synth.init().currentTime, curFraction === 0);
      }

      // 2. Noten für diesen Takt & diese 16tel-Position
      const notesToPlay = snippet.notes.filter(
        n => n.barIndex === curBar && Math.abs(n.beatFraction - curFraction) < 0.25
      );

      if (notesToPlay.length > 0) {
        notesToPlay.forEach(n => {
          if (n.pitch && n.pitch !== 'REST') {
            const durSec = durationToSeconds(n.duration, bpm, n.isDotted, n.isTriplet);
            const playbackInst: MicroScoreInstrument = (snippet.instrument && snippet.instrument !== 'universal')
              ? snippet.instrument
              : (targetInst !== 'universal' ? targetInst : 'piano');

            synth.scheduleToneAtTime(
              playbackInst,
              n.pitch,
              synth.init().currentTime,
              durSec,
              0.8
            );
          }
        });
      }

      curFraction += 1;
      if (curFraction >= fractionsPerBar) {
        curFraction = 0;
        curBar += 1;
        if (curBar >= barsCount) {
          // Loop beenden
          stopPlayback();
        }
      }
    }, sixteenthMs);
  }, [playingSnippetId, stopPlayback, cardInstrumentOverrides, currentInstFilter]);

  // Filterung mit didaktischer 0,1% Goldstandard Sortier-Engine
  const filteredSnippets = useMemo(() => {
    const q = (searchQuery || '').toLowerCase().trim();
    const result = snippets.filter(snip => {
      const instLabel = INSTRUMENT_COLOR_MAP[snip.instrument]?.label || snip.instrument || 'Allgemein';
      const matchInst = isSnippetMatchingInstrument(snip, currentInstFilter);
      if (!matchInst) return false;

      if (!matchesLevelFilter(snip, selectedLevelFilter)) return false;

      // Kategorie-Filter
      if (selectedCategory !== 'Alle') {
        if (selectedCategory === 'Eigene') {
          const isOwn = isOwnScoreSnippet(snip);
          if (!isOwn) return false;

          if (selectedSubFolder === 'drafts' && snip.taskId) return false;
          if (selectedSubFolder === 'assigned' && !snip.taskId) return false;
        } else {
          if (snip.category !== selectedCategory) {
            return false;
          }
          if (selectedSubFolder !== 'all' && snip.vdmFolder !== selectedSubFolder) {
            return false;
          }
        }
      }

      if (!q) return true;

      return (
        snip.title.toLowerCase().includes(q) ||
        instLabel.toLowerCase().includes(q) ||
        (snip.instrument && snip.instrument.toLowerCase().includes(q)) ||
        (snip.description && snip.description.toLowerCase().includes(q)) ||
        (snip.tags && snip.tags.some(t => t.toLowerCase().includes(q)))
      );
    });

    // 0,1% Goldstandard: VdM Didactic Sort Engine
    return sortScoreSnippets(result, sortMode);
  }, [snippets, searchQuery, currentInstFilter, selectedLevelFilter, selectedCategory, selectedSubFolder, sortMode]);

  // 🏛️ 0,1% Goldstandard: Schnipsel öffnen mit voller Listen-Kontext & Index für Blätter-Navigation
  const handleOpenSnippet = useCallback((rawSnippet: MicroScoreSnippet, instrumentOverride?: MicroScoreInstrument) => {
    const chosenInst = instrumentOverride || cardInstrumentOverrides[rawSnippet.id] || activeTargetInstrument;
    const targetInst = (chosenInst && chosenInst !== 'universal') ? chosenInst : (rawSnippet.instrument || 'piano');
    const resolved = resolveSnippetForInstrument(rawSnippet, targetInst);
    const idx = filteredSnippets.findIndex(s => s.id === rawSnippet.id);
    onEdit(resolved, filteredSnippets, idx >= 0 ? idx : 0);
  }, [activeTargetInstrument, cardInstrumentOverrides, filteredSnippets, onEdit]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
      {/* Action Bar oben: Neuanlage & Zähler */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
            Notenschnipsel-Bibliothek ({filteredSnippets.length})
          </span>
          <span style={{
            fontSize: '0.72rem',
            background: '#f1f5f9',
            color: '#64748b',
            padding: '2px 8px',
            borderRadius: '6px',
            fontWeight: 700
          }}>
            1–4 Takte • UrhG-konform
          </span>

          {/* 0,1% Goldstandard View-Mode Toggle (Kacheln vs. Liste) */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: '#f1f5f9',
            borderRadius: '8px',
            padding: '2px',
            marginLeft: '4px',
            border: '1px solid #e2e8f0'
          }}>
            <button
              type="button"
              onClick={() => handleSetViewMode('grid')}
              title="Kompakt-Kacheln anzeigen"
              aria-label="Kompakt-Kacheln anzeigen"
              style={{
                width: '26px',
                height: '24px',
                border: 'none',
                borderRadius: '6px',
                background: viewMode === 'grid' ? '#ffffff' : 'transparent',
                color: viewMode === 'grid' ? '#0f172a' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <LayoutGrid size={13} />
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode('list')}
              title="Kompakte Listenansicht anzeigen"
              aria-label="Kompakte Listenansicht anzeigen"
              style={{
                width: '26px',
                height: '24px',
                border: 'none',
                borderRadius: '6px',
                background: viewMode === 'list' ? '#ffffff' : 'transparent',
                color: viewMode === 'list' ? '#0f172a' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <List size={14} />
            </button>
          </div>

          {/* 0,1% Goldstandard Sortier-Cockpit (VdM Didactic Sort Engine) */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: '#f1f5f9',
            borderRadius: '8px',
            padding: '2px 8px',
            marginLeft: '4px',
            border: '1px solid #e2e8f0',
            gap: '5px'
          }}>
            <ArrowUpDown size={12} style={{ color: '#64748b' }} aria-hidden="true" />
            <select
              value={sortMode}
              onChange={e => handleSetSortMode(e.target.value as VdmSortMode)}
              title="Didaktische Sortierung der Notenschnipsel"
              aria-label="Didaktische Sortierung der Notenschnipsel"
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#0f172a',
                padding: '2px 0',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {VDM_SORT_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={onNewSnippet}
          style={{
            background: '#4f46e5',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '9px 16px',
            fontSize: '0.82rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: 'none',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'all 0.15s ease'
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Neuen Notenschnipsel anlegen</span>
        </button>
      </div>

      {/* Achse 2 & 3: Instrument-Filter + Ausbildungsstufen-Filter (0,1% Goldstandard) */}
      {showInstrumentFilterBar !== false && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '2px'
          }} className="hide-scrollbar">
            {[
              { id: 'Alle', label: 'Alle Instrumente', icon: null },
              { id: 'Universell', label: 'Universell', icon: Globe },
              { id: 'Klavier', label: 'Klavier', icon: Piano },
              { id: 'Gitarre', label: 'Gitarre', icon: Guitar },
              { id: 'E-Bass', label: 'E-Bass', icon: Guitar },
              { id: 'Schlagzeug', label: 'Schlagzeug', icon: Drum },
              { id: 'Blockflöte', label: 'Blockflöte', icon: Wind },
              { id: 'Bläser', label: 'Bläser', icon: Wind },
              { id: 'Streicher', label: 'Streicher', icon: Activity },
              { id: 'Vokal', label: 'Vokal', icon: Mic }
            ].map(inst => {
              const IconComp = inst.icon;
              const isActive = currentInstFilter.toLowerCase() === inst.id.toLowerCase() ||
                (inst.id === 'Alle' && (!currentInstFilter || currentInstFilter.toLowerCase() === 'all' || currentInstFilter.toLowerCase() === 'alle'));

              return (
                <button
                  key={inst.id}
                  type="button"
                  onClick={() => setInstFilter(inst.id)}
                  style={{
                    background: isActive ? '#0f172a' : '#ffffff',
                    color: isActive ? '#ffffff' : '#475569',
                    border: isActive ? 'none' : '1px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '5px 12px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: isActive ? '0 2px 8px rgba(15, 23, 42, 0.18)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {IconComp && (
                    <IconComp
                      size={13}
                      strokeWidth={2.2}
                      style={{ color: isActive ? '#ffffff' : '#64748b' }}
                    />
                  )}
                  <span>{inst.label}</span>
                </button>
              );
            })}
          </div>

          {/* 3. Achse: Ausbildungsstufen-Filter (Elementar / Grundstufe | Unterstufe | Mittelstufe) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '2px'
          }} className="hide-scrollbar">
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              color: '#64748b',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
              marginRight: '2px'
            }}>
              <Layers size={12} strokeWidth={2.2} />
              <span>Ausbildungsstufe:</span>
            </span>
            {[
              { id: 'all', label: 'Alle Stufen', color: null },
              { id: 'elementar', label: 'Elementar', color: VDM_LEVEL_COLORS[0] },
              { id: 'leicht', label: 'Leicht', color: VDM_LEVEL_COLORS[1] },
              { id: 'mittel', label: 'Mittel', color: VDM_LEVEL_COLORS[2] },
              { id: 'schwer', label: 'Schwer', color: VDM_LEVEL_COLORS[3] }
            ].map(lvl => {
              const isLvlActive = selectedLevelFilter === lvl.id;
              const activeBg = lvl.color ? lvl.color.text : '#334155';
              const inactiveBg = lvl.color ? lvl.color.bg : '#f8fafc';
              const inactiveColor = lvl.color ? lvl.color.text : '#475569';
              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setSelectedLevelFilter(lvl.id)}
                  style={{
                    background: isLvlActive ? activeBg : inactiveBg,
                    color: isLvlActive ? '#ffffff' : inactiveColor,
                    border: 'none',
                    borderRadius: '8px',
                    padding: '3px 10px',
                    fontSize: '0.70rem',
                    fontWeight: isLvlActive ? 800 : 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: isLvlActive ? `0 2px 6px ${activeBg}35` : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {lvl.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Fachbereichs-Rubriken Tabs Bar (0,1% Goldstandard) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        flexWrap: 'wrap',
        paddingBottom: '2px'
      }} className="hide-scrollbar">
        <button
          type="button"
          onClick={() => {
            setSelectedCategory('Alle');
            setSelectedSubFolder('all');
          }}
          style={{
            background: selectedCategory === 'Alle' ? '#0f172a' : '#f1f5f9',
            color: selectedCategory === 'Alle' ? '#ffffff' : '#475569',
            border: selectedCategory === 'Alle' ? 'none' : '1px solid #cbd5e1',
            borderRadius: '10px',
            padding: '6px 14px',
            fontSize: '0.76rem',
            fontWeight: 800,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: selectedCategory === 'Alle' ? '0 3px 12px rgba(15, 23, 42, 0.25)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          Alle ({snippets.filter(s => isSnippetMatchingInstrument(s, currentInstFilter) && matchesLevelFilter(s, selectedLevelFilter)).length})
        </button>

        {VDM_CATEGORIES.map(cat => {
          const isSelected = selectedCategory === cat.id;
          const count = cat.id === 'Eigene'
            ? snippets.filter(s => isOwnScoreSnippet(s) && isSnippetMatchingInstrument(s, currentInstFilter) && matchesLevelFilter(s, selectedLevelFilter)).length
            : snippets.filter(s => s.category === cat.id && isSnippetMatchingInstrument(s, currentInstFilter) && matchesLevelFilter(s, selectedLevelFilter)).length;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.id);
                setSelectedSubFolder('all');
              }}
              style={{
                background: isSelected ? cat.color.activeBg : cat.color.bg,
                color: isSelected ? cat.color.activeText : cat.color.text,
                border: isSelected ? 'none' : `1px solid ${cat.color.border}`,
                borderRadius: '10px',
                padding: '6px 12px',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                boxShadow: isSelected ? cat.color.shadow : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {cat.id === 'Eigene' && (
                <Sparkles size={13} style={{ color: isSelected ? '#ffffff' : cat.color.text }} />
              )}
              <span>{cat.name}</span>
              <span style={{
                fontSize: '0.68rem',
                background: isSelected ? 'rgba(255,255,255,0.25)' : cat.color.badgeBg,
                color: isSelected ? '#ffffff' : cat.color.badgeText,
                padding: '1px 6px',
                borderRadius: '6px',
                fontWeight: 800
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sub-Ordner Pills Bar (falls Kategorie ausgewählt) */}
      {selectedCategory !== 'Alle' && (() => {
        const catObj = VDM_CATEGORIES.find(c => c.id === selectedCategory);
        if (!catObj) return null;
        return (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap',
            paddingBottom: '2px'
          }} className="hide-scrollbar">
            {catObj.subFolders.map(sub => {
              const isSubActive = selectedSubFolder === sub.id;
              const subCount = snippets.filter(s => {
                if (!matchesLevelFilter(s, selectedLevelFilter)) return false;
                if (catObj.id === 'Eigene') {
                  if (!isOwnScoreSnippet(s)) return false;
                  if (sub.id === 'drafts' && s.taskId) return false;
                  if (sub.id === 'assigned' && !s.taskId) return false;
                  return isSnippetMatchingInstrument(s, currentInstFilter);
                }
                if (s.category !== catObj.id) return false;
                if (sub.id !== 'all' && s.vdmFolder !== sub.id) return false;
                return isSnippetMatchingInstrument(s, currentInstFilter);
              }).length;

              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelectedSubFolder(sub.id)}
                  style={{
                    background: isSubActive ? catObj.color.activeBg : '#ffffff',
                    color: isSubActive ? '#ffffff' : '#64748b',
                    border: isSubActive ? 'none' : '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap',
                    boxShadow: isSubActive ? catObj.color.shadow : 'none',
                    transition: 'all 0.15s ease'
                  }}
                  title={sub.description}
                >
                  <span>{sub.label}</span>
                  <span style={{
                    fontSize: '0.66rem',
                    opacity: 0.85
                  }}>
                    ({subCount})
                  </span>
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* Grid der Schnipsel-Karten */}
      {filteredSnippets.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 20px',
          background: '#f8fafc',
          borderRadius: '18px',
          border: '1.5px dashed #cbd5e1'
        }}>
          {selectedCategory === 'Eigene' ? (
            <>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: '#fdf4ff',
                color: '#9333ea',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px',
                boxShadow: 'none'
              }}>
                <Sparkles size={28} />
              </div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                Noch keine eigenen Notenschnipsel vorhanden
              </h4>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: '#64748b', maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
                Komponiere oder speichere deinen ersten individuellen Notenschnipsel (1–4 Takte). Sobald du ihn speicherst, wird er hier dauerhaft und revisionssicher für deinen Unterricht abgelegt.
              </p>
            </>
          ) : (
            <>
              <Music size={36} color="#94a3b8" style={{ marginBottom: '10px' }} />
              <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                Keine Notenschnipsel gefunden
              </h4>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: '#64748b', maxWidth: '380px', marginLeft: 'auto', marginRight: 'auto' }}>
                {snippets.length > 0
                  ? 'Für die gewählte Filter-Kombination wurden keine Einträge gefunden.'
                  : 'Lege jetzt deinen ersten Notenschnipsel (1–4 Takte) an, um ihn deinen Schülern als interaktive Wochen-Hausaufgabe zuzuweisen.'}
              </p>
            </>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onNewSnippet}
              style={{
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 16px',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={14} />
              <span>Jetzt Notenschnipsel anlegen</span>
            </button>

            {/* Filter zurücksetzen Button */}
            {(currentInstFilter !== 'Alle' || selectedLevelFilter !== 'all' || selectedCategory !== 'Alle' || selectedSubFolder !== 'all' || (searchQuery && searchQuery.trim())) && (
              <button
                type="button"
                onClick={() => {
                  setInstFilter('Alle');
                  setSelectedLevelFilter('all');
                  setSelectedCategory('Alle');
                  setSelectedSubFolder('all');
                }}
                style={{
                  background: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '8px 16px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>Filter zurücksetzen</span>
              </button>
            )}
          </div>
        </div>
      ) : (() => {
        const renderSnippetCollection = (items: MicroScoreSnippet[]) => (
          <div style={viewMode === 'list' ? {
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          } : {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 330px), 1fr))',
            gap: '12px',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}>
            {items.map(snippet => {
              const isPlaying = playingSnippetId === snippet.id;
              const catMeta = getSnippetCategoryMeta(snippet);
              const activeCardInst: MicroScoreInstrument = cardInstrumentOverrides[snippet.id] ||
                (currentInstFilter && currentInstFilter !== 'Alle' && currentInstFilter !== 'Universell'
                  ? mapFilterToInstrument(currentInstFilter)
                  : (snippet.instrument || 'piano'));
              const resolvedForCard = resolveSnippetForInstrument(snippet, activeCardInst);
              const instMeta = INSTRUMENT_COLOR_MAP[activeCardInst] || {
                bg: '#f1f5f9',
                text: '#475569',
                label: INSTRUMENT_OPTIONS.find(o => o.value === activeCardInst)?.label || activeCardInst,
                border: 'transparent'
              };
              const isOwn = isOwnScoreSnippet(snippet);
              const levelMeta = getVdmLevelColor(snippet.vdmLevel);

              // ==========================================
              // MODELL B: 0,1% Goldstandard Listen-Ansicht
              // ==========================================
              if (viewMode === 'list') {
                return (
                  <TeacherScoreSnippetListRow
                    key={snippet.id}
                    snippet={snippet}
                    resolvedForCard={resolvedForCard}
                    activeCardInst={activeCardInst}
                    isPlaying={isPlaying}
                    catMeta={catMeta}
                    isOwn={isOwn}
                    onOpenSnippet={handleOpenSnippet}
                    onTogglePlay={togglePlaySnippet}
                    onSelectInstrument={(id, nextInst) =>
                      setCardInstrumentOverrides(prev => ({ ...prev, [id]: nextInst }))
                    }
                    onAssign={handleAssignSnippet}
                    onDelete={onDelete}
                  />
                );
              }

              // ==========================================
              // MODELL A: 0,1% Goldstandard Kompakt-Kachel
              // ==========================================
              return (
                <div
                  key={snippet.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenSnippet(snippet, activeCardInst)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleOpenSnippet(snippet, activeCardInst);
                    } else if (e.code === 'Space' || e.key === ' ') {
                      e.preventDefault();
                      togglePlaySnippet(snippet, activeCardInst);
                    }
                  }}
                  style={{
                    background: '#ffffff',
                    border: isPlaying ? `1.5px solid ${catMeta.color.activeBg}` : '1px solid #e2e8f0',
                    borderLeft: `3.5px solid ${catMeta.color.activeBg}`,
                    borderRadius: '14px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    boxShadow: isPlaying ? `0 6px 20px ${catMeta.color.activeBg}25` : '0 1px 3px rgba(0,0,0,0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                    outline: 'none',
                    position: 'relative',
                    minWidth: 0,
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={e => {
                    if (!isPlaying) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.borderLeftColor = catMeta.color.activeBg;
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isPlaying) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.borderLeftColor = catMeta.color.activeBg;
                    }
                  }}
                >
                  {/* 1. Header: Kategorie-Badge + Stufe + Metadaten inline + Admin-Aktionen */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flexWrap: 'wrap' }}>
                      {/* Kategorie-Pill: Soft-Tinted (Apple 2-Farben-Doktrin, border: none) */}
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        background: catMeta.color.bg,
                        color: catMeta.color.text,
                        padding: '2px 7px',
                        borderRadius: '6px',
                        border: 'none',
                        whiteSpace: 'nowrap'
                      }}>
                        {catMeta.name}
                      </span>

                      {!isOwn && (
                        <span style={{
                          fontSize: '0.64rem',
                          fontWeight: 800,
                          background: levelMeta.bg,
                          color: levelMeta.text,
                          padding: '2px 7px',
                          borderRadius: '5px',
                          border: 'none',
                          whiteSpace: 'nowrap'
                        }}>
                          {levelMeta.shortLabel}
                        </span>
                      )}

                      {/* Metadaten: Interaktiver Instrumenten-Selektor (Alle 13 Instrumente wählbar) + Takt + BPM */}
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          position: 'relative',
                          flexShrink: 0
                        }}
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => e.stopPropagation()}
                      >
                        <select
                          value={activeCardInst}
                          onChange={e => {
                            e.stopPropagation();
                            const nextInst = e.target.value as MicroScoreInstrument;
                            setCardInstrumentOverrides(prev => ({
                              ...prev,
                              [snippet.id]: nextInst
                            }));
                          }}
                          aria-label={`Instrument für ${snippet.title} wählen`}
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            color: '#334155',
                            background: '#f1f5f9',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '2px 18px 2px 7px',
                            cursor: 'pointer',
                            outline: 'none',
                            appearance: 'none',
                            WebkitAppearance: 'none'
                          }}
                        >
                          {INSTRUMENT_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={11}
                          style={{
                            position: 'absolute',
                            right: '5px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none',
                            color: '#64748b'
                          }}
                        />
                      </div>

                      <span style={{
                        fontSize: '0.68rem',
                        color: '#64748b',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                      }}>
                        • {resolvedForCard.barsCount || 2}T • {resolvedForCard.tempoBpm || 80} BPM
                      </span>
                    </div>

                  {/* Admin-Aktionen nur bei eigenen Schnipseln */}
                  {isOwn && (
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}
                      onClick={e => e.stopPropagation()}
                      onKeyDown={e => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleOpenSnippet(snippet, activeCardInst);
                        }}
                        title="Schnipsel bearbeiten"
                        aria-label="Schnipsel bearbeiten"
                        style={{
                          width: '26px',
                          height: '26px',
                          background: 'transparent',
                          border: 'none',
                          color: '#64748b',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = '#f1f5f9';
                          e.currentTarget.style.color = '#0f172a';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#64748b';
                        }}
                      >
                        <Edit2 size={12} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onDelete(snippet.id);
                        }}
                        title="Schnipsel löschen"
                        aria-label="Schnipsel löschen"
                        style={{
                          width: '26px',
                          height: '26px',
                          background: 'transparent',
                          border: 'none',
                          color: '#94a3b8',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = '#fef2f2';
                          e.currentTarget.style.color = '#dc2626';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#94a3b8';
                        }}
                      >
                        <Trash2 size={12} strokeWidth={2} />
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Titel mit 2-Zeilen-Umbruch (kein vorschnelles ... Truncation) */}
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      lineHeight: 1.3,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      minHeight: '2.4em'
                    }}
                  >
                    {resolvedForCard.title || snippet.title}
                  </h3>
                </div>

                {/* 3. 🏛️ Minimalistische Notenminiatur (MicroScoreCalmThumbnail in Kategorie-Farbe) */}
                <div style={{ marginTop: '4px', marginBottom: '4px' }}>
                  <MicroScoreCalmThumbnail
                    snippet={resolvedForCard}
                    accentColor={catMeta.color.activeBg}
                    height={44}
                    isPlaying={isPlaying}
                  />
                </div>

                {/* 4. Beruhigtes Action-Dock: Vorhören + Zuweisen (Nur 2 Aktionen) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    marginTop: '2px'
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  {/* 1. Vorhören Quick-Action */}
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      togglePlaySnippet(snippet, activeCardInst);
                    }}
                    title={isPlaying ? 'Audio stoppen' : 'Audio direkt vorhören'}
                    aria-label={isPlaying ? 'Audio stoppen' : 'Audio direkt vorhören'}
                    style={{
                      height: '30px',
                      padding: '0 10px',
                      background: isPlaying ? catMeta.color.activeBg : '#f8fafc',
                      color: isPlaying ? '#ffffff' : '#475569',
                      border: isPlaying ? 'none' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      flexShrink: 0,
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      boxShadow: isPlaying ? `0 2px 8px ${catMeta.color.activeBg}40` : 'none',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => {
                      if (!isPlaying) {
                        e.currentTarget.style.background = '#f1f5f9';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.color = '#0f172a';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isPlaying) {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.color = '#475569';
                      }
                    }}
                  >
                    {isPlaying ? (
                      <>
                        <Square size={11} fill="#ffffff" strokeWidth={1} />
                        <span>Stopp</span>
                      </>
                    ) : (
                      <>
                        <Volume2 size={13} strokeWidth={2.2} />
                        <span>Vorhören</span>
                      </>
                    )}
                  </button>

                  {/* 2. Zuweisen CTA (Soft-Tinted in Kategorie-Farbe, border: none) */}
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleAssignSnippet(snippet, activeCardInst);
                    }}
                    title="Als Hausaufgabe an Schüler zuweisen"
                    aria-label="Als Hausaufgabe zuweisen"
                    style={{
                      height: '30px',
                      background: catMeta.color.bg,
                      color: catMeta.color.text,
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0 12px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = catMeta.color.badgeBg;
                      e.currentTarget.style.color = catMeta.color.badgeText;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = catMeta.color.bg;
                      e.currentTarget.style.color = catMeta.color.text;
                    }}
                  >
                    <Share2 size={12} strokeWidth={2.2} />
                    <span>Zuweisen</span>
                  </button>
                </div>
              </div>
            );
          })}
          </div>
        );

        const activeCatObj = selectedCategory !== 'Alle' && selectedCategory !== 'Eigene'
          ? VDM_CATEGORIES.find(c => c.id === selectedCategory)
          : null;

        if (activeCatObj && selectedSubFolder === 'all' && !(searchQuery && searchQuery.trim())) {
          const realSubFolders = activeCatObj.subFolders.filter(sf => sf.id !== 'all');
          const assignedIds = new Set<string>();
          const sections = realSubFolders.map(sf => {
            const items = filteredSnippets.filter(s => s.vdmFolder === sf.id);
            items.forEach(s => assignedIds.add(s.id));
            return { sf, items };
          }).filter(sec => sec.items.length > 0);

          const unassignedItems = filteredSnippets.filter(s => !assignedIds.has(s.id));

          if (sections.length > 0) {
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {sections.map(({ sf, items }) => (
                  <div key={sf.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      padding: '6px 12px',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      borderLeft: `3px solid ${activeCatObj.color.activeBg}`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <FolderOpen size={14} strokeWidth={2.2} style={{ color: activeCatObj.color.text }} />
                        <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#0f172a' }}>
                          {sf.label}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                          — {sf.description}
                        </span>
                      </div>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        background: activeCatObj.color.bg,
                        color: activeCatObj.color.text,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        border: 'none',
                        whiteSpace: 'nowrap'
                      }}>
                        {items.length} {items.length === 1 ? 'Übung' : 'Übungen'}
                      </span>
                    </div>
                    {renderSnippetCollection(items)}
                  </div>
                ))}
                {unassignedItems.length > 0 && renderSnippetCollection(unassignedItems)}
              </div>
            );
          }
        }

        return renderSnippetCollection(filteredSnippets);
      })()}
    </div>
  );
};
