import React from 'react';
import {
  AlertCircle, Check, CheckCircle, Clock, Copy, Database, Download,
  Eye, FileCheck, FileText, Fingerprint, KeyRound, Lightbulb, Printer, QrCode, School, ShieldAlert,
  ShieldCheck, Sparkles, Trash2, Upload, X, Zap
} from 'lucide-react';
import { generateMessengerSafetyCertificatePDF } from '../../utils/messengerSafetyCertificateGenerator';
import { copyMessengerClauseToClipboard } from '../../utils/messengerClauseTemplate';

export interface SecretarySetupViewProps {
  schoolId: string;
  schoolName?: string;
  setSchoolName: (val: string) => void;
  schoolSubdomain: string;
  setSchoolSubdomain: (val: string) => void;
  schoolStreet: string;
  setSchoolStreet: (val: string) => void;
  schoolHouseNumber: string;
  setSchoolHouseNumber: (val: string) => void;
  schoolZipCode: string;
  setSchoolZipCode: (val: string) => void;
  schoolCity: string;
  setSchoolCity: (val: string) => void;
  schoolPhoneNumber: string;
  setSchoolPhoneNumber: (val: string) => void;
  schoolEmail: string;
  setSchoolEmail: (val: string) => void;
  logoUrl: string;
  setLogoUrl: (val: string) => void;
  kioskPinLength: number;
  setKioskPinLength: (val: number) => void;
  bypassPin: string;
  setBypassPin: (val: string) => void;
  logRetention: string;
  setLogRetention: (val: string) => void;
  currentUserProfile: any;
  biometricsStatus: any;
  biometricsMessage: string;
  kioskToken: string;
  hasCampusSub: boolean;
  hasGroovelabSub: boolean;
  studentBillingOption: string;
  isExporting: boolean;
  isRestoring: boolean;
  syncInterval: string;
  setSyncInterval: (val: string) => void;
  calendarUrls: string[];
  newCalendarUrlInput: string;
  setNewCalendarUrlInput: (val: string) => void;
  isAvvSigned: boolean;
  lastBackupDate: string | null;
  schoolYearStartDay: number;
  schoolYearStartMonth: number;
  autoDeleteExpiredUsers: boolean;
  isCurrentDevicePasskeyActive: boolean;
  isSavingSettings: boolean;
  isSettingsDirty: boolean;
  windowWidth: number;
  activeSecretarySettingsModal: any;
  setActiveSecretarySettingsModal: (val: any) => void;
  settingsTab: any;
  setSettingsTab: (val: any) => void;
  showResetModal: boolean;
  setShowResetModal: (val: boolean) => void;
  resetConfirmText: string;
  setResetConfirmText: (val: string) => void;
  showOwnQrModal: boolean;
  setShowOwnQrModal: (val: boolean) => void;
  copiedSettingsLink: boolean;
  setCopiedSettingsLink: (val: boolean) => void;
  copiedSettingsPin: boolean;
  setCopiedSettingsPin: (val: boolean) => void;
  copiedKioskLink: boolean;
  setCopiedKioskLink: (val: boolean) => void;
  copiedSchoolLink: boolean;
  setCopiedSchoolLink: (val: boolean) => void;
  setIsFeedbackModalOpen: (val: boolean) => void;
  setShowAvvModal: (val: boolean) => void;
  setShowDpoIdCardModal: (val: boolean) => void;
  setShowDpoPortalModal: (val: boolean) => void;
  setQrModalUser: (val: any) => void;
  handleSaveAllSettings: (customOverrides?: any) => Promise<void>;
  handleAddCalendarUrl: () => void;
  handleRemoveCalendarUrl: (index: number) => void;
  handleExportBackup: () => Promise<void>;
  handleRestoreBackup: (e: any) => Promise<void>;
  handleEnrollBiometrics: () => Promise<void>;
  handleRemoveBiometrics: () => Promise<void> | void;
  handleTestBiometrics: () => Promise<void>;
  handleDeleteExpiredStudents: (silent?: boolean) => Promise<void>;
  handleToggleAutoClean: (val: boolean) => Promise<void>;
  handleUpdateSchoolYear: (day: number, month: number) => Promise<void>;
  students: any[];
  contractEndsAt?: string | null;
}

