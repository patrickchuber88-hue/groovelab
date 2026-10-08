import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Download, Printer, FileText, Check, ShieldCheck, 
  ExternalLink, Loader2, Sparkles, Building2
} from 'lucide-react';
import { generateParentQuickstartPDF } from '../../utils/pdfGenerator';
import { getParentOnboardingUrl } from '../../utils/tenantUrlHelper';

export interface ParentInfoSheetModalProps {
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
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string>('Elternbrief.pdf');
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (activePlatformDefault) {
      setSelectedPlatform(activePlatformDefault);
    }
  }, [activePlatformDefault, isOpen]);

  const schoolName = schoolData?.name || 'Unsere Musikschule';
  const schoolSubdomain = schoolData?.subdomain || schoolData?.slug || '';
  const schoolLogoUrl = schoolData?.logo_url || '';
  const city = schoolData?.city || '';
  const studentBillingOption = schoolData?.student_billing_option || 'school_all';
  const parentUrl = getParentOnboardingUrl(schoolName, schoolSubdomain);

  // Generate live PDF Blob whenever modal opens or platform selection changes
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsGenerating(true);

    const generatePreview = async () => {
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

        if (isMounted && res && res.blob) {
          const url = URL.createObjectURL(res.blob);
          setBlobUrl(prevUrl => {
            if (prevUrl) URL.revokeObjectURL(prevUrl);
            return url;
          });
          setPdfBlob(res.blob);
          if (res.filename) {
            setPdfFilename(res.filename);
          }
        }
      } catch (err) {
        console.error('[ParentInfoSheetModal] Error generating PDF preview:', err);
      } finally {
        if (isMounted) {
          setIsGenerating(false);
        }
      }
    };

    generatePreview();

    return () => {
      isMounted = false;
    };
  }, [
    isOpen, 
    selectedPlatform, 
    schoolName, 
    schoolSubdomain, 
    schoolLogoUrl, 
    studentBillingOption, 
    city, 
    schoolData?.email
  ]);

  // Clean up Blob URL on unmount or close to guarantee zero memory leaks
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  // Handle ESC key for WAI-ARIA compliance
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isGenerating) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isGenerating, onClose]);

  if (!isOpen) return null;

  const handleDownloadPDF = () => {
    if (!pdfBlob) return;
    try {
      const url = blobUrl || URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = pdfFilename || 'Elternbrief.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (!blobUrl) URL.revokeObjectURL(url);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('[ParentInfoSheetModal] Download error:', err);
    }
  };

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      } catch (e) {
        console.warn('[ParentInfoSheetModal] Iframe print failed, falling back to window open:', e);
      }
    }

    if (blobUrl) {
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
        setTimeout(() => {
          try {
            printWindow.print();
          } catch {}
        }, 300);
      }
    }
  };

  const handleOpenNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    }
  };

  const platformTitle = selectedPlatform === 'groovelab'
    ? 'GrooveLab'
    : selectedPlatform === 'campus'
      ? 'Campus'
      : 'Campus & GrooveLab';

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-label="Eltern-Informationsblatt PDF Vorschau"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: 'clamp(10px, 2.5vw, 24px)'
      }}
      onClick={(e) => { 
        if (e.target === e.currentTarget && !isGenerating) onClose(); 
      }}
    >
      <div 
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          border: '1.5px solid rgba(226, 232, 240, 0.9)',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.3)',
          maxWidth: '1060px',
          width: '100%',
          height: '92vh',
          maxHeight: '940px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'scaleUp 0.16s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* --- MODAL TOP HEADER --- */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          {/* Left: Title & Meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <FileText size={22} strokeWidth={2.2} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{
                  margin: 0,
                  fontSize: 'clamp(0.98rem, 2vw, 1.12rem)',
                  fontWeight: 900,
                  color: '#0f172a',
                  letterSpacing: '-0.02em',
                  whiteSpace: 'nowrap'
                }}>
                  Eltern-Informationsblatt
                </h3>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: '#059669',
                  backgroundColor: '#ecfdf5',
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}>
                  DIN A4 • 1-Seiter
                </span>
              </div>
              <p style={{
                margin: '2px 0 0',
                fontSize: '0.78rem',
                color: '#64748b',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {schoolName} {city ? `• ${city}` : ''} • Live-Vorschau ({platformTitle})
              </p>
            </div>
          </div>

          {/* Center: Module Selection Tabs (Tone-in-Tone, Zero Color-Clash) */}
          <div style={{
            display: 'inline-flex',
            backgroundColor: '#f1f5f9',
            padding: '3px',
            borderRadius: '12px',
            gap: '3px'
          }}>
            <button
              type="button"
              onClick={() => setSelectedPlatform('both')}
              style={{
                padding: '6px 12px',
                borderRadius: '9px',
                border: 'none',
                backgroundColor: selectedPlatform === 'both' ? '#ffffff' : 'transparent',
                color: selectedPlatform === 'both' ? '#0f172a' : '#64748b',
                fontWeight: selectedPlatform === 'both' ? 850 : 700,
                fontSize: '0.76rem',
                cursor: 'pointer',
                boxShadow: selectedPlatform === 'both' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.12s ease'
              }}
            >
              Kombi (Beide)
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlatform('campus')}
              style={{
                padding: '6px 12px',
                borderRadius: '9px',
                border: 'none',
                backgroundColor: selectedPlatform === 'campus' ? '#ffffff' : 'transparent',
                color: selectedPlatform === 'campus' ? '#0f172a' : '#64748b',
                fontWeight: selectedPlatform === 'campus' ? 850 : 700,
                fontSize: '0.76rem',
                cursor: 'pointer',
                boxShadow: selectedPlatform === 'campus' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.12s ease'
              }}
            >
              Nur Campus
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlatform('groovelab')}
              style={{
                padding: '6px 12px',
                borderRadius: '9px',
                border: 'none',
                backgroundColor: selectedPlatform === 'groovelab' ? '#ffffff' : 'transparent',
                color: selectedPlatform === 'groovelab' ? '#0f172a' : '#64748b',
                fontWeight: selectedPlatform === 'groovelab' ? 850 : 700,
                fontSize: '0.76rem',
                cursor: 'pointer',
                boxShadow: selectedPlatform === 'groovelab' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.12s ease'
              }}
            >
              Nur GrooveLab
            </button>
          </div>

          {/* Right: Actions Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handlePrint}
              disabled={isGenerating || !blobUrl}
              aria-label="Elternbrief drucken"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontSize: '0.80rem',
                fontWeight: 800,
                border: '1.5px solid #cbd5e1',
                cursor: isGenerating || !blobUrl ? 'not-allowed' : 'pointer',
                opacity: isGenerating || !blobUrl ? 0.6 : 1,
                transition: 'all 0.12s ease'
              }}
              title="Direkt auf DIN-A4 drucken"
            >
              <Printer size={15} />
              <span>Drucken</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGenerating || !blobUrl}
              aria-label="Elternbrief als PDF herunterladen"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: downloadSuccess ? '#059669' : '#059669',
                color: '#ffffff',
                fontSize: '0.80rem',
                fontWeight: 900,
                cursor: isGenerating || !blobUrl ? 'not-allowed' : 'pointer',
                opacity: isGenerating || !blobUrl ? 0.6 : 1,
                boxShadow: 'none',
                transition: 'all 0.12s ease'
              }}
            >
              {downloadSuccess ? (
                <>
                  <Check size={16} strokeWidth={2.8} />
                  <span>Gespeichert!</span>
                </>
              ) : (
                <>
                  <Download size={15} />
                  <span>PDF Herunterladen</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleOpenNewTab}
              disabled={!blobUrl}
              aria-label="In neuem Tab öffnen"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: !blobUrl ? 'not-allowed' : 'pointer',
                color: '#64748b',
                transition: 'all 0.12s ease'
              }}
              title="Vorschau in neuem Tab öffnen"
            >
              <ExternalLink size={16} />
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Schließen"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: '#f1f5f9',
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
        </div>

        {/* --- MAIN INTERACTIVE PDF PREVIEW AREA --- */}
        <div style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          backgroundColor: '#525659', // Native PDF viewer dark canvas backdrop
          display: 'flex',
          flexDirection: 'column'
        }}>
          {isGenerating && (
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.70)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '14px',
              zIndex: 10,
              color: '#ffffff'
            }}>
              <Loader2 size={36} className="animate-spin" color="#34d399" />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.92rem', fontWeight: 800 }}>
                  PDF-Vorschau wird vorbereitet...
                </div>
                <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '3px' }}>
                  Offline-QR-Code & Schullogo werden gerendert
                </div>
              </div>
            </div>
          )}

          {blobUrl ? (
            <iframe
              ref={iframeRef}
              src={blobUrl}
              title="Eltern-Informationsblatt PDF Vorschau"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block'
              }}
            />
          ) : (
            !isGenerating && (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                color: '#cbd5e1'
              }}>
                <FileText size={48} strokeWidth={1.5} color="#94a3b8" />
                <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                  Vorschau konnte nicht geladen werden.
                </span>
              </div>
            )
          )}
        </div>

        {/* --- MODAL FOOTER INFO BAR --- */}
        <div style={{
          padding: '10px 20px',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          fontSize: '0.74rem',
          color: '#64748b',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              color: '#059669',
              fontWeight: 800,
              backgroundColor: '#ecfdf5',
              padding: '2px 8px',
              borderRadius: '6px'
            }}>
              <ShieldCheck size={13} />
              DSGVO Art. 5/8/17 & KUG 22 Bildnisschutz konform
            </span>
            <span>• Server Falkenstein (Hetzner) • Zero-Password Registrierung</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Schulportal-URL:</span>
            <code style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              padding: '2px 6px',
              borderRadius: '4px',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '0.72rem'
            }}>
              {parentUrl}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};
