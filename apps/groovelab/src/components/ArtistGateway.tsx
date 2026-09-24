import React, { useEffect, useState, useMemo } from 'react';
import { X, Clock, Sparkles, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface ArtistGatewayProps {
  show: boolean;
  onClose: () => void;
  user: any;
  pendingFounding: any;
  selectedBandForGateway: any;
  APP_INSTRUMENT_ICONS: Record<string, any>;
}

/**
 * 🎸 ArtistGateway (1% Tier-1 SaaS Enterprise+ Goldstandard)
 * Zeigt bei erfolgreicher Bandgründung oder Repertoire-Freischaltung
 * die spektakuläre Konzertbühne mit echten Scheinwerferkegeln (Spotlights)
 * für ALLE Schüler der neu gegründeten Band.
 * BFSG 2025 & WCAG 2.2 AA konform mit Escape-Handler & Touch-Zonen >= 44px.
 */
export const ArtistGateway: React.FC<ArtistGatewayProps> = ({
  show,
  onClose,
  user,
  pendingFounding,
  selectedBandForGateway,
  APP_INSTRUMENT_ICONS
}) => {
  const [suggestion, setSuggestion] = useState<any>(null);

  const target = pendingFounding || selectedBandForGateway;
  const members = target?.band_members || target?.members || [];

  // WCAG 2.2 AA / BFSG 2025: Escape-Taste schließt den Dialog
  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, onClose]);

  // Automatische Bestimmung des idealen Bandproben-Termins aus lab_planning
  useEffect(() => {
    if (!show || !target) return;
    const fetchSuggestion = async () => {
      const bMemberIds = members.map((m: any) => m.user_id || m.id).filter(Boolean);
      if (bMemberIds.length === 0) return;

      try {
        const { data: planning } = await supabase
          .from('lab_planning')
          .select('*')
          .in('user_id', bMemberIds);

        if (!planning || !planning.length) return;

        const counts: Record<string, number> = {};
        planning.forEach((s: any) => {
          const key = `${s.day}-${s.time}`;
          counts[key] = (counts[key] || 0) + 1;
        });
        const vals = Object.values(counts);
        const maxMatches = vals.length ? Math.max(...vals) : 0;
        if (maxMatches === 0) return;

        const dayBlocks: Record<string, string[]> = {};
        planning.forEach((s: any) => {
          const count = planning.filter((p: any) => p.day === s.day && p.time === s.time).length;
          if (count === maxMatches) {
            if (!dayBlocks[s.day]) dayBlocks[s.day] = [];
            if (!dayBlocks[s.day].includes(s.time)) dayBlocks[s.day].push(s.time);
          }
        });

        let bestDay = '', bestStart = '', bestEnd = '', longestBlock = 0;
        Object.entries(dayBlocks).forEach(([day, times]) => {
          times.sort();
          let currentBlock: string[] = [];
          for (let i = 0; i < times.length; i++) {
            if (currentBlock.length === 0) currentBlock.push(times[i]);
            else {
              const prev = currentBlock[currentBlock.length - 1];
              const curr = times[i];
              const prevDate = new Date(`2000-01-01T${prev}:00`);
              const currDate = new Date(`2000-01-01T${curr}:00`);
              if ((currDate.getTime() - prevDate.getTime()) / 60000 === 15) currentBlock.push(curr);
              else {
                if (currentBlock.length > longestBlock) { 
                  longestBlock = currentBlock.length; 
                  bestDay = day; 
                  bestStart = currentBlock[0]; 
                  bestEnd = currentBlock[currentBlock.length - 1]; 
                }
                currentBlock = [times[i]];
              }
            }
          }
          if (currentBlock.length > longestBlock) { 
            longestBlock = currentBlock.length; 
            bestDay = day; 
            bestStart = currentBlock[0]; 
            bestEnd = currentBlock[currentBlock.length - 1]; 
          }
        });

        if (!bestDay) return;
        const endTimeDate = new Date(`2000-01-01T${bestEnd}:00`);
        endTimeDate.setMinutes(endTimeDate.getMinutes() + 15);
        const formattedEnd = endTimeDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

        setSuggestion({ day: bestDay, start: bestStart, end: formattedEnd, count: maxMatches });
      } catch (err) {
        console.error('[ArtistGateway] Rehearsal planner matching error:', err);
      }
    };

    fetchSuggestion();
  }, [show, target, members]);

  // Normalisierungs-Helper für Instrumentennamen
  const normalize = (name: string) => {
    const lower = (name || '').toLowerCase().trim();
    if (lower.includes('guitar') || lower.includes('gitarre')) return 'e-gitarre';
    if (lower.includes('bass')) return 'e-bass';
    if (lower.includes('drum') || lower.includes('schlagzeug')) return 'e-drums';
    if (lower.includes('piano') || lower.includes('key') || lower.includes('klavier')) return 'e-piano';
    if (lower.includes('vocal') || lower.includes('gesang') || lower.includes('stimme')) return 'vocals';
    return lower;
  };

  // 1. Gesamte Instrumentierung des Songs auflösen
  const { allCards, requiredCount, name } = useMemo(() => {
    if (!target) return { allCards: [], requiredCount: 0, name: '' };

    const bandName = target.name || target.title || target.songs?.title || 'dein neues Projekt';
    const songData = target.band_songs?.[0]?.songs || target.songs?.[0] || target.songs || target;
    const rawInst = songData?.instrumentation 
      || target.instrumentation 
      || target.songs?.instrumentation 
      || target.band_songs?.[0]?.instrumentation
      || { 'E-Gitarre': 1, 'E-Bass': 1, 'E-Drums': 1, 'E-Piano': 1 };

    // Bestehende Mitglieder aus allen Varianten extrahieren
    const joined = members.map((m: any) => {
      const userObj = m.profiles 
        ? (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles)
        : (m.users ? (Array.isArray(m.users) ? m.users[0] : m.users) : m);
      
      return {
        isFilled: true,
        member: m,
        userObj: userObj,
        userId: m.user_id || userObj?.id || m.id,
        firstName: m.first_name || userObj?.first_name || 'Musiker',
        photoUrl: m.photo_url || userObj?.photo_url || '/avatar_ghost.jpg',
        instrument: m.instrument || 'Instrument',
        role: m.role || (m.user_id === user?.id ? 'leader' : 'member')
      };
    });

    // Instrumentierungs-Slots sicherstellen: Falls Bandmitglieder Instrumente spielen,
    // die im song.instrumentation noch fehlen, dynamisch ergänzen
    const resolvedInst: Record<string, number> = { ...(rawInst || {}) };
    joined.forEach((c: any) => {
      const norm = normalize(c.instrument);
      const exists = Object.keys(resolvedInst).some(k => normalize(k) === norm);
      if (!exists && norm) {
        resolvedInst[c.instrument] = 1;
      }
    });

    const totalReq = Object.values(resolvedInst).reduce((acc: number, val: any) => acc + (val || 0), 0);

    // Fehlende offene Slots berechnen
    const empty: any[] = [];
    Object.entries(resolvedInst).forEach(([instrument, count]) => {
      const isVoc = instrument.toLowerCase().includes('vocal') || instrument.toLowerCase().includes('gesang');
      if (isVoc) return; // Gesang ist in joinedCards abgebildet

      const normInst = normalize(instrument);
      const joinedCount = joined.filter((c: any) => normalize(c.instrument) === normInst).length;
      const needed = Math.max(0, (count as number) - joinedCount);

      for (let i = 0; i < needed; i++) {
        empty.push({
          isFilled: false,
          instrument: instrument
        });
      }
    });

    return {
      allCards: [...joined, ...empty],
      requiredCount: Math.max(totalReq, joined.length),
      name: bandName
    };
  }, [target, members, user?.id]);

  if (!show || !target) return null;

  return (
    <div 
      className="founding-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Artist Gateway – Bühne für ${name}`}
      style={{ zIndex: 6000 }}
    >
      <div className="founding-modal-content">
        {/* Schließen-Button mit 48x48px Touch-Target */}
        <button 
          onClick={onClose}
          aria-label="Bühne schließen"
          title="Bühne schließen"
          style={{ 
            position: 'absolute', 
            top: '32px', 
            right: '32px', 
            background: 'rgba(255,255,255,0.08)', 
            border: '1px solid rgba(255,255,255,0.15)', 
            width: '48px', 
            height: '48px', 
            borderRadius: '50%', 
            cursor: 'pointer', 
            color: 'white', 
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            touchAction: 'manipulation'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(234, 179, 8, 0.2)';
            e.currentTarget.style.borderColor = '#eab308';
            e.currentTarget.style.transform = 'scale(1.08)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <X size={22} />
        </button>

        {/* Milestone Badge in warmem GrooveLab Gold */}
        <div 
          className="milestone-badge-artistic"
          style={{
            background: 'rgba(234, 179, 8, 0.12)',
            border: '1px solid rgba(234, 179, 8, 0.35)',
            color: '#facc15',
            boxShadow: '0 0 25px rgba(234, 179, 8, 0.2)'
          }}
        >
          <Sparkles size={14} /> ARTIST GATEWAY ✨
        </div>

        {/* Großer Bühnentitel mit warmem Glow */}
        <h1 
          className="milestone-title-artistic"
          style={{
            color: 'white',
            filter: 'drop-shadow(0 0 35px rgba(234, 179, 8, 0.35))'
          }}
        >
          THE STAGE<br />IS YOURS
        </h1>

        {/* Status-Beschreibung & Probetermin-Vorschlag */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', marginBottom: '48px' }}>
          <p style={{ 
            color: 'rgba(255,255,255,0.85)', 
            fontSize: '1.25rem', 
            fontWeight: 600, 
            maxWidth: '720px', 
            margin: 0,
            lineHeight: 1.6,
            textAlign: 'center'
          }}>
            {members.length >= requiredCount ? (
              <>Die Band <strong style={{ color: '#facc15' }}>{name}</strong> ist bereit! Deine Crew steht fest und das Projekt kann starten. 🎸</>
            ) : (
              <>Die Band <strong style={{ color: '#facc15' }}>{name}</strong> ist fast bereit. Wir warten noch auf die restlichen Bandmitglieder.</>
            )}
          </p>

          {suggestion && (
            <div 
              className="animation-pulse" 
              style={{ 
                background: 'rgba(234, 179, 8, 0.14)', 
                border: '1px solid rgba(234, 179, 8, 0.4)', 
                padding: '10px 24px', 
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#facc15',
                fontSize: '0.85rem',
                fontWeight: 900,
                boxShadow: '0 4px 20px rgba(234, 179, 8, 0.15)'
              }}
            >
              <Clock size={16} /> Mögliche Bandprobe: {suggestion.day} {suggestion.start} – {suggestion.end} Uhr
            </div>
          )}
        </div>

        {/* 🌟 DIE KONZERTBÜHNE MIT SCHEINWERFER-ANIMATION FÜR ALLE MUSIKER */}
        <div 
          className="musician-stage" 
          style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '36px', 
            flexWrap: 'wrap',
            margin: '60px 0 50px 0'
          }}
        >
          {allCards.map((card: any, idx: number) => {
            const isMe = card.isFilled && card.userId === user?.id;
            const isFilled = card.isFilled;
            
            // Ermitteln aller Instrumente dieses Mitglieds
            const allMyInstruments = isFilled && card.userId 
              ? members.filter((m: any) => (m.user_id || m.users?.id || m.id) === card.userId).map((m: any) => m.instrument) 
              : [];
            const hasVocals = allMyInstruments.some((inst: string) => inst?.toLowerCase().includes('vocal') || inst?.toLowerCase().includes('gesang'));
            const mainInst = card.instrument;
            const displayInstrument = hasVocals && mainInst?.toLowerCase() !== 'vocals' && mainInst?.toLowerCase() !== 'gesang' 
                ? `${mainInst} & Gesang` 
                : mainInst;

            // Rhythmisches Konzert-Staggering für Scheinwerfer-Sweep
            const staggerDelay = `${(idx * 0.28).toFixed(2)}s`;

            return (
              <div 
                key={idx} 
                className={`musician-card-stage ${isFilled ? 'active' : ''}`}
                style={{
                  animationDelay: staggerDelay
                }}
              >
                {/* Dynamischer Scheinwerferkegel für jeden Musiker der Band */}
                {isFilled && (
                  <div 
                    className="spotlight-beam" 
                    style={{ 
                      animationDelay: staggerDelay,
                      opacity: 1
                    }} 
                  />
                )}

                {/* Musiker-Avatar mit goldenem Glow & Gründer-Auszeichnung */}
                <div 
                  className="musician-avatar-stage"
                  style={{
                    position: 'relative',
                    borderColor: isFilled ? '#eab308' : 'rgba(255, 255, 255, 0.1)'
                  }}
                >
                  {isFilled ? (
                    <img 
                      src={card.photoUrl || '/avatar_ghost.jpg'} 
                      alt={card.firstName}
                      onError={(e) => {
                        e.currentTarget.src = '/avatar_ghost.jpg';
                      }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', opacity: 0.15 }}>
                      👤
                    </div>
                  )}

                  {/* Gründer / Founder Highlight Halo */}
                  {isMe && (
                    <>
                      <div 
                        style={{ 
                          position: 'absolute', 
                          inset: 0, 
                          border: '4px solid #facc15', 
                          borderRadius: '44px', 
                          boxShadow: 'inset 0 0 24px rgba(250, 204, 21, 0.6), 0 0 30px rgba(234, 179, 8, 0.5)' 
                        }} 
                      />
                      <div 
                        title="Bandgründer"
                        style={{
                          position: 'absolute',
                          top: '-10px',
                          right: '-10px',
                          background: 'linear-gradient(135deg, #facc15, #ca8a04)',
                          color: '#0f172a',
                          borderRadius: '50%',
                          width: '28px',
                          height: '28px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 950,
                          fontSize: '13px',
                          boxShadow: '0 4px 14px rgba(234, 179, 8, 0.6)',
                          border: '2px solid #0f172a',
                          zIndex: 10
                        }}
                      >
                        <Star size={14} fill="#0f172a" />
                      </div>
                    </>
                  )}
                </div>
                
                {/* Beschriftung: Name & Instrument */}
                <div style={{ textAlign: 'center' }}>
                  <div 
                    style={{ 
                      fontWeight: 950, 
                      color: isFilled ? 'white' : 'rgba(255,255,255,0.25)', 
                      fontSize: '1.2rem', 
                      marginBottom: '6px',
                      letterSpacing: '-0.02em',
                      textShadow: isFilled ? '0 2px 10px rgba(0,0,0,0.5)' : 'none'
                    }}
                  >
                    {isFilled ? card.firstName : 'Wartend...'}
                  </div>
                  <div 
                    className="instrument-label"
                    style={{
                      color: isFilled ? '#facc15' : 'rgba(255,255,255,0.4)',
                      justifyContent: 'center'
                    }}
                  >
                    {APP_INSTRUMENT_ICONS[card.instrument as keyof typeof APP_INSTRUMENT_ICONS] || '🎸'} {displayInstrument}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Primärer Action-Button: Bühne frei */}
        <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'center' }}>
          <button 
            onClick={onClose}
            className="hero-cta-artistic"
            style={{ 
              background: 'linear-gradient(135deg, #ca8a04, #eab308)', 
              border: 'none', 
              padding: '20px 54px', 
              borderRadius: '24px', 
              fontSize: '1.2rem', 
              fontWeight: 950, 
              color: '#0f172a', 
              cursor: 'pointer', 
              boxShadow: '0 12px 35px rgba(234, 179, 8, 0.45), 0 4px 12px rgba(0,0,0,0.2)',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              letterSpacing: '0.04em',
              minHeight: '48px',
              touchAction: 'manipulation'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)';
              e.currentTarget.style.boxShadow = '0 18px 45px rgba(234, 179, 8, 0.6), 0 6px 16px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 12px 35px rgba(234, 179, 8, 0.45), 0 4px 12px rgba(0,0,0,0.2)';
            }}
          >
            BÜHNE FREI – ZUM DASHBOARD 🚀
          </button>
        </div>

        {/* Künstler-Credo im Footer */}
        <div style={{ marginTop: '48px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '28px' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', fontSize: '0.95rem', maxWidth: 'none', margin: '0 auto', lineHeight: 1.6 }}>
            "Der Künstler ist nichts ohne die Gabe, aber die Gabe ist nichts ohne die Arbeit."
          </p>
        </div>
      </div>
    </div>
  );
};

export default ArtistGateway;
