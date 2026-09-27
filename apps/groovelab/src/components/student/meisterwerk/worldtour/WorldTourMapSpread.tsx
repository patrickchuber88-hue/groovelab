import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ArrowLeft, Sparkles, Volume2, BookOpen,
  ChevronRight, ChevronDown, ChevronUp, Printer,
  Globe, Compass, Trophy, Star,
  Plane, Lock, CheckCircle2, MapPin, Navigation
} from 'lucide-react';
import { CONTINENTS, WORLD_TOUR_COUNTRIES } from '../../../../domain/worldTourCatalog';
import { WorldTourCountry, ContinentId, WorldTourStudentProgress } from '../../../../types/worldTour';
import { WorldTourService } from '../../../../services/worldTourService';
import { WorldTourFlightEngine, FLIGHT_CONNECTIONS_GRAPH } from '../../../../domain/worldTourFlightGraph';
import { WorldTourScorePlayer } from './WorldTourScorePlayer';
import { WorldTourDiplomaModal } from './WorldTourDiplomaModal';
import { WorldTourPassportModal } from './WorldTourPassportModal';
import { WorldTourCountryFlag, renderCountryFlagPaths } from './WorldTourCountryFlags';

interface WorldTourMapSpreadProps {
  onBackToHub?: () => void;
  studentId?: string;
  studentName?: string;
  studentInstrument?: string | null;
  studentAvatarUrl?: string | null;
  uiLevel?: 'junior' | 'teen' | 'pro';
  isMobileView?: boolean;
  onMasteryAchieved?: (stars: number, score: number, xp: number, countryCode: string) => void;
}

/**
 * 👑 KA HAE HAWAIʻI (Offizielle Flagge des Königreichs & Staates Hawaii)
 * 8 horizontale Streifen (Weiß, Rot, Blau x2) + Union Jack im Kanton.
 * Ersetzt das unpassende Blumen-Emoji durch ein heraldisch exaktes Vektor-Badge.
 */
export const HawaiiFlagSvg: React.FC<{ width?: number; height?: number; style?: React.CSSProperties }> = ({
  width = 36,
  height = 24,
  style
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 60 40"
      style={{ borderRadius: '4px', overflow: 'hidden', flexShrink: 0, ...style }}
      aria-label="Ka Hae Hawaiʻi (Offizielle Flagge von Hawaii)"
    >
      {/* 8 Streifen: Weiß, Rot, Blau, Weiß, Rot, Blau, Weiß, Rot */}
      <rect x="0" y="0" width="60" height="5" fill="#ffffff" />
      <rect x="0" y="5" width="60" height="5" fill="#dc2626" />
      <rect x="0" y="10" width="60" height="5" fill="#1e3a8a" />
      <rect x="0" y="15" width="60" height="5" fill="#ffffff" />
      <rect x="0" y="20" width="60" height="5" fill="#dc2626" />
      <rect x="0" y="25" width="60" height="5" fill="#1e3a8a" />
      <rect x="0" y="30" width="60" height="5" fill="#ffffff" />
      <rect x="0" y="35" width="60" height="5" fill="#dc2626" />

      {/* Kanton: Union Jack (30 × 20) */}
      <g>
        <rect x="0" y="0" width="30" height="20" fill="#1e3a8a" />
        {/* Weißes Andreaskreuz */}
        <line x1="0" y1="0" x2="30" y2="20" stroke="#ffffff" strokeWidth="4.5" />
        <line x1="0" y1="20" x2="30" y2="0" stroke="#ffffff" strokeWidth="4.5" />
        {/* Rotes Andreaskreuz */}
        <line x1="0" y1="0" x2="30" y2="20" stroke="#dc2626" strokeWidth="2.2" />
        <line x1="0" y1="20" x2="30" y2="0" stroke="#dc2626" strokeWidth="2.2" />
        {/* Weißes Georgskreuz */}
        <line x1="15" y1="0" x2="15" y2="20" stroke="#ffffff" strokeWidth="6" />
        <line x1="0" y1="10" x2="30" y2="10" stroke="#ffffff" strokeWidth="6" />
        {/* Rotes Georgskreuz */}
        <line x1="15" y1="0" x2="15" y2="20" stroke="#dc2626" strokeWidth="3.2" />
        <line x1="0" y1="10" x2="30" y2="10" stroke="#dc2626" strokeWidth="3.2" />
      </g>
      <rect x="0" y="0" width="60" height="40" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
    </svg>
  );
};

/**
 * ✈️ EXPEDITIONS-DOPPELDECKER / JET-SPRITE (0,1% Vektor-Goldstandard)
 * Ultraschlanker SVG-Flugzeugkörper für 60 FPS Bézier-Fluganimationen.
 * Nase zeigt nach Norden (0° = nach oben, 90° Drehung bei atan2).
 */
export const AirplaneSprite: React.FC<{ size?: number; fill?: string; stroke?: string }> = ({
  size = 28,
  fill = '#ffffff',
  stroke = '#0284c7'
}) => {
  return (
    <g transform={`scale(${size / 24}) translate(-12, -12)`} aria-label="Expeditions-Flugzeug">
      {/* Sanfter Flugzeugschatten auf Meereshöhe */}
      <ellipse cx="12" cy="19.5" rx="8.5" ry="3.2" fill="rgba(15, 23, 42, 0.26)" />

      {/* Triebwerksgondeln unter den Tragflächen mit goldenen Austrittsdüsen */}
      <rect x="7" y="10.8" width="2.2" height="4.6" rx="1.1" fill="#f8fafc" stroke={stroke} strokeWidth="0.8" />
      <circle cx="8.1" cy="15.4" r="0.75" fill="#f59e0b" />
      <rect x="14.8" y="10.8" width="2.2" height="4.6" rx="1.1" fill="#f8fafc" stroke={stroke} strokeWidth="0.8" />
      <circle cx="15.9" cy="15.4" r="0.75" fill="#f59e0b" />

      {/* Aerodynamischer Rumpf und pfeilförmige Tragflächen */}
      <path
        d="M12 1.5 C13 1.5 14 2.8 14 5.5 L14 10.5 L22.5 14.8 L22.5 16.8 L14 14.5 L14 19.8 L17 22 L17 23.2 L12 22.2 L7 23.2 L7 22 L10 19.8 L10 14.5 L1.5 16.8 L1.5 14.8 L10 10.5 L10 5.5 C10 2.8 11 1.5 12 1.5 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.25"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Tragflächen-Lichtkante & Profilierung */}
      <line x1="6.5" y1="13.8" x2="17.5" y2="13.8" stroke={stroke} strokeWidth="0.75" opacity={0.65} />

      {/* Positionsleuchten an den Tragflächenenden (Backbord Rot / Steuerbord Grün) */}
      <circle cx="1.6" cy="15.8" r="0.8" fill="#ef4444" />
      <circle cx="22.4" cy="15.8" r="0.8" fill="#22c55e" />

      {/* Piloten-Cockpitkanzel mit Glanzreflex */}
      <path d="M11 4.5 C11.5 3.8 12.5 3.8 13 4.5 L13.3 7 L10.7 7 Z" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.5" />
      <line x1="11.5" y1="4.8" x2="12.5" y2="4.8" stroke="#ffffff" strokeWidth="0.6" strokeLinecap="round" />

      {/* Heckleitwerk-Gold-Emblem */}
      <polygon points="12,19.2 11.2,21.4 12.8,21.4" fill="#f59e0b" />
    </g>
  );
};

/**
 * 🗺️ KONTINENT-POLYGON-DATEN FÜR DIE 2D-ABENTEUERKARTE (Breite / Länge)
 * 0,1% Kartografie-Goldstandard basierend auf Natural Earth 110m Vektortopologie.
 * Präzise Küstenlinien, Binnenmeere, Inselbögen (Hawaii, Kuba, Japan, UK) und Halbinseln.
 */
