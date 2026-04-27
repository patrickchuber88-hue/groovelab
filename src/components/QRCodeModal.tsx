import QRCode from 'react-qr-code';
import { X, Shield, Music, Download } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useRef } from 'react';

interface QRCodeModalProps {
  user: {
    first_name: string;
    last_name: string;
    role: string;
    qr_token: string;
  };
  onClose: () => void;
}

export function QRCodeModal({ user, onClose }: QRCodeModalProps) {
  const brandColor = 'var(--primary-color)';
  const cardRef = useRef<HTMLDivElement>(null);

  const downloadImage = () => {
    if (cardRef.current === null) return;
    
    // Kleiner Timeout um sicherzugehen, dass alles gerendert ist
    toPng(cardRef.current, { 
      cacheBust: true,
      backgroundColor: '#ffffff',
      style: {
        borderRadius: '0', // Für das Bild keine abgerundeten Ecken am Rand
      }
    })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `Groovelab_ID_${user.first_name}_${user.last_name}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error('Fehler beim Bild-Download:', err);
      });
  };
  
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9000,
      padding: '20px'
    }}>
      <div style={{ maxWidth: '360px', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div ref={cardRef} className="glass-panel" style={{
          padding: '40px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'white',
          position: 'relative',
          width: '100%',
          borderRadius: '32px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px 0', color: '#1e293b' }}>
              {user.first_name} {user.last_name}
            </h2>
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '0.75rem', 
              fontWeight: 800, 
              color: brandColor, 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em',
              background: '#fffbeb',
              padding: '4px 12px',
              borderRadius: '100px',
              border: '1px solid #fde68a'
            }}>
              {user.role === 'student' ? <Music size={12} /> : <Shield size={12} />}
              {user.role === 'student' ? 'Schüler' : user.role === 'admin' ? 'Academy Director' : 'Groovelab Coach'}
            </div>
          </div>

          <div style={{ background: 'white', padding: '20px', borderRadius: '24px', boxShadow: 'inset 0 0 0 1px #e2e8f0', marginBottom: '24px' }}>
            <QRCode value={user.qr_token} size={220} />
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0, fontWeight: 500, lineHeight: 1.5 }}>
            Zeige diesen Code an einem iPad vor,<br/>um dich einzuchecken.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={downloadImage}
            style={{
              flex: 1,
              background: brandColor,
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(234, 179, 8, 0.3)'
            }}
          >
            <Download size={20} /> Als Bild speichern
          </button>
          <button 
            onClick={onClose}
            style={{
              background: 'white',
              color: '#64748b',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '16px',
              width: '56px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
