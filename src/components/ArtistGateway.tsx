import React from 'react';
import { X, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
interface ArtistGatewayProps {
  show: boolean;
  onClose: () => void;
  user: any;
  pendingFounding: any;
  selectedBandForGateway: any;
  APP_INSTRUMENT_ICONS: Record<string, any>;
}

export const ArtistGateway: React.FC<ArtistGatewayProps> = ({
  show,
  onClose,
  user,
  pendingFounding,
  selectedBandForGateway,
  APP_INSTRUMENT_ICONS
}) => {
  if (!show) return null;

  const target = pendingFounding || selectedBandForGateway;
  if (!target) return null;

  const name = target.name || target.title || target.songs?.title || 'dein neues Projekt';
  const members = target.band_members || target.members || [];
  const songData = target.band_songs?.[0]?.songs || target.songs?.[0] || target.songs || target;
  const inst = songData?.instrumentation || { 'E-Gitarre': 1, 'E-Drums': 1 }; // Minimum fallback
  const requiredCount = Object.values(inst).reduce((acc: number, val: any) => acc + (val || 0), 0);

  // 1. Gather all actual joined members
  const joinedCards = members.map((m: any) => {
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
      instrument: m.instrument || 'Instrument'
    };
  });

  // Helper to normalize instrument name
  const normalize = (name: string) => {
    const lower = (name || '').toLowerCase();
    if (lower.includes('guitar') || lower.includes('gitarre')) return 'e-gitarre';
    if (lower.includes('bass')) return 'e-bass';
    if (lower.includes('drum') || lower.includes('schlagzeug')) return 'e-drums';
    if (lower.includes('piano') || lower.includes('key') || lower.includes('klavier')) return 'e-piano';
    if (lower.includes('vocal') || lower.includes('gesang')) return 'vocals';
    return lower;
  };

  // 2. Identify missing required slots
  const emptyCards: any[] = [];
  Object.entries(inst).forEach(([instrument, count]) => {
    const isVoc = instrument.toLowerCase().includes('vocal') || instrument.toLowerCase().includes('gesang');
    if (isVoc) return; // Vocalists are already fully shown in joinedCards

    const normInst = normalize(instrument);
    const joinedCount = joinedCards.filter((c: any) => normalize(c.instrument) === normInst).length;
    const needed = Math.max(0, (count as number) - joinedCount);

    for (let i = 0; i < needed; i++) {
      emptyCards.push({
        isFilled: false,
        instrument: instrument
      });
    }
  });

  const allCards = [...joinedCards, ...emptyCards];

  const [suggestion, setSuggestion] = React.useState<any>(null);

  React.useEffect(() => {
    const fetchSuggestion = async () => {
      const bMemberIds = members.map((m: any) => m.user_id || m.id).filter(Boolean);
      if (bMemberIds.length === 0) return;

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
      const vals = Object.values(counts);      const maxMatches = vals.length ? Math.max(...vals) : 0;
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
              if (currentBlock.length > longestBlock) { longestBlock = currentBlock.length; bestDay = day; bestStart = currentBlock[0]; bestEnd = currentBlock[currentBlock.length - 1]; }
              currentBlock = [times[i]];
            }
          }
        }
        if (currentBlock.length > longestBlock) { longestBlock = currentBlock.length; bestDay = day; bestStart = currentBlock[0]; bestEnd = currentBlock[currentBlock.length - 1]; }
      });

      if (!bestDay) return;
      const endTimeDate = new Date(`2000-01-01T${bestEnd}:00`);
      endTimeDate.setMinutes(endTimeDate.getMinutes() + 15);
      const formattedEnd = endTimeDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

      setSuggestion({ day: bestDay, start: bestStart, end: formattedEnd, count: maxMatches });
    };

    fetchSuggestion();
  }, [members]);

  return (
    <div className="founding-modal-overlay">
      <div className="founding-modal-content">
        <button 
          onClick={onClose}
          style={{ 
            position: 'absolute', 
            top: '32px', 
            right: '32px', 
            background: 'rgba(255,255,255,0.05)', 
            border: '1px solid rgba(255,255,255,0.1)', 
            width: '48px', 
            height: '48px', 
            borderRadius: '50%', 
            cursor: 'pointer', 
            color: 'white', 
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
        >
          <X size={24} />
        </button>

        <div className="milestone-badge-artistic">
          ARTIST GATEWAY ✨
        </div>

        <h1 className="milestone-title-artistic">
          THE STAGE<br/>IS YOURS
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', marginBottom: '60px' }}>
          <p style={{ 
            color: 'rgba(255,255,255,0.7)', 
            fontSize: '1.25rem', 
            fontWeight: 600, 
            maxWidth: '700px', 
            margin: 0,
            lineHeight: 1.6,
            textAlign: 'center'
          }}>
            {members.length >= requiredCount ? (
              <>Die Band <strong>{name}</strong> ist bereit! Deine Crew steht fest und das Projekt kann starten.</>
            ) : (
              <>Die Band <strong>{name}</strong> ist fast bereit. Wir müssen noch auf die restlichen Bandmitglieder warten.</>
            )}
          </p>

          {suggestion && (
            <div className="animation-pulse" style={{ 
              background: 'rgba(16, 185, 129, 0.1)', 
              border: '1px solid rgba(16, 185, 129, 0.3)', 
              padding: '8px 20px', 
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#10b981',
              fontSize: '0.8rem',
              fontWeight: 900
            }}>
              <Clock size={16} /> {suggestion.day} {suggestion.start}-{suggestion.end}
            </div>
          )}
        </div>

        <div className="musician-stage" style={{ display: 'flex', justifyContent: 'center', gap: '32px', flexWrap: 'wrap' }}>
          {allCards.map((card, idx) => {
            const isMe = card.isFilled && card.userId === user?.id;
            
            // Find all instruments this member has in this band to see if they also do vocals
            const allMyInstruments = card.isFilled && card.userId 
              ? members.filter((m: any) => (m.user_id || m.users?.id || m.id) === card.userId).map((m: any) => m.instrument) 
              : [];
            const hasVocals = allMyInstruments.some((inst: string) => inst?.toLowerCase().includes('vocal') || inst?.toLowerCase().includes('gesang'));
            const mainInst = card.instrument;
            const displayInstrument = hasVocals && mainInst?.toLowerCase() !== 'vocals' && mainInst?.toLowerCase() !== 'gesang' 
                ? `${mainInst} & Gesang` 
                : mainInst;

            return (
              <div key={idx} className={`musician-card-stage ${isMe ? 'active' : ''}`}>
                <div className="spotlight-beam" />
                <div className="musician-avatar-stage">
                  {card.isFilled ? (
                     <img 
                       src={card.photoUrl || '/avatar_ghost.jpg'} 
                       alt=""
                       onError={(e) => {
                         e.currentTarget.src = '/avatar_ghost.jpg';
                       }}
                     />
                  ) : (
                     <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', opacity: 0.1 }}>👤</div>
                  )}
                  {isMe && (
                     <div style={{ position: 'absolute', inset: 0, border: '4px solid #10b981', borderRadius: '40px', boxShadow: 'inset 0 0 20px rgba(16,185,129,0.5)' }} />
                  )}
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 900, color: card.isFilled ? 'white' : 'rgba(255,255,255,0.2)', fontSize: '1.2rem', marginBottom: '8px' }}>
                    {card.isFilled ? card.firstName : 'Wartend...'}
                  </div>
                  <div className="instrument-label">
                     {APP_INSTRUMENT_ICONS[card.instrument as keyof typeof APP_INSTRUMENT_ICONS] || '🎸'} {displayInstrument}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'center' }}>
          <button 
            onClick={onClose}
            style={{ 
              background: 'linear-gradient(135deg, #10b981, #059669)', 
              border: 'none', 
              padding: '18px 45px', 
              borderRadius: '20px', 
              fontSize: '1.15rem', 
              fontWeight: 900, 
              color: 'white', 
              cursor: 'pointer', 
              boxShadow: '0 10px 30px rgba(16, 185, 129, 0.4)',
              transition: 'all 0.2s',
              letterSpacing: '0.02em'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            BÜHNE FREI – ZUM DASHBOARD 🚀
          </button>
        </div>

        <div style={{ marginTop: '50px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '30px' }}>
           <p style={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', fontSize: '1rem', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
             "Der Künstler ist nichts ohne die Gabe, aber die Gabe ist nichts ohne die Arbeit."
           </p>
        </div>
      </div>
    </div>
  );
};
