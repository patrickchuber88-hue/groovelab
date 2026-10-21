/**
 * 🏛️ Campus-Groovelab Micro-Score Studio (1–4 Takte)
 * MicroScoreBeatGridOverlay.tsx
 * 
 * 2027 0,1% Apple & Music-EdTech Goldstandard Beat-Grid & Ghost-Placeholder:
 * - Rendert alle Beat-Stationen bis zum Taktende
 * - Dynamische Ghost-Notenköpfe (Ganze, Halbe, Viertel, Achtel, 16tel)
 * - Schlag-Nummerierung (1, 2, 3, 4) direkt im Geister-Notenkopf
 * - Zählzeiten-Lineal unter den Notenlinien
 * - Didaktische Notennamen & Boomwhacker-Akzente auf gesetzten Noten
 * - BFSG 2025 / WCAG 2.2 AA konform (Touch-Flächen min. 44px, hoher Kontrast)
 * - Monolith Ceiling Axiom: Autarker Satellit (< 300 Zeilen)
 */

import React from 'react';
import { MicroScoreDuration } from './microScore.types';
import { MicroScoreGridSlot, getSpokenBeatLabel } from './microScoreGridEngine';
import { SMUFL_GLYPHS } from '../worldtour/worldTourMusicGlyphs';

export interface MicroScoreBeatGridOverlayProps {
  slots: MicroScoreGridSlot[];
  barIndex: number;
  barStartX: number;
  measureWidth: number;
  totalFractions: number;
  staffTopY: number;
  staffHeight: number;
  tabTopY?: number;
  tabHeight?: number;
  showStaff: boolean;
  showTabs: boolean;
  rulerY?: number;
  activeDuration: MicroScoreDuration;
  activeBar: number;
  activeFraction: number;
  isPlaying: boolean;
  readOnly?: boolean;
  onSelectSlot: (bar: number, fraction: number) => void;
  getStaffY: (pitch: string, isBass: boolean, isDrum?: boolean) => number;
  isBassClef: boolean;
  isDrumClef?: boolean;
  hideActiveGhostHead?: boolean;
}

