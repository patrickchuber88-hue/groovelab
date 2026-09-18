import React, { memo } from 'react';
import { RefreshCw } from 'lucide-react';
import { isDevEnvironment } from '../../utils/tenantUrlHelper';

export interface SecretaryDeveloperResetButtonProps {
  activeTab: string;
  secretarySubTab: string;
  onReset: () => void;
}

/**
 * Floating developer reset button visible only in development mode on the licenses sub-tab.
 * Resets the order/checkout flow for testing purposes.
 */
export const SecretaryDeveloperResetButton: React.FC<SecretaryDeveloperResetButtonProps> = memo(({
  activeTab,
  secretarySubTab,
  onReset
}) => {
  if (
    !isDevEnvironment() ||
    typeof window === 'undefined' ||
    localStorage.getItem('show_dev_reset_button') !== 'true' ||
    activeTab !== 'secretary' ||
    secretarySubTab !== 'licenses'
  ) {
    return null;
  }

  return (
    <button
      onClick={onReset}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 99999,
        background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
        color: '#ffffff',
        border: 'none',
        borderRadius: '30px',
        padding: '12px 20px',
        fontSize: '0.8rem',
        fontWeight: 800,
        cursor: 'pointer',
        boxShadow: '0 10px 25px rgba(124, 58, 237, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s ease-in-out',
        fontFamily: 'Urbanist, sans-serif'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.boxShadow = '0 12px 30px rgba(124, 58, 237, 0.45)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 10px 25px rgba(124, 58, 237, 0.3)';
      }}
    >
      <RefreshCw size={14} style={{ animation: 'spin 4s linear infinite' }} />
      Entwickler-Reset (Bestellvorgang zurücksetzen)
    </button>
  );
});

SecretaryDeveloperResetButton.displayName = 'SecretaryDeveloperResetButton';
