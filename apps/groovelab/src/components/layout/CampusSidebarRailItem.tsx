import React, { useState, useId } from 'react';

export interface CampusSidebarRailItemProps {
  id?: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
  platform?: 'campus' | 'groovelab' | 'ensembles' | 'briefing' | 'admin' | string;
  badgeCount?: number;
  hasPulseDot?: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
  rightSlot?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

/**
 * 🏛️ CampusSidebarRailItem (WCAG 2.2 AA / BFSG 2025 Parity)
 * 
 * Accessible sidebar menu item supporting both:
 * 1. Rail Mode (68px): Centered icon, min. 48x48px touch target, accessible floating tooltip, badge pip.
 * 2. Expanded Mode (260px): Icon + readable label + status pills / right slot.
 */
export const CampusSidebarRailItem: React.FC<CampusSidebarRailItemProps> = ({
  id,
  icon,
  label,
  isActive,
  isCollapsed,
  platform = 'campus',
  badgeCount = 0,
  hasPulseDot = false,
  onClick,
  onMouseEnter,
  rightSlot,
  disabled = false,
  className = '',
  style,
  title
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const generatedId = useId();
  const tooltipId = id ? `tooltip-${id}` : `tooltip-${generatedId}`;

  // Theme styling based on platform
  const getThemeColors = () => {
    switch (platform) {
      case 'groovelab':
        return {
          activeBg: 'rgba(251, 188, 5, 0.14)',
          activeColor: '#b45309',
          activeBorder: 'rgba(234, 179, 8, 0.35)',
          activeIconColor: '#b45309',
          iconCircleBg: '#fbbc05',
          iconCircleColor: '#0f172a'
        };
      case 'ensembles':
        return {
          activeBg: 'rgba(59, 130, 246, 0.12)',
          activeColor: '#1d4ed8',
          activeBorder: 'rgba(59, 130, 246, 0.28)',
          activeIconColor: '#1d4ed8',
          iconCircleBg: '#3b82f6',
          iconCircleColor: '#ffffff'
        };
      case 'briefing':
      case 'admin':
        return {
          activeBg: 'rgba(234, 67, 53, 0.12)',
          activeColor: '#dc2626',
          activeBorder: 'rgba(234, 67, 53, 0.28)',
          activeIconColor: '#dc2626',
          iconCircleBg: '#ea4335',
          iconCircleColor: '#ffffff'
        };
      case 'campus':
      default:
        return {
          activeBg: 'rgba(52, 168, 83, 0.12)',
          activeColor: '#15803d',
          activeBorder: 'rgba(52, 168, 83, 0.28)',
          activeIconColor: '#15803d',
          iconCircleBg: '#34a853',
          iconCircleColor: '#ffffff'
        };
    }
  };

  const theme = getThemeColors();
  const showTooltip = isCollapsed && (isHovered || isFocused);

  // 1. RAIL MODE (COLLAPSED 68px)
  if (isCollapsed) {
    return (
      <div
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          margin: '2px 0'
        }}
        onMouseEnter={() => {
          setIsHovered(true);
          onMouseEnter?.();
        }}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          type="button"
          id={id}
          onClick={onClick}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          aria-label={label}
          aria-current={isActive ? 'page' : undefined}
          aria-describedby={showTooltip ? tooltipId : undefined}
          title={title || label}
          className={`sidebar-rail-btn ${isActive ? 'active' : ''} ${className}`}
          style={{
            position: 'relative',
            width: '48px',
            height: '48px',
            minWidth: '48px',
            minHeight: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '14px',
            border: isActive ? `1.5px solid ${theme.activeBorder}` : '1.5px solid transparent',
            background: isActive ? theme.activeBg : isHovered ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
            color: isActive ? theme.activeColor : isHovered ? '#0f172a' : '#64748b',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            outline: 'none',
            padding: 0,
            boxSizing: 'border-box',
            touchAction: 'manipulation',
            ...style
          }}
        >
          {/* Centered Icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isActive ? theme.activeIconColor : 'inherit',
              transition: 'transform 0.18s ease'
            }}
          >
            {icon}
          </div>

          {/* Unread Badge Pip */}
          {badgeCount > 0 && (
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '3px',
                right: '3px',
                minWidth: '18px',
                height: '18px',
                padding: '0 4px',
                borderRadius: '9999px',
                background: '#ef4444',
                color: '#ffffff',
                fontSize: '0.62rem',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)',
                border: 'none',
                pointerEvents: 'none',
                boxSizing: 'border-box'
              }}
            >
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}

          {/* Pulse Dot Indicator */}
          {hasPulseDot && badgeCount === 0 && (
            <span
              aria-hidden="true"
              className="animate-pulse"
              style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#ef4444',
                boxShadow: '0 0 6px #ef4444',
                pointerEvents: 'none'
              }}
            />
          )}
        </button>

        {/* WAI-ARIA Compliant Floating Tooltip */}
        {showTooltip && (
          <div
            role="tooltip"
            id={tooltipId}
            style={{
              position: 'absolute',
              left: 'calc(100% + 10px)',
              top: '50%',
              transform: 'translateY(-50%)',
              background: '#0f172a',
              color: '#ffffff',
              fontSize: '0.78rem',
              fontWeight: 700,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              padding: '6px 12px',
              borderRadius: '8px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.22)',
              zIndex: 9999,
              letterSpacing: '-0.01em',
              animation: 'railTooltipFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {label}
            {badgeCount > 0 ? ` (${badgeCount})` : ''}
            {/* Tooltip Chevron Arrow */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '-4px',
                top: '50%',
                transform: 'translateY(-50%) rotate(45deg)',
                width: '8px',
                height: '8px',
                background: '#0f172a'
              }}
            />
          </div>
        )}
      </div>
    );
  }

  // 2. EXPANDED MODE (FULL 260px)
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      disabled={disabled}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      title={title || label}
      className={`sidebar-item ${isActive ? `active ${platform}` : ''} ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        padding: '10px 14px',
        borderRadius: '9999px',
        border: 'none',
        fontSize: '0.88rem',
        fontWeight: isActive ? 750 : 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.18s ease',
        background: isActive ? theme.activeBg : 'transparent',
        color: isActive ? theme.activeColor : '#64748b',
        textAlign: 'left',
        boxSizing: 'border-box',
        marginBottom: '4px',
        position: 'relative',
        ...style
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        {icon}
      </div>

      <span
        style={{
          flex: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          letterSpacing: '-0.01em'
        }}
      >
        {label}
      </span>

      {/* Unread Badge Count in Expanded Mode */}
      {badgeCount > 0 && !rightSlot && (
        <div
          style={{
            background: '#ef4444',
            color: 'white',
            borderRadius: '50%',
            minWidth: '18px',
            height: '18px',
            padding: '0 5px',
            fontSize: '0.65rem',
            fontWeight: 900,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 'auto',
            boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)',
            flexShrink: 0
          }}
        >
          {badgeCount > 99 ? '99+' : badgeCount}
        </div>
      )}

      {/* Pulse Dot in Expanded Mode */}
      {hasPulseDot && !rightSlot && (
        <div
          className="animate-pulse"
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: '#ef4444',
            boxShadow: '0 0 6px #ef4444',
            marginLeft: 'auto',
            flexShrink: 0
          }}
        />
      )}

      {/* Right Slot (e.g. Parental Lock Status Pill) */}
      {rightSlot}
    </button>
  );
};

export default CampusSidebarRailItem;
