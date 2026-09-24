import React, { useState } from 'react';
import { Check, CheckCircle, ChevronDown } from 'lucide-react';
import { renderInstrumentIcon } from '../../utils/instruments';

export interface TeacherBandWorkspaceProps {
  allBands: any[];
  openProposals: any[];
  windowWidth: number;
  isMobileDevice: boolean;
  userId?: string;
  onOpenBandProfile?: (band: any) => void;
  setSelectedStudentProfile: (profile: any) => void;
  setActiveTab: (tab: any) => void;
  activePlatform?: string;
  isProposalsView?: boolean;
}

const normalizeInstrument = (name: string): string => {
  if (!name) return '';
  const n = name.trim();
  if (/^e[- ]?gitarre/i.test(n) || /^electric guitar/i.test(n) || /^gitarre/i.test(n)) return 'E-Gitarre';
  if (/^e[- ]?bass/i.test(n) || /^electric bass/i.test(n) || /^bass/i.test(n)) return 'E-Bass';
  if (/^e[- ]?drums/i.test(n) || /^drums/i.test(n) || /^schlagzeug/i.test(n)) return 'E-Drums';
  if (/^vocals/i.test(n) || /^gesang/i.test(n) || /^stimme/i.test(n)) return 'Vocals';
  if (/^e[- ]?piano/i.test(n) || /^piano/i.test(n) || /^klavier/i.test(n) || /^keys/i.test(n) || /^keyboard/i.test(n)) return 'E-Piano';
  return n;
};

