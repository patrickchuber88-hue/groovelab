import React, { useState, useEffect, useCallback } from 'react';
import { Mail, CheckCircle2, AlertTriangle, Send, Download, Copy, ShieldCheck, RefreshCw, Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { generateInvoicePDF, generateInvoicePDFBinary } from '../../../utils/pdfGenerator';
import { OperatorSettings } from '../types';

export interface InvoiceDispatchModalProps {
  invoice: any | null;
  inv: any | null;
  operator: OperatorSettings;
  isOpen: boolean;
  onClose: () => void;
  onDispatchSuccess?: (result: any) => void;
  showActionToast: (msg: string) => void;
}

export const InvoiceDispatchModal: React.FC<InvoiceDispatchModalProps> = ({
  invoice,
  inv,
  operator,
  isOpen,
  onClose,
  onDispatchSuccess,
  showActionToast,
}) => {
  const [isPreparingPdf, setIsPreparingPdf] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [pdfSha256, setPdfSha256] = useState<string | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastSuccessResult, setLastSuccessResult] = useState<any | null>(null);

  const cleanInvoiceId = invoice
    ? (invoice.amount < 0 ? (invoice.id || '').replace('INV-', 'GS-') : (invoice.id || '').replace('INV-', 'RE-'))
    : '';

  const recipientEmail = (inv?.billingEmail || inv?.schoolEmail || '').trim();
  const schoolName = inv?.schoolName || 'Musikschule';
  const formattedAmount = Number(invoice?.amount || 0).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  });
  const invoiceDate = invoice?.billing_date || new Date().toLocaleDateString('de-DE');

  // Load dispatch history from database
  const loadHistory = useCallback(async () => {
    if (!invoice?.id) return;
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase.rpc('get_school_invoice_dispatches', {
        p_invoice_id: invoice.id,
      });
      if (!error && Array.isArray(data)) {
        setDispatches(data);
      }
    } catch (err) {
      console.warn('[InvoiceDispatchModal] Could not fetch dispatch history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [invoice?.id]);

  // Pre-generate PDF binary & SHA-256 hash when modal opens
  useEffect(() => {
    if (!isOpen || !invoice || !inv) return;

    let isMounted = true;
    setErrorMsg(null);
    setLastSuccessResult(null);

    const preparePdf = async () => {
      setIsPreparingPdf(true);
      try {
        const result = await generateInvoicePDFBinary({
          invoiceId: invoice.id,
          invoiceDate: invoice.billing_date || new Date().toLocaleDateString('de-DE'),
          amount: invoice.amount,
          schoolName: inv.schoolName,
          schoolStreet: inv.schoolStreet,
          schoolZipCode: inv.schoolZipCode,
          schoolCity: inv.schoolCity,
          operatorCompany: operator.operatorCompany,
          operatorContact: operator.operatorContact,
          operatorStreet: operator.operatorStreet,
          operatorZip: operator.operatorZip,
          operatorCity: operator.operatorCity,
          operatorIban: operator.operatorIban,
          operatorBic: operator.operatorBic,
          hasCampus: inv.hasCampus,
          hasGroovelab: inv.hasGroovelab,
          hasKombiDiscount: inv.hasKombiDiscount,
          totalTeachersCount: inv.totalTeachersCount,
          passiveStudentsCount: inv.passiveStudentsCount,
          activeStudents: inv.activeStudents,
          storageAddonGb: inv.storageAddonGb,
          storageAddonMonthlyFee: inv.storageAddonMonthlyFee,
        });

        if (isMounted) {
          setPdfBase64(result.base64);
          setPdfSha256(result.sha256);
        }
      } catch (err: any) {
        console.error('[InvoiceDispatchModal] PDF generation failed:', err);
        if (isMounted) {
          setErrorMsg('Das Rechnungs-PDF konnte nicht vorberechnet werden.');
        }
      } finally {
        if (isMounted) {
          setIsPreparingPdf(false);
        }
      }
    };

    preparePdf();
    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [isOpen, invoice, inv, operator, loadHistory]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSending) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSending, onClose]);

  if (!isOpen || !invoice || !inv) return null;

  // Execute official Server-Side dispatch
  const handleServerDispatch = async () => {
    if (!recipientEmail) {
      setErrorMsg('Es ist keine gültige Rechnungs-E-Mail (billing_email) für diese Schule hinterlegt.');
      return;
    }

    if (!pdfBase64) {
      setErrorMsg('Das Rechnungs-PDF ist noch nicht bereit. Bitte warte einen Moment.');
      return;
    }

    setIsSending(true);
    setErrorMsg(null);

    try {
      // Retrieve current session token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const { data, error } = await supabase.functions.invoke('dispatch-school-invoice', {
        body: {
          invoice_id: invoice.id,
          pdf_base64: pdfBase64,
          dry_run: false,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (error) {
        throw new Error(error.message || 'Fehler beim Serverversand.');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Der Rechnungsversand konnte nicht zugestellt werden.');
      }

      setLastSuccessResult(data);
      showActionToast(
        data.is_simulated
          ? `🧪 Rechnungsversand erfolgreich simuliert & auditiert (SHA-256 validiert)`
          : `✉️ Rechnung ${cleanInvoiceId} erfolgreich an ${data.recipient_email} zugestellt!`
      );

      // Refresh dispatch ledger
      await loadHistory();

      if (onDispatchSuccess) {
        onDispatchSuccess(data);
      }
    } catch (err: any) {
      console.error('[InvoiceDispatchModal] Dispatch error:', err);
      setErrorMsg(err.message || 'Serverfehler beim Versand der Rechnung.');
    } finally {
      setIsSending(false);
    }
  };

  // Fallback: Traditional Mailto + Local PDF Download
  const handleMailtoFallback = async () => {
    try {
      generateInvoicePDF({
        invoiceId: invoice.id,
        invoiceDate: invoice.billing_date || new Date().toLocaleDateString('de-DE'),
        amount: invoice.amount,
        schoolName: inv.schoolName,
        schoolStreet: inv.schoolStreet,
        schoolZipCode: inv.schoolZipCode,
        schoolCity: inv.schoolCity,
        operatorCompany: operator.operatorCompany,
        operatorContact: operator.operatorContact,
        operatorStreet: operator.operatorStreet,
        operatorZip: operator.operatorZip,
        operatorCity: operator.operatorCity,
        operatorIban: operator.operatorIban,
        operatorBic: operator.operatorBic,
        hasCampus: inv.hasCampus,
        hasGroovelab: inv.hasGroovelab,
        hasKombiDiscount: inv.hasKombiDiscount,
        totalTeachersCount: inv.totalTeachersCount,
        passiveStudentsCount: inv.passiveStudentsCount,
        activeStudents: inv.activeStudents,
        storageAddonGb: inv.storageAddonGb,
        storageAddonMonthlyFee: inv.storageAddonMonthlyFee,
      });

      const subject = `Rechnung ${cleanInvoiceId} für Campus-Groovelab Cloud-Infrastruktur – ${schoolName}`;
      const body = `Sehr geehrte Damen und Herren der ${schoolName},\n\nanbei erhalten Sie die Abrechnung ${cleanInvoiceId} über ${formattedAmount}.\n\nMit freundlichen Grüßen\nIhr Campus-Groovelab Abrechnungsteam`;

      try {
        await navigator.clipboard.writeText(body);
      } catch (clipErr) {
        console.warn('Clipboard write skipped:', clipErr);
      }

      const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoUrl;

      showActionToast(`📄 Rechnungs-PDF heruntergeladen & E-Mail-Programm geöffnet.`);
      onClose();
    } catch (err) {
      console.error('Mailto fallback error:', err);
      showActionToast('Fehler beim lokalen PDF-Download.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-dispatch-modal-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '20px',
      }}
      className="animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSending) {
          onClose();
        }
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '560px',
          padding: '28px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#f0fdf4',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #bbf7d0',
              }}
            >
              <Mail size={22} />
            </div>
            <div>
              <h3
                id="invoice-dispatch-modal-title"
                style={{ margin: 0, fontSize: '1.20rem', fontWeight: 900, color: '#0f172a' }}
              >
                Rechnungszustellung
              </h3>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                B2B-Direktversand an die offizielle Musikschul-Buchhaltung
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            aria-label="Schließen"
            style={{
              background: '#f1f5f9',
              border: 'none',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              fontSize: '1rem',
              cursor: isSending ? 'not-allowed' : 'pointer',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Invoice Summary Card */}
        <div
          style={{
            background: '#f8fafc',
            padding: '16px',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
            <span style={{ color: '#64748b' }}>Beleg-Nummer:</span>
            <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>{cleanInvoiceId}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
            <span style={{ color: '#64748b' }}>Empfänger-Schule:</span>
            <strong style={{ color: '#0f172a' }}>{schoolName}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
            <span style={{ color: '#64748b' }}>Rechnungsbetrag:</span>
            <strong style={{ color: '#16a34a', fontSize: '0.96rem' }}>{formattedAmount}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
            <span style={{ color: '#64748b' }}>Leistungsdatum:</span>
            <span style={{ color: '#334155' }}>{invoiceDate}</span>
          </div>
        </div>

        {/* Recipient Address Box */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '12px',
            background: recipientEmail ? '#f0fdf4' : '#fffbeb',
            border: `1px solid ${recipientEmail ? '#bbf7d0' : '#fef3c7'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            {recipientEmail ? (
              <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
            ) : (
              <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.70rem', textTransform: 'uppercase', fontWeight: 800, color: recipientEmail ? '#15803d' : '#b45309' }}>
                {recipientEmail ? 'Offizielle Buchhaltungs-Adresse' : 'Keine E-Mail hinterlegt'}
              </div>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {recipientEmail || 'Bitte in den Musikschul-Stammdaten ergänzen'}
              </div>
            </div>
          </div>
        </div>

        {/* GoBD SHA-256 Seal Info */}
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '10px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 800, color: '#475569' }}>
            <ShieldCheck size={14} style={{ color: '#3b82f6' }} />
            <span>GoBD-BELEGPRÜFSUMME (SHA-256 HASH)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <code
              style={{
                fontSize: '0.70rem',
                color: '#334155',
                background: '#ffffff',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
            >
              {isPreparingPdf ? 'Berechne kryptografische Signatur...' : (pdfSha256 || 'Wird vorberechnet...')}
            </code>
            {pdfSha256 && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(pdfSha256);
                  showActionToast('SHA-256 Prüfsumme in die Zwischenablage kopiert.');
                }}
                title="Prüfsumme kopieren"
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '0.70rem',
                  cursor: 'pointer',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Copy size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Error Notice */}
        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              fontSize: '0.76rem',
              color: '#991b1b',
              lineHeight: 1.4,
            }}
          >
            ⚠️ <strong>Zustellhinweis:</strong> {errorMsg}
          </div>
        )}

        {/* Success Feedback */}
        {lastSuccessResult && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              fontSize: '0.78rem',
              color: '#15803d',
              lineHeight: 1.4,
            }}
          >
            ✅ <strong>Erfolgreich zugestellt:</strong> Beleg wurde revisionssicher im GoBD-Zustellbuch erfasst.
            {lastSuccessResult.is_simulated && (
              <div style={{ fontSize: '0.72rem', color: '#166534', marginTop: '3px' }}>
                (Simulierter Probelauf – SMTP-Secret noch nicht konfiguriert)
              </div>
            )}
          </div>
        )}

        {/* Dispatch History Ledger */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              Zustell-Historie ({dispatches.length})
            </span>
            <button
              type="button"
              onClick={loadHistory}
              disabled={loadingHistory}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#3b82f6',
                fontSize: '0.70rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <RefreshCw size={11} className={loadingHistory ? 'animate-spin' : ''} />
              Aktualisieren
            </button>
          </div>

          {dispatches.length === 0 ? (
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', padding: '6px 0' }}>
              Noch keine Server-Zustellung für diesen Beleg protokolliert.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '110px', overflowY: 'auto' }}>
              {dispatches.map((d) => (
                <div
                  key={d.id}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.72rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={12} style={{ color: '#64748b' }} />
                    <span style={{ color: '#334155' }}>
                      {new Date(d.dispatched_at).toLocaleString('de-DE')}
                    </span>
                    <span style={{ color: '#94a3b8' }}>an {d.recipient_email}</span>
                  </div>
                  <span
                    style={{
                      fontWeight: 700,
                      color: d.status === 'delivered' ? '#16a34a' : d.status === 'simulated' ? '#2563eb' : '#dc2626',
                    }}
                  >
                    {d.status === 'delivered' ? 'Zugestellt' : d.status === 'simulated' ? 'Testlauf' : 'Fehlgeschlagen'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleMailtoFallback}
            disabled={isSending}
            title="Öffnet das lokale Mail-Programm und lädt das PDF herunter"
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              padding: '10px 14px',
              fontSize: '0.80rem',
              fontWeight: 700,
              color: '#475569',
              cursor: isSending ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Download size={14} />
            <span>Manuell (mailto:)</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 16px',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#475569',
                cursor: isSending ? 'not-allowed' : 'pointer',
              }}
            >
              Schließen
            </button>

            <button
              type="button"
              onClick={handleServerDispatch}
              disabled={isSending || isPreparingPdf || !recipientEmail}
              style={{
                background: recipientEmail ? '#16a34a' : '#94a3b8',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 18px',
                fontSize: '0.82rem',
                fontWeight: 800,
                color: '#ffffff',
                cursor: isSending || isPreparingPdf || !recipientEmail ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: recipientEmail ? '0 4px 12px rgba(22, 163, 74, 0.25)' : 'none',
                transition: 'all 0.15s ease-in-out',
              }}
            >
              {isSending ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Wird zugestellt...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Jetzt per Server zustellen</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
