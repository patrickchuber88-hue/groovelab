import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle, Monitor, Lock, ExternalLink, Settings, 
  Music, Zap, Users, Award, PlayCircle, Youtube, Calendar, Camera, X, Search,
  ChevronLeft, ChevronRight, Clock, AlertCircle, RotateCcw, QrCode, Plus, Mic2, MapPin, Mic
} from 'lucide-react';
import { supabase } from '../lib/supabase';

import { normalizeInstrument as normalize } from '../utils/instruments';

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

const renderBandAvatar = (name: string, photoUrl?: string | null, size: string = '64px', borderRadius: string = '18px') => {
  if (photoUrl) {
    return (
      <div style={{ width: size, height: size, borderRadius, overflow: 'hidden', flexShrink: 0 }}>
        <img src={photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={name} />
      </div>
    );
  }
  
  // Hash the name to pick a beautiful premium gradient
  const gradients = [
    'linear-gradient(135deg, #6366f1, #a855f7)', // Indigo to Purple
    'linear-gradient(135deg, #ec4899, #f43f5e)', // Pink to Rose
    'linear-gradient(135deg, #3b82f6, #06b6d4)', // Blue to Cyan
    'linear-gradient(135deg, #10b981, #3b82f6)', // Emerald to Blue
    'linear-gradient(135deg, #f59e0b, #e11d48)'  // Amber to Rose
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
      color: 'white', fontWeight: 950, fontSize: `calc(${size} * 0.35)`,
      textShadow: '0 2px 4px rgba(0,0,0,0.15)',
      flexShrink: 0,
      userSelect: 'none'
    }}>
      {firstLetter}
    </div>
  );
};

