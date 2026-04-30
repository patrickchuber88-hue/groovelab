import React, { useEffect, useState } from 'react';
import { X, Music, Star, Clock, Radar as RadarIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface FriendProfileModalProps {
  friendId: string;
  onClose: () => void;
  brandColor?: string;
}

const INSTRUMENT_ICONS: Record<string, string> = { 
  Guitar: '🎸', 
  Bass: '🎸', 
  Drums: '🥁', 
  Keys: '🎹', 
  Vocals: '🎤' 
};

const INSTRUMENT_COLORS: Record<string, string> = {
  Guitar: '#ef4444', // Red
  Bass: '#eab308',   // Yellow
  Drums: '#3b82f6',  // Blue
  Keys: '#a855f7',   // Purple
  Vocals: '#000000'  // Black
};

const FriendProfileModal: React.FC<FriendProfileModalProps> = ({ friendId, onClose, brandColor = '#eab308' }) => {
  const [friend, setFriend] = useState<any>(null);
  const [friendSongs, setFriendSongs] = useState<any[]>([]);
  const [friendAvailabilities, setFriendAvailabilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('FriendProfileModal mounted for ID:', friendId);
    const fetchFriendData = async () => {
      try {
        console.log('Fetching friend data for:', friendId);
        setLoading(true);
        
        // Fetch friend profile
        const { data: profile } = await supabase
          .from('users')
          .select('*, schools(*)')
          .eq('id', friendId)
          .single();
        
        setFriend(profile);

        // Fetch friend songs
        const { data: songs } = await supabase
          .from('user_song_skills')
          .select('*, songs(*)')
          .eq('user_id', friendId)
          .order('last_practiced_at', { ascending: false });
        
        setFriendSongs(songs || []);

        // Fetch friend availability
        const { data: avs } = await supabase
          .from('user_availability')
          .select('*')
          .eq('user_id', friendId);
        
        setFriendAvailabilities(avs || []);

      } catch (err) {
        console.error('Error fetching friend data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (friendId) fetchFriendData();
  }, [friendId]);

  if (loading) {
    return (
      <div className="modal-overlay" style={{ zIndex: 3000, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white', fontWeight: 900, fontSize: '1.5rem' }}>Lade Profil...</div>
      </div>
    );
  }

  if (!friend) return null;

  // Radar Data
  const radarData = ['Guitar', 'Bass', 'Drums', 'Keys', 'Vocals'].map(inst => {
    const skill = friendSongs.find(s => s.instrument === inst);
    return {
      subject: inst,
      A: skill ? skill.progress : 0
    };
  });

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{ 
        position: 'fixed',
        inset: 0,
        zIndex: 3000, 
        background: 'rgba(15, 23, 42, 0.9)', 
        backdropFilter: 'blur(12px)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '24px' 
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="glass-panel animation-slide-up" 
        style={{ 
          background: 'white', 
          padding: 0, 
          borderRadius: '40px', 
          maxWidth: '1000px', 
          width: '100%', 
          maxHeight: '95vh', 
          overflowY: 'auto',
          position: 'relative',
          boxShadow: '0 40px 100px rgba(0,0,0,0.3)'
        }}
      >
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '24px', right: '24px', background: '#f8fafc', border: 'none', padding: '12px', borderRadius: '50%', cursor: 'pointer', color: '#94a3b8', zIndex: 10 }}
        >
          <X size={24} />
        </button>

        {/* Header Section */}
        <div style={{ padding: '48px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '40px', alignItems: 'center', background: 'linear-gradient(to bottom right, #ffffff, #f8fafc)' }}>
          <div style={{ width: '180px', height: '180px', borderRadius: '48px', overflow: 'hidden', border: `8px solid white`, boxShadow: '0 20px 40px rgba(0,0,0,0.1)', flexShrink: 0 }}>
            <img src={friend.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ background: brandColor, color: 'white', padding: '4px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase' }}>Groovelab Artist</span>
              <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600 }}>{friend.schools?.name}</span>
            </div>
            <h1 style={{ fontSize: '3rem', fontWeight: 900, margin: 0, color: '#1e293b', letterSpacing: '-0.02em' }}>{friend.first_name} {friend.last_name?.[0]}.</h1>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              {(friend.musical_styles || []).map((style: string) => (
                <span key={style} style={{ background: 'white', border: '1px solid #e2e8f0', color: '#64748b', padding: '6px 16px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>{style}</span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: '48px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '48px' }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            
            {/* Skill Radar */}
            <section>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', color: '#1e293b' }}>
                <RadarIcon size={24} color={brandColor} /> Skill Radar
              </h3>
              <div style={{ height: '300px', background: '#f8fafc', borderRadius: '32px', padding: '24px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
                    <Radar name="Skills" dataKey="A" stroke={brandColor} fill={brandColor} fillOpacity={0.6} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Equipment */}
            <section>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', color: '#1e293b' }}>
                <Star size={24} color={brandColor} /> Equipment & Gear
              </h3>
              <div style={{ background: '#fffbeb', padding: '24px', borderRadius: '24px', border: '2px solid #fef3c7', color: '#854d0e', fontWeight: 600, fontSize: '1rem', lineHeight: 1.6 }}>
                {friend.gear || "Kein Equipment angegeben."}
              </div>
            </section>

            {/* Songs */}
            <section>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', color: '#1e293b' }}>
                <Music size={24} color={brandColor} /> Aktuelle Songs
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {friendSongs.slice(0, 5).map((s: any) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: INSTRUMENT_COLORS[s.instrument] || brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: 'white' }}>
                      {INSTRUMENT_ICONS[s.instrument]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>{s.songs?.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{s.songs?.artist}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 900, color: brandColor }}>{s.progress}%</div>
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>Progress</div>
                    </div>
                  </div>
                ))}
                {friendSongs.length === 0 && <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>Noch keine Songs in der Liste.</div>}
              </div>
            </section>
          </div>

          {/* Right Column: Weekly Plan */}
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', color: '#1e293b' }}>
              <Clock size={24} color={brandColor} /> Wochen-Planner
            </h3>
            <div className="glass-panel" style={{ background: '#f8fafc', padding: '32px', borderRadius: '32px', border: '1px solid #f1f5f9' }}>
              {(() => {
                const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
                const daysToShow = [1, 2, 3, 4, 5, 6]; // Mo-Sa
                const slots: string[] = [];
                for (let h = 14; h < 20; h++) {
                  slots.push(`${h}:00`, `${h}:15`, `${h}:30`, `${h}:45`);
                }

                return (
                  <div style={{ display: 'grid', gridTemplateColumns: `40px repeat(${daysToShow.length}, 1fr)`, gap: '3px' }}>
                    <div />
                    {daysToShow.map(d => (
                      <div key={d} style={{ textAlign: 'center', fontWeight: 800, fontSize: '0.6rem', color: '#94a3b8' }}>{dayNames[d]}</div>
                    ))}
                    
                    {slots.map(slot => (
                      <React.Fragment key={slot}>
                        <div style={{ fontSize: '0.5rem', fontWeight: 700, color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>{slot}</div>
                        {daysToShow.map(day => {
                          const isFriendTime = friendAvailabilities.some(a => Number(a.day_of_week) === day && a.time_slot === slot);
                          return (
                            <div
                              key={`${day}-${slot}`}
                              style={{
                                height: '18px',
                                borderRadius: '4px',
                                background: isFriendTime ? brandColor : 'white',
                                border: '1px solid rgba(0,0,0,0.02)',
                                boxShadow: isFriendTime ? `0 2px 6px ${brandColor}44` : 'none'
                              }}
                            />
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                );
              })()}
              <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                Hier siehst du, wann {friend.first_name} im Lab ist.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FriendProfileModal;
