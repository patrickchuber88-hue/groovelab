import React, { useState } from 'react';
import {
  CheckSquare, Search, RefreshCw, CreditCard, Banknote,
  ShieldCheck, Clock, FileText, ChevronRight, X, Download, Building, CheckCircle2,
  Landmark, Sparkles, Check
} from 'lucide-react';
import { OPERATOR_BANKING_CONFIG } from '../../../config/operatorBanking';
import { supabase } from '../../../lib/supabase';
import { generateB2CParentContractPDF } from '../../../utils/pdfGenerator';
import { CanonicalBillingRates } from '../utils/computeSchoolBillingMetrics';
import type { PendingUser, School } from '../MasterAdminTypes';
import {
  B2CStudentSubscriptionInspector,
  formatMaskedStudentDisplayName
} from './B2CStudentSubscriptionInspector';

interface ReconciliationTabProps {
  pendingUsers: PendingUser[];
  schools: School[];
  masterPricing: CanonicalBillingRates;
  loadingPending: boolean;
  onRefresh: () => void;
  onBatchActivate: (userIds: string[]) => Promise<void>;
  onSingleActivate: (userId: string) => Promise<void>;
  taxMode?: 'small_business' | 'standard_vat';
  vatRatePercent?: number;
  onNavigateBilling?: () => void;
}

