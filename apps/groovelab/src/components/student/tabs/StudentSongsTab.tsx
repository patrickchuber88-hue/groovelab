import React from "react";
import { Award, BookOpen, Library, Music, Play, Search, Sparkles, Star, Target, Trophy } from "lucide-react";
import { getLehrwerkColor, getSongColor } from "../studentDateUtils";
import { renderSongVinylCover } from "../CampusVinylCoverArt";

export interface StudentSongsTabProps {
  activeTab: string;
  progressLoading: boolean;
  assignedCampusSongs: any[];
  lehrwerke: any[];
  isMobile?: boolean;
  studentUser: any;
  studentId: string;
  juniorMediathekFilter: "all" | "songs" | "lehrwerke" | "homework";
  setJuniorMediathekFilter: (filter: "all" | "songs" | "lehrwerke" | "homework") => void;
  songSearch: string;
  setSongSearch: (s: string) => void;
  songSearchDebounced: string;
  progressItems: any[];
  setSelectedTopic: (topic: string) => void;
  handleTabChangeLocal: (tab: string, skipResetHwTab?: boolean) => void;
  setSelectedSongForDetail: (song: any) => void;
  setCertificateSong: (song: any) => void;
  setSelectedLehrwerkForDetail: (lehrwerk: any) => void;
  isSongMastered: (song: any) => boolean;
  localProgress: any[];
  activeSongSkills: any[];
  isMusicStandMode?: boolean;
}

// 🎼 Normalizes common artist typos (e.g. Linken Park -> Linkin Park)
const normalizeArtistName = (artist?: string): string => {
  if (!artist) return 'Unbekannt';
  const trimmed = artist.trim();
  if (trimmed.toLowerCase() === 'linken park') return 'Linkin Park';
  return trimmed;
};

