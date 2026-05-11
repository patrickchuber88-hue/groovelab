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

  const slots: any[] = [];
  Object.entries(inst).forEach(([instrument, count]) => {
    const isVoc = instrument.toLowerCase().includes('vocal') || instrument.toLowerCase().includes('gesang');
    if (isVoc) return; // Skip original vocal slots from instrumentation to use custom logic
    for (let i = 0; i < (count as number); i++) {
      slots.push({ instrument });
    }
  });

  // Always show at least 1 vocal slot if any singer exists, or up to 2 if 2 singers exist
  const vocalists = members.filter((m: any) => (m.instrument || '').toLowerCase().includes('vocal') || (m.instrument || '').toLowerCase().includes('gesang'));
  const uniqueVocalistIds = Array.from(new Set(vocalists.map((m: any) => m.user_id || m.users?.id || m.id)));
  
  // If a vocalist also plays an instrument, they are already covered by an instrumental slot.
  // We only need EXTRA slots for those who ONLY sing.
  const onlySingersCount = uniqueVocalistIds.filter(uid => {
    const myInsts = members.filter((m: any) => (m.user_id || m.users?.id || m.id) === uid).map((m: any) => (m.instrument || '').toLowerCase());
    return myInsts.every((inst: string) => inst.includes('vocal') || inst.includes('gesang'));
  }).length;

  for (let i = 0; i < Math.min(2, onlySingersCount); i++) {
    slots.push({ instrument: 'Vocals' });
  }

  const filledIndices = new Set();

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
          {slots.map((slot, idx) => {
            const member = members.find((m: any, mIdx: number) => {
                if (filledIndices.has(mIdx)) return false;
                const mInst = (m.instrument || '').toLowerCase();
                const sInst = (slot.instrument || '').toLowerCase();
                const isMatch = mInst === sInst || 
                               (mInst === 'e-gitarre' && sInst === 'guitar') || (mInst === 'guitar' && sInst === 'e-gitarre') ||
                               (mInst === 'e-bass' && sInst === 'bass') || (mInst === 'bass' && sInst === 'e-bass') ||
                               (mInst === 'e-drums' && sInst === 'drums') || (mInst === 'drums' && sInst === 'e-drums') ||
                               (mInst === 'e-piano' && sInst === 'piano') || (mInst === 'piano' && sInst === 'e-piano') || (mInst === 'keys' && sInst === 'e-piano');
                if (isMatch) {
                    filledIndices.add(mIdx);
                    return true;
                }
                return false;
            });

            // Find all instruments this member has in this band
            const mUserId = member?.user_id || member?.users?.id || (member?.users?.[0]?.id);
            const allMyInstruments = mUserId ? members.filter((m: any) => (m.user_id || m.users?.id || m.id) === mUserId).map((m: any) => m.instrument) : [];
            const hasVocals = allMyInstruments.some((inst: string) => inst?.toLowerCase().includes('vocal') || inst?.toLowerCase().includes('gesang'));
            const mainInst = slot.instrument;
            const displayInstrument = hasVocals && mainInst?.toLowerCase() !== 'vocals' && mainInst?.toLowerCase() !== 'gesang' 
                ? `${mainInst} & Gesang` 
                : mainInst;

            const isMe = mUserId === user?.id;
            
            return (
              <div key={idx} className={`musician-card-stage ${isMe ? 'active' : ''}`}>
                <div className="spotlight-beam" />
                <div className="musician-avatar-stage">
                  {member ? (
                     <img 
                       src={(member.profiles || member.users || member).photo_url || '/avatar_ghost.jpg'} 
                       alt=""
                     />
                  ) : (
                     <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', opacity: 0.1 }}>👤</div>
                  )}
                  {isMe && (
                     <div style={{ position: 'absolute', inset: 0, border: '4px solid #10b981', borderRadius: '40px', boxShadow: 'inset 0 0 20px rgba(16,185,129,0.5)' }} />
                  )}
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 900, color: member ? 'white' : 'rgba(255,255,255,0.2)', fontSize: '1.2rem', marginBottom: '8px' }}>
                    {member ? (member.first_name || (member.profiles || member.users || member).first_name || 'Musiker') : 'Wartend...'}
                  </div>
                  <div className="instrument-label">
                     {APP_INSTRUMENT_ICONS[slot.instrument as keyof typeof APP_INSTRUMENT_ICONS] || '🎸'} {displayInstrument}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '80px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '40px' }}>
           <p style={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', fontSize: '1rem', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
             "Der Künstler ist nichts ohne die Gabe, aber die Gabe ist nichts ohne die Arbeit."
           </p>
        </div>
      </div>
    </div>
  );
};
