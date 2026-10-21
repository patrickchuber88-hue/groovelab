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
        background: #ffffff !important;
        border: none !important;
        border-radius: var(--radius-md);
        padding: 24px;
        box-shadow: none !important;
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
        position: relative;
      }
      .google-card:hover {
        transform: translateY(-1px) !important;
        box-shadow: none !important;
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
        box-shadow: none;
      }
      .google-btn-secondary {
        background: #f1f5f9;
        color: #0f172a;
        border: none;
        font-weight: 700;
        font-size: 0.85rem;
        padding: 10px 24px;
        border-radius: var(--radius-pill);
        cursor: pointer;
        transition: all 0.2s;
        font-family: 'Plus Jakarta Sans', sans-serif;
      }
      .google-btn-secondary:hover {
        background: #e2e8f0;
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
        background: #f1f5f9;
      }
      /* Active states for each tab theme (Material 3 Solid Tonal Pills) */
      .google-sidebar-item.active.briefing {
        background: #fee2e2 !important;
        color: #b91c1c !important;
        font-weight: 700;
      }
      .google-sidebar-item.active.briefing .sidebar-icon-circle {
        background: #ea4335 !important;
        color: #ffffff;
      }
      .google-sidebar-item.active.campus {
        background: #e6f4ea !important;
        color: #137333 !important;
        font-weight: 700;
      }
      .google-sidebar-item.active.campus .sidebar-icon-circle {
        background: #34a853 !important;
        color: #ffffff;
      }
      .google-sidebar-item.active.groovelab {
        background: #fef9c3 !important;
        color: #854d0e !important;
        font-weight: 700;
      }
      .google-sidebar-item.active.groovelab .sidebar-icon-circle {
        background: #facc15 !important;
        color: #0f172a;
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
