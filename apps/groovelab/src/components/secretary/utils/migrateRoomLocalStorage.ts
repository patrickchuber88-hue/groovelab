import { SupabaseClient } from '@supabase/supabase-js';

export async function migrateRoomLocalStorageToSupabase(schoolId: string, supabase: SupabaseClient): Promise<void> {
  try {
    const migratedKey = `groovelab_db_migration_done_${schoolId}`;
    if (typeof window === 'undefined' || localStorage.getItem(migratedKey)) return;

    const { data: dbRooms } = await supabase.from('rooms').select('*').eq('school_id', schoolId);
    if (!dbRooms || dbRooms.length === 0) return;

    const floorMap = JSON.parse(localStorage.getItem(`groovelab_room_floor_mappings_${schoolId}`) || '{}');
    const instrumentsMap = JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
    const unsuitableMap = JSON.parse(localStorage.getItem(`groovelab_room_unsuitable_mappings_${schoolId}`) || '{}');
    const sonstigesMap = JSON.parse(localStorage.getItem(`groovelab_room_sonstiges_mappings_${schoolId}`) || '{}');

    let migrationCount = 0;
    for (const rm of dbRooms) {
      const localFloor = floorMap[rm.id];
      const localInstruments = instrumentsMap[rm.id];
      const localUnsuitable = unsuitableMap[rm.id];
      const localSonstiges = sonstigesMap[rm.id];

      if (localFloor || localInstruments || localUnsuitable || localSonstiges) {
        const updatePayload: any = {};
        if (localFloor) updatePayload.floor = localFloor;
        if (localInstruments && localInstruments.length > 0) updatePayload.room_instruments = localInstruments;
        if (localUnsuitable && localUnsuitable.length > 0) updatePayload.unsuitable_instruments = localUnsuitable;
        if (localSonstiges) updatePayload.sonstiges = localSonstiges;

        if (Object.keys(updatePayload).length > 0) {
          const { error } = await supabase.from('rooms').update(updatePayload).eq('id', rm.id);
          if (!error) migrationCount++;
        }
      }
    }

    if (migrationCount > 0) {
      console.log(`Successfully migrated ${migrationCount} rooms from localStorage to Supabase.`);
    }
    localStorage.setItem(migratedKey, 'true');
  } catch (err) {
    console.error('Local storage to Supabase migration error:', err);
  }
}
