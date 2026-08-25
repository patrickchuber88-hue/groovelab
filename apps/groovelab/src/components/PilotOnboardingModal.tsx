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

  const [activeLegalDoc, setActiveLegalDoc] = useState<'agb' | 'avv' | null>(null);

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

      // 2. Insert or update agreement record (matching exact schema: school_id, user_id, ip_address, user_agent)
      try {
        const agreementPayload = {
          school_id: schoolId,
          user_id: userId,
          ip_address: ip,
          user_agent: userAgent
        };

        const { error: upsertErr } = await supabase
          .from('pilot_agreements')
          .upsert(agreementPayload, { onConflict: 'school_id, user_id' });

        if (upsertErr) {
          if (upsertErr.code === '23505' || upsertErr.message?.includes('duplicate key') || upsertErr.message?.includes('unique constraint')) {
            await supabase
              .from('pilot_agreements')
              .update({ ip_address: ip, user_agent: userAgent })
              .eq('school_id', schoolId);
          } else {
            const { error: insertErr } = await supabase
              .from('pilot_agreements')
              .insert(agreementPayload);
            
            if (insertErr && !insertErr.message?.includes('duplicate key') && insertErr.code !== '23505') {
              console.warn('pilot_agreements insert error:', insertErr);
            }
          }
        }
      } catch (dbErr: any) {
        console.warn('Agreement DB operation warning:', dbErr);
      }

      // 3. Mark school as trial/active AND set AVV digital signature audit trail fields
      const { error: schoolErr } = await supabase
        .from('schools')
        .update({ 
          is_trial: true,
          avv_signed_at: signedAtIso,
          avv_signee_name: signeeName.trim()
        })
        .eq('id', schoolId);

      if (schoolErr) {
        throw schoolErr;
      }

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
      {/* ─── DEDICATED FULL-TEXT LEGAL READER OVERLAY (Z-INDEX 100005) ─── */}
      {activeLegalDoc && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100005,
          padding: '20px 16px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            maxWidth: '760px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 30px 80px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
            border: '1.5px solid #e2e8f0'
          }}>
            {/* Reader Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: activeLegalDoc === 'agb' ? '#e6f4ea' : '#e6f4ea',
                  color: '#15803d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {activeLegalDoc === 'agb' ? <FileText size={20} /> : <ShieldCheck size={20} />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                    {activeLegalDoc === 'agb' ? 'Allgemeine Geschäftsbedingungen (B2B-SaaS)' : 'Vertrag zur Auftragsverarbeitung (AVV gem. Art. 28 DSGVO)'}
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
                    {activeLegalDoc === 'agb' ? 'Gültig für Musikschulen, Akademien & Bildungsträger' : 'Inklusive Technischer und Organisatorischer Maßnahmen (TOMs gem. Art. 32 DSGVO)'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveLegalDoc(null)}
                style={{
                  border: 'none',
                  background: '#e2e8f0',
                  color: '#334155',
                  borderRadius: '12px',
                  padding: '8px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#cbd5e1'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#e2e8f0'}
              >
                <span>✕ Schließen</span>
              </button>
            </div>

            {/* Reader Scrollable Content */}
            <div style={{
              padding: '24px 28px',
              overflowY: 'auto',
              fontSize: '0.84rem',
              color: '#334155',
              lineHeight: 1.6,
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {activeLegalDoc === 'agb' ? (
                <>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: '12px', color: '#166534', fontSize: '0.82rem', fontWeight: 650 }}>
                    ℹ️ <strong>Transparenz-Garantie:</strong> Keine Lizenzkaufgebühren (0,00 €). Berechnet wird ausschließlich die gemietete Cloud- und Hosting-Infrastruktur gemäß gebuchtem Paket.
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>§ 1 Vertragsgegenstand & Bereitstellungsmodell</h4>
                    <p style={{ margin: 0 }}>Gegenstand des Vertrages ist die Bereitstellung der Cloud-Software <strong>Campus-Groovelab</strong> als Software-as-a-Service (SaaS) gemäß § 535 ff. BGB durch Patrick Huber (Karl-Fürstenberg-Str. 59, 79618 Rheinfelden) für den Schul- und Musikunterrichtsbetrieb.</p>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>§ 2 Zero-Mail IAM & Authentifizierung</h4>
                    <p style={{ margin: 0 }}>Die Plattform arbeitet nach einer Zero-Mail-Architektur. Zugänge für Lehrkräfte und Schüler werden über kryptografische Master-PINs, QR-Token und biometrische Passkeys (WebAuthn) verwaltet. Ein Versand von Klartext-Passwörtern per E-Mail findet nicht statt.</p>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>§ 3 Hosting & Rechenzentren</h4>
                    <p style={{ margin: 0 }}>Das Hosting erfolgt zu 100% in zertifizierten Rechenzentren in Deutschland (Hetzner Online GmbH, Standort Falkenstein/Vogtland sowie Supabase EU, Frankfurt am Main). Eine Übermittlung personenbezogener Daten in unsichere Drittstaaten ist ausgeschlossen.</p>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>§ 4 Entgelte, Abrechnung & Kündigung</h4>
                    <p style={{ margin: 0 }}>Die Abrechnung erfolgt monatlich transparent auf Basis der aktiv geschalteten Module und Nutzerkonten. Verträge sind jederzeit mit einer Frist von 14 Tagen zum Monatsende kündbar. Nach Vertragsbeendigung werden alle Mandantendaten DSGVO-konform exportiert oder gelöscht.</p>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>§ 5 Verfügbarkeit & Support</h4>
                    <p style={{ margin: 0 }}>Der Betreiber gewährleistet eine mittlere Verfügbarkeit der Cloud-Infrastruktur von 99,5 % im Jahresmittel (ausgenommen planmäßige Wartungsfenster).</p>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px 16px', borderRadius: '12px', color: '#1e40af', fontSize: '0.82rem', fontWeight: 650 }}>
                    🛡️ <strong>DSGVO Art. 28 Konformität:</strong> Dieser Vertrag regelt die Rechte und Pflichten der Parteien bei der Verarbeitung personenbezogener Daten im Auftrag der Musikschule.
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>§ 1 Gegenstand, Art und Zweck der Verarbeitung</h4>
                    <p style={{ margin: 0 }}>Der Auftragsverarbeiter verarbeitet personenbezogene Daten im Auftrag und nach Weisung der Musikschule (Verantwortlicher). Die Verarbeitung umfasst das Bereitstellen von Stundenplänen, Raumbelegungen, Hausaufgabenheften und Unterrichtsprotokollen.</p>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>§ 2 Kreis der Betroffenen & Datenminimierung</h4>
                    <p style={{ margin: 0 }}>Betroffene sind Lehrkräfte, Schulleitung, Verwaltung sowie Schülerinnen und Schüler. Gemäß dem Grundsatz der Datenminimierung (Art. 5 DSGVO) werden für minderjährige Schüler keine E-Mail-Adressen, keine Bank-/SEPA-Daten und keine Telefonnummern erhoben. Der Geburtstag wird ausschließlich als Tag (1–31) zur 2FA-PIN-Verifikation ohne Geburtsjahr erfasst.</p>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>§ 3 Technische & Organisatorische Maßnahmen (TOMs nach Art. 32 DSGVO)</h4>
                    <p style={{ margin: 0 }}>Der Auftragsverarbeiter setzt folgende TOMs ein: Ende-zu-Ende TLS 1.3 Verschlüsselung im Transit, AES-256 Verschlüsselung auf Datenbank-Ebene, automatisierte Pseudonymisierung von Schülernamen im Unterrichtsbetrieb (`Max M.`), mandantenspezifische Row-Level Security (RLS) und tägliche verschlüsselte Backups.</p>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>§ 4 Eingesetzte Unterauftragsverarbeiter</h4>
                    <p style={{ margin: 0 }}>Als Unterauftragsverarbeiter sind genehmigt: 1. <strong>Hetzner Online GmbH</strong> (Industriestr. 25, 91710 Gunzenhausen – Server-Hosting in Falkenstein/Deutschland), 2. <strong>Supabase Inc. / AWS EU</strong> (Rechenzentrum Frankfurt am Main/Deutschland). Mit allen Unterauftragsverarbeitern bestehen wirksame Art. 28 DSGVO-Vereinbarungen.</p>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>§ 5 Löschung & Datenrückgabe</h4>
                    <p style={{ margin: 0 }}>Nach Beendigung der vertraglichen Arbeiten hat der Auftragsverarbeiter alle in seinen Besitz gelangten Daten nach Wahl des Verantwortlichen zu löschen oder datenschutzkonform zu übergeben.</p>
                  </div>
                </>
              )}
            </div>

            {/* Reader Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              background: '#f8fafc'
            }}>
              <button
                onClick={() => setActiveLegalDoc(null)}
                style={{
                  background: 'linear-gradient(135deg, #15803d 0%, #34a853 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 20px',
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(21, 128, 61, 0.2)'
                }}
              >
                <span>Verstanden &amp; Zurück zur Vereinbarung</span>
                <Check size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

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
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveLegalDoc('agb'); }} 
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
              <strong>2. Schuldatenschutz &amp; Kindersicherheit (Art. 5 &amp; 25 DSGVO – Privacy by Design):</strong> Ich bestätige die rechtmäßige Erhebung der Schülerdaten durch die Musikschule (Vorname, Nachname, Geburtstagstag zur 2FA-PIN-Verifikation). Der Unterrichtsbetrieb erfolgt datensparsam mit automatischer Pseudonymisierung (Vorname + Nachname-Initial). Die Plattform verzichtet nach dem Zero-Knowledge-Prinzip vollständig auf Schüler-E-Mails, Telefonnummern sowie Bank- und Zahlungsdaten von Minderjährigen.
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
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveLegalDoc('avv'); }} 
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
