import React, { useState, useEffect, useMemo } from 'react';
import { X, BookOpen, Music, Mic, Check, RotateCw, Pause, Zap, Pin, EyeOff, Calendar, ArrowRight } from 'lucide-react';
import { harmonizeAudioList } from '../../utils/audioNamingHelper';

export interface TransferLehrwerkItem {
  title: string;
  pages: number[];
  notes?: string[];
  bookColor?: { from: string; to: string; text: string };
}

export interface TransferSongItem {
  id: string;
  topic_name: string;
  homework_notes?: string;
  artist?: string;
}

export interface TransferAudioItem {
  url: string;
  label: string;
  duration?: number;
  originalIdx: number;
  date?: string;
  author?: string;
  songTag?: string;
  harmonizedTitle?: string;
}

export interface HomeworkTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetWeekNum: string;
  targetWeekIso: string;
  targetDateSpan: string;
  sourceWeekNum?: string;
  sourceLehrwerke: TransferLehrwerkItem[];
  sourceSongs: TransferSongItem[];
  sourceAudios: TransferAudioItem[];
  onExecuteTransfer: (decisions: {
    lehrwerke: Record<string, 'master' | 'reactivate' | 'park'>;
    lehrwerkePages?: Record<string, Record<number, 'master' | 'reactivate' | 'park'>>;
    songs: Record<string, 'master' | 'reactivate' | 'park'>;
    audios: Record<string, 'keep' | 'hide'>;
  }) => Promise<void> | void;
}

