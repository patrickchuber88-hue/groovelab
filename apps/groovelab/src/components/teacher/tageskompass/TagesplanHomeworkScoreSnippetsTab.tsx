/**
 * 🏛️ Campus-Groovelab 0,1% Goldstandard: Notenschnipsel-Tab im Hausaufgaben-Fahrplan
 * TagesplanHomeworkScoreSnippetsTab.tsx
 * 
 * 100% In-Modal Notenschnipsel-Erlebnis mit der bewährten VdM-Bibliothek:
 * - Keine schwebenden Außenfenster mehr (Single-Window Experience im Modal-Body)
 * - Beibehaltung der geliebten 9 VdM-Ordnerkacheln (Gitarre, Rhythmus, Tonleitern, etc.)
 * - Vollständige Sub-Ordner Breadcrumbs & Schnipsel-Karten mit Live-Synthesizer
 * - Zugewiesene Schnipsel oben mit 1-Tap Didaktik-Pills („5x im Loop“, „Wechselschlag“)
 * - Nahtlose Integration von VdmScoreSnippetFolderDrawer im Tab-Container
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Music, Sparkles, Plus, Play, Square, Trash2, Edit3,
  Check, Clock, Layers, Compass, Library, ChevronDown, ChevronUp
} from 'lucide-react';
import { MicroScoreSnippet, MicroScoreInstrument } from '../../student/meisterwerk/microscore/microScore.types';
import { MicroScoreAudioSynthesizer, durationToSeconds } from '../../student/meisterwerk/microscore/microScoreAudioSynthesizer';
import { resolveSnippetForInstrument } from '../../../services/canonicalScoreEngine';
import { VdmScoreSnippetFolderDrawer } from './VdmScoreSnippetFolderDrawer';

export interface TagesplanHomeworkScoreSnippetsTabProps {
  selectedSnippets: MicroScoreSnippet[];
  availableSnippets: MicroScoreSnippet[];
  studentInstrument?: string;
  onAddSnippet: (snippet: MicroScoreSnippet) => void;
  onRemoveSnippet: (snippetId: string) => void;
  onUpdateSnippetBpm?: (snippetId: string, delta: number) => void;
  onOpenStudioModal: () => void;
  onAppendNoteToFahrplan?: (textLine: string) => void;
}

const DIDACTIC_PRACTICE_PILLS = [
  '5x im Loop wiederholen',
  'Tempo schrittweise +10 BPM steigern',
  'Auf sauberen Wechselschlag achten',
  'Sehr langsam im Schneckentempo beginnen',
  'Takt 1 & 2 isoliert üben'
];

export const TagesplanHomeworkScoreSnippetsTab: React.FC<TagesplanHomeworkScoreSnippetsTabProps> = ({
  selectedSnippets,
  availableSnippets,
  studentInstrument = 'Gitarre',
  onAddSnippet,
  onRemoveSnippet,
  onUpdateSnippetBpm,
  onOpenStudioModal,
  onAppendNoteToFahrplan
}) => {
  const [playingSnippetId, setPlayingSnippetId] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(true);

  // Audio Synthesizer Ref für die Vorschau zugewiesener Schnipsel
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

    const norm = (studentInstrument || '').toLowerCase();
    const targetInst: MicroScoreInstrument = (rawSnippet.instrument === 'drums' || rawSnippet.clef === 'percussion')
      ? 'drums'
      : (norm.includes('gitarre') || norm.includes('guitar')) ? 'guitar'
      : norm.includes('bass') ? 'bass'
      : norm.includes('klavier') || norm.includes('piano') ? 'piano'
      : norm.includes('drums') ? 'drums'
      : 'piano';

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
      if (curFraction % 4 === 0) {
        synth.scheduleMetronomeClick(synth.init().currentTime, curFraction === 0);
      }

      const notesToPlay = snippet.notes.filter(
        n => n.barIndex === curBar && Math.abs((n.beatFraction ?? (n as any).fractionOffset ?? 0) - curFraction) < 0.25
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
          curBar = 0;
        }
      }
    }, sixteenthMs);
  }, [playingSnippetId, stopPlayback, studentInstrument]);

  const handleApplyFocusPill = (snippetTitle: string, focusText: string) => {
    if (onAppendNoteToFahrplan) {
      onAppendNoteToFahrplan(`🎼 ${snippetTitle}: ${focusText}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ========================================================================= */}
      {/* 1. SEKTION: ZUGEWIESENE NOTENSCHNIPSEL (VERBINDLICHE HAUSAUFGABE)          */}
      {/* ========================================================================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Music size={18} className="text-emerald-600" />
              <span>Verbindliche Notenschnipsel (MicroScores 1–4 Takte)</span>
              {selectedSnippets.length > 0 && (
                <span style={{ fontSize: '0.70rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}>
                  {selectedSnippets.length} {selectedSnippets.length === 1 ? 'Schnipsel' : 'Schnipsel'} aktiv
                </span>
              )}
            </h4>
            <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
              Kompakte Übe-Bausteine mit interaktivem Play-Along & Metronom für {studentInstrument}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {selectedSnippets.length > 0 && (
              <button
                type="button"
                onClick={() => setShowLibrary(prev => !prev)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                className="hover-scale-mini"
              >
                <Library size={14} className="text-indigo-600" />
                <span>{showLibrary ? 'Bibliothek einklappen' : 'Aus Bibliothek wählen'}</span>
                {showLibrary ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}

            <button
              type="button"
              onClick={onOpenStudioModal}
              style={{
                padding: '6px 12px',
                borderRadius: '10px',
                border: 'none',
                background: '#059669',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 3px rgba(5, 150, 105, 0.2)'
              }}
              className="hover-scale-mini"
              title="Eigenen 1–4 Takt Notenschnipsel im Editor anlegen"
            >
              <Edit3 size={14} />
              <span>Neuer Schnipsel</span>
            </button>
          </div>
        </div>

        {/* Karten der zugewiesenen Schnipsel */}
        {selectedSnippets.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {selectedSnippets.map(snip => {
              const isPlaying = playingSnippetId === snip.id;
              const bpm = snip.tempoBpm || 80;
              const barsCount = snip.barsCount || 2;
              const timeSig = snip.timeSignature || '4/4';

              return (
                <div
                  key={snip.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '14px',
                    background: '#ffffff',
                    border: '1.5px solid #10b981',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => togglePlaySnippet(snip)}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: isPlaying ? '#ef4444' : '#ecfdf5',
                          border: isPlaying ? 'none' : '1.5px solid #10b981',
                          color: isPlaying ? '#ffffff' : '#059669',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          flexShrink: 0
                        }}
                        className="hover-scale-mini"
                        title={isPlaying ? 'Wiedergabe stoppen' : 'Audio-Vorschau abspielen'}
                      >
                        {isPlaying ? <Square size={15} fill="#ffffff" /> : <Play size={15} fill="#059669" />}
                      </button>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <h5 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 900, color: '#0f172a' }}>
                            {snip.title}
                          </h5>
                          <span
                            style={{
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: '#f1f5f9',
                              color: '#334155',
                              textTransform: 'uppercase'
                            }}
                          >
                            {snip.instrument || 'Gitarre'}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                          {barsCount} {barsCount === 1 ? 'Takt' : 'Takte'} · {bpm} BPM · {timeSig} Takt
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Tempo Stepper */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', padding: '2px 5px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <button
                          type="button"
                          onClick={() => onUpdateSnippetBpm && onUpdateSnippetBpm(snip.id, -5)}
                          style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontWeight: 900, fontSize: '0.76rem' }}
                          title="Tempo -5 BPM"
                        >
                          -
                        </button>
                        <span style={{ fontSize: '0.76rem', fontWeight: 900, minWidth: '50px', textAlign: 'center', color: '#0f172a' }}>
                          {bpm} BPM
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateSnippetBpm && onUpdateSnippetBpm(snip.id, 5)}
                          style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontWeight: 900, fontSize: '0.76rem' }}
                          title="Tempo +5 BPM"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveSnippet(snip.id)}
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#fee2e2',
                          color: '#b91c1c',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        className="hover-scale-mini"
                        title="Schnipsel entfernen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Didaktische 1-Tap Übe-Pills */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Compass size={11} className="text-slate-400" />
                      <span>Übe-Anweisung:</span>
                    </span>

                    {DIDACTIC_PRACTICE_PILLS.map((focusText, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyFocusPill(snip.title, focusText)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#334155',
                          fontSize: '0.70rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                        className="hover-scale-mini"
                        title={`"${focusText}" in den Hausaufgaben-Fahrplan übernehmen`}
                      >
                        + {focusText}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. SEKTION: VOLLINTEGRIERTE VDM-BIBLIOTHEK (100% IN-MODAL)                 */}
      {/* ========================================================================= */}
      {(showLibrary || selectedSnippets.length === 0) && (
        <div style={{ marginTop: '4px' }}>
          {selectedSnippets.length === 0 && (
            <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} className="text-indigo-600" />
              <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#334155' }}>
                Wähle einen Notenschnipsel aus den 9 VdM-Kategorien für {studentInstrument}:
              </span>
            </div>
          )}

          {/* Die geliebte Original-Komponente – jetzt nativ INSIDE dem Modal-Body! */}
          <VdmScoreSnippetFolderDrawer
            isOpen={true}
            onClose={() => setShowLibrary(false)}
            studentInstrument={studentInstrument}
            snippets={availableSnippets}
            onSelectSnippet={(snip) => {
              onAddSnippet(snip);
              if (onAppendNoteToFahrplan) {
                onAppendNoteToFahrplan(`🎼 Notenschnipsel: ${snip.title} (${snip.tempoBpm || 80} BPM)`);
              }
            }}
            onOpenCreateNew={onOpenStudioModal}
          />
        </div>
      )}
    </div>
  );
};
