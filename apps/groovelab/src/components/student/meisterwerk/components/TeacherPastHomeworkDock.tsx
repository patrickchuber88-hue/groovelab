import React from 'react';
import { BookOpen, Music, FileText, Mic, Plus, Check, RotateCcw, X } from 'lucide-react';
import { PastWeekSnapshotInfo, PastWeekHomeworkItem } from '../../../../utils/homeworkLifecycleHelper';

export interface TeacherPastHomeworkDockProps {
  pastHomework: PastWeekSnapshotInfo;
  onAdoptAll: () => void;
  onUnadoptAll?: () => void;
  onAdoptItem: (item: PastWeekHomeworkItem) => void;
  onUnadoptItem?: (item: PastWeekHomeworkItem) => void;
  adoptedItemIds?: string[];
  isMobileView?: boolean;
}

/**
 * 🏛️ TeacherPastHomeworkDock (0,1% Goldstandard)
 * apps/groovelab/src/components/student/meisterwerk/components/TeacherPastHomeworkDock.tsx
 *
 * Elegante, hochdidaktische Leiste zu Beginn einer neuen Unterrichtsstunde.
 * Ermöglicht der Lehrkraft, Aufgaben der Vorwoche sekundenschnell per 1-Klick
 * in den frischen Entwurf der aktuellen Stunde zu übernehmen – und jedes
 * Element auch einzeln per Toggle-Undo oder über den Master-Button wieder zu entfernen.
 */
export const TeacherPastHomeworkDock: React.FC<TeacherPastHomeworkDockProps> = ({
  pastHomework,
  onAdoptAll,
  onUnadoptAll,
  onAdoptItem,
  onUnadoptItem,
  adoptedItemIds = [],
  isMobileView = false
}) => {
  if (!pastHomework || !pastHomework.hasItems || pastHomework.items.length === 0) {
    return null;
  }

  const allAdopted = pastHomework.items.length > 0 && pastHomework.items.every(it => adoptedItemIds.includes(it.id));
  const someAdopted = pastHomework.items.some(it => adoptedItemIds.includes(it.id));

  return (
    <div
      style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: isMobileView ? '10px 12px' : '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        boxShadow: 'none',
        flexShrink: 0
      }}
      aria-label="Vorwochen-Hausaufgaben zur Übernahme"
    >
      {/* Kopfzeile */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              background: '#f1f5f9',
              color: '#334155',
              border: 'none',
              padding: '2px 7px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>📌 Aus {pastHomework.weekLabel}</span>
          </span>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.01em'
            }}
          >
            Hausaufgabe der letzten Stunde:
          </span>
        </div>

        {allAdopted ? (
          <button
            type="button"
            role="button"
            tabIndex={0}
            onClick={onUnadoptAll ? onUnadoptAll : onAdoptAll}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (onUnadoptAll) onUnadoptAll();
                else onAdoptAll();
              }
            }}
            style={{
              background: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '100px',
              padding: '3px 10px',
              fontSize: '0.70rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease',
              flexShrink: 0
            }}
            className="hover-scale-mini"
            title="Alle übernommenen Aufgaben der Vorwoche wieder aus dieser Woche entfernen"
            aria-label="Alle übernommenen Aufgaben der Vorwoche wieder aus dieser Woche entfernen"
          >
            <RotateCcw size={11} strokeWidth={2.8} />
            <span>Alle zurücknehmen</span>
          </button>
        ) : (
          <button
            type="button"
            role="button"
            tabIndex={0}
            onClick={onAdoptAll}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onAdoptAll();
              }
            }}
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '100px',
              padding: '3px 10px',
              fontSize: '0.70rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease',
              flexShrink: 0
            }}
            className="hover-scale-mini"
            title={someAdopted ? 'Restliche Aufgaben der Vorwoche übernehmen' : 'Alle Aufgaben der Vorwoche in diese Woche übernehmen'}
            aria-label={someAdopted ? 'Restliche Aufgaben der Vorwoche übernehmen' : 'Alle Aufgaben der Vorwoche in diese Woche übernehmen'}
          >
            <Plus size={11} strokeWidth={2.8} />
            <span>{someAdopted ? 'Restliche übernehmen' : 'Alle übernehmen'}</span>
          </button>
        )}
      </div>

      {/* Horizontale Chip-Leiste zur Einzel-Übernahme & Toggle-Rücknahme */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          overflowX: 'auto',
          paddingBottom: '2px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {pastHomework.items.map((item) => {
          const isAdopted = adoptedItemIds.includes(item.id);

          const renderIcon = () => {
            switch (item.type) {
              case 'book':
                return <BookOpen size={12} color={isAdopted ? '#15803d' : '#0284c7'} />;
              case 'song':
                return <Music size={12} color={isAdopted ? '#15803d' : '#d97706'} />;
              case 'audio':
                return <Mic size={12} color={isAdopted ? '#15803d' : '#9333ea'} />;
              case 'note':
              default:
                return <FileText size={12} color={isAdopted ? '#15803d' : '#64748b'} />;
            }
          };

          const handleChipClick = () => {
            if (isAdopted) {
              if (onUnadoptItem) onUnadoptItem(item);
            } else {
              onAdoptItem(item);
            }
          };

          return (
            <button
              key={item.id}
              type="button"
              role="button"
              tabIndex={0}
              onClick={handleChipClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleChipClick();
                }
              }}
              style={{
                background: isAdopted ? '#dcfce7' : '#ffffff',
                border: isAdopted ? 'none' : '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '4px 9px',
                fontSize: '0.72rem',
                fontWeight: 750,
                color: isAdopted ? '#15803d' : '#334155',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.15s ease',
                boxShadow: isAdopted ? 'none' : '0 1px 2px rgba(0,0,0,0.03)'
              }}
              className="hover-scale-mini"
              title={isAdopted ? `${item.title} (Übernommen · Klicken zum Entfernen)` : `+ ${item.title} in heutige Stunde übernehmen`}
              aria-label={isAdopted ? `${item.title} aus heutiger Stunde entfernen` : `+ ${item.title} in heutige Stunde übernehmen`}
            >
              {isAdopted ? <Check size={11} strokeWidth={2.8} /> : renderIcon()}
              <span>
                {item.title}
                {item.detail ? ` (${item.detail})` : ''}
              </span>
              {isAdopted && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: '2px',
                    color: '#15803d',
                    opacity: 0.75
                  }}
                  title="Aus Hausaufgabe entfernen"
                  aria-hidden="true"
                >
                  <X size={10} strokeWidth={2.6} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
