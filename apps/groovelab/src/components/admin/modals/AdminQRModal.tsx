import React, { useRef, useState, useEffect } from 'react';
import { ExternalLink, RefreshCw, Download, X } from 'lucide-react';
import { IDBadgeCard, inlineAllImagesInElement } from '../../IDBadgeCard';
import { revokeStudentToken } from '../../../utils/tokenSigner';
import { maskLastName } from '../../../utils/nameHelper';

export interface AdminQRModalProps {
  user: any;
  onClose: () => void;
  activePlatform: string;
  admin: any;
  schoolObj?: any;
  showRealNames?: boolean;
  supabase: any;
  onUserUpdated?: (updatedUser: any) => void;
}

export const AdminQRModal: React.FC<AdminQRModalProps> = ({
  user,
  onClose,
  activePlatform,
  admin,
  schoolObj,
  showRealNames = false,
  supabase,
  onUserUpdated
}) => {
  const [selectedQRUser, setSelectedQRUser] = useState<any>(user);
  const qrCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedQRUser(user);
  }, [user]);

  if (!selectedQRUser) return null;


    const roleLower = (selectedQRUser.role || '').toLowerCase();
    const isQRAdminOrSecretary = roleLower === 'admin' || roleLower === 'secretary';

    const handleRegenerateToken = async () => {
      if (!window.confirm('Möchtest du diesen QR-Code wirklich sperren und neu generieren? Der alte Code verliert sofort seine Gültigkeit.')) {
        return;
      }

      const isStudent = selectedQRUser.role === 'student';
      let newToken: string;

      if (isStudent) {
        try {
          // Use Tier-1 Emergency Revocation RPC
          const revResult = await revokeStudentToken(selectedQRUser.id);
          if (revResult.success && revResult.newQrToken) {
            newToken = revResult.newQrToken;
            setSelectedQRUser({
              ...selectedQRUser,
              qr_token: newToken,
              ausweis_nummer: revResult.newAusweisNummer || selectedQRUser.ausweis_nummer,
              is_campus_active: true,
              is_groovelab_active: true
            });
            onUserUpdated?.({
              ...selectedQRUser,
              qr_token: newToken,
              ausweis_nummer: revResult.newAusweisNummer || selectedQRUser.ausweis_nummer,
              is_campus_active: true,
              is_groovelab_active: true
            });
            alert('Ausweis-Token und alle aktiven Sitzungen erfolgreich widerrufen und neu ausgestellt!');
            return;
          }
        } catch (revErr) {
          console.warn('[AdminDashboard] revokeStudentToken failed, falling back to direct update:', revErr);
        }

        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
          newToken = crypto.randomUUID();
        } else {
          newToken = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
        }
      } else {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        newToken = 't_';
        for (let i = 0; i < 24; i++) {
          newToken += chars.charAt(Math.floor(Math.random() * chars.length));
        }
      }

      try {
        const updateData = isStudent 
          ? { qr_token: newToken, is_campus_active: true, is_groovelab_active: true } 
          : { teacher_qr_token: newToken };

        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', selectedQRUser.id);

        if (error) {
          alert('Fehler beim Sperren/Generieren des QR-Codes: ' + error.message);
        } else {
          // Update selected user state immediately
          setSelectedQRUser({
            ...selectedQRUser,
            qr_token: isStudent ? newToken : selectedQRUser.qr_token,
            teacher_qr_token: !isStudent ? newToken : selectedQRUser.teacher_qr_token,
            is_campus_active: isStudent ? true : selectedQRUser.is_campus_active,
            is_groovelab_active: isStudent ? true : selectedQRUser.is_groovelab_active
          });

          onUserUpdated?.({
            ...selectedQRUser,
            qr_token: isStudent ? newToken : selectedQRUser.qr_token,
            teacher_qr_token: !isStudent ? newToken : selectedQRUser.teacher_qr_token,
            is_campus_active: isStudent ? true : selectedQRUser.is_campus_active,
            is_groovelab_active: isStudent ? true : selectedQRUser.is_groovelab_active
          });

          alert(isStudent ? 'QR-Code erfolgreich neu generiert und Benutzerkonto reaktiviert!' : 'QR-Code erfolgreich neu generiert!');
        }
      } catch (err: any) {
        console.error('Error updating qr_token in AdminDashboard:', err);
        alert('Fehler beim Aktualisieren: ' + (err.message || 'Unbekannter Fehler'));
      }
    };

    const saveAsImage = async () => {
      if (!qrCardRef.current) return;
      try {
        await inlineAllImagesInElement(qrCardRef.current);
        const { toJpeg } = await import('html-to-image');
        const roleLower = (selectedQRUser.role || '').toLowerCase();
        const isQRAdminOrSecretary = roleLower === 'admin' || roleLower === 'secretary';
        const dataUrl = await toJpeg(qrCardRef.current, { 
          quality: 0.98, 
          backgroundColor: '#ffffff',
          cacheBust: false,
          pixelRatio: 2,
        });
        const link = document.createElement('a');
        link.download = (activePlatform === 'campus' && (selectedQRUser.role === 'student' || isQRAdminOrSecretary)) 
          ? `Campus_Pass_${selectedQRUser.first_name}.jpg` 
          : `Groovelab_Pass_${selectedQRUser.first_name}.jpg`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Error saving ID:', err);
      }
    };

    const downloadWalletPass = () => {
      const passContent = JSON.stringify({
        passTypeIdentifier: selectedQRUser.role === 'admin' ? 'pass.de.groovelab.admin' : (selectedQRUser.role === 'teacher' ? 'pass.de.groovelab.teacher' : 'pass.de.groovelab.student'),
        serialNumber: selectedQRUser.qr_token || selectedQRUser.teacher_qr_token || selectedQRUser.id,
        teamIdentifier: "GROOVELAB",
        organizationName: "Campus-Groovelab",
        description: `Campus-Groovelab ${selectedQRUser.role} Pass`,
        logoText: "Campus-Groovelab",
        foregroundColor: "rgb(255, 255, 255)",
        backgroundColor: activePlatform === 'campus' ? "rgb(10, 54, 28)" : "rgb(30, 41, 59)",
        labelColor: "rgb(230, 244, 234)",
        studentName: `${selectedQRUser.first_name} ${maskLastName(selectedQRUser.last_name, showRealNames)}`,
        instrument: selectedQRUser.instrument || (selectedQRUser.role === 'admin' ? 'Administrator' : (selectedQRUser.role === 'secretary' ? 'Sekretariat' : 'Lehrkraft')),
        qrToken: selectedQRUser.qr_token || selectedQRUser.teacher_qr_token
      }, null, 2);

      const blob = new Blob([passContent], { type: 'application/vnd.apple.pkpass' });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `campus-pass-${selectedQRUser.first_name || 'user'}.pkpass`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    };

    const downloadGoogleWalletPass = () => {
      const passContent = JSON.stringify({
        classId: `groovelab.${selectedQRUser.role || 'student'}`,
        id: selectedQRUser.qr_token || selectedQRUser.teacher_qr_token || selectedQRUser.id,
        state: "ACTIVE",
        barcode: {
          type: "QR_CODE",
          value: selectedQRUser.qr_token || selectedQRUser.teacher_qr_token
        },
        cardTitle: {
          defaultValue: {
            language: "de-DE",
            value: "Campus-Groovelab"
          }
        },
        subheader: {
          defaultValue: {
            language: "de-DE",
            value: selectedQRUser.role === 'admin' ? 'Administrator' : (selectedQRUser.role === 'secretary' ? 'Sekretariat' : (selectedQRUser.role === 'teacher' ? 'Lehrkraft' : 'Schüler'))
          }
        },
        header: {
          defaultValue: {
            language: "de-DE",
            value: `${selectedQRUser.first_name} ${maskLastName(selectedQRUser.last_name, showRealNames)}`
          }
        }
      }, null, 2);

      const blob = new Blob([passContent], { type: 'application/json' });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `google-wallet-pass-${selectedQRUser.first_name || 'user'}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    };

    const brandColor = activePlatform === 'groovelab' ? '#eab308' : '#34a853';

    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }} onClick={() => onClose()}>
        <div style={{ width: '100%', maxWidth: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }} onClick={e => e.stopPropagation()}>
          {/* Close Button */}
          <button 
            onClick={() => onClose()} 
            style={{ 
              position: 'absolute', 
              top: '-56px', 
              right: '0', 
              background: 'rgba(255,255,255,0.15)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)', 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer', 
              color: 'white',
              transition: 'all 0.2s'
            }}
          >
            <X size={20} />
          </button>

          {/* ID Card Design */}
          <IDBadgeCard 
            user={selectedQRUser} 
            activePlatform={activePlatform} 
            qrValue={`${window.location.origin}/qr/${(selectedQRUser.role === 'teacher' || selectedQRUser.role === 'admin') ? (selectedQRUser.teacher_qr_token || selectedQRUser.qr_token || selectedQRUser.id || '') : (selectedQRUser.qr_token || selectedQRUser.ausweis_nummer || selectedQRUser.id || '')}`} 
            cardRef={qrCardRef}
          />

          <button 
            onClick={saveAsImage} 
            style={{ 
              width: '100%', 
              background: (activePlatform === 'campus' && (selectedQRUser.role === 'student' || isQRAdminOrSecretary)) 
                ? (isQRAdminOrSecretary ? '#b91c1c' : '#34a853') 
                : brandColor, 
              color: activePlatform === 'groovelab' ? '#1e293b' : 'white', 
              border: 'none', 
              padding: '16px', 
              borderRadius: '20px', 
              fontWeight: 900, 
              fontSize: '0.92rem', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '10px', 
              marginTop: '16px', 
              boxShadow: `0 15px 35px ${(activePlatform === 'campus' && (selectedQRUser.role === 'student' || isQRAdminOrSecretary)) ? (isQRAdminOrSecretary ? '#b91c1c' : '#34a853') : brandColor}50`, 
              transition: 'all 0.2s' 
            }} 
          >
            <Download size={20} /> Ausweis als JPEG speichern
          </button>

          {/* Wallet integration options */}
          <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '10px' }}>
            <button 
              onClick={downloadWalletPass}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '16px',
                border: '1.5px solid #e2e8f0',
                background: '#ffffff',
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              <span>Apple Wallet</span>
            </button>

            <button 
              onClick={downloadGoogleWalletPass}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '16px',
                border: '1.5px solid #e2e8f0',
                background: '#ffffff',
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              <span>Google Wallet</span>
            </button>
          </div>

          {/* Action button for managers to regenerate QR Code */}
          <button
            type="button"
            onClick={() => {
              const effectiveToken = (selectedQRUser.role === 'teacher' || selectedQRUser.role === 'admin')
                ? (selectedQRUser.teacher_qr_token || selectedQRUser.qr_token || selectedQRUser.id || '')
                : (selectedQRUser.qr_token || selectedQRUser.ausweis_nummer || selectedQRUser.id || '');
              const qrUrl = `${window.location.origin}/qr/${effectiveToken}`;
              window.open(qrUrl, '_blank');
            }}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '20px',
              border: '1.5px dashed #cbd5e1',
              background: '#f1f5f9',
              color: '#0f172a',
              fontWeight: 900,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '10px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e2e8f0';
              e.currentTarget.style.borderColor = '#94a3b8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
          >
            <ExternalLink size={20} color="#0f172a" />
            🛠️ QR-Landingpage testen ↗
          </button>
          <button
            onClick={handleRegenerateToken}
            className="google-btn-secondary"
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '20px',
              border: '1.5px solid #fecdd3',
              background: '#fff1f2',
              color: '#e11d48',
              fontWeight: 900,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '10px',
              boxShadow: '0 15px 35px rgba(225, 29, 72, 0.05)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ffe4e6';
              e.currentTarget.style.borderColor = '#fda4af';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fff1f2';
              e.currentTarget.style.borderColor = '#fecdd3';
            }}
          >
            <RefreshCw size={20} /> QR-Code sperren &amp; neu generieren
          </button>
        </div>
      </div>
    );
};

export default AdminQRModal;
