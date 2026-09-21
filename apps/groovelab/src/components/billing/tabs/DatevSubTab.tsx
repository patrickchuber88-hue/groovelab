import React from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Landmark, 
  ShieldCheck, 
  Users, 
  History as HistoryIcon 
} from 'lucide-react';
import { ChartOfAccounts, DATEV_ACCOUNT_MAPPINGS } from '../../../utils/datevExporter';
import { Invoice } from '../types';

interface DatevSubTabProps {
  selectedChartOfAccounts: ChartOfAccounts;
  setSelectedChartOfAccounts: (c: ChartOfAccounts) => void;
  datevPeriodMonth: number;
  setDatevPeriodMonth: (m: number) => void;
  datevPeriodYear: number;
  invoices: Invoice[];
  onDatevExport: (chart: ChartOfAccounts) => void;
}

export const DatevSubTab: React.FC<DatevSubTabProps> = ({
  selectedChartOfAccounts,
  setSelectedChartOfAccounts,
  datevPeriodMonth,
  setDatevPeriodMonth,
  datevPeriodYear,
  invoices,
  onDatevExport
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      {/* DATEV Config Banner */}
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '28px 32px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSpreadsheet size={24} color="#059669" />
            <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
              DATEV Buchungsstapel-Generator (EXTF V700)
            </h3>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            GoBD-konformer Export für Steuerberater und DATEV Unternehmen online (Standardkontenrahmen SKR03 / SKR04).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* SKR Switcher */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '10px' }}>
            {(['SKR03', 'SKR04'] as ChartOfAccounts[]).map(skr => (
              <button
                key={skr}
                type="button"
                onClick={() => setSelectedChartOfAccounts(skr)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.80rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: selectedChartOfAccounts === skr ? '#ffffff' : 'transparent',
                  color: selectedChartOfAccounts === skr ? '#059669' : '#64748b',
                  boxShadow: selectedChartOfAccounts === skr ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {skr}
              </button>
            ))}
          </div>

          {/* Month Selector */}
          <select
            value={datevPeriodMonth}
            onChange={(e) => setDatevPeriodMonth(Number(e.target.value))}
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#0f172a'
            }}
          >
            {[
              { m: 1, l: 'Januar' }, { m: 2, l: 'Februar' }, { m: 3, l: 'März' },
              { m: 4, l: 'April' }, { m: 5, l: 'Mai' }, { m: 6, l: 'Juni' },
              { m: 7, l: 'Juli' }, { m: 8, l: 'August' }, { m: 9, l: 'September' },
              { m: 10, l: 'Oktober' }, { m: 11, l: 'November' }, { m: 12, l: 'Dezember' }
            ].map(item => (
              <option key={item.m} value={item.m}>{item.l} {datevPeriodYear}</option>
            ))}
          </select>

          {/* Download CTA */}
          <button
            onClick={() => onDatevExport(selectedChartOfAccounts)}
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              background: '#ea4335',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.86rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(234, 67, 53, 0.25)'
            }}
            className="hover-scale-mini"
          >
            <Download size={16} /> CSV-Buchungsstapel herunterladen
          </button>
        </div>
      </div>

      {/* Account Mapping Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px'
      }}>
        {(() => {
          const map = DATEV_ACCOUNT_MAPPINGS[selectedChartOfAccounts];
          return [
            { title: 'Erlöskonto (SaaS Hosting 19%)', acc: map.revenue19, icon: Landmark, note: 'Regelbesteuerung (19% MwSt)', color: '#059669' },
            { title: 'Erlöskonto (Steuerfrei)', acc: map.revenueExempt, icon: ShieldCheck, note: 'Kleinunternehmer-Regelung', color: '#0284c7' },
            { title: 'Debitoren-Sammelkonto', acc: map.debtorsCollective, icon: Users, note: 'Forderungen aus L+L Schulträger', color: '#7c3aed' },
            { title: 'Passive Rechnungsabgrenzung (PRAP)', acc: map.prapDeferredRevenue, icon: HistoryIcon, note: 'Periodengerechte Abgrenzung / IFRS 15', color: '#d97706' }
          ].map((c, i) => {
            const Icon = c.icon;
            return (
              <div key={i} style={{ background: '#ffffff', padding: '20px', borderRadius: '18px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>{c.title}</span>
                  <Icon size={16} color={c.color} />
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: c.color, fontFamily: 'monospace' }}>
                  {c.acc}
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{c.note}</span>
              </div>
            );
          });
        })()}
      </div>

      {/* Live Preview Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '24px 28px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 850, color: '#0f172a' }}>
          Vorschau Buchungsstapel ({selectedChartOfAccounts} • {String(datevPeriodMonth).padStart(2, '0')}/{datevPeriodYear})
        </h4>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.80rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '10px 14px', fontWeight: 800 }}>Belegdatum</th>
                <th style={{ padding: '10px 14px', fontWeight: 800 }}>Belegfeld 1 (Rechnungsnr.)</th>
                <th style={{ padding: '10px 14px', fontWeight: 800 }}>Konto</th>
                <th style={{ padding: '10px 14px', fontWeight: 800 }}>Gegenkonto</th>
                <th style={{ padding: '10px 14px', fontWeight: 800, textAlign: 'right' }}>Betrag</th>
                <th style={{ padding: '10px 14px', fontWeight: 800 }}>S/H</th>
                <th style={{ padding: '10px 14px', fontWeight: 800 }}>Buchungstext</th>
                <th style={{ padding: '10px 14px', fontWeight: 800 }}>GoBD Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.filter(inv => inv.total > 0).map((inv, idx) => {
                const map = DATEV_ACCOUNT_MAPPINGS[selectedChartOfAccounts];
                const numId = inv.schoolId ? inv.schoolId.replace(/[^0-9]/g, '').substring(0, 3) || '104' : '104';
                const yy = String(datevPeriodYear).slice(-2);
                const mm = String(datevPeriodMonth).padStart(2, '0');
                const invId = `RE-${numId}-${yy}${mm}-01`;

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>28.{mm}.{datevPeriodYear}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>{invId}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#059669', fontFamily: 'monospace' }}>{map.revenueExempt}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#7c3aed', fontFamily: 'monospace' }}>{map.debtorsCollective}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 800, textAlign: 'right', color: '#0f172a' }}>{inv.total.toFixed(2).replace('.', ',')} €</td>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: '#059669' }}>H</td>
                    <td style={{ padding: '10px 14px', color: '#334155' }}>Cloud-Hosting {inv.schoolName}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '6px', background: '#dcfce7', color: '#15803d', fontWeight: 800 }}>
                        Festgeschrieben (1)
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
