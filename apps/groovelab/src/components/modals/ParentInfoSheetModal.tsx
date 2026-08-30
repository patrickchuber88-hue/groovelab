import React, { useState, useEffect } from 'react';
import { X, Download, Printer, FileText, Check, ShieldCheck, Building2 } from 'lucide-react';
import { generateParentQuickstartPDF } from '../../utils/pdfGenerator';
import { getParentOnboardingUrl } from '../../utils/tenantUrlHelper';
import QRCode from 'react-qr-code';

interface ParentInfoSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolData: any;
  activePlatformDefault?: 'campus' | 'groovelab' | 'both';
}

export const ParentInfoSheetModal: React.FC<ParentInfoSheetModalProps> = ({
  isOpen,
  onClose,
  schoolData,
  activePlatformDefault = 'both'
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<'campus' | 'groovelab' | 'both'>(activePlatformDefault);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    if (activePlatformDefault) {
      setSelectedPlatform(activePlatformDefault);
    }
  }, [activePlatformDefault, isOpen]);

  if (!isOpen) return null;

  const schoolName = schoolData?.name || 'Unsere Musikschule';
  const schoolSubdomain = schoolData?.subdomain || schoolData?.slug || '';
  const schoolLogoUrl = schoolData?.logo_url || '';
  const city = schoolData?.city || '';
  const studentBillingOption = schoolData?.student_billing_option || 'school_all';
  const parentUrl = getParentOnboardingUrl(schoolName, schoolSubdomain);

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      await generateParentQuickstartPDF({
        schoolName,
        activePlatform: selectedPlatform,
        schoolSubdomain,
        schoolLogoUrl,
        studentBillingOption,
        city,
        contactEmail: schoolData?.email || ''
      });
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('[ParentInfoSheetModal] Error generating PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = async () => {
    setIsGenerating(true);
    try {
      const res = await generateParentQuickstartPDF({
        schoolName,
        activePlatform: selectedPlatform,
        schoolSubdomain,
        schoolLogoUrl,
        studentBillingOption,
        city,
        contactEmail: schoolData?.email || '',
        returnOnlyBlob: true
      });
      if (res && res.blob) {
        const blobUrl = URL.createObjectURL(res.blob);
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.src = blobUrl;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            window.open(blobUrl, '_blank');
          }
          setTimeout(() => {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(blobUrl);
          }, 3000);
        };
      }
    } catch (err) {
      console.error('[ParentInfoSheetModal] Print error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const themeAccent = selectedPlatform === 'groovelab' 
    ? '#eab308' 
    : selectedPlatform === 'campus' 
      ? '#34a853' 
      : '#059669';

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: 'clamp(12px, 3vw, 24px)'
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !isGenerating) onClose(); }}
    >
      <div 
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.25), 0 0 1px 1px rgba(0,0,0,0.05)',
          maxWidth: 'min(600px, 95vw)',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: 'clamp(20px, 4vw, 28px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          position: 'relative',
          animation: 'scaleUp 0.16s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <FileText size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 'clamp(1.1rem, 2.5vw, 1.25rem)', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                Eltern-Informationsblatt (PDF)
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                1-Seiter Infoblatt für Eltern mit Schullogo & QR-Code
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: 'none',
              background: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'background 0.12s ease'
            }}
          >
            <X size={18} strokeWidth={2.4} />
          </button>
        </div>

        {/* Module Selection Pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Inhalte für Modul anpassen:
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '14px',
            gap: '4px'
          }}>
            <button
              type="button"
              onClick={() => setSelectedPlatform('both')}
              style={{
                padding: '8px 10px',
                borderRadius: '10px',
                border: 'none',
                background: selectedPlatform === 'both' ? '#ffffff' : 'transparent',
                color: selectedPlatform === 'both' ? '#059669' : '#64748b',
                fontWeight: selectedPlatform === 'both' ? 900 : 700,
                fontSize: '0.80rem',
                cursor: 'pointer',
                boxShadow: selectedPlatform === 'both' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.12s ease'
              }}
            >
              Kombi (Beide)
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlatform('campus')}
              style={{
                padding: '8px 10px',
                borderRadius: '10px',
                border: 'none',
                background: selectedPlatform === 'campus' ? '#ffffff' : 'transparent',
                color: selectedPlatform === 'campus' ? '#34a853' : '#64748b',
                fontWeight: selectedPlatform === 'campus' ? 900 : 700,
                fontSize: '0.80rem',
                cursor: 'pointer',
                boxShadow: selectedPlatform === 'campus' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.12s ease'
              }}
            >
              Nur Campus
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlatform('groovelab')}
              style={{
                padding: '8px 10px',
                borderRadius: '10px',
                border: 'none',
                background: selectedPlatform === 'groovelab' ? '#ffffff' : 'transparent',
                color: selectedPlatform === 'groovelab' ? '#eab308' : '#64748b',
                fontWeight: selectedPlatform === 'groovelab' ? 900 : 700,
                fontSize: '0.80rem',
                cursor: 'pointer',
                boxShadow: selectedPlatform === 'groovelab' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.12s ease'
              }}
            >
              Nur GrooveLab
            </button>
          </div>
        </div>

        {/* Live Document Preview Card */}
        <div style={{
          background: '#f8fafc',
          borderRadius: '18px',
          border: '1px solid #e2e8f0',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={16} color={themeAccent} />
              <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
                {schoolName} {city ? `(${city})` : ''}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem', color: '#059669', fontWeight: 800, background: '#ecfdf5', padding: '3px 8px', borderRadius: '8px' }}>
              <ShieldCheck size={13} />
              <span>100% DSGVO</span>
            </div>
          </div>

          {/* Mini Mockup Visual */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 850, color: '#0f172a' }}>
                📄 DIN A4 Eltern-Briefing (1 Seite)
              </div>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.76rem', color: '#475569', lineHeight: 1.5 }}>
                <li>Digitales Hausaufgabenheft & Übe-Timer</li>
                <li>Lehrkraft-Audioaufnahmen & Playalongs</li>
                <li>Zero-Mail-Architektur (Keine Passwörter)</li>
                <li>Serverstandort Deutschland (Hetzner)</li>
              </ul>
            </div>

            {/* QR-Code Preview */}
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px'
            }}>
              <QRCode value={parentUrl} size={64} style={{ width: '64px', height: '64px' }} />
              <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748b' }}>
                QR-Code zur Aktivierung
              </span>
            </div>
          </div>

          <div style={{ fontSize: '0.74rem', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
            URL: <strong style={{ color: '#0f172a' }}>{parentUrl}</strong>
          </div>
        </div>

        {/* Action Buttons: Download & Print */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', marginTop: '2px' }}>
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            style={{
              padding: '14px 20px',
              borderRadius: '16px',
              border: 'none',
              background: downloadSuccess ? '#059669' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: '0.92rem',
              cursor: isGenerating ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale"
          >
            {downloadSuccess ? (
              <>
                <Check size={18} strokeWidth={3} />
                <span>PDF gespeichert!</span>
              </>
            ) : (
              <>
                <Download size={18} />
                <span>PDF Herunterladen</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={isGenerating}
            style={{
              padding: '14px 18px',
              borderRadius: '16px',
              border: '1.5px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              fontWeight: 800,
              fontSize: '0.92rem',
              cursor: isGenerating ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.12s ease'
            }}
            className="hover-scale"
          >
            <Printer size={18} />
            <span>Drucken</span>
          </button>
        </div>
      </div>
    </div>
  );
};
