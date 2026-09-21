import React, { Suspense, lazy } from 'react';
import type { School, MasterAdminPortalTab } from '../MasterAdminTypes';
import { GhostGateModal } from './GhostGateModal';
import { SchoolArchiveModal } from './SchoolArchiveModal';
import { MasterCommandPaletteModal } from './MasterCommandPaletteModal';
import { ExecutiveMonthlyReportModal } from './ExecutiveMonthlyReportModal';
import { PricingLegalNoticeModal } from './PricingLegalNoticeModal';
import { MasterIdleLockModal } from './MasterIdleLockModal';
import { MasterStepUpChallengeModal } from './MasterStepUpChallengeModal';

const HelpCenterModal = lazy(() => import('../../help/HelpCenterModal').then(m => ({ default: m.HelpCenterModal })));

export interface MasterAdminModalsHubProps {
  schools: any;
  pricing: any;
  operator: any;
  idleLock: any;
  modalStates: any;
  stepUp: any;
  activePortalTab: MasterAdminPortalTab;
  setActivePortalTab: (tab: MasterAdminPortalTab) => void;
  onLogout: () => void;
}

export const MasterAdminModalsHub: React.FC<MasterAdminModalsHubProps> = ({
  schools,
  pricing,
  operator,
  idleLock,
  modalStates,
  stepUp,
  activePortalTab,
  setActivePortalTab,
  onLogout,
}) => {
  return (
    <>
      {/* 1. Ghost Support Gate Modal with Step-Up Verification */}
      <GhostGateModal
        ghostGateSchool={schools.ghostGateSchool}
        ghostGateReason={schools.ghostGateReason}
        setGhostGateReason={schools.setGhostGateReason}
        ghostGateTicketRef={schools.ghostGateTicketRef}
        setGhostGateTicketRef={schools.setGhostGateTicketRef}
        onClose={() => schools.setGhostGateSchool(null)}
        onConfirm={(school, fullReason) => {
          stepUp.requestStepUp(
            `Support-Ghost-Modus für „${school.name}“`,
            () => {
              schools.handleStartGhostMode(school, fullReason);
            },
            'totp_only'
          );
          schools.setGhostGateSchool(null);
        }}
      />

      {/* 2. School Archive Modal with Step-Up Verification */}
      <SchoolArchiveModal
        archiveModalSchool={schools.archiveModalSchool}
        onClose={() => schools.setArchiveModalSchool(null)}
        onPauseSchool={(s: School) => schools.handleToggleSchoolStatus(s, 'suspended')}
        onDeleteSchool={(id: string, name: string) => {
          stepUp.requestStepUp(`Schule „${name}“ unwiderruflich löschen`, () => {
            schools.handleDeleteSchool(id, name);
          });
        }}
      />

      {/* 3. Cmd+K Master Command Palette */}
      <MasterCommandPaletteModal
        isOpen={modalStates.commandPaletteOpen}
        search={modalStates.commandSearch}
        setSearch={modalStates.setCommandSearch}
        onClose={() => modalStates.setCommandPaletteOpen(false)}
        schools={schools.schools}
        onSelectSchool={(s: School) => {
          schools.setSelectedSchool(s);
          modalStates.setCommandPaletteOpen(false);
        }}
        onNavigateTab={(tab) => {
          setActivePortalTab(tab as MasterAdminPortalTab);
          modalStates.setCommandPaletteOpen(false);
        }}
      />

      {/* 4. Executive Monthly Report Modal */}
      <ExecutiveMonthlyReportModal
        isOpen={modalStates.showMonthlyReportModal}
        onClose={() => modalStates.setShowMonthlyReportModal(false)}
        selectedReportMonth={modalStates.selectedReportMonth}
        schools={schools.schools}
        pendingUsers={[]}
        priceCampus={pricing.priceCampus}
        priceGroovelab={pricing.priceGroovelab}
        priceKombi={pricing.priceKombi}
        priceStudent={pricing.priceStudent}
      />

      {/* 5. Pricing Legal Notice Modal */}
      <PricingLegalNoticeModal
        isOpen={modalStates.showLegalNoticeModal}
        onClose={() => modalStates.setShowLegalNoticeModal(false)}
        priceCampus={Number(pricing.priceCampus)}
        priceGroovelab={Number(pricing.priceGroovelab)}
        priceKombi={Number(pricing.priceKombi)}
        priceTeacher={Number(pricing.priceTeacher)}
        priceStudent={Number(pricing.priceStudent)}
        priceEffectiveDate={pricing.priceEffectiveDate}
      />

      {/* 6. JIT Step-Up Challenge Modal (Touch ID / Google Authenticator) */}
      <MasterStepUpChallengeModal
        isOpen={stepUp.isStepUpOpen}
        actionName={stepUp.stepUpActionName}
        mode={stepUp.stepUpMode}
        loading={stepUp.stepUpLoading}
        error={stepUp.stepUpError}
        totpInput={stepUp.stepUpTotpInput}
        setTotpInput={stepUp.setStepUpTotpInput}
        onClose={stepUp.closeStepUp}
        onVerifyBiometrics={stepUp.verifyWithBiometrics}
        onVerifyTotp={stepUp.verifyWithTotp}
      />

      {/* 7. 15-Min Inactivity Idle Lock Screen */}
      <MasterIdleLockModal
        isIdleLocked={idleLock.isIdleLocked}
        idleUnlockLoading={idleLock.idleUnlockLoading}
        idlePinInput={idleLock.idlePinInput}
        setIdlePinInput={idleLock.setIdlePinInput}
        idleError={idleLock.idleError}
        onIdleUnlock={idleLock.handleIdleUnlock}
        masterPasskeyActive={operator.masterPasskeyActive}
        onLogout={onLogout}
      />

      {/* 8. Campus-Groovelab Fullscreen-Akademie */}
      {modalStates.isAkademieOpen && (
        <Suspense fallback={null}>
          <HelpCenterModal
            isOpen={modalStates.isAkademieOpen}
            onClose={() => modalStates.setIsAkademieOpen(false)}
            userRole="master_admin"
            activePlatform="campus"
            initialBoardId={activePortalTab}
            onNavigateBoard={(target) => {
              if (target) setActivePortalTab(target as MasterAdminPortalTab);
            }}
            schoolName="Campus-Groovelab Platform Root"
          />
        </Suspense>
      )}
    </>
  );
};