const CONTINENT_GEO_POLYGONS: Array<{ id: string; points: Array<[number, number]>; fill: string }> = [
  // =========================================================================
  // 1. EUROPA & SKANDINAVIEN (Echter Stiefel, Iberien, Bretagne, Ägäis)
  // =========================================================================
  {
    id: 'europe-main',
    fill: '#bfdbfe',
    points: [
      // Gibraltar & Iberische Halbinsel
      [36.0, -5.3], [36.7, -4.5], [36.8, -2.2], [38.0, -0.5], [39.5, -0.3], [41.2, 1.8], [42.4, 3.2],
      // Frankreich Mittelmeer
      [43.3, 5.0], [43.7, 7.3],
      // Italien: Ligurien, Rom, Neapel, Stiefelspitze (Kalabrien) & Sohle
      [44.4, 8.9], [43.6, 10.3], [41.9, 12.0], [40.8, 14.3], [38.9, 16.1], [38.2, 15.7],
      [39.8, 16.5], [40.5, 17.2], [40.1, 18.5], [41.3, 16.8], [43.6, 13.5], [45.4, 12.3], [45.7, 13.7],
      // Balkan, Kroatien, Albanien, Griechenland (Peloponnes & Attika)
      [44.5, 15.0], [43.0, 16.5], [42.0, 18.5], [41.0, 19.5], [39.0, 20.5],
      [38.2, 21.7], [36.5, 22.5], [37.5, 23.2], [38.0, 24.0],
      [39.5, 23.0], [40.5, 23.0], [40.9, 25.0], [41.0, 28.5],
      // Schwarzes Meer Westküste (Bulgarien, Rumänien, Ukraine)
      [42.5, 27.5], [44.2, 28.7], [45.3, 29.7], [46.5, 30.7], [45.2, 36.5], [47.0, 39.0],
      // Osteuropa Grenze nach Norden
      [52.0, 40.0], [56.0, 42.0], [60.0, 40.0], [64.0, 38.0],
      // Weißes Meer & Finnland-Grenze
      [65.0, 35.0], [64.5, 36.5], [65.5, 34.5],
      // Baltikum & Ostseeküste (Polen, Deutschland)
      [60.5, 28.0], [59.5, 24.8], [58.0, 22.5], [56.5, 21.0], [54.5, 19.0],
      [54.5, 12.0],
      // Dänemark / Jütland
      [55.5, 10.0], [57.7, 10.6], [54.8, 8.5],
      // Nordseeküste: Deutschland, Niederlande, Belgien
      [53.5, 7.5], [51.4, 3.5],
      // Frankreich Ärmelkanal: Normandie & Bretagne
      [50.9, 1.8], [49.3, -0.5], [48.7, -3.0], [48.0, -4.5],
      // Biskaya & Nordspanien
      [46.0, -1.2], [43.4, -1.8], [43.4, -4.0],
      // Galizien & Portugal
      [43.8, -8.0], [43.0, -9.3], [41.1, -8.6], [38.7, -9.4], [37.0, -9.0], [36.2, -6.0], [36.0, -5.3]
    ]
  },
  {
    id: 'british-isles',
    fill: '#bfdbfe',
    points: [
      [50.1, -5.7], [50.6, -3.5], [50.8, 0.0], [51.3, 1.4],
      [51.7, 1.2], [52.8, 1.7], [53.0, 0.3], [54.1, -0.2], [55.0, -1.5],
      [56.0, -2.8], [57.1, -2.1], [58.6, -3.1], [58.6, -5.0],
      [57.5, -5.8], [56.4, -5.5], [55.5, -4.8], [54.8, -3.6], [53.3, -4.3],
      [51.6, -5.0], [51.5, -3.2], [51.2, -3.5], [50.3, -4.8], [50.1, -5.7]
    ]
  },
  {
    id: 'ireland',
    fill: '#bfdbfe',
    points: [
      [51.4, -9.6], [52.0, -10.4], [53.2, -9.5], [54.3, -10.0], [55.3, -7.4],
      [55.2, -6.2], [54.6, -5.6], [53.3, -6.0], [52.2, -6.3], [51.8, -8.3], [51.4, -9.6]
    ]
  },
  {
    id: 'scandinavia',
    fill: '#bfdbfe',
    points: [
      [58.0, 8.0], [59.0, 5.5], [60.5, 5.0], [62.5, 6.0], [65.0, 12.0], [68.0, 14.5],
      [70.0, 20.0], [71.2, 25.8], [70.5, 30.0], [69.8, 31.5], [67.0, 41.0], [65.0, 39.0],
      [64.0, 36.0], [60.5, 28.0], [60.0, 22.0], [63.0, 21.0], [65.5, 24.5],
      [65.0, 21.5], [63.0, 19.0], [60.5, 17.5], [59.3, 18.2], [56.5, 16.3],
      [55.4, 13.0], [56.0, 12.6], [57.7, 11.9], [58.0, 8.0]
    ]
  },
  {
    id: 'iceland',
    fill: '#bfdbfe',
    points: [
      [66.5, -23.0], [66.5, -14.0], [64.0, -13.5], [63.4, -19.0], [64.2, -22.7], [65.5, -24.5], [66.5, -23.0]
    ]
  },
  {
    id: 'med-sicily',
    fill: '#bfdbfe',
    points: [
      [38.2, 15.5], [37.2, 15.2], [36.7, 14.5], [37.6, 12.4], [38.2, 13.3], [38.2, 15.5]
    ]
  },
  {
    id: 'med-sardinia',
    fill: '#bfdbfe',
    points: [
      [41.3, 9.3], [39.1, 9.2], [38.9, 8.6], [40.9, 8.2], [41.3, 9.3]
    ]
  },
  {
    id: 'med-corsica',
    fill: '#bfdbfe',
    points: [
      [43.0, 9.4], [41.4, 9.2], [41.6, 8.8], [42.6, 8.7], [43.0, 9.4]
    ]
  },

  // =========================================================================
  // 2. AFRIKA (Golf von Guinea, Senegal, Kap der Guten Hoffnung, Horn von Afrika)
  // =========================================================================
  {
    id: 'africa',
    fill: '#fef08a',
    points: [
      [35.8, -5.3], [30.4, -9.6], [26.0, -14.5], [20.8, -17.0],
      // Senegal / Kap Verde Halbinsel
      [14.7, -17.5], [11.8, -15.6], [9.5, -13.7], [6.5, -11.0], [4.4, -7.7],
      // Golf von Guinea (Elfenbeinküste, Ghana, Nigeria)
      [5.3, -4.0], [5.5, -0.2], [4.5, 6.0], [4.8, 8.5], [4.0, 9.2],
      // Äquatorialafrika & Angola
      [0.5, 9.3], [-1.0, 9.0], [-6.0, 12.2], [-12.5, 13.4], [-17.0, 11.8],
      // Namibia & Südafrika (Kapstadt & Durban)
      [-22.5, 14.4], [-28.6, 16.4], [-34.0, 18.4], [-34.8, 20.0], [-34.0, 25.7], [-29.9, 31.0],
      // Ostafrika (Mosambik, Tansania, Kenia)
      [-25.9, 32.6], [-15.0, 40.7], [-10.5, 40.5], [-6.8, 39.3], [-4.0, 39.7], [-1.5, 41.5],
      // Horn von Afrika (Somalia)
      [2.0, 45.3], [5.0, 48.5], [11.8, 51.3], [11.6, 50.0], [11.5, 43.1],
      // Rotes Meer Westküste bis Ägypten
      [12.5, 43.2], [15.6, 39.5], [20.0, 37.2], [24.0, 35.5], [27.5, 33.8], [29.9, 32.5],
      // Nildelta & Nordafrika Mittelmeerküste
      [31.2, 32.3], [31.5, 30.5], [31.2, 27.0], [32.0, 24.0], [31.0, 20.0], [32.8, 13.2],
      [33.0, 11.5], [37.0, 11.0], [37.3, 9.8], [36.8, 7.8], [36.8, 3.0], [35.8, -5.3]
    ]
  },
  {
    id: 'madagascar',
    fill: '#fef08a',
    points: [
      [-12.0, 49.3], [-15.5, 50.5], [-20.0, 48.8], [-25.6, 47.0],
      [-25.2, 44.5], [-20.0, 43.5], [-16.0, 44.5], [-12.0, 49.3]
    ]
  },

  // =========================================================================
  // 3. ASIEN & ORIENT (Arabien, Indien, Indochina, China, Korea, Sibirien)
  // =========================================================================
  {
    id: 'arabia',
    fill: '#fbcfe8',
    points: [
      [29.9, 32.5], [28.0, 35.0], [21.5, 39.1], [16.8, 42.5], [12.6, 43.4],
      [12.8, 45.0], [14.5, 49.0], [17.0, 55.0], [22.5, 59.8], [26.2, 56.4],
      [25.3, 55.3], [26.5, 50.1], [29.0, 48.3], [30.0, 48.5], [31.5, 35.5], [29.9, 32.5]
    ]
  },
  {
    id: 'asia-main',
    fill: '#fbcfe8',
    points: [
      // Anatolien & Levante
      [41.5, 41.5], [37.0, 36.0], [33.5, 35.2], [31.5, 35.5], [30.0, 48.5],
      // Persischer Golf & Pakistan
      [29.0, 50.0], [27.0, 56.0], [25.2, 60.5], [25.0, 66.5], [24.0, 67.5],
      // Indischer Subkontinent (Gujarat, Mumbai, Kerala, Kanyakumari, Tamil Nadu, Bengal)
      [23.0, 69.0], [21.0, 70.0], [21.5, 72.5], [19.0, 72.8], [15.5, 73.8],
      [10.0, 76.2], [8.1, 77.5], [10.0, 79.8], [13.1, 80.3], [16.0, 81.5],
      [17.7, 83.3], [20.0, 86.0], [21.8, 88.0], [22.5, 89.5],
      // Myanmar & Malaiische Halbinsel
      [20.5, 92.5], [16.5, 94.5], [16.0, 97.5], [10.0, 98.5], [5.0, 100.5],
      [1.3, 103.8], [4.0, 103.5], [8.0, 100.0],
      // Indochina & Vietnam
      [10.5, 103.5], [12.0, 101.0], [9.0, 105.0], [10.8, 108.0], [16.0, 108.2], [21.0, 107.5],
      // Ostasien (China, Jangtse-Delta, Shandong)
      [21.5, 111.0], [22.3, 114.2], [24.5, 118.5], [28.0, 121.5], [31.5, 121.8],
      [35.0, 119.5], [37.5, 122.5], [37.0, 118.0], [39.0, 118.0], [39.0, 122.0],
      // Korea
      [38.0, 125.0], [35.0, 126.0], [34.5, 128.5], [36.0, 129.5], [38.0, 128.5], [40.0, 128.0],
      // Russischer Ferner Osten & Kamtschatka
      [43.0, 132.0], [50.0, 140.0], [55.0, 136.0], [59.0, 145.0], [60.0, 160.0],
      [57.0, 157.0], [51.0, 157.0], [56.0, 163.0], [60.0, 166.0],
      // Tschuktschen-Halbinsel / Beringstraße
      [65.0, 175.0], [66.0, 170.0],
      // Arktisküste Sibiriens
      [70.0, 178.0], [72.0, 150.0], [73.0, 125.0], [76.0, 100.0], [73.0, 80.0], [70.0, 60.0],
      // Ural / Kaspisches Meer Nord
      [60.0, 55.0], [50.0, 50.0], [45.0, 48.0], [41.5, 41.5]
    ]
  },
  {
    id: 'sri-lanka',
    fill: '#fbcfe8',
    points: [
      [9.8, 80.2], [8.6, 81.2], [6.0, 80.6], [6.9, 79.8], [8.5, 79.8], [9.8, 80.2]
    ]
  },
  // Japan (Inselkette: Honshu, Hokkaido, Kyushu/Shikoku)
  {
    id: 'japan-honshu',
    fill: '#fbcfe8',
    points: [
      [35.0, 132.0], [34.0, 131.0], [34.5, 135.5], [35.0, 139.0], [36.5, 140.8],
      [40.5, 141.5], [41.5, 141.0], [38.5, 139.0], [36.5, 136.5], [35.5, 134.0], [35.0, 132.0]
    ]
  },
  {
    id: 'japan-hokkaido',
    fill: '#fbcfe8',
    points: [
      [42.0, 140.0], [42.0, 143.5], [43.5, 145.5], [45.5, 142.0], [43.5, 141.0], [42.0, 140.0]
    ]
  },
  {
    id: 'japan-kyushu',
    fill: '#fbcfe8',
    points: [
      [33.8, 130.5], [31.5, 130.5], [31.5, 131.5], [33.5, 132.0], [33.5, 134.5], [34.3, 134.0], [33.8, 132.5]
    ]
  },
  // Südostasien Inseln
  {
    id: 'indonesia-sumatra',
    fill: '#fbcfe8',
    points: [
      [5.5, 95.5], [3.0, 99.0], [-1.0, 104.0], [-5.5, 105.5], [-4.0, 102.5], [0.0, 99.0], [5.5, 95.5]
    ]
  },
  {
    id: 'indonesia-java',
    fill: '#fbcfe8',
    points: [
      [-6.0, 106.0], [-6.5, 108.5], [-7.0, 112.5], [-8.5, 114.0], [-8.0, 110.0], [-7.0, 106.5], [-6.0, 106.0]
    ]
  },
  {
    id: 'indonesia-borneo',
    fill: '#fbcfe8',
    points: [
      [4.0, 109.5], [7.0, 117.0], [4.5, 118.5], [-1.0, 117.0], [-4.0, 114.5], [-3.0, 110.5], [1.5, 109.0], [4.0, 109.5]
    ]
  },
  {
    id: 'philippines',
    fill: '#fbcfe8',
    points: [
      [18.5, 121.5], [14.5, 121.0], [13.0, 124.0], [8.0, 126.0], [6.0, 125.0], [7.5, 122.0], [10.5, 122.5], [18.5, 121.5]
    ]
  },

  // =========================================================================
  // 4. NORDAMERIKA (Alaska, Hudson Bay, Florida, Baja California, Mexiko)
  // =========================================================================
  {
    id: 'north-america',
    fill: '#fed7aa',
    points: [
      // Alaska & Pazifikküste
      [71.3, -156.5], [69.0, -165.0], [65.5, -168.0], [58.5, -162.0], [55.0, -165.0],
      [57.0, -153.0], [60.0, -145.0], [58.3, -134.4], [54.5, -130.5],
      // US Westküste
      [49.0, -125.0], [48.0, -124.7], [46.2, -124.0], [40.5, -124.5], [37.8, -122.5], [32.8, -117.2],
      // Baja California & Westmexiko
      [32.5, -117.0], [28.0, -114.5], [23.0, -110.0], [24.0, -107.0], [20.5, -105.5], [16.8, -100.0], [14.5, -92.5],
      // Mittelamerika
      [8.5, -83.0], [8.0, -77.5], [9.0, -79.5], [9.5, -82.5], [12.0, -83.5], [15.5, -85.0], [16.0, -88.0],
      // Yucatan & Golf von Mexiko
      [18.5, -88.0], [21.5, -87.0], [19.0, -91.0], [19.2, -96.1], [22.0, -97.8], [26.0, -97.2], [29.5, -94.5], [29.5, -89.5],
      // Halbinsel Florida
      [30.4, -87.2], [30.0, -84.0], [27.9, -82.5], [25.0, -81.0], [25.8, -80.2],
      // US Ostküste
      [28.4, -80.6], [30.3, -81.7], [32.8, -79.9], [35.2, -75.5], [37.0, -76.0], [40.7, -74.0], [42.0, -70.0], [44.5, -67.5],
      // Kanada Ostküste & Hudson Bay
      [45.0, -61.0], [48.0, -64.0], [52.0, -56.0], [60.0, -64.0],
      [62.0, -78.0], [58.0, -80.0], [52.0, -82.0], [55.0, -92.0], [63.0, -90.0],
      // Arktisküste
      [69.0, -90.0], [70.0, -120.0], [69.0, -135.0], [70.0, -141.0], [71.3, -156.5]
    ]
  },
  {
    id: 'greenland',
    fill: '#fed7aa',
    points: [
      [83.5, -33.0], [81.0, -18.0], [76.0, -20.0], [70.0, -22.0],
      [59.8, -44.0], [64.2, -51.7], [69.0, -53.0], [77.0, -68.0], [83.5, -33.0]
    ]
  },
  // Karibik: Kuba & Hispaniola
  {
    id: 'caribbean-cuba',
    fill: '#fed7aa',
    points: [
      [23.2, -82.4], [23.1, -81.0], [22.5, -78.5], [21.5, -77.0], [20.2, -74.2],
      [19.9, -75.8], [20.3, -77.3], [22.0, -80.5], [22.0, -84.5], [21.8, -84.9],
      [22.8, -83.5], [23.2, -82.4]
    ]
  },
  {
    id: 'caribbean-hispaniola',
    fill: '#fed7aa',
    points: [
      [19.8, -72.0], [19.8, -69.0], [18.4, -68.5], [18.2, -71.5], [18.5, -74.5], [19.8, -72.0]
    ]
  },

  // =========================================================================
  // 5. SÜDAMERIKA (Brasilien, Peru, Anden, La Plata, Feuerland)
  // =========================================================================
  {
    id: 'south-america',
    fill: '#fdba74',
    points: [
      // Karibikküste & Venezuela
      [8.0, -77.0], [11.5, -73.0], [11.0, -71.5], [10.5, -62.0], [8.5, -60.0], [6.0, -55.0], [4.5, -52.0],
      // Amazonas-Mündung & Nordost-Brasilien
      [1.0, -50.0], [-0.5, -48.0], [-3.0, -41.0], [-5.0, -35.5], [-8.0, -35.0],
      // Rio de Janeiro, Santos, Südbrasilien
      [-13.0, -38.5], [-23.0, -43.2], [-24.0, -46.5], [-27.5, -48.5], [-32.0, -52.0],
      // Uruguay, Buenos Aires & Patagonien
      [-34.5, -54.0], [-35.0, -56.0], [-34.5, -58.0], [-36.0, -57.5], [-39.0, -62.0], [-43.0, -65.0],
      [-46.0, -67.0], [-50.0, -69.0],
      // Feuerland / Kap Hoorn
      [-54.0, -68.0], [-55.5, -67.5], [-54.0, -71.0], [-52.0, -75.0],
      // Chilenische Fjorde & Pazifikküste
      [-48.0, -75.0], [-42.0, -74.0], [-33.0, -71.6], [-23.5, -70.5], [-18.5, -70.3],
      // Peru-Küste & Ecuador
      [-12.0, -77.0], [-8.0, -79.0], [-5.0, -81.0], [-1.5, -81.0], [1.5, -79.0], [4.0, -77.5], [8.0, -77.0]
    ]
  },

  // =========================================================================
  // 6. AUSTRALIEN & OZEANIEN (Carpentaria, Tasmanien, Neuseeland, Hawaii)
  // =========================================================================
  {
    id: 'australia',
    fill: '#a7f3d0',
    points: [
      // Cape York & Ostküste
      [-10.7, 142.5], [-16.9, 145.8], [-27.5, 153.0], [-33.8, 151.2], [-37.5, 150.0],
      // Melbourne & Große Australische Bucht
      [-38.5, 145.0], [-38.5, 141.0], [-35.5, 138.5], [-33.0, 137.5], [-35.0, 136.0],
      [-32.0, 132.0], [-33.0, 124.0],
      // Perth & Westküste
      [-34.0, 122.0], [-34.4, 115.1], [-32.0, 115.8], [-28.5, 114.5], [-26.0, 113.0], [-22.0, 114.0],
      // Nordwestküste & Darwin
      [-21.5, 114.0], [-20.5, 117.0], [-18.0, 122.0], [-15.0, 125.0], [-12.4, 130.8],
      // Golf von Carpentaria
      [-12.0, 133.0], [-12.0, 136.5], [-15.0, 136.0], [-17.5, 140.0], [-14.0, 141.5], [-10.7, 142.5]
    ]
  },
  {
    id: 'oceania-tasmania',
    fill: '#a7f3d0',
    points: [
      [-40.8, 145.0], [-40.8, 148.0], [-43.0, 148.0], [-43.6, 146.5], [-42.0, 145.0], [-40.8, 145.0]
    ]
  },
  {
    id: 'new-zealand-north',
    fill: '#a7f3d0',
    points: [
      [-34.4, 173.0], [-36.0, 175.5], [-37.5, 178.5], [-39.5, 177.0],
      [-41.3, 174.8], [-39.0, 174.0], [-37.0, 174.5], [-34.4, 173.0]
    ]
  },
  {
    id: 'new-zealand-south',
    fill: '#a7f3d0',
    points: [
      [-40.5, 173.0], [-41.5, 174.2], [-43.5, 173.0], [-45.8, 170.5],
      [-46.6, 168.5], [-46.0, 166.5], [-42.0, 171.5], [-40.5, 173.0]
    ]
  },
  // Hawaii Inselkette (Big Island, Maui, Oahu, Kauai)
  {
    id: 'oceania-hawaii-bigisland',
    fill: '#a7f3d0',
    points: [
      [20.2, -155.8], [19.8, -155.0], [19.2, -155.5], [19.0, -155.9], [19.6, -156.0], [20.2, -155.8]
    ]
  },
  {
    id: 'oceania-hawaii-maui',
    fill: '#a7f3d0',
    points: [
      [20.9, -156.6], [20.7, -156.0], [20.6, -156.4], [20.9, -156.6]
    ]
  },
  {
    id: 'oceania-hawaii-oahu',
    fill: '#a7f3d0',
    points: [
      [21.7, -158.0], [21.3, -157.7], [21.3, -158.1], [21.6, -158.3], [21.7, -158.0]
    ]
  },
  {
    id: 'oceania-hawaii-kauai',
    fill: '#a7f3d0',
    points: [
      [22.2, -159.5], [21.9, -159.3], [21.9, -159.7], [22.2, -159.5]
    ]
  },

  // =========================================================================
  // 7. BINNENGEWÄSSER (Schneiden Meere zur sauberen Kontinenttrennung aus)
  // =========================================================================
  {
    id: 'water-black-sea',
    fill: '#e0f2fe',
    points: [
      [46.5, 31.0], [45.0, 36.5], [43.5, 40.5], [41.2, 38.0],
      [41.2, 29.5], [43.0, 28.0], [45.0, 29.8], [46.5, 31.0]
    ]
  },
  {
    id: 'water-caspian-sea',
    fill: '#e0f2fe',
    points: [
      [47.0, 51.5], [44.5, 50.5], [40.0, 53.0], [37.0, 54.0],
      [37.5, 50.0], [40.5, 49.5], [44.0, 47.5], [47.0, 51.5]
    ]
  }
];

