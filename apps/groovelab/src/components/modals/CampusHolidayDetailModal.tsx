import React, { useEffect } from 'react';
import { Palmtree, Calendar, MapPin, Clock, X, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';
import { StatutoryEventItem } from '../../utils/schoolHolidayEngine';

export interface CampusHolidayDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  holidayItem: StatutoryEventItem | null;
  brandColor?: string;
}

export const CampusHolidayDetailModal: React.FC<CampusHolidayDetailModalProps> = ({
  isOpen,
  onClose,
  holidayItem,
  brandColor = '#34a853'
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !holidayItem) return null;

  const isVacation = holidayItem.category === 'Ferien';
  const accentColor = isVacation ? '#16a34a' : '#2563eb';
  const accentBg = isVacation ? '#f0fdf4' : '#eff6ff';
  const accentBorder = isVacation ? '#bbf7d0' : '#bfdbfe';

  // Datumsformatierung auf Deutsch (z. B. "Montag, 26. Oktober 2026")
  const formatDateGerman = (isoStr: string) => {
    if (!isoStr) return '';
    try {
      const parts = isoStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
      }
      return isoStr;
    } catch {
      return isoStr;
    }
  };

  const isMultiDay = holidayItem.event_date !== holidayItem.event_end_date;
  const startDateStr = formatDateGerman(holidayItem.event_date);
  const endDateStr = holidayItem.event_end_date ? formatDateGerman(holidayItem.event_end_date) : '';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="holiday-detail-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          background: '#fafafa'
        }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: accentBg,
              border: `1px solid ${accentBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: accentColor,
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}>
              {isVacation ? <Palmtree size={24} /> : <Calendar size={24} />}
            </div>
            <div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: accentBg,
                  color: accentColor,
                  letterSpacing: '0.5px'
                }}>
                  {holidayItem.category}
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 650,
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <MapPin size={12} /> {holidayItem.state_name}
                </span>
              </div>
              <h3 id="holiday-detail-title" style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 800,
                color: '#0f172a',
                lineHeight: 1.25
              }}>
                {holidayItem.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Schließen"
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Datum & Zeitraum */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Zeitraum
              </span>
              <span style={{
                fontSize: '0.74rem',
                fontWeight: 800,
                color: accentColor,
                background: '#ffffff',
                border: `1px solid ${accentBorder}`,
                padding: '2px 8px',
                borderRadius: '8px'
              }}>
                {holidayItem.duration_days} {holidayItem.duration_days === 1 ? 'Tag' : 'Tage'} unterrichtsfrei
              </span>
            </div>

            {isMultiDay ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                <div style={{ fontSize: '0.92rem', fontWeight: 750, color: '#1e293b' }}>
                  {startDateStr}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 650 }}>
                  bis
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 750, color: '#1e293b' }}>
                  {endDateStr}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.95rem', fontWeight: 750, color: '#1e293b', marginTop: '2px' }}>
                {startDateStr}
              </div>
            )}
          </div>

          {/* Didaktischer Hinweis */}
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
            padding: '14px 16px',
            borderRadius: '14px',
            background: '#ffffff',
            border: '1px solid #f1f5f9',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}>
            <CheckCircle2 size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.80rem', color: '#334155', lineHeight: 1.45 }}>
              <strong>Unterrichtsfreie Zeit:</strong> An gesetzlichen Feiertagen und während der offiziellen Schulferien findet in der Regel kein regulärer Musikschulunterricht statt.
            </div>
          </div>

          {/* Übe-Streak Bonus Info */}
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            padding: '12px 16px',
            borderRadius: '14px',
            background: '#fefce8',
            border: '1px solid #fef08a'
          }}>
            <Sparkles size={18} color="#ca8a04" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.78rem', color: '#854d0e', lineHeight: 1.4 }}>
              <strong>Ferien-Booster:</strong> Dein Übe-Streak ist während der Ferien gesichert. Freiwilliges Üben wird mit <strong>2× XP</strong> belohnt!
            </div>
          </div>

          {/* Schulleitung / Sekretariats-Hinweis */}
          <div style={{
            fontSize: '0.72rem',
            color: '#64748b',
            lineHeight: 1.4,
            padding: '0 4px',
            fontStyle: 'italic'
          }}>
            💡 Individuelle Schließtage oder bewegliche Ferientage deiner Musikschule können im Sekretariat über den Schulkalender eingepflegt werden und überschreiben die gesetzlichen Termine automatisch.
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'flex-end',
          background: '#fafafa'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
