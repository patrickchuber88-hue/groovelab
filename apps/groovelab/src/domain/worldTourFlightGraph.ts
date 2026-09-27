/**
 * 🌍 Campus-Groovelab Expeditions-Atlas: Flight Connection Graph & Router (CAM-34)
 * 
 * 0,1% Gamification Goldstandard:
 * - Deterministischer 21-Stationen Flugrouten-Graph (Branching Explorer Network)
 * - Jedes Land bietet 2 bis 4 authentische Flugverbindungen
 * - Anti-Frustrations-Garantie: Keine Sackgassen, mehrere Wege zu jedem Kontinent
 * - Orthodrome Bézier-Bogen-Mathematik für 60 FPS Vektor-Animation
 * - 100 % Client-Side Zero-Server-Burnout Architektur
 */

import { WorldTourCountry, WorldTourStudentProgress } from '../types/worldTour';
import { WORLD_TOUR_COUNTRIES } from './worldTourCatalog';

export interface FlightConnection {
  fromCode: string;
  toCode: string;
  distanceKm: number;
  routeTitle: string;
  requiredStars?: number; // Standard: 1 Meisterstern (>= 60% Score)
}

/**
 * 🛫 AUTORITATIVES 21-STATIONEN FLUGROUTEN-NETZWERK
 * Basiert auf historischen Musikwanderungen, Seidenstraße, Atlantik- und Pazifik-Routen.
 */
export const FLIGHT_CONNECTIONS_GRAPH: Record<string, string[]> = {
  // 1. EUROPA KNOTENPUNKTE
  DE: ['GB', 'IT', 'BG_HORO', 'FR'],
  GB: ['DE', 'IE_JIG', 'FR', 'US'],
  IE_JIG: ['GB', 'FR', 'US'],
  FR: ['DE', 'GB', 'ES_FLAMENCO', 'EU'],
  EU: ['DE', 'FR', 'IT'],
  IT: ['DE', 'EU', 'ES_FLAMENCO', 'EG_MAQAM'],
  ES_FLAMENCO: ['FR', 'IT', 'WA_JARABI', 'CU_SON'],
  BG_HORO: ['DE', 'EG_MAQAM', 'IN_RAGA'],

  // 2. ORIENT & AFRIKA KNOTENPUNKTE
  EG_MAQAM: ['IT', 'BG_HORO', 'WA_KUKU', 'IN_RAGA'],
  WA_KUKU: ['EG_MAQAM', 'WA_JARABI', 'ZA_SHOSHO'],
  WA_JARABI: ['ES_FLAMENCO', 'WA_KUKU', 'BR_CHORO'],
  ZA_SHOSHO: ['WA_KUKU', 'BR_CHORO', 'IN_RAGA', 'AU'],

  // 3. AMERIKA KNOTENPUNKTE
  US: ['GB', 'IE_JIG', 'CU_SON', 'US_HAWAII'],
  CU_SON: ['ES_FLAMENCO', 'US', 'BR_CHORO', 'PE_KASHWA'],
  BR_CHORO: ['WA_JARABI', 'ZA_SHOSHO', 'PE_KASHWA', 'CU_SON'],
  PE_KASHWA: ['BR_CHORO', 'CU_SON', 'US_HAWAII'],

  // 4. ASIEN & OZEANIEN KNOTENPUNKTE
  IN_RAGA: ['BG_HORO', 'EG_MAQAM', 'ZA_SHOSHO', 'JP', 'AU'],
  JP: ['IN_RAGA', 'US_HAWAII', 'AU'],
  US_HAWAII: ['US', 'PE_KASHWA', 'JP', 'NZ_MAORI'],
  AU: ['IN_RAGA', 'JP', 'NZ_MAORI', 'ZA_SHOSHO'],
  NZ_MAORI: ['AU', 'US_HAWAII', 'ZA_SHOSHO']
};

