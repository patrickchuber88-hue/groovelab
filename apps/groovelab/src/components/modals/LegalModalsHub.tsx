import React, { Suspense, lazy } from 'react';

const LegalTextModal = lazy(() => import('../LegalTextModal').then(m => ({ default: m.LegalTextModal })));

import type { LegalTab } from '../LegalTextModal';

export interface LegalModalsHubProps {
  showPrivacy: boolean;
  showAgb: boolean;
  showImpressum: boolean;
  showCancellation: boolean;
  showAccessibility: boolean;
  showAvv?: boolean;
  showSla?: boolean;
  showSchoolParentInfo?: boolean;
  showChildProtection?: boolean;
  onClose: () => void;
}

/**
 * 🏛️ LegalModalsHub (Monolith Goldstandard Hub)
 * Kapselt alle rechtlichen Dialoge (Datenschutz, AGB, AVV, SLA, Impressum, Widerruf, Barrierefreiheit nach BFSG 2025)
 * und entlastet App.tsx vom repetitiven Rendering und Suspense-Overhead.
 */
export const LegalModalsHub: React.FC<LegalModalsHubProps> = ({
  showPrivacy,
  showAgb,
  showImpressum,
  showCancellation,
  showAccessibility,
  showAvv,
  showSla,
  showSchoolParentInfo,
  showChildProtection,
  onClose,
}) => {
  const isLegalOpen =
    showPrivacy ||
    showAgb ||
    showImpressum ||
    showCancellation ||
    showAccessibility ||
    !!showAvv ||
    !!showSla ||
    !!showSchoolParentInfo ||
    !!showChildProtection;

  if (!isLegalOpen) return null;

  let initialTab: LegalTab = 'impressum';
  if (showAvv) initialTab = 'avv';
  else if (showSla) initialTab = 'sla';
  else if (showSchoolParentInfo) initialTab = 'school_parent_info';
  else if (showChildProtection) initialTab = 'child_protection';
  else if (showAccessibility) initialTab = 'accessibility';
  else if (showPrivacy) initialTab = 'privacy';
  else if (showAgb) initialTab = 'terms';
  else if (showCancellation) initialTab = 'cancellation';

  return (
    <Suspense fallback={null}>
      <LegalTextModal 
        isOpen={isLegalOpen}
        initialTab={initialTab}
        onClose={onClose}
      />
    </Suspense>
  );
};
