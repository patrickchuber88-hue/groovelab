import React, { useState, useMemo } from 'react';
import { 
  Library, 
  Search, 
  Music, 
  ExternalLink, 
  Check, 
  Plus 
} from 'lucide-react';
import { brandColor as defaultBrandColor } from '../../constants/instruments';
import { ErrorBoundary } from '../ui/ErrorBoundary';

export interface StudentLibraryTabProps {
  globalSongs: any[];
  userSongs: any[];
  brandColor?: string;
  onAddSongToRepertoire: (song: any) => Promise<void> | void;
  isMobile: boolean;
}

const LEVEL_COLORS: Record<string | number, string> = {
  '1': '#ef4444', // Red
  '2': '#3b82f6', // Blue
  '3': '#34a853', // Emerald
  '4': '#8b5cf6', // Violet
  '5': '#ec4899', // Pink
  'starter': '#ef4444',
  'pro': '#8b5cf6'
};

/**
 * 📚 StudentLibraryTab
 * Bounded-context component encapsulating the Song Library for students ('library').
 * BFSG 2025 / WCAG 2.2 AA compliant with touch targets >= 44x44px and keyboard accessibility.
 */
export function StudentLibraryTab({
  globalSongs = [],
  userSongs = [],
  brandColor = defaultBrandColor,
  onAddSongToRepertoire,
  isMobile
}: StudentLibraryTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'title' | 'artist'>('title');
  const [alphaFilter, setAlphaFilter] = useState<string | null>(null);

  const filteredLibrary = useMemo(() => {
    return (globalSongs || []).filter((s: any) => {
      const term = searchQuery.toLowerCase();
      const matchesSearch = searchType === 'title' 
        ? (s.title || '').toLowerCase().includes(term)
        : (s.artist || '').toLowerCase().includes(term);
        
      const valForAlpha = searchType === 'title' ? (s.title || '') : (s.artist || '');
      const matchesAlpha = !alphaFilter 
        ? true 
        : valForAlpha.trim().toUpperCase().startsWith(alphaFilter);
        
      return matchesSearch && matchesAlpha;
    }).sort((a: any, b: any) => (a.title || '').localeCompare(b.title || '', 'de-DE'));
  }, [globalSongs, searchQuery, searchType, alphaFilter]);

  return (
    <ErrorBoundary>
      <section 
        className="exercises-section animation-slide-up" 
        style={{ padding: isMobile ? '12px' : '24px' }}
        aria-label="Songbibliothek"
      >
        <div 
          className="glass-panel" 
          style={{ 
            padding: isMobile ? '16px' : '32px', 
            background: 'white', 
            borderRadius: '24px', 
            border: '1px solid #f1f5f9', 
            boxShadow: '0 10px 30px rgba(0,0,0,0.03)' 
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: isMobile ? '16px' : '32px' }}>
            <h2 style={{ 
              fontSize: isMobile ? '1.3rem' : '1.75rem', 
              fontWeight: 900, 
              color: '#1e293b', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              margin: 0 
            }}>
              <Library size={isMobile ? 22 : 32} color={brandColor} />
              Songbibliothek
            </h2>
            {!isMobile && (
              <p style={{ color: '#64748b', fontSize: '1rem', margin: '8px 0 0 0' }}>
                Entdecke neue Songs und füge sie deinem Üben-Board hinzu.
              </p>
            )}
          </div>

          {/* Search and Alpha Filter Navigation */}
          <div style={{ marginBottom: isMobile ? '16px' : '32px', display: 'flex', flexDirection: 'column', gap: isMobile ? '12px' : '20px' }}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '10px' : '20px', alignItems: isMobile ? 'stretch' : 'center' }}>
              {/* Text Search */}
              <div style={{ position: 'relative', flex: 1, minWidth: isMobile ? 'unset' : '300px' }}>
                <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text"
                  placeholder={`Suche nach ${searchType === 'title' ? 'Songtitel' : 'Interpret'}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: isMobile ? '13px 16px 13px 44px' : '16px 20px 16px 54px', 
                    borderRadius: '14px', 
                    border: '1px solid #e2e8f0', 
                    fontSize: isMobile ? '0.95rem' : '1rem', 
                    fontWeight: 600, 
                    background: 'white', 
                    boxShadow: '0 4px 15px rgba(0,0,0,0.02)', 
                    boxSizing: 'border-box' 
                  }}
                  aria-label={`Suche nach ${searchType === 'title' ? 'Songtitel' : 'Interpret'}`}
                />
              </div>

              {/* Toggle Search Type */}
              <div 
                role="group" 
                aria-label="Suchkriterium auswählen"
                style={{ display: 'flex', background: '#f1f5f9', borderRadius: '14px', padding: '4px', alignSelf: isMobile ? 'flex-start' : 'center' }}
              >
                <button 
                  onClick={() => setSearchType('title')}
                  style={{ 
                    minHeight: '44px',
                    minWidth: '60px',
                    padding: isMobile ? '8px 16px' : '10px 20px', 
                    borderRadius: '10px', 
                    border: 'none', 
                    background: searchType === 'title' ? 'white' : 'transparent', 
                    color: searchType === 'title' ? brandColor : '#64748b', 
                    fontWeight: 800, 
                    cursor: 'pointer', 
                    fontSize: isMobile ? '0.8rem' : '0.85rem',
                    boxShadow: searchType === 'title' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s',
                    touchAction: 'manipulation'
                  }}
                  aria-pressed={searchType === 'title'}
                >
                  Song
                </button>
                <button 
                  onClick={() => setSearchType('artist')}
                  style={{ 
                    minHeight: '44px',
                    minWidth: '60px',
                    padding: isMobile ? '8px 16px' : '10px 20px', 
                    borderRadius: '10px', 
                    border: 'none', 
                    background: searchType === 'artist' ? 'white' : 'transparent', 
                    color: searchType === 'artist' ? brandColor : '#64748b', 
                    fontWeight: 800, 
                    cursor: 'pointer', 
                    fontSize: isMobile ? '0.8rem' : '0.85rem',
                    boxShadow: searchType === 'artist' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s',
                    touchAction: 'manipulation'
                  }}
                  aria-pressed={searchType === 'artist'}
                >
                  Interpret
                </button>
              </div>
            </div>

            {/* Alphabet Bar */}
            <div 
              className="hide-scrollbar"
              role="toolbar"
              aria-label="Alphabetische Schnellfilterung"
              style={{ 
                display: 'flex', 
                gap: '6px', 
                background: 'white', 
                padding: '10px', 
                borderRadius: '16px', 
                border: '1px solid #f1f5f9', 
                boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                WebkitOverflowScrolling: 'touch',
                minWidth: 0
              }}
            >
              <button
                onClick={() => setAlphaFilter(null)}
                style={{ 
                  minHeight: '44px',
                  padding: '8px 16px', 
                  borderRadius: '10px', 
                  border: 'none', 
                  background: !alphaFilter ? brandColor : '#f8fafc', 
                  color: !alphaFilter ? '#0f172a' : '#64748b', 
                  fontWeight: 800, 
                  cursor: 'pointer', 
                  fontSize: '0.75rem', 
                  minWidth: '50px', 
                  flexShrink: 0,
                  touchAction: 'manipulation'
                }}
                aria-pressed={!alphaFilter}
              >
                ALLE
              </button>
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => {
                const isSelected = alphaFilter === letter;
                return (
                  <button 
                    key={letter}
                    onClick={() => setAlphaFilter(letter)}
                    style={{ 
                      minWidth: '44px', 
                      minHeight: '44px', 
                      borderRadius: '10px', 
                      border: 'none', 
                      background: isSelected ? brandColor : 'transparent', 
                      color: isSelected ? '#0f172a' : '#94a3b8', 
                      fontWeight: 800, 
                      cursor: 'pointer', 
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      touchAction: 'manipulation'
                    }}
                    aria-label={`Filter Buchstabe ${letter}`}
                    aria-pressed={isSelected}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Song List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredLibrary.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '32px', color: '#64748b', border: '2px dashed #f1f5f9' }}>
                <Search size={40} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>Keine Songs gefunden</h3>
                <p style={{ fontSize: '0.9rem' }}>Probiere einen anderen Suchbegriff oder Filter.</p>
              </div>
            ) : (
              filteredLibrary.map((song: any) => {
                const levelColor = LEVEL_COLORS[String(song.level).toLowerCase()] || '#f59e0b';
                
                // Dynamic HSL coloring based on song title (A-Z)
                const firstLetter = (song.title || 'A').trim().toUpperCase().charAt(0);
                const code = firstLetter.charCodeAt(0);
                let pct = 0;
                if (code >= 65 && code <= 90) {
                  pct = (code - 65) / (90 - 65);
                } else {
                  pct = (code % 26) / 25;
                }
                const songHue = Math.floor(pct * 360);
                const iconBg = `hsl(${songHue}, 90%, 96%)`;
                const iconBorder = `hsl(${songHue}, 45%, 88%)`;
                const iconColor = `hsl(${songHue}, 65%, 45%)`;
                const isAdded = userSongs.some(us => us.song_id === song.id);

                return (
                  <div 
                    key={song.id} 
                    className="glass-panel" 
                    style={{ 
                      padding: isMobile ? '16px' : '24px', 
                      background: 'white', 
                      border: '1px solid #f1f5f9', 
                      borderLeft: `${isMobile ? '5px' : '8px'} solid ${levelColor}`, 
                      borderRadius: '24px', 
                      display: 'flex', 
                      flexDirection: isMobile ? 'column' : 'row', 
                      justifyContent: 'space-between', 
                      alignItems: isMobile ? 'stretch' : 'center', 
                      gap: isMobile ? '16px' : '24px', 
                      boxShadow: '0 10px 30px rgba(0,0,0,0.02)', 
                      transition: 'all 0.25s ease' 
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '20px', flex: 1, width: '100%' }}>
                      {/* Music Icon Rounded Box */}
                      <div style={{ 
                        width: isMobile ? '48px' : '64px', 
                        height: isMobile ? '48px' : '64px', 
                        borderRadius: isMobile ? '12px' : '18px', 
                        background: iconBg, 
                        border: `1px solid ${iconBorder}`, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        flexShrink: 0 
                      }}>
                        <Music size={isMobile ? 22 : 28} color={iconColor} />
                      </div>

                      {/* Text Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 900, 
                          color: '#64748b', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.08em', 
                          lineHeight: 1.2 
                        }}>
                          {song.artist}
                        </div>
                        <div style={{ 
                          fontSize: isMobile ? '1.15rem' : '1.4rem', 
                          fontWeight: 950, 
                          color: '#0f172a', 
                          marginTop: '4px', 
                          lineHeight: 1.2, 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis' 
                        }}>
                          {song.title}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ 
                            background: '#fef3c7', 
                            color: '#92400e', 
                            padding: '4px 10px', 
                            borderRadius: '8px', 
                            fontSize: '0.75rem', 
                            fontWeight: 800 
                          }}>
                            Level {song.level || '1'}
                          </span>
                          {song.bpm && (
                            <span style={{ 
                              background: '#f1f5f9', 
                              color: '#475569', 
                              padding: '4px 8px', 
                              borderRadius: '8px', 
                              fontSize: '0.75rem', 
                              fontWeight: 700 
                            }}>
                              {song.bpm} BPM
                            </span>
                          )}
                          {song.instrumentation && typeof song.instrumentation === 'object' && !Array.isArray(song.instrumentation) && (
                            Object.entries(song.instrumentation)
                              .filter(([_, count]) => Number(count) > 0)
                              .map(([inst]) => (
                                <span
                                  key={inst}
                                  style={{ 
                                    background: '#f8fafc', 
                                    border: '1px solid #e2e8f0', 
                                    color: '#334155', 
                                    padding: '3px 8px', 
                                    borderRadius: '6px', 
                                    fontSize: '0.72rem', 
                                    fontWeight: 700 
                                  }}
                                >
                                  {inst}
                                </span>
                              ))
                          )}
                          {song.media_link && (
                            <a 
                              href={song.media_link} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              style={{ 
                                color: '#2563eb', 
                                fontSize: '0.75rem', 
                                fontWeight: 700, 
                                textDecoration: 'none', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '4px', 
                                marginLeft: '4px',
                                minHeight: '44px'
                              }}
                            >
                              <ExternalLink size={12} /> Noten / Media
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ flexShrink: 0, width: isMobile ? '100%' : 'auto' }}>
                      {isAdded ? (
                        <div style={{ 
                          background: '#e6f4ea', 
                          border: '1px solid #e6f4ea', 
                          padding: '12px 24px', 
                          borderRadius: '16px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: isMobile ? 'center' : 'flex-start', 
                          gap: '8px', 
                          color: '#34a853', 
                          fontWeight: 900, 
                          fontSize: '0.85rem', 
                          width: isMobile ? '100%' : 'auto',
                          minHeight: '44px'
                        }}>
                          <Check size={18} strokeWidth={3} /> Hinzugefügt
                        </div>
                      ) : (
                        <button 
                          onClick={() => onAddSongToRepertoire(song)}
                          style={{ 
                            background: '#ffffff', 
                            border: '1px solid #e2e8f0', 
                            padding: '12px 24px', 
                            borderRadius: '16px', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: isMobile ? 'center' : 'flex-start', 
                            gap: '8px', 
                            boxShadow: '0 4px 10px rgba(0,0,0,0.02)', 
                            transition: 'all 0.2s ease',
                            width: isMobile ? '100%' : 'auto',
                            minHeight: '44px',
                            touchAction: 'manipulation'
                          }}
                          aria-label={`Song ${song.title} zum Üben hinzufügen`}
                        >
                          <Plus size={18} color="#f59e0b" strokeWidth={3} />
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>Üben</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </ErrorBoundary>
  );
}
