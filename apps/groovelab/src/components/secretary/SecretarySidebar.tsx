import React from 'react';
import { 
  Shield, 
  GraduationCap, 
  Music, 
  LayoutDashboard, 
  ShieldAlert, 
  FileText, 
  DoorOpen, 
  Settings, 
  Users, 
  Award, 
  Clock, 
  BookOpen, 
  UserPlus, 
  Calendar, 
  Sliders, 
  Monitor, 
  QrCode, 
  LogOut,
  School,
  ArrowLeftRight,
  PanelLeftClose,
  PanelLeftOpen,
  CreditCard,
  ArrowUpRight,
  AlertCircle
} from 'lucide-react';
import { TourStartButton } from '../PremiumOnboardingTour';
import { resolveUserCampusId } from '../../utils/campusIdHelper';
import { CampusSidebarRailItem } from '../layout/CampusSidebarRailItem';

export interface SecretaryUserProfile {
  id?: string;
  nickname?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  email?: string;
  roles?: string[];
  canonical_id?: string;
  [key: string]: unknown;
}

export interface CrisisNotificationItem {
  status: string;
  slot_start_datetime: string;
  teacher?: {
    ausfall_until?: string;
    ausfallUntil?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface SecretarySidebarProps {
  activeTab: 'secretary' | 'campus' | 'groovelab';
  setActiveTab?: (tab: 'secretary' | 'campus' | 'groovelab') => void;
  secretarySubTab: string;
  setSecretarySubTab: (tab: any) => void;
  campusSubTab: string;
  setCampusSubTab: (tab: any) => void;
  groovelabSubTab: string;
  setGroovelabSubTab: (tab: any) => void;
  hasCampusSub: boolean;
  hasGroovelabSub?: boolean;
  enabledCampusSubjects: boolean;
  enabledCampusRooms: boolean;
  enabledCampusEvents: boolean;
  enabledCampusSchedules: boolean;
  crisisNotifications: CrisisNotificationItem[];
  pendingSchedules: unknown[];
  startTour: () => void;
  currentUserProfile: SecretaryUserProfile | null;
  setShowOwnQrModal: (show: boolean) => void;
  onLogout?: () => void;
  handleSecretaryLogout: () => void;
  schoolName?: string;
  isCurrentUserTeacher?: boolean;
  onRoleSwitched?: (role: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  trialDaysRemaining?: number;
  isSchoolTrial?: boolean;
  onOpenPrivacy?: () => void;
  onOpenAgb?: () => void;
  onOpenImpressum?: () => void;
  onOpenAccessibility?: () => void;
}

export const SecretarySidebar: React.FC<SecretarySidebarProps> = ({
  activeTab,
  setActiveTab,
  secretarySubTab,
  setSecretarySubTab,
  campusSubTab,
  setCampusSubTab,
  groovelabSubTab,
  setGroovelabSubTab,
  hasCampusSub,
  hasGroovelabSub = true,
  enabledCampusSubjects,
  enabledCampusRooms,
  enabledCampusEvents,
  enabledCampusSchedules,
  crisisNotifications,
  pendingSchedules,
  startTour,
  currentUserProfile,
  setShowOwnQrModal,
  onLogout,
  handleSecretaryLogout,
  schoolName = 'Musäk Bad Säckingen',
  isCurrentUserTeacher = false,
  onRoleSwitched,
  isCollapsed = false,
  onToggleCollapse,
  trialDaysRemaining,
  isSchoolTrial = false,
  onOpenPrivacy,
  onOpenAgb,
  onOpenImpressum,
  onOpenAccessibility
}) => {
  const userName = currentUserProfile?.nickname || currentUserProfile?.first_name || 'Verwaltung';
  const canonicalId = resolveUserCampusId(currentUserProfile);

  const moduleConfig = activeTab === 'secretary' ? {
    passTitle: 'Verwaltungs-Pass',
    roleSubtitle: 'Schulsekretariat',
    cardBorder: '1px solid rgba(234, 67, 53, 0.22)',
    cardHoverBorder: '#fca5a5',
    cardBgGradient: 'linear-gradient(145deg, #ffffff 0%, rgba(254, 242, 242, 0.65) 100%)',
    cardHoverBg: '#fef2f2',
    accentColor: '#ea4335',
    badgeBg: '#fee2e2',
    badgeColor: '#b91c1c',
    glowShadow: '0 4px 12px rgba(234, 67, 53, 0.08)'
  } : activeTab === 'campus' ? {
    passTitle: 'Campus Pass',
    roleSubtitle: 'Campus Verwaltung',
    cardBorder: '1px solid rgba(52, 168, 83, 0.22)',
    cardHoverBorder: '#10b981',
    cardBgGradient: 'linear-gradient(145deg, #ffffff 0%, rgba(236, 253, 245, 0.65) 100%)',
    cardHoverBg: '#ecfdf5',
    accentColor: '#10b981',
    badgeBg: '#ecfdf5',
    badgeColor: '#059669',
    glowShadow: '0 4px 12px rgba(16, 185, 129, 0.08)'
  } : {
    passTitle: 'GrooveLab Pass',
    roleSubtitle: 'GrooveLab Verwaltung',
    cardBorder: '1px solid rgba(234, 179, 8, 0.25)',
    cardHoverBorder: '#fde047',
    cardBgGradient: 'linear-gradient(145deg, #ffffff 0%, rgba(254, 252, 232, 0.65) 100%)',
    cardHoverBg: '#fefce8',
    accentColor: '#ca8a04',
    badgeBg: '#fef9c3',
    badgeColor: '#854d0e',
    glowShadow: '0 4px 12px rgba(234, 179, 8, 0.08)'
  };

  return (
    <aside 
      className={`glass-sidebar ${isCollapsed ? 'is-collapsed' : ''}`}
      style={{
        width: isCollapsed ? '68px' : '260px',
        padding: isCollapsed ? '16px 8px 16px 8px' : '16px 14px 16px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: isCollapsed ? '12px' : '14px',
        height: '100vh',
        boxSizing: 'border-box',
        overflowY: 'auto',
        flexShrink: 0,
        background: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1), padding 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        scrollbarWidth: 'none'
      }}
    >
      {/* ── EBENE 1: Intelligent Header (Schulname & Einklappen) ── */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: isCollapsed ? 'center' : 'space-between', 
        width: '100%',
        gap: '8px'
      }}>
        {!isCollapsed && (
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              minWidth: 0, 
              flex: 1 
            }}
            title={schoolName}
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'rgba(51, 65, 85, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#334155',
              flexShrink: 0
            }}>
              <School size={15} color="#334155" />
            </div>
            <span style={{
              fontSize: '0.84rem',
              fontWeight: 800,
              color: '#1e293b',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: '-0.01em',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
              {schoolName}
            </span>
          </div>
        )}

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'}
            title={isCollapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'}
            style={{
              width: isCollapsed ? '44px' : '30px',
              height: isCollapsed ? '44px' : '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: isCollapsed ? '12px' : '8px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#64748b',
              cursor: 'pointer',
              padding: 0,
              flexShrink: 0,
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            className="hover-scale"
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={15} />}
          </button>
        )}
      </div>

