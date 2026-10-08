import React from 'react';
import { 
  QrCode, 
  LogOut, 
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import { StudioAvatar } from '../StudioAvatar';
import { formatTeacherFullName } from '../../utils/nameHelper';
import { resolveUserCampusId } from '../../utils/campusIdHelper';

export interface CampusSidebarUserHubProps {
  user: any;
  activePlatform: 'campus' | 'groovelab' | 'ensembles' | string;
  activeStudentTab: string;
  setActiveStudentTab: (tab: string) => void;
  activeWorkspace?: string | null;
  teachers?: any[];
  session?: any;
  isCollapsed?: boolean;
  onShowQr: () => void;
  onLogout: (confirmFirst?: boolean, hardPurge?: boolean) => void;
  onOpenPrivacy: () => void;
  onOpenAgb: () => void;
  onOpenImpressum: () => void;
  onOpenAccessibility: () => void;
  onSwitchActiveRole?: (role: string) => void;
  isMusicStandMode?: boolean;
  toggleMusicStandMode?: () => void;
}

export const CampusSidebarUserHub: React.FC<CampusSidebarUserHubProps> = ({
  user,
  activePlatform,
  activeStudentTab,
  setActiveStudentTab,
  activeWorkspace,
  teachers = [],
  session,
  isCollapsed = false,
  onShowQr,
  onLogout,
  onOpenPrivacy,
  onOpenAgb,
  onOpenImpressum,
  onOpenAccessibility
}) => {
  const isStudent = user?.role === 'student';

  const userDisplayName = isStudent 
    ? (user?.first_name ? `${user.first_name} ${user.last_name ? user.last_name.charAt(0) + '.' : ''}`.trim() : 'Mein Profil')
    : formatTeacherFullName(user?.first_name, user?.last_name);

  const roleSubtitle = activePlatform === 'campus'
    ? (user?.role === 'admin' ? 'Campus Admin' : user?.role === 'teacher' ? 'Campus Lehrkraft' : user?.role === 'secretary' ? 'Campus Verwaltung' : 'Campus Schüler')
    : (user?.role === 'admin' ? 'Groovelab Admin' : user?.role === 'teacher' ? 'Groovelab Lehrer' : user?.role === 'secretary' ? 'Groovelab Verwaltung' : 'Groovelab Schüler');

  const canonicalCampusId = resolveUserCampusId(user);
  const hasPassToken = Boolean(user?.qr_token || user?.teacher_qr_token || user?.id);

  const isGreenTheme = activePlatform === 'campus';
  const cardBorder = isGreenTheme ? '1px solid rgba(52, 168, 83, 0.2)' : '1px solid rgba(234, 179, 8, 0.25)';
  const accentColor = isGreenTheme ? '#16a34a' : '#ca8a04';
  const badgeBg = isGreenTheme ? '#dcfce7' : '#fef9c3';
  const badgeColor = isGreenTheme ? '#15803d' : '#854d0e';

  // ── Collapsed Rail Mode (68px) ──
  if (isCollapsed) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: '10px',
        width: '100%',
        padding: '8px 0',
        boxSizing: 'border-box'
      }}>
        {/* Tactile Mini Ausweis Button */}
        {hasPassToken && (
          <button
            type="button"
            onClick={onShowQr}
            title={`Digitalen Ausweis öffnen (ID: ${canonicalCampusId})`}
            aria-label={`Digitalen Ausweis öffnen – ID ${canonicalCampusId}`}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              border: 'none',
              background: badgeBg,
              color: badgeColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              transition: 'all 0.18s ease'
            }}
            className="hover-scale sidebar-bottom-btn"
          >
            <QrCode size={18} strokeWidth={2.4} />
          </button>
        )}

        {/* Avatar Profil Trigger */}
        <button
          type="button"
          onClick={() => setActiveStudentTab('profile')}
          title={`${userDisplayName} – Mein Profil`}
          aria-label="Mein Profil öffnen"
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            border: activeStudentTab === 'profile' ? `2px solid ${accentColor}` : '1px solid #e2e8f0',
            background: '#f8fafc',
            padding: 0,
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            transition: 'all 0.18s ease'
          }}
          className="hover-scale sidebar-profile-card"
        >
          <StudioAvatar 
            src={user?.avatar_url || user?.photo_url} 
            user={{
              ...user,
              role: (activeWorkspace === 'teacher' || user?.role === 'teacher') ? 'teacher' : user?.role,
              isTeacherContext: (activeWorkspace === 'teacher' || user?.role === 'teacher'),
              resolved_instrument: user?.resolved_instrument || user?.instrument || (teachers.find(t => t.id === user?.teacher_id)?.instrument) || 'Gitarre'
            }} 
            activePlatform={activePlatform} 
          />
          {session && (
            <div style={{
              position: 'absolute',
              bottom: 2,
              right: 2,
              width: '8px',
              height: '8px',
              background: accentColor,
              borderRadius: '50%',
              border: '1.5px solid white'
            }} />
          )}
        </button>

        {/* Clean Mini Logout */}
        <button
          type="button"
          onClick={() => onLogout(true, true)}
          title="Abmelden"
          aria-label="Abmelden"
          className="hover-scale sidebar-bottom-btn"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            color: '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ef4444';
            e.currentTarget.style.background = '#fef2f2';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#94a3b8';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <LogOut size={15} strokeWidth={2} />
        </button>
      </div>
    );
  }

  // ── Expanded Mode: Apple-Wallet Pass & Integrated Bottom Row ──
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '12px', 
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* ── 1. Symmetrischer Dual-Dock: Digitaler Campus Pass (50px) ── */}
      {hasPassToken && (
        <div
          role="button"
          tabIndex={0}
          onClick={onShowQr}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onShowQr();
            }
          }}
          title={`Digitalen Ausweis öffnen (ID: ${canonicalCampusId})`}
          aria-label={`Digitalen Ausweis öffnen – ID ${canonicalCampusId}`}
          style={{
            width: '100%',
            height: '50px',
            borderRadius: '12px',
            background: isGreenTheme 
              ? 'linear-gradient(145deg, #ffffff 0%, rgba(240, 253, 244, 0.65) 100%)' 
              : 'linear-gradient(145deg, #ffffff 0%, rgba(254, 252, 232, 0.65) 100%)',
            border: isGreenTheme ? '1px solid rgba(52, 168, 83, 0.22)' : '1px solid rgba(234, 179, 8, 0.25)',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
            padding: '6px 10px',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            boxSizing: 'border-box',
            outline: 'none'
          }}
          className="hover-scale"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isGreenTheme ? '#ecfdf5' : '#fefce8';
            e.currentTarget.style.borderColor = isGreenTheme ? '#10b981' : '#fde047';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.04)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isGreenTheme 
              ? 'linear-gradient(145deg, #ffffff 0%, rgba(240, 253, 244, 0.65) 100%)' 
              : 'linear-gradient(145deg, #ffffff 0%, rgba(254, 252, 232, 0.65) 100%)';
            e.currentTarget.style.borderColor = isGreenTheme ? 'rgba(52, 168, 83, 0.22)' : 'rgba(234, 179, 8, 0.25)';
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.02)';
          }}
        >
          {/* Left: 34×34px Digital-Pass Squircle (Paritätisch zum Profil-Avatar) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0, flex: 1 }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: badgeBg,
              color: badgeColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              border: 'none',
              flexShrink: 0
            }}>
              <QrCode size={19} strokeWidth={2.4} />
            </div>

            {/* Center: Ausweis-Titel & autoritative Schulausweis-ID */}
            <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{
                fontSize: '0.82rem',
                fontWeight: 800,
                color: '#0f172a',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                letterSpacing: '-0.01em'
              }}>
                {isGreenTheme ? 'Campus Pass' : 'GrooveLab Pass'}
              </span>
              <span style={{
                fontSize: '0.64rem',
                fontWeight: 700,
                color: '#64748b',
                fontFamily: "'SF Mono', Monaco, Menlo, Consolas, monospace",
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                letterSpacing: '0.04em'
              }}>
                ID: {canonicalCampusId}
              </span>
            </div>
          </div>

          {/* Right: Clean Micro-Arrow Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            color: accentColor,
            flexShrink: 0
          }}>
            <ArrowUpRight size={16} strokeWidth={2.5} />
          </div>
        </div>
      )}

      {/* ── 2. Symmetrischer Dual-Dock: Benutzerprofil-Button (50px) ── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setActiveStudentTab('profile')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setActiveStudentTab('profile');
          }
        }}
        title="Mein Profil öffnen"
        aria-label="Mein Profil öffnen"
        style={{
          width: '100%',
          height: '50px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '6px 10px',
          borderRadius: '12px',
          background: activeStudentTab === 'profile' ? '#f1f5f9' : '#f8fafc',
          border: activeStudentTab === 'profile' ? '1.5px solid #cbd5e1' : '1px solid #e2e8f0',
          cursor: 'pointer',
          transition: 'all 0.18s ease',
          boxSizing: 'border-box',
          outline: 'none'
        }}
        className="hover-scale sidebar-profile-card"
      >
        {/* Left: Avatar + Online Dot (34×34px) */}
        <div style={{ position: 'relative', width: '34px', height: '34px', flexShrink: 0 }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            overflow: 'hidden',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
          }}>
            <StudioAvatar 
              src={user?.avatar_url || user?.photo_url} 
              user={{
                ...user,
                role: (activeWorkspace === 'teacher' || user?.role === 'teacher') ? 'teacher' : user?.role,
                isTeacherContext: (activeWorkspace === 'teacher' || user?.role === 'teacher'),
                resolved_instrument: user?.resolved_instrument || user?.instrument || (teachers.find(t => t.id === user?.teacher_id)?.instrument) || 'Gitarre'
              }} 
              activePlatform={activePlatform} 
            />
          </div>
          {session && (
            <div style={{
              position: 'absolute',
              bottom: -1,
              right: -1,
              width: '8px',
              height: '8px',
              background: accentColor,
              borderRadius: '50%',
              border: '1.5px solid white'
            }} />
          )}
        </div>

        {/* Center: Name & Subtitle */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontWeight: 800,
            fontSize: '0.82rem',
            color: '#0f172a',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.2
          }}>
            {userDisplayName}
          </div>
          <div style={{
            fontSize: '0.62rem',
            fontWeight: 800,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {roleSubtitle}
          </div>
        </div>

        {/* Right: De-escalated Logout Icon Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onLogout(true, true);
          }}
          title="Sicher von Campus-Groovelab abmelden"
          aria-label="Abmelden"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: 0,
            transition: 'all 0.15s ease',
            flexShrink: 0
          }}
          className="hover-scale"
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ef4444';
            e.currentTarget.style.background = '#fef2f2';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#94a3b8';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <LogOut size={15} strokeWidth={2} />
        </button>
      </div>

      {/* ── 3. Subtle Quiet Legal Links (BFSG 2025 & BGH 2-Klick / Zero-Hyphenation 2-Row Format) ── */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        gap: '4px', 
        fontSize: '9px', 
        fontWeight: 700, 
        color: '#94a3b8', 
        textTransform: 'uppercase', 
        letterSpacing: '0.04em', 
        userSelect: 'none',
        padding: '2px 4px 0 4px',
        lineHeight: 1.3
      }}>
        {/* Row 1: Datenschutz · AGB */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
          <span 
            role="button" 
            tabIndex={0} 
            onClick={onOpenPrivacy} 
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenPrivacy(); } }}
            style={{ cursor: 'pointer', transition: 'color 0.15s' }} 
            onMouseEnter={(e) => (e.currentTarget.style.color = '#475569')} 
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            Datenschutz
          </span>
          <span style={{ opacity: 0.35 }}>·</span>
          <span 
            role="button" 
            tabIndex={0} 
            onClick={onOpenAgb} 
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenAgb(); } }}
            style={{ cursor: 'pointer', transition: 'color 0.15s' }} 
            onMouseEnter={(e) => (e.currentTarget.style.color = '#475569')} 
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            AGB
          </span>
        </div>

        {/* Row 2: Impressum · Barrierefrei */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
          <span 
            role="button" 
            tabIndex={0} 
            onClick={onOpenImpressum} 
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenImpressum(); } }}
            style={{ cursor: 'pointer', transition: 'color 0.15s' }} 
            onMouseEnter={(e) => (e.currentTarget.style.color = '#475569')} 
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            Impressum
          </span>
          <span style={{ opacity: 0.35 }}>·</span>
          <span 
            role="button" 
            tabIndex={0} 
            onClick={onOpenAccessibility} 
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenAccessibility(); } }}
            style={{ cursor: 'pointer', transition: 'color 0.15s' }} 
            onMouseEnter={(e) => (e.currentTarget.style.color = '#475569')} 
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            Barrierefrei
          </span>
        </div>
      </div>
    </div>
  );
};