// 🛡️ Enterprise Deduplication Helper (OWASP & Goldstandard Single Source of Truth)
const deduplicateBy = <T,>(items: T[], keyFn: (item: T) => string): T[] => {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = keyFn(item).trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const StudentSongsTab: React.FC<StudentSongsTabProps> = ({
  activeTab,
  progressLoading,
  assignedCampusSongs,
  lehrwerke,
  isMobile = false,
  studentUser,
  studentId,
  juniorMediathekFilter,
  setJuniorMediathekFilter,
  songSearch,
  setSongSearch,
  songSearchDebounced,
  progressItems,
  setSelectedTopic,
  handleTabChangeLocal,
  setSelectedSongForDetail,
  setCertificateSong,
  setSelectedLehrwerkForDetail,
  isSongMastered,
  localProgress = [],
  activeSongSkills,
  isMusicStandMode = false,
}) => {
  const brandColor = studentUser?.schools?.brand_color || "#34a853";
  const safeLocalProgress = Array.isArray(localProgress) ? localProgress : [];

  return (
      <div id="tour-student-songs" style={{ display: (activeTab === 'songs' || activeTab === 'mediathek') ? 'flex' : 'none', flexDirection: 'column', gap: '20px' }}>
        {(activeTab === 'songs' || activeTab === 'mediathek') && (
          (progressLoading && assignedCampusSongs.length === 0 && lehrwerke.length === 0) ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr minmax(320px, 350px)',
              gap: '24px',
              alignItems: 'start'
            }}>
              <div style={{
                background: '#ffffff',
                borderRadius: '24px',
                border: '1.5px solid #dcfce7',
                padding: isMobile ? '16px 14px' : '24px 30px',
                boxShadow: '0 8px 30px rgba(34, 197, 94, 0.04)',
                boxSizing: 'border-box',
                maxWidth: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div className="animate-pulse" style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#dcfce7' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="animate-pulse" style={{ width: '160px', height: '24px', borderRadius: '8px', background: '#f1f5f9' }} />
                    <div className="animate-pulse" style={{ width: '220px', height: '14px', borderRadius: '6px', background: '#f8fafc' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div className="animate-pulse" style={{ width: '90px', height: '36px', borderRadius: '18px', background: '#dcfce7' }} />
                  <div className="animate-pulse" style={{ width: '90px', height: '36px', borderRadius: '18px', background: '#f1f5f9' }} />
                  <div className="animate-pulse" style={{ width: '110px', height: '36px', borderRadius: '18px', background: '#f1f5f9' }} />
                </div>
                <div className="animate-pulse" style={{ width: '100%', height: '48px', borderRadius: '14px', background: '#f8fafc' }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginTop: '10px' }}>
                  {[1, 2, 3, 4].map(n => (
                    <div key={n} className="animate-pulse" style={{
                      height: '110px',
                      borderRadius: '20px',
                      background: 'linear-gradient(135deg, #f8fafc 0%, #f0fdf4 100%)',
                      border: '1px solid #e2e8f0'
                    }} />
                  ))}
                </div>
              </div>
              {!isMobile && (
                <div style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  border: '1.5px solid #dcfce7',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <div className="animate-pulse" style={{ width: '140px', height: '22px', borderRadius: '8px', background: '#f1f5f9' }} />
                  <div className="animate-pulse" style={{ width: '100%', height: '90px', borderRadius: '16px', background: '#f8fafc' }} />
                  <div className="animate-pulse" style={{ width: '100%', height: '90px', borderRadius: '16px', background: '#f8fafc' }} />
                </div>
              )}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr minmax(280px, 300px)',
              gap: isMobile ? '16px' : '20px',
              alignItems: 'start',
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box'
            }}>
              {/* LEFT COLUMN: MAIN MEDIATHEK AREA */}
              <div 
                className="glass-panel" 
                style={{ 
                  flex: 1,
                  background: 'white', 
                  borderRadius: isMusicStandMode ? '28px' : (isMobile ? '20px' : '22px'), 
                  border: '1px solid rgba(0, 0, 0, 0.05)', 
                  padding: isMusicStandMode ? '22px 24px' : (isMobile ? '16px 14px' : '20px 22px'), 
                  boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.03), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
                  boxSizing: 'border-box',
                  maxWidth: '100%',
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: isMusicStandMode ? '20px' : '16px' 
                }}
              >
                {/* Header Area */}
                {(() => {
                  const brandColor = studentUser?.schools?.brand_color || '#34a853';
                  return (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h2 style={{ fontSize: isMusicStandMode ? '1.85rem' : '1.50rem', color: '#18181b', display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontWeight: 900, letterSpacing: '-0.02em' }}>
                          <div style={{ 
                            background: `${brandColor}15`, 
                            color: brandColor, 
                            padding: isMusicStandMode ? '7px' : '5px', 
                            borderRadius: isMusicStandMode ? '12px' : '9px', 
                            display: 'flex', 
                            alignItems: 'center' 
                          }}>
                            <Library size={isMusicStandMode ? 22 : 18} />
                          </div>
                          <span>Mediathek</span>
                        </h2>
                        <p style={{ color: '#64748b', fontSize: isMusicStandMode ? '0.88rem' : '0.78rem', margin: '3px 0 0 0', fontWeight: 600 }}>
                          Deine Songs und Lehrwerke für den Unterricht.
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Apple-Style Filter Chips Bar */}
                {(() => {
                  const brandColor = studentUser?.schools?.brand_color || '#34a853';
                  
                  // Helper to resolve homework pages for a textbook
                  const getLehrwerkHomeworkPages = (lehrwerkId: string | number, lehrwerkTitle: string): string[] => {
                    const assignment = safeLocalProgress.find((p: any) => 
                      String(p.studentId) === String(studentId) && 
                      (String(p.lehrwerkId) === String(lehrwerkId) || (p.title && String(p.title).toLowerCase() === String(lehrwerkTitle).toLowerCase()))
                    );
                    const pages: string[] = [];
                    if (assignment && assignment.pageStates) {
                      Object.entries(assignment.pageStates).forEach(([pStr, pState]: [string, any]) => {
                        if (pState?.status === 'homework' || pState?.isCurrentHomework) {
                          pages.push(pStr);
                        }
                      });
                    }
                    (progressItems || []).forEach((pi: any) => {
                      if (pi.is_current_homework) {
                        const topic = (pi.topic_name || '').toLowerCase();
                        if (topic.includes(String(lehrwerkTitle).toLowerCase())) {
                           const match = topic.match(/seite\s*(\d+)/i) || topic.match(/s\.\s*(\d+)/i);
                          if (match && match[1] && !pages.includes(match[1])) {
                            pages.push(match[1]);
                          } else if (pages.length === 0) {
                            pages.push('Aktiv');
                          }
                        }
                      }
                    });
                    return pages.sort((a, b) => Number(a) - Number(b));
                  };

                  // 🛡️ Deduplicate active songs and textbooks to prevent duplicate cards & phantom counts
                  const uniqueAssignedSongs = deduplicateBy(
                    assignedCampusSongs.filter(song => !isSongMastered(song)),
                    song => song.title || String(song.id)
                  );

                  const uniqueAssignedLehrwerke = deduplicateBy(
                    lehrwerke.filter(item => 
                      safeLocalProgress.some((p: any) => 
                        String(p.studentId) === String(studentId) && 
                        (String(p.lehrwerkId) === String(item.id) || (p.title && String(p.title).toLowerCase() === String(item.title).toLowerCase()))
                      )
                    ),
                    item => item.title || String(item.id)
                  );

                  const homeworkSongs = uniqueAssignedSongs.filter(song => Boolean(song.is_current_homework));
                  const homeworkLehrwerke = uniqueAssignedLehrwerke.filter(lw => getLehrwerkHomeworkPages(lw.id, lw.title).length > 0);
                  const homeworkCount = homeworkSongs.length + homeworkLehrwerke.length;

                  const chipHeight = isMusicStandMode ? '38px' : '32px';
                  const chipPadding = isMusicStandMode ? '0 16px' : '0 14px';
                  const chipFontSize = isMusicStandMode ? '0.84rem' : '0.76rem';

                  return (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: isMusicStandMode ? '10px' : '8px',
                      overflowX: 'auto',
                      padding: '2px 0',
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                      width: '100%'
                    }}>
                      <button
                        type="button"
                        onClick={() => setJuniorMediathekFilter('all')}
                        style={{
                          height: chipHeight,
                          padding: chipPadding,
                          borderRadius: '100px',
                          border: juniorMediathekFilter === 'all' ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                          background: juniorMediathekFilter === 'all' ? '#dcfce7' : '#ffffff',
                          color: juniorMediathekFilter === 'all' ? '#15803d' : '#64748b',
                          fontWeight: 750,
                          fontSize: chipFontSize,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          boxShadow: juniorMediathekFilter === 'all' ? '0 2px 8px rgba(34, 197, 94, 0.15)' : '0 1px 2px rgba(0,0,0,0.02)'
                        }}
                      >
                        <span>Alles ({uniqueAssignedSongs.length + uniqueAssignedLehrwerke.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setJuniorMediathekFilter('songs')}
                        style={{
                          height: chipHeight,
                          padding: chipPadding,
                          borderRadius: '100px',
                          border: juniorMediathekFilter === 'songs' ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                          background: juniorMediathekFilter === 'songs' ? '#dcfce7' : '#ffffff',
                          color: juniorMediathekFilter === 'songs' ? '#15803d' : '#64748b',
                          fontWeight: 750,
                          fontSize: chipFontSize,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          boxShadow: juniorMediathekFilter === 'songs' ? '0 2px 8px rgba(34, 197, 94, 0.15)' : '0 1px 2px rgba(0,0,0,0.02)'
                        }}
                      >
                        <Music size={isMusicStandMode ? 15 : 13} />
                        <span>Songs ({uniqueAssignedSongs.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setJuniorMediathekFilter('lehrwerke')}
                        style={{
                          height: chipHeight,
                          padding: chipPadding,
                          borderRadius: '100px',
                          border: juniorMediathekFilter === 'lehrwerke' ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                          background: juniorMediathekFilter === 'lehrwerke' ? '#dcfce7' : '#ffffff',
                          color: juniorMediathekFilter === 'lehrwerke' ? '#15803d' : '#64748b',
                          fontWeight: 750,
                          fontSize: chipFontSize,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          boxShadow: juniorMediathekFilter === 'lehrwerke' ? '0 2px 8px rgba(34, 197, 94, 0.15)' : '0 1px 2px rgba(0,0,0,0.02)'
                        }}
                      >
                        <Library size={isMusicStandMode ? 15 : 13} />
                        <span>Lehrwerke ({uniqueAssignedLehrwerke.length})</span>
                      </button>

                      {homeworkCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setJuniorMediathekFilter('homework')}
                          style={{
                            height: chipHeight,
                            padding: chipPadding,
                            borderRadius: '100px',
                            border: juniorMediathekFilter === 'homework' ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                            background: juniorMediathekFilter === 'homework' ? '#e0f2fe' : '#ffffff',
                            color: juniorMediathekFilter === 'homework' ? '#0284c7' : '#64748b',
                            fontWeight: 750,
                            fontSize: chipFontSize,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: juniorMediathekFilter === 'homework' ? '0 2px 8px rgba(2, 132, 199, 0.15)' : '0 1px 2px rgba(0,0,0,0.02)'
                          }}
                        >
                          <Star size={isMusicStandMode ? 15 : 13} color="#0284c7" fill="#0284c7" />
                          <span>Hausaufgabe ({homeworkCount})</span>
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* Unified Smart Search Field */}
                <div style={{ position: 'relative', width: '100%' }}>
                  <Search 
                    size={isMusicStandMode ? 17 : 14} 
                    color="#94a3b8" 
                    style={{ position: 'absolute', left: isMusicStandMode ? '16px' : '13px', top: '50%', transform: 'translateY(-50%)' }} 
                  />
                  <input 
                    placeholder="Songs oder Lehrwerke suchen…" 
                    value={songSearch}
                    onChange={e => setSongSearch(e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: isMusicStandMode ? '11px 16px 11px 44px' : '8px 14px 8px 36px', 
                      borderRadius: isMusicStandMode ? '14px' : '11px', 
                      border: '1px solid #e2e8f0', 
                      background: '#f8fafc', 
                      fontWeight: 600, 
                      fontSize: isMusicStandMode ? '0.94rem' : '0.82rem', 
                      outline: 'none', 
                      transition: 'all 0.2s', 
                      boxSizing: 'border-box',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                    }}
                  />
                </div>

                {/* Apple-Style Curated Playlist Flow */}
                {(() => {
                  const brandColor = studentUser?.schools?.brand_color || '#34a853';

                  // Helper to resolve homework pages for a textbook
                  const getLehrwerkHomeworkPages = (lehrwerkId: string | number, lehrwerkTitle: string): string[] => {
                    const assignment = safeLocalProgress.find((p: any) => 
                      String(p.studentId) === String(studentId) && 
                      (String(p.lehrwerkId) === String(lehrwerkId) || (p.title && String(p.title).toLowerCase() === String(lehrwerkTitle).toLowerCase()))
                    );
                    const pages: string[] = [];
                    if (assignment && assignment.pageStates) {
                      Object.entries(assignment.pageStates).forEach(([pStr, pState]: [string, any]) => {
                        if (pState?.status === 'homework' || pState?.isCurrentHomework) {
                          pages.push(pStr);
                        }
                      });
                    }
                    (progressItems || []).forEach((pi: any) => {
                      if (pi.is_current_homework) {
                        const topic = (pi.topic_name || '').toLowerCase();
                        if (topic.includes(String(lehrwerkTitle).toLowerCase())) {
                          const match = topic.match(/seite\s*(\d+)/i) || topic.match(/s\.\s*(\d+)/i);
                          if (match && match[1] && !pages.includes(match[1])) {
                            pages.push(match[1]);
                          } else if (pages.length === 0) {
                            pages.push('Aktiv');
                          }
                        }
                      }
                    });
                    return pages.sort((a, b) => Number(a) - Number(b));
                  };
                  
                  // 🛡️ Deduplicate active songs and textbooks (Single Source of Truth)
                  const uniqueAssignedSongs = deduplicateBy(
                    assignedCampusSongs.filter(song => !isSongMastered(song)),
                    song => song.title || String(song.id)
                  );

                  const uniqueAssignedLehrwerke = deduplicateBy(
                    lehrwerke.filter(item => 
                      safeLocalProgress.some((p: any) => 
                        String(p.studentId) === String(studentId) && 
                        (String(p.lehrwerkId) === String(item.id) || (p.title && String(p.title).toLowerCase() === String(item.title).toLowerCase()))
                      )
                    ),
                    item => item.title || String(item.id)
                  );

                  // Filter and sort songs (active mission pinned to #1 per user alignment)
                  const filteredSongs = uniqueAssignedSongs.filter(song => {
                    const matchesSearch = songSearchDebounced === '' || 
                      song.title?.toLowerCase().includes(songSearchDebounced.toLowerCase()) || 
                      (song.artist && song.artist.toLowerCase().includes(songSearchDebounced.toLowerCase()));
                    const matchesHomework = juniorMediathekFilter !== 'homework' || Boolean(song.is_current_homework);
                    return matchesSearch && matchesHomework;
                  }).sort((a, b) => {
                    const aIsHw = Boolean(a.is_current_homework);
                    const bIsHw = Boolean(b.is_current_homework);
                    if (aIsHw && !bIsHw) return -1;
                    if (!aIsHw && bIsHw) return 1;
                    return (a.title || '').localeCompare(b.title || '', 'de', { sensitivity: 'base' });
                  });

                  // Filter and sort textbooks (active homework pinned to #1, includes active homework filter)
                  const filteredLehrwerke = uniqueAssignedLehrwerke.filter(item => {
                    const matchesSearch = songSearchDebounced === '' || 
                      item.title?.toLowerCase().includes(songSearchDebounced.toLowerCase()) || 
                      (item.author && item.author.toLowerCase().includes(songSearchDebounced.toLowerCase()));
                    const hwPages = getLehrwerkHomeworkPages(item.id, item.title);
                    const matchesHomework = juniorMediathekFilter !== 'homework' || hwPages.length > 0;
                    return matchesSearch && matchesHomework;
                  }).sort((a, b) => {
                    const aHw = getLehrwerkHomeworkPages(a.id, a.title).length > 0;
                    const bHw = getLehrwerkHomeworkPages(b.id, b.title).length > 0;
                    if (aHw && !bHw) return -1;
                    if (!aHw && bHw) return 1;
                    return (a.title || '').localeCompare(b.title || '', 'de', { sensitivity: 'base' });
                  });

                  // Find primary active mission song for Hero Spotlight Card
                  const activeMissionSong = uniqueAssignedSongs.find(song => Boolean(song.is_current_homework));

                  const showSongsSection = juniorMediathekFilter === 'all' || juniorMediathekFilter === 'songs' || (juniorMediathekFilter === 'homework' && filteredSongs.length > 0);
                  const showLehrwerkeSection = juniorMediathekFilter === 'all' || juniorMediathekFilter === 'lehrwerke' || (juniorMediathekFilter === 'homework' && filteredLehrwerke.length > 0);

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: isMusicStandMode ? '20px' : '16px', width: '100%' }}>
                      
                      {/* 🏛️ 1% Goldstandard Slim Hero Spotlight: "Deine heutige Mission" */}
                      {activeMissionSong && (
                        <div 
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedSongForDetail(activeMissionSong)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedSongForDetail(activeMissionSong);
                            }
                          }}
                          style={{
                            background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 65%, #dcfce7 100%)',
                            borderRadius: isMusicStandMode ? '22px' : '18px',
                            padding: isMusicStandMode ? '16px 20px' : (isMobile ? '14px 16px' : '12px 18px'),
                            color: '#0f172a',
                            position: 'relative',
                            overflow: 'hidden',
                            boxShadow: '0 8px 24px -4px rgba(34, 197, 94, 0.10), 0 2px 8px -2px rgba(0, 0, 0, 0.02)',
                            display: 'flex',
                            flexDirection: isMobile ? 'column' : 'row',
                            alignItems: isMobile ? 'stretch' : 'center',
                            justifyContent: 'space-between',
                            gap: isMobile ? '12px' : '16px',
                            cursor: 'pointer',
                            border: '1.5px solid #86efac',
                            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                          }}
                          className="hover-scale-subtle"
                        >
                          {/* Ambient soft glow accent */}
                          <div style={{
                            position: 'absolute',
                            top: '-30px',
                            right: '-30px',
                            width: '180px',
                            height: '180px',
                            background: 'radial-gradient(circle, rgba(34, 197, 94, 0.16) 0%, transparent 70%)',
                            pointerEvents: 'none'
                          }} />

                          {/* Hero Main Content (Cover + Titles + Tag) */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: isMusicStandMode ? '16px' : '14px', zIndex: 2, flex: 1, minWidth: 0 }}>
                            {renderSongVinylCover(getSongColor(activeMissionSong.title || ''), isMusicStandMode ? 'md' : 'sm')}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '2px 8px', borderRadius: '100px', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: '3px' }}>
                                <Sparkles size={10} color="#15803d" />
                                <span>Deine heutige Mission</span>
                              </div>
                              <h3 
                                title={activeMissionSong.title}
                                style={{ 
                                  margin: 0, 
                                  fontSize: isMusicStandMode ? '1.20rem' : '1.05rem', 
                                  fontWeight: 850, 
                                  color: '#0f172a', 
                                  letterSpacing: '-0.01em', 
                                  lineHeight: 1.25,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {activeMissionSong.title}
                              </h3>
                              <p 
                                title={normalizeArtistName(activeMissionSong.artist)}
                                style={{ 
                                  margin: '1px 0 0 0', 
                                  fontSize: isMusicStandMode ? '0.84rem' : '0.76rem', 
                                  color: '#15803d', 
                                  fontWeight: 650,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                von {normalizeArtistName(activeMissionSong.artist)}
                              </p>
                            </div>
                          </div>

                          {/* Action Button inside Hero Card */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', zIndex: 2, flexShrink: 0 }}>
                            {!isMobile && (
                              <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 700 }}>Details →</span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTopic(activeMissionSong.title);
                                handleTabChangeLocal('practice');
                              }}
                              style={{
                                height: isMusicStandMode ? '42px' : '36px',
                                minWidth: isMobile ? '100%' : '140px',
                                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                color: '#ffffff',
                                border: 'none',
                                padding: isMusicStandMode ? '0 18px' : '0 14px',
                                borderRadius: '12px',
                                fontWeight: 850,
                                fontSize: isMusicStandMode ? '0.92rem' : '0.82rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 14px -2px rgba(34, 197, 94, 0.32)',
                                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                              }}
                              className="hover-scale"
                            >
                              <Play size={isMusicStandMode ? 14 : 12} fill="white" color="white" />
                              <span>Jetzt üben</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* SECTION 1: SONGS (Resilient 2-Column Grid) */}
                      {showSongsSection && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: isMusicStandMode ? '12px' : '8px', width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: isMusicStandMode ? '1.15rem' : '0.98rem', fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Music size={isMusicStandMode ? 16 : 14} color={brandColor} /> Songs ({filteredSongs.length})
                            </h3>
                          </div>

                          {filteredSongs.length === 0 ? (
                            <div style={{ padding: isMusicStandMode ? '22px' : '16px', textAlign: 'center', color: '#94a3b8', fontSize: isMusicStandMode ? '0.88rem' : '0.78rem', fontStyle: 'italic', background: '#f8fafc', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                              Keine Songs in dieser Auswahl gefunden.
                            </div>
                          ) : (
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(310px, 1fr))',
                              gap: isMusicStandMode ? '12px' : '10px',
                              width: '100%'
                            }}>
                              {filteredSongs.map(song => {
                                const lwColor = getSongColor(song.title || '');

                                // Check progress status
                                const progressItem = progressItems.find(item => 
                                  item.topic_name.toLowerCase() === song.title.toLowerCase() ||
                                  item.topic_name.toLowerCase().includes(song.title.toLowerCase())
                                );

                                let statusColor = '';
                                let statusBg = '';
                                let statusText = '';

                                if (song.is_current_homework) {
                                  statusColor = '#0284c7';
                                  statusBg = '#e0f2fe';
                                  statusText = 'Hausaufgabe';
                                } else if (progressItem) {
                                  if (progressItem.is_current_homework) {
                                    statusColor = '#0284c7';
                                    statusBg = '#e0f2fe';
                                    statusText = 'Hausaufgabe';
                                  } else if (progressItem.status === 'THEORY_DONE') {
                                    statusColor = '#7c3aed';
                                    statusBg = '#f3e8ff';
                                    statusText = 'Theorie';
                                  } else if (progressItem.status === 'MASTERED') {
                                    statusColor = '#15803d';
                                    statusBg = '#dcfce7';
                                    statusText = 'Meister!';
                                  } else {
                                    statusColor = '#15803d';
                                    statusBg = '#dcfce7';
                                    statusText = 'In Arbeit';
                                  }
                                }

                                return (
                                  <div 
                                    key={song.id} 
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setSelectedSongForDetail(song)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setSelectedSongForDetail(song);
                                      }
                                    }}
                                    className="hover-scale-subtle"
                                    style={{ 
                                      padding: isMusicStandMode ? '12px 14px' : '10px 12px', 
                                      display: 'flex', 
                                      gap: isMusicStandMode ? '12px' : '10px',
                                      alignItems: 'center', 
                                      background: '#ffffff', 
                                      borderRadius: '16px', 
                                      border: song.is_current_homework ? '1.5px solid #bae6fd' : '1px solid #e2e8f0', 
                                      boxShadow: song.is_current_homework 
                                        ? '0 4px 14px -2px rgba(2, 132, 199, 0.08), 0 1px 4px rgba(0, 0, 0, 0.02)' 
                                        : '0 2px 8px -2px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.02)', 
                                      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                                      minHeight: isMusicStandMode ? '72px' : '62px',
                                      boxSizing: 'border-box',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {/* Pastel Sleeve + Vinyl peeking out Cover */}
                                    {renderSongVinylCover(lwColor, isMusicStandMode ? 'md' : 'sm')}

                                    {/* Title and Artist (Protected 1-Line Truncation) */}
                                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <div 
                                        title={song.title}
                                        style={{ 
                                          fontWeight: 800, 
                                          color: '#0f172a', 
                                          fontSize: isMusicStandMode ? '0.98rem' : '0.88rem', 
                                          letterSpacing: '-0.01em', 
                                          lineHeight: '1.25', 
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis'
                                        }}
                                      >
                                        {song.title}
                                      </div>
                                      <div 
                                        title={normalizeArtistName(song.artist)}
                                        style={{ 
                                          fontSize: isMusicStandMode ? '0.78rem' : '0.72rem', 
                                          fontWeight: 600, 
                                          color: '#64748b', 
                                          lineHeight: '1.2', 
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis'
                                        }}
                                      >
                                        von {normalizeArtistName(song.artist)}
                                      </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                      {progressItem?.status === 'MASTERED' && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setCertificateSong({
                                              ...song,
                                              masteredDate: progressItem?.updated_at || progressItem?.created_at,
                                              certificateId: `MW-${new Date().getFullYear()}-${song.id.substring(0, 6).toUpperCase()}-100`
                                            });
                                          }}
                                          style={{
                                            background: '#fef3c7',
                                            color: '#92400e',
                                            border: '1px solid #fde68a',
                                            borderRadius: '8px',
                                            padding: isMusicStandMode ? '4px 8px' : '3px 7px',
                                            fontSize: isMusicStandMode ? '0.74rem' : '0.64rem',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                            boxShadow: '0 2px 4px rgba(202, 138, 4, 0.12)'
                                          }}
                                          title="Offizielle Meisterwerk-Goldurkunde öffnen"
                                        >
                                          <Award size={isMusicStandMode ? 13 : 11} />
                                          <span>Urkunde</span>
                                        </button>
                                      )}

                                      {statusText && (
                                        <span style={{
                                          background: statusBg,
                                          color: statusColor,
                                          padding: isMusicStandMode ? '3px 9px' : '2px 7px',
                                          borderRadius: '100px',
                                          fontSize: isMusicStandMode ? '0.72rem' : '0.64rem',
                                          fontWeight: 800,
                                          textTransform: 'uppercase',
                                          whiteSpace: 'nowrap',
                                          alignSelf: 'center',
                                          flexShrink: 0,
                                          border: statusColor === '#0284c7' ? '1px solid #bae6fd' : '1px solid rgba(0,0,0,0.05)',
                                          boxShadow: statusColor === '#0284c7' ? '0 2px 6px rgba(2, 132, 199, 0.12)' : 'none'
                                        }}>
                                          {statusText}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* SECTION 2: LEHRWERKE (Resilient 2-Column Grid) */}
                      {showLehrwerkeSection && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: isMusicStandMode ? '12px' : '8px', width: '100%', marginTop: showSongsSection ? '4px' : '0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: isMusicStandMode ? '1.15rem' : '0.98rem', fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Library size={isMusicStandMode ? 16 : 14} color={brandColor} /> Lehrwerke ({filteredLehrwerke.length})
                            </h3>
                          </div>

                          {filteredLehrwerke.length === 0 ? (
                            <div style={{ padding: isMusicStandMode ? '22px' : '16px', textAlign: 'center', color: '#94a3b8', fontSize: isMusicStandMode ? '0.88rem' : '0.78rem', fontStyle: 'italic', background: '#f8fafc', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                              Keine Lehrwerke in dieser Auswahl gefunden.
                            </div>
                          ) : (
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(310px, 1fr))',
                              gap: isMusicStandMode ? '12px' : '10px',
                              width: '100%'
                            }}>
                              {filteredLehrwerke.map(item => {
                                const gradient = getLehrwerkColor(item.title, lehrwerke);
                                const hwPages = getLehrwerkHomeworkPages(item.id, item.title);
                                const hasHomework = hwPages.length > 0;
                                
                                // Check textbook progress
                                const assignment = safeLocalProgress.find((p: any) => 
                                  String(p.studentId) === String(studentId) && 
                                  (String(p.lehrwerkId) === String(item.id) || (p.title && String(p.title).toLowerCase() === String(item.title).toLowerCase()))
                                );
                                let masteredCount = 0;
                                if (assignment && assignment.pageStates) {
                                  masteredCount = Object.values(assignment.pageStates).filter((s: any) => s.status === 'mastered').length;
                                }
                                const totalP = item.totalPages || 50;
                                const pct = totalP > 0 ? (masteredCount / totalP) : 0;

                                return (
                                  <div 
                                    key={item.id} 
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setSelectedLehrwerkForDetail(item)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setSelectedLehrwerkForDetail(item);
                                      }
                                    }}
                                    className="hover-scale-subtle" 
                                    style={{ 
                                      padding: isMusicStandMode ? '12px 14px' : '10px 12px', 
                                      background: '#ffffff', 
                                      display: 'flex', 
                                      gap: isMusicStandMode ? '12px' : '10px', 
                                      alignItems: 'center', 
                                      borderRadius: '16px', 
                                      border: hasHomework ? '1.5px solid #bae6fd' : '1px solid #e2e8f0', 
                                      boxShadow: hasHomework
                                        ? '0 4px 14px -2px rgba(2, 132, 199, 0.08), 0 1px 4px rgba(0, 0, 0, 0.02)'
                                        : '0 2px 8px -2px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.02)',
                                      position: 'relative',
                                      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                                      minHeight: isMusicStandMode ? '72px' : '62px',
                                      boxSizing: 'border-box',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <div style={{ 
                                      width: isMusicStandMode ? '40px' : '36px', 
                                      height: isMusicStandMode ? '48px' : '44px', 
                                      background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`, 
                                      borderRadius: '8px', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center', 
                                      color: gradient.text, 
                                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                                      flexShrink: 0
                                    }}>
                                      <BookOpen size={isMusicStandMode ? 18 : 16} color={gradient.text} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                        <h4 
                                          title={item.title}
                                          style={{ 
                                            margin: 0, 
                                            fontSize: isMusicStandMode ? '0.98rem' : '0.88rem', 
                                            fontWeight: 800, 
                                            color: '#1e293b', 
                                            lineHeight: '1.25', 
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                          }}
                                        >
                                          {item.title}
                                        </h4>
                                        {hasHomework && (
                                          <span style={{
                                            background: '#e0f2fe',
                                            color: '#0284c7',
                                            padding: isMusicStandMode ? '2px 8px' : '2px 6px',
                                            borderRadius: '100px',
                                            fontSize: isMusicStandMode ? '0.70rem' : '0.62rem',
                                            fontWeight: 800,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                            border: '1px solid #bae6fd',
                                            whiteSpace: 'nowrap',
                                            flexShrink: 0,
                                            boxShadow: '0 2px 4px rgba(2, 132, 199, 0.10)'
                                          }}>
                                            <Star size={isMusicStandMode ? 10 : 9} color="#0284c7" fill="#0284c7" />
                                            <span>{hwPages.length === 1 && !isNaN(Number(hwPages[0])) ? `S. ${hwPages[0]}` : 'Hausaufgabe'}</span>
                                          </span>
                                        )}
                                      </div>
                                      {item.author && (
                                        <p 
                                          title={normalizeArtistName(item.author)}
                                          style={{ 
                                            margin: '1px 0 0 0', 
                                            fontSize: isMusicStandMode ? '0.78rem' : '0.72rem', 
                                            color: '#64748b', 
                                            fontWeight: 600, 
                                            lineHeight: '1.2', 
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                          }}
                                        >
                                          von {normalizeArtistName(item.author)}
                                        </p>
                                      )}
                                      
                                      {masteredCount > 0 && (
                                        <div style={{ marginTop: '4px' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMusicStandMode ? '0.70rem' : '0.62rem', color: '#64748b', fontWeight: 700, marginBottom: '2px' }}>
                                            <span>{masteredCount} / {totalP} Seiten</span>
                                            <span>{Math.round(pct * 100)}%</span>
                                          </div>
                                          <div style={{ width: '100%', height: isMusicStandMode ? '5px' : '3px', borderRadius: '3px', background: '#e2e8f0', overflow: 'hidden' }}>
                                            <div style={{ width: `${Math.min(100, pct * 100)}%`, height: '100%', background: gradient.from, borderRadius: '3px' }} />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* RIGHT COLUMN: MEINE ERFOLGE WIDGET */}
              <div style={{
                background: 'linear-gradient(180deg, #ffffff 0%, #fbfdfc 100%)',
                border: '1px solid #e2e8f0',
                borderRadius: isMusicStandMode ? '26px' : '20px',
                padding: isMusicStandMode ? '20px 18px' : (isMobile ? '16px 14px' : '18px'),
                boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.03)',
                boxSizing: 'border-box',
                maxWidth: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: isMusicStandMode ? '16px' : '14px'
              }}>
                <div>
                  <h4 style={{ fontSize: isMusicStandMode ? '1.15rem' : '1.0rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontWeight: 900 }}>
                    <div style={{ 
                      background: '#fef3c7', 
                      padding: isMusicStandMode ? '6px' : '5px', 
                      borderRadius: isMusicStandMode ? '10px' : '8px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      border: '1px solid #fde68a' 
                    }}>
                      <Trophy size={isMusicStandMode ? 18 : 15} color="#d97706" fill="#d97706" />
                    </div>
                    <span>Meine Erfolge</span>
                  </h4>
                  <p style={{ color: '#64748b', fontSize: isMusicStandMode ? '0.82rem' : '0.72rem', margin: '3px 0 0 0', fontWeight: 600 }}>
                    Deine gesammelten Meilensteine
                  </p>
                </div>

                {/* List of Mastered Songs & Lehrwerke */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: isMusicStandMode ? '16px' : '12px' }}>
                  {/* Mastered Songs Section */}
                  <div>
                    <h5 style={{ fontSize: isMusicStandMode ? '0.78rem' : '0.68rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      🏆 Gemeisterte Songs
                    </h5>
                    {(() => {
                      const masteredSongsMap = new Map<string, any>();

                      // 1. From assignedCampusSongs
                      assignedCampusSongs.forEach(song => {
                        if (isSongMastered(song)) {
                          const key = (song.title || '').toLowerCase().trim();
                          if (key) {
                            masteredSongsMap.set(key, {
                              ...song,
                              artist: normalizeArtistName(song.artist),
                              status: 'MASTERED',
                              progress_percent: 100
                            });
                          }
                        }
                      });

                      // 2. From progressItems
                      (progressItems || []).forEach((item: any) => {
                        if (item.status === 'MASTERED' || item.progress_percent === 100) {
                          const raw = (item.topic_name || item.title || '').trim();
                          if (raw && !raw.startsWith('Hausaufgabe KW ') && !raw.includes(' - Seite ')) {
                            const clean = raw.replace(/\s*\([^)]*\)\s*$/, '').trim();
                            const key = clean.toLowerCase();
                            if (!masteredSongsMap.has(key)) {
                              masteredSongsMap.set(key, {
                                id: item.song_id || item.id || key,
                                title: clean,
                                artist: 'Unbekannt',
                                status: 'MASTERED',
                                progress_percent: 100,
                                is_campus_active: true
                              });
                            }
                          }
                        }
                      });

                      // 3. From activeSongSkills
                      (activeSongSkills || []).forEach((skill: any) => {
                        if (skill.is_stage_ready || skill.progress_percent === 100 || skill.status === 'MASTERED') {
                          const title = skill.songs?.title || skill.title || skill.song_title;
                          const artist = skill.songs?.artist || skill.artist || 'Unbekannt';
                          if (title) {
                            const key = title.toLowerCase().trim();
                            if (!masteredSongsMap.has(key)) {
                              masteredSongsMap.set(key, {
                                id: skill.songs?.id || skill.song_id || skill.id || key,
                                title,
                                artist: normalizeArtistName(artist),
                                status: 'MASTERED',
                                progress_percent: 100,
                                is_campus_active: true
                              });
                            }
                          }
                        }
                      });

                      const masteredSongsList = Array.from(masteredSongsMap.values());

                      if (masteredSongsList.length === 0) {
                        return (
                          <div style={{ padding: isMusicStandMode ? '14px' : '10px', textAlign: 'center', color: '#94a3b8', fontSize: isMusicStandMode ? '0.80rem' : '0.70rem', fontStyle: 'italic', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                            Noch keine Meisterwerke.
                          </div>
                        );
                      }

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {masteredSongsList.map(song => {
                            const lwColor = getSongColor(song.title);
                            return (
                              <div 
                                key={song.id || song.title} 
                                role="button"
                                tabIndex={0}
                                onClick={() => setSelectedSongForDetail(song)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setSelectedSongForDetail(song);
                                  }
                                }}
                                className="hover-scale-subtle"
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: isMusicStandMode ? '10px' : '8px', 
                                  background: '#ffffff', 
                                  padding: isMusicStandMode ? '8px 10px' : '6px 8px', 
                                  borderRadius: isMusicStandMode ? '14px' : '12px', 
                                  border: '1px solid #f1f5f9', 
                                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)', 
                                  cursor: 'pointer'
                                }}
                              >
                                {renderSongVinylCover(lwColor, 'sm')}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div 
                                    title={song.title}
                                    style={{ 
                                      fontSize: isMusicStandMode ? '0.88rem' : '0.78rem', 
                                      fontWeight: 800, 
                                      color: '#0f172a', 
                                      lineHeight: '1.25', 
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}
                                  >
                                    {song.title}
                                  </div>
                                  <div 
                                    title={song.artist}
                                    style={{ 
                                      fontSize: isMusicStandMode ? '0.74rem' : '0.66rem', 
                                      fontWeight: 600, 
                                      color: '#64748b', 
                                      lineHeight: '1.2', 
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis', 
                                      marginTop: '1px' 
                                    }}
                                  >
                                    von {song.artist}
                                  </div>
                                </div>
                                <div style={{
                                  background: '#dcfce7',
                                  color: '#15803d',
                                  padding: isMusicStandMode ? '2px 7px' : '2px 5px',
                                  borderRadius: '100px',
                                  fontSize: isMusicStandMode ? '0.70rem' : '0.60rem',
                                  fontWeight: 800,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  flexShrink: 0,
                                  border: '1px solid #86efac'
                                }}>
                                  <span>🏆</span>
                                  <span>100%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Mastered / Completed Lehrwerke Section */}
                  <div>
                    <h5 style={{ fontSize: isMusicStandMode ? '0.78rem' : '0.68rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      📚 Gemeisterte Lehrwerke
                    </h5>
                    {(() => {
                      const studentAssignments = safeLocalProgress.filter((p: any) => String(p.studentId) === String(studentId));
                      const assignedLehrwerke = deduplicateBy(
                        lehrwerke.filter(book => studentAssignments.some((p: any) => 
                          String(p.lehrwerkId) === String(book.id) || 
                          (p.title && String(p.title).toLowerCase() === String(book.title).toLowerCase())
                        )),
                        b => b.title || String(b.id)
                      );

                      // Filter for 100% completed textbooks
                      const completedBooks = assignedLehrwerke.map(book => {
                        const assignment = studentAssignments.find((p: any) => 
                          String(p.lehrwerkId) === String(book.id) || 
                          (p.title && String(p.title).toLowerCase() === String(book.title).toLowerCase())
                        );
                        let masteredCount = 0;
                        if (assignment && assignment.pageStates) {
                          masteredCount = Object.values(assignment.pageStates).filter((s: any) => s.status === 'mastered').length;
                        }
                        const total = book.totalPages || 50;
                        const pct = total > 0 ? (masteredCount / total) : 0;
                        return { book, masteredCount, total, pct };
                      }).filter(item => item.pct >= 1);

                      // If no textbooks are 100% mastered yet: Render the motivating "Nächstes Meilenstein-Ziel" widget per user alignment
                      if (completedBooks.length === 0) {
                        const inProgressBooks = assignedLehrwerke.map(book => {
                          const assignment = studentAssignments.find((p: any) => 
                            String(p.lehrwerkId) === String(book.id) || 
                            (p.title && String(p.title).toLowerCase() === String(book.title).toLowerCase())
                          );
                          let masteredCount = 0;
                          if (assignment && assignment.pageStates) {
                            masteredCount = Object.values(assignment.pageStates).filter((s: any) => s.status === 'mastered').length;
                          }
                          const total = book.totalPages || 50;
                          const pct = total > 0 ? (masteredCount / total) : 0;
                          return { book, masteredCount, total, pct };
                        }).sort((a, b) => b.pct - a.pct);

                        const topBook = inProgressBooks[0];

                        if (topBook) {
                          const gradient = getLehrwerkColor(topBook.book.title, lehrwerke);
                          const remainingPages = Math.max(0, topBook.total - topBook.masteredCount);

                          return (
                            <div 
                              role="button"
                              tabIndex={0}
                              onClick={() => setSelectedLehrwerkForDetail(topBook.book)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setSelectedLehrwerkForDetail(topBook.book);
                                }
                              }}
                              className="hover-scale-subtle"
                              style={{
                                background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
                                borderRadius: isMusicStandMode ? '16px' : '14px',
                                border: '1.5px solid #86efac',
                                padding: isMusicStandMode ? '12px 14px' : '10px 12px',
                                boxShadow: '0 2px 8px -2px rgba(34, 197, 94, 0.08)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                cursor: 'pointer'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{
                                  background: '#dcfce7',
                                  color: '#15803d',
                                  fontSize: isMusicStandMode ? '0.70rem' : '0.62rem',
                                  fontWeight: 800,
                                  padding: '2px 7px',
                                  borderRadius: '100px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.02em'
                                }}>
                                  <Target size={10} color="#15803d" />
                                  <span>Nächstes Ziel</span>
                                </div>
                                <span style={{ fontSize: isMusicStandMode ? '0.72rem' : '0.64rem', color: '#16a34a', fontWeight: 800 }}>
                                  {Math.round(topBook.pct * 100)}%
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                  width: '28px',
                                  height: '34px',
                                  background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                                  borderRadius: '5px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: gradient.text,
                                  flexShrink: 0,
                                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                                }}>
                                  <BookOpen size={12} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div 
                                    title={topBook.book.title}
                                    style={{ 
                                      fontSize: isMusicStandMode ? '0.88rem' : '0.78rem', 
                                      fontWeight: 800, 
                                      color: '#0f172a', 
                                      lineHeight: 1.25, 
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}
                                  >
                                    {topBook.book.title}
                                  </div>
                                  <div style={{ fontSize: isMusicStandMode ? '0.74rem' : '0.66rem', fontWeight: 600, color: '#64748b', marginTop: '1px' }}>
                                    {topBook.masteredCount} von {topBook.total} Seiten
                                  </div>
                                </div>
                              </div>

                              {/* Motivational Progress Bar */}
                              <div style={{ width: '100%', height: '5px', borderRadius: '3px', background: '#dcfce7', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.max(6, topBook.pct * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #22c55e, #16a34a)', borderRadius: '3px' }} />
                              </div>

                              <p style={{ margin: 0, fontSize: isMusicStandMode ? '0.76rem' : '0.66rem', color: '#15803d', fontWeight: 750 }}>
                                {topBook.masteredCount > 0 
                                  ? `Noch ${remainingPages} Seiten bis zur Gold-Urkunde! 🎯`
                                  : 'Übe Seite 1, um diesen Meilenstein zu starten! 🚀'}
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div style={{ padding: isMusicStandMode ? '16px' : '12px', textAlign: 'center', color: '#94a3b8', fontSize: isMusicStandMode ? '0.84rem' : '0.72rem', fontStyle: 'italic', background: '#f8fafc', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                            Noch keine Lehrwerke gemeistert.
                          </div>
                        );
                      }

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {completedBooks.map(({ book }) => {
                            const gradient = getLehrwerkColor(book.title, lehrwerke);
                            return (
                              <div 
                                key={book.id} 
                                onClick={() => setSelectedLehrwerkForDetail(book)}
                                className="hover-scale-subtle"
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: isMusicStandMode ? '12px' : '10px', 
                                  background: '#ffffff', 
                                  padding: isMusicStandMode ? '10px 12px' : '8px 10px', 
                                  borderRadius: isMusicStandMode ? '16px' : '14px', 
                                  border: '1px solid #f1f5f9', 
                                  boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
                                  cursor: 'pointer'
                                }}
                              >
                                <div style={{
                                  width: isMusicStandMode ? '34px' : '28px',
                                  height: isMusicStandMode ? '42px' : '34px',
                                  background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                                  borderRadius: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: gradient.text,
                                  flexShrink: 0,
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                                }}>
                                  <BookOpen size={isMusicStandMode ? 16 : 13} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0, fontSize: isMusicStandMode ? '0.92rem' : '0.78rem', fontWeight: 850, color: '#1e293b', lineHeight: '1.25', wordBreak: 'break-word' }}>
                                  {book.title}
                                </div>
                                <div style={{
                                  background: '#dcfce7',
                                  color: '#15803d',
                                  padding: isMusicStandMode ? '3px 8px' : '2px 6px',
                                  borderRadius: '100px',
                                  fontSize: isMusicStandMode ? '0.74rem' : '0.62rem',
                                  fontWeight: 850,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  flexShrink: 0,
                                  border: '1px solid #86efac'
                                }}>
                                  <span>🏆</span>
                                  <span>100%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                </div>
              </div>
            </div>
          )
        )}
      </div>
  );
};