      {/* ── EBENE 2: Persona-Switch „Zum Lehrerpult“ (sofern Dual-Role, nur im ausgeklappten Zustand) ── */}
      {!isCollapsed && isCurrentUserTeacher && onRoleSwitched && (
        <button
          type="button"
          onClick={() => onRoleSwitched('teacher')}
          title="Zum Lehrerpult wechseln"
          aria-label="Zum Lehrerpult wechseln"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            height: '36px',
            padding: '0 12px',
            borderRadius: '9999px',
            background: '#f0fdf4',
            border: '1px solid rgba(34, 197, 94, 0.35)',
            color: '#15803d',
            fontWeight: 750,
            fontSize: '0.78rem',
            letterSpacing: '-0.01em',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            cursor: 'pointer',
            transition: 'all 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 1px 3px rgba(34, 197, 94, 0.08)'
          }}
          className="hover-scale"
        >
          <ArrowLeftRight size={13} color="#16a34a" strokeWidth={2.2} />
          <GraduationCap size={15} color="#16a34a" strokeWidth={2.2} />
          <span>Zum Lehrerpult</span>
        </button>
      )}

      {/* ── Probezeit-Badge (falls Schule in Trial) ── */}
      {!isCollapsed && isSchoolTrial && trialDaysRemaining !== undefined && trialDaysRemaining !== null && (
        <div style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          height: '26px',
          padding: '0 8px',
          borderRadius: '7px',
          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
          color: 'white',
          fontWeight: 850,
          fontSize: '0.68rem',
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
          boxShadow: '0 2px 6px rgba(245, 158, 11, 0.2)'
        }}>
          <AlertCircle size={11} color="white" />
          <span>{trialDaysRemaining > 0 ? `Probezeit: ${trialDaysRemaining} ${trialDaysRemaining === 1 ? 'Tag' : 'Tage'}` : 'Probezeit abgelaufen'}</span>
        </div>
      )}

      {/* ── EBENE 3: 3-Modul Segmented Control [ Verwaltung | Campus | GrooveLab ] ── */}
      {!isCollapsed ? (
        <div
          role="tablist"
          aria-label="Modulauswahl Verwaltung, Campus und GrooveLab"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            background: '#f1f5f9',
            padding: '3px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            width: '100%',
            gap: '3px',
            boxSizing: 'border-box'
          }}
        >
          {/* 1. Verwaltung (Rot) */}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'secretary'}
            onClick={() => {
              setActiveTab?.('secretary');
              sessionStorage.setItem('groovelab_active_workspace', 'secretary');
            }}
            style={{
              height: '46px',
              borderRadius: '9px',
              border: 'none',
              background: activeTab === 'secretary' ? '#ea4335' : 'transparent',
              color: activeTab === 'secretary' ? '#ffffff' : '#64748b',
              fontWeight: activeTab === 'secretary' ? 800 : 650,
              fontSize: '0.72rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: activeTab === 'secretary' ? '0 2px 8px rgba(234, 67, 53, 0.32)' : 'none',
              outline: 'none',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}
            className="hover-scale-mini"
            title="Zur Schulverwaltung wechseln"
          >
            <Shield size={16} color={activeTab === 'secretary' ? '#ffffff' : '#ea4335'} strokeWidth={2.4} />
            <span>Verwaltung</span>
          </button>

          {/* 2. Campus (Grün) */}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'campus'}
            onClick={() => {
              setActiveTab?.('campus');
              sessionStorage.setItem('groovelab_active_workspace', 'campus');
            }}
            style={{
              height: '46px',
              borderRadius: '9px',
              border: 'none',
              background: activeTab === 'campus' ? '#34a853' : 'transparent',
              color: activeTab === 'campus' ? '#ffffff' : '#64748b',
              fontWeight: activeTab === 'campus' ? 800 : 650,
              fontSize: '0.72rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: activeTab === 'campus' ? '0 2px 8px rgba(52, 168, 83, 0.32)' : 'none',
              outline: 'none',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}
            className="hover-scale-mini"
            title="Zu Campus wechseln"
          >
            <GraduationCap size={16} color={activeTab === 'campus' ? '#ffffff' : '#34a853'} strokeWidth={2.4} />
            <span>Campus</span>
          </button>

          {/* 3. GrooveLab (Gelb) */}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'groovelab'}
            onClick={() => {
              setActiveTab?.('groovelab');
              sessionStorage.setItem('groovelab_active_workspace', 'groovelab');
            }}
            style={{
              height: '46px',
              borderRadius: '9px',
              border: 'none',
              background: activeTab === 'groovelab' ? '#facc15' : 'transparent',
              color: activeTab === 'groovelab' ? '#0f172a' : '#64748b',
              fontWeight: activeTab === 'groovelab' ? 800 : 650,
              fontSize: '0.72rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: activeTab === 'groovelab' ? '0 2px 8px rgba(234, 179, 8, 0.35)' : 'none',
              outline: 'none',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}
            className="hover-scale-mini"
            title="Zu GrooveLab wechseln"
          >
            <Music size={16} color={activeTab === 'groovelab' ? '#0f172a' : '#ca8a04'} strokeWidth={2.4} />
            <span>GrooveLab</span>
          </button>
        </div>
      ) : (
        /* Collapsed Mode: Vertikaler 3-Icon-Stack */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', width: '100%' }}>
          <button
            type="button"
            onClick={() => { setActiveTab?.('secretary'); sessionStorage.setItem('groovelab_active_workspace', 'secretary'); }}
            title="Verwaltung"
            aria-label="Verwaltung"
            style={{
              width: '42px',
              height: '38px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'secretary' ? '#ea4335' : '#f8fafc',
              color: activeTab === 'secretary' ? '#ffffff' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: activeTab === 'secretary' ? '0 2px 8px rgba(234, 67, 53, 0.3)' : 'none',
              transition: 'all 0.18s ease'
            }}
            className="hover-scale"
          >
            <Shield size={17} color={activeTab === 'secretary' ? '#ffffff' : '#ea4335'} strokeWidth={2.4} />
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab?.('campus'); sessionStorage.setItem('groovelab_active_workspace', 'campus'); }}
            title="Campus"
            aria-label="Campus"
            style={{
              width: '42px',
              height: '38px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'campus' ? '#34a853' : '#f8fafc',
              color: activeTab === 'campus' ? '#ffffff' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: activeTab === 'campus' ? '0 2px 8px rgba(52, 168, 83, 0.3)' : 'none',
              transition: 'all 0.18s ease'
            }}
            className="hover-scale"
          >
            <GraduationCap size={17} color={activeTab === 'campus' ? '#ffffff' : '#34a853'} strokeWidth={2.4} />
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab?.('groovelab'); sessionStorage.setItem('groovelab_active_workspace', 'groovelab'); }}
            title="GrooveLab"
            aria-label="GrooveLab"
            style={{
              width: '42px',
              height: '38px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'groovelab' ? '#facc15' : '#f8fafc',
              color: activeTab === 'groovelab' ? '#0f172a' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: activeTab === 'groovelab' ? '0 2px 8px rgba(234, 179, 8, 0.3)' : 'none',
              transition: 'all 0.18s ease'
            }}
            className="hover-scale"
          >
            <Music size={17} color={activeTab === 'groovelab' ? '#0f172a' : '#ca8a04'} strokeWidth={2.4} />
          </button>
        </div>
      )}

      {/* ── EBENE 4: Operative Navigations-Items ── */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
        {/* Module 1: Secretary Items */}
        {activeTab === 'secretary' && ([
          { id: 'briefing', label: 'Briefing', icon: LayoutDashboard },
          hasCampusSub && { 
            id: 'crisis', 
            label: 'Ausfall-Cockpit', 
            icon: ShieldAlert, 
            count: (() => {
              const todayStart = new Date();
              todayStart.setHours(0,0,0,0);
              return crisisNotifications.filter(n => {
                if (n.status !== 'UNREAD') return false;
                const untilVal = n.teacher?.ausfall_until ?? n.teacher?.ausfallUntil;
                if (!n.teacher || !untilVal) return false;
                const absenceUntilTime = new Date(untilVal).getTime();
                if (absenceUntilTime < todayStart.getTime()) return false;
                const isPast = new Date(n.slot_start_datetime).getTime() < todayStart.getTime();
                return !isPast;
              }).length;
            })()
          },
          hasCampusSub && { id: 'announcements', label: 'Mitteilungen & Infos', icon: FileText },
          { id: 'rooms', label: 'Räume', icon: DoorOpen },
          hasCampusSub && { id: 'equipment', label: 'Instrumente & Ausstattung', icon: Settings },
          { id: 'employees', label: 'Mitarbeiter', icon: Users },
          { id: 'licenses', label: 'Abrechnung & Lizenzen', icon: Award },
          { id: 'audit', label: 'Änderungsverlauf', icon: Clock },
          { id: 'setup', label: 'Einstellungen', icon: Settings }
        ] as any[]).filter(Boolean).map((item: any) => {
          const Icon = item.icon;
          const isSelected = secretarySubTab === item.id;
          return (
            <CampusSidebarRailItem
              key={item.id}
              icon={<Icon size={isCollapsed ? 20 : 18} />}
              label={item.label}
              isActive={isSelected}
              isCollapsed={isCollapsed}
              platform="briefing"
              badgeCount={item.count}
              onClick={() => {
                React.startTransition(() => {
                  setSecretarySubTab(item.id as any);
                });
              }}
            />
          );
        })}

        {/* Module 2: Campus Items */}
        {activeTab === 'campus' && ([
          { id: 'briefing', label: 'Startseite', icon: LayoutDashboard },
          enabledCampusSubjects && { id: 'subjects', label: 'Unterrichtsfächer', icon: BookOpen },
          { id: 'onboarding', label: 'Lehrer', icon: UserPlus },
          { id: 'students', label: 'Schüler', icon: Users },
          enabledCampusRooms && { id: 'rooms', label: 'Räume', icon: DoorOpen },
          enabledCampusEvents && { id: 'events', label: 'Termine', icon: Calendar },
          enabledCampusSchedules && { id: 'schedules', label: `Stundenpläne`, count: pendingSchedules.length, icon: Calendar },
          { id: 'status', label: 'Einstellungen', icon: Sliders }
        ] as any[]).filter(Boolean).map((item: any) => {
          const Icon = item.icon;
          const isSelected = campusSubTab === item.id;
          return (
            <CampusSidebarRailItem
              key={item.id}
              icon={<Icon size={isCollapsed ? 20 : 18} />}
              label={item.label}
              isActive={isSelected}
              isCollapsed={isCollapsed}
              platform="campus"
              badgeCount={item.count}
              onClick={() => setCampusSubTab(item.id as any)}
            />
          );
        })}

        {/* Module 3: GrooveLab Items */}
        {activeTab === 'groovelab' && [
          { id: 'live', label: 'Live Lab', icon: Monitor },
          { id: 'coaches', label: 'Lehrer', icon: GraduationCap },
          { id: 'students', label: 'Schüler', icon: Users },
          { id: 'settings', label: 'Einstellungen', icon: Settings }
        ].map((item) => {
          const Icon = item.icon;
          const isSelected = groovelabSubTab === item.id;
          return (
            <CampusSidebarRailItem
              key={item.id}
              icon={<Icon size={isCollapsed ? 20 : 18} />}
              label={item.label}
              isActive={isSelected}
              isCollapsed={isCollapsed}
              platform="groovelab"
              onClick={() => setGroovelabSubTab(item.id as any)}
            />
          );
        })}
      </nav>

      {/* ── 0,1% Goldstandard Multi-Modul User Hub (Symmetrischer Dual-Dock 2x50px + 2-Row Legal Links) ── */}
      <div style={{ 
        marginTop: 'auto', 
        borderTop: '1px solid #f1f5f9', 
        paddingTop: '12px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {isCollapsed ? (
          /* Collapsed Rail Mode (68px) */
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '10px',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {/* Tactile Mini Ausweis Button in Modul-Farbe */}
            <button
              type="button"
              onClick={() => setShowOwnQrModal(true)}
              title={`${moduleConfig.passTitle} öffnen (ID: ${canonicalId})`}
              aria-label={`${moduleConfig.passTitle} öffnen – ID ${canonicalId}`}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                border: moduleConfig.cardBorder,
                background: moduleConfig.badgeBg,
                color: moduleConfig.badgeColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                transition: 'all 0.18s ease'
              }}
              className="hover-scale"
            >
              <QrCode size={18} strokeWidth={2.4} />
            </button>

            {/* Avatar Profil Trigger (Historisches Tafelbild SSOT CAM-89) */}
            <button
              type="button"
              onClick={() => {
                setActiveTab?.('secretary');
                setSecretarySubTab('settings');
              }}
              title={`${userName} – Einstellungen & Schulprofil`}
              aria-label="Einstellungen & Schulprofil öffnen"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                border: (activeTab === 'secretary' && secretarySubTab === 'settings') ? `2px solid ${moduleConfig.accentColor}` : '1px solid #e2e8f0',
                background: (activeTab === 'secretary' && secretarySubTab === 'settings') ? '#f1f5f9' : '#f8fafc',
                padding: 0,
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'all 0.18s ease'
              }}
              className="hover-scale"
            >
              <img 
                src="/campus_login_hero.png"
                alt="" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} 
                loading="lazy" 
              />
            </button>

            {/* Clean Mini Logout */}
            <button
              type="button"
              onClick={handleSecretaryLogout}
              title="Sicher abmelden"
              aria-label="Abmelden"
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
        ) : (
          /* Expanded Mode: Symmetrischer Dual-Dock (2 x 50px) + 2-Row Legal Links */
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px', 
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {/* ── 1. Symmetrischer Dual-Dock: Digitaler Pass (50px) ── */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setShowOwnQrModal(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowOwnQrModal(true);
                }
              }}
              title={`${moduleConfig.passTitle} öffnen (ID: ${canonicalId})`}
              aria-label={`${moduleConfig.passTitle} öffnen – ID ${canonicalId}`}
              style={{
                width: '100%',
                height: '50px',
                borderRadius: '12px',
                background: moduleConfig.cardBgGradient,
                border: moduleConfig.cardBorder,
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
                e.currentTarget.style.background = moduleConfig.cardHoverBg;
                e.currentTarget.style.borderColor = moduleConfig.cardHoverBorder;
                e.currentTarget.style.boxShadow = moduleConfig.glowShadow;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = moduleConfig.cardBgGradient;
                e.currentTarget.style.borderColor = moduleConfig.cardBorder;
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.02)';
              }}
            >
              {/* Left: 34×34px Digital-Pass Squircle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0, flex: 1 }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: moduleConfig.badgeBg,
                  color: moduleConfig.badgeColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  border: `1px solid ${moduleConfig.badgeColor}25`,
                  flexShrink: 0
                }}>
                  <QrCode size={19} strokeWidth={2.4} />
                </div>

                {/* Center: Ausweis-Titel & autoritative ID */}
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
                    {moduleConfig.passTitle}
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
                    {canonicalId.startsWith('ID:') ? canonicalId : `ID: ${canonicalId}`}
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
                color: moduleConfig.accentColor,
                flexShrink: 0
              }}>
                <ArrowUpRight size={16} strokeWidth={2.5} />
              </div>
            </div>

            {/* ── 2. Symmetrischer Dual-Dock: Schulsekretariat Profil-Button (50px) ── */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                setActiveTab?.('secretary');
                setSecretarySubTab('settings');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveTab?.('secretary');
                  setSecretarySubTab('settings');
                }
              }}
              title="Einstellungen & Schulprofil öffnen"
              aria-label="Einstellungen & Schulprofil öffnen"
              style={{
                width: '100%',
                height: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '6px 10px',
                borderRadius: '12px',
                background: (activeTab === 'secretary' && secretarySubTab === 'settings') ? '#f1f5f9' : '#f8fafc',
                border: (activeTab === 'secretary' && secretarySubTab === 'settings') ? '1.5px solid #cbd5e1' : '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                boxSizing: 'border-box',
                outline: 'none'
              }}
              className="hover-scale"
            >
              {/* Left: Avatar (34×34px Historisches Tafelbild SSOT CAM-89) */}
              <div style={{ position: 'relative', width: '34px', height: '34px', flexShrink: 0 }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                }}>
                  <img 
                    src="/campus_login_hero.png"
                    alt="" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} 
                    loading="lazy" 
                  />
                </div>
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
                  {userName}
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
                  {moduleConfig.roleSubtitle}
                </div>
              </div>

              {/* Right: De-escalated Logout Icon Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSecretaryLogout();
                }}
                title="Sicher von der Verwaltung abmelden"
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
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenPrivacy?.(); } }}
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
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenAgb?.(); } }}
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
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenImpressum?.(); } }}
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
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenAccessibility?.(); } }}
                  style={{ cursor: 'pointer', transition: 'color 0.15s' }} 
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#475569')} 
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                >
                  Barrierefrei
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
