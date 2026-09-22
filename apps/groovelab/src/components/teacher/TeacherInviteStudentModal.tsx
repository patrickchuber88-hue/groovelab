import React from 'react';
import { X, Copy, Mail } from 'lucide-react';

export interface TeacherInviteStudentModalProps {
  showInviteStudent: boolean;
  setShowInviteStudent: (show: boolean) => void;
  inviteLink: string | null;
  setInviteLink: (link: string | null) => void;
  inviteFirstName: string;
  setInviteFirstName: (name: string) => void;
  inviteLastName: string;
  setInviteLastName: (name: string) => void;
  inviteEmail: string;
  setInviteEmail: (email: string) => void;
  inviteSaving: boolean;
  handleInviteStudent: (e: React.FormEvent) => Promise<void>;
}

export const TeacherInviteStudentModal: React.FC<TeacherInviteStudentModalProps> = ({
  showInviteStudent,
  setShowInviteStudent,
  inviteLink,
  setInviteLink,
  inviteFirstName,
  setInviteFirstName,
  inviteLastName,
  setInviteLastName,
  inviteEmail,
  setInviteEmail,
  inviteSaving,
  handleInviteStudent
}) => {
  if (!showInviteStudent) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)',
      zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
    }}>
      <div role="dialog" aria-modal="true" style={{
        background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '32px',
        width: '100%', maxWidth: '480px', padding: '32px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 950, color: '#1e293b', margin: '0 0 4px 0' }}>Schüler einladen</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Profil anlegen &amp; Einladungslink generieren</p>
          </div>
          <button onClick={() => { setShowInviteStudent(false); setInviteLink(null); }}
            style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        {!inviteLink ? (
          <form onSubmit={handleInviteStudent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Vorname *</label>
                <input type="text" required value={inviteFirstName} onChange={e => setInviteFirstName(e.target.value)} placeholder="Max"
                  style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '0.9rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Nachname</label>
                <input type="text" value={inviteLastName} onChange={e => setInviteLastName(e.target.value)} placeholder="Mustermann"
                  style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '0.9rem' }} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>E-Mail (optional)</label>
              <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="max@example.com"
                style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '0.9rem' }} />
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>Wird für den mailto-Link benötigt</span>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
              <button type="button" onClick={() => { setShowInviteStudent(false); setInviteLink(null); }}
                style={{ flex: 1, padding: '14px', borderRadius: '16px', border: '1.5px solid #e2e8f0', background: 'white', fontWeight: 800, color: '#475569', cursor: 'pointer' }}>
                Abbrechen
              </button>
              <button type="submit" disabled={inviteSaving}
                style={{ flex: 2, padding: '14px', borderRadius: '16px', border: 'none', background: '#8b5cf6', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(139,92,246,0.2)', opacity: inviteSaving ? 0.7 : 1 }}>
                {inviteSaving ? 'Erstelle...' : '🔗 Link erstellen'}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: '#e6f4ea', border: '1.5px solid #e6f4ea', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', background: '#34a853', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: 'white', fontSize: '1rem' }}>✓</span>
                </div>
                <div>
                  <div style={{ fontWeight: 900, color: '#34a853' }}>Profil angelegt!</div>
                  <div style={{ fontSize: '0.78rem', color: '#34a853' }}>Teile den Link mit dem Schüler</div>
                </div>
              </div>
              <div style={{ background: 'white', border: '1px solid #e6f4ea', borderRadius: '12px', padding: '12px 16px', wordBreak: 'break-all', fontSize: '0.75rem', color: '#475569', fontFamily: 'monospace' }}>
                {inviteLink}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => { navigator.clipboard.writeText(inviteLink!).then(() => alert('✓ Link kopiert!')); }}
                style={{ padding: '14px', borderRadius: '16px', border: 'none', background: '#8b5cf6', color: 'white', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(139,92,246,0.2)' }}>
                <Copy size={16} /> Link kopieren
              </button>
              {inviteEmail && (
                <a href={`mailto:${inviteEmail}?subject=Deine%20Einladung&body=Hallo%20${encodeURIComponent(inviteFirstName)}%2C%0A%0AHier%20ist%20dein%20persönlicher%20Einladungslink%3A%0A${encodeURIComponent(inviteLink!)}`}
                  style={{ padding: '14px', borderRadius: '16px', border: '1.5px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none', fontSize: '0.9rem' }}>
                  <Mail size={16} /> Per E-Mail senden
                </a>
              )}
              <button onClick={() => { setShowInviteStudent(false); setInviteLink(null); setInviteFirstName(''); setInviteLastName(''); setInviteEmail(''); }}
                style={{ padding: '10px', borderRadius: '16px', border: 'none', background: 'transparent', color: '#94a3b8', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                Schließen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
