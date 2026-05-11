import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle, Monitor, Lock, ExternalLink, Settings, 
  Music, Zap, Users, Award, PlayCircle, Youtube, Calendar, Camera, X,
  ChevronLeft, ChevronRight, Clock, AlertCircle, RotateCcw, QrCode, Plus
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BandProfileContentProps {
  selectedBandForProfile: any;
  user: any;
  bandProfileView: 'public' | 'backstage';
  setBandProfileView: (view: 'public' | 'backstage') => void;
  brandColor: string;
  width: number;
  APP_INSTRUMENT_COLORS: Record<string, string>;
  APP_INSTRUMENT_ICONS: Record<string, any>;
  setShowBandProfile: (show: boolean) => void;
  setEditingBand: (band: any) => void;
  setShowEditBand: (show: boolean) => void;
  setShowAvatarPicker: (show: boolean) => void;
  setAvatarPickerType: (type: 'band' | 'student') => void;
  isSharedView?: boolean;
  onRefresh?: () => void;
}

const BandProfileContent: React.FC<BandProfileContentProps> = ({
  selectedBandForProfile,
  user,
  bandProfileView,
  setBandProfileView,
  brandColor,
  width,
  APP_INSTRUMENT_COLORS = {},
  APP_INSTRUMENT_ICONS = {},
  setShowBandProfile,
  setEditingBand,
  setShowEditBand,
  setShowAvatarPicker,
  setAvatarPickerType,
  isSharedView = false,
  onRefresh
}) => {
  if (!selectedBandForProfile) return null;

  const bSongs = selectedBandForProfile.band_songs || [];
  const directSong = selectedBandForProfile.songs;
  let allSongs: any[] = [];
  if (directSong) {
    if (Array.isArray(directSong)) allSongs = [...directSong];
    else allSongs.push(directSong);
  }
  bSongs.forEach((bs: any) => {
    const s = bs.songs ? (Array.isArray(bs.songs) ? bs.songs[0] : bs.songs) : null;
    if (s && !allSongs.find(as => as.id === s.id)) allSongs.push(s);
  });
  
  const isMember = (selectedBandForProfile.band_members || []).some((m: any) => m && m.user_id === user?.id);
  const isCoach = selectedBandForProfile.coach_id === user?.id;
  const isAdmin = user?.role?.toLowerCase() === "admin";
  const canEdit = isAdmin || isCoach || isMember;

  // Filtered repertoire: only songs where ALL required instrument slots are occupied
  const repertoireSongs = useMemo(() => {
    const normalize = (name: string) => {
      if (!name) return "";
      const n = name.toLowerCase();
      if (n.includes('guitar') || n.includes('gitarre')) return 'guitar';
      if (n.includes('bass')) return 'bass';
      if (n.includes('drums') || n.includes('schlagzeug')) return 'drums';
      if (n.includes('vocals') || n.includes('gesang') || n.includes('stimme')) return 'vocals';
      if (n.includes('piano') || n.includes('keys') || n.includes('klavier')) return 'keys';
      return n;
    };

    return allSongs.filter(song => {
      // 1. Founding song is always in repertoire
      if (song.id === selectedBandForProfile.song_id) return true;

      // 2. Check band_songs table
      const bandSong = bSongs.find((bs: any) => bs.song_id === song.id);
      if (!bandSong) return false;
      
      // If already active, it's in repertoire
      if (bandSong.status === 'active') return true;

      // Otherwise, check if all slots are occupied
      const instrumentation = song.instrumentation || {};
      const slots = bandSong.band_song_slots || [];
      
      return Object.entries(instrumentation).every(([inst, count]) => {
        const normReq = normalize(inst);
        if (normReq === 'vocals') return true; // Vocals logic (usually open)
        const occupiedCount = slots.filter((s: any) => normalize(s.instrument) === normReq && s.user_id).length;
        return occupiedCount >= (count as number);
      });
    });
  }, [allSongs, bSongs]);

  const [shoutboxMessages, setShoutboxMessages] = useState<any[]>([]);
  const [newShoutMessage, setNewShoutMessage] = useState('');
  const [isLoadingShout, setIsLoadingShout] = useState(false);
  const [shoutboxError, setShoutboxError] = useState<string | null>(null);
  const [isPostingShout, setIsPostingShout] = useState(false);
  const [songProposals, setSongProposals] = useState<any[]>([]);
  const [isJoiningProposal, setIsJoiningProposal] = useState(false);

  useEffect(() => {
    if (bandProfileView === 'backstage') {
      fetchShoutbox();
      fetchSongProposals();
      const channel = supabase
        .channel(`band_realtime_${selectedBandForProfile.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'band_shoutbox', filter: `band_id=eq.${selectedBandForProfile.id}` }, () => fetchShoutbox())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'band_songs', filter: `band_id=eq.${selectedBandForProfile.id}` }, () => fetchSongProposals())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'band_song_slots' }, () => fetchSongProposals())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [bandProfileView, selectedBandForProfile.id]);

  const fetchShoutbox = async () => {
    try {
      setIsLoadingShout(true);
      const { data, error } = await supabase
        .from('band_shoutbox')
        .select('*, author:users!user_id(id, first_name, photo_url)')
        .eq('band_id', selectedBandForProfile.id)
        .order('created_at', { ascending: true });

      if (error) {
        setShoutboxError(`Fehler: ${error.message}`);
      } else {
        setShoutboxMessages(data || []);
        setShoutboxError(null);
      }
    } catch (err: any) {
      setShoutboxError(err.message);
    } finally {
      setIsLoadingShout(false);
    }
  };

  const postShoutMessage = async () => {
    console.log('[Shoutbox] Attempting to post message...');
    if (!newShoutMessage.trim()) {
      console.warn('[Shoutbox] Empty message, aborting.');
      return;
    }
    if (!user) {
      console.error('[Shoutbox] No user logged in, cannot post.');
      setShoutboxError('Du musst eingeloggt sein, um Nachrichten zu schreiben.');
      return;
    }
    
    setIsPostingShout(true);
    setShoutboxError(null);
    
    try {
      console.log('[Shoutbox] Inserting into DB:', { band_id: selectedBandForProfile.id, user_id: user.id });
      const { error } = await supabase.from('band_shoutbox').insert({
        band_id: selectedBandForProfile.id,
        user_id: user.id,
        content: newShoutMessage.trim()
      });
      
      if (error) {
        console.error('[Shoutbox] Supabase error:', error);
        setShoutboxError(`Fehler beim Senden: ${error.message}`);
      } else {
        console.log('[Shoutbox] Message posted successfully!');
        setNewShoutMessage('');
        fetchShoutbox();
      }
    } catch (err: any) {
      console.error('[Shoutbox] Unexpected error:', err);
      setShoutboxError(`Unerwarteter Fehler: ${err.message}`);
    } finally {
      setIsPostingShout(false);
    }
  };
  const fetchSongProposals = async () => {
    try {
      const { data, error } = await supabase
        .from('band_songs')
        .select(`
          *,
          songs (*),
          suggested_by_user:users!suggested_by (first_name, photo_url),
          band_song_slots (*, users(id, first_name, photo_url, user_song_skills:user_song_skills!user_song_skills_user_id_fkey(id, song_id, instrument, is_pending_approval, is_stage_ready)))
        `)
        .eq('band_id', selectedBandForProfile.id)
        .eq('status', 'proposal');

      if (!error) setSongProposals(data || []);
    } catch (err) {
      console.error('[Proposals] Error:', err);
    }
  };

  const joinSongProposal = async (proposalId: string, instrument: string, partNumber: number) => {
    if (!user || isJoiningProposal) return;
    setIsJoiningProposal(true);
    try {
      // Check if user already has a slot for this song
      const proposal = songProposals.find((p: any) => p.id === proposalId);
      const myExistingSlot = proposal?.band_song_slots?.find((s: any) => s.user_id === user.id);
      
      const isNewVocals = instrument.toLowerCase().includes('vocals') || instrument.toLowerCase().includes('gesang');
      
      if (myExistingSlot) {
        const isExistingVocals = myExistingSlot.instrument.toLowerCase().includes('vocals') || myExistingSlot.instrument.toLowerCase().includes('gesang');
        
        // Block if trying to book two instruments (neither is vocals)
        if (!isNewVocals && !isExistingVocals) {
          alert('Du kannst dich nur für ein Instrument pro Song einbuchen (plus Gesang).');
          setIsJoiningProposal(false);
          return;
        }
      }

      // 1. Join the slot
      const { error: joinErr } = await supabase
        .from('band_song_slots')
        .insert({
          band_song_id: proposalId,
          user_id: user.id,
          instrument,
          part_number: partNumber
        });

      if (joinErr) {
        if (joinErr.code === '23505') {
          alert('Wichtiger Hinweis: Du bist bereits für einen Slot in diesem Song eingetragen.\n\nDamit du Gesang UND ein Instrument gleichzeitig wählen kannst, musst du (oder dein Admin) im Supabase Dashboard den "Unique Constraint" (Eindeutigkeits-Regel) für die Tabelle "band_song_slots" entfernen. Aktuell erlaubt die Datenbank nur einen Eintrag pro Person und Song-Vorschlag.');
        } else {
          alert('Fehler beim Einbuchen: ' + joinErr.message);
        }
        throw joinErr;
      }

      // 2. Submit challenge (unless Vocals)
      const isVocals = instrument.toLowerCase().includes('vocals') || instrument.toLowerCase().includes('gesang');
      if (!isVocals) {
        const proposal = songProposals.find((p: any) => p.id === proposalId);
        const songId = proposal?.song_id;
        
        if (songId) {
          // Check for existing skill
          const { data: existingSkills } = await supabase
            .from('user_song_skills')
            .select('id')
            .match({ user_id: user.id, song_id: songId, instrument: instrument });
          
          if (existingSkills && existingSkills.length > 0) {
            await supabase
              .from('user_song_skills')
              .update({ is_pending_approval: true, progress_percent: 100 })
              .eq('id', existingSkills[0].id);
          } else {
            await supabase
              .from('user_song_skills')
              .insert({
                user_id: user.id,
                song_id: songId,
                instrument: instrument,
                difficulty_level: 'original',
                progress_percent: 100,
                is_pending_approval: true
              });
          }
        }
      }

      // 3. Fetch current status to check if full
      const { data: currentProp } = await supabase
        .from('band_songs')
        .select('*, songs(*), band_song_slots(*)')
        .eq('id', proposalId)
        .single();

      if (currentProp) {
        const instrumentation = currentProp.songs?.instrumentation || {};
        const slots = currentProp.band_song_slots || [];
        
        let isFull = true;
        Object.entries(instrumentation).forEach(([inst, count]: [string, any]) => {
          for (let i = 1; i <= (count as number); i++) {
            if (!slots.find((s: any) => s.instrument === inst && s.part_number === i)) {
              isFull = false;
            }
          }
        });

        if (isFull) {
          await supabase.from('band_songs').update({ status: 'active' }).eq('id', proposalId);
          await supabase.from('band_shoutbox').insert({
            band_id: selectedBandForProfile.id,
            user_id: user.id,
            content: `🔥 Juhu! Unsere Band ist für "${currentProp.songs?.title}" jetzt vollständig besetzt. Der Song ist ab sofort in unserem Repertoire!`
          });
          if (onRefresh) onRefresh();
        }
      }

      fetchSongProposals();
    } catch (err) {
      console.error('[Join] Error:', err);
    } finally {
      setIsJoiningProposal(false);
    }
  };

  const [planningData, setPlanningData] = useState<any[]>([]);
  const [isLoadingPlanner, setIsLoadingPlanner] = useState(false);
  const [plannerError, setPlannerError] = useState<string | null>(null);
  const bandUserIds = React.useMemo(() => {
    return (selectedBandForProfile.band_members || [])
      .map((m: any) => m.user_id || m.student_id)
      .filter(Boolean);
  }, [selectedBandForProfile.band_members]);

  useEffect(() => {
    if (bandProfileView === 'backstage' && bandUserIds.length > 0) {
      fetchBandPlanning();
    }
  }, [bandProfileView, selectedBandForProfile.id, bandUserIds]);

  const [fixedRehearsals, setFixedRehearsals] = useState<any[]>([]);

  const maxMatches = React.useMemo(() => {
    if (!planningData.length) return 0;
    const counts: Record<string, number> = {};
    planningData.forEach(s => {
      const key = `${s.day}-${s.time}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    const vals = Object.values(counts);
    return vals.length ? Math.max(...vals) : 0;
  }, [planningData]);

  const fetchBandPlanning = async () => {
    if (bandUserIds.length === 0) return;
    try {
      setIsLoadingPlanner(true);
      const { data, error } = await supabase
        .from('lab_planning')
        .select('*')
        .in('user_id', bandUserIds);
      
      if (error) setPlannerError(error.message);
      else {
        setPlanningData(data || []);
        setPlannerError(null);
      }
      
      const { data: fixData, error: fixError } = await supabase
        .from('band_rehearsals')
        .select('*')
        .eq('band_id', selectedBandForProfile.id);
      
      if (!fixError) setFixedRehearsals(fixData || []);
    } catch (err: any) {
      setPlannerError(err.message);
    } finally {
      setIsLoadingPlanner(false);
    }
  };

  const toggleFixedRehearsal = async (day: string, time: string) => {
    if (!canEdit) return;
    const existing = fixedRehearsals.find(r => r.day === day && r.time === time);
    try {
      if (existing) {
        await supabase.from('band_rehearsals').delete().eq('id', existing.id);
      } else {
        await supabase.from('band_rehearsals').insert({
          band_id: selectedBandForProfile.id,
          day,
          time,
          created_by: user?.id
        });
      }
      fetchBandPlanning();
    } catch (err) {
      console.error(err);
    }
  };

  const schoolData = Array.isArray(user?.schools) ? user?.schools[0] : user?.schools;
  const openingHours = schoolData?.opening_hours || {};
  
  const weekDaysForRange = useMemo(() => {
    // Only consider the next 14 days (current + next week)
    const days = [];
    const startOfWeek = new Date();
    const currentDay = startOfWeek.getDay();
    const diff = currentDay === 0 ? -6 : 1 - currentDay;
    startOfWeek.setDate(startOfWeek.getDate() + diff);
    
    for (let i = 0; i < 14; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      days.push(d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase());
    }
    return [...new Set(days)];
  }, []);

  const timeSlots = useMemo(() => {
    let minTime = "16:45";
    let maxTime = "19:00";
    
    const relevantStarts: string[] = [];
    const relevantEnds: string[] = [];
    
    weekDaysForRange.forEach(dayName => {
      const h = openingHours[dayName];
      if (h && h.active) {
        if (h.start) relevantStarts.push(h.start);
        if (h.end) relevantEnds.push(h.end);
      }
    });
    
    if (relevantStarts.length > 0) minTime = relevantStarts.sort()[0];
    if (relevantEnds.length > 0) maxTime = relevantEnds.sort().reverse()[0];
    
    const slots = [];
    try {
      let current = new Date(`2000-01-01T${minTime}:00`);
      const end = new Date(`2000-01-01T${maxTime}:00`);
      
      while (current <= end) {
        slots.push(current.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));
        current.setMinutes(current.getMinutes() + 15);
        if (slots.length > 100) break; // Safety break
      }
    } catch (e) {
      return ["16:45", "17:00", "17:15", "17:30", "17:45", "18:00", "18:15", "18:30", "18:45", "19:00"];
    }
    return slots.length > 0 ? slots : ["16:45", "17:00", "17:15", "17:30", "17:45", "18:00", "18:15", "18:30", "18:45", "19:00"];
  }, [openingHours, weekDaysForRange]);

  const getWeekDays = (offset = 0) => {
    const days = [];
    const startOfWeek = new Date();
    const currentDay = startOfWeek.getDay();
    const diff = currentDay === 0 ? -6 : 1 - currentDay;
    startOfWeek.setDate(startOfWeek.getDate() + diff + (offset * 7));
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      const dayShort = d.toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', '');
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      if (openingHours[dayName] && openingHours[dayName].active) {
        days.push({
          id: dayShort,
          label: dayShort,
          date: d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
          dayName
        });
      }
    }
    return days;
  };

  const widgetStyle: React.CSSProperties = {
    background: 'rgba(35, 35, 35, 0.65)',
    backdropFilter: 'blur(25px)',
    borderRadius: '40px',
    padding: '32px',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
  };

  const widgetHeaderStyle: React.CSSProperties = {
    fontSize: '0.8rem',
    fontWeight: 950,
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
    textTransform: 'uppercase',
    letterSpacing: '0.15em'
  };

   const glassButtonStyle: React.CSSProperties = {
    background: 'rgba(35, 35, 35, 0.65)',
    backdropFilter: 'blur(25px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '12px',
    color: 'white',
    padding: '8px 16px',
    fontSize: '0.8rem',
    fontWeight: 950,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
  };

  return (
    <div style={{ position: 'relative', background: '#0a0a0a', minHeight: '100vh', color: 'white' }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ minHeight: "620px", position: "relative", display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: "60px", paddingTop: "100px", overflow: "hidden" }}>
             {/* Header Background & Effects (Backdrop) */}
             <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
               {/* Enhanced Atmosphere restricted to Hero height */}
               <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 20% 20%, ${brandColor}15 0%, transparent 70%), radial-gradient(circle at 80% 80%, ${brandColor}11 0%, transparent 70%), radial-gradient(circle at 50% 50%, ${brandColor}08 0%, transparent 80%)`, filter: 'blur(80px)', opacity: 0.9 }}></div>
               
               <img src={selectedBandForProfile.photo_url || "/studio_dark.jpg"} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
               {/* Cinematic Vignette - Slightly lighter for overall brightness */}
               <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,10,10,0.2) 0%, rgba(10,10,10,0.7) 60%, #0a0a0a 100%)', zIndex: 1 }}></div>
               {/* Brand Glow behind Title */}
               <div style={{ position: 'absolute', top: '50%', left: '30%', width: '600px', height: '400px', background: `radial-gradient(circle, ${brandColor}22 0%, transparent 70%)`, filter: 'blur(60px)', zIndex: 1, pointerEvents: 'none', transform: 'translate(-50%, -50%)' }}></div>
             </div>
             
             {user && !isSharedView && (
                <button onClick={() => setShowBandProfile(false)} style={{ position: 'absolute', top: 30, right: 30, background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                  <X size={20} />
                </button>
             )}

             <div style={{ maxWidth: '1600px', margin: '0 auto', width: '100%', padding: '0 40px', position: 'relative', zIndex: 2 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '40px' }}>
                     <div style={{ position: 'relative', width: '220px', height: '220px', borderRadius: '40px', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.6)', border: '4px solid rgba(255,255,255,0.2)' }}>
                       {selectedBandForProfile.photo_url ? (
                          <img src={selectedBandForProfile.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                       ) : (
                          <div style={{ width: '100%', height: '100%', background: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             <Users size={80} color="black" />
                          </div>
                       )}

                       {/* BAND Badge Integrated into Photo - Bottom Left */}
                       <div style={{ position: 'absolute', bottom: '20px', left: '20px', background: 'rgba(35, 35, 35, 0.9)', backdropFilter: 'blur(10px)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 950, textTransform: 'uppercase', boxShadow: '0 10px 20px rgba(0,0,0,0.3)', zIndex: 11, border: '1px solid rgba(255,255,255,0.1)' }}>BAND</div>

                       {canEdit && (
                          <button 
                            onClick={() => { setAvatarPickerType('band'); setShowAvatarPicker(true); }}
                            style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
                            className="hover-scale"
                          >
                            <Camera size={18} />
                          </button>
                       )}
                    </div>

                    <div style={{ flex: 1 }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                          {/* Ultimate Contrast Verified Badge - Now Left-Aligned */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 950, color: 'black', textTransform: 'uppercase', background: brandColor, padding: '8px 16px', borderRadius: '10px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', border: '1px solid rgba(0,0,0,0.1)' }}>
                             <CheckCircle size={14} fill="black" color={brandColor} /> Verifiziertes GrooveLab Projekt
                          </div>

                          {/* Genre Label - Only show if present */}
                          {selectedBandForProfile.genre && (
                            <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 950, textTransform: 'uppercase', border: '1px solid rgba(255,255,255,0.1)' }}>{selectedBandForProfile.genre}</div>
                          )}
                       </div>
                       
                       <h1 style={{ fontSize: width < 768 ? '3rem' : '5.5rem', fontWeight: 950, margin: '0 0 24px', letterSpacing: '-0.03em', lineHeight: 0.9, color: "white" }}>{selectedBandForProfile.name}</h1>

                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                         <span style={{ fontSize: '0.85rem', color: 'white', fontWeight: 800 }}>{selectedBandForProfile.band_members?.length || 0} Mitglieder</span>
                         <span style={{ fontSize: '0.85rem', color: 'white', fontWeight: 800 }}>{repertoireSongs.length} Songs im Repertoire</span>
                         
                         {/* GROOVELAB ORIGINAL Stamp Look (Inverted) */}
                         <div style={{ 
                            background: `#eab308`, 
                            color: 'black', 
                            padding: '4px 12px', 
                            borderRadius: '4px', 
                            fontSize: '0.7rem', 
                            fontWeight: 950, 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.1em', 
                            transform: 'rotate(-2deg)', 
                            boxShadow: '0 4px 15px rgba(234, 179, 8, 0.4)',
                            border: '2px solid black',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginLeft: '10px'
                          }}>
                             <Zap size={10} fill="currentColor" /> GROOVELAB ORIGINAL
                          </div>
                         
                         <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginLeft: 'auto' }}>
                            <button 
                              onClick={() => {
                                const url = `${window.location.origin}${window.location.pathname}?band=${selectedBandForProfile.id}&view=shared`;
                                navigator.clipboard.writeText(url);
                                alert('Link kopiert! Externe User sehen nun nur noch dieses Bandprofil.');
                              }} 
                              style={glassButtonStyle}
                              className="hover-scale"
                            >
                              <QrCode size={14} /> Seite teilen
                            </button>
                            {canEdit && (
                               <button 
                                onClick={() => { setEditingBand({ ...selectedBandForProfile }); setShowEditBand(true); }} 
                                style={{ ...glassButtonStyle, background: 'white', color: 'black' }}
                                className="hover-scale"
                               >
                                  <Settings size={14} /> Profil bearbeiten
                               </button>
                            )}
                             {canEdit && !isSharedView && (
                               <div style={{ display: 'flex', background: 'rgba(35, 35, 35, 0.65)', backdropFilter: 'blur(25px)', padding: '4px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)' }}>
                                 <button onClick={() => setBandProfileView('public')} style={{ background: bandProfileView === 'public' ? 'rgba(255,255,255,0.1)' : 'transparent', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 950, cursor: 'pointer', transition: 'all 0.2s' }}>PUBLIC</button>
                                 <button onClick={() => setBandProfileView('backstage')} style={{ background: bandProfileView === 'backstage' ? brandColor : 'transparent', color: bandProfileView === 'backstage' ? 'black' : 'white', border: 'none', padding: '6px 14px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 950, cursor: 'pointer', transition: 'all 0.2s' }}>BACKSTAGE</button>
                               </div>
                             )}
                         </div>
                      </div>
                   </div>
                </div>
             </div>
        </div>
        <div style={{ maxWidth: "1600px", margin: "40px auto 0", width: "100%", padding: "0 40px 80px" }}>
          {bandProfileView === "backstage" && !isSharedView ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              {/* Row 1: Planner and Shoutbox */}
              <div style={{ display: 'grid', gridTemplateColumns: width < 1200 ? '1fr' : 'minmax(0, 1fr) 400px', gap: '60px' }}>
                <section style={{ ...widgetStyle, height: '580px' }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ ...widgetHeaderStyle, margin: 0 }}><Calendar size={20} color={brandColor} /> Band Wochenplaner</h3>
                    <button onClick={fetchBandPlanning} style={{ background: "none", border: "none", color: "white", cursor: "pointer", opacity: 0.2 }}><RotateCcw size={14} /></button>
                  </div>
               
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "32px" }}>
                    {[0, 1].map(weekOffset => {
                      const weekDays = getWeekDays(weekOffset);
                      return (
                        <div key={weekOffset}>
                          <div style={{ fontSize: "0.6rem", fontWeight: 950, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: '0.2em', marginBottom: "24px" }}>{weekOffset === 0 ? "Diese Woche" : "Nächste Woche"}</div>
                          <div style={{ display: "grid", gridTemplateColumns: `40px repeat(${weekDays.length}, 1fr)`, gap: "8px" }}>
                            {/* Time Column */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              <div style={{ height: "12px" }}></div> {/* header spacer */}
                              {timeSlots.map(time => (
                                <div key={time} style={{ height: "30px", display: "flex", alignItems: "center", justifyContent: "flex-end", fontSize: "0.55rem", color: "rgba(255,255,255,0.3)", fontWeight: 800, paddingRight: "4px" }}>
                                  {time}
                                </div>
                              ))}
                            </div>
                            
                            {weekDays.map(day => (
                              <div key={day.id} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                <div style={{ textAlign: "center", fontSize: "0.6rem", fontWeight: 950, color: "white", height: "12px" }}>{day.label}</div>
                                {timeSlots.map(time => {
                                  const h = openingHours[day.dayName];
                                  const isOpen = h && h.active && time >= h.start && time <= h.end;
                                  
                                  const isFixed = fixedRehearsals.some(r => r.day === day.id && r.time === time);
                                  const count = planningData.filter(s => s.day === day.id && s.time === time).length;
                                  const isTopMatch = count === maxMatches && count > 0;
                                  
                                  let bg = "rgba(255,255,255,0.03)";
                                  let color = "rgba(255,255,255,0.2)";
                                  
                                  if (!isOpen) {
                                    bg = "transparent";
                                    color = "transparent";
                                  } else if (isFixed) { 
                                    bg = "#22c55e"; color = "black"; 
                                  } else if (isTopMatch) { 
                                    bg = brandColor; color = "black"; 
                                  } else if (count > 0) { 
                                    bg = "rgba(255,255,255,0.1)"; color = "white"; 
                                  }

                                  return (
                                    <div 
                                      key={time} 
                                      onClick={() => isOpen && toggleFixedRehearsal(day.id, time)} 
                                      style={{ 
                                        height: "30px", 
                                        background: bg, 
                                        borderRadius: "6px", 
                                        display: "flex", 
                                        alignItems: "center", 
                                        justifyContent: "center", 
                                        color: color, 
                                        fontSize: "0.55rem", 
                                        fontWeight: 950, 
                                        cursor: (canEdit && isOpen) ? "pointer" : "default",
                                        opacity: isOpen ? 1 : 0.2,
                                        border: isOpen ? 'none' : '1px dashed rgba(255,255,255,0.05)'
                                      }}
                                    >
                                      {isOpen && (isFixed ? <Zap size={10} fill="currentColor" /> : count > 0 ? count : null)}
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <div style={{ ...widgetStyle, display: 'flex', flexDirection: 'column', height: '580px' }}>
                  <h4 style={widgetHeaderStyle}><Zap size={16} /> Shoutbox</h4>
                  {shoutboxError && (
                    <div style={{ color: '#ef4444', fontSize: '0.7rem', marginBottom: '8px', padding: '8px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>
                      {shoutboxError}
                    </div>
                  )}
                  <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", paddingRight: '4px' }} className="custom-scrollbar">
                    {shoutboxMessages.filter((msg: any) => {
                      const msgDate = new Date(msg.created_at);
                      const now = new Date();
                      return (now.getTime() - msgDate.getTime()) < (24 * 60 * 60 * 1000);
                    }).map((msg: any) => (
                      <div key={msg.id} style={{ display: "flex", gap: "12px", background: "#1a1a1a", padding: "16px", borderRadius: "16px", border: '1px solid rgba(255,255,255,0.06)' }}>
                        <img src={msg.author?.photo_url || "/avatar_ghost.jpg"} style={{ width: "32px", height: "32px", borderRadius: "8px", objectFit: 'cover' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "0.75rem", fontWeight: 950, color: "white", marginBottom: '4px' }}>{msg.author?.first_name}</div>
                          <div style={{ fontSize: "0.85rem", color: "white", lineHeight: 1.4, opacity: 0.9 }}>{msg.content}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "16px" }}>
                    <div style={{ position: "relative", display: 'flex', gap: '10px' }}>
                      <textarea 
                        value={newShoutMessage} 
                        onChange={(e) => setNewShoutMessage(e.target.value)} 
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postShoutMessage(); } }} 
                        placeholder="Nachricht..." 
                        style={{ flex: 1, background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", color: "white", padding: "14px", borderRadius: "16px", resize: "none", outline: "none", fontSize: '0.85rem', minHeight: '50px' }} 
                      />
                      <button 
                        onClick={postShoutMessage}
                        disabled={isPostingShout || !newShoutMessage.trim()}
                        style={{ background: brandColor, color: 'black', border: 'none', borderRadius: '16px', padding: '0 18px', cursor: (isPostingShout || !newShoutMessage.trim()) ? 'default' : 'pointer', opacity: (isPostingShout || !newShoutMessage.trim()) ? 0.5 : 1, transition: 'all 0.2s' }}
                      >
                        <Zap size={18} fill="currentColor" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Repertoire Planer (Full Width) */}
              <section style={{ ...widgetStyle, padding: '32px', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ ...widgetHeaderStyle, margin: 0, fontSize: '1rem' }}><Zap size={20} color={brandColor} fill="currentColor" /> Band Repertoire-Planer</h3>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button 
                      onClick={() => window.location.reload()}
                      style={{ 
                        background: 'rgba(255,255,255,0.05)', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        color: 'white', 
                        padding: '6px 12px', 
                        borderRadius: '8px', 
                        fontSize: '0.75rem', 
                        fontWeight: 800, 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      className="hover-scale"
                    >
                      <RotateCcw size={14} /> Seite neu laden
                    </button>
                    <span style={{ fontSize: '0.7rem', fontWeight: 950, background: 'rgba(234, 179, 8, 0.2)', padding: '6px 12px', borderRadius: '8px', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.3)' }}>BETA</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 950, background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '8px', color: brandColor }}>MATCHING AKTIV</span>
                  </div>
                </div>
                
                {songProposals.length === 0 ? (
                  <div style={{ padding: '60px 40px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '32px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🎵</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', marginBottom: '4px' }}>Noch keine Song-Vorschläge</div>
                    <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', maxWidth: '400px', margin: '0 auto' }}>
                      Meistere einen Song zu 100% und schlage ihn deiner Band vor!
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {songProposals.map(prop => (
                      <div key={prop.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '32px', padding: '32px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                              <Music size={24} color={brandColor} />
                            </div>
                            <div>
                              <div style={{ fontSize: '1.6rem', fontWeight: 950, color: 'white', lineHeight: 1.1 }}>{prop.songs?.title}</div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>{prop.songs?.artist}</div>
                              
                              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                {prop.songs?.tomplay_url && (
                                  <button 
                                    onClick={() => window.open(prop.songs.tomplay_url, '_blank')}
                                    style={{ ...glassButtonStyle, padding: '6px 12px', fontSize: '0.7rem', background: 'rgba(255,255,255,0.1)' }}
                                    className="hover-scale"
                                  >
                                    <ExternalLink size={12} /> Noten öffnen
                                  </button>
                                )}
                                <button 
                                  onClick={async () => {
                                    const myMembership = (selectedBandForProfile.band_members || []).find((m: any) => m && m.user_id === user?.id);
                                    const instrument = myMembership?.instrument || 'Musik';
                                    
                                    const { error } = await supabase.from('user_song_skills').insert({
                                      user_id: user.id,
                                      song_id: prop.songs.id,
                                      instrument: instrument,
                                      difficulty_level: 'original',
                                      progress_percent: 0,
                                      is_stage_ready: false
                                    });
                                    
                                    if (error) {
                                      if (error.code === '23505') alert('Dieser Song ist bereits in deinem Üben-Menü!');
                                      else alert('Fehler: ' + error.message);
                                    } else {
                                      alert('Song zu deinem Üben-Menü hinzugefügt!');
                                      if (onRefresh) onRefresh();
                                    }
                                  }}
                                  style={{ ...glassButtonStyle, padding: '6px 12px', fontSize: '0.7rem', border: `1px solid ${brandColor}44` }}
                                  className="hover-scale"
                                >
                                  <Plus size={12} /> Zum Üben hinzufügen
                                </button>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '12px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Vorgeschlagen von</div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 950, color: 'white' }}>{prop.suggested_by_user?.first_name}</div>
                            </div>
                            <img src={prop.suggested_by_user?.photo_url || '/avatar_ghost.jpg'} style={{ width: '40px', height: '40px', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.1)' }} />
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', padding: '32px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.03)' }}>
                          {(() => {
                            const instrumentation = prop.songs?.instrumentation || {};
                            const slots: any[] = [];
                            Object.entries(instrumentation).forEach(([inst, count]: [string, any]) => {
                              for (let i = 1; i <= (count as number); i++) {
                                const occupant = prop.band_song_slots?.find((s: any) => s.instrument === inst && s.part_number === i);
                                slots.push({ inst, part: i, occupant });
                              }
                            });
                            
                            return slots.map((slot, idx) => {
                              const isMySlot = slot.occupant?.user_id === user.id;
                              
                              return (
                                <div key={idx} style={{ width: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                  <div style={{ 
                                    width: '64px', height: '64px', borderRadius: '18px', 
                                    background: slot.occupant ? 'white' : 'rgba(255,255,255,0.03)', 
                                    border: isMySlot ? `3px solid ${brandColor}` : (slot.occupant ? '1px solid rgba(255,255,255,0.2)' : '2px dashed rgba(255,255,255,0.1)'),
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                                    boxShadow: isMySlot ? `0 0 30px ${brandColor}44` : 'none',
                                    transition: 'all 0.2s'
                                  }}>
                                    {slot.occupant ? (
                                      (() => {
                                        const skills = slot.occupant.users?.user_song_skills || [];
                                        const skill = skills.find((s: any) => s.song_id === prop.song_id && s.instrument === slot.inst);
                                        const isPending = skill?.is_pending_approval;
                                        const isVocals = slot.inst.toLowerCase().includes('vocals') || slot.inst.toLowerCase().includes('gesang');
                                        const showGrayscale = !isVocals && isPending;
                                        
                                        return (
                                          <img 
                                            src={slot.occupant.users?.photo_url || '/avatar_ghost.jpg'} 
                                            style={{ 
                                              width: '100%', 
                                              height: '100%', 
                                              objectFit: 'cover',
                                              filter: showGrayscale ? 'grayscale(100%)' : 'none',
                                              opacity: showGrayscale ? 0.7 : 1,
                                              transition: 'all 0.5s ease'
                                            }} 
                                            title={showGrayscale ? 'Wartet auf Lehrer-Bestätigung...' : ''}
                                          />
                                        );
                                      })()
                                    ) : (
                                      <button onClick={() => joinSongProposal(prop.id, slot.inst, slot.part)} style={{ background: 'transparent', border: 'none', width: '100%', height: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.1)' }} className="hover-scale">
                                        <Plus size={28} />
                                      </button>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 950, color: slot.occupant ? 'white' : 'rgba(255,255,255,0.4)', textTransform: 'uppercase', textAlign: 'center' }}>
                                      {APP_INSTRUMENT_ICONS[slot.inst] || '🎸'} {slot.inst}
                                    </div>
                                    {slot.occupant && (
                                      <div style={{ fontSize: '0.75rem', fontWeight: 900, color: brandColor, textAlign: 'center' }}>
                                        {slot.occupant.users?.first_name}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: width < 1200 ? '1fr' : 'minmax(0, 1fr) 400px', gap: '60px' }}>
              <div style={{ flex: 1 }}>
                <section style={{ ...widgetStyle, marginBottom: '40px' }}>
                   <h3 style={widgetHeaderStyle}>Story</h3>
                   <p style={{ fontSize: '0.9rem', color: 'white', opacity: 0.7, lineHeight: 1.6, margin: 0 }}>{selectedBandForProfile.bio || 'Keine Story vorhanden.'}</p>
                </section>
                <section style={widgetStyle}>
                   <h3 style={widgetHeaderStyle}><Music size={20} color={brandColor} /> Repertoire</h3>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {repertoireSongs.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.05)' }}>
                           <Music size={40} color="white" style={{ opacity: 0.1, marginBottom: '16px' }} />
                           <p style={{ color: 'white', opacity: 0.4, fontSize: '0.9rem', fontWeight: 800 }}>Das Repertoire wird erst sichtbar, wenn alle Instrumente im Arrangement besetzt sind.</p>
                        </div>
                      ) : (
                        repertoireSongs.map((song: any, idx: number) => (
                           <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '16px', borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.03)', transition: 'all 0.2s' }}>
                              <div style={{ flex: 1 }}>
                                 <div style={{ fontWeight: 950, color: 'white', fontSize: '1rem', marginBottom: '2px' }}>{song.title}</div>
                                 <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{song.artist}</div>
                              </div>
                           </div>
                        ))
                      )}
                   </div>
                </section>
              </div>

              <aside style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                <div style={widgetStyle}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h4 style={{ ...widgetHeaderStyle, marginBottom: 0 }}><Users size={16} /> Besetzung</h4>
                      {selectedBandForProfile.coach && (
                         <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 950, color: '#eab308', background: 'rgba(234,179,8,0.1)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(234,179,8,0.2)' }}>
                            <Award size={10} fill="currentColor" /> COACH: {selectedBandForProfile.coach.first_name}
                         </div>
                      )}
                   </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                       {(selectedBandForProfile.band_members || []).map((m: any, idx: number) => {
                          const u = m.users ? (Array.isArray(m.users) ? m.users[0] : m.users) : null;
                          return (
                             <div key={idx} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.02)" }}>
                                <img src={u?.photo_url || "/avatar_ghost.jpg"} style={{ width: "48px", height: "48px", borderRadius: "14px", border: "2px solid rgba(255,255,255,0.05)" }} />
                                <div>
                                   <div style={{ fontSize: "0.9rem", fontWeight: 950, color: "white", marginBottom: "2px" }}>{u?.first_name || m.external_name}</div>
                                   <div style={{ fontSize: "0.65rem", fontWeight: 950, color: brandColor, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                     {APP_INSTRUMENT_ICONS[m.instrument] || (m.instrument === "Musik" ? "🎼" : "🎸")} {m.instrument || "Musiker"}
                                   </div>
                                </div>
                             </div>
                          );
                       })}
                    </div>
                 </div>

                <div style={widgetStyle}>
                   <h4 style={widgetHeaderStyle}><Music size={16} color={brandColor} /> Musik</h4>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {(selectedBandForProfile.soundcloud_links || []).map((track: any, i: number) => {
                         const trackData = typeof track === 'string' ? { title: 'Track ' + (i + 1), url: track } : track;
                         return (
                           <a key={i} href={trackData.url} target="_blank" rel="noopener noreferrer" style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', color: 'white', textDecoration: 'none' }}>
                              <PlayCircle size={18} color={brandColor} />
                              <div style={{ flex: 1, fontSize: '0.8rem', fontWeight: 800 }}>{trackData.title || 'Track ' + (i + 1)}</div>
                              <ExternalLink size={12} style={{ opacity: 0.4 }} />
                           </a>
                         );
                      })}
                      {(selectedBandForProfile.soundcloud_links || []).length === 0 && (
                        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', margin: 0 }}>Keine Musik-Links vorhanden.</p>
                      )}
                   </div>
                </div>

                <div style={widgetStyle}>
                   <h4 style={widgetHeaderStyle}><Youtube size={16} color="#ff0000" /> Videos</h4>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {(selectedBandForProfile.youtube_links || []).map((url: string, i: number) => (
                         <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', color: 'white', textDecoration: 'none' }}>
                            <Youtube size={18} color="#ff0000" />
                            <div style={{ flex: 1, fontSize: '0.8rem', fontWeight: 800 }}>Video {i + 1}</div>
                            <ExternalLink size={12} style={{ opacity: 0.4 }} />
                         </a>
                      ))}
                   </div>
                </div>

                 <div style={widgetStyle}>
                   <h4 style={widgetHeaderStyle}><Calendar size={16} /> Termine</h4>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {(selectedBandForProfile.appointments || []).map((app: any, idx: number) => (
                         <div key={idx} style={{ borderLeft: `2px solid ${brandColor}`, paddingLeft: "12px", marginBottom: idx === selectedBandForProfile.appointments.length - 1 ? 0 : "16px" }}>
                            <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "white" }}>{app.title}</div>
                            <div style={{ fontSize: "0.75rem", color: "white", fontWeight: 700 }}>{app.date ? new Date(app.date).toLocaleDateString() : "TBD"}</div>
                         </div>
                      ))}
                   </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BandProfileContent;