export const ReconciliationTab: React.FC<ReconciliationTabProps> = ({
  pendingUsers,
  schools,
  masterPricing,
  loadingPending,
  onRefresh,
  onBatchActivate,
  onSingleActivate,
  taxMode: propTaxMode,
  vatRatePercent = 19,
  onNavigateBilling
}) => {
  const [toastNotice, setToastNotice] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);
  const notify = (payload: { type: 'success' | 'error'; title: string; message: string }) => {
    setToastNotice(payload);
    setTimeout(() => setToastNotice(null), 4000);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'ALL' | 'bank_transfer' | 'cash' | 'exempt'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'PAID' | 'ALL'>('PENDING');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [activating, setActivating] = useState(false);

  // Split-Screen Inspector State
  const [inspectedUser, setInspectedUser] = useState<PendingUser | null>(null);
  const [operatorNotes, setOperatorNotes] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState(false);

  const effectiveTaxMode: 'small_business' | 'standard_vat' = propTaxMode || (
    typeof window !== 'undefined'
      ? ((localStorage.getItem('cg_tax_mode') as 'small_business' | 'standard_vat') || 'small_business')
      : 'small_business'
  );
  const effectiveVatDivisor = 1 + (vatRatePercent > 0 ? vatRatePercent : 19) / 100;

  // Helper to get school object and name
  const getSchoolObj = (schoolId?: string): School | undefined => {
    if (!schoolId) return undefined;
    return schools.find(s => s.id === schoolId);
  };

  const getSchoolName = (schoolId?: string): string => {
    if (!schoolId) return 'Unbekannte Musikschule';
    const found = getSchoolObj(schoolId);
    return found ? found.name : 'Unbekannte Musikschule';
  };

  const getStudentAnnualRate = (schoolId?: string): { gross: number; net: number; vat: number; currencySymbol: '€' | 'CHF'; formattedGross: string } => {
    const school = getSchoolObj(schoolId);
    const isChf = school?.country === 'CH' || school?.currency === 'CHF';
    const currencySymbol: '€' | 'CHF' = isChf ? 'CHF' : '€';
    // 11 Schulmonate (12. Monat kostenfrei): 5,39 € (0,49 € * 11) bzw. CHF 11.00 (CHF 1.00 * 11)
    const unitMonthly = isChf ? 1.00 : Number(masterPricing?.priceStudent ?? 0.49);
    const gross = Number((unitMonthly * 11).toFixed(2));
    const net = effectiveTaxMode === 'standard_vat' && !isChf
      ? Number((gross / effectiveVatDivisor).toFixed(2))
      : gross;
    const vat = effectiveTaxMode === 'standard_vat' && !isChf
      ? Number((gross - net).toFixed(2))
      : 0;
    const formattedGross = isChf
      ? `CHF ${gross.toFixed(2)}`
      : `${gross.toFixed(2).replace('.', ',')} €`;
    return { gross, net, vat, currencySymbol, formattedGross };
  };

  // Persist operator note in DB
  const handleUpdateNote = async (userId: string, note: string) => {
    setOperatorNotes(prev => ({ ...prev, [userId]: note }));
  };

  const handleSaveNoteToDb = async (userId: string) => {
    const note = operatorNotes[userId] ?? (inspectedUser?.operator_notes || inspectedUser?.coach_notes || '');
    setSavingNote(true);
    try {
      let rpcOk = false;
      try {
        const { error: rpcErr } = await supabase.rpc('admin_manage_b2c_student_subscription', {
          p_student_id: userId,
          p_action: 'save_note',
          p_operator_note: note
        });
        if (!rpcErr) rpcOk = true;
      } catch {
        rpcOk = false;
      }

      if (!rpcOk) {
        const { error } = await supabase
          .from('users')
          .update({ coach_notes: note })
          .eq('id', userId);
        if (error) throw error;
      }

      notify({
        type: 'success',
        title: 'Notiz gespeichert',
        message: 'Interne Betreiber-Notiz wurde revisionssicher in der Datenbank hinterlegt.'
      });
      onRefresh();
    } catch (err) {
      console.error('Error saving operator note:', err);
      notify({
        type: 'error',
        title: 'Speicherfehler',
        message: 'Notiz konnte nicht in der Datenbank gespeichert werden.'
      });
    } finally {
      setSavingNote(false);
    }
  };

  // Generate Deterministic Payment Reference Code
  const getReferenceCode = (u: PendingUser): string => {
    if (u.payment_reference) return u.payment_reference;
    const cleanId = (u.id || '0000').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
    const year = new Date().getFullYear();
    return `CG-${year}-${cleanId}`;
  };

  // Filter logic
  const filteredUsers = pendingUsers.filter(u => {
    const matchesSchool = selectedSchoolFilter === 'ALL' || u.school_id === selectedSchoolFilter;

    const method = u.student_billing_payment_method || 'bank_transfer';
    const isExempt = Boolean(u.is_hardship_exempt || u.exempt_from_direct_billing);
    const matchesMethod =
      paymentMethodFilter === 'ALL' ||
      (paymentMethodFilter === 'exempt' && isExempt) ||
      (paymentMethodFilter !== 'exempt' && !isExempt && method === paymentMethodFilter);

    const isPaid = Boolean(u.is_campus_active || u.student_billing_cash_paid || isExempt);
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PENDING' && !isPaid) ||
      (statusFilter === 'PAID' && isPaid);

    const refCode = getReferenceCode(u).toLowerCase();
    const fullName = `${u.first_name || ''} ${u.last_name || ''} ${u.name || ''}`.toLowerCase();
    const email = (u.email || '').toLowerCase();
    const sName = getSchoolName(u.school_id).toLowerCase();
    const q = searchQuery.toLowerCase().trim();

    const matchesSearch = !q || fullName.includes(q) || email.includes(q) || sName.includes(q) || refCode.includes(q);
    return matchesSchool && matchesMethod && matchesStatus && matchesSearch;
  });

  const handleToggleSelect = (userId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map(u => u.id));
    }
  };

  const handleExecuteBatch = async () => {
    if (selectedUserIds.length === 0) return;
    setActivating(true);
    try {
      await onBatchActivate(selectedUserIds);
      setSelectedUserIds([]);
      if (inspectedUser && selectedUserIds.includes(inspectedUser.id)) {
        setInspectedUser(null);
      }
    } finally {
      setActivating(false);
    }
  };

  const handleSingleActivateClick = async (userId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActivating(true);
    try {
      await onSingleActivate(userId);
      setSelectedUserIds(prev => prev.filter(id => id !== userId));
      if (inspectedUser?.id === userId) {
        setInspectedUser(prev => prev ? { ...prev, is_campus_active: true } : null);
      }
    } finally {
      setActivating(false);
    }
  };

  // Exempt student (Sozialfonds / Kulanz-Freischaltung) persisted in DB
  const handleExemptStudent = async (user: PendingUser) => {
    setActivating(true);
    try {
      let rpcOk = false;
      try {
        const { error: rpcErr } = await supabase.rpc('admin_manage_b2c_student_subscription', {
          p_student_id: user.id,
          p_action: 'set_hardship_exempt',
          p_operator_note: operatorNotes[user.id] || null
        });
        if (!rpcErr) rpcOk = true;
      } catch {
        rpcOk = false;
      }

      if (!rpcOk) {
        const { error } = await supabase
          .from('users')
          .update({
            exempt_from_direct_billing: true,
            is_campus_active: true,
            is_groovelab_active: true
          })
          .eq('id', user.id);
        if (error) throw error;
      }

      await onSingleActivate(user.id);
      setInspectedUser(prev => prev ? {
        ...prev,
        exempt_from_direct_billing: true,
        is_hardship_exempt: true,
        is_campus_active: true
      } : null);
      notify({
        type: 'success',
        title: 'Kulanz-Freistellung gespeichert',
        message: 'Schüler wurde gebührenfrei gestellt (0,00 €) und für Campus aktiviert.'
      });
      onRefresh();
    } catch (err) {
      console.error('Error exempting student:', err);
      notify({
        type: 'error',
        title: 'Fehler bei Kulanz-Freistellung',
        message: 'Status konnte nicht in der Datenbank aktualisiert werden.'
      });
    } finally {
      setActivating(false);
    }
  };

  // Grant Courtesy Months via authoritative RPC (§ 327l BGB Probemonate / Folgejahr)
  const handleGrantCourtesyMonths = async (user: PendingUser, months: number) => {
    setActivating(true);
    try {
      const { data, error } = await supabase.rpc('admin_manage_b2c_student_subscription', {
        p_student_id: user.id,
        p_action: 'grant_courtesy_months',
        p_courtesy_months: months,
        p_operator_note: operatorNotes[user.id] || null
      });
      if (error) throw error;

      setInspectedUser(prev => prev ? {
        ...prev,
        is_campus_active: true,
        contract_ends_at: (data as any)?.contract_ends_at,
        b2c_courtesy_months: (prev.b2c_courtesy_months || 0) + months
      } : null);

      notify({
        type: 'success',
        title: 'Kulanz-Gutschrift gebucht',
        message: `${months} Probemonat(e) wurden dem Schülerprofil gutgeschrieben.`
      });
      onRefresh();
    } catch (err: any) {
      console.error('Error granting courtesy months:', err);
      notify({
        type: 'error',
        title: 'Fehler bei Kulanz-Gutschrift',
        message: err?.message || 'Gutschrift konnte nicht in der Datenbank verbucht werden.'
      });
    } finally {
      setActivating(false);
    }
  };

  // Revoke Subscription / Storno / Widerruf via authoritative RPC (§ 312k BGB)
  const handleRevokeSubscription = async (user: PendingUser) => {
    setActivating(true);
    try {
      const { error } = await supabase.rpc('admin_manage_b2c_student_subscription', {
        p_student_id: user.id,
        p_action: 'revoke_or_cancel',
        p_operator_note: operatorNotes[user.id] || null
      });
      if (error) throw error;

      setInspectedUser(prev => prev ? {
        ...prev,
        is_campus_active: false,
        student_billing_cash_paid: false,
        exempt_from_direct_billing: false,
        is_hardship_exempt: false
      } : null);

      notify({
        type: 'success',
        title: 'Abo-Status aktualisiert',
        message: 'Abo-Freischaltung wurde widerrufen / pausiert.'
      });
      onRefresh();
    } catch (err: any) {
      console.error('Error revoking subscription:', err);
      notify({
        type: 'error',
        title: 'Fehler bei Statusänderung',
        message: err?.message || 'Aktion konnte nicht ausgeführt werden.'
      });
    } finally {
      setActivating(false);
    }
  };

  // Audited Just-In-Time (JIT) Full Name Reveal (Progressive Privacy Disclosure)
  const handleRevealFullNameAudit = async (studentId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.rpc('admin_reveal_b2c_student_lastname', {
        p_student_id: studentId,
        p_reason: 'B2C Zahlungsabgleich & Kundenbetreuung im Masteradmin-Leitstand'
      });
      if (error) throw error;
      return (data as any)?.full_name || null;
    } catch (err) {
      console.warn('JIT reveal RPC not available or failed:', err);
      return null;
    }
  };

  // Generate Official GoBD Receipt PDF for Student/Parents
  const handleDownloadStudentReceipt = (user: PendingUser, includeFullName: boolean = false) => {
    const rate = getStudentAnnualRate(user.school_id);
    const isExempt = Boolean(user.is_hardship_exempt || user.exempt_from_direct_billing);
    const displayName = includeFullName
      ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || 'Schülerprofil'
      : formatMaskedStudentDisplayName(user);

    void generateB2CParentContractPDF({
      studentName: displayName,
      studentId: user.id,
      schoolName: getSchoolName(user.school_id),
      isDirectBilled: !isExempt,
      isHardship: isExempt,
      referenceCode: getReferenceCode(user),
      totalAmountStr: isExempt ? '0,00' : rate.gross.toFixed(2).replace('.', ','),
      currencySuffix: rate.currencySymbol === 'CHF' ? 'CHF' : 'EUR',
      remainingMonths: 11,
      monthlyRate: rate.currencySymbol === 'CHF' ? 'CHF 1.00' : '0,49 €'
    });
  };

  // KPIs Calculation (11 school months canonical formula)
  const pendingCount = pendingUsers.filter(u => !u.is_campus_active && !u.is_hardship_exempt && !u.exempt_from_direct_billing).length;
  const paidCount = pendingUsers.filter(u => u.is_campus_active && !u.is_hardship_exempt && !u.exempt_from_direct_billing).length;
  const exemptCount = pendingUsers.filter(u => u.is_hardship_exempt || u.exempt_from_direct_billing).length;

  const totalOpenAmount = pendingUsers
    .filter(u => !u.is_campus_active && !u.is_hardship_exempt && !u.exempt_from_direct_billing)
    .reduce((acc, u) => acc + getStudentAnnualRate(u.school_id).gross, 0);

  const totalPaidGross = pendingUsers
    .filter(u => u.is_campus_active && !u.is_hardship_exempt && !u.exempt_from_direct_billing)
    .reduce((acc, u) => acc + getStudentAnnualRate(u.school_id).gross, 0);

  const totalPaidNet = effectiveTaxMode === 'standard_vat'
    ? Number((totalPaidGross / effectiveVatDivisor).toFixed(2))
    : totalPaidGross;
  const totalPaidVat = effectiveTaxMode === 'standard_vat'
    ? Number((totalPaidGross - totalPaidNet).toFixed(2))
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      {toastNotice && (
        <div
          role="status"
          style={{
            background: toastNotice.type === 'error' ? '#fef2f2' : '#ecfdf5',
            color: toastNotice.type === 'error' ? '#991b1b' : '#065f46',
            padding: '12px 18px',
            borderRadius: '14px',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.84rem',
            fontWeight: 700
          }}
        >
          <span><strong>{toastNotice.title}:</strong> {toastNotice.message}</span>
          <button
            type="button"
            aria-label="Hinweis schließen"
            onClick={() => setToastNotice(null)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* 1. HEADER & EXECUTIVE FINANCIAL SUMMARY */}
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '28px 32px',
        border: '1px solid rgba(15, 23, 42, 0.08)',
        boxShadow: '0 4px 24px rgba(15, 23, 42, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                fontSize: '0.70rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#047857',
                background: '#ecfdf5',
                padding: '4px 10px',
                borderRadius: '100px',
                border: 'none'
              }}>
                Direktabrechnung (B2C) • Eltern &amp; volljährige Schüler
              </span>
              <span style={{
                fontSize: '0.70rem',
                fontWeight: 700,
                color: '#475569',
                background: '#f1f5f9',
                padding: '4px 10px',
                borderRadius: '100px'
              }}>
                Schuljahres-Beitrag: 5,39 € (DE/AT) • CHF 11.00 (CH)
              </span>
            </div>

            <h2 style={{ margin: '10px 0 4px 0', fontSize: '1.65rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>
              Zahlungsabgleich &amp; Schüler-Freischaltung
            </h2>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b', maxWidth: '720px', lineHeight: 1.5 }}>
              Prüfe eingehende Eltern-Überweisungen (11 Schulmonate, 12. Monat kostenfrei), schalte Schülerprofile frei und erstelle revisionssichere Zahlungsbelege. Für CAMT.053-Bankimporte und den DATEV-Buchungsstapel nutze bitte den Tab <strong>Financial Control</strong>.
            </p>
          </div>

          {/* Action Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {onNavigateBilling && (
              <button
                type="button"
                onClick={onNavigateBilling}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: '#0f172a',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Landmark size={15} />
                <span>CAMT.053 &amp; DATEV (Financial Control)</span>
              </button>
            )}
            <button
              type="button"
              onClick={onRefresh}
              disabled={loadingPending}
              aria-label="Liste aktualisieren"
              style={{
                padding: '10px 14px',
                borderRadius: '12px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#334155',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              className="hover-scale-mini"
              title="Liste aktualisieren"
            >
              <RefreshCw size={15} className={loadingPending ? 'animate-spin' : ''} />
              <span>Aktualisieren</span>
            </button>
          </div>
        </div>

        {/* 4 Financial KPI Scorecards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '14px'
        }}>
          {/* KPI 1: Offene Freischaltungen */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setStatusFilter('PENDING')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setStatusFilter('PENDING');
              }
            }}
            style={{
              background: statusFilter === 'PENDING' ? '#fffbeb' : '#f8fafc',
              borderRadius: '18px',
              padding: '16px 20px',
              border: statusFilter === 'PENDING' ? 'none' : '1px solid #e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Wartend (Offen)
              </span>
              <Clock size={16} color="#d97706" />
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {pendingCount} <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#64748b' }}>Schüler</span>
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309', marginTop: '4px' }}>
              Offenes Volumen: {totalOpenAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </div>
          </div>

          {/* KPI 2: Bezahlt & Aktiviert */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setStatusFilter('PAID')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setStatusFilter('PAID');
              }
            }}
            style={{
              background: statusFilter === 'PAID' ? '#ecfdf5' : '#f8fafc',
              borderRadius: '18px',
              padding: '16px 20px',
              border: statusFilter === 'PAID' ? 'none' : '1px solid #e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Bezahlt &amp; Freigeschaltet
              </span>
              <CheckCircle2 size={16} color="#059669" />
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {paidCount} <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#64748b' }}>Schüler</span>
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', marginTop: '4px' }}>
              Umsatz (Brutto): {totalPaidGross.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </div>
          </div>

          {/* KPI 3: Netto & Steuer-Aufschlüsselung */}
          <div style={{
            background: '#f8fafc',
            borderRadius: '18px',
            padding: '16px 20px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Netto-Erlös / Steuerstatus
              </span>
              <Landmark size={16} color="#475569" />
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {totalPaidNet.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginTop: '4px' }}>
              {effectiveTaxMode === 'small_business'
                ? 'Umsatzsteuerbefreit (Kleinunternehmerregelung)'
                : `inkl. ${totalPaidVat.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € USt. (19%)`}
            </div>
          </div>

          {/* KPI 4: Sozialfonds & Kulanz */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => { setStatusFilter('ALL'); setPaymentMethodFilter('exempt'); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setStatusFilter('ALL');
                setPaymentMethodFilter('exempt');
              }
            }}
            style={{
              background: paymentMethodFilter === 'exempt' ? '#eff6ff' : '#f8fafc',
              borderRadius: '18px',
              padding: '16px 20px',
              border: paymentMethodFilter === 'exempt' ? 'none' : '1px solid #e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Sozialfonds / Kulanz
              </span>
              <Sparkles size={16} color="#2563eb" />
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {exemptCount} <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#64748b' }}>Freiplätze</span>
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563eb', marginTop: '4px' }}>
              100% Beitragsbefreit (0,00 €)
            </div>
          </div>
        </div>
      </div>

      {/* 2. FILTER & SEARCH BAR */}
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '18px 24px',
        border: '1px solid rgba(15, 23, 42, 0.08)',
        boxShadow: '0 2px 12px rgba(15, 23, 42, 0.02)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        {/* Left: Search + School Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 420px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Suche nach Name, Verwendungszweck (CG-2026-...), Schule..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 14px 10px 38px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                fontSize: '0.84rem',
                color: '#0f172a',
                fontWeight: 600,
                outline: 'none'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Suche zurücksetzen"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '2px'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={selectedSchoolFilter}
            onChange={(e) => setSelectedSchoolFilter(e.target.value)}
            aria-label="Musikschule filtern"
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              fontSize: '0.84rem',
              fontWeight: 700,
              color: '#0f172a',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">Alle Musikschulen ({schools.length})</option>
            {schools.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Right: Segmented Pills for Status & Payment Method */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', gap: '4px' }}>
            {([
              { id: 'PENDING', label: `Offen (${pendingCount})` },
              { id: 'PAID', label: `Bezahlt (${paidCount})` },
              { id: 'ALL', label: 'Alle' }
            ] as const).map(st => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '9px',
                  border: 'none',
                  background: statusFilter === st.id ? '#ffffff' : 'transparent',
                  color: statusFilter === st.id ? '#0f172a' : '#64748b',
                  fontSize: '0.78rem',
                  fontWeight: statusFilter === st.id ? 800 : 600,
                  cursor: 'pointer',
                  boxShadow: statusFilter === st.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', gap: '4px' }}>
            {([
              { id: 'ALL', label: 'Alle Wege' },
              { id: 'bank_transfer', label: 'Überweisung' },
              { id: 'cash', label: 'Vor Ort (Bar)' },
              { id: 'exempt', label: 'Kulanz' }
            ] as const).map(pm => (
              <button
                key={pm.id}
                type="button"
                onClick={() => setPaymentMethodFilter(pm.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '9px',
                  border: 'none',
                  background: paymentMethodFilter === pm.id ? '#ffffff' : 'transparent',
                  color: paymentMethodFilter === pm.id ? '#0f172a' : '#64748b',
                  fontSize: '0.78rem',
                  fontWeight: paymentMethodFilter === pm.id ? 800 : 600,
                  cursor: 'pointer',
                  boxShadow: paymentMethodFilter === pm.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                {pm.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. BATCH SELECTION BAR (Visible when items are selected) */}
      {selectedUserIds.length > 0 && (
        <div style={{
          background: '#0f172a',
          color: '#ffffff',
          borderRadius: '18px',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 10px 25px rgba(15, 23, 42, 0.18)',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              background: '#10b981',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: '0.80rem',
              padding: '4px 10px',
              borderRadius: '8px'
            }}>
              {selectedUserIds.length} ausgewählt
            </span>
            <span style={{ fontSize: '0.86rem', color: '#cbd5e1', fontWeight: 600 }}>
              Gesamtsumme der Auswahl:{' '}
              <strong style={{ color: '#ffffff' }}>
                {selectedUserIds
                  .reduce((sum, id) => {
                    const u = pendingUsers.find(p => p.id === id);
                    return sum + getStudentAnnualRate(u?.school_id).gross;
                  }, 0)
                  .toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setSelectedUserIds([])}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#cbd5e1',
                fontSize: '0.80rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Auswahl aufheben
            </button>
            <button
              type="button"
              onClick={handleExecuteBatch}
              disabled={activating}
              style={{
                padding: '9px 20px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.84rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CheckSquare size={16} />
              <span>{activating ? 'Schalte frei...' : `Jetzt ${selectedUserIds.length} Profile freischalten`}</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. MAIN WORKSPACE: SPLIT-SCREEN TABLE & INSPECTOR DRAWER */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: inspectedUser ? 'minmax(0, 1.35fr) minmax(360px, 0.85fr)' : '1fr',
        gap: '20px',
        alignItems: 'start',
        transition: 'all 0.25s ease'
      }}>

        {/* LEFT COLUMN: STUDENT LEDGER LIST */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.03)',
          overflow: 'hidden'
        }}>
          {/* Table Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '42px 1.6fr 1.2fr 1.1fr 0.9fr 130px',
            padding: '14px 20px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            fontSize: '0.72rem',
            fontWeight: 800,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            alignItems: 'center'
          }}>
            <div>
              <input
                type="checkbox"
                aria-label="Alle sichtbaren Schüler auswählen"
                checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                onChange={handleSelectAll}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#10b981' }}
              />
            </div>
            <div>Schüler / Musikschule</div>
            <div>Verwendungszweck</div>
            <div>Zahlungsweg</div>
            <div>Status / Betrag</div>
            <div style={{ textAlign: 'right' }}>Aktion</div>
          </div>

          {/* Table Body */}
          {filteredUsers.length === 0 ? (
            <div style={{
              padding: '64px 24px',
              textAlign: 'center',
              color: '#64748b'
            }}>
              <ShieldCheck size={44} style={{ color: '#10b981', margin: '0 auto 12px auto', opacity: 0.85 }} />
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                Keine Einträge in dieser Ansicht
              </div>
              <div style={{ fontSize: '0.84rem', maxWidth: '420px', margin: '0 auto' }}>
                {statusFilter === 'PENDING'
                  ? 'Aktuell warten keine offenen Direktzahler-Profile auf eine Zahlungsfreigabe.'
                  : 'Keine Schülerprofile für die gewählten Filterkriterien gefunden.'}
              </div>
            </div>
          ) : (
            <div style={{ maxHeight: '640px', overflowY: 'auto' }}>
              {filteredUsers.map((u) => {
                const isSelected = selectedUserIds.includes(u.id);
                const isInspected = inspectedUser?.id === u.id;
                const isExempt = Boolean(u.is_hardship_exempt || u.exempt_from_direct_billing);
                const isPaid = Boolean(u.is_campus_active || u.student_billing_cash_paid || isExempt);
                const method = u.student_billing_payment_method || 'bank_transfer';
                const refCode = getReferenceCode(u);
                const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.name || 'Unbekannter Schüler';
                const rate = getStudentAnnualRate(u.school_id);

                return (
                  <div
                    key={u.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setInspectedUser(u)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setInspectedUser(u);
                      }
                    }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '42px 1.6fr 1.2fr 1.1fr 0.9fr 130px',
                      padding: '14px 20px',
                      borderBottom: '1px solid #f1f5f9',
                      alignItems: 'center',
                      background: isInspected
                        ? '#f0fdf4'
                        : isSelected
                        ? '#f8fafc'
                        : '#ffffff',
                      cursor: 'pointer',
                      transition: 'background 0.12s ease'
                    }}
                  >
                    {/* Checkbox */}
                    <div onClick={(e) => handleToggleSelect(u.id, e)}>
                      <input
                        type="checkbox"
                        aria-label={`Auswählen: ${fullName}`}
                        checked={isSelected}
                        onChange={() => {}}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#10b981' }}
                      />
                    </div>

                    {/* Student & School */}
                    <div style={{ paddingRight: '10px', minWidth: 0 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: 800,
                        color: '#0f172a',
                        fontSize: '0.88rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        <span>{formatMaskedStudentDisplayName(u)}</span>
                        {u.ausweis_nummer && (
                          <span style={{
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            color: '#475569',
                            background: '#f1f5f9',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            border: '1px solid #e2e8f0'
                          }}>
                            #{u.ausweis_nummer}
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: '0.74rem',
                        color: '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        <Building size={11} />
                        <span>{getSchoolName(u.school_id)}</span>
                        {u.instrument && <span>• {u.instrument}</span>}
                      </div>
                    </div>

                    {/* Reference Code */}
                    <div>
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        color: '#334155',
                        background: '#f1f5f9',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: 'none'
                      }}>
                        {refCode}
                      </span>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '3px' }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('de-DE') : 'Neu angelegt'}
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div>
                      {isExempt ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '0.73rem',
                          fontWeight: 800,
                          color: '#1d4ed8',
                          background: '#eff6ff',
                          padding: '4px 9px',
                          borderRadius: '8px',
                          border: 'none'
                        }}>
                          <Sparkles size={12} />
                          <span>Sozialfonds</span>
                        </span>
                      ) : method === 'cash' ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '0.73rem',
                          fontWeight: 700,
                          color: '#b45309',
                          background: '#fffbeb',
                          padding: '4px 9px',
                          borderRadius: '8px',
                          border: 'none'
                        }}>
                          <Banknote size={12} />
                          <span>Vor Ort (Schule)</span>
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '0.73rem',
                          fontWeight: 700,
                          color: '#0369a1',
                          background: '#f0f9ff',
                          padding: '4px 9px',
                          borderRadius: '8px',
                          border: 'none'
                        }}>
                          <CreditCard size={12} />
                          <span>Überweisung</span>
                        </span>
                      )}
                    </div>

                    {/* Status & Amount */}
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '0.86rem', color: isExempt ? '#2563eb' : '#0f172a' }}>
                        {isExempt ? '0,00 €' : rate.formattedGross}
                      </div>
                      {isExempt ? (
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Check size={10} /> Befreit
                        </span>
                      ) : isPaid ? (
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Check size={10} /> Bezahlt &amp; Aktiv
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#d97706', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Clock size={10} /> Zahlung offen
                        </span>
                      )}
                    </div>

                    {/* Quick Action */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                      {!isPaid ? (
                        <button
                          type="button"
                          onClick={(e) => handleSingleActivateClick(u.id, e)}
                          disabled={activating}
                          style={{
                            padding: '7px 12px',
                            borderRadius: '10px',
                            background: '#10b981',
                            color: '#ffffff',
                            border: 'none',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          className="hover-scale-mini"
                        >
                          <Check size={12} />
                          <span>Freigeben</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDownloadStudentReceipt(u); }}
                          style={{
                            padding: '7px 10px',
                            borderRadius: '10px',
                            background: '#f1f5f9',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            fontWeight: 700,
                            fontSize: '0.74rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="GoBD-Zahlungsbeleg als PDF herunterladen"
                        >
                          <Download size={12} />
                          <span>Beleg</span>
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={`Details für ${fullName} öffnen`}
                        onClick={(e) => { e.stopPropagation(); setInspectedUser(u); }}
                        style={{
                          padding: '7px',
                          borderRadius: '10px',
                          background: isInspected ? '#dcfce7' : 'transparent',
                          color: isInspected ? '#047857' : '#94a3b8',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: 360° STUDENT PAYMENT & SUBSCRIPTION INSPECTOR */}
        {inspectedUser && (
          <B2CStudentSubscriptionInspector
            inspectedUser={inspectedUser}
            schoolName={getSchoolName(inspectedUser.school_id)}
            referenceCode={getReferenceCode(inspectedUser)}
            rate={getStudentAnnualRate(inspectedUser.school_id)}
            effectiveTaxMode={effectiveTaxMode}
            activating={activating}
            savingNote={savingNote}
            noteValue={operatorNotes[inspectedUser.id] ?? (inspectedUser.operator_notes || inspectedUser.coach_notes || '')}
            onNoteChange={(val) => handleUpdateNote(inspectedUser.id, val)}
            onSaveNote={() => handleSaveNoteToDb(inspectedUser.id)}
            onActivatePaid={() => handleSingleActivateClick(inspectedUser.id)}
            onGrantCourtesyMonths={(months) => handleGrantCourtesyMonths(inspectedUser, months)}
            onSetHardshipExempt={() => handleExemptStudent(inspectedUser)}
            onRevokeSubscription={() => handleRevokeSubscription(inspectedUser)}
            onDownloadReceipt={(includeFullName) => handleDownloadStudentReceipt(inspectedUser, includeFullName)}
            onRevealFullNameAudit={handleRevealFullNameAudit}
            onClose={() => setInspectedUser(null)}
          />
        )}
      </div>
    </div>
  );
};
