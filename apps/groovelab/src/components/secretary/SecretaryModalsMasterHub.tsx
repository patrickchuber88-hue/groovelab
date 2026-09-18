import React, { Suspense, lazy } from 'react';
import type { SecretaryOperationsModalsHubProps } from './SecretaryOperationsModalsHub';
import type { SecretaryFacilityLogModalProps } from './SecretaryFacilityLogModal';
import type { SecretaryUserDetailModalsHubProps } from './SecretaryUserDetailModalsHub';
import type { SecretaryBillingModalsHubProps } from './SecretaryBillingModalsHub';
import type { SecretaryGeneralModalsHubProps } from './SecretaryGeneralModalsHub';

const SecretaryOperationsModalsHub = lazy(() => import('./SecretaryOperationsModalsHub').then(m => ({ default: m.SecretaryOperationsModalsHub })));
const SecretaryFacilityLogModal = lazy(() => import('./SecretaryFacilityLogModal').then(m => ({ default: m.SecretaryFacilityLogModal })));
const SecretaryUserDetailModalsHub = lazy(() => import('./SecretaryUserDetailModalsHub').then(m => ({ default: m.SecretaryUserDetailModalsHub })));
const SecretaryBillingModalsHub = lazy(() => import('./SecretaryBillingModalsHub').then(m => ({ default: m.SecretaryBillingModalsHub })));
const SecretaryGeneralModalsHub = lazy(() => import('./SecretaryGeneralModalsHub').then(m => ({ default: m.SecretaryGeneralModalsHub })));

export interface SecretaryModalsMasterHubProps {
  operationsProps: SecretaryOperationsModalsHubProps;
  facilityLogProps?: SecretaryFacilityLogModalProps | null;
  userDetailProps: SecretaryUserDetailModalsHubProps;
  billingProps: SecretaryBillingModalsHubProps;
  generalProps: SecretaryGeneralModalsHubProps;
}

export const SecretaryModalsMasterHub: React.FC<SecretaryModalsMasterHubProps> = ({
  operationsProps,
  facilityLogProps,
  userDetailProps,
  billingProps,
  generalProps
}) => {
  return (
    <>
      <Suspense fallback={null}>
        <SecretaryOperationsModalsHub {...operationsProps} />
        {facilityLogProps && facilityLogProps.isOpen && (
          <SecretaryFacilityLogModal {...facilityLogProps} />
        )}
      </Suspense>

      <Suspense fallback={null}>
        <SecretaryUserDetailModalsHub {...userDetailProps} />
      </Suspense>

      <Suspense fallback={null}>
        <SecretaryBillingModalsHub {...billingProps} />
      </Suspense>

      <Suspense fallback={null}>
        <SecretaryGeneralModalsHub {...generalProps} />
      </Suspense>
    </>
  );
};
