/**
 * Canonical GrooveLab Studio Room & Station Layout Defaults
 * 
 * Provides an instant 0ms fallback layout for the GrooveLab Studio Blueprint,
 * ensuring that every station (iPad 1-8 in U-Shape + Center Lehrer-iPad) is rendered
 * immediately on tick 0ms without layout jumps (CLS = 0.00).
 */

export interface CanonicalStationRecord {
  id: string;
  name: string;
  instrument: string;
  color: string;
  pos_x: number;
  pos_y: number;
  room_id?: string;
  is_canonical_default?: boolean;
}

export interface CanonicalRoomRecord {
  id: string;
  name: string;
  room_width: number;
  room_height: number;
  is_groovelab_active: boolean;
  is_canonical_default?: boolean;
  school_id?: string;
}

export const CANONICAL_GROOVELAB_STUDIO_ROOM: CanonicalRoomRecord = {
  id: 'canonical-groovelab-studio',
  name: 'GrooveLab Studio',
  room_width: 1000,
  room_height: 700,
  is_groovelab_active: true,
  is_canonical_default: true
};

export const CANONICAL_GROOVELAB_STUDIO_STATIONS: CanonicalStationRecord[] = [
  { id: 'canonical-ipad-1', name: 'iPad 1', instrument: 'Drums', color: '#eab308', pos_x: 39, pos_y: 75, room_id: 'canonical-groovelab-studio', is_canonical_default: true },
  { id: 'canonical-ipad-2', name: 'iPad 2', instrument: 'Guitar', color: '#ef4444', pos_x: 29, pos_y: 50, room_id: 'canonical-groovelab-studio', is_canonical_default: true },
  { id: 'canonical-ipad-3', name: 'iPad 3', instrument: 'Keys', color: '#a855f7', pos_x: 18, pos_y: 25, room_id: 'canonical-groovelab-studio', is_canonical_default: true },
  { id: 'canonical-ipad-4', name: 'iPad 4', instrument: 'Bass', color: '#eab308', pos_x: 39, pos_y: 25, room_id: 'canonical-groovelab-studio', is_canonical_default: true },
  { id: 'canonical-ipad-5', name: 'iPad 5', instrument: 'Vocals', color: '#34a853', pos_x: 61, pos_y: 25, room_id: 'canonical-groovelab-studio', is_canonical_default: true },
  { id: 'canonical-ipad-6', name: 'iPad 6', instrument: 'Guitar', color: '#ef4444', pos_x: 82, pos_y: 25, room_id: 'canonical-groovelab-studio', is_canonical_default: true },
  { id: 'canonical-ipad-7', name: 'iPad 7', instrument: 'Keys', color: '#a855f7', pos_x: 71, pos_y: 50, room_id: 'canonical-groovelab-studio', is_canonical_default: true },
  { id: 'canonical-ipad-8', name: 'iPad 8', instrument: 'Vocals', color: '#34a853', pos_x: 61, pos_y: 75, room_id: 'canonical-groovelab-studio', is_canonical_default: true },
  { id: 'canonical-lehrer', name: 'Lehrer iPad', instrument: 'Coach', color: '#34a853', pos_x: 50, pos_y: 50, room_id: 'canonical-groovelab-studio', is_canonical_default: true }
];

/**
 * Normalizes stations for blueprint layout.
 * If stations are missing explicit pos_x / pos_y coordinates,
 * this function maps them to the canonical studio coordinates based on their name/number.
 */
export function normalizeStationsForBlueprint(stations: any[]): any[] {
  if (!stations || stations.length === 0) {
    return CANONICAL_GROOVELAB_STUDIO_STATIONS;
  }

  return stations.map(station => {
    if (station.pos_x !== null && station.pos_x !== undefined && station.pos_y !== null && station.pos_y !== undefined) {
      return station;
    }

    const sName = (station.name || '').toLowerCase().trim();
    let posX = 50;
    let posY = 50;

    if (sName.includes('lehrer') || sName.includes('teacher')) {
      posX = 50;
      posY = 50;
    } else {
      const match = sName.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num === 1) { posX = 39; posY = 75; }
        else if (num === 2) { posX = 29; posY = 50; }
        else if (num === 3) { posX = 18; posY = 25; }
        else if (num === 4) { posX = 39; posY = 25; }
        else if (num === 5) { posX = 61; posY = 25; }
        else if (num === 6) { posX = 82; posY = 25; }
        else if (num === 7) { posX = 71; posY = 50; }
        else if (num === 8) { posX = 61; posY = 75; }
      }
    }

    return {
      ...station,
      pos_x: posX,
      pos_y: posY
    };
  });
}
