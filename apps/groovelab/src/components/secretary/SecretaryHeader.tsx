import React from 'react';
import { 
  Shield, 
  GraduationCap, 
  Music, 
  School, 
  User, 
  RefreshCw, 
  ArrowLeftRight 
} from 'lucide-react';
import { isDevEnvironment } from '../../utils/tenantUrlHelper';
import { SchoolDunningStatus } from '../../domain/schoolDunningEngine';
import { SecretaryUserProfile } from './SecretarySidebar';

export interface SecretaryHeaderProps {
  activeTab: 'secretary' | 'campus' | 'groovelab';
  setActiveTab: (tab: 'secretary' | 'campus' | 'groovelab') => void;
  isBillingBooked: boolean;
  hasCampusSub: boolean;
  hasGroovelabSub: boolean;
  schoolName: string;
  schoolId: string;
  currentUserProfile: SecretaryUserProfile | null;
  windowWidth: number;
  showDateSimulation: boolean;
  simulatedToday: string;
  setSimulatedToday: (val: string) => void;
  isCurrentUserTeacher: boolean;
  onRoleSwitched?: (role: string) => void;
  showDualRoleNotice: boolean;
  setShowDualRoleNotice: (show: boolean) => void;
  isSchoolTrial: boolean;
  schoolTrialEndsAt: string | null;
  schoolStatus: string;
  trialDaysRemaining: number;
  subscriptionBypass: boolean;
  dunningStatus: SchoolDunningStatus;
  setShowDunningPayModal: (show: boolean) => void;
  secretarySubTab: string;
  setSecretarySubTab: (tab: any) => void;
}

