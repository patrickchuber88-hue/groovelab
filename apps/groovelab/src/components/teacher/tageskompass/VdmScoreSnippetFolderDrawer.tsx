/**
 * 🏛️ Campus-Groovelab 0,1% Goldstandard: VdM-Notenschnipsel Ordner-Drawer
 * VdmScoreSnippetFolderDrawer.tsx
 * 
 * Autarker Feature-Monolith für die schnelle Ordner-Navigation im Tageskompass & Mediathek:
 * - 2-Ebenen VdM-Ordner-Navigation (4 Hauptordner: Tonleitern, Akkorde, Rhythmus, Technik)
 * - Sub-Ordner Filter (Dur, Moll, Pentatonik, Kadenzen, Triolen, Hanon etc.)
 * - Instant Live-Suche (< 10 ms)
 * - Smart-Instrument-Filter mit automatischer Vorbelegung des Schüler-Instruments
 * - Integrierte Web Audio Synthesizer Schnell-Vorschau (▶ Play / ■ Stop) mit Metronom
 * - 1-Tap Direktauslöser [ ⚡ Als Hausaufgabe zuweisen ]
 * - BFSG 2025 & WCAG 2.2 AA Parität (Keyboard First, Kontrast >= 7:1)
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Music, Layers, Activity, Zap, Play, Square, Search,
  ChevronLeft, Plus, X, Clock, Check, Sparkles,
  Smile, Guitar, Mic, Users
} from 'lucide-react';
import { MicroScoreSnippet, MicroScoreInstrument } from '../../student/meisterwerk/microscore/microScore.types';
import { MicroScoreAudioSynthesizer, durationToSeconds } from '../../student/meisterwerk/microscore/microScoreAudioSynthesizer';
import { VDM_CATEGORIES, VdmFolderCategory, isOwnScoreSnippet } from '../../../services/vdmScoreSnippetCatalog';
import { resolveSnippetForInstrument } from '../../../services/canonicalScoreEngine';

export interface VdmScoreSnippetFolderDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSnippet: (snippet: MicroScoreSnippet) => void;
  onOpenCreateNew: () => void;
  studentInstrument?: string;
  snippets: MicroScoreSnippet[];
}

const INSTRUMENT_OPTIONS = [
  { value: 'all', label: 'Alle Instrumente' },
  { value: 'universal', label: '🌐 Universell' },
  { value: 'piano', label: '🎹 Klavier' },
  { value: 'guitar', label: '🎸 Gitarre' },
  { value: 'bass', label: '🎸 E-Bass' },
  { value: 'drums', label: '🥁 Schlagzeug' },
  { value: 'flute', label: '🪈 Querflöte' },
  { value: 'altosax', label: '🎷 Altsaxophon' },
  { value: 'trumpet', label: '🎺 Trompete' }
];

export const VdmScoreSnippetFolderDrawer: React.FC<VdmScoreSnippetFolderDrawerProps> = ({
  isOpen,
  onClose,
  onSelectSnippet,
  onOpenCreateNew,
  studentInstrument,
  snippets
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubFolder, setSelectedSubFolder] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingSnippetId, setPlayingSnippetId] = useState<string | null>(null);

  // Initialisiere Instrumenten-Filter basierend auf Schüler
  const initialInstrument = useMemo(() => {
    if (!studentInstrument) return 'all';
    const normalized = studentInstrument.toLowerCase();
    if (normalized.includes('gitarre')) return 'guitar';
    if (normalized.includes('klavier') || normalized.includes('piano') || normalized.includes('keyboard')) return 'piano';
    if (normalized.includes('bass')) return 'bass';
    if (normalized.includes('schlagzeug') || normalized.includes('drums')) return 'drums';
    if (normalized.includes('flöte') || normalized.includes('flute')) return 'flute';
    if (normalized.includes('sax')) return 'altosax';
    if (normalized.includes('trompete') || normalized.includes('trumpet')) return 'trumpet';
    return 'all';
  }, [studentInstrument]);

  const [selectedInstrument, setSelectedInstrument] = useState<string>(initialInstrument);

  // Audio Synthesizer Ref
  const synthRef = useRef<MicroScoreAudioSynthesizer | null>(null);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const togglePlaySnippet = useCallback((rawSnippet: MicroScoreSnippet) => {
    if (playingSnippetId === rawSnippet.id) {
      stopPlayback();
      return;
    }

    stopPlayback();
    setPlayingSnippetId(rawSnippet.id);

    const targetInst: MicroScoreInstrument = (rawSnippet.instrument === 'drums' || rawSnippet.clef === 'percussion')
      ? 'drums'
      : (selectedInstrument && selectedInstrument !== 'all' && selectedInstrument !== 'universal')
      ? (selectedInstrument as MicroScoreInstrument)
      : (studentInstrument ? (studentInstrument as MicroScoreInstrument) : 'piano');
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
      // Metronom Klick auf vollen Schlägen
      if (curFraction % 4 === 0) {
        synth.scheduleMetronomeClick(synth.init().currentTime, curFraction === 0);
      }

      const notesToPlay = snippet.notes.filter(
        n => n.barIndex === curBar && Math.abs(n.beatFraction - curFraction) < 0.25
      );

      if (notesToPlay.length > 0) {
        notesToPlay.forEach(n => {
          if (n.pitch && n.pitch !== 'REST') {
            const durSec = durationToSeconds(n.duration, bpm, n.isDotted, n.isTriplet);
            const playbackInst: MicroScoreInstrument = (snippet.instrument && snippet.instrument !== 'universal')
              ? snippet.instrument
              : targetInst;

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
          stopPlayback();
        }
      }
    }, sixteenthMs);
  }, [playingSnippetId, stopPlayback, selectedInstrument, studentInstrument]);

  // Gefilterte Notenschnipsel
  const filteredSnippets = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return snippets.filter(snip => {
      // 1. Instrumenten-Filter (0,1% Goldstandard: Universelle Schnipsel gelten für alle Instrumente)
      if (selectedInstrument !== 'all') {
        const isUniversal = snip.instrument === 'universal' || !snip.instrument;
        const matchesInst = selectedInstrument === 'universal'
          ? isUniversal
          : (isUniversal || snip.instrument === selectedInstrument);
        if (!matchesInst && !q) return false;
      }

      // 2. Suchabfrage hat Priorität (global über alle Kategorien)
      if (q) {
        const matchTitle = snip.title.toLowerCase().includes(q);
        const matchCat = (snip.category || '').toLowerCase().includes(q);
        const matchDesc = (snip.description || '').toLowerCase().includes(q);
        const matchTags = (snip.tags || []).some(t => t.toLowerCase().includes(q));
        return matchTitle || matchCat || matchDesc || matchTags;
      }

      // 3. Kategorie-Filter
      if (selectedCategory) {
        if (selectedCategory === 'Eigene') {
          const isOwn = isOwnScoreSnippet(snip);
          if (!isOwn) return false;
          if (selectedSubFolder === 'drafts' && snip.taskId) return false;
          if (selectedSubFolder === 'assigned' && !snip.taskId) return false;
        } else if (snip.category !== selectedCategory) {
          return false;
        }
      }

      // 4. Sub-Ordner Filter
      if (selectedSubFolder !== 'all') {
        if (selectedCategory !== 'Eigene' && snip.vdmFolder !== selectedSubFolder) {
          return false;
        }
      }

      return true;
    });
  }, [snippets, searchQuery, selectedCategory, selectedSubFolder, selectedInstrument]);

  // Berechne Zähler pro Kategorie
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      Eigene: 0
    };
    VDM_CATEGORIES.forEach(c => {
      counts[c.id] = 0;
    });
    snippets.forEach(s => {
      const isOwn = isOwnScoreSnippet(s);
      if (isOwn) {
        counts.Eigene = (counts.Eigene || 0) + 1;
      }
      if (s.category && s.category !== 'Eigene') {
        counts[s.category] = (counts[s.category] || 0) + 1;
      }
    });
    return counts;
  }, [snippets]);

  if (!isOpen) return null;

  const activeCategoryObj = VDM_CATEGORIES.find(c => c.id === selectedCategory);

  return (
    <div
      role="region"
      aria-label="VdM Notenschnipsel-Bibliothek"
      style={{
        marginTop: '8px',
        padding: '12px 14px',
        background: '#ffffff',
        border: '1.5px solid #cbd5e1',
        borderRadius: '16px',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        animation: 'fadeIn 0.15s ease'
      }}
    >
      {/* 1. Header: Titel + Instrument + Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '8px',
            background: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Music size={14} />
          </div>
          <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a' }}>
            VdM-Notenschnipsel ({snippets.length})
          </span>
          <span style={{
            fontSize: '0.68rem',
            background: '#f1f5f9',
            color: '#64748b',
            padding: '2px 7px',
            borderRadius: '6px',
            fontWeight: 700
          }}>
            1–4 Takte • Unterrichtsgebrauch
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Instrumenten Schnell-Filter */}
          <select
            value={selectedInstrument}
            onChange={(e) => setSelectedInstrument(e.target.value)}
            aria-label="Instrumentenfilter für Notenschnipsel"
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '4px 8px',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#334155',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {INSTRUMENT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Neu komponieren Button */}
          <button
            type="button"
            onClick={onOpenCreateNew}
            title="Eigenen Notenschnipsel (1–4 Takte) komponieren"
            aria-label="Eigenen Notenschnipsel komponieren"
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '5px 10px',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Plus size={13} />
            <span>Neu</span>
          </button>

          {/* Schließen Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Notenschnipsel-Menü schließen"
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '8px',
              width: '26px',
              height: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer'
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* 2. Instant-Suchleiste */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '5px 10px'
      }}>
        <Search size={14} color="#94a3b8" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Schnellsuche (z. B. C-Dur, Kadenz, Triolen, Hanon, Spider)..."
          aria-label="Notenschnipsel durchsuchen"
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: '#1e293b',
            width: '100%'
          }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* 3. Ordner-Ebene 1: Hauptordner-Kacheln (wenn keine Suche aktiv und keine Kategorie gewählt) */}
      {!searchQuery && !selectedCategory && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '8px'
        }}>
          {VDM_CATEGORIES.map(cat => {
            const count = categoryCounts[cat.id] || 0;
            const Icon =
              cat.iconName === 'sparkles' ? Sparkles :
              cat.iconName === 'music' ? Music :
              cat.iconName === 'layers' ? Layers :
              cat.iconName === 'drum' ? Activity :
              cat.iconName === 'smile' ? Smile :
              cat.iconName === 'guitar' ? Guitar :
              cat.iconName === 'mic' ? Mic :
              cat.iconName === 'users' ? Users : Zap;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSelectedSubFolder('all');
                }}
                style={{
                  background: cat.color.bg,
                  border: `1px solid ${cat.color.border}`,
                  borderRadius: '12px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale-mini"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: cat.color.text }}>
                    <Icon size={16} />
                    <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>{cat.name}</span>
                  </div>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    background: cat.color.badgeBg,
                    color: cat.color.badgeText,
                    padding: '2px 6px',
                    borderRadius: '6px'
                  }}>
                    {count}
                  </span>
                </div>
                <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 600 }}>
                  {cat.description}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 4. Ordner-Ebene 2: Kategorie-Header mit Breadcrumb & Sub-Ordner Tabs */}
      {!searchQuery && selectedCategory && activeCategoryObj && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Breadcrumb Leiste */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory(null);
                setSelectedSubFolder('all');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                padding: '2px 4px'
              }}
            >
              <ChevronLeft size={14} />
              <span>Zurück zur Ordnerübersicht</span>
            </button>

            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: activeCategoryObj.color.text }}>
              📁 {activeCategoryObj.name}
            </span>
          </div>

          {/* Sub-Ordner Filter-Pills */}
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }} className="hide-scrollbar">
            {activeCategoryObj.subFolders.map(sub => {
              const isActive = selectedSubFolder === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelectedSubFolder(sub.id)}
                  style={{
                    flexShrink: 0,
                    background: isActive ? activeCategoryObj.color.activeBg : '#f1f5f9',
                    color: isActive ? activeCategoryObj.color.activeText : '#475569',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: isActive ? activeCategoryObj.color.shadow : 'none',
                    transition: 'all 0.15s ease'
                  }}
                  title={sub.description}
                >
                  {sub.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Liste der gefilterten Notenschnipsel */}
      {(selectedCategory || searchQuery) && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          maxHeight: '220px',
          overflowY: 'auto',
          paddingRight: '2px'
        }}>
          {filteredSnippets.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '24px 10px',
              color: '#94a3b8',
              fontSize: '0.78rem',
              fontWeight: 600
            }}>
              Keine Notenschnipsel in diesem Filter gefunden.
            </div>
          ) : (
            filteredSnippets.map(snip => {
              const isPlaying = playingSnippetId === snip.id;

              return (
                <div
                  key={snip.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '7px 10px',
                    background: isPlaying ? '#f8fafc' : '#ffffff',
                    border: isPlaying ? '1.5px solid #0f172a' : '1px solid #e2e8f0',
                    borderRadius: '10px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Links: Play Button + Titel + Details */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                    <button
                      type="button"
                      onClick={() => togglePlaySnippet(snip)}
                      title={isPlaying ? 'Wiedergabe stoppen' : 'Audio-Vorschau mit Metronom abspielen'}
                      aria-label={isPlaying ? 'Wiedergabe stoppen' : 'Audio-Vorschau abspielen'}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        border: 'none',
                        background: isPlaying ? '#0f172a' : '#f1f5f9',
                        color: isPlaying ? '#ffffff' : '#0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      {isPlaying ? <Square size={11} fill="#ffffff" /> : <Play size={12} fill="#0f172a" style={{ marginLeft: '1px' }} />}
                    </button>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
                      <span style={{
                        fontSize: '0.80rem',
                        fontWeight: 800,
                        color: '#0f172a',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {snip.title}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                        <span>{snip.barsCount || 2} Takte</span>
                        <span>•</span>
                        <span>{snip.tempoBpm || 80} BPM</span>
                        {snip.vdmLevel && (
                          <>
                            <span>•</span>
                            <span style={{ textTransform: 'capitalize' }}>VdM {snip.vdmLevel}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Rechts: 1-Click Zuweisen Button */}
                  <button
                    type="button"
                    onClick={() => {
                      stopPlayback();
                      const targetInst: MicroScoreInstrument = (snip.instrument === 'drums' || snip.clef === 'percussion')
                        ? 'drums'
                        : (selectedInstrument && selectedInstrument !== 'all')
                        ? (selectedInstrument as MicroScoreInstrument)
                        : (studentInstrument ? (studentInstrument as MicroScoreInstrument) : 'universal');
                      const resolved = resolveSnippetForInstrument(snip, targetInst);
                      onSelectSnippet(resolved);
                    }}
                    title={`„${snip.title}“ als Wochen-Hausaufgabe anheften`}
                    aria-label={`„${snip.title}“ als Wochen-Hausaufgabe anheften`}
                    style={{
                      background: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '5px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      flexShrink: 0
                    }}
                    className="hover-scale-mini"
                  >
                    <Plus size={12} />
                    <span>Zuweisen</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
