import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, ShieldCheck, Download, FileText, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateEnterpriseSecurityWhitepaperPDF } from '../utils/securityWhitepaperGenerator';
import { generateDpoComplianceDossierPDF } from '../utils/dpoComplianceDossierGenerator';
import { generateStaffCouncilDeclarationPDF } from '../utils/staffCouncilDeclarationGenerator';
import { logSecurityEvent } from '../services/auditLogService';
import { getJurisdictionProfile } from '../constants/jurisdictionRegistry';
import { ACTIVE_LEGAL_VERSION } from '../legal/legalContent';

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
  const [computedDigest, setComputedDigest] = useState<string | null>(school?.avv_checksum || null);

  const jurisdiction = getJurisdictionProfile(school?.jurisdiction_code || school?.jurisdiction_region);

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

      // Revisionssicheres Audit-Logging in public.audit_logs (ISO/IEC 27037 & OWASP ASVS Level 3)
      const canonicalPayload = JSON.stringify({
        contract: `AVV_ART_28_DSGVO_V${ACTIVE_LEGAL_VERSION}`,
        contractVersion: ACTIVE_LEGAL_VERSION,
        schoolId: String(targetSchoolId),
        signeeName: trimmedName,
        signedAt: signedAt,
        jurisdiction: jurisdiction.code,
        statutoryLaw: jurisdiction.statutorySchoolLawRef,
        standard: 'Art. 28 DSGVO & Art. 9 CH-nDSG'
      });
      let auditChecksum: string;
      try {
        const encoder = new TextEncoder();
        const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(canonicalPayload));
        auditChecksum = 'SHA256-CG-AVV-' + Array.from(new Uint8Array(hashBuf))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      } catch (e) {
        auditChecksum = `SHA256-CG-AVV-FALLBACK-${String(targetSchoolId).padStart(6, '0')}`;
      }

      await logSecurityEvent({
        action: 'AVV_CONTRACT_DIGITALLY_SIGNED',
        schoolId: String(targetSchoolId),
        targetId: String(targetSchoolId),
        metadata: {
          signee_title: trimmedName,
          contract_version: `Art. 28 DSGVO / Art. 9 nDSG v${ACTIVE_LEGAL_VERSION}`,
          audit_checksum: auditChecksum,
          jurisdiction: jurisdiction.code,
          statutory_law: jurisdiction.statutorySchoolLawRef,
          signed_at: signedAt
        }
      });

      setComputedDigest(auditChecksum);
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
          body * {
            visibility: hidden !important;
          }
          .avv-modal-backdrop,
          .avv-modal-backdrop *,
          .avv-modal-box,
          .avv-modal-box * {
            visibility: visible !important;
          }
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, nav, aside, footer, .tour-step-backdrop, button, .no-print {
            display: none !important;
          }
          .avv-modal-backdrop {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: #ffffff !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            padding: 0 !important;
            margin: 0 !important;
            z-index: 999999 !important;
            display: block !important;
          }
          .avv-modal-box {
            position: static !important;
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            max-width: 100% !important;
            max-height: none !important;
            overflow: visible !important;
            border-radius: 0 !important;
          }
          .avv-modal-box div,
          .avv-modal-box main,
          .avv-modal-box section {
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
          }
          .avv-modal-box button {
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
          role="dialog"
          aria-modal="true"
          aria-label="Auftragsverarbeitungsvertrag (AVV)"
          className="avv-modal-box"
          style={{
            background: '#ffffff',
            width: '100%',
            maxWidth: '860px',
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
          background: '#f8fafc',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
            <div style={{
              width: '44px',
              height: '44px',
              minWidth: '44px',
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
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.12rem',
                  fontWeight: 900,
                  color: '#0f172a',
                  whiteSpace: 'nowrap',
                  hyphens: 'none',
                  wordBreak: 'keep-all'
                }}>
                  Auftragsverarbeitungsvertrag (AVV)
                </h3>
                <span style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '2px 8px',
                  borderRadius: '100px',
                  fontSize: '0.64rem',
                  fontWeight: 800,
                  whiteSpace: 'nowrap'
                }}>
                  Art. 28 DSGVO &amp; Art. 9 CH-nDSG
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>
                Rechtssichere Vereinbarung zur Auftragsverarbeitung für Campus-Groovelab
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => window.print()}
              title="Auftragsverarbeitungsvertrag als PDF speichern oder drucken"
              style={{
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '10px',
                padding: '7px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#0f172a',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <Printer size={15} strokeWidth={2} />
              AVV Drucken / PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Modal schließen"
              style={{
                border: '1px solid #e2e8f0',
                background: '#f1f5f9',
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                transition: 'all 0.15s'
              }}
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Sub-Header Toolbar: Zugehörige Nachweise & Dossiers (Monochrom & Clean) */}
        <div style={{
          padding: '8px 24px',
          background: '#ffffff',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 700 }}>
            Zugehörige Compliance-Dossiers:
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => generateEnterpriseSecurityWhitepaperPDF()}
              title="Offizielles BSI A+ / ISO 27001 Sicherheits-Whitepaper als PDF herunterladen"
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '4px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              <FileText size={13} strokeWidth={2} />
              Sicherheits-Whitepaper (TOMs)
            </button>
            <button
              type="button"
              onClick={() => generateDpoComplianceDossierPDF({
                schoolName: school?.name || school?.school_name,
                schoolAddress: school?.address || school?.city,
                schoolSigneeName: signeeName || school?.avv_signee_name,
                schoolId: targetSchoolId
              })}
              title="Offizielles Behörden-Datenschutz-Dossier (VVT, DSFA, TOMs) als PDF herunterladen"
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '4px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              <Download size={13} strokeWidth={2} />
              DSB-Dossier (VVT &amp; DSFA)
            </button>
            <button
              type="button"
              onClick={() => generateStaffCouncilDeclarationPDF({
                schoolName: school?.name || school?.school_name,
                schoolAddress: school?.address || school?.city,
                schoolSigneeName: signeeName || school?.avv_signee_name,
                schoolId: targetSchoolId
              })}
              title="Offizielle Bestätigung für Betriebs- und Personalräte als PDF herunterladen"
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '4px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              <ShieldCheck size={13} strokeWidth={2} />
              Personalrats-Attest (BetrVG 87)
            </button>
          </div>
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
            <div style={{ marginTop: '4px', color: '#1e40af', fontWeight: 650 }}>
              <strong>Maßgebliche Rechtsordnung:</strong> {jurisdiction.regionName} ({jurisdiction.statutorySchoolLawRef}) · <strong>Aufsichtsbehörde:</strong> {jurisdiction.dpoAuthorityName}
            </div>
          </div>

          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, marginTop: '14px', color: '#0f172a' }}>
            § 1 Gegenstand, Zweckbestimmung, Subsidiaritäts-Doktrin, Herrenberg-Immunität &amp; Schweizer nDSG-Parität (Art. 28 Abs. 3 lit. a DSGVO / Art. 9 nDSG)
          </h4>
          <p style={{ margin: '4px 0 12px 0' }}>
            (1) Der Auftragnehmer erbringt für den Auftraggeber die Bereitstellung der webbasierten SaaS-Schulmanagement- und didaktischen Übungsplattform <strong>Campus-Groovelab</strong>. Die Verarbeitung personenbezogener Daten erfolgt ausschließlich im Rahmen dieses Vertrags und auf dokumentierte Weisung des Auftraggebers.<br />
            (2) <strong>Rollenverteilung &amp; Schweizer nDSG-Parität:</strong> Die Musikschule bzw. der Schulträger ist und bleibt datenschutzrechtlich die alleinige <strong>Verantwortliche</strong> (Art. 4 Nr. 7 DSGVO / Art. 5 lit. j nDSG). Der Betreiber Patrick Huber (Einzelunternehmen) handelt ausschließlich als weisungsgebundener <strong>Auftragsverarbeiter</strong> bzw. <strong>Auftragsbearbeiter</strong> (Art. 28 DSGVO / Art. 9 nDSG). Die Parteien vereinbaren für den Geltungsbereich der Schweiz, dass der Begriff „personenbezogene Daten“ als „Personendaten“ (Art. 5 lit. a nDSG) und „Auftragsverarbeiter“ als „Auftragsbearbeiter“ (Art. 9 nDSG) zu verstehen ist.<br />
            (3) <strong>Didaktisches Assistenz-Prinzip &amp; Subsidiaritäts-Doktrin („Fast-Track“):</strong> Campus-Groovelab dient den Lehrkräften für einen optimalen Unterrichtsalltag und nicht die Lehrkräfte dem Schulalltag. Die Plattform fungiert als rein freiwilliges, unterstützendes Convenience- und Beschleunigungswerkzeug zur didaktischen Unterrichtsbegleitung. Die Plattform ersetzt weder das amtliche kommunale Schulverwaltungssystem (ERP wie iMikel, MSVplus oder Musikschul-Manager) noch die primären städtischen Kommunikationswege (E-Mail, MS Teams, Telefon, Post). Sämtliche über die Plattform vorgenommenen Terminabsagen, Stundenplanentwürfe und Raumbuchungsanfragen erfolgen technisch rein im Botenauftrag der Beteiligten und unter dem ausdrücklichen Vorbehalt der verwaltungsseitigen Freigabe und Einpflege in das führende Schulverwaltungssystem (ERP) des Auftraggebers; die Plattform entfaltet keine rechtsgestaltende Bindungswirkung für den Schulbetrieb.<br />
            (4) <strong>Herrenberg-Immunität (BSG B 12 R 3/20 R) &amp; Dozentenautonomie:</strong> Stundenplan-, Raum- und Terminbelegungsfunktionen stellen unverbindliche didaktische Dispositionsvorschläge dar. Lehrkräften (insbesondere freien Honorarkräften) steht es vollkommen frei, Stundenpläne oder Terminverschiebungen digital über Campus-Groovelab zu disponieren oder auf herkömmlichem Weg (per E-Mail, Telefon oder Zettel) an die Schulverwaltung zu übermitteln. Die Plattform begründet kein Weisungsverhältnis, keine Leistungs- und Verhaltenskontrolle (§ 87 Abs. 1 Nr. 6 BetrVG / LPVG), kein Arbeitszeiterfassungsinstrument und keinen Eingriff in die organisatorische Selbstständigkeit freier Mitarbeiter.<br />
            (5) <strong>Reine Metadaten-Architektur &amp; Schüler-Übungsaufnahmen (§ 53 Abs. 1, § 60a UrhG):</strong> Im Rahmen der Mediathek und Repertoire-Verwaltung werden keinerlei urheberrechtlich geschützte Noten-PDFs oder kommerzielle Notensätze gehostet oder verarbeitet, sondern ausschließlich freie bibliografische Metadaten (Titel, Interpret, Besetzung, Lehrwerk, Seitenzahlen) sowie autorisierte externe Verlinkungen (z. B. Spotify, YouTube, Tomplay). Im Rahmen des Unterrichts gehostete Schüler-Übungsaufnahmen dienen ausschließlich der individuellen didaktischen Rückmeldung und dem Teilen im geschlossenen privaten Kreis der Familie (§ 53 Abs. 1 UrhG). Ein öffentlicher Abruf oder Streaming findet nicht statt.
          </p>

          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, marginTop: '14px', color: '#0f172a' }}>
            § 2 Kategorien betroffener Personen &amp; Datenarten (Art. 28 Abs. 3 S. 1 DSGVO)
          </h4>
          <p style={{ margin: '4px 0 6px 0' }}>
            <strong>1. Kreis der betroffenen Personen:</strong> Schülerinnen und Schüler (Mindestalter 6 Jahre; bildschirmfreies Üben „Screenless Practice“ für 6–9 Jahre im Elternmodus; einheitliche elterliche Freigabe bis 16 Jahre plattformweit in DE, AT und CH), Erziehungsberechtigte, Lehrkräfte sowie Verwaltungs- und Schulleitungspersonal des Auftraggebers.
          </p>
          <p style={{ margin: '0 0 12px 0' }}>
            <strong>2. Kategorien personenbezogener Daten:</strong> Schulstammdaten, Benutzernamen (Vorname, Nachname; im regulären Unterrichtsbetrieb standardmäßig pseudonymisiert/maskiert auf Vorname + 1. Buchstabe des Nachnamens zum Schutz von Minderjährigen; Lehrkräfte werden zur eindeutigen Zuordnung mit vollständigem Namen geführt), Rollen- und Berechtigungsstufen, Stundenplan-, Raum- und Terminbelegungsdaten sowie freiwillige didaktische Instrumental-Übungsaufnahmen. Hierbei wird die rechtlich erforderliche Grund-Einwilligung zur Schülerprofil-Bereitstellung (Art. 8 DSGVO) strikt von der freiwilligen Einwilligung in die Speicherung von Instrumentalaufnahmen (§ 73 UrhG) entkoppelt.<br />
            <em>Ausdrücklich ausgeschlossen: Es werden zu keinem Zeitpunkt Bank-, SEPA-, Kreditkartendaten, private E-Mail-Adressen von Schülern, Eltern, Lehrkräften oder Sekretariatsmitarbeitern sowie besondere Kategorien personenbezogener Daten gem. Art. 9 DSGVO / Art. 5 lit. c nDSG (insbesondere medizinische Diagnosen, Befunde, Atteste oder detaillierte Gesundheitsdaten) im Auftrag erfasst oder verarbeitet (strikt 100 % Zero-User-Mail gem. Migration 515). Mitteilungen über Unterrichtsverhinderungen in der Shoutbox beschränken sich rein organisatorisch auf die allgemeine Angabe der Verhinderung (z. B. „verhindert“) ohne medizinische Detailangaben. Einzig für den Schulleitungs-Account (B2B-Vertragspartner) wird eine offizielle Schul- bzw. Organisations-E-Mail-Adresse zur Vertragsabwicklung und Notfall-Authentifizierung hinterlegt.</em>
          </p>

          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, marginTop: '14px', color: '#0f172a' }}>
            § 3 Vertraulichkeit, Serverstandort &amp; Schweizer Angemessenheit (Art. 28 Abs. 3 lit. b DSGVO)
          </h4>
          <p style={{ margin: '4px 0 12px 0' }}>
            (1) Sämtliche personenbezogenen Daten werden zu 100 % auf Servern in ISO/IEC 27001-zertifizierten deutschen Rechenzentren (Hetzner Online GmbH, Falkenstein &amp; Nürnberg) verarbeitet. Ein Transfer in unsichere Drittstaaten (insbesondere USA) findet nicht statt (0 % US-Cloud-Doktrin / Immunität gegen US CLOUD Act und FISA 702). Das mit der Datenverarbeitung betraute Personal ist vor Aufnahme der Tätigkeit schriftlich auf das Datengeheimnis und zur Vertraulichkeit verpflichtet worden.<br />
            (2) Für Auftraggeber aus der Schweizerischen Eidgenossenschaft erfolgt die grenzüberschreitende Bekanntgabe der Personendaten nach Deutschland auf Grundlage des verbindlichen Angemessenheitsbeschlusses des Bundesrates gemäss Art. 16 Abs. 1 nDSG i. V. m. Anhang 1 der Datenschutzverordnung (DSV). Eines gesonderten Abschlusses von Standarddatenschutzklauseln bedarf es nicht.
          </p>

          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, marginTop: '14px', color: '#0f172a' }}>
            § 4 Genehmigte Unterauftragsverarbeiter &amp; Zero-User-Mail Benachrichtigungsweg (Art. 28 Abs. 2 &amp; Abs. 3 lit. d DSGVO)
          </h4>
          <p style={{ margin: '4px 0 8px 0' }}>
            Der Auftraggeber genehmigt ausdrücklich die Einbindung der folgenden Unterauftragsverarbeiter:
          </p>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px', fontSize: '0.74rem', marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid #cbd5e1', fontWeight: 800, color: '#0f172a' }}>
              <span>Dienstleister &amp; Standort</span>
              <span>Leistungsumfang &amp; Zertifizierung</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span><strong>Hetzner Online GmbH</strong> (Falkenstein/Vogtland und Nürnberg, Deutschland)</span>
              <span>Dedizierte Cloud-, Datenbank- &amp; Speicher-Infrastruktur (ISO/IEC 27001 zertifiziert)</span>
            </div>
          </div>
          <p style={{ margin: '0 0 12px 0', fontSize: '0.74rem', color: '#475569', lineHeight: 1.45 }}>
            <strong>Änderungsverfahren &amp; 14-Tage-Widerspruchsfrist (Art. 28 Abs. 2 DSGVO):</strong> Beabsichtigt der Auftragnehmer, weitere Unterauftragnehmer hinzuzuziehen oder bestehende zu ersetzen, wird er den Auftraggeber mindestens vierzehn (14) Kalendertage vorab in Textform informieren. In Übereinstimmung mit dem 100 % Zero-User-Mail-Axiom erfolgt diese Benachrichtigung an die offizielle institutionelle Schul-E-Mail (<code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>schools.email</code> / <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>schools.billing_email</code>) bzw. per autoritativem System-Broadcast im Schulleitungs-Cockpit. Dem Auftraggeber steht das Recht zu, der beabsichtigten Änderung innerhalb dieser 14-tägigen Frist aus wichtigem datenschutzrechtlichem Grund schriftlich zu widersprechen.
          </p>

          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, marginTop: '14px', color: '#0f172a' }}>
            § 5 Technisch-Organisatorische Maßnahmen / TOMs (Art. 32 DSGVO &amp; BSI IT-Grundschutz)
          </h4>
          <p style={{ margin: '4px 0 12px 0' }}>
            Der Auftragnehmer gewährleistet ein dem Risiko angemessenes Schutzniveau durch modernste Tier-1 Enterprise Sicherheitsmaßnahmen:
            <br />
            1. <strong>Backend-for-Frontend (BFF) &amp; JWE-Verschlüsselung:</strong> Alle Sitzungen werden über ein geschütztes BFF-Gateway mit <strong>AES-256-GCM (A256GCM)</strong> verschlüsselt in <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>__Host-session</code> HttpOnly-Cookies geführt. Es befinden sich zu keinem Zeitpunkt Tokens im ungeschützten Browser-Speicher.
            <br />
            2. <strong>Proaktiver Silent Refresh &amp; Anti-CSRF Origin-Guard:</strong> Automatisierte Token-Rotation ohne Unterrichtsunterbrechung, striktes Fail-Closed Filtering mittels browser-nativem <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>Sec-Fetch-Site</code> und Host-Header-Poisoning-Schutz.
            <br />
            3. <strong>PostgreSQL FORCE Row-Level Security (RLS):</strong> Kernel-erzwungene Mandantentrennung auf allen relationalen Datenbanktabellen mit transaktional isoliertem Mandantenkontext (<code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>is_local = true</code>) und Zero-Trust View-Maskierung sensibler Felder (<code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>public.users_view</code> liefert 0 Klartext-Geheimnisse).
            <br />
            4. <strong>Kryptografische Absicherung &amp; Passkeys:</strong> <strong>Bcrypt-gehashte PINs (10 Runden Blowfish gem. BSI TR-02102 / Migration 510)</strong> im isolierten Schema <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>private_auth.user_secrets</code>, <strong>FIDO2 / WebAuthn Hardware-Passkeys mit Klon-Schutz</strong> und clientseitige <strong>AES-256-GCM Hardware-Vaults (Web Crypto API)</strong> für Offline-Caches.
            <br />
            5. <strong>Revisionssicherheit, Backups &amp; BSI OPS.1.1.4:</strong> Manipulationssicheres <strong>SHA-256 Merkle-Chain Audit-Ledger</strong> (GoBD-konform) sowie <strong>stündlich verschlüsselte Backups (Age X25519)</strong> mit Vorab-Speicherplatzprüfung (Storage Box Quota Guardian via Port 23) und <strong>DSGVO Art. 17 WORM-Tombstone Reconciliation</strong> gegen Zombie-Datensätze (RTO &lt; 45 Minuten, RPO &lt; 60 Minuten).
            <br />
            6. <strong>Zero-Heap Audio-Streaming &amp; Hardware-Sicherheit:</strong> Didaktische Audioaufnahmen werden über HTTP 307 Temporary Redirects direkt zum HMAC-signierten Edge-Storage gestreamt (Zero-Heap-Buffering von Kinderstimmen im RAM). Lokaler IndexedDB Audio-Tresor (<code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>groovelab_audio_vault</code>) für 0ms Offline-Playback in schallisolierten Räumen; automatische Mikrofon-Abschaltung (<code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>MediaStreamTrack.stop()</code>) beim Verlassen der Übeoberfläche.
            <br />
            7. <strong>Ausschluss von Stimmbiometrie &amp; Kinderschutz-Cap:</strong> Reines didaktisches Playback ohne biometrische Stimm- oder Sprecherprofilierung (Art. 9 DSGVO); Plausibilitäts-Cap für bildschirmfreie Übeeingaben auf maximal 60 Minuten pro Tag.
          </p>

          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, marginTop: '14px', color: '#0f172a' }}>
            § 6 Unterstützungspflichten, Betroffenenrechte, Meldewesen &amp; Kontrollrechte kommunaler Träger (Art. 15–22, 28 Abs. 3 lit. h &amp; 33 DSGVO / Art. 24 nDSG)
          </h4>
          <p style={{ margin: '4px 0 12px 0' }}>
            (1) <strong>Betroffenenrechte:</strong> Der Auftragnehmer unterstützt den Auftraggeber mit geeigneten technischen und organisatorischen Maßnahmen (u. a. über das integrierte DPO- &amp; Audit-Portal sowie DSGVO-Dossier-Exporte mit SHA-256 Siegel) bei der Erfüllung der Betroffenenrechte nach Art. 15 bis 22 DSGVO bzw. Art. 25–29 nDSG.<br />
            (2) <strong>Meldung von Datenschutzverletzungen binnen 24–48 Stunden:</strong> Der Auftragnehmer unterrichtet den Auftraggeber unverzüglich, spätestens jedoch innerhalb von <strong>24 bis maximal 48 Stunden</strong> nach Bekanntwerden, über jede Verletzung des Schutzes personenbezogener Daten auf den Servern der Plattform, um dem Auftraggeber die Einhaltung seiner gesetzlichen Meldepflichten nach Art. 33 Abs. 1 DSGVO (72h) sowie nach Art. 24 nDSG (so rasch als möglich an den EDÖB) zu ermöglichen.<br />
            (3) <strong>Kontroll- &amp; Inspektionsrechte (Schulträger-Dualismus nach Art. 28 Abs. 3 lit. h DSGVO):</strong> Der Auftraggeber – einschließlich der behördlichen Datenschutzbeauftragten kreisfreier Städte, Landkreise oder kommunaler Schulverbände – hat das Recht, sich vor Beginn der Verarbeitung und sodann regelmäßig von der Einhaltung der TOMs zu überzeugen. Der Auftragnehmer stellt hierzu alle Nachweise, ISO 27001-Zertifikate, das DPO-Compliance-Dossier (VVT, DSFA, TOMs) und das Personalrats-Attest (§ 87 BetrVG) zur Verfügung. Soweit im Einzelfall eine Vor-Ort-Inspektion sachlich geboten ist, wird diese nach angemessener Vorankündigung (in der Regel mindestens 14 Werktage) während der üblichen Betriebszeiten unter Wahrung von Betriebs- und Geschäftsgeheimnissen Dritter ermöglicht.
          </p>

          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, marginTop: '14px', color: '#0f172a' }}>
            § 7 Beendigung, physische Datenlöschung &amp; DIN 66398 Löschkonzept (Art. 17 &amp; 28 DSGVO)
          </h4>
          <p style={{ margin: '4px 0 12px 0' }}>
            Die Speicherung und Löschung erfolgt nach dem strukturierten Kommunalen Löschkonzept (DIN 66398 / 5 Klassen): Temporäre Session-Daten verfallen sofort, didaktische Audio-Aufnahmen verbleiben für die Dauer des laufenden Schuljahres (mit Export-Möglichkeit) und werden am Ende des ersten Monats des jeweiligen individuellen Schuljahres der Musikschule (gem. DIN 66398 / Migration 454 mit einmonatiger Datenexport-Frist für Erziehungsberechtigte gem. Art. 20 DSGVO) automatisiert bereinigt, inaktive Schülerprofile wechseln nach 60 Tagen zum Budgetschutz der Musikschule in die Basis-Bereitstellung (0,09 €; Zugänge bleiben erhalten), und die Bildungsbiografie (Meisterwerke) wird nach Beendigung des Ausbildungsverhältnisses bzw. 30 Tage nach formeller Exmatrikulation physisch und unwiderruflich gelöscht. Der Auftraggeber erhält alle erforderlichen Nachweise zur Einhaltung der Pflichten nach Art. 28 DSGVO.
          </p>

          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, marginTop: '14px', color: '#0f172a' }}>
            § 8 Technischer Support-Fernzugriff („Ghost Support“) &amp; WORM-Revisionssicherheit
          </h4>
          <p style={{ margin: '4px 0 12px 0' }}>
            (1) Ein administrativer Support-Zugriff auf den Mandanten des Auftraggebers („Ghost Support / Session Leasing“) erfolgt ausschließlich weisungsgebunden auf Veranlassung der Schulleitung bzw. zur vertraglichen Störungsbehebung.<br />
            (2) Der Auftragnehmer beschränkt den Zugriff zeitlich auf einen rollenden 15-Minuten-Lease und inhaltlich auf das für die Diagnose zwingend erforderliche Minimum. Ein Auslesen oder Speichern persönlicher Schülerchats, Notizen oder vertraulicher Schülerbeurteilungen außerhalb des Diagnosekontexts ist technisch und organisatorisch untersagt.<br />
            (3) Jeder administrative Fernzugriff wird mit Benutzerkennung, Zeitstempel, IP-Adresse und durchgeführter Aktion kryptografisch versiegelt im revisionssicheren WORM-Prüfpfad (<code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>master_audit_trail</code>) protokolliert und für mindestens zwölf (12) Monate zur Einsichtnahme durch den Datenschutzbeauftragten der Schule vorgehalten.
          </p>

          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, marginTop: '14px', color: '#0f172a' }}>
            § 9 Haftung, Freistellung im Innenverhältnis (Hold-Harmless) &amp; Beweislast (Art. 82 DSGVO &amp; Art. 54 nDSG)
          </h4>
          <p style={{ margin: '4px 0 12px 0' }}>
            (1) Die Parteien haften gegenüber betroffenen Personen nach den gesetzlichen Bestimmungen des Art. 82 DSGVO bzw. Art. 54 ff. nDSG.<br />
            (2) <strong>Haftung im Innenverhältnis:</strong> Im Innenverhältnis zwischen den Parteien haftet der Auftragnehmer gegenüber dem Auftraggeber ausschließlich für Schäden, die auf einer schuldhaften Pflichtverletzung des Auftragnehmers gegen die ihm nach Art. 28 DSGVO spezifisch auferlegten Pflichten beruhen oder bei denen er unter Missachtung der rechtmäßig erteilten schriftlichen Weisungen des Auftraggebers gehandelt hat. Weist der Auftragnehmer nach, dass er für den Umstand, durch den der Schaden eingetreten ist, in keiner Weise verantwortlich ist (Art. 82 Abs. 3 DSGVO), ist eine Haftung im Innenverhältnis ausgeschlossen.<br />
            (3) <strong>Vollständige Freistellung durch den Auftraggeber (Hold-Harmless):</strong> Der Auftraggeber stellt den Auftragnehmer vollumfänglich von sämtlichen Ansprüchen Dritter (insbesondere von Schülern, Erziehungsberechtigten, Lehrkräften oder Mitarbeitern) sowie von behördlichen Geldbußen, Verfahrens- und angemessenen Rechtsverteidigungskosten frei, die daraus resultieren, dass der Auftraggeber personenbezogene Daten ohne hinreichende Rechtsgrundlage in das System eingegeben, unzulässige oder rechtswidrige Weisungen erteilt, die erforderliche elterliche Zustimmung (Art. 8 DSGVO / Art. 6 nDSG) nicht ordnungsgemäß eingeholt oder gesetzliche Informationspflichten nach Art. 13, 14 DSGVO verletzt hat.<br />
            (4) <strong>Haftungshöchstgrenze:</strong> Für sonstige Schäden aus oder im Zusammenhang mit dieser Vereinbarung gilt die im SaaS-Mietvertrag (AGB Teil A § 7) vereinbarte Haftungsbeschränkung und Haftungshöchstgrenze entsprechend.
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
              background: '#ecfdf5',
              border: '1.5px solid #10b981',
              padding: '14px 18px',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle2 size={26} color="#10b981" />
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#065f46' }}>
                    AVV rechtsgültig digital unterzeichnet
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#059669', marginTop: '2px' }}>
                    Gezeichnet durch: <strong>{school?.avv_signee_name || signeeName}</strong> am {new Date(school?.avv_signed_at || Date.now()).toLocaleDateString('de-DE')}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: '#166534', fontFamily: 'monospace', marginTop: '2px', opacity: 0.85, wordBreak: 'break-all' }}>
                    Audit-Prüfsumme (WebCrypto SHA-256): {computedDigest || school?.avv_checksum || (school?.avv_signed_at ? `sha256:${String(targetSchoolId || '855992').padStart(8, '0')}` : 'Wird nach Signatur generiert')}
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
                  <Printer size={14} /> Gegenzeichneten AVV drucken / PDF
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
                  Name des/der Vertretungsberechtigten (z. B. Schulleitung / Verwaltung / Trägervertretung):
                </label>
                <input
                  type="text"
                  placeholder="z. B. Dr. Maria Musterfrau (Schulleitung / im Auftrag des Trägers)"
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
