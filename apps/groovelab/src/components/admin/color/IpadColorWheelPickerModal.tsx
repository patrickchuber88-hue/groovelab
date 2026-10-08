import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, Pipette, Tablet, X } from 'lucide-react';

export interface IpadColorWheelPickerModalProps {
  station: {
    id: string;
    name: string;
    color?: string | null;
    instrument?: string | null;
    room_id?: string;
  } | null;
  onClose: () => void;
  onColorChange?: (stationId: string, newColor: string) => void | Promise<void>;
  supabase?: any;
  brandColor?: string;
}

// 10 harmonische Campus/GrooveLab Express-Presets
const CURATED_PALETTE = [
  { hex: '#ef4444', label: 'Rot' },
  { hex: '#f97316', label: 'Orange' },
  { hex: '#f59e0b', label: 'Bernstein' },
  { hex: '#eab308', label: 'Gelb' },
  { hex: '#84cc16', label: 'Limette' },
  { hex: '#10b981', label: 'Smaragd' },
  { hex: '#06b6d4', label: 'Cyan' },
  { hex: '#3b82f6', label: 'Blau' },
  { hex: '#a855f7', label: 'Lila' },
  { hex: '#ec4899', label: 'Pink' }
];

// Farb-Mathematik: HSL / HEX Konvertierung
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  if (cleanHex.length !== 6) return { h: 210, s: 80, l: 50 };

  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h = Math.round(h * 60);
  }

  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  const normS = s / 100;
  const normL = l / 100;
  const a = normS * Math.min(normL, 1 - normL);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = normL - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// WCAG 2.2 AA Kontrastberechnung
function getRelativeLuminance(hex: string): number {
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) cleanHex = cleanHex.split('').map(c => c + c).join('');
  if (cleanHex.length !== 6) return 0.5;

  const rgb = [
    parseInt(cleanHex.substring(0, 2), 16) / 255,
    parseInt(cleanHex.substring(2, 4), 16) / 255,
    parseInt(cleanHex.substring(4, 6), 16) / 255
  ].map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));

  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hex1);
  const lum2 = getRelativeLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