export const SecretaryHeader: React.FC<SecretaryHeaderProps> = ({
  activeTab,
  setActiveTab,
  isBillingBooked,
  hasCampusSub,
  hasGroovelabSub,
  schoolName,
  schoolId,
  currentUserProfile,
  windowWidth,
  showDateSimulation,
  simulatedToday,
  setSimulatedToday,
  isCurrentUserTeacher,
  onRoleSwitched,
  showDualRoleNotice,
  setShowDualRoleNotice,
  isSchoolTrial,
  schoolTrialEndsAt,
  schoolStatus,
  trialDaysRemaining,
  subscriptionBypass,
  dunningStatus,
  setShowDunningPayModal,
  secretarySubTab,
  setSecretarySubTab
}) => {
  return (
    <>
      {/* Top Header with App Suite Switcher Tabs (Karteireiter) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: windowWidth < 768 ? '0 12px' : '0 40px',
        height: windowWidth < 768 ? '62px' : '80px',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        background: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        {/* App Switcher Tabs */}
        <div 
          role="tablist"
          aria-label="Modulauswahl Verwaltung, Campus und GrooveLab"
          style={{ 
            display: 'flex', 
            alignItems: 'flex-end', 
            gap: '6px', 
            height: '100%',
            paddingTop: '20px',
            boxSizing: 'border-box'
          }}
        >
          {/* Sekretariat Tab Button */}
          <div 
            role="tab"
            aria-selected={activeTab === 'secretary'}
            tabIndex={0}
            id="tab-secretary"
            aria-controls="panel-secretary"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActiveTab('secretary');
                sessionStorage.setItem('groovelab_active_workspace', 'secretary');
              }
            }}
            onClick={() => {
              setActiveTab('secretary');
              sessionStorage.setItem('groovelab_active_workspace', 'secretary');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 22px 10px',
              borderRadius: '12px 12px 0 0',
              background: activeTab === 'secretary' ? '#ea4335' : 'rgba(234, 67, 53, 0.05)',
              color: activeTab === 'secretary' ? '#ffffff' : '#ea4335',
              border: activeTab === 'secretary' ? '1px solid #ea4335' : '1px solid rgba(234, 67, 53, 0.18)',
              borderBottom: 'none',
              fontWeight: 750,
              fontSize: '0.82rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              zIndex: activeTab === 'secretary' ? 2 : 1,
              transform: activeTab === 'secretary' ? 'translateY(1px)' : 'translateY(0)',
              boxShadow: activeTab === 'secretary' ? '0 -4px 16px rgba(234, 67, 53, 0.18)' : 'none',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              height: '44px',
              boxSizing: 'border-box',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}
          >
            <Shield size={15} color={activeTab === 'secretary' ? '#ffffff' : '#ea4335'} />
            <span>Verwaltung</span>
          </div>

          {(!isBillingBooked || hasCampusSub) && (
            /* Campus Tab Button */
            <div 
              role="tab"
              aria-selected={activeTab === 'campus'}
              tabIndex={0}
              id="tab-campus"
              aria-controls="panel-campus"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveTab('campus');
                  sessionStorage.setItem('groovelab_active_workspace', 'campus');
                }
              }}
              onClick={() => {
                setActiveTab('campus');
                sessionStorage.setItem('groovelab_active_workspace', 'campus');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 22px 10px',
                borderRadius: '12px 12px 0 0',
                background: activeTab === 'campus' ? '#34a853' : 'rgba(52, 168, 83, 0.05)',
                color: activeTab === 'campus' ? '#ffffff' : '#34a853',
                border: activeTab === 'campus' ? '1px solid #34a853' : '1px solid rgba(52, 168, 83, 0.18)',
                borderBottom: 'none',
                fontWeight: 750,
                fontSize: '0.82rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                zIndex: activeTab === 'campus' ? 2 : 1,
                transform: activeTab === 'campus' ? 'translateY(1px)' : 'translateY(0)',
                boxShadow: activeTab === 'campus' ? '0 -4px 16px rgba(52, 168, 83, 0.18)' : 'none',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                height: '44px',
                boxSizing: 'border-box',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}
            >
              <GraduationCap size={15} color={activeTab === 'campus' ? '#ffffff' : '#34a853'} />
              <span>Campus</span>
            </div>
          )}

          {(!isBillingBooked || hasGroovelabSub) && (
            /* GrooveLab Tab Button */
            <div 
              role="tab"
              aria-selected={activeTab === 'groovelab'}
              tabIndex={0}
              id="tab-groovelab"
              aria-controls="panel-groovelab"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveTab('groovelab');
                  sessionStorage.setItem('groovelab_active_workspace', 'groovelab');
                }
              }}
              onClick={() => {
                setActiveTab('groovelab');
                sessionStorage.setItem('groovelab_active_workspace', 'groovelab');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 22px 10px',
                borderRadius: '12px 12px 0 0',
                background: activeTab === 'groovelab' ? '#fbbc05' : 'rgba(251, 188, 5, 0.05)',
                color: activeTab === 'groovelab' ? '#09090b' : '#b45309',
                border: activeTab === 'groovelab' ? '1px solid #fbbc05' : '1px solid rgba(251, 188, 5, 0.18)',
                borderBottom: 'none',
                fontWeight: 750,
                fontSize: '0.82rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                zIndex: activeTab === 'groovelab' ? 2 : 1,
                transform: activeTab === 'groovelab' ? 'translateY(1px)' : 'translateY(0)',
                boxShadow: activeTab === 'groovelab' ? '0 -4px 16px rgba(251, 188, 5, 0.18)' : 'none',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                height: '44px',
                boxSizing: 'border-box',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}
            >
              <Music size={15} color={activeTab === 'groovelab' ? '#09090b' : '#b45309'} />
              <span>GrooveLab</span>
            </div>
          )}
        </div>

        {/* Action & Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Unified School & User Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(59, 130, 246, 0.04)',
            height: '40px',
            padding: '0 16px',
            borderRadius: '12px',
            border: '1px solid rgba(59, 130, 246, 0.12)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}>
            <span style={{
              fontWeight: 750,
              fontSize: '0.76rem',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <School size={14} color="#ef4444" />
                <span>{schoolName || 'Meine Musikschule'}</span>
              </span>
              <span style={{ color: '#94a3b8', margin: '0 2px' }}>•</span>
              <span style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} color="#3b82f6" />
                <span>
                  {currentUserProfile 
                    ? `${currentUserProfile.first_name || ''} ${currentUserProfile.last_name || ''}`.trim() 
                    : (schoolName ? `${schoolName} Schulleitung` : 'Verwaltung')}
                </span>
                <span style={{
                  marginLeft: '2px',
                  background: '#fee2e2',
                  color: '#b91c1c',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  fontSize: '0.62rem',
                  fontWeight: 900,
                  padding: '2px 6px',
                  borderRadius: '6px',
                  letterSpacing: '0.04em',
                  lineHeight: 1
                }}>
                  VERWALTUNG
                </span>
              </span>
            </span>
          </div>

          {/* Elegant Refresh / Reload Button */}
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              width: '40px', 
              height: '40px', 
              borderRadius: '12px', 
              background: '#f8fafc', 
              border: '1px solid #e2e8f0', 
              color: '#64748b', 
              cursor: 'pointer', 
              transition: 'all 0.2s ease', 
              flexShrink: 0 
            }}
            className="hover-scale"
            title="Seite neu laden"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.color = '#334155';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <RefreshCw size={16} />
          </button>

          {/* Datum Simulation Control (Dev Mode Only - Toggled via Shift+T) */}
          {isDevEnvironment() && showDateSimulation && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: simulatedToday ? '#fefce8' : '#f8fafc',
              border: simulatedToday ? '1.5px solid #eab308' : '1.5px solid #cbd5e1',
              height: '40px',
              padding: '0 10px',
              borderRadius: '12px',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#334155',
              boxShadow: simulatedToday ? '0 2px 8px rgba(234, 179, 8, 0.2)' : 'none',
              transition: 'all 0.2s',
              flexShrink: 0
            }} title="Datum-Simulation für alle Dashboards">
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: simulatedToday ? '#854d0e' : '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                📅 Simu:
              </span>
              <input 
                type="date"
                value={simulatedToday || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setSimulatedToday(val);
                  if (val) {
                    localStorage.setItem('groovelab_simulated_date', val);
                    localStorage.setItem('groovelab_simulated_start_timestamp', String(Date.now()));
                    if (schoolId) {
                      localStorage.setItem(`simulatedToday_${schoolId}`, val);
                    }
                  } else {
                    localStorage.removeItem('groovelab_simulated_date');
                    localStorage.removeItem('groovelab_simulated_start_timestamp');
                    if (schoolId) {
                      localStorage.removeItem(`simulatedToday_${schoolId}`);
                    }
                  }
                  window.dispatchEvent(new Event('storage'));
                  window.dispatchEvent(new CustomEvent('groovelab_simulated_date_changed'));
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  color: simulatedToday ? '#ca8a04' : '#0f172a',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
              {simulatedToday && (
                <button
                  type="button"
                  onClick={() => {
                    setSimulatedToday('');
                    localStorage.removeItem('groovelab_simulated_date');
                    localStorage.removeItem('groovelab_simulated_start_timestamp');
                    if (schoolId) {
                      localStorage.removeItem(`simulatedToday_${schoolId}`);
                    }
                    window.dispatchEvent(new Event('storage'));
                    window.dispatchEvent(new CustomEvent('groovelab_simulated_date_changed'));
                  }}
                  style={{
                    border: 'none',
                    background: '#fef08a',
                    color: '#854d0e',
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                  title="Auf heutiges Datum zurücksetzen"
                >
                  Heute
                </button>
              )}
            </div>
          )}

          {/* Elegant Switch to Teacher Dashboard Button (Only rendered if current user possesses active teacher role) */}
          {isCurrentUserTeacher && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (onRoleSwitched) {
                  onRoleSwitched('teacher');
                }
              }}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '6px', 
                background: '#e6f4ea', 
                border: '1.5px solid #34a853', 
                height: '40px', 
                padding: '0 14px', 
                borderRadius: '12px', 
                color: '#34a853', 
                fontWeight: 800, 
                fontSize: '0.8rem', 
                cursor: 'pointer', 
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', 
                boxShadow: '0 4px 12px rgba(52, 168, 83, 0.12)', 
                flexShrink: 0 
              }}
              className="hover-scale"
              title="Zum Lehrer-Dashboard wechseln"
              aria-label="Aktive Ansicht: Schulsekretariat. Klicken, um zum Lehrer-Dashboard zu wechseln."
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#d1fae5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#e6f4ea';
              }}
            >
              <ArrowLeftRight size={13} color="#34a853" />
              <GraduationCap size={15} color="#34a853" />
              <span>Zum Lehrerpult</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Thin accent line matching the active tab label color */}
      <div style={{
        height: '3px',
        background: activeTab === 'secretary' ? '#ea4335' : activeTab === 'campus' ? '#34a853' : '#fbbc05',
        width: '100%',
        flexShrink: 0
      }} />

      {/* Dual Role Notice */}
      {showDualRoleNotice && (
        <div style={{
          background: '#ecfdf5',
          borderBottom: '1px solid #a7f3d0',
          padding: '10px 40px',
          fontSize: '0.82rem',
          color: '#065f46',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontWeight: 600,
          fontFamily: 'Inter, sans-serif',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎓</span>
            <span><strong>Doppelrolle aktiv:</strong> Sie sind als Schulsekretariat angemeldet. Über die Schaltfläche <strong>„⇄ Zum Lehrerpult“</strong> oben rechts können Sie jederzeit zu Ihrer persönlichen Unterrichtsansicht wechseln.</span>
          </div>
          <button
            onClick={() => {
              setShowDualRoleNotice(false);
              try {
                sessionStorage.removeItem('groovelab_dual_role_switched_notice');
              } catch (e) {}
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#047857',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: '0.85rem',
              padding: '2px 8px'
            }}
            aria-label="Hinweis schließen"
          >
            ✕
          </button>
        </div>
      )}

      {/* Setup-Modus Banner */}
      {!isBillingBooked && !isSchoolTrial && !hasCampusSub && !hasGroovelabSub && (
        <div style={{
          background: '#e8f0fe',
          borderBottom: '1px solid #d2e3fc',
          padding: '10px 40px',
          fontSize: '0.82rem',
          color: '#1967d2',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 500,
          fontFamily: 'Inter, sans-serif',
          flexShrink: 0
        }}>
          <span>🛠️</span>
          <span><strong>Setup-Modus aktiv:</strong> Die {schoolName || 'Musikschule'} befindet sich in der Konfigurationsphase. Aktuell entstehen für Ihre Schule keine Infrastruktur- oder Nutzungsgebühren.</span>
        </div>
      )}

      {/* Subscription Bypass Banner */}
      {subscriptionBypass && (
        <div style={{
          background: '#f3e8ff',
          borderBottom: '1px solid #e9d5ff',
          padding: '10px 40px',
          fontSize: '0.82rem',
          color: '#6b21a8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontWeight: 700,
          fontFamily: 'Inter, sans-serif',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>✦</span>
            <span><strong>Freistellung aktiv (Abo-Bypass):</strong> Ihre Musikschule nutzt Campus-Groovelab im Rahmen einer kostenfreien Freistellung. Es fallen keine Server-Hosting- oder Nutzungsgebühren an.</span>
          </div>
        </div>
      )}

      {/* School Trial Banner */}
      {!isBillingBooked && isSchoolTrial && !subscriptionBypass && (
        <div style={{
          background: (isSchoolTrial && schoolTrialEndsAt && new Date(schoolTrialEndsAt).getTime() < Date.now()) || (schoolStatus === 'expired')
            ? '#fef2f2'
            : (trialDaysRemaining <= 7 ? '#fff7ed' : '#e6f4ea'),
          borderBottom: (isSchoolTrial && schoolTrialEndsAt && new Date(schoolTrialEndsAt).getTime() < Date.now()) || (schoolStatus === 'expired')
            ? '1px solid #fee2e2'
            : (trialDaysRemaining <= 7 ? '1px solid #ffedd5' : '1px solid #e6f4ea'),
          padding: '10px 40px',
          fontSize: '0.82rem',
          color: (isSchoolTrial && schoolTrialEndsAt && new Date(schoolTrialEndsAt).getTime() < Date.now()) || (schoolStatus === 'expired')
            ? '#b91c1c'
            : (trialDaysRemaining <= 7 ? '#c2410c' : '#34a853'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontWeight: 700,
          fontFamily: 'Inter, sans-serif',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>✨</span>
            <span>
              {(isSchoolTrial && schoolTrialEndsAt && new Date(schoolTrialEndsAt).getTime() < Date.now()) || (schoolStatus === 'expired') ? (
                <><strong>Testphase abgelaufen:</strong> Bitte schließe den Bestellprozess ab, um Campus-Groovelab weiter zu nutzen.</>
              ) : (
                <><strong>Testphase aktiv:</strong> Deine Musikschule hat noch <strong>{trialDaysRemaining} Tage</strong> Zeit, um Campus-Groovelab einzurichten und zu testen.</>
              )}
            </span>
          </div>
          {!(activeTab === 'secretary' && secretarySubTab === 'licenses') && (
            <button
              onClick={() => {
                setActiveTab('secretary');
                setSecretarySubTab('licenses');
              }}
              style={{
                background: (isSchoolTrial && schoolTrialEndsAt && new Date(schoolTrialEndsAt).getTime() < Date.now()) || (schoolStatus === 'expired')
                  ? '#dc2626'
                  : (trialDaysRemaining <= 7 ? '#ea580c' : '#34a853'),
                color: '#ffffff',
                border: 'none',
                borderRadius: '100px',
                padding: '6px 16px',
                fontSize: '0.74rem',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
              }}
            >
              Bestellprozess abschließen
            </button>
          )}
        </div>
      )}

      {/* Enterprise B2B Delinquency & Grace Period Escalation Banner */}
      {!subscriptionBypass && dunningStatus.isDelinquent && (
        <div style={{
          background: dunningStatus.isSecretaryReadOnly
            ? '#fef2f2'
            : (dunningStatus.level === 'level_2_warning' ? '#fffbeb' : '#eff6ff'),
          borderBottom: dunningStatus.isSecretaryReadOnly
            ? '1px solid #fee2e2'
            : (dunningStatus.level === 'level_2_warning' ? '1px solid #fef3c7' : '1px solid #dbeafe'),
          padding: '12px 40px',
          fontSize: '0.84rem',
          color: dunningStatus.isSecretaryReadOnly
            ? '#991b1b'
            : (dunningStatus.level === 'level_2_warning' ? '#92400e' : '#1e40af'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontWeight: 700,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.2rem' }}>
              {dunningStatus.isSecretaryReadOnly ? '🚨' : (dunningStatus.level === 'level_2_warning' ? '⚠️' : 'ℹ️')}
            </span>
            <span>
              {dunningStatus.isSecretaryReadOnly ? (
                <>
                  <strong>Administrativer Schreibschutz aktiv:</strong> Offene B2B-Infrastrukturrechnung in Höhe von <strong>{dunningStatus.totalOverdueAmount.toFixed(2)} €</strong> (überfällig seit {dunningStatus.overdueDays} Tagen). Neuanlagen sind pausiert. Schüler &amp; Unterrichtsbetrieb bleiben uneingeschränkt geschützt.
                </>
              ) : dunningStatus.level === 'level_2_warning' ? (
                <>
                  <strong>Dringende Mahnung:</strong> Offene B2B-Infrastrukturrechnung in Höhe von <strong>{dunningStatus.totalOverdueAmount.toFixed(2)} €</strong>. Noch <strong>{dunningStatus.adminCountdownDays} {dunningStatus.adminCountdownDays === 1 ? 'Tag' : 'Tage'}</strong> bis zum administrativen Schreibschutz &amp; Audio-Tresor-Uploadstopp.
                </>
              ) : (
                <>
                  <strong>Zahlungserinnerung:</strong> Für die Musikschule liegt eine offene B2B-Infrastrukturrechnung über <strong>{dunningStatus.totalOverdueAmount.toFixed(2)} €</strong> vor (Fällig seit {dunningStatus.overdueDays} Tagen).
                </>
              )}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setShowDunningPayModal(true)}
              style={{
                background: dunningStatus.isSecretaryReadOnly ? '#dc2626' : (dunningStatus.level === 'level_2_warning' ? '#d97706' : '#2563eb'),
                color: '#ffffff',
                border: 'none',
                borderRadius: '100px',
                padding: '7px 18px',
                fontSize: '0.76rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              <span>⚡ Sofort ausgleichen (EPC-QR)</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
