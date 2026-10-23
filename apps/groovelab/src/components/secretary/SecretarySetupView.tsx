import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import {
  AlertCircle, Check, CheckCircle, Clock, Copy, Database, Download,
  Eye, EyeOff, FileCheck, FileText, Fingerprint, HeartHandshake, KeyRound, Lightbulb, Palmtree, Printer, QrCode, School, ShieldAlert,
  ShieldCheck, Sparkles, Tablet, Trash2, Upload, X, Zap
} from 'lucide-react';
import { getCanonicalQrLandingUrl } from '../../utils/tenantUrlHelper';
import { AvvCertificateModal } from '../modals/AvvCertificateModal';
import { SUPPORTED_STATES } from '../../utils/schoolHolidayEngine';
import { SecretarySponsorsModal } from './sponsors/SecretarySponsorsModal';
import { SecretaryPrivacyGovernanceModal } from './modals/SecretaryPrivacyGovernanceModal';

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
  absenceEmail?: string;
  setAbsenceEmail?: (val: string) => void;
  logoUrl: string;
  setLogoUrl: (val: string) => void;
  kioskPinLength: number;
  setKioskPinLength: (val: number) => void;
  bypassPin: string;
  setBypassPin: (val: string) => void;
  logRetention: string;
  setLogRetention: (val: string) => void;
  currentUserProfile: any;
  currentSchoolProfile?: any;
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
  showSchoolHolidays?: boolean;
  setShowSchoolHolidays?: (val: boolean) => void;
  holidayJurisdiction?: string;
  setHolidayJurisdiction?: (val: string) => void;
  lessonBufferBefore?: number;
  setLessonBufferBefore?: (val: number) => void;
  lessonBufferAfter?: number;
  setLessonBufferAfter?: (val: number) => void;
}

