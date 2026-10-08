import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  Award, 
  ChevronRight, 
  Music,
  Zap
} from 'lucide-react';
import { 
  getRepertoireMetrics, 
  advanceSongRepetition, 
  resetSongRepetition,
  STAGE_SHORT_BADGES,
  STAGE_LABELS
} from '../../services/repertoire/spacedRepetitionService';

export interface SpacedRepetitionRepertoireCardProps {
  studentId: string;
  repertoireSongs: any[];
  isMobile?: boolean;
  brandColor?: string;
  onOpenSong?: (song: any) => void;
}

/**
 * 🧠 SpacedRepetitionRepertoireCard (0,1% Enterprise Goldstandard)
 * Bounded Context: GrooveLab / Repertoire-Gedächtnis (GRV-08)
 * 
 * Verhindert das Vergessen gemeisterter Stücke durch wissenschaftliche
 * Wiederholungs-Impulse nach 4, 12, 26 und 52 Wochen.
 * 
 * BFSG 2025 / WCAG 2.2 AA konform:
 * - Touch-Targets >= 44x44px
 * - Kontrastverhältnisse >= 4,5:1
 * - Barrierefreie WAI-ARIA Semantik
 */
export const SpacedRepetitionRepertoireCard: React.FC<SpacedRepetitionRepertoireCardProps> = ({
  studentId,
  repertoireSongs = [],
  isMobile = false,
  brandColor = '#16a34a',
  onOpenSong
}) => {
  const [refreshToken, setRefreshToken] = useState(0);
  const [successSongId, setSuccessSongId] = useState<string | null>(null);

  // Metriken des Repertoire-Gedächtnisses berechnen
  const metrics = useMemo(() => {
    return getRepertoireMetrics(repertoireSongs, studentId);
  }, [repertoireSongs, studentId, refreshToken]);

  if (!repertoireSongs || repertoireSongs.length === 0) {
    return null;
  }

  const handleConfirmMastery = (songId: string) => {
    advanceSongRepetition(songId, studentId);
    setSuccessSongId(songId);
    setRefreshToken(prev => prev + 1);
    setTimeout(() => {
      setSuccessSongId(null);
    }, 1800);
  };

  const handleResetForPractice = (songId: string) => {
    resetSongRepetition(songId, studentId);
    setRefreshToken(prev => prev + 1);
  };

  const hasDueSongs = metrics.dueSongs.length > 0;

  return (
    <div 
      role="region"
      aria-label="Repertoire-Gedächtnis & Wiederholungs-Zyklus"
      style={{
        background: '#ffffff',
        borderRadius: '20px',
        border: '1.5px solid #f1f5f9',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        padding: isMobile ? '16px' : '22px',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Oberer Akzentbalken */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: hasDueSongs 
            ? 'linear-gradient(90deg, #f59e0b, #eab308)' 
            : 'linear-gradient(90deg, #10b981, #16a34a)'
        }}
      />

      {/* Header-Zeile mit Retention-Rate */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: hasDueSongs ? '16px' : '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            background: hasDueSongs ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: hasDueSongs ? '#d97706' : '#059669'
          }}>
            {hasDueSongs ? <RotateCcw size={20} /> : <Sparkles size={20} />}
          </div>
          <div>
            <h3 style={{
              fontSize: isMobile ? '1rem' : '1.1rem',
              fontWeight: 800,
              color: '#0f172a',
              margin: 0,
              lineHeight: 1.2
            }}>
              Repertoire-Gedächtnis
            </h3>
            <p style={{
              fontSize: '0.78rem',
              color: '#64748b',
              margin: '3px 0 0 0',
              fontWeight: 600
            }}>
              {hasDueSongs 
                ? `${metrics.dueSongs.length} Song${metrics.dueSongs.length > 1 ? 's' : ''} heute zur Auffrischung fällig` 
                : 'Alle Meisterstücke sitzen stabil im Langzeitgedächtnis'}
            </p>
          </div>
        </div>

        {/* Retention-Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: '#f8fafc',
          padding: '6px 12px',
          borderRadius: '999px',
          border: '1px solid #e2e8f0',
          fontSize: '0.78rem',
          fontWeight: 700,
          color: '#334155'
        }}>
          <CheckCircle2 size={14} color="#16a34a" />
          <span>{metrics.retentionRatePercent}% Repertoire-Stabilität</span>
        </div>
      </div>

      {/* Fällige Songs zur Auffrischung (falls vorhanden) */}
      {hasDueSongs && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          marginBottom: '16px'
        }}>
          {metrics.dueSongs.map(({ song, summary }) => {
            const songId = song.song_id || song.id;
            const isSuccess = successSongId === songId;

            return (
              <div
                key={songId}
                style={{
                  background: isSuccess ? 'rgba(16, 185, 129, 0.08)' : '#fffbeb',
                  border: isSuccess ? '1.5px solid #10b981' : '1.5px solid #fde68a',
                  borderRadius: '16px',
                  padding: isMobile ? '12px' : '14px 18px',
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  transition: 'all 0.25s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#b45309',
                    fontWeight: 900,
                    fontSize: '0.85rem'
                  }}>
                    {summary.stageBadge}
                  </div>
                  <div>
                    <div style={{
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      color: '#1e293b',
                      lineHeight: 1.2
                    }}>
                      {song.songs?.title || song.title || 'Meisterstück'}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#78350f',
                      fontWeight: 600,
                      marginTop: '2px'
                    }}>
                      {song.songs?.artist || song.artist || 'Repertoire'} • {summary.stageLabel}
                    </div>
                  </div>
                </div>

                {/* Quick Review Aktionen */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: isMobile ? '100%' : 'auto',
                  justifyContent: isMobile ? 'flex-end' : 'flex-start'
                }}>
                  {onOpenSong && (
                    <button
                      type="button"
                      onClick={() => onOpenSong(song)}
                      aria-label={`${song.title || 'Song'} abspielen`}
                      style={{
                        minHeight: '44px',
                        padding: '8px 14px',
                        borderRadius: '12px',
                        background: '#ffffff',
                        border: '1px solid #d1d5db',
                        color: '#374151',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      className="hover-scale"
                    >
                      <Music size={14} />
                      <span>Anhören</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleResetForPractice(songId)}
                    aria-label={`${song.title || 'Song'} noch einmal üben`}
                    title="Setzt den Intervall-Zähler sanft auf 4 Wochen zurück"
                    style={{
                      minHeight: '44px',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#b91c1c',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    className="hover-scale"
                  >
                    <RotateCcw size={13} />
                    <span>Üben ↺</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleConfirmMastery(songId)}
                    aria-label={`${song.title || 'Song'} als sicher bestätigen`}
                    style={{
                      minHeight: '44px',
                      padding: '8px 16px',
                      borderRadius: '12px',
                      background: isSuccess ? '#059669' : '#16a34a',
                      border: 'none',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: 'none',
                      transition: 'background 0.2s ease'
                    }}
                    className="hover-scale"
                  >
                    <CheckCircle2 size={15} />
                    <span>{isSuccess ? 'Gespielt! ✓' : 'Sitzt! ✓'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4-Stufen-Gedächtnis Legende (Apple HIG Minimalismus) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: '8px',
        paddingTop: hasDueSongs ? '12px' : '4px',
        borderTop: hasDueSongs ? '1px solid #f1f5f9' : 'none'
      }}>
        {[
          { key: 1, badge: '4W', label: 'Festigung', icon: <Clock size={12} /> },
          { key: 2, badge: '12W', label: 'Konsolidierung', icon: <Clock size={12} /> },
          { key: 3, badge: '26W', label: 'Halbjahres-Check', icon: <Zap size={12} /> },
          { key: 4, badge: '52W', label: 'Jahres-Klassiker', icon: <Award size={12} /> }
        ].map(stage => (
          <div 
            key={stage.key}
            style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '8px 10px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span style={{
              fontWeight: 800,
              fontSize: '0.72rem',
              color: '#0f172a',
              background: '#e2e8f0',
              padding: '2px 6px',
              borderRadius: '6px'
            }}>
              {stage.badge}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                {stage.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpacedRepetitionRepertoireCard;
