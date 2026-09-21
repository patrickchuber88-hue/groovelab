import React, { useState } from 'react';
import {
  AlertCircle, Calendar, Clock, DoorOpen, Music, Ruler, School, ShieldAlert,
  Sliders, Sparkles, Tag, Trash2, Users, Wrench, X, Plus, Edit2, ChevronDown,
  ChevronRight, FileText, Check, ArrowRight, Activity, Building, Building2,
  HelpCircle, Download, AlertTriangle, MapPin, Search, Layers, Coffee, FileSpreadsheet
} from 'lucide-react';

export interface SecretaryRoomsViewProps {
  schoolId: string;
  rooms: any[];
  setRooms: React.Dispatch<React.SetStateAction<any[]>>;
  buildings: any[];
  setBuildings: React.Dispatch<React.SetStateAction<any[]>>;
  matrixAllocations: any[];
  roomSearchQuery: string;
  setRoomSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  selectedDayPlan: any;
  setSelectedDayPlan: (plan: any) => void;
  roomIssues: any[];
  getAlphabeticalUniColor: (name: string) => { avatarBg: string; avatarColor: string };
  checkTimeOverlap: (t1Start: string, t1End: string, t2Start: string, t2End: string) => boolean;
  getPlanDisplayName: (plan: any) => string;
  supabase: any;
  fetchDashboardData: () => Promise<void>;
  parseRoomName: (name: string) => { prefix: string; number: number | null };
  getFloorColor: (name: string) => any;
  getAlphabeticalColor: (name: string) => { avatarBg: string; avatarColor: string };
  formatInstrumentName: (name: string) => string;
  roomsSubView?: 'overview' | 'plan' | 'settings';
  setRoomsSubView?: (v: 'overview' | 'plan' | 'settings') => void;
  pendingBookings?: any[];
  handleConfirmBooking?: (id: string) => Promise<void> | void;
  handleRejectBooking?: (id: string) => Promise<void> | void;
  onOpenFacilityLogModal?: () => void;
}

export function SecretaryRoomsView({
  schoolId,
  rooms,
  setRooms,
  buildings,
  setBuildings,
  matrixAllocations,
  roomSearchQuery,
  setRoomSearchQuery,
  selectedDayPlan,
  setSelectedDayPlan,
  roomIssues,
  getAlphabeticalUniColor,
  checkTimeOverlap,
  getPlanDisplayName,
  supabase,
  fetchDashboardData,
  parseRoomName,
  getFloorColor,
  getAlphabeticalColor,
  formatInstrumentName,
  roomsSubView: controlledRoomsSubView,
  setRoomsSubView: controlledSetRoomsSubView,
  pendingBookings = [],
  handleConfirmBooking,
  handleRejectBooking,
  onOpenFacilityLogModal
}: SecretaryRoomsViewProps) {
  // Room state
  const [roomFilterFloor, setRoomFilterFloor] = useState<string>('All');
  const [roomFilterStatus, setRoomFilterStatus] = useState<string>('All');
  const [addedFloors, setAddedFloors] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`groovelab_added_floors_${schoolId}`) || '[]');
    } catch {
      return [];
    }
  });
  const [dragHoveredFloor, setDragHoveredFloor] = useState<string | null>(null);
  const [isRoomCsvExpanded, setIsRoomCsvExpanded] = useState<boolean>(false);
  const [roomCsvText, setRoomCsvText] = useState<string>('');
  const [roomCsvSaving, setRoomCsvSaving] = useState<boolean>(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('All');
  const [editingBuilding, setEditingBuilding] = useState<any | null>(null);
  const [showBuildingModal, setShowBuildingModal] = useState<boolean>(false);
  const [buildingFormName, setBuildingFormName] = useState<string>('');
  const [buildingFormAddress, setBuildingFormAddress] = useState<string>('');
  const [roomFormBuildingId, setRoomFormBuildingId] = useState<string>('');
  const [dragHoveredBuildingId, setDragHoveredBuildingId] = useState<string | null>(null);

  const [internalRoomsSubView, setInternalRoomsSubView] = useState<'overview' | 'plan' | 'settings'>('overview');
  const roomsSubView = controlledRoomsSubView !== undefined ? controlledRoomsSubView : internalRoomsSubView;
  const setRoomsSubView = (v: 'overview' | 'plan' | 'settings') => {
    if (controlledSetRoomsSubView) controlledSetRoomsSubView(v);
    setInternalRoomsSubView(v);
  };
  const [editingRoom, setEditingRoom] = useState<any | null>(null);
  const [roomFormName, setRoomFormName] = useState('');
  const [roomFormFloor, setRoomFormFloor] = useState('EG');
  const [roomFormMaxStudents, setRoomFormMaxStudents] = useState<number | string>(1);
  const [roomFormMaxTeachers, setRoomFormMaxTeachers] = useState<number>(1);
  const [roomFormEquipment, setRoomFormEquipment] = useState<string[]>([]);
  const [roomFormQm, setRoomFormQm] = useState<number | string>('');
  const [roomFormIsCampusActive, setRoomFormIsCampusActive] = useState(true);
  const [roomFormIsGroovelabActive, setRoomFormIsGroovelabActive] = useState(false);
  const [roomSaving, setRoomSaving] = useState(false);
  const [roomFormUnsuitableInstruments, setRoomFormUnsuitableInstruments] = useState<string[]>([]);
  const [roomFormRoomInstruments, setRoomFormRoomInstruments] = useState<Array<{ name: string; model: string }>>([]);
  const [roomFormSonstiges, setRoomFormSonstiges] = useState('');
  const [newInstrumentName, setNewInstrumentName] = useState('');
  const [newInstrumentModel, setNewInstrumentModel] = useState('');

    const handleExportPlanPDF = async () => {
    const element = document.getElementById('belegungsplan-table-container');
    if (!element) return;
    try {
      const { toJpeg } = await import('html-to-image');
      const { default: jsPDF } = await import('jspdf');
      
      const dataUrl = await toJpeg(element, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        filter: (node: any) => {
          if (node.classList && node.classList.contains('no-pdf')) {
            return false;
          }
          return true;
        },
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: element.offsetWidth + 'px',
          height: element.offsetHeight + 'px'
        }
      });
      
      const pdf = new jsPDF('l', 'px', [element.offsetWidth, element.offsetHeight]);
      pdf.addImage(dataUrl, 'JPEG', 0, 0, element.offsetWidth, element.offsetHeight);
      pdf.save(`Belegungsplan_${new Date().toLocaleDateString('de-DE')}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Fehler beim Generieren der PDF-Datei.');
    }
  };

  const handleSaveRoom = async () => {
    if (!roomFormName.trim() || !schoolId) return;
    setRoomSaving(true);
    const finalMaxStudents = roomFormMaxStudents === '' ? 1 : (parseInt(roomFormMaxStudents as string) || 1);
    const finalQm = roomFormQm === '' ? 0 : (parseFloat(roomFormQm as string) || 0);
    try {
      if (editingRoom) {
        // Update local mapping fallback first
        try {
          const mappings = JSON.parse(localStorage.getItem(`groovelab_room_floor_mappings_${schoolId}`) || '{}');
          mappings[editingRoom.id] = roomFormFloor;
          localStorage.setItem(`groovelab_room_floor_mappings_${schoolId}`, JSON.stringify(mappings));

          const bMappings = JSON.parse(localStorage.getItem(`groovelab_room_building_mappings_${schoolId}`) || '{}');
          bMappings[editingRoom.id] = roomFormBuildingId || null;
          localStorage.setItem(`groovelab_room_building_mappings_${schoolId}`, JSON.stringify(bMappings));

          const unsuitable = JSON.parse(localStorage.getItem(`groovelab_room_unsuitable_mappings_${schoolId}`) || '{}');
          unsuitable[editingRoom.id] = roomFormUnsuitableInstruments;
          localStorage.setItem(`groovelab_room_unsuitable_mappings_${schoolId}`, JSON.stringify(unsuitable));

          const instruments = JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
          instruments[editingRoom.id] = roomFormRoomInstruments;
          localStorage.setItem(`groovelab_room_instruments_mappings_${schoolId}`, JSON.stringify(instruments));

          const sonstiges = JSON.parse(localStorage.getItem(`groovelab_room_sonstiges_mappings_${schoolId}`) || '{}');
          sonstiges[editingRoom.id] = roomFormSonstiges;
          localStorage.setItem(`groovelab_room_sonstiges_mappings_${schoolId}`, JSON.stringify(sonstiges));
        } catch (err) {
          console.error(err);
        }

        // Try updating including floor and new fields
        let { error } = await supabase.from('rooms').update({
          name: roomFormName.trim(),
          allowed_instruments: roomFormEquipment,
          max_teachers: roomFormMaxTeachers,
          max_students: finalMaxStudents,
          qm: finalQm,
          is_campus_active: roomFormIsCampusActive,
          is_groovelab_active: roomFormIsGroovelabActive,
          floor: roomFormFloor,
          unsuitable_instruments: roomFormUnsuitableInstruments,
          room_instruments: roomFormRoomInstruments,
          sonstiges: roomFormSonstiges,
          building_id: roomFormBuildingId || null
        }).eq('id', editingRoom.id);
        
        // Fallback: If floor column or new properties columns are missing
        if (error && (error.message.includes("floor") || error.message.includes("column") || error.message.includes("unsuitable_instruments") || error.message.includes("room_instruments") || error.message.includes("sonstiges"))) {
          console.warn("Supabase floor/new columns missing, retrying edit save without them...");
          const { error: retryError } = await supabase.from('rooms').update({
            name: roomFormName.trim(),
            allowed_instruments: roomFormEquipment,
            max_teachers: roomFormMaxTeachers,
            max_students: finalMaxStudents,
            qm: finalQm,
            is_campus_active: roomFormIsCampusActive,
            is_groovelab_active: roomFormIsGroovelabActive,
            building_id: roomFormBuildingId || null
          }).eq('id', editingRoom.id);
          error = retryError;
        }

        if (error) throw error;
 
        setRooms(prev => prev.map(r => r.id === editingRoom.id
          ? { 
              ...r, 
              name: roomFormName.trim(), 
              allowed_instruments: roomFormEquipment, 
              equipment: roomFormEquipment, 
              max_teachers: roomFormMaxTeachers,
              max_students: finalMaxStudents,
              qm: finalQm,
              is_campus_active: roomFormIsCampusActive,
              is_groovelab_active: roomFormIsGroovelabActive,
              floor: roomFormFloor,
              unsuitable_instruments: roomFormUnsuitableInstruments,
              room_instruments: roomFormRoomInstruments,
              sonstiges: roomFormSonstiges,
              building_id: roomFormBuildingId || null
            }
          : r));
      } else {
        const insertPayload: any = {
          school_id: schoolId,
          name: roomFormName.trim(),
          allowed_instruments: roomFormEquipment,
          max_teachers: roomFormMaxTeachers,
          max_students: finalMaxStudents,
          qm: finalQm,
          sort_order: rooms.length,
          is_campus_active: roomFormIsCampusActive,
          is_groovelab_active: roomFormIsGroovelabActive,
          floor: roomFormFloor,
          unsuitable_instruments: roomFormUnsuitableInstruments,
          room_instruments: roomFormRoomInstruments,
          sonstiges: roomFormSonstiges,
          building_id: roomFormBuildingId || null
        };

        let { data, error } = await supabase.from('rooms').insert(insertPayload).select().single();
        
        // Fallback: If floor column or new columns are missing
        if (error && (error.message.includes("floor") || error.message.includes("column") || error.message.includes("unsuitable_instruments") || error.message.includes("room_instruments") || error.message.includes("sonstiges"))) {
          console.warn("Supabase floor/new columns missing, retrying insert save without them...");
          const insertPayloadWithoutNewFields = {
            school_id: schoolId,
            name: roomFormName.trim(),
            allowed_instruments: roomFormEquipment,
            max_teachers: roomFormMaxTeachers,
            max_students: finalMaxStudents,
            qm: finalQm,
            sort_order: rooms.length,
            is_campus_active: roomFormIsCampusActive,
            is_groovelab_active: roomFormIsGroovelabActive,
            building_id: roomFormBuildingId || null
          };
          const { data: retryData, error: retryError } = await supabase.from('rooms').insert(insertPayloadWithoutNewFields).select().single();
          data = retryData;
          error = retryError;
        }

        if (error) throw error;
        if (data) {
          // Update local mapping fallback for the new room ID
          try {
            const mappings = JSON.parse(localStorage.getItem(`groovelab_room_floor_mappings_${schoolId}`) || '{}');
            mappings[data.id] = roomFormFloor;
            localStorage.setItem(`groovelab_room_floor_mappings_${schoolId}`, JSON.stringify(mappings));

            const bMappings = JSON.parse(localStorage.getItem(`groovelab_room_building_mappings_${schoolId}`) || '{}');
            bMappings[data.id] = roomFormBuildingId || null;
            localStorage.setItem(`groovelab_room_building_mappings_${schoolId}`, JSON.stringify(bMappings));

            const unsuitable = JSON.parse(localStorage.getItem(`groovelab_room_unsuitable_mappings_${schoolId}`) || '{}');
            unsuitable[data.id] = roomFormUnsuitableInstruments;
            localStorage.setItem(`groovelab_room_unsuitable_mappings_${schoolId}`, JSON.stringify(unsuitable));

            const instruments = JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
            instruments[data.id] = roomFormRoomInstruments;
            localStorage.setItem(`groovelab_room_instruments_mappings_${schoolId}`, JSON.stringify(instruments));

            const sonstiges = JSON.parse(localStorage.getItem(`groovelab_room_sonstiges_mappings_${schoolId}`) || '{}');
            sonstiges[data.id] = roomFormSonstiges;
            localStorage.setItem(`groovelab_room_sonstiges_mappings_${schoolId}`, JSON.stringify(sonstiges));
          } catch (err) {
            console.error(err);
          }

          await fetchDashboardData();
        }
      }
      setEditingRoom(null);
      setRoomFormName('');
      setRoomFormEquipment([]);
      setRoomFormMaxTeachers(1);
      setRoomFormMaxStudents(1);
      setRoomFormQm(0);
      setRoomFormFloor('Allgemein');
      setRoomFormBuildingId('');
      setRoomFormUnsuitableInstruments([]);
      setRoomFormRoomInstruments([]);
      setRoomFormSonstiges('');
      setRoomsSubView('overview');
    } catch (e: any) {
      console.error('Room save error:', e);
      alert('Fehler beim Speichern des Raumes: ' + e.message);
    } finally {
      setRoomSaving(false);
    }
  };

  // ── Gebäude CRUD ──
  const openBuildingEditor = (building: any = null) => {
    if (building) {
      setEditingBuilding(building);
      setBuildingFormName(building.name || '');
      setBuildingFormAddress(building.address || '');
    } else {
      setEditingBuilding(null);
      setBuildingFormName('');
      setBuildingFormAddress('');
    }
    setShowBuildingModal(true);
  };

  const handleSaveBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingFormName.trim() || !schoolId) return;
    try {
      const payload = {
        name: buildingFormName.trim(),
        address: buildingFormAddress.trim(),
        school_id: schoolId
      };

      if (editingBuilding) {
        const { data, error } = await supabase
          .from('buildings')
          .update(payload)
          .eq('id', editingBuilding.id)
          .select()
          .single();
        if (error) throw error;
        setBuildings(prev => prev.map(b => b.id === editingBuilding.id ? data : b));
      } else {
        const { data, error } = await supabase
          .from('buildings')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setBuildings(prev => [...prev, data]);
      }
      setShowBuildingModal(false);
      setEditingBuilding(null);
      setBuildingFormName('');
      setBuildingFormAddress('');
    } catch (e: any) {
      console.error(e);
      alert('Fehler beim Speichern des Gebäudes: ' + e.message);
    }
  };

  const handleDeleteBuilding = async (buildingId: string) => {
    const hasRooms = rooms.some(r => r.building_id === buildingId);
    if (hasRooms) {
      alert('Dieses Gebäude enthält noch zugeordnete Räume. Bitte weise diese zuerst anderen Gebäuden zu oder lösche sie.');
      return;
    }
    if (!confirm('Möchtest du dieses Gebäude wirklich löschen?')) return;
    try {
      const { error } = await supabase.from('buildings').delete().eq('id', buildingId);
      if (error) throw error;
      setBuildings(prev => prev.filter(b => b.id !== buildingId));
      if (selectedBuildingId === buildingId) {
        setSelectedBuildingId('All');
      }
    } catch (e: any) {
      console.error(e);
      alert('Fehler beim Löschen des Gebäudes: ' + e.message);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    const hasSchedules = matrixAllocations.some(p => p.roomId === roomId);
    if (hasSchedules) {
      alert('Dieser Raum ist noch aktiven Stundenplänen zugewiesen. Bitte zuerst im Stundenplan-Board die Zuweisung entfernen.');
      return;
    }
    if (!window.confirm('Raum wirklich löschen?')) return;
    try {
      const { error } = await supabase.from('rooms').delete().eq('id', roomId);
      if (error) throw error;
      setRooms(prev => prev.filter(r => r.id !== roomId));
    } catch (err: any) {
      console.error('Error deleting room:', err);
      alert('Fehler beim Löschen des Raumes: ' + err.message);
    }
  };

  const handleBulkRoomImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCsvText.trim() || !schoolId) {
      alert('Bitte geben Sie Raumdaten ein.');
      return;
    }

    setRoomCsvSaving(true);
    const lines = roomCsvText.split('\n');
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Smarte-Auto-Zuweisung: If a floor is active/selected, assign that floor. Otherwise default to 'EG'
    const assignedFloor = roomFilterFloor !== 'All' ? roomFilterFloor : 'EG';
    const insertedRooms: any[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let parts = trimmed.split(';');
      if (parts.length < 2) {
        parts = trimmed.split(',');
      }

      const roomName = parts[0]?.trim();
      if (!roomName) {
        failCount++;
        errors.push(`Fehlerhafte Zeile: "${trimmed}" (Kein Raumname angegeben)`);
        continue;
      }

      // Skip common CSV headers
      const lowerName = roomName.toLowerCase();
      if (lowerName === 'name' || lowerName === 'raumname' || lowerName === 'raum' || lowerName === 'room' || lowerName === 'roomname') {
        continue;
      }

      let maxStudents = 1;
      if (parts[1]?.trim()) {
        const parsed = parseInt(parts[1].trim());
        if (!isNaN(parsed)) {
          maxStudents = Math.max(1, parsed);
        }
      }
      let qmSize = 0;
      if (parts[2]?.trim()) {
        const parsed = parseFloat(parts[2].trim());
        if (!isNaN(parsed)) {
          qmSize = Math.max(0, parsed);
        }
      }

      try {
        const insertPayload: any = {
          school_id: schoolId,
          name: roomName,
          max_students: maxStudents,
          max_teachers: 1,
          allowed_instruments: [],
          qm: qmSize,
          sort_order: rooms.length + successCount,
          is_campus_active: true, // Default to active for Campus
          is_groovelab_active: false, // Default to inactive for GrooveLab
          floor: assignedFloor,
          building_id: (selectedBuildingId !== 'All' && selectedBuildingId !== '') ? selectedBuildingId : null
        };

        let { data, error } = await supabase.from('rooms').insert(insertPayload).select().single();

        // Fallback: If floor column not found in schema cache, retry without it
        if (error && (error.message.includes("floor") || error.message.includes("column"))) {
          const insertPayloadWithoutFloor = { ...insertPayload };
          delete insertPayloadWithoutFloor.floor;
          const { data: retryData, error: retryError } = await supabase.from('rooms').insert(insertPayloadWithoutFloor).select().single();
          data = retryData;
          error = retryError;
        }

        if (error) throw error;
        if (data) {
          // Update local mapping fallback for the new room ID
          try {
            const mappings = JSON.parse(localStorage.getItem(`groovelab_room_floor_mappings_${schoolId}`) || '{}');
            mappings[data.id] = assignedFloor;
            localStorage.setItem(`groovelab_room_floor_mappings_${schoolId}`, JSON.stringify(mappings));
          } catch (err) {
            console.error(err);
          }

          insertedRooms.push({
            ...data,
            equipment: data.allowed_instruments || []
          });
          successCount++;
        }
      } catch (err: any) {
        failCount++;
        errors.push(`Fehler bei "${roomName}": ${err.message}`);
      }
    }

    if (insertedRooms.length > 0) {
      await fetchDashboardData();
    }

    setRoomCsvText('');
    setIsRoomCsvExpanded(false);
    setRoomCsvSaving(false);

    if (errors.length > 0) {
      alert(`Onboarding abgeschlossen:\n- ${successCount} Räume erfolgreich angelegt\n- ${failCount} Fehler\n\nFehlerdetails:\n${errors.join('\n')}`);
    } else {
      alert(`${successCount} Räume erfolgreich angelegt (Smarte-Auto-Zuweisung an Stockwerk: „${assignedFloor}“).`);
    }
  };

  const openRoomEditor = (room?: any) => {
    if (room) {
      setEditingRoom(room);
      setRoomFormName(room.name || '');
      setRoomFormEquipment(Array.isArray(room.equipment) ? room.equipment : []);
      setRoomFormMaxTeachers(room.max_teachers || 1);
      setRoomFormMaxStudents(room.max_students || 1);
      setRoomFormQm(room.qm || 0);
      setRoomFormIsCampusActive(room.is_campus_active !== false);
      setRoomFormIsGroovelabActive(!!room.is_groovelab_active);
      setRoomFormFloor((room.floor && room.floor !== 'Allgemein') ? room.floor : 'EG');

      const localBuilding = (() => {
        try {
          const map = JSON.parse(localStorage.getItem(`groovelab_room_building_mappings_${schoolId}`) || '{}');
          return map[room.id] || '';
        } catch { return ''; }
      })();
      setRoomFormBuildingId(room.building_id || localBuilding || '');

      const localUnsuitable = (() => {
        try {
          const map = JSON.parse(localStorage.getItem(`groovelab_room_unsuitable_mappings_${schoolId}`) || '{}');
          return map[room.id] || [];
        } catch { return []; }
      })();
      const localInstruments = (() => {
        try {
          const map = JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
          return map[room.id] || [];
        } catch { return []; }
      })();
      const localSonstiges = (() => {
        try {
          const map = JSON.parse(localStorage.getItem(`groovelab_room_sonstiges_mappings_${schoolId}`) || '{}');
          return map[room.id] || '';
        } catch { return ''; }
      })();

      setRoomFormUnsuitableInstruments(Array.isArray(room.unsuitable_instruments) ? room.unsuitable_instruments : localUnsuitable);
      setRoomFormRoomInstruments(Array.isArray(room.room_instruments) ? room.room_instruments : localInstruments);
      setRoomFormSonstiges(room.sonstiges || localSonstiges || '');
      setNewInstrumentName('');
      setNewInstrumentModel('');
    } else {
      setEditingRoom(null);
      setRoomFormName('');
      setRoomFormEquipment([]);
      setRoomFormMaxTeachers(1);
      setRoomFormMaxStudents(1);
      setRoomFormQm(0);
      setRoomFormIsCampusActive(true);
      setRoomFormIsGroovelabActive(false);
      setRoomFormFloor('EG');
      setRoomFormUnsuitableInstruments([]);
      setRoomFormRoomInstruments([]);
      setRoomFormSonstiges('');
      setNewInstrumentName('');
      setNewInstrumentModel('');
    }
    setRoomsSubView('settings');
  };

            // Compute per-room utilization from approved/pending allocations
          const getOccupiedDays = (roomId: string) =>
            [1,2,3,4,5].filter(d => matrixAllocations.some(p => p.roomId === roomId && p.dayOfWeek === d));
          
          const INSTRUMENT_COLOR: Record<string, string> = {
            Schlagzeug: '#ef4444', Piano: '#3b82f6', Gitarre: '#34a853',
            Gesang: '#8b5cf6', Geige: '#f59e0b', Querflöte: '#06b6d4',
            Saxophon: '#f97316', Bass: '#64748b', Keyboard: '#ec4899', Trompete: '#eab308',
          };

          // Local floor mappings fallback if schema cache is missing the floor column
          const localFloorMappings = (() => {
            try {
              const maps = JSON.parse(localStorage.getItem(`groovelab_room_floor_mappings_${schoolId}`) || '{}');
              let changed = false;
              Object.keys(maps).forEach(k => {
                if (maps[k] === 'Allgemein') {
                  maps[k] = 'EG';
                  changed = true;
                }
              });
              if (changed) {
                localStorage.setItem(`groovelab_room_floor_mappings_${schoolId}`, JSON.stringify(maps));
              }
              return maps;
            } catch {
              return {};
            }
          })();

          // Reference all rooms directly without deduplicating by name, so rooms with same names in different buildings are not hidden
          const uniqueRooms = rooms;

          // Rooms belonging to the selected building
          const buildingRooms = uniqueRooms.filter((r: any) => {
            if (selectedBuildingId === 'All') return true;
            if (selectedBuildingId === '') return !r.building_id;
            return r.building_id === selectedBuildingId;
          });

          // Filter logic for rooms matching search and selected floor & status
          const filteredRooms = buildingRooms.filter((r: any) => {
            const name = (r.name || '').toLowerCase();
            const query = roomSearchQuery.toLowerCase().trim();
            const matchesSearch = !query || name.includes(query);
            
            const fRaw = r.floor || localFloorMappings[r.id];
            const floorName = (!fRaw || fRaw === 'Allgemein') ? 'EG' : fRaw;
            const matchesFloor = roomFilterFloor === 'All' || floorName === roomFilterFloor;
            
            let matchesStatus = true;
            if (roomFilterStatus === 'campus') matchesStatus = r.is_campus_active !== false;
            else if (roomFilterStatus === 'groovelab') matchesStatus = r.is_groovelab_active;
            else if (roomFilterStatus === 'inactive') matchesStatus = (r.is_campus_active === false) && !r.is_groovelab_active;
            
            return matchesSearch && matchesFloor && matchesStatus;
          }).sort((a, b) => {
            const parsedA = parseRoomName(a.name || '');
            const parsedB = parseRoomName(b.name || '');
            const prefixCompare = parsedA.prefix.localeCompare(parsedB.prefix, 'de', { sensitivity: 'base' });
            if (prefixCompare !== 0) return prefixCompare;
            
            const numA = parsedA.number !== null ? parsedA.number : -1;
            const numB = parsedB.number !== null ? parsedB.number : -1;
            return numA - numB;
          });

          // Sort helper for floors: EG is standard top (100), OGs are positive, UGs are negative
          const getFloorWeight = (f: string) => {
            if (f === 'EG') return 100;
            const ogMatch = f.match(/^(\d+)\.\s*OG$/i);
            if (ogMatch) return parseInt(ogMatch[1]);
            const ugMatch = f.match(/^(\d+)\.\s*UG$/i);
            if (ugMatch) return -parseInt(ugMatch[1]);
            return -9999;
          };

          // Helper map for looking up building names
          const buildingMap = buildings.reduce((acc: Record<string, any>, curr: any) => {
            acc[curr.id] = curr;
            return acc;
          }, {});
          // Unique floors computed from all unique rooms plus addedFloors, always including 'EG'
          const allFloorsList = Array.from(new Set([
            'EG',
            ...buildingRooms.map(r => {
              const fRaw = r.floor || localFloorMappings[r.id];
              return (!fRaw || fRaw === 'Allgemein') ? 'EG' : fRaw;
            }), 
            ...addedFloors.filter((f: string) => f !== 'Allgemein')
          ])).sort((a, b) => getFloorWeight(b) - getFloorWeight(a));

          return (
            <>
              {roomsSubView !== 'settings' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', minWidth: 0, marginBottom: '24px' }}>
                
                {/* UNIFIED HEADER CARD (FULL WIDTH) */}
                <div className="google-card" style={{
                  width: '100%',
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '24px', 
                  padding: '24px',
                  borderRadius: '24px',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.01)',
                  minWidth: 0
                }}>
                  {/* TITLE BLOCK */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <DoorOpen size={22} style={{ color: '#0f172a' }} />
                      <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                        {roomsSubView === 'plan' ? `Belegungsplan (${uniqueRooms.length} Räume)` : `Raumboard (${uniqueRooms.length})`}
                      </h3>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {/* Segmented Control for Views */}
                      <div role="tablist" aria-label="Raumansicht auswählen" style={{ background: '#f1f5f9', borderRadius: '12px', padding: '3px', display: 'flex', gap: '2px', border: '1px solid rgba(0,0,0,0.02)' }}>
                        {(['overview', 'plan'] as const).map(v => {
                          const isActive = (roomsSubView as string) === v || (v === 'overview' && (roomsSubView as string) === 'settings');
                          return (
                            <button
                              key={v}
                              type="button"
                              role="tab"
                              aria-selected={isActive}
                              aria-controls={`panel-${v}`}
                              id={`tab-${v}`}
                              onClick={() => { setRoomsSubView(v); setEditingRoom(null); }}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '9px',
                                border: 'none',
                                background: isActive ? '#ffffff' : 'transparent',
                                color: isActive ? '#0f172a' : '#64748b',
                                fontWeight: isActive ? 800 : 600,
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: isActive ? '0 1px 3px rgba(15,23,42,0.08)' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              {v === 'overview' ? <Sliders size={13} /> : <Calendar size={13} />}
                              {v === 'overview' ? 'Übersicht' : 'Belegungsplan'}
                            </button>
                          );
                        })}
                      </div>

                      {roomsSubView === 'overview' && (
                        <>
                          <button
                            type="button"
                            aria-expanded={isRoomCsvExpanded}
                            aria-label="Sammel-Onboarding (CSV) ein- oder ausblenden"
                            onClick={() => setIsRoomCsvExpanded(!isRoomCsvExpanded)}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '6px', 
                              borderRadius: '12px', 
                              padding: '8px 16px', 
                              fontSize: '0.8rem', 
                              fontWeight: 800, 
                              background: isRoomCsvExpanded ? '#f1f5f9' : '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: '#334155',
                              cursor: 'pointer',
                              fontFamily: 'Urbanist',
                              transition: 'all 0.2s'
                            }}
                          >
                            <FileSpreadsheet size={14} style={{ color: '#475569' }} />
                            <span>Sammel-Onboarding (CSV)</span>
                            {isRoomCsvExpanded ? <ChevronDown size={14} style={{ transform: 'rotate(180deg)', color: '#64748b' }} /> : <ChevronDown size={14} style={{ color: '#64748b' }} />}
                          </button>

                          <button
                            type="button"
                            aria-label="Neuen Raum anlegen"
                            onClick={() => openRoomEditor()}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '6px', 
                              borderRadius: '12px', 
                              padding: '8px 16px', 
                              fontSize: '0.8rem', 
                              fontWeight: 800, 
                              background: '#ea4335',
                              color: '#ffffff',
                              border: 'none',
                              cursor: 'pointer',
                              fontFamily: 'Urbanist',
                              boxShadow: '0 4px 10px rgba(234,67,53,0.15)',
                              transition: 'all 0.2s'
                            }}
                          >
                            <Plus size={14} style={{ color: '#ffffff' }} />
                            <span>Raum anlegen</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* CSV BOX FOR ROOMS */}
                  {roomsSubView === 'overview' && isRoomCsvExpanded && (
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 900, fontFamily: 'Urbanist' }}>
                          Sammel-Onboarding (Räume)
                        </strong>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'Inter' }}>
                          Format pro Zeile: <code>Raumname; Max Schüler (optional); Größe in m² (optional)</code>
                        </span>
                      </div>

                      {/* smarte-auto-zuweisung indicator */}
                      {((roomFilterFloor && roomFilterFloor !== 'All') || (selectedBuildingId && selectedBuildingId !== 'All')) && (
                        <div style={{
                          background: 'rgba(52, 168, 83, 0.03)',
                          border: '1.5px solid rgba(52, 168, 83, 0.12)',
                          borderRadius: '16px',
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          marginTop: '2px',
                          marginBottom: '2px',
                          flexWrap: 'wrap'
                        }}>
                          <span style={{ fontSize: '0.68rem', color: '#34a853', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Urbanist', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Sparkles size={11} style={{ color: '#34a853' }} /> smarte-auto-zuweisung:
                          </span>
                          
                          {roomFilterFloor && roomFilterFloor !== 'All' && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              background: '#ffffff',
                              border: '1.5px solid #cbd5e1',
                              padding: '4px 12px',
                              borderRadius: '100px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                            }}>
                              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Layers size={13} style={{ color: '#0f172a' }} /> {roomFilterFloor}
                              </span>
                              <span style={{ fontSize: '0.6rem', fontWeight: 900, background: '#f1f5f9', color: '#64748b', padding: '1px 6px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Stockwerk
                              </span>
                            </div>
                          )}

                          {selectedBuildingId && selectedBuildingId !== 'All' && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              background: '#ffffff',
                              border: '1.5px solid #cbd5e1',
                              padding: '4px 12px',
                              borderRadius: '100px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                            }}>
                              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Building2 size={13} style={{ color: '#0f172a' }} /> {buildingMap[selectedBuildingId]?.name || 'Ohne Zuordnung'}
                              </span>
                              <span style={{ fontSize: '0.6rem', fontWeight: 900, background: '#fce8e6', color: '#ea4335', padding: '1px 6px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Gebäude
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <form onSubmit={handleBulkRoomImport} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <textarea
                          aria-label="CSV-Raumdaten eingeben"
                          value={roomCsvText}
                          onChange={e => setRoomCsvText(e.target.value)}
                          placeholder="z.B.&#10;Klavierzimmer;2;12&#10;Schlagzeugstudio;1;18&#10;Theorieraum;15;30"
                          rows={5}
                          style={{ width: '100%', padding: '8px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'monospace', outline: 'none', background: '#ffffff', resize: 'vertical' }}
                        />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            aria-label="CSV-Import abbrechen"
                            onClick={() => setIsRoomCsvExpanded(false)}
                            style={{ padding: '8px 16px', borderRadius: '10px', border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#64748b', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}
                          >
                            Abbrechen
                          </button>
                          <button
                            type="submit"
                            aria-label="Räume importieren"
                            disabled={roomCsvSaving || !roomCsvText.trim()}
                            style={{ padding: '8px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #0b57d0 0%, #1a73e8 100%)', color: '#ffffff', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', opacity: roomCsvSaving || !roomCsvText.trim() ? 0.6 : 1 }}
                          >
                            {roomCsvSaving ? 'Wird importiert...' : 'Importieren'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* KPI ROW */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                    {/* Gebäude/Standorte */}
                    <div style={{
                      background: 'linear-gradient(135deg, #ea4335 0%, #c5221f 100%)', color: 'white',
                      borderRadius: '16px', padding: '12px 16px',
                      display: 'flex', flexDirection: 'column', gap: '4px',
                      boxShadow: '0 8px 20px -5px rgba(234, 67, 53, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      transition: 'all 0.2s ease'
                    }} className="hover-scale">
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Urbanist' }}>Gebäude/Standorte</span>
                      <strong style={{ fontSize: '1.5rem', fontWeight: 950, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', lineHeight: 1 }}>{buildings.length}</strong>
                    </div>

                    {/* Räume Gesamt */}
                    <div style={{
                      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white',
                      borderRadius: '16px', padding: '12px 16px',
                      display: 'flex', flexDirection: 'column', gap: '4px',
                      boxShadow: '0 8px 20px -5px rgba(99, 102, 241, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      transition: 'all 0.2s ease'
                    }} className="hover-scale">
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Urbanist' }}>Räume Gesamt</span>
                      <strong style={{ fontSize: '1.5rem', fontWeight: 950, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', lineHeight: 1 }}>{rooms.length}</strong>
                    </div>

                    {/* Campus Aktiv */}
                    <div style={{
                      background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)', color: 'white',
                      borderRadius: '16px', padding: '12px 16px',
                      display: 'flex', flexDirection: 'column', gap: '4px',
                      boxShadow: '0 8px 20px -5px rgba(52, 168, 83, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      transition: 'all 0.2s ease'
                    }} className="hover-scale">
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Urbanist' }}>Campus Aktiv</span>
                      <strong style={{ fontSize: '1.5rem', fontWeight: 950, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', lineHeight: 1 }}>{rooms.filter(r => r.is_campus_active !== false).length}</strong>
                    </div>

                    {/* GrooveLab Aktiv */}
                    <div style={{
                      background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)', color: '#0f172a',
                      borderRadius: '16px', padding: '12px 16px',
                      display: 'flex', flexDirection: 'column', gap: '4px',
                      boxShadow: '0 8px 20px -5px rgba(234, 179, 8, 0.35)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      transition: 'all 0.2s ease'
                    }} className="hover-scale">
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Urbanist' }}>GrooveLab Aktiv</span>
                      <strong style={{ fontSize: '1.5rem', fontWeight: 950, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', lineHeight: 1 }}>{rooms.filter(r => r.is_groovelab_active).length}</strong>
                    </div>
                  </div>

                  {/* COMPACT 1-LINE ROOM UTILIZATION TICKER (DESKTOP-ONLY, HIDDEN ON SMARTPHONES <= 768px) */}
                  <div 
                    className="hidden md:flex" 
                    style={{
                      alignItems: 'center',
                      gap: '12px',
                      padding: '8px 14px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '0.74rem',
                      color: '#475569',
                      fontWeight: 700,
                      overflowX: 'auto',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#0f172a', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <Activity size={13} style={{ color: '#475569' }} /> Auslastung:
                    </span>
                    {(() => {
                      const totalSlots = matrixAllocations.filter(p => p.roomId).length;
                      const roomEntries = (rooms || []).slice(0, 5).map((rm) => {
                        const count = matrixAllocations.filter(p => p.roomId === rm.id).length;
                        const pct = totalSlots > 0 ? Math.min(100, Math.round((count / Math.max(1, (totalSlots / Math.max(1, rooms.length)))) * 65)) : 0;
                        return { name: rm.name, pct: Math.max(15, pct) };
                      });
                      const avgPct = roomEntries.length > 0 ? Math.round(roomEntries.reduce((a, b) => a + b.pct, 0) / roomEntries.length) : 0;

                      return (
                        <>
                          {roomEntries.map((re, idx) => (
                            <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#ffffff', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '6px' }}>
                              <span>{re.name}:</span>
                              <strong style={{ color: re.pct > 75 ? '#dc2626' : re.pct > 40 ? '#16a34a' : '#2563eb' }}>{re.pct}%</strong>
                            </span>
                          ))}
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e0f2fe', border: '1px solid #7dd3fc', color: '#0369a1', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                            <span>Gesamt:</span>
                            <strong>{roomEntries.length > 0 ? avgPct : 0}%</strong>
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {roomsSubView === 'plan' ? (
                  /* ── PLAN VIEW (FULL WIDTH, NO SIDEBARS) ── */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', minWidth: 0 }}>
                    
                    {/* HORIZONTAL BUILDING TABS FOR PLAN VIEW */}
                    <div role="tablist" aria-label="Gebäude filtern" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', borderBottom: '1.5px solid #e2e8f0', width: '100%' }}>
                      {/* Alle Gebäude tab */}
                      <button
                        type="button"
                        role="tab"
                        aria-selected={selectedBuildingId === 'All'}
                        aria-label={`Alle Gebäude (${uniqueRooms.length}) anzeigen`}
                        onClick={() => { setSelectedBuildingId('All'); }}
                        style={{
                          padding: '10px 18px',
                          borderRadius: '12px',
                          border: 'none',
                          background: selectedBuildingId === 'All' ? '#ea4335' : '#f1f5f9',
                          color: selectedBuildingId === 'All' ? '#ffffff' : '#475569',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Building2 size={15} style={{ color: selectedBuildingId === 'All' ? '#ffffff' : '#475569' }} />
                        <span>Alle Gebäude ({uniqueRooms.length})</span>
                      </button>
                      {/* Ohne Zuordnung tab */}
                      <button
                        type="button"
                        role="tab"
                        aria-selected={selectedBuildingId === ''}
                        aria-label={`Räume ohne Zuordnung (${uniqueRooms.filter(r => !r.building_id).length}) anzeigen`}
                        onClick={() => { setSelectedBuildingId(''); }}
                        style={{
                          padding: '10px 18px',
                          borderRadius: '12px',
                          border: 'none',
                          background: selectedBuildingId === '' ? '#ea4335' : '#f1f5f9',
                          color: selectedBuildingId === '' ? '#ffffff' : '#475569',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <HelpCircle size={15} style={{ color: selectedBuildingId === '' ? '#ffffff' : '#475569' }} />
                        <span>Ohne Zuordnung ({uniqueRooms.filter(r => !r.building_id).length})</span>
                      </button>
                      {/* Specific buildings tabs */}
                      {buildings.map(b => {
                        const count = uniqueRooms.filter(r => r.building_id === b.id).length;
                        const isSelected = selectedBuildingId === b.id;
                        return (
                          <button
                            key={b.id}
                            type="button"
                            role="tab"
                            aria-selected={isSelected}
                            aria-label={`Gebäude ${b.name} (${count} Räume) anzeigen`}
                            onClick={() => { setSelectedBuildingId(b.id); }}
                            style={{
                              padding: '10px 18px',
                              borderRadius: '12px',
                              border: 'none',
                              background: isSelected ? '#ea4335' : '#f1f5f9',
                              color: isSelected ? '#ffffff' : '#475569',
                              fontWeight: 800,
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              transition: 'all 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <Building size={15} style={{ color: isSelected ? '#ffffff' : '#475569' }} />
                            <span>{b.name} ({count})</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* weekly plan grid (full width) */}
                    <div id="belegungsplan-table-container" style={{ background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '20px', overflowX: 'auto', width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Calendar size={15} style={{ color: '#0f172a' }} />
                              Wöchentlicher Belegungsplan
                            </h4>
                            <p className="no-pdf" style={{ margin: '3px 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>Lese-Ansicht · Zum Bearbeiten → Campus › Stundenpläne</p>
                          </div>
                          {roomSearchQuery && (
                            <div className="no-pdf" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fee2e2', border: '1px solid #fca5a5', padding: '4px 10px', borderRadius: '100px' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#991b1b' }}>
                                Gefiltert nach: <strong>„{roomSearchQuery}“</strong>
                              </span>
                              <button
                                type="button"
                                aria-label="Raumfilter aufheben und alle Räume anzeigen"
                                onClick={() => setRoomSearchQuery('')}
                                style={{
                                  background: '#ffffff',
                                  border: '1px solid #f87171',
                                  color: '#dc2626',
                                  borderRadius: '100px',
                                  padding: '1px 8px',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  cursor: 'pointer'
                                }}
                              >
                                Alle Räume anzeigen ×
                              </button>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          aria-label="Raumbelegungsplan als PDF exportieren"
                          onClick={handleExportPlanPDF}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            borderRadius: '10px',
                            padding: '8px 14px',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            background: '#fce8e6',
                            color: '#ea4335',
                            border: '1px solid #f9d2ce',
                            cursor: 'pointer',
                            fontFamily: 'Urbanist',
                            transition: 'all 0.2s'
                          }}
                          className="hover-scale no-pdf"
                        >
                          <Download size={14} style={{ color: '#ea4335' }} />
                          <span>PDF Export</span>
                        </button>
                      </div>
                      {filteredRooms.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '32px', fontWeight: 700 }}>Keine Räume gefunden.</p>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: '600px' }}>
                          <colgroup>
                            <col style={{ width: '130px' }} />
                            {[1,2,3,4,5].map(d => <col key={d} />)}
                          </colgroup>
                          <thead>
                            <tr style={{ borderBottom: '2px solid #cbd5e1' }}>
                              <th style={{ padding: '8px 10px', fontSize: '0.68rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'left' }}>Raum</th>
                              {[1,2,3,4,5].map(d => (
                                <th key={d} style={{ padding: '8px 10px', fontSize: '0.73rem', fontWeight: 900, color: '#334155', textTransform: 'uppercase', textAlign: 'left' }}>
                                  {['','Montag','Dienstag','Mittwoch','Donnerstag','Freitag'][d]}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredRooms.map((room: any, rIdx: number) => {
                              return (
                                <tr key={room.id} style={{ borderBottom: rIdx < filteredRooms.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                  <td style={{ padding: '10px 8px', verticalAlign: 'top' }}>
                                    <strong style={{ fontSize: '0.78rem', color: '#0f172a', fontWeight: 800, display: 'block' }}>{room.name}</strong>
                                  </td>
                                  {[1,2,3,4,5].map(dayNum => {
                                    const cellPlans = matrixAllocations.filter(p => p.roomId === room.id && p.dayOfWeek === dayNum);
                                    const cellPendingBookings = (pendingBookings || []).filter((b: any) => {
                                      const isMatchingRoom = b.room_id === room.id || (b.rooms && b.rooms.name === room.name);
                                      if (!isMatchingRoom || !b.date) return false;
                                      const bDate = new Date(b.date);
                                      const bDay = bDate.getDay();
                                      const matchDay = bDay === 0 ? 7 : bDay;
                                      return matchDay === dayNum;
                                    });

                                    return (
                                      <td key={dayNum} style={{ padding: '6px', verticalAlign: 'top' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minHeight: '50px' }}>
                                          {cellPlans.map(plan => {
                                            const isGroovelab = plan.teacherId === 'groovelab';
                                            const { avatarBg: baseBg, avatarColor: baseColor } = getAlphabeticalUniColor(plan.teacherName || 'Allgemein');
                                            const bg = isGroovelab ? '#fefce8' : baseBg;
                                            const color = isGroovelab ? '#facc15' : baseColor;
                                            const hasConflict = cellPlans.some(other => other.id !== plan.id && checkTimeOverlap(plan.startTime, plan.endTime, other.startTime, other.endTime));
                                            return (
                                              <div
                                                key={plan.id}
                                                onClick={() => setSelectedDayPlan(plan)}
                                                style={{ 
                                                  background: hasConflict ? '#fef2f2' : bg, 
                                                  border: hasConflict ? '1.5px solid #ef4444' : `1px solid ${color}30`, 
                                                  borderLeft: hasConflict ? '5px solid #ef4444' : `4px solid ${color}`, 
                                                  borderRadius: '9px', 
                                                  padding: '6px 8px', 
                                                  cursor: 'pointer', 
                                                  display: 'flex', 
                                                  flexDirection: 'column', 
                                                  gap: '2px',
                                                  boxShadow: hasConflict ? '0 0 8px rgba(239,68,68,0.15)' : 'none',
                                                  animation: hasConflict ? 'pulse 2s infinite' : 'none'
                                                }}
                                                title={hasConflict ? 'Zeitliche Überschneidung in diesem Raum!' : undefined}
                                              >
                                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0f172a' }}>{getPlanDisplayName(plan)}</span>
                                                <span style={{ fontSize: '0.58rem', fontWeight: 700, color }}>{plan.instrument}</span>
                                                <span style={{ fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 900, color: '#475569', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                  <Clock size={10} />
                                                  {plan.startTime}–{plan.endTime}
                                                </span>
                                              </div>
                                            );
                                          })}

                                          {cellPendingBookings.map((b: any) => {
                                            const teacherName = b.profiles ? `${b.profiles.first_name || ''} ${b.profiles.last_name || ''}`.trim() : 'Lehrkraft';
                                            const bStart = (b.start_time || '').substring(0, 5);
                                            const bEnd = (b.end_time || '').substring(0, 5);
                                            const dateObj = new Date(b.date);
                                            const dateFormatted = dateObj.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
                                            const hasConflict = cellPlans.some(other => checkTimeOverlap(bStart, bEnd, (other.startTime || '').substring(0, 5), (other.endTime || '').substring(0, 5)));

                                            return (
                                              <div
                                                key={`pending-b-${b.id}`}
                                                style={{
                                                  background: hasConflict ? '#fef2f2' : '#fffbeb',
                                                  border: hasConflict ? '1.5px dashed #ef4444' : '1.5px dashed #f59e0b',
                                                  borderLeft: hasConflict ? '4px solid #ef4444' : '4px solid #f59e0b',
                                                  borderRadius: '9px',
                                                  padding: '6px 8px',
                                                  display: 'flex',
                                                  flexDirection: 'column',
                                                  gap: '3px',
                                                  boxShadow: hasConflict ? '0 0 8px rgba(239,68,68,0.2)' : '0 2px 6px rgba(245, 158, 11, 0.12)',
                                                  animation: hasConflict ? 'pulse 2s infinite' : 'none'
                                                }}
                                                title={hasConflict ? 'Zeitliche Überschneidung mit einem regulären Stundenplan!' : 'Vorläufige Raumbuchung (Freigabe erforderlich)'}
                                              >
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                                                  <span style={{ fontSize: '0.60rem', fontWeight: 900, color: hasConflict ? '#b91c1c' : '#b45309', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                    <Clock size={10} style={{ color: hasConflict ? '#b91c1c' : '#b45309' }} /> Vorläufig
                                                  </span>
                                                  <span style={{ fontSize: '0.58rem', fontWeight: 800, background: hasConflict ? '#fee2e2' : '#fef3c7', color: hasConflict ? '#ef4444' : '#92400e', padding: '1px 5px', borderRadius: '4px' }}>
                                                    {dateFormatted}
                                                  </span>
                                                </div>
                                                <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                                                  {b.title || 'Unterricht'}
                                                </span>
                                                <span style={{ fontSize: '0.60rem', color: '#475569', fontWeight: 600 }}>
                                                  {teacherName}
                                                </span>
                                                <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 900, color: hasConflict ? '#ef4444' : '#b45309', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                  <Clock size={10} />
                                                  {bStart}–{bEnd}
                                                </span>
                                                {hasConflict && (
                                                  <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#dc2626', background: '#fee2e2', padding: '2px 4px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                    <AlertTriangle size={10} style={{ color: '#dc2626' }} /> Konflikt mit Plan!
                                                  </span>
                                                )}
                                                {(handleConfirmBooking || handleRejectBooking) && (
                                                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                                    {handleConfirmBooking && (
                                                      <button
                                                        type="button"
                                                        aria-label={`Vorläufige Buchung von ${teacherName} jetzt freigeben`}
                                                        onClick={() => handleConfirmBooking(b.id)}
                                                        style={{
                                                          background: '#34a853',
                                                          color: '#ffffff',
                                                          border: 'none',
                                                          borderRadius: '5px',
                                                          padding: '3px 6px',
                                                          fontSize: '0.62rem',
                                                          fontWeight: 800,
                                                          cursor: 'pointer',
                                                          flex: 1
                                                        }}
                                                      >
                                                        Bestätigen
                                                      </button>
                                                    )}
                                                    {handleRejectBooking && (
                                                      <button
                                                        type="button"
                                                        aria-label={`Vorläufige Buchung von ${teacherName} ablehnen`}
                                                        onClick={() => handleRejectBooking(b.id)}
                                                        style={{
                                                          background: 'rgba(239, 68, 68, 0.1)',
                                                          color: '#ef4444',
                                                          border: '1px solid rgba(239, 68, 68, 0.2)',
                                                          borderRadius: '5px',
                                                          padding: '3px 6px',
                                                          fontSize: '0.62rem',
                                                          fontWeight: 800,
                                                          cursor: 'pointer',
                                                          flex: 1
                                                        }}
                                                      >
                                                        Ablehnen
                                                      </button>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}

                                          {cellPlans.length === 0 && cellPendingBookings.length === 0 && (
                                            <div style={{ height: '40px', borderRadius: '8px', background: '#ffffff', border: '1px dashed #e2e8f0' }} />
                                          )}
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ── OVERVIEW VIEW (3 COLUMNS: Buildings, Center list, Floor Sidebar) ── */
                  <div style={{ display: 'flex', gap: '24px', width: '100%', alignItems: 'start' }}>
                    
                    {/* COLUMN 1: BUILDINGS SIDEBAR */}
                    <div className="google-card" style={{
                      width: '340px',
                      flexShrink: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '20px',
                      padding: '24px',
                      borderRadius: '24px',
                      border: '1.5px solid #cbd5e1',
                      background: '#ffffff',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.01)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <School size={20} style={{ color: '#0f172a' }} />
                          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                            Gebäude
                          </h3>
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.45, fontFamily: 'Inter' }}>
                        Gebäude verwalten und Räume per Drag & Drop zuweisen.
                      </p>

                      <button
                        onClick={() => openBuildingEditor()}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          borderRadius: '12px',
                          padding: '8px 16px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          background: '#fce8e6',
                          color: '#ea4335',
                          border: '1px solid #f9d2ce',
                          cursor: 'pointer',
                          fontFamily: 'Urbanist',
                          transition: 'all 0.2s'
                        }}
                        className="hover-scale"
                      >
                        <Plus size={14} style={{ color: '#ea4335' }} />
                        <span>Gebäude anlegen</span>
                      </button>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
                        {/* Alle Gebäude card */}
                        <div
                          onClick={() => { setSelectedBuildingId('All'); }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            borderRadius: '16px',
                            border: selectedBuildingId === 'All' ? '1.5px solid #ea4335' : '1.5px solid #f1f5f9',
                            background: selectedBuildingId === 'All' ? '#fce8e6' : '#ffffff',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f1f5f9', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Building2 size={18} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>Alle Gebäude</span>
                              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Standortübersicht</span>
                            </div>
                          </div>
                          <span style={{ padding: '4px 10px', borderRadius: '10px', background: selectedBuildingId === 'All' ? '#fce8e6' : '#f1f5f9', color: selectedBuildingId === 'All' ? '#ea4335' : '#64748b', fontSize: '0.68rem', fontWeight: 800 }}>
                            {uniqueRooms.length}
                          </span>
                        </div>

                        {/* Ohne Zuordnung card */}
                        {(() => {
                          const isNoBuildingHovered = dragHoveredBuildingId === 'None';
                          return (
                            <div
                              onClick={() => { setSelectedBuildingId(''); }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                                setDragHoveredBuildingId('None');
                              }}
                              onDragLeave={() => setDragHoveredBuildingId(null)}
                              onDrop={async (e) => {
                                const roomId = e.dataTransfer.getData("roomId");
                                if (roomId) {
                                  const previousRooms = rooms;
                                  setRooms(prev => prev.map(r => r.id === roomId ? { ...r, building_id: null } : r));
                                  try {
                                    const bMappings = JSON.parse(localStorage.getItem(`groovelab_room_building_mappings_${schoolId}`) || '{}');
                                    bMappings[roomId] = null;
                                    localStorage.setItem(`groovelab_room_building_mappings_${schoolId}`, JSON.stringify(bMappings));
                                  } catch (err) { console.error(err); }
                                  const { error } = await supabase.from('rooms').update({ building_id: null }).eq('id', roomId);
                                  if (error) {
                                    setRooms(previousRooms);
                                    alert("Fehler beim Entfernen des Gebäudes: " + error.message);
                                  }
                                }
                                setDragHoveredBuildingId(null);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px 16px',
                                borderRadius: '16px',
                                border: isNoBuildingHovered
                                  ? '2px dashed #ea4335'
                                  : selectedBuildingId === ''
                                    ? '1.5px solid #ea4335'
                                    : '1.5px solid #f1f5f9',
                                background: isNoBuildingHovered
                                  ? '#fce8e6'
                                  : selectedBuildingId === ''
                                    ? '#fce8e6'
                                    : '#ffffff',
                                cursor: 'pointer',
                                transform: isNoBuildingHovered ? 'scale(1.02)' : 'scale(1)',
                                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <HelpCircle size={18} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>Ohne Zuordnung</span>
                                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Kein Gebäude</span>
                                </div>
                              </div>
                              <span style={{ padding: '4px 10px', borderRadius: '10px', background: selectedBuildingId === '' ? '#fce8e6' : '#f1f5f9', color: selectedBuildingId === '' ? '#ea4335' : '#475569', fontSize: '0.68rem', fontWeight: 800 }}>
                                {uniqueRooms.filter(r => !r.building_id).length}
                              </span>
                            </div>
                          );
                        })()}

                        {/* List of user buildings */}
                        {buildings.map(b => {
                          const isActive = selectedBuildingId === b.id;
                          const isHovered = dragHoveredBuildingId === b.id;
                          const roomCount = uniqueRooms.filter(r => r.building_id === b.id).length;
                          return (
                            <div
                              key={b.id}
                              onClick={() => { setSelectedBuildingId(b.id); }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                                setDragHoveredBuildingId(b.id);
                              }}
                              onDragLeave={() => setDragHoveredBuildingId(null)}
                              onDrop={async (e) => {
                                const roomId = e.dataTransfer.getData("roomId");
                                if (roomId) {
                                  const previousRooms = rooms;
                                  setRooms(prev => prev.map(r => r.id === roomId ? { ...r, building_id: b.id } : r));
                                  try {
                                    const bMappings = JSON.parse(localStorage.getItem(`groovelab_room_building_mappings_${schoolId}`) || '{}');
                                    bMappings[roomId] = b.id;
                                    localStorage.setItem(`groovelab_room_building_mappings_${schoolId}`, JSON.stringify(bMappings));
                                  } catch (err) { console.error(err); }
                                  const { error } = await supabase.from('rooms').update({ building_id: b.id }).eq('id', roomId);
                                  if (error) {
                                    setRooms(previousRooms);
                                    alert("Fehler beim Zuweisen des Gebäudes: " + error.message);
                                  }
                                }
                                setDragHoveredBuildingId(null);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px 16px',
                                borderRadius: '16px',
                                border: isHovered
                                  ? '2px dashed #ea4335'
                                  : isActive
                                    ? '1.5px solid #ea4335'
                                    : '1.5px solid #f1f5f9',
                                background: isHovered
                                  ? '#fce8e6'
                                  : isActive
                                    ? '#fce8e6'
                                    : '#ffffff',
                                cursor: 'pointer',
                                transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                              }}
                              role="button"
                              tabIndex={0}
                              aria-label={`Gebäude ${b.name} auswählen`}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setSelectedBuildingId(b.id);
                                }
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f1f5f9', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <Building size={18} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {b.name}
                                  </span>
                                  {b.address && (
                                    <span style={{ fontSize: '0.65rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                      <MapPin size={11} style={{ color: '#64748b' }} /> {b.address}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                <span style={{ padding: '4px 10px', borderRadius: '10px', background: isActive ? '#fce8e6' : '#f1f5f9', color: isActive ? '#ea4335' : '#64748b', fontSize: '0.68rem', fontWeight: 800 }}>
                                  {roomCount}
                                </span>
                                <button
                                  type="button"
                                  aria-label={`Gebäude ${b.name} bearbeiten`}
                                  onClick={(e) => { e.stopPropagation(); openBuildingEditor(b); }}
                                  style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  <Edit2 size={13} style={{ color: '#475569' }} />
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Gebäude ${b.name} löschen`}
                                  onClick={(e) => { e.stopPropagation(); handleDeleteBuilding(b.id); }}
                                  style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  <Trash2 size={13} style={{ color: '#ef4444' }} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* COLUMN 2: CENTER ROOMS LIST OVERVIEW */}
                    <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
                      {/* FILTER & SEARCH */}
                      <div style={{ 
                        display: 'flex', 
                        gap: '12px', 
                        background: '#f8fafc', 
                        padding: '8px', 
                        borderRadius: '16px',
                        border: '1px solid #cbd5e1',
                        flexWrap: 'wrap',
                        alignItems: 'center'
                      }}>
                        <div style={{ flex: 1.5, minWidth: '200px', position: 'relative' }}>
                          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                          <input 
                            type="text" 
                            placeholder="Raum suchen..." 
                            aria-label="Raum suchen"
                            value={roomSearchQuery}
                            onChange={(e) => setRoomSearchQuery(e.target.value)}
                            style={{
                              width: '100%',
                              boxSizing: 'border-box',
                              padding: '8px 12px 8px 34px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.78rem',
                              outline: 'none',
                              background: 'white',
                              fontWeight: 700
                            }}
                          />
                        </div>

                        <div style={{ flex: 1, minWidth: '130px' }}>
                          <select 
                            value={roomFilterFloor}
                            aria-label="Nach Stockwerk filtern"
                            onChange={(e) => setRoomFilterFloor(e.target.value)}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', outline: 'none', background: 'white', fontWeight: 700 }}
                          >
                            <option value="All">Alle Stockwerke</option>
                            {allFloorsList.map(fl => (
                              <option key={fl} value={fl}>{fl}</option>
                            ))}
                          </select>
                        </div>

                        <div style={{ flex: 1, minWidth: '130px' }}>
                          <select
                            value={roomFilterStatus}
                            aria-label="Nach Raumstatus oder Modul filtern"
                            onChange={(e) => setRoomFilterStatus(e.target.value as any)}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', outline: 'none', background: 'white', fontWeight: 700 }}
                          >
                            <option value="all">Alle Räume</option>
                            <option value="campus">Campus</option>
                            <option value="groovelab">Groovelab</option>
                            <option value="inactive">inaktiv</option>
                          </select>
                        </div>

                        {onOpenFacilityLogModal && (
                          <button
                            type="button"
                            onClick={onOpenFacilityLogModal}
                            aria-label="Mängel-Logbuch öffnen"
                            style={{
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '8px',
                              padding: '8px 12px',
                              fontSize: '0.78rem',
                              fontWeight: 750,
                              color: '#334155',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              flexShrink: 0
                            }}
                          >
                            <Wrench size={13} style={{ color: '#dc2626' }} />
                            <span>Mängel-Logbuch</span>
                          </button>
                        )}
                      </div>

                      {/* Rooms List Board */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '550px', width: '100%' }}>
                        {filteredRooms.length === 0 ? (
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '48px 24px',
                            background: '#ffffff',
                            borderRadius: '24px',
                            border: '1.5px dashed #cbd5e1',
                            textAlign: 'center',
                            gap: '14px',
                            marginTop: '10px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                              <DoorOpen size={48} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                                Keine Räume gefunden
                              </h4>
                              <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', maxWidth: '280px', lineHeight: 1.4 }}>
                                Erstelle einen neuen Raum oder passe deine Filter an.
                              </p>
                            </div>
                            <button
                              onClick={() => openRoomEditor()}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                borderRadius: '10px',
                                padding: '8px 16px',
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                background: '#ea4335',
                                color: '#ffffff',
                                border: 'none',
                                cursor: 'pointer',
                                fontFamily: 'Urbanist',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 10px rgba(234,67,53,0.15)'
                              }}
                              className="hover-scale"
                            >
                              <Plus size={14} style={{ color: '#ffffff' }} />
                              <span>Raum anlegen</span>
                            </button>
                          </div>
                        ) : (
                          filteredRooms.map((room: any) => {
                            const initials = (room.name || 'RM').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                            const rColor = getAlphabeticalColor(room.name || 'R');
                            const equipment: string[] = Array.isArray(room.equipment) ? room.equipment : [];
                            const unsuitableInsts: string[] = Array.isArray(room.unsuitable_instruments) 
                              ? room.unsuitable_instruments 
                              : (() => {
                                  try {
                                    const map = JSON.parse(localStorage.getItem(`groovelab_room_unsuitable_mappings_${schoolId}`) || '{}');
                                    return map[room.id] || [];
                                  } catch { return []; }
                                })();

                            return (
                              <div 
                                key={room.id} 
                                draggable={true}
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("roomId", room.id);
                                  e.dataTransfer.effectAllowed = "move";
                                }}
                                style={{ 
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '12px',
                                  padding: '16px',
                                  borderRadius: '16px',
                                  background: '#ffffff',
                                  border: '1px solid #e2e8f0',
                                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                                  transition: 'all 0.25s ease',
                                  cursor: 'grab',
                                  width: '100%',
                                  boxSizing: 'border-box'
                                }}
                                className="hover-scale"
                              >
                                {/* Top Row: Avatar, Room Info, Specs, Delete */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px' }}>
                                  <div 
                                    onClick={() => openRoomEditor(room)}
                                    style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: '12px', 
                                      cursor: 'pointer',
                                      minWidth: 0,
                                      flex: 1
                                    }}
                                  >
                                    <div style={{
                                      width: '38px',
                                      height: '38px',
                                      borderRadius: '50%',
                                      background: rColor.avatarBg,
                                      color: rColor.avatarColor,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.8rem',
                                      fontWeight: 900,
                                      fontFamily: 'Urbanist',
                                      flexShrink: 0
                                    }}>
                                      {initials}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{room.name}</span>
                                        {(() => {
                                          const roomOpenIssues = roomIssues.filter((i: any) => (!i.is_completed && !i.is_acknowledged) && (i.room_id === room.id || i.room_id === room.name || (room.name && i.room_id && room.name.toLowerCase().includes(i.room_id.toLowerCase()))));
                                          if (roomOpenIssues.length === 0) return null;
                                          return (
                                            <span 
                                              role={onOpenFacilityLogModal ? 'button' : undefined}
                                              tabIndex={onOpenFacilityLogModal ? 0 : undefined}
                                              onClick={onOpenFacilityLogModal ? (e) => { e.stopPropagation(); onOpenFacilityLogModal(); } : undefined}
                                              onKeyDown={onOpenFacilityLogModal ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onOpenFacilityLogModal(); } } : undefined}
                                              title={onOpenFacilityLogModal ? "Klicken, um Mängel im Logbuch zu öffnen" : undefined}
                                              style={{ 
                                                fontSize: '0.62rem', 
                                                color: '#dc2626', 
                                                background: '#fee2e2', 
                                                border: '1px solid #fca5a5', 
                                                borderRadius: '6px', 
                                                padding: '1px 6px', 
                                                fontWeight: 800, 
                                                display: 'inline-flex', 
                                                alignItems: 'center', 
                                                gap: '3px',
                                                cursor: onOpenFacilityLogModal ? 'pointer' : 'default'
                                              }}>
                                              <Wrench size={9} />
                                              {roomOpenIssues.length === 1 ? '1 Mangel' : `${roomOpenIssues.length} Mängel`}
                                            </span>
                                          );
                                        })()}
                                        {(() => {
                                          const roomPending = (pendingBookings || []).filter((b: any) => b.room_id === room.id || (b.rooms && b.rooms.name === room.name));
                                          if (roomPending.length === 0) return null;
                                          return (
                                            <span
                                              role="button"
                                              tabIndex={0}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setRoomSearchQuery(room.name);
                                                setRoomsSubView('plan');
                                              }}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                  e.stopPropagation();
                                                  setRoomSearchQuery(room.name);
                                                  setRoomsSubView('plan');
                                                }
                                              }}
                                              style={{ 
                                                fontSize: '0.62rem', 
                                                color: '#b45309', 
                                                background: '#fef3c7', 
                                                border: '1px solid #fde68a', 
                                                borderRadius: '6px', 
                                                padding: '1px 6px', 
                                                fontWeight: 800, 
                                                display: 'inline-flex', 
                                                alignItems: 'center', 
                                                gap: '3px',
                                                cursor: 'pointer'
                                              }}
                                              title="Klicken, um die vorläufigen Buchungen im Belegungsplan zu prüfen"
                                            >
                                              <Clock size={10} style={{ color: '#b45309' }} />
                                              <span>{roomPending.length === 1 ? '1 vorläufige Buchung' : `${roomPending.length} vorläufige Buchungen`}</span>
                                            </span>
                                          );
                                        })()}
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>
                                          {room.floor || localFloorMappings[room.id] || 'Allgemein'}
                                        </span>
                                        {room.building_id && (
                                          <span style={{ fontSize: '0.65rem', color: '#ea4335', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                            <Building size={11} style={{ color: '#ea4335' }} /> {buildingMap[room.building_id]?.name || 'Gebäude'}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Capacity and size in a compact style */}
                                  <div style={{ display: 'flex', gap: '16px', flexShrink: 0, alignItems: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', fontFamily: 'monospace' }}>{room.max_students}</span>
                                      <span style={{ fontSize: '0.58rem', color: '#64748b', fontWeight: 700 }}>Schüler</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', fontFamily: 'monospace' }}>{room.qm || 0} m²</span>
                                      <span style={{ fontSize: '0.58rem', color: '#64748b', fontWeight: 700 }}>Größe</span>
                                    </div>
                                    
                                    <button
                                      type="button"
                                      aria-label={`Raum ${room.name} löschen`}
                                      onClick={() => handleDeleteRoom(room.id)}
                                      style={{ background: 'transparent', border: 'none', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '10px', width: '44px', height: '44px', minWidth: '44px', minHeight: '44px', touchAction: 'manipulation', flexShrink: 0 }}
                                      className="hover-scale-mini"
                                      title="Löschen"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>

                                {/* Bottom Row: Micro Status Toggles & Equipment */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '8px', flexWrap: 'wrap' }}>
                                  {/* Active Status Toggles */}
                                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                                    <button
                                      type="button"
                                      aria-label={`Campus-Modul für Raum ${room.name} ${room.is_campus_active !== false ? 'deaktivieren' : 'aktivieren'}`}
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        const newVal = room.is_campus_active === false ? true : false;
                                        const { error } = await supabase.from('rooms').update({ is_campus_active: newVal }).eq('id', room.id);
                                        if (error) alert(error.message);
                                        else {
                                          setRooms(prev => prev.map(r => r.id === room.id ? { ...r, is_campus_active: newVal } : r));
                                        }
                                      }}
                                      style={{
                                        padding: '4px 10px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        fontSize: '0.68rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        background: room.is_campus_active !== false ? '#e6f4ea' : '#f1f5f9',
                                        color: room.is_campus_active !== false ? '#34a853' : '#475569',
                                        transition: 'all 0.15s ease',
                                        fontFamily: 'Urbanist'
                                      }}
                                      className="hover-scale-mini"
                                    >
                                      Campus
                                    </button>

                                    <button
                                      type="button"
                                      aria-label={`GrooveLab-Modul für Raum ${room.name} ${room.is_groovelab_active ? 'deaktivieren' : 'aktivieren'}`}
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        const newVal = !room.is_groovelab_active;
                                        const { error } = await supabase.from('rooms').update({ is_groovelab_active: newVal }).eq('id', room.id);
                                        if (error) alert(error.message);
                                        else {
                                          setRooms(prev => prev.map(r => r.id === room.id ? { ...r, is_groovelab_active: newVal } : r));
                                        }
                                      }}
                                      style={{
                                        padding: '4px 10px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        fontSize: '0.68rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        background: room.is_groovelab_active ? '#fefce8' : '#f1f5f9',
                                        color: room.is_groovelab_active ? '#a16207' : '#64748b',
                                        transition: 'all 0.15s ease',
                                        fontFamily: 'Urbanist'
                                      }}
                                      className="hover-scale-mini"
                                    >
                                      Groovelab
                                    </button>
                                  </div>

                                  {/* Equipment & Unsuitable Tags */}
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'flex-end', flex: 1, minWidth: 0 }}>
                                    {equipment.map((inst, idx) => (
                                      <span 
                                        key={idx}
                                        style={{ 
                                          fontSize: '0.6rem', 
                                          fontWeight: 800, 
                                          background: '#f1f5f9', 
                                          color: '#475569', 
                                          padding: '3px 8px', 
                                          borderRadius: '6px', 
                                          display: 'inline-flex', 
                                          alignItems: 'center', 
                                          gap: '3px',
                                          fontFamily: 'Urbanist'
                                        }}
                                      >
                                        <Music size={10} style={{ color: '#475569' }} />
                                        <span>{formatInstrumentName(inst)}</span>
                                      </span>
                                    ))}

                                    {unsuitableInsts.map((inst: string, idx: number) => (
                                      <span 
                                        key={`unsuitable-${idx}`}
                                        style={{ 
                                          fontSize: '0.6rem', 
                                          fontWeight: 800, 
                                          background: '#fef2f2', 
                                          color: '#ef4444', 
                                          padding: '3px 8px', 
                                          borderRadius: '6px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '3px',
                                          fontFamily: 'Urbanist',
                                          border: '1px solid #fecaca'
                                        }}
                                        title={`Akustisch ungeeignet für ${formatInstrumentName(inst)}`}
                                      >
                                        <AlertCircle size={8} color="#ef4444" />
                                        {formatInstrumentName(inst)}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );                          })
                        )}
                      </div>
                    </div>

                    {/* COLUMN 3: RIGHT SIDEBAR PANEL: STOCKWERKE */}
                    <div className="google-card" style={{
                      width: '340px',
                      flexShrink: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '20px',
                      padding: '24px',
                      borderRadius: '24px',
                      border: '1.5px solid #cbd5e1',
                      background: '#ffffff',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.01)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <School size={20} style={{ color: '#0f172a' }} />
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                          Stockwerke
                        </h3>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.45, fontFamily: 'Inter' }}>
                        Klicke auf ein Stockwerk, um die Ansicht zu filtern, oder ziehe einen Raum per Drag & Drop hierhin.
                      </p>

                      <button
                        onClick={() => {
                          let maxOG = 0;
                          let maxUG = 0;
                          allFloorsList.forEach(f => {
                            const ogMatch = f.match(/^(\d+)\.\s*OG$/i);
                            if (ogMatch) {
                              const num = parseInt(ogMatch[1]);
                              if (num > maxOG) maxOG = num;
                            }
                            const ugMatch = f.match(/^(\d+)\.\s*UG$/i);
                            if (ugMatch) {
                              const num = parseInt(ugMatch[1]);
                              if (num > maxUG) maxUG = num;
                            }
                          });
                          const nextOG = maxOG + 1;
                          const nextUG = maxUG + 1;

                          const input = prompt(
                            `Neues Stockwerk anlegen:

` +
                            `• Schreibe „OG“ für das nächste Obergeschoss: ${nextOG}. OG (+${nextOG})
` +
                            `• Schreibe „UG“ für das nächste Untergeschoss: ${nextUG}. UG (-${nextUG})
` +
                            `• Oder gib einen individuellen Namen ein:`
                          );

                          if (input && input.trim()) {
                            const val = input.trim().toLowerCase();
                            let finalName = input.trim();
                            if (val === 'og' || val === 'o') {
                              finalName = `${nextOG}. OG`;
                            } else if (val === 'ug' || val === 'u') {
                              finalName = `${nextUG}. UG`;
                            }

                            if (allFloorsList.includes(finalName)) {
                              alert(`Das Stockwerk „${finalName}“ existiert bereits.`);
                              return;
                            }

                            const updated = [...addedFloors, finalName];
                            setAddedFloors(updated);
                            localStorage.setItem(`groovelab_added_floors_${schoolId}`, JSON.stringify(updated));
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          borderRadius: '12px',
                          padding: '8px 16px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          background: '#fce8e6',
                          color: '#ea4335',
                          border: '1px solid #f9d2ce',
                          cursor: 'pointer',
                          fontFamily: 'Urbanist',
                          transition: 'all 0.2s'
                        }}
                        className="hover-scale"
                      >
                        <Plus size={14} style={{ color: '#ea4335' }} />
                        <span>Stockwerk anlegen</span>
                      </button>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
                        {/* "Alle Stockwerke anzeigen" */}
                        {(() => {
                          const isActive = roomFilterFloor === 'All';
                          return (
                            <div
                              onClick={() => setRoomFilterFloor('All')}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px 16px',
                                borderRadius: '16px',
                                border: isActive ? '1.5px solid #ea4335' : '1.5px solid #f1f5f9',
                                background: isActive ? '#fce8e6' : '#ffffff',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f1f5f9', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <Layers size={18} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>Alle Stockwerke</span>
                                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Gesamtübersicht</span>
                                </div>
                              </div>
                              <span style={{
                                padding: '4px 10px',
                                borderRadius: '10px',
                                background: isActive ? '#fce8e6' : '#f1f5f9',
                                color: isActive ? '#ea4335' : '#64748b',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                fontFamily: 'Urbanist',
                                whiteSpace: 'nowrap'
                              }}>
                                {uniqueRooms.length} Räume
                              </span>
                            </div>
                          );
                        })()}

                        {/* Floor Cards list */}
                        {allFloorsList.map((flName: string) => {
                          const isActive = roomFilterFloor === flName;
                          const isHovered = dragHoveredFloor === flName;
                          const floorRoomCount = uniqueRooms.filter(r => {
                            const fRaw = r.floor || localFloorMappings[r.id];
                            const fName = (!fRaw || fRaw === 'Allgemein') ? 'EG' : fRaw;
                            return fName === flName;
                          }).length;
                          const avatarInitials = flName.substring(0, 2).toUpperCase();
                          const colorSet = getFloorColor(flName);

                          return (
                            <div
                              key={flName}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                                setDragHoveredFloor(flName);
                              }}
                              onDragLeave={() => setDragHoveredFloor(null)}
                              onDrop={async (e) => {
                                const roomId = e.dataTransfer.getData("roomId");
                                if (roomId) {
                                  // Update local floor mapping immediately as robust fallback
                                  try {
                                    const mappings = JSON.parse(localStorage.getItem(`groovelab_room_floor_mappings_${schoolId}`) || '{}');
                                    mappings[roomId] = flName;
                                    localStorage.setItem(`groovelab_room_floor_mappings_${schoolId}`, JSON.stringify(mappings));
                                  } catch (err) {
                                    console.error(err);
                                  }

                                  // Update local state instantly so UI responds immediately
                                  const previousRooms = rooms;
                                  setRooms(prev => prev.map(r => r.id === roomId ? { ...r, floor: flName } : r));

                                  // Update in database as primary storage
                                  const { error } = await supabase.from('rooms').update({ floor: flName }).eq('id', roomId);
                                  if (error) {
                                    setRooms(previousRooms);
                                    alert("Fehler beim Zuweisen des Stockwerks: " + error.message);
                                  }
                                }
                                setDragHoveredFloor(null);
                              }}
                              onClick={() => setRoomFilterFloor(flName)}
                              role="button"
                              tabIndex={0}
                              aria-label={`Stockwerk ${flName} filtern`}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setRoomFilterFloor(flName);
                                }
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px 16px',
                                borderRadius: '16px',
                                border: isHovered
                                  ? '2px dashed #ea4335'
                                  : isActive
                                    ? '1.5px solid #ea4335'
                                    : '1.5px solid #f1f5f9',
                                background: isHovered
                                  ? '#fce8e6'
                                  : isActive
                                    ? '#fce8e6'
                                    : '#ffffff',
                                cursor: 'pointer',
                                transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                boxShadow: isActive ? '0 4px 12px rgba(234,67,53,0.06)' : 'none'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                                <div style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '50%',
                                  background: colorSet.avatarBg,
                                  color: colorSet.avatarColor,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.85rem',
                                  fontWeight: 900,
                                  fontFamily: 'Urbanist',
                                  flexShrink: 0
                                }}>
                                  {avatarInitials}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {flName}
                                    {flName !== 'EG' && addedFloors.includes(flName) && (
                                      <button
                                        type="button"
                                        aria-label={`Stockwerk ${flName} löschen`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (confirm(`Stockwerk „${flName}“ löschen? Zugeordnete Räume werden zurück auf „EG“ gesetzt.`)) {
                                            // Reset rooms on this floor to EG
                                            supabase.from('rooms').update({ floor: 'EG' }).eq('floor', flName).then(() => {
                                              setRooms(prev => prev.map(r => (r.floor || 'EG') === flName ? { ...r, floor: 'EG' } : r));
                                              const updated = addedFloors.filter(f => f !== flName);
                                              setAddedFloors(updated);
                                              localStorage.setItem(`groovelab_added_floors_${schoolId}`, JSON.stringify(updated));
                                              if (roomFilterFloor === flName) setRoomFilterFloor('All');
                                            });
                                          }
                                        }}
                                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center' }}
                                        title="Stockwerk löschen"
                                      >
                                        <Trash2 size={13} style={{ color: '#ef4444' }} />
                                      </button>
                                    )}
                                  </span>
                                  <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'Inter' }}>
                                    {flName === 'EG' ? 'Erdgeschoss / Standard' : 'Stockwerk'}
                                  </span>
                                </div>
                              </div>
                              <span style={{
                                padding: '4px 10px',
                                borderRadius: '10px',
                                background: isActive ? '#fce8e6' : '#f1f5f9',
                                color: isActive ? '#ea4335' : '#64748b',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                fontFamily: 'Urbanist',
                                whiteSpace: 'nowrap'
                              }}>
                                {floorRoomCount} {floorRoomCount === 1 ? 'Raum' : 'Räume'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}              {/* ── VIEW 3: Einstellungen / Editor ── */}
              {roomsSubView === 'settings' && (
                <div 
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="room-settings-modal-title"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) { setRoomsSubView('overview'); setEditingRoom(null); }
                  }}
                  style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(15, 23, 42, 0.3)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2000,
                  animation: 'fadeIn 0.2s ease-out'
                }}>
                  <div style={{
                    background: 'white',
                    borderRadius: '24px',
                    width: '540px',
                    maxHeight: '90vh',
                    boxShadow: '0 24px 60px -15px rgba(15,23,42,0.25)',
                    border: '1px solid rgba(15,23,42,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    overflow: 'hidden'
                  }}>
                    {/* Modal Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 28px', borderBottom: '1px solid #f1f5f9' }}>
                      <h4 id="room-settings-modal-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Urbanist' }}>
                        <DoorOpen size={18} color="#0f172a" /> {editingRoom ? `„${editingRoom.name}“ bearbeiten` : 'Neuen Raum anlegen'}
                      </h4>
                      <button
                        type="button"
                        aria-label="Raum-Dialog schließen"
                        onClick={() => { setRoomsSubView('overview'); setEditingRoom(null); }}
                        style={{ background: '#f1f5f9', border: 'none', color: '#64748b', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <X size={15} />
                      </button>
                    </div>

                    {/* Modal Body / Scrollable Content */}
                    <div style={{
                      padding: '28px 18px 40px 28px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '10px' }}>
                        {/* Name */}
                        <div>
                          <label style={{ fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', fontFamily: 'Urbanist' }}>
                            <Tag size={12} color="#475569" /> Raumname *
                          </label>
                          <input
                            aria-label="Raumname"
                            value={roomFormName}
                            onChange={e => setRoomFormName(e.target.value)}
                            placeholder='z.B. „Raum 1 – Schlagzeug“ oder „Studio Nord“'
                            style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none', background: '#f8fafc', transition: 'border-color 0.2s' }}
                          />
                        </div>

                        {/* Gebäude */}
                        <div>
                          <label style={{ fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', fontFamily: 'Urbanist' }}>
                            <School size={12} color="#475569" /> Gebäude
                          </label>
                          <select
                            aria-label="Gebäude auswählen"
                            value={roomFormBuildingId}
                            onChange={e => setRoomFormBuildingId(e.target.value)}
                            style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none', background: '#f8fafc' }}
                          >
                            <option value="">Ohne Zuordnung</option>
                            {buildings.map(b => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Max students & QM */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div>
                            <label style={{ fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', fontFamily: 'Urbanist' }}>
                              <Users size={12} color="#475569" /> Max. Schüler
                            </label>
                            <input
                              type="number"
                              aria-label="Maximale Schüleranzahl"
                              value={roomFormMaxStudents}
                              onChange={e => {
                                const val = e.target.value;
                                setRoomFormMaxStudents(val === '' ? '' : parseInt(val));
                              }}
                              min="1"
                              style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none', background: '#f8fafc' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', fontFamily: 'Urbanist' }}>
                              <Ruler size={12} color="#475569" /> Größe in m²
                            </label>
                            <input
                              type="number"
                              aria-label="Raumgröße in Quadratmetern"
                              value={roomFormQm}
                              onChange={e => {
                                const val = e.target.value;
                                setRoomFormQm(val === '' ? '' : parseFloat(val));
                              }}
                              min="0"
                              style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none', background: '#f8fafc' }}
                            />
                          </div>
                        </div>

                        {/* Modul */}
                        <div>
                          <label style={{ fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px', fontFamily: 'Urbanist' }}>
                            <Sliders size={12} color="#475569" /> Module Freigabe
                          </label>
                          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                            <div 
                              role="button"
                              tabIndex={0}
                              aria-label="Für Campus freischalten"
                              onClick={() => setRoomFormIsCampusActive(!roomFormIsCampusActive)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setRoomFormIsCampusActive(!roomFormIsCampusActive);
                                }
                              }}
                              style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '12px',
                                border: roomFormIsCampusActive !== false ? '1.5px solid #34a853' : '1.5px solid #cbd5e1',
                                background: roomFormIsCampusActive !== false ? '#e6f4ea' : '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                userSelect: 'none'
                              }}
                            >
                              <input
                                type="checkbox"
                                aria-label="Campus Modul aktiv"
                                checked={roomFormIsCampusActive !== false}
                                readOnly
                                style={{ width: '16px', height: '16px', accentColor: '#34a853', cursor: 'pointer' }}
                              />
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: roomFormIsCampusActive !== false ? '#137333' : '#0f172a', fontFamily: 'Urbanist' }}>Campus</span>
                                <span style={{ fontSize: '0.62rem', color: roomFormIsCampusActive !== false ? '#1e7e34' : '#64748b' }}>Für Campus freischalten</span>
                              </div>
                            </div>

                            <div 
                              role="button"
                              tabIndex={0}
                              aria-label="Für GrooveLab freischalten"
                              onClick={() => setRoomFormIsGroovelabActive(!roomFormIsGroovelabActive)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setRoomFormIsGroovelabActive(!roomFormIsGroovelabActive);
                                }
                              }}
                              style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '12px',
                                border: roomFormIsGroovelabActive ? '1.5px solid #eab308' : '1.5px solid #cbd5e1',
                                background: roomFormIsGroovelabActive ? '#fefce8' : '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                userSelect: 'none'
                              }}
                            >
                              <input
                                type="checkbox"
                                aria-label="GrooveLab Modul aktiv"
                                checked={!!roomFormIsGroovelabActive}
                                readOnly
                                style={{ width: '16px', height: '16px', accentColor: '#eab308', cursor: 'pointer' }}
                              />
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: roomFormIsGroovelabActive ? '#854d0e' : '#0f172a', fontFamily: 'Urbanist' }}>GrooveLab</span>
                                <span style={{ fontSize: '0.62rem', color: roomFormIsGroovelabActive ? '#a16207' : '#64748b' }}>Für GrooveLab freischalten</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Akustisch ungeeignete Instrumente */}
                        <div>
                          <label style={{ fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px', fontFamily: 'Urbanist' }}>
                            <ShieldAlert size={12} color="#475569" /> Akustisch ungeeignet für
                          </label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {['Schlagzeug', 'Klavier', 'E-Piano', 'Gitarre', 'Bass', 'Gesang', 'Bläser', 'Keyboard'].map(inst => {
                              const isUnsuitable = roomFormUnsuitableInstruments.includes(inst);
                              return (
                                <button
                                  key={inst}
                                  type="button"
                                  aria-label={`Akustisch ungeeignet für ${inst}`}
                                  onClick={() => {
                                    if (isUnsuitable) {
                                      setRoomFormUnsuitableInstruments(prev => prev.filter(i => i !== inst));
                                    } else {
                                      setRoomFormUnsuitableInstruments(prev => [...prev, inst]);
                                    }
                                  }}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border: isUnsuitable ? '1.5px solid #ea4335' : '1.5px solid #cbd5e1',
                                    background: isUnsuitable ? '#fce8e6' : 'white',
                                    color: isUnsuitable ? '#ea4335' : '#475569',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                  }}
                                >
                                  {inst}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Vorhandene Instrumente */}
                        <div>
                          <label style={{ fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px', fontFamily: 'Urbanist' }}>
                            <Music size={12} color="#475569" /> Vorhandene Instrumente (mit Modell)
                          </label>
                          
                          {/* List of existing */}
                          {roomFormRoomInstruments.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                              {roomFormRoomInstruments.map((inst, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px' }}>
                                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                                    {inst.name} <span style={{ color: '#64748b', fontWeight: 550 }}>({inst.model || 'Standard'})</span>
                                  </span>
                                  <button
                                    type="button"
                                    aria-label={`Instrument ${inst.name} entfernen`}
                                    onClick={() => setRoomFormRoomInstruments(prev => prev.filter((_, i) => i !== idx))}
                                    style={{ border: 'none', background: 'transparent', color: '#ef4444', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', padding: '2px' }}
                                  >
                                    Löschen
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add Instrument Form Inline */}
                          <div style={{ display: 'flex', gap: '8px', background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: '12px', padding: '10px', alignItems: 'center' }}>
                            <input
                              aria-label="Neues Instrument Name"
                              placeholder="z.B. Klavier"
                              value={newInstrumentName}
                              onChange={e => setNewInstrumentName(e.target.value)}
                              style={{ flex: 1, height: '36px', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', outline: 'none', background: 'white' }}
                            />
                            <input
                              aria-label="Neues Instrument Typ oder Modell"
                              placeholder="Typ: z.B. Yamaha U1"
                              value={newInstrumentModel}
                              onChange={e => setNewInstrumentModel(e.target.value)}
                              style={{ flex: 1, height: '36px', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', outline: 'none', background: 'white' }}
                            />
                            <button
                              type="button"
                              aria-label="Instrument hinzufügen"
                              onClick={() => {
                                if (!newInstrumentName.trim()) return;
                                setRoomFormRoomInstruments(prev => [...prev, { name: newInstrumentName.trim(), model: newInstrumentModel.trim() }]);
                                setNewInstrumentName('');
                                setNewInstrumentModel('');
                              }}
                              style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: 'none', background: '#ea4335', color: 'white', cursor: 'pointer', flexShrink: 0 }}
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Sonstiges */}
                        <div>
                          <label style={{ fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', fontFamily: 'Urbanist' }}>
                            <Sparkles size={12} color="#475569" /> Sonstige Ausstattung
                          </label>
                          <input
                            aria-label="Sonstige Ausstattung"
                            value={roomFormSonstiges}
                            onChange={e => setRoomFormSonstiges(e.target.value)}
                            placeholder='z.B. Bluetooth Box, Belüftung, Whiteboard...'
                            style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none', background: '#f8fafc' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Modal Footer */}
                    <div style={{ padding: '20px 28px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '10px', background: '#f8fafc' }}>
                      <button
                        type="button"
                        aria-label={editingRoom ? 'Änderungen speichern' : 'Raum anlegen'}
                        onClick={handleSaveRoom}
                        disabled={roomSaving || !roomFormName.trim()}
                        style={{
                          flex: 1,
                          background: 'linear-gradient(135deg, #ea4335 0%, #c5221f 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '8px',
                          borderRadius: '12px',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          opacity: roomSaving || !roomFormName.trim() ? 0.6 : 1,
                          boxShadow: '0 4px 12px rgba(234,67,53,0.15)',
                          transition: 'all 0.2s'
                        }}
                      >
                        {roomSaving ? 'Speichert…' : editingRoom ? 'Änderungen speichern' : 'Raum anlegen'}
                      </button>
                      <button
                        type="button"
                        aria-label="Abbrechen"
                        onClick={() => { setRoomsSubView('overview'); setEditingRoom(null); }}
                        style={{
                          padding: '12px 20px',
                          borderRadius: '12px',
                          border: '1.5px solid #cbd5e1',
                          background: 'white',
                          color: '#64748b',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          cursor: 'pointer'
                        }}
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Building Modal Editor */}
              {showBuildingModal && (
                <div 
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="building-modal-title"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) { setShowBuildingModal(false); setEditingBuilding(null); }
                  }}
                  style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(15, 23, 42, 0.3)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2100,
                  animation: 'fadeIn 0.2s ease-out'
                }}>
                  <div style={{
                    background: 'white',
                    borderRadius: '24px',
                    width: '480px',
                    boxShadow: '0 24px 60px -15px rgba(15,23,42,0.25)',
                    border: '1px solid rgba(15,23,42,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    overflow: 'hidden'
                  }}>
                    {/* Modal Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 28px', borderBottom: '1px solid #f1f5f9' }}>
                      <h4 id="building-modal-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Urbanist' }}>
                        <School size={18} color="#0f172a" /> {editingBuilding ? `„${editingBuilding.name}“ bearbeiten` : 'Neues Gebäude anlegen'}
                      </h4>
                      <button
                        type="button"
                        aria-label="Gebäude-Dialog schließen"
                        onClick={() => { setShowBuildingModal(false); setEditingBuilding(null); }}
                        style={{ background: '#f1f5f9', border: 'none', color: '#64748b', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <X size={15} />
                      </button>
                    </div>

                    <form onSubmit={handleSaveBuilding}>
                      {/* Modal Body */}
                      <div style={{ padding: '28px 28px 32px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                          <label style={{ fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', fontFamily: 'Urbanist' }}>
                            <School size={12} color="#475569" /> Gebäudename *
                          </label>
                          <input
                            aria-label="Gebäudename"
                            value={buildingFormName}
                            onChange={e => setBuildingFormName(e.target.value)}
                            required
                            placeholder="z.B. Hauptgebäude, Rathaus-Schule"
                            style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none', background: '#f8fafc' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', fontFamily: 'Urbanist' }}>
                            <School size={12} color="#475569" /> Adresse
                          </label>
                          <input
                            aria-label="Adresse des Gebäudes"
                            value={buildingFormAddress}
                            onChange={e => setBuildingFormAddress(e.target.value)}
                            placeholder="z.B. Kaiserstraße 10, 80331 München"
                            style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', outline: 'none', background: '#f8fafc' }}
                          />
                        </div>
                      </div>

                      {/* Modal Footer */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '18px 28px', borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
                        <button
                          type="button"
                          aria-label="Abbrechen"
                          onClick={() => { setShowBuildingModal(false); setEditingBuilding(null); }}
                          style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', background: 'white', color: '#64748b', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Abbrechen
                        </button>
                        <button
                          type="submit"
                          aria-label="Gebäude speichern"
                          style={{ padding: '10px 20px', border: 'none', background: 'linear-gradient(135deg, #ea4335 0%, #c5221f 100%)', color: 'white', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 750, cursor: 'pointer', boxShadow: '0 4px 12px rgba(234,67,53,0.2)' }}
                        >
                          Speichern
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Re-use the same selectedDayPlan detail drawer */}
              {selectedDayPlan && roomsSubView === 'plan' && (
                <div 
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="dayplan-detail-title"
                  style={{ position: 'fixed', top: 0, right: 0, width: '380px', height: '100vh', background: 'white', boxShadow: '-12px 0 48px rgba(15,23,42,0.14)', borderLeft: '1px solid #e2e8f0', zIndex: 1050, display: 'flex', flexDirection: 'column', padding: '24px', animation: 'modalFadeIn 0.3s cubic-bezier(0.16,1,0.3,1)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '16px' }}>
                    <div>
                      <span style={{ fontSize: '0.63rem', fontWeight: 800, color: '#f59e0b', background: '#fffbeb', border: '1px solid rgba(245,158,11,0.2)', padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase', display: 'inline-block', marginBottom: '6px' }}>
                        {['','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'][selectedDayPlan.dayOfWeek]} · Lese-Ansicht
                      </span>
                      <h3 id="dayplan-detail-title" style={{ margin: '0 0 2px 0', fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>{getPlanDisplayName(selectedDayPlan)}</h3>
                      <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Music size={12} style={{ color: '#475569' }} /> {selectedDayPlan.instrument}</span>
                    </div>
                    <button type="button" aria-label="Details schließen" onClick={() => setSelectedDayPlan(null)} style={{ background: '#f1f5f9', border: 'none', color: '#64748b', cursor: 'pointer', padding: '7px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={16} />
                    </button>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.06em' }}>Stundenliste</h4>
                    {selectedDayPlan.teacherId === 'groovelab' ? (
                      <div style={{ padding: '9px 11px', borderRadius: '10px', border: '1px solid #f1f5f9', background: '#f8fafc', borderLeft: '4px solid #3b82f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1d1d1f', display: 'block' }}>GrooveLab Betriebszeit</span>
                          <span style={{ fontSize: '0.6rem', color: '#475569', fontWeight: 650, display: 'block', marginTop: '1px' }}>
                            Virtueller Termin für Raumzuteilung
                          </span>
                        </div>
                        <span style={{ fontSize: '0.73rem', fontWeight: 900, fontFamily: 'monospace', color: '#0f172a' }}>
                          {selectedDayPlan.startTime}–{selectedDayPlan.endTime}
                        </span>
                      </div>
                    ) : (
                      selectedDayPlan.slots.map((slot: any, idx: number) => {
                        const isBreak = !slot.student_id;
                        return (
                          <div key={idx} style={{ padding: '9px 11px', borderRadius: '10px', border: '1px solid #f1f5f9', background: isBreak ? '#fffbeb' : '#f8fafc', borderLeft: isBreak ? '4px solid #f59e0b' : '4px solid #3b82f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: '4px' }}>{isBreak ? (<><Coffee size={12} style={{ color: '#b45309' }} /> Pause</>) : slot.student_name}</span>
                              <span style={{ fontSize: '0.6rem', color: '#475569', fontWeight: 650, display: 'block', marginTop: '1px' }}>
                                {isBreak ? 'Pause' : `Instrument: ${slot.student_instrument || selectedDayPlan.instrument || 'Instrument'}`}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.73rem', fontWeight: 900, fontFamily: 'monospace', color: isBreak ? '#b45309' : '#0f172a' }}>{slot.time_slot}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

            </>
          );
}
