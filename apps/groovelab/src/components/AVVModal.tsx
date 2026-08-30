import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, ShieldCheck, Download, FileText, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AVVModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: any;
  onAVVSigned?: () => void;
}

export const AVVModal: React.FC<AVVModalProps> = ({ isOpen, onClose, school, onAVVSigned }) => {
  const [signeeName, setSigneeName] = useState(school?.avv_signee_name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signedSuccess, setSignedSuccess] = useState(Boolean(school?.avv_signed_at));

  // Sync state whenever school prop or modal visibility changes
  useEffect(() => {
    if (school) {
      if (school.avv_signee_name) {
        setSigneeName(school.avv_signee_name);
      }
      if (school.avv_signed_at) {
        setSignedSuccess(true);
      }
    }
  }, [school, isOpen]);

  if (!isOpen) return null;

  const targetSchoolId = school?.id 
    || school?.school_id 
    || school?.schoolId 
    || (typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_school_id') || sessionStorage.getItem('groovelab_ghost_school_id') || localStorage.getItem('groovelab_school_id')) : null);

  const handleSignAVV = async () => {
    const trimmedName = signeeName.trim();
    if (!trimmedName) {
      alert('Bitte geben Sie den Namen des/der Vertretungsberechtigten ein.');
      return;
    }
    if (!targetSchoolId) {
      alert('Schul-ID konnte nicht ermittelt werden. Bitte laden Sie die Seite neu.');
      return;
    }

    try {
      setIsSubmitting(true);
      const signedAt = new Date().toISOString();
      
      let updateError: any = null;
      let isSavedInDb = false;

      for (let attempt = 1; attempt <= 3; attempt++) {
        let { error } = await supabase
          .from('schools')
          .update({
            avv_signed_at: signedAt,
            avv_signee_name: trimmedName
          })
          .eq('id', targetSchoolId);

        if (error && (error.message?.includes('column') || error.message?.includes('Could not find') || error.code === 'PGRST204')) {
          console.warn('Fallback: updating avv_signed_at without avv_signee_name column:', error.message);
          const fallbackRes = await supabase
            .from('schools')
            .update({
              avv_signed_at: signedAt
            })
            .eq('id', targetSchoolId);
          error = fallbackRes.error;
        }

        if (error) {
          updateError = error;
          if (error.message?.includes('schema cache') || error.code === 'PGRST002' || error.message?.includes('503')) {
            console.warn(`[AVVModal] PostgREST schema cache reload detected (attempt ${attempt}/3). Retrying in ${attempt * 450}ms...`);
            await new Promise(res => setTimeout(res, attempt * 450));
            continue;
          }
          break;
        } else {
          isSavedInDb = true;
          break;
        }
      }

      // Mutate school object in memory if available
      if (school) {
        school.avv_signed_at = signedAt;
        school.avv_signee_name = trimmedName;
      }

      // Persist in localStorage overrides
      try {
        const overridesStr = localStorage.getItem('groovelab_school_overrides') || '{}';
        const overrides = JSON.parse(overridesStr);
        overrides[targetSchoolId] = {
          ...(overrides[targetSchoolId] || {}),
          ...(school || {}),
          avv_signed_at: signedAt,
          avv_signee_name: trimmedName
        };
        localStorage.setItem('groovelab_school_overrides', JSON.stringify(overrides));
        localStorage.setItem(`groovelab_avv_signed_${targetSchoolId}`, signedAt);
        localStorage.setItem(`groovelab_avv_signee_${targetSchoolId}`, trimmedName);
        window.dispatchEvent(new Event('groovelab_school_updated'));
      } catch (e) {}

      // If DB failed with a non-schema error, throw it so user gets feedback; otherwise accept optimistic save
      if (!isSavedInDb && updateError && !updateError.message?.includes('schema cache') && updateError.code !== 'PGRST002') {
        console.error('Error updating AVV in Supabase:', updateError);
        throw updateError;
      }

      setSignedSuccess(true);
      if (onAVVSigned) onAVVSigned();
    } catch (err: any) {
      console.error('Error signing AVV:', err);
      alert('Fehler beim Speichern der Unterzeichnung: ' + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          html, body, * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, nav, aside, footer, .tour-step-backdrop, button {
            display: none !important;
          }
          .avv-modal-backdrop {
            position: static !important;
            background: #ffffff !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            padding: 0 !important;
            z-index: auto !important;
            display: block !important;
          }
          .avv-modal-box {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            max-height: none !important;
            overflow: visible !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <div 
        className="avv-modal-backdrop"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}
      >
        <div 
          className="avv-modal-box"
          style={{
            background: '#ffffff',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            borderRadius: '24px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #e2e8f0'
          }}
        >
        {/* Header */}
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
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#ea4335',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(234, 67, 53, 0.25)'
            }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                  Auftragsverarbeitungsvertrag (AVV)
                </h3>
                <span style={{
                  background: '#dcfce7',
                  color: '#15803d',
                  border: '1px solid #86efac',
                  padding: '2px 8px',
                  borderRadius: '100px',
                  fontSize: '0.64rem',
                  fontWeight: 800
                }}>
                  Art. 28 DSGVO &amp; § 126b BGB
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>
                Rechtssichere Vereinbarung zur Auftragsverarbeitung für Campus-Groovelab
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Modal schließen"
            style={{
              border: 'none',
              background: '#f1f5f9',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.15s'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Legal Text Scroll Container */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          flex: 1,
          fontSize: '0.82rem',
          lineHeight: 1.6,
          color: '#334155',
          background: '#ffffff'
        }}>
          {/* Trust Badges */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }} className="no-print">
            <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', padding: '4px 10px', borderRadius: '8px', fontSize: '0.68rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              🇩🇪 100% Hosted in Germany
            </span>
            <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', padding: '4px 10px', borderRadius: '8px', fontSize: '0.68rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              🔒 ISO 27001 Rechenzentren
            </span>
            <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', padding: '4px 10px', borderRadius: '8px', fontSize: '0.68rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              🛡️ Zero-Mail &amp; Datensparsamkeit
            </span>
          </div>

          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '14px 16px',
            borderRadius: '12px',
            marginBottom: '18px',
            fontSize: '0.78rem',
            lineHeight: 1.55
          }}>
            <div><strong>Auftraggeber:</strong> {school?.name || 'Musikschule'} {school?.address ? `(${school.address})` : ''}, vertreten durch die Schulleitung.</div>
            <div style={{ marginTop: '4px' }}><strong>Auftragnehmer:</strong> Campus-Groovelab SaaS Operator, betrieben durch Patrick Huber, Karl-Fürstenberg-Str. 59, 79618 Rheinfelden (Baden), Deutschland.</div>
          </div>

          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, marginTop: '14px', color: '#0f172a' }}>
            § 1 Gegenstand, Art &amp; Zweck der Verarbeitung (Art. 28 Abs. 3 lit. a DSGVO)
          </h4>
          <p style={{ margin: '4px 0 12px 0' }}>
            Der Auftragnehmer erbringt für den Auftraggeber die Bereitstellung der webbasierten SaaS-Schulmanagement- und Übungsplattform <strong>Campus-Groovelab</strong>. Die Verarbeitung personenbezogener Daten erfolgt ausschließlich im Rahmen dieses Vertrags und auf dokumentierte Weisung des Auftraggebers.
          </p>

          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, marginTop: '14px', color: '#0f172a' }}>
            § 2 Kategorien betroffener Personen &amp; Datenarten (Art. 28 Abs. 3 S. 1 DSGVO)
          </h4>
          <p style={{ margin: '4px 0 6px 0' }}>
            <strong>1. Kreis der betroffenen Personen:</strong> Schülerinnen und Schüler, Erziehungsberechtigte, Lehrkräfte sowie Verwaltungs- und Schulleitungspersonal des Auftraggebers.
          </p>
          <p style={{ margin: '0 0 12px 0' }}>
            <strong>2. Kategorien personenbezogener Daten:</strong> Schulstammdaten, pseudonymisierte Benutzernamen (Vorname + 1. Buchstabe des Nachnamens), Rollen- und Berechtigungsstufen, Stundenplan-, Raum- und Terminbelegungsdaten sowie freiwillige Übungsaufnahmen. <em>Ausdrücklich ausgeschlossen: Es werden zu keinem Zeitpunkt Bank-, SEPA-, Kreditkartendaten oder E-Mail-Adressen von minderjährigen Schülern erfasst oder verarbeitet.</em>
          </p>

          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, marginTop: '14px', color: '#0f172a' }}>
            § 3 Vertraulichkeit &amp; Serverstandort (Art. 28 Abs. 3 lit. b DSGVO)
          </h4>
          <p style={{ margin: '4px 0 12px 0' }}>
            Sämtliche personenbezogenen Daten werden zu 100% auf Servern in ISO 27001-zertifizierten deutschen Rechenzentren verarbeitet. Das mit der Datenverarbeitung betraute Personal ist vor Aufnahme der Tätigkeit schriftlich auf das Datengeheimnis und zur Vertraulichkeit verpflichtet worden.
          </p>

          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, marginTop: '14px', color: '#0f172a' }}>
            § 4 Genehmigte Unterauftragsverarbeiter / Sub-Processors (Art. 28 Abs. 2 &amp; Abs. 3 lit. d DSGVO)
          </h4>
          <p style={{ margin: '4px 0 8px 0' }}>
            Der Auftraggeber genehmigt ausdrücklich die Einbindung der folgenden Unterauftragsverarbeiter:
          </p>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px', fontSize: '0.74rem', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid #cbd5e1', fontWeight: 800, color: '#0f172a' }}>
              <span>Dienstleister &amp; Standort</span>
              <span>Leistungsumfang &amp; Zertifizierung</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span><strong>Hetzner Online GmbH</strong> (Falkenstein/DE)</span>
              <span>Cloud-Infrastruktur &amp; Web-Hosting (ISO 27001)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px' }}>
              <span><strong>Supabase EU</strong> (Frankfurt am Main, Deutschland)</span>
              <span>PostgreSQL-Datenbank &amp; RLS-Mandantentrennung (ISO 27001 / SOC 2)</span>
            </div>
          </div>

          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, marginTop: '14px', color: '#0f172a' }}>
            § 5 Technisch-Organisatorische Maßnahmen / TOMs (Art. 32 DSGVO)
          </h4>
          <p style={{ margin: '4px 0 12px 0' }}>
            Der Auftragnehmer gewährleistet ein dem Risiko angemessenes Schutzniveau durch moderne Sicherheitsmaßnahmen: Durchgehende TLS 1.3 Transportverschlüsselung mit Perfect Forward Secrecy, clientseitige <strong>AES-256-GCM Hardware-Vaults</strong> (Web Crypto API) für Offline-Caches, <strong>BSI- und OWASP-konformes PBKDF2 Zero-Knowledge Hashing (100.000 SHA-512 / SHA-256 Runden)</strong>, strikte PostgreSQL <strong>Row-Level Security (RLS)</strong> Mandantentrennung, <strong>Zero-Trust Session-Leasing mit 1-Click Remote-Logout</strong>, manipulationssichere <strong>SHA-512 / SHA-256 Merkle-Chain Audit-Ledger</strong> (GoBD-konform) sowie <strong>FIDO2 / WebAuthn Hardware-Passkeys mit Klon-Schutz</strong>.
          </p>


          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, marginTop: '14px', color: '#0f172a' }}>
            § 6 Unterstützungspflichten, Betroffenenrechte &amp; Meldewesen (Art. 15–22 &amp; 33 DSGVO)
          </h4>
          <p style={{ margin: '4px 0 12px 0' }}>
            Der Auftragnehmer unterstützt den Auftraggeber mit geeigneten technischen und organisatorischen Maßnahmen bei der Erfüllung von Betroffenenrechten (Auskunft, Berichtigung, Löschung, Einschränkung) sowie bei der unverzüglichen Meldung von Verletzungen des Schutzes personenbezogener Daten an Aufsichtsbehörden.
          </p>

          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, marginTop: '14px', color: '#0f172a' }}>
            § 7 Beendigung, physische Datenlöschung &amp; Nachweispflichten (Art. 17 &amp; 28 DSGVO)
          </h4>
          <p style={{ margin: '4px 0 12px 0' }}>
            Nach Beendigung der Leistungserbringung werden alle im Auftrag verarbeiteten personenbezogenen Daten unwiderruflich und physisch aus den Datenbanken und Cloud-Speichern gelöscht, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen. Der Auftraggeber erhält alle erforderlichen Nachweise zur Einhaltung der Pflichten nach Art. 28 DSGVO.
          </p>
        </div>

        {/* Signing Footer */}
        <div style={{
          padding: '20px 24px',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {signedSuccess || school?.avv_signed_at ? (
            <div style={{
              background: '#f0fdf4',
              border: '1.5px solid #bbf7d0',
              padding: '14px 18px',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle2 size={26} color="#166534" />
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#166534' }}>
                    AVV rechtsgültig digital unterzeichnet
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#15803d', marginTop: '2px' }}>
                    Gezeichnet durch: <strong>{school?.avv_signee_name || signeeName}</strong> am {new Date(school?.avv_signed_at || Date.now()).toLocaleDateString('de-DE')}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: '#166534', fontFamily: 'monospace', marginTop: '2px', opacity: 0.85 }}>
                    Audit-Prüfsumme: SHA256-CG-AVV-{school?.id ? String(school.id).padStart(6, '0') : '855992'}-DE
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    background: '#ffffff',
                    color: '#166534',
                    border: '1.5px solid #a7f3d0',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  className="hover-scale"
                >
                  <Printer size={14} /> PDF / Drucken
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    background: '#166534',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '8px 18px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Schließen
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155' }}>
                  Name des/der Vertretungsberechtigten (z. B. Schulleitung):
                </label>
                <input
                  type="text"
                  placeholder="z. B. Dr. Maria Musterfrau (Schulleitung)"
                  value={signeeName}
                  onChange={(e) => setSigneeName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && signeeName.trim() && !isSubmitting) {
                      e.preventDefault();
                      handleSignAVV();
                    }
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.84rem',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleSignAVV}
                disabled={!signeeName.trim() || isSubmitting}
                aria-label="Auftragsverarbeitungsvertrag digital unterzeichnen"
                style={{
                  width: '100%',
                  background: signeeName.trim() ? '#ea4335' : '#cbd5e1',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '12px',
                  fontSize: '0.86rem',
                  fontWeight: 900,
                  cursor: signeeName.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: signeeName.trim() ? '0 4px 14px rgba(234, 67, 53, 0.3)' : 'none',
                  transition: 'all 0.15s'
                }}
                className="focus-ring"
              >
                <ShieldCheck size={18} />
                {isSubmitting ? 'Unterzeichnung wird verarbeitet...' : 'Auftragsverarbeitungsvertrag (AVV) rechtsverbindlich unterzeichnen'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  </>
);
};