const ensureAbsoluteUrl = (url: string): string => {
  if (!url) return '#';
  const trimmed = url.trim();
  if (/^(f|ht)tps?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

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
  const directSong = selectedBandForProfile.songs || selectedBandForProfile.song; // Handle potential naming variations
  let allSongs: any[] = [];
  
  // 1. Collect songs from direct link (founding song)
  if (directSong) {
    const sArr = Array.isArray(directSong) ? directSong : [directSong];
    sArr.forEach(s => {
      if (s && !allSongs.find(as => as.id === s.id)) allSongs.push(s);
    });
  }

  // 2. Collect songs from band_songs (repertoire entries)
  bSongs.forEach((bs: any) => {
    const s = bs.songs ? (Array.isArray(bs.songs) ? bs.songs[0] : bs.songs) : null;
    if (s && !allSongs.find(as => as.id === s.id)) allSongs.push(s);
  });
  
  const isMember = (selectedBandForProfile.band_members || []).some((m: any) => m && m.user_id === user?.id);
  const isCoach = selectedBandForProfile.coach_id === user?.id;
  const isAdmin = user?.role?.toLowerCase() === "admin";
  const canEdit = isAdmin || isCoach || isMember;



  const [songProposals, setSongProposals] = useState<any[]>([]);
  const [shoutboxMessages, setShoutboxMessages] = useState<any[]>([]);
  const [newShoutMessage, setNewShoutMessage] = useState('');
  const [resolvedSchoolName, setResolvedSchoolName] = useState<string>('');

  useEffect(() => {
    // 1. If we have schoolData from user, try using it first
    const schoolData = Array.isArray(user?.schools) ? user?.schools[0] : user?.schools;
    if (schoolData?.name) {
      setResolvedSchoolName(schoolData.name);
      return;
    }
    
    // 2. Otherwise (e.g. shared view), fetch the school from the band's school_id
    if (selectedBandForProfile?.school_id) {
      supabase.from('schools').select('name').eq('id', selectedBandForProfile.school_id).single()
        .then(({ data, error }) => {
          if (!error && data?.name) {
            setResolvedSchoolName(data.name);
          }
        });
    }
  }, [user, selectedBandForProfile?.school_id]);
  const [isLoadingShout, setIsLoadingShout] = useState(false);
  const [shoutboxError, setShoutboxError] = useState<string | null>(null);
  const [isPostingShout, setIsPostingShout] = useState(false);
  const [isJoiningProposal, setIsJoiningProposal] = useState(false);
  const [isDeletingProposal, setIsDeletingProposal] = useState<string | null>(null);
  const [isLoadingPlanner, setIsLoadingPlanner] = useState(false);
  const [planningData, setPlanningData] = useState<any[]>([]);
  const [fixedRehearsals, setFixedRehearsals] = useState<any[]>([]);
  const [plannerError, setPlannerError] = useState<string | null>(null);

  const [bandMembersSkills, setBandMembersSkills] = useState<any[]>([]);

  useEffect(() => {
    const fetchMembersSkills = async () => {
      const uids = (selectedBandForProfile.band_members || [])
        .map((m: any) => m.user_id)
        .filter(Boolean);
      if (uids.length === 0) return;

      const { data } = await supabase
        .from('user_song_skills')
        .select('*')
        .in('user_id', uids);
      if (data) {
        setBandMembersSkills(data);
      }
    };
    fetchMembersSkills();
  }, [selectedBandForProfile.band_members]);

  const songAssignments = useMemo(() => {
    const assignments: Record<string, Record<string, { user_id: string, name: string, photo_url: string, isCore: boolean }[]>> = {};

    allSongs.forEach((song: any) => {
      const songId = song.id;
      assignments[songId] = {};

      const bandSong = bSongs.find((bs: any) => bs.song_id === songId);
      const slots = bandSong?.band_song_slots || [];
      const coreMembers = selectedBandForProfile.band_members || [];

      const membersList: any[] = [];
      const addedUserIds = new Set<string>();
      const addedSlotKeys = new Set<string>();

      // 1. Add participants from slots (guests and suggester)
      slots.filter((sl: any) => sl.user_id).forEach((sl: any) => {
        const normalizedMemberInst = normalize(sl.instrument);
        const slPart = sl.part_number || 1;
        const slotKey = `${sl.user_id}_${normalizedMemberInst}_${slPart}`;
        if (addedSlotKeys.has(slotKey)) return;
        addedSlotKeys.add(slotKey);
        addedUserIds.add(sl.user_id);

        const slUser = sl.users || sl.profiles;
        const u = slUser ? (Array.isArray(slUser) ? slUser[0] : slUser) : null;
        
        if (!assignments[songId][normalizedMemberInst]) {
          assignments[songId][normalizedMemberInst] = [];
        }
        assignments[songId][normalizedMemberInst].push({
          user_id: sl.user_id,
          name: u?.first_name || sl.external_name || 'Gast',
          photo_url: u?.photo_url || '/avatar_ghost.jpg',
          isCore: false
        });

        membersList.push({ user_id: sl.user_id, instrument: normalizedMemberInst, part_number: slPart });
      });

      // 2. Add core band members using the smart vacant slot allocation logic
      const requiredInsts = song.instrumentation || { 'E-Gitarre': 1, 'E-Bass': 1, 'E-Drums': 1, 'E-Piano': 1 };
      let instCount: Record<string, number> = {};
      membersList.forEach((m: any) => {
        instCount[m.instrument] = Math.max(instCount[m.instrument] || 0, m.part_number || 1);
      });

      coreMembers.forEach((bm: any) => {
        if (addedUserIds.has(bm.user_id)) return;

        const normalizedMemberInst = normalize(bm.instrument);
        const skills = bandMembersSkills.filter((sk: any) => sk.user_id === bm.user_id && sk.song_id === songId);

        // Determine which instrument this core member should fill for this song
        let targetInstrument = normalizedMemberInst;

        const isInstSlotFilled = (instName: string) => {
          const normTarget = normalize(instName);
          const matchingKey = Object.keys(requiredInsts).find(k => normalize(k) === normTarget);
          const countRequired = matchingKey ? requiredInsts[matchingKey] : 0;
          const countFilled = membersList.filter((m: any) => normalize(m.instrument) === normTarget).length;
          return countFilled >= countRequired;
        };

        const coreInstRequired = Object.keys(requiredInsts).some(ri => normalize(ri) === normalizedMemberInst);
        const coreInstFilled = isInstSlotFilled(bm.instrument);

        if (coreInstRequired && !coreInstFilled) {
          targetInstrument = normalizedMemberInst;
        } else {
          const alternativeInst = Object.keys(requiredInsts).find(ri => {
            const normRi = normalize(ri);
            if (isInstSlotFilled(ri)) return false;
            return skills.some((sk: any) => 
              normalize(sk.instrument) === normRi && 
              (sk.is_stage_ready || (sk.progress_percent || 0) >= 100)
            );
          });
          if (alternativeInst) {
            targetInstrument = normalize(alternativeInst);
          }
        }

        addedUserIds.add(bm.user_id);
        const bmUser = bm.users || bm.profiles;
        const u = bmUser ? (Array.isArray(bmUser) ? bmUser[0] : bmUser) : null;

        if (!assignments[songId][targetInstrument]) {
          assignments[songId][targetInstrument] = [];
        }
        assignments[songId][targetInstrument].push({
          user_id: bm.user_id,
          name: u?.first_name || 'Mitglied',
          photo_url: u?.photo_url || '/avatar_ghost.jpg',
          isCore: true
        });

        membersList.push({ user_id: bm.user_id, instrument: targetInstrument, part_number: (instCount[targetInstrument] || 0) + 1 });
      });
    });

    return assignments;
  }, [allSongs, bSongs, selectedBandForProfile.band_members, bandMembersSkills]);

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

  // Helper to check if a song is fully mastered by all slot occupiers (100% progress)
  const checkIfFullyMastered = (prop: any) => {
    if (!prop || !prop.songs) return false;
    const song = prop.songs;
    const instrumentation = song.instrumentation || {};
    const slots = prop.band_song_slots || [];

    return Object.entries(instrumentation).every(([inst, count]) => {
      const normReq = normalize(inst);
      if (normReq === 'Vocals') return true;
      const requiredCount = count as number;
      if (requiredCount <= 0) return true;

      // Find slots for this instrument that are occupied by users who have 100% mastery
      const masteredSlots = slots.filter((slot: any) => {
        if (!slot.user_id) return false;
        if (normalize(slot.instrument) !== normReq) return false;

        const slotUser = slot.users || slot.profiles;
        const u = slotUser ? (Array.isArray(slotUser) ? slotUser[0] : slotUser) : null;
        const skills = u?.user_song_skills || [];
        
        return skills.some((sk: any) => 
          String(sk.song_id) === String(prop.song_id) &&
          normalize(sk.instrument) === normReq &&
          ((sk.progress_percent || 0) >= 100 || sk.is_stage_ready === true)
        );
      });

      return masteredSlots.length >= requiredCount;
    });
  };

  // Filtered repertoire: only songs where ALL required instrument slots are occupied and mastered to 100%
  // (which means status is explicitly active in the database) OR founding song
  const repertoireSongs = useMemo(() => {
    return allSongs.filter(song => {
      // 1. Founding song is always in repertoire
      if (song.id && selectedBandForProfile.song_id && String(song.id) === String(selectedBandForProfile.song_id)) return true;

      // 2. Check if it's explicitly active in bSongs
      const bandSong = bSongs.find((bs: any) => bs.song_id === song.id);
      if (bandSong?.status === 'active') return true;

      return false;
    });
  }, [allSongs, selectedBandForProfile.song_id, bSongs]);

  // Filtered proposals: only songs that are NOT the founding song AND are NOT active and fully mastered
  const activeProposals = useMemo(() => {
    return songProposals.filter(prop => {
      // 1. Filter out if it is the founding song
      if (prop.song_id && selectedBandForProfile.song_id && String(prop.song_id) === String(selectedBandForProfile.song_id)) return false;
      // 2. Filter out if it is active and fully mastered
      if (prop.status === 'active' && checkIfFullyMastered(prop)) return false;
      return true;
    });
  }, [songProposals, selectedBandForProfile.song_id, checkIfFullyMastered]);

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
          band_song_slots (*, users(id, first_name, photo_url, user_song_skills:user_song_skills!user_song_skills_user_id_fkey(id, song_id, instrument, progress_percent, is_pending_approval, is_stage_ready)))
        `)
        .eq('band_id', selectedBandForProfile.id)
        .in('status', ['proposal', 'planned', 'active']);

      if (!error && data) {
        setSongProposals(data);
        
        // Auto-promote / demote based on mastery
        data.forEach(prop => {
          const isFounding = prop.song_id && selectedBandForProfile.song_id && String(prop.song_id) === String(selectedBandForProfile.song_id);
          if (isFounding) return; // founding song is always active/repertoire

          const fullyMastered = checkIfFullyMastered(prop);
          
          if (prop.status === 'active' && !fullyMastered) {
            console.log(`[RepertoirePlaner] Auto-demoting "${prop.songs?.title}" to proposal as it is not fully mastered.`);
            supabase.from('band_songs').update({ status: 'proposal' }).eq('id', prop.id).then(() => {
              if (onRefresh) onRefresh();
            });
          } else if (prop.status !== 'active' && fullyMastered) {
            console.log(`[RepertoirePlaner] Auto-promoting "${prop.songs?.title}" to active as all slots are fully mastered.`);
            supabase.from('band_songs').update({ status: 'active' }).eq('id', prop.id).then(() => {
              if (onRefresh) onRefresh();
            });
          }
        });
        
        // BACKSTAGE MASTERMIND: Auto-join for members who have 100% mastery
        if (user && data.length > 0) {
          const myMembership = (selectedBandForProfile.band_members || []).find((m: any) => m && m.user_id === user.id);
          if (!myMembership) return;

          for (const prop of data) {
            const mySlots = prop.band_song_slots || [];
            const alreadyIn = mySlots.some((s: any) => s.user_id === user.id);
            if (alreadyIn) continue;

            const emptySlots = mySlots.filter((s: any) => !s.user_id);
            for (const slot of emptySlots) {
              const { data: mySkills } = await supabase
                .from('user_song_skills')
                .select('*')
                .match({ user_id: user.id, song_id: prop.song_id });
              

              const matchingSkill = (mySkills || []).find(sk => normalize(sk.instrument) === normalize(slot.instrument));
              if (matchingSkill?.is_stage_ready || matchingSkill?.progress_percent >= 100) {
                 console.log(`[BackstageMastermind] Auto-joining to ${slot.instrument}`);
                 await supabase.from('band_song_slots').update({ user_id: user.id, status: 'accepted' }).eq('id', slot.id);
                 fetchSongProposals(); // Refresh to show assignment
                 break;
              }
            }
          }
        }
      }
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

      // 3. Fetch current status with user skills to check if fully mastered
      const { data: currentProp } = await supabase
        .from('band_songs')
        .select(`
          *,
          songs (*),
          band_song_slots (*, users(id, first_name, photo_url, user_song_skills:user_song_skills!user_song_skills_user_id_fkey(id, song_id, instrument, progress_percent, is_pending_approval, is_stage_ready)))
        `)
        .eq('id', proposalId)
        .single();

      if (currentProp) {
        if (checkIfFullyMastered(currentProp)) {
          await supabase.from('band_songs').update({ status: 'active' }).eq('id', proposalId);
          await supabase.from('band_shoutbox').insert({
            band_id: selectedBandForProfile.id,
            user_id: user.id,
            content: `🔥 Juhu! Alle Mitglieder haben ihre Instrumente für "${currentProp.songs?.title}" zu 100% gemeistert. Der Song ist ab sofort in unserem Repertoire! 🎸🚀`
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

  const handleBookSinger = async (songId: string, partNumber: number) => {
    if (!user) return;
    try {
      const bandSong = bSongs.find((bs: any) => bs.song_id === songId);
      if (!bandSong) {
        alert('Dieser Song konnte in der Band nicht gefunden werden.');
        return;
      }

      const { error } = await supabase
        .from('band_song_slots')
        .insert({
          band_song_id: bandSong.id,
          user_id: user.id,
          instrument: 'Vocals',
          part_number: partNumber,
          status: 'accepted'
        });

      if (error) {
        if (error.code === '23505') {
          alert('Du bist für diesen Song bereits eingetragen.');
        } else {
          alert('Fehler beim Einbuchen: ' + error.message);
        }
        return;
      }

      alert('Erfolgreich als Sänger eingetragen!');
      if (onRefresh) {
        onRefresh();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      console.error('[BookSinger] Error:', err);
      alert('Unerwarteter Fehler: ' + err.message);
    }
  };

  const handleLeaveSinger = async (songId: string) => {
    if (!user) return;
    if (!window.confirm('Möchtest du wirklich als Sänger für diesen Song aussteigen?')) {
      return;
    }

    try {
      const bandSong = bSongs.find((bs: any) => bs.song_id === songId);
      if (!bandSong) {
        alert('Dieser Song konnte in der Band nicht gefunden werden.');
        return;
      }

      // Delete the slot from band_song_slots
      const { error } = await supabase
        .from('band_song_slots')
        .delete()
        .eq('band_song_id', bandSong.id)
        .eq('user_id', user.id)
        .eq('instrument', 'Vocals');

      if (error) {
        alert('Fehler beim Austragen: ' + error.message);
        return;
      }

      alert('Erfolgreich ausgetragen!');
      if (onRefresh) {
        onRefresh();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      console.error('[LeaveSinger] Error:', err);
      alert('Unerwarteter Fehler: ' + err.message);
    }
  };



  const bandUserIds = React.useMemo(() => {
    return (selectedBandForProfile.band_members || [])
      .map((m: any) => m.user_id || m.student_id)
      .filter(Boolean);
  }, [selectedBandForProfile.band_members]);

  const uniqueMembersCount = React.useMemo(() => {
    const ids = (selectedBandForProfile.band_members || [])
      .map((m: any) => m.user_id || m.student_id || m.external_name)
      .filter(Boolean);
    return new Set(ids).size;
  }, [selectedBandForProfile.band_members]);

  useEffect(() => {
    if (bandProfileView === 'backstage' && bandUserIds.length > 0) {
      fetchBandPlanning();
    }
  }, [bandProfileView, selectedBandForProfile.id, bandUserIds]);


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

  const recommendedRehearsal = React.useMemo(() => {
    if (!planningData.length || maxMatches === 0) return null;
    
    const dayBlocks: Record<string, string[]> = {};
    planningData.forEach(s => {
      const count = planningData.filter(p => p.day === s.day && p.time === s.time).length;
      if (count === maxMatches) {
        if (!dayBlocks[s.day]) dayBlocks[s.day] = [];
        if (!dayBlocks[s.day].includes(s.time)) dayBlocks[s.day].push(s.time);
      }
    });

    let bestDay = '';
    let bestStart = '';
    let bestEnd = '';
    let longestBlock = 0;

    Object.entries(dayBlocks).forEach(([day, times]) => {
      times.sort();
      
      let currentBlock: string[] = [];
      for (let i = 0; i < times.length; i++) {
        if (currentBlock.length === 0) {
          currentBlock.push(times[i]);
        } else {
          const prev = currentBlock[currentBlock.length - 1];
          const curr = times[i];
          const prevDate = new Date(`2000-01-01T${prev}:00`);
          const currDate = new Date(`2000-01-01T${curr}:00`);
          const diff = (currDate.getTime() - prevDate.getTime()) / 60000;
          
          if (diff === 15) {
            currentBlock.push(curr);
          } else {
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

    if (!bestDay) return null;
    
    const endTimeDate = new Date(`2000-01-01T${bestEnd}:00`);
    endTimeDate.setMinutes(endTimeDate.getMinutes() + 15);
    const formattedEnd = endTimeDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

    return { day: bestDay, start: bestStart, end: formattedEnd, count: maxMatches };
  }, [planningData, maxMatches]);

  const handleRemoveMember = async (targetUserId: string, targetName: string, instrumentsToRemove: string[]) => {
    if (!user) return;
    const isSelf = targetUserId === user.id;
    const canRemoveOther = user.role === 'admin' || user.role === 'teacher' || selectedBandForProfile.coach_id === user.id;
    if (!isSelf && !canRemoveOther) return;
    
    const isVocalOnly = instrumentsToRemove.every(i => (i || '').toLowerCase().includes('vocal') || (i || '').toLowerCase().includes('gesang'));
    const roleText = isVocalOnly ? 'als Sänger/in' : 'als Instrumentalist/in';
    const confirmMsg = isSelf 
      ? `Möchtest du deinen Platz ${roleText} in dieser Band wirklich freigeben?` 
      : `Möchtest du ${targetName} (${instrumentsToRemove.join(', ')}) wirklich aus der Band entfernen?`;
      
    if (!window.confirm(confirmMsg)) return;

    try {
      if (instrumentsToRemove.length > 0) {
        const { data: currentMembers } = await supabase.from('band_members')
          .select('id, instrument')
          .eq('band_id', selectedBandForProfile.id)
          .eq('user_id', targetUserId);
          
        if (currentMembers) {
           const idsToDelete = currentMembers
             .filter((m: any) => {
                const isVoc = (m.instrument || '').toLowerCase().includes('vocal') || (m.instrument || '').toLowerCase().includes('gesang');
                const removingVoc = instrumentsToRemove.some(i => (i || '').toLowerCase().includes('vocal') || (i || '').toLowerCase().includes('gesang'));
                if (removingVoc && isVoc) return true;
                return instrumentsToRemove.includes(m.instrument);
             })
             .map((m: any) => m.id);
             
           if (idsToDelete.length > 0) {
              await supabase.from('band_members').delete().in('id', idsToDelete);
           }
        }

        const { data: bandSongs } = await supabase.from('band_songs').select('id').eq('band_id', selectedBandForProfile.id);
        if (bandSongs && bandSongs.length > 0) {
          const songIds = bandSongs.map((s: any) => s.id);
          
          const { data: currentSlots } = await supabase.from('band_song_slots')
            .select('id, instrument')
            .in('band_song_id', songIds)
            .eq('user_id', targetUserId);
            
          if (currentSlots) {
             const slotIdsToDelete = currentSlots
               .filter((s: any) => {
                  const isVoc = (s.instrument || '').toLowerCase().includes('vocal') || (s.instrument || '').toLowerCase().includes('gesang');
                  const removingVoc = instrumentsToRemove.some(i => (i || '').toLowerCase().includes('vocal') || (i || '').toLowerCase().includes('gesang'));
                  if (removingVoc && isVoc) return true;
                  return instrumentsToRemove.includes(s.instrument);
               })
               .map((s: any) => s.id);
               
             if (slotIdsToDelete.length > 0) {
                await supabase.from('band_song_slots').delete().in('id', slotIdsToDelete);
             }
          }
        }
      }

      if (onRefresh) {
        onRefresh();
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error('Error removing member:', err);
      alert('Fehler beim Entfernen des Mitglieds.');
    }
  };

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
    background: 'rgba(30, 30, 30, 0.85)',
    borderRadius: '40px',
    padding: '32px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), 0 25px 50px rgba(0,0,0,0.4)',
    position: 'relative',
    overflow: 'hidden'
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
    background: 'rgba(35, 35, 35, 0.95)',
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
      <style>
        {`
          @keyframes pulse-subtle {
            0% { opacity: 0.8; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.02); }
            100% { opacity: 0.8; transform: scale(1); }
          }
        `}
      </style>
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ minHeight: "620px", position: "relative", display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: "60px", paddingTop: "100px", overflow: "hidden" }}>
             {/* Header Background & Effects (Backdrop) */}
             <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
               {/* Enhanced Atmosphere - Floating Glows */}
               <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '60vw', height: '60vw', background: `radial-gradient(circle, ${brandColor}15 0%, transparent 70%)`, filter: 'blur(120px)', opacity: 0.8 }}></div>
               <div style={{ position: 'absolute', bottom: '10%', right: '-10%', width: '50vw', height: '50vw', background: `radial-gradient(circle, ${brandColor}10 0%, transparent 70%)`, filter: 'blur(100px)', opacity: 0.6 }}></div>
               
               <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 20% 20%, ${brandColor}15 0%, transparent 70%), radial-gradient(circle at 80% 80%, ${brandColor}11 0%, transparent 70%), radial-gradient(circle at 50% 50%, ${brandColor}08 0%, transparent 80%)`, filter: 'blur(80px)', opacity: 0.9 }}></div>
               
               <img src={selectedBandForProfile.photo_url || "/studio_dark.jpg"} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 35%' }} />
               {/* Cinematic Vignette - Slightly lighter for overall brightness */}
               <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,10,10,0.2) 0%, rgba(10,10,10,0.7) 60%, #0a0a0a 100%)', zIndex: 1 }}></div>
               {/* Brand Glow behind Title */}
               <div style={{ position: 'absolute', top: '50%', left: '30%', width: '600px', height: '400px', background: `radial-gradient(circle, ${brandColor}22 0%, transparent 70%)`, filter: 'blur(60px)', zIndex: 1, pointerEvents: 'none', transform: 'translate(-50%, -50%)' }}></div>
             </div>
             
             {user && !isSharedView && (
                <button onClick={() => setShowBandProfile(false)} style={{ position: 'absolute', top: 30, right: 30, background: 'rgba(30,30,30,0.85)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, touchAction: 'manipulation' }}>
                   <X size={20} />
                </button>
             )}

             <div style={{ maxWidth: '1600px', margin: '0 auto', width: '100%', padding: '0 40px', position: 'relative', zIndex: 2 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '40px' }}>
                     <div style={{ position: 'relative', width: '220px', height: '220px', borderRadius: '40px', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.6)', border: '4px solid rgba(255,255,255,0.2)' }}>
                       {renderBandAvatar(selectedBandForProfile.name, selectedBandForProfile.photo_url, '100%', '100%')}

                       {/* BAND Badge Integrated into Photo - Bottom Left */}
                       <div style={{ position: 'absolute', bottom: '20px', left: '20px', background: 'rgba(35, 35, 35, 0.9)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 950, textTransform: 'uppercase', boxShadow: '0 10px 20px rgba(0,0,0,0.3)', zIndex: 11, border: '1px solid rgba(255,255,255,0.1)' }}>BAND</div>

                       {canEdit && (
                          <button 
                            onClick={() => { setAvatarPickerType('band'); setShowAvatarPicker(true); }}
                            style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(30,30,30,0.85)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, touchAction: 'manipulation' }}
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
                             <CheckCircle size={14} fill="black" color={brandColor} /> VERIFIZIERTES GROOVELAB PROJEKT DER {resolvedSchoolName ? resolvedSchoolName.toUpperCase() : 'MUSÄK BAD SÄCKINGEN'}
                          </div>

                          {/* Genre Label - Only show if present */}
                          {selectedBandForProfile.genre && (
                            <div style={{ background: 'rgba(30,30,30,0.85)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 950, textTransform: 'uppercase', border: '1px solid rgba(255,255,255,0.1)' }}>{selectedBandForProfile.genre}</div>
                          )}
                       </div>
                       
                       <h1 style={{ 
                         fontSize: width < 768 ? '3.5rem' : '6rem', 
                         fontWeight: 1000, 
                         margin: '0 0 24px', 
                         letterSpacing: '-0.04em', 
                         lineHeight: 0.85, 
                         color: "white",
                         textShadow: `0 10px 40px ${brandColor}44, 0 0 100px rgba(0,0,0,0.5)`
                       }}>{selectedBandForProfile.name}</h1>

                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                         <span style={{ fontSize: '0.85rem', color: 'white', fontWeight: 800 }}>{uniqueMembersCount} Mitglieder</span>
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
                               <div style={{ display: 'flex', background: 'rgba(35, 35, 35, 0.95)', padding: '4px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)', touchAction: 'manipulation' }}>
                                 <button onClick={() => setBandProfileView('public')} style={{ background: bandProfileView === 'public' ? 'rgba(255,255,255,0.1)' : 'transparent', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 950, cursor: 'pointer', transition: 'all 0.2s', touchAction: 'manipulation' }}>PUBLIC</button>
                                 <button onClick={() => setBandProfileView('backstage')} style={{ background: bandProfileView === 'backstage' ? brandColor : 'transparent', color: bandProfileView === 'backstage' ? 'black' : 'white', border: 'none', padding: '6px 14px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 950, cursor: 'pointer', transition: 'all 0.2s', touchAction: 'manipulation' }}>BACKSTAGE</button>
                               </div>
                             )}
                         </div>
                      </div>
                   </div>
                </div>
             </div>
        </div>
        <div style={{ maxWidth: "1600px", margin: "40px auto 0", width: "100%", padding: "0 40px 80px" }}>
          {bandProfileView === "backstage" && !isSharedView ? (            <div style={{ display: 'grid', gridTemplateColumns: width < 1200 ? '1fr' : 'minmax(0, 1fr) 400px', gap: '40px', alignItems: 'start' }}>
              
              {/* LEFT: Band Repertoire-Planer (Compacted) */}
              <section style={{ ...widgetStyle, padding: '24px', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ ...widgetHeaderStyle, margin: 0, fontSize: '0.9rem' }}><Zap size={18} color={brandColor} fill="currentColor" /> Band Repertoire-Planer</h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button 
                      onClick={() => window.location.reload()}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      className="hover-scale"
                    >
                      <RotateCcw size={12} />
                    </button>
                    <span style={{ fontSize: '0.6rem', fontWeight: 950, background: 'rgba(234, 179, 8, 0.2)', padding: '4px 8px', borderRadius: '6px', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.3)' }}>BETA</span>
                  </div>
                </div>
                
                {activeProposals.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🎵</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'white' }}>Noch keine Song-Vorschläge</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {activeProposals.map(prop => (
                      <div key={prop.id} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '24px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                              <Music size={20} color={brandColor} />
                            </div>
                            <div>
                              <div style={{ fontSize: '1.2rem', fontWeight: 950, color: 'white', lineHeight: 1.1 }}>{prop.songs?.title}</div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginTop: '2px' }}>{prop.songs?.artist}</div>
                            </div>
                          </div>
                          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textAlign: 'right' }}>
                             Vorgeschlagen von:<br/>
                             <span style={{ color: brandColor, fontWeight: 950 }}>{(Array.isArray(prop.suggested_by_user) ? prop.suggested_by_user[0] : prop.suggested_by_user)?.first_name}</span>
                          </div>
                        </div>
                        
                        <div style={{ 
                          display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', background: '#0f172a', padding: '20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)'
                        }}>
                          {(() => {
                            const instrumentation = prop.songs?.instrumentation || {};
                            const slots: any[] = [];
                            const order = ['E-Gitarre', 'E-Drums', 'E-Piano', 'E-Bass'];
                            const allInsts = [...order, ...Object.keys(instrumentation).filter(k => !order.includes(normalize(k)))];

                            // 1. Regular Instruments
                            allInsts.forEach(instName => {
                              const normTarget = normalize(instName);
                              if (normTarget === 'Vocals') return;
                              const count = instrumentation[instName] || 0;
                              for (let i = 1; i <= (count as number); i++) {
                                const occupant = prop.band_song_slots?.find((s: any) => normalize(s.instrument) === normTarget && s.part_number === i);
                                slots.push({ inst: instName, part: i, occupant });
                              }
                            });

                            return slots.map((slot, idx) => {
                              const normTarget = normalize(slot.inst);
                              const membersWithInst = (selectedBandForProfile.band_members || []).filter((m: any) => normalize(m.instrument) === normTarget);
                              const member = membersWithInst[slot.part - 1];
                              const memberUser = member?.users || member?.profiles;
                              const uFromBand = memberUser ? (Array.isArray(memberUser) ? memberUser[0] : memberUser) : null;
                              
                              const occupantUser = slot.occupant?.users || slot.occupant?.profiles;
                              const uFromSlot = occupantUser ? (Array.isArray(occupantUser) ? occupantUser[0] : occupantUser) : null;
                              
                              const offeredUser = slot.offeredTo?.users || slot.offeredTo?.profiles;
                              const uFromOffer = offeredUser ? (Array.isArray(offeredUser) ? offeredUser[0] : offeredUser) : null;
                              
                              const u = uFromSlot || uFromOffer || uFromBand;
                              const isMe = u?.id === user?.id;
                              const isPendingOffer = !!slot.offeredTo;
                              
                              const skills = u?.user_song_skills || [];
                              const isMastered = skills.some((sk: any) => 
                                sk.song_id === prop.song_id && 
                                normalize(sk.instrument) === normTarget && 
                                (sk.part_number || 1) === slot.part &&
                                (sk.progress_percent >= 100 || sk.is_stage_ready)
                              );
                              
                              return (
                                <div key={idx} style={{ width: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', position: 'relative' }}>
                                  <div style={{ 
                                    width: '48px', height: '48px', borderRadius: '50%',
                                    background: u ? 'white' : 'rgba(255,255,255,0.03)', 
                                    border: isPendingOffer 
                                      ? (isMe ? '2px dashed #eab308' : '1.5px dashed rgba(234, 179, 8, 0.4)')
                                      : ((isMe || isMastered) ? `2px solid #ef4444` : (u ? 'none' : '1.5px dashed rgba(255,255,255,0.1)')),
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                                    filter: (u && !isMastered && !isPendingOffer) ? 'grayscale(100%)' : 'none', 
                                    opacity: (u && !isMastered && !isPendingOffer) ? 0.6 : 1,
                                    position: 'relative'
                                  }}>
                                    {u ? (
                                      <div style={{ position: 'relative', width: '100%', height: '100%', filter: isPendingOffer ? 'opacity(0.7) grayscale(30%)' : 'none' }}>
                                        <img 
                                          src={u?.photo_url || '/avatar_ghost.jpg'} 
                                          style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if ((window as any).openUserProfile) {
                                              (window as any).openUserProfile(u);
                                            }
                                          }}
                                          className="hover-scale-mini"
                                        />
                                        {isMastered && !isPendingOffer && (
                                          <div style={{ position: 'absolute', bottom: '1px', right: '1px', background: '#22c55e', color: 'white', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid white', zIndex: 10 }}>
                                            <CheckCircle size={8} strokeWidth={4} />
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div style={{ fontSize: '1rem', opacity: 0.2 }}>
                                        {slot.isVocal ? <Mic size={16} /> : (APP_INSTRUMENT_ICONS[slot.inst] || <Plus size={16} />)}
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', width: '100%' }}>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 950, color: isPendingOffer ? '#eab308' : 'white', opacity: (u || isPendingOffer) ? 1 : 0.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                                      {u ? u.first_name : slot.inst}
                                    </div>
                                    <div style={{ fontSize: '0.45rem', fontWeight: 800, color: isPendingOffer ? 'rgba(234, 179, 8, 0.7)' : 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
                                      {isPendingOffer ? 'Angeboten' : slot.inst}
                                    </div>
                                  </div>
                                  
                                  {isPendingOffer && isMe && (
                                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                      <button 
                                        onClick={async () => {
                                          const { error } = await supabase.from('band_song_slots').insert({
                                            band_song_id: prop.id,
                                            user_id: user.id,
                                            instrument: 'Vocals',
                                            part_number: slot.part,
                                            status: 'accepted'
                                          });
                                          if (error) alert('Fehler: ' + error.message);
                                          else fetchSongProposals();
                                        }}
                                        style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '0.5rem', fontWeight: 900, cursor: 'pointer' }}
                                      >
                                        JA 🎤
                                      </button>
                                      <button 
                                        onClick={async () => {
                                          const { error } = await supabase.from('band_song_slots').insert({
                                            band_song_id: prop.id,
                                            user_id: user.id,
                                            instrument: 'Vocals',
                                            part_number: slot.part,
                                            status: 'declined'
                                          });
                                          if (error) alert('Fehler: ' + error.message);
                                          else fetchSongProposals();
                                        }}
                                        style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '0.5rem', fontWeight: 900, cursor: 'pointer' }}
                                      >
                                        NEIN
                                      </button>
                                    </div>
                                  )}
                                  
                                  {slot.isVocal && slot.isOpen && !u && (
                                    <button 
                                      onClick={() => joinSongProposal(prop.id, 'Vocals', slot.part)}
                                      style={{ background: brandColor, color: 'white', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '0.5rem', fontWeight: 900, cursor: 'pointer', marginTop: '4px' }}
                                    >
                                      SINGEN 🎤
                                    </button>
                                  )}
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

              {/* RIGHT: Sidebar with Shoutbox and Wochenplaner */}
              <aside style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {/* Shoutbox */}
                <div style={{ ...widgetStyle, display: 'flex', flexDirection: 'column', height: '400px', padding: '24px' }}>
                  <h4 style={{ ...widgetHeaderStyle, fontSize: '0.8rem' }}><Zap size={16} /> Shoutbox <span style={{ opacity: 0.5, fontWeight: 700, fontSize: '0.65rem', marginLeft: '4px' }}>(Mitglieder)</span></h4>
                  {shoutboxError && (
                    <div style={{ color: '#ef4444', fontSize: '0.65rem', marginBottom: '8px', padding: '6px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>
                      {shoutboxError}
                    </div>
                  )}
                  <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", paddingRight: '4px' }} className="custom-scrollbar">
                    {shoutboxMessages.filter((msg: any) => {
                      const msgDate = new Date(msg.created_at);
                      const now = new Date();
                      return (now.getTime() - msgDate.getTime()) < (24 * 60 * 60 * 1000);
                    }).map((msg: any) => (
                      <div key={msg.id} style={{ display: "flex", gap: "10px", background: "#1a1a1a", padding: "12px", borderRadius: "14px", border: '1px solid rgba(255,255,255,0.06)' }}>
                        <img 
                          src={msg.author?.photo_url || "/avatar_ghost.jpg"} 
                          style={{ width: "28px", height: "28px", borderRadius: "8px", objectFit: 'cover', cursor: 'pointer' }} 
                          onClick={(e) => {
                            e.stopPropagation();
                            if ((window as any).openUserProfile) {
                              (window as any).openUserProfile(msg.author);
                            }
                          }}
                          className="hover-scale-mini"
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "0.7rem", fontWeight: 950, color: "white", marginBottom: '2px' }}>{msg.author?.first_name}</div>
                          <div style={{ fontSize: "0.8rem", color: "white", lineHeight: 1.3, opacity: 0.9 }}>{msg.content}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "12px" }}>
                    <div style={{ position: "relative", display: 'flex', gap: '8px' }}>
                      <textarea 
                        value={newShoutMessage} 
                        onChange={(e) => setNewShoutMessage(e.target.value)} 
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postShoutMessage(); } }} 
                        placeholder="Nachricht..." 
                        style={{ flex: 1, background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", color: "white", padding: "10px", borderRadius: "12px", resize: "none", outline: "none", fontSize: '0.8rem', minHeight: '40px' }} 
                      />
                      <button 
                        onClick={postShoutMessage}
                        disabled={isPostingShout || !newShoutMessage.trim()}
                        style={{ background: brandColor, color: 'black', border: 'none', borderRadius: '12px', padding: '0 14px', cursor: (isPostingShout || !newShoutMessage.trim()) ? 'default' : 'pointer', opacity: (isPostingShout || !newShoutMessage.trim()) ? 0.5 : 1 }}
                      >
                        <Zap size={16} fill="currentColor" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Wochenplaner */}
                <section style={{ ...widgetStyle, height: '440px', padding: '24px' }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: '12px' }}>
                    <h3 style={{ ...widgetHeaderStyle, margin: 0, fontSize: '0.8rem' }}><Calendar size={18} color={brandColor} /> Wochenplan</h3>
                    <button onClick={fetchBandPlanning} style={{ background: "none", border: "none", color: "white", cursor: "pointer", opacity: 0.2 }}><RotateCcw size={12} /></button>
                  </div>
                  
                  {recommendedRehearsal && (
                    <div style={{ background: `${brandColor}10`, border: `1px solid ${brandColor}20`, color: brandColor, padding: '4px 10px', borderRadius: '8px', fontSize: '0.6rem', fontWeight: 950, display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '12px' }}>
                      <Clock size={10} /> {recommendedRehearsal.day.slice(0, 2)} {recommendedRehearsal.start}-{recommendedRehearsal.end}
                    </div>
                  )}
               
                  <div style={{ overflowY: 'auto' }} className="custom-scrollbar">
                    {[0].map(weekOffset => {
                      const weekDays = getWeekDays(weekOffset);
                      return (
                        <div key={weekOffset}>
                          <div style={{ display: "grid", gridTemplateColumns: `40px repeat(${weekDays.length}, 1fr)`, gap: "4px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <div style={{ height: "12px" }}></div>
                              {timeSlots.map(time => (
                                <div key={time} style={{ height: "18px", display: "flex", alignItems: "center", justifyContent: "flex-end", fontSize: "0.45rem", color: "rgba(255,255,255,0.3)", fontWeight: 800, paddingRight: "4px" }}>
                                  {time}
                                </div>
                              ))}
                            </div>
                            {weekDays.map(day => (
                              <div key={day.id} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <div style={{ textAlign: "center", fontSize: "0.5rem", fontWeight: 950, color: "white", height: "12px" }}>{day.label}</div>
                                {timeSlots.map(time => {
                                  const h = openingHours[day.dayName];
                                  const isOpen = h && h.active && time >= h.start && time <= h.end;
                                  const isFixed = fixedRehearsals.some(r => r.day === day.id && r.time === time);
                                  const count = planningData.filter(s => s.day === day.id && s.time === time).length;
                                  const isTopMatch = count === maxMatches && count > 0;
                                  let bg = "rgba(255,255,255,0.03)";
                                  let color = "rgba(255,255,255,0.2)";
                                  if (!isOpen) { bg = "transparent"; color = "transparent"; }
                                  else if (isFixed) { bg = "#22c55e"; color = "black"; }
                                  else if (isTopMatch) { bg = brandColor; color = "black"; }
                                  else if (count > 0) { bg = "rgba(255,255,255,0.1)"; color = "white"; }
                                  return (
                                    <div key={time} onClick={() => isOpen && toggleFixedRehearsal(day.id, time)} style={{ height: "18px", background: bg, borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", color: color, fontSize: "0.45rem", fontWeight: 950, cursor: (canEdit && isOpen) ? "pointer" : "default", opacity: isOpen ? 1 : 0.2 }}>
                                      {isOpen && (isFixed ? <Zap size={8} fill="currentColor" /> : count > 0 ? count : null)}
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
              </aside>
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
                        repertoireSongs.map((song: any, idx: number) => {
                               const bandSong = bSongs.find((bs: any) => bs.song_id === song.id);
                               const filledSlots = bandSong?.band_song_slots || [];

                               // Only vocalists/singers
                               const songVocalists = filledSlots.filter((s: any) =>
                                 s.user_id &&
                                 ((s.instrument || '').toLowerCase().includes('vocal') ||
                                  (s.instrument || '').toLowerCase().includes('gesang')) &&
                                 s.status !== 'declined'
                               );

                               const allVocalists = songVocalists;

                               // Map vocalists to correct slot indices (0 -> part_number 1, 1 -> part_number 2)
                               const vocalistSlots = [null, null];
                               songVocalists.forEach((v: any) => {
                                 if (v.part_number === 1) {
                                   vocalistSlots[0] = v;
                                 } else if (v.part_number === 2) {
                                   vocalistSlots[1] = v;
                                 } else {
                                   if (!vocalistSlots[0]) vocalistSlots[0] = v;
                                   else if (!vocalistSlots[1]) vocalistSlots[1] = v;
                                 }
                               });

                               return (
                                 <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 16px', borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)', transition: 'all 0.2s' }}>
                                   {/* Song Info */}
                                   <div style={{ flex: 1 }}>
                                     <div style={{ fontWeight: 950, color: 'white', fontSize: '1.05rem', marginBottom: '2px' }}>{song.title}</div>
                                     <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{song.artist}</div>
                                   </div>

                                   {/* Singers (on the right) */}
                                   {/* Singers (on the right) */}
                                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                     <div style={{ fontSize: '0.65rem', fontWeight: 950, color: 'rgba(255, 255, 255, 0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🎤</div>
                                     {vocalistSlots.map((vm: any, vIdx: number) => {
                                       if (vm) {
                                         const vmUser = vm.users || vm.profiles;
                                         const vu = vmUser ? (Array.isArray(vmUser) ? vmUser[0] : vmUser) : null;
                                         const name = vu?.first_name || vm.first_name || vm.external_name || 'Sänger';
                                         const photo = vu?.photo_url || vm.photo_url || '/avatar_ghost.jpg';
                                         const isMe = user && String(vm.user_id) === String(user.id);
                                         return (
                                           <div key={`voc-${vIdx}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                             <img src={photo} style={{ width: '38px', height: '38px', borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.12)', objectFit: 'cover' }} />
                                             <div style={{ display: 'flex', flexDirection: 'column' }}>
                                               <span style={{ fontSize: '0.78rem', fontWeight: 850, color: 'white' }}>{name}</span>
                                               {isMe && !isSharedView && (
                                                 <button 
                                                   onClick={(e) => {
                                                     e.stopPropagation();
                                                     handleLeaveSinger(song.id);
                                                   }}
                                                   style={{ 
                                                     background: 'none', 
                                                     border: 'none', 
                                                     color: '#ef4444', 
                                                     fontSize: '0.65rem', 
                                                     fontWeight: 900, 
                                                     cursor: 'pointer', 
                                                     padding: 0, 
                                                     textAlign: 'left',
                                                     display: 'flex',
                                                     alignItems: 'center',
                                                     gap: '2px',
                                                     opacity: 0.8,
                                                     transition: 'opacity 0.2s'
                                                   }}
                                                   
                                                   
                                                 >
                                                   Aussteigen ❌
                                                 </button>
                                               )}
                                             </div>
                                           </div>
                                         );
                                       } else {
                                         const isAlreadySignedUp = user && allVocalists.some((v: any) => String(v.user_id) === String(user.id));
                                         const canSignUp = isMember && !isSharedView && !isAlreadySignedUp;
                                         
                                         if (canSignUp) {
                                           return (
                                             <button
                                               key={`voc-empty-${vIdx}`}
                                               onClick={(e) => {
                                                 e.stopPropagation();
                                                 handleBookSinger(song.id, vIdx + 1);
                                               }}
                                               className="hover-scale"
                                               style={{
                                                 display: 'flex',
                                                 alignItems: 'center',
                                                 gap: '8px',
                                                 background: 'rgba(255, 255, 255, 0.02)',
                                                 border: `1.5px dashed ${brandColor}66`,
                                                 borderRadius: '24px',
                                                 padding: '4px 10px 4px 6px',
                                                 cursor: 'pointer',
                                                 transition: 'all 0.2s'
                                               }}
                                               
                                               
                                             >
                                               <div style={{
                                                 width: '24px',
                                                 height: '24px',
                                                 borderRadius: '50%',
                                                 background: `${brandColor}22`,
                                                 color: brandColor,
                                                 display: 'flex',
                                                 alignItems: 'center',
                                                 justifyContent: 'center',
                                                 fontWeight: 950,
                                                 fontSize: '0.85rem'
                                               }}>
                                                 +
                                               </div>
                                               <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'white' }}>Eintragen</span>
                                             </button>
                                           );
                                         } else {
                                           return (
                                             <div
                                               key={`voc-empty-${vIdx}`}
                                               style={{
                                                 display: 'flex',
                                                 alignItems: 'center',
                                                 gap: '6px',
                                                 opacity: 0.6
                                               }}
                                             >
                                               <div style={{
                                                 width: '38px',
                                                 height: '38px',
                                                 borderRadius: '50%',
                                                 border: '1.5px dashed rgba(255, 255, 255, 0.2)',
                                                 display: 'flex',
                                                 alignItems: 'center',
                                                 justifyContent: 'center',
                                                 color: 'rgba(255, 255, 255, 0.3)',
                                                 fontSize: '0.9rem',
                                                 fontWeight: 900
                                               }}>
                                                 ?
                                               </div>
                                               <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255, 255, 255, 0.4)' }}>Frei</span>
                                             </div>
                                           );
                                         }
                                       }
                                     })}
                                   </div>
                                 </div>
                               );
                             })
                      )}
                   </div>
                </section>
              </div>

              <aside style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                <div style={widgetStyle}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h4 style={{ ...widgetHeaderStyle, marginBottom: 0 }}><Users size={16} /> Besetzung</h4>
                      {(selectedBandForProfile.coach || selectedBandForProfile.coach_id) && (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 950, color: '#eab308', background: 'rgba(234,179,8,0.1)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(234,179,8,0.2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <Award size={10} fill="currentColor" /> Bandcoach: {selectedBandForProfile.coach?.first_name || 'Zugewiesen'}
                         </div>
                      )}
                   </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {(() => {
                           const members = selectedBandForProfile.band_members || [];
                           const grouped: Record<string, any> = {};
                           
                           members.forEach((m: any) => {
                             const mUser = m.users || m.profiles;
                             const u = mUser ? (Array.isArray(mUser) ? mUser[0] : mUser) : null;
                             const uid = u?.id || m.external_name || m.user_id;
                             if (!uid) return;
                             if (!grouped[uid]) {
                               grouped[uid] = { ...m, user: u, instruments: [m.instrument] };
                             } else {
                               if (!grouped[uid].instruments.includes(m.instrument)) {
                                 grouped[uid].instruments.push(m.instrument);
                               }
                             }
                           });

                           // Include all members (do not filter out those who only sing)
                           const visibleMembers = Object.values(grouped);

                           return visibleMembers.map((m: any, idx: number) => {
                             const u = m.user;
                             
                             const isVocalOnly = m.instruments.every((inst: string) => (inst || '').toLowerCase().includes('vocal') || (inst || '').toLowerCase().includes('gesang'));

                             let displayInst = "";
                             let displayIcon = "🎤";

                             if (isVocalOnly) {
                               displayInst = "Gesang";
                               displayIcon = "🎤";
                             } else {
                               const otherInsts = m.instruments.filter((inst: string) => !((inst || '').toLowerCase().includes('vocal') || (inst || '').toLowerCase().includes('gesang')));
                               displayInst = otherInsts.join(' & ');
                               displayIcon = APP_INSTRUMENT_ICONS[otherInsts[0]] || "🎸";
                             }

                             const uid = u?.id || m.user_id;
                             const canRemove = user && (user.id === uid || user.role === 'admin' || user.role === 'teacher' || selectedBandForProfile.coach_id === user.id);

                             return (
                               <div 
                                  key={idx} 
                                  style={{ 
                                    display: "flex", 
                                    alignItems: "center", 
                                    gap: "16px", 
                                    padding: "12px", 
                                    background: "rgba(255,255,255,0.03)", 
                                    borderRadius: "18px", 
                                     border: "1px solid rgba(255,255,255,0.02)",
                                    transition: 'transform 0.4s cubic-bezier(0.2, 1, 0.3, 1)',
                                    willChange: 'transform',
                                    position: 'relative'
                                  }}
                                >
                                   <img 
                                     src={u?.photo_url || "/avatar_ghost.jpg"} 
                                     style={{ 
                                       width: "48px", 
                                       height: "48px", 
                                       borderRadius: "14px", 
                                       border: "2px solid rgba(255,255,255,0.05)",
                                       objectFit: 'cover',
                                       cursor: u ? 'pointer' : 'default'
                                     }} 
                                     onClick={u ? (e) => {
                                       e.stopPropagation();
                                       if ((window as any).openUserProfile) {
                                         (window as any).openUserProfile(u);
                                       }
                                     } : undefined}
                                     className={u ? "hover-scale-mini" : ""}
                                   />
                                   <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: "0.9rem", fontWeight: 950, color: "white", marginBottom: "2px" }}>{u?.first_name || m.external_name}</div>
                                      <div style={{ fontSize: "0.65rem", fontWeight: 950, color: brandColor, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                        {displayIcon} {displayInst}
                                      </div>
                                   </div>
                                   {canRemove && !isSharedView && (
                                     <button
                                       onClick={() => handleRemoveMember(uid, u?.first_name || m.external_name || 'Mitglied', m.instruments)}
                                       style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', marginLeft: 'auto' }}
                                       className="hover-scale"
                                       title={user.id === uid ? "Platz freigeben" : "Aus Band entfernen"}
                                     >
                                       <X size={14} />
                                     </button>
                                   )}
                                </div>
                             );
                           });
                        })()}
                    </div>
                  </div>
                  <div style={widgetStyle}>
                    <h4 style={widgetHeaderStyle}><Music size={16} color={brandColor} /> Musik</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                       {(selectedBandForProfile.soundcloud_links || []).map((track: any, i: number) => {
                         const trackData = typeof track === 'string' ? { title: 'Track ' + (i + 1), url: track } : track;
                         return (
                           <a key={i} href={ensureAbsoluteUrl(trackData.url)} onClick={e => e.stopPropagation()} target="_blank" rel="noopener noreferrer" style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', color: 'white', textDecoration: 'none' }}>
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
                       {(selectedBandForProfile.youtube_links || []).map((video: any, i: number) => {
                         const videoData = typeof video === 'string' ? { title: 'Video ' + (i + 1), url: video } : video;
                         return (
                           <a key={i} href={ensureAbsoluteUrl(videoData.url)} onClick={e => e.stopPropagation()} target="_blank" rel="noopener noreferrer" style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', color: 'white', textDecoration: 'none' }}>
                              <Youtube size={18} color="#ff0000" />
                              <div style={{ flex: 1, fontSize: '0.8rem', fontWeight: 800 }}>{videoData.title || 'Video ' + (i + 1)}</div>
                              <ExternalLink size={12} style={{ opacity: 0.4 }} />
                           </a>
                         );
                      })}
                      {(selectedBandForProfile.youtube_links || []).length === 0 && (
                        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', margin: 0 }}>Keine Videos vorhanden.</p>
                      )}
                    </div>
                 </div>

                 <div style={widgetStyle}>
                   <h4 style={widgetHeaderStyle}><Calendar size={16} /> Termine</h4>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {(selectedBandForProfile.appointments || []).map((app: any, idx: number) => (
                         <div key={idx} style={{ borderLeft: `2px solid ${brandColor}`, paddingLeft: "12px", marginBottom: idx === selectedBandForProfile.appointments.length - 1 ? 0 : "16px" }}>
                            <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "white" }}>{app.title}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                               <span style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.7)", fontWeight: 700 }}>
                                  {app.date ? new Date(app.date).toLocaleDateString('de-DE') : "TBD"}
                               </span>
                               {app.location && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.5)", fontWeight: 600 }}>
                                     <span style={{ color: brandColor }}>•</span>
                                     <MapPin size={10} style={{ color: brandColor }} />
                                     {app.location}
                                  </span>
                               )}
                            </div>
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
