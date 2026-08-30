import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Award, Sparkles, Music, ShieldCheck, Download, Loader2, Share2, Check } from 'lucide-react';
import { toPng } from 'html-to-image';

export interface MeisterwerkCertificateProps {
  studentName: string;
  songTitle: string;
  instrument?: string;
  schoolName?: string;
  teacherName?: string;
  masteredDate?: string;
  certificateId?: string;
  onClose: () => void;
}

export const MeisterwerkCertificateModal: React.FC<MeisterwerkCertificateProps> = ({
  studentName,
  songTitle,
  instrument = 'Instrument',
  schoolName = 'Campus-Groovelab Musikschule',
  teacherName = 'Deine Lehrkraft',
  masteredDate,
  certificateId,
  onClose
}) => {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const formattedDate = masteredDate 
    ? new Date(masteredDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });

  const effectiveCertId = certificateId || `MW-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}-100`;

  const handleShareMasterpiece = async () => {
    const shareTitle = `🏆 Meisterwerk-Urkunde: ${songTitle}`;
    const shareText = `🎵 ${studentName} hat das musikalische Meisterwerk »${songTitle}« (${instrument}) mit Bravour an der ${schoolName} gemeistert!`;
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('[MeisterwerkCertificateModal] WebShare error:', err);
        }
      }
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
      } catch {
        // Fallback ignored
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!certificateRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const [{ toPng: toPngFn }, { default: jsPDF }] = await Promise.all([
        import('html-to-image'),
        import('jspdf')
      ]);

      const dataUrl = await toPngFn(certificateRef.current, {
        quality: 0.98,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff'
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgRatio = imgProps.width / imgProps.height;
      let renderWidth = pdfWidth;
      let renderHeight = pdfWidth / imgRatio;

      if (renderHeight > pdfHeight) {
        renderHeight = pdfHeight;
        renderWidth = pdfHeight * imgRatio;
      }

      const posX = (pdfWidth - renderWidth) / 2;
      const posY = (pdfHeight - renderHeight) / 2;

      pdf.addImage(dataUrl, 'PNG', posX, posY, renderWidth, renderHeight, undefined, 'FAST');
      
      const cleanStudent = studentName.replace(/\s+/g, '_');
      const cleanSong = songTitle.replace(/\s+/g, '_');
      pdf.save(`Meisterwerk_Urkunde_${cleanStudent}_${cleanSong}.pdf`);
    } catch (err) {
      console.error('[MeisterwerkCertificateModal] PDF generation error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999999,
        padding: '16px',
        animation: 'fadeIn 0.25s ease-out'
      }}
      onClick={onClose}
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #meisterwerk-print-area, #meisterwerk-print-area * {
            visibility: visible !important;
          }
          #meisterwerk-print-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            max-width: none !important;
            box-shadow: none !important;
            border: 4px solid #ca8a04 !important;
            padding: 40px !important;
            margin: 0 !important;
            background: #ffffff !important;
            display: flex !important;
            flex-direction: column !important;
            justifyContent: space-between !important;
            page-break-inside: avoid !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '820px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div 
          className="no-print"
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} color="#ca8a04" />
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
              Offizielle Meisterwerk-Goldurkunde
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              style={{
                background: '#ca8a04',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '7px 16px',
                fontSize: '0.80rem',
                fontWeight: 800,
                cursor: isExporting ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(202, 138, 4, 0.3)',
                opacity: isExporting ? 0.75 : 1
              }}
              title="Urkunde als druckfähige PDF-Datei herunterladen"
            >
              {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              <span>{isExporting ? 'PDF wird erstellt...' : 'PDF herunterladen'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareMasterpiece}
              style={{
                background: isCopied ? '#15803d' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '7px 16px',
                fontSize: '0.80rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: isCopied ? '0 2px 8px rgba(21, 128, 61, 0.3)' : '0 2px 8px rgba(37, 99, 235, 0.3)',
                transition: 'all 0.2s ease'
              }}
              title="Urkunde & Meisterwerk-Erfolg mit Familie teilen (WhatsApp / Messenger / Link)"
            >
              {isCopied ? <Check size={15} /> : <Share2 size={15} />}
              <span>{isCopied ? 'Link kopiert!' : 'Teilen'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              style={{
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '7px 16px',
                fontSize: '0.80rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)'
              }}
            >
              <Printer size={15} />
              <span>Drucken / AirPrint</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#e2e8f0',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#475569'
              }}
              title="Schließen"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Scrollable Stage Area */}
        <div 
          style={{
            padding: '24px',
            overflowY: 'auto',
            display: 'flex',
            justifyContent: 'center',
            background: '#f1f5f9'
          }}
        >
          {/* 📜 The Sovereign Certificate Document Canvas */}
          <div
            id="meisterwerk-print-area"
            ref={certificateRef}
            style={{
              width: '100%',
              maxWidth: '740px',
              background: '#fdfbf7',
              border: '2px solid #ca8a04',
              borderRadius: '16px',
              padding: '36px 44px',
              boxSizing: 'border-box',
              position: 'relative',
              boxShadow: 'inset 0 0 0 6px #fdfbf7, inset 0 0 0 8px rgba(202, 138, 4, 0.4), 0 10px 30px rgba(0,0,0,0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '16px',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, serif'
            }}
          >
            {/* Header / School Branding */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#ca8a04', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                Campus-Groovelab
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#334155', letterSpacing: '-0.01em' }}>
                Offizielle Auszeichnung der {schoolName ? (schoolName.toLowerCase().includes('musikschule') ? schoolName : `Musikschule ${schoolName}`) : 'Campus-Groovelab Musikschule'}
              </div>
            </div>

            {/* Ornamental Divider */}
            <div style={{ width: '80px', height: '2px', background: 'linear-gradient(90deg, transparent, #ca8a04, transparent)', margin: '4px 0' }} />

            {/* Headline */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Meisterwerk-Urkunde
              </h1>
              <div style={{ fontSize: '0.82rem', color: '#92400e', fontWeight: 600, fontStyle: 'italic' }}>
                in Anerkennung höchster musikalischer Exzellenz &amp; 100% Konzertreife
              </div>
            </div>

            {/* Conferment Subtext */}
            <div style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: 500, marginTop: '8px' }}>
              Diese Ehrenurkunde wird feierlich verliehen an
            </div>

            {/* Student Name */}
            <div style={{ 
              fontSize: '1.75rem', 
              fontWeight: 900, 
              color: '#0f172a', 
              letterSpacing: '-0.02em', 
              borderBottom: '2px solid #ca8a04',
              padding: '0 24px 6px 24px',
              display: 'inline-block'
            }}>
              {studentName}
            </div>

            {/* Achievement Text */}
            <div style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, maxWidth: '540px' }}>
              für das vollendete, fehlerfreie Meistern des musikalischen Meisterwerks
            </div>

            {/* Song Title & Instrument Badge */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#15803d', letterSpacing: '-0.01em' }}>
                » {songTitle} «
              </div>
              <div style={{ 
                background: '#fef3c7', 
                color: '#92400e', 
                border: '1px solid #fde68a', 
                borderRadius: '12px', 
                padding: '4px 14px', 
                fontSize: '0.76rem', 
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Music size={13} />
                <span>{instrument} • 100% Perfektion &amp; Gold-Status</span>
              </div>
            </div>

            {/* Certificate Footer with Laurel Seal and Signatures */}
            <div style={{ 
              width: '100%', 
              marginTop: '20px', 
              paddingTop: '20px', 
              borderTop: '1px solid #e2e8f0', 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr 1fr', 
              alignItems: 'end',
              gap: '16px',
              textAlign: 'left'
            }}>
              {/* Left: Date & Location */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.70rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Datum</span>
                <span style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 700 }}>{formattedDate}</span>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'monospace' }}>{effectiveCertId}</span>
              </div>

              {/* Center: Golden Sovereign Seal */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #fef08a 0%, #ca8a04 100%)',
                  boxShadow: '0 4px 12px rgba(202, 138, 4, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #ffffff'
                }}>
                  <ShieldCheck size={28} color="#ffffff" />
                </div>
                <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#92400e', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Geprüftes Meisterwerk
                </span>
              </div>

              {/* Right: Teacher Signature */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right', gap: '2px' }}>
                <span style={{ fontSize: '0.70rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Lehrkraft</span>
                <span style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 800 }}>{teacherName}</span>
                <div style={{ width: '120px', height: '1px', background: '#cbd5e1', marginTop: '8px' }} />
                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Unterschrift &amp; Bestätigung</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
