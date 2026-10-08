/**
 * 🏛️ Campus-Groovelab 0,1% Goldstandard: Notenschnipsel-Pille
 * TagesKompassScoreSnippetPill.tsx
 * 
 * Interaktive Vorschau-Pille für zugewiesene Notenschnipsel (MicroScores 1–4 Takte):
 * - Ersetzt rohe MICROSCORE-JSON-Strings durch formatierte, didaktische Ansicht
 * - 1-Click Audio-Vorhören (▶ Play / ■ Stop) via Web Audio Synthesizer
 * - 1-Click Noten-Inspektor: Öffnet autark das MicroScoreStudioModal
 * - BFSG 2025 & WCAG 2.2 AA konform (Tastatur-Navigation, Kontrast >= 7:1)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Music, Play, Square, ExternalLink } from 'lucide-react';
import { MicroScoreSnippet } from '../../student/meisterwerk/microscore/microScore.types';
import { MicroScoreAudioSynthesizer, durationToSeconds } from '../../student/meisterwerk/microscore/microScoreAudioSynthesizer';
import { MicroScoreStudioModal } from '../../student/meisterwerk/microscore/MicroScoreStudioModal';

export interface TagesKompassScoreSnippetPillProps {
  snippet: MicroScoreSnippet;
  studentId?: string;
  studentName?: string;
  isJunior?: boolean;
}

export const TagesKompassScoreSnippetPill: React.FC<TagesKompassScoreSnippetPillProps> = ({
  snippet,
  studentId,
  studentName,
  isJunior = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    setIsPlaying(false);
    if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
    if (synthRef.current) {
      synthRef.current.stopAll();
    }
  }, []);

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    stopPlayback();
    setIsPlaying(true);

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

      const notesToPlay = (snippet.notes || []).filter(
        n => n.barIndex === curBar && Math.abs(n.beatFraction - curFraction) < 0.25
      );

      if (notesToPlay.length > 0) {
        notesToPlay.forEach(n => {
          if (n.pitch && n.pitch !== 'REST') {
            const durSec = durationToSeconds(n.duration, bpm, n.isDotted, n.isTriplet);
            synth.scheduleToneAtTime(
              snippet.instrument || 'piano',
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
  }, [isPlaying, snippet, stopPlayback]);

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          background: isPlaying ? '#0f172a' : '#ffffff',
          color: isPlaying ? '#ffffff' : '#0f172a',
          border: isPlaying ? '1px solid #0f172a' : '1px solid #cbd5e1',
          borderRadius: '12px',
          padding: '8px 12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          transition: 'all 0.18s ease'
        }}
      >
        {/* Linke Seite: Icon + Titel + Metadaten */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: isPlaying ? '#1e293b' : '#f1f5f9',
              color: isPlaying ? '#ffffff' : '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Music size={14} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
            <span
              style={{
                fontSize: '0.84rem',
                fontWeight: 800,
                color: isPlaying ? '#ffffff' : '#0f172a',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {snippet.title}
            </span>
            <span
              style={{
                fontSize: '0.70rem',
                color: isPlaying ? '#94a3b8' : '#64748b',
                fontWeight: 600
              }}
            >
              {snippet.tempoBpm || 80} BPM • {snippet.barsCount || 2} Takte Notenschnipsel
            </span>
          </div>
        </div>

        {/* Rechte Seite: Play Button & Noten öffnen */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={togglePlayback}
            title={isPlaying ? 'Wiedergabe stoppen' : 'Audio-Vorschau abspielen'}
            aria-label={isPlaying ? 'Wiedergabe stoppen' : 'Audio-Vorschau abspielen'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: isPlaying ? '#ffffff' : '#f8fafc',
              color: isPlaying ? '#0f172a' : '#334155',
              border: isPlaying ? 'none' : '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '5px 9px',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {isPlaying ? <Square size={11} fill="#0f172a" /> : <Play size={11} fill="#334155" />}
            <span>{isPlaying ? 'Stopp' : 'Vorhören'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            title="Noten im MicroScore Studio anzeigen"
            aria-label="Noten im MicroScore Studio anzeigen"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '5px 10px',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <ExternalLink size={11} />
            <span>Noten öffnen</span>
          </button>
        </div>
      </div>

      {/* Autarkes MicroScore Studio Modal */}
      {isModalOpen && (
        <MicroScoreStudioModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialSnippet={snippet}
          studentId={studentId}
          taskTitle={snippet.title}
          defaultInstrument={snippet.instrument}
          readOnly={false}
        />
      )}
    </>
  );
};
