import React from 'react';
import { 
  Shield, 
  GraduationCap, 
  Music, 
  School, 
  User, 
  RefreshCw, 
  ArrowLeftRight,
  Menu,
  ArrowLeft,
  QrCode
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
  campusSubTab?: string;
  setCampusSubTab?: (tab: any) => void;
  groovelabSubTab?: string;
  setGroovelabSubTab?: (tab: any) => void;
  onOpenMobileMenu?: () => void;
  onOpenQrModal?: () => void;
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
  setSecretarySubTab,
  campusSubTab = 'briefing',
  setCampusSubTab,
  groovelabSubTab = 'live',
  setGroovelabSubTab,
  onOpenMobileMenu,
  onOpenQrModal
}) => {
  const currentMobileBoardTitle = React.useMemo(() => {
    if (activeTab === 'secretary') {
      switch (secretarySubTab) {
        case 'briefing': return 'Cockpit';
        case 'rooms': return 'Räume & Belegung';
        case 'crisis': return 'Ausfall-Cockpit';
        case 'announcements': return 'Mitteilungen';
        case 'equipment': return 'Instrumente & Inventar';
        case 'employees': return 'Team & Lehrkräfte';
        case 'licenses': return 'Gebühren & Lizenzen';
        case 'audit': return 'Änderungsverlauf';
        case 'setup': return 'Einstellungen';
        case 'duties': return 'Aufgaben & Pflichten';
        default: return 'Verwaltung';
      }
    }
    if (activeTab === 'campus') {
      switch (campusSubTab) {
        case 'briefing': return 'Campus Zentrale';
        case 'schedules': return 'Stundenpläne';
        case 'students': return 'Schülerverwaltung';
        case 'onboarding': return 'Lehrer & Onboarding';
        case 'rooms': return 'Räume (Campus)';
        case 'subjects': return 'Fächer & Angebot';
        case 'events': return 'Termine & Konzerte';
        case 'occupancy': return 'Belegungsplan';
        default: return 'Campus Steuerung';
      }
    }
    switch (groovelabSubTab) {
      case 'live': return 'Live Lab';
      case 'coaches': return 'Lehrer (GrooveLab)';
      case 'students': return 'Schüler (GrooveLab)';
      case 'maintenance': return 'Stationen & Wartung';
      case 'settings': return 'GrooveLab Setup';
      default: return 'GrooveLab';
    }
  }, [activeTab, secretarySubTab, campusSubTab, groovelabSubTab]);

  const isSubBoardActive =
    (activeTab === 'secretary' && secretarySubTab !== 'briefing') ||
    (activeTab === 'campus' && campusSubTab !== 'briefing') ||
    (activeTab === 'groovelab' && groovelabSubTab !== 'live');

  const handleBackToCockpit = () => {
    React.startTransition(() => {
      if (activeTab === 'secretary') {
        setSecretarySubTab('briefing');
      } else if (activeTab === 'campus' && setCampusSubTab) {
        setCampusSubTab('briefing');
      } else if (activeTab === 'groovelab' && setGroovelabSubTab) {
        setGroovelabSubTab('live');
      }
    });
  };

  const brandAccentColor =
    activeTab === 'campus' ? '#15803d' : activeTab === 'groovelab' ? '#b45309' : '#dc2626';
  const brandSoftBg =
    activeTab === 'campus'
      ? 'rgba(52, 168, 83, 0.10)'
      : activeTab === 'groovelab'
        ? 'rgba(234, 179, 8, 0.14)'
        : 'rgba(234, 67, 53, 0.08)';

  return (
    <>
      {/* 0,1% Goldstandard: Full-Width Sticky Frosted-Glass Mobile Top Bar (<= 768px) — 1:1 Parity with GeminiMobileShell */}
      {windowWidth <= 768 && onOpenMobileMenu && (
        <header
          data-testid="secretary-mobile-top-bar"
          aria-label="Mobile Kopfleiste Verwaltung"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 950,
            height: 'calc(54px + env(safe-area-inset-top, 0px))',
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingLeft: '12px',
            paddingRight: '12px',
            background: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(226, 232, 240, 0.88)',
            boxShadow: '0 2px 12px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            boxSizing: 'border-box',
            fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}
        >
          {/* Left: 44x44px Permanent Hamburger Trigger */}
          <button
            type="button"
            id="mobile-main-menu-trigger"
            data-testid="mobile-main-menu-btn"
            onClick={onOpenMobileMenu}
            aria-label="Hauptmenü öffnen"
            title="Hauptmenü öffnen"
            style={{
              width: '44px',
              height: '44px',
              minWidth: '44px',
              minHeight: '44px',
              borderRadius: '12px',
              border: '1px solid #2d9248',
              background: '#34a853',
              boxShadow: '0 2px 8px rgba(52, 168, 83, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              padding: 0,
              flexShrink: 0,
              touchAction: 'manipulation',
              transition: 'transform 0.15s ease'
            }}
          >
            <Menu size={22} strokeWidth={2.6} color="#ffffff" />
          </button>

          {/* Center: Dynamic Board Title & Bounded Context Pill */}
          <div
            data-testid="secretary-mobile-board-title"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 0,
              flex: 1,
              textAlign: 'center'
            }}
          >
            <span style={{
              fontSize: '0.62rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: brandAccentColor,
              lineHeight: 1.1
            }}>
              {activeTab === 'campus' ? 'Campus' : activeTab === 'groovelab' ? 'GrooveLab' : 'Verwaltung'}
            </span>
            <span style={{
              fontSize: '0.92rem',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
              lineHeight: 1.25
            }}>
              {currentMobileBoardTitle}
            </span>
          </div>

          {/* Right: Universal Back-to-Cockpit Action on Sub-Boards OR 44x44px QR/ID Action on Home Board */}
          {isSubBoardActive ? (
            <button
              type="button"
              data-testid="secretary-mobile-back-btn"
              onClick={handleBackToCockpit}
              aria-label="Zurück zum Cockpit"
              title="Zurück zum Cockpit"
              style={{
                minHeight: '44px',
                minWidth: '44px',
                padding: '0 12px',
                borderRadius: '12px',
                border: 'none',
                background: '#f1f5f9',
                color: '#0f172a',
                fontSize: '0.76rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                cursor: 'pointer',
                flexShrink: 0,
                touchAction: 'manipulation',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}
            >
              <ArrowLeft size={15} strokeWidth={2.5} />
              <span>Cockpit</span>
            </button>
          ) : onOpenQrModal ? (
            <button
              type="button"
              data-testid="secretary-mobile-qr-btn"
              onClick={onOpenQrModal}
              aria-label="Digitalen Ausweis öffnen"
              title="Mein Ausweis"
              style={{
                width: '44px',
                height: '44px',
                minWidth: '44px',
                minHeight: '44px',
                borderRadius: '12px',
                border: 'none',
                background: '#f1f5f9',
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
                touchAction: 'manipulation'
              }}
            >
              <QrCode size={19} strokeWidth={2.2} />
            </button>
          ) : (
            <div style={{ width: '44px', height: '44px', flexShrink: 0 }} />
          )}
        </header>
      )}

      {/* Dual Role Notice */}
      {showDualRoleNotice && (
        <div style={{
          background: '#ecfdf5',
          borderBottom: '1px solid #a7f3d0',
          padding: windowWidth <= 768 ? '12px 16px 12px 66px' : '10px 40px',
          fontSize: '0.82rem',
          color: '#065f46',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          fontWeight: 600,
          fontFamily: 'Inter, sans-serif',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 220px' }}>
            <span>🎓</span>
            <span><strong>Doppelrolle aktiv:</strong> Sie sind als Schulsekretariat angemeldet. Über die Schaltfläche <strong>„⇄ Zum Lehrerpult“</strong> im Hauptmenü können Sie jederzeit zu Ihrer persönlichen Unterrichtsansicht wechseln.</span>
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
          padding: windowWidth <= 768 ? '12px 16px 12px 66px' : '10px 40px',
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
          padding: windowWidth <= 768 ? '12px 16px 12px 66px' : '10px 40px',
          fontSize: '0.82rem',
          color: '#6b21a8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
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
          padding: windowWidth <= 768 ? '12px 16px 12px 66px' : '10px 40px',
          fontSize: '0.82rem',
          color: (isSchoolTrial && schoolTrialEndsAt && new Date(schoolTrialEndsAt).getTime() < Date.now()) || (schoolStatus === 'expired')
            ? '#b91c1c'
            : (trialDaysRemaining <= 7 ? '#c2410c' : '#34a853'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          fontWeight: 700,
          fontFamily: 'Inter, sans-serif',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 200px' }}>
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

      {/* Enterprise B2B Delinquency & Grace Period Escalation Banner (Single Source of Truth) */}
      {!subscriptionBypass && dunningStatus.isDelinquent && dunningStatus.totalOverdueAmount > 0 && (
        <div style={{
          background: dunningStatus.isTrustExtended
            ? '#ecfdf5'
            : dunningStatus.isSecretaryReadOnly
              ? '#fef2f2'
              : (dunningStatus.level === 'level_2_warning' ? '#fffbeb' : '#eff6ff'),
          borderBottom: dunningStatus.isTrustExtended
            ? '1px solid #a7f3d0'
            : dunningStatus.isSecretaryReadOnly
              ? '1px solid #fee2e2'
              : (dunningStatus.level === 'level_2_warning' ? '1px solid #fef3c7' : '1px solid #dbeafe'),
          padding: windowWidth <= 768 ? '12px 16px 12px 66px' : '12px 40px',
          fontSize: '0.84rem',
          color: dunningStatus.isTrustExtended
            ? '#065f46'
            : dunningStatus.isSecretaryReadOnly
              ? '#991b1b'
              : (dunningStatus.level === 'level_2_warning' ? '#92400e' : '#1e40af'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          fontWeight: 700,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 220px' }}>
            <span style={{ fontSize: '1.2rem' }}>
              {dunningStatus.isTrustExtended
                ? '🛡️'
                : dunningStatus.isSecretaryReadOnly
                  ? '🚨'
                  : (dunningStatus.level === 'level_2_warning' ? '⚠️' : 'ℹ️')}
            </span>
            <span>
              {(() => {
                const countLabel = `${dunningStatus.unpaidInvoicesCount} ${dunningStatus.unpaidInvoicesCount === 1 ? 'Beleg' : 'Belege'}`;
                const baseFormatted = dunningStatus.totalOverdueAmount.toFixed(2).replace('.', ',');
                const feeFormatted = (dunningStatus.appliedDunningFee || 0).toFixed(2).replace('.', ',');
                const totalFormatted = (dunningStatus.totalPayableAmount || dunningStatus.totalOverdueAmount).toFixed(2).replace('.', ',');
                const amountText = (dunningStatus.appliedDunningFee || 0) > 0
                  ? `${totalFormatted} € (${baseFormatted} € Hauptforderung + ${feeFormatted} € Mahnpauschale)`
                  : `${baseFormatted} €`;

                if (dunningStatus.isTrustExtended) {
                  return (
                    <>
                      <strong>
                        {dunningStatus.isKulanzActive
                          ? 'Master-Admin Kulanz-Stundung aktiv (+30 Tage):'
                          : `48h-Überweisungs-Brücke aktiv (noch ${dunningStatus.trustRemainingHours} Std.):`}
                      </strong>{' '}
                      Administrativer Schreibschutz für <strong>{countLabel} ({amountText})</strong> ist vorübergehend aufgehoben. Schüler &amp; Lehrkräfte genießen 100 % Didaktische Immunität.
                    </>
                  );
                }
                if (dunningStatus.isSecretaryReadOnly) {
                  return (
                    <>
                      <strong>Administrativer Schreibschutz aktiv ({countLabel} überfällig seit {dunningStatus.overdueDays} Tagen):</strong>{' '}
                      Ausstehender Gesamtbetrag: <strong>{amountText}</strong>. Neuanlagen im Sekretariat sind pausiert. Schüler &amp; Unterrichtsbetrieb bleiben zu 100 % geschützt (Didaktische Immunität).
                    </>
                  );
                }
                if (dunningStatus.level === 'level_2_warning') {
                  return (
                    <>
                      <strong>2. Mahnung ({countLabel} überfällig seit {dunningStatus.overdueDays} Tagen):</strong>{' '}
                      Ausstehender Gesamtbetrag: <strong>{amountText}</strong>. Noch <strong>{dunningStatus.adminCountdownDays} {dunningStatus.adminCountdownDays === 1 ? 'Tag' : 'Tage'}</strong> bis zum administrativen Schreibschutz im Sekretariat.
                    </>
                  );
                }
                return (
                  <>
                    <strong>Freundliche Zahlungserinnerung ({countLabel}):</strong>{' '}
                    Für die Musikschule liegt ein offener Rechnungssaldo über <strong>{amountText}</strong> vor (fällig seit {dunningStatus.overdueDays} Tagen).
                  </>
                );
              })()}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setShowDunningPayModal(true)}
              style={{
                background: dunningStatus.isTrustExtended
                  ? '#059669'
                  : dunningStatus.isSecretaryReadOnly
                    ? '#dc2626'
                    : (dunningStatus.level === 'level_2_warning' ? '#d97706' : '#2563eb'),
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
