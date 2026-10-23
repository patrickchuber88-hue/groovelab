import React, { useState, useEffect } from 'react';
import {
  X, CheckCircle2, FileText, Sparkles, Eye, EyeOff, Calendar,
  CreditCard, RotateCcw, Contact, ShieldCheck
} from 'lucide-react';
import { OPERATOR_BANKING_CONFIG } from '../../../config/operatorBanking';
import type { PendingUser } from '../MasterAdminTypes';

export interface StudentAnnualRateBreakdown {
  gross: number;
  net: number;
  vat: number;
  currencySymbol: '€' | 'CHF';
  formattedGross: string;
}

export interface B2CStudentSubscriptionInspectorProps {
  inspectedUser: PendingUser;
  schoolName: string;
  referenceCode: string;
  rate: StudentAnnualRateBreakdown;
  effectiveTaxMode: 'small_business' | 'standard_vat';
  activating: boolean;
  savingNote: boolean;
  noteValue: string;
  onNoteChange: (note: string) => void;
  onSaveNote: () => Promise<void>;
  onActivatePaid: () => Promise<void>;
  onGrantCourtesyMonths: (months: number) => Promise<void>;
  onSetHardshipExempt: () => Promise<void>;
  onRevokeSubscription: () => Promise<void>;
  onDownloadReceipt: (includeFullName: boolean) => void;
  onRevealFullNameAudit: (studentId: string) => Promise<string | null>;
  onClose: () => void;
}

export function formatMaskedStudentDisplayName(u: PendingUser): string {
  const first = (u.first_name || '').trim();
  const last = (u.last_name || '').trim();
  if (first && last) {
    const initial = last.endsWith('.') ? last : `${last.slice(0, 1).toUpperCase()}.`;
    return `${first} ${initial}`;
  }
  if (first) return first;
  return (u.name || 'Schülerprofil').trim();
}

export function getCanonicalSchoolYearEndLabel(contractEndsAt?: string | null): string {
  if (contractEndsAt) {
    const parsed = new Date(contractEndsAt);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  }
  const now = new Date();
  const endYear = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
  return `31.08.${endYear}`;
}