/**
 * 🔭 KONTINENT-VIEWBOXEN (0,1% Zoom- & Fokus-Geometrie auf 1200 × 580 Basis)
 * Erlaubt butterweiches Hereinzoomen in Kontinente ohne Qualitätsverlust.
 */
export const CONTINENT_VIEWBOXES: Record<ContinentId | 'all', { x: number; y: number; w: number; h: number }> = {
  all: { x: 0, y: 0, w: 1200, h: 580 },
  europe: { x: 440, y: 20, w: 400, h: 260 },
  americas: { x: 30, y: 30, w: 540, h: 510 },
  africa: { x: 450, y: 130, w: 450, h: 410 },
  asia: { x: 670, y: 30, w: 510, h: 400 },
  oceania: { x: 740, y: 190, w: 450, h: 370 }
};

export const WorldTourMapSpread: React.FC<WorldTourMapSpreadProps> = ({
  onBackToHub,
  studentId,
  studentName = 'Musikschüler',
  studentInstrument = 'Gitarre',
  studentAvatarUrl,
  uiLevel = 'teen',
  isMobileView = false,
  onMasteryAchieved
}) => {
  const [activeView, setActiveView] = useState<'map' | 'score'>('map');
  const [selectedContinent, setSelectedContinent] = useState<ContinentId | 'all'>('all');
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('DE');
  const [currentLandedCountryCode, setCurrentLandedCountryCode] = useState<string>('DE');
  const [isFlying, setIsFlying] = useState(false);
  const [flightState, setFlightState] = useState<{
    fromCode: string;
    toCode: string;
    startX: number;
    startY: number;
    midX: number;
    midY: number;
    endX: number;
    endY: number;
    currentX: number;
    currentY: number;
    angleDeg: number;
    progress: number;
    trail: Array<{ x: number; y: number; opacity: number }>;
  } | null>(null);
  const [touchdownCountryCode, setTouchdownCountryCode] = useState<string | null>(null);
  const flightAnimRef = useRef<number | null>(null);

  // 🎥 Kontinent-Kamera ViewBox (Butterweicher 60 FPS Zoom)
  const [viewBox, setViewBox] = useState<{ x: number; y: number; w: number; h: number }>(CONTINENT_VIEWBOXES.all);
  const targetViewBoxRef = useRef<{ x: number; y: number; w: number; h: number }>(CONTINENT_VIEWBOXES.all);
  const currentViewBoxRef = useRef<{ x: number; y: number; w: number; h: number }>(CONTINENT_VIEWBOXES.all);
  const zoomAnimRef = useRef<number | null>(null);

  const [progressMap, setProgressMap] = useState<Record<string, WorldTourStudentProgress>>({});
  const [, setIsLoading] = useState(true);
  const [isDiplomaOpen, setIsDiplomaOpen] = useState(false);
  const [isPassportOpen, setIsPassportOpen] = useState(false);
  const [isStoryPlaying, setIsStoryPlaying] = useState(false);
  const [hoveredCountryCode, setHoveredCountryCode] = useState<string | null>(null);
  const [hoveredFlightDestCode, setHoveredFlightDestCode] = useState<string | null>(null);
  const [isWidgetCollapsed, setIsWidgetCollapsed] = useState(false);
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  // 🔬 Zoom-adaptive Pin-Skalierung: Verhindert Pin-Gigantismus und Medaillon-Überlappung bei regionalem Zoom (z. B. Europa)
  const pinScale = useMemo(() => {
    return Math.max(0.68, Math.min(1.0, Math.pow(viewBox.w / 1200, 0.45)));
  }, [viewBox.w]);

  // 🔭 Butterweicher rAF-Kamerazoom zu einer Ziel-ViewBox
  const animateViewBoxTo = useCallback((target: { x: number; y: number; w: number; h: number }) => {
    targetViewBoxRef.current = target;
    if (zoomAnimRef.current) cancelAnimationFrame(zoomAnimRef.current);

    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      currentViewBoxRef.current = target;
      setViewBox(target);
      return;
    }

    const start = { ...currentViewBoxRef.current };
    const startTime = performance.now();
    const duration = 460;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const rawT = Math.min(elapsed / duration, 1);
      const t = 1 - Math.pow(1 - rawT, 3); // Cubic ease out

      const next = {
        x: start.x + (target.x - start.x) * t,
        y: start.y + (target.y - start.y) * t,
        w: start.w + (target.w - start.w) * t,
        h: start.h + (target.h - start.h) * t
      };

      currentViewBoxRef.current = next;
      setViewBox(next);

      if (rawT < 1) {
        zoomAnimRef.current = requestAnimationFrame(step);
      }
    };

    zoomAnimRef.current = requestAnimationFrame(step);
  }, []);

  // Clean up zoom animation on unmount
  useEffect(() => {
    return () => {
      if (zoomAnimRef.current) {
        cancelAnimationFrame(zoomAnimRef.current);
      }
    };
  }, []);

  // Load student progress
  useEffect(() => {
    let isMounted = true;
    WorldTourService.fetchStudentProgress(studentId).then(res => {
      if (isMounted) {
        setProgressMap(res);
        setIsLoading(false);
        // Falls bereits Länder gemeistert sind, landet das Flugzeug beim zuletzt freigeschalteten
        const mastered = Object.keys(res).filter(c => (res[c]?.stars ?? 0) >= 1);
        if (mastered.length > 0 && !res['DE']) {
          const lastMastered = mastered[mastered.length - 1];
          setCurrentLandedCountryCode(lastMastered);
          setSelectedCountryCode(lastMastered);
        }
      }
    });
    return () => { isMounted = false; };
  }, [studentId]);

  const activeCountry = useMemo(() => {
    return WORLD_TOUR_COUNTRIES.find(c => c.code === selectedCountryCode) || WORLD_TOUR_COUNTRIES[0];
  }, [selectedCountryCode]);

  const schoolStats = useMemo(() => {
    return WorldTourService.calculateSchoolWorldMilestone(progressMap);
  }, [progressMap]);

  // 🧭 Simple & schlichter Quest-Wegweiser für gesperrte Wunschländer (kürzester Flugpfad ab Standort)
  const shortestRouteToActive = useMemo(() => {
    const isLanded = activeCountry.code === currentLandedCountryCode;
    const isAccessible = WorldTourFlightEngine.isCountryAccessible(activeCountry.code, progressMap);
    if (isLanded || isAccessible) return null;
    return WorldTourFlightEngine.findShortestRoute(currentLandedCountryCode, activeCountry.code);
  }, [activeCountry.code, currentLandedCountryCode, progressMap]);

  const jingleCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      if (jingleCtxRef.current && jingleCtxRef.current.state !== 'closed') {
        jingleCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // 🎵 Web Audio Kultur-Jingle (Shared Context Pool gegen Hardware-Exhaustion)
  const playCultureJingle = useCallback((frequencies: number[]) => {
    try {
      if (!jingleCtxRef.current || jingleCtxRef.current.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        jingleCtxRef.current = new AudioCtx();
      }
      const ctx = jingleCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;

      frequencies.forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.2 / frequencies.length, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 1.25);
      });
    } catch {
      // Graceful degradation
    }
  }, []);

  const handleMasteryAchieved = useCallback((stars: number, score: number, xp: number) => {
    setProgressMap(prev => {
      const existing = prev[activeCountry.code];
      const finalStars = Math.max(existing?.stars ?? 0, stars);
      const finalScore = Math.max(existing?.bestScorePercent ?? 0, score);
      const isUnlocked = finalStars >= 1 || Boolean(existing?.isUnlocked);
      return {
        ...prev,
        [activeCountry.code]: {
          countryCode: activeCountry.code,
          stars: finalStars,
          bestScorePercent: finalScore,
          bestTempoBpm: Math.max(existing?.bestTempoBpm ?? 0, activeCountry.score.defaultBpm),
          instrument: studentInstrument || existing?.instrument || undefined,
          isUnlocked,
          unlockedAt: existing?.unlockedAt || (isUnlocked ? new Date().toISOString() : undefined)
        }
      };
    });
    onMasteryAchieved?.(stars, score, xp, activeCountry.code);
  }, [activeCountry.code, activeCountry.score.defaultBpm, studentInstrument, onMasteryAchieved]);

  // Kontinent-Auswahl & Animierter Fokus-Zoom
  const handleSelectContinent = useCallback((contId: ContinentId | 'all') => {
    setSelectedContinent(contId);
    animateViewBoxTo(CONTINENT_VIEWBOXES[contId]);
    if (contId !== 'all') {
      const firstCountry = WORLD_TOUR_COUNTRIES.find(c => c.continent === contId);
      if (firstCountry) {
        setSelectedCountryCode(firstCountry.code);
        if (firstCountry.audioJingleFrequencies) {
          playCultureJingle(firstCountry.audioJingleFrequencies);
        }
      }
    }
  }, [animateViewBoxTo, playCultureJingle]);

  // 🎵 Audio-Story abspielen (15 Sekunden didaktische Entdecker-Anekdote)

  const handlePlayStory = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (!isStoryPlaying) {
        const utterance = new SpeechSynthesisUtterance(activeCountry.story15s);
        utterance.lang = 'de-DE';
        utterance.rate = 0.95;
        utterance.onend = () => setIsStoryPlaying(false);
        utterance.onerror = () => setIsStoryPlaying(false);
        setIsStoryPlaying(true);
        window.speechSynthesis.speak(utterance);
      } else {
        setIsStoryPlaying(false);
      }
    }
  };

  const activeProgress = progressMap[activeCountry.code];
  const activeStars = activeProgress?.stars ?? 0;
  const totalMasteredCountries = useMemo(() => {
    return Object.values(progressMap).filter(p => (p.stars ?? 0) > 0).length;
  }, [progressMap]);

  // ✈️ Piloten-Meilen & Didaktischer Expeditions-Rang
  const pilotStats = useMemo(() => {
    return WorldTourFlightEngine.calculatePilotStats(progressMap);
  }, [progressMap]);

  // 🗺️ 2D KONTINENTE NACH DEM 0,1% SCHWEIZER KARTOGRAFIE-GOLDSTANDARD
  const landmasses2D = useMemo(() => {
    return CONTINENT_GEO_POLYGONS.map(land => {
      const points = land.points.map(([lat, lon]) => {
        const x = ((lon + 180) / 360) * 1140 + 30;
        const y = ((90 - lat) / 180) * 480 + 40;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' L ');

      const isWater = land.id.includes('water') || land.id.includes('sea');
      const isEurope = land.id.includes('europe') || land.id.includes('british') || land.id.includes('ireland') || land.id.includes('scandinavia') || land.id.includes('sicily') || land.id.includes('sardinia') || land.id.includes('corsica') || land.id.includes('iceland');
      const isAfrica = land.id.includes('africa') || land.id.includes('madagascar');
      const isAsia = land.id.includes('asia') || land.id.includes('japan') || land.id.includes('arabia') || land.id.includes('sri-lanka') || land.id.includes('indonesia') || land.id.includes('philippines');
      const isNorthAmerica = land.id.includes('north-america') || land.id.includes('greenland') || land.id.includes('cuba') || land.id.includes('caribbean');
      const isSouthAmerica = land.id.includes('south-america');
      const isOceania = land.id.includes('australia') || land.id.includes('tasmania') || land.id.includes('new-zealand') || land.id.includes('hawaii');

      let fill = '#c7d2fe';
      let stroke = '#4f46e5';

      if (isWater) {
        fill = '#e0f2fe';
        stroke = '#bae6fd';
      } else if (isEurope) {
        // EUROPA: Klassik- & EU-Blau (Match zum blauen Button #3b82f6 & EU-Flagge)
        fill = '#bfdbfe';
        stroke = '#2563eb';
      } else if (isAfrica) {
        // AFRIKA: Savannengold (Match zum goldgelben Button #eab308)
        fill = '#fef08a';
        stroke = '#ca8a04';
      } else if (isAsia) {
        // ASIEN & ORIENT: Seidenstraßen-Lotus-Pink (Match zum pinken Button #ec4899)
        fill = '#fbcfe8';
        stroke = '#db2777';
      } else if (isNorthAmerica) {
        // AMERIKA (Nord): Warmes Bernstein (Match zum orangen Button #f59e0b)
        fill = '#fed7aa';
        stroke = '#ea580c';
      } else if (isSouthAmerica) {
        // AMERIKA (Süd): Sanftes Terracotta-Pfirsich (Harmonische Familie mit Nordamerika & Kante #ea580c)
        fill = '#fdba74';
        stroke = '#ea580c';
      } else if (isOceania) {
        // OZEANIEN: Südsee-Smaragdgrün (Match zum grünen Button #10b981)
        fill = '#a7f3d0';
        stroke = '#059669';
      }

      const isContinentSelected =
        selectedContinent === 'all' ||
        (selectedContinent === 'europe' && isEurope) ||
        (selectedContinent === 'africa' && isAfrica) ||
        (selectedContinent === 'asia' && isAsia) ||
        (selectedContinent === 'americas' && (isNorthAmerica || isSouthAmerica)) ||
        (selectedContinent === 'oceania' && isOceania);

      return {
        id: land.id,
        isWater,
        fill,
        stroke,
        opacity: isWater ? 1 : isContinentSelected ? 0.95 : 0.35,
        d: `M ${points} Z`
      };
    });
  }, [selectedContinent]);

  // 🗺️ 2D PINS MIT WGS84 GPS-PROJEKTION & ELASTISCHER ANTI-KOLLISION (42px Mindestabstand mit 8 Durchläufen)
  const pins2D = useMemo(() => {
    const validCountries = (WORLD_TOUR_COUNTRIES || []).filter(c => 
      Boolean(c && c.geoCoordinates && typeof c.geoCoordinates.lat === 'number' && typeof c.geoCoordinates.lon === 'number')
    );
    const list = validCountries.map(country => {
      // Kanonische WGS84 Equirectangular-Projektion (1200 × 580 SVG)
      const coords = country.geoCoordinates || { lat: 0, lon: 0 };
      const baseX = ((coords.lon + 180) / 360) * 1140 + 30;
      const baseY = ((90 - coords.lat) / 180) * 480 + 40;
      return {
        country,
        baseX,
        baseY,
        x: baseX,
        y: baseY,
        isMoved: false
      };
    });

    const minDistance = 42; // Barrierefreie 42px Mindestdistanz
    for (let pass = 0; pass < 8; pass++) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const dx = list[j].x - list[i].x;
          const dy = list[j].y - list[i].y;
          const dist = Math.hypot(dx, dy);
          if (dist < minDistance && dist > 0.001) {
            const overlap = (minDistance - dist) / 2;
            const nx = dx / dist;
            const ny = dy / dist;
            list[i].x -= nx * overlap * 0.7;
            list[i].y -= ny * overlap * 0.7;
            list[j].x += nx * overlap * 0.7;
            list[j].y += ny * overlap * 0.7;
          }
        }
      }
    }

    list.forEach(item => {
      const displacement = Math.hypot(item.x - item.baseX, item.y - item.baseY);
      item.isMoved = displacement > 4;
    });

    return list;
  }, []);

  // 🎥 Aviation Cinema Auto-Framing: Richtet Kamera sanft auf den gesamten Flugkorridor aus (Anti-Occlusion)
  const frameFlightCorridor = useCallback((fromCountryCode: string, toCountryCode: string) => {
    const p1 = pins2D.find(p => p.country.code === fromCountryCode);
    const p2 = pins2D.find(p => p.country.code === toCountryCode);
    if (!p1 || !p2) return;

    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);

    const padX = 130;
    const padTop = 60;
    const padBottom = 160; // 160px unterer Puffer garantiert, dass der Ziel-Pin immer frei über dem Dock liegt

    const neededW = (maxX - minX) + padX * 2;
    const neededH = (maxY - minY) + padTop + padBottom;

    // Großzügige Mindestbreite 680px verhindert übermäßig engen Nahbereichs-Zoom
    const targetW = Math.max(neededW, neededH * 2.069, 680);
    const targetH = targetW / 2.069;

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2 - (padBottom - padTop) * 0.35;

    const x = Math.max(0, Math.min(1200 - targetW, centerX - targetW / 2));
    const y = Math.max(0, Math.min(580 - targetH, centerY - targetH / 2));

    animateViewBoxTo({ x, y, w: targetW, h: targetH });
  }, [pins2D, animateViewBoxTo]);

  // 🔍 Sanfter Regionen-Fokus auf ein gewähltes Land
  const focusCountry = useCallback((countryCode: string) => {
    const pin = pins2D.find(p => p.country.code === countryCode);
    if (!pin) return;
    const targetW = 720;
    const targetH = targetW / 2.069; // ~348
    const x = Math.max(0, Math.min(1200 - targetW, pin.x - targetW / 2));
    const y = Math.max(0, Math.min(580 - targetH, pin.y - targetH / 2 - 25));
    animateViewBoxTo({ x, y, w: targetW, h: targetH });
  }, [pins2D, animateViewBoxTo]);

  // Klick auf ein Land: Wählt das Land aus, fokussiert die Region und spielt den Jingle ab!
  const handleCountryPinClick = useCallback((country: WorldTourCountry) => {
    setSelectedCountryCode(country.code);
    focusCountry(country.code);
    const frequencies = country.audioJingleFrequencies || [261.63, 329.63, 392.00];
    playCultureJingle(frequencies);
  }, [focusCountry, playCultureJingle]);

  // 🛫 Web Audio Flugzeug-Sound (Zero-Server, synthetisierter Turbine-/Wind-Effekt)
  const playTakeoffSound = useCallback(() => {
    try {
      if (!jingleCtxRef.current || jingleCtxRef.current.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        jingleCtxRef.current = new AudioCtx();
      }
      const ctx = jingleCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.6);
      osc.frequency.exponentialRampToValueAtTime(300, now + 1.2);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.07, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.25);
    } catch {
      // Graceful degradation
    }
  }, []);

  // ✈️ 60 FPS BÉZIER-FLUGANIMATION (GPU-beschleunigt mit Aviation Cinema Begleitfahrt)
  const startFlight = useCallback((targetCountryCode: string) => {
    if (isFlying || targetCountryCode === currentLandedCountryCode) return;

    const fromPin = pins2D.find(p => p.country.code === currentLandedCountryCode);
    const toPin = pins2D.find(p => p.country.code === targetCountryCode);
    if (!fromPin || !toPin) {
      setSelectedCountryCode(targetCountryCode);
      setCurrentLandedCountryCode(targetCountryCode);
      return;
    }

    // 🎥 Aviation Cinema Flight Tracking: Kamera richtet sich sofort auf den Flugkorridor aus
    frameFlightCorridor(currentLandedCountryCode, targetCountryCode);

    // BFSG 2025 / WCAG 2.2: Barrierefreier Reduced-Motion Bypass
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setCurrentLandedCountryCode(targetCountryCode);
      setSelectedCountryCode(targetCountryCode);
      setTouchdownCountryCode(targetCountryCode);
      focusCountry(targetCountryCode);
      playTakeoffSound();
      const targetCountry = WORLD_TOUR_COUNTRIES.find(c => c.code === targetCountryCode);
      if (targetCountry?.audioJingleFrequencies) {
        playCultureJingle(targetCountry.audioJingleFrequencies);
      }
      setTimeout(() => setTouchdownCountryCode(null), 1200);
      return;
    }

    const arc = WorldTourFlightEngine.calculateFlightArc(fromPin.x, fromPin.y, toPin.x, toPin.y);
    const durationMs = Math.min(Math.max(arc.distance * 2.8, 900), 1600);
    const startTime = performance.now();

    setIsFlying(true);
    playTakeoffSound();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const rawT = Math.min(elapsed / durationMs, 1);
      // Easing: Smooth Cubic In-Out
      const t = rawT < 0.5 ? 4 * rawT * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 3) / 2;

      // Quadratische Bézier-Punktberechnung: B(t) = (1-t)^2 P0 + 2(1-t)t Pmid + t^2 P1
      const invT = 1 - t;
      const curX = invT * invT * fromPin.x + 2 * invT * t * arc.midX + t * t * toPin.x;
      const curY = invT * invT * fromPin.y + 2 * invT * t * arc.midY + t * t * toPin.y;

      // Ableitung für Ausrichtungswinkel
      const tangentX = 2 * invT * (arc.midX - fromPin.x) + 2 * t * (toPin.x - arc.midX);
      const tangentY = 2 * invT * (arc.midY - fromPin.y) + 2 * t * (toPin.y - arc.midY);
      const angleDeg = (Math.atan2(tangentY, tangentX) * 180) / Math.PI + 90;

      setFlightState(prev => {
        const newTrail = prev ? [{ x: curX, y: curY, opacity: 0.8 }, ...prev.trail.slice(0, 7)] : [{ x: curX, y: curY, opacity: 0.8 }];
        return {
          fromCode: currentLandedCountryCode,
          toCode: targetCountryCode,
          startX: fromPin.x,
          startY: fromPin.y,
          midX: arc.midX,
          midY: arc.midY,
          endX: toPin.x,
          endY: toPin.y,
          currentX: curX,
          currentY: curY,
          angleDeg,
          progress: t,
          trail: newTrail.map((p, i) => ({ ...p, opacity: Math.max(0, 0.8 - i * 0.1) }))
        };
      });

      if (rawT < 1) {
        flightAnimRef.current = requestAnimationFrame(animate);
      } else {
        // 🛬 TOUCHDOWN & ERFOLGREICHE LANDUNG
        setIsFlying(false);
        setFlightState(null);
        setCurrentLandedCountryCode(targetCountryCode);
        setSelectedCountryCode(targetCountryCode);
        setTouchdownCountryCode(targetCountryCode);
        focusCountry(targetCountryCode);

        // Kultureller Lande-Jingle
        const targetCountry = WORLD_TOUR_COUNTRIES.find(c => c.code === targetCountryCode);
        if (targetCountry?.audioJingleFrequencies) {
          playCultureJingle(targetCountry.audioJingleFrequencies);
        }

        setTimeout(() => {
          setTouchdownCountryCode(null);
        }, 1200);
      }
    };

    flightAnimRef.current = requestAnimationFrame(animate);
  }, [isFlying, currentLandedCountryCode, pins2D, frameFlightCorridor, focusCountry, playTakeoffSound, playCultureJingle]);

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (flightAnimRef.current) {
        cancelAnimationFrame(flightAnimRef.current);
      }
    };
  }, []);

  // ✈️ 2D FLUGNETZWERK-KANTEN (Deduplizierte Bézier-Bögen aller 21 Stationen)
  const flightRoutes2D = useMemo(() => {
    const routeMap = new Map<string, { fromCode: string; toCode: string; key: string }>();

    Object.entries(FLIGHT_CONNECTIONS_GRAPH).forEach(([fromCode, neighbors]) => {
      neighbors.forEach(toCode => {
        const sortedKey = [fromCode, toCode].sort().join('-');
        if (!routeMap.has(sortedKey)) {
          routeMap.set(sortedKey, { fromCode, toCode, key: sortedKey });
        }
      });
    });

    const pinCoords: Record<string, { x: number; y: number }> = {};
    pins2D.forEach(p => {
      pinCoords[p.country.code] = { x: p.x, y: p.y };
    });

    const routes: Array<{
      key: string;
      fromCode: string;
      toCode: string;
      d: string;
      isHighlighted: boolean;
      isHovered: boolean;
      isActiveFlight: boolean;
      isAccessible: boolean;
      isMastered: boolean;
      distanceKm: number;
    }> = [];

    routeMap.forEach(({ fromCode, toCode, key }) => {
      const p1 = pinCoords[fromCode];
      const p2 = pinCoords[toCode];
      if (!p1 || !p2) return;

      const arc = WorldTourFlightEngine.calculateFlightArc(p1.x, p1.y, p2.x, p2.y);
      const routeInfo = WorldTourFlightEngine.getRouteInfo(fromCode, toCode);

      const fromAccessible = WorldTourFlightEngine.isCountryAccessible(fromCode, progressMap);
      const toAccessible = WorldTourFlightEngine.isCountryAccessible(toCode, progressMap);
      const isAccessible = fromAccessible && toAccessible;

      const fromMastered = Boolean(progressMap[fromCode] && (progressMap[fromCode].stars ?? 0) >= 1);
      const toMastered = Boolean(progressMap[toCode] && (progressMap[toCode].stars ?? 0) >= 1);
      const isMastered = fromMastered && toMastered;

      // Ist diese Route aktiv zwischen dem aktuellen Standort und dem ausgewählten Ziel?
      const isHighlighted =
        (fromCode === currentLandedCountryCode && toCode === selectedCountryCode) ||
        (toCode === currentLandedCountryCode && fromCode === selectedCountryCode);

      // Hovert der Schüler im Widget über diese Route (Radar-Coupling)?
      const isHovered = Boolean(
        hoveredFlightDestCode &&
        ((fromCode === currentLandedCountryCode && toCode === hoveredFlightDestCode) ||
         (toCode === currentLandedCountryCode && fromCode === hoveredFlightDestCode))
      );

      // Fliegt das Flugzeug gerade auf dieser Route?
      const isActiveFlight = Boolean(
        flightState &&
        ((flightState.fromCode === fromCode && flightState.toCode === toCode) ||
         (flightState.fromCode === toCode && flightState.toCode === fromCode))
      );

      routes.push({
        key,
        fromCode,
        toCode,
        d: arc.d,
        isHighlighted,
        isHovered,
        isActiveFlight,
        isAccessible,
        isMastered,
        distanceKm: routeInfo.distanceKm
      });
    });

    return routes;
  }, [pins2D, progressMap, currentLandedCountryCode, selectedCountryCode, flightState, hoveredFlightDestCode]);

  const landedPin = useMemo(() => {
    return pins2D.find(p => p.country.code === currentLandedCountryCode);
  }, [pins2D, currentLandedCountryCode]);

  const touchdownPin = useMemo(() => {
    if (!touchdownCountryCode) return null;
    return pins2D.find(p => p.country.code === touchdownCountryCode) || null;
  }, [pins2D, touchdownCountryCode]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: activeView === 'map' ? 'radial-gradient(ellipse at 50% 45%, #f0fdf4 0%, #e0f2fe 65%, #dbeafe 100%)' : '#fcfaf7',
      position: 'relative',
      overflow: 'hidden',
      color: '#0f172a',
      userSelect: 'none'
    }}>
      {/* 🧭 Top Expeditions-HUD Header (nur in der Weltkarten-Übersicht) */}
      {activeView === 'map' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: isMobileView ? '10px 14px' : '12px 24px',
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1.5px solid #cbd5e1',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
          zIndex: 20
        }}>
          {/* Navigation & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {onBackToHub && (
              <button
                onClick={onBackToHub}
                aria-label="Zurück zum Studio"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '12px',
                  background: '#f1f5f9',
                  border: '1.5px solid #cbd5e1',
                  color: '#0f172a',
                  fontWeight: 750,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  touchAction: 'manipulation'
                }}
                className="hover-scale"
              >
                <ArrowLeft size={16} />
                <span>Studio</span>
              </button>
            )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#e0f2fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0284c7'
            }}>
              <Compass size={19} strokeWidth={2.4} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
                Expeditions-Atlas • Weltreise der Klänge
              </h2>
              <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 650 }}>
                Entdecke alle 21 Kultur-Stationen im globalen 2D-Überblick
              </span>
            </div>
          </div>
        </div>

        {/* HUD Progress Badges & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '100px',
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            fontSize: '0.80rem',
            fontWeight: 800,
            color: '#0f172a'
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Trophy size={14} color="#0284c7" strokeWidth={2.4} />
              <span>{totalMasteredCountries} / {WORLD_TOUR_COUNTRIES.length} Meisterwerke</span>
            </span>
            <span style={{ opacity: 0.35 }}>•</span>
            <span style={{ color: '#b45309', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={14} color="#b45309" strokeWidth={2.4} />
              <span>{schoolStats.totalXP} XP</span>
            </span>
          </div>

          {/* ✈️ Piloten-Meilen & Expeditions-Rang */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '100px',
            background: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)',
            border: '1.5px solid #7dd3fc',
            fontSize: '0.80rem',
            fontWeight: 800,
            color: '#0369a1'
          }}>
            <span style={{ fontSize: '0.92rem' }}>{pilotStats.rankBadge}</span>
            <span>{pilotStats.totalKm.toLocaleString('de-DE')} km</span>
            <span style={{ opacity: 0.35 }}>•</span>
            <span style={{ color: '#0f172a', fontWeight: 850 }}>{pilotStats.rankTitle}</span>
          </div>

          {/* 🏫 Kollektiver Schul-Meilenstein (simple, schlicht & gemeinschaftsstiftend) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '100px',
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            fontSize: '0.80rem',
            fontWeight: 800,
            color: '#0f172a'
          }} title={`Gemeinsam mit deiner Musikschule erforscht: ${schoolStats.unlockedCount} von ${WORLD_TOUR_COUNTRIES.length} Stationen!`}>
            <span style={{ fontSize: '0.86rem' }}>🏫</span>
            <span>Schule: <strong>{schoolStats.unlockedCount} / {WORLD_TOUR_COUNTRIES.length}</strong></span>
          </div>

          <button
            onClick={() => setIsPassportOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 15px',
              borderRadius: '100px',
              background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
              border: '1px solid #3b82f6',
              color: '#ffffff',
              fontWeight: 850,
              fontSize: '0.78rem',
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(30, 58, 138, 0.35)',
              touchAction: 'manipulation'
            }}
            className="hover-scale"
            title="Öffne deinen persönlichen Expeditions-Reisepass mit allen 21 Stempeln"
          >
            <BookOpen size={14} color="#60a5fa" strokeWidth={2.4} />
            <span>Mein Reisepass ({totalMasteredCountries} / {WORLD_TOUR_COUNTRIES.length})</span>
          </button>
        </div>

        {/* Kontinent-Schnellreise Buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          overflowX: 'auto',
          width: '100%',
          paddingTop: '6px'
        }} className="custom-scrollbar">
          <button
            onClick={() => handleSelectContinent('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '100px',
              fontSize: '0.76rem',
              fontWeight: 800,
              border: selectedContinent === 'all' ? '2px solid #0284c7' : '1px solid #cbd5e1',
              background: selectedContinent === 'all' ? '#0284c7' : '#ffffff',
              color: selectedContinent === 'all' ? '#ffffff' : '#334155',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <Globe size={13} strokeWidth={2.4} />
            <span>Weltübersicht</span>
          </button>
          {CONTINENTS.map(cont => {
            const isSelected = selectedContinent === cont.id;
            return (
              <button
                key={cont.id}
                onClick={() => handleSelectContinent(cont.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '100px',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  border: isSelected ? `2px solid ${cont.color}` : '1px solid #cbd5e1',
                  background: isSelected ? cont.color : '#ffffff',
                  color: isSelected ? '#ffffff' : '#334155',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: isSelected ? `0 2px 10px ${cont.color}50` : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: isSelected ? '#ffffff' : cont.color,
                  display: 'inline-block'
                }} />
                <span>{cont.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* ========================================================================= */}
      {/* ANSICHT 1: 2D ILLUSTRIERTE ABENTEUER-WELTKARTE (1200 × 580 SVG)          */}
      {/* ========================================================================= */}
      {activeView === 'map' ? (
        <div style={{
          flex: 1,
          width: '100%',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          <svg
            viewBox={`${viewBox.x.toFixed(1)} ${viewBox.y.toFixed(1)} ${viewBox.w.toFixed(1)} ${viewBox.h.toFixed(1)}`}
            style={{
              width: '100%',
              height: '100%',
              maxHeight: 'calc(100vh - 160px)',
              overflow: 'hidden',
              pointerEvents: 'auto'
            }}
          >
            <defs>
              <style>{`
                @keyframes planeFloat {
                  0%, 100% { transform: translateY(0px) rotate(0deg); }
                  50% { transform: translateY(-4px) rotate(1.2deg); }
                }
              `}</style>
              <filter id="medallionShadow" x="-25%" y="-25%" width="150%" height="150%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.18" floodColor="#0f172a" />
              </filter>
              <filter id="medallionGlow" x="-35%" y="-35%" width="170%" height="170%">
                <feDropShadow dx="0" dy="0" stdDeviation="6" floodOpacity="0.85" floodColor="#facc15" />
              </filter>
              <clipPath id="flagClipCircle">
                <circle cx="0" cy="0" r="17.5" />
              </clipPath>
              {/* Meeres-Gradient & Tiefenlicht */}
              <linearGradient id="oceanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f0f9ff" />
                <stop offset="50%" stopColor="#e0f2fe" />
                <stop offset="100%" stopColor="#dbeafe" />
              </linearGradient>
            </defs>

            {/* 1. Ruhiger Ozean-Hintergrund mit edlem Meeresgradient & abgerundeten Ecken (Klick = Zoom-Reset) */}
            <rect
              x="15"
              y="15"
              width="1170"
              height="550"
              rx="24"
              fill="url(#oceanGradient)"
              stroke="#93c5fd"
              strokeWidth="1.5"
              style={{ cursor: selectedContinent !== 'all' || viewBox.w < 1150 ? 'pointer' : 'default' }}
              onClick={() => handleSelectContinent('all')}
            >
              {(selectedContinent !== 'all' || viewBox.w < 1150) && (
                <title>Klick auf Ozean: Zurück zur Weltansicht</title>
              )}
            </rect>

            {/* 2. Küstensaum & Kontinentalschelf (Shallow Bathymetry Glow) */}
            <g opacity={selectedContinent === 'all' ? 0.65 : 0.4} pointerEvents="none">
              {landmasses2D.filter(l => !l.isWater).map(land => (
                <path
                  key={`shelf-outer-${land.id}`}
                  d={land.d}
                  fill="none"
                  stroke="#7dd3fc"
                  strokeWidth="8"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity="0.35"
                />
              ))}
              {landmasses2D.filter(l => !l.isWater).map(land => (
                <path
                  key={`shelf-inner-${land.id}`}
                  d={land.d}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity="0.25"
                />
              ))}
            </g>

            {/* 2.1 Sanft ziehende Expeditions-Wolken über den Ozeanen (0 Server-Last, GPU-gestützt) */}
            <g pointerEvents="none" opacity="0.28">
              <g style={{ animation: 'cloudDriftSlow 120s linear infinite' }}>
                <path
                  d="M 20 0 Q 35 -14 55 -10 Q 70 -22 92 -12 Q 110 -20 128 -10 Q 145 -12 155 0 Q 160 14 145 18 Q 120 22 90 18 Q 50 22 35 16 Z"
                  fill="#ffffff"
                />
              </g>
              <g style={{ animation: 'cloudDriftMid 90s linear infinite', animationDelay: '-45s' }}>
                <path
                  d="M 30 0 Q 45 -16 70 -12 Q 90 -26 115 -16 Q 135 -24 155 -12 Q 175 -16 185 0 Q 192 16 172 22 Q 140 26 105 22 Q 60 26 42 18 Z"
                  fill="#ffffff"
                />
              </g>
              <g style={{ animation: 'cloudDriftFast 75s linear infinite', animationDelay: '-20s' }}>
                <path
                  d="M 15 0 Q 28 -10 44 -8 Q 58 -18 76 -10 Q 92 -18 108 -8 Q 120 -10 128 0 Q 134 12 120 16 Q 98 20 68 16 Q 36 20 20 14 Z"
                  fill="#ffffff"
                />
              </g>
            </g>

            {/* 3. Gradnetz (Graticule) nach internationaler IHO-Kartografie */}
            <g pointerEvents="none" opacity="0.6">
              {/* Meridiane alle 30° */}
              {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map(lon => {
                const x = ((lon + 180) / 360) * 1140 + 30;
                const isPrime = lon === 0;
                return (
                  <line
                    key={`meridian-${lon}`}
                    x1={x}
                    y1={25}
                    x2={x}
                    y2={555}
                    stroke={isPrime ? '#0284c7' : '#bae6fd'}
                    strokeWidth={isPrime ? 1.0 : 0.6}
                    strokeDasharray={isPrime ? '5 3' : '3 3'}
                    opacity={isPrime ? 0.75 : 0.45}
                  />
                );
              })}

              {/* Parallelen alle 30° */}
              {[-60, -30, 30, 60].map(lat => {
                const y = ((90 - lat) / 180) * 480 + 40;
                return (
                  <line
                    key={`parallel-${lat}`}
                    x1={25}
                    y1={y}
                    x2={1175}
                    y2={y}
                    stroke="#bae6fd"
                    strokeWidth={0.6}
                    strokeDasharray="3 3"
                    opacity={0.45}
                  />
                );
              })}

              {/* Nördlicher Wendekreis (23.44° N) */}
              <line
                x1={25}
                y1={((90 - 23.44) / 180) * 480 + 40}
                x2={1175}
                y2={((90 - 23.44) / 180) * 480 + 40}
                stroke="#f59e0b"
                strokeWidth={0.8}
                strokeDasharray="4 4"
                opacity={0.45}
              />
              <text
                x="32"
                y={((90 - 23.44) / 180) * 480 + 37}
                fontSize="7"
                fontWeight="700"
                fill="#d97706"
                opacity="0.8"
                letterSpacing="0.06em"
              >
                23.5° N • WENDEKREIS DES KREBSES
              </text>

              {/* Äquator (0°) - Die goldene Referenzlinie */}
              <line
                x1={25}
                y1={280}
                x2={1175}
                y2={280}
                stroke="#0284c7"
                strokeWidth={1.2}
                strokeDasharray="6 4"
                opacity={0.7}
              />
              <text
                x="32"
                y="276"
                fontSize="8"
                fontWeight="850"
                fill="#0284c7"
                letterSpacing="0.08em"
              >
                0° ÄQUATOR
              </text>
              <text
                x="1168"
                y="276"
                textAnchor="end"
                fontSize="8"
                fontWeight="850"
                fill="#0284c7"
                letterSpacing="0.08em"
              >
                EQUATOR • 0°
              </text>

              {/* Südlicher Wendekreis (23.44° S) */}
              <line
                x1={25}
                y1={((90 - (-23.44)) / 180) * 480 + 40}
                x2={1175}
                y2={((90 - (-23.44)) / 180) * 480 + 40}
                stroke="#f59e0b"
                strokeWidth={0.8}
                strokeDasharray="4 4"
                opacity={0.45}
              />
              <text
                x="32"
                y={((90 - (-23.44)) / 180) * 480 + 37}
                fontSize="7"
                fontWeight="700"
                fill="#d97706"
                opacity="0.8"
                letterSpacing="0.06em"
              >
                23.5° S • WENDEKREIS DES STEINBOCKS
              </text>
            </g>

            {/* 4. Kontinente der Erde (Natural Earth Topologie & Schweizer Farbpalette) */}
            {landmasses2D.map(land => (
              <path
                key={land.id}
                d={land.d}
                fill={land.fill}
                stroke={land.stroke}
                strokeWidth={land.isWater ? 1 : 1.2}
                opacity={land.opacity}
                style={{ transition: 'opacity 0.25s ease' }}
              />
            ))}

            {/* 5. Nautische Windrose (Compass Rose) im Südpazifik */}
            <g transform="translate(180, 425)" pointerEvents="none" opacity="0.6">
              <circle r="25" fill="none" stroke="#bae6fd" strokeWidth="1.2" />
              <circle r="22" fill="none" stroke="#38bdf8" strokeWidth="0.6" strokeDasharray="1.5 1.5" />
              <circle r="5" fill="#ffffff" stroke="#0284c7" strokeWidth="1.2" />

              {/* Hauptstrahlen N, S, E, W */}
              <polygon points="0,0 -3,-5 0,-23" fill="#0284c7" />
              <polygon points="0,0 3,-5 0,-23" fill="#93c5fd" />
              <polygon points="0,0 3,5 0,23" fill="#0284c7" />
              <polygon points="0,0 -3,5 0,23" fill="#93c5fd" />
              <polygon points="0,0 5,-3 23,0" fill="#0284c7" />
              <polygon points="0,0 5,3 23,0" fill="#93c5fd" />
              <polygon points="0,0 -5,3 -23,0" fill="#0284c7" />
              <polygon points="0,0 -5,-3 -23,0" fill="#93c5fd" />

              {/* Diagonale Strahlen NE, NW, SE, SW */}
              <polygon points="0,0 2,-3 13,-13" fill="#64748b" opacity="0.65" />
              <polygon points="0,0 3,-2 13,-13" fill="#cbd5e1" opacity="0.65" />
              <polygon points="0,0 -2,-3 -13,-13" fill="#64748b" opacity="0.65" />
              <polygon points="0,0 -3,-2 -13,-13" fill="#cbd5e1" opacity="0.65" />
              <polygon points="0,0 2,3 13,13" fill="#64748b" opacity="0.65" />
              <polygon points="0,0 3,2 13,13" fill="#cbd5e1" opacity="0.65" />
              <polygon points="0,0 -2,3 -13,13" fill="#64748b" opacity="0.65" />
              <polygon points="0,0 -3,2 -13,13" fill="#cbd5e1" opacity="0.65" />

              <text x="0" y="-26" textAnchor="middle" fontSize="7.5" fontWeight="900" fill="#0284c7">N</text>
              <text x="27" y="3" textAnchor="middle" fontSize="6" fontWeight="800" fill="#64748b">E</text>
              <text x="0" y="32" textAnchor="middle" fontSize="6" fontWeight="800" fill="#64748b">S</text>
              <text x="-27" y="3" textAnchor="middle" fontSize="6" fontWeight="800" fill="#64748b">W</text>
            </g>

            {/* 6. Doppelter Atlas-Rahmen & Breitengrad-/Längengrad-Ticks */}
            <rect x="15" y="15" width="1170" height="550" rx="24" fill="none" stroke="#bae6fd" strokeWidth="2" pointerEvents="none" />
            <rect x="20" y="20" width="1160" height="540" rx="20" fill="none" stroke="#e0f2fe" strokeWidth="1" strokeDasharray="6 3" pointerEvents="none" />

            {/* Breitengrad-Ticks (links & rechts) */}
            {[
              { label: '60°N', y: ((90 - 60) / 180) * 480 + 40 },
              { label: '30°N', y: ((90 - 30) / 180) * 480 + 40 },
              { label: '30°S', y: ((90 - (-30)) / 180) * 480 + 40 },
              { label: '60°S', y: ((90 - (-60)) / 180) * 480 + 40 }
            ].map(tick => (
              <g key={`lat-tick-${tick.label}`} pointerEvents="none" opacity="0.75">
                <line x1="15" y1={tick.y} x2="20" y2={tick.y} stroke="#0284c7" strokeWidth="1.2" />
                <line x1="1180" y1={tick.y} x2="1185" y2={tick.y} stroke="#0284c7" strokeWidth="1.2" />
                <text x="23" y={tick.y + 3} fontSize="6.5" fontWeight="700" fill="#64748b">{tick.label}</text>
                <text x="1177" y={tick.y + 3} textAnchor="end" fontSize="6.5" fontWeight="700" fill="#64748b">{tick.label}</text>
              </g>
            ))}

            {/* Längengrad-Ticks (oben & unten) */}
            {[
              { label: '120°W', x: ((-120 + 180) / 360) * 1140 + 30 },
              { label: '60°W', x: ((-60 + 180) / 360) * 1140 + 30 },
              { label: '0°', x: 600 },
              { label: '60°E', x: ((60 + 180) / 360) * 1140 + 30 },
              { label: '120°E', x: ((120 + 180) / 360) * 1140 + 30 }
            ].map(tick => (
              <g key={`lon-tick-${tick.label}`} pointerEvents="none" opacity="0.75">
                <line x1={tick.x} y1="15" x2={tick.x} y2="20" stroke="#0284c7" strokeWidth="1.2" />
                <line x1={tick.x} y1="560" x2={tick.x} y2="565" stroke="#0284c7" strokeWidth="1.2" />
                <text x={tick.x} y="28" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="#64748b">{tick.label}</text>
                <text x={tick.x} y="556" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="#64748b">{tick.label}</text>
              </g>
            ))}

            {/* 7. Keyframe-Definitionen für Vektor-Fluglinien & Radar-Pulse */}
            <style>{`
              @keyframes flightDash {
                to {
                  stroke-dashoffset: -20;
                }
              }
              @keyframes flightParticles {
                from {
                  stroke-dashoffset: 40;
                }
                to {
                  stroke-dashoffset: 0;
                }
              }
              @keyframes planeFloat {
                0%, 100% { transform: translateY(0px) rotate(-18deg); }
                50% { transform: translateY(-5px) rotate(-14deg); }
              }
              @keyframes cloudDriftSlow {
                0% { transform: translate(-220px, 90px); }
                100% { transform: translate(1280px, 90px); }
              }
              @keyframes cloudDriftMid {
                0% { transform: translate(-220px, 290px); }
                100% { transform: translate(1280px, 290px); }
              }
              @keyframes cloudDriftFast {
                0% { transform: translate(-220px, 460px); }
                100% { transform: translate(1280px, 460px); }
              }
            `}</style>

            {/* 8. Ruhiges, 2-stufiges Flugrouten-Netzwerk (Kein Spinnennetz-Flimmern mehr) */}
            <g pointerEvents="none">
              {flightRoutes2D.map(route => {
                const isHeroRoute = route.isActiveFlight || route.isHovered || route.isHighlighted;

                let stroke = '#94a3b8';
                let strokeWidth = 0.75;
                let strokeDasharray = '2 4';
                let opacity = 0.16;

                if (route.isActiveFlight) {
                  stroke = '#facc15';
                  strokeWidth = 3.2;
                  strokeDasharray = '6 3';
                  opacity = 1;
                } else if (route.isHovered) {
                  stroke = '#facc15';
                  strokeWidth = 3.0;
                  strokeDasharray = '6 3';
                  opacity = 0.98;
                } else if (route.isHighlighted) {
                  stroke = '#0284c7';
                  strokeWidth = 2.4;
                  strokeDasharray = '5 3';
                  opacity = 0.92;
                } else if (route.isMastered) {
                  stroke = '#86efac';
                  strokeWidth = 1.0;
                  strokeDasharray = '3 3';
                  opacity = 0.35;
                } else if (route.isAccessible) {
                  stroke = '#7dd3fc';
                  strokeWidth = 0.85;
                  strokeDasharray = '3 3';
                  opacity = 0.28;
                }

                return (
                  <g key={`route-group-${route.key}`}>
                    {/* Basis-Fluglinie */}
                    <path
                      d={route.d}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      strokeDasharray={strokeDasharray}
                      strokeLinecap="round"
                      opacity={opacity}
                      style={{
                        transition: 'all 0.25s ease',
                        animation: isHeroRoute ? 'flightDash 1.2s linear infinite' : 'none'
                      }}
                    />

                    {/* Dynamische FlightRadar-Lichtpartikel NUR auf aktiven Hero-Routen */}
                    {isHeroRoute && (
                      <path
                        d={route.d}
                        fill="none"
                        stroke={route.isActiveFlight || route.isHovered ? '#fef08a' : '#7dd3fc'}
                        strokeWidth={route.isActiveFlight || route.isHovered ? 3.4 : 2.4}
                        strokeDasharray="6 14"
                        strokeLinecap="round"
                        opacity={0.95}
                        style={{
                          animation: `flightParticles ${route.isActiveFlight ? '0.7s' : '1.1s'} linear infinite`
                        }}
                      />
                    )}
                  </g>
                );
              })}
            </g>

            {/* 9. Geparktes Flugzeug & 'Mein Flugzeug' Beacon am aktuellen Standort (wenn nicht im Flug) */}
            {!flightState && landedPin && (
              <g transform={`translate(${landedPin.x}, ${landedPin.y}) scale(${pinScale})`} pointerEvents="none">
                {/* Konzentrische Radar-Wellen des Funkfeuers */}
                <circle cx="0" cy="0" r="18" fill="none" stroke="#0284c7" strokeWidth="2.2">
                  <animate attributeName="r" values="18;48" dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.9;0" dur="2.4s" repeatCount="indefinite" />
                </circle>
                <circle cx="0" cy="0" r="18" fill="none" stroke="#38bdf8" strokeWidth="1.6">
                  <animate attributeName="r" values="18;64" dur="2.4s" begin="0.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.75;0" dur="2.4s" begin="0.8s" repeatCount="indefinite" />
                </circle>

                {/* Schwebendes Flugzeug-Sprite mit Schatten (100% reine Vektor-Grafik, Zero-Text) */}
                <g
                  transform="translate(18, -20)"
                  style={{ animation: 'planeFloat 3s ease-in-out infinite' }}
                >
                  <AirplaneSprite size={36} fill="#ffffff" stroke="#0284c7" />
                </g>
              </g>
            )}

            {/* 10. Fliegendes Flugzeug im Reiseflug mit Kondensstreifen */}
            {flightState && (
              <g pointerEvents="none">
                {/* Kondensstreifen (Trail) */}
                {flightState.trail.map((pt, i) => (
                  <circle
                    key={`flight-trail-${i}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={Math.max(1.2, (3.4 - i * 0.35) * pinScale)}
                    fill="#ffffff"
                    stroke="#38bdf8"
                    strokeWidth="0.8"
                    opacity={pt.opacity}
                  />
                ))}
                {/* Flugzeug Vektor */}
                <g transform={`translate(${flightState.currentX}, ${flightState.currentY}) rotate(${flightState.angleDeg}) scale(${pinScale})`}>
                  <AirplaneSprite size={30} fill="#ffffff" stroke="#0284c7" />
                </g>
              </g>
            )}

            {/* 11. Touchdown-Feier-Ripples bei erfolgreicher Landung */}
            {touchdownPin && (
              <g transform={`translate(${touchdownPin.x}, ${touchdownPin.y}) scale(${pinScale})`} pointerEvents="none">
                <circle cx="0" cy="0" r="18" fill="none" stroke="#22c55e" strokeWidth="3">
                  <animate attributeName="r" values="18;48" dur="0.9s" repeatCount="1" />
                  <animate attributeName="opacity" values="1;0" dur="0.9s" repeatCount="1" />
                </circle>
                <circle cx="0" cy="0" r="18" fill="none" stroke="#facc15" strokeWidth="2.2">
                  <animate attributeName="r" values="18;64" dur="1.1s" repeatCount="1" />
                  <animate attributeName="opacity" values="0.85;0" dur="1.1s" repeatCount="1" />
                </circle>
              </g>
            )}

            {/* 12. Interaktive Flaggen-Medaillons aller 21 Stationen (Zoom-Adaptiv skaliert) */}
            {pins2D.map(({ country, baseX, baseY, x, y, isMoved }) => {
              const isSelected = selectedCountryCode === country.code;
              const isLanded = currentLandedCountryCode === country.code;
              const isHovered = hoveredCountryCode === country.code;
              const progress = progressMap[country.code];
              const stars = progress?.stars ?? 0;
              const isMastered = stars > 0;
              const isAccessible = WorldTourFlightEngine.isCountryAccessible(country.code, progressMap);
              const canFlyHere = WorldTourFlightEngine.canFlyDirectly(currentLandedCountryCode, country.code, progressMap);
              const isContinentMatch = selectedContinent === 'all' || country.continent === selectedContinent;

              const pinOpacity = !isContinentMatch ? 0.22 : !isAccessible ? 0.42 : 1;

              let borderColor = '#94a3b8';
              let borderWidth = 1.4;
              if (isSelected) {
                borderColor = '#facc15';
                borderWidth = 3.2;
              } else if (isLanded) {
                borderColor = '#0284c7';
                borderWidth = 3.0;
              } else if (canFlyHere) {
                borderColor = '#38bdf8';
                borderWidth = 2.4;
              } else if (isMastered) {
                borderColor = '#22c55e';
                borderWidth = 1.8;
              }

              const ariaDesc = isLanded
                ? `Station ${country.name}, aktueller Standort. ${country.pieceTitle}. ${isMastered ? stars + ' Sterne' : 'Noch zu meistern'}`
                : canFlyHere
                ? `Station ${country.name}, Flugroute verfügbar. ${country.pieceTitle}.`
                : !isAccessible
                ? `Station ${country.name}, Route noch gesperrt. Meistere zuerst ein Nachbarland.`
                : `Station ${country.name}, ${country.pieceTitle}.`;

              return (
                <g
                  key={country.code}
                  role="button"
                  tabIndex={0}
                  aria-label={ariaDesc}
                  transform={`translate(${x}, ${y})`}
                  opacity={pinOpacity}
                  onClick={e => {
                    e.stopPropagation();
                    handleCountryPinClick(country);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCountryPinClick(country);
                    }
                  }}
                  onMouseEnter={() => setHoveredCountryCode(country.code)}
                  onMouseLeave={() => setHoveredCountryCode(null)}
                  onFocus={() => setHoveredCountryCode(country.code)}
                  onBlur={() => setHoveredCountryCode(null)}
                  style={{ cursor: 'pointer', outline: 'none', transition: 'opacity 0.2s ease' }}
                >
                  {/* Leader-Line zum echten geografischen Bodenpunkt bei Auslenkung */}
                  {isMoved && (
                    <g pointerEvents="none">
                      <line
                        x1={baseX - x}
                        y1={baseY - y}
                        x2={0}
                        y2={0}
                        stroke={isSelected ? '#facc15' : '#0284c7'}
                        strokeWidth={1.4}
                        strokeDasharray="3 3"
                        opacity={0.7}
                      />
                      <circle
                        cx={baseX - x}
                        cy={baseY - y}
                        r={3.2}
                        fill={isSelected ? '#facc15' : '#0284c7'}
                        stroke="#ffffff"
                        strokeWidth={1.2}
                      />
                    </g>
                  )}

                  {/* 🔬 Zoom-Adaptive Pin-Gruppe (Schützt vor Pin-Gigantismus bei regionalem Zoom in Europa) */}
                  <g transform={`scale(${pinScale})`}>
                    {/* Radar-Impuls am aktuellen Flugzeug-Standort */}
                    {isLanded && (
                      <circle cx="0" cy="0" r="18" fill="none" stroke="#0284c7" strokeWidth="2.2" pointerEvents="none">
                        <animate attributeName="r" values="18;38" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.85;0" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}

                    {/* Zusätzlicher Auswahl-Impuls, wenn selektiert aber nicht gelandet */}
                    {isSelected && !isLanded && (
                      <circle cx="0" cy="0" r="18" fill="none" stroke="#facc15" strokeWidth="2.5" pointerEvents="none">
                        <animate attributeName="r" values="18;34" dur="1.8s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="1;0" dur="1.8s" repeatCount="indefinite" />
                      </circle>
                    )}

                    {/* 🎯 Radar-Impuls am Ziel-Pin, wenn im Expeditions-Widget darüber gehovert wird */}
                    {hoveredFlightDestCode === country.code && (
                      <circle cx="0" cy="0" r="18" fill="none" stroke="#facc15" strokeWidth="3" pointerEvents="none">
                        <animate attributeName="r" values="18;44" dur="0.8s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="1;0" dur="0.8s" repeatCount="indefinite" />
                      </circle>
                    )}

                    {/* Touch-Target mindestens 44×44px für Barrierefreiheit */}
                    <circle cx="0" cy="0" r={Math.max(22, 22 / pinScale)} fill="transparent" pointerEvents="all" />

                    {/* Medaillon-Körper (36px Kreis, r=18) mit 100% Vektor-Nationalflagge */}
                    <g filter={isSelected ? 'url(#medallionGlow)' : 'url(#medallionShadow)'}>
                      <circle
                        cx="0"
                        cy="0"
                        r="18"
                        fill="#ffffff"
                      />
                      <g clipPath="url(#flagClipCircle)">
                        {renderCountryFlagPaths(country.code)}
                      </g>
                      <circle
                        cx="0"
                        cy="0"
                        r="18"
                        fill="none"
                        stroke={borderColor}
                        strokeWidth={isHovered ? borderWidth + 0.8 : borderWidth}
                      />
                    </g>

                    {/* Status-Badge oben rechts am Medaillon */}
                    {isMastered ? (
                      <g transform="translate(12, -12)">
                        <circle r="7.5" fill="#facc15" stroke="#0f172a" strokeWidth="1.2" />
                        <text x="0" y="1" fontSize="8.5" textAnchor="middle" dominantBaseline="central" fill="#0f172a">
                          ★
                        </text>
                      </g>
                    ) : canFlyHere ? (
                      /* 🛫 Flugtor-Badge: Schlanker weißer Richtungspfeil auf Blau (Single-Plane-Axiom) */
                      <g transform="translate(12, -12)">
                        <circle r="7.5" fill="#0284c7" stroke="#ffffff" strokeWidth="1.2" />
                        <polygon points="-2,-3 3.2,0 -2,3" fill="#ffffff" />
                      </g>
                    ) : !isAccessible ? (
                      <g transform="translate(12, -12)">
                        <circle r="7.5" fill="#64748b" stroke="#ffffff" strokeWidth="1.2" />
                        <g transform="translate(-4, -4) scale(0.34)">
                          <Lock size={24} color="#ffffff" strokeWidth={2.6} />
                        </g>
                      </g>
                    ) : null}
                  </g>
                </g>
              );
            })}
          </svg>

          {/* ========================================================================= */}
          {/* 🗂️ SCHWEBENDES COCKPIT-DOCK (Ultra-Slim Anti-Occlusion Apple Glass Dock) */}
          {/* ========================================================================= */}
          {(() => {
            const isLanded = activeCountry.code === currentLandedCountryCode;
            const isAccessible = WorldTourFlightEngine.isCountryAccessible(activeCountry.code, progressMap);
            const canFlyDirectly = WorldTourFlightEngine.canFlyDirectly(currentLandedCountryCode, activeCountry.code, progressMap);
            const routeInfo = WorldTourFlightEngine.getRouteInfo(currentLandedCountryCode, activeCountry.code);
            const availableConnections = WorldTourFlightEngine.getConnectionsFrom(activeCountry.code, progressMap);
            const accessRoutesTo = WorldTourFlightEngine.getAccessRoutesTo(activeCountry.code, progressMap);
            const landedCountry = WORLD_TOUR_COUNTRIES.find(c => c.code === currentLandedCountryCode) || WORLD_TOUR_COUNTRIES[0];

            /* A. MINIMIERTER MODUS: 34px Schwebendes Micro-Dock (100% Freie Kartensicht) */
            if (isWidgetCollapsed) {
              return (
                <div
                  onClick={e => {
                    e.stopPropagation();
                    setIsWidgetCollapsed(false);
                  }}
                  style={{
                    position: 'absolute',
                    bottom: isMobileView ? 'calc(var(--bottom-bar-height, 68px) + env(safe-area-inset-bottom, 20px) + 12px)' : '16px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(255, 255, 255, 0.96)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '100px',
                    border: '1.5px solid rgba(203, 213, 225, 0.95)',
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
                    padding: '4px 14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    zIndex: 15,
                    cursor: 'pointer',
                    animation: 'fade-in 0.2s ease',
                    whiteSpace: 'nowrap'
                  }}
                  className="hover-scale"
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIsWidgetCollapsed(false);
                    }
                  }}
                  title="Expeditions-Cockpit einblenden"
                  aria-label="Expeditions-Cockpit wieder einblenden"
                >
                  <WorldTourCountryFlag countryCode={activeCountry.code} size={22} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#0f172a' }}>{activeCountry.name}</span>
                  <span style={{ fontSize: '0.76rem', fontWeight: 750, color: '#0284c7' }}>• „{activeCountry.pieceTitle || activeCountry.anthemTitle}“</span>
                  {activeStars > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#ca8a04', fontSize: '0.74rem' }}>
                      {Array.from({ length: activeStars }).map((_, s) => (
                        <Star key={s} size={12} fill="#facc15" stroke="#ca8a04" />
                      ))}
                    </span>
                  )}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 9px',
                    borderRadius: '100px',
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    color: '#0284c7',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    marginLeft: '4px'
                  }}>
                    <ChevronUp size={13} strokeWidth={2.8} />
                    <span>Cockpit</span>
                  </div>
                </div>
              );
            }

            /* B. ULTRA-SLIM COCKPIT DOCK (Bauhöhe ~52px - 76px, Anti-Occlusion) */
            return (
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  bottom: isMobileView ? 'calc(var(--bottom-bar-height, 68px) + env(safe-area-inset-bottom, 20px) + 8px)' : '16px',
                  left: isMobileView ? '10px' : '20px',
                  right: isMobileView ? '10px' : '20px',
                  maxWidth: '920px',
                  margin: '0 auto',
                  background: 'rgba(255, 255, 255, 0.96)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderRadius: '18px',
                  border: '1.5px solid rgba(226, 232, 240, 0.95)',
                  boxShadow: '0 8px 30px rgba(15, 23, 42, 0.12), 0 2px 8px rgba(15, 23, 42, 0.04)',
                  padding: isMobileView ? '8px 12px' : '9px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  zIndex: 15,
                  animation: 'fade-in 0.2s ease'
                }}
              >
                {/* 1. Hauptzeile: Identität, Quick-Routing & Primäre Aktionen */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  width: '100%'
                }}>
                  {/* Linker Block: Flagge & Metadaten */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: '1 1 auto' }}>
                    <WorldTourCountryFlag
                      countryCode={activeCountry.code}
                      size={32}
                      style={{ flexShrink: 0, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.14))' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap' }}>
                          {activeCountry.name}
                        </span>
                        <span style={{
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          color: '#0284c7',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          • „{activeCountry.pieceTitle || activeCountry.anthemTitle}“
                        </span>

                        {activeStars > 0 && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#ca8a04', fontSize: '0.76rem', fontWeight: 800 }}>
                            {Array.from({ length: activeStars }).map((_, s) => (
                              <Star key={s} size={13} fill="#facc15" stroke="#ca8a04" />
                            ))}
                          </span>
                        )}
                      </div>

                      <div style={{
                        fontSize: '0.70rem',
                        color: '#64748b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {activeCountry.composer} • {activeCountry.era}
                        {activeCountry.composedYear ? ` (${activeCountry.composedYear})` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Mittlerer Block: Kompakter Flugkorridor (nur wenn Hinflug bereit ist) */}
                  {canFlyDirectly && (
                    <div style={{
                      display: isMobileView ? 'none' : 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '4px 12px',
                      borderRadius: '100px',
                      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                      border: '1.2px solid #bae6fd',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      color: '#0369a1',
                      flexShrink: 0
                    }}>
                      <span>{landedCountry.flagEmoji} {landedCountry.name}</span>
                      <span style={{ color: '#0284c7', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Plane size={12} strokeWidth={2.4} />
                        <span>{routeInfo.distanceKm.toLocaleString('de-DE')} km</span>
                        <ChevronRight size={12} strokeWidth={2.6} />
                      </span>
                      <span>{activeCountry.flagEmoji} {activeCountry.name}</span>
                    </div>
                  )}

                  {/* Rechter Block: Story-Audio, Primär-Button & Einklapp-Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={handlePlayStory}
                      aria-label="15-Sekunden Audio-Geschichte anhören"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '7px 11px',
                        borderRadius: '12px',
                        background: isStoryPlaying ? '#0284c7' : '#f1f5f9',
                        color: isStoryPlaying ? '#ffffff' : '#334155',
                        border: '1.2px solid #cbd5e1',
                        fontWeight: 800,
                        fontSize: '0.76rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        touchAction: 'manipulation'
                      }}
                      className="hover-scale"
                      title="15-Sekunden Audio-Geschichte anhören"
                    >
                      <Volume2 size={14} />
                      <span style={{ display: isMobileView ? 'none' : 'inline' }}>{isStoryPlaying ? 'Pause' : 'Story'}</span>
                    </button>

                    {/* Primärer CTA */}
                    {isLanded ? (
                      <button
                        onClick={() => setActiveView('score')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 16px',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                          color: '#ffffff',
                          border: 'none',
                          fontWeight: 900,
                          fontSize: '0.84rem',
                          cursor: 'pointer',
                          boxShadow: '0 3px 12px rgba(2, 132, 199, 0.32)',
                          touchAction: 'manipulation',
                          whiteSpace: 'nowrap'
                        }}
                        className="hover-scale"
                        title="Notenpult öffnen und Stück üben"
                      >
                        <span>{activeStars > 0 ? 'Notenpult' : 'Notenpult öffnen'}</span>
                        <ChevronRight size={15} strokeWidth={2.8} />
                      </button>
                    ) : canFlyDirectly ? (
                      <button
                        onClick={() => startFlight(activeCountry.code)}
                        disabled={isFlying}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 18px',
                          borderRadius: '12px',
                          background: isFlying ? '#94a3b8' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                          color: '#ffffff',
                          border: 'none',
                          fontWeight: 900,
                          fontSize: '0.84rem',
                          cursor: isFlying ? 'not-allowed' : 'pointer',
                          boxShadow: '0 3px 14px rgba(2, 132, 199, 0.35)',
                          touchAction: 'manipulation',
                          whiteSpace: 'nowrap'
                        }}
                        className="hover-scale"
                        title={`Flugzeug starten nach ${activeCountry.name} (${routeInfo.distanceKm} km)`}
                      >
                        <Plane size={15} strokeWidth={2.6} />
                        <span>{isFlying ? 'Im Anflug...' : `Abflug (${routeInfo.distanceKm} km)`}</span>
                        <ChevronRight size={15} strokeWidth={2.8} />
                      </button>
                    ) : (
                      <button
                        disabled
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 14px',
                          borderRadius: '12px',
                          background: '#f1f5f9',
                          color: '#94a3b8',
                          border: '1.2px solid #e2e8f0',
                          fontWeight: 800,
                          fontSize: '0.80rem',
                          cursor: 'not-allowed',
                          touchAction: 'manipulation',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <Lock size={13} />
                        <span>Gesperrt</span>
                      </button>
                    )}

                    {/* Einklapp-Pill / Minimieren */}
                    <button
                      onClick={() => setIsWidgetCollapsed(true)}
                      aria-label="Cockpit minimieren für volle Kartensicht"
                      title="Cockpit minimieren (volle Kartensicht)"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        color: '#64748b',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        flexShrink: 0
                      }}
                      className="hover-scale"
                    >
                      <ChevronDown size={17} strokeWidth={2.4} />
                    </button>
                  </div>
                </div>

                {/* 2. Kompakte Anschluss-Gates Leiste (NUR wenn Land gemeistert ist und weitere Tore offen sind) */}
                {isLanded && activeStars > 0 && availableConnections.length > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    paddingTop: '6px',
                    borderTop: '1px solid #f1f5f9',
                    overflowX: 'auto',
                    width: '100%'
                  }} className="custom-scrollbar">
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      color: '#0f172a',
                      flexShrink: 0,
                      whiteSpace: 'nowrap'
                    }}>
                      <Compass size={13} color="#0284c7" />
                      <span>ABFLUG-GATES:</span>
                    </div>

                    {availableConnections.map(({ country: dest, isMastered: destMastered }) => {
                      const destRoute = WorldTourFlightEngine.getRouteInfo(activeCountry.code, dest.code);
                      const isTargetSelected = selectedCountryCode === dest.code;
                      const isHovered = hoveredFlightDestCode === dest.code;

                      return (
                        <button
                          key={dest.code}
                          onClick={() => {
                            if (isTargetSelected) {
                              // 2. Klick auf dasselbe Abflug-Gate: Sofort abfliegen!
                              startFlight(dest.code);
                            } else {
                              // 1. Klick: Ziel selektieren, Flugkorridor auto-framen & Jingle abspielen
                              setSelectedCountryCode(dest.code);
                              frameFlightCorridor(activeCountry.code, dest.code);
                              if (dest.audioJingleFrequencies) {
                                playCultureJingle(dest.audioJingleFrequencies);
                              }
                            }
                          }}
                          onMouseEnter={() => {
                            setHoveredFlightDestCode(dest.code);
                          }}
                          onMouseLeave={() => setHoveredFlightDestCode(null)}
                          onFocus={() => {
                            setHoveredFlightDestCode(dest.code);
                          }}
                          onBlur={() => setHoveredFlightDestCode(null)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '100px',
                            background: isTargetSelected
                              ? '#e0f2fe'
                              : isHovered
                              ? '#fefce8'
                              : '#ffffff',
                            border: isTargetSelected
                              ? '1.5px solid #0284c7'
                              : isHovered
                              ? '1.5px solid #facc15'
                              : '1px solid #cbd5e1',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: '#0f172a',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s ease',
                            flexShrink: 0
                          }}
                          className="hover-scale"
                          title={isTargetSelected ? `Direkt nach ${dest.name} abfliegen!` : `Flugtor nach ${dest.name} ansteuern (${destRoute.distanceKm.toLocaleString('de-DE')} km)`}
                        >
                          <span style={{ fontSize: '0.88rem' }}>{dest.flagEmoji}</span>
                          <span>{dest.name}</span>
                          <span style={{ fontSize: '0.66rem', color: '#0369a1', fontWeight: 800 }}>
                            {destRoute.distanceKm.toLocaleString('de-DE')} km
                          </span>
                          {isTargetSelected ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              padding: '1px 6px',
                              borderRadius: '100px',
                              background: '#0284c7',
                              color: '#ffffff',
                              fontSize: '0.62rem',
                              fontWeight: 900
                            }}>
                              <Plane size={9} strokeWidth={2.6} />
                              <span>ABFLUG ➔</span>
                            </span>
                          ) : destMastered ? (
                            <span style={{ color: '#ca8a04', fontSize: '0.64rem' }}>★</span>
                          ) : (
                            <span style={{ color: '#16a34a', fontSize: '0.64rem' }}>✨</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 3. Gesperrter Quest-Wegweiser (Simple & schlichte Reiseroute) */}
                {!isLanded && !isAccessible && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    paddingTop: '6px',
                    borderTop: '1px solid #f1f5f9',
                    fontSize: '0.72rem',
                    flexWrap: 'wrap'
                  }}>
                    {shortestRouteToActive ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0369a1', fontWeight: 800, flexWrap: 'wrap' }}>
                        <Compass size={13} color="#0284c7" />
                        <span style={{ color: '#0f172a' }}>Reiseroute ab {landedCountry.name}:</span>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                          {shortestRouteToActive.path.map((step, idx) => (
                            <span key={step.code} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <span>{step.flagEmoji}</span>
                              <span style={{
                                fontWeight: idx === shortestRouteToActive.path.length - 1 ? 950 : 700,
                                color: idx === shortestRouteToActive.path.length - 1 ? '#0284c7' : '#475569'
                              }}>
                                {step.name}
                              </span>
                              {idx < shortestRouteToActive.path.length - 1 && (
                                <span style={{ color: '#94a3b8', fontSize: '0.62rem' }}>➔</span>
                              )}
                            </span>
                          ))}
                        </div>
                        <span style={{ color: '#64748b', fontSize: '0.66rem', fontWeight: 700 }}>
                          ({shortestRouteToActive.stepsCount} {shortestRouteToActive.stepsCount === 1 ? 'Station' : 'Stationen'} • {shortestRouteToActive.totalKm.toLocaleString('de-DE')} km)
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b', fontWeight: 750 }}>
                        <Compass size={13} color="#0284c7" />
                        <span>Schalte {activeCountry.name} über ein Zubringer-Land frei</span>
                      </div>
                    )}

                    {shortestRouteToActive && shortestRouteToActive.path[1] && (
                      <button
                        onClick={() => {
                          const nextHop = shortestRouteToActive.path[1];
                          setSelectedCountryCode(nextHop.code);
                          focusCountry(nextHop.code);
                          const cont = nextHop.continent;
                          if (selectedContinent !== 'all' && selectedContinent !== cont) {
                            setSelectedContinent(cont);
                          }
                          if (nextHop.audioJingleFrequencies) {
                            playCultureJingle(nextHop.audioJingleFrequencies);
                          }
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 10px',
                          borderRadius: '100px',
                          background: '#e0f2fe',
                          border: '1.2px solid #bae6fd',
                          color: '#0284c7',
                          fontWeight: 850,
                          fontSize: '0.68rem',
                          cursor: 'pointer',
                          touchAction: 'manipulation'
                        }}
                        className="hover-scale"
                        title={`Zur nächsten Etappe: ${shortestRouteToActive.path[1].name}`}
                      >
                        <span>Nächste Etappe: {shortestRouteToActive.path[1].flagEmoji} {shortestRouteToActive.path[1].name}</span>
                        <ChevronRight size={11} strokeWidth={2.8} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ) : (
        /* ========================================================================= */
        /* ANSICHT 2: DAS VOLLFLÄCHIGE NOTEN- & ÜBE-PULT                             */
        /* ========================================================================= */
        <div style={{
          flex: 1,
          width: '100%',
          overflowY: 'auto',
          padding: isMobileView ? '10px 10px' : '14px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }} className="custom-scrollbar">
          {/* 🎼 Zeile 1: Kompakte Notenpult-Kopfzeile (44px, Ultra-Schlank & Zero Waste) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '6px 16px',
            background: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '14px',
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
            color: '#0f172a',
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            zIndex: 30
          }}>
            {/* Links: Zur Weltkarte Button + Flagge + Titel */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <button
                onClick={() => setActiveView('map')}
                aria-label="Zurück zur Weltkarte"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  fontWeight: 800,
                  fontSize: '0.80rem',
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                  flexShrink: 0
                }}
                className="hover-scale"
              >
                <ArrowLeft size={15} />
                <span>Weltkarte</span>
              </button>

              <WorldTourCountryFlag
                countryCode={activeCountry.code}
                size={26}
                style={{ flexShrink: 0, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.12))' }}
              />

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
                <span style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap' }}>
                  {activeCountry.name}
                </span>
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0284c7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  • „{activeCountry.pieceTitle || activeCountry.anthemTitle}“
                </span>
                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  ({activeCountry.era}{activeCountry.composedYear ? ` ${activeCountry.composedYear}` : ''})
                </span>
              </div>
            </div>

            {/* Rechts: 15s Story Audio & Faltbares Kultur-Dossier */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <button
                onClick={handlePlayStory}
                aria-label="15-Sekunden Audio-Geschichte anhören"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 11px',
                  borderRadius: '10px',
                  background: isStoryPlaying ? '#0284c7' : '#f0f9ff',
                  color: isStoryPlaying ? '#ffffff' : '#0369a1',
                  border: '1px solid #bae6fd',
                  fontWeight: 800,
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  touchAction: 'manipulation'
                }}
                className="hover-scale"
              >
                <Volume2 size={14} />
                <span>{isStoryPlaying ? 'Pause' : 'Story (15s)'}</span>
              </button>

              <button
                onClick={() => setIsDossierOpen(prev => !prev)}
                aria-expanded={isDossierOpen}
                aria-label="Kultur-Dossier und didaktischen Tipp ein- oder ausklappen"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 11px',
                  borderRadius: '10px',
                  background: isDossierOpen ? '#f1f5f9' : '#ffffff',
                  color: isDossierOpen ? '#0f172a' : '#475569',
                  border: '1px solid #cbd5e1',
                  fontWeight: 800,
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  touchAction: 'manipulation'
                }}
                className="hover-scale"
              >
                <BookOpen size={14} color={isDossierOpen ? '#0284c7' : '#64748b'} />
                <span>Dossier</span>
                {isDossierOpen ? <ChevronUp size={13} color="#64748b" /> : <ChevronDown size={13} color="#64748b" />}
              </button>
            </div>
          </div>

          {/* Didactic & Fun Fact Info Cards (Aufklappbares Expeditions-Dossier) */}
          {isDossierOpen && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobileView ? '1fr' : '1fr 1fr',
              gap: '14px',
              color: '#0f172a',
              animation: 'fade-in 0.2s ease'
            }}>
              <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '14px 18px',
                border: '1.5px solid #e2e8f0',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <BookOpen size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                    Wusstest du schon?
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.45, marginTop: '4px' }}>
                    {activeCountry.funFact}
                  </div>
                </div>
              </div>

              <div style={{
                background: '#fefce8',
                borderRadius: '16px',
                padding: '14px 18px',
                border: '1.5px solid #fef08a',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <Sparkles size={18} color="#ca8a04" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#854d0e' }}>
                    Didaktischer Tipp für dein Instrument
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#713f12', lineHeight: 1.45, marginTop: '4px' }}>
                    {activeCountry.didacticTip}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 🎼 MAIN SCORE PLAYER */}
          <WorldTourScorePlayer
            country={activeCountry}
            studentInstrument={studentInstrument}
            studentId={studentId}
            onMasteryAchieved={handleMasteryAchieved}
            uiLevel={uiLevel}
            onBackToMap={() => setActiveView('map')}
          />
        </div>
      )}

      {/* 🛂 Interaktiver 2027 Expeditions-Reisepass */}
      {isPassportOpen && (
        <WorldTourPassportModal
          isOpen={isPassportOpen}
          onClose={() => setIsPassportOpen(false)}
          studentName={studentName}
          studentInstrument={studentInstrument}
          studentAvatarUrl={studentAvatarUrl}
          uiLevel={uiLevel}
          progressMap={progressMap}
          currentLandedCountryCode={currentLandedCountryCode}
          onNavigateToCountry={(countryCode) => {
            setSelectedCountryCode(countryCode);
            setIsPassportOpen(false);
            setActiveView('map');
          }}
          onSelectCountry={(countryCode) => {
            setSelectedCountryCode(countryCode);
            setIsPassportOpen(false);
            setActiveView('score');
          }}
          onOpenDiploma={() => {
            setIsPassportOpen(false);
            setIsDiplomaOpen(true);
          }}
        />
      )}

      {/* A4 Printable Diploma Modal */}
      {isDiplomaOpen && (
        <WorldTourDiplomaModal
          isOpen={isDiplomaOpen}
          onClose={() => setIsDiplomaOpen(false)}
          studentName={studentName}
          instrumentName={studentInstrument || 'Gitarre'}
          unlockedCount={totalMasteredCountries}
          totalCountries={WORLD_TOUR_COUNTRIES.length}
        />
      )}
    </div>
  );
};
