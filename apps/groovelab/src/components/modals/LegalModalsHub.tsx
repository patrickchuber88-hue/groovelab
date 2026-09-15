import React, { Suspense, lazy } from 'react';

const LegalTextModal = lazy(() => import('../LegalTextModal').then(m => ({ default: m.LegalTextModal })));

export interface LegalModalsHubProps {
  showPrivacy: boolean;
  showAgb: boolean;
  showImpressum: boolean;
  showCancellation: boolean;
  showAccessibility: boolean;
  onClose: () => void;
}

/**
 * 🏛️ LegalModalsHub (Monolith Goldstandard Hub)
 * Kapselt alle rechtlichen Dialoge (Datenschutz, AGB, Impressum, Widerruf, Barrierefreiheit nach BFSG 2025)
 * und entlastet App.tsx vom repetitiven Rendering und Suspense-Overhead.
 */
export const LegalModalsHub: React.FC<LegalModalsHubProps> = ({
  showPrivacy,
  showAgb,
  showImpressum,
  showCancellation,
  showAccessibility,
  onClose,
}) => {
  const isLegalOpen = showPrivacy || showAgb || showImpressum || showCancellation || showAccessibility;
  if (!isLegalOpen) return null;

  const initialTab: 'privacy' | 'terms' | 'impressum' | 'cancellation' | 'accessibility' = showAccessibility
    ? 'accessibility'
    : (showPrivacy 
      ? 'privacy' 
      : (showAgb ? 'terms' : (showCancellation ? 'cancellation' : 'impressum')));

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
