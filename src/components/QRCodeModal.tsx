import QRCode from 'react-qr-code';
import { X, Download } from 'lucide-react';
import { toJpeg } from 'html-to-image';
import { useRef, useState, useEffect } from 'react';

interface QRCodeModalProps {
  user: {
    first_name: string;
    last_name: string;
    role: string;
    qr_token: string;
    photo_url?: string;
  };
  onClose: () => void;
}

export function QRCodeModal({ user, onClose }: QRCodeModalProps) {
  const brandColor = 'var(--primary-color)';
  const cardRef = useRef<HTMLDivElement>(null);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const originalUrl = user.photo_url || '/avatar_ghost.jpg';
    
    if (originalUrl.startsWith('data:') || originalUrl.startsWith('blob:')) {
      setAvatarDataUrl(originalUrl);
      return;
    }

    const loadAndConvert = async () => {
      try {
        let url = new URL(originalUrl, window.location.origin).href;
        
        if (originalUrl !== '/avatar_ghost.jpg') {
          const separator = url.includes('?') ? '&' : '?';
          url = `${url}${separator}cb=${Date.now()}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        
        const reader = new FileReader();
        reader.onloadend = () => {
          if (active) {
            setAvatarDataUrl(reader.result as string);
          }
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.warn('Could not convert image to base64, using fallback URL:', err);
        if (active) {
          setAvatarDataUrl(originalUrl);
        }
      }
    };

    loadAndConvert();
    return () => {
      active = false;
    };
  }, [user.photo_url]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.src.startsWith('data:')) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width || 120;
      canvas.height = img.naturalHeight || img.height || 120;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setAvatarDataUrl(dataUrl);
      }
    } catch (err) {
      console.warn('OnLoad canvas conversion failed:', err);
    }
  };

  const downloadImage = async () => {
    if (cardRef.current === null) return;
    try {
      const dataUrl = await toJpeg(cardRef.current, { 
        quality: 0.95,
        backgroundColor: '#ffffff',
        cacheBust: true
      });
      const link = document.createElement('a');
      link.download = `Groovelab_ID_${user.first_name}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Fehler beim JPEG-Download:', err);
    }
  };
  
  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '400px', width: '100%', position: 'relative' }}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '-60px',
            right: '0',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: 'white',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={24} />
        </button>

        {/* Unified Card Design */}
        <div 
          ref={cardRef} 
          style={{
            background: 'white',
            borderRadius: '32px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
            overflow: 'hidden',
            width: '100%'
          }}
        >
          {/* Lanyard Hole Mockup */}
          <div style={{ height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b' }}>
            <div style={{ width: '36px', height: '8px', borderRadius: '4px', background: '#0f172a' }}></div>
          </div>

          {/* Status Header */}
          <div style={{ 
            background: user.role === 'student' ? brandColor : '#f59e0b', 
            padding: '10px', 
            textAlign: 'center',
            textTransform: 'uppercase'
          }}>
            <div style={{ color: 'white', fontSize: '0.7rem', fontWeight: 900, letterSpacing: '0.2em' }}>
              {user.role === 'student' ? 'Member Access' : 'Staff / Coach'}
            </div>
          </div>

          {/* Content Area */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px 36px 24px', gap: '20px' }}>
            {/* Portrait */}
            <div style={{ 
              width: '120px', 
              height: '120px', 
              borderRadius: '50%', 
              border: `4px solid ${user.role === 'student' ? brandColor : '#f59e0b'}`,
              padding: '4px',
              background: 'white',
              boxShadow: '0 8px 20px rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              <img 
                src={avatarDataUrl || '/avatar_ghost.jpg'} 
                onLoad={handleImageLoad}
                crossOrigin="anonymous"
                alt="Profile"
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  borderRadius: '50%'
                }} 
              />
            </div>

            {/* Identity */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1e293b', lineHeight: 1.1, letterSpacing: '-0.02em' }}>{user.first_name}</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#64748b', marginTop: '4px' }}>{user.last_name || 'Member'}</div>
            </div>

            {/* QR Code Container */}
            <div style={{ 
              background: 'white', 
              padding: '16px', 
              borderRadius: '20px',
              border: '1px solid #f1f5f9',
              boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <QRCode value={user.qr_token || ''} size={150} />
            </div>

            <p style={{ 
              fontSize: '0.75rem', 
              color: '#94a3b8', 
              textAlign: 'center', 
              margin: '0', 
              fontWeight: 600, 
              lineHeight: 1.4,
              maxWidth: '220px'
            }}>
              Halte diesen Code vor die Kamera des iPads,<br/>um dich automatisch am Platz anzumelden.
            </p>
          </div>

          {/* Bottom Brand Stripe */}
          <div style={{ 
            height: '12px', 
            background: `linear-gradient(90deg, ${user.role === 'student' ? brandColor : '#f59e0b'}, #1e293b, ${user.role === 'student' ? brandColor : '#f59e0b'})` 
          }}></div>
        </div>

        {/* Action Button */}
        <button 
          onClick={downloadImage}
          style={{
            width: '100%',
            background: brandColor,
            color: 'white',
            border: 'none',
            borderRadius: '24px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            fontWeight: 900,
            fontSize: '1rem',
            cursor: 'pointer',
            boxShadow: `0 15px 35px ${brandColor}50`,
            transition: 'all 0.2s',
            marginTop: '24px'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <Download size={24} /> Ausweis als JPEG speichern
        </button>
      </div>
    </div>
  );
}
