import React, { useState } from 'react';
import { Award, Copy, Check, QrCode, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { invalidateBiometricProfile } from '../../../../utils/webauthn';
import { StudentPinResetModal } from '../../../StudentPinResetModal';

export interface StudentAccessSectionProps {
  student: any;
  mode: 'admin' | 'teacher';
  activeColor?: string;
  isGroove?: boolean;
  avatarSrc: string;
  localQrToken?: string;
  onOpenQrOverlay?: () => void;
}

export const StudentAccessSection: React.FC<StudentAccessSectionProps> = ({
  student,
  mode,
  activeColor = '#34a853',
  isGroove = false,
  avatarSrc,
  localQrToken,
  onOpenQrOverlay
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [showPinResetModal, setShowPinResetModal] = useState(false);
  const [isResettingPin, setIsResettingPin] = useState(false);
  const [revokingSessions, setRevokingSessions] = useState(false);

  // ── Rechtskonforme Einmaltoken-Generierung (DSGVO Art. 25 & 32) ──────────
  // Der permanente qr_token des Schülers darf NIEMALS in einer URL erscheinen.
  // Stattdessen wird ein serverseitiger Einmaltoken (30 Tage, single-use) generiert.
  const handleCopyPwaLink = async () => {
    const targetPlatform = isGroove ? 'groovelab' : 'campus';
    try {
      setGeneratingLink(true);
      const { data, error } = await supabase.rpc('generate_student_onboarding_token', {
        p_student_user_id: student.id
      });
      if (error || !data?.success || !data?.token) {
        throw new Error(error?.message || 'Token konnte nicht generiert werden.');
      }
      const link = `${window.location.origin}/onboarding/${data.token}?platform=${targetPlatform}`;
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err: any) {
      console.error('[Onboarding] Einmaltoken-Generierung fehlgeschlagen:', err);
      alert('Fehler: ' + (err.message || 'Link konnte nicht erstellt werden.'));
    } finally {
      setGeneratingLink(false);
    }
  };


  const cardBg = isGroove
    ? 'linear-gradient(135deg, #fefce8 0%, #ffffff 100%)'
    : 'linear-gradient(135deg, #e6f4ea 0%, #ffffff 100%)';

  const borderColor = isGroove
    ? 'rgba(234, 179, 8, 0.3)'
    : 'rgba(52, 168, 83, 0.3)';

  const titleColor = isGroove ? '#ca8a04' : '#34a853';
  const badgeText = isGroove ? 'GrooveLab' : 'Campus';
  const badgeBg = isGroove ? '#eab308' : '#34a853';
  const passTitle = isGroove ? 'GrooveLab Member Pass' : 'Campus Pass';
  const passSubtitle = isGroove
    ? 'Musiker-Avatar • GrooveLab PWA Link'
    : 'Instrument-Avatar • Campus PWA Link';


  const handleResetStudentPin = async () => {
    try {
      setIsResettingPin(true);
      // 1. Try atomic RPC first
      let rpcOk = false;
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('request_student_pin_reset', {
          p_student_id: student.id
        });
        if (!rpcErr && rpcRes?.success) {
          rpcOk = true;
        }
      } catch (e) {
        console.warn('request_student_pin_reset RPC notice:', e);
      }

      // 2. Fallback updates if RPC is not deployed yet
      if (!rpcOk) {
        const userResetPayload: any = { 
          onboarding_pin: null, 
          personal_pin: null,
          parent_pin: null,
          is_pin_activated: false,
          status: 'offen'
        };
        try {
          await supabase.from('users').update(userResetPayload).eq('id', student.id);
        } catch (e) {}
        const { error: userResetErr } = await supabase.from('users').update(userResetPayload).eq('id', student.id);
        if (userResetErr && userResetErr.message?.includes('onboarding_pin')) {
          delete userResetPayload.onboarding_pin;
          await supabase.from('users').update(userResetPayload).eq('id', student.id);
        }
        await supabase.from('students').update({ onboarding_pin: null, is_pin_activated: false, status: 'offen' }).eq('id', student.id);
        await supabase.from('pending_students').update({ is_pin_activated: false, status: 'offen' }).eq('id', student.id);
      }

      // Invalidate any local biometric credentials for this student
      invalidateBiometricProfile(student.id);

      // Open instant link share panel
      setShowPinResetModal(true);
    } catch (err: any) {
      console.error('Fehler beim Zurücksetzen der PIN:', err);
      alert('Fehler beim Zurücksetzen der PIN: ' + err.message);
    } finally {
      setIsResettingPin(false);
    }
  };

  const handleRevokeStudentSession = async () => {
    const studentDisplayName = student.first_name || student.name || 'dieses Schülers';
    if (!window.confirm(`Möchtest du alle aktiven Sitzungen für ${studentDisplayName} auf allen Geräten sofort beenden? (Z. B. bei Verlust eines Smartphones oder Tablets)`)) {
      return;
    }
    try {
      setRevokingSessions(true);
      const { error } = await supabase.rpc('revoke_user_sessions', { p_user_id: student.id });
      if (error) throw error;
      alert(`Erfolg: Alle aktiven Anmeldungen für ${studentDisplayName} wurden mit sofortiger Wirkung beendet.`);
    } catch (err: any) {
      alert('Fehler beim Widerrufen der Sitzungen: ' + err.message);
    } finally {
      setRevokingSessions(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Ausweis & Pass Card */}
      <section
        style={{
          background: cardBg,
          borderRadius: '24px',
          padding: '22px',
          border: `1.5px solid ${borderColor}`,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h4
            style={{
              fontSize: '0.95rem',
              fontWeight: 900,
              color: titleColor,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Award size={20} /> Ausweis &amp; App-Zugang
          </h4>
          <span
            style={{
              background: badgeBg,
              color: 'white',
              padding: '3px 10px',
              borderRadius: '12px',
              fontSize: '0.7rem',
              fontWeight: 800
            }}
          >
            {badgeText}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            background: '#ffffff',
            padding: '12px 16px',
            borderRadius: '18px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}
        >
          <img
            src={avatarSrc}
            alt="Pass Avatar"
            onError={(e: any) => { e.target.src = '/avatars/gitarre_avatar_new.png'; }}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              objectFit: 'cover',
              border: isGroove ? '2px solid #eab308' : '2px solid #34a853'
            }}
          />
          <div>
            <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#1e293b' }}>
              {passTitle}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, marginTop: '1px' }}>
              {passSubtitle}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={handleCopyPwaLink}
            style={{
              flex: 1,
              background: copiedLink ? '#e6f4ea' : badgeBg,
              color: copiedLink ? '#15803d' : '#ffffff',
              border: 'none',
              borderRadius: '14px',
              padding: '12px 14px',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
            className="hover-scale"
          >
            {copiedLink ? <Check size={15} /> : <Copy size={15} />}
            <span>{copiedLink ? 'Link kopiert! ✓' : `${badgeText} PWA Link`}</span>
          </button>

          {onOpenQrOverlay && (
            <button
              type="button"
              onClick={onOpenQrOverlay}
              style={{
                flex: 1,
                background: '#ffffff',
                color: isGroove ? '#ca8a04' : '#34a853',
                border: `1.5px solid ${isGroove ? '#eab308' : '#34a853'}`,
                borderRadius: '14px',
                padding: '12px 14px',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s'
              }}
              className="hover-scale"
            >
              <QrCode size={15} />
              <span>Ausweis-QR zeigen</span>
            </button>
          )}
        </div>
      </section>

      {/* Face-to-Face PIN-Reset & Soforthilfe */}
      <section
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '22px',
          border: '1.5px solid #f1f5f9',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h4
              style={{
                fontSize: '0.92rem',
                fontWeight: 900,
                color: '#1e293b',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <RefreshCw size={17} style={{ color: '#ef4444' }} />
              {mode === 'teacher' ? 'Face-to-Face Schüler-PIN-Hilfe' : 'Notfall-PIN-Reset'}
            </h4>
            <p style={{ fontSize: '0.74rem', color: '#64748b', margin: '3px 0 0 0', fontWeight: 600 }}>
              {mode === 'teacher'
                ? 'Hat der Schüler seine PIN vergessen? Du kannst den Zugang im Unterricht direkt freischalten.'
                : 'Setzt den Zugangs-Status auf offen zurück und generiert einen neuen Sofort-Vergabe-Link.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetStudentPin}
          disabled={isResettingPin}
          style={{
            width: '100%',
            background: '#fee2e2',
            color: '#dc2626',
            border: '1.5px solid #fca5a5',
            borderRadius: '14px',
            padding: '12px 16px',
            fontSize: '0.82rem',
            fontWeight: 850,
            cursor: isResettingPin ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.15s'
          }}
          className="hover-scale"
        >
          <RefreshCw size={15} className={isResettingPin ? 'animate-spin' : ''} />
          <span>{isResettingPin ? 'Wird zurückgesetzt...' : '🔑 PIN für Schüler sofort zurücksetzen'}</span>
        </button>

        {/* Administrative Session Kill (Art. 32 DSGVO) */}
        {mode === 'admin' && (
          <div style={{ marginTop: '6px', paddingTop: '14px', borderTop: '1px dashed #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldAlert size={14} color="#dc2626" />
                  Sitzungen widerrufen (Session-Kill)
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                  Meldet den Schüler auf allen Smartphones und Tablets sofort ab (z. B. bei Geräteverlust).
                </div>
              </div>
              <button
                type="button"
                onClick={handleRevokeStudentSession}
                disabled={revokingSessions}
                style={{
                  background: '#ffffff',
                  color: '#dc2626',
                  border: '1.5px solid #fca5a5',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: revokingSessions ? 'wait' : 'pointer',
                  flexShrink: 0
                }}
                className="hover-scale-mini"
              >
                {revokingSessions ? 'Beende...' : 'Alle Sitzungen beenden'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* PIN Reset Share Modal */}
      {showPinResetModal && (
        <StudentPinResetModal
          student={student}
          onClose={() => setShowPinResetModal(false)}
        />
      )}
    </div>
  );
};
