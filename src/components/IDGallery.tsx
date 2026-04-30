import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import { supabase } from '../lib/supabase';
import { X, Printer, Download, Music, Shield, Save } from 'lucide-react';
import { toJpeg } from 'html-to-image';

interface IDGalleryProps {
  onClose: () => void;
}

export function IDGallery({ onClose }: IDGalleryProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const brandColor = '#eab308'; // Premium Yellow

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*, schools(*)')
      .order('role', { ascending: false })
      .order('last_name', { ascending: true });

    if (data) setUsers(data);
    setLoading(false);
  };

  const saveAsImage = async (user: any) => {
    if (!cardRef.current) return;
    
    try {
      // Small delay to ensure styles are applied
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const dataUrl = await toJpeg(cardRef.current, { 
        quality: 0.95,
        pixelRatio: 3,
        backgroundColor: 'white'
      });
      const link = document.createElement('a');
      link.download = `Groovelab_ID_${user.first_name}_${user.last_name}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error saving image:', err);
      alert('Fehler beim Speichern des Bildes.');
    }
  };

  if (loading) return (
    <div className="flex-center" style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 10000 }}>
      <div className="loader"></div>
      <p style={{ marginTop: '20px', fontWeight: 700 }}>Lade Galerie...</p>
    </div>
  );

  return (
    <div className="id-gallery-overlay" style={{
      position: 'fixed',
      inset: 0,
      background: '#f8fafc',
      zIndex: 9999,
      overflowY: 'auto',
      padding: '40px'
    }}>
      <style>{`
        .id-card-container {
          background: white;
          border-radius: 20px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
          position: relative;
          width: 100%;
          max-width: 280px;
          margin: 0 auto;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .id-card-container:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.08);
          border-color: #eab308;
        }
        .export-branding {
          font-family: 'Inter', sans-serif;
          font-weight: 900;
          letter-spacing: 0.2em;
          color: #eab308;
          margin-bottom: 20px;
        }
      `}</style>

      <div className="no-print" style={{ 
        maxWidth: '1200px', 
        margin: '0 auto 40px auto', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        background: 'white',
        padding: '24px 32px',
        borderRadius: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#1e293b' }}>ID Galerie</h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontWeight: 600 }}>Wähle einen Ausweis zum Vergrößern und Speichern</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onClose} style={{
            background: '#f1f5f9',
            color: '#64748b',
            border: 'none',
            borderRadius: '14px',
            padding: '12px',
            cursor: 'pointer'
          }}>
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="id-card-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
        gap: '30px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {users.map(user => (
          <div key={user.id} className="id-card-container" onClick={() => setSelectedUser(user)}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              borderRadius: '18px', 
              overflow: 'hidden', 
              border: '3px solid #f1f5f9',
              marginBottom: '12px' 
            }}>
              <img src={user.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
            </div>
            
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 800 }}>{user.first_name} {user.last_name}</h3>
            <div style={{ 
              fontSize: '0.65rem', 
              fontWeight: 900, 
              color: brandColor, 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em',
              background: '#fffbeb',
              padding: '2px 8px',
              borderRadius: '100px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {user.role === 'student' ? <Music size={10} /> : <Shield size={10} />}
              {user.role === 'student' ? 'Schüler' : user.role === 'admin' ? 'Director' : 'Coach'}
            </div>

            <div style={{ background: 'white', padding: '10px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
              <QRCode value={user.qr_token || user.id} size={140} />
            </div>
          </div>
        ))}
      </div>

      {/* Enlarged Detail Modal */}
      {selectedUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(8px)',
          zIndex: 10001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          overflowY: 'auto'
        }} onClick={() => setSelectedUser(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px', padding: '40px 0' }} onClick={e => e.stopPropagation()}>
            
            {/* The Card for saving */}
            <div ref={cardRef} style={{
              background: 'white',
              borderRadius: '40px',
              padding: '60px 40px',
              width: '450px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              border: '1px solid #f1f5f9'
            }}>
               {/* Branding instead of Avatar for Export Stability */}
               <div className="export-branding" style={{ fontSize: '1.2rem', marginBottom: '40px' }}>
                 GROOVELAB
               </div>

              <h2 style={{ margin: '0 0 12px 0', fontSize: '2.5rem', fontWeight: 900, color: '#1e293b', letterSpacing: '-0.02em' }}>
                {selectedUser.first_name} {selectedUser.last_name}
              </h2>
              
              <div style={{ 
                fontSize: '1rem', 
                fontWeight: 900, 
                color: brandColor, 
                textTransform: 'uppercase', 
                letterSpacing: '0.15em',
                background: '#fffbeb',
                padding: '6px 24px',
                borderRadius: '100px',
                marginBottom: '48px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {selectedUser.role === 'student' ? <Music size={18} /> : <Shield size={18} />}
                {selectedUser.role === 'student' ? 'Schüler' : selectedUser.role === 'admin' ? 'Academy Director' : 'Coach'}
              </div>

              <div style={{ 
                background: 'white', 
                padding: '24px', 
                borderRadius: '32px', 
                border: '2px solid #f1f5f9',
                boxShadow: '0 12px 24px rgba(0,0,0,0.02)' 
              }}>
                <QRCode value={selectedUser.qr_token || selectedUser.id} size={260} />
              </div>

              <div style={{ marginTop: '40px', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                Groovelab Digital ID
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '450px' }}>
              <button onClick={() => saveAsImage(selectedUser)} style={{
                background: brandColor,
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                padding: '20px 40px',
                fontWeight: 900,
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                cursor: 'pointer',
                boxShadow: `0 12px 32px ${brandColor}66`,
                transition: 'transform 0.2s'
              }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                <Save size={24} /> Ausweis speichern (JPEG)
              </button>
              
              <button onClick={() => setSelectedUser(null)} style={{
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '20px',
                padding: '16px 24px',
                fontWeight: 800,
                cursor: 'pointer',
                textAlign: 'center'
              }}>
                Zurück zur Galerie
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
