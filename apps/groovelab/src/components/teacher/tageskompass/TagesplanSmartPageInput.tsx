/**
 * 🏛️ Campus-Groovelab Tagesplan Smart Page Range Input (0,1% Goldstandard)
 * TagesplanSmartPageInput.tsx
 *
 * Pädagogisches Multi-Page Eingabefeld für den Musikschulalltag:
 * - Smart Range Parsing (unterstützt "7", "7-9", "7, 12", "7–10, 14", "S. 7-8")
 * - 1-Click Stepper mit intelligenter Bereichsverschiebung (Doppelseiten schalten um 2 weiter)
 * - Direkte Inline-Editierbarkeit für Tastatur / Apple Pencil / Touch
 * - Barrierefrei nach BFSG / WCAG 2.2 AA (Kontrast >= 4,5:1, Tastatur-Navigation)
 */

import React, { useState, useEffect, useRef } from 'react';
import { Edit3, Check, ChevronDown, ChevronUp, Grid } from 'lucide-react';
import { formatPageRangeString, parsePageRangeString } from '../../../utils/homeworkSnapshotHelper';

export interface TagesplanSmartPageInputProps {
  selectedPages: number[];
  onChange: (pages: number[]) => void;
  totalPages?: number;
  lastMasteredPage?: number;
  isGridOpen?: boolean;
  onToggleGrid?: () => void;
}

export const TagesplanSmartPageInput: React.FC<TagesplanSmartPageInputProps> = ({
  selectedPages,
  onChange,
  totalPages = 50,
  lastMasteredPage = 0,
  isGridOpen = false,
  onToggleGrid
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const formattedDisplay = formatPageRangeString(selectedPages) || 'Keine Seite';

  useEffect(() => {
    if (!isEditing) {
      setInputValue(selectedPages.length > 0 ? selectedPages.join(', ') : '');
    }
  }, [selectedPages, isEditing]);

  const handleStartEdit = () => {
    setInputValue(selectedPages.length > 0 ? formatPageRangeString(selectedPages).replace(/^S\.\s*/i, '') : '');
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  };

  const handleCommitEdit = () => {
    setIsEditing(false);
    const parsed = parsePageRangeString(inputValue, totalPages);
    if (parsed.length > 0) {
      onChange(parsed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditing(false);
    }
  };

  // 🔄 Intelligenter Stepper
  const handleStep = (delta: number) => {
    const maxP = totalPages;
    if (selectedPages.length === 0) {
      const base = lastMasteredPage > 0 ? lastMasteredPage + 1 : 1;
      onChange([Math.max(1, Math.min(maxP, base))]);
      return;
    }

    // Wenn zusammenhängende Doppelseite (z. B. [7, 8]) -> um 2 shiften
    if (selectedPages.length === 2 && selectedPages[1] === selectedPages[0] + 1) {
      const stepSize = delta * 2;
      const newStart = Math.max(1, Math.min(maxP - 1, selectedPages[0] + stepSize));
      onChange([newStart, newStart + 1]);
      return;
    }

    // Wenn 3-Seiten-Block (z. B. [7, 8, 9])
    if (selectedPages.length === 3 && selectedPages[1] === selectedPages[0] + 1 && selectedPages[2] === selectedPages[1] + 1) {
      const stepSize = delta * 3;
      const newStart = Math.max(1, Math.min(maxP - 2, selectedPages[0] + stepSize));
      onChange([newStart, newStart + 1, newStart + 2]);
      return;
    }

    // Einzelseite oder beliebige Auswahl: Primärseite shiften
    const primary = selectedPages[0];
    const newPage = Math.max(1, Math.min(maxP, primary + delta));
    onChange([newPage]);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      {/* Stepper & Textbox Cluster */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: '#f8fafc',
          border: '1.5px solid #cbd5e1',
          borderRadius: '12px',
          padding: '2px',
          gap: '2px'
        }}
      >
        {/* Minus-Button */}
        <button
          type="button"
          onClick={() => handleStep(-1)}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '9px',
            border: 'none',
            background: '#ffffff',
            color: '#0f172a',
            cursor: 'pointer',
            fontWeight: 900,
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            transition: 'all 0.15s ease'
          }}
          className="hover-scale-mini"
          title="Vorherige Seite(n)"
          aria-label="Vorherige Seite(n)"
        >
          –
        </button>

        {/* Display / Editable Input */}
        {isEditing ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', padding: '0 4px' }}>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onBlur={handleCommitEdit}
              onKeyDown={handleKeyDown}
              placeholder="z.B. 7-9 oder 7, 12"
              style={{
                width: '110px',
                height: '30px',
                border: '1.5px solid #f59e0b',
                borderRadius: '8px',
                outline: 'none',
                fontSize: '0.82rem',
                fontWeight: 800,
                color: '#92400e',
                textAlign: 'center',
                background: '#ffffff',
                padding: '0 4px'
              }}
            />
            <button
              type="button"
              onClick={handleCommitEdit}
              style={{
                background: '#d97706',
                border: 'none',
                color: '#ffffff',
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                marginLeft: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Übernehmen"
            >
              <Check size={14} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleStartEdit}
            style={{
              minWidth: '90px',
              padding: '4px 10px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.84rem',
              fontWeight: 900,
              color: '#854d0e',
              textAlign: 'center',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              borderRadius: '8px'
            }}
            title="Klicken zum manuellen Eintippen (z. B. 7-9 oder 7, 12)"
          >
            <span>{formattedDisplay}</span>
            <Edit3 size={11} strokeWidth={2} style={{ color: '#d97706' }} />
          </button>
        )}

        {/* Plus-Button */}
        <button
          type="button"
          onClick={() => handleStep(1)}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '9px',
            border: 'none',
            background: '#ffffff',
            color: '#0f172a',
            cursor: 'pointer',
            fontWeight: 900,
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            transition: 'all 0.15s ease'
          }}
          className="hover-scale-mini"
          title="Nächste Seite(n)"
          aria-label="Nächste Seite(n)"
        >
          +
        </button>
      </div>

      {/* ▾ Mini-Raster Toggle Button */}
      {onToggleGrid && (
        <button
          type="button"
          onClick={onToggleGrid}
          style={{
            padding: '6px 12px',
            borderRadius: '10px',
            border: isGridOpen ? '1.5px solid #d97706' : '1px solid #cbd5e1',
            background: isGridOpen ? '#fefce8' : '#ffffff',
            color: isGridOpen ? '#92400e' : '#475569',
            fontSize: '0.74rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
          className="hover-scale-mini"
          title="Kompaktes Seitenraster aufklappen"
          aria-expanded={isGridOpen}
        >
          <Grid size={13} strokeWidth={2.2} />
          <span>Seitenraster ({totalPages})</span>
          {isGridOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      )}
    </div>
  );
};
