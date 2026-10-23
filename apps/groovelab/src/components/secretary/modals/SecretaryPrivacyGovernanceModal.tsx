/**
 * SecretaryPrivacyGovernanceModal.tsx
 *
 * 0,1% Senior IT-Volljurist & Principal Architecture Goldstandard
 * 
 * Rechtsgrundlagen:
 * - DSGVO Art. 28 (Auftragsverarbeitung & elektronische Signatur gem. ZPO)
 * - DSGVO Art. 30 (Verzeichnis von Verarbeitungstätigkeiten / VVT)
 * - DSGVO Art. 32 (Technisch-organisatorische Maßnahmen / TOMs)
 * - DSGVO Art. 35 (Datenschutz-Folgenabschätzung / DSFA)
 * - DSGVO Art. 38 (Datenschutzbeauftragter & Kontrollrechte)
 * - DSGVO Art. 6, 7, 8 & UrhG (Entkoppelte Eltern-Einwilligung & KUG)
 * - DIN 66398 / GoBD Archivierung AO (Verbindliche Löschklassen & WORM-Audit-Garantie)
 * - BetrVG / BPersVG (Personalrats-Attest zur Dozentenautonomie)
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  FileText,
  FileCheck,
  Eye,
  Copy,
  Check,
  X,
  Printer,
  HardDrive,
  Lock,
  Users
} from 'lucide-react';
import { generateMessengerSafetyCertificatePDF } from '../../../utils/messengerSafetyCertificateGenerator';
import { copyMessengerClauseToClipboard } from '../../../utils/messengerClauseTemplate';
import { generateParentConsentPDF } from '../../../utils/parentConsentPdfGenerator';
import { generateDpoComplianceDossierPDF } from '../../../utils/dpoComplianceDossierGenerator';
import { generateEnterpriseSecurityWhitepaperPDF } from '../../../utils/securityWhitepaperGenerator';
import { generateStaffCouncilDeclarationPDF } from '../../../utils/staffCouncilDeclarationGenerator';
import { UniversalPdfPreviewModal } from '../../modals/UniversalPdfPreviewModal';

export interface SecretaryPrivacyGovernanceModalProps {
  isOpen: boolean;
  schoolId: string;
  schoolName?: string;
  schoolStreet?: string;
  schoolHouseNumber?: string;
  schoolZipCode?: string;
  schoolCity?: string;
  isAvvSigned: boolean;
  hasCampusSub: boolean;
  hasGroovelabSub: boolean;
  studentBillingOption?: string;
  logRetention?: string;
  setLogRetention?: (val: string) => void;
  onClose: () => void;
  onOpenSecuritySuite: () => void;
  onOpenDpoPortal: () => void;
  onOpenDpoIdCard?: () => void;
  onOpenAvvModal: () => void;
  onOpenCertModal: () => void;
  onSaveSettings?: () => Promise<void> | void;
  isSettingsDirty?: boolean;
  isSavingSettings?: boolean;
}

interface ActivePdfPreview {
  isOpen: boolean;
  title: string;
  subtitle: string;
  badgeText: string;
  filename: string;
  blob: Blob | null;
  isLoading: boolean;
}

export const SecretaryPrivacyGovernanceModal: React.FC<SecretaryPrivacyGovernanceModalProps> = ({
  isOpen,
  schoolId,
  schoolName,
  schoolStreet,
  schoolHouseNumber,
  schoolZipCode,
  schoolCity,
  isAvvSigned,
  hasCampusSub,
  hasGroovelabSub,
  studentBillingOption,
  onClose,
  onOpenSecuritySuite,
  onOpenDpoPortal,
  onOpenAvvModal,
  onOpenCertModal
}) => {
  const [copiedClause, setCopiedClause] = useState<boolean>(false);
  const [previewState, setPreviewState] = useState<ActivePdfPreview>({
    isOpen: false,
    title: '',
    subtitle: '',
    badgeText: '',
    filename: '',
    blob: null,
    isLoading: false
  });

  if (!isOpen) return null;

  const fullSchoolAddress = `${schoolStreet || ''} ${schoolHouseNumber || ''}, ${schoolZipCode || ''} ${schoolCity || ''}`.trim();
  const effectiveSchoolName = schoolName || 'Städtische Musikschule';

  const handleCopyClause = async () => {
    const ok = await copyMessengerClauseToClipboard(effectiveSchoolName);
    if (ok) {
      setCopiedClause(true);
      setTimeout(() => setCopiedClause(false), 3000);
    }
  };

  const handleClosePreview = () => {
    setPreviewState((prev) => ({
      ...prev,
      isOpen: false,
      blob: null,
      isLoading: false
    }));
  };

  const handlePreviewParentConsent = async () => {
    try {
      setPreviewState({
        isOpen: true,
        title: 'Eltern-Datenschutzmerkblatt (Art. 13 & 14 DSGVO)',
        subtitle: `${effectiveSchoolName} • Gesetzliche Transparenzinformation`,
        badgeText: 'DIN A4 • 1 Seite • Reines Infoblatt (Kein Rücklauf nötig)',
        filename: `Eltern_Datenschutzmerkblatt_Art13_DSGVO_${effectiveSchoolName.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
        blob: null,
        isLoading: true
      });

      const blob = await generateParentConsentPDF({
        schoolName: effectiveSchoolName,
        schoolAddress: fullSchoolAddress,
        schoolId,
        hasCampusSub,
        hasGroovelabSub,
        studentBillingOption,
        returnBlob: true
      });

      if (blob instanceof Blob) {
        setPreviewState((prev) => ({ ...prev, blob, isLoading: false }));
      }
    } catch (err) {
      console.error('[SecretaryPrivacyGovernanceModal] Fehler beim Erstellen des Eltern-Datenschutzmerkblatts:', err);
      handleClosePreview();
    }
  };

  const handlePreviewDpoDossier = async () => {
    try {
      setPreviewState({
        isOpen: true,
        title: 'DSB- & Behörden-Compliance-Dossier',
        subtitle: `${effectiveSchoolName} • VVT (Art. 30), DSFA (Art. 35) & TOMs`,
        badgeText: 'DIN A4 • 5 Seiten • Revisionssicher',
        filename: `DSB_Compliance_Dossier_${effectiveSchoolName.replace(/[^a-zA-Z0-9_-]/g, '_')}_2026.pdf`,
        blob: null,
        isLoading: true
      });

      const blob = await generateDpoComplianceDossierPDF({
        schoolName: effectiveSchoolName,
        schoolAddress: fullSchoolAddress,
        schoolId,
        returnBlob: true
      });

      if (blob instanceof Blob) {
        setPreviewState((prev) => ({ ...prev, blob, isLoading: false }));
      }
    } catch (err) {
      console.error('[SecretaryPrivacyGovernanceModal] Fehler beim Erstellen des DSB-Dossiers:', err);
      handleClosePreview();
    }
  };

  const handlePreviewWhitepaper = async () => {
    try {
      setPreviewState({
        isOpen: true,
        title: 'BSI & ISO 27001 Sicherheits-Whitepaper',
        subtitle: `${effectiveSchoolName} • Technisch-organisatorische Maßnahmen (TOMs)`,
        badgeText: 'DIN A4 • 2 Seiten • BSI A+ / ISO 27001',
        filename: 'Campus-Groovelab-Enterprise-Security-Whitepaper.pdf',
        blob: null,
        isLoading: true
      });

      const blob = await generateEnterpriseSecurityWhitepaperPDF({
        schoolName: effectiveSchoolName,
        returnBlob: true
      });

      if (blob instanceof Blob) {
        setPreviewState((prev) => ({ ...prev, blob, isLoading: false }));
      }
    } catch (err) {
      console.error('[SecretaryPrivacyGovernanceModal] Fehler beim Erstellen des TOMs-Whitepapers:', err);
      handleClosePreview();
    }
  };

  const handlePreviewStaffCouncil = async () => {
    try {
      setPreviewState({
        isOpen: true,
        title: 'Personalrats-Freigabeerklärung (BetrVG)',
        subtitle: `${effectiveSchoolName} • Dozentenautonomie & Mitbestimmung`,
        badgeText: 'DIN A4 • 2 Seiten • Juristisches Prüfgutachten',
        filename: `Campus_Groovelab_Personalrats_Attest_BetrVG87_${new Date().getFullYear()}.pdf`,
        blob: null,
        isLoading: true
      });

      const blob = await generateStaffCouncilDeclarationPDF({
        schoolName: effectiveSchoolName,
        schoolAddress: fullSchoolAddress,
        schoolId,
        returnBlob: true
      });

      if (blob instanceof Blob) {
        setPreviewState((prev) => ({ ...prev, blob, isLoading: false }));
      }
    } catch (err) {
      console.error('[SecretaryPrivacyGovernanceModal] Fehler beim Erstellen des Personalrats-Attests:', err);
      handleClosePreview();
    }
  };

  const handlePreviewMessengerCertificate = async () => {
    try {
      setPreviewState({
        isOpen: true,
        title: 'Kinderschutz- & Messenger-Sicherheitsattest',
        subtitle: `${effectiveSchoolName} • Jugendschutz & Peer-Lock Governance`,
        badgeText: 'DIN A4 • 1 Seite • Art. 8 DSGVO & SGB VIII Kinderschutz',
        filename: `Campus-Groovelab-Messenger-Sicherheitsattest-${schoolId || 'Schule'}.pdf`,
        blob: null,
        isLoading: true
      });

      const blob = await generateMessengerSafetyCertificatePDF({
        schoolName: effectiveSchoolName,
        schoolAddress: fullSchoolAddress,
        schoolId,
        returnBlob: true
      });

      if (blob instanceof Blob) {
        setPreviewState((prev) => ({ ...prev, blob, isLoading: false }));
      }
    } catch (err) {
      console.error('[SecretaryPrivacyGovernanceModal] Fehler beim Erstellen des Messenger-Attests:', err);
      handleClosePreview();
    }
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-governance-title"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          boxSizing: 'border-box'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '820px',
            maxHeight: '92vh',
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            boxShadow: '0 25px 60px -12px rgba(15, 23, 42, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}
          className="animate-scale-in"
        >
          {/* ========================================================= */}
          {/* MODAL HEADER (WCAG 2.2 AA Parität mit 44x44px Touch Target) */}
          {/* ========================================================= */}
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: '#059669', // Emerald-600
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                  flexShrink: 0
                }}
              >
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3
                  id="privacy-governance-title"
                  style={{
                    margin: 0,
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    letterSpacing: '-0.02em'
                  }}
                >
                  Datenschutz, AVV &amp; DSB-Audit
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                  Auftragsverarbeitung (Art. 28 DSGVO), Behörden-Audit &amp; gesetzliche Prüfnachweise mit Live-Vorschau.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Modal schließen"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                flexShrink: 0
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#f1f5f9';
                e.currentTarget.style.color = '#0f172a';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.color = '#475569';
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* ========================================================= */}
          {/* MODAL BODY (Ruhiger Canvas, barrierefreie Hierarchie)     */}
          {/* ========================================================= */}
          <div
            style={{
              padding: '24px',
              overflowY: 'auto',
              maxHeight: 'calc(82vh - 120px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px'
            }}
          >
            {/* SEKTION 1: DSB- & BEHÖRDEN-COCKPIT (ART. 30, 32, 35, 38 DSGVO & BetrVG) */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '18px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      backgroundColor: '#ecfdf5',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#059669',
                      flexShrink: 0
                    }}
                  >
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
                        DSB- &amp; Behörden-Cockpit (Art. 38 DSGVO)
                      </h4>
                      <span
                        style={{
                          backgroundColor: '#ecfdf5',
                          color: '#047857',
                          border: 'none',
                          padding: '2px 8px',
                          borderRadius: '100px',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          letterSpacing: '0.02em'
                        }}
                      >
                        Zero-US-Cloud • IONOS &amp; Hetzner ISO 27001
                      </span>
                    </div>
                    <p style={{ margin: '3px 0 0 0', fontSize: '0.76rem', color: '#64748b', fontWeight: 500 }}>
                      Amtliche Prüfzugänge und 4 revisionssichere Prüfdossiers mit Live-Vorschau, Druck und PDF-Export.
                    </p>
                  </div>
                </div>

                {/* Primary Action: Live Audit-Portal */}
                <button
                  type="button"
                  onClick={onOpenDpoPortal}
                  style={{
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    padding: '9px 16px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.80rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
                    minHeight: '40px',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#047857')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
                >
                  <Eye size={15} />
                  <span>DSB- &amp; Audit-Portal öffnen</span>
                </button>
              </div>

              {/* Behördliches 4-Säulen-Prüfpaket (Vorschau & Drucken) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '8px',
                  paddingTop: '12px',
                  borderTop: '1px solid #f1f5f9'
                }}
              >
                {/* 1. DSB-Dossier (VVT / DSFA) */}
                <button
                  type="button"
                  onClick={handlePreviewDpoDossier}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    color: '#334155',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    minHeight: '38px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    e.currentTarget.style.borderColor = '#94a3b8';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                >
                  <FileText size={14} color="#059669" />
                  <span>DSB-Dossier (VVT/DSFA)</span>
                </button>

                {/* 2. TOMs Whitepaper */}
                <button
                  type="button"
                  onClick={handlePreviewWhitepaper}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    color: '#334155',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    minHeight: '38px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    e.currentTarget.style.borderColor = '#94a3b8';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                >
                  <ShieldCheck size={14} color="#2563eb" />
                  <span>Sicherheits-Whitepaper</span>
                </button>

                {/* 3. Personalrats-Attest */}
                <button
                  type="button"
                  onClick={handlePreviewStaffCouncil}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    color: '#334155',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    minHeight: '38px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    e.currentTarget.style.borderColor = '#94a3b8';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                >
                  <Users size={14} color="#d97706" />
                  <span>Personalrat (BetrVG)</span>
                </button>

                {/* 4. Messenger-Attest */}
                <button
                  type="button"
                  onClick={handlePreviewMessengerCertificate}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    color: '#334155',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    minHeight: '38px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    e.currentTarget.style.borderColor = '#94a3b8';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                >
                  <FileCheck size={14} color="#059669" />
                  <span>Messenger-Attest</span>
                </button>
              </div>
            </div>

            {/* SEKTION 2: AUFTRAGSVERARBEITUNGSVERTRAG (ART. 28 DSGVO & ZPO) */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '18px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: '280px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      backgroundColor: isAvvSigned ? '#ecfdf5' : '#fffbeb',
                      border: isAvvSigned ? '1px solid #a7f3d0' : '1px solid #fde68a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isAvvSigned ? '#059669' : '#d97706',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}
                  >
                    <FileText size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
                        AV-Vertrag nach Art. 28 DSGVO (Schul-Vereinbarung)
                      </h4>
                      <span
                        style={{
                          backgroundColor: isAvvSigned ? '#ecfdf5' : '#fffbeb',
                          color: isAvvSigned ? '#047857' : '#b45309',
                          border: isAvvSigned ? '1px solid #a7f3d0' : '1px solid #fde68a',
                          padding: '2px 8px',
                          borderRadius: '100px',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          letterSpacing: '0.03em',
                          textTransform: 'uppercase'
                        }}
                      >
                        {isAvvSigned ? 'Rechtsgültig Gezeichnet' : 'Signatur Ausstehend'}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.76rem', color: '#64748b', lineHeight: 1.45 }}>
                      {isAvvSigned
                        ? 'Der AV-Vertrag zwischen deiner Musikschule und Campus-Groovelab wurde digital gezeichnet und schützt deine Schule bei Prüfungen.'
                        : 'Der gesetzlich vorgeschriebene AV-Vertrag steht zur kostenfreien digitalen Signatur durch die Schulleitung bereit.'}
                    </p>
                  </div>
                </div>

                {/* AVV Buttons */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {isAvvSigned ? (
                    <>
                      <button
                        type="button"
                        onClick={onOpenAvvModal}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          color: '#334155',
                          padding: '8px 14px',
                          borderRadius: '10px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          minHeight: '38px',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                          e.currentTarget.style.borderColor = '#94a3b8';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.borderColor = '#cbd5e1';
                        }}
                      >
                        <FileText size={14} />
                        <span>Vertragstext einsehen</span>
                      </button>
                      <button
                        type="button"
                        onClick={onOpenCertModal}
                        style={{
                          backgroundColor: '#059669',
                          border: 'none',
                          color: '#ffffff',
                          padding: '8px 15px',
                          borderRadius: '10px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          minHeight: '38px',
                          boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#047857')}
                        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
                      >
                        <ShieldCheck size={14} />
                        <span>AVV-Siegeldokument (PDF)</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={onOpenAvvModal}
                      style={{
                        backgroundColor: '#059669',
                        border: 'none',
                        color: '#ffffff',
                        padding: '8px 16px',
                        borderRadius: '10px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        minHeight: '38px',
                        boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)'
                      }}
                    >
                      <span>Jetzt digital unterzeichnen</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* SEKTION 3: BÜROKRATIEFREIES ELTERN-DATENSCHUTZMERKBLATT (ART. 13 & 14 DSGVO) */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '18px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: '280px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      backgroundColor: '#eff6ff',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#2563eb',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}
                  >
                    <FileCheck size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
                        Eltern-Datenschutzmerkblatt (Art. 13 &amp; 14 DSGVO)
                      </h4>
                      <span
                        style={{
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          border: 'none',
                          padding: '2px 8px',
                          borderRadius: '100px',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          letterSpacing: '0.02em'
                        }}
                      >
                        Bürokratiefrei • Kein Rücklauf nötig
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.76rem', color: '#64748b', lineHeight: 1.45 }}>
                      Offizielles Informationsblatt für Erziehungsberechtigte zur Beilage bei Anmeldungen. Bestätigt die gesetzliche Vertragsgrundlage (Art. 6 I b DSGVO), Zero-US-Cloud und die digitale Eltern-PIN-Steuerung ohne Unterschriften-Rücklauf.
                    </p>
                  </div>
                </div>

                {/* Action Buttons: Vorschau & Klausel */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleCopyClause}
                    style={{
                      backgroundColor: copiedClause ? '#ecfdf5' : '#ffffff',
                      border: copiedClause ? '1.5px solid #10b981' : '1.5px solid #cbd5e1',
                      color: copiedClause ? '#047857' : '#334155',
                      padding: '8px 14px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      minHeight: '38px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {copiedClause ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                    <span>{copiedClause ? 'Klausel kopiert!' : 'Schulordnungs-Klausel'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePreviewParentConsent}
                    style={{
                      backgroundColor: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '10px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      minHeight: '38px',
                      boxShadow: '0 2px 6px rgba(15, 23, 42, 0.18)',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1e293b')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#0f172a')}
                  >
                    <Printer size={14} />
                    <span>Datenschutzmerkblatt (Vorschau &amp; Druck)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SEKTION 4: VERBINDLICHE DIN 66398 & GoBD LÖSCH-AUTOMATIK (STATUS-GARANTIE) */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '18px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Lock size={16} color="#059669" />
                    <strong style={{ fontSize: '0.90rem', color: '#0f172a', fontWeight: 800 }}>
                      Verbindliche DIN 66398 &amp; GoBD Lösch-Automatik
                    </strong>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', marginTop: '3px' }}>
                    Die Speicherung und automatische Bereinigung erfolgt nach unveränderbaren gesetzlichen Standards (Default-Deny):
                  </span>
                </div>

                {/* Admin Cockpit Link */}
                <button
                  type="button"
                  onClick={onOpenSecuritySuite}
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    padding: '7px 14px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    minHeight: '36px',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.18)',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1e293b')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#0f172a')}
                >
                  <HardDrive size={14} />
                  <span>Sicherheits- &amp; Geräte-Zentrale</span>
                </button>
              </div>

              {/* 4-Spalten DIN 66398 Matrix */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '8px'
                }}
              >
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>LK 1 • Kiosk-Tokens</div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>Sofort bei Session-Ende</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>RAM-Zeroization via Cache-Scrubbing</div>
                </div>

                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>LK 2 • Audio-Streams</div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>Max. 30 Minuten TTL</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>Auto-Löschung gem. UrhG (30 Min. Cache)</div>
                </div>

                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>LK 3 • Audit-Ledger</div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>PostgreSQL WORM</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>Art. 32 DSGVO Manipulationsschutz</div>
                </div>

                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>LK 4 • GoBD Belege</div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>10 Jahre GoBD Archiv (AO)</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>Revisionssichere Steuerarchivierung</div>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* MODAL FOOTER (Ruhig & Barrierefrei)                       */}
          {/* ========================================================= */}
          <div
            style={{
              padding: '14px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: '#64748b' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              <span>Single Source of Truth: PostgreSQL RLS Cluster (IONOS SE &amp; Hetzner ISO/IEC 27001)</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 24px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                minHeight: '40px',
                transition: 'background-color 0.15s ease',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)'
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1e293b')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#0f172a')}
            >
              Schließen
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 0,1% UNIVERSELLE PDF-VORSCHAU- & DRUCK-ENGINE             */}
      {/* ========================================================= */}
      {previewState.isOpen && (
        <UniversalPdfPreviewModal
          isOpen={previewState.isOpen}
          onClose={handleClosePreview}
          title={previewState.title}
          subtitle={previewState.subtitle}
          badgeText={previewState.badgeText}
          filename={previewState.filename}
          pdfBlob={previewState.blob}
          isLoading={previewState.isLoading}
          zIndex={100000}
        />
      )}
    </>
  );
};
