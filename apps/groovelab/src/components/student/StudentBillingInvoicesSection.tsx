import React, { useState } from 'react';
import { ShieldCheck, Calendar, FileCheck, CheckCircle2, Download, ExternalLink } from 'lucide-react';
import { getEffectiveInstrument, isGenericInstrument } from '../../utils/avatarResolutionEngine';
import { generateSchoolLicenseCertificatePDF } from '../../utils/schoolLicenseCertificatePdfGenerator';

export function StudentBillingInvoicesSection({ studentUser, studentId }: { studentUser: any; studentId?: string }) {
  const isDirectBilled = Boolean(studentUser?.is_direct_billed);
  const isHardship = Boolean(studentUser?.is_hardship_exempt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Authoritative Instrument Resolution (0,1% Goldstandard)
  const rawInst = getEffectiveInstrument(studentUser) || studentUser?.instrument;
  const instrument = (!rawInst || isGenericInstrument(rawInst)) ? 'Gitarre' : rawInst;

  const studentName = `${studentUser?.first_name || 'Schüler'} ${(studentUser?.last_name ? studentUser.last_name.slice(0, 1) + '.' : '')}`.trim();
  const schoolName = studentUser?.school_name || 'Musikschule';
  const effectiveStudentId = studentId || studentUser?.id || 'schueler';

  const handleDownloadCertificate = async () => {
    try {
      setIsGenerating(true);
      await generateSchoolLicenseCertificatePDF({
        studentName,
        studentId: effectiveStudentId,
        schoolName,
        instrument,
        schoolEmail: studentUser?.school_email
      });
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to generate school certificate:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadContract = async () => {
    try {
      setIsGenerating(true);
      const { generateB2CParentContractPDF } = await import('../../utils/pdfGenerator');
      await generateB2CParentContractPDF({
        studentName,
        studentId: effectiveStudentId,
        schoolName,
        isDirectBilled,
        isHardship
      });
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to generate contract PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Bereitstellungs- & Abrechnungsstatus Card */}
      <div style={{
        background: '#f8fafc',
        border: '1.5px solid #e2e8f0',
        borderRadius: '20px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{
            fontSize: '0.76rem',
            fontWeight: 900,
            color: isDirectBilled ? '#1e40af' : '#15803d',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <ShieldCheck size={16} color={isDirectBilled ? '#1e40af' : '#15803d'} />
            <span>Bereitstellungs- &amp; Abrechnungsstatus</span>
          </span>

          <span style={{
            background: isHardship ? '#fef3c7' : (isDirectBilled ? '#eff6ff' : '#ecfdf5'),
            color: isHardship ? '#92400e' : (isDirectBilled ? '#1e40af' : '#059669'),
            fontSize: '0.72rem',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: '100px',
            border: `1.5px solid ${isHardship ? '#fde68a' : (isDirectBilled ? '#bfdbfe' : '#10b981')}`
          }}>
            {isHardship
              ? 'Härtefall / Befreit'
              : (isDirectBilled ? 'Direktabrechnung (Jahresbeitrag)' : 'Kommunale Schullizenz • 100% Inklusive')}
          </span>
        </div>

        <p style={{ margin: 0, fontSize: '0.84rem', color: '#334155', lineHeight: 1.55, fontWeight: 500 }}>
          {isHardship
            ? 'Dieses Schülerprofil ist von der Direktabrechnung befreit. Alle Cloud- & Datenbank-Bereitstellungskosten werden vollständig von deiner Musikschule getragen.'
            : isDirectBilled
            ? 'Die Bereitstellung für das Campus-Modul wird als befristeter Schuljahresbeitrag direkt über die hinterlegte Zahlungsart abgerechnet. GrooveLab-Bereitstellungen sind immer vollständig inklusive.'
            : 'Deine Musikschule übernimmt alle Bereitstellungs- und Infrastrukturkosten für dieses Profil. Für dich fallen 0,00 € Gebühren an.'}
        </p>

        {/* Amtlicher Nachweis Download Bereich */}
        <div style={{
          marginTop: '6px',
          paddingTop: '16px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 850, color: '#0f172a' }}>
              {isDirectBilled ? 'Gesetzliche Vertragsbestätigung (BGB 312f)' : 'Amtlicher Schullizenz-Nachweis (BuT / Behörden)'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', maxWidth: '440px', lineHeight: 1.45 }}>
              {isDirectBilled
                ? '2-seitiges Dokument mit Bereitstellungsnachweis, GoBD-Siegel & gesetzlicher Widerrufsbelehrung.'
                : 'Offizielles Zertifikat zur Vorlage bei Behörden, Jobcenter (BuT gem. SGB II), Arbeitgebern oder Finanzamt.'}
            </div>
          </div>

          <button
            type="button"
            onClick={isDirectBilled ? handleDownloadContract : handleDownloadCertificate}
            disabled={isGenerating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              minHeight: '44px',
              borderRadius: '12px',
              background: downloadSuccess ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#0f172a',
              color: '#ffffff',
              border: downloadSuccess ? 'none' : '1.5px solid #0f172a',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: isGenerating ? 'wait' : 'pointer',
              boxShadow: downloadSuccess ? '0 2px 8px rgba(16, 185, 129, 0.28)' : '0 2px 6px rgba(15, 23, 42, 0.12)',
              transition: 'all 0.18s ease-in-out'
            }}
            title={isDirectBilled ? 'Vertragsbeleg herunterladen' : 'Amtlichen Schullizenz-Nachweis als PDF herunterladen'}
          >
            {downloadSuccess ? (
              <>
                <CheckCircle2 size={16} color="#ffffff" />
                <span>PDF gespeichert</span>
              </>
            ) : (
              <>
                {isDirectBilled ? <ShieldCheck size={16} color="#60a5fa" /> : <FileCheck size={16} color="#34d399" />}
                <span>
                  {isGenerating
                    ? 'Wird generiert...'
                    : (isDirectBilled ? 'Vertragsbeleg (PDF) laden' : 'Schullizenz-Nachweis (PDF)')}
                </span>
                <Download size={14} style={{ opacity: 0.8 }} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Befristete Schuljahres-Laufzeit (Apple Squircle Icon) */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '20px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.28)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Calendar size={20} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ fontSize: '0.90rem', fontWeight: 900, color: '#0f172a' }}>
                Befristeter Schuljahres-Zugang (Kein Abo)
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 550, marginTop: '1px' }}>
                Laufzeit endet automatisch zum Ende des laufenden Schuljahres (31. August).
              </div>
            </div>
          </div>

          <span style={{
            background: '#ecfdf5',
            color: '#059669',
            padding: '4px 10px',
            borderRadius: '100px',
            fontSize: '0.72rem',
            fontWeight: 800,
            border: '1px solid #10b981'
          }}>
            Endet automatisch
          </span>
        </div>

        <p style={{ margin: 0, fontSize: '0.80rem', color: '#475569', lineHeight: 1.55 }}>
          Es gibt <strong>keine automatische Vertragsverlängerung und keine Kündigungsfristen</strong>. Der Zugang läuft nach Ablauf des Schuljahres automatisch aus. Eine Kündigung ist daher nicht erforderlich.
        </p>

        <div style={{
          background: '#f8fafc',
          border: '1.5px dashed #cbd5e1',
          borderRadius: '14px',
          padding: '12px 14px',
          fontSize: '0.76rem',
          color: '#64748b',
          lineHeight: 1.45,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <span>Du ziehst um oder möchtest den Unterricht vorzeitig beenden?</span>
          <a
            href={`mailto:${studentUser?.school_email || 'sekretariat@musikschule.de'}?subject=Abmeldung%20Unterricht%20${encodeURIComponent(studentUser?.first_name || 'Schueler')}`}
            style={{
              color: '#0284c7',
              fontWeight: 800,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            Vorzeitige Abmeldung an das Sekretariat melden →
          </a>
        </div>
      </div>

      {/* 3. Garantie- & Leistungsumfang Card */}
      <div style={{
        background: '#f8fafc',
        border: '1.5px solid #e2e8f0',
        borderRadius: '18px',
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: '#e0f2fe',
          color: '#0284c7',
          border: '1px solid #bae6fd',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <ShieldCheck size={18} strokeWidth={2.4} />
        </div>
        <div style={{ fontSize: '0.80rem', color: '#475569', lineHeight: 1.45 }}>
          {isDirectBilled ? (
            <>
              <strong style={{ color: '#0f172a' }}>Keine Software-Lizenzgebühren:</strong> Campus-Groovelab wird ohne Software-Kaufgebühren bereitgestellt. Es fällt ausschließlich der befristete Cloud-Bereitstellungsbeitrag an.
            </>
          ) : (
            <>
              <strong style={{ color: '#0f172a' }}>Vollumfänglicher Leistungsumfang (0,00 €):</strong> Enthält Hausaufgabenheft, Mediathek, Audio-Tresor und GrooveLab-Studio ohne verdeckte Kosten oder In-App-Käufe.
            </>
          )}
        </div>
      </div>
    </div>
  );
}
