import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, AlertCircle, Sparkles, Lock, Mail, Key, Download } from 'lucide-react';
import QRCode from 'react-qr-code';

interface TeacherActivationProps {
  onSuccess: (userId: string) => void;
}

export function TeacherActivation({ onSuccess }: TeacherActivationProps) {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  
  const [step, setStep] = useState<'verify' | 'password' | 'success'>('verify');
  const [activatedTeacherId, setActivatedTeacherId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState('');
  const [teacherQrToken, setTeacherQrToken] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    // Auto-fill email if present in URL parameters
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    const tokenParam = params.get('token') || params.get('qr_token');
    
    if (emailParam) {
      setEmail(emailParam);
    }
    
    // If token exists, we can pre-fetch email from database to simplify flow
    if (tokenParam) {
      fetchEmailByToken(tokenParam);
    }
  }, []);

  const fetchEmailByToken = async (token: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('email')
        .eq('teacher_qr_token', token)
        .eq('role', 'teacher')
        .maybeSingle();

      if (data && data.email) {
        setEmail(data.email);
      }
    } catch (err) {
      console.error('Error fetching email by token:', err);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !pin.trim()) {
      triggerShake('Bitte gib E-Mail und deine Ausweisnummer (Einmal-PIN) ein.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Find teacher profile in the database matching email and ausweis_nummer (registration_pin)
      const { data: teacher, error: fetchError } = await supabase
        .from('users')
        .select('id, first_name, last_name, teacher_qr_token, email, ausweis_nummer, role, is_active')
        .eq('email', email.trim().toLowerCase())
        .eq('ausweis_nummer', pin.trim().toUpperCase())
        .eq('role', 'teacher')
        .maybeSingle();

      if (fetchError || !teacher) {
        throw new Error('Lehrkraft mit diesen Anmeldedaten wurde nicht gefunden. Bitte überprüfe deine Eingaben.');
      }

      setActivatedTeacherId(teacher.id);
      setTeacherName(`${teacher.first_name || ''} ${teacher.last_name || ''}`.trim());
      setTeacherQrToken(teacher.teacher_qr_token || '');
      setStep('password');
    } catch (err: any) {
      triggerShake(err.message || 'Verifizierungsfehler. Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 4) {
      triggerShake('Die PIN muss mindestens 4 Ziffern oder Zeichen lang sein.');
      return;
    }
    if (password !== passwordConfirm) {
      triggerShake('Die eingegebenen PINs stimmen nicht überein.');
      return;
    }
    if (!activatedTeacherId) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Update teacher password (PIN) and set active flags (Terminates Bypass mode)
      const { error: updateError } = await supabase
        .from('users')
        .update({
          is_active: true,
          is_campus_active: true,
          status: 'active',
          master_admin_password: password // Store PIN/password securely in master_admin_password
        })
        .eq('id', activatedTeacherId);

      if (updateError) throw updateError;

      setStep('success');
    } catch (err: any) {
      triggerShake(err.message || 'PIN-Zuweisung fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  const triggerShake = (msg: string) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const downloadQrCode = () => {
    if (!teacherQrToken) return;
    const url = `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(`https://campus-groovelab.de/qr/${teacherQrToken}`)}`;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.download = `groovelab_ausweis_${teacherName.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc', // Clean light gray/blue background
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '40px 16px',
      fontFamily: '"Outfit", "Inter", -apple-system, sans-serif',
      color: '#1d1d1f'
    }}>
      <div style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Brand Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: '#e8f0fe',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(11, 87, 208, 0.08)'
          }}>
            <Sparkles size={28} color="#0b57d0" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0b57d0', letterSpacing: '-0.02em' }}>
              Campus Platform
            </h1>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Lehrkräfte-Registrierung
            </span>
          </div>
        </div>

        {/* Card Container */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '28px',
          padding: '36px 32px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>
              {step === 'verify' && 'Erstaktivierung starten'}
              {step === 'password' && 'Persönliche PIN vergeben'}
              {step === 'success' && 'Freischaltung erfolgreich!'}
            </h2>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: '#64748b', textAlign: 'center', lineHeight: '1.4' }}>
              {step === 'verify' && 'Schalte deinen Zugang mit deiner E-Mail und deiner Ausweisnummer (Einmal-PIN) frei.'}
              {step === 'password' && 'Lege deine persönliche PIN für zukünftige App-Anmeldungen fest.'}
              {step === 'success' && 'Dein Account ist jetzt einsatzbereit. Du wirst weitergeleitet...'}
            </p>
          </div>

          {step === 'verify' && (
            <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Email Input */}
              <div className={shake && !email ? 'animate-[shake_0.5s_ease-in-out]' : ''} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  E-Mail Adresse
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@musikschule.de"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '14px 16px 14px 46px',
                      borderRadius: '14px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.9rem',
                      outline: 'none',
                      color: '#0f172a',
                      fontWeight: 600,
                      background: '#f8fafc',
                      transition: 'all 0.2s'
                    }}
                  />
                </div>
              </div>

              {/* Pin Input */}
              <div className={shake && !pin ? 'animate-[shake_0.5s_ease-in-out]' : ''} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Ausweisnummer (Einmal-PIN)
                </label>
                <div style={{ position: 'relative' }}>
                  <Key size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    required
                    placeholder="z.B. GL-1234"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '14px 16px 14px 46px',
                      borderRadius: '14px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.9rem',
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                      outline: 'none',
                      color: '#b45309',
                      background: '#f8fafc',
                      letterSpacing: '0.1em',
                      transition: 'all 0.2s'
                    }}
                  />
                </div>
              </div>

              {error && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: '#fef2f2',
                  border: '1px solid #fee2e2',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: '#991b1b',
                  fontSize: '0.8rem',
                  fontWeight: 600
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '100px',
                  background: '#0b57d0',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(11, 87, 208, 0.15)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {loading ? (
                  <div className="animate-spin" style={{ width: '16px', height: '16px', border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
                ) : (
                  'Daten verifizieren'
                )}
              </button>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handleSetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Password Input */}
              <div className={shake && !password ? 'animate-[shake_0.5s_ease-in-out]' : ''} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Neue PIN festlegen
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Mindestens 4 Ziffern oder Zeichen"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '14px 16px 14px 46px',
                      borderRadius: '14px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.9rem',
                      outline: 'none',
                      color: '#0f172a',
                      fontWeight: 600,
                      background: '#f8fafc',
                      transition: 'all 0.2s'
                    }}
                  />
                </div>
              </div>

              {/* Password Confirm Input */}
              <div className={shake && !passwordConfirm ? 'animate-[shake_0.5s_ease-in-out]' : ''} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  PIN bestätigen
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    required
                    placeholder="PIN erneut eingeben"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '14px 16px 14px 46px',
                      borderRadius: '14px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.9rem',
                      outline: 'none',
                      color: '#0f172a',
                      fontWeight: 600,
                      background: '#f8fafc',
                      transition: 'all 0.2s'
                    }}
                  />
                </div>
              </div>

              {error && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: '#fef2f2',
                  border: '1px solid #fee2e2',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: '#991b1b',
                  fontSize: '0.8rem',
                  fontWeight: 600
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '100px',
                  background: '#34a853', // Green for activation action
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(52, 168, 83, 0.15)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {loading ? (
                  <div className="animate-spin" style={{ width: '16px', height: '16px', border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
                ) : (
                  'Aktivierung abschließen'
                )}
              </button>
            </form>
          )}

          {step === 'success' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', textAlign: 'center', gap: '20px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                background: '#e6f4ea',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34a853',
              }}>
                <CheckCircle size={32} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#137333' }}>
                  Freischaltung erfolgreich!
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Dein Lehrer-Konto wurde aktiviert. Lade deinen GrooveLab-Ausweis herunter, um dich an den Kiosk-Terminals anzumelden.
                </p>
              </div>

              {/* ID Card */}
              <div style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                borderRadius: '24px',
                padding: '24px',
                width: '100%',
                maxWidth: '300px',
                boxShadow: '0 12px 30px rgba(15, 23, 42, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.08)',
                gap: '16px',
                boxSizing: 'border-box'
              }}>
                <div style={{ fontSize: '9px', fontWeight: 900, color: '#eab308', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                  GrooveLab Lehrerausweis
                </div>
                
                {/* QR Code Container */}
                {teacherQrToken ? (
                  <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <QRCode value={`https://campus-groovelab.de/qr/${teacherQrToken}`} size={130} />
                  </div>
                ) : (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>QR Code wird generiert...</div>
                )}

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem' }}>
                    {teacherName || 'Lehrkraft'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginTop: '2px' }}>
                    Lehrkraft / Coach
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                <button 
                  onClick={downloadQrCode} 
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '100px',
                    border: '1.5px solid #dadce0',
                    background: 'white',
                    color: '#475569',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <Download size={14} /> Ausweis herunterladen (QR)
                </button>
                <button 
                  onClick={() => activatedTeacherId && onSuccess(activatedTeacherId)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '100px',
                    border: 'none',
                    background: '#0b57d0',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(11, 87, 208, 0.15)',
                    transition: 'all 0.2s'
                  }}
                >
                  Dashboard starten
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
