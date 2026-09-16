import React, { lazy, Suspense } from 'react';
import { Award, Search, Check } from 'lucide-react';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { APP_INSTRUMENT_ICONS, APP_INSTRUMENT_COLORS, brandColor as defaultBrandColor } from '../../constants/instruments';

const GroupedSongCard = lazy(() => import('../GroupedSongCard').then(m => ({ default: m.GroupedSongCard })));

export interface StudentPracticeRepertoireTabsProps {
  activeStudentTab: 'practice' | 'repertoire';
  user: any;
  userSongs: any[];
  practiceSongs: any[];
  groupedPracticeSongs: any[];
  groupedRepertoireSongs: any[];
  userBands: any[];
  brandColor?: string;
  practiceSearchQuery: string;
  setPracticeSearchQuery: (query: string) => void;
  practiceSearchType: 'title' | 'artist';
  setPracticeSearchType: (type: 'title' | 'artist') => void;
  practiceAlphaFilter: string | null;
  setPracticeAlphaFilter: (letter: string | null) => void;
  expandedSongId: string | null;
  setExpandedSongId: (id: string | null) => void;
  updateProgress: (skillId: string, newProgress: number) => Promise<void> | void;
  handleSubmitForApproval: (skillId: string) => Promise<void> | void;
  handleDeleteSong: (skillId: string) => Promise<void> | void;
  onOpenPdfViewer: (song: any, folderUrl: string) => void;
  isMobile: boolean;
}

/**
 * 🎸 StudentPracticeRepertoireTabs
 * Bounded context component encapsulating the Student Practice tab ('practice')
 * and the Hall of Fame Repertoire tab ('repertoire').
 * BFSG 2025 / WCAG 2.2 AA compliant with touch targets >= 44x44px and keyboard accessibility.
 */
