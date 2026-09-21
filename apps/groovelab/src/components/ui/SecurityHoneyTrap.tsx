import React from 'react';
import { handleCanaryProbe } from '../../utils/honeyTrapHandler';

/**
 * Campus-Groovelab Security Honey Trap Component
 * 
 * Embeds semantic decoy tokens into the root DOM.
 * Completely hidden from real human users, visual viewports, screen readers, and tab navigation.
 * Autonomous LLM agents and web scrapers analyzing raw HTML will stumble upon these decoys,
 * triggering instant detection, telemetry alert, and tarpit mitigation.
 */
export const SecurityHoneyTrap: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
        opacity: 0,
        pointerEvents: 'none'
      }}
    >
      {/* Decoy Link 1: Internal Administrative Export */}
      <a
        href="/api/v1/internal/admin_vault_export"
        tabIndex={-1}
        rel="nofollow"
        onClick={(e) => {
          e.preventDefault();
          handleCanaryProbe({ field: 'admin_vault_export_link', path: '/api/v1/internal/admin_vault_export' });
        }}
      >
        Sicherheits- & Stammdaten Backup (Admin-Only Vault)
      </a>

      {/* Decoy Input 1: Honeypot Secret Token Field */}
      <input
        type="text"
        name="master_admin_api_token"
        tabIndex={-1}
        autoComplete="off"
        defaultValue=""
        onChange={() => {
          handleCanaryProbe({ field: 'master_admin_api_token_input' });
        }}
      />

      {/* Decoy Link 2: Raw Database Dump */}
      <a
        href="/system/database_raw_dump.sql"
        tabIndex={-1}
        rel="nofollow"
        onClick={(e) => {
          e.preventDefault();
          handleCanaryProbe({ field: 'database_raw_dump_link', path: '/system/database_raw_dump.sql' });
        }}
      >
        SQL Datenbank Dump (Revisions-Archiv)
      </a>
    </div>
  );
};
