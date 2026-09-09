import React, { useEffect, useRef, useState } from 'react';
import { X, Download, Printer, ExternalLink, Loader2, FileText } from 'lucide-react';

export interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  pdfBlob?: Blob | null;
  pdfUrl?: string | null;
  fileName?: string;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  pdfBlob,
  pdfUrl,
  fileName = 'Dokument.pdf'
}) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Manage Blob URL lifecycle to ensure 0 memory leaks
  useEffect(() => {
    if (!isOpen) {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setObjectUrl(null);
      }
      return;
    }

    setLoading(true);

    let createdUrl: string | null = null;
    if (pdfBlob) {
      createdUrl = URL.createObjectURL(pdfBlob);
      setObjectUrl(createdUrl);
      setLoading(false);
    } else if (pdfUrl) {
      setObjectUrl(pdfUrl);
      setLoading(false);
    } else {
      setLoading(false);
    }

    return () => {
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [isOpen, pdfBlob, pdfUrl]);

  // Escape key listener for WCAG 2.2 AA compliance
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } catch {
        // Fallback for cross-origin or restricted iframe
        if (objectUrl) {
          const printWindow = window.open(objectUrl, '_blank');
          if (printWindow) {
            printWindow.addEventListener('load', () => printWindow.print());
          }
        }
      }
    } else if (objectUrl) {
      const printWindow = window.open(objectUrl, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => printWindow.print());
      }
    }
  };

  const handleDownload = () => {
    if (!objectUrl) return;
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenExternal = () => {
    if (objectUrl) {
      window.open(objectUrl, '_blank');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[5000] flex items-center justify-center p-3 sm:p-6"
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative flex flex-col w-full max-w-5xl h-[92vh] rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-white"
        style={{
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)'
        }}
      >
        {/* Apple QuickLook Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-amber-400" />
            </div>
            <div className="truncate">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                {title}
              </h2>
              <p className="text-xs text-slate-400 truncate">{fileName}</p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              aria-label="Dokument drucken"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-200 bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl transition-all"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Drucken</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              aria-label="Dokument herunterladen"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 active:scale-95 rounded-xl transition-all shadow-sm"
            >
              <Download className="w-4 h-4 text-slate-900" />
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              type="button"
              onClick={handleOpenExternal}
              aria-label="In neuem Tab öffnen"
              title="In neuem Tab öffnen"
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            <div className="w-[1px] h-5 bg-white/20 mx-1" />

            <button
              type="button"
              onClick={onClose}
              aria-label="Vorschau schließen"
              className="p-2 text-slate-400 hover:text-white hover:bg-red-500/20 active:scale-95 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Canvas Frame */}
        <div className="relative flex-1 w-full bg-slate-100 flex items-center justify-center overflow-hidden">
          {loading && (
            <div className="flex flex-col items-center gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <span className="text-sm font-medium">PDF-Vorschau wird vorbereitet...</span>
            </div>
          )}

          {!loading && objectUrl && (
            <iframe
              ref={iframeRef}
              src={`${objectUrl}#toolbar=0&navpanes=0`}
              title={title}
              className="w-full h-full border-0 bg-white"
            />
          )}

          {!loading && !objectUrl && (
            <div className="flex flex-col items-center gap-2 text-slate-500 p-6 text-center">
              <FileText className="w-12 h-12 text-slate-400" />
              <p className="font-semibold text-slate-700">Keine Vorschau verfügbar</p>
              <p className="text-xs text-slate-500 max-w-sm">
                Das Dokument konnte nicht im Browser geladen werden. Bitte nutzen Sie den Download-Button.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
