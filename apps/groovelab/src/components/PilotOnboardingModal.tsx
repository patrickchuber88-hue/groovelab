import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Lock, AlertTriangle, FileText, Check } from 'lucide-react';

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
  const [liabilityChecked, setLiabilityChecked] = useState(false);
  const [parentChecked, setParentChecked] = useState(false);
  const [avvChecked, setAvvChecked] = useState(false);

  const handleAccept = async () => {
    if (!agbChecked || !liabilityChecked || !parentChecked || !avvChecked) {
      setError('Bitte bestätige alle rechtlichen Bedingungen, um fortzufahren.');
      return;
    }
    if (!signeeName.trim()) {
      setError('Bitte gib den Namen des/der Vertretungsberechtigten (z. B. Schulleitung / Admin) an.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch IP Address information
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

      // 2. Insert or update agreement record (upsert with fallback for duplicate keys)
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
          // If upsert fails due to unique constraint, update existing record
          if (upsertErr.code === '23505' || upsertErr.message?.includes('duplicate key') || upsertErr.message?.includes('unique constraint')) {
            await supabase
              .from('pilot_agreements')
              .update({ signee_name: signeeName.trim(), ip_address: ip, user_agent: userAgent })
              .eq('school_id', schoolId);
          } else {
            // Fallback insert attempt
            const { error: insertErr } = await supabase
              .from('pilot_agreements')
              .insert({
                school_id: schoolId,
                user_id: userId,
                signee_name: signeeName.trim(),
                ip_address: ip,
                user_agent: userAgent
              });
            
            if (insertErr && (insertErr.code === '23505' || insertErr.message?.includes('duplicate key') || insertErr.message?.includes('unique constraint'))) {
              // Ignore duplicate key error as agreement already exists
            } else if (insertErr) {
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
      background: 'rgba(244, 244, 245, 0.95)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '24px',
      boxSizing: 'border-box',
      color: '#18181b',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid #e4e4e7',
        borderRadius: '24px',
        maxWidth: '640px',
        width: '100%',
        padding: '32px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            background: 'rgba(19, 115, 51, 0.08)',
            color: '#34a853',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em', color: '#18181b' }}>
            Nutzungsvereinbarung &amp; Freischaltung
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#71717a', margin: 0, lineHeight: 1.4 }}>
            Bitte bestätige die offiziellen Nutzungs- &amp; Vertragsbedingungen für deine Musikschule auf der Plattform Campus-Groovelab.
          </p>
        </div>

        {/* Warning Callout */}
        <div style={{
          background: 'rgba(234, 179, 8, 0.08)',
          border: '1px solid rgba(234, 179, 8, 0.25)',
          borderRadius: '16px',
          padding: '16px',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start'
        }}>
          <AlertTriangle style={{ color: '#ca8a04', flexShrink: 0 }} size={20} />
          <div style={{ fontSize: '0.8rem', color: '#854d0e', lineHeight: 1.4, fontWeight: 550 }}>
            <strong>Rechtlicher Hinweis:</strong> Da diese Softwareüberlassung unentgeltlich erfolgt, greift das gesetzliche Haftungsprivileg (§ 599 BGB). Die Software wird ohne Zusicherung von Verfügbarkeit oder Gewährleistung bereitgestellt. Für kostenpflichtig gebuchte Hosting-Infrastruktur gelten die Bestimmungen der B2B-AGB.
          </div>
        </div>

        {/* Signee Name Field */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#f8fafc', padding: '14px 16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155' }}>
            Name des/der Vertretungsberechtigten (z. B. Schulleitung / Admin):
          </label>
          <input
            type="text"
            placeholder="z. B. Dr. Maria Musterfrau (Schulleitung)"
            value={signeeName}
            onChange={(e) => setSigneeName(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '0.84rem',
              outline: 'none',
              background: '#ffffff'
            }}
          />
        </div>

        {/* Requirements checklists */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={agbChecked}
              onChange={(e) => setAgbChecked(e.target.checked)}
              style={{ accentColor: '#34a853', marginTop: '3px' }}
            />
            <span style={{ fontSize: '0.85rem', color: '#3f3f46', lineHeight: 1.4 }}>
              Ich akzeptiere die <strong onClick={(e) => { e.preventDefault(); onShowAgb(); }} style={{ color: '#34a853', textDecoration: 'underline', cursor: 'pointer' }}>Allgemeinen Geschäftsbedingungen (B2B)</strong> des Betreibers Patrick Huber (Karl-Fürstenberg-Str. 59, 79618 Rheinfelden) für die Nutzung der Plattform Campus-Groovelab.
            </span>
          </label>

          <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={liabilityChecked}
              onChange={(e) => setLiabilityChecked(e.target.checked)}
              style={{ accentColor: '#34a853', marginTop: '3px' }}
            />
            <span style={{ fontSize: '0.85rem', color: '#3f3f46', lineHeight: 1.4 }}>
              <strong>Haftungsausschluss (§ 599 BGB):</strong> Ich bestätige, dass der Betreiber während der kostenlosen Nutzung nur für Vorsatz und grobe Fahrlässigkeit haftet. Eine Haftung für einfache Fahrlässigkeit, Datenverlust oder Systemausfälle ist ausgeschlossen.
            </span>
          </label>

          <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={parentChecked}
              onChange={(e) => setParentChecked(e.target.checked)}
              style={{ accentColor: '#34a853', marginTop: '3px' }}
            />
            <span style={{ fontSize: '0.85rem', color: '#3f3f46', lineHeight: 1.4 }}>
              <strong>Datenschutz (Minderjährige):</strong> Ich versichere, dass die Musikschule vor dem Eintragen von Schülernamen (Vorname + Nachname-Initial) die Einwilligung der Erziehungsberechtigten eingeholt hat. Schüler-E-Mail-Adressen werden nicht erfasst.
            </span>
          </label>

          <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={avvChecked}
              onChange={(e) => setAvvChecked(e.target.checked)}
              style={{ accentColor: '#34a853', marginTop: '3px' }}
            />
            <span style={{ fontSize: '0.85rem', color: '#3f3f46', lineHeight: 1.4 }}>
              Ich zeichne hiermit die <strong onClick={(e) => { e.preventDefault(); onShowPrivacy(); }} style={{ color: '#34a853', textDecoration: 'underline', cursor: 'pointer' }}>Auftragsverarbeitungsvereinbarung (AVV)</strong> gemäß Art. 28 DSGVO zur Absicherung des Server-Hostings in zertifizierten deutschen Rechenzentren (Hetzner Online GmbH &amp; Supabase EU) mit dem Betreiber.
            </span>
          </label>

        </div>

        {error && (
          <p style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, margin: 0, textAlign: 'center' }}>
            {error}
          </p>
        )}

        {/* Submit Action */}
        <button
          onClick={handleAccept}
          disabled={loading || !signeeName.trim()}
          style={{
            background: (loading || !signeeName.trim()) ? '#a1a1aa' : '#34a853',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '14px',
            fontSize: '0.9rem',
            fontWeight: 800,
            cursor: (loading || !signeeName.trim()) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: (loading || !signeeName.trim()) ? 'none' : '0 4px 12px rgba(19, 115, 51, 0.15)',
            transition: 'all 0.2s ease'
          }}
        >
          {loading ? 'Speichere Vereinbarung...' : 'Vereinbarung rechtsverbindlich bestätigen & freischalten'}
        </button>

      </div>
    </div>
  );
};
