import React from 'react';
import { School, CreditCard, TrendingUp, Users } from 'lucide-react';
import { Invoice, PlatformSummary } from '../../types';
import { SchoolListPane } from './SchoolListPane';
import { SchoolDetailPane } from './SchoolDetailPane';
import { InvoiceArchiveTable } from './InvoiceArchiveTable';

interface InvoicesSubTabProps {
  summary: PlatformSummary;
  invoices: Invoice[];
  dbInvoices: any[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: string;
  setStatusFilter: (f: string) => void;
  expandedSchoolId: string | null;
  setExpandedSchoolId: (id: string) => void;
  masterPricing: any;
  taxMode: 'small_business' | 'standard_vat';
  schoolAudioBytes: Record<string, number>;
  expandedYears: Record<number, boolean>;
  toggleYearExpanded: (year: number) => void;
  getSchoolInvoices: (
    schoolId: string, 
    currentInvoiceAmount: number, 
    schoolStatus?: string,
    contractStartDate?: string | null,
    createdAt?: string | null,
    schoolMetrics?: any
  ) => any[];
  createManualInvoice: (schoolId: string) => void;
  handleSendInvoiceEmail: (invoice: any, inv: any) => void;
  handleExportCSV: () => void;
  setViewingInvoice: (inv: any) => void;
  setParentInfoSheetSchool: (school: any) => void;
  setShowParentInfoSheetModal: (show: boolean) => void;
  setStornoModalInvoice: (data: { invoice: any; school: any }) => void;
  updateInvoiceStatus: (invoiceId: string, newStatus: string) => void;
  toggleInvoicePaid: (schoolId: string, invoiceId: string) => void;
}

export const InvoicesSubTab: React.FC<InvoicesSubTabProps> = ({
  summary,
  invoices,
  dbInvoices,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  expandedSchoolId,
  setExpandedSchoolId,
  masterPricing,
  taxMode,
  schoolAudioBytes,
  expandedYears,
  toggleYearExpanded,
  getSchoolInvoices,
  createManualInvoice,
  handleSendInvoiceEmail,
  handleExportCSV,
  setViewingInvoice,
  setParentInfoSheetSchool,
  setShowParentInfoSheetModal,
  setStornoModalInvoice,
  updateInvoiceStatus,
  toggleInvoicePaid
}) => {
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.schoolName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedInv = invoices.find(i => i.schoolId === expandedSchoolId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Financial Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        {/* Total B2B Revenue */}
        <div className="billing-card">
          <div className="bc-icon-wrapper" style={{
            height: '44px',
            width: '44px',
            borderRadius: '12px',
            background: 'rgba(0, 0, 0, 0.03)',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.2s'
          }}>
            <School size={18} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Monatliche Bereitstellungs- &amp; Servicegebühren</span>
            <span style={{ display: 'block', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '2px', letterSpacing: '-0.02em' }}>
              {summary.totalB2BRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
        </div>

        {/* Total B2B Unpaid / Outstanding */}
        <div className="billing-card">
          <div className="bc-icon-wrapper" style={{
            height: '44px',
            width: '44px',
            borderRadius: '12px',
            background: 'rgba(202, 138, 4, 0.06)',
            color: '#ca8a04',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.2s'
          }}>
            <CreditCard size={18} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ausstehende Beträge</span>
            <span style={{ display: 'block', fontSize: '1.4rem', fontWeight: 800, color: '#ca8a04', marginTop: '2px', letterSpacing: '-0.02em' }}>
              {summary.totalUnpaid.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
        </div>

        {/* Total B2C Revenue */}
        <div className="billing-card">
          <div className="bc-icon-wrapper" style={{
            height: '44px',
            width: '44px',
            borderRadius: '12px',
            background: 'rgba(0, 0, 0, 0.03)',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.2s'
          }}>
            <TrendingUp size={18} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Schüler-Direktabrechnungen (B2C)</span>
            <span style={{ display: 'block', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '2px', letterSpacing: '-0.02em' }}>
              {summary.totalB2CRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
        </div>

        {/* Total registered students */}
        <div className="billing-card">
          <div className="bc-icon-wrapper" style={{
            height: '44px',
            width: '44px',
            borderRadius: '12px',
            background: 'rgba(0, 0, 0, 0.03)',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.2s'
          }}>
            <Users size={18} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Aktive Schüler-Bereitstellungen</span>
            <span style={{ display: 'flex', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '2px', letterSpacing: '-0.02em', alignItems: 'baseline', gap: '4px' }}>
              {summary.totalStudents} <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>aktiv</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Split-Pane Container */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.8fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* Left Pane: School List */}
        <SchoolListPane
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          filteredInvoices={filteredInvoices}
          expandedSchoolId={expandedSchoolId}
          setExpandedSchoolId={setExpandedSchoolId}
          handleExportCSV={handleExportCSV}
        />

        {/* Right Pane: School Detail & Invoices */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '24px 28px',
          border: '1px solid rgba(15, 23, 42, 0.05)',
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.015)',
          minHeight: '520px'
        }}>
          {!selectedInv ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '480px', color: '#94a3b8', textAlign: 'center' }}>
              <School size={48} style={{ marginBottom: '16px', strokeWidth: 1.2, color: '#cbd5e1' }} />
              <p style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>Keine Musikschule ausgewählt</p>
              <p style={{ fontSize: '0.8rem', margin: '4px 0 0 0' }}>Bitte wählen Sie links eine Schule aus, um deren Abrechnungs- und Abonnementdetails zu verwalten.</p>
            </div>
          ) : (
            <>
              <SchoolDetailPane
                inv={selectedInv}
                masterPricing={masterPricing}
                taxMode={taxMode}
                schoolAudioBytes={schoolAudioBytes}
                setViewingInvoice={setViewingInvoice}
                setParentInfoSheetSchool={setParentInfoSheetSchool}
                setShowParentInfoSheetModal={setShowParentInfoSheetModal}
              />

              <InvoiceArchiveTable
                inv={selectedInv}
                dbInvoices={dbInvoices}
                getSchoolInvoices={getSchoolInvoices}
                expandedYears={expandedYears}
                toggleYearExpanded={toggleYearExpanded}
                createManualInvoice={createManualInvoice}
                handleSendInvoiceEmail={handleSendInvoiceEmail}
                setViewingInvoice={setViewingInvoice}
                setStornoModalInvoice={setStornoModalInvoice}
                updateInvoiceStatus={updateInvoiceStatus}
                toggleInvoicePaid={toggleInvoicePaid}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
