import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X, Search, BookOpen, Music, Mic, Play, Pause, Check,
  Sparkles, Layers, Volume2, Clock, AlertCircle, RefreshCw, ChevronRight
} from 'lucide-react';
import { TeacherMediaAssets } from '../../services/teacherStudioService';

export interface TeacherMediaPickerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  teacherId: string;
  schoolId: string;
  mediaAssets: TeacherMediaAssets | null;
  isLoadingAssets: boolean;
  onAddLehrwerk: (lehrwerk: { id: string; title: string; author?: string; instrument?: string; bookColor?: { from: string; to: string; text: string } }) => void;
  onAddSong: (song: { id: string; title: string; artist?: string; tempo_bpm?: number; key?: string; audio_url?: string | null }) => void;
  onAddAudio: (audio: { url: string; label: string; duration?: number }) => void;
  selectedLehrwerkTitles: string[];
  selectedSongTitles: string[];
  selectedAudioUrls: string[];
  initialTab?: 'lehrwerke' | 'songs' | 'audios';
}

export const TeacherMediaPickerDrawer: React.FC<TeacherMediaPickerDrawerProps> = ({
  isOpen,
  onClose,
  mediaAssets,
  isLoadingAssets,
  onAddLehrwerk,
  onAddSong,
  onAddAudio,
  selectedLehrwerkTitles = [],
  selectedSongTitles = [],
  selectedAudioUrls = [],
  initialTab = 'lehrwerke'
}) => {
  const [activeTab, setActiveTab] = useState<'lehrwerke' | 'songs' | 'audios'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  // Audio preview playback state
  const [previewingAudioUrl, setPreviewingAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Sync initial tab when drawer opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchQuery('');
    } else {
      // Stop preview audio when drawer closes
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.src = '';
      }
      setPreviewingAudioUrl(null);
      setIsPlayingAudio(false);
    }
  }, [isOpen, initialTab]);

  // Escape key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Audio preview toggle
  const togglePlayAudio = (url: string) => {
    if (!url) return;

    if (previewingAudioUrl === url && isPlayingAudio) {
      audioPlayerRef.current?.pause();
      setIsPlayingAudio(false);
      return;
    }

    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio();
      audioPlayerRef.current.onended = () => {
        setIsPlayingAudio(false);
      };
      audioPlayerRef.current.onerror = () => {
        setIsPlayingAudio(false);
      };
    }

    audioPlayerRef.current.src = url;
    audioPlayerRef.current.play().then(() => {
      setPreviewingAudioUrl(url);
      setIsPlayingAudio(true);
    }).catch(err => {
      console.warn('[TeacherMediaPickerDrawer] Audio playback blocked or error:', err);
      setIsPlayingAudio(false);
    });
  };

  // Filtered Lehrwerke
  const filteredLehrwerke = useMemo(() => {
    const list = mediaAssets?.lehrwerke || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(item =>
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.author && item.author.toLowerCase().includes(q)) ||
      (item.instrument && item.instrument.toLowerCase().includes(q))
    );
  }, [mediaAssets?.lehrwerke, searchQuery]);

  // Filtered Songs
  const filteredSongs = useMemo(() => {
    const list = mediaAssets?.songs || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(item =>
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.artist && item.artist.toLowerCase().includes(q)) ||
      (item.instrument && item.instrument.toLowerCase().includes(q))
    );
  }, [mediaAssets?.songs, searchQuery]);

  // Filtered Teacher Audios
  const filteredAudios = useMemo(() => {
    const list = mediaAssets?.teacherAudios || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(item =>
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.label && item.label.toLowerCase().includes(q))
    );
  }, [mediaAssets?.teacherAudios, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mediathek & Aufgabenheft Baukasten"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        transition: 'opacity 0.2s ease'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '540px',
          height: '100%',
          backgroundColor: '#ffffff',
          boxShadow: '-10px 0 35px rgba(15, 23, 42, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 16px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div style={{
          padding: '20px 24px 16px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
            }}>
              <Layers size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Mediathek-Baukasten
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0', fontWeight: 500 }}>
                Lehrwerke, Repertoire & eigene Demos hinzufügen
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            title="Schließen"
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '10px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569',
              transition: 'background 0.15s ease'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Segmented Tab Control */}
        <div style={{ padding: '16px 24px 12px 24px', background: '#ffffff' }}>
          <div
            role="tablist"
            aria-label="Mediathek Bereiche"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: '14px',
              gap: '4px'
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'lehrwerke'}
              onClick={() => {
                setActiveTab('lehrwerke');
                setSearchQuery('');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 8px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'lehrwerke' ? '#ffffff' : 'transparent',
                color: activeTab === 'lehrwerke' ? '#0f172a' : '#64748b',
                fontWeight: activeTab === 'lehrwerke' ? 800 : 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: activeTab === 'lehrwerke' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <BookOpen size={16} color={activeTab === 'lehrwerke' ? '#0284c7' : '#64748b'} />
              <span>Lehrwerke</span>
              {mediaAssets?.lehrwerke && mediaAssets.lehrwerke.length > 0 && (
                <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>({mediaAssets.lehrwerke.length})</span>
              )}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'songs'}
              onClick={() => {
                setActiveTab('songs');
                setSearchQuery('');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 8px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'songs' ? '#ffffff' : 'transparent',
                color: activeTab === 'songs' ? '#0f172a' : '#64748b',
                fontWeight: activeTab === 'songs' ? 800 : 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: activeTab === 'songs' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Music size={16} color={activeTab === 'songs' ? '#eab308' : '#64748b'} />
              <span>Songs</span>
              {mediaAssets?.songs && mediaAssets.songs.length > 0 && (
                <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>({mediaAssets.songs.length})</span>
              )}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'audios'}
              onClick={() => {
                setActiveTab('audios');
                setSearchQuery('');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 8px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'audios' ? '#ffffff' : 'transparent',
                color: activeTab === 'audios' ? '#0f172a' : '#64748b',
                fontWeight: activeTab === 'audios' ? 800 : 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: activeTab === 'audios' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Mic size={16} color={activeTab === 'audios' ? '#34a853' : '#64748b'} />
              <span>Lehrer-Demos</span>
              {mediaAssets?.teacherAudios && mediaAssets.teacherAudios.length > 0 && (
                <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>({mediaAssets.teacherAudios.length})</span>
              )}
            </button>
          </div>

          {/* Search Bar */}
          <div style={{ position: 'relative', marginTop: '12px' }}>
            <Search
              size={18}
              color="#94a3b8"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'lehrwerke'
                  ? 'Lehrwerke nach Titel oder Instrument suchen...'
                  : activeTab === 'songs'
                  ? 'Songs nach Titel oder Interpret suchen...'
                  : 'Eigene Aufnahmen & Memos suchen...'
              }
              style={{
                width: '100%',
                padding: '10px 14px 10px 38px',
                borderRadius: '12px',
                border: '1.5px solid #e2e8f0',
                fontSize: '0.88rem',
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 24px 24px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {isLoadingAssets ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px auto', display: 'block', color: '#0284c7' }} />
              <p style={{ fontWeight: 600, fontSize: '0.88rem' }}>Mediathek-Inhalte werden synchronisiert...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: LEHRWERKE */}
              {activeTab === 'lehrwerke' && (
                <div role="tabpanel" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredLehrwerke.length === 0 ? (
                    <div style={{ padding: '36px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                      <BookOpen size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                      <p style={{ fontWeight: 700, margin: 0 }}>Keine Lehrwerke gefunden</p>
                      <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Passe deine Suchbegriffe an oder lege ein neues Lehrwerk in der Mediathek an.</p>
                    </div>
                  ) : (
                    filteredLehrwerke.map((lw) => {
                      const isAdded = selectedLehrwerkTitles.includes(lw.title);
                      return (
                        <div
                          key={lw.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => onAddLehrwerk(lw)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onAddLehrwerk(lw);
                            }
                          }}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '14px',
                            border: isAdded ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                            backgroundColor: isAdded ? '#f0f9ff' : '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                            <div style={{
                              width: '38px',
                              height: '46px',
                              borderRadius: '6px',
                              background: 'linear-gradient(135deg, #334155 0%, #0f172a 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              flexShrink: 0,
                              boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
                            }}>
                              <BookOpen size={18} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {lw.title}
                              </h4>
                              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '0.74rem', color: '#64748b' }}>
                                {lw.author && <span>{lw.author}</span>}
                                {lw.instrument && <span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>{lw.instrument}</span>}
                              </div>
                            </div>
                          </div>

                          <div style={{ flexShrink: 0 }}>
                            {isAdded ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#0284c7',
                                color: '#ffffff',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '4px 10px',
                                borderRadius: '20px'
                              }}>
                                <Check size={12} strokeWidth={3} /> Im Paket
                              </span>
                            ) : (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#f1f5f9',
                                color: '#0284c7',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '5px 12px',
                                borderRadius: '8px'
                              }}>
                                + Hinzufügen
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 2: SONGS */}
              {activeTab === 'songs' && (
                <div role="tabpanel" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredSongs.length === 0 ? (
                    <div style={{ padding: '36px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                      <Music size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                      <p style={{ fontWeight: 700, margin: 0 }}>Keine Songs gefunden</p>
                      <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Passe deine Suche an oder füge neue Repertoire-Titel hinzu.</p>
                    </div>
                  ) : (
                    filteredSongs.map((song) => {
                      const isAdded = selectedSongTitles.includes(song.title);
                      return (
                        <div
                          key={song.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => onAddSong(song)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onAddSong(song);
                            }
                          }}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '14px',
                            border: isAdded ? '1.5px solid #eab308' : '1px solid #e2e8f0',
                            backgroundColor: isAdded ? '#fefce8' : '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '10px',
                              background: 'linear-gradient(135deg, #facc15 0%, #ca8a04 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#0f172a',
                              flexShrink: 0
                            }}>
                              <Music size={18} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {song.title}
                              </h4>
                              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '0.74rem', color: '#64748b', alignItems: 'center' }}>
                                <span>{song.artist}</span>
                                {song.tempo_bpm && (
                                  <span style={{ background: '#fef08a', color: '#854d0e', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                    {song.tempo_bpm} BPM
                                  </span>
                                )}
                                {song.key && (
                                  <span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                    {song.key}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ flexShrink: 0 }}>
                            {isAdded ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#ca8a04',
                                color: '#ffffff',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '4px 10px',
                                borderRadius: '20px'
                              }}>
                                <Check size={12} strokeWidth={3} /> Im Paket
                              </span>
                            ) : (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#fef9c3',
                                color: '#854d0e',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '5px 12px',
                                borderRadius: '8px'
                              }}>
                                + Hinzufügen
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 3: EIGENE LEHRER-AUDIOS */}
              {activeTab === 'audios' && (
                <div role="tabpanel" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* DSGVO & RLS Banner */}
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '0.76rem',
                    color: '#166534',
                    fontWeight: 600
                  }}>
                    <Sparkles size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                    <span>Hier stehen deine eigenen Lehrkraft-Demos & Übe-Audios bereit. 100% DSGVO-rein und an beliebig viele Schüler verteilbar.</span>
                  </div>

                  {filteredAudios.length === 0 ? (
                    <div style={{ padding: '36px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                      <Mic size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                      <p style={{ fontWeight: 700, margin: 0 }}>Keine Lehrkraft-Aufnahmen gefunden</p>
                      <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                        Nimm im Studio oder im Aufgabenheft neue Sprach- und Übedemos auf, um sie hier auszuwählen.
                      </p>
                    </div>
                  ) : (
                    filteredAudios.map((audio) => {
                      const isAdded = selectedAudioUrls.includes(audio.url);
                      const isCurrentlyPlaying = previewingAudioUrl === audio.url && isPlayingAudio;

                      return (
                        <div
                          key={audio.id}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '14px',
                            border: isAdded ? '1.5px solid #22c55e' : '1px solid #e2e8f0',
                            backgroundColor: isAdded ? '#f0fdf4' : '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                            {/* Play/Pause Button */}
                            <button
                              type="button"
                              onClick={() => togglePlayAudio(audio.url)}
                              aria-label={isCurrentlyPlaying ? 'Audio pausieren' : 'Audio vorhören'}
                              title={isCurrentlyPlaying ? 'Audio pausieren' : 'Audio vorhören'}
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '50%',
                                border: 'none',
                                background: isCurrentlyPlaying ? '#16a34a' : '#f1f5f9',
                                color: isCurrentlyPlaying ? '#ffffff' : '#0f172a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                flexShrink: 0,
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {isCurrentlyPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: '2px' }} />}
                            </button>

                            <div style={{ minWidth: 0 }}>
                              <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {audio.title}
                              </h4>
                              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '0.74rem', color: '#64748b', alignItems: 'center' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <Clock size={12} /> {audio.duration || 30}s
                                </span>
                                {audio.created_at && (
                                  <span>{new Date(audio.created_at).toLocaleDateString('de-DE')}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => onAddAudio({
                                url: audio.url,
                                label: audio.label || audio.title || 'Audioaufnahme',
                                duration: audio.duration
                              })}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                border: 'none',
                                background: isAdded ? '#16a34a' : '#f1f5f9',
                                color: isAdded ? '#ffffff' : '#16a34a',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '6px 12px',
                                borderRadius: isAdded ? '20px' : '8px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {isAdded ? (
                                <>
                                  <Check size={12} strokeWidth={3} /> Im Paket
                                </>
                              ) : (
                                '+ Hinzufügen'
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Drawer Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #f1f5f9',
          background: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
            {selectedLehrwerkTitles.length + selectedSongTitles.length + selectedAudioUrls.length} Medien im Paket
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '10px',
              border: 'none',
              background: '#0284c7',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
};
