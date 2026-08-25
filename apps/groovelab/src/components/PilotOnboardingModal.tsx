import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Check, Sparkles, FileText, Lock, ExternalLink } from 'lucide-react';

interface PilotOnboardingModalProps {
  schoolId: string;
  userId: string;
  onComplete: () => void;
  onShowPrivacy: () => void;
  onShowAgb: () => void;
}

export const PilotOnboardingModal: React.FC<PilotOnboardingModalProps> = ({ 
  schoolId, 
  userId, 
  onComplete,
  onShowPrivacy,
  onShowAgb
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signeeName, setSigneeName] = useState('');
  const [agbChecked, setAgbChecked] = useState(false);
  const [parentChecked, setParentChecked] = useState(false);
  const [avvChecked, setAvvChecked] = useState(false);

  // Auto-fetch and pre-fill admin/signee name from database
  useEffect(() => {
    if (!userId) return;
    const fetchSignee = async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', userId)
          .maybeSingle();

        if (data?.first_name || data?.last_name) {
          setSigneeName(`${data.first_name || ''} ${data.last_name || ''} (Schulleitung)`.trim());
        }
      } catch (e) {
        console.warn('Could not auto-fetch user details for signee prefill:', e);
      }
    };
    fetchSignee();
  }, [userId]);

  const allChecked = agbChecked && parentChecked && avvChecked;

  const handleToggleAll = () => {
    const nextState = !allChecked;
    setAgbChecked(nextState);
    setParentChecked(nextState);
    setAvvChecked(nextState);
  };

  const handleAccept = async () => {
    if (!allChecked) {
      setError('Bitte bestätige alle 3 rechtlichen Bedingungen, um fortzufahren.');
      return;
    }
    if (!signeeName.trim()) {
      setError('Bitte gib den Namen des/der Vertretungsberechtigten (z. B. Schulleitung / Admin) an.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch & Anonymize IP Address for GDPR-compliant Audit Trail
      let ip = '127.0.0.1';
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const json = await res.json();
        if (json.ip) ip = json.ip;
      } catch (ipErr) {
        console.warn('Could not fetch external IP, using local fallback:', ipErr);
      }

      // Anonymize IP (IPv4: zero last octet, IPv6: zero last group)
      if (ip.includes('.')) {
        const parts = ip.split('.');
        parts[3] = '0';
        ip = parts.join('.');
      } else if (ip.includes(':')) {
        const parts = ip.split(':');
        parts[parts.length - 1] = '0000';
        ip = parts.join(':');
      }

      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
      const signedAtIso = new Date().toISOString();

      // 2. Insert or update agreement record
      try {
        const { error: upsertErr } = await supabase
          .from('pilot_agreements')
          .upsert(
            {
              school_id: schoolId,
              user_id: userId,
              signee_name: signeeName.trim(),
              ip_address: ip,
              user_agent: userAgent
            },
            { onConflict: 'school_id, user_id' }
          );

        if (upsertErr) {
          if (upsertErr.code === '23505' || upsertErr.message?.includes('duplicate key') || upsertErr.message?.includes('unique constraint')) {
            await supabase
              .from('pilot_agreements')
              .update({ signee_name: signeeName.trim(), ip_address: ip, user_agent: userAgent })
              .eq('school_id', schoolId);
          } else {
            const { error: insertErr } = await supabase
              .from('pilot_agreements')
              .insert({
                school_id: schoolId,
                user_id: userId,
                signee_name: signeeName.trim(),
                ip_address: ip,
                user_agent: userAgent
              });
            
            if (insertErr && !insertErr.message?.includes('duplicate key') && insertErr.code !== '23505') {
              throw insertErr;
            }
          }
        }
      } catch (dbErr: any) {
        console.warn('Agreement DB operation warning:', dbErr);
        if (!dbErr.message?.includes('duplicate key') && dbErr.code !== '23505') {
          throw dbErr;
        }
      }

      // 3. Mark school as trial/active AND set AVV digital signature audit trail fields
      await supabase
        .from('schools')
        .update({ 
          is_trial: true,
          avv_signed_at: signedAtIso,
          avv_signee_name: signeeName.trim()
        })
        .eq('id', schoolId);

      onComplete();
    } catch (err: any) {
      console.error('Error saving agreement:', err);
      setError(err.message || 'Verbindung zum Server fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '24px 16px',
      boxSizing: 'border-box',
      color: '#1e293b',
      fontFamily: '"Outfit", "Inter", -apple-system, sans-serif'
    }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid rgba(255, 255, 255, 0.8)',
        borderRadius: '24px',
        maxWidth: '560px',
        width: '100%',
        padding: '32px 28px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 30px 70px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxSizing: 'border-box'
      }}>
        
        {/* Header Badge */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            background: '#e6f4ea',
            color: '#15803d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(34, 197, 94, 0.15)'
          }}>
            <ShieldCheck size={28} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em', color: '#0f172a' }}>
              Nutzungsvereinbarung &amp; Freischaltung
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0 0', fontWeight: 550, lineHeight: 1.4 }}>
              Rechtssichere B2B- und DSGVO-Legitimation für deine Musikschule auf Campus-Groovelab.
            </p>
          </div>
        </div>

        {/* Signee Name Field (Auto-prefilled) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#f8fafc', padding: '12px 16px', borderRadius: '16px', border: '1.5px solid #e2e8f0' }}>
          <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Name des/der Vertretungsberechtigten (z. B. Schulleitung / Admin):
          </label>
          <input
            type="text"
            placeholder="z. B. Patrick Huber (Schulleitung)"
            value={signeeName}
            onChange={(e) => setSigneeName(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1.5px solid #cbd5e1',
              fontSize: '0.86rem',
              fontWeight: 650,
              outline: 'none',
              background: '#ffffff',
              color: '#0f172a'
            }}
          />
        </div>

        {/* 1-Click Master Toggle */}
        <div 
          onClick={handleToggleAll}
          style={{
            background: allChecked ? '#e6f4ea' : '#f8fafc',
            border: allChecked ? '1.5px solid #34a853' : '1.5px dashed #cbd5e1',
            borderRadius: '14px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.2s',
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '6px',
              border: allChecked ? 'none' : '2px solid #94a3b8',
              background: allChecked ? '#15803d' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              {allChecked && <Check size={14} strokeWidth={3} />}
            </div>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: allChecked ? '#15803d' : '#334155' }}>
              Alle 3 Bedingungen auswählen &amp; bestätigen
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: allChecked ? '#15803d' : '#64748b' }}>
            {allChecked ? '3 von 3 ausgewählt ✓' : '1-Klick Schnellwahl'}
          </span>
        </div>

        {/* The 3 Core Legal Pillars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Pillar 1: AGB */}
          <div style={{
            background: agbChecked ? 'rgba(52, 168, 83, 0.04)' : '#ffffff',
            border: agbChecked ? '1.5px solid rgba(52, 168, 83, 0.4)' : '1.5px solid #e2e8f0',
            borderRadius: '14px',
            padding: '12px 14px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
            transition: 'all 0.15s'
          }}>
            <input 
              type="checkbox" 
              checked={agbChecked}
              onChange={(e) => setAgbChecked(e.target.checked)}
              style={{ accentColor: '#15803d', marginTop: '2px', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.4 }}>
              <strong>1. B2B-Nutzungsvertrag &amp; AGB:</strong> Ich akzeptiere die{' '}
              <span 
                onClick={(e) => { e.preventDefault(); onShowAgb(); }} 
                style={{ color: '#15803d', textDecoration: 'underline', cursor: 'pointer', fontWeight: 750 }}
              >
                Allgemeinen Geschäftsbedingungen (B2B)
              </span>{' '}
              des Betreibers Patrick Huber (Karl-Fürstenberg-Str. 59, 79618 Rheinfelden) für die Bereitstellung der Plattform Campus-Groovelab.
            </div>
          </div>

          {/* Pillar 2: Child Privacy & Data Minimization */}
          <div style={{
            background: parentChecked ? 'rgba(52, 168, 83, 0.04)' : '#ffffff',
            border: parentChecked ? '1.5px solid rgba(52, 168, 83, 0.4)' : '1.5px solid #e2e8f0',
            borderRadius: '14px',
            padding: '12px 14px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
            transition: 'all 0.15s'
          }}>
            <input 
              type="checkbox" 
              checked={parentChecked}
              onChange={(e) => setParentChecked(e.target.checked)}
              style={{ accentColor: '#15803d', marginTop: '2px', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.4 }}>
              <strong>2. Schuldatenschutz (Minderjährige):</strong> Ich bestätige die Einhaltung des Schuldatenschutzes: Schülernamen werden ausschließlich datensparsam (Vorname + Nachname-Initial) geführt. Es werden keine E-Mail-Adressen, SEPA- oder Zahlungsdaten von Minderjährigen erfasst.
            </div>
          </div>

          {/* Pillar 3: AVV Art. 28 DSGVO */}
          <div style={{
            background: avvChecked ? 'rgba(52, 168, 83, 0.04)' : '#ffffff',
            border: avvChecked ? '1.5px solid rgba(52, 168, 83, 0.4)' : '1.5px solid #e2e8f0',
            borderRadius: '14px',
            padding: '12px 14px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
            transition: 'all 0.15s'
          }}>
            <input 
              type="checkbox" 
              checked={avvChecked}
              onChange={(e) => setAvvChecked(e.target.checked)}
              style={{ accentColor: '#15803d', marginTop: '2px', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.4 }}>
              <strong>3. Auftragsverarbeitung (AVV gem. Art. 28 DSGVO):</strong> Ich zeichne hiermit die{' '}
              <span 
                onClick={(e) => { e.preventDefault(); onShowPrivacy(); }} 
                style={{ color: '#15803d', textDecoration: 'underline', cursor: 'pointer', fontWeight: 750 }}
              >
                Auftragsverarbeitungsvereinbarung (AVV)
              </span>{' '}
              zur Absicherung des Server-Hostings in zertifizierten deutschen Rechenzentren (Hetzner Online GmbH &amp; Supabase EU) mit dem Betreiber.
            </div>
          </div>

        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: '12px', color: '#b91c1c', fontSize: '0.8rem', fontWeight: 700, textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* Submit Action & Audit Trail Footer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
          <button
            onClick={handleAccept}
            disabled={loading || !allChecked || !signeeName.trim()}
            style={{
              background: (loading || !allChecked || !signeeName.trim()) ? '#94a3b8' : 'linear-gradient(135deg, #15803d 0%, #34a853 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '14px',
              padding: '14px 20px',
              fontSize: '0.92rem',
              fontWeight: 800,
              cursor: (loading || !allChecked || !signeeName.trim()) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: (loading || !allChecked || !signeeName.trim()) ? 'none' : '0 10px 24px rgba(21, 128, 61, 0.25)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              boxSizing: 'border-box'
            }}
          >
            {loading ? 'Speichere Vereinbarung...' : (
              <>
                <span>Vereinbarung rechtsverbindlich bestätigen &amp; freischalten</span>
                <Check size={18} />
              </>
            )}
          </button>
          
          <div style={{ fontSize: '0.68rem', color: '#94a3b8', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontWeight: 600 }}>
            <Lock size={11} color="#94a3b8" />
            <span>256-Bit SSL/TLS Audit-Trail (Zeitstempel &amp; IP-Logging aktiv)</span>
          </div>
        </div>

      </div>
    </div>
  );
};
