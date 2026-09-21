import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import { ParentInfoSheetModal } from './modals/ParentInfoSheetModal';
import { downloadCsvFile } from '../utils/csvHelper';
import { logSecurityEvent } from '../services/auditLogService';
import { 
  Landmark, 
  FileSpreadsheet, 
  UploadCloud, 
  Download, 
  RefreshCw, 
  FileText, 
  ScrollText, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Check,
  ShieldAlert
} from 'lucide-react';

import { FinanceSubTab, getSchoolNumericId } from './billing/types';
import { useBillingData } from './billing/hooks/useBillingData';
import { useTariffLedger } from './billing/hooks/useTariffLedger';
import { useDatevExport } from './billing/hooks/useDatevExport';
import { useBankReconciliation } from './billing/hooks/useBankReconciliation';
import { useSepaExport } from './billing/hooks/useSepaExport';
import { useDunning } from './billing/hooks/useDunning';

import { InvoicesSubTab } from './billing/tabs/InvoicesSubTab/InvoicesSubTab';
import { DatevSubTab } from './billing/tabs/DatevSubTab';
import { LedgerSubTab } from './billing/tabs/LedgerSubTab';
import { BankingSubTab } from './billing/tabs/BankingSubTab';
import { PrapSubTab } from './billing/tabs/PrapSubTab';
import { DunningSubTab } from './billing/tabs/DunningSubTab';

import { InvoiceStornoModal } from './billing/modals/InvoiceStornoModal';
import { TariffBookingStornoModal } from './billing/modals/TariffBookingStornoModal';
import { TariffBookingDetailDrawer } from './billing/modals/TariffBookingDetailDrawer';
import { CamtUploadModal } from './billing/modals/CamtUploadModal';
import { SepaExportModal } from './billing/modals/SepaExportModal';
import { InvoiceDispatchModal } from './billing/modals/InvoiceDispatchModal';

