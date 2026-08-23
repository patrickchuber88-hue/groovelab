import React from 'react';
import { Sparkles, Zap, Crown, Check, ArrowRight, X } from 'lucide-react';
import { CampusUiLevel } from './CampusLevelSwitcher';

interface CampusLevelSelectModalProps {
  currentLevel: CampusUiLevel | null;
  onSelectLevel: (level: CampusUiLevel) => void;
  onClose?: () => void;
}

export const CampusLevelSelectModal: React.FC<CampusLevelSelectModalProps> = ({
  currentLevel,
  onSelectLevel,
  onClose
}) => {
  const tiers: {
    id: CampusUiLevel;
    badge: string;
    title: string;
    tagline: string;
    icon: any;
    themeColor: string;
    themeDark: string;
    bgGradient: string;
    borderGlow: string;
    badgeBg: string;
    recommended?: boolean;
    features: string[];
  }[] = [
    {
      id: 'junior',
      badge: '6 – 10 Jahre',
      title: 'Junior',
      tagline: 'Spielerisch & super einfach',
      icon: Sparkles,
      themeColor: '#16a34a',
      themeDark: '#15803d',
      bgGradient: 'linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)',
      borderGlow: 'rgba(22, 163, 74, 0.35)',
      badgeBg: 'rgba(22, 163, 74, 0.15)',
      features: [
        'Große Schrift & bunte Symbole',
        '3-Klick Hausaufgaben & Play',
        'Countdown-Timer mit Konfetti 🎉',
        'Panini-Sticker Sammelalbum 🏆'
      ]
    },
    {
      id: 'teen',
      badge: '11 – 15 Jahre',
      title: 'Teen',
      tagline: 'Modern & auf den Punkt',
      icon: Zap,
      themeColor: '#0284c7',
      themeDark: '#0369a1',
      bgGradient: 'linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 100%)',
      borderGlow: 'rgba(2, 132, 199, 0.35)',
      badgeBg: 'rgba(2, 132, 199, 0.15)',
      recommended: true,
      features: [
        'Aufgeräumte Studio-Übersicht',
        'Track-Checklisten & Audio-Memos 🎙️',
        'Flow-Timer mit Quick-Presets ⏱️',
        'XP-Score, Badges & Streak-Flammen 🔥'
      ]
    },
    {
      id: 'pro',
      badge: 'Ab 16 Jahre',
      title: 'Pro',
      tagline: 'Voller Funktionsumfang & Studio-Tools',
      icon: Crown,
      themeColor: '#6366f1',
      themeDark: '#4f46e5',
      bgGradient: 'linear-gradient(180deg, #f5f3ff 0%, #ede9fe 100%)',
      borderGlow: 'rgba(99, 102, 241, 0.35)',
      badgeBg: 'rgba(99, 102, 241, 0.15)',
      features: [
        '4-Spur Sample-Loopstation 🎙️',
        'Vollständiges Meisterwerk-Protokoll',
        '6-Achsen Skill-Radar & ISO-Wochen',
        'Detaillierte Übe-Statistiken & Archiv'
      ]
    }
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.72)',
      backdropFilter: 'blur(20px) saturate(1.8)',
      WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '32px',
        maxWidth: '820px',
        width: '100%',
        padding: '36px 30px 32px 30px',
        boxShadow: '0 30px 70px -10px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.9) inset',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        boxSizing: 'border-box',
        position: 'relative'
      }}>
        
        {/* Close Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            className="hover-scale"
            title="Schließen"
          >
            <X size={18} />
          </button>
        )}

        {/* Header Section */}
        <div style={{ textAlign: 'center', maxWidth: '580px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(52, 168, 83, 0.1)',
            color: '#16a34a',
            padding: '5px 14px',
            borderRadius: '100px',
            fontSize: '0.72rem',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '10px',
            border: '1px solid rgba(52, 168, 83, 0.2)'
          }}>
            <Sparkles size={13} color="#16a34a" />
            <span>CAMPUS-GROOVELAB ANPASSUNG</span>
          </div>

          <h2 style={{ 
            margin: 0, 
            fontSize: '1.95rem', 
            fontWeight: 950, 
            color: '#0f172a', 
            fontFamily: "'Urbanist', 'Plus Jakarta Sans', sans-serif",
            letterSpacing: '-0.03em',
            lineHeight: 1.15
          }}>
            Wähle dein passendes Dashboard
          </h2>

          <p style={{ margin: '8px 0 0 0', fontSize: '0.92rem', color: '#64748b', fontWeight: 600, lineHeight: 1.4 }}>
            Wie möchtest du am liebsten üben? Du kannst diese Auswahl jederzeit mit 1 Klick im Profil ändern!
          </p>
        </div>

        {/* 3 Colorful & Child-Friendly Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '16px',
          alignItems: 'stretch'
        }}>
          {tiers.map(tier => {
            const isSelected = currentLevel === tier.id;
            const Icon = tier.icon;

            return (
              <div
                key={tier.id}
                onClick={() => onSelectLevel(tier.id)}
                style={{
                  background: tier.bgGradient,
                  borderRadius: '24px',
                  padding: '24px 20px',
                  border: isSelected 
                    ? `2.5px solid ${tier.themeColor}` 
                    : `1.5px solid ${tier.borderGlow}`,
                  boxShadow: isSelected
                    ? `0 16px 36px -8px ${tier.borderGlow}, 0 0 0 1px ${tier.themeColor}`
                    : '0 6px 18px rgba(0, 0, 0, 0.04)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '18px',
                  position: 'relative',
                  transform: isSelected ? 'translateY(-2px)' : 'none',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                className="hover-card-colorful"
              >
                {tier.recommended && (
                  <div style={{
                    position: 'absolute',
                    top: '-10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: `linear-gradient(135deg, ${tier.themeColor} 0%, ${tier.themeDark} 100%)`,
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    padding: '3px 10px',
                    borderRadius: '100px',
                    boxShadow: `0 4px 10px ${tier.borderGlow}`,
                    whiteSpace: 'nowrap'
                  }}>
                    Beliebteste Wahl
                  </div>
                )}

                <div>
                  {/* Top Row: Icon Badge & Age Range Pill */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '14px',
                      background: `linear-gradient(135deg, ${tier.themeColor} 0%, ${tier.themeDark} 100%)`,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 6px 14px ${tier.borderGlow}`
                    }}>
                      <Icon size={22} strokeWidth={2.4} />
                    </div>

                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 900,
                      color: tier.themeDark,
                      background: '#ffffff',
                      padding: '4px 12px',
                      borderRadius: '100px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                      border: `1px solid ${tier.borderGlow}`
                    }}>
                      {tier.badge}
                    </span>
                  </div>

                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '1.4rem', 
                    fontWeight: 950, 
                    color: '#0f172a',
                    fontFamily: "'Urbanist', 'Plus Jakarta Sans', sans-serif",
                    letterSpacing: '-0.02em'
                  }}>
                    {tier.title}
                  </h3>

                  <p style={{ margin: '4px 0 16px 0', fontSize: '0.82rem', color: '#475569', fontWeight: 650, minHeight: '34px', lineHeight: 1.35 }}>
                    {tier.tagline}
                  </p>

                  <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', marginBottom: '14px' }} />

                  {/* Feature Checklist */}
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {tier.features.map((feat, fIdx) => (
                      <li key={fIdx} style={{ fontSize: '0.78rem', color: '#334155', display: 'flex', alignItems: 'flex-start', gap: '8px', fontWeight: 650, lineHeight: 1.3 }}>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: tier.badgeBg,
                          color: tier.themeDark,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '1px'
                        }}>
                          <Check size={11} strokeWidth={3} />
                        </div>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Vibrant Action Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectLevel(tier.id);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: 'none',
                    background: `linear-gradient(135deg, ${tier.themeColor} 0%, ${tier.themeDark} 100%)`,
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: `0 6px 16px ${tier.borderGlow}`,
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    marginTop: '6px'
                  }}
                  className="hover-scale"
                >
                  <span>{isSelected ? '✓ Aktiv ausgewählt' : `${tier.title} wählen`}</span>
                  <ArrowRight size={15} strokeWidth={2.4} />
                </button>

              </div>
            );
          })}
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .hover-card-colorful:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.12) !important;
        }
      `}} />
    </div>
  );
};
