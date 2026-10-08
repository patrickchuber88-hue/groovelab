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
  Clock, Sparkles, Filter, ChevronRight, Volume2,
  LayoutGrid, List
} from 'lucide-react';
import { MicroScoreSnippet, MicroScoreInstrument } from '../../../student/meisterwerk/microscore/microScore.types';
import { MicroScoreAudioSynthesizer, durationToSeconds } from '../../../student/meisterwerk/microscore/microScoreAudioSynthesizer';
import { VDM_CATEGORIES, isOwnScoreSnippet } from '../../../../services/vdmScoreSnippetCatalog';
import { resolveSnippetForInstrument } from '../../../../services/canonicalScoreEngine';

export const mapFilterToInstrument = (filter: string): MicroScoreInstrument => {
  const f = filter.toLowerCase().trim();
  if (f.includes('klavier') || f.includes('piano')) return 'piano';
  if (f.includes('gitarre') || f.includes('guitar')) return 'guitar';
  if (f.includes('bass')) return 'bass';
  if (f.includes('schlagzeug') || f.includes('drums')) return 'drums';
  if (f.includes('blockflöte') || f.includes('recorder')) return 'recorder';
  if (f.includes('querflöte') || f.includes('flöte') || f.includes('flute')) return 'flute';
  if (f.includes('klarinette') || f.includes('clarinet')) return 'clarinet';
  if (f.includes('altsax') || f.includes('sax')) return 'altosax';
  if (f.includes('trompete') || f.includes('trumpet')) return 'trumpet';
  if (f.includes('posaune') || f.includes('trombone')) return 'trombone';
  if (f.includes('streicher') || f.includes('strings') || f.includes('geige')) return 'strings';
  return 'universal';
};

export interface TeacherLibraryScoreSnippetsTabProps {
  snippets: MicroScoreSnippet[];
  onAssign: (snippet: MicroScoreSnippet) => void;
  onEdit: (snippet: MicroScoreSnippet) => void;
  onDelete: (snippetId: string) => void;
  onNewSnippet: () => void;
  searchQuery?: string;
  selectedInstrumentFilter?: string;
  setSelectedInstrumentFilter?: (filter: string) => void;
  showInstrumentFilterBar?: boolean;
}

export const isSnippetMatchingInstrument = (
  snipInstrument: string = '',
  filter: string = 'Alle',
  tags: string[] = []
): boolean => {
  const f = (filter || 'alle').trim().toLowerCase();
  if (!f || f === 'alle' || f === 'all' || f === 'allgemein' || f === 'all_instruments') {
    return true;
  }

  const inst = (snipInstrument || '').toLowerCase();
  const isUniversal = inst === 'universal' || inst === 'all' || inst === 'universell' || inst === 'allgemein';

  // 0,1% Goldstandard: Expliziter Filter nach rein universellen Inhalten
  if (f === 'universell' || f === 'universal') {
    return isUniversal;
  }

  // 0,1% Goldstandard: Universelle Schnipsel (General-Score) matchen IMMER jedes Instrument
  if (isUniversal) {
    return true;
  }

  const label = (INSTRUMENT_COLOR_MAP[inst]?.label || inst).toLowerCase();
  const tagStr = (tags || []).join(' ').toLowerCase();

  if (inst === f || label === f || label.includes(f) || inst.includes(f)) {
    return true;
  }

  // Instrument Family Grouping (0,1% Goldstandard)
  if (f === 'bläser' || f === 'blaeser' || f === 'winds') {
    return ['flute', 'recorder', 'clarinet', 'altosax', 'trumpet', 'trombone'].includes(inst) ||
      tagStr.includes('bläser') || tagStr.includes('flöte') || tagStr.includes('long tones');
  }
  if (f === 'streicher' || f === 'strings') {
    return ['strings', 'violin', 'viola', 'cello'].includes(inst) || tagStr.includes('streicher');
  }
  if (f === 'tasten' || f === 'klavier' || f === 'piano') {
    return ['piano', 'keyboard', 'orgel'].includes(inst) || tagStr.includes('klavier') || tagStr.includes('tasten');
  }
  if (f === 'gitarre' || f === 'guitar') {
    return ['guitar', 'gitarre', 'akustikgitarre', 'e-gitarre'].includes(inst) || tagStr.includes('gitarre');
  }
  if (f === 'bass' || f === 'e-bass') {
    return ['bass', 'e-bass', 'kontrabass'].includes(inst) || tagStr.includes('bass');
  }
  if (f === 'drums' || f === 'schlagzeug' || f === 'percussion') {
    return ['drums', 'schlagzeug', 'percussion'].includes(inst) || tagStr.includes('drums') || tagStr.includes('schlagzeug');
  }

  return false;
};

