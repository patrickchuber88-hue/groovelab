import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { EquipmentInstance, EquipmentGroup } from '../SecretaryEquipmentView';

export interface UseSecretaryEquipmentOptions {
  schoolId: string;
  rooms: any[];
  setRooms: React.Dispatch<React.SetStateAction<any[]>>;
}

export function useSecretaryEquipment({
  schoolId,
  rooms,
  setRooms
}: UseSecretaryEquipmentOptions) {
  const [schoolEquipment, setSchoolEquipment] = useState<any[]>([]);
  const [equipmentFormName, setEquipmentFormName] = useState('');
  const [equipmentFormQty, setEquipmentFormQty] = useState<number>(1);
  const [editingEquipment, setEditingEquipment] = useState<any | null>(null);
  const [equipmentSaving, setEquipmentSaving] = useState(false);
  const [selectedEquipmentRoomId, setSelectedEquipmentRoomId] = useState<string | null>('All');
  const [dragOverRoomId, setDragOverRoomId] = useState<string | null>(null);
  const [equipmentSearchQuery, setEquipmentSearchQuery] = useState<string>('');
  const [equipmentSortFreeFirst, setEquipmentSortFreeFirst] = useState<boolean>(false);
  const equipmentNameInputRef = useRef<HTMLInputElement>(null);
  const equipmentQtyInputRef = useRef<HTMLInputElement>(null);

  const [editingRoomInstrument, setEditingRoomInstrument] = useState<{ roomId: string; index: number; name: string; model: string } | null>(null);
  const [editRoomInstFormName, setEditRoomInstFormName] = useState<string>('');
  const [editRoomInstFormModel, setEditRoomInstFormModel] = useState<string>('');

  const [editingEquipmentGroup, setEditingEquipmentGroup] = useState<EquipmentGroup | null>(null);
  const [editGroupName, setEditGroupName] = useState<string>('');
  const [editGroupModel, setEditGroupModel] = useState<string>('');
  const [editGroupLink, setEditGroupLink] = useState<string>('');
  const [editGroupCoupled, setEditGroupCoupled] = useState<boolean>(true);
  const [editGroupQty, setEditGroupQty] = useState<number>(1);
  const [editGroupInstancesData, setEditGroupInstancesData] = useState<EquipmentInstance[]>([]);

  const fetchSchoolEquipment = useCallback(async () => {
    if (!schoolId) return;
    try {
      const { data, error } = await supabase
        .from('school_equipment')
        .select('*')
        .eq('school_id', schoolId);
      if (error) throw error;
      setSchoolEquipment(data || []);
    } catch (err) {
      console.error('Error fetching school equipment:', err);
    }
  }, [schoolId]);

  useEffect(() => {
    fetchSchoolEquipment();
  }, [fetchSchoolEquipment]);

  const handleSaveEquipment = useCallback(async () => {
    if (!equipmentFormName.trim() || !schoolId) return;
    setEquipmentSaving(true);
    try {
      if (editingEquipment) {
        const { error } = await supabase
          .from('school_equipment')
          .update({
            name: equipmentFormName.trim()
          })
          .eq('id', editingEquipment.id);
        if (error) throw error;
        setSchoolEquipment((prev) =>
          prev.map((e) => (e.id === editingEquipment.id ? { ...e, name: equipmentFormName.trim() } : e))
        );
      } else {
        const qty = Math.max(1, Math.min(50, equipmentFormQty));
        const inserts = [];
        if (qty === 1) {
          inserts.push({ school_id: schoolId, name: equipmentFormName.trim() });
        } else {
          for (let i = 1; i <= qty; i++) {
            inserts.push({ school_id: schoolId, name: `${equipmentFormName.trim()} #${i}` });
          }
        }

        const { data, error } = await supabase.from('school_equipment').insert(inserts).select();
        if (error) throw error;
        if (data) setSchoolEquipment((prev) => [...prev, ...data]);
      }
      setEditingEquipment(null);
      setEquipmentFormName('');
      setEquipmentFormQty(1);
      setTimeout(() => equipmentNameInputRef.current?.focus(), 50);
    } catch (e: any) {
      console.error('Equipment save error:', e);
      alert('Fehler beim Speichern der Ausstattung: ' + e.message);
    } finally {
      setEquipmentSaving(false);
    }
  }, [equipmentFormName, schoolId, editingEquipment, equipmentFormQty]);

  const handleQtyChange = useCallback((newQty: number) => {
    if (newQty < 1) return;
    setEditGroupQty(newQty);
    
    // Adjust editGroupInstancesData
    setEditGroupInstancesData((prev) => {
      if (newQty > prev.length) {
        const added: EquipmentInstance[] = [];
        const base = editGroupName.trim() || 'Instrument';
        const model = editGroupModel.trim() || 'Standard';
        for (let i = prev.length; i < newQty; i++) {
          added.push({
            id: `temp_${Date.now()}_${i}`,
            fullName: `${base} #${i + 1}`,
            baseName: base,
            model,
            linkUrl: editGroupLink.trim(),
            roomId: null,
            roomName: null,
            roomInstIdx: -1
          });
        }
        return [...prev, ...added];
      } else if (newQty < prev.length) {
        return prev.slice(0, newQty);
      }
      return prev;
    });
  }, [editGroupName, editGroupModel, editGroupLink]);

  const handleSaveEquipmentGroup = useCallback(async () => {
    if (!schoolId || !editingEquipmentGroup) return;
    setEquipmentSaving(true);
    try {
      // Load global model mapping
      let localModelMap: Record<string, string> = {};
      let localLinkMap: Record<string, string> = {};
      try {
        localModelMap = JSON.parse(localStorage.getItem(`groovelab_instrument_models_${schoolId}`) || '{}');
      } catch {}
      try {
        localLinkMap = JSON.parse(localStorage.getItem(`groovelab_instrument_links_${schoolId}`) || '{}');
      } catch {}

      // 1. Determine deletions
      const originalIds = editingEquipmentGroup.instances.map((i: any) => i.id);
      let idsToDelete: string[] = [];
      if (editGroupCoupled) {
        idsToDelete = originalIds.slice(editGroupQty);
      } else {
        const idsToKeep = editGroupInstancesData.filter((i) => !i.id.startsWith('temp_')).map((i) => i.id);
        idsToDelete = originalIds.filter((id: string) => !idsToKeep.includes(id));
      }

      // Perform Deletions from DB & State/Rooms
      if (idsToDelete.length > 0) {
        await supabase.from('school_equipment').delete().in('id', idsToDelete);
        for (const delId of idsToDelete) {
          const inst = editingEquipmentGroup.instances.find((i: any) => i.id === delId);
          if (inst && inst.roomId) {
            const targetRoom = rooms.find((r) => r.id === inst.roomId);
            if (targetRoom && Array.isArray(targetRoom.room_instruments)) {
              const updatedRoomInsts = targetRoom.room_instruments.filter((_: any, idx: number) => idx !== inst.roomInstIdx);
              setRooms((prev) => prev.map((r) => (r.id === inst.roomId ? { ...r, room_instruments: updatedRoomInsts } : r)));
              await supabase.from('rooms').update({ room_instruments: updatedRoomInsts }).eq('id', inst.roomId);
            }
          }
        }
      }

      if (editGroupCoupled) {
        // SCENARIO A: Coupled (all exemplars have the same name and model)
        const newBaseName = editGroupName.trim();
        const newModel = editGroupModel.trim();
        const newLink = editGroupLink.trim();

        for (let idx = 0; idx < editGroupQty; idx++) {
          const newName = editGroupQty > 1 ? `${newBaseName} #${idx + 1}` : newBaseName;

          if (idx < originalIds.length) {
            // Update existing row
            const originalId = originalIds[idx];
            await supabase.from('school_equipment').update({ name: newName }).eq('id', originalId);
            localModelMap[newName] = newModel;
            if (newLink) {
              localLinkMap[newName] = newLink;
            } else {
              delete localLinkMap[newName];
            }

            // Sync with assigned room
            const inst = editingEquipmentGroup.instances.find((i: any) => i.id === originalId);
            if (inst && inst.roomId) {
              const targetRoom = rooms.find((r) => r.id === inst.roomId);
              if (targetRoom && Array.isArray(targetRoom.room_instruments)) {
                const updatedRoomInsts = [...targetRoom.room_instruments];
                if (updatedRoomInsts[inst.roomInstIdx]) {
                  updatedRoomInsts[inst.roomInstIdx] = {
                    name: newName,
                    model: newModel
                  };
                }
                setRooms((prev) => prev.map((r) => (r.id === inst.roomId ? { ...r, room_instruments: updatedRoomInsts } : r)));
                await supabase.from('rooms').update({ room_instruments: updatedRoomInsts }).eq('id', inst.roomId);
              }
            }
          } else {
            // Insert new row
            await supabase.from('school_equipment').insert({
              school_id: schoolId,
              name: newName
            });
            localModelMap[newName] = newModel;
            if (newLink) {
              localLinkMap[newName] = newLink;
            } else {
              delete localLinkMap[newName];
            }
          }
        }
      } else {
        // SCENARIO B: Decoupled (each exemplar can have a custom name and model)
        for (let idx = 0; idx < editGroupInstancesData.length; idx++) {
          const inst = editGroupInstancesData[idx];
          const name = inst.fullName.trim();
          const model = inst.model.trim();
          const link = inst.linkUrl?.trim() || '';

          if (inst.id.startsWith('temp_')) {
            // Insert new row
            await supabase.from('school_equipment').insert({
              school_id: schoolId,
              name: name
            });
            localModelMap[name] = model;
            if (link) {
              localLinkMap[name] = link;
            } else {
              delete localLinkMap[name];
            }
          } else {
            // Update existing row
            await supabase.from('school_equipment').update({ name: name }).eq('id', inst.id);
            localModelMap[name] = model;
            if (link) {
              localLinkMap[name] = link;
            } else {
              delete localLinkMap[name];
            }

            // Sync with assigned room
            const originalInst = editingEquipmentGroup.instances.find((i: any) => i.id === inst.id);
            if (originalInst && originalInst.roomId) {
              const targetRoom = rooms.find((r) => r.id === originalInst.roomId);
              if (targetRoom && Array.isArray(targetRoom.room_instruments)) {
                const updatedRoomInsts = [...targetRoom.room_instruments];
                if (updatedRoomInsts[originalInst.roomInstIdx]) {
                  updatedRoomInsts[originalInst.roomInstIdx] = {
                    name: name,
                    model: model
                  };
                }
                setRooms((prev) => prev.map((r) => (r.id === originalInst.roomId ? { ...r, room_instruments: updatedRoomInsts } : r)));
                await supabase.from('rooms').update({ room_instruments: updatedRoomInsts }).eq('id', originalInst.roomId);
              }
            }
          }
        }
      }

      // Save model mapping and links to localStorage
      localStorage.setItem(`groovelab_instrument_models_${schoolId}`, JSON.stringify(localModelMap));
      localStorage.setItem(`groovelab_instrument_links_${schoolId}`, JSON.stringify(localLinkMap));

      // Reload list from Supabase
      const { data: eqData } = await supabase.from('school_equipment').select('*').eq('school_id', schoolId);
      if (eqData) {
        setSchoolEquipment(eqData);
      }

      setEditingEquipmentGroup(null);
    } catch (e: any) {
      console.error('Equipment group save error:', e);
      alert('Fehler beim Speichern der Ausstattung: ' + e.message);
    } finally {
      setEquipmentSaving(false);
    }
  }, [
    schoolId,
    editingEquipmentGroup,
    editGroupCoupled,
    editGroupQty,
    editGroupInstancesData,
    editGroupName,
    editGroupModel,
    editGroupLink,
    rooms,
    setRooms
  ]);

  const handleDeleteEquipment = useCallback(async (id: string) => {
    if (!window.confirm('Ausstattung wirklich löschen? Dieser Eintrag wird auch aus Räumen entfernt, in denen er verwendet wird.')) return;
    try {
      const { error } = await supabase.from('school_equipment').delete().eq('id', id);
      if (error) throw error;
      setSchoolEquipment((prev) => prev.filter((e) => e.id !== id));
      const { data: roomsData } = await supabase.from('rooms').select('*').eq('school_id', schoolId);
      const localMap = (() => {
        try {
          return JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
        } catch {
          return {};
        }
      })();
      setRooms((roomsData || []).map((r) => ({ 
        ...r, 
        equipment: r.allowed_instruments || [],
        room_instruments: r.room_instruments || localMap[r.id] || []
      })));
    } catch (err: any) {
      console.error('Error deleting equipment:', err);
      alert('Fehler beim Löschen: ' + err.message);
    }
  }, [schoolId, setRooms]);

  const openEquipmentEditor = useCallback((eq?: any) => {
    if (eq) {
      setEditingEquipment(eq);
      setEquipmentFormName(eq.name);
    } else {
      setEditingEquipment(null);
      setEquipmentFormName('');
    }
  }, []);

  const handleDropInstrumentOnRoom = useCallback(async (instrumentName: string, roomId: string) => {
    const targetRoom = rooms.find((r) => r.id === roomId);
    if (!targetRoom) return;

    const currentInsts = Array.isArray(targetRoom.room_instruments) 
      ? targetRoom.room_instruments 
      : (() => {
          try {
            const map = JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
            return map[roomId] || [];
          } catch {
            return [];
          }
        })();

    const updatedInsts = [...currentInsts, { name: instrumentName, model: 'Standard' }];

    // Update LocalStorage first
    try {
      const map = JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
      map[roomId] = updatedInsts;
      localStorage.setItem(`groovelab_room_instruments_mappings_${schoolId}`, JSON.stringify(map));
    } catch (err) {
      console.error(err);
    }

    // Update state
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, room_instruments: updatedInsts } : r)));

    // Update Supabase
    try {
      const { error } = await supabase.from('rooms').update({
        room_instruments: updatedInsts
      }).eq('id', roomId);

      if (error && error.message.includes('room_instruments')) {
        console.warn('Supabase room_instruments column missing, using local storage fallback.');
      } else if (error) {
        throw error;
      }
    } catch (err: any) {
      console.error('Error saving room instruments:', err);
    }
  }, [rooms, schoolId, setRooms]);

  const handleRemoveRoomInstrument = useCallback(async (roomId: string, idxToRemove: number) => {
    const targetRoom = rooms.find((r) => r.id === roomId);
    if (!targetRoom) return;

    const currentInsts = Array.isArray(targetRoom.room_instruments) 
      ? targetRoom.room_instruments 
      : (() => {
          try {
            const map = JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
            return map[roomId] || [];
          } catch {
            return [];
          }
        })();

    const updatedInsts = currentInsts.filter((_: any, idx: number) => idx !== idxToRemove);

    // Update LocalStorage first
    try {
      const map = JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
      map[roomId] = updatedInsts;
      localStorage.setItem(`groovelab_room_instruments_mappings_${schoolId}`, JSON.stringify(map));
    } catch (err) {
      console.error(err);
    }

    // Update state
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, room_instruments: updatedInsts } : r)));

    // Update Supabase
    try {
      const { error } = await supabase.from('rooms').update({
        room_instruments: updatedInsts
      }).eq('id', roomId);

      if (error && error.message.includes('room_instruments')) {
        console.warn('Supabase room_instruments column missing, using local storage fallback.');
      } else if (error) {
        throw error;
      }
    } catch (err: any) {
      console.error('Error removing room instrument:', err);
    }
  }, [rooms, schoolId, setRooms]);

  const handleSaveRoomInstrumentEdit = useCallback(async (name: string, model: string) => {
    if (!editingRoomInstrument) return;
    const { roomId, index } = editingRoomInstrument;

    const targetRoom = rooms.find((r) => r.id === roomId);
    if (!targetRoom) return;

    const currentInsts = Array.isArray(targetRoom.room_instruments) 
      ? [...targetRoom.room_instruments]
      : [];

    if (currentInsts[index]) {
      currentInsts[index] = { name: name.trim(), model: model.trim() };
    }

    // Update LocalStorage first
    try {
      const map = JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
      map[roomId] = currentInsts;
      localStorage.setItem(`groovelab_room_instruments_mappings_${schoolId}`, JSON.stringify(map));
    } catch (err) {
      console.error(err);
    }

    // Update state
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, room_instruments: currentInsts } : r)));

    // Update Supabase
    try {
      const { error } = await supabase.from('rooms').update({
        room_instruments: currentInsts
      }).eq('id', roomId);

      if (error && error.message.includes('room_instruments')) {
        console.warn('Supabase room_instruments column missing, using local storage fallback.');
      } else if (error) {
        throw error;
      }
    } catch (err: any) {
      console.error('Error saving room instrument edit:', err);
    }

    setEditingRoomInstrument(null);
  }, [editingRoomInstrument, rooms, schoolId, setRooms]);

  return {
    schoolEquipment,
    setSchoolEquipment,
    equipmentFormName,
    setEquipmentFormName,
    equipmentFormQty,
    setEquipmentFormQty,
    editingEquipment,
    setEditingEquipment,
    equipmentSaving,
    setEquipmentSaving,
    selectedEquipmentRoomId,
    setSelectedEquipmentRoomId,
    dragOverRoomId,
    setDragOverRoomId,
    equipmentSearchQuery,
    setEquipmentSearchQuery,
    equipmentSortFreeFirst,
    setEquipmentSortFreeFirst,
    equipmentNameInputRef,
    equipmentQtyInputRef,
    editingRoomInstrument,
    setEditingRoomInstrument,
    editRoomInstFormName,
    setEditRoomInstFormName,
    editRoomInstFormModel,
    setEditRoomInstFormModel,
    editingEquipmentGroup,
    setEditingEquipmentGroup,
    editGroupName,
    setEditGroupName,
    editGroupModel,
    setEditGroupModel,
    editGroupLink,
    setEditGroupLink,
    editGroupCoupled,
    setEditGroupCoupled,
    editGroupQty,
    setEditGroupQty,
    editGroupInstancesData,
    setEditGroupInstancesData,
    fetchSchoolEquipment,
    handleSaveEquipment,
    handleQtyChange,
    handleSaveEquipmentGroup,
    handleDeleteEquipment,
    openEquipmentEditor,
    handleDropInstrumentOnRoom,
    handleRemoveRoomInstrument,
    handleSaveRoomInstrumentEdit
  };
}