export function StudentPracticeRepertoireTabs({
  activeStudentTab,
  user,
  userSongs = [],
  practiceSongs = [],
  groupedPracticeSongs = [],
  groupedRepertoireSongs = [],
  userBands = [],
  brandColor = defaultBrandColor,
  practiceSearchQuery,
  setPracticeSearchQuery,
  practiceSearchType,
  setPracticeSearchType,
  practiceAlphaFilter,
  setPracticeAlphaFilter,
  expandedSongId,
  setExpandedSongId,
  updateProgress,
  handleSubmitForApproval,
  handleDeleteSong,
  onOpenPdfViewer,
  isMobile
}: StudentPracticeRepertoireTabsProps) {
  const activeBrandColor = brandColor || defaultBrandColor;

  if (activeStudentTab === 'practice') {
    return (
      <ErrorBoundary>
        <section className="exercises-section animation-slide-up" style={{ padding: isMobile ? '12px' : '24px' }}>
          {/* Progress Summary Bar */}
          <div className="glass-panel" style={{ 
            background: 'white', 
            padding: isMobile ? '16px 20px' : '24px 40px', 
            borderRadius: '24px', 
            marginBottom: '32px', 
            display: 'flex', 
            justifyContent: 'center', 
            gap: isMobile ? '20px' : '40px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
            flexWrap: 'wrap'
          }}>
            {['Guitar', 'Drums', 'Keys', 'Bass'].map(inst => {
              const skills = userSongs.filter(s => {
                const sInst = (s.instrument || '').toLowerCase().trim();
                const target = inst.toLowerCase();
                return sInst === target || 
                       (target === 'guitar' && (sInst === 'e-gitarre' || sInst === 'gitarre')) ||
                       (target === 'keys' && (sInst === 'e-piano' || sInst === 'piano' || sInst === 'keys')) ||
                       (target === 'drums' && (sInst === 'e-drums' || sInst === 'schlagzeug')) ||
                       (target === 'bass' && (sInst === 'e-bass' || sInst === 'bass'));
              });
              const avgProgress = skills.length > 0 
                ? Math.round(skills.reduce((acc, s) => acc + s.progress, 0) / skills.length) 
                : 0;

              return (
                <div key={inst} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                    {inst === 'Guitar' ? 'E-GITARRE' : inst === 'Drums' ? 'E-DRUMS' : inst === 'Keys' ? 'E-PIANO' : 'E-BASS'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: APP_INSTRUMENT_COLORS[inst] || activeBrandColor }}>
                      {avgProgress}%
                    </div>
                  </div>
                  <div style={{ width: '80px', height: '4px', background: '#f1f5f9', borderRadius: '2px', marginTop: '8px', margin: '8px auto 0 auto', overflow: 'hidden' }}>
                    <div style={{ width: `${avgProgress}%`, height: '100%', background: APP_INSTRUMENT_COLORS[inst] || activeBrandColor }}></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Search and Alpha Filter Navigation */}
          <div style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Text Search */}
              <div style={{ position: 'relative', flex: 1, minWidth: isMobile ? '100%' : '300px' }}>
                <Search size={20} color="#94a3b8" style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text"
                  placeholder={`Suche nach ${practiceSearchType === 'title' ? 'Songtitel' : 'Interpret'}...`}
                  value={practiceSearchQuery}
                  onChange={(e) => setPracticeSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '16px 20px 16px 54px', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '1rem', fontWeight: 600, background: 'white', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', boxSizing: 'border-box' }}
                />
              </div>

              {/* Toggle Search Type */}
              <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '14px', padding: '4px' }}>
                <button 
                  onClick={() => setPracticeSearchType('title')}
                  style={{ 
                    padding: '10px 20px', borderRadius: '10px', border: 'none', 
                    background: practiceSearchType === 'title' ? 'white' : 'transparent', 
                    color: practiceSearchType === 'title' ? activeBrandColor : '#64748b', 
                    fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem',
                    boxShadow: practiceSearchType === 'title' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s',
                    minHeight: '44px',
                    touchAction: 'manipulation'
                  }}
                >
                  Song
                </button>
                <button 
                  onClick={() => setPracticeSearchType('artist')}
                  style={{ 
                    padding: '10px 20px', borderRadius: '10px', border: 'none', 
                    background: practiceSearchType === 'artist' ? 'white' : 'transparent', 
                    color: practiceSearchType === 'artist' ? activeBrandColor : '#64748b', 
                    fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem',
                    boxShadow: practiceSearchType === 'artist' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s',
                    minHeight: '44px',
                    touchAction: 'manipulation'
                  }}
                >
                  Interpret
                </button>
              </div>
            </div>

            {/* Alphabet Bar */}
            <div 
              className="hide-scrollbar"
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
                onClick={() => setPracticeAlphaFilter(null)}
                style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: !practiceAlphaFilter ? activeBrandColor : '#f8fafc', color: !practiceAlphaFilter ? 'white' : '#64748b', fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem', minWidth: '50px', flexShrink: 0, minHeight: '44px', touchAction: 'manipulation' }}
              >
                ALLE
              </button>
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => (
                <button
                  key={letter}
                  onClick={() => setPracticeAlphaFilter(letter)}
                  style={{ 
                    width: '36px', height: '44px', borderRadius: '8px', border: 'none', 
                    background: practiceAlphaFilter === letter ? activeBrandColor : 'transparent', 
                    color: practiceAlphaFilter === letter ? 'white' : '#94a3b8', 
                    fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem', 
                    transition: 'all 0.2s', 
                    flexShrink: 0,
                    touchAction: 'manipulation'
                  }}
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>

          {(practiceSongs || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '32px', color: '#64748b', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🎸</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>Dein Üben Board ist leer</h3>
              <p style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>Tippe auf <strong>Bibliothek</strong>, um neue Songs hinzuzufügen und deine Skills zu verbessern!</p>
            </div>
          ) : groupedPracticeSongs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '32px', color: '#64748b', border: '2px dashed #f1f5f9' }}>
               <Search size={40} color="#cbd5e1" style={{ marginBottom: '16px' }} />
               <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>Keine Treffer</h3>
               <p style={{ fontSize: '0.9rem' }}>Versuche es mit einem anderen Suchbegriff oder Filter.</p>
            </div>
          ) : null}
          <div className="exercises-grid">
            {groupedPracticeSongs.map((group: any) => (
              <div key={group.song_id} style={{ position: 'relative' }}>
                <Suspense fallback={null}>
                  <GroupedSongCard 
                    songGroup={group} 
                    isBandReady={group.isBandReady} 
                    isExpanded={expandedSongId === group.song_id}
                    onToggle={() => setExpandedSongId(expandedSongId === group.song_id ? null : group.song_id)}
                    onUpdateProgress={updateProgress} 
                    onSubmitForApproval={handleSubmitForApproval} 
                    onDelete={handleDeleteSong}
                    userBands={userBands}
                    userId={user?.id}
                    onOpenPdfViewer={(song: any, folderUrl: string) => {
                      onOpenPdfViewer(song, folderUrl);
                    }}
                  />
                </Suspense>
              </div>
            ))}
          </div>
        </section>
      </ErrorBoundary>
    );
  }

  if (activeStudentTab === 'repertoire') {
    return (
      <ErrorBoundary>
        <section className="exercises-section animation-slide-up" style={{ padding: isMobile ? '12px' : '24px' }}>
          <div className="glass-panel" style={{ padding: isMobile ? '16px' : '32px', background: 'white', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
            <div style={{ marginBottom: isMobile ? '16px' : '32px' }}>
              <h2 style={{ fontSize: isMobile ? '1.3rem' : '1.75rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                <div style={{ color: '#34a853' }}><Award size={isMobile ? 22 : 32} /></div>
                Dein Repertoire
              </h2>
              {!isMobile && <p style={{ color: '#64748b', fontSize: '1rem', margin: '8px 0 0 0' }}>Hier sind deine Meisterleistungen. Du hast diese Songs zu 100% gemeistert!</p>}
            </div>

            <div className="exercises-grid">
            {groupedRepertoireSongs.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px 40px', background: 'white', borderRadius: '32px', color: '#94a3b8', border: '2px dashed #e2e8f0' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '24px' }}>🏆</div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '12px' }}>Noch keine Meilensteine</h3>
                <p style={{ fontSize: '1rem', lineHeight: 1.6, maxWidth: '400px', margin: '0 auto' }}>Übe weiter! Sobald ein Song auf 100% ist, landet er hier in deiner Hall of Fame.</p>
              </div>
            ) : (
              groupedRepertoireSongs.map((group: any) => (
                <div key={group.song_id} className="glass-panel" style={{ padding: isMobile ? '10px 14px' : '14px 18px', background: 'white', borderRadius: '18px', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ minWidth: 0, flex: 1, paddingRight: '10px' }}>
                      <div style={{ fontSize: isMobile ? '0.6rem' : '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', lineHeight: 1 }}>{group.artist}</div>
                      <div style={{ fontSize: isMobile ? '0.95rem' : '1.05rem', fontWeight: 900, color: '#1e293b', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.title}</div>
                    </div>
                    <div style={{ background: '#e6f4ea', color: '#34a853', padding: isMobile ? '3px 8px' : '4px 10px', borderRadius: '10px', fontSize: isMobile ? '0.7rem' : '0.75rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                      <Award size={isMobile ? 10 : 12} /> 100%
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    {group.skills.map((s: any) => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>
                        {APP_INSTRUMENT_ICONS[s.instrument as keyof typeof APP_INSTRUMENT_ICONS]} {s.instrument}
                      </div>
                    ))}
                  </div>

                  <div style={{ background: '#34a853', height: '3px', borderRadius: '2px', width: '100%', marginBottom: isMobile ? '4px' : '6px' }}></div>
                  <div style={{ color: '#34a853', fontSize: isMobile ? '0.65rem' : '0.72rem', fontWeight: 900, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Du bist bereit für eine Band
                  </div>
                  
                  {group.skills.some((s: any) => s.verified_by) && (
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Expertise-Check</div>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {group.skills.filter((s: any) => s.verified_by).map((s: any) => (
                            <div key={s.id} style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Check size={10} color="#34a853" strokeWidth={3} />
                              {s.instrument}: {s.verified_by.first_name} {s.verified_by.last_name?.[0]}.
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          </div>
        </section>
      </ErrorBoundary>
    );
  }

  return null;
}

export default StudentPracticeRepertoireTabs;
