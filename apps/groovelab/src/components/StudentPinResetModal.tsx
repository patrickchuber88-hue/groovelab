import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { X, Check, Copy, Share2, QrCode as QrCodeIcon, ShieldCheck, Sparkles, MessageCircle, ExternalLink, Calendar } from 'lucide-react';
import { formatSingleStudentAnonymized, useRealNamesVisibility } from '../utils/nameHelper';

interface StudentPinResetModalProps {
  student: {
    id: string;
    first_name?: string;
    last_name?: string;
    name?: string;
    qr_token?: string;
    ausweis_nummer?: string;
    instrument?: string;
    day_of_birth?: number | null;
  };
  onClose: () => void;
  accentColor?: string; // '#ea4335' (Admin/Sec) or '#34a853' (Campus) or '#eab308' (GrooveLab)
}

export function StudentPinResetModal({
  student,
  onClose,
  accentColor = '#34a853'
}: StudentPinResetModalProps) {
  const { visible: isPrivacyMode } = useRealNamesVisibility();
  const [copied, setCopied] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);

  const studentDisplayName = formatSingleStudentAnonymized(
    student.first_name || student.name?.split(' ')[0],
    student.last_name || (student.name?.includes(' ') ? student.name.split(' ').slice(1).join(' ') : ''),
    student.id,
    isPrivacyMode
  );

  const effectiveToken = student.qr_token || student.ausweis_nummer || student.id;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://app.campus-groovelab.de';
  const onboardingUrl = `${baseUrl}/qr/${effectiveToken}?onboarding=true`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(onboardingUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = onboardingUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn('Copy link error:', e);
    }
  };

  const handleWhatsAppShare = () => {
    const text = `Hallo! Hier ist der Link zur Vergabe einer neuen 4-stelligen PIN für ${studentDisplayName} bei Campus-Groovelab:\n\n${onboardingUrl}\n\nEinfach öffnen, Geburtstagstag bestätigen und neue 4-stellige PIN wählen.`;
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '480px',
          padding: '28px 24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          maxHeight: '92vh',
          overflowY: 'auto'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b',
            transition: 'background 0.15s'
          }}
          title="Schließen"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', paddingRight: '20px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '18px',
              background: '#e6f4ea',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto'
            }}
          >
            <Sparkles size={28} color="#34a853" />
          </div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
            Neuer Onboarding-Link
          </h2>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>
            Für <strong>{studentDisplayName}</strong> ({student.instrument || 'Musikschüler'})
          </p>
        </div>

        {/* Info Card */}
        <div
          style={{
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '16px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 800, color: '#166534' }}>
            <ShieldCheck size={18} color="#34a853" />
            <span>PIN erfolgreich zurückgesetzt</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
            Der Schüler bzw. die Eltern öffnen den Link, bestätigen zur Sicherheit ihren <strong>Geburtstagstag (1–31)</strong> und legen sofort ihre neue 4-stellige Wunsch-PIN fest.
          </p>
        </div>

        {/* Link Display Box */}
        <div
          style={{
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '14px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}
        >
          <span
            style={{
              fontSize: '0.82rem',
              color: '#334155',
              fontFamily: 'monospace',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1
            }}
          >
            {onboardingUrl}
          </span>
          <button
            onClick={handleCopyLink}
            style={{
              background: copied ? '#34a853' : '#f1f5f9',
              color: copied ? '#ffffff' : '#1e293b',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 12px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s',
              flexShrink: 0
            }}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            <span>{copied ? 'Kopiert!' : 'Kopieren'}</span>
          </button>
        </div>

        {/* Quick Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            onClick={handleWhatsAppShare}
            style={{
              background: '#25d366',
              color: '#ffffff',
              border: 'none',
              borderRadius: '14px',
              padding: '12px 14px',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(37, 211, 102, 0.25)',
              transition: 'transform 0.1s'
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={e => e.currentTarget.style.transform = ''}
          >
            <MessageCircle size={18} />
            <span>Per WhatsApp</span>
          </button>

          <button
            onClick={() => setShowQrCode(!showQrCode)}
            style={{
              background: showQrCode ? '#0f172a' : '#f1f5f9',
              color: showQrCode ? '#ffffff' : '#0f172a',
              border: '1.5px solid #e2e8f0',
              borderRadius: '14px',
              padding: '12px 14px',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s'
            }}
          >
            <QrCodeIcon size={18} />
            <span>{showQrCode ? 'QR verbergen' : 'QR-Code zeigen'}</span>
          </button>
        </div>

        {/* Expanded QR Code for on-screen live scanning */}
        {showQrCode && (
          <div
            style={{
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <div
              style={{
                background: '#ffffff',
                padding: '14px',
                borderRadius: '16px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
              }}
            >
              <QRCode value={onboardingUrl} size={150} level="M" />
            </div>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textAlign: 'center' }}>
              Schüler kann den Code jetzt direkt mit dem Smartphone abfotografieren
            </span>
          </div>
        )}

        {/* Permanent Physical Sticker Guarantee Notice */}
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Calendar size={16} color="#166534" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700, lineHeight: 1.4 }}>
            Gedruckte QR-Codes (Notenheft / Instrumentenkoffer) bleiben zu 100% gültig und leiten automatisch zur neuen PIN weiter!
          </span>
        </div>
      </div>
    </div>
  );
}