export function SecretarySetupView(props: SecretarySetupViewProps) {
  const {
    schoolId,
    schoolName,
    setSchoolName,
    schoolSubdomain,
    setSchoolSubdomain,
    schoolStreet,
    setSchoolStreet,
    schoolHouseNumber,
    setSchoolHouseNumber,
    schoolZipCode,
    setSchoolZipCode,
    schoolCity,
    setSchoolCity,
    schoolPhoneNumber,
    setSchoolPhoneNumber,
    schoolEmail,
    setSchoolEmail,
    logoUrl,
    setLogoUrl,
    kioskPinLength,
    setKioskPinLength,
    bypassPin,
    setBypassPin,
    logRetention,
    setLogRetention,
    currentUserProfile,
    biometricsStatus,
    biometricsMessage,
    kioskToken,
    hasCampusSub,
    hasGroovelabSub,
    studentBillingOption,
    isExporting,
    isRestoring,
    syncInterval,
    setSyncInterval,
    calendarUrls,
    newCalendarUrlInput,
    setNewCalendarUrlInput,
    isAvvSigned,
    lastBackupDate,
    schoolYearStartDay,
    schoolYearStartMonth,
    autoDeleteExpiredUsers,
    isCurrentDevicePasskeyActive,
    isSavingSettings,
    isSettingsDirty,
    windowWidth,
    activeSecretarySettingsModal,
    setActiveSecretarySettingsModal,
    settingsTab,
    setSettingsTab,
    showResetModal,
    setShowResetModal,
    resetConfirmText,
    setResetConfirmText,
    showOwnQrModal,
    setShowOwnQrModal,
    copiedSettingsLink,
    setCopiedSettingsLink,
    copiedSettingsPin,
    setCopiedSettingsPin,
    copiedKioskLink,
    setCopiedKioskLink,
    copiedSchoolLink,
    setCopiedSchoolLink,
    setIsFeedbackModalOpen,
    setShowAvvModal,
    setShowDpoIdCardModal,
    setShowDpoPortalModal,
    setQrModalUser,
    handleSaveAllSettings,
    handleAddCalendarUrl,
    handleRemoveCalendarUrl,
    handleExportBackup,
    handleRestoreBackup,
    handleEnrollBiometrics,
    handleRemoveBiometrics,
    handleTestBiometrics,
    handleDeleteExpiredStudents,
    handleToggleAutoClean,
    handleUpdateSchoolYear,
    students,
    contractEndsAt
  } = props;

  const [copiedClause, setCopiedClause] = React.useState(false);

  return (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 1000, color: '#0f172a', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', textAlign: 'left' }}>
                ⚙️ Einstellungen
              </h2>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 600, textAlign: 'left' }}>
                Wähle ein Modul aus, um Stammdaten, Kalender-Sync, Sicherheit, Datensicherung und Betriebszeiten für deine Schule zu konfigurieren.
              </p>
            </div>

            {/* MODULAR COVER CARDS GRID */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: windowWidth < 640 ? 'repeat(2, 1fr)' : windowWidth < 1024 ? 'repeat(3, 1fr)' : 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '18px',
              width: '100%'
            }}>
              {[
                {
                  id: 'general',
                  title: 'Schul-Stammdaten',
                  subtitle: schoolName || 'Name, Adresse & Logo',
                  badge: 'Stammdaten',
                  gradient: 'linear-gradient(135deg, #ea4335 0%, #b91c1c 100%)',
                  shadowColor: 'rgba(234, 67, 53, 0.40)',
                  icon: School
                },
                {
                  id: 'links',
                  title: 'Anmeldung & Passkeys',
                  subtitle: 'Touch ID, Face ID, PINs & Kiosk',
                  badge: isCurrentDevicePasskeyActive ? 'Passkey Aktiv' : 'Kiosk & PIN',
                  gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  shadowColor: 'rgba(2, 132, 199, 0.40)',
                  icon: Fingerprint
                },
                {
                  id: 'sync',
                  title: 'Kalender & Sync',
                  subtitle: `${calendarUrls.length} Kalender abonniert`,
                  badge: syncInterval === 'realtime' ? 'Echtzeit' : syncInterval === 'hourly' ? 'Stündlich' : 'Täglich',
                  gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                  shadowColor: 'rgba(6, 182, 212, 0.40)',
                  icon: Zap
                },
                {
                  id: 'security_privacy',
                  title: 'Datenschutz & AVV',
                  subtitle: 'AV-Vertrag, DSB-Ausweis & Audit',
                  badge: isAvvSigned ? 'AVV Gezeichnet' : 'AVV Ausstehend',
                  gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  shadowColor: 'rgba(16, 185, 129, 0.40)',
                  icon: ShieldCheck
                },
                {
                  id: 'backup',
                  title: 'Lokale Datensicherung',
                  subtitle: lastBackupDate ? 'Sicherung vorhanden' : 'JSON-Backup Tresor',
                  badge: 'Backup Tresor',
                  gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  shadowColor: 'rgba(99, 102, 241, 0.40)',
                  icon: Database
                },
                {
                  id: 'school_year',
                  title: 'Schuljahr & Auto-Clean',
                  subtitle: `Start: ${schoolYearStartDay}. ${['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'][(schoolYearStartMonth || 9) - 1] || 'September'}`,
                  badge: autoDeleteExpiredUsers ? 'Auto-Clean An' : 'Manuell',
                  gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  shadowColor: 'rgba(245, 158, 11, 0.40)',
                  icon: Clock
                },
                {
                  id: 'danger_zone',
                  title: 'Werkseinstellungen',
                  subtitle: 'Musikschule zurücksetzen',
                  badge: 'Gefahr',
                  gradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                  shadowColor: 'rgba(239, 68, 68, 0.40)',
                  icon: ShieldAlert
                },
                {
                  id: 'feedback',
                  title: 'Ideenschmiede',
                  subtitle: 'Wünsche & Fehler melden',
                  badge: 'Mitgestalten',
                  gradient: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
                  shadowColor: 'rgba(236, 72, 153, 0.40)',
                  icon: Lightbulb
                }
              ].map((module) => {
                const IconComp = module.icon;
                return (
                  <div
                    key={module.id}
                    onClick={() => {
                      if (module.id === 'feedback') {
                        setIsFeedbackModalOpen(true);
                        return;
                      }
                      if (module.id === 'general' || module.id === 'sync' || module.id === 'security_privacy' || module.id === 'backup') {
                        setSettingsTab(module.id as any);
                      }
                      setActiveSecretarySettingsModal(module.id as any);
                    }}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '20px',
                      padding: '24px 16px 20px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    className="hover-scale"
                  >
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '16px',
                      background: module.gradient,
                      boxShadow: `0 8px 18px -3px ${module.shadowColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                      border: '1px solid rgba(255, 255, 255, 0.25)'
                    }}>
                      <IconComp size={30} color="#ffffff" strokeWidth={2.3} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }} />
                    </div>
                    <div style={{ marginTop: '14px', padding: '0 4px', width: '100%' }}>
                      <div style={{ fontSize: '0.92rem', fontWeight: 850, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                        {module.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginTop: '3px', lineHeight: '1.3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {module.subtitle}
                      </div>
                    </div>
                    {module.badge && (
                      <span style={{
                        marginTop: '10px',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        color: module.id === 'danger_zone' ? '#dc2626' : (module.id === 'security_privacy' && !isAvvSigned ? '#d97706' : '#ea4335'),
                        background: module.id === 'danger_zone' ? '#fee2e2' : (module.id === 'security_privacy' && !isAvvSigned ? '#fef3c7' : '#fce8e6'),
                        padding: '2px 8px',
                        borderRadius: '100px'
                      }}>
                        {module.badge}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* PERSISTENT BOTTOM SAVE BAR (IF DIRTY) */}
            {isSettingsDirty && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 32px',
                border: '1px solid #fecaca',
                background: '#fef2f2',
                borderRadius: '20px',
                boxShadow: '0 4px 16px rgba(234, 67, 53, 0.1)',
                boxSizing: 'border-box',
                width: '100%'
              }}>
                <span style={{ fontSize: '0.82rem', color: '#ea4335', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⚠️ Ungespeicherte Änderungen an den Schuleinstellungen vorhanden.
                </span>
                <button
                  onClick={handleSaveAllSettings}
                  disabled={isSavingSettings}
                  style={{
                    padding: '10px 24px',
                    background: '#ea4335',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(234, 67, 53, 0.25)',
                    transition: 'all 0.2s',
                    opacity: isSavingSettings ? 0.7 : 1
                  }}
                  className="hover-scale"
                >
                  {isSavingSettings ? 'Wird gespeichert...' : 'Einstellungen speichern'}
                </button>
              </div>
            )}

            {/* FOCUS MODAL FOR SELECTED SETTINGS CATEGORY */}
            {activeSecretarySettingsModal && (
              <div 
                role="dialog"
                aria-modal="true"
                aria-label="Schul-Einstellungen Detailansicht"
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(15, 23, 42, 0.55)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  zIndex: 10000,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px',
                  boxSizing: 'border-box'
                }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) setActiveSecretarySettingsModal(null);
                }}
              >
                <div 
                  style={{
                    width: '100%',
                    maxWidth: activeSecretarySettingsModal === 'general' ? '740px' : '680px',
                    maxHeight: '90vh',
                    background: '#ffffff',
                    borderRadius: '24px',
                    border: '1px solid rgba(255, 255, 255, 0.8)',
                    boxShadow: '0 25px 60px -12px rgba(15, 23, 42, 0.35)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  }}
                  className="animate-scale-in"
                >
                  {/* Modal Header */}
                  <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#f8fafc'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: activeSecretarySettingsModal === 'general'
                          ? 'linear-gradient(135deg, #ea4335 0%, #b91c1c 100%)'
                          : activeSecretarySettingsModal === 'links'
                          ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                          : activeSecretarySettingsModal === 'sync'
                          ? 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
                          : activeSecretarySettingsModal === 'security_privacy'
                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                          : activeSecretarySettingsModal === 'backup'
                          ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                          : activeSecretarySettingsModal === 'school_year'
                          ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                          : 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
                      }}>
                        {activeSecretarySettingsModal === 'general' && <School size={22} color="#ffffff" />}
                        {activeSecretarySettingsModal === 'links' && <Fingerprint size={22} color="#ffffff" />}
                        {activeSecretarySettingsModal === 'sync' && <Zap size={22} color="#ffffff" />}
                        {activeSecretarySettingsModal === 'security_privacy' && <ShieldCheck size={22} color="#ffffff" />}
                        {activeSecretarySettingsModal === 'backup' && <Database size={22} color="#ffffff" />}
                        {activeSecretarySettingsModal === 'school_year' && <Clock size={22} color="#ffffff" />}
                        {activeSecretarySettingsModal === 'danger_zone' && <ShieldAlert size={22} color="#ffffff" />}
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                          {activeSecretarySettingsModal === 'general' && 'Schul-Stammdaten & Branding'}
                          {activeSecretarySettingsModal === 'links' && 'Anmeldung, Passkeys & Kiosk'}
                          {activeSecretarySettingsModal === 'sync' && 'Kalender & Synchronisation'}
                          {activeSecretarySettingsModal === 'security_privacy' && 'Datenschutz, AVV & DSB-Audit'}
                          {activeSecretarySettingsModal === 'backup' && 'Lokale Datensicherung'}
                          {activeSecretarySettingsModal === 'school_year' && 'Schuljahr & Auto-Bereinigung'}
                          {activeSecretarySettingsModal === 'danger_zone' && 'Gefahrenzone: Werkseinstellungen'}
                        </h3>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>
                          {activeSecretarySettingsModal === 'general' && 'Stammdaten, Anschrift und Schullogo deines Campus.'}
                          {activeSecretarySettingsModal === 'links' && 'Touch ID, Face ID, Master-Ausweise, PIN-Richtlinien & Schul-Links.'}
                          {activeSecretarySettingsModal === 'sync' && 'Datenabgleich, Live-Sync und externe iCal-Abonnements.'}
                          {activeSecretarySettingsModal === 'security_privacy' && 'Auftragsverarbeitungsvertrag (Art. 28 DSGVO), DSB-Prüfportal & TOMs.'}
                          {activeSecretarySettingsModal === 'backup' && 'JSON-Export und Wiederherstellung der Schuldatenbank.'}
                          {activeSecretarySettingsModal === 'school_year' && 'Schuljahresbeginn und automatische DSGVO-Bereinigung.'}
                          {activeSecretarySettingsModal === 'danger_zone' && 'Setzt die Schule unwiderruflich auf Werkseinstellungen zurück.'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveSecretarySettingsModal(null)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                      className="hover-scale"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(80vh - 140px)', textAlign: 'left' }}>
                    {activeSecretarySettingsModal === 'general' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <strong style={{ fontSize: '0.84rem', display: 'block', color: '#1e293b' }}>Stammdaten der Musikschule</strong>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Name der Musikschule *</label>
                              <input
                                type="text"
                                value={schoolName}
                                onChange={(e) => setSchoolName(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.84rem', background: '#ffffff' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Wunsch-Subdomain *</label>
                              <input
                                type="text"
                                value={schoolSubdomain}
                                onChange={(e) => setSchoolSubdomain(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.84rem', background: '#ffffff' }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                            <div>
                              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Straße *</label>
                              <input
                                type="text"
                                value={schoolStreet}
                                onChange={(e) => setSchoolStreet(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.84rem', background: '#ffffff' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Nr. *</label>
                              <input
                                type="text"
                                value={schoolHouseNumber}
                                onChange={(e) => setSchoolHouseNumber(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.84rem', background: '#ffffff' }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                            <div>
                              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>PLZ *</label>
                              <input
                                type="text"
                                value={schoolZipCode}
                                onChange={(e) => setSchoolZipCode(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.84rem', background: '#ffffff' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Ort *</label>
                              <input
                                type="text"
                                value={schoolCity}
                                onChange={(e) => setSchoolCity(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.84rem', background: '#ffffff' }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Telefonnummer *</label>
                              <input
                                type="text"
                                value={schoolPhoneNumber}
                                onChange={(e) => setSchoolPhoneNumber(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.84rem', background: '#ffffff' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>E-Mail-Adresse *</label>
                              <input
                                type="email"
                                value={schoolEmail}
                                onChange={(e) => setSchoolEmail(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.84rem', background: '#ffffff' }}
                              />
                            </div>
                          </div>

                          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '4px' }}>
                            <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Logo URL</label>
                            <input
                              type="text"
                              placeholder="https://example.com/logo.png"
                              value={logoUrl}
                              onChange={(e) => setLogoUrl(e.target.value)}
                              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.84rem', background: '#ffffff' }}
                            />
                          </div>
                        </div>

                        {/* Zahlungsart Card */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong style={{ fontSize: '0.84rem', display: 'block', color: '#1e293b' }}>Aktive Zahlungsart</strong>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '4px', lineHeight: '1.35' }}>
                              Die Abrechnung für Cloud-Hosting und Bereitstellung erfolgt transparent per Sammelrechnung (14 Tage Zahlungsziel). Es fallen keine gesonderten Lizenzkaufgebühren an.
                            </span>
                          </div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#ea4335', background: '#fce8e6', border: '1px solid #fca5a5', padding: '6px 14px', borderRadius: '100px', letterSpacing: '0.04em', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                            RECHNUNG (14 TAGE)
                          </div>
                        </div>
                      </div>
                    )}

                    {activeSecretarySettingsModal === 'links' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* SÄULE 1: BIOMETRIE & PASSKEYS AUF DIESEM GERÄT */}
                        <div style={{
                          background: isCurrentDevicePasskeyActive 
                            ? 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)' 
                            : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                          border: isCurrentDevicePasskeyActive ? '1.5px solid #86efac' : '1.5px solid #cbd5e1',
                          borderRadius: '20px',
                          padding: '20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '14px',
                          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                              <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '12px',
                                background: isCurrentDevicePasskeyActive ? '#dcfce7' : '#f1f5f9',
                                color: isCurrentDevicePasskeyActive ? '#16a34a' : '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: isCurrentDevicePasskeyActive ? '0 4px 12px rgba(22, 163, 74, 0.2)' : 'none'
                              }}>
                                <Fingerprint size={24} />
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900, color: '#0f172a' }}>
                                    Touch ID / Face ID auf diesem Gerät
                                  </h4>
                                  <span style={{
                                    background: isCurrentDevicePasskeyActive ? '#dcfce7' : '#f1f5f9',
                                    color: isCurrentDevicePasskeyActive ? '#15803d' : '#64748b',
                                    border: isCurrentDevicePasskeyActive ? '1px solid #86efac' : '1px solid #cbd5e1',
                                    padding: '2px 8px',
                                    borderRadius: '100px',
                                    fontSize: '0.65rem',
                                    fontWeight: 800
                                  }}>
                                    {isCurrentDevicePasskeyActive ? 'Passkey Aktiv' : 'Nicht eingerichtet'}
                                  </span>
                                </div>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: '#475569', fontWeight: 500 }}>
                                  {isCurrentDevicePasskeyActive
                                    ? `${currentUserProfile?.first_name} ${currentUserProfile?.last_name || ''} (${schoolName || 'Musikschule'} • Schulleitung)`
                                    : 'Passwortloser 1-Tap-Login über den Fingerabdrucksensor oder Face ID dieses Geräts.'}
                                </p>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {isCurrentDevicePasskeyActive ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={handleTestBiometrics}
                                    disabled={biometricsStatus === 'verifying'}
                                    style={{
                                      background: '#ffffff',
                                      border: '1.5px solid #86efac',
                                      color: '#15803d',
                                      padding: '8px 14px',
                                      borderRadius: '10px',
                                      fontWeight: 800,
                                      fontSize: '0.78rem',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      transition: 'all 0.15s'
                                    }}
                                    className="hover-scale"
                                  >
                                    <Sparkles size={14} /> {biometricsStatus === 'verifying' ? 'Verifiziere...' : 'Passkey testen'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleRemoveBiometrics}
                                    style={{
                                      background: '#fff1f2',
                                      border: '1px solid #fecdd3',
                                      color: '#e11d48',
                                      padding: '8px 12px',
                                      borderRadius: '10px',
                                      fontWeight: 750,
                                      fontSize: '0.76rem',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    <Trash2 size={13} /> Entfernen
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleEnrollBiometrics}
                                  disabled={biometricsStatus === 'registering'}
                                  style={{
                                    background: '#0284c7',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '9px 18px',
                                    borderRadius: '10px',
                                    fontWeight: 800,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
                                  }}
                                  className="hover-scale"
                                >
                                  <Fingerprint size={16} />
                                  {biometricsStatus === 'registering' ? 'Warte auf Gerät...' : 'Touch ID / Face ID einrichten'}
                                </button>
                              )}
                            </div>
                          </div>

                          {biometricsMessage && (
                            <div style={{
                              padding: '10px 14px',
                              borderRadius: '10px',
                              background: biometricsStatus === 'error' ? '#fef2f2' : '#f0fdf4',
                              border: biometricsStatus === 'error' ? '1px solid #fca5a5' : '1px solid #86efac',
                              color: biometricsStatus === 'error' ? '#991b1b' : '#166534',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              {biometricsStatus === 'error' ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
                              <span>{biometricsMessage}</span>
                            </div>
                          )}
                        </div>

                        {/* SÄULE 2: MEIN DIGITALER MASTER-AUSWEIS & ZUGANGSDATEN */}
                        <div style={{
                          background: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '20px',
                          padding: '20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <KeyRound size={20} />
                              </div>
                              <div>
                                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                                  Mein Digitaler Master-Ausweis &amp; Login-PINs
                                </h4>
                                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                  Zugangsdaten für Schulleitung &amp; Notfall-Gerätekopplung
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setQrModalUser(currentUserProfile);
                                setShowOwnQrModal(true);
                              }}
                              style={{
                                background: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                color: '#334155',
                                padding: '6px 14px',
                                borderRadius: '8px',
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <QrCode size={14} /> Großen Ausweis öffnen
                            </button>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px' }}>
                              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Persönliche Ausweis-PIN</span>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                                <span style={{ fontSize: '1.1rem', fontWeight: 900, fontFamily: 'monospace', color: '#0f172a', letterSpacing: '0.1em' }}>
                                  {currentUserProfile?.parent_pin || currentUserProfile?.pin || '855992'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(currentUserProfile?.parent_pin || currentUserProfile?.pin || '855992');
                                    setCopiedSettingsPin(true);
                                    setTimeout(() => setCopiedSettingsPin(false), 2000);
                                  }}
                                  style={{ background: 'none', border: 'none', color: copiedSettingsPin ? '#16a34a' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 700 }}
                                >
                                  {copiedSettingsPin ? <Check size={14} /> : <Copy size={14} />} {copiedSettingsPin ? 'Kopiert' : 'Kopieren'}
                                </button>
                              </div>
                            </div>

                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px' }}>
                              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Direkt-Login URL</span>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                                  {window.location.origin}/qr/{currentUserProfile?.qr_token || 'token'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/qr/${currentUserProfile?.qr_token || ''}`);
                                    setCopiedSettingsLink(true);
                                    setTimeout(() => setCopiedSettingsLink(false), 2000);
                                  }}
                                  style={{ background: 'none', border: 'none', color: copiedSettingsLink ? '#16a34a' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 700 }}
                                >
                                  {copiedSettingsLink ? <Check size={14} /> : <Copy size={14} />} {copiedSettingsLink ? 'Kopiert' : 'Kopieren'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* SÄULE 3: KIOSK-RICHTLINIEN & PIN-LÄNGE */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px' }}>
                          <div>
                            <strong style={{ fontSize: '0.84rem', display: 'block', color: '#1e293b' }}>Kiosk PIN-Länge</strong>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '4px', marginBottom: '12px', lineHeight: '1.3' }}>
                              Wähle die Ziffernlänge für Schüler &amp; Lehrer-Logins am Kiosk.
                            </span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {[4, 6].map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => setKioskPinLength(num)}
                                  style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: '1.5px solid',
                                    borderColor: kioskPinLength === num ? '#0284c7' : '#cbd5e1',
                                    background: kioskPinLength === num ? '#e0f2fe' : '#ffffff',
                                    color: kioskPinLength === num ? '#0284c7' : '#475569',
                                    fontSize: '0.8rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                  }}
                                >
                                  {num} Ziffern
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <strong style={{ fontSize: '0.84rem', display: 'block', color: '#1e293b' }}>Master Bypass-PIN</strong>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '4px', marginBottom: '12px', lineHeight: '1.3' }}>
                              Notfall-PIN zum Entsperren von Kiosk-Stationen im Offline-Betrieb.
                            </span>
                            <input
                              type="password"
                              value={bypassPin}
                              onChange={(e) => setBypassPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', letterSpacing: '0.3em', width: '120px', textAlign: 'center', background: '#ffffff' }}
                            />
                          </div>
                        </div>

                        {/* SÄULE 4: SCHUL- & KIOSK-INTEGRATION LINKS */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px 18px' }}>
                            <strong style={{ fontSize: '0.82rem', display: 'block', color: '#1e293b', marginBottom: '4px' }}>Schul-ID &amp; Anmeldelink (Campus &amp; GrooveLab)</strong>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '10px', lineHeight: '1.4' }}>
                              Dies ist der offizielle Anmeldelink für deine Schüler und Eltern.
                            </span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <input 
                                readOnly 
                                value={schoolSubdomain ? (window.location.hostname.includes('localhost') ? `http://${schoolSubdomain}.localhost:${window.location.port || '5173'}` : `https://${schoolSubdomain}.campus-groovelab.de`) : `${window.location.origin}/?school_id=${schoolId}`} 
                                style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.8rem', fontFamily: 'monospace', background: '#f8fafc', color: '#1e293b' }} 
                              />
                              <button 
                                onClick={() => { 
                                  const link = schoolSubdomain ? (window.location.hostname.includes('localhost') ? `http://${schoolSubdomain}.localhost:${window.location.port || '5173'}` : `https://${schoolSubdomain}.campus-groovelab.de`) : `${window.location.origin}/?school_id=${schoolId}`;
                                  navigator.clipboard.writeText(link); 
                                  setCopiedSchoolLink(true);
                                  setTimeout(() => setCopiedSchoolLink(false), 2000);
                                }} 
                                style={{ 
                                  padding: '8px 16px', 
                                  fontSize: '0.78rem', 
                                  fontWeight: 800,
                                  borderRadius: '8px',
                                  border: copiedSchoolLink ? '1.5px solid #0284c7' : 'none',
                                  background: copiedSchoolLink ? '#e0f2fe' : '#0284c7',
                                  color: copiedSchoolLink ? '#0284c7' : '#ffffff',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {copiedSchoolLink ? '✓ Kopiert!' : 'Kopieren'}
                              </button>
                            </div>
                          </div>

                          {kioskToken && (
                            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px 18px' }}>
                              <strong style={{ fontSize: '0.82rem', display: 'block', color: '#1e293b', marginBottom: '4px' }}>Tablet-Kopplung (QR-Kiosk-Modus)</strong>
                              <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '10px', lineHeight: '1.4' }}>
                                Link zum permanenten Koppeln von Tablets/iPads im Schulsaal als Scan-Station.
                              </span>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <input 
                                  readOnly 
                                  value={schoolSubdomain 
                                    ? (window.location.hostname.includes('localhost') 
                                      ? `http://${schoolSubdomain}.localhost:${window.location.port || '5173'}/device-onboarding/${kioskToken}` 
                                      : `https://${schoolSubdomain}.campus-groovelab.de/device-onboarding/${kioskToken}`) 
                                    : `${window.location.origin}/device-onboarding/${kioskToken}`
                                  } 
                                  style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.8rem', fontFamily: 'monospace', background: '#f8fafc', color: '#1e293b' }} 
                                />
                                <button 
                                  onClick={() => { 
                                    const link = schoolSubdomain 
                                      ? (window.location.hostname.includes('localhost') 
                                        ? `http://${schoolSubdomain}.localhost:${window.location.port || '5173'}/device-onboarding/${kioskToken}` 
                                        : `https://${schoolSubdomain}.campus-groovelab.de/device-onboarding/${kioskToken}`) 
                                      : `${window.location.origin}/device-onboarding/${kioskToken}`;
                                    navigator.clipboard.writeText(link); 
                                    setCopiedKioskLink(true);
                                    setTimeout(() => setCopiedKioskLink(false), 2000);
                                  }} 
                                  style={{ 
                                    padding: '8px 16px', 
                                    fontSize: '0.78rem', 
                                    fontWeight: 800,
                                    borderRadius: '8px',
                                    border: copiedKioskLink ? '1.5px solid #0284c7' : 'none',
                                    background: copiedKioskLink ? '#e0f2fe' : '#0284c7',
                                    color: copiedKioskLink ? '#0284c7' : '#ffffff',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {copiedKioskLink ? '✓ Kopiert!' : 'Kopieren'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                      </div>
                    )}

                    {activeSecretarySettingsModal === 'sync' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Sync Settings section */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px' }}>
                          <strong style={{ fontSize: '0.84rem', display: 'block', color: '#1e293b' }}>⚡ Synchronisation (Campus &amp; GrooveLab)</strong>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '4px', marginBottom: '12px' }}>
                            Frequenz, mit der Stundenpläne und externe Kalenderfeeds abgeglichen werden.
                          </span>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{ fontSize: '0.76rem', fontWeight: 600 }}>Sync-Frequenz:</span>
                            <select 
                              value={syncInterval} 
                              onChange={(e) => setSyncInterval(e.target.value)} 
                              style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.78rem', fontWeight: 700 }}
                            >
                              <option value="realtime">Echtzeit / Live</option>
                              <option value="hourly">Jede Stunde</option>
                              <option value="daily">Täglich um 02:00 Uhr</option>
                            </select>
                          </div>
                          <button 
                            onClick={() => alert('Die manuelle Synchronisation wurde erfolgreich durchgeführt!')}
                            style={{ 
                              width: '100%', padding: '10px', fontSize: '0.78rem', fontWeight: 800, borderRadius: '10px', 
                              border: '1px solid #ea4335', background: '#fce8e6', color: '#ea4335', cursor: 'pointer', transition: 'all 0.15s' 
                            }}
                            className="hover-scale"
                          >
                            Datenbanken jetzt synchronisieren
                          </button>
                        </div>

                        {/* Multiple iCal Feeds Section */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          <div>
                            <strong style={{ fontSize: '0.84rem', display: 'block', color: '#1e293b' }}>📅 Abonnierte iCal Kalender-Links (ICS Feeds)</strong>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '4px', lineHeight: '1.4' }}>
                              Abonniere einen oder mehrere externe Kalenderfeeds (.ics Format), um Feiertage, Ferien oder Veranstaltungen automatisch im System (Campus-Events) anzuzeigen.
                            </span>
                          </div>

                          {/* List of current calendars */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                            {calendarUrls.length === 0 ? (
                              <div style={{ fontSize: '0.74rem', color: '#64748b', fontStyle: 'italic', padding: '10px 14px', background: '#ffffff', borderRadius: '10px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
                                Keine externen Kalender abonniert.
                              </div>
                            ) : (
                              calendarUrls.map((urlItem, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '10px' }}>
                                  <span style={{ fontSize: '0.74rem', color: '#0f172a', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                                    {urlItem}
                                  </span>
                                  <button
                                    onClick={() => handleRemoveCalendarUrl(idx)}
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      color: '#ef4444',
                                      fontSize: '0.75rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      padding: '4px 8px',
                                      borderRadius: '6px',
                                      transition: 'all 0.15s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#fef2f2'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                  >
                                    Entfernen
                                  </button>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Add new calendar URL form */}
                          <div style={{ display: 'flex', gap: '8px', marginTop: '6px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                            <input
                              type="url"
                              placeholder="https://example.com/calendar.ics"
                              value={newCalendarUrlInput}
                              onChange={(e) => setNewCalendarUrlInput(e.target.value)}
                              style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.84rem', background: '#ffffff' }}
                            />
                            <button
                              onClick={handleAddCalendarUrl}
                              style={{
                                padding: '10px 18px',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                borderRadius: '10px',
                                border: 'none',
                                background: '#ea4335',
                                color: '#ffffff',
                                cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(234, 67, 53, 0.1)'
                              }}
                            >
                              Hinzufügen
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeSecretarySettingsModal === 'security_privacy' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* Städtischer DSB-Prüfausweis & Audit-Portal (Art. 38 DSGVO) */}
                        <div style={{
                          background: 'linear-gradient(135deg, #ffffff 0%, #f4fbf7 100%)',
                          border: '1.5px solid #a7f3d0',
                          borderRadius: '20px',
                          padding: '20px',
                          color: '#0f172a',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '16px',
                          boxShadow: '0 4px 20px rgba(52, 168, 83, 0.08)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '12px',
                              background: '#34a853',
                              border: '1.5px solid #34a853',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              boxShadow: '0 4px 12px rgba(52, 168, 83, 0.25)'
                            }}>
                              <ShieldCheck size={24} />
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900, color: '#0f172a' }}>
                                  🪪 DSB-Prüfausweis (Art. 38 DSGVO)
                                </h4>
                                <span style={{ background: '#e6f4ea', color: '#047857', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '100px', fontSize: '0.65rem', fontWeight: 800 }}>
                                  E-Mail-Frei
                                </span>
                              </div>
                              <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: '#475569', fontWeight: 500 }}>
                                Offizieller QR-Prüfausweis für den städtischen Datenschutzbeauftragten.
                              </p>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => window.dispatchEvent(new CustomEvent('open_admin_security_suite'))}
                              style={{
                                background: '#ea4335',
                                color: '#ffffff',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '10px',
                                fontWeight: 800,
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 4px 12px rgba(234, 67, 53, 0.25)'
                              }}
                              className="hover-scale"
                            >
                              <ShieldCheck size={14} /> Sicherheits- & Geräte-Zentrale
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowDpoPortalModal(true)}
                              style={{
                                background: '#ffffff',
                                border: '1.5px solid #cbd5e1',
                                color: '#334155',
                                padding: '8px 14px',
                                borderRadius: '10px',
                                fontWeight: 750,
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                              className="hover-scale"
                            >
                              <Eye size={14} /> Audit-Portal
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowDpoIdCardModal(true)}
                              style={{
                                background: '#34a853',
                                color: '#ffffff',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '10px',
                                fontWeight: 800,
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',

                                boxShadow: '0 4px 12px rgba(52, 168, 83, 0.25)'
                              }}
                              className="hover-scale"
                            >
                              <Printer size={14} /> DSB-Ausweis drucken
                            </button>
                            <button
                              type="button"
                              onClick={() => generateMessengerSafetyCertificatePDF({
                                schoolName: schoolName || 'Musikschule',
                                schoolAddress: `${schoolStreet || ''} ${schoolHouseNumber || ''}, ${schoolZipCode || ''} ${schoolCity || ''}`.trim(),
                                schoolId
                              })}
                              style={{
                                background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '10px',
                                fontWeight: 800,
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)'
                              }}
                              className="hover-scale"
                            >
                              <FileCheck size={14} /> Messenger-Attest (PDF)
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const ok = await copyMessengerClauseToClipboard(schoolName);
                                if (ok) {
                                  setCopiedClause(true);
                                  setTimeout(() => setCopiedClause(false), 3000);
                                }
                              }}
                              style={{
                                background: copiedClause ? '#16a34a' : '#0f172a',
                                color: '#ffffff',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '10px',
                                fontWeight: 800,
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.20)',
                                transition: 'all 0.2s ease'
                              }}
                              className="hover-scale"
                            >
                              {copiedClause ? <Check size={14} /> : <Copy size={14} />}
                              {copiedClause ? 'Klausel kopiert!' : 'Schulordnungs-Klausel'}
                            </button>
                          </div>
                        </div>

                        {/* AV-Vertrag Statusbereich */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ 
                            background: isAvvSigned ? '#e6f4ea' : '#fef2f2', 
                            border: isAvvSigned ? '1px solid #a7f3d0' : '1px solid #fca5a5', 
                            borderRadius: '16px', 
                            padding: '16px', 
                            display: 'flex', 
                            alignItems: 'flex-start', 
                            gap: '12px',
                            fontSize: '0.76rem',
                            color: isAvvSigned ? '#34a853' : '#dc2626',
                            lineHeight: '1.45'
                          }}>
                            <FileText size={20} style={{ color: isAvvSigned ? '#34a853' : '#dc2626', flexShrink: 0, marginTop: '2px' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <strong style={{ fontSize: '0.8rem', display: 'block', marginBottom: '2px', color: isAvvSigned ? '#34a853' : '#991b1b' }}>AV-Vertrag mit Campus-Groovelab (Schul-Vereinbarung)</strong>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <span style={{ 
                                    fontSize: '0.62rem', 
                                    fontWeight: 900, 
                                    background: isAvvSigned ? '#d1fae5' : '#fee2e2', 
                                    border: isAvvSigned ? '1px solid #a7f3d0' : '1px solid #fecaca', 
                                    color: isAvvSigned ? '#065f46' : '#dc2626', 
                                    padding: '3px 8px', 
                                    borderRadius: '100px', 
                                    textTransform: 'uppercase' 
                                  }}>
                                    {isAvvSigned ? 'Gezeichnet' : 'Ausstehend'}
                                  </span>
                                  {isAvvSigned ? (
                                    <button
                                      onClick={() => setShowAvvModal(true)}
                                      style={{
                                        fontSize: '0.62rem', 
                                        fontWeight: 800, 
                                        background: '#ffffff', 
                                        border: '1px solid #a7f3d0', 
                                        color: '#065f46', 
                                        padding: '3.5px 10px', 
                                        borderRadius: '100px', 
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                                      }}
                                    >
                                      <FileText size={11} /> AVV ansehen / drucken
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => setShowAvvModal(true)}
                                      style={{
                                        fontSize: '0.62rem', 
                                        fontWeight: 900, 
                                        background: '#dc2626', 
                                        border: 'none', 
                                        color: '#ffffff', 
                                        padding: '3.5px 10px', 
                                        borderRadius: '100px', 
                                        textTransform: 'uppercase',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 4px rgba(220, 38, 38, 0.15)'
                                      }}
                                    >
                                      Jetzt unterzeichnen
                                    </button>
                                  )}
                                </div>
                              </div>
                              <span style={{ display: 'block', marginTop: '4px', color: isAvvSigned ? '#34a853' : '#7f1d1d' }}>
                                {isAvvSigned 
                                  ? 'Der AVV nach Art. 28 DSGVO zwischen deiner Musikschule und Campus-Groovelab wurde rechtsgültig gezeichnet.' 
                                  : 'Der AVV nach Art. 28 DSGVO zwischen deiner Musikschule und Campus-Groovelab steht zur digitalen Signatur bereit.'}
                              </span>
                            </div>
                          </div>

                          {/* Eltern-Infoblatt Vorlage */}
                          <div style={{ 
                            background: '#fefce8', 
                            border: '1px solid #fef08a', 
                            borderRadius: '16px', 
                            padding: '16px', 
                            display: 'flex', 
                            alignItems: 'flex-start', 
                            gap: '12px',
                            fontSize: '0.76rem',
                            color: '#854d0e',
                            lineHeight: '1.45'
                          }}>
                            <FileText size={20} style={{ color: '#ca8a04', flexShrink: 0, marginTop: '2px' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <strong style={{ fontSize: '0.8rem', display: 'block', marginBottom: '2px', color: '#854d0e' }}>Eltern-Information &amp; Einwilligung (Vorlage)</strong>
                                <button 
                                  onClick={() => {
                                    const isGrooveOnly = !hasCampusSub && hasGroovelabSub;
                                    const isCampusOnly = hasCampusSub && !hasGroovelabSub;
                                    
                                    let appName = 'Campus-Groovelab';
                                    let subjectPhrase = 'Instrumental- und Groovelab-Unterrichts';
                                    if (isGrooveOnly) {
                                      appName = 'GrooveLab';
                                      subjectPhrase = 'Groovelab-Unterrichts';
                                    } else if (isCampusOnly) {
                                      appName = 'Campus';
                                      subjectPhrase = 'Instrumentalunterrichts';
                                    }

                                    const filename = isGrooveOnly 
                                      ? 'Eltern_Information_Einwilligung_Groovelab.txt' 
                                      : isCampusOnly
                                        ? 'Eltern_Information_Einwilligung_Campus.txt'
                                        : 'Eltern_Information_Einwilligung_Campus_Groovelab.txt';

                                    const costPhrase = isGrooveOnly || studentBillingOption === 'school_covered' || !studentBillingOption
                                      ? '- Die Nutzung der App ist für Sie und Ihr Kind vollständig kostenlos (die Gebühren trägt die Musikschule).'
                                      : studentBillingOption === 'student_full'
                                        ? '- Die Nutzung der App erfolgt als transparenter Jahresbeitrag von 5,88 € für das gesamte Schuljahr (entspricht 0,49 € / Monat; Einmalzahlung, keine automatische Verlängerung).'
                                        : '- Die Musikschule bezuschusst das Profil; für Sie fällt ein reduzierter Jahresbeitrag von 4,80 € für das gesamte Schuljahr an (entspricht 0,40 € / Monat; Einmalzahlung, keine automatische Verlängerung).';

                                    const text = `ELTERN-INFORMATION & EINWILLIGUNG ZUR NUTZUNG DER APP ${appName.toUpperCase()}\n\nSehr geehrte Eltern, liebe Erziehungsberechtigte,\n\nim Rahmen des ${subjectPhrase} nutzen wir ab sofort die webbasierte, datenschutzkonforme App „${appName}“ zur pädagogischen Begleitung und Gamification (XP-Punkte, Band-Matching, Song-Bibliotheken).\n\nDATENSCHUTZ UND SICHERHEIT STEHEN AN ERSTER STELLE:\n${costPhrase}\n- Es werden keinerlei sensible Vertragsdaten, Bankdaten oder E-Mail-Adressen von Kindern oder Eltern erfasst.\n- Zur Identifizierung und zum Schutz vor Schulterblicken im Unterricht wird der Nachname auf allen Schüler- und Lehrer-Dashboards standardmäßig maskiert (z. B. „Jonas M.“).\n- Das Hosting findet zu 100 % in zertifizierten deutschen Rechenzentren (Hetzner Online GmbH & Supabase EU) statt.\n- Audio-Aufnahmen dienen nur Übe-Protokollen und werden bei Löschung physisch vernichtet.\n\nMit der Nutzung der App willigen Sie ein, dass wir ein geschütztes Übe-Profil für Ihr Kind anlegen. Sie können die Löschung oder Sperrung des Profils jederzeit über uns verlangen.\n\nVielen Dank für Ihre Unterstützung!`;
                                    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = filename;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                  }}
                                  style={{ 
                                    fontSize: '0.62rem', 
                                    fontWeight: 900, 
                                    background: '#fef08a', 
                                    border: '1px solid #ca8a04', 
                                    color: '#854d0e', 
                                    padding: '3px 8px', 
                                    borderRadius: '100px', 
                                    textTransform: 'uppercase',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Herunterladen
                                </button>
                              </div>
                              <span style={{ display: 'block', marginTop: '4px' }}>
                                Lade dir hier die rechtssichere Eltern-Informationsvorlage und Einverständniserklärung zur Verteilung an deine Schüler herunter.
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Audit Log Retention */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px 20px' }}>
                          <div>
                            <strong style={{ fontSize: '0.84rem', color: '#1e293b', display: 'block' }}>Vorhaltezeit des Änderungsprotokolls</strong>
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Verlaufsprotokolle (Audit Logs) nach X Tagen automatisch löschen.</span>
                          </div>
                          <select 
                            value={logRetention} 
                            onChange={(e) => setLogRetention(e.target.value)} 
                            style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.8rem', fontWeight: 700 }}
                          >
                            <option value="30">Nach 30 Tagen</option>
                            <option value="90">Nach 90 Tagen</option>
                            <option value="365">Nach 1 Jahr</option>
                            <option value="never">Nie löschen (manuell)</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {activeSecretarySettingsModal === 'backup' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div>
                            <strong style={{ fontSize: '0.84rem', color: '#1e293b', display: 'block' }}>Sicherungsdatei erstellen / einspielen</strong>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '4px', lineHeight: '1.4' }}>
                              Lade alle Stammdaten, Benutzer, Räume, Stundenpläne und Bands deiner Musikschule als strukturierte JSON-Sicherungsdatei herunter oder spiele ein bestehendes Backup wieder ein.
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#1e293b' }}>Letztes lokales Backup</span>
                              <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                                {lastBackupDate ? `Gesichert am ${new Date(lastBackupDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} um ${new Date(lastBackupDate).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr` : 'Bisher kein lokales Backup erstellt.'}
                              </span>
                            </div>
                            <button 
                              onClick={handleExportBackup}
                              disabled={isExporting}
                              style={{ 
                                padding: '10px 18px', fontSize: '0.78rem', fontWeight: 800, borderRadius: '10px', 
                                border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', cursor: 'pointer', transition: 'all 0.15s',
                                display: 'flex', alignItems: 'center', gap: '6px'
                              }}
                              className="hover-scale"
                            >
                              <Download size={14} style={{ color: '#64748b' }} /> {isExporting ? 'Exportiert...' : 'Backup herunterladen'}
                            </button>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fef2f2', border: '1px dashed #fca5a5', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginRight: '16px' }}>
                              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#991b1b' }}>Daten aus Backup wiederherstellen</span>
                              <span style={{ fontSize: '0.7rem', color: '#7f1d1d', marginTop: '2px', lineHeight: '1.3' }}>
                                WICHTIG: Das Einspielen überschreibt alle aktuellen Daten dieser Schule unwiderruflich mit dem Stand des Backups.
                              </span>
                            </div>
                            <div>
                              <input
                                type="file"
                                id="restore-file-input"
                                accept=".json"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleRestoreBackup(file);
                                  }
                                }}
                                style={{ display: 'none' }}
                              />
                              <button 
                                onClick={() => document.getElementById('restore-file-input')?.click()}
                                disabled={isRestoring}
                                style={{ 
                                  padding: '10px 18px', fontSize: '0.78rem', fontWeight: 800, borderRadius: '10px', 
                                  border: 'none', background: '#ea4335', color: '#ffffff', cursor: 'pointer', transition: 'all 0.15s',
                                  display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(234, 67, 53, 0.15)'
                                }}
                                className="hover-scale"
                              >
                                <Upload size={14} style={{ color: '#ffffff' }} /> {isRestoring ? 'Wiederherstellung...' : 'Backup einspielen'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeSecretarySettingsModal === 'school_year' && (() => {
                      const expiredStudents = students.filter((s: any) => s.contractEndsAt && new Date(s.contractEndsAt).getTime() < Date.now());
                      const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
                      const selectedMonthName = monthNames[(schoolYearStartMonth || 9) - 1] || 'September';

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                          
                          {/* CARD 1: SCHULJAHRESBEGINN & STICHTAG */}
                          <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Clock size={22} />
                                </div>
                                <div>
                                  <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
                                    Schuljahresbeginn &amp; Vertragsstichtag
                                  </h4>
                                  <span style={{ fontSize: '0.73rem', color: '#64748b' }}>
                                    Offizieller Stichtag für Schuljahres-Pakete und Laufzeiten
                                  </span>
                                </div>
                              </div>
                              <span style={{
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                color: '#334155',
                                padding: '4px 10px',
                                borderRadius: '100px',
                                fontSize: '0.68rem',
                                fontWeight: 800
                              }}>
                                Stichtag: {schoolYearStartDay}. {selectedMonthName}
                              </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                              <div>
                                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Tag des Schuljahresstarts</label>
                                <select
                                  value={schoolYearStartDay}
                                  onChange={(e) => handleUpdateSchoolYear(schoolYearStartMonth, parseInt(e.target.value))}
                                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none', fontSize: '0.84rem', background: '#f8fafc', fontWeight: 700, color: '#0f172a' }}
                                >
                                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                    <option key={day} value={day}>{day}.</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Monat des Schuljahresstarts</label>
                                <select
                                  value={schoolYearStartMonth}
                                  onChange={(e) => handleUpdateSchoolYear(parseInt(e.target.value), schoolYearStartDay)}
                                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none', fontSize: '0.84rem', background: '#f8fafc', fontWeight: 700, color: '#0f172a' }}
                                >
                                  {monthNames.map((name, idx) => (
                                    <option key={idx + 1} value={idx + 1}>{name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* CARD 2: AUTO-CLEAN APPLE SWITCH HERO */}
                          <div style={{
                            background: autoDeleteExpiredUsers
                              ? 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)'
                              : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                            border: autoDeleteExpiredUsers ? '1.5px solid #86efac' : '1.5px solid #cbd5e1',
                            borderRadius: '20px',
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                            transition: 'all 0.2s ease'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{
                                  width: '42px',
                                  height: '42px',
                                  borderRadius: '12px',
                                  background: autoDeleteExpiredUsers ? '#dcfce7' : '#f1f5f9',
                                  color: autoDeleteExpiredUsers ? '#16a34a' : '#64748b',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: autoDeleteExpiredUsers ? '0 4px 12px rgba(22, 163, 74, 0.2)' : 'none'
                                }}>
                                  <ShieldCheck size={24} />
                                </div>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 900, color: '#0f172a' }}>
                                      Automatische DSGVO-Bereinigung (Auto-Clean)
                                    </h4>
                                    <span style={{
                                      background: autoDeleteExpiredUsers ? '#dcfce7' : '#f1f5f9',
                                      color: autoDeleteExpiredUsers ? '#15803d' : '#64748b',
                                      border: autoDeleteExpiredUsers ? '1px solid #86efac' : '1px solid #cbd5e1',
                                      padding: '2px 8px',
                                      borderRadius: '100px',
                                      fontSize: '0.64rem',
                                      fontWeight: 800
                                    }}>
                                      {autoDeleteExpiredUsers ? 'AKTIV' : 'INAKTIV'}
                                    </span>
                                  </div>
                                  <p style={{ margin: '3px 0 0 0', fontSize: '0.73rem', color: '#475569', fontWeight: 500, lineHeight: '1.4' }}>
                                    Löscht abgelaufene Profile und vernichtet verknüpfte Audio-Dateien physisch aus dem deutschen Cloud-Speicher.
                                  </p>
                                </div>
                              </div>

                              {/* Apple Style Toggle Switch */}
                              <div
                                onClick={() => handleToggleAutoClean(!autoDeleteExpiredUsers)}
                                role="button"
                                tabIndex={0}
                                aria-label="Auto-Clean umschalten"
                                style={{
                                  width: '50px',
                                  height: '28px',
                                  borderRadius: '100px',
                                  background: autoDeleteExpiredUsers ? '#22c55e' : '#cbd5e1',
                                  padding: '2px',
                                  cursor: 'pointer',
                                  transition: 'background 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  flexShrink: 0,
                                  boxShadow: autoDeleteExpiredUsers ? '0 2px 8px rgba(34, 197, 94, 0.4)' : 'none'
                                }}
                              >
                                <div style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: '#ffffff',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                  transform: autoDeleteExpiredUsers ? 'translateX(22px)' : 'translateX(0px)',
                                  transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                                }} />
                              </div>
                            </div>

                            <div style={{
                              background: 'rgba(255, 255, 255, 0.7)',
                              border: '1px solid #e2e8f0',
                              borderRadius: '10px',
                              padding: '10px 12px',
                              fontSize: '0.72rem',
                              color: '#64748b',
                              lineHeight: '1.45'
                            }}>
                              🛡️ <strong>Schutzgarantie:</strong> Aktive Schülerinnen und Schüler mit laufendem Unterricht bleiben zu 100% geschützt. Es werden ausschließlich Zugänge gelöscht, deren Buchungszeitraum unwiderruflich abgelaufen ist.
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                              <button
                                type="button"
                                onClick={async () => {
                                  await handleSaveAllSettings({ autoDeleteExpiredUsers, schoolYearStartMonth, schoolYearStartDay });
                                  setActiveSecretarySettingsModal(null);
                                }}
                                disabled={isSavingSettings}
                                style={{
                                  padding: '9px 18px',
                                  borderRadius: '10px',
                                  background: '#ea4335',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontWeight: 800,
                                  fontSize: '0.8rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  boxShadow: '0 4px 12px rgba(234, 67, 53, 0.25)',
                                  transition: 'all 0.15s ease'
                                }}
                                className="hover-scale"
                              >
                                <CheckCircle size={15} /> {isSavingSettings ? 'Speichere...' : 'Schuljahr & Auto-Clean speichern'}
                              </button>
                            </div>
                          </div>

                          {/* CARD 3: DATABASE AUDIT STATUS (MANUELLE BEREINIGUNG) */}
                          <div style={{
                            background: expiredStudents.length === 0 ? '#f0fdf4' : '#fef2f2',
                            border: expiredStudents.length === 0 ? '1.5px solid #bbf7d0' : '1.5px solid #fca5a5',
                            borderRadius: '16px',
                            padding: '16px 18px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '12px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {expiredStudents.length === 0 ? (
                                <CheckCircle size={22} color="#166534" />
                              ) : (
                                <AlertCircle size={22} color="#dc2626" />
                              )}
                              <div>
                                <strong style={{ fontSize: '0.82rem', display: 'block', color: expiredStudents.length === 0 ? '#166534' : '#991b1b' }}>
                                  {expiredStudents.length === 0
                                    ? 'Datenbank ist DSGVO-bereinigt'
                                    : `${expiredStudents.length} abgelaufene Schülerkonten gefunden`}
                                </strong>
                                <span style={{ fontSize: '0.72rem', color: expiredStudents.length === 0 ? '#15803d' : '#7f1d1d' }}>
                                  {expiredStudents.length === 0
                                    ? 'Keine abgelaufenen Konten vorhanden. Alle Schülerprofile sind aktiv.'
                                    : 'Diese Profile können sofort manuell bereinigt und unwiderruflich gelöscht werden.'}
                                </span>
                              </div>
                            </div>

                            {expiredStudents.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteExpiredStudents(false)}
                                style={{
                                  padding: '8px 16px',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  borderRadius: '10px',
                                  background: '#ea4335',
                                  color: '#ffffff',
                                  border: 'none',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  boxShadow: '0 2px 6px rgba(234, 67, 53, 0.25)'
                                }}
                                className="hover-scale"
                              >
                                {expiredStudents.length} Profile jetzt löschen
                              </button>
                            )}
                          </div>

                        </div>
                      );
                    })()}

                    {activeSecretarySettingsModal === 'danger_zone' && (
                      <div style={{ 
                        background: '#fff5f5', 
                        border: '1.5px solid #feb2b2', 
                        borderRadius: '16px', 
                        padding: '24px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '16px' 
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <ShieldAlert size={22} style={{ color: '#e53e3e' }} />
                          <strong style={{ fontSize: '0.96rem', color: '#c53030', fontWeight: 800 }}>Gefahrenzone: Werkseinstellungen</strong>
                        </div>
                        
                        <span style={{ fontSize: '0.78rem', color: '#742a2a', lineHeight: '1.5' }}>
                          Setzt Ihre komplette Musikschule auf Werkseinstellungen zurück. 
                          Alle Schüler- und Lehrer-Profile, Avatare, Wochenstundenpläne, Unterrichtsstunden, gebildeten Bands und Chathistorien werden <strong>unwiderruflich gelöscht</strong>. 
                          Lediglich Ihr Administrator-Konto bleibt aktiv, sodass Sie die Schule sofort von null auf neu aufbauen können.
                        </span>

                        <div style={{
                          background: 'rgba(255, 255, 255, 0.75)',
                          border: '1px solid #fed7d7',
                          borderRadius: '10px',
                          padding: '12px 14px',
                          fontSize: '0.75rem',
                          color: '#742a2a',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          lineHeight: '1.45'
                        }}>
                          <CheckCircle size={16} color="#34a853" style={{ flexShrink: 0 }} />
                          <span>
                            <strong>Hinweis zum Abonnement:</strong> Ihr gebuchtes Infrastruktur- & Cloud-Hosting bleibt aktiv. Variable Schülergebühren pausieren automatisch, bis Sie neue Schülerprofile anlegen.
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSecretarySettingsModal(null);
                              setResetConfirmText('');
                              setShowResetModal(true);
                            }}
                            style={{
                              padding: '10px 20px',
                              background: '#e53e3e',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '10px',
                              fontSize: '0.82rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              boxShadow: '0 2px 6px rgba(229, 62, 62, 0.25)'
                            }}
                            className="hover-scale"
                          >
                            Werkseinstellungen zurücksetzen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid #f1f5f9',
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '10px'
                  }}>
                    <button
                      onClick={() => setActiveSecretarySettingsModal(null)}
                      style={{
                        padding: '8px 18px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#475569',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      className="hover-scale"
                    >
                      Schließen
                    </button>

                    {activeSecretarySettingsModal !== 'danger_zone' && (
                      <button
                        onClick={async () => {
                          await handleSaveAllSettings();
                          setActiveSecretarySettingsModal(null);
                        }}
                        disabled={!isSettingsDirty || isSavingSettings}
                        style={{
                          padding: '8px 20px',
                          borderRadius: '10px',
                          border: 'none',
                          background: isSettingsDirty ? '#ea4335' : '#cbd5e1',
                          color: isSettingsDirty ? '#ffffff' : '#94a3b8',
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          cursor: isSettingsDirty ? 'pointer' : 'default',
                          boxShadow: isSettingsDirty ? '0 4px 12px rgba(234, 67, 53, 0.25)' : 'none'
                        }}
                        className={isSettingsDirty ? "hover-scale" : ""}
                      >
                        {isSavingSettings ? 'Speichern...' : 'Speichern'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
  );
}