/**
 * 📏 KORRESPONDENZ-DISTANZEN (Großkreis-Schätzung für Entdecker-Dramaturgie)
 */
export const ROUTE_METADATA: Record<string, { title: string; distanceKm: number }> = {
  'DE-GB': { title: 'Nordsee-Überquerung (Berlin → London)', distanceKm: 930 },
  'DE-IT': { title: 'Alpenüberquerung (Berlin → Rom)', distanceKm: 1180 },
  'DE-BG_HORO': { title: 'Balkan-Express (Berlin → Sofia)', distanceKm: 1320 },
  'DE-FR': { title: 'Rhein-Passage (Berlin → Paris)', distanceKm: 880 },
  'GB-IE_JIG': { title: 'Irische See (London → Dublin)', distanceKm: 460 },
  'GB-FR': { title: 'Ärmelkanal-Flug (London → Paris)', distanceKm: 340 },
  'GB-US': { title: 'Nordatlantik-Überquerung (London → Washington)', distanceKm: 5900 },
  'IE_JIG-US': { title: 'Transatlantik-Pionierroute (Shannon → Boston)', distanceKm: 4950 },
  'FR-ES_FLAMENCO': { title: 'Pyrenäen-Überflug (Paris → Madrid)', distanceKm: 1050 },
  'FR-EU': { title: 'Europäische Magistrale (Paris → Brüssel)', distanceKm: 260 },
  'IT-EG_MAQAM': { title: 'Mittelmeer-Transversalroute (Rom → Kairo)', distanceKm: 2130 },
  'ES_FLAMENCO-WA_JARABI': { title: 'Sahara-Pazifik-Route (Madrid → Dakar)', distanceKm: 3150 },
  'ES_FLAMENCO-CU_SON': { title: 'Kolumbus-Transatlantik (Cadiz → Havanna)', distanceKm: 7100 },
  'BG_HORO-IN_RAGA': { title: 'Historische Seidenstraße (Sofia → Delhi)', distanceKm: 5200 },
  'EG_MAQAM-IN_RAGA': { title: 'Arabisches Meer Flug (Kairo → Mumbai)', distanceKm: 4350 },
  'EG_MAQAM-WA_KUKU': { title: 'Trans-Sahel-Expedition (Kairo → Conakry)', distanceKm: 5100 },
  'WA_JARABI-BR_CHORO': { title: 'Südatlantik-Brücke (Dakar → Rio de Janeiro)', distanceKm: 5020 },
  'WA_KUKU-ZA_SHOSHO': { title: 'Panafrikanischer Äquatorflug (Guinea → Kapstadt)', distanceKm: 5950 },
  'ZA_SHOSHO-IN_RAGA': { title: 'Indischer Ozean Passage (Kapstadt → Mumbai)', distanceKm: 7850 },
  'ZA_SHOSHO-AU': { title: 'Südindischer Ozean-Flug (Kapstadt → Perth)', distanceKm: 8700 },
  'US-CU_SON': { title: 'Floridastraße Flug (Miami → Havanna)', distanceKm: 370 },
  'US-US_HAWAII': { title: 'Zentralpazifik-Flug (San Francisco → Honolulu)', distanceKm: 3850 },
  'CU_SON-PE_KASHWA': { title: 'Karibik-Anden-Flug (Havanna → Lima)', distanceKm: 3900 },
  'CU_SON-BR_CHORO': { title: 'Amazonas-Überquerung (Havanna → Rio)', distanceKm: 6100 },
  'PE_KASHWA-BR_CHORO': { title: 'Trans-Amazonas-Route (Lima → Rio de Janeiro)', distanceKm: 3770 },
  'PE_KASHWA-US_HAWAII': { title: 'Südpazifik-Anden-Bogen (Lima → Honolulu)', distanceKm: 9200 },
  'IN_RAGA-JP': { title: 'Ostasien-Meisterflug (Delhi → Tokio)', distanceKm: 5840 },
  'IN_RAGA-AU': { title: 'Äquator-Ozean-Route (Mumbai → Darwin)', distanceKm: 6200 },
  'JP-US_HAWAII': { title: 'Pazifische Datumsgrenze (Tokio → Honolulu)', distanceKm: 6200 },
  'JP-AU': { title: 'Westpazifik-Route (Tokio → Sydney)', distanceKm: 7800 },
  'US_HAWAII-NZ_MAORI': { title: 'Polynesische Sternenroute (Honolulu → Auckland)', distanceKm: 7100 },
  'AU-NZ_MAORI': { title: 'Tasman-See-Überquerung (Sydney → Auckland)', distanceKm: 2150 }
};

