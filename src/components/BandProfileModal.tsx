import React, { useState, useEffect } from 'react';
import { 
  X, Music, Calendar, Youtube, Headphones, Plus, 
  Check, Play, Award, Users, Star, ExternalLink, 
  ThumbsUp, ThumbsDown, MessageSquare, MapPin, 
  Clock, Edit3, Camera
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BandProfileModalProps {
  bandId: string;
  onClose: () => void;
  loggedInUserId: string;
  brandColor: string;
}

export default function BandProfileModal({ bandId, onClose, loggedInUserId, brandColor }: BandProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'proposals' | 'gigs' | 'media'>('dashboard');
  const [band, setBand] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [gigs, setGigs] = useState<any[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);

  const [showProposeModal, setShowProposeModal] = useState(false);
  const [newSong, setNewSong] = useState({ title: '', artist: '' });

  useEffect(() => {
    fetchBandData();
  }, [bandId]);

  const fetchBandData = async () => {
    setLoading(true);
    try {
      // Fetch Band Info
      const { data: bandData } = await supabase
        .from('bands')
        .select('*, songs(title, artist)')
        .eq('id', bandId)
        .single();
      
      setBand(bandData);

      // Fetch Members
      const { data: membersData } = await supabase
        .from('band_members')
        .select('*, users(first_name, last_name, photo_url)')
        .eq('band_id', bandId);
      
      setMembers(membersData || []);
      setIsMember(membersData?.some(m => m.user_id === loggedInUserId) || false);

      // Fetch Proposals
      const { data: proposalsData } = await supabase
        .from('band_song_proposals')
        .select('*, band_proposal_votes(*)')
        .eq('band_id', bandId)
        .order('created_at', { ascending: false });
      
      setProposals(proposalsData || []);

      // Fetch Gigs
      const { data: gigsData } = await supabase
        .from('band_gigs')
        .select('*')
        .eq('band_id', bandId)
        .order('date', { ascending: true });
      
      setGigs(gigsData || []);

      // Fetch Media
      const { data: mediaData } = await supabase
        .from('band_media')
        .select('*')
        .eq('band_id', bandId)
        .order('created_at', { ascending: false });
      
      setMedia(mediaData || []);

    } catch (err) {
      console.error('Error fetching band data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (proposalId: string, vote: 'approve' | 'reject') => {
    if (!isMember) return;
    try {
      const { error } = await supabase
        .from('band_proposal_votes')
        .upsert({ 
          proposal_id: proposalId, 
          user_id: loggedInUserId, 
          vote 
        });
      
      if (!error) fetchBandData();
    } catch (err) {
      console.error('Voting error:', err);
    }
  };

  const submitProposal = async () => {
    if (!newSong.title || !newSong.artist) return;
    try {
      const { error } = await supabase
        .from('band_song_proposals')
        .insert({
          band_id: bandId,
          proposed_by: loggedInUserId,
          title: newSong.title,
          artist: newSong.artist,
          status: 'pending'
        });
      
      if (!error) {
        setNewSong({ title: '', artist: '' });
        setShowProposeModal(false);
        fetchBandData();
      }
    } catch (err) {
      console.error('Proposal error:', err);
    }
  };

  if (loading) return null; // Or a skeleton

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', padding: '20px' }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="band-profile-container animation-slide-up" 
        style={{ 
          width: '100%', 
          maxWidth: '1000px', 
          height: '90vh', 
          background: '#0f172a', 
          borderRadius: '32px', 
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.1)'
      }}>
        
        {/* Banner Section (Spotify Style) */}
        <div style={{ position: 'relative', height: '350px', flexShrink: 0 }}>
          <img 
            src={band?.banner_url || 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&q=80'} 
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} 
            alt="Band Banner"
          />
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            background: 'linear-gradient(to bottom, transparent, #0f172a)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '40px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div style={{ 
                width: '160px', 
                height: '160px', 
                borderRadius: '16px', 
                overflow: 'hidden', 
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                border: '4px solid white'
              }}>
                <img src={band?.avatar_url || '/band_placeholder.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Award size={20} color={brandColor} fill={brandColor} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Verified Artist Profile</span>
                </div>
                <h1 style={{ fontSize: '4.5rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>{band?.name}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '100px', fontSize: '0.9rem' }}>
                    <Users size={16} /> {members.length} Members
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '100px', fontSize: '0.9rem' }}>
                    <Calendar size={16} /> {gigs.length} Gigs
                  </div>
                </div>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', padding: '10px', borderRadius: '50%', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '32px', padding: '0 40px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#0f172a', zIndex: 10 }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Star },
            { id: 'proposals', label: 'New Songs', icon: Music },
            { id: 'gigs', label: 'Concerts', icon: MapPin },
            { id: 'media', label: 'Music & Video', icon: Youtube }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{ 
                padding: '20px 0',
                background: 'none',
                border: 'none',
                color: activeTab === tab.id ? brandColor : '#94a3b8',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderBottom: activeTab === tab.id ? `3px solid ${brandColor}` : '3px solid transparent',
                transition: 'all 0.2s'
              }}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px', background: 'linear-gradient(to bottom, #0f172a, #000000)' }}>
          
          {activeTab === 'dashboard' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '40px' }}>
              <div>
                <section style={{ marginBottom: '40px' }}>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Band Bio</h3>
                  <p style={{ color: '#94a3b8', fontSize: '1.1rem', lineHeight: 1.6 }}>
                    {band?.bio || "No bio yet. Tell the world about your band!"}
                  </p>
                </section>

                <section>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Members</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px' }}>
                    {members.map(m => (
                      <div key={m.id} style={{ textAlign: 'center' }}>
                        <div style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 12px', border: '2px solid rgba(255,255,255,0.1)' }}>
                          <img src={m.users.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={m.users.first_name} />
                        </div>
                        <div style={{ fontWeight: 700 }}>{m.users.first_name}</div>
                        <div style={{ fontSize: '0.8rem', color: brandColor, textTransform: 'uppercase', fontWeight: 800 }}>{m.instrument}</div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div>
                <div className="glass-panel" style={{ padding: '32px', background: 'rgba(255,255,255,0.03)', borderRadius: '24px' }}>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Music size={20} color={brandColor} /> Current Song
                  </h3>
                  {band?.songs ? (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎧</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{band.songs.title}</div>
                      <div style={{ color: '#94a3b8', marginBottom: '24px' }}>{band.songs.artist}</div>
                      <button style={{ width: '100%', padding: '14px', background: brandColor, color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
                        Practice Song
                      </button>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                      No song assigned yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'proposals' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                  <h2 style={{ fontSize: '2rem', margin: 0 }}>Song Proposals</h2>
                  <p style={{ color: '#94a3b8' }}>Democratically vote on the next song for your band.</p>
                </div>
                {isMember && (
                  <button 
                    onClick={() => setShowProposeModal(true)}
                    className="premium-button" 
                    style={{ background: brandColor, border: 'none', padding: '12px 24px', borderRadius: '12px', color: 'white', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Plus size={20} /> Propose Song
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                {proposals.map(p => {
                  const votes = p.band_proposal_votes || [];
                  const approvals = votes.filter((v: any) => v.vote === 'approve').length;
                  const totalPossible = members.length;
                  const isAccepted = approvals >= totalPossible;

                  return (
                    <div key={p.id} className="glass-panel" style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ width: '60px', height: '60px', background: isAccepted ? brandColor : 'rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                          <Music size={28} />
                        </div>
                        <div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{p.title}</div>
                          <div style={{ color: '#94a3b8' }}>{p.artist}</div>
                          <div style={{ marginTop: '8px', fontSize: '0.85rem', display: 'flex', gap: '12px' }}>
                            <span style={{ color: brandColor }}>{approvals} / {totalPossible} Votes</span>
                            {isAccepted && <span style={{ color: '#10b981', fontWeight: 800 }}>READY FOR TEACHER</span>}
                          </div>
                        </div>
                      </div>
                      
                      {isMember && (
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button 
                            onClick={() => handleVote(p.id, 'reject')}
                            style={{ padding: '12px', borderRadius: '12px', border: '1px solid #ef4444', background: 'none', color: '#ef4444', cursor: 'pointer' }}
                          >
                            <ThumbsDown size={20} />
                          </button>
                          <button 
                            onClick={() => handleVote(p.id, 'approve')}
                            style={{ padding: '12px', borderRadius: '12px', border: '1px solid #10b981', background: 'none', color: '#10b981', cursor: 'pointer' }}
                          >
                            <ThumbsUp size={20} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {proposals.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                    <MessageSquare size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                    <p>No proposals yet. Start the conversation!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'gigs' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h2 style={{ fontSize: '2rem', margin: 0 }}>Gig Calendar</h2>
                {isMember && (
                  <button className="premium-button" style={{ background: brandColor }}>
                    <Plus size={20} /> Add Concert
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gap: '20px' }}>
                {gigs.map(gig => (
                  <div key={gig.id} className="glass-panel" style={{ padding: '32px', background: 'rgba(255,255,255,0.02)', borderLeft: `6px solid ${brandColor}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ color: brandColor, fontWeight: 800, fontSize: '0.9rem', marginBottom: '8px' }}>
                          {new Date(gig.date).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                        </div>
                        <h3 style={{ fontSize: '1.75rem', margin: '0 0 8px 0' }}>{gig.title}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                          <MapPin size={16} /> {gig.venue}
                        </div>
                      </div>
                      <button style={{ padding: '12px 24px', background: 'white', color: 'black', borderRadius: '12px', fontWeight: 800, border: 'none', cursor: 'pointer' }}>
                        Tickets
                      </button>
                    </div>
                  </div>
                ))}
                {gigs.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                    <Calendar size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                    <p>No concerts scheduled. Keep practicing!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'media' && (
            <div>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h2 style={{ fontSize: '2rem', margin: 0 }}>Music & Video</h2>
                {isMember && (
                  <button className="premium-button" style={{ background: brandColor }}>
                    <Plus size={20} /> Add Media
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                {media.map(m => (
                  <div key={m.id} className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '20px', overflow: 'hidden' }}>
                    <div style={{ position: 'relative', height: '160px', background: '#000' }}>
                      {m.type === 'youtube' ? (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Youtube size={48} color="#ef4444" />
                        </div>
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Headphones size={48} color={brandColor} />
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '20px' }}>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '4px' }}>{m.title}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>{m.type}</div>
                      <a 
                        href={m.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: brandColor, textDecoration: 'none', fontWeight: 700 }}
                      >
                        {m.type === 'youtube' ? 'Watch Now' : 'Listen Now'} <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Propose Song Modal Overlay */}
        {showProposeModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 6000, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div className="glass-panel animation-slide-up" style={{ background: '#1e293b', padding: '32px', borderRadius: '24px', maxWidth: '400px', width: '100%', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Song vorschlagen</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Song Titel</label>
                  <input 
                    type="text" 
                    value={newSong.title}
                    onChange={(e) => setNewSong({ ...newSong, title: e.target.value })}
                    style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', marginTop: '4px' }}
                    placeholder="z.B. Smells Like Teen Spirit"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Artist</label>
                  <input 
                    type="text" 
                    value={newSong.artist}
                    onChange={(e) => setNewSong({ ...newSong, artist: e.target.value })}
                    style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', marginTop: '4px' }}
                    placeholder="z.B. Nirvana"
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button 
                    onClick={() => setShowProposeModal(false)}
                    style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Abbrechen
                  </button>
                  <button 
                    onClick={submitProposal}
                    style={{ flex: 1, padding: '14px', background: brandColor, color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Vorschlagen
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