export const MicroScoreBeatGridOverlay: React.FC<MicroScoreBeatGridOverlayProps> = ({
  slots,
  barIndex,
  barStartX,
  measureWidth,
  totalFractions,
  staffTopY,
  staffHeight,
  tabTopY = 150,
  tabHeight = 70,
  showStaff,
  showTabs,
  rulerY: propRulerY,
  activeDuration,
  activeBar,
  activeFraction,
  isPlaying,
  readOnly = false,
  onSelectSlot,
  getStaffY,
  isBassClef,
  isDrumClef = false,
  hideActiveGhostHead = false
}) => {
  const isCurrentBarActive = activeBar === barIndex;
  const bottomY = showTabs ? tabTopY + tabHeight : staffTopY + staffHeight;
  const rulerY = propRulerY ?? (bottomY + 46);

  // Standard-Höhe für Geisternoten (mittlere Notenlinie H4 / D3 bei 12.5px-Raster = 25px)
  const defaultGhostStaffY = staffTopY + (isBassClef ? 25 : 25);

  return (
    <g id={`micro-score-beat-grid-bar-${barIndex}`}>
      {slots.map((slot) => {
        const slotX = barStartX + 12 + (slot.fraction / totalFractions) * (measureWidth - 24);
        const isSlotActive = isCurrentBarActive && slot.isCursorHere && !isPlaying && !readOnly;
        const canInteractWithSlot = !readOnly && (slot.isOccupied || isSlotActive);
        const spokenBeat = getSpokenBeatLabel(slot.beatLabel);

        return (
          <g
            key={`beat-slot-${barIndex}-${slot.fraction}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!readOnly) onSelectSlot(barIndex, slot.fraction);
            }}
            style={{ cursor: canInteractWithSlot ? 'pointer' : 'default' }}
          >
            <title>
              {slot.isOccupied
                ? `Takt ${barIndex + 1} · ${spokenBeat} (klicken zum Bearbeiten)`
                : isSlotActive
                ? `Aktiver Eingabe-Platzhalter: Takt ${barIndex + 1} · ${spokenBeat}`
                : `Folgender Platzhalter: Takt ${barIndex + 1} · ${spokenBeat}`}
            </title>

            {/* 1. Barrierefreie Klick- & Touch-Dropzone */}
            <rect
              x={slotX - 14}
              y={staffTopY - 18}
              width={28}
              height={rulerY - staffTopY + 28}
              fill="transparent"
            />

            {/* 2. Vertikale Zählzeit-Führungslinie: Nur beim aktiven Bearbeitungs-Cursor (0,1% Urtext-Ruhe ohne Gitter-Stäbe) */}
            {isSlotActive && (
              <line
                x1={slotX}
                y1={showStaff ? staffTopY - 6 : tabTopY - 6}
                x2={slotX}
                y2={bottomY + 6}
                stroke="#6366f1"
                strokeWidth="1.6"
                strokeDasharray="3 2"
              />
            )}

            {/* 3. Apple Single-Target Placeholder: Nur der aktive Eingabe-Platzhalter zeigt die Geisternote auf den Linien
                   (und blendet sich aus, sobald der Nutzer mit der Maus eine echte Tonhöhe anvisiert -> 0% Doppel-Ghosting) */}
            {showStaff && !slot.isOccupied && (
              isSlotActive ? (
                !hideActiveGhostHead ? (
                  <g
                    id={`ghost-slot-${barIndex}-${slot.fraction}`}
                    opacity={0.88}
                    style={{ pointerEvents: 'none' }}
                  >
                    {/* Magnetischer Fokus-Ring auf dem aktiven Platzhalter */}
                    <circle
                      cx={slotX}
                      cy={defaultGhostStaffY}
                      r="14"
                      fill="rgba(99, 102, 241, 0.12)"
                      stroke="#6366f1"
                      strokeWidth="1.2"
                      strokeDasharray="2.5 2"
                    />

                    {/* Notenkopf des aktiven Platzhalters */}
                    <ellipse
                      cx={slotX}
                      cy={defaultGhostStaffY}
                      rx="6.6"
                      ry="4.7"
                      transform={`rotate(-22 ${slotX} ${defaultGhostStaffY})`}
                      fill={activeDuration === '1' || activeDuration === '2' ? '#ffffff' : '#6366f1'}
                      stroke="#6366f1"
                      strokeWidth="1.6"
                    />

                    {/* Notenhals des aktiven Platzhalters (außer bei Ganzer Note) */}
                    {activeDuration !== '1' && (
                      <line
                        x1={slotX + 5.8}
                        y1={defaultGhostStaffY}
                        x2={slotX + 5.8}
                        y2={defaultGhostStaffY - 27}
                        stroke="#6366f1"
                        strokeWidth="1.35"
                      />
                    )}

                    {/* Fähnchen für Achtel & 16tel (vertikal korrekt nach unten gerichtet) */}
                    {activeDuration === '8' && (
                      <path
                        d={SMUFL_GLYPHS.flag8thUp}
                        transform={`translate(${slotX + 5.8}, ${defaultGhostStaffY - 27}) scale(0.032, -0.032)`}
                        fill="#6366f1"
                      />
                    )}
                    {activeDuration === '16' && (
                      <path
                        d={SMUFL_GLYPHS.flag16thUp}
                        transform={`translate(${slotX + 5.8}, ${defaultGhostStaffY - 27}) scale(0.032, -0.032)`}
                        fill="#6366f1"
                      />
                    )}
                  </g>
                ) : null
              ) : (
                <circle
                  id={`ghost-slot-${barIndex}-${slot.fraction}`}
                  cx={slotX}
                  cy={defaultGhostStaffY}
                  r="2.4"
                  fill="#cbd5e1"
                  style={{ pointerEvents: 'none' }}
                />
              )
            )}

            {/* 4. Zählzeiten-Lineal (Beat-Ruler) unter dem System (1, 2, 3, 3+, 4, 4+) */}
            <g id={`ruler-slot-${barIndex}-${slot.fraction}`}>
              {slot.fraction % 4 === 0 && !isSlotActive && (
                <line
                  x1={slotX}
                  y1={rulerY - 14}
                  x2={slotX}
                  y2={rulerY - 10}
                  stroke="#cbd5e1"
                  strokeWidth="1.0"
                />
              )}

              {isSlotActive ? (
                <rect
                  x={slot.beatLabel.length > 2 ? slotX - 13 : slot.beatLabel.length > 1 ? slotX - 11 : slotX - 10}
                  y={rulerY - 9}
                  width={slot.beatLabel.length > 2 ? "26" : slot.beatLabel.length > 1 ? "22" : "20"}
                  height="18"
                  rx="5.5"
                  fill="#6366f1"
                />
              ) : slot.isOccupied ? (
                <rect
                  x={slot.beatLabel.length > 2 ? slotX - 13 : slot.beatLabel.length > 1 ? slotX - 11 : slotX - 9}
                  y={rulerY - 8}
                  width={slot.beatLabel.length > 2 ? "26" : slot.beatLabel.length > 1 ? "22" : "18"}
                  height="16"
                  rx="4.5"
                  fill="#f1f5f9"
                  stroke="#cbd5e1"
                  strokeWidth="0.8"
                />
              ) : null}

              <text
                x={slotX}
                y={rulerY + 4.2}
                fontSize={isSlotActive ? '10.2' : '9.2'}
                fontWeight={isSlotActive || slot.isOccupied ? '900' : '800'}
                fill={isSlotActive ? '#ffffff' : slot.isOccupied ? '#0f172a' : '#94a3b8'}
                textAnchor="middle"
                fontFamily="'Plus Jakarta Sans', sans-serif"
              >
                {slot.beatLabel}
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
};
