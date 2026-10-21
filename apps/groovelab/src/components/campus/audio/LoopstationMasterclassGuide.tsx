import React from 'react';
import {
  Headphones,
  Clock,
  RotateCcw,
  Trash2,
  Zap,
  Check,
  X,
  Volume2,
  Mic,
  Magnet,
  Play
} from 'lucide-react';
import { DidacticUiLevel } from '../../../services/audio/RelationalHarmonicEngine';

export interface LoopstationMasterclassGuideProps {
  didacticLevel?: DidacticUiLevel;
  onStartStudio: () => void;
  isMobile?: boolean;
}

export const LoopstationMasterclassGuide: React.FC<LoopstationMasterclassGuideProps> = ({
  didacticLevel = 'junior',
  onStartStudio,
  isMobile = false
}) => {
  const isPro = didacticLevel === 'pro';

  return (
    <div
      style={{
        width: '100%',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.92) 100%)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: '28px',
        border: '1.5px solid rgba(0, 0, 0, 0.07)',
        padding: isMobile ? '20px 16px' : '28px 32px',
        boxShadow: '0 12px 35px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}
    >
      {/* 🚀 Header & Master Action */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          paddingBottom: '20px',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              color: '#d97706',
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(217, 119, 6, 0.15)'
            }}
          >
            <Zap size={26} color="#d97706" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h2
              style={{
                fontSize: isMobile ? '1.1rem' : '1.25rem',
                fontWeight: 900,
                color: '#0f172a',
                margin: 0,
                letterSpacing: '-0.02em'
              }}
            >
              Loopstation Masterclass: In 4 Schritten zum Beat
            </h2>
            <p
              style={{
                fontSize: '0.82rem',
                color: '#64748b',
                margin: '4px 0 0 0',
                fontWeight: 600
              }}
            >
              {isPro
                ? 'Profi-Workflow für maximale Audio-Qualität & tighte Loops im Unterricht und zu Hause'
                : 'Glasklarer Sound & tanzbarer Groove – die 4 goldenen Regeln für deinen perfekten Track'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onStartStudio}
          className="tactile-btn"
          aria-label="Loopstation Studio starten"
          style={{
            background: '#34a853',
            color: '#ffffff',
            border: 'none',
            borderRadius: '14px',
            padding: '12px 22px',
            fontSize: '0.88rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(52, 168, 83, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'transform 0.15s ease, background-color 0.15s ease'
          }}
        >
          <span>Verstanden & Studio starten! 🚀</span>
        </button>
      </div>

      {/* 🧩 4 Visual Steps Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          width: '100%'
        }}
      >
        {/* CARD 1: Kopfhörer-Signalweg */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '22px',
            border: '1.5px solid rgba(0, 0, 0, 0.05)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            position: 'relative'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  background: '#e0e7ff',
                  color: '#4338ca',
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Headphones size={20} color="#4338ca" />
              </div>
              <span style={{ fontSize: '0.96rem', fontWeight: 900, color: '#0f172a' }}>
                1. Kopfhörer auf
              </span>
            </div>
            <span
              style={{
                fontSize: '0.68rem',
                color: '#3730a3',
                background: '#e0e7ff',
                fontWeight: 800,
                borderRadius: '8px',
                padding: '3px 8px'
              }}
            >
              100% Reiner Sound
            </span>
          </div>

          {/* Micro-Visualization: Signalweg-Gegenüberstellung */}
          <div
            style={{
              background: '#f8fafc',
              borderRadius: '16px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155', fontWeight: 700 }}>
                <Headphones size={14} color="#4338ca" />
                <span>+</span>
                <Mic size={14} color="#0f172a" />
                <span>Kabel-Kopfhörer</span>
              </div>
              <span
                style={{
                  background: '#dcfce7',
                  color: '#166534',
                  padding: '2px 7px',
                  borderRadius: '6px',
                  fontSize: '0.70rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Check size={12} /> Glasklar
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontWeight: 600 }}>
                <Volume2 size={14} color="#94a3b8" />
                <span>⇢</span>
                <Mic size={14} color="#94a3b8" />
                <span>Lautsprecher</span>
              </div>
              <span
                style={{
                  background: '#fee2e2',
                  color: '#991b1b',
                  padding: '2px 7px',
                  borderRadius: '6px',
                  fontSize: '0.70rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <X size={12} /> Echo-Matsch
              </span>
            </div>
          </div>

          {/* Text */}
          <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45, margin: 0, fontWeight: 500 }}>
            Stecke <strong>Kabel-Kopfhörer</strong> ein. So hörst du Metronom & Beats kristallklar – und dein Mikrofon nimmt nur dein Instrument auf.
          </p>

          {/* Bottom Benefit */}
          <div
            style={{
              background: '#f1f5f9',
              borderRadius: '12px',
              padding: '9px 12px',
              fontSize: '0.74rem',
              color: '#334155',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: 'auto'
            }}
          >
            <Headphones size={15} color="#4338ca" />
            <span>Kein Echo, kein störendes Überlagern der Spuren.</span>
          </div>
        </div>

        {/* CARD 2: Die 4-Takte-Pause */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '22px',
            border: '1.5px solid rgba(0, 0, 0, 0.05)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            position: 'relative'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  background: '#fef3c7',
                  color: '#b45309',
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Clock size={20} color="#b45309" />
              </div>
              <span style={{ fontSize: '0.96rem', fontWeight: 900, color: '#0f172a' }}>
                2. 4 Takte Pause
              </span>
            </div>
            <span
              style={{
                fontSize: '0.68rem',
                color: '#92400e',
                background: '#fef3c7',
                fontWeight: 800,
                borderRadius: '8px',
                padding: '3px 8px'
              }}
            >
              Stressfreier Start
            </span>
          </div>

          {/* Micro-Visualization: 4-Beat Einzähler */}
          <div
            style={{
              background: '#fffbeb',
              borderRadius: '16px',
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {[1, 2, 3, 4].map((beat) => (
                <div
                  key={beat}
                  style={{
                    background: '#fde68a',
                    color: '#92400e',
                    width: '26px',
                    height: '26px',
                    borderRadius: '7px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.78rem',
                    fontWeight: 900
                  }}
                >
                  {beat}
                </div>
              ))}
            </div>
            <span style={{ fontSize: '0.74rem', color: '#b45309', fontWeight: 800 }}>➔</span>
            <div
              style={{
                background: '#ef4444',
                color: '#ffffff',
                padding: '4px 9px',
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.25)'
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffffff', display: 'inline-block' }} />
              REC
            </div>
          </div>

          {/* Text */}
          <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45, margin: 0, fontWeight: 500 }}>
            Vor jeder neuen Spur gibt dir die Loopstation <strong>4 Takte Pause</strong>. Nutze sie, um dich einzuspielen und voll in den Groove zu kommen.
          </p>

          {/* Bottom Benefit */}
          <div
            style={{
              background: '#fffbeb',
              borderRadius: '12px',
              padding: '9px 12px',
              fontSize: '0.74rem',
              color: '#92400e',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: 'auto'
            }}
          >
            <Clock size={15} color="#b45309" />
            <span>Deine erste Note sitzt immer haargenau auf dem Taktstrich.</span>
          </div>
        </div>

        {/* CARD 3: Punktgenauer Takt-Snap */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '22px',
            border: '1.5px solid rgba(0, 0, 0, 0.05)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            position: 'relative'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  background: '#dcfce7',
                  color: '#15803d',
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <RotateCcw size={20} color="#15803d" />
              </div>
              <span style={{ fontSize: '0.96rem', fontWeight: 900, color: '#0f172a' }}>
                3. Immer im Takt
              </span>
            </div>
            <span
              style={{
                fontSize: '0.68rem',
                color: '#166534',
                background: '#dcfce7',
                fontWeight: 800,
                borderRadius: '8px',
                padding: '3px 8px'
              }}
            >
              Punktgenauer Snap
            </span>
          </div>

          {/* Micro-Visualization: Takt-Raster mit Snap-Magnet */}
          <div
            style={{
              background: '#f0fdf4',
              borderRadius: '16px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.70rem', color: '#166534', fontWeight: 700 }}>
              <span>Takt 1</span>
              <span>Takt 2</span>
              <span>Takt 3 (Klick 🎙️)</span>
              <span>Takt 4</span>
            </div>
            <div
              style={{
                height: '8px',
                background: '#bbf7d0',
                borderRadius: '4px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '0',
                  top: '0',
                  height: '100%',
                  width: '28%',
                  background: '#16a34a'
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.70rem', color: '#15803d', fontWeight: 800 }}>
              <Magnet size={13} color="#15803d" />
              <span>Klick wann du willst ➔ Startet exakt auf Beat 1</span>
            </div>
          </div>

          {/* Text */}
          <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45, margin: 0, fontWeight: 500 }}>
            Spur neu aufnehmen? Klicke bei laufendem Beat einfach auf <strong>Record</strong>. Die Aufnahme wartet entspannt und startet exakt zum nächsten Taktbeginn.
          </p>

          {/* Bottom Benefit */}
          <div
            style={{
              background: '#f0fdf4',
              borderRadius: '12px',
              padding: '9px 12px',
              fontSize: '0.74rem',
              color: '#166534',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: 'auto'
            }}
          >
            <RotateCcw size={15} color="#15803d" />
            <span>Spuren im laufenden Loop ersetzen – ohne Stopp.</span>
          </div>
        </div>

        {/* CARD 4: Unterbrechungsfreier Flow */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '22px',
            border: '1.5px solid rgba(0, 0, 0, 0.05)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            position: 'relative'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  background: '#fee2e2',
                  color: '#b91c1c',
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Trash2 size={20} color="#b91c1c" />
              </div>
              <span style={{ fontSize: '0.96rem', fontWeight: 900, color: '#0f172a' }}>
                4. Beat läuft weiter
              </span>
            </div>
            <span
              style={{
                fontSize: '0.68rem',
                color: '#991b1b',
                background: '#fee2e2',
                fontWeight: 800,
                borderRadius: '8px',
                padding: '3px 8px'
              }}
            >
              Unterbrechungsfrei
            </span>
          </div>

          {/* Micro-Visualization: Multi-Track Timeline */}
          <div
            style={{
              background: '#fef2f2',
              borderRadius: '16px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.70rem', color: '#15803d', fontWeight: 700 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Play size={10} color="#16a34a" fill="#16a34a" />
                <span>Spur 1 & 2 (Beat & Bass)</span>
              </div>
              <span>Spielen weiter 🎶</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.70rem', color: '#b91c1c', fontWeight: 700 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Trash2 size={10} color="#b91c1c" />
                <span>Spur 3 (Gitarre)</span>
              </div>
              <span style={{ background: '#fecaca', padding: '1px 6px', borderRadius: '4px' }}>Geleert ➔ Frei</span>
            </div>
          </div>

          {/* Text */}
          <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45, margin: 0, fontWeight: 500 }}>
            Spur verpatzt? Klicke auf den <strong>Mülleimer</strong>. Nach Bestätigung wird sie gelöscht. Alle anderen Spuren spielen ohne Pause im Groove weiter.
          </p>

          {/* Bottom Benefit */}
          <div
            style={{
              background: '#fef2f2',
              borderRadius: '12px',
              padding: '9px 12px',
              fontSize: '0.74rem',
              color: '#991b1b',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: 'auto'
            }}
          >
            <Trash2 size={15} color="#b91c1c" />
            <span>Doppelter Schutz vor versehentlichem Löschen.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
