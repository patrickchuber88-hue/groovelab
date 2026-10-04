/**
 * 🏛️ Campus-Groovelab Sponsor Notification Toast (Legacy Adapter)
 * 
 * 0.1% Monolith Goldstandard:
 * Leitet Legacy-Aufrufe an das moderne CampusSponsorIngressBanner weiter,
 * um Dead Code und schwebende System-Alerts vollständig zu eliminieren.
 */

import React from 'react';
import { CampusSponsorIngressBanner } from './CampusSponsorIngressBanner';
import type { SchoolSponsorSettings } from '../secretary/sponsors/SecretarySponsorsModal';

export interface SponsorNotificationToastProps {
  schoolId: string;
  sponsorSettings?: SchoolSponsorSettings | null;
  onDismiss?: () => void;
  position?: 'top' | 'bottom';
}

export const SponsorNotificationToast: React.FC<SponsorNotificationToastProps> = ({
  schoolId,
  sponsorSettings,
  onDismiss
}) => {
  return (
    <CampusSponsorIngressBanner
      schoolId={schoolId}
      sponsorSettings={sponsorSettings}
      onDismiss={onDismiss}
    />
  );
};

export default SponsorNotificationToast;
