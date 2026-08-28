import React from 'react';
import { Sparkles, Zap, Crown } from 'lucide-react';

export type CampusUiLevel = 'junior' | 'teen' | 'pro';

interface CampusLevelSwitcherProps {
  currentLevel: CampusUiLevel;
  onChange: (level: CampusUiLevel) => void;
  compact?: boolean;
}

export const CampusLevelSwitcher: React.FC<CampusLevelSwitcherProps> = ({
  currentLevel,
  onChange,
  compact = false
}) => {
  const levels: { id: CampusUiLevel; label: string; ageHint: string; icon: any; color: string; bgActive: string }[] = [
    {
      id: 'junior',
      label: 'Junior',
      ageHint: '6–10 J.',
      icon: Sparkles,
      color: '#16a34a',
      bgActive: '#ffffff'
    },
    {
      id: 'teen',
      label: 'Teen',
      ageHint: '11–15 J.',
      icon: Zap,
      color: '#0284c7',
      bgActive: '#ffffff'
    },
    {
      id: 'pro',
      label: 'Pro',
      ageHint: '16+ J.',
      icon: Crown,
      color: '#6366f1',
      bgActive: '#ffffff'
    }
  ];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'rgba(241, 245, 249, 0.95)',
        padding: '2px',
        borderRadius: '100px',
        border: '1px solid rgba(203, 213, 225, 0.8)',
        boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)',
        gap: '2px',
        height: compact ? '32px' : '36px',
        boxSizing: 'border-box'
      }}
      role="group"
      aria-label="Campus UI Level Switcher"
    >
      {levels.map(lvl => {
        const isActive = currentLevel === lvl.id;
        const IconComponent = lvl.icon;

        return (
          <button
            key={lvl.id}
            type="button"
            onClick={() => onChange(lvl.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: compact ? '4px' : '5px',
              padding: compact ? '3px 8px' : '5px 12px',
              borderRadius: '100px',
              border: 'none',
              background: isActive ? lvl.bgActive : 'transparent',
              color: isActive ? lvl.color : '#64748b',
              fontWeight: isActive ? 900 : 700,
              fontSize: compact ? '0.7rem' : '0.78rem',
              cursor: 'pointer',
              boxShadow: isActive ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              whiteSpace: 'nowrap',
              height: '100%',
              boxSizing: 'border-box',
              touchAction: 'manipulation'
            }}
            title={`Campus-Ansicht: ${lvl.label} (${lvl.ageHint})`}
          >
            <IconComponent size={compact ? 12 : 13} style={{ color: isActive ? lvl.color : '#94a3b8' }} />
            <span>{lvl.label}</span>
            <span
              style={{
                fontSize: compact ? '0.6rem' : '0.66rem',
                opacity: isActive ? 0.9 : 0.6,
                fontWeight: 700,
                marginLeft: '1px'
              }}
            >
              {lvl.ageHint}
            </span>
          </button>
        );
      })}
    </div>
  );
};
