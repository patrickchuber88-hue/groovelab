import React from 'react';
import { FileText, Download, Landmark, HardDrive, Info, AlertTriangle } from 'lucide-react';
import { Invoice } from '../../types';

interface SchoolDetailPaneProps {
  inv: Invoice;
  masterPricing: any;
  taxMode: 'small_business' | 'standard_vat';
  schoolAudioBytes: Record<string, number>;
  setViewingInvoice: (inv: any) => void;
  setParentInfoSheetSchool: (school: any) => void;
  setShowParentInfoSheetModal: (show: boolean) => void;
}

export const SchoolDetailPane: React.FC<SchoolDetailPaneProps> = ({
  inv,
  masterPricing,
  taxMode,
  schoolAudioBytes,
  setViewingInvoice,
  setParentInfoSheetSchool,
  setShowParentInfoSheetModal
}) => {
  const isSelbstzahler = ['both', 'debit', 'cash', 'option1'].includes(inv.studentBillingOption);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Section: School details & primary status info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: `linear-gradient(135deg, #34a853 0%, #2e7d32 100%)`,
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: '1rem'
          }}>
            {inv.schoolName?.[0] || 'S'}
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: '"Outfit", sans-serif' }}>{inv.schoolName}</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 550 }}>
              {inv.schoolZipCode} {inv.schoolCity} {inv.schoolStreet ? `• ${inv.schoolStreet}` : ''}
            </p>
          </div>
        </div>

        <span style={{
          fontSize: '0.68rem',
          fontWeight: 800,
          padding: '4px 10px',
          borderRadius: '20px',
          background: inv.status === 'trial' ? '#fef3c7' : inv.status === 'bypass' ? '#f3e8ff' : inv.status === 'suspended' ? '#fee2e2' : '#e6f4ea',
          color: inv.status === 'trial' ? '#b45309' : inv.status === 'bypass' ? '#7e22ce' : inv.status === 'suspended' ? '#dc2626' : '#137333',
          border: `1px solid ${inv.status === 'trial' ? '#fde68a' : inv.status === 'bypass' ? '#e9d5ff' : inv.status === 'suspended' ? '#fca5a5' : '#ceead6'}`,
          letterSpacing: '0.04em'
        }}>
          Abonnement: {inv.status === 'trial' ? 'Probezeit' : inv.status === 'bypass' ? 'Gebühren-Bypass' : inv.status === 'suspended' ? 'Gesperrt' : 'Aktiv'}
        </span>
      </div>

      {/* Apple HIG Quick Action Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
        background: '#f8fafc',
        padding: '12px 16px',
        borderRadius: '16px',
        border: '1px solid #e2e8f0'
      }}>
        {/* Button 1: Monatsrechnung PDF Vorschau */}
        <button
          type="button"
          onClick={() => {
            const today = new Date();
            const yymm = `${String(today.getFullYear()).slice(2)}${String(today.getMonth() + 1).padStart(2, '0')}`;
            const invNumber = `RE-${(inv.schoolId || 'SCH').slice(0, 8).toUpperCase()}-${yymm}-01`;
            setViewingInvoice({
              invoiceId: invNumber,
              schoolId: inv.schoolId,
              schoolName: inv.schoolName,
              schoolStreet: inv.schoolStreet,
              schoolZipCode: inv.schoolZipCode,
              schoolCity: inv.schoolCity,
              date: today.toISOString(),
              amount: inv.total,
              status: 'Vorschau',
              type: 'INF',
              isCurrentMonth: true,
              hasCampus: inv.hasCampus,
              hasGroovelab: inv.hasGroovelab,
              baseFee: inv.baseFee,
              kombiDiscountAmount: inv.kombiDiscountAmount,
              userFee: inv.userFee,
              activeStudentFee: inv.activeStudentFee,
              totalTeachersCount: inv.totalTeachersCount,
              totalEmployeesCount: inv.totalEmployeesCount,
              passiveStudentsCount: inv.passiveStudentsCount,
              activeStudents: inv.activeStudents,
              activeCampusCount: inv.activeCampusCount,
              activeGroovelabCount: inv.activeGroovelabCount,
              storageAddonGb: inv.storageAddonGb,
              storageAddonMonthlyFee: inv.storageAddonMonthlyFee,
              subscriptionBypass: inv.subscriptionBypass,
              subtotal: inv.subtotal,
              studentBillingOption: inv.studentBillingOption,
              leitwegId: inv.leitwegId || inv.leitweg_id || (inv as any).schoolLeitwegId || undefined,
              isTrialMonth: inv.status === 'trial'
            });
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '10px',
            background: '#0f172a',
            color: '#ffffff',
            border: 'none',
            fontSize: '0.80rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.12)',
            transition: 'all 0.15s ease'
          }}
          className="hover-scale-mini"
        >
          <FileText size={15} />
          <span>Monatsrechnung (PDF Vorschau)</span>
        </button>

        {/* Button 2: Eltern-Infoblatt PDF */}
        <button
          type="button"
          onClick={() => {
            setParentInfoSheetSchool({
              name: inv.schoolName || 'Unsere Musikschule',
              subdomain: (inv as any).schoolSubdomain || '',
              logo_url: (inv as any).schoolLogoUrl || '',
              city: inv.schoolCity || '',
              student_billing_option: inv.studentBillingOption || 'school_all',
              email: (inv as any).schoolEmail || ''
            });
            setShowParentInfoSheetModal(true);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '10px',
            background: '#ffffff',
            color: '#059669',
            border: '1px solid #a7f3d0',
            fontSize: '0.80rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(5, 150, 105, 0.08)',
            transition: 'all 0.15s ease'
          }}
          className="hover-scale-mini"
        >
          <Download size={14} />
          <span>Eltern-Infoblatt (PDF)</span>
        </button>

        {/* Info Badge: Abrechnungsmodus */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          borderRadius: '10px',
          background: '#ffffff',
          color: '#475569',
          border: '1px solid #e2e8f0',
          fontSize: '0.78rem',
          fontWeight: 700
        }}>
          <Landmark size={14} color="#0284c7" />
          <span>Modell: {isSelbstzahler ? 'Direktabrechnung (Eltern)' : 'Sammelzahler (Musikschule)'}</span>
        </div>
      </div>

      {/* Subscriptions Card & Monthly rate side-by-side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: '20px' }}>
        {/* Subscription card */}
        <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px', border: '1px solid rgba(15, 23, 42, 0.04)' }}>
          <h4 style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px 0' }}>Infrastruktur- &amp; Service-Abonnement</h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderBottom: '1px solid rgba(0,0,0,0.04)', paddingBottom: '6px' }}>
              <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tariftyp</span>
              <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.82rem' }}>{inv.subscriptionType === 'solo' ? 'Solo-Infrastruktur' : 'Standard-Infrastruktur'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid rgba(0,0,0,0.04)', paddingBottom: '6px' }}>
              <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Freigeschaltete Module</span>
              <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                {inv.hasCampus && <span style={{ color: '#34a853', fontWeight: 750, fontSize: '0.65rem', background: '#e6f4ea', padding: '2px 6px', borderRadius: '4px' }}>Campus</span>}
                {inv.hasGroovelab && <span style={{ color: '#ca8a04', fontWeight: 750, fontSize: '0.65rem', background: '#fefce8', padding: '2px 6px', borderRadius: '4px' }}>GrooveLab</span>}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderBottom: '1px solid rgba(0,0,0,0.04)', paddingBottom: '6px' }}>
              <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Abrechnungsmodell</span>
              <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.82rem' }}>
                {isSelbstzahler ? 'Direktabrechnung (Eltern)' : 'Sammelzahler (Musikschule)'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Kombi-Vorteilsrabatt</span>
              <span style={{ fontWeight: 700, color: inv.hasKombiDiscount ? '#34a853' : '#64748b', fontSize: '0.82rem' }}>
                {inv.hasKombiDiscount ? `Aktiv (-${(masterPricing?.kombiSavings ?? 4.90).toFixed(2).replace('.', ',')} €)` : 'Keiner'}
              </span>
            </div>
          </div>
        </div>

        {/* Pricing Breakdown Card */}
        <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px', border: '1px solid rgba(15, 23, 42, 0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px 0' }}>Gebühren- &amp; Leistungsaufstellung</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* 1. Software-Bereitstellung (Kostenlos) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>Campus-Groovelab Software-Bereitstellung</span>
                <span style={{ fontWeight: 700, color: '#34a853' }}>0,00 € (Inklusive)</span>
              </div>

              {/* 2. Campus Module Hosting */}
              {inv.hasCampus && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
                  <span style={{ color: '#0f172a', fontWeight: 600 }}>Cloud- &amp; Datenbank-Hosting: Modul Campus</span>
                  <span style={{ fontWeight: 650, color: '#0f172a' }}>{masterPricing.priceCampus.toFixed(2).replace('.', ',')} € / Mo.</span>
                </div>
              )}

              {/* 3. GrooveLab Module Hosting */}
              {inv.hasGroovelab && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
                  <span style={{ color: '#0f172a', fontWeight: 600 }}>Cloud- &amp; Datenbank-Hosting: Modul GrooveLab</span>
                  <span style={{ fontWeight: 650, color: '#0f172a' }}>{masterPricing.priceGroovelab.toFixed(2).replace('.', ',')} € / Mo.</span>
                </div>
              )}

              {/* 4. Kombi Rabatt */}
              {inv.hasKombiDiscount && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: '#34a853' }}>
                  <span style={{ fontWeight: 600 }}>Kombi-Vorteilsrabatt (Infrastruktur-Bündel)</span>
                  <span style={{ fontWeight: 600 }}>-{masterPricing.kombiSavings.toFixed(2).replace('.', ',')} € / Mo.</span>
                </div>
              )}

              {/* 5. Teachers & Staff Service Fee */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.76rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  <span style={{ color: '#0f172a', fontWeight: 600 }}>Service- &amp; Administrationspauschale</span>
                  <span style={{ color: '#64748b', fontSize: '0.65rem' }}>{inv.activeTeachers} Lehrkräfte aktiv × {masterPricing.priceTeacher.toFixed(2).replace('.', ',')} €</span>
                </div>
                <span style={{ fontWeight: 650, color: '#0f172a', paddingTop: '2px' }}>{inv.teachersHostingFee.toFixed(2).replace('.', ',')} € / Mo.</span>
              </div>

              {/* 6. Cloud- & Modul-Bereitstellung: Campus (0,49 €) */}
              {(inv.activeCampusCount || 0) > 0 && !isSelbstzahler && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.76rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>Cloud- &amp; Modul-Bereitstellung: Campus</span>
                    <span style={{ color: '#64748b', fontSize: '0.65rem' }}>{inv.activeCampusCount || 0} Schüler × {masterPricing.priceStudent.toFixed(2).replace('.', ',')} €</span>
                  </div>
                  <span style={{ fontWeight: 650, color: '#0f172a', paddingTop: '2px' }}>{((inv.activeCampusCount || 0) * masterPricing.priceStudent).toFixed(2).replace('.', ',')} € / Mo.</span>
                </div>
              )}

              {/* 7. Cloud- & Modul-Bereitstellung: GrooveLab (0,49 €) */}
              {(inv.activeGroovelabCount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.76rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>Cloud- &amp; Modul-Bereitstellung: GrooveLab</span>
                    <span style={{ color: '#64748b', fontSize: '0.65rem' }}>{inv.activeGroovelabCount || 0} Schüler × {masterPricing.priceStudent.toFixed(2).replace('.', ',')} €</span>
                  </div>
                  <span style={{ fontWeight: 650, color: '#0f172a', paddingTop: '2px' }}>{((inv.activeGroovelabCount || 0) * masterPricing.priceStudent).toFixed(2).replace('.', ',')} € / Mo.</span>
                </div>
              )}

              {/* 8. Basis-Bereitstellung (0,09 €) */}
              {inv.passiveStudentsCount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.76rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>Basis-Bereitstellung</span>
                    <span style={{ color: '#64748b', fontSize: '0.65rem' }}>{inv.passiveStudentsCount} Schüler × 0,09 €</span>
                  </div>
                  <span style={{ fontWeight: 650, color: '#0f172a', paddingTop: '2px' }}>{inv.passiveStudentsHostingFee.toFixed(2).replace('.', ',')} € / Mo.</span>
                </div>
              )}

              {/* 9. Audio-Tresor Storage Add-on */}
              {inv.storageAddonGb > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.76rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>Zusatz-Speichervolumen: Audio-Tresor (+{inv.storageAddonGb} GB)</span>
                    <span style={{ color: '#64748b', fontSize: '0.65rem' }}>Dedizierter Cloud-Speicher</span>
                  </div>
                  <span style={{ fontWeight: 650, color: '#0f172a', paddingTop: '2px' }}>{inv.storageAddonMonthlyFee.toFixed(2).replace('.', ',')} € / Mo.</span>
                </div>
              )}

              {inv.status === 'bypass' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: '#dc2626', fontWeight: 600 }}>
                  <span>Bypass-Gebührenfreistellung</span>
                  <span>-{inv.subtotal.toFixed(2).replace('.', ',')} €</span>
                </div>
              )}
              {inv.status === 'trial' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: '#ca8a04', fontWeight: 600 }}>
                  <span>Probezeit-Rabatt (100%)</span>
                  <span>-{inv.subtotal.toFixed(2).replace('.', ',')} €</span>
                </div>
              )}
              {inv.status === 'suspended' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: '#dc2626', fontWeight: 600 }}>
                  <span>Sperrungs-Berechnungsstopp</span>
                  <span>-{inv.subtotal.toFixed(2).replace('.', ',')} €</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Apple HIG Endsummen- & GoBD-Steuerkachel gem. § 14 UStG */}
          <div style={{
            marginTop: '14px',
            background: '#ffffff',
            borderRadius: '12px',
            padding: '12px 14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
          }}>
            {taxMode === 'small_business' ? (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                padding: '2px 0'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>Rechnungsbetrag (Netto = Brutto):</span>
                  <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                    Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung) • Fällig zum 01. des Monats
                  </span>
                </div>
                <strong style={{ fontSize: '1.25rem', fontWeight: 900, color: '#34a853', fontFamily: '"Outfit", sans-serif' }}>
                  {inv.total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </strong>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748b' }}>
                  <span>Nettobetrag (USt.-Bemessungsgrundlage)</span>
                  <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>
                    {(inv.total / 1.19).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748b' }}>
                  <span>Gesetzliche Umsatzsteuer (19 % MwSt.)</span>
                  <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>
                    {(inv.total - (inv.total / 1.19)).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </strong>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  paddingTop: '8px',
                  borderTop: '1px solid #e2e8f0',
                  marginTop: '3px'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#0f172a' }}>Monatlicher Gesamtbetrag (Brutto):</span>
                    <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 600 }}>Inkl. 19 % MwSt. • Fällig zum 01. des Monats</span>
                  </div>
                  <strong style={{ fontSize: '1.25rem', fontWeight: 900, color: '#34a853', fontFamily: '"Outfit", sans-serif' }}>
                    {inv.total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </strong>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Audio-Tresor Storage Addon & Quota Card */}
      {(() => {
        const storageGb = Number(inv.storageAddonGb || 0);
        const baseGb = 1.0;
        const totalGb = baseGb + storageGb;
        const totalBytes = totalGb * 1024 * 1024 * 1024;

        const liveBytes = schoolAudioBytes[inv.schoolId];
        const storageUsedBytes = Number(
          liveBytes !== undefined && liveBytes > 0 
            ? liveBytes 
            : (inv.storageUsedBytes || 0)
        );

        const oneGbBytes = 1024 * 1024 * 1024;
        const usedMb = storageUsedBytes / (1024 * 1024);
        const usedGb = storageUsedBytes / oneGbBytes;
        const freeGb = Math.max(0, totalGb - usedGb);

        const formattedUsed = storageUsedBytes < oneGbBytes
          ? `${usedMb.toFixed(1).replace('.', ',')} MB`
          : `${usedGb.toFixed(2).replace('.', ',')} GB`;

        const rawUsagePct = (storageUsedBytes / (totalBytes || 1)) * 100;
        const usagePct = Math.min(100, Math.round(rawUsagePct));
        const barWidthPct = storageUsedBytes > 0 ? Math.max(2, rawUsagePct) : 0;

        const isHighUsage = rawUsagePct >= 80;
        const isFull = rawUsagePct >= 100;

        return (
          <div style={{
            marginTop: '16px',
            background: isFull ? '#fef2f2' : isHighUsage ? '#fffbeb' : '#f8fafc',
            borderRadius: '16px',
            padding: '20px',
            border: `1px solid ${isFull ? '#fca5a5' : isHighUsage ? '#fde68a' : 'rgba(15, 23, 42, 0.05)'}`,
            boxShadow: isHighUsage ? '0 4px 14px rgba(234, 179, 8, 0.08)' : 'none'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#475569',
                  flexShrink: 0
                }}>
                  <HardDrive size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>Audio-Tresor &amp; Cloud-Speicher Kontingent</h4>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 550 }}>
                    1 GB Basis-Inklusivvolumen {storageGb > 0 ? `+ ${storageGb} GB gebuchtes Zusatz-Volumen` : ''}
                  </span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: isFull ? '#dc2626' : isHighUsage ? '#b45309' : '#1e293b' }}>
                  {formattedUsed} / {totalGb} GB
                </span>
                <span style={{ display: 'block', fontSize: '0.7rem', color: storageUsedBytes > 0 ? '#34a853' : '#64748b', fontWeight: 700 }}>
                  {storageUsedBytes > 0 
                    ? `${freeGb.toFixed(2).replace('.', ',')} GB frei (${Math.max(0, 100 - usagePct)} %)`
                    : `${totalGb.toFixed(2).replace('.', ',')} GB frei (100 %) • Noch keine Audio-Dateien vorhanden`}
                </span>
              </div>
            </div>

            {/* Dynamic Progress Bar */}
            <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
              <div style={{
                height: '100%',
                width: `${barWidthPct}%`,
                background: isFull ? '#ef4444' : isHighUsage ? '#f59e0b' : '#34a853',
                borderRadius: '4px',
                transition: 'width 0.4s ease-in-out'
              }} />
            </div>

            {/* Warning Banner at 80% */}
            {isHighUsage && (
              <div style={{
                marginBottom: '16px',
                padding: '10px 14px',
                background: '#ffffff',
                borderRadius: '12px',
                border: `1px solid ${isFull ? '#f87171' : '#fcd34d'}`,
                fontSize: '0.76rem',
                color: isFull ? '#991b1b' : '#92400e',
                lineHeight: 1.4,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertTriangle size={15} color={isFull ? '#dc2626' : '#d97706'} />
                <span><strong>{isFull ? 'Speicher voll!' : 'Speicher zu 80 % belegt!'}</strong> {isFull ? 'Der Audio-Tresor deiner Schule ist voll.' : 'Der Audio-Tresor deiner Schule ist zu 80 % belegt.'}</span>
              </div>
            )}

            {/* Read-Only Status Info */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #f1f5f9',
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              fontSize: '0.78rem',
              color: '#475569'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={15} color="#64748b" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Speicherverwaltung:</strong> Zusatz-Speicherpakete (+5 GB bis +40 GB) werden eigenständig von der Musikschule im eigenen Sekretariat gebucht und hier im Financial Control als Übersicht verwaltet.
                </span>
              </div>
              {storageGb > 0 && (
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#34a853', background: '#e6f4ea', padding: '4px 10px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
                  + {storageGb} GB Zusatz-Speicher aktiv
                </span>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