export function BillingDashboard({ preselectedSchoolId }: { preselectedSchoolId?: string }) {
  // 1. Central Toast & Navigation State
  const [activeFinanceSubTab, setActiveFinanceSubTab] = useState<FinanceSubTab>('invoices');
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [emailSentToast, setEmailSentToast] = useState<string | null>(null);

  const showActionToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 4000);
  };

  // 2. Core Billing Data & Master Pricing Hook
  const {
    masterPricing,
    invoices,
    dbInvoices,
    summary,
    loading,
    error,
    expandedSchoolId,
    setExpandedSchoolId,
    schoolAudioBytes,
    taxMode,
    operatorCompany,
    operatorContact,
    operatorStreet,
    operatorZip,
    operatorCity,
    operatorIban,
    operatorBic,
    fetchBillingData,
    getPaidInvoices,
    toggleInvoicePaid,
    updateInvoiceStatus,
    getSchoolInvoices
  } = useBillingData(preselectedSchoolId);

  // 3. Tariff Ledger Hook
  const {
    allTariffBookings,
    loadingTariffBookings,
    ledgerSearchQuery,
    setLedgerSearchQuery,
    ledgerTypeFilter,
    setLedgerTypeFilter,
    ledgerSchoolFilter,
    setLedgerSchoolFilter,
    ledgerDateFilter,
    setLedgerDateFilter,
    copiedReceiptId,
    selectedBookingForDrawer,
    setSelectedBookingForDrawer,
    stornoModalBooking,
    setStornoModalBooking,
    tariffStornoReason,
    setTariffStornoReason,
    processingTariffStorno,
    fetchAllTariffBookings,
    handleCopyReceipt,
    handleExecuteTariffStorno,
    handleExportLedgerCsv
  } = useTariffLedger(showActionToast);

  // 4. DATEV Export Hook
  const {
    selectedChartOfAccounts,
    setSelectedChartOfAccounts,
    datevPeriodMonth,
    setDatevPeriodMonth,
    datevPeriodYear,
    handleDatevExport
  } = useDatevExport(showActionToast);

  // 5. Banking & CAMT.053 Hook
  const {
    camtUploadModalOpen,
    setCamtUploadModalOpen,
    camtRawInput,
    setCamtRawInput,
    camtParsedResult,
    setCamtParsedResult,
    camtApplying,
    isDraggingBankFile,
    setIsDraggingBankFile,
    bankFileDetails,
    setBankFileDetails,
    showManualPaste,
    setShowManualPaste,
    bankFileInputRef,
    handleBankFileUpload,
    handleBankFileDrop,
    handleProcessBankStatement,
    handleApplyCamtBookings
  } = useBankReconciliation(showActionToast, setActiveFinanceSubTab);

  // 6. SEPA Lastschrift Export Hook
  const {
    sepaExportModalOpen,
    setSepaExportModalOpen,
    sepaCreditorId,
    setSepaCreditorId,
    sepaCollectionDate,
    setSepaCollectionDate,
    handleExportSepaXml
  } = useSepaExport(showActionToast);

  // 7. Dunning & E-Mail Dispatch Hook
  const {
    handleSendDunningEmail,
    handleSendInvoiceEmail,
    dispatchModalTarget,
    handleCloseDispatchModal,
  } = useDunning(showActionToast);

  // 8. Invoices Sub-Tab Filter & Accordion State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({
    [new Date().getFullYear()]: true
  });

  const toggleYearExpanded = (year: number) => {
    setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
  };

  // Modals Local State
  const [viewingInvoice, setViewingInvoice] = useState<any>(null);
  const [showParentInfoSheetModal, setShowParentInfoSheetModal] = useState(false);
  const [parentInfoSheetSchool, setParentInfoSheetSchool] = useState<any>(null);
  const [stornoModalInvoice, setStornoModalInvoice] = useState<any | null>(null);

  // Manual Invoice Creation
  const createManualInvoice = async (schoolId: string) => {
    const amountStr = prompt("Geben Sie den Rechnungsbetrag ein (z.B. 49,90):");
    if (!amountStr) return;
    const amount = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(amount)) return alert("Ungültiger Betrag!");

    const title = prompt("Verwendungszweck / Name der Position:", "Manuelle Abrechnung / Korrektur");
    if (!title) return;

    try {
      const schoolNumericId = getSchoolNumericId(schoolId);
      const now = new Date();
      const yearShort = String(now.getFullYear()).slice(-2);
      const monthStr = String(now.getMonth() + 1).padStart(2, '0');
      const prefix = amount < 0 ? 'GS' : 'RE';

      const { data: existingInvoices } = await supabase
        .from('invoices')
        .select('id')
        .eq('school_id', schoolId);

      const matchPattern = `${prefix}-${schoolNumericId}-${yearShort}${monthStr}`;
      const countForPeriod = existingInvoices
        ? existingInvoices.filter(inv => inv.id.startsWith(matchPattern)).length
        : 0;

      const seqStr = String(countForPeriod + 1).padStart(2, '0');
      const invoiceId = `${prefix}-${schoolNumericId}-${yearShort}${monthStr}-${seqStr}`;

      const today = new Date().toISOString().split('T')[0];
      const due = new Date();
      due.setDate(due.getDate() + 14);
      const dueDate = due.toISOString().split('T')[0];

      // GoBD Prüfsiegel gem. §§ 146, 147 AO
      const gobdPayload = `${invoiceId}:${schoolId}:${amount}:${today}:${dueDate}`;
      let sha256Seal = '';
      try {
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(gobdPayload));
        sha256Seal = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {
        sha256Seal = invoiceId;
      }

      const { error: insertError } = await supabase.from('invoices').insert({
        id: invoiceId,
        school_id: schoolId,
        type: 'INF',
        amount: amount,
        status: 'open',
        billing_date: today,
        due_date: dueDate,
        items: [
          {
            name: title,
            quantity: 1,
            unit: 'Pauschale',
            unitPrice: amount,
            amount: amount,
            gobd_snapshot: {
              invoice_id: invoiceId,
              school_id: schoolId,
              amount,
              billing_date: today,
              due_date: dueDate,
              sha256_seal: sha256Seal,
              created_at: new Date().toISOString()
            }
          }
        ]
      });

      if (insertError) throw insertError;
      alert("Rechnung erfolgreich angelegt: " + invoiceId);
      fetchBillingData();
    } catch (err: any) {
      alert("Fehler beim Erstellen der Rechnung: " + err.message);
    }
  };

  const handleExportCSV = () => {
    const filtered = invoices.filter(inv => {
      const matchesSearch = inv.schoolName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    const headers = [
      'Musikschule',
      'Abo-Status',
      'Gesamt Schueler',
      'Gesamt Lehrer',
      'Aktive Campus-Bereitstellungen',
      'Bypass Aktiv',
      'Server-Grundpreis (EUR)',
      'Kombi-Rabatt (EUR)',
      'Lehrer-Servicegebuehr (EUR)',
      'Aktivierungsgebuehr Schueler (EUR)',
      'Monats-Soll gesamt (EUR)'
    ];

    const rows = filtered.map(inv => [
      inv.schoolName,
      inv.status === 'trial' ? 'Probezeit' : inv.status === 'suspended' ? 'Gesperrt' : inv.status === 'bypass' ? 'Bypass' : 'Aktiv',
      inv.totalStudents,
      inv.totalTeachers,
      inv.premiumStudents,
      inv.subscriptionBypass ? 'Ja' : 'Nein',
      inv.baseFee.toFixed(2),
      inv.kombiDiscountAmount.toFixed(2),
      inv.userFee.toFixed(2),
      inv.activeStudentFee.toFixed(2),
      inv.total.toFixed(2)
    ]);

    const fileName = `Abrechnungsliste_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCsvFile(fileName, headers, rows, ';');

    logSecurityEvent({
      action: 'EXPORT_BILLING_CSV',
      metadata: { rowCount: rows.length, fileName }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', width: '100%', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Dynamic styles injector */}
      <style>{`
        .billing-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.04);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: default;
        }
        .billing-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px -4px rgba(0, 0, 0, 0.07);
          border-color: #cbd5e1;
        }
        .billing-card:hover .bc-icon-wrapper {
          background: #f1f5f9 !important;
          color: #0f172a !important;
        }
 
        .filter-btn {
          padding: 8px 14px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.8rem;
          border: 1px solid rgba(0, 0, 0, 0.05);
          background: rgba(255, 255, 255, 0.6);
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          justifyContent: center;
        }
        .filter-btn:hover {
          background: #ffffff;
          color: #0f172a;
          border-color: rgba(0, 0, 0, 0.1);
        }
        .filter-btn-active {
          background: #34a853 !important;
          color: #ffffff !important;
          border-color: #34a853 !important;
          box-shadow: 0 4px 10px rgba(52, 168, 83, 0.15);
        }
        
        .school-list-item:hover {
          transform: translateY(-1px);
          border-color: rgba(52, 168, 83, 0.15) !important;
          background: rgba(255, 255, 255, 0.95) !important;
        }

        .receipt-card {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid rgba(15, 23, 42, 0.06);
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justifyContent: space-between;
          transition: all 0.2s;
        }
        .receipt-card:hover {
          border-color: rgba(15, 23, 42, 0.15);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.02);
        }
      `}</style>

      {/* Action Toast Feedback */}
      {actionToast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 999999,
          background: '#0f172a',
          color: '#ffffff',
          padding: '14px 22px',
          borderRadius: '14px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          fontSize: '0.88rem',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          border: '1px solid rgba(255,255,255,0.15)'
        }} className="animate-fade-in">
          <CheckCircle size={18} color="#10b981" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* Page Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
        paddingBottom: '20px',
        gap: '20px',
        flexWrap: 'wrap'
      }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: '"Outfit", sans-serif' }}>
            <Landmark style={{ color: '#ea4335' }} size={28} /> Finance &amp; Accounting Suite
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 550 }}>
            GoBD-konformes Rechnungsjournal, DATEV SKR03/04 Buchungsstapel, CAMT.053 Bankabgleich und OPOS-Mahnwesen.
          </p>
        </div>
        
        {/* Enterprise Actions Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* DATEV Export Button */}
          <button
            onClick={() => handleDatevExport(selectedChartOfAccounts, invoices, getSchoolInvoices, operatorCompany)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#ffffff',
              border: '1.5px solid #ea4335',
              borderRadius: '12px',
              padding: '10px 16px',
              fontWeight: 800,
              fontSize: '0.84rem',
              color: '#ea4335',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(234, 67, 53, 0.08)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            className="hover-scale-mini"
          >
            <FileSpreadsheet size={16} />
            DATEV Export ({selectedChartOfAccounts})
          </button>

          {/* CAMT.053 Bankabgleich Button */}
          <button
            onClick={() => setCamtUploadModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#ffffff',
              border: '1px solid rgba(15, 23, 42, 0.12)',
              borderRadius: '12px',
              padding: '10px 16px',
              fontWeight: 800,
              fontSize: '0.84rem',
              color: '#334155',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
              transition: 'all 0.2s'
            }}
            className="hover-scale-mini"
          >
            <UploadCloud size={16} />
            CAMT.053 Bank-Import
          </button>

          {/* SEPA Lastschriften XML */}
          <button
            onClick={() => setSepaExportModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#ffffff',
              border: '1px solid rgba(15, 23, 42, 0.12)',
              borderRadius: '12px',
              padding: '10px 16px',
              fontWeight: 800,
              fontSize: '0.84rem',
              color: '#334155',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
              transition: 'all 0.2s'
            }}
            className="hover-scale-mini"
          >
            <Download size={16} />
            SEPA XML (pain.008)
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => {
              fetchBillingData();
              fetchAllTariffBookings();
            }}
            disabled={loading || loadingTariffBookings}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#ffffff',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              borderRadius: '12px',
              padding: '10px 16px',
              fontWeight: 800,
              fontSize: '0.84rem',
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)'
            }}
            className="hover-scale-mini"
          >
            <RefreshCw size={14} className={loading || loadingTariffBookings ? 'animate-spin' : ''} />
            Aktualisieren
          </button>
        </div>
      </div>

      {/* Enterprise Sub-Tab Navigation Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: '#f8fafc',
        padding: '6px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        flexWrap: 'wrap'
      }}>
        {[
          { id: 'invoices', label: 'Rechnungsjournal & Mandanten', icon: FileText, count: invoices.length },
          { id: 'ledger', label: 'Buchungsjournal & Tarife', icon: ScrollText, count: allTariffBookings.length },
          { id: 'datev', label: 'DATEV & Erlöskonten (SKR03/04)', icon: FileSpreadsheet },
          { id: 'banking', label: 'Bankabgleich & SEPA pain.008', icon: Landmark },
          { id: 'prap', label: 'PRAP & Erlösabgrenzung (HGB/IFRS)', icon: TrendingUp },
          { id: 'dunning', label: 'OPOS & Mahnwesen', icon: AlertTriangle, count: summary.totalUnpaid > 0 ? `Offen: ${summary.totalUnpaid.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}` : undefined }
        ].map((tab) => {
          const isActive = activeFinanceSubTab === tab.id;
          const IconComp = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFinanceSubTab(tab.id as any)}
              style={{
                padding: '9px 16px',
                borderRadius: '10px',
                border: 'none',
                background: isActive ? '#ffffff' : 'transparent',
                color: isActive ? '#0f172a' : '#64748b',
                fontWeight: isActive ? 850 : 650,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              className="hover-scale-mini"
            >
              <IconComp size={15} color={isActive ? '#ea4335' : '#64748b'} />
              <span>{tab.label}</span>
              {tab.count && (
                <span style={{
                  fontSize: '0.70rem',
                  padding: '2px 7px',
                  borderRadius: '8px',
                  background: isActive ? '#fee2e2' : '#e2e8f0',
                  color: isActive ? '#ea4335' : '#475569',
                  fontWeight: 800
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#ea4335',
          backgroundColor: '#fce8e6',
          border: '1px solid rgba(234, 67, 53, 0.2)',
          padding: '14px',
          borderRadius: '12px',
          fontSize: '0.85rem',
          fontWeight: 600
        }}>
          <ShieldAlert size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* 📄 SUB-TAB 1: RECHNUNGSJOURNAL & MANDANTEN */}
      {activeFinanceSubTab === 'invoices' && (
        <InvoicesSubTab
          summary={summary}
          invoices={invoices}
          dbInvoices={dbInvoices}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          expandedSchoolId={expandedSchoolId}
          setExpandedSchoolId={setExpandedSchoolId}
          masterPricing={masterPricing}
          taxMode={taxMode}
          schoolAudioBytes={schoolAudioBytes}
          expandedYears={expandedYears}
          toggleYearExpanded={toggleYearExpanded}
          getSchoolInvoices={getSchoolInvoices}
          createManualInvoice={createManualInvoice}
          handleSendInvoiceEmail={(invoice, inv) => handleSendInvoiceEmail(
            invoice, 
            inv, 
            { operatorCompany, operatorContact, operatorStreet, operatorZip, operatorCity, operatorIban, operatorBic }, 
            setEmailSentToast
          )}
          handleExportCSV={handleExportCSV}
          setViewingInvoice={setViewingInvoice}
          setParentInfoSheetSchool={setParentInfoSheetSchool}
          setShowParentInfoSheetModal={setShowParentInfoSheetModal}
          setStornoModalInvoice={setStornoModalInvoice}
          updateInvoiceStatus={updateInvoiceStatus}
          toggleInvoicePaid={toggleInvoicePaid}
        />
      )}

      {/* 📊 SUB-TAB 2: DATEV & ERLÖSKONTEN */}
      {activeFinanceSubTab === 'datev' && (
        <DatevSubTab
          selectedChartOfAccounts={selectedChartOfAccounts}
          setSelectedChartOfAccounts={setSelectedChartOfAccounts}
          datevPeriodMonth={datevPeriodMonth}
          setDatevPeriodMonth={setDatevPeriodMonth}
          datevPeriodYear={datevPeriodYear}
          invoices={invoices}
          onDatevExport={(chart) => handleDatevExport(chart, invoices, getSchoolInvoices, operatorCompany)}
        />
      )}

      {/* 📜 SUB-TAB 6: BUCHUNGSJOURNAL & TARIFE */}
      {activeFinanceSubTab === 'ledger' && (
        <LedgerSubTab
          allTariffBookings={allTariffBookings}
          loadingTariffBookings={loadingTariffBookings}
          invoices={invoices}
          ledgerSearchQuery={ledgerSearchQuery}
          setLedgerSearchQuery={setLedgerSearchQuery}
          ledgerSchoolFilter={ledgerSchoolFilter}
          setLedgerSchoolFilter={setLedgerSchoolFilter}
          ledgerTypeFilter={ledgerTypeFilter}
          setLedgerTypeFilter={setLedgerTypeFilter}
          ledgerDateFilter={ledgerDateFilter}
          setLedgerDateFilter={setLedgerDateFilter}
          copiedReceiptId={copiedReceiptId}
          onRefresh={() => fetchAllTariffBookings()}
          onExportCsv={(filtered) => handleExportLedgerCsv(invoices, filtered)}
          onCopyReceipt={handleCopyReceipt}
          onSelectBookingForDrawer={setSelectedBookingForDrawer}
        />
      )}

      {/* 🏦 SUB-TAB 3: BANKING & SEPA */}
      {activeFinanceSubTab === 'banking' && (
        <BankingSubTab
          bankFileInputRef={bankFileInputRef}
          isDraggingBankFile={isDraggingBankFile}
          setIsDraggingBankFile={setIsDraggingBankFile}
          bankFileDetails={bankFileDetails}
          setBankFileDetails={setBankFileDetails}
          showManualPaste={showManualPaste}
          setShowManualPaste={setShowManualPaste}
          camtRawInput={camtRawInput}
          setCamtRawInput={setCamtRawInput}
          camtParsedResult={camtParsedResult}
          setCamtParsedResult={setCamtParsedResult}
          camtApplying={camtApplying}
          sepaCreditorId={sepaCreditorId}
          sepaCollectionDate={sepaCollectionDate}
          totalUnpaid={summary.totalUnpaid}
          handleBankFileUpload={handleBankFileUpload}
          handleBankFileDrop={handleBankFileDrop}
          handleProcessBankStatement={handleProcessBankStatement}
          handleApplyCamtBookings={() => handleApplyCamtBookings(invoices, fetchBillingData)}
          onExportSepaXml={() => handleExportSepaXml(invoices, getPaidInvoices, operatorCompany, operatorIban, operatorBic)}
        />
      )}

      {/* 📈 SUB-TAB 4: PRAP & PERIODENABGRENZUNG */}
      {activeFinanceSubTab === 'prap' && (
        <PrapSubTab totalMonthlyRevenue={summary.totalMonthlyRevenue} />
      )}

      {/* ⚠️ SUB-TAB 5: OPOS & MAHNWESEN */}
      {activeFinanceSubTab === 'dunning' && (
        <DunningSubTab
          invoices={invoices}
          totalUnpaid={summary.totalUnpaid}
          getPaidInvoices={getPaidInvoices}
          onSendDunningEmail={(invoice, inv, level) => handleSendDunningEmail(invoice, inv, level, { operatorCompany, operatorIban, operatorBic })}
        />
      )}

      {/* Modale & Drawers */}
      <InvoiceStornoModal
        stornoModalInvoice={stornoModalInvoice}
        onClose={() => setStornoModalInvoice(null)}
        onSuccess={() => fetchBillingData()}
        showActionToast={showActionToast}
        getPaidInvoices={getPaidInvoices}
      />

      <TariffBookingStornoModal
        stornoModalBooking={stornoModalBooking}
        tariffStornoReason={tariffStornoReason}
        setTariffStornoReason={setTariffStornoReason}
        processingTariffStorno={processingTariffStorno}
        onClose={() => setStornoModalBooking(null)}
        onExecuteTariffStorno={handleExecuteTariffStorno}
      />

      <TariffBookingDetailDrawer
        selectedBookingForDrawer={selectedBookingForDrawer}
        onClose={() => setSelectedBookingForDrawer(null)}
        onStornoTrigger={(b) => {
          setStornoModalBooking(b);
          setTariffStornoReason(`GoBD-Korrektur zu Beleg ${b.receipt_number}`);
        }}
        invoices={invoices}
        allTariffBookings={allTariffBookings}
      />

      <CamtUploadModal
        isOpen={camtUploadModalOpen}
        onClose={() => setCamtUploadModalOpen(false)}
        isDraggingBankFile={isDraggingBankFile}
        setIsDraggingBankFile={setIsDraggingBankFile}
        bankFileInputRef={bankFileInputRef}
        handleBankFileDrop={handleBankFileDrop}
        camtRawInput={camtRawInput}
        setCamtRawInput={setCamtRawInput}
        handleProcessBankStatement={handleProcessBankStatement}
        setActiveFinanceSubTab={setActiveFinanceSubTab}
      />

      <SepaExportModal
        isOpen={sepaExportModalOpen}
        onClose={() => setSepaExportModalOpen(false)}
        sepaCreditorId={sepaCreditorId}
        setSepaCreditorId={setSepaCreditorId}
        sepaCollectionDate={sepaCollectionDate}
        setSepaCollectionDate={setSepaCollectionDate}
        onExportSepaXml={() => handleExportSepaXml(invoices, getPaidInvoices, operatorCompany, operatorIban, operatorBic)}
      />

      {viewingInvoice && (
        <InvoicePreviewModal
          invoice={{
            id: viewingInvoice.invoiceId,
            date: viewingInvoice.date,
            amount: viewingInvoice.amount,
            status: viewingInvoice.status,
            type: viewingInvoice.type,
            isCurrentMonth: viewingInvoice.isCurrentMonth,
            hasCampus: viewingInvoice.hasCampus,
            hasGroovelab: viewingInvoice.hasGroovelab,
            totalTeachersCount: viewingInvoice.totalTeachersCount,
            passiveStudentsCount: viewingInvoice.passiveStudentsCount,
            activeCampusCount: viewingInvoice.activeCampusCount,
            activeGroovelabCount: viewingInvoice.activeGroovelabCount,
            storageAddonGb: viewingInvoice.storageAddonGb,
            storageAddonMonthlyFee: viewingInvoice.storageAddonMonthlyFee,
            activationsCount: viewingInvoice.activeStudents,
            activeStudentFee: viewingInvoice.activeStudentFee,
            subscriptionBypass: viewingInvoice.subscriptionBypass,
            isTrialMonth: viewingInvoice.isTrialMonth
          }}
          schoolName={viewingInvoice.schoolName}
          schoolStreet={viewingInvoice.schoolStreet}
          schoolZipCode={viewingInvoice.schoolZipCode}
          schoolCity={viewingInvoice.schoolCity}
          operatorCompany={operatorCompany}
          operatorContact={operatorContact}
          operatorStreet={operatorStreet}
          operatorZip={operatorZip}
          operatorCity={operatorCity}
          operatorIban={operatorIban}
          operatorBic={operatorBic}
          billingPayer={['both', 'debit', 'cash', 'option1'].includes(viewingInvoice.studentBillingOption) ? 'student' : 'school'}
          studentBillingOption={viewingInvoice.studentBillingOption}
          leitwegId={viewingInvoice.leitwegId || undefined}
          onClose={() => setViewingInvoice(null)}
        />
      )}

      {/* Floating E-Mail Dispatch Toast Feedback */}
      {emailSentToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#0f172a',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '14px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 9999,
          fontSize: '0.82rem',
          fontWeight: 700,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={14} color="#ffffff" strokeWidth={3} />
          </div>
          <span>{emailSentToast}</span>
        </div>
      )}

      {/* Personalisierbares Eltern-Informationsblatt (PDF) Modal */}
      <ParentInfoSheetModal
        isOpen={showParentInfoSheetModal}
        onClose={() => {
          setShowParentInfoSheetModal(false);
          setParentInfoSheetSchool(null);
        }}
        schoolData={parentInfoSheetSchool || {
          name: 'Unsere Musikschule',
          subdomain: '',
          logo_url: '',
          city: '',
          student_billing_option: 'school_all',
          email: ''
        }}
        activePlatformDefault="campus"
      />

      {/* 🏛️ 1% Goldstandard B2B Rechnungszustellungs-Modal (Hetzner SMTP & GoBD SHA-256) */}
      <InvoiceDispatchModal
        isOpen={Boolean(dispatchModalTarget)}
        invoice={dispatchModalTarget?.invoice || null}
        inv={dispatchModalTarget?.inv || null}
        operator={{ operatorCompany, operatorContact, operatorStreet, operatorZip, operatorCity, operatorIban, operatorBic }}
        onClose={handleCloseDispatchModal}
        onDispatchSuccess={() => {
          fetchBillingData();
        }}
        showActionToast={showActionToast}
      />
    </div>
  );
}
