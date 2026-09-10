import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'react-qr-code';
import {
  X,
  Shield,
  ShieldAlert,
  Key,
  Fingerprint,
  Mail,
  Calendar,
  User,
  Music,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Disc3,
  Lock,
  Smartphone,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ─── APPLE STYLE TOKEN FIELD ──────────────────────────────────────────────────
interface AppleStyleTokenFieldProps {
  label?: string;
  selectedString: string;
  onChange: (newValue: string) => void;
  suggestions: string[];
  placeholder?: string;
}

const AppleStyleTokenField: React.FC<AppleStyleTokenFieldProps> = ({
  label,
  selectedString,
  onChange,
  suggestions,
  placeholder = 'Fach hinzufügen...'
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedTokens = selectedString
    ? selectedString.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const availableSuggestions = suggestions.filter(
    (s) => !selectedTokens.includes(s) && s.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleSelectToken = (token: string) => {
    const next = [...selectedTokens, token];
    onChange(next.join(', '));
    setInputValue('');
    setActiveIndex(0);
    inputRef.current?.focus();
  };

  const handleRemoveToken = (token: string) => {
    const next = selectedTokens.filter((t) => t !== token);
    onChange(next.join(', '));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !inputValue && selectedTokens.length > 0) {
      handleRemoveToken(selectedTokens[selectedTokens.length - 1]);
    } else if (e.key === 'ArrowDown' && availableSuggestions.length > 0) {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % availableSuggestions.length);
    } else if (e.key === 'ArrowUp' && availableSuggestions.length > 0) {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + availableSuggestions.length) % availableSuggestions.length);
    } else if (e.key === 'Enter' && availableSuggestions.length > 0) {
      e.preventDefault();
      handleSelectToken(availableSuggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsFocused(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </label>
      )}
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          padding: '8px 12px',
          background: '#ffffff',
          borderRadius: '14px',
          border: isFocused ? '1.5px solid #34a853' : '1px solid #e2e8f0',
          boxShadow: isFocused ? '0 0 0 3px rgba(52, 168, 83, 0.12)' : '0 1px 2px rgba(0,0,0,0.02)',
          minHeight: '44px',
          alignItems: 'center',
          cursor: 'text',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {selectedTokens.map((token) => (
          <span
            key={token}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              background: '#f1f5f9',
              color: '#1e293b',
              borderRadius: '100px',
              fontSize: '0.78rem',
              fontWeight: 700
            }}
          >
            {token}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveToken(token);
              }}
              aria-label={`${token} entfernen`}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: '0',
                display: 'inline-flex',
                alignItems: 'center',
                color: '#64748b'
              }}
            >
              <X size={13} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsFocused(true);
          }}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTokens.length === 0 ? placeholder : ''}
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: '0.82rem',
            color: '#0f172a',
            flex: 1,
            minWidth: '120px',
            padding: '4px 0'
          }}
        />
      </div>

      {isFocused && availableSuggestions.length > 0 && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
            zIndex: 11000,
            maxHeight: '180px',
            overflowY: 'auto',
            padding: '6px'
          }}
        >
          {availableSuggestions.map((sug, idx) => (
            <div
              key={sug}
              role="option"
              aria-selected={idx === activeIndex}
              onClick={() => handleSelectToken(sug)}
              onMouseEnter={() => setActiveIndex(idx)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 650,
                cursor: 'pointer',
                background: idx === activeIndex ? '#f1f5f9' : 'transparent',
                color: idx === activeIndex ? '#0f172a' : '#334155',
                transition: 'background 0.15s ease'
              }}
            >
              {sug}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── COMPONENT INTERFACES ─────────────────────────────────────────────────────
export interface TeacherManagementModalProps {
  teacher: any;
  schoolName: string;
  schoolId?: string;
  activeTab?: 'campus' | 'groovelab' | 'admin' | string;
  students: any[];
  bands: any[];
  activeSubjectsList: string[];
  onClose: () => void;
  onSave: (updatedData: any) => Promise<void>;
  onDelete: (teacherId: string) => Promise<void>;
  onRevokeSessions: (teacherId: string) => Promise<void>;
  onOpenQrModal: (user: any) => void;
  downloadQRCode: () => void;
  generateStarterPin: (role: string, isCampus: boolean, isGroovelab: boolean) => string;
}

interface TeacherSecurityOverview {
  has_passkey: boolean;
  passkey_count: number;
  passkeys: Array<{
    id: string;
    device_name: string;
    created_at: string;
    counter?: number;
  }>;
  has_personal_pin: boolean;
  is_pin_activated: boolean;
  ausweis_nummer: string;
  last_seen: string | null;
  sessions_revoked_at: string | null;
}

export const TeacherManagementModal: React.FC<TeacherManagementModalProps> = ({
  teacher,
  schoolName,
  activeTab = 'campus',
  students,
  bands,
  activeSubjectsList,
  onClose,
  onSave,
  onDelete,
  onRevokeSessions,
  onOpenQrModal,
  downloadQRCode,
  generateStarterPin
}) => {
  // Active Tab: 'profile' | 'security' | 'contract'
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'security' | 'contract'>('profile');

  // Local form state
  const [formData, setFormData] = useState<any>({
    id: teacher.id,
    firstName: teacher.firstName || teacher.first_name || '',
    lastName: teacher.lastName || teacher.last_name || '',
    email: teacher.email || '',
    phone: teacher.phone || '',
    instrument: teacher.instrument || '',
    requiredEquipment: Array.isArray(teacher.requiredEquipment)
      ? teacher.requiredEquipment
      : Array.isArray(teacher.required_equipment)
      ? teacher.required_equipment
      : [],
    ausweisNummer: teacher.ausweisNummer || teacher.ausweis_nummer || '',
    isCampusActive: teacher.isCampusActive ?? teacher.is_campus_active ?? true,
    isGroovelabActive: teacher.isGroovelabActive ?? teacher.is_groovelab_active ?? false,
    isActive: teacher.isActive ?? teacher.is_active ?? true,
    role: teacher.role || 'teacher',
    contractEndsAt: teacher.contractEndsAt || teacher.contract_ends_at || null,
    teacherQrToken: teacher.teacherQrToken || teacher.teacher_qr_token || teacher.qr_token || ''
  });

  // Security Overview state
  const [securityOverview, setSecurityOverview] = useState<TeacherSecurityOverview | null>(null);
  const [loadingSecurity, setLoadingSecurity] = useState<boolean>(true);
  const [revokingPasskey, setRevokingPasskey] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [copiedPin, setCopiedPin] = useState<boolean>(false);
  const [copiedQrLink, setCopiedQrLink] = useState<boolean>(false);

  // Custom equipment tag input
  const [customEqInput, setCustomEqInput] = useState('');
  const [isAddingCustomEq, setIsAddingCustomEq] = useState(false);

  // Fetch security overview
  const fetchSecurityOverview = useCallback(async () => {
    if (!teacher.id || teacher.id.startsWith('NEW-')) {
      setLoadingSecurity(false);
      return;
    }
    try {
      setLoadingSecurity(true);
      const { data, error } = await supabase.rpc('get_teacher_security_overview', {
        p_teacher_id: teacher.id
      });
      if (error) throw error;
      if (data?.success) {
        setSecurityOverview(data as TeacherSecurityOverview);
      }
    } catch (err: any) {
      console.warn('[TeacherManagementModal] Security overview fetch fallback:', err.message);
    } finally {
      setLoadingSecurity(false);
    }
  }, [teacher.id]);

  useEffect(() => {
    fetchSecurityOverview();
  }, [fetchSecurityOverview]);

  // Close on Escape key (BFSG 2025 / WCAG 2.2 AA)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Derived KPI metrics
  const teacherStudentsCount = students.filter(
    (s: any) => s.teacher_id === teacher.id
  ).length || teacher.studentCount || 0;

  const teacherBandsCount = bands.filter(
    (b: any) =>
      b.coach_id === teacher.id &&
      b.name !== '__SYSTEM_ANNOUNCEMENTS__' &&
      b.genre !== 'System'
  ).length;

  const token = formData.teacherQrToken || formData.ausweisNummer || teacher.id || '';
  const qrLoginUrl = token.startsWith('http') ? token : `${window.location.origin}/qr/${token}`;

  // Revoke Passkeys handler
  const handleRevokePasskeys = async () => {
    const teacherName = `${formData.firstName} ${formData.lastName}`.trim() || 'diese Lehrkraft';
    if (!confirm(`Möchtest du alle biometrischen Passkeys von ${teacherName} widerrufen? Dadurch werden auch alle aktiven Sitzungen auf allen Geräten sofort beendet.`)) {
      return;
    }

    try {
      setRevokingPasskey(true);
      const { data, error } = await supabase.rpc('revoke_teacher_passkeys', {
        p_teacher_id: teacher.id
      });
      if (error) throw error;
      alert(`Erfolg: ${data?.message || 'Passkeys wurden erfolgreich widerrufen.'}`);
      await fetchSecurityOverview();
    } catch (err: any) {
      alert('Fehler beim Widerrufen der Passkeys: ' + err.message);
    } finally {
      setRevokingPasskey(false);
    }
  };

  // Send Passkey Invitation via mailto
  const handleSendPasskeyInvitation = () => {
    const teacherName = formData.firstName || 'Kollegin / Kollege';
    const emailRecipient = formData.email || '';
    const subject = encodeURIComponent(`Dein biometrischer Passkey-Zugang für ${schoolName || 'Campus-Groovelab'} 🍏`);
    const body = encodeURIComponent(
      `Hallo ${teacherName},\n\n` +
      `für noch mehr Sicherheit und sekundenschnelle Anmeldungen ohne Passwörter kannst du dein Profil jetzt mit einem biometrischen Passkey (Apple Touch ID, Face ID oder Windows Hello) verknüpfen.\n\n` +
      `So richtest du deinen Passkey in 30 Sekunden ein:\n` +
      `1. Öffne Campus-Groovelab auf deinem Smartphone, Tablet oder Laptop.\n` +
      `2. Melde dich wie gewohnt mit deinem Schulausweis / QR-Code oder deiner Support-PIN (${formData.ausweisNummer || 'siehe Ausweis'}) an.\n` +
      `3. Gehe in deine Einstellungen und tippe auf „Touch ID / Face ID als Passkey aktivieren“.\n\n` +
      `Datenschutz-Hinweis (Art. 9 DSGVO / Zero-Biometrie-Transfer):\n` +
      `Deine biometrischen Merkmale verbleiben zu 100 % in der isolierten Hardware deines Endgeräts. Der Schul-Server empfängt und speichert ausschließlich eine kryptografische Signatur.\n\n` +
      `Bei Fragen stehen wir dir im Sekretariat gerne zur Verfügung!\n\n` +
      `Herzliche Grüße,\n` +
      `${schoolName || 'Deine Musikschule'}`
    );
    window.location.href = `mailto:${emailRecipient}?subject=${subject}&body=${body}`;
  };

  // Regenerate Support-PIN
  const handleRegeneratePin = async () => {
    const newPin = generateStarterPin(formData.role, formData.isCampusActive, formData.isGroovelabActive);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          ausweis_nummer: newPin,
          is_pin_activated: false,
          personal_pin: null
        })
        .eq('id', teacher.id);
      if (error) throw error;
      setFormData({ ...formData, ausweisNummer: newPin });
      await fetchSecurityOverview();
      alert(`Neue Support-PIN ${newPin} erfolgreich generiert.`);
    } catch (err: any) {
      alert('Fehler beim Zurücksetzen: ' + err.message);
    }
  };

  // Handle Save
  const handleSubmit = async () => {
    try {
      setSaving(true);
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-teacher-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10500,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(24px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          background: '#ffffff',
          borderRadius: '28px',
          boxShadow: '0 24px 64px -12px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        }}
      >
        {/* ─── HEADER: APPLE HERO & SEGMENTED CONTROLS ─── */}
        <div
          style={{
            padding: '24px 32px 18px 32px',
            borderBottom: '1px solid #f1f5f9',
            background: 'linear-gradient(to bottom, #ffffff, #fcfcfd)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}
        >
          {/* Top Row: Avatar, Title, Close Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '58px',
                  height: '58px',
                  borderRadius: '20px',
                  background: activeTab === 'campus' ? '#e6f4ea' : '#fef3c7',
                  color: activeTab === 'campus' ? '#166534' : '#854d0e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 950,
                  fontSize: '1.25rem',
                  letterSpacing: '-0.02em',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                  border: '1px solid rgba(0,0,0,0.04)'
                }}
              >
                {(formData.firstName || 'L')?.[0]}{(formData.lastName || 'K')?.[0]}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2
                    id="manage-teacher-modal-title"
                    style={{
                      margin: 0,
                      fontSize: '1.35rem',
                      fontWeight: 950,
                      color: '#0f172a',
                      letterSpacing: '-0.02em'
                    }}
                  >
                    {formData.firstName || formData.lastName
                      ? `${formData.firstName} ${formData.lastName}`.trim()
                      : 'Neue Lehrkraft'}
                  </h2>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 900,
                      padding: '3px 10px',
                      borderRadius: '100px',
                      background: formData.isActive ? '#e6f4ea' : '#fee2e2',
                      color: formData.isActive ? '#166534' : '#991b1b',
                      letterSpacing: '0.02em'
                    }}
                  >
                    {formData.isActive ? 'AKTIV' : 'GESPERRT'}
                  </span>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                  Lehrkräfte-Kartei &bull; ID: #{teacher.id?.substring(0, 8)} &bull; {formData.instrument || 'Allgemein'}
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Modal schließen"
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e2e8f0';
                e.currentTarget.style.color = '#0f172a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Segmented Control: WAI-ARIA Tablist */}
          <div
            role="tablist"
            aria-label="Lehrkraft Navigation"
            style={{
              display: 'flex',
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: '16px',
              gap: '4px',
              width: 'fit-content'
            }}
          >
            {[
              { id: 'profile', label: 'Profil & Unterricht', icon: User },
              { id: 'security', label: 'Sicherheit & Passkey', icon: Shield },
              { id: 'contract', label: 'Vertrag & Berechtigungen', icon: Calendar }
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls={`panel-${tab.id}`}
                  type="button"
                  onClick={() => setActiveSubTab(tab.id as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 18px',
                    borderRadius: '12px',
                    border: 'none',
                    background: isSelected ? '#ffffff' : 'transparent',
                    color: isSelected ? '#0f172a' : '#64748b',
                    fontSize: '0.82rem',
                    fontWeight: isSelected ? 900 : 700,
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 0 2px #3b82f6';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = isSelected ? '0 2px 8px rgba(0,0,0,0.06)' : 'none';
                  }}
                >
                  <Icon size={16} style={{ color: isSelected ? '#0f172a' : '#64748b' }} />
                  {tab.label}
                  {tab.id === 'security' && securityOverview?.has_passkey && (
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: '#34a853'
                      }}
                      title="Passkey aktiv"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── BODY CONTENT AREA ─── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '28px 32px',
            background: '#fafbfc'
          }}
        >
          {/* TAB 1: PROFIL & UNTERRICHT */}
          {activeSubTab === 'profile' && (
            <div
              id="panel-profile"
              role="tabpanel"
              aria-labelledby="tab-profile"
              tabIndex={0}
              style={{ display: 'flex', flexDirection: 'column', gap: '24px', outline: 'none' }}
            >
              {/* KPI Cards: Schülerzahl & Gecoachte Bands */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div
                  style={{
                    background: '#f4fbf7',
                    border: '1px solid #d1fae5',
                    borderRadius: '20px',
                    padding: '18px 22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Schüleranzahl
                    </span>
                    <strong style={{ display: 'block', fontSize: '1.65rem', fontWeight: 950, color: '#0f172a', marginTop: '2px' }}>
                      {teacherStudentsCount}
                    </strong>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Aktive Campus-Schüler</span>
                  </div>
                  <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534' }}>
                    <GraduationCap size={24} />
                  </div>
                </div>

                <div
                  style={{
                    background: '#fefce8',
                    border: '1px solid #fef08a',
                    borderRadius: '20px',
                    padding: '18px 22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#854d0e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Gecoachte Bands
                    </span>
                    <strong style={{ display: 'block', fontSize: '1.65rem', fontWeight: 950, color: '#0f172a', marginTop: '2px' }}>
                      {teacherBandsCount}
                    </strong>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>GrooveLab Formationen</span>
                  </div>
                  <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: '#fef08a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#854d0e' }}>
                    <Disc3 size={24} />
                  </div>
                </div>
              </div>

              {/* Basis-Stammdaten: Vorname, Nachname, E-Mail, Telefon */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '20px',
                  padding: '24px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px'
                }}
              >
                <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Persönliche Stammdaten
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Vorname</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.86rem',
                        fontWeight: 650,
                        color: '#0f172a',
                        background: '#f8fafc',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#34a853'}
                      onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Nachname</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.86rem',
                        fontWeight: 650,
                        color: '#0f172a',
                        background: '#f8fafc',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#34a853'}
                      onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                    />
                  </div>
                </div>
              </div>

              {/* Fächer & Ausstattung */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '20px',
                  padding: '24px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px'
                }}
              >
                <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Unterrichtsfächer &amp; Benötigtes Equipment
                </h4>

                <AppleStyleTokenField
                  label="Instrumente &amp; Unterrichtsfächer"
                  selectedString={formData.instrument}
                  onChange={(val) => setFormData({ ...formData, instrument: val })}
                  suggestions={activeSubjectsList}
                  placeholder="Unterrichtsfächer auswählen..."
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Benötigte Ausstattung (Für Raumplanung &amp; Raum-Engine)
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {(() => {
                      const availableEquipment = ['Schlagzeug', 'Cajon', 'Bongos', 'Pauken', 'Klavier', 'E-Piano', 'Keyboard', 'Gitarrenverstärker', 'Bassverstärker', 'PA-Anlage', 'Mikrofone'];
                      const currentEq = Array.isArray(formData.requiredEquipment) ? formData.requiredEquipment : [];
                      const allTags = Array.from(new Set([...availableEquipment, ...currentEq]));

                      const handleAddCustomEq = () => {
                        const val = customEqInput.trim();
                        if (val && !currentEq.includes(val)) {
                          setFormData({
                            ...formData,
                            requiredEquipment: [...currentEq, val]
                          });
                        }
                        setIsAddingCustomEq(false);
                        setCustomEqInput('');
                      };

                      return (
                        <>
                          {allTags.map((tag) => {
                            const active = currentEq.includes(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => {
                                  const next = active
                                    ? currentEq.filter((t: string) => t !== tag)
                                    : [...currentEq, tag];
                                  setFormData({ ...formData, requiredEquipment: next });
                                }}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: '20px',
                                  border: `1.5px solid ${active ? '#34a853' : '#e2e8f0'}`,
                                  background: active ? '#e6f4ea' : '#ffffff',
                                  color: active ? '#166534' : '#475569',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                {active && '✓ '} {tag}
                              </button>
                            );
                          })}

                          {isAddingCustomEq ? (
                            <input
                              type="text"
                              autoFocus
                              placeholder="z. B. Mischpult"
                              value={customEqInput}
                              onChange={(e) => setCustomEqInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddCustomEq();
                                } else if (e.key === 'Escape') {
                                  setIsAddingCustomEq(false);
                                  setCustomEqInput('');
                                }
                              }}
                              onBlur={handleAddCustomEq}
                              style={{
                                padding: '5px 12px',
                                borderRadius: '20px',
                                border: '1.5px solid #34a853',
                                background: '#ffffff',
                                color: '#0f172a',
                                fontSize: '0.78rem',
                                outline: 'none',
                                width: '130px'
                              }}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingCustomEq(true);
                                setCustomEqInput('');
                              }}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '20px',
                                border: '1.5px dashed #cbd5e1',
                                background: 'transparent',
                                color: '#64748b',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              + Eigene
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SICHERHEIT & PASSKEY */}
          {activeSubTab === 'security' && (
            <div
              id="panel-security"
              role="tabpanel"
              aria-labelledby="tab-security"
              tabIndex={0}
              style={{ display: 'flex', flexDirection: 'column', gap: '24px', outline: 'none' }}
            >
              {/* BIOMETRISCHER PASSKEY (FIDO2 / WEBAUTHN) HERO CARD */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '24px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '16px',
                        background: securityOverview?.has_passkey ? '#e6f4ea' : '#fef3c7',
                        color: securityOverview?.has_passkey ? '#166534' : '#854d0e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Fingerprint size={26} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 950, color: '#0f172a' }}>
                          Biometrischer Passkey (Touch ID / Face ID)
                        </h4>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 900,
                            padding: '3px 9px',
                            borderRadius: '100px',
                            background: securityOverview?.has_passkey ? '#e6f4ea' : '#fef3c7',
                            color: securityOverview?.has_passkey ? '#166534' : '#854d0e'
                          }}
                        >
                          {securityOverview?.has_passkey ? 'PASSKEY AKTIV ✓' : 'KEIN PASSKEY'}
                        </span>
                      </div>
                      <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                        Hardwaregebundene FIDO2/WebAuthn Authentifizierung für passwortlose Logins
                      </p>
                    </div>
                  </div>

                  {/* Actions for Passkey */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={handleSendPasskeyInvitation}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '12px',
                        background: '#f1f5f9',
                        color: '#0f172a',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                    >
                      <Mail size={14} />
                      Passkey-Einladung senden
                    </button>

                    {securityOverview?.has_passkey && (
                      <button
                        type="button"
                        disabled={revokingPasskey}
                        onClick={handleRevokePasskeys}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '12px',
                          background: '#fee2e2',
                          color: '#991b1b',
                          border: '1px solid #fca5a5',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: revokingPasskey ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!revokingPasskey) e.currentTarget.style.background = '#fecaca';
                        }}
                        onMouseLeave={(e) => {
                          if (!revokingPasskey) e.currentTarget.style.background = '#fee2e2';
                        }}
                      >
                        <Trash2 size={14} />
                        Passkey widerrufen
                      </button>
                    )}
                  </div>
                </div>

                {/* Registered Devices List or Empty State */}
                {securityOverview?.has_passkey && securityOverview.passkeys.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                      Registrierte FIDO2 Authentifikatoren ({securityOverview.passkeys.length})
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                      {securityOverview.passkeys.map((pk) => (
                        <div
                          key={pk.id}
                          style={{
                            padding: '12px 16px',
                            borderRadius: '14px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Smartphone size={18} style={{ color: '#64748b' }} />
                            <div>
                              <strong style={{ display: 'block', fontSize: '0.82rem', color: '#0f172a' }}>
                                {pk.device_name}
                              </strong>
                              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                Eingerichtet am {new Date(pk.created_at).toLocaleDateString('de-DE')}
                              </span>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#166534', background: '#d1fae5', padding: '2px 8px', borderRadius: '100px' }}>
                            Verifiziert
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '14px 18px',
                      borderRadius: '14px',
                      background: '#f8fafc',
                      border: '1px dashed #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <Info size={18} style={{ color: '#64748b' }} />
                    <span style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.4 }}>
                      Diese Lehrkraft hat bisher noch keinen Passkey registriert. Sende der Lehrkraft per Klick auf <strong>„Passkey-Einladung senden“</strong> eine Anleitung für Apple Face/Touch ID.
                    </span>
                  </div>
                )}

                {/* Legal / GDPR Compliance Callout */}
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: '#f4fbf7',
                    border: '1px solid #d1fae5',
                    fontSize: '0.74rem',
                    color: '#166534',
                    lineHeight: 1.4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Shield size={16} style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Zero-Biometrie-Transfer (Art. 9 DSGVO):</strong> Biometrische Rohdaten (Fingerabdruck / Face ID) verbleiben zu 100 % in der isolierten Secure Enclave des Lehrergeräts. Auf dem Server werden ausschließlich asymmetrische Public Keys gespeichert.
                  </span>
                </div>
              </div>

              {/* SUPPORT-PIN / INITIAL-ZUGANG CARD */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '24px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 950, color: '#0f172a' }}>
                      Support-PIN (Initial-Aktivierungscode)
                    </h4>
                    <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                      Dient zur Erst-Aktivierung oder zum sicheren Notfall-Reset bei Kennwortverlust
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 900,
                      padding: '3px 10px',
                      borderRadius: '100px',
                      background: securityOverview?.is_pin_activated ? '#e6f4ea' : '#fffbeb',
                      color: securityOverview?.is_pin_activated ? '#166534' : '#854d0e',
                      border: `1px solid ${securityOverview?.is_pin_activated ? '#bbf7d0' : '#fde68a'}`
                    }}
                  >
                    {securityOverview?.is_pin_activated ? 'Persönliche PIN eingerichtet ✓' : 'Initial-Code aktiv'}
                  </span>
                </div>

                <div
                  style={{
                    padding: '16px 20px',
                    borderRadius: '16px',
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#854d0e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Aktuelle Ausweis-ID / Support-PIN
                    </span>
                    <strong style={{ display: 'block', fontSize: '1.45rem', fontFamily: 'monospace', color: '#b45309', letterSpacing: '0.08em', marginTop: '2px' }}>
                      {formData.ausweisNummer || 'Keine PIN'}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={async () => {
                        navigator.clipboard.writeText(formData.ausweisNummer);
                        setCopiedPin(true);
                        setTimeout(() => setCopiedPin(false), 2000);
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: '1px solid #fcd34d',
                        color: '#b45309',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {copiedPin ? <Check size={14} /> : <Copy size={14} />}
                      {copiedPin ? 'Kopiert!' : 'PIN kopieren'}
                    </button>

                    <button
                      type="button"
                      onClick={handleRegeneratePin}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '10px',
                        background: '#b45309',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <RefreshCw size={14} />
                      Neu generieren
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4 }}>
                  <strong>OWASP ASVS L3 Vertraulichkeit:</strong> Die selbst gesetzte persönliche PIN der Lehrkraft wird serverseitig sicher gehasht und ist für Schuladministratoren und das Sekretariat zu keinem Zeitpunkt im Klartext sichtbar (Zero-Secret-Leakage).
                </div>
              </div>

              {/* SITZUNGEN & AUSWEIS QR-CODE GRID */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Sitzungs-Verwaltung */}
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    padding: '20px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px'
                  }}
                >
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ShieldAlert size={16} style={{ color: '#dc2626' }} />
                      Sitzungen &amp; Geräte-Sicherheit
                    </h5>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: '#64748b' }}>
                      Beendet alle aktiven Browser- und App-Logins dieses Lehrers auf allen Geräten sofort.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      const teacherName = `${formData.firstName} ${formData.lastName}`.trim() || 'diese Lehrkraft';
                      if (confirm(`Möchtest du alle aktiven Sitzungen von ${teacherName} auf allen Geräten sofort beenden? (Z. B. bei Geräteverlust oder Personalwechsel)`)) {
                        try {
                          const { error } = await supabase.rpc('revoke_user_sessions', { p_user_id: teacher.id });
                          if (error) throw error;
                          alert(`Erfolg: Alle aktiven Sitzungen von ${teacherName} wurden sofort beendet.`);
                          await fetchSecurityOverview();
                        } catch (err: any) {
                          alert('Fehler beim Widerrufen: ' + err.message);
                        }
                      }
                    }}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '12px',
                      background: '#ffffff',
                      color: '#dc2626',
                      border: '1.5px solid #fca5a5',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                  >
                    <ShieldAlert size={15} />
                    Alle Sitzungen sofort widerrufen
                  </button>
                </div>

                {/* Login- & Ausweis QR-Code Card */}
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    padding: '20px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                  }}
                >
                  <div
                    style={{
                      background: '#ffffff',
                      padding: '10px',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.04)',
                      display: 'inline-flex'
                    }}
                  >
                    <QRCode id="qr-code-svg" value={qrLoginUrl} size={84} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#0f172a' }}>
                      Login- &amp; Ausweis QR-Code
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenQrModal(formData)}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '10px',
                        background: '#34a853',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      📇 Ausweis drucken (PDF)
                    </button>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={downloadQRCode}
                        style={{
                          flex: 1,
                          padding: '6px',
                          borderRadius: '8px',
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#475569',
                          cursor: 'pointer'
                        }}
                      >
                        SVG QR
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(qrLoginUrl);
                          setCopiedQrLink(true);
                          setTimeout(() => setCopiedQrLink(false), 2000);
                        }}
                        style={{
                          flex: 1,
                          padding: '6px',
                          borderRadius: '8px',
                          background: copiedQrLink ? '#e6f4ea' : '#f8fafc',
                          border: `1px solid ${copiedQrLink ? '#34a853' : '#cbd5e1'}`,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: copiedQrLink ? '#166534' : '#475569',
                          cursor: 'pointer'
                        }}
                      >
                        {copiedQrLink ? '✓ Kopiert' : 'Link'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VERTRAG & BERECHTIGUNGEN */}
          {activeSubTab === 'contract' && (
            <div
              id="panel-contract"
              role="tabpanel"
              aria-labelledby="tab-contract"
              tabIndex={0}
              style={{ display: 'flex', flexDirection: 'column', gap: '24px', outline: 'none' }}
            >
              {/* Befristung & Vertragsende */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '20px',
                  padding: '24px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Vertragslaufzeit &amp; Speicherbegrenzung (Art. 5 DSGVO)
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                      Vertragsende (Zugriff erlischt automatisch)
                    </label>
                    <input
                      type="date"
                      value={formData.contractEndsAt ? new Date(formData.contractEndsAt).toISOString().split('T')[0] : ''}
                      onChange={(e) => setFormData({ ...formData, contractEndsAt: e.target.value || null })}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.86rem',
                        fontWeight: 650,
                        color: '#0f172a',
                        background: '#f8fafc',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#34a853'}
                      onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                    />
                  </div>

                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '14px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.75rem',
                      color: '#64748b',
                      lineHeight: 1.4
                    }}
                  >
                    Nach Ablauf des Vertragsendes wird der Account im Einklang mit dem Grundsatz der Speicherbegrenzung (Art. 5 Abs. 1 lit. e DSGVO) automatisch deaktiviert.
                  </div>
                </div>
              </div>

              {/* Modulberechtigungen & Schalter */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '20px',
                  padding: '24px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Plattform-Modulberechtigungen &amp; Status
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Campus Modul Toggle */}
                  <label
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#f8fafc',
                      padding: '14px 18px',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <GraduationCap size={20} style={{ color: '#34a853' }} />
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.86rem', color: '#0f172a' }}>Campus-Modul</strong>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Schülerverwaltung, Hausaufgabenheft, Termine &amp; Stundenplan</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.isCampusActive}
                      onChange={(e) => setFormData({ ...formData, isCampusActive: e.target.checked })}
                      style={{ width: '20px', height: '20px', accentColor: '#34a853', cursor: 'pointer' }}
                    />
                  </label>

                  {/* GrooveLab Modul Toggle */}
                  <label
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#f8fafc',
                      padding: '14px 18px',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Music size={20} style={{ color: '#eab308' }} />
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.86rem', color: '#0f172a' }}>GrooveLab-Modul</strong>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Band-Coaching, Songverwaltung, Repertoire &amp; Live Lab</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.isGroovelabActive}
                      onChange={(e) => setFormData({ ...formData, isGroovelabActive: e.target.checked })}
                      style={{ width: '20px', height: '20px', accentColor: '#eab308', cursor: 'pointer' }}
                    />
                  </label>

                  {/* Account Aktiv Toggle */}
                  <label
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#f8fafc',
                      padding: '14px 18px',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Shield size={20} style={{ color: '#3b82f6' }} />
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.86rem', color: '#0f172a' }}>Account Status (Aktiviert)</strong>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Hauptschalter für den gesamten Schulzugang dieser Lehrkraft</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      style={{ width: '20px', height: '20px', accentColor: '#3b82f6', cursor: 'pointer' }}
                    />
                  </label>
                </div>
              </div>

              {/* Gefahrenzone */}
              <div
                style={{
                  padding: '20px 24px',
                  borderRadius: '20px',
                  border: '1.5px solid #fee2e2',
                  background: '#fef2f2',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <strong style={{ display: 'block', fontSize: '0.86rem', color: '#991b1b', fontWeight: 900 }}>
                    Gefahrenzone: Lehrkraft permanent entfernen
                  </strong>
                  <span style={{ fontSize: '0.74rem', color: '#b91c1c' }}>
                    Löscht das Profil unwiderruflich aus der Datenbank unter Wahrung gesetzlicher Aufbewahrungsfristen.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    const teacherName = `${formData.firstName} ${formData.lastName}`.trim() || 'diese Lehrkraft';
                    if (confirm(`Diesen Mitarbeiter (${teacherName}) wirklich unwiderruflich löschen?`)) {
                      await onDelete(teacher.id);
                      onClose();
                    }
                  }}
                  style={{
                    background: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '12px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.2)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
                >
                  Permanent löschen
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── FOOTER ACTIONS ─── */}
        <div
          style={{
            padding: '18px 32px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '12px',
            background: '#ffffff'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: '14px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '0.82rem',
              fontWeight: 750,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
          >
            Abbrechen
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSubmit}
            style={{
              padding: '10px 24px',
              borderRadius: '14px',
              border: 'none',
              background: '#34a853',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 850,
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(52, 168, 83, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (!saving) e.currentTarget.style.background = '#2d9247';
            }}
            onMouseLeave={(e) => {
              if (!saving) e.currentTarget.style.background = '#34a853';
            }}
          >
            {saving ? 'Wird gespeichert...' : 'Änderungen speichern'}
          </button>
        </div>
      </div>
    </div>
  );
};
