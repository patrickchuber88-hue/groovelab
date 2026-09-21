import React from 'react';
import { 
  FileText, 
  Sparkles, 
  ShieldAlert, 
  ChevronUp, 
  ChevronDown, 
  Mail 
} from 'lucide-react';
import { Invoice, formatDateDisplay } from '../../types';

interface InvoiceArchiveTableProps {
  inv: Invoice;
  dbInvoices: any[];
  getSchoolInvoices: (
    schoolId: string, 
    currentInvoiceAmount: number, 
    schoolStatus?: string,
    contractStartDate?: string | null,
    createdAt?: string | null,
    schoolMetrics?: any
  ) => any[];
  expandedYears: Record<number, boolean>;
  toggleYearExpanded: (year: number) => void;
  createManualInvoice: (schoolId: string) => void;
  handleSendInvoiceEmail: (invoice: any, inv: any) => void;
  setViewingInvoice: (inv: any) => void;
  setStornoModalInvoice: (data: { invoice: any; school: any }) => void;
  updateInvoiceStatus: (invoiceId: string, newStatus: string) => void;
  toggleInvoicePaid: (schoolId: string, invoiceId: string) => void;
}

export const InvoiceArchiveTable: React.FC<InvoiceArchiveTableProps> = ({
  inv,
  dbInvoices,
  getSchoolInvoices,
  expandedYears,
  toggleYearExpanded,
  createManualInvoice,
  handleSendInvoiceEmail,
  setViewingInvoice,
  setStornoModalInvoice,
  updateInvoiceStatus,
  toggleInvoicePaid
}) => {
  const generated = getSchoolInvoices(inv.schoolId, inv.total, inv.status, inv.contractStartDate, inv.createdAt, inv);
  const dbInvs = dbInvoices.filter(i => i.school_id === inv.schoolId);
  const dbIds = new Set(dbInvs.map(i => i.id));
  const filteredGenerated = generated.filter(g => !dbIds.has(g.id));

  const allCombined = [
    ...dbInvs.map(i => ({
      id: i.id,
      billing_date: formatDateDisplay(i.billing_date),
      year: i.billing_date ? new Date(i.billing_date).getFullYear() : new Date().getFullYear(),
      amount: i.amount,
      status: i.status,
      type: i.type,
      isDb: true,
      isCurrentMonth: false,
      isTrialMonth: false
    })),
    ...filteredGenerated.map(g => ({
      id: g.id,
      billing_date: g.date,
      year: g.year ? parseInt(g.year) : new Date().getFullYear(),
      amount: g.amount,
      status: g.status === 'Bezahlt' ? 'paid' : (g.status === 'Vorschau' ? 'preview' : 'open'),
      type: g.type,
      isDb: false,
      isCurrentMonth: g.isCurrentMonth,
      isTrialMonth: g.status === 'Probemonat'
    }))
  ];

  const previewInvoices = allCombined.filter(i => i.status === 'preview' || i.status === 'Vorschau');
  const unpaidInvoices = allCombined.filter(i => (i.status === 'open' || i.status === 'overdue') && i.status !== 'preview');
  const archivedInvoices = allCombined.filter(i => i.status !== 'open' && i.status !== 'overdue' && i.status !== 'preview');

  const archivedByYear: Record<number, any[]> = {};
  archivedInvoices.forEach(i => {
    const yr = i.year || new Date().getFullYear();
    if (!archivedByYear[yr]) {
      archivedByYear[yr] = [];
    }
    archivedByYear[yr].push(i);
  });

  const sortedYears = Object.keys(archivedByYear)
    .map(Number)
    .sort((a, b) => b - a);

  const renderInvoiceCard = (invoice: any) => {
    const isPreview = invoice.status === 'preview' || invoice.status === 'Vorschau' || String(invoice.id || '').startsWith('VS-');
    const isPaid = invoice.status === 'paid' || invoice.status === 'Bezahlt';
    const isCancelled = invoice.status === 'cancelled' || invoice.status === 'Storniert';
    const isDueInvoice = !isPreview && !isPaid && !isCancelled && Number(invoice.amount || 0) > 0;

    return (
      <div 
        key={invoice.id} 
        className="receipt-card" 
        style={{ 
          opacity: invoice.status === 'cancelled' ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 16px',
          boxSizing: 'border-box',
          width: '100%'
        }}
      >
        {/* Left Group: Invoice ID, Date & Status tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', minWidth: '180px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, color: isPreview ? '#0284c7' : '#0f172a', fontSize: '0.82rem' }}>
                {isPreview ? invoice.id : (invoice.amount < 0 ? invoice.id.replace('INV-', 'GS-') : invoice.id.replace('INV-', 'RE-'))}
              </span>
              {isPreview && (
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#0284c7', background: '#e0f2fe', padding: '2px 7px', borderRadius: '4px', border: '1px solid #bae6fd', letterSpacing: '0.03em' }}>
                  Vorschau
                </span>
              )}
              {invoice.status === 'issued' && (
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#16a34a', background: '#f0fdf4', padding: '2px 7px', borderRadius: '4px', border: '1px solid #bbf7d0', letterSpacing: '0.03em' }}>
                  Zugestellt
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 550 }}>{invoice.billing_date}</span>
              <span style={{ 
                fontSize: '0.60rem', 
                fontWeight: 700, 
                color: invoice.type === 'AKT' ? '#7c3aed' : '#0284c7', 
                background: invoice.type === 'AKT' ? '#f5f3ff' : '#f0f9ff', 
                border: `1px solid ${invoice.type === 'AKT' ? '#ddd6fe' : '#bae6fd'}`,
                padding: '1px 6px', 
                borderRadius: '4px' 
              }}>
                {invoice.type === 'AKT' ? 'Schüleraktivierungen' : 'Infrastruktur & Service'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Group: Amount & Action Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginLeft: 'auto' }}>
          <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem', whiteSpace: 'nowrap' }}>
            {Number(invoice.amount || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isDueInvoice && (
              <button
                type="button"
                aria-label={inv.billingEmail ? `Rechnung per E-Mail an ${inv.billingEmail} zustellen` : 'Rechnung zustellen'}
                title={inv.billingEmail ? `Rechnung an ${inv.billingEmail} zustellen (Server-Versand oder mailto:)` : 'Rechnung zustellen (Keine E-Mail hinterlegt)'}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSendInvoiceEmail(invoice, inv);
                }}
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(0, 0, 0, 0.12)',
                  borderRadius: '8px',
                  padding: '5px 9px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease-in-out'
                }}
                onMouseOver={(e: any) => { 
                  e.currentTarget.style.background = '#f0fdf4'; 
                  e.currentTarget.style.color = '#15803d';
                  e.currentTarget.style.borderColor = '#86efac';
                }}
                onMouseOut={(e: any) => { 
                  e.currentTarget.style.background = '#ffffff'; 
                  e.currentTarget.style.color = '#475569';
                  e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.12)';
                }}
              >
                <Mail size={13} />
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setViewingInvoice({
                  invoiceId: invoice.id,
                  schoolId: inv.schoolId,
                  schoolName: inv.schoolName,
                  schoolStreet: inv.schoolStreet,
                  schoolZipCode: inv.schoolZipCode,
                  schoolCity: inv.schoolCity,
                  date: invoice.billing_date,
                  amount: invoice.amount,
                  status: isPreview ? 'Vorschau' : invoice.status,
                  type: invoice.type || (String(invoice.id).startsWith('AKT-') ? 'AKT' : 'INF'),
                  isCurrentMonth: invoice.isCurrentMonth,
                  hasCampus: inv.hasCampus,
                  hasGroovelab: inv.hasGroovelab,
                  baseFee: inv.baseFee,
                  kombiDiscountAmount: inv.kombiDiscountAmount,
                  userFee: inv.userFee,
                  activeStudentFee: inv.activeStudentFee,
                  totalTeachersCount: inv.totalTeachersCount,
                  totalEmployeesCount: inv.totalEmployeesCount,
                  passiveStudentsCount: invoice.type === 'AKT' ? 0 : inv.passiveStudentsCount,
                  activeStudents: inv.activeStudents,
                  activeCampusCount: inv.activeCampusCount,
                  activeGroovelabCount: inv.activeGroovelabCount,
                  storageAddonGb: inv.storageAddonGb,
                  storageAddonMonthlyFee: inv.storageAddonMonthlyFee,
                  subscriptionBypass: inv.subscriptionBypass,
                  subtotal: inv.subtotal,
                  studentBillingOption: inv.studentBillingOption,
                  leitwegId: inv.leitwegId || inv.leitweg_id || (inv as any).schoolLeitwegId || undefined,
                  isTrialMonth: invoice.isTrialMonth
                });
              }}
              style={{
                background: isPreview ? '#0284c7' : '#ffffff',
                border: isPreview ? 'none' : '1px solid rgba(0, 0, 0, 0.12)',
                borderRadius: '8px',
                padding: '5px 12px',
                fontSize: '0.74rem',
                fontWeight: 700,
                color: isPreview ? '#ffffff' : '#1e293b',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: isPreview ? '0 2px 6px rgba(2, 132, 199, 0.25)' : 'none',
                transition: 'all 0.15s ease-in-out'
              }}
              onMouseOver={(e: any) => { e.currentTarget.style.background = isPreview ? '#0369a1' : '#f8fafc'; }}
              onMouseOut={(e: any) => { e.currentTarget.style.background = isPreview ? '#0284c7' : '#ffffff'; }}
            >
              {isPreview ? 'Vorschau ansehen' : 'Vorschau'}
            </button>

            {/* GoBD Stornorechnung Trigger */}
            {!isPreview && invoice.amount > 0 && invoice.status !== 'cancelled' && invoice.status !== 'storniert' && (
              <button
                type="button"
                title="GoBD-konforme Stornorechnung (ST-...) erstellen"
                onClick={(e) => {
                  e.stopPropagation();
                  setStornoModalInvoice({ invoice, school: inv });
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '8px',
                  padding: '5px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#dc2626',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Storno
              </button>
            )}
            
            {!isPreview && (
              invoice.isDb ? (
                <select
                  value={invoice.status}
                  onChange={(e) => updateInvoiceStatus(invoice.id, e.target.value)}
                  style={{
                    padding: '5px 8px',
                    borderRadius: '8px',
                    border: '1px solid rgba(0, 0, 0, 0.12)',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    background: '#ffffff',
                    cursor: 'pointer',
                    color: '#334155',
                    outline: 'none'
                  }}
                >
                  <option value="open">Offen</option>
                  <option value="paid">Bezahlt</option>
                  <option value="overdue">Überfällig</option>
                  <option value="cancelled">Storniert</option>
                </select>
              ) : (
                <select
                  value={invoice.status}
                  onChange={() => toggleInvoicePaid(inv.schoolId, invoice.id)}
                  style={{
                    padding: '5px 8px',
                    borderRadius: '8px',
                    border: '1px solid rgba(0, 0, 0, 0.12)',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    background: '#ffffff',
                    cursor: 'pointer',
                    color: '#334155',
                    outline: 'none'
                  }}
                >
                  <option value="open">Offen</option>
                  <option value="paid">Bezahlt</option>
                </select>
              )
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginTop: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={16} color="#0f172a" />
          <h4 style={{ fontSize: '0.86rem', color: '#0f172a', fontWeight: 800, margin: 0 }}>
            Rechnungsjournal &amp; GoBD-Archiv
          </h4>
          <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 600 }}>
            (10 Jahre gesetzliche Archivierung)
          </span>
        </div>
        <button
          type="button"
          onClick={() => createManualInvoice(inv.schoolId)}
          style={{
            backgroundColor: '#ffffff',
            color: '#34a853',
            border: '1px solid rgba(52, 168, 83, 0.3)',
            padding: '6px 12px',
            borderRadius: '8px',
            fontWeight: 750,
            fontSize: '0.76rem',
            cursor: 'pointer',
            transition: 'all 0.15s',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
          onMouseOver={(e: any) => { e.currentTarget.style.background = '#f0fdf4'; }}
          onMouseOut={(e: any) => { e.currentTarget.style.background = '#ffffff'; }}
        >
          + Manuelle Rechnung
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto', paddingRight: '4px' }}>
        {allCombined.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#86868b', fontSize: '0.78rem', padding: '16px 0', border: '1px dashed rgba(0, 0, 0, 0.05)', borderRadius: '10px' }}>
            Keine Rechnungen vorhanden.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Floating Preview Sektion */}
            {previewInvoices.length > 0 && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                background: '#f0f9ff',
                padding: '12px 14px',
                borderRadius: '14px',
                border: '1px solid #bae6fd',
                marginBottom: '4px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', color: '#0369a1', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <Sparkles size={14} color="#0284c7" />
                  <span>Laufende Abrechnung (Vorschau / Noch nicht fällig)</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {previewInvoices.map(invoice => renderInvoiceCard(invoice))}
                </div>
              </div>
            )}

            {/* Floating Unpaid Sektion */}
            {unpaidInvoices.length > 0 && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                background: 'rgba(239, 68, 68, 0.02)',
                padding: '12px 14px',
                borderRadius: '14px',
                border: '1px dashed rgba(239, 68, 68, 0.15)',
                marginBottom: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', color: '#dc2626', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <ShieldAlert size={14} />
                  <span>Ausstehende Fällige Rechnungen ({unpaidInvoices.length})</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {unpaidInvoices.map(invoice => renderInvoiceCard(invoice))}
                </div>
              </div>
            )}

            {/* Archived Years Accordion Sektion */}
            {sortedYears.length > 0 ? (
              sortedYears.map(yr => {
                const isExpanded = expandedYears[yr] ?? false;
                const yearInvoices = archivedByYear[yr] || [];
                const summaryText = yearInvoices.length === 1 ? '1 Rechnung' : `${yearInvoices.length} Rechnungen`;

                return (
                  <div key={yr} style={{ display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid rgba(15, 23, 42, 0.05)', borderRadius: '12px', background: '#f8fafc', overflow: 'hidden' }}>
                    <div 
                      onClick={() => toggleYearExpanded(yr)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        background: '#ffffff',
                        transition: 'background 0.15s'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#0f172a' }}>Archiv {yr}</span>
                        <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>({summaryText})</span>
                      </div>
                      <div style={{ color: '#64748b', display: 'flex', alignItems: 'center' }}>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 12px', background: '#f8fafc', borderTop: '1px solid rgba(15, 23, 42, 0.03)' }}>
                        {yearInvoices.map(invoice => renderInvoiceCard(invoice))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              unpaidInvoices.length === 0 && (
                <div style={{ textAlign: 'center', color: '#86868b', fontSize: '0.78rem', padding: '16px 0', border: '1px dashed rgba(0, 0, 0, 0.05)', borderRadius: '10px' }}>
                  Keine Rechnungen vorhanden.
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};
