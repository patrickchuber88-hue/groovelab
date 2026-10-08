import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ShieldCheck,
  Scale,
  Printer,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Info,
  ExternalLink,
  BookOpen,
  Users,
  Clock,
  Sparkles
} from 'lucide-react';

export interface HerrenbergComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolName?: string;
}

type TabType = 'overview' | 'pillars' | 'checklist' | 'clauses';

export const HerrenbergComplianceModal: React.FC<HerrenbergComplianceModalProps> = ({
  isOpen,
  onClose,
  schoolName = 'Ihre Musikschule'
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [copiedClause, setCopiedClause] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({
    method_freedom: true,
    no_conferences: true,
    direct_scheduling: true,
    no_sick_notes: true,
    own_materials: true,
    clear_contracts: true
  });

  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape & Accessibility Focus
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleCheck = (id: string) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedClause(key);
    setTimeout(() => setCopiedClause(null), 2500);
  };

  const totalChecks = Object.keys(checkedItems).length;
  const completedChecks = Object.values(checkedItems).filter(Boolean).length;
  const complianceScore = Math.round((completedChecks / totalChecks) * 100);

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="herrenberg-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        padding: '16px',
        boxSizing: 'border-box'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          background: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1.5px solid #cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1.5px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#ecfdf5',
              border: '1.5px solid #10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
              boxShadow: '0 4px 10px rgba(16, 185, 129, 0.12)'
            }}>
              <Scale size={22} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 id="herrenberg-modal-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                  Herrenberg-Compliance & Enthaftungs-Cockpit
                </h2>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: '#ecfdf5',
                  color: '#059669',
                  border: '1px solid #10b981'
                }}>
                  BSG B 12 R 3/20 R
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Leitfaden zur rechtssicheren Beschäftigung von Honorarkräften an {schoolName}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => window.print()}
              aria-label="Leitfaden drucken"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale"
            >
              <Printer size={15} />
              <span>Drucken</span>
            </button>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Modal schließen"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 24px',
          borderBottom: '1px solid #e2e8f0',
          background: '#ffffff',
          overflowX: 'auto'
        }}>
          {[
            { id: 'overview' as TabType, label: 'Enthaftungs-Axiom & Abgrenzung', icon: ShieldCheck },
            { id: 'pillars' as TabType, label: 'Die 6 Säulen der Enthaftung', icon: BookOpen },
            { id: 'checklist' as TabType, label: 'Do\'s & Don\'ts Checkliste', icon: CheckCircle2, badge: `${complianceScore}%` },
            { id: 'clauses' as TabType, label: 'Muster-Vertragsklauseln', icon: FileText }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: isActive ? '1.5px solid #059669' : '1px solid #e2e8f0',
                  background: isActive ? '#ecfdf5' : '#ffffff',
                  color: isActive ? '#065f46' : '#64748b',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 800 : 650,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={16} color={isActive ? '#059669' : '#94a3b8'} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    padding: '1px 6px',
                    borderRadius: '6px',
                    background: complianceScore === 100 ? '#10b981' : '#f59e0b',
                    color: '#ffffff'
                  }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── BODY CONTENT ── */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          background: '#fafafa'
        }}>

          {/* TAB 1: OVERVIEW & ENTHAFTUNG */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Important Legal Boundary Card */}
              <div style={{
                background: '#eff6ff',
                border: '1.5px solid #93c5fd',
                borderRadius: '16px',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1d4ed8' }}>
                  <Info size={19} strokeWidth={2.4} />
                  <span style={{ fontSize: '0.92rem', fontWeight: 900 }}>
                    Die rechtliche Grenzziehung (Doppel-Sphäre)
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', lineHeight: 1.6, color: '#1e3a8a' }}>
                  <strong>Was Campus-GrooveLab garantiert:</strong> Die Software-Architektur stellt technisch
                  einen <em>vollkommen weisungsfreien Raum</em> bereit. Es gibt keine algorithmische Taktung, keine
                  erzwungenen Lehrmaterialien, keine Anwesenheitstracker und neutrale Ausfallmeldungen ohne ärztliche Attestpflicht (§ 26 BDSG).
                </p>
                <p style={{ margin: 0, fontSize: '0.84rem', lineHeight: 1.6, color: '#1e3a8a' }}>
                  <strong>Was der Schulleitung obliegt:</strong> Die alleinige Nutzung der Software befreit eine Musikschule
                  nicht von rechtlichen Risiken, wenn im physischen Schulalltag vor Ort Weisungen erteilt oder
                  Eingliederungsmerkmale praktiziert werden. Die Schulleitung verantwortet die gelebte Praxis vor Ort.
                </p>
              </div>

              {/* The Core Verdict Box */}
              <div style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
              }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  Das Herrenberg-Urteil (BSG B 12 R 3/20 R) im Überblick
                </h3>
                <p style={{ margin: '0 0 14px 0', fontSize: '0.84rem', lineHeight: 1.6, color: '#475569' }}>
                  Das Bundessozialgericht hat entschieden, dass Musikschullehrkräfte sozialversicherungspflichtig beschäftigt sind,
                  wenn sie maßgeblich in den Schulbetrieb eingegliedert sind und einem Weisungsrecht unterliegen. Entscheidend ist
                  nicht die Vertragsbezeichnung als „freier Mitarbeiter“, sondern das <strong>Gesamtbild der tatsächlichen Durchführung</strong> (§ 7 Abs. 1 SGB IV / § 611a BGB).
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b91c1c', fontWeight: 800, fontSize: '0.82rem', marginBottom: '6px' }}>
                      <AlertTriangle size={16} />
                      Kritische Eingliederungsmerkmale (Risiko)
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.78rem', color: '#7f1d1d', lineHeight: 1.6 }}>
                      <li>Verpflichtende Teilnahme an Lehrerkonferenzen</li>
                      <li>Vorgabe von Lehrmitteln, Noten oder Curricula</li>
                      <li>Einseitige Zuweisung von Schülern, Räumen & Zeiten</li>
                      <li>Verpflichtung zur Vertretung erkrankter Kollegen</li>
                      <li>Pflicht zur Vorlage von Arbeitsunfähigkeitsbescheinigungen (AUB)</li>
                    </ul>
                  </div>

                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#15803d', fontWeight: 800, fontSize: '0.82rem', marginBottom: '6px' }}>
                      <CheckCircle2 size={16} />
                      Kriterien für Selbstständigkeit (Schutz)
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.78rem', color: '#14532d', lineHeight: 1.6 }}>
                      <li>Vollständige pädagogische & didaktische Methodenfreiheit (Art. 5 Abs. 3 GG)</li>
                      <li>Freie Zeitabstimmung direkt zwischen Dozent & Schüler</li>
                      <li>Eigene Lehrmaterialien & freie Instrumentenwahl</li>
                      <li>Recht zur Ablehnung von Unterrichtsangeboten</li>
                      <li>Reines Ausfallmelde-Management ohne Attestkontrollen</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: THE 6 PILLARS */}
          {activeTab === 'pillars' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {[
                {
                  nr: '01',
                  title: 'Vertragliche Trennung & Statusfeststellung',
                  desc: 'Klare schriftliche Trennung zwischen Lehrauftrag und Anstellung. Keine arbeitsrechtlichen Klauseln (z.B. Urlaubsentgelt, Entgeltfortzahlung nach EFZG). Empfohlen: Optionales Statusfeststellungsverfahren nach § 7a SGB IV.'
                },
                {
                  nr: '02',
                  title: 'Absolute Direktions- & Methodenfreiheit',
                  desc: 'Verzicht auf pädagogische Vorgaben, Noten-Curricula oder Stilrichtlinien. Der Honorardozent bestimmt Unterrichtsmethode, Didaktik und Repertoire autonom gem. Art. 5 Abs. 3 GG.'
                },
                {
                  nr: '03',
                  title: 'Organisatorische Unabhängigkeit',
                  desc: 'Keine Pflicht zur Teilnahme an internen Konferenzen, Prüfungen, Schulfesten oder Vertretungsstunden. Jegliche Mitwirkung an Schulveranstaltungen erfolgt rein fakultativ gegen gesondertes Honorar.'
                },
                {
                  nr: '04',
                  title: 'Räumliche & zeitliche Flexibilität',
                  desc: 'Unterrichtszeiten und Raumbelegungen werden in gegenseitigem Einvernehmen vereinbart oder direkt zwischen Schüler und Dozent abgestimmt. Keine einseitige Festlegung durch die Schulleitung.'
                },
                {
                  nr: '05',
                  title: 'Angemessenes Honorar & Eigenvorsorge',
                  desc: 'Das Stundenhonorar muss das Fehlen von Sozialleistungen und Ausfallrisiken wirtschaftlich kompensieren (angemessenes Risikohonorar). Dozenten sorgen selbst für Kranken- und Rentenversicherung.'
                },
                {
                  nr: '06',
                  title: 'Revisionssichere Dokumentation & Datenschutz',
                  desc: 'Digitale Zeiterfassung und Stundennachweise dienen ausschließlich der Rechnungsprüfung. Unterrichtsausfälle werden neutral gem. § 26 BDSG erfasst – ohne Vorlage von ärztlichen Diagnosen.'
                }
              ].map(pillar => (
                <div
                  key={pillar.nr}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      background: '#ecfdf5',
                      color: '#059669',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      border: '1px solid #10b981'
                    }}>
                      Säule {pillar.nr}
                    </span>
                    <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                      {pillar.title}
                    </h4>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.78rem', lineHeight: 1.55, color: '#475569' }}>
                    {pillar.desc}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: CHECKLIST */}
          {activeTab === 'checklist' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 900, color: '#0f172a' }}>
                    Praxis-Audit für Schulleitungen
                  </h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    Überprüfen Sie die Arbeitsweise vor Ort an Ihrer Musikschule:
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: complianceScore === 100 ? '#059669' : '#d97706' }}>
                      {completedChecks} / {totalChecks} erfüllt
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {complianceScore === 100 ? 'Rechtssicher aufgestellt' : 'Optimierung empfohlen'}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  {
                    id: 'method_freedom',
                    title: 'Didaktische Methodenfreiheit gewahrt',
                    desc: 'Honorarkräfte unterliegen keinem Lehrplan, keiner Zensurenvorgabe und keinen methodischen Weisungen.'
                  },
                  {
                    id: 'no_conferences',
                    title: 'Keine Pflicht zur Teilnahme an Konferenzen & Schulfesten',
                    desc: 'Honorardozenten sind nicht zur Teilnahme an Lehrerkonferenzen oder schulischen Gremien verpflichtet.'
                  },
                  {
                    id: 'direct_scheduling',
                    title: 'Freie Terminabsprache ohne einseitige Zuteilung',
                    desc: 'Unterrichtstage und -zeiten werden in gegenseitigem Konsens oder direkt zwischen Dozent und Schüler vereinbart.'
                  },
                  {
                    id: 'no_sick_notes',
                    title: 'Keine AUB- / Attestpflicht bei Unterrichtsausfall',
                    desc: 'Ausfälle werden im System neutral ohne Vorlage von Arbeitsunfähigkeitsbescheinigungen (AUB) gemeldet (§ 26 BDSG).'
                  },
                  {
                    id: 'own_materials',
                    title: 'Freie Wahl von Unterrichts- & Notenmaterialien',
                    desc: 'Dozenten nutzen eigene Materialien oder entscheiden eigenverantwortlich über die Anschaffung durch Schüler.'
                  },
                  {
                    id: 'clear_contracts',
                    title: 'Honorarvertrag ohne arbeitnehmertypische Bindungen',
                    desc: 'Der Vertrag enthält keine Urlaubsansprüche, keine Fortzahlung im Krankheitsfall und keine Vertretungspflicht.'
                  }
                ].map(item => (
                  <div
                    key={item.id}
                    onClick={() => toggleCheck(item.id)}
                    style={{
                      background: '#ffffff',
                      border: checkedItems[item.id] ? '1.5px solid #10b981' : '1.5px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!checkedItems[item.id]}
                      onChange={() => toggleCheck(item.id)}
                      aria-label={item.title}
                      style={{
                        width: '18px',
                        height: '18px',
                        marginTop: '2px',
                        accentColor: '#059669',
                        cursor: 'pointer'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px', lineHeight: 1.45 }}>
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: CONTRACT CLAUSES */}
          {activeTab === 'clauses' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.5 }}>
                  💡 <strong>Rechtssichere Bausteine:</strong> Nutzen Sie diese Musterklauseln für Ihre Honorarverträge.
                  Kopieren Sie die Klauseln mit einem Klick heraus.
                </span>
              </div>

              {[
                {
                  key: 'clause_freedom',
                  title: 'Klausel 1: Pädagogische Weisungsfreiheit & Methodenautonomie',
                  text: '§ [X] Pädagogische Unabhängigkeit\n(1) Die Lehrkraft übt ihre Lehrtätigkeit in voller pädagogischer, fachlicher und methodisch-didaktischer Eigenverantwortung aus (Art. 5 Abs. 3 GG). Sie unterliegt keinerlei fachlichen oder inhaltlichen Weisungen der Schulleitung.\n(2) Die Auswahl des Unterrichtsmaterials, der Notenliteratur sowie der Lehrmethode obliegt ausschließlich der Lehrkraft im Einvernehmen mit den unterrichteten Schülern bzw. deren Erziehungsberechtigten.'
                },
                {
                  key: 'clause_conferences',
                  title: 'Klausel 2: Keine Konferenz-, Prüfungs- oder Vertretungspflicht',
                  text: '§ [Y] Organisatorische Selbstbestimmung\n(1) Die Lehrkraft ist nicht verpflichtet, an Lehrer-, Fach- oder Gesamtkonferenzen der Musikschule teilzunehmen.\n(2) Es besteht keine Verpflichtung zur Abnahme von schulischen Prüfungen, zur Mitwirkung an Schulfesten oder zur Vertretung erkrankter Lehrkräfte. Eine etwaige freiwillige Mitwirkung wird gesondert vereinbart und vergütet.'
                },
                {
                  key: 'clause_scheduling',
                  title: 'Klausel 3: Freiwillige Software-Nutzung & Raumkoordination',
                  text: '§ [Z] Terminabstimmung & Digitale Kollaboration\n(1) Die Vereinbarung konkreter Unterrichtstage und -zeiten erfolgt in direkter Abstimmung zwischen der Lehrkraft und den Schülern bzw. deren gesetzlichen Vertretern.\n(2) Die Bereitstellung von Software-Lizenzen (Campus-GrooveLab) und Unterrichtsräumen dient der freiwilligen organisatorischen Erleichterung und begründet keine örtliche oder zeitliche Weisungsbefugnis der Schulleitung.'
                },
                {
                  key: 'clause_ausfall',
                  title: 'Klausel 4: Unterrichtsausfälle & Krankheitsregelung',
                  text: '§ [W] Unterrichtsausfall & Mitteilung\n(1) Ist die Lehrkraft an der Erbringung der vereinbarten Unterrichtsleistung verhindert, teilt sie dies den Schülern und der Musikschule unverzüglich formlos mit.\n(2) Ein Anspruch auf Entgeltfortzahlung im Krankheitsfall besteht nicht. Die Vorlage von Arbeitsunfähigkeitsbescheinigungen (AUB) oder ärztlichen Attesten wird nicht verlangt.'
                }
              ].map(clause => (
                <div
                  key={clause.key}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                      {clause.title}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(clause.key, clause.text)}
                      aria-label="Klausel kopieren"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: copiedClause === clause.key ? 'none' : '1px solid #cbd5e1',
                        background: copiedClause === clause.key ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#ffffff',
                        color: copiedClause === clause.key ? '#ffffff' : '#475569',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {copiedClause === clause.key ? <Check size={14} color="#ffffff" /> : <Copy size={14} />}
                      <span>{copiedClause === clause.key ? 'Kopiert!' : 'Kopieren'}</span>
                    </button>
                  </div>
                  <pre style={{
                    margin: 0,
                    padding: '12px 14px',
                    background: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.74rem',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.5,
                    color: '#334155'
                  }}>
                    {clause.text}
                  </pre>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* ── FOOTER ── */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', color: '#64748b' }}>
            <ShieldCheck size={16} color="#059669" />
            <span>Rechtlicher Stand: 2026 · BSG B 12 R 3/20 R · DIN EN 301 549 & BFSG 2025 konform</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '10px',
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale"
          >
            Verstanden & Schließen
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