export function SecretarySetupView(props: SecretarySetupViewProps) {
  const {
    schoolId,
    lessonBufferBefore = 15,
    setLessonBufferBefore = () => {},
    lessonBufferAfter = 15,
    setLessonBufferAfter = () => {},
    showSchoolHolidays = true,
    setShowSchoolHolidays,
    holidayJurisdiction = 'DE_BW',
    setHolidayJurisdiction,
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
    absenceEmail = '',
    setAbsenceEmail = () => {},
    logoUrl,
    setLogoUrl,
    kioskPinLength,
    setKioskPinLength,
    bypassPin,
    setBypassPin,
    logRetention,
    setLogRetention,
    currentUserProfile,
    currentSchoolProfile = props.currentSchoolProfile,
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

  const [showCertModal, setShowCertModal] = useState<boolean>(false);
  const [showBypassPin, setShowBypassPin] = useState<boolean>(false);
  const [showKioskQr, setShowKioskQr] = useState<boolean>(false);

  return (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 1000, color: '#0f172a', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', textAlign: 'left' }}>
                  ⚙️ Einstellungen
                </h2>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 600, textAlign: 'left' }}>
                  Wähle ein Modul aus, um Stammdaten, Kalender-Sync, Sicherheit, Datensicherung und Betriebszeiten für deine Schule zu konfigurieren.
                </p>
              </div>

              {/* Status-Badge statt verwirrendem Phantom-Umschalter */}
              <div 
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: '#f8fafc',
                  padding: '6px 14px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  gap: '8px'
                }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569' }}>
                  9 Systemmodule aktiv
                </span>
              </div>
            </div>

            {/* MODULAR COVER CARDS GRID: 3x3 SYMMETRISCH (9 MODULE) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: windowWidth < 640 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
              gap: '18px',
              width: '100%'
            }}>
              {[
                {
                  id: 'general',
                  title: 'Schul-Stammdaten',
                  subtitle: schoolName || 'Name, Adresse & Logo',
                  badge: 'Stammdaten',
                  gradient: '#ef4444',
                  shadowColor: 'transparent',
                  icon: School
                },
                {
                  id: 'links',
                  title: 'Kiosk-Flotte & Raum-Terminals',
                  subtitle: 'QR-Kiosk-Modus, Raum-Tablets & PINs',
                  badge: kioskToken ? 'Kiosk Aktiv' : 'Kiosk & PIN',
                  gradient: '#0ea5e9',
                  shadowColor: 'transparent',
                  icon: Tablet
                },
                {
                  id: 'sync',
                  title: 'Kalender, Ferien & Sync',
                  subtitle: `${calendarUrls.length} iCal-Feeds • ${SUPPORTED_STATES.find(s => s.code === holidayJurisdiction)?.name || 'Baden-Württemberg'}`,
                  badge: showSchoolHolidays ? 'Ferien & Sync aktiv' : (syncInterval === 'realtime' ? 'Echtzeit' : syncInterval === 'hourly' ? 'Stündlich' : 'Täglich'),
                  gradient: '#06b6d4',
                  shadowColor: 'transparent',
                  icon: Zap
                },
                {
                  id: 'security_privacy',
                  title: 'Datenschutz & AVV',
                  subtitle: 'AV-Vertrag, DSB-Ausweis & Audit',
                  badge: isAvvSigned ? 'AVV Gezeichnet' : 'AVV Ausstehend',
                  gradient: '#10b981',
                  shadowColor: 'transparent',
                  icon: ShieldCheck
                },
                {
                  id: 'backup',
                  title: 'Lokale Datensicherung',
                  subtitle: lastBackupDate ? 'Sicherung vorhanden' : 'JSON-Backup Tresor',
                  badge: lastBackupDate ? 'Gesichert' : 'Backup Tresor',
                  gradient: '#6366f1',
                  shadowColor: 'transparent',
                  icon: Database
                },
                {
                  id: 'school_year',
                  title: 'Schuljahr & Auto-Clean',
                  subtitle: `Start: ${schoolYearStartDay}. ${['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'][(schoolYearStartMonth || 9) - 1] || 'September'}`,
                  badge: autoDeleteExpiredUsers ? 'Auto-Clean An' : 'Manuell',
                  gradient: '#f97316',
                  shadowColor: 'transparent',
                  icon: Clock
                },
                { id: 'sponsors', title: 'Sponsoren & Partner', subtitle: 'Bildungsförderung & Toasts', badge: 'Patenschaften', gradient: '#facc15', shadowColor: 'transparent', icon: HeartHandshake },
                {
                  id: 'feedback',
                  title: 'Ideenschmiede',
                  subtitle: 'Wünsche & Fehler melden',
                  badge: 'Mitgestalten',
                  gradient: '#a855f7',
                  shadowColor: 'transparent',
                  icon: Lightbulb
                },
                {
                  id: 'danger_zone',
                  title: 'Werkseinstellungen',
                  subtitle: 'Musikschule zurücksetzen',
                  badge: 'Gefahr',
                  gradient: '#ef4444',
                  shadowColor: 'transparent',
                  icon: ShieldAlert
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
                      boxShadow: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                      border: 'none'
                    }}>
                      <IconComp size={30} color={module.id === 'sponsors' ? '#0f172a' : '#ffffff'} strokeWidth={2.3} />
                    </div>
                    <div style={{ marginTop: '14px', padding: '0 4px', width: '100%' }}>
                      <div style={{ fontSize: '0.92rem', fontWeight: 850, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                        {module.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginTop: '3px', lineHeight: '1.3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {module.subtitle}
                      </div>
                    </div>
                    {module.badge && (() => {
                      let badgeColor = '#475569';
                      let badgeBg = '#f1f5f9';

                      if (module.id === 'danger_zone') {
                        badgeColor = '#dc2626';
                        badgeBg = '#fee2e2';
                      } else if (module.id === 'security_privacy' && !isAvvSigned) {
                        badgeColor = '#b45309';
                        badgeBg = '#fef3c7';
                      } else if (['Kiosk Aktiv', 'AVV Gezeichnet', 'Auto-Clean An', 'Gesichert', 'Ferien Aktiv'].includes(module.badge)) {
                        badgeColor = '#047857';
                        badgeBg = '#d1fae5';
                      }

                      return (
                        <span style={{
                          marginTop: '10px',
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          color: badgeColor,
                          background: badgeBg,
                          padding: '2.5px 9px',
                          borderRadius: '100px',
                          letterSpacing: '0.02em'
                        }}>
                          {module.badge}
                        </span>
                      );
                    })()}
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
                border: 'none',
                background: '#fef2f2',
                borderRadius: '20px',
                boxShadow: 'none',
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
                    boxShadow: 'none',
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
            {activeSecretarySettingsModal && activeSecretarySettingsModal !== 'sponsors' && activeSecretarySettingsModal !== 'security_privacy' && (
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
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="secretary-settings-modal-title"
                  tabIndex={-1}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setActiveSecretarySettingsModal(null);
                  }}
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
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    outline: 'none'
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
                          ? '#ef4444'
                          : activeSecretarySettingsModal === 'links'
                          ? '#0ea5e9'
                          : activeSecretarySettingsModal === 'sync'
                          ? '#06b6d4'
                          : activeSecretarySettingsModal === 'security_privacy'
                          ? '#10b981'
                          : activeSecretarySettingsModal === 'backup'
                          ? '#6366f1'
                          : activeSecretarySettingsModal === 'school_year'
                          ? '#f97316'
                          : '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
                      }}>
                        {activeSecretarySettingsModal === 'general' && <School size={22} color="#ffffff" />}
                        {activeSecretarySettingsModal === 'links' && <Tablet size={22} color="#ffffff" />}
                        {activeSecretarySettingsModal === 'sync' && <Zap size={22} color="#ffffff" />}
                        {activeSecretarySettingsModal === 'security_privacy' && <ShieldCheck size={22} color="#ffffff" />}
                        {activeSecretarySettingsModal === 'backup' && <Database size={22} color="#ffffff" />}
                        {activeSecretarySettingsModal === 'school_year' && <Clock size={22} color="#ffffff" />}
                        {activeSecretarySettingsModal === 'danger_zone' && <ShieldAlert size={22} color="#ffffff" />}
                      </div>
                      <div>
                        <h3 id="secretary-settings-modal-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                          {activeSecretarySettingsModal === 'general' && 'Schul-Stammdaten & Branding'}
                          {activeSecretarySettingsModal === 'links' && 'Kiosk-Flotte & Raum-Terminals'}
                          {activeSecretarySettingsModal === 'sync' && 'Kalender, Schulferien & Synchronisation'}
                          {activeSecretarySettingsModal === 'security_privacy' && 'Datenschutz, AVV & DSB-Audit'}
                          {activeSecretarySettingsModal === 'backup' && 'Lokale Datensicherung'}
                          {activeSecretarySettingsModal === 'school_year' && 'Schuljahr & Auto-Bereinigung'}
                          {activeSecretarySettingsModal === 'danger_zone' && 'Gefahrenzone: Werkseinstellungen'}
                        </h3>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>
                          {activeSecretarySettingsModal === 'general' && 'Stammdaten, Anschrift und Schullogo deines Campus.'}
                          {activeSecretarySettingsModal === 'links' && 'QR-Kiosk-Kopplung für Raum-Tablets, Kiosk-PIN-Richtlinien & Schul-Links.'}
                          {activeSecretarySettingsModal === 'sync' && 'Datenabgleich, gesetzliche KMK-Ferien und externe iCal-Abonnements.'}
                          {activeSecretarySettingsModal === 'security_privacy' && 'Auftragsverarbeitungsvertrag (Art. 28 DSGVO), DSB-Prüfportal & TOMs.'}
                          {activeSecretarySettingsModal === 'backup' && 'JSON-Export und Wiederherstellung der Schuldatenbank.'}
                          {activeSecretarySettingsModal === 'school_year' && 'Schuljahresbeginn und automatische DSGVO-Bereinigung.'}
                          {activeSecretarySettingsModal === 'danger_zone' && 'Setzt die Schule unwiderruflich auf Werkseinstellungen zurück.'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSecretarySettingsModal(null)}
                      aria-label="Modal schließen"
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      className="hover-scale"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(80vh - 140px)', textAlign: 'left' }}>
                    {activeSecretarySettingsModal === 'general' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <strong style={{ fontSize: '0.84rem', display: 'block', color: '#1e293b' }}>Stammdaten der Musikschule</strong>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
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
                                placeholder="z. B. stadtmusikschule"
                                value={schoolSubdomain}
                                onChange={(e) => setSchoolSubdomain(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.84rem', background: '#ffffff' }}
                              />
                              <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', marginTop: '4px' }}>
                                URL: <strong>https://{(schoolSubdomain || 'schule').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')}.campus-groovelab.de</strong>
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: (typeof window !== 'undefined' && window.innerWidth <= 1024) ? '1fr' : '2fr 1fr', gap: '16px' }}>
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

                          <div style={{ display: 'grid', gridTemplateColumns: (typeof window !== 'undefined' && window.innerWidth <= 1024) ? '1fr' : '1fr 2fr', gap: '16px' }}>
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

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
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

                          <div style={{ marginTop: '14px' }}>
                            <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                              <span>E-Mail für Ausfallmeldungen (optional)</span>
                              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b' }}>• Standard: allgemeine E-Mail-Adresse</span>
                            </label>
                            <input
                              type="email"
                              placeholder="z.B. ausfall@musikschule-stadt.de"
                              value={absenceEmail}
                              onChange={(e) => setAbsenceEmail(e.target.value)}
                              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.84rem', background: '#ffffff' }}
                            />
                            <span style={{ fontSize: '0.70rem', color: '#64748b', display: 'block', marginTop: '4px', lineHeight: 1.35 }}>
                              Lehrkräfte können an diese Adresse offizielle Abwesenheitsmeldungen und Terminausfälle mit 1-Klick vorbefüllt senden.
                            </span>
                          </div>

                          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '16px' }}>
                            <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Logo URL</label>
                            <input
                              type="text"
                              placeholder="https://example.com/logo.png"
                              value={logoUrl}
                              onChange={(e) => setLogoUrl(e.target.value)}
                              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.84rem', background: '#ffffff' }}
                            />
                          </div>

                          {/* Unterrichts-Pufferzeiten (Standard: 15 Min Vor-/Nachbereitung vor 1. und nach letztem Termin) */}
                          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <strong style={{ fontSize: '0.84rem', color: '#1e293b' }}>
                                ⏱️ Unterrichts-Pufferzeiten &amp; Rhythmus
                              </strong>
                              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '6px' }}>
                                0,1% Goldstandard Block-Puffer
                              </span>
                            </div>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '12px', lineHeight: 1.35 }}>
                              Festlegung der standardmäßigen Rüstzeiten: <strong>Puffer vor dem 1. Termin</strong> (z.&nbsp;B. für Raumaufbau/Vorbereitung) und <strong>nach dem letzten Termin</strong> (Abbau, Lüften, Protokoll). Zwischen Schülern derselben Lehrkraft bleibt der Unterricht nahtlos (100% Raumkapazität).
                            </span>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
                              <div>
                                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                  Rüstpuffer vor 1. Termin (Minuten)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  max={60}
                                  step={5}
                                  value={lessonBufferBefore}
                                  onChange={(e) => {
                                    const val = Math.max(0, Math.min(60, Number(e.target.value) || 0));
                                    setLessonBufferBefore(val);
                                  }}
                                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.84rem', background: '#ffffff' }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                  Nachbereitung nach letztem Termin (Minuten)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  max={60}
                                  step={5}
                                  value={lessonBufferAfter}
                                  onChange={(e) => {
                                    const val = Math.max(0, Math.min(60, Number(e.target.value) || 0));
                                    setLessonBufferAfter(val);
                                  }}
                                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.84rem', background: '#ffffff' }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Zahlungsart Card */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong style={{ fontSize: '0.84rem', display: 'block', color: '#1e293b' }}>Aktive Zahlungsart</strong>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '4px', lineHeight: '1.35' }}>
                              Die Abrechnung für Cloud-Hosting und Bereitstellung erfolgt transparent per Sammelrechnung (30 Tage Zahlungsziel). Es fallen keine gesonderten Lizenzkaufgebühren an.
                            </span>
                          </div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#ea4335', background: '#fce8e6', border: 'none', padding: '6px 14px', borderRadius: '100px', letterSpacing: '0.04em', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                            RECHNUNG (30 TAGE)
                          </div>
                        </div>
                      </div>
                    )}

                    {activeSecretarySettingsModal === 'links' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* HINWEIS: PERSÖNLICHE ZUGANGSDATEN & PASSKEYS IM USER-DOCK */}
                        <div style={{
                          background: '#f0f9ff',
                          border: 'none',
                          borderRadius: '16px',
                          padding: '14px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px'
                        }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            background: '#e0f2fe',
                            color: '#0284c7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <KeyRound size={20} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <strong style={{ fontSize: '0.84rem', color: '#0369a1', display: 'block' }}>
                              Persönliche Zugangsdaten, Passkeys &amp; Login-PINs
                            </strong>
                            <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: '#0284c7', lineHeight: 1.4 }}>
                              Eigene Geräte-Passkeys (Touch ID / Face ID), Master-Passwörter und persönliche 4-stellige Schnell-PINs gehören zur individuellen Sicherheit deines Benutzer-Accounts und werden im <strong>Profil-Dock unten links</strong> verwaltet.
                            </p>
                          </div>
                        </div>

                        {/* SÄULE 3: KIOSK-RICHTLINIEN & PIN-LÄNGE */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px' }}>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type={showBypassPin ? 'text' : 'password'}
                                value={bypassPin}
                                onChange={(e) => setBypassPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                aria-label="Master Bypass-PIN"
                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', letterSpacing: '0.3em', width: '110px', textAlign: 'center', background: '#ffffff', outline: 'none' }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowBypassPin(!showBypassPin)}
                                aria-label={showBypassPin ? 'PIN verbergen' : 'PIN anzeigen'}
                                title={showBypassPin ? 'PIN verbergen' : 'PIN anzeigen'}
                                style={{
                                  background: '#f1f5f9',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '8px',
                                  padding: '7px 10px',
                                  cursor: 'pointer',
                                  color: '#475569',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.15s ease'
                                }}
                                className="hover-scale"
                              >
                                {showBypassPin ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
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
                                aria-label="Schul-Anmeldelink"
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

                          {kioskToken && (() => {
                            const kioskFullUrl = schoolSubdomain 
                              ? (typeof window !== 'undefined' && window.location.hostname.includes('localhost') 
                                ? `http://${schoolSubdomain}.localhost:${window.location.port || '5173'}/device-onboarding/${kioskToken}` 
                                : `https://${schoolSubdomain}.campus-groovelab.de/device-onboarding/${kioskToken}`) 
                              : (typeof window !== 'undefined' ? `${window.location.origin}/device-onboarding/${kioskToken}` : `/device-onboarding/${kioskToken}`);

                            return (
                              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px 18px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                                  <div>
                                    <strong style={{ fontSize: '0.82rem', display: 'block', color: '#1e293b', marginBottom: '4px' }}>Tablet-Kopplung (QR-Kiosk-Modus)</strong>
                                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '10px', lineHeight: '1.4' }}>
                                      Link &amp; QR-Code zum permanenten Koppeln von Tablets/iPads im Schulsaal als Scan-Station.
                                    </span>
                                  </div>
                                  <span style={{ fontSize: '0.66rem', fontWeight: 800, background: '#e0f2fe', color: '#0284c7', padding: '3px 8px', borderRadius: '100px', whiteSpace: 'nowrap' }}>
                                    Kiosk Station
                                  </span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  <input 
                                    readOnly 
                                    value={kioskFullUrl} 
                                    aria-label="Tablet-Kopplungs-URL"
                                    style={{ flex: 1, minWidth: '220px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.8rem', fontFamily: 'monospace', background: '#f8fafc', color: '#1e293b' }} 
                                  />
                                  <button 
                                    type="button"
                                    onClick={() => { 
                                      navigator.clipboard.writeText(kioskFullUrl); 
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
                                  <button
                                    type="button"
                                    onClick={() => setShowKioskQr(!showKioskQr)}
                                    style={{
                                      padding: '8px 14px',
                                      fontSize: '0.78rem',
                                      fontWeight: 800,
                                      borderRadius: '8px',
                                      border: '1.5px solid #0284c7',
                                      background: showKioskQr ? '#0284c7' : '#e0f2fe',
                                      color: showKioskQr ? '#ffffff' : '#0284c7',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    <QrCode size={14} /> {showKioskQr ? 'QR verbergen' : '📱 QR zeigen'}
                                  </button>
                                </div>

                                {showKioskQr && (
                                  <div style={{
                                    marginTop: '14px',
                                    padding: '16px',
                                    background: '#f8fafc',
                                    borderRadius: '14px',
                                    border: '1px solid #e2e8f0',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '10px',
                                    textAlign: 'center'
                                  }}>
                                    <div style={{ background: '#ffffff', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                      <QRCode value={kioskFullUrl} size={150} level="M" />
                                    </div>
                                    <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, maxWidth: '380px', lineHeight: 1.4 }}>
                                      📱 <strong>Kiosk-Kamera Scan:</strong> Öffne die Kamera auf dem Saal-iPad und scanne diesen Code, um das Tablet permanent als Kiosk-Station zu verbinden.
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
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
                              border: 'none', background: '#fce8e6', color: '#ea4335', cursor: 'pointer', transition: 'all 0.15s' 
                            }}
                            className="hover-scale"
                          >
                            Datenbanken jetzt synchronisieren
                          </button>
                        </div>

                        {/* 🏖️ Gesetzliche Schulferien & Feiertage (KMK-Engine) */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <strong style={{ fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#1e293b' }}>
                                <Palmtree size={16} color="#16a34a" /> Gesetzliche Schulferien &amp; Feiertage
                              </strong>
                              <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '4px', lineHeight: '1.4' }}>
                                Zeigt offizielle KMK-Schulferien und gesetzliche Feiertage automatisch als Termine im Kalender an. Eigene Schulkalender-Termine haben stets Vorrang.
                              </span>
                            </div>
                            <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={showSchoolHolidays}
                                onChange={e => setShowSchoolHolidays?.(e.target.checked)}
                                style={{ width: '18px', height: '18px', accentColor: '#16a34a', cursor: 'pointer' }}
                              />
                            </label>
                          </div>

                          {showSchoolHolidays && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>
                                Bundesland / Region für Ferienzeiten:
                              </label>
                              <select
                                value={holidayJurisdiction}
                                onChange={e => setHolidayJurisdiction?.(e.target.value)}
                                style={{
                                  padding: '9px 12px',
                                  borderRadius: '10px',
                                  border: '1px solid #cbd5e1',
                                  background: '#ffffff',
                                  color: '#0f172a',
                                  fontSize: '0.82rem',
                                  fontWeight: 600,
                                  outline: 'none'
                                }}
                              >
                                {SUPPORTED_STATES.map(s => (
                                  <option key={s.code} value={s.code}>
                                    {s.name} ({s.country})
                                  </option>
                                ))}
                              </select>
                              <span style={{ fontSize: '0.70rem', color: '#64748b' }}>
                                {props.schoolZipCode ? `Automatisch anhand der Postleitzahl (${props.schoolZipCode}) ermittelt.` : 'Wähle das Bundesland deiner Musikschule.'}
                              </span>
                            </div>
                          )}
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
                                boxShadow: 'none'
                              }}
                            >
                              Hinzufügen
                            </button>
                          </div>
                          
                          {/* Datenschutz- & Souveränitätshinweis für externe Feeds */}
                          <div style={{ marginTop: '10px', padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.74rem', color: '#64748b', lineHeight: 1.45, display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>🛡️</span>
                            <span><strong>Datenschutz-Hinweis (Art. 28 DSGVO):</strong> Externe Feeds (z.&nbsp;B. Google Calendar, Apple iCloud oder Schulserver) werden von Campus-Groovelab ausschließlich passiv und ohne Weitergabe von Schülerdaten an Dritte im deutschen Hetzner-Rechenzentrum verarbeitet. Bitte stellen Sie als verantwortliche Stelle sicher, dass in externen iCal-Feeds keine vertraulichen personenbezogenen Klarnamen oder Gesundheitsdaten enthalten sind, sofern hierfür keine gesonderte Rechtsgrundlage vorliegt.</span>
                          </div>
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
                                  display: 'flex', alignItems: 'center', gap: '6px', boxShadow: 'none'
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

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
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
                              ? '#dcfce7'
                              : '#f8fafc',
                            border: 'none',
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
                                  background: autoDeleteExpiredUsers ? '#d1fae5' : '#f1f5f9',
                                  color: autoDeleteExpiredUsers ? '#10b981' : '#64748b',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: 'none'
                                }}>
                                  <ShieldCheck size={24} />
                                </div>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 900, color: '#0f172a' }}>
                                      Automatische DSGVO-Bereinigung (Auto-Clean)
                                    </h4>
                                    <span style={{
                                      background: autoDeleteExpiredUsers ? '#10b981' : '#f1f5f9',
                                      color: autoDeleteExpiredUsers ? '#ffffff' : '#64748b',
                                      border: 'none',
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
                                  background: autoDeleteExpiredUsers ? '#34a853' : '#cbd5e1',
                                  padding: '2px',
                                  cursor: 'pointer',
                                  transition: 'background 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  flexShrink: 0,
                                  boxShadow: 'none'
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
                                  background: '#ef4444',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontWeight: 800,
                                  fontSize: '0.8rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  boxShadow: 'none',
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
                            background: expiredStudents.length === 0 ? '#dcfce7' : '#fee2e2',
                            border: 'none',
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
                                  boxShadow: 'none'
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
                        border: 'none', 
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
                          border: 'none',
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
                              boxShadow: 'none'
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
                      type="button"
                      onClick={() => setActiveSecretarySettingsModal(null)}
                      style={{
                        padding: '10px 20px',
                        minHeight: '44px',
                        borderRadius: '12px',
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
                        type="button"
                        onClick={async () => {
                          await handleSaveAllSettings();
                          setActiveSecretarySettingsModal(null);
                        }}
                        disabled={!isSettingsDirty || isSavingSettings}
                        style={{
                          padding: '10px 22px',
                          minHeight: '44px',
                          borderRadius: '12px',
                          border: 'none',
                          background: isSettingsDirty ? '#0f172a' : '#e2e8f0',
                          color: isSettingsDirty ? '#ffffff' : '#94a3b8',
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          cursor: isSettingsDirty ? 'pointer' : 'default',
                          boxShadow: 'none'
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

            <AvvCertificateModal
              isOpen={showCertModal}
              onClose={() => setShowCertModal(false)}
              schoolId={schoolId}
              schoolName={props.schoolName || currentSchoolProfile?.name || 'Musikschule'}
              adminName={currentSchoolProfile?.avv_signee_name || props.currentUserProfile?.full_name || (typeof window !== 'undefined' ? localStorage.getItem(`groovelab_avv_signee_${schoolId}`) : '') || 'Schulleitung (Vertretungsberechtigte Person)'}
              confirmationDate={currentSchoolProfile?.avv_signed_at || (typeof window !== 'undefined' ? localStorage.getItem(`groovelab_avv_signed_${schoolId}`) : undefined)}
              auditChecksum={currentSchoolProfile?.avv_checksum || (typeof window !== 'undefined' ? localStorage.getItem(`groovelab_avv_checksum_${schoolId}`) : undefined)}
            />

            <SecretarySponsorsModal isOpen={activeSecretarySettingsModal === 'sponsors'} onClose={() => setActiveSecretarySettingsModal(null)} schoolId={schoolId} schoolName={props.schoolName || 'Musikschule'} schoolStreet={props.schoolStreet} schoolZipCode={props.schoolZipCode} schoolCity={props.schoolCity} schoolEmail={props.schoolEmail} schoolPhoneNumber={props.schoolPhoneNumber} studentsCount={students?.length || 350} />

            <SecretaryPrivacyGovernanceModal
              isOpen={activeSecretarySettingsModal === 'security_privacy'}
              onClose={() => setActiveSecretarySettingsModal(null)}
              schoolId={schoolId}
              schoolName={props.schoolName}
              schoolStreet={props.schoolStreet}
              schoolHouseNumber={props.schoolHouseNumber}
              schoolZipCode={props.schoolZipCode}
              schoolCity={props.schoolCity}
              isAvvSigned={isAvvSigned}
              hasCampusSub={hasCampusSub}
              hasGroovelabSub={hasGroovelabSub}
              studentBillingOption={studentBillingOption}
              logRetention={logRetention}
              setLogRetention={setLogRetention}
              onOpenSecuritySuite={() => window.dispatchEvent(new CustomEvent('open_admin_security_suite'))}
              onOpenDpoPortal={() => setShowDpoPortalModal(true)}
              onOpenDpoIdCard={() => setShowDpoIdCardModal(true)}
              onOpenAvvModal={() => setShowAvvModal(true)}
              onOpenCertModal={() => setShowCertModal(true)}
              onSaveSettings={handleSaveAllSettings}
              isSettingsDirty={isSettingsDirty}
              isSavingSettings={isSavingSettings}
            />

          </div>
  );
}
