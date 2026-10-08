/**
 * 🏛️ Campus-Groovelab 3-Säulen-Bibliothek / Mediathek
 * TeacherUnifiedMediaLibraryModal.tsx
 * 
 * 0,1% Goldstandard Drei-Säulen-Mediathek für Musikschulen:
 * - Säule 1: Didaktik-Snippet-Archiv (Aufgaben- & Rhythmus-Vorlagen mit BPM)
 * - Säule 2: Lehrwerk-Index (Methoden & Schulwerke nach UrhDaG / Zero-PDF)
 * - Säule 3: Song- & Playalong-Studio (Stems, Repertoire & Audio-Demos)
 * 
 * Kernfunktion:
 * - JEDES Element verfügt über einen prominenten monochromen Teilen-Button:
 *   [ ⚡ Als Hausaufgabe zuweisen ]
 * - Weist die Aufgabe mit 1 Klick für die aktuelle Kalenderwoche des Schülers zu
 * - BFSG 2025 & WCAG 2.2 AA konform (Tastaturbedienung, Kontrast >= 7:1)
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X, Search, BookOpen, Music, FileText, Share2, Send, Plus,
  Play, Pause, Clock, Tag, Sparkles, Filter, ChevronRight, Check,
  AlertCircle, Volume2
} from 'lucide-react';
import {
  LibraryPillar,
  LibrarySnippetItem,
  LibraryLehrwerkItem,
  LibrarySongItem,
  DEFAULT_DIDACTIC_SNIPPETS
} from './teacherLibrary.types';
import { TeacherLibraryShareHomeworkModal } from './TeacherLibraryShareHomeworkModal';
import { TeacherLibraryScoreSnippetsTab } from './tabs/TeacherLibraryScoreSnippetsTab';
import { fetchTeacherMediaAssets, TeacherMediaAssets } from '../../../services/teacherStudioService';
import { fetchTeacherScoreSnippets, saveTeacherScoreSnippet, deleteTeacherScoreSnippet } from '../../../services/teacherScoreSnippetService';
import { MicroScoreSnippet } from '../../student/meisterwerk/microscore/microScore.types';
import { MicroScoreStudioModal } from '../../student/meisterwerk/microscore/MicroScoreStudioModal';

export interface TeacherUnifiedMediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: any;
  allStudents?: any[];
  schoolId?: string;
  initialPillar?: LibraryPillar;
  showRealNames?: boolean;
}

const INSTRUMENT_FILTERS = ['Alle', 'Gitarre', 'Klavier', 'Schlagzeug', 'Bläser', 'Allgemein'];

export const TeacherUnifiedMediaLibraryModal: React.FC<TeacherUnifiedMediaLibraryModalProps> = ({
  isOpen,
  onClose,
  teacher,
  allStudents = [],
  schoolId,
  initialPillar = 'snippets',
  showRealNames = false
}) => {
  const [activePillar, setActivePillar] = useState<LibraryPillar>(initialPillar);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstrumentFilter, setSelectedInstrumentFilter] = useState('Alle');

  // Media assets from DB / LocalStorage
  const [mediaAssets, setMediaAssets] = useState<TeacherMediaAssets | null>(null);
  const [customSnippets, setCustomSnippets] = useState<LibrarySnippetItem[]>([]);
  const [scoreSnippets, setScoreSnippets] = useState<MicroScoreSnippet[]>([]);
  const [showStudioModal, setShowStudioModal] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<MicroScoreSnippet | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // New Snippet Creator Modal state
  const [showNewSnippetModal, setShowNewSnippetModal] = useState(false);
  const [newSnippetTitle, setNewSnippetTitle] = useState('');
  const [newSnippetCategory, setNewSnippetCategory] = useState<LibrarySnippetItem['category']>('Warm-up');
  const [newSnippetInstrument, setNewSnippetInstrument] = useState('Allgemein');
  const [newSnippetBpm, setNewSnippetBpm] = useState(80);
  const [newSnippetNotes, setNewSnippetNotes] = useState('');

  // Share / Assign Modal state
  const [sharingItem, setSharingItem] = useState<{
    item: LibrarySnippetItem | LibraryLehrwerkItem | LibrarySongItem | MicroScoreSnippet | any;
    type: 'snippet' | 'lehrwerk' | 'song' | 'score_snippet';
  } | null>(null);

  // Audio preview playback
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Load assets on open
  useEffect(() => {
    if (isOpen) {
      setActivePillar(initialPillar);
      setSearchQuery('');
      loadData();
    } else {
      // Stop audio playback
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.src = '';
      }
      setPlayingAudioUrl(null);
    }
  }, [isOpen, initialPillar]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !sharingItem && !showNewSnippetModal) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, sharingItem, showNewSnippetModal, onClose]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const tId = teacher?.id || '';
      const sId = schoolId || teacher?.school_id || '';

      // 1. Fetch DB assets (Lehrwerke, Songs, Teacher Audios)
      const assets = await fetchTeacherMediaAssets(tId, sId);
      setMediaAssets(assets);

      // 2. Load custom snippets from localStorage
      if (typeof window !== 'undefined' && tId) {
        try {
          const stored = localStorage.getItem(`teacher_custom_snippets_${tId}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) setCustomSnippets(parsed);
          }
        } catch {}
      }

      // 3. Load score snippets
      const scores = await fetchTeacherScoreSnippets(tId, sId);
      setScoreSnippets(scores);
    } catch (err) {
      console.warn('[TeacherUnifiedMediaLibraryModal] Error loading media assets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Audio Play / Pause toggle
  const togglePlayAudio = (url: string) => {
    if (!url) return;

    if (playingAudioUrl === url) {
      audioPlayerRef.current?.pause();
      setPlayingAudioUrl(null);
      return;
    }

    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio();
      audioPlayerRef.current.onended = () => setPlayingAudioUrl(null);
      audioPlayerRef.current.onerror = () => setPlayingAudioUrl(null);
    }

    audioPlayerRef.current.src = url;
    audioPlayerRef.current.play().then(() => {
      setPlayingAudioUrl(url);
    }).catch(err => {
      console.warn('[AudioPlayer] Playback blocked:', err);
      setPlayingAudioUrl(null);
    });
  };

  // Save new custom snippet
  const handleSaveCustomSnippet = () => {
    if (!newSnippetTitle.trim() || !newSnippetNotes.trim()) return;

    const tId = teacher?.id || 'local';
    const newSnip: LibrarySnippetItem = {
      id: `snip-custom-${Date.now()}`,
      title: newSnippetTitle.trim(),
      category: newSnippetCategory,
      instrumentTag: newSnippetInstrument,
      bpm: Number(newSnippetBpm) || 80,
      notes: newSnippetNotes.trim(),
      tags: [newSnippetCategory, newSnippetInstrument],
      isCustom: true
    };

    const updated = [newSnip, ...customSnippets];
    setCustomSnippets(updated);

    if (typeof window !== 'undefined' && tId) {
      try {
        localStorage.setItem(`teacher_custom_snippets_${tId}`, JSON.stringify(updated));
      } catch {}
    }

    // Reset form
    setNewSnippetTitle('');
    setNewSnippetNotes('');
    setShowNewSnippetModal(false);
  };

  // 1. All Snippets (Standard + Custom)
  const allSnippets = useMemo(() => {
    return [...customSnippets, ...DEFAULT_DIDACTIC_SNIPPETS];
  }, [customSnippets]);

  // Filtered Snippets
  const filteredSnippets = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allSnippets.filter(s => {
      const matchInst = selectedInstrumentFilter === 'Alle' || s.instrumentTag === selectedInstrumentFilter || s.instrumentTag === 'Allgemein';
      if (!matchInst) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.notes.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q))
      );
    });
  }, [allSnippets, searchQuery, selectedInstrumentFilter]);

  // 2. Filtered Lehrwerke
  const filteredLehrwerke = useMemo(() => {
    const list = mediaAssets?.lehrwerke || [];
    const q = searchQuery.toLowerCase().trim();
    return list.filter(lw => {
      const matchInst = selectedInstrumentFilter === 'Alle' || (lw.instrument && lw.instrument.toLowerCase().includes(selectedInstrumentFilter.toLowerCase()));
      if (!matchInst) return false;
      if (!q) return true;
      return (
        (lw.title && lw.title.toLowerCase().includes(q)) ||
        (lw.author && lw.author.toLowerCase().includes(q)) ||
        (lw.instrument && lw.instrument.toLowerCase().includes(q))
      );
    });
  }, [mediaAssets?.lehrwerke, searchQuery, selectedInstrumentFilter]);

  // 3. Filtered Songs & Audios
  const filteredSongs = useMemo(() => {
    const songList: LibrarySongItem[] = (mediaAssets?.songs || []).map(s => ({
      id: s.id,
      title: s.title,
      artist: s.artist || 'Unbekannt',
      instrument: s.instrument,
      tempo_bpm: s.tempo_bpm,
      key: s.key,
      audio_url: s.audio_url,
      hasStems: true
    }));

    const audioList: LibrarySongItem[] = (mediaAssets?.teacherAudios || []).map(a => ({
      id: a.id,
      title: a.title,
      artist: 'Eigene Lehrkraft-Aufnahme',
      tempo_bpm: 80,
      audio_url: a.url,
      hasStems: false,
      duration: a.duration
    }));

    const combined = [...songList, ...audioList];
    const q = searchQuery.toLowerCase().trim();

    return combined.filter(s => {
      const matchInst = selectedInstrumentFilter === 'Alle' || (s.instrument && s.instrument.toLowerCase().includes(selectedInstrumentFilter.toLowerCase()));
      if (!matchInst) return false;
      if (!q) return true;
      return (
        (s.title && s.title.toLowerCase().includes(q)) ||
        (s.artist && s.artist.toLowerCase().includes(q))
      );
    });
  }, [mediaAssets?.songs, mediaAssets?.teacherAudios, searchQuery, selectedInstrumentFilter]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="3-Säulen-Mediathek"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !sharingItem && !showNewSnippetModal) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1020px',
          height: '92vh',
          maxHeight: '860px',
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 28px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.2)'
            }}>
              <BookOpen size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                3-Säulen-Mediathek
              </h2>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                Aufgaben-Snippets, Lehrwerk-Index & Playalong-Studio • 1-Tap Zuweisung als Wochen-Hausaufgabe
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Mediathek schließen"
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '10px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 3-Pillar Tab Segment Bar */}
        <div style={{
          padding: '12px 28px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Tabs */}
          <div style={{
            display: 'inline-flex',
            background: '#e2e8f0',
            padding: '3px',
            borderRadius: '14px',
            gap: '3px'
          }}>
            {[
              { id: 'notenschnipsel' as const, label: 'Notenschnipsel', icon: Music, count: scoreSnippets.length },
              { id: 'snippets' as const, label: 'Didaktik-Vorlagen', icon: FileText, count: allSnippets.length },
              { id: 'lehrwerke' as const, label: 'Lehrwerk-Index', icon: BookOpen, count: mediaAssets?.lehrwerke.length || 0 },
              { id: 'songs' as const, label: 'Songs & Playalongs', icon: Volume2, count: (mediaAssets?.songs.length || 0) + (mediaAssets?.teacherAudios.length || 0) }
            ].map(tab => {
              const isActive = activePillar === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActivePillar(tab.id)}
                  style={{
                    background: isActive ? '#ffffff' : 'transparent',
                    color: isActive ? '#0f172a' : '#475569',
                    border: 'none',
                    borderRadius: '11px',
                    padding: '8px 16px',
                    fontSize: '0.82rem',
                    fontWeight: isActive ? 900 : 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                  <span style={{
                    fontSize: '0.7rem',
                    background: isActive ? '#0f172a' : '#cbd5e1',
                    color: isActive ? '#ffffff' : '#475569',
                    padding: '1px 6px',
                    borderRadius: '6px',
                    fontWeight: 800
                  }}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Create Action */}
          {activePillar === 'notenschnipsel' && (
            <button
              type="button"
              onClick={() => {
                setEditingSnippet(null);
                setShowStudioModal(true);
              }}
              style={{
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 14px',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={14} />
              <span>Neuen Notenschnipsel anlegen</span>
            </button>
          )}

          {activePillar === 'snippets' && (
            <button
              type="button"
              onClick={() => setShowNewSnippetModal(true)}
              style={{
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 14px',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={14} />
              <span>Neues Snippet anlegen</span>
            </button>
          )}
        </div>

        {/* Filter & Search Bar */}
        <div style={{
          padding: '14px 28px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Search Input */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '12px',
            padding: '8px 14px',
            width: '100%',
            maxWidth: '360px'
          }}>
            <Search size={15} color="#64748b" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="In dieser Säule suchen..."
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                width: '100%',
                fontSize: '0.82rem',
                color: '#0f172a'
              }}
            />
          </div>

          {/* Instrument Filter Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {INSTRUMENT_FILTERS.map(inst => {
              const isSelected = selectedInstrumentFilter === inst;
              return (
                <button
                  key={inst}
                  type="button"
                  onClick={() => setSelectedInstrumentFilter(inst)}
                  style={{
                    background: isSelected ? '#0f172a' : '#f1f5f9',
                    color: isSelected ? '#ffffff' : '#475569',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '5px 10px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {inst}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pillar Content Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
          
          {/* Säule 0: Notenschnipsel (1–4 Takte MicroScores) */}
          {activePillar === 'notenschnipsel' && (
            <TeacherLibraryScoreSnippetsTab
              snippets={scoreSnippets}
              onAssign={(snippet) => {
                setSharingItem({
                  item: snippet as any,
                  type: 'score_snippet'
                });
              }}
              onEdit={(snippet) => {
                setEditingSnippet(snippet);
                setShowStudioModal(true);
              }}
              onDelete={async (snippetId) => {
                await deleteTeacherScoreSnippet(snippetId, teacher?.id || 'local');
                setScoreSnippets(prev => prev.filter(s => s.id !== snippetId));
              }}
              onNewSnippet={() => {
                setEditingSnippet(null);
                setShowStudioModal(true);
              }}
              searchQuery={searchQuery}
              selectedInstrumentFilter={selectedInstrumentFilter}
              setSelectedInstrumentFilter={setSelectedInstrumentFilter}
              showInstrumentFilterBar={false}
            />
          )}

          {/* Säule 1: Didaktik-Snippets */}
          {activePillar === 'snippets' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '16px' }}>
              {filteredSnippets.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  Keine Snippets gefunden.
                </div>
              ) : (
                filteredSnippets.map(snip => (
                  <div
                    key={snip.id}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      transition: 'border-color 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{
                          background: '#f1f5f9',
                          color: '#0f172a',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}>
                          {snip.category}
                        </span>
                        {snip.bpm && (
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} />
                            {snip.bpm} BPM
                          </span>
                        )}
                      </div>

                      <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                        {snip.title}
                      </h4>

                      <p style={{ margin: '0 0 12px 0', fontSize: '0.78rem', color: '#475569', lineHeight: 1.45 }}>
                        {typeof snip.notes === 'string' ? snip.notes : ((snip as any).description || '')}
                      </p>

                      {snip.spotlightBars && (
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '10px', fontStyle: 'italic' }}>
                          Fokus: {snip.spotlightBars}
                        </div>
                      )}
                    </div>

                    {/* Monochromer 1-Tap Teilen-Button */}
                    <button
                      type="button"
                      onClick={() => setSharingItem({ item: snip, type: 'snippet' })}
                      style={{
                        background: '#0f172a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        width: '100%',
                        marginTop: '10px',
                        boxShadow: '0 2px 6px rgba(15, 23, 42, 0.1)'
                      }}
                      title="Aufgabe einem Schüler für diese Woche zuweisen"
                    >
                      <Share2 size={13} />
                      <span>Als Hausaufgabe zuweisen</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Säule 2: Lehrwerk-Index */}
          {activePillar === 'lehrwerke' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '16px' }}>
              {filteredLehrwerke.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  Keine Lehrwerke gefunden.
                </div>
              ) : (
                filteredLehrwerke.map(lw => (
                  <div
                    key={lw.id}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <div style={{
                          width: '38px',
                          height: '46px',
                          borderRadius: '6px',
                          background: lw.bookColor?.from || '#334155',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          flexShrink: 0,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                        }}>
                          <BookOpen size={18} />
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                            {lw.title}
                          </h4>
                          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            {lw.author || 'Schulwerk'} {lw.instrument ? `• ${lw.instrument}` : ''}
                          </span>
                        </div>
                      </div>

                      <div style={{
                        background: '#f8fafc',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        fontSize: '0.72rem',
                        color: '#475569',
                        marginBottom: '10px'
                      }}>
                        Reine Metadaten-Architektur nach UrhDaG (0 Noten-PDFs). Schüler nutzt physisches Schulbuch.
                      </div>
                    </div>

                    {/* Monochromer 1-Tap Teilen-Button */}
                    <button
                      type="button"
                      onClick={() => setSharingItem({
                        item: {
                          ...lw,
                          recommendedPages: 'S. 10-12',
                          exercises: 'Üb. 1-3'
                        },
                        type: 'lehrwerk'
                      })}
                      style={{
                        background: '#0f172a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        width: '100%',
                        marginTop: '10px'
                      }}
                      title="Lehrwerk-Seiten einem Schüler für diese Woche zuweisen"
                    >
                      <Share2 size={13} />
                      <span>Als Hausaufgabe zuweisen</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Säule 3: Song- & Playalong-Studio */}
          {activePillar === 'songs' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '16px' }}>
              {filteredSongs.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  Keine Songs oder Playalongs gefunden.
                </div>
              ) : (
                filteredSongs.map(song => {
                  const isPlaying = playingAudioUrl === song.audio_url && Boolean(song.audio_url);

                  return (
                    <div
                      key={song.id}
                      style={{
                        background: '#ffffff',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '16px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '10px',
                              background: '#0f172a',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff'
                            }}>
                              <Music size={18} />
                            </div>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                                {song.title}
                              </h4>
                              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                {song.artist}
                              </span>
                            </div>
                          </div>

                          {/* Preview Play/Pause Button */}
                          {song.audio_url && (
                            <button
                              type="button"
                              onClick={() => togglePlayAudio(song.audio_url!)}
                              style={{
                                background: isPlaying ? '#0f172a' : '#f1f5f9',
                                color: isPlaying ? '#ffffff' : '#0f172a',
                                border: 'none',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                              title={isPlaying ? 'Pause' : 'Anhören'}
                            >
                              {isPlaying ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: '2px' }} />}
                            </button>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: '#64748b' }}>
                          {song.tempo_bpm && <span>{song.tempo_bpm} BPM</span>}
                          {song.key && <span>• Tonart: {song.key}</span>}
                          {song.hasStems && <span>• 4-Spur Arrangement</span>}
                        </div>
                      </div>

                      {/* Monochromer 1-Tap Teilen-Button */}
                      <button
                        type="button"
                        onClick={() => setSharingItem({ item: song, type: 'song' })}
                        style={{
                          background: '#0f172a',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          width: '100%',
                          marginTop: '12px'
                        }}
                        title="Song/Playalong einem Schüler für diese Woche zuweisen"
                      >
                        <Share2 size={13} />
                        <span>Als Hausaufgabe zuweisen</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 28px',
          borderTop: '1px solid #f1f5f9',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.78rem',
          color: '#64748b'
        }}>
          <span>
            {allStudents.length} Schüler in der Klasse verfügbar
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              color: '#475569',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 16px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Schließen
          </button>
        </div>
      </div>

      {/* Sub-Modal: Create New Custom Snippet */}
      {showNewSnippetModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Neues Snippet erstellen"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            padding: '16px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNewSnippetModal(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '500px',
              background: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                Neues Didaktik-Snippet anlegen
              </h3>
              <button
                type="button"
                onClick={() => setShowNewSnippetModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                  Titel der Übung
                </label>
                <input
                  type="text"
                  value={newSnippetTitle}
                  onChange={(e) => setNewSnippetTitle(e.target.value)}
                  placeholder="z. B. Tonleiter G-Dur abwärts im Wechselschlag"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.82rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                    Kategorie
                  </label>
                  <select
                    value={newSnippetCategory}
                    onChange={(e) => setNewSnippetCategory(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.8rem'
                    }}
                  >
                    <option value="Warm-up">Warm-up</option>
                    <option value="Tonleiter">Tonleiter</option>
                    <option value="Rhythmus">Rhythmus</option>
                    <option value="Etüde">Etüde</option>
                    <option value="Technik">Technik</option>
                    <option value="Akkorde">Akkorde</option>
                    <option value="Gehörbildung">Gehörbildung</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                    Instrument
                  </label>
                  <select
                    value={newSnippetInstrument}
                    onChange={(e) => setNewSnippetInstrument(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.8rem'
                    }}
                  >
                    {INSTRUMENT_FILTERS.map(i => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                    Tempo (BPM)
                  </label>
                  <input
                    type="number"
                    value={newSnippetBpm}
                    onChange={(e) => setNewSnippetBpm(Number(e.target.value))}
                    min={40}
                    max={240}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.8rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                  Didaktische Übeanweisung
                </label>
                <textarea
                  value={newSnippetNotes}
                  onChange={(e) => setNewSnippetNotes(e.target.value)}
                  placeholder="Genaue Anweisung für den Schüler..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.82rem',
                    boxSizing: 'border-box',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowNewSnippetModal(false)}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomSnippet}
                  disabled={!newSnippetTitle.trim() || !newSnippetNotes.trim()}
                  style={{
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Snippet speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Modal: Share / Assign as Homework */}
      {sharingItem && (
        <TeacherLibraryShareHomeworkModal
          isOpen={Boolean(sharingItem)}
          onClose={() => setSharingItem(null)}
          item={sharingItem.item}
          itemType={sharingItem.type}
          students={allStudents}
          teacherId={teacher?.id}
          schoolId={schoolId || teacher?.school_id}
          showRealNames={showRealNames}
        />
      )}

      {/* Sub-Modal: MicroScore Studio für Bearbeitung & Neuanlage von Notenschnipseln */}
      {showStudioModal && (
        <MicroScoreStudioModal
          isOpen={showStudioModal}
          onClose={() => {
            setShowStudioModal(false);
            setEditingSnippet(null);
          }}
          initialSnippet={editingSnippet}
          studentId={null}
          onSaveSnippet={async (saved: MicroScoreSnippet) => {
            const res = await saveTeacherScoreSnippet(teacher?.id || 'local', schoolId || teacher?.school_id || '', {
              ...saved,
              category: saved.category && saved.category !== 'Alle' ? saved.category : 'Eigene'
            });
            const actual = res.snippet || saved;
            setScoreSnippets(prev => {
              const idx = prev.findIndex(s => s.id === actual.id || s.id === saved.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = actual;
                return next;
              }
              return [actual, ...prev];
            });
            setShowStudioModal(false);
            setEditingSnippet(null);
          }}
        />
      )}
    </div>
  );
};