const renderBandAvatar = (name: string, photoUrl?: string | null, size: string = '64px', borderRadius: string = '18px') => {
  if (photoUrl) {
    return (
      <div style={{ width: size, height: size, borderRadius, overflow: 'hidden', flexShrink: 0 }}>
        <img src={photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={name} />
      </div>
    );
  }
  
  const gradients = [
    'linear-gradient(135deg, #6366f1, #a855f7)',
    'linear-gradient(135deg, #ec4899, #f43f5e)',
    'linear-gradient(135deg, #3b82f6, #06b6d4)',
    'linear-gradient(135deg, #34a853, #3b82f6)',
    'linear-gradient(135deg, #f59e0b, #e11d48)'
  ];
  
  let hash = 0;
  const str = name || '';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const gradient = gradients[Math.abs(hash) % gradients.length];
  const firstLetter = (name || 'B').substring(0, 1).toUpperCase();
  
  return (
    <div style={{ 
      width: size, height: size, borderRadius, 
      background: gradient, 
      display: 'flex', alignItems: 'center', justifyContent: 'center', 
      color: 'white', fontWeight: 950, fontSize: `calc(${size} * 0.4)`,
      textShadow: '0 2px 4px rgba(0,0,0,0.15)',
      flexShrink: 0,
      userSelect: 'none'
    }}>
      {firstLetter}
    </div>
  );
};

export const TeacherBandWorkspace: React.FC<TeacherBandWorkspaceProps> = ({
  allBands,
  openProposals,
  windowWidth,
  isMobileDevice,
  userId,
  onOpenBandProfile,
  setSelectedStudentProfile,
  setActiveTab,
  isProposalsView = false
}) => {
  const [bandSearch, setBandSearch] = useState('');
  const [collapsedBands, setCollapsedBands] = useState<Record<string, boolean>>({});

  if (isProposalsView) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Header row with Back Button */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button 
            type="button"
            onClick={() => setActiveTab('live')}
            style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              padding: '12px 24px',
              borderRadius: '16px',
              fontWeight: 800,
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              alignSelf: 'flex-start',
              boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
              transition: 'all 0.2s',
              touchAction: 'manipulation'
            }}
          >
            ← Zurück zum Live Lab
          </button>
          <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 950, color: '#1e293b', letterSpacing: '-0.03em', margin: '0 0 8px 0' }}>
              Offene Band-Projekte
            </h1>
            <p style={{ color: '#64748b', fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>
              Hier findest Du alle Lieder, die Deine Bands aktuell vorschlagen. Stimme in Deinem Band-Board ab und übe Deinen Part, um sie bühnenreif zu machen!
            </p>
          </div>
        </div>

        {openProposals.length === 0 ? (
          <div className="card" style={{ 
            padding: '60px 40px', 
            textAlign: 'center', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '16px',
            background: '#f8fafc',
            border: '1px dashed #e2e8f0',
            borderRadius: '32px'
          }}>
            <div style={{ background: '#e0e7ff', color: '#4f46e5', padding: '16px', borderRadius: '24px', boxShadow: '0 8px 20px rgba(79, 70, 229, 0.1)' }}>
              <CheckCircle size={36} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Alles bereit!</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '400px', margin: 0, lineHeight: 1.5 }}>
              Es gibt momentan keine offenen Vorschläge in Deinen Bands. Du bist komplett auf dem Laufenden!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {(() => {
              const groupedProposals = openProposals.reduce((acc: Record<string, { band: any, proposals: any[] }>, form: any) => {
                const bandId = form.band.id;
                if (!acc[bandId]) {
                  acc[bandId] = {
                    band: form.band,
                    proposals: []
                  };
                }
                acc[bandId].proposals.push(form);
                return acc;
              }, {});

              const bandGroups = Object.values(groupedProposals).sort((a: any, b: any) => a.band.name.localeCompare(b.band.name));

              return bandGroups.map((group: any) => {
                const band = group.band;
                const proposals = group.proposals;
                const isCollapsed = !!collapsedBands[band.id];

                return (
                  <div key={band.id} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Collapsible Band Header */}
                    <div 
                      role="button"
                      tabIndex={0}
                      aria-expanded={!isCollapsed}
                      aria-label={`Band ${band.name}: ${proposals.length} ${proposals.length === 1 ? 'offener Song' : 'offene Songs'} ${isCollapsed ? 'aufklappen' : 'zuklappen'}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setCollapsedBands(prev => ({ ...prev, [band.id]: !prev[band.id] }));
                        }
                      }}
                      onClick={() => setCollapsedBands(prev => ({ ...prev, [band.id]: !prev[band.id] }))}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 28px',
                        background: 'linear-gradient(90deg, #1e1b4b 0%, #110e3b 100%)',
                        border: '1px solid rgba(165, 180, 252, 0.15)',
                        borderRadius: '24px',
                        cursor: 'pointer',
                        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        touchAction: 'manipulation'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {renderBandAvatar(band.name, band.photo_url, '48px', '12px')}
                        <div>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: 950, color: 'white', margin: 0, letterSpacing: '-0.01em' }}>
                            {band.name}
                          </h3>
                          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>
                            {proposals.length} {proposals.length === 1 ? 'offener Song' : 'offene Songs'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ 
                          fontSize: '0.65rem', 
                          fontWeight: 900, 
                          color: '#a5b4fc', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.1em',
                          background: 'rgba(165, 180, 252, 0.1)',
                          padding: '6px 12px',
                          borderRadius: '12px'
                        }}>
                          {isCollapsed ? 'Ausklappen' : 'Einklappen'}
                        </span>
                        <div style={{ 
                          color: '#a5b4fc', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          transition: 'transform 0.3s ease',
                          transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)'
                        }}>
                          <ChevronDown size={20} />
                        </div>
                      </div>
                    </div>

                    {/* Grouped proposals list */}
                    {!isCollapsed && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingLeft: '8px' }}>
                        {proposals.map((form: any) => {
                          const song = form.song;
                          const instReq = song.instrumentation || { 'E-Gitarre': 1, 'E-Drums': 1, 'E-Bass': 1 };
                          const order = ['E-Gitarre', 'E-Drums', 'E-Piano', 'E-Bass'];

                          const allRequired: { instrument: string; part: number }[] = [];
                          order.forEach(instName => {
                            const count = instReq[instName] || 0;
                            for(let i=0; i < count; i++) {
                              allRequired.push({ instrument: instName, part: i + 1 });
                            }
                          });

                          const isPro = form.band_song?.difficulty_level === 'original' || form.band_song?.difficulty_level === 'pro';
                          const levelText = isPro ? 'PRO' : 'STARTER';

                          return (
                            <div key={form.id} style={{ 
                              background: 'linear-gradient(135deg, #1e1b4b 0%, #0f0728 100%)', 
                              borderRadius: '28px', 
                              border: '1px solid rgba(165, 180, 252, 0.1)',
                              boxShadow: '0 15px 35px rgba(0, 0, 0, 0.2)',
                              display: 'flex',
                              flexWrap: 'wrap',
                              overflow: 'hidden',
                              minHeight: '260px'
                            }}>
                              {/* Left Panel: Band & Song Info */}
                              <div style={{ 
                                flex: '1 1 320px',
                                padding: '32px', 
                                background: 'rgba(255, 255, 255, 0.03)', 
                                borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: '24px'
                              }}>
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                  {renderBandAvatar(form.band.name, form.band.photo_url, '56px', '16px')}
                                  <div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '2px' }}>
                                      Deine Band
                                    </div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 950, color: 'white', letterSpacing: '-0.02em' }}>
                                      {form.band.name}
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <span style={{ 
                                    background: 'rgba(168, 85, 247, 0.15)', 
                                    color: '#c084fc', 
                                    border: '1px solid rgba(168, 85, 247, 0.3)',
                                    padding: '4px 10px', 
                                    borderRadius: '8px', 
                                    fontSize: '0.6rem', 
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    display: 'inline-block',
                                    marginBottom: '8px'
                                  }}>
                                    Abstimmung läuft
                                  </span>
                                  <h3 style={{ fontSize: '1.4rem', fontWeight: 1000, color: 'white', margin: '0 0 4px 0', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                                    {song.title}
                                  </h3>
                                  <p style={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.8rem', margin: 0 }}>
                                    {song.artist || 'Unbekannt'}
                                  </p>
                                </div>

                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, lineHeight: 1.4 }}>
                                  Klicke im Hauptmenü auf <strong style={{ color: 'white' }}>"Deine Bands"</strong>, um an der Abstimmung teilzunehmen!
                                </div>
                              </div>

                              {/* Right Panel: Slot Grid */}
                              <div style={{ flex: '1 1 400px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <h4 style={{ fontSize: '0.75rem', fontWeight: 950, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                                    Instrumenten-Belegung & Freischaltung
                                  </h4>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8' }}>
                                    Level: <strong style={{ color: isPro ? '#c084fc' : '#f59e0b', textTransform: 'uppercase' }}>{levelText}</strong>
                                  </span>
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'flex-start', flex: 1 }}>
                                  {(() => {
                                    const APP_INSTRUMENT_ICONS: Record<string, string> = {
                                      'E-Gitarre': '🎸',
                                      'E-Bass': '🎸',
                                      'E-Drums': '🥁',
                                      'Vocals': '🎤',
                                      'E-Piano': '🎹',
                                      'Keyboard': '🎹'
                                    };

                                    return allRequired.map(({ instrument, part }) => {
                                      const key = `${instrument}_${part}`;
                                      const member = (form.members || []).find((m: any) => {
                                        const mNorm = normalizeInstrument(m.instrument).toLowerCase();
                                        const targetNorm = normalizeInstrument(instrument).toLowerCase();
                                        return mNorm === targetNorm && m.part_number === part;
                                      });

                                      const isMe = member?.user_id === userId;
                                      const instLabel = (instReq[instrument] || 0) > 1 ? `${instrument} ${part}` : instrument;

                                      return (
                                        <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '80px', position: 'relative' }}>
                                          <div style={{ 
                                            width: '64px', height: '64px', borderRadius: '18px', 
                                            background: member ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)', 
                                            border: (isMe || member?.isMastered) ? `3px solid #ef4444` : (member ? '1px solid rgba(255,255,255,0.1)' : '2px dashed rgba(255,255,255,0.2)'),
                                            boxShadow: isMe ? '0 0 15px rgba(239, 68, 68, 0.3)' : 'none',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                                            filter: member && !member.isMastered ? 'grayscale(100%)' : 'none',
                                            opacity: member && !member.isMastered ? 0.6 : 1
                                          }}>
                                            {member ? (
                                              <div 
                                                role="button"
                                                tabIndex={0}
                                                aria-label={`Profil von ${member.first_name || 'Mitglied'} ${member.last_name || ''} aufrufen`}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setSelectedStudentProfile({
                                                      id: member.user_id,
                                                      first_name: member.first_name,
                                                      last_name: member.last_name,
                                                      photo_url: member.photo_url,
                                                      created_at: member.created_at,
                                                      birth_date: member.birth_date,
                                                      instrument: member.instrument
                                                    });
                                                  }
                                                }}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSelectedStudentProfile({
                                                    id: member.user_id,
                                                    first_name: member.first_name,
                                                    last_name: member.last_name,
                                                    photo_url: member.photo_url,
                                                    created_at: member.created_at,
                                                    birth_date: member.birth_date,
                                                    instrument: member.instrument
                                                  });
                                                }}
                                                style={{ width: '100%', height: '100%', position: 'relative', cursor: 'pointer' }}
                                              >
                                                <img 
                                                  src={member.photo_url || '/avatar_ghost.jpg'} 
                                                  style={{ width: '100%', height: '100%', borderRadius: '15px', objectFit: 'cover' }} 
                                                  alt={member.first_name ? `${member.first_name} ${member.last_name || ''}` : "Bandmitglied"} 
                                                />
                                                {member.isMastered && (
                                                  <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#34a853', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', zIndex: 10 }}>
                                                    <Check size={12} strokeWidth={4} />
                                                  </div>
                                                )}
                                              </div>
                                            ) : (
                                              <div style={{ fontSize: '1.5rem', opacity: 0.2 }}>{APP_INSTRUMENT_ICONS[instrument as keyof typeof APP_INSTRUMENT_ICONS] || '❓'}</div>
                                            )}
                                          </div>
                                          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', width: '100%' }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 950, color: member ? 'white' : 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                                              {member ? member.first_name : instLabel}
                                            </div>
                                            {member && (
                                              <div style={{ fontSize: '0.45rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
                                                {instLabel}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
    );
  }

  // Regular Bands Directory View (activeTab === 'bands')
  return (
    <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap', width: '100%' }}>
      {/* Main Column */}
      <div style={{ flex: 3, minWidth: (windowWidth < 768 || isMobileDevice) ? '100%' : '400px', maxWidth: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <input 
          placeholder="Band suchen..." 
          value={bandSearch} 
          onChange={e => setBandSearch(e.target.value)} 
          style={{ width: '100%', boxSizing: 'border-box', padding: '16px 20px', borderRadius: '24px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.9rem', outline: 'none' }} 
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {allBands.filter(b => b.name.toLowerCase().includes(bandSearch.toLowerCase())).map(band => (
            <div 
              key={band.id} 
              role="button"
              tabIndex={0}
              aria-label={`Band ${band.name} öffnen`}
              onClick={() => onOpenBandProfile?.(band)} 
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenBandProfile?.(band);
                }
              }}
              className="google-card" 
              style={{ padding: '24px', borderRadius: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', touchAction: 'manipulation' }}
            >
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 950, color: '#1e293b' }}>{band.name}</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Mitglieder</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0b57d0' }}>
                  {(() => { const ids = (band.band_members || []).map((m: any) => m.user_id || m.student_id || m.external_name).filter(Boolean); return new Set(ids).size; })()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bands Right Sidebar */}
      <aside style={{ flex: 1, minWidth: (windowWidth < 768 || isMobileDevice) ? '100%' : '300px', maxWidth: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ padding: '24px', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 900, color: '#1e293b' }}>
            Band-Übersicht
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: '16px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Gesamt Bands</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 950, color: '#0b57d0' }}>{allBands.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: '16px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Offene Song-Vorschläge</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 950, color: '#b06000' }}>{openProposals.length}</span>
            </div>
          </div>
        </div>

        <div style={{ padding: '24px', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 900, color: '#1e293b' }}>
            Coaching Leitfaden
          </h3>
          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.78rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '8px', fontWeight: 600, lineHeight: 1.4 }}>
            <li>🎸 <b>Fokus auf Rhythmus</b>: Lass die Bands langsam starten und das Timing festigen.</li>
            <li>🎤 <b>Gesang lauter</b>: Stelle sicher, dass Sänger klar verständlich über der Band liegen.</li>
            <li>🎹 <b>Klangauswahl</b>: Keys sollten Frequenzlücken füllen, nicht die Gitarren überdecken.</li>
            <li>📝 <b>Abstimmungen</b>: Überprüfe regelmäßig die ausstehenden Songs im Repertoire Planer.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
};
