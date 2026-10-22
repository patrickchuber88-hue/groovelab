/**
 * 🏛️ Campus-Groovelab Tagesplan Book Page Mini Grid (0,1% Goldstandard)
 * TagesplanBookPageMiniGrid.tsx
 *
 * Visuelle 1:1 Parität mit dem Meisterwerk-Lehrwerkraster:
 * - Perfekte Kreis-Bubbles (borderRadius: '50%')
 * - 🟢 Gemeistert (Grün): #f0fdf4 Hintergrund, #10b981 Border, #15803d Text
 * - 🟡 Hausaufgabe (Gelb): #fef9c3 Hintergrund, #facc15 Border, #854d0e Text
 * - ⚪ Offen (Neutral): #ffffff Hintergrund, #e2e8f0 Border, #64748b Text
 * - 🟣 Vom Schüler zuhause geübt: #faf5ff Hintergrund, #c084fc Border mit Lila-Badge
 * - Barrierefrei nach BFSG / WCAG 2.2 AA (Kontrast >= 4,5:1, Tastaturbedienung)
 */

import React from 'react';
import { RotateCcw } from 'lucide-react';

export interface TagesplanBookPageMiniGridProps {
  totalPages: number;
  selectedPages: number[];
  masteredPages?: number[];
  pageStatesMap?: Record<number, { status?: string; isHomework?: boolean; studentFocus?: boolean }>;
  onTogglePage: (pageNum: number) => void;
  onSelectPages: (pages: number[]) => void;
}

export const TagesplanBookPageMiniGrid: React.FC<TagesplanBookPageMiniGridProps> = ({
  totalPages = 50,
  selectedPages,
  masteredPages = [],
  pageStatesMap = {},
  onTogglePage,
  onSelectPages
}) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const masteredSet = new Set(masteredPages);

  const handleClearSelection = () => {
    onSelectPages([]);
  };

  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '20px',
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}
    >
      {/* Kopfzeile mit authentischer Lehrwerk-Legende */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '0.74rem', fontWeight: 800 }}>
          {/* Grün = Gemeistert */}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#166534' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', border: '1.5px solid #059669' }} />
            <span>Gemeistert ({masteredPages.length})</span>
          </span>

          {/* Gelb = Hausaufgabe */}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#854d0e' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#facc15', border: '1.5px solid #ca8a04' }} />
            <span>Hausaufgabe ({selectedPages.length})</span>
          </span>

          {/* Grau = Offen */}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffffff', border: '1.5px solid #cbd5e1' }} />
            <span>Offen</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {selectedPages.length > 0 && (
            <button
              type="button"
              onClick={handleClearSelection}
              style={{
                padding: '3px 9px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                color: '#64748b',
                fontSize: '0.68rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease'
              }}
              title="Hausaufgaben-Auswahl leeren"
            >
              <RotateCcw size={10} />
              <span>Auswahl leeren</span>
            </button>
          )}
        </div>
      </div>

      {/* Bubble Raster (40px responsive Kreis-Grid wie in Bild 1) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
          gap: '8px',
          maxHeight: '260px',
          overflowY: 'auto',
          padding: '4px'
        }}
        className="hide-scrollbar"
      >
        {pages.map(pageNum => {
          const isSelectedHw = selectedPages.includes(pageNum);
          const isMastered = masteredSet.has(pageNum) || pageStatesMap[pageNum]?.status === 'mastered';
          const isFocus = Boolean(pageStatesMap[pageNum]?.studentFocus);

          // 🎨 1:1 Parität mit MeisterwerkDocumentTab:
          let bg = '#ffffff';
          let border = '2px solid #e2e8f0';
          let textColor = '#64748b';
          let shadow = 'none';
          let transform = 'none';

          if (isSelectedHw) {
            // 🟡 GELB: Aktuelle Hausaufgabe
            bg = '#fef9c3';
            border = '2px solid #facc15';
            textColor = '#854d0e';
            shadow = '0 2px 6px rgba(250, 204, 21, 0.35)';
            transform = 'scale(1.05)';
          } else if (isMastered) {
            // 🟢 GRÜN: Gemeisterte Seite
            bg = '#f0fdf4';
            border = '2px solid #10b981';
            textColor = '#166534';
          } else if (isFocus) {
            // 🟣 LILA: Vom Schüler zuhause geübt
            bg = '#faf5ff';
            border = '2px solid #c084fc';
            textColor = '#7e22ce';
          }

          return (
            <button
              key={pageNum}
              type="button"
              onClick={() => onTogglePage(pageNum)}
              style={{
                width: '100%',
                aspectRatio: '1',
                borderRadius: '50%', // ⭕ Echte Kreis-Bubbles wie im Lehrwerk-Raster!
                border,
                background: bg,
                color: textColor,
                boxShadow: shadow,
                transform,
                fontSize: '0.86rem',
                fontWeight: 900,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative'
              }}
              className="hover-scale-mini"
              title={`Seite ${pageNum}${isMastered ? ' (Gemeistert)' : ''}${isSelectedHw ? ' (Hausaufgabe)' : ''}`}
              aria-pressed={isSelectedHw}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onTogglePage(pageNum);
                }
              }}
            >
              <span>{pageNum}</span>

              {/* Grüner kleiner Punkt für gemeistert, falls gleichzeitig als Hausaufgabe gewählt */}
              {isMastered && isSelectedHw && (
                <span
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#10b981',
                    border: '1px solid #ffffff'
                  }}
                  title="Diese Seite war bereits gemeistert"
                />
              )}

              {/* Lila Häkchen für Focus */}
              {isFocus && !isSelectedHw && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    width: '13px',
                    height: '13px',
                    borderRadius: '50%',
                    background: '#9333ea',
                    color: '#ffffff',
                    border: '1.5px solid #ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '8px',
                    fontWeight: 950,
                    lineHeight: 1
                  }}
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
