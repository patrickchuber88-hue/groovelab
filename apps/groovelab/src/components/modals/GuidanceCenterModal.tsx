import React, { useState } from 'react';
import { 
  X, FileText, CheckCircle2, Shield, Users, 
  Sparkles, Copy, Check, Printer, Smartphone, 
  Music, Clock, Award, Lock, ExternalLink, Download,
  MessageSquare, Mail, HelpCircle, ChevronRight, Zap,
  BookOpen, Mic, CheckSquare, Layers
} from 'lucide-react';
import { generateTeacherQuickstartPDF, generateParentQuickstartPDF } from '../../utils/pdfGenerator';
import { getParentOnboardingUrl, getTeacherLoginUrl } from '../../utils/tenantUrlHelper';

interface GuidanceCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolName: string;
  schoolSubdomain?: string;
  activePlatform?: 'campus' | 'groovelab' | 'both';
  initialTab?: 'teacher' | 'parent' | 'templates';
}

export const GuidanceCenterModal: React.FC<GuidanceCenterModalProps> = ({
  isOpen,
  onClose,
  schoolName,
  schoolSubdomain,
  activePlatform = 'both',
  initialTab = 'teacher'
}) => {
  const [activeTab, setActiveTab] = useState<'teacher' | 'parent' | 'templates'>(initialTab);
  const [selectedTemplate, setSelectedTemplate] = useState<'parent_letter' | 'parent_messenger' | 'teacher_memo'>('parent_letter');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentSchool = schoolName || 'Stadtmusikschule';
  const parentOnboardingUrl = getParentOnboardingUrl(currentSchool, schoolSubdomain);
  const teacherLoginUrl = getTeacherLoginUrl(currentSchool, schoolSubdomain);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const templates = {
    parent_letter: `Liebe Eltern, liebe Musikschülerinnen und Musikschüler,\n\nab sofort nutzen wir an unserer Musikschule "${currentSchool}" das digitale Hausaufgabenheft und Übe-Studio von Campus-Groovelab.\n\nWas bedeutet das für Sie und Ihr Kind?\n• Alle Hausaufgaben, Notizen und Übestücke der Lehrkraft sind jederzeit digital griffbereit – kein Vergessen oder Verlieren von Papierheften mehr.\n• Audio-Aufnahmen & Play-Alongs aus dem Unterricht können zuhause direkt abgespielt werden, um im Takt mitzuüben.\n• Der integrierte Übe-Timer motiviert mit Erfahrungspunkten (XP) und Wochen-Streaks zu selbstständigem Üben.\n\nSo starten Sie in 2 Minuten:\n1. Öffnen Sie die Plattform im Browser Ihres Smartphones, Tablets oder Computers:\n   ${parentOnboardingUrl}\n2. Geben Sie den persönlichen Schüler-PIN oder QR-Code ein, den Sie von Ihrer Lehrkraft oder der Musikschule erhalten haben.\n3. Fertig! Ihr Kind ist sofort mit dem digitalen Hausaufgabenheft verbunden.\n\n🛡️ Datenschutz & Sicherheit nach deutschem Schulrecht:\nCampus-Groovelab speichert keine E-Mail-Adressen, Telefonnummern oder Bankdaten von Minderjährigen. Alle Daten verbleiben sicher auf nach ISO 27001 zertifizierten Servern in Deutschland.\n\nBei Fragen steht Ihnen unser Sekretariat und Ihre Lehrkraft gerne zur Verfügung.\n\nMit musikalischen Grüßen,\nIhre Musikschule ${currentSchool}`,

    parent_messenger: `🎵 Musikschule ${currentSchool}: Digitales Hausaufgabenheft\n\nLiebe Eltern, ab sofort können Schüler Hausaufgaben, Übestücke und Audio-Playalongs direkt online abrufen:\n\n👉 Hier starten: ${parentOnboardingUrl}\n\nEinfach mit dem Schüler-PIN oder QR-Code der Lehrkraft einloggen. Kein App-Download zwingend nötig, 100% kostenlos & sicher für Eltern!\n\nIhre Musikschule ${currentSchool}`,

    teacher_memo: `🎓 Kollegiums-Leitfaden: Campus-Groovelab an der Musikschule ${currentSchool}\n\nLiebes Kollegium,\nfür unsere Unterrichtsdokumentation, Hausaufgaben und Audio-Playalongs nutzen wir die Campus-Groovelab Plattform.\n\nSchnellstart in 3 Schritten:\n1. Login: Auf ${teacherLoginUrl} mit Ihrem 4-stelligen Lehrer-PIN oder QR-Ausweis einloggen.\n2. Hausaufgabe: Schüler auswählen, Hausaufgabe/Buchseite eintippen und optional mit der Loopstation ein 4-Takte Play-Along aufnehmen.\n3. Motivation: Der Schüler sieht die Aufgabe sofort in seiner App und sammelt beim Üben mit dem Fokus-Timer XP-Punkte.\n\nDatenschutz-Garantie: Keine privaten Handynummern nötig, alle Schülernamen sind schulterblickgeschützt maskiert.\n\nSchöne Grüße,\nSchulleitung & Verwaltung ${currentSchool}`
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '840px',
          maxHeight: '92vh',
          background: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(226, 232, 240, 0.9)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div style={{
          padding: '20px 26px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: '#e6f4ea',
              color: '#34a853',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(52, 168, 83, 0.15)'
            }}>
              <BookOpen size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                  Leitfaden &amp; Infocenter
                </h3>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  color: '#15803d',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  padding: '3px 10px',
                  borderRadius: '100px',
                  fontFamily: 'Urbanist'
                }}>
                  {currentSchool}
                </span>
                <span style={{
                  fontSize: '0.64rem',
                  fontWeight: 800,
                  color: '#64748b',
                  background: '#f1f5f9',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  Tier-1 Enterprise+
                </span>
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontFamily: 'Inter' }}>
                Offizielle Praxis-Leitfäden für Lehrkräfte, Eltern und Schulinformation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.15s'
            }}
            className="hover-scale-mini"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div style={{
          padding: '10px 24px 0 24px',
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc'
        }}>
          <button
            onClick={() => setActiveTab('teacher')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'none',
              fontSize: '0.86rem',
              fontWeight: 800,
              fontFamily: 'Urbanist',
              color: activeTab === 'teacher' ? '#34a853' : '#64748b',
              borderBottom: activeTab === 'teacher' ? '3px solid #34a853' : '3px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s'
            }}
          >
            <Users size={16} />
            <span>📘 Leitfaden für Lehrkräfte</span>
          </button>

          <button
            onClick={() => setActiveTab('parent')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'none',
              fontSize: '0.86rem',
              fontWeight: 800,
              fontFamily: 'Urbanist',
              color: activeTab === 'parent' ? '#34a853' : '#64748b',
              borderBottom: activeTab === 'parent' ? '3px solid #34a853' : '3px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s'
            }}
          >
            <Sparkles size={16} />
            <span>📗 Eltern-Information &amp; Hausaufgabenheft</span>
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'none',
              fontSize: '0.86rem',
              fontWeight: 800,
              fontFamily: 'Urbanist',
              color: activeTab === 'templates' ? '#34a853' : '#64748b',
              borderBottom: activeTab === 'templates' ? '3px solid #34a853' : '3px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s'
            }}
          >
            <MessageSquare size={16} />
            <span>📋 Textvorlagen &amp; Elternbriefe</span>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {/* TAB 1: LEHRKRÄFTE-LEITFADEN */}
          {activeTab === 'teacher' && (
            <>
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Zap size={20} color="#34a853" />
                  <div>
                    <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                      Schneller als Papier: Hausaufgaben in unter 20 Sekunden
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block' }}>
                      Optimiert für iPad, Tablet und Smartphone direkt am Notenständer.
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 900, background: '#e6f4ea', color: '#15803d', padding: '4px 10px', borderRadius: '100px' }}>
                  Zero-Admin Aufwand
                </span>
              </div>

              {/* 3 Step Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '18px',
                  padding: '18px 20px',
                  display: 'flex',
                  gap: '16px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#e6f4ea',
                    color: '#34a853',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '1rem',
                    flexShrink: 0,
                    fontFamily: 'Urbanist'
                  }}>
                    1
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>
                        Blitz-Login &amp; Tages-Stundenplan
                      </h4>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                        Dauer: 5 Sek.
                      </span>
                    </div>
                    <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: '#475569', lineHeight: '1.5' }}>
                      Geben Sie auf <code>campus-groovelab.de</code> Ihren 4-stelligen <strong>Lehrer-PIN</strong> ein oder scannen Sie Ihren QR-Ausweis. Ihr persönlicher Tages-Stundenplan, Raumänderungen und Ihre Schülerliste stehen sofort bereit.
                    </p>
                  </div>
                </div>

                <div style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '18px',
                  padding: '18px 20px',
                  display: 'flex',
                  gap: '16px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#e6f4ea',
                    color: '#34a853',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '1rem',
                    flexShrink: 0,
                    fontFamily: 'Urbanist'
                  }}>
                    2
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>
                        Hausaufgabe eintragen &amp; Play-Along Audio aufnehmen
                      </h4>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                        Dauer: 15 Sek.
                      </span>
                    </div>
                    <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: '#475569', lineHeight: '1.5' }}>
                      Schüler antippen ➔ Buchseite, Stück und Notizen eintragen. <br />
                      <strong>Highlight (Loopstation):</strong> Nehmen Sie mit einem Klick ein 4-Takte Play-Along (Begleitmuster) auf. Der Schüler kann es zuhause synchron abspielen und im Takt mitüben.
                    </p>
                    <div style={{ marginTop: '8px', fontSize: '0.72rem', color: '#15803d', background: '#ecfdf5', padding: '4px 10px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Lock size={12} /> Ihre privaten Lehrer-Notizen sind für Schüler &amp; Eltern unsichtbar.
                    </div>
                  </div>
                </div>

                <div style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '18px',
                  padding: '18px 20px',
                  display: 'flex',
                  gap: '16px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#e6f4ea',
                    color: '#34a853',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '1rem',
                    flexShrink: 0,
                    fontFamily: 'Urbanist'
                  }}>
                    3
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>
                        Automatische Übe-Motivation ohne Zusatzaufwand
                      </h4>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                        Vollautomatisch
                      </span>
                    </div>
                    <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: '#475569', lineHeight: '1.5' }}>
                      Der Schüler sieht die Aufgaben sofort auf seinem Gerät. Durch den integrierten Fokus-Timer sammelt er Erfahrungspunkte (XP) und hält seine Wochen-Übeserie (Streak) aufrecht. In der nächsten Stunde sehen Sie direkt, wer fleißig geübt hat!
                    </p>
                  </div>
                </div>
              </div>

              {/* DSGVO Box */}
              <div style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                border: '1.5px solid #bbf7d0',
                borderRadius: '18px',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={18} style={{ color: '#15803d' }} />
                  <span style={{ fontSize: '0.86rem', fontWeight: 900, color: '#15803d', fontFamily: 'Urbanist' }}>
                    100% DATENSCHUTZ &amp; PRIVATSPHÄRE FÜR LEHRKRÄFTE (ZERO-PII)
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.76rem', color: '#166534' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: '2px', color: '#34a853' }} />
                    <span><strong>Keine privaten Handynummern:</strong> Die Kommunikation läuft geschützt über die Plattform.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: '2px', color: '#34a853' }} />
                    <span><strong>Schulterblick-Schutz:</strong> Schülernamen werden für Dritte automatisch maskiert.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: '2px', color: '#34a853' }} />
                    <span><strong>Hardware-Sicherheit:</strong> Mikrofone schalten beim Verlassen der Aufnahme sofort ab.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: '2px', color: '#34a853' }} />
                    <span><strong>Server Falkenstein:</strong> 100% deutsches ISO 27001 zertifiziertes Cloud-Hosting.</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: ELTERN-INFORMATION */}
          {activeTab === 'parent' && (
            <>
              <div style={{
                background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
                border: '1px solid #bfdbfe',
                borderRadius: '16px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Sparkles size={20} color="#0284c7" />
                  <div>
                    <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                      Freude am Musizieren: So hilft Campus-Groovelab Ihrem Kind
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block' }}>
                      100% kostenfrei für Schüler und Eltern • Läuft direkt im Browser ohne App-Store-Zwang.
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 900, background: '#ffffff', color: '#0284c7', padding: '4px 10px', borderRadius: '100px', border: '1px solid #93c5fd' }}>
                  0,00 € Inklusive
                </span>
              </div>

              {/* 4 Feature Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#e6f4ea', color: '#34a853', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <BookOpen size={18} />
                    </div>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontFamily: 'Urbanist' }}>
                      1. Nie wieder Notizen verlieren
                    </strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.76rem', color: '#475569', lineHeight: '1.45' }}>
                    Alle Aufgaben, Buchseiten und Notizen der Lehrkraft sind direkt auf dem Smartphone oder Tablet griffbereit. Das Papierheft kann nicht mehr vergessen werden.
                  </p>
                </div>

                <div style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Music size={18} />
                    </div>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontFamily: 'Urbanist' }}>
                      2. Mitspielen zum Play-Along
                    </strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.76rem', color: '#475569', lineHeight: '1.45' }}>
                    Audio-Aufnahmen aus dem Unterricht können zuhause per Knopfdruck als Begleit-Loop abgespielt werden. So macht das Üben im Takt doppelt so viel Spaß.
                  </p>
                </div>

                <div style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Award size={18} />
                    </div>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontFamily: 'Urbanist' }}>
                      3. Übe-Timer &amp; Belohnungen
                    </strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.76rem', color: '#475569', lineHeight: '1.45' }}>
                    Mit dem Fokus-Timer sammelt Ihr Kind XP-Punkte und schaltet Musik-Sticker frei. Regelmäßiges Üben wird spielerisch zur gewohnten Routine.
                  </p>
                </div>

                <div style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Shield size={18} />
                    </div>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontFamily: 'Urbanist' }}>
                      4. 100% Kindersicherheit
                    </strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.76rem', color: '#475569', lineHeight: '1.45' }}>
                    Keine Kinder-E-Mails, keine Passwörter, keine Tracker oder Werbung. Der Zugang erfolgt sicher per QR-Code oder 4-stelligem PIN auf deutschen Servern.
                  </p>
                </div>
              </div>

              {/* Direct Onboarding Link Bar */}
              <div style={{
                background: '#f8fafc',
                border: '1.5px dashed #34a853',
                borderRadius: '16px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Smartphone size={20} color="#34a853" />
                  <div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', display: 'block', fontFamily: 'Urbanist' }}>
                      Direkter Onboarding-Link für Eltern &amp; Schüler
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#64748b', fontFamily: 'monospace' }}>
                      {parentOnboardingUrl}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => copyToClipboard(parentOnboardingUrl, 'parent_link')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: '10px',
                    background: copiedKey === 'parent_link' ? '#e6f4ea' : '#ffffff',
                    border: copiedKey === 'parent_link' ? '1.5px solid #34a853' : '1px solid #cbd5e1',
                    color: copiedKey === 'parent_link' ? '#34a853' : '#0f172a',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontFamily: 'Urbanist'
                  }}
                  className="hover-scale-mini"
                >
                  {copiedKey === 'parent_link' ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedKey === 'parent_link' ? 'Link kopiert!' : 'Link kopieren'}</span>
                </button>
              </div>
            </>
          )}

          {/* TAB 3: TEXTVORLAGEN & ELTERNBRIEFE */}
          {activeTab === 'templates' && (
            <>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setSelectedTemplate('parent_letter')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    border: selectedTemplate === 'parent_letter' ? '1.5px solid #34a853' : '1px solid #cbd5e1',
                    background: selectedTemplate === 'parent_letter' ? '#e6f4ea' : '#ffffff',
                    color: selectedTemplate === 'parent_letter' ? '#15803d' : '#334155',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontFamily: 'Urbanist'
                  }}
                >
                  📄 Offizieller Elternbrief (A4 / Mail)
                </button>

                <button
                  onClick={() => setSelectedTemplate('parent_messenger')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    border: selectedTemplate === 'parent_messenger' ? '1.5px solid #34a853' : '1px solid #cbd5e1',
                    background: selectedTemplate === 'parent_messenger' ? '#e6f4ea' : '#ffffff',
                    color: selectedTemplate === 'parent_messenger' ? '#15803d' : '#334155',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontFamily: 'Urbanist'
                  }}
                >
                  💬 WhatsApp / Signal Kurztext
                </button>

                <button
                  onClick={() => setSelectedTemplate('teacher_memo')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    border: selectedTemplate === 'teacher_memo' ? '1.5px solid #34a853' : '1px solid #cbd5e1',
                    background: selectedTemplate === 'teacher_memo' ? '#e6f4ea' : '#ffffff',
                    color: selectedTemplate === 'teacher_memo' ? '#15803d' : '#334155',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontFamily: 'Urbanist'
                  }}
                >
                  🎓 Kollegiums-Information (Lehrerzimmer)
                </button>
              </div>

              {/* Template Preview Box */}
              <div style={{ position: 'relative' }}>
                <textarea
                  readOnly
                  value={templates[selectedTemplate]}
                  style={{
                    width: '100%',
                    height: '240px',
                    borderRadius: '14px',
                    border: '1.5px solid #cbd5e1',
                    padding: '14px 16px',
                    fontSize: '0.8rem',
                    fontFamily: 'monospace',
                    lineHeight: '1.5',
                    background: '#f8fafc',
                    color: '#0f172a',
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box'
                  }}
                />

                <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                  <button
                    onClick={() => copyToClipboard(templates[selectedTemplate], selectedTemplate)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: copiedKey === selectedTemplate ? '#e6f4ea' : '#ffffff',
                      border: copiedKey === selectedTemplate ? '1.5px solid #34a853' : '1px solid #cbd5e1',
                      color: copiedKey === selectedTemplate ? '#34a853' : '#0f172a',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                    }}
                    className="hover-scale-mini"
                  >
                    {copiedKey === selectedTemplate ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedKey === selectedTemplate ? 'Kopiert!' : 'Text kopieren'}</span>
                  </button>
                </div>
              </div>

              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Tipp: Einfach den Text kopieren und direkt in Ihr Mail-Programm, Ihren Elternbrief oder Messenger einfügen.
              </span>
            </>
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div style={{
          padding: '16px 26px',
          borderTop: '1px solid #f1f5f9',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                if (activeTab === 'teacher') {
                  generateTeacherQuickstartPDF(currentSchool, schoolSubdomain);
                } else {
                  generateParentQuickstartPDF(currentSchool, activePlatform, schoolSubdomain);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '10px',
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                color: '#0f172a',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'Urbanist',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}
              className="hover-scale-mini"
              title="Formatiertes A4 Druck-PDF generieren"
            >
              <Download size={14} color="#0284c7" />
              <span>Druck-PDF herunterladen (A4)</span>
            </button>

            <button
              onClick={() => copyToClipboard(parentOnboardingUrl, 'footer_link')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                background: copiedKey === 'footer_link' ? '#e6f4ea' : '#ffffff',
                border: copiedKey === 'footer_link' ? '1.5px solid #34a853' : '1px solid #cbd5e1',
                color: copiedKey === 'footer_link' ? '#34a853' : '#334155',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'Urbanist'
              }}
              className="hover-scale-mini"
            >
              {copiedKey === 'footer_link' ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedKey === 'footer_link' ? 'Eltern-Link kopiert!' : 'Eltern-Link kopieren'}</span>
            </button>
          </div>

          <button
            onClick={onClose}
            style={{
              padding: '9px 24px',
              borderRadius: '10px',
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: 'Urbanist',
              boxShadow: '0 2px 6px rgba(15,23,42,0.2)'
            }}
            className="hover-scale-mini"
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
};
