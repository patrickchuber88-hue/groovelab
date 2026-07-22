import React from 'react';
import QRCode from 'react-qr-code';
import { Check } from 'lucide-react';
import { StudioAvatar } from './StudioAvatar';

export interface IDBadgeCardProps {
  user: {
    id?: string;
    first_name?: string;
    last_name?: string;
    role?: string;
    roles?: string[];
    photo_url?: string;
    instrument?: string;
    qr_token?: string;
  };
  activePlatform?: string;
  qrValue?: string;
  cardRef?: React.RefObject<HTMLDivElement>;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
  showSubtext?: boolean;
  selectedPrint?: boolean;
  onToggleSelectPrint?: (e: React.MouseEvent) => void;
}

export const IDBadgeCard: React.FC<IDBadgeCardProps> = ({
  user,
  activePlatform,
  qrValue,
  cardRef,
  onClick,
  style,
  showSubtext = true,
  selectedPrint,
  onToggleSelectPrint
}) => {
  const currentPlatform = activePlatform || (typeof window !== 'undefined' ? localStorage.getItem('groovelab_active_platform') : 'groovelab') || 'groovelab';

  const isVerwaltung = 
    currentPlatform === 'secretary' || 
    currentPlatform === 'admin' || 
    ((user.role === 'admin' || user.role === 'secretary') && currentPlatform !== 'groovelab' && currentPlatform !== 'campus');

  const isTeacher = user.role === 'teacher' || user.roles?.includes('teacher');
  const isCampus = currentPlatform === 'campus';

  let headerBg = '#eab308';
  let badgeText = 'SCHÜLER';
  let avatarBorder = '#eab308';
  let bottomStripeBg = 'linear-gradient(90deg, #eab308, #1e293b, #eab308)';

  if (isVerwaltung) {
    headerBg = '#ea4335';
    badgeText = 'VERWALTUNG';
    avatarBorder = '#ea4335';
    bottomStripeBg = 'linear-gradient(90deg, #ea4335, #1e293b, #ea4335)';
  } else if (isCampus) {
    headerBg = '#34a853';
    badgeText = 'CAMPUS AUSWEIS';
    avatarBorder = '#34a853';
    bottomStripeBg = 'linear-gradient(90deg, #34a853, #1e293b, #34a853)';
  } else if (isTeacher) {
    // GrooveLab Coach -> Yellow-to-Green Gradient bridging GrooveLab & Campus
    headerBg = 'linear-gradient(135deg, #eab308 0%, #34a853 100%)';
    badgeText = 'LEHRER';
    avatarBorder = '#eab308';
    bottomStripeBg = 'linear-gradient(90deg, #eab308, #34a853, #1e293b, #34a853, #eab308)';
  } else {
    // GrooveLab Student
    headerBg = '#eab308';
    badgeText = 'SCHÜLER';
    avatarBorder = '#eab308';
    bottomStripeBg = 'linear-gradient(90deg, #eab308, #1e293b, #eab308)';
  }

  const effectiveQrValue = qrValue || (typeof window !== 'undefined' ? `${window.location.origin}/qr/${user.qr_token || user.id || ''}` : '');
  const avatarSrc = isVerwaltung ? '/campus_login_hero.png' : user.photo_url;
  const avatarUser = isVerwaltung ? { ...user, photo_url: '/campus_login_hero.png' } : user;

  const formattedLastName = user.last_name || user.instrument || 'Member';

  return (
    <div 
      ref={cardRef}
      onClick={onClick}
      style={{
        width: '280px',
        maxWidth: '100%',
        background: '#ffffff',
        borderRadius: '24px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35), 0 10px 25px -5px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.06)',
        boxSizing: 'border-box',
        position: 'relative',
        aspectRatio: '0.62',
        flexShrink: 0,
        ...style
      }}
    >
      {/* Checkbox overlay for bulk selection/printing */}
      {onToggleSelectPrint && (
        <div 
          onClick={(e) => onToggleSelectPrint(e)}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: selectedPrint ? '#ea4335' : 'rgba(255,255,255,0.85)',
            border: `2px solid ${selectedPrint ? '#ea4335' : '#cbd5e1'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            transition: 'all 0.2s',
            opacity: selectedPrint ? 1 : 0.8
          }}
        >
          {selectedPrint && <Check size={16} color="white" strokeWidth={3} />}
        </div>
      )}

      {/* Lanyard Hole Mockup */}
      <div style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b' }}>
        <div style={{ width: '30px', height: '6px', borderRadius: '3px', background: '#0f172a' }}></div>
      </div>

      {/* Status Header Badge */}
      <div style={{ 
        background: headerBg, 
        padding: '6px', 
        textAlign: 'center',
        textTransform: 'uppercase'
      }}>
        <div style={{ color: 'white', fontSize: '0.6rem', fontWeight: 1000, letterSpacing: '0.2em' }}>
          {badgeText}
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px 24px 20px', gap: '16px' }}>
        {/* Portrait Avatar */}
        <div style={{ 
          width: '125px', 
          height: '125px', 
          borderRadius: '100px', 
          border: `4px solid ${avatarBorder}`,
          padding: '5px',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
            <StudioAvatar 
              src={avatarSrc} 
              user={avatarUser} 
              activePlatform={isVerwaltung ? 'secretary' : activePlatform} 
            />
          </div>
        </div>

        {/* Identity */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 1000, color: '#1e293b', lineHeight: 1.1 }}>
            {user.first_name || 'Member'}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px', fontWeight: 700 }}>
            {formattedLastName}
          </div>
        </div>

        {/* QR Code Container */}
        <div className="onboarding-qr-container" style={{ 
          marginTop: 'auto',
          background: '#f8fafc', 
          padding: '10px', 
          borderRadius: '16px',
          border: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box'
        }}>
          <QRCode value={effectiveQrValue} size={105} style={{ width: '105px', height: '105px' }} />
        </div>

        {showSubtext && (
          <p style={{ 
            fontSize: '0.68rem', 
            color: '#94a3b8', 
            textAlign: 'center', 
            margin: '0', 
            fontWeight: 600, 
            lineHeight: 1.25,
            maxWidth: '220px'
          }}>
            Halte diesen Code vor die Kamera des iPads,<br/>um dich am Platz anzumelden.
          </p>
        )}
      </div>

      {/* Bottom Brand Stripe (Linear Gradient Bar) */}
      <div style={{ 
        height: '10px', 
        width: '100%',
        background: bottomStripeBg 
      }} />
    </div>
  );
};

export default IDBadgeCard;