export const HomeworkTransferModal: React.FC<HomeworkTransferModalProps> = ({
  isOpen,
  onClose,
  targetWeekNum,
  targetWeekIso,
  targetDateSpan,
  sourceWeekNum,
  sourceLehrwerke,
  sourceSongs,
  sourceAudios,
  onExecuteTransfer
}) => {
  // Local state for triage decisions per item
  const [lehrwerkeDecisions, setLehrwerkeDecisions] = useState<Record<string, 'master' | 'reactivate' | 'park'>>({});
  // Local state for page-level triage decisions per book title & page number: `${bookTitle}__p_${pageNum}`
  const [pageDecisions, setPageDecisions] = useState<Record<string, 'master' | 'reactivate' | 'park'>>({});
  const [songsDecisions, setSongsDecisions] = useState<Record<string, 'master' | 'reactivate' | 'park'>>({});
  const [audiosDecisions, setAudiosDecisions] = useState<Record<string, 'keep' | 'hide'>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Runtime Harmonization of Unterrichtsaufnahmen according to Enterprise+ Goldstandard
  const harmonizedAudios = useMemo(() => {
    return harmonizeAudioList(sourceAudios || [], true);
  }, [sourceAudios]);

  // Initialize decisions on open: Default is 'reactivate' for tasks and pages, 'keep' for audios
  useEffect(() => {
    if (isOpen) {
      const initialLW: Record<string, 'master' | 'reactivate' | 'park'> = {};
      const initialPages: Record<string, 'master' | 'reactivate' | 'park'> = {};
      sourceLehrwerke.forEach(lw => {
        initialLW[lw.title] = 'reactivate';
        (lw.pages || []).forEach(p => {
          initialPages[`${lw.title}__p_${p}`] = 'reactivate';
        });
      });
      setLehrwerkeDecisions(initialLW);
      setPageDecisions(initialPages);

      const initialSongs: Record<string, 'master' | 'reactivate' | 'park'> = {};
      sourceSongs.forEach(s => {
        initialSongs[s.id || s.topic_name] = 'reactivate';
      });
      setSongsDecisions(initialSongs);

      const initialAudios: Record<string, 'keep' | 'hide'> = {};
      sourceAudios.forEach(a => {
        initialAudios[a.url] = 'keep';
      });
      setAudiosDecisions(initialAudios);
      setIsSubmitting(false);
    }
  }, [isOpen, sourceLehrwerke, sourceSongs, sourceAudios]);

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isSubmitting]);

  if (!isOpen) return null;

  // Batch fast-actions
  const setAllToDecision = (decision: 'master' | 'reactivate' | 'park') => {
    const updatedLW: Record<string, 'master' | 'reactivate' | 'park'> = {};
    const updatedPages: Record<string, 'master' | 'reactivate' | 'park'> = {};
    sourceLehrwerke.forEach(lw => {
      updatedLW[lw.title] = decision;
      (lw.pages || []).forEach(p => {
        updatedPages[`${lw.title}__p_${p}`] = decision;
      });
    });
    setLehrwerkeDecisions(updatedLW);
    setPageDecisions(updatedPages);

    const updatedSongs: Record<string, 'master' | 'reactivate' | 'park'> = {};
    sourceSongs.forEach(s => {
      updatedSongs[s.id || s.topic_name] = decision;
    });
    setSongsDecisions(updatedSongs);

    const updatedAudios: Record<string, 'keep' | 'hide'> = {};
    sourceAudios.forEach(a => {
      updatedAudios[a.url] = decision === 'reactivate' ? 'keep' : 'hide';
    });
    setAudiosDecisions(updatedAudios);
  };

  // Row-level action for an entire book
  const setBookDecision = (bookTitle: string, decision: 'master' | 'reactivate' | 'park') => {
    setLehrwerkeDecisions(prev => ({ ...prev, [bookTitle]: decision }));
    const bookItem = sourceLehrwerke.find(lw => lw.title === bookTitle);
    if (bookItem && bookItem.pages) {
      setPageDecisions(prev => {
        const next = { ...prev };
        bookItem.pages.forEach(p => {
          next[`${bookTitle}__p_${p}`] = decision;
        });
        return next;
      });
    }
  };

  // 1-Tap Toggle for an individual page pill
  const toggleSinglePageDecision = (bookTitle: string, pageNum: number) => {
    const pKey = `${bookTitle}__p_${pageNum}`;
    const current = pageDecisions[pKey] || 'reactivate';
    const next: 'master' | 'reactivate' = current === 'reactivate' ? 'master' : 'reactivate';

    setPageDecisions(prev => {
      const updated = { ...prev, [pKey]: next };

      // Automatically sync row-level decision if all pages share state
      const bookItem = sourceLehrwerke.find(lw => lw.title === bookTitle);
      if (bookItem && bookItem.pages && bookItem.pages.length > 0) {
        const allMaster = bookItem.pages.every(p => (updated[`${bookTitle}__p_${p}`] || 'reactivate') === 'master');
        const allPark = bookItem.pages.every(p => (updated[`${bookTitle}__p_${p}`] || 'reactivate') === 'park');
        setLehrwerkeDecisions(prevLD => ({
          ...prevLD,
          [bookTitle]: allMaster ? 'master' : allPark ? 'park' : 'reactivate'
        }));
      }

      return updated;
    });
  };

  const handleExecute = async () => {
    setIsSubmitting(true);
    try {
      const structuredPageDecisions: Record<string, Record<number, 'master' | 'reactivate' | 'park'>> = {};
      sourceLehrwerke.forEach(lw => {
        structuredPageDecisions[lw.title] = {};
        (lw.pages || []).forEach(p => {
          structuredPageDecisions[lw.title][p] = pageDecisions[`${lw.title}__p_${p}`] || lehrwerkeDecisions[lw.title] || 'reactivate';
        });
      });

      await onExecuteTransfer({
        lehrwerke: lehrwerkeDecisions,
        lehrwerkePages: structuredPageDecisions,
        songs: songsDecisions,
        audios: audiosDecisions
      });
      onClose();
    } catch (err) {
      console.error('[HomeworkTransferModal] Error executing transfer:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Counts (granular by page for books)
  const totalLW = sourceLehrwerke.length;
  const totalSongs = sourceSongs.length;
  const totalAudios = sourceAudios.length;
  const hasItems = totalLW > 0 || totalSongs > 0 || totalAudios > 0;

  const reactivateCount = 
    sourceLehrwerke.reduce((acc, lw) => {
      if (lw.pages && lw.pages.length > 0) {
        return acc + lw.pages.filter(p => (pageDecisions[`${lw.title}__p_${p}`] || 'reactivate') === 'reactivate').length;
      }
      return acc + (lehrwerkeDecisions[lw.title] === 'reactivate' ? 1 : 0);
    }, 0) +
    Object.values(songsDecisions).filter(d => d === 'reactivate').length +
    Object.values(audiosDecisions).filter(d => d === 'keep').length;

  const masterCount = 
    sourceLehrwerke.reduce((acc, lw) => {
      if (lw.pages && lw.pages.length > 0) {
        return acc + lw.pages.filter(p => (pageDecisions[`${lw.title}__p_${p}`] || 'reactivate') === 'master').length;
      }
      return acc + (lehrwerkeDecisions[lw.title] === 'master' ? 1 : 0);
    }, 0) +
    Object.values(songsDecisions).filter(d => d === 'master').length;

  const parkCount = 
    sourceLehrwerke.reduce((acc, lw) => {
      if (lw.pages && lw.pages.length > 0) {
        return acc + lw.pages.filter(p => (pageDecisions[`${lw.title}__p_${p}`] || 'reactivate') === 'park').length;
      }
      return acc + (lehrwerkeDecisions[lw.title] === 'park' ? 1 : 0);
    }, 0) +
    Object.values(songsDecisions).filter(d => d === 'park').length;

  const formatSeconds = (sec?: number) => {
    if (!sec) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100005,
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" 
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '88vh',
          background: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'scaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px 16px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
              color: '#15803d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.15)'
            }}>
              <RotateCw size={22} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: 950,
                  color: '#0f172a',
                  letterSpacing: '-0.02em'
                }}>
                  Hausaufgaben übertragen
                </h2>
                <span style={{
                  fontSize: '0.74rem',
                  fontWeight: 850,
                  color: '#15803d',
                  background: '#dcfce7',
                  padding: '2px 8px',
                  borderRadius: '100px',
                  border: '1px solid #bbf7d0'
                }}>
                  Ziel: Diese Woche (KW {targetWeekNum})
                </span>
              </div>
              <p style={{
                margin: '3px 0 0 0',
                fontSize: '0.82rem',
                color: '#64748b',
                fontWeight: 600
              }}>
                Wähle für jede Aufgabe: Abhaken (Erledigt), Reaktivieren (Diese Woche) oder Pausieren.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.15s ease'
            }}
            className="hover-scale-mini"
            title="Schließen"
          >
            <X size={16} strokeWidth={2.4} />
          </button>
        </div>

        {/* Quick Batch Actions Toolbar */}
        {hasItems && (
          <div style={{
            padding: '10px 24px',
            background: '#f8fafc',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 750, color: '#64748b' }}>
              Schnellauswahl für alle:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setAllToDecision('reactivate')}
                style={{
                  height: '30px',
                  padding: '0 10px',
                  borderRadius: '100px',
                  background: '#fefce8',
                  color: '#713f12',
                  border: '1.2px solid #eab308',
                  boxShadow: '0 1px 3px rgba(234, 179, 8, 0.2)',
                  fontSize: '0.74rem',
                  fontWeight: 850,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                className="hover-scale-mini"
              >
                <RotateCw size={11} strokeWidth={2.6} color="#713f12" />
                <span>Alle übernehmen</span>
              </button>

              <button
                type="button"
                onClick={() => setAllToDecision('master')}
                style={{
                  height: '30px',
                  padding: '0 10px',
                  borderRadius: '100px',
                  background: '#f0fdf4',
                  color: '#15803d',
                  border: '1px solid #86efac',
                  fontSize: '0.74rem',
                  fontWeight: 850,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                className="hover-scale-mini"
              >
                <Check size={12} strokeWidth={3} />
                <span>Alle abhaken</span>
              </button>

              <button
                type="button"
                onClick={() => setAllToDecision('park')}
                style={{
                  height: '30px',
                  padding: '0 10px',
                  borderRadius: '100px',
                  background: '#ffffff',
                  color: '#64748b',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.74rem',
                  fontWeight: 850,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                className="hover-scale-mini"
              >
                <Pause size={11} strokeWidth={2.5} />
                <span>Alle pausieren</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div style={{
          padding: '20px 24px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {!hasItems && (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: '#64748b',
              background: '#f8fafc',
              borderRadius: '16px',
              border: '1px dashed #cbd5e1'
            }}>
              <p style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#334155' }}>
                Keine aktiven Vorwochen-Aufgaben gefunden
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem' }}>
                In der Vorwoche wurden keine offenen Lehrwerke, Songs oder Aufnahmen dokumentiert.
              </p>
            </div>
          )}

          {/* Sektion 1: Lehrwerke */}
          {totalLW > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.82rem',
                fontWeight: 900,
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                <BookOpen size={14} color="#16a34a" />
                <span>Lehrwerke & Etüden ({totalLW})</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sourceLehrwerke.map((item, idx) => {
                  const currentDecision = lehrwerkeDecisions[item.title] || 'reactivate';
                  const bookColor = item.bookColor || { from: '#3b82f6', to: '#1d4ed8', text: '#ffffff' };

                  return (
                    <div 
                      key={`modal-lw-${idx}`}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '14px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexWrap: 'wrap'
                      }}
                    >
                      {/* Left: Book info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '200px', flex: 1 }}>
                        <div style={{
                          width: '30px',
                          height: '36px',
                          borderRadius: '6px',
                          background: `linear-gradient(135deg, ${bookColor.from}, ${bookColor.to})`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: bookColor.text,
                          flexShrink: 0,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                          <BookOpen size={14} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0f172a' }}>
                              {item.title}
                            </span>
                          </div>
                          {item.pages && item.pages.length > 0 && (
                            <div style={{ display: 'flex', gap: '5px', marginTop: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
                              {item.pages.map(p => {
                                const pKey = `${item.title}__p_${p}`;
                                const pDecision = pageDecisions[pKey] || 'reactivate';
                                const isPReactivate = pDecision === 'reactivate';
                                const isPMaster = pDecision === 'master';
                                const isPPark = pDecision === 'park';

                                return (
                                  <button
                                    key={`page-btn-${p}`}
                                    type="button"
                                    onClick={() => toggleSinglePageDecision(item.title, p)}
                                    style={{
                                      fontSize: '0.74rem',
                                      fontWeight: 850,
                                      padding: '3px 8px',
                                      borderRadius: '100px',
                                      border: isPReactivate 
                                        ? '1.2px solid #eab308' 
                                        : isPMaster 
                                          ? '1.2px solid #86efac' 
                                          : '1px solid #cbd5e1',
                                      background: isPReactivate 
                                        ? '#fef08a' 
                                        : isPMaster 
                                          ? '#dcfce7' 
                                          : '#f1f5f9',
                                      color: isPReactivate 
                                        ? '#713f12' 
                                        : isPMaster 
                                          ? '#15803d' 
                                          : '#64748b',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      transition: 'all 0.15s ease',
                                      boxShadow: isPReactivate 
                                        ? '0 1px 3px rgba(234, 179, 8, 0.25)' 
                                        : isPMaster 
                                          ? '0 1px 2px rgba(22, 163, 74, 0.12)' 
                                          : 'none'
                                    }}
                                    className="hover-scale-mini"
                                    title={isPReactivate 
                                      ? `Seite ${p}: Wird übernommen (Tippen zum Abhaken)` 
                                      : isPMaster 
                                        ? `Seite ${p}: Erledigt / Abgehakt (Tippen zum Übernehmen)` 
                                        : `Seite ${p}: Pausiert (Tippen zum Übernehmen)`}
                                  >
                                    {isPReactivate && <RotateCw size={10} strokeWidth={2.6} color="#713f12" />}
                                    {isPMaster && <Check size={10} strokeWidth={3} color="#15803d" />}
                                    {isPPark && <Pause size={9} strokeWidth={2.5} color="#64748b" />}
                                    <span>S. {p}</span>
                                    <span style={{ fontSize: '0.64rem', opacity: 0.85 }}>
                                      {isPReactivate ? 'Übernehmen' : isPMaster ? 'Erledigt' : 'Pausiert'}
                                    </span>
                                  </button>
                                );
                              })}

                              {/* Counter badge for partial selection */}
                              {item.pages.length > 1 && (() => {
                                const reactivatedCount = item.pages.filter(p => (pageDecisions[`${item.title}__p_${p}`] || 'reactivate') === 'reactivate').length;
                                if (reactivatedCount > 0 && reactivatedCount < item.pages.length) {
                                  return (
                                    <span style={{
                                      fontSize: '0.68rem',
                                      fontWeight: 800,
                                      color: '#854d0e',
                                      background: '#fefce8',
                                      padding: '2px 7px',
                                      borderRadius: '100px',
                                      border: '1px solid #fef08a'
                                    }}>
                                      {reactivatedCount} von {item.pages.length} übernehmen
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: 3-Way Segmented Control */}
                      <div style={{
                        display: 'inline-flex',
                        background: '#f1f5f9',
                        padding: '3px',
                        borderRadius: '100px',
                        gap: '3px'
                      }}>
                        {/* Meistern / Abhaken */}
                        <button
                          type="button"
                          onClick={() => setBookDecision(item.title, 'master')}
                          style={{
                            height: '34px',
                            padding: '0 12px',
                            borderRadius: '100px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 850,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                            background: currentDecision === 'master' ? '#16a34a' : 'transparent',
                            color: currentDecision === 'master' ? '#ffffff' : '#64748b',
                            boxShadow: currentDecision === 'master' ? '0 2px 6px rgba(22, 163, 74, 0.25)' : 'none'
                          }}
                        >
                          <Check size={12} strokeWidth={3} />
                          <span>Abhaken</span>
                        </button>

                        {/* Reaktivieren / Übernehmen (GrooveLab Yellow) */}
                        <button
                          type="button"
                          onClick={() => setBookDecision(item.title, 'reactivate')}
                          style={{
                            height: '34px',
                            padding: '0 12px',
                            borderRadius: '100px',
                            border: currentDecision === 'reactivate' ? '1px solid #ca8a04' : 'none',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 900,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                            background: currentDecision === 'reactivate' ? 'linear-gradient(135deg, #facc15 0%, #eab308 100%)' : 'transparent',
                            color: currentDecision === 'reactivate' ? '#713f12' : '#64748b',
                            boxShadow: currentDecision === 'reactivate' ? '0 2px 6px rgba(234, 179, 8, 0.35)' : 'none'
                          }}
                        >
                          <RotateCw size={11} strokeWidth={2.6} color={currentDecision === 'reactivate' ? '#713f12' : 'currentColor'} />
                          <span>Reaktivieren</span>
                        </button>

                        {/* Pausieren / Parken */}
                        <button
                          type="button"
                          onClick={() => setBookDecision(item.title, 'park')}
                          style={{
                            height: '34px',
                            padding: '0 12px',
                            borderRadius: '100px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 850,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                            background: currentDecision === 'park' ? '#475569' : 'transparent',
                            color: currentDecision === 'park' ? '#ffffff' : '#64748b',
                            boxShadow: currentDecision === 'park' ? '0 2px 6px rgba(71, 85, 105, 0.25)' : 'none'
                          }}
                        >
                          <Pause size={11} strokeWidth={2.6} />
                          <span>Pausieren</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sektion 2: Songs */}
          {totalSongs > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.82rem',
                fontWeight: 900,
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                <Music size={14} color="#4f46e5" />
                <span>Songs & Repertoire ({totalSongs})</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sourceSongs.map((song, idx) => {
                  const songKey = song.id || song.topic_name;
                  const currentDecision = songsDecisions[songKey] || 'reactivate';

                  return (
                    <div 
                      key={`modal-song-${idx}`}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '14px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexWrap: 'wrap'
                      }}
                    >
                      {/* Left: Song info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '200px', flex: 1 }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#4338ca',
                          flexShrink: 0
                        }}>
                          <Music size={14} strokeWidth={2.4} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <span style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0f172a' }}>
                            {song.topic_name.replace(/\s*\([^)]*\)\s*$/, '')}
                          </span>
                          {song.homework_notes && (
                            <p style={{
                              margin: '2px 0 0 0',
                              fontSize: '0.76rem',
                              color: '#64748b',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              Fahrplan: {song.homework_notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: 3-Way Segmented Control */}
                      <div style={{
                        display: 'inline-flex',
                        background: '#f1f5f9',
                        padding: '3px',
                        borderRadius: '100px',
                        gap: '3px'
                      }}>
                        <button
                          type="button"
                          onClick={() => setSongsDecisions(prev => ({ ...prev, [songKey]: 'master' }))}
                          style={{
                            height: '34px',
                            padding: '0 12px',
                            borderRadius: '100px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 850,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                            background: currentDecision === 'master' ? '#16a34a' : 'transparent',
                            color: currentDecision === 'master' ? '#ffffff' : '#64748b',
                            boxShadow: currentDecision === 'master' ? '0 2px 6px rgba(22, 163, 74, 0.25)' : 'none'
                          }}
                        >
                          <Check size={12} strokeWidth={3} />
                          <span>Abhaken</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSongsDecisions(prev => ({ ...prev, [songKey]: 'reactivate' }))}
                          style={{
                            height: '34px',
                            padding: '0 12px',
                            borderRadius: '100px',
                            border: currentDecision === 'reactivate' ? '1px solid #ca8a04' : 'none',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 900,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                            background: currentDecision === 'reactivate' ? 'linear-gradient(135deg, #facc15 0%, #eab308 100%)' : 'transparent',
                            color: currentDecision === 'reactivate' ? '#713f12' : '#64748b',
                            boxShadow: currentDecision === 'reactivate' ? '0 2px 6px rgba(234, 179, 8, 0.35)' : 'none'
                          }}
                        >
                          <RotateCw size={11} strokeWidth={2.6} color={currentDecision === 'reactivate' ? '#713f12' : 'currentColor'} />
                          <span>Reaktivieren</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSongsDecisions(prev => ({ ...prev, [songKey]: 'park' }))}
                          style={{
                            height: '34px',
                            padding: '0 12px',
                            borderRadius: '100px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 850,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                            background: currentDecision === 'park' ? '#475569' : 'transparent',
                            color: currentDecision === 'park' ? '#ffffff' : '#64748b',
                            boxShadow: currentDecision === 'park' ? '0 2px 6px rgba(71, 85, 105, 0.25)' : 'none'
                          }}
                        >
                          <Pause size={11} strokeWidth={2.6} />
                          <span>Pausieren</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sektion 3: Unterrichtsaufnahmen */}
          {totalAudios > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.82rem',
                fontWeight: 900,
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                <Mic size={14} color="#16a34a" />
                <span>Unterrichtsaufnahmen ({totalAudios})</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sourceAudios.map((audio, idx) => {
                  const currentDecision = audiosDecisions[audio.url] || 'keep';

                  return (
                    <div 
                      key={`modal-audio-${idx}`}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '14px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}
                    >
                      {/* Left: Audio info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                        <div style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '50%',
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          color: '#16a34a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Mic size={14} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <span style={{ fontSize: '0.90rem', fontWeight: 850, color: '#0f172a' }}>
                            {harmonizedAudios[idx]?.harmonizedTitle || audio.harmonizedTitle || audio.label}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: '#64748b', marginLeft: '8px' }}>
                            ({formatSeconds(audio.duration)})
                          </span>
                        </div>
                      </div>

                      {/* Right: 2-Way Control */}
                      <div style={{
                        display: 'inline-flex',
                        background: '#f1f5f9',
                        padding: '3px',
                        borderRadius: '100px',
                        gap: '3px'
                      }}>
                        <button
                          type="button"
                          onClick={() => setAudiosDecisions(prev => ({ ...prev, [audio.url]: 'keep' }))}
                          style={{
                            height: '32px',
                            padding: '0 12px',
                            borderRadius: '100px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.76rem',
                            fontWeight: 850,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                            background: currentDecision === 'keep' ? '#16a34a' : 'transparent',
                            color: currentDecision === 'keep' ? '#ffffff' : '#64748b',
                            boxShadow: currentDecision === 'keep' ? '0 2px 6px rgba(22, 163, 74, 0.25)' : 'none'
                          }}
                        >
                          <Pin size={11} strokeWidth={2.4} />
                          <span>Behalten</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAudiosDecisions(prev => ({ ...prev, [audio.url]: 'hide' }))}
                          style={{
                            height: '32px',
                            padding: '0 12px',
                            borderRadius: '100px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.76rem',
                            fontWeight: 850,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                            background: currentDecision === 'hide' ? '#475569' : 'transparent',
                            color: currentDecision === 'hide' ? '#ffffff' : '#64748b',
                            boxShadow: currentDecision === 'hide' ? '0 2px 6px rgba(71, 85, 105, 0.25)' : 'none'
                          }}
                        >
                          <EyeOff size={11} strokeWidth={2.4} />
                          <span>Ausblenden</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #f1f5f9',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          {/* Summary Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 850,
              color: '#713f12',
              background: '#fefce8',
              padding: '3px 8px',
              borderRadius: '100px',
              border: '1.2px solid #eab308',
              boxShadow: '0 1px 2px rgba(234, 179, 8, 0.15)'
            }}>
              {reactivateCount} zum Übertragen
            </span>
            {masterCount > 0 && (
              <span style={{
                fontSize: '0.74rem',
                fontWeight: 850,
                color: '#15803d',
                background: '#dcfce7',
                padding: '3px 8px',
                borderRadius: '100px',
                border: '1px solid #bbf7d0'
              }}>
                {masterCount} Meistern
              </span>
            )}
            {parkCount > 0 && (
              <span style={{
                fontSize: '0.74rem',
                fontWeight: 850,
                color: '#64748b',
                background: '#ffffff',
                padding: '3px 8px',
                borderRadius: '100px',
                border: '1px solid #cbd5e1'
              }}>
                {parkCount} Pausieren
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                height: '42px',
                padding: '0 16px',
                borderRadius: '100px',
                background: '#ffffff',
                color: '#64748b',
                border: '1px solid #cbd5e1',
                fontSize: '0.84rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
              className="hover-scale-mini"
            >
              Abbrechen
            </button>

            <button
              type="button"
              onClick={handleExecute}
              disabled={isSubmitting || !hasItems}
              style={{
                height: '42px',
                padding: '0 20px',
                borderRadius: '100px',
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.88rem',
                fontWeight: 900,
                cursor: (isSubmitting || !hasItems) ? 'not-allowed' : 'pointer',
                opacity: (isSubmitting || !hasItems) ? 0.6 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)'
              }}
              className="hover-scale"
            >
              <RotateCw size={14} strokeWidth={2.6} className={isSubmitting ? 'animate-spin' : ''} />
              <span>{isSubmitting ? 'Wird übertragen...' : `Hausaufgaben in diese Woche übertragen`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
