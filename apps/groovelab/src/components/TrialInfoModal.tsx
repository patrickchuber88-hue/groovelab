import React from 'react';
import { Clock, ShieldCheck, CheckCircle2, ArrowRight, X, Sparkles, AlertTriangle } from 'lucide-react';
import { LEGAL_MASTER_WORDING } from '../constants/legalMasterWording';

interface TrialInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: any;
  userRole?: string;
  trialDaysLeft: number | null;
  onNavigateToBilling?: () => void;
}

export const TrialInfoModal: React.FC<TrialInfoModalProps> = ({
  isOpen,
  onClose,
  school,
  userRole = 'teacher',
  trialDaysLeft,
  onNavigateToBilling
}) => {
  if (!isOpen) return null;

  const isAdminOrSecretary = userRole === 'admin' || userRole === 'secretary';
  const isTeacher = userRole === 'teacher';

  const trialEndDateStr = school?.trial_ends_at
    ? new Date(school.trial_ends_at).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
    : null;

  const isExpired = trialDaysLeft !== null && trialDaysLeft <= 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100005,
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          maxWidth: '520px',
          width: '100%',
          padding: '28px 32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          position: 'relative'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Schließen"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b',
            transition: 'all 0.15s'
          }}
        >
          <X size={16} />
        </button>

        {/* Header with Icon & School */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '16px',
              background: isExpired ? '#fee2e2' : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              border: `1px solid ${isExpired ? '#fca5a5' : '#fde68a'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {isExpired ? (
              <AlertTriangle size={24} color="#dc2626" />
            ) : (
              <Clock size={24} color="#b45309" />
            )}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
              30-Tage Probezeit
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
              {school?.name || 'Ihre Musikschule'}
            </p>
          </div>
        </div>

        {/* Status Metrics Banner */}
        <div
          style={{
            background: isExpired ? '#fef2f2' : '#fffbeb',
            border: `1px solid ${isExpired ? '#fecaca' : '#fde68a'}`,
            borderRadius: '16px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', color: isExpired ? '#dc2626' : '#b45309', display: 'block' }}>
              Status
            </span>
            <strong style={{ fontSize: '1.05rem', fontWeight: 900, color: isExpired ? '#991b1b' : '#92400e' }}>
              {isExpired
                ? 'Probezeit abgelaufen'
                : trialDaysLeft !== null
                ? `${trialDaysLeft} ${trialDaysLeft === 1 ? 'Tag verbleibend' : 'Tage verbleibend'}`
                : 'Pilotphase aktiv'}
            </strong>
          </div>
          {trialEndDateStr && (
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', color: '#64748b', display: 'block' }}>
                Gültig bis
              </span>
              <strong style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155' }}>
                {trialEndDateStr}
              </strong>
            </div>
          )}
        </div>

        {/* Included Modules Checklist */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            In Ihrer Testphase enthalten
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <CheckCircle2 size={15} color="#34a853" />
                <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>Modul Campus</strong>
              </div>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', lineHeight: 1.35 }}>
                Stundenplan, Hausaufgaben, Protokolle &amp; Loopstation
              </p>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <CheckCircle2 size={15} color="#eab308" />
                <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>Modul GrooveLab</strong>
              </div>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', lineHeight: 1.35 }}>
                Bands, Songs, Repertoire &amp; Live Lab
              </p>
            </div>
          </div>
        </div>

        {/* Role Specific Explanations */}
        {isAdminOrSecretary ? (
          <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '14px 16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <ShieldCheck size={18} color="#34a853" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ fontSize: '0.82rem', color: '#0f172a', display: 'block' }}>
                  {LEGAL_MASTER_WORDING.softwareProvisioning.slogan}
                </strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.76rem', color: '#64748b', lineHeight: 1.45 }}>
                  Software-Bereitstellung: {LEGAL_MASTER_WORDING.softwareProvisioning.priceText}. {LEGAL_MASTER_WORDING.softwareProvisioning.noLicenseFeeDisclaimer} Sie können Ihre Zahlungsdaten jederzeit im Administrationsbereich hinterlegen, um nach Ablauf der 30 Tage nahtlos fortzufahren.
                </p>
              </div>
            </div>
          </div>
        ) : isTeacher ? (
          <div style={{ background: '#f0fdf4', borderRadius: '14px', padding: '14px 16px', border: '1px solid #bbf7d0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <Sparkles size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ fontSize: '0.82rem', color: '#14532d', display: 'block' }}>
                  Hinweis für Lehrkräfte
                </strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.76rem', color: '#166534', lineHeight: 1.45 }}>
                  Ihre Musikschule befindet sich im kostenfreien 30-Tage-Pilotbetrieb. Alle von Ihnen erstellten Stundenpläne, Hausaufgaben, Notizen und Audio-Aufnahmen bleiben dauerhaft erhalten.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Footer Actions */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
          {isAdminOrSecretary && onNavigateToBilling ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToBilling();
              }}
              style={{
                flex: 1,
                padding: '14px 20px',
                borderRadius: '14px',
                background: '#ea4335',
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(234, 67, 53, 0.25)',
                transition: 'all 0.15s'
              }}
            >
              <span>Abonnement &amp; Abrechnung verwalten</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '14px 20px',
                borderRadius: '14px',
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              Verstanden
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