export class WorldTourFlightEngine {
  /**
   * Prüft, ob ein Land für den Schüler anfliegbar oder bereits freigeschaltet ist.
   * Startland (DE) ist immer freigeschaltet.
   * Ein Land ist freigeschaltet, wenn es entweder:
   * 1. Bereits gemeistert wurde (mind. 1 Stern / >= 60%)
   * 2. Direkt an EIN beliebiges bereits gemeistertes Land angrenzt
   * 3. Am Anfang: Falls noch gar nichts gemeistert ist, sind DE und seine 4 Nachbarn (GB, IT, BG, FR) anfliegbar.
   */
  public static isCountryAccessible(
    countryCode: string,
    progressMap: Record<string, WorldTourStudentProgress>
  ): boolean {
    if (countryCode === 'DE') return true;

    // Wenn das Land selbst schon gemeistert ist -> freigeschaltet
    const ownProgress = progressMap[countryCode];
    if (ownProgress && (ownProgress.stars ?? 0) >= 1) {
      return true;
    }

    // Finde alle gemeisterten Länder
    const masteredCodes = Object.keys(progressMap).filter(code => {
      const p = progressMap[code];
      return p && (p.stars ?? 0) >= 1;
    });

    // Sonderfall: Noch gar kein Land gemeistert -> Deutschland und seine Start-Ziele sind anfliegbar
    if (masteredCodes.length === 0) {
      const startDestinations = FLIGHT_CONNECTIONS_GRAPH['DE'] || [];
      return countryCode === 'DE' || startDestinations.includes(countryCode);
    }

    // Wenn mindestens ein gemeistertes Nachbarland existiert -> anfliegbar!
    for (const mastered of masteredCodes) {
      const neighbors = FLIGHT_CONNECTIONS_GRAPH[mastered] || [];
      if (neighbors.includes(countryCode)) {
        return true;
      }
    }

    // Wenn DE noch nicht offiziell in mastered ist, aber Startpunkt ist
    const deNeighbors = FLIGHT_CONNECTIONS_GRAPH['DE'] || [];
    if (deNeighbors.includes(countryCode)) {
      return true;
    }

    return false;
  }

  /**
   * Gibt alle aktiven, anfliegbaren Anschlussflüge von einem Startland aus zurück.
   */
  public static getConnectionsFrom(
    countryCode: string,
    progressMap: Record<string, WorldTourStudentProgress>
  ): Array<{ country: WorldTourCountry; isAccessible: boolean; isMastered: boolean }> {
    const neighborCodes = FLIGHT_CONNECTIONS_GRAPH[countryCode] || [];
    return neighborCodes.map(code => {
      const country = WORLD_TOUR_COUNTRIES.find(c => c.code === code) || WORLD_TOUR_COUNTRIES[0];
      const prog = progressMap[code];
      const isMastered = Boolean(prog && (prog.stars ?? 0) >= 1);
      const isAccessible = this.isCountryAccessible(code, progressMap);
      return { country, isAccessible, isMastered };
    });
  }

