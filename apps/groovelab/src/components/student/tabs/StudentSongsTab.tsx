import React from "react";
import { Award, BookOpen, Library, Music, Play, Search, Sparkles, Star, Trophy } from "lucide-react";
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
}

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
  localProgress,
  activeSongSkills,
}) => {
  const brandColor = studentUser?.schools?.brand_color || "#34a853";

  return (
      <div id="tour-student-songs" style={{ display: activeTab === 'songs' ? 'flex' : 'none', flexDirection: 'column', gap: '20px' }}>
        {activeTab === 'songs' && (
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
              gridTemplateColumns: isMobile ? '1fr' : '1fr minmax(320px, 350px)',
              gap: isMobile ? '16px' : '24px',
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
                  borderRadius: isMobile ? '24px' : '20px', 
                  border: '1px solid rgba(0, 0, 0, 0.05)', 
                  padding: isMobile ? '16px 14px' : '24px 30px', 
                  boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.02), 0 2px 8px -1px rgba(0, 0, 0, 0.01)',
                  boxSizing: 'border-box',
                  maxWidth: '100%',
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '24px' 
                }}
              >
                {/* Header Area */}
                {(() => {
                  const brandColor = studentUser?.schools?.brand_color || '#34a853';
                  return (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h2 style={{ fontSize: '1.85rem', color: '#18181b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontWeight: 900 }}>
                          <div style={{ background: `${brandColor}15`, color: brandColor, padding: '5px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                            <Library size={20} />
                          </div>
                          <span>Mediathek</span>
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '4px 0 0 0', fontWeight: 600 }}>
                          Deine Songs und Lehrwerke für den Unterricht.
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Apple-Style Filter Chips Bar */}
                {(() => {
                  const brandColor = studentUser?.schools?.brand_color || '#34a853';
                  
                  const activeAssignedSongs = assignedCampusSongs.filter(song => !isSongMastered(song));
                  const assignedLehrwerke = lehrwerke.filter(item => 
                    localProgress.some((p: any) => String(p.studentId) === String(studentId) && String(p.lehrwerkId) === String(item.id))
                  );

                  const homeworkSongs = activeAssignedSongs.filter(song => Boolean(song.is_current_homework));
                  const homeworkCount = homeworkSongs.length;

                  return (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      overflowX: 'auto',
                      padding: '4px 2px',
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                      width: '100%'
                    }}>
                      <button
                        type="button"
                        onClick={() => setJuniorMediathekFilter('all')}
                        style={{
                          height: '38px',
                          padding: '0 18px',
                          borderRadius: '100px',
                          border: juniorMediathekFilter === 'all' ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                          background: juniorMediathekFilter === 'all' ? '#dcfce7' : '#ffffff',
                          color: juniorMediathekFilter === 'all' ? '#15803d' : '#64748b',
                          fontWeight: 850,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          boxShadow: juniorMediathekFilter === 'all' ? '0 4px 12px rgba(34, 197, 94, 0.18)' : '0 1px 3px rgba(0,0,0,0.02)'
                        }}
                      >
                        <span>Alles ({activeAssignedSongs.length + assignedLehrwerke.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setJuniorMediathekFilter('songs')}
                        style={{
                          height: '38px',
                          padding: '0 18px',
                          borderRadius: '100px',
                          border: juniorMediathekFilter === 'songs' ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                          background: juniorMediathekFilter === 'songs' ? '#dcfce7' : '#ffffff',
                          color: juniorMediathekFilter === 'songs' ? '#15803d' : '#64748b',
                          fontWeight: 850,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          boxShadow: juniorMediathekFilter === 'songs' ? '0 4px 12px rgba(34, 197, 94, 0.18)' : '0 1px 3px rgba(0,0,0,0.02)'
                        }}
                      >
                        <Music size={14} />
                        <span>Songs ({activeAssignedSongs.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setJuniorMediathekFilter('lehrwerke')}
                        style={{
                          height: '38px',
                          padding: '0 18px',
                          borderRadius: '100px',
                          border: juniorMediathekFilter === 'lehrwerke' ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                          background: juniorMediathekFilter === 'lehrwerke' ? '#dcfce7' : '#ffffff',
                          color: juniorMediathekFilter === 'lehrwerke' ? '#15803d' : '#64748b',
                          fontWeight: 850,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          boxShadow: juniorMediathekFilter === 'lehrwerke' ? '0 4px 12px rgba(34, 197, 94, 0.18)' : '0 1px 3px rgba(0,0,0,0.02)'
                        }}
                      >
                        <Library size={14} />
                        <span>Lehrwerke ({assignedLehrwerke.length})</span>
                      </button>

                      {homeworkCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setJuniorMediathekFilter('homework')}
                          style={{
                            height: '38px',
                            padding: '0 18px',
                            borderRadius: '100px',
                            border: juniorMediathekFilter === 'homework' ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                            background: juniorMediathekFilter === 'homework' ? '#e0f2fe' : '#ffffff',
                            color: juniorMediathekFilter === 'homework' ? '#0284c7' : '#64748b',
                            fontWeight: 850,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: juniorMediathekFilter === 'homework' ? '0 4px 12px rgba(2, 132, 199, 0.18)' : '0 1px 3px rgba(0,0,0,0.02)'
                          }}
                        >
                          <Star size={14} color="#0284c7" />
                          <span>Hausaufgabe ({homeworkCount})</span>
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* Unified Smart Search Field */}
                <div style={{ position: 'relative', width: '100%' }}>
                  <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    placeholder="Songs oder Lehrwerke suchen…" 
                    value={songSearch}
                    onChange={e => setSongSearch(e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '12px 16px 12px 46px', 
                      borderRadius: '16px', 
                      border: '1px solid #e2e8f0', 
                      background: '#f8fafc', 
                      fontWeight: 650, 
                      fontSize: '0.90rem', 
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
                  
                  const filteredSongs = assignedCampusSongs.filter(song => {
                    // Exclude 100% mastered songs from the active songs list
                    if (isSongMastered(song)) return false;

                    const matchesSearch = songSearchDebounced === '' || 
                      song.title?.toLowerCase().includes(songSearchDebounced.toLowerCase()) || 
                      song.artist?.toLowerCase().includes(songSearchDebounced.toLowerCase());
                    const matchesHomework = juniorMediathekFilter !== 'homework' || Boolean(song.is_current_homework);
                    return matchesSearch && matchesHomework;
                  }).sort((a, b) => (a.title || '').localeCompare(b.title || '', 'de', { sensitivity: 'base' }));

                  const filteredLehrwerke = lehrwerke.filter(item => {
                    const matchesSearch = songSearchDebounced === '' || 
                      item.title?.toLowerCase().includes(songSearchDebounced.toLowerCase()) || 
                      item.author?.toLowerCase().includes(songSearchDebounced.toLowerCase());
                    const isAssigned = localProgress.some((p: any) => String(p.studentId) === String(studentId) && String(p.lehrwerkId) === String(item.id));
                    const matchesFilter = juniorMediathekFilter !== 'homework'; // Lehrwerke do not have current homework flag unless pages mapped
                    return matchesSearch && isAssigned && matchesFilter;
                  });

                  // Find primary active mission song for Hero Spotlight Card
                  const activeMissionSong = filteredSongs.find(song => Boolean(song.is_current_homework));

                  const showSongsSection = juniorMediathekFilter === 'all' || juniorMediathekFilter === 'songs' || juniorMediathekFilter === 'homework';
                  const showLehrwerkeSection = juniorMediathekFilter === 'all' || juniorMediathekFilter === 'lehrwerke';

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                      
                      {/* Apple HIG Luminous Hero Spotlight: "Deine heutige Mission" */}
                      {activeMissionSong && (
                        <div 
                          onClick={() => setSelectedSongForDetail(activeMissionSong)}
                          style={{
                            background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 50%, #dcfce7 100%)',
                            borderRadius: '24px',
                            padding: '22px 24px',
                            color: '#0f172a',
                            position: 'relative',
                            overflow: 'hidden',
                            boxShadow: '0 12px 32px -4px rgba(34, 197, 94, 0.12), 0 4px 16px -2px rgba(0, 0, 0, 0.03)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            cursor: 'pointer',
                            border: '1.5px solid #86efac',
                            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                          }}
                          className="hover-scale-subtle"
                        >
                          {/* Ambient soft glow accent */}
                          <div style={{
                            position: 'absolute',
                            top: '-40px',
                            right: '-40px',
                            width: '200px',
                            height: '200px',
                            background: 'radial-gradient(circle, rgba(34, 197, 94, 0.18) 0%, transparent 70%)',
                            pointerEvents: 'none'
                          }} />

                          {/* Pill Tag */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 }}>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: '#dcfce7',
                              color: '#15803d',
                              border: '1px solid #86efac',
                              padding: '4px 12px',
                              borderRadius: '100px',
                              fontSize: '0.72rem',
                              fontWeight: 850,
                              letterSpacing: '0.03em',
                              textTransform: 'uppercase',
                              boxShadow: '0 2px 6px rgba(34, 197, 94, 0.1)'
                            }}>
                              <Sparkles size={12} color="#15803d" />
                              <span>Deine heutige Mission</span>
                            </div>
                            <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 750 }}>Tippe für Details →</span>
                          </div>

                          {/* Hero Main Content */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', zIndex: 2 }}>
                            {renderSongVinylCover(getSongColor(activeMissionSong.title || ''), 'md')}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.35rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                                {activeMissionSong.title}
                              </h3>
                              <p style={{ margin: 0, fontSize: '0.88rem', color: '#15803d', fontWeight: 750 }}>
                                von {activeMissionSong.artist}
                              </p>
                            </div>
                          </div>

                          {/* Action Button inside Hero Card */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTopic(activeMissionSong.title);
                              handleTabChangeLocal('practice');
                            }}
                            style={{
                              zIndex: 2,
                              width: '100%',
                              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                              color: '#ffffff',
                              border: 'none',
                              padding: '12px 18px',
                              borderRadius: '14px',
                              fontWeight: 900,
                              fontSize: '0.88rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              boxShadow: '0 8px 20px -2px rgba(34, 197, 94, 0.35)',
                              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}
                            className="hover-scale"
                          >
                            <Play size={15} fill="white" color="white" />
                            <span>Jetzt üben (Timer starten)</span>
                          </button>
                        </div>
                      )}

                      {/* SECTION 1: SONGS (Balanced Auto-Fit Grid) */}
                      {showSongsSection && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 850, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Music size={15} color={brandColor} /> Songs ({filteredSongs.length})
                            </h3>
                          </div>

                          {filteredSongs.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem', fontStyle: 'italic', background: '#f8fafc', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                              Keine Songs in dieser Auswahl gefunden.
                            </div>
                          ) : (
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                              gap: '12px',
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

                                if (progressItem) {
                                  if (progressItem.is_current_homework) {
                                    statusColor = '#0284c7';
                                    statusBg = '#e0f2fe';
                                    statusText = 'Aktuelle Mission';
                                  } else if (progressItem.status === 'THEORY_DONE') {
                                    statusColor = '#7c3aed';
                                    statusBg = '#f3e8ff';
                                    statusText = 'Theorie gelesen';
                                  } else if (progressItem.status === 'MASTERED') {
                                    statusColor = '#15803d';
                                    statusBg = '#dcfce7';
                                    statusText = 'Meisterwerk!';
                                  } else {
                                    statusColor = '#15803d';
                                    statusBg = '#dcfce7';
                                    statusText = 'In Arbeit';
                                  }
                                }

                                return (
                                  <div 
                                    key={song.id} 
                                    onClick={() => setSelectedSongForDetail(song)}
                                    className="hover-scale-subtle"
                                    style={{ 
                                      padding: '14px 18px', 
                                      display: 'flex', 
                                      gap: '14px',
                                      alignItems: 'center', 
                                      background: '#ffffff', 
                                      borderRadius: '20px', 
                                      border: '1px solid #e2e8f0', 
                                      boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.02)', 
                                      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                                      minHeight: '84px',
                                      boxSizing: 'border-box',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {/* Pastel Sleeve + Vinyl peeking out Cover */}
                                    {renderSongVinylCover(lwColor, 'sm')}

                                    {/* Title and Artist */}
                                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <div style={{ fontWeight: 850, color: '#0f172a', fontSize: '1.0rem', letterSpacing: '-0.01em', lineHeight: '1.25', wordBreak: 'break-word' }}>{song.title}</div>
                                      <div style={{ fontSize: '0.80rem', fontWeight: 600, color: '#64748b', lineHeight: '1.2', wordBreak: 'break-word' }}>von {song.artist}</div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
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
                                            padding: '4px 10px',
                                            fontSize: '0.70rem',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            boxShadow: '0 2px 6px rgba(202, 138, 4, 0.15)'
                                          }}
                                          title="Offizielle Meisterwerk-Goldurkunde öffnen"
                                        >
                                          <Award size={13} />
                                          <span>Gold-Urkunde</span>
                                        </button>
                                      )}

                                      {statusText && (
                                        <span style={{
                                          background: statusBg,
                                          color: statusColor,
                                          padding: '4px 10px',
                                          borderRadius: '8px',
                                          fontSize: '0.70rem',
                                          fontWeight: 850,
                                          textTransform: 'uppercase',
                                          whiteSpace: 'nowrap',
                                          alignSelf: 'center',
                                          flexShrink: 0,
                                          border: statusColor === '#0284c7' ? '1px solid #bae6fd' : '1px solid rgba(0,0,0,0.05)'
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

                      {/* SECTION 2: LEHRWERKE (Balanced Auto-Fit Grid) */}
                      {showLehrwerkeSection && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: showSongsSection ? '8px' : '0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 850, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Library size={15} color={brandColor} /> Lehrwerke ({filteredLehrwerke.length})
                            </h3>
                          </div>

                          {filteredLehrwerke.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem', fontStyle: 'italic', background: '#f8fafc', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                              Keine Lehrwerke in dieser Auswahl gefunden.
                            </div>
                          ) : (
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                              gap: '12px',
                              width: '100%'
                            }}>
                              {filteredLehrwerke.map(item => {
                                const gradient = getLehrwerkColor(item.title, lehrwerke);
                                
                                // Check textbook progress
                                const assignment = localProgress.find((p: any) => String(p.studentId) === String(studentId) && String(p.lehrwerkId) === String(item.id));
                                let masteredCount = 0;
                                if (assignment && assignment.pageStates) {
                                  masteredCount = Object.values(assignment.pageStates).filter((s: any) => s.status === 'mastered').length;
                                }
                                const pct = item.totalPages > 0 ? (masteredCount / item.totalPages) : 0;

                                return (
                                  <div 
                                    key={item.id} 
                                    onClick={() => setSelectedLehrwerkForDetail(item)}
                                    className="hover-scale-subtle" 
                                    style={{ 
                                      padding: '14px 18px', 
                                      background: '#ffffff', 
                                      display: 'flex', 
                                      gap: '14px', 
                                      alignItems: 'center', 
                                      borderRadius: '20px', 
                                      border: '1px solid #e2e8f0', 
                                      boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.02)',
                                      position: 'relative',
                                      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                                      minHeight: '84px',
                                      boxSizing: 'border-box',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <div style={{ 
                                      width: '42px', 
                                      height: '54px', 
                                      background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`, 
                                      borderRadius: '8px', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center', 
                                      color: gradient.text, 
                                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                      flexShrink: 0
                                    }}>
                                      <BookOpen size={18} color={gradient.text} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <h4 style={{ margin: '0 0 2px 0', fontSize: '0.96rem', fontWeight: 850, color: '#1e293b', lineHeight: '1.25', wordBreak: 'break-word' }}>{item.title}</h4>
                                      {item.author && <p style={{ margin: '0 0 2px 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 600, lineHeight: '1.2', wordBreak: 'break-word' }}>von {item.author}</p>}
                                      
                                      {masteredCount > 0 && (
                                        <div style={{ marginTop: '6px' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', color: '#64748b', fontWeight: 700, marginBottom: '3px' }}>
                                            <span>{masteredCount} / {item.totalPages} Seiten</span>
                                            <span>{Math.round(pct * 100)}%</span>
                                          </div>
                                          <div style={{ width: '100%', height: '4px', borderRadius: '2px', background: '#e2e8f0', overflow: 'hidden' }}>
                                            <div style={{ width: `${Math.min(100, pct * 100)}%`, height: '100%', background: gradient.from, borderRadius: '2px' }} />
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
                borderRadius: '24px',
                padding: isMobile ? '16px 14px' : '22px',
                boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.04)',
                boxSizing: 'border-box',
                maxWidth: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px'
              }}>
                <div>
                  <h4 style={{ fontSize: '1.05rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontWeight: 900 }}>
                    <div style={{ background: '#fef3c7', padding: '6px', borderRadius: '10px', display: 'flex', alignItems: 'center', border: '1px solid #fde68a' }}>
                      <Trophy size={16} color="#d97706" fill="#d97706" />
                    </div>
                    <span>Meine Erfolge</span>
                  </h4>
                  <p style={{ color: '#64748b', fontSize: '0.74rem', margin: '4px 0 0 0', fontWeight: 600 }}>
                    Deine gesammelten Meilensteine
                  </p>
                </div>

                {/* List of Mastered Songs & Lehrwerke */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Mastered Songs Section */}
                  <div>
                    <h5 style={{ fontSize: '0.70rem', fontWeight: 850, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
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
                              status: 'MASTERED',
                              progress_percent: 100
                            });
                          }
                        }
                      });

                      // 2. From progressItems
                      (progressItems || []).forEach(item => {
                        const rawTopic = (item.topic_name || item.title || '').trim();
                        if (!rawTopic || rawTopic.includes(' - Seite ') || rawTopic.startsWith('Hausaufgabe KW ') || rawTopic.toLowerCase() === 'test' || rawTopic.toLowerCase() === 'test - test' || rawTopic.toLowerCase() === 'test-test') return;
                        if (item.status === 'MASTERED' || item.progress_percent === 100) {
                          const cleanT = rawTopic.replace(/\s*\([^)]*\)\s*$/, '').trim();
                          const key = cleanT.toLowerCase();
                          if (!masteredSongsMap.has(key)) {
                            let artist = 'Unbekannt';
                            let title = cleanT;
                            if (cleanT.includes(' - ')) {
                              const parts = cleanT.split(' - ');
                              artist = parts[0].trim();
                              title = parts.slice(1).join(' - ').trim();
                            }
                            masteredSongsMap.set(key, {
                              id: item.song_id || item.id || key,
                              title,
                              artist,
                              status: 'MASTERED',
                              progress_percent: 100,
                              is_campus_active: true
                            });
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
                                artist,
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
                          <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.72rem', fontStyle: 'italic', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
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
                                onClick={() => setSelectedSongForDetail(song)}
                                className="hover-scale-subtle"
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '10px', 
                                  background: '#ffffff', 
                                  padding: '8px 10px', 
                                  borderRadius: '12px', 
                                  border: '1px solid #f1f5f9', 
                                  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)', 
                                  cursor: 'pointer'
                                }}
                              >
                                {renderSongVinylCover(lwColor, 'sm')}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '0.80rem', fontWeight: 850, color: '#0f172a', lineHeight: '1.25', wordBreak: 'break-word' }}>
                                    {song.title}
                                  </div>
                                  <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b', lineHeight: '1.2', wordBreak: 'break-word', marginTop: '1px' }}>
                                    von {song.artist}
                                  </div>
                                </div>
                                <div style={{
                                  background: '#dcfce7',
                                  color: '#15803d',
                                  padding: '2px 6px',
                                  borderRadius: '5px',
                                  fontSize: '0.62rem',
                                  fontWeight: 850,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  flexShrink: 0
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
                    <h5 style={{ fontSize: '0.70rem', fontWeight: 850, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      📚 Gemeisterte Lehrwerke
                    </h5>
                    {(() => {
                      const studentAssignments = localProgress.filter((p: any) => String(p.studentId) === String(studentId));
                      const assignedLehrwerke = lehrwerke.filter(book => studentAssignments.some((p: any) => String(p.lehrwerkId) === String(book.id)));

                      // Filter for 100% completed textbooks
                      const completedBooks = assignedLehrwerke.map(book => {
                        const assignment = studentAssignments.find((p: any) => String(p.lehrwerkId) === String(book.id));
                        let masteredCount = 0;
                        if (assignment && assignment.pageStates) {
                          masteredCount = Object.values(assignment.pageStates).filter((s: any) => s.status === 'mastered').length;
                        }
                        const pct = book.totalPages > 0 ? (masteredCount / book.totalPages) : 0;
                        return { book, masteredCount, pct };
                      }).filter(item => item.pct >= 1);

                      if (completedBooks.length === 0) {
                        return (
                          <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.72rem', fontStyle: 'italic', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                            Noch keine Lehrwerke gemeistert.
                          </div>
                        );
                      }

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {completedBooks.map(({ book }) => {
                            const gradient = getLehrwerkColor(book.title, lehrwerke);
                            const cardBg = '#ffffff';
                            const cardBorder = '1px solid #f1f5f9';

                            return (
                              <div key={book.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: cardBg, padding: '8px 10px', borderRadius: '12px', border: cardBorder, boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
                                <div style={{
                                  width: '28px',
                                  height: '34px',
                                  background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: gradient.text,
                                  flexShrink: 0,
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                                }}>
                                  <BookOpen size={13} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0, fontSize: '0.78rem', fontWeight: 850, color: '#1e293b', lineHeight: '1.25', wordBreak: 'break-word' }}>
                                  {book.title}
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
