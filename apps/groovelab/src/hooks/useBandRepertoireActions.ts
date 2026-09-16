import React, { useCallback, useRef } from 'react';
import { normalizeInstrument } from '../utils/instruments';

export interface UseBandRepertoireActionsParams {
  user: any;
  loggedInUserId: string | null;
  supabase: any;
  globalSongs: any[];
  userSongs: any[];
  setUserSongs: React.Dispatch<React.SetStateAction<any[]>>;
  pendingFounding: any;
  setPendingFounding: React.Dispatch<React.SetStateAction<any>>;
  foundingName: string;
  setFoundingName: (val: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  selectedCoachId: string;
  setSelectedCoachId: (id: string) => void;
  selectedBandForGateway: any;
  setSelectedBandForGateway: React.Dispatch<React.SetStateAction<any>>;
  fetchDashboardData: (userId: string, isInitial?: boolean) => Promise<void> | void;
  setActiveStudentTab: (tab: string) => void;
  setShowFoundingModal: (show: boolean) => void;
  setSuggestingSkill: (skill: any) => void;
  ignoredFoundingIds?: React.MutableRefObject<string[]>;
  lastWriteTimeRef: React.MutableRefObject<number>;
  exclusiveProposal?: boolean;
  dismissSuggestion?: (skillId: string) => void;
  showConfetti?: any;
  setShowConfetti?: React.Dispatch<React.SetStateAction<any>>;
}

export function useBandRepertoireActions({
  user,
  loggedInUserId,
  supabase,
  globalSongs,
  userSongs,
  setUserSongs,
  pendingFounding,
  setPendingFounding,
  foundingName,
  setFoundingName,
  loading,
  setLoading,
  selectedCoachId,
  setSelectedCoachId,
  selectedBandForGateway,
  setSelectedBandForGateway,
  fetchDashboardData,
  setActiveStudentTab,
  setShowFoundingModal,
  setSuggestingSkill,
  ignoredFoundingIds: externalIgnoredFoundingIds,
  lastWriteTimeRef,
  exclusiveProposal = true,
  dismissSuggestion,
  showConfetti,
  setShowConfetti
}: UseBandRepertoireActionsParams) {
  const localIgnoredRef = useRef<string[]>([]);
  const ignoredFoundingIds = externalIgnoredFoundingIds || localIgnoredRef;

  const updateProgress = useCallback(async (
    skillId: string, 
    newProgress: number, 
    meta?: { songId: string; instrument: string; difficulty: string; partNumber?: number }
  ) => {
    lastWriteTimeRef.current = Date.now();

    // 1. Resolve slot metadata with absolute certainty
    let songId = '';
    let instrument = '';
    let difficulty = 'starter';
    let partNumber = 1;

    if (meta) {
      songId = meta.songId;
      instrument = meta.instrument;
      difficulty = meta.difficulty;
      partNumber = meta.partNumber || 1;
    }

    if (!songId || !instrument || !user) {
      console.warn('[Dashboard] Cannot update progress: Missing songId, instrument or user context.', { skillId, meta });
      return;
    }

    const songInfo = (globalSongs || []).find((s: any) => s.id === songId) || {};

    // 2. Perform concurrent-safe, optimistic UI update inside functional state updater
    setUserSongs(prev => {
      // Find slot in local state by matching natural keys, avoiding UUID mismatches
      const existing = prev.find(s => 
        s.song_id === songId && 
        (s.instrument || '').toLowerCase() === instrument.toLowerCase() && 
        (s.part_number || 1) === partNumber &&
        s.difficulty_level === difficulty
      );

      const isLocked = existing ? !!existing.locked : true;
      const clamped = isLocked ? Math.min(newProgress, 90) : newProgress;

      // Construct the updated/optimistic skill state
      const updatedSkill = existing ? {
        ...existing,
        progress: clamped
      } : {
        id: skillId,
        user_id: user.id,
        song_id: songId,
        instrument: instrument,
        difficulty_level: difficulty,
        part_number: partNumber,
        progress: clamped,
        is_stage_ready: false,
        is_pending_approval: false,
        title: songInfo.title || 'Unbenannter Song',
        artist: songInfo.artist || 'Unbekannter Künstler',
        media_link: songInfo.media_link,
        tomplay_url: songInfo.tomplay_url,
        instrumentation: songInfo.instrumentation
      };

      // 3. Trigger unified, bulletproof DB UPSERT in the background
      supabase
        .from('user_song_skills')
        .upsert({
          user_id: user.id,
          song_id: songId,
          instrument: instrument,
          difficulty_level: difficulty,
          part_number: partNumber,
          progress_percent: clamped,
          is_stage_ready: existing ? !!existing.is_stage_ready : false
        }, {
          onConflict: 'user_id,song_id,instrument,difficulty_level,part_number'
        })
        .select()
        .then(({ data, error }: any) => {
          if (!error && data && data.length > 0) {
            const realSkill = {
              ...data[0],
              progress: data[0].is_stage_ready ? 100 : Math.min(90, data[0].progress_percent || 0),
              title: songInfo.title || 'Unbenannter Song',
              artist: songInfo.artist || 'Unbekannter Künstler',
              media_link: songInfo.media_link,
              tomplay_url: songInfo.tomplay_url,
              instrumentation: songInfo.instrumentation
            };
            
            // Atomically replace local state with database row by matching natural keys
            setUserSongs(current => current.map(s => 
              (s.song_id === songId && 
               (s.instrument || '').toLowerCase() === instrument.toLowerCase() && 
               (s.part_number || 1) === partNumber &&
               s.difficulty_level === difficulty) ? realSkill : s
            ));
          } else if (error) {
            console.error('[Dashboard] Error saving skill progress:', error);
          }
        });

      // Update state locally
      if (existing) {
        return prev.map(s => s.id === existing.id ? updatedSkill : s);
      } else {
        return [...prev, updatedSkill];
      }
    });
  }, [globalSongs, lastWriteTimeRef, supabase, setUserSongs, user]);

  const handleFinalizeBandName = useCallback(async () => {
    if (!pendingFounding || !foundingName.trim() || !user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('bands')
        .update({ name: foundingName.trim() })
        .eq('id', pendingFounding.id);
      
      if (error) throw error;
      
      localStorage.setItem(`groovelab_announcement_${user.id}_${pendingFounding.id}`, 'true');
      setShowFoundingModal(false);
      setFoundingName('');
      fetchDashboardData(user.id);
    } catch (err: any) {
      alert('Fehler beim Speichern des Bandnamens: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [pendingFounding, foundingName, user, supabase, setShowFoundingModal, setFoundingName, fetchDashboardData, setLoading]);

  const handleFoundBand = useCallback(async (songToFound?: any) => {
    if (loading) return;
    const target = songToFound || pendingFounding;
    if (!target || !user) return;
    try {
      setLoading(true);
      const groupID = target.formation_group;
      
      console.log('[Founding] Founding Artist Gateway for:', target.title || target.songs?.title);
      
      // 1. Determine members and coach BEFORE creating the band record
      let formationMembers: any[] = [];
      let calculatedCoachId = selectedCoachId || null;

      // Self-healing: if an inconsistent/empty band exists for this group from a previous failed attempt, delete it.
      // If a valid band exists, open the celebration gateway for it!
      if (groupID) {
        const { data: existingGroupBand } = await supabase
          .from('bands')
          .select('id, band_members(id)')
          .eq('formation_group', groupID)
          .maybeSingle();

        if (existingGroupBand && (!existingGroupBand.band_members || existingGroupBand.band_members.length === 0)) {
          console.log('[Founding] Found empty/inconsistent band from a previous failed attempt. Deleting it to self-heal.');
          await supabase.from('bands').delete().eq('id', existingGroupBand.id);
        } else if (existingGroupBand) {
          console.log('[Founding] Valid band already exists for this group. Opening existing gateway.');
          setPendingFounding(null);
          console.log('[DEBUG-Groovelab] setSuggestingSkill(null) in handleFoundBand (existing group)');
          setSuggestingSkill(null);
          setSelectedCoachId('');
          
          const { data: fullBand } = await supabase
            .from('bands')
            .select('*, band_songs(*, songs(*)), band_members(*, users!user_id(*)), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url))')
            .eq('id', existingGroupBand.id)
            .single();

          if (fullBand) {
            setSelectedBandForGateway(fullBand);
          }
          
          await fetchDashboardData(user.id, false);
          return;
        }
      }

      if (groupID) {
        console.log('[Founding] Pre-fetching members for group:', groupID);
        const { data: groupData } = await supabase
          .from('user_song_skills')
          .select('id, user_id, instrument, verified_by_id, created_at, profiles:users(first_name, photo_url)')
          .eq('formation_group', groupID);
          
        if (groupData && groupData.length > 0) {
          formationMembers = groupData.map((d: any) => ({
            id: d.id,
            skill_id: d.id,
            user_id: d.user_id,
            instrument: d.instrument,
            first_name: d.profiles?.first_name || 'Musiker',
            photo_url: d.profiles?.photo_url,
            verified_by_id: d.verified_by_id
          }));

          if (!calculatedCoachId) {
            const coachCounts: Record<string, number> = {};
            formationMembers.forEach(m => {
              if (m.verified_by_id) coachCounts[m.verified_by_id] = (coachCounts[m.verified_by_id] || 0) + 1;
            });
            const sortedCoaches = Object.entries(coachCounts).sort((a, b) => b[1] - a[1]);
            if (sortedCoaches.length > 0) calculatedCoachId = sortedCoaches[0][0];
          }
        }
      }

      // 2. Create Band record (status: forming)
      const { data: newBand, error: bErr } = await supabase
        .from('bands')
        .insert({ 
          name: foundingName || `${target.title || target.songs?.title} Band`, 
          school_id: user.school_id,
          song_id: target.song_id || target.songs?.id || target.id,
          coach_id: calculatedCoachId,
          status: 'forming',
          formation_group: groupID
        })
        .select()
        .single();
      
      if (bErr || !newBand) throw bErr || new Error('Band creation failed');

      // 3. Create Band Song project
      const { data: bSong, error: bsErr } = await supabase
        .from('band_songs')
        .insert({ 
          band_id: newBand.id, 
          song_id: target.song_id || target.songs?.id || target.id, 
          status: 'active',
          suggested_by: user.id,
          difficulty_level: target.difficulty_level || target.level || 'starter'
        })
        .select()
        .single();
      
      if (bsErr || !bSong) throw bsErr;

      // 4. Finalize member list
      if (formationMembers.length === 0) {
        formationMembers = target.members || [];
      }

      // Ensure all members are flattened and have all necessary fields
      const flatMembers = formationMembers.map((m: any) => {
        const prof = m.profiles || m.users || m;
        const firstName = m.first_name || prof?.first_name || 'Musiker';
        const photoUrl = m.photo_url || prof?.photo_url || null;
        return {
          id: m.id || m.skill_id || null,
          skill_id: m.skill_id || m.id || null,
          user_id: m.user_id,
          instrument: m.instrument,
          part_number: m.part_number || 1,
          first_name: firstName,
          photo_url: photoUrl,
          verified_by_id: m.verified_by_id || null
        };
      });

      // Final safety: The founder (current user) MUST be in the list
      if (!flatMembers.some((m: any) => m.user_id === user.id)) {
        flatMembers.unshift({
          id: target.id || target.skill_id || null,
          skill_id: target.skill_id || target.id || null,
          user_id: user.id,
          instrument: target.instrument || user.instrument || 'Musiker',
          part_number: target.part_number || 1,
          first_name: user.first_name,
          photo_url: user.photo_url,
          verified_by_id: null
        });
      }

      // Deduplicate by user_id to be safe
      const uniqueMembers = Array.from(new Map(flatMembers.map(m => [m.user_id, m])).values());
      
      console.log('[Founding] Final member list to insert:', uniqueMembers.length);

      // Prepare bulk data
      const memberInserts = uniqueMembers.map((m: any) => ({
        band_id: newBand.id,
        user_id: m.user_id,
        instrument: m.instrument,
        confetti_seen: m.user_id === user.id ? true : false
      }));

      const slotInserts = uniqueMembers.map((m: any) => ({
        band_song_id: bSong.id,
        user_id: m.user_id,
        instrument: m.instrument,
        part_number: m.part_number || 1,
        status: m.user_id === user.id ? 'accepted' : 'joined',
        is_founder: m.user_id === user.id
      }));

      // Bulk Insert Members
      const { error: memErr } = await supabase.from('band_members').insert(memberInserts);
      if (memErr) throw new Error('Mitglieder konnten nicht hinzugefügt werden: ' + memErr.message);

      // Bulk Insert Slots
      const { error: slotErr } = await supabase.from('band_song_slots').insert(slotInserts);
      if (slotErr) throw new Error('Song-Slots konnten nicht erstellt werden: ' + slotErr.message);

      const createdSlots = slotInserts;

      // Also update the formation_group column for all these skills in the database to link them!
      const skillIdsToUpdate = uniqueMembers
        .map((m: any) => m.skill_id || m.id)
        .filter(Boolean);
      if (skillIdsToUpdate.length > 0 && groupID) {
        await supabase
          .from('user_song_skills')
          .update({ formation_group: groupID })
          .in('id', skillIdsToUpdate);
      }

      // Also mark the specific skill record as prompted so the Glückwunsch modal doesn't re-appear
      const promptKey = `groovelab_prompted_${user.id}`;
      const promptedIds = JSON.parse(localStorage.getItem(promptKey) || '[]');
      if (!promptedIds.includes(target.id)) {
        promptedIds.push(target.id);
        localStorage.setItem(promptKey, JSON.stringify(promptedIds));
      }

      console.log('[Founding] Artist Gateway Created for all members!');

      // Send Realtime Broadcast notification that a band has been founded
      try {
        const liveLabChannel = supabase.channel(`realtime_live_lab_${user.school_id}`);
        liveLabChannel.subscribe((status: any) => {
          if (status === 'SUBSCRIBED') {
            liveLabChannel.send({
              type: 'broadcast',
              event: 'band-founded',
              payload: {
                bandName: newBand.name,
                songTitle: target.title || target.songs?.title || 'einem Song'
              }
            });
            console.log('[Founding] Sent band-founded broadcast for', newBand.name);
            setTimeout(() => {
              supabase.removeChannel(liveLabChannel);
            }, 1500);
          }
        });
      } catch (bcErr) {
        console.error('Failed to send band-founded broadcast:', bcErr);
      }
      
      // Close all triggers/modals first
      localStorage.setItem(`groovelab_founding_done_${user.id}_${target.song_id || target.id}`, 'true');
      if (groupID) localStorage.setItem(`groovelab_form_done_${user.id}_${groupID}`, 'true');
      
      setShowFoundingModal(false);
      setPendingFounding(null);
      setFoundingName('');
      console.log('[DEBUG-Groovelab] setSuggestingSkill(null) at the end of handleFoundBand');
      setSuggestingSkill(null); // Close the congrats modal immediately
      setSelectedCoachId(''); // Clear selected coach!
      
      // Open the gateway celebration UI IMMEDIATELY for the founder
      console.log('[Founding] Opening Celebration Gateway UI...');
      setSelectedBandForGateway({ 
        ...newBand, 
        songs: { title: target.title || target.songs?.title || 'Dein Song' }, 
        band_members: uniqueMembers.map((m: any) => ({
          ...m,
          role: m.user_id === user.id ? 'leader' : 'member'
        })),
        band_songs: [{
          ...bSong,
          band_song_slots: createdSlots
        }]
      });

      // Background sync
      console.log('[Founding] Triggering background data sync in parallel...');
      await fetchDashboardData(user.id, false);
      
      // Switch to bands tab so the gateway can stay visible if closed
      setActiveStudentTab('bands');
      
    } catch (err: any) {
      console.error('[Founding] Error during band creation:', err);
      alert('Fehler bei der Gateway-Eröffnung: ' + err.message);
    } finally {
      console.log('[Founding] Finishing process, clearing loading state.');
      setLoading(false);
      setTimeout(() => {
        if (loading) setLoading(false);
      }, 500);
    }
  }, [
    loading,
    pendingFounding,
    user,
    selectedCoachId,
    foundingName,
    supabase,
    fetchDashboardData,
    setActiveStudentTab,
    setShowFoundingModal,
    setPendingFounding,
    setFoundingName,
    setSuggestingSkill,
    setSelectedCoachId,
    setSelectedBandForGateway,
    setLoading
  ]);

  const handleAcceptBand = useCallback(async (band: any) => {
    if (!user) return;
    try {
      setLoading(true);
      let bandSong = band.band_songs?.[0];
      
      // Fallback: If band_songs is missing, try to fetch it
      if (!bandSong) {
        console.log('[Accept] band_songs missing, fetching fallback...');
        const { data: fallback } = await supabase
          .from('band_songs')
          .select('*, band_song_slots(*)')
          .eq('band_id', band.id)
          .eq('song_id', band.song_id)
          .single();
        bandSong = fallback;
      }

      if (!bandSong) throw new Error('Kein Song-Projekt gefunden');

      const { error } = await supabase
        .from('band_song_slots')
        .update({ status: 'accepted' })
        .eq('band_song_id', bandSong.id)
        .eq('user_id', user.id);

      if (error) throw error;

      alert('Du bist jetzt offizielles Mitglied! 🤘');
      fetchDashboardData(user.id);
      
      // Update local state to reflect acceptance
      if (selectedBandForGateway && selectedBandForGateway.id === band.id) {
        const updatedBandSongs = selectedBandForGateway.band_songs?.map((bs: any, idx: number) => {
          if (idx === 0) {
            return {
              ...bs,
              band_song_slots: bs.band_song_slots?.map((s: any) => 
                s.user_id === user.id ? { ...s, status: 'accepted' } : s
              )
            };
          }
          return bs;
        });
        
        setSelectedBandForGateway({
          ...selectedBandForGateway,
          band_songs: updatedBandSongs
        });
      }
    } catch (err: any) {
      alert('Fehler beim Beitreten: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [user, supabase, fetchDashboardData, selectedBandForGateway, setSelectedBandForGateway, setLoading]);

  const handleCloseAnnouncement = useCallback(() => {
    if (!pendingFounding || !user) return;
    localStorage.setItem(`groovelab_announcement_${user.id}_${pendingFounding.id}`, 'true');
    setShowFoundingModal(false);
    setPendingFounding(null);
  }, [pendingFounding, user, setShowFoundingModal, setPendingFounding]);

  const handleRejectFounding = useCallback(async () => {
    if (!pendingFounding || !user) return;
    if (!window.confirm('Möchtest du wirklich nicht beitreten? Dein Platz wird für andere Schüler freigegeben.')) return;
    
    // Add to session blacklist synchronously
    if (!ignoredFoundingIds.current.includes(pendingFounding.id)) {
      ignoredFoundingIds.current.push(pendingFounding.id);
    }

    // Handle local detection IDs (non-UUID strings)
    const isLocalId = pendingFounding.id.startsWith('local_') || 
                      pendingFounding.id.startsWith('effect_triggered_') || 
                      pendingFounding.id.startsWith('auto_') || 
                      pendingFounding.id.startsWith('first_slot_');

    if (isLocalId) {
      // CLEAR the formation for EVERYONE involved to free up the slots
      const songId = pendingFounding.songs?.id || pendingFounding.songs?.song_id;
      const memberIds = pendingFounding.band_song_slots.map((m: any) => m.user_id);
      
      if (songId && memberIds.length > 0) {
        await supabase
          .from('user_song_skills')
          .update({ formation_group: null })
          .in('user_id', memberIds)
          .eq('song_id', songId);
      }

      setShowFoundingModal(false);
      setPendingFounding(null);
      setTimeout(() => fetchDashboardData(user.id), 500);
      return;
    }

    try {
      const { error } = await supabase
        .from('band_song_slots')
        .delete()
        .eq('band_song_id', pendingFounding.id)
        .eq('user_id', user.id);
      
      if (error) throw error;
      setShowFoundingModal(false);
      setPendingFounding(null);
      fetchDashboardData(user.id);
    } catch (err: any) {
      alert('Fehler beim Ablehnen: ' + err.message);
    }
  }, [pendingFounding, user, ignoredFoundingIds, supabase, setShowFoundingModal, setPendingFounding, fetchDashboardData]);

  const handleFinalizeFounding = useCallback(async () => {
    if (!pendingFounding || !user) return;
    let finalName = foundingName;
    if (!finalName) {
      const suggestions = ['Groove Lab Rebels', 'Sonic Echo', 'Neon Harmony', 'The Beat Unit', 'Midnight Pulse', 'Echo Theory', 'Static Flow', 'Vibe Collective', 'The Sonic Rebels', 'Pulse Brigade'];
      finalName = suggestions[Math.floor(Math.random() * suggestions.length)];
    }

    setLoading(true);
    try {
      // 1. Create the band
      const avatarMap: Record<string, string[]> = {
        '3': ['band_avatar_3_musicians_1_1777469162449.png', 'band_avatar_3_musicians_2_1777469216449.png', 'band_avatar_3_musicians_3_1777469286463.png'],
        '4': ['band_avatar_4_musicians_1_1777469178768.png', 'band_avatar_4_musicians_2_1777469299351.png', 'band_avatar_4_musicians_3_1777469315500.png'],
        '5': ['band_avatar_5_musicians_1_1777469193682.png', 'band_avatar_5_musicians_2_1777469330208.png', 'band_avatar_5_musicians_3_1777469343103.png']
      };
      const count = pendingFounding.band_song_slots.length;
      const sizeKey = count <= 3 ? '3' : (count === 4 ? '4' : '5');
      const avatarFile = avatarMap[sizeKey][Math.floor(Math.random() * 3)];

      const { data: band, error: bandErr } = await supabase
        .from('bands')
        .insert({
          name: finalName,
          school_id: user.school_id,
          song_id: pendingFounding.song_id,
          status: 'active',
          photo_url: `/brain/2c435655-1542-47aa-a374-93257d55c94c/${avatarFile}`
        })
        .select()
        .single();

      if (bandErr) throw bandErr;

      // 2. Add members
      const memberInserts = pendingFounding.band_song_slots.map((s: any) => ({
        band_id: band.id,
        user_id: s.user_id,
        instrument: s.instrument,
        confetti_seen: false
      }));

      const { error: membersErr } = await supabase.from('band_members').insert(memberInserts);
      if (membersErr) throw membersErr;

      // 3. Link band_song and clear slots
      const { error: bsErr } = await supabase.from('band_songs').update({ band_id: band.id, status: 'active' }).eq('id', pendingFounding.id);
      if (bsErr) throw bsErr;
      
      alert(`Glückwunsch! Die Band "${finalName}" wurde erfolgreich gegründet! 🚀🎸`);
      setShowFoundingModal(false);
      setPendingFounding(null);
      setFoundingName('');
      fetchDashboardData(user.id);
    } catch (err: any) {
      alert('Fehler bei der Gründung: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [pendingFounding, user, foundingName, supabase, setShowFoundingModal, setPendingFounding, setFoundingName, fetchDashboardData, setLoading]);

  const handleDeleteSong = useCallback(async (songId: string) => {
    console.log('Attempting to delete song:', songId, 'for user:', loggedInUserId);
    if (!window.confirm('Möchtest du diesen Song aus deinem Übe-Board entfernen?')) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('user_song_skills').delete().eq('song_id', songId).eq('user_id', loggedInUserId);
      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
      console.log('Delete successful');
      if (loggedInUserId) await fetchDashboardData(loggedInUserId);
    } catch (e: any) {
      alert('Fehler beim Löschen: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [loggedInUserId, supabase, fetchDashboardData, setLoading]);

  const handleAddSongToRepertoire = useCallback(async (song: any) => {
    if (!loggedInUserId) return;
    try {
      setLoading(true);
      
      const req = song.instrumentation || { Guitar: 1, Bass: 1, Drums: 1, Keys: 0 };
      const instrumentsToAdd = Object.keys(req).filter(inst => req[inst] > 0);
      
      if (instrumentsToAdd.length === 0) {
        alert('Dieser Song hat keine Instrumente hinterlegt.');
        setLoading(false);
        return;
      }
      
      const insertData: any[] = [];
      instrumentsToAdd.forEach(inst => {
        insertData.push({
          user_id: loggedInUserId,
          song_id: song.id,
          instrument: inst,
          difficulty_level: 'starter',
          progress_percent: 0,
          is_stage_ready: false
        });
        insertData.push({
          user_id: loggedInUserId,
          song_id: song.id,
          instrument: inst,
          difficulty_level: 'original',
          progress_percent: 0,
          is_stage_ready: false
        });
      });

      const { error } = await supabase.from('user_song_skills').insert(insertData);
      
      if (error) {
        if (error.code === '23505') {
          alert('Dieser Song ist bereits in deinem Repertoire!');
        } else {
          throw error;
        }
      } else {
        await fetchDashboardData(loggedInUserId);
        setActiveStudentTab('practice');
      }
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [loggedInUserId, supabase, fetchDashboardData, setActiveStudentTab, setLoading]);

  const handleSubmitForApproval = useCallback(async (skill: any) => {
    if (!loggedInUserId || !user) return;
    try {
      setLoading(true);
      console.log('[CHALLENGE] Starting submission for:', skill);
      
      const { data, error: findErr } = await supabase
        .from('user_song_skills')
        .select('id, progress_percent, is_pending_approval')
        .match({ 
          user_id: loggedInUserId, 
          song_id: skill.song_id,
          instrument: skill.instrument,
          difficulty_level: skill.difficulty_level,
          part_number: skill.part_number || 1
        });

      if (findErr) throw new Error('Find-Error: ' + findErr.message);
      const existing = data && data.length > 0 ? data[0] : null;

      let updateResult;
      if (existing) {
        console.log('[CHALLENGE] Updating existing record:', existing.id);
        updateResult = await supabase.from('user_song_skills').update({ 
          is_pending_approval: true,
          progress_percent: 90 
        }).eq('id', existing.id).select();
      } else {
        console.log('[CHALLENGE] No record found, inserting new one.');
        updateResult = await supabase.from('user_song_skills').insert({
          user_id: loggedInUserId,
          song_id: skill.song_id,
          instrument: skill.instrument,
          difficulty_level: skill.difficulty_level || 'original',
          part_number: skill.part_number || 1,
          progress_percent: skill.progress || 90,
          is_pending_approval: true,
          is_stage_ready: false
        }).select();
      }
      
      if (updateResult.error) throw new Error('Update-Error: ' + updateResult.error.message);
      
      // Realtime broadcast to teacher
      const teacherId = user.teacher_id;
      if (teacherId) {
        const channel = supabase.channel(`realtime_teacher_challenges_${teacherId}`);
        channel.subscribe((status: any) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'challenge-submitted',
              payload: {
                studentId: loggedInUserId,
                studentName: `${user.first_name} ${user.last_name ? user.last_name.charAt(0) + '.' : ''}`,
                songTitle: skill.songs?.title || skill.title || 'Song',
                instrument: skill.instrument
              }
            });
            setTimeout(() => supabase.removeChannel(channel), 1000);
          }
        });
      }

      if (loggedInUserId) await fetchDashboardData(loggedInUserId);
      alert('Challenge eingereicht! Dein Lehrer hat eine Benachrichtigung erhalten.');

    } catch (e: any) {
      alert('Einreichungs-Fehler: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [loggedInUserId, user, supabase, fetchDashboardData, setLoading]);

  const handleSuggestToBand = useCallback(async (bandId: string, skill: any) => {
    try {
      // 1. Create the proposal in band_songs
      const { data: bsData, error: bsErr } = await supabase
        .from('band_songs')
        .insert({
          band_id: bandId,
          song_id: skill.song_id,
          status: 'proposal',
          suggested_by: user.id,
          is_exclusive: exclusiveProposal,
          difficulty_level: skill.difficulty_level || 'original'
        })
        .select()
        .single();

      if (bsErr) {
        if (bsErr.code === '23505') {
          alert('Dieser Song wurde bereits für diese Band vorgeschlagen oder ist bereits im Repertoire.');
        } else {
          throw bsErr;
        }
        return;
      }

      // 2. Create the first slot for the suggester
      const { error: slotErr } = await supabase
        .from('band_song_slots')
        .insert({
          band_song_id: bsData.id,
          user_id: user.id,
          instrument: skill.instrument,
          part_number: skill.part_number || 1
        });

      if (slotErr) throw slotErr;

      // 3. Send a Shoutbox notification (Only if not fully mastered by all required players)
      const song = globalSongs.find((s: any) => s.id === skill.song_id);
      let isFullyMastered = false;
      if (song?.instrumentation) {
        const req = song.instrumentation;
        const normSugInst = normalizeInstrument(skill.instrument);
        isFullyMastered = Object.entries(req).every(([inst, count]) => {
          const normReq = normalizeInstrument(inst);
          if (normReq === 'Vocals') return true;
          const needed = count as number;
          if (needed <= 0) return true;
          const suggesterSatisfies = (normSugInst === normReq);
          const filledCount = suggesterSatisfies ? 1 : 0;
          return filledCount >= needed;
        });
      }

      if (!isFullyMastered) {
        await supabase.from('band_shoutbox').insert({
          band_id: bandId,
          user_id: user.id,
          content: `Ich habe die Challenge für "${skill.songs?.title || skill.title}" gemeistert und den Song für unsere Band vorgeschlagen! Wer ist dabei? 🎸🚀`
        });

        alert('Song erfolgreich vorgeschlagen! Deine Bandmitglieder wurden benachrichtigt.');
      } else {
        await supabase.from('band_songs').update({ status: 'active' }).eq('id', bsData.id);
        await supabase.from('band_shoutbox').insert({
          band_id: bandId,
          user_id: user.id,
          content: `🔥 Juhu! Wir haben "${song?.title || skill.songs?.title || skill.title}" vollständig besetzt und gemeistert! Der Song ist ab sofort in unserem Repertoire!`
        });
        alert('Song wurde zu deinem Repertoire in dieser Band hinzugefügt.');
      }
      
      if (dismissSuggestion) dismissSuggestion(skill.id);
      fetchDashboardData(user.id);
    } catch (err: any) {
      console.error('[SuggestToBand] Error:', err);
      alert('Fehler beim Vorschlagen des Songs: ' + (err.message || 'Unbekannter Fehler'));
    }
  }, [user, exclusiveProposal, globalSongs, dismissSuggestion, supabase, fetchDashboardData]);

  const clearConfetti = useCallback(async () => {
    if (!showConfetti) return;
    const bandToOpen = showConfetti.bands;
    await supabase.from('band_members').update({ confetti_seen: true }).eq('id', showConfetti.id);
    if (setShowConfetti) setShowConfetti(null);
    
    // Now trigger the Artist Gateway debut once
    if (bandToOpen && bandToOpen.status === 'forming') {
      setSelectedBandForGateway(bandToOpen);
    }
  }, [showConfetti, supabase, setShowConfetti, setSelectedBandForGateway]);

  return {
    updateProgress,
    handleFinalizeBandName,
    handleFoundBand,
    handleAcceptBand,
    handleCloseAnnouncement,
    handleRejectFounding,
    handleFinalizeFounding,
    handleDeleteSong,
    handleAddSongToRepertoire,
    handleSubmitForApproval,
    handleSuggestToBand,
    clearConfetti
  };
}