  /**
   * Ermittelt Metadaten (Name und Distanz in km) für eine gegebene Flugroute.
   */
  public static getRouteInfo(fromCode: string, toCode: string): { title: string; distanceKm: number } {
    const directKey = `${fromCode}-${toCode}`;
    const reverseKey = `${toCode}-${fromCode}`;
    if (ROUTE_METADATA[directKey]) return ROUTE_METADATA[directKey];
    if (ROUTE_METADATA[reverseKey]) return ROUTE_METADATA[reverseKey];
    return {
      title: `Transkontinentaler Flug (${fromCode} → ${toCode})`,
      distanceKm: 2500
    };
  }

  /**
   * Ermittelt die Flugdistanz in Kilometern für eine gegebene Flugroute.
   */
  public static getDistanceKm(fromCode: string, toCode: string): number {
    return this.getRouteInfo(fromCode, toCode).distanceKm;
  }

  /**
   * Prüft, ob ein Direktflug zwischen Start- und Zielland für den Schüler möglich ist.
   */
  public static canFlyDirectly(
    fromCode: string,
    toCode: string,
    progressMap: Record<string, WorldTourStudentProgress>
  ): boolean {
    if (fromCode === toCode) return false;
    if (!this.isCountryAccessible(toCode, progressMap)) return false;

    // 1. Direkte Nachbarverbindung im Flugnetz
    const neighbors = FLIGHT_CONNECTIONS_GRAPH[fromCode] || [];
    if (neighbors.includes(toCode)) return true;

    // 2. Schnellreise zwischen zwei bereits gemeisterten Stationen
    const fromMastered = Boolean(progressMap[fromCode] && (progressMap[fromCode].stars ?? 0) >= 1);
    const toMastered = Boolean(progressMap[toCode] && (progressMap[toCode].stars ?? 0) >= 1);
    if (fromMastered && toMastered) return true;

    return false;
  }

  /**
   * Berechnet den geschwungenen Bézier-Bogen für das Flugzeug im SVG (1200 × 580).
   * Parabolische Hebung verhindert, dass Fluglinien flach wirken.
   */
  public static calculateFlightArc(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): {
    d: string;
    midX: number;
    midY: number;
    angleDeg: number;
    distance: number;
  } {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.hypot(dx, dy);

    // Bogenhöhe proportional zur Distanz (mind. 22px, max. 85px)
    const arcHeight = Math.min(Math.max(distance * 0.16, 22), 85);

    // Orthogonaler Normalenvektor zur Flugachse (Great-Circle Geodäte)
    // Bei horizontalen Flügen wölbt sich der Bogen nach Norden (oben)
    // Bei vertikalen Flügen (z. B. Europa ↔ Afrika) wölbt er sich organisch zur Seite
    let nx = -dy / (distance || 1);
    let ny = dx / (distance || 1);

    if (ny > 0.2) {
      nx = -nx;
      ny = -ny;
    }

    const midX = (x1 + x2) / 2 + nx * arcHeight;
    const midY = (y1 + y2) / 2 + ny * arcHeight;

    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

    return {
      d: `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${midX.toFixed(1)} ${midY.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`,
      midX,
      midY,
      angleDeg,
      distance
    };
  }

  /**
   * Ermittelt alle Zubringerflüge (Quell-Länder), die zu einem Ziel-Land führen.
   * Didaktische Quest-Wegweiser für gesperrte Länder!
   */
  public static getAccessRoutesTo(
    targetCountryCode: string,
    progressMap: Record<string, WorldTourStudentProgress>
  ): Array<{ country: WorldTourCountry; isAccessible: boolean; isMastered: boolean; distanceKm: number }> {
    const feederCodes: string[] = [];

    Object.entries(FLIGHT_CONNECTIONS_GRAPH).forEach(([fromCode, neighbors]) => {
      if (neighbors.includes(targetCountryCode) && !feederCodes.includes(fromCode)) {
        feederCodes.push(fromCode);
      }
    });

    return feederCodes.map(code => {
      const country = WORLD_TOUR_COUNTRIES.find(c => c.code === code) || WORLD_TOUR_COUNTRIES[0];
      const prog = progressMap[code];
      const isMastered = Boolean(prog && (prog.stars ?? 0) >= 1);
      const isAccessible = this.isCountryAccessible(code, progressMap);
      const routeInfo = this.getRouteInfo(code, targetCountryCode);
      return { country, isAccessible, isMastered, distanceKm: routeInfo.distanceKm };
    });
  }