export const IpadColorWheelPickerModal: React.FC<IpadColorWheelPickerModalProps> = ({
  station,
  onClose,
  onColorChange,
  supabase,
  brandColor = '#eab308'
}) => {
  const initialColor = station?.color || '#3b82f6';
  const [hexColor, setHexColor] = useState<string>(initialColor);
  const [hsl, setHsl] = useState<{ h: number; s: number; l: number }>(() => hexToHsl(initialColor));
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nativeColorInputRef = useRef<HTMLInputElement | null>(null);

  const WHEEL_SIZE = 220;
  const RADIUS = WHEEL_SIZE / 2;

  // Tastatur: Escape schließt das Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Synchronisation bei Wechsel der Station
  useEffect(() => {
    if (station?.color) {
      setHexColor(station.color);
      setHsl(hexToHsl(station.color));
    }
  }, [station?.id, station?.color]);

  // Zeichne den hochauflösenden Farbkreis auf das Canvas
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = WHEEL_SIZE * dpr;
    canvas.height = WHEEL_SIZE * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, WHEEL_SIZE, WHEEL_SIZE);

    // Kreisförmiger Clipping-Pfad
    ctx.save();
    ctx.beginPath();
    ctx.arc(RADIUS, RADIUS, RADIUS - 2, 0, Math.PI * 2);
    ctx.clip();

    // 1. Farbton (Hue) entlang des Umfangs zeichnen
    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = ((angle - 1) * Math.PI) / 180;
      const endAngle = ((angle + 1) * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(RADIUS, RADIUS);
      ctx.arc(RADIUS, RADIUS, RADIUS, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = `hsl(${angle}, 100%, 50%)`;
      ctx.fill();
    }

    // 2. Radiales Weiß-Overlay (Zentrum = 0% Sättigung, Rand = 100%)
    const whiteGrad = ctx.createRadialGradient(RADIUS, RADIUS, 0, RADIUS, RADIUS, RADIUS);
    whiteGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    whiteGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = whiteGrad;
    ctx.beginPath();
    ctx.arc(RADIUS, RADIUS, RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Dezente Umrandung
    ctx.beginPath();
    ctx.arc(RADIUS, RADIUS, RADIUS - 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [RADIUS, WHEEL_SIZE]);

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  // Pointer-Tracking auf dem Farbkreis
  const handlePointerInteraction = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left - RADIUS;
    const y = clientY - rect.top - RADIUS;

    const dist = Math.sqrt(x * x + y * y);
    const clampedDist = Math.min(dist, RADIUS - 2);

    let angle = Math.atan2(y, x) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    const h = Math.round(angle);
    const s = Math.round((clampedDist / (RADIUS - 2)) * 100);

    const newHsl = { h, s, l: hsl.l };
    setHsl(newHsl);
    setHexColor(hslToHex(newHsl.h, newHsl.s, newHsl.l));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handlePointerInteraction(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    handlePointerInteraction(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Fallback falls Pointer bereits gelöst
      }
    }
  };

  // Helligkeits-Slider Handler
  const handleLightnessChange = (newLightness: number) => {
    const newHsl = { ...hsl, l: newLightness };
    setHsl(newHsl);
    setHexColor(hslToHex(newHsl.h, newHsl.s, newLightness));
  };

  // Manueller Hex-Input
  const handleHexInputChange = (val: string) => {
    let clean = val.trim();
    if (!clean.startsWith('#')) clean = '#' + clean;
    setHexColor(clean);
    if (/^#[0-9A-Fa-f]{6}$/.test(clean)) {
      setHsl(hexToHsl(clean));
    }
  };

  // Palette Schnellwahl
  const handleSelectPaletteColor = (hex: string) => {
    setHexColor(hex);
    setHsl(hexToHsl(hex));
  };

  // Speichern in Supabase & Callback
  const handleSave = async () => {
    if (!station) return;
    setIsSaving(true);
    try {
      if (onColorChange) {
        await onColorChange(station.id, hexColor);
      }
      if (supabase) {
        const { error } = await supabase
          .from('stations')
          .update({ color: hexColor })
          .eq('id', station.id);
        if (error) {
          console.error('[IpadColorWheelPicker] Fehler beim Speichern:', error);
          alert('Fehler beim Speichern der Farbe: ' + error.message);
          return;
        }
      }
      onClose();
    } catch (err: any) {
      console.error('[IpadColorWheelPicker] Unerwarteter Fehler:', err);
      alert('Unerwarteter Fehler: ' + (err.message || String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  // Zeiger-Position auf dem Kreis berechnen
  const angleRad = (hsl.h * Math.PI) / 180;
  const pointerDist = ((hsl.s / 100) * (RADIUS - 2));
  const pointerX = RADIUS + Math.cos(angleRad) * pointerDist;
  const pointerY = RADIUS + Math.sin(angleRad) * pointerDist;

  // WCAG Kontrast gegen Weiß und Dunkelgrau
  const contrastAgainstDark = getContrastRatio(hexColor, '#0f172a');
  const contrastAgainstWhite = getContrastRatio(hexColor, '#ffffff');
  const maxContrast = Math.max(contrastAgainstDark, contrastAgainstWhite);
  const isAccessible = maxContrast >= 4.5;

  if (!station) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ipad-color-wheel-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(10px)',
        zIndex: 5000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '440px',
          borderRadius: '28px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #e2e8f0'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          background: '#f8fafc',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              background: `${hexColor}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}>
              <Tablet size={18} color={hexColor} />
            </div>
            <div>
              <h2 id="ipad-color-wheel-title" style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                {station.name} Farbkreis
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                Wähle die visuelle Kennfarbe für diesen Platz
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Farbkreis schließen"
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.15s'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
          
          {/* Farbkreis Canvas mit interaktivem Pointer */}
          <div style={{ position: 'relative', width: `${WHEEL_SIZE}px`, height: `${WHEEL_SIZE}px`, touchAction: 'none' }}>
            <canvas
              ref={canvasRef}
              style={{
                width: `${WHEEL_SIZE}px`,
                height: `${WHEEL_SIZE}px`,
                borderRadius: '50%',
                cursor: 'crosshair',
                display: 'block'
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />

            {/* Draggable Zeiger / Apple-Style Ring */}
            <div
              style={{
                position: 'absolute',
                left: `${pointerX}px`,
                top: `${pointerY}px`,
                transform: 'translate(-50%, -50%)',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: hexColor,
                border: '3px solid #ffffff',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(0,0,0,0.2)',
                pointerEvents: 'none',
                transition: isDragging ? 'none' : 'all 0.15s ease'
              }}
            />
          </div>

          {/* Helligkeits-Schieberegler */}
          <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Helligkeit</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>{hsl.l}%</span>
            </div>
            <input
              type="range"
              min={15}
              max={85}
              value={hsl.l}
              onChange={e => handleLightnessChange(parseInt(e.target.value, 10))}
              style={{
                width: '100%',
                height: '12px',
                borderRadius: '8px',
                appearance: 'none',
                WebkitAppearance: 'none',
                background: `linear-gradient(to right, hsl(${hsl.h}, ${hsl.s}%, 15%), hsl(${hsl.h}, ${hsl.s}%, 50%), hsl(${hsl.h}, ${hsl.s}%, 85%))`,
                outline: 'none',
                cursor: 'pointer'
              }}
            />
          </div>

          {/* Hex-Input & Nativer System-Farbwähler Button */}
          <div style={{ width: '100%', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                value={hexColor.toUpperCase()}
                onChange={e => handleHexInputChange(e.target.value)}
                maxLength={7}
                placeholder="#3B82F6"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  background: '#f8fafc',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Versteckter nativer OS-Farbpicker Trigger */}
            <input
              ref={nativeColorInputRef}
              type="color"
              value={hexColor.startsWith('#') && hexColor.length === 7 ? hexColor : '#3b82f6'}
              onChange={e => {
                setHexColor(e.target.value);
                setHsl(hexToHsl(e.target.value));
              }}
              style={{ display: 'none' }}
            />

            <button
              type="button"
              onClick={() => nativeColorInputRef.current?.click()}
              title="System-Farbwähler (Apple / Windows) öffnen"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 700,
                transition: 'all 0.15s'
              }}
            >
              <Pipette size={14} color="#64748b" /> System
            </button>
          </div>

          {/* Kuratierte Schnellwahl-Palette */}
          <div style={{ width: '100%' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
              Campus Schnellwahl
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '6px' }}>
              {CURATED_PALETTE.map(item => {
                const isSelected = hexColor.toLowerCase() === item.hex.toLowerCase();
                return (
                  <button
                    key={item.hex}
                    type="button"
                    title={item.label}
                    onClick={() => handleSelectPaletteColor(item.hex)}
                    style={{
                      aspectRatio: '1',
                      borderRadius: '8px',
                      backgroundColor: item.hex,
                      border: isSelected ? '2.5px solid #0f172a' : '1px solid rgba(0,0,0,0.1)',
                      cursor: 'pointer',
                      transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                      boxShadow: isSelected ? `0 4px 10px ${item.hex}60` : 'none',
                      transition: 'transform 0.15s ease',
                      padding: 0,
                      outline: 'none'
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Live Vorschau & WCAG 2.2 AA Kontrast-Badge */}
          <div style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '16px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: `${hexColor}18`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Tablet size={16} color={hexColor} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                  {station.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                  {station.instrument || 'Standard Tablet'}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '8px',
              background: isAccessible ? '#dcfce7' : '#fef9c3',
              color: isAccessible ? '#15803d' : '#854d0e',
              fontSize: '0.7rem',
              fontWeight: 800
            }}>
              <Check size={12} />
              <span>WCAG: {maxContrast.toFixed(1)}:1</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          background: '#f8fafc',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#475569',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            Abbrechen
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '10px 24px',
              borderRadius: '12px',
              background: brandColor,
              color: '#1e293b',
              border: 'none',
              fontWeight: 900,
              fontSize: '0.85rem',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.7 : 1,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Check size={14} /> {isSaving ? 'Speichern...' : 'Farbe übernehmen'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default IpadColorWheelPickerModal;