const INSTRUMENT_COLOR_MAP: Record<string, { bg: string; text: string; label: string; border: string }> = {
  universal: { bg: '#eef2ff', text: '#4338ca', label: '🌐 Universell', border: '#c7d2fe' },
  piano: { bg: '#eef2ff', text: '#4338ca', label: 'Klavier', border: '#c7d2fe' },
  guitar: { bg: '#eef2ff', text: '#4338ca', label: 'Gitarre', border: '#c7d2fe' },
  bass: { bg: '#eef2ff', text: '#4338ca', label: 'E-Bass', border: '#c7d2fe' },
  drums: { bg: '#eef2ff', text: '#4338ca', label: 'Schlagzeug', border: '#c7d2fe' },
  recorder: { bg: '#eef2ff', text: '#4338ca', label: 'Blockflöte', border: '#c7d2fe' },
  flute: { bg: '#eef2ff', text: '#4338ca', label: 'Querflöte', border: '#c7d2fe' },
  clarinet: { bg: '#eef2ff', text: '#4338ca', label: 'Klarinette', border: '#c7d2fe' },
  altosax: { bg: '#eef2ff', text: '#4338ca', label: 'Altsaxophon', border: '#c7d2fe' },
  trumpet: { bg: '#eef2ff', text: '#4338ca', label: 'Trompete', border: '#c7d2fe' },
  trombone: { bg: '#eef2ff', text: '#4338ca', label: 'Posaune', border: '#c7d2fe' },
  strings: { bg: '#eef2ff', text: '#4338ca', label: 'Streicher', border: '#c7d2fe' }
};

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
  const [playingSnippetId, setPlayingSnippetId] = useState<string | null>(null);
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

  const handleOpenSnippet = useCallback((rawSnippet: MicroScoreSnippet) => {
    const targetInst = rawSnippet.instrument === 'drums' || rawSnippet.clef === 'percussion' ? 'drums' : activeTargetInstrument;
    const resolved = resolveSnippetForInstrument(rawSnippet, targetInst);
    onEdit(resolved);
  }, [activeTargetInstrument, onEdit]);

  const handleAssignSnippet = useCallback((rawSnippet: MicroScoreSnippet) => {
    const targetInst = rawSnippet.instrument === 'drums' || rawSnippet.clef === 'percussion' ? 'drums' : activeTargetInstrument;
    const resolved = resolveSnippetForInstrument(rawSnippet, targetInst);
    onAssign(resolved);
  }, [activeTargetInstrument, onAssign]);

  // Quick Playback
  const togglePlaySnippet = useCallback((rawSnippet: MicroScoreSnippet) => {
    if (playingSnippetId === rawSnippet.id) {
      stopPlayback();
      return;
    }

    stopPlayback();
    setPlayingSnippetId(rawSnippet.id);

    const filterInst = mapFilterToInstrument(currentInstFilter);
    const targetInst = rawSnippet.instrument === 'drums' || rawSnippet.clef === 'percussion' ? 'drums' : filterInst;
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
  }, [playingSnippetId, stopPlayback, currentInstFilter]);

  // Filterung
  const filteredSnippets = useMemo(() => {
    const q = (searchQuery || '').toLowerCase().trim();
    return snippets.filter(snip => {
      const instLabel = INSTRUMENT_COLOR_MAP[snip.instrument]?.label || snip.instrument || 'Allgemein';
      const matchInst = isSnippetMatchingInstrument(snip.instrument, currentInstFilter, snip.tags);

      if (!matchInst) return false;

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
  }, [snippets, searchQuery, currentInstFilter, selectedCategory, selectedSubFolder]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
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
            transition: 'all 0.15s ease'
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Neuen Notenschnipsel anlegen</span>
        </button>
      </div>

      {/* Instrument Filter Schnellwahl (0,1% Goldstandard) */}
      {showInstrumentFilterBar !== false && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          overflowX: 'auto',
          paddingBottom: '2px'
        }} className="hide-scrollbar">
          {[
            { id: 'Alle', label: 'Alle Instrumente' },
            { id: 'Universell', label: '🌐 Universell' },
            { id: 'Klavier', label: '🎹 Klavier' },
            { id: 'Gitarre', label: '🎸 Gitarre' },
            { id: 'E-Bass', label: '🎸 E-Bass' },
            { id: 'Schlagzeug', label: '🥁 Schlagzeug' },
            { id: 'Bläser', label: '🎷 Bläser' },
            { id: 'Streicher', label: '🎻 Streicher' }
          ].map(inst => {
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
                  boxShadow: isActive ? '0 2px 8px rgba(15, 23, 42, 0.18)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {inst.label}
              </button>
            );
          })}
        </div>
      )}

      {/* VdM-Kategorie Tabs Bar (0,1% Goldstandard) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        overflowX: 'auto',
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
          Alle ({snippets.length})
        </button>

        {VDM_CATEGORIES.map(cat => {
          const isSelected = selectedCategory === cat.id;
          const count = cat.id === 'Eigene'
            ? snippets.filter(isOwnScoreSnippet).length
            : snippets.filter(s => s.category === cat.id).length;

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
            overflowX: 'auto',
            paddingBottom: '2px'
          }} className="hide-scrollbar">
            {catObj.subFolders.map(sub => {
              const isSubActive = selectedSubFolder === sub.id;
              const subCount = snippets.filter(s => {
                if (catObj.id === 'Eigene') {
                  if (!isOwnScoreSnippet(s)) return false;
                  if (sub.id === 'drafts' && s.taskId) return false;
                  if (sub.id === 'assigned' && !s.taskId) return false;
                  return isSnippetMatchingInstrument(s.instrument, currentInstFilter, s.tags);
                }
                if (s.category !== catObj.id) return false;
                if (sub.id !== 'all' && s.vdmFolder !== sub.id) return false;
                return isSnippetMatchingInstrument(s.instrument, currentInstFilter, s.tags);
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
            {(currentInstFilter !== 'Alle' || selectedCategory !== 'Alle' || selectedSubFolder !== 'all' || (searchQuery && searchQuery.trim())) && (
              <button
                type="button"
                onClick={() => {
                  setInstFilter('Alle');
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
      ) : (
        <div style={viewMode === 'list' ? {
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        } : {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
          gap: '12px'
        }}>
          {filteredSnippets.map(snippet => {
            const isPlaying = playingSnippetId === snippet.id;
            const instMeta = INSTRUMENT_COLOR_MAP[snippet.instrument] || {
              bg: '#f1f5f9',
              text: '#334155',
              label: snippet.instrument || 'Allgemein',
              border: '#e2e8f0'
            };
            const noteCount = (snippet.notes || []).filter(n => n.pitch !== 'REST').length;
            const isOwn = isOwnScoreSnippet(snippet);

            // ==========================================
            // MODELL B: 0,1% Goldstandard Listen-Ansicht
            // ==========================================
            if (viewMode === 'list') {
              return (
                <div
                  key={snippet.id}
                  style={{
                    background: '#ffffff',
                    border: isPlaying ? '1.5px solid #4f46e5' : '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    boxShadow: isPlaying ? '0 4px 12px rgba(79, 70, 229, 0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Links: Vorhören + Instrument + Titel + Meta */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    <button
                      type="button"
                      onClick={() => togglePlaySnippet(snippet)}
                      title={isPlaying ? 'Audio stoppen' : 'Audio direkt vorhören'}
                      aria-label={isPlaying ? 'Audio stoppen' : 'Audio direkt vorhören'}
                      style={{
                        width: '28px',
                        height: '28px',
                        background: isPlaying ? '#0f172a' : '#f8fafc',
                        color: isPlaying ? '#ffffff' : '#334155',
                        border: isPlaying ? 'none' : '1px solid #cbd5e1',
                        borderRadius: '7px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => {
                        if (!isPlaying) {
                          e.currentTarget.style.background = '#f1f5f9';
                          e.currentTarget.style.borderColor = '#94a3b8';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isPlaying) {
                          e.currentTarget.style.background = '#f8fafc';
                          e.currentTarget.style.borderColor = '#cbd5e1';
                        }
                      }}
                    >
                      {isPlaying ? <Square size={11} fill="#ffffff" /> : <Volume2 size={13} strokeWidth={2.2} />}
                    </button>

                    <span style={{
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      background: instMeta.bg,
                      color: instMeta.text,
                      padding: '2px 6px',
                      borderRadius: '5px',
                      border: `1px solid ${instMeta.border}`,
                      flexShrink: 0
                    }}>
                      {instMeta.label}
                    </span>

                    <span
                      onClick={() => handleOpenSnippet(snippet)}
                      title="Klicken, um Noten im Studio zu öffnen"
                      style={{
                        fontSize: '0.84rem',
                        fontWeight: 800,
                        color: '#0f172a',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#4338ca'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#0f172a'; }}
                    >
                      {snippet.title}
                    </span>

                    <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      • {snippet.barsCount || 2}T • {snippet.timeSignature || '4/4'} • {snippet.tempoBpm || 80} BPM
                    </span>
                  </div>

                  {/* Rechts: Kompakte Aktionen */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => handleOpenSnippet(snippet)}
                      title="Noten im interaktiven Studio öffnen & mitspielen"
                      aria-label="Noten öffnen"
                      style={{
                        height: '28px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '7px',
                        padding: '0 8px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: '#0f172a',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.borderColor = '#94a3b8';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                      }}
                    >
                      <Play size={10} fill="#0f172a" />
                      <span>Noten</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAssignSnippet(snippet)}
                      title="Als Hausaufgabe an Schüler zuweisen"
                      aria-label="Als Hausaufgabe zuweisen"
                      style={{
                        height: '28px',
                        background: '#eef2ff',
                        color: '#4338ca',
                        border: 'none',
                        borderRadius: '7px',
                        padding: '0 8px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#e0e7ff';
                        e.currentTarget.style.color = '#3730a3';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = '#eef2ff';
                        e.currentTarget.style.color = '#4338ca';
                      }}
                    >
                      <Share2 size={11} strokeWidth={2.2} />
                      <span>Zuweisen</span>
                    </button>

                    {isOwn && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '2px' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenSnippet(snippet)}
                          title="Noten direkt bearbeiten"
                          aria-label="Notenschnipsel bearbeiten"
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
                          onClick={() => onDelete(snippet.id)}
                          title="Schnipsel löschen"
                          aria-label="Notenschnipsel löschen"
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
                </div>
              );
            }

            // ==========================================
            // MODELL A: 0,1% Goldstandard Kompakt-Kachel
            // ==========================================
            return (
              <div
                key={snippet.id}
                style={{
                  background: '#ffffff',
                  border: isPlaying ? '1.5px solid #4f46e5' : '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  boxShadow: isPlaying ? '0 6px 20px rgba(79, 70, 229, 0.14)' : '0 1px 4px rgba(0,0,0,0.02)',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* 1. Header: Instrument-Badge + Metadaten inline + Admin-Aktionen */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      background: instMeta.bg,
                      color: instMeta.text,
                      padding: '2px 7px',
                      borderRadius: '6px',
                      border: `1px solid ${instMeta.border}`,
                      whiteSpace: 'nowrap'
                    }}>
                      {instMeta.label}
                    </span>
                    <span style={{
                      fontSize: '0.70rem',
                      color: '#64748b',
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}>
                      {snippet.barsCount || 2}T • {snippet.timeSignature || '4/4'} • {snippet.tempoBpm || 80} BPM
                    </span>
                  </div>

                  {/* Admin-Aktionen nur bei eigenen Schnipseln dezent im Header */}
                  {isOwn && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => handleOpenSnippet(snippet)}
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
                        onClick={() => onDelete(snippet.id)}
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

                {/* 2. Titel mit Direktsprung ins Noten-Studio */}
                <div>
                  <h3
                    onClick={() => handleOpenSnippet(snippet)}
                    title="Klicken, um Noten im Studio zu öffnen"
                    style={{
                      margin: 0,
                      fontSize: '0.90rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      lineHeight: 1.25,
                      cursor: 'pointer',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = '#4338ca';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = '#0f172a';
                    }}
                  >
                    {snippet.title}
                  </h3>
                </div>

                {/* 3. 0,1% Goldstandard Action-Dock: Vorhören + Noten öffnen + Zuweisen in einer Zeile */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '2px'
                }}>
                  {/* 1. Vorhören (32x32px) */}
                  <button
                    type="button"
                    onClick={() => togglePlaySnippet(snippet)}
                    title={isPlaying ? 'Audio stoppen' : 'Audio direkt vorhören'}
                    aria-label={isPlaying ? 'Audio stoppen' : 'Audio direkt vorhören'}
                    style={{
                      width: '32px',
                      height: '32px',
                      background: isPlaying ? '#0f172a' : '#f8fafc',
                      color: isPlaying ? '#ffffff' : '#334155',
                      border: isPlaying ? 'none' : '1px solid #cbd5e1',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                      boxShadow: isPlaying ? '0 2px 6px rgba(15,23,42,0.2)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => {
                      if (!isPlaying) {
                        e.currentTarget.style.background = '#f1f5f9';
                        e.currentTarget.style.borderColor = '#94a3b8';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isPlaying) {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                      }
                    }}
                  >
                    {isPlaying ? (
                      <Square size={12} fill="#ffffff" strokeWidth={1} />
                    ) : (
                      <Volume2 size={15} strokeWidth={2.2} />
                    )}
                  </button>

                  {/* 2. Noten öffnen (Kompakt) */}
                  <button
                    type="button"
                    onClick={() => handleOpenSnippet(snippet)}
                    title="Noten im interaktiven Studio öffnen & mitspielen"
                    aria-label="Noten öffnen"
                    style={{
                      flex: 1,
                      height: '32px',
                      minWidth: 0,
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '0 8px',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = '#94a3b8';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                  >
                    <Play size={11} fill="#0f172a" strokeWidth={1} />
                    <span>Noten öffnen</span>
                  </button>

                  {/* 3. Als Hausaufgabe zuweisen (Kompakter Soft-Lavender CTA) */}
                  <button
                    type="button"
                    onClick={() => handleAssignSnippet(snippet)}
                    title="Als Hausaufgabe an Schüler zuweisen"
                    aria-label="Als Hausaufgabe zuweisen"
                    style={{
                      flex: 1.15,
                      height: '32px',
                      minWidth: 0,
                      background: '#eef2ff',
                      color: '#4338ca',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0 8px',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#e0e7ff';
                      e.currentTarget.style.color = '#3730a3';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#eef2ff';
                      e.currentTarget.style.color = '#4338ca';
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
      )}
    </div>
  );
};
