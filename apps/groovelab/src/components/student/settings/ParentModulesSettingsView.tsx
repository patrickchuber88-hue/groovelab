import React from 'react';
import { 
  BookOpen, 
  Clock, 
  Mic, 
  Music, 
  Sparkles, 
  Users, 
  Library, 
  Target, 
  ShieldCheck, 
  Zap, 
  Award,
  GraduationCap
} from 'lucide-react';
import { getEffectiveInstrument, isGenericInstrument } from '../../../utils/avatarResolutionEngine';

export interface ParentModulesSettingsViewProps {
  studentUser: any;
  currentPlatform?: string;
  onOpenActivation?: () => void;
}

export const ParentModulesSettingsView: React.FC<ParentModulesSettingsViewProps> = ({
  studentUser,
  currentPlatform,
  onOpenActivation
}) => {
  const isCampusActive = Boolean(studentUser?.is_campus_active);
  const isGrooveLabActive = Boolean(currentPlatform === 'groovelab' || studentUser?.is_campus_active);
  
  // Didaktik-Stufe
  const uiLevelRaw = (studentUser as any)?.campus_ui_level || 'junior';
  const uiLevelLabel = uiLevelRaw === 'pro' 
    ? 'Pro-Level (ab 16 J.)' 
    : (uiLevelRaw === 'teen' ? 'Teen-Level (11–15 J.)' : 'Junior-Level (6–10 J.)');

  // Hauptfach-Auflösung (0,1% Goldstandard: Reales Instrument statt Platzhalter 'Musikunterricht' / 'Musiker')
  const rawInst = getEffectiveInstrument(studentUser) || studentUser?.instrument;
  const instrument = (!rawInst || isGenericInstrument(rawInst)) ? 'Gitarre' : rawInst;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Kommunales Schullizenz- & Garantiesiegel (0,1% Trust-Banner) */}
      <div style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        border: '1.5px solid #e2e8f0',
        borderRadius: '20px',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        textAlign: 'left',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              background: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #bae6fd',
              flexShrink: 0
            }}>
              <ShieldCheck size={20} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: '0.90rem', fontWeight: 950, color: '#0f172a' }}>
                Kommunale Schullizenz • 100% Inklusive
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                Vollumfänglich durch den Unterrichtsvertrag deiner Musikschule abgedeckt.
              </div>
            </div>
          </div>

          {/* Chips: Fach & Stufe */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.70rem',
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: '8px',
              background: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1'
            }}>
              Hauptfach: {instrument}
            </span>
            <span style={{
              fontSize: '0.70rem',
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: '8px',
              background: '#ffffff',
              color: '#0369a1',
              border: '1px solid #bae6fd'
            }}>
              {uiLevelLabel}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Modul 1: Campus Studio (Smaragdgrün) */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #10b981',
        borderRadius: '22px',
        padding: '22px',
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        textAlign: 'left'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'none',
              flexShrink: 0
            }}>
              <BookOpen size={24} strokeWidth={2.2} />
            </div>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 850, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Schüler- &amp; Übestudio
              </span>
              <h4 style={{ margin: '1px 0 0 0', fontSize: '1.15rem', fontWeight: 950, color: '#0f172a' }}>
                Modul Campus
              </h4>
            </div>
          </div>

          <span style={{
            fontSize: '0.74rem',
            fontWeight: 850,
            padding: '4px 12px',
            borderRadius: '100px',
            background: isCampusActive ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#fef3c7',
            color: isCampusActive ? '#ffffff' : '#b45309',
            border: isCampusActive ? 'none' : '1.5px solid #fde68a',
            boxShadow: isCampusActive ? '0 2px 8px rgba(16, 185, 129, 0.28)' : 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {isCampusActive ? '✓ Aktiv freigeschaltet' : 'Bereit zur Aktivierung'}
          </span>
        </div>

        <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, fontWeight: 550 }}>
          Umfasst das digitale Hausaufgabenheft, den interaktiven Übe-Timer mit Streaks &amp; Level-Ups, die Audio-Loopstation und die persönliche Audio-Biografie deines Kindes.
        </p>

        {/* Feature Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {[
            { label: 'Übe-Timer & Streaks', icon: Clock },
            { label: 'Audio-Loopstation', icon: Mic },
            { label: 'Hausaufgabenheft & Notizen', icon: BookOpen },
            { label: 'Audio-Biografie', icon: Music }
          ].map((feat) => {
            const FeatIcon = feat.icon;
            return (
              <span key={feat.label} style={{
                fontSize: '0.74rem',
                fontWeight: 750,
                color: '#1e293b',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '5px 11px',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <FeatIcon size={13} color="#10b981" />
                <span>{feat.label}</span>
              </span>
            );
          })}
        </div>

        {/* Footer Area */}
        <div style={{
          paddingTop: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid #f1f5f9',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <span style={{ fontSize: '0.76rem', color: '#059669', fontWeight: 800 }}>
            ● Aktiv für das laufende Schuljahr 2026/27
          </span>

          {isCampusActive ? (
            <span
              role="status"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 14px',
                borderRadius: '10px',
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #e2e8f0',
                fontSize: '0.76rem',
                fontWeight: 800
              }}
            >
              Bereits freigeschaltet
            </span>
          ) : (
            <button
              type="button"
              onClick={onOpenActivation}
              style={{
                padding: '8px 16px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.80rem',
                fontWeight: 850,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: 'none',
                minHeight: '40px',
                touchAction: 'manipulation'
              }}
              className="hover-scale"
            >
              <Sparkles size={14} />
              <span>Gratis-Schnuppermonat aktivieren</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Modul 2: GrooveLab Modul (Solar Gold - 100% Symmetrie-Parität) */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #fde047',
        borderRadius: '22px',
        padding: '22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        textAlign: 'left',
        boxShadow: 'none'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'none',
              flexShrink: 0
            }}>
              <Zap size={24} strokeWidth={2.2} />
            </div>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 850, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Collab-, Play-Along &amp; Gaming-Studio
              </span>
              <h4 style={{ margin: '1px 0 0 0', fontSize: '1.15rem', fontWeight: 950, color: '#0f172a' }}>
                Modul GrooveLab
              </h4>
            </div>
          </div>

          <span style={{
            fontSize: '0.74rem',
            fontWeight: 850,
            padding: '4px 12px',
            borderRadius: '100px',
            background: '#fefce8',
            color: '#854d0e',
            border: '1.5px solid #fde047',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            100% Musikschul-Lizenz
          </span>
        </div>

        <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, fontWeight: 550 }}>
          Umfasst die interaktiven Band-Rooms, Song-Bibliotheken zum Mitspielen, Live Lab, den didaktischen Skill-Radar und spielerische Musiker-Avatare.
        </p>

        {/* Feature Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {[
            { label: 'Band-Rooms', icon: Users },
            { label: 'Song-Bibliotheken', icon: Library },
            { label: 'Skill-Radar', icon: Target },
            { label: 'Musiker-Avatare', icon: Sparkles }
          ].map((feat) => {
            const FeatIcon = feat.icon;
            return (
              <span key={feat.label} style={{
                fontSize: '0.74rem',
                fontWeight: 750,
                color: '#1e293b',
                background: '#fefce8',
                border: '1px solid #fef08a',
                padding: '5px 11px',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <FeatIcon size={13} color="#b45309" />
                <span>{feat.label}</span>
              </span>
            );
          })}
        </div>

        {/* Footer Area (Parität zu Campus) */}
        <div style={{
          paddingTop: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid #fef9c3',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <span style={{ fontSize: '0.76rem', color: '#854d0e', fontWeight: 800 }}>
            ● Uneingeschränkter Zugang freigeschaltet
          </span>

          <span
            role="status"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 14px',
              borderRadius: '10px',
              background: '#fefce8',
              color: '#854d0e',
              border: '1px solid #fef08a',
              fontSize: '0.76rem',
              fontWeight: 850
            }}
          >
            Vollversion aktiv
          </span>
        </div>
      </div>
    </div>
  );
};