export const B2CStudentSubscriptionInspector: React.FC<B2CStudentSubscriptionInspectorProps> = ({
  inspectedUser,
  schoolName,
  referenceCode,
  rate,
  effectiveTaxMode,
  activating,
  savingNote,
  noteValue,
  onNoteChange,
  onSaveNote,
  onActivatePaid,
  onGrantCourtesyMonths,
  onSetHardshipExempt,
  onRevokeSubscription,
  onDownloadReceipt,
  onRevealFullNameAudit,
  onClose
}) => {
  const [revealedFullName, setRevealedFullName] = useState<string | null>(null);
  const [revealingName, setRevealingName] = useState(false);

  useEffect(() => {
    setRevealedFullName(null);
  }, [inspectedUser.id]);

  const isExempt = Boolean(inspectedUser.is_hardship_exempt || inspectedUser.exempt_from_direct_billing);
  const isPaid = Boolean(inspectedUser.is_campus_active || inspectedUser.student_billing_cash_paid || isExempt);
  const maskedName = formatMaskedStudentDisplayName(inspectedUser);
  const ausweisLabel = inspectedUser.ausweis_nummer || `ID-${inspectedUser.id.slice(0, 6).toUpperCase()}`;
  const validUntilStr = getCanonicalSchoolYearEndLabel(inspectedUser.contract_ends_at);
  const courtesyMonths = Number(inspectedUser.b2c_courtesy_months || 0);

  const handleToggleFullName = async () => {
    if (revealedFullName) {
      setRevealedFullName(null);
      return;
    }
    setRevealingName(true);
    try {
      const full = await onRevealFullNameAudit(inspectedUser.id);
      if (full) {
        setRevealedFullName(full);
      } else {
        const fallback = `${inspectedUser.first_name || ''} ${inspectedUser.last_name || ''}`.trim();
        setRevealedFullName(fallback || maskedName);
      }
    } finally {
      setRevealingName(false);
    }
  };

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '24px',
      border: '1px solid rgba(15, 23, 42, 0.1)',
      boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
      padding: '24px',
      position: 'sticky',
      top: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px'
    }}>
      {/* 1. Inspector Header & Progressive Privacy Disclosure */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#047857',
              background: '#ecfdf5',
              padding: '3px 8px',
              borderRadius: '6px'
            }}>
              B2C Vertrags- &amp; Profil-Inspektor
            </span>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              color: '#334155',
              background: '#f1f5f9',
              padding: '3px 8px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Contact size={11} />
              <span>Ausweis: {ausweisLabel}</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 900, color: '#0f172a' }}>
              {revealedFullName || maskedName}
            </h3>
            <button
              type="button"
              onClick={handleToggleFullName}
              disabled={revealingName}
              aria-label={revealedFullName ? 'Nachnamen wieder maskieren' : 'Vollständigen Nachnamen für Zahlungsabgleich einblenden'}
              title="Progressive Privacy Disclosure (Art. 5 & 25 DSGVO): Vollständigen Nachnamen für Bankabgleich einblenden (wird im Audit-Trail protokolliert)"
              style={{
                padding: '4px 8px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: revealedFullName ? '#fef3c7' : '#f8fafc',
                color: revealedFullName ? '#92400e' : '#334155',
                fontSize: '0.70rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {revealedFullName ? <EyeOff size={12} /> : <Eye size={12} />}
              <span>{revealingName ? 'Prüfe...' : revealedFullName ? 'Maskieren' : 'Klarname (Audit)'}</span>
            </button>
          </div>

          <div style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600, marginTop: '3px' }}>
            {schoolName} {inspectedUser.instrument ? `• ${inspectedUser.instrument}` : ''}
          </div>
          <div style={{ fontSize: '0.70rem', color: '#475569', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={12} color="#059669" />
            <span>Vertragspartner: Erziehungsberechtigte (Elternbereich BGB Vertrag zugunsten Dritter)</span>
          </div>
        </div>

        <button
          type="button"
          aria-label="Inspektor schließen"
          onClick={onClose}
          style={{
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '44px',
            height: '44px',
            minWidth: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#334155'
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* 2. Payment Reference & GoBD Financial Box */}
      <div style={{
        background: '#f8fafc',
        borderRadius: '16px',
        padding: '14px 16px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 700 }}>Kassenzeichen (Verwendungszweck):</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.84rem', color: '#0f172a', background: '#e2e8f0', padding: '2px 8px', borderRadius: '6px' }}>
            {referenceCode}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 700 }}>Vertragslaufzeit / Gültig bis:</span>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={12} color="#059669" />
            <span>{validUntilStr}</span>
            {courtesyMonths > 0 && (
              <span style={{ background: '#dcfce7', color: '#047857', padding: '1px 6px', borderRadius: '6px', fontSize: '0.68rem' }}>
                +{courtesyMonths}M Kulanz
              </span>
            )}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 700 }}>Empfänger-IBAN:</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.74rem', color: '#334155' }}>
            {OPERATOR_BANKING_CONFIG.ibanFormatted}
          </span>
        </div>
        <div style={{ height: '1px', background: '#e2e8f0', margin: '2px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: '#475569' }}>
          <span>Netto (11 Schulmonate, 12. Monat frei):</span>
          <strong>{isExempt ? '0,00' : rate.net.toFixed(2).replace('.', ',')} {rate.currencySymbol}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: '#475569' }}>
          <span>
            {effectiveTaxMode === 'small_business' || rate.currencySymbol === 'CHF'
              ? 'Umsatzsteuer (§ 19 UStG / 0%):'
              : 'Umsatzsteuer (19% MwSt.):'}
          </span>
          <strong>{isExempt ? '0,00' : rate.vat.toFixed(2).replace('.', ',')} {rate.currencySymbol}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 900, color: '#0f172a', paddingTop: '4px', borderTop: '1px dashed #cbd5e1' }}>
          <span>Jahresbeitrag (UStDV Kleinbetrag):</span>
          <span style={{ color: '#047857' }}>
            {isExempt ? `0,00 ${rate.currencySymbol} (Befreit)` : rate.formattedGross}
          </span>
        </div>
      </div>

      {/* 3. Courtesy & Defect Remedy Engine (BGB Mängelabhilfe - Probemonate / Folgejahr) */}
      <div style={{
        background: '#f0fdf4',
        borderRadius: '14px',
        padding: '12px 14px',
        border: 'none'
      }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#065f46', textTransform: 'uppercase', marginBottom: '6px' }}>
          Mängelabhilfe &amp; Kulanz-Gutschrift (BGB Mängelabhilfe)
        </div>
        <div style={{ fontSize: '0.73rem', color: '#047857', marginBottom: '8px' }}>
          Probemonate für das laufende oder folgende Schuljahr kostenfrei gutschreiben:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '6px' }}>
          <button
            type="button"
            disabled={activating}
            onClick={() => onGrantCourtesyMonths(1)}
            style={{
              padding: '7px 8px',
              borderRadius: '9px',
              background: '#ffffff',
              border: '1px solid #86efac',
              color: '#065f46',
              fontWeight: 800,
              fontSize: '0.72rem',
              cursor: 'pointer'
            }}
          >
            +1 Probemonat
          </button>
          <button
            type="button"
            disabled={activating}
            onClick={() => onGrantCourtesyMonths(3)}
            style={{
              padding: '7px 8px',
              borderRadius: '9px',
              background: '#ffffff',
              border: '1px solid #86efac',
              color: '#065f46',
              fontWeight: 800,
              fontSize: '0.72rem',
              cursor: 'pointer'
            }}
          >
            +3 Probemonate
          </button>
          <button
            type="button"
            disabled={activating}
            onClick={() => onGrantCourtesyMonths(12)}
            style={{
              padding: '7px 8px',
              borderRadius: '9px',
              background: '#059669',
              border: 'none',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.72rem',
              cursor: 'pointer'
            }}
          >
            Folgejahr frei (+12M)
          </button>
        </div>
      </div>

      {/* 4. Operator Notes */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label
            htmlFor={`b2c-operator-note-${inspectedUser.id}`}
            style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}
          >
            Revisionssichere Betreiber-Notiz (Support / Bankabgleich)
          </label>
          <button
            type="button"
            onClick={onSaveNote}
            disabled={savingNote}
            style={{
              padding: '4px 10px',
              borderRadius: '8px',
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.70rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            {savingNote ? 'Speichert...' : 'Notiz speichern'}
          </button>
        </div>
        <textarea
          id={`b2c-operator-note-${inspectedUser.id}`}
          rows={2}
          placeholder="z.B. Überweisung durch Großmutter, +2 Probemonate wegen Unterrichtsausfall..."
          value={noteValue}
          onChange={(e) => onNoteChange(e.target.value)}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px 12px',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            fontSize: '0.80rem',
            fontFamily: 'inherit',
            resize: 'vertical'
          }}
        />
      </div>

      {/* 5. Primary Subscription Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {!isPaid && (
          <button
            type="button"
            onClick={onActivatePaid}
            disabled={activating}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <CheckCircle2 size={17} />
            <span>Zahlung bestätigen &amp; Profil freischalten</span>
          </button>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button
            type="button"
            onClick={() => onDownloadReceipt(Boolean(revealedFullName))}
            style={{
              padding: '10px 12px',
              borderRadius: '12px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              fontWeight: 800,
              fontSize: '0.76rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <FileText size={14} />
            <span>GoBD-Beleg (PDF)</span>
          </button>

          {!isExempt ? (
            <button
              type="button"
              onClick={onSetHardshipExempt}
              disabled={activating}
              style={{
                padding: '10px 12px',
                borderRadius: '12px',
                background: '#eff6ff',
                border: 'none',
                color: '#1d4ed8',
                fontWeight: 800,
                fontSize: '0.76rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              title="Befreit das Schülerprofil im Rahmen des Sozialfonds / BuT (SGB II) vollständig von der Jahresgebühr (0,00 €)"
            >
              <Sparkles size={14} />
              <span>Sozialfonds (0,00 €)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onRevokeSubscription}
              disabled={activating}
              style={{
                padding: '10px 12px',
                borderRadius: '12px',
                background: '#fef2f2',
                border: 'none',
                color: '#991b1b',
                fontWeight: 800,
                fontSize: '0.76rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <RotateCcw size={14} />
              <span>Befreiung aufheben</span>
            </button>
          )}
        </div>

        {isPaid && !isExempt && (
          <button
            type="button"
            onClick={onRevokeSubscription}
            disabled={activating}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '10px',
              background: '#fff1f2',
              border: 'none',
              color: '#9f1239',
              fontWeight: 700,
              fontSize: '0.73rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <RotateCcw size={13} />
            <span>Widerruf / Storno verbuchen (Gesetzlicher Widerruf BGB)</span>
          </button>
        )}
      </div>
    </div>
  );
};