  /**
   * Findet den kürzesten Flugpfad von einem Startland zu einem Zielland (BFS).
   * Simple, schlicht, kompakt für den didaktischen Schüler-Wegweiser.
   */
  public static findShortestRoute(
    fromCode: string,
    targetCode: string
  ): { path: WorldTourCountry[]; totalKm: number; stepsCount: number } | null {
    if (fromCode === targetCode) {
      const c = WORLD_TOUR_COUNTRIES.find(c => c.code === fromCode);
      return c ? { path: [c], totalKm: 0, stepsCount: 0 } : null;
    }

    const queue: string[][] = [[fromCode]];
    const visited = new Set<string>([fromCode]);

    while (queue.length > 0) {
      const currentPath = queue.shift()!;
      const lastNode = currentPath[currentPath.length - 1];

      const neighbors = FLIGHT_CONNECTIONS_GRAPH[lastNode] || [];
      for (const neighbor of neighbors) {
        if (neighbor === targetCode) {
          const fullPathCodes = [...currentPath, neighbor];
          const pathCountries = fullPathCodes
            .map(code => WORLD_TOUR_COUNTRIES.find(c => c.code === code))
            .filter((c): c is WorldTourCountry => Boolean(c));

          let totalKm = 0;
          for (let i = 0; i < fullPathCodes.length - 1; i++) {
            totalKm += this.getDistanceKm(fullPathCodes[i], fullPathCodes[i + 1]);
          }

          return {
            path: pathCountries,
            totalKm,
            stepsCount: fullPathCodes.length - 1
          };
        }

        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...currentPath, neighbor]);
        }
      }
    }

    return null;
  }

  /**
   * Berechnet Piloten-Meilen und den didaktischen Piloten-Rang des Schülers.
   */
  public static calculatePilotStats(progressMap: Record<string, WorldTourStudentProgress>): {
    totalKm: number;
    rankTitle: string;
    rankBadge: string;
    nextRankKm: number;
    progressPercent: number;
  } {
    const masteredCodes = Object.keys(progressMap).filter(code => {
      const p = progressMap[code];
      return p && (p.stars ?? 0) >= 1;
    });

    let totalKm = 0;
    masteredCodes.forEach(code => {
      if (code === 'DE') {
        totalKm += 880;
      } else {
        const neighbors = FLIGHT_CONNECTIONS_GRAPH[code] || [];
        let minNeighborDist = 3500;
        neighbors.forEach(n => {
          const info = this.getRouteInfo(code, n);
          if (info.distanceKm < minNeighborDist) {
            minNeighborDist = info.distanceKm;
          }
        });
        totalKm += minNeighborDist;
      }
    });

    let rankTitle = 'Flugschüler';
    let rankBadge = '🛫';
    let nextRankKm = 5000;

    if (totalKm >= 50000) {
      rankTitle = 'Welt-Kapitän der Klänge';
      rankBadge = '👑';
      nextRankKm = 100000;
    } else if (totalKm >= 30000) {
      rankTitle = 'Seidenstraßen-Navigator';
      rankBadge = '🧭';
      nextRankKm = 50000;
    } else if (totalKm >= 15000) {
      rankTitle = 'Transatlantik-Pionier';
      rankBadge = '🌊';
      nextRankKm = 30000;
    } else if (totalKm >= 5000) {
      rankTitle = 'Balkan- & Alpen-Flieger';
      rankBadge = '🏔️';
      nextRankKm = 15000;
    }

    const progressPercent = Math.min(Math.round((totalKm / nextRankKm) * 100), 100);

    return { totalKm, rankTitle, rankBadge, nextRankKm, progressPercent };
  }
}
