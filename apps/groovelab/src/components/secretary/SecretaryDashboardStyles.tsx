import React, { memo } from 'react';

/**
 * Global CSS styles and animations for the SecretaryDashboard and its sub-views.
 * Encapsulates card glassmorphism, responsive sidebar themes, active states,
 * and toast notification slide animations.
 */
export const SecretaryDashboardStyles: React.FC = memo(() => {
  return (
    <style dangerouslySetInnerHTML={{__html: `
      .google-card {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.40) 100%) !important;
        backdrop-filter: blur(24px) saturate(1.8) !important;
        -webkit-backdrop-filter: blur(24px) saturate(1.8) !important;
        border: 1px solid rgba(255, 255, 255, 0.5) !important;
        border-radius: var(--radius-md);
        padding: 24px;
        box-shadow: 0 8px 32px rgba(15, 23, 42, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.6) !important;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        position: relative;
      }
      .google-card:hover {
        transform: translateY(-2px) scale(1.01) !important;
        box-shadow: 0 16px 48px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
      }
      .student-name-hover:hover .student-title-text {
        color: #34a853 !important;
        text-decoration: underline;
      }
      .google-btn-primary {
        background: #d81e05; /* Swiss Red */
        color: #ffffff;
        border: none;
        font-weight: 700;
        font-size: 0.85rem;
        padding: 10px 24px;
        border-radius: var(--radius-pill);
        cursor: pointer;
        transition: all 0.2s;
        font-family: 'Plus Jakarta Sans', sans-serif;
        letter-spacing: -0.01em;
      }
      .google-btn-primary:hover {
        background: #b71904;
        box-shadow: 0 4px 12px rgba(216, 30, 5, 0.25);
      }
      .google-btn-secondary {
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: var(--glass-blur);
        color: #12141a;
        border: 1px solid rgba(0, 0, 0, 0.1);
        font-weight: 700;
        font-size: 0.85rem;
        padding: 10px 24px;
        border-radius: var(--radius-pill);
        cursor: pointer;
        transition: all 0.2s;
        font-family: 'Plus Jakarta Sans', sans-serif;
      }
      .google-btn-secondary:hover {
        background: #ffffff;
        border-color: rgba(0, 0, 0, 0.2);
      }
      .google-sidebar-item {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 12px 20px;
        border-radius: 9999px;
        border: none;
        font-size: 0.88rem;
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        background: transparent;
        color: var(--text-secondary);
        text-align: left;
        box-sizing: border-box;
        margin-bottom: 4px;
        position: relative;
      }
      .google-sidebar-item:hover {
        background: rgba(0, 0, 0, 0.04);
      }
      /* Active states for each tab theme */
      .google-sidebar-item.active.briefing {
        background: rgba(234, 67, 53, 0.08) !important;
        color: #ea4335 !important;
        font-weight: 700;
      }
      .google-sidebar-item.active.briefing .sidebar-icon-circle {
        background: #ea4335 !important;
        color: #ffffff;
      }
      .google-sidebar-item.active.campus {
        background: rgba(52, 168, 83, 0.08) !important;
        color: #34a853 !important;
        font-weight: 700;
      }
      .google-sidebar-item.active.campus .sidebar-icon-circle {
        background: #34a853 !important;
        color: #ffffff;
      }
      .google-sidebar-item.active.groovelab {
        background: rgba(251, 188, 5, 0.12) !important;
        color: #fbbc05 !important;
        font-weight: 700;
      }
      .google-sidebar-item.active.groovelab .sidebar-icon-circle {
        background: #fbbc05 !important;
        color: #ffffff;
      }
      .google-sidebar-item.groovelab-dark {
        color: #a1a1aa !important;
      }
      .google-sidebar-item.groovelab-dark:hover {
        background: rgba(251, 188, 5, 0.08) !important;
        color: #fbbc05 !important;
      }
      .google-sidebar-item.groovelab-dark.active {
        background: rgba(251, 188, 5, 0.15) !important;
        color: #fbbc05 !important;
      }
      .google-sidebar-item.groovelab-dark.active .sidebar-icon-circle {
        background: #fbbc05 !important;
        color: #09090b !important;
      }

      /* Inactive badge style */
      .sidebar-icon-circle {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: all 0.2s ease;
        background: transparent;
        color: var(--text-secondary);
      }
      .google-sidebar-item:hover .sidebar-icon-circle {
        background: rgba(0, 0, 0, 0.05);
        color: var(--text-main);
      }

      .ticket-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 0;
        border-bottom: 1px solid var(--border-light);
        transition: background 0.2s;
      }
      @keyframes slideInToast {
        from {
          transform: translateX(120%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
        }
      }
      .slide-in-toast {
        animation: slideInToast 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
    `}} />
  );
});

SecretaryDashboardStyles.displayName = 'SecretaryDashboardStyles';
