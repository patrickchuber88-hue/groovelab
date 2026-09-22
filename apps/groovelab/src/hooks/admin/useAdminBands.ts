import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export interface UseAdminBandsParams {
  admin: any;
  userId: string;
  fetchData: (force?: boolean) => void;
}

export function useAdminBands({ admin, userId, fetchData }: UseAdminBandsParams) {
  const [bandSearch, setBandSearch] = useState('');
  const [bandLetter, setBandLetter] = useState<string | null>(null);
  const [selectedCoachId, setSelectedCoachId] = useState<string>('all');
  const [showAddBand, setShowAddBand] = useState(false);
  const [newBand, setNewBand] = useState({ name: '', song_id: '', coach_id: '', photo_url: '' });
  const [editingBand, setEditingBand] = useState<any | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<{ user_id: string; instrument: string }[]>([]);
  const [memberToSearch, setMemberToSearch] = useState('');
  const [showAddMember, setShowAddMember] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState('');

  const updateBandCoach = async (bandId: string) => {
    try {
      const { data: band } = await supabase.from('bands').select('coach_is_manual, song_id').eq('id', bandId).single();
      if (!band || band.coach_is_manual) return;

      const { data: members } = await supabase
        .from('band_members')
        .select(`
          user_id,
          users!inner(user_song_skills:user_song_skills!user_song_skills_user_id_fkey(*))
        `)
        .eq('band_id', bandId);

      if (!members) return;

      const counts: Record<string, number> = {};
      members.forEach((m: any) => {
        const verifierId = m.users?.user_song_skills?.find((s: any) => s.song_id === band.song_id && s.is_stage_ready)?.verified_by_id;
        if (verifierId) counts[verifierId] = (counts[verifierId] || 0) + 1;
      });

      let topTid = null;
      let max = 0;
      for (const [tid, c] of Object.entries(counts)) {
        if (c > max) {
          max = c;
          topTid = tid;
        }
      }

      if (topTid) {
        await supabase.from('bands').update({ coach_id: topTid }).eq('id', bandId);
      }
    } catch (err) {
      console.error('Coach update failed:', err);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Mitglied aus der Band entfernen?')) return;
    try {
      const { error } = await supabase.from('band_members').delete().eq('id', memberId);
      if (error) throw error;
      
      const { data: member } = await supabase.from('band_members').select('band_id').eq('id', memberId).single();
      if (member) await updateBandCoach(member.band_id);
      
      fetchData();
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    }
  };

  const handleAddMember = async (bandId: string, memberUserId: string | null, instrument: string, extName?: string) => {
    try {
      const insertData: any = {
        band_id: bandId,
        user_id: memberUserId,
        instrument: instrument,
        confetti_seen: true
      };
      if (extName) {
        insertData.external_name = extName;
      }

      const { error } = await supabase.from('band_members').insert(insertData);
      if (error && error.message.includes('external_name')) {
        if (!memberUserId) {
          throw new Error("Der Server unterstützt keine externen Mitglieder. Bitte führen Sie die SQL-Migration aus.");
        }
        const fallbackData = { ...insertData };
        delete fallbackData.external_name;
        const { error: retryErr } = await supabase.from('band_members').insert(fallbackData);
        if (retryErr) throw retryErr;
      } else if (error) {
        throw error;
      }
      
      const { data: bandSongs } = await supabase.from('band_songs').select('id').eq('band_id', bandId);
      if (bandSongs && bandSongs.length > 0) {
         const songIds = bandSongs.map((bs: any) => bs.id);
         const { data: existingSlots } = await supabase
            .from('band_song_slots')
            .select('band_song_id, instrument, part_number')
            .in('band_song_id', songIds);

         const slotsToInsert = bandSongs.map((bs: any) => {
            const matchingSlots = (existingSlots || []).filter(
               (s: any) => s.band_song_id === bs.id && s.instrument === instrument
            );
            const maxPart = matchingSlots.reduce((max: number, s: any) => Math.max(max, s.part_number || 1), 0);
            const nextPart = maxPart + 1;

            const slotObj: any = {
               band_song_id: bs.id,
               user_id: memberUserId,
               instrument: instrument,
               part_number: nextPart,
               status: 'joined'
            };
            if (extName) {
               slotObj.external_name = extName;
            }
            return slotObj;
         });

         const { error: slotErr } = await supabase.from('band_song_slots').insert(slotsToInsert);
         if (slotErr && slotErr.message.includes('external_name')) {
            if (!memberUserId) {
               console.error("Failed to insert slots for external member:", slotErr);
            } else {
               const cleanedSlots = slotsToInsert.map((s: any) => {
                  const copy = { ...s };
                  delete copy.external_name;
                  return copy;
               });
               const { error: retrySlotErr } = await supabase.from('band_song_slots').insert(cleanedSlots);
               if (retrySlotErr) throw retrySlotErr;
            }
         } else if (slotErr) {
            throw slotErr;
         }
      }
      
      await updateBandCoach(bandId);
      
      setShowAddMember(null);
      setMemberSearch('');
      fetchData();
    } catch (err: any) {
      alert('Fehler beim Hinzufügen: ' + err.message);
    }
  };

  const handleSaveBandEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBand) return;
    try {
      const { error } = await supabase.from('bands').update({
        name: editingBand.name,
        bio: editingBand.bio,
        genre: editingBand.genre,
        coach_id: editingBand.coach_id,
        coach_is_manual: editingBand.coach_is_manual
      }).eq('id', editingBand.id);
      if (error) throw error;
      setEditingBand(null);
      fetchData();
    } catch (err: any) {
      alert('Fehler beim Speichern: ' + err.message);
    }
  };

  const handleCreateBandManually = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBand.name || !admin?.school_id) return;

    // 1. Create Band
    const { data: band, error: bErr } = await supabase.from('bands').insert({
      name: newBand.name,
      coach_id: newBand.coach_id || userId,
      school_id: admin.school_id,
      status: 'active',
      photo_url: newBand.photo_url || null
    }).select().single();

    if (bErr || !band) {
      alert("Fehler beim Erstellen der Band: " + bErr?.message);
      return;
    }

    // 2. Add Song (if selected)
    if (newBand.song_id) {
       const { data: bs, error: bsErr } = await supabase.from('band_songs').insert({
         band_id: band.id,
         song_id: newBand.song_id,
         status: 'ready'
       }).select().single();
       
       if (bs) {
          for (const m of selectedMembers) {
             await supabase.from('band_song_slots').insert({
               band_song_id: bs.id,
               user_id: m.user_id,
               instrument: m.instrument,
               status: 'joined'
             });
          }
       } else {
          console.error("Fehler beim Verknüpfen des Songs:", bsErr);
       }
    }

    // 3. Add Members
    const coachInsertData: any = { 
      band_id: band.id, 
      user_id: newBand.coach_id || userId, 
      role: 'coach',
      instrument: 'Coach'
    };
    await supabase.from('band_members').insert(coachInsertData);
    
    for (const m of selectedMembers) {
       const memberInsertData: any = {
         band_id: band.id,
         user_id: m.user_id,
         role: 'member',
         instrument: m.instrument
       };
       await supabase.from('band_members').insert(memberInsertData);
    }

    setShowAddBand(false);
    setNewBand({ name: '', song_id: '', coach_id: userId, photo_url: '' });
    setSelectedMembers([]);
    fetchData();
  };

  return {
    bandSearch,
    setBandSearch,
    bandLetter,
    setBandLetter,
    selectedCoachId,
    setSelectedCoachId,
    showAddBand,
    setShowAddBand,
    newBand,
    setNewBand,
    editingBand,
    setEditingBand,
    selectedMembers,
    setSelectedMembers,
    memberToSearch,
    setMemberToSearch,
    showAddMember,
    setShowAddMember,
    memberSearch,
    setMemberSearch,
    updateBandCoach,
    handleRemoveMember,
    handleAddMember,
    handleSaveBandEdit,
    handleCreateBandManually
  };
}
