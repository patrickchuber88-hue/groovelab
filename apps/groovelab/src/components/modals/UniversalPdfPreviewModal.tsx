import React, { useEffect, useState, useRef } from 'react';
import { FileText, Printer, Download, X, Loader2, ExternalLink } from 'lucide-react';

export interface UniversalPdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badgeText?: string;
  filename?: string;
  pdfBlob?: Blob | null;
  isLoading?: boolean;
}

export const UniversalPdfPreviewModal: React.FC<UniversalPdfPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  badgeText = 'DIN A4 • Revisionssicher',
  filename = 'Dokument.pdf',
  pdfBlob,
  isLoading = false
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Manage Blob URL and Data URL lifecycle for 100% Safari & WebKit compatibility
  useEffect(() => {
    if (!isOpen || !pdfBlob) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      setDataUrl(null);
      return;
    }

    const url = URL.createObjectURL(pdfBlob);
    setBlobUrl(url);

    // Also convert to Data URI so Safari/WebKit renders PDFKit without BlobRegistry lookup failure
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(pdfBlob);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [isOpen, pdfBlob]);

  // Handle ESC key for WAI-ARIA compliance
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!pdfBlob) return;
    setIsDownloading(true);
    try {
      const url = blobUrl || URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (!blobUrl) URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[UniversalPdfPreviewModal] Download error:', err);
    } finally {
      setTimeout(() => setIsDownloading(false), 500);
    }
  };

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      } catch (e) {
        console.warn('[UniversalPdfPreviewModal] Iframe print failed, falling back to window open:', e);
      }
    }

    if (blobUrl) {
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
        });
      }
    }
  };

  const handleOpenNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1060px',
          height: '92vh',
          maxHeight: '940px',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          border: '1.5px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          animation: 'fadeInScale 0.18s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* --- MODAL HEADER (Monochrome Toolbar) --- */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap'
          }}
        >
          {/* Left: Document Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0f172a',
                flexShrink: 0
              }}
            >
              <FileText size={20} strokeWidth={2} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '0.98rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {title}
                </h3>
                {badgeText && (
                  <span
                    style={{
                      fontSize: '0.70rem',
                      fontWeight: 700,
                      color: '#475569',
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      padding: '2px 8px',
                      borderRadius: '6px'
                    }}
                  >
                    {badgeText}
                  </span>
                )}
              </div>
              {subtitle && (
                <p
                  style={{
                    margin: '2px 0 0 0',
                    fontSize: '0.76rem',
                    color: '#64748b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right: Actions Toolbar (Monochrome) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handlePrint}
              disabled={isLoading || !blobUrl}
              aria-label="Dokument drucken"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 14px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                color: '#0f172a',
                fontSize: '0.80rem',
                fontWeight: 700,
                border: '1px solid #cbd5e1',
                cursor: isLoading || !blobUrl ? 'not-allowed' : 'pointer',
                opacity: isLoading || !blobUrl ? 0.6 : 1,
                transition: 'all 0.15s ease'
              }}
            >
              <Printer size={15} strokeWidth={2} />
              <span>Drucken</span>
            </button>

            <button
              type="button"
              onClick={handleOpenNewTab}
              disabled={isLoading || !blobUrl}
              title="In neuem Tab öffnen"
              aria-label="In neuem Tab öffnen"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                color: '#0f172a',
                border: '1px solid #cbd5e1',
                cursor: isLoading || !blobUrl ? 'not-allowed' : 'pointer',
                opacity: isLoading || !blobUrl ? 0.6 : 1,
                transition: 'all 0.15s ease'
              }}
            >
              <ExternalLink size={15} strokeWidth={2} />
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isLoading || !pdfBlob || isDownloading}
              aria-label="PDF herunterladen"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '10px',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                fontSize: '0.80rem',
                fontWeight: 800,
                border: 'none',
                cursor: isLoading || !pdfBlob || isDownloading ? 'not-allowed' : 'pointer',
                opacity: isLoading || !pdfBlob || isDownloading ? 0.6 : 1,
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)',
                transition: 'all 0.15s ease'
              }}
            >
              <Download size={15} strokeWidth={2} />
              <span>{isDownloading ? 'Wird gespeichert...' : 'PDF herunterladen'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Vorschau schließen"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#f1f5f9',
                color: '#64748b',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                marginLeft: '4px',
                transition: 'all 0.15s ease'
              }}
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* --- MODAL BODY (PDF Viewer Canvas / Iframe) --- */}
        <div
          style={{
            flex: 1,
            backgroundColor: '#f1f5f9',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          {isLoading && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                color: '#475569'
              }}
            >
              <Loader2 size={36} strokeWidth={2} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Dokument wird in Echtzeit gerendert...</span>
            </div>
          )}

          {!isLoading && (dataUrl || blobUrl) && (
            <object
              data={dataUrl || blobUrl || ''}
              type="application/pdf"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
                backgroundColor: '#ffffff'
              }}
            >
              <embed
                src={dataUrl || blobUrl || ''}
                type="application/pdf"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block'
                }}
              />
              <iframe
                ref={iframeRef}
                src={dataUrl || blobUrl || ''}
                title={title}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
              />
            </object>
          )}

          {!isLoading && !blobUrl && (
            <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
              <FileText size={40} strokeWidth={1.5} style={{ margin: '0 auto 12px auto', display: 'block', color: '#94a3b8' }} />
              <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600 }}>Das Dokument konnte nicht geladen werden.</p>
              <button
                type="button"
                onClick={onClose}
                style={{
                  marginTop: '12px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Schließen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
