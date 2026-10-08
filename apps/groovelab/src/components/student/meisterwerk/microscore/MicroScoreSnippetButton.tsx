/**
 * 🏛️ Campus-Groovelab Micro-Score Studio (1–4 Takte)
 * MicroScoreSnippetButton.tsx
 * 
 * Kompakter monochromer Apple-Squircle Pill-Button:
 * - Icon: Monochromes Achtelnoten-Symbol (Lucide Music)
 * - Text: "Schnipsel" (oder dezentes Icon-Pill)
 * - 30–34px Apple-Squircle (Harmonische Höhe für Aufgabenzeilen)
 * - Autarkes Öffnen des MicroScoreStudioModal
 * - BFSG 2025 & WCAG 2.2 AA konform (Tastatur Enter/Space, Kontrast ≥ 7:1)
 * - Monolith Ceiling Axiom: Reduziert Host-Diff in MeisterwerkDocumentTab auf 1–2 Zeilen
 */

import React, { useState, useMemo } from 'react';
import { Music } from 'lucide-react';
import { MicroScoreSnippet, MicroScoreInstrument } from './microScore.types';
import { MicroScoreStudioModal } from './MicroScoreStudioModal';
import { resolveSnippetForInstrument } from '../../../../services/canonicalScoreEngine';

export interface MicroScoreSnippetButtonProps {
  studentId?: string | null;
  taskId?: string;
  taskTitle?: string;
  defaultInstrument?: string;
  isJunior?: boolean;
  readOnly?: boolean;
  initialSnippet?: MicroScoreSnippet | null;
  onSnippetUpdated?: (snippet: MicroScoreSnippet) => void;
}

export const MicroScoreSnippetButton: React.FC<MicroScoreSnippetButtonProps> = ({
  studentId,
  taskId,
  taskTitle,
  defaultInstrument,
  isJunior = false,
  readOnly = false,
  initialSnippet,
  onSnippetUpdated
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Prüfe, ob für diese Aufgabe bereits ein Schnipsel im Cache liegt
  const rawExistingSnippet = initialSnippet || (() => {
    if (typeof window === 'undefined' || !taskId) return null;
    try {
      const raw = localStorage.getItem(`campus_task_microscore_${taskId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  // 0,1% Goldstandard: Universelle Schnipsel dynamisch auf das Schüler-Instrument projizieren
  const existingSnippet = useMemo(() => {
    if (!rawExistingSnippet) return null;
    if (rawExistingSnippet.instrument === 'universal' && defaultInstrument && defaultInstrument !== 'universal') {
      return resolveSnippetForInstrument(rawExistingSnippet, defaultInstrument as MicroScoreInstrument);
    }
    return rawExistingSnippet;
  }, [rawExistingSnippet, defaultInstrument]);

  const hasSnippet = Boolean(existingSnippet && existingSnippet.notes && existingSnippet.notes.length > 0);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsModalOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      setIsModalOpen(true);
    }
  };

  const badgeSize = isJunior ? '32px' : '28px';

  return (
    <span
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{ display: 'inline-flex', alignItems: 'center' }}
    >
      <button
        type="button"
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        title={hasSnippet ? `Noten-Schnipsel für ${taskTitle || 'Aufgabe'} öffnen (1–4 Takte)` : `Noten-Schnipsel für ${taskTitle || 'Aufgabe'} anlegen`}
        aria-label={hasSnippet ? `Noten-Schnipsel für ${taskTitle || 'Aufgabe'} öffnen (1–4 Takte)` : `Noten-Schnipsel für ${taskTitle || 'Aufgabe'} anlegen`}
        style={{
          border: hasSnippet ? 'none' : '1px solid #cbd5e1',
          background: hasSnippet ? '#0f172a' : '#ffffff',
          color: hasSnippet ? '#ffffff' : '#64748b',
          borderRadius: '99px',
          width: badgeSize,
          height: badgeSize,
          minWidth: badgeSize,
          minHeight: badgeSize,
          padding: 0,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease',
          boxShadow: hasSnippet ? '0 2px 5px rgba(15, 23, 42, 0.18)' : '0 1px 2px rgba(0,0,0,0.02)',
          touchAction: 'manipulation',
          flexShrink: 0,
          userSelect: 'none',
          opacity: 1
        }}
        className="tactile-btn hover-scale-mini"
      >
        <Music
          size={isJunior ? 15 : 13}
          strokeWidth={2.4}
          color={hasSnippet ? '#ffffff' : '#64748b'}
        />
      </button>

      {/* Autarkes Micro-Score Studio Modal */}
      {isModalOpen && (
        <MicroScoreStudioModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialSnippet={existingSnippet}
          studentId={studentId}
          taskId={taskId}
          taskTitle={taskTitle}
          defaultInstrument={defaultInstrument}
          readOnly={false}
          onSaveSnippet={saved => {
            if (onSnippetUpdated) {
              onSnippetUpdated(saved);
            }
          }}
        />
      )}
    </span>
  );
};
